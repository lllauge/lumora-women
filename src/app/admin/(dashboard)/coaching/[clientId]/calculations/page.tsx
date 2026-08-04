import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, CircleX } from 'lucide-react'
import { getVerifiedAdminUser } from '@/lib/admin-guard'
import {
  buildClientCalculationAudit,
  type AuditStatus,
  type CalculationLibraryRecipe,
} from '@/lib/calculation-audit'
import { parseCoachingPlan } from '@/lib/coaching-plan-schema'
import { createAdminClient } from '@/lib/supabase/server'
import { getUsdaApiKey } from '@/lib/usda/api-key'

export const metadata: Metadata = {
  title: 'Calculation Log | Lumora Women Admin',
  robots: { index: false, follow: false },
}

// A full prescription can require fresh USDA lookups for several recipes.
export const maxDuration = 60

type Nutrition = { calories: number; protein: number; carbs: number; fats: number; fiber: number }

const statusColors: Record<AuditStatus, { color: string; background: string; border: string }> = {
  ok: { color: '#2F6332', background: '#EDF6EA', border: '#BBD4B7' },
  warning: { color: '#765C08', background: '#FFF8DF', border: '#E2CB73' },
  error: { color: '#A12A20', background: '#FFF0EE', border: '#E6AAA4' },
}

function StatusBadge({ status, children }: { status: AuditStatus; children?: React.ReactNode }) {
  const colors = statusColors[status]
  const Icon = status === 'ok' ? CheckCircle2 : status === 'warning' ? AlertTriangle : CircleX
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        color: colors.color, background: colors.background, border: `1px solid ${colors.border}`,
        borderRadius: 999, padding: '0.25rem 0.55rem', fontSize: '0.75rem', fontWeight: 700,
        fontFamily: 'var(--font-hanken)', whiteSpace: 'nowrap',
      }}
    >
      <Icon size={13} />
      {children ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function NutritionLine({ value }: { value: Nutrition }) {
  return (
    <span>
      {Math.round(value.calories)} cal · {value.protein.toFixed(1)}g P · {value.carbs.toFixed(1)}g C · {value.fats.toFixed(1)}g F · {value.fiber.toFixed(1)}g fiber
    </span>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase" style={{ color: 'var(--admin-on-surface-variant)', letterSpacing: '0.08em' }}>{label}</dt>
      <dd className="mt-1 text-sm" style={{ color: 'var(--admin-on-surface)', lineHeight: 1.5 }}>{value}</dd>
    </div>
  )
}

function signedCalories(value: number) {
  return `${value > 0 ? '+' : ''}${Math.round(value)} cal`
}

export default async function ClientCalculationLogPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  await getVerifiedAdminUser()
  const { clientId } = await params
  const supabase = await createAdminClient()
  const [clientQuery, planQuery, libraryQuery] = await Promise.all([
    supabase
      .from('coaching_clients')
      .select('id, first_name, last_name, email')
      .eq('id', clientId)
      .maybeSingle(),
    supabase
      .from('coaching_plans')
      .select('planning_inputs, macro_targets, meal_plan, recipes, workout_plan, grocery_list, admin_notes, client_notes, status, generated_by_ai, updated_at')
      .eq('coaching_client_id', clientId)
      .maybeSingle(),
    supabase
      .from('recipe_library')
      .select('name, meal_type, family_servings, ingredients, instructions, notes, calories, protein, carbs, fats, fiber'),
  ])

  if (!clientQuery.data) notFound()
  const client = clientQuery.data
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ').trim() || 'Coaching Client'
  const planRow = planQuery.data

  if (!planRow) {
    return (
      <div>
        <Link href={`/admin/coaching/${clientId}`} className="inline-flex items-center gap-2 mb-5 font-bold" style={{ color: 'var(--admin-on-surface-variant)' }}>
          <ArrowLeft size={16} /> Back to {name}
        </Link>
        <section className="admin-card p-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-eb-garamond)' }}>Calculation Log</h1>
          <p className="mt-2" style={{ color: 'var(--admin-on-surface-variant)' }}>This client does not have a saved prescription yet.</p>
        </section>
      </div>
    )
  }

  const plan = parseCoachingPlan({
    macroTargets: planRow.macro_targets,
    mealPlan: planRow.meal_plan,
    recipes: planRow.recipes,
    workoutPlan: planRow.workout_plan,
    groceryList: planRow.grocery_list,
    adminNotes: planRow.admin_notes ?? '',
    clientNotes: planRow.client_notes ?? '',
    status: planRow.status,
    generatedByAi: planRow.generated_by_ai,
  })
  const apiKey = getUsdaApiKey()
  const audit = await buildClientCalculationAudit({
    plan,
    planningInputs: (planRow.planning_inputs ?? {}) as Record<string, unknown>,
    libraryRecipes: (libraryQuery.data ?? []) as CalculationLibraryRecipe[],
    apiKey: apiKey.key,
  })
  const generatedAt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(audit.generatedAt))
  const planUpdatedAt = planRow.updated_at
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(planRow.updated_at))
    : 'Unknown'

  return (
    <div style={{ fontFamily: 'var(--font-hanken)' }}>
      <Link
        href={`/admin/coaching/${clientId}`}
        className="inline-flex items-center gap-2 mb-5 font-bold"
        style={{ color: 'var(--admin-on-surface-variant)', textDecoration: 'none' }}
      >
        <ArrowLeft size={16} /> Back to {name}
      </Link>

      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Calculator size={28} style={{ color: 'var(--botanical-green)' }} />
            <h1 className="text-4xl font-bold" style={{ fontFamily: 'var(--font-eb-garamond)', color: 'var(--admin-on-surface)' }}>Calculation Log</h1>
          </div>
          <p className="mt-2" style={{ color: 'var(--admin-on-surface-variant)' }}>
            {name} · {client.email} · saved {planUpdatedAt}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-on-surface-variant)' }}>
            Recalculated live at {generatedAt} from the current prescription, Recipe Library, and USDA ingredient records. Admin only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="error">{audit.summary.error} errors</StatusBadge>
          <StatusBadge status="warning">{audit.summary.warning} warnings</StatusBadge>
          <StatusBadge status="ok">{audit.summary.ok} passing</StatusBadge>
        </div>
      </header>

      <section className="admin-card p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-eb-garamond)' }}>Macro Prescription</h2>
          <StatusBadge status={audit.macroTargetsMatch ? 'ok' : 'error'}>
            {audit.macroTargetsMatch ? 'Saved targets match formula' : 'Saved targets do not match formula'}
          </StatusBadge>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--admin-on-surface-variant)' }}>The exact inputs, factors, formulas, and rounding used to set this client&apos;s daily targets.</p>
        {audit.macroCalculation ? (
          <>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-5 pb-5 mb-5" style={{ borderBottom: '1px solid var(--admin-outline-variant)' }}>
              <Metric label="Age" value={`${audit.macroCalculation.inputs.age} years`} />
              <Metric label="Height" value={`${audit.macroCalculation.inputs.heightCm.toFixed(1)} cm`} />
              <Metric label="Weight" value={`${audit.macroCalculation.inputs.weightLb.toFixed(1)} lb / ${audit.macroCalculation.inputs.weightKg.toFixed(1)} kg`} />
              <Metric label="Activity multiplier" value={`${audit.macroCalculation.factors.lifestyle} + ${audit.macroCalculation.factors.exercise} = ${audit.macroCalculation.factors.activity}`} />
            </dl>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5 text-sm">
              <p><strong>Saved:</strong> {audit.savedMacroTargets.calories} cal · {audit.savedMacroTargets.protein} P · {audit.savedMacroTargets.carbs} C · {audit.savedMacroTargets.fats} F · {audit.savedMacroTargets.fiber} fiber</p>
              <p><strong>Formula result:</strong> {audit.macroCalculation.targets.calories} cal · {audit.macroCalculation.targets.protein} P · {audit.macroCalculation.targets.carbs} C · {audit.macroCalculation.targets.fats} F · {audit.macroCalculation.targets.fiber} fiber</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead><tr style={{ textAlign: 'left', color: 'var(--admin-on-surface-variant)' }}><th className="py-2 pr-4">Output</th><th className="py-2 pr-4">Exact formula</th><th className="py-2 text-right">Result</th></tr></thead>
                <tbody>
                  {audit.macroCalculation.equations.map((equation) => (
                    <tr key={equation.label} style={{ borderTop: '1px solid var(--admin-outline-variant)' }}>
                      <th className="py-3 pr-4 text-left">{equation.label}</th>
                      <td className="py-3 pr-4 font-mono text-xs">{equation.formula}</td>
                      <td className="py-3 text-right font-bold">{Number.isInteger(equation.result) ? equation.result : equation.result.toFixed(1)} {equation.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div><StatusBadge status="error">Missing body inputs</StatusBadge><p className="mt-2 text-sm">Age, height, or weight is missing, so the prescription formula cannot be reproduced.</p></div>
        )}
      </section>

      <section className="admin-card p-6 mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-eb-garamond)' }}>Daily and Meal Budgets</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--admin-on-surface-variant)' }}>Each meal target is the daily calorie prescription multiplied by its assigned percentage. Recomputed totals use the current recipe math below.</p>
        <div className="space-y-3">
          {audit.days.map((day) => (
            <details key={day.day} open={day.status === 'error'} style={{ borderTop: '1px solid var(--admin-outline-variant)', paddingTop: 12 }}>
              <summary className="flex flex-wrap items-center justify-between gap-3 cursor-pointer py-2" style={{ listStyle: 'none' }}>
                <span className="font-bold text-lg">{day.day}</span>
                <span className="flex flex-wrap items-center gap-3 text-sm">
                  Target {Math.round(day.targetCalories)} · Saved {Math.round(day.savedCalories)} · Recomputed {Math.round(day.recomputedCalories)} · <strong>{signedCalories(day.deltaCalories)}</strong>
                  <StatusBadge status={day.status} />
                </span>
              </summary>
              <div className="overflow-x-auto pb-4">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead><tr style={{ textAlign: 'left', color: 'var(--admin-on-surface-variant)' }}><th className="py-2 pr-3">Meal</th><th className="py-2 pr-3">Budget math</th><th className="py-2 pr-3">Recipes</th><th className="py-2 pr-3 text-right">Target</th><th className="py-2 pr-3 text-right">Saved</th><th className="py-2 text-right">Recomputed</th></tr></thead>
                  <tbody>{day.meals.map((meal) => (
                    <tr key={meal.label} style={{ borderTop: '1px solid var(--admin-outline-variant)' }}>
                      <th className="py-3 pr-3 text-left"><span className="inline-flex items-center gap-2">{meal.label}<StatusBadge status={meal.status} /></span></th>
                      <td className="py-3 pr-3 font-mono text-xs">{meal.formula}</td>
                      <td className="py-3 pr-3">{meal.recipeNames.join(' + ') || 'No recipe'}{meal.missingRecipes.length > 0 ? ` (missing: ${meal.missingRecipes.join(', ')})` : ''}</td>
                      <td className="py-3 pr-3 text-right">{Math.round(meal.targetCalories)}</td>
                      <td className="py-3 pr-3 text-right">{Math.round(meal.saved.calories)}</td>
                      <td className="py-3 text-right font-bold">{Math.round(meal.recomputed.calories)} ({signedCalories(meal.deltaCalories)})</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="admin-card p-6 mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-eb-garamond)' }}>Recipe and Family Portion Math</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--admin-on-surface-variant)' }}>Full raw ingredient nutrition × the client&apos;s effective share = the serving saved in her plan.</p>
        <div className="space-y-3">
          {audit.recipes.map((recipe) => (
            <details key={recipe.name} open={recipe.status === 'error'} style={{ borderTop: '1px solid var(--admin-outline-variant)', paddingTop: 12 }}>
              <summary className="flex flex-wrap items-center justify-between gap-3 cursor-pointer py-2" style={{ listStyle: 'none' }}>
                <span className="font-bold text-lg">{recipe.name}</span>
                <span className="flex items-center gap-3 text-sm"><NutritionLine value={recipe.savedServing} /><StatusBadge status={recipe.status} /></span>
              </summary>
              <div className="pb-6">
                {recipe.issues.length > 0 && (
                  <ul className="mb-5 space-y-1 text-sm" style={{ color: statusColors[recipe.status].color }}>
                    {recipe.issues.map((issue) => <li key={issue}>• {issue}</li>)}
                  </ul>
                )}
                {recipe.calculationError && <p className="mb-5 text-sm font-bold" style={{ color: statusColors.error.color }}>USDA error: {recipe.calculationError}</p>}
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
                  <Metric label="Recipe source" value={recipe.source} />
                  <Metric label="Nutrition source" value={recipe.nutritionSource} />
                  <Metric label="Family servings" value={`${recipe.familyServings || 1}${recipe.libraryFamilyServings !== null ? ` (library: ${recipe.libraryFamilyServings || 1})` : ''}`} />
                  <Metric label="Ingredients in sync" value={recipe.ingredientsMatch === null ? 'Custom recipe' : recipe.ingredientsMatch ? 'Yes' : 'No'} />
                  <Metric label="Declared serving share" value={`${recipe.declaredMultiplier.toFixed(4)} = 1 / ${recipe.familyServings || 1}`} />
                  <Metric label="Stored multiplier" value={recipe.storedMultiplier || 'Blank; declared share used'} />
                  <Metric label="Effective multiplier" value={`${recipe.effectiveMultiplier.toFixed(4)}${recipe.portionPinned ? ' (pinned to full recipe)' : ''}`} />
                  <Metric label="Formula" value={`Full recipe x ${recipe.effectiveMultiplier.toFixed(4)} = client serving`} />
                </dl>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-5 text-sm">
                  <div><strong className="block mb-1">Full raw recipe</strong><NutritionLine value={recipe.fullRecipe} /></div>
                  <div><strong className="block mb-1">Fresh USDA raw sum</strong><NutritionLine value={recipe.liveUsdaFullRecipe} /></div>
                  <div><strong className="block mb-1">Recomputed serving</strong><NutritionLine value={recipe.recomputedServing} /></div>
                  <div><strong className="block mb-1">Saved plan serving</strong><NutritionLine value={recipe.savedServing} /></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead><tr style={{ textAlign: 'left', color: 'var(--admin-on-surface-variant)' }}><th className="py-2 pr-3">Raw ingredient input</th><th className="py-2 pr-3">Matched record</th><th className="py-2 pr-3 text-right">Grams</th><th className="py-2 pr-3 text-right">Calories</th><th className="py-2 text-right">P / C / F / Fiber</th></tr></thead>
                    <tbody>{recipe.ingredientResults.map((ingredient) => (
                      <tr key={`${ingredient.input}-${ingredient.matchedFood}`} style={{ borderTop: '1px solid var(--admin-outline-variant)' }}>
                        <td className="py-3 pr-3">{ingredient.input}</td>
                        <td className="py-3 pr-3"><span className="block">{ingredient.matchedFood}</span><span className="text-xs" style={{ color: 'var(--admin-on-surface-variant)' }}>{ingredient.dataType}</span></td>
                        <td className="py-3 pr-3 text-right">{ingredient.grams}</td>
                        <td className="py-3 pr-3 text-right font-bold">{ingredient.calories}</td>
                        <td className="py-3 text-right">{ingredient.protein} / {ingredient.carbs} / {ingredient.fats} / {ingredient.fiber}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                {(recipe.unmatchedIngredients.length > 0 || recipe.excludedIngredients.length > 0 || recipe.warnings.length > 0) && (
                  <div className="mt-4 text-xs space-y-1" style={{ color: 'var(--admin-on-surface-variant)' }}>
                    {recipe.unmatchedIngredients.length > 0 && <p><strong>Unmatched:</strong> {recipe.unmatchedIngredients.join('; ')}</p>}
                    {recipe.excludedIngredients.length > 0 && <p><strong>Excluded from nutrition:</strong> {recipe.excludedIngredients.join('; ')}</p>}
                    {recipe.warnings.length > 0 && <p><strong>USDA warnings:</strong> {recipe.warnings.join(' | ')}</p>}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="admin-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-eb-garamond)' }}>Grocery Scaling</h2>
          <StatusBadge status={audit.groceryListMatches ? 'ok' : 'error'}>{audit.groceryListMatches ? 'Saved list matches' : 'Saved list is stale'}</StatusBadge>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--admin-on-surface-variant)' }}>The baseline list buys only the client&apos;s scheduled portions. Each raw ingredient amount is multiplied by total recipe equivalents.</p>
        <div className="space-y-3 mb-6">
          {audit.groceries.map((grocery) => (
            <details key={grocery.recipeName} style={{ borderTop: '1px solid var(--admin-outline-variant)', paddingTop: 10 }}>
              <summary className="cursor-pointer py-2 font-bold" style={{ listStyle: 'none' }}>{grocery.recipeName}: {grocery.formula} = {grocery.recipeEquivalents} recipe equivalent(s)</summary>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 py-3 text-sm">
                {grocery.scaledIngredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}
              </ul>
            </details>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
          <div><h3 className="font-bold mb-2">Saved grocery list</h3><ol className="space-y-1">{audit.savedGroceryList.map((line) => <li key={line}>{line}</li>)}</ol></div>
          <div><h3 className="font-bold mb-2">Recomputed client-portion list</h3><ol className="space-y-1">{audit.recomputedGroceryList.map((line) => <li key={line}>{line}</li>)}</ol></div>
        </div>
      </section>
    </div>
  )
}
