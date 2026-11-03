/* What If…? A big imagination question, three choices, then a 3D scene shows what would really happen.
   Uses E3 (engine3d.js), makeParticles / hudText / hudPill from craft.js and the shared helpers in index.html. */
'use strict';
views.whatif = (() => {
  const T = THREE, ov = $('#whatifCv');
  ov.classList.add('over2d');
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  let r, cam, ctl, ready = false, W = 0, H = 0, t = 0, qi = 0, stars = [], tried = false, state = 'ask', k = 0, sc = null, cur = null, started = false;
  const circle = (rad, n = 200) => Array.from({ length: n + 1 }, (_, i) => V3(Math.cos(i / n * TAU) * rad, 0, -Math.sin(i / n * TAU) * rad));
  const line = (pts, color, op = .4) => new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
  const label3 = (ctx, v, s, bg = 'rgba(13,20,52,.85)', fg = '#F3F1FF', size = 13) => { const p = E3.toScreen(v, cam, W, H); if (p.front && p.x > 0 && p.x < W && p.y > 0 && p.y < H) hudPill(ctx, s, p.x, p.y, bg, fg, size); };
  const panel = (ctx, lines) => {
    const x = 16, y = H - 150, w = Math.min(300, W - 32), h = 22 + lines.length * 20;
    ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, x, y - h, w, h, 12); ctx.fill();
    lines.forEach((l, i) => hudText(ctx, l, x + 14, y - h + 24 + i * 20, i ? 13 : 15, i ? '#F3F1FF' : '#FFB52E', 'left', i ? 600 : 700));
  };

  function init() {
    r = E3.attach(ov); r.shadowMap.enabled = true; E3.mats(r);
    cam = new T.PerspectiveCamera(45, 1, .05, 60000);
    ctl = new E3.Orbit(cam, ov, { dist: 80 });
    ready = true;
  }
  function view(o) {
    if (o.dist > 15 && H > W && W) o = { ...o, dist: o.dist * Math.min(1.9, H / W * .9) };   // tall phone screens see less from side to side
    ctl.follow = o.follow || null; ctl.goal.copy(o.goal || V3()); ctl.goalDist = o.dist; ctl.min = o.min ?? 1; ctl.max = o.max ?? 2000;
    ctl.goalYaw = o.yaw ?? 0; ctl.goalPitch = o.pitch ?? .3; ctl.minPitch = o.minPitch ?? -1.4; ctl.maxPitch = o.maxPitch ?? 1.4; ctl.auto = o.auto || 0;
    cam.fov = o.fov || 45; cam.updateProjectionMatrix(); ctl.retarget(); ctl.snap();
  }
  function layout() { if (!ready) return; E3.attach(ov); const f = fitCanvas(ov); W = f.w; H = f.h; E3.fit(r, cam); }

  /* ---------------- scene builders */
  function spaceScene(o = {}) {
    const s = new T.Scene(); s.add(E3.starfield(9000)); s.amb = new T.AmbientLight(0xffffff, o.ambient ?? .06); s.add(s.amb);
    if (o.sun !== false) { s.sunObj = E3.planet('sun', o.sunR || 6, { seg: 64 }); s.add(s.sunObj); s.light = new T.PointLight(0xfff4e0, 1.9, 0, 0); s.add(s.light); }
    return s;
  }
  function groundScene(o = {}) {
    const s = new T.Scene(); s.background = new T.Color(o.sky ?? 0x78b6ea); s.fog = new T.Fog(o.sky ?? 0x78b6ea, 160, 600);
    s.stars = E3.starfield(3000); s.stars.traverse(m => { if (m.material) { m.material.transparent = true; m.material.opacity = 0; m.material.fog = false; } }); s.add(s.stars);
    s.hemi = new T.HemisphereLight(0xeaf4ff, 0x3a4a2a, .75); s.add(s.hemi);
    s.sl = new T.DirectionalLight(0xfff4e0, 1.3); s.sl.position.set(40, 60, 30); s.sl.castShadow = true; s.sl.shadow.mapSize.set(2048, 2048); const c = s.sl.shadow.camera; c.left = c.bottom = -40; c.right = c.top = 40; c.far = 300; s.add(s.sl);
    s.ground = E3.terrain({ size: 800, seg: 140, amp: o.amp ?? 8, freq: .006, seed: o.seed || 61, color: o.grass ?? 0x4f8a3a, flat: [[0, 0, 40]] }); s.add(s.ground);
    const trunk = new T.MeshStandardMaterial({ color: 0x5a3e28 }), leaf = new T.MeshStandardMaterial({ color: 0x2f6a2a });
    s.trees = [];
    for (let i = 0; i < (o.trees ?? 30); i++) { const x = (Math.random() - .5) * 260, z = -10 - Math.random() * 200; if (Math.abs(x) < 10 && z > -20) continue; const tr = new T.Group(); tr.add(E3.at(E3.cyl(.35, .5, 4, trunk, 8), 0, 2, 0)); const f = E3.sph(2.2 + Math.random(), leaf, 12); f.position.y = 5.2; tr.add(f); tr.position.set(x, s.ground.height(x, z), z); tr.traverse(m => { if (m.isMesh) m.castShadow = true; }); s.add(tr); s.trees.push(tr); }
    s.me = E3.MODELS.astronaut(); s.me.position.set(0, s.ground.height(0, -4), -4); s.me.rotation.y = .3; s.add(s.me);
    return s;
  }
  const groundView = (o = {}) => view({ goal: V3(0, o.y ?? 3, -4), dist: o.dist ?? 9, yaw: o.yaw ?? .25, pitch: o.pitch ?? .12, min: 3, max: 30, minPitch: -1, maxPitch: .9 });

  /* ---------------- the ten what ifs. opts: the right answer first. */
  const WI = [
    { id: 'sun', opts: ['Earth gets dark and freezing cold', 'Earth gets hotter and hotter', 'Nothing changes'],
      make() {
        const s = spaceScene({ ambient: .03 }); s.add(line(circle(40), 0x8ca0ff, .35));
        s.earth = E3.planet('earth', 3, { seg: 96 }); s.add(s.earth);
        s.frost = new T.Mesh(new T.SphereGeometry(3.06, 64, 32), new T.MeshStandardMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0, roughness: .4 })); s.earth.add(s.frost);
        s.pulse = new T.Mesh(new T.SphereGeometry(1, 48, 24), new T.MeshBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: .25, side: T.BackSide, depthWrite: false })); s.add(s.pulse);
        s.path = line([V3(), V3()], 0xffb52e, .8); s.add(s.path);
        return s;
      },
      reset(s) { s.a = .6; s.sunObj.visible = true; s.light.intensity = 1.9; s.earth.body.material.uniforms.dayK.value = 1; s.frost.material.opacity = 0; s.pulse.visible = false; s.path.visible = false; s.drift = null; view({ follow: g => g.copy(s.earth.position), dist: 30, yaw: .9, pitch: .45, min: 6, max: 200 }); },
      frame(s, dt) {
        if (state !== 'show') { s.a += dt * .15; s.earth.position.set(Math.cos(s.a) * 40, 0, -Math.sin(s.a) * 40); }
        else {
          s.sunObj.visible = false;
          if (k < .32) { s.a += dt * .15; s.earth.position.set(Math.cos(s.a) * 40, 0, -Math.sin(s.a) * 40); s.pulse.visible = true; s.pulse.scale.setScalar(Math.max(.01, k / .32 * 40)); }
          else {
            s.pulse.visible = false; s.light.intensity = Math.max(0, s.light.intensity - dt * 3);
            if (!s.drift) { s.drift = { p: s.earth.position.clone(), v: V3(-Math.sin(s.a), 0, -Math.cos(s.a)).multiplyScalar(6) }; s.path.visible = true; }
            s.earth.position.addScaledVector(s.drift.v, dt);
            s.path.geometry.setFromPoints([s.drift.p, s.earth.position.clone()]);
            s.frost.material.opacity = smooth(.45, 1, k) * .75;
          }
        }
        s.earth.spin.rotation.y += dt * .6; E3.lightPlanet(s.earth, V3());
        s.earth.body.material.uniforms.dayK.value = s.light.intensity / 1.9;
        if (s.earth.atmo) s.earth.atmo.material.uniforms.s.value = 1.25 * s.light.intensity / 1.9;
      },
      hud(s, ctx) {
        if (state !== 'show') return;
        const left = Math.max(0, 8 * (1 - k / .32)), m = Math.floor(left), sec = Math.round((left - m) * 60);
        const temp = k < .32 ? 15 : Math.round(lerp(15, -150, smooth(.32, 1, k)));
        panel(ctx, [k < .32 ? 'The last sunlight is still on its way' : 'Dark and freezing', k < .32 ? `Sunlight reaches Earth in: ${m}:${String(sec).padStart(2, '0')}` : 'No sunlight at all', `Temperature: ${temp} °C`, k > .4 ? 'Earth drifts off in a straight line' : '']);
      } },
    { id: 'moon', opts: ['The tides become much smaller', 'Earth falls into the Sun', 'The oceans dry up'],
      make() {
        const s = spaceScene({ sun: false, ambient: .12 }); const sd = V3(1, .2, .4).normalize(), dl = new T.DirectionalLight(0xffffff, 1.5); dl.position.copy(sd).multiplyScalar(100); s.add(dl);
        s.earth = E3.planet('earth', 8, { seg: 128, noTilt: true }); s.add(s.earth); E3.lightDir(s.earth, sd);
        s.bg = new T.Group(); s.add(s.bg);
        s.bulge = new T.Mesh(new T.SphereGeometry(8, 96, 48), new T.MeshStandardMaterial({ color: 0x3a8ff0, transparent: true, opacity: .5, roughness: .15, depthWrite: false })); s.bg.add(s.bulge);
        s.moon = E3.planet('moon', 2.2, { seg: 64 }); s.add(s.moon); E3.lightDir(s.moon, sd);
        s.add(line(circle(34), 0x8ca0ff, .25));
        s.sparkle = makeParticles(300, 0xffffff, .6, true); s.add(s.sparkle);
        return s;
      },
      reset(s) { s.ma = .3; s.moon.visible = true; s.moon.scale.setScalar(1); s.bulge.scale.set(1.14, .985, .985); view({ dist: 80, pitch: .95, yaw: .4, min: 14, max: 200 }); },
      frame(s, dt) {
        s.ma += dt * .08; s.earth.spin.rotation.y += dt * .4; s.moon.position.set(Math.cos(s.ma) * 34, 0, -Math.sin(s.ma) * 34); s.bg.rotation.y = s.ma;
        if (state === 'show') {
          const g = 1 - smooth(.05, .3, k); s.moon.scale.setScalar(Math.max(.001, g)); s.moon.visible = g > .01;
          if (k < .3) for (let i = 0; i < 6; i++) s.sparkle.emit(s.moon.position.x, s.moon.position.y, s.moon.position.z, (Math.random() - .5) * 8, (Math.random() - .5) * 8, (Math.random() - .5) * 8, 1.5);
          s.bulge.scale.x = lerp(1.14, 1.045, smooth(.25, .6, k));
        }
        s.sparkle.step(dt, 0, .5);
      },
      hud(s, ctx) {
        if (state !== 'show') { label3(ctx, s.moon.position.clone().add(V3(0, 3.4, 0)), 'Moon'); return; }
        panel(ctx, ['No Moon!', `Tides: ${k < .5 ? 'shrinking…' : 'only a third as big'}`, 'Nights: much darker, no moonlight']);
      } },
    { id: 'spin', opts: ['One day lasts a whole year', 'It is night everywhere, forever', 'The Moon falls down'],
      make() {
        const s = spaceScene({ ambient: .05 }); s.add(line(circle(36), 0x8ca0ff, .3));
        s.earth = E3.planet('earth', 3.4, { seg: 96, noTilt: true }); s.add(s.earth);
        s.pin = new T.Mesh(new T.SphereGeometry(.2, 16, 8), new T.MeshBasicMaterial({ color: 0xffb52e })); s.pin.position.copy(E3.latLonToVec(21, 78, 3.42)); s.earth.spin.add(s.pin);
        return s;
      },
      reset(s) { s.a = .4; s.spinRate = 4; s.days = 0; view({ follow: g => g.copy(s.earth.position), dist: 22, yaw: 1.1, pitch: .5, min: 6, max: 160 }); },
      frame(s, dt) {
        const rate = state === 'show' ? 4 * (1 - smooth(0, .45, k)) : 4;
        s.a += dt * .12; s.earth.position.set(Math.cos(s.a) * 36, 0, -Math.sin(s.a) * 36);
        s.earth.spin.rotation.y += dt * rate; E3.lightPlanet(s.earth, V3());
        if (state === 'show' && k > .45) ctl.goalDist = lerp(22, 110, smooth(.45, .7, k));
      },
      hud(s, ctx) {
        if (state !== 'show') return;
        const p = s.pin.getWorldPosition(V3()), lit = p.clone().sub(s.earth.position).dot(s.earth.position.clone().negate()) > 0;
        panel(ctx, [k < .45 ? 'Earth is slowing down…' : 'Earth has stopped spinning', `One day now lasts: ${k < .45 ? Math.round(lerp(24, 400, smooth(0, .45, k) ** 3)) + ' hours' : 'a whole year!'}`, `India right now: ${lit ? 'months of daylight' : 'months of night'}`]);
      } },
    { id: 'close', opts: ['Far too hot, with boiling oceans', 'Nice and warm', 'It snows everywhere'],
      make() {
        const s = spaceScene({ ambient: .06 }); s.add(line(circle(40), 0x8ca0ff, .35)); s.add(line(circle(26), 0xffd8a0, .5));
        s.earth = E3.planet('earth', 3, { seg: 96 }); s.add(s.earth);
        s.haze = new T.Mesh(new T.SphereGeometry(3.12, 64, 32), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0, roughness: 1 })); s.earth.add(s.haze);
        E3.tex('venus').ready.then(tx => { s.haze.material.map = tx; s.haze.material.needsUpdate = true; });
        s.steam = makeParticles(500, 0xfff2dc, .7, false); s.add(s.steam);
        return s;
      },
      reset(s) { s.a = .5; s.r = 40; s.haze.material.opacity = 0; view({ dist: 115, pitch: .65, yaw: .4, min: 20, max: 260 }); },
      frame(s, dt) {
        s.a += dt * .12 * Math.pow(40 / s.r, 1.5);
        if (state === 'show') s.r = lerp(40, 26, smooth(0, .4, k));
        s.earth.position.set(Math.cos(s.a) * s.r, 0, -Math.sin(s.a) * s.r);
        s.earth.spin.rotation.y += dt * .6; E3.lightPlanet(s.earth, V3());
        if (state === 'show') { s.haze.material.opacity = smooth(.35, .85, k) * .92; if (k > .3 && k < .9) for (let i = 0; i < 4; i++) { const d = V3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(); s.steam.emit(s.earth.position.x + d.x * 3.2, s.earth.position.y + d.y * 3.2, s.earth.position.z + d.z * 3.2, d.x * 2, d.y * 2, d.z * 2, 1.4); } }
        s.steam.step(dt, 0, .3);
      },
      hud(s, ctx) {
        label3(ctx, V3(Math.cos(2.4) * 26, 0, -Math.sin(2.4) * 26), "Venus's path", 'rgba(13,20,52,.75)', '#FFD8A0', 11);
        if (state !== 'show') return;
        panel(ctx, ['Earth moves closer to the Sun', `Temperature: ${Math.round(lerp(15, 460, smooth(0, .85, k)))} °C`, k > .35 ? 'The oceans are boiling away!' : 'Getting hotter…']);
      } },
    { id: 'grav', opts: ['Everything floats away', 'Everything gets heavier', 'Only birds float'],
      make() {
        const s = groundScene({ seed: 63 });
        const items = []; const M = E3.mats();
        const ball = new T.Mesh(new T.SphereGeometry(.5, 24, 12), new T.MeshStandardMaterial({ color: 0xff6d8a, roughness: .5 })); ball.position.set(2.5, s.ground.height(2.5, -3) + .5, -3); s.add(ball); items.push(ball);
        const pond = new T.Mesh(new T.CircleGeometry(4, 32), new T.MeshStandardMaterial({ color: 0x2a6fc0, roughness: .1, metalness: .2 })); pond.rotation.x = -PI / 2; pond.position.set(-7, s.ground.height(-7, -8) + .08, -8); s.add(pond); s.pond = pond;
        for (let i = 0; i < 18; i++) { const rk = new T.Mesh(new T.DodecahedronGeometry(.25 + Math.random() * .4, 0), new T.MeshStandardMaterial({ color: 0x8a8070 })); const x = (Math.random() - .5) * 20, z = -2 - Math.random() * 14; rk.position.set(x, s.ground.height(x, z) + .2, z); s.add(rk); items.push(rk); }
        const bench = new T.Group(); bench.add(E3.at(E3.box(3, .2, .9, M.orange), 0, .9, 0)); for (const x of [-1.2, 1.2]) bench.add(E3.at(E3.box(.15, .9, .8, M.dark), x, .45, 0)); bench.position.set(5, s.ground.height(5, -8), -8); s.add(bench); items.push(bench);
        s.items = items.concat([s.me]); s.items.forEach(o => { o.home = o.position.clone(); o.spinv = V3(Math.random() - .5, Math.random() - .5, Math.random() - .5); o.lift = .6 + Math.random() * .8; });
        s.drops = makeParticles(600, 0x6ab0ff, .35, false); s.add(s.drops);
        return s;
      },
      reset(s) { s.items.forEach(o => { o.position.copy(o.home); o.rotation.set(0, o === s.me ? .3 : 0, 0); }); groundView({ dist: 14, pitch: .2 }); },
      frame(s, dt) {
        s.me.pose(state === 'show' ? t * 2 : 0, state === 'show');
        if (state !== 'show') return;
        const up = Math.pow(smooth(.03, 1, k), 1.3) * 22;
        s.items.forEach(o => { o.position.copy(o.home).add(V3(Math.sin(t + o.home.x) * .3 * up / 22, up * o.lift, 0)); o.rotation.x += o.spinv.x * dt; o.rotation.z += o.spinv.z * dt; });
        if (k > .05) for (let i = 0; i < 6; i++) s.drops.emit(s.pond.position.x + (Math.random() - .5) * 6, s.pond.position.y + .1, s.pond.position.z + (Math.random() - .5) * 6, (Math.random() - .5) * .4, 1.5 + Math.random() * 2, (Math.random() - .5) * .4, 8);
        s.drops.step(dt, 0, 0);
        ctl.goal.y = 3 + up * .5;
      },
      hud(s, ctx) { if (state === 'show') panel(ctx, ['Gravity: switched OFF', 'Ayansh, the ball, the bench and the water…', 'everything floats up and away!']); } },
    { id: 'rings', opts: ['A giant shining arch across the sky', 'It rains ice every day', 'We never see the Sun again'],
      make() {
        const s = groundScene({ seed: 67, trees: 24 });
        const g = new T.RingGeometry(1500, 2400, 200, 1), uv = g.attributes.uv, p = g.attributes.position;
        for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.hypot(p.getX(i), p.getY(i)) - 1500) / 900, .5);
        s.ring = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, fog: false }));
        E3.tex('saturn_ring').ready.then(tx => { s.ring.material.map = tx; s.ring.material.needsUpdate = true; });
        s.ring.rotation.x = -PI / 2 + .55; s.ring.position.set(0, -260, 0); s.add(s.ring);
        return s;
      },
      reset(s) { s.ring.material.opacity = 0; s.background.set(0x78b6ea); s.fog.color.set(0x78b6ea); s.hemi.intensity = .75; s.sl.intensity = 1.3; s.stars.traverse(m => { if (m.material) m.material.opacity = 0; }); view({ goal: V3(0, 5, 0), dist: 3, yaw: 0, pitch: -.28, min: 2, max: 8, minPitch: -1.2, maxPitch: .3 }); },
      frame(s) {
        if (state !== 'show') return;
        s.ring.material.opacity = smooth(0, .3, k) * .95;
        const night = smooth(.45, .9, k), sky = new T.Color(0x78b6ea).lerp(new T.Color(0xd9824a), smooth(.35, .6, k) * (1 - night)).lerp(new T.Color(0x060a1e), night);
        s.background.copy(sky); s.fog.color.copy(sky); s.hemi.intensity = lerp(.75, .12, night); s.sl.intensity = lerp(1.3, 0, night);
        s.stars.traverse(m => { if (m.material) m.material.opacity = night; });
      },
      hud(s, ctx) { if (state === 'show') panel(ctx, ['Earth with rings!', k < .45 ? 'A shining arch in the daytime sky' : 'Glowing in the sunset… and all night long']); } },
    { id: 'air', opts: ['The sky is black, even in daytime', 'The sky turns green', 'It rains all the time'],
      make() {
        const s = groundScene({ seed: 71 });
        s.sunMesh = new T.Mesh(new T.SphereGeometry(14, 32, 16), new T.MeshBasicMaterial({ color: 0xffffff, fog: false })); s.sunMesh.position.set(-130, 120, -560); s.add(s.sunMesh);
        s.sunGlow = E3.glow(0xfff2c0, 220, .9); s.sunGlow.material.fog = false; s.sunGlow.position.copy(s.sunMesh.position); s.add(s.sunGlow);
        return s;
      },
      reset(s) { s.background.set(0x78b6ea); s.fog.color.set(0x78b6ea); s.fog.far = 600; s.hemi.intensity = .75; s.sunGlow.material.opacity = .9; s.stars.traverse(m => { if (m.material) m.material.opacity = 0; }); view({ goal: V3(0, 5, 0), dist: 4, yaw: .15, pitch: -.3, min: 2, max: 10, minPitch: -1.2, maxPitch: .4 }); },
      frame(s) {
        if (state !== 'show') return;
        const g = smooth(0, .6, k), sky = new T.Color(0x78b6ea).lerp(new T.Color(0x000004), g);
        s.background.copy(sky); s.fog.color.copy(sky); s.fog.far = lerp(600, 100000, g); s.hemi.intensity = lerp(.75, .1, g); s.sunGlow.material.opacity = lerp(.9, .05, g);
        s.stars.traverse(m => { if (m.material) m.material.opacity = g; });
      },
      hud(s, ctx) { if (state === 'show') panel(ctx, ['No air!', 'Sky: black, with stars at noon', 'Sound: silent · Breathing: impossible']); } },
    { id: 'moon2', opts: ['It looks bigger, with huge tides', 'It looks smaller', 'It turns into a star'],
      make() {
        const s = groundScene({ seed: 73, trees: 0, grass: 0xe8d3a0, amp: 3, sky: 0x2a3a6a });
        s.sea = new T.Mesh(new T.PlaneGeometry(3000, 3000), new T.MeshStandardMaterial({ color: 0x1f5fb0, roughness: .2, metalness: .3 })); s.sea.rotation.x = -PI / 2; s.sea.position.set(0, -2, -1600); s.add(s.sea);
        const sh = s.ground.geometry.attributes.position; for (let i = 0; i < sh.count; i++) { const z = sh.getZ(i); sh.setY(i, sh.getY(i) + smooth(-40, 30, z) * 6 - 4); } s.ground.geometry.computeVertexNormals();
        const base = s.ground.height; s.ground.height = (x, z) => base(x, z) + smooth(-40, 30, z) * 6 - 4;
        s.me.position.y = s.ground.height(0, -4);
        s.moon = E3.planet('moon', 22, { seg: 64 }); s.moon.position.set(70, 62, -600); s.moon.traverse(m => { if (m.material) m.material.fog = false; }); s.add(s.moon);
        s.hemi.intensity = .5; s.sl.intensity = .7; s.sl.color.set(0xcfe0ff);
        return s;
      },
      reset(s) { s.moon.scale.setScalar(1); s.sea.position.y = -2; E3.lightDir(s.moon, V3(.2, .3, 1)); view({ goal: V3(0, 4, -4), dist: 10, yaw: .1, pitch: -.02, min: 3, max: 30, minPitch: -1, maxPitch: .9 }); },
      frame(s) {
        if (state !== 'show') { s.sea.position.y = -2 + Math.sin(t * .6) * .2; return; }
        s.moon.scale.setScalar(lerp(1, 2, smooth(0, .4, k)));
        s.sea.position.y = -2 + smooth(.3, .8, k) * 5 + Math.sin(t * .8) * .5;
      },
      hud(s, ctx) { if (state === 'show') panel(ctx, ['The Moon comes twice as close', `Moon size: ${lerp(1, 2, smooth(0, .4, k)).toFixed(1)} times bigger`, k > .3 ? 'Tides: huge! The sea rushes up the beach' : '']); } },
    { id: 'tilt', opts: ['No summer or winter', 'Every day is a holiday', 'The Moon disappears'],
      make() {
        const s = spaceScene({ ambient: .06 }); s.add(line(circle(40), 0x8ca0ff, .3));
        s.earth = E3.planet('earth', 3.4, { seg: 96 }); s.add(s.earth);
        s.axis = line([V3(0, -5.6, 0), V3(0, 5.6, 0)], 0xffb52e, .9); s.earth.add(s.axis);
        return s;
      },
      reset(s) { s.a = .4; s.earth.rotation.z = .41; view({ follow: g => g.copy(s.earth.position), dist: 20, yaw: .9, pitch: .25, min: 6, max: 160 }); },
      frame(s, dt) {
        s.a += dt * .2; s.earth.position.set(Math.cos(s.a) * 40, 0, -Math.sin(s.a) * 40);
        if (state === 'show') s.earth.rotation.z = lerp(.41, 0, smooth(0, .4, k));
        s.earth.spin.rotation.y += dt * 1.2; E3.lightPlanet(s.earth, V3());
      },
      hud(s, ctx) { if (state === 'show') panel(ctx, ['Earth stands up straight', `Tilt: ${(lerp(23.4, 0, smooth(0, .4, k))).toFixed(1)}°`, k > .4 ? 'Seasons: none! Same weather all year' : '']); } },
    { id: 'shout', opts: ['Nobody hears you', 'Everyone hears you', 'Your voice echoes off the stars'],
      make() {
        const s = spaceScene({ sun: false, ambient: .35 }); const dl = new T.DirectionalLight(0xffffff, 1.4); dl.position.set(5, 8, 10); s.add(dl);
        const e = E3.planet('earth', 120, { seg: 160 }); e.position.set(0, -150, -60); s.add(e); E3.lightDir(e, V3(.5, .6, .6).normalize());
        s.a1 = E3.MODELS.astronaut(); s.a1.position.set(-3, 0, 0); s.a1.rotation.set(0, .9, .2); s.add(s.a1);
        s.a2 = E3.MODELS.astronaut(); s.a2.position.set(3, .6, -1); s.a2.rotation.set(0, -.9, -.15); s.add(s.a2);
        s.waves = []; for (let i = 0; i < 4; i++) { const w = new T.Mesh(new T.TorusGeometry(1, .04, 8, 48), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); w.rotation.y = PI / 2; s.add(w); s.waves.push(w); }
        s.radio = []; for (let i = 0; i < 5; i++) { const w = new T.Mesh(new T.TorusGeometry(1, .05, 8, 48, PI / 2), new T.MeshBasicMaterial({ color: 0x6fea95, transparent: true, opacity: 0 })); w.rotation.set(0, PI / 2, -PI / 4); s.add(w); s.radio.push(w); }
        return s;
      },
      reset(s) { s.waves.forEach(w => { w.material.opacity = 0; }); s.radio.forEach(w => { w.material.opacity = 0; }); view({ goal: V3(0, 1.2, 0), dist: 11, yaw: .1, pitch: .15, min: 4, max: 40 }); },
      frame(s) {
        s.a1.position.y = Math.sin(t * .7) * .2; s.a2.position.y = .6 + Math.cos(t * .6) * .2; s.a1.pose(0, true); s.a2.pose(0, false);
        if (state !== 'show') return;
        s.waves.forEach((w, i) => { const u = (k * 3 - i * .12); const on = u > 0 && u < .35; w.position.set(-3 + .6 + u * 6, 1.8, 0); w.scale.setScalar(.3 + u * 2); w.material.opacity = on ? (1 - u / .35) * .8 : 0; });
        s.radio.forEach((w, i) => { const u = ((k - .45) * 3 - i * .12); const on = u > 0 && u < 1; w.position.set(-3 + u * 6, 1.9 + u * .3, -u * .5); w.scale.setScalar(.4 + u * .6); w.material.opacity = on ? .9 : 0; });
      },
      hud(s, ctx) {
        if (state !== 'show') return;
        const p1 = E3.toScreen(s.a1.localToWorld(V3(0, 2.5, 0)), cam, W, H), p2 = E3.toScreen(s.a2.localToWorld(V3(0, 2.5, 0)), cam, W, H);
        if (k < .45) { hudPill(ctx, 'HELLO!!!', p1.x, p1.y, '#F3F1FF', '#16215A', 18); if (k > .2) hudPill(ctx, '…silence…', p2.x, p2.y, 'rgba(13,20,52,.85)', '#C9D0F2', 14); }
        else { hudPill(ctx, 'Hello on the radio!', p1.x, p1.y, '#6FEA95', '#062A2E', 15); if (k > .75) hudPill(ctx, 'I hear you!', p2.x, p2.y, '#6FEA95', '#062A2E', 15); }
        panel(ctx, ['Space has no air', k < .45 ? 'Sound needs air to travel, so nobody hears' : 'Radio waves travel through empty space']);
      } }
  ];

  /* ---------------- game flow */
  function drawStars() { $('#wiStars').innerHTML = WI.map((q, i) => (window.starSvg ? starSvg(stars[i]) : '')).join(''); }
  function load(i) {
    qi = i; cur = WI[i]; if (!cur.scene) cur.scene = cur.make(); sc = cur.scene;
    state = 'ask'; k = 0; tried = false; cur.reset(sc);
    $('#wiNum').textContent = `What if… ${i + 1} of ${WI.length}`; $('#wiQ').textContent = LINES[`wi_${cur.id}_q`].text; $('#wiCard').classList.remove('compact');
    const opts = cur.opts.map((s, j) => ({ s, right: j === 0 })).sort(() => Math.random() - .5);
    $('#wiOpts').innerHTML = opts.map(o => `<button class="wiopt" type="button" data-right="${o.right ? 1 : 0}">${o.s}</button>`).join('');
    $$('.wiopt').forEach(b => b.addEventListener('click', () => answer(b)));
  }
  function ask(i) { load(i); Voice.say(`wi_${cur.id}_q`); }
  function answer(b) {
    if (state !== 'ask') return;
    if (b.dataset.right === '1') {
      state = 'show'; k = 0; stars[qi] = !tried; drawStars();
      b.classList.add('right'); Sfx.chime(); window.confettiAt?.(b);
      $$('.wiopt').forEach(x => { if (x !== b) x.disabled = true; x.hidden = x !== b; });
      // shrink the question to its first sentence so the scene shows
      $('#wiQ').textContent = LINES[`wi_${cur.id}_q`].text.split('?')[0] + '?'; $('#wiCard').classList.add('compact');
      Voice.say(`wi_${cur.id}_a`);
      const nb = document.createElement('div'); nb.className = 'cluster'; nb.style.cssText = 'grid-column:1/-1;justify-content:center';
      nb.innerHTML = `<button class="btn small" type="button" data-a="again">Watch again</button><button class="btn go" type="button" data-a="next">${qi + 1 < WI.length ? 'Next what if' : 'Finish'}</button>`;
      $('#wiOpts').appendChild(nb);
      nb.querySelector('[data-a="again"]').addEventListener('click', () => { Sfx.tap(); cur.reset(sc); state = 'show'; k = 0; Voice.say(`wi_${cur.id}_a`); });
      nb.querySelector('[data-a="next"]').addEventListener('click', () => { Sfx.tap(); if (qi + 1 < WI.length) ask(qi + 1); else finish(); });
    } else { tried = true; b.classList.add('wrong'); b.disabled = true; Sfx.boop(); Voice.say('wrong' + (1 + (qi % 2))); }
  }
  function finish() {
    state = 'done';
    const n = stars.filter(Boolean).length;
    $('#wiNum').textContent = 'All done!'; $('#wiQ').textContent = `You won ${n} out of ${WI.length} stars on the first try!`;
    $('#wiOpts').innerHTML = `<div class="cluster" style="grid-column:1/-1;justify-content:center"><button class="btn go" type="button" id="wiAgain">Play again</button><button class="btn" type="button" id="wiMenu">Other quizzes</button></div>`;
    $('#wiAgain').addEventListener('click', () => { Sfx.tap(); stars = []; drawStars(); ask(0); });
    $('#wiMenu').addEventListener('click', () => { Sfx.tap(); show('quiz'); });
    Sfx.chime(); window.confettiAt?.($('#wiCard')); Voice.say('wi_end');
  }
  $('#wiBack').addEventListener('click', () => { Sfx.tap(); Voice.stop(); show('quiz'); });

  function frame(dt) {
    if (!ready) init();
    if (!cur) load(0);
    t += dt;
    if (state === 'show') k = Math.min(1, k + dt / 16);
    E3.fit(r, cam);
    cur.frame(sc, dt);
    ctl.update(dt);
    r.render(sc, cam);
    const ctx = ov.getContext('2d'), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    cur.hud?.(sc, ctx);
    window.stepConfetti?.(dt);
  }
  return {
    frame, layout,
    enter() {
      if (!ready) init();
      E3.attach(ov); layout();
      if (!started) { started = true; stars = []; drawStars(); load(0); Voice.say('wi_intro', () => { if (current === 'whatif' && qi === 0 && state === 'ask') Voice.say('wi_sun_q'); }); }
      else if (state === 'ask') Voice.say(`wi_${cur.id}_q`);
    }
  };
})();
