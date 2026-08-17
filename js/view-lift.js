/* Lift — start & log workouts: sets, reps, weight, rest timer, PR detection, history. */
'use strict';

var Views = window.Views || {};

Views.lift = {

  render(root) {
    if (Store.state.activeWorkout) this.renderActive(root);
    else this.renderStart(root);
  },

  /* ================= start screen ================= */

  renderStart(root) {
    const S = Store.state;
    const today = U.todayISO();
    const stack = U.el('div', { class: 'stack' });

    const dow = U.dowIdx(today);
    const scheduled = S.routines.find(r => r.id === S.schedule[dow]);

    if (scheduled) {
      const c = U.el('div', { class: 'card pad-lg' });
      c.appendChild(U.el('div', { class: 'kicker', text: 'Scheduled today' }));
      c.appendChild(U.el('h2', { text: scheduled.name, style: 'font-size:20px;margin-top:4px' }));
      c.appendChild(U.el('p', { class: 'small muted', style: 'margin-top:3px', text: routineMeta(scheduled) }));
      c.appendChild(U.el('div', { style: 'margin-top:14px' }, [
        btn('Start workout', 'btn block', () => { this.startWorkout(scheduled.id); App.render(); }),
      ]));
      stack.appendChild(c);
    }

    // other routines
    const others = S.routines.filter(r => !scheduled || r.id !== scheduled.id);
    if (others.length) {
      const card = U.el('div', { class: 'card' });
      card.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: scheduled ? 'Or pick another' : 'Start a workout' })]));
      const list = U.el('div', { class: 'rowlist' });
      for (const r of others) {
        const row = U.el('div', { class: 'row tappable', onclick: () => { this.startWorkout(r.id); App.render(); } });
        row.appendChild(U.el('div', { class: 'grow' }, [
          U.el('div', { class: 'title', text: r.name }),
          U.el('div', { class: 'sub', text: routineMeta(r) }),
        ]));
        row.appendChild(ic('play', 'chev'));
        list.appendChild(row);
      }
      card.appendChild(list);
      const foot = U.el('div', { style: 'display:flex;gap:8px;margin-top:12px' });
      foot.appendChild(btn('Empty workout', 'btn ghost small', () => { this.startWorkout(null); App.render(); }));
      if (S.workouts.length) {
        foot.appendChild(btn('Repeat last', 'btn ghost small', () => { this.repeatLast(); App.render(); }));
      }
      foot.appendChild(btn('Edit routines', 'btn ghost small', () => App.go('plan', { sub: 'routines' })));
      card.appendChild(foot);
      stack.appendChild(card);
    }

    // history (paginated)
    App.viewState.lift = App.viewState.lift || {};
    const vs = App.viewState.lift;
    vs.histN = vs.histN || 10;
    const all = [...S.workouts].sort((a, b) => b.date < a.date ? -1 : 1);
    if (all.length) {
      const card = U.el('div', { class: 'card' });
      card.appendChild(U.el('div', { class: 'card-head' }, [
        U.el('h2', { text: 'History' }),
        U.el('span', { class: 'badge', text: String(all.length) }),
      ]));
      const list = U.el('div', { class: 'rowlist' });
      for (const w of all.slice(0, vs.histN)) {
        const row = U.el('div', { class: 'row tappable', onclick: () => this.workoutDetail(w) });
        const dur = w.endTs && w.startTs ? Math.round((w.endTs - w.startTs) / 60000) : null;
        row.appendChild(U.el('div', { class: 'grow' }, [
          U.el('div', { class: 'title', text: w.name }),
          U.el('div', { class: 'sub', text: `${U.relDay(w.date)} · ${Store.workoutSets(w)} sets · ${U.fmtNum(Store.wOut(Store.workoutTonnage(w)), 0)} ${Store.wUnit()}${dur ? ` · ${dur} min` : ''}` }),
        ]));
        row.appendChild(ic('chevR', 'chev'));
        list.appendChild(row);
      }
      card.appendChild(list);
      if (all.length > vs.histN) {
        card.appendChild(U.el('div', { class: 'show-more' }, [
          btn(`Show more (${all.length - vs.histN} older)`, 'btn ghost small block', () => { vs.histN += 20; App.render(); }),
        ]));
      }
      stack.appendChild(card);
    } else if (!scheduled && !others.length) {
      stack.appendChild(emptyCard('barbell', 'No routines yet', 'Create one in the Plan tab to get going.'));
    }

    root.appendChild(stack);
  },

  /* ================= workout lifecycle ================= */

  startWorkout(routineId) {
    const S = Store.state;
    if (S.activeWorkout) return;
    const routine = S.routines.find(r => r.id === routineId);
    const w = {
      id: U.uid(),
      date: U.todayISO(),
      name: routine ? routine.name : 'Workout',
      routineId: routine ? routine.id : null,
      startTs: Date.now(),
      endTs: null,
      note: '',
      entries: [],
    };
    if (routine) {
      for (const it of routine.items) {
        w.entries.push(this.makeEntry(it.exerciseId, it.sets, it.repsMin, it.repsMax, it.restSec));
      }
    }
    S.activeWorkout = w;
    Store.save();
  },

  makeEntry(exerciseId, nSets, repsMin, repsMax, restSec) {
    return {
      exerciseId,
      repsMin: repsMin || null,
      repsMax: repsMax || null,
      restSec: restSec || null,
      sets: Array.from({ length: nSets || 3 }, () => ({ w: null, r: null, sec: null, done: false })),
    };
  },

  repeatLast() {
    const S = Store.state;
    const last = [...S.workouts].sort((a, b) => b.date < a.date ? -1 : 1)[0];
    if (!last) return;
    this.startWorkout(null);
    S.activeWorkout.name = last.name;
    S.activeWorkout.routineId = last.routineId;
    S.activeWorkout.entries = last.entries.map(en =>
      this.makeEntry(en.exerciseId, en.sets.length, en.repsMin, en.repsMax, en.restSec));
    Store.save();
  },

  // Load a finished workout back into the editor; finishing replaces the original.
  editWorkout(w) {
    const S = Store.state;
    if (S.activeWorkout) {
      App.toast('Finish or discard the current workout first');
      return;
    }
    S.activeWorkout = JSON.parse(JSON.stringify(w));
    S.activeWorkout._editingId = w.id;
    Store.save();
    App.go('lift');
  },

  finishWorkout() {
    const S = Store.state;
    const w = S.activeWorkout;
    if (!w) return;
    const hasData = s => s.w != null || s.r != null || s.sec != null;
    const filled = w.entries.reduce((n, en) => n + en.sets.filter(s => !s.done && hasData(s)).length, 0);
    if (filled > 0) {
      // Sets with values but no ✓ — never drop silently.
      App.modal({
        title: `${filled} filled ${filled === 1 ? 'set' : 'sets'} not ticked`,
        body: box => box.appendChild(U.el('p', {
          class: 'small', style: 'color:var(--ink-2)',
          text: 'You entered values on some sets without ticking them. Count them as done, or leave them out?',
        })),
        foot: [
          { label: 'Leave out', class: 'btn ghost', onClick: close => { close(); this.completeFinish(false); } },
          { label: 'Count them', class: 'btn', onClick: close => { close(); this.completeFinish(true); } },
        ],
      });
      return;
    }
    this.completeFinish(false);
  },

  async completeFinish(includeFilled) {
    const S = Store.state;
    const w = S.activeWorkout;
    if (!w) return;
    const hasData = s => s.w != null || s.r != null || s.sec != null;
    const kept = w.entries
      .map(en => ({
        ...en,
        sets: en.sets
          .map(s => (!s.done && includeFilled && hasData(s)) ? { ...s, done: true } : s)
          .filter(s => s.done && hasData(s)), // fully-empty ticked sets carry no information
      }))
      .filter(en => en.sets.length);
    if (!kept.length) {
      const sure = await App.confirm('No sets were completed. Discard this workout?', { danger: true, ok: 'Discard' });
      if (sure) { S.activeWorkout = null; Store.save(); App.render(); }
      return;
    }

    const editing = w._editingId;
    const finished = { ...w, entries: kept };
    delete finished._editingId;
    if (editing) {
      const i = S.workouts.findIndex(x => x.id === editing);
      if (i >= 0) S.workouts[i] = finished; else S.workouts.push(finished);
    } else {
      finished.endTs = Date.now();
      S.workouts.push(finished);
    }
    S.workouts.sort((a, b) => a.date < b.date ? -1 : 1);
    S.activeWorkout = null;
    const prs = Store.detectPRs(finished);
    Store.save();
    App.timer.stop();
    App.render();
    if (editing) App.toast('Workout updated', { icon: 'check', kind: 'good' });
    else this.summarySheet(finished, prs);
  },

  // The payoff moment: what you just did, and how it compares.
  summarySheet(w, prs) {
    App.modal({
      title: prs.length ? 'Workout done — PR day! 🏆' : 'Workout done 💪',
      body: box => {
        const durMin = w.endTs && w.startTs ? Math.round((w.endTs - w.startTs) / 60000) : null;
        const hero = U.el('div', { class: 'sum-hero' });
        if (durMin != null) hero.appendChild(tile('Duration', String(durMin), null, ' min'));
        hero.appendChild(tile('Sets', String(Store.workoutSets(w)), 'working'));
        hero.appendChild(tile('Tonnage', U.fmtNum(Store.wOut(Store.workoutTonnage(w)), 0), null, ` ${Store.wUnit()}`));
        box.appendChild(hero);

        for (const en of w.entries) {
          const ex = Store.exById(en.exerciseId) || { name: 'Unknown', track: 'wr' };
          const best = Store.bestSetOf(en.sets, ex.track);
          const row = U.el('div', { class: 'sum-row' });
          row.appendChild(U.el('span', { class: 'name', text: ex.name }));
          const isPR = prs.some(p => p.startsWith(ex.name));
          if (isPR) row.appendChild(U.el('span', { class: 'badge good pr' }, [icNode('trophy'), 'PR']));
          row.appendChild(U.el('span', { class: 'val', text: best ? setStr(best, ex.track) : '—' }));
          box.appendChild(row);
        }
        if (w.note) box.appendChild(U.el('p', { class: 'small muted', style: 'margin-top:12px;font-style:italic', text: `“${w.note}”` }));
      },
      foot: [{ label: 'Done', class: 'btn good', onClick: close => close() }],
    });
  },

  async cancelWorkout() {
    const w = Store.state.activeWorkout;
    const msg = w && w._editingId
      ? 'Cancel editing? The original workout stays as it was.'
      : 'Discard this workout? Logged sets will be lost.';
    const sure = await App.confirm(msg, { danger: true, ok: w && w._editingId ? 'Cancel edit' : 'Discard' });
    if (!sure) return;
    Store.state.activeWorkout = null;
    Store.save();
    App.timer.stop();
    App.render();
  },

  /* ================= active workout ================= */

  renderActive(root) {
    const S = Store.state;
    const w = S.activeWorkout;
    const stack = U.el('div', { class: 'stack' });

    // header card
    const editing = !!w._editingId;
    const head = U.el('div', { class: 'card' });
    const hrow = U.el('div', { style: 'display:flex;align-items:center;gap:10px' });
    hrow.appendChild(U.el('div', { style: 'flex:1;min-width:0' }, [
      U.el('div', { class: 'kicker', text: editing ? 'Editing past workout' : 'In progress' }),
      U.el('h2', { text: w.name, style: 'font-size:19px;margin-top:2px' }),
    ]));
    if (editing) {
      const dateIn = U.el('input', { type: 'date', value: w.date, style: 'width:auto;min-height:38px;padding:7px 10px;font-size:13.5px' });
      dateIn.addEventListener('change', () => { if (dateIn.value) { w.date = dateIn.value; Store.save(); } });
      hrow.appendChild(dateIn);
    } else {
      const elapsed = U.el('span', { class: 'badge accent tnum', text: elapsedStr(w.startTs) });
      hrow.appendChild(elapsed);
      this._tickEl = elapsed;
      this.ensureTicker();
    }
    head.appendChild(hrow);

    head.appendChild(U.el('p', { class: 'small muted', id: 'aw-progress', style: 'margin-top:6px', text: awProgressStr(w) }));
    stack.appendChild(head);

    // exercise blocks
    const card = U.el('div', { class: 'card' });
    if (!w.entries.length) {
      card.appendChild(U.el('div', { class: 'empty-state' }, [
        ic('barbell'),
        U.el('div', { class: 'es-title', text: 'Empty workout' }),
        U.el('div', { class: 'small', text: 'Add your first exercise below.' }),
      ]));
    }
    w.entries.forEach((en, ei) => card.appendChild(this.exerciseBlock(en, ei)));
    card.appendChild(U.el('div', { style: 'margin-top:12px' }, [
      btn('+ Add exercise', 'btn soft block', () => App.pickExercise(exId => {
        w.entries.push(this.makeEntry(exId, 3));
        Store.save();
        App.render();
      })),
    ]));
    stack.appendChild(card);

    // note + finish
    const noteCard = U.el('div', { class: 'card' });
    const noteIn = U.el('textarea', { placeholder: 'Session notes (optional)…', rows: 2 });
    noteIn.value = w.note || '';
    noteIn.addEventListener('input', () => { w.note = noteIn.value; Store.saveSoon(); });
    noteCard.appendChild(noteIn);
    stack.appendChild(noteCard);

    const foot = U.el('div', { style: 'display:flex;gap:10px' });
    foot.appendChild(btn(editing ? 'Cancel edit' : 'Discard', 'btn ghost', () => this.cancelWorkout()));
    const fin = btn(editing ? 'Save changes' : 'Finish workout', 'btn good', () => this.finishWorkout());
    fin.style.flex = '1';
    foot.appendChild(fin);
    stack.appendChild(foot);

    root.appendChild(stack);
  },

  ensureTicker() {
    if (this._ticker) clearInterval(this._ticker);
    this._ticker = setInterval(() => {
      const w = Store.state.activeWorkout;
      if (!w || !this._tickEl || !document.body.contains(this._tickEl)) {
        clearInterval(this._ticker); this._ticker = null;
        return;
      }
      this._tickEl.textContent = elapsedStr(w.startTs);
    }, 30000);
  },

  exerciseBlock(en, ei) {
    const S = Store.state;
    const w = S.activeWorkout;
    const ex = Store.exById(en.exerciseId) || { name: 'Unknown exercise', track: 'wr' };
    const block = U.el('div', { class: 'ex-block' });

    const head = U.el('div', { class: 'ex-head' });
    const nm = U.el('span', { class: 'name', text: ex.name, style: 'cursor:pointer' });
    nm.addEventListener('click', () => Views.plan.exerciseDetail(ex.id));
    head.appendChild(nm);
    if (en.repsMin) {
      const unit = ex.track === 'time' ? ' s' : '';
      head.appendChild(U.el('span', { class: 'target', text: `${en.sets.length} × ${en.repsMin}${en.repsMax && en.repsMax !== en.repsMin ? '–' + en.repsMax : ''}${unit}` }));
    }
    const menu = U.el('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Exercise options' });
    menu.appendChild(ic('dots'));
    menu.addEventListener('click', () => this.exerciseMenu(en, ei));
    head.appendChild(menu);
    block.appendChild(head);

    const last = Store.lastPerformance(en.exerciseId);
    if (last) {
      block.appendChild(U.el('div', { class: 'ex-last', text: `Last time (${U.fmtDate(last.date, 'short')}): ${setsSummary(last.sets, ex.track)}` }));
    }

    const timed = ex.track === 'time';
    const heads = U.el('div', { class: 'col-heads' + (timed ? ' timed' : '') });
    heads.appendChild(U.el('span', { text: 'Set' }));
    heads.appendChild(U.el('span', { text: 'Prev' }));
    if (timed) heads.appendChild(U.el('span', { text: 'Seconds' }));
    else {
      heads.appendChild(U.el('span', { text: ex.track === 'bw' ? `+${Store.wUnit()}` : Store.wUnit() }));
      heads.appendChild(U.el('span', { text: 'Reps' }));
    }
    heads.appendChild(U.el('span', { text: '✓' }));
    block.appendChild(heads);

    const grid = U.el('div', { class: 'set-grid' });
    en.sets.forEach((set, si) => grid.appendChild(this.setRow(en, set, si, ex, last)));
    block.appendChild(grid);

    const addRow = U.el('div', { style: 'margin-top:8px' });
    addRow.appendChild(btn('+ Add set', 'btn tiny ghost', () => {
      en.sets.push({ w: null, r: null, sec: null, done: false });
      Store.save();
      App.render();
    }));
    block.appendChild(addRow);
    return block;
  },

  setRow(en, set, si, ex, last) {
    const timed = ex.track === 'time';
    const unit = U.el('div', { class: 'set-unit' });
    const row = U.el('div', {
      class: 'set-row' + (timed ? ' timed' : '') + (set.done ? ' is-done' : '') + (set.warm ? ' warm' : ''),
    });

    // set number doubles as the warm-up toggle
    const workingIdx = en.sets.slice(0, si).filter(s => !s.warm).length + 1;
    const nBtn = U.el('span', {
      class: 'set-n', text: set.warm ? 'W' : String(workingIdx),
      role: 'button', tabindex: '0', title: 'Tap to toggle warm-up',
      'aria-label': set.warm ? 'Warm-up set — tap to make it a working set' : `Set ${workingIdx} — tap to mark as warm-up`,
    });
    nBtn.addEventListener('click', () => { set.warm = !set.warm; Store.save(); App.render(); });
    row.appendChild(nBtn);

    // previous performance maps working set → working set (warm-ups excluded)
    const work = last ? last.work : null;
    const prevSet = set.warm ? null : (work && (work[workingIdx - 1] || work[work.length - 1])) || null;
    row.appendChild(U.el('span', { class: 'prev', text: prevSet ? setStr(prevSet, ex.track) : '—' }));

    const mkInput = (val, ph, decimal) => {
      const inp = U.el('input', {
        type: 'text', inputmode: decimal ? 'decimal' : 'numeric', placeholder: ph == null ? '' : String(ph),
      });
      if (val != null) inp.value = decimal ? U.fmtNum(val, 1).replace(/,/g, '') : String(val);
      return inp;
    };

    let wIn = null, rIn = null, sIn = null;
    if (timed) {
      sIn = mkInput(set.sec, prevSet && prevSet.sec ? prevSet.sec : '', false);
      sIn.addEventListener('input', () => { set.sec = parseNum(sIn.value, false); Store.saveSoon(); });
      row.appendChild(sIn);
    } else {
      const prevW = prevSet && prevSet.w != null ? U.fmtNum(Store.wOut(prevSet.w), 1) : '';
      wIn = mkInput(set.w != null ? Store.wOut(set.w) : null, prevW, true);
      wIn.addEventListener('input', () => { const v = parseNum(wIn.value, true); set.w = v == null ? null : Store.wIn(v); Store.saveSoon(); });
      row.appendChild(wIn);
      rIn = mkInput(set.r, prevSet && prevSet.r ? prevSet.r : (en.repsMax || ''), false);
      rIn.addEventListener('input', () => { set.r = parseNum(rIn.value, false); Store.saveSoon(); });
      row.appendChild(rIn);
    }

    /* stepper strip — appears while a set input is focused */
    const strip = U.el('div', { class: 'step-strip' });
    strip.hidden = true;
    const sbtn = (label, fn, cls) => {
      const b = U.el('button', { class: 'sbtn' + (cls ? ' ' + cls : ''), type: 'button' });
      if (Icons[label]) b.appendChild(ic(label)); else b.textContent = label;
      b.addEventListener('pointerdown', e => e.preventDefault()); // keep the input focused
      b.addEventListener('click', fn);
      return b;
    };
    const wStep = Store.metric() ? 2.5 : 5;
    const trim = v => String(Math.round(v * 100) / 100);
    const bumpW = d => {
      const cur = parseNum(wIn.value, true) ?? parseNum(wIn.placeholder, true) ?? 0;
      const next = Math.max(0, Math.round((cur + d) * 100) / 100);
      wIn.value = trim(next);
      set.w = Store.wIn(next);
      Store.saveSoon();
    };
    const bumpR = d => {
      const cur = parseNum(rIn.value, false) ?? parseNum(rIn.placeholder, false) ?? 0;
      const next = Math.max(0, cur + d);
      rIn.value = String(next);
      set.r = next;
      Store.saveSoon();
    };
    const bumpS = d => {
      const cur = parseNum(sIn.value, false) ?? parseNum(sIn.placeholder, false) ?? 0;
      const next = Math.max(0, cur + d);
      sIn.value = String(next);
      set.sec = next;
      Store.saveSoon();
    };
    if (timed) {
      strip.appendChild(sbtn('−15s', () => bumpS(-15)));
      strip.appendChild(sbtn('+15s', () => bumpS(15)));
    } else {
      strip.appendChild(sbtn(`−${trim(wStep)}`, () => bumpW(-wStep)));
      strip.appendChild(sbtn(`+${trim(wStep)}`, () => bumpW(wStep)));
      strip.appendChild(U.el('span', { class: 'sgap' }));
      strip.appendChild(sbtn('−1', () => bumpR(-1)));
      strip.appendChild(sbtn('+1', () => bumpR(1)));
    }
    strip.appendChild(U.el('span', { class: 'spacer' }));
    if (!timed && ex.track === 'wr' && ex.equipment === 'barbell') {
      strip.appendChild(sbtn('barbell', () => {
        const v = parseNum(wIn.value, true) ?? parseNum(wIn.placeholder, true);
        this.plateModal(v);
      }, 'icon'));
    }
    strip.appendChild(sbtn('trash', () => {
      en.sets.splice(si, 1);
      Store.save();
      App.render();
    }, 'icon danger'));

    const showStrip = () => { strip.hidden = false; };
    const maybeHideStrip = () => setTimeout(() => {
      if (!unit.contains(document.activeElement)) strip.hidden = true;
    }, 80);
    for (const inp of [wIn, rIn, sIn]) {
      if (!inp) continue;
      inp.addEventListener('focus', showStrip);
      inp.addEventListener('blur', maybeHideStrip);
    }

    const check = U.el('button', { class: 'set-check' + (set.done ? ' done' : ''), type: 'button', 'aria-label': 'Set done' });
    check.appendChild(ic('check'));
    check.addEventListener('click', () => {
      strip.hidden = true;
      if (!set.done) {
        // Auto-fill from last time — but never invent half a weight×reps set.
        if (timed) {
          if (set.sec == null) set.sec = parseNum(sIn.value || sIn.placeholder, false);
        } else if (ex.track === 'bw') {
          if (set.r == null) { set.r = parseNum(rIn.value || rIn.placeholder, false); if (set.r != null) rIn.value = String(set.r); }
          if (set.w == null && wIn.value) { const v = parseNum(wIn.value, true); set.w = v == null ? null : Store.wIn(v); }
        } else {
          if (set.w == null && set.r == null && prevSet && prevSet.w != null && prevSet.r) {
            set.w = prevSet.w;
            set.r = prevSet.r;
            wIn.value = trim(Store.wOut(prevSet.w));
            rIn.value = String(prevSet.r);
          } else {
            if (set.w == null && wIn.value) { const v = parseNum(wIn.value, true); set.w = v == null ? null : Store.wIn(v); }
            if (set.r == null && rIn.value) set.r = parseNum(rIn.value, false);
          }
        }
        set.done = true;
        Store.save();
        row.classList.add('is-done');
        check.classList.add('done');
        App.timer.start(en.restSec || Store.state.settings.restSec);
        this.refreshHeader();
      } else {
        set.done = false;
        Store.save();
        row.classList.remove('is-done');
        check.classList.remove('done');
        this.refreshHeader();
      }
    });
    row.appendChild(check);

    unit.appendChild(row);
    unit.appendChild(strip);
    return unit;
  },

  /* plate calculator for barbell lifts */
  plateModal(displayW) {
    const S = Store.state.settings;
    const metric = Store.metric();
    const plates = metric ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
    const bars = metric ? [20, 15, 10] : [45, 35];
    let barDisp = S.barKg != null ? Math.round(Store.wOut(S.barKg) * 10) / 10 : bars[0];
    if (!bars.includes(barDisp)) barDisp = bars[0];

    App.modal({
      title: 'Plate maths',
      body: box => {
        const form = U.el('div', { class: 'form-grid' });
        const wInp = U.el('input', { type: 'text', inputmode: 'decimal', value: displayW != null ? String(displayW) : '' });
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: `Target (${Store.wUnit()})` }), wInp]));
        const barSel = U.el('select');
        for (const b of bars) {
          const o = U.el('option', { value: String(b), text: `${b} ${Store.wUnit()} bar` });
          if (b === barDisp) o.selected = true;
          barSel.appendChild(o);
        }
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Bar' }), barSel]));
        box.appendChild(form);
        const out = U.el('div', { style: 'margin-top:14px' });
        box.appendChild(out);

        const render = () => {
          U.clear(out);
          const target = parseNum(wInp.value, true);
          if (target == null) { out.appendChild(U.el('p', { class: 'small muted', text: 'Enter a target weight.' })); return; }
          const bar = parseFloat(barSel.value);
          if (target < bar) {
            out.appendChild(U.el('p', { class: 'small muted', text: `That’s lighter than the ${bar} ${Store.wUnit()} bar.` }));
            return;
          }
          let perSide = (target - bar) / 2;
          const picked = [];
          for (const p of plates) {
            let n = 0;
            while (perSide >= p - 1e-9) { perSide -= p; n++; }
            if (n) picked.push([p, n]);
          }
          const loaded = target - perSide * 2;
          if (!picked.length) {
            out.appendChild(U.el('p', { class: 'small muted', text: 'Empty bar — no plates needed.' }));
          } else {
            out.appendChild(U.el('div', { class: 'kicker', style: 'margin-bottom:6px', text: 'Per side' }));
            for (const [p, n] of picked) {
              const rowEl = U.el('div', { class: 'plate-row' });
              rowEl.appendChild(U.el('span', { class: 'plate-chip', text: String(p) }));
              rowEl.appendChild(U.el('span', { class: 'plate-count', text: `× ${n}` }));
              out.appendChild(rowEl);
            }
          }
          if (perSide > 0.01) {
            out.appendChild(U.el('p', {
              class: 'small muted', style: 'margin-top:10px',
              text: `Closest loadable: ${U.fmtNum(loaded, 1)} ${Store.wUnit()} (${U.fmtNum(target - loaded, 2)} short).`,
            }));
          }
        };
        wInp.addEventListener('input', render);
        barSel.addEventListener('change', () => {
          S.barKg = Store.wIn(parseFloat(barSel.value));
          Store.saveSoon();
          render();
        });
        render();
      },
      foot: [{ label: 'Done', class: 'btn', onClick: close => close() }],
    });
  },

  refreshHeader() { /* light refresh of the sets-done line without a full re-render */
    const w = Store.state.activeWorkout;
    const el = document.getElementById('aw-progress');
    if (w && el) el.textContent = awProgressStr(w);
  },

  exerciseMenu(en, ei) {
    const w = Store.state.activeWorkout;
    const ex = Store.exById(en.exerciseId);
    const { close } = App.modal({
      title: ex ? ex.name : 'Exercise',
      body: box => {
        const list = U.el('div', { class: 'rowlist' });
        const mkRow = (icon, label, danger, fn) => {
          const r = U.el('div', { class: 'row tappable', onclick: () => { close(); fn(); } });
          r.appendChild(ic(icon, danger ? 'danger' : ''));
          r.appendChild(U.el('div', { class: 'grow title', text: label, style: danger ? 'color:var(--crit)' : '' }));
          list.appendChild(r);
        };
        mkRow('info', 'Exercise details', false, () => Views.plan.exerciseDetail(en.exerciseId));
        mkRow('timer', `Rest timer for this exercise${en.restSec ? ` (${en.restSec}s)` : ''}`, false, () => this.restOverrideModal(en));
        mkRow('x', 'Remove last set', false, () => {
          if (en.sets.length > 1) en.sets.pop();
          Store.save(); App.render();
        });
        mkRow('trash', 'Remove exercise from workout', true, () => {
          w.entries.splice(ei, 1);
          Store.save(); App.render();
        });
        box.appendChild(list);
      },
    });
  },

  restOverrideModal(en) {
    App.modal({
      title: 'Rest for this exercise',
      body: box => {
        const inp = U.el('input', { type: 'text', inputmode: 'numeric', placeholder: `Default (${Store.state.settings.restSec}s)` });
        if (en.restSec) inp.value = String(en.restSec);
        box.appendChild(U.el('div', { class: 'field' }, [
          U.el('label', { text: 'Seconds' }), inp,
          U.el('span', { class: 'hint', text: 'Big lifts earn 150–210 s; isolation work 60–90 s. Blank uses the default.' }),
        ]));
        box._get = () => parseNum(inp.value, false);
      },
      foot: [
        { label: 'Cancel', class: 'btn ghost', onClick: close => close() },
        { label: 'Save', class: 'btn', onClick: (close, box) => {
          const v = box._get();
          en.restSec = v && v > 0 ? U.clamp(v, 10, 600) : null;
          Store.save(); close(); App.render();
        } },
      ],
    });
  },

  /* ================= history detail ================= */

  workoutDetail(w) {
    App.modal({
      title: w.name,
      body: box => {
        const dur = w.endTs && w.startTs ? Math.round((w.endTs - w.startTs) / 60000) : null;
        box.appendChild(U.el('p', { class: 'small muted', text: `${U.fmtDate(w.date, 'long')}${dur ? ` · ${dur} min` : ''} · ${U.fmtNum(Store.wOut(Store.workoutTonnage(w)), 0)} ${Store.wUnit()} total` }));
        for (const en of w.entries) {
          const ex = Store.exById(en.exerciseId) || { name: 'Unknown', track: 'wr' };
          const blk = U.el('div', { style: 'margin-top:14px' });
          blk.appendChild(U.el('div', { style: 'font-weight:700;font-size:14.5px', text: ex.name }));
          blk.appendChild(U.el('div', { class: 'small muted', text: setsSummary(en.sets, ex.track) }));
          box.appendChild(blk);
        }
        if (w.note) {
          box.appendChild(U.el('p', { class: 'small', style: 'margin-top:14px;font-style:italic', text: `“${w.note}”` }));
        }
      },
      foot: [
        { label: 'Delete', class: 'btn ghost', onClick: close => {
          const removed = w;
          Store.state.workouts = Store.state.workouts.filter(x => x.id !== w.id);
          Store.save(); close(); App.render();
          App.actionToast('Workout deleted', {
            label: 'Undo', icon: 'trash',
            onAction: () => {
              Store.state.workouts.push(removed);
              Store.state.workouts.sort((a, b) => a.date < b.date ? -1 : 1);
              Store.save(); App.render();
            },
          });
        } },
        { label: 'Edit', class: 'btn ghost', onClick: close => { close(); this.editWorkout(w); } },
        { label: 'Close', class: 'btn', onClick: close => close() },
      ],
    });
  },
};

/* ---- helpers ---- */

function awProgressStr(w) {
  const doneSets = w.entries.reduce((s, en) => s + en.sets.filter(x => x.done).length, 0);
  const totSets = w.entries.reduce((s, en) => s + en.sets.length, 0);
  return `${doneSets} of ${totSets} sets · ${U.fmtNum(Store.wOut(Store.workoutTonnage(w)), 0)} ${Store.wUnit()} lifted`;
}

function routineMeta(r) {
  const n = r.items.reduce((s, i) => s + i.sets, 0);
  return `${r.items.length} exercises · ${n} sets${r.note ? ` · ${r.note}` : ''}`;
}

function elapsedStr(startTs) {
  const min = Math.max(0, Math.round((Date.now() - startTs) / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} m`;
}

function setStr(s, track) {
  if (track === 'time') return s.sec ? U.fmtDuration(s.sec) : '—';
  if (track === 'bw') {
    if (!s.r) return '—';
    return s.w ? `${s.r} × +${U.fmtNum(Store.wOut(s.w), 1)}` : `${s.r} reps`;
  }
  if (s.w == null || !s.r) return '—';
  return `${U.fmtNum(Store.wOut(s.w), 1)} × ${s.r}`;
}

function setsSummary(sets, track) {
  const done = sets.filter(s => s.done !== false);
  if (!done.length) return '—';
  return done.map(s => (s.warm ? 'w·' : '') + setStr(s, track)).join(',  ');
}

function parseNum(v, decimal) {
  if (v == null || String(v).trim() === '') return null;
  const n = decimal ? parseFloat(String(v).replace(',', '.')) : parseInt(String(v), 10);
  return isFinite(n) && n >= 0 ? n : null;
}

function emptyCard(icon, title, sub) {
  const c = U.el('div', { class: 'card' });
  c.appendChild(U.el('div', { class: 'empty-state' }, [
    ic(icon),
    U.el('div', { class: 'es-title', text: title }),
    U.el('div', { class: 'small', text: sub }),
  ]));
  return c;
}
