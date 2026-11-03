/* Visit a world as Ayansh (3D walking with each world's real gravity), and the 3D Earth explorer.
   Uses E3 (engine3d.js), makeParticles / hudText / hudPill from craft.js and the shared helpers in index.html. */
'use strict';

/* ================================================================ walk around a world */
views.visit = (() => {
  const T = THREE, ov = $('#visitCv');
  ov.classList.add('over2d');
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const G_EARTH = 9.81, JUMP_V = Math.sqrt(2 * G_EARTH * .5);   // a half-metre jump on Earth
  let r, cam, ctl, ready = false, W = 0, H = 0, t = 0, wid = 'moon', w = null, me, found, heat, heatSaid, walkTo = null, celebrate = 0;
  const held = {}, scenes = {};

  function init() {
    r = E3.attach(ov); r.shadowMap.enabled = true; E3.mats(r);
    cam = new T.PerspectiveCamera(50, 1, .1, 20000);
    ctl = new E3.Orbit(cam, ov, { dist: 9, pitch: .32, min: 3.5, max: 40, minPitch: .02, maxPitch: 1.3 });
    ctl.onTap = tapAt; ready = true;
  }
  function layout() { if (!ready) return; E3.attach(ov); const f = fitCanvas(ov); W = f.w; H = f.h; E3.fit(r, cam); }

  // things to find on each world: where they are and how they look
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const std = (color, extra = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: .9 }, extra));
  const glowMat = (color, op = 1) => new T.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  function sign(text, w = 4, h = 1) { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: E3.label(text, '#0D1434', '#FFB52E', 512, 128), transparent: true })); m.position.y = 4; return m; }
  function skyBody(id, rad, dist, dir) { const p = E3.planet(id, rad, { seg: 64 }); p.position.copy(dir.clone().normalize().multiplyScalar(dist)); p.traverse(o => { if (o.material) o.material.fog = false; }); return p; }
  function sunSprite(size, color = 0xfff2d0) { const g = new T.Group(); const core = new T.Mesh(new T.SphereGeometry(size * .12, 32, 16), new T.MeshBasicMaterial({ color: 0xfffbe8, fog: false })); g.add(core); const s = E3.glow(color, size, 1); s.material.fog = false; g.add(s); return g; }
  function cone(rad, h, mat, seg = 40) { const g = new T.ConeGeometry(rad, h, seg, 8, true); const m = new T.Mesh(g, mat); m.position.y = h / 2; return m; }
  function volcano(rad, h, mat, lava) {
    const g = new T.Group(); const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20, rr = rad * (1 - u * .86), y = h * Math.pow(u, .8); pts.push(new T.Vector2(rr, y)); } pts.push(new T.Vector2(rad * .1, h * .92));
    const m = new T.Mesh(new T.LatheGeometry(pts, 48), mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
    if (lava) { const l = new T.Mesh(new T.CircleGeometry(rad * .12, 24), glowMat(0xff6a20, .9)); l.rotation.x = -Math.PI / 2; l.position.y = h * .93; g.add(l); g.lava = l; }
    return g;
  }
  function flag(us) {
    const g = new T.Group(); g.add(at(E3.cyl(.04, .04, 3, E3.mats().metal, 8), 0, 1.5, 0));
    const tx = E3.canvasTex(96, 64, (c) => { if (us) { for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#fff' : '#C8102E'; c.fillRect(0, i * 64 / 13, 96, 64 / 13 + 1); } c.fillStyle = '#1D3A8A'; c.fillRect(0, 0, 40, 34); } });
    g.add(at(new T.Mesh(new T.PlaneGeometry(1.5, 1), new T.MeshStandardMaterial({ map: tx, side: T.DoubleSide })), .78, 2.45, 0));
    const lm = new T.Group(); lm.add(at(E3.box(1.8, 1, 1.8, E3.mats().foil), 0, .9, 0)); for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) lm.add(at(E3.cyl(.05, .05, 1.2, E3.mats().metal, 6), x * 1.1, .5, z * 1.1)); lm.position.set(-4, 0, 2); g.add(lm);
    return g;
  }
  function dustDevil() { const p = makeParticles(500, 0xc8885a, 1.1, false); p.isDevil = true; return p; }
  function cloudPuff(color, size, n = 7, seed = 1) { const g = new T.Group(), rr = rng(seed); for (let i = 0; i < n; i++) { const s = E3.glow(color, size * (.6 + rr() * .6), .55); s.material.blending = T.NormalBlending; s.position.set((rr() - .5) * size * 1.4, (rr() - .5) * size * .3, (rr() - .5) * size * .6); g.add(s); } return g; }
  function swirl(colA, colB, rx, ry) { const tx = E3.canvasTex(256, 256, (c, s) => { c.translate(s / 2, s / 2); for (let i = 12; i > 0; i--) { c.fillStyle = i % 2 ? colA : colB; c.beginPath(); c.ellipse(Math.sin(i) * 4, Math.cos(i) * 3, i * 10, i * 10, i * .4, 0, TAU); c.fill(); } }); const m = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: .95 })); m.scale.set(rx, ry, 1); m.rotation.x = -Math.PI / 2; return m; }

  const WORLDS = {
    mercury: { name: 'Mercury', g: .38, temp: '430 °C by day', sky: 0x000000, ground: { map: 'mercury', color: 0xb0a89e, craters: 60, amp: 4 }, stars: true, sunDir: V3(.85, .3, .2), sunSize: 260, feet: true,
      spots: [{ id: 'sun', sky: true }, { id: 'crater', at: [40, -30], make: (gh) => { const g = new T.Group(); const s = sign('Valmiki crater', 6, 1.4); s.position.y = 6; g.add(s); return g; }, dig: 16 },
              { id: 'ice', at: [-35, -45], make: () => { const g = new T.Group(); const ice = new T.Mesh(new T.CircleGeometry(5, 32), std(0xd8f0ff, { roughness: .2, metalness: .2, emissive: 0x203040 })); ice.rotation.x = -Math.PI / 2; ice.position.y = .1; g.add(ice); return g; }, dig: 9 }] },
    venus: { name: 'Venus', g: .91, temp: '465 °C', sky: 0xb8762f, fog: [0xc88a40, .018], ground: { map: 'venus', color: 0xb07040, amp: 5 }, light: 0xffc890, lightI: .9, sunDir: V3(.2, 1, .2), heat: true,
      spots: [{ id: 'clouds', sky: true, make: () => { const g = cloudPuff(0xe8b060, 120, 10, 4); g.position.set(0, 70, -120); return g; } },
              { id: 'volcano', at: [10, -70], make: () => volcano(26, 24, std(0x5a3518), true) },
              { id: 'lander', at: [-30, -20], make: () => { const g = new T.Group(); g.add(at(new T.Mesh(new T.CylinderGeometry(2, 2.4, .5, 24), std(0x9aa3b8, { metalness: .6, roughness: .4 })), 0, .25, 0)); g.add(at(E3.sph(1.2, std(0xd8dbe6, { metalness: .5, roughness: .3 })), 0, 1.6, 0)); g.add(at(E3.cyl(.1, .1, 1.4, E3.mats().grey), 0, 3, 0)); const s = sign('Venera 13 (1982)', 5, 1.2); s.position.y = 5; g.add(s); return g; } }] },
    moon: { name: 'the Moon', g: .165, temp: '120 °C in sunlight', sky: 0x000000, ground: { map: 'moon', color: 0xd0cec8, craters: 70, amp: 5 }, stars: true, sunDir: V3(-.6, .4, .5), sunSize: 120, feet: true,
      spots: [{ id: 'earth', sky: true, make: () => skyBody('earth', 60, 900, V3(.5, .35, -1)) },
              { id: 'flag', at: [25, -25], make: () => { const g = flag(true); const s = sign('Apollo 11, 1969', 5, 1.2); s.position.y = 4.4; g.add(s); return g; } },
              { id: 'vikram', at: [-30, -35], make: () => { const g = new T.Group(); const v = E3.MODELS.vikram(); v.scale.setScalar(1.3); g.add(v); const p = E3.MODELS.pragyan(); p.scale.setScalar(1.6); p.position.set(4, 0, 1); g.add(p); const s = sign('Chandrayaan-3', 5, 1.2); s.position.y = 5; g.add(s); return g; } }] },
    mars: { name: 'Mars', g: .38, temp: '−60 °C', sky: 0xc9a27a, fog: [0xd2ab82, .006], ground: { map: 'mars', color: 0xe0a080, amp: 5, craters: 15 }, sunDir: V3(.7, .5, .3), sunSize: 50, feet: true, light: 0xfff0e0,
      spots: [{ id: 'olympus', sky: true, make: () => { const v = volcano(260, 70, std(0xa0583a)); v.position.set(-150, -10, -520); v.traverse(o => { if (o.material) o.material.fog = false; }); return v; } },
              { id: 'sunset', sky: true, make: () => { const g = new T.Group(); const s = E3.glow(0x9cc8ff, 160, .8); s.material.fog = false; g.add(s); const c = new T.Mesh(new T.SphereGeometry(4, 16, 8), new T.MeshBasicMaterial({ color: 0xf4faff, fog: false })); g.add(c); g.position.set(500, 40, -350); return g; } },
              { id: 'devil', at: [-20, -45], moving: true, make: () => { const g = new T.Group(); g.add(dustDevil()); return g; } },
              { id: 'rover', at: [35, -40], make: () => { const g = new T.Group(); const p = E3.MODELS.perseverance(); p.scale.setScalar(1.4); p.rotation.y = .7; g.add(p); return g; } }] },
    jupiter: { name: 'Jupiter', g: 2.53, temp: '−110 °C', sky: 0xd9b48a, fog: [0xe8d0b0, .004], clouds: 'jupiter', light: 0xfff0dc, sunDir: V3(.3, .8, .3),
      spots: [{ id: 'spot', sky: true, make: () => { const s = swirl('#B8482C', '#D9774A', 140, 80); s.position.set(60, -9, -260); return s; } },
              { id: 'lightning', sky: true, make: () => { const g = cloudPuff(0x9a7a60, 50, 8, 3); g.position.set(-90, 4, -160); const f = E3.glow(0xffffe0, 90, 0); f.material.fog = false; g.add(f); g.flash = f; return g; } },
              { id: 'io', sky: true, make: () => skyBody('io', 20, 700, V3(.3, .5, -1)) }] },
    saturn: { name: 'Saturn', g: 1.07, temp: '−140 °C', sky: 0xe6d3a3, fog: [0xf0e2c0, .004], clouds: 'saturn', light: 0xfff4e0, sunDir: V3(.3, .8, .3),
      spots: [{ id: 'rings', sky: true, make: () => { const ring = new T.Mesh(new T.RingGeometry(900, 1700, 128, 1, 0, Math.PI), new T.MeshBasicMaterial({ map: E3.tex('saturn_ring'), side: T.DoubleSide, transparent: true, fog: false, depthWrite: false, opacity: .9 })); ring.rotation.set(-.15, 0, 0); ring.position.set(0, -300, -400); const uvs = ring.geometry.attributes.uv, pp = ring.geometry.attributes.position; for (let i = 0; i < pp.count; i++) uvs.setXY(i, (Math.hypot(pp.getX(i), pp.getY(i)) - 900) / 800, .5); return ring; } },
              { id: 'hexagon', sky: true, make: () => { const m = new T.Mesh(new T.CircleGeometry(60, 6), new T.MeshBasicMaterial({ color: 0x7a8aa8, transparent: true, opacity: .55 })); m.rotation.x = -Math.PI / 2; m.position.set(-120, -8, -200); return m; } },
              { id: 'titan', sky: true, make: () => skyBody('titan', 22, 700, V3(-.5, .45, -1)) }] },
    uranus: { name: 'Uranus', g: .89, temp: '−195 °C', sky: 0x8fd4dc, fog: [0xbde9ee, .005], clouds: 'uranus', light: 0xe8fbff, lightI: .9, sunDir: V3(-.6, .5, .4),
      spots: [{ id: 'sideways', sky: true, make: () => { const s = sunSprite(40); s.position.set(-400, 300, -300); return s; } },
              { id: 'smell', at: [22, -18], make: () => { const g = cloudPuff(0xa8c888, 14, 6, 9); g.position.y = 4; return g; } },
              { id: 'diamonds', at: [-24, -26], make: () => { const p = makeParticles(200, 0xffffff, .5, true); p.isRain = true; return p; } }] },
    neptune: { name: 'Neptune', g: 1.14, temp: '−200 °C', sky: 0x2d58c8, fog: [0x4c78e0, .005], clouds: 'neptune', light: 0xdde8ff, lightI: .8, sunDir: V3(.4, .6, .3), wind: true,
      spots: [{ id: 'storm', sky: true, make: () => { const s = swirl('#152466', '#22357E', 110, 60); s.position.set(-60, -9, -240); return s; } },
              { id: 'triton', sky: true, make: () => { const p = skyBody('moon', 18, 700, V3(.6, .4, -1)); p.body.material.color?.set?.(0xe0d8d0); return p; } },
              { id: 'maths', at: [18, -20], make: () => { const g = new T.Group(); const b = new T.Mesh(new T.PlaneGeometry(5, 3), new T.MeshBasicMaterial({ map: E3.canvasTex(256, 160, (c) => { c.fillStyle = '#15302A'; c.fillRect(0, 0, 256, 160); c.strokeStyle = '#C38A2A'; c.lineWidth = 10; c.strokeRect(0, 0, 256, 160); c.fillStyle = '#F3F1FF'; c.font = '700 30px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText('Uranus + ? = ', 128, 62); c.fillText('Neptune!', 128, 108); }), side: T.DoubleSide })); b.position.y = 3; g.add(b); return g; } }] },
    pluto: { name: 'Pluto', g: .063, temp: '−230 °C', sky: 0x0a1030, fog: [0x1a2a5a, .003], ground: { map: 'pluto', color: 0xf0e0cc, amp: 4, craters: 20 }, stars: true, sunDir: V3(.8, .3, .35), sunSize: 18, lightI: .8, feet: true,
      spots: [{ id: 'charon', sky: true, make: () => skyBody('charon', 90, 900, V3(-.3, .3, -1)) },
              { id: 'heart', at: [0, -30], make: () => { const g = new T.Group(); const sh = new T.Shape(); sh.moveTo(0, -9); sh.bezierCurveTo(-14, 2, -8, 12, 0, 5); sh.bezierCurveTo(8, 12, 14, 2, 0, -9); const m = new T.Mesh(new T.ShapeGeometry(sh, 24), std(0xfff8f0, { roughness: .3 })); m.rotation.x = -Math.PI / 2; m.position.y = .15; m.scale.setScalar(1.6); g.add(m); return g; }, flat: 20 },
              { id: 'mountains', at: [-40, -60], make: () => { const g = new T.Group(), mm = std(0xc8d8f0, { roughness: .4 }); for (const [x, z, h] of [[0, 0, 22], [12, 6, 15], [-11, 4, 17]]) { const c = new T.Mesh(new T.ConeGeometry(h * .6, h, 7), mm); c.position.set(x, h / 2 - 1, z); c.castShadow = true; g.add(c); } return g; } }] },
    sun: { name: 'the Sun', g: 27.9, temp: '5,500 °C', sky: 0x3a0800, fog: [0x8a2a04, .004], plasma: true, light: 0xffc070, lightI: 1.2, sunDir: V3(0, 1, 0), noJump: true,
      spots: [{ id: 'flare', sky: true, make: () => { const m = new T.Mesh(new T.TorusGeometry(60, 6, 16, 64, Math.PI), glowMat(0xff9a40, .85)); m.position.set(30, -10, -200); return m; } },
              { id: 'spot', sky: true, make: () => { const s = swirl('#3A0A00', '#6A1A02', 70, 40); s.position.set(-90, -9, -150); s.material.blending = T.NormalBlending; return s; } },
              { id: 'light', sky: true, make: () => { const g = new T.Group(); const beam = new T.Mesh(new T.CylinderGeometry(2, 2, 600, 12, 1, true), glowMat(0xfff4c0, .4)); beam.rotation.z = 1.1; beam.position.set(-100, 120, -200); g.add(beam); return g; } }] },
    belt: { name: 'Ceres', g: .029, temp: '−105 °C', sky: 0x000000, ground: { map: 'ceres', color: 0x9a948c, craters: 50, amp: 4 }, stars: true, sunDir: V3(.5, .4, .6), sunSize: 40, feet: true,
      spots: [{ id: 'salt', at: [30, -35], make: () => { const g = new T.Group(); for (const [x, z, s] of [[0, 0, 3], [4, 2, 1.4], [-3, 3, 1]]) { const m = new T.Mesh(new T.CircleGeometry(s, 24), new T.MeshBasicMaterial({ color: 0xffffff })); m.rotation.x = -Math.PI / 2; m.position.set(x, .12, z); g.add(m); } return g; }, dig: 8 },
              { id: 'far', sky: true, make: () => { const g = new T.Group(), rr = rng(4); for (let i = 0; i < 5; i++) { const a = new T.Mesh(new T.DodecahedronGeometry(6 + rr() * 8, 1), std(0x7a746c)); a.position.set(-200 + i * 90, 60 + rr() * 80, -300 - rr() * 200); a.material.fog = false; g.add(a); } g.spinRocks = true; return g; } },
              { id: 'dino', sky: true, make: () => skyBody('earth', 30, 800, V3(-.6, .3, -1)) }] },
    comet: { name: 'a comet', g: .004, temp: '−70 °C', sky: 0x000000, ground: { color: 0x3a3836, amp: 14, craters: 20, freq: .02 }, stars: true, sunDir: V3(.8, .3, .3), sunSize: 30, feet: true,
      spots: [{ id: 'tail', sky: true, make: () => { const s = E3.glow(0xbfe6ff, 900, .35); s.material.fog = false; s.position.set(-400, 200, -500); s.scale.set(1400, 300, 1); return s; } },
              { id: 'jet', at: [25, -30], make: () => { const p = makeParticles(400, 0xe8f4ff, 1.4, true); p.isJet = true; return p; } },
              { id: 'philae', at: [-28, -22], make: () => { const g = new T.Group(); g.add(at(E3.box(1, .8, 1, E3.mats().foil), 0, 1, 0)); g.add(at(E3.box(1.1, .05, 1.1, E3.mats().panel), 0, 1.45, 0)); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; g.add(E3.rod(V3(Math.cos(a) * .4, .7, Math.sin(a) * .4), V3(Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1), .04, E3.mats().metal)); } g.rotation.z = .25; const s = sign('Philae (2014)', 4, 1); s.position.y = 3; g.add(s); return g; } }] }
  };

  function build(id) {
    const cfg = WORLDS[id], sc = new T.Scene();
    sc.background = new T.Color(cfg.sky);
    if (cfg.fog) sc.fog = new T.FogExp2(cfg.fog[0], cfg.fog[1]);
    if (cfg.stars) sc.add(E3.starfield(9000));
    sc.add(new T.HemisphereLight(cfg.light || 0xffffff, 0x202020, cfg.stars ? .08 : .45));
    const sl = new T.DirectionalLight(cfg.light || 0xffffff, cfg.lightI ?? 1.7); sl.position.copy(cfg.sunDir).normalize().multiplyScalar(80);
    sl.castShadow = true; sl.shadow.mapSize.set(2048, 2048); const c = sl.shadow.camera; c.left = c.bottom = -25; c.right = c.top = 25; c.near = 1; c.far = 300; sl.shadow.bias = -.0006;
    sc.add(sl); sc.add(sl.target); sc.sl = sl;
    if (cfg.sunSize) { const s = sunSprite(cfg.sunSize); s.position.copy(cfg.sunDir).normalize().multiplyScalar(1500); sc.add(s); sc.sunObj = s; }
    // ground: real map tiled across hills and craters, or a sea of clouds with a floating pad
    let height;
    if (cfg.ground) {
      const flat = [[0, 0, 10]]; for (const s of cfg.spots) if (s.at && (s.flat || !s.dig)) flat.push([s.at[0], s.at[1], s.flat || 6]);
      const craters = [];
      const gr = E3.terrain({ size: 500, seg: 220, amp: cfg.ground.amp, freq: cfg.ground.freq || .012, craters: cfg.ground.craters || 0, craterMax: 18, seed: id.length * 7 + 3, map: cfg.ground.map, repeat: 7, color: cfg.ground.color, flat });
      // dig the special craters
      for (const s of cfg.spots) if (s.dig) craters.push([s.at[0], s.at[1], s.dig]);
      if (craters.length) { const p = gr.geometry.attributes.position, base = gr.height; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let h = p.getY(i); for (const [cx, cz, rr] of craters) { const d = Math.hypot(x - cx, z - cz) / rr; if (d < 1.3) h += d < 1 ? -(1 - d * d) * rr * .35 : (1.3 - d) * rr * .25; } p.setY(i, h); } gr.geometry.computeVertexNormals(); height = (x, z) => { let h = base(x, z); for (const [cx, cz, rr] of craters) { const d = Math.hypot(x - cx, z - cz) / rr; if (d < 1.3) h += d < 1 ? -(1 - d * d) * rr * .35 : (1.3 - d) * rr * .25; } return h; }; }
      else height = gr.height;
      sc.add(gr);
      sc.add(E3.rocks(320, 420, std(new T.Color(cfg.ground.color).multiplyScalar(.75).getHex()), height, id.length, .8));
    } else if (cfg.clouds) {
      const deck = new T.Mesh(new T.PlaneGeometry(4000, 4000), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
      const tx = E3.tex(cfg.clouds, { repeat: true }); tx.ready.then(() => { tx.repeat.set(14, 7); deck.material.map = tx; deck.material.needsUpdate = true; });
      deck.rotation.x = -Math.PI / 2; deck.position.y = -14; sc.add(deck); sc.deck = deck;
      for (let i = 0; i < 14; i++) { const p = cloudPuff(new T.Color(cfg.sky).lerp(new T.Color(0xffffff), .4).getHex(), 40, 5, i + 3); const a = i / 14 * TAU; p.position.set(Math.cos(a) * (90 + i * 9), -6 + (i % 3) * 3, Math.sin(a) * (90 + i * 9)); sc.add(p); }
      height = () => 0;
      const pad = new T.Group(), M = E3.mats();
      const deckTex = E3.canvasTex(256, 256, (c, w) => { c.fillStyle = '#2E3550'; c.fillRect(0, 0, w, w); c.strokeStyle = '#4A5580'; c.lineWidth = 3; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * w / 8, 0); c.lineTo(i * w / 8, w); c.moveTo(0, i * w / 8); c.lineTo(w, i * w / 8); c.stroke(); } c.fillStyle = '#FFB52E'; c.beginPath(); c.arc(w / 2, w / 2, 26, 0, TAU); c.fill(); c.fillStyle = '#2E3550'; c.font = '700 34px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', w / 2, w / 2 + 2); });
      pad.add(at(new T.Mesh(new T.CylinderGeometry(9, 8, 1, 48), [new T.MeshStandardMaterial({ color: 0x3a4466, metalness: .6, roughness: .4 }), new T.MeshStandardMaterial({ map: deckTex, roughness: .7 }), new T.MeshStandardMaterial({ color: 0x3a4466 })]), 0, -.5, 0));
      const rail = at(new T.Mesh(new T.TorusGeometry(9, .1, 8, 64), M.metal), 0, 1.1, 0); rail.rotation.x = Math.PI / 2; pad.add(rail);
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; pad.add(at(E3.cyl(.06, .06, 1.1, M.metal, 6), Math.cos(a) * 9, .55, Math.sin(a) * 9)); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, l = new T.Mesh(new T.CylinderGeometry(.7, .4, .4, 16), glowMat(0x59e0e8, .8)); l.position.set(Math.cos(a) * 6, -1.2, Math.sin(a) * 6); pad.add(l); }
      pad.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
      sc.add(pad); sc.pad = pad;
    } else if (cfg.plasma) {
      const deck = new T.Mesh(new T.PlaneGeometry(4000, 4000), new T.MeshBasicMaterial({ color: 0xffffff }));
      const tx = E3.tex('sun', { repeat: true }); tx.ready.then(() => { tx.repeat.set(6, 6); deck.material.map = tx; deck.material.needsUpdate = true; });
      deck.rotation.x = -Math.PI / 2; deck.position.y = -10; sc.add(deck); sc.deck = deck;
      const pad = new T.Group(), M = E3.mats();
      pad.add(at(new T.Mesh(new T.CylinderGeometry(12, 9, 2, 48), M.metal), 0, -1, 0));
      const dome = new T.Mesh(new T.SphereGeometry(12, 48, 16, 0, TAU, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: 0x9fe8ff, transparent: true, opacity: .14, roughness: .1, metalness: .5, side: T.DoubleSide })); pad.add(dome);
      sc.add(pad); sc.pad = pad;
      height = () => 0;
    }
    if (cfg.wind) { const p = makeParticles(400, 0xdde8ff, .6, true); sc.add(p); sc.wind = p; }
    sc.height = height;
    // things to find
    sc.spots = cfg.spots.map(s => {
      const obj = s.make ? s.make(height) : new T.Group();
      if (s.at) obj.position.set(s.at[0], height(s.at[0], s.at[1]), s.at[1]);
      if (s.id === 'sun' && sc.sunObj) return { ...s, obj: sc.sunObj };
      sc.add(obj); obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      let marker = null;
      if (s.at) { marker = new T.Mesh(new T.TorusGeometry(3.4, .12, 8, 48), new T.MeshBasicMaterial({ color: 0xffb52e, transparent: true, opacity: .8 })); marker.rotation.x = Math.PI / 2; marker.position.set(s.at[0], height(s.at[0], s.at[1]) + .4, s.at[1]); sc.add(marker); }
      return { ...s, obj, marker };
    });
    // Ayansh and his footprints
    const me = E3.MODELS.astronaut(); sc.add(me); sc.me = me;
    sc.feet = []; sc.footMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false });
    return sc;
  }

  function chips() {
    const kg = prefs.kg * w.g, wtxt = w.g < .01 ? 'almost nothing!' : (kg >= 100 ? Math.round(kg).toLocaleString('en-IN') : kg.toFixed(kg < 10 ? 1 : 0)) + ' kg';
    $('#visitChips').innerHTML = `<span class="chip">Ayansh weighs <b>${wtxt}</b></span><span class="chip">Temperature <b>${w.temp}</b></span>`;
    $('#visitFound').textContent = `Found ${found.size} of ${w.spots.length}`;
    $('#vJump').hidden = !!w.noJump;
  }
  function start(id) {
    if (!ready) init();
    wid = id; w = WORLDS[id]; if (!scenes[id]) scenes[id] = build(id);
    const sc = scenes[id];
    found = new Set(); heat = 0; heatSaid = false; celebrate = 0; walkTo = null;
    me = { x: 0, z: 0, h: 0, vy: 0, yaw: Math.PI, step: 0 };
    sc.feet.forEach(f => sc.remove(f)); sc.feet = [];
    for (const s of sc.spots) { if (s.marker) s.marker.visible = true; }
    ctl.follow = g => g.set(me.x, sc.height(me.x, me.z) + me.h + 1.3, me.z);
    ctl.goalDist = w.clouds || w.plasma ? 16 : 9; ctl.goalYaw = 0; ctl.goalPitch = w.clouds || w.plasma ? .42 : .28; ctl.min = 3.5; ctl.max = 60; ctl.retarget(); ctl.snap();
    chips();
  }
  window.visitWorld = id => {
    if (id === 'earth') { show('earth'); return; }
    if (!WORLDS[id]) return;
    start(id); show('visit', true); Voice.say('v_' + id);
  };
  function discover(s) {
    const fresh = !found.has(s.id); found.add(s.id);
    if (s.marker) s.marker.visible = false;
    if (fresh) Sfx.twinkle();
    Voice.say(`v_${wid}_${s.id}`);
    chips();
    if (fresh && found.size === w.spots.length) { setTimeout(() => Sfx.chime(), 300); celebrate = 3.5; }
  }
  function jump() {
    if (w.noJump) { Sfx.boop(); return; }
    if (me.h <= .01) { me.vy = JUMP_V; Sfx.boing(1 / Math.max(w.g, .05)); }
  }
  function tapAt(x, y) {
    const sc = scenes[wid];
    for (const s of sc.spots) {
      const p = E3.toScreen(spotPos(s), cam, W, H);
      if (p.front && Math.hypot(x - p.x, y - p.y) < (s.sky ? 90 : 70)) { discover(s); if (s.at) walkTo = { x: s.at[0] + 4, z: s.at[1] + 4 }; return; }
    }
    const ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(x / W * 2 - 1, -(y / H) * 2 + 1), cam);
    const hit = ray.intersectObjects(sc.children.filter(o => o.isMesh || o === sc.pad), true)[0];
    if (hit && hit.point.distanceTo(cam.position) < 400) { walkTo = { x: hit.point.x, z: hit.point.z }; Sfx.tap(); }
    else jump();
  }
  const spotPos = s => s.at ? V3(s.at[0], scenes[wid].height(s.at[0], s.at[1]) + 2, s.at[1]) : s.obj.getWorldPosition(V3());

  // controls
  for (const [id, key] of [['vLeft', 'left'], ['vRight', 'right'], ['vFwd', 'fwd']]) {
    const b = $('#' + id);
    const on = e => { e.preventDefault(); held[key] = true; walkTo = null; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
    const off = () => { held[key] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
  }
  $('#vJump').addEventListener('click', jump);
  $('#visitBack').addEventListener('click', () => { Sfx.whoosh(); show('explore', true); Voice.say('visit_back'); });
  const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'fwd' };
  window.addEventListener('keydown', e => { if (current !== 'visit') return; if (KEYMAP[e.key]) { held[KEYMAP[e.key]] = true; walkTo = null; e.preventDefault(); } if (e.key === ' ') { jump(); e.preventDefault(); } });
  window.addEventListener('keyup', e => { if (KEYMAP[e.key]) held[KEYMAP[e.key]] = false; });

  function frame(dt) {
    if (!ready) init();
    if (!w) start(wid);
    t += dt;
    const sc = scenes[wid], gh = sc.height, onPad = !w.ground;
    // walking: turn with the side buttons, walk forward, or walk to where you tapped
    const turn = (held.left ? 1 : 0) - (held.right ? 1 : 0);
    me.yaw += turn * dt * 2;
    let go = held.fwd ? 1 : 0;
    if (walkTo && !held.fwd) { const dx = walkTo.x - me.x, dz = walkTo.z - me.z, d = Math.hypot(dx, dz); if (d < .6) walkTo = null; else { const want = Math.atan2(dx, dz); let dy = want - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += clamp(dy, -dt * 5, dt * 5); go = Math.abs(dy) < 1 ? 1 : 0; } }
    const speed = (w.g > 2 ? 2.2 : w.g < .2 ? 3.2 : 4) * (me.h > .01 ? .8 : 1);
    let nx = me.x + Math.sin(me.yaw) * go * speed * dt, nz = me.z + Math.cos(me.yaw) * go * speed * dt;
    if (w.wind) { nx -= dt * 1.4; }
    const lim = onPad ? 7.8 : 200, d0 = Math.hypot(nx, nz); if (d0 > lim) { nx *= lim / d0; nz *= lim / d0; }
    me.x = nx; me.z = nz;
    if (go) me.step += dt * 9;
    // jumping with this world's gravity (very weak gravity is capped so Ayansh comes back down)
    const g = Math.max(w.g * G_EARTH, JUMP_V * JUMP_V / (2 * 40));
    if (me.h > 0 || me.vy > 0) { me.vy -= g * dt; me.h = Math.max(0, me.h + me.vy * dt); if (me.h === 0) me.vy = 0; }
    const A = sc.me, gy = gh(me.x, me.z);
    A.position.set(me.x, gy + me.h, me.z); A.rotation.y = me.yaw;
    A.pose(go ? me.step : 0, me.h > .05);
    A.scale.set(1, w.g > 2.4 ? .9 : 1, 1);
    if (w.feet && go && me.h === 0) {
      const last = sc.feet[sc.feet.length - 1];
      if (!last || Math.hypot(last.position.x - me.x, last.position.z - me.z) > .55) {
        const side = sc.feet.length % 2 ? 1 : -1, f = new T.Mesh(new T.CircleGeometry(.16, 12), sc.footMat);
        f.scale.y = 1.7; f.rotation.set(-Math.PI / 2, 0, me.yaw); f.position.set(me.x + Math.cos(me.yaw) * .15 * side, gh(me.x, me.z) + .04, me.z - Math.sin(me.yaw) * .15 * side);
        sc.add(f); sc.feet.push(f); if (sc.feet.length > 400) sc.remove(sc.feet.shift());
      }
    }
    // camera stays behind Ayansh while he walks, unless the view is being turned
    if (go && performance.now() - (ctl.dragAt || 0) > 2500) { let dy = me.yaw + Math.PI - ctl.goalYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); ctl.goalYaw += dy * Math.min(1, dt * 1.6); }
    // walk close to something and it tells you about itself
    for (const s of sc.spots) if (s.at && !found.has(s.id) && Math.hypot(s.at[0] - me.x, s.at[1] - me.z) < 7 && !Voice.busy) discover(s);
    // world animations
    for (const s of sc.spots) {
      if (s.marker && s.marker.visible) { s.marker.rotation.z += dt; s.marker.material.opacity = .5 + .4 * Math.sin(t * 4); }
      const o = s.obj;
      if (o.isDevil || o.children?.[0]?.isDevil) {
        const p = o.isDevil ? o : o.children[0], cx = Math.sin(t * .2) * 20;
        o.position.x = s.at[0] + cx;
        for (let i = 0; i < 8; i++) { const a = Math.random() * TAU, hh = Math.random() * 30, rr = 1 + hh * .25; p.emit(Math.cos(a + t * 6) * rr, hh, Math.sin(a + t * 6) * rr, -Math.sin(a) * 3, 2, Math.cos(a) * 3, 1.2); }
        p.step(dt, 0, .5);
      }
      if (o.isJet) { for (let i = 0; i < 6; i++) o.emit((Math.random() - .5), .5, (Math.random() - .5), (Math.random() - .5) * 1.5, 5 + Math.random() * 4, (Math.random() - .5) * 1.5, 5); o.step(dt, 0, 0); }
      if (o.isRain) { for (let i = 0; i < 3; i++) o.emit((Math.random() - .5) * 10, 16, (Math.random() - .5) * 10, 0, -4, 0, 4); o.step(dt, 0, 0); }
      if (o.flash) o.flash.material.opacity = (t * 1.7) % 3 < .12 ? 1 : 0;
      if (o.spinRocks) o.children.forEach((c, i) => { c.rotation.x += dt * .2 * (i + 1) * .3; c.rotation.y += dt * .1; });
      if (o.lava) o.lava.material.opacity = .7 + .3 * Math.sin(t * 3);
    }
    if (sc.deck && sc.deck.material.map) { sc.deck.material.map.offset.x += dt * (w.plasma ? .004 : .006); }
    if (sc.wind) { for (let i = 0; i < 6; i++) sc.wind.emit(me.x + 40, gh(me.x, me.z) + Math.random() * 12, me.z + (Math.random() - .5) * 50, -60 - Math.random() * 30, 0, 0, 1.4); sc.wind.step(dt, 0, 0); }
    if (w.heat) { heat = Math.min(1, heat + dt / 40); if (heat >= 1 && !heatSaid) { heatSaid = true; Voice.say('v_venus_hot', () => { heat = 0; heatSaid = false; }); } }
    sc.sl.position.set(me.x + w.sunDir.x * 80, w.sunDir.y * 80, me.z + w.sunDir.z * 80); sc.sl.target.position.set(me.x, 0, me.z);
    E3.fit(r, cam); ctl.update(dt);
    if (sc.sunObj) sc.sunObj.position.copy(cam.position).add(w.sunDir.clone().normalize().multiplyScalar(1500));
    r.render(sc, cam);
    // overlay: labels and messages
    const ctx = ov.getContext('2d'), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    for (const s of sc.spots) if (!found.has(s.id)) { const p = E3.toScreen(spotPos(s), cam, W, H); if (p.front && p.x > 0 && p.x < W && p.y > 0 && p.y < H) hudPill(ctx, 'Tap me', p.x, p.y - 10, 'rgba(255,181,46,.92)', '#2A1600', 12); }
    if (me.h > 3) { const p = E3.toScreen(A.position.clone().add(V3(0, 2.4, 0)), cam, W, H); hudPill(ctx, `${me.h.toFixed(1)} m up! Whee!`, p.x, p.y); }
    if (w.heat) { const x = 16, y = 64; ctx.fillStyle = 'rgba(13,20,52,.85)'; roundRect(ctx, x, y, 200, 40, 10); ctx.fill(); hudText(ctx, `Suit heat: ${Math.round(heat * 100)}%`, x + 10, y + 15, 11, '#C9D0F2', 'left', 600); ctx.fillStyle = '#16215A'; roundRect(ctx, x + 10, y + 22, 180, 9, 4); ctx.fill(); ctx.fillStyle = heat > .8 ? '#FF6D8A' : '#FFB52E'; roundRect(ctx, x + 10, y + 22, Math.max(6, 180 * heat), 9, 4); ctx.fill(); }
    if (w.wind) hudPill(ctx, 'Wind: 2,000 km/h', W - 110, 82, 'rgba(13,20,52,.85)', '#59E0E8');
    if (celebrate > 0) { celebrate -= dt; hudPill(ctx, `You found everything on ${w.name}!`, W / 2, H * .3, '#FFB52E', '#2A1600', 18); }
    hudText(ctx, 'Tap the ground to walk there · Drag to look around · Pinch to zoom', W / 2, H - 64, 12, 'rgba(243,241,255,.8)', 'center', 600);
  }
  return { frame, layout, enter() { if (!ready) init(); E3.attach(ov); layout(); if (!w) start(wid); chips(); }, leave() { held.left = held.right = held.fwd = false; } };
})();

/* ================================================================ Earth explorer */
views.earth = (() => {
  const T = THREE, ov = $('#earthCv');
  ov.classList.add('over2d');
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  let r, cam, ctl, ready = false, W = 0, H = 0, t = 0, mode = 'globe';
  const held = {}, said = new Set();
  const top = () => ($('#view-earth .over.top').offsetHeight || 50) + 18, bottom = () => H - ($('#view-earth .earthbot').offsetHeight || 50) - 16;
  function init() {
    r = E3.attach(ov); r.shadowMap.enabled = true; E3.mats(r);
    cam = new T.PerspectiveCamera(45, 1, .05, 20000);
    ctl = new E3.Orbit(cam, ov, { dist: 32, pitch: .3, min: 12, max: 90 });
    ctl.onTap = (x, y) => M[mode].tap?.(x, y);
    ready = true;
  }
  function layout() { if (!ready) return; E3.attach(ov); const f = fitCanvas(ov); W = f.w; H = f.h; E3.fit(r, cam); }
  function setCtl(items) {
    const el = $('#earthCtl'); el.innerHTML = '';
    for (const k in held) held[k] = false;
    for (const it of items) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (it.go ? ' go' : '') + (it.hold ? ' hold' : '') + (it.cyan ? ' cyan' : '');
      b.innerHTML = (it.icon ? ICON[it.icon] : '') + `<span>${it.label}</span>`; b.dataset.id = it.id;
      if (it.hold) {
        const on = e => { e.preventDefault(); held[it.id] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
        const off = () => { held[it.id] = false; b.classList.remove('on'); };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off); b.addEventListener('contextmenu', e => e.preventDefault());
      } else b.addEventListener('click', () => { Sfx.tap(); M[mode].act?.(it.id); });
      el.appendChild(b);
    }
  }
  const places = list => {
    const el = $('#earthPlaces'); el.innerHTML = ''; el.hidden = !list;
    for (const [id, label, fn] of list || []) { const b = document.createElement('button'); b.type = 'button'; b.className = 'emode'; b.textContent = label; b.dataset.id = id; b.addEventListener('click', () => { Sfx.tap(); $$('#earthPlaces .emode').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); fn(); }); el.appendChild(b); }
  };
  const view = o => { if (o.dist > 15 && H > W && W) o = { ...o, dist: o.dist * Math.min(1.9, H / W * .9) }; ctl.rotSpeed = 1; ctl.quat = null; ctl.follow = null; ctl.goal.copy(o.goal || V3()); ctl.goalDist = o.dist; ctl.min = o.min; ctl.max = o.max; ctl.goalYaw = o.yaw ?? ctl.goalYaw; ctl.goalPitch = o.pitch ?? ctl.goalPitch; ctl.minPitch = o.minPitch ?? -1.4; ctl.maxPitch = o.maxPitch ?? 1.4; ctl.auto = o.auto || 0; cam.near = o.near ?? .05; cam.updateProjectionMatrix(); ctl.retarget(); if (o.snap) ctl.snap(); };
  const proj = v => E3.toScreen(v, cam, W, H);
  const M = {};

  /* ---------------- globe: continents, oceans and wonders on the real Earth */
  const WONDERS = [
    ['everest', 'Mount Everest', 27.99, 86.93, 0xF3F1FF], ['taj', 'Taj Mahal', 27.17, 78.04, 0xFFE3F0], ['sahara', 'Sahara Desert', 23, 12, 0xFFD27A], ['amazon', 'Amazon Rainforest', -4, -62, 0x6FEA95],
    ['nile', 'River Nile', 15.6, 32.5, 0x59E0E8], ['wall', 'Great Wall of China', 40.4, 116.6, 0xFF9A6A], ['pyramids', 'Pyramids of Egypt', 29.98, 31.13, 0xFFB52E],
    ['reef', 'Great Barrier Reef', -18.3, 147.7, 0xFF6D8A], ['trench', 'Mariana Trench', 11.35, 142.2, 0x8FB4FF],
    ['grandcanyon', 'Grand Canyon', 36.1, -112.1, 0xFF7442], ['niagara', 'Niagara Falls', 43.08, -79.07, 0x59E0E8], ['fuji', 'Mount Fuji', 35.36, 138.73, 0xF3F1FF]
  ];
  // places to fly to: [name, lat, lon, how close, narration]
  const FLY = [
    ['India', 22, 79, 15, 'e_india'], ['Himalayas', 28.5, 85, 12.2, 'w_everest'], ['Sahara', 23, 12, 15, 'w_sahara'], ['Amazon', -4, -62, 14, 'w_amazon'],
    ['Nile', 22, 31.5, 13, 'w_nile'], ['Great Wall', 40.4, 116.6, 12.5, 'w_wall'], ['Pyramids', 29.98, 31.13, 12.2, 'w_pyramids'], ['Great Barrier Reef', -18.3, 147.7, 12.8, 'w_reef'],
    ['Grand Canyon', 36.1, -112.1, 12.2, 'w_grandcanyon'], ['Niagara Falls', 43.08, -79.07, 12.2, 'w_niagara'], ['Mount Fuji', 35.36, 138.73, 12.2, 'w_fuji'], ['Antarctica', -78, 30, 15, 'e_antarctica']
  ];
  const NAMES = { asia: 'Asia', africa: 'Africa', europe: 'Europe', namerica: 'North America', samerica: 'South America', australia: 'Australia', antarctica: 'Antarctica', pacific: 'Pacific Ocean', atlantic: 'Atlantic Ocean', indian: 'Indian Ocean', southern: 'Southern Ocean', arctic: 'Arctic Ocean' };
  function continent(lat, lon) {
    if (lat < -60) return 'antarctica';
    if (lon < -25 && lon > -170 && lat > 7.5) return 'namerica';
    if (lon <= -34 && lon >= -92 && lat <= 13) return lat > 7.5 && lon < -77 ? 'namerica' : 'samerica';
    if (lon >= -20 && lon <= 52 && lat >= -36 && lat < 37.5 && !(lat >= 12 && lon >= 34)) return 'africa';
    if (lon > -25 && lon < 40 && lat >= 36) return 'europe';
    if (lon > 110 && lat < -10) return 'australia';
    if (lon > 140 && lat < -1 && lat > -11) return 'australia';
    if (lon < -25) return lat > 50 ? 'namerica' : 'asia';
    return 'asia';
  }
  function ocean(lat, lon) {
    if (lat < -58) return 'southern';
    if (lat > 66 || (lat > 50 && lon > -95 && lon < -75)) return 'arctic';
    if (lon >= 20 && lon < 118 && lat < 30) return 'indian';
    if (lon >= 118 && lon < 147 && lat < -12) return 'indian';
    if (lon > -70 && lon < 20) return 'atlantic';
    if (lon >= -98 && lon <= -70 && lat > 17 && lat < 60) return 'atlantic';
    if (lon >= -88 && lon <= -70 && lat > 8 && lat <= 17) return 'atlantic';
    return 'pacific';
  }
  let globeSc, globe, pins = [], label = null, spinOn = true, turnTo = null, turnLat = null, realTime = false;
  // where the Sun is overhead right now: latitude from the date, longitude from the time of day (UTC)
  function subsolar(now = new Date()) {
    const start = Date.UTC(now.getUTCFullYear(), 0, 0), doy = (now - start) / 864e5;
    const decl = -23.44 * Math.cos(TAU * (doy + 10) / 365.25);
    const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
    return { lat: decl, lon: -(hours - 12) * 15 };
  }
  function flyTo(lat, lon, dist) { spinOn = false; turnTo = lon; ctl.goalPitch = clamp(lat * PI / 180, -1.35, 1.35); ctl.goalDist = dist; label = null; }
  const R = 10, sunDir = V3(-.4, .35, .85).normalize();
  M.globe = {
    make() {
      globeSc = new T.Scene(); globeSc.add(E3.starfield(6000)); globeSc.add(new T.AmbientLight(0xffffff, .15));
      const sl = new T.DirectionalLight(0xffffff, 1.4); sl.position.copy(sunDir).multiplyScalar(100); globeSc.add(sl);
      globe = E3.earthHD(R); globeSc.add(globe);
      for (const m of globe.tiles) m.material.uniforms.nightBoost.value = .8;
      for (const [id, nm, la, lo, col] of WONDERS) {
        const pin = new T.Group(); const head = new T.Mesh(new T.SphereGeometry(.32, 16, 8), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .35 })); head.position.y = .55; pin.add(head);
        pin.add(E3.at(E3.cyl(.04, .01, .5, E3.mats().metal, 6), 0, .25, 0));
        pin.position.copy(E3.latLonToVec(la, lo, R * 1.002)); pin.quaternion.setFromUnitVectors(V3(0, 1, 0), pin.position.clone().normalize());
        pin.wid = id; pin.nm = nm; globe.spin.add(pin); pins.push(pin);
      }
    },
    enter() {
      if (!globeSc) this.make();
      view({ dist: 32, min: 10.35, max: 80, pitch: .3, snap: false });
      setCtl([{ id: 'spin', label: 'Spin', cyan: true }, { id: 'real', label: realTime ? 'Real time: on' : 'Real time: off' }]);
      places(FLY.map(([nm, la, lo, d, line]) => [nm, nm, () => { flyTo(la, lo, d); globe.loadSharp(); Sfx.whoosh(); Voice.say(line); }]));
    },
    leave() { places(null); },
    act(id) {
      if (id === 'spin') spinOn = !spinOn;
      if (id === 'real') { realTime = !realTime; $('#earthCtl [data-id="real"] span').textContent = realTime ? 'Real time: on' : 'Real time: off'; if (realTime) { spinOn = false; Voice.say('e_realtime'); } }
    },
    tap(x, y) {
      for (const p of pins) { const s = proj(p.localToWorld(V3(0, .55, 0))); const n = p.getWorldPosition(V3()).normalize(); if (s.front && n.dot(cam.position.clone().normalize()) > .15 && Math.hypot(x - s.x, y - s.y) < 22) { label = { s: p.nm, x: s.x, y: s.y - 18, life: 4 }; Sfx.twinkle(); Voice.say(p.wid === 'taj' ? 'in_taj' : 'w_' + p.wid); return; } }
      const ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(x / W * 2 - 1, -(y / H) * 2 + 1), cam);
      const hit = ray.intersectObjects(globe.tiles)[0]; if (!hit) return;
      const local = globe.spin.worldToLocal(hit.point.clone()), { lat, lon } = E3.vecToLatLon(local);
      const id = landAmount(lat, lon) > .5 ? continent(lat, lon) : ocean(lat, lon);
      label = { s: NAMES[id], x, y: y - 16, life: 4 }; Sfx.twinkle(); Voice.say('e_' + id);
    },
    frame(dt) {
      if (spinOn) globe.spin.rotation.y += dt * .12;
      if (turnTo !== null) {
        // turn the globe until the chosen longitude faces the camera
        const camLon = Math.atan2(-cam.position.z, cam.position.x), want = camLon - turnTo * PI / 180;
        let d = want - globe.spin.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); globe.spin.rotation.y += d * Math.min(1, dt * 3); if (Math.abs(d) < .005) turnTo = null;
      }
      globe.clouds.rotation.y += dt * .01;
      if (ctl.dist < 22) globe.loadSharp();
      const ps = clamp((ctl.dist - R) / 20, .06, 1); for (const p of pins) p.scale.setScalar(ps);
      if (realTime) { const ss = subsolar(); globe.spin.updateMatrixWorld(); E3.lightDir(globe, globe.spin.localToWorld(E3.latLonToVec(ss.lat, ss.lon)).normalize()); }
      else E3.lightDir(globe, sunDir.clone().applyAxisAngle(V3(0, 1, 0), Math.atan2(cam.position.x, cam.position.z)));
      // the closer you zoom, the slower dragging turns the globe
      ctl.rotSpeed = clamp((ctl.dist - R) / 22, .04, 1);
      return globeSc;
    },
    hud(ctx, dt) {
      if (label && label.life > 0) { label.life -= dt; ctx.globalAlpha = Math.min(1, label.life); hudPill(ctx, label.s, label.x, label.y, '#FFB52E', '#2A1600', 16); ctx.globalAlpha = 1; }
      hudText(ctx, 'Drag to spin · Pinch to zoom · Tap land, sea or a pin', W / 2, bottom() - 4, 13, '#C9D0F2', 'center', 600);
      if (realTime) {
        const now = new Date(), ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 6e4), h = ist.getHours(), mm = String(ist.getMinutes()).padStart(2, '0');
        const ss = subsolar(), india = E3.latLonToVec(22, 79), sun = E3.latLonToVec(ss.lat, ss.lon), day = india.dot(sun) > 0;
        ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, 16, top(), 230, 52, 12); ctx.fill();
        hudText(ctx, `In India: ${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}`, 28, top() + 22, 15, '#FFB52E', 'left');
        hudText(ctx, day ? 'Daytime there right now' : 'Night-time there right now', 28, top() + 42, 12, '#F3F1FF', 'left', 600);
      }
    }
  };

  /* ---------------- India from space: a real satellite picture */
  const IN = { lon0: 66, lon1: 98, lat0: 37, lat1: 5, img: null };
  const PINS = [['himalaya', 'Himalayas & Mount Everest', 27.99, 86.93], ['ganga', 'River Ganga', 25.4, 82.4], ['thar', 'Thar Desert', 27, 71.2], ['taj', 'Taj Mahal, Agra', 27.17, 78.04], ['sriharikota', 'Sriharikota launch pad', 13.72, 80.23], ['ghats', 'Western Ghats', 12.6, 75.4], ['sundarbans', 'Sundarbans', 21.95, 89.0], ['kanyakumari', 'Kanyakumari', 8.08, 77.55]];
  const CITIES = [['New Delhi', 28.61, 77.21], ['Mumbai', 19.08, 72.88], ['Kolkata', 22.57, 88.36], ['Chennai', 13.08, 80.27], ['Bengaluru', 12.97, 77.59]];
  let launch = null, inLabel = null;
  const inGeom = () => { const T0 = top(), B = bottom(), s = Math.min(W - 32, B - T0); return { s, x: (W - s) / 2, y: T0 + (B - T0 - s) / 2 }; };
  const toMap = (lat, lon, gm) => [gm.x + (lon - IN.lon0) / (IN.lon1 - IN.lon0) * gm.s, gm.y + (IN.lat0 - lat) / (IN.lat0 - IN.lat1) * gm.s];
  M.india = {
    flat: true,
    enter() { setCtl([]); if (!IN.img) { IN.img = new Image(); E3.loadScript('tex/india.js').then(() => { IN.img.src = TEXDATA.india; }); } },
    tap(x, y) { const gm = inGeom(); for (const [id, nm, la, lo] of PINS) { const [px, py] = toMap(la, lo, gm); if (Math.hypot(x - px, y - (py - 14)) < 24) { inLabel = { s: nm, x: px, y: py - 34, life: 4.5 }; Sfx.twinkle(); Voice.say('in_' + id); if (id === 'sriharikota') launch = { x: px, y: py, t: 0 }; return; } } },
    hud(ctx, dt) {
      drawSky(ctx, W, H, t, 0, 0, dt);
      const gm = inGeom();
      if (IN.img.complete && IN.img.naturalWidth) { ctx.drawImage(IN.img, gm.x, gm.y, gm.s, gm.s); ctx.strokeStyle = '#2B3A7A'; ctx.lineWidth = 2; ctx.strokeRect(gm.x, gm.y, gm.s, gm.s); }
      const fs = clamp(gm.s / 45, 10, 14);
      for (const [nm, la, lo] of [['Arabian Sea', 15, 67.5], ['Bay of Bengal', 15, 87.5], ['Indian Ocean', 6.5, 82]]) { const [x, y] = toMap(la, lo, gm); hudText(ctx, nm, x, y, fs, 'rgba(210,230,255,.9)', 'center', 600); }
      for (const [nm, la, lo] of CITIES) { const [x, y] = toMap(la, lo, gm); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); ctx.strokeStyle = '#0D1434'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.save(); ctx.shadowColor = '#000'; ctx.shadowBlur = 4; hudText(ctx, nm, x + 6, y + 4, fs * .9, '#FFFFFF', 'left', 600); ctx.restore(); }
      for (const [, , la, lo] of PINS) {
        const [x, y] = toMap(la, lo, gm), bob = Math.sin(t * 3 + la) * 2;
        ctx.fillStyle = '#FFB52E'; ctx.beginPath(); ctx.arc(x, y - 14 + bob, 10, PI * .85, PI * .15); ctx.lineTo(x, y + bob); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2A1600'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#2A1600'; ctx.beginPath(); ctx.arc(x, y - 15 + bob, 4, 0, TAU); ctx.fill();
      }
      if (launch) { launch.t += dt; const k = launch.t, ry = launch.y - k * k * 120; ctx.fillStyle = '#FFB52E'; ctx.beginPath(); ctx.moveTo(launch.x - 4, ry + 14); ctx.lineTo(launch.x, ry + 30 + Math.random() * 8); ctx.lineTo(launch.x + 4, ry + 14); ctx.fill(); ctx.fillStyle = '#F3F4F8'; ctx.beginPath(); ctx.moveTo(launch.x, ry - 18); ctx.lineTo(launch.x + 5, ry - 6); ctx.lineTo(launch.x + 5, ry + 14); ctx.lineTo(launch.x - 5, ry + 14); ctx.lineTo(launch.x - 5, ry - 6); ctx.fill(); if (k > 4) launch = null; }
      if (inLabel && inLabel.life > 0) { inLabel.life -= dt; hudPill(ctx, inLabel.s, inLabel.x, inLabel.y, '#FFB52E', '#2A1600', 15); }
      hudText(ctx, 'India and its neighbours, seen from space · Tap a pin', W / 2, gm.y + gm.s - 8, 12, '#FFFFFF', 'center', 600);
    }
  };

  /* ---------------- inside the Earth: a real 3D cut-away */
  let inSc, inEarth, drill, digger, depth = 0, layerSaid = '';
  const LAYERS = [[1, '#9A6A44'], [.985, '#C4482A'], [.55, '#F09A2A'], [.19, '#FFF0B8']];
  M.inside = {
    make() {
      inSc = new T.Scene(); inSc.add(E3.starfield(6000)); inSc.add(new T.AmbientLight(0xffffff, .35));
      const sl = new T.DirectionalLight(0xffffff, 1.2); sl.position.set(-40, 30, 60); inSc.add(sl);
      // remove the quarter of the Earth facing us so the layers show
      const planes = [new T.Plane(V3(-1, 0, 0), 0), new T.Plane(V3(0, 0, -1), 0)];
      inEarth = E3.planet('earth', R, { seg: 160, noTilt: true }); inEarth.spin.rotation.y = -2.2; inSc.add(inEarth); inEarth.atmo.visible = false;
      inEarth.traverse(o => { if (o.material) { o.material.clippingPlanes = planes; o.material.clipIntersection = true; o.material.side = T.DoubleSide; } });
      // inner layers: spheres seen through the cut, plus the flat cut faces painted with the layers
      const ringsTex = E3.canvasTex(512, 512, (g, s) => { const c = s / 2; for (const [k, col] of LAYERS) { const gr = g.createRadialGradient(c, c, 0, c, c, c * k); gr.addColorStop(0, col); gr.addColorStop(1, new T.Color(col).multiplyScalar(.75).getStyle()); g.fillStyle = gr; g.beginPath(); g.arc(c, c, c * k, 0, TAU); g.fill(); } g.strokeStyle = 'rgba(255,220,160,.25)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { const a = Math.random() * TAU, rr = c * (.62 + Math.random() * .3); g.beginPath(); g.ellipse(c + Math.cos(a) * rr, c + Math.sin(a) * rr, 26, 12, a, 0, TAU); g.stroke(); } });
      for (const [rot, ax] of [[0, 'x'], [1, 'z']]) {
        const face = new T.Mesh(new T.CircleGeometry(R * .998, 96, 0, Math.PI), new T.MeshBasicMaterial({ map: ringsTex, side: T.DoubleSide }));
        if (ax === 'x') { face.rotation.set(0, -Math.PI / 2, -Math.PI / 2); } else { face.rotation.set(0, 0, -Math.PI / 2); face.rotation.y = 0; }
        face.material.clippingPlanes = [new T.Plane(ax === 'x' ? V3(0, 0, 1) : V3(1, 0, 0), 0)];
        inSc.add(face);
      }
      for (const [k, col] of LAYERS.slice(1)) { const s = new T.Mesh(new T.SphereGeometry(R * k, 96, 48), new T.MeshStandardMaterial({ color: col, roughness: .7, emissive: col, emissiveIntensity: k < .6 ? .45 : .15, clippingPlanes: planes, clipIntersection: true, side: T.BackSide })); inSc.add(s); }
      drill = new T.Group(); const shaft = E3.cyl(.08, .08, 1, E3.mats().metal, 10); shaft.position.y = -.5; drill.add(shaft); drill.shaft = shaft;
      const bit = new T.Mesh(new T.ConeGeometry(.25, .7, 16), new T.MeshStandardMaterial({ color: 0xffb52e, metalness: .6, roughness: .3 })); bit.rotation.x = Math.PI; drill.add(bit); drill.bit = bit;
      drill.position.set(.35, R, .35); inSc.add(drill);
      digger = E3.MODELS.astronaut(); digger.scale.setScalar(.9); digger.position.set(-.9, R * .99, 1.3); digger.rotation.y = .9; inSc.add(digger);
    },
    enter() { if (!inSc) this.make(); depth = 0; layerSaid = ''; r.localClippingEnabled = true; view({ goal: V3(0, 2, 0), dist: 34, min: 14, max: 70, yaw: .78, pitch: .35, snap: false }); setCtl([{ id: 'dig', icon: 'down', label: 'Dig deeper', hold: true, go: true }, { id: 'upward', icon: 'up', label: 'Go back up', hold: true }]); },
    frame(dt) {
      if (held.dig) depth = Math.min(1, depth + dt * .1); if (held.upward) depth = Math.max(0, depth - dt * .2);
      const y = R - depth * R;
      drill.bit.position.y = -depth * R; drill.bit.rotation.y += dt * 12; drill.shaft.scale.y = Math.max(.01, depth * R); drill.shaft.position.y = -depth * R / 2;
      digger.pose(held.dig ? t * 6 : 0, false);
      const layer = depth >= .808 ? 'inner' : depth >= .455 ? 'outer' : depth >= .03 ? 'mantle' : depth > .001 ? 'crust' : '';
      if (layer && layer !== layerSaid) { layerSaid = layer; Sfx.twinkle(); Voice.say('e_' + layer); }
      void y; return inSc;
    },
    hud(ctx) {
      const T0 = top(), km = Math.round(depth * 6371), tc = depth < .006 ? 15 + depth * 1e5 : depth < .455 ? lerp(1000, 3700, depth / .455) : depth < .808 ? lerp(4000, 5000, (depth - .455) / .35) : 5200;
      ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, 16, T0, 220, 74, 14); ctx.fill();
      hudText(ctx, `Depth: ${km.toLocaleString('en-IN')} km`, 30, T0 + 28, 18, '#FFB52E', 'left');
      hudText(ctx, `About ${Math.round(tc).toLocaleString('en-IN')} °C down here`, 30, T0 + 54, 13, '#F3F1FF', 'left', 600);
      for (const [nm, k, a] of [['Crust', 1.06, .55], ['Mantle', .77, .5], ['Outer core', .37, .35], ['Inner core', .02, 0]]) { const p = proj(V3(Math.cos(a) * R * k, Math.sin(a) * R * k, .05)); if (p.front) hudPill(ctx, nm, p.x, p.y, 'rgba(13,20,52,.85)', '#F3F1FF', 12); }
    }
  };

  /* ---------------- volcano: build up the pressure until it erupts */
  let vSc, vGround, lava, ash, flows = [], V = null, vLight;
  M.volcano = {
    make() {
      vSc = new T.Scene(); vSc.background = new T.Color(0x7fb2e0); vSc.fog = new T.Fog(0x9fc4e8, 120, 600);
      vSc.add(new T.HemisphereLight(0xdfefff, 0x4a3a2a, .7));
      const sl = new T.DirectionalLight(0xfff4e0, 1.3); sl.position.set(60, 90, 40); sl.castShadow = true; sl.shadow.mapSize.set(2048, 2048); const c = sl.shadow.camera; c.left = c.bottom = -80; c.right = c.top = 80; c.far = 400; vSc.add(sl);
      vGround = E3.terrain({ size: 500, seg: 200, amp: 4, freq: .012, seed: 5, color: 0x6a8a4a });
      const p = vGround.geometry.attributes.position, cone = (x, z) => { const d = Math.hypot(x, z); return d < 6 ? 36 - (6 - d) * 1.4 : Math.max(0, 40 * Math.exp(-Math.pow(d / 26, 1.6))); };
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + cone(x, z)); }
      vGround.geometry.computeVertexNormals();
      const colors = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const h = p.getY(i), k = smooth(8, 30, h); const c3 = new T.Color(0x3f6a2a).lerp(new T.Color(0x5a4636), k); colors[i * 3] = c3.r; colors[i * 3 + 1] = c3.g; colors[i * 3 + 2] = c3.b; }
      vGround.geometry.setAttribute('color', new T.BufferAttribute(colors, 3)); vGround.material.vertexColors = true; vGround.material.color.set(0xffffff);
      const baseH = vGround.height; vGround.height = (x, z) => baseH(x, z) + cone(x, z);
      vSc.add(vGround);
      const sea = new T.Mesh(new T.PlaneGeometry(3000, 3000), new T.MeshStandardMaterial({ color: 0x2a6fc0, roughness: .25, metalness: .2 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -1.5; vSc.add(sea);
      const crater = new T.Mesh(new T.CircleGeometry(5, 32), new T.MeshBasicMaterial({ color: 0xff6a20 })); crater.rotation.x = -Math.PI / 2; crater.position.y = 34; vSc.add(crater); vSc.crater = crater;
      vLight = new T.PointLight(0xff7a30, 0, 120); vLight.position.set(0, 40, 0); vSc.add(vLight);
      lava = makeParticles(1500, 0xff8a30, 1.6, true); vSc.add(lava);
      ash = makeParticles(400, 0x504848, 9, false); ash.material.opacity = .5; vSc.add(ash);
    },
    enter() { if (!vSc) this.make(); V = { p: 0, erupt: 0, flow: 0, cool: 0, said: false }; flows.forEach(f => vSc.remove(f)); flows = []; view({ goal: V3(0, 18, 0), dist: 120, min: 40, max: 250, yaw: .6, pitch: .22, snap: false }); setCtl([{ id: 'push', icon: 'up', label: 'Push the magma', go: true }]); },
    act(id) {
      if (id !== 'push' || V.erupt > 0) return;
      V.p = Math.min(1, V.p + .14); Sfx.tone(90 + V.p * 60, .3, 'sawtooth', .05);
      if (V.p >= 1) {
        V.erupt = 7; V.flow = 0; V.cool = 0; V.said = false; Sfx.whoosh(); Voice.say('e_erupt');
        // lava rivers running down the slopes
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * TAU + Math.random() * .5, pts = [];
          for (let i = 0; i <= 30; i++) { const d = 4 + i * 1.6, x = Math.cos(a + Math.sin(i * .3) * .15) * d, z = Math.sin(a + Math.sin(i * .3) * .15) * d; pts.push(V3(x, vGround.height(x, z) + .5, z)); }
          const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 60, 1.1, 8), new T.MeshStandardMaterial({ color: 0xff6a20, emissive: 0xff5a10, emissiveIntensity: 1.2, roughness: .6 }));
          tube.geometry.setDrawRange(0, 0); vSc.add(tube); flows.push(tube);
        }
      }
    },
    tap() { this.act('push'); },
    frame(dt) {
      if (V.erupt > 0) {
        V.erupt -= dt; V.flow = Math.min(1, V.flow + dt / 6);
        for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, s = 8 + Math.random() * 14; lava.emit(Math.cos(a), 36, Math.sin(a), Math.cos(a) * s * .5, 18 + Math.random() * 22, Math.sin(a) * s * .5, 3.5); }
        if (Math.random() < .7) ash.emit((Math.random() - .5) * 4, 40, (Math.random() - .5) * 4, 2 + Math.random() * 2, 8 + Math.random() * 6, (Math.random() - .5) * 2, 9);
        vLight.intensity = 3 + Math.random() * 2;
        ctl.goal.x = (Math.random() - .5) * .6; ctl.goal.y = 18 + (Math.random() - .5) * .6;
        if (V.erupt <= 0) V.cool = .001;
      } else { vLight.intensity = V.p * 1.5; ctl.goal.set(0, 18, 0); }
      lava.step(dt, 9.8, 0); ash.step(dt, -1, .2);
      for (const f of flows) {
        f.geometry.setDrawRange(0, Math.floor(V.flow * f.geometry.index.count));
        if (V.cool > 0) { const k = Math.min(1, V.cool); f.material.emissiveIntensity = 1.2 * (1 - k); f.material.color.set(0xff6a20).lerp(new T.Color(0x222020), k); }
      }
      vSc.crater.material.color.set(0xff6a20).lerp(new T.Color(0x3a2a20), V.erupt > 0 ? 0 : 1 - V.p);
      if (V.cool > 0) { V.cool += dt / 6; if (V.cool >= 1 && !V.said) { V.said = true; Voice.say('e_newland', () => { V.p = 0; V.erupt = 0; V.cool = 0; }); } }
      return vSc;
    },
    hud(ctx) {
      const T0 = top(); ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, 16, T0, 210, 40, 10); ctx.fill();
      hudText(ctx, V.erupt > 0 ? 'ERUPTING!' : `Magma pressure: ${Math.round(V.p * 100)}%`, 28, T0 + 16, 12, '#C9D0F2', 'left', 600);
      ctx.fillStyle = '#16215A'; roundRect(ctx, 28, T0 + 23, 186, 9, 4); ctx.fill(); ctx.fillStyle = V.p > .7 ? '#FF6D8A' : '#FFB52E'; roundRect(ctx, 28, T0 + 23, Math.max(6, 186 * (V.erupt > 0 ? 1 : V.p)), 9, 4); ctx.fill();
      if (!V.erupt && !V.cool) hudText(ctx, 'Press the button again and again!', W / 2, bottom() - 4, 13, '#16215A', 'center', 700);
    }
  };

  /* ---------------- water cycle: sea, sunshine, clouds, monsoon rain, river */
  let wSc, wGround, sea, river, clouds, vapour, rain, WC = null, sunObj;
  M.water = {
    make() {
      wSc = new T.Scene(); wSc.background = new T.Color(0x6eb2ea); wSc.fog = new T.Fog(0xa6d0f0, 150, 500);
      wSc.add(new T.HemisphereLight(0xe8f4ff, 0x3a4a2a, .75));
      const sl = new T.DirectionalLight(0xfff4e0, 1.3); sl.position.set(-60, 80, 40); sl.castShadow = true; sl.shadow.mapSize.set(2048, 2048); const c = sl.shadow.camera; c.left = c.bottom = -90; c.right = c.top = 90; c.far = 400; wSc.add(sl);
      wGround = E3.terrain({ size: 400, seg: 180, amp: 3, freq: .015, seed: 14, color: 0x6a9a48 });
      const p = wGround.geometry.attributes.position, shape = (x, z) => { const land = smooth(-20, 10, x); return -6 + land * 7 + Math.max(0, 46 * Math.exp(-Math.pow(Math.hypot(x - 70, z + 10) / 26, 1.5))); };
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) * smooth(-10, 10, x) + shape(x, z)); }
      wGround.geometry.computeVertexNormals();
      const colors = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const h = p.getY(i), c3 = h < .6 ? new T.Color(0xe0cc98) : h > 34 ? new T.Color(0xf4f7fb) : h > 20 ? new T.Color(0x7a7a6a) : new T.Color(0x5f9a44); colors[i * 3] = c3.r; colors[i * 3 + 1] = c3.g; colors[i * 3 + 2] = c3.b; }
      wGround.geometry.setAttribute('color', new T.BufferAttribute(colors, 3)); wGround.material.vertexColors = true; wGround.material.color.set(0xffffff);
      const bh = wGround.height; wGround.height = (x, z) => bh(x, z) * smooth(-10, 10, x) + shape(x, z);
      wSc.add(wGround);
      sea = new T.Mesh(new T.PlaneGeometry(2000, 2000, 1, 1), new T.MeshStandardMaterial({ color: 0x1f6fc0, roughness: .2, metalness: .3 })); sea.rotation.x = -Math.PI / 2; sea.position.y = 0; wSc.add(sea);
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40, x = lerp(62, -6, u), z = -10 + Math.sin(u * 7) * 9 + u * 20; pts.push(V3(x, wGround.height(x, z) + .5, z)); }
      const flowTex = E3.canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#3a8ae8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(Math.random() * w, i * 26); g.lineTo(Math.random() * w, i * 26 + 14); g.stroke(); } }, true);
      river = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 120, 1.2, 8), new T.MeshStandardMaterial({ map: flowTex, roughness: .2, transparent: true, opacity: .35 })); river.scale.y = 1; wSc.add(river);
      sunObj = new T.Group(); const core = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ color: 0xfff1b0, fog: false })); sunObj.add(core); const gl = E3.glow(0xffe8a0, 90, .9); gl.material.fog = false; sunObj.add(gl); sunObj.position.set(-140, 110, -120); wSc.add(sunObj); sunObj.core = core;
      clouds = new T.Group(); for (let i = 0; i < 9; i++) { const s = E3.glow(0xffffff, 26, .85); s.material.blending = T.NormalBlending; s.position.set((i % 3 - 1) * 12, Math.floor(i / 3) * 3, (Math.floor(i / 3) - 1) * 8); clouds.add(s); } clouds.position.set(-40, 50, 0); clouds.scale.setScalar(.01); wSc.add(clouds);
      vapour = makeParticles(600, 0xffffff, 1.6, false); vapour.material.opacity = .55; wSc.add(vapour);
      rain = makeParticles(1500, 0x3a7ad8, .7, false); wSc.add(rain);
    },
    enter() { if (!wSc) this.make(); WC = { st: 'idle', k: 0, cloud: .01, river: .35, move: 0 }; clouds.position.set(-40, 50, 0); view({ goal: V3(10, 14, 0), dist: 150, min: 60, max: 260, yaw: .25, pitch: .22, snap: false }); setCtl([{ id: 'sun', label: 'Warm the sea', go: true }, { id: 'cloud', label: 'Grow the clouds', cyan: true }, { id: 'again', icon: 'again', label: 'Start again' }]); },
    act(id) {
      if (id === 'again') { this.enter(); return; }
      if (id === 'sun' && WC.st === 'idle') { WC.st = 'evap'; WC.k = 0; Sfx.twinkle(); Voice.say('e_evap'); }
      if (id === 'cloud' && WC.st === 'cloud') { WC.cloud = Math.min(1.8, WC.cloud + .22); Sfx.tap(); if (WC.cloud >= 1.8) { WC.st = 'move'; WC.k = 0; } }
    },
    tap(x, y) { const s = proj(sunObj.position.clone()), c = proj(clouds.position.clone()); if (Math.hypot(x - s.x, y - s.y) < 70) this.act('sun'); else if (Math.hypot(x - c.x, y - c.y) < 110) this.act('cloud'); },
    frame(dt) {
      if (WC.st === 'evap') {
        WC.k += dt; for (let i = 0; i < 4; i++) vapour.emit(-90 + Math.random() * 80, .5, (Math.random() - .5) * 120, 0, 6 + Math.random() * 4, 0, 7);
        WC.cloud = Math.min(.7, WC.cloud + dt * .1);
        if (WC.k > 7) { WC.st = 'cloud'; Voice.say('e_cloud'); }
      }
      if (WC.st === 'move') { WC.move = Math.min(1, WC.move + dt / 5); clouds.position.x = lerp(-40, 62, WC.move); if (WC.move >= 1) { WC.st = 'rain'; WC.k = 0; Voice.say('e_rain'); } }
      if (WC.st === 'rain') {
        WC.k += dt; for (let i = 0; i < 25; i++) rain.emit(clouds.position.x + (Math.random() - .5) * 40 * WC.cloud, clouds.position.y - 2, (Math.random() - .5) * 30 * WC.cloud, 0, -40, 0, 2);
        WC.river = Math.min(1, WC.river + dt * .12); WC.cloud = Math.max(.6, WC.cloud - dt * .1);
        if (WC.k > 8) { WC.st = 'river'; Voice.say('e_river', () => { if (WC.st === 'river') { WC.st = 'idle'; WC.cloud = .01; WC.move = 0; clouds.position.x = -40; } }); }
      }
      clouds.scale.setScalar(Math.max(.01, WC.cloud));
      const dark = clamp((WC.cloud - .7) / 1, 0, .6); clouds.children.forEach(s => s.material.color.setRGB(1 - dark * .55, 1 - dark * .5, 1 - dark * .4));
      vapour.step(dt, 0, 0); rain.step(dt, 0, 0);
      river.material.opacity = .35 + WC.river * .6; if (river.material.map) river.material.map.offset.y -= dt * (.2 + WC.river);
      sunObj.core.scale.setScalar(WC.st === 'idle' ? 1 + Math.sin(t * 4) * .06 : 1);
      return wSc;
    },
    hud(ctx) {
      const T0 = top(), steps = ['Sun warms the sea', 'Vapour rises', 'Clouds form', 'Rain falls', 'Rivers flow back'], at = { idle: 0, evap: 1, cloud: 2, move: 2, rain: 3, river: 4 }[WC.st];
      const bw = Math.min(W - 32, 600), bx = (W - bw) / 2;
      steps.forEach((s, i) => { const x = bx + (i + .5) * bw / 5; ctx.fillStyle = i === at ? '#FFB52E' : 'rgba(13,20,52,.8)'; roundRect(ctx, x - bw / 10 + 3, T0 - 6, bw / 5 - 6, 28, 14); ctx.fill(); hudText(ctx, s, x, T0 + 13, clamp(bw / 48, 9, 12), i === at ? '#2A1600' : '#E6E9FF', 'center', 700); });
      const sp = proj(sunObj.position.clone()); if (WC.st === 'idle' && sp.front) hudPill(ctx, 'Tap the Sun!', sp.x, sp.y + 60, '#FFB52E', '#2A1600', 14);
      const cp = proj(clouds.position.clone()); if (WC.st === 'cloud' && cp.front) hudPill(ctx, 'Tap the cloud!', cp.x, cp.y + 50, '#59E0E8', '#062A2E', 14);
      if (WC.st === 'move' && cp.front) hudPill(ctx, 'Monsoon winds blow the clouds to the mountains', cp.x, cp.y + 50, 'rgba(13,20,52,.85)', '#F3F1FF', 13);
    }
  };

  function setMode(m) {
    M[mode]?.leave?.(); places(null);
    mode = m; Sfx.tap(); Voice.stop();
    $$('#earthModes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m ? 'true' : 'false'));
    r.localClippingEnabled = m === 'inside';
    M[m].enter();
    const line = M[m].line || { globe: 'e_globe', india: 'e_india', inside: 'e_inside', volcano: 'e_volcano', water: 'e_water' }[m];
    if (line) Voice.say(line);
    $(`#earthModes [data-m="${m}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  $$('#earthModes button').forEach(b => b.addEventListener('click', () => { if (!ready) init(); setMode(b.dataset.m); }));
  $('#earthBack').addEventListener('click', () => { Sfx.whoosh(); show('explore', true); Voice.say('visit_back'); });

  function frame(dt) {
    if (!ready) init();
    t += dt;
    const m = M[mode];
    const ctx = ov.getContext('2d'), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    if (m.flat) { r.domElement.hidden = true; m.hud(ctx, dt); return; }
    r.domElement.hidden = false;
    const sc = m.frame(dt);
    E3.fit(r, cam); ctl.update(dt); r.render(sc, cam);
    m.hud(ctx, dt);
  }
  return {
    frame, layout,
    enter(quiet) {
      if (!ready) init();
      E3.attach(ov); layout();
      if (!seenIntro.earth) {
        seenIntro.earth = true; mode = 'globe'; $$('#earthModes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === 'globe' ? 'true' : 'false'));
        r.localClippingEnabled = false; M.globe.enter();
        Voice.say('e_intro', () => { if (current === 'earth' && mode === 'globe') Voice.say('e_globe'); });
      } else if (!quiet) setMode(mode);
      else { r.localClippingEnabled = mode === 'inside'; M[mode].enter(); }
    },
    leave() { for (const k in held) held[k] = false; M[mode]?.leave?.(); places(null); if (r) { r.localClippingEnabled = false; r.domElement.hidden = false; } },
    // for earthfx.js
    api: { M, setCtl, places, view, held, proj, top, bottom, get r() { return r; }, get cam() { return cam; }, get ctl() { return ctl; }, get W() { return W; }, get H() { return H; }, get t() { return t; }, get mode() { return mode; } }
  };
})();
