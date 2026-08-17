/* Small shared utilities: DOM builder, dates, formatting. */
'use strict';

const U = {

  /* ---------- DOM ---------- */

  // U.el('div', {class:'card', text:'hi', onclick:fn, dataset:{id:'x'}}, [children])
  // User-supplied strings only ever flow through `text`/textContent — never innerHTML.
  el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v; // constant markup (icons) only
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k === 'style') node.style.cssText = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, '');
        else if (v !== false) node.setAttribute(k, v);
      }
    }
    if (children != null) {
      for (const c of [].concat(children)) {
        if (c == null) continue;
        node.append(c.nodeType ? c : document.createTextNode(c));
      }
    }
    return node;
  },

  clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; },

  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); },
  round1(v) { return Math.round(v * 10) / 10; },

  /* ---------- dates (local, ISO yyyy-mm-dd strings) ---------- */

  todayISO() { return U.dateToISO(new Date()); },

  dateToISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  isoToDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  },

  addDays(iso, n) {
    const d = U.isoToDate(iso);
    d.setDate(d.getDate() + n);
    return U.dateToISO(d);
  },

  // 0 = Monday … 6 = Sunday
  dowIdx(iso) { return (U.isoToDate(iso).getDay() + 6) % 7; },

  mondayOf(iso) { return U.addDays(iso, -U.dowIdx(iso)); },

  daysBetween(fromISO, toISO) {
    return Math.round((U.isoToDate(toISO) - U.isoToDate(fromISO)) / 86400000);
  },

  DOW_SHORT: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  DOW_LONG: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  MON_SHORT: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

  fmtDate(iso, style) {
    const d = U.isoToDate(iso);
    const day = d.getDate(), mon = U.MON_SHORT[d.getMonth()], yr = d.getFullYear();
    const dow = U.DOW_SHORT[U.dowIdx(iso)];
    if (style === 'long') return `${U.DOW_LONG[U.dowIdx(iso)]} ${day} ${mon} ${yr}`;
    if (style === 'dow') return `${dow} ${day} ${mon}`;
    if (style === 'short') return `${day} ${mon}`;
    if (style === 'month') return `${mon} ${yr}`;
    const now = new Date();
    return yr === now.getFullYear() ? `${day} ${mon}` : `${day} ${mon} ${yr}`;
  },

  relDay(iso) {
    const t = U.todayISO();
    if (iso === t) return 'Today';
    if (iso === U.addDays(t, -1)) return 'Yesterday';
    if (iso === U.addDays(t, 1)) return 'Tomorrow';
    return U.fmtDate(iso, 'dow');
  },

  /* ---------- durations & paces ---------- */

  // "52:30" or "3:58:20" or "45" (min) -> seconds; null if unparseable
  parseDuration(str) {
    if (!str) return null;
    const parts = String(str).trim().split(':').map(s => s.trim());
    if (parts.some(p => p === '' || !/^\d+(\.\d+)?$/.test(p))) return null;
    const nums = parts.map(Number);
    let sec = 0;
    if (nums.length === 3) sec = nums[0] * 3600 + nums[1] * 60 + nums[2];
    else if (nums.length === 2) sec = nums[0] * 60 + nums[1];
    else if (nums.length === 1) sec = nums[0] * 60; // bare number = minutes
    else return null;
    return sec > 0 ? Math.round(sec) : null;
  },

  fmtDuration(sec, forceH) {
    if (sec == null || !isFinite(sec)) return '–';
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0 || forceH) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  },

  fmtClock(sec) { // for the rest timer: m:ss
    sec = Math.max(0, Math.round(sec));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  },

  // seconds-per-km (or per-mile) -> "5:41"
  fmtPaceVal(secPer) {
    if (secPer == null || !isFinite(secPer) || secPer <= 0) return '–';
    const m = Math.floor(secPer / 60), s = Math.round(secPer % 60);
    if (s === 60) return `${m + 1}:00`;
    return `${m}:${String(s).padStart(2, '0')}`;
  },

  /* ---------- units ---------- */

  KG_PER_LB: 0.45359237,
  KM_PER_MI: 1.609344,

  kg2lb(kg) { return kg / U.KG_PER_LB; },
  lb2kg(lb) { return lb * U.KG_PER_LB; },
  km2mi(km) { return km / U.KM_PER_MI; },
  mi2km(mi) { return mi * U.KM_PER_MI; },

  fmtNum(v, dp = 1) {
    if (v == null || !isFinite(v)) return '–';
    const r = dp === 0 ? Math.round(v) : Math.round(v * 10 ** dp) / 10 ** dp;
    return r.toLocaleString('en-GB', { maximumFractionDigits: dp });
  },

  fmtInt(v) { return U.fmtNum(v, 0); },

  debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },
};
