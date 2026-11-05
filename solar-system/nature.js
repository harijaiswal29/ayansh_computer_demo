/* nature.js: the "realism kit" for the Earth scenes.
   A sky with a sun and moving clouds, ground that mixes grass, rock, sand or snow,
   water that reflects the sky, leafy trees, ferns, grass, bark, rock and skin textures.
   Everything is drawn here from noise, so there are no extra picture files to load. */
'use strict';
(() => {
  const T = THREE, E = E3;
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const cache = {};
  const once = (k, f) => cache[k] || (cache[k] = f());
  const seeded = s => { s = (s * 9301 + 49297) % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------------------------------------------------------------- noise that repeats, for textures that tile */
  function tileNoise(P, seed) {
    const r = seeded(seed), g = new Float32Array(P * P); for (let i = 0; i < g.length; i++) g[i] = r();
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const i0 = ((xi % P) + P) % P, j0 = ((yi % P) + P) % P, i1 = (i0 + 1) % P, j1 = (j0 + 1) % P;
      const a = g[j0 * P + i0], b = g[j0 * P + i1], c = g[j1 * P + i0], d = g[j1 * P + i1];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  // u, v in 0..1; repeats exactly at the edges
  function tileFbm(base, oct, seed) {
    const ns = []; for (let o = 0; o < oct; o++) ns.push([tileNoise(base << o, seed + o * 13), base << o]);
    return (u, v) => { let s = 0, a = .5, n = 0; for (const [f, P] of ns) { s += f(u * P, v * P) * a; n += a; a *= .5; } return s / n; };
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texOf(c, rep = true) { const t = new T.CanvasTexture(c); if (rep) t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t; }
  // fill a canvas pixel by pixel: fn(u, v) -> [r, g, b, a?] (0..255)
  function paint(w, h, fn) {
    const c = canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = fn(x / w, y / h, x, y), o = (y * w + x) * 4; d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = p.length > 3 ? p[3] : 255; }
    g.putImageData(img, 0, 0); return c;
  }
  // draw something on a tiling canvas so it wraps round the edges
  function wrapDraw(g, w, h, x, y, f) { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.save(); g.translate(x + dx, y + dy); f(g); g.restore(); } }

  /* ---------------------------------------------------------------- ground detail textures (mostly grey, coloured by the ground's own colours) */
  const DETAIL = {
    grass: () => {
      const n = tileFbm(8, 5, 3), c = paint(512, 512, (u, v) => { const k = .74 + n(u, v) * .32; return [k * 235, k * 250, k * 215]; }), g = c.getContext('2d'), r = seeded(11);
      for (let i = 0; i < 9000; i++) { const x = r() * 512, y = r() * 512, l = 4 + r() * 9, a = (r() - .5) * .9, b = r(); g.strokeStyle = b < .5 ? `rgba(40,60,20,${.25 + r() * .25})` : `rgba(255,255,210,${.18 + r() * .2})`; g.lineWidth = .8 + r() * .8; wrapDraw(g, 512, 512, x, y, q => { q.beginPath(); q.moveTo(0, 0); q.lineTo(Math.sin(a) * l, -Math.cos(a) * l); q.stroke(); }); }
      return c;
    },
    dirt: () => {
      const n = tileFbm(8, 6, 5), c = paint(512, 512, (u, v) => { const k = .7 + n(u, v) * .4; return [k * 245, k * 232, k * 215]; }), g = c.getContext('2d'), r = seeded(17);
      for (let i = 0; i < 1400; i++) { const x = r() * 512, y = r() * 512, s = 1 + r() * 3.5, k = 120 + r() * 120; g.fillStyle = `rgba(${k},${k * .95},${k * .88},.75)`; wrapDraw(g, 512, 512, x, y, q => { q.beginPath(); q.ellipse(0, 0, s, s * (.6 + r() * .4), r() * 3, 0, 6.3); q.fill(); }); }
      return c;
    },
    rock: () => {
      const n = tileFbm(4, 6, 7), m = tileFbm(16, 3, 9);
      return paint(512, 512, (u, v) => { const a = n(u, v), ridge = 1 - Math.abs(a * 2 - 1), crack = sm(.9, .98, ridge), k = (.62 + m(u, v) * .38 + a * .25) * (1 - crack * .55); return [k * 225, k * 222, k * 218]; });
    },
    sand: () => {
      const n = tileFbm(4, 5, 21), r = seeded(23);
      return paint(512, 512, (u, v) => { const w = n(u, v), rip = .5 + .5 * Math.sin((v * 22 + w * 5) * Math.PI * 2), k = .82 + rip * .1 + (r() - .5) * .1 + (w - .5) * .2; return [k * 250, k * 238, k * 212]; });
    },
    snow: () => {
      const n = tileFbm(8, 5, 31), r = seeded(37);
      return paint(512, 512, (u, v) => { const k = .9 + (n(u, v) - .5) * .16 + (r() < .004 ? .12 : 0); return [k * 245, k * 250, k * 255]; });
    },
    mud: () => {
      const n = tileFbm(6, 6, 41), m = tileFbm(2, 3, 43);
      return paint(512, 512, (u, v) => { const k = .62 + n(u, v) * .38, wet = sm(.55, .7, m(u, v)); return [k * (240 - wet * 50), k * (232 - wet * 40), k * (210 - wet * 20)]; });
    }
  };
  const detail = kind => once('d_' + kind, () => texOf(DETAIL[kind]()));

  /* ---------------------------------------------------------------- sky: a blue (or orange) dome with a sun and drifting clouds */
  const SKY_VS = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
  const SKY_FS = `
    uniform vec3 top, hor, below, sunCol, cloudCol, cloudShade, sunDir; uniform float sunSize, cloud, time, glow, cloudScale;
    varying vec3 vDir;
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fb(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += a * n2(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
    void main(){
      vec3 d = normalize(vDir), sd3 = normalize(sunDir);
      float y = d.y;
      vec3 col = mix(hor, top, pow(clamp(y, 0.0, 1.0), 0.5));
      col = mix(col, below, 1.0 - smoothstep(-0.06, 0.0, y));
      float sd = max(dot(d, sd3), 0.0);
      col += sunCol * (pow(sd, 6.0) * 0.22 + pow(sd, 60.0) * 0.4) * glow;
      float cosR = cos(0.022 * sunSize);
      col = mix(col, sunCol * 1.6 + 0.3, smoothstep(cosR - 0.00025, cosR, sd) * glow);
      if (y > 0.0 && cloud > 0.0) {
        vec2 uv = d.xz / (y + 0.12) * cloudScale + vec2(time * 0.012, time * 0.005);
        float c = fb(uv);
        float cov = smoothstep(1.0 - cloud * 0.62 - 0.12, 1.0 - cloud * 0.62 + 0.2, c);
        float lit = fb(uv + sd3.xz * 0.06);
        vec3 cc = mix(cloudCol, cloudShade, clamp((lit - c) * 5.0 + 0.45, 0.0, 1.0));
        cc += sunCol * pow(sd, 5.0) * 0.35 * glow;
        col = mix(col, cc, cov * smoothstep(0.0, 0.12, y) * 0.96);
      }
      gl_FragColor = vec4(col, 1.0);
      #include <encodings_fragment>
    }`;
  function sky(o = {}) {
    const C = v => new T.Color(v);
    const u = {
      top: { value: C(o.top ?? 0x2f6fc8) }, hor: { value: C(o.horizon ?? 0xb8d4ec) }, below: { value: C(o.below ?? o.horizon ?? 0xb8d4ec) },
      sunDir: { value: (o.sun || V3(.5, .5, -.6)).clone().normalize() }, sunCol: { value: C(o.sunColor ?? 0xfff0cf) }, sunSize: { value: o.sunSize ?? 1 },
      cloud: { value: o.clouds ?? .45 }, cloudCol: { value: C(o.cloudColor ?? 0xffffff) }, cloudShade: { value: C(o.cloudShade ?? 0x9aa5b8) },
      time: { value: 0 }, glow: { value: o.glow ?? 1 }, cloudScale: { value: o.cloudScale ?? .55 }
    };
    const m = new T.Mesh(new T.SphereGeometry(50, 48, 24), new T.ShaderMaterial({ uniforms: u, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: T.BackSide, depthWrite: false, fog: false }));
    m.frustumCulled = false; m.renderOrder = -10;
    m.onBeforeRender = (r, s, cam) => m.position.copy(cam.position);
    m.u = u; m.tick = dt => { u.time.value += dt; };
    return m;
  }
  // the sky as a reflection / soft light for every shiny or rough surface in the scene
  function skyEnv(skyMesh) {
    try {
      const r = E.renderer(), pm = new T.PMREMGenerator(r), s = new T.Scene();
      s.add(new T.Mesh(skyMesh.geometry, skyMesh.material));
      const rt = pm.fromScene(s, 0, .1, 100); pm.dispose(); return rt.texture;
    } catch (e) { console.warn(e); return null; }
  }
  // a whole outdoor setup: sky, matching fog, sun light with shadows, soft sky light, sky reflections
  function outdoor(scene, o = {}) {
    const sk = sky(o); scene.add(sk); scene.background = null;
    const hor = new T.Color(o.fog ?? o.horizon ?? 0xb8d4ec);
    scene.fog = new T.Fog(hor, o.near ?? 120, o.far ?? 600);
    const sun = (o.sun || V3(.5, .5, -.6)).clone().normalize();
    const hemi = new T.HemisphereLight(o.skyLight ?? 0xdfeeff, o.groundLight ?? 0x4a4a3a, o.hemiI ?? .35); scene.add(hemi);
    const sl = new T.DirectionalLight(o.sunLight ?? 0xfff2dc, o.sunI ?? 1.35); sl.position.copy(sun).multiplyScalar(150); sl.castShadow = true;
    sl.shadow.mapSize.set(2048, 2048); sl.shadow.bias = -.0004; sl.shadow.normalBias = .02;
    const c = sl.shadow.camera, span = o.shadowSpan ?? 90; c.left = c.bottom = -span; c.right = c.top = span; c.near = 1; c.far = 500;
    scene.add(sl); scene.add(sl.target); if (o.shadowAt) sl.target.position.copy(o.shadowAt);
    if (o.shadowAt) sl.position.add(o.shadowAt);
    const env = skyEnv(sk); if (env) { scene.environment = env; }
    scene.sky = sk; scene.hemi = hemi; scene.sl = sl; scene.env = env;
    scene.setSky = p => {    // change colours later (sunset, storm…)
      for (const k of ['top', 'hor', 'below', 'sunCol', 'cloudCol', 'cloudShade']) if (p[k] != null) sk.u[k].value.set(p[k]);
      if (p.cloud != null) sk.u.cloud.value = p.cloud; if (p.glow != null) sk.u.glow.value = p.glow;
      if (p.hor != null) scene.fog.color.set(p.hor);
    };
    return scene;
  }

  /* ---------------------------------------------------------------- ground: two textures mixed by slope/height, coloured per vertex */
  function groundMat(a = 'grass', b = 'rock', o = {}) {
    const ta = detail(a).clone(), tb = detail(b).clone(); ta.needsUpdate = tb.needsUpdate = true;
    const rep = o.repeat ?? 90; ta.repeat.set(rep, rep); tb.repeat.set(rep * .6, rep * .6);
    const mat = new T.MeshStandardMaterial({ map: ta, vertexColors: true, roughness: o.rough ?? .95, metalness: 0, envMapIntensity: o.env ?? .6 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.mapB = { value: tb };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float splat; varying float vSplat;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D mapB; varying float vSplat;').replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 ta = texture2D(map, vUv), tb = texture2D(mapB, vUv * 0.6);
          float big = texture2D(map, vUv * 0.043).g * 0.6 + texture2D(mapB, vUv * 0.011).g * 0.4;
          vec4 texelColor = mix(ta, tb, clamp(vSplat, 0.0, 1.0));
          texelColor.rgb *= 0.78 + 0.42 * big;
          diffuseColor *= mapTexelToLinear(texelColor);
        #endif`);
    };
    mat.customProgramCacheKey = () => 'ground';
    return mat;
  }
  // colour a ground mesh: fn(x, y, z, slope 0..1, n noise 0..1) -> [r, g, b (0..1), splat 0..1]
  function paintGround(mesh, fn, a = 'grass', b = 'rock', o = {}) {
    const g = mesh.geometry, p = g.attributes.position, nrm = g.attributes.normal, n = p.count;
    const col = new Float32Array(n * 3), sp = new Float32Array(n);
    const nz = window.noise3 || (() => .5);
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), slope = 1 - nrm.getY(i);
      const q = fn(x, y, z, slope, nz(x * .02, z * .02, 3.3), nz(x * .2, z * .2, 7.7));
      col[i * 3] = q[0]; col[i * 3 + 1] = q[1]; col[i * 3 + 2] = q[2]; sp[i] = q[3] ?? 0;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('splat', new T.BufferAttribute(sp, 1));
    mesh.material = groundMat(a, b, o); mesh.receiveShadow = true;
    return mesh;
  }
  const rgb = h => { const c = new T.Color(h); return [c.r, c.g, c.b]; };
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  /* ---------------------------------------------------------------- water that ripples and reflects the sky */
  const waterNormal = () => once('waterN', () => {
    const n = tileFbm(4, 5, 51), m = tileFbm(16, 3, 53), H = (u, v) => n(u, v) * .7 + m(u, v) * .3, S = 256, e = 1 / S;
    return texOf(paint(S, S, (u, v) => { const dx = (H(u + e, v) - H(u - e, v)) * 18, dy = (H(u, v + e) - H(u, v - e)) * 18, l = Math.hypot(dx, dy, 1); return [(-dx / l * .5 + .5) * 255, (-dy / l * .5 + .5) * 255, (1 / l * .5 + .5) * 255]; }));
  });
  function water(w, d, o = {}) {
    const nm = waterNormal().clone(); nm.needsUpdate = true; nm.repeat.set(o.repeat ?? w / 14, o.repeat ?? d / 14);
    const mat = new T.MeshStandardMaterial({ color: o.color ?? 0x1c4a66, roughness: o.rough ?? .08, metalness: .02, normalMap: nm, normalScale: new T.Vector2(o.wave ?? .55, o.wave ?? .55), envMapIntensity: o.env ?? 1.6, transparent: o.opacity != null, opacity: o.opacity ?? 1 });
    // two sizes of ripples mixed together, calmer far away, so the pattern never looks like tiles
    mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `
      vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
      vec3 mapN2 = texture2D( normalMap, vUv * 0.23 + vec2( 0.43, 0.17 ) ).xyz * 2.0 - 1.0;
      vec3 mapN3 = texture2D( normalMap, vUv * 0.051 - vec2( 0.2, 0.61 ) ).xyz * 2.0 - 1.0;
      mapN = vec3( mapN.xy * 0.5 + mapN2.xy * 0.6 + mapN3.xy * 0.5, 1.0 );
      mapN.xy *= normalScale / ( 1.0 + length( vViewPosition ) * 0.012 );
      normal = perturbNormal2Arb( -vViewPosition, normal, mapN, faceDirection );`); };
    mat.customProgramCacheKey = () => 'water';
    const m = new T.Mesh(new T.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
    m.tick = dt => { nm.offset.x += dt * (o.flowX ?? .012); nm.offset.y += dt * (o.flowY ?? .007); };
    return m;
  }

  /* ---------------------------------------------------------------- bark, rock and skin */
  const bark = (kind = 'bark') => once('bark_' + kind, () => {
    if (kind === 'scale') {   // lycopod / cycad trunks: a diamond pattern
      const n = tileFbm(4, 4, 61);
      return texOf(paint(128, 256, (u, v) => { const a = (u * 6 + v * 8) % 1, b = (u * 6 - v * 8 + 8) % 1, edge = Math.min(Math.min(a, 1 - a), Math.min(b, 1 - b)), k = (.55 + n(u, v) * .35) * (.55 + sm(0, .12, edge) * .45); return [k * 235, k * 225, k * 200]; }));
    }
    const n = tileFbm(4, 5, 63), streak = tileNoise(32, 65);
    return texOf(paint(128, 256, (u, v) => { const s = streak(u * 32, v * 3), crack = sm(.62, .8, s), k = (.5 + n(u, v) * .45) * (1 - crack * .5); return [k * 230, k * 215, k * 195]; }));
  });
  const rockTex = () => detail('rock');
  function rockMat(color = 0x8a8278, o = {}) {
    const t = rockTex().clone(); t.needsUpdate = true; t.repeat.set(o.repeat ?? 2, o.repeat ?? 2);
    return new T.MeshStandardMaterial({ color, map: t, bumpMap: t, bumpScale: o.bump ?? .04, roughness: .92 });
  }
  // dinosaur skin: pebbly scales and blotches; fur: long strands (mammoth)
  const skinTex = kind => once('skin_' + kind, () => {
    if (kind === 'fur') {
      const c = paint(256, 256, () => [190, 190, 190]), g = c.getContext('2d'), r = seeded(71);
      for (let i = 0; i < 7000; i++) { const x = r() * 256, y = r() * 256, l = 8 + r() * 18, k = 90 + r() * 165; g.strokeStyle = `rgba(${k},${k},${k},.55)`; g.lineWidth = .7 + r(); wrapDraw(g, 256, 256, x, y, q => { q.beginPath(); q.moveTo(0, 0); q.quadraticCurveTo(r() * 4 - 2, l / 2, r() * 6 - 3, l); q.stroke(); }); }
      return texOf(c);
    }
    const n = tileFbm(4, 5, 73), blot = tileFbm(2, 3, 75), cell = tileNoise(48, 77);
    return texOf(paint(256, 256, (u, v) => {
      const c = cell(u * 48, v * 48), b = sm(.45, .62, blot(u, v)), k = (.72 + n(u, v) * .3) * (1 - b * .22) * (.82 + sm(.35, .7, c) * .18);
      return [k * 250, k * 248, k * 240];
    }));
  });
  function skin(color, kind = 'scales', o = {}) {
    const t = skinTex(kind).clone(); t.needsUpdate = true; t.repeat.set(o.repeat ?? 3, o.repeat ?? 2);
    return new T.MeshStandardMaterial({ color, map: t, bumpMap: t, bumpScale: o.bump ?? (kind === 'fur' ? .05 : .03), roughness: kind === 'fur' ? 1 : .78, envMapIntensity: .5 });
  }

  /* ---------------------------------------------------------------- leaves, needles, fronds and grass blades (cut-out pictures on flat cards) */
  const LEAF = {
    broad: () => {     // a round bunch of leaves
      const c = canvas(256, 256), g = c.getContext('2d'), r = seeded(81);
      for (let i = 0; i < 420; i++) {
        const a = r() * 6.283, d = Math.sqrt(r()) * 108, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, s = 7 + r() * 8, shade = .55 + (1 - y / 256) * .35 + r() * .25;
        g.fillStyle = `rgb(${Math.round(70 * shade)},${Math.round(125 * shade)},${Math.round(45 * shade)})`;
        g.save(); g.translate(x, y); g.rotate(r() * 6.283); g.beginPath(); g.ellipse(0, 0, s, s * .5, 0, 0, 6.283); g.fill();
        g.strokeStyle = 'rgba(30,50,20,.4)'; g.lineWidth = .8; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); g.restore();
      }
      return c;
    },
    needle: () => {    // a conifer branch with needles
      const c = canvas(256, 256), g = c.getContext('2d'), r = seeded(83);
      for (let b = 0; b < 5; b++) {
        const y0 = 30 + b * 46 + r() * 10;
        g.fillStyle = 'rgba(34,70,46,.85)'; g.beginPath(); g.ellipse(128, y0, 118, 15, 0, 0, 6.283); g.fill();
        g.strokeStyle = '#4a3a28'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, y0); g.lineTo(246, y0 + (r() - .5) * 14); g.stroke();
        for (let i = 0; i < 300; i++) { const x = 12 + r() * 232, y = y0 + (x - 10) / 236 * 0 + (r() - .5) * 4, l = 10 + r() * 14, a = (r() < .5 ? -1 : 1) * (.5 + r() * .9), k = .6 + r() * .4; g.strokeStyle = `rgb(${Math.round(38 * k)},${Math.round(80 * k)},${Math.round(52 * k)})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l * .4, y + Math.sin(a) * l); g.stroke(); }
      }
      return c;
    },
    frond: () => {     // a fern / cycad frond: stem up the middle, leaflets getting smaller to the tip
      const c = canvas(128, 512), g = c.getContext('2d'), r = seeded(85);
      g.strokeStyle = '#5a6a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 512); g.lineTo(64, 4); g.stroke();
      for (let y = 500; y > 8; y -= 7) {
        const t = 1 - y / 512, len = 58 * Math.sin(Math.min(1, t * 1.15) * Math.PI) * (.9 + r() * .15) + 4, k = .7 + r() * .3;
        for (const s of [-1, 1]) { g.fillStyle = `rgb(${Math.round(64 * k)},${Math.round(122 * k)},${Math.round(40 * k)})`; g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 + s * len * .5, y - 9, 64 + s * len, y - 14); g.quadraticCurveTo(64 + s * len * .5, y - 1, 64, y + 4); g.fill(); }
      }
      return c;
    },
    grass: () => {
      const c = canvas(256, 128), g = c.getContext('2d'), r = seeded(87);
      for (let i = 0; i < 70; i++) { const x = 8 + r() * 240, h = 50 + r() * 76, lean = (r() - .5) * 40, w = 3 + r() * 3, k = .6 + r() * .45; g.fillStyle = `rgb(${Math.round(92 * k)},${Math.round(140 * k)},${Math.round(52 * k)})`; g.beginPath(); g.moveTo(x - w, 128); g.quadraticCurveTo(x + lean * .3, 128 - h * .6, x + lean, 128 - h); g.quadraticCurveTo(x + lean * .3 + w * .5, 128 - h * .5, x + w, 128); g.fill(); }
      return c;
    },
    horsetail: () => {
      const c = canvas(128, 256), g = c.getContext('2d'), r = seeded(89);
      for (let i = 0; i < 14; i++) { const x = 10 + r() * 108, h = 140 + r() * 110, k = .65 + r() * .35; g.strokeStyle = `rgb(${Math.round(90 * k)},${Math.round(130 * k)},${Math.round(60 * k)})`; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 256); g.lineTo(x + (r() - .5) * 14, 256 - h); g.stroke(); for (let y = 256 - 14; y > 256 - h; y -= 12) { g.lineWidth = 1; g.beginPath(); g.moveTo(x - 7, y + 4); g.lineTo(x, y); g.lineTo(x + 7, y + 4); g.stroke(); } }
      return c;
    }
  };
  const leafTex = kind => once('leaf_' + kind, () => { const t = texOf(LEAF[kind](), false); t.premultiplyAlpha = false; return t; });
  const leafMats = {};
  function leafMat(kind, color = 0xffffff) {
    const k = kind + color; if (leafMats[k]) return leafMats[k];
    const t = leafTex(kind);
    const m = new T.MeshStandardMaterial({ map: t, color, alphaTest: .38, side: T.DoubleSide, roughness: .85, envMapIntensity: .5 });
    m.depthMat = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: t, alphaTest: .45, side: T.DoubleSide });
    return (leafMats[k] = m);
  }

  /* ---------------------------------------------------------------- building geometry from cards and strips */
  function Builder() {
    const P = [], N = [], U = [], I = [];
    const vtx = (p, n, u, v) => { P.push(p.x, p.y, p.z); N.push(n.x, n.y, n.z); U.push(u, v); return P.length / 3 - 1; };
    return {
      // a flat card of size w x h centred at c, turned by quaternion q; normals point away from 'from' (a soft round look)
      card(c, w, h, q, from, upMix = .35) {
        const ax = V3(1, 0, 0).applyQuaternion(q), ay = V3(0, 1, 0).applyQuaternion(q), base = P.length / 3;
        const corners = [[-.5, -.5, 0, 0], [.5, -.5, 1, 0], [.5, .5, 1, 1], [-.5, .5, 0, 1]];
        for (const [a, b, u, v] of corners) { const p = c.clone().addScaledVector(ax, a * w).addScaledVector(ay, b * h); const n = p.clone().sub(from).normalize().lerp(V3(0, 1, 0), upMix).normalize(); vtx(p, n, u, v); }
        I.push(base, base + 1, base + 2, base, base + 2, base + 3);
      },
      // a bent strip (frond / blade) from 'root' going out along azimuth az, rising at angle el, drooping by 'droop'
      strip(root, len, wid, az, el, droop, seg = 6, twist = 0) {
        const base = P.length / 3, side = V3(-Math.sin(az), 0, -Math.cos(az)).multiplyScalar(-1);
        for (let i = 0; i <= seg; i++) {
          const t = i / seg, d = t * len, x = Math.cos(el) * d, y = Math.sin(el) * d - droop * d * d / len;
          const centre = root.clone().add(V3(Math.cos(az) * x, y, -Math.sin(az) * x)), sv = side.clone().applyAxisAngle(V3(Math.cos(az), 0, -Math.sin(az)), twist * t);
          const n = V3(0, 1, 0).lerp(V3(Math.cos(az), 0, -Math.sin(az)), .25).normalize();
          vtx(centre.clone().addScaledVector(sv, -wid / 2), n, 0, t); vtx(centre.clone().addScaledVector(sv, wid / 2), n, 1, t);
          if (i) { const a = base + (i - 1) * 2; I.push(a, a + 1, a + 3, a, a + 3, a + 2); }
        }
      },
      geo() { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeBoundingSphere(); return g; },
      empty: () => !I.length
    };
  }
  // join several geometries (each already moved into place) into one
  function merge(list) {
    const P = [], N = [], U = [];
    for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; const p = g.attributes.position.array, n = g.attributes.normal.array, u = g.attributes.uv ? g.attributes.uv.array : new Float32Array(p.length / 3 * 2); P.push(...p); N.push(...n); U.push(...u); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.computeBoundingSphere(); return g;
  }
  const limb = (r0, r1, len, from, dir, seg = 8) => { const g = new T.CylinderGeometry(r1, r0, len, seg, 1, true); g.translate(0, len / 2, 0); const q = new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize()); g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q)); g.translate(from.x, from.y, from.z); return g; };
  const randQ = r => new T.Quaternion().setFromEuler(new T.Euler(r() * 6.283, r() * 6.283, r() * 6.283));

  /* ---------------------------------------------------------------- plants. Each kind has a few shapes that are shared, so big forests stay quick */
  const PLANTS = {
    // a leafy tree (oak / neem-like)
    broad(r) {
      const H = 9 + r() * 3, trunkH = H * .5, cx = V3(0, H * .64, 0), R = H * .34, b = Builder(), parts = [limb(.42, .26, trunkH + 1, V3(), V3(0, 1, 0))];
      for (let i = 0; i < 4; i++) { const a = r() * 6.283, d = V3(Math.cos(a), 1.1, Math.sin(a)); parts.push(limb(.2, .08, R * 1.1, V3(0, trunkH * .85, 0), d, 6)); }
      for (let i = 0; i < 34; i++) { const u = r(), v = r(), th = u * 6.283, ph = Math.acos(2 * v - 1), rr = R * (.55 + .45 * Math.cbrt(r())); const c = cx.clone().add(V3(Math.sin(ph) * Math.cos(th) * rr, Math.cos(ph) * rr * .75, Math.sin(ph) * Math.sin(th) * rr)); for (let k = 0; k < 2; k++) b.card(c, R * .95, R * .95, randQ(r), cx.clone().add(V3(0, -R * .4, 0))); }
      return { trunk: merge(parts), leaves: b.geo(), leaf: 'broad', bark: 'bark', barkColor: 0x8a7a68 };
    },
    // spruce / pine
    conifer(r) {
      const H = 14 + r() * 6, b = Builder(), parts = [limb(.45, .1, H, V3(), V3(0, 1, 0))];
      for (let y = H * .22; y < H; y += .55 + r() * .3) { const t = (y - H * .22) / (H * .78), rad = (1 - t) * H * .24 + .4, n = Math.max(3, Math.round(rad * 2.2)); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + r(), q = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2 + .25 + r() * .2, a, 0, 'YXZ')); const c = V3(Math.cos(a) * rad * .5, y - rad * .12, -Math.sin(a) * rad * .5); b.card(c, rad * 1.15, rad * .9, q, V3(0, y - rad, 0), .25); } }
      return { trunk: merge(parts), leaves: b.geo(), leaf: 'needle', bark: 'bark', barkColor: 0x7a6250 };
    },
    // Jurassic monkey-puzzle style: tall bare trunk, a dome of branches at the top
    araucaria(r) {
      const H = 18 + r() * 8, b = Builder(), parts = [limb(.55, .15, H, V3(), V3(0, 1, 0))];
      for (let y = H * .62; y < H; y += .9) { const t = (y - H * .62) / (H * .38), rad = Math.sin((1 - t * .85) * Math.PI * .5) * H * .2 + .5; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + y, d = V3(Math.cos(a), .15 - t * .2, -Math.sin(a)); parts.push(limb(.1, .04, rad, V3(0, y, 0), d, 5)); const c = V3(0, y, 0).addScaledVector(d.normalize(), rad * .55); const q = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2 + .2, a, 0, 'YXZ')); b.card(c, rad * 1.1, rad * .7, q, V3(0, y - 2, 0), .3); b.card(c.clone().add(V3(0, .3, 0)), rad * .9, rad * .6, randQ(r), V3(0, y - 2, 0), .3); } }
      return { trunk: merge(parts), leaves: b.geo(), leaf: 'needle', bark: 'bark', barkColor: 0x8a6a50 };
    },
    cycad(r) {
      const H = 1.4 + r() * 1.4, b = Builder(), parts = [limb(.45, .38, H, V3(), V3(0, 1, 0), 10)];
      const n = 14 + (r() * 5 | 0); for (let i = 0; i < n; i++) b.strip(V3(0, H, 0), 2.4 + r() * .8, .9, i / n * 6.283 + r() * .3, .7 + r() * .5, .55, 6);
      return { trunk: merge(parts), leaves: b.geo(), leaf: 'frond', bark: 'scale', barkColor: 0x8a7a5a };
    },
    fern(r) {
      const b = Builder(), n = 10 + (r() * 6 | 0); for (let i = 0; i < n; i++) b.strip(V3(0, .05, 0), 1.4 + r() * .7, .7, i / n * 6.283 + r() * .4, .9 + r() * .4, .75, 6, (r() - .5) * .6);
      return { leaves: b.geo(), leaf: 'frond' };
    },
    treefern(r) {
      const H = 4 + r() * 3, b = Builder(), parts = [limb(.3, .24, H, V3(), V3((r() - .5) * .1, 1, 0), 8)];
      const n = 12 + (r() * 4 | 0); for (let i = 0; i < n; i++) b.strip(V3(0, H, 0), 3 + r(), 1.1, i / n * 6.283 + r() * .3, .5 + r() * .4, .9, 7);
      return { trunk: merge(parts), leaves: b.geo(), leaf: 'frond', bark: 'scale', barkColor: 0x8a7458 };
    },
    // Carboniferous scale tree: tall trunk that forks into bottle-brush tufts
    lycopod(r) {
      const H = 18 + r() * 10, b = Builder(), parts = [limb(.85, .45, H, V3(), V3(0, 1, 0), 10)];
      const tips = [];
      const fork = (p, d, len, rad, lvl) => { const g = limb(rad, rad * .7, len, p, d, 7); parts.push(g); const e = p.clone().addScaledVector(d.clone().normalize(), len); if (lvl < 2) { const s = V3(d.z, 0, -d.x).normalize(); fork(e, d.clone().normalize().addScaledVector(s, .6), len * .75, rad * .7, lvl + 1); fork(e, d.clone().normalize().addScaledVector(s, -.6), len * .75, rad * .7, lvl + 1); } else tips.push([e, d.clone().normalize()]); };
      for (let i = 0; i < 2; i++) { const a = i * Math.PI + r(); fork(V3(0, H, 0), V3(Math.cos(a) * .6, 1, Math.sin(a) * .6), 3, .4, 1); }
      for (const [e, d] of tips) for (let k = 0; k < 4; k++) b.card(e.clone().addScaledVector(d, .8 + k * .4), 2.2, 2.2, randQ(r), e.clone().addScaledVector(d, -1), .2);
      return { trunk: merge(parts), leaves: b.geo(), leaf: 'needle', bark: 'scale', barkColor: 0xa8ac84 };
    },
    horsetail(r) { const b = Builder(); for (let i = 0; i < 3; i++) { const q = new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), i / 3 * Math.PI + r()); b.card(V3(0, 1, 0), 1.2, 2, q, V3(0, -2, 0), .5); } return { leaves: b.geo(), leaf: 'horsetail' }; },
    shrub(r) { const b = Builder(), cx = V3(0, .8, 0); for (let i = 0; i < 10; i++) { const c = cx.clone().add(V3((r() - .5) * 1.6, (r() - .3) * .9, (r() - .5) * 1.6)); b.card(c, 1.5, 1.5, randQ(r), V3(0, -.5, 0)); } return { leaves: b.geo(), leaf: 'broad' }; }
  };
  const VARIANTS = 4;
  function plantShape(kind, v) { return once('p_' + kind + v, () => PLANTS[kind](seeded(1000 + v * 97 + kind.length * 13))); }
  const barkMats = {};
  // one plant as a Group (shares geometry and materials with others of the same kind)
  function plant(kind, o = {}) {
    const v = o.variant ?? ((Math.random() * VARIANTS) | 0), s = plantShape(kind, v), g = new T.Group();
    const tint = o.tint ?? 0xffffff;
    if (s.trunk) { const bk = s.bark + s.barkColor; const bm = barkMats[bk] || (barkMats[bk] = (() => { const t = bark(s.bark).clone(); t.needsUpdate = true; t.repeat.set(2, 4); return new T.MeshStandardMaterial({ color: s.barkColor, map: t, bumpMap: t, bumpScale: .04, roughness: 1, envMapIntensity: .4 }); })()); const m = new T.Mesh(s.trunk, bm); m.castShadow = true; m.receiveShadow = true; g.add(m); }
    if (s.leaves) { const lm = leafMat(s.leaf, tint); const m = new T.Mesh(s.leaves, lm); m.castShadow = true; m.receiveShadow = true; m.customDepthMaterial = lm.depthMat; g.add(m); }
    if (o.scale) g.scale.setScalar(o.scale);
    g.rotation.y = Math.random() * 6.283;
    return g;
  }

  /* ---------------------------------------------------------------- lots of small plants at once (grass, ferns, horsetails) with one draw call */
  function scatter(kind, count, place, o = {}) {
    const r = seeded(o.seed ?? 5);
    let geo, mat;
    if (kind === 'grass') {
      const b = Builder(); for (let i = 0; i < 3; i++) { const q = new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), i / 3 * Math.PI); b.card(V3(0, .3, 0), 1, .6, q, V3(0, -3, 0), .7); }
      geo = b.geo(); mat = leafMat("grass", o.tint ?? 0xffffff).clone();
    } else { const s = plantShape(kind, 0); geo = s.leaves; mat = leafMat(s.leaf, o.tint ?? 0xffffff).clone(); }
    const sway = { value: 0 };
    mat.onBeforeCompile = sh => { sh.uniforms.sway = sway; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float sway;').replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
        transformed.x += sin(sway * 1.7 + ph) * position.y * 0.12; transformed.z += cos(sway * 1.3 + ph) * position.y * 0.08;
      #endif`); };
    mat.customProgramCacheKey = () => 'sway' + kind;
    const im = new T.InstancedMesh(geo, mat, count), m4 = new T.Matrix4(), q = new T.Quaternion(), s3 = V3(), p3 = V3(), col = new T.Color();
    let n = 0;
    for (let tries = 0; n < count && tries < count * 6; tries++) {
      const p = place(r); if (!p) continue;
      const sc = (o.size ?? 1) * (.6 + r() * .8);
      q.setFromAxisAngle(V3(0, 1, 0), r() * 6.283); s3.set(sc, sc * (.8 + r() * .5), sc); p3.set(p[0], p[1], p[2]);
      m4.compose(p3, q, s3); im.setMatrixAt(n, m4);
      col.setHSL((o.hue ?? .25) + (r() - .5) * .05, .12 + r() * .18, .5 + r() * .12); col.multiplyScalar(1.7); im.setColorAt(n, col); n++;
    }
    im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.receiveShadow = true; im.frustumCulled = false;
    im.tick = dt => { sway.value += dt; };
    return im;
  }

  window.NATURE = { sky, skyEnv, outdoor, groundMat, paintGround, detail, water, bark, rockMat, skin, plant, scatter, leafMat, rgb, mixc, tileFbm, paint, texOf, sm };
})();
