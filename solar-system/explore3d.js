/* 1. EXPLORE: the whole solar system in 3D with real planet maps.
   Drag to turn, pinch or scroll to zoom, tap a planet to fly to it and zoom right in to its surface. */
'use strict';
views.explore = (() => {
  const T = THREE, ov = $('#exploreCv'), info = $('#info');
  ov.classList.add('over2d');
  const ORB = { mercury: 16, venus: 22.5, earth: 30, mars: 38, jupiter: 58.5, saturn: 70, uranus: 81.5, neptune: 91.5, pluto: 100 };
  const RAD = { sun: 8.5, mercury: 1.2, venus: 1.9, earth: 2, moon: .62, mars: 1.5, jupiter: 4.8, saturn: 4, uranus: 2.8, neptune: 2.7, pluto: .7 };
  const SPIN = { sun: .04, mercury: .05, venus: -.03, earth: .35, moon: .02, mars: .34, jupiter: .8, saturn: .75, uranus: -.5, neptune: .55, pluto: .06 };
  const HOME = { dist: 205, pitch: .58, yaw: .35 };
  let r, scene, cam, ctl, built = false, W = 0, H = 0, t = 0, simT = 0, speed = 1, names = true, sel = null, tour = null, lastYrs = -1, offKey = '';
  const P = {}, orbitLines = {}, start = {};
  { const rr = rng(42); for (const id of ORDER) start[id] = rr() * TAU; }
  let belt, kuiper, comet, sunLightObj;
  const infoSlot = makeSlot();
  const sparks = [];
  const orbitSpeed = period => TAU / (Math.pow(period, .6) * 24);
  const wp = new T.Vector3();

  function build() {
    r = E3.attach(ov); E3.mats(r);
    scene = new T.Scene();
    cam = new T.PerspectiveCamera(45, 1, .05, 30000);
    ctl = new E3.Orbit(cam, ov, { dist: HOME.dist, pitch: HOME.pitch, yaw: HOME.yaw, min: 3, max: 700, minPitch: -1.3, maxPitch: 1.45 });
    ctl.onTap = tapAt; ctl.snap();
    scene.add(E3.starfield(9000));
    scene.add(new T.AmbientLight(0xffffff, .06));
    sunLightObj = new T.PointLight(0xfff4e0, 1.65, 0, 0); scene.add(sunLightObj);
    P.sun = E3.planet('sun', RAD.sun); scene.add(P.sun);
    for (const id in ORB) {
      P[id] = E3.planet(id, RAD[id], { seg: id === 'earth' || id === 'jupiter' || id === 'saturn' ? 128 : 96 }); scene.add(P[id]);
      const pts = []; for (let i = 0; i <= 256; i++) { const a = i / 256 * TAU; pts.push(new T.Vector3(Math.cos(a) * ORB[id], id === 'pluto' ? Math.sin(a - 1) * ORB[id] * .14 : 0, -Math.sin(a) * ORB[id])); }
      const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x8ca0ff, transparent: true, opacity: id === 'pluto' ? .12 : .2, depthWrite: false }));
      orbitLines[id] = line; scene.add(line);
    }
    P.moon = E3.planet('moon', RAD.moon, { seg: 64 }); scene.add(P.moon);
    // asteroid belt and Kuiper belt: thousands of little rocks
    const dots = (n, r0, r1, thick, size, color, opacity) => {
      const pos = new Float32Array(n * 3), rr = rng(n);
      for (let i = 0; i < n; i++) { const a = rr() * TAU, d = r0 + (r1 - r0) * Math.pow(rr(), .9); pos[i * 3] = Math.cos(a) * d; pos[i * 3 + 1] = (rr() - .5) * thick; pos[i * 3 + 2] = Math.sin(a) * d; }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      const dot = E3.canvasTex(32, 32, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(.6, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
      return new T.Points(g, new T.PointsMaterial({ size, color, map: dot, transparent: true, opacity, depthWrite: false, alphaTest: .02 }));
    };
    belt = dots(3600, 43, 50.5, 1.6, .2, 0xb8a892, .95); scene.add(belt);
    kuiper = dots(2400, 95, 112, 6, .4, 0x9fb0d8, .5); scene.add(kuiper);
    // comet: icy head and a glowing tail that always points away from the Sun
    const head = new T.Mesh(new T.SphereGeometry(.35, 16, 8), new T.MeshBasicMaterial({ color: 0xeaf6ff }));
    head.add(E3.glow(0xbfe6ff, 3.2, .9));
    const tailTex = E3.canvasTex(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(220,240,255,.95)'); gr.addColorStop(.3, 'rgba(160,210,255,.45)'); gr.addColorStop(1, 'rgba(120,180,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, h / 2 - 6); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(0, h / 2 + 6); g.fill(); });
    const tail = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tailTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    comet = { head, tail, th: 2.4, a: 62, e: .82, w: 2.3 }; scene.add(head); scene.add(tail);
    built = true;
  }
  function posOf(id, out) {
    if (id === 'sun') return out.set(0, 0, 0);
    if (id === 'moon') { posOf('earth', out); const a = start.moon + simT * TAU / 4; return out.add(wp.set(Math.cos(a) * 4.6, Math.sin(a) * .5, -Math.sin(a) * 4.6)); }
    if (id === 'comet') return out.copy(comet.head.position);
    if (id === 'belt') return out.set(0, 0, 0);
    const a = start[id] + simT * orbitSpeed(BODIES[id].period), R = ORB[id];
    return out.set(Math.cos(a) * R, id === 'pluto' ? Math.sin(a - 1) * R * .14 : 0, -Math.sin(a) * R);
  }
  function layout() {
    if (!built) return;
    E3.attach(ov); const f = fitCanvas(ov); W = f.w; H = f.h; E3.fit(r, cam); offKey = '';
  }
  // keep the chosen planet in the part of the screen the info card doesn't cover
  function viewOffset() {
    let ox = 0, oy = 0;
    if (!info.hidden && sel) { if (W > 760) ox = (info.offsetWidth + 16) / 2; else oy = info.offsetHeight / 2.2; }
    const key = W + ',' + H + ',' + ox + ',' + oy;
    if (key === offKey) return; offKey = key;
    if (ox || oy) cam.setViewOffset(W, H, ox, oy, W, H); else cam.clearViewOffset();
  }
  const screenR = (pos, rad) => rad / (cam.position.distanceTo(pos) * Math.tan(cam.fov * PI / 360)) * H / 2;

  function frame(dt) {
    if (!built) { build(); layout(); }
    t += dt; simT += dt * speed;
    const yrs = Math.floor(simT * orbitSpeed(1) / TAU);
    if (yrs !== lastYrs) { lastYrs = yrs; $('#yearCount').textContent = yrs; }
    const v = new T.Vector3(), sunPos = new T.Vector3();
    for (const id in P) {
      posOf(id, v); P[id].position.copy(v);
      P[id].spin.rotation.y += dt * SPIN[id] * Math.max(.15, speed);
      if (id === 'earth' && P.earth.clouds) P.earth.clouds.rotation.y += dt * .012;
      E3.lightPlanet(P[id], sunPos);
    }
    belt.rotation.y = simT * .012; kuiper.rotation.y = simT * .002;
    // comet follows a stretched orbit, fast near the Sun
    const c = comet, cr = c.a * (1 - c.e * c.e) / (1 + c.e * Math.cos(c.th)); c.th += dt * speed * 280 / (cr * cr);
    c.head.position.set(Math.cos(c.th + c.w) * cr, Math.sin(c.th) * 4, -Math.sin(c.th + c.w) * cr);
    const dir = c.head.position.clone().normalize(), len = Math.min(40, 900 / cr), mid = c.head.position.clone().addScaledVector(dir, len / 2);
    const toCam = cam.position.clone().sub(mid), zAx = toCam.sub(dir.clone().multiplyScalar(toCam.dot(dir))).normalize(), yAx = new T.Vector3().crossVectors(zAx, dir);
    c.tail.position.copy(mid); c.tail.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(dir, yAx, zAx)); c.tail.scale.set(len, len * .16, 1);
    for (const id in orbitLines) { const m = orbitLines[id].material; m.color.set(sel === id ? 0xffb52e : 0x8ca0ff); m.opacity = sel === id ? .75 : id === 'pluto' ? .12 : .2; }
    viewOffset(); ctl.update(dt); r.render(scene, cam);
    drawOverlay(dt);
    if (!info.hidden && sel) drawInfoPlanet();
  }

  // is this point hidden behind a planet?
  const _d = new T.Vector3(), _c = new T.Vector3();
  function hidden(v, self) {
    const o = cam.position, len = _d.copy(v).sub(o).length(); _d.normalize();
    for (const id in P) {
      if (id === self) continue;
      const R = RAD[id], t = _c.copy(P[id].position).sub(o).dot(_d);
      if (t <= 0 || t >= len) continue;
      if (_c.copy(o).addScaledVector(_d, t).distanceTo(P[id].position) < R) return true;
    }
    return false;
  }
  // names, the "you live here" tag, the ring round the chosen planet, tap sparkles
  const SP = {};
  function drawOverlay(dt) {
    const ctx = ov.getContext('2d'), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    const v = new T.Vector3();
    for (const id of ORDER) {
      if (id === 'belt') continue;
      posOf(id, v); const p = E3.toScreen(v, cam, W, H), rad = id === 'comet' ? .35 : RAD[id] * (BODIES[id].rings ? (id === 'saturn' ? 2.27 : 2) : 1);
      SP[id] = { x: p.x, y: p.y, r: Math.max(2, screenR(v, rad)), ok: p.front && !hidden(v, id) };
    }
    if (names) {
      ctx.font = '600 13px Fredoka, "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const placed = [];
      for (const id of new Set([sel, 'earth', 'sun', 'jupiter', 'saturn', 'mars', 'venus', 'mercury', 'uranus', 'neptune', 'pluto', 'moon', 'comet'])) {
        const q = SP[id]; if (!id || !q || !q.ok || q.r > 140) continue;
        if (id === 'moon' && SP.earth && SP.earth.r < 14) continue;
        const y = q.y + q.r * (id === 'saturn' ? .55 : 1) + 6, tw = ctx.measureText(BODIES[id].name).width + 10, box = [q.x - tw / 2, y - 1, tw, 17];
        if (q.x < 0 || q.x > W || y > H) continue;
        if (placed.some(b => box[0] < b[0] + b[2] && b[0] < box[0] + box[2] && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) continue;
        placed.push(box);
        ctx.fillStyle = 'rgba(5,8,23,.6)'; ctx.fillRect(box[0], box[1], tw, 17);
        ctx.fillStyle = id === sel ? '#FFB52E' : '#C9D0F2'; ctx.fillText(BODIES[id].name, q.x, y);
      }
      const e = SP.earth;
      if (!sel && e && e.ok && e.r < 16) {
        const y = e.y - e.r - 30 - Math.sin(t * 3) * 3, label = 'You live here!';
        ctx.font = '700 13px Fredoka, sans-serif'; const tw = ctx.measureText(label).width + 16;
        ctx.fillStyle = '#FFB52E'; roundRect(ctx, e.x - tw / 2, y - 2, tw, 21, 10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(e.x - 5, y + 19); ctx.lineTo(e.x + 5, y + 19); ctx.lineTo(e.x, y + 25); ctx.fill();
        ctx.fillStyle = '#2A1600'; ctx.fillText(label, e.x, y + 2);
      }
    }
    if (sel && SP[sel] && SP[sel].ok && SP[sel].r < 120) {
      const q = SP[sel]; ctx.save(); ctx.strokeStyle = '#FFB52E'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 7]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r + 9, 0, TAU); ctx.stroke(); ctx.restore();
    }
    const zoomHint = sel && SP[sel] && SP[sel].r > 40 && SP[sel].r < 400 && ctl.goalDist > RAD[sel] * 2;
    if (zoomHint && t % 8 < 4) { ctx.font = '600 13px Fredoka, sans-serif'; ctx.textAlign = 'center'; const s = 'Pinch, scroll or press + to zoom in close'; const tw = ctx.measureText(s).width + 20; ctx.fillStyle = 'rgba(13,20,52,.8)'; roundRect(ctx, W / 2 - tw / 2 - (W > 760 && !info.hidden ? (info.offsetWidth + 16) / 2 : 0), H - 128, tw, 24, 12); ctx.fill(); ctx.fillStyle = '#C9D0F2'; ctx.textBaseline = 'middle'; ctx.fillText(s, W / 2 - (W > 760 && !info.hidden ? (info.offsetWidth + 16) / 2 : 0), H - 116); }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life += dt; if (s.life > .6) { sparks.splice(i, 1); continue; } ctx.strokeStyle = `rgba(89,224,232,${1 - s.life / .6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 6 + s.life * 50, 0, TAU); ctx.stroke(); }
  }
  function drawInfoPlanet() {
    const c = $('#infoCv'), d = dprNow(), size = c.clientWidth;
    if (!size) return;
    if (c.width !== Math.round(size * d)) { c.width = c.height = Math.round(size * d); }
    const ctx = c.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, size, size);
    const id = sel, b = BODIES[id], cx = size / 2;
    if (id === 'belt' || id === 'comet') { if (THUMB[id]) { if (!thumbImgs[id]) { thumbImgs[id] = new Image(); thumbImgs[id].src = THUMB[id]; } ctx.drawImage(thumbImgs[id], 0, 0, size, size); } return; }
    const rr = size * (b.rings ? (id === 'saturn' ? .21 : .25) : id === 'sun' ? .3 : .42);
    if (id === 'sun') sunGlow(ctx, cx, cx, rr, t, .8);
    drawBody(ctx, id, cx, cx, rr, { rot: -t * (id === 'sun' ? .1 : .35) * Math.sign(b.spin || 1), L: [-.55, -.3, .78], pitch: id === 'saturn' ? .42 : .25, dpr: d, slot: infoSlot, ringFlat: .42 });
  }
  const thumbImgs = {};

  function select(id, opts = {}) {
    sel = id;
    const b = BODIES[id];
    $('#infoKind').textContent = b.kind; $('#infoName').textContent = b.name; $('#infoNick').textContent = b.nick;
    $('#infoFacts').innerHTML = b.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    const nextId = ORDER[(ORDER.indexOf(id) + 1) % ORDER.length];
    $('#infoNext').textContent = 'Next: ' + BODIES[nextId].name;
    $('#infoVisit').lastChild.textContent = id === 'earth' ? 'Explore Earth' : id === 'sun' ? 'Fly near the Sun' : 'Visit as Ayansh';
    info.hidden = false; offKey = '';
    $$('.thumb').forEach(tb => tb.setAttribute('aria-pressed', tb.dataset.id === id ? 'true' : 'false'));
    const tb = $(`.thumb[data-id="${id}"]`); if (tb) tb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (id === 'belt') { ctl.follow = null; ctl.goal.set(0, 0, 0); ctl.goalDist = 115; ctl.goalPitch = .9; ctl.min = 3; }
    else {
      ctl.follow = g => posOf(id, g);
      const rad = id === 'comet' ? 1.2 : RAD[id];
      ctl.min = rad * (id === 'sun' ? 2.2 : 1.9); ctl.goalDist = rad * (b.rings ? 7.5 : id === 'sun' ? 4.2 : 4.4); ctl.goalPitch = b.rings ? .38 : .22;
      // come in from the sunny side, a little to one side so you can see day turning into night
      if (id !== 'sun') { const p = posOf(id, new T.Vector3()); const ys = Math.atan2(-p.x, -p.z); let dy = ys + .75 - ctl.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); ctl.goalYaw = ctl.yaw + dy; }
    }
    ctl.retarget();
    Sfx.whoosh();
    if (!opts.silent) Voice.say(id, opts.done);
  }
  function closeInfo() {
    sel = null; info.hidden = true; offKey = ''; ctl.follow = null; ctl.goal.set(0, 0, 0); ctl.goalDist = HOME.dist; ctl.goalPitch = HOME.pitch; ctl.min = 3; ctl.retarget();
    $$('.thumb').forEach(tb => tb.setAttribute('aria-pressed', 'false'));
  }
  function stopTour() { if (!tour) return; clearTimeout(tour.timer); tour = null; Voice.stop(); $('#tourBtn span').textContent = 'Planet tour'; }
  function startTour() {
    tour = { i: -1 }; $('#tourBtn span').textContent = 'Stop tour'; closeInfo();
    const step = () => {
      if (!tour) return; tour.i++;
      if (tour.i >= TOUR.length) { closeInfo(); const tt = tour; Voice.say('tour_end', () => { if (tour === tt) stopTour(); }); return; }
      select(TOUR[tour.i], { done: () => { if (tour) tour.timer = setTimeout(step, 1100); } });
    };
    Voice.say('tour_start', () => { if (tour) tour.timer = setTimeout(step, 400); });
  }
  function tapAt(x, y) {
    let best = null, bd = 1e9;
    for (const id in SP) { const q = SP[id]; if (!q.ok) continue; const hit = Math.max(q.r + 8, 22), dd = Math.hypot(x - q.x, y - q.y); if (dd < hit && dd < bd) { best = id; bd = dd; } }
    if (!best) {
      const ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(x / W * 2 - 1, -(y / H) * 2 + 1), cam);
      const hit = new T.Vector3(); if (ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), hit)) { const rr = Math.hypot(hit.x, hit.z); if (rr > 42 && rr < 51.5) best = 'belt'; }
    }
    sparks.push({ x, y, life: 0 }); stopTour();
    if (best) select(best); else Sfx.twinkle();
  }

  // controls
  $$('#view-explore .seg button').forEach(bt => bt.addEventListener('click', () => {
    speed = +bt.dataset.speed; Sfx.tap();
    $$('#view-explore .seg button').forEach(x => x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'));
  }));
  $('#namesBtn').addEventListener('click', e => { names = !names; e.currentTarget.setAttribute('aria-pressed', names); Sfx.tap(); });
  $('#zoomIn').addEventListener('click', () => { ctl.zoom(.55); Sfx.tap(); });
  $('#zoomOut').addEventListener('click', () => { ctl.zoom(1.8); Sfx.tap(); });
  $('#infoClose').addEventListener('click', () => { stopTour(); Voice.stop(); closeInfo(); Sfx.tap(); });
  $('#infoHear').addEventListener('click', () => { if (sel) { Sfx.tap(); Voice.say(sel); } });
  $('#infoNext').addEventListener('click', () => { stopTour(); select(ORDER[(ORDER.indexOf(sel) + 1) % ORDER.length]); });
  $('#infoVisit').addEventListener('click', () => { if (!sel) return; stopTour(); Sfx.whoosh(); window.visitWorld?.(sel); });
  $('#tourBtn').addEventListener('click', () => { Sfx.tap(); if (tour) stopTour(); else startTour(); });
  window.addEventListener('keydown', e => { if (current !== 'explore' || !ctl) return; if (e.key === '+' || e.key === '=') ctl.zoom(.7); if (e.key === '-') ctl.zoom(1.4); });

  function buildStrip() {
    $('#strip').innerHTML = ORDER.map(id => `<button class="thumb" type="button" data-id="${id}" aria-pressed="false"><img src="${THUMB[id]}" alt="">${BODIES[id].name.replace('Asteroid belt', 'Asteroids')}</button>`).join('');
    $$('.thumb').forEach(b => b.addEventListener('click', () => { stopTour(); select(b.dataset.id); }));
  }
  return {
    frame, layout, buildStrip, select, stopTour,
    enter(quiet) { if (built) E3.attach(ov); layout(); if (!quiet) intro('explore', 'explore_intro'); },
    leave() { stopTour(); }
  };
})();
