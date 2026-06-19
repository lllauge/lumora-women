-- ============================================================
-- LUMORA WOMEN — Exercise Library Schema v10
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  movement_pattern text not null default 'accessory',
    -- squat | hinge | lunge | push_horizontal | push_vertical |
    -- pull_horizontal | pull_vertical | core | carry | glute |
    -- mobility | cardio_steady | cardio_intervals | accessory
  primary_muscles text[] not null default '{}'::text[],
  equipment text not null default 'bodyweight',
    -- bodyweight | dumbbells | barbell | bands | kettlebell |
    -- cable | machine | treadmill | bike | rower | full_gym
  difficulty text not null default 'beginner',
    -- beginner | intermediate | advanced
  default_sets text not null default '3',
  default_reps text not null default '10',
  default_rest text not null default '60s',
  cues text not null default '',
  video_url text not null default '',
  female_recomp_priority int not null default 0,
    -- 0 = standard, 1 = good for glute/hormone/recomp emphasis,
    -- 2 = top-tier pick (compounds, hinge/squat/glute work)
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exercise_library_pattern
  on public.exercise_library(movement_pattern) where archived = false;
create index if not exists idx_exercise_library_equipment
  on public.exercise_library(equipment) where archived = false;

drop trigger if exists set_exercise_library_updated_at on public.exercise_library;
create trigger set_exercise_library_updated_at
  before update on public.exercise_library
  for each row execute function public.set_updated_at();

alter table public.exercise_library enable row level security;

drop policy if exists "Admins full access to exercise library" on public.exercise_library;
create policy "Admins full access to exercise library"
  on public.exercise_library for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Coaching clients can read exercise library" on public.exercise_library;
create policy "Coaching clients can read exercise library"
  on public.exercise_library for select
  using (
    archived = false
    and exists (
      select 1 from public.coaching_clients cc
      where cc.user_id = auth.uid()
    )
  );

-- ============================================================
-- Starter seed — evidence-based female recomp emphasis.
-- Only inserts if the library is empty.
-- ============================================================
do $$
begin
  if (select count(*) from public.exercise_library) = 0 then
    insert into public.exercise_library
      (name, movement_pattern, primary_muscles, equipment, difficulty, default_sets, default_reps, default_rest, cues, female_recomp_priority)
    values
      -- Hinge (glute/hamstring posterior chain — top recomp priority)
      ('Romanian Deadlift', 'hinge', '{hamstrings,glutes,erectors}', 'dumbbells', 'beginner', '3', '10', '90s',
        'Soft knees, push hips back, feel a stretch in the hamstrings before standing up. Bar/dumbbells stay close to legs.', 2),
      ('Hip Thrust', 'hinge', '{glutes,hamstrings}', 'dumbbells', 'beginner', '3', '12', '75s',
        'Shoulders on bench, chin tucked, drive through heels, squeeze glutes hard at the top, ribs down.', 2),
      ('Glute Bridge', 'glute', '{glutes,hamstrings}', 'bodyweight', 'beginner', '3', '15', '45s',
        'Feet flat, drive through heels, lift hips until knees-hips-shoulders form a straight line. Squeeze 1 sec at top.', 2),
      ('Single-Leg RDL', 'hinge', '{hamstrings,glutes,core}', 'dumbbells', 'intermediate', '3', '8', '60s',
        'Hinge from the hip of the standing leg, back leg drives straight back, shoulders square. Light weight first — balance matters.', 1),
      ('Cable Pull-Through', 'hinge', '{glutes,hamstrings}', 'cable', 'beginner', '3', '12', '60s',
        'Face away from cable, rope between legs, hinge back, drive hips forward to stand. Glute squeeze at top, not lower back.', 1),

      -- Squat
      ('Goblet Squat', 'squat', '{quads,glutes,core}', 'dumbbells', 'beginner', '3', '10', '75s',
        'Hold dumbbell at chest, feet shoulder-width, sit between hips, knees track over toes, chest tall.', 2),
      ('Bulgarian Split Squat', 'squat', '{quads,glutes}', 'dumbbells', 'intermediate', '3', '8', '75s',
        'Rear foot on bench, front knee tracks over toe, drop straight down. Drive through front heel to stand.', 2),
      ('Front-Foot-Elevated Reverse Lunge', 'lunge', '{quads,glutes}', 'dumbbells', 'beginner', '3', '10', '60s',
        'Front foot on small plate, step back into lunge, knee softly to floor, drive through front heel.', 1),
      ('Step-Up', 'lunge', '{quads,glutes}', 'dumbbells', 'beginner', '3', '10', '60s',
        'Full foot on box, push through the heel of the working leg, no pushing off the floor with the back leg.', 1),

      -- Horizontal push
      ('Push-Up', 'push_horizontal', '{chest,triceps,shoulders,core}', 'bodyweight', 'beginner', '3', '8', '60s',
        'Plank position, elbows ~45° from body, lower chest to floor under control. Knees down if needed.', 1),
      ('Dumbbell Bench Press', 'push_horizontal', '{chest,triceps,shoulders}', 'dumbbells', 'beginner', '3', '10', '75s',
        'Wrists stacked over elbows, lower to mid-chest, press up and slightly together at the top.', 1),
      ('Incline Dumbbell Press', 'push_horizontal', '{chest,shoulders,triceps}', 'dumbbells', 'beginner', '3', '10', '75s',
        '30–45° incline, scapulae pinned to the bench, control the descent.', 0),

      -- Vertical push
      ('Dumbbell Shoulder Press', 'push_vertical', '{shoulders,triceps}', 'dumbbells', 'beginner', '3', '10', '75s',
        'Seated or standing, ribs down, press overhead without flaring lower back.', 1),

      -- Horizontal pull
      ('Single-Arm Dumbbell Row', 'pull_horizontal', '{back,biceps}', 'dumbbells', 'beginner', '3', '10', '60s',
        'Flat back, drive the elbow toward your hip, lead with the elbow not the hand. Squeeze the shoulder blade.', 1),
      ('Chest-Supported Row', 'pull_horizontal', '{back,biceps}', 'dumbbells', 'beginner', '3', '10', '75s',
        'Lay chest on incline bench, row dumbbells to hips, full shoulder blade retraction at the top.', 1),
      ('Inverted Row', 'pull_horizontal', '{back,biceps,core}', 'bodyweight', 'intermediate', '3', '8', '60s',
        'Bar at hip height, body straight as a plank, pull chest to bar.', 1),

      -- Vertical pull
      ('Lat Pulldown', 'pull_vertical', '{lats,biceps}', 'cable', 'beginner', '3', '10', '75s',
        'Slight backward lean, pull the bar to the upper chest, elbows drive down and back.', 1),
      ('Assisted Pull-Up', 'pull_vertical', '{lats,biceps,core}', 'machine', 'intermediate', '3', '6', '90s',
        'Full hang, pull until chin clears the bar, control the descent. Band or assist machine to start.', 1),

      -- Core
      ('Dead Bug', 'core', '{core}', 'bodyweight', 'beginner', '3', '8', '45s',
        'Low back pressed to floor the whole time, slowly lower opposite arm + leg.', 1),
      ('Plank', 'core', '{core,shoulders}', 'bodyweight', 'beginner', '3', '30 sec', '45s',
        'Straight line from heels to head, ribs down, squeeze glutes. Quality over time.', 1),
      ('Pallof Press', 'core', '{core,obliques}', 'cable', 'beginner', '3', '10', '45s',
        'Resist rotation: press cable straight out from chest, hold 2 sec, return. Hips stay square.', 1),
      ('Hanging Knee Raise', 'core', '{core,hip flexors}', 'bodyweight', 'intermediate', '3', '8', '60s',
        'Hang from bar, knees up to chest, no swinging — control on the way down.', 0),

      -- Carry
      ('Farmer Carry', 'carry', '{grip,core,traps,glutes}', 'dumbbells', 'beginner', '3', '40 yds', '60s',
        'Walk tall, shoulders packed, ribs down. Heavy is the point — grip and core do the work.', 1),

      -- Mobility / warm-up
      ('90/90 Hip Switches', 'mobility', '{hips}', 'bodyweight', 'beginner', '2', '8 each side', '30s',
        'Sit tall, alternate sides slowly. Use for warm-up — opens hip rotation before squats/hinges.', 1),
      ('Cat-Cow', 'mobility', '{spine,core}', 'bodyweight', 'beginner', '1', '8', '0',
        'Spine articulation warm-up — slow, breath-paced.', 0),
      ('World''s Greatest Stretch', 'mobility', '{hips,t-spine,hamstrings}', 'bodyweight', 'beginner', '1', '5 each side', '0',
        'Lunge, hand inside front foot, rotate top arm to ceiling. Best full-body warm-up.', 1),

      -- Cardio
      ('Incline Walk', 'cardio_steady', '{full body}', 'treadmill', 'beginner', '1', '20–30 min', '0',
        'Zone 2 — speak in short sentences but not full conversation. 8–12% incline, 3.0–3.5 mph as a starting range.', 2),
      ('Outdoor Walk', 'cardio_steady', '{full body}', 'bodyweight', 'beginner', '1', '30–45 min', '0',
        'Brisk pace, after a meal if possible — improves glucose handling.', 2),
      ('Stationary Bike (Zone 2)', 'cardio_steady', '{legs,heart}', 'bike', 'beginner', '1', '25 min', '0',
        'Nose-breathing pace. Should feel sustainable, not gasping.', 1),
      ('Rower Intervals', 'cardio_intervals', '{full body}', 'rower', 'intermediate', '6', '1 min on / 1 min easy', '0',
        'Hard but not max — last interval should still have good form. Drive with legs, not arms.', 1);
  end if;
end $$;
