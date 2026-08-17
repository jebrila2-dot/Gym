/* Marathon engine: phased plan generation, training paces, race prediction.
   All distances in km, times in seconds. General guidance, not medical advice —
   the plan follows mainstream marathon-training structure (base → build → peak →
   taper, ~10% weekly growth, cutback every 4th week, 3-week taper). */
'use strict';

const Marathon = (() => {

  const MARATHON_KM = 42.195;

  const TYPE_LABEL = {
    easy: 'Easy', long: 'Long run', tempo: 'Tempo', intervals: 'Intervals',
    race: 'Race', recovery: 'Recovery', cross: 'Cross-training', rest: 'Rest',
  };

  /* ---------------- training paces ---------------- */

  // Multipliers on marathon pace — standard rule-of-thumb ranges.
  function paces(goalSec) {
    if (!goalSec) return null;
    const mp = goalSec / MARATHON_KM; // sec per km
    return {
      mp,
      easy: [mp * 1.15, mp * 1.28],
      long: [mp * 1.10, mp * 1.22],
      threshold: mp * 0.94,
      interval: mp * 0.89,
      recovery: [mp * 1.30, mp * 1.45],
    };
  }

  /* ---------------- race prediction (Riegel, exponent 1.06) ---------------- */

  function predict(runs, todayISO) {
    const today = todayISO || U.todayISO();
    const horizon = U.addDays(today, -120);
    const farHorizon = U.addDays(today, -240);
    const riegel = r => r.sec * Math.pow(MARATHON_KM / r.km, 1.06);
    const bestOf = list => {
      let best = null;
      for (const r of list) {
        const predSec = riegel(r);
        if (!best || predSec < best.sec) best = { sec: predSec, run: r };
      }
      return best;
    };

    // True races are the best predictor basis — prefer them when available.
    const races = runs.filter(r => r.type === 'race' && r.km >= 5 && r.sec > 0 && r.date >= farHorizon);
    let best = bestOf(races);
    let basis = 'race';
    let note = null;
    if (!best) {
      basis = 'run';
      best = bestOf(runs.filter(r => r.km >= 8 && r.sec > 0 && r.date >= horizon));
      if (!best) {
        best = bestOf(runs.filter(r => r.km >= 5 && r.sec > 0 && r.date >= farHorizon));
        note = 'Based on a short run — log a longer hard effort (8 km+) or a race for a better estimate.';
      }
      if (best && !note) note = 'Training runs under-sell you — log a race or hard time-trial for a sharper estimate.';
    }
    if (!best) return null;
    if (best.run.km < 15 && !note) note = 'Predictions sharpen as your long efforts get longer.';
    return { sec: Math.round(best.sec), run: best.run, basis, note };
  }

  /* ---------------- plan generation ---------------- */

  // params: { raceDate, startISO, runsPerWeek (3|4|5), currentKm, longestKm }
  function generate(params) {
    const raceDate = params.raceDate;
    const startMonday = U.mondayOf(params.startISO || U.todayISO());
    const raceMonday = U.mondayOf(raceDate);
    const totalWeeks = Math.round(U.daysBetween(startMonday, raceMonday) / 7) + 1;
    if (totalWeeks < 4) return null;

    const rpw = U.clamp(params.runsPerWeek || 4, 3, 5);
    const startVol = U.clamp(params.currentKm || 20, 8, 90);
    const startLR = U.clamp(params.longestKm || Math.max(6, startVol * 0.35), 5, 30);

    // Targets
    let peakVol = { 3: 52, 4: 64, 5: 74 }[rpw];
    peakVol = Math.max(peakVol, startVol + 6);
    const maxLR = rpw === 3 || peakVol < 56 ? 30 : 32;

    // Phase allocation, counted back from race week
    const taperWeeks = totalWeeks >= 14 ? 3 : 2;
    const peakWeeks = totalWeeks >= 12 ? 3 : totalWeeks >= 8 ? 2 : 1;
    const remaining = totalWeeks - taperWeeks - peakWeeks;
    const buildWeeks = Math.min(9, Math.max(0, Math.ceil(remaining * 0.55)));
    const baseWeeks = Math.max(0, remaining - buildWeeks);

    const phaseOf = i => { // i = 0-based week index
      if (i >= totalWeeks - taperWeeks) return 'taper';
      if (i >= totalWeeks - taperWeeks - peakWeeks) return 'peak';
      if (i >= baseWeeks) return 'build';
      return 'base';
    };

    // Weekly volume & long-run progression
    const progressWeeks = baseWeeks + buildWeeks + peakWeeks; // weeks before taper
    const vols = [], lrs = [];
    let vol = startVol, lr = startLR;
    for (let i = 0; i < totalWeeks; i++) {
      const phase = phaseOf(i);
      if (phase === 'taper') {
        const t = i - (totalWeeks - taperWeeks); // 0,1,2
        const peakV = Math.max(...vols, startVol);
        const factors = taperWeeks === 3 ? [0.72, 0.52, 0.32] : [0.62, 0.35];
        vols.push(peakV * factors[t]);
        const peakL = Math.max(...lrs, startLR);
        const lrTaper = taperWeeks === 3 ? [0.6, 0.4, 0] : [0.5, 0];
        lrs.push(t === taperWeeks - 1 ? 0 : Math.round(peakL * lrTaper[t]));
        continue;
      }
      const f = progressWeeks <= 1 ? 1 : i / (progressWeeks - 1);
      let targetV = startVol + (peakVol - startVol) * Math.min(1, f);
      let targetL = startLR + (maxLR - startLR) * Math.min(1, f);
      // growth caps: ≤ ~10% volume, ≤ +2.5 km long run per week
      if (i > 0) {
        targetV = Math.min(targetV, vol * 1.10 + 1.5);
        targetL = Math.min(targetL, lr + 2.5);
      }
      vol = targetV; lr = Math.min(targetL, maxLR);
      const cutback = phase !== 'peak' && i > 0 && (i + 1) % 4 === 0;
      vols.push(cutback ? vol * 0.74 : vol);
      lrs.push(Math.round(cutback ? Math.max(startLR * 0.8, lr * 0.72) : lr));
    }

    // Day templates: dow 0=Mon … 6=Sun
    const raceDow = U.dowIdx(raceDate);
    const dayTemplate = {
      3: [{ dow: 1, slot: 'quality' }, { dow: 3, slot: 'easy' }, { dow: 6, slot: 'long' }],
      4: [{ dow: 1, slot: 'easy' }, { dow: 2, slot: 'quality' }, { dow: 4, slot: 'easy' }, { dow: 6, slot: 'long' }],
      5: [{ dow: 1, slot: 'easy' }, { dow: 2, slot: 'quality' }, { dow: 3, slot: 'easy' }, { dow: 5, slot: 'easy2' }, { dow: 6, slot: 'long' }],
    }[rpw];

    const weeks = [];
    let qualityFlip = 0;

    for (let i = 0; i < totalWeeks; i++) {
      const monday = U.addDays(startMonday, i * 7);
      const phase = phaseOf(i);
      const isRaceWeek = i === totalWeeks - 1;
      const weekVol = vols[i];
      const weekLR = lrs[i];
      const days = [];

      if (isRaceWeek) {
        days.push({ dow: 1, type: 'easy', km: 5, desc: 'Easy 5 km + 4×20 s strides — stay loose' });
        if (raceDow >= 4) days.push({ dow: 3, type: 'easy', km: 4, desc: 'Very easy 4 km, nothing hard' });
        days.push({
          dow: raceDow, type: 'race', km: MARATHON_KM,
          desc: `RACE DAY — ${MARATHON_KM} km. Even pacing, fuel early, enjoy every mile.`,
        });
        weeks.push({ start: monday, phase: 'race', targetKm: r1(5 + (raceDow >= 4 ? 4 : 0) + MARATHON_KM), days });
        continue;
      }

      // budget the week
      const qualityShare = phase === 'base' ? 0.22 : 0.25;
      let qualityKm = Math.max(6, Math.round(weekVol * qualityShare));
      let easyBudget = Math.max(0, weekVol - weekLR - qualityKm);
      const easySlots = dayTemplate.filter(d => d.slot === 'easy' || d.slot === 'easy2').length;

      for (const t of dayTemplate) {
        if (t.slot === 'long') {
          if (weekLR <= 0) continue;
          days.push({ dow: t.dow, type: 'long', km: weekLR, desc: longDesc(weekLR, phase) });
        } else if (t.slot === 'quality') {
          const q = qualityDay(phase, qualityKm, qualityFlip);
          days.push({ dow: t.dow, type: q.type, km: qualityKm, desc: q.desc });
        } else {
          let km = easySlots ? easyBudget / easySlots : 0;
          if (t.slot === 'easy2') km *= 0.8;
          km = Math.max(4, Math.round(km));
          const strides = phase === 'base' && t.dow === 1 ? ' + 6×20 s strides' : '';
          days.push({ dow: t.dow, type: 'easy', km, desc: `Easy ${km} km, conversational pace${strides}` });
        }
      }
      if (phase === 'build' || phase === 'peak') qualityFlip ^= days.some(d => d.type === 'tempo' || d.type === 'intervals') ? 1 : 0;

      days.sort((a, b) => a.dow - b.dow);
      weeks.push({ start: monday, phase, targetKm: r1(days.reduce((s, d) => s + d.km, 0)), days });
    }

    return {
      createdAt: U.todayISO(),
      params: { raceDate, startISO: startMonday, runsPerWeek: rpw, currentKm: startVol, longestKm: startLR },
      totalWeeks, peakVol: r1(Math.max(...vols)),
      weeks,
    };
  }

  function r1(v) { return Math.round(v * 10) / 10; }

  function longDesc(km, phase) {
    if (phase === 'peak' && km >= 26) {
      const mpKm = Math.min(10, Math.round(km * 0.3));
      return `Long run ${km} km — final ${mpKm} km at marathon pace`;
    }
    if (phase === 'build' && km >= 22) {
      return `Long run ${km} km easy — practise race-day fuelling`;
    }
    return `Long run ${km} km, relaxed — walk breaks are fine`;
  }

  function qualityDay(phase, km, flip) {
    if (phase === 'base') {
      return { type: 'easy', desc: `Easy ${km} km + 6×30 s hill strides, walk-down recovery` };
    }
    if (phase === 'taper') {
      return { type: 'tempo', desc: `${km} km with 10 min at marathon pace — sharp, not tiring` };
    }
    if (flip === 0) {
      const tempoMin = phase === 'peak' ? 35 : 25;
      return { type: 'tempo', desc: `Tempo: 2 km warm-up · ${tempoMin} min comfortably hard (threshold) · 2 km cool-down ≈ ${km} km` };
    }
    const reps = phase === 'peak' ? '5×1 km at 10K effort, 2–3 min jog recovery' : '6×800 m at 5K effort, 2 min jog recovery';
    return { type: 'intervals', desc: `Intervals: 2 km warm-up · ${reps} · 2 km cool-down ≈ ${km} km` };
  }

  /* ---------------- plan lookups ---------------- */

  function weekFor(plan, iso) {
    if (!plan) return null;
    const monday = U.mondayOf(iso);
    return plan.weeks.find(w => w.start === monday) || null;
  }

  function dayFor(plan, iso) {
    const w = weekFor(plan, iso);
    if (!w) return null;
    const dow = U.dowIdx(iso);
    const d = w.days.find(d => d.dow === dow);
    return d ? { week: w, day: d, date: iso } : null;
  }

  function nextRunDay(plan, fromISO, maxAhead = 14) {
    for (let i = 0; i <= maxAhead; i++) {
      const iso = U.addDays(fromISO, i);
      const hit = dayFor(plan, iso);
      if (hit) return hit;
    }
    return null;
  }

  function weekIndexOf(plan, iso) {
    if (!plan) return -1;
    return plan.weeks.findIndex(w => w.start === U.mondayOf(iso));
  }

  /* ---------------- plan-day ↔ run matching ---------------- */

  // Which of a plan week's days are "done", allowing runs shifted within the week.
  // Returns Map(dow -> run). Pass 1: exact date. Pass 2: same effort class in-week.
  // Pass 3: the long run matches any big unused run (≥70% of target). Pass 4: easy
  // days soak up leftover runs.
  function weekCompletion(week, runs) {
    const done = new Map();
    if (!week) return done;
    const end = U.addDays(week.start, 6);
    const weekRuns = runs.filter(r => r.date >= week.start && r.date <= end)
      .sort((a, b) => a.date < b.date ? -1 : 1);
    const used = new Set();
    const classOf = t => (t === 'tempo' || t === 'intervals' || t === 'race') ? 'quality'
      : t === 'long' ? 'long' : 'easy';

    const claim = (day, pred) => {
      if (done.has(day.dow)) return;
      for (const r of weekRuns) {
        if (used.has(r.id)) continue;
        if (pred(r)) { used.add(r.id); done.set(day.dow, r); return; }
      }
    };

    for (const d of week.days) claim(d, r => r.date === U.addDays(week.start, d.dow));
    for (const d of week.days) {
      if (d.type === 'race') claim(d, r => r.type === 'race');
      else claim(d, r => classOf(r.type) === classOf(d.type));
    }
    for (const d of week.days) {
      if (d.type === 'long') claim(d, r => r.km >= d.km * 0.7);
    }
    for (const d of week.days) {
      if (classOf(d.type) === 'easy') claim(d, () => true);
    }
    return done;
  }

  // True when the last two completed plan weeks were both badly under target.
  function behindStatus(plan, runs, todayISO) {
    if (!plan) return null;
    const today = todayISO || U.todayISO();
    const idx = weekIndexOf(plan, today);
    if (idx < 2) return null;
    if (plan.weeks[idx] && (plan.weeks[idx].phase === 'taper' || plan.weeks[idx].phase === 'race')) return null;
    let lowWeeks = 0, planKm = 0, actualKm = 0;
    for (const i of [idx - 1, idx - 2]) {
      const w = plan.weeks[i];
      if (!w || w.targetKm < 1) return null;
      const end = U.addDays(w.start, 6);
      const km = runs.filter(r => r.date >= w.start && r.date <= end).reduce((s, r) => s + r.km, 0);
      planKm += w.targetKm; actualKm += km;
      if (km < w.targetKm * 0.5) lowWeeks++;
    }
    return lowWeeks === 2 ? { planKm: r1(planKm), actualKm: r1(actualKm) } : null;
  }

  /* ---------------- aggregates ---------------- */

  // last n weeks (including current): [{monday, actualKm, planKm|null, runs}]
  function weeklySummary(runs, plan, nWeeks) {
    const out = [];
    const thisMonday = U.mondayOf(U.todayISO());
    for (let i = nWeeks - 1; i >= 0; i--) {
      const monday = U.addDays(thisMonday, -7 * i);
      const end = U.addDays(monday, 6);
      const wRuns = runs.filter(r => r.date >= monday && r.date <= end);
      const actualKm = wRuns.reduce((s, r) => s + r.km, 0);
      const planWeek = plan ? plan.weeks.find(w => w.start === monday) : null;
      out.push({ monday, actualKm: r1(actualKm), planKm: planWeek ? planWeek.targetKm : null, runs: wRuns });
    }
    return out;
  }

  return { MARATHON_KM, TYPE_LABEL, paces, predict, generate, weekFor, dayFor, nextRunDay, weekIndexOf, weeklySummary, weekCompletion, behindStatus };
})();
