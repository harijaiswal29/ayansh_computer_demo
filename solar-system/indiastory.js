/* India's story: how India broke away from a giant southern land, crossed an ocean, and crashed into Asia to raise the Himalayas.
   Three kinds of scene:
   - a globe where the real satellite map is cut into plates and each plate is turned back to where it was (a shader does this live),
   - the Deccan lava fields 66 million years ago, and the step-shaped hills they left behind,
   - a 3D relief model of India built from real height data, where the Himalayas rise and the rivers build the plains. */
'use strict';
views.indiastory = (() => {
  const T = THREE, ov = $('#indiaCv'), V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  ov.classList.add('over2d');
  let r, cam, ctl, ready = false, W = 0, H = 0, t = 0, cur = 0, et = 0, started = false, noise = null;
  const ease = x => x * x * (3 - 2 * x), seg = (a, b, x) => clamp((x - a) / (b - a), 0, 1), rnd = (a, b) => a + Math.random() * (b - a);
  const proj = v => E3.toScreen(v, cam, W, H);
  const GOLD = 'rgba(255,181,46,.93)', INK = '#2A1600', DARK = 'rgba(13,20,52,.86)';
  const label = (ctx, v, s, bg = DARK, fg = '#F3F1FF', size = 12, dy = 0) => { const p = proj(v); if (p.front && p.x > 20 && p.x < W - 20 && p.y > 20 && p.y < H - 20) { hudPill(ctx, s, p.x, p.y + dy, bg, fg, size); return p; } return null; };
  const top = () => ($('#view-indiastory .over.top').offsetHeight || 44) + 14, bottom = () => H - ($('#indiaCtl').offsetHeight || 44) - 16;
  const panel = (ctx, x, y, w, h) => { ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, x, y, w, h, 12); ctx.fill(); };
  const bar = (ctx, x, y, w, v, col) => { ctx.fillStyle = '#16215A'; roundRect(ctx, x, y, w, 8, 4); ctx.fill(); ctx.fillStyle = col; roundRect(ctx, x, y, Math.max(8, w * clamp(v, 0, 1)), 8, 4); ctx.fill(); };
  function view(o) {
    let dist = o.dist; if (H > W && W) dist *= Math.min(1.9, H / W * (o.tall ?? .9));
    ctl.follow = null; ctl.quat = null; ctl.goal.copy(o.goal || V3()); ctl.goalDist = dist; ctl.min = o.min ?? dist * .3; ctl.max = o.max ?? dist * 3;
    ctl.goalYaw = o.yaw ?? ctl.goalYaw; ctl.goalPitch = o.pitch ?? ctl.goalPitch; ctl.minPitch = o.minPitch ?? -1.4; ctl.maxPitch = o.maxPitch ?? 1.4; ctl.auto = o.auto || 0;
    ctl.retarget();
  }
  const S = {};

  /* ================================================================ the drifting globe */
  // each plate: name, outlines that separate it from its neighbours (lon, lat), the turn that puts it back in Gondwana (fitted so the coasts match),
  // and how far it has moved from there by each age: [million years ago, share of the way to today]
  const PLATES = [
    ['Africa', [[[-20, 36], [-6, 36.5], [10, 38], [33, 32], [35, 36], [44, 38], [48, 30], [57, 27], [60, 22], [60, 12], [52, -5], [52, -28], [30, -38], [15, -36], [-20, 10]]], [0, 0, 0, 1], [[200, 1], [0, 1]], [20, 4]],
    ['South America', [[[-82, 13], [-77, 7.5], [-60, 12], [-50, 5], [-33, -5], [-38, -25], [-62, -57], [-78, -57], [-84, -5]]], [0.30591, 0.339, 0.15956, 0.87524], [[200, 0], [135, 0], [110, .25], [84, .5], [50, .75], [0, 1]], [-58, -12]],
    ['North America', [[[-170, 72], [-140, 75], [-95, 84], [-10, 84], [-10, 72], [-40, 58], [-52, 47], [-66, 40], [-77, 25], [-80, 9], [-77, 7], [-92, 13], [-118, 28], [-130, 45], [-170, 52]]], [0.18451, 0.55163, 0.01452, 0.8133], [[200, 0], [180, .03], [150, .2], [100, .5], [50, .8], [0, 1]], [-100, 45]],
    ['Asia', [[[-30, 72], [-25, 84], [180, 84], [180, -12], [120, -12], [100, -8], [92, 20], [97, 28], [88, 28], [80, 32], [75, 37], [67, 33], [61, 25], [57, 27], [48, 30], [44, 38], [35, 36], [33, 32], [10, 38], [-6, 36.5], [-12, 36], [-30, 45]]], [0.10841, 0.1045, 0.00392, 0.98859], [[200, 0], [180, .03], [130, .3], [66, .7], [0, 1]], [95, 44]],
    ['India', [[[61, 25], [67, 33], [75, 37], [80, 32], [88, 28], [97, 28], [92, 20], [82, 4], [75, 5], [66, 22]]], [-0.39355, -0.17827, 0.1336, 0.8919], [[200, 0], [88, 0], [75, .07], [66, .17], [60, .3], [55, .43], [50, .55], [40, .7], [30, .82], [15, .92], [0, 1]], [79, 20]],
    ['Antarctica', [[[-180, -60], [180, -60], [180, -90], [-180, -90]]], [0.3174, 0.00866, 0.156, 0.93533], [[200, 0], [132, 0], [110, .2], [84, .42], [50, .7], [34, .85], [0, 1]], [60, -76]],
    ['Australia', [[[112, -8], [155, -1], [156, -12], [155, -30], [150, -45], [112, -38]], [[165, -33], [179, -33], [179, -48], [165, -48]]], [0.10347, -0.11505, 0.27191, 0.9498], [[85, 0], [50, .3], [30, .62], [0, 1]], [134, -25]]
  ];
  const IN = 4, AN = 5, AU = 6, ASIA = 3, ONE = new T.Quaternion();
  const FIT = PLATES.map(p => new T.Quaternion(p[2][0], p[2][1], p[2][2], p[2][3]));
  const AU_ON_AN = FIT[AN].clone().invert().multiply(FIT[AU]);       // Australia stayed stuck to Antarctica until about 85 million years ago
  const keyed = (keys, age) => { if (age >= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (age >= keys[i][0]) return lerp(keys[i][1], keys[i - 1][1], (age - keys[i][0]) / (keys[i - 1][0] - keys[i][0])); return keys[keys.length - 1][1]; };
  function plateQ(k, age, out = new T.Quaternion()) {
    if (k === 0) return out.identity();
    if (k === AU) { if (age >= 85) return plateQ(AN, age, out).multiply(AU_ON_AN); return plateQ(AN, 85, out).multiply(AU_ON_AN).slerp(ONE, keyed(PLATES[AU][3], age)); }
    return out.copy(FIT[k]).slerp(ONE, keyed(PLATES[k][3], age));
  }
  // long ago everything, Africa too, sat further south: turn the whole globe to show that
  const SOUTH = [[200, 18], [130, 15], [88, 11], [66, 8], [50, 6], [30, 3.5], [0, 0]], AXIS = E3.latLonToVec(0, 110, 1);
  const worldQ = (age, out = new T.Quaternion()) => out.setFromAxisAngle(AXIS, keyed(SOUTH, age) * PI / 180);
  const GR = 10;
  // where a spot on a plate (today's lon, lat) was at a given age, as a point in the scene
  const spot = (k, lon, lat, age, rad = GR) => E3.latLonToVec(lat, lon, rad).applyQuaternion(plateQ(k, age)).applyQuaternion(worldQ(age));
  function inPoly(lo, la, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) c = !c; } return c; }
  const DRIFT_FS = `
    uniform sampler2D day, spec, plate, shelfA, shelfB, tileA, tileB, noiseTex; uniform mat3 inv[7]; uniform vec3 sunDir, camObj; uniform float rise, deccan, time, tiles, warm;
    varying vec3 vP;
    const vec3 LOW = vec3(0.35, 0.38, 0.21);
    // one plate: turn this spot back to where it is on today's map, and see whether that plate has land there
    vec4 plateCol(mat3 m, float kf, vec3 p, out float sh){
      vec3 q = m * p; float lon = atan(-q.z, q.x), lat = asin(clamp(q.y, -1.0, 1.0));
      float ua = lon / 6.2831853 + 0.5, ub = fract(ua + 0.5) - 0.5, v = lat / 3.14159265 + 0.5;
      vec2 uv = vec2(fwidth(ua) < fwidth(ub) - 0.0005 ? ua : ub, v);
      vec2 jit = (texture2D(noiseTex, vec2(ua * 6.0, v * 3.0)).rg - 0.5) * vec2(0.007, 0.01);
      float mine = 1.0 - step(9.0, abs(texture2D(plate, vec2(ua, v) + jit).r * 255.0 - (kf * 30.0 + 15.0)));
      float land = mine * (1.0 - smoothstep(0.3, 0.6, texture2D(spec, uv).r));
      vec4 sa = texture2D(shelfA, uv), sb = texture2D(shelfB, uv);                       // each plate's own soft-edged shallow sea
      sh = kf < 0.5 ? sa.r : (kf < 1.5 ? sa.g : (kf < 2.5 ? sa.b : (kf < 3.5 ? sa.a : (kf < 5.5 ? sb.g : sb.b))));
      vec3 c = texture2D(day, uv).rgb;
      if (kf == 5.0) c = mix(c, vec3(0.27, 0.36, 0.19) * (0.5 + 0.8 * dot(c, vec3(0.33))) * (0.8 + 0.4 * texture2D(noiseTex, vec2(ua * 2.4, v * 1.2)).g), warm * 0.9);   // Antarctica had forests, not ice
      if (kf == 3.0) {   // Asia: before the crash there were no Himalayas and no high, dry Tibet
        float lonD = lon * 57.29578, latD = lat * 57.29578;
        float box = smoothstep(66.0, 72.0, lonD) * (1.0 - smoothstep(100.0, 106.0, lonD)) * smoothstep(25.5, 28.5, latD) * (1.0 - smoothstep(37.0, 40.0, latD));
        c = mix(c, LOW * (0.75 + 0.6 * dot(c, vec3(0.33))), box * (1.0 - rise) * 0.85);
      }
      return vec4(c, land);
    }
    // India: sharper pictures, the lost land in front of it ("Greater India"), and the Deccan lava
    vec4 indiaCol(mat3 m, vec3 p, out float sh){
      vec3 q = m * p; float lon = atan(-q.z, q.x), lat = asin(clamp(q.y, -1.0, 1.0));
      float ua = lon / 6.2831853 + 0.5, v = lat / 3.14159265 + 0.5; vec2 uv = vec2(ua, v);
      vec2 jit = (texture2D(noiseTex, vec2(ua * 6.0, v * 3.0)).rg - 0.5) * vec2(0.007, 0.01);
      float mine = 1.0 - step(9.0, abs(texture2D(plate, uv + jit).r * 255.0 - 135.0));
      float land = mine * (1.0 - smoothstep(0.3, 0.6, texture2D(spec, uv).r));
      sh = texture2D(shelfB, uv).r;
      vec3 c = texture2D(day, uv).rgb;
      vec3 hi = mix(texture2D(tileA, vec2((ua - 0.5) * 4.0, (v - 0.5) * 2.0)).rgb, texture2D(tileB, vec2((ua - 0.75) * 4.0, (v - 0.5) * 2.0)).rgb, step(0.75, ua));
      c = mix(c, hi, tiles * step(0.5, ua) * step(0.5, v));
      float lonD = lon * 57.29578, latD = lat * 57.29578, n = texture2D(noiseTex, vec2(ua * 0.6, v * 0.3)).r, n3 = texture2D(noiseTex, vec2(ua * 2.6, v * 1.3)).g, n2 = texture2D(noiseTex, vec2(ua * 11.0 + time * 0.004, v * 5.5)).g;
      float nb = lonD < 75.0 ? mix(33.0, 37.0, clamp((lonD - 67.0) / 8.0, 0.0, 1.0)) : (lonD < 80.0 ? mix(37.0, 32.0, (lonD - 75.0) / 5.0) : mix(32.0, 28.0, clamp((lonD - 80.0) / 8.0, 0.0, 1.0)));   // India's northern edge today
      c = mix(c, LOW * (0.75 + 0.6 * dot(c, vec3(0.33))), smoothstep(nb - 5.5, nb - 2.0, latD) * (1.0 - rise) * 0.8);                 // no Himalayas yet
      float edgeN = nb + 14.0 + (n - 0.5) * 6.0 + (n3 - 0.5) * 2.0, wob = (n - 0.5) * 7.0 + (n3 - 0.5) * 2.5;
      float gr = smoothstep(65.5, 69.5, lonD + wob) * (1.0 - smoothstep(93.0, 97.5, lonD + wob)) * smoothstep(nb - 3.2, nb - 1.2, latD) * (1.0 - smoothstep(edgeN - 1.2, edgeN, latD));
      c = mix(c, mix(vec3(0.25, 0.34, 0.17), vec3(0.5, 0.45, 0.28), n * 0.6 + n3 * 0.4) * (0.85 + 0.3 * n3), gr * max(1.0 - land, 1.0 - rise));
      land = max(land, gr); sh = max(sh, gr);
      float dm = exp(-((lonD - 75.6) * (lonD - 75.6) / 16.0 + (latD - 19.6) * (latD - 19.6) / 13.0)) * deccan;                         // the lava fields
      c = mix(c, vec3(0.07, 0.055, 0.05), clamp(dm * 1.3, 0.0, 0.85)) + vec3(1.0, 0.36, 0.04) * pow(1.0 - abs(2.0 * n2 - 1.0), 5.0) * dm * 2.6;
      return vec4(c, land);
    }
    void main(){
      vec3 p = normalize(vP), col = vec3(0.0); float got = 0.0, shelf = 0.0, sh; vec4 c;
      c = plateCol(inv[0], 0.0, p, sh); col = mix(col, c.rgb, c.a * (1.0 - got)); got = max(got, c.a); shelf = max(shelf, sh);
      c = plateCol(inv[1], 1.0, p, sh); col = mix(col, c.rgb, c.a * (1.0 - got)); got = max(got, c.a); shelf = max(shelf, sh);
      c = plateCol(inv[2], 2.0, p, sh); col = mix(col, c.rgb, c.a * (1.0 - got)); got = max(got, c.a); shelf = max(shelf, sh);
      c = plateCol(inv[3], 3.0, p, sh); col = mix(col, c.rgb, c.a * (1.0 - got)); got = max(got, c.a); shelf = max(shelf, sh);
      c = indiaCol(inv[4], p, sh);      col = mix(col, c.rgb, c.a * (1.0 - got)); got = max(got, c.a); shelf = max(shelf, sh);
      c = plateCol(inv[5], 5.0, p, sh); col = mix(col, c.rgb, c.a * (1.0 - got)); got = max(got, c.a); shelf = max(shelf, sh);
      c = plateCol(inv[6], 6.0, p, sh); col = mix(col, c.rgb, c.a * (1.0 - got)); got = max(got, c.a); shelf = max(shelf, sh);
      float wn = texture2D(noiseTex, p.xy * 3.0 + p.z).r;
      vec3 sea = mix(vec3(0.018, 0.065, 0.19), vec3(0.06, 0.3, 0.44), smoothstep(0.04, 0.75, shelf) * 0.8) * (0.92 + 0.16 * wn);   // deep blue, lighter over the shallow edges
      col = mix(sea, col, got);
      float nl = dot(p, sunDir), lit = clamp(nl * 0.85 + 0.4, 0.07, 1.0);
      vec3 hv = normalize(normalize(camObj - p * 10.0) + sunDir);
      col = col * lit + vec3(1.0, 0.95, 0.85) * pow(max(dot(p, hv), 0.0), 110.0) * 0.22 * (1.0 - got) * step(0.0, nl);
      gl_FragColor = vec4(col, 1.0);
    }`;
  function globeScene() {
    if (S.globe) return S.globe;
    const s = new T.Scene(); s.add(E3.starfield(9000));
    const day = E3.tex('earth_day'), spec = E3.tex('earth_spec'), tA = E3.tex('earth8k_02'), tB = E3.tex('earth8k_03');
    for (const x of [day, spec]) { x.wrapS = T.RepeatWrapping; x.needsUpdate = !!x.image; x.ready.then(() => { x.wrapS = T.RepeatWrapping; x.needsUpdate = true; }); }
    // which plate each spot of today's map belongs to
    const PW = 512, PH = 256, pd = new Uint8Array(PW * PH * 4);
    for (let y = 0; y < PH; y++) { const la = -90 + (y + .5) / PH * 180; for (let x = 0; x < PW; x++) { const lo = (x + .5) / PW * 360 - 180, o = (y * PW + x) * 4; pd[o + 3] = 255; for (let k = 0; k < PLATES.length; k++) if (PLATES[k][1].some(P => inPoly(lo, la, P))) { pd[o] = k * 30 + 15; break; } } }
    const plate = new T.DataTexture(pd, PW, PH, T.RGBAFormat); plate.magFilter = plate.minFilter = T.NearestFilter; plate.generateMipmaps = false; plate.needsUpdate = true;
    // the pale shallow sea round every coast: the land shapes, blurred, and cut softly to each plate's own patch of the map
    const SW = 256, SH = 128, mk = () => { const x = new T.DataTexture(new Uint8Array(SW * SH * 4), SW, SH, T.RGBAFormat); x.wrapS = T.RepeatWrapping; x.magFilter = x.minFilter = T.LinearFilter; x.generateMipmaps = false; x.needsUpdate = true; return x; }, shelfA = mk(), shelfB = mk();
    const blur = (a, rad) => { const o = new Float32Array(a.length); for (let pass = 0; pass < 2; pass++) { for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { let t2 = 0; for (let d = -rad; d <= rad; d++) t2 += a[y * SW + ((x + d + SW) % SW)]; o[y * SW + x] = t2 / (rad * 2 + 1); } for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { let t2 = 0; for (let d = -rad; d <= rad; d++) t2 += o[clamp(y + d, 0, SH - 1) * SW + x]; a[y * SW + x] = t2 / (rad * 2 + 1); } } return a; };
    spec.ready.then(() => { if (!spec.image) return; const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; const g = cv.getContext('2d'); g.drawImage(spec.image, 0, 0, SW, SH); const px = g.getImageData(0, 0, SW, SH).data;
      const land = new Float32Array(SW * SH); for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) land[y * SW + x] = px[((SH - 1 - y) * SW + x) * 4] < 128 ? 1 : 0;   // row 0 is the south pole
      blur(land, 3);
      for (let k = 0; k < PLATES.length; k++) { const m = new Float32Array(SW * SH); for (let y = 0; y < SH; y++) { const la = -90 + (y + .5) / SH * 180; for (let x = 0; x < SW; x++) if (PLATES[k][1].some(P => inPoly((x + .5) / SW * 360 - 180, la, P))) m[y * SW + x] = 1; }
        blur(m, 2); const tx = k < 4 ? shelfA : shelfB, ch = k < 4 ? k : k - 4, d = tx.image.data; for (let i = 0; i < SW * SH; i++) d[i * 4 + ch] = Math.min(255, m[i] * land[i] * 2.2 * 255); tx.needsUpdate = true; } });
    const u = { day: { value: day }, spec: { value: spec }, plate: { value: plate }, shelfA: { value: shelfA }, shelfB: { value: shelfB }, tileA: { value: tA }, tileB: { value: tB }, noiseTex: { value: noise }, inv: { value: PLATES.map(() => new T.Matrix3()) },
      sunDir: { value: V3(1, 0, 0) }, camObj: { value: V3() }, rise: { value: 0 }, deccan: { value: 0 }, time: { value: 0 }, tiles: { value: 0 }, warm: { value: 0 } };
    Promise.all([tA.ready, tB.ready]).then(() => { if (tA.image && tB.image) u.tiles.value = 1; });
    const grp = new T.Group(); s.add(grp);
    const ball = new T.Mesh(new T.SphereGeometry(GR, 160, 80), new T.ShaderMaterial({ uniforms: u, extensions: { derivatives: true }, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: DRIFT_FS })); grp.add(ball);
    const clouds = new T.Mesh(new T.SphereGeometry(GR * 1.012, 96, 48), new T.MeshBasicMaterial({ color: 0xffffff, alphaMap: E3.tex('earth_clouds'), transparent: true, opacity: .34, depthWrite: false })); grp.add(clouds);
    const atmo = E3.atmosphere(GR, 0x5aa0ff, 1, 1.035); s.add(atmo);
    return (S.globe = { s, u, grp, ball, clouds, atmo, age: -1, m4: new T.Matrix4(), q: new T.Quaternion(), qi: new T.Quaternion(), manual: false });
  }
  const INDIA_C = [79, 20];
  // set the globe to an age; follow: keep India (shifted a little) in the middle of the view unless the globe was just dragged
  function globeTick(dt, age, follow, o = {}) {
    const g = S.globe, u = g.u; g.age = age; u.time.value += dt; g.clouds.rotation.y += dt * .012;
    for (let k = 0; k < PLATES.length; k++) u.inv.value[k].setFromMatrix4(g.m4.makeRotationFromQuaternion(plateQ(k, age, g.q).invert()));
    worldQ(age, g.grp.quaternion); g.qi.copy(g.grp.quaternion).invert();
    u.rise.value = o.rise ?? 1 - seg(0, 48, age); u.warm.value = seg(28, 42, age); u.deccan.value = o.deccan ?? Math.exp(-Math.pow((age - 65.5) / 4, 2)) * (age < 70 ? 1 : .0);
    if (follow && performance.now() - (ctl.dragAt || 0) > 3500) {
      const p = spot(follow[0], follow[1], follow[2], age, 1); let yaw = Math.atan2(p.x, p.z) + (o.yaw || 0); const d = yaw - ctl.goalYaw; yaw -= Math.round(d / TAU) * TAU;
      const k = Math.min(1, dt * 1.5); ctl.goalYaw += (yaw - ctl.goalYaw) * k; ctl.goalPitch += (Math.asin(clamp(p.y, -1, 1)) + (o.pitch || 0) - ctl.goalPitch) * k;
    }
    return g.s;
  }
  // light the globe from over the viewer's left shoulder, wherever the camera is (called after the camera has moved)
  function globeLight() { const g = S.globe, d = cam.position.clone().normalize(), up = V3(0, 1, 0), side = V3().crossVectors(up, d).normalize(); const sun = d.clone().multiplyScalar(.84).addScaledVector(side, -.4).addScaledVector(up, .36).normalize();
    g.u.sunDir.value.copy(sun).applyQuaternion(g.qi); g.u.camObj.value.copy(cam.position).applyQuaternion(g.qi); if (g.atmo.material.uniforms && g.atmo.material.uniforms.sunDir) g.atmo.material.uniforms.sunDir.value.copy(sun); }
  const facing = v => v.clone().normalize().dot(cam.position.clone().normalize()) > .18;
  function plateLabels(ctx, age, names) { for (const [k, name, lon, lat, gold] of names) { const v = spot(k, lon, lat, age, GR * 1.03); if (facing(v)) label(ctx, v, name, gold ? GOLD : DARK, gold ? INK : '#F3F1FF', gold ? 13 : 11); } }
  const agoText = a => a < .5 ? 'Today' : `${Math.round(a)} million years ago`;
  // India's speed at an age, in centimetres a year (how far its middle moves across the globe)
  const speedAt = age => { const a = spot(IN, INDIA_C[0], INDIA_C[1], age + 1, 1), b = spot(IN, INDIA_C[0], INDIA_C[1], Math.max(0, age - 1), 1); return a.angleTo(b) * 6371 / (age < 1 ? 1 + age : 2) / 10; };

  /* ================================================================ the Deccan lava fields, then and now */
  function lavaScene() {
    if (S.lava) return S.lava;
    const N = NATURE, s = new T.Scene(); s.ticks = [];
    N.outdoor(s, { top: 0x2a2836, horizon: 0xc8763e, below: 0x3a2418, sun: V3(-.35, .2, -.9), sunColor: 0xff9a50, sunSize: 1.5, clouds: .82, cloudColor: 0x5c4a46, cloudShade: 0x151113, cloudScale: .4, near: 70, far: 620, hemiI: .55, skyLight: 0xffb890, groundLight: 0x261a14, sunLight: 0xffb070, sunI: .95, noEnv: true, shadowSpan: 60, shadowAt: V3(0, 0, -20) });
    s.ticks.push(dt => s.sky.tick(dt * 2));
    const ground = E3.terrain({ size: 900, seg: 180, amp: 7, freq: .006, seed: 77, flat: [[0, 0, 45]] });
    N.paintGround(ground, (x, y, z, sl, n, n2) => { const burnt = N.sm(-22, -75, z + (n - .5) * 40); const c = N.mixc(N.mixc(N.rgb(0x4c6c32), N.rgb(0x36522a), n2), N.rgb(0x1c1816), burnt); return [...c, Math.max(burnt, N.sm(.25, .45, sl))]; }, 'grass', 'rock', { repeat: 120 }); s.add(ground);
    // the lava: a glowing sheet that fills the low ground and creeps forward
    const lu = { time: { value: 0 }, front: { value: -96 }, noiseTex: { value: noise }, fogCol: { value: new T.Color(0xb86a3a) } };
    const lava = new T.Mesh(new T.PlaneGeometry(900, 480), new T.ShaderMaterial({ uniforms: lu,
      vertexShader: 'varying vec2 vXZ; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vXZ = w.xz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform float time, front; uniform sampler2D noiseTex; uniform vec3 fogCol; varying vec2 vXZ; varying float vD;
        float n(vec2 p){ return texture2D(noiseTex, p / 256.0).r; }
        float fb(vec2 p){ return 0.5 * n(p) + 0.25 * n(p * 2.03 + 7.0) + 0.125 * n(p * 4.01 + 13.0) + 0.0625 * n(p * 8.1 + 3.0); }
        void main(){
          if (vXZ.y > front + (n(vXZ * 0.06) - 0.5) * 46.0) discard;                       // the ragged front edge of the flow
          vec2 q = vXZ * 0.3 + vec2(0.0, -time * 0.22);
          float a = fb(q + fb(q * 0.6 + time * 0.02) * 3.0), crack = pow(1.0 - abs(2.0 * a - 1.0), 7.0);
          float heat = clamp(crack * 1.5 + 0.35 * smoothstep(0.52, 0.8, fb(q * 0.35 - time * 0.04)) + 0.9 * smoothstep(16.0, 0.0, front - vXZ.y), 0.0, 1.0);   // hottest in the cracks and at the front
          vec3 col = mix(vec3(0.05, 0.04, 0.04) + 0.05 * a, mix(vec3(1.0, 0.2, 0.01), vec3(1.0, 0.86, 0.36), heat), heat);
          gl_FragColor = vec4(mix(col, fogCol, smoothstep(120.0, 640.0, vD) * 0.62), 1.0);
        }` }));
    lava.rotation.x = -PI / 2; lava.position.set(0, .42, -255); s.add(lava);
    // a long crack with a curtain of fire, its glow and its smoke
    const FZ = -118, fire = makeParticles(1800, 0xffa040, 1.7, true), smoke = makeParticles(280, 0x241e1e, 38, false); smoke.material.opacity = .55; s.add(fire); s.add(smoke);
    const glows = Array.from({ length: 9 }, (_, i) => { const g = E3.glow(0xff7a30, 70, .5); g.material.fog = false; g.position.set(-160 + i * 40, 7, FZ); s.add(g); return g; });
    const light = new T.PointLight(0xff6a20, 2.4, 320); light.position.set(0, 26, FZ + 30); s.add(light);
    // plants and two Rajasaurus near the camera
    for (let i = 0; i < 34; i++) { const x = rnd(-85, 85), z = rnd(-62, 4); if (Math.abs(x) < 9 && z > -34) continue; const k = Math.random(), pl = N.plant(k < .35 ? 'cycad' : k < .6 ? 'treefern' : k < .85 ? 'araucaria' : 'conifer', { scale: .8 + Math.random() * .5 }); pl.position.set(x, ground.height(x, z), z); s.add(pl); }
    const ferns = N.scatter('fern', 520, q => { const x = (q() - .5) * 110, z = 6 - q() * 62; return [x, ground.height(x, z), z]; }, { size: .75, seed: 9 }); s.add(ferns); s.ticks.push(ferns.tick);
    const dinos = window.HIST_SPECIES ? [[-11, -19, 7, .5], [9, -27, 9, -.42]].map(([x, z, rad, v], i) => { const d = HIST_SPECIES.raja(); d.userData = { x, z, rad, v, a: i * 2.2, ph: 0 }; s.add(d); return d; }) : [];
    return (S.lava = { s, ground, lu, fire, smoke, glows, light, dinos, FZ });
  }
  function lavaTick(dt) {
    const L = S.lava; for (const f of L.s.ticks) f(dt);
    L.lu.time.value += dt; L.lu.front.value = lerp(-96, -36, ease(seg(0, 40, L.t = (L.t || 0) + dt)));
    for (let i = 0; i < 26; i++) L.fire.emit(rnd(-175, 175), 1, L.FZ + rnd(-2, 2), rnd(-2, 2), rnd(10, 27), rnd(-2, 2), rnd(1.4, 2.4));
    L.fire.step(dt, 17, 0);
    if (Math.random() < dt * 9) L.smoke.emit(rnd(-170, 170), 22, L.FZ, rnd(3, 6), rnd(7, 12), rnd(-1, 1), 10);
    L.smoke.step(dt, -1, .08);
    L.glows.forEach((g, i) => { g.material.opacity = .42 + .16 * Math.sin(t * 7 + i * 2.1); }); L.light.intensity = 2.1 + Math.sin(t * 9) * .4 + Math.sin(t * 23) * .25;
    for (const d of L.dinos) { const q = d.userData; q.a += dt * q.v / q.rad; const x = q.x + Math.cos(q.a) * q.rad, z = q.z + Math.sin(q.a) * q.rad; d.position.set(x, L.ground.height(x, z), z); d.rotation.y = -q.a - (q.v > 0 ? PI / 2 : -PI / 2); q.ph += dt * Math.abs(q.v) * 2.6; d.walk(q.ph, 1); }
    return L.s;
  }
  // the same land today: every step in the hills is one old lava flow
  function ghatScene() {
    if (S.ghat) return S.ghat;
    const N = NATURE, s = new T.Scene(); s.ticks = [];
    N.outdoor(s, { top: 0x356fc0, horizon: 0xc6dae8, sun: V3(.5, .5, .35), clouds: .62, cloudShade: 0x8a94a4, near: 160, far: 950, hemiI: .45, shadowSpan: 130, shadowAt: V3(0, 0, -70) }); s.ticks.push(s.sky.tick);
    const ground = E3.terrain({ size: 900, seg: 260, amp: 95, freq: .0034, seed: 43 }), STEP = 9, base = ground.height;
    const stair = h => { const k = h / STEP, f = k - Math.floor(k); return (Math.floor(k) + N.sm(.7, .97, f)) * STEP; };
    const p = ground.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, stair(p.getY(i))); ground.geometry.computeVertexNormals(); ground.height = (x, z) => stair(base(x, z));
    N.paintGround(ground, (x, y, z, sl, n, n2) => { const cliff = N.sm(.1, .3, sl), band = .8 + .2 * Math.sin(y * 2.6); const c = N.mixc(N.mixc(N.rgb(0x4e7636), N.rgb(0x365a28), n2), N.rgb(0x4a4038).map(v => v * band), cliff); return [...c, cliff]; }, 'grass', 'rock', { repeat: 110 }); s.add(ground);
    for (let i = 0; i < 190; i++) { const x = rnd(-300, 300), z = rnd(-360, 120); const e = .5, sl = Math.abs(ground.height(x + e, z) - ground.height(x - e, z)) + Math.abs(ground.height(x, z + e) - ground.height(x, z - e)); if (sl > .25) continue; const pl = N.plant(Math.random() < .75 ? 'broad' : 'shrub', { scale: .7 + Math.random() * .5 }); pl.position.set(x, ground.height(x, z), z); s.add(pl); }
        return (S.ghat = { s, ground });
  }

  /* ================================================================ the relief model: real heights, real colours */
  const LON0 = 66, LON1 = 98.5, LAT0 = 5, LAT1 = 38.5, LC = (LON0 + LON1) / 2, BC = (LAT0 + LAT1) / 2, KX = Math.cos(BC * PI / 180), EX = 13 / 111;
  // the southern foot of the Himalayas (lon, lat), west to east
  const FRONT = [[66, 34.5], [72, 33.6], [77, 30.3], [80.2, 28.8], [84, 27.5], [88, 26.6], [92, 26.8], [95.5, 27.8], [99, 27.6]];
  const frontLat = lon => { for (let i = 1; i < FRONT.length; i++) if (lon <= FRONT[i][0]) return lerp(FRONT[i - 1][1], FRONT[i][1], (lon - FRONT[i - 1][0]) / (FRONT[i][0] - FRONT[i - 1][0])); return FRONT[FRONT.length - 1][1]; };
  const risen = (lon, lat) => Math.max(smooth(-1.7, .5, lat - frontLat(lon)), smooth(71, 69, lon) * smooth(24, 26.5, lat), smooth(92.6, 94.2, lon) * smooth(20, 22.5, lat));   // the land the crash pushed up
  const RIVERS = [
    ['Ganga', '#7CC8FF', [[79.1, 30.9], [78.2, 29.9], [79.2, 27.8], [80.3, 26.5], [81.85, 25.4], [83, 25.3], [85.1, 25.6], [87.9, 24.9], [88.6, 23.2], [89.6, 22.3]]],
    ['Yamuna', '#7CC8FF', [[78.45, 31], [77.4, 29.6], [77.2, 28.6], [78, 27.2], [79.6, 26.3], [81.85, 25.4]]],
    ['Brahmaputra', '#7CC8FF', [[82.2, 30.4], [85, 29.3], [88.5, 29.3], [92, 29.2], [94.6, 29.4], [95.3, 28.3], [94.4, 27.5], [92.6, 26.6], [90.8, 26.1], [89.8, 25.8], [89.7, 24.3], [90.3, 23.2]]],
    ['Indus', '#7CC8FF', [[81.3, 31.4], [79.3, 32.7], [77.6, 34.1], [75.6, 35.3], [74.5, 35.6], [73.2, 34.3], [72.2, 33.6], [71.3, 31.6], [70.6, 29.2], [69, 27.6], [68.3, 25.8], [67.6, 24.3]]]
  ];
  const PLACES = [['Himalayas', 79.6, 31.1, 'in_himalaya'], ['Northern Plains', 82.2, 26.4, 'in_ganga'], ['Thar Desert', 71.6, 27, 'in_thar'], ['Deccan Plateau', 76.8, 17.6, 'i_tap_deccan'], ['Western Ghats', 74.4, 14.3, 'in_ghats'],
    ['Sundarbans', 89, 21.9, 'in_sundarbans'], ['Kanyakumari', 77.5, 8.2, 'in_kanyakumari'], ['Andaman Islands', 92.8, 12, 'i_tap_andaman']];
  function reliefScene() {
    if (S.relief) return S.relief;
    const s = new T.Scene(); s.add(E3.starfield(9000));
    const sl = new T.DirectionalLight(0xfff2dc, 1.3); sl.position.set(-34, 24, 16); s.add(sl); s.add(new T.HemisphereLight(0xcfe0ff, 0x2a2420, .52));
    const w = (LON1 - LON0) * KX, d = LAT1 - LAT0, SX = 330, SY = 340, geo = new T.PlaneGeometry(w, d, SX, SY); geo.rotateX(-PI / 2);
    const n = geo.attributes.position.count, rs = new Float32Array(n); geo.setAttribute('rise', new T.BufferAttribute(rs, 1));
    // the mesh holds today's heights; the shader squashes the part that the crash pushed up, and leans the surface normals to match
    const U = { uRise: { value: 1 } }, mat = new T.MeshStandardMaterial({ color: 0x6a7480, roughness: 1 });
    mat.onBeforeCompile = sh => { sh.uniforms.uRise = U.uRise;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float rise; uniform float uRise; varying float vRise;').replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal.xz *= mix(1.0, uRise, rise); objectNormal = normalize(objectNormal);').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y *= mix(1.0, uRise, rise); vRise = rise;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRise; varying float vRise;').replace('#include <map_fragment>', '#include <map_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.33)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.34, 0.39, 0.2) * (0.72 + 0.65 * l), vRise * (1.0 - uRise) * 0.85); }'); };
    mat.customProgramCacheKey = () => 'relief';
    const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; s.add(mesh);
    const slab = new T.Mesh(new T.BoxGeometry(w, 1.4, d), new T.MeshStandardMaterial({ color: 0x1a2038, roughness: 1 })); slab.position.y = -.72; s.add(slab);
    const R = { s, U, mesh, ok: false, HW: 0, HH: 0, H: null, clouds: [], rain: null };
    // monsoon clouds and their rain
    for (let i = 0; i < 30; i++) { const c = E3.glow(0xffffff, rnd(2.2, 3.6), 0); c.material.blending = T.NormalBlending; c.material.depthTest = true; c.userData = { u: Math.random(), off: V3(rnd(-3.4, 3.4), rnd(-.25, .25), rnd(-1.6, 1.6)), sp: rnd(.045, .07) }; s.add(c); R.clouds.push(c); }
    R.rain = makeParticles(900, 0x9cc8ff, .09, false); s.add(R.rain);
    const bump = E3.tex('earth_bump4k'), tA = E3.tex('earth8k_02'), tB = E3.tex('earth8k_03');
    Promise.all([bump.ready, tA.ready, tB.ready]).then(() => {
      if (!bump.image) return;
      // heights: the grey height picture, cut to this region (about 31 metres a step; the sea is level 27)
      const bw = bump.image.width, bh = bump.image.height, x0 = Math.floor((LON0 + 180) / 360 * bw), y0 = Math.floor((90 - LAT1) / 180 * bh), cw = Math.ceil((LON1 - LON0) / 360 * bw) + 2, chh = Math.ceil((LAT1 - LAT0) / 180 * bh) + 2;
      const c = document.createElement('canvas'); c.width = cw; c.height = chh; const g = c.getContext('2d'); g.drawImage(bump.image, x0, y0, cw, chh, 0, 0, cw, chh); const px = g.getImageData(0, 0, cw, chh).data;
      let Hk = new Float32Array(cw * chh); for (let i = 0; i < cw * chh; i++) Hk[i] = Math.max(0, px[i * 4] - 27) / 228 * 8.85;
      for (let pass = 0; pass < 2; pass++) { const o = new Float32Array(cw * chh); for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) { let t2 = 0, c2 = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cw || yy >= chh) continue; const wgt = dx || dy ? 1 : 2; t2 += Hk[yy * cw + xx] * wgt; c2 += wgt; } o[y * cw + x] = t2 / c2; } Hk = o; }   // take the jaggedness out
      R.H = Hk; R.HW = cw; R.HH = chh; R.sx = bw / 360; R.sy = bh / 180; R.x0 = x0; R.y0 = y0;
      const pos = geo.attributes.position; for (let i = 0; i < n; i++) { const lon = LC + pos.getX(i) / KX, lat = BC - pos.getZ(i); pos.setY(i, kmAt(lon, lat) * EX); rs[i] = risen(lon, lat); }
      pos.needsUpdate = true; geo.attributes.rise.needsUpdate = true; geo.computeVertexNormals();
      // colours: the sharp satellite tiles, cut to the same region
      if (tA.image && tB.image) { const k = tA.image.width / 90, z = 2, sh2 = (LAT1 - LAT0) * k, tc = document.createElement('canvas'); tc.width = Math.round((LON1 - LON0) * k * z); tc.height = Math.round(sh2 * z); const tg = tc.getContext('2d'); tg.imageSmoothingQuality = 'high';
        tg.drawImage(tA.image, LON0 * k, (90 - LAT1) * k, (90 - LON0) * k, sh2, 0, 0, (90 - LON0) * k * z, tc.height); tg.drawImage(tB.image, 0, (90 - LAT1) * k, (LON1 - 90) * k, sh2, (90 - LON0) * k * z, 0, (LON1 - 90) * k * z, tc.height);
        const tx = new T.CanvasTexture(tc); tx.anisotropy = 8; mat.map = tx; mat.color.set(0xffffff); mat.needsUpdate = true; }
      R.ok = true;
    });
    function kmAt(lon, lat) { if (!R.H) return 0; const fx = clamp((lon + 180) * R.sx - R.x0 - .5, 0, R.HW - 1.001), fy = clamp((90 - lat) * R.sy - R.y0 - .5, 0, R.HH - 1.001), ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy, H2 = R.H, W2 = R.HW;
      return lerp(lerp(H2[iy * W2 + ix], H2[iy * W2 + ix + 1], ax), lerp(H2[(iy + 1) * W2 + ix], H2[(iy + 1) * W2 + ix + 1], ax), ay); }
    // a point on the model: lon, lat, and how far to float above the ground
    R.at = (lon, lat, lift = 0) => V3((lon - LC) * KX, kmAt(lon, lat) * EX * lerp(1, U.uRise.value, risen(lon, lat)) + lift, -(lat - BC));
    return (S.relief = R);
  }
  function drawRivers(ctx, names, flow) {
    const R = S.relief; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [name, col, pts] of RIVERS) { if (!names.includes(name)) continue; const sp = pts.map(([lo, la]) => proj(R.at(lo, la, .05))); if (sp.some(p => !p.front)) continue;
      ctx.beginPath(); sp.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.strokeStyle = 'rgba(20,60,120,.7)'; ctx.lineWidth = 4.5; ctx.setLineDash([]); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -flow * 26; ctx.stroke(); }
    ctx.restore();
  }

  /* ================================================================ the chapters */
  const GONDWANA = [[0, 'Africa', 22, -8], [1, 'South America', -55, -12], [AN, 'Antarctica', 60, -76], [AU, 'Australia', 133, -25], [IN, 'India', 79, 21, 1], [0, 'Madagascar', 46.5, -19.5]];
  const WORLD = [[0, 'Africa', 22, 2], [ASIA, 'Asia', 92, 42], [AU, 'Australia', 133, -25], [IN, 'India', 79, 21, 1], [0, 'Madagascar', 46.5, -19.5], [AN, 'Antarctica', 60, -76]];
  const globeCam = ch => { const f = ch.follow, p = spot(f[0], f[1], f[2], ch.age, 1); view({ dist: ch.dist || 27, yaw: Math.atan2(p.x, p.z) + (ch.yaw || 0), pitch: Math.asin(clamp(p.y, -1, 1)) + (ch.pitch || 0), min: 13, max: 70, tall: 1 }); };
  const CH = [
    { id: 'gondwana', name: 'A giant southern land', when: 'Gondwana', line: 'i_gondwana', globe: [180, 180], dur: 1, follow: [IN, 79, 20], yaw: -.24, pitch: .1, dist: 27,
      start() {},
      tick(dt) { return globeTick(dt, this.age, S.globe.manual ? this.follow : null, this); },
      hud(ctx) { plateLabels(ctx, this.age, GONDWANA); hudPill(ctx, 'India is far in the south, joined to Africa, Antarctica and Australia', W / 2, bottom() - 4, DARK, '#F3F1FF', W < 600 ? 10 : 12); } },
    { id: 'break', name: 'Breaking away', when: 'Gondwana cracks apart', line: 'i_break', globe: [180, 86], dur: 26, follow: [IN, 79, 20], yaw: -.22, pitch: .1, dist: 27,
      start() {},
      tick(dt) { return globeTick(dt, this.age, this.follow, this); },
      hud(ctx) { plateLabels(ctx, this.age, GONDWANA); if (this.age < 92) hudPill(ctx, 'India has broken away from Madagascar. It is an island now!', W / 2, bottom() - 4, GOLD, INK, W < 600 ? 11 : 13); } },
    { id: 'journey', name: 'The great journey', when: 'India races north', line: 'i_journey', globe: [88, 52], dur: 28, follow: [IN, 80, 30], yaw: -.05, pitch: .16, dist: 27,
      start() {},
      tick(dt) { return globeTick(dt, this.age, this.follow, this); },
      hud(ctx) { const a = this.age; plateLabels(ctx, a, WORLD); trail(ctx, a);
        const T0 = top() + 66, w = Math.min(226, W - 32), sp = speedAt(a), km = Math.round(spot(IN, 79, 20, 88, 1).angleTo(spot(IN, 79, 20, a, 1)) * 6371 / 100) * 100;
        panel(ctx, 16, T0, w, 66); hudText(ctx, `Speed: ${sp.toFixed(0)} cm a year`, 28, T0 + 19, 13, '#FFB52E', 'left'); bar(ctx, 28, T0 + 27, w - 24, sp / 18, sp > 10 ? '#FF6D8A' : '#59E0E8'); hudText(ctx, `Travelled so far: ${km.toLocaleString('en-IN')} km`, 28, T0 + 54, 11.5, '#F3F1FF', 'left', 600);
        hudPill(ctx, sp > 10 ? 'As fast as your hair grows: very fast for a continent!' : 'India sets off across the ocean', W / 2, bottom() - 4, DARK, '#F3F1FF', W < 600 ? 10 : 12); } },
    { id: 'deccan', name: 'Rivers of lava', when: 'The Deccan lava fields', line: 'i_deccan', globe: [69, 64.5], dur: 22, action: { id: 'look', label: 'Stand in the lava fields' }, follow: [IN, 76, 19], yaw: -.1, pitch: .1, dist: 21,
      start() { this.mode = 0; setAction(this.action); },
      act() { this.mode = (this.mode + 1) % 3; const m = this.mode; setAction({ id: 'look', label: ['Stand in the lava fields', 'See this place today', 'Back to the globe'][m] });
        if (m === 1) { lavaScene(); S.lava.t = 0; view({ goal: V3(0, 6, -14), dist: 24, yaw: .1, pitch: .17, min: 6, max: 70, minPitch: -.2, maxPitch: .8 }); ctl.snap(); Sfx.whoosh(); }
        if (m === 2) { ghatScene(); view({ goal: V3(0, 14, -60), dist: 150, yaw: .3, pitch: .36, min: 40, max: 320, minPitch: .12, maxPitch: 1.2 }); ctl.snap(); Voice.say('i_deccan_today'); }
        if (m === 0) { globeCam(this); ctl.snap(); } slider(m === 0); },
      tick(dt) { if (this.mode === 1) return lavaTick(dt); if (this.mode === 2) { for (const f of S.ghat.s.ticks) f(dt); return S.ghat.s; } return globeTick(dt, this.age, this.follow, this); },
      hud(ctx) {
        if (this.mode === 1) { S.lava.dinos.forEach((d, i) => { if (!i) label(ctx, d.position.clone().add(V3(0, 4.6, 0)), 'Rajasaurus lived here then', GOLD, INK, 11); }); label(ctx, V3(30, 26, S.lava.FZ), 'Lava bursts from cracks many kilometres long', DARK, '#FFD9A8', 11);
          hudPill(ctx, 'Western India, 66 million years ago', W / 2, bottom() - 4, DARK, '#F3F1FF', 12); return; }
        if (this.mode === 2) { hudPill(ctx, 'The Western Ghats today: every step is one old lava flow', W / 2, bottom() - 4, GOLD, INK, W < 600 ? 11 : 13); return; }
        plateLabels(ctx, this.age, WORLD.filter(x => x[1] !== 'Antarctica')); const v = spot(IN, 75.6, 19.6, this.age, GR * 1.03); if (facing(v)) label(ctx, v, 'Lava!', 'rgba(255,109,66,.95)', '#2A0A00', 12, -26);
        hudPill(ctx, 'India passes over a hot spot. Lava floods out, layer on layer', W / 2, bottom() - 4, DARK, '#F3F1FF', W < 600 ? 10 : 12); } },
    { id: 'crash', name: 'Crash into Asia', when: 'India meets Asia', line: 'i_crash', globe: [60, 0], dur: 34, follow: [IN, 82, 30], yaw: 0, pitch: .12, dist: 24,
      start() {},
      tick(dt) { return globeTick(dt, this.age, this.follow, this); },
      hud(ctx) { const a = this.age; plateLabels(ctx, a, WORLD.filter(x => x[1] !== 'Antarctica' && x[1] !== 'Australia'));
        if (a > 47) { const m = spot(IN, 84, 46, a, GR * 1.03).lerp(spot(ASIA, 86, 29, a, GR * 1.03), .5); if (facing(m)) label(ctx, m, 'Tethys Sea', 'rgba(42,111,192,.92)', '#fff', 11); }
        else { const v = spot(ASIA, 84, 30, a, GR * 1.04); if (facing(v)) label(ctx, v, a > 5 ? 'The land crumples up' : 'Himalayas', 'rgba(244,247,251,.95)', '#16215A', 12, -18); }
        hudPill(ctx, a > 50 ? 'The sea between India and Asia is being squeezed shut' : a > 2 ? 'India keeps pushing. The front of it slides under Asia' : 'India is still pushing north today, about 5 cm every year', W / 2, bottom() - 4, a > 50 ? DARK : GOLD, a > 50 ? '#F3F1FF' : INK, W < 600 ? 10 : 12); } },
    { id: 'himalaya', name: 'The Himalayas rise', when: 'The highest mountains on Earth', line: 'i_himalaya', dur: 30,
      start() { reliefScene(); view({ goal: S.relief.at(84.5, 28.8), dist: 14, yaw: .3, pitch: .42, min: 5, max: 60, minPitch: .08, maxPitch: 1.45 }); },
      tick(dt) { const R = S.relief; this.k = ease(seg(2, 26, et)); R.U.uRise.value = this.k; R.clouds.forEach(c => { c.material.opacity = 0; }); R.rain.list.length = 0; R.rain.step(dt); return R.s; },
      hud(ctx) { const R = S.relief, k = this.k || 0; if (!R.ok) return hudPill(ctx, 'Building the mountains…', W / 2, H / 2, DARK, '#F3F1FF', 13);
        const T0 = top() + 66, w = Math.min(232, W - 32), ago = Math.round(50 * (1 - seg(2, 26, et))); panel(ctx, 16, T0, w, 66); hudText(ctx, ago ? `${ago} million years ago` : 'Today', 28, T0 + 19, 13, '#FFB52E', 'left'); bar(ctx, 28, T0 + 27, w - 24, k, '#F3F7FB'); hudText(ctx, `Mount Everest: ${Math.round(8849 * k).toLocaleString('en-IN')} m`, 28, T0 + 54, 12, '#F3F1FF', 'left', 600);
        if (k > .55) { label(ctx, R.at(86.92, 27.99, .5), 'Mount Everest', 'rgba(244,247,251,.95)', '#16215A', 11, -8); label(ctx, R.at(88.15, 27.2, .3), 'Kanchenjunga', DARK, '#F3F1FF', 10, 14); label(ctx, R.at(88, 32.2, .4), 'Tibetan Plateau', DARK, '#F3F1FF', 11); }
        label(ctx, R.at(80.5, 26.6, .2), 'India pushes this way', GOLD, INK, 11);
        hudPill(ctx, k < .98 ? 'The land crumples and rises, like a carpet pushed against a wall' : 'Still growing: about 4 millimetres a year, as thick as two coins', W / 2, bottom() - 4, k < .98 ? DARK : GOLD, k < .98 ? '#F3F1FF' : INK, W < 600 ? 10 : 12); } },
    { id: 'rivers', name: 'Rivers and plains', when: 'Rivers build the plains', line: 'i_rivers', dur: 30,
      start() { reliefScene(); S.relief.U.uRise.value = 1; view({ goal: S.relief.at(82.5, 27), dist: 21, yaw: .12, pitch: .72, min: 6, max: 70, minPitch: .08, maxPitch: 1.45 }); },
      tick(dt) { const R = S.relief, on = ease(seg(9, 14, et)); R.U.uRise.value = 1;
        R.clouds.forEach(c => { const q = c.userData; q.u = (q.u + dt * q.sp) % 1; const lon = lerp(89.5, 82, q.u) + q.off.x, lat = lerp(13, 27.6, q.u) + q.off.z * (1 - q.u * .5); c.position.copy(R.at(lon, lat)).setY(1.9 + q.off.y); c.material.opacity = .8 * on * Math.sin(q.u * PI) ** .5;
          if (on > .5 && q.u > .78 && Math.random() < dt * 14) R.rain.emit(c.position.x + rnd(-.8, .8), c.position.y - .3, c.position.z + rnd(-.6, .6), 0, -3.2, 0, .8); });
        R.rain.step(dt, 0, 0); return R.s; },
      hud(ctx) { const R = S.relief; if (!R.ok) return hudPill(ctx, 'Building the mountains…', W / 2, H / 2, DARK, '#F3F1FF', 13);
        drawRivers(ctx, ['Ganga', 'Yamuna', 'Brahmaputra', 'Indus'], et);
        label(ctx, R.at(84.2, 25.5, .1), 'Ganga', 'rgba(42,111,192,.92)', '#fff', 11, 16); label(ctx, R.at(92.2, 26.4, .1), 'Brahmaputra', 'rgba(42,111,192,.92)', '#fff', 11, 16); label(ctx, R.at(70.3, 28.6, .1), 'Indus', 'rgba(42,111,192,.92)', '#fff', 11, 16); label(ctx, R.at(77.6, 27.9, .1), 'Yamuna', 'rgba(42,111,192,.92)', '#fff', 10, -12);
        label(ctx, R.at(81.5, 27.2, .15), 'Northern Plains', GOLD, INK, 12, -4);
        if (et > 11) label(ctx, R.at(87.5, 19.5, 2.2), 'Monsoon clouds', 'rgba(244,247,251,.95)', '#16215A', 11);
        hudPill(ctx, et < 10 ? 'Rivers carry mud and sand down from the mountains and spread it out flat' : 'The mountains stop the monsoon clouds, so their rain falls on India', W / 2, bottom() - 4, DARK, '#F3F1FF', W < 600 ? 10 : 12); } },
    { id: 'today', name: 'India today', when: 'India today', line: 'i_today', dur: 1,
      start() { reliefScene(); S.relief.U.uRise.value = 1; view({ goal: S.relief.at(81.5, 21.5), dist: 38, yaw: 0, pitch: H > W ? 1.32 : 1.0, min: 8, max: 90, minPitch: .08, maxPitch: 1.45, tall: .68 }); },
      tick(dt) { const R = S.relief; R.U.uRise.value = 1; R.clouds.forEach(c => { c.material.opacity = 0; }); R.rain.list.length = 0; R.rain.step(dt); return R.s; },
      tap(x, y) { const R = S.relief; let best = null, bd = 60; for (const [name, lo, la, line] of PLACES) { const p = proj(R.at(lo, la, .3)); const dd = Math.hypot(x - p.x, y - p.y); if (p.front && dd < bd) { bd = dd; best = line; } } if (best) { Sfx.twinkle(); Voice.say(best); } },
      hud(ctx) { const R = S.relief; if (!R.ok) return hudPill(ctx, 'Building the mountains…', W / 2, H / 2, DARK, '#F3F1FF', 13);
        drawRivers(ctx, ['Ganga', 'Brahmaputra', 'Indus'], et * .5);
        for (const [name, lo, la] of PLACES) label(ctx, R.at(lo, la, .3), name, GOLD, INK, W < 600 ? 10 : 11.5);
        label(ctx, R.at(82.6, 18.4, .2), 'Eastern Ghats', DARK, '#F3F1FF', 10); label(ctx, R.at(88, 14.5), 'Bay of Bengal', 'rgba(42,111,192,.8)', '#fff', 10); label(ctx, R.at(68.5, 15.5), 'Arabian Sea', 'rgba(42,111,192,.8)', '#fff', 10);
        hudPill(ctx, 'Tap a gold name to hear about that place', W > H ? W - 160 : W / 2, bottom() - 4, DARK, '#F3F1FF', 12); } }
  ];
  // the path India's middle has taken since it left Madagascar
  function trail(ctx, age) {
    ctx.save(); ctx.fillStyle = 'rgba(255,181,46,.9)';
    for (let a = 88; a >= age; a -= 1.5) { const v = spot(IN, 79, 20, a, GR * 1.01); if (!facing(v)) continue; const p = proj(v); ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  /* ================================================================ the story controls */
  function setAction(a) { const b = $('#indiaAct'); b.hidden = !a; if (a) b.querySelector('span').textContent = a.label; }
  function slider(on) { $('#indiaAgeWrap').hidden = !on; }
  function go(i, talk = true) {
    cur = clamp(i, 0, CH.length - 1); et = 0;
    const was = go.last, ch = CH[cur]; if (ch.globe) { globeScene(); S.globe.manual = false; ch.age = ch.globe[0]; globeCam(ch); }
    setAction(ch.action || null); ch.start(); slider(!!ch.globe);
    if (!(was && was.globe && ch.globe)) ctl.snap();
    go.last = ch;
    $$('#indiaSteps .emode').forEach((b, k) => b.setAttribute('aria-pressed', k === cur ? 'true' : 'false'));
    $(`#indiaSteps [data-i="${cur}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    $('#indiaPrev').disabled = cur === 0; $('#indiaNext').disabled = cur === CH.length - 1;
    if (talk) { Sfx.whoosh(); Voice.say(ch.line); }
  }
  function init() {
    ready = true; r = E3.attach(ov); noise = GAS.noiseTex();
    cam = new T.PerspectiveCamera(45, 1, .05, 30000);
    ctl = new E3.Orbit(cam, ov, { dist: 27, pitch: 0, yaw: 0, min: 5, max: 600 }); ctl.snap(); ctl.onTap = (x, y) => CH[cur].tap?.(x, y);
    $('#indiaSteps').innerHTML = CH.map((c, i) => `<button type="button" class="emode" data-i="${i}" aria-pressed="false">${i + 1}. ${c.name}</button>`).join('');
    $$('#indiaSteps .emode').forEach(b => b.addEventListener('click', () => go(+b.dataset.i)));
    $('#indiaPrev').addEventListener('click', () => go(cur - 1)); $('#indiaNext').addEventListener('click', () => go(cur + 1)); $('#indiaAgain').addEventListener('click', () => go(cur));
    $('#indiaAct').addEventListener('click', () => { Sfx.tap(); CH[cur].act?.(); });
    $('#indiaAge').addEventListener('input', e => { const ch = CH[cur]; if (!ch.globe) return; S.globe.manual = true; ch.age = 200 - +e.target.value; });
    layout();
  }
  function layout() { if (!ready) return; E3.attach(ov); const f = fitCanvas(ov); W = f.w; H = f.h; E3.fit(r, cam); }
  function step(dt) {
    const ch = CH[cur]; t += dt; et += dt;
    if (ch.globe && !S.globe.manual) ch.age = lerp(ch.globe[0], ch.globe[1], ch.dur > 1 ? ease(seg(1.5, ch.dur, et)) : 0);
    return ch.tick(dt);
  }
  function frame(dt) {
    if (!ready) init();
    const ch = CH[cur], sc = step(dt);
    E3.fit(r, cam); ctl.update(dt);
    const onGlobe = ch.globe && !ch.mode; if (onGlobe) globeLight();
    r.render(sc, cam);
    const ctx = ov.getContext('2d'), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    ch.hud?.(ctx);
    if (onGlobe) { const sl = $('#indiaAge'); if (document.activeElement !== sl || !S.globe.manual) sl.value = 200 - ch.age; }
    // the story clock
    const T0 = top(), pw = Math.min(380, W - 32), px = (W - pw) / 2; panel(ctx, px, T0, pw, 56);
    hudText(ctx, `${cur + 1}. ${ch.when}`, W / 2, T0 + 20, 15, '#FFB52E'); hudText(ctx, onGlobe ? agoText(ch.age) : ch.id === 'deccan' ? (ch.mode === 1 ? '66 million years ago' : 'Today') : ch.id === 'himalaya' ? 'From 50 million years ago to today' : 'Today', W / 2, T0 + 36, 11, '#C9D0F2', 'center', 600);
    for (let i = 0; i < CH.length; i++) { const x = px + 18 + i * (pw - 36) / (CH.length - 1); ctx.fillStyle = i === cur ? '#FFB52E' : i < cur ? '#59E0E8' : '#2B3A7A'; ctx.beginPath(); ctx.arc(x, T0 + 47, i === cur ? 4.5 : 3, 0, TAU); ctx.fill(); }
  }
  return {
    frame, layout,
    enter(quiet) {
      if (!ready) init();
      E3.attach(ov); layout();
      if (!started) { started = true; go(0, false); Voice.say('i_intro', () => { if (current === 'indiastory' && cur === 0 && !Voice.busy) Voice.say(CH[0].line); }); }
      else if (!quiet) Voice.say(CH[cur].line);
    },
    leave() { if (ctl) ctl.auto = 0; },
    // for testing: jump to a chapter and run its clock forward without drawing
    seek(i, sec = 0) { if (!ready) init(); go(i, false); this.skip(sec); },
    skip(sec) { for (let k = 0; k < sec / .05; k++) step(.05); },
    act() { CH[cur].act?.(); }
  };
})();
