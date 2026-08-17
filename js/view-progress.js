/* Progress — strength trends, weekly volume, activity heatmap, PRs, body weight. */
'use strict';

var Views = window.Views || {};

Views.progress = {

  state() {
    App.viewState.progress = App.viewState.progress || { exId: null, metric: 'e1rm' };
    return App.viewState.progress;
  },

  render(root) {
    const S = Store.state;
    const stack = U.el('div', { class: 'stack' });

    /* ---- tiles ---- */
    const monday = U.mondayOf(U.todayISO());
    const monthStart = U.addDays(U.todayISO(), -29);
    const weekWorkouts = S.workouts.filter(w => w.date >= monday);
    const weekTonnage = weekWorkouts.reduce((s, w) => s + Store.workoutTonnage(w), 0);
    const monthSessions = S.workouts.filter(w => w.date >= monthStart).length + S.runs.filter(r => r.date >= monthStart).length;
    const streak = Store.streakDays();

    const tiles = U.el('div', { class: 'tile-row' });
    tiles.appendChild(tile('Sessions · 30 days', String(monthSessions), 'lifts + runs'));
    tiles.appendChild(tile('Tonnage this week', U.fmtNum(Store.wOut(weekTonnage), 0), null, ` ${Store.wUnit()}`));
    tiles.appendChild(tile('Streak', String(streak), streak === 1 ? 'day' : 'days'));
    tiles.appendChild(tile('Total workouts', String(S.workouts.length), 'all time'));
    stack.appendChild(tiles);

    /* ---- strength trend ---- */
    this.strengthCard(stack);

    /* ---- weekly tonnage ---- */
    const volCard = U.el('div', { class: 'card' });
    volCard.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: `Weekly tonnage (${Store.wUnit()})` })]));
    const volBox = U.el('div');
    volCard.appendChild(volBox);
    stack.appendChild(volCard);
    requestAnimationFrame(() => this.tonnageChart(volBox));

    /* ---- heatmap ---- */
    const heatCard = U.el('div', { class: 'card' });
    heatCard.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: 'Training calendar' })]));
    const heatBox = U.el('div');
    heatCard.appendChild(heatBox);
    stack.appendChild(heatCard);
    requestAnimationFrame(() => {
      const S2 = Store.state;
      Charts.heat(heatBox, {
        counts: Store.activityByDay(),
        label: 'Daily training activity over recent weeks',
        tip: iso => {
          const lifts = S2.workouts.filter(w => w.date === iso);
          const runs = S2.runs.filter(r => r.date === iso);
          const lines = [];
          for (const w of lifts) lines.push(`${w.name} · ${Store.workoutSets(w)} sets`);
          for (const r of runs) lines.push(`Run ${Store.fmtD(r.km, 1)} · ${U.fmtDuration(r.sec)}`);
          if (!lines.length) lines.push('Rest day');
          return lines;
        },
      });
    });

    /* ---- PR board ---- */
    this.prBoard(stack);

    /* ---- body weight ---- */
    this.bodyweightCard(stack);

    root.appendChild(stack);
  },

  /* ================= strength trend ================= */

  strengthCard(stack) {
    const S = Store.state;
    const vs = this.state();

    const trained = Store.allExercises()
      .map(ex => ({ ex, hist: Store.exHistory(ex.id) }))
      .filter(x => x.hist.length >= 1)
      .sort((a, b) => b.hist[b.hist.length - 1].date < a.hist[a.hist.length - 1].date ? -1 : 1);

    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: 'Strength progress' })]));

    if (!trained.length) {
      card.appendChild(U.el('div', { class: 'empty-state' }, [
        ic('chart'),
        U.el('div', { class: 'es-title', text: 'No lifts logged yet' }),
        U.el('div', { class: 'small', text: 'Finish a workout and your progress charts appear here.' }),
      ]));
      stack.appendChild(card);
      return;
    }

    if (!vs.exId || !trained.some(t => t.ex.id === vs.exId)) vs.exId = trained[0].ex.id;
    const current = trained.find(t => t.ex.id === vs.exId);
    const ex = current.ex;
    const hist = current.hist;

    const sel = U.el('select', { 'aria-label': 'Exercise', style: 'margin-bottom:10px' });
    for (const t of trained) {
      const o = U.el('option', { value: t.ex.id, text: t.ex.name });
      if (t.ex.id === vs.exId) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => { vs.exId = sel.value; App.render(); });
    card.appendChild(sel);

    // metric picker for weight-tracked lifts
    let metric = vs.metric;
    if (ex.track === 'wr') {
      const seg = U.el('div', { class: 'seg', style: 'margin-bottom:10px' });
      for (const [key, label] of [['e1rm', 'Est. 1RM'], ['top', 'Top set'], ['vol', 'Volume']]) {
        const b = U.el('button', { class: metric === key ? 'on' : '', type: 'button', text: label });
        b.addEventListener('click', () => { vs.metric = key; App.render(); });
        seg.appendChild(b);
      }
      card.appendChild(seg);
    } else {
      metric = ex.track === 'time' ? 'time' : 'reps';
    }

    const pts = hist.map(h => {
      let y, tip;
      if (metric === 'e1rm') { y = Store.wOut(Store.e1rm(h.best.w, h.best.r)); tip = [`Top set ${setStr(h.best, 'wr')}`]; }
      else if (metric === 'top') { y = Store.wOut(h.best.w || 0); tip = [`${h.best.r} reps`]; }
      else if (metric === 'vol') { y = Store.wOut(h.sets.reduce((s, x) => s + (x.w || 0) * (x.r || 0), 0)); tip = [`${h.sets.length} sets`]; }
      else if (metric === 'time') { y = h.best.sec || 0; tip = [setsSummary(h.sets, 'time')]; }
      else { y = h.best.r || 0; tip = [setsSummary(h.sets, 'bw')]; }
      return { x: U.isoToDate(h.date).getTime(), y, tip };
    }).filter(p => p.y > 0);

    const yFmt = metric === 'time' ? (v => U.fmtDuration(v)) : (v => U.fmtNum(v, 0));
    const metricName = { e1rm: `Est. 1RM (${Store.wUnit()})`, top: `Top set (${Store.wUnit()})`, vol: `Session volume (${Store.wUnit()})`, reps: 'Best reps', time: 'Best time' }[metric];

    const chartBox = U.el('div');
    card.appendChild(chartBox);
    requestAnimationFrame(() => {
      Charts.line(chartBox, {
        height: 210,
        label: `${ex.name} — ${metricName} over time`,
        series: [{ name: metricName, color: '--viz-s1', points: pts }],
        yFmt,
        table: {
          cols: ['Date', metricName],
          rows: [...pts].reverse().map(p => [U.fmtDate(U.dateToISO(new Date(p.x))), yFmt(p.y)]),
        },
        empty: 'Log a couple of sessions to see the trend.',
      });
    });

    const pr = Store.prsFor(ex.id);
    const prRow = U.el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px' });
    if (pr.maxW) prRow.appendChild(U.el('span', { class: 'badge good' }, [icNode('trophy'), `Heaviest ${U.fmtNum(Store.wOut(pr.maxW.w), 1)} ${Store.wUnit()} × ${pr.maxW.r}`]));
    if (pr.e1rm) prRow.appendChild(U.el('span', { class: 'badge' }, [`Best e1RM ${U.fmtNum(Store.wOut(pr.e1rm.val), 1)} ${Store.wUnit()}`]));
    if (pr.maxReps) prRow.appendChild(U.el('span', { class: 'badge good' }, [icNode('trophy'), `Best ${pr.maxReps.r} reps`]));
    if (pr.maxSec) prRow.appendChild(U.el('span', { class: 'badge good' }, [icNode('trophy'), `Longest ${U.fmtDuration(pr.maxSec.sec)}`]));
    if (prRow.children.length) card.appendChild(prRow);

    stack.appendChild(card);
  },

  tonnageChart(box) {
    const weeks = 12;
    const data = Store.weeklyLifting(weeks);
    const thisMonday = U.mondayOf(U.todayISO());
    const items = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const monday = U.addDays(thisMonday, -7 * i);
      const d = data.get(monday);
      items.push({
        label: U.fmtDate(monday, 'short'),
        tipTitle: 'w/c ' + U.fmtDate(monday, 'dow'),
        value: d ? Math.round(Store.wOut(d.tonnage)) : 0,
        tip: d ? [`${d.sessions} session${d.sessions === 1 ? '' : 's'} · ${d.sets} sets`] : ['No lifts'],
      });
    }
    Charts.bars(box, {
      height: 200,
      label: 'Total weight lifted per week',
      color: '--viz-s1',
      valueName: 'Tonnage',
      yFmt: v => v >= 10000 ? `${U.fmtNum(v / 1000, 0)}k` : U.fmtNum(v, 0),
      items,
      table: {
        cols: ['Week', `Tonnage (${Store.wUnit()})`],
        rows: [...items].reverse().map(i => [i.tipTitle, U.fmtNum(i.value, 0)]),
      },
      empty: 'Finish a workout to see weekly volume.',
    });
  },

  /* ================= PR board ================= */

  prBoard(stack) {
    const S = Store.state;
    const entries = [];
    for (const ex of Store.allExercises()) {
      if (ex.track !== 'wr') continue;
      const pr = Store.prsFor(ex.id);
      if (pr && pr.e1rm) entries.push({ ex, pr });
    }
    if (!entries.length) return;
    entries.sort((a, b) => b.pr.e1rm.val - a.pr.e1rm.val);

    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [ic('trophy', 'accent'), U.el('h2', { text: 'Personal records' })]));
    const list = U.el('div', { class: 'rowlist' });
    for (const { ex, pr } of entries.slice(0, 10)) {
      const row = U.el('div', { class: 'row tappable', onclick: () => Views.plan.exerciseDetail(ex.id) });
      row.appendChild(U.el('div', { class: 'grow' }, [
        U.el('div', { class: 'title', text: ex.name }),
        U.el('div', { class: 'sub', text: `${U.fmtNum(Store.wOut(pr.e1rm.w), 1)} ${Store.wUnit()} × ${pr.e1rm.r} on ${U.fmtDate(pr.e1rm.date)}` }),
      ]));
      row.appendChild(U.el('span', { class: 'badge accent tnum', text: `e1RM ${U.fmtNum(Store.wOut(pr.e1rm.val), 0)}` }));
      list.appendChild(row);
    }
    card.appendChild(list);
    stack.appendChild(card);
  },

  /* ================= body weight ================= */

  bodyweightCard(stack) {
    const S = Store.state;
    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [ic('scale', 'accent'), U.el('h2', { text: 'Body weight' })]));

    const addRow = U.el('div', { style: 'display:flex;gap:8px' });
    const input = U.el('input', { type: 'text', inputmode: 'decimal', placeholder: `Today’s weight (${Store.wUnit()})`, style: 'flex:1' });
    addRow.appendChild(input);
    addRow.appendChild(btn('Save', 'btn small', () => {
      const v = parseNum(input.value, true);
      if (!v) { App.toast('Enter your weight'); return; }
      const kg = Store.wIn(v);
      const today = U.todayISO();
      S.bodyweight = S.bodyweight.filter(b => b.date !== today);
      S.bodyweight.push({ date: today, kg });
      S.bodyweight.sort((a, b) => a.date < b.date ? -1 : 1);
      Store.save();
      App.toast('Weight logged', { icon: 'check', kind: 'good' });
      App.render();
    }));
    card.appendChild(addRow);

    if (S.bodyweight.length) {
      const latest = S.bodyweight[S.bodyweight.length - 1];
      const monthAgo = U.addDays(U.todayISO(), -30);
      const past = [...S.bodyweight].filter(b => b.date <= monthAgo).pop();
      let deltaTxt = '';
      if (past) {
        const d = latest.kg - past.kg;
        deltaTxt = ` · ${d >= 0 ? '+' : ''}${U.fmtNum(Store.wOut(d), 1)} ${Store.wUnit()} vs 30 days ago`;
      }
      card.appendChild(U.el('p', { class: 'small muted', style: 'margin-top:8px', text: `Latest ${Store.fmtW(latest.kg)} (${U.relDay(latest.date)})${deltaTxt}` }));

      if (S.bodyweight.length >= 2) {
        const chartBox = U.el('div', { style: 'margin-top:8px' });
        card.appendChild(chartBox);
        requestAnimationFrame(() => {
          Charts.line(chartBox, {
            height: 170,
            label: 'Body weight over time',
            series: [{
              name: 'Weight', color: '--viz-s1',
              points: S.bodyweight.map(b => ({ x: U.isoToDate(b.date).getTime(), y: Store.wOut(b.kg) })),
            }],
            yFmt: v => U.fmtNum(v, 1),
            table: {
              cols: ['Date', `Weight (${Store.wUnit()})`],
              rows: [...S.bodyweight].reverse().map(b => [U.fmtDate(b.date), U.fmtNum(Store.wOut(b.kg), 1)]),
            },
          });
        });
      }
    }
    stack.appendChild(card);
  },
};
