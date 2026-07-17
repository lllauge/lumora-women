'use server'

import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  calculatePublicMacros,
  DAILY_MOVEMENT_OPTIONS,
  DIETING_HISTORY_OPTIONS,
  GOAL_OPTIONS,
  LIFE_STAGE_OPTIONS,
  STEP_RANGE_OPTIONS,
  STRENGTH_OPTIONS,
  STRESS_OPTIONS,
  type PublicMacroResult,
} from '@/lib/macro-calculator-public'
import { sendMacroResults } from '@/lib/macro-results-email'

const InputsSchema = z.object({
  age: z.string().trim().regex(/^\d{1,3}$/, 'Please enter your age.').refine(
    (value) => Number(value) >= 18 && Number(value) <= 90,
    'This calculator is built for ages 18 to 90.'
  ),
  heightFeet: z.string().trim().regex(/^\d$/, 'Please enter your height.').refine(
    (value) => Number(value) >= 4 && Number(value) <= 7,
    'Please enter your height in feet and inches.'
  ),
  heightInches: z.string().trim().regex(/^\d{1,2}$/, 'Please enter your height.').refine(
    (value) => Number(value) <= 11,
    'Inches should be 0 to 11.'
  ),
  weightLb: z.string().trim().regex(/^\d{2,3}(\.\d+)?$/, 'Please enter your weight in pounds.').refine(
    (value) => Number(value) >= 80 && Number(value) <= 700,
    'Please enter a weight between 80 and 700 pounds.'
  ),
  goalWeightLb: z
    .string()
    .trim()
    .regex(/^\d{2,3}(\.\d+)?$/, 'Please enter your goal weight in pounds.')
    .refine(
      (value) => Number(value) >= 80 && Number(value) <= 700,
      'Please enter a goal weight between 80 and 700 pounds.'
    ),
  dailyMovement: z.enum(DAILY_MOVEMENT_OPTIONS),
  stepRange: z.enum(STEP_RANGE_OPTIONS),
  strengthDays: z.enum(STRENGTH_OPTIONS),
  sleepHours: z
    .string()
    .trim()
    .regex(/^(\d{1,2}(\.\d+)?)?$/, 'Please enter your average sleep hours.')
    .refine((value) => value === '' || (Number(value) >= 3 && Number(value) <= 14), 'Sleep should be 3 to 14 hours.'),
  goal: z.enum(GOAL_OPTIONS),
  lifeStage: z.enum(LIFE_STAGE_OPTIONS),
  dietingHistory: z.enum(DIETING_HISTORY_OPTIONS),
  stress: z.enum(STRESS_OPTIONS),
})

const LeadSchema = z.object({
  firstName: z.string().trim().min(1, 'Please tell us your first name.').max(100),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.').max(254),
  // Honeypot: humans never see this field, bots fill it.
  website: z.string().max(200).optional(),
})

export type MacroPreview = {
  maintenanceCalories: number
  headline: string
}

export type PreviewResponse = {
  preview?: MacroPreview
  error?: string
}

async function getClientIp() {
  const headerStore = await headers()
  const forwarded = headerStore.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : (headerStore.get('x-real-ip') ?? 'unknown')
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Step shown before the email gate: honest maintenance estimate plus a
 * headline, never the full breakdown.
 */
export async function previewMacros(rawInputs: unknown): Promise<PreviewResponse> {
  const ip = await getClientIp()
  const rateLimit = await checkRateLimit(`macro-preview:${ip}`, 30, 3600)
  if (!rateLimit.allowed) {
    return { error: 'Too many calculations from this connection. Please try again in an hour.' }
  }

  const parsed = InputsSchema.safeParse(rawInputs)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = calculatePublicMacros(parsed.data)
  if (!result) {
    return { error: 'We could not calculate with those details. Please check them and try again.' }
  }

  const rawHeadline = result.insights[0]?.title ?? 'Your personalized targets are calculated and ready.'
  const headline = /[.!?]$/.test(rawHeadline) ? rawHeadline : `${rawHeadline}.`

  return {
    preview: {
      maintenanceCalories: result.maintenanceCalories,
      headline,
    },
  }
}

export async function submitMacroLead(
  rawInputs: unknown,
  rawLead: unknown
): Promise<{ result?: PublicMacroResult; error?: string }> {
  const ip = await getClientIp()
  const rateLimit = await checkRateLimit(`macro-lead:${ip}`, 5, 3600)
  if (!rateLimit.allowed) {
    return { error: 'Too many submissions from this connection. Please try again in an hour.' }
  }

  const parsedInputs = InputsSchema.safeParse(rawInputs)
  if (!parsedInputs.success) {
    return { error: parsedInputs.error.issues[0].message }
  }

  const parsedLead = LeadSchema.safeParse(rawLead)
  if (!parsedLead.success) {
    return { error: parsedLead.error.issues[0].message }
  }

  const result = calculatePublicMacros(parsedInputs.data)
  if (!result) {
    return { error: 'We could not calculate with those details. Please check them and try again.' }
  }

  // Bot filled the honeypot: pretend success, store and send nothing.
  if (parsedLead.data.website) {
    return { result }
  }

  const { firstName, email } = parsedLead.data
  const supabase = getServiceClient()

  const { error: leadError } = await supabase.from('macro_calculator_leads').insert({
    first_name: firstName,
    email,
    inputs: parsedInputs.data,
    maintenance_calories: result.maintenanceCalories,
    calories: result.calories,
    protein_g: result.proteinG,
    carbs_g: result.carbsG,
    fat_g: result.fatG,
    goal_applied: result.goalApplied,
    insights: result.insights.map((insight) => insight.title),
  })
  if (leadError) {
    console.error('[macro-calculator] lead insert failed:', leadError.message)
  }

  const { error: subscriberError } = await supabase
    .from('email_subscribers')
    .upsert(
      { email, first_name: firstName, source: 'macro-calculator' },
      { onConflict: 'email', ignoreDuplicates: false }
    )
  if (subscriberError) {
    // Older schema without the source column, mirror subscribe.ts fallback.
    if (/source/i.test(subscriberError.message)) {
      await supabase
        .from('email_subscribers')
        .upsert({ email, first_name: firstName }, { onConflict: 'email', ignoreDuplicates: false })
    } else {
      console.error('[macro-calculator] subscriber upsert failed:', subscriberError.message)
    }
  }

  const emailResult = await sendMacroResults({ to: email, firstName, result })
  if (!emailResult.ok) {
    console.error('[macro-calculator] results email failed:', emailResult.error)
  }

  return { result }
}
