/* Earth's story: a time machine from the birth of the planets to today, with dinosaurs, the asteroid and the Ice Age.
   Plugs into views.earth (visit.js) through views.earth.api, like earthfx.js. */
'use strict';
(() => {
  const T = THREE, A = views.earth.api, M = A.M, V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const cam = () => A.cam, ctl = () => A.ctl, N = window.NATURE;
  const std = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: .85 }, o));
  const ell = (rx, ry, rz, mat, seg = 20) => { const m = new T.Mesh(new T.SphereGeometry(1, seg, Math.max(8, seg * .6 | 0)), mat); m.scale.set(rx, ry, rz); m.castShadow = true; return m; };
  const label3 = (ctx, v, s, bg = 'rgba(13,20,52,.85)', fg = '#F3F1FF', size = 12) => { const p = A.proj(v); if (p.front && p.x > 0 && p.x < A.W && p.y > 0 && p.y < A.H) hudPill(ctx, s, p.x, p.y, bg, fg, size); };
  const btnLabel = (id, text) => { const b = $(`#earthCtl [data-id="${id}"] span`); if (b) b.textContent = text; };

  /* ================================================================ creature models (1 unit = 1 metre) */
  // a bendy chain of segments along +x (neck) or -x (tail); each segment is a child of the one before
  function chain(n, len, r0, r1, mat, dir, angles) {
    const root = new T.Group(); let parent = root; const segs = [];
    for (let i = 0; i < n; i++) {
      const r = lerp(r0, r1, i / Math.max(1, n - 1)), rn = lerp(r0, r1, (i + 1) / Math.max(1, n - 1));
      const g = new T.CylinderGeometry(Math.max(.02, rn), r, len * 1.08, 12); g.rotateZ(dir * -PI / 2); g.translate(dir * len / 2, 0, 0);
      const seg = new T.Group(); const m = new T.Mesh(g, mat); m.castShadow = true; seg.add(m);
      seg.position.x = i ? dir * len : 0; seg.rotation.z = (angles[i] ?? angles[angles.length - 1]) * dir;
      parent.add(seg); parent = seg; segs.push(seg);
    }
    root.tip = parent; root.segs = segs; root.tipX = dir * len; return root;
  }
  function leg(len, r, mat, foot = 1.3) {
    const g = new T.Group(); const m = new T.Mesh(new T.CylinderGeometry(r * .75, r, len, 10), mat); m.position.y = -len / 2; m.castShadow = true; g.add(m);
    const f = ell(r * foot, r * .6, r * foot, mat, 10); f.position.y = -len; g.add(f); return g;
  }
  /* sp: color, belly, body [rx,ry,rz], hip (height of body centre), legs [front, back], legR, biped,
         neck {n, len, r0, r1, angles}, tail {n, len, r0, r1, angles}, head [rx,ry,rz], extras(group, parts) */
  function dino(sp) {
    const g = new T.Group(), mat = N.skin(sp.color, sp.fur ? 'fur' : 'scales', { repeat: sp.fur ? 4 : 3 }), inner = new T.Group(); g.add(inner); inner.position.y = sp.hip; if (sp.tilt) inner.rotation.z = sp.tilt;
    const [bx, by, bz] = sp.body; inner.add(ell(bx, by, bz, mat));
    if (sp.belly) { const b = ell(bx * .92, by * .8, bz * .9, N.skin(sp.belly, 'scales')); b.position.y = -by * .18; inner.add(b); }
    const neck = chain(sp.neck.n, sp.neck.len, sp.neck.r0, sp.neck.r1, mat, 1, sp.neck.angles); neck.position.set(bx * .78, by * .25, 0); inner.add(neck);
    const head = new T.Group(); head.position.x = neck.tipX; neck.tip.add(head);
    const [hx, hy, hz] = sp.head; const skull = ell(hx, hy, hz, mat); skull.position.x = hx * .7; head.add(skull);
    const eyeM = new T.MeshStandardMaterial({ color: 0x111111, roughness: .2 });
    for (const s of [-1, 1]) { const e = ell(hy * .16, hy * .16, hy * .16, eyeM, 8); e.position.set(hx * .9, hy * .35, s * hz * .82); head.add(e); }
    const tail = chain(sp.tail.n, sp.tail.len, sp.tail.r0, sp.tail.r1, mat, -1, sp.tail.angles); tail.position.set(-bx * .78, by * .15, 0); inner.add(tail);
    const legs = [];
    const legMat = N.skin(sp.legColor ?? sp.color, sp.fur ? 'fur' : 'scales', { repeat: 1.5 });
    const put = (x, z, len, r) => { const l = leg(len, r, legMat); l.position.set(x, -by * .45, z); inner.add(l); legs.push(l); return l; };
    if (sp.biped) { put(-bx * .2, bz * .55, sp.legs[1], sp.legR); put(-bx * .2, -bz * .55, sp.legs[1], sp.legR); }
    else { put(bx * .55, bz * .6, sp.legs[0], sp.legR); put(bx * .55, -bz * .6, sp.legs[0], sp.legR); put(-bx * .55, bz * .6, sp.legs[1], sp.legR); put(-bx * .55, -bz * .6, sp.legs[1], sp.legR); }
    const parts = { inner, neck, tail, head, skull, legs, mat };
    sp.extras?.(parts);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.walk = (ph, speed = 1) => {
      legs.forEach((l, i) => { l.rotation.z = Math.sin(ph + (sp.biped ? i * PI : [0, PI, PI, 0][i])) * .38 * speed; });
      inner.position.y = sp.hip + Math.abs(Math.sin(ph)) * .08 * sp.hip * speed;
      tail.segs.forEach((s, i) => { s.rotation.y = Math.sin(ph * .5 - i * .5) * .06; });
      neck.segs.forEach((s, i) => { s.rotation.y = Math.sin(ph * .3 + i * .4) * .03; });
    };
    return g;
  }
  const SPECIES = {
    brachio: () => dino({ color: 0x7c8a66, belly: 0x9aa284, body: [4.2, 2.4, 2.1], hip: 6.4, legs: [5.4, 4.6], legR: .62, tilt: .12,
      neck: { n: 7, len: 1.45, r0: .95, r1: .42, angles: [.95, .08, .05, .03, 0, -.05, -.1] }, tail: { n: 7, len: 1.3, r0: .95, r1: .12, angles: [-.25, .05, .05, .04, .03, .02, .02] }, head: [.75, .42, .38] }),
    stego: () => dino({ color: 0x8a7a48, belly: 0xb4a272, body: [2.8, 1.6, 1.3], hip: 2.5, legs: [1.5, 2.2], legR: .32, tilt: -.16,
      neck: { n: 2, len: .7, r0: .55, r1: .38, angles: [-.4, -.15] }, tail: { n: 6, len: .85, r0: .7, r1: .1, angles: [.1, -.05, -.05, -.04, -.03, -.02] }, head: [.55, .3, .28],
      extras(p) {
        const pm = std(0xc0582e); for (let i = 0; i < 9; i++) { const x = 2.2 - i * .55, s = 1 - Math.abs(i - 4) / 6; const pl = new T.Mesh(new T.ConeGeometry(.5 * s + .15, 1.3 * s + .4, 4), pm); pl.scale.z = .18; pl.position.set(x, 1.45 + s * .5, 0); pl.rotation.z = -.1; p.inner.add(pl); }
        const sm = std(0xe8dcc0); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const sp = new T.Mesh(new T.ConeGeometry(.08, .9, 8), sm); sp.position.set(a > 0 ? -.5 : -.2, .2, b * .25); sp.rotation.set(b * 1.1, 0, .6); p.tail.tip.add(sp); }
      } }),
    trex: () => dino({ color: 0x6a5a3e, belly: 0x9a8a68, body: [2.6, 1.5, 1.25], hip: 3.7, legs: [0, 3.5], legR: .52, biped: true, tilt: -.08,
      neck: { n: 2, len: .7, r0: .95, r1: .8, angles: [.55, -.35] }, tail: { n: 8, len: 1, r0: 1.05, r1: .08, angles: [.12, -.02, -.02, -.02, -.02, -.01, -.01, 0] }, head: [1.25, .7, .55],
      extras(p) {
        const jaw = ell(1.1, .28, .48, p.mat); jaw.position.set(.9, -.5, 0); p.head.add(jaw);
        const tm = std(0xf4f0e0, { roughness: .4 }); for (let i = 0; i < 9; i++) for (const s of [-1, 1]) { const tt = new T.Mesh(new T.ConeGeometry(.05, .22, 6), tm); tt.position.set(.6 + i * .17, -.28, s * .38); tt.rotation.x = PI; p.head.add(tt); }
        for (const s of [-1, 1]) { const arm = leg(.75, .11, p.mat, 1); arm.position.set(2.0, -.3, s * .9); arm.rotation.z = .9; p.inner.add(arm); }
      } }),
    trike: () => dino({ color: 0x7a6a4c, belly: 0xa89a74, body: [2.8, 1.45, 1.45], hip: 2.1, legs: [1.6, 1.7], legR: .38,
      neck: { n: 1, len: .6, r0: .85, r1: .8, angles: [-.1] }, tail: { n: 4, len: .9, r0: .8, r1: .12, angles: [-.1, .02, .02, .02] }, head: [1.0, .65, .6],
      extras(p) {
        const frill = new T.Mesh(new T.CircleGeometry(1.35, 24), std(0x9a5a3a, { side: T.DoubleSide })); frill.position.set(.15, .55, 0); frill.rotation.y = PI / 2; frill.rotation.x = 0; p.head.add(frill);
        const hm = std(0xf0e6cc, { roughness: .5 }); for (const [x, y, z, l] of [[.6, .55, .3, 1.1], [.6, .55, -.3, 1.1], [1.55, .2, 0, .45]]) { const h = new T.Mesh(new T.ConeGeometry(.12, l, 8), hm); h.position.set(x, y + l * .3, z); h.rotation.z = -.95; p.head.add(h); }
        const beak = new T.Mesh(new T.ConeGeometry(.25, .5, 8), std(0x3a3020)); beak.position.set(1.85, -.1, 0); beak.rotation.z = -PI / 2; p.head.add(beak);
      } }),
    raja: () => dino({ color: 0xa0603a, belly: 0xd0a070, body: [2.0, 1.0, .85], hip: 2.6, legs: [0, 2.5], legR: .36, biped: true, tilt: -.05,
      neck: { n: 2, len: .55, r0: .65, r1: .5, angles: [.5, -.3] }, tail: { n: 7, len: .8, r0: .7, r1: .06, angles: [.1, -.02, -.02, -.02, -.01, -.01, 0] }, head: [.85, .45, .38],
      extras(p) {
        const horn = new T.Mesh(new T.ConeGeometry(.14, .35, 8), std(0x5a3020)); horn.position.set(.55, .5, 0); p.head.add(horn);
        for (const s of [-1, 1]) { const arm = leg(.4, .07, p.mat, 1); arm.position.set(1.6, -.2, s * .6); arm.rotation.z = .9; p.inner.add(arm); }
        const sm = std(0x6a3a22); for (let i = 0; i < 6; i++) { const st = ell(.08, .5, .6, sm, 8); st.position.set(1.2 - i * .5, .55, 0); st.scale.set(.06, .4, .82); p.inner.add(st); }
      } }),
    mammoth: () => dino({ fur: true, color: 0x6a4630, legColor: 0x553826, body: [2.4, 1.9, 1.6], hip: 3.0, legs: [2.6, 2.4], legR: .48,
      neck: { n: 1, len: .5, r0: 1.1, r1: 1.0, angles: [.35] }, tail: { n: 2, len: .5, r0: .2, r1: .08, angles: [-.8, -.2] }, head: [1.0, 1.15, .95],
      extras(p) {
        p.skull.position.set(.6, .25, 0);
        const hump = ell(1.3, 1.1, 1.1, p.mat); hump.position.set(1.0, 1.3, 0); p.inner.add(hump);
        const trunk = chain(7, .42, .3, .1, p.mat, 1, [-1.2, -.25, -.2, -.2, -.15, .2, .5]); trunk.position.set(1.3, -.3, 0); p.head.add(trunk); p.trunk = trunk;
        const tm = std(0xf2ead8, { roughness: .35 });
        for (const s of [-1, 1]) { const c = new T.CatmullRomCurve3([V3(1.1, -.5, s * .4), V3(1.9, -1.5, s * .7), V3(2.9, -1.2, s * .9), V3(3.2, -.2, s * .6)]); const tusk = new T.Mesh(new T.TubeGeometry(c, 20, .11, 8), tm); p.head.add(tusk); }
        for (const s of [-1, 1]) { const ear = ell(.1, .4, .35, p.mat, 8); ear.position.set(.2, .5, s * .9); p.head.add(ear); }
      } })
  };
  function pteranodon() {
    const g = new T.Group(), m = N.skin(0xb0784a, 'scales'), wm = new T.MeshStandardMaterial({ color: 0x8a5a3a, side: T.DoubleSide, roughness: .8, map: N.skin(0xffffff, 'scales', { repeat: 2 }).map });
    g.add(ell(.7, .25, .25, m));
    const head = new T.Group(); head.position.x = .8; g.add(head);
    head.add(ell(.25, .18, .16, m)); const beak = new T.Mesh(new T.ConeGeometry(.1, 1.3, 8), std(0xd8b070)); beak.rotation.z = -PI / 2; beak.position.x = .8; head.add(beak);
    const crest = new T.Mesh(new T.ConeGeometry(.12, 1.1, 8), m); crest.rotation.z = PI / 2 + .3; crest.position.set(-.5, .15, 0); head.add(crest);
    const wings = [];
    for (const s of [-1, 1]) { const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(.6, 0); sh.lineTo(.1, s * 3.4); sh.lineTo(-.8, 0); const w = new T.Group(), wmesh = new T.Mesh(new T.ShapeGeometry(sh), wm); wmesh.rotation.x = PI / 2; w.add(wmesh); g.add(w); wings.push({ w, s }); }
    g.flap = ph => wings.forEach(({ w, s }) => { w.rotation.x = s * Math.sin(ph) * .5; });
    return g;
  }
  function trilobite() {
    const g = new T.Group(), m = N.skin(0x8a6646, 'scales', { repeat: 2 }); m.roughness = .55;
    const body = new T.Mesh(new T.SphereGeometry(1, 20, 10, 0, TAU, 0, PI / 2), m); body.scale.set(.5, .14, .3); g.add(body);
    const rm = std(0x5a4028); for (let i = 0; i < 7; i++) { const rib = new T.Mesh(new T.TorusGeometry(.26 - Math.abs(i - 3) * .02, .018, 6, 16, PI), rm); rib.position.set(.25 - i * .09, .02, 0); rib.rotation.y = PI / 2; rib.rotation.z = 0; g.add(rib); }
    const head = new T.Mesh(new T.SphereGeometry(1, 16, 8, 0, TAU, 0, PI / 2), m); head.scale.set(.2, .12, .34); head.position.x = .42; g.add(head);
    const em = std(0x2a2a2a, { roughness: .2 }); for (const s of [-1, 1]) { const e = ell(.04, .04, .04, em, 8); e.position.set(.46, .1, s * .12); g.add(e); }
    for (const s of [-1, 1]) { const a = new T.Mesh(new T.CylinderGeometry(.008, .012, .5, 4), rm); a.rotation.z = -PI / 2 + .3; a.rotation.y = s * .4; a.position.set(.75, .03, s * .1); g.add(a); }
    return g;
  }
  function jellyfish(color) {
    const g = new T.Group(), m = new T.MeshStandardMaterial({ color, transparent: true, opacity: .55, emissive: color, emissiveIntensity: .45, side: T.DoubleSide, depthWrite: false });
    const bell = new T.Mesh(new T.SphereGeometry(.6, 24, 12, 0, TAU, 0, PI / 2), m); g.add(bell); g.bell = bell;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, pts = []; for (let j = 0; j <= 10; j++) pts.push(V3(Math.cos(a) * .45 + Math.sin(j * .7) * .05, -j * .18, Math.sin(a) * .45)); g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true, opacity: .6 }))); }
    return g;
  }
  function anomalocaris() {
    const g = new T.Group(), m = N.skin(0xc8603e, 'scales', { repeat: 2 });
    g.add(ell(1, .18, .32, m)); const flaps = [];
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) { const f = new T.Mesh(new T.BoxGeometry(.18, .02, .35), m); f.position.set(.7 - i * .17, 0, s * .45); g.add(f); flaps.push({ f, i, s }); }
    for (const s of [-1, 1]) { const arm = chain(5, .12, .05, .03, m, 1, [-.5, -.4, -.4, -.4, -.4]); arm.position.set(1, -.05, s * .1); g.add(arm); }
    const em = std(0x111111); for (const s of [-1, 1]) { const st = new T.Mesh(new T.CylinderGeometry(.02, .02, .2, 6), m); st.position.set(.85, .15, s * .15); g.add(st); const e = ell(.06, .06, .06, em, 8); e.position.set(.85, .26, s * .15); g.add(e); }
    g.swim = ph => flaps.forEach(({ f, i, s }) => { f.rotation.x = s * Math.sin(ph - i * .6) * .5; });
    return g;
  }
  function dragonfly() {
    const g = new T.Group(), m = std(0x2a6a7a, { metalness: .5, roughness: .3 });
    const body = new T.Mesh(new T.CylinderGeometry(.025, .035, .55, 8), m); body.rotation.z = PI / 2; g.add(body);
    const head = ell(.06, .05, .07, std(0x1a3a4a), 8); head.position.x = .3; g.add(head);
    const wm = new T.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: .45, side: T.DoubleSide, depthWrite: false });
    const wings = [];
    for (const [x, s] of [[.12, 1], [.12, -1], [0, 1], [0, -1]]) { const w = new T.Group(); const p = new T.Mesh(new T.PlaneGeometry(.1, .36), wm); p.rotation.x = -PI / 2; p.position.z = s * .18; w.add(p); w.position.x = x; g.add(w); wings.push({ w, s }); }
    g.flap = ph => wings.forEach(({ w, s }, i) => { w.rotation.x = s * Math.sin(ph + i) * .7; });
    return g;
  }
  // plants (realistic leaf cards from nature.js)
  const fern = (s = 1) => N.plant('fern', { scale: s });
  const cycad = () => N.plant('cycad', { scale: .9 + Math.random() * .5 });
  const conifer = (h = 14, tint) => N.plant('conifer', { scale: h / 17, tint });
  const araucaria = (h = 22) => N.plant('araucaria', { scale: h / 22 });
  const lycopod = (h = 22) => N.plant('lycopod', { scale: h / 23 });
  const treeFern = (h = 6) => N.plant('treefern', { scale: h / 5.5 });

  /* ================================================================ shared scene helpers */
  function groundScene(o) {
    const s = new T.Scene(); s.ticks = [];
    if (o.under) {   // under the sea: no sky, blue murk
      s.background = new T.Color(o.sky); s.fog = new T.FogExp2(o.sky, o.density ?? .045);
      s.hemi = new T.HemisphereLight(o.skyLight ?? 0xeaf4ff, o.groundLight ?? 0x3a4a2a, o.hemiI ?? .7); s.add(s.hemi);
      s.sl = new T.DirectionalLight(o.sunColor ?? 0xfff2dc, o.sunI ?? 1.3); s.sl.position.set(20, 80, 10); s.sl.castShadow = true; s.sl.shadow.mapSize.set(2048, 2048);
      const c = s.sl.shadow.camera; c.left = c.bottom = -40; c.right = c.top = 40; c.far = 300; s.add(s.sl); s.add(s.sl.target);
    } else { N.outdoor(s, o); s.ticks.push(dt => s.sky.tick(dt)); }
    s.ground = E3.terrain({ size: 900, seg: 220, amp: o.amp ?? 8, freq: .006, seed: o.seed ?? 5, flat: [[0, 0, o.flat ?? 60]] });
    const base = s.ground.height, shape = o.shape;
    if (shape) { const p = s.ground.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + shape(p.getX(i), p.getZ(i), base)); s.ground.geometry.computeVertexNormals(); }
    s.h = shape ? (x, z) => base(x, z) + shape(x, z, base) : base;
    N.paintGround(s.ground, o.paint, o.texA ?? 'grass', o.texB ?? 'rock', { repeat: o.repeat ?? 120 });
    s.add(s.ground);
    return s;
  }
  // many small plants on the ground at once, kept off the spots where 'skip' says no
  const cover = (s, kind, n, x0, x1, z0, z1, o = {}) => { const m = N.scatter(kind, n, r => { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); if (o.skip && o.skip(x, z)) return null; return [x, s.h(x, z), z]; }, o); s.add(m); s.ticks.push(m.tick); return m; };
  const at = (s, obj, x, z, y = 0) => { obj.position.set(x, s.h(x, z) + y, z); s.add(obj); return obj; };
  function volcano(r, h, lava = true) {
    const g = new T.Group(), pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(new T.Vector2(r * (1 - u * .85), h * Math.pow(u, .8))); }
    g.add(new T.Mesh(new T.LatheGeometry(pts, 40), N.rockMat(0x4a3c34, { repeat: 6, bump: .06 })));
    if (lava) { const l = new T.Mesh(new T.CircleGeometry(r * .14, 24), new T.MeshBasicMaterial({ color: 0xff6a20 })); l.rotation.x = -PI / 2; l.position.y = h * .99; g.add(l); const gl = E3.glow(0xff6a20, r * 1.2, .7); gl.material.fog = false; gl.position.y = h; g.add(gl); }
    return g;
  }
  // lava planet and snowball planet maps, drawn from noise
  function noiseTex(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) { const la = (.5 - (y + .5) / h) * PI; for (let x = 0; x < w; x++) { const lo = (x + .5) / w * TAU; const px = Math.cos(la) * Math.cos(lo), py = Math.sin(la), pz = Math.cos(la) * Math.sin(lo); const col = fn(px, py, pz, la); const o = (y * w + x) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; } }
    g.putImageData(img, 0, 0); const t = new T.CanvasTexture(c); t.anisotropy = 8; return t;
  }
  const lavaTex = () => noiseTex(512, 256, (x, y, z) => { const n = fbm(x * 4, y * 4, z * 4, 5), r = Math.abs(n - .5); const glow = Math.max(0, 1 - r / .045); const crust = mix([40, 26, 20], [70, 46, 34], fbm(x * 9, y * 9, z * 9, 3)); return mix(crust, [255, 120 + glow * 90, 30], glow); });
  const iceTex = () => noiseTex(900, 450, (x, y, z, la) => {
    const n = fbm(x * 3, y * 3, z * 3, 5), ridge = 1 - Math.abs(fbm(x * 7 + 5, y * 7, z * 7, 4) * 2 - 1);
    let c = mix([192, 210, 230], [246, 250, 255], n);
    c = mix(c, [128, 160, 196], smooth(.86, .97, ridge) * .65);              // blue cracks in the ice
    const eq = smooth(.34, .04, Math.abs(la)), open = eq * smooth(.5, .64, fbm(x * 9 + 3, y * 9, z * 9, 4));
    c = mix(c, [34, 62, 92], open * .85);                                    // thin ice and slushy sea near the equator
    if (fbm(x * 10 + 9, y * 10, z * 10, 3) > .73) c = mix(c, [92, 84, 78], .65);   // mountain tops poking through
    return c;
  });
  // Pangaea from the real satellite map: each continent is cut out of today's Earth and turned back to where it was.
  // The turns were fitted so the coasts match: Brazil tucks into the Gulf of Guinea, Nova Scotia sits against Morocco,
  // India's west coast against Madagascar, Australia against Antarctica. (Rough, but the shapes are the real ones.)
  const PLATES = [   // name, a rough outline that separates it from its neighbours (lon, lat), turn to its Pangaea place (quaternion), label point
    ['Africa', [[-20, 36], [-6, 36.5], [10, 38], [33, 32], [35, 36], [44, 38], [48, 30], [57, 27], [60, 22], [60, 12], [52, -5], [52, -28], [30, -38], [15, -36], [-20, 10]], [0.0, 0.0, 0.0, 1.0], [18, 5]],
    ['South America', [[-82, 13], [-77, 7.5], [-60, 12], [-50, 5], [-33, -5], [-38, -25], [-62, -57], [-78, -57], [-84, -5]], [0.30591, 0.339, 0.15956, 0.87524], [-58, -12]],
    ['North America', [[-170, 72], [-140, 75], [-95, 84], [-10, 84], [-10, 72], [-40, 58], [-52, 47], [-66, 40], [-77, 25], [-80, 9], [-77, 7], [-92, 13], [-118, 28], [-130, 45], [-170, 52]], [0.18451, 0.55163, 0.01452, 0.81329], [-100, 45]],
    ['India', [[61, 25], [67, 33], [75, 37], [80, 32], [88, 28], [97, 28], [92, 20], [82, 4], [75, 5], [66, 22]], [-0.31178, -0.18895, 0.04981, 0.92984], [78, 21]],
    ['Antarctica', [[-180, -60], [180, -60], [180, -90], [-180, -90]], [0.33457, -0.04515, 0.18555, 0.92282], [40, -78]],
    ['Australia', [[112, -8], [155, -1], [156, -12], [155, -30], [150, -45], [112, -38]], [0.1156, -0.17559, 0.2871, 0.93455], [134, -25]],
    ['Europe and Asia', [[-30, 72], [-25, 84], [180, 84], [180, -12], [120, -12], [100, -8], [92, 20], [97, 28], [88, 28], [80, 32], [75, 37], [67, 33], [61, 25], [57, 27], [48, 30], [44, 38], [35, 36], [33, 32], [10, 38], [-6, 36.5], [-12, 36], [-30, 45]], [0.10841, 0.1045, 0.00392, 0.98859], [80, 52]]
  ];
  function inPoly(lo, la, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) c = !c; } return c; }
  function pixelsOf(t, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(t.image, 0, 0, w, h); return g.getImageData(0, 0, w, h).data; }
  const plateQ = k => new T.Quaternion(...PLATES[k][2]);
  // builds the colour, bump and shine maps; calls done({ map, bump, spec }) when ready
  function buildPangaea(done) {
    const day = E3.tex('earth_day'), spec = E3.tex('earth_spec'), bump = E3.tex('earth_bump');
    Promise.all([day.ready, spec.ready, bump.ready]).then(() => {
      if (!day.image || !spec.image) return;
      const sw = 2048, sh = 1024, D = pixelsOf(day, sw, sh), Sp = pixelsOf(spec, sw, sh), Bp = bump.image ? pixelsOf(bump, sw, sh) : null;
      // which plate each spot of today's map belongs to (a coarse grid is plenty)
      const CW = 512, CH = 256, plate = new Int8Array(CW * CH).fill(-1);
      for (let y = 0; y < CH; y++) { const la = 90 - (y + .5) / CH * 180; for (let x = 0; x < CW; x++) { const lo = (x + .5) / CW * 360 - 180; for (let k = 0; k < PLATES.length; k++) if (inPoly(lo, la, PLATES[k][1])) { plate[y * CW + x] = k; break; } } }
      // the sea is bright on the shine map; check which way round this one is
      let seaBright = 0; for (const [lo, la] of [[-150, 0], [-30, -30], [80, -30], [-140, 30]]) { const x = Math.floor((lo + 180) / 360 * sw), y = Math.floor((90 - la) / 180 * sh); seaBright += Sp[(y * sw + x) * 4] > 128 ? 1 : -1; }
      const isLand = o => seaBright > 0 ? Sp[o * 4] < 110 : Sp[o * 4] > 145;
      const inv = PLATES.map((_, k) => new T.Matrix4().makeRotationFromQuaternion(plateQ(k).invert()).elements);
      const W = 2048, H = 1024, out = new Uint8ClampedArray(W * H * 4), bo = new Uint8ClampedArray(W * H * 4), so = new Uint8ClampedArray(W * H * 4), land = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) {
        const la = (90 - (y + .5) / H * 180) * PI / 180, cy = Math.cos(la), py = Math.sin(la);
        for (let x = 0; x < W; x++) {
          const lo = ((x + .5) / W * 360 - 180) * PI / 180, px = cy * Math.cos(lo), pz = -cy * Math.sin(lo), o = (y * W + x) * 4;
          let hit = -1;
          for (let k = 0; k < PLATES.length && hit < 0; k++) {
            const e = inv[k], qx = e[0] * px + e[4] * py + e[8] * pz, qy = e[1] * px + e[5] * py + e[9] * pz, qz = e[2] * px + e[6] * py + e[10] * pz;
            const tla = Math.asin(Math.max(-1, Math.min(1, qy))), tlo = Math.atan2(-qz, qx);
            const sx = Math.min(sw - 1, Math.floor((tlo / PI * .5 + .5) * sw)), sy = Math.min(sh - 1, Math.floor((.5 - tla / PI) * sh)), so2 = sy * sw + sx;
            if (!isLand(so2)) continue;
            const cx2 = Math.min(CW - 1, sx * CW / sw | 0), cy2 = Math.min(CH - 1, sy * CH / sh | 0);
            if (plate[cy2 * CW + cx2] === k) hit = so2;
          }
          if (hit >= 0) { out[o] = D[hit * 4]; out[o + 1] = D[hit * 4 + 1]; out[o + 2] = D[hit * 4 + 2]; const b = Bp ? Bp[hit * 4] : 128; bo[o] = bo[o + 1] = bo[o + 2] = b; land[o + 3] = 255; }
          else { so[o] = so[o + 1] = so[o + 2] = 255; }
          out[o + 3] = bo[o + 3] = so[o + 3] = 255;
        }
      }
      // the sea: deep blue, lighter over the shallow edges of the land
      const toCanvas = (arr, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(new ImageData(arr, w, h), 0, 0); return c; };
      const mask = toCanvas(land, W, H), small = document.createElement('canvas'); small.width = 160; small.height = 80; small.getContext('2d').drawImage(mask, 0, 0, 160, 80);
      const big = document.createElement('canvas'); big.width = W; big.height = H; const bg = big.getContext('2d'); bg.imageSmoothingQuality = 'high'; bg.drawImage(small, 0, 0, W, H);
      const glow = bg.getImageData(0, 0, W, H).data;
      for (let i = 0; i < W * H; i++) if (!land[i * 4 + 3]) { const k = smooth(.0, .45, glow[i * 4 + 3] / 255), n = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * 6; out[i * 4] = lerp(10, 40, k) + n; out[i * 4 + 1] = lerp(30, 96, k) + n; out[i * 4 + 2] = lerp(66, 128, k) + n; }
      const tx = c => { const t = new T.CanvasTexture(c); t.anisotropy = 8; return t; };
      done({ map: tx(toCanvas(out, W, H)), bump: tx(toCanvas(bo, W, H)), spec: tx(toCanvas(so, W, H)) });
    });
  }

  /* ================================================================ the eras */
  const ERAS = [
    { id: 'disk', name: 'Birth of the planets', ago: 4.6e9, line: 'h_disk' },
    { id: 'moon', name: 'The Moon is born', ago: 4.5e9, line: 'h_moon' },
    { id: 'oceans', name: 'First oceans and life', ago: 3.8e9, line: 'h_oceans' },
    { id: 'snowball', name: 'Snowball Earth', ago: 7e8, line: 'h_snowball' },
    { id: 'cambrian', name: 'Sea creatures', ago: 5.4e8, line: 'h_cambrian' },
    { id: 'forest', name: 'Giant forests', ago: 3e8, line: 'h_forest' },
    { id: 'pangaea', name: 'Pangaea', ago: 2.5e8, line: 'h_pangaea' },
    { id: 'dinos', name: 'Dinosaurs', ago: 1.5e8, line: 'h_dinos' },
    { id: 'impact', name: 'The asteroid', ago: 6.6e7, line: 'h_asteroid' },
    { id: 'iceage', name: 'Ice Age', ago: 2e4, line: 'h_iceage' },
    { id: 'today', name: 'Today', ago: 0, line: 'h_today' }
  ];
  const AGE = 4.6e9;
  function agoText(y) {
    if (y === 0) return 'Today';
    if (y >= 1e9) return `${(y / 1e9).toFixed(1)} billion years ago`;
    if (y >= 1e6) return `${Math.round(y / 1e6)} million years ago`;
    return `${Math.round(y).toLocaleString('en-IN')} years ago`;
  }
  // Earth's whole story squeezed into one day: midnight was the birth of the planets
  function clockText(y) {
    const secs = (1 - y / AGE) * 86400, h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), s = Math.floor(secs % 60);
    if (y === 0) return 'midnight';
    const hh = ((h + 11) % 12) + 1, ap = h < 12 ? 'AM' : 'PM';
    return h === 23 && m === 59 ? `11:59 and ${s} seconds PM` : `${hh}:${String(m).padStart(2, '0')} ${ap}`;
  }
  const S = {}, B = {};   // scene objects per era, built when first visited

  B.disk = () => {
    const s = new T.Scene(); s.add(E3.starfield(9000));
    const sun = E3.planet('sun', 4, { seg: 64 }); s.add(sun); s.add(new T.PointLight(0xffd8a0, 1.8, 0, 0));
    const halo = E3.glow(0xff9a40, 60, .6); s.add(halo);
    const N = 9000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), rad = new Float32Array(N), ang = new Float32Array(N), hgt = new Float32Array(N);
    for (let i = 0; i < N; i++) { rad[i] = 8 + Math.pow(Math.random(), .7) * 70; ang[i] = Math.random() * TAU; hgt[i] = (Math.random() - .5) * rad[i] * .06; const w = Math.random(); const c = new T.Color().setHSL(.07 + w * .05, .5, .35 + 40 / rad[i] * .4); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    const dot = E3.canvasTex(32, 32, (c, w) => { const r = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, '#fff'); r.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = r; c.fillRect(0, 0, w, w); });
    const disk = new T.Points(g, new T.PointsMaterial({ size: .9, vertexColors: true, map: dot, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); s.add(disk);
    const rock = std(0x8a7060, { roughness: 1 }), clumps = [];
    [[14, .3], [20, 2.1], [27, 4.2], [36, 1.2], [50, 3.3], [62, 5.4]].forEach(([r, a], i) => { const m = new T.Mesh(new T.DodecahedronGeometry(1, 2), rock); m.userData = { r, a, max: i === 2 ? 2.2 : [1, 1.6, 2.2, 1.4, 3.2, 2.8][i] }; s.add(m); clumps.push(m); });
    return { s, rad, ang, hgt, pos, g, clumps, halo, spots: [] };
  };
  B.moon = () => {
    const s = new T.Scene(); s.add(E3.starfield(9000)); s.add(new T.AmbientLight(0xffffff, .2));
    const sl = new T.DirectionalLight(0xffffff, 1.2); sl.position.set(-60, 30, 50); s.add(sl);
    const earth = new T.Mesh(new T.SphereGeometry(8, 96, 48), new T.MeshStandardMaterial({ map: lavaTex(), emissive: 0xff5a10, emissiveMap: null, emissiveIntensity: .25, roughness: .9 }));
    earth.material.emissiveMap = earth.material.map; s.add(earth);
    const eglow = E3.glow(0xff7a30, 30, .5); s.add(eglow);
    const theia = new T.Mesh(new T.SphereGeometry(4.2, 64, 32), std(0x8a5a48, { roughness: 1 })); s.add(theia);
    const flash = E3.glow(0xfff2c0, 80, 0); s.add(flash);
    const debris = makeParticles(2500, 0xffa060, .9, true); s.add(debris);
    const moon = E3.planet('moon', 2.2, { seg: 64 }); s.add(moon); E3.lightDir(moon, V3(-1, .4, .8).normalize());
    return { s, earth, theia, flash, debris, moon };
  };
  B.oceans = () => {
    const shore = z => smooth(-30, 14, z) * 6 - 3.5;
    const s = groundScene({ top: 0x8a4a30, horizon: 0xe8a070, sunColor: 0xffc890, sun: V3(-.4, .25, -.9), clouds: .55, cloudColor: 0xe0a882, cloudShade: 0x6a4434,
      sunLight: 0xffc89a, sunI: 1.15, hemiI: .4, skyLight: 0xffc8a0, groundLight: 0x3a2a24, near: 70, far: 420, amp: 6, seed: 81, shadowSpan: 50, shadowAt: V3(0, 0, -15),
      shape: (x, z) => shore(z), texA: 'sand', texB: 'rock',
      paint: (x, y, z, sl, n, n2) => { const c = N.mixc(N.rgb(0x6a5a4c), N.rgb(0x2e2824), N.sm(-1.2, 1.5, y + (n - .5) * 2)); return [...N.mixc(c, N.rgb(0x48403a), n2 * .4), N.sm(-1, 1.2, y) * .8 + sl]; } });
    const sea = N.water(2400, 2400, { color: 0x2c4a40, env: 1, wave: .35, rough: .14 }); sea.position.y = -.6; s.add(sea); s.ticks.push(sea.tick);
    for (const [x, z, r, h] of [[-160, -320, 60, 70], [120, -380, 50, 58], [260, -260, 40, 40]]) { const v = volcano(r, h); v.position.set(x, -2, z); s.add(v); }
    const smoke = makeParticles(800, 0x5a4a44, 22, false); smoke.material.opacity = .5; s.add(smoke);
    const moon = E3.planet('moon', 34, { seg: 64 }); moon.position.set(140, 160, -700); moon.traverse(m => { if (m.material) m.material.fog = false; }); s.add(moon); E3.lightDir(moon, V3(-.5, .2, 1).normalize());
    const lm = N.rockMat(0x9a8a6a, { repeat: 1, bump: .08 }), slime = N.rockMat(0x4e6a3a, { repeat: 1, bump: .05 });
    const stromas = new T.Group();
    for (let i = 0; i < 16; i++) { const r = .6 + Math.random() * 1.1, m = new T.Mesh(new T.CylinderGeometry(r, r * 1.15, r * 1.2, 20), lm); const top = ell(r, r * .45, r, slime, 18); top.position.y = r * .6; m.add(top); m.position.set(-8 + (i % 8) * 2.6 + Math.random(), -.25 + r * .4, -16 - Math.floor(i / 8) * 4 - Math.random() * 2); m.castShadow = true; m.receiveShadow = true; stromas.add(m); }
    s.add(stromas);
    const rain = makeParticles(2500, 0xc8d4e4, .3, false); s.add(rain);
    return { s, smoke, rain, stromas, spots: [{ obj: stromas, at: V3(-2, 1, -18), line: 'h_stromatolite', name: 'Stromatolites' }] };
  };
  B.snowball = () => {
    const s = new T.Scene(); s.add(E3.starfield(9000)); s.add(new T.AmbientLight(0xffffff, .12));
    const sl = new T.DirectionalLight(0xffffff, 1.5); sl.position.set(-60, 20, 50); s.add(sl);
    const p = new T.Group(); s.add(p);
    const it = iceTex(), ball = new T.Mesh(new T.SphereGeometry(10, 128, 64), new T.MeshStandardMaterial({ map: it, bumpMap: it, bumpScale: .05, roughness: .42, metalness: .02 })); p.add(ball);
    const clouds = new T.Mesh(new T.SphereGeometry(10.12, 96, 48), new T.MeshStandardMaterial({ color: 0xffffff, alphaMap: E3.tex('earth_clouds'), transparent: true, opacity: .55, depthWrite: false })); clouds.rotation.y = 2; p.add(clouds); p.clouds = clouds;
    p.add(E3.atmosphere(10, 0xcfe8ff, .9, 1.03));
    for (let i = 0; i < 6; i++) { const v = E3.latLonToVec((Math.random() - .5) * 120, Math.random() * 360, 10.05), gl = E3.glow(0xff7a30, 1.6, .9); gl.position.copy(v); p.add(gl); }
    return { s, p };
  };
  B.cambrian = () => {
    const s = groundScene({ under: true, sky: 0x0b4e74, density: .045, amp: 4, seed: 91, hemiI: .8, skyLight: 0x8ad8ff, groundLight: 0x1a4a5a, sunColor: 0xbfefff, sunI: .9, texA: 'sand', texB: 'mud', repeat: 160,
      paint: (x, y, z, sl, n, n2) => [...N.mixc(N.rgb(0xd0c49a), N.rgb(0x9a8e70), n2), N.sm(.45, .7, n)] });
    // sunlight rippling on the sea floor
    const caus = N.texOf(N.paint(256, 256, (() => { const f = N.tileFbm(4, 4, 9), g2 = N.tileFbm(4, 4, 19); return (u, v) => { const a = 1 - Math.abs(f(u, v) * 2 - 1), b = 1 - Math.abs(g2(u, v) * 2 - 1), k = Math.pow(a, 9) + Math.pow(b, 9) * .7; return [k * 200, k * 240, k * 255]; }; })()));
    caus.repeat.set(70, 70);
    const cm = new T.Mesh(s.ground.geometry, new T.MeshBasicMaterial({ map: caus, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    s.add(cm); s.ticks.push(dt => { caus.offset.x += dt * .02; caus.offset.y += dt * .013; caus.rotation += dt * .002; });
    for (let i = 0; i < 14; i++) { const ray = E3.glow(0x9fe8ff, 30, .12); ray.scale.set(4, 40, 1); ray.position.set((Math.random() - .5) * 60, 14, -Math.random() * 50); s.add(ray); }
    const tris = [], jellies = [];
    for (let i = 0; i < 12; i++) { const tb = trilobite(); tb.scale.setScalar(1.3 + Math.random() * .6); const x = (Math.random() - .5) * 18, z = -3 - Math.random() * 16; at(s, tb, x, z, .02); tb.rotation.y = Math.random() * TAU; tb.userData.v = .2 + Math.random() * .3; tris.push(tb); }
    for (let i = 0; i < 7; i++) { const j = jellyfish([0xc8a0ff, 0x9ad8ff, 0xffa8d8][i % 3]); j.position.set((Math.random() - .5) * 24, 3 + Math.random() * 6, -6 - Math.random() * 18); j.userData.ph = Math.random() * TAU; s.add(j); jellies.push(j); }
    // sponges: vase shapes with little holes
    const spongeM = N.skin(0xffb070, 'scales', { repeat: 2, bump: .06 }); spongeM.side = T.DoubleSide; spongeM.roughness = .95; spongeM.emissive.set(0x3a1e0a);
    for (let i = 0; i < 22; i++) { const h = .8 + Math.random() * 1.4, pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(new T.Vector2(.12 + .2 * Math.pow(u, .7) + Math.sin(u * 6) * .02, u * h)); } const sp = new T.Mesh(new T.LatheGeometry(pts, 16), spongeM); sp.castShadow = true; const x = (Math.random() - .5) * 30, z = -4 - Math.random() * 26; at(s, sp, x, z, -.05); }
    cover(s, 'fern', 260, -40, 40, -60, 0, { tint: 0xc09060, size: .6, seed: 4, hue: .1 });
    const ano = anomalocaris(); ano.scale.setScalar(1.6); s.add(ano);
    const bubbles = makeParticles(300, 0xdff6ff, .25, true); s.add(bubbles);
    return { s, tris, jellies, ano, bubbles, spots: [{ obj: tris[0], line: 'h_trilobite', name: 'Trilobite' }] };
  };
  B.forest = () => {
    const s = groundScene({ top: 0x5f8aa0, horizon: 0xc0ccb4, sun: V3(.3, .55, -.8), sunColor: 0xfff0c8, clouds: .6, cloudShade: 0x8a9488, near: 15, far: 200, hemiI: .45, skyLight: 0xd8f0c8, groundLight: 0x2a3420,
      amp: 3, seed: 95, shadowSpan: 60, shadowAt: V3(0, 0, -25), texA: 'mud', texB: 'grass',
      paint: (x, y, z, sl, n, n2) => [...N.mixc(N.rgb(0x5a5038), N.rgb(0x4a6a2a), N.sm(.4, .7, n2)), N.sm(.4, .65, n2 + (y + 1) * .1)] });
    const swamp = N.water(900, 900, { color: 0x24321e, env: 1.4, wave: .3 }); swamp.position.y = -.9; s.add(swamp); s.ticks.push(swamp.tick);
    for (let i = 0; i < 80; i++) { const x = (Math.random() - .5) * 220, z = -12 - Math.random() * 180; if (Math.abs(x) < 6 && z > -20) continue; at(s, Math.random() < .55 ? lycopod(16 + Math.random() * 14) : treeFern(4 + Math.random() * 4), x, z); }
    cover(s, 'fern', 450, -50, 50, -70, 4, { size: .9, seed: 7 });
    cover(s, 'horsetail', 300, -60, 60, -80, -6, { size: .8, seed: 8, hue: .22 });
    const flies = []; for (let i = 0; i < 6; i++) { const d = dragonfly(); d.scale.setScalar(2.2); d.userData = { r: 4 + Math.random() * 6, y: 2 + Math.random() * 3, ph: Math.random() * TAU, c: V3((Math.random() - .5) * 10, 0, -6 - Math.random() * 10) }; s.add(d); flies.push(d); }
    return { s, flies };
  };
  B.pangaea = () => {
    const s = new T.Scene(); s.add(E3.starfield(9000)); s.add(new T.AmbientLight(0xffffff, .25));
    const sl = new T.DirectionalLight(0xffffff, 1.3); sl.position.set(-40, 30, 60); s.add(sl);
    const g = new T.Group(); s.add(g);
    const old = new T.Mesh(new T.SphereGeometry(10, 128, 64), new T.MeshPhongMaterial({ color: 0x1a3a66, transparent: true, specular: 0x2a3a4a, shininess: 22 })); g.add(old);
    buildPangaea(t => { const m = old.material; m.color.set(0xffffff); m.map = t.map; m.bumpMap = t.bump; m.bumpScale = .06; m.specularMap = t.spec; m.needsUpdate = true; window.__pangaea = t; });
    const pc = new T.Mesh(new T.SphereGeometry(10.1, 96, 48), new T.MeshStandardMaterial({ color: 0xffffff, alphaMap: E3.tex('earth_clouds'), transparent: true, opacity: .45, depthWrite: false })); pc.rotation.y = 1.3; g.add(pc);
    const now = E3.planet('earth', 9.98, { seg: 128, noTilt: true }); g.add(now); now.visible = false;
    s.add(E3.atmosphere(10, 0x5aa0ff, 1, 1.035));
    return { s, g, old, now, pc, mix: 0, toNow: false };
  };
  B.dinos = () => {
    const rd = (x, z) => Math.abs(-.921 * (x - 30) + .389 * (z + 40));   // distance from the river
    const s = groundScene({ top: 0x2f6cc4, horizon: 0xbcd4e8, sun: V3(.45, .62, .5), clouds: .42, near: 120, far: 620, hemiI: .38, groundLight: 0x4a4a32, amp: 10, seed: 101,
      shadowSpan: 75, shadowAt: V3(0, 0, -30), texA: 'grass', texB: 'rock',
      shape: (x, z, base) => N.sm(20, 9, rd(x, z)) * (-base(x, z) - 1.6),
      paint: (x, y, z, sl, n, n2) => { let c = N.mixc(N.rgb(0x5e7a3c), N.rgb(0x3e5626), n2); c = N.mixc(c, N.rgb(0x7a6a4a), N.sm(.58, .78, n) * .7); c = N.mixc(c, N.rgb(0x4a4232), N.sm(15, 9, rd(x, z))); return [...c, N.sm(.2, .42, sl + (n2 - .5) * .2) + N.sm(13, 9, rd(x, z)) * .6]; } });
    const river = N.water(40, 1000, { color: 0x1a3c4a, env: 1.1, wave: .22, rough: .1, flowY: -.05, flowX: 0 }); river.rotation.z = .4; river.position.set(30, -.45, -40); s.add(river); s.ticks.push(river.tick);
    s.dataRiver = rd;
    for (let i = 0; i < 70; i++) { const x = (Math.random() - .5) * 320, z = -30 - Math.random() * 260; if (rd(x, z) < 16) continue; const k = Math.random(); at(s, k < .4 ? araucaria(18 + Math.random() * 12) : k < .7 ? conifer(12 + Math.random() * 10) : k < .85 ? cycad() : treeFern(4 + Math.random() * 3), x, z); }
    for (let i = 0; i < 26; i++) { const x = (Math.random() - .5) * 120, z = -10 - Math.random() * 70; if (rd(x, z) < 14 || Math.hypot(x, z + 30) < 14) continue; at(s, Math.random() < .5 ? cycad() : fern(1.2 + Math.random()), x, z); }
    const skip = (x, z) => rd(x, z) < 11;
    cover(s, 'fern', 1100, -90, 90, -110, 6, { size: .75, seed: 3, skip });
    cover(s, 'horsetail', 500, -90, 90, -110, 6, { size: .9, seed: 5, skip, hue: .21 });
    const v = volcano(70, 80, true); v.position.set(-180, -2, -420); s.add(v);
    const cast = [
      { k: 'brachio', x: -22, z: -48, r: 0, v: .6, line: 'd_brachio', name: 'Brachiosaurus' },
      { k: 'stego', x: 12, z: -20, r: 9, v: .5, line: 'd_stego', name: 'Stegosaurus' },
      { k: 'trex', x: 30, z: -46, r: 16, v: .9, line: 'd_trex', name: 'T. rex' },
      { k: 'trike', x: -6, z: -28, r: 7, v: .5, line: 'd_trike', name: 'Triceratops' },
      { k: 'raja', x: -30, z: -18, r: 8, v: .8, line: 'd_raja', name: 'Rajasaurus (India!)' }
    ].map(c => { const d = SPECIES[c.k](); d.userData = { ...c, a: Math.random() * TAU, ph: 0 }; at(s, d, c.x, c.z); return d; });
    const pteros = []; for (let i = 0; i < 3; i++) { const p = pteranodon(); p.scale.setScalar(1.4); p.userData = { r: 30 + i * 12, y: 28 + i * 6, a: i * 2, ph: i }; s.add(p); pteros.push(p); }
    const embers = makeParticles(1500, 0xff8a30, .9, true); s.add(embers);
    return { s, cast, pteros, embers, spots: cast.map(d => ({ obj: d, line: d.userData.line, name: d.userData.name, up: d.userData.k === 'brachio' ? 12 : 5 })).concat([{ obj: pteros[0], line: 'd_ptero', name: 'Pteranodon', up: 1 }]) };
  };
  B.impact = () => {
    const s = new T.Scene(); s.add(E3.starfield(9000)); s.add(new T.AmbientLight(0xffffff, .12));
    const sun = V3(-.6, .35, .72).normalize(), sl = new T.DirectionalLight(0xffffff, 1.4); sl.position.copy(sun).multiplyScalar(100); s.add(sl);
    const earth = E3.planet('earth', 10, { seg: 128, noTilt: true }); s.add(earth); E3.lightDir(earth, sun);
    const site = E3.latLonToVec(21.3, -89.5, 10.02);
    const rock = new T.Mesh(new T.DodecahedronGeometry(.9, 1), std(0x5a4e46, { roughness: 1 })); s.add(rock);
    const trail = makeParticles(1200, 0xffa040, 1.2, true); s.add(trail);
    const flash = E3.glow(0xfff6d0, 40, 0); s.add(flash);
    const ring = new T.Mesh(new T.TorusGeometry(1, .12, 8, 64), new T.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0 })); s.add(ring);
    const dust = new T.Mesh(new T.SphereGeometry(10.25, 128, 64), new T.ShaderMaterial({ transparent: true, depthWrite: false,
      uniforms: { site: { value: site.clone().normalize() }, spread: { value: 0 }, sunDir: { value: sun }, opacity: { value: 0 }, time: { value: 0 } },
      vertexShader: 'varying vec3 vN, vW; void main(){ vN = normalize(position); vW = normalize((modelMatrix * vec4(position, 0.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 site, sunDir; uniform float spread, opacity, time; varying vec3 vN, vW;
        float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
        float fb(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n3(p); p = p * 2.1 + 3.1; a *= 0.5; } return s; }
        void main(){
          float ang = acos(clamp(dot(vN, site), -1.0, 1.0)) / 3.14159;
          float swirl = fb(vN * 4.0 + vec3(time * 0.05, 0.0, time * 0.03));
          float edge = spread + (swirl - 0.5) * 0.25;
          float a = (1.0 - smoothstep(edge - 0.12, edge, ang)) * (0.55 + swirl * 0.6);
          float lit = clamp(dot(vW, sunDir) * 0.8 + 0.25, 0.08, 1.0);
          vec3 col = mix(vec3(0.20, 0.15, 0.12), vec3(0.52, 0.40, 0.30), swirl) * lit;
          col += vec3(1.0, 0.35, 0.08) * (1.0 - smoothstep(0.0, 0.06, ang)) * (1.0 - spread * 0.5);   // the glowing crater
          gl_FragColor = vec4(col, clamp(a, 0.0, 0.95) * opacity);
        }` })); s.add(dust);
    return { s, earth, site, rock, trail, flash, ring, dust, sun };
  };
  B.iceage = () => {
    const s = groundScene({ top: 0x6e9cd0, horizon: 0xdce6ee, sun: V3(.55, .3, -.75), sunColor: 0xfff4e4, clouds: .55, cloudShade: 0x9aa4b4, near: 60, far: 700, hemiI: .5, skyLight: 0xe4eeff, groundLight: 0x8a96a6,
      amp: 9, seed: 111, shadowSpan: 60, shadowAt: V3(0, 0, -25), texA: 'snow', texB: 'rock',
      shape: (x, z) => N.sm(-160, -430, z) * (60 + 70 * (noise3(x * .012, 0, 1.3) - .3)),
      paint: (x, y, z, sl, n, n2) => [...N.mixc(N.rgb(0xf2f6fa), N.rgb(0xc8d6e6), n2 * .8), N.sm(.32, .55, sl + (n - .5) * .25)] });
    for (let i = 0; i < 34; i++) { const x = (Math.random() - .5) * 260, z = -40 - Math.random() * 200; at(s, conifer(8 + Math.random() * 8, 0xa8b8b0), x, z); }
    cover(s, 'grass', 900, -70, 70, -90, 6, { size: .8, seed: 12, tint: 0xffb878, hue: .1, skip: (x, z) => noise3(x * .05, z * .05, 2) < .45 });
    const herd = []; for (let i = 0; i < 3; i++) { const m = SPECIES.mammoth(); m.userData = { x: -20 + i * 9, z: -24 - i * 6, a: i, v: .35 }; m.scale.setScalar(1 - i * .12); at(s, m, m.userData.x, m.userData.z); herd.push(m); }
    const snow = makeParticles(2500, 0xffffff, .35, false); s.add(snow);
    return { s, herd, snow, spots: [{ obj: herd[0], line: 'h_mammoth', name: 'Woolly mammoth', up: 6 }] };
  };
  B.today = () => {
    const s = new T.Scene(); s.add(E3.starfield(9000)); s.add(new T.AmbientLight(0xffffff, .1));
    const earth = E3.planet('earth', 10, { seg: 160, noTilt: true }); s.add(earth);
    const iss = E3.MODELS.iss(); iss.scale.setScalar(.04); s.add(iss);
    return { s, earth, iss };
  };

  /* ================================================================ the time machine */
  let cur = 0, et = 0, said = new Set(), phase2 = false;
  function views3(id) {
    // where the camera looks for each era
    const V = {
      disk: { goal: V3(), dist: 120, pitch: .75, yaw: .3, min: 20, max: 260 },
      moon: { goal: V3(6, 0, 0), dist: 60, pitch: .25, yaw: .5, min: 18, max: 140 },
      oceans: { goal: V3(0, 4, -6), dist: 14, pitch: .06, yaw: 0, min: 4, max: 40, minPitch: -.5, maxPitch: .8 },
      snowball: { goal: V3(), dist: 34, pitch: .3, yaw: .6, min: 12, max: 90 },
      cambrian: { goal: V3(0, 2.2, -8), dist: 9, pitch: .1, yaw: 0, min: 3, max: 20, minPitch: -.4, maxPitch: .8 },
      forest: { goal: V3(0, 5, -6), dist: 12, pitch: .05, yaw: 0, min: 4, max: 30, minPitch: -.5, maxPitch: .9 },
      pangaea: { goal: V3(), dist: 30, pitch: .15, yaw: -.2, min: 11, max: 80 },
      dinos: { goal: V3(0, 6, -20), dist: 36, pitch: .12, yaw: 0, min: 8, max: 90, minPitch: -.3, maxPitch: .9 },
      impact: { goal: V3(), dist: 38, pitch: .3, yaw: -.35, min: 12, max: 100 },
      iceage: { goal: V3(0, 4, -18), dist: 24, pitch: .1, yaw: 0, min: 6, max: 60, minPitch: -.3, maxPitch: .9 },
      today: { goal: V3(), dist: 32, pitch: .3, yaw: 0, min: 11, max: 90 }
    };
    return V[id];
  }
  function go(i, talk = true) {
    cur = clamp(i, 0, ERAS.length - 1); et = 0; phase2 = false;
    const e = ERAS[cur];
    if (!S[e.id]) S[e.id] = B[e.id]();
    resetEra(e.id);
    A.view(views3(e.id));
    $$('#earthPlaces .emode').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === e.id ? 'true' : 'false'));
    $(`#earthPlaces [data-id="${e.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (talk) { Sfx.whoosh(); Voice.say(e.line); }
    const extra = e.id === 'pangaea' ? [{ id: 'now', label: "Show today's map", cyan: true }] : [];
    A.setCtl([{ id: 'prev', icon: 'left', label: 'Earlier' }, { id: 'next', label: 'Later', go: true }, { id: 'again', icon: 'again', label: 'Again' }, ...extra]);
    const nb = $('#earthCtl [data-id="next"]'); if (nb) nb.innerHTML = '<span>Later</span>' + ICON.right;
  }
  function resetEra(id) {
    const x = S[id];
    if (id === 'moon') { x.theia.visible = true; x.moon.visible = false; x.flash.material.opacity = 0; x.debris.list.length = 0; }
    if (id === 'impact') { x.rock.visible = true; x.flash.material.opacity = 0; x.ring.material.opacity = 0; x.dust.material.uniforms.opacity.value = 0; x.dust.material.uniforms.spread.value = 0; x.trail.list.length = 0; x.earth.spin.rotation.y = 0; }
    if (id === 'dinos') { setDinoSky(0); S.dinos.embers.list.length = 0; }
    if (id === 'pangaea') { x.toNow = false; x.mix = 0; x.g.rotation.y = -PI / 2 - .6; }
    if (id === 'disk') x.clumps.forEach(c => c.scale.setScalar(.05));
  }
  function setDinoSky(k) {
    const d = S.dinos.s, a = smooth(0, .4, k), b = smooth(.4, 1, k);
    const top = new T.Color(0x2f6cc4).lerp(new T.Color(0x7a2c1a), a).lerp(new T.Color(0x24140f), b), hor = new T.Color(0xbcd4e8).lerp(new T.Color(0xd8642c), a).lerp(new T.Color(0x4a2618), b);
    d.setSky({ top: top.getHex(), hor: hor.getHex(), cloud: .42 + k * .5, cloudCol: new T.Color(0xffffff).lerp(new T.Color(0x4a3026), k).getHex(), cloudShade: new T.Color(0x9aa5b8).lerp(new T.Color(0x1a1210), k).getHex(), glow: 1 - k * .85 });
    d.fog.near = lerp(120, 30, k); d.fog.far = lerp(620, 220, k);
    d.hemi.intensity = lerp(.38, .3, k); d.hemi.color.set(0xdfeeff).lerp(new T.Color(0xff9a70), k); d.sl.intensity = lerp(1.35, .3, k); d.sl.color.set(0xfff2dc).lerp(new T.Color(0xff6a30), k);
    const env = k < .2 ? d.env : null; if (d.environment !== env) d.environment = env;
  }
  function walkCast(list, dt, scared = 0) {
    for (const d of list) {
      const u = d.userData, sp = u.v * (1 + scared * 1.5);
      if (u.r) { u.a += dt * sp / u.r; const x = u.x + Math.cos(u.a) * u.r, z = u.z + Math.sin(u.a) * u.r; d.position.set(x, S.dinos.s.h(x, z), z); d.rotation.y = -u.a - PI / 2; }
      u.ph += dt * sp * 2.6; d.walk(u.ph, u.r ? 1 : 0);
    }
  }

  M.history = {
    enter() {
      A.places(ERAS.map((e, i) => [e.id, e.name, () => go(i)]));
      go(cur, false);
      Voice.say('h_intro', () => { if (A.mode === 'history' && !Voice.busy) Voice.say(ERAS[cur].line); });
    },
    act(id) {
      if (id === 'prev') go(cur - 1); if (id === 'next') go(cur + 1); if (id === 'again') go(cur);
      if (id === 'now') { const p = S.pangaea; p.toNow = !p.toNow; btnLabel('now', p.toNow ? 'Show Pangaea' : "Show today's map"); }
    },
    tap(x, y) {
      const x3 = S[ERAS[cur].id]; if (!x3.spots) return;
      for (const sp of x3.spots) { const w = sp.at ? sp.at.clone() : sp.obj.getWorldPosition(V3()).add(V3(0, sp.up ?? 1, 0)); const p = A.proj(w); if (p.front && Math.hypot(x - p.x, y - p.y) < 80) { sp.found = true; Sfx.twinkle(); Voice.say(sp.line); return; } }
    },
    frame(dt) {
      et += dt;
      const e = ERAS[cur], x = S[e.id], t = A.t;
      const live = e.id === 'impact' && phase2 ? S.dinos : x; if (live.s.ticks) for (const f of live.s.ticks) f(dt);
      if (e.id === 'disk') {
        const k = smooth(0, 18, et);
        for (let i = 0; i < x.rad.length; i++) { x.ang[i] += dt * 40 / Math.pow(x.rad[i], 1.5); x.pos[i * 3] = Math.cos(x.ang[i]) * x.rad[i]; x.pos[i * 3 + 1] = x.hgt[i] * (1 - k * .5); x.pos[i * 3 + 2] = -Math.sin(x.ang[i]) * x.rad[i]; }
        x.g.attributes.position.needsUpdate = true;
        x.clumps.forEach(c => { const u = c.userData; u.a += dt * 40 / Math.pow(u.r, 1.5); c.position.set(Math.cos(u.a) * u.r, 0, -Math.sin(u.a) * u.r); c.scale.setScalar(Math.max(.05, k * u.max)); c.rotation.y += dt; });
      }
      if (e.id === 'moon') {
        x.earth.rotation.y += dt * .2;
        const hitT = 5;
        if (et < hitT) { const u = et / hitT; x.theia.position.set(lerp(60, 9, u), lerp(14, 2, u), lerp(-30, 2, u)); }
        else if (x.theia.visible) { x.theia.visible = false; x.flash.material.opacity = 1; Sfx.boop(); for (let i = 0; i < 2500; i++) { const a = Math.random() * TAU, sp = 6 + Math.random() * 14; x.debris.emit(8, 1.5, 1.5, Math.cos(a) * sp, (Math.random() - .5) * 3, Math.sin(a) * sp, 30); } }
        x.flash.position.set(8, 1.5, 1.5); x.flash.material.opacity = Math.max(0, x.flash.material.opacity - dt * .6);
        for (const q of x.debris.list) { const r = Math.hypot(q.x, q.z) || 1, v = Math.sqrt(220 / r); const tx = -q.z / r * v, tz = q.x / r * v; q.vx = lerp(q.vx, tx - q.x / r * (r - 22) * .4, dt * .8); q.vz = lerp(q.vz, tz - q.z / r * (r - 22) * .4, dt * .8); q.vy *= 1 - dt; }
        x.debris.step(dt, 0, 0);
        if (et > hitT + 6) { x.moon.visible = true; const a = et * .3; x.moon.position.set(Math.cos(a) * 22, 0, -Math.sin(a) * 22); x.moon.scale.setScalar(Math.min(1, (et - hitT - 6) / 6)); x.debris.material.opacity = Math.max(0, 1 - (et - hitT - 6) / 8); } else x.debris.material.opacity = 1;
      }
      if (e.id === 'oceans') {
        for (let i = 0; i < 18; i++) x.rain.emit(cam().position.x + (Math.random() - .5) * 60, 30, cam().position.z - 3 - Math.random() * 50, -1, -40, 0, 1.2);
        x.rain.step(dt, 0, 0);
        for (const [vx, vz, vy] of [[-160, -320, 68], [120, -380, 56], [260, -260, 38]]) if (Math.random() < .5) x.smoke.emit(vx + (Math.random() - .5) * 6, vy, vz, 2 + Math.random() * 2, 6 + Math.random() * 4, (Math.random() - .5) * 2, 9);
        x.smoke.step(dt, -.5, .1);
        const flash = (t * .7) % 6 < .08; x.s.hemi.intensity = flash ? 1.6 : .55;
      }
      if (e.id === 'snowball') { x.p.rotation.y += dt * .1; x.p.clouds.rotation.y += dt * .02; }
      if (e.id === 'cambrian') {
        x.tris.forEach(tb => { tb.translateX(dt * tb.userData.v); tb.rotation.y += Math.sin(t * .4 + tb.id) * dt * .4; tb.position.y = S.cambrian.s.h(tb.position.x, tb.position.z) + .03; if (Math.hypot(tb.position.x, tb.position.z + 10) > 14) tb.rotation.y += dt * 2; });
        x.jellies.forEach(j => { const u = j.userData; u.ph += dt * 2; j.bell.scale.set(1 + Math.sin(u.ph) * .12, 1 - Math.sin(u.ph) * .15, 1 + Math.sin(u.ph) * .12); j.position.y += Math.max(0, Math.sin(u.ph)) * dt * .4 - dt * .1; if (j.position.y > 11) j.position.y = 2; });
        const a = t * .25; x.ano.position.set(Math.cos(a) * 9, 3.2 + Math.sin(t) * .3, -12 + Math.sin(a) * 5); x.ano.rotation.y = -a - PI / 2; x.ano.swim(t * 6);
        if (Math.random() < .5) x.bubbles.emit((Math.random() - .5) * 20, 0, -4 - Math.random() * 16, 0, 1.5 + Math.random(), 0, 8);
        x.bubbles.step(dt, 0, 0);
      }
      if (e.id === 'forest') x.flies.forEach(d => { const u = d.userData; u.ph += dt * 1.1; d.position.set(u.c.x + Math.cos(u.ph) * u.r, u.y + Math.sin(u.ph * 2.3) * .6, u.c.z + Math.sin(u.ph) * u.r); d.rotation.y = -u.ph - PI; d.flap(t * 40); });
      if (e.id === 'pangaea') { x.g.rotation.y += dt * .04; x.mix = clamp(x.mix + (x.toNow ? dt : -dt) * .7, 0, 1); x.old.material.opacity = 1 - x.mix; x.pc.material.opacity = .45 * (1 - x.mix); x.old.visible = x.mix < .99; x.now.visible = x.mix > .01; E3.lightDir(x.now, V3(-40, 30, 60).normalize()); }
      if (e.id === 'dinos') { walkCast(x.cast, dt); x.pteros.forEach(p => { const u = p.userData; u.a += dt * .18; p.position.set(Math.cos(u.a) * u.r, u.y, -40 + Math.sin(u.a) * u.r); p.rotation.y = -u.a - PI; p.flap(t * 3 + u.ph); }); }
      if (e.id === 'impact') {
        if (!phase2) {
          const hitT = 6, site = x.earth.spin.localToWorld(x.site.clone());
          if (et < hitT) {
            const u = et / hitT, from = site.clone().normalize().multiplyScalar(60).add(V3(30, 25, 10)), p = from.lerp(site, u * u);
            x.rock.position.copy(p); x.rock.rotation.x += dt * 3;
            for (let i = 0; i < 6; i++) x.trail.emit(p.x, p.y, p.z, (Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2, .8);
          } else if (x.rock.visible) { x.rock.visible = false; x.flash.material.opacity = 1; x.flash.position.copy(site); Sfx.boop(); }
          x.trail.step(dt, 0, 1);
          if (et > hitT) {
            const u = et - hitT; x.flash.material.opacity = Math.max(0, 1 - u * .5);
            x.ring.position.copy(site); x.ring.lookAt(0, 0, 0); x.ring.scale.setScalar(.5 + u * 2.4); x.ring.material.opacity = Math.max(0, 1 - u / 5);
            const du = x.dust.material.uniforms; du.opacity.value = smooth(0, 1.5, u); du.spread.value = smooth(.3, 7, u) * 1.1; du.time.value += dt; x.dust.rotation.copy(x.earth.spin.rotation);
          }
          if (et > 13) {
            phase2 = true; if (!S.dinos) S.dinos = B.dinos(); A.view(views3('dinos')); ctl().goalPitch = .32;
            Voice.say('h_after');
          }
        } else {
          const u = et - 13, d = S.dinos; setDinoSky(smooth(0, 6, u));
          walkCast(d.cast, dt, 1); d.pteros.forEach(p => { p.visible = false; });
          for (let i = 0; i < 12; i++) d.embers.emit((Math.random() - .5) * 200, 60, -Math.random() * 160, (Math.random() - .5) * 6, -18 - Math.random() * 10, 0, 4);
          d.embers.step(dt, 0, 0);
        }
      }
      if (e.id === 'iceage') {
        x.herd.forEach(m => { const u = m.userData; u.x += dt * u.v; if (u.x > 40) u.x = -40; m.position.set(u.x, x.s.h(u.x, u.z), u.z); m.rotation.y = 0; u.ph = (u.ph || 0) + dt * 2; m.walk(u.ph, .8); });
        for (let i = 0; i < 14; i++) x.snow.emit(cam().position.x + (Math.random() - .5) * 70, 30, cam().position.z - Math.random() * 60, 1.5, -4 - Math.random() * 2, 0, 8);
        x.snow.step(dt, 0, 0);
      }
      if (e.id === 'today') {
        x.earth.spin.rotation.y += dt * .06; E3.lightDir(x.earth, V3(-.7, .25, .65).normalize().applyAxisAngle(V3(0, 1, 0), Math.atan2(cam().position.x, cam().position.z)));
        const a = t * .5; x.iss.position.set(Math.cos(a) * 11.2, Math.sin(a) * 4, -Math.sin(a) * 10); x.iss.lookAt(0, 0, 0);
      }
      return e.id === 'impact' && phase2 ? S.dinos.s : x.s;
    },
    hud(ctx) {
      const e = ERAS[cur], T0 = A.top(), W = A.W;
      // the time machine dial: where we are on the way from Earth's birth to today
      const w = Math.min(560, W - 32), x0 = (W - w) / 2, y0 = T0 - 4;
      ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, x0, y0, w, 74, 14); ctx.fill();
      hudText(ctx, agoText(e.ago), W / 2, y0 + 24, 19, '#FFB52E', 'center');
      hudText(ctx, e.ago ? `If Earth's story were one day, this happens at ${clockText(e.ago)}` : 'If Earth\'s story were one day, now is midnight', W / 2, y0 + 44, 12, '#C9D0F2', 'center', 600);
      const bx = x0 + 16, bw = w - 32, by = y0 + 60;
      ctx.fillStyle = '#16215A'; roundRect(ctx, bx, by - 3, bw, 6, 3); ctx.fill();
      ERAS.forEach((er, i) => { const px = bx + i / (ERAS.length - 1) * bw; ctx.fillStyle = i === cur ? '#FFB52E' : i < cur ? '#59E0E8' : '#2B3A7A'; ctx.beginPath(); ctx.arc(px, by, i === cur ? 7 : 4, 0, TAU); ctx.fill(); });
      const x = S[e.id];
      if (x.spots) for (const sp of x.spots) if (!sp.found) { const wv = sp.at ? sp.at.clone() : sp.obj.getWorldPosition(V3()).add(V3(0, sp.up ?? 1, 0)); label3(ctx, wv, sp.name, 'rgba(255,181,46,.92)', '#2A1600'); }
      if (e.id === 'impact' && phase2) x.dummy = 0;
      if (e.id === 'impact' && !phase2 && et > 6) label3(ctx, x.earth.spin.localToWorld(x.site.clone()).multiplyScalar(1.15), 'Near Mexico', 'rgba(255,109,138,.92)', '#2A0010');
      if (e.id === 'impact' && phase2 && S.dinos.spots) for (const sp of S.dinos.spots) sp.found = true;
      if (e.id === 'moon') { if (et < 5) label3(ctx, x.theia.position.clone().add(V3(0, 6, 0)), 'Theia'); if (x.moon.visible) label3(ctx, x.moon.position.clone().add(V3(0, 3.6, 0)), 'Our new Moon!', 'rgba(111,234,149,.92)', '#062A2E'); label3(ctx, V3(0, 11, 0), 'Lava Earth', 'rgba(255,122,48,.9)', '#2A1600'); }
      if (e.id === 'disk' && et > 6) label3(ctx, x.clumps[2].position.clone().add(V3(0, 4, 0)), 'Baby Earth', 'rgba(89,224,232,.92)', '#062A2E');
      if (e.id === 'pangaea' && !x.toNow) {
        x.g.updateMatrixWorld();
        for (let k = 0; k < PLATES.length; k++) { const n = PLATES[k][0], v = x.g.localToWorld(E3.latLonToVec(PLATES[k][3][1], PLATES[k][3][0], 10.6).applyQuaternion(plateQ(k))); const p = A.proj(v); if (p.front && v.clone().normalize().dot(cam().position.clone().normalize()) > .25) hudPill(ctx, n, p.x, p.y, n === 'India' ? 'rgba(255,181,46,.92)' : 'rgba(13,20,52,.8)', n === 'India' ? '#2A1600' : '#F3F1FF', 11); }
      }
      if (e.id === 'today') hudPill(ctx, 'Today: about 8 billion people live on Earth', W / 2, A.bottom() - 6, 'rgba(13,20,52,.88)', '#C9D0F2', 12);
    }
  };

  // pictures of the creatures for the Earth's Story Quiz
  window.HIST_SPECIES = SPECIES;   // the dinosaur models, for other scenes (India's story uses Rajasaurus)
  window.histIcons = () => {
    if (window.HIST_ICON) return window.HIST_ICON;
    const I = window.HIST_ICON = {};
    try {
      const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xf2f6ff, 0x6a5a4a, .95));
      const dl = new T.DirectionalLight(0xffffff, 1.25); dl.position.set(4, 7, 9); sc.add(dl);
      const cm = new T.PerspectiveCamera(30, 1, .05, 500);
      for (const k of ['trex', 'trike', 'stego', 'brachio', 'raja', 'mammoth', 'trilobite', 'ptero']) {
        const m = k === 'trilobite' ? trilobite() : k === 'ptero' ? pteranodon() : SPECIES[k]();
        m.walk?.(.7, 1); if (k === 'ptero') m.flap(.6);
        m.rotation.set(k === 'ptero' ? .55 : k === 'trilobite' ? .45 : 0, -.6, 0); sc.add(m); m.updateMatrixWorld(true);
        const bb = new T.Box3().setFromObject(m), c = bb.getCenter(V3()), sz = bb.getSize(V3()).length();
        cm.position.copy(c).add(V3(0, sz * .12, sz * 1.2)); cm.lookAt(c);
        I[k] = E3.snapshot(sc, cm, 200, 200, 0, 0).toDataURL(); sc.remove(m);
      }
    } catch (e) { console.error(e); }
    return I;
  };
})();
