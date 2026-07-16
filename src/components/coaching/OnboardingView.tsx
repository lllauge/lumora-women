import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { submitCoachingOnboarding } from '@/app/actions/coaching-onboarding'

export type OnboardingLang = 'en' | 'es'

const COPY = {
  en: {
    toggleLabel: 'Español',
    toggleLang: 'es',
    confirmTitle: 'Your onboarding is submitted.',
    confirmBody: 'I’ll review your information and build your plan.',
    submit: 'Submit Onboarding',
    selectPlaceholder: 'Select an option',
    personalTitle: 'Personal Information',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone',
    timezone: 'Time zone',
    goalsTitle: 'Goals & Body Data',
    age: 'Age',
    height: 'Height',
    weight: 'Current weight',
    targetWeight: 'Goal weight, if any',
    primaryGoal: 'What is your main goal?',
    whyNow: 'Why now?',
    success: 'What would success look like in 12 weeks?',
    healthTitle: 'Health & Lifestyle',
    medicalConditions: 'Medical conditions or important health history',
    medications: 'Medications or supplements',
    injuries: 'Injuries or movement limitations',
    eatingDisorderHistory: 'History of eating disorder, extreme restriction, or binge/restrict cycles',
    sleep: 'Average sleep',
    stress: 'Stress level 1-10',
    nutritionTitle: 'Nutrition',
    currentEating: 'Describe a normal day of eating',
    trackingExperience: 'Experience tracking calories/macros',
    allergies: 'Food allergies',
    restrictions: 'Dietary restrictions',
    favoriteFoods: 'What are common foods that you like to eat?',
    dislikedFoods: 'Foods you dislike/refuse to eat',
    eatingOut: 'Eating out frequency',
    water: 'Water intake',
    caffeine: 'Caffeine intake',
    scheduleTitle: 'Schedule & Accountability',
    workSchedule: 'Work/family schedule',
    strengthTraining: 'Current strength training',
    strengthTrainingOptions: [
      { value: 'not_sure', label: 'Not sure' },
      { value: 'none', label: 'None right now' },
      { value: '1_2_days', label: '1-2 days per week' },
      { value: '3_4_days', label: '3-4 days per week' },
      { value: '5_plus_days', label: '5+ days per week' },
    ],
    steps: 'Average daily steps, if known',
    workouts: 'Current workouts and equipment access',
    workoutDaysCommitment: 'Realistic training days you can commit to each week',
    workoutDaysOptions: [
      { value: '1_day', label: '1 day' },
      { value: '2_days', label: '2 days' },
      { value: '3_days', label: '3 days' },
      { value: '4_days', label: '4 days' },
      { value: '5_plus_days', label: '5+ days' },
    ],
    workoutSessionLength: 'Realistic session length',
    sessionLengthOptions: [
      { value: 'under_20', label: 'Under 20 minutes' },
      { value: '20_30', label: '20–30 minutes' },
      { value: '30_45', label: '30–45 minutes' },
      { value: '45_60', label: '45–60 minutes' },
      { value: '60_plus', label: '60+ minutes' },
    ],
    barriers: 'Biggest barriers',
    accountability: 'What kind of accountability helps you most?',
    agreementsTitle: 'Agreements',
    agreeMedical: 'I understand this is coaching and education, not medical nutrition therapy or medical care.',
    agreePregnant: 'I confirm I am not currently pregnant or breastfeeding.',
    agreeTerms: 'I understand my plan will be created after Laura reviews my onboarding information.',
  },
  es: {
    toggleLabel: 'English',
    toggleLang: 'en',
    confirmTitle: 'Tu formulario fue enviado.',
    confirmBody: 'Revisaré tu información y crearé tu plan.',
    submit: 'Enviar formulario',
    selectPlaceholder: 'Selecciona una opción',
    personalTitle: 'Información personal',
    firstName: 'Nombre',
    lastName: 'Apellido',
    phone: 'Teléfono',
    timezone: 'Zona horaria',
    goalsTitle: 'Metas y datos corporales',
    age: 'Edad',
    height: 'Estatura',
    weight: 'Peso actual',
    targetWeight: 'Peso meta, si tienes uno',
    primaryGoal: '¿Cuál es tu meta principal?',
    whyNow: '¿Por qué ahora?',
    success: '¿Cómo se vería el éxito en 12 semanas?',
    healthTitle: 'Salud y estilo de vida',
    medicalConditions: 'Condiciones médicas o historial de salud importante',
    medications: 'Medicamentos o suplementos',
    injuries: 'Lesiones o limitaciones de movimiento',
    eatingDisorderHistory: 'Historial de trastornos alimenticios, restricción extrema o ciclos de atracón y restricción',
    sleep: 'Promedio de horas de sueño',
    stress: 'Nivel de estrés del 1 al 10',
    nutritionTitle: 'Nutrición',
    currentEating: 'Describe un día normal de comidas',
    trackingExperience: 'Experiencia contando calorías o macros',
    allergies: 'Alergias alimentarias',
    restrictions: 'Restricciones en tu alimentación',
    favoriteFoods: '¿Cuáles son las comidas que comes seguido y te gustan?',
    dislikedFoods: 'Comidas que no te gustan o que no comes',
    eatingOut: '¿Qué tan seguido comes fuera?',
    water: 'Consumo de agua',
    caffeine: 'Consumo de cafeína',
    scheduleTitle: 'Horario y seguimiento',
    workSchedule: 'Horario de trabajo y familia',
    strengthTraining: 'Entrenamiento de fuerza actual',
    strengthTrainingOptions: [
      { value: 'not_sure', label: 'No estoy segura' },
      { value: 'none', label: 'Ninguno por ahora' },
      { value: '1_2_days', label: '1-2 días por semana' },
      { value: '3_4_days', label: '3-4 días por semana' },
      { value: '5_plus_days', label: '5+ días por semana' },
    ],
    steps: 'Pasos diarios promedio, si los conoces',
    workouts: 'Entrenamientos actuales y equipo al que tienes acceso',
    workoutDaysCommitment: 'Días de entrenamiento por semana que realmente puedes cumplir',
    workoutDaysOptions: [
      { value: '1_day', label: '1 día' },
      { value: '2_days', label: '2 días' },
      { value: '3_days', label: '3 días' },
      { value: '4_days', label: '4 días' },
      { value: '5_plus_days', label: '5+ días' },
    ],
    workoutSessionLength: 'Duración realista de cada sesión',
    sessionLengthOptions: [
      { value: 'under_20', label: 'Menos de 20 minutos' },
      { value: '20_30', label: '20–30 minutos' },
      { value: '30_45', label: '30–45 minutos' },
      { value: '45_60', label: '45–60 minutos' },
      { value: '60_plus', label: 'Más de 60 minutos' },
    ],
    barriers: 'Tus mayores obstáculos',
    accountability: '¿Qué tipo de apoyo y seguimiento te ayuda más?',
    agreementsTitle: 'Acuerdos',
    agreeMedical: 'Entiendo que esto es coaching y educación, no terapia de nutrición médica ni atención médica.',
    agreePregnant: 'Confirmo que actualmente no estoy embarazada ni amamantando.',
    agreeTerms: 'Entiendo que mi plan se creará después de que Laura revise mi información.',
  },
} satisfies Record<OnboardingLang, unknown>

function Field({ name, label, type = 'text', required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
        {label}
      </span>
      <input name={name} type={type} required={required} style={{
        width: '100%', minHeight: '44px', borderRadius: '0.5rem',
        border: '1px solid rgba(200,220,192,0.55)', padding: '0.75rem 0.875rem',
        fontFamily: 'var(--font-sans)', background: '#FFFFFF',
      }} />
    </label>
  )
}

function TextArea({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
        {label}
      </span>
      <textarea name={name} required={required} rows={4} style={{
        width: '100%', borderRadius: '0.5rem',
        border: '1px solid rgba(200,220,192,0.55)', padding: '0.75rem 0.875rem',
        fontFamily: 'var(--font-sans)', background: '#FFFFFF', resize: 'vertical',
      }} />
    </label>
  )
}

function SelectField({
  name,
  label,
  options,
}: {
  name: string
  label: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
        {label}
      </span>
      <select name={name} required style={{
        width: '100%', minHeight: '44px', borderRadius: '0.5rem',
        border: '1px solid rgba(200,220,192,0.55)', padding: '0.75rem 0.875rem',
        fontFamily: 'var(--font-sans)', background: '#FFFFFF',
      }}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4" style={{ borderTop: '1px solid rgba(200,220,192,0.45)', paddingTop: '1.5rem' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function OnboardingView({
  lang,
  email,
  submitted,
  basePath = '/coaching/onboarding',
}: {
  lang: OnboardingLang
  email: string
  submitted: boolean
  basePath?: string
}) {
  const t = COPY[lang]
  const toggleQuery = [
    t.toggleLang === 'es' ? 'lang=es' : null,
    submitted ? 'submitted=1' : null,
  ].filter(Boolean).join('&')
  const toggleHref = toggleQuery ? `${basePath}?${toggleQuery}` : basePath

  return (
    <main id="main-content" lang={lang} style={{ background: 'var(--page-bg)', minHeight: '100vh', padding: '2rem 1rem 5rem' }}>
      <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
          <Link href="/" className="gold-text" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, textDecoration: 'none' }}>
            Lumora Women
          </Link>
          <Link
            href={toggleHref}
            lang={t.toggleLang}
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'underline' }}
          >
            {t.toggleLabel}
          </Link>
        </div>

        {submitted ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(200,220,192,0.45)', marginTop: '3rem' }}>
            <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--botanical-green)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              {t.confirmTitle}
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              {t.confirmBody}
            </p>
          </div>
        ) : (
          <form action={submitCoachingOnboarding} className="space-y-8 rounded-2xl p-6 md:p-8" style={{ background: '#FFFFFF', border: '1px solid rgba(200,220,192,0.45)', marginTop: '3rem' }}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="lang" value={lang} />

            <Section title={t.personalTitle}>
              <div className="grid md:grid-cols-2 gap-4">
                <Field name="firstName" label={t.firstName} required />
                <Field name="lastName" label={t.lastName} required />
                <Field name="phone" label={t.phone} />
                <Field name="timezone" label={t.timezone} required />
              </div>
            </Section>

            <Section title={t.goalsTitle}>
              <div className="grid md:grid-cols-2 gap-4">
                <Field name="age" label={t.age} type="number" required />
                <Field name="height" label={t.height} required />
                <Field name="weight" label={t.weight} required />
                <Field name="targetWeight" label={t.targetWeight} />
              </div>
              <TextArea name="primaryGoal" label={t.primaryGoal} required />
              <TextArea name="whyNow" label={t.whyNow} required />
              <TextArea name="success" label={t.success} required />
            </Section>

            <Section title={t.healthTitle}>
              <TextArea name="medicalConditions" label={t.medicalConditions} />
              <TextArea name="medications" label={t.medications} />
              <TextArea name="injuries" label={t.injuries} />
              <TextArea name="eatingDisorderHistory" label={t.eatingDisorderHistory} />
              <div className="grid md:grid-cols-2 gap-4">
                <Field name="sleep" label={t.sleep} />
                <Field name="stress" label={t.stress} />
              </div>
            </Section>

            <Section title={t.nutritionTitle}>
              <TextArea name="currentEating" label={t.currentEating} required />
              <TextArea name="trackingExperience" label={t.trackingExperience} />
              <TextArea name="allergies" label={t.allergies} />
              <TextArea name="restrictions" label={t.restrictions} />
              <TextArea name="favoriteFoods" label={t.favoriteFoods} />
              <TextArea name="dislikedFoods" label={t.dislikedFoods} />
              <div className="grid md:grid-cols-3 gap-4">
                <Field name="eatingOut" label={t.eatingOut} />
                <Field name="water" label={t.water} />
                <Field name="caffeine" label={t.caffeine} />
              </div>
            </Section>

            <Section title={t.scheduleTitle}>
              <TextArea name="workSchedule" label={t.workSchedule} />
              <div className="grid md:grid-cols-2 gap-4">
                <SelectField
                  name="strengthTraining"
                  label={t.strengthTraining}
                  options={t.strengthTrainingOptions}
                />
                <Field name="steps" label={t.steps} />
              </div>
              <TextArea name="workouts" label={t.workouts} />
              <div className="grid md:grid-cols-2 gap-4">
                <SelectField
                  name="workoutDaysCommitment"
                  label={t.workoutDaysCommitment}
                  options={[{ value: '', label: t.selectPlaceholder }, ...t.workoutDaysOptions]}
                />
                <SelectField
                  name="workoutSessionLength"
                  label={t.workoutSessionLength}
                  options={[{ value: '', label: t.selectPlaceholder }, ...t.sessionLengthOptions]}
                />
              </div>
              <TextArea name="barriers" label={t.barriers} />
              <TextArea name="accountability" label={t.accountability} />
            </Section>

            <Section title={t.agreementsTitle}>
              <label className="flex gap-3 items-start" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>
                <input type="checkbox" name="notMedicalCare" required style={{ marginTop: '0.25rem' }} />
                {t.agreeMedical}
              </label>
              <label className="flex gap-3 items-start" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>
                <input type="checkbox" name="notPregnantBreastfeeding" required style={{ marginTop: '0.25rem' }} />
                {t.agreePregnant}
              </label>
              <label className="flex gap-3 items-start" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>
                <input type="checkbox" name="terms" required style={{ marginTop: '0.25rem' }} />
                {t.agreeTerms}
              </label>
            </Section>

            <button type="submit" className="btn-primary" style={{ borderRadius: '0.5rem', width: '100%', justifyContent: 'center', padding: '1rem 2rem' }}>
              {t.submit}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
