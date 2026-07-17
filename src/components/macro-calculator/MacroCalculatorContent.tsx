'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { previewMacros, submitMacroLead, type MacroPreview } from '@/app/actions/macro-calculator'
import type { PublicMacroResult } from '@/lib/macro-calculator-public'

type Inputs = {
  age: string
  heightFeet: string
  heightInches: string
  weightLb: string
  goalWeightLb: string
  dailyMovement: string
  stepRange: string
  strengthDays: string
  sleepHours: string
  goal: string
  lifeStage: string
  dietingHistory: string
  stress: string
}

const initialInputs: Inputs = {
  age: '',
  heightFeet: '',
  heightInches: '',
  weightLb: '',
  goalWeightLb: '',
  dailyMovement: '',
  stepRange: '',
  strengthDays: '',
  sleepHours: '',
  goal: '',
  lifeStage: '',
  dietingHistory: '',
  stress: '',
}

type CardOption = { value: string; label: string; detail: string }

const dailyMovementOptions: CardOption[] = [
  { value: 'mostly_sedentary', label: 'Mostly seated', detail: 'Desk work, driving, most of the day sitting' },
  { value: 'light_daily_movement', label: 'Light movement', detail: 'Some walking and errands woven through the day' },
  { value: 'moderate_daily_movement', label: 'Moderate movement', detail: 'On your feet a good part of the day' },
  { value: 'very_active_lifestyle', label: 'Rarely sitting', detail: 'Physical job, active kids, always moving' },
]

const stepRangeOptions: CardOption[] = [
  { value: 'under_5k', label: 'Under 5,000 steps', detail: 'A low movement day' },
  { value: '5k_to_7_5k', label: '5,000 to 7,500 steps', detail: 'Some walking most days' },
  { value: '7_5k_to_10k', label: '7,500 to 10,000 steps', detail: 'A fair amount of movement' },
  { value: '10k_to_12_5k', label: '10,000 to 12,500 steps', detail: 'On your feet and active daily' },
  { value: 'over_12_5k', label: 'Over 12,500 steps', detail: 'Very high daily movement' },
]

const strengthOptions: CardOption[] = [
  { value: 'none', label: 'None right now', detail: 'And that is okay, we will meet you there' },
  { value: '1_2_days', label: '1 to 2 days a week', detail: 'Lifting, classes, or training sessions' },
  { value: '3_4_days', label: '3 to 4 days a week', detail: 'A steady training rhythm' },
  { value: '5_plus_days', label: '5 or more days a week', detail: 'Training is part of your routine' },
]

const goalOptions: CardOption[] = [
  { value: 'fat_loss', label: 'Lose fat', detail: 'Lean down while protecting your energy and hormones' },
  { value: 'recomposition', label: 'Recomposition', detail: 'Lose fat and build shape at the same time' },
  { value: 'build_muscle', label: 'Build muscle', detail: 'Add lean muscle with a small, controlled surplus' },
]

const lifeStageOptions: { value: string; label: string }[] = [
  { value: 'cycling', label: 'Cycling regularly' },
  { value: 'birth_control', label: 'On birth control' },
  { value: 'trying_to_conceive', label: 'Trying to conceive' },
  { value: 'postpartum', label: 'Postpartum' },
  { value: 'breastfeeding', label: 'Breastfeeding' },
  { value: 'perimenopause', label: 'Perimenopause' },
  { value: 'menopause', label: 'Menopause' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const dietingHistoryOptions: CardOption[] = [
  { value: 'not_really', label: 'Not really', detail: 'I eat pretty freely' },
  { value: 'on_and_off', label: 'On and off', detail: 'I go through phases of cutting back' },
  { value: 'long_time', label: 'Yes, for a while now', detail: 'Months of eating low or dieting hard' },
]

const stressOptions: CardOption[] = [
  { value: 'manageable', label: 'Manageable', detail: 'Busy, but I feel steady' },
  { value: 'coping', label: 'Busy but coping', detail: 'Full plate, holding it together' },
  { value: 'constantly_high', label: 'Constantly high', detail: 'Wired, stretched thin, rarely switching off' },
]

const stepMeta = [
  { eyebrow: 'About you', heading: 'Let us start with the basics.' },
  { eyebrow: 'Your day', heading: 'How your body actually moves.' },
  { eyebrow: 'Your goal', heading: 'What you are working toward.' },
  { eyebrow: 'Your season', heading: 'The context most calculators skip.' },
]

function RadioCards(props: {
  name: string
  legend: string
  hint?: string
  options: CardOption[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="mc-fieldset">
      <legend className="mc-legend">{props.legend}</legend>
      {props.hint && <p className="mc-hint">{props.hint}</p>}
      <div className="mc-cards">
        {props.options.map((option) => (
          <label
            key={option.value}
            className={`mc-card${props.value === option.value ? ' mc-card-selected' : ''}`}
          >
            <input
              type="radio"
              name={props.name}
              value={option.value}
              checked={props.value === option.value}
              onChange={() => props.onChange(option.value)}
              className="mc-radio"
            />
            <span className="mc-card-label">{option.label}</span>
            <span className="mc-card-detail">{option.detail}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function MacroCalculatorContent() {
  const [step, setStep] = useState(0)
  const [inputs, setInputs] = useState<Inputs>(initialInputs)
  const [preview, setPreview] = useState<MacroPreview | null>(null)
  const [result, setResult] = useState<PublicMacroResult | null>(null)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)

  function update(field: keyof Inputs, value: string) {
    setInputs((previous) => ({ ...previous, [field]: value }))
    setError('')
  }

  function focusHeading() {
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  function validateStep(current: number): string {
    if (current === 0) {
      if (!inputs.age.trim()) return 'Please enter your age.'
      if (!inputs.heightFeet.trim() || !inputs.heightInches.trim()) return 'Please enter your height.'
      if (!inputs.weightLb.trim()) return 'Please enter your weight.'
      if (!inputs.goalWeightLb.trim()) return 'Please enter your goal weight.'
    }
    if (current === 1) {
      if (!inputs.dailyMovement) return 'Please choose how your day usually looks.'
      if (!inputs.stepRange) return 'Please choose your daily steps.'
      if (!inputs.strengthDays) return 'Please choose your weekly workouts.'
    }
    if (current === 2 && !inputs.goal) return 'Please choose your goal.'
    if (current === 3) {
      if (!inputs.lifeStage) return 'Please choose your season of life.'
      if (!inputs.dietingHistory) return 'Please answer the dieting question.'
      if (!inputs.stress) return 'Please answer the stress question.'
    }
    return ''
  }

  async function handleContinue() {
    const validationError = validateStep(step)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')

    if (step < 3) {
      setStep(step + 1)
      focusHeading()
      return
    }

    setLoading(true)
    const response = await previewMacros(inputs)
    setLoading(false)
    if (response.error || !response.preview) {
      setError(response.error ?? 'Something went wrong. Please try again.')
      return
    }
    setPreview(response.preview)
    setStep(4)
    focusHeading()
  }

  function handleBack() {
    if (step === 0) return
    setError('')
    if (step === 4) setPreview(null)
    setStep(step - 1)
    focusHeading()
  }

  async function handleSubmitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(event.currentTarget)
    const response = await submitMacroLead(inputs, {
      firstName,
      email,
      website: (formData.get('website') as string) ?? '',
    })
    setLoading(false)
    if (response.error || !response.result) {
      setError(response.error ?? 'Something went wrong. Please try again.')
      return
    }
    setResult(response.result)
    setStep(5)
    focusHeading()
  }

  const disclaimer = (
    <p className="mc-disclaimer">
      These numbers are a general guide produced by a calculation. They are not medical or
      nutritional advice. Always check with your own healthcare provider before changing how you
      eat or train, especially if you are breastfeeding or managing a health condition.
    </p>
  )

  return (
    <main id="main-content" style={{ background: 'var(--page-bg)', minHeight: '100vh' }}>
      <section className="mc-wrap">
        {step <= 3 && (
          <div className="mc-shell">
            <div className="mc-progress-row">
              <p className="mc-eyebrow">{stepMeta[step].eyebrow}</p>
              <p className="mc-count" aria-hidden="true">{step + 1} of 4</p>
            </div>
            <div
              className="mc-progress"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={4}
              aria-valuenow={step + 1}
              aria-label={`Step ${step + 1} of 4`}
            >
              <div className="mc-progress-fill" style={{ width: `${((step + 1) / 4) * 100}%` }} />
            </div>

            <h1 ref={headingRef} tabIndex={-1} className="mc-heading">
              {stepMeta[step].heading}
            </h1>

            {step === 0 && (
              <>
                <p className="mc-sub">
                  Your macros, calculated with the same math we use for our one on one coaching
                  clients, and we will show you exactly how we got them. About two minutes.
                </p>
                <div className="mc-field-row">
                  <div className="mc-field">
                    <label htmlFor="mc-age" className="mc-label">Your age</label>
                    <input
                      id="mc-age"
                      className="mc-input"
                      type="number"
                      inputMode="numeric"
                      min={18}
                      max={90}
                      placeholder="e.g. 34"
                      value={inputs.age}
                      onChange={(event) => update('age', event.target.value)}
                    />
                  </div>
                  <div className="mc-field">
                    <label htmlFor="mc-weight" className="mc-label">Your weight, in pounds</label>
                    <input
                      id="mc-weight"
                      className="mc-input"
                      type="number"
                      inputMode="decimal"
                      min={80}
                      max={700}
                      placeholder="e.g. 162"
                      value={inputs.weightLb}
                      onChange={(event) => update('weightLb', event.target.value)}
                    />
                  </div>
                </div>
                <div className="mc-field-row">
                  <div className="mc-field">
                    <label htmlFor="mc-feet" className="mc-label">Height, feet</label>
                    <input
                      id="mc-feet"
                      className="mc-input"
                      type="number"
                      inputMode="numeric"
                      min={4}
                      max={7}
                      placeholder="e.g. 5"
                      value={inputs.heightFeet}
                      onChange={(event) => update('heightFeet', event.target.value)}
                    />
                  </div>
                  <div className="mc-field">
                    <label htmlFor="mc-inches" className="mc-label">Height, inches</label>
                    <input
                      id="mc-inches"
                      className="mc-input"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={11}
                      placeholder="e.g. 6"
                      value={inputs.heightInches}
                      onChange={(event) => update('heightInches', event.target.value)}
                    />
                  </div>
                </div>
                <div className="mc-field">
                  <label htmlFor="mc-goal-weight" className="mc-label">
                    Your goal weight, in pounds
                  </label>
                  <p className="mc-hint" id="mc-goal-weight-hint">
                    The weight you are working toward. Your protein target is anchored to it, so
                    it fits the body you are building, not just the one you have today.
                  </p>
                  <input
                    id="mc-goal-weight"
                    className="mc-input"
                    type="number"
                    inputMode="decimal"
                    min={80}
                    max={700}
                    placeholder="e.g. 145"
                    aria-describedby="mc-goal-weight-hint"
                    value={inputs.goalWeightLb}
                    onChange={(event) => update('goalWeightLb', event.target.value)}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <p className="mc-sub">
                  Honest answers keep your numbers realistic. This is where most calculators let
                  you overshoot.
                </p>
                <RadioCards
                  name="dailyMovement"
                  legend="Outside of workouts, your day is"
                  options={dailyMovementOptions}
                  value={inputs.dailyMovement}
                  onChange={(value) => update('dailyMovement', value)}
                />
                <RadioCards
                  name="stepRange"
                  legend="Your daily steps, on a normal day"
                  options={stepRangeOptions}
                  value={inputs.stepRange}
                  onChange={(value) => update('stepRange', value)}
                />
                <RadioCards
                  name="strengthDays"
                  legend="Structured workouts per week"
                  hint="Lifting, classes, or training sessions. Not your daily steps."
                  options={strengthOptions}
                  value={inputs.strengthDays}
                  onChange={(value) => update('strengthDays', value)}
                />
                <div className="mc-field mc-field-narrow">
                  <label htmlFor="mc-sleep" className="mc-label">Sleep per night, average hours, optional</label>
                  <input
                    id="mc-sleep"
                    className="mc-input"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={3}
                    max={14}
                    placeholder="e.g. 6.5"
                    value={inputs.sleepHours}
                    onChange={(event) => update('sleepHours', event.target.value)}
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="mc-sub">Pick the one that sounds most like you right now.</p>
                <RadioCards
                  name="goal"
                  legend="Right now, your main goal is to"
                  options={goalOptions}
                  value={inputs.goal}
                  onChange={(value) => update('goal', value)}
                />
              </>
            )}

            {step === 3 && (
              <>
                <p className="mc-sub">
                  Hormones, life stage, and your dieting history genuinely change your starting
                  point, so we ask. This stays private.
                </p>
                <div className="mc-field mc-field-narrow">
                  <label htmlFor="mc-life-stage" className="mc-label">Where are you in your season of life?</label>
                  <select
                    id="mc-life-stage"
                    className="mc-input"
                    value={inputs.lifeStage}
                    onChange={(event) => update('lifeStage', event.target.value)}
                  >
                    <option value="" disabled>Select one</option>
                    {lifeStageOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <RadioCards
                  name="dietingHistory"
                  legend="Have you been dieting or eating low lately?"
                  options={dietingHistoryOptions}
                  value={inputs.dietingHistory}
                  onChange={(value) => update('dietingHistory', value)}
                />
                <RadioCards
                  name="stress"
                  legend="How is your stress, most days?"
                  options={stressOptions}
                  value={inputs.stress}
                  onChange={(value) => update('stress', value)}
                />
              </>
            )}

            {error && (
              <p role="alert" className="mc-error">{error}</p>
            )}

            <div className="mc-nav">
              {step > 0 ? (
                <button type="button" onClick={handleBack} className="mc-back">Back</button>
              ) : <span />}
              <button
                type="button"
                onClick={handleContinue}
                disabled={loading}
                className="btn-primary mc-continue"
              >
                {loading ? 'Calculating…' : step === 3 ? 'Calculate my macros' : 'Continue'}
              </button>
            </div>
            {disclaimer}
          </div>
        )}

        {step === 4 && preview && (
          <div className="mc-shell">
            <p className="mc-eyebrow">Your numbers are ready</p>
            <h1 ref={headingRef} tabIndex={-1} className="mc-heading">
              Your maintenance is about {preview.maintenanceCalories.toLocaleString()} calories.
            </h1>
            <p className="mc-sub">
              That is what your body burns living your current life. {preview.headline}
            </p>
            <p className="mc-sub">
              Tell us where to send your full breakdown, calories, protein, carbs, fat, and the
              honest notes that go with them. It appears right here on this page too, no
              gatekeeping.
            </p>
            <form onSubmit={handleSubmitLead}>
              <div className="mc-field-row">
                <div className="mc-field">
                  <label htmlFor="mc-first-name" className="mc-label">First name</label>
                  <input
                    id="mc-first-name"
                    className="mc-input"
                    type="text"
                    autoComplete="given-name"
                    maxLength={100}
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </div>
                <div className="mc-field">
                  <label htmlFor="mc-email" className="mc-label">Best email for your results</label>
                  <input
                    id="mc-email"
                    className="mc-input"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>
              <div className="mc-honeypot" aria-hidden="true">
                <label htmlFor="mc-website">Website</label>
                <input id="mc-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              {error && <p role="alert" className="mc-error">{error}</p>}
              <div className="mc-nav">
                <button type="button" onClick={handleBack} className="mc-back">Back</button>
                <button type="submit" disabled={loading} className="btn-primary mc-continue">
                  {loading ? 'Sending…' : 'Show my full breakdown'}
                </button>
              </div>
              <p className="mc-fine-print">
                We will also send your numbers to your inbox and include you in our Sunday letter.
                Unsubscribe anytime, no hard feelings.
              </p>
            </form>
            {disclaimer}
          </div>
        )}

        {step === 5 && result && (
          <div className="mc-shell">
            <p className="mc-eyebrow">Your daily targets, for {result.goalApplied}</p>
            <h1 ref={headingRef} tabIndex={-1} className="mc-heading">
              {firstName ? `${firstName}, here are your numbers.` : 'Here are your numbers.'}
            </h1>

            <div className="mc-calories" role="group" aria-label="Daily calorie target">
              <p className="mc-calories-number">{result.calories.toLocaleString()}</p>
              <p className="mc-calories-label">Calories per day</p>
            </div>

            <div className="mc-macro-grid">
              <div className="mc-macro-card">
                <p className="mc-macro-number">{result.proteinG}g</p>
                <p className="mc-macro-label">Protein</p>
              </div>
              <div className="mc-macro-card">
                <p className="mc-macro-number">{result.carbsG}g</p>
                <p className="mc-macro-label">Carbs</p>
              </div>
              <div className="mc-macro-card">
                <p className="mc-macro-number">{result.fatG}g</p>
                <p className="mc-macro-label">Fat</p>
              </div>
            </div>

            <p className="mc-sub">
              Also aim for about {result.fiberG}g of fiber, {result.water} of water, and{' '}
              {result.steps} steps. Your estimated maintenance is about{' '}
              {result.maintenanceCalories.toLocaleString()} calories.
              {result.proteinAnchoredToGoalWeight &&
                ' Your protein is anchored to your goal weight, so it already fits the body you are building.'}
            </p>

            {result.insights.length > 0 && (
              <div className="mc-insights">
                <h2 className="mc-subheading">Honest notes on your numbers</h2>
                {result.insights.map((insight) => (
                  <div key={insight.title} className="mc-insight">
                    <p className="mc-insight-title">{insight.title}</p>
                    <p className="mc-insight-body">{insight.body}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mc-method">
              <h2 className="mc-subheading">How we calculated this, no secrets</h2>
              <p className="mc-body">
                We estimated your metabolism from your age, height, and weight, then layered on
                how you actually move through a normal day. Your protein protects your muscle
                while you change, your fat stays high enough to support your hormones, and your
                carbs fill the exact remainder, so the three always add up to your calories.
                Prescribed workouts you have not started yet never inflate the math.
              </p>
              <p className="mc-body">
                And one thing most calculators will not tell you: every formula is a starting
                point, including ours. Eat here consistently for 2 to 3 weeks, then adjust from
                what your body actually does. A copy of everything is in your inbox.
              </p>
            </div>

            <div className="mc-cta">
              <h2 className="mc-subheading">Want to know what to do with these numbers?</h2>
              <p className="mc-body">
                We are building a full course that teaches you to calculate, track, and adjust
                your own macros with confidence. You are on the list, so you will hear about it
                first. In the meantime, start here.
              </p>
              <div className="mc-cta-row">
                <Link href="/free-course" className="btn-primary">Start the free course</Link>
                <Link href="/work-with-me" className="btn-secondary">Learn about coaching</Link>
              </div>
            </div>
            {disclaimer}
          </div>
        )}
      </section>

      <style>{`
        .mc-wrap { max-width: 640px; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
        .mc-shell { background: var(--card-bg); border: 1px solid var(--outline-variant); border-radius: 1.25rem; padding: 2.25rem 1.75rem; }
        @media (min-width: 640px) { .mc-shell { padding: 2.75rem 2.5rem; } }
        .mc-progress-row { display: flex; justify-content: space-between; align-items: baseline; }
        .mc-eyebrow { font-family: var(--font-sans); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--botanical-green); margin: 0 0 0.5rem; }
        .mc-count { font-family: var(--font-sans); font-size: 0.75rem; color: var(--text-muted); }
        .mc-progress { height: 4px; background: var(--section-tint); border-radius: 9999px; margin-bottom: 1.75rem; }
        .mc-progress-fill { height: 100%; background: var(--botanical-green); border-radius: 9999px; transition: width 0.3s ease; }
        .mc-heading { font-family: var(--font-display); font-size: 1.75rem; line-height: 1.25; color: var(--text-primary); margin: 0 0 0.75rem; outline: none; }
        @media (min-width: 640px) { .mc-heading { font-size: 2rem; } }
        .mc-subheading { font-family: var(--font-display); font-size: 1.25rem; color: var(--text-primary); margin: 0 0 0.75rem; }
        .mc-sub { font-family: var(--font-sans); font-size: 0.9375rem; line-height: 1.7; color: var(--text-secondary); margin: 0 0 1.5rem; }
        .mc-body { font-family: var(--font-sans); font-size: 0.9375rem; line-height: 1.7; color: var(--text-secondary); margin: 0 0 1rem; }
        .mc-field { margin-bottom: 1.25rem; flex: 1; }
        .mc-field-narrow { max-width: 20rem; }
        .mc-field-row { display: flex; flex-direction: column; gap: 0; }
        @media (min-width: 640px) { .mc-field-row { flex-direction: row; gap: 1rem; } }
        .mc-label { display: block; font-family: var(--font-sans); font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.4rem; letter-spacing: 0.02em; }
        .mc-hint { font-family: var(--font-sans); font-size: 0.8125rem; color: var(--text-muted); margin: 0 0 0.6rem; line-height: 1.6; }
        .mc-input { width: 100%; padding: 0.8125rem 1.125rem; border-radius: 0.75rem; border: 1px solid var(--outline-variant); background: var(--page-bg); font-family: var(--font-sans); font-size: 1rem; color: var(--text-primary); outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; min-height: 48px; }
        .mc-input:focus { border-color: var(--botanical-green); box-shadow: 0 0 0 3px rgba(68, 113, 59, 0.18); }
        .mc-input::placeholder { color: var(--text-muted); opacity: 0.7; }
        .mc-fieldset { border: none; padding: 0; margin: 0 0 1.5rem; }
        .mc-legend { font-family: var(--font-sans); font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); padding: 0; margin-bottom: 0.6rem; }
        .mc-cards { display: flex; flex-direction: column; gap: 0.6rem; }
        .mc-card { display: block; border: 1px solid var(--outline-variant); border-radius: 0.875rem; padding: 0.875rem 1.125rem; cursor: pointer; background: var(--page-bg); transition: border-color 0.15s, background 0.15s; }
        .mc-card:hover { border-color: var(--botanical-green); }
        .mc-card-selected { border-color: var(--botanical-green); background: var(--section-tint); }
        .mc-radio { position: absolute; opacity: 0; width: 1px; height: 1px; }
        .mc-card:has(.mc-radio:focus-visible) { outline: 3px solid rgba(68, 113, 59, 0.45); outline-offset: 2px; }
        .mc-card-label { display: block; font-family: var(--font-sans); font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); }
        .mc-card-detail { display: block; font-family: var(--font-sans); font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.15rem; line-height: 1.5; }
        .mc-error { font-family: var(--font-sans); font-size: 0.875rem; color: #A03426; margin: 0 0 1rem; }
        .mc-nav { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 0.5rem; }
        .mc-back { background: none; border: none; cursor: pointer; font-family: var(--font-sans); font-size: 0.9375rem; font-weight: 600; color: var(--text-secondary); padding: 0.75rem 1rem; min-height: 44px; border-radius: 0.5rem; }
        .mc-back:hover { color: var(--text-primary); }
        .mc-continue { min-height: 48px; flex: 1; max-width: 20rem; margin-left: auto; }
        .mc-honeypot { position: absolute; left: -9999px; top: auto; width: 1px; height: 1px; overflow: hidden; }
        .mc-fine-print { font-family: var(--font-sans); font-size: 0.8125rem; color: var(--text-muted); line-height: 1.6; margin: 1rem 0 0; }
        .mc-disclaimer { font-family: var(--font-sans); font-size: 0.75rem; color: var(--text-muted); line-height: 1.6; margin: 2rem 0 0; border-top: 1px solid var(--outline-variant); padding-top: 1.25rem; }
        .mc-calories { text-align: center; background: var(--section-tint); border-radius: 1rem; padding: 1.5rem; margin: 0 0 0.75rem; }
        .mc-calories-number { font-family: var(--font-display); font-size: 3rem; color: var(--text-primary); margin: 0; line-height: 1.1; }
        .mc-calories-label { font-family: var(--font-sans); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--botanical-green); margin: 0.25rem 0 0; }
        .mc-macro-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin: 0 0 1.25rem; }
        .mc-macro-card { text-align: center; background: var(--page-bg); border: 1px solid var(--outline-variant); border-radius: 1rem; padding: 1.125rem 0.5rem; }
        .mc-macro-number { font-family: var(--font-display); font-size: 1.5rem; color: var(--text-primary); margin: 0; }
        .mc-macro-label { font-family: var(--font-sans); font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--botanical-green); margin: 0.25rem 0 0; }
        .mc-insights { margin: 1.75rem 0 0; }
        .mc-insight { background: var(--section-tint); border-radius: 0.875rem; padding: 1rem 1.25rem; margin-bottom: 0.75rem; }
        .mc-insight-title { font-family: var(--font-sans); font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.3rem; }
        .mc-insight-body { font-family: var(--font-sans); font-size: 0.875rem; line-height: 1.65; color: var(--text-secondary); margin: 0; }
        .mc-method { margin: 1.75rem 0 0; }
        .mc-cta { margin: 1.75rem 0 0; background: var(--section-sand); border-radius: 1rem; padding: 1.5rem; }
        .mc-cta-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem; }
      `}</style>
    </main>
  )
}
