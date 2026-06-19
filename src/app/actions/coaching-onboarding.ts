'use server'

import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendAdminSms } from '@/lib/admin-sms'

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

export async function submitCoachingOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/login?redirectTo=/coaching/onboarding')

  const admin = await createAdminClient()
  const email = user.email.toLowerCase()

  const { data: client } = await admin
    .from('coaching_clients')
    .select('id, user_id, email')
    .eq('email', email)
    .maybeSingle()

  if (!client) redirect('/coaching/confirmation')

  if (!client.user_id) {
    await admin
      .from('coaching_clients')
      .update({ user_id: user.id, updated_at: new Date().toISOString() })
      .eq('id', client.id)
  }

  const payload = {
    personal: {
      firstName: value(formData, 'firstName'),
      lastName: value(formData, 'lastName'),
      phone: value(formData, 'phone'),
      timezone: value(formData, 'timezone'),
    },
    goals: {
      primaryGoal: value(formData, 'primaryGoal'),
      targetWeight: value(formData, 'targetWeight'),
      whyNow: value(formData, 'whyNow'),
      success: value(formData, 'success'),
    },
    body: {
      age: value(formData, 'age'),
      height: value(formData, 'height'),
      weight: value(formData, 'weight'),
      waist: value(formData, 'waist'),
      hips: value(formData, 'hips'),
    },
    health: {
      medicalConditions: value(formData, 'medicalConditions'),
      medications: value(formData, 'medications'),
      injuries: value(formData, 'injuries'),
      eatingDisorderHistory: value(formData, 'eatingDisorderHistory'),
      sleep: value(formData, 'sleep'),
      stress: value(formData, 'stress'),
    },
    nutrition: {
      currentEating: value(formData, 'currentEating'),
      trackingExperience: value(formData, 'trackingExperience'),
      allergies: value(formData, 'allergies'),
      restrictions: value(formData, 'restrictions'),
      favoriteFoods: value(formData, 'favoriteFoods'),
      dislikedFoods: value(formData, 'dislikedFoods'),
      eatingOut: value(formData, 'eatingOut'),
      water: value(formData, 'water'),
      caffeine: value(formData, 'caffeine'),
    },
    lifestyle: {
      workSchedule: value(formData, 'workSchedule'),
      strengthTraining: value(formData, 'strengthTraining'),
      workouts: value(formData, 'workouts'),
      steps: value(formData, 'steps'),
      barriers: value(formData, 'barriers'),
      accountability: value(formData, 'accountability'),
    },
    agreements: {
      notMedicalCare: formData.get('notMedicalCare') === 'on',
      notPregnantBreastfeeding: formData.get('notPregnantBreastfeeding') === 'on',
      terms: formData.get('terms') === 'on',
    },
  }

  await admin
    .from('coaching_onboarding')
    .upsert(
      {
        coaching_client_id: client.id,
        user_id: user.id,
        form_data: payload,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'coaching_client_id' }
    )

  await admin
    .from('coaching_clients')
    .update({ onboarding_status: 'submitted', status: 'plan_pending', updated_at: new Date().toISOString() })
    .eq('id', client.id)

  const firstName = payload.personal.firstName || email
  const lastName = payload.personal.lastName
  const fullName = lastName ? `${firstName} ${lastName}` : firstName
  const sms = await sendAdminSms(
    `Lumora: ${fullName} just finished coaching onboarding. Time to build her plan.`
  )
  if (!sms.ok) {
    console.error('[coaching-onboarding] admin SMS failed:', sms.reason)
  }

  redirect('/coaching/onboarding?submitted=1')
}
