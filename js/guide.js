/* The training guide — short, evidence-grounded chapters rendered in Plan → Guide.
   General information, not medical or individual coaching advice. */
'use strict';

const GUIDE = [
  {
    id: 'overload',
    icon: 'up',
    title: 'Progressive overload',
    blurb: 'The one rule that grows muscle',
    body: [
      'Muscle grows when you ask it to do slightly more than last time — more weight, more reps, or more sets. Without that, training maintains rather than builds. Everything else (exercise choice, splits, supplements) is detail on top of this.',
      'This app uses double progression: each exercise has a rep range like 6–12. Work at a fixed weight and add reps session to session. When you hit the top of the range on every working set, add a little weight (you’ll see a “ready to progress” chip when that happens) and build the reps back up.',
      'Progress is never a straight line. Adding one rep to one set is a win. If a lift stalls for 3–4 sessions, drop it ~10% and climb back — you usually pass the sticking point on the way through.',
    ],
    tips: ['Beat the “last time” line somewhere, most sessions.', 'When the chip says progress — add the small jump, not a big one.', 'Stalled for weeks? Drop 10% and rebuild.'],
  },
  {
    id: 'effort',
    icon: 'zap',
    title: 'Effort: reps in reserve',
    blurb: 'How hard each set should feel',
    body: [
      'Sets only build muscle when they’re taken close to failure. The practical dial is “reps in reserve” (RIR) — how many more reps you honestly could have done. Most working sets should end at 1–3 RIR: the last reps slow down noticeably, but your form doesn’t break.',
      'A set of 12 where you could have done 20 is a warm-up, whatever the app logs. Equally, grinding to absolute failure every set buries you in fatigue and wrecks the sets that follow — save 0 RIR for the last set of an exercise, occasionally.',
      'While marathon training, lean to the easier end (2–3 RIR) on lower-body work. Your legs are already earning their keep on the road.',
    ],
    tips: ['1–3 reps left in the tank on most sets.', 'The last 2–3 reps should visibly slow down.', 'Legs: stay further from failure during big running weeks.'],
  },
  {
    id: 'reps',
    icon: 'chart',
    title: 'Rep ranges',
    blurb: '3–6, 6–12, 12–20 — what they’re for',
    body: [
      'Muscle grows across a wide range — roughly 5 to 30 reps per set — provided sets get close to failure. Rep ranges are about practicality, not magic numbers.',
      'Low reps (3–6) are best for building maximal strength: heavy loads, long rests, big lifts. Moderate reps (6–12) are the hypertrophy workhorse: enough load to matter, enough reps to accumulate tension without a cardio component. High reps (12–20+) work beautifully for isolation moves, calves and delts, and machines where grinding heavy feels wrong.',
      'The templates mix all three on purpose: heavy compounds first while you’re fresh, moderate work in the middle, high-rep isolation to finish. If joints complain at one range, shift the exercise to a different one — the muscle won’t mind.',
    ],
    tips: ['3–6 = strength focus · 6–12 = muscle default · 12–20 = isolation & conditioning.', 'All ranges need to be close to failure to count.'],
  },
  {
    id: 'rest',
    icon: 'timer',
    title: 'Rest between sets',
    blurb: 'Why the timer defaults differ',
    body: [
      'Resting longer lets you lift more on the next set, and total work drives growth. The evidence favours ~2–3 minutes on big compound lifts (squat, deadlift, bench, rows, presses) and 60–90 seconds on isolation work, where recovery is quicker.',
      'The built-in routines now carry these rest times per exercise, and you can override any of them (routine editor, or the ⋯ menu mid-workout). Warm-up sets automatically use a short rest.',
      'Cutting rest to “feel the burn” mostly cuts the weight you can lift. If you’re short on time, trim a set — don’t trim the rest on your top sets.',
    ],
    tips: ['Compounds: 2–3 min. Isolation: 60–90 s.', 'Short on time? Fewer sets, not shorter rests.'],
  },
  {
    id: 'warmup',
    icon: 'flame',
    title: 'Warming up',
    blurb: 'Ramp sets: fast, not exhausting',
    body: [
      'Warm-ups prepare the movement, not just the muscle. Five minutes of easy cardio, then ramp the first big lift of the session: light and quick sets stepping up toward your working weight — for example around 40% × 8, 60% × 5, 80% × 2–3. Later exercises for the same muscles need one light set at most.',
      'The app can build this for you: in a workout, open an exercise’s ⋯ menu and choose “Add warm-up ramp” — it inserts warm-up sets (marked W) based on your working weight. Warm-up sets are excluded from your stats and PRs, so ramp freely.',
      'Warm-up reps should feel crisp and fast. If the ramp tires you, it’s too much volume — the goal is grease, not work.',
    ],
    tips: ['Ramp the first compound; later lifts barely need it.', 'Warm-ups are fast, never grinding.', 'Use ⋯ → Add warm-up ramp.'],
  },
  {
    id: 'volume',
    icon: 'calendar',
    title: 'Weekly volume & frequency',
    blurb: '10–20 sets, twice a week',
    body: [
      'Two findings dominate modern hypertrophy research: total weekly hard sets per muscle is the main growth dial, with roughly 10–20 sets a productive zone for most people (6–10 maintains); and hitting a muscle twice a week beats once at the same volume — which is why the recommended week uses full-body days rather than a one-muscle-a-day split.',
      'The Schedule tab now shows your weekly sets per muscle from your scheduled routines, against that 10–20 band. Use it when you edit routines — it answers “what did that change do to my week?” instantly.',
      'While marathon training, run volume counts as leg work. Quads, hamstrings, glutes and calves sitting below the band is correct in a big running block — chasing 16 sets of squats during 60 km weeks is how knees file complaints.',
    ],
    tips: ['10–20 weekly sets per muscle you care about; 6–10 maintains.', 'Each muscle ~2×/week.', 'Legs: the road already counts.'],
  },
  {
    id: 'concurrent',
    icon: 'run',
    title: 'Lifting through a marathon block',
    blurb: 'Strength and 42.2 km can be friends',
    body: [
      'Strength work makes runners better: it improves running economy and is one of the best-evidenced ways to reduce injury risk. The interference effect (lifting blunting endurance, or vice versa) is real but small — and manageable with scheduling.',
      'The rules of thumb: keep hard days hard and easy days easy. Put your heaviest leg work on or next to a quality-run day (the recommended week pairs lower-body lifting with Wednesday’s workout run), never in the 48 hours before your long run. If you lift and run the same day, run first when the run is the priority, and separate them by 6+ hours when you can.',
      'As the marathon nears: in peak weeks hold lifting steady — maintain, don’t chase PRs. In the taper, halve your lifting sets but keep the weights (intensity maintains strength; volume creates fatigue). Race week: no leg work at all, one light upper session early in the week if you’re itching.',
    ],
    tips: ['Hard days hard: heavy legs beside the quality run.', 'Nothing heavy for legs within ~48 h of the long run.', 'Taper: half the sets, same weights. Race week: no legs.'],
  },
  {
    id: 'recovery',
    icon: 'moon',
    title: 'Recovery basics',
    blurb: 'Where the growing actually happens',
    body: [
      'Training is the stimulus; growth happens between sessions. The big three: sleep (7–9 hours — the most powerful legal performance enhancer), protein (roughly 1.6–2.2 g per kg of bodyweight daily, spread across meals), and managing overall stress — a marathon block plus a muscle-gain push is already a lot of stress to recover from.',
      'Expect to gain muscle slowly while running big miles — maintaining strength and adding a little is a win during the block; the visible gaining phase fits better in base season and after the race.',
      'Every 6–8 weeks, or whenever joints ache and numbers stall, take an easy week: half the sets, same movements. You’ll come back stronger. This is general information, not medical advice — for pain, illness or nutrition specifics, see a professional.',
    ],
    tips: ['Sleep 7–9 h; protein ~1.6–2.2 g/kg/day.', 'During the block, maintaining strength = winning.', 'Deload every 6–8 weeks or when beaten up.'],
  },
];
