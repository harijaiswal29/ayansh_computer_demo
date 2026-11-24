/* Beyond Pluto: our neighbourhood in space, as a zoom-out journey in eight stops, from the Kuiper belt to the Andromeda galaxy.
   Each stop is drawn at its own scale. Going to the next stop shrinks the old picture down to a dot while the new one grows in,
   like a camera zooming out, and a line on the screen says how long light takes to cross it. Distances inside a stop are real
   (rounded); the jumps between stops are what make space so big. Reached from Explore (the Beyond button). */
'use strict';
views.beyond = (() => {
  const T = THREE, ov = $('#beyondCv'), V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  ov.classList.add('over2d');
  let r, cam, ctl, scene, ready = false, W = 0, H = 0, t = 0, et = 0, cur = 0, started = false, trans = null, home = null, taps = [];
  const ease = x => x * x * (3 - 2 * x), seg = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
  const GOLD = 'rgba(255,181,46,.93)', INK = '#2A1600', DARK = 'rgba(13,20,52,.85)', FIT = 45, LY_AU = 63241;
  const top = () => ($('#view-beyond .over.top').offsetHeight || 44) + 14, bottom = () => H - ($('#beyondCtl').offsetHeight || 44) - 16;
  const panel = (ctx, x, y, w, h) => { ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, x, y, w, h, 12); ctx.fill(); };
  const gauss = rr => { let s = 0; for (let i = 0; i < 4; i++) s += rr(); return (s - 2) * 1.73; };
  function view(o) {
    let dist = o.dist; if (H > W && W) dist *= Math.min(1.9, H / W * (o.tall ?? .9));
    ctl.follow = null; ctl.quat = null; ctl.goal.copy(o.goal || V3()); ctl.goalDist = dist; ctl.min = o.min ?? dist * .35; ctl.max = o.max ?? dist * 2.6;
    ctl.goalYaw = o.yaw ?? ctl.goalYaw; ctl.goalPitch = o.pitch ?? ctl.goalPitch; ctl.minPitch = -1.45; ctl.maxPitch = 1.45; ctl.auto = o.auto || 0;
    ctl.retarget();
  }

  /* ================================================================ building blocks */
  // glowing dots, each with its own colour and size in pixels
  const PT_VS = `attribute float size; attribute vec3 acol; uniform float uPx; varying vec3 vC;
    void main(){ vC = acol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * uPx; }`;
  const PT_FS = `uniform float uFade; varying vec3 vC;
    void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = 1.0 - smoothstep(0.0, 1.0, d); gl_FragColor = vec4(vC, a * a * uFade); }`;
  function cloud(n, fill, dynamic) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), p = [0, 0, 0], c = [1, 1, 1];
    for (let i = 0; i < n; i++) { size[i] = fill(i, p, c); pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
    const g = new T.BufferGeometry(), pa = new T.BufferAttribute(pos, 3); if (dynamic) pa.setUsage(T.DynamicDrawUsage);
    g.setAttribute('position', pa); g.setAttribute('acol', new T.BufferAttribute(col, 3)); g.setAttribute('size', new T.BufferAttribute(size, 1));
    const m = new T.ShaderMaterial({ uniforms: { uPx: { value: r.getPixelRatio() }, uFade: { value: 1 } }, vertexShader: PT_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    const pts = new T.Points(g, m); pts.frustumCulled = false; return pts;
  }
  // a soft round glow, sized in scene units so it shrinks when we zoom out
  let _gt;
  const glowTex = () => _gt || (_gt = E3.canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.12, 'rgba(255,255,255,.85)'); gr.addColorStop(.35, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }));
  const glow = (color, size, op = 1) => { const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; };
  const ring = (rad, color, op, n = 160) => { const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * TAU; pts.push(V3(Math.cos(a) * rad, 0, -Math.sin(a) * rad)); } return new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false })); };
  const line = (pts, color, op) => new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
  // a see-through bubble whose edges glow, like a soap bubble
  const SHELL_VS = `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const SHELL_FS = `uniform vec3 uCol; uniform float uFade, uPow, uMin; varying vec3 vN; varying vec3 vV;
    void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(uCol, (uMin + pow(f, uPow)) * uFade); }`;
  const shell = (geo, color, pow = 2.5, min = .03) => new T.Mesh(geo, new T.ShaderMaterial({ uniforms: { uCol: { value: new T.Color(color) }, uFade: { value: 1 }, uPow: { value: pow }, uMin: { value: min } }, vertexShader: SHELL_VS, fragmentShader: SHELL_FS, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
  // each stop is a group; its materials are remembered so the whole stop can fade in and out
  function stop() { const g = new T.Group(); g.visible = false; g.userData.mats = []; g.userData.fade = 1; scene.add(g); return g; }
  function add(g, ...objs) { for (const o of objs) { g.add(o); o.traverse(x => { if (x.material) g.userData.mats.push([x.material, x.material.opacity ?? 1]); }); } return objs[0]; }
  function setFade(g, f) { g.userData.fade = f; for (const [m, b] of g.userData.mats) { if (m.uniforms && m.uniforms.uFade) m.uniforms.uFade.value = f; else m.opacity = b * f; } }
  const _w = V3();
  // a name on the screen, for a point given in a stop's own units
  let placed = [];
  function lab(g, v, s, bg = DARK, fg = '#F3F1FF', size = 11, dy = 0) {
    const p = E3.toScreen(g.localToWorld(_w.copy(v)), cam, W, H);
    if (!p.front || p.x < 24 || p.x > W - 24 || p.y < top() + 64 || p.y > bottom() - 26) return null;
    const ctx = ctx2(); ctx.font = `700 ${size}px Fredoka, sans-serif`; const w = ctx.measureText(s).width + 20, x = clamp(p.x, w / 2 + 6, W - w / 2 - 6), box = [x - w / 2, p.y + dy - size - 4, w, size + 12];
    if (placed.some(b => box[0] < b[0] + b[2] && b[0] < box[0] + box[2] && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) return null;
    placed.push(box); hudPill(ctx, s, x, p.y + dy, bg, fg, size); return { x, y: p.y };
  }
  function tapLab(g, v, s, lineId, dy = -14) { const p = lab(g, v, s, GOLD, INK, 12, dy); if (p) taps.push({ x: p.x, y: p.y + dy - 4, line: lineId }); }
  const pill = (ctx, s, x, y, bg, fg, size) => { ctx.font = `700 ${size}px Fredoka, sans-serif`; const w = ctx.measureText(s).width + 20; hudPill(ctx, s, clamp(x, w / 2 + 6, W - w / 2 - 6), y, bg, fg, size); };
  const ctx2 = () => ov.getContext('2d');
  // sky directions: right ascension (hours) and declination (degrees) to a direction in the scene
  const sky = (ra, dec) => { const a = ra / 24 * TAU, d = dec * PI / 180; return V3(Math.cos(d) * Math.cos(a), Math.sin(d), -Math.cos(d) * Math.sin(a)); };

  /* ================================================================ 1. the Kuiper belt (units: AU) */
  const DWARF = [   // name, voice line, a (AU), e, inclination, node, perihelion argument, where on its path we show it (degrees), colour
    ['Pluto', 'pluto', 39.5, .25, 17, 110, 113, 30, 0xe8c9a0],
    ['Eris', 'nb_kuiper_eris', 67.9, .44, 44, 36, 151, 60, 0xf2f2f2],
    ['Haumea', 'nb_kuiper_haumea', 43.1, .19, 28, 122, 240, 200, 0xffffff],
    ['Makemake', 'nb_kuiper_makemake', 45.4, .16, 29, 79, 297, 120, 0xe8a080],
    ['Arrokoth', 'nh_arrokoth', 44.6, .04, 2.4, 159, 174, 300, 0xd08a6a]
  ];
  function orbitPos(a, e, inc, node, peri, nu, k) {
    const rr = a * (1 - e * e) / (1 + e * Math.cos(nu)), i = inc * PI / 180, O = node * PI / 180, w = peri * PI / 180, u = w + nu;
    const x = rr * (Math.cos(O) * Math.cos(u) - Math.sin(O) * Math.sin(u) * Math.cos(i)), y = rr * (Math.sin(O) * Math.cos(u) + Math.cos(O) * Math.sin(u) * Math.cos(i)), z = rr * Math.sin(u) * Math.sin(i);
    return V3(x * k, z * k, -y * k);
  }
  function kuiperStop() {
    const g = stop(), k = FIT / 55, rr = rng(11);
    add(g, glow(0xfff1c8, 4.5), glow(0xffb44a, 11, .5));
    g.userData.pl = [['Jupiter', 5.2, 0xd9b38a], ['Saturn', 9.5, 0xe6cf98], ['Uranus', 19.2, 0xa8e4ea], ['Neptune', 30.1, 0x7f9cff]].map(([name, a, col], i) => {
      add(g, ring(a * k, 0x8ca0ff, .22)); const s = add(g, glow(col, 2.4)); return { name, R: a * k, s, ang: i * 1.7 + .4, sp: .9 / Math.pow(a, 1.5) };
    });
    add(g, cloud(9000, (i, p, c) => {
      const d = rr() < .72 ? 39 + 9 * rr() : 30 + 26 * rr(), a = rr() * TAU, h = gauss(rr) * .13 * d;
      p[0] = Math.cos(a) * d * k; p[1] = h * k; p[2] = Math.sin(a) * d * k;
      const red = rr() < .3 ? .3 : 0; c[0] = .75 + red; c[1] = .84; c[2] = 1.05 - red * .7; return 1.5 + rr() * 1.6;
    }));
    g.userData.dw = DWARF.map(([name, lineId, a, e, inc, node, peri, nu, col]) => {
      const pts = []; for (let j = 0; j <= 160; j++) pts.push(orbitPos(a, e, inc, node, peri, j / 160 * TAU, k));
      add(g, line(pts, col, .3)); const pos = orbitPos(a, e, inc, node, peri, nu * PI / 180, k); const s = add(g, glow(col, name === 'Arrokoth' ? 1.4 : 2.4)); s.position.copy(pos);
      return { name, lineId, pos };
    });
    return g;
  }

  /* ================================================================ 2. the Sun's bubble (units: AU) */
  const bubbleR = d => 121 * (1 + 2 * Math.pow((1 - d.x) / 2, 1.8));        // edge of the bubble: 121 AU at the front, a long tail behind
  const shockR = d => 94 * (1 + 1.2 * Math.pow((1 - d.x) / 2, 1.8));        // where the Sun's wind suddenly slows down
  const VOY = [['Voyager 1', .61, .17, 171], ['Voyager 2', -.62, -.44, 144]];  // elevation, sideways angle (radians), distance today (AU)
  const vdir = (el, az) => V3(Math.cos(el) * Math.cos(az), Math.sin(el), -Math.cos(el) * Math.sin(az));
  function bubbleStop() {
    const g = stop(), k = FIT / 230, rr = rng(12), d = V3();
    const shaped = (fn, s) => { const geo = new T.SphereGeometry(1, 96, 64), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { d.fromBufferAttribute(p, i).normalize(); d.multiplyScalar(fn(d) * k * s); p.setXYZ(i, d.x, d.y, d.z); } geo.computeVertexNormals(); return geo; };
    add(g, shell(shaped(bubbleR, 1), 0x3f86e0, 2.8, .012), shell(shaped(shockR, 1), 0x7a5228, 3.6, 0));
    add(g, glow(0xfff1c8, 3), glow(0xffb44a, 7, .5), ring(30.1 * k, 0x8ca0ff, .35), ring(44 * k, 0x9fb0d8, .2));
    // the Sun's wind, streaming out and slowing down at the shock
    const NS = 700, sw = { dir: [], r: new Float32Array(NS) };
    g.userData.sw = sw;
    sw.pts = add(g, cloud(NS, (i, p, c) => { const v = V3(gauss(rr), gauss(rr), gauss(rr)).normalize(); sw.dir.push(v); sw.r[i] = 2 + rr() * bubbleR(v); p[0] = p[1] = p[2] = 0; c[0] = 1; c[1] = .78; c[2] = .42; return 1.6; }, true));
    // the wind from other stars, flowing round the bubble
    const NI = 1000, iw = { p: new Float32Array(NI * 3) };
    g.userData.iw = iw;
    for (let i = 0; i < NI; i++) { iw.p[i * 3] = -450 + rr() * 800; iw.p[i * 3 + 1] = (rr() - .5) * 520; iw.p[i * 3 + 2] = (rr() - .5) * 520; }
    iw.pts = add(g, cloud(NI, (i, p, c) => { p[0] = p[1] = p[2] = 0; c[0] = .55; c[1] = .6; c[2] = 1; return 1.3; }, true));
    g.userData.voy = VOY.map(([name, el, az, au]) => { const end = vdir(el, az).multiplyScalar(au * k); add(g, line([V3(), end], 0x59e0e8, .7)); const s = add(g, glow(0x9ff4ff, 2.6)); s.position.copy(end); return { name, end }; });
    g.userData.k = k;
    return g;
  }
  function bubbleTick(dt) {
    const g = S.bubble, { sw, iw, k } = g.userData, P = sw.pts.geometry.attributes.position, Q = iw.pts.geometry.attributes.position, d = V3();
    for (let i = 0; i < sw.r.length; i++) {
      const v = sw.dir[i], ts = shockR(v); sw.r[i] += dt * (sw.r[i] < ts ? 70 : 14);
      if (sw.r[i] > bubbleR(v)) sw.r[i] = 2;
      P.setXYZ(i, v.x * sw.r[i] * k, v.y * sw.r[i] * k, v.z * sw.r[i] * k);
    }
    for (let i = 0; i < Q.count; i++) {
      const a = iw.p; a[i * 3] -= dt * 45;
      if (a[i * 3] < -450) a[i * 3] += 800;
      d.set(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]); const len = d.length(), lim = bubbleR(d.clone().divideScalar(len || 1)) * 1.07;
      if (len < lim) { d.multiplyScalar(lim / len); a[i * 3 + 1] = d.y; a[i * 3 + 2] = d.z; }
      Q.setXYZ(i, d.x * k, d.y * k, d.z * k);
    }
    P.needsUpdate = Q.needsUpdate = true;
  }

  /* ================================================================ 3. the Oort cloud (units: AU), and a flash of light */
  const YR_MIN = 1 / 525960;
  function oortStop() {
    const g = stop(), k = FIT / 105000, rr = rng(13);
    add(g, cloud(9000, (i, p, c) => {
      const inner = i < 2600, d = inner ? 2000 + 18000 * Math.pow(rr(), .8) : 20000 + 80000 * Math.pow(rr(), 1.3), v = V3(gauss(rr), gauss(rr) * (inner ? .45 : 1), gauss(rr)).normalize();
      p[0] = v.x * d * k; p[1] = v.y * d * k; p[2] = v.z * d * k; const b = inner ? .55 : .45; c[0] = .7 * b; c[1] = .8 * b; c[2] = 1 * b; return 1.2 + rr() * 1.3;
    }));
    add(g, glow(0xfff1c8, 1.6), glow(0xffb44a, 3.5, .45));
    const head = add(g, glow(0xbfe9ff, 1.4)), trail = add(g, line(Array.from({ length: 24 }, () => V3()), 0x9fdcff, .7));
    g.userData.comet = { head, trail, hist: [], from: V3(), tt: 99 };
    const flash = add(g, shell(new T.SphereGeometry(1, 64, 32), 0xfff0c0, 2.4, .04)); flash.visible = false;
    const ly = add(g, ring(LY_AU * k, 0xffd27a, .0)); ly.userData.lyRing = true;
    Object.assign(g.userData, { k, flash, ly, ft: -1 });
    return g;
  }
  const lightYears = ft => Math.pow(10, -4.82 + (Math.log10(1.6) + 4.82) * ease(seg(0, 11, ft)));   // light-travel time in years, shown faster and faster
  function oortTick(dt) {
    const g = S.oort, u = g.userData, c = u.comet;
    c.tt += dt;
    if (c.tt > 9) { c.tt = 0; c.from.copy(V3(gauss(Math.random), gauss(Math.random), gauss(Math.random)).normalize().multiplyScalar(80000 * u.k)); c.hist.length = 0; }
    const pos = c.from.clone().multiplyScalar(Math.pow(1 - c.tt / 9, 1.6)); c.head.position.copy(pos);
    c.hist.unshift(pos.clone()); if (c.hist.length > 24) c.hist.pop();
    const P = c.trail.geometry.attributes.position; for (let i = 0; i < 24; i++) { const h = c.hist[Math.min(i, c.hist.length - 1)]; P.setXYZ(i, h.x, h.y, h.z); } P.needsUpdate = true;
    if (u.ft >= 0) { u.ft += dt; const yrs = lightYears(u.ft), rad = yrs * LY_AU * u.k; u.flash.visible = rad > .15; u.flash.scale.setScalar(Math.max(.01, rad)); u.flash.material.uniforms.uFade.value = g.userData.fade * (u.ft > 13 ? Math.max(0, 1 - (u.ft - 13) / 3) : 1); u.ly.material.opacity = (yrs >= 1 ? .7 : 0) * g.userData.fade; }
  }
  function fmtTime(y) {
    const min = y * 525960;
    if (min < 90) return `${Math.max(1, Math.round(min))} minute${Math.round(min) === 1 ? '' : 's'}`;
    const h = min / 60; if (h < 36) return `${Math.round(h)} hours`;
    const d = h / 24; if (d < 60) return `${Math.round(d)} days`;
    const mo = d / 30.4; if (mo < 12) return `${Math.round(mo)} months`;
    return y < 1.05 ? '1 year' : `${y.toFixed(1)} years`;
  }

  /* ================================================================ 4. how far is a star? Light round the Earth, and the football model */
  let _fb;
  const footballTex = () => _fb || (_fb = E3.canvasTex(128, 128, (g, w) => {
    const c = w / 2, R = w * .46; g.fillStyle = '#f7f7f2'; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
    const pent = (x, y, s, rot) => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = rot + i * TAU / 5; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * s, y + Math.sin(a) * s); } g.closePath(); g.fill(); };
    g.fillStyle = '#1b1b22'; pent(c, c, R * .3, -PI / 2);
    for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * TAU / 5 + PI / 5; pent(c + Math.cos(a) * R * .82, c + Math.sin(a) * R * .82, R * .24, a); }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, R, 0, TAU); g.stroke();
  }));
  const RING_VS = `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const RING_FS = `uniform float uT, uFade; varying vec3 vP;
    void main(){ float a = atan(vP.y, vP.x) / 6.2831853 + 0.5; float d = fract(uT - a); float b = pow(1.0 - d, 7.0) + 0.04; gl_FragColor = vec4(vec3(1.0, 0.95, 0.75) * b * 1.6, b * uFade); }`;
  const DELHI = [28.6, 77.2], LONDON = [51.5, -.13];
  function scaleStop() {
    const g = stop(), R = 20;
    const earth = E3.planet('earth', R, { seg: 128, noTilt: true }); g.add(earth);   // not faded: this stop fades through dark instead
    const sun = new T.DirectionalLight(0xffffff, 1.1); sun.position.set(45, 50, 100); g.add(sun); g.add(new T.AmbientLight(0xffffff, .12));   // sunshine from in front, so India and Europe are in daylight
    const lr = add(g, new T.Mesh(new T.TorusGeometry(R * 1.14, .22, 8, 240), new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uFade: { value: 1 } }, vertexShader: RING_VS, fragmentShader: RING_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
    lr.rotation.x = PI / 2;
    const ball = () => { const s = new T.Sprite(new T.SpriteMaterial({ map: footballTex(), transparent: true, depthTest: false })); s.scale.set(2.6, 2.6, 1); return s; };
    const bD = ball(), bL = ball(); bD.position.copy(E3.latLonToVec(DELHI[0], DELHI[1], R * 1.07)); bL.position.copy(E3.latLonToVec(LONDON[0], LONDON[1], R * 1.07));
    earth.spin.add(bD); earth.spin.add(bL);
    const a = E3.latLonToVec(DELHI[0], DELHI[1], 1), b = E3.latLonToVec(LONDON[0], LONDON[1], 1), arcPts = [];
    for (let i = 0; i <= 80; i++) { const s = i / 80, v = a.clone().lerp(b, s).normalize(); arcPts.push(v.multiplyScalar(R * (1.02 + .1 * Math.sin(PI * s)))); }
    const arc = arcPts.filter((_, i) => i % 3 === 0 && i > 3 && i < 78).map(v => { const d = glow(0xffc040, .9); d.material.depthTest = false; d.position.copy(v); earth.spin.add(d); return d; });
    Object.assign(g.userData, { earth, lr, bD, bL, arc, sun });
    return g;
  }
  function scaleTick(dt) {
    const u = S.scale.userData, e = u.earth, show2 = et > 9;
    u.lr.material.uniforms.uT.value += dt * .75;            // light really goes round 7½ times a second; shown ten times slower
    u.lr.visible = !show2 || et < 10.5; u.lr.material.uniforms.uFade.value = S.scale.userData.fade * (show2 ? 1 - seg(9, 10.5, et) : 1);
    const want = -(90 + 38) * PI / 180;                      // turn the globe so India and Europe face us
    if (!show2) e.spin.rotation.y += dt * .12; else e.spin.rotation.y += (want - e.spin.rotation.y) * Math.min(1, dt * 1.6);
    const on = show2 ? seg(10.5, 12, et) : 0, path = seg(11, 14, et); u.bD.visible = u.bL.visible = on > 0;
    u.bD.material.opacity = u.bL.material.opacity = on; u.arc.forEach((d, j) => { d.visible = show2 && j / u.arc.length < path; });
    E3.lightPlanet(e, u.sun.getWorldPosition(V3()).multiplyScalar(10));
    if (e.clouds) e.clouds.rotation.y += dt * .01;
  }

  /* ================================================================ 5 and 6. the nearest stars (units: light-years) */
  const STARS = [   // name, right ascension (h), declination (°), light-years, colour, size, voice line
    ['Alpha Centauri', 14.66, -60.83, 4.37, 0xffe9b0, 1.25, 'nb_stars_alpha'], ['Proxima Centauri', 14.495, -62.68, 4.24, 0xff7a5a, .55, null],
    ["Barnard's Star", 17.963, 4.69, 5.96, 0xff7a5a, .55, 'nb_stars_barnard'], ['Wolf 359', 10.94, 7.01, 7.86, 0xff6a50, .5, 'nb_stars_wolf'],
    ['Lalande 21185', 11.055, 35.97, 8.31, 0xff7a5a, .55, null], ['Sirius', 6.752, -16.72, 8.6, 0xdfe8ff, 1.7, 'nb_stars_sirius'],
    ['Luyten 726-8', 1.65, -17.95, 8.73, 0xff6a50, .5, null], ['Ross 154', 18.83, -23.84, 9.7, 0xff6a50, .5, null],
    ['Ross 248', 23.70, 44.17, 10.3, 0xff6a50, .5, null], ['Epsilon Eridani', 3.549, -9.46, 10.5, 0xffc27a, .95, null],
    ['Lacaille 9352', 23.10, -35.85, 10.7, 0xff7a5a, .55, null], ['Ross 128', 11.795, .8, 11.0, 0xff6a50, .5, null],
    ['Procyon', 7.655, 5.22, 11.46, 0xf4f2ff, 1.35, null], ['61 Cygni', 21.115, 38.75, 11.4, 0xffc27a, .9, null],
    ['Epsilon Indi', 22.055, -56.79, 11.9, 0xffc27a, .85, null], ['Tau Ceti', 1.735, -15.94, 11.9, 0xfff0c0, 1.0, 'nb_stars_tauceti'],
    ['Groombridge 34', .307, 44.02, 11.6, 0xff6a50, .5, null], ['Struve 2398', 18.713, 59.63, 11.5, 0xff6a50, .5, null]
  ];
  // turn the star map so Alpha Centauri sits off to the right, level with us: easier to see on a screen than the real "down"
  const TURN = new T.Quaternion().setFromUnitVectors(sky(14.495, -62.68), V3(1, -.08, .22).normalize());
  const starPos = (s, k) => sky(s[1], s[2]).applyQuaternion(TURN).multiplyScalar(s[3] * k);
  function proximaStop() {
    const g = stop(), k = FIT / 5.5, rr = rng(14);
    add(g, glow(0xfff1c8, 2.4), glow(0xffb44a, 4.5, .5));
    add(g, cloud(2600, (i, p, c) => { const d = (.3 + 1.3 * Math.pow(rr(), 1.2)) * k, v = V3(gauss(rr), gauss(rr), gauss(rr)).normalize(); p[0] = v.x * d; p[1] = v.y * d; p[2] = v.z * d; c[0] = .32; c[1] = .37; c[2] = .48; return 1.1; }));
    const A = starPos(STARS[0], k), P = starPos(STARS[1], k), side = V3().crossVectors(A.clone().sub(P), V3(0, 1, 0)).normalize().multiplyScalar(.25);
    const a1 = add(g, glow(0xffe9b0, 3.4)); a1.position.copy(A).add(side); const a2 = add(g, glow(0xffc27a, 2.6)); a2.position.copy(A).sub(side);
    const px = add(g, glow(0xff7a5a, 2.2)); px.position.copy(P);
    const pb = add(g, glow(0xc9a88a, .7)); pb.position.copy(P).add(V3(.7, .3, 0));
    const beam = add(g, line([V3(), V3()], 0xfff0c0, .9));
    const head = add(g, glow(0xfff6d8, 1.6)); head.visible = false;
    Object.assign(g.userData, { A, P, pb: pb.position, beam, head, bt: -1, k });
    return g;
  }
  function proximaTick(dt) {
    const u = S.proxima.userData;
    if (u.bt < 0) return;
    u.bt += dt; const f = seg(0, 8, u.bt);
    const pts = [V3(), u.P.clone().multiplyScalar(f)]; u.beam.geometry.setFromPoints(pts); u.head.visible = f < 1; u.head.position.copy(pts[1]);
  }
  function starsStop() {
    const g = stop(), k = FIT / 14;
    add(g, glow(0xfff1c8, 1.5), glow(0xffb44a, 3, .5));
    add(g, ring(5 * k, 0x8ca0ff, .25), ring(10 * k, 0x8ca0ff, .2));
    const foot = [];
    g.userData.stars = STARS.map(s => {
      const p = starPos(s, k), gl = add(g, glow(s[4], s[5] * 2.9)); gl.position.copy(p);
      foot.push(p, V3(p.x, 0, p.z));
      return { name: s[0], p, lineId: s[6], big: s[5] >= .85 };
    });
    const lg = new T.BufferGeometry().setFromPoints(foot);
    add(g, new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0x8ca0ff, transparent: true, opacity: .3, depthWrite: false })));
    g.userData.k = k;
    return g;
  }

  /* ================================================================ 7 and 8. galaxies (units: light-years) */
  // a spiral galaxy made of glowing dots: a yellow middle, blue-white arms with pink star nurseries, and a faint disc
  function galaxyPoints(n, k, o) {
    const rr = rng(o.seed);
    return cloud(n, (i, p, c) => {
      const u = rr(); let x, y, z;
      if (u < o.bulge) { x = gauss(rr) * o.bR; y = gauss(rr) * o.bR * .55; z = gauss(rr) * o.bR; c[0] = 1; c[1] = .8; c[2] = .52; }
      else if (u < o.bulge + o.arms) {
        const arm = (rr() * o.nArms) | 0, d = o.r0 + Math.pow(rr(), .85) * (o.R - o.r0);
        const th = o.phase + arm * TAU / o.nArms + Math.log(d / o.r0) / Math.tan(o.pitch) + gauss(rr) * o.spread;
        x = Math.cos(th) * d; z = Math.sin(th) * d; y = gauss(rr) * o.R * .012;
        const pink = rr() < .06; c[0] = pink ? 1 : .72; c[1] = pink ? .42 : .82; c[2] = pink ? .62 : 1;
      } else {
        const d = o.R * Math.pow(rr(), .7), th = rr() * TAU; x = Math.cos(th) * d; z = Math.sin(th) * d; y = gauss(rr) * o.R * .02; c[0] = .95; c[1] = .86; c[2] = .72;
      }
      const b = o.bright * (u < o.bulge ? 1 : .8); c[0] *= b; c[1] *= b; c[2] *= b;
      p[0] = x * k; p[1] = y * k; p[2] = z * k; return o.size * (.7 + rr() * .9);
    });
  }
  const MW = { seed: 21, bulge: .17, arms: .58, bR: 3800, r0: 4200, R: 50000, nArms: 4, pitch: 12 * PI / 180, spread: .2, phase: .9, bright: .5, size: 1.7 };
  const SUN_R = 26000;
  function galaxyStop() {
    const g = stop(), k = FIT / 60000, gal = new T.Group();
    gal.position.set(-SUN_R * k, 0, 0); g.add(gal);
    const rr = rng(22), sunMark = glow(0xffe08a, 1.6); sunMark.position.set(SUN_R * k, 0, 0);
    regInto(g, gal, galaxyPoints(60000, k, MW),
      // the Orion Spur, where the Sun lives
      cloud(1600, (i, p, c) => { const a = (rr() - .5) * .5, d = SUN_R + (rr() - .5) * 3500 + a * 6000; p[0] = Math.cos(a) * d * k; p[1] = gauss(rr) * 200 * k; p[2] = Math.sin(a) * d * k; c[0] = .5; c[1] = .58; c[2] = .7; return 1.6; }),
      sunMark);
    Object.assign(g.userData, { gal, sunMark, centre: V3(-SUN_R * k, 0, 0), k });
    return g;
  }
  function andromedaStop() {
    const g = stop(), k = FIT / 2.6e6, rr = rng(31);
    const mw = new T.Group(); mw.position.set(-SUN_R * k, 0, 0); g.add(mw);
    regInto(g, mw, galaxyPoints(7000, k, { ...MW, size: 1.3, bright: .22 }), glow(0xffe2b0, 4, .35));
    const dirA = V3(.86, .3, -.4).normalize(), A = dirA.clone().multiplyScalar(2.5e6 * k);
    const an = new T.Group(); an.position.copy(A); an.rotation.set(.9, .3, .5); g.add(an);
    regInto(g, an, galaxyPoints(20000, k, { seed: 32, bulge: .24, arms: .5, bR: 6000, r0: 5000, R: 110000, nArms: 2, pitch: 9 * PI / 180, spread: .22, phase: 2, bright: .26, size: 1.3 }), glow(0xffe8c8, 8, .35));
    const m33 = new T.Group(); m33.position.copy(A).add(V3(.4, -.5, .3).normalize().multiplyScalar(750000 * k)); m33.rotation.set(.4, 0, 1.1); g.add(m33);
    regInto(g, m33, galaxyPoints(4000, k, { seed: 33, bulge: .12, arms: .6, bR: 2500, r0: 3000, R: 30000, nArms: 2, pitch: 14 * PI / 180, spread: .25, phase: 0, bright: .3, size: 1.2 }), glow(0xcfe0ff, 2.4, .3));
    const cl = (pos, size) => { const s = glow(0xcfd8ff, size, .55); s.position.copy(pos); return s; };
    const LMC = V3(-SUN_R * k, 0, 0).add(V3(.2, -.8, .5).normalize().multiplyScalar(160000 * k)), SMC = V3(-SUN_R * k, 0, 0).add(V3(.5, -.75, .3).normalize().multiplyScalar(200000 * k));
    add(g, cl(LMC, 1.6), cl(SMC, 1.1));
    add(g, cloud(260, (i, p, c) => { const v = V3(gauss(rr), gauss(rr), gauss(rr)).normalize().multiplyScalar((60 + rr() * 90)); p[0] = v.x; p[1] = v.y; p[2] = v.z; const b = .25 + rr() * .3; c[0] = b; c[1] = b * .95; c[2] = b * 1.1; return 2 + rr() * 2.5; }));
    Object.assign(g.userData, { A, M33: m33.position, LMC, SMC, MWc: mw.position, k });
    return g;
  }
  function regInto(g, parent, ...objs) { for (const o of objs) { parent.add(o); o.traverse(x => { if (x.material) g.userData.mats.push([x.material, x.material.opacity ?? 1]); }); } }

  /* ================================================================ the stops */
  const S = {};
  const need = id => S[id] || (S[id] = ({ kuiper: kuiperStop, bubble: bubbleStop, oort: oortStop, scale: scaleStop, proxima: proximaStop, stars: starsStop, galaxy: galaxyStop, andromeda: andromedaStop })[id]());
  const CH = [
    { id: 'kuiper', name: 'Icy worlds', when: 'Past Neptune', sub: 'The Kuiper belt, full of icy worlds', R: 55 / LY_AU, line: 'nb_kuiper',
      start() { view({ dist: 112, pitch: .62, yaw: .3, auto: .025 }); },
      tick(dt) { for (const p of S.kuiper.userData.pl) { p.ang += dt * p.sp; p.s.position.set(Math.cos(p.ang) * p.R, 0, -Math.sin(p.ang) * p.R); } },
      hud() {
        const g = S.kuiper; lab(g, V3(0, 3, 0), 'Sun', 'rgba(5,8,23,.6)', '#FFE3A0', 10, -6);
        for (const p of g.userData.pl) if (p.name === 'Neptune') lab(g, p.s.position.clone().add(V3(0, 1.6, 0)), p.name, 'rgba(5,8,23,.6)', '#C9D0F2', 10, -6);
        lab(g, V3(-30, 0, 28), 'Kuiper belt', 'rgba(13,20,52,.8)', '#CFE0FF', 12);
        for (const d of g.userData.dw) tapLab(g, d.pos, d.name, d.lineId);
        return 'There may be millions of icy worlds out here. Tap a gold name!';
      } },
    { id: 'bubble', name: "The Sun's bubble", when: "The Sun's bubble", sub: 'The heliosphere, blown by the wind from the Sun', R: 230 / LY_AU, line: 'nb_bubble',
      start() { view({ dist: 100, pitch: .3, yaw: -.42, auto: .015 }); },
      tick(dt) { bubbleTick(dt); },
      hud() {
        const g = S.bubble, k = g.userData.k;
        lab(g, V3(0, 6, 0), 'All the planets are in here', 'rgba(5,8,23,.6)', '#FFE3A0', 10, -8);
        lab(g, V3(40 * k, 196 * k, 0), 'Edge of the bubble', 'rgba(13,20,52,.8)', '#9FD0FF', 11);
        lab(g, V3(250 * k, -40 * k, 0), 'Wind from other stars', 'rgba(13,20,52,.8)', '#C9C8FF', 11);
        for (const v of g.userData.voy) tapLab(g, v.end, v.name, 'nb_bubble_voyager');
        return 'The Sun\'s wind pushes against the wind from other stars';
      } },
    { id: 'oort', name: 'The comet cloud', when: 'The Oort cloud', sub: 'A giant ball of icy comets around everything', R: 105000 / LY_AU, line: 'nb_oort', action: { id: 'flash', label: 'Send a flash of light' },
      start() { view({ dist: 100, pitch: .42, yaw: .6, auto: .02 }); S.oort.userData.ft = -1; S.oort.userData.flash.visible = false; S.oort.userData.ly.material.opacity = 0; },
      act() { const u = S.oort.userData; u.ft = 0; Sfx.chime(); Voice.say('nb_oort_flash'); },
      tick(dt) { oortTick(dt); },
      hud(ctx) {
        const g = S.oort, u = g.userData;
        lab(g, V3(0, 1.5, 0), 'The Sun and all the planets are in this tiny dot!', GOLD, INK, 11, -10);
        if (u.ft >= 0) {
          const y = lightYears(u.ft), T0 = top() + 70, w = Math.min(250, W - 32); panel(ctx, 16, T0, w, 104);
          hudText(ctx, 'The flash has travelled for', 28, T0 + 18, 11, '#C9D0F2', 'left', 600); hudText(ctx, fmtTime(y), 28, T0 + 38, 17, '#FFE08A', 'left', 700);
          [['8 minutes', 'reached Earth', 8 * YR_MIN], ['4 hours', 'reached Neptune', 250 * YR_MIN], ['1 day', 'passed Voyager 1', 1 / 365.25], ['1 year', 'one light-year!', 1]].forEach(([a, b, at], j) => {
            const done = y >= at; hudText(ctx, `${done ? '✓' : '·'} ${a}: ${b}`, 28, T0 + 58 + j * 14, 11, done ? '#6FEA95' : '#6E79AE', 'left', 600);
          });
          if (y >= 1) lab(g, V3(LY_AU * u.k * .72, 0, LY_AU * u.k * .72), '1 light-year', GOLD, INK, 12);
        }
        return u.ft < 0 ? 'Press "Send a flash of light" to see how far light goes' : 'Even after a whole year, the light is still inside the comet cloud';
      } },
    { id: 'scale', name: 'How far is a star?', when: 'How far is the next star?', sub: 'Light, and a football model of space', R: null, line: 'nb_scale',
      start() { view({ dist: 64, pitch: .5, yaw: 0, min: 35, max: 140 }); const e = S.scale.userData.earth; e.spin.rotation.y = -(90 + 70) * PI / 180; },
      tick(dt) { scaleTick(dt); },
      hud() {
        const g = S.scale, u = g.userData, R = 20;
        if (et < 10) return 'Light can go round the Earth 7½ times in one second (shown 10 times slower)';
        const d = u.bD.getWorldPosition(V3()), l = u.bL.getWorldPosition(V3());
        const pd = E3.toScreen(d, cam, W, H), pl = E3.toScreen(l, cam, W, H);
        if (u.bD.material.opacity > .5) {
          pill(ctx2(), 'The Sun as a football, in Delhi', pd.x, pd.y + 34, GOLD, INK, 11); pill(ctx2(), 'Earth: a mustard seed, 24 m away', pd.x, pd.y + 56, DARK, '#F3F1FF', 10);
          if (seg(11, 14, et) >= 1) pill(ctx2(), 'The nearest star: another football, in London!', pl.x, pl.y - 18, GOLD, INK, 11);
        }
        return 'If the Sun were a football, the nearest star would be about 6,000 km away';
      } },
    { id: 'proxima', name: 'Our nearest star', when: 'Our nearest star', sub: 'Alpha Centauri: a family of three stars', R: 5.5, line: 'nb_proxima', action: { id: 'beam', label: 'Send light to Proxima' },
      start() { const u = S.proxima.userData; u.bt = -1; u.beam.geometry.setFromPoints([V3(), V3()]); u.head.visible = false; const tall = H > W; view({ goal: u.P.clone().multiplyScalar(.5), dist: tall ? 50 : 58, pitch: tall ? 1.0 : .35, yaw: tall ? -PI / 2 : 0, auto: 0, tall: tall ? .7 : 1.15 }); },
      act() { S.proxima.userData.bt = 0; Sfx.whoosh(); },
      tick(dt) { proximaTick(dt); },
      hud(ctx) {
        const g = S.proxima, u = g.userData;
        lab(g, V3(0, 1.4, 0), 'Sun (and all our planets)', 'rgba(5,8,23,.6)', '#FFE3A0', 10, -6);
        lab(g, u.A, 'Alpha Centauri A and B', 'rgba(13,20,52,.85)', '#FFE9B0', 11, -24);
        lab(g, u.P, 'Proxima Centauri, with a planet', 'rgba(13,20,52,.85)', '#FF9A80', 11, 30);
        if (u.bt >= 0) { const y = 4.24 * seg(0, 8, u.bt); const T0 = top() + 70; panel(ctx, 16, T0, 196, 44); hudText(ctx, 'Light has travelled for', 28, T0 + 17, 11, '#C9D0F2', 'left', 600); hudText(ctx, `${y.toFixed(1)} years`, 28, T0 + 36, 16, '#FFE08A', 'left', 700); }
        return 'Its light takes 4.2 years to reach us';
      } },
    { id: 'stars', name: 'Star neighbours', when: 'Our star neighbours', sub: 'Every star within 12 light-years of the Sun', R: 14, line: 'nb_stars',
      start() { view({ dist: 100, pitch: .55, yaw: .5, auto: .03 }); },
      tick() {},
      hud() {
        const g = S.stars, k = g.userData.k;
        lab(g, V3(), 'Sun (that\'s us!)', GOLD, INK, 11, 26);
        for (const s of g.userData.stars) if (s.lineId) tapLab(g, s.p, s.name, s.lineId, -12);
        for (const s of g.userData.stars) if (!s.lineId && (s.big || W > 700)) lab(g, s.p, s.name, 'rgba(5,8,23,.55)', '#C9D0F2', 9, -10);
        lab(g, V3(5 * k * .72, 0, 5 * k * .72), '5 light-years', 'rgba(5,8,23,.55)', '#8CA0FF', 9); lab(g, V3(10 * k * .72, 0, 10 * k * .72), '10 light-years', 'rgba(5,8,23,.55)', '#8CA0FF', 9);
        return 'Most of our neighbours are small red stars. Tap a gold name!';
      } },
    { id: 'galaxy', name: 'The Milky Way', when: 'Our galaxy, the Milky Way', sub: 'Hundreds of billions of stars in a giant spiral', R: 60000, line: 'nb_galaxy', action: { id: 'akash', label: 'Akash Ganga' },
      start() { const u = S.galaxy.userData; u.gal.rotation.y = 0; view({ goal: u.centre, dist: 100, pitch: .8, yaw: .25, auto: 0, tall: 1.05 }); },
      act() { Voice.say('nb_galaxy_akash'); },
      tick(dt) { if (!trans) S.galaxy.userData.gal.rotation.y += dt * TAU / 90; },
      hud(ctx) {
        const g = S.galaxy, u = g.userData;
        lab(g, g.worldToLocal(u.sunMark.getWorldPosition(V3())), 'You are here', GOLD, INK, 12, -10);
        lab(g, u.centre, 'The middle: a giant black hole', 'rgba(13,20,52,.8)', '#FFD9A8', 10, 26);
        const turns = (u.gal.rotation.y / TAU) * 230; const T0 = top() + 70; panel(ctx, 16, T0, 218, 44);
        hudText(ctx, 'Since we arrived, the Sun has gone round for', 28, T0 + 17, 10, '#C9D0F2', 'left', 600); hudText(ctx, `${Math.round(turns)} million years`, 28, T0 + 36, 16, '#FFE08A', 'left', 700);
        return 'About 100,000 light-years across. One trip round takes 230 million years';
      } },
    { id: 'andromeda', name: 'Andromeda', when: 'Andromeda, our big neighbour', sub: 'The nearest big galaxy to the Milky Way', R: 2.6e6, line: 'nb_andromeda', action: { id: 'home', label: 'Fly back home' },
      start() { const u = S.andromeda.userData; const tall = H > W; view({ goal: u.A.clone().multiplyScalar(.5), dist: 56, pitch: tall ? 1.0 : .3, yaw: tall ? -1.14 : .15, auto: tall ? 0 : .01, tall: tall ? 1.0 : 1.2 }); },
      act() { if (home) return; Voice.say('nb_andromeda_home'); home = { list: [6, 5, 4, 2, 1, 0], i: 0, wait: 1.2 }; setAction(null); },
      tick() {},
      hud() {
        const g = S.andromeda, u = g.userData;
        lab(g, u.MWc.clone().add(V3(0, -1.8, 0)), 'Our Milky Way', GOLD, INK, 11, 16);
        lab(g, u.A.clone().add(V3(0, 3.6, 0)), 'Andromeda', 'rgba(13,20,52,.85)', '#FFE8C8', 12, -6);
        lab(g, u.M33.clone().add(V3(0, -1.4, 0)), 'Triangulum', 'rgba(5,8,23,.55)', '#CFE0FF', 9, 12);
        lab(g, u.LMC.clone().add(V3(0, -1, 0)), 'Two small galaxies near ours', 'rgba(5,8,23,.55)', '#CFD8FF', 9, 14);
        return 'Andromeda is 2.5 million light-years away';
      } }
  ];

  /* ================================================================ moving between stops */
  function setAction(a) { const b = $('#beyondAct'); b.hidden = !a; if (a) { b.querySelector('span').textContent = a.label; b.dataset.id = a.id; } }
  function finishTrans() {
    if (!trans) return;
    const { a, b } = trans; S[a.id].visible = false; S[b.id].visible = true; S[b.id].scale.setScalar(1); setFade(S[b.id], 1);
    if (!trans.zoom && !trans.swapped) { b.start(); ctl.snap(); }
    trans = null;
  }
  function go(i, o = {}) {
    const to = clamp(i, 0, CH.length - 1), A = CH[cur], B = CH[to];
    need(B.id); if (!o.keepHome) home = null;
    finishTrans();
    if (!o.first && to !== cur) {
      need(A.id);
      if (A.R && B.R) { trans = { a: A, b: B, p: 0, dur: o.fast ? 1.25 : 2.6, zoom: true, Z: B.R / A.R }; S[B.id].visible = true; setFade(S[B.id], 0); S[B.id].scale.setScalar(trans.Z); B.start(); }
      else trans = { a: A, b: B, p: 0, dur: 1, zoom: false, swapped: false };
    } else {
      for (const id in S) S[id].visible = false;
      S[B.id].visible = true; S[B.id].scale.setScalar(1); setFade(S[B.id], 1); B.start(); ctl.snap();
    }
    cur = to; et = 0; setAction(B.action || null);
    $$('#beyondSteps .emode').forEach((b, k) => b.setAttribute('aria-pressed', k === cur ? 'true' : 'false'));
    $(`#beyondSteps [data-i="${cur}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    $('#beyondPrev').disabled = cur === 0; $('#beyondNext').disabled = cur === CH.length - 1;
    if (CH[cur + 1]) Voice.prefetch('nb_' + CH[cur + 1].id);
    if (o.talk !== false) { Sfx.whoosh(); Voice.say(B.line); }
  }
  function stepTrans(dt) {
    const tr = trans; tr.p = Math.min(1, tr.p + dt / tr.dur); const p = ease(tr.p), ga = S[tr.a.id], gb = S[tr.b.id];
    let dark = 0;
    if (tr.zoom) {
      const s = Math.pow(tr.Z, p); ga.scale.setScalar(1 / s); gb.scale.setScalar(tr.Z / s);
      const big = Math.abs(Math.log10(tr.Z)) > 2;   // a huge jump: let the new picture appear only once it has shrunk to size
      setFade(ga, 1 - seg(.3, .85, tr.p)); setFade(gb, big ? seg(.5, .9, tr.p) : seg(.12, .7, tr.p)); ga.visible = tr.p < .9;
    } else {
      dark = 1 - Math.abs(tr.p * 2 - 1);
      if (!tr.swapped && tr.p >= .5) { tr.swapped = true; ga.visible = false; gb.visible = true; gb.scale.setScalar(1); setFade(gb, 1); tr.b.start(); ctl.snap(); }
    }
    if (tr.p >= 1) finishTrans();
    return dark;
  }

  /* ================================================================ the screen */
  // a line on the screen, labelled with how long light takes to cross it
  function scaleBar(ctx) {
    const ch = CH[cur]; if (!ch.R || trans) return;
    const dist = cam.position.distanceTo(ctl.goal), wpp = 2 * dist * Math.tan(cam.fov * PI / 360) / H, lyPerPx = wpp * ch.R / FIT, sec = lyPerPx * 3.156e7;
    const U = [['minute', 60], ['hour', 3600], ['day', 86400], ['year', 3.156e7]], want = 110 * sec;
    let unit = U[0]; for (const u of U) if (want >= u[1]) unit = u;
    const v = want / unit[1], mag = Math.pow(10, Math.floor(Math.log10(v))), nice = [1, 2, 5, 10].map(x => x * mag).filter(x => x <= v).pop() || mag;
    const px = nice * unit[1] / sec, x0 = 18, y0 = bottom() - 34;
    ctx.strokeStyle = '#59E0E8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, y0 - 5); ctx.lineTo(x0, y0); ctx.lineTo(x0 + px, y0); ctx.lineTo(x0 + px, y0 - 5); ctx.stroke();
    const n = nice >= 1000 ? Math.round(nice).toLocaleString('en-IN') : String(Math.round(nice)), word = unit[0] + (Math.round(nice) === 1 ? '' : 's');
    hudText(ctx, `Light takes ${n} ${word} to cross this line`, x0, y0 - 9, W < 600 ? 10 : 11, '#9FEFF4', 'left', 600);
  }
  function init() {
    ready = true; r = E3.attach(ov); E3.mats(r);
    scene = new T.Scene(); scene.add(E3.starfield(9000));
    cam = new T.PerspectiveCamera(45, 1, .02, 30000);
    ctl = new E3.Orbit(cam, ov, { dist: 100, pitch: .6, yaw: .3, min: 20, max: 300 }); ctl.snap();
    ctl.onTap = (x, y) => { let best = null, bd = 34; for (const tp of taps) { const d = Math.hypot(x - tp.x, y - tp.y); if (d < bd) { bd = d; best = tp; } } if (best) { Sfx.twinkle(); Voice.say(best.line); } };
    $('#beyondSteps').innerHTML = CH.map((c, i) => `<button type="button" class="emode" data-i="${i}" aria-pressed="false">${i + 1}. ${c.name}</button>`).join('');
    $$('#beyondSteps .emode').forEach(b => b.addEventListener('click', () => go(+b.dataset.i)));
    $('#beyondPrev').addEventListener('click', () => go(cur - 1)); $('#beyondNext').addEventListener('click', () => go(cur + 1)); $('#beyondAgain').addEventListener('click', () => go(cur));
    $('#beyondAct').addEventListener('click', () => { Sfx.tap(); CH[cur].act?.(); });
    $('#beyondBack').addEventListener('click', () => { Sfx.tap(); home = null; Voice.stop(); show('explore', true); });
    layout();
  }
  function layout() { if (!ready) return; E3.attach(ov); const f = fitCanvas(ov); W = f.w; H = f.h; E3.fit(r, cam); }
  function frame(dt) {
    if (!ready) init();
    t += dt; et += dt;
    let dark = 0;
    if (trans) { dark = stepTrans(dt); if (trans && trans.zoom) trans.a.tick(dt); }
    CH[cur].tick(dt);
    if (home && !trans) { home.wait -= dt; if (home.wait <= 0) { if (home.i < home.list.length) { go(home.list[home.i++], { fast: true, talk: false, keepHome: true }); home.wait = .1; } else { home = null; show('explore', true); return; } } }
    E3.fit(r, cam); ctl.update(dt); r.render(scene, cam);
    const ctx = ctx2(), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    taps = []; placed = [];
    const ch = CH[cur], g = S[ch.id], showing = !trans || trans.zoom || trans.swapped;
    let hint = null;
    if (showing && g) { ctx.globalAlpha = g.userData.fade; hint = ch.hud(ctx); ctx.globalAlpha = 1; }
    if (hint && !home) hudPill(ctx, hint, W / 2, bottom() - 4, 'rgba(13,20,52,.88)', '#F3F1FF', W < 600 ? 10.5 : 12);
    scaleBar(ctx);
    const T0 = top(), pw = Math.min(380, W - 32), px = (W - pw) / 2; panel(ctx, px, T0, pw, 56);
    hudText(ctx, `${cur + 1}. ${ch.when}`, W / 2, T0 + 20, 15, '#FFB52E'); hudText(ctx, ch.sub, W / 2, T0 + 36, W < 600 ? 9.5 : 11, '#C9D0F2', 'center', 600);
    for (let i = 0; i < CH.length; i++) { const x = px + 18 + i * (pw - 36) / (CH.length - 1); ctx.fillStyle = i === cur ? '#FFB52E' : i < cur ? '#59E0E8' : '#2B3A7A'; ctx.beginPath(); ctx.arc(x, T0 + 47, i === cur ? 4.5 : 3, 0, TAU); ctx.fill(); }
    if (dark > 0) { ctx.fillStyle = `rgba(5,8,23,${dark})`; ctx.fillRect(0, 0, W, H); }
  }
  return {
    frame, layout,
    enter(quiet) {
      if (!ready) init();
      E3.attach(ov); layout(); cur = 0;
      go(0, { first: true, talk: false });
      if (!started) { started = true; Voice.say('nb_intro', () => { if (current === 'beyond' && cur === 0 && !Voice.busy) Voice.say(CH[0].line); }); }
      else if (!quiet) Voice.say(CH[0].line);
    },
    leave() { home = null; finishTrans(); if (ctl) ctl.auto = 0; },
    // for testing: jump to a stop (with no zoom) and run its clock forward without drawing
    seek(i, sec = 0) { if (!ready) init(); go(i, { first: true, talk: false }); this.skip(sec); },
    skip(sec) { for (let k = 0; k < sec / .05; k++) { et += .05; t += .05; CH[cur].tick(.05); } },
    act() { CH[cur].act?.(); },
    spots: () => taps.map(tp => ({ ...tp })),   // where the gold names are on screen (used by the tests)
    next() { go(cur + 1); }
  };
})();
