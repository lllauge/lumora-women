'use client'

import { useState } from 'react'
import type { CoachingPlanDraft } from '@/lib/coaching-plan-schema'

type Recipe = CoachingPlanDraft['recipes'][number]

type WeighItIngredient = {
  label: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fats: number
}

type CleanFraction = { numerator: number; denominator: number }

function parseMultiplierAsFraction(multiplier: string): CleanFraction | null {
  const num = parseFloat(multiplier)
  if (!Number.isFinite(num) || num <= 0) return null
  if (num >= 1) return { numerator: 1, denominator: 1 }

  const candidates: [number, number][] = [
    [1, 8], [1, 7], [1, 6], [1, 5], [1, 4], [1, 3], [3, 8],
    [2, 5], [1, 2], [3, 5], [5, 8], [2, 3], [3, 4], [4, 5], [5, 6], [7, 8],
  ]
  for (const [n, d] of candidates) {
    if (Math.abs(num - n / d) < 0.03) return { numerator: n, denominator: d }
  }
  return null
}

function visualSplitText(multiplier: string, clientServingGrams: string): string {
  const fraction = parseMultiplierAsFraction(multiplier)
  const grams = clientServingGrams || ''

  if (!fraction) {
    return grams ? `Weigh out ${grams} of this dish and plate it.` : ''
  }

  const { numerator, denominator } = fraction
  if (numerator === denominator) return grams ? `The whole recipe is your serving (${grams}).` : 'The whole recipe is your serving.'
  if (denominator === 2) return `Divide the dish in half. Your half is ${grams}.`
  if (denominator === 3 && numerator === 1) return `Divide the dish into 3 equal portions. Take 1 — that's ${grams}.`
  if (denominator === 3 && numerator === 2) return `Divide the dish into 3 equal portions. Take 2 — that's ${grams}.`
  if (denominator === 4 && numerator === 1) return `Divide the dish into 4 equal portions. Take 1 — that's ${grams}.`
  if (denominator === 4 && numerator === 3) return `Divide the dish into 4 equal portions. Take 3 — that's ${grams}.`
  return grams ? `Weigh out ${grams} of this dish and plate it.` : ''
}

function ServingDiagram({ multiplier }: { multiplier: string }) {
  const fraction = parseMultiplierAsFraction(multiplier)
  if (!fraction || fraction.denominator > 8) return null

  const { numerator, denominator } = fraction
  const squares = Array.from({ length: denominator }, (_, i) => i < numerator)

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {squares.map((isHers, i) => (
          <div
            key={i}
            style={{
              width: 40,
              height: 40,
              borderRadius: 6,
              backgroundColor: isHers ? '#C9A84C' : '#FAF8F3',
              border: `2px solid ${isHers ? '#A8893A' : '#D6C9A8'}`,
            }}
            aria-label={isHers ? 'your portion' : 'family portion'}
          />
        ))}
      </div>
      <p style={{ fontFamily: 'var(--font-hanken)', fontSize: '0.78rem', color: '#8A7A5A', margin: '6px 0 0' }}>
        Gold = your portion · White = family&apos;s
      </p>
    </div>
  )
}

function parseWeighItIngredients(breakdown: string): WeighItIngredient[] {
  const detailsIdx = breakdown.indexOf('Details:')
  if (detailsIdx < 0) return []
  const detailsText = breakdown.slice(detailsIdx + 'Details:'.length).trim()

  const results: WeighItIngredient[] = []
  const parts = detailsText.split('|').map((s) => s.trim()).filter(Boolean)

  for (const part of parts) {
    const match = part.match(
      /^(\d+)g\s+([^:]+):\s*(\d+(?:\.\d+)?)\s*cal,\s*(\d+(?:\.\d+)?)g\s*protein,\s*(\d+(?:\.\d+)?)g\s*carbs,\s*(\d+(?:\.\d+)?)g\s*fats/
    )
    if (match) {
      results.push({
        grams: parseInt(match[1]),
        label: match[2].trim(),
        calories: parseFloat(match[3]),
        protein: parseFloat(match[4]),
        carbs: parseFloat(match[5]),
        fats: parseFloat(match[6]),
      })
    }
  }

  return results
}

function firstNum(s: string) {
  const m = s.match(/\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : 0
}

export default function RecipePortionCard({ recipe }: { recipe: Recipe }) {
  const [mode, setMode] = useState<'visual' | 'weigh'>('visual')

  if (!recipe.clientServingMultiplier || !recipe.clientServingGrams) return null

  const weighIngredients = parseWeighItIngredients(recipe.clientServingBreakdown)
  // When ingredient rows exist, total them directly so the table is internally consistent.
  const sumRows = (pick: (ing: WeighItIngredient) => number) =>
    Math.round(weighIngredients.reduce((sum, ing) => sum + pick(ing), 0) * 10) / 10
  const totalCal = weighIngredients.length > 0 ? Math.round(sumRows((i) => i.calories)) : firstNum(recipe.calories)
  const totalProtein = weighIngredients.length > 0 ? sumRows((i) => i.protein) : firstNum(recipe.protein)
  const totalCarbs = weighIngredients.length > 0 ? sumRows((i) => i.carbs) : firstNum(recipe.carbs)
  const totalFats = weighIngredients.length > 0 ? sumRows((i) => i.fats) : firstNum(recipe.fats)
  const totalGrams = weighIngredients.length > 0
    ? `${Math.round(sumRows((i) => i.grams))}g`
    : recipe.clientServingGrams

  const btnBase: React.CSSProperties = {
    padding: '0.3rem 0.75rem',
    borderRadius: 6,
    border: '1px solid #C9A84C',
    fontFamily: 'var(--font-hanken)',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  }

  return (
    <div
      style={{
        backgroundColor: '#FAF8F3',
        border: '1px solid #D6C9A8',
        borderRadius: 10,
        padding: '1.1rem 1.25rem',
        marginTop: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: '0.9rem' }}>
        <p style={{ fontFamily: 'var(--font-eb-garamond)', fontSize: '1rem', fontWeight: 700, color: '#162814', margin: 0 }}>
          Client View Preview
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setMode('visual')}
            style={{ ...btnBase, backgroundColor: mode === 'visual' ? '#C9A84C' : 'transparent', color: mode === 'visual' ? '#162814' : '#6B5A2A' }}
          >
            👁 Visual Split
          </button>
          <button
            type="button"
            onClick={() => setMode('weigh')}
            style={{ ...btnBase, backgroundColor: mode === 'weigh' ? '#C9A84C' : 'transparent', color: mode === 'weigh' ? '#162814' : '#6B5A2A' }}
          >
            ⚖️ Weigh It
          </button>
        </div>
      </div>

      {mode === 'visual' && (
        <div>
          <p style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, color: '#162814', fontSize: '0.97rem', margin: '0 0 0.4rem' }}>
            {recipe.name}
          </p>
          <p style={{ fontFamily: 'var(--font-hanken)', color: '#3D4B3A', fontSize: '0.95rem', margin: 0 }}>
            {visualSplitText(recipe.clientServingMultiplier, recipe.clientServingGrams)}
          </p>
          <ServingDiagram multiplier={recipe.clientServingMultiplier} />
          <p style={{ fontFamily: 'var(--font-hanken)', color: '#8A7A5A', fontSize: '0.82rem', marginTop: '0.75rem' }}>
            {recipe.clientServingGrams} · {recipe.calories} cal · {recipe.protein} protein · {recipe.carbs} carbs · {recipe.fats} fat{recipe.fiber.trim() ? ` · ${recipe.fiber} fiber` : ''}
          </p>
        </div>
      )}

      {mode === 'weigh' && (
        <div>
          <p style={{ fontFamily: 'var(--font-hanken)', fontWeight: 700, color: '#162814', fontSize: '0.97rem', margin: '0 0 0.75rem' }}>
            {recipe.name} — Your exact portion
          </p>
          {weighIngredients.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-hanken)', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #D6C9A8' }}>
                  {['Ingredient', 'Grams', 'Cal', 'Protein', 'Carbs', 'Fat'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        textAlign: i === 0 ? 'left' : 'right',
                        padding: '0.3rem 0.5rem',
                        color: '#162814',
                        fontWeight: 700,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weighIngredients.map((ing, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #EDE7D6' }}>
                    <td style={{ padding: '0.3rem 0.5rem', color: '#3D4B3A' }}>{ing.label}</td>
                    <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', color: '#3D4B3A', fontWeight: 600 }}>{ing.grams}g</td>
                    <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', color: '#3D4B3A' }}>{ing.calories}</td>
                    <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', color: '#3D4B3A' }}>{ing.protein}g</td>
                    <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', color: '#3D4B3A' }}>{ing.carbs}g</td>
                    <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', color: '#3D4B3A' }}>{ing.fats}g</td>
                  </tr>
                ))}
                {totalCal > 0 && (
                  <tr style={{ borderTop: '2px solid #C9A84C' }}>
                    <td style={{ padding: '0.4rem 0.5rem', color: '#162814', fontWeight: 700 }}>Total</td>
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: '#162814', fontWeight: 700 }}>{totalGrams}</td>
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: '#162814', fontWeight: 700 }}>{totalCal}</td>
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: '#162814', fontWeight: 700 }}>{totalProtein}g</td>
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: '#162814', fontWeight: 700 }}>{totalCarbs}g</td>
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', color: '#162814', fontWeight: 700 }}>{totalFats}g</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div>
              <p style={{ fontFamily: 'var(--font-hanken)', color: '#3D4B3A', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                {recipe.clientServingBreakdown?.split('\n')[0] || recipe.clientServingGrams}
              </p>
              <p style={{ fontFamily: 'var(--font-hanken)', color: '#8A7A5A', fontSize: '0.82rem' }}>
                {recipe.clientServingGrams} · {recipe.calories} cal · {recipe.protein} protein · {recipe.carbs} carbs · {recipe.fats} fat{recipe.fiber.trim() ? ` · ${recipe.fiber} fiber` : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
