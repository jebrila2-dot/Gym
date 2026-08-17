/* Original exercise diagrams — no third-party images.
   Two-panel movement diagrams (start → finish, motion arrow) drawn from a small
   pose model, plus front/back muscle maps. All inline SVG using theme tokens,
   authored for this app and released with it (treat as public domain / CC0). */
'use strict';

const Diagrams = (() => {

  const NS = 'http://www.w3.org/2000/svg';

  /* ---------------- svg helpers ---------------- */

  function mk(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
    return n;
  }

  const INK = 'var(--ink-2)';
  const FADE = 'var(--viz-deemph)';
  const EQ = 'var(--accent)';
  const ARROW = 'var(--run)';
  const GROUND = 'var(--viz-axis)';
  const SOFT = 'var(--surface-3)';
  const LINEC = 'var(--line)';

  /* ---------------- figure model ----------------
     Side view faces right. Angles in degrees: 0 = up, 90 = forward (+x),
     180 = down, 270 = backward. dir(a) = (sin a, -cos a) with y down. */

  const L = { torso: 22, headR: 5.2, neck: 8.6, upper: 13, fore: 12, thigh: 18, shin: 16, foot: 7 };

  const rad = a => a * Math.PI / 180;
  const dir = a => [Math.sin(rad(a)), -Math.cos(rad(a))];
  const at = (p, a, len) => { const d = dir(a); return [p[0] + d[0] * len, p[1] + d[1] * len]; };

  // Compute joint positions for a side-view frame.
  function joints(f) {
    const hip = f.hip;
    const sho = at(hip, f.torso, L.torso);
    const headC = at(sho, f.head != null ? f.head : f.torso, L.neck);
    const j = { hip, sho, headC };
    j.elb = at(sho, f.arm, L.upper);
    j.hand = at(j.elb, f.fore, L.fore);
    if (f.arm2 != null) {
      j.elb2 = at(sho, f.arm2, L.upper);
      j.hand2 = at(j.elb2, f.fore2 != null ? f.fore2 : f.fore, L.fore);
    }
    j.knee = at(hip, f.thigh, L.thigh);
    j.ankle = at(j.knee, f.shin, L.shin);
    j.toe = at(j.ankle, f.foot != null ? f.foot : 92, L.foot);
    if (f.thigh2 != null) {
      j.knee2 = at(hip, f.thigh2, L.thigh);
      j.ankle2 = at(j.knee2, f.shin2 != null ? f.shin2 : f.shin, L.shin);
      j.toe2 = at(j.ankle2, f.foot2 != null ? f.foot2 : 92, L.foot);
    }
    return j;
  }

  function line(g, a, b, stroke, w) {
    g.appendChild(mk('line', { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1), stroke, 'stroke-width': w || 2.4, 'stroke-linecap': 'round' }));
  }
  function poly(g, pts, stroke, w) {
    g.appendChild(mk('polyline', { points: pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), fill: 'none', stroke, 'stroke-width': w || 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }
  function circ(g, c, r, stroke, fill, w) {
    g.appendChild(mk('circle', { cx: c[0].toFixed(1), cy: c[1].toFixed(1), r, stroke, fill: fill || 'none', 'stroke-width': w == null ? 2.2 : w }));
  }

  // Draw a side-view figure. Back limbs (…2) draw first, faded.
  function drawFigure(g, f) {
    const j = joints(f);
    if (j.knee2) poly(g, [f.hip, j.knee2, j.ankle2, j.toe2], FADE);
    if (j.elb2) poly(g, [j.sho, j.elb2, j.hand2], FADE);
    poly(g, [f.hip, j.knee, j.ankle, j.toe], INK);
    line(g, f.hip, j.sho, INK, 2.8);
    circ(g, j.headC, L.headR, INK);
    poly(g, [j.sho, j.elb, j.hand], INK);
    return j;
  }

  // Front view: symmetric figure, arms abducted by `abd` degrees from straight
  // down (0 = arms at sides, 90 = horizontal), legs apart by `stance`.
  function drawFront(g, f) {
    const cx = f.x != null ? f.x : 66;
    const hipY = f.hipY != null ? f.hipY : 58;
    const sho = [cx, hipY - L.torso];
    const headC = [cx, sho[1] - L.neck];
    const stance = f.stance != null ? f.stance : 8;
    const abd = f.abd != null ? f.abd : 5;
    const bend = f.armBend != null ? f.armBend : 0; // elbow bend toward vertical
    line(g, [cx, hipY], sho, INK, 2.8);
    circ(g, headC, L.headR, INK);
    const j = { sho, headC, hip: [cx, hipY], hands: [] };
    for (const s of [-1, 1]) {
      const shoS = [cx + s * 3.5, sho[1] + 1];
      const elb = at(shoS, 180 + s * abd, L.upper);
      const hand = at(elb, 180 + s * (abd - bend), L.fore);
      poly(g, [shoS, elb, hand], INK);
      j.hands.push(hand);
      const kneeS = at([cx + s * 3, hipY], 180 + s * (f.legAbd != null ? f.legAbd : 0), L.thigh);
      const ankleS = at(kneeS, 180 + s * (f.legAbd != null ? f.legAbd / 2 : 0), L.shin);
      poly(g, [[cx + s * 3, hipY], kneeS, ankleS, [ankleS[0] + s * stance / 3, ankleS[1] + 2]], INK);
    }
    return j;
  }

  /* ---------------- equipment glyphs ---------------- */

  const EQUIP = {
    bar(g, j) { // barbell end-on: plate at the hand
      circ(g, j.hand, 6.5, EQ, 'none', 2.4);
      circ(g, j.hand, 1.3, EQ, EQ, 0);
    },
    barBoth(g, j) { if (j.hands) for (const h of j.hands) { circ(g, h, 4, EQ, 'none', 2.2); } if (j.hands) line(g, j.hands[0], j.hands[1], EQ, 2.2); },
    db(g, j) { dbAt(g, j.hand); },
    db2(g, j) { if (j.hand2) dbAt(g, j.hand2, true); dbAt(g, j.hand); },
    dbFront(g, j) { if (j.hands) for (const h of j.hands) dbAt(g, h); },
    kb(g, j) { circ(g, [j.hand[0], j.hand[1] + 4.5], 3.8, EQ, 'none', 2.2); poly(g, [[j.hand[0] - 2.5, j.hand[1] + 1.5], [j.hand[0], j.hand[1] - 1], [j.hand[0] + 2.5, j.hand[1] + 1.5]], EQ, 2); },
  };

  function dbAt(g, hand, faded) {
    const c = faded ? FADE : EQ;
    g.appendChild(mk('rect', { x: hand[0] - 4.5, y: hand[1] - 2, width: 9, height: 4, rx: 1.8, stroke: c, fill: 'none', 'stroke-width': 2 }));
  }

  function bench(g, x, y, w, angleDeg) {
    const a = angleDeg || 0;
    const g2 = mk('g', a ? { transform: `rotate(${-a} ${x} ${y})` } : null);
    g2.appendChild(mk('rect', { x, y, width: w, height: 5, rx: 2.5, fill: SOFT, stroke: LINEC, 'stroke-width': 1 }));
    g.appendChild(g2);
    // legs
    line(g, [x + 6, y + 5], [x + 6, 100], LINEC, 2);
    line(g, [x + w - 6, y + 5], [x + w - 6, 100], LINEC, 2);
  }

  function cable(g, anchor, hand) {
    line(g, anchor, hand, EQ, 1.6);
    circ(g, anchor, 2.6, EQ, 'none', 2);
  }

  function overheadBar(g, x1, x2, y) {
    line(g, [x1, y], [x2, y], EQ, 2.6);
  }

  function wallRight(g, x) {
    line(g, [x, 22], [x, 100], LINEC, 2.5);
  }

  /* ---------------- panels & arrows ---------------- */

  const PW = 132, PH = 112, GY = 100;

  function panel(num) {
    const g = mk('g');
    g.appendChild(mk('line', { x1: 8, y1: GY, x2: PW - 8, y2: GY, stroke: GROUND, 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
    const t = mk('text', { x: 10, y: 16, fill: 'var(--muted)', 'font-size': 10, 'font-weight': 700, 'font-family': 'inherit' });
    t.textContent = num;
    g.appendChild(t);
    return g;
  }

  function motionArrow(g, from, to) {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return;
    // curved control point offset perpendicular to travel
    const mx = (from[0] + to[0]) / 2 - dy * 0.25;
    const my = (from[1] + to[1]) / 2 + dx * 0.25;
    g.appendChild(mk('path', {
      d: `M${from[0].toFixed(1)},${from[1].toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${to[0].toFixed(1)},${to[1].toFixed(1)}`,
      fill: 'none', stroke: ARROW, 'stroke-width': 2, 'stroke-linecap': 'round',
    }));
    // arrowhead
    const angle = Math.atan2(to[1] - my, to[0] - mx);
    const a1 = angle + 2.6, a2 = angle - 2.6;
    poly(g, [[to[0] + Math.cos(a1) * 6, to[1] + Math.sin(a1) * 6], to, [to[0] + Math.cos(a2) * 6, to[1] + Math.sin(a2) * 6]], ARROW, 2);
  }

  /* Build a two-panel (or single-panel hold) diagram from an archetype spec:
     { frames: [f1, f2], draw(g, frame, joints, idx), arrow: jointName | fn, hold, front } */
  function render(spec) {
    const holdW = PW + 20;
    const width = spec.hold ? holdW : PW * 2 + 12;
    const svg = mk('svg', { viewBox: `0 0 ${width} ${PH}`, class: 'exdiagram', role: 'img', 'aria-label': 'Movement diagram' });

    const frames = spec.hold ? [spec.frames[0]] : spec.frames;
    const jointSets = [];
    frames.forEach((f, i) => {
      const g = panel(spec.hold ? 'hold' : String(i + 1));
      if (!spec.hold) g.setAttribute('transform', `translate(${i * (PW + 12)} 0)`);
      else g.setAttribute('transform', 'translate(10 0)');
      if (spec.before) spec.before(g, f, i);
      const j = spec.front ? drawFront(g, f) : drawFigure(g, f);
      jointSets.push(j);
      if (spec.draw) spec.draw(g, f, j, i);
      svg.appendChild(g);
    });

    if (!spec.hold && spec.arrow) {
      const g2 = svg.lastChild;
      const [j1, j2] = jointSets;
      // joints are [x,y]; only unwrap collections like `hands` (array of points)
      const pick = (js, name) => { const v = js[name]; if (!v) return null; return Array.isArray(v[0]) ? v[0] : v; };
      let from, to;
      if (typeof spec.arrow === 'function') { [from, to] = spec.arrow(j1, j2); }
      else { from = pick(j1, spec.arrow); to = pick(j2, spec.arrow); }
      if (from && to) {
        const a = mk('g');
        motionArrow(a, from, to);
        g2.appendChild(a);
      }
    }
    return svg;
  }

  /* ---------------- archetype library ---------------- */
  /* Base poses (side view). Ground at y=100; standing hip ≈ y 63. */

  const STAND = { hip: [58, 63], torso: 2, thigh: 180, shin: 180, arm: 175, fore: 175 };

  const ARCH = {};

  // ---- squat family
  ARCH.squat = opts => ({
    frames: [
      { ...STAND, hip: [58, 63], torso: 6, arm: 55, fore: 300 },
      { hip: [50, 79], torso: 32, thigh: 95, shin: 172, arm: 60, fore: 305 },
    ],
    arrow: 'hip',
    draw(g, f, j) {
      if (opts.front) { circ(g, at(j.sho, f.torso + 25, 6), 6.2, EQ); } // bar racked front
      else if (opts.goblet) { circ(g, [j.sho[0] + 6, j.sho[1] + 8], 4.6, EQ); }
      else EQUIP.bar(g, { hand: at(j.sho, f.torso, 2) }); // bar on the upper back
    },
  });

  ARCH.legpress = () => ({
    frames: [
      { hip: [42, 74], torso: 320, thigh: 55, shin: 350, arm: 170, fore: 160, head: 315 },
      { hip: [42, 74], torso: 320, thigh: 78, shin: 55, arm: 170, fore: 160, head: 315 },
    ],
    arrow: 'ankle',
    before(g) {
      g.appendChild(mk('rect', { x: 18, y: 62, width: 26, height: 30, rx: 3, fill: SOFT, stroke: LINEC, 'stroke-width': 1, transform: 'rotate(18 31 77)' }));
    },
    draw(g, f, j) {
      const a = at(j.ankle, f.shin, 4);
      const d = dir(f.shin + 90);
      line(g, [a[0] - d[0] * 11, a[1] - d[1] * 11], [a[0] + d[0] * 11, a[1] + d[1] * 11], EQ, 3);
    },
  });

  ARCH.legext = () => ({
    frames: [
      { hip: [56, 58], torso: 355, thigh: 100, shin: 172, arm: 160, fore: 185 },
      { hip: [56, 58], torso: 355, thigh: 100, shin: 96, arm: 160, fore: 185 },
    ],
    arrow: 'ankle',
    before(g) { bench(g, 40, 62, 36); },
    draw(g, f, j) { circ(g, [j.ankle[0], j.ankle[1] + 2], 3, EQ, 'none', 2); },
  });

  ARCH.splitsquat = opts => ({
    frames: [
      { hip: [56, 62], torso: 4, thigh: 168, shin: 178, thigh2: 215, shin2: opts.rearUp ? 300 : 190, arm: 178, fore: 178, foot2: 130 },
      { hip: [56, 76], torso: 8, thigh: 115, shin: 175, thigh2: 200, shin2: opts.rearUp ? 285 : 150, arm: 178, fore: 178, foot2: 130 },
    ],
    arrow: 'hip',
    before(g) { if (opts.rearUp) bench(g, 84, 74, 34); },
    draw(g, f, j) { dbAt(g, j.hand); },
  });

  ARCH.stepup = () => ({
    frames: [
      { hip: [46, 66], torso: 8, thigh: 130, shin: 195, thigh2: 178, shin2: 180, arm: 178, fore: 178 },
      { hip: [72, 46], torso: 3, thigh: 178, shin: 178, thigh2: 210, shin2: 160, arm: 178, fore: 178 },
    ],
    arrow: 'hip',
    before(g) {
      g.appendChild(mk('rect', { x: 62, y: 82, width: 46, height: 18, rx: 2, fill: SOFT, stroke: LINEC, 'stroke-width': 1 }));
    },
    draw(g, f, j) { dbAt(g, j.hand); },
  });

  // ---- hinge family
  ARCH.deadlift = opts => ({
    frames: [
      { hip: [50, 74], torso: 52, thigh: 130, shin: 168, arm: 148, fore: 165 },
      { hip: [56, 63], torso: 4, thigh: 180, shin: 180, arm: 172, fore: 176 },
    ],
    arrow: 'hand',
    draw(g, f, j) {
      if (opts.trap) { circ(g, j.hand, 6, EQ, 'none', 2.2); g.appendChild(mk('rect', { x: j.hand[0] - 8, y: j.hand[1] - 8, width: 16, height: 16, rx: 4, stroke: EQ, fill: 'none', 'stroke-width': 1.6 })); }
      else EQUIP.bar(g, j);
    },
    before(g, f, i) { if (opts.rack && i === 0) { line(g, [30, 84], [100, 84], LINEC, 2); } },
  });

  ARCH.rdl = opts => ({
    frames: [
      { hip: [58, 63], torso: 4, thigh: 180, shin: 180, arm: 174, fore: 176 },
      { hip: [48, 66], torso: 68, thigh: 165, shin: 175, arm: 130, fore: 150 },
    ],
    arrow: 'hand',
    draw(g, f, j) { if (opts.db) dbAt(g, j.hand); else EQUIP.bar(g, j); },
  });

  ARCH.slrdl = () => ({
    frames: [
      { hip: [58, 63], torso: 4, thigh: 180, shin: 180, thigh2: 185, shin2: 185, arm: 174, fore: 176 },
      { hip: [50, 64], torso: 78, thigh: 172, shin: 178, thigh2: 300, shin2: 285, arm: 140, fore: 155, foot2: 20 },
    ],
    arrow: 'hand',
    draw(g, f, j) { dbAt(g, j.hand); },
  });

  ARCH.goodmorning = () => ({
    frames: [
      { hip: [58, 63], torso: 4, thigh: 180, shin: 180, arm: 40, fore: 300 },
      { hip: [50, 66], torso: 62, thigh: 170, shin: 176, arm: 100, fore: 355 },
    ],
    arrow: 'sho',
    draw(g, f, j) { EQUIP.bar(g, { hand: at(j.sho, f.torso, 2) }); },
  });

  ARCH.swing = opts => ({
    frames: [
      { hip: [52, 68], torso: 48, thigh: 150, shin: 172, arm: 165, fore: 190 },
      { hip: [58, 62], torso: 2, thigh: 180, shin: 180, arm: 95, fore: 95 },
    ],
    arrow: 'hand',
    draw(g, f, j) { if (opts.cable) cable(g, [12, 92], j.hand); else EQUIP.kb(g, j); },
  });

  ARCH.hipthrust = opts => ({
    frames: [
      { hip: [56, 82], torso: 300, thigh: 95, shin: 178, arm: 250, fore: 250, head: 320 },
      { hip: [56, 64], torso: 318, thigh: 120, shin: 195, arm: 262, fore: 262, head: 330 },
    ],
    arrow: 'hip',
    before(g) { if (!opts.floor) bench(g, 16, 58, 30); },
    draw(g, f, j, i) { if (!opts.bw) circ(g, [f.hip[0] + 6, f.hip[1] - (i ? 6 : 4)], 6, EQ, 'none', 2.2); },
  });

  ARCH.backext = () => ({
    frames: [
      { hip: [54, 60], torso: 125, head: 125, thigh: 262, shin: 268, foot: 0, arm: 160, fore: 165 },
      { hip: [54, 60], torso: 55, head: 55, thigh: 262, shin: 268, foot: 0, arm: 160, fore: 240 },
    ],
    arrow: 'sho',
    before(g) {
      g.appendChild(mk('rect', { x: 40, y: 62, width: 20, height: 6, rx: 3, fill: SOFT, stroke: LINEC, 'stroke-width': 1 }));
      line(g, [50, 68], [50, 100], LINEC, 2);
      line(g, [16, 66], [30, 66], EQ, 2.6); // ankle roller
      line(g, [23, 66], [23, 100], LINEC, 2);
    },
  });

  // ---- horizontal push
  ARCH.benchpress = opts => {
    const inc = !!opts.incline;
    const torso = inc ? 62 : 88;
    const hip = inc ? [44, 66] : [50, 63];
    const legs = inc ? { thigh: 195, shin: 182 } : { thigh: 205, shin: 187 };
    return {
      frames: [
        { hip, torso, head: torso, ...legs, arm: inc ? 141 : 95, fore: inc ? 326 : 297 },
        { hip, torso, head: torso, ...legs, arm: inc ? 358 : 5, fore: 0 },
      ],
      arrow: 'hand',
      before(g) { if (inc) bench(g, 30, 70, 52, 24); else bench(g, 26, 66, 66); },
      draw(g, f, j) { if (opts.db) dbAt(g, j.hand); else EQUIP.bar(g, j); },
    };
  };

  ARCH.pushup = () => ({
    frames: [
      { hip: [52, 80], torso: 80, head: 80, thigh: 258, shin: 252, foot: 165, arm: 170, fore: 178 },
      { hip: [52, 84], torso: 82, head: 82, thigh: 262, shin: 254, foot: 165, arm: 128, fore: 218 },
    ],
    arrow: 'sho',
  });

  ARCH.dip = opts => ({
    frames: [
      { hip: [60, 66], torso: opts.lean ? 18 : 6, thigh: 235, shin: 300, foot: 120, arm: 172, fore: 180 },
      { hip: [60, 76], torso: opts.lean ? 24 : 8, thigh: 235, shin: 300, foot: 120, arm: 140, fore: 210 },
    ],
    arrow: 'sho',
    draw(g, f, j) { line(g, [j.hand[0] - 12, j.hand[1]], [j.hand[0] + 12, j.hand[1]], EQ, 2.6); },
  });

  ARCH.benchdip = () => ({
    frames: [
      { hip: [58, 74], torso: 12, thigh: 120, shin: 160, arm: 222, fore: 127 },
      { hip: [58, 84], torso: 16, thigh: 112, shin: 155, arm: 238, fore: 76 },
    ],
    arrow: 'hip',
    before(g) { bench(g, 52, 66, 34); },
  });

  ARCH.fly = opts => opts.lying ? {
    frames: [
      { hip: [50, 63], torso: 88, head: 88, thigh: 205, shin: 187, arm: 38, fore: 30, arm2: 322, fore2: 330 },
      { hip: [50, 63], torso: 88, head: 88, thigh: 205, shin: 187, arm: 6, fore: 2, arm2: 354, fore2: 358 },
    ],
    arrow: 'hand',
    before(g) { bench(g, 30, 66, 58); },
    draw(g, f, j) { if (j.hand2) dbAt(g, j.hand2, true); dbAt(g, j.hand); },
  } : {
    frames: [
      { hip: [58, 63], torso: 6, thigh: 178, shin: 180, arm: 250, fore: 265, arm2: 110, fore2: 95 },
      { hip: [58, 63], torso: 6, thigh: 178, shin: 180, arm: 95, fore: 92, arm2: 85, fore2: 88 },
    ],
    arrow: 'hand',
    draw(g, f, j) { cable(g, [14, 30], j.hand); if (j.hand2) cable(g, [122, 30], j.hand2); },
  };

  // ---- vertical push
  ARCH.ohp = opts => ({
    frames: [
      { hip: [58, 63], torso: 2, thigh: 180, shin: 180, arm: 150, fore: 318 },
      { hip: [58, 63], torso: 358, thigh: 180, shin: 180, arm: 12, fore: 4 },
    ],
    arrow: 'hand',
    draw(g, f, j) { if (opts.db) dbAt(g, j.hand); else EQUIP.bar(g, j); },
    before(g) { if (opts.seated) bench(g, 44, 66, 30); },
  });

  ARCH.landmine = () => ({
    frames: [
      { hip: [46, 74], torso: 4, thigh: 120, shin: 172, thigh2: 200, shin2: 262, arm: 120, fore: 350 },
      { hip: [46, 74], torso: 6, thigh: 120, shin: 172, thigh2: 200, shin2: 262, arm: 55, fore: 48 },
    ],
    arrow: 'hand',
    draw(g, f, j) { line(g, [116, 94], j.hand, EQ, 2.4); circ(g, [116, 94], 2.6, EQ); },
  });

  // ---- horizontal pull
  ARCH.row = opts => ({
    frames: [
      { hip: [52, 66], torso: opts.deep ? 78 : 58, thigh: 160, shin: 174, arm: 150, fore: 170 },
      { hip: [52, 66], torso: opts.deep ? 78 : 58, thigh: 160, shin: 174, arm: 215, fore: 300 },
    ],
    arrow: 'hand',
    draw(g, f, j) { if (opts.db) dbAt(g, j.hand); else EQUIP.bar(g, j); },
  });

  ARCH.csrow = () => ({
    frames: [
      { hip: [46, 72], torso: 58, head: 58, thigh: 138, shin: 192, arm: 172, fore: 176 },
      { hip: [46, 72], torso: 58, head: 58, thigh: 138, shin: 192, arm: 215, fore: 0 },
    ],
    arrow: 'hand',
    before(g) { bench(g, 40, 74, 46, 26); },
    draw(g, f, j) { dbAt(g, j.hand); },
  });

  ARCH.seatedrow = () => ({
    frames: [
      { hip: [54, 74], torso: 8, thigh: 100, shin: 168, arm: 105, fore: 92 },
      { hip: [54, 74], torso: 356, thigh: 100, shin: 168, arm: 165, fore: 282 },
    ],
    arrow: 'hand',
    before(g) { bench(g, 40, 78, 26); },
    draw(g, f, j) { cable(g, [120, 66], j.hand); },
  });

  ARCH.invrow = () => ({
    frames: [
      { hip: [70, 86], torso: 282, head: 282, thigh: 100, shin: 108, arm: 350, fore: 352 },
      { hip: [70, 78], torso: 285, head: 285, thigh: 108, shin: 118, arm: 20, fore: 290 },
    ],
    arrow: 'sho',
    before(g) {
      overheadBar(g, 36, 100, 58);
      line(g, [38, 58], [38, 100], LINEC, 2);
      line(g, [98, 58], [98, 100], LINEC, 2);
    },
  });

  // ---- vertical pull
  ARCH.pullup = opts => ({
    frames: [
      { hip: [64, 62], torso: 356, thigh: 192, shin: 232, arm: 8, fore: 2 },
      { hip: [64, 46], torso: 352, thigh: 196, shin: 240, arm: 60, fore: 290 },
    ],
    arrow: 'sho',
    before(g) { overheadBar(g, 40, 110, 14); },
    hold: opts && opts.hold,
  });

  ARCH.pulldown = () => ({
    frames: [
      { hip: [56, 72], torso: 352, thigh: 96, shin: 170, arm: 20, fore: 10 },
      { hip: [56, 72], torso: 346, thigh: 96, shin: 170, arm: 140, fore: 300 },
    ],
    arrow: 'hand',
    before(g) { bench(g, 42, 76, 28); },
    draw(g, f, j) { cable(g, [96, 12], j.hand); },
  });

  ARCH.straightarm = () => ({
    frames: [
      { hip: [50, 64], torso: 14, thigh: 172, shin: 178, arm: 55, fore: 60 },
      { hip: [50, 64], torso: 14, thigh: 172, shin: 178, arm: 160, fore: 165 },
    ],
    arrow: 'hand',
    draw(g, f, j) { cable(g, [118, 16], j.hand); },
  });

  ARCH.shrug = () => ({
    frames: [
      { hip: [58, 63], torso: 2, thigh: 180, shin: 180, arm: 178, fore: 178 },
      { hip: [58, 61.5], torso: 2, thigh: 180, shin: 180, arm: 176, fore: 176 },
    ],
    arrow: 'sho',
    draw(g, f, j) { EQUIP.bar(g, j); },
  });

  // ---- shoulders isolation (front view where side view fails)
  ARCH.latraise = opts => ({
    front: true,
    frames: [
      { abd: 8, armBend: 0 },
      { abd: 85, armBend: 0 },
    ],
    arrow: (j1, j2) => [j1.hands[1], j2.hands[1]],
    draw(g, f, j) { if (opts.cable) cable(g, [8, 96], j.hands[0]); for (const h of j.hands) if (!opts.cable) dbAt(g, h); },
  });

  ARCH.uprightrow = () => ({
    front: true,
    frames: [
      { abd: 6, armBend: 0 },
      { abd: 50, armBend: 25 },
    ],
    arrow: (j1, j2) => [j1.hands[1], j2.hands[1]],
    draw(g, f, j) { EQUIP.barBoth(g, j); },
  });

  ARCH.frontraise = () => ({
    frames: [
      { hip: [58, 63], torso: 2, thigh: 180, shin: 180, arm: 172, fore: 172 },
      { hip: [58, 63], torso: 2, thigh: 180, shin: 180, arm: 88, fore: 88 },
    ],
    arrow: 'hand',
    draw(g, f, j) { dbAt(g, j.hand); },
  });

  ARCH.rearfly = opts => ({
    frames: [
      { hip: [52, 66], torso: 70, thigh: 162, shin: 175, arm: 165, fore: 172 },
      { hip: [52, 66], torso: 70, thigh: 162, shin: 175, arm: 268, fore: 272 },
    ],
    arrow: 'hand',
    draw(g, f, j) { if (opts.machine) cable(g, [116, 40], j.hand); else dbAt(g, j.hand); },
  });

  ARCH.facepull = () => ({
    frames: [
      { hip: [50, 63], torso: 4, thigh: 178, shin: 180, arm: 62, fore: 70 },
      { hip: [50, 63], torso: 358, thigh: 178, shin: 180, arm: 120, fore: 285 },
    ],
    arrow: 'hand',
    draw(g, f, j) { cable(g, [120, 28], j.hand); },
  });

  // ---- arms
  ARCH.curl = opts => ({
    frames: [
      { hip: [58, 63], torso: 2, thigh: 180, shin: 180, arm: 178, fore: 178 },
      { hip: [58, 63], torso: 2, thigh: 180, shin: 180, arm: 178, fore: 300 },
    ],
    arrow: 'hand',
    draw(g, f, j) {
      if (opts.cable) cable(g, [116, 94], j.hand);
      else if (opts.bar) EQUIP.bar(g, j);
      else dbAt(g, j.hand);
    },
  });

  ARCH.preacher = () => ({
    frames: [
      { hip: [50, 70], torso: 10, thigh: 105, shin: 172, arm: 140, fore: 160 },
      { hip: [50, 70], torso: 10, thigh: 105, shin: 172, arm: 140, fore: 280 },
    ],
    arrow: 'hand',
    before(g) {
      g.appendChild(mk('rect', { x: 62, y: 58, width: 26, height: 7, rx: 3, fill: SOFT, stroke: LINEC, 'stroke-width': 1, transform: 'rotate(26 75 61)' }));
      line(g, [72, 68], [72, 100], LINEC, 2);
    },
    draw(g, f, j) { dbAt(g, j.hand); },
  });

  ARCH.inclinecurl = () => ({
    frames: [
      { hip: [48, 68], torso: 42, thigh: 130, shin: 175, arm: 195, fore: 195, head: 42 },
      { hip: [48, 68], torso: 42, thigh: 130, shin: 175, arm: 195, fore: 310, head: 42 },
    ],
    arrow: 'hand',
    before(g) { bench(g, 30, 58, 40, -32); },
    draw(g, f, j) { dbAt(g, j.hand); },
  });

  ARCH.pushdown = () => ({
    frames: [
      { hip: [54, 63], torso: 6, thigh: 180, shin: 180, arm: 168, fore: 65 },
      { hip: [54, 63], torso: 6, thigh: 180, shin: 180, arm: 168, fore: 178 },
    ],
    arrow: 'hand',
    draw(g, f, j) { cable(g, [92, 12], j.hand); },
  });

  ARCH.ohext = opts => ({
    frames: [
      { hip: [58, 63], torso: 4, thigh: 180, shin: 180, arm: 10, fore: 235 },
      { hip: [58, 63], torso: 4, thigh: 180, shin: 180, arm: 8, fore: 8 },
    ],
    arrow: 'hand',
    draw(g, f, j) { if (opts.cable) cable(g, [14, 90], j.hand); else dbAt(g, j.hand); },
  });

  ARCH.skull = () => ({
    frames: [
      { hip: [50, 63], torso: 88, head: 88, thigh: 205, shin: 187, arm: 0, fore: 115 },
      { hip: [50, 63], torso: 88, head: 88, thigh: 205, shin: 187, arm: 0, fore: 355 },
    ],
    arrow: 'hand',
    before(g) { bench(g, 30, 66, 58); },
    draw(g, f, j) { EQUIP.bar(g, j); },
  });

  ARCH.kickback = () => ({
    frames: [
      { hip: [52, 66], torso: 68, thigh: 162, shin: 175, arm: 250, fore: 170 },
      { hip: [52, 66], torso: 68, thigh: 162, shin: 175, arm: 250, fore: 255 },
    ],
    arrow: 'hand',
    draw(g, f, j) { dbAt(g, j.hand); },
  });

  ARCH.wristcurl = () => ({
    frames: [
      { hip: [50, 70], torso: 15, thigh: 105, shin: 172, arm: 130, fore: 95 },
      { hip: [50, 70], torso: 15, thigh: 105, shin: 172, arm: 130, fore: 80 },
    ],
    arrow: 'hand',
    before(g) { bench(g, 60, 66, 30); },
    draw(g, f, j) { dbAt(g, j.hand); },
  });

  // ---- legs isolation
  ARCH.legcurl = opts => opts.seated ? {
    frames: [
      { hip: [54, 60], torso: 352, thigh: 96, shin: 120, arm: 165, fore: 180 },
      { hip: [54, 60], torso: 352, thigh: 96, shin: 195, arm: 165, fore: 180 },
    ],
    arrow: 'ankle',
    before(g) { bench(g, 38, 64, 34); },
    draw(g, f, j) { circ(g, [j.ankle[0], j.ankle[1] + 2], 3, EQ, 'none', 2); },
  } : {
    frames: [
      { hip: [58, 70], torso: 272, thigh: 96, shin: 92, arm: 300, fore: 300, head: 268 },
      { hip: [58, 70], torso: 272, thigh: 96, shin: 335, arm: 300, fore: 300, head: 268 },
    ],
    arrow: 'ankle',
    before(g) { bench(g, 26, 74, 70); },
    draw(g, f, j) { circ(g, [j.ankle[0], j.ankle[1] - 2], 3, EQ, 'none', 2); },
  };

  ARCH.nordic = () => ({
    frames: [
      { hip: [56, 66], torso: 350, thigh: 96, shin: 262, arm: 40, fore: 60 },
      { hip: [74, 74], torso: 302, thigh: 100, shin: 268, arm: 300, fore: 310, head: 305 },
    ],
    arrow: 'sho',
    draw(g, f, j) { line(g, [j.ankle[0] - 5, j.ankle[1] + 4], [j.ankle[0] + 8, j.ankle[1] + 4], EQ, 3); },
  });

  ARCH.gluteiso = opts => opts.front ? {
    front: true,
    frames: [
      { abd: 6, legAbd: 4, stance: 8 },
      { abd: 6, legAbd: 26, stance: 20 },
    ],
    arrow: (j1, j2) => [[j1.hip[0] + 14, 92], [j2.hip[0] + 24, 88]],
  } : {
    frames: [
      { hip: [52, 64], torso: 22, thigh: 172, shin: 178, thigh2: 195, shin2: 200, arm: 90, fore: 80 },
      { hip: [52, 64], torso: 22, thigh: 172, shin: 178, thigh2: 248, shin2: 245, arm: 90, fore: 80 },
    ],
    arrow: (j1, j2) => [j1.ankle2, j2.ankle2],
    draw(g, f, j) { cable(g, [14, 92], j.ankle2 || j.ankle); },
  };

  ARCH.calfraise = opts => opts.seated ? {
    frames: [
      { hip: [54, 62], torso: 356, thigh: 96, shin: 176, arm: 150, fore: 120 },
      { hip: [54, 58], torso: 356, thigh: 88, shin: 172, arm: 150, fore: 120, foot: 60 },
    ],
    arrow: 'knee',
    before(g) { bench(g, 40, 66, 30); },
    draw(g, f, j) { line(g, [j.knee[0] - 8, j.knee[1] - 5], [j.knee[0] + 10, j.knee[1] - 5], EQ, 3); },
  } : {
    frames: [
      { hip: [58, 61], torso: 2, thigh: 180, shin: 180, arm: 40, fore: 320, foot: 92 },
      { hip: [58, 55], torso: 2, thigh: 180, shin: 178, arm: 40, fore: 320, foot: 55 },
    ],
    arrow: 'hip',
    before(g) { g.appendChild(mk('rect', { x: 48, y: 94, width: 26, height: 6, rx: 1.5, fill: SOFT, stroke: LINEC, 'stroke-width': 1 })); },
    draw(g, f, j) { if (!opts.bw) EQUIP.bar(g, { hand: at(j.sho, f.torso, 2) }); },
  };

  ARCH.tibialis = () => ({
    frames: [
      { hip: [66, 64], torso: 348, thigh: 172, shin: 168, arm: 200, fore: 200, foot: 95 },
      { hip: [66, 64], torso: 348, thigh: 172, shin: 168, arm: 200, fore: 200, foot: 40 },
    ],
    arrow: 'toe',
    before(g) { wallRight(g, 84); },
  });

  // ---- core
  ARCH.plank = () => ({
    hold: true,
    frames: [{ hip: [66, 86], torso: 283, head: 283, thigh: 96, shin: 100, arm: 185, fore: 268 }],
  });

  ARCH.sideplank = () => ({
    hold: true,
    frames: [{ hip: [66, 84], torso: 285, head: 285, thigh: 98, shin: 99, arm: 187, fore: 270, arm2: 15, fore2: 10 }],
  });

  ARCH.copenhagen = () => ({
    hold: true,
    frames: [{ hip: [58, 72], torso: 288, thigh: 96, shin: 92, arm: 178, fore: 95, head: 292 }],
    before(g) { bench(g, 80, 72, 34); },
  });

  ARCH.hangraise = opts => ({
    frames: [
      { hip: [64, 60], torso: 354, thigh: 186, shin: 200, arm: 6, fore: 2 },
      { hip: [64, 60], torso: 348, thigh: opts.straight ? 92 : 110, shin: opts.straight ? 96 : 195, arm: 8, fore: 4 },
    ],
    arrow: 'ankle',
    before(g) { overheadBar(g, 40, 110, 12); },
  });

  ARCH.crunch = opts => ({
    frames: [
      { hip: [58, 90], torso: opts.situp ? 275 : 278, thigh: 130, shin: 210, arm: 320, fore: 300, head: 280 },
      { hip: [58, 90], torso: opts.situp ? 340 : 305, thigh: 130, shin: 210, arm: 350, fore: 330, head: opts.situp ? 350 : 310 },
    ],
    arrow: 'sho',
  });

  ARCH.revcrunch = () => ({
    frames: [
      { hip: [58, 90], torso: 278, thigh: 105, shin: 185, arm: 262, fore: 262, head: 280 },
      { hip: [58, 84], torso: 285, thigh: 25, shin: 130, arm: 262, fore: 262, head: 285 },
    ],
    arrow: 'knee',
  });

  ARCH.vup = () => ({
    frames: [
      { hip: [58, 90], torso: 274, thigh: 98, shin: 96, arm: 268, fore: 268, head: 276 },
      { hip: [58, 88], torso: 320, thigh: 55, shin: 58, arm: 5, fore: 10, head: 325 },
    ],
    arrow: 'hand',
  });

  ARCH.cablecrunch = () => ({
    frames: [
      { hip: [56, 78], torso: 15, thigh: 130, shin: 190, arm: 45, fore: 290 },
      { hip: [56, 78], torso: 55, thigh: 130, shin: 190, arm: 90, fore: 320 },
    ],
    arrow: 'sho',
    draw(g, f, j) { cable(g, [104, 12], j.hand); },
  });

  ARCH.abwheel = () => ({
    frames: [
      { hip: [52, 74], torso: 320, thigh: 135, shin: 195, arm: 195, fore: 185, head: 325 },
      { hip: [58, 72], torso: 292, thigh: 122, shin: 190, arm: 132, fore: 120, head: 296 },
    ],
    arrow: 'hand',
    draw(g, f, j) { circ(g, [j.hand[0], j.hand[1] + 3], 5, EQ, 'none', 2.2); },
  });

  ARCH.deadbug = () => ({
    frames: [
      { hip: [60, 88], torso: 272, thigh: 20, shin: 115, arm: 0, fore: 0, head: 274 },
      { hip: [60, 88], torso: 272, thigh: 75, shin: 85, arm: 275, fore: 275, head: 274 },
    ],
    arrow: 'hand',
  });

  ARCH.birddog = () => ({
    frames: [
      { hip: [60, 74], torso: 275, thigh: 160, shin: 175, arm: 175, fore: 178, head: 278 },
      { hip: [60, 74], torso: 275, thigh: 258, shin: 262, arm: 82, fore: 85, head: 278 },
    ],
    arrow: 'hand',
  });

  ARCH.pallof = () => ({
    frames: [
      { hip: [54, 63], torso: 2, thigh: 172, shin: 180, arm: 120, fore: 305 },
      { hip: [54, 63], torso: 2, thigh: 172, shin: 180, arm: 95, fore: 92 },
    ],
    arrow: 'hand',
    draw(g, f, j) { cable(g, [122, 48], j.hand); },
  });

  ARCH.twist = () => ({
    frames: [
      { hip: [58, 82], torso: 322, thigh: 115, shin: 205, arm: 60, fore: 80, head: 325 },
      { hip: [58, 82], torso: 322, thigh: 115, shin: 205, arm: 195, fore: 250, head: 325 },
    ],
    arrow: 'hand',
    draw(g, f, j) { circ(g, j.hand, 3.4, EQ, 'none', 2); },
  });

  ARCH.mountain = () => ({
    frames: [
      { hip: [62, 68], torso: 288, thigh: 110, shin: 105, arm: 178, fore: 175, head: 292 },
      { hip: [62, 68], torso: 288, thigh: 40, shin: 130, thigh2: 112, shin2: 106, arm: 178, fore: 175, head: 292 },
    ],
    arrow: 'knee',
  });

  // ---- power & carries
  ARCH.clean = () => ({
    frames: [
      { hip: [50, 74], torso: 52, thigh: 130, shin: 168, arm: 148, fore: 165 },
      { hip: [56, 68], torso: 6, thigh: 150, shin: 172, arm: 145, fore: 285 },
    ],
    arrow: 'hand',
    draw(g, f, j, i) { if (i === 0) EQUIP.bar(g, j); else circ(g, [j.sho[0] + 5, j.sho[1] + 2], 6, EQ, 'none', 2.2); },
  });

  ARCH.pushpress = () => ({
    frames: [
      { hip: [58, 68], torso: 2, thigh: 168, shin: 172, arm: 150, fore: 318 },
      { hip: [58, 62], torso: 358, thigh: 180, shin: 180, arm: 10, fore: 4 },
    ],
    arrow: 'hand',
    draw(g, f, j) { EQUIP.bar(g, j); },
  });

  ARCH.thruster = () => ({
    frames: [
      { hip: [50, 79], torso: 24, thigh: 95, shin: 172, arm: 130, fore: 335 },
      { hip: [58, 62], torso: 358, thigh: 180, shin: 180, arm: 10, fore: 4 },
    ],
    arrow: 'hand',
    draw(g, f, j) { EQUIP.bar(g, j); },
  });

  ARCH.carry = () => ({
    frames: [
      { hip: [44, 63], torso: 2, thigh: 172, shin: 182, thigh2: 190, shin2: 175, arm: 178, fore: 178 },
      { hip: [74, 63], torso: 2, thigh: 188, shin: 176, thigh2: 168, shin2: 184, arm: 178, fore: 178 },
    ],
    arrow: 'hip',
    draw(g, f, j) { dbAt(g, j.hand); },
  });

  ARCH.sled = () => ({
    frames: [
      { hip: [42, 72], torso: 55, thigh: 140, shin: 165, thigh2: 205, shin2: 178, arm: 95, fore: 95 },
      { hip: [56, 72], torso: 55, thigh: 205, shin: 178, thigh2: 140, shin2: 165, arm: 95, fore: 95 },
    ],
    arrow: 'hip',
    before(g) {
      g.appendChild(mk('rect', { x: 92, y: 78, width: 24, height: 20, rx: 2, fill: 'none', stroke: EQ, 'stroke-width': 2 }));
      line(g, [92, 98], [116, 98], EQ, 2.4);
    },
  });

  ARCH.burpee = () => ({
    frames: [
      { hip: [62, 70], torso: 288, thigh: 108, shin: 104, arm: 172, fore: 175, head: 292 },
      { hip: [58, 52], torso: 358, thigh: 185, shin: 190, arm: 5, fore: 0 },
    ],
    arrow: 'sho',
  });

  ARCH.slam = () => ({
    frames: [
      { hip: [58, 60], torso: 352, thigh: 180, shin: 180, arm: 8, fore: 2 },
      { hip: [54, 72], torso: 35, thigh: 140, shin: 172, arm: 165, fore: 175 },
    ],
    arrow: 'hand',
    draw(g, f, j) { circ(g, j.hand, 4.4, EQ, 'none', 2.2); },
  });

  ARCH.ropes = () => ({
    frames: [
      { hip: [54, 68], torso: 8, thigh: 165, shin: 175, arm: 130, fore: 320 },
      { hip: [54, 68], torso: 8, thigh: 165, shin: 175, arm: 160, fore: 120 },
    ],
    arrow: 'hand',
    draw(g, f, j) {
      const h = j.hand;
      g.appendChild(mk('path', { d: `M${h[0]},${h[1]} q10,-8 20,0 t20,0 t18,4`, fill: 'none', stroke: EQ, 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
    },
  });

  ARCH.getup = () => ({
    frames: [
      { hip: [52, 88], torso: 300, thigh: 120, shin: 195, arm: 350, fore: 0, head: 305 },
      { hip: [56, 63], torso: 356, thigh: 180, shin: 180, arm: 5, fore: 0 },
    ],
    arrow: 'sho',
    draw(g, f, j) { EQUIP.kb(g, { hand: [j.hand[0], j.hand[1] - 2] }); },
  });

  ARCH.sissy = () => ({
    frames: [
      { hip: [58, 62], torso: 2, thigh: 180, shin: 178, arm: 200, fore: 200, foot: 60 },
      { hip: [50, 70], torso: 330, thigh: 120, shin: 200, arm: 210, fore: 210, foot: 55, head: 332 },
    ],
    arrow: 'sho',
  });

  /* ---------------- exercise → archetype map ---------------- */

  const MAP = {
    'bb-bench': ARCH.benchpress({}), 'db-bench': ARCH.benchpress({ db: true }),
    'bb-incline-bench': ARCH.benchpress({ incline: true }), 'db-incline-bench': ARCH.benchpress({ incline: true, db: true }),
    'bb-decline-bench': ARCH.benchpress({}), 'machine-chest-press': ARCH.benchpress({ db: true }),
    'push-up': ARCH.pushup(), 'dip-chest': ARCH.dip({ lean: true }), 'dip-triceps': ARCH.dip({}),
    'cable-fly': ARCH.fly({}), 'cable-fly-low': ARCH.fly({}), 'db-fly': ARCH.fly({ lying: true }), 'pec-deck': ARCH.fly({}),

    'deadlift': ARCH.deadlift({}), 'sumo-deadlift': ARCH.deadlift({}), 'trapbar-deadlift': ARCH.deadlift({ trap: true }),
    'rack-pull': ARCH.deadlift({ rack: true }),
    'rdl': ARCH.rdl({}), 'sldl': ARCH.rdl({}), 'good-morning': ARCH.goodmorning(), 'sl-rdl': ARCH.slrdl(),
    'pull-up': ARCH.pullup(), 'chin-up': ARCH.pullup(), 'lat-pulldown': ARCH.pulldown(),
    'bb-row': ARCH.row({}), 'pendlay-row': ARCH.row({ deep: true }), 'tbar-row': ARCH.row({ deep: true }),
    'db-row': ARCH.row({ db: true }), 'cs-row': ARCH.csrow(), 'machine-row': ARCH.seatedrow(), 'cable-row': ARCH.seatedrow(),
    'straight-arm-pd': ARCH.straightarm(), 'inverted-row': ARCH.invrow(), 'back-extension': ARCH.backext(),
    'bb-shrug': ARCH.shrug(),

    'ohp': ARCH.ohp({}), 'db-shoulder-press': ARCH.ohp({ db: true, seated: true }), 'arnold-press': ARCH.ohp({ db: true, seated: true }),
    'machine-shoulder-press': ARCH.ohp({ db: true, seated: true }), 'push-press': ARCH.pushpress(), 'landmine-press': ARCH.landmine(),
    'lateral-raise': ARCH.latraise({}), 'cable-lateral-raise': ARCH.latraise({ cable: true }), 'front-raise': ARCH.frontraise(),
    'rear-delt-fly': ARCH.rearfly({}), 'reverse-pec-deck': ARCH.rearfly({ machine: true }), 'face-pull': ARCH.facepull(),
    'upright-row': ARCH.uprightrow(),

    'bb-curl': ARCH.curl({ bar: true }), 'ez-curl': ARCH.curl({ bar: true }), 'db-curl': ARCH.curl({}),
    'hammer-curl': ARCH.curl({}), 'incline-curl': ARCH.inclinecurl(), 'preacher-curl': ARCH.preacher(),
    'cable-curl': ARCH.curl({ cable: true }), 'concentration-curl': ARCH.preacher(), 'spider-curl': ARCH.preacher(),
    'reverse-curl': ARCH.curl({ bar: true }),
    'cg-bench': ARCH.benchpress({}), 'skull-crusher': ARCH.skull(), 'pushdown': ARCH.pushdown(),
    'rope-oh-ext': ARCH.ohext({ cable: true }), 'db-oh-ext': ARCH.ohext({}), 'bench-dip': ARCH.benchdip(),
    'kickback': ARCH.kickback(),
    'wrist-curl': ARCH.wristcurl(), 'rev-wrist-curl': ARCH.wristcurl(),
    'dead-hang': ARCH.pullup({ hold: true }), 'farmers-carry': ARCH.carry(),

    'back-squat': ARCH.squat({}), 'front-squat': ARCH.squat({ front: true }), 'goblet-squat': ARCH.squat({ goblet: true }),
    'box-squat': ARCH.squat({}), 'leg-press': ARCH.legpress(), 'hack-squat': ARCH.legpress(),
    'bss': ARCH.splitsquat({ rearUp: true }), 'walking-lunge': ARCH.splitsquat({}), 'reverse-lunge': ARCH.splitsquat({}),
    'step-up': ARCH.stepup(), 'leg-extension': ARCH.legext(), 'sissy-squat': ARCH.sissy(),

    'lying-leg-curl': ARCH.legcurl({}), 'seated-leg-curl': ARCH.legcurl({ seated: true }), 'nordic-curl': ARCH.nordic(),

    'hip-thrust': ARCH.hipthrust({}), 'glute-bridge': ARCH.hipthrust({ floor: true, bw: true }),
    'pull-through': ARCH.swing({ cable: true }), 'kb-swing': ARCH.swing({}),
    'glute-kickback': ARCH.gluteiso({}), 'hip-abduction': ARCH.gluteiso({ front: true }), 'hip-adduction': ARCH.gluteiso({ front: true }),

    'standing-calf-raise': ARCH.calfraise({}), 'seated-calf-raise': ARCH.calfraise({ seated: true }),
    'sl-calf-raise': ARCH.calfraise({ bw: true }), 'tibialis-raise': ARCH.tibialis(),

    'plank': ARCH.plank(), 'side-plank': ARCH.sideplank(), 'copenhagen-plank': ARCH.copenhagen(),
    'hanging-knee-raise': ARCH.hangraise({}), 'hanging-leg-raise': ARCH.hangraise({ straight: true }),
    'cable-crunch': ARCH.cablecrunch(), 'ab-wheel': ARCH.abwheel(), 'crunch': ARCH.crunch({}),
    'reverse-crunch': ARCH.revcrunch(), 'situp': ARCH.crunch({ situp: true }), 'russian-twist': ARCH.twist(),
    'dead-bug': ARCH.deadbug(), 'bird-dog': ARCH.birddog(), 'pallof-press': ARCH.pallof(), 'v-up': ARCH.vup(),
    'mountain-climbers': ARCH.mountain(),

    'power-clean': ARCH.clean(), 'thruster': ARCH.thruster(), 'turkish-getup': ARCH.getup(),
    'sled-push': ARCH.sled(), 'burpee': ARCH.burpee(), 'med-ball-slam': ARCH.slam(), 'battle-ropes': ARCH.ropes(),
  };

  function diagramFor(exId) {
    const spec = MAP[exId];
    return spec ? render(spec) : null;
  }

  /* ---------------- muscle map ---------------- */
  /* Two stylised silhouettes (front + back) built from capsules; regions are
     filled by muscle group. Primary = accent, secondary = accent at 45%. */

  const REGIONS_BY_GROUP = {
    chest: ['chestL', 'chestR'],
    back: ['traps', 'latL', 'latR', 'lowback'],
    shoulders: ['deltFL', 'deltFR', 'deltBL', 'deltBR'],
    biceps: ['bicL', 'bicR'],
    triceps: ['triL', 'triR'],
    forearms: ['foreFL', 'foreFR', 'foreBL', 'foreBR'],
    quads: ['quadL', 'quadR'],
    hamstrings: ['hamL', 'hamR'],
    glutes: ['gluteL', 'gluteR'],
    calves: ['calfL', 'calfR', 'shinL', 'shinR'],
    core: ['abs', 'oblL', 'oblR'],
    full: ['quadL', 'quadR', 'gluteL', 'gluteR', 'traps', 'abs'],
    cardio: ['quadL', 'quadR', 'calfL', 'calfR'],
  };

  const SEC_TO_GROUP = {
    'triceps': 'triceps', 'biceps': 'biceps', 'brachialis': 'biceps',
    'front delts': 'shoulders', 'rear delts': 'shoulders', 'shoulders': 'shoulders',
    'chest': 'chest', 'upper chest': 'chest',
    'lats': 'back', 'upper back': 'back', 'traps': 'back', 'lower back': 'back', 'back': 'back',
    'core': 'core', 'obliques': 'core', 'hip flexors': 'core',
    'hamstrings': 'hamstrings', 'glutes': 'glutes', 'quads': 'quads', 'legs': 'quads',
    'calves': 'calves', 'soleus': 'calves', 'shins': 'calves',
    'forearms': 'forearms', 'grip': 'forearms',
    'adductors': 'glutes', 'hip stabilisers': 'glutes', 'full body': 'full',
  };

  // capsule helper: rounded rect from a to b with width w
  function capsule(a, b, w) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    return { x: a[0], y: a[1] - w / 2, width: len, height: w, rx: w / 2, transform: `rotate(${ang.toFixed(1)} ${a[0]} ${a[1]})` };
  }

  function bodyParts(cx, side) { // side: 'front' | 'back'
    const parts = []; // [regionKey|null, shapeAttrs, kind]
    const cap = (key, a, b, w) => parts.push([key, capsule(a, b, w), 'rect']);
    const el = (key, attrs, kind) => parts.push([key, attrs, kind]);

    el(null, { cx, cy: 10, r: 6 }, 'circle'); // head
    cap(null, [cx, 15], [cx, 19], 4); // neck

    if (side === 'front') {
      el('traps', { points: `${cx - 9},19 ${cx + 9},19 ${cx + 5},15.5 ${cx - 5},15.5` }, 'polygon');
      el('deltFL', { cx: cx - 12.5, cy: 23.5, r: 4.6 }, 'circle');
      el('deltFR', { cx: cx + 12.5, cy: 23.5, r: 4.6 }, 'circle');
      el('chestL', { x: cx - 10, y: 20, width: 9.4, height: 11, rx: 3.4 }, 'rect');
      el('chestR', { x: cx + 0.6, y: 20, width: 9.4, height: 11, rx: 3.4 }, 'rect');
      el('abs', { x: cx - 5.5, y: 32, width: 11, height: 20, rx: 3.5 }, 'rect');
      el('oblL', { x: cx - 10, y: 32.5, width: 3.6, height: 17, rx: 1.8 }, 'rect');
      el('oblR', { x: cx + 6.4, y: 32.5, width: 3.6, height: 17, rx: 1.8 }, 'rect');
      cap('bicL', [cx - 14, 27.5], [cx - 16, 40], 5.4);
      cap('bicR', [cx + 14, 27.5], [cx + 16, 40], 5.4);
      cap('foreFL', [cx - 16.4, 41.5], [cx - 18.5, 54], 4.4);
      cap('foreFR', [cx + 16.4, 41.5], [cx + 18.5, 54], 4.4);
      el(null, { x: cx - 8, y: 52.5, width: 16, height: 7, rx: 3 }, 'rect'); // pelvis
      cap('quadL', [cx - 5.5, 60], [cx - 6.5, 79], 7.6);
      cap('quadR', [cx + 5.5, 60], [cx + 6.5, 79], 7.6);
      cap('shinL', [cx - 6.5, 82], [cx - 6.5, 98], 4.8);
      cap('shinR', [cx + 6.5, 82], [cx + 6.5, 98], 4.8);
    } else {
      el('traps', { points: `${cx - 9},19 ${cx + 9},19 ${cx},29 ` }, 'polygon');
      el('deltBL', { cx: cx - 12.5, cy: 23.5, r: 4.6 }, 'circle');
      el('deltBR', { cx: cx + 12.5, cy: 23.5, r: 4.6 }, 'circle');
      el('latL', { points: `${cx - 10},24 ${cx - 3},30 ${cx - 3},40 ${cx - 8},36` }, 'polygon');
      el('latR', { points: `${cx + 10},24 ${cx + 3},30 ${cx + 3},40 ${cx + 8},36` }, 'polygon');
      el('lowback', { x: cx - 4.5, y: 38, width: 9, height: 13, rx: 3 }, 'rect');
      cap('triL', [cx - 14, 27.5], [cx - 16, 40], 5.4);
      cap('triR', [cx + 14, 27.5], [cx + 16, 40], 5.4);
      cap('foreBL', [cx - 16.4, 41.5], [cx - 18.5, 54], 4.4);
      cap('foreBR', [cx + 16.4, 41.5], [cx + 18.5, 54], 4.4);
      el('gluteL', { x: cx - 9, y: 52, width: 8.6, height: 9.5, rx: 3.8 }, 'rect');
      el('gluteR', { x: cx + 0.4, y: 52, width: 8.6, height: 9.5, rx: 3.8 }, 'rect');
      cap('hamL', [cx - 5.5, 63], [cx - 6.5, 80], 7.2);
      cap('hamR', [cx + 5.5, 63], [cx + 6.5, 80], 7.2);
      cap('calfL', [cx - 6.5, 82], [cx - 6.5, 97], 5);
      cap('calfR', [cx + 6.5, 82], [cx + 6.5, 97], 5);
    }
    return parts;
  }

  function muscleMap(ex) {
    const primary = new Set(REGIONS_BY_GROUP[ex.group] || []);
    const secondary = new Set();
    for (const s of (ex.secondary || [])) {
      const grp = SEC_TO_GROUP[s];
      if (!grp) continue;
      for (const r of (REGIONS_BY_GROUP[grp] || [])) if (!primary.has(r)) secondary.add(r);
    }

    const svg = mk('svg', { viewBox: '0 0 150 116', class: 'musclemap', role: 'img', 'aria-label': `Muscles worked: ${EXDB.groupName(ex.group)}${ex.secondary && ex.secondary.length ? ', assisted by ' + ex.secondary.join(', ') : ''}` });
    [['front', 40], ['back', 110]].forEach(([side, cx]) => {
      const g = mk('g');
      for (const [key, attrs, kind] of bodyParts(cx, side)) {
        const isP = key && primary.has(key);
        const isS = key && secondary.has(key);
        const shape = mk(kind, attrs);
        shape.setAttribute('fill', isP ? 'var(--accent)' : isS ? 'var(--accent)' : SOFT);
        if (isS) shape.setAttribute('fill-opacity', '0.42');
        shape.setAttribute('stroke', LINEC);
        shape.setAttribute('stroke-width', '0.7');
        g.appendChild(shape);
      }
      const t = mk('text', { x: cx, y: 113, fill: 'var(--muted)', 'font-size': 8.5, 'font-weight': 650, 'text-anchor': 'middle', 'font-family': 'inherit' });
      t.textContent = side === 'front' ? 'Front' : 'Back';
      g.appendChild(t);
      svg.appendChild(g);
    });
    return svg;
  }

  return { for: diagramFor, muscleMap };
})();
