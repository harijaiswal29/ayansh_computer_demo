/* Spacecraft hangar: hands-on simulations of famous real spacecraft.
   Uses the shared helpers from index.html (drawBody, drawSky, Voice, Sfx, ...). */
'use strict';

/* ================================================================ spacecraft drawings
   Each one is drawn around (x, y); s = 1 is roughly 120 px across. */
function foil(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#F7D774'); g.addColorStop(.45, '#C38A2A'); g.addColorStop(.7, '#F4CC66'); g.addColorStop(1, '#B07A22');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
function solarPanel(ctx, x, y, w, h, gold) {
  ctx.fillStyle = gold ? '#C98A2B' : '#24418F'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = gold ? 'rgba(255,220,150,.5)' : 'rgba(150,190,255,.5)'; ctx.lineWidth = Math.max(.4, Math.min(w, h) / 12);
  ctx.beginPath();
  const n = Math.max(2, Math.round(Math.max(w, h) / Math.min(w, h) * 2));
  for (let i = 1; i < n; i++) { if (w > h) { ctx.moveTo(x + w * i / n, y); ctx.lineTo(x + w * i / n, y + h); } else { ctx.moveTo(x, y + h * i / n); ctx.lineTo(x + w, y + h * i / n); } }
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
  ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.strokeRect(x, y, w, h);
}
function dish(ctx, x, y, r, tilt = .55) {
  ctx.fillStyle = '#F2F4FA'; ctx.beginPath(); ctx.ellipse(x, y, r, r * tilt, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#9AA3C2'; ctx.lineWidth = r * .08; ctx.stroke();
  ctx.fillStyle = '#D5DAEA'; ctx.beginPath(); ctx.ellipse(x, y, r * .55, r * .55 * tilt, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#7C86A8'; ctx.beginPath(); ctx.arc(x, y, r * .12, 0, TAU); ctx.fill();
}
function flame(ctx, x, y, len, w, dir = PI / 2) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(dir - PI / 2);
  const l = len * (.85 + Math.random() * .3);
  let g = ctx.createLinearGradient(0, 0, 0, l); g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(.4, 'rgba(255,170,60,.9)'); g.addColorStop(1, 'rgba(255,80,30,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(0, l * 1.1, w, 0); ctx.fill();
  ctx.restore();
}
const CRAFT_DRAW = {
  iss(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (const wx of [-62, -46, 46, 62]) { solarPanel(ctx, wx - 6, -44, 12, 38, true); solarPanel(ctx, wx - 6, 6, 12, 38, true); }
    ctx.fillStyle = '#C9CED8'; ctx.fillRect(-70, -3, 140, 6);
    ctx.fillStyle = '#EEF1F6'; ctx.fillRect(-30, 4, 8, 18); ctx.fillRect(22, 4, 8, 18);
    ctx.fillStyle = '#E8EBF3'; ctx.strokeStyle = '#9AA3C2'; ctx.lineWidth = 1;
    roundRect(ctx, -7, -30, 14, 26, 5); ctx.fill(); ctx.stroke();
    roundRect(ctx, -7, 2, 14, 30, 5); ctx.fill(); ctx.stroke();
    roundRect(ctx, -24, -9, 48, 13, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5E79C9'; ctx.fillRect(-3, 32, 6, 4);
    ctx.strokeStyle = '#B7BDCC'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(7, -20); ctx.lineTo(20, -34); ctx.lineTo(30, -26); ctx.stroke();
    ctx.restore();
  },
  voyager(ctx, x, y, s, a = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    ctx.strokeStyle = '#B9C0D6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-56, 30); ctx.moveTo(6, 8); ctx.lineTo(30, 30); ctx.moveTo(0, 10); ctx.lineTo(-10, 44); ctx.stroke();
    ctx.fillStyle = '#5B6491'; for (let i = 0; i < 3; i++) { ctx.fillRect(22 + i * 4, 26 + i * 2, 5, 6); }
    ctx.fillStyle = '#C38A2A'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const q = i / 10 * TAU; ctx.lineTo(Math.cos(q) * 12, 8 + Math.sin(q) * 6); } ctx.fill();
    ctx.fillStyle = '#F2C25A'; ctx.beginPath(); ctx.arc(-4, 9, 3.5, 0, TAU); ctx.fill();
    dish(ctx, 0, -6, 26, .5);
    ctx.restore();
  },
  parker(ctx, x, y, s, a = 0, heat = 0) {
    // a: the direction the heat shield faces
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    solarPanel(ctx, -24, -30, 12, 10); solarPanel(ctx, -24, 20, 12, 10);
    ctx.fillStyle = '#3B4152'; ctx.beginPath(); ctx.moveTo(-34, -14); ctx.lineTo(-10, -18); ctx.lineTo(-10, 18); ctx.lineTo(-34, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C38A2A'; ctx.fillRect(-30, -8, 12, 16);
    const g = ctx.createLinearGradient(-6, 0, 10, 0);
    g.addColorStop(0, '#2A2D38'); g.addColorStop(.6, '#E9ECF3'); g.addColorStop(1, heat > .05 ? `rgb(255,${200 - heat * 120 | 0},${140 - heat * 120 | 0})` : '#FFFFFF');
    ctx.fillStyle = g; roundRect(ctx, -8, -34, 16, 68, 7); ctx.fill();
    if (heat > .05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = '#FF8A30'; ctx.shadowBlur = 30 * heat; ctx.fillStyle = `rgba(255,140,60,${heat * .7})`; roundRect(ctx, 4, -32, 5, 64, 3); ctx.fill(); ctx.restore(); }
    ctx.restore();
  },
  juno(ctx, x, y, s, spin = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (let i = 0; i < 3; i++) {
      const q = spin + i * TAU / 3, len = 58 * Math.abs(Math.cos(q)) + 6, side = Math.cos(q) > 0 ? 1 : -1, depth = Math.sin(q);
      ctx.save(); ctx.globalAlpha = depth < 0 ? .75 : 1; ctx.scale(side, 1);
      solarPanel(ctx, 10, -7 + depth * 4, len, 14);
      ctx.restore();
    }
    ctx.fillStyle = '#3B3F55'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU + PI / 6; ctx.lineTo(Math.cos(q) * 13, Math.sin(q) * 13); } ctx.fill();
    foil(ctx, -8, -6, 16, 12);
    dish(ctx, 0, -16, 11, .45);
    ctx.restore();
  },
  cassini(ctx, x, y, s, huygens = true) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#B9C0D6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(60, -26); ctx.stroke();
    ctx.fillStyle = '#5B6491'; ctx.fillRect(-16, 20, 6, 22); ctx.fillRect(10, 22, 6, 18);
    foil(ctx, -11, -6, 22, 36);
    ctx.fillStyle = '#3B3F55'; ctx.fillRect(-7, 30, 14, 10);
    if (huygens) { ctx.fillStyle = '#E8D8B0'; ctx.beginPath(); ctx.ellipse(-16, 8, 7, 9, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#C38A2A'; ctx.beginPath(); ctx.ellipse(-17, 8, 4, 6, 0, 0, TAU); ctx.fill(); }
    dish(ctx, 0, -12, 24, .42);
    ctx.restore();
  },
  newhorizons(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#5B6491'; ctx.save(); ctx.rotate(-.5); ctx.fillRect(14, -4, 30, 8); ctx.restore();
    ctx.fillStyle = '#C38A2A'; ctx.beginPath(); ctx.moveTo(-22, 22); ctx.lineTo(0, -10); ctx.lineTo(22, 22); ctx.closePath(); ctx.fill();
    foil(ctx, -14, 4, 28, 16);
    dish(ctx, 0, -10, 20, .45);
    ctx.restore();
  },
  vikram(ctx, x, y, s, fire = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (fire) flame(ctx, 0, 20, 34 * fire, 7);
    ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(-18, 10); ctx.lineTo(-30, 30); ctx.moveTo(18, 10); ctx.lineTo(30, 30); ctx.moveTo(-8, 14); ctx.lineTo(-12, 30); ctx.moveTo(8, 14); ctx.lineTo(12, 30); ctx.stroke();
    ctx.fillStyle = '#9AA3C2'; ctx.fillRect(-35, 29, 10, 3); ctx.fillRect(25, 29, 10, 3); ctx.fillRect(-16, 29, 8, 3); ctx.fillRect(8, 29, 8, 3);
    foil(ctx, -22, -18, 44, 32);
    solarPanel(ctx, 22, -16, 6, 26);
    ctx.fillStyle = '#E8EBF3'; ctx.fillRect(-6, -24, 12, 6);
    ctx.fillStyle = '#FF9933'; ctx.fillRect(-14, -12, 10, 2.4); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-14, -9.6, 10, 2.4); ctx.fillStyle = '#138808'; ctx.fillRect(-14, -7.2, 10, 2.4);
    ctx.restore();
  },
  pragyan(ctx, x, y, s, roll = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#3B3F55';
    for (const wx of [-14, 0, 14]) { ctx.beginPath(); ctx.arc(wx, 0, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#9AA3C2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx + Math.cos(roll) * 5, Math.sin(roll) * 5); ctx.stroke(); }
    foil(ctx, -16, -14, 32, 10);
    ctx.save(); ctx.translate(-4, -14); ctx.rotate(-.5); solarPanel(ctx, 0, -18, 24, 5); ctx.restore();
    ctx.fillStyle = '#E8EBF3'; ctx.fillRect(10, -24, 3, 10); ctx.fillStyle = '#16215A'; ctx.fillRect(8, -27, 8, 4);
    ctx.restore();
  },
  mangalyaan(ctx, x, y, s, fire = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (fire) flame(ctx, -16, 0, 30 * fire, 6, PI);
    solarPanel(ctx, 14, -6, 44, 12);
    foil(ctx, -16, -16, 30, 30);
    dish(ctx, 0, -20, 15, .4);
    ctx.fillStyle = '#FF9933'; ctx.fillRect(-12, 4, 8, 2); ctx.fillStyle = '#fff'; ctx.fillRect(-12, 6, 8, 2); ctx.fillStyle = '#138808'; ctx.fillRect(-12, 8, 8, 2);
    ctx.restore();
  },
  webb(ctx, x, y, s, shield = 1, mirror = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // sunshield: five thin silver-violet layers
    const sw = lerp(10, 70, shield), sh = lerp(30, 26, shield);
    for (let i = 4; i >= 0; i--) {
      const g = ctx.createLinearGradient(-sw, 0, sw, 0); g.addColorStop(0, '#9B8FD0'); g.addColorStop(.5, '#E9E4FF'); g.addColorStop(1, '#8A7FC4');
      ctx.fillStyle = g; ctx.globalAlpha = .55 + i * .09;
      ctx.beginPath(); ctx.moveTo(-sw, 34 - i * 2.4); ctx.lineTo(0, 34 - sh * .4 - i * 2.4); ctx.lineTo(sw, 34 - i * 2.4); ctx.lineTo(0, 34 + sh * .4 - i * 2.4); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3B3F55'; ctx.fillRect(-4, 6, 8, 22);
    // gold honeycomb mirror: centre column plus two wings that fold back
    const R = 7.2, hex = (cx, cy, k) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU; ctx.lineTo(cx + Math.cos(q) * R * k, cy + Math.sin(q) * R); } ctx.closePath(); const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R); g.addColorStop(0, '#FFE58A'); g.addColorStop(.5, '#D49A1E'); g.addColorStop(1, '#FFD45C'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7A5410'; ctx.lineWidth = .8; ctx.stroke(); };
    const dx = R * 1.5, dy = R * Math.sqrt(3) / 2;
    const cols = [[-2, [-1, 1]], [-1, [-2, 0, 2]], [0, [-3, -1, 1, 3]], [1, [-2, 0, 2]], [2, [-1, 1]]];
    for (const [c, rows] of cols) for (const r of rows) {
      if (c === 0 && (r === -1 || r === 1)) { if (r === 1) continue; }
      const wing = Math.abs(c) === 2, k = wing ? Math.max(.08, mirror) : 1;
      const cx = (wing ? Math.sign(c) * (dx + dx * mirror) : c * dx), cy = -16 + r * dy;
      hex(cx, cy, k);
    }
    ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(0, -46); ctx.lineTo(14, -2); ctx.moveTo(0, -30); ctx.lineTo(0, -46); ctx.stroke();
    ctx.fillStyle = '#E8EBF3'; ctx.beginPath(); ctx.arc(0, -46, 3, 0, TAU); ctx.fill();
    ctx.restore();
  },
  perseverance(ctx, x, y, s, roll = 0, arm = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-24, 0); ctx.moveTo(20, -10); ctx.lineTo(24, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 0); ctx.stroke();
    for (const wx of [-24, 0, 24]) { ctx.fillStyle = '#2F3346'; ctx.beginPath(); ctx.arc(wx, 4, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8890AE'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(wx, 4); ctx.lineTo(wx + Math.cos(roll) * 7, 4 + Math.sin(roll) * 7); ctx.stroke(); }
    ctx.fillStyle = '#F1F2F6'; roundRect(ctx, -26, -24, 52, 14, 3); ctx.fill();
    ctx.fillStyle = '#C38A2A'; ctx.fillRect(-26, -14, 52, 3);
    ctx.fillStyle = '#5B6491'; ctx.fillRect(-30, -22, 8, 10);
    ctx.fillStyle = '#E8EBF3'; ctx.fillRect(14, -48, 4, 24); ctx.fillStyle = '#F1F2F6'; roundRect(ctx, 8, -56, 18, 9, 2); ctx.fill();
    ctx.fillStyle = '#16215A'; ctx.beginPath(); ctx.arc(21, -51.5, 2, 0, TAU); ctx.arc(14, -51.5, 2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(26, -18); ctx.lineTo(26 + 14 * arm + 6, -18 + 10 * arm); ctx.lineTo(30 + 18 * arm, -4 + 10 * arm); ctx.stroke();
    ctx.restore();
  },
  ingenuity(ctx, x, y, s, spin = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(-12, 14); ctx.moveTo(5, 4); ctx.lineTo(12, 14); ctx.moveTo(0, -4); ctx.lineTo(0, -20); ctx.stroke();
    ctx.fillStyle = '#E9ECF3'; roundRect(ctx, -7, -4, 14, 10, 2); ctx.fill();
    solarPanel(ctx, -8, -24, 16, 3);
    for (const [yy, k] of [[-12, 1], [-16, -1]]) { const w = 26 * Math.abs(Math.cos(spin * k)); ctx.fillStyle = 'rgba(40,44,60,.8)'; ctx.fillRect(-w, yy - 1, w * 2, 2); }
    ctx.restore();
  },
  capsule(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#1F2233'; ctx.fillRect(-22, -14, 4, 28);
    ctx.fillStyle = '#F3F4F8'; ctx.beginPath(); ctx.moveTo(-18, -16); ctx.lineTo(10, -9); ctx.lineTo(10, 9); ctx.lineTo(-18, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C9CED8'; ctx.fillRect(10, -5, 6, 10);
    ctx.fillStyle = '#16215A'; ctx.beginPath(); ctx.arc(-6, -3, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FF9933'; ctx.fillRect(-14, 6, 6, 1.6); ctx.fillStyle = '#fff'; ctx.fillRect(-14, 7.6, 6, 1.6); ctx.fillStyle = '#138808'; ctx.fillRect(-14, 9.2, 6, 1.6);
    ctx.restore();
  }
};
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
  rotor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M12 6v6"/><rect x="8" y="12" width="8" height="6" rx="1.5"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>'
};

/* ================================================================ the hangar view */
views.craft = (() => {
  const cv = $('#craftCv');
  let W = 0, H = 0, t = 0, cur = null, held = {}, said = new Set(), lastTalk = 0, tap = null, pillMsg = null;
  const S = {};       // the simulations, filled in below
  const LIST = ['iss', 'chandrayaan', 'mangalyaan', 'voyager', 'parker', 'juno', 'cassini', 'newhorizons', 'webb', 'perseverance'];
  const say = id => { lastTalk = performance.now(); Voice.say(id); };
  const sayOnce = id => { if (!said.has(id)) { said.add(id); say(id); } };
  const sayFree = (id, gap = 6000) => { if (!Voice.busy && performance.now() - lastTalk > gap) say(id); };

  function layout() { const f = fitCanvas(cv); W = f.w; H = f.h; }
  function setCtl(items) {
    const el = $('#craftCtl'); el.innerHTML = ''; held = {};
    for (const it of items) {
      if (it.range) {
        const r = document.createElement('input'); r.type = 'range'; r.className = 'yr'; r.id = it.id; r.min = it.min; r.max = it.max; r.step = it.step; r.value = it.value; r.setAttribute('aria-label', it.aria);
        r.addEventListener('input', () => cur.act?.(it.id, +r.value)); el.appendChild(r); continue;
      }
      const b = document.createElement('button'); b.type = 'button'; b.dataset.id = it.id;
      b.className = 'btn small' + (it.go ? ' go' : '') + (it.cyan ? ' cyan' : '') + (it.hold ? ' hold' : '');
      b.innerHTML = (it.icon ? ICON[it.icon] : '') + (it.label ? `<span>${it.label}</span>` : '');
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
  }
  function pressed(id, on) { const b = $(`#craftCtl [data-id="${id}"]`); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function label(id, text) { const b = $(`#craftCtl [data-id="${id}"] span`); if (b) b.textContent = text; }
  function pick(id) {
    cur = S[id]; said = new Set(); tap = null;
    $$('.craft').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false'));
    $('#craftName').textContent = cur.name; $('#craftFacts').textContent = cur.facts;
    cur.reset(); Sfx.whoosh(); say(cur.line);
  }
  // canvas input goes to the current simulation
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  let dragging = false;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); dragging = true; const [x, y] = pos(e); cur?.down?.(x, y); });
  cv.addEventListener('pointermove', e => { if (!dragging) return; const [x, y] = pos(e); cur?.move?.(x, y); });
  const up = e => { if (!dragging) return; dragging = false; const [x, y] = pos(e); cur?.up?.(x, y); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', ' ': 'space' };
  window.addEventListener('keydown', e => {
    if (current !== 'craft' || !cur?.keys || !KEYS[e.key] || e.target.tagName === 'INPUT') return;
    const id = cur.keys[KEYS[e.key]]; if (!id) return;
    e.preventDefault(); if (!held[id]) cur.press?.(id); held[id] = true;
  });
  window.addEventListener('keyup', e => { if (cur?.keys && KEYS[e.key]) held[cur.keys[KEYS[e.key]]] = false; });

  function frame(dt) {
    t += dt;
    const ctx = cv.getContext('2d'), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0);
    if (!cur) { drawSky(ctx, W, H, t, 0, 0, dt); return; }
    if (!cur.ownSky) drawSky(ctx, W, H, t, 0, 0, dt);
    cur.frame(ctx, dt, d);
  }
  function text(ctx, str, x, y, size = 15, color = '#F3F1FF', align = 'center', weight = 700) {
    ctx.font = `${weight} ${size}px Fredoka, "Trebuchet MS", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function pill(ctx, str, x, y, bg = 'rgba(13,20,52,.88)', fg = '#F3F1FF', size = 14) {
    ctx.font = `700 ${size}px Fredoka, sans-serif`; const w = ctx.measureText(str).width + 20;
    ctx.fillStyle = bg; roundRect(ctx, x - w / 2, y - size - 4, w, size + 12, (size + 12) / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.fillText(str, x, y + 2);
  }
  function gauge(ctx, x, y, w, label, v, col) {
    ctx.fillStyle = 'rgba(13,20,52,.85)'; roundRect(ctx, x, y, w, 40, 10); ctx.fill();
    text(ctx, label, x + 10, y + 15, 11, '#A8B2DE', 'left', 600);
    ctx.fillStyle = '#16215A'; roundRect(ctx, x + 10, y + 22, w - 20, 9, 4); ctx.fill();
    ctx.fillStyle = col; roundRect(ctx, x + 10, y + 22, Math.max(6, (w - 20) * clamp(v, 0, 1)), 9, 4); ctx.fill();
  }
  const top = () => { const h = $('#craftHud'); return h.offsetHeight ? h.offsetTop + h.offsetHeight + 10 : 132; };  // just below the info card
  const bottom = () => H - ($('#craftCtl').offsetHeight || 50) - 18;
  const keplerStep = (o, dt) => { const r = o.a * (1 - o.e * o.e) / (1 + o.e * Math.cos(o.th)); o.th += dt * o.h / (r * r); o.r = r; return r; };

  /* ---------------------------------------------------------------- International Space Station */
  S.iss = (() => {
    let mode, ang, sunrises, wasDay, close, indians, earthSlot = makeSlot();
    let me, target, items, dock;
    const ITEMS = [
      { id: 'water', line: 'iss_water', x: .3, y: .38 }, { id: 'food', line: 'iss_food', x: .62, y: .3 },
      { id: 'sleep', line: 'iss_sleep', x: .9, y: .5 }, { id: 'bike', line: 'iss_bike', x: .14, y: .72 }, { id: 'window', line: 'iss_window', x: .55, y: .78 }
    ];
    function controls() {
      const m = [{ id: 'orbit', label: 'Orbit', pressed: mode === 'orbit' }, { id: 'inside', label: 'Go inside', pressed: mode === 'inside' }, { id: 'dock', label: 'Dock', pressed: mode === 'dock' }];
      if (mode === 'orbit') m.push({ id: 'close', label: 'Close-up', cyan: true }, { id: 'india', label: 'Indians in space', go: true });
      if (mode === 'dock') m.push({ id: 'up', icon: 'up', hold: true, aria: 'Up' }, { id: 'down', icon: 'down', hold: true, aria: 'Down' }, { id: 'fwd', icon: 'next', label: 'Forward', hold: true, go: true }, { id: 'brake', label: 'Brake', hold: true });
      setCtl(m);
    }
    function resetDock() { dock = { x: 0, y: 0, vx: 0, vy: 0, done: false, crash: 0, start: true }; }
    function setMode(m) {
      mode = m; close = false; indians = 0; controls();
      if (m === 'inside') { me = { x: .5, y: .5, vx: 0, vy: 0, r: 0 }; target = null; items = ITEMS.map((it, i) => ({ ...it, p: i * 1.3 })); say('iss_inside'); }
      if (m === 'dock') { resetDock(); say('iss_dock'); }
    }
    return {
      name: 'International Space Station', line: 'iss_intro', facts: 'Started in 1998 · 400 km above Earth · People have lived on it since 2000',
      keys: { up: 'up', down: 'down', right: 'fwd', left: 'brake' },
      reset() { ang = 0; sunrises = 0; wasDay = true; mode = 'orbit'; controls(); },
      act(id) {
        if (id === 'orbit' || id === 'inside' || id === 'dock') { if (mode !== id) setMode(id); }
        else if (id === 'close') { close = !close; if (close) say('iss_parts'); }
        else if (id === 'india') { indians = 1; say('iss_india'); }
      },
      down(x, y) {
        if (mode === 'orbit') {
          if (indians) { indians = 0; return; }
          const p = this.issAt; if (p && Math.hypot(x - p[0], y - p[1]) < 40) { close = !close; if (close) say('iss_parts'); }
        } else if (mode === 'inside') {
          const room = this.room;
          for (const it of items) { if (Math.hypot(x - (room.x + it.x * room.w), y - (room.y + it.y * room.h)) < 40) { it.lit = 1.5; Sfx.twinkle(); say(it.line); return; } }
          target = [(x - room.x) / room.w, (y - room.y) / room.h];
        }
      },
      move(x, y) { if (mode === 'inside' && target) { const room = this.room; target = [(x - room.x) / room.w, (y - room.y) / room.h]; } },
      frame(ctx, dt, d) {
        if (mode === 'orbit') {
          const R = Math.min(W * .3, (bottom() - top()) * .36), cx = W < 760 ? W * .5 : W * .42, cy = (top() + bottom()) / 2 + 10;
          const L = [-.8, -.25, .55];
          ang += dt * TAU / 11;
          const ox = Math.cos(ang) * R * 1.32, oy = Math.sin(ang) * R * .34 - Math.cos(ang) * R * .12, front = Math.sin(ang) > 0;
          const sx = cx + ox, sy = cy + oy;
          const nz = Math.sin(ang), isDay = (Math.cos(ang) * L[0] + nz * L[2]) > -.1;
          if (isDay && !wasDay) { sunrises++; Sfx.twinkle(); }
          wasDay = isDay;
          const drawIss = () => {
            ctx.save(); ctx.shadowColor = isDay ? 'rgba(255,240,200,.8)' : 'transparent'; ctx.shadowBlur = 10;
            CRAFT_DRAW.iss(ctx, sx, sy, .38 * (front ? 1.1 : .8)); ctx.restore();
            if (!isDay) { ctx.fillStyle = 'rgba(5,8,23,.45)'; ctx.beginPath(); ctx.arc(sx, sy, 28, 0, TAU); ctx.fill(); }
          };
          ctx.strokeStyle = 'rgba(89,224,232,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 7]);
          ctx.beginPath(); ctx.ellipse(cx, cy - 0, R * 1.32, R * .36, -.09 * 1, PI, TAU); ctx.stroke(); ctx.setLineDash([]);
          if (!front) drawIss();
          drawBody(ctx, 'earth', cx, cy, R, { rot: -t * .12 - 1.2, L, pitch: .35, dpr: d, slot: earthSlot, ambient: .06, maxD: 440 });
          ctx.strokeStyle = 'rgba(89,224,232,.5)'; ctx.setLineDash([5, 7]);
          ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.32, R * .36, -.09, 0, PI); ctx.stroke(); ctx.setLineDash([]);
          if (front) drawIss();
          this.issAt = [sx, sy];
          const gx = W < 760 ? 16 : W - 236, gy = W < 760 ? bottom() - 92 : top() + 10;
          ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, gx, gy, 220, 84, 14); ctx.fill();
          text(ctx, `Sunrises seen: ${sunrises}`, gx + 14, gy + 26, 18, '#FFB52E', 'left');
          text(ctx, 'Speed: 28,000 km/h', gx + 14, gy + 50, 14, '#F3F1FF', 'left', 600);
          text(ctx, 'Once round Earth: 90 minutes', gx + 14, gy + 72, 14, '#A8B2DE', 'left', 600);
          if (!close) pill(ctx, 'Tap the space station', sx, sy - 34, 'rgba(89,224,232,.9)', '#062A2E', 12);
          if (close) {
            ctx.fillStyle = 'rgba(5,8,23,.82)'; ctx.fillRect(0, 0, W, H);
            const s = Math.min(W / 170, (bottom() - top()) / 110), x0 = W / 2, y0 = (top() + bottom()) / 2;
            CRAFT_DRAW.iss(ctx, x0, y0, s);
            const lab = (str, px, py, lx, ly) => { ctx.strokeStyle = '#59E0E8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + px * s, y0 + py * s); ctx.lineTo(x0 + lx * s, y0 + ly * s); ctx.stroke(); pill(ctx, str, x0 + lx * s, y0 + ly * s, 'rgba(89,224,232,.95)', '#062A2E', 13); };
            lab('Solar panels', -62, -30, -62, -56); lab('Living rooms (modules)', 0, -20, 26, -56); lab('Robot arm', 28, -27, 52, -50); lab('Cooling radiators', 26, 14, 52, 46); lab('Docking port', 0, 34, -10, 52);
            text(ctx, 'About as long as a football field', W / 2, bottom() - 10, 15, '#A8B2DE', 'center', 600);
          }
          if (indians) {
            ctx.fillStyle = 'rgba(5,8,23,.85)'; ctx.fillRect(0, 0, W, H);
            const w = Math.min(520, W - 32), x0 = (W - w) / 2, y0 = top() + 6;
            for (const [i, [yr, nm, txt]] of [['1984', 'Rakesh Sharma', 'First Indian in space'], ['2025', 'Shubhanshu Shukla', 'First Indian on the space station']].entries()) {
              const y = y0 + i * 112;
              ctx.fillStyle = 'rgba(22,33,90,.95)'; roundRect(ctx, x0, y, w, 100, 18); ctx.fill();
              drawAstro(ctx, x0 + 44, y + 92, .62, false, 0, t + i);
              text(ctx, yr, x0 + 92, y + 32, 16, '#59E0E8', 'left'); text(ctx, nm, x0 + 92, y + 60, 24, '#FFB52E', 'left'); text(ctx, txt, x0 + 92, y + 84, 15, '#F3F1FF', 'left', 600);
            }
            text(ctx, 'Tap to close', W / 2, y0 + 250, 13, '#A8B2DE', 'center', 600);
          }
        } else if (mode === 'inside') this.inside(ctx, dt, d);
        else this.dock(ctx, dt, d);
      },
      inside(ctx, dt) {
        const room = this.room = { x: 16, y: top() - 8, w: W - 32, h: bottom() - top() + 4 };
        let g = ctx.createLinearGradient(0, room.y, 0, room.y + room.h); g.addColorStop(0, '#DCE1EA'); g.addColorStop(.5, '#EEF1F6'); g.addColorStop(1, '#C9CFDB');
        ctx.fillStyle = '#9AA3B8'; roundRect(ctx, room.x - 6, room.y - 6, room.w + 12, room.h + 12, 34); ctx.fill();
        ctx.fillStyle = g; roundRect(ctx, room.x, room.y, room.w, room.h, 28); ctx.fill();
        ctx.save(); roundRect(ctx, room.x, room.y, room.w, room.h, 28); ctx.clip();
        for (let i = 0; i < 9; i++) { const x = room.x + (i + .5) * room.w / 9; ctx.fillStyle = i % 3 ? '#D3D8E3' : '#C3CADA'; ctx.fillRect(x - room.w / 22, room.y, room.w / 11, 22); ctx.fillRect(x - room.w / 22, room.y + room.h - 22, room.w / 11, 22); }
        ctx.strokeStyle = '#FFB52E'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(room.x, room.y + 34); ctx.lineTo(room.x + room.w, room.y + 34); ctx.moveTo(room.x, room.y + room.h - 34); ctx.lineTo(room.x + room.w, room.y + room.h - 34); ctx.stroke();
        for (let i = 0; i < 14; i++) { ctx.fillStyle = ['#59E0E8', '#FF6D8A', '#6FEA95', '#FFB52E'][i % 4]; ctx.fillRect(room.x + 30 + i * room.w / 14, room.y + 8, 6, 6); }
        ctx.restore();
        for (const it of items) {
          it.p += dt; it.lit = Math.max(0, (it.lit || 0) - dt);
          const x = room.x + it.x * room.w + (it.id === 'water' || it.id === 'food' ? Math.sin(it.p * .7) * 18 : 0), y = room.y + it.y * room.h + (it.id === 'water' || it.id === 'food' ? Math.cos(it.p * .9) * 12 : 0);
          ctx.save(); ctx.translate(x, y);
          if (it.id === 'water') { const k = 1 + Math.sin(it.p * 4) * .12; ctx.fillStyle = 'rgba(70,170,255,.75)'; ctx.beginPath(); ctx.ellipse(0, 0, 18 * k, 18 / k, it.p, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-6, -6, 4, 0, TAU); ctx.fill(); }
          if (it.id === 'food') { ctx.rotate(it.p * .5); ctx.fillStyle = '#E8C98A'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill(); ctx.fillStyle = '#C79B52'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(Math.cos(i) * 11, Math.sin(i * 2) * 9, 2.5, 0, TAU); ctx.fill(); } }
          if (it.id === 'sleep') { ctx.fillStyle = '#5E79C9'; roundRect(ctx, -20, -46, 40, 92, 18); ctx.fill(); ctx.fillStyle = '#F3F4FF'; ctx.beginPath(); ctx.arc(0, -30, 11, 0, TAU); ctx.fill(); ctx.fillStyle = '#16215A'; ctx.fillRect(-6, -32, 12, 3); }
          if (it.id === 'bike') { ctx.strokeStyle = '#4A5272'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 10, 18, 0, TAU); ctx.moveTo(0, 10); ctx.lineTo(0, -24); ctx.lineTo(16, -24); ctx.stroke(); ctx.fillStyle = '#FF7442'; ctx.fillRect(-10, -30, 20, 6); }
          if (it.id === 'window') { ctx.fillStyle = '#7C86A8'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill(); ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.clip(); ctx.fillStyle = '#050817'; ctx.fillRect(-40, -40, 80, 80); drawBody(ctx, 'earth', 0, 70, 80, { rot: -t * .25, L: [-.4, -.6, .7], pitch: .6, dpr: dprNow(), slot: earthSlot, maxD: 220 }); ctx.restore(); ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.stroke(); }
          ctx.restore();
          const glow = .4 + .3 * Math.sin(t * 3 + it.p) + it.lit;
          ctx.strokeStyle = `rgba(255,181,46,${clamp(glow, 0, 1)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, it.id === 'sleep' ? 54 : 44, 0, TAU); ctx.stroke();
        }
        if (target) { me.vx += (target[0] - me.x) * dt * 1.4; me.vy += (target[1] - me.y) * dt * 1.4; }
        me.vx *= Math.pow(.6, dt); me.vy *= Math.pow(.6, dt); me.x += me.vx * dt; me.y += me.vy * dt; me.r += (me.vx * 2 + .15) * dt;
        if (me.x < .08 || me.x > .92) { me.vx *= -.8; me.x = clamp(me.x, .08, .92); Sfx.boop(); }
        if (me.y < .2 || me.y > .9) { me.vy *= -.8; me.y = clamp(me.y, .2, .9); Sfx.boop(); }
        ctx.save(); ctx.translate(room.x + me.x * room.w, room.y + me.y * room.h); ctx.rotate(Math.sin(me.r) * .6);
        drawAstro(ctx, 0, 60 * Math.min(1, room.h / 380), Math.min(.8, room.h / 420), true, 0, t, me.vx >= 0 ? 1 : -1);
        ctx.restore();
        text(ctx, 'Drag to float · Tap the glowing things', W / 2, room.y + room.h - 8, 13, '#4A5272', 'center', 600);
      },
      dock(ctx, dt) {
        const dk = dock, T = top(), B = bottom(), mid = (T + B) / 2, portX = W - 70;
        if (dk.start) { dk.x = 70; dk.y = mid + (B - T) * .25; dk.start = false; }
        if (!dk.done && !dk.crash) {
          if (held.up) dk.vy -= 30 * dt; if (held.down) dk.vy += 30 * dt; if (held.fwd) dk.vx += 22 * dt;
          if (held.brake) { dk.vx *= Math.pow(.25, dt); dk.vy *= Math.pow(.25, dt); }
          dk.x += dk.vx * dt; dk.y += dk.vy * dt; dk.y = clamp(dk.y, T + 30, B - 30);
          if (dk.x + 28 >= portX - 10) {
            if (dk.vx < 26 && Math.abs(dk.y - mid) < 14) { dk.done = true; dk.x = portX - 38; dk.y = mid; Sfx.chime(); say('iss_docked'); }
            else { dk.crash = 1.6; Sfx.boop(); say('iss_bump'); dk.vx = -30; }
          }
        } else if (dk.crash) { dk.crash -= dt; dk.x += dk.vx * dt; if (dk.crash <= 0) resetDock(); }
        // space station section
        ctx.fillStyle = '#E8EBF3'; roundRect(ctx, portX - 10, mid - 60, 140, 120, 18); ctx.fill();
        solarPanel(ctx, portX + 20, T, 30, mid - 60 - T, true); solarPanel(ctx, portX + 20, mid + 60, 30, B - mid - 60, true);
        ctx.fillStyle = '#9AA3C2'; ctx.fillRect(portX - 22, mid - 18, 14, 36);
        ctx.strokeStyle = '#6FEA95'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(40, mid); ctx.lineTo(portX - 24, mid); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#6FEA95'; ctx.beginPath(); ctx.arc(portX - 15, mid, 22, 0, TAU); ctx.moveTo(portX - 40, mid); ctx.lineTo(portX + 10, mid); ctx.moveTo(portX - 15, mid - 26); ctx.lineTo(portX - 15, mid + 26); ctx.stroke();
        if (!dk.done) { if (held.up) flame(ctx, dk.x, dk.y + 16, 12, 3); if (held.down) flame(ctx, dk.x, dk.y - 16, 12, 3, -PI / 2); if (held.fwd) flame(ctx, dk.x - 30, dk.y, 22, 5, PI); }
        CRAFT_DRAW.capsule(ctx, dk.x, dk.y, 1.6);
        const speed = Math.hypot(dk.vx, dk.vy) / 20;
        gauge(ctx, 16, T, 190, `Speed: ${speed.toFixed(1)} m/s ${speed > 1.3 ? '(too fast!)' : ''}`, speed / 3, speed > 1.3 ? '#FF6D8A' : '#6FEA95');
        gauge(ctx, 16, T + 48, 190, `Line up: ${Math.abs(dk.y - mid) < 14 ? 'perfect!' : 'move ' + (dk.y > mid ? 'up' : 'down')}`, 1 - Math.min(1, Math.abs(dk.y - mid) / 150), Math.abs(dk.y - mid) < 14 ? '#6FEA95' : '#FFB52E');
        if (dk.done) pill(ctx, 'Docked!', W / 2, T + 30, '#6FEA95', '#062A2E', 22);
      }
    };
  })();

  /* ---------------------------------------------------------------- Voyager 1 and 2 */
  S.voyager = (() => {
    const P = { earth: [100.46, 1, 1], jupiter: [34.40, 11.862, 5.2], saturn: [49.94, 29.457, 9.54], uranus: [313.23, 84.02, 19.2], neptune: [304.88, 164.8, 30.1] };
    const lonAt = (id, yr) => ((P[id][0] + 360 * (yr - 2000) / P[id][1]) % 360 + 360) % 360;
    const key = (yr, au, lon) => ({ yr, au, lon });
    const unwrap = ks => { for (let i = 1; i < ks.length; i++) while (ks[i].lon < ks[i - 1].lon) ks[i].lon += 360; return ks; };
    const V1 = unwrap([key(1977.68, 1, lonAt('earth', 1977.68)), key(1979.18, 5.2, lonAt('jupiter', 1979.18)), key(1980.87, 9.54, lonAt('saturn', 1980.87)), key(1990, 40, 245), key(2012.65, 121, 253), key(2027, 172, 255)]);
    const V2 = unwrap([key(1977.63, 1, lonAt('earth', 1977.63)), key(1979.52, 5.2, lonAt('jupiter', 1979.52)), key(1981.65, 9.54, lonAt('saturn', 1981.65)), key(1986.07, 19.2, lonAt('uranus', 1986.07)), key(1989.65, 30.1, lonAt('neptune', 1989.65)), key(2000, 61, 288), key(2018.85, 119, 290), key(2027, 144, 290)]);
    const EVENTS = [[1979.2, 'voy_jupiter'], [1980.9, 'voy_saturn'], [1986.07, 'voy_uranus'], [1989.65, 'voy_neptune'], [2012.65, 'voy_interstellar']];
    let yr, play, overlay, oT, prevYr;
    const slots = {}; ['earth', 'jupiter', 'saturn', 'uranus', 'neptune'].forEach(id => slots[id] = makeSlot());
    function at(ks, y) {
      if (y <= ks[0].yr) return null;
      for (let i = 1; i < ks.length; i++) if (y <= ks[i].yr) {
        const a = ks[i - 1], b = ks[i], u = (y - a.yr) / (b.yr - a.yr), us = i <= 2 ? u : u;
        return { au: lerp(a.au, b.au, us), lon: lerp(a.lon, b.lon, us) };
      }
      const a = ks[ks.length - 1]; return { au: a.au, lon: a.lon };
    }
    return {
      name: 'Voyager 1 and Voyager 2', line: 'voy_intro', facts: 'Launched 1977 · Visited Jupiter, Saturn, Uranus and Neptune · Now flying between the stars',
      reset() {
        yr = 1977.5; play = true; overlay = null; prevYr = yr;
        setCtl([{ id: 'play', icon: 'play', label: 'Pause', cyan: true }, { range: true, id: 'voyYear', min: 1977.5, max: 2026.8, step: .05, value: yr, aria: 'Year' }, { id: 'record', label: 'Golden record', go: true }, { id: 'dot', label: 'Pale blue dot' }]);
      },
      act(id, v) {
        if (id === 'voyYear') { yr = v; play = false; label('play', 'Play'); }
        if (id === 'play') { play = !play; if (play && yr >= 2026.7) { yr = 1977.5; prevYr = yr; } label('play', play ? 'Pause' : 'Play'); }
        if (id === 'record') { overlay = 'record'; oT = 0; say('voy_record'); }
        if (id === 'dot') { overlay = 'dot'; oT = 0; say('voy_dot'); }
      },
      down() { if (overlay) overlay = null; },
      frame(ctx, dt, d) {
        if (play && !overlay) { yr += dt * (yr < 1990 ? 1.1 : 3.2); if (yr >= 2026.8) { yr = 2026.8; play = false; label('play', 'Play'); } const r = $('#voyYear'); if (r) r.value = yr; }
        for (const [ey, line] of EVENTS) if (prevYr < ey && yr >= ey) { if (!Voice.busy || play) say(line); }
        prevYr = yr;
        const T = top() + 4, B = bottom(), cx = W / 2, cy = (T + B) / 2 - (B - T) * .12, R = Math.min(W / 2 - 20, (B - T) * .62);
        const toXY = (au, lon) => { const r = Math.sqrt(au / 172) * R, q = lon * PI / 180; return [cx + Math.cos(q) * r, cy - Math.sin(q) * r * .9 + (au > 30 ? 0 : 0)]; };
        // the Sun's bubble
        const hr = Math.sqrt(120 / 172) * R;
        ctx.strokeStyle = 'rgba(160,140,255,.45)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, hr, hr * .9, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        text(ctx, "Edge of the Sun's bubble", cx, cy - hr * .9 - 8, 12, '#B9AEFF', 'center', 600);
        for (const id in P) { if (id === 'earth') continue; const r = Math.sqrt(P[id][2] / 172) * R; ctx.strokeStyle = 'rgba(140,160,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * .9, 0, 0, TAU); ctx.stroke(); }
        sunGlow(ctx, cx, cy, 6, t, .8); ctx.fillStyle = '#FFE38A'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill();
        for (const id in P) {
          const [x, y] = toXY(P[id][2], lonAt(id, yr));
          drawBody(ctx, id, x, y, id === 'earth' ? 3 : id === 'jupiter' || id === 'saturn' ? 6 : 4.5, { rot: 0, L: [cx - x, cy - y, 30].map(v => v / Math.hypot(cx - x, cy - y, 30)), pitch: .3, dpr: d, slot: slots[id], ringFlat: .4 });
          if (id !== 'earth') text(ctx, BODIES[id].name, x, y + 18, 11, '#A8B2DE', 'center', 600);
        }
        for (const [ks, col, nm, dy] of [[V1, '#59E0E8', 'Voyager 1', -14], [V2, '#FFB52E', 'Voyager 2', 22]]) {
          ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); let started = false;
          for (let y = ks[0].yr; y <= yr; y += .1) { const p = at(ks, y); if (!p) continue; const [x, yy] = toXY(p.au, p.lon); started ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); started = true; }
          ctx.stroke();
          const p = at(ks, yr);
          if (p) { const [x, y] = toXY(p.au, p.lon); CRAFT_DRAW.voyager(ctx, x, y, .28); pill(ctx, nm, x, y + dy, 'rgba(13,20,52,.85)', col, 12); }
        }
        // readout
        const p1 = at(V1, yr), p2 = at(V2, yr), km = au => (au * 149.6 / 1000).toFixed(au > 60 ? 1 : 2), hrs = au => au * 8.317 / 60;
        const bx = 16, by = B - 70;
        ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, bx, by, Math.min(330, W - 32), 66, 14); ctx.fill();
        text(ctx, `Year ${Math.floor(yr)}`, bx + 14, by + 24, 20, '#FFB52E', 'left');
        if (p1) text(ctx, `Voyager 1: ${km(p1.au)} billion km away${hrs(p1.au) > 1 ? ` · light takes ${Math.round(hrs(p1.au))} hours` : ''}`, bx + 14, by + 44, 12, '#59E0E8', 'left', 600);
        if (p2) text(ctx, `Voyager 2: ${km(p2.au)} billion km away`, bx + 14, by + 60, 12, '#FFB52E', 'left', 600);
        if (overlay) {
          oT += dt; ctx.fillStyle = 'rgba(5,8,23,.9)'; ctx.fillRect(0, 0, W, H);
          const r = Math.min(W, B - T) * .32, ox = W / 2, oy = (T + B) / 2;
          if (overlay === 'record') {
            ctx.save(); ctx.translate(ox, oy); ctx.rotate(oT * .8);
            const g = ctx.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); g.addColorStop(0, '#FFE9A8'); g.addColorStop(.6, '#D9A635'); g.addColorStop(1, '#9C6F14');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(90,60,10,.35)'; ctx.lineWidth = 1; for (let i = 6; i < 30; i++) { ctx.beginPath(); ctx.arc(0, 0, r * i / 30, 0, TAU); ctx.stroke(); }
            ctx.fillStyle = '#7A5410'; ctx.beginPath(); ctx.arc(0, 0, r * .16, 0, TAU); ctx.fill(); ctx.restore();
            text(ctx, 'The Golden Record', ox, oy + r + 32, 22, '#FFB52E');
            text(ctx, 'Music, sounds of Earth and hello in 55 languages, including Hindi', ox, oy + r + 54, 13, '#A8B2DE', 'center', 600);
          } else {
            for (let i = 0; i < 4; i++) { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,200,140,0)'); g.addColorStop(.5, `rgba(255,190,130,${.12 + i * .03})`); g.addColorStop(1, 'rgba(255,200,140,0)'); ctx.fillStyle = g; ctx.fillRect(W * (.2 + i * .17), T, W * .07, B - T); }
            ctx.fillStyle = '#9ED2FF'; ctx.beginPath(); ctx.arc(W * .55 + 3, oy, 1.6, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#59E0E8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W * .55 + 3, oy, 16 + Math.sin(oT * 4) * 3, 0, TAU); ctx.stroke();
            pill(ctx, "That's us! Earth", W * .55 + 3, oy - 30, 'rgba(89,224,232,.95)', '#062A2E', 14);
            text(ctx, 'Earth, photographed by Voyager 1 from 6 billion km away (1990)', W / 2, B - 20, 13, '#A8B2DE', 'center', 600);
          }
          text(ctx, 'Tap to close', W / 2, T + 18, 12, '#6E79AE', 'center', 600);
        }
      }
    };
  })();

  /* ---------------------------------------------------------------- Parker Solar Probe */
  S.parker = (() => {
    let o, shield, drift, temp, maxTemp, passes, aim;
    return {
      name: 'Parker Solar Probe', line: 'psp_intro', facts: 'Launched 2018 · Flew 6.1 million km from the Sun in 2024 · Fastest spacecraft ever',
      keys: { left: 'ccw', right: 'cw' },
      reset() { o = { a: 1, e: .88, th: 2.6, h: .55 }; shield = PI; drift = 0; temp = 30; maxTemp = 30; passes = 0; aim = null; setCtl([{ id: 'ccw', icon: 'left', label: 'Turn', hold: true }, { id: 'cw', icon: 'right', label: 'Turn', hold: true }, { id: 'again', icon: 'again', label: 'Start again' }]); },
      act(id) { if (id === 'again') this.reset(); },
      down(x, y) { aim = [x, y]; }, move(x, y) { aim = [x, y]; }, up() { aim = null; },
      frame(ctx, dt) {
        const T = top(), B = bottom(), sr = Math.min((B - T) * .2, W * .12), sx = W < 760 ? W * .3 : W * .26, sy = (T + B) / 2 + 10;
        const scale = Math.min(W - sx - 40, (B - T) * 1.2) / (o.a * (1 + o.e));
        const prevTh = o.th; keplerStep(o, dt * .7);
        const q = o.th, r = o.r, px = sx - Math.cos(q) * r * scale, py = sy - Math.sin(q) * r * scale * .6;
        if (Math.cos(prevTh) < Math.cos(q) && Math.cos(q) > .999) passes++;
        // Venus orbit and the probe's path
        ctx.strokeStyle = 'rgba(230,196,130,.3)'; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.ellipse(sx, sy, o.a * (1 + o.e) * scale * .98, o.a * (1 + o.e) * scale * .98 * .6, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        text(ctx, "Venus's path", sx + o.a * (1 + o.e) * scale * .7, sy - o.a * (1 + o.e) * scale * .46, 11, '#E6C482', 'center', 600);
        ctx.strokeStyle = 'rgba(89,224,232,.3)'; ctx.beginPath();
        for (let i = 0; i <= 100; i++) { const a = i / 100 * TAU, rr = o.a * (1 - o.e * o.e) / (1 + o.e * Math.cos(a)); const x = sx - Math.cos(a) * rr * scale, y = sy - Math.sin(a) * rr * scale * .6; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        sunGlow(ctx, sx, sy, sr, t);
        drawBody(ctx, 'sun', sx, sy, sr, { rot: -t * .05, L: [0, 0, 1], pitch: .2, dpr: dprNow(), slot: this.slot || (this.slot = makeSlot()), maxD: 260 });
        // steering
        drift += (Math.random() - .5) * dt * 1.6; drift = clamp(drift, -.7, .7);
        shield += drift * dt * (1 + 2 / (r * 4 + .3));
        if (held.ccw) shield -= dt * 2.2; if (held.cw) shield += dt * 2.2;
        if (aim) { const want = Math.atan2(aim[1] - py, aim[0] - px); let dd = Math.atan2(Math.sin(want - shield), Math.cos(want - shield)); shield += clamp(dd, -dt * 5, dt * 5); }
        const toSun = Math.atan2(sy - py, sx - px), err = Math.atan2(Math.sin(toSun - shield), Math.cos(toSun - shield));
        const exposure = (1 - Math.cos(err)) / 2, near = .02 / (r * r);
        temp += (exposure * near * 900 - (temp - 30) * .5) * dt; temp = Math.max(30, temp); maxTemp = Math.max(maxTemp, temp);
        if (temp > 90) sayFree('psp_hot', 7000);
        if (r < .3 && exposure < .15) sayOnce('psp_fast');
        if (passes >= 1 && maxTemp < 110) sayOnce('psp_shield');
        if (passes >= 1) maxTemp = temp;
        const heat = clamp(near * .05 * (1 - exposure), 0, 1);
        ctx.save(); ctx.globalAlpha = .5; ctx.strokeStyle = '#59E0E8'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(shield) * 60, py + Math.sin(shield) * 60); ctx.stroke(); ctx.restore();
        CRAFT_DRAW.parker(ctx, px, py, .55, shield, heat);
        // gauges
        const v = Math.sqrt(2 / r - 1 / o.a), vmax = Math.sqrt(2 / (o.a * (1 - o.e)) - 1 / o.a), kmh = Math.round(690000 * v / vmax / 1000) * 1000;
        const dist = (6.1 + (r - o.a * (1 - o.e)) / (o.a * (1 + o.e) - o.a * (1 - o.e)) * (108 - 6.1));
        const gx = W - Math.min(250, W * .5) - 16, gw = Math.min(250, W * .5);
        gauge(ctx, gx, T, gw, `Speed: ${kmh.toLocaleString('en-IN')} km/h`, v / vmax, '#59E0E8');
        gauge(ctx, gx, T + 46, gw, `Instruments: ${Math.round(temp)} °C ${temp > 90 ? 'too hot!' : 'cool'}`, (temp - 30) / 120, temp > 90 ? '#FF6D8A' : '#6FEA95');
        text(ctx, `${dist.toFixed(1)} million km from the Sun`, gx + gw / 2, T + 104, 13, '#A8B2DE', 'center', 600);
        if (!aim && !held.ccw && !held.cw && t % 6 < 3) pill(ctx, 'Drag towards the Sun to aim the shield', W / 2, B - 6, 'rgba(89,224,232,.9)', '#062A2E', 12);
      }
    };
  })();

  /* ---------------------------------------------------------------- Juno at Jupiter */
  S.juno = (() => {
    let o, photos, spin, flash;
    const slot = makeSlot(), moonSlots = {};
    const MOONS = [['Io', .9, '#E8D46A'], ['Europa', 1.4, '#D9CDB8'], ['Ganymede', 2.2, '#A89C8C'], ['Callisto', 3.2, '#6E655C']];
    function photo() {
      const c = document.createElement('canvas'); c.width = 240; c.height = 170; const g = c.getContext('2d'), img = g.createImageData(240, 170), tex = TEX.jupiter;
      if (!tex) return c;
      const lat0 = (Math.random() * .9 + .2) * (Math.random() < .5 ? 1 : -1), lon0 = Math.random() * TAU;
      for (let y = 0; y < 170; y++) for (let x = 0; x < 240; x++) {
        const u = x / 240 - .5, v = y / 170 - .5, w1 = fbm(u * 6 + lon0, v * 6, lat0, 4) - .5, w2 = fbm(u * 6, v * 6 + 3, lat0 + lon0, 4) - .5;
        const lat = clamp(lat0 + v * .5 + w1 * .18, -1.5, 1.5), lon = lon0 + u * .7 + w2 * .18;
        let tx = Math.floor(((lon / TAU) % 1 + 1) % 1 * tex.w), ty = Math.floor((.5 - lat / PI) * tex.h);
        const o2 = (clamp(ty, 0, tex.h - 1) * tex.w + tx) * 4, j = (y * 240 + x) * 4, m = (tex.data[o2] + tex.data[o2 + 1] + tex.data[o2 + 2]) / 3;
        for (let k = 0; k < 3; k++) img.data[j + k] = clamp(m + (tex.data[o2 + k] - m) * 1.9 + (w1 * 90), 0, 255);
        img.data[j] = clamp(img.data[j] * (.85 + .3 * (lat0 > 0 ? .2 : .6)), 0, 255); img.data[j + 2] = clamp(img.data[j + 2] * 1.15, 0, 255); img.data[j + 3] = 255;
      }
      g.putImageData(img, 0, 0); return c;
    }
    return {
      name: 'Juno', line: 'juno_intro', facts: 'Launched 2011 · Reached Jupiter in 2016 · Solar powered, with three giant panels',
      keys: { space: 'snap' },
      reset() { o = null; photos = []; spin = 0; flash = 0; setCtl([{ id: 'snap', icon: 'camera', label: 'Snap!', go: true }, { id: 'moons', label: 'Jupiter\'s moons' }]); },
      press() {},
      act(id) {
        if (id === 'moons') { say('juno_moons'); return; }
        if (id === 'snap') {
          if (o && o.r < 1.7) { flash = 1; Sfx.chime(); photos.unshift(photo()); photos.length = Math.min(photos.length, 3); say('juno_photo'); }
          else { Sfx.boop(); say('juno_far'); }
        }
      },
      frame(ctx, dt, d) {
        const T = top(), B = bottom(), R = Math.min((B - T) * .26, W * .22), cx = W < 760 ? W * .5 : W * .42, cy = (T + B) / 2 + R * .3;
        const ra = Math.max(2.2, Math.min((cy - T) / (R * .63), (W - cx) / (R * .62)) * .92), rp = 1.15, tilt = 2.24; // far point up and to the right
        if (!o || Math.abs(o.ra - ra) > .05) { const a = (ra + rp) / 2, e = (ra - rp) / (ra + rp); o = { a, e, ra, th: o ? o.th : 2.2, h: TAU * a * a * Math.sqrt(1 - e * e) / 9 }; }
        keplerStep(o, dt); spin += dt * 2.5;
        const orb = th => { const rr = o.a * (1 - o.e * o.e) / (1 + o.e * Math.cos(th)); return [cx + Math.cos(th + tilt) * rr * R, cy + Math.sin(th + tilt) * rr * R * .8]; };
        const [jx, jy] = orb(o.th);
        const moonPos = MOONS.map(([n, rr, c], i) => { const a = t * (.5 / rr) + i * 1.7; return { n, c, x: cx + Math.cos(a) * R * rr * 1.25, y: cy + Math.sin(a) * R * .12, z: Math.sin(a) }; });
        for (const m of moonPos) if (m.z < 0) { ctx.fillStyle = m.c; ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = 'rgba(89,224,232,.3)'; ctx.setLineDash([4, 7]); ctx.beginPath();
        for (let i = 0; i <= 80; i++) { const [x, y] = orb(i / 80 * TAU); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); ctx.setLineDash([]);
        drawBody(ctx, 'jupiter', cx, cy, R, { rot: -t * .25, L: [-.6, -.3, .74], pitch: .2, dpr: d, slot, maxD: 420 });
        for (const m of moonPos) if (m.z >= 0) { ctx.fillStyle = m.c; ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, TAU); ctx.fill(); text(ctx, m.n, m.x, m.y - 9, 11, '#C9D0F2', 'center', 600); }
        CRAFT_DRAW.juno(ctx, jx, jy, .5, spin);
        const close = o.r < 1.7;
        pill(ctx, close ? 'Close! Snap now!' : 'Too far for a photo', jx, jy - 32, close ? '#6FEA95' : 'rgba(13,20,52,.85)', close ? '#062A2E' : '#A8B2DE', 12);
        // photo album
        photos.forEach((p, i) => {
          const w = Math.min(180, W * .34), h = w * 170 / 240, x = W - w - 16, y = T + i * (h + 10);
          ctx.fillStyle = '#F3F1FF'; ctx.fillRect(x - 4, y - 4, w + 8, h + 8); ctx.drawImage(p, x, y, w, h);
        });
        if (flash > 0) { flash -= dt * 2; ctx.fillStyle = `rgba(255,255,255,${Math.max(0, flash)})`; ctx.fillRect(0, 0, W, H); }
      }
    };
  })();

  /* ---------------------------------------------------------------- Cassini and Huygens */
  S.cassini = (() => {
    let ang, hu, finale, dives, ended;
    const slot = makeSlot(), tslot = makeSlot();
    return {
      name: 'Cassini and Huygens', line: 'cassini_intro', facts: 'Launched 1997 · Circled Saturn from 2004 to 2017 · Huygens landed on Titan in 2005',
      reset() { ang = 0; hu = null; finale = null; dives = 0; ended = false; setCtl([{ id: 'drop', label: 'Drop Huygens', go: true }, { id: 'finale', label: 'Grand finale', cyan: true }, { id: 'again', icon: 'again', label: 'Start again' }]); },
      act(id) {
        if (id === 'again') this.reset();
        if (id === 'drop' && !hu && !finale) { hu = { t: 0 }; Sfx.whoosh(); say('cassini_huygens'); }
        if (id === 'finale' && !finale) { finale = { t: 0 }; Sfx.whoosh(); say('cassini_finale'); }
      },
      frame(ctx, dt, d) {
        const T = top(), B = bottom(), R = Math.min((B - T) * .2, W * .16), cx = W < 760 ? W * .45 : W * .4, cy = (T + B) / 2 + 20;
        const ta = t * .12, tx = cx + Math.cos(ta) * R * 3.4, ty = cy + Math.sin(ta) * R * .5;
        let crx, cry, front;
        if (finale && !ended) {
          finale.t += dt; const rr = lerp(R * 2.6, R * 1.12, clamp(finale.t / 4, 0, 1));
          ang += dt * (1.2 + finale.t * .2); if (Math.cos(ang) > .995) dives = Math.min(22, dives + 1);
          crx = cx + Math.cos(ang) * rr; cry = cy + Math.sin(ang) * rr * .4; front = Math.sin(ang) > 0;
          if (finale.t > 14) { const k = clamp((finale.t - 14) / 2.5, 0, 1); crx = lerp(crx, cx + R * .2, k); cry = lerp(cry, cy - R * .3, k); if (k >= 1) { ended = true; Sfx.boop(); } }
        } else { ang += dt * .55; crx = cx + Math.cos(ang) * R * 2.6; cry = cy + Math.sin(ang) * R * .9; front = Math.sin(ang) > 0; }
        const titanFront = Math.sin(ta) > 0;
        if (!titanFront) drawBody(ctx, 'venus', tx, ty, R * .16, { rot: 0, L: [-.7, -.2, .7], pitch: .2, dpr: d, slot: tslot });
        if (!front && !ended) CRAFT_DRAW.cassini(ctx, crx, cry, .32, !hu);
        drawBody(ctx, 'saturn', cx, cy, R, { rot: -t * .2, L: [-.6, -.3, .74], pitch: .42, dpr: d, slot, ringFlat: .38, maxD: 360 });
        if (titanFront) drawBody(ctx, 'venus', tx, ty, R * .16, { rot: 0, L: [-.7, -.2, .7], pitch: .2, dpr: d, slot: tslot });
        text(ctx, 'Titan', tx, ty - R * .16 - 6, 12, '#E6C482', 'center', 600);
        if (front && !ended) CRAFT_DRAW.cassini(ctx, crx, cry, .32, !hu);
        if (finale && !ended && finale.t > 14) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,80,.8)'; ctx.beginPath(); ctx.arc(crx, cry, 10, 0, TAU); ctx.fill(); ctx.restore(); }
        if (finale) pill(ctx, ended ? 'Mission complete · 15 September 2017' : `Dives through the gap: ${dives} of 22`, W / 2, B - 8, '#FFB52E', '#2A1600', 14);
        if (hu) {
          hu.t += dt;
          const k = clamp(hu.t / 3.5, 0, 1), hx = lerp(hu.x0 ??= crx, tx, k), hy = lerp(hu.y0 ??= cry, ty, k);
          if (k < 1) { ctx.fillStyle = '#E8D8B0'; ctx.beginPath(); ctx.arc(hx, hy, 4, 0, TAU); ctx.fill(); }
          else {
            // inset: Huygens floating down through Titan's orange haze
            const w = Math.min(230, W * .42), h = w * .9, x = W - w - 16, y = T;
            ctx.save(); roundRect(ctx, x, y, w, h, 16); ctx.clip();
            const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#C9822E'); g.addColorStop(1, '#E7B670'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
            ctx.fillStyle = '#8A5A2B'; ctx.beginPath(); ctx.moveTo(x, y + h * .82); for (let i = 0; i <= 10; i++) ctx.lineTo(x + w * i / 10, y + h * (.8 + Math.sin(i * 1.7) * .03)); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
            ctx.fillStyle = '#3B3550'; ctx.beginPath(); ctx.ellipse(x + w * .7, y + h * .9, w * .2, 5, 0, 0, TAU); ctx.fill();
            const fall = clamp((hu.t - 3.5) / 7, 0, 1), py = lerp(y + 30, y + h * .78, fall), ppx = x + w * .4;
            if (fall < 1) { ctx.fillStyle = '#FF7442'; ctx.beginPath(); ctx.arc(ppx, py - 30, 18, PI, TAU); ctx.fill(); ctx.strokeStyle = '#F3F1FF'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ppx - 18, py - 30); ctx.lineTo(ppx, py - 4); ctx.lineTo(ppx + 18, py - 30); ctx.stroke(); }
            ctx.fillStyle = '#E8D8B0'; ctx.beginPath(); ctx.ellipse(ppx, py, 8, 5, 0, 0, TAU); ctx.fill();
            ctx.restore();
            text(ctx, fall < 1 ? 'Parachuting onto Titan…' : 'Landed on Titan! 2005', x + w / 2, y + h + 18, 13, '#FFB52E', 'center', 700);
          }
        }
      }
    };
  })();

  /* ---------------------------------------------------------------- New Horizons */
  S.newhorizons = (() => {
    let dist, target, shot, flash;
    const slot = makeSlot(), shotSlot = makeSlot();
    function drawArrokoth(ctx, x, y, r) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.4);
      for (const [ox, rr, k] of [[-r * .55, r * .62, .8], [r * .55, r * .48, .9]]) { const g = ctx.createRadialGradient(ox - rr * .3, -rr * .3, rr * .1, ox, 0, rr); g.addColorStop(0, '#C9785A'); g.addColorStop(1, '#5A2A1C'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ox, 0, rr, rr * k, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    function drawTarget(ctx, x, y, r, d) {
      if (target === 'pluto') drawBody(ctx, 'pluto', x, y, r, { rot: 0, L: [-.7, -.3, .65], pitch: .1, dpr: d, slot, maxD: 360 });
      else drawArrokoth(ctx, x, y, r);
    }
    return {
      name: 'New Horizons', line: 'nh_intro', facts: 'Launched 2006 · Flew past Pluto in 2015 · Flew past Arrokoth in 2019',
      keys: { space: 'snap' },
      reset() { dist = 3000000; target = 'pluto'; shot = null; flash = 0; setCtl([{ id: 'snap', icon: 'camera', label: 'Snap!', go: true }, { id: 'next', icon: 'next', label: 'Fly to Arrokoth' }, { id: 'again', icon: 'again', label: 'Start again' }]); },
      act(id) {
        if (id === 'again') this.reset();
        if (id === 'next') { target = 'arrokoth'; dist = 3000000; shot = null; Sfx.whoosh(); }
        if (id === 'snap') {
          if (shot) { shot = null; return; }
          const good = dist < 90000; flash = 1; Sfx.chime();
          shot = { good, px: clamp(Math.round(260 * 12500 / Math.max(12500, dist) * 4), 3, 220) };
          if (target === 'arrokoth') say('nh_arrokoth'); else say(good ? 'nh_perfect' : 'nh_blurry');
        }
      },
      down() { if (shot) shot = null; },
      frame(ctx, dt, d) {
        const T = top(), B = bottom(), cy = (T + B) / 2 + 10;
        if (!shot) dist = Math.max(-400000, dist - dt * (dist > 400000 ? 260000 : 70000));
        if (dist <= -400000) dist = 3000000;
        const nx = W * .28, r = clamp(12500 * 14 / Math.max(12500, Math.abs(dist)) * (Math.min(W, H) / 40), 2, (B - T) * .32);
        const tx = dist > 0 ? nx + 60 + Math.min(W * .6, dist / 3000000 * W * .6 + r) : nx - (-dist / 400000) * W * .5 + 60;
        for (let i = 0; i < 12; i++) { const y = T + (i * 61) % (B - T), x = (W - ((t * 300 + i * 133) % (W + 100))); ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30, y); ctx.stroke(); }
        if (target === 'pluto') { ctx.fillStyle = '#9A8E80'; ctx.beginPath(); ctx.arc(tx + r * 2.2, cy - r * .9, Math.max(1.2, r * .5), 0, TAU); ctx.fill(); }
        drawTarget(ctx, tx, cy, r, d);
        CRAFT_DRAW.newhorizons(ctx, nx, cy + (B - T) * .22, .55);
        text(ctx, target === 'pluto' ? 'Pluto' : 'Arrokoth', tx, cy + r + 18, 13, '#C9D0F2', 'center', 600);
        const close = dist > 0 && dist < 90000;
        pill(ctx, dist > 0 ? `${Math.round(dist).toLocaleString('en-IN')} km to go` : 'Flying away…', W / 2, T + 14, close ? '#6FEA95' : 'rgba(13,20,52,.88)', close ? '#062A2E' : '#F3F1FF', 15);
        if (shot) {
          ctx.fillStyle = 'rgba(5,8,23,.88)'; ctx.fillRect(0, 0, W, H);
          const s = Math.min(W * .7, (B - T) * .7), x = W / 2 - s / 2, y = (T + B) / 2 - s / 2;
          const c = document.createElement('canvas'); c.width = c.height = Math.max(4, Math.min(shot.px, 220)); const g = c.getContext('2d');
          g.fillStyle = '#050817'; g.fillRect(0, 0, c.width, c.height);
          if (target === 'pluto') drawBody(g, 'pluto', c.width / 2, c.height / 2, c.width * .45, { rot: 0, L: [-.6, -.3, .74], pitch: .1, dpr: 1, slot: shotSlot });
          else drawArrokoth(g, c.width / 2, c.height / 2, c.width * .3);
          ctx.save(); ctx.imageSmoothingEnabled = true; ctx.fillStyle = '#F3F1FF'; ctx.fillRect(x - 6, y - 6, s + 12, s + 12); ctx.drawImage(c, x, y, s, s); ctx.restore();
          text(ctx, 'Tap to close', W / 2, y + s + 26, 13, '#A8B2DE', 'center', 600);
        }
        if (flash > 0) { flash -= dt * 2; ctx.fillStyle = `rgba(255,255,255,${Math.max(0, flash)})`; ctx.fillRect(0, 0, W, H); }
      }
    };
  })();

  /* ---------------------------------------------------------------- Chandrayaan-3 landing */
  S.chandrayaan = (() => {
    let L, ground, pad, state, rover, tracks, dust;
    const earthSlot = makeSlot();
    const G = 26, THRUST = 64, SIDE = 30;
    function build() {
      const r = rng(Math.floor(Math.random() * 1e6)); ground = [];
      pad = .35 + r() * .4;
      for (let i = 0; i <= 60; i++) { const u = i / 60, onPad = Math.abs(u - pad) < .07; ground.push(onPad ? 0 : (Math.sin(u * 23 + r() * 2) * .5 + r()) * .045); }
    }
    function gy(x) { const B = bottom(), u = clamp(x / W, 0, 1) * 60, i = Math.floor(u), f = u - i; return B - 40 - (lerp(ground[i], ground[Math.min(60, i + 1)], f)) * (B - top()); }
    function controls() {
      if (state === 'rover') setCtl([{ id: 'left', icon: 'left', hold: true, aria: 'Drive left' }, { id: 'right', icon: 'right', hold: true, aria: 'Drive right' }, { id: 'again', icon: 'again', label: 'Land again' }]);
      else setCtl([{ id: 'left', icon: 'left', hold: true, aria: 'Push left' }, { id: 'thrust', icon: 'flame', label: 'Thrust', hold: true, go: true }, { id: 'right', icon: 'right', hold: true, aria: 'Push right' }, { id: 'again', icon: 'again', label: 'Start again' }]);
    }
    return {
      name: 'Chandrayaan-3 (ISRO)', line: 'ch3_intro', facts: 'Launched 14 July 2023 · Landed near the Moon\'s south pole on 23 August 2023',
      keys: { left: 'left', right: 'right', up: 'thrust', space: 'thrust' },
      reset() { build(); L = { x: W * .2, y: top() + 30, vx: 22, vy: 12, fuel: 1 }; state = 'fly'; rover = null; tracks = []; dust = []; controls(); },
      act(id) { if (id === 'again') this.reset(); },
      frame(ctx, dt, d) {
        const T = top(), B = bottom();
        drawBody(ctx, 'earth', W * .82, T + 40, 26, { rot: -t * .1, L: [-.7, -.2, .7], pitch: .3, dpr: d, slot: earthSlot });
        // ground
        ctx.fillStyle = '#8F8E8A'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 6) ctx.lineTo(x, gy(x)); ctx.lineTo(W, H); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 8; i++) { const x = (i * 157) % W; ctx.beginPath(); ctx.ellipse(x, gy(x) + 20 + (i % 3) * 14, 22, 5, 0, 0, TAU); ctx.fill(); }
        const px0 = (pad - .06) * W, px1 = (pad + .06) * W;
        ctx.fillStyle = '#6FEA95'; ctx.fillRect(px0, gy(px0) - 2, 4, 6); ctx.fillRect(px1 - 4, gy(px1) - 2, 4, 6);
        ctx.strokeStyle = 'rgba(111,234,149,.5)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(px0, gy(px0)); ctx.lineTo(px1, gy(px1)); ctx.stroke(); ctx.setLineDash([]);
        for (const tr of tracks) { ctx.fillStyle = 'rgba(60,60,58,.55)'; ctx.font = '700 7px Lexend, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(tr.k ? 'ISRO' : '☸', tr.x, tr.y); }
        if (state === 'fly') {
          const th = held.thrust && L.fuel > 0, sl = held.left && L.fuel > 0, sr = held.right && L.fuel > 0;
          L.vy += (G - (th ? THRUST : 0)) * dt; L.vx += ((sr ? SIDE : 0) - (sl ? SIDE : 0)) * dt;
          if (th) L.fuel -= dt * .07; if (sl || sr) L.fuel -= dt * .03; L.fuel = Math.max(0, L.fuel);
          L.x = clamp(L.x + L.vx * dt, 30, W - 30); L.y += L.vy * dt;
          if (th && gy(L.x) - L.y < 120) for (let i = 0; i < 2; i++) dust.push({ x: L.x + (Math.random() - .5) * 20, y: gy(L.x), vx: (Math.random() - .5) * 160, vy: -Math.random() * 40, l: 0 });
          const foot = L.y + 30;
          if (foot >= gy(L.x)) {
            L.y = gy(L.x) - 30;
            const onPad = Math.abs(L.x / W - pad) < .06, soft = L.vy < 30 && Math.abs(L.vx) < 22;
            if (soft && onPad) { state = 'landed'; Sfx.chime(); Voice.say('ch3_landed', () => { if (state === 'landed') { state = 'rover'; rover = { x: L.x + 10, roll: 0, ramp: 0 }; controls(); say('ch3_rover'); } }); }
            else if (soft) { state = 'crash'; Sfx.boop(); say('ch3_missed'); }
            else { state = 'crash'; Sfx.boop(); say('ch3_crash'); for (let i = 0; i < 40; i++) dust.push({ x: L.x, y: L.y + 20, vx: (Math.random() - .5) * 300, vy: -Math.random() * 200, l: 0 }); }
          }
        }
        for (let i = dust.length - 1; i >= 0; i--) { const p = dust[i]; p.l += dt; p.vy += G * dt * 2; p.x += p.vx * dt; p.y += p.vy * dt; if (p.l > 1.2) { dust.splice(i, 1); continue; } ctx.fillStyle = `rgba(190,188,182,${1 - p.l / 1.2})`; ctx.fillRect(p.x, p.y, 3, 3); }
        ctx.save(); if (state === 'crash') { ctx.translate(L.x, L.y + 30); ctx.rotate(.5); ctx.translate(-L.x, -L.y - 30); }
        CRAFT_DRAW.vikram(ctx, L.x, L.y, .9, state === 'fly' && held.thrust && L.fuel > 0 ? 1 : 0);
        if (state === 'fly') { if (held.left && L.fuel > 0) flame(ctx, L.x + 22, L.y - 2, 12, 3, 0); if (held.right && L.fuel > 0) flame(ctx, L.x - 22, L.y - 2, 12, 3, PI); }
        ctx.restore();
        if (rover) {
          rover.ramp = Math.min(1, rover.ramp + dt * .6);
          ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L.x + 18, L.y + 6); ctx.lineTo(L.x + 18 + 30 * rover.ramp, gy(L.x + 48)); ctx.stroke();
          if (rover.ramp >= 1) {
            const v = (held.right ? 40 : 0) - (held.left ? 40 : 0); rover.x = clamp(rover.x + v * dt, L.x + 50, W - 30); rover.roll += v * dt / 5;
            if (v && (!tracks.length || Math.abs(tracks[tracks.length - 1].x - rover.x) > 14)) tracks.push({ x: rover.x, y: gy(rover.x) + 8, k: tracks.length % 2 });
            if (tracks.length > 120) tracks.shift();
          }
          const rx = rover.ramp < 1 ? L.x + 18 + 30 * rover.ramp : rover.x;
          CRAFT_DRAW.pragyan(ctx, rx, gy(rx) - 5, .9, rover.roll);
        }
        // readouts
        if (state === 'fly') {
          const sp = Math.hypot(L.vx, L.vy) / 12, h = Math.max(0, (gy(L.x) - L.y - 30) / 3);
          gauge(ctx, 16, T, 180, `Falling speed: ${(L.vy / 12).toFixed(1)} m/s ${L.vy > 30 ? '(slow down!)' : ''}`, L.vy / 80, L.vy > 30 ? '#FF6D8A' : '#6FEA95');
          gauge(ctx, 16, T + 46, 180, `Fuel left: ${Math.round(L.fuel * 100)}%`, L.fuel, '#FFB52E');
          text(ctx, `Height: ${Math.round(h)} m`, 26, T + 106, 14, '#F3F1FF', 'left', 600);
          void sp;
        } else if (state === 'landed' || state === 'rover') pill(ctx, 'Landed! Shiv Shakti Point', W / 2, T + 16, '#6FEA95', '#062A2E', 16);
        else if (state === 'crash') pill(ctx, 'Press Start again to try once more', W / 2, T + 16, '#FF6D8A', '#2A0010', 15);
      }
    };
  })();

  /* ---------------------------------------------------------------- Mangalyaan */
  S.mangalyaan = (() => {
    const APOS = [23550, 28825, 40186, 71636, 118642, 192874];
    let burns, o, firing, phase, trip, msgT;
    const eSlot = makeSlot(), mSlot = makeSlot(), mSlot2 = makeSlot();
    function setOrbit() { const rp = 1, ra = Math.sqrt(APOS[Math.min(burns, 5)] / 23550) * 2.2; o = { a: (rp + ra) / 2, e: (ra - rp) / (ra + rp), th: o ? o.th : 0, h: .9 * Math.sqrt((rp + ra) / 2) }; }
    return {
      name: 'Mangalyaan (ISRO)', line: 'mom_intro', facts: 'Launched 5 November 2013 · Reached Mars 24 September 2014 · First try!',
      keys: { space: 'fire' },
      reset() { burns = 0; o = null; setOrbit(); o.th = 2.5; firing = 0; phase = 'earth'; trip = 0; msgT = 0; setCtl([{ id: 'fire', icon: 'flame', label: 'Fire engine', go: true }, { id: 'again', icon: 'again', label: 'Start again' }]); },
      act(id) {
        if (id === 'again') { this.reset(); return; }
        if (id !== 'fire' || phase !== 'earth') return;
        const inZone = Math.cos(o.th) > .93;
        if (!inZone) { Sfx.boop(); sayFree('mom_wait', 3000); return; }
        firing = .8; burns++; Sfx.whoosh();
        if (burns >= 6) { phase = 'leave'; trip = 0; say('mom_escape'); }
        else { setOrbit(); say('mom_good'); }
      },
      frame(ctx, dt, d) {
        const T = top(), B = bottom(), cx = W < 760 ? W * .32 : W * .3, cy = (T + B) / 2 + 10;
        if (phase === 'earth') {
          const scale = Math.min((W - cx - 40) / (o.a * (1 + o.e)), (B - T) * .5 / (o.a * Math.sqrt(1 - o.e * o.e)) * .9), er = scale * .62;
          keplerStep(o, dt * 1.1);
          const q = o.th, x = cx + Math.cos(q) * o.r * scale, y = cy - Math.sin(q) * o.r * scale;
          ctx.strokeStyle = 'rgba(89,224,232,.35)'; ctx.setLineDash([4, 7]); ctx.beginPath();
          for (let i = 0; i <= 90; i++) { const a = i / 90 * TAU, rr = o.a * (1 - o.e * o.e) / (1 + o.e * Math.cos(a)); const xx = cx + Math.cos(a) * rr * scale, yy = cy - Math.sin(a) * rr * scale; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
          ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(111,234,149,.85)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, scale * o.a * (1 - o.e), -.38, .38); ctx.stroke(); ctx.lineWidth = 1;
          drawBody(ctx, 'earth', cx, cy, er, { rot: -t * .3, L: [-.7, -.3, .65], pitch: .3, dpr: d, slot: eSlot, maxD: 300 });
          const dir = Math.atan2(-(Math.cos(q)), -Math.sin(q));
          ctx.save(); ctx.translate(x, y); ctx.rotate(dir + PI); CRAFT_DRAW.mangalyaan(ctx, 0, 0, .42, firing > 0 ? 1 : 0); ctx.restore();
          if (firing > 0) firing -= dt;
          if (Math.cos(q) > .93) pill(ctx, 'Now! Fire!', x, y - 26, '#6FEA95', '#062A2E', 13);
          const gw = Math.min(260, W - 32);
          ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, W - gw - 16, T, gw, 66, 14); ctx.fill();
          text(ctx, `Engine burns: ${burns} of 6`, W - gw - 2, T + 26, 17, '#FFB52E', 'left');
          text(ctx, `Farthest from Earth: ${APOS[Math.min(burns, 5)].toLocaleString('en-IN')} km`, W - gw - 2, T + 50, 13, '#F3F1FF', 'left', 600);
        } else {
          trip += dt / 8; const k = clamp(trip, 0, 1);
          const sx = W / 2, sy = (T + B) / 2 + 10, rE = Math.min(W * .22, (B - T) * .28), rM = rE * 1.52;
          sunGlow(ctx, sx, sy, 12, t, .8); ctx.fillStyle = '#FFE38A'; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(140,160,255,.3)'; ctx.beginPath(); ctx.arc(sx, sy, rE, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(sx, sy, rM, 0, TAU); ctx.stroke();
          const a0 = PI * .9, ea = a0 + k * PI * .9, ma = a0 + PI - (1 - k) * PI * .55;
          drawBody(ctx, 'earth', sx + Math.cos(ea) * rE, sy - Math.sin(ea) * rE, 7, { rot: 0, L: [0, 0, 1], pitch: .3, dpr: d, slot: eSlot });
          drawBody(ctx, 'mars', sx + Math.cos(ma) * rM, sy - Math.sin(ma) * rM, 6, { rot: 0, L: [0, 0, 1], pitch: .3, dpr: d, slot: mSlot });
          ctx.strokeStyle = 'rgba(255,181,46,.6)'; ctx.setLineDash([4, 6]); ctx.beginPath();
          for (let i = 0; i <= 60; i++) { const u = i / 60 * k, a = a0 + u * PI, rr = lerp(rE, rM, (1 - Math.cos(u * PI)) / 2); const xx = sx + Math.cos(a) * rr, yy = sy - Math.sin(a) * rr; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
          ctx.stroke(); ctx.setLineDash([]);
          const a = a0 + k * PI, rr = lerp(rE, rM, (1 - Math.cos(k * PI)) / 2);
          CRAFT_DRAW.mangalyaan(ctx, sx + Math.cos(a) * rr, sy - Math.sin(a) * rr, .3);
          text(ctx, 'Earth', sx + Math.cos(ea) * rE, sy - Math.sin(ea) * rE + 20, 12, '#C9D0F2', 'center', 600);
          text(ctx, 'Mars', sx + Math.cos(ma) * rM, sy - Math.sin(ma) * rM + 20, 12, '#E7A07A', 'center', 600);
          pill(ctx, `Day ${Math.round(k * 298)} of the journey`, W / 2, T + 16, '#FFB52E', '#2A1600', 15);
          if (k >= 1 && phase === 'leave') { phase = 'mars'; Sfx.chime(); say('mom_arrive'); }
          if (phase === 'mars') {
            const w = Math.min(220, W * .42), x0 = W - w - 16, y0 = B - w * .8 - 10;
            ctx.fillStyle = 'rgba(13,20,52,.92)'; roundRect(ctx, x0, y0, w, w * .8, 16); ctx.fill();
            drawBody(ctx, 'mars', x0 + w / 2, y0 + w * .4, w * .24, { rot: -t * .2, L: [-.6, -.3, .74], pitch: .2, dpr: d, slot: mSlot2 });
            const oa = t * 1.2; CRAFT_DRAW.mangalyaan(ctx, x0 + w / 2 + Math.cos(oa) * w * .36, y0 + w * .4 + Math.sin(oa) * w * .12, .2);
            text(ctx, 'In orbit around Mars!', x0 + w / 2, y0 + w * .76, 13, '#FFB52E', 'center', 700);
          }
        }
      }
    };
  })();

  /* ---------------------------------------------------------------- James Webb Space Telescope */
  S.webb = (() => {
    let step, k, temp, field, rocketY;
    function makeField(w, h) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), r = rng(77);
      g.fillStyle = '#04050C'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        const x = r() * w, y = r() * h, s = 1 + r() * 7, hue = r();
        g.save(); g.translate(x, y); g.rotate(r() * PI);
        const col = hue < .4 ? [255, 190, 120] : hue < .7 ? [255, 236, 210] : [200, 150, 255];
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * 2.2); gr.addColorStop(0, `rgba(${col},.95)`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.scale(1, .35 + r() * .65); g.beginPath(); g.arc(0, 0, s * 2.2, 0, TAU); g.fill();
        if (s > 5 && r() < .5) { g.strokeStyle = `rgba(${col},.45)`; g.lineWidth = 1.2; for (let a = 0; a < 2; a++) { g.beginPath(); for (let q = 0; q < 3.5; q += .2) g.lineTo(Math.cos(q + a * PI) * q * s * .9, Math.sin(q + a * PI) * q * s * .9); g.stroke(); } }
        g.restore();
      }
      for (let i = 0; i < 6; i++) { const x = r() * w, y = r() * h, s = 10 + r() * 16; g.strokeStyle = 'rgba(255,240,220,.85)'; g.lineWidth = 1.2; g.beginPath(); for (let a = 0; a < 6; a++) { const q = a / 6 * TAU + PI / 2; g.moveTo(x, y); g.lineTo(x + Math.cos(q) * s, y + Math.sin(q) * s); } g.moveTo(x - s * .6, y); g.lineTo(x + s * .6, y); g.stroke(); g.fillStyle = '#FFF6E6'; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill(); }
      return c;
    }
    const LABELS = ['Folded up inside the rocket', 'Blast off! Christmas Day 2021', 'Step 2: open the sunshield', 'Step 3: unfold the gold mirror', 'Step 4: cool down to −233 °C', 'Step 5: look deep into space!'];
    return {
      name: 'James Webb Space Telescope', line: 'jwst_intro', facts: 'Launched 25 December 2021 · Lives 1.5 million km from Earth · Biggest space telescope ever',
      reset() { step = 0; k = 1; temp = 20; rocketY = 0; setCtl([{ id: 'next', icon: 'next', label: 'Next step', go: true }, { id: 'again', icon: 'again', label: 'Start again' }]); },
      act(id) {
        if (id === 'again') { this.reset(); return; }
        if (id === 'next' && k >= 1 && step < 5) { step++; k = 0; Sfx.whoosh(); if (step === 2) say('jwst_shield'); if (step === 3) say('jwst_mirror'); if (step === 5) say('jwst_look'); }
      },
      down() { this.act('next'); },
      frame(ctx, dt) {
        const T = top(), B = bottom(), cx = W / 2, cy = (T + B) / 2 + 20, s = Math.min(W / 180, (B - T) / 130);
        k = Math.min(1, k + dt / (step === 1 ? 2.6 : 2.2));
        if (step <= 1) {
          const lift = step === 1 ? Math.pow(k, 2) * (B - T) * .7 : 0, open = step === 1 ? smooth(.6, 1, k) : 0;
          const rx = cx, ry = cy + 20 - lift;
          if (step === 1) flame(ctx, rx, ry + 92 * s * .5, 60 * s * .5 * (1 - open * .5), 9 * s * .5);
          ctx.save(); ctx.translate(rx, ry); ctx.scale(s * .5, s * .5);
          ctx.fillStyle = '#F3F4F8'; ctx.fillRect(-14, -10, 28, 100); ctx.fillStyle = '#C9CED8'; ctx.fillRect(-30, 30, 14, 60); ctx.fillRect(16, 30, 14, 60);
          ctx.fillStyle = '#F3F4F8';
          ctx.save(); ctx.translate(-open * 30, 0); ctx.rotate(-open * .6); ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(-16, -60); ctx.quadraticCurveTo(-16, -90, 0, -96); ctx.lineTo(0, -10); ctx.fill(); ctx.restore();
          ctx.save(); ctx.translate(open * 30, 0); ctx.rotate(open * .6); ctx.beginPath(); ctx.moveTo(16, -10); ctx.lineTo(16, -60); ctx.quadraticCurveTo(16, -90, 0, -96); ctx.lineTo(0, -10); ctx.fill(); ctx.restore();
          ctx.restore();
          if (open > .3) CRAFT_DRAW.webb(ctx, rx, ry - 40 * s * .5, s * .45, 0, 0);
        } else {
          const sh = step === 2 ? smooth(0, 1, k) : 1, mi = step === 3 ? smooth(0, 1, k) : step > 3 ? 1 : 0;
          if (step >= 4) temp = lerp(temp, -233, Math.min(1, dt * 1.2));
          CRAFT_DRAW.webb(ctx, cx, cy, s, sh, mi);
          if (step >= 4) { const tx = 16, ty = B - 50; gauge(ctx, tx, ty, 200, `Mirror temperature: ${Math.round(temp)} °C`, (temp + 233) / 253, '#59E0E8'); }
          if (step === 5 && k > .4) {
            if (!field) field = makeField(480, 300);
            const a = smooth(.4, 1, k), w = Math.min(W - 32, 640), h = w * 300 / 480, x = (W - w) / 2, y = Math.max(T, (T + B) / 2 - h / 2);
            ctx.globalAlpha = a; ctx.fillStyle = '#F3F1FF'; ctx.fillRect(x - 5, y - 5, w + 10, h + 10); ctx.drawImage(field, x, y, w, h); ctx.globalAlpha = 1;
            pill(ctx, 'Galaxies billions of light years away', W / 2, y + h - 10, 'rgba(13,20,52,.9)', '#FFB52E', 13);
          }
        }
        pill(ctx, LABELS[step], W / 2, T + 16, '#FFB52E', '#2A1600', 15);
      }
    };
  })();

  /* ---------------------------------------------------------------- Perseverance and Ingenuity */
  S.perseverance = (() => {
    let x, roll, samples, rocks, heli, drill, cam;
    function groundY(wx) { const B = bottom(); return B - 46 - Math.sin(wx * .004) * 18 - Math.sin(wx * .013) * 6; }
    return {
      name: 'Perseverance and Ingenuity', line: 'perse_intro', facts: 'Landed 18 February 2021 in Jezero Crater · Ingenuity made 72 flights',
      ownSky: true, keys: { left: 'left', right: 'right', space: 'fly', up: 'fly' },
      reset() {
        x = 200; roll = 0; samples = 0; drill = 0; cam = 0; heli = { x: 360, y: 0, vy: 0, spin: 0 };
        rocks = [520, 980, 1500, 2100].map(rx => ({ x: rx, done: false }));
        setCtl([{ id: 'left', icon: 'left', hold: true, aria: 'Drive left' }, { id: 'right', icon: 'right', hold: true, aria: 'Drive right' }, { id: 'drill', icon: 'drill', label: 'Drill', go: true }, { id: 'fly', icon: 'rotor', label: 'Fly', hold: true, cyan: true }]);
      },
      press(id) { if (id === 'fly') sayOnce('perse_heli'); },
      act(id) {
        if (id !== 'drill' || drill > 0) return;
        const rk = rocks.find(r => !r.done && Math.abs(r.x - (x + 40)) < 70);
        if (!rk) { Sfx.boop(); pillMsg = ['Drive next to a sparkly rock first', 2.5]; return; }
        drill = 2; rk.done = true; samples++; Sfx.chime(); sayOnce('perse_sample');
      },
      frame(ctx, dt) {
        const T = top(), B = bottom();
        const v = (held.right ? 70 : 0) - (held.left ? 70 : 0);
        if (drill <= 0) { x = clamp(x + v * dt, 80, 2400); roll += v * dt / 7; }
        drill = Math.max(0, drill - dt);
        cam = lerp(cam, x - W * .4, Math.min(1, dt * 3));
        let g = ctx.createLinearGradient(0, 0, 0, B); g.addColorStop(0, '#C9925E'); g.addColorStop(1, '#EBC69A'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFF0D6'; ctx.beginPath(); ctx.arc(W * .8, T + 30, 12, 0, TAU); ctx.fill();
        ctx.fillStyle = '#B57A4E'; ctx.beginPath(); ctx.moveTo(0, B - 120); for (let i = 0; i <= 20; i++) { const wx = i / 20 * W; ctx.lineTo(wx, B - 130 - Math.sin((wx + cam * .3) * .006) * 30 - 20); } ctx.lineTo(W, B); ctx.lineTo(0, B); ctx.fill();
        ctx.fillStyle = '#9C6440'; for (let i = 0; i < 4; i++) { const wx = ((i * 520 - cam * .5) % (W + 400) + W + 400) % (W + 400) - 200; ctx.fillRect(wx, B - 150 - i % 2 * 20, 120, 8); ctx.fillRect(wx + 10, B - 142 - i % 2 * 20, 100, 6); }
        ctx.fillStyle = '#C1683F'; ctx.beginPath(); ctx.moveTo(0, H); for (let sx = 0; sx <= W; sx += 8) ctx.lineTo(sx, groundY(sx + cam)); ctx.lineTo(W, H); ctx.fill();
        for (const rk of rocks) {
          const sx = rk.x - cam; if (sx < -60 || sx > W + 60) continue;
          ctx.fillStyle = rk.done ? '#7A4A30' : '#8C5A3C'; ctx.beginPath(); ctx.ellipse(sx, groundY(rk.x) - 6, 22, 13, 0, 0, TAU); ctx.fill();
          if (rk.done) { ctx.fillStyle = '#3A2214'; ctx.beginPath(); ctx.arc(sx + 4, groundY(rk.x) - 10, 3, 0, TAU); ctx.fill(); }
          else { ctx.strokeStyle = `rgba(255,240,180,${.5 + .5 * Math.sin(t * 4)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, groundY(rk.x) - 8, 28, 0, TAU); ctx.stroke(); }
        }
        // helicopter
        if (held.fly) { heli.vy -= 90 * dt; heli.spin += dt * 60; } else { heli.vy += 60 * dt; heli.spin += dt * (heli.y < 0 ? 50 : 0); }
        heli.vy *= Math.pow(.4, dt); heli.y = clamp(heli.y + heli.vy * dt, -(B - T) * .55, 0); if (heli.y >= 0) heli.vy = 0;
        heli.x = lerp(heli.x, x + 150, Math.min(1, dt * (heli.y < -5 ? .8 : 0)));
        const hx = heli.x - cam, hy = groundY(heli.x) - 12 + heli.y;
        if (heli.y < -4) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(hx, groundY(heli.x) - 2, 18, 4, 0, 0, TAU); ctx.fill(); }
        CRAFT_DRAW.ingenuity(ctx, hx, hy, 1, heli.spin);
        if (heli.y < -4) text(ctx, `Ingenuity: ${Math.round(-heli.y / 6)} m up`, hx, hy - 34, 12, '#2A1600', 'center', 700);
        const rx = x - cam;
        CRAFT_DRAW.perseverance(ctx, rx, groundY(x) - 10, 1.4, roll, drill > 0 ? 1 : 0);
        if (drill > 0) { ctx.fillStyle = 'rgba(160,100,60,.6)'; for (let i = 0; i < 6; i++) ctx.fillRect(rx + 60 + Math.random() * 20, groundY(x) - 8 - Math.random() * 14, 3, 3); }
        const bw = 200; ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, 16, T, bw, 48, 12); ctx.fill();
        text(ctx, `Rock samples: ${samples}`, 30, T + 22, 17, '#FFB52E', 'left'); text(ctx, 'Jezero Crater, Mars', 30, T + 40, 12, '#A8B2DE', 'left', 600);
        for (let i = 0; i < samples; i++) { ctx.fillStyle = '#E8EBF3'; roundRect(ctx, 16 + bw + 10 + i * 12, T + 6, 8, 36, 4); ctx.fill(); ctx.fillStyle = '#8C5A3C'; ctx.fillRect(16 + bw + 11 + i * 12, T + 24, 6, 16); }
        if (pillMsg && pillMsg[1] > 0) { pillMsg[1] -= dt; pill(ctx, pillMsg[0], W / 2, T + 76, 'rgba(13,20,52,.9)', '#FFB52E', 14); }
      }
    };
  })();

  /* ---------------------------------------------------------------- picker */
  function buildPicker() {
    const el = $('#craftPick'); el.innerHTML = '';
    const SHORT = { iss: 'Space Station', voyager: 'Voyager 1 & 2', parker: 'Solar Probe', juno: 'Juno', cassini: 'Cassini', newhorizons: 'New Horizons', chandrayaan: 'Chandrayaan-3', mangalyaan: 'Mangalyaan', webb: 'James Webb', perseverance: 'Perseverance' };
    for (const id of LIST) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'craft'; b.dataset.id = id; b.setAttribute('aria-pressed', 'false');
      const c = document.createElement('canvas'); c.width = c.height = 68; const g = c.getContext('2d');
      const draw = { iss: () => CRAFT_DRAW.iss(g, 34, 34, .42), voyager: () => CRAFT_DRAW.voyager(g, 40, 30, .7), parker: () => CRAFT_DRAW.parker(g, 38, 34, .8, PI), juno: () => CRAFT_DRAW.juno(g, 34, 38, .45, .4), cassini: () => CRAFT_DRAW.cassini(g, 30, 32, .8), newhorizons: () => CRAFT_DRAW.newhorizons(g, 30, 34, .9), chandrayaan: () => CRAFT_DRAW.vikram(g, 34, 26, .9), mangalyaan: () => CRAFT_DRAW.mangalyaan(g, 28, 38, .75), webb: () => CRAFT_DRAW.webb(g, 34, 36, .62), perseverance: () => CRAFT_DRAW.perseverance(g, 34, 46, .85) };
      draw[id]();
      b.appendChild(c); b.appendChild(document.createTextNode(SHORT[id]));
      b.addEventListener('click', () => pick(id));
      el.appendChild(b);
    }
  }
  readyHooks.push(buildPicker);
  return {
    frame, layout,
    enter(quiet) {
      layout();
      if (!cur) { cur = S.iss; $$('.craft').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === 'iss' ? 'true' : 'false')); $('#craftName').textContent = cur.name; $('#craftFacts').textContent = cur.facts; cur.reset(); }
      if (!quiet) intro('craft', 'craft_intro', () => { if (current === 'craft') setTimeout(() => { if (!Voice.busy && current === 'craft') say(cur.line); }, 500); });
    },
    leave() { held = {}; }
  };
})();
