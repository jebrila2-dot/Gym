/* Run — marathon HQ: countdown, generated plan, run log, charts, predictor, pace zones. */
'use strict';

var Views = window.Views || {};

Views.run = {

  render(root) {
    const S = Store.state;
    const stack = U.el('div', { class: 'stack' });

    stack.appendChild(Views.today.raceCard(true));

    if (!S.runPlan) {
      const c = U.el('div', { class: 'card pad-lg' });
      c.appendChild(U.el('div', { class: 'card-head' }, [ic('run', 'runc'), U.el('h2', { text: 'Build your marathon plan' })]));
      c.appendChild(U.el('p', {
        class: 'small', style: 'color:var(--ink-2)',
        text: 'A week-by-week programme to the start line: base building, a build phase with tempo and interval work, peak long runs of 30–32 km, then a three-week taper. It adapts to your current mileage and how many days you can run.',
      }));
      c.appendChild(U.el('div', { style: 'margin-top:14px' }, [
        btn('Build my plan', 'btn run block', () => this.planWizard()),
      ]));
      stack.appendChild(c);
    } else {
      this.thisWeekCard(stack);
    }

    // quick log
    stack.appendChild(btn('+ Log a run', 'btn run block', () => this.logRunModal({})));

    // charts
    if (S.runs.length || S.runPlan) {
      const chartCard = U.el('div', { class: 'card' });
      chartCard.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: `Weekly distance (${Store.dUnit()})` })]));
      const weeklyBox = U.el('div');
      chartCard.appendChild(weeklyBox);
      stack.appendChild(chartCard);
      requestAnimationFrame(() => this.weeklyChart(weeklyBox));
    }

    if (S.runs.length >= 2) {
      const paceCard = U.el('div', { class: 'card' });
      paceCard.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: `Pace trend (${Store.paceUnit().slice(1)} pace — higher is faster)` })]));
      const paceBox = U.el('div');
      paceCard.appendChild(paceBox);
      stack.appendChild(paceCard);
      requestAnimationFrame(() => this.paceChart(paceBox));
    }

    this.predictorCard(stack);
    if (S.runPlan) this.planOverviewCard(stack);
    this.recentRunsCard(stack);

    root.appendChild(stack);
  },

  /* ================= this week ================= */

  thisWeekCard(stack) {
    const S = Store.state;
    const today = U.todayISO();
    const plan = S.runPlan;
    const wk = Marathon.weekFor(plan, today);
    const idx = Marathon.weekIndexOf(plan, today);

    const card = U.el('div', { class: 'card' });
    const head = U.el('div', { class: 'card-head' }, [U.el('h2', { text: 'This week' })]);
    if (wk) head.appendChild(U.el('span', { class: `phase-tag ${wk.phase}`, text: wk.phase === 'race' ? 'Race week!' : cap(wk.phase) }));
    card.appendChild(head);

    if (!wk) {
      const first = plan.weeks[0];
      card.appendChild(U.el('p', {
        class: 'small muted',
        text: today < first.start
          ? `Your plan starts ${U.fmtDate(first.start, 'long')} — keep running easy until then.`
          : 'The plan has finished — congratulations on the journey!',
      }));
      stack.appendChild(card);
      return;
    }

    const weekRuns = Store.runsInWeek(wk.start);
    const doneKm = weekRuns.reduce((s, r) => s + r.km, 0);
    card.appendChild(U.el('p', {
      class: 'small muted', style: 'margin-bottom:10px',
      text: `Week ${idx + 1} of ${plan.totalWeeks} · ${Store.fmtD(doneKm, 1)} of ${Store.fmtD(wk.targetKm, 0)} done`,
    }));

    const days = U.el('div', { style: 'display:flex;flex-direction:column;gap:9px' });
    for (const d of wk.days) {
      const iso = U.addDays(wk.start, d.dow);
      const done = S.runs.some(r => r.date === iso);
      const row = U.el('div', { class: 'runday' + (done ? ' done' : ''), style: 'cursor:pointer', role: 'button', tabindex: '0' });
      row.appendChild(U.el('span', { class: 'rd-dow', text: U.DOW_SHORT[d.dow] + (iso === today ? ' •' : '') }));
      row.appendChild(U.el('span', { class: `type-dot ${d.type}` }));
      row.appendChild(U.el('span', { class: 'rd-desc small', text: d.desc }));
      row.appendChild(U.el('span', { class: 'rd-km small', text: Store.fmtD(d.km, 1) }));
      if (done) { const chk = U.el('span', { class: 'rd-check' }); chk.appendChild(ic('check')); row.appendChild(chk); }
      row.addEventListener('click', () => {
        if (!done) this.logRunModal({ date: iso, km: d.km, type: d.type === 'race' ? 'race' : d.type });
      });
      days.appendChild(row);
    }
    card.appendChild(days);
    stack.appendChild(card);
  },

  /* ================= charts ================= */

  weeklyChart(box) {
    const S = Store.state;
    const summary = Marathon.weeklySummary(S.runs, S.runPlan, 10);
    Charts.bars(box, {
      height: 205,
      label: 'Weekly running distance, actual versus plan',
      color: '--viz-s2',
      valueName: 'Actual',
      tickName: 'Plan',
      yFmt: v => U.fmtNum(v, 0),
      items: summary.map(w => ({
        label: U.fmtDate(w.monday, 'short'),
        tipTitle: 'w/c ' + U.fmtDate(w.monday, 'dow'),
        value: U.round1(Store.dOut(w.actualKm)),
        tick: w.planKm != null ? U.round1(Store.dOut(w.planKm)) : null,
        tip: [`${w.runs.length} run${w.runs.length === 1 ? '' : 's'}`],
      })),
      table: {
        cols: ['Week', `Actual (${Store.dUnit()})`, `Plan (${Store.dUnit()})`, 'Runs'],
        rows: [...summary].reverse().map(w => [
          'w/c ' + U.fmtDate(w.monday), U.fmtNum(Store.dOut(w.actualKm), 1),
          w.planKm != null ? U.fmtNum(Store.dOut(w.planKm), 1) : '–', String(w.runs.length),
        ]),
      },
      empty: 'Log your first run to see weekly distance.',
    });
  },

  paceChart(box) {
    const S = Store.state;
    const horizon = U.addDays(U.todayISO(), -120);
    const runs = S.runs.filter(r => r.date >= horizon && r.sec > 0 && r.km > 0);
    Charts.line(box, {
      height: 200,
      label: 'Average pace per run over time; higher on the chart is faster',
      invertY: true,
      series: [{
        name: 'Pace', color: '--viz-s2',
        points: runs.map(r => ({
          x: U.isoToDate(r.date).getTime(),
          y: Store.paceOut(r.sec / r.km),
          tip: [`${Marathon.TYPE_LABEL[r.type] || 'Run'} · ${Store.fmtD(r.km, 1)} in ${U.fmtDuration(r.sec)}`],
        })),
      }],
      yFmt: v => U.fmtPaceVal(v),
      table: {
        cols: ['Date', 'Type', `Dist (${Store.dUnit()})`, 'Time', `Pace (${Store.paceUnit()})`],
        rows: [...runs].reverse().map(r => [
          U.fmtDate(r.date), Marathon.TYPE_LABEL[r.type] || 'Run',
          U.fmtNum(Store.dOut(r.km), 1), U.fmtDuration(r.sec), U.fmtPaceVal(Store.paceOut(r.sec / r.km)),
        ]),
      },
      empty: 'Not enough runs yet.',
    });
  },

  /* ================= predictor & paces ================= */

  predictorCard(stack) {
    const S = Store.state;
    const pred = Marathon.predict(S.runs);
    const goal = S.settings.goalSec;
    const basis = goal || (pred && pred.sec);

    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [ic('zap', 'runc'), U.el('h2', { text: 'Race predictor & paces' })]));

    if (pred) {
      const row = U.el('div', { style: 'display:flex;align-items:baseline;gap:10px;flex-wrap:wrap' });
      row.appendChild(U.el('div', { class: 'hero-num', style: 'font-size:34px', text: U.fmtDuration(pred.sec, true) }));
      row.appendChild(U.el('div', { class: 'small muted', text: `predicted, from your ${Store.fmtD(pred.run.km, 1)} on ${U.fmtDate(pred.run.date)}` }));
      card.appendChild(row);
      if (goal) {
        const diff = pred.sec - goal;
        const ahead = diff <= 0;
        card.appendChild(U.el('p', {
          class: 'small', style: `margin-top:4px;font-weight:650;color:${ahead ? 'var(--good-text)' : 'var(--ink-2)'}`,
          text: ahead
            ? `${U.fmtDuration(-diff)} ahead of your ${U.fmtDuration(goal, true)} goal`
            : `${U.fmtDuration(diff)} behind your ${U.fmtDuration(goal, true)} goal — trust the block, it compounds`,
        }));
      }
      if (pred.note) card.appendChild(U.el('p', { class: 'small muted', style: 'margin-top:4px', text: pred.note }));
    } else {
      card.appendChild(U.el('p', { class: 'small muted', text: 'Log a hard effort of 8 km or more and I’ll predict your marathon time (Riegel formula).' }));
    }

    if (basis) {
      const p = Marathon.paces(basis);
      card.appendChild(U.el('div', { class: 'kicker', style: 'margin:14px 0 6px', text: goal ? 'Training paces (from goal)' : 'Training paces (from prediction)' }));
      const tbl = U.el('table', { class: 'viz-table' });
      const rows = [
        ['Recovery', `${fmtPaceRange(p.recovery)}`],
        ['Easy / long-run', `${fmtPaceRange(p.easy)}`],
        ['Marathon pace', Store.fmtPace(p.mp)],
        ['Tempo (threshold)', Store.fmtPace(p.threshold)],
        ['Intervals (5K–10K)', Store.fmtPace(p.interval)],
      ];
      const tb = U.el('tbody');
      for (const [name, val] of rows) {
        const tr = U.el('tr');
        tr.appendChild(U.el('td', { text: name }));
        tr.appendChild(U.el('td', { text: val, class: 'tnum' }));
        tb.appendChild(tr);
      }
      tbl.appendChild(tb);
      card.appendChild(tbl);
      card.appendChild(U.el('p', { class: 'small muted', style: 'margin-top:8px', text: 'Guideline ranges — most training should feel genuinely easy. Set your goal time in Settings.' }));
    }
    stack.appendChild(card);
  },

  /* ================= plan overview ================= */

  planOverviewCard(stack) {
    const S = Store.state;
    const plan = S.runPlan;
    const today = U.todayISO();
    const curIdx = Marathon.weekIndexOf(plan, today);

    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [
      U.el('h2', { text: 'Full plan' }),
      U.el('span', { class: 'badge', text: `${plan.totalWeeks} weeks` }),
    ]));

    App.viewState.run = App.viewState.run || {};
    const vs = App.viewState.run;
    if (vs.openWeek == null) vs.openWeek = curIdx;

    plan.weeks.forEach((w, i) => {
      const row = U.el('div', { class: 'week-row' + (i === curIdx ? ' current' : '') });
      const head = U.el('div', { class: 'wr-head', role: 'button', tabindex: '0' });
      head.appendChild(U.el('span', { class: `phase-tag ${w.phase}`, text: w.phase === 'race' ? 'Race' : cap(w.phase) }));
      head.appendChild(U.el('span', { class: 'wr-title', text: `Wk ${i + 1} · ${U.fmtDate(w.start, 'short')}` }));
      const weekRuns = Store.runsInWeek(w.start);
      const doneKm = weekRuns.reduce((s, r) => s + r.km, 0);
      head.appendChild(U.el('span', {
        class: 'wr-km',
        text: w.start <= today && doneKm > 0
          ? `${U.fmtNum(Store.dOut(doneKm), 0)} / ${U.fmtNum(Store.dOut(w.targetKm), 0)} ${Store.dUnit()}`
          : `${U.fmtNum(Store.dOut(w.targetKm), 0)} ${Store.dUnit()}`,
      }));
      const chev = ic('chevD', 'chev');
      head.appendChild(chev);
      head.addEventListener('click', () => { vs.openWeek = vs.openWeek === i ? -1 : i; App.render(); });
      row.appendChild(head);

      if (vs.openWeek === i) {
        const daysBox = U.el('div', { class: 'wr-days' });
        for (const d of w.days) {
          const iso = U.addDays(w.start, d.dow);
          const done = S.runs.some(r => r.date === iso);
          const dr = U.el('div', { class: 'runday' + (done ? ' done' : '') });
          dr.appendChild(U.el('span', { class: 'rd-dow', text: U.DOW_SHORT[d.dow] }));
          dr.appendChild(U.el('span', { class: `type-dot ${d.type}` }));
          dr.appendChild(U.el('span', { class: 'rd-desc small', text: d.desc }));
          dr.appendChild(U.el('span', { class: 'rd-km small', text: Store.fmtD(d.km, 1) }));
          if (done) { const chk = U.el('span', { class: 'rd-check' }); chk.appendChild(ic('check')); dr.appendChild(chk); }
          daysBox.appendChild(dr);
        }
        row.appendChild(daysBox);
      }
      card.appendChild(row);
    });

    card.appendChild(U.el('div', { style: 'margin-top:12px;display:flex;gap:8px' }, [
      btn('Rebuild plan', 'btn ghost small', () => this.planWizard(true)),
    ]));
    stack.appendChild(card);
  },

  /* ================= recent runs ================= */

  recentRunsCard(stack) {
    const S = Store.state;
    if (!S.runs.length) return;
    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: 'Recent runs' })]));
    const list = U.el('div', { class: 'rowlist' });
    for (const r of [...S.runs].reverse().slice(0, 10)) {
      const row = U.el('div', { class: 'row tappable', onclick: () => this.runDetail(r) });
      row.appendChild(U.el('span', { class: `type-dot ${r.type}` }));
      row.appendChild(U.el('div', { class: 'grow' }, [
        U.el('div', { class: 'title', text: `${Store.fmtD(r.km, 1)} ${Marathon.TYPE_LABEL[r.type] ? Marathon.TYPE_LABEL[r.type].toLowerCase() : 'run'}` }),
        U.el('div', { class: 'sub', text: `${U.relDay(r.date)} · ${U.fmtDuration(r.sec)} · ${Store.fmtPace(r.sec / r.km)}` }),
      ]));
      row.appendChild(ic('chevR', 'chev'));
      list.appendChild(row);
    }
    card.appendChild(list);
    stack.appendChild(card);
  },

  runDetail(r) {
    App.modal({
      title: `${Store.fmtD(r.km, 1)} ${Marathon.TYPE_LABEL[r.type] ? Marathon.TYPE_LABEL[r.type].toLowerCase() : 'run'}`,
      body: box => {
        const facts = [
          ['Date', U.fmtDate(r.date, 'long')],
          ['Time', U.fmtDuration(r.sec)],
          ['Pace', Store.fmtPace(r.sec / r.km)],
        ];
        if (r.hr) facts.push(['Avg heart rate', `${r.hr} bpm`]);
        const tbl = U.el('table', { class: 'viz-table' });
        const tb = U.el('tbody');
        for (const [k, v] of facts) {
          const tr = U.el('tr');
          tr.appendChild(U.el('td', { text: k }));
          tr.appendChild(U.el('td', { text: v }));
          tb.appendChild(tr);
        }
        tbl.appendChild(tb);
        box.appendChild(tbl);
        if (r.note) box.appendChild(U.el('p', { class: 'small', style: 'margin-top:12px;font-style:italic', text: `“${r.note}”` }));
      },
      foot: [
        { label: 'Delete', class: 'btn ghost', onClick: async close => {
          const sure = await App.confirm('Delete this run?', { danger: true, ok: 'Delete' });
          if (!sure) return;
          Store.deleteRun(r.id);
          close(); App.render();
        } },
        { label: 'Close', class: 'btn', onClick: close => close() },
      ],
    });
  },

  /* ================= log run ================= */

  logRunModal(prefill) {
    const S = Store.state;
    App.modal({
      title: 'Log a run',
      body: box => {
        const form = U.el('div', { class: 'form-grid' });

        const date = U.el('input', { type: 'date', value: prefill.date || U.todayISO() });
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Date' }), date]));

        const type = U.el('select');
        for (const t of ['easy', 'long', 'tempo', 'intervals', 'race', 'recovery', 'cross']) {
          const o = U.el('option', { value: t, text: Marathon.TYPE_LABEL[t] });
          if ((prefill.type || 'easy') === t) o.selected = true;
          type.appendChild(o);
        }
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Type' }), type]));

        const dist = U.el('input', { type: 'text', inputmode: 'decimal', placeholder: 'e.g. 10' });
        if (prefill.km) dist.value = String(U.round1(Store.dOut(prefill.km)));
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: `Distance (${Store.dUnit()})` }), dist]));

        const time = U.el('input', { type: 'text', inputmode: 'numeric', placeholder: 'h:mm:ss or mm:ss' });
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Time' }), time]));

        const hr = U.el('input', { type: 'text', inputmode: 'numeric', placeholder: 'optional' });
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Avg HR (bpm)' }), hr]));

        const paceOut = U.el('div', { class: 'field' }, [U.el('label', { text: 'Pace' }), U.el('div', { class: 'badge', style: 'font-size:14px;padding:10px 14px', text: '–' })]);
        form.appendChild(paceOut);

        const note = U.el('textarea', { placeholder: 'How did it feel? (optional)', rows: 2 });
        form.appendChild(U.el('div', { class: 'field wide' }, [U.el('label', { text: 'Notes' }), note]));

        const updatePace = () => {
          const km = Store.dIn(parseNum(dist.value, true));
          const sec = U.parseDuration(time.value);
          paceOut.querySelector('.badge').textContent = km && sec ? Store.fmtPace(sec / km) : '–';
        };
        dist.addEventListener('input', updatePace);
        time.addEventListener('input', updatePace);

        box.appendChild(form);
        box._get = () => ({
          date: date.value || U.todayISO(),
          type: type.value,
          km: Store.dIn(parseNum(dist.value, true)),
          sec: U.parseDuration(time.value),
          hr: parseNum(hr.value, false),
          note: note.value.trim(),
        });
      },
      foot: [
        { label: 'Cancel', class: 'btn ghost', onClick: close => close() },
        { label: 'Save run', class: 'btn run', onClick: (close, box) => {
          const data = box._get();
          if (!data.km || data.km <= 0) { App.toast('Enter a distance'); return; }
          if (!data.sec) { App.toast('Enter a time like 52:30'); return; }
          Store.addRun(data);
          close();
          App.toast('Run logged', { icon: 'check', kind: 'good' });
          App.render();
        } },
      ],
    });
  },

  /* ================= plan wizard ================= */

  planWizard(isRebuild) {
    const S = Store.state;
    const existing = S.runPlan;
    App.modal({
      title: isRebuild ? 'Rebuild marathon plan' : 'Build marathon plan',
      body: box => {
        if (isRebuild) {
          box.appendChild(U.el('p', { class: 'small muted', style: 'margin-bottom:12px', text: 'This replaces your current plan (logged runs are kept).' }));
        }
        const form = U.el('div', { class: 'form-grid' });

        const race = U.el('input', { type: 'date', value: S.settings.raceDate });
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Race day' }), race]));

        const rpw = U.el('select');
        for (const n of [3, 4, 5]) {
          const o = U.el('option', { value: String(n), text: `${n} days / week` });
          if ((existing ? existing.params.runsPerWeek : 4) === n) o.selected = true;
          rpw.appendChild(o);
        }
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Run days' }), rpw]));

        const cur = U.el('input', { type: 'text', inputmode: 'decimal', placeholder: 'e.g. 20' });
        if (existing) cur.value = String(U.round1(Store.dOut(existing.params.currentKm)));
        form.appendChild(U.el('div', { class: 'field' }, [
          U.el('label', { text: `Current weekly distance (${Store.dUnit()})` }), cur,
          U.el('span', { class: 'hint', text: 'A typical recent week' }),
        ]));

        const lng = U.el('input', { type: 'text', inputmode: 'decimal', placeholder: 'e.g. 8' });
        if (existing) lng.value = String(U.round1(Store.dOut(existing.params.longestKm)));
        form.appendChild(U.el('div', { class: 'field' }, [
          U.el('label', { text: `Longest recent run (${Store.dUnit()})` }), lng,
          U.el('span', { class: 'hint', text: 'In the last few weeks' }),
        ]));

        box.appendChild(form);
        box.appendChild(U.el('p', {
          class: 'small muted', style: 'margin-top:14px',
          text: 'The plan follows mainstream marathon-training structure: gradual volume growth (~10 % a week with a cutback every 4th), one quality session a week, long runs peaking at 30–32 km, and a 3-week taper. It’s a template, not a coach — ease off when your body asks, and see a professional for pain or health concerns.',
        }));
        box._get = () => ({
          raceDate: race.value,
          runsPerWeek: parseInt(rpw.value, 10),
          currentKm: Store.dIn(parseNum(cur.value, true)) || 20,
          longestKm: Store.dIn(parseNum(lng.value, true)) || 8,
          startISO: U.todayISO(),
        });
      },
      foot: [
        { label: 'Cancel', class: 'btn ghost', onClick: close => close() },
        { label: 'Generate plan', class: 'btn run', onClick: (close, box) => {
          const params = box._get();
          if (!params.raceDate || params.raceDate <= U.todayISO()) { App.toast('Pick a future race date'); return; }
          const weeksOut = Math.round(U.daysBetween(U.mondayOf(U.todayISO()), U.mondayOf(params.raceDate)) / 7) + 1;
          if (weeksOut < 4) { App.toast('That race is very close — pick a later one'); return; }
          const plan = Marathon.generate(params);
          if (!plan) { App.toast('Could not build a plan for those dates'); return; }
          S.settings.raceDate = params.raceDate;
          S.runPlan = plan;
          if (App.viewState.run) App.viewState.run.openWeek = null;
          Store.save();
          close();
          App.toast(`${plan.totalWeeks}-week plan ready`, { icon: 'flag', kind: 'good' });
          if (weeksOut < 12) App.toast('Short runway — the plan compresses the build. Be patient with yourself.');
          App.render();
        } },
      ],
    });
  },
};

function fmtPaceRange(range) {
  return `${U.fmtPaceVal(Store.paceOut(range[0]))}–${U.fmtPaceVal(Store.paceOut(range[1]))} ${Store.paceUnit()}`;
}
