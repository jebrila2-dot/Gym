/* Hand-rolled SVG charts.
   Specs: 2px lines · dots r≥4.5 with 2px surface ring · bars ≤24px with 4px rounded
   data-end · solid hairline grid · legend for ≥2 series · selective direct labels ·
   crosshair/per-mark tooltips · a "Data" table twin on every chart. */
'use strict';

const Charts = (() => {

  const NS = 'http://www.w3.org/2000/svg';

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function tok() {
    return {
      s1: cssVar('--viz-s1'), s2: cssVar('--viz-s2'),
      grid: cssVar('--viz-grid'), axis: cssVar('--viz-axis'),
      muted: cssVar('--viz-muted'), deemph: cssVar('--viz-deemph'),
      ink: cssVar('--ink'), ink2: cssVar('--ink-2'), surface: cssVar('--surface'),
      heat: [cssVar('--heat-0'), cssVar('--heat-1'), cssVar('--heat-2'), cssVar('--heat-3'), cssVar('--heat-4')],
    };
  }

  function resolveColor(c) {
    if (!c) return cssVar('--viz-s1');
    return c.startsWith('--') ? cssVar(c) : c;
  }

  function mk(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
    return n;
  }

  function txt(parent, x, y, str, opts = {}) {
    const t = mk('text', {
      x, y,
      fill: opts.fill || tok().muted,
      'font-size': opts.size || 10.5,
      'font-weight': opts.weight || 500,
      'text-anchor': opts.anchor || 'start',
      'font-family': 'inherit',
    });
    if (opts.tnum) t.setAttribute('style', 'font-variant-numeric: tabular-nums');
    t.textContent = str;
    parent.appendChild(t);
    return t;
  }

  function niceTicks(lo, hi, n = 4) {
    if (!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1; }
    if (lo === hi) { hi = lo + 1; lo = Math.max(0, lo - 1); }
    const span = hi - lo;
    const step0 = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    let step = mag;
    for (const m of [1, 2, 2.5, 5, 10]) if (step0 <= m * mag) { step = m * mag; break; }
    const tLo = Math.floor(lo / step) * step;
    const tHi = Math.ceil(hi / step) * step;
    const ticks = [];
    for (let v = tLo; v <= tHi + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { lo: tLo, hi: tHi, ticks };
  }

  /* ---------- shared chrome: tooltip + table twin ---------- */

  function tipFor(container) {
    let tip = container.querySelector('.viz-tip');
    if (!tip) { tip = U.el('div', { class: 'viz-tip' }); container.appendChild(tip); }
    return tip;
  }

  function showTip(container, tip, px, py, build) {
    U.clear(tip);
    build(tip);
    tip.style.opacity = '1';
    const cw = container.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = px + 14;
    if (x + tw > cw - 4) x = px - tw - 14;
    if (x < 4) x = 4;
    let y = py - th - 12;
    if (y < 2) y = py + 16;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }

  function tipTitle(tip, s) { tip.appendChild(U.el('div', { class: 'tip-title', text: s })); }
  function tipRow(tip, color, value, name) {
    const row = U.el('div', { class: 'tip-row' });
    if (color) row.appendChild(U.el('span', { class: 'tip-key', style: `border-top-color:${color}` }));
    row.appendChild(U.el('span', { class: 'tip-val', text: value }));
    if (name) row.appendChild(U.el('span', { class: 'tip-name', text: name }));
    tip.appendChild(row);
  }

  function addTableTwin(container, table) {
    if (!table || !table.rows || !table.rows.length) return;
    const foot = U.el('div', { class: 'viz-foot' });
    const btn = U.el('button', { class: 'viz-table-btn', type: 'button' });
    btn.appendChild(U.el('span', { html: Icons.table }));
    btn.appendChild(document.createTextNode('Data'));
    foot.appendChild(btn);
    container.appendChild(foot);
    let wrap = null;
    btn.addEventListener('click', () => {
      if (wrap) { wrap.remove(); wrap = null; return; }
      wrap = U.el('div', { class: 'viz-table-wrap' });
      const t = U.el('table', { class: 'viz-table' });
      const thead = U.el('thead');
      const hr = U.el('tr');
      for (const c of table.cols) hr.appendChild(U.el('th', { text: c }));
      thead.appendChild(hr);
      t.appendChild(thead);
      const tbody = U.el('tbody');
      for (const row of table.rows) {
        const tr = U.el('tr');
        for (const cell of row) tr.appendChild(U.el('td', { text: cell }));
        tbody.appendChild(tr);
      }
      t.appendChild(tbody);
      wrap.appendChild(t);
      container.appendChild(wrap);
    });
  }

  function legendRow(items) {
    const lg = U.el('div', { class: 'viz-legend' });
    for (const it of items) {
      const li = U.el('div', { class: 'lg-item' });
      if (it.kind === 'line') li.appendChild(U.el('span', { class: 'lg-line', style: `border-top-color:${it.color}` }));
      else if (it.kind === 'tick') li.appendChild(U.el('span', { class: 'lg-tick' }));
      else li.appendChild(U.el('span', { class: 'lg-rect', style: `background:${it.color}` }));
      li.appendChild(U.el('span', { text: it.name }));
      lg.appendChild(li);
    }
    return lg;
  }

  function emptyNote(container, msg) {
    container.appendChild(U.el('div', { class: 'viz-empty', text: msg }));
  }

  function prepare(container) {
    U.clear(container);
    container.classList.add('viz');
  }

  /* ============================ LINE ============================ */

  // cfg: { series:[{name,color,points:[{x(ms),y,tip:[..lines]}]}], height, yFmt, xFmt,
  //        invertY, yMin0, tipTitle(ms), table:{cols,rows}, label, empty }
  function line(container, cfg) {
    prepare(container);
    const series = (cfg.series || []).filter(s => s.points && s.points.length);
    if (!series.length) { emptyNote(container, cfg.empty || 'No data yet'); return; }

    const T = tok();
    const W = Math.max(container.clientWidth || 320, 240);
    const H = cfg.height || 220;
    const yFmt = cfg.yFmt || (v => U.fmtNum(v, 0));
    const xFmt = cfg.xFmt || (ms => U.fmtDate(U.dateToISO(new Date(ms)), 'short'));

    if (series.length >= 2) {
      container.appendChild(legendRow(series.map(s => ({ kind: 'line', color: resolveColor(s.color), name: s.name }))));
    }

    const allPts = series.flatMap(s => s.points);
    let xLo = Math.min(...allPts.map(p => p.x));
    let xHi = Math.max(...allPts.map(p => p.x));
    if (xLo === xHi) { xLo -= 86400000 * 3; xHi += 86400000 * 3; }
    let yLo = Math.min(...allPts.map(p => p.y));
    let yHi = Math.max(...allPts.map(p => p.y));
    if (cfg.yMin0) yLo = 0;
    const pad = (yHi - yLo) * 0.08 || yHi * 0.1 || 1;
    if (!cfg.yMin0) yLo -= pad;
    yHi += pad;
    const nt = niceTicks(yLo, yHi, 4);

    const yTickStrs = nt.ticks.map(yFmt);
    const mL = 10 + Math.max(...yTickStrs.map(s => s.length)) * 6.6;
    const mR = 14, mT = 10, mB = 24;
    const pw = W - mL - mR, ph = H - mT - mB;

    const X = v => mL + (v - xLo) / (xHi - xLo) * pw;
    const Y = v => {
      const f = (v - nt.lo) / (nt.hi - nt.lo);
      return cfg.invertY ? mT + f * ph : mT + (1 - f) * ph;
    };

    const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' });
    if (cfg.label) svg.setAttribute('aria-label', cfg.label);

    // grid + y ticks
    for (const tv of nt.ticks) {
      const y = Y(tv);
      svg.appendChild(mk('line', { x1: mL, y1: y, x2: W - mR, y2: y, stroke: T.grid, 'stroke-width': 1 }));
      txt(svg, mL - 7, y + 3.5, yFmt(tv), { anchor: 'end', tnum: true });
    }
    // baseline
    const baseY = cfg.invertY ? mT : mT + ph;
    svg.appendChild(mk('line', { x1: mL, y1: baseY, x2: W - mR, y2: baseY, stroke: T.axis, 'stroke-width': 1 }));

    // x ticks (~4-5)
    const nX = Math.max(2, Math.min(5, Math.floor(pw / 78)));
    for (let i = 0; i <= nX; i++) {
      const v = xLo + (xHi - xLo) * i / nX;
      txt(svg, X(v), H - 7, xFmt(v), { anchor: i === 0 ? 'start' : i === nX ? 'end' : 'middle' });
    }

    // series paths + dots
    const totalPts = allPts.length;
    for (const s of series) {
      const c = resolveColor(s.color);
      const pts = [...s.points].sort((a, b) => a.x - b.x);
      if (pts.length > 1) {
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
        svg.appendChild(mk('path', { d, fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      }
      const drawDots = totalPts <= 60 ? pts : [pts[0], pts[pts.length - 1]];
      for (const p of drawDots) {
        svg.appendChild(mk('circle', { cx: X(p.x), cy: Y(p.y), r: 4.5, fill: c, stroke: T.surface, 'stroke-width': 2 }));
      }
    }

    // selective direct label: last value of each series, skip on collision
    const placed = [];
    for (const s of series) {
      const pts = [...s.points].sort((a, b) => a.x - b.x);
      const last = pts[pts.length - 1];
      const ly = Y(last.y) - 9;
      if (placed.some(py => Math.abs(py - ly) < 13)) continue;
      const anchor = X(last.x) > W - mR - 46 ? 'end' : 'middle';
      txt(svg, anchor === 'end' ? W - mR : X(last.x), Math.max(ly, mT + 9), yFmt(last.y),
        { fill: T.ink2, weight: 700, size: 11, anchor, tnum: true });
      placed.push(ly);
    }

    // crosshair + tooltip
    const xs = [...new Set(allPts.map(p => p.x))].sort((a, b) => a - b);
    const cross = mk('line', { y1: mT, y2: mT + ph, stroke: T.axis, 'stroke-width': 1, opacity: 0 });
    svg.appendChild(cross);
    const hover = mk('rect', { x: mL, y: mT, width: pw, height: ph, fill: 'transparent' });
    svg.appendChild(hover);
    const tip = tipFor(container);

    function onMove(ev) {
      const rect = svg.getBoundingClientRect();
      const px = (ev.clientX - rect.left) * (W / rect.width);
      const dataX = xLo + (px - mL) / pw * (xHi - xLo);
      let best = xs[0];
      for (const x of xs) if (Math.abs(x - dataX) < Math.abs(best - dataX)) best = x;
      const sx = X(best);
      cross.setAttribute('x1', sx); cross.setAttribute('x2', sx);
      cross.setAttribute('opacity', 1);
      const crect = container.getBoundingClientRect();
      showTip(container, tip, rect.left - crect.left + sx * (rect.width / W), ev.clientY - crect.top, t => {
        tipTitle(t, (cfg.tipTitle || (ms => U.fmtDate(U.dateToISO(new Date(ms)), 'dow')))(best));
        for (const s of series) {
          let nearest = null;
          for (const p of s.points) if (p.x === best) nearest = p;
          if (!nearest) continue;
          tipRow(t, resolveColor(s.color), yFmt(nearest.y), series.length > 1 ? s.name : (nearest.name || ''));
          if (nearest.tip) for (const lineStr of nearest.tip) t.appendChild(U.el('div', { class: 'tip-name', text: lineStr }));
        }
      });
    }
    hover.addEventListener('pointermove', onMove);
    hover.addEventListener('pointerleave', () => { cross.setAttribute('opacity', 0); tip.style.opacity = '0'; });

    container.appendChild(svg);
    addTableTwin(container, cfg.table);
  }

  /* ============================ BARS ============================ */

  // cfg: { items:[{label,value,tick,tip:[lines],future}], height, yFmt, color,
  //        valueName, tickName, table, label, empty }
  function bars(container, cfg) {
    prepare(container);
    const items = cfg.items || [];
    if (!items.length || items.every(i => !i.value && i.tick == null)) {
      emptyNote(container, cfg.empty || 'No data yet');
      return;
    }

    const T = tok();
    const W = Math.max(container.clientWidth || 320, 240);
    const H = cfg.height || 210;
    const yFmt = cfg.yFmt || (v => U.fmtNum(v, 0));
    const color = resolveColor(cfg.color);

    const hasTicks = items.some(i => i.tick != null);
    if (hasTicks) {
      container.appendChild(legendRow([
        { kind: 'rect', color, name: cfg.valueName || 'Actual' },
        { kind: 'tick', name: cfg.tickName || 'Plan' },
      ]));
    }

    const maxV = Math.max(...items.map(i => Math.max(i.value || 0, i.tick || 0)), 1);
    const nt = niceTicks(0, maxV * 1.08, 4);
    const yTickStrs = nt.ticks.map(yFmt);
    const mL = 10 + Math.max(...yTickStrs.map(s => s.length)) * 6.6;
    const mR = 8, mT = 12, mB = 24;
    const pw = W - mL - mR, ph = H - mT - mB;
    const Y = v => mT + (1 - (v - nt.lo) / (nt.hi - nt.lo)) * ph;

    const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' });
    if (cfg.label) svg.setAttribute('aria-label', cfg.label);

    for (const tv of nt.ticks) {
      const y = Y(tv);
      svg.appendChild(mk('line', { x1: mL, y1: y, x2: W - mR, y2: y, stroke: T.grid, 'stroke-width': 1 }));
      txt(svg, mL - 7, y + 3.5, yFmt(tv), { anchor: 'end', tnum: true });
    }
    svg.appendChild(mk('line', { x1: mL, y1: mT + ph, x2: W - mR, y2: mT + ph, stroke: T.axis, 'stroke-width': 1 }));

    const n = items.length;
    const slot = pw / n;
    const barW = Math.min(24, Math.max(6, slot - Math.max(2, slot * 0.35)));
    const labelEvery = Math.ceil(44 / slot);

    // direct labels: the max bar and the last bar with a value
    const valued = items.map((it, i) => ({ it, i })).filter(x => x.it.value > 0);
    const maxIdx = valued.length ? valued.reduce((a, b) => b.it.value > a.it.value ? b : a).i : -1;
    let lastIdx = -1;
    for (let i = n - 1; i >= 0; i--) if (items[i].value > 0) { lastIdx = i; break; }

    items.forEach((it, i) => {
      const cx = mL + slot * i + slot / 2;
      const x = cx - barW / 2;
      const v = it.value || 0;
      const barTop = Y(v);
      const h = mT + ph - barTop;

      if (v > 0) {
        const r = Math.min(4, h);
        const d = `M${x},${mT + ph} L${x},${barTop + r} Q${x},${barTop} ${x + r},${barTop} L${x + barW - r},${barTop} Q${x + barW},${barTop} ${x + barW},${barTop + r} L${x + barW},${mT + ph} Z`;
        svg.appendChild(mk('path', { d, fill: color, opacity: it.future ? 0.35 : 1, 'data-bar': i }));
      }
      if (it.tick != null && it.tick > 0) {
        const ty = Y(it.tick);
        const tw = Math.min(barW + 10, slot - 2);
        svg.appendChild(mk('line', { x1: cx - tw / 2, y1: ty, x2: cx + tw / 2, y2: ty, stroke: T.ink2, 'stroke-width': 2, 'stroke-linecap': 'round' }));
      }
      if ((i === maxIdx || i === lastIdx) && v > 0 && barTop > mT + 12) {
        txt(svg, cx, barTop - 5, yFmt(v), { fill: T.ink2, weight: 700, size: 10.5, anchor: 'middle', tnum: true });
      }
      if (i % labelEvery === 0) {
        txt(svg, cx, H - 7, it.label, { anchor: 'middle' });
      }
    });

    // hover: whole-slot hit targets
    const tip = tipFor(container);
    items.forEach((it, i) => {
      const hit = mk('rect', { x: mL + slot * i, y: mT, width: slot, height: ph, fill: 'transparent' });
      hit.addEventListener('pointermove', ev => {
        const crect = container.getBoundingClientRect();
        const bar = svg.querySelector(`[data-bar="${i}"]`);
        svg.querySelectorAll('[data-bar]').forEach(b => b.setAttribute('opacity', items[+b.dataset.bar].future ? 0.35 : 1));
        if (bar) bar.setAttribute('opacity', 0.75);
        showTip(container, tip, ev.clientX - crect.left, ev.clientY - crect.top, t => {
          tipTitle(t, it.tipTitle || it.label);
          tipRow(t, color, yFmt(it.value || 0), cfg.valueName || '');
          if (it.tick != null) tipRow(t, null, yFmt(it.tick), cfg.tickName || 'Plan');
          if (it.tip) for (const s of it.tip) t.appendChild(U.el('div', { class: 'tip-name', text: s }));
        });
      });
      hit.addEventListener('pointerleave', () => {
        tip.style.opacity = '0';
        svg.querySelectorAll('[data-bar]').forEach(b => b.setAttribute('opacity', items[+b.dataset.bar].future ? 0.35 : 1));
      });
      svg.appendChild(hit);
    });

    container.appendChild(svg);
    addTableTwin(container, cfg.table);
  }

  /* ============================ HEATMAP ============================ */

  // cfg: { counts: Map(iso->n), tip(iso,n)=>[lines], label }
  function heat(container, cfg) {
    prepare(container);
    const T = tok();
    const cell = 12, gap = 3, col = cell + gap;
    const availW = Math.max(container.clientWidth || 320, 240);
    const weeks = U.clamp(Math.floor((availW - 34) / col), 8, 26);

    const thisMonday = U.mondayOf(U.todayISO());
    const firstMonday = U.addDays(thisMonday, -7 * (weeks - 1));

    const mT = 16, mL = 30;
    const W = mL + weeks * col;
    const H = mT + 7 * col + 2;

    const wrap = U.el('div', { class: 'heat-wrap' });
    const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' });
    svg.setAttribute('aria-label', cfg.label || 'Training activity calendar');

    ['Mon', 'Wed', 'Fri'].forEach((d, i) => {
      txt(svg, 0, mT + (i * 2) * col + cell - 2, d, { size: 9.5 });
    });

    const tip = tipFor(container);
    let prevMonth = -1;
    for (let wI = 0; wI < weeks; wI++) {
      const monday = U.addDays(firstMonday, wI * 7);
      const m = U.isoToDate(monday).getMonth();
      if (m !== prevMonth) {
        txt(svg, mL + wI * col, 9, U.MON_SHORT[m], { size: 9.5 });
        prevMonth = m;
      }
      for (let dI = 0; dI < 7; dI++) {
        const iso = U.addDays(monday, dI);
        if (iso > U.todayISO()) continue;
        const nAct = cfg.counts.get(iso) || 0;
        const fill = T.heat[U.clamp(nAct, 0, 4)];
        const rect = mk('rect', {
          x: mL + wI * col, y: mT + dI * col, width: cell, height: cell, rx: 3, fill,
          stroke: nAct === 0 ? T.grid : 'none', 'stroke-width': nAct === 0 ? 1 : 0,
        });
        rect.addEventListener('pointermove', ev => {
          const crect = container.getBoundingClientRect();
          showTip(container, tip, ev.clientX - crect.left, ev.clientY - crect.top, t => {
              tipTitle(t, U.fmtDate(iso, 'dow'));
              const lines = cfg.tip ? cfg.tip(iso, nAct) : [`${nAct} session${nAct === 1 ? '' : 's'}`];
              for (const s of lines) t.appendChild(U.el('div', { class: 'tip-row', text: s }));
            });
        });
        rect.addEventListener('pointerleave', () => { tip.style.opacity = '0'; });
        svg.appendChild(rect);
      }
    }

    wrap.appendChild(svg);
    container.appendChild(wrap);

    const lg = U.el('div', { class: 'heat-legend' });
    lg.appendChild(U.el('span', { text: 'Less' }));
    for (let i = 0; i <= 4; i++) {
      lg.appendChild(U.el('span', {
        class: 'hcell',
        style: `background:${T.heat[i]};${i === 0 ? `box-shadow: inset 0 0 0 1px ${T.grid}` : ''}`,
      }));
    }
    lg.appendChild(U.el('span', { text: 'More' }));
    container.appendChild(lg);
  }

  return { line, bars, heat, cssVar };
})();
