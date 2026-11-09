/* How it began: the story of how the solar system was born, in ten chapters, from a cold cloud of gas to the planets of today.
   Chapters 1 to 4 use the 3D glowing gas in gas.js. The rest are ordinary 3D scenes with real planet pictures. */
'use strict';
views.birth = (() => {
  const T = THREE, ov = $('#birthCv'), V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  ov.classList.add('over2d');
  let r, cam, ctl, gas, ready = false, W = 0, H = 0, t = 0, cur = 0, et = 0, started = false;
  const ease = x => x * x * (3 - 2 * x), seg = (a, b, x) => clamp((x - a) / (b - a), 0, 1), rnd = (a, b) => a + Math.random() * (b - a);
  const proj = v => E3.toScreen(v, cam, W, H);
  const label = (ctx, v, s, bg = 'rgba(13,20,52,.85)', fg = '#F3F1FF', size = 12, dy = 0) => { const p = proj(v); if (p.front && p.x > 20 && p.x < W - 20 && p.y > 20 && p.y < H - 20) hudPill(ctx, s, p.x, p.y + dy, bg, fg, size); };
  const GOLD = 'rgba(255,181,46,.93)', INK = '#2A1600';
  const top = () => ($('#view-birth .over.top').offsetHeight || 44) + 14, bottom = () => H - ($('#birthCtl').offsetHeight || 44) - 16;
  const panel = (ctx, x, y, w, h) => { ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, x, y, w, h, 12); ctx.fill(); };
  const bar = (ctx, x, y, w, v, col) => { ctx.fillStyle = '#16215A'; roundRect(ctx, x, y, w, 8, 4); ctx.fill(); ctx.fillStyle = col; roundRect(ctx, x, y, Math.max(8, w * clamp(v, 0, 1)), 8, 4); ctx.fill(); };
  function view(o) {
    let dist = o.dist; if (H > W && W) dist *= Math.min(1.9, H / W * (o.tall ?? .9));
    ctl.follow = null; ctl.quat = null; ctl.goal.copy(o.goal || V3()); ctl.goalDist = dist; ctl.min = o.min ?? dist * .3; ctl.max = o.max ?? dist * 3;
    ctl.goalYaw = o.yaw ?? ctl.goalYaw; ctl.goalPitch = o.pitch ?? ctl.goalPitch; ctl.minPitch = o.minPitch ?? -1.4; ctl.maxPitch = o.maxPitch ?? 1.4; ctl.auto = o.auto || 0;
    ctl.retarget();
  }
  const S = {};   // scenes, built the first time they are needed

  /* ================================================================ chapters 1 to 4: the gas */
  // a bright star with the four thin spikes a telescope gives it
  let _st = null;
  const starTex = () => _st || (_st = E3.canvasTex(256, 256, (g, w) => {
    const c = w / 2, gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.06, 'rgba(255,255,255,.85)'); gr.addColorStop(.22, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
    for (const a of [0, Math.PI / 2]) { g.save(); g.translate(c, c); g.rotate(a + .3); const lg = g.createLinearGradient(-c, 0, c, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,.7)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(-c, -1.2, w, 2.4); g.restore(); }
  }));
  const star = (color, size, op = 1) => { const s = new T.Sprite(new T.SpriteMaterial({ map: starTex(), color, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, depthTest: false })); s.scale.set(size, size, 1); return s; };
  function gasScene() {
    if (S.gas) return S.gas;
    const s = new T.Scene(), u = gas.u; s.add(E3.starfield(9000)); s.add(gas.comp);
    const hot = star(0xbfd4ff, .55); hot.position.copy(u.uL0pos.value); hot.renderOrder = 2; s.add(hot);
    const old = star(0xffc890, .3); old.position.copy(u.uL1pos.value); old.renderOrder = -6; s.add(old);          // behind the gas
    const giant = star(0xff8a5a, .5); giant.position.copy(u.uSN.value); giant.renderOrder = 2; s.add(giant);       // the star that will explode
    const flash = star(0xffffff, .1, 0); flash.position.copy(u.uSN.value); flash.renderOrder = 3; s.add(flash);
    const bubble = new T.Mesh(new T.SphereGeometry(1, 64, 32), new T.ShaderMaterial({ uniforms: { op: { value: 0 }, time: { value: 0 } }, transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, side: T.DoubleSide,
      vertexShader: 'varying vec3 vN, vV, vP; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float op, time; varying vec3 vN, vV, vP; void main(){ float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5); float m = 0.6 + 0.4 * sin(vP.x * 11.0 + sin(vP.y * 9.0 + time)) * sin(vP.z * 10.0 + vP.y * 4.0); gl_FragColor = vec4(mix(vec3(0.45, 0.7, 1.0), vec3(1.0, 0.5, 0.6), m) * rim * m * op, 1.0); }' }));
    bubble.position.copy(u.uSN.value); bubble.renderOrder = 1; bubble.visible = false; s.add(bubble);
    return (S.gas = { s, hot, old, giant, flash, bubble, spin: 0, boom: -1 });
  }
  const GAS0 = { uK: 0, uEnv: 1, uDisk: 0, uSpin: 0, uCav: 0, uStar: 0, uJet: 0, uHa: .3, uShockR: 0, uShockI: 0, uSNI: 0, uExpo: 1.9, uFlat: 1.25, uRd: .72 };
  // o.far: how much the two nearby stars still light the scene (the story zooms in on the middle of the cloud)
  function setGas(o) {
    const u = gas.u, far = o.far ?? 1; for (const k in GAS0) u[k].value = o[k] ?? GAS0[k];
    u.uL0col.value.set(.34, .46, .7).multiplyScalar(far); u.uL1col.value.set(.42, .24, .1).multiplyScalar(far);
    if (o.starCol) u.uStarCol.value.set(o.starCol[0], o.starCol[1], o.starCol[2]);
    const g = S.gas; g.hot.material.opacity = far; g.old.material.opacity = far;
  }
  const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  /* ================================================================ chapter 5: dust to mini planets, seen from inside the disk */
  function lump(detail, amp, seed, freq = 1.3) {
    const g = new T.IcosahedronGeometry(1, detail), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (noise3(x * freq + seed, y * freq, z * freq) - .5) * 2 * amp + (noise3(x * freq * 2.7 + seed, y * freq * 2.7 + 5, z * freq * 2.7) - .5) * amp * .7; p.setXYZ(i, x * k, y * k, z * k); }
    g.computeVertexNormals(); return g;
  }
  function dustScene() {
    if (S.dust) return S.dust;
    const s = new T.Scene(), sunDir = V3(-.75, .14, -.64).normalize();
    // the view from inside the dusty disk: a warm haze along the disk, and the young Sun glowing through it
    const bg = new T.Mesh(new T.SphereGeometry(2000, 32, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: sunDir }, haze: { value: 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 sun; uniform float haze; varying vec3 vD; void main(){ vec3 d = normalize(vD); float c = max(dot(d, sun), 0.0), band = exp(-abs(d.y) * 3.2);
        vec3 col = vec3(0.012, 0.01, 0.015) + vec3(0.6, 0.32, 0.14) * band * (0.14 + 0.6 * pow(c, 3.0)) * haze + vec3(1.0, 0.8, 0.5) * (pow(c, 30.0) * 0.5 * haze + pow(c, 220.0) * 1.3 + pow(c, 2500.0) * 4.0); gl_FragColor = vec4(col, 1.0); }` }));
    bg.renderOrder = -10; s.add(bg);
    s.fog = new T.FogExp2(0x2a180c, .03);
    const sl = new T.DirectionalLight(0xffdcae, 1.7); sl.position.copy(sunDir).multiplyScalar(100); s.add(sl); s.add(new T.HemisphereLight(0xb89068, 0x2a1a10, 1.05));
    const grp = new T.Group(); s.add(grp);
    const rv = (x, y = x, z = x) => V3(rnd(-x, x), rnd(-y, y), rnd(-z, z));
    // where the mini planets end up, the boulders that build them, the pebble clumps that build those, and the dust that builds those
    const PL = []; while (PL.length < 8) { const p = rv(11, 3.5, 8); if (PL.every(q => q.distanceTo(p) > 6.5)) PL.push(p); }
    const PA = Array.from({ length: 64 }, (_, i) => ({ to: i % 8, p: PL[i % 8].clone().add(rv(3.4, 2, 3.4)), d: Math.random() * .1 }));
    const CL = Array.from({ length: 420 }, (_, i) => ({ to: i % 64, p: PA[i % 64].p.clone().add(rv(1.9, 1.3, 1.9)), d: Math.random() * .1, stay: Math.random() < .2, rot: new T.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6)), sp: rnd(.2, 1.2), sz: rnd(.6, 1.4) }));
    const N = 7000, a0 = new Float32Array(N * 3), a1 = new Float32Array(N * 3), pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const c = CL[i % 420].p, a = rv(1.7), b = rv(.11); a0[i * 3] = c.x + a.x; a0[i * 3 + 1] = c.y + a.y; a0[i * 3 + 2] = c.z + a.z; a1[i * 3] = c.x + b.x; a1[i * 3 + 1] = c.y + b.y; a1[i * 3 + 2] = c.z + b.z; }
    const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(pos, 3));
    const dot = E3.canvasTex(32, 32, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(.5, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
    const dust = new T.Points(dg, new T.PointsMaterial({ color: 0xe2bc8c, size: .055, map: dot, transparent: true, depthWrite: false, opacity: .9 })); dust.frustumCulled = false; grp.add(dust);
    const rockM = NATURE.rockMat(0x9a8876, { repeat: 1.4, bump: .07 });
    const peb = new T.InstancedMesh(lump(1, .3, 3), rockM, 420), bou = new T.InstancedMesh(lump(2, .28, 9), rockM, 64); peb.frustumCulled = bou.frustumCulled = false; grp.add(peb); grp.add(bou);
    PA.forEach(a => { a.rot = new T.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6)); a.sp = rnd(.1, .5); a.sz = rnd(.7, 1.3); });
    const big = PL.map((p, i) => { const m = new T.Mesh(lump(5, .2, 20 + i * 7, 1.1), new T.MeshStandardMaterial({ map: E3.tex(i % 2 ? 'ceres' : 'moon'), bumpMap: E3.tex('moon_bump'), bumpScale: .05, roughness: 1, color: i % 3 ? 0xa89c90 : 0x9a8a7a })); m.position.copy(p); m.userData = { sz: rnd(1.5, 2.6), ax: rv(1).normalize(), sp: rnd(.05, .16) }; m.rotation.set(rnd(0, 6), rnd(0, 6), 0); grp.add(m); return m; });
    return (S.dust = { s, bg, grp, dust, a0, a1, pos, peb, bou, big, PL, PA, CL, m4: new T.Matrix4(), q: new T.Quaternion(), v: V3(), sc: V3() });
  }

  /* ================================================================ chapters 6 and 7: the disk with rings and gaps, the snow line, the giants, then the Sun's wind */
  const DISK_PLANETS = [   // name, picture, distance, size, when it grows (share of the chapter), colour tint
    ['', 'mercury', 3.3, .28, .25, 0xb0a090], ['', 'moon', 4.3, .34, .3, 0xb8a898], ['', 'mars', 5.2, .3, .28, 0xc09070], ['', 'venus', 6.1, .36, .34, 0xc8b090], ['', 'mercury', 7.0, .3, .38, 0xa89888], ['', 'mars', 7.9, .27, .42, 0xb89080],
    ['Jupiter', 'jupiter', 13, 1.55, .08, 0xffffff], ['Saturn', 'saturn', 19, 1.3, .3, 0xffffff], ['Uranus', 'uranus', 26, .85, .5, 0xffffff], ['Neptune', 'neptune', 32.5, .82, .56, 0xffffff]
  ];
  const SNOW = 9.6;
  function diskScene() {
    if (S.disk) return S.disk;
    const s = new T.Scene(); s.add(E3.starfield(9000)); s.add(new T.AmbientLight(0xffffff, .07));
    const sunLight = new T.PointLight(0xfff0d8, 1.9, 0, 0); s.add(sunLight);
    const sun = E3.planet('sun', 1.15); s.add(sun);
    const halo1 = E3.glow(0xffe0a8, 13, .95), halo2 = E3.glow(0xff9a50, 46, .32); s.add(halo1); s.add(halo2);
    const du = { time: { value: 0 }, clearR: { value: -10 }, snowR: { value: SNOW }, layer: { value: 1 }, noiseTex: gas.u.noiseTex, gap: { value: DISK_PLANETS.map(p => new T.Vector4(p[2], p[3] * 1.5 + .25, 0, 0)) } };
    const mk = (y, a) => { const m = new T.Mesh(new T.RingGeometry(1.4, 47, 256, 1), new T.ShaderMaterial({ uniforms: Object.assign({}, du, { layer: { value: a } }), transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: 'varying vec2 vXZ; void main(){ vXZ = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float time, clearR, snowR, layer; uniform vec4 gap[10]; uniform sampler2D noiseTex; varying vec2 vXZ;
        void main(){
          float r = length(vXZ), a = atan(vXZ.y, vXZ.x), w = time * 2.6 / pow(r + 2.0, 1.5);
          vec2 q = vec2(cos(a - w), sin(a - w)) * r;                                             // the inside goes round faster than the outside
          float lump = texture2D(noiseTex, q * 0.021).r * 0.6 + texture2D(noiseTex, q * 0.06 + 0.3).r * 0.4;
          float rings = texture2D(noiseTex, vec2(r * 0.011, 0.37)).g * 0.6 + texture2D(noiseTex, vec2(r * 0.045, 0.71)).r * 0.4;   // many fine rings, as real disks show
          float dens = (0.3 + 1.1 * rings) * (0.62 + 0.7 * lump);
          for (int i = 0; i < 10; i++) { float g = (r - gap[i].x) / gap[i].y; dens *= 1.0 - gap[i].z * exp(-g * g); }           // gaps swept clear by the growing planets
          dens *= smoothstep(1.4, 3.2, r) * (1.0 - smoothstep(36.0, 47.0, r));
          vec3 hot = mix(vec3(1.0, 0.94, 0.8), vec3(1.0, 0.5, 0.15), smoothstep(1.5, 6.5, r));
          vec3 dust = mix(vec3(0.66, 0.38, 0.2), vec3(0.42, 0.3, 0.25), smoothstep(6.0, 22.0, r));
          vec3 col = mix(hot * (2.4 * exp(-r * 0.3) + 0.3), dust, smoothstep(2.0, 8.5, r));
          col = mix(col, vec3(0.5, 0.58, 0.7), smoothstep(snowR - 0.6, snowR + 2.5, r) * 0.5);    // frosty past the snow line
          col *= 0.3 + 3.2 / (1.0 + r * 0.28);
          float al = clamp(dens * 1.15, 0.0, 1.0) * smoothstep(clearR - 1.0, clearR + 3.5, r) * layer;
          gl_FragColor = vec4(col, al);
        }` })); m.rotation.x = -PI / 2; m.position.y = y; m.renderOrder = 1; s.add(m); return m; };
    const layers = [mk(0, 1), mk(.35, .3), mk(-.35, .3)];
    const snow = new T.Line(new T.BufferGeometry().setFromPoints(Array.from({ length: 181 }, (_, i) => V3(Math.cos(i / 180 * TAU) * SNOW, .05, Math.sin(i / 180 * TAU) * SNOW))), new T.LineDashedMaterial({ color: 0xa8dcff, dashSize: .9, gapSize: .6, transparent: true, opacity: .9, depthWrite: false }));
    snow.computeLineDistances(); snow.renderOrder = 2; s.add(snow);
    const planets = DISK_PLANETS.map(([name, tex, rad, size, grow, tint], i) => { const m = new T.Mesh(new T.SphereGeometry(1, 48, 24), new T.MeshStandardMaterial({ map: E3.tex(tex), color: tint, roughness: 1, emissive: name ? 0xffffff : 0x4a1808, emissiveMap: name ? E3.tex(tex) : null, emissiveIntensity: name ? .3 : 1 })); m.userData = { name, rad, size: size * 1.25, grow, a: i * 2.4 + 1, i }; m.renderOrder = 3; s.add(m); return m; });
    // the Sun's wind, and the leftover belts it uncovers
    const wn = 2600, wp = new Float32Array(wn * 3), wa = new Float32Array(wn), wr = new Float32Array(wn), wy = new Float32Array(wn);
    for (let i = 0; i < wn; i++) { wa[i] = Math.random() * TAU; wr[i] = Math.random(); wy[i] = rnd(-.5, .5); }
    const wg = new T.BufferGeometry(); wg.setAttribute('position', new T.BufferAttribute(wp, 3));
    const wind = new T.Points(wg, new T.PointsMaterial({ color: 0xfff0c0, size: .22, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); wind.frustumCulled = false; wind.renderOrder = 4; s.add(wind);
    const belt = (n, r0, r1, thick, size, color) => { const p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = rnd(r0, r1); p[i * 3] = Math.cos(a) * d; p[i * 3 + 1] = rnd(-thick, thick); p[i * 3 + 2] = Math.sin(a) * d; } const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3)); const m = new T.Points(g, new T.PointsMaterial({ color, size, transparent: true, opacity: 0, depthWrite: false })); m.renderOrder = 2; s.add(m); return m; };
    const belts = [belt(1500, 8.9, 11.2, .25, .13, 0xb8a892), belt(3200, 35, 46, .8, .16, 0xa8b8d8)];
    return (S.disk = { s, du, layers, sun, halo1, halo2, snow, planets, wind, wp, wa, wr, wy, belts });
  }
  // g: how far each planet has grown (0 to 1); clear: how far out the gas has been blown away; windOn: 0 to 1
  function diskTick(dt, grow, clear, windOn, beltOp) {
    const d = S.disk; d.du.time.value += dt; d.sun.spin.rotation.y += dt * .05;
    d.planets.forEach((m, i) => {
      const u = m.userData, g = grow(u); u.a += dt * 1.3 / Math.pow(u.rad, 1.5) * 6;
      m.position.set(Math.cos(u.a) * u.rad, 0, -Math.sin(u.a) * u.rad); m.scale.setScalar(Math.max(.001, u.size * (.12 + .88 * g))); m.rotation.y += dt * .3; m.visible = g > .01;
      for (const L of d.layers) L.material.uniforms.gap.value[i].z = .93 * g;
    });
    for (const L of d.layers) { L.material.uniforms.time.value = d.du.time.value; L.material.uniforms.clearR.value = clear; }
    d.snow.material.opacity = .9 * (1 - seg(SNOW - 4, SNOW + 6, clear));
    const wp = d.wp; for (let i = 0; i < d.wa.length; i++) { d.wr[i] = (d.wr[i] + dt * .16) % 1; const rr = 1.5 + d.wr[i] * 50; wp[i * 3] = Math.cos(d.wa[i]) * rr; wp[i * 3 + 1] = d.wy[i] * (1 + rr * .05); wp[i * 3 + 2] = Math.sin(d.wa[i]) * rr; }
    d.wind.geometry.attributes.position.needsUpdate = true; d.wind.material.opacity = .55 * windOn;
    d.halo1.scale.setScalar(13 + windOn * 5 + Math.sin(t * 3) * .4 * windOn); d.belts.forEach(b => { b.material.opacity = .85 * beltOp; b.rotation.y += dt * .01; });
    return d.s;
  }

  /* ================================================================ chapter 8: baby planets crashing together */
  function crashScene() {
    if (S.crash) return S.crash;
    const s = new T.Scene(); s.add(E3.starfield(9000)); s.add(new T.AmbientLight(0xffffff, .09)); s.add(new T.PointLight(0xfff0d8, 1.9, 0, 0));
    const sun = E3.planet('sun', 2.4); s.add(sun); s.add(E3.glow(0xffe0a8, 22, .9)); s.add(E3.glow(0xff9a50, 70, .25));
    const lava = E3.canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(255,${120 + Math.random() * 110 | 0},40,${.35 + Math.random() * .5})`; g.lineWidth = .8 + Math.random() * 2.2; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-22, 22); y += rnd(-14, 14); g.lineTo(x, y); } g.stroke(); } }, true);
    // four winners (Mercury, Venus, Earth, Mars) and the worlds that crash into each of them
    const WIN = [['Mercury', 8, 1.0, 'mercury', 2], ['Venus', 12.4, 1.6, 'venus', 3], ['Earth', 17.4, 1.7, 'moon', 4], ['Mars', 22.6, 1.15, 'mars', 2]];
    const TEX = ['mercury', 'moon', 'mars', 'ceres', 'io', 'venus', 'europa'], bodies = [];
    const mk = (tex, size, rad, a) => { const m = new T.Mesh(new T.SphereGeometry(1, 48, 24), new T.MeshStandardMaterial({ map: E3.tex(tex), roughness: 1, color: 0xc8b8a8, emissive: 0xff5a1a, emissiveMap: lava, emissiveIntensity: .35 })); m.userData = { size, rad, a, size0: size, rad0: rad, a0: a, heat: .35 }; s.add(m); bodies.push(m); return m; };
    let n = 0;
    WIN.forEach(([name, rad, size, tex, hits], wi) => {
      const each = Math.cbrt(size * size * size / (hits + 1.6)), w = mk(tex, each * 1.15, rad, wi * 1.7 + .4); w.userData.name = name; w.userData.win = true; w.userData.final = size;
      for (let k = 0; k < hits; k++) { const b = mk(TEX[(n++) % TEX.length], each * rnd(.8, 1), rad + rnd(-2.4, 2.4), Math.random() * TAU); b.userData.into = w; b.userData.at = .17 + (n * .618 % 1) * .6; if (name === 'Earth' && k === hits - 1) { b.userData.at = .86; b.userData.moon = true; } }
    });
    const moon = new T.Mesh(new T.SphereGeometry(.45, 32, 16), new T.MeshStandardMaterial({ map: E3.tex('moon'), roughness: 1 })); moon.visible = false; s.add(moon);
    const flash = E3.glow(0xfff0c8, 1, 0); s.add(flash);
    const sparks = makeParticles(900, 0xff9a40, .5, true); s.add(sparks);
    return (S.crash = { s, sun, bodies, moon, flash, sparks, left: bodies.length, hits: 0, flashT: 9 });
  }

  /* ================================================================ chapter 9: the giant planets shuffle, and the leftovers are scattered */
  const AU = 1.5, GI = [['Jupiter', 5.45, 5.2, 0xffc890, 1.5], ['Saturn', 7.3, 9.55, 0xffe6a8, 1.25], ['Uranus', 11.2, 19.2, 0xa8f0f4, .9], ['Neptune', 13.8, 30.1, 0x7aa8ff, .88]];
  function shuffleScene() {
    if (S.shuffle) return S.shuffle;
    const s = new T.Scene(); s.add(E3.starfield(9000)); s.add(new T.AmbientLight(0xffffff, .12)); s.add(new T.PointLight(0xfff0d8, 1.7, 0, 0));
    s.add(E3.planet('sun', .9)); s.add(E3.glow(0xffe0a8, 9, .95)); s.add(E3.glow(0xff9a50, 28, .25));
    const circle = Array.from({ length: 257 }, (_, i) => V3(Math.cos(i / 256 * TAU), 0, Math.sin(i / 256 * TAU)));
    const giants = GI.map(([name, r0, r1, col, size], i) => { const m = new T.Mesh(new T.SphereGeometry(size, 40, 20), new T.MeshStandardMaterial({ map: E3.tex(name.toLowerCase()), roughness: 1 })); const line = new T.Line(new T.BufferGeometry().setFromPoints(circle), new T.LineBasicMaterial({ color: col, transparent: true, opacity: .55, depthWrite: false })); s.add(m); s.add(line); return { m, line, name, r0, r1, a: i * 1.9 }; });
    const inner = [.39, .72, 1, 1.52].map((d, i) => { const m = new T.Mesh(new T.SphereGeometry(.26, 16, 8), new T.MeshStandardMaterial({ color: [0xa89888, 0xd8c090, 0x6aa0e0, 0xc87850][i], roughness: 1 })); s.add(m); return { m, d, a: i * 2.1 }; });
    // the icy leftovers: each has a path before the shuffle, a moment when it is flung, and a fate
    const N = 5200, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), P = [];
    for (let i = 0; i < N; i++) { const r0 = rnd(15.5, 34), f = Math.random(); P.push({ r0, a: Math.random() * TAU, y: rnd(-.5, .5), us: .2 + .5 * Math.pow(seg(14, 36, r0), .8) + Math.random() * .07, fate: f < .18 ? 0 : f < .62 ? 1 : 2, q: rnd(.5, 3.2), rk: rnd(31.5, 48), inc: rnd(-3.4, 3.4), b: rnd(.5, 1) }); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    const pts = new T.Points(g, new T.PointsMaterial({ size: .62, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); pts.frustumCulled = false; s.add(pts);
    const an = 900, ap = new Float32Array(an * 3); for (let i = 0; i < an; i++) { const a = Math.random() * TAU, d = rnd(2.1, 3.3) * AU; ap[i * 3] = Math.cos(a) * d; ap[i * 3 + 1] = rnd(-.1, .1); ap[i * 3 + 2] = Math.sin(a) * d; }
    const ag = new T.BufferGeometry(); ag.setAttribute('position', new T.BufferAttribute(ap, 3)); const ast = new T.Points(ag, new T.PointsMaterial({ color: 0xb8a892, size: .22, transparent: true, opacity: .9, depthWrite: false })); s.add(ast);
    const flashes = Array.from({ length: 4 }, () => { const f = E3.glow(0xffd8a0, 1, 0); s.add(f); return f; });
    return (S.shuffle = { s, giants, inner, P, pos, col, pts, ast, flashes, u: 0 });
  }

  /* ================================================================ chapter 10: the solar system today */
  const ORB = { mercury: 16, venus: 22.5, earth: 30, mars: 38, jupiter: 58.5, saturn: 70, uranus: 81.5, neptune: 91.5 };
  const RAD = { sun: 8.5, mercury: 1.2, venus: 1.9, earth: 2, mars: 1.5, jupiter: 4.8, saturn: 4, uranus: 2.8, neptune: 2.7 };
  function todayScene() {
    if (S.today) return S.today;
    const s = new T.Scene(); s.add(E3.starfield(9000)); s.add(new T.AmbientLight(0xffffff, .06)); s.add(new T.PointLight(0xfff4e0, 1.65, 0, 0));
    const P = { sun: E3.planet('sun', RAD.sun) }; s.add(P.sun);
    let i = 0; for (const id in ORB) { P[id] = E3.planet(id, RAD[id], { seg: 96 }); P[id].userData.a = (i++) * 2.3; s.add(P[id]); s.add(new T.Line(new T.BufferGeometry().setFromPoints(Array.from({ length: 257 }, (_, k) => V3(Math.cos(k / 256 * TAU) * ORB[id], 0, Math.sin(k / 256 * TAU) * ORB[id]))), new T.LineBasicMaterial({ color: 0x8ca0ff, transparent: true, opacity: .2, depthWrite: false }))); }
    const dots = (n, r0, r1, thick, size, color, op) => { const p = new Float32Array(n * 3); for (let k = 0; k < n; k++) { const a = Math.random() * TAU, d = rnd(r0, r1); p[k * 3] = Math.cos(a) * d; p[k * 3 + 1] = rnd(-thick, thick); p[k * 3 + 2] = Math.sin(a) * d; } const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3)); const m = new T.Points(g, new T.PointsMaterial({ size, color, transparent: true, opacity: op, depthWrite: false })); s.add(m); return m; };
    const belts = [dots(3000, 43, 50.5, .8, .22, 0xb8a892, .9), dots(2600, 96, 114, 3, .4, 0x9fb0d8, .5)];
    return (S.today = { s, P, belts });
  }

  /* ================================================================ the ten chapters */
  const CH = [
    { id: 'cloud', name: 'A cold cloud', when: 'Before the Sun', sub: 'About 4.6 billion years ago', line: 'b_cloud', gas: true,
      start() { gasScene(); const g = S.gas; g.giant.visible = true; g.bubble.visible = false; g.flash.material.opacity = 0; view({ dist: 3, yaw: .25, pitch: .2, min: 1.5, max: 7, auto: .02, goal: V3(-.25, .05, 0) }); },
      tick(dt) { gas.u.time.value += dt; setGas({}); S.gas.giant.scale.setScalar(.5 + Math.sin(t * 2.2) * .03); return S.gas.s; },
      hud(ctx) { const u = gas.u; label(ctx, u.uL0pos.value, 'A hot young star', 'rgba(13,20,52,.85)', '#CFE0FF', 11, -22); label(ctx, V3(.5, .25, .15), 'Hydrogen gas glows pink', 'rgba(255,109,138,.9)', '#2A0010', 11); label(ctx, V3(-.35, -.1, .3), 'Dark dust from older stars', 'rgba(13,20,52,.9)', '#E8C9A0', 11); label(ctx, u.uSN.value, 'A giant old star', 'rgba(13,20,52,.85)', '#FFC8A0', 11, -22);
        hudPill(ctx, W < 600 ? 'This cloud is many light years wide' : 'This cloud is many light years wide. A plane would need billions of years to cross it.', W / 2, bottom() - 4, 'rgba(13,20,52,.85)', '#C9D0F2', 12); } },
    { id: 'nova', name: 'A star explodes', when: 'The big push', sub: 'A blast wave squeezes the cloud', line: 'b_nova', gas: true, action: { id: 'boom', label: 'Explode the star!' },
      start() { gasScene(); const g = S.gas; g.boom = -1; g.giant.visible = true; g.bubble.visible = false; g.flash.material.opacity = 0; view({ dist: 3.4, yaw: .05, pitch: .2, min: 1.5, max: 8, goal: V3(-.75, .12, .1) }); },
      act() { const g = S.gas; if (g.boom < 0) { g.boom = 0; Sfx.boop(); Sfx.whoosh(); setAction(null); } },
      tick(dt) {
        const g = S.gas, u = gas.u; u.time.value += dt; if (g.boom < 0 && et > 9) this.act();
        if (g.boom < 0) { setGas({}); g.giant.scale.setScalar(.5 + Math.sin(t * 5) * .06 * seg(0, 8, et) + seg(4, 9, et) * .15); return g.s; }
        g.boom += dt; const te = g.boom, R = .2 + te * .42;
        setGas({ uSNI: 5 * Math.exp(-te / 3) + .4, uShockR: R, uShockI: ease(seg(0, .6, te)) * (1 - seg(7, 10, te)), uK: .12 * ease(seg(3, 10, te)) });
        g.giant.visible = false; g.flash.material.opacity = Math.max(.35 * seg(0, 3, te), Math.exp(-te * .9)); g.flash.scale.setScalar(te < 3 ? .3 + 5 * Math.exp(-te * .8) * seg(0, .25, te) + .35 : .65);
        g.bubble.visible = te < 13; g.bubble.scale.setScalar(R); g.bubble.material.uniforms.op.value = clamp(1.5 - te * .115, 0, 1) * 1.4; g.bubble.material.uniforms.time.value += dt;
        return g.s; },
      hud(ctx) { const g = S.gas, u = gas.u; if (g.boom < 0) label(ctx, u.uSN.value, 'This old star is about to blow!', GOLD, INK, 12, -30); else { if (g.boom < 9) label(ctx, u.uSN.value.clone().add(V3(.2 + g.boom * .42, 0, 0)), 'Blast wave', 'rgba(89,224,232,.92)', '#062A2E', 12); if (g.boom > 9) hudPill(ctx, 'Squeezed! Now gravity starts pulling the cloud together.', W / 2, bottom() - 4, GOLD, INK, W < 600 ? 11 : 13); else if (g.boom > 3) label(ctx, u.uSN.value, 'What is left of the star', 'rgba(13,20,52,.85)', '#C9D0F2', 11, -22); } } },
    { id: 'fall', name: 'Falling and spinning', when: 'The cloud falls in', sub: 'It takes about 100,000 years', line: 'b_collapse', gas: true,
      start() { gasScene(); const g = S.gas; g.spin = 0; g.giant.visible = false; g.bubble.visible = false; g.flash.material.opacity = 0; view({ dist: 2.7, yaw: .5, pitch: .34, min: 1.2, max: 6 }); },
      tick(dt) { const g = S.gas, k = .12 + .88 * ease(seg(1, 25, et)); this.k = k; gas.u.time.value += dt; g.spin += dt * (.1 + 1.6 * k * k);
        setGas({ uK: k, uSpin: g.spin, uDisk: ease(seg(.35, .95, k)), uEnv: lerp(1, .8, k), uStar: .42 * ease(seg(.5, 1, k)), starCol: [1, .34, .14], far: lerp(1, .2, k), uHa: lerp(.3, .03, k) }); return g.s; },
      hud(ctx) { const k = this.k || 0, T0 = top() + 66, w = Math.min(210, W - 32); panel(ctx, 16, T0, w, 74); hudText(ctx, 'Spinning', 28, T0 + 18, 12, '#C9D0F2', 'left', 600); bar(ctx, 28, T0 + 24, w - 24, .08 + k * k * .92, '#59E0E8'); hudText(ctx, 'Squeezed together', 28, T0 + 50, 12, '#C9D0F2', 'left', 600); bar(ctx, 28, T0 + 56, w - 24, k, '#FFB52E');
        if (k > .75) label(ctx, V3(0, .12, 0), 'A hot ball is growing here', GOLD, INK, 12, -26); if (k > .55) label(ctx, V3(.5, 0, .25), 'A spinning disk', 'rgba(13,20,52,.85)', '#F3F1FF', 11); } },
    { id: 'sun', name: 'The Sun is born', when: 'A baby star', sub: 'It glows for millions of years, then truly lights up', line: 'b_sun', gas: true,
      start() { gasScene(); const g = S.gas; g.spin = 17; g.giant.visible = false; g.bubble.visible = false; g.flash.material.opacity = 0; this.lit = false; this.up = false; view({ dist: 2.6, yaw: .5, pitch: .22, min: 1.1, max: 6 }); },
      tick(dt) { const g = S.gas, a = ease(seg(0, 10, et)), b = ease(seg(15, 21, et)); gas.u.time.value += dt; g.spin += dt * 1.1;
        if (et >= 15 && !this.lit) { this.lit = true; Sfx.chime(); }
        this.temp = et < 15 ? 1 + 9 * Math.pow(et / 15, 1.3) : lerp(10, 15, b);
        if (et > 17 && !this.up) { this.up = true; ctl.goalPitch = Math.max(ctl.goalPitch, .46); }      // rise to look down on the new disk
        setGas({ uK: 1, uSpin: g.spin, uDisk: 1, far: .2, uHa: .03, uStar: lerp(.42, 1, a) + .45 * b + (et > 15 ? 1.6 * Math.exp(-(et - 15) * 1.4) : 0), starCol: mix3(mix3([1, .34, .14], [1, .6, .3], a), [1, .93, .76], b),
          uJet: a * (1 - ease(seg(15, 18.5, et))), uCav: .75 * a, uEnv: lerp(.8, .62, a) * (1 - ease(seg(15.5, 23, et))) }); return g.s; },
      hud(ctx) { const T0 = top() + 66, w = Math.min(230, W - 32), tp = this.temp || 1; panel(ctx, 16, T0, w, 50); hudText(ctx, `Centre: about ${tp < 10 ? tp.toFixed(1) : Math.round(tp)} million °C`, 28, T0 + 19, 13, tp >= 10 ? '#FFB52E' : '#F3F1FF', 'left'); bar(ctx, 28, T0 + 28, w - 24, tp / 15, tp >= 10 ? '#FFB52E' : '#FF6D8A');
        const mx = 28 + (w - 24) * 10 / 15; ctx.fillStyle = '#F3F1FF'; ctx.fillRect(mx - 1, T0 + 24, 2, 16); hudText(ctx, 'fusion', mx, T0 + 47, 9, '#C9D0F2', 'center', 600);
        if (et > 3 && et < 17) { label(ctx, V3(0, .78, 0), 'Jets of gas', 'rgba(89,224,232,.92)', '#062A2E', 11); label(ctx, V3(.55, 0, .2), 'Dusty disk', 'rgba(13,20,52,.85)', '#F3F1FF', 11); }
        if (this.lit) hudPill(ctx, 'It makes its own light now. Our Sun is a real star!', W / 2, bottom() - 4, GOLD, INK, W < 600 ? 11 : 13); } },
    { id: 'dust', name: 'Dust to mini planets', when: 'Sticking together', sub: 'The first few million years', line: 'b_dust',
      start() { dustScene(); view({ dist: 4, yaw: .28, pitch: .12, min: 2, max: 60, goal: S.dust.CL[0].p }); ctl.snap(); },
      tick(dt) {
        const d = S.dust, u = seg(0, 36, et); this.u = u;
        const g = ease(seg(.03, .3, u)); for (let i = 0; i < d.pos.length; i++) d.pos[i] = d.a0[i] + (d.a1[i] - d.a0[i]) * g;
        d.dust.geometry.attributes.position.needsUpdate = true; d.dust.material.opacity = .9 * (1 - seg(.29, .4, u)); d.dust.visible = u < .41;
        const pe = .11 * ease(seg(.25, .37, u));
        d.CL.forEach((c, i) => { const m = c.stay ? 0 : ease(seg(.42 + c.d, .54 + c.d, u)), P = d.PA[c.to].p; d.v.copy(c.p).lerp(P, m); c.rot.x += dt * c.sp; c.rot.y += dt * c.sp * .7; d.q.setFromEuler(c.rot); d.sc.setScalar(Math.max(1e-4, pe * c.sz * (1 - m * m))); d.m4.compose(d.v, d.q, d.sc); d.peb.setMatrixAt(i, d.m4); });
        d.peb.instanceMatrix.needsUpdate = true;
        const bo = ease(seg(.4, .64, u));
        d.PA.forEach((a, i) => { const m = ease(seg(.68 + a.d, .82 + a.d, u)), P = d.PL[a.to]; d.v.copy(a.p).lerp(P, m); a.rot.x += dt * a.sp; a.rot.z += dt * a.sp * .6; d.q.setFromEuler(a.rot); d.sc.setScalar(Math.max(1e-4, (.06 + .44 * bo) * a.sz * (1 - m * m) * seg(.38, .43, u))); d.m4.compose(d.v, d.q, d.sc); d.bou.setMatrixAt(i, d.m4); });
        d.bou.instanceMatrix.needsUpdate = true;
        const bg = ease(seg(.66, .92, u)); d.big.forEach(m => { m.scale.setScalar(Math.max(1e-4, m.userData.sz * bg)); m.visible = bg > .001; m.rotateOnAxis(m.userData.ax, dt * m.userData.sp); });
        d.grp.rotation.y += dt * .012; d.s.fog.density = lerp(.03, .006, ease(seg(.3, .9, u))); d.bg.material.uniforms.haze.value = lerp(1, .55, seg(.4, 1, u));
        if (u < 1) { ctl.goalDist = (u < .3 ? lerp(4, 6.5, u / .3) : u < .62 ? lerp(6.5, 16, ease((u - .3) / .32)) : lerp(16, 33, ease((u - .62) / .38))) * (H > W ? 1.5 : 1); ctl.goal.lerp(u < .25 ? d.CL[0].p : V3(), dt * .8); ctl.max = 80; }
        return d.s; },
      hud(ctx) { const u = this.u || 0, T0 = top() + 66, steps = [['Dust', 'finer than flour'], ['Pebbles', 'like gravel'], ['Boulders', 'big as a house'], ['Mini planets', 'many km wide']], at = u < .3 ? 0 : u < .46 ? 1 : u < .68 ? 2 : 3, w = Math.min(190, W - 32);
        panel(ctx, 16, T0, w, 22 * 4 + 12); steps.forEach(([a, b], i) => { const y = T0 + 22 + i * 22; if (i === at) { ctx.fillStyle = GOLD; roundRect(ctx, 22, y - 15, w - 12, 20, 8); ctx.fill(); } hudText(ctx, a, 30, y, 12, i === at ? INK : i < at ? '#6FEA95' : '#8E99C8', 'left'); hudText(ctx, b, 16 + w - 10, y, 10, i === at ? INK : '#8E99C8', 'right', 600); });
        hudPill(ctx, ['Tiny grains bump and stick, like dust bunnies under a bed', 'The clumps squash into pebbles', 'Pebbles gather into boulders', 'Gravity pulls boulders into mini planets (planetesimals)'][at], W / 2, bottom() - 4, 'rgba(13,20,52,.88)', '#F3F1FF', W < 600 ? 10 : 12); } },
    { id: 'snow', name: 'Rocky or giant?', when: 'The snow line', sub: 'Within about 3 million years, the giants grow', line: 'b_snow',
      start() { diskScene(); view({ dist: 80, yaw: .5, pitch: .68, min: 14, max: 170, tall: .8 }); },
      tick(dt) { const u = seg(0, 28, et); this.u = u; return diskTick(dt, p => ease(seg(p.grow, p.grow + .34, u)), -10, 0, 0); },
      hud(ctx) { const u = this.u || 0, d = S.disk;
        label(ctx, V3(SNOW * .72, 0, SNOW * .72), 'Snow line', 'rgba(168,220,255,.95)', '#06202E', 12, -8);
        d.planets.forEach(m => { const q = m.userData; if (q.name && ease(seg(q.grow, q.grow + .34, u)) > .35) label(ctx, m.position.clone().add(V3(0, q.size + .6, 0)), q.name + (q.name === 'Jupiter' && u < .7 ? ' grew first' : ''), 'rgba(13,20,52,.85)', '#F3F1FF', 11, -8); });
        if (u > .45) label(ctx, V3(-4.5, 0, -3.2), 'Small rocky worlds', 'rgba(13,20,52,.85)', '#FFD9A8', 11, -14);
        const y = bottom() - 4, sm = W < 600 ? 10 : 12;
        if (W < 600) { hudPill(ctx, 'Outside the line: ice too, so giants grow', W / 2, y, 'rgba(168,220,255,.92)', '#06202E', sm); hudPill(ctx, 'Inside the line: only rock and metal', W / 2, y - 26, 'rgba(255,181,46,.92)', INK, sm); }
        else { hudPill(ctx, 'Inside the line: too hot for ice. Only rock and metal can clump.', W * .28, y, 'rgba(255,181,46,.92)', INK, sm); hudPill(ctx, 'Outside the line: ice too, so planets grow huge and grab gas.', W * .72, y, 'rgba(168,220,255,.92)', '#06202E', sm); } } },
    { id: 'wind', name: "The Sun's wind", when: 'The gas is blown away', sub: 'After about 5 to 10 million years', line: 'b_wind',
      start() { diskScene(); view({ dist: 80, yaw: .5, pitch: .68, min: 14, max: 170, tall: .8 }); },
      tick(dt) { const c = lerp(-6, 56, ease(seg(3, 24, et))); this.c = c; return diskTick(dt, () => 1, c, ease(seg(1, 4, et)) * (1 - ease(seg(22, 28, et))), ease(seg(14, 26, et))); },
      hud(ctx) { const left = Math.round(100 * (1 - seg(0, 48, this.c ?? -6))), T0 = top() + 66, w = Math.min(200, W - 32); panel(ctx, 16, T0, w, 44); hudText(ctx, `Gas left in the disk: ${left}%`, 28, T0 + 18, 13, '#F3F1FF', 'left'); bar(ctx, 28, T0 + 26, w - 24, left / 100, '#59E0E8');
        if (left < 35) { label(ctx, V3(7.2, 0, 7.2), 'Leftover rocks', 'rgba(13,20,52,.85)', '#E8D4B8', 11, -10); label(ctx, V3(29, 0, 29), 'Leftover ice', 'rgba(13,20,52,.85)', '#CFE0FF', 11, -10); }
        hudPill(ctx, left > 2 ? "The young Sun's wind sweeps the gas away, like blowing dust off a table" : 'All clear! The giant planets cannot grow any more.', W / 2, bottom() - 4, left > 2 ? 'rgba(13,20,52,.88)' : GOLD, left > 2 ? '#F3F1FF' : INK, W < 600 ? 10 : 12); } },
    { id: 'crash', name: 'Crashing worlds', when: 'Building the rocky planets', sub: '10 to 100 million years', line: 'b_crash', action: { id: 'again2', label: 'Crash again' },
      start() { crashScene(); const c = S.crash; c.bodies.forEach(b => { const q = b.userData; q.size = q.size0; q.rad = q.rad0; q.a = q.a0; q.gone = false; q.heat = .35; b.visible = true; }); c.left = c.bodies.length; c.hits = 0; c.moon.visible = false; c.sparks.list.length = 0; c.flash.material.opacity = 0; view({ dist: 56, yaw: .3, pitch: .9, min: 12, max: 140, tall: .8 }); },
      act() { go(cur, false); },
      tick(dt) {
        const c = S.crash, u = seg(0, 34, et); this.u = u; c.sun.spin.rotation.y += dt * .05;
        const om = rad => 2.1 / Math.pow(rad, 1.5) * 6;
        for (const b of c.bodies) { const q = b.userData; if (q.win) q.a += dt * om(q.rad); }
        for (const b of c.bodies) {
          const q = b.userData; if (q.gone) continue;
          if (q.into) {
            const w = q.into.userData, lead = .13, k = seg(q.at - lead, q.at, u);
            if (k <= 0) { q.a += dt * om(q.rad); q.dA = Math.atan2(Math.sin(q.a - w.a), Math.cos(q.a - w.a)); q.rad1 = q.rad; }
            else { const e = ease(k); q.a = w.a + q.dA * (1 - e); q.rad = lerp(q.rad1, w.rad, e); }
            if (u >= q.at) {   // crash!
              q.gone = true; b.visible = false; c.left--; c.hits++; w.size = Math.cbrt(w.size ** 3 + q.size ** 3); w.heat = 1.9; Sfx.boop();
              c.flash.position.copy(q.into.position); c.flashT = 0; c.flashS = 4 + w.size * 5;
              const tx = -Math.sin(w.a), tz = -Math.cos(w.a); for (let i = 0; i < 110; i++) c.sparks.emit(q.into.position.x, q.into.position.y, q.into.position.z, tx * om(w.rad) * w.rad + rnd(-3, 3), rnd(-1.6, 1.6), tz * om(w.rad) * w.rad + rnd(-3, 3), rnd(1, 3.2));
              if (q.moon) { c.moon.visible = true; c.moonA = 0; }
            }
          }
          q.heat = Math.max(q.win ? .22 : .35, q.heat - dt * .28); b.material.emissiveIntensity = q.heat;
          const sz = q.win && u > .9 ? lerp(q.size, q.final, seg(.9, 1, u)) : q.size; b.scale.setScalar(sz); b.position.set(Math.cos(q.a) * q.rad, 0, -Math.sin(q.a) * q.rad); b.rotation.y += dt * .5;
        }
        c.flashT += dt; c.flash.material.opacity = Math.max(0, 1 - c.flashT * 1.3); c.flash.scale.setScalar((c.flashS || 5) * (.5 + c.flashT * 1.6));
        c.sparks.step(dt, 0, .25);
        if (c.moon.visible) { const e = c.bodies.find(b => b.userData.name === 'Earth'); c.moonA += dt * 1.6; c.moon.position.copy(e.position).add(V3(Math.cos(c.moonA) * 3.1, .3, Math.sin(c.moonA) * 3.1)); }
        return c.s; },
      hud(ctx) { const c = S.crash, T0 = top() + 66, w = Math.min(200, W - 32); panel(ctx, 16, T0, w, 50); hudText(ctx, `Baby planets left: ${c.left}`, 28, T0 + 20, 14, '#FFB52E', 'left'); hudText(ctx, `Crashes so far: ${c.hits}`, 28, T0 + 40, 12, '#F3F1FF', 'left', 600);
        if (c.left <= 4) c.bodies.forEach(b => { if (b.userData.win) label(ctx, b.position.clone().add(V3(0, b.userData.size + .5, 0)), b.userData.name, 'rgba(13,20,52,.85)', '#F3F1FF', 12, -8); });
        if (c.moon.visible) label(ctx, c.moon.position, 'This crash made our Moon!', GOLD, INK, 12, -26); } },
    { id: 'shuffle', name: 'The big shuffle', when: 'The giants move', sub: 'Scientists think this came next. The timing is still debated.', line: 'b_shuffle',
      start() { shuffleScene(); S.shuffle.fl = 0; view({ dist: 150, yaw: 0, pitch: 1.02, min: 20, max: 330, tall: .75 }); },
      tick(dt) {
        const m = S.shuffle, u = seg(0, 34, et), k = ease(seg(.2, .78, u)); this.u = u; m.t = (m.t || 0) + dt;
        m.giants.forEach((g, i) => { const wob = i > 1 ? Math.sin(seg(.2, .78, u) * PI) * Math.sin(m.t * .8 + i) * 2.2 : 0, rr = (lerp(g.r0, g.r1, k) + wob) * AU; g.a += dt * 3.2 / Math.pow(rr / AU, 1.5); g.m.position.set(Math.cos(g.a) * rr, 0, -Math.sin(g.a) * rr); g.m.rotation.y += dt * .4; g.line.scale.setScalar(lerp(g.r0, g.r1, k) * AU); g.rr = rr; });
        m.inner.forEach(p => { p.a += dt * 3.2 / Math.pow(p.d, 1.5) * .12; p.m.position.set(Math.cos(p.a) * p.d * AU, 0, -Math.sin(p.a) * p.d * AU); });
        const pos = m.pos, col = m.col;
        for (let i = 0; i < m.P.length; i++) {
          const p = m.P[i]; let rr = p.r0, y = p.y, al = p.b, a = p.a + m.t * 3.2 / Math.pow(p.r0, 1.5), ice = 1;
          if (u > p.us) {
            const tau = (u - p.us) / .22;
            if (p.fate === 0) { const c = Math.min(tau, 1); rr = p.q + (p.r0 - p.q) * Math.pow(Math.abs(Math.cos(PI * c)), 1.4) * (c > .5 ? 1.5 : 1); a += Math.sin(PI * c * .5) * 3.4; al = p.b * 1.5 * (1 - seg(.8, 1.15, tau)); ice = .5; }       // falls inward: a comet
            else if (p.fate === 1) { const c = ease(Math.min(tau, 1)); rr = lerp(p.r0, p.rk, c); y = lerp(p.y, p.inc, c); a = p.a + m.t * 3.2 / Math.pow(lerp(p.r0, p.rk, c), 1.5); }                                                        // settles in the Kuiper belt
            else { rr = p.r0 + tau * tau * 55; y = p.y + tau * p.inc * 4; al = p.b * (1 - seg(.5, 1.4, tau)); }                                                                                                               // flung far away
          }
          pos[i * 3] = Math.cos(a) * rr * AU; pos[i * 3 + 1] = y; pos[i * 3 + 2] = -Math.sin(a) * rr * AU; col[i * 3] = al * lerp(1, .62, ice); col[i * 3 + 1] = al * lerp(.92, .76, ice); col[i * 3 + 2] = al * lerp(.7, 1, ice);
        }
        m.pts.geometry.attributes.position.needsUpdate = true; m.pts.geometry.attributes.color.needsUpdate = true;
        m.ast.material.opacity = lerp(.9, .35, k); m.ast.rotation.y += dt * .02;
        // comets hitting the inner planets
        if (u > .3 && u < .86 && Math.random() < dt * 2.2) { const f = m.flashes[(m.fl = (m.fl + 1) % 4)]; f.position.copy(m.inner[Math.random() * 4 | 0].m.position); f.userData.t = 0; }
        m.flashes.forEach(f => { f.userData.t = (f.userData.t ?? 9) + dt; f.material.opacity = Math.max(0, 1 - f.userData.t * 2); f.scale.setScalar(1 + f.userData.t * 5); });
        return m.s; },
      hud(ctx) { const m = S.shuffle, u = this.u || 0;
        m.giants.forEach(g => label(ctx, g.m.position.clone().add(V3(0, 2.4, 0)), g.name, 'rgba(13,20,52,.85)', '#F3F1FF', 11, -8));
        label(ctx, V3(0, 0, 3.4), 'Rocky planets', 'rgba(13,20,52,.85)', '#FFD9A8', 10, 16);
        if (u > .8) label(ctx, V3(40 * AU * .7, 0, 40 * AU * .7), 'Kuiper belt', 'rgba(13,20,52,.85)', '#CFE0FF', 11);
        const T0 = top() + 66, w = Math.min(232, W - 32); panel(ctx, 16, T0, w, 66); const row = (y, c, s) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(30, T0 + y - 4, 4, 0, TAU); ctx.fill(); hudText(ctx, s, 42, T0 + y, 11, '#F3F1FF', 'left', 600); };
        row(18, '#FFE9B4', 'Fell inward: comets, craters'); row(38, '#A8C4FF', 'Stayed near: the Kuiper belt'); row(58, '#7C88B8', 'Flung far away: the Oort cloud');
        hudPill(ctx, u < .2 ? 'The four giants start close together, with icy leftovers beyond them' : u < .8 ? 'Jupiter and Saturn tug on each other. Uranus and Neptune are pushed outward!' : 'The giants settle where they are today', W / 2, bottom() - 4, 'rgba(13,20,52,.88)', '#F3F1FF', W < 600 ? 10 : 12); } },
    { id: 'today', name: 'Today', when: 'Our solar system today', sub: '4.6 billion years later', line: 'b_today', action: { id: 'explore', label: 'Explore it now' },
      start() { todayScene(); view({ dist: 200, yaw: .35, pitch: .58, min: 30, max: 500, tall: .8, auto: .02 }); },
      act() { Sfx.whoosh(); show('explore'); },
      tick(dt) { const n = S.today, zero = V3(); for (const id in n.P) { const p = n.P[id]; if (id !== 'sun') { p.userData.a += dt * TAU / (Math.pow(BODIES[id].period, .6) * 24); p.position.set(Math.cos(p.userData.a) * ORB[id], 0, -Math.sin(p.userData.a) * ORB[id]); } p.spin.rotation.y += dt * .3; E3.lightPlanet(p, zero); } n.belts.forEach((b, i) => { b.rotation.y += dt * (i ? .002 : .012); }); return n.s; },
      hud(ctx) { const n = S.today; for (const id in n.P) label(ctx, n.P[id].position.clone().add(V3(0, RAD[id] + 2, 0)), BODIES[id].name, 'rgba(5,8,23,.6)', id === 'earth' ? '#FFB52E' : '#C9D0F2', 11, -6);
        label(ctx, V3(33, 0, 33), 'Asteroid belt', 'rgba(5,8,23,.6)', '#E8D4B8', 10); label(ctx, V3(-74, 0, 74), 'Kuiper belt', 'rgba(5,8,23,.6)', '#CFE0FF', 10); } }
  ];

  /* ================================================================ the story controls */
  function setAction(a) { const b = $('#birthAct'); b.hidden = !a; if (a) { b.querySelector('span').textContent = a.label; b.dataset.id = a.id; } }
  function go(i, talk = true) {
    cur = clamp(i, 0, CH.length - 1); et = 0;
    const was = go.last, ch = CH[cur]; ch.start(); setAction(ch.action || null);
    if (!(was && was.gas && ch.gas)) ctl.snap();    // glide between the gas chapters, jump for the others
    go.last = ch;
    $$('#birthSteps .emode').forEach((b, k) => b.setAttribute('aria-pressed', k === cur ? 'true' : 'false'));
    $(`#birthSteps [data-i="${cur}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    $('#birthPrev').disabled = cur === 0; $('#birthNext').disabled = cur === CH.length - 1;
    if (talk) { Sfx.whoosh(); Voice.say(ch.line); }
  }
  function init() {
    ready = true; r = E3.attach(ov); E3.mats(r); gas = GAS.create();
    cam = new T.PerspectiveCamera(45, 1, .05, 30000);
    ctl = new E3.Orbit(cam, ov, { dist: 3, pitch: .2, yaw: .5, min: 1, max: 600 }); ctl.snap();
    $('#birthSteps').innerHTML = CH.map((c, i) => `<button type="button" class="emode" data-i="${i}" aria-pressed="false">${i + 1}. ${c.name}</button>`).join('');
    $$('#birthSteps .emode').forEach(b => b.addEventListener('click', () => go(+b.dataset.i)));
    $('#birthPrev').addEventListener('click', () => go(cur - 1)); $('#birthNext').addEventListener('click', () => go(cur + 1)); $('#birthAgain').addEventListener('click', () => go(cur));
    $('#birthAct').addEventListener('click', () => { Sfx.tap(); CH[cur].act?.(); });
    layout();
  }
  function layout() { if (!ready) return; E3.attach(ov); const f = fitCanvas(ov); W = f.w; H = f.h; E3.fit(r, cam); }
  function frame(dt) {
    if (!ready) init();
    t += dt; et += dt;
    const ch = CH[cur], sc = ch.tick(dt);
    E3.fit(r, cam); ctl.update(dt);
    if (ch.gas) gas.render(r, cam, W, H, W < 760 ? 110000 : 170000);
    r.render(sc, cam);
    const ctx = ov.getContext('2d'), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    ch.hud?.(ctx);
    // the story clock: where this chapter sits, and when it happened
    const T0 = top(), pw = Math.min(380, W - 32), px = (W - pw) / 2; panel(ctx, px, T0, pw, 56);
    hudText(ctx, `${cur + 1}. ${ch.when}`, W / 2, T0 + 20, 15, '#FFB52E'); hudText(ctx, ch.sub, W / 2, T0 + 36, W < 600 ? 9.5 : 11, '#C9D0F2', 'center', 600);
    for (let i = 0; i < CH.length; i++) { const x = px + 18 + i * (pw - 36) / (CH.length - 1); ctx.fillStyle = i === cur ? '#FFB52E' : i < cur ? '#59E0E8' : '#2B3A7A'; ctx.beginPath(); ctx.arc(x, T0 + 47, i === cur ? 4.5 : 3, 0, TAU); ctx.fill(); }
  }
  return {
    frame, layout,
    enter(quiet) {
      if (!ready) init();
      E3.attach(ov); layout();
      if (!started) { started = true; go(0, false); Voice.say('b_intro', () => { if (current === 'birth' && cur === 0 && !Voice.busy) Voice.say(CH[0].line); }); }
      else { CH[cur].start(); if (!quiet) Voice.say(CH[cur].line); }
    },
    leave() { if (ctl) ctl.auto = 0; },
    // for testing: jump to a chapter and run its clock forward without drawing
    seek(i, sec = 0) { if (!ready) init(); go(i, false); this.skip(sec); },
    skip(sec) { for (let k = 0; k < sec / .05; k++) { et += .05; t += .05; CH[cur].tick(.05); } }
  };
})();
