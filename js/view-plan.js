/* Plan — the workout organiser: weekly schedule, routine builder, exercise library. */
'use strict';

var Views = window.Views || {};

Views.plan = {

  state() {
    // Keep the stored object's identity stable — closures from earlier renders hold it.
    const vs = App.viewState.plan || (App.viewState.plan = {});
    const defaults = { sub: 'schedule', editing: null, q: '', group: 'all', equip: 'all' };
    for (const k of Object.keys(defaults)) if (!(k in vs)) vs[k] = defaults[k];
    return vs;
  },

  render(root) {
    const vs = this.state();
    const stack = U.el('div', { class: 'stack' });

    if (vs.editing) { this.renderEditor(stack, vs.editing); root.appendChild(stack); return; }

    const seg = U.el('div', { class: 'seg', role: 'tablist' });
    for (const [key, label] of [['schedule', 'Schedule'], ['routines', 'Routines'], ['library', 'Exercises'], ['guide', 'Guide']]) {
      const b = U.el('button', { class: vs.sub === key ? 'on' : '', type: 'button', text: label });
      b.addEventListener('click', () => { vs.sub = key; App.render(); });
      seg.appendChild(b);
    }
    stack.appendChild(seg);

    if (vs.sub === 'schedule') this.renderSchedule(stack);
    else if (vs.sub === 'routines') this.renderRoutines(stack);
    else if (vs.sub === 'guide') this.renderGuide(stack);
    else this.renderLibrary(stack);

    root.appendChild(stack);
  },

  /* ================= training guide ================= */

  renderGuide(stack) {
    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: 'Training guide' })]));
    card.appendChild(U.el('p', {
      class: 'small muted', style: 'margin-bottom:6px',
      text: 'Short, evidence-based chapters on getting stronger while training for the marathon. General guidance, not medical advice.',
    }));
    const list = U.el('div', { class: 'rowlist' });
    for (const ch of GUIDE) {
      const row = U.el('div', { class: 'row tappable', onclick: () => this.guideChapter(ch) });
      row.appendChild(ic(ch.icon, 'accent'));
      row.appendChild(U.el('div', { class: 'grow' }, [
        U.el('div', { class: 'title', text: ch.title }),
        U.el('div', { class: 'sub', text: ch.blurb }),
      ]));
      row.appendChild(ic('chevR', 'chev'));
      list.appendChild(row);
    }
    card.appendChild(list);
    stack.appendChild(card);
  },

  guideChapter(ch) {
    App.modal({
      title: ch.title,
      body: box => {
        for (const p of ch.body) {
          box.appendChild(U.el('p', { class: 'guide-p', text: p }));
        }
        if (ch.tips && ch.tips.length) {
          box.appendChild(U.el('div', { class: 'kicker', style: 'margin:14px 0 8px', text: 'In short' }));
          for (const t of ch.tips) {
            const row = U.el('div', { class: 'guide-tip' });
            row.appendChild(ic('check', 'accent'));
            row.appendChild(U.el('span', { text: t }));
            box.appendChild(row);
          }
        }
      },
      foot: [{ label: 'Done', class: 'btn', onClick: close => close() }],
    });
  },

  /* ================= weekly schedule ================= */

  renderSchedule(stack) {
    const S = Store.state;
    const today = U.todayISO();
    const monday = U.mondayOf(today);

    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [
      U.el('h2', { text: 'Weekly template' }),
      U.el('span', { class: 'badge', text: `${scheduledCount(S)} lift days` }),
    ]));

    for (let i = 0; i < 7; i++) {
      const iso = U.addDays(monday, i);
      const day = U.el('div', { class: 'day-card' + (iso === today ? ' today' : '') });
      const dowBox = U.el('div', { class: 'dow' });
      dowBox.appendChild(document.createTextNode(U.DOW_SHORT[i]));
      dowBox.appendChild(U.el('span', { class: 'num', text: String(U.isoToDate(iso).getDate()) }));
      day.appendChild(dowBox);

      const body = U.el('div', { class: 'body' });
      const sel = U.el('select', { 'aria-label': `Routine for ${U.DOW_LONG[i]}` });
      sel.appendChild(U.el('option', { value: '', text: 'Rest / no lift' }));
      for (const r of S.routines) {
        const o = U.el('option', { value: r.id, text: r.name });
        if (S.schedule[i] === r.id) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => { S.schedule[i] = sel.value; Store.save(); });
      body.appendChild(sel);

      const planDay = Marathon.dayFor(S.runPlan, iso);
      if (planDay) {
        const rl = U.el('div', { class: 'runline' });
        rl.appendChild(ic('run'));
        rl.appendChild(U.el('span', {
          text: `${Marathon.TYPE_LABEL[planDay.day.type]} · ${Store.fmtD(planDay.day.km, 1)}`,
          style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
        }));
        body.appendChild(rl);
      }
      day.appendChild(body);
      card.appendChild(day);
    }
    stack.appendChild(card);

    const recBtn = btn('Use recommended week', 'btn ghost small', async () => {
      const a = S.routines.find(r => r.name === 'Full Body A');
      const b = S.routines.find(r => r.name === 'Full Body B');
      const c = S.routines.find(r => r.name === 'Full Body C');
      if (!a || !b || !c) { App.toast('Full Body A/B/C routines not found'); return; }
      const sure = await App.confirm('Set Mon = Full Body A, Wed = Full Body B, Fri = Full Body C? This hits every muscle 2–3× a week and keeps legs fresh for the long run.', { ok: 'Set week' });
      if (!sure) return;
      S.schedule = { 0: a.id, 1: '', 2: b.id, 3: '', 4: c.id, 5: '', 6: '' };
      Store.save();
      App.render();
      App.toast('Recommended week set', { icon: 'check', kind: 'good' });
    });
    stack.appendChild(U.el('div', { style: 'display:flex;gap:8px' }, [recBtn]));

    stack.appendChild(U.el('p', {
      class: 'small muted', style: 'padding:0 4px',
      text: 'Hard days hard: the recommended week puts the lower-body session beside your quality run (Wed) and keeps Friday leg-free so Sunday’s long run gets fresh legs. Each muscle lands 2–3× a week — see the Guide.',
    }));

    this.balancePanel(stack);
  },

  /* Weekly working sets per muscle vs the 10–20 guideline band. */
  balancePanel(stack) {
    const sets = Store.weeklyMuscleSets();
    const order = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core', 'forearms'];
    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: 'Weekly muscle volume' })]));

    const anyScheduled = Object.values(Store.state.schedule).some(Boolean);
    if (!anyScheduled) {
      card.appendChild(U.el('p', { class: 'small muted', text: 'Schedule some routines to see weekly sets per muscle.' }));
      stack.appendChild(card);
      return;
    }

    const MAX = 24; // meter scale
    for (const g of order) {
      const n = Math.round((sets[g] || 0) * 10) / 10;
      const row = U.el('div', { class: 'bal-row' });
      row.appendChild(U.el('span', { class: 'bal-name', text: EXDB.groupName(g) }));
      const meter = U.el('div', { class: 'bal-meter' });
      meter.appendChild(U.el('div', { class: 'bal-band' })); // the 10–20 growth zone
      meter.appendChild(U.el('div', { class: 'bal-fill' + (n >= 10 && n <= 20 ? ' in-band' : n > 22 ? ' high' : ''), style: `width:${Math.min(100, n / MAX * 100)}%` }));
      row.appendChild(meter);
      row.appendChild(U.el('span', { class: 'bal-n tnum', text: String(n) }));
      card.appendChild(row);
    }
    card.appendChild(U.el('p', {
      class: 'small muted', style: 'margin-top:10px',
      text: 'Counts direct sets (+½ for assisting muscles) from your scheduled week. Shaded zone ≈ 10–20 sets — the productive range for growth; 6–10 maintains. Legs also collect run volume, so lower numbers there are right during marathon training.',
    }));
    stack.appendChild(card);
  },

  /* ================= routines ================= */

  renderRoutines(stack) {
    const S = Store.state;
    const vs = this.state();

    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: 'Your routines' })]));
    const list = U.el('div', { class: 'rowlist' });
    if (!S.routines.length) {
      card.appendChild(U.el('div', { class: 'empty-state' }, [
        ic('calendar'), U.el('div', { class: 'es-title', text: 'No routines yet' }),
        U.el('div', { class: 'small', text: 'Create one below.' }),
      ]));
    }
    for (const r of S.routines) {
      const row = U.el('div', { class: 'row tappable', onclick: () => { vs.editing = r.id; App.render(); } });
      const lastUse = [...S.workouts].reverse().find(w => w.routineId === r.id);
      row.appendChild(U.el('div', { class: 'grow' }, [
        U.el('div', { class: 'title', text: r.name }),
        U.el('div', { class: 'sub', text: routineMeta(r) + (lastUse ? ` · last ${U.relDay(lastUse.date)}` : '') }),
      ]));
      row.appendChild(ic('chevR', 'chev'));
      list.appendChild(row);
    }
    card.appendChild(list);
    card.appendChild(U.el('div', { style: 'margin-top:12px' }, [
      btn('+ New routine', 'btn soft block', () => {
        const r = { id: 'r-' + U.uid(), name: 'New routine', note: '', items: [] };
        S.routines.push(r);
        Store.save();
        vs.editing = r.id;
        App.render();
      }),
    ]));
    stack.appendChild(card);
  },

  renderEditor(stack, routineId) {
    const S = Store.state;
    const vs = this.state();
    const r = S.routines.find(x => x.id === routineId);
    if (!r) { vs.editing = null; App.render(); return; }

    const bar = U.el('div', { style: 'display:flex;align-items:center;gap:10px' });
    const back = U.el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back' });
    back.appendChild(ic('chevR', ''));
    back.firstChild.style.transform = 'rotate(180deg)';
    back.addEventListener('click', () => { vs.editing = null; App.render(); });
    bar.appendChild(back);
    bar.appendChild(U.el('h2', { text: 'Edit routine', style: 'font-size:17px;flex:1' }));
    stack.appendChild(bar);

    const card = U.el('div', { class: 'card' });
    const nameIn = U.el('input', { type: 'text', 'aria-label': 'Routine name' });
    nameIn.value = r.name;
    nameIn.addEventListener('input', () => { r.name = nameIn.value || 'Routine'; Store.saveSoon(); });
    card.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Name' }), nameIn]));

    const noteIn = U.el('input', { type: 'text', placeholder: 'e.g. Chest · shoulders · triceps' });
    noteIn.value = r.note || '';
    noteIn.addEventListener('input', () => { r.note = noteIn.value; Store.saveSoon(); });
    card.appendChild(U.el('div', { class: 'field', style: 'margin-top:10px' }, [U.el('label', { text: 'Note' }), noteIn]));
    stack.appendChild(card);

    const exCard = U.el('div', { class: 'card' });
    exCard.appendChild(U.el('div', { class: 'card-head' }, [U.el('h2', { text: 'Exercises' })]));
    if (!r.items.length) {
      exCard.appendChild(U.el('p', { class: 'small muted', text: 'No exercises yet — add some below.' }));
    }
    r.items.forEach((it, i) => {
      const ex = Store.exById(it.exerciseId) || { name: 'Unknown', track: 'wr' };
      const row = U.el('div', { class: 'ri-row' });

      const top = U.el('div', { class: 'ri-top' });
      const info = U.el('div', { class: 'grow', style: 'cursor:pointer' });
      info.appendChild(U.el('div', { class: 'name', text: ex.name }));
      info.addEventListener('click', () => this.exerciseDetail(it.exerciseId));
      top.appendChild(info);
      if (ex.pattern && Store.allExercises().some(e => e.pattern === ex.pattern && e.id !== ex.id)) {
        const swap = U.el('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Swap for a similar exercise', title: 'Swap (same movement)' });
        swap.appendChild(ic('swap'));
        swap.addEventListener('click', () => this.swapRoutineItem(it, ex));
        top.appendChild(swap);
      }
      const del = U.el('button', { class: 'icon-btn plain danger', type: 'button', 'aria-label': 'Remove' });
      del.appendChild(ic('x'));
      del.addEventListener('click', () => { r.items.splice(i, 1); Store.save(); App.render(); });
      top.appendChild(del);
      row.appendChild(top);

      const bottom = U.el('div', { class: 'ri-bottom' });
      const move = U.el('div', { style: 'display:flex;gap:4px' });
      const up = U.el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Move up', style: 'width:32px;height:32px;border-radius:9px' });
      up.appendChild(ic('up'));
      up.disabled = i === 0;
      up.addEventListener('click', () => { [r.items[i - 1], r.items[i]] = [r.items[i], r.items[i - 1]]; Store.save(); App.render(); });
      const down = U.el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Move down', style: 'width:32px;height:32px;border-radius:9px' });
      down.appendChild(ic('down'));
      down.disabled = i === r.items.length - 1;
      down.addEventListener('click', () => { [r.items[i], r.items[i + 1]] = [r.items[i + 1], r.items[i]]; Store.save(); App.render(); });
      move.appendChild(up); move.appendChild(down);
      bottom.appendChild(move);

      const mini = U.el('div', { class: 'ri-mini' });
      mini.appendChild(U.el('span', { class: 'x', text: 'sets' }));
      const setsIn = miniNum(it.sets, v => { it.sets = U.clamp(v || 1, 1, 12); Store.saveSoon(); });
      const loIn = miniNum(it.repsMin, v => { it.repsMin = v; Store.saveSoon(); });
      const hiIn = miniNum(it.repsMax, v => { it.repsMax = v; Store.saveSoon(); });
      mini.appendChild(setsIn);
      mini.appendChild(U.el('span', { class: 'x', text: '×' }));
      mini.appendChild(loIn);
      mini.appendChild(U.el('span', { class: 'x', text: '–' }));
      mini.appendChild(hiIn);
      mini.appendChild(U.el('span', { class: 'x', text: ex.track === 'time' ? 'sec' : 'reps' }));
      mini.appendChild(U.el('span', { class: 'sgap' }));
      const restIn = miniNum(it.restSec, v => { it.restSec = v && v > 0 ? U.clamp(v, 10, 600) : null; Store.saveSoon(); });
      restIn.placeholder = String(Store.state.settings.restSec);
      restIn.title = 'Rest between sets (seconds)';
      mini.appendChild(restIn);
      mini.appendChild(U.el('span', { class: 'x', text: 's rest' }));
      bottom.appendChild(mini);

      row.appendChild(bottom);
      exCard.appendChild(row);
    });
    exCard.appendChild(U.el('div', { style: 'margin-top:12px' }, [
      btn('+ Add exercise', 'btn soft block', () => App.pickExercise(exId => {
        const newEx = Store.exById(exId);
        r.items.push({ exerciseId: exId, sets: 3, repsMin: 8, repsMax: 12, restSec: Store.restFor(newEx) });
        Store.save(); App.render();
      })),
    ]));
    exCard.appendChild(U.el('p', {
      class: 'small muted', style: 'margin-top:10px',
      text: 'Rep-range guide: 3–6 strength · 6–12 muscle · 12–20 isolation & conditioning — all taken to 1–3 reps in reserve. More in Plan → Guide.',
    }));
    stack.appendChild(exCard);

    const actions = U.el('div', { style: 'display:flex;gap:10px' });
    actions.appendChild(btn('Duplicate', 'btn ghost', () => {
      const copy = JSON.parse(JSON.stringify(r));
      copy.id = 'r-' + U.uid();
      copy.name = r.name + ' (copy)';
      S.routines.push(copy);
      Store.save();
      vs.editing = copy.id;
      App.render();
      App.toast('Routine duplicated', { icon: 'copy' });
    }));
    actions.appendChild(btn('Delete routine', 'btn ghost', () => {
      const removed = r;
      const scheduleSlots = Object.keys(S.schedule).filter(k => S.schedule[k] === r.id);
      S.routines = S.routines.filter(x => x.id !== r.id);
      for (const k of scheduleSlots) S.schedule[k] = '';
      Store.save();
      vs.editing = null;
      App.render();
      App.actionToast(`“${removed.name}” deleted`, {
        label: 'Undo', icon: 'trash',
        onAction: () => {
          S.routines.push(removed);
          for (const k of scheduleSlots) S.schedule[k] = removed.id;
          Store.save();
          App.render();
        },
      });
    }));
    stack.appendChild(actions);
  },

  swapRoutineItem(it, ex) {
    const alts = Store.allExercises().filter(e => e.pattern === ex.pattern && e.id !== ex.id);
    App.modal({
      title: `Swap ${ex.name}`,
      body: box => {
        box.appendChild(U.el('p', { class: 'small muted', style: 'margin-bottom:8px', text: `Same movement (${EXDB.patternName(ex.pattern)}) — sets, reps and rest stay as they are.` }));
        const list = U.el('div', { class: 'rowlist' });
        for (const alt of alts) {
          const row = U.el('div', { class: 'row tappable' });
          row.addEventListener('click', () => {
            box._close();
            it.exerciseId = alt.id;
            Store.save();
            App.render();
            App.toast(`Swapped to ${alt.name}`, { icon: 'swap', kind: 'good' });
          });
          row.appendChild(U.el('div', { class: 'grow' }, [
            U.el('div', { class: 'title', text: alt.name }),
            U.el('div', { class: 'sub', text: `${EXDB.groupName(alt.group)} · ${EXDB.equipName(alt.equipment)}` }),
          ]));
          row.appendChild(ic('swap', 'chev'));
          list.appendChild(row);
        }
        box.appendChild(list);
      },
    });
  },

  /* ================= exercise library ================= */

  renderLibrary(stack) {
    const vs = this.state();

    const search = U.el('div', { class: 'searchbar' });
    search.appendChild(U.el('span', { html: Icons.search }));
    const q = U.el('input', { type: 'text', placeholder: 'Search exercises…', value: vs.q });
    q.addEventListener('input', U.debounce(() => { vs.q = q.value; App.render(); }, 220));
    search.appendChild(q);
    stack.appendChild(search);

    const chips = U.el('div', { class: 'chip-row' });
    const mkChip = (key, label) => {
      const c = U.el('button', { class: 'chip' + (vs.group === key ? ' on' : ''), type: 'button', text: label });
      c.addEventListener('click', () => { vs.group = key; App.render(); });
      chips.appendChild(c);
    };
    mkChip('all', 'All');
    for (const [k, label] of EXDB.GROUPS) mkChip(k, label);
    stack.appendChild(chips);

    const all = Store.allExercises();
    const needle = vs.q.trim().toLowerCase();
    const filtered = all.filter(ex =>
      (vs.group === 'all' || ex.group === vs.group) &&
      (!needle || ex.name.toLowerCase().includes(needle) || ex.group.includes(needle) || ex.equipment.includes(needle)));

    const card = U.el('div', { class: 'card' });
    card.appendChild(U.el('div', { class: 'card-head' }, [
      U.el('h2', { text: 'Exercises' }),
      U.el('span', { class: 'badge', text: `${filtered.length}` }),
    ]));
    const list = U.el('div', { class: 'rowlist' });
    for (const ex of filtered.slice(0, 80)) {
      const row = U.el('div', { class: 'row tappable', onclick: () => this.exerciseDetail(ex.id) });
      const hist = Store.exHistory(ex.id);
      row.appendChild(U.el('div', { class: 'grow' }, [
        U.el('div', { class: 'title', text: ex.name }),
        U.el('div', { class: 'sub', text: `${EXDB.groupName(ex.group)} · ${EXDB.equipName(ex.equipment)}${hist.length ? ` · ${hist.length} sessions` : ''}` }),
      ]));
      row.appendChild(ic('chevR', 'chev'));
      list.appendChild(row);
    }
    if (filtered.length > 80) {
      list.appendChild(U.el('p', { class: 'small muted center', style: 'padding:10px', text: `+${filtered.length - 80} more — refine your search` }));
    }
    if (!filtered.length) {
      card.appendChild(U.el('div', { class: 'empty-state' }, [
        ic('search'), U.el('div', { class: 'es-title', text: 'Nothing found' }),
        U.el('div', { class: 'small', text: 'Try another term, or create it as a custom exercise.' }),
      ]));
    }
    card.appendChild(list);
    card.appendChild(U.el('div', { style: 'margin-top:12px' }, [
      btn('+ Custom exercise', 'btn ghost block', () => this.customExerciseModal()),
    ]));
    stack.appendChild(card);
  },

  exerciseDetail(exId) {
    const ex = Store.exById(exId);
    if (!ex) return;
    const hist = Store.exHistory(exId);
    const pr = Store.prsFor(exId);

    App.modal({
      title: ex.name,
      body: box => {
        const meta = U.el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px' });
        meta.appendChild(U.el('span', { class: 'badge accent', text: EXDB.groupName(ex.group) }));
        meta.appendChild(U.el('span', { class: 'badge', text: EXDB.equipName(ex.equipment) }));
        if (ex.pattern && EXDB.patternName(ex.pattern)) meta.appendChild(U.el('span', { class: 'badge', text: EXDB.patternName(ex.pattern) }));
        if (ex.secondary && ex.secondary.length) meta.appendChild(U.el('span', { class: 'badge', text: '+ ' + ex.secondary.join(', ') }));
        box.appendChild(meta);
        if (ex.cue) box.appendChild(U.el('p', { class: 'small', style: 'color:var(--ink-2)', text: ex.cue }));

        // muscles worked — original front/back map
        box.appendChild(U.el('div', { class: 'kicker', style: 'margin:14px 0 4px', text: 'Muscles worked' }));
        box.appendChild(Diagrams.muscleMap(ex));

        // movement diagram (start → finish)
        const dg = Diagrams.for(ex.id);
        if (dg) {
          box.appendChild(U.el('div', { class: 'kicker', style: 'margin:14px 0 6px', text: 'Movement' }));
          box.appendChild(dg);
        }

        if (ex.how && ex.how.length) {
          box.appendChild(U.el('div', { class: 'kicker', style: 'margin:14px 0 6px', text: 'How to do it' }));
          const ol = U.el('ol', { class: 'howto' });
          for (const step of ex.how) ol.appendChild(U.el('li', { text: step }));
          box.appendChild(ol);
        }
        if (ex.avoid && ex.avoid.length) {
          box.appendChild(U.el('div', { class: 'kicker', style: 'margin:12px 0 6px', text: 'Avoid' }));
          for (const a of ex.avoid) {
            const row = U.el('div', { class: 'guide-tip avoid' });
            row.appendChild(ic('x', 'danger'));
            row.appendChild(U.el('span', { text: a }));
            box.appendChild(row);
          }
        }

        // alternatives: same movement pattern
        if (ex.pattern) {
          const alts = Store.allExercises().filter(e => e.pattern === ex.pattern && e.id !== ex.id).slice(0, 6);
          if (alts.length) {
            box.appendChild(U.el('div', { class: 'kicker', style: 'margin:14px 0 8px', text: 'Same movement — swap options' }));
            const chips = U.el('div', { class: 'chip-row' });
            for (const alt of alts) {
              const c = U.el('button', { class: 'chip', type: 'button', text: alt.name });
              c.addEventListener('click', () => { box._close(); this.exerciseDetail(alt.id); });
              chips.appendChild(c);
            }
            box.appendChild(chips);
          }
        }

        if (pr && (pr.e1rm || pr.maxReps || pr.maxSec)) {
          const prRow = U.el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px' });
          if (pr.maxW) prRow.appendChild(U.el('span', { class: 'badge good' }, [icNode('trophy'), `Best ${U.fmtNum(Store.wOut(pr.maxW.w), 1)} ${Store.wUnit()} × ${pr.maxW.r}`]));
          if (pr.e1rm) prRow.appendChild(U.el('span', { class: 'badge' }, [`e1RM ${U.fmtNum(Store.wOut(pr.e1rm.val), 1)} ${Store.wUnit()}`]));
          if (pr.maxReps) prRow.appendChild(U.el('span', { class: 'badge good' }, [icNode('trophy'), `Best ${pr.maxReps.r} reps${pr.maxReps.w ? ` +${U.fmtNum(Store.wOut(pr.maxReps.w), 1)}` : ''}`]));
          if (pr.maxSec) prRow.appendChild(U.el('span', { class: 'badge good' }, [icNode('trophy'), `Best ${U.fmtDuration(pr.maxSec.sec)}`]));
          box.appendChild(prRow);
        }

        if (hist.length >= 2 && ex.track === 'wr') {
          box.appendChild(U.el('div', { class: 'kicker', style: 'margin:16px 0 8px', text: 'Estimated 1RM' }));
          const chartBox = U.el('div');
          box.appendChild(chartBox);
          requestAnimationFrame(() => {
            Charts.line(chartBox, {
              height: 170,
              label: `${ex.name} estimated one-rep max over time`,
              series: [{
                name: 'e1RM', color: '--viz-s1',
                points: hist.map(h => ({
                  x: U.isoToDate(h.date).getTime(),
                  y: Store.wOut(Store.e1rm(h.best.w, h.best.r)),
                  tip: [`Top set ${setStr(h.best, 'wr')}`],
                })),
              }],
              yFmt: v => U.fmtNum(v, 0),
              table: {
                cols: ['Date', `e1RM (${Store.wUnit()})`, 'Top set'],
                rows: [...hist].reverse().map(h => [U.fmtDate(h.date), U.fmtNum(Store.wOut(Store.e1rm(h.best.w, h.best.r)), 1), setStr(h.best, 'wr')]),
              },
            });
          });
        }

        if (hist.length) {
          box.appendChild(U.el('div', { class: 'kicker', style: 'margin:16px 0 6px', text: 'Recent sessions' }));
          const list = U.el('div', { class: 'rowlist' });
          for (const h of [...hist].reverse().slice(0, 6)) {
            const row = U.el('div', { class: 'row', style: 'min-height:40px;padding:8px 2px' });
            row.appendChild(U.el('div', { class: 'grow small', text: U.fmtDate(h.date) }));
            row.appendChild(U.el('div', { class: 'small tnum', style: 'color:var(--ink-2)', text: setsSummary(h.sets, ex.track) }));
            list.appendChild(row);
          }
          box.appendChild(list);
        }
      },
      foot: [{ label: 'Close', class: 'btn', onClick: close => close() }],
    });
  },

  customExerciseModal() {
    App.modal({
      title: 'Custom exercise',
      body: box => {
        const form = U.el('div', { class: 'form-grid' });
        const name = U.el('input', { type: 'text', placeholder: 'e.g. Safety-Bar Squat' });
        form.appendChild(U.el('div', { class: 'field wide' }, [U.el('label', { text: 'Name' }), name]));

        const group = U.el('select');
        for (const [k, label] of EXDB.GROUPS) group.appendChild(U.el('option', { value: k, text: label }));
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Muscle group' }), group]));

        const equip = U.el('select');
        for (const [k, label] of EXDB.EQUIP) equip.appendChild(U.el('option', { value: k, text: label }));
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Equipment' }), equip]));

        const track = U.el('select');
        track.appendChild(U.el('option', { value: 'wr', text: 'Weight × reps' }));
        track.appendChild(U.el('option', { value: 'bw', text: 'Bodyweight reps' }));
        track.appendChild(U.el('option', { value: 'time', text: 'Time (seconds)' }));
        form.appendChild(U.el('div', { class: 'field' }, [U.el('label', { text: 'Tracked as' }), track]));

        const pattern = U.el('select');
        pattern.appendChild(U.el('option', { value: '', text: 'None / other' }));
        for (const [k, label] of Object.entries(EXDB.PATTERNS)) pattern.appendChild(U.el('option', { value: k, text: label }));
        form.appendChild(U.el('div', { class: 'field' }, [
          U.el('label', { text: 'Movement pattern' }), pattern,
        ]));

        const cue = U.el('input', { type: 'text', placeholder: 'Optional form cue' });
        form.appendChild(U.el('div', { class: 'field wide' }, [U.el('label', { text: 'Cue' }), cue]));

        box.appendChild(form);
        box._get = () => ({ name: name.value.trim(), group: group.value, equipment: equip.value, track: track.value, pattern: pattern.value || null, secondary: [], cue: cue.value.trim() });
      },
      foot: [
        { label: 'Cancel', class: 'btn ghost', onClick: close => close() },
        { label: 'Create', class: 'btn', onClick: (close, box) => {
          const data = box._get();
          if (!data.name) { App.toast('Give it a name'); return; }
          Store.addCustomExercise(data);
          close(); App.render();
          App.toast('Exercise created', { icon: 'check', kind: 'good' });
        } },
      ],
    });
  },

  /* Shared exercise picker (used by Lift + routine editor) */
  pickExercise(onPick) {
    let group = 'all', qStr = '';
    App.modal({
      title: 'Add exercise',
      body: box => {
        const search = U.el('div', { class: 'searchbar' });
        search.appendChild(U.el('span', { html: Icons.search }));
        const q = U.el('input', { type: 'text', placeholder: 'Search…' });
        search.appendChild(q);
        box.appendChild(search);

        const chips = U.el('div', { class: 'chip-row', style: 'margin-top:10px' });
        box.appendChild(chips);
        const listWrap = U.el('div', { style: 'margin-top:6px' });
        box.appendChild(listWrap);

        const pickRow = ex => {
          const row = U.el('div', { class: 'row tappable' });
          row.addEventListener('click', () => { box._close(); onPick(ex.id); });
          row.appendChild(U.el('div', { class: 'grow' }, [
            U.el('div', { class: 'title', text: ex.name }),
            U.el('div', { class: 'sub', text: `${EXDB.groupName(ex.group)} · ${EXDB.equipName(ex.equipment)}` }),
          ]));
          row.appendChild(ic('plus', 'chev'));
          return row;
        };

        // Exercises you've actually trained lately, most recent first
        const recentIds = () => {
          const seen = [];
          for (const w of [...Store.state.workouts].reverse()) {
            for (const en of w.entries) {
              if (!seen.includes(en.exerciseId)) seen.push(en.exerciseId);
              if (seen.length >= 8) return seen;
            }
          }
          return seen;
        };

        const renderList = () => {
          U.clear(chips);
          const mkChip = (key, label) => {
            const c = U.el('button', { class: 'chip' + (group === key ? ' on' : ''), type: 'button', text: label });
            c.addEventListener('click', () => { group = key; renderList(); });
            chips.appendChild(c);
          };
          mkChip('all', 'All');
          for (const [k, label] of EXDB.GROUPS) mkChip(k, label);

          U.clear(listWrap);
          const needle = qStr.trim().toLowerCase();

          if (!needle && group === 'all') {
            const recents = recentIds().map(id => Store.exById(id)).filter(Boolean);
            if (recents.length) {
              listWrap.appendChild(U.el('div', { class: 'kicker', style: 'margin:10px 2px 2px', text: 'Recent' }));
              const rlist = U.el('div', { class: 'rowlist' });
              for (const ex of recents) rlist.appendChild(pickRow(ex));
              listWrap.appendChild(rlist);
              listWrap.appendChild(U.el('div', { class: 'kicker', style: 'margin:16px 2px 2px', text: 'All exercises' }));
            }
          }

          const filtered = Store.allExercises().filter(ex =>
            (group === 'all' || ex.group === group) &&
            (!needle || ex.name.toLowerCase().includes(needle)));
          const list = U.el('div', { class: 'rowlist' });
          for (const ex of filtered.slice(0, 50)) list.appendChild(pickRow(ex));
          if (!filtered.length) list.appendChild(U.el('p', { class: 'small muted center', style: 'padding:16px', text: 'No matches.' }));
          listWrap.appendChild(list);
        };
        q.addEventListener('input', U.debounce(() => { qStr = q.value; renderList(); }, 180));
        renderList();
      },
    });
  },
};

function miniNum(val, onChange) {
  const inp = U.el('input', { type: 'text', inputmode: 'numeric' });
  if (val != null) inp.value = String(val);
  inp.addEventListener('input', () => onChange(parseNum(inp.value, false)));
  return inp;
}
