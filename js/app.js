/* App controller: tabs, theme, modals, toasts, rest timer, settings, boot. */
'use strict';

const App = {

  tab: 'today',
  viewState: {},

  TABS: [
    { id: 'today', label: 'Today', icon: 'home' },
    { id: 'lift', label: 'Lift', icon: 'barbell' },
    { id: 'run', label: 'Run', icon: 'run' },
    { id: 'plan', label: 'Plan', icon: 'calendar' },
    { id: 'progress', label: 'Progress', icon: 'chart' },
  ],

  SUBTITLES: {
    today: () => U.fmtDate(U.todayISO(), 'long'),
    lift: () => 'Sets · reps · weight',
    run: () => {
      const days = U.daysBetween(U.todayISO(), Store.state.settings.raceDate);
      return days >= 0 ? `${Math.floor(days / 7)} weeks to race day` : 'Marathon training';
    },
    plan: () => 'Your training, organised',
    progress: () => 'Numbers that move',
  },

  /* ---------------- navigation & render ---------------- */

  go(tab, subState) {
    if (subState) this.viewState[tab] = Object.assign(this.viewState[tab] || {}, subState);
    this.tab = tab;
    this.render();
    document.getElementById('view').scrollTop = 0;
    window.scrollTo(0, 0);
  },

  render() {
    this.renderTopbar();
    this.renderTabbar();
    const view = document.getElementById('view');
    U.clear(view);
    Views[this.tab].render(view);
  },

  renderSoon: null, // debounced, set in init

  renderTopbar() {
    const bar = U.clear(document.getElementById('topbar'));
    const t = this.TABS.find(t => t.id === this.tab);
    bar.appendChild(U.el('div', { class: 'titles' }, [
      U.el('div', { class: 'app-title', text: t.label }),
      U.el('div', { class: 'app-sub', text: this.SUBTITLES[this.tab]() }),
    ]));
    const gear = U.el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Settings' });
    gear.appendChild(ic('gear'));
    gear.addEventListener('click', () => this.settingsModal());
    bar.appendChild(gear);
  },

  renderTabbar() {
    const bar = U.clear(document.getElementById('tabbar'));
    for (const t of this.TABS) {
      const b = U.el('button', {
        class: 'tab-btn' + (t.id === this.tab ? ' active' : ''),
        type: 'button', dataset: { tab: t.id }, 'aria-label': t.label,
      });
      b.appendChild(U.el('span', { html: Icons[t.icon] }));
      b.appendChild(U.el('span', { text: t.label }));
      b.addEventListener('click', () => this.go(t.id));
      bar.appendChild(b);
    }
  },

  /* ---------------- theme ---------------- */

  applyTheme() {
    const pref = Store.state.settings.theme;
    const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  },

  /* ---------------- modal ---------------- */

  modal(opts) {
    const rootEl = document.getElementById('modal-root');
    const backdrop = U.el('div', { class: 'modal-backdrop' });
    const sheet = U.el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' });

    const prevFocus = document.activeElement;
    const close = () => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus && document.body.contains(prevFocus)) prevFocus.focus();
    };
    const onKey = e => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      // keep keyboard focus inside the sheet
      const focusables = [...sheet.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

    const head = U.el('div', { class: 'modal-head' });
    head.appendChild(U.el('h2', { text: opts.title || '' }));
    const x = U.el('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Close' });
    x.appendChild(ic('x'));
    x.addEventListener('click', close);
    head.appendChild(x);
    sheet.appendChild(head);

    const body = U.el('div', { class: 'modal-body' });
    body._close = close;
    if (typeof opts.body === 'function') opts.body(body);
    else if (opts.body) body.appendChild(opts.body);
    sheet.appendChild(body);

    if (opts.foot && opts.foot.length) {
      const foot = U.el('div', { class: 'modal-foot' });
      for (const f of opts.foot) {
        foot.appendChild(U.el('button', {
          class: f.class || 'btn', type: 'button', text: f.label,
          onclick: () => f.onClick ? f.onClick(close, body) : close(),
        }));
      }
      sheet.appendChild(foot);
    }

    backdrop.appendChild(sheet);
    rootEl.appendChild(backdrop);
    sheet.focus({ preventScroll: true });
    return { close, body };
  },

  confirm(message, opts = {}) {
    return new Promise(resolve => {
      const { close } = this.modal({
        title: opts.title || 'Are you sure?',
        body: box => box.appendChild(U.el('p', { class: 'small', style: 'color:var(--ink-2)', text: message })),
        foot: [
          { label: 'Cancel', class: 'btn ghost', onClick: c => { c(); resolve(false); } },
          { label: opts.ok || 'Confirm', class: opts.danger ? 'btn danger' : 'btn', onClick: c => { c(); resolve(true); } },
        ],
      });
      void close;
    });
  },

  /* ---------------- toast ---------------- */

  toast(text, opts = {}) {
    const rootEl = document.getElementById('toast-root');
    const t = U.el('div', { class: 'toast' + (opts.kind === 'good' ? ' good' : '') });
    if (opts.icon && Icons[opts.icon]) t.appendChild(U.el('span', { html: Icons[opts.icon] }));
    t.appendChild(U.el('span', { text }));
    rootEl.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2400);
    setTimeout(() => t.remove(), 2750);
  },

  // A toast with one action button (e.g. "Undo", "Refresh"). Stays up longer.
  actionToast(text, opts) {
    const rootEl = document.getElementById('toast-root');
    const t = U.el('div', { class: 'toast action' + (opts.kind === 'good' ? ' good' : '') });
    if (opts.icon && Icons[opts.icon]) t.appendChild(U.el('span', { html: Icons[opts.icon] }));
    t.appendChild(U.el('span', { text }));
    const dismiss = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
    t.appendChild(U.el('button', {
      type: 'button', text: opts.label,
      onclick: () => { dismiss(); opts.onAction && opts.onAction(); },
    }));
    rootEl.appendChild(t);
    setTimeout(dismiss, opts.duration || 6000);
  },

  /* ---------------- rest timer ---------------- */

  timer: {
    endAt: null,
    _int: null,
    _audio: null,

    start(sec) {
      if (!sec || sec <= 0) return;
      this.endAt = Date.now() + sec * 1000;
      this.ensureAudio();
      this.renderPill();
      document.body.classList.add('has-timer');
      if (this._int) clearInterval(this._int);
      this._int = setInterval(() => this.tick(), 250);
    },

    stop() {
      if (this._int) clearInterval(this._int);
      this._int = null;
      this.endAt = null;
      document.getElementById('timer-pill').hidden = true;
      document.body.classList.remove('has-timer');
    },

    add(sec) {
      if (!this.endAt) return;
      this.endAt += sec * 1000;
      this.tick();
    },

    tick() {
      if (!this.endAt) return;
      const left = Math.ceil((this.endAt - Date.now()) / 1000);
      const timeEl = document.querySelector('#timer-pill .t-time');
      if (timeEl) timeEl.textContent = left > 0 ? U.fmtClock(left) : 'Go!';
      if (left <= 0) {
        this.beep();
        if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
        clearInterval(this._int);
        this._int = null;
        this.endAt = null;
        setTimeout(() => {
          document.getElementById('timer-pill').hidden = true;
          document.body.classList.remove('has-timer');
        }, 1600);
      }
    },

    renderPill() {
      const pill = U.clear(document.getElementById('timer-pill'));
      pill.hidden = false;
      pill.appendChild(U.el('span', { html: Icons.timer, style: 'width:17px;height:17px;display:inline-flex;opacity:.8' }));
      pill.appendChild(U.el('span', { class: 't-time', text: U.fmtClock(Math.ceil((this.endAt - Date.now()) / 1000)) }));
      pill.appendChild(U.el('button', { type: 'button', text: '+15s', onclick: () => this.add(15) }));
      pill.appendChild(U.el('button', { type: 'button', text: 'Skip', onclick: () => this.stop() }));
    },

    ensureAudio() {
      if (this._audio) return;
      try { this._audio = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { /* no audio available */ }
    },

    beep() {
      const ctx = this._audio;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime;
      for (const [start, freq] of [[0, 880], [0.18, 880], [0.36, 1175]]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0 + start);
        gain.gain.exponentialRampToValueAtTime(0.3, t0 + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0 + start);
        osc.stop(t0 + start + 0.16);
      }
    },
  },

  /* ---------------- shared pickers ---------------- */

  pickExercise(onPick) { Views.plan.pickExercise(onPick); },

  /* ---------------- settings ---------------- */

  // Marathon goals are hours-scale: read "4:00" as 4 h 00 m (not 4 minutes),
  // and a bare "4" as 4 hours. Full h:mm:ss always parses as written.
  parseGoalSec(str) {
    if (!str || !str.trim()) return null;
    const sec = U.parseDuration(str);
    if (sec == null) return null;
    const parts = str.trim().split(':');
    if (parts.length <= 2 && sec < 3 * 3600) {
      const lead = parseInt(parts[0], 10);
      if (lead >= 1 && lead <= 8) return lead * 3600 + (parts[1] ? parseInt(parts[1], 10) * 60 : 0);
    }
    return sec;
  },

  settingsModal() {
    const S = Store.state.settings;
    this.modal({
      title: 'Settings',
      body: box => {
        const seg = (label, options, current, onSet) => {
          const wrap = U.el('div', { class: 'field', style: 'margin-bottom:14px' });
          wrap.appendChild(U.el('label', { text: label }));
          const s = U.el('div', { class: 'seg' });
          for (const [val, txt] of options) {
            const b = U.el('button', { class: current === val ? 'on' : '', type: 'button', text: txt });
            b.addEventListener('click', () => {
              onSet(val);
              Store.save();
              [...s.children].forEach(c => c.classList.remove('on'));
              b.classList.add('on');
            });
            s.appendChild(b);
          }
          wrap.appendChild(s);
          return wrap;
        };

        box.appendChild(seg('Appearance', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], S.theme, v => {
          S.theme = v;
          App.applyTheme();
          App.render();
        }));
        box.appendChild(seg('Units', [['metric', 'kg · km'], ['imperial', 'lb · mi']], S.units, v => {
          S.units = v;
          App.render();
        }));

        const rest = U.el('input', { type: 'text', inputmode: 'numeric', value: String(S.restSec) });
        rest.addEventListener('input', () => { const v = parseNum(rest.value, false); S.restSec = v == null ? 0 : U.clamp(v, 0, 600); Store.saveSoon(); });
        box.appendChild(U.el('div', { class: 'field', style: 'margin-bottom:14px' }, [
          U.el('label', { text: 'Rest timer (seconds, 0 = off)' }), rest,
        ]));

        box.appendChild(U.el('div', { class: 'kicker', style: 'margin:18px 0 10px', text: 'Race' }));

        const rname = U.el('input', { type: 'text', value: S.raceName });
        rname.addEventListener('input', () => { S.raceName = rname.value; Store.saveSoon(); });
        box.appendChild(U.el('div', { class: 'field', style: 'margin-bottom:12px' }, [U.el('label', { text: 'Race name' }), rname]));

        const rdate = U.el('input', { type: 'date', value: S.raceDate });
        rdate.addEventListener('change', () => { if (rdate.value) { S.raceDate = rdate.value; Store.save(); } });
        box.appendChild(U.el('div', { class: 'field', style: 'margin-bottom:12px' }, [
          U.el('label', { text: 'Race day' }), rdate,
          U.el('span', { class: 'hint', text: 'London Marathon dates are confirmed by the organisers each year — double-check once announced. Rebuild your plan after changing this.' }),
        ]));

        const goal = U.el('input', { type: 'text', inputmode: 'numeric', placeholder: 'e.g. 3:59:00', value: S.goalSec ? U.fmtDuration(S.goalSec, true) : '' });
        const goalHint = U.el('span', { class: 'hint', text: 'Drives your training paces. Leave blank to use the predictor.' });
        goal.addEventListener('input', () => {
          S.goalSec = App.parseGoalSec(goal.value);
          Store.saveSoon();
          if (!goal.value.trim()) { goalHint.textContent = 'Drives your training paces. Leave blank to use the predictor.'; return; }
          if (S.goalSec == null) { goalHint.textContent = 'Couldn’t read that — try h:mm:ss, e.g. 3:59:00'; return; }
          let msg = `Reads as ${U.fmtDuration(S.goalSec, true)}`;
          if (S.goalSec < 2 * 3600) msg += ' — faster than the world record, check the format';
          else if (S.goalSec > 8 * 3600) msg += ' — beyond most cut-off times, check the format';
          goalHint.textContent = msg;
        });
        box.appendChild(U.el('div', { class: 'field', style: 'margin-bottom:12px' }, [
          U.el('label', { text: 'Goal time (h:mm:ss)' }), goal, goalHint,
        ]));

        box.appendChild(U.el('div', { class: 'kicker', style: 'margin:18px 0 10px', text: 'Data' }));

        const dataRow = U.el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
        dataRow.appendChild(btn('Export backup', 'btn ghost small', () => {
          const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
          const a = U.el('a', { href: URL.createObjectURL(blob), download: `gym-backup-${U.todayISO()}.json` });
          document.body.appendChild(a);
          a.click();
          a.remove();
          App.toast('Backup downloaded', { icon: 'download', kind: 'good' });
        }));
        const fileIn = U.el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
        fileIn.addEventListener('change', () => {
          const f = fileIn.files[0];
          fileIn.value = '';
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            let backup;
            try { backup = Store.parseBackup(String(reader.result)); }
            catch (e) { App.toast('That file didn’t look like a Gym backup'); return; }
            App.importConfirmModal(backup);
          };
          reader.readAsText(f);
        });
        dataRow.appendChild(fileIn);
        dataRow.appendChild(btn('Import backup', 'btn ghost small', () => fileIn.click()));
        dataRow.appendChild(btn('Reset everything', 'btn ghost small', async () => {
          const sure = await App.confirm('Delete ALL workouts, runs and settings? Export a backup first if in doubt.', { danger: true, ok: 'Delete everything' });
          if (!sure) return;
          Store.reset();
          App.applyTheme();
          App.render();
          App.toast('Fresh start', { icon: 'check' });
        }));
        box.appendChild(dataRow);

        box.appendChild(U.el('p', {
          class: 'small muted', style: 'margin-top:18px',
          text: 'Everything is stored privately in this browser (localStorage) — export a backup now and then. Training guidance in this app is general information, not medical or coaching advice.',
        }));
      },
      foot: [{ label: 'Done', class: 'btn', onClick: close => { close(); App.render(); } }],
    });
  },

  // Confirmation step before a backup replaces everything.
  importConfirmModal(backup) {
    const s = backup.summary;
    this.modal({
      title: 'Restore this backup?',
      body: box => {
        const when = s.exportedAt ? new Date(s.exportedAt) : null;
        box.appendChild(U.el('p', {
          class: 'small', style: 'color:var(--ink-2);margin-bottom:12px',
          text: when
            ? `Backup exported ${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`
            : 'This backup has no export date.',
        }));
        const rows = [
          ['Workouts', s.workouts], ['Runs', s.runs], ['Routines', s.routines],
          ['Custom exercises', s.customExercises], ['Body-weight entries', s.bodyweight],
          ['Marathon plan', s.hasPlan ? 'yes' : 'no'],
        ];
        const tbl = U.el('table', { class: 'viz-table' });
        const tb = U.el('tbody');
        for (const [k, v] of rows) {
          const tr = U.el('tr');
          tr.appendChild(U.el('td', { text: k }));
          tr.appendChild(U.el('td', { text: String(v) }));
          tb.appendChild(tr);
        }
        tbl.appendChild(tb);
        box.appendChild(tbl);
        box.appendChild(U.el('p', {
          class: 'small muted', style: 'margin-top:12px',
          text: 'Restoring replaces everything currently in the app on this device.',
        }));
        const dl = btn('Download current data first', 'btn ghost small', () => {
          const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
          const a = U.el('a', { href: URL.createObjectURL(blob), download: `gym-backup-${U.todayISO()}.json` });
          document.body.appendChild(a); a.click(); a.remove();
          App.toast('Current data downloaded', { icon: 'download', kind: 'good' });
        });
        box.appendChild(U.el('div', { style: 'margin-top:12px' }, [dl]));
      },
      foot: [
        { label: 'Cancel', class: 'btn ghost', onClick: close => close() },
        { label: 'Replace & restore', class: 'btn danger', onClick: close => {
          Store.applyBackup(backup.parsed);
          App.viewState = {};
          App.applyTheme();
          close();
          App.render();
          App.toast('Backup restored', { icon: 'check', kind: 'good' });
        } },
      ],
    });
  },

  /* ---------------- boot ---------------- */

  init() {
    Store.load();
    Store.saveSoon = U.debounce(Store.save, 400);
    this.renderSoon = U.debounce(() => this.render(), 250);
    this.applyTheme();

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (Store.state.settings.theme === 'auto') { this.applyTheme(); this.render(); }
    });

    let lastW = window.innerWidth;
    window.addEventListener('resize', U.debounce(() => {
      if (Math.abs(window.innerWidth - lastW) < 40) return; // ignore mobile keyboard
      lastW = window.innerWidth;
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      this.render();
    }, 300));

    this.render();

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable */ });
      // A new version took over (skipWaiting + claim) — offer a refresh for the new assets.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController) return; // first install, nothing to announce
        this.actionToast('App updated', { label: 'Refresh', icon: 'zap', duration: 10000, onAction: () => location.reload() });
      });
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
