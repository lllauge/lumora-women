/**
 * Lesson guide content for "The Lumora Postpartum Reset".
 * Rewritten from Laura's original Teachable course ("The Ultimate 6 Week
 * Postpartum Guide"): same additive-habit bones, updated to current
 * evidence (see docs/course-extraction/evidence-review.md) and Lumora voice.
 *
 * Workout programming is built from the postpartum rehab literature:
 * - IJSPT phased return-to-sport timeline (Selman et al. 2022)
 * - PFMT dosage trials (3×8 max contractions, 6s hold/6s rest, ≥3 months)
 * - Diastasis recti trials (TA activation, bridges, bird dog, side planks)
 * - Full-body functional patterns: squat, hinge, step, push, pull, carry
 *
 * Copy style rule: no em/en dashes as sentence punctuation. Hyphens inside
 * compound words and numeric ranges (8–10 reps) are fine.
 */
import {
  medallion, gate, tracker, dayTable, cupsRow,
  foundationFive, DAILY_DOSE, SYMPTOM_RULE, LEAF_DIVIDER,
} from './helpers.mjs'

const REST_NOTE = `<p style="font-size:13.5px; color:#5A6B58;">Rest 60–90 seconds between sets. Leave at least one day between workouts. Finish every session with a <strong>5–10 minute walk</strong> or other gentle cardio you enjoy.</p>`

function finisher(text) {
  return `<div class="note"><p><strong>Finisher:</strong> ${text}</p></div>`
}

const ARM_FINISHER = `<div class="note"><p><strong>Optional arm finisher</strong> (if you have time and energy left): bicep curls + overhead tricep extensions, 2 × 12 each. Nice to have. The main work above is what changes your body.</p></div>`

// ─────────────────────────────────────────────────────────────────────────────
export const LESSON_GUIDES = [

  // ── 1 · WELCOME ────────────────────────────────────────────────────────────
  {
    slug: '01-welcome',
    title: 'Welcome to Your Reset',
    sub: 'A six-week return to strength and nourishment, built for the season you are actually in.',
    body: `
<p>You just did one of the most physically demanding things a body can do. And now you're holding a newborn, maybe chasing a toddler, maybe back at work, and being told to "bounce back."</p>
<p>We're not going to do that here.</p>
<p>The Lumora Postpartum Reset is a six-week program that rebuilds from the inside out: your deep core and pelvic floor first, your strength second, and your energy throughout, powered by <strong>adding</strong> nourishing food, never by restriction. Small, doable habits, repeated until they feel like yours.</p>

<div class="card tint">
  <h3 style="margin-top:0;">How the program works</h3>
  <ul>
    <li><strong>Nourish</strong>: three food phases. Each one adds a small daily habit. You move on only when the habit sticks, so nothing falls apart on a hard week.</li>
    <li><strong>Rebuild</strong>: six weeks of strength training, three short sessions a week, at home or at the gym. Every session starts with five minutes of deep-core and pelvic-floor work.</li>
    <li><strong>The Library</strong>: form cues and videos for every exercise, so you're never guessing.</li>
  </ul>
</div>

<div class="label">Honest expectations</div>
<h2>What six weeks can really do</h2>
<p>Programs built on consistent strength work plus steady habits are what the research actually supports for postpartum women: better core function, fewer pelvic-floor symptoms, more energy, and, if weight loss is one of your goals, a sustainable <strong>½–1 pound per week</strong>.</p>
<p>If you're breastfeeding, that gentle pace is a feature, not a flaw: it's the rate that protects your milk supply. You will likely need <strong>at least 1,800 calories a day</strong> while nursing. This program will never ask you to eat less than your body needs.</p>

<div class="safety">
  <p><strong>Before you start, two ground rules:</strong></p>
  <ul>
    <li>Wait until your physician or midwife has cleared you for exercise (typically around your six-week visit; often later after a cesarean or complications).</li>
    <li>If you're nursing, hold off on any intentional weight loss until around 8 weeks, when your supply is established. You can absolutely start the food phases and gentle movement before then.</li>
  </ul>
</div>

<div class="card sand">
  <h3 style="margin-top:0;">What you'll need</h3>
  <ul style="margin-bottom:0;">
    <li>A pair or two of dumbbells (a light and a medium set is perfect)</li>
    <li>A sturdy step, stair, or low bench</li>
    <li>A water bottle you actually like</li>
    <li>About 30 minutes, three times a week</li>
  </ul>
</div>

<p>That's it. No detoxes, no cutting food groups, no jumping before your body is ready. Let's begin.</p>
${LEAF_DIVIDER}
<p style="text-align:center; font-size:14px; color:#5A6B58;">Start with <strong>Phase 1 · Build Your Base</strong>, and begin the strength plan whenever you're cleared.</p>
`,
  },

  // ── 2 · NOURISH PHASE 1 ───────────────────────────────────────────────────
  {
    slug: '02-nourish-phase-1',
    title: 'Phase 1 · Build Your Base',
    sub: 'Three small daily additions. No restriction, no counting. Just add.',
    body: `
<p>Phase 1 is deliberately simple, because the newborn season is not the time for complicated. For the next two weeks, you'll add three foods to what you already eat, every day. That's the whole assignment.</p>
<p>Each one earns its place: these foods carry the fiber, iron, healthy fats, and antioxidants your body leans on for tissue repair, steady energy, and, if you're nursing, milk production.</p>

${medallion('1A', 'Daily add № 1', 'A half-cup of berries')}
<div class="card">
  <p><strong>Add ½–1 cup of berries to your day.</strong> Blueberries and blackberries are lovely; any berry counts, and frozen is just as good (often better value).</p>
  <p>Stir them into:</p>
  <ul class="pill-list"><li>Yogurt</li><li>Smoothies</li><li>Oatmeal or overnight oats</li><li>On their own as a snack</li></ul>
  <p><strong>Why it matters now:</strong> vitamin C supports the collagen your body is using to heal, and the fiber keeps postpartum digestion moving (your pelvic floor will thank you).</p>
  <div class="note"><p>Eat the fruit, skip the juice. Juice drops the fiber and spikes quickly. <strong>Swaps:</strong> raspberries, strawberries, cherries, grapes, goji berries.</p></div>
</div>

${medallion('1B', 'Daily add № 2', 'A big handful of leafy greens')}
<div class="card">
  <p><strong>Add 1–2 cups of dark leafy greens daily</strong>: spinach, kale, or arugula.</p>
  <p>Slip them into:</p>
  <ul class="pill-list"><li>Salads</li><li>Sandwiches & wraps</li><li>Omelets</li><li>Smoothies (you won't taste spinach, promise)</li><li>Wilted into pasta or soup</li></ul>
  <p><strong>Why it matters now:</strong> greens bring folate, vitamin K, and iron, the exact stores that pregnancy and birth draw down hardest.</p>
  <div class="note"><p><strong>Swaps:</strong> bok choy, romaine, broccoli, chard, radish greens.</p></div>
</div>

${medallion('1C', 'Daily add № 3', 'A small handful of nuts or seeds')}
<div class="card">
  <p><strong>Add ¼ cup of nuts, or 1–2 tablespoons of nut or seed butter, daily.</strong> Any nut you enjoy. Just keep them unsalted and un-candied most days.</p>
  <ul class="pill-list"><li>On yogurt or oatmeal</li><li>Over salads</li><li>Straight from the jar at 3 pm</li><li>Almond butter on apple slices</li></ul>
  <p><strong>Why it matters now:</strong> healthy fats, vitamin E, and magnesium give you steady, slow-burning energy for broken-sleep days, and the building blocks for your hormones.</p>
  <div class="note"><p><strong>Swaps:</strong> flax, chia, or hemp seeds · avocado · 1 tbsp almond butter.</p></div>
</div>

${LEAF_DIVIDER}
<h2>Your only job: fourteen days</h2>
<p>Tick a box each day all three adds happen. Miss a day? Nothing is ruined. Just don't start the next phase until you've strung together two solid weeks. The habit is the result.</p>
${tracker(14)}
${gate('<strong>Stay here until all three adds have been part of your day for at least two weeks.</strong> Consistency first, then we build on it.')}
`,
  },

  // ── 3 · NOURISH PHASE 2 ───────────────────────────────────────────────────
  {
    slug: '03-nourish-phase-2',
    title: 'Phase 2 · Power Up Your Plate',
    sub: 'Keep everything from Phase 1. Now we add the recovery heavyweights: omega-3s, protein, and whole grains.',
    body: `
<p>Phase 1 is running on autopilot? Beautiful. Phase 2 adds the three nutrients that do the heaviest lifting in postpartum recovery. If you're nursing, they are also the ones your baby is drawing from you daily.</p>

${medallion('2A', 'Daily add № 4', 'A spoonful of omega-3 seeds')}
<div class="card">
  <p><strong>Add 1–3 tablespoons of chia, hemp, or ground flax seeds daily.</strong></p>
  <ul class="pill-list"><li>Yogurt</li><li>Smoothies</li><li>Oatmeal</li><li>Soups & salads</li><li>Chia pudding</li></ul>
  <p><strong>Why it matters now:</strong> these seeds carry plant omega-3s plus minerals that support mood and hormone balance in the postpartum window.</p>
  <div class="note"><p><strong>If you're nursing:</strong> your baby's brain is built partly from the DHA in your milk. Seeds help, but the richest sources are fatty fish. Aim for <strong>salmon or sardines twice a week</strong>, or ask your provider about a 200–300&nbsp;mg DHA supplement.</p></div>
</div>

${medallion('2B', 'Daily add № 5', 'A palm of protein, at every meal')}
<div class="card">
  <p><strong>Add a palm-sized portion of protein to each meal</strong> (not just once a day; your muscles and healing tissues are asking all day long).</p>
  <ul class="pill-list"><li>Whole eggs</li><li>Chicken</li><li>Salmon & white fish</li><li>Greek yogurt</li><li>Cottage cheese</li><li>Tofu & tempeh</li><li>Lentils & chickpeas</li><li>Beans</li><li>Shrimp</li><li>Lean beef</li></ul>
  <p><strong>Why it matters now:</strong> protein is the raw material of recovery, and it's what makes the strength plan actually build strength. Rough target: <strong>1.3–1.8&nbsp;g per kg of body weight per day</strong>, which for most women simply means "a palm at every meal, plus a protein-ish snack."</p>
  <div class="note"><p>Notice we say <strong>whole eggs</strong>, not egg whites. The yolk holds the choline (you need ~550&nbsp;mg/day while nursing) and most of the vitamins. And full-fat yogurt is welcome here: fat is a nutrient, not a villain.</p></div>
</div>

${medallion('2C', 'Daily add № 6', 'Whole grains that hold you over')}
<div class="card">
  <p><strong>Add ½–1 cup of whole grains to your meals.</strong></p>
  <ul class="pill-list"><li>Oats</li><li>Quinoa</li><li>Brown rice</li><li>Whole-wheat bread</li><li>Farro</li><li>Bulgur</li><li>Buckwheat</li><li>Millet</li></ul>
  <p><strong>Why it matters now:</strong> steady carbohydrates are your energy floor. They keep blood sugar (and mood) from crashing mid-afternoon, feed your workouts, and support milk supply. Cutting carbs while nursing is one of the fastest ways to tank both energy and supply.</p>
</div>

${LEAF_DIVIDER}
<h2>Three weeks, then Phase 3</h2>
<p>You're now carrying six small habits. Give them three weeks to settle in. That's long enough for this to stop feeling like a program and start feeling like how you eat.</p>
${gate('<strong>Stay here until the Phase 1 + Phase 2 adds have been daily habits for at least three weeks.</strong> Then Phase 3 is the easiest one of all.')}
`,
  },

  // ── 4 · NOURISH PHASE 3 ───────────────────────────────────────────────────
  {
    slug: '04-nourish-phase-3',
    title: 'Phase 3 · Hydrate & Sustain',
    sub: 'The simplest phase, and the one most women are furthest from.',
    body: `
<p>Water is unglamorous, so it gets skipped. But mild dehydration reads as fatigue, headaches, brain fog, and cranky digestion, which is everything the newborn season already serves you for free. And if you're nursing, roughly 87% of what you make every day is water.</p>

<h2>Your targets</h2>
<div class="grid-2">
  <div class="card">
    <h3 style="margin-top:0;">Not nursing</h3>
    ${cupsRow(9, 9, 'About 9 cups (2.2 L) of fluids a day')}
  </div>
  <div class="card">
    <h3 style="margin-top:0;">Nursing</h3>
    ${cupsRow(13, 13, 'About 13 cups (3.1 L) of fluids a day')}
  </div>
</div>
<p style="font-size:13.5px; color:#5A6B58;">"Fluids" counts everything: water, milk, soup, herbal tea. Don't force chugging; build the habit and let thirst do the fine-tuning. Easiest self-check: your urine should run <strong>pale yellow</strong>.</p>

<h2>Make it automatic, not heroic</h2>
<div class="card tint">
  <ul style="margin:0 0 0 22px;">
    <li><strong>Anchor it to the baby:</strong> every time you sit down to nurse or give a bottle, you drink too. Feeds per day ≈ glasses per day. Done.</li>
    <li><strong>Station bottles</strong> where life happens: nursing chair, kitchen counter, stroller, car.</li>
    <li><strong>Start with two:</strong> if you're currently at nearly nothing, begin with two cups a day and add one cup every few days. Ramp, don't leap.</li>
    <li><strong>Make it nice:</strong> lemon, cucumber, mint, fizzy water. Flavor counts.</li>
  </ul>
</div>

<div class="note"><p><strong>Caffeine:</strong> you don't have to give up coffee. Up to ~300&nbsp;mg a day (about two mugs) is considered fine while nursing. Just don't let coffee <em>replace</em> water.</p></div>

${LEAF_DIVIDER}
<h2>Sustaining all three phases</h2>
<p>Here's the quiet magic of what you've built: berries + greens + nuts + seeds + a palm of protein + whole grains + water <em>is</em> a complete template. Look at your plate: half colorful plants, a palm of protein, a fist of whole grains, a thumb of healthy fat, water beside it. That's the Lumora plate, no tracking app required.</p>
${gate('<strong>This phase never ends.</strong> It just becomes how you live. Repeat any phase any time life knocks a habit loose (travel, teething, growth spurts; it happens to everyone).')}
`,
  },

  // ── 5 · BEFORE YOU BEGIN ──────────────────────────────────────────────────
  {
    slug: '05-before-you-begin',
    title: 'Before You Begin',
    sub: 'Five minutes of reading that makes the next six weeks safer and far more effective.',
    body: `
<h2>First: are you cleared?</h2>
<p>This plan assumes your physician or midwife has cleared you for exercise, typically at the six-week visit, and often 8–10+ weeks after a cesarean or a complicated delivery. Gentle walking, the breathing work, and the Daily Dose below are appropriate almost immediately for most women, but the strength plan waits for clearance. When in doubt, ask; it's one question at one appointment.</p>

${SYMPTOM_RULE}

<h2>Check in with your core: the 30-second diastasis self-check</h2>
<div class="card">
  <ol>
    <li>Lie on your back, knees bent, feet flat.</li>
    <li>Place two fingers just above your belly button, fingertips pointing down toward your spine.</li>
    <li>Exhale and lift just your head and shoulders slightly off the floor.</li>
    <li>Feel for a gap between the two ridges of muscle. Note how many fingers wide, and whether your fingers sink deep or meet gentle tension.</li>
  </ol>
  <p style="margin-bottom:0;">A gap of 1–2 fingers with some tension is common and workable. This program is exactly the rehab for it. A gap of 3+ fingers, a belly that "domes" into a ridge when you sit up, or fingers that sink with no resistance? Start the program gently <em>and</em> book a pelvic-floor physical therapist. It's the single best investment in this entire journey.</p>
</div>

<h2>The two non-negotiables</h2>
<p>The strongest evidence in all of postpartum exercise science backs two dull-sounding, quietly life-changing practices. One happens daily, one starts every workout.</p>
${DAILY_DOSE}
<p>Retraining the pelvic floor in the first postpartum year cuts the odds of leaking by about a third and of prolapse by roughly half, but only if it actually happens daily. Attach it to something you already do.</p>
${foundationFive('lying on your back')}
<p style="font-size:13.5px; color:#5A6B58;">The deep-core hold position progresses as you do: lying down in Weeks 1–2, hands-and-knees in Weeks 3–4, standing in Weeks 5–6. Each guide tells you which.</p>

<h2>How the six weeks are shaped</h2>
<div class="card tint">
  <ul style="margin:0 0 0 22px;">
    <li><strong>Every workout is full-body</strong> and built from the movements motherhood actually demands: squat (getting up with a baby), hinge (lifting the car seat), step (stairs), push and pull (strollers, doors, carrying everything), and loaded carries, because you carry constantly.</li>
    <li><strong>Weeks 1–2 · Reconnect & Foundation</strong>: bodyweight and light dumbbells, positions that protect your healing midline, zero impact.</li>
    <li><strong>Weeks 3–4 · Build & Strengthen</strong>: heavier dumbbells, 8–12 reps, single-leg work for balance and bone-deep stability.</li>
    <li><strong>Weeks 5–6 · Progress & Thrive</strong>: peak volume, a taste of power, plus <em>optional</em> impact and jog intervals, only after the readiness check in Week 5.</li>
  </ul>
</div>
<p><strong>Choosing weights:</strong> the last two reps of a set should feel genuinely hard while your form stays clean. If you could chat through it, go heavier next set. If your form breaks, go lighter. That's the entire science of progression.</p>
<p><strong>Missed a workout?</strong> Shift the week, don't cram. Two good sessions beat three rushed ones. And if the baby didn't sleep, halve the sets and call it a win. Showing up tired counts double.</p>
`,
  },

  // ── 6 · WEEK 1 ────────────────────────────────────────────────────────────
  {
    slug: '06-week-1',
    title: 'Week 1 · Reconnect',
    sub: 'Bodyweight, control, and reconnection. This week is a conversation with your body, not a test.',
    body: `
<p>Goal this week: groove the movement patterns, find your breath under load, and finish each session feeling <em>better</em> than you started. Bodyweight or the lightest dumbbells only. Week 3 is where we chase heavy.</p>
<div class="note"><p><strong>Every day this week:</strong> the Daily Dose (pelvic floor 3 × 8 plus quick flicks, and a walk, even if it's just 10 minutes).</p></div>
${foundationFive('lying on your back')}
${dayTable('Day 1 · Lower & Core', [
  ['Sit-to-stand squat (to a chair)', 3, '8'],
  ['Glute bridge with 5-second hold', 3, '8'],
  ['Clamshells', 3, '10 / side'],
  ['Calf raises (both feet)', 3, '12'],
])}
${dayTable('Day 2 · Upper & Core', [
  ['Wall push-up', 3, '10'],
  ['Supported single-arm dumbbell row', 3, '10 / side'],
  ['Standing hip abduction (hold a counter)', 3, '10 / side'],
  ['Side-lying open book', 2, '8 / side'],
])}
${dayTable('Day 3 · Full Body', [
  ['Step-up (low step or bottom stair)', 3, '8 / side'],
  ['Donkey kicks', 3, '10 / side'],
  ['Dead bug (arms only)', 3, '8 / side'],
  ['Standing march (slow, tall)', 3, '30 sec'],
])}
${REST_NOTE}
${finisher('a 5–10 minute easy walk. Outside with the stroller absolutely counts.')}
${SYMPTOM_RULE}
<div class="note"><p><strong>Nutrition this week:</strong> you should be in <strong>Phase 1</strong>: berries, greens, nuts, every day. That's the whole food assignment while your body adjusts to training.</p></div>
`,
  },

  // ── 7 · WEEK 2 ────────────────────────────────────────────────────────────
  {
    slug: '07-week-2',
    title: 'Week 2 · Foundation',
    sub: 'Light dumbbells join in, and you meet the hinge: the movement behind every car-seat lift.',
    body: `
<p>Same calm pace, slightly more to hold onto. This week introduces the <strong>Romanian deadlift</strong>: hips back, flat spine, feel the back of your legs. It's how your body wants to pick things up, babies included.</p>
<div class="note"><p><strong>Every day:</strong> the Daily Dose. It works on repetition. This is the habit that pays out for decades.</p></div>
${foundationFive('lying on your back')}
${dayTable('Day 1 · Lower & Core', [
  ['Goblet squat to a chair (light dumbbell)', 3, '10'],
  ['Glute bridge', 4, '10'],
  ['Side-lying hip abduction', 3, '12 / side'],
  ['Calf raises', 3, '15'],
])}
${dayTable('Day 2 · Upper & Core', [
  ['Incline or knee push-up', 3, '8'],
  ['Bent-over dumbbell row', 3, '10'],
  ['Seated overhead press (light)', 3, '10'],
  ['Bird dog with 3-second pause', 3, '8 / side'],
])}
${dayTable('Day 3 · Full Body & Carry', [
  ['Romanian deadlift (light dumbbells)', 3, '10'],
  ['Step-up', 3, '10 / side'],
  ['Suitcase carry (one dumbbell, walk tall)', 3, '30 steps / side'],
  ['Dead bug (opposite arm & leg)', 3, '8 / side'],
])}
${REST_NOTE}
${finisher('5–10 minutes of brisk walking or cycling.')}
<div class="note"><p><strong>Suitcase carry cue:</strong> one dumbbell at your side, ribs stacked over hips, no leaning. It quietly trains the exact core control that protects your back all day. If you feel doming or pelvic heaviness, go lighter.</p></div>
<div class="note"><p><strong>Nutrition:</strong> finishing your second consistent week of <strong>Phase 1</strong>? You've earned <strong>Phase 2</strong>. Start it alongside Week 3.</p></div>
`,
  },

  // ── 8 · WEEK 3 ────────────────────────────────────────────────────────────
  {
    slug: '08-week-3',
    title: 'Week 3 · Build',
    sub: 'Heavier dumbbells, single-leg work, and your deep core moves to hands-and-knees.',
    body: `
<p>Now we build. Four sets on the big movements, weights that make the last reps honest, and your first single-leg strength work: the balance and hip stability that carrying a baby on one hip demands daily.</p>
<div class="note"><p><strong>Deep-core holds move to hands-and-knees this week</strong> (in the Foundation Five below). Gravity makes your core work harder for the same gentle draw-in.</p></div>
${foundationFive('on hands and knees')}
${dayTable('Day 1 · Lower & Core', [
  ['Goblet squat', 4, '10'],
  ['Reverse lunge', 3, '8 / side'],
  ['Single-leg glute bridge', 3, '8 / side'],
  ['Single-leg calf raises (hold support)', 3, '10 / side'],
])}
${dayTable('Day 2 · Upper & Core', [
  ['Bent-over dumbbell row', 4, '10'],
  ['Push-up progression (incline → knees)', 3, '8–10'],
  ['Seated overhead press', 3, '10'],
  ['Side plank from knees', 3, '15–20 sec / side'],
])}
${dayTable('Day 3 · Full Body & Carry', [
  ['Romanian deadlift', 4, '10'],
  ['Lateral lunge', 3, '8 / side'],
  ['Farmer carry (both hands)', 3, '40 steps'],
  ['Bird dog crunch (elbow to knee, slow)', 3, '8 / side'],
])}
${REST_NOTE}
${finisher('5–10 minutes. Try intervals: 1 minute brisk, 1 minute easy.')}
${ARM_FINISHER}
<div class="note"><p><strong>Nutrition:</strong> begin <strong>Phase 2</strong> this week: seeds, a palm of protein at every meal, whole grains. The protein especially matters now that training is heavier.</p></div>
`,
  },

  // ── 9 · WEEK 4 ────────────────────────────────────────────────────────────
  {
    slug: '09-week-4',
    title: 'Week 4 · Strengthen',
    sub: 'The halfway mark. Heavier, more confident, visibly stronger.',
    body: `
<p>Same structure, heavier intent: 8–10 reps with weights that mean it. Somewhere this week, pause and notice: the dumbbells from Week 1 probably feel like decorations now.</p>
${foundationFive('on hands and knees')}
${dayTable('Day 1 · Lower & Core', [
  ['Goblet squat (heavier)', 4, '8–10'],
  ['Step-up (higher step or add dumbbells)', 4, '8 / side'],
  ['Single-leg Romanian deadlift (supported)', 3, '8 / side'],
  ['Single-leg calf raises', 3, '12 / side'],
])}
${dayTable('Day 2 · Upper & Core', [
  ['Bent-over dumbbell row (heavier)', 4, '8–10'],
  ['Push-up progression', 4, '8'],
  ['Seated overhead press', 4, '8–10'],
  ['Side plank (knees or full)', 3, '20–30 sec / side'],
])}
${dayTable('Day 3 · Full Body & Carry', [
  ['Romanian deadlift (heavier)', 4, '8–10'],
  ['Walking lunge', 3, '10 / side'],
  ['Suitcase carry (heavier)', 3, '40 steps / side'],
  ['Dead bug holding one light dumbbell', 3, '10 / side'],
])}
${REST_NOTE}
${finisher('5–10 minutes of any cardio you look forward to.')}
${ARM_FINISHER}
<div class="note"><p><strong>Feeding-posture bonus:</strong> all those rows and presses are quietly fixing the rounded "nursing hunch." Stand tall this week and feel the difference between your shoulder blades.</p></div>
<div class="note"><p><strong>Nutrition:</strong> continue <strong>Phase 2</strong>. You're roughly a week and a half in. Consistency over perfection.</p></div>
`,
  },

  // ── 10 · WEEK 5 ───────────────────────────────────────────────────────────
  {
    slug: '10-week-5',
    title: 'Week 5 · Progress',
    sub: 'Peak strength, a taste of power, and, if your body says yes, the first impact.',
    body: `
<p>Two things happen this week: your deep-core work moves to standing (the hardest position), and impact becomes <em>available</em>: optional, earned, and only after the readiness check below. Plenty of strong women skip impact entirely this round and repeat the program with it next time. Both paths are wins.</p>

<div class="card dark">
  <h3 style="margin-top:0;">The impact-readiness check</h3>
  <p>Borrowed from the return-to-running criteria physical therapists use. Attempt impact only if <strong>every</strong> line is true, with no leaking, heaviness, pain, or doming:</p>
  <ul>
    <li>You're at least 12 weeks postpartum</li>
    <li>No symptoms in any workout so far, or in the 48 hours after</li>
    <li>1 minute each, symptom-free: wall sit · plank (knees fine) · step-ups · bodyweight squats</li>
    <li>10 single-leg calf raises per side</li>
    <li>10 single-leg squats to a chair per side</li>
    <li>30 seconds of fast marching, then 10 small hops in place</li>
  </ul>
  <p style="margin-bottom:0;">Any box unchecked? Use the low-impact swap (squat to calf raise). It builds the same power, and the box will check itself in time.</p>
</div>

${foundationFive('standing tall')}
${dayTable('Day 1 · Lower & Core', [
  ['Goblet squat (3 seconds down, drive up)', 4, '10'],
  ['Fast sit-to-stand (power without impact)', 3, '8'],
  ['Single-leg glute bridge', 4, '8 / side'],
  ['Optional: jump squats or squat to calf raise', 2, '8'],
])}
${dayTable('Day 2 · Upper & Core', [
  ['Bent-over dumbbell row', 4, '12'],
  ['Push-up progression', 4, '10'],
  ['Half-kneeling overhead press', 3, '10 / side'],
  ['Side plank with top-leg lift', 3, '8 / side'],
])}
${dayTable('Day 3 · Full Body & Carry', [
  ['Romanian deadlift', 4, '10'],
  ['Reverse lunge at a quicker tempo', 3, '10 / side'],
  ['Farmer carry (heavier)', 4, '40 steps'],
  ['Slow mountain climbers (hands on a bench)', 3, '10 / side'],
  ['Optional: jump squats or squat to calf raise', 2, '8'],
])}
${REST_NOTE}
${finisher('5–10 minutes; if you passed the check, you may swap 1–2 of those minutes for light jogging on a slight incline.')}
${SYMPTOM_RULE}
<div class="note"><p><strong>Nutrition:</strong> finishing <strong>Phase 2</strong>'s three weeks? <strong>Phase 3</strong> (hydration) starts now, and it matters double on training days.</p></div>
`,
  },

  // ── 11 · WEEK 6 ───────────────────────────────────────────────────────────
  {
    slug: '11-week-6',
    title: 'Week 6 · Thrive',
    sub: 'Your strongest week, and the bridge to everything after.',
    body: `
<p>Final week. Volume peaks, power sharpens, and you get to feel the full distance between the woman who started Week 1 and the one lifting today.</p>
${foundationFive('standing tall')}
${dayTable('Day 1 · Lower & Core', [
  ['Goblet squat (heaviest clean weight)', 5, '8'],
  ['Walking lunge', 4, '10 / side'],
  ['Single-leg Romanian deadlift', 3, '8 / side'],
  ['Optional: jump squats (check passed)', 3, '8'],
])}
${dayTable('Day 2 · Upper & Core', [
  ['Bent-over dumbbell row', 5, '10'],
  ['Push-up progression', 4, '10–12'],
  ['Seated or half-kneeling overhead press', 4, '10'],
  ['Side plank', 3, '30+ sec / side'],
])}
${dayTable('Day 3 · Full Body & Carry', [
  ['Romanian deadlift', 4, '10–12'],
  ['Step-up (dumbbells)', 4, '10 / side'],
  ['Suitcase carry', 4, '50 steps / side'],
  ['Bird dog crunch', 3, '10 / side'],
])}
${REST_NOTE}
${finisher('make the last one celebratory: 10 minutes, your favorite music. If impact is unlocked, try 4–5 rounds of 1-minute easy jog / 2-minute walk, slight incline.')}
${ARM_FINISHER}

${LEAF_DIVIDER}
<h2>What happens after Week 6</h2>
<div class="card tint">
  <ul style="margin:0 0 0 22px;">
    <li><strong>Run it again, heavier.</strong> The program is built to repeat: same structure, heavier dumbbells, full push-ups, impact unlocked if it wasn't before. Most women get 3–4 strong cycles out of it.</li>
    <li><strong>Want to run?</strong> Keep building the jog intervals: 1 min jog / 2 min walk, adding a minute of jogging each week as long as you stay symptom-free. That's the physical-therapy progression, and it works.</li>
    <li><strong>Keep the Daily Dose for at least three months total.</strong> Five minutes a day. It's core and pelvic-floor insurance for life.</li>
    <li><strong>The food phases are already yours.</strong> Berries to water: that's not a program anymore, it's how you eat.</li>
  </ul>
</div>
<p>You didn't bounce back. You built forward, stronger than before, on a foundation that will hold. We're proud to have been in your corner.</p>
<p style="font-family: 'Libre Baskerville', Georgia, serif; font-size:17px; color:#1A2818;">With love, Lumora</p>
`,
  },
]
