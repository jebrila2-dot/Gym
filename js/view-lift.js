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

    // history
    const recent = [...S.workouts].sort((a, b) => b.date < a.date ? -1 : 1).slice(0, 10);
    if (recent.length) {
      const card = U.el('div', { class: 'card' });
      card.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: 'History' })]));
      const list = U.el('div', { class: 'rowlist' });
      for (const w of recent) {
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
        w.entries.push(this.makeEntry(it.exerciseId, it.sets, it.repsMin, it.repsMax));
      }
    }
    S.activeWorkout = w;
    Store.save();
  },

  makeEntry(exerciseId, nSets, repsMin, repsMax) {
    return {
      exerciseId,
      repsMin: repsMin || null,
      repsMax: repsMax || null,
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
      this.makeEntry(en.exerciseId, en.sets.length, en.repsMin, en.repsMax));
    Store.save();
  },

  async finishWorkout() {
    const S = Store.state;
    const w = S.activeWorkout;
    if (!w) return;
    const kept = w.entries
      .map(en => ({ ...en, sets: en.sets.filter(s => s.done) }))
      .filter(en => en.sets.length);
    if (!kept.length) {
      const sure = await App.confirm('No sets were completed. Discard this workout?', { danger: true, ok: 'Discard' });
      if (sure) { S.activeWorkout = null; Store.save(); App.render(); }
      return;
    }
    w.endTs = Date.now();
    const finished = { ...w, entries: kept };
    S.workouts.push(finished);
    S.workouts.sort((a, b) => a.date < b.date ? -1 : 1);
    S.activeWorkout = null;
    const prs = Store.detectPRs(finished);
    Store.save();
    App.timer.stop();
    if (prs.length) App.toast(`PR! ${prs[0]}${prs.length > 1 ? ` +${prs.length - 1} more` : ''}`, { icon: 'trophy', kind: 'good' });
    else App.toast('Workout saved', { icon: 'check', kind: 'good' });
    App.render();
  },

  async cancelWorkout() {
    const sure = await App.confirm('Discard this workout? Logged sets will be lost.', { danger: true, ok: 'Discard' });
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
    const head = U.el('div', { class: 'card' });
    const hrow = U.el('div', { style: 'display:flex;align-items:center;gap:10px' });
    hrow.appendChild(U.el('div', { style: 'flex:1;min-width:0' }, [
      U.el('div', { class: 'kicker', text: 'In progress' }),
      U.el('h2', { text: w.name, style: 'font-size:19px;margin-top:2px' }),
    ]));
    const elapsed = U.el('span', { class: 'badge accent tnum', text: elapsedStr(w.startTs) });
    hrow.appendChild(elapsed);
    head.appendChild(hrow);
    this._tickEl = elapsed;
    this.ensureTicker();

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
    foot.appendChild(btn('Discard', 'btn ghost', () => this.cancelWorkout()));
    const fin = btn('Finish workout', 'btn good', () => this.finishWorkout());
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
    const row = U.el('div', { class: 'set-row' + (timed ? ' timed' : '') + (set.done ? ' is-done' : '') });
    row.appendChild(U.el('span', { class: 'set-n', text: String(si + 1) }));

    const prevSet = last && last.sets[si] ? last.sets[si] : (last ? last.sets[last.sets.length - 1] : null);
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

    const check = U.el('button', { class: 'set-check' + (set.done ? ' done' : ''), type: 'button', 'aria-label': 'Set done' });
    check.appendChild(ic('check'));
    check.addEventListener('click', () => {
      if (!set.done) {
        // auto-fill from placeholder (previous performance) when left blank
        if (timed) {
          if (set.sec == null) set.sec = parseNum(sIn.value || sIn.placeholder, false);
        } else {
          if (set.w == null) { const v = parseNum(wIn.value || wIn.placeholder, true); set.w = v == null ? null : Store.wIn(v); if (v != null) wIn.value = String(v); }
          if (set.r == null) { set.r = parseNum(rIn.value || rIn.placeholder, false); if (set.r != null) rIn.value = String(set.r); }
        }
        set.done = true;
        Store.save();
        row.classList.add('is-done');
        check.classList.add('done');
        App.timer.start(Store.state.settings.restSec);
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
    return row;
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
        { label: 'Delete', class: 'btn ghost', onClick: async close => {
          const sure = await App.confirm('Delete this workout permanently?', { danger: true, ok: 'Delete' });
          if (!sure) return;
          Store.state.workouts = Store.state.workouts.filter(x => x.id !== w.id);
          Store.save(); close(); App.render();
        } },
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
  return done.map(s => setStr(s, track)).join(',  ');
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
