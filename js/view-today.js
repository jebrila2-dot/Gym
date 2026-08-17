/* Today — the daily dashboard: race countdown, today's lift + run, week at a glance. */
'use strict';

var Views = window.Views || {};

Views.today = {
  render(root) {
    const S = Store.state;
    const today = U.todayISO();
    const dow = U.dowIdx(today);
    const stack = U.el('div', { class: 'stack' });

    /* ---- race countdown ---- */
    stack.appendChild(Views.today.raceCard(false));

    /* ---- today's sessions ---- */
    stack.appendChild(U.el('div', { class: 'section-label' }, [U.el('span', { class: 'kicker', text: 'Today' })]));

    // Lift
    const routineId = S.schedule[dow];
    const routine = S.routines.find(r => r.id === routineId);
    const liftedToday = S.workouts.some(w => w.date === today);
    const liftCard = U.el('div', { class: 'card' });
    const lh = U.el('div', { class: 'card-head' }, [
      ic('barbell', 'accent'), U.el('h2', { text: 'Lift' }), U.el('span', { class: 'spacer' }),
    ]);
    if (liftedToday) lh.appendChild(U.el('span', { class: 'badge good' }, [icNode('check'), 'Done']));
    liftCard.appendChild(lh);

    if (S.activeWorkout) {
      liftCard.appendChild(U.el('p', { class: 'small muted', text: `Workout in progress — ${S.activeWorkout.name}` }));
      liftCard.appendChild(U.el('div', { style: 'margin-top:12px' }, [
        btn('Continue workout', 'btn block', () => App.go('lift')),
      ]));
    } else if (routine) {
      liftCard.appendChild(U.el('p', { class: 'small muted', text: `${routine.name} · ${routine.items.length} exercises · ${routine.items.reduce((s, i) => s + i.sets, 0)} sets` }));
      if (!liftedToday) {
        liftCard.appendChild(U.el('div', { style: 'margin-top:12px' }, [
          btn('Start workout', 'btn block', () => { Views.lift.startWorkout(routine.id); App.go('lift'); }),
        ]));
      }
    } else {
      liftCard.appendChild(U.el('p', { class: 'small muted', text: 'Rest day — no lift scheduled.' }));
      liftCard.appendChild(U.el('div', { style: 'margin-top:12px' }, [
        btn('Choose a workout', 'btn ghost block', () => App.go('lift')),
      ]));
    }
    stack.appendChild(liftCard);

    // Run
    const runCard = U.el('div', { class: 'card' });
    const ranToday = S.runs.filter(r => r.date === today);
    const rh = U.el('div', { class: 'card-head' }, [
      ic('run', 'runc'), U.el('h2', { text: 'Run' }), U.el('span', { class: 'spacer' }),
    ]);
    if (ranToday.length) rh.appendChild(U.el('span', { class: 'badge good' }, [icNode('check'), 'Done']));
    runCard.appendChild(rh);

    const planDay = Marathon.dayFor(S.runPlan, today);
    if (ranToday.length) {
      const km = ranToday.reduce((s, r) => s + r.km, 0);
      const sec = ranToday.reduce((s, r) => s + r.sec, 0);
      runCard.appendChild(U.el('p', { class: 'small muted', text: `${Store.fmtD(km)} logged · ${U.fmtDuration(sec)} · ${Store.fmtPace(sec / km)}` }));
    } else if (planDay) {
      runCard.appendChild(U.el('div', { class: 'runday', style: 'margin-top:2px' }, [
        U.el('span', { class: `type-dot ${planDay.day.type}` }),
        U.el('span', { class: 'rd-desc', text: planDay.day.desc }),
        U.el('span', { class: 'rd-km tnum', text: Store.fmtD(planDay.day.km, 1) }),
      ]));
      runCard.appendChild(U.el('div', { style: 'margin-top:12px' }, [
        btn('Log this run', 'btn run block', () => Views.run.logRunModal({ km: planDay.day.km, type: planDay.day.type })),
      ]));
    } else if (S.runPlan) {
      const next = Marathon.nextRunDay(S.runPlan, U.addDays(today, 1));
      runCard.appendChild(U.el('p', {
        class: 'small muted',
        text: next
          ? `Rest from running today. Next: ${U.relDay(next.date)} — ${next.day.desc}`
          : 'Rest from running today.',
      }));
    } else {
      runCard.appendChild(U.el('p', { class: 'small muted', text: 'No marathon plan yet — build one to get your daily runs here.' }));
      runCard.appendChild(U.el('div', { style: 'margin-top:12px' }, [
        btn('Set up marathon plan', 'btn ghost block', () => App.go('run')),
      ]));
    }
    stack.appendChild(runCard);

    /* ---- this week ---- */
    stack.appendChild(U.el('div', { class: 'section-label' }, [U.el('span', { class: 'kicker', text: 'This week' })]));

    const monday = U.mondayOf(today);
    const weekWorkouts = S.workouts.filter(w => w.date >= monday && w.date <= U.addDays(monday, 6));
    const weekRuns = Store.runsInWeek(monday);
    const weekKm = weekRuns.reduce((s, r) => s + r.km, 0);
    const planWeek = Marathon.weekFor(S.runPlan, today);
    const streak = Store.streakDays();

    const tiles = U.el('div', { class: 'tile-row' });
    tiles.appendChild(tile('Lifts', String(weekWorkouts.length), scheduledCount(S) ? `of ${scheduledCount(S)} scheduled` : 'sessions'));
    tiles.appendChild(tile('Running', `${U.fmtNum(Store.dOut(weekKm), 1)}`, planWeek ? `of ${U.fmtNum(Store.dOut(planWeek.targetKm), 0)} ${Store.dUnit()} planned` : `${Store.dUnit()} so far`, Store.dUnit()));
    tiles.appendChild(tile('Streak', String(streak), streak === 1 ? 'day' : 'days'));
    tiles.appendChild(tile('Sets done', String(weekWorkouts.reduce((s, w) => s + Store.workoutSets(w), 0)), 'this week'));
    stack.appendChild(tiles);

    // 7-day strip
    const strip = U.el('div', { class: 'card week-strip' });
    for (let i = 0; i < 7; i++) {
      const iso = U.addDays(monday, i);
      const cell = U.el('div', { class: 'ws-day' + (iso === today ? ' today' : '') });
      cell.appendChild(U.el('div', { class: 'ws-dow', text: U.DOW_SHORT[i][0] }));
      const dots = U.el('div', { class: 'ws-dots' });
      const hasLift = S.workouts.some(w => w.date === iso);
      const hasRun = S.runs.some(r => r.date === iso);
      const planned = Marathon.dayFor(S.runPlan, iso);
      const schedLift = S.schedule[i];
      if (hasLift) dots.appendChild(U.el('span', { class: 'pill-dot' }));
      else if (schedLift && iso >= today) dots.appendChild(U.el('span', { class: 'pill-dot off' }));
      if (hasRun) dots.appendChild(U.el('span', { class: 'pill-dot run' }));
      else if (planned && iso >= today) dots.appendChild(U.el('span', { class: 'pill-dot off' }));
      cell.appendChild(dots);
      strip.appendChild(cell);
    }
    stack.appendChild(strip);

    root.appendChild(stack);
  },

  /* Race countdown card, shared with the Run tab (big = Run-tab variant) */
  raceCard(big) {
    const S = Store.state;
    const today = U.todayISO();
    const days = U.daysBetween(today, S.settings.raceDate);
    const weeks = Math.floor(days / 7), remDays = days % 7;

    const card = U.el('div', { class: 'card race-card pad-lg' });
    card.appendChild(U.el('div', { class: 'kicker', text: days >= 0 ? 'Road to' : 'Completed' }));
    card.appendChild(U.el('h2', { text: S.settings.raceName || 'Race day', style: 'font-size:19px;margin-top:2px' }));

    const heroWrap = U.el('div', { style: 'display:flex;align-items:baseline;gap:14px;margin-top:10px;flex-wrap:wrap' });
    if (days >= 0) {
      const hero = U.el('div', { class: 'hero-num' });
      hero.appendChild(document.createTextNode(String(weeks)));
      hero.appendChild(U.el('small', { text: ' wks ' }));
      hero.appendChild(document.createTextNode(String(remDays)));
      hero.appendChild(U.el('small', { text: remDays === 1 ? ' day' : ' days' }));
      heroWrap.appendChild(hero);
    } else {
      heroWrap.appendChild(U.el('div', { class: 'hero-num', text: '🎉' }));
    }
    heroWrap.appendChild(U.el('div', { class: 'small muted', text: U.fmtDate(S.settings.raceDate, 'long') }));
    card.appendChild(heroWrap);

    const plan = S.runPlan;
    if (plan && days >= 0) {
      const idx = Marathon.weekIndexOf(plan, today);
      const frac = idx >= 0 ? (idx + 1) / plan.totalWeeks : (today < plan.weeks[0].start ? 0 : 1);
      const track = U.el('div', { class: 'race-track' });
      track.appendChild(U.el('div', { style: `width:${Math.round(frac * 100)}%` }));
      card.appendChild(track);
      const wk = Marathon.weekFor(plan, today);
      card.appendChild(U.el('div', { class: 'race-meta' }, [
        U.el('span', { text: idx >= 0 ? `Week ${idx + 1} of ${plan.totalWeeks} · ${wk ? cap(wk.phase) : ''}` : 'Plan starts ' + U.fmtDate(plan.weeks[0].start, 'short') }),
        U.el('span', { text: `Peak ${U.fmtNum(Store.dOut(plan.peakVol), 0)} ${Store.dUnit()}/wk` }),
      ]));
    }

    const chipRow = U.el('div', { style: 'display:flex;gap:8px;margin-top:12px;flex-wrap:wrap' });
    if (S.settings.goalSec) chipRow.appendChild(U.el('span', { class: 'badge runb' }, [icNode('flag'), `Goal ${U.fmtDuration(S.settings.goalSec, true)}`]));
    const pred = Marathon.predict(S.runs);
    if (pred) chipRow.appendChild(U.el('span', { class: 'badge' }, [icNode('zap'), `Predicted ${U.fmtDuration(pred.sec, true)}`]));
    if (chipRow.children.length) card.appendChild(chipRow);

    if (big) {
      card.appendChild(U.el('div', { style: 'margin-top:14px' }, [
        btn('Race details & goal', 'btn ghost small', () => App.settingsModal()),
      ]));
    }
    return card;
  },
};

/* ---- tiny shared builders (globals used across views) ---- */

function btn(label, cls, onclick) {
  return U.el('button', { class: cls || 'btn', type: 'button', onclick }, label);
}
function ic(name, cls) {
  return U.el('span', { class: 'ic' + (cls ? ' ' + cls : ''), html: Icons[name] });
}
function icNode(name) { return ic(name); }
function tile(label, value, sub, unit) {
  const t = U.el('div', { class: 'tile' });
  t.appendChild(U.el('div', { class: 't-label', text: label }));
  const v = U.el('div', { class: 't-value' });
  v.appendChild(document.createTextNode(value));
  if (unit) v.appendChild(U.el('small', { text: unit }));
  t.appendChild(v);
  if (sub) t.appendChild(U.el('div', { class: 't-sub', text: sub }));
  return t;
}
function scheduledCount(S) {
  return Object.values(S.schedule).filter(Boolean).length;
}
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
