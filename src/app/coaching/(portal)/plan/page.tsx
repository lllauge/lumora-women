import type { Metadata } from 'next'
import { getPortalContext } from '@/lib/coaching-engagement'
import ClientPlanView from '@/components/coaching/ClientPlanView'

export const metadata: Metadata = {
  title: 'My Plan | Lumora Women Coaching',
}

export default async function CoachingPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; meal?: string; recipe?: string }>
}) {
  const { client, plan, individualPlanStyle, mealPlanStartDate } = await getPortalContext()
  const selected = await searchParams
  return (
    <ClientPlanView
      client={client}
      plan={plan}
      individualPlanStyle={individualPlanStyle}
      mealPlanStartDate={mealPlanStartDate}
      selectedDayIndex={Number(selected.day)}
      selectedMealIndex={Number(selected.meal)}
      selectedRecipeIndex={Number(selected.recipe)}
    />
  )
}
