/* Earth phenomena for the Earth explorer: seasons, tides, eclipses, auroras, plates and earthquakes, cyclones, storms and rainbows.
   Each one plugs into views.earth (visit.js) through views.earth.api. */
'use strict';
(() => {
  const T = THREE, A = views.earth.api, M = A.M, V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const cam = () => A.cam, ctl = () => A.ctl;
  const sayFree = (id, gap = 9000) => { if (!Voice.busy && performance.now() - (sayFree.last || 0) > gap) { sayFree.last = performance.now(); Voice.say(id); } };
  const label3 = (ctx, v, s, bg = 'rgba(13,20,52,.85)', fg = '#F3F1FF', size = 12) => { const p = A.proj(v); if (p.front && p.x > 0 && p.x < A.W && p.y > 0 && p.y < A.H) hudPill(ctx, s, p.x, p.y, bg, fg, size); };
  const panel = (ctx, x, y, w, h) => { ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, x, y, w, h, 12); ctx.fill(); };
  const lineOf = (pts, color, opacity = .5) => new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  const circlePts = (r, n = 256, y = 0) => Array.from({ length: n + 1 }, (_, i) => V3(Math.cos(i / n * TAU) * r, y, -Math.sin(i / n * TAU) * r));
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const btnLabel = (id, text) => { const b = $(`#earthCtl [data-id="${id}"] span`); if (b) b.textContent = text; };

  // a deep rumble that sounds like thunder; farther storms sound softer and lower
  function thunder(km) {
    if (!prefs.sound || !Sfx.ac) return;
    const ac = Sfx.ac, t0 = ac.currentTime, len = 3.2, buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), ch = buf.getChannelData(0);
    let v = 0; for (let i = 0; i < ch.length; i++) { v = v * .985 + (Math.random() * 2 - 1) * .015; ch[i] = v * 9 * (Math.random() < .004 ? 2.5 : 1); }
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = 140 + 360 / km;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.7 / Math.max(1, km * .7), t0 + .06); g.gain.exponentialRampToValueAtTime(.0001, t0 + len);
    src.connect(f).connect(g).connect(ac.destination); src.start(t0);
  }

  /* ================================================================ Seasons: Earth's tilt as it goes round the Sun */
  let SE = null;
  const ORBIT = 46, INDIA_LAT = 21;
  M.seasons = {
    line: 'e_seasons',
    make() {
      const sc = new T.Scene(); sc.add(E3.starfield(9000)); sc.add(new T.AmbientLight(0xffffff, .08));
      sc.add(E3.planet('sun', 7, { seg: 64 })); sc.add(new T.PointLight(0xfff4e0, 1.9, 0, 0));
      sc.add(lineOf(circlePts(ORBIT), 0x8ca0ff, .35));
      const earth = E3.planet('earth', 3.4, { seg: 96 }); sc.add(earth);       // tilted 23.4° like the real Earth
      const axis = lineOf([V3(0, -5.6, 0), V3(0, 5.6, 0)], 0xffb52e, .9); earth.add(axis);
      const pin = new T.Mesh(new T.SphereGeometry(.2, 16, 8), new T.MeshBasicMaterial({ color: 0xffb52e })); pin.position.copy(E3.latLonToVec(INDIA_LAT, 78, 3.42)); earth.spin.add(pin);
      SE = { sc, earth, pin, a: .5, play: true, goA: null, follow: false, last: '', equinoxSaid: false };
    },
    enter() {
      if (!SE) this.make();
      A.view({ goal: V3(), dist: 125, min: 8, max: 260, pitch: .62, yaw: .55 });
      A.setCtl([{ id: 'play', label: SE.play ? 'Pause' : 'Play', cyan: true }, { id: 'june', label: 'Go to June' }, { id: 'dec', label: 'Go to December' }, { id: 'follow', label: 'Follow Earth', go: true }]);
      SE.follow = false;
    },
    act(id) {
      if (id === 'play') { SE.play = !SE.play; SE.goA = null; btnLabel('play', SE.play ? 'Pause' : 'Play'); }
      if (id === 'june') SE.goA = 0; if (id === 'dec') SE.goA = PI;
      if (id === 'follow') {
        SE.follow = !SE.follow; btnLabel('follow', SE.follow ? 'Whole orbit' : 'Follow Earth');
        const c = ctl();
        if (SE.follow) { c.follow = g => g.copy(SE.earth.position); c.goalDist = 17; c.min = 6; c.goalPitch = .25; }
        else { c.follow = null; c.goal.set(0, 0, 0); c.goalDist = 125; c.goalPitch = .62; }
        c.retarget();
      }
    },
    frame(dt) {
      const s = SE;
      if (s.goA !== null) { const diff = ((s.goA - s.a) % TAU + TAU) % TAU; const step = Math.min(diff, dt * 2.2); s.a += step; if (diff - step < .005) { s.goA = null; s.play = false; btnLabel('play', 'Play'); } }
      else if (s.play) s.a += dt * .2;
      s.earth.position.set(Math.cos(s.a) * ORBIT, 0, -Math.sin(s.a) * ORBIT);
      s.earth.spin.rotation.y += dt * 1.4;
      E3.lightPlanet(s.earth, V3());
      const ph = ((s.a % TAU) + TAU) % TAU;
      const key = ph < .14 || ph > TAU - .14 ? 'e_summer' : Math.abs(ph - PI) < .14 ? 'e_winter' : (Math.abs(ph - PI / 2) < .1 || Math.abs(ph - 3 * PI / 2) < .1) ? 'e_equinox' : '';
      if (key && key !== s.last) { if (key !== 'e_equinox' || !s.equinoxSaid) { if (!Voice.busy) { Voice.say(key); if (key === 'e_equinox') s.equinoxSaid = true; } } }
      s.last = key;
      return s.sc;
    },
    hud(ctx) {
      const s = SE, ph = ((s.a % TAU) + TAU) % TAU, decl = 23.44 * Math.cos(ph);
      const doy = (172 + ph / TAU * 365.25) % 365.25, month = MONTHS[new Date(2025, 0, Math.max(1, Math.round(doy))).getMonth()];
      const elev = 90 - Math.abs(INDIA_LAT - decl), tl = Math.tan(INDIA_LAT * PI / 180) * Math.tan(decl * PI / 180), dayLen = 24 / PI * Math.acos(clamp(-tl, -1, 1));
      const season = decl > 9 ? 'Summer' : decl < -9 ? 'Winter' : ph < PI ? 'Autumn' : 'Spring';
      const T0 = A.top();
      panel(ctx, 16, T0, 236, 98);
      hudText(ctx, month, 30, T0 + 26, 20, '#FFB52E', 'left');
      hudText(ctx, `In India: ${season}`, 30, T0 + 48, 15, '#F3F1FF', 'left', 600);
      hudText(ctx, `Daylight: ${Math.floor(dayLen)} h ${Math.round((dayLen % 1) * 60)} min`, 30, T0 + 68, 13, '#C9D0F2', 'left', 600);
      hudText(ctx, `Noon Sun: ${Math.round(elev)}° up in the sky`, 30, T0 + 88, 13, '#C9D0F2', 'left', 600);
      // the noon sky over India: how high the Sun climbs, and how long a stick's shadow is
      const w = 190, h = 118, x = A.W - w - 16, y = T0;
      panel(ctx, x, y, w, h);
      const gx = x + 20, gy = y + h - 22, sx = x + w / 2;
      ctx.strokeStyle = '#6FEA95'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(x + w - 20, gy); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,181,46,.35)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(sx, gy, 70, PI, TAU); ctx.stroke(); ctx.setLineDash([]);
      const er = elev * PI / 180, sunX = sx - Math.cos(er) * 70, sunY = gy - Math.sin(er) * 70;
      ctx.fillStyle = '#FFE38A'; ctx.beginPath(); ctx.arc(sunX, sunY, 8, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#F3F1FF'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx, gy - 22); ctx.stroke();
      const shadow = Math.min(70, 22 / Math.tan(er));
      ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx + shadow, gy); ctx.stroke();
      hudText(ctx, 'Noon sky over India', x + w / 2, y + 16, 11, '#C9D0F2', 'center', 600);
      // month names round the orbit
      [['June', 0], ['September', PI / 2], ['December', PI], ['March', 3 * PI / 2]].forEach(([n, a]) => label3(ctx, V3(Math.cos(a) * (ORBIT + 9), 0, -Math.sin(a) * (ORBIT + 9)), n, 'rgba(13,20,52,.7)', '#C9D0F2', 11));
      label3(ctx, SE.pin.getWorldPosition(V3()).add(V3(0, 1.2, 0)), 'India', 'rgba(255,181,46,.9)', '#2A1600', 11);
      if (s.follow) label3(ctx, SE.earth.localToWorld(V3(0, 6.4, 0)), "Earth's tilt: 23.4°", 'rgba(13,20,52,.85)', '#FFB52E', 12);
    }
  };

  /* ================================================================ Tides: the Moon pulls the oceans into bulges */
  let TI = null;
  M.tides = {
    line: 'e_tides',
    make() {
      const sc = new T.Scene(); sc.add(E3.starfield(9000)); sc.add(new T.AmbientLight(0xffffff, .14));
      const sunDir = V3(1, .25, .45).normalize(), sl = new T.DirectionalLight(0xffffff, 1.5); sl.position.copy(sunDir).multiplyScalar(100); sc.add(sl);
      const earth = E3.planet('earth', 8, { seg: 128, noTilt: true }); sc.add(earth); E3.lightDir(earth, sunDir);
      const bulgeG = new T.Group(); sc.add(bulgeG);
      const bulge = new T.Mesh(new T.SphereGeometry(8, 96, 48), new T.MeshStandardMaterial({ color: 0x3a8ff0, transparent: true, opacity: .5, roughness: .15, metalness: .1, depthWrite: false }));
      bulge.scale.set(1.14, .985, .985); bulgeG.add(bulge);
      const moon = E3.planet('moon', 2.2, { seg: 64 }); sc.add(moon); E3.lightDir(moon, sunDir);
      sc.add(lineOf(circlePts(34), 0x8ca0ff, .3));
      const pin = new T.Mesh(new T.SphereGeometry(.28, 16, 8), new T.MeshBasicMaterial({ color: 0xffb52e })); pin.position.copy(E3.latLonToVec(19, 72.9, 8.1)); earth.spin.add(pin);
      TI = { sc, earth, bulgeG, moon, pin, ma: .4, last: '', h: 0 };
    },
    enter() { if (!TI) this.make(); A.view({ goal: V3(), dist: 78, min: 14, max: 180, pitch: 1.0, yaw: .4 }); A.setCtl([{ id: 'fast', label: 'Faster', cyan: true }]); TI.fast = false; },
    act(id) { if (id === 'fast') { TI.fast = !TI.fast; btnLabel('fast', TI.fast ? 'Slower' : 'Faster'); } },
    frame(dt) {
      const s = TI, k = s.fast ? 3 : 1;
      s.ma += dt * .06 * k; s.earth.spin.rotation.y += dt * .5 * k;
      s.moon.position.set(Math.cos(s.ma) * 34, 0, -Math.sin(s.ma) * 34); s.bulgeG.rotation.y = s.ma;
      s.moon.spin.rotation.y = s.ma;
      const p = s.pin.getWorldPosition(V3()), a = Math.atan2(-p.z, p.x) - s.ma;
      s.h = Math.cos(2 * a);
      const key = s.h > .9 ? 'e_high' : s.h < -.9 ? 'e_low' : '';
      if (key && key !== s.last) sayFree(key, 12000);
      if (key) s.last = key;
      return s.sc;
    },
    hud(ctx) {
      const s = TI, h = s.h, rising = Math.sin(2 * (Math.atan2(-s.pin.getWorldPosition(V3()).z, s.pin.getWorldPosition(V3()).x) - s.ma)) < 0;
      const tip = V3(Math.cos(s.ma), 0, -Math.sin(s.ma));
      label3(ctx, s.moon.position.clone().add(V3(0, 3.4, 0)), 'Moon');
      label3(ctx, tip.clone().multiplyScalar(10.5), 'Ocean bulge', 'rgba(58,143,240,.9)', '#fff');
      label3(ctx, tip.clone().multiplyScalar(-10.5), 'Ocean bulge', 'rgba(58,143,240,.9)', '#fff');
      label3(ctx, s.pin.getWorldPosition(V3()).multiplyScalar(1.12), 'Mumbai', 'rgba(255,181,46,.9)', '#2A1600', 11);
      // a little beach at Mumbai: the water creeps up and down
      const w = Math.min(230, A.W * .5), bh = 140, x = A.W - w - 16, y = A.bottom() - bh - 6;
      ctx.save(); roundRect(ctx, x, y, w, bh, 14); ctx.clip();
      let g = ctx.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, '#7FB8EA'); g.addColorStop(1, '#CBE6FA'); ctx.fillStyle = g; ctx.fillRect(x, y, w, bh);
      ctx.fillStyle = '#E8D3A0'; ctx.beginPath(); ctx.moveTo(x, y + bh); ctx.lineTo(x, y + bh * .45); ctx.lineTo(x + w, y + bh * .95); ctx.lineTo(x + w, y + bh); ctx.fill();
      const level = y + bh * (.72 - h * .2);
      if (h < -.3) { ctx.fillStyle = '#F4E6E0'; for (const [sx, sy] of [[.55, .78], [.68, .84], [.42, .72]]) { ctx.beginPath(); ctx.ellipse(x + w * sx, y + bh * sy, 4, 3, 0, 0, TAU); ctx.fill(); } ctx.fillStyle = '#D9603B'; ctx.beginPath(); ctx.ellipse(x + w * .62, y + bh * .8, 6, 4, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(31,111,192,.92)'; ctx.beginPath(); ctx.moveTo(x + w, level); for (let i = 0; i <= 20; i++) ctx.lineTo(x + w - i * w / 20, level + Math.sin(i * .9 + A.t * 3) * 2); ctx.lineTo(x, y + bh); ctx.lineTo(x + w, y + bh); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#2B3A7A'; ctx.lineWidth = 2; roundRect(ctx, x, y, w, bh, 14); ctx.stroke();
      hudPill(ctx, `Mumbai beach: ${h > .6 ? 'High tide' : h < -.6 ? 'Low tide' : rising ? 'Tide coming in' : 'Tide going out'}`, x + w / 2, y + 22, 'rgba(13,20,52,.85)', '#F3F1FF', 12);
    }
  };

  /* ================================================================ Eclipses */
  let EC = null;
  const glowTexture = (draw, size = 256) => E3.canvasTex(size, size, draw);
  M.eclipse = {
    line: 'e_eclipse',
    make() {
      // solar: standing on the ground looking up at the Sun
      const ss = new T.Scene(); ss.background = new T.Color(0x6eaee6);
      const stars = E3.starfield(3000); stars.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = 0; } }); ss.add(stars);
      const hemi = new T.HemisphereLight(0xdfefff, 0x334422, .9); ss.add(hemi);
      const ground = E3.terrain({ size: 900, seg: 120, amp: 14, freq: .006, seed: 31, color: 0x3a5a30, flat: [[0, 0, 60]] }); ss.add(ground);
      const tm = new T.MeshStandardMaterial({ color: 0x1f3a1c, roughness: 1 });
      for (let i = 0; i < 40; i++) { const a = -PI / 2 + (Math.random() - .5) * 2.4, d = 60 + Math.random() * 200, x = Math.cos(a) * d, z = Math.sin(a) * d; const tr = new T.Mesh(new T.ConeGeometry(3 + Math.random() * 3, 12 + Math.random() * 10, 8), tm); tr.position.set(x, ground.height(x, z) + 6, z); ss.add(tr); }
      const dir = V3(.12, Math.sin(.5), -Math.cos(.5)).normalize(), sunPos = dir.clone().multiplyScalar(320);
      const sun = new T.Mesh(new T.SphereGeometry(10, 48, 24), new T.MeshBasicMaterial({ color: 0xfff6dc, fog: false })); sun.position.copy(sunPos); ss.add(sun);
      const halo = E3.glow(0xfff0c0, 120, 1); halo.position.copy(sunPos); ss.add(halo);
      const corona = new T.Sprite(new T.SpriteMaterial({ map: glowTexture((g, w) => { g.translate(w / 2, w / 2); for (let i = 0; i < 90; i++) { g.rotate(TAU / 90 + Math.random() * .05); const len = w * (.22 + Math.random() * .26); const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.32, 'rgba(235,240,255,.55)'); gr.addColorStop(1, 'rgba(200,215,255,0)'); g.fillStyle = gr; g.fillRect(0, -1.2, len, 2.4); } const r = g.createRadialGradient(0, 0, w * .1, 0, 0, w * .5); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(.25, 'rgba(230,236,255,.35)'); r.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = r; g.beginPath(); g.arc(0, 0, w / 2, 0, TAU); g.fill(); }, 512), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0, fog: false }));
      corona.scale.set(80, 80, 1); corona.position.copy(sunPos); ss.add(corona);
      const moon = new T.Mesh(new T.SphereGeometry(10.4, 48, 24), new T.MeshBasicMaterial({ color: 0x08080c, fog: false })); ss.add(moon);
      const ring = E3.glow(0xffffff, 30, 0); ss.add(ring);
      const tang = V3().crossVectors(dir, V3(0, 1, 0)).normalize().applyAxisAngle(dir, -.25);
      // lunar: out in space, Earth's shadow and the Moon passing through it
      const ls = new T.Scene(); ls.add(E3.starfield(9000)); ls.add(new T.AmbientLight(0xffffff, .06));
      const sl = new T.DirectionalLight(0xffffff, 1.7); sl.position.set(-100, 0, 0); ls.add(sl);
      const sunG = E3.glow(0xfff0c0, 160, 1); sunG.position.set(-520, 0, 0); ls.add(sunG);
      const earth = E3.planet('earth', 5, { seg: 96, noTilt: true }); ls.add(earth); E3.lightDir(earth, V3(-1, 0, 0));
      const umbra = new T.Mesh(new T.ConeGeometry(5, 75, 48, 1, true), new T.MeshBasicMaterial({ color: 0x3a3a5a, transparent: true, opacity: .32, depthWrite: false, side: T.DoubleSide }));
      umbra.rotation.z = -PI / 2; umbra.position.x = 37.5; ls.add(umbra);
      const lmoon = E3.planet('moon', 1.4, { seg: 64 }); ls.add(lmoon); E3.lightDir(lmoon, V3(-1, 0, 0));
      EC = { ss, ls, sun, halo, corona, moon, ring, stars, hemi, dir, sunPos, tang, lmoon, earth, sub: 'solar', k: 0, said: false };
    },
    enter() { if (!EC) this.make(); A.setCtl([{ id: 'solar', label: 'Solar eclipse', go: true }, { id: 'lunar', label: 'Lunar eclipse', cyan: true }, { id: 'again', icon: 'again', label: 'Again' }]); this.start('solar', false); },
    start(sub, talk = true) {
      EC.sub = sub; EC.k = 0; EC.said = false;
      if (sub === 'solar') A.view({ goal: V3(0, 8, 0), dist: 4, yaw: -.12, pitch: -.5, min: 2, max: 8, minPitch: -1.2, maxPitch: .2 });
      else A.view({ goal: V3(16, 0, 0), dist: 62, yaw: .55, pitch: .35, min: 15, max: 160 });
      cam().fov = sub === 'solar' ? 30 : 45; cam().updateProjectionMatrix();
      if (talk) { Voice.say(sub === 'solar' ? 'e_solar' : 'e_lunar'); EC.said = true; }
    },
    leave() { if (cam()) { cam().fov = 45; cam().updateProjectionMatrix(); } },
    act(id) { if (id === 'solar' || id === 'lunar') this.start(id); if (id === 'again') this.start(EC.sub, false); },
    frame(dt) {
      const e = EC;
      if (e.sub === 'solar') {
        e.k = Math.min(1, e.k + dt / 26 * (Math.abs(e.k - .5) < .035 ? .22 : 1));
        if (!e.said && e.k > .2) { e.said = true; sayFree('e_solar', 0); }
        const off = lerp(-26, 26, e.k);
        e.moon.position.copy(e.sunPos).multiplyScalar(.985).addScaledVector(e.tang, off);
        const d = Math.abs(off), r1 = 10, r2 = 10.4;
        let cov;
        if (d >= r1 + r2) cov = 0; else if (d <= r2 - r1) cov = 1;
        else { const a1 = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)), a2 = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2)); cov = (r1 * r1 * a1 + r2 * r2 * a2 - .5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)))) / (PI * r1 * r1); }
        e.cov = cov;
        const dark = Math.pow(smooth(.75, 1, cov), 1.4);
        e.ss.background.setRGB(lerp(.43, .03, dark), lerp(.68, .045, dark), lerp(.9, .12, dark));
        e.hemi.intensity = lerp(.9, .05, dark);
        e.stars.traverse(o => { if (o.material) o.material.opacity = dark; });
        e.halo.material.opacity = (1 - cov) * .9 + .05; e.corona.material.opacity = smooth(.985, 1, cov);
        e.ring.material.opacity = cov > .955 && cov < .997 ? 1 - Math.abs(cov - .976) / .021 : 0;
        e.ring.position.copy(e.sunPos).addScaledVector(e.tang, off > 0 ? -9.6 : 9.6);
        return e.ss;
      }
      e.k = Math.min(1, e.k + dt / 22 * (Math.abs(e.k - .5) < .06 ? .3 : 1));
      const z = lerp(-15, 15, e.k); e.lmoon.position.set(28, .25, z); e.lmoon.spin.rotation.y += dt * .05;
      const f = smooth(4.3, 1.2, Math.abs(z)); e.f = f;
      const m = e.lmoon.body.material;
      m.color.setRGB(lerp(1, .78, f), lerp(1, .3, f), lerp(1, .16, f)); m.emissive = m.emissive || new T.Color(); m.emissive.setRGB(.34 * f, .08 * f, .03 * f);
      e.earth.spin.rotation.y += dt * .1;
      return e.ls;
    },
    hud(ctx) {
      const e = EC, T0 = A.top();
      if (e.sub === 'solar') {
        panel(ctx, 16, T0, 210, 50);
        hudText(ctx, `Sun covered: ${Math.round(e.cov * 100)}%`, 30, T0 + 22, 16, '#FFB52E', 'left');
        hudText(ctx, e.cov > .995 ? 'Totality! See the corona glow' : 'The Moon is sliding in front', 30, T0 + 41, 12, '#F3F1FF', 'left', 600);
        hudPill(ctx, 'Never look at the real Sun without eclipse glasses!', A.W / 2, A.bottom() - 6, 'rgba(255,109,138,.92)', '#2A0010', 12);
      } else {
        label3(ctx, V3(-30, 6, 0), 'Sunlight comes from here', 'rgba(255,181,46,.9)', '#2A1600');
        label3(ctx, V3(48, 5, 0), "Earth's shadow");
        label3(ctx, e.lmoon.position.clone().add(V3(0, 2.6, 0)), e.f > .9 ? 'Red Moon!' : 'Moon', e.f > .9 ? 'rgba(200,70,40,.92)' : 'rgba(13,20,52,.85)', '#fff');
        panel(ctx, 16, T0, 210, 50);
        hudText(ctx, `Moon in Earth's shadow: ${Math.round(e.f * 100)}%`, 30, T0 + 22, 14, '#FFB52E', 'left');
        hudText(ctx, 'Lunar eclipses are safe to watch', 30, T0 + 41, 12, '#F3F1FF', 'left', 600);
      }
    }
  };

  /* ================================================================ Auroras */
  let AU = null;
  function auroraMat() {
    return new T.ShaderMaterial({
      uniforms: { t: { value: 0 }, seed: { value: Math.random() * 50 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
      vertexShader: `uniform float t; uniform float seed; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x * .015 + t * .35 + seed) * 22.0 + sin(p.x * .041 - t * .5) * 8.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `uniform float t; uniform float seed; varying vec2 vUv;
        float h(float x){ return fract(sin(x * 127.1) * 43758.5); }
        float n1(float x){ float i = floor(x), f = fract(x); return mix(h(i), h(i + 1.0), smoothstep(0.0, 1.0, f)); }
        void main(){ float x = vUv.x * 60.0 + seed;
          float c = n1(x + t * 1.2) * .6 + n1(x * 2.7 - t * 1.7) * .4;
          float rays = pow(n1(x * 9.0 + t * 2.5), 2.0) * .8 + .25;
          float y = vUv.y, a = c * rays * smoothstep(0.0, .12, y) * (1.0 - smoothstep(.3, 1.0, y));
          vec3 col = mix(vec3(.15, 1.0, .45), vec3(.75, .3, 1.0), smoothstep(.4, 1.0, y));
          gl_FragColor = vec4(col * a * 1.5, a); }`
    });
  }
  M.aurora = {
    line: 'e_aurora',
    make() {
      // from space
      const sp = new T.Scene(); sp.add(E3.starfield(9000)); sp.add(new T.AmbientLight(0xffffff, .05));
      const sl = new T.DirectionalLight(0xffffff, 1.6); sl.position.set(-100, 0, 0); sp.add(sl);
      const sunG = E3.glow(0xfff0c0, 120, .9); sunG.position.set(-420, 0, 0); sp.add(sunG);
      const R = 10, earth = E3.planet('earth', R, { seg: 128, noTilt: true }); sp.add(earth); E3.lightDir(earth, V3(-1, 0, 0));
      const mats = [];
      for (const sgn of [1, -1]) {
        const m = auroraMat(); mats.push(m);
        const ring = new T.Mesh(new T.CylinderGeometry(R * .43, R * .36, R * .16, 200, 1, true), m);
        ring.position.y = sgn * R * .95; if (sgn < 0) ring.rotation.x = PI; sp.add(ring);
      }
      for (const L of [1.5, 2.1, 2.9]) for (let k = 0; k < 6; k++) {
        const ph = k / 6 * TAU, pts = [];
        for (let i = 0; i <= 60; i++) { const th = .2 + i / 60 * (PI - .4), rr = L * R * Math.sin(th) ** 2; pts.push(V3(rr * Math.sin(th) * Math.cos(ph), rr * Math.cos(th), rr * Math.sin(th) * Math.sin(ph))); }
        sp.add(lineOf(pts, 0x59e0e8, .14));
      }
      const wind = makeParticles(900, 0xffd27a, .7, true); sp.add(wind);
      // from the ground
      const gr = new T.Scene(); gr.background = new T.Color(0x02040c); gr.add(E3.starfield(3000));
      gr.add(new T.HemisphereLight(0x5aa080, 0x101820, .45));
      const snow = E3.terrain({ size: 900, seg: 140, amp: 12, freq: .006, seed: 44, color: 0xdfe8f2, flat: [[0, 0, 30]] }); gr.add(snow);
      const pine = new T.MeshStandardMaterial({ color: 0x14301e, roughness: 1 });
      for (let i = 0; i < 70; i++) { const x = (Math.random() - .5) * 300, z = -20 - Math.random() * 220; if (Math.abs(x) < 8 && z > -30) continue; const tr = new T.Mesh(new T.ConeGeometry(2 + Math.random() * 2, 9 + Math.random() * 8, 8), pine); tr.position.set(x, snow.height(x, z) + 5, z); gr.add(tr); }
      const cabin = new T.Group(); cabin.add(E3.at(E3.box(6, 4, 5, new T.MeshStandardMaterial({ color: 0x5a3a2a })), 0, 2, 0)); const roof = new T.Mesh(new T.ConeGeometry(5, 3, 4), new T.MeshStandardMaterial({ color: 0xe8eef6 })); roof.rotation.y = PI / 4; roof.position.y = 5.4; cabin.add(roof);
      const win = new T.Mesh(new T.PlaneGeometry(1.4, 1.2), new T.MeshBasicMaterial({ color: 0xffc860 })); win.position.set(0, 2.2, 2.51); cabin.add(win);
      cabin.position.set(14, snow.height(14, -26), -26); cabin.rotation.y = -.5; gr.add(cabin);
      const glowL = new T.PointLight(0xffb060, 1, 18); glowL.position.set(14, 3, -22); gr.add(glowL);
      for (let i = 0; i < 4; i++) {
        const m = auroraMat(); mats.push(m);
        const c = new T.Mesh(new T.PlaneGeometry(700, 150, 240, 1), m); c.position.set((i - 1.5) * 60, 95 + i * 18, -260 - i * 50); c.rotation.x = .15; c.rotation.y = (i - 1.5) * .12; gr.add(c);
      }
      AU = { sp, gr, mats, wind, R, sub: 'space' };
    },
    enter() { if (!AU) this.make(); A.setCtl([{ id: 'space', label: 'From space', cyan: true }, { id: 'ground', label: 'From the ground', go: true }]); this.go('space', false); },
    go(sub, talk = true) {
      AU.sub = sub;
      if (sub === 'space') A.view({ goal: V3(0, 5, 0), dist: 40, yaw: PI / 2 + .3, pitch: .7, min: 14, max: 120 });
      else A.view({ goal: V3(0, 7, 0), dist: 2.5, yaw: 0, pitch: -.32, min: 1.5, max: 5, minPitch: -1.2, maxPitch: .15 });
      if (talk) Voice.say(sub === 'space' ? 'e_aurora' : 'e_aurora_ground');
    },
    act(id) { this.go(id); },
    frame(dt) {
      const a = AU; a.mats.forEach(m => { m.uniforms.t.value += dt; });
      if (a.sub === 'space') {
        const w = a.wind, R = a.R;
        for (let i = 0; i < 5; i++) w.emit(-95, (Math.random() - .5) * 50, (Math.random() - .5) * 50, 34, 0, 0, 6);
        for (const q of w.list) {
          const d = Math.hypot(q.x, q.y, q.z);
          if (d < R * 2.6) { const ty = Math.sign(q.y || 1) * R * .95, dx = -q.x, dy = ty - q.y, dz = -q.z, m = Math.hypot(dx, dy, dz) || 1; q.vx = lerp(q.vx, dx / m * 22, dt * 3); q.vy = lerp(q.vy, dy / m * 22, dt * 3); q.vz = lerp(q.vz, dz / m * 22, dt * 3); }
          else if (d < R * 4 && q.x < 0) { q.vy += Math.sign(q.y || 1) * dt * 18; q.vz += Math.sign(q.z || 1) * dt * 10; }
          if (d < R * 1.02) q.l = q.life;
        }
        w.step(dt, 0, 0);
        return a.sp;
      }
      return a.gr;
    },
    hud(ctx) {
      if (AU.sub === 'space') {
        label3(ctx, V3(-70, 24, 0), 'Solar wind from the Sun', 'rgba(255,181,46,.9)', '#2A1600');
        label3(ctx, V3(0, AU.R * 1.25, 0), 'Aurora', 'rgba(111,234,149,.92)', '#062A2E');
        label3(ctx, V3(0, 0, AU.R * 2.4), "Earth's magnetic field", 'rgba(13,20,52,.8)', '#59E0E8', 11);
      } else hudText(ctx, 'Drag to look around the sky', A.W / 2, A.bottom() - 4, 13, '#C9D0F2', 'center', 600);
    }
  };

  /* ================================================================ Plates, mountains and earthquakes */
  let PL = null;
  function strataTex() { return E3.canvasTex(256, 64, (g, w, h) => { const cols = ['#7A5A3A', '#9A6E44', '#B58A58', '#8A5A3A', '#6A4A30', '#A0784A']; let y = 0; let i = 0; while (y < h) { const t = 4 + Math.random() * 9; g.fillStyle = cols[i++ % cols.length]; g.fillRect(0, y, w, t); y += t; } }, true); }
  function heightColor(h) { return h < 1.2 ? new T.Color(0x5a8a3a) : h < 7 ? new T.Color(0x6a7a3a).lerp(new T.Color(0x7a6a50), (h - 1.2) / 6) : h < 13 ? new T.Color(0x7a6a58).lerp(new T.Color(0x8a8a8a), (h - 7) / 6) : new T.Color(0xf4f7fb); }
  // a small house: plastered walls, a tiled gable roof, a door and windows
  let houseMats = null;
  function house(color) {
    const NT = window.NATURE;
    if (!houseMats) {
      const plaster = NT.detail('dirt').clone(); plaster.needsUpdate = true; plaster.repeat.set(1, 1);
      const tiles = NT.texOf(NT.paint(128, 128, (u, v) => { const row = (v * 8) % 1, col = (u * 6 + Math.floor(v * 8) * .5) % 1, edge = Math.min(row, Math.min(col, 1 - col) * 2.5); const k = .55 + Math.min(1, edge * 8) * .4 + (Math.sin(u * 91 + v * 37) * .05); return [k * 200, k * 92, k * 62]; }));
      tiles.repeat.set(2, 2);
      houseMats = { plaster, roof: new T.MeshStandardMaterial({ map: tiles, bumpMap: tiles, bumpScale: .03, roughness: .8 }), dark: new T.MeshStandardMaterial({ color: 0x2a2a30, roughness: .3, metalness: .1 }), wood: new T.MeshStandardMaterial({ color: 0x6a4a2e, roughness: .9 }) };
    }
    const g = new T.Group(), wall = new T.MeshStandardMaterial({ color, map: houseMats.plaster, roughness: .95 });
    g.add(E3.at(E3.box(2.2, 1.3, 1.6, wall), 0, .65, 0));
    const tri = new T.Shape(); tri.moveTo(-.95, 0); tri.lineTo(.95, 0); tri.lineTo(0, .8); tri.closePath();
    const gable = new T.Mesh(new T.ExtrudeGeometry(tri, { depth: 2.2, bevelEnabled: false }), wall); gable.rotation.y = PI / 2; gable.position.set(-1.1, 1.3, 0); g.add(gable);
    for (const s of [-1, 1]) { const r = new T.Mesh(new T.BoxGeometry(2.5, .07, 1.32), houseMats.roof); r.position.set(0, 1.72, s * .45); r.rotation.x = s * .7; g.add(r); }
    const door = E3.box(.42, .78, .04, houseMats.wood); door.position.set(.4, .39, .81); g.add(door);
    for (const x of [-.55, .95]) { if (x > .9) continue; const w = E3.box(.42, .34, .04, houseMats.dark); w.position.set(x, .82, .81); g.add(w); }
    const w2 = E3.box(.04, .34, .42, houseMats.dark); w2.position.set(1.11, .82, 0); g.add(w2);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  M.plates = {
    line: 'e_plates',
    make() {
      const sc = new T.Scene(), NT = window.NATURE;
      NT.outdoor(sc, { top: 0x2f6cc4, horizon: 0xc4d8ec, sun: V3(.45, .6, .4), clouds: .35, near: 220, far: 700, hemiI: .4, shadowSpan: 100, shadowAt: V3(0, 0, -5) });
      const st = strataTex(), sideMat = new T.MeshStandardMaterial({ map: st, roughness: 1 });
      const asia = new T.Group(), india = new T.Group(); sc.add(asia); sc.add(india);
      asia.add(E3.at(new T.Mesh(new T.BoxGeometry(110, 14, 60), sideMat), 0, -7.05, -30));
      india.add(E3.at(new T.Mesh(new T.BoxGeometry(60, 14, 46), sideMat), 0, -7.05, 23));
      const top = (w, d, sx, sz) => { const g = new T.PlaneGeometry(w, d, sx, sz); g.rotateX(-PI / 2); const m = new T.Mesh(g, NT.groundMat('grass', 'rock', { repeat: 26 })); m.receiveShadow = true; m.castShadow = true; g.setAttribute('color', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); g.setAttribute('splat', new T.BufferAttribute(new Float32Array(g.attributes.position.count), 1)); return m; };
      const asiaTop = top(110, 60, 160, 90); asiaTop.position.z = -30; asia.add(asiaTop);
      const indiaTop = top(60, 46, 80, 60); indiaTop.position.z = 23; india.add(indiaTop);
      const sea = NT.water(1400, 1400, { color: 0x1c4c72, env: 1.3, wave: .4 }); sea.position.y = -2.2; sc.add(sea); sc.ticks = [sea.tick, sc.sky.tick];
      const arrow = new T.Mesh(new T.ConeGeometry(2.4, 5, 16), new T.MeshStandardMaterial({ color: 0xffb52e, emissive: 0x6a3a00 })); arrow.rotation.x = -PI / 2; arrow.position.set(0, 4, 30); india.add(arrow);
      const houses = [];
      for (const [x, z, g] of [[-14, 30, india], [12, 34, india], [-30, -46, asia], [24, -48, asia], [4, -52, asia]]) { const h = house(0xf2e6d0); h.position.set(x, 0, z); g.add(h); houses.push(h); }
      const dust = makeParticles(600, 0xc8a878, 1.6, false); sc.add(dust);
      PL = { sc, asia, india, asiaTop, indiaTop, arrow, houses, dust, push: 0, quake: 0, trace: [], saidH: false };
      this.shape();
    },
    shape() {
      const p = PL, k = p.push;
      for (const [mesh, zOff, isIndia] of [[p.asiaTop, -30, false], [p.indiaTop, 23, true]]) {
        const pos = mesh.geometry.attributes.position, col = mesh.geometry.attributes.color, spl = mesh.geometry.attributes.splat;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), z = pos.getZ(i) + zOff, n = window.noise3 ? noise3(x * .09, z * .09, 1.7) : .5, n2 = window.noise3 ? noise3(x * .25, z * .25, 4.1) : .5;
          let h = (n - .5) * 1.6;
          if (!isIndia) h += k * 19 * Math.exp(-Math.pow((z + 7) / 6.5, 2)) * (.5 + n * .7) + k * 6 * Math.exp(-Math.pow((z + 18) / 7, 2)) * n2;
          else h += k * 5 * Math.exp(-Math.pow((z - 0) / 3, 2)) * (.6 + n * .5);
          pos.setY(i, Math.max(.05, h + .2)); const c = heightColor(h); col.setXYZ(i, c.r, c.g, c.b); spl.setX(i, smooth(3, 9, h) * (h > 13 ? .35 : 1));
        }
        pos.needsUpdate = true; col.needsUpdate = true; spl.needsUpdate = true; mesh.geometry.computeVertexNormals();
      }
    },
    enter() { if (!PL) this.make(); A.view({ goal: V3(0, 0, -6), dist: 125, min: 30, max: 260, yaw: .85, pitch: .48 }); A.setCtl([{ id: 'push', icon: 'up', label: 'Push India north', hold: true, go: true }, { id: 'quake', label: 'Earthquake!', cyan: true }, { id: 'reset', icon: 'again', label: 'Start again' }]); },
    act(id) {
      if (id === 'quake') { PL.quake = 3; Sfx.boop(); Voice.say('e_quake'); }
      if (id === 'reset') { PL.push = 0; PL.saidH = false; this.shape(); }
    },
    frame(dt) {
      const p = PL; for (const f of p.sc.ticks) f(dt);
      if (A.held.push && p.push < 1) { p.push = Math.min(1, p.push + dt * .1); if (Math.round(p.push * 100) % 2 === 0) this.shape(); if (!p.saidH && p.push > .2) { p.saidH = true; Voice.say('e_himalaya'); } }
      p.india.position.z = (1 - p.push) * 16;
      p.arrow.position.y = 4 + Math.sin(A.t * 4) * .6; p.arrow.visible = p.push < 1;
      p.quake = Math.max(0, p.quake - dt);
      const q = p.quake > 0 ? Math.min(1, p.quake) : 0;
      p.houses.forEach((h, i) => { h.rotation.z = Math.sin(A.t * 30 + i) * .12 * q; h.rotation.x = Math.cos(A.t * 26 + i) * .08 * q; });
      p.sc.position.set((Math.random() - .5) * 1.4 * q, (Math.random() - .5) * .8 * q, 0);
      if (q > .2) for (let i = 0; i < 4; i++) { const h = p.houses[i % p.houses.length], w = h.getWorldPosition(V3()); p.dust.emit(w.x + (Math.random() - .5) * 4, w.y + .5, w.z + (Math.random() - .5) * 4, (Math.random() - .5) * 3, 2 + Math.random() * 2, (Math.random() - .5) * 3, 1.6); }
      p.dust.step(dt, 2, .5);
      p.trace.push((Math.random() - .5) * (q * 2 + .06)); if (p.trace.length > 180) p.trace.shift();
      return p.sc;
    },
    hud(ctx) {
      const p = PL;
      label3(ctx, p.india.localToWorld(V3(0, 9, 30)), 'Indian plate: moving north', 'rgba(255,181,46,.92)', '#2A1600');
      label3(ctx, V3(-40, 6, -45), 'Eurasian plate');
      if (p.push > .3) label3(ctx, V3(0, 26 * p.push, -7), 'Himalayas!', 'rgba(244,247,251,.95)', '#16215A', 14);
      if (p.push < .55) label3(ctx, V3(30, 1, (1 - p.push) * 8 - 2), 'Ancient sea', 'rgba(42,111,192,.9)', '#fff', 11);
      // seismometer
      const w = Math.min(260, A.W - 32), h = 70, x = A.W - w - 16, y = A.top();
      panel(ctx, x, y, w, h);
      hudText(ctx, 'Seismometer', x + 10, y + 16, 11, '#C9D0F2', 'left', 600);
      ctx.strokeStyle = p.quake > 0 ? '#FF6D8A' : '#6FEA95'; ctx.lineWidth = 1.6; ctx.beginPath();
      p.trace.forEach((v, i) => { const px = x + 10 + i / 180 * (w - 20), py = y + 42 + v * 22; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
    }
  };

  /* ================================================================ Cyclone over the Bay of Bengal */
  let CY = null;
  function cycloneTex() {
    return E3.canvasTex(512, 512, (g, w) => {
      const c = w / 2;
      for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 520; i++) {
        const u = i / 520, ang = arm * TAU / 4 + u * 3.6 * PI, rr = 22 + u * 210 + (Math.random() - .5) * 22 * u;
        const x = c + Math.cos(ang) * rr, y = c + Math.sin(ang) * rr, s = 10 + u * 34, a = (1 - u) * .22 + .05;
        const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2);
      }
      const wall = g.createRadialGradient(c, c, 10, c, c, 46); wall.addColorStop(0, 'rgba(255,255,255,0)'); wall.addColorStop(.35, 'rgba(255,255,255,.95)'); wall.addColorStop(1, 'rgba(255,255,255,.5)');
      g.fillStyle = wall; g.beginPath(); g.arc(c, c, 46, 0, TAU); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(c, c, 12, 0, TAU); g.fill();
    });
  }
  M.cyclone = {
    line: 'e_cyclone',
    make() {
      const sc = new T.Scene(); sc.add(E3.starfield(9000)); sc.add(new T.AmbientLight(0xffffff, .12));
      const sl = new T.DirectionalLight(0xffffff, 1.5); sc.add(sl);
      const R = 10, earth = E3.earthHD(R); sc.add(earth);
      const holder = new T.Group(); earth.spin.add(holder);
      const disc = new T.Mesh(new T.CircleGeometry(R * .16, 64), new T.MeshLambertMaterial({ map: cycloneTex(), transparent: true, depthWrite: false, alphaTest: .01 })); holder.add(disc);
      CY = { sc, earth, holder, disc, sl, R, p: 0, eye: false };
    },
    place() {
      const c = CY, la = lerp(12.5, 19.6, c.p), lo = lerp(89.5, 86.4, c.p), n = E3.latLonToVec(la, lo).normalize();
      c.holder.position.copy(n).multiplyScalar(c.R * 1.014); c.holder.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
    },
    enter() {
      if (!CY) this.make();
      CY.p = 0; CY.eye = false; this.place();
      // turn Earth so the Bay of Bengal faces us
      CY.earth.spin.rotation.y = 0; const n = E3.latLonToVec(15, 87); const yaw = Math.atan2(n.x, n.z), pitch = Math.asin(n.y);
      A.view({ goal: V3(), dist: 27, yaw, pitch, min: 10.4, max: 80 });
      A.setCtl([{ id: 'eye', label: 'Zoom to the eye', go: true }, { id: 'whole', label: 'Whole Earth', cyan: true }]);
    },
    act(id) {
      const c = ctl();
      if (id === 'eye') { CY.eye = true; CY.earth.loadSharp(); c.follow = g => CY.holder.getWorldPosition(g); const n = CY.holder.getWorldPosition(V3()).normalize(); c.goalYaw = Math.atan2(n.x, n.z); c.goalPitch = Math.asin(n.y); c.goalDist = 4.2; c.min = 1.2; c.retarget(); Voice.say('e_eye'); }
      if (id === 'whole') { CY.eye = false; c.follow = null; c.goal.set(0, 0, 0); c.goalDist = 27; c.min = 10.4; c.retarget(); }
    },
    frame(dt) {
      const c = CY;
      c.p = Math.min(1, c.p + dt / 50); this.place();
      c.disc.rotation.z += dt * .5;
      const sun = cam().position.clone().normalize().applyAxisAngle(V3(0, 1, 0), -.5).add(V3(0, .3, 0)).normalize();
      c.sl.position.copy(sun).multiplyScalar(100); E3.lightDir(c.earth, sun);
      c.earth.clouds.rotation.y += dt * .008;
      ctl().rotSpeed = clamp((ctl().dist - c.R) / 20, .05, 1);
      return c.sc;
    },
    hud(ctx) {
      const c = CY, T0 = A.top(), w = c.holder.getWorldPosition(V3());
      panel(ctx, 16, T0, 250, 76);
      hudText(ctx, 'Cyclone over the Bay of Bengal', 28, T0 + 22, 14, '#FFB52E', 'left');
      hudText(ctx, 'Winds: up to 180 km/h', 28, T0 + 42, 13, '#F3F1FF', 'left', 600);
      hudText(ctx, c.p < 1 ? 'Heading for the coast of Odisha' : 'Reaching the coast: heavy rain!', 28, T0 + 62, 12, '#C9D0F2', 'left', 600);
      label3(ctx, w.clone().multiplyScalar(1.02).add(V3(0, c.eye ? .25 : 1.2, 0)), c.eye ? 'The calm eye' : 'Cyclone', 'rgba(255,255,255,.92)', '#16215A');
      if (!c.eye) { label3(ctx, E3.latLonToVec(23, 78, c.R * 1.02).applyMatrix4(c.earth.spin.matrixWorld), 'India', 'rgba(255,181,46,.9)', '#2A1600', 11); }
      hudPill(ctx, 'Cyclones here get names like Fani and Amphan', A.W / 2, A.bottom() - 6, 'rgba(13,20,52,.88)', '#C9D0F2', 12);
    }
  };

  /* ================================================================ Thunderstorm and rainbow */
  let ST = null;
  function rainbowMat(inner, outer, strength) {
    return new T.ShaderMaterial({
      uniforms: { op: { value: 0 }, r0: { value: inner }, r1: { value: outer }, s: { value: strength } }, transparent: true, depthWrite: false, fog: false, side: T.DoubleSide,
      vertexShader: `varying float vR; void main(){ vR = length(position.xy); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float op, r0, r1, s; varying float vR;
        vec3 hsv(float h){ vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); return k; }
        void main(){ float k = (vR - r0) / (r1 - r0); float hue = mix(.78, 0.0, k);
          float a = op * s * smoothstep(0.0, .12, k) * (1.0 - smoothstep(.88, 1.0, k));
          gl_FragColor = vec4(hsv(hue), a); }`
    });
  }
  function bolt(x, z, top) {
    const pts = [V3(x, top, z)]; let px = x, pz = z;
    for (let i = 1; i <= 16; i++) { px += (Math.random() - .5) * 9; pz += (Math.random() - .5) * 5; pts.push(V3(px, top * (1 - i / 16), pz)); }
    const g = new T.Group(), m = new T.LineBasicMaterial({ color: 0xffffff, fog: false });
    g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), m));
    const b = pts[5 + (Math.random() * 5 | 0)], bp = [b]; let bx = b.x, by = b.y, bz = b.z;
    for (let i = 0; i < 6; i++) { bx += (Math.random() - .3) * 8; by -= 5; bz += (Math.random() - .5) * 4; bp.push(V3(bx, by, bz)); }
    g.add(new T.Line(new T.BufferGeometry().setFromPoints(bp), m));
    const gl = E3.glow(0xd8e4ff, 140, .9); gl.material.fog = false; gl.position.copy(pts[8]); g.add(gl);
    return g;
  }
  M.storm = {
    line: 'e_storm',
    make() {
      const sc = new T.Scene(), NT = window.NATURE; sc.fog = new T.Fog(0x56606e, 80, 420);
      const sky = NT.sky({ top: 0x2e3644, horizon: 0x56606e, clouds: .95, cloudColor: 0x5a6270, cloudShade: 0x262c34, sun: V3(-.3, .45, .8), glow: 0, cloudScale: .45 }); sc.add(sky);
      const hemi = new T.HemisphereLight(0xc8d6ea, 0x2a3a1a, .45); sc.add(hemi);
      const sl = new T.DirectionalLight(0xfff2dc, 0); sl.position.set(-30, 40, 80); sl.castShadow = true; sl.shadow.mapSize.set(2048, 2048); const c = sl.shadow.camera; c.left = c.bottom = -80; c.right = c.top = 80; c.far = 300; sc.add(sl);
      const ground = E3.terrain({ size: 900, seg: 180, amp: 10, freq: .006, seed: 51, flat: [[0, 0, 40]] });
      NT.paintGround(ground, (x, y, z, sl, n, n2) => [...NT.mixc(NT.mixc(NT.rgb(0x5a8a3a), NT.rgb(0x3e6a2a), n2), NT.rgb(0x7a7048), NT.sm(.6, .8, n) * .6), NT.sm(.25, .45, sl)], 'grass', 'dirt', { repeat: 130 }); sc.add(ground);
      for (let i = 0; i < 60; i++) { const x = (Math.random() - .5) * 340, z = -16 - Math.random() * 240; const t = NT.plant(Math.random() < .8 ? 'broad' : 'shrub', { scale: .8 + Math.random() * .5 }); t.position.set(x, ground.height(x, z), z); sc.add(t); }
      const grass = NT.scatter('grass', 2600, r => { const x = (r() - .5) * 60, z = 2 - r() * 60; return [x, ground.height(x, z), z]; }, { size: .9, seed: 21 }); sc.add(grass);
      const h = house(0xf0e2c8); h.scale.setScalar(2.6); h.position.set(-16, ground.height(-16, -30), -30); sc.add(h);
      const clouds = [];
      for (let i = 0; i < 46; i++) { const s = E3.glow(0x4a5260, 70 + Math.random() * 70, .95); s.material.blending = T.NormalBlending; s.material.fog = false; s.position.set((Math.random() - .5) * 460, 48 + Math.random() * 30, -30 - Math.random() * 260); s.home = s.position.clone(); sc.add(s); clouds.push(s); }
      const rain = makeParticles(3500, 0xaec4e4, .35, false); sc.add(rain);
      const rb = new T.Mesh(new T.RingGeometry(150, 175, 160, 1, 0, PI), rainbowMat(150, 175, .55)); rb.position.set(0, -24, -230); sc.add(rb);
      const rb2 = new T.Mesh(new T.RingGeometry(196, 210, 160, 1, 0, PI), rainbowMat(210, 196, .18)); rb2.position.copy(rb.position); sc.add(rb2);
      ST = { sc, sky, grass, hemi, sl, clouds, rain, rb, rb2, clear: 0, clearing: false, bolt: null, boltT: 0, count: null, next: 3, msg: null, said: false };
    },
    enter() {
      if (!ST) this.make();
      Object.assign(ST, { clear: 0, clearing: false, count: null, next: 4, msg: null, said: false });
      A.view({ goal: V3(0, 7, 0), dist: 3, yaw: 0, pitch: -.1, min: 1.5, max: 6, minPitch: -.9, maxPitch: .3 });
      A.setCtl([{ id: 'flash', label: 'Lightning!', cyan: true }, { id: 'sun', label: 'Make the Sun come out', go: true }]);
    },
    act(id) {
      if (id === 'flash' && ST.clear < .3 && ST.count === null) this.strike();
      if (id === 'sun') { ST.clearing = !ST.clearing; btnLabel('sun', ST.clearing ? 'Bring the storm back' : 'Make the Sun come out'); if (!ST.clearing) ST.said = false; }
    },
    strike() {
      const s = ST, km = 1 + Math.random() * 2.2, x = (Math.random() - .5) * 220, z = -60 - km * 70;
      if (s.bolt) s.sc.remove(s.bolt);
      s.bolt = bolt(x, z, 62); s.sc.add(s.bolt); s.boltT = .35;
      s.count = { t: 0, km, delay: km * 2.9 };
    },
    frame(dt) {
      const s = ST;
      s.clear = clamp(s.clear + (s.clearing ? dt / 6 : -dt / 4), 0, 1);
      const c = smooth(0, 1, s.clear), stormy = 1 - c;
      if (stormy > .2) for (let i = 0; i < Math.round(26 * stormy); i++) s.rain.emit(cam().position.x + (Math.random() - .5) * 90, 40, cam().position.z - 4 - Math.random() * 70, -2, -48, 0, 1.2);
      s.rain.step(dt, 0, 0);
      s.clouds.forEach((cl, i) => { cl.position.copy(cl.home).add(V3(Math.sin(A.t * .05 + i) * 6 + c * (i % 2 ? 1 : -1) * 260, c * 40, 0)); cl.material.opacity = .95 * (1 - c * .85); cl.material.color.setRGB(lerp(.29, .95, c), lerp(.32, .96, c), lerp(.38, .98, c)); });
      const flash = s.boltT > 0 ? (Math.random() < .7 ? 1 : .3) : 0;
      s.boltT = Math.max(0, s.boltT - dt); if (s.bolt) s.bolt.visible = s.boltT > 0;
      const sky = new T.Color(0x3a4352).lerp(new T.Color(0x7cb8ec), c).lerp(new T.Color(0xc8d4ff), flash * .5);
      const hor = new T.Color(0x56606e).lerp(new T.Color(0xc4daee), c).lerp(new T.Color(0xc8d4ff), flash * .5), u = s.sky.u;
      s.sc.fog.color.copy(hor); u.hor.value.copy(hor); u.below.value.copy(hor); u.top.value.set(0x2e3644).lerp(new T.Color(0x2f6cc4), c).lerp(new T.Color(0x9aa8d8), flash * .4);
      u.cloud.value = lerp(.95, .3, c); u.cloudCol.value.set(0x5a6270).lerp(new T.Color(0xffffff), c); u.cloudShade.value.set(0x262c34).lerp(new T.Color(0x9aa5b8), c); u.glow.value = c;
      s.sky.tick(dt * (1 + stormy * 3)); s.grass.tick(dt * (1 + stormy * 2));
      s.hemi.intensity = lerp(.45, .85, c) + flash * 1.6; s.sl.intensity = c * 1.4;
      s.rb.material.uniforms.op.value = smooth(.5, 1, c); s.rb2.material.uniforms.op.value = smooth(.6, 1, c);
      if (c > .6 && !s.said) { s.said = true; Voice.say('e_rainbow'); }
      if (s.count) { s.count.t += dt; if (s.count.t >= s.count.delay && !s.count.heard) { s.count.heard = true; thunder(s.count.km); s.msg = { text: `Thunder after ${Math.round(s.count.delay)} seconds: the storm is about ${Math.round(s.count.delay / 3)} km away`, life: 5 }; } if (s.count.t > s.count.delay + 1.5) { s.count = null; s.next = 6 + Math.random() * 6; } }
      else if (stormy > .7) { s.next -= dt; if (s.next <= 0) this.strike(); }
      if (s.msg) { s.msg.life -= dt; if (s.msg.life <= 0) s.msg = null; }
      return s.sc;
    },
    hud(ctx) {
      const s = ST, T0 = A.top();
      if (s.count && !s.count.heard) hudPill(ctx, `Flash! Count: ${Math.floor(s.count.t) + 1}…`, A.W / 2, T0 + 20, 'rgba(255,255,255,.92)', '#16215A', 18);
      if (s.msg) hudPill(ctx, s.msg.text, A.W / 2, T0 + 52, 'rgba(13,20,52,.9)', '#FFB52E', 13);
      if (s.clear > .7) hudPill(ctx, 'V I B G Y O R', A.W / 2, T0 + 20, 'rgba(13,20,52,.75)', '#F3F1FF', 15);
    }
  };
})();
