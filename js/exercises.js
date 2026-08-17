/* Built-in exercise library.
   Row: [id, name, group, equipment, track, secondary muscles, form cue]
   track: 'wr' = weight × reps · 'bw' = reps (+ optional added weight) · 'time' = duration */
'use strict';

const EXDB = (() => {

  const rows = [
    /* ---------------- Chest ---------------- */
    ['bb-bench', 'Barbell Bench Press', 'chest', 'barbell', 'wr', ['triceps', 'front delts'], 'Shoulder blades pinned, feet planted; bar to mid-chest, press up and slightly back.'],
    ['bb-incline-bench', 'Incline Barbell Bench Press', 'chest', 'barbell', 'wr', ['front delts', 'triceps'], '30–45° bench; bar to upper chest, elbows ~45° from torso.'],
    ['db-bench', 'Dumbbell Bench Press', 'chest', 'dumbbell', 'wr', ['triceps', 'front delts'], 'Deep stretch at the bottom, press up and slightly in; don’t clang at the top.'],
    ['db-incline-bench', 'Incline Dumbbell Press', 'chest', 'dumbbell', 'wr', ['front delts', 'triceps'], '30° incline; lower to outer chest with forearms vertical.'],
    ['bb-decline-bench', 'Decline Bench Press', 'chest', 'barbell', 'wr', ['triceps'], 'Bar to lower chest; short controlled range, no bounce.'],
    ['machine-chest-press', 'Machine Chest Press', 'chest', 'machine', 'wr', ['triceps', 'front delts'], 'Handles at mid-chest height; full stretch without shoulders rolling forward.'],
    ['push-up', 'Push-Up', 'chest', 'bodyweight', 'bw', ['triceps', 'core'], 'Rigid plank line; chest to the floor, elbows ~45°.'],
    ['dip-chest', 'Chest Dip', 'chest', 'bodyweight', 'bw', ['triceps', 'front delts'], 'Lean forward with a slight elbow flare; deep stretch, stop before shoulder pinch.'],
    ['cable-fly', 'Cable Fly', 'chest', 'cable', 'wr', ['front delts'], 'Slight elbow bend held constant; hug arc, squeeze at the midline.'],
    ['cable-fly-low', 'Low-to-High Cable Fly', 'chest', 'cable', 'wr', ['front delts'], 'Cables low; sweep up to eye level, upper-chest bias.'],
    ['db-fly', 'Dumbbell Fly', 'chest', 'dumbbell', 'wr', ['front delts'], 'Wide arc, gentle stretch — go lighter than you think.'],
    ['pec-deck', 'Pec Deck', 'chest', 'machine', 'wr', [], 'Elbows just below shoulder height; pause the squeeze for a beat.'],

    /* ---------------- Back ---------------- */
    ['deadlift', 'Deadlift', 'back', 'barbell', 'wr', ['hamstrings', 'glutes', 'traps', 'core'], 'Bar over mid-foot, brace hard, push the floor away; hips and chest rise together.'],
    ['trapbar-deadlift', 'Trap Bar Deadlift', 'back', 'barbell', 'wr', ['quads', 'glutes', 'traps'], 'Neutral grip, more upright torso than conventional; drive through the whole foot.'],
    ['rack-pull', 'Rack Pull', 'back', 'barbell', 'wr', ['traps', 'glutes'], 'Pins around knee height; lock out with glutes, not lower-back hyperextension.'],
    ['pull-up', 'Pull-Up', 'back', 'bodyweight', 'bw', ['biceps', 'rear delts'], 'Dead hang to chin over bar; lead with the chest, no kipping.'],
    ['chin-up', 'Chin-Up', 'back', 'bodyweight', 'bw', ['biceps'], 'Underhand grip; pull elbows to your ribs, full hang each rep.'],
    ['lat-pulldown', 'Lat Pulldown', 'back', 'cable', 'wr', ['biceps', 'rear delts'], 'Slight lean back; pull the bar to your collarbone, elbows down and in.'],
    ['bb-row', 'Barbell Row', 'back', 'barbell', 'wr', ['lats', 'biceps', 'rear delts'], 'Hinge to ~45°; row to the lower ribs, keep the torso angle fixed.'],
    ['pendlay-row', 'Pendlay Row', 'back', 'barbell', 'wr', ['lats', 'biceps'], 'Torso parallel, bar from a dead stop on the floor each rep; explosive pull.'],
    ['db-row', 'One-Arm Dumbbell Row', 'back', 'dumbbell', 'wr', ['lats', 'biceps'], 'Per side. Hand and knee on bench; row to the hip, no torso twist.'],
    ['cable-row', 'Seated Cable Row', 'back', 'cable', 'wr', ['lats', 'biceps'], 'Chest tall; pull to the navel, let the shoulder blades glide forward on the return.'],
    ['tbar-row', 'T-Bar Row', 'back', 'barbell', 'wr', ['lats', 'biceps'], 'Chest up, hips back; squeeze the plates to your chest without heaving.'],
    ['cs-row', 'Chest-Supported Row', 'back', 'dumbbell', 'wr', ['lats', 'rear delts'], 'Chest glued to the incline bench — zero momentum, all back.'],
    ['machine-row', 'Machine Row', 'back', 'machine', 'wr', ['lats', 'biceps'], 'Drive elbows back, pause, slow return; don’t shrug into it.'],
    ['straight-arm-pd', 'Straight-Arm Pulldown', 'back', 'cable', 'wr', ['lats'], 'Arms nearly straight; sweep the bar to your thighs, feel the lats lengthen up top.'],
    ['inverted-row', 'Inverted Row', 'back', 'bodyweight', 'bw', ['biceps', 'core'], 'Rigid body line under a bar; chest to bar, lower with control.'],
    ['back-extension', 'Back Extension', 'back', 'bodyweight', 'bw', ['glutes', 'hamstrings'], 'Hinge at the hips over the pad; rise to a straight line, not hyperextension.'],
    ['bb-shrug', 'Barbell Shrug', 'back', 'barbell', 'wr', ['traps'], 'Straight up and down, pause at the top; no rolling.'],

    /* ---------------- Shoulders ---------------- */
    ['ohp', 'Overhead Press', 'shoulders', 'barbell', 'wr', ['triceps', 'upper chest', 'core'], 'Squeeze glutes, ribs down; press to lockout with the bar over mid-foot.'],
    ['db-shoulder-press', 'Seated Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'wr', ['triceps'], 'Start at ear height; press up and slightly in, don’t arch off the pad.'],
    ['arnold-press', 'Arnold Press', 'shoulders', 'dumbbell', 'wr', ['triceps'], 'Rotate palms from facing you to facing forward as you press.'],
    ['machine-shoulder-press', 'Machine Shoulder Press', 'shoulders', 'machine', 'wr', ['triceps'], 'Grips level with ears; smooth press, no locking out hard.'],
    ['lateral-raise', 'Dumbbell Lateral Raise', 'shoulders', 'dumbbell', 'wr', [], 'Lead with the elbows to shoulder height; tip the pinky slightly up, drift arms a touch forward.'],
    ['cable-lateral-raise', 'Cable Lateral Raise', 'shoulders', 'cable', 'wr', [], 'Per side. Cable behind the body; constant tension through the whole arc.'],
    ['front-raise', 'Front Raise', 'shoulders', 'dumbbell', 'wr', [], 'To eye level, one count down; no swinging from the hips.'],
    ['rear-delt-fly', 'Rear Delt Fly', 'shoulders', 'dumbbell', 'wr', ['upper back'], 'Hinge over; sweep wide with soft elbows, thumbs slightly down.'],
    ['reverse-pec-deck', 'Reverse Pec Deck', 'shoulders', 'machine', 'wr', ['upper back'], 'Arms just below shoulder height; open wide, pause, resist the return.'],
    ['face-pull', 'Face Pull', 'shoulders', 'cable', 'wr', ['rear delts', 'traps'], 'Rope to the bridge of your nose; finish with knuckles back, elbows high.'],
    ['upright-row', 'Upright Row', 'shoulders', 'barbell', 'wr', ['traps'], 'Wide-ish grip to lower-chest height; stop if the shoulders complain.'],
    ['landmine-press', 'Landmine Press', 'shoulders', 'barbell', 'wr', ['upper chest', 'triceps', 'core'], 'Per side. Half-kneeling; press up and forward along the bar’s arc.'],

    /* ---------------- Biceps ---------------- */
    ['bb-curl', 'Barbell Curl', 'biceps', 'barbell', 'wr', ['forearms'], 'Elbows pinned to your sides; full extension at the bottom, no hip swing.'],
    ['ez-curl', 'EZ-Bar Curl', 'biceps', 'barbell', 'wr', ['forearms'], 'Angled grip is easier on wrists; control the negative.'],
    ['db-curl', 'Dumbbell Curl', 'biceps', 'dumbbell', 'wr', ['forearms'], 'Supinate as you lift — pinky toward the ceiling at the top.'],
    ['hammer-curl', 'Hammer Curl', 'biceps', 'dumbbell', 'wr', ['brachialis', 'forearms'], 'Neutral grip throughout; strict elbows, slow lowering.'],
    ['incline-curl', 'Incline Dumbbell Curl', 'biceps', 'dumbbell', 'wr', [], '45–60° bench, arms hanging behind you; big stretch at the bottom.'],
    ['preacher-curl', 'Preacher Curl', 'biceps', 'machine', 'wr', [], 'Armpits over the pad; stop just short of full lockout at the bottom under load.'],
    ['cable-curl', 'Cable Curl', 'biceps', 'cable', 'wr', ['forearms'], 'Constant tension; step back a touch so there’s load at full extension.'],
    ['concentration-curl', 'Concentration Curl', 'biceps', 'dumbbell', 'wr', [], 'Per side. Elbow braced on inner thigh; slow squeeze, no shoulder drift.'],
    ['spider-curl', 'Spider Curl', 'biceps', 'dumbbell', 'wr', [], 'Chest on an incline bench, arms vertical; strict short arc.'],

    /* ---------------- Triceps ---------------- */
    ['cg-bench', 'Close-Grip Bench Press', 'triceps', 'barbell', 'wr', ['chest', 'front delts'], 'Hands just inside shoulder width; elbows tucked, bar to lower chest.'],
    ['skull-crusher', 'Skull Crusher', 'triceps', 'barbell', 'wr', [], 'Lower to the forehead or just behind; elbows still, forearms do the work.'],
    ['pushdown', 'Cable Pushdown', 'triceps', 'cable', 'wr', [], 'Elbows pinned; press to full lockout, let the bar rise only to chest height.'],
    ['rope-oh-ext', 'Overhead Rope Extension', 'triceps', 'cable', 'wr', [], 'Face away, arms overhead; deep stretch behind the head, extend fully.'],
    ['db-oh-ext', 'Dumbbell Overhead Extension', 'triceps', 'dumbbell', 'wr', [], 'Both hands under one bell; elbows close to your ears.'],
    ['dip-triceps', 'Triceps Dip', 'triceps', 'bodyweight', 'bw', ['chest', 'front delts'], 'Upright torso, elbows tracking back; full lockout at the top.'],
    ['bench-dip', 'Bench Dip', 'triceps', 'bodyweight', 'bw', ['front delts'], 'Hands on a bench behind you; hips close to the bench, shallow if shoulders niggle.'],
    ['kickback', 'Triceps Kickback', 'triceps', 'dumbbell', 'wr', [], 'Per side. Upper arm parallel to the floor and frozen; snap to lockout, pause.'],

    /* ---------------- Forearms & grip ---------------- */
    ['wrist-curl', 'Wrist Curl', 'forearms', 'dumbbell', 'wr', [], 'Forearms on a bench, palms up; curl through a full wrist range.'],
    ['rev-wrist-curl', 'Reverse Wrist Curl', 'forearms', 'dumbbell', 'wr', [], 'Palms down; lighter than wrist curls — extensors are small.'],
    ['reverse-curl', 'Reverse Curl', 'forearms', 'barbell', 'wr', ['biceps', 'brachialis'], 'Overhand grip; strict elbows, wrists straight.'],
    ['dead-hang', 'Dead Hang', 'forearms', 'bodyweight', 'time', ['lats', 'shoulders'], 'Full grip on the bar, shoulders active-ish; breathe and hang.'],
    ['farmers-carry', 'Farmer’s Carry', 'forearms', 'dumbbell', 'time', ['traps', 'core', 'grip'], 'Heavy in each hand; tall posture, quick small steps.'],

    /* ---------------- Quads ---------------- */
    ['back-squat', 'Back Squat', 'quads', 'barbell', 'wr', ['glutes', 'core', 'hamstrings'], 'Brace, sit down between your heels; drive up through mid-foot, chest proud.'],
    ['front-squat', 'Front Squat', 'quads', 'barbell', 'wr', ['glutes', 'core', 'upper back'], 'Elbows high, upright torso; the rack position is the exercise.'],
    ['goblet-squat', 'Goblet Squat', 'quads', 'dumbbell', 'wr', ['glutes', 'core'], 'Bell at your chest; elbows inside knees at depth, heels down.'],
    ['box-squat', 'Box Squat', 'quads', 'barbell', 'wr', ['glutes'], 'Sit back to a box, brief pause, no rocking; stand aggressively.'],
    ['leg-press', 'Leg Press', 'quads', 'machine', 'wr', ['glutes'], 'Feet mid-platform; lower until hips begin to curl, never slam lockout.'],
    ['hack-squat', 'Hack Squat', 'quads', 'machine', 'wr', ['glutes'], 'Back flat on the pad; deep knee bend, drive evenly through both feet.'],
    ['bss', 'Bulgarian Split Squat', 'quads', 'dumbbell', 'wr', ['glutes'], 'Per side. Rear foot on a bench; drop the back knee straight down, front heel loaded.'],
    ['walking-lunge', 'Walking Lunge', 'quads', 'dumbbell', 'wr', ['glutes'], 'Long stride, torso tall; knee tracks over toes, push off the front leg.'],
    ['reverse-lunge', 'Reverse Lunge', 'quads', 'dumbbell', 'wr', ['glutes'], 'Per side. Step back, drop the knee; easier on the knees than forward lunges.'],
    ['step-up', 'Step-Up', 'quads', 'dumbbell', 'wr', ['glutes'], 'Per side. Box at knee height; drive through the top foot only — no bounce off the floor.'],
    ['leg-extension', 'Leg Extension', 'quads', 'machine', 'wr', [], 'Pause a beat at full extension; lower slowly, don’t let the stack crash.'],
    ['sissy-squat', 'Sissy Squat', 'quads', 'bodyweight', 'bw', [], 'Heels up, knees travel far forward, body leans back in one line. Advanced.'],

    /* ---------------- Hamstrings ---------------- */
    ['rdl', 'Romanian Deadlift', 'hamstrings', 'barbell', 'wr', ['glutes', 'lower back'], 'Soft knees, push hips back until hamstrings pull; bar glued to your legs.'],
    ['sldl', 'Stiff-Leg Deadlift', 'hamstrings', 'barbell', 'wr', ['glutes', 'lower back'], 'Straighter knees than RDL, from the floor; only as deep as a flat back allows.'],
    ['lying-leg-curl', 'Lying Leg Curl', 'hamstrings', 'machine', 'wr', ['calves'], 'Hips pressed into the pad; curl to full contraction, 3-count lowering.'],
    ['seated-leg-curl', 'Seated Leg Curl', 'hamstrings', 'machine', 'wr', [], 'Thigh pad snug; long-length stretch makes this one count.'],
    ['nordic-curl', 'Nordic Curl', 'hamstrings', 'bodyweight', 'bw', [], 'Ankles anchored; lower as slowly as possible, push back up. Brutal — few reps is fine.'],
    ['good-morning', 'Good Morning', 'hamstrings', 'barbell', 'wr', ['glutes', 'lower back'], 'Light bar, big hip hinge; torso to ~45°, flat back throughout.'],
    ['sl-rdl', 'Single-Leg RDL', 'hamstrings', 'dumbbell', 'wr', ['glutes', 'balance'], 'Per side. Hips square, back leg reaches long; a runner’s best friend.'],

    /* ---------------- Glutes ---------------- */
    ['hip-thrust', 'Barbell Hip Thrust', 'glutes', 'barbell', 'wr', ['hamstrings'], 'Upper back on a bench, chin tucked; squeeze to a full hip lockout, ribs down.'],
    ['glute-bridge', 'Glute Bridge', 'glutes', 'bodyweight', 'bw', ['hamstrings'], 'From the floor; posterior-tilt the pelvis, squeeze hard at the top.'],
    ['sumo-deadlift', 'Sumo Deadlift', 'glutes', 'barbell', 'wr', ['hamstrings', 'quads', 'back'], 'Wide stance, toes out; wedge hips down, spread the floor apart.'],
    ['pull-through', 'Cable Pull-Through', 'glutes', 'cable', 'wr', ['hamstrings'], 'Face away, rope between legs; hinge, then snap hips forward to stand.'],
    ['glute-kickback', 'Cable Glute Kickback', 'glutes', 'cable', 'wr', [], 'Per side. Kick back and slightly up; squeeze without arching the lower back.'],
    ['hip-abduction', 'Hip Abduction Machine', 'glutes', 'machine', 'wr', [], 'Lean slightly forward for upper glute; pause at the widest point.'],
    ['hip-adduction', 'Hip Adduction Machine', 'glutes', 'machine', 'wr', ['adductors'], 'Controlled squeeze in, slow release; big range beats big load.'],

    /* ---------------- Calves & lower leg ---------------- */
    ['standing-calf-raise', 'Standing Calf Raise', 'calves', 'machine', 'wr', [], 'Full stretch at the bottom, 2s pause; rise to tip-toe, no bouncing.'],
    ['seated-calf-raise', 'Seated Calf Raise', 'calves', 'machine', 'wr', ['soleus'], 'Bent knee hits the soleus — key muscle for runners; slow reps.'],
    ['sl-calf-raise', 'Single-Leg Calf Raise', 'calves', 'bodyweight', 'bw', [], 'Per side. On a step, deep stretch; a benchmark of run-ready calves.'],
    ['tibialis-raise', 'Tibialis Raise', 'calves', 'bodyweight', 'bw', ['shins'], 'Back against a wall, heels out; lift toes toward shins. Shin-splint armour.'],

    /* ---------------- Core ---------------- */
    ['plank', 'Plank', 'core', 'bodyweight', 'time', ['shoulders', 'glutes'], 'Forearms down, squeeze glutes, ribs tucked — a straight line, not a sag.'],
    ['side-plank', 'Side Plank', 'core', 'bodyweight', 'time', ['obliques', 'hip stabilisers'], 'Per side. Stack feet, lift hips high; key for runners’ hip stability.'],
    ['copenhagen-plank', 'Copenhagen Plank', 'core', 'bodyweight', 'time', ['adductors'], 'Per side. Top foot on a bench, hips lifted; adductor strength = groin insurance.'],
    ['hanging-knee-raise', 'Hanging Knee Raise', 'core', 'bodyweight', 'bw', ['hip flexors', 'grip'], 'Curl the pelvis, knees to chest; no swinging between reps.'],
    ['hanging-leg-raise', 'Hanging Leg Raise', 'core', 'bodyweight', 'bw', ['hip flexors', 'grip'], 'Straight legs to horizontal or above; slow lowering is the hard part.'],
    ['cable-crunch', 'Cable Crunch', 'core', 'cable', 'wr', [], 'Kneel, rope by your ears; crunch ribs to pelvis, hips still.'],
    ['ab-wheel', 'Ab Wheel Rollout', 'core', 'other', 'bw', ['lats', 'shoulders'], 'From knees; roll out only as far as you can keep the lower back flat.'],
    ['crunch', 'Crunch', 'core', 'bodyweight', 'bw', [], 'Short range, chin off chest; exhale as ribs pull down.'],
    ['reverse-crunch', 'Reverse Crunch', 'core', 'bodyweight', 'bw', [], 'Knees to chest, peel the hips off the floor; lower one vertebra at a time.'],
    ['situp', 'Sit-Up', 'core', 'bodyweight', 'bw', ['hip flexors'], 'Full range up; anchor feet only if you must.'],
    ['russian-twist', 'Russian Twist', 'core', 'bodyweight', 'bw', ['obliques'], 'Lean back 45°, rotate shoulder to shoulder; add weight when 20+ is easy.'],
    ['dead-bug', 'Dead Bug', 'core', 'bodyweight', 'bw', [], 'Lower back welded to the floor; opposite arm and leg reach long, slow.'],
    ['bird-dog', 'Bird Dog', 'core', 'bodyweight', 'bw', ['glutes', 'lower back'], 'Per side. From all fours, reach long not high; hips stay level.'],
    ['pallof-press', 'Pallof Press', 'core', 'cable', 'wr', ['obliques'], 'Per side. Press the handle straight out and resist the twist; anti-rotation gold.'],
    ['v-up', 'V-Up', 'core', 'bodyweight', 'bw', ['hip flexors'], 'Fold in half, fingers to toes; keep the lower back honest.'],
    ['mountain-climbers', 'Mountain Climbers', 'core', 'bodyweight', 'time', ['shoulders', 'cardio'], 'Plank position; drive knees fast without bouncing the hips.'],

    /* ---------------- Full body & power ---------------- */
    ['kb-swing', 'Kettlebell Swing', 'full', 'kettlebell', 'wr', ['glutes', 'hamstrings', 'core'], 'A hip hinge, not a squat; snap the hips, bell floats to chest height.'],
    ['power-clean', 'Power Clean', 'full', 'barbell', 'wr', ['traps', 'glutes', 'quads'], 'Explosive triple extension; catch high in a quarter squat. Technique first.'],
    ['push-press', 'Push Press', 'full', 'barbell', 'wr', ['shoulders', 'triceps', 'quads'], 'Shallow knee dip, drive through the legs into a fast lockout overhead.'],
    ['thruster', 'Thruster', 'full', 'barbell', 'wr', ['quads', 'shoulders'], 'Front squat straight into a press — one fluid movement.'],
    ['turkish-getup', 'Turkish Get-Up', 'full', 'kettlebell', 'wr', ['shoulders', 'core'], 'Per side. Slow and deliberate through each position; eyes on the bell.'],
    ['sled-push', 'Sled Push', 'full', 'other', 'time', ['quads', 'glutes', 'calves'], 'Low body angle, arms locked; drive with short powerful steps.'],
    ['burpee', 'Burpee', 'full', 'bodyweight', 'bw', ['cardio'], 'Chest to floor, jump tall at the top; steady rhythm beats sprint-and-die.'],
    ['med-ball-slam', 'Medicine Ball Slam', 'full', 'other', 'wr', ['core', 'lats'], 'Full reach overhead, slam through the floor; hinge to pick up, repeat fast.'],
    ['battle-ropes', 'Battle Ropes', 'full', 'other', 'time', ['shoulders', 'core', 'cardio'], 'Athletic stance; alternating or double waves, big amplitude.'],

    /* ---------------- Gym cardio ---------------- */
    ['treadmill-run', 'Treadmill Run', 'cardio', 'cardio', 'time', [], 'Outdoor runs belong in the Run tab — log gym sessions here by duration.'],
    ['incline-walk', 'Incline Treadmill Walk', 'cardio', 'cardio', 'time', [], '10–15% incline, 5–6 km/h; low-impact engine building.'],
    ['bike-erg', 'Indoor Cycling', 'cardio', 'cardio', 'time', [], 'Great zero-impact cross-training on easy or rest days.'],
    ['row-erg', 'Rowing Erg', 'cardio', 'cardio', 'time', ['back', 'legs'], 'Legs → hips → arms; damper 4–6 is plenty.'],
    ['elliptical', 'Elliptical', 'cardio', 'cardio', 'time', [], 'Smooth cross-training; keep effort conversational on recovery days.'],
    ['stair-climber', 'Stair Climber', 'cardio', 'cardio', 'time', ['glutes', 'calves'], 'Stand tall, light fingertip balance only.'],
    ['swim', 'Swimming', 'cardio', 'cardio', 'time', ['full body'], 'The recovery-day king — zero impact, big aerobic return.'],
    ['jump-rope', 'Jump Rope', 'cardio', 'cardio', 'time', ['calves'], 'Soft ankles, low hops; excellent calf and foot conditioning for running.'],
    ['assault-bike', 'Assault Bike', 'cardio', 'cardio', 'time', [], 'Intervals hurt beautifully here; pace the first one.'],
    ['hike', 'Hiking', 'cardio', 'cardio', 'time', ['legs'], 'Time on feet with none of the pounding — long-run friendly.'],
  ];

  const GROUPS = [
    ['chest', 'Chest'], ['back', 'Back'], ['shoulders', 'Shoulders'],
    ['biceps', 'Biceps'], ['triceps', 'Triceps'], ['forearms', 'Forearms'],
    ['quads', 'Quads'], ['hamstrings', 'Hamstrings'], ['glutes', 'Glutes'],
    ['calves', 'Calves'], ['core', 'Core'], ['full', 'Full body'], ['cardio', 'Cardio'],
  ];

  const EQUIP = [
    ['barbell', 'Barbell'], ['dumbbell', 'Dumbbell'], ['machine', 'Machine'],
    ['cable', 'Cable'], ['bodyweight', 'Bodyweight'], ['kettlebell', 'Kettlebell'],
    ['other', 'Other'], ['cardio', 'Cardio machine'],
  ];

  const list = rows.map(([id, name, group, equipment, track, secondary, cue]) =>
    ({ id, name, group, equipment, track, secondary, cue, builtin: true }));

  return {
    list,
    GROUPS,
    EQUIP,
    groupName(key) { const g = GROUPS.find(g => g[0] === key); return g ? g[1] : key; },
    equipName(key) { const e = EQUIP.find(e => e[0] === key); return e ? e[1] : key; },
  };
})();
