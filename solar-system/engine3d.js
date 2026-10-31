/* Shared 3D engine (three.js): real planet maps, a realistic Earth, camera controls and spacecraft models.
   Planet maps live in tex/<name>.js as data: URLs, so they also work when the page is opened straight from a folder. */
'use strict';
const E3 = (() => {
  const T = window.THREE;
  if (!T) return null;
  const TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- planet maps */
  const scripts = {}, texCache = {};
  function loadScript(src) {
    if (!scripts[src]) scripts[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    return scripts[src];
  }
  async function texURI(name) {
    if (!(window.TEXDATA && TEXDATA[name])) { try { await loadScript('tex/' + name + '.js'); } catch (e) { return null; } }
    return window.TEXDATA && TEXDATA[name];
  }
  // returns a texture straight away; its picture arrives when the map has loaded
  function tex(name, opts = {}) {
    const key = name + (opts.repeat ? '|r' : '');
    if (texCache[key]) return texCache[key];
    const t = new T.Texture(); t.anisotropy = 8; t.loaded = false;
    if (opts.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    t.ready = texURI(name).then(uri => new Promise(res => {
      if (!uri) { res(t); return; }
      const img = new Image();
      img.onload = () => { t.image = img; t.needsUpdate = true; t.loaded = true; res(t); };
      img.onerror = () => res(t);
      img.src = uri;
    }));
    texCache[key] = t; return t;
  }
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  const glowTex = (() => { let t; return () => t || (t = canvasTex(256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.18, 'rgba(255,255,255,.55)'); r.addColorStop(.45, 'rgba(255,255,255,.14)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); })); })();
  function glow(color, size, opacity = 1) {
    const m = new T.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });
    const s = new T.Sprite(m); s.scale.set(size, size, 1); return s;
  }

  /* ---------------------------------------------------------------- renderer + resizing */
  // one WebGL renderer for the whole app; each 3D view borrows its canvas
  let shared = null;
  function renderer() {
    if (shared) return shared;
    const c = document.createElement('canvas'); c.className = 'gl'; c.setAttribute('aria-hidden', 'true');
    shared = new T.WebGLRenderer({ canvas: c, antialias: true, powerPreference: 'high-performance' });
    shared.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    shared.setClearColor(0x050817, 1);
    shared.shadowMap.type = T.PCFSoftShadowMap;
    return shared;
  }
  // put the 3D canvas just behind a view's 2D overlay canvas
  function attach(overlay) {
    const r = renderer(), c = r.domElement;
    if (c.nextSibling !== overlay) overlay.parentNode.insertBefore(c, overlay);
    c.hidden = false; return r;
  }
  function rod(a, b, r, m) {
    const d = new T.Vector3().subVectors(b, a), c = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), 8), m);
    c.position.copy(a).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return c;
  }
  function fit(r, cam) {
    const c = r.domElement, w = c.clientWidth | 0, h = c.clientHeight | 0;
    if (!w || !h) return false;
    const s = r.getSize(new T.Vector2());
    if (s.x !== w || s.y !== h) r.setSize(w, h, false);
    if (Math.abs(cam.aspect - w / h) > 1e-4) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
    return true;
  }
  // soft light from all around so shiny metal and gold foil look right
  function envFor(r) {
    if (r._env) return r._env;
    const t = canvasTex(512, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9FB4D8'); gr.addColorStop(.48, '#3C4A6E'); gr.addColorStop(.52, '#2A2620'); gr.addColorStop(1, '#0A0A10');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const s = g.createRadialGradient(w * .3, h * .3, 0, w * .3, h * .3, 60); s.addColorStop(0, 'rgba(255,250,235,1)'); s.addColorStop(1, 'rgba(255,250,235,0)'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    });
    t.mapping = T.EquirectangularReflectionMapping;
    const pm = new T.PMREMGenerator(r); r._env = pm.fromEquirectangular(t).texture; pm.dispose();
    return r._env;
  }

  /* ---------------------------------------------------------------- stars */
  function starfield(radius = 4000) {
    const g = new T.Group();
    const sky = new T.Mesh(new T.SphereGeometry(radius, 48, 24), new T.MeshBasicMaterial({ map: tex('stars'), side: T.BackSide, depthWrite: false, color: 0x9aa0b8 }));
    sky.renderOrder = -10; g.add(sky);
    const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const z = Math.random() * 2 - 1, a = Math.random() * TAU, s = Math.sqrt(1 - z * z), r = radius * .9;
      pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = z * r; pos[i * 3 + 2] = Math.sin(a) * s * r;
      const k = .55 + Math.random() * .45, warm = Math.random();
      col[i * 3] = k * (warm > .8 ? 1 : .85); col[i * 3 + 1] = k * .9; col[i * 3 + 2] = k * (warm < .2 ? 1 : .8);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    g.add(new T.Points(geo, new T.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, depthWrite: false })));
    return g;
  }

  /* ---------------------------------------------------------------- Earth: day side, city lights at night, shiny seas */
  function earthMaterial() {
    return new T.ShaderMaterial({
      uniforms: { day: { value: tex('earth_day') }, night: { value: tex('earth_night') }, spec: { value: tex('earth_spec') }, sunDir: { value: new T.Vector3(1, 0, 0) }, nightBoost: { value: 1.4 } },
      clipping: true,
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vP;
        #include <clipping_planes_pars_vertex>
        void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader: `uniform sampler2D day, night, spec; uniform vec3 sunDir; uniform float nightBoost; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
        #include <clipping_planes_pars_fragment>
        void main(){
          #include <clipping_planes_fragment>
          vec3 n = normalize(vN); float d = dot(n, normalize(sunDir));
          vec3 dayC = texture2D(day, vUv).rgb, nightC = texture2D(night, vUv).rgb; float sea = texture2D(spec, vUv).r;
          float lit = smoothstep(-0.12, 0.35, d);
          vec3 col = dayC * (0.04 + 1.05 * max(d, 0.0) + 0.12 * lit);
          vec3 v = normalize(cameraPosition - vP); vec3 h = normalize(normalize(sunDir) + v);
          col += vec3(1.0, 0.92, 0.78) * pow(max(dot(n, h), 0.0), 90.0) * sea * 0.32 * lit;
          col += nightC * nightC * nightBoost * 1.6 * (1.0 - smoothstep(-0.25, 0.12, d));
          float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          col += vec3(0.3, 0.55, 1.0) * rim * smoothstep(-0.3, 0.4, d) * 0.6;
          gl_FragColor = vec4(col, 1.0);
        }`
    });
  }
  function atmosphere(r, color, strength = 1, scale = 1.035) {
    const m = new T.ShaderMaterial({
      uniforms: { c: { value: new T.Color(color) }, s: { value: strength }, sunDir: { value: new T.Vector3(1, 0, 0) } },
      vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 c; uniform float s; uniform vec3 sunDir; varying vec3 vN; varying vec3 vP;
        void main(){ vec3 v = normalize(cameraPosition - vP); float f = pow(1.0 - abs(dot(normalize(vN), v)), 2.2);
          float lit = smoothstep(-0.35, 0.45, dot(normalize(vN), normalize(sunDir)));
          gl_FragColor = vec4(c, f * s * (0.15 + 0.85 * lit)); }`,
      transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.FrontSide
    });
    const mesh = new T.Mesh(new T.SphereGeometry(r * scale, 64, 32), m); mesh.isAtmo = true; return mesh;
  }
  function ringGeometry(inner, outer) {
    const g = new T.RingGeometry(inner, outer, 160, 1), p = g.attributes.position, uv = g.attributes.uv, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); uv.setXY(i, (v.length() - inner) / (outer - inner), .5); }
    return g;
  }

  /* ---------------------------------------------------------------- a planet, ready to drop into any scene */
  const LOOK = {
    sun: { map: 'sun' }, mercury: { map: 'mercury', bump: null, rough: 1 }, venus: { map: 'venus', atmo: [0xffd8a0, .9] },
    earth: { earth: true }, moon: { map: 'moon', bump: 'moon_bump', bumpScale: .025 }, mars: { map: 'mars', bump: 'mars_bump', bumpScale: .02, atmo: [0xff9a70, .45] },
    jupiter: { map: 'jupiter', atmo: [0xffe2c0, .25] }, saturn: { map: 'saturn', rings: 'saturn', tilt: .47, atmo: [0xffeacc, .2] }, uranus: { map: 'uranus', rings: 'uranus', tilt: 1.71, atmo: [0xbff6ff, .5] },
    neptune: { map: 'neptune', atmo: [0x7aa4ff, .55] }, pluto: { map: 'pluto' }, ceres: { map: 'ceres' }, io: { map: 'io' }, europa: { map: 'europa' }, ganymede: { map: 'ganymede' },
    titan: { color: 0xd9a24a, atmo: [0xffb35a, 1.2] }, charon: { map: 'moon', tint: 0x9a948c }, callisto: { map: 'moon', tint: 0x7a6e60 }
  };
  const BASE = { mercury: 0x9a9088, venus: 0xd9b070, earth: 0x3060b0, moon: 0x9a9a96, mars: 0xb5603a, jupiter: 0xc9a27a, saturn: 0xd9c08a, uranus: 0x9ad8e0, neptune: 0x4a70d8, pluto: 0xc8a080, ceres: 0x77706a, io: 0xd8c860, europa: 0xc8b8a0, ganymede: 0x8a8070 };
  function planet(id, r, opts = {}) {
    const L = LOOK[id] || {}, g = new T.Group(), spin = new T.Group();
    g.add(spin); g.spin = spin; g.radius = r; g.pid = id;
    const seg = opts.seg || 96;
    if (id === 'sun') {
      const mat = new T.MeshBasicMaterial({ map: tex('sun'), color: 0xffffff });
      spin.add(new T.Mesh(new T.SphereGeometry(r, seg, seg / 2), mat));
      g.add(glow(0xffd27a, r * 3.2, .9)); g.add(glow(0xff8a30, r * 7, .5));
      g.body = spin.children[0]; return g;
    }
    let mat;
    if (L.earth) mat = earthMaterial();
    else {
      mat = new T.MeshStandardMaterial({ color: L.map ? 0xffffff : (L.color || 0x888888), roughness: L.rough ?? .95, metalness: 0 });
      if (L.map) { mat.color.set(BASE[id] || 0x888888); const t = tex(L.map); mat.map = null; t.ready.then(() => { mat.map = t; mat.color.set(L.tint || 0xffffff); mat.needsUpdate = true; }); }
      if (L.bump && !opts.noBump) { const b = tex(L.bump); b.ready.then(() => { mat.bumpMap = b; mat.bumpScale = (L.bumpScale || .02) * r; mat.needsUpdate = true; }); }
    }
    const body = new T.Mesh(new T.SphereGeometry(r, seg, seg / 2), mat); spin.add(body); g.body = body;
    if (L.earth) {
      const cm = new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, depthWrite: false, opacity: .95 });
      const ct = tex('earth_clouds'); ct.ready.then(() => { cm.alphaMap = ct; cm.needsUpdate = true; });
      cm.opacity = 0; ct.ready.then(() => { cm.opacity = .95; });
      const clouds = new T.Mesh(new T.SphereGeometry(r * 1.008, seg, seg / 2), cm); g.clouds = clouds; spin.add(clouds);
      const at = atmosphere(r, 0x5aa0ff, opts.atmoStrength ?? 1.25, opts.atmoScale ?? 1.04); g.add(at); g.atmo = at;
    } else if (L.atmo) { const at = atmosphere(r, L.atmo[0], L.atmo[1], 1.03); g.add(at); g.atmo = at; }
    if (L.rings === 'saturn') {
      const rm = new T.MeshBasicMaterial({ map: tex('saturn_ring'), transparent: true, side: T.DoubleSide, depthWrite: false, color: 0xd8d0c0 });
      const ring = new T.Mesh(ringGeometry(r * 1.24, r * 2.27), rm); ring.rotation.x = -Math.PI / 2; g.ring = ring; g.add(ring);
    } else if (L.rings === 'uranus') {
      const rm = new T.MeshBasicMaterial({ color: 0xbfe8ee, transparent: true, opacity: .28, side: T.DoubleSide, depthWrite: false });
      const ring = new T.Mesh(ringGeometry(r * 1.6, r * 2.0), rm); ring.rotation.x = -Math.PI / 2; g.ring = ring; g.add(ring);
    }
    if (L.tilt && !opts.noTilt) g.rotation.z = L.tilt;
    if (id === 'earth' && !opts.noTilt) g.rotation.z = .41;
    return g;
  }
  // keep Earth's day/night line and the glow pointing at the Sun
  const _v = new T.Vector3(), _w = new T.Vector3();
  function lightPlanet(p, sunWorld) {
    p.getWorldPosition(_w); _v.copy(sunWorld).sub(_w).normalize();
    if (p.body && p.body.material.uniforms && p.body.material.uniforms.sunDir) p.body.material.uniforms.sunDir.value.copy(_v);
    if (p.atmo) p.atmo.material.uniforms.sunDir.value.copy(_v);
  }
  function lightDir(p, dir) {
    if (p.body && p.body.material.uniforms && p.body.material.uniforms.sunDir) p.body.material.uniforms.sunDir.value.copy(dir).normalize();
    if (p.atmo) p.atmo.material.uniforms.sunDir.value.copy(dir).normalize();
  }
  // map coordinates on a planet sphere (three.js puts longitude 0 on +X, east towards −Z)
  function latLonToVec(lat, lon, r = 1) {
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    return new T.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
  }
  function vecToLatLon(v) { const n = v.clone().normalize(); return { lat: Math.asin(n.y) * 180 / Math.PI, lon: Math.atan2(-n.z, n.x) * 180 / Math.PI }; }

  /* ---------------------------------------------------------------- camera that circles a target: drag to turn, pinch or scroll to zoom */
  class Orbit {
    constructor(cam, el, o = {}) {
      this.cam = cam; this.el = el; this.target = new T.Vector3(); this.goal = new T.Vector3(); this.off = new T.Vector3();
      this.dist = o.dist || 10; this.goalDist = this.dist; this.yaw = o.yaw || 0; this.pitch = o.pitch ?? .4; this.goalYaw = this.yaw; this.goalPitch = this.pitch;
      this.min = o.min || 1; this.max = o.max || 1000; this.minPitch = o.minPitch ?? -1.45; this.maxPitch = o.maxPitch ?? 1.45; this.follow = null; this.onTap = null; this.enabled = true; this.auto = 0;
      const pts = new Map(); let down = null, moved = false, pinch = 0, pd = 0;
      el.addEventListener('pointerdown', e => { if (!this.enabled) return; el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); down = [e.clientX, e.clientY]; moved = false; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); pd = this.goalDist; } });
      el.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId)) return;
        const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); this.goalDist = Math.min(this.max, Math.max(this.min, pd * pinch / Math.max(1, d))); moved = true; return; }
        if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) moved = true;
        if (moved && this.enabled) { this.dragAt = performance.now(); this.goalYaw -= (e.clientX - prev[0]) * .006; this.goalPitch = Math.min(this.maxPitch, Math.max(this.minPitch, this.goalPitch + (e.clientY - prev[1]) * .005)); this.auto = 0; }
      });
      const up = e => { const was = pts.has(e.pointerId); pts.delete(e.pointerId); if (was && !moved && pts.size === 0 && this.onTap) { const r = el.getBoundingClientRect(); this.onTap(e.clientX - r.left, e.clientY - r.top); } if (!pts.size) down = null; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => { pts.delete(e.pointerId); down = null; });
      el.addEventListener('wheel', e => { if (!this.enabled) return; e.preventDefault(); this.zoom(Math.exp(e.deltaY * .0012)); }, { passive: false });
    }
    zoom(k) { this.goalDist = Math.min(this.max, Math.max(this.min, this.goalDist * k)); }
    // call after changing goal or follow: the camera glides there, then sticks to it exactly
    retarget() { if (this.follow) this.follow(this.goal); this.off.copy(this.target).sub(this.goal); }
    update(dt) {
      if (this.follow) this.follow(this.goal);
      if (this.auto) this.goalYaw += this.auto * dt;
      const k = 1 - Math.exp(-dt * 4);
      this.off.multiplyScalar(1 - k); this.target.copy(this.goal).add(this.off); this.yaw += (this.goalYaw - this.yaw) * k; this.pitch += (this.goalPitch - this.pitch) * k;
      this.dist = Math.exp(Math.log(this.dist) + (Math.log(this.goalDist) - Math.log(this.dist)) * k);
      const cp = Math.cos(this.pitch);
      _o.set(Math.sin(this.yaw) * cp * this.dist, Math.sin(this.pitch) * this.dist, Math.cos(this.yaw) * cp * this.dist);
      if (this.quat) { _o.applyQuaternion(this.quat); this.cam.up.set(0, 1, 0).applyQuaternion(this.quat); } else this.cam.up.set(0, 1, 0);
      this.cam.position.copy(this.target).add(_o);
      this.cam.lookAt(this.target);
    }
    snap() { this.off.set(0, 0, 0); this.target.copy(this.goal); this.yaw = this.goalYaw; this.pitch = this.goalPitch; this.dist = this.goalDist; }
  }
  const _p = new T.Vector3(), _o = new T.Vector3();
  // render a scene from any camera into a 2D canvas (spacecraft photos, icons)
  function snapshot(scene, cam, w, h, clear = 0x000000, alpha = 1) {
    const r = renderer(), rt = new T.WebGLRenderTarget(w, h, { samples: 4 }), px = new Uint8Array(w * h * 4);
    const old = r.getRenderTarget(), oc = r.getClearColor(new T.Color()), oa = r.getClearAlpha();
    r.setRenderTarget(rt); r.setClearColor(clear, alpha); r.clear(); r.render(scene, cam); r.readRenderTargetPixels(rt, 0, 0, w, h, px);
    r.setRenderTarget(old); r.setClearColor(oc, oa); rt.dispose();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    g.putImageData(img, 0, 0); return c;
  }
  function toScreen(v, cam, w, h) { _p.copy(v).project(cam); return { x: (_p.x + 1) / 2 * w, y: (1 - _p.y) / 2 * h, front: _p.z < 1 && _p.z > -1 }; }

  /* ---------------------------------------------------------------- materials for spacecraft */
  const MAT = {};
  function mats(r) {
    if (MAT.ready) return MAT;
    const foil = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#C9922E'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { const x = Math.random() * w, y = Math.random() * h, s = 8 + Math.random() * 30; g.fillStyle = `rgba(${Math.random() < .5 ? '255,226,140' : '120,72,16'},${.15 + Math.random() * .25})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + Math.random() * s * .6); g.lineTo(x + Math.random() * s * .5, y + s); g.fill(); }
    }, true);
    const cells = (bg, line, n) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = line; g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w / n, 0); g.lineTo(i * w / n, h); g.moveTo(0, i * h / n); g.lineTo(w, i * h / n); g.stroke(); } }, true);
    const env = r ? envFor(r) : null;
    Object.assign(MAT, {
      ready: true,
      foil: new T.MeshStandardMaterial({ map: foil, color: 0xffffff, metalness: .85, roughness: .32, envMap: env }),
      silverFoil: new T.MeshStandardMaterial({ map: foil, color: 0xd8dbe6, metalness: .9, roughness: .3, envMap: env }),
      panel: new T.MeshStandardMaterial({ map: cells('#162A6B', '#8FA6D8', 8), metalness: .4, roughness: .35, envMap: env, side: T.DoubleSide }),
      goldPanel: new T.MeshStandardMaterial({ map: cells('#9A6A1E', '#E6C27A', 10), metalness: .6, roughness: .4, envMap: env, side: T.DoubleSide }),
      white: new T.MeshStandardMaterial({ color: 0xe9ecf2, roughness: .65, metalness: .05, envMap: env }),
      grey: new T.MeshStandardMaterial({ color: 0x8a90a2, roughness: .5, metalness: .5, envMap: env }),
      dark: new T.MeshStandardMaterial({ color: 0x22252f, roughness: .6, metalness: .3, envMap: env }),
      metal: new T.MeshStandardMaterial({ color: 0xc9ced8, roughness: .25, metalness: .95, envMap: env }),
      mirror: new T.MeshStandardMaterial({ color: 0xffcf5a, roughness: .12, metalness: 1, envMap: env, side: T.DoubleSide }),
      shield: new T.MeshStandardMaterial({ color: 0xc8bfe8, roughness: .3, metalness: .85, envMap: env, side: T.DoubleSide, transparent: true, opacity: .92 }),
      orange: new T.MeshStandardMaterial({ color: 0xff7442, roughness: .6 }),
      tyre: new T.MeshStandardMaterial({ color: 0x5a5f6e, roughness: .8, metalness: .4 })
    });
    return MAT;
  }
  const box = (w, h, d, m) => new T.Mesh(new T.BoxGeometry(w, h, d), m);
  const cyl = (rt, rb, h, m, s = 20) => new T.Mesh(new T.CylinderGeometry(rt, rb, h, s), m);
  const sph = (r, m, s = 24) => new T.Mesh(new T.SphereGeometry(r, s, s / 2), m);
  const at = (o, x, y, z, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
  function dishMesh(r, depth, m) {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new T.Vector2(t * r, depth * t * t)); }
    const d = new T.Mesh(new T.LatheGeometry(pts, 40), m); m.side = T.DoubleSide; return d;
  }
  function label(text, bg = '#FF7442', fg = '#fff', w = 256, h = 64) {
    return canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `700 ${h * .55}px Lexend, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); });
  }
  const flagTex = () => canvasTex(96, 64, (g) => { g.fillStyle = '#FF9933'; g.fillRect(0, 0, 96, 22); g.fillStyle = '#fff'; g.fillRect(0, 21, 96, 22); g.fillStyle = '#138808'; g.fillRect(0, 42, 96, 22); g.strokeStyle = '#000080'; g.lineWidth = 2; g.beginPath(); g.arc(48, 32, 8, 0, TAU); g.stroke(); });

  /* ---------------------------------------------------------------- spacecraft models (1 unit is about 1 metre unless noted) */
  const MODELS = {
    // International Space Station, 1 unit = 10 m
    iss() {
      const M = mats(), g = new T.Group();
      g.add(box(10.9, .3, .3, M.grey));
      for (const x of [-4.6, -3.4, 3.4, 4.6]) for (const s of [-1, 1]) { const p = box(1.15, .02, 3.4, M.goldPanel); at(p, x, 0, s * 1.95); g.add(p); const mast = cyl(.03, .03, 3.6, M.metal, 6); at(mast, x, 0, s * 1.95, Math.PI / 2); g.add(mast); }
      for (const x of [-1.6, 1.6]) { const r = box(.9, .02, 2.2, M.white); at(r, x, -.3, 0, .0, 0, 0); r.position.z = -1.4; g.add(r); }
      const mod = (len, rad, x, y, z, rx = 0, rz = 0, m = M.white) => { const c = cyl(rad, rad, len, m, 24); at(c, x, y, z, rx, 0, rz); g.add(c); return c; };
      mod(1.4, .21, 0, -.45, 0, Math.PI / 2); mod(.85, .21, 0, -.45, -1.1, Math.PI / 2); mod(.6, .2, 0, -.45, .95, Math.PI / 2);
      mod(1.25, .2, 0, -.45, 1.85, Math.PI / 2); mod(1.3, .21, 0, -.45, 3.0, Math.PI / 2);
      mod(1.1, .22, .8, -.45, -1.1, 0, Math.PI / 2); mod(.7, .22, -.65, -.45, -1.1, 0, Math.PI / 2);
      for (const s of [-1, 1]) { const p = box(.9, .02, .3, M.panel); at(p, s * .9, -.45, 3.1); g.add(p); }
      const arm = new T.Group(); arm.add(at(cyl(.04, .04, 1.6, M.white, 8), 0, .8, 0)); arm.add(at(cyl(.04, .04, 1.5, M.white, 8), .5, 1.5, 0, 0, 0, -1)); at(arm, 1.2, 0, .2); g.add(arm);
      return g;
    },
    voyager() {
      const M = mats(), g = new T.Group();
      const d = dishMesh(1.8, .55, M.white.clone()); at(d, 0, .1, 0, Math.PI, 0, 0); g.add(d);
      const bus = cyl(.9, .9, .45, M.silverFoil, 10); at(bus, 0, -.35, 0); g.add(bus);
      g.add(at(cyl(.02, .02, 13, M.grey, 4), -6.5, -.4, 0, 0, 0, Math.PI / 2));
      g.add(at(cyl(.03, .03, 2.6, M.grey, 4), 2, -.6, 0, 0, 0, Math.PI / 2 + .3));
      for (let i = 0; i < 3; i++) g.add(at(cyl(.2, .2, .45, M.dark, 12), 2.8 + i * .5, -.2 - i * .12, 0, 0, 0, Math.PI / 2 + .3));
      const rec = cyl(.32, .32, .03, M.mirror, 32); at(rec, .9, -.35, 0, 0, 0, Math.PI / 2); g.add(rec);
      return g;
    },
    parker() {
      const M = mats(), g = new T.Group();
      const shield = cyl(1.15, 1.15, .12, new T.MeshStandardMaterial({ color: 0xf2f0ea, roughness: .8 }), 6); at(shield, 0, 0, 0, Math.PI / 2, 0, 0); shield.position.z = .6; g.add(shield); g.shield = shield;
      const back = cyl(1.15, 1.15, .05, M.dark, 6); at(back, 0, 0, .52, Math.PI / 2); g.add(back);
      const bus = cyl(.45, .55, 1.1, M.dark, 6); at(bus, 0, 0, -.2, Math.PI / 2); g.add(bus);
      for (const s of [-1, 1]) { const p = box(.05, .5, .9, M.panel); at(p, s * .8, 0, -.3); g.add(p); }
      g.add(at(cyl(.02, .02, 1.8, M.grey, 4), 0, 0, -1.4, Math.PI / 2));
      return g;
    },
    juno() {
      const M = mats(), g = new T.Group(), spin = new T.Group(); g.add(spin); g.spinner = spin;
      for (let i = 0; i < 3; i++) { const arm = new T.Group(); arm.rotation.y = i * TAU / 3; const p = box(9, .05, 2.6, M.panel); p.position.x = 5.6; arm.add(p); if (i === 0) { const m = cyl(.08, .08, 1.6, M.grey, 6); at(m, 10.9, 0, 0, 0, 0, Math.PI / 2); arm.add(m); } spin.add(arm); }
      const bus = cyl(1.2, 1.2, 1.4, M.foil, 6); spin.add(bus);
      const d = dishMesh(1.25, .35, M.white.clone()); at(d, 0, .75, 0, Math.PI, 0, 0); spin.add(d);
      return g;
    },
    cassini() {
      const M = mats(), g = new T.Group();
      g.add(at(cyl(.9, .9, 3.6, M.foil, 16), 0, -1.6, 0));
      g.add(at(cyl(.5, .7, 1, M.dark, 16), 0, -3.8, 0));
      const d = dishMesh(2, .6, M.white.clone()); at(d, 0, .4, 0, Math.PI, 0, 0); g.add(d);
      g.add(at(cyl(.03, .03, 11, M.grey, 4), 5.5, -1.2, 0, 0, 0, Math.PI / 2));
      for (let i = 0; i < 3; i++) g.add(at(cyl(.22, .22, 1.2, M.dark, 12), -1.2, -2.4 - i * .1, (i - 1) * .5, 0, 0, .3));
      const hu = new T.Group(); hu.add(at(cyl(1.35, .5, .5, new T.MeshStandardMaterial({ color: 0xe9d8b0, roughness: .7 }), 24), 0, 0, 0)); hu.add(at(cyl(.6, .6, .3, M.foil, 16), 0, .35, 0));
      at(hu, 0, -1.4, 1.3, Math.PI / 2, 0, 0); g.add(hu); g.huygens = hu;
      return g;
    },
    huygens() { const M = mats(), g = new T.Group(); g.add(cyl(1.35, .5, .5, new T.MeshStandardMaterial({ color: 0xe9d8b0, roughness: .7 }), 24)); g.add(at(cyl(.6, .6, .3, M.foil, 16), 0, .35, 0)); return g; },
    newhorizons() {
      const M = mats(), g = new T.Group();
      const b = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, .7, 3), M.foil); g.add(b);
      const d = dishMesh(1.05, .3, M.white.clone()); at(d, 0, .4, 0, Math.PI, 0, 0); g.add(d);
      g.add(at(cyl(.22, .22, 1.6, M.dark, 12), -1.2, -.1, 0, 0, 0, Math.PI / 2 + .5));
      return g;
    },
    vikram() {
      const M = mats(), g = new T.Group();
      const body = box(2, 1.2, 2, M.foil); body.position.y = 1.35; g.add(body); body.castShadow = true;
      const top = box(1.4, .25, 1.4, M.silverFoil); top.position.y = 2.08; g.add(top);
      const panel = box(.05, 1.1, 1.8, M.panel); at(panel, 1.05, 1.4, 0); g.add(panel);
      g.add(at(cyl(.05, .05, .7, M.grey, 6), -.5, 2.5, .5));
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const leg = cyl(.06, .06, 1.35, M.metal, 8); at(leg, x * 1.15, .62, z * 1.15, z * .35, 0, -x * .35); leg.castShadow = true; g.add(leg);
        const pad = cyl(.22, .26, .07, M.metal, 16); at(pad, x * 1.38, .04, z * 1.38); g.add(pad);
      }
      const bell = cyl(.18, .32, .4, M.dark, 16); bell.position.y = .55; g.add(bell);
      const f = new T.Mesh(new T.PlaneGeometry(.5, .33), new T.MeshBasicMaterial({ map: flagTex() })); at(f, 0, 1.45, 1.011); g.add(f);
      const fl = new T.Mesh(new T.ConeGeometry(.28, 2.4, 16, 1, true), new T.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false })); at(fl, 0, -.75, 0, Math.PI, 0, 0); fl.visible = false; g.add(fl); g.flame = fl;
      return g;
    },
    pragyan() {
      const M = mats(), g = new T.Group(); g.wheels = [];
      const body = box(.9, .35, .7, M.foil); body.position.y = .45; g.add(body);
      const sp = box(.9, .03, .75, M.panel); at(sp, -.1, .9, 0, 0, 0, .55); g.add(sp);
      g.add(at(box(.08, .35, .08, M.white), .35, .8, 0)); g.add(at(box(.22, .1, .3, M.white), .35, 1.0, 0));
      for (const x of [-.35, 0, .35]) for (const z of [-.43, .43]) { const w = cyl(.14, .14, .1, M.tyre, 16); at(w, x, .15, z, Math.PI / 2); g.add(w); g.wheels.push(w); }
      return g;
    },
    mangalyaan() {
      const M = mats(), g = new T.Group();
      g.add(box(1.5, 1.5, 1.5, M.foil));
      const p = box(3.6, .04, 1.4, M.panel); p.position.x = 2.6; g.add(p);
      const d = dishMesh(1.1, .3, M.white.clone()); at(d, 0, 1.0, 0, Math.PI, 0, 0); g.add(d);
      const f = new T.Mesh(new T.PlaneGeometry(.5, .33), new T.MeshBasicMaterial({ map: flagTex() })); at(f, 0, 0, .755); g.add(f);
      const fl = new T.Mesh(new T.ConeGeometry(.3, 2.2, 16, 1, true), new T.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false })); at(fl, -1.9, 0, 0, 0, 0, Math.PI / 2); fl.visible = false; g.add(fl); g.flame = fl;
      return g;
    },
    // James Webb: call setShield(0..1) and setMirror(0..1) to unfold it
    webb() {
      const M = mats(), g = new T.Group();
      const shield = new T.Group(); g.add(shield);
      for (let i = 0; i < 5; i++) {
        const s = new T.Shape(); s.moveTo(-10, 0); s.lineTo(0, -5.5); s.lineTo(10, 0); s.lineTo(0, 5.5); s.lineTo(-10, 0);
        const m = new T.Mesh(new T.ShapeGeometry(s), M.shield); m.rotation.x = -Math.PI / 2; m.position.y = -2.2 + i * .28; shield.add(m);
      }
      g.add(at(box(.9, 2.2, .9, M.dark), 0, -1.1, 0));
      const tower = at(box(.5, 1.6, .5, M.dark), 0, 0, -.8); g.add(tower);
      const mirror = new T.Group(); mirror.position.set(0, 2.6, .2); mirror.rotation.x = -.12; g.add(mirror);
      // 18 gold hexagons: a ring of 6 and a ring of 12 around an empty middle; the outer columns fold like wings
      const R = .64, hexGeo = new T.CylinderGeometry(R, R, .07, 6); hexGeo.rotateX(Math.PI / 2); hexGeo.rotateZ(Math.PI / 2);
      const dx = .99, dy = .5715, cols = [[-2, [-2, 0, 2]], [-1, [-3, -1, 1, 3]], [0, [-4, -2, 2, 4]], [1, [-3, -1, 1, 3]], [2, [-2, 0, 2]]];
      const wingL = new T.Group(), wingR = new T.Group(); wingL.position.x = -1.5 * dx; wingR.position.x = 1.5 * dx; mirror.add(wingL); mirror.add(wingR);
      for (const [c, rows] of cols) for (const r of rows) {
        const h = new T.Mesh(hexGeo, M.mirror), wing = c === -2 ? wingL : c === 2 ? wingR : null;
        h.position.set(wing ? (c - Math.sign(c) * 1.5) * dx : c * dx, r * dy, -Math.abs(c) * .06);
        (wing || mirror).add(h);
      }
      const sec = new T.Vector3(0, 0, 3.4);
      for (const a of [new T.Vector3(-1.9, -1.6, 0), new T.Vector3(1.9, -1.6, 0), new T.Vector3(0, 2.4, 0)]) mirror.add(rod(a, sec, .03, M.metal));
      mirror.add(at(cyl(.3, .3, .08, M.mirror, 16), 0, 0, 3.4, Math.PI / 2));
      g.setShield = k => { shield.children.forEach((m, i) => { m.scale.set(.06 + .94 * k, .2 + .8 * k, 1); m.position.y = -2.2 + i * (.06 + .22 * k); }); };
      g.setMirror = k => { wingL.rotation.y = (1 - k) * Math.PI * .92; wingR.rotation.y = -(1 - k) * Math.PI * .92; };
      g.setShield(1); g.setMirror(1);
      return g;
    },
    perseverance() {
      const M = mats(), g = new T.Group(); g.wheels = [];
      const body = box(2.2, .6, 1.9, M.white); body.position.y = 1.1; g.add(body); body.castShadow = true;
      g.add(at(box(2.25, .12, 1.95, M.foil), 0, .78, 0));
      g.add(at(box(.6, .9, .55, M.grey), -1.25, 1.35, 0, 0, 0, -.35));
      const mast = cyl(.07, .07, 1.3, M.white, 8); at(mast, .85, 2.05, .6); g.add(mast);
      const head = box(.35, .25, .55, M.white); at(head, .9, 2.75, .6); g.add(head);
      g.add(at(box(.06, .12, .14, M.dark), 1.08, 2.75, .48)); g.add(at(box(.06, .12, .14, M.dark), 1.08, 2.75, .72));
      for (const x of [-.95, 0, .95]) for (const z of [-.95, .95]) { const w = cyl(.26, .26, .3, M.tyre, 20); at(w, x, .26, z, Math.PI / 2); w.castShadow = true; g.add(w); g.wheels.push(w); }
      for (const z of [-.95, .95]) g.add(at(box(2.2, .06, .06, M.metal), 0, .55, z));
      const arm = new T.Group(); arm.position.set(1.15, 1.0, -.4); g.add(arm); g.arm = arm;
      arm.add(at(cyl(.05, .05, 1, M.white, 8), .5, 0, 0, 0, 0, Math.PI / 2)); arm.add(at(box(.25, .3, .25, M.grey), 1.05, -.1, 0));
      return g;
    },
    ingenuity() {
      const M = mats(), g = new T.Group();
      g.add(at(box(.2, .15, .2, M.white), 0, .32, 0));
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(at(cyl(.008, .008, .4, M.metal, 4), x * .16, .14, z * .16, z * .5, 0, -x * .5));
      g.add(at(cyl(.015, .015, .35, M.metal, 6), 0, .55, 0));
      const r1 = box(1.2, .01, .07, M.dark), r2 = box(1.2, .01, .07, M.dark); r1.position.y = .62; r2.position.y = .7; g.add(r1); g.add(r2); g.rotors = [r1, r2];
      g.add(at(box(.3, .01, .2, M.panel), 0, .75, 0));
      return g;
    },
    capsule() {
      const M = mats(), g = new T.Group();
      const c = cyl(.6, 2, 2.4, M.white, 32); c.rotation.x = Math.PI / 2; g.add(c);
      g.add(at(cyl(2, 2, .25, M.dark, 32), 0, 0, -1.3, Math.PI / 2));
      g.add(at(cyl(.4, .45, .5, M.grey, 24), 0, 0, 1.45, Math.PI / 2));
      return g;
    },
    // Ayansh in his space suit; call pose(walkPhase, armsUp)
    astronaut() {
      const g = new T.Group(), suit = new T.MeshStandardMaterial({ color: 0xf2f3f8, roughness: .7 }), dark = new T.MeshStandardMaterial({ color: 0x5b6491, roughness: .6 });
      const visor = new T.MeshStandardMaterial({ color: 0xffb52e, roughness: .18, metalness: .55, emissive: 0x3a2400 });
      const torso = new T.Mesh(new T.CylinderGeometry(.3, .27, .7, 20), suit); { const sh = sph(.3, suit, 24); sh.scale.y = .6; sh.position.y = .35; torso.add(sh); const hip = sph(.27, suit, 24); hip.scale.y = .5; hip.position.y = -.35; torso.add(hip); }; torso.position.y = 1.15; g.add(torso);
      const pack = box(.5, .62, .25, new T.MeshStandardMaterial({ color: 0xb8c0e0, roughness: .6 })); pack.position.set(0, 1.2, -.3); g.add(pack);
      const head = sph(.27, suit, 32); head.position.y = 1.78; g.add(head);
      const vis = new T.Mesh(new T.SphereGeometry(.285, 32, 16, Math.PI * .08, Math.PI * .84, Math.PI * .26, Math.PI * .4), visor); vis.position.set(0, 1.78, 0); g.add(vis); g.visor = vis;
      const patch = new T.Mesh(new T.PlaneGeometry(.36, .1), new T.MeshBasicMaterial({ map: label('AYANSH') })); patch.position.set(0, 1.3, .3); g.add(patch);
      const flag = new T.Mesh(new T.PlaneGeometry(.16, .11), new T.MeshBasicMaterial({ map: flagTex() })); flag.position.set(.31, 1.42, 0); flag.rotation.y = Math.PI / 2; g.add(flag);
      const limb = (len, r, m) => { const p = new T.Group(), c = new T.Mesh(new T.CylinderGeometry(r, r * .9, len, 12), m); c.position.y = -len / 2; p.add(c); const e = sph(r * 1.05, dark, 12); e.position.y = -len; p.add(e); return p; };
      const legL = limb(.62, .12, suit), legR = limb(.62, .12, suit), armL = limb(.55, .09, suit), armR = limb(.55, .09, suit);
      legL.position.set(-.14, .75, 0); legR.position.set(.14, .75, 0); armL.position.set(-.36, 1.45, 0); armR.position.set(.36, 1.45, 0);
      [legL, legR, armL, armR].forEach(l => g.add(l));
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      g.pose = (phase, up) => {
        const s = Math.sin(phase) * .55;
        legL.rotation.x = s; legR.rotation.x = -s;
        armL.rotation.x = up ? 0 : -s * .8; armR.rotation.x = up ? 0 : s * .8;
        armL.rotation.z = up ? -2.6 : -.15; armR.rotation.z = up ? 2.6 : .15;
      };
      g.pose(0, false);
      return g;
    }
  };

  /* ---------------------------------------------------------------- ground for landing and walking: hills, craters and rocks */
  function noise2(x, y) { return (window.noise3 ? noise3(x, y, .37) : .5); }
  function terrain(o = {}) {
    const size = o.size || 400, seg = o.seg || 160, geo = new T.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, craters = [];
    const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(o.seed || 7);
    for (let i = 0; i < (o.craters || 0); i++) craters.push([(rnd() - .5) * size, (rnd() - .5) * size, 3 + Math.pow(rnd(), 2.5) * (o.craterMax || 25)]);
    const height = (x, z) => {
      let h = 0, a = o.amp ?? 6, f = o.freq ?? .01;
      for (let k = 0; k < 5; k++) { h += (noise2(x * f + 11, z * f - 7) - .5) * a; a *= .5; f *= 2.1; }
      for (const [cx, cz, r] of craters) { const d = Math.hypot(x - cx, z - cz) / r; if (d < 1.3) h += d < 1 ? -(1 - d * d) * r * .22 : (1.3 - d) / .3 * r * .06 * (d - 1) / .3 * 3; }
      if (o.flat) for (const [fx, fz, fr] of o.flat) { const d = Math.hypot(x - fx, z - fz); if (d < fr * 1.6) h *= Math.min(1, Math.max(0, (d - fr) / (fr * .6))); }
      return h;
    };
    for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const mat = new T.MeshStandardMaterial({ color: o.color || 0xffffff, roughness: 1, metalness: 0 });
    if (o.map) { const t = tex(o.map, { repeat: true }); t.repeat.set(o.repeat || 6, (o.repeat || 6) / 2); mat.map = null; t.ready.then(() => { mat.map = t; mat.needsUpdate = true; }); }
    const m = new T.Mesh(geo, mat); m.receiveShadow = true; m.height = height;
    return m;
  }
  function rocks(n, size, mat, heightFn, seed = 3, scale = 1) {
    const g = new T.Group(), rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(seed);
    const geo = new T.DodecahedronGeometry(1, 1), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * (.8 + Math.sin(i * 7.1) * .2), pos.getY(i) * (.6 + Math.cos(i * 3.3) * .15), pos.getZ(i) * (.85 + Math.sin(i * 1.7) * .2));
    geo.computeVertexNormals();
    for (let i = 0; i < n; i++) {
      const r = new T.Mesh(geo, mat), s = (.2 + Math.pow(rnd(), 3) * 1.6) * scale, x = (rnd() - .5) * size, z = (rnd() - .5) * size;
      r.scale.set(s, s, s); r.position.set(x, heightFn(x, z) + s * .2, z); r.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6); r.castShadow = true; r.receiveShadow = true; g.add(r);
    }
    return g;
  }
  function sunLight(scene, dir, intensity = 1.4, shadow = false, span = 40) {
    const l = new T.DirectionalLight(0xffffff, intensity); l.position.copy(dir).multiplyScalar(100);
    if (shadow) { l.castShadow = true; l.shadow.mapSize.set(2048, 2048); const c = l.shadow.camera; c.left = c.bottom = -span; c.right = c.top = span; c.near = 1; c.far = 400; l.shadow.bias = -.0005; }
    scene.add(l); scene.add(l.target); return l;
  }

  return { T, tex, canvasTex, glow, renderer, attach, rod, fit, snapshot, envFor, starfield, planet, lightPlanet, lightDir, atmosphere, Orbit, toScreen, latLonToVec, vecToLatLon, mats, MODELS, terrain, rocks, sunLight, label, flagTex, box, cyl, sph, at, dishMesh, loadScript };
})();
