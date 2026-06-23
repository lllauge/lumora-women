-- ============================================================
-- Exercise Library Demo Video Links
-- ============================================================
-- Populates YouTube demo/search links for the starter exercise library.
-- These are safe defaults: Laura can replace any row with a specific
-- preferred YouTube video from Admin -> Exercise Library.

update public.exercise_library as exercise
set
  video_url = links.video_url,
  updated_at = now()
from (
  values
    ('Romanian Deadlift', 'https://www.youtube.com/results?search_query=Romanian+Deadlift+exercise+demo+proper+form'),
    ('Hip Thrust', 'https://www.youtube.com/results?search_query=Hip+Thrust+exercise+demo+proper+form'),
    ('Glute Bridge', 'https://www.youtube.com/results?search_query=Glute+Bridge+exercise+demo+proper+form'),
    ('Single-Leg RDL', 'https://www.youtube.com/results?search_query=Single+Leg+Romanian+Deadlift+exercise+demo+proper+form'),
    ('Cable Pull-Through', 'https://www.youtube.com/results?search_query=Cable+Pull+Through+exercise+demo+proper+form'),
    ('Goblet Squat', 'https://www.youtube.com/results?search_query=Goblet+Squat+exercise+demo+proper+form'),
    ('Bulgarian Split Squat', 'https://www.youtube.com/results?search_query=Bulgarian+Split+Squat+exercise+demo+proper+form'),
    ('Front-Foot-Elevated Reverse Lunge', 'https://www.youtube.com/results?search_query=Front+Foot+Elevated+Reverse+Lunge+exercise+demo+proper+form'),
    ('Step-Up', 'https://www.youtube.com/results?search_query=Dumbbell+Step+Up+exercise+demo+proper+form'),
    ('Push-Up', 'https://www.youtube.com/results?search_query=Push+Up+exercise+demo+proper+form'),
    ('Dumbbell Bench Press', 'https://www.youtube.com/results?search_query=Dumbbell+Bench+Press+exercise+demo+proper+form'),
    ('Incline Dumbbell Press', 'https://www.youtube.com/results?search_query=Incline+Dumbbell+Press+exercise+demo+proper+form'),
    ('Dumbbell Shoulder Press', 'https://www.youtube.com/results?search_query=Dumbbell+Shoulder+Press+exercise+demo+proper+form'),
    ('Single-Arm Dumbbell Row', 'https://www.youtube.com/results?search_query=Single+Arm+Dumbbell+Row+exercise+demo+proper+form'),
    ('Chest-Supported Row', 'https://www.youtube.com/results?search_query=Chest+Supported+Dumbbell+Row+exercise+demo+proper+form'),
    ('Inverted Row', 'https://www.youtube.com/results?search_query=Inverted+Row+exercise+demo+proper+form'),
    ('Lat Pulldown', 'https://www.youtube.com/results?search_query=Lat+Pulldown+exercise+demo+proper+form'),
    ('Assisted Pull-Up', 'https://www.youtube.com/results?search_query=Assisted+Pull+Up+exercise+demo+proper+form'),
    ('Dead Bug', 'https://www.youtube.com/results?search_query=Dead+Bug+exercise+demo+proper+form'),
    ('Plank', 'https://www.youtube.com/results?search_query=Plank+exercise+demo+proper+form'),
    ('Pallof Press', 'https://www.youtube.com/results?search_query=Pallof+Press+exercise+demo+proper+form'),
    ('Hanging Knee Raise', 'https://www.youtube.com/results?search_query=Hanging+Knee+Raise+exercise+demo+proper+form'),
    ('Farmer Carry', 'https://www.youtube.com/results?search_query=Farmer+Carry+exercise+demo+proper+form'),
    ('90/90 Hip Switches', 'https://www.youtube.com/results?search_query=90+90+Hip+Switches+mobility+demo+proper+form'),
    ('Cat-Cow', 'https://www.youtube.com/results?search_query=Cat+Cow+mobility+exercise+demo+proper+form'),
    ('World''s Greatest Stretch', 'https://www.youtube.com/results?search_query=World%27s+Greatest+Stretch+demo+proper+form'),
    ('Incline Walk', 'https://www.youtube.com/results?search_query=Treadmill+Incline+Walk+workout+demo+proper+form'),
    ('Outdoor Walk', 'https://www.youtube.com/results?search_query=Brisk+Outdoor+Walk+workout+proper+form'),
    ('Stationary Bike (Zone 2)', 'https://www.youtube.com/results?search_query=Stationary+Bike+Zone+2+workout+demo'),
    ('Rower Intervals', 'https://www.youtube.com/results?search_query=Rowing+Machine+Intervals+proper+form+demo')
) as links(name, video_url)
where exercise.name = links.name;
