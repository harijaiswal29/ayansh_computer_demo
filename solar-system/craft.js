/* Missions: hands-on 3D simulations of famous real spacecraft, with real planet maps and real physics numbers.
   Uses E3 (engine3d.js) plus the shared helpers from index.html (Voice, Sfx, ...). */
'use strict';
const ICON = {
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7-7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  again: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4h4"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  drill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v8M8 11h8l-4 10z"/></svg>',
  rotor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M12 6v6"/><rect x="8" y="12" width="8" height="6" rx="1.5"/></svg>'
};
// small shared 2D helpers for the heads-up displays
function hudText(ctx, str, x, y, size = 15, color = '#F3F1FF', align = 'center', weight = 700) {
  ctx.font = `${weight} ${size}px Fredoka, "Trebuchet MS", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color; ctx.fillText(str, x, y);
}
function hudPill(ctx, str, x, y, bg = 'rgba(13,20,52,.88)', fg = '#F3F1FF', size = 14) {
  ctx.font = `700 ${size}px Fredoka, sans-serif`; const w = ctx.measureText(str).width + 20;
  ctx.fillStyle = bg; roundRect(ctx, x - w / 2, y - size - 4, w, size + 12, (size + 12) / 2); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, x, y + 2);
}
function hudGauge(ctx, x, y, w, label, v, col) {
  ctx.fillStyle = 'rgba(13,20,52,.85)'; roundRect(ctx, x, y, w, 40, 10); ctx.fill();
  hudText(ctx, label, x + 10, y + 15, 11, '#C9D0F2', 'left', 600);
  ctx.fillStyle = '#16215A'; roundRect(ctx, x + 10, y + 22, w - 20, 9, 4); ctx.fill();
  ctx.fillStyle = col; roundRect(ctx, x + 10, y + 22, Math.max(6, (w - 20) * clamp(v, 0, 1)), 9, 4); ctx.fill();
}
// little particle systems: dust, rocket exhaust, thruster puffs
function makeParticles(n, color, size, additive = true) {
  const T = THREE, g = new T.BufferGeometry(), pos = new Float32Array(n * 3); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setDrawRange(0, 0);
  const dot = E3.canvasTex(32, 32, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
  const p = new T.Points(g, new T.PointsMaterial({ color, size, map: dot, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending }));
  p.frustumCulled = false; p.list = [];
  p.emit = (x, y, z, vx, vy, vz, life) => { if (p.list.length < n) p.list.push({ x, y, z, vx, vy, vz, l: 0, life }); };
  p.step = (dt, gy = 0, drag = 0) => {
    const L = p.list; for (let i = L.length - 1; i >= 0; i--) { const q = L[i]; q.l += dt; if (q.l > q.life) { L.splice(i, 1); continue; } q.vy -= gy * dt; q.vx *= 1 - drag * dt; q.vz *= 1 - drag * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; }
    for (let i = 0; i < L.length; i++) { pos[i * 3] = L[i].x; pos[i * 3 + 1] = L[i].y; pos[i * 3 + 2] = L[i].z; }
    g.attributes.position.needsUpdate = true; g.setDrawRange(0, L.length);
  };
  return p;
}
function ringMarker(rad, color = 0x6fea95) { const m = new THREE.Mesh(new THREE.TorusGeometry(rad, rad * .06, 8, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .85 })); m.rotation.x = Math.PI / 2; return m; }

views.craft = (() => {
  const T = THREE, ov = $('#craftCv');
  ov.classList.add('over2d');
  let r, cam, ctl, W = 0, H = 0, t = 0, cur = null, held = {}, said = new Set(), lastTalk = 0, pillMsg = null, ready = false;
  const S = {};
  const LIST = ['iss', 'chandrayaan', 'mangalyaan', 'voyager', 'parker', 'juno', 'cassini', 'newhorizons', 'webb', 'perseverance'];
  const say = (id, done) => { lastTalk = performance.now(); Voice.say(id, done); };
  const sayOnce = id => { if (!said.has(id)) { said.add(id); say(id); } };
  const sayFree = (id, gap = 6000) => { if (!Voice.busy && performance.now() - lastTalk > gap) say(id); };
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const top = () => { const h = $('#craftHud'); return h.offsetHeight ? h.offsetTop + h.offsetHeight + 10 : 132; };
  const bottom = () => H - ($('#craftCtl').offsetHeight || 50) - 18;
  const msg = (s, secs = 2.5) => { pillMsg = [s, secs]; };
  const particles = makeParticles;

  function init() {
    r = E3.attach(ov); r.shadowMap.enabled = true; E3.mats(r);
    cam = new T.PerspectiveCamera(45, 1, .05, 60000);
    ctl = new E3.Orbit(cam, ov, { dist: 10 });
    ctl.onTap = (x, y) => cur?.tap?.(x, y);
    ready = true;
  }
  // point the shared camera for a simulation
  function view(o) {
    ctl.follow = o.follow || null; if (o.goal) ctl.goal.copy(o.goal);
    ctl.goalDist = o.dist ?? ctl.goalDist; ctl.min = o.min ?? .5; ctl.max = o.max ?? 5000;
    if (o.yaw !== undefined) ctl.goalYaw = o.yaw; if (o.pitch !== undefined) ctl.goalPitch = o.pitch;
    ctl.minPitch = o.minPitch ?? -1.45; ctl.maxPitch = o.maxPitch ?? 1.45; ctl.quat = o.quat || null; ctl.auto = o.auto || 0;
    cam.near = o.near ?? .05; cam.far = o.far ?? 60000; cam.fov = o.fov ?? 45; cam.updateProjectionMatrix();
    ctl.retarget(); if (o.snap) ctl.snap();
  }
  const project = v => E3.toScreen(v, cam, W, H);
  function layout() { if (!ready) return; E3.attach(ov); const f = fitCanvas(ov); W = f.w; H = f.h; E3.fit(r, cam); }

  function setCtl(items) {
    const el = $('#craftCtl'); el.innerHTML = ''; held = {};
    for (const it of items) {
      if (it.range) {
        const rg = document.createElement('input'); rg.type = 'range'; rg.className = 'yr'; rg.id = it.id; rg.min = it.min; rg.max = it.max; rg.step = it.step; rg.value = it.value; rg.setAttribute('aria-label', it.aria);
        rg.addEventListener('input', () => cur.act?.(it.id, +rg.value)); el.appendChild(rg); continue;
      }
      const b = document.createElement('button'); b.type = 'button'; b.dataset.id = it.id;
      b.className = 'btn small' + (it.go ? ' go' : '') + (it.cyan ? ' cyan' : '') + (it.hold ? ' hold' : '');
      b.innerHTML = (it.icon ? ICON[it.icon] : '') + `<span>${it.label || ''}</span>`;
      if (it.aria) b.setAttribute('aria-label', it.aria);
      if (it.pressed !== undefined) b.setAttribute('aria-pressed', it.pressed ? 'true' : 'false');
      if (it.hold) {
        const on = e => { e.preventDefault(); held[it.id] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} cur.press?.(it.id); };
        const off = () => { held[it.id] = false; b.classList.remove('on'); };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
        b.addEventListener('contextmenu', e => e.preventDefault());
        b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { held[it.id] = true; cur.press?.(it.id); } });
        b.addEventListener('keyup', () => { held[it.id] = false; });
      } else b.addEventListener('click', () => { Sfx.tap(); cur.act?.(it.id); });
      el.appendChild(b);
    }
    layout();
  }
  const label = (id, text) => { const b = $(`#craftCtl [data-id="${id}"] span`); if (b) b.textContent = text; };

  function pick(id) {
    if (!ready) init();
    cur = S[id]; said = new Set(); pillMsg = null;
    $$('.craft').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false'));
    $('#craftName').textContent = cur.name; $('#craftFacts').textContent = cur.facts;
    if (!cur.scene) cur.make();
    cur.reset(); Sfx.whoosh(); say(cur.line);
  }
  const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', ' ': 'space' };
  window.addEventListener('keydown', e => {
    if (current !== 'craft' || !cur?.keys || !KEYS[e.key] || e.target.tagName === 'INPUT') return;
    const id = cur.keys[KEYS[e.key]]; if (!id) return;
    e.preventDefault(); if (!held[id]) { cur.press?.(id); if (cur.tapKeys?.includes(id)) cur.act?.(id); } held[id] = true;
  });
  window.addEventListener('keyup', e => { if (cur?.keys && KEYS[e.key]) held[cur.keys[KEYS[e.key]]] = false; });

  function frame(dt) {
    if (!ready) init();
    t += dt;
    if (!cur) return;
    E3.fit(r, cam);
    cur.frame(dt);
    ctl.update(dt);
    r.render(cur.scene, cam);
    const ctx = ov.getContext('2d'), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    cur.hud?.(ctx, dt);
    if (pillMsg && pillMsg[1] > 0) { pillMsg[1] -= dt; hudPill(ctx, pillMsg[0], W / 2, bottom() - 6, 'rgba(13,20,52,.92)', '#FFB52E', 15); }
  }

  // common scene pieces
  function baseScene(o = {}) {
    const sc = new T.Scene(); sc.add(E3.starfield(o.sky || 40000));
    sc.add(new T.AmbientLight(0xffffff, o.ambient ?? .05));
    const sun = new T.DirectionalLight(0xffffff, o.sunI ?? 1.6); sun.position.copy(o.sunDir || V3(1, .2, .3)).normalize().multiplyScalar(500); sc.add(sun); sc.add(sun.target); sc.sun = sun;
    return sc;
  }
  const kepler = (o, dt) => { const rr = o.a * (1 - o.e * o.e) / (1 + o.e * Math.cos(o.th)); o.th += dt * o.h / (rr * rr); o.r = rr; return rr; };
  const ellipsePts = (a, e, n = 256, map = (x, z) => V3(x, 0, z)) => { const pts = []; for (let i = 0; i <= n; i++) { const th = i / n * TAU, rr = a * (1 - e * e) / (1 + e * Math.cos(th)); pts.push(map(Math.cos(th) * rr, -Math.sin(th) * rr)); } return pts; };
  const line = (pts, color, opacity = .6, dashed) => {
    const g = new T.BufferGeometry().setFromPoints(pts);
    const m = dashed ? new T.LineDashedMaterial({ color, transparent: true, opacity, dashSize: dashed, gapSize: dashed * .8, depthWrite: false }) : new T.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const l = new T.Line(g, m); if (dashed) l.computeLineDistances(); return l;
  };

  /* ================================================================ International Space Station */
  S.iss = (() => {
    const RE = 50, RO = 53.15, INC = 51.6 * PI / 180, sunDir = V3(1, .25, .35).normalize();
    let sc, earth, iss, light, ang, sunrises, wasDay, mode, closeUp, indians, scIn, scDock, inside, dock;
    const basis = new T.Quaternion(), m4 = new T.Matrix4();
    function orbitFrame(a, pos, vel) {
      const e1 = V3(1, 0, 0), e2 = V3(0, Math.sin(INC), Math.cos(INC));
      pos.copy(e1).multiplyScalar(Math.cos(a) * RO).addScaledVector(e2, Math.sin(a) * RO);
      vel.copy(e1).multiplyScalar(-Math.sin(a)).addScaledVector(e2, Math.cos(a)).normalize();
    }
    function makeInside() {
      scIn = new T.Scene(); scIn.background = new T.Color(0x0b0d14);
      const wall = E3.canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = '#DDE2EA'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#C9CFDB' : '#D3D8E3'; g.fillRect(i * w / 4 + 6, 20, w / 4 - 12, h - 40); g.strokeStyle = '#AEB6C6'; g.lineWidth = 3; g.strokeRect(i * w / 4 + 6, 20, w / 4 - 12, h - 40); }
        const cols = ['#59E0E8', '#FF6D8A', '#6FEA95', '#FFB52E', '#5E79C9'];
        for (let i = 0; i < 46; i++) { g.fillStyle = cols[i % 5]; const x = Math.random() * w, y = 30 + Math.random() * (h - 60); g.fillRect(x, y, 8 + Math.random() * 18, 6 + Math.random() * 10); }
        g.fillStyle = '#FFB52E'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
        g.strokeStyle = '#7A8296'; g.lineWidth = 4; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 60 + i * 75); g.bezierCurveTo(w * .3, 40 + i * 75, w * .6, 90 + i * 75, w, 60 + i * 75); g.stroke(); }
      }, true);
      wall.repeat.set(4, 3);
      const tube = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 16, 32, 1, true), new T.MeshStandardMaterial({ map: wall, side: T.BackSide, roughness: .8 }));
      tube.rotation.x = Math.PI / 2; scIn.add(tube);
      const hatch = new T.Mesh(new T.CircleGeometry(2.2, 40), new T.MeshStandardMaterial({ color: 0xb8bfcc, roughness: .6 })); hatch.position.z = 8; hatch.rotation.y = Math.PI; scIn.add(hatch);
      const door = new T.Mesh(new T.TorusGeometry(1, .08, 8, 40), new T.MeshStandardMaterial({ color: 0x7a8296 })); door.position.z = 7.95; scIn.add(door);
      // the Cupola window looking down at Earth
      const earthView = new T.Mesh(new T.CircleGeometry(1.5, 48), new T.MeshBasicMaterial({ color: 0x2a5aa0 })); earthView.position.z = -8; scIn.add(earthView);
      E3.tex('earth_day').ready.then(tx => { const m = tx.clone(); m.needsUpdate = true; m.repeat.set(.12, .22); m.offset.set(.66, .58); earthView.material.map = m; earthView.material.color.set(0xffffff); earthView.material.needsUpdate = true; });
      const frameRing = new T.Mesh(new T.TorusGeometry(1.55, .14, 10, 6), new T.MeshStandardMaterial({ color: 0xc9ced8, metalness: .6, roughness: .3 })); frameRing.position.z = -7.95; scIn.add(frameRing);
      for (let i = 0; i < 4; i++) { const pl = new T.PointLight(0xfff6ea, .55, 12); pl.position.set(0, 1.6, -6 + i * 4); scIn.add(pl); }
      scIn.add(new T.AmbientLight(0xffffff, .35));
      const M = E3.mats();
      const water = new T.Mesh(new T.SphereGeometry(.28, 32, 16), new T.MeshStandardMaterial({ color: 0x5ab8ff, transparent: true, opacity: .7, roughness: .05, metalness: .1 }));
      const roti = new T.Mesh(new T.CylinderGeometry(.34, .34, .025, 32), new T.MeshStandardMaterial({ color: 0xe6c88a, roughness: .9 }));
      const bag = new T.Group(); bag.add(E3.box(.7, 1.9, .3, new T.MeshStandardMaterial({ color: 0x4f6bc0, roughness: .9 }))); bag.add(E3.at(E3.sph(.2, M.white), 0, .65, .12));
      const bike = new T.Group(); bike.add(new T.Mesh(new T.TorusGeometry(.4, .06, 8, 24), M.dark)); bike.add(E3.at(E3.cyl(.04, .04, .9, M.grey, 8), 0, .45, 0)); bike.add(E3.at(E3.box(.4, .08, .2, M.orange), 0, .9, 0));
      const win = new T.Group();
      inside = { items: [
        { id: 'water', line: 'iss_water', obj: water, home: V3(-.8, .4, -3), float: 1 },
        { id: 'food', line: 'iss_food', obj: roti, home: V3(.9, -.2, -1), float: 1 },
        { id: 'sleep', line: 'iss_sleep', obj: bag, home: V3(-1.8, 0, 2), rot: [0, Math.PI / 2, 0] },
        { id: 'bike', line: 'iss_bike', obj: bike, home: V3(1.4, -1.3, 3.5), rot: [0, Math.PI / 2, 0] },
        { id: 'window', line: 'iss_window', obj: win, home: V3(0, 0, -7.6) }] };
      for (const it of inside.items) { it.obj.position.copy(it.home); if (it.rot) it.obj.rotation.set(...it.rot); scIn.add(it.obj); const g = E3.glow(0xffb52e, 1.3, 0); it.obj.add(g); it.glow = g; }
      inside.me = E3.MODELS.astronaut(); inside.me.scale.setScalar(.7); scIn.add(inside.me);
      inside.pos = V3(0, -.6, 1); inside.vel = V3(); inside.goal = null;
    }
    function makeDock() {
      scDock = baseScene({ sunDir, ambient: .12 }); scDock.sun.intensity = 1.8;
      const e = E3.planet('earth', 400, { seg: 160, atmoScale: 1.01, atmoStrength: .5 }); e.position.set(0, -430, 0); scDock.add(e); E3.lightDir(e, sunDir); scDock.earth = e;
      scDock.add(E3.MODELS.iss());
      const port = V3(0, -.45, 3.75); const pr = ringMarker(.35); pr.position.copy(port); pr.rotation.set(0, 0, 0); scDock.add(pr);
      const cross = new T.Group(), cm = new T.MeshBasicMaterial({ color: 0x6fea95 }); cross.add(E3.box(.02, .5, .02, cm)); cross.add(E3.box(.5, .02, .02, cm)); cross.position.copy(port); scDock.add(cross);
      const cap = E3.MODELS.capsule(); cap.scale.setScalar(.2); cap.rotation.y = Math.PI; scDock.add(cap);
      const jets = particles(300, 0xdde8ff, .12, false); scDock.add(jets);
      dock = { cap, port, jets };
    }
    function controls() {
      const m = [{ id: 'orbit', label: 'Orbit', pressed: mode === 'orbit' }, { id: 'inside', label: 'Go inside', pressed: mode === 'inside' }, { id: 'dock', label: 'Dock', pressed: mode === 'dock' }];
      if (mode === 'orbit') m.push({ id: 'close', label: 'Close-up', cyan: true }, { id: 'india', label: 'Indians in space', go: true });
      if (mode === 'dock') m.push({ id: 'left', icon: 'left', hold: true, aria: 'Left' }, { id: 'up', icon: 'up', hold: true, aria: 'Up' }, { id: 'down', icon: 'down', hold: true, aria: 'Down' }, { id: 'right', icon: 'right', hold: true, aria: 'Right' }, { id: 'fwd', icon: 'next', label: 'Forward', hold: true, go: true }, { id: 'brake', label: 'Brake', hold: true });
      setCtl(m);
    }
    function resetDock() {
      const d = dock; d.p = V3((Math.random() - .5) * 2.4, (Math.random() - .5) * 1.6 - .45, 9); d.v = V3(0, 0, 0); d.done = false; d.crash = 0;
      d.cap.position.copy(d.p);
    }
    function setMode(m) {
      mode = m; closeUp = false; indians = false; controls();
      const self = S.iss;
      if (m === 'orbit') { self.scene = sc; view({ follow: g => g.copy(iss.position), quat: basis, dist: 1.1, yaw: .95, pitch: .5, min: .25, max: 30, near: .01, far: 60000, snap: true }); }
      if (m === 'inside') { if (!scIn) makeInside(); self.scene = scIn; inside.pos.set(0, -.6, 1); inside.vel.set(0, 0, 0); inside.goal = null; view({ follow: g => g.copy(inside.pos), dist: 3.2, yaw: .5, pitch: .2, min: 1.2, max: 4, near: .05, far: 100, snap: true }); say('iss_inside'); }
      if (m === 'dock') { if (!scDock) makeDock(); self.scene = scDock; resetDock(); view({ follow: g => g.copy(dock.cap.position).lerp(dock.port, .3), dist: 4.2, yaw: 1.05, pitch: .32, min: .8, max: 30, near: .01, far: 60000, snap: true }); say('iss_dock'); }
    }
    const LABELS = [['Solar panels', V3(-4.6, 0, -2.8)], ['Living rooms (modules)', V3(0, -.45, 1.85)], ['Robot arm', V3(1.7, 1.5, .2)], ['Cooling radiators', V3(1.6, -.3, -1.6)], ['Docking port', V3(0, -.45, 3.7)]];
    return {
      name: 'International Space Station', line: 'iss_intro', facts: 'Started in 1998 · 400 km above Earth · 28,000 km/h · People have lived on it since 2000',
      keys: { up: 'up', down: 'down', left: 'left', right: 'right', space: 'fwd' },
      make() {
        sc = baseScene({ sunDir, ambient: .04 }); light = sc.sun; light.intensity = 1.9;
        earth = E3.planet('earth', RE, { seg: 200, atmoScale: 1.012, atmoStrength: .55 }); sc.add(earth); E3.lightDir(earth, sunDir);
        const sunG = E3.glow(0xfff2d0, 900, 1); sunG.position.copy(sunDir).multiplyScalar(9000); sc.add(sunG);
        iss = E3.MODELS.iss(); iss.scale.setScalar(.03); sc.add(iss);
        const pts = []; for (let i = 0; i <= 256; i++) { const p = V3(), v = V3(); orbitFrame(i / 256 * TAU, p, v); pts.push(p); }
        sc.add(line(pts, 0x59e0e8, .35));
        this.scene = sc;
      },
      reset() { ang = 0; sunrises = 0; wasDay = true; setMode('orbit'); },
      act(id) {
        if (id === 'orbit' || id === 'inside' || id === 'dock') { if (mode !== id) setMode(id); return; }
        if (id === 'close') { closeUp = !closeUp; ctl.goalDist = closeUp ? .55 : 1.1; if (closeUp) say('iss_parts'); }
        if (id === 'india') { indians = true; say('iss_india'); }
      },
      tap(x, y) {
        if (mode === 'orbit') { if (indians) indians = false; return; }
        if (mode === 'inside') {
          for (const it of inside.items) { const p = project(it.obj.getWorldPosition(V3())); if (p.front && Math.hypot(x - p.x, y - p.y) < 60) { it.lit = 2; it.found = true; Sfx.twinkle(); say(it.line); return; } }
          const ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(x / W * 2 - 1, -(y / H) * 2 + 1), cam);
          const hit = ray.intersectObjects(scIn.children, true)[0]; if (hit) { inside.goal = hit.point.clone(); Sfx.tap(); }
        }
      },
      frame(dt) {
        if (mode === 'orbit') {
          ang += dt * TAU / 60;
          const pos = V3(), vel = V3(); orbitFrame(ang, pos, vel);
          iss.position.copy(pos);
          const up = pos.clone().normalize(), side = V3().crossVectors(up, vel).normalize();
          m4.makeBasis(side, up, vel); basis.setFromRotationMatrix(m4); iss.quaternion.copy(basis);
          earth.spin.rotation.y += dt * .015; if (earth.clouds) earth.clouds.rotation.y += dt * .002;
          // in Earth's shadow the station goes dark
          const along = pos.dot(sunDir), perp = pos.clone().addScaledVector(sunDir, -along).length();
          const day = along > 0 || perp > RE;
          light.intensity += ((day ? 1.9 : 0) - light.intensity) * Math.min(1, dt * 6);
          if (day && !wasDay) { sunrises++; Sfx.twinkle(); }
          wasDay = day; this.day = day;
        } else if (mode === 'inside') {
          const I = inside;
          if (I.goal) { const d = I.goal.clone().sub(I.pos); I.vel.addScaledVector(d.normalize(), dt * 1.6); if (I.goal.distanceTo(I.pos) < 1.2) I.goal = null; }
          I.vel.multiplyScalar(Math.pow(.55, dt)); I.pos.addScaledVector(I.vel, dt);
          const rad = Math.hypot(I.pos.x, I.pos.y); if (rad > 1.2) { const k = 1.2 / rad; I.pos.x *= k; I.pos.y *= k; I.vel.multiplyScalar(-.5); Sfx.boop(); }
          if (Math.abs(I.pos.z) > 6.4) { I.pos.z = Math.sign(I.pos.z) * 6.4; I.vel.z *= -.5; }
          I.me.position.copy(I.pos).add(V3(0, -.75, 0)); I.me.rotation.x += dt * .15; I.me.rotation.z = Math.sin(t * .4) * .5; I.me.pose(t * .8, true);
          for (const it of I.items) {
            if (it.float) { it.obj.position.copy(it.home).add(V3(Math.sin(t * .7 + it.home.x) * .25, Math.cos(t * .9 + it.home.z) * .2, Math.sin(t * .5) * .3)); it.obj.rotation.x += dt * .4; it.obj.rotation.z += dt * .3; }
            if (it.id === 'water') { const k = 1 + Math.sin(t * 5) * .1; it.obj.scale.set(k, 1 / k, 1); }
            it.lit = Math.max(0, (it.lit || 0) - dt);
            it.glow.material.opacity = it.found ? it.lit * .4 : .35 + .25 * Math.sin(t * 3);
          }
        } else {
          const d = dock, a = .25;
          if (!d.done && !d.crash) {
            if (held.up) d.v.y += a * dt; if (held.down) d.v.y -= a * dt; if (held.left) d.v.x -= a * dt; if (held.right) d.v.x += a * dt; if (held.fwd) d.v.z -= a * .8 * dt;
            if (held.brake) d.v.multiplyScalar(Math.pow(.2, dt));
            for (const [on, dir] of [[held.up, V3(0, -1, 0)], [held.down, V3(0, 1, 0)], [held.left, V3(1, 0, 0)], [held.right, V3(-1, 0, 0)], [held.fwd, V3(0, 0, 1)]]) if (on) for (let i = 0; i < 2; i++) d.jets.emit(d.p.x + dir.x * .3, d.p.y + dir.y * .3, d.p.z + dir.z * .4, dir.x * 1.5 + (Math.random() - .5) * .3, dir.y * 1.5 + (Math.random() - .5) * .3, dir.z * 1.5 + (Math.random() - .5) * .3, .5);
            d.p.addScaledVector(d.v, dt);
            if (d.p.z <= d.port.z + .35) {
              const off = Math.hypot(d.p.x - d.port.x, d.p.y - d.port.y), sp = -d.v.z;
              if (off < .15 && sp < .3) { d.done = true; d.p.set(d.port.x, d.port.y, d.port.z + .35); d.v.set(0, 0, 0); Sfx.chime(); say('iss_docked'); }
              else { d.crash = 1.6; d.v.set(0, 0, .5); Sfx.boop(); say('iss_bump'); }
            }
          } else if (d.crash) { d.crash -= dt; d.p.addScaledVector(d.v, dt); if (d.crash <= 0) resetDock(); }
          d.cap.position.copy(d.p); d.jets.step(dt, 0, 1);
          scDock.earth.spin.rotation.y += dt * .004;
        }
      },
      hud(ctx) {
        const T0 = top(), B = bottom();
        if (mode === 'orbit') {
          const gx = 16, gy = W < 760 ? B - 92 : T0;
          ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, gx, gy, 236, 84, 14); ctx.fill();
          hudText(ctx, `Sunrises seen: ${sunrises}`, gx + 14, gy + 26, 18, '#FFB52E', 'left');
          hudText(ctx, 'Speed: 28,000 km/h · 400 km up', gx + 14, gy + 50, 13, '#F3F1FF', 'left', 600);
          hudText(ctx, this.day ? 'In sunlight' : "In Earth's shadow: night!", gx + 14, gy + 72, 13, this.day ? '#FFE38A' : '#9FB4FF', 'left', 600);
          hudText(ctx, '1 minute here = 1 trip round Earth (90 minutes)', W / 2, B - 4, 12, '#C9D0F2', 'center', 600);
          if (closeUp) for (const [s, v] of LABELS) { const p = project(iss.localToWorld(v.clone())); if (p.front) hudPill(ctx, s, p.x, p.y, 'rgba(89,224,232,.92)', '#062A2E', 12); }
          if (indians) {
            ctx.fillStyle = 'rgba(5,8,23,.85)'; ctx.fillRect(0, 0, W, H);
            const w = Math.min(520, W - 32), x0 = (W - w) / 2, y0 = T0 + 6;
            [['1984', 'Rakesh Sharma', 'First Indian in space'], ['2025', 'Shubhanshu Shukla', 'First Indian on the space station']].forEach(([yr, nm, txt], i) => {
              const y = y0 + i * 112; ctx.fillStyle = 'rgba(22,33,90,.95)'; roundRect(ctx, x0, y, w, 100, 18); ctx.fill();
              drawAstro(ctx, x0 + 44, y + 92, .62, false, 0, t + i);
              hudText(ctx, yr, x0 + 92, y + 32, 16, '#59E0E8', 'left'); hudText(ctx, nm, x0 + 92, y + 60, 24, '#FFB52E', 'left'); hudText(ctx, txt, x0 + 92, y + 84, 15, '#F3F1FF', 'left', 600);
            });
            hudText(ctx, 'Tap to close', W / 2, y0 + 250, 13, '#A8B2DE', 'center', 600);
          }
        } else if (mode === 'inside') {
          for (const it of inside.items) if (!it.found) { const p = project(it.obj.getWorldPosition(V3())); if (p.front) hudPill(ctx, 'Tap me', p.x, p.y - 34, 'rgba(255,181,46,.92)', '#2A1600', 11); }
          hudText(ctx, 'Tap a wall to push off and float · Tap the glowing things', W / 2, B - 4, 13, '#C9D0F2', 'center', 600);
        } else {
          const d = dock, sp = d.v.length(), off = Math.hypot(d.p.x - d.port.x, d.p.y - d.port.y), dist = Math.max(0, d.p.z - d.port.z - .35);
          const hint = [Math.abs(d.p.y - d.port.y) > .1 ? (d.p.y > d.port.y ? 'down' : 'up') : '', Math.abs(d.p.x - d.port.x) > .1 ? (d.p.x > d.port.x ? 'left' : 'right') : ''].filter(Boolean).join(' and ');
          hudGauge(ctx, 16, T0, 210, `Distance: ${(dist * 10).toFixed(1)} m`, 1 - dist / 9, '#59E0E8');
          hudGauge(ctx, 16, T0 + 46, 210, `Speed: ${sp > .3 ? 'too fast!' : 'gentle'}`, sp / .6, sp > .3 ? '#FF6D8A' : '#6FEA95');
          hudGauge(ctx, 16, T0 + 92, 210, `Line up: ${off < .15 ? 'perfect!' : 'move ' + hint}`, 1 - off / 2, off < .15 ? '#6FEA95' : '#FFB52E');
          const pp = project(d.port.clone()); if (pp.front && !d.done) hudPill(ctx, 'Docking port', pp.x, pp.y - 30, 'rgba(111,234,149,.92)', '#062A2E', 12);
          if (d.done) hudPill(ctx, 'Docked!', W / 2, T0 + 30, '#6FEA95', '#062A2E', 22);
        }
      }
    };
  })();

  /* ================================================================ Chandrayaan-3: land Vikram, drive Pragyan */
  S.chandrayaan = (() => {
    const G = 1.62, THRUST = 3.7, SIDE = 1.4, sunDir = V3(-.85, .22, .4).normalize();
    let sc, ground, lander, rover, dust, pad, padMark, L, state, tracks, trackTex;
    return {
      name: 'Chandrayaan-3 (ISRO)', line: 'ch3_intro', facts: "Launched 14 July 2023 · Landed near the Moon's south pole on 23 August 2023 · Moon gravity: 1.62 m/s²",
      keys: { left: 'left', right: 'right', up: 'thrust', space: 'thrust' },
      make() {
        sc = baseScene({ sunDir, ambient: .04, sunI: 2.2 }); sc.sun.castShadow = true; sc.sun.shadow.mapSize.set(2048, 2048);
        const c = sc.sun.shadow.camera; c.left = c.bottom = -60; c.right = c.top = 60; c.near = 1; c.far = 1200; sc.sun.shadow.bias = -.0008;
        sc.add(new T.HemisphereLight(0x8a90a8, 0x222222, .12));
        const earth = E3.planet('earth', 60); earth.position.set(-500, 140, -1400); sc.add(earth); E3.lightDir(earth, sunDir);
        this.scene = sc;
      },
      reset() {
        if (ground) { sc.remove(ground); sc.remove(ground.rocks); }
        pad = V3(0, 0, 0);
        ground = E3.terrain({ size: 600, seg: 220, amp: 7, freq: .008, craters: 70, craterMax: 30, seed: 1 + (Math.random() * 1e5 | 0), map: 'moon', repeat: 5, color: 0xc8c6c0, flat: [[pad.x, pad.z, 12]] });
        sc.add(ground);
        const rm = new T.MeshStandardMaterial({ color: 0x8e8c86, roughness: 1 });
        ground.rocks = E3.rocks(260, 300, rm, ground.height, 5, 1.2); ground.rocks.children = ground.rocks.children.filter(rk => Math.hypot(rk.position.x - pad.x, rk.position.z - pad.z) > 14); sc.add(ground.rocks);
        if (!padMark) { padMark = ringMarker(10); sc.add(padMark); }
        padMark.position.set(pad.x, ground.height(pad.x, pad.z) + .15, pad.z);
        if (!lander) {
          lander = E3.MODELS.vikram(); lander.traverse(o => { if (o.isMesh) o.castShadow = true; }); sc.add(lander); dust = particles(800, 0xcfccc4, 1.2, false); sc.add(dust);
          trackTex = [E3.canvasTex(64, 64, (g) => { g.strokeStyle = 'rgba(40,40,38,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 22, 0, TAU); g.stroke(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22); g.stroke(); } }), E3.canvasTex(128, 48, (g) => { g.fillStyle = 'rgba(40,40,38,.85)'; g.font = '700 34px Lexend, sans-serif'; g.textAlign = 'center'; g.fillText('ISRO', 64, 38); })];
        }
        if (rover) { sc.remove(rover); rover = null; }
        if (tracks) tracks.forEach(m => sc.remove(m)); tracks = [];
        const sx = pad.x - 55, sz = pad.z + (Math.random() - .5) * 6;
        L = { p: V3(sx, ground.height(sx, sz) + 120, sz), v: V3(4.2, -5, 0), fuel: 1 };
        lander.position.copy(L.p); lander.rotation.set(0, 0, 0); state = 'fly';
        setCtl([{ id: 'left', icon: 'left', hold: true, aria: 'Push left' }, { id: 'thrust', icon: 'flame', label: 'Thrust', hold: true, go: true }, { id: 'right', icon: 'right', hold: true, aria: 'Push right' }, { id: 'again', icon: 'again', label: 'Start again' }]);
        view({ follow: g => g.copy(lander.position).add(V3(0, 1.5, 0)), dist: 26, yaw: -.25, pitch: .22, min: 5, max: 160, near: .1, far: 60000, snap: true });
      },
      act(id) { if (id === 'again') this.reset(); },
      frame(dt) {
        const gh = x => ground.height(x, L.p.z);
        if (state === 'fly') {
          const th = held.thrust && L.fuel > 0, sl = held.left && L.fuel > 0, sr = held.right && L.fuel > 0;
          L.v.y += (-G + (th ? THRUST : 0)) * dt; L.v.x += ((sr ? SIDE : 0) - (sl ? SIDE : 0)) * dt;
          if (th) L.fuel -= dt / 32; if (sl || sr) L.fuel -= dt / 90; L.fuel = Math.max(0, L.fuel);
          L.p.addScaledVector(L.v, dt);
          lander.flame.visible = th; lander.flame.scale.set(1, .8 + Math.random() * .4, 1);
          lander.rotation.z = lerp(lander.rotation.z, (sr ? -.08 : 0) + (sl ? .08 : 0), dt * 3);
          const alt = L.p.y - gh(L.p.x);
          if (th && alt < 30) for (let i = 0; i < 6; i++) { const a = Math.random() * TAU, s = 8 + Math.random() * 10; dust.emit(L.p.x, gh(L.p.x) + .3, L.p.z, Math.cos(a) * s * (1 - alt / 30), .5 + Math.random(), Math.sin(a) * s * (1 - alt / 30), 1.4); }
          if (alt <= 0) {
            L.p.y = gh(L.p.x); lander.flame.visible = false;
            const onPad = Math.hypot(L.p.x - pad.x, L.p.z - pad.z) < 10, soft = -L.v.y < 2.5 && Math.abs(L.v.x) < 1.5;
            if (soft && onPad) {
              state = 'landed'; Sfx.chime();
              say('ch3_landed', () => {
                if (state !== 'landed') return;
                state = 'rover'; rover = E3.MODELS.pragyan(); rover.traverse(o => { if (o.isMesh) o.castShadow = true; }); rover.ramp = 0; rover.x = L.p.x + 1.4; sc.add(rover);
                setCtl([{ id: 'left', icon: 'left', hold: true, aria: 'Drive left' }, { id: 'right', icon: 'right', hold: true, aria: 'Drive right' }, { id: 'again', icon: 'again', label: 'Land again' }]);
                ctl.goalDist = 9; say('ch3_rover');
              });
            } else {
              state = 'crash'; Sfx.boop(); say(soft ? 'ch3_missed' : 'ch3_crash');
              lander.rotation.z = soft ? .25 : .9;
              for (let i = 0; i < 160; i++) { const a = Math.random() * TAU, s = 3 + Math.random() * 10; dust.emit(L.p.x, L.p.y + 1, L.p.z, Math.cos(a) * s, 2 + Math.random() * 6, Math.sin(a) * s, 2.5); }
            }
          }
          lander.position.copy(L.p);
        }
        if (rover) {
          if (rover.ramp < 1) rover.ramp = Math.min(1, rover.ramp + dt * .35);
          const v = rover.ramp >= 1 ? (held.right ? 1.2 : 0) - (held.left ? 1.2 : 0) : 0;
          rover.x = clamp(rover.x + v * dt, L.p.x + 3, L.p.x + 40);
          const x = rover.ramp < 1 ? lerp(L.p.x + 1.2, L.p.x + 3.2, rover.ramp) : rover.x, gy = gh(x);
          const y = rover.ramp < 1 ? lerp(L.p.y + 1.1, gy, rover.ramp) : gy;
          rover.position.set(x, y, L.p.z); rover.rotation.z = rover.ramp < 1 ? -.35 : Math.atan2(gh(x + .5) - gh(x - .5), 1);
          rover.wheels.forEach(w => { w.rotation.y -= v * dt * 7; });
          if (v && (!tracks.length || Math.abs(tracks[tracks.length - 1].position.x - x) > .55)) {
            const k = tracks.length % 2, m = new T.Mesh(new T.PlaneGeometry(k ? .45 : .32, k ? .17 : .32), new T.MeshBasicMaterial({ map: trackTex[k], transparent: true, depthWrite: false }));
            m.rotation.x = -Math.PI / 2; m.position.set(x, gh(x) + .03, L.p.z + (k ? .43 : -.43)); sc.add(m); tracks.push(m);
          }
        }
        dust.step(dt, G, .8);
      },
      hud(ctx) {
        const T0 = top();
        if (state === 'fly') {
          const alt = Math.max(0, L.p.y - ground.height(L.p.x, L.p.z)), dPad = Math.hypot(L.p.x - pad.x, L.p.z - pad.z);
          hudGauge(ctx, 16, T0, 220, `Falling speed: ${Math.max(0, -L.v.y).toFixed(1)} m/s ${-L.v.y > 2.5 ? '(slow down!)' : '(safe)'}`, -L.v.y / 10, -L.v.y > 2.5 ? '#FF6D8A' : '#6FEA95');
          hudGauge(ctx, 16, T0 + 46, 220, `Fuel left: ${Math.round(L.fuel * 100)}%`, L.fuel, '#FFB52E');
          ctx.fillStyle = 'rgba(13,20,52,.85)'; roundRect(ctx, 16, T0 + 92, 220, 50, 10); ctx.fill();
          hudText(ctx, `Height: ${Math.round(alt)} m`, 26, T0 + 112, 14, '#F3F1FF', 'left', 600);
          hudText(ctx, `Landing spot: ${dPad < 10 ? 'right below you!' : Math.round(dPad) + ' m ' + (L.p.x < pad.x ? 'ahead →' : '← back')}`, 26, T0 + 132, 13, dPad < 10 ? '#6FEA95' : '#C9D0F2', 'left', 600);
          const pp = project(padMark.position.clone()); if (pp.front) hudPill(ctx, 'Land here', pp.x, pp.y - 14, 'rgba(111,234,149,.92)', '#062A2E', 12);
        } else if (state === 'landed' || state === 'rover') hudPill(ctx, 'Landed! Shiv Shakti Point', W / 2, T0 + 16, '#6FEA95', '#062A2E', 16);
        else hudPill(ctx, 'Press Start again to try once more', W / 2, T0 + 16, '#FF6D8A', '#2A0010', 15);
      }
    };
  })();

  /* ================================================================ Mangalyaan: raise the orbit, then fly to Mars */
  S.mangalyaan = (() => {
    const APOS = [23550, 28825, 40186, 71636, 118642, 192874], RE = 6, RP = RE * (1 + 250 / 6371), sunDir = V3(1, .3, .4).normalize();
    let sc, earth, zone, craft, orbitL, o, burns, phase, trip, firing, helio, marsSc, marsCraft;
    const apo = i => RE * (1 + APOS[Math.min(i, 5)] / 6371);
    function setOrbit(snap) {
      const ra = apo(burns), a = (RP + ra) / 2, e = (ra - RP) / (ra + RP), period = 9 + burns * 1.2;
      o = { a, e, th: o ? o.th : PI * .2, h: TAU * a * a * Math.sqrt(1 - e * e) / period };
      if (orbitL) sc.remove(orbitL); orbitL = line(ellipsePts(a, e, 360), 0x59e0e8, .55, a * .02); sc.add(orbitL);
      view({ goal: V3(), dist: Math.max(70, ra * 1.55), pitch: 1.0, yaw: .3, min: 12, max: 2000, far: 80000, snap });
    }
    return {
      name: 'Mangalyaan (ISRO)', line: 'mom_intro', facts: 'Launched 5 November 2013 · Reached Mars 24 September 2014 · First try!',
      keys: { space: 'fire' }, tapKeys: ['fire'],
      make() {
        sc = baseScene({ sunDir, ambient: .08 });
        earth = E3.planet('earth', RE, { seg: 128 }); sc.add(earth); E3.lightDir(earth, sunDir);
        zone = new T.Mesh(new T.RingGeometry(RP - .6, RP + .6, 48, 1, -.42, .84), new T.MeshBasicMaterial({ color: 0x6fea95, transparent: true, opacity: .55, side: T.DoubleSide, depthWrite: false })); zone.rotation.x = -Math.PI / 2; sc.add(zone);
        craft = E3.MODELS.mangalyaan(); sc.add(craft);
        helio = new T.Group(); helio.visible = false; sc.add(helio);
        helio.add(E3.planet('sun', 6)); helio.add(new T.PointLight(0xffffff, 1.5, 0, 0));
        helio.add(line(ellipsePts(60, 0, 128), 0x8ca0ff, .35)); helio.add(line(ellipsePts(91, 0, 128), 0xff9a70, .35));
        helio.e = E3.planet('earth', 2.4); helio.add(helio.e); helio.m = E3.planet('mars', 1.8); helio.add(helio.m);
        helio.path = line(Array.from({ length: 121 }, (_, i) => { const u = i / 120, a = PI * .9 + u * PI, rr = 60 + 31 * (1 - Math.cos(u * PI)) / 2; return V3(Math.cos(a) * rr, 0, -Math.sin(a) * rr); }), 0xffb52e, .9); helio.add(helio.path);
        helio.c = E3.MODELS.mangalyaan(); helio.add(helio.c);
        marsSc = baseScene({ sunDir, ambient: .06 });
        const mars = E3.planet('mars', 8, { seg: 128 }); marsSc.add(mars); marsSc.mars = mars; E3.lightDir(mars, sunDir);
        marsSc.add(line(ellipsePts(19, .55, 200), 0x59e0e8, .5, .4));
        marsCraft = E3.MODELS.mangalyaan(); marsCraft.scale.setScalar(.6); marsSc.add(marsCraft);
        this.scene = sc;
      },
      reset() {
        burns = 0; o = null; phase = 'earth'; trip = 0; firing = 0; this.scene = sc;
        helio.visible = false; earth.visible = true; craft.visible = true; zone.visible = true;
        setOrbit(true); o.th = 2.6; if (orbitL) orbitL.visible = true;
        setCtl([{ id: 'fire', icon: 'flame', label: 'Fire engine', go: true }, { id: 'again', icon: 'again', label: 'Start again' }]);
      },
      act(id) {
        if (id === 'again') { this.reset(); return; }
        if (id !== 'fire' || phase !== 'earth') return;
        if (Math.cos(o.th) <= .91) { Sfx.boop(); sayFree('mom_wait', 3000); return; }
        firing = 1; burns++; Sfx.whoosh();
        if (burns >= 6) { phase = 'leave'; trip = 0; say('mom_escape'); }
        else { setOrbit(false); say('mom_good'); }
      },
      frame(dt) {
        earth.spin.rotation.y += dt * .3;
        if (phase === 'earth' || phase === 'leave') {
          kepler(o, dt);
          const x = Math.cos(o.th) * o.r, z = -Math.sin(o.th) * o.r;
          craft.position.set(x, 0, z); craft.rotation.y = o.th + Math.PI;
          craft.scale.setScalar(Math.max(.25, ctl.dist * .006));
          firing = Math.max(0, firing - dt); craft.flame.visible = firing > 0;
          if (phase === 'leave') {
            trip += dt;
            if (trip > 2.5) { phase = 'helio'; trip = 0; earth.visible = false; craft.visible = false; orbitL.visible = false; zone.visible = false; helio.visible = true; view({ goal: V3(), dist: 230, pitch: 1.05, yaw: .4, min: 40, max: 900 }); }
          }
        } else if (phase === 'helio') {
          trip = Math.min(1, trip + dt / 11);
          const a0 = PI * .9, ea = a0 + trip * PI * .82, ma = a0 + PI - (1 - trip) * PI * .53;
          helio.e.position.set(Math.cos(ea) * 60, 0, -Math.sin(ea) * 60); helio.m.position.set(Math.cos(ma) * 91, 0, -Math.sin(ma) * 91);
          const a = a0 + trip * PI, rr = 60 + 31 * (1 - Math.cos(trip * PI)) / 2;
          helio.c.position.set(Math.cos(a) * rr, 0, -Math.sin(a) * rr); helio.c.scale.setScalar(ctl.dist * .012);
          helio.path.geometry.setDrawRange(0, Math.floor(trip * 121));
          E3.lightPlanet(helio.e, V3()); E3.lightPlanet(helio.m, V3());
          if (trip >= 1) { phase = 'arrive'; Sfx.chime(); say('mom_arrive'); this.scene = marsSc; view({ goal: V3(), dist: 55, pitch: .4, yaw: .6, min: 12, max: 300, snap: true }); }
        } else {
          marsSc.mars.spin.rotation.y += dt * .2;
          const th = t * .9, rr = 19 * (1 - .55 * .55) / (1 + .55 * Math.cos(th));
          marsCraft.position.set(Math.cos(th) * rr, 0, -Math.sin(th) * rr); marsCraft.lookAt(0, 0, 0);
        }
      },
      hud(ctx) {
        const T0 = top();
        if (phase === 'earth' || phase === 'leave') {
          const gw = Math.min(280, W - 32), gx = W - gw - 16;
          ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, gx, T0, gw, 66, 14); ctx.fill();
          hudText(ctx, `Engine burns: ${burns} of 6`, gx + 14, T0 + 26, 17, '#FFB52E', 'left');
          hudText(ctx, `Farthest from Earth: ${APOS[Math.min(burns, 5)].toLocaleString('en-IN')} km`, gx + 14, T0 + 50, 13, '#F3F1FF', 'left', 600);
          const p = project(craft.position.clone());
          if (Math.cos(o.th) > .91 && phase === 'earth') hudPill(ctx, 'Now! Fire!', p.x, p.y - 22, '#6FEA95', '#062A2E', 13);
          else hudPill(ctx, 'Mangalyaan', p.x, p.y - 20, 'rgba(13,20,52,.85)', '#C9D0F2', 11);
          hudText(ctx, 'Fire when it passes the green zone, closest to Earth', W / 2, bottom() - 4, 13, '#C9D0F2', 'center', 600);
        } else if (phase === 'helio') {
          hudPill(ctx, `Day ${Math.round(trip * 298)} of 298 · 666 million km`, W / 2, T0 + 16, '#FFB52E', '#2A1600', 15);
          for (const [o3, n] of [[helio.e, 'Earth'], [helio.m, 'Mars']]) { const p = project(o3.position.clone()); hudText(ctx, n, p.x, p.y + 26, 13, '#C9D0F2', 'center', 600); }
        } else hudPill(ctx, 'In orbit around Mars!', W / 2, T0 + 16, '#6FEA95', '#062A2E', 16);
      }
    };
  })();

  /* ================================================================ Voyager 1 and 2, 1977 to today */
  S.voyager = (() => {
    const P = { earth: [100.46, 1, 1], jupiter: [34.40, 11.862, 5.2], saturn: [49.94, 29.457, 9.54], uranus: [313.23, 84.02, 19.2], neptune: [304.88, 164.8, 30.1] };
    const SZ = { earth: .45, jupiter: 1.4, saturn: 1.15, uranus: .8, neptune: .8 };
    const lonAt = (id, yr) => ((P[id][0] + 360 * (yr - 2000) / P[id][1]) % 360 + 360) % 360;
    const scaleR = au => Math.sqrt(au / 172) * 60;
    const key = (yr, au, lon, lat = 0) => ({ yr, au, lon, lat });
    const unwrap = ks => { for (let i = 1; i < ks.length; i++) while (ks[i].lon < ks[i - 1].lon) ks[i].lon += 360; return ks; };
    const V1 = unwrap([key(1977.68, 1, lonAt('earth', 1977.68)), key(1979.18, 5.2, lonAt('jupiter', 1979.18)), key(1980.87, 9.54, lonAt('saturn', 1980.87)), key(1990, 40, 245, 30), key(2012.65, 121, 253, 35), key(2027, 172, 255, 35)]);
    const V2 = unwrap([key(1977.63, 1, lonAt('earth', 1977.63)), key(1979.52, 5.2, lonAt('jupiter', 1979.52)), key(1981.65, 9.54, lonAt('saturn', 1981.65)), key(1986.07, 19.2, lonAt('uranus', 1986.07)), key(1989.65, 30.1, lonAt('neptune', 1989.65)), key(2000, 61, 288, -40), key(2018.85, 119, 290, -48), key(2027, 144, 290, -48)]);
    const EVENTS = [[1979.2, 'voy_jupiter'], [1980.9, 'voy_saturn'], [1986.07, 'voy_uranus'], [1989.65, 'voy_neptune'], [2012.65, 'voy_interstellar']];
    let sc, yr, play, overlay, oT, prevYr, bubble;
    const planets = {}, craft = {}, trails = {};
    function at(ks, y) {
      if (y <= ks[0].yr) return null;
      for (let i = 1; i < ks.length; i++) if (y <= ks[i].yr) { const a = ks[i - 1], b = ks[i], u = (y - a.yr) / (b.yr - a.yr); return { au: lerp(a.au, b.au, u), lon: lerp(a.lon, b.lon, u), lat: lerp(a.lat, b.lat, u) }; }
      const a = ks[ks.length - 1]; return { au: a.au, lon: a.lon, lat: a.lat };
    }
    const toV = (au, lon, lat = 0) => { const rr = scaleR(au), q = lon * PI / 180, b = lat * PI / 180; return V3(Math.cos(q) * Math.cos(b) * rr, Math.sin(b) * rr, -Math.sin(q) * Math.cos(b) * rr); };
    return {
      name: 'Voyager 1 and Voyager 2', line: 'voy_intro', facts: 'Launched 1977 · Visited Jupiter, Saturn, Uranus and Neptune · Still sending messages from between the stars',
      make() {
        sc = baseScene({ ambient: .3 }); sc.sun.intensity = 0;
        sc.add(new T.PointLight(0xfff4e0, 2.2, 0, 0));
        sc.add(E3.planet('sun', 1.6, { seg: 48 }));
        for (const id in P) { planets[id] = E3.planet(id, SZ[id], { seg: 48 }); sc.add(planets[id]); sc.add(line(ellipsePts(scaleR(P[id][2]), 0, 160), 0x8ca0ff, .22)); }
        bubble = E3.atmosphere(scaleR(120) / 1.03, 0x9b8cff, .22, 1.03); sc.add(bubble);
        for (const [id, ks, col] of [['v1', V1, 0x59e0e8], ['v2', V2, 0xffb52e]]) {
          const pts = []; for (let y = ks[0].yr; y <= 2027; y += .05) { const p = at(ks, y); if (p) pts.push(toV(p.au, p.lon, p.lat)); }
          const l = line(pts, col, .9); l.ks = ks; trails[id] = l; sc.add(l);
          craft[id] = E3.MODELS.voyager(); sc.add(craft[id]);
        }
        this.scene = sc;
      },
      reset() {
        yr = 1977.5; play = true; overlay = null; prevYr = yr;
        setCtl([{ id: 'play', icon: 'play', label: 'Pause', cyan: true }, { range: true, id: 'voyYear', min: 1977.5, max: 2026.8, step: .05, value: yr, aria: 'Year' }, { id: 'record', label: 'Golden record', go: true }, { id: 'dot', label: 'Pale blue dot' }]);
        view({ goal: V3(), dist: 150, pitch: .55, yaw: -.5, min: 6, max: 600, far: 80000, snap: true });
      },
      act(id, v) {
        if (id === 'voyYear') { yr = v; play = false; label('play', 'Play'); }
        if (id === 'play') { play = !play; if (play && yr >= 2026.7) { yr = 1977.5; prevYr = yr; } label('play', play ? 'Pause' : 'Play'); }
        if (id === 'record') { overlay = 'record'; oT = 0; say('voy_record'); }
        if (id === 'dot') { overlay = 'dot'; oT = 0; say('voy_dot'); }
      },
      tap() { if (overlay) overlay = null; },
      frame(dt) {
        if (play && !overlay) { yr += dt * (yr < 1990 ? 1.1 : 3.2); if (yr >= 2026.8) { yr = 2026.8; play = false; label('play', 'Play'); } const rg = $('#voyYear'); if (rg) rg.value = yr; }
        for (const [ey, ln] of EVENTS) if (prevYr < ey && yr >= ey) say(ln);
        prevYr = yr;
        for (const id in P) { planets[id].position.copy(toV(P[id][2], lonAt(id, yr))); planets[id].spin.rotation.y += dt; E3.lightPlanet(planets[id], V3()); }
        E3.lightDir(bubble, cam.position.clone().normalize());
        for (const id of ['v1', 'v2']) {
          const ks = trails[id].ks, p = at(ks, yr), n = Math.max(0, Math.floor((yr - ks[0].yr) / .05));
          trails[id].geometry.setDrawRange(0, n);
          craft[id].visible = !!p;
          if (p) { const v = toV(p.au, p.lon, p.lat); craft[id].position.copy(v); craft[id].lookAt(0, 0, 0); craft[id].scale.setScalar(cam.position.distanceTo(v) * .0035); }
        }
      },
      hud(ctx, dt) {
        const T0 = top(), B = bottom();
        for (const id in P) if (id !== 'earth') { const p = project(planets[id].position.clone()); if (p.front) hudText(ctx, BODIES[id].name, p.x, p.y + 22, 12, '#C9D0F2', 'center', 600); }
        for (const [id, nm, col, dy] of [['v1', 'Voyager 1', '#59E0E8', -16], ['v2', 'Voyager 2', '#FFB52E', 26]]) if (craft[id].visible) { const p = project(craft[id].position.clone()); if (p.front) hudPill(ctx, nm, p.x, p.y + dy, 'rgba(13,20,52,.85)', col, 12); }
        const bt = project(V3(0, scaleR(120), 0)); if (bt.front) hudText(ctx, "Edge of the Sun's bubble", bt.x, bt.y - 6, 12, '#B9AEFF', 'center', 600);
        const p1 = at(V1, yr), p2 = at(V2, yr), km = au => (au * 149.6 / 1000).toFixed(au > 60 ? 1 : 2), hrs = au => au * 8.317 / 60;
        const bx = 16, by = B - 70;
        ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, bx, by, Math.min(340, W - 32), 66, 14); ctx.fill();
        hudText(ctx, `Year ${Math.floor(yr)}`, bx + 14, by + 24, 20, '#FFB52E', 'left');
        if (p1) hudText(ctx, `Voyager 1: ${km(p1.au)} billion km away${hrs(p1.au) > 1 ? ` · radio takes ${Math.round(hrs(p1.au))} h` : ''}`, bx + 14, by + 44, 12, '#59E0E8', 'left', 600);
        if (p2) hudText(ctx, `Voyager 2: ${km(p2.au)} billion km away`, bx + 14, by + 60, 12, '#FFB52E', 'left', 600);
        if (overlay) {
          oT += dt; ctx.fillStyle = 'rgba(5,8,23,.92)'; ctx.fillRect(0, 0, W, H);
          const rr = Math.min(W, B - T0) * .32, ox = W / 2, oy = (T0 + B) / 2;
          if (overlay === 'record') {
            ctx.save(); ctx.translate(ox, oy); ctx.rotate(oT * .8);
            const g = ctx.createRadialGradient(-rr * .3, -rr * .3, rr * .1, 0, 0, rr); g.addColorStop(0, '#FFE9A8'); g.addColorStop(.6, '#D9A635'); g.addColorStop(1, '#9C6F14');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(90,60,10,.35)'; ctx.lineWidth = 1; for (let i = 6; i < 30; i++) { ctx.beginPath(); ctx.arc(0, 0, rr * i / 30, 0, TAU); ctx.stroke(); }
            ctx.fillStyle = '#7A5410'; ctx.beginPath(); ctx.arc(0, 0, rr * .16, 0, TAU); ctx.fill(); ctx.restore();
            hudText(ctx, 'The Golden Record', ox, oy + rr + 32, 22, '#FFB52E');
            hudText(ctx, 'Music, sounds of Earth and hello in 55 languages, including Hindi', ox, oy + rr + 54, 13, '#A8B2DE', 'center', 600);
          } else {
            for (let i = 0; i < 4; i++) { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,200,140,0)'); g.addColorStop(.5, `rgba(255,190,130,${.12 + i * .03})`); g.addColorStop(1, 'rgba(255,200,140,0)'); ctx.fillStyle = g; ctx.fillRect(W * (.2 + i * .17), T0, W * .07, B - T0); }
            ctx.fillStyle = '#9ED2FF'; ctx.beginPath(); ctx.arc(W * .55 + 3, oy, 1.6, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#59E0E8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W * .55 + 3, oy, 16 + Math.sin(oT * 4) * 3, 0, TAU); ctx.stroke();
            hudPill(ctx, "That's us! Earth", W * .55 + 3, oy - 30, 'rgba(89,224,232,.95)', '#062A2E', 14);
            hudText(ctx, 'Earth, photographed by Voyager 1 from 6 billion km away (1990)', W / 2, B - 20, 13, '#A8B2DE', 'center', 600);
          }
          hudText(ctx, 'Tap to close', W / 2, T0 + 18, 12, '#6E79AE', 'center', 600);
        }
      }
    };
  })();

  /* ================================================================ Parker Solar Probe: keep the shield on the Sun */
  S.parker = (() => {
    const RS = 10; let sc, probe, shieldMat, sunM, path, o, yaw, drift, temp, maxTemp, passes, prevCos, err = 0;
    const corona = [];
    return {
      name: 'Parker Solar Probe', line: 'psp_intro', facts: 'Launched 2018 · Flew 6.1 million km from the Sun in December 2024 · Fastest spacecraft ever',
      keys: { left: 'ccw', right: 'cw' },
      make() {
        sc = baseScene({ ambient: .1 }); sc.sun.intensity = 0;
        sc.add(new T.PointLight(0xfff0d8, 2.4, 0, 0));
        sunM = E3.planet('sun', RS, { seg: 128 }); sc.add(sunM);
        for (let i = 0; i < 4; i++) { const g = E3.glow(i % 2 ? 0xffb050 : 0xffe0a0, RS * (4 + i * 2.2), .35 - i * .05); sc.add(g); corona.push(g); }
        const streak = E3.canvasTex(256, 256, (g, w) => { g.translate(w / 2, w / 2); for (let i = 0; i < 26; i++) { g.rotate(TAU / 26); const len = w * (.3 + Math.random() * .2); const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, 'rgba(255,220,160,.5)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w * .1, -3); g.lineTo(len, 0); g.lineTo(w * .1, 3); g.fill(); } });
        const sm = new T.Sprite(new T.SpriteMaterial({ map: streak, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: .8 })); sm.scale.set(RS * 7, RS * 7, 1); sc.add(sm); corona.push(sm);
        const venus = E3.planet('venus', 1.2); venus.position.set(-150, 0, -40); sc.add(venus); E3.lightPlanet(venus, V3());
        probe = E3.MODELS.parker(); probe.scale.setScalar(.9); sc.add(probe);
        const fill = new T.DirectionalLight(0x9fb4ff, .35); fill.position.set(0, 1, 0); sc.add(fill);
        shieldMat = probe.shield.material; shieldMat.emissive = new T.Color(0xff6a20); shieldMat.emissiveIntensity = 0;
        path = line(ellipsePts(83, .807, 400), 0x59e0e8, .35); sc.add(path);
        this.scene = sc;
      },
      reset() {
        o = { a: 83, e: .807, th: -2.1, h: 0 }; o.h = TAU * o.a * o.a * Math.sqrt(1 - o.e * o.e) / 30; yaw = 0; drift = 0; temp = 30; maxTemp = 30; passes = 0; prevCos = 0;
        setCtl([{ id: 'ccw', icon: 'left', label: 'Turn', hold: true }, { id: 'cw', icon: 'right', label: 'Turn', hold: true }, { id: 'again', icon: 'again', label: 'Start again' }]);
        view({ follow: g => g.copy(probe.position), dist: 9, pitch: .25, yaw: 0, min: 3, max: 400, snap: true });
      },
      act(id) { if (id === 'again') this.reset(); },
      frame(dt) {
        kepler(o, dt * .7);
        const p = V3(Math.cos(o.th) * o.r, 0, -Math.sin(o.th) * o.r); probe.position.copy(p);
        if (Math.cos(o.th) > .999 && prevCos <= .999) passes++; prevCos = Math.cos(o.th);
        const toSun = Math.atan2(-p.x, -p.z);
        drift += (Math.random() - .5) * dt * 1.6; drift = clamp(drift, -.7, .7);
        yaw += drift * dt * (1 + 18 / o.r);
        if (held.ccw) yaw += dt * 1.8; if (held.cw) yaw -= dt * 1.8;
        probe.rotation.y = yaw;
        err = Math.atan2(Math.sin(toSun - yaw), Math.cos(toSun - yaw));
        const exposure = (1 - Math.cos(err)) / 2, near = 260 / (o.r * o.r);
        temp += (exposure * near * 380 - (temp - 30) * .5) * dt; temp = Math.max(30, temp); maxTemp = Math.max(maxTemp, temp);
        shieldMat.emissiveIntensity = clamp(near * .5 * (1 - exposure * .8), 0, 1.4);
        if (temp > 90) sayFree('psp_hot', 7000);
        if (o.r < 22 && exposure < .15) sayOnce('psp_fast');
        if (passes >= 1 && maxTemp < 110) sayOnce('psp_shield');
        if (passes >= 1) maxTemp = temp;
        sunM.spin.rotation.y += dt * .05; corona.forEach((c, i) => { c.material.rotation += dt * (.02 + i * .01) * (i % 2 ? 1 : -1); });
        // keep the camera behind the probe, looking past it at the Sun, unless Ayansh is turning the view
        if (performance.now() - (ctl.dragAt || 0) > 4000) { const away = Math.atan2(p.x, p.z); let d = away + .95 - ctl.goalYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); ctl.goalYaw += d * Math.min(1, dt * 1.5); }
      },
      hud(ctx) {
        const T0 = top(), rr = o.r;
        const v = Math.sqrt(2 / rr - 1 / o.a), vmax = Math.sqrt(2 / (o.a * (1 - o.e)) - 1 / o.a), kmh = Math.round(690000 * v / vmax / 1000) * 1000;
        const dist = 6.1 + (rr - o.a * (1 - o.e)) / (o.a * (1 + o.e) - o.a * (1 - o.e)) * (108 - 6.1);
        const gw = Math.min(250, W * .5), gx = W - gw - 16;
        hudGauge(ctx, gx, T0, gw, `Speed: ${kmh.toLocaleString('en-IN')} km/h`, v / vmax, '#59E0E8');
        hudGauge(ctx, gx, T0 + 46, gw, `Instruments: ${Math.round(temp)} °C ${temp > 90 ? 'too hot!' : 'cool'}`, (temp - 30) / 120, temp > 90 ? '#FF6D8A' : '#6FEA95');
        hudText(ctx, `${dist.toFixed(1)} million km from the Sun`, gx + gw / 2, T0 + 104, 13, '#C9D0F2', 'center', 600);
        const p = project(probe.position.clone()), a = Math.abs(err);
        if (p.front) hudPill(ctx, a < .5 ? 'Shield on the Sun: safe' : a < 1.4 ? 'Turn the shield to the Sun!' : 'DANGER: shield away from the Sun!', p.x, p.y - 40, a < .5 ? 'rgba(111,234,149,.92)' : 'rgba(255,109,138,.92)', '#062A2E', 12);
      }
    };
  })();

  /* ================================================================ Juno at Jupiter: take photos when it swoops low */
  S.juno = (() => {
    const RJ = 20, sunDir = V3(1, .05, .35).normalize();
    let sc, jup, juno, orbitLine, o, photos, flash, photoCam;
    const moons = [];
    const toOrbit = (x, z) => V3(x * .25, -z, x).normalize().multiplyScalar(Math.hypot(x, z));  // a tilted path over Jupiter's poles
    return {
      name: 'Juno', line: 'juno_intro', facts: 'Launched 2011 · Reached Jupiter in 2016 · Solar powered · Swoops 4,000 km above the clouds',
      keys: { space: 'snap' }, tapKeys: ['snap'],
      make() {
        sc = baseScene({ sunDir, ambient: .04, sunI: 1.8 });
        jup = E3.planet('jupiter', RJ, { seg: 160 }); sc.add(jup); E3.lightDir(jup, sunDir);
        for (const [id, d, rad, spd] of [['io', 118, 1.6, .5], ['europa', 188, 1.4, .25], ['ganymede', 300, 2.3, .12], ['callisto', 528, 2.1, .05]]) { const m = E3.planet(id, rad, { seg: 48 }); m.orb = [d, spd, Math.random() * TAU]; m.label = id[0].toUpperCase() + id.slice(1); sc.add(m); moons.push(m); }
        juno = E3.MODELS.juno(); juno.scale.setScalar(.06); sc.add(juno);
        orbitLine = line([V3(), V3()], 0x59e0e8, .35); sc.add(orbitLine);
        photoCam = new T.PerspectiveCamera(38, 1.4, .05, 2000);
        this.scene = sc;
      },
      reset() {
        const ra = RJ * 5.5, rp = RJ * 1.07, a = (ra + rp) / 2, e = (ra - rp) / (ra + rp);
        o = { a, e, th: 2.4, h: TAU * a * a * Math.sqrt(1 - e * e) / 22 }; photos = []; flash = 0;
        orbitLine.geometry.dispose(); orbitLine.geometry = new T.BufferGeometry().setFromPoints(ellipsePts(a, e, 300, toOrbit));
        setCtl([{ id: 'snap', icon: 'camera', label: 'Snap!', go: true }, { id: 'moons', label: "Jupiter's moons" }]);
        view({ follow: g => g.copy(juno.position), dist: 9, pitch: .3, yaw: .8, min: 2, max: 900, near: .05, far: 80000, snap: true });
      },
      act(id) {
        if (id === 'moons') {
          say('juno_moons'); ctl.follow = null; ctl.goal.set(0, 0, 0); ctl.max = 1400; ctl.goalDist = 1100; ctl.goalPitch = .6; ctl.retarget();
          setTimeout(() => { if (cur === S.juno) { ctl.follow = g => g.copy(juno.position); ctl.goalDist = 9; ctl.max = 900; ctl.retarget(); } }, 9000);
          return;
        }
        if (id !== 'snap') return;
        if (o.r < RJ * 1.55) {
          flash = 1; Sfx.chime();
          // a real picture from Juno's own camera, colours boosted like JunoCam pictures
          const down = juno.position.clone().normalize().negate(), side = V3().crossVectors(down, V3(0, 1, 0)).normalize();
          photoCam.position.copy(juno.position); photoCam.up.copy(side); photoCam.lookAt(juno.position.clone().addScaledVector(down, 10).addScaledVector(side, 4));
          juno.visible = false; orbitLine.visible = false; const c = E3.snapshot(sc, photoCam, 360, 256); juno.visible = true; orbitLine.visible = true;
          const g = c.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), dd = img.data;
          for (let i = 0; i < dd.length; i += 4) { const m = (dd[i] + dd[i + 1] + dd[i + 2]) / 3; for (let k = 0; k < 3; k++) dd[i + k] = clamp(128 + (m + (dd[i + k] - m) * 2.2 - 128) * 1.35 + 12, 0, 255); }
          g.putImageData(img, 0, 0);
          photos.unshift(c); photos.length = Math.min(photos.length, 3); say('juno_photo');
        } else { Sfx.boop(); say('juno_far'); }
      },
      frame(dt) {
        kepler(o, dt);
        juno.position.copy(toOrbit(Math.cos(o.th) * o.r, -Math.sin(o.th) * o.r));
        juno.spinner.rotation.y += dt * 2;
        if (ctl.follow && performance.now() - (ctl.dragAt || 0) > 4000) {
          const a = juno.position.clone().normalize(); let dy = Math.atan2(a.x, a.z) + .45 - ctl.goalYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          ctl.goalYaw += dy * Math.min(1, dt * 1.5); ctl.goalPitch += (clamp(Math.asin(a.y) + .15, -1.2, 1.2) - ctl.goalPitch) * Math.min(1, dt * 1.5);
        }
        jup.spin.rotation.y += dt * .05;
        for (const m of moons) { const [d, s, ph] = m.orb, a = ph + t * s * .2; m.position.set(Math.cos(a) * d, 0, -Math.sin(a) * d); m.spin.rotation.y += dt * .1; E3.lightDir(m, sunDir); }
      },
      hud(ctx, dt) {
        const T0 = top(), p = project(juno.position.clone()), close = o.r < RJ * 1.55, km = Math.round((o.r - RJ) / RJ * 71492);
        if (p.front) hudPill(ctx, close ? 'Close! Snap now!' : 'Too far for a photo', p.x, p.y - 30, close ? '#6FEA95' : 'rgba(13,20,52,.85)', close ? '#062A2E' : '#C9D0F2', 12);
        ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, 16, T0, 250, 46, 12); ctx.fill();
        hudText(ctx, `Height above the clouds: ${km.toLocaleString('en-IN')} km`, 28, T0 + 28, 13, close ? '#6FEA95' : '#F3F1FF', 'left', 600);
        for (const m of moons) { const q = project(m.position.clone()); if (q.front) hudText(ctx, m.label, q.x, q.y + 18, 11, '#C9D0F2', 'center', 600); }
        photos.forEach((ph, i) => { const w = Math.min(190, W * .36), h = w * ph.height / ph.width, x = W - w - 16, y = T0 + i * (h + 10); ctx.fillStyle = '#F3F1FF'; ctx.fillRect(x - 4, y - 4, w + 8, h + 8); ctx.drawImage(ph, x, y, w, h); });
        if (flash > 0) { flash -= dt * 2; ctx.fillStyle = `rgba(255,255,255,${Math.max(0, flash)})`; ctx.fillRect(0, 0, W, H); }
      }
    };
  })();

  /* ================================================================ Cassini and Huygens */
  S.cassini = (() => {
    const RS = 18, sunDir = V3(1, .15, .3).normalize();
    let sc, sat, titan, cas, fire, hu, huSc, huObj, chute, o, mode, dives, finale, prevCos, plungeFrom;
    function makeTitan() {
      huSc = new T.Scene(); huSc.background = new T.Color(0xc98a3a); huSc.fog = new T.FogExp2(0xc98a3a, .0055);
      huSc.add(new T.HemisphereLight(0xffcf8a, 0x5a3a1a, 1.1));
      const g = E3.terrain({ size: 600, seg: 160, amp: 10, freq: .01, seed: 9, color: 0x8a5c30 }); huSc.add(g); huSc.ground = g;
      for (const [x, z, s] of [[30, -40, 40], [-60, 20, 26], [10, 60, 18]]) { const lake = new T.Mesh(new T.CircleGeometry(s, 40), new T.MeshStandardMaterial({ color: 0x2a2018, roughness: .15, metalness: .3 })); lake.rotation.x = -Math.PI / 2; lake.position.set(x, g.height(x, z) + .6, z); huSc.add(lake); }
      huSc.add(E3.rocks(200, 200, new T.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 1 }), g.height, 4, .8));
      huObj = E3.MODELS.huygens(); huObj.scale.setScalar(.5); huSc.add(huObj);
      chute = new T.Group();
      chute.add(new T.Mesh(new T.SphereGeometry(3, 24, 8, 0, TAU, 0, Math.PI / 2.6), new T.MeshStandardMaterial({ color: 0xff7442, side: T.DoubleSide, roughness: .8 })));
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; chute.add(E3.rod(V3(Math.cos(a) * 2.4, 1.2, Math.sin(a) * 2.4), V3(0, -4.5, 0), .02, new T.MeshBasicMaterial({ color: 0xffffff }))); }
      huSc.add(chute);
    }
    return {
      name: 'Cassini and Huygens', line: 'cassini_intro', facts: 'Launched 1997 · Circled Saturn from 2004 to 2017 · Huygens landed on Titan in 2005',
      make() {
        sc = baseScene({ sunDir, ambient: .04, sunI: 1.7 });
        sat = E3.planet('saturn', RS, { seg: 160 }); sc.add(sat); E3.lightDir(sat, sunDir);
        titan = E3.planet('titan', 2.2, { seg: 64 }); sc.add(titan);
        cas = E3.MODELS.cassini(); cas.scale.setScalar(.12); sc.add(cas);
        fire = E3.glow(0xffa040, 4, 1); fire.visible = false; sc.add(fire);
        this.scene = sc;
      },
      reset() {
        const ra = 140, rp = 46, a = (ra + rp) / 2, e = (ra - rp) / (ra + rp);
        o = { a, e, th: 1.8, h: TAU * a * a * Math.sqrt(1 - e * e) / 20 }; mode = 'orbit'; dives = 0; finale = 0; prevCos = 0; this.scene = sc; cas.visible = true; cas.huygens.visible = true; fire.visible = false;
        if (hu) { sc.remove(hu.obj); hu = null; }
        setCtl([{ id: 'drop', label: 'Drop Huygens', go: true }, { id: 'finale', label: 'Grand finale', cyan: true }, { id: 'again', icon: 'again', label: 'Start again' }]);
        view({ follow: g => g.copy(cas.position), dist: 14, pitch: .25, yaw: 1.1, min: 3, max: 900, near: .05, far: 80000, snap: true });
      },
      act(id) {
        if (id === 'again') { this.reset(); return; }
        if (id === 'drop' && mode === 'orbit' && cas.huygens.visible) {
          cas.huygens.visible = false; hu = { obj: E3.MODELS.huygens(), t: 0 }; hu.obj.scale.setScalar(.12); hu.obj.position.copy(cas.position); hu.from = cas.position.clone(); sc.add(hu.obj);
          mode = 'drop'; view({ follow: g => g.copy(hu.obj.position), dist: 6, min: 2, max: 400 }); Sfx.whoosh(); say('cassini_huygens');
        }
        if (id === 'finale' && mode === 'orbit') { mode = 'finale'; finale = 0; Sfx.whoosh(); say('cassini_finale'); }
      },
      frame(dt) {
        sat.spin.rotation.y += dt * .06;
        const ta = t * .05; titan.position.set(Math.cos(ta) * 110, 4, -Math.sin(ta) * 110); E3.lightDir(titan, sunDir);
        if (mode === 'orbit' || mode === 'finale' || mode === 'drop') {
          if (mode === 'finale') {
            finale += dt;
            const k = clamp(finale / 5, 0, 1), rp = lerp(46, 20.5, k), ra = lerp(140, 70, k), a = (ra + rp) / 2, e = (ra - rp) / (ra + rp);
            o.a = a; o.e = e; o.h = TAU * a * a * Math.sqrt(1 - e * e) / lerp(20, 4, k);
            if (Math.cos(o.th) > .99 && prevCos <= .99 && k >= 1) dives = Math.min(22, dives + 1);
            prevCos = Math.cos(o.th);
            if (dives >= 22 || finale > 26) { mode = 'plunge'; finale = 0; plungeFrom = cas.position.clone(); }
          }
          kepler(o, dt);
          const x = Math.cos(o.th) * o.r, z = -Math.sin(o.th) * o.r;
          cas.position.set(x, -z * .045, z); cas.lookAt(0, 0, 0);
        }
        if (mode === 'plunge') {
          finale += dt; const k = clamp(finale / 3, 0, 1);
          cas.position.lerpVectors(plungeFrom, plungeFrom.clone().normalize().multiplyScalar(RS * .98), k * k);
          fire.visible = true; fire.position.copy(cas.position); fire.scale.setScalar(2 + k * 6);
          if (k >= 1) { mode = 'ended'; cas.visible = false; fire.visible = false; Sfx.boop(); }
        }
        if (mode === 'drop' && hu) {
          hu.t += dt / 6; const k = Math.min(1, hu.t);
          hu.obj.position.lerpVectors(hu.from, titan.position, k * k * (3 - 2 * k)); hu.obj.rotation.y += dt;
          if (k >= 1) { if (!huSc) makeTitan(); mode = 'titan'; hu.descent = 0; hu.landed = false; this.scene = huSc; view({ follow: g => g.copy(huObj.position).add(V3(0, -2, 0)), dist: 20, pitch: .55, yaw: .8, min: 4, max: 120, far: 3000, snap: true }); }
        }
        if (mode === 'titan') {
          hu.descent = Math.min(1, hu.descent + dt / 14);
          const gy = huSc.ground.height(0, 0), y = lerp(90, gy + .6, hu.descent);
          huObj.position.set(Math.sin(t * .5) * 3 * (1 - hu.descent), y, 0); huObj.rotation.y += dt * .3;
          chute.position.copy(huObj.position).add(V3(0, 4.6, 0)); chute.visible = hu.descent < 1;
          if (hu.descent >= 1 && !hu.landed) { hu.landed = true; Sfx.chime(); }
        }
      },
      hud(ctx) {
        const T0 = top();
        if (this.scene === sc) { const tp = project(titan.position.clone()); if (tp.front) hudText(ctx, 'Titan', tp.x, tp.y - 18, 12, '#E6C482', 'center', 600); }
        if (mode === 'finale' || mode === 'plunge') hudPill(ctx, `Dives between Saturn and its rings: ${dives} of 22`, W / 2, T0 + 16, '#FFB52E', '#2A1600', 14);
        if (mode === 'ended') hudPill(ctx, 'Mission complete · 15 September 2017', W / 2, T0 + 16, '#FFB52E', '#2A1600', 15);
        if (mode === 'drop') hudPill(ctx, 'Huygens is flying to Titan…', W / 2, T0 + 16, 'rgba(13,20,52,.9)', '#FFB52E', 15);
        if (mode === 'titan') hudPill(ctx, hu.landed ? 'Landed on Titan! 14 January 2005' : `Parachuting through Titan's orange sky · ${Math.round((1 - hu.descent) * 150)} km up`, W / 2, T0 + 16, hu.landed ? '#6FEA95' : '#FFB52E', '#2A1600', 14);
      }
    };
  })();

  /* ================================================================ New Horizons at Pluto and Arrokoth */
  S.newhorizons = (() => {
    const RP = 6, KM = 1188 / RP, sunDir = V3(1, .1, .2).normalize();
    let sc, pluto, charon, arro, nh, s, target, shot, flash, photoCam;
    const isClose = () => s > -200 && s < (target === 'pluto' ? 600 : 140);
    return {
      name: 'New Horizons', line: 'nh_intro', facts: 'Launched 2006 · Flew past Pluto on 14 July 2015 · Then Arrokoth in 2019',
      keys: { space: 'snap' }, tapKeys: ['snap'],
      make() {
        sc = baseScene({ sunDir, ambient: .03, sunI: 1.6 });
        pluto = E3.planet('pluto', RP, { seg: 128 }); pluto.spin.rotation.y = -Math.PI / 2; sc.add(pluto);
        charon = E3.planet('charon', RP * .51, { seg: 64 }); sc.add(charon);
        arro = new T.Group(); const am = new T.MeshStandardMaterial({ color: 0x9a4a32, roughness: 1 });
        const l1 = new T.Mesh(new T.SphereGeometry(1, 48, 24), am); l1.scale.set(1.1, .55, .9); l1.position.x = -1; const l2 = new T.Mesh(new T.SphereGeometry(1, 48, 24), am); l2.scale.set(.75, .5, .7); l2.position.x = .8; arro.add(l1); arro.add(l2); arro.visible = false; sc.add(arro);
        nh = E3.MODELS.newhorizons(); nh.scale.setScalar(.35); sc.add(nh);
        photoCam = new T.PerspectiveCamera(6, 1, .05, 100000);
        this.scene = sc;
      },
      reset() {
        s = 15000; target = 'pluto'; shot = null; flash = 0; pluto.visible = true; charon.visible = true; arro.visible = false;
        setCtl([{ id: 'snap', icon: 'camera', label: 'Snap!', go: true }, { id: 'next', icon: 'next', label: 'Fly to Arrokoth' }, { id: 'again', icon: 'again', label: 'Start again' }]);
        view({ follow: g => g.copy(nh.position), dist: 3.5, pitch: .12, yaw: .25, min: 1, max: 3000, near: .02, far: 100000, snap: true });
      },
      act(id) {
        if (id === 'again') { this.reset(); return; }
        if (id === 'next') { target = 'arrokoth'; s = 6000; shot = null; pluto.visible = false; charon.visible = false; arro.visible = true; Sfx.whoosh(); return; }
        if (id !== 'snap') return;
        if (shot) { shot = null; return; }
        // the photo really is taken from the spacecraft: far away, the world is only a few blurry pixels
        const goal = target === 'pluto' ? pluto : arro;
        photoCam.position.copy(nh.position); photoCam.lookAt(goal.position); photoCam.fov = target === 'pluto' ? 6 : 1.2; photoCam.updateProjectionMatrix();
        nh.visible = false; const c = E3.snapshot(sc, photoCam, 256, 256); nh.visible = true;
        shot = { c }; flash = 1; Sfx.chime();
        if (target === 'arrokoth') say('nh_arrokoth'); else say(isClose() ? 'nh_perfect' : 'nh_blurry');
      },
      tap() { if (shot) shot = null; },
      frame(dt) {
        if (!shot) s -= dt * Math.max(target === 'pluto' ? 28 : 8, Math.abs(s) * .14);
        if (s < -2500) s = target === 'pluto' ? 15000 : 6000;
        nh.position.set(target === 'pluto' ? 63 : 5, 0, s); nh.lookAt(0, 0, s - 100);
        pluto.spin.rotation.y += dt * .02;
        const ca = t * .05; charon.position.set(Math.cos(ca) * 98, 0, Math.sin(ca) * 98 - 30); E3.lightDir(charon, sunDir); E3.lightDir(pluto, sunDir);
      },
      hud(ctx, dt) {
        const T0 = top(), goal = target === 'pluto' ? pluto : arro, close = isClose();
        const km = Math.max(0, Math.round(Math.hypot(nh.position.x, nh.position.z) * (target === 'pluto' ? KM : 6) - (target === 'pluto' ? 1188 : 0)));
        hudPill(ctx, s > 0 ? `${km.toLocaleString('en-IN')} km to ${target === 'pluto' ? 'Pluto' : 'Arrokoth'}` : 'Flying away…', W / 2, T0 + 14, close ? '#6FEA95' : 'rgba(13,20,52,.88)', close ? '#062A2E' : '#F3F1FF', 15);
        const gp = project(goal.position.clone()); if (gp.front) hudText(ctx, target === 'pluto' ? 'Pluto' : 'Arrokoth', gp.x, gp.y + 22, 12, '#C9D0F2', 'center', 600);
        if (shot) {
          ctx.fillStyle = 'rgba(5,8,23,.9)'; ctx.fillRect(0, 0, W, H);
          const sz = Math.min(W * .7, (bottom() - T0) * .78), x = W / 2 - sz / 2, y = T0 + 10;
          ctx.fillStyle = '#F3F1FF'; ctx.fillRect(x - 6, y - 6, sz + 12, sz + 12); ctx.drawImage(shot.c, x, y, sz, sz);
          hudText(ctx, 'Tap to close', W / 2, y + sz + 26, 13, '#A8B2DE', 'center', 600);
        }
        if (flash > 0) { flash -= dt * 2; ctx.fillStyle = `rgba(255,255,255,${Math.max(0, flash)})`; ctx.fillRect(0, 0, W, H); }
      }
    };
  })();

  /* ================================================================ James Webb Space Telescope: unfold it */
  S.webb = (() => {
    let sc, jw, fairing, step, k, temp, field;
    const STEPS = ['Folded up inside the rocket', 'The rocket nose opens: Christmas Day 2021', 'Step 2: open the sunshield', 'Step 3: unfold the gold mirror', 'Step 4: cool down to −233 °C', 'Step 5: look deep into space!'];
    function makeField(w, h) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), rr = rng(77);
      g.fillStyle = '#04050C'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        const x = rr() * w, y = rr() * h, sz = 1 + rr() * 7, hue = rr(); g.save(); g.translate(x, y); g.rotate(rr() * PI);
        const col = hue < .4 ? [255, 190, 120] : hue < .7 ? [255, 236, 210] : [200, 150, 255];
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, sz * 2.2); gr.addColorStop(0, `rgba(${col},.95)`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.scale(1, .35 + rr() * .65); g.beginPath(); g.arc(0, 0, sz * 2.2, 0, TAU); g.fill();
        if (sz > 5 && rr() < .5) { g.strokeStyle = `rgba(${col},.45)`; g.lineWidth = 1.2; for (let a = 0; a < 2; a++) { g.beginPath(); for (let q = 0; q < 3.5; q += .2) g.lineTo(Math.cos(q + a * PI) * q * sz * .9, Math.sin(q + a * PI) * q * sz * .9); g.stroke(); } }
        g.restore();
      }
      for (let i = 0; i < 6; i++) { const x = rr() * w, y = rr() * h, sz = 10 + rr() * 16; g.strokeStyle = 'rgba(255,240,220,.85)'; g.lineWidth = 1.2; g.beginPath(); for (let a = 0; a < 6; a++) { const q = a / 6 * TAU + PI / 2; g.moveTo(x, y); g.lineTo(x + Math.cos(q) * sz, y + Math.sin(q) * sz); } g.moveTo(x - sz * .6, y); g.lineTo(x + sz * .6, y); g.stroke(); g.fillStyle = '#FFF6E6'; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill(); }
      return c;
    }
    return {
      name: 'James Webb Space Telescope', line: 'jwst_intro', facts: 'Launched 25 December 2021 · Lives 1.5 million km from Earth · Mirror 6.5 m wide, coated with gold',
      make() {
        const sd = V3(.2, -1, .4);
        sc = baseScene({ sunDir: sd, ambient: .25, sunI: 1.4 });
        const fill = new T.DirectionalLight(0xbfd0ff, .6); fill.position.set(-3, 5, 6); sc.add(fill);
        const earth = E3.planet('earth', 7); earth.position.set(-60, -40, -260); sc.add(earth); E3.lightDir(earth, sd);
        const moon = E3.planet('moon', 1.9); moon.position.set(-40, -30, -230); sc.add(moon);
        jw = E3.MODELS.webb(); sc.add(jw);
        fairing = new T.Group(); const fm = new T.MeshStandardMaterial({ color: 0xf2f3f6, roughness: .5, side: T.DoubleSide });
        for (const sgn of [-1, 1]) { const half = new T.Group(); half.add(new T.Mesh(new T.CylinderGeometry(3.4, 3.4, 9, 32, 1, true, sgn > 0 ? 0 : Math.PI, Math.PI), fm)); const cone = new T.Mesh(new T.ConeGeometry(3.4, 5, 32, 1, true, sgn > 0 ? 0 : Math.PI, Math.PI), fm); cone.position.y = 7; half.add(cone); half.sgn = sgn; fairing.add(half); }
        sc.add(fairing);
        this.scene = sc;
      },
      reset() {
        step = 0; k = 1; temp = 20; jw.setShield(0); jw.setMirror(0); jw.scale.setScalar(.42); jw.position.set(0, -1, 0);
        fairing.visible = true; fairing.children.forEach(h => { h.position.set(0, 0, 0); h.rotation.set(0, 0, 0); });
        setCtl([{ id: 'next', icon: 'next', label: 'Next step', go: true }, { id: 'again', icon: 'again', label: 'Start again' }]);
        view({ goal: V3(0, 1, 0), dist: 30, pitch: .25, yaw: .7, min: 8, max: 200, snap: true, auto: .06 });
      },
      act(id) {
        if (id === 'again') { this.reset(); return; }
        if (id === 'next' && k >= 1 && step < 5) { step++; k = 0; Sfx.whoosh(); if (step === 2) say('jwst_shield'); if (step === 3) say('jwst_mirror'); if (step === 5) say('jwst_look'); }
      },
      tap() { this.act('next'); },
      frame(dt) {
        k = Math.min(1, k + dt / (step === 1 ? 3 : 4));
        const e = k * k * (3 - 2 * k);
        if (step === 1) { fairing.children.forEach(h => { h.position.x = h.sgn * e * 14; h.rotation.z = -h.sgn * e * .6; h.position.y = -e * 4; }); jw.scale.setScalar(lerp(.42, 1, e)); jw.position.y = lerp(-1, 0, e); }
        if (step >= 2) { fairing.visible = false; jw.scale.setScalar(1); jw.position.y = 0; }
        jw.setShield(step === 2 ? e : step > 2 ? 1 : 0); jw.setMirror(step === 3 ? e : step > 3 ? 1 : 0);
        if (step >= 4) temp = lerp(temp, -233, Math.min(1, dt * 1.2));
      },
      hud(ctx) {
        const T0 = top(), B = bottom();
        hudPill(ctx, STEPS[step], W / 2, T0 + 16, '#FFB52E', '#2A1600', 15);
        if (step >= 4) hudGauge(ctx, 16, B - 50, 240, `Mirror temperature: ${Math.round(temp)} °C`, (temp + 233) / 253, '#59E0E8');
        if (step === 5 && k > .4) {
          if (!field) field = makeField(480, 300);
          const a = smooth(.4, 1, k), w = Math.min(W - 32, 640), h = w * 300 / 480, x = (W - w) / 2, y = Math.max(T0 + 30, (T0 + B) / 2 - h / 2);
          ctx.globalAlpha = a; ctx.fillStyle = '#F3F1FF'; ctx.fillRect(x - 5, y - 5, w + 10, h + 10); ctx.drawImage(field, x, y, w, h); ctx.globalAlpha = 1;
          hudPill(ctx, 'Galaxies billions of light years away', W / 2, y + h - 10, 'rgba(13,20,52,.9)', '#FFB52E', 13);
        }
        if (step === 0) hudText(ctx, 'Drag to look around · Press Next step', W / 2, B - 6, 13, '#C9D0F2', 'center', 600);
      }
    };
  })();

  /* ================================================================ Perseverance and Ingenuity in Jezero Crater */
  S.perseverance = (() => {
    const sunDir = V3(.6, .55, .4).normalize();
    let sc, ground, rover, heli, dust, samples, markers = [], R, H0, drill;
    return {
      name: 'Perseverance and Ingenuity', line: 'perse_intro', facts: 'Landed 18 February 2021 in Jezero Crater · Ingenuity made 72 flights · Mars gravity: 3.7 m/s²',
      keys: { left: 'left', right: 'right', up: 'fwd', down: 'back', space: 'fly' },
      make() {
        sc = new T.Scene(); sc.background = new T.Color(0xc9a27a); sc.fog = new T.Fog(0xd2ab82, 40, 260);
        sc.add(new T.HemisphereLight(0xf0d0b0, 0x6a3a20, .55));
        const sl = new T.DirectionalLight(0xfff0e0, 1.5); sl.position.copy(sunDir).multiplyScalar(80); sl.castShadow = true; sl.shadow.mapSize.set(2048, 2048);
        const c = sl.shadow.camera; c.left = c.bottom = -30; c.right = c.top = 30; c.near = 1; c.far = 300; sl.shadow.bias = -.0006; sc.add(sl); sc.add(sl.target); sc.sl = sl;
        ground = E3.terrain({ size: 600, seg: 240, amp: 5, freq: .01, craters: 30, craterMax: 22, seed: 21, map: 'mars', repeat: 6, color: 0xe0a080 });
        sc.add(ground);
        // the rim of Jezero Crater on the horizon
        const ridge = E3.terrain({ size: 1600, seg: 80, amp: 60, freq: .004, seed: 77, color: 0x9a5a38 }), rp = ridge.geometry.attributes.position;
        for (let i = 0; i < rp.count; i++) { const d = Math.hypot(rp.getX(i), rp.getZ(i)); rp.setY(i, rp.getY(i) * smooth(260, 480, d) + smooth(300, 700, d) * 50 - 14); }
        ridge.geometry.computeVertexNormals(); sc.add(ridge);
        sc.add(E3.rocks(500, 260, new T.MeshStandardMaterial({ color: 0x8a4a2c, roughness: 1 }), ground.height, 8, .7));
        rover = E3.MODELS.perseverance(); sc.add(rover);
        heli = E3.MODELS.ingenuity(); heli.scale.setScalar(1.3); heli.traverse(o => { if (o.isMesh) o.castShadow = true; }); sc.add(heli);
        dust = particles(600, 0xd9a070, .8, false); sc.add(dust);
        this.scene = sc;
      },
      reset() {
        R = { x: 0, z: 0, h: 0, v: 0 }; H0 = { x: 4, z: -3, y: 0, vy: 0, spin: 0 }; samples = 0; drill = 0;
        markers.forEach(m => { sc.remove(m.mesh); sc.remove(m.ring); }); markers = [];
        for (let i = 0; i < 5; i++) {
          const a = i * 1.3 + .4, d = 14 + i * 9, x = Math.cos(a) * d, z = Math.sin(a) * d;
          const mesh = new T.Mesh(new T.DodecahedronGeometry(.7, 1), new T.MeshStandardMaterial({ color: 0x7a5a48, roughness: .9 })); mesh.position.set(x, ground.height(x, z) + .3, z); mesh.castShadow = true; sc.add(mesh);
          const ring = ringMarker(1.6, 0xffe38a); ring.position.set(x, ground.height(x, z) + .1, z); sc.add(ring);
          markers.push({ x, z, mesh, ring, done: false });
        }
        setCtl([{ id: 'left', icon: 'left', hold: true, aria: 'Turn left' }, { id: 'fwd', icon: 'up', hold: true, aria: 'Drive forward' }, { id: 'back', icon: 'down', hold: true, aria: 'Reverse' }, { id: 'right', icon: 'right', hold: true, aria: 'Turn right' }, { id: 'drill', icon: 'drill', label: 'Drill', go: true }, { id: 'fly', icon: 'rotor', label: 'Fly', hold: true, cyan: true }]);
        view({ follow: g => g.set(R.x, ground.height(R.x, R.z) + 1.4, R.z), dist: 9, yaw: -2.3, pitch: .3, min: 3, max: 60, near: .1, far: 3000, maxPitch: 1.2, minPitch: .02, snap: true });
      },
      press(id) { if (id === 'fly') sayOnce('perse_heli'); },
      act(id) {
        if (id !== 'drill' || drill > 0) return;
        const m = markers.find(q => !q.done && Math.hypot(q.x - R.x, q.z - R.z) < 4.5);
        if (!m) { Sfx.boop(); msg('Drive next to a glowing rock first'); return; }
        drill = 2.2; m.done = true; m.ring.visible = false; samples++; Sfx.chime(); sayOnce('perse_sample');
      },
      frame(dt) {
        const gh = (x, z) => ground.height(x, z);
        if (drill <= 0) {
          const turn = (held.left ? 1 : 0) - (held.right ? 1 : 0), go = (held.fwd ? 1 : 0) - (held.back ? 1 : 0);
          R.h += turn * dt * .8; R.v = lerp(R.v, go * 3.2, dt * 2);
          R.x = clamp(R.x + Math.sin(R.h) * R.v * dt, -240, 240); R.z = clamp(R.z + Math.cos(R.h) * R.v * dt, -240, 240);
          rover.wheels.forEach(w => { w.rotation.y += R.v * dt / .26; });
          if (Math.abs(R.v) > .5 && Math.random() < .4) dust.emit(R.x - Math.sin(R.h) * 1.5, gh(R.x, R.z) + .2, R.z - Math.cos(R.h) * 1.5, (Math.random() - .5), .4, (Math.random() - .5), 1.5);
          if (Math.abs(R.v) > .3 && performance.now() - (ctl.dragAt || 0) > 3000) { let d = R.h + Math.PI - ctl.goalYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); ctl.goalYaw += d * Math.min(1, dt * 1.2); }
        }
        drill = Math.max(0, drill - dt);
        const fx = Math.sin(R.h), fz = Math.cos(R.h);
        const hf = gh(R.x + fx, R.z + fz), hb = gh(R.x - fx, R.z - fz), hl = gh(R.x + fz, R.z - fx), hr = gh(R.x - fz, R.z + fx);
        rover.position.set(R.x, (hf + hb + hl + hr) / 4, R.z);
        rover.rotation.set(0, R.h - Math.PI / 2, 0); rover.rotateZ(Math.atan2(hf - hb, 2)); rover.rotateX(Math.atan2(hr - hl, 2));
        rover.arm.rotation.z = drill > 0 ? -.6 + Math.sin(t * 30) * .03 : 0;
        if (drill > 0) for (let i = 0; i < 2; i++) dust.emit(R.x + fx * 2.2, gh(R.x, R.z) + .3, R.z + fz * 2.2, (Math.random() - .5) * 1.5, Math.random() * 1.5, (Math.random() - .5) * 1.5, 1);
        // Ingenuity: thin Mars air, so the rotors spin very fast
        if (held.fly) { H0.vy += 7 * dt; H0.spin += dt * 70; } else { H0.vy -= 3.7 * dt; H0.spin += dt * (H0.y > .05 ? 60 : 0); }
        H0.vy *= Math.pow(.5, dt); H0.y = clamp(H0.y + H0.vy * dt, 0, 18); if (H0.y <= 0) { H0.y = 0; H0.vy = Math.max(0, H0.vy); }
        if (H0.y > .2) { H0.x = lerp(H0.x, R.x + fz * 3, dt * .3); H0.z = lerp(H0.z, R.z - fx * 3, dt * .3); }
        heli.position.set(H0.x, gh(H0.x, H0.z) + H0.y, H0.z);
        heli.rotors[0].rotation.y = H0.spin; heli.rotors[1].rotation.y = -H0.spin;
        if (held.fly && H0.y < 4) for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; dust.emit(H0.x, gh(H0.x, H0.z) + .1, H0.z, Math.cos(a) * 3, .3, Math.sin(a) * 3, 1.2); }
        dust.step(dt, .4, 1.2);
        for (const m of markers) if (!m.done) { m.ring.rotation.z += dt; m.ring.material.opacity = .5 + .4 * Math.sin(t * 4); }
        sc.sl.position.set(R.x + sunDir.x * 80, sunDir.y * 80, R.z + sunDir.z * 80); sc.sl.target.position.set(R.x, 0, R.z);
      },
      hud(ctx) {
        const T0 = top(), bw = 210;
        ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, 16, T0, bw, 48, 12); ctx.fill();
        hudText(ctx, `Rock samples: ${samples} of 5`, 30, T0 + 22, 17, '#FFB52E', 'left'); hudText(ctx, 'Jezero Crater, Mars', 30, T0 + 40, 12, '#C9D0F2', 'left', 600);
        for (let i = 0; i < samples; i++) { ctx.fillStyle = '#E8EBF3'; roundRect(ctx, 16 + bw + 10 + i * 12, T0 + 6, 8, 36, 4); ctx.fill(); ctx.fillStyle = '#8C5A3C'; ctx.fillRect(16 + bw + 11 + i * 12, T0 + 24, 6, 16); }
        if (H0.y > .3) { const p = project(heli.position.clone()); if (p.front) hudPill(ctx, `Ingenuity: ${H0.y.toFixed(1)} m up`, p.x, p.y - 26, 'rgba(13,20,52,.88)', '#59E0E8', 12); }
        const next = markers.filter(m => !m.done).sort((a, b) => Math.hypot(a.x - R.x, a.z - R.z) - Math.hypot(b.x - R.x, b.z - R.z))[0];
        if (next) { const p = project(V3(next.x, ground.height(next.x, next.z) + 1.4, next.z)); if (p.front) hudPill(ctx, Math.hypot(next.x - R.x, next.z - R.z) < 4.5 ? 'Press Drill!' : 'Sample rock', p.x, p.y, 'rgba(255,227,138,.92)', '#2A1600', 12); }
      }
    };
  })();

  /* ================================================================ picker, with icons rendered from the 3D models */
  function buildPicker() {
    const el = $('#craftPick'); el.innerHTML = '';
    const SHORT = { iss: 'Space Station', voyager: 'Voyager 1 & 2', parker: 'Solar Probe', juno: 'Juno', cassini: 'Cassini', newhorizons: 'New Horizons', chandrayaan: 'Chandrayaan-3', mangalyaan: 'Mangalyaan', webb: 'James Webb', perseverance: 'Perseverance' };
    const MOD = { iss: 'iss', voyager: 'voyager', parker: 'parker', juno: 'juno', cassini: 'cassini', newhorizons: 'newhorizons', chandrayaan: 'vikram', mangalyaan: 'mangalyaan', webb: 'webb', perseverance: 'perseverance' };
    let iconScene = null, iconCam = null;
    for (const id of LIST) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'craft'; b.dataset.id = id; b.setAttribute('aria-pressed', 'false');
      try {
        if (!iconScene) { E3.mats(E3.renderer()); iconScene = new T.Scene(); iconScene.add(new T.AmbientLight(0xffffff, .5)); const dl = new T.DirectionalLight(0xffffff, 1.3); dl.position.set(3, 4, 5); iconScene.add(dl); iconCam = new T.PerspectiveCamera(30, 1, .1, 1000); }
        const m = E3.MODELS[MOD[id]](); iconScene.add(m);
        m.rotation.set(.35, -.7, 0); m.updateMatrixWorld(true);
        const bb = new T.Box3().setFromObject(m), c = bb.getCenter(V3()), sz = bb.getSize(V3()).length();
        iconCam.position.copy(c).add(V3(0, 0, sz * 1.75)); iconCam.lookAt(c);
        const cv = E3.snapshot(iconScene, iconCam, 96, 96, 0x000000, 0); iconScene.remove(m);
        const img = new Image(); img.src = cv.toDataURL(); img.width = img.height = 34; img.alt = ''; b.appendChild(img);
      } catch (e) { console.error(e); }
      b.appendChild(document.createTextNode(SHORT[id]));
      b.addEventListener('click', () => pick(id));
      el.appendChild(b);
    }
  }
  readyHooks.push(buildPicker);
  return {
    frame, layout,
    enter(quiet) {
      if (!ready) init();
      E3.attach(ov); layout();
      if (!cur) { cur = S.iss; $$('.craft').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === 'iss' ? 'true' : 'false')); $('#craftName').textContent = cur.name; $('#craftFacts').textContent = cur.facts; cur.make(); cur.reset(); }
      if (!quiet) intro('craft', 'craft_intro', () => { if (current === 'craft') setTimeout(() => { if (!Voice.busy && current === 'craft') say(cur.line); }, 500); });
    },
    leave() { held = {}; }
  };
})();
