/* gas.js: real 3D glowing gas for the birth of the solar system.
   Each pixel sends a ray through the cloud and adds up the light it meets on the way, so thick dust hides what is behind it,
   starlight fades as it goes deeper, and the baby Sun shines out through the gaps. It is drawn small and stretched up to the
   screen (clouds are soft, so nobody can tell), which keeps it quick on tablets and phones. */
'use strict';
window.GAS = (() => {
  const T = THREE;
  // one small picture of random dots gives smooth 3D noise with a single lookup (green is red moved by 37, 17)
  function noiseTex() {
    const S = 256, d = new Uint8Array(S * S * 4), r = new Uint8Array(S * S);
    let s = 1234567; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < S * S; i++) r[i] = rnd() * 256;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const o = (y * S + x) * 4; d[o] = r[y * S + x]; d[o + 1] = r[((y + 17) & 255) * S + ((x + 37) & 255)]; d[o + 2] = rnd() * 256; d[o + 3] = 255; }
    const t = new T.DataTexture(d, S, S, T.RGBAFormat); t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = t.minFilter = T.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
  }
  const VS = `varying vec2 vNdc; void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const FS = `
    precision highp float;
    uniform mat4 invProj, camWorld; uniform vec3 camPos; uniform sampler2D noiseTex;
    uniform float time, uK, uEnv, uDisk, uSpin, uCav, uStar, uJet, uHa, uShockR, uShockI, uRd, uExpo, uSNI, uFlat;
    uniform vec3 uStarCol, uL0pos, uL0col, uL1pos, uL1col, uSN, uAmb;
    varying vec2 vNdc;
    const float RB = 1.3;
    float noise(vec3 x){ vec3 p = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy; vec2 rg = texture2D(noiseTex, (uv + 0.5) / 256.0).rg; return mix(rg.x, rg.y, f.z); }
    float fbm5(vec3 p){ float f = 0.5 * noise(p); p *= 2.02; f += 0.25 * noise(p); p *= 2.03; f += 0.125 * noise(p); p *= 2.01; f += 0.0625 * noise(p); p *= 2.02; f += 0.03125 * noise(p); return f / 0.96875; }
    float fbm2(vec3 p){ return (0.5 * noise(p) + 0.25 * noise(p * 2.02)) / 0.75; }
    mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
    // the lumpy cloud, before and while it falls in: ragged wisps outside, thick knots inside
    float cloud(vec3 p, float hi){
      float l = length(p * vec3(0.86, 1.12, 1.0));
      if (l > 1.3) return 0.0;
      l += (noise(p * 1.25 + 11.3) - 0.5) * 0.7 * smoothstep(0.1, 0.6, l);                   // a lumpy outline, not a ball
      vec3 q = p * 2.1 + vec3(3.1, 1.7, 0.4) + vec3(0.0, time * 0.004, time * 0.01);
      float w = noise(q * 0.9 + 7.1); q += (vec3(w, 1.0 - w, w * w) - 0.45) * 1.7;          // bend it into streamers
      float n = hi > 0.5 ? fbm5(q) : fbm2(q);
      float rdg = 1.0 - abs(2.0 * n - 1.0); n = mix(n, rdg * rdg * 0.75, 0.45);             // thin sheets and threads of gas
      float th = mix(0.36, 0.72, smoothstep(0.0, 1.05, l));                                  // thick in the middle, wisps at the edge
      float d = smoothstep(th - 0.1, th + 0.28, n);
      return d * d * 1.7 * (1.0 - smoothstep(0.9, 1.2, l));
    }
    float gas(vec3 p, float hi){
      float r = length(p.xz), d = 0.0;
      if (uEnv > 0.001) {
        vec3 pc = p / mix(1.0, 0.78, uK); pc.y *= mix(1.0, uFlat, uK);                     // it shrinks and flattens
        pc.xz = rot(uSpin * (0.3 + 0.35 / (0.3 + length(p) * 2.0))) * pc.xz;               // and the middle turns faster
        float e = cloud(pc, hi) * uEnv * mix(1.0, 1.35, uK);
        if (uShockI > 0.0) { float sd = length(p - uSN) - uShockR; e *= 1.0 + uShockI * 2.2 * exp(-sd * sd * 50.0); }   // the blast wave squeezes the gas
        if (uCav > 0.0) e *= smoothstep(0.0, 0.16, r - (abs(p.y) * uCav - 0.04));          // the jets hollow out a cone above and below
        d += e;
      }
      if (uDisk > 0.001) {
        float h = 0.012 + 0.085 * pow(r, 1.15), q = r / uRd;
        float dd = exp(-p.y * p.y / (h * h)) * exp(-q * q * q * q) * smoothstep(0.025, 0.075, r);
        if (dd > 0.002) {
          vec3 pd = p; pd.xz = rot(uSpin * 1.6 / (0.25 + r * 3.0)) * pd.xz;
          dd *= 0.4 + 1.2 * noise(vec3(pd.x * 10.0, p.y * 16.0, pd.z * 10.0));
          d += dd * 3.0 * uDisk;
        }
      }
      return d;
    }
    void main(){
      vec4 v = invProj * vec4(vNdc, -1.0, 1.0);
      vec3 rd = normalize((camWorld * vec4(v.xyz / v.w, 0.0)).xyz), ro = camPos;
      float b = dot(ro, rd), h = b * b - (dot(ro, ro) - RB * RB);
      vec3 col = vec3(0.0); float Tr = 1.0;
      float tc = -b, Tc = 1.0, tj = 0.0, Tj = 1.0;                                          // where the ray passes closest to the star, and to the jets
      float xz = dot(rd.xz, rd.xz); if (xz > 1e-5) tj = -dot(ro.xz, rd.xz) / xz;
      if (h > 0.0) {
        h = sqrt(h); float t = max(-b - h, 0.0), t1 = -b + h;
        t += texture2D(noiseTex, gl_FragCoord.xy / 256.0).b * 0.05;
        for (int i = 0; i < 80; i++) {
          if (t > t1 || Tr < 0.02) break;
          vec3 p = ro + rd * t;
          float ds = uDisk > 0.01 ? mix(0.016, 0.055, smoothstep(0.0, 0.25, abs(p.y))) : 0.045;
          float d = gas(p, 1.0), pr2 = dot(p, p);
          if (d > 0.002) {
            vec3 L = uAmb;
            if (uStar > 0.0) { float sh = exp(-(gas(p * 0.72, 0.0) + gas(p * 0.4, 0.0)) * sqrt(pr2) * 5.5); L += uStarCol * uStar * sh * 0.95 / (pr2 * 4.0 + 0.06); }   // the baby Sun, dimmed by the gas in between
            vec3 l0 = uL0pos - p; float F0 = exp(-gas(p + normalize(l0) * 0.14, 0.0) * 3.0) / (0.1 + dot(l0, l0) * 2.2); L += uL0col * F0;                           // a hot blue star close by
            vec3 l1 = uL1pos - p; L += uL1col / (0.2 + dot(l1, l1) * 2.0);                                                                                         // an old orange star on the other side
            if (uSNI > 0.0) { vec3 l2 = uSN - p; L += vec3(0.75, 0.85, 1.0) * uSNI * exp(-gas(p + normalize(l2) * 0.14, 0.0) * 3.0) / (0.35 + dot(l2, l2)); }      // the exploding star
            float thin = exp(-d * 1.6);
            vec3 s = mix(vec3(0.85, 0.62, 0.48), vec3(0.34, 0.2, 0.14), clamp(d * 0.7, 0.0, 1.0)) * L                                                            // dust reflects the light
                   + vec3(1.0, 0.24, 0.3) * uHa * (0.05 * thin + 1.5 * F0 * exp(-d * 0.8));                                                                       // hydrogen lit by the hot star glows pink-red
            if (uDisk > 0.0) { float rr = length(p.xz); s += mix(vec3(1.0, 0.92, 0.72), vec3(1.0, 0.33, 0.07), smoothstep(0.03, 0.32, rr)) * uStar * (1.6 * exp(-rr * 9.0) + 0.16 * exp(-rr * 2.5)); }   // the hot inner disk glows by itself
            if (uShockI > 0.0) { float sd = length(p - uSN) - uShockR; s += vec3(0.5, 0.72, 1.0) * uShockI * 0.9 * exp(-sd * sd * 80.0); }                          // gas hit by the blast glows blue-white
            float a = 1.0 - exp(-d * ds * 8.0);
            col += Tr * s * a; Tr *= 1.0 - a;
          }
          t += ds;
          if (t < tc) Tc = Tr; if (t < tj) Tj = Tr;
        }
      }
      if (tc < 0.0) Tc = 1.0; if (tj < 0.0) Tj = 1.0;
      // the star itself: a small fierce core with a soft halo, dimmed by whatever gas is in front of it
      if (uStar > 0.0 && tc > 0.0) { vec3 pc = ro + rd * tc; float b2 = dot(pc, pc); col += Tc * uStarCol * uStar * (0.0016 / (b2 + 0.00035) + 0.02 / (b2 * 6.0 + 0.02)); }
      // the jets: thin beams shooting out of the top and bottom, with bright knots racing along them
      if (uJet > 0.0 && tj > 0.0) { vec3 pj = ro + rd * tj; float ay = abs(pj.y), w = 0.011 + 0.045 * ay, dj = length(pj.xz);
        col += Tj * vec3(0.55, 0.78, 1.0) * uJet * exp(-dj * dj / (w * w)) * (1.0 - smoothstep(0.3, 1.25, ay)) * (0.55 + 0.45 * sin(ay * 30.0 - time * 7.0)) * 0.9 * smoothstep(0.0, 0.05, ay) / max(sqrt(xz), 0.25); }
      col = 1.0 - exp(-col * uExpo);
      gl_FragColor = vec4(col, 1.0 - Tr);
    }`;
  function create() {
    const V = (x, y, z) => new T.Vector3(x, y, z);
    const u = {
      invProj: { value: new T.Matrix4() }, camWorld: { value: new T.Matrix4() }, camPos: { value: V(0, 0, 3) }, noiseTex: { value: noiseTex() }, time: { value: 0 },
      uK: { value: 0 }, uEnv: { value: 1 }, uDisk: { value: 0 }, uSpin: { value: 0 }, uCav: { value: 0 }, uStar: { value: 0 }, uJet: { value: 0 }, uHa: { value: .3 },
      uShockR: { value: 0 }, uShockI: { value: 0 }, uSNI: { value: 0 }, uRd: { value: .72 }, uExpo: { value: 1.7 }, uFlat: { value: 1.25 },
      uStarCol: { value: V(1, .55, .25) }, uL0pos: { value: V(.95, .4, .3) }, uL0col: { value: V(.34, .46, .7) }, uL1pos: { value: V(-.9, -.3, -.5) }, uL1col: { value: V(.42, .24, .1) },
      uSN: { value: V(-1.75, .35, .4) }, uAmb: { value: V(.022, .024, .032) }
    };
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, depthTest: false, depthWrite: false, blending: T.NoBlending }));
    quad.frustumCulled = false;
    const scene = new T.Scene(); scene.add(quad); const ocam = new T.Camera();
    const rt = new T.WebGLRenderTarget(8, 8, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, depthBuffer: false, stencilBuffer: false });
    // the finished picture of the gas, laid over the stars
    const comp = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms: { map: { value: rt.texture } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main(){ gl_FragColor = texture2D(map, vUv); }',
      transparent: true, depthTest: false, depthWrite: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor }));
    comp.frustumCulled = false; comp.renderOrder = -5;
    let rw = 0, rh = 0;
    return {
      u, comp, rt,
      // W, H: size of the view in CSS pixels; budget: how many pixels to trace
      render(renderer, cam, W, H, budget = 150000) {
        const k = Math.min(1, Math.sqrt(budget / Math.max(1, W * H))), w = Math.max(8, Math.round(W * k)), hh = Math.max(8, Math.round(H * k));
        if (w !== rw || hh !== rh) { rw = w; rh = hh; rt.setSize(w, hh); }
        cam.updateMatrixWorld(); u.invProj.value.copy(cam.projectionMatrixInverse); u.camWorld.value.copy(cam.matrixWorld); u.camPos.value.setFromMatrixPosition(cam.matrixWorld);
        const old = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(scene, ocam); renderer.setRenderTarget(old);
      }
    };
  }
  return { create, noiseTex };
})();
