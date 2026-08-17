/* State, persistence (localStorage), units, derived stats, seed templates. */
'use strict';

const Store = (() => {

  const KEY = 'gymapp.v1';

  /* ---------------- default state ---------------- */

  function defaults() {
    return {
      version: 1,
      createdAt: U.todayISO(),
      settings: {
        theme: 'auto',            // auto | light | dark
        units: 'metric',          // metric (kg·km) | imperial (lb·mi)
        restSec: 90,
        raceName: 'London Marathon',
        raceDate: '2027-04-25',   // expected next London Marathon (last Sun in April) — editable in Settings
        goalSec: null,            // marathon goal time in seconds
      },
      customExercises: [],
      routines: [],
      schedule: { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' }, // dow(0=Mon) -> routineId
      workouts: [],               // finished sessions
      activeWorkout: null,        // in-progress session (survives reloads)
      runs: [],
      bodyweight: [],             // [{date, kg}]
      runPlan: null,              // generated marathon plan
      seeded: false,
    };
  }

  let state = defaults();

  /* ---------------- persistence ---------------- */

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(defaults(), parsed);
        state.settings = Object.assign(defaults().settings, parsed.settings || {});
      }
    } catch (e) { console.warn('Could not load saved data:', e); }
    if (!state.seeded) { seed(); state.seeded = true; save(); }
    else migrate();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Could not save:', e); }
  }

  function exportJSON() {
    return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  }

  // Parse + validate a backup without applying it; returns a summary for the confirm step.
  function parseBackup(text) {
    const parsed = JSON.parse(text); // throws on bad input
    if (!parsed || typeof parsed !== 'object' || !parsed.settings) throw new Error('Not a Gym backup file');
    return {
      parsed,
      summary: {
        exportedAt: parsed.exportedAt || null,
        workouts: (parsed.workouts || []).length,
        runs: (parsed.runs || []).length,
        routines: (parsed.routines || []).length,
        customExercises: (parsed.customExercises || []).length,
        bodyweight: (parsed.bodyweight || []).length,
        hasPlan: !!parsed.runPlan,
      },
    };
  }

  function applyBackup(parsed) {
    state = Object.assign(defaults(), parsed);
    state.settings = Object.assign(defaults().settings, parsed.settings || {});
    save();
  }

  function reset() { state = defaults(); seed(); state.seeded = true; save(); }

  /* ---------------- units ---------------- */

  const metric = () => state.settings.units === 'metric';
  const wUnit = () => metric() ? 'kg' : 'lb';
  const dUnit = () => metric() ? 'km' : 'mi';
  const paceUnit = () => metric() ? '/km' : '/mi';

  // canonical storage: kg + km. Display helpers convert.
  const wOut = kg => kg == null ? null : (metric() ? kg : U.kg2lb(kg));
  const wIn = v => v == null ? null : (metric() ? v : U.lb2kg(v));
  const dOut = km => km == null ? null : (metric() ? km : U.km2mi(km));
  const dIn = v => v == null ? null : (metric() ? v : U.mi2km(v));
  const fmtW = (kg, dp = 1) => kg == null ? '–' : `${U.fmtNum(wOut(kg), dp)} ${wUnit()}`;
  const fmtD = (km, dp = 1) => km == null ? '–' : `${U.fmtNum(dOut(km), dp)} ${dUnit()}`;
  // pace stored as sec/km; displayed per current unit
  const paceOut = secPerKm => secPerKm == null ? null : (metric() ? secPerKm : secPerKm * U.KM_PER_MI);
  const fmtPace = secPerKm => secPerKm == null ? '–' : `${U.fmtPaceVal(paceOut(secPerKm))} ${paceUnit()}`;

  /* ---------------- exercises ---------------- */

  function allExercises() { return EXDB.list.concat(state.customExercises); }
  function exById(id) { return allExercises().find(e => e.id === id) || null; }

  function addCustomExercise(ex) {
    ex.id = 'custom-' + U.uid();
    ex.builtin = false;
    state.customExercises.push(ex);
    save();
    return ex;
  }

  /* ---------------- strength maths ---------------- */

  // Epley estimated 1RM — reliable up to ~10-12 reps, capped to keep it honest.
  function e1rm(kg, reps) {
    if (!kg || !reps || reps < 1) return 0;
    return kg * (1 + Math.min(reps, 12) / 30);
  }

  function bestSetOf(sets, track) {
    let best = null;
    for (const s of sets) {
      if (!s.done || s.warm) continue;
      if (track === 'time') {
        if (s.sec && (!best || s.sec > best.sec)) best = s;
      } else if (track === 'bw') {
        const score = (s.r || 0) + (s.w || 0) * 0.5;
        if (s.r && (!best || score > ((best.r || 0) + (best.w || 0) * 0.5))) best = s;
      } else {
        const score = e1rm(s.w, s.r);
        if (score > 0 && (!best || score > e1rm(best.w, best.r))) best = s;
      }
    }
    return best;
  }

  // Chronological history for one exercise: [{date, workoutId, sets, work, best}]
  // `sets` = all done sets (warm-ups included, flagged); `work` = working sets only.
  function exHistory(exId) {
    const ex = exById(exId);
    const track = ex ? ex.track : 'wr';
    const out = [];
    for (const w of state.workouts) {
      for (const en of w.entries) {
        if (en.exerciseId !== exId) continue;
        const done = en.sets.filter(s => s.done);
        if (!done.length) continue;
        const work = done.filter(s => !s.warm);
        out.push({ date: w.date, workoutId: w.id, sets: done, work: work.length ? work : done, best: bestSetOf(en.sets, track) });
      }
    }
    out.sort((a, b) => a.date < b.date ? -1 : 1);
    return out;
  }

  function lastPerformance(exId) {
    const h = exHistory(exId);
    return h.length ? h[h.length - 1] : null;
  }

  // Personal records for one exercise
  function prsFor(exId) {
    const ex = exById(exId);
    if (!ex) return null;
    const hist = exHistory(exId);
    const pr = { maxW: null, e1rm: null, maxReps: null, maxSec: null };
    for (const h of hist) {
      for (const s of h.work) {
        if (ex.track === 'time') {
          if (s.sec && (!pr.maxSec || s.sec > pr.maxSec.sec)) pr.maxSec = { sec: s.sec, date: h.date };
        } else if (ex.track === 'bw') {
          if (s.r && (!pr.maxReps || s.r > pr.maxReps.r || (s.r === pr.maxReps.r && (s.w || 0) > (pr.maxReps.w || 0))))
            pr.maxReps = { r: s.r, w: s.w || 0, date: h.date };
        } else {
          if (s.w && s.r) {
            if (!pr.maxW || s.w > pr.maxW.w) pr.maxW = { w: s.w, r: s.r, date: h.date };
            const est = e1rm(s.w, s.r);
            if (!pr.e1rm || est > pr.e1rm.val) pr.e1rm = { val: est, w: s.w, r: s.r, date: h.date };
          }
        }
      }
    }
    return pr;
  }

  // Compare a finished workout against prior history → list of new PRs
  function detectPRs(workout) {
    const events = [];
    for (const en of workout.entries) {
      const ex = exById(en.exerciseId);
      if (!ex) continue;
      // history excluding this workout
      const prior = { maxW: 0, e1: 0, reps: 0, sec: 0 };
      for (const w of state.workouts) {
        if (w.id === workout.id) continue;
        for (const pe of w.entries) {
          if (pe.exerciseId !== en.exerciseId) continue;
          for (const s of pe.sets) {
            if (!s.done || s.warm) continue;
            if (s.w && s.r) { prior.maxW = Math.max(prior.maxW, s.w); prior.e1 = Math.max(prior.e1, e1rm(s.w, s.r)); }
            if (s.r) prior.reps = Math.max(prior.reps, s.r);
            if (s.sec) prior.sec = Math.max(prior.sec, s.sec);
          }
        }
      }
      let hit = null;
      for (const s of en.sets) {
        if (!s.done || s.warm) continue;
        if (ex.track === 'wr' || ex.track === undefined) {
          if (s.w && s.r && prior.e1 > 0 && e1rm(s.w, s.r) > prior.e1 + 0.01) hit = `${ex.name}: ${fmtW(s.w, 1)} × ${s.r}`;
          else if (s.w && s.r && prior.maxW > 0 && s.w > prior.maxW) hit = `${ex.name}: ${fmtW(s.w, 1)} × ${s.r}`;
        } else if (ex.track === 'bw') {
          if (s.r && prior.reps > 0 && s.r > prior.reps) hit = `${ex.name}: ${s.r} reps`;
        } else if (ex.track === 'time') {
          if (s.sec && prior.sec > 0 && s.sec > prior.sec) hit = `${ex.name}: ${U.fmtDuration(s.sec)}`;
        }
      }
      if (hit) events.push(hit);
    }
    return events;
  }

  /* ---------------- aggregates for charts ---------------- */

  function workoutTonnage(w) {
    let kg = 0;
    for (const en of w.entries)
      for (const s of en.sets)
        if (s.done && !s.warm && s.w && s.r) kg += s.w * s.r;
    return kg;
  }

  function workoutSets(w) { // working sets only
    let n = 0;
    for (const en of w.entries) n += en.sets.filter(s => s.done && !s.warm).length;
    return n;
  }

  // Map weekStartISO -> {tonnage, sets, sessions}
  function weeklyLifting(weeks) {
    const map = new Map();
    const start = U.addDays(U.mondayOf(U.todayISO()), -7 * (weeks - 1));
    for (const w of state.workouts) {
      if (w.date < start) continue;
      const wk = U.mondayOf(w.date);
      const cur = map.get(wk) || { tonnage: 0, sets: 0, sessions: 0 };
      cur.tonnage += workoutTonnage(w);
      cur.sets += workoutSets(w);
      cur.sessions += 1;
      map.set(wk, cur);
    }
    return map;
  }

  // Map iso date -> activity count (for the heatmap)
  function activityByDay() {
    const map = new Map();
    const bump = (iso, n) => map.set(iso, (map.get(iso) || 0) + n);
    for (const w of state.workouts) bump(w.date, 1);
    for (const r of state.runs) bump(r.date, 1);
    return map;
  }

  function streakDays() {
    const act = activityByDay();
    let streak = 0;
    let d = U.todayISO();
    if (!act.has(d)) d = U.addDays(d, -1); // today not yet trained doesn't break the streak
    while (act.has(d)) { streak++; d = U.addDays(d, -1); }
    return streak;
  }

  /* ---------------- runs ---------------- */

  function addRun(run) {
    run.id = run.id || U.uid();
    state.runs.push(run);
    state.runs.sort((a, b) => a.date < b.date ? -1 : 1);
    save();
    return run;
  }

  function updateRun(run) {
    const i = state.runs.findIndex(r => r.id === run.id);
    if (i >= 0) state.runs[i] = run;
    state.runs.sort((a, b) => a.date < b.date ? -1 : 1);
    save();
  }

  function deleteRun(id) {
    state.runs = state.runs.filter(r => r.id !== id);
    save();
  }

  function runsInWeek(mondayISO) {
    const end = U.addDays(mondayISO, 6);
    return state.runs.filter(r => r.date >= mondayISO && r.date <= end);
  }

  /* ---------------- evidence-based rest & step defaults ---------------- */

  // Recommended rest between sets, by exercise character (compounds long, isolation short).
  function restFor(ex) {
    if (!ex) return null;
    if (ex.group === 'core' || ex.track === 'time') return 60;
    const p = ex.pattern;
    if (['back-squat', 'front-squat', 'box-squat', 'deadlift', 'sumo-deadlift', 'trapbar-deadlift', 'bb-bench', 'cg-bench', 'rack-pull'].includes(ex.id)) return 180;
    if (p === 'squat' || p === 'hinge') return ex.equipment === 'barbell' || ex.equipment === 'machine' ? 150 : 120;
    if (p === 'hpush' || p === 'vpush' || p === 'hpull' || p === 'vpull')
      return ex.equipment === 'barbell' || ex.equipment === 'bodyweight' ? 150 : 120;
    if (p === 'lunge' || p === 'power') return 120;
    if (p === 'calf') return ex.id === 'seated-calf-raise' ? 60 : 75;
    if (p === 'grip') return 60;
    if (p === 'iso-quad' || p === 'iso-ham' || p === 'iso-glute' || p === 'iso-chest' || p === 'iso-rear') return 90;
    return 75; // small isolation: curls, extensions, raises
  }

  // Adaptive weight-step for the stepper strip (display units). Big lifts jump
  // bigger; small dumbbell/cable isolation jumps smaller. Overridable per exercise.
  const BIG_STEP_IDS = ['deadlift', 'sumo-deadlift', 'trapbar-deadlift', 'rack-pull', 'back-squat', 'front-squat', 'box-squat', 'leg-press', 'hack-squat', 'hip-thrust', 'bb-shrug'];
  const SMALL_STEP_GROUPS = ['shoulders', 'biceps', 'triceps', 'forearms', 'core'];

  function stepKey(exId) { return exId + ':' + state.settings.units; }

  function stepFor(ex) {
    if (!ex) return metric() ? 2.5 : 5;
    const custom = state.settings.steps && state.settings.steps[stepKey(ex.id)];
    if (custom) return custom;
    if (BIG_STEP_IDS.includes(ex.id)) return metric() ? 5 : 10;
    if ((ex.equipment === 'dumbbell' || ex.equipment === 'kettlebell' || ex.equipment === 'cable') && SMALL_STEP_GROUPS.includes(ex.group))
      return metric() ? 1 : 2.5;
    return metric() ? 2.5 : 5;
  }

  function stepCycle() { return metric() ? [0.5, 1, 2.5, 5, 10] : [1, 2.5, 5, 10, 25]; }

  function cycleStep(ex) {
    const cyc = stepCycle();
    const cur = stepFor(ex);
    let idx = cyc.findIndex(v => Math.abs(v - cur) < 0.01);
    if (idx < 0) idx = 1;
    const next = cyc[(idx + 1) % cyc.length];
    state.settings.steps = state.settings.steps || {};
    state.settings.steps[stepKey(ex.id)] = next;
    save();
    return next;
  }

  /* ---------------- weekly muscle volume (for the balance panel) ---------------- */

  const SECONDARY_MAP = {
    'triceps': 'triceps', 'biceps': 'biceps', 'brachialis': 'biceps',
    'front delts': 'shoulders', 'rear delts': 'shoulders', 'shoulders': 'shoulders',
    'chest': 'chest', 'upper chest': 'chest',
    'lats': 'back', 'upper back': 'back', 'traps': 'back', 'lower back': 'back', 'back': 'back',
    'core': 'core', 'obliques': 'core', 'hip flexors': 'core',
    'hamstrings': 'hamstrings', 'glutes': 'glutes', 'quads': 'quads', 'legs': 'quads',
    'calves': 'calves', 'soleus': 'calves', 'shins': 'calves',
    'forearms': 'forearms', 'grip': 'forearms',
    'adductors': 'glutes', 'hip stabilisers': 'glutes',
  };

  // Direct sets count 1, secondary-muscle sets count ½ — a common accounting rule.
  function weeklyMuscleSets() {
    const sets = {};
    const bump = (g, n) => { if (g) sets[g] = (sets[g] || 0) + n; };
    for (const dow of Object.keys(state.schedule)) {
      const r = state.routines.find(x => x.id === state.schedule[dow]);
      if (!r) continue;
      for (const it of r.items) {
        const ex = exById(it.exerciseId);
        if (!ex || ex.group === 'cardio') continue;
        bump(ex.group === 'full' ? 'quads' : ex.group, it.sets);
        for (const s of (ex.secondary || [])) bump(SECONDARY_MAP[s], it.sets * 0.5);
      }
    }
    return sets;
  }

  /* ---------------- seed data: starter routines ---------------- */

  function findEx(id) { return EXDB.list.find(e => e.id === id); }

  function item(exerciseId, sets, repsMin, repsMax) {
    return { exerciseId, sets, repsMin, repsMax, restSec: restFor(findEx(exerciseId)) };
  }

  const SEED_NAMES = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body A', 'Full Body B', 'Full Body C', 'Runner’s Strength', 'Core Express'];

  function buildFullBodyC() {
    return {
      id: 'r-' + U.uid(),
      name: 'Full Body C',
      note: 'Upper pump + core — legs stay fresh for the weekend long run',
      items: [
        item('ohp', 3, 6, 10), item('cable-row', 3, 10, 12), item('db-bench', 3, 8, 12),
        item('face-pull', 3, 12, 20), item('hammer-curl', 2, 10, 15), item('rope-oh-ext', 2, 10, 15),
        item('pallof-press', 2, 10, 12), item('side-plank', 2, 30, 45),
      ],
    };
  }

  function seed() {
    const mk = (name, note, items) => ({ id: 'r-' + U.uid(), name, note, items });
    const r = {
      fullA: mk('Full Body A', 'Upper-focus full body — ideal the day after your long run', [
        item('bb-bench', 4, 5, 8), item('cs-row', 3, 8, 12), item('db-shoulder-press', 3, 8, 12),
        item('lat-pulldown', 3, 10, 12), item('lying-leg-curl', 3, 10, 15),
        item('ez-curl', 2, 10, 15), item('pushdown', 2, 10, 15),
      ]),
      fullB: mk('Full Body B', 'Lower-focus full body — pair with your quality-run day (hard days hard)', [
        item('back-squat', 4, 5, 8), item('rdl', 3, 8, 10), item('leg-press', 2, 10, 12),
        item('pull-up', 3, 5, 10), item('db-incline-bench', 3, 8, 12),
        item('standing-calf-raise', 3, 10, 15), item('seated-calf-raise', 2, 12, 20),
      ]),
      fullC: buildFullBodyC(),
      push: mk('Push Day', 'Chest · shoulders · triceps — part of a 5–6-day split', [
        item('bb-bench', 4, 5, 8), item('ohp', 3, 6, 10), item('db-incline-bench', 3, 8, 12),
        item('cable-fly', 3, 12, 15), item('lateral-raise', 4, 12, 20), item('pushdown', 3, 10, 15),
      ]),
      pull: mk('Pull Day', 'Back · rear delts · biceps — part of a 5–6-day split', [
        item('deadlift', 2, 3, 5), item('pull-up', 3, 5, 10), item('cable-row', 3, 8, 12),
        item('lat-pulldown', 3, 10, 12), item('face-pull', 3, 12, 20), item('ez-curl', 3, 8, 12),
        item('hammer-curl', 3, 10, 15),
      ]),
      legs: mk('Leg Day', 'Quads · hamstrings · calves — part of a 5–6-day split', [
        item('back-squat', 4, 5, 8), item('rdl', 3, 8, 10), item('leg-press', 3, 10, 12),
        item('lying-leg-curl', 3, 10, 15), item('standing-calf-raise', 4, 10, 15), item('plank', 3, 45, 60),
      ]),
      upper: mk('Upper Body', 'Push + pull in one session — for 4 lift days/week', [
        item('bb-bench', 4, 6, 10), item('bb-row', 4, 6, 10), item('ohp', 3, 8, 12),
        item('lat-pulldown', 3, 8, 12), item('lateral-raise', 3, 12, 20), item('db-curl', 3, 10, 15),
        item('pushdown', 3, 10, 15),
      ]),
      lower: mk('Lower Body', 'Squat + hinge focus — for 4 lift days/week', [
        item('back-squat', 4, 6, 10), item('rdl', 3, 8, 12), item('bss', 3, 8, 12),
        item('lying-leg-curl', 3, 10, 15), item('standing-calf-raise', 4, 10, 15), item('hanging-knee-raise', 3, 10, 15),
      ]),
      runner: mk('Runner’s Strength', 'Injury-proofing for marathon training — 2×/week', [
        item('goblet-squat', 3, 8, 12), item('sl-rdl', 3, 8, 10), item('step-up', 3, 8, 10),
        item('hip-thrust', 3, 8, 12), item('standing-calf-raise', 3, 12, 15), item('seated-calf-raise', 2, 12, 15),
        item('side-plank', 3, 30, 45), item('nordic-curl', 3, 4, 6), item('tibialis-raise', 2, 15, 20),
      ]),
      core: mk('Core Express', '~12 minutes, no excuses', [
        item('plank', 3, 40, 60), item('dead-bug', 3, 10, 12), item('side-plank', 2, 30, 45),
        item('hanging-knee-raise', 3, 10, 15), item('pallof-press', 2, 10, 12),
      ]),
    };
    state.routines = Object.values(r);
    // Recommended week: full-body Mon/Wed/Fri so every muscle is hit 2–3×,
    // with the lower-body day beside the quality run and Friday leg-free.
    state.schedule = { 0: r.fullA.id, 1: '', 2: r.fullB.id, 3: '', 4: r.fullC.id, 5: '', 6: '' };
  }

  /* Non-destructive upgrades for data created by earlier versions. */
  function migrate() {
    state.migrations = state.migrations || {};
    if (!state.migrations.m2) {
      // 1) add Full Body C if absent
      if (!state.routines.some(r => r.name === 'Full Body C')) {
        state.routines.push(buildFullBodyC());
      }
      // 2) runner's routine gains soleus + tibialis work
      const runner = state.routines.find(r => r.name === 'Runner’s Strength');
      if (runner) {
        if (!runner.items.some(i => i.exerciseId === 'seated-calf-raise')) runner.items.push(item('seated-calf-raise', 2, 12, 15));
        if (!runner.items.some(i => i.exerciseId === 'tibialis-raise')) runner.items.push(item('tibialis-raise', 2, 15, 20));
      }
      // 3) fill recommended rest times where routines still use the global default
      for (const r of state.routines) {
        if (!SEED_NAMES.includes(r.name)) continue;
        for (const it of r.items) {
          if (it.restSec == null) it.restSec = restFor(exById(it.exerciseId));
        }
      }
      state.migrations.m2 = true;
      save();
    }
  }

  /* ---------------- public ---------------- */

  return {
    get state() { return state; },
    load, save, reset, exportJSON, parseBackup, applyBackup,
    metric, wUnit, dUnit, paceUnit, wOut, wIn, dOut, dIn, fmtW, fmtD, paceOut, fmtPace,
    allExercises, exById, addCustomExercise,
    e1rm, bestSetOf, exHistory, lastPerformance, prsFor, detectPRs,
    workoutTonnage, workoutSets, weeklyLifting, activityByDay, streakDays,
    addRun, updateRun, deleteRun, runsInWeek,
    restFor, stepFor, cycleStep, weeklyMuscleSets,
  };
})();
