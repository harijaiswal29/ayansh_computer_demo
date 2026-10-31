/* Visit a world as Ayansh, and the Earth explorer.
   Uses the shared helpers from index.html (drawBody, drawAstro, Voice, Sfx, ...) and CRAFT_DRAW from craft.js. */
'use strict';

/* ================================================================ walk around a world */
views.visit = (() => {
  const cv = $('#visitCv');
  const WORLD_W = 2600;
  let W = 0, H = 0, t = 0, wid = 'moon', w = null, me, camX = 0, camY = 0, found, feet, heat, heatSaid, lastSpotTalk = 0, walkTo = null, devil = 0, flash = 0;
  const held = {};
  const slots = { a: makeSlot(), b: makeSlot(), c: makeSlot() };

  // ground height (0..1 of the land band) along the world, different for every world
  function bumps(x, seed, amp) { return (Math.sin(x * .004 + seed) * .5 + Math.sin(x * .011 + seed * 2.3) * .3 + Math.sin(x * .027 + seed * 5.1) * .2) * amp; }
  const base = () => H * .78;
  function groundY(x) { return w.platform ? base() : base() - bumps(x, w.seed, w.rough ?? 26); }
  const sky = (fx, fy) => [W * fx, H * fy];

  // the worlds: sky colours, ground, gravity and three or four things to find
  const disc = (ctx, x, y, r, c1, c2) => { const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const crater = (ctx, x, y, r, dark = 'rgba(0,0,0,.22)', rim = 'rgba(255,255,255,.12)') => { ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(x, y, r, r * .28, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 1, r, r * .28, 0, PI * 1.05, TAU * .98); ctx.stroke(); };
  const WORLDS = {
    mercury: { name: 'Mercury', g: .38, temp: '430 °C by day', sky: ['#000003', '#0C0B14'], stars: 1, ground: '#80776E', hill: '#5A544E', seed: 1, feet: 1, craters: 1,
      spots: [
        { id: 'sun', sky: [.8, .26], r: 70, draw(ctx, x, y) { sunGlow(ctx, x, y, 58, t, 1); drawBody(ctx, 'sun', x, y, 58, { rot: -t * .03, L: [0, 0, 1], pitch: .2, dpr: dprNow(), slot: slots.a, maxD: 200 }); } },
        { id: 'crater', at: 900, r: 80, draw(ctx, x, y) { crater(ctx, x, y + 6, 90, 'rgba(0,0,0,.35)'); sign(ctx, x, y - 60, 'Valmiki crater'); } },
        { id: 'ice', at: 1800, r: 70, draw(ctx, x, y) { crater(ctx, x, y + 6, 70, 'rgba(0,0,10,.6)'); ctx.fillStyle = `rgba(200,235,255,${.6 + .3 * Math.sin(t * 3)})`; ctx.beginPath(); ctx.ellipse(x, y + 8, 30, 6, 0, 0, TAU); ctx.fill(); } }] },
    venus: { name: 'Venus', g: .91, temp: '465 °C', sky: ['#8C4A18', '#E6B05C'], ground: '#7A4B26', hill: '#5E3A1E', seed: 2, heat: 1,
      spots: [
        { id: 'clouds', sky: [.5, .08], r: 90, draw(ctx, x, y) { for (let i = 0; i < 5; i++) { ctx.fillStyle = `rgba(240,200,110,${.35 - i * .05})`; ctx.fillRect(0, y - 40 + i * 18 + Math.sin(t + i) * 4, W, 22); } } },
        { id: 'volcano', at: 1100, r: 110, draw(ctx, x, y) { ctx.fillStyle = '#5A3518'; ctx.beginPath(); ctx.moveTo(x - 190, y + 10); ctx.lineTo(x - 30, y - 150); ctx.lineTo(x + 30, y - 150); ctx.lineTo(x + 190, y + 10); ctx.fill(); ctx.fillStyle = `rgba(255,120,40,${.5 + .3 * Math.sin(t * 3)})`; ctx.beginPath(); ctx.ellipse(x, y - 150, 30, 7, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#FF7A30'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 10, y - 148); ctx.quadraticCurveTo(x - 40, y - 80, x - 90, y); ctx.stroke(); } },
        { id: 'lander', at: 1900, r: 60, draw(ctx, x, y) { ctx.fillStyle = '#9AA3B8'; ctx.beginPath(); ctx.ellipse(x, y - 4, 44, 10, 0, 0, TAU); ctx.fill(); disc(ctx, x, y - 30, 24, '#E8EBF3', '#7C86A8'); ctx.fillStyle = '#5B6491'; ctx.fillRect(x - 3, y - 70, 6, 20); sign(ctx, x, y - 84, 'Venera 13'); } }] },
    moon: { name: 'the Moon', g: .165, temp: '120 °C in sunlight', sky: ['#000003', '#05060F'], stars: 1, ground: '#A3A29C', hill: '#7E7D78', seed: 3, feet: 1, craters: 1,
      spots: [
        { id: 'earth', sky: [.74, .22], r: 50, draw(ctx, x, y) { drawBody(ctx, 'earth', x, y, 38, { rot: -t * .1, L: [-.7, -.2, .7], pitch: .3, dpr: dprNow(), slot: slots.a }); } },
        { id: 'flag', at: 800, r: 60, draw(ctx, x, y) { ctx.fillStyle = '#C9CED8'; ctx.fillRect(x - 2, y - 110, 4, 110); ctx.fillStyle = '#F3F1FF'; ctx.fillRect(x + 2, y - 108, 56, 34); ctx.fillStyle = '#C8102E'; for (let i = 0; i < 7; i += 2) ctx.fillRect(x + 2, y - 108 + i * 34 / 7, 56, 34 / 7); ctx.fillStyle = '#1D3A8A'; ctx.fillRect(x + 2, y - 108, 24, 18); for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + 4 + (i % 3) * 8, y - 104 + Math.floor(i / 3) * 8, 1.2, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); } sign(ctx, x + 30, y - 124, 'Apollo 11, 1969'); } },
        { id: 'vikram', at: 1750, r: 70, draw(ctx, x, y) { CRAFT_DRAW.vikram(ctx, x, y - 30, 1.1); CRAFT_DRAW.pragyan(ctx, x + 80, y - 5, 1); sign(ctx, x, y - 82, 'Chandrayaan-3'); } }] },
    mars: { name: 'Mars', g: .38, temp: '−60 °C', sky: ['#B88356', '#E9C397'], ground: '#B5582F', hill: '#8F4426', seed: 4, feet: 1,
      spots: [
        { id: 'olympus', sky: [.3, .58], r: 90, draw(ctx, x, y) { ctx.fillStyle = 'rgba(150,80,50,.55)'; ctx.beginPath(); ctx.moveTo(x - 260, y + 30); ctx.quadraticCurveTo(x - 80, y - 40, x - 50, y - 46); ctx.lineTo(x + 50, y - 46); ctx.quadraticCurveTo(x + 80, y - 40, x + 260, y + 30); ctx.fill(); } },
        { id: 'sunset', sky: [.86, .5], r: 50, draw(ctx, x, y) { const g = ctx.createRadialGradient(x, y, 4, x, y, 70); g.addColorStop(0, 'rgba(160,210,255,.9)'); g.addColorStop(1, 'rgba(120,170,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 70, 0, TAU); ctx.fill(); ctx.fillStyle = '#F4FAFF'; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); } },
        { id: 'devil', at: 1250, moving: 1, r: 60, draw(ctx, x, y) { for (let i = 0; i < 14; i++) { const k = i / 14, rr = 8 + k * 40; ctx.strokeStyle = `rgba(200,130,90,${.5 - k * .3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 6 + i) * 6 * k, y - k * 180, rr, rr * .25, 0, 0, TAU); ctx.stroke(); } } },
        { id: 'rover', at: 2000, r: 70, draw(ctx, x, y) { CRAFT_DRAW.perseverance(ctx, x, y - 14, 1.5, t * .5); } }] },
    jupiter: { name: 'Jupiter', g: 2.53, temp: '−110 °C', sky: ['#9C7650', '#F1E2C6'], platform: 'cloud', bands: ['#D9B48A', '#B9855C', '#E8D2AE'], seed: 5,
      spots: [
        { id: 'spot', sky: [.68, .52], r: 90, draw(ctx, x, y) { for (let i = 6; i > 0; i--) { ctx.fillStyle = `rgba(${170 + i * 8},${70 + i * 10},${50 + i * 6},.85)`; ctx.beginPath(); ctx.ellipse(x, y, i * 26, i * 9, Math.sin(t * .3) * .05, 0, TAU); ctx.fill(); } } },
        { id: 'lightning', sky: [.22, .5], r: 70, draw(ctx, x, y) { ctx.fillStyle = 'rgba(160,120,90,.6)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 30 + i * 30, y, 34, 0, TAU); ctx.fill(); } if ((t * 1.7) % 3 < .15) { ctx.strokeStyle = '#FFFBE0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x - 10, y + 20); ctx.lineTo(x + 6, y + 22); ctx.lineTo(x - 6, y + 60); ctx.stroke(); } } },
        { id: 'io', sky: [.86, .16], r: 40, draw(ctx, x, y) { disc(ctx, x, y, 22, '#FFF2A0', '#B59A2A'); ctx.fillStyle = '#C0541F'; ctx.beginPath(); ctx.arc(x + 6, y + 4, 4, 0, TAU); ctx.arc(x - 8, y - 6, 3, 0, TAU); ctx.fill(); } }] },
    saturn: { name: 'Saturn', g: 1.07, temp: '−140 °C', sky: ['#B89A64', '#F5E7C2'], platform: 'cloud', bands: ['#E2CC98', '#C9AB72', '#EEDDB4'], seed: 6,
      spots: [
        { id: 'rings', sky: [.5, .3], r: 120, draw(ctx, x, y) { for (let i = 0; i < 9; i++) { ctx.strokeStyle = `rgba(150,120,70,${i === 5 ? .1 : .45})`; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(x, y + H * .8, W * (.62 + i * .035), H * (.86 + i * .03), 0, PI * 1.06, PI * 1.94); ctx.stroke(); } } },
        { id: 'hexagon', sky: [.2, .56], r: 70, draw(ctx, x, y) { ctx.strokeStyle = 'rgba(90,110,140,.8)'; ctx.fillStyle = 'rgba(120,140,160,.45)'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU + t * .05; ctx.lineTo(x + Math.cos(q) * 54, y + Math.sin(q) * 20); } ctx.closePath(); ctx.fill(); ctx.stroke(); } },
        { id: 'titan', sky: [.86, .14], r: 40, draw(ctx, x, y) { disc(ctx, x, y, 24, '#F4C27A', '#9C5E1E'); } }] },
    uranus: { name: 'Uranus', g: .89, temp: '−195 °C', sky: ['#5FB2C0', '#CDF1F4'], platform: 'cloud', bands: ['#A6E0E6', '#8BCFD9', '#BDEBEF'], seed: 7,
      spots: [
        { id: 'sideways', sky: [.2, .2], r: 50, draw(ctx, x, y) { ctx.fillStyle = '#FFF6D6'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,246,214,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 14 + Math.sin(t * 2) * 2, 0, TAU); ctx.stroke(); } },
        { id: 'smell', at: 1200, r: 70, draw(ctx, x, y) { ctx.fillStyle = 'rgba(170,200,120,.55)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - 40 + i * 26, y - 60 + Math.sin(t + i) * 4, 26, 0, TAU); ctx.fill(); } ctx.strokeStyle = 'rgba(90,120,50,.7)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); for (let k = 0; k < 20; k++) ctx.lineTo(x - 20 + i * 20 + Math.sin(k * .8 + t * 3) * 4, y - 90 - k * 2.5); ctx.stroke(); } } },
        { id: 'diamonds', sky: [.7, .84], r: 60, draw(ctx, x, y) { for (let i = 0; i < 8; i++) { const yy = y - 30 + ((t * 30 + i * 13) % 60), xx = x - 50 + i * 14; ctx.fillStyle = `rgba(255,255,255,${.6 + .4 * Math.sin(t * 5 + i)})`; ctx.beginPath(); ctx.moveTo(xx, yy - 5); ctx.lineTo(xx + 4, yy); ctx.lineTo(xx, yy + 5); ctx.lineTo(xx - 4, yy); ctx.fill(); } } }] },
    neptune: { name: 'Neptune', g: 1.14, temp: '−200 °C', sky: ['#12287A', '#4C78E0'], platform: 'cloud', bands: ['#3D64CC', '#2C4CB0', '#5A82DE'], seed: 8, wind: 1,
      spots: [
        { id: 'storm', sky: [.66, .55], r: 80, draw(ctx, x, y) { for (let i = 5; i > 0; i--) { ctx.fillStyle = `rgba(${10 + i * 4},${20 + i * 6},${70 + i * 12},.8)`; ctx.beginPath(); ctx.ellipse(x, y, i * 22, i * 8, 0, 0, TAU); ctx.fill(); } } },
        { id: 'triton', sky: [.18, .16], r: 46, draw(ctx, x, y) { disc(ctx, x, y, 20, '#F0E6E0', '#8A7C78'); ctx.strokeStyle = 'rgba(230,230,240,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y - 18); ctx.quadraticCurveTo(x + 10, y - 40, x + 30, y - 46); ctx.stroke(); } },
        { id: 'maths', at: 1500, r: 70, draw(ctx, x, y) { ctx.fillStyle = '#16215A'; roundRect(ctx, x - 50, y - 110, 100, 64, 8); ctx.fill(); ctx.strokeStyle = '#C38A2A'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#F3F1FF'; ctx.font = '700 18px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+ − × ÷', x, y - 82); ctx.fillText('= ♆', x, y - 58); } }] },
    pluto: { name: 'Pluto', g: .063, temp: '−230 °C', sky: ['#05081C', '#3A4C8A'], stars: 1, ground: '#E8DCCB', hill: '#B9A58C', seed: 9, feet: 1, rough: 18,
      spots: [
        { id: 'charon', sky: [.74, .24], r: 70, draw(ctx, x, y) { disc(ctx, x, y, 52, '#C9C2B8', '#4E4A46'); ctx.fillStyle = 'rgba(120,60,50,.5)'; ctx.beginPath(); ctx.ellipse(x - 6, y - 40, 22, 7, 0, 0, TAU); ctx.fill(); } },
        { id: 'heart', at: 700, r: 90, draw(ctx, x, y) { ctx.save(); ctx.translate(x, y + 6); ctx.scale(1, .26); ctx.fillStyle = '#FFF7EE'; ctx.beginPath(); ctx.moveTo(0, 90); ctx.bezierCurveTo(-150, -10, -80, -110, 0, -40); ctx.bezierCurveTo(80, -110, 150, -10, 0, 90); ctx.fill(); ctx.restore(); } },
        { id: 'mountains', at: 1700, r: 100, draw(ctx, x, y) { ctx.fillStyle = '#B7C8DE'; ctx.beginPath(); ctx.moveTo(x - 160, y + 4); ctx.lineTo(x - 90, y - 150); ctx.lineTo(x - 40, y - 70); ctx.lineTo(x + 20, y - 190); ctx.lineTo(x + 90, y - 80); ctx.lineTo(x + 160, y + 4); ctx.fill(); ctx.fillStyle = '#EEF4FF'; ctx.beginPath(); ctx.moveTo(x + 20, y - 190); ctx.lineTo(x + 2, y - 150); ctx.lineTo(x + 38, y - 150); ctx.fill(); } }] },
    sun: { name: 'the Sun', g: 27.9, temp: '5,500 °C', sky: ['#5A0E02', '#FF7A1A'], platform: 'shield', bands: ['#FF9A2A', '#FFC24A', '#FF7A1A'], seed: 10, noJump: 1,
      spots: [
        { id: 'flare', sky: [.62, .5], r: 100, draw(ctx, x, y) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { ctx.strokeStyle = `rgba(255,${150 + i * 20},60,${.35})`; ctx.lineWidth = 16 - i * 3; ctx.beginPath(); ctx.ellipse(x, y + 40, 110 + i * 6, 120 + Math.sin(t + i) * 10, 0, PI, TAU); ctx.stroke(); } ctx.restore(); } },
        { id: 'spot', at: 1300, r: 80, draw(ctx, x, y) { ctx.fillStyle = 'rgba(120,30,0,.75)'; ctx.beginPath(); ctx.ellipse(x, y + 30, 70, 14, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(60,10,0,.85)'; ctx.beginPath(); ctx.ellipse(x, y + 30, 32, 7, 0, 0, TAU); ctx.fill(); } },
        { id: 'light', sky: [.18, .2], r: 60, draw(ctx, x, y) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(x, y + 60, x + 120, y - 60); g.addColorStop(0, 'rgba(255,240,180,.0)'); g.addColorStop(1, 'rgba(255,250,220,.8)'); ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, y + 60); ctx.lineTo(x + 120, y - 60); ctx.stroke(); ctx.restore(); sign(ctx, x + 70, y - 40, 'To Earth: 8 minutes'); } }] },
    belt: { name: 'Ceres', g: .029, temp: '−105 °C', sky: ['#000003', '#07070F'], stars: 1, ground: '#6E6A64', hill: '#4F4B46', seed: 11, feet: 1, craters: 1,
      spots: [
        { id: 'salt', at: 900, r: 70, draw(ctx, x, y) { crater(ctx, x, y + 6, 80, 'rgba(0,0,0,.3)'); ctx.fillStyle = `rgba(255,255,255,${.8 + .2 * Math.sin(t * 2)})`; ctx.beginPath(); ctx.ellipse(x - 10, y + 6, 22, 5, 0, 0, TAU); ctx.ellipse(x + 26, y + 9, 10, 3, 0, 0, TAU); ctx.fill(); } },
        { id: 'far', sky: [.6, .2], r: 70, draw(ctx, x, y) { const r = rng(4); for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(x - 90 + i * 60 + Math.sin(t * .3 + i) * 6, y + (i % 2) * 30); ctx.rotate(t * .2 + i); ctx.fillStyle = '#8B857C'; ctx.beginPath(); for (let k = 0; k < 7; k++) { const q = k / 7 * TAU, rr = (6 + i * 2) * (.7 + r() * .4); ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr); } ctx.fill(); ctx.restore(); } } },
        { id: 'dino', sky: [.2, .3], r: 60, draw(ctx, x, y) { drawBody(ctx, 'earth', x, y, 26, { rot: 1, L: [-.6, -.3, .74], pitch: .3, dpr: dprNow(), slot: slots.a }); ctx.strokeStyle = 'rgba(255,200,120,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 80, y - 60); ctx.lineTo(x + 30, y - 18); ctx.stroke(); ctx.fillStyle = '#8B857C'; ctx.beginPath(); ctx.arc(x + 30, y - 18, 5, 0, TAU); ctx.fill(); } }] },
    comet: { name: 'a comet', g: .004, temp: '−70 °C', sky: ['#000003', '#06060E'], stars: 1, ground: '#2E2C2E', hill: '#1E1D20', seed: 12, feet: 1, rough: 40,
      spots: [
        { id: 'tail', sky: [.55, .14], r: 80, draw(ctx, x, y) { const g = ctx.createLinearGradient(x - 200, y + 40, x + 220, y - 30); g.addColorStop(0, 'rgba(160,220,255,.0)'); g.addColorStop(.5, 'rgba(180,230,255,.45)'); g.addColorStop(1, 'rgba(160,220,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 230, 26, -.12, 0, TAU); ctx.fill(); } },
        { id: 'jet', at: 950, r: 70, draw(ctx, x, y) { for (let i = 0; i < 26; i++) { const k = ((t * .7 + i / 26) % 1), yy = y - k * 260; ctx.fillStyle = `rgba(220,235,255,${.6 * (1 - k)})`; ctx.beginPath(); ctx.arc(x + Math.sin(i * 7 + t) * 30 * k, yy, 3 + k * 10, 0, TAU); ctx.fill(); } } },
        { id: 'philae', at: 1750, r: 60, draw(ctx, x, y) { ctx.save(); ctx.translate(x, y - 18); ctx.rotate(.3); ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(-24, 20); ctx.moveTo(14, 6); ctx.lineTo(24, 20); ctx.moveTo(0, 8); ctx.lineTo(0, 22); ctx.stroke(); foil(ctx, -16, -14, 32, 22); solarPanel(ctx, -16, -20, 32, 6); ctx.restore(); sign(ctx, x, y - 54, 'Philae, 2014'); } }] }
  };
  function sign(ctx, x, y, s) { ctx.font = '700 13px Fredoka, sans-serif'; const tw = ctx.measureText(s).width + 16; ctx.fillStyle = 'rgba(13,20,52,.82)'; roundRect(ctx, x - tw / 2, y - 15, tw, 22, 11); ctx.fill(); ctx.fillStyle = '#FFB52E'; ctx.textAlign = 'center'; ctx.fillText(s, x, y + 1); }

  function layout() { const f = fitCanvas(cv); W = f.w; H = f.h; }
  function spotXY(s) {
    if (s.sky) { const [x, y] = sky(s.sky[0], s.sky[1]); return [x - camX * .08, y + camY * .3]; }
    const wx = s.moving ? s.at + Math.sin(t * .25) * 260 : s.at;
    return [wx - camX, groundY(wx) + camY];
  }
  function chips() {
    const kg = prefs.kg * w.g, wtxt = w.g < .01 ? 'almost nothing!' : (kg >= 100 ? Math.round(kg).toLocaleString('en-IN') : kg.toFixed(kg < 10 ? 1 : 0)) + ' kg';
    $('#visitChips').innerHTML = `<span class="chip">Ayansh weighs <b>${wtxt}</b></span><span class="chip">Temperature <b>${w.temp}</b></span>`;
    $('#visitFound').textContent = `Found ${found.size} of ${w.spots.length}`;
    $('#vJump').hidden = !!w.noJump;
  }
  function discover(s, speak = true) {
    const fresh = !found.has(s.id); found.add(s.id); s.glow = 1.6;
    if (fresh) Sfx.twinkle();
    if (speak) { lastSpotTalk = performance.now(); Voice.say(`v_${wid}_${s.id}`); }
    chips();
    if (fresh && found.size === w.spots.length) { setTimeout(() => Sfx.chime(), 300); celebrate = 3; }
  }
  let celebrate = 0;
  function start(id) {
    wid = id; w = WORLDS[id]; found = new Set(); feet = []; heat = 0; heatSaid = false; celebrate = 0; walkTo = null;
    me = { x: 300, h: 0, vh: 0, face: 1, step: 0 }; camX = 0; camY = 0;
    for (const s of w.spots) s.glow = 0;
    chips();
  }
  window.visitWorld = id => {
    if (id === 'earth') { show('earth'); return; }
    if (!WORLDS[id]) return;
    start(id); show('visit', true); Voice.say('v_' + id);
  };
  function jump() {
    if (w.noJump) { Sfx.boop(); return; }
    if (me.h <= 0.5) { me.vh = 330; Sfx.boing(1 / Math.max(w.g, .05)); }
  }
  // controls
  for (const [id, key] of [['vLeft', 'left'], ['vRight', 'right']]) {
    const b = $('#' + id);
    const on = e => { e.preventDefault(); held[key] = true; walkTo = null; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
    const off = () => { held[key] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
  }
  $('#vJump').addEventListener('click', jump);
  $('#visitBack').addEventListener('click', () => { Sfx.whoosh(); show('explore', true); Voice.say('visit_back'); });
  window.addEventListener('keydown', e => {
    if (current !== 'visit') return;
    if (e.key === 'ArrowLeft') { held.left = true; walkTo = null; e.preventDefault(); }
    if (e.key === 'ArrowRight') { held.right = true; walkTo = null; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'ArrowUp') { jump(); e.preventDefault(); }
  });
  window.addEventListener('keyup', e => { if (e.key === 'ArrowLeft') held.left = false; if (e.key === 'ArrowRight') held.right = false; });
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (const s of w.spots) { const [sx, sy] = spotXY(s), cy = s.sky ? sy : sy - 40; if (Math.hypot(x - sx, y - cy) < s.r) { discover(s); if (!s.sky) walkTo = (s.moving ? s.at + Math.sin(t * .25) * 260 : s.at) - 70; return; } }
    if (y > H * .45) walkTo = x + camX; else jump();
  });

  function drawPlatform(ctx, x, y) {
    if (w.platform === 'shield') {
      ctx.fillStyle = '#C9CED8'; ctx.beginPath(); ctx.ellipse(x, y + 14, 120, 20, 0, 0, PI); ctx.fill();
      ctx.fillStyle = '#3B4152'; roundRect(ctx, x - 100, y - 4, 200, 18, 9); ctx.fill();
      ctx.strokeStyle = 'rgba(89,224,232,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 4, 96, PI, TAU); ctx.stroke();
    } else {
      ctx.fillStyle = '#3A4A8A'; roundRect(ctx, x - 90, y - 4, 180, 20, 10); ctx.fill();
      ctx.fillStyle = '#59E0E8'; for (let i = 0; i < 4; i++) { ctx.globalAlpha = .4 + .4 * Math.sin(t * 6 + i); ctx.fillRect(x - 64 + i * 40, y + 18, 12, 6); } ctx.globalAlpha = 1;
      ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 86, y - 4); ctx.lineTo(x - 86, y - 40); ctx.lineTo(x + 86, y - 40); ctx.lineTo(x + 86, y - 4); ctx.stroke();
    }
  }
  function frame(dt) {
    t += dt;
    const ctx = cv.getContext('2d'), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0);
    if (!w) start(wid);
    // move Ayansh
    let v = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    if (walkTo !== null && !v) { const dx = walkTo - me.x; if (Math.abs(dx) < 8) walkTo = null; else v = Math.sign(dx); }
    const speed = 150 / Math.sqrt(clamp(w.g, .5, 2));
    let vx = v * speed;
    if (w.wind) vx -= 55;
    me.x = clamp(me.x + vx * dt, 80, WORLD_W - 80); if (v) me.face = v;
    if (v) me.step += dt * 9;
    const gEff = Math.max(w.g, .02) * 1280;
    if (me.h > 0 || me.vh > 0) { me.vh -= gEff * dt * (w.g < .01 ? .6 : 1); me.h = Math.max(0, me.h + me.vh * dt); if (me.h === 0) me.vh = 0; }
    camX = lerp(camX, clamp(me.x - W * .4, 0, WORLD_W - W), Math.min(1, dt * 4));
    camY = lerp(camY, Math.max(0, me.h - H * .4), Math.min(1, dt * 5));
    if (w.feet && v && me.h === 0 && (!feet.length || Math.abs(feet[feet.length - 1].x - me.x) > 22)) feet.push({ x: me.x + me.face * (feet.length % 2 ? 6 : -6) });
    if (feet.length > 300) feet.shift();
    for (const s of w.spots) if (!s.sky && !found.has(s.id) && Math.abs((s.moving ? s.at + Math.sin(t * .25) * 260 : s.at) - me.x) < 80 && !Voice.busy) discover(s);
    if (w.heat) { heat += dt / 40; if (heat >= 1 && !heatSaid) { heatSaid = true; Voice.say('v_venus_hot', () => { heat = 0; heatSaid = false; }); } heat = Math.min(1, heat); }

    // sky
    let g = ctx.createLinearGradient(0, 0, 0, base()); g.addColorStop(0, w.sky[0]); g.addColorStop(1, w.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (w.stars) for (let i = 0; i < 90; i++) { const s = SKY.stars[i]; ctx.globalAlpha = .35 + .65 * Math.abs(Math.sin(t + s.p)); ctx.fillStyle = s.c; ctx.fillRect((s.x * W - camX * .05 + W) % W, s.y * base() * .9 + camY * .2, s.s, s.s); }
    ctx.globalAlpha = 1;
    for (const s of w.spots) if (s.sky) { const [x, y] = spotXY(s); s.draw(ctx, x, y); }
    // far hills / cloud bands
    if (w.platform) {
      for (let i = 0; i < 6; i++) {
        const y0 = base() - 30 + i * (H - base() + 40) / 6 + camY;
        ctx.fillStyle = w.bands[i % w.bands.length]; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, y0 + Math.sin((x + camX * (.4 + i * .15)) * .012 + t * (w.platform === 'shield' ? 2 : .6) + i) * 8);
        ctx.lineTo(W, H); ctx.fill();
      }
      if (w.platform === 'shield') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++) { const x = ((i * 173 - camX * .7) % (W + 100) + W + 100) % (W + 100) - 50, y = base() + 40 + (i * 37) % (H - base()); ctx.fillStyle = `rgba(255,220,120,${.15 + .1 * Math.sin(t * 3 + i)})`; ctx.beginPath(); ctx.arc(x, y + camY, 18, 0, TAU); ctx.fill(); } ctx.restore(); }
    } else {
      ctx.fillStyle = w.hill; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, base() - 70 - bumps(x + camX * .4, w.seed + 3, 50) + camY * .6);
      ctx.lineTo(W, H); ctx.fill();
    }
    for (const s of w.spots) if (!s.sky) { const [x, y] = spotXY(s); if (x > -260 && x < W + 260) s.draw(ctx, x, y); }
    // ground
    if (!w.platform) {
      ctx.fillStyle = w.ground; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, groundY(x + camX) + camY);
      ctx.lineTo(W, H); ctx.fill();
      if (w.craters) for (let i = 0; i < 12; i++) { const wx = 140 + i * 223; const x = wx - camX; if (x > -60 && x < W + 60) crater(ctx, x, groundY(wx) + camY + 24 + (i % 3) * 14, 18 + (i % 4) * 8); }
      for (const f of feet) { const x = f.x - camX; if (x < -10 || x > W + 10) continue; ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, groundY(f.x) + camY + 3, 6, 2.2, 0, 0, TAU); ctx.fill(); }
    }
    // glow rings on things not yet found
    for (const s of w.spots) {
      const [x, y] = spotXY(s), cy = s.sky ? y : y - 40; s.glow = Math.max(0, (s.glow || 0) - dt);
      if (!found.has(s.id) || s.glow > 0) { ctx.strokeStyle = `rgba(255,181,46,${found.has(s.id) ? s.glow : .45 + .35 * Math.sin(t * 3 + s.r)})`; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 18; ctx.beginPath(); ctx.arc(x, cy, s.r * .7, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    }
    // effects in front
    if (w.wind) { ctx.strokeStyle = 'rgba(220,235,255,.45)'; ctx.lineWidth = 2; for (let i = 0; i < 14; i++) { const y = (i * 47) % (H * .9), x = W - ((t * 700 + i * 151) % (W + 200)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y); ctx.stroke(); } }
    if (wid === 'venus') { ctx.fillStyle = 'rgba(255,190,90,.12)'; ctx.fillRect(0, 0, W, H); }
    if (wid === 'jupiter' && (t * 1.7) % 3 < .08) { ctx.fillStyle = 'rgba(255,255,230,.18)'; ctx.fillRect(0, 0, W, H); }
    // Ayansh
    const ax = me.x - camX, ay = groundY(me.x) + camY - me.h;
    if (w.platform) drawPlatform(ctx, ax, groundY(me.x) + camY + 4);
    else { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(ax, groundY(me.x) + camY + 2, 24 * Math.max(.3, 1 - me.h / 400), 5, 0, 0, TAU); ctx.fill(); }
    const s = clamp(H / 520, .6, 1);
    drawAstro(ctx, ax, ay, s, me.h > 2, w.g > 2.4 ? (wid === 'sun' ? 1 : .5) : 0, t, me.face, v && me.h === 0 ? me.step : 0);
    if (me.h > H * .35) pill(ctx, `${Math.round(me.h / 10)} m up! Whee!`, ax, ay - 140 * s);
    if (w.heat) { gaugeBar(ctx, 16, 64, 190, `Suit heat: ${Math.round(heat * 100)}%`, heat, heat > .8 ? '#FF6D8A' : '#FFB52E'); }
    if (w.wind) pill(ctx, 'Wind: 2,000 km/h', W - 110, 82, 'rgba(13,20,52,.85)', '#59E0E8');
    if (celebrate > 0) { celebrate -= dt; pill(ctx, `You found everything on ${w.name}!`, W / 2, H * .3, '#FFB52E', '#2A1600', 18); }
  }
  function pill(ctx, str, x, y, bg = 'rgba(13,20,52,.85)', fg = '#F3F1FF', size = 14) {
    ctx.font = `700 ${size}px Fredoka, sans-serif`; const tw = ctx.measureText(str).width + 20;
    ctx.fillStyle = bg; roundRect(ctx, x - tw / 2, y - size - 4, tw, size + 12, (size + 12) / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.fillText(str, x, y + 2);
  }
  function gaugeBar(ctx, x, y, wd, label, v, col) {
    ctx.fillStyle = 'rgba(13,20,52,.85)'; roundRect(ctx, x, y, wd, 40, 10); ctx.fill();
    ctx.font = '600 11px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#A8B2DE'; ctx.fillText(label, x + 10, y + 15);
    ctx.fillStyle = '#16215A'; roundRect(ctx, x + 10, y + 22, wd - 20, 9, 4); ctx.fill();
    ctx.fillStyle = col; roundRect(ctx, x + 10, y + 22, Math.max(6, (wd - 20) * clamp(v, 0, 1)), 9, 4); ctx.fill();
  }
  return { frame, layout, enter() { layout(); if (!w) start(wid); chips(); }, leave() { held.left = held.right = false; } };
})();

/* ================================================================ Earth explorer */
views.earth = (() => {
  const cv = $('#earthCv');
  let W = 0, H = 0, t = 0, mode = 'globe';
  const slot = makeSlot(), said = new Set();
  const top = () => ($('#view-earth .over.top').offsetHeight || 50) + 18, bottom = () => H - ($('#earthCtl').offsetHeight || 50) - 16;
  function layout() { const f = fitCanvas(cv); W = f.w; H = f.h; }
  const pill = (ctx, str, x, y, bg = 'rgba(13,20,52,.88)', fg = '#F3F1FF', size = 14) => {
    ctx.font = `700 ${size}px Fredoka, sans-serif`; const tw = ctx.measureText(str).width + 20;
    ctx.fillStyle = bg; roundRect(ctx, x - tw / 2, y - size - 4, tw, size + 12, (size + 12) / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.fillText(str, x, y + 2);
  };
  const text = (ctx, s, x, y, size = 14, color = '#F3F1FF', align = 'center', weight = 700) => { ctx.font = `${weight} ${size}px Fredoka, sans-serif`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(s, x, y); };
  function setCtl(items) {
    const el = $('#earthCtl'); el.innerHTML = '';
    for (const it of items) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (it.go ? ' go' : '') + (it.hold ? ' hold' : '') + (it.cyan ? ' cyan' : '');
      b.innerHTML = (it.icon ? ICON[it.icon] : '') + `<span>${it.label}</span>`; b.dataset.id = it.id;
      if (it.hold) {
        const on = e => { e.preventDefault(); held[it.id] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
        const off = () => { held[it.id] = false; b.classList.remove('on'); };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off); b.addEventListener('contextmenu', e => e.preventDefault());
      } else b.addEventListener('click', () => { Sfx.tap(); M[mode].act?.(it.id); });
      el.appendChild(b);
    }
  }
  const held = {};
  const sayOnce = id => { if (!said.has(id)) { said.add(id); Voice.say(id); return true; } return false; };

  /* ---------------- globe: continents, oceans and wonders */
  const WONDERS = [
    ['everest', 'Mount Everest', 27.99, 86.93, '#F3F1FF'], ['taj', 'Taj Mahal', 27.17, 78.04, '#FFE3F0'], ['sahara', 'Sahara Desert', 23, 12, '#FFD27A'], ['amazon', 'Amazon Rainforest', -4, -62, '#6FEA95'],
    ['nile', 'River Nile', 15.6, 32.5, '#59E0E8'], ['wall', 'Great Wall of China', 40.4, 116.6, '#FF9A6A'], ['pyramids', 'Pyramids of Egypt', 29.98, 31.13, '#FFB52E'],
    ['reef', 'Great Barrier Reef', -18.3, 147.7, '#FF6D8A'], ['trench', 'Mariana Trench', 11.35, 142.2, '#8FB4FF']
  ];
  const NAMES = { asia: 'Asia', africa: 'Africa', europe: 'Europe', namerica: 'North America', samerica: 'South America', australia: 'Australia', antarctica: 'Antarctica', pacific: 'Pacific Ocean', atlantic: 'Atlantic Ocean', indian: 'Indian Ocean', southern: 'Southern Ocean', arctic: 'Arctic Ocean' };
  function continent(lat, lon) {
    if (lat < -60) return 'antarctica';
    if (lon < -25 && lon > -170 && lat > 7.5) return 'namerica';
    if (lon <= -34 && lon >= -92 && lat <= 13) return lat > 7.5 && lon < -77 ? 'namerica' : 'samerica';
    if (lon >= -20 && lon <= 52 && lat >= -36 && lat < 37.5 && !(lat >= 12 && lon >= 34)) return 'africa';
    if (lon > -25 && lon < 40 && lat >= 36) return 'europe';
    if (lon > 110 && lat < -10) return 'australia';
    if (lon > 140 && lat < -1 && lat > -11) return 'australia';
    if (lon < -25) return lat > 50 ? 'namerica' : 'asia';
    return 'asia';
  }
  function ocean(lat, lon) {
    if (lat < -58) return 'southern';
    if (lat > 66 || (lat > 50 && lon > -95 && lon < -75)) return 'arctic';
    if (lon >= 20 && lon < 118 && lat < 30) return 'indian';
    if (lon >= 118 && lon < 147 && lat < -12) return 'indian';
    if (lon > -70 && lon < 20) return 'atlantic';
    if (lon >= -98 && lon <= -70 && lat > 17 && lat < 60) return 'atlantic';
    if (lon >= -88 && lon <= -70 && lat > 8 && lat <= 17) return 'atlantic';
    return 'pacific';
  }
  const G = { rot: -1.9, pitch: .35, spin: true, drag: null, label: null, goTo: null };
  function project(lat, lon, R, cx, cy) {
    const la = lat * PI / 180, lv = lon * PI / 180 - G.rot, cl = Math.cos(la);
    const wx = cl * Math.sin(lv), wy = Math.sin(la), wz = cl * Math.cos(lv), cp = Math.cos(G.pitch), sp = Math.sin(G.pitch);
    return { x: cx + wx * R, y: cy + (-wy * cp + wz * sp) * R, z: wy * sp + wz * cp };
  }
  function geom() { const T = top(), B = bottom(); const R = Math.min(W * .42, (B - T) * .46); return { R, cx: W / 2, cy: (T + B) / 2 }; }
  const M = {};
  M.globe = {
    enter() { setCtl([{ id: 'spin', label: 'Spin', cyan: true }, { id: 'india', label: 'Find India', go: true }]); Voice.say('e_globe'); },
    act(id) { if (id === 'spin') G.spin = !G.spin; if (id === 'india') { G.spin = false; G.goTo = [78 * PI / 180, .3]; } },
    down(x, y) { G.drag = { x, y, x0: x, y0: y, moved: false }; G.spin = false; },
    move(x, y) { const dr = G.drag; if (!dr) return; const { R } = geom(); if (Math.hypot(x - dr.x0, y - dr.y0) > 6) dr.moved = true; G.rot -= (x - dr.x) / R; G.pitch = clamp(G.pitch + (y - dr.y) / R, -1.2, 1.2); dr.x = x; dr.y = y; G.goTo = null; },
    up(x, y) {
      const dr = G.drag; G.drag = null; if (!dr || dr.moved) return;
      const { R, cx, cy } = geom();
      for (const [id, nm, la, lo] of WONDERS) { const p = project(la, lo, R, cx, cy); if (p.z > .05 && Math.hypot(x - p.x, y - (p.y - 14)) < 20) { G.label = { s: nm, x: p.x, y: p.y - 32, life: 4 }; Sfx.twinkle(); Voice.say(id === 'taj' ? 'in_taj' : 'w_' + id); return; } }
      const nx = (x - cx) / R, ny = (y - cy) / R, rr = nx * nx + ny * ny; if (rr >= 1) return;
      const z = Math.sqrt(1 - rr), cp = Math.cos(G.pitch), sp = Math.sin(G.pitch);
      const wy = -ny * cp + z * sp, wz = ny * sp + z * cp, lat = Math.asin(clamp(wy, -1, 1)) * 180 / PI;
      let lon = (Math.atan2(nx, wz) + G.rot) * 180 / PI; lon = ((lon + 180) % 360 + 360) % 360 - 180;
      const id = landAmount(lat, lon) > .5 ? continent(lat, lon) : ocean(lat, lon);
      G.label = { s: NAMES[id], x, y: y - 16, life: 4 }; Sfx.twinkle(); Voice.say('e_' + id);
    },
    frame(ctx, dt, d) {
      const { R, cx, cy } = geom();
      if (G.spin) G.rot += dt * .18;
      if (G.goTo) { const dr = Math.atan2(Math.sin(G.goTo[0] - G.rot), Math.cos(G.goTo[0] - G.rot)); G.rot += dr * Math.min(1, dt * 3); G.pitch = lerp(G.pitch, G.goTo[1], Math.min(1, dt * 3)); if (Math.abs(dr) < .01) G.goTo = null; }
      const pq = Math.round(G.pitch * 20) / 20;
      ctx.save(); ctx.shadowColor = 'rgba(110,170,255,.5)'; ctx.shadowBlur = 40; ctx.fillStyle = '#0A2A6A'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.restore();
      drawBody(ctx, 'earth', cx, cy, R, { rot: G.rot, L: [-.35, -.35, .87], pitch: pq, dpr: d, slot, ambient: .3, maxD: 440 });
      for (const [id, nm, la, lo, col] of WONDERS) {
        const p = project(la, lo, R, cx, cy); if (p.z < .05) continue;
        ctx.globalAlpha = smooth(.05, .25, p.z);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y - 14, 9, PI * .85, PI * .15); ctx.lineTo(p.x, p.y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#16215A'; ctx.beginPath(); ctx.arc(p.x, p.y - 15, 3.5, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (G.label && G.label.life > 0) { G.label.life -= dt; ctx.globalAlpha = Math.min(1, G.label.life); pill(ctx, G.label.s, G.label.x, G.label.y, '#FFB52E', '#2A1600', 16); ctx.globalAlpha = 1; }
      text(ctx, 'Drag to spin · Tap land, sea or a pin', W / 2, bottom() - 4, 13, '#A8B2DE', 'center', 600);
    }
  };

  /* ---------------- India from space */
  const IN = { lon0: 66, lon1: 98, lat0: 37, lat1: 5, map: null };
  const PINS = [
    ['himalaya', 'Himalayas & Mount Everest', 27.99, 86.93], ['ganga', 'River Ganga', 25.4, 82.4], ['thar', 'Thar Desert', 27, 71.2], ['taj', 'Taj Mahal, Agra', 27.17, 78.04],
    ['sriharikota', 'Sriharikota launch pad', 13.72, 80.23], ['ghats', 'Western Ghats', 12.6, 75.4], ['sundarbans', 'Sundarbans', 21.95, 89.0], ['kanyakumari', 'Kanyakumari', 8.08, 77.55]
  ];
  const CITIES = [['New Delhi', 28.61, 77.21], ['Mumbai', 19.08, 72.88], ['Kolkata', 22.57, 88.36], ['Chennai', 13.08, 80.27], ['Bengaluru', 12.97, 77.59]];
  const GANGA = [[30.98, 78.94], [30.1, 78.3], [29.0, 78.9], [27.9, 79.9], [26.45, 80.33], [25.43, 81.85], [25.32, 83.0], [25.6, 85.1], [25.25, 87.0], [24.8, 87.9], [23.6, 88.3], [22.57, 88.36], [21.7, 88.1]];
  const BRAHMA = [[29.4, 84.5], [29.3, 89], [29.4, 92.5], [29.0, 94.6], [28.0, 95.3], [27.5, 94.6], [26.7, 93.0], [26.2, 91.7], [25.9, 89.9], [24.6, 89.7], [23.8, 89.8]];
  let launch = null, inLabel = null;
  function buildIndia() {
    const g = bitGrid(window.INDIA_LAND); if (!g) return null;
    const S = 600, c = document.createElement('canvas'); c.width = c.height = S; const ctx = c.getContext('2d'), img = ctx.createImageData(S, S);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const lon = lerp(IN.lon0, IN.lon1, (px + .5) / S), lat = lerp(IN.lat0, IN.lat1, (py + .5) / S);
      const n = fbm(lon * .9, lat * .9, 3, 4), n2 = fbm(lon * 3, lat * 3, 7, 3);
      const amt = gridAmount(g, (lon - 60) / .1 - .5, (40 - lat) / .1 - .5, false);
      let c3;
      if (amt < .5) c3 = mix([12, 48, 120], [26, 86, 160], clamp(n * 1.3 - .2 + (amt * .6), 0, 1));
      else {
        // soft-edged regions, wobbled with noise so nothing looks like a box
        const jl = (n - .5) * 3, jo = (n2 - .5) * 3, la = lat + jl, lo = lon + jo;
        const band = (v, a, b, f = 1.5) => smooth(a - f, a + f, v) * (1 - smooth(b - f, b + f, v));
        c3 = mix([96, 142, 62], [56, 116, 48], n2);
        c3 = mix(c3, [150, 138, 84], band(la, 12, 23) * band(lo, 74.5, 83) * .55);                 // Deccan plateau
        c3 = mix(c3, [72, 150, 56], band(la, 24, 30) * band(lo, 76, 89) * .6);                      // Ganga plain
        c3 = mix(c3, [216, 184, 122], band(la, 24, 29.5, 1.2) * band(lo, 69, 75, 1.2));             // Thar desert
        const lg = 73.2 + (19 - lat) * .33; c3 = mix(c3, [26, 92, 42], band(lat, 8.5, 21, .6) * band(lon - lg, -.5, .9, .35) * .85); // Western Ghats
        c3 = mix(c3, [22, 82, 52], band(lat, 21.5, 22.8, .3) * band(lon, 88.1, 89.8, .3) * .85);    // Sundarbans
        const arc = lon < 86.9 ? 35.5 - (lon - 74.5) * .6 : 28;                                      // the Himalaya arc
        const inRange = band(lon, 72.5, 97, .8);
        const plateau = smooth(arc + .6, arc + 2.2, la) * band(lon, 77, 98, 1.5);
        c3 = mix(c3, mix([168, 146, 112], [205, 194, 170], n2), plateau);                             // high, dry plateau
        const mtn = Math.exp(-Math.pow((la - arc) / 1.1, 2)) * inRange;
        c3 = mix(c3, [128, 108, 88], mtn * .85);
        c3 = mix(c3, [246, 248, 252], clamp(Math.exp(-Math.pow((la - arc - .25) / .55, 2)) * inRange * 1.2 * (.7 + n2 * .6), 0, 1));
        c3 = c3.map(v => v * (.88 + n * .24));
      }
      const o = (py * S + px) * 4; img.data[o] = c3[0]; img.data[o + 1] = c3[1]; img.data[o + 2] = c3[2]; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); return c;
  }
  function inGeom() { const T = top(), B = bottom(), s = Math.min(W - 32, B - T); return { s, x: (W - s) / 2, y: T + (B - T - s) / 2 }; }
  const toMap = (lat, lon, gm) => [gm.x + (lon - IN.lon0) / (IN.lon1 - IN.lon0) * gm.s, gm.y + (IN.lat0 - lat) / (IN.lat0 - IN.lat1) * gm.s];
  M.india = {
    enter() { setCtl([]); if (!IN.map) IN.map = buildIndia(); Voice.say('e_india'); },
    down(x, y) {
      const gm = inGeom();
      for (const [id, nm, la, lo] of PINS) { const [px, py] = toMap(la, lo, gm); if (Math.hypot(x - px, y - (py - 14)) < 22) { inLabel = { s: nm, x: px, y: py - 34, life: 4.5 }; Sfx.twinkle(); Voice.say('in_' + id); if (id === 'sriharikota') launch = { x: px, y: py, t: 0 }; return; } }
    },
    frame(ctx) {
      const gm = inGeom();
      if (IN.map) { ctx.drawImage(IN.map, gm.x, gm.y, gm.s, gm.s); ctx.strokeStyle = '#2B3A7A'; ctx.lineWidth = 2; ctx.strokeRect(gm.x, gm.y, gm.s, gm.s); }
      for (const [line, w] of [[GANGA, 3], [BRAHMA, 2.2]]) { ctx.strokeStyle = '#4FB6FF'; ctx.lineWidth = w * gm.s / 600; ctx.lineJoin = 'round'; ctx.beginPath(); line.forEach(([la, lo], i) => { const [x, y] = toMap(la, lo, gm); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
      const fs = clamp(gm.s / 45, 10, 14);
      for (const [nm, la, lo] of [['Arabian Sea', 15, 67.5], ['Bay of Bengal', 15, 87.5], ['Indian Ocean', 6.5, 82]]) { const [x, y] = toMap(la, lo, gm); text(ctx, nm, x, y, fs, 'rgba(180,215,255,.8)', 'center', 600); }
      for (const [nm, la, lo] of CITIES) { const [x, y] = toMap(la, lo, gm); ctx.fillStyle = '#F3F1FF'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); text(ctx, nm, x + 6, y + 4, fs * .85, '#F3F1FF', 'left', 600); }
      for (const [id, nm, la, lo] of PINS) {
        const [x, y] = toMap(la, lo, gm), bob = Math.sin(t * 3 + la) * 2;
        ctx.fillStyle = '#FFB52E'; ctx.beginPath(); ctx.arc(x, y - 14 + bob, 10, PI * .85, PI * .15); ctx.lineTo(x, y + bob); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2A1600'; ctx.beginPath(); ctx.arc(x, y - 15 + bob, 4, 0, TAU); ctx.fill();
      }
      if (launch) { launch.t += 1 / 60; const k = launch.t, ry = launch.y - k * k * 120; flame(ctx, launch.x, ry + 16, 22, 4); ctx.fillStyle = '#F3F4F8'; ctx.beginPath(); ctx.moveTo(launch.x, ry - 18); ctx.lineTo(launch.x + 5, ry - 6); ctx.lineTo(launch.x + 5, ry + 14); ctx.lineTo(launch.x - 5, ry + 14); ctx.lineTo(launch.x - 5, ry - 6); ctx.fill(); if (k > 4) launch = null; }
      if (inLabel && inLabel.life > 0) { inLabel.life -= 1 / 60; pill(ctx, inLabel.s, inLabel.x, inLabel.y, '#FFB52E', '#2A1600', 15); }
      text(ctx, 'India and its neighbours, seen from space · Tap a pin', W / 2, gm.y + gm.s - 8, 12, 'rgba(243,241,255,.85)', 'center', 600);
    }
  };

  /* ---------------- inside the Earth */
  let depth = 0, layerSaid = '';
  const LAYERS = [['crust', 'Crust', 0, '#8A5A3C'], ['mantle', 'Mantle', .006, '#E0562A'], ['outer', 'Outer core', .455, '#FFB52E'], ['inner', 'Inner core', .808, '#FFF2C0']];
  M.inside = {
    enter() { depth = 0; layerSaid = ''; setCtl([{ id: 'dig', icon: 'down', label: 'Dig deeper', hold: true, go: true }, { id: 'upward', icon: 'up', label: 'Go back up', hold: true }]); Voice.say('e_inside'); },
    down(x, y) { this.drag = true; this.move(x, y); },
    move(x, y) { if (!this.drag) return; const { R, cy } = geomIn(); depth = clamp((y - (cy - R)) / R, 0, 1); },
    up() { this.drag = false; },
    frame(ctx, dt, d) {
      const { R, cx, cy } = geomIn();
      if (held.dig) depth = Math.min(1, depth + dt * .12); if (held.upward) depth = Math.max(0, depth - dt * .2);
      drawBody(ctx, 'earth', cx, cy, R, { rot: -t * .05, L: [-.5, -.4, .77], pitch: .3, dpr: d, slot, ambient: .15, maxD: 400 });
      // cut-away wedge with the layers
      const radii = [[1, '#8A5A3C'], [.985, '#C2442A'], [.55, '#F09A2A'], [.19, '#FFF0B8']];
      for (const [k, col] of radii) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * k);
        g.addColorStop(0, col); g.addColorStop(1, k === .985 ? '#8E2A18' : k === .55 ? '#D9701E' : k === .19 ? '#FFD86A' : '#6A4028');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * k, -PI / 2, 0); ctx.closePath(); ctx.fill();
      }
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * .98, -PI / 2, 0); ctx.closePath(); ctx.clip();
      ctx.strokeStyle = 'rgba(255,200,120,.25)'; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const a = -PI / 2 + (i + .5) * PI / 12 + Math.sin(t * .3 + i) * .05; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * R * .77, cy + Math.sin(a) * R * .77, R * .1, R * .05, a + t * .4, 0, TAU); ctx.stroke(); }
      ctx.restore();
      const lab = (s, k, y) => text(ctx, s, cx + R * k + 8, cy - R * y, clamp(R / 14, 11, 15), '#F3F1FF', 'left', 700);
      lab('Crust', .02, .99); lab('Mantle', .3, .75); lab('Outer core', .2, .37); lab('Inner core', .04, .1);
      // the drill
      const dy = cy - R + depth * R;
      ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 6, cy - R - 6); ctx.lineTo(cx - 6, dy); ctx.stroke();
      ctx.fillStyle = '#FFB52E'; ctx.beginPath(); ctx.moveTo(cx - 14, dy - 10); ctx.lineTo(cx + 2, dy - 10); ctx.lineTo(cx - 6, dy + 8); ctx.fill();
      drawAstro(ctx, cx - 30, cy - R - 2, clamp(R / 380, .35, .6), false, 0, t, 1);
      const layer = depth >= .808 ? 'inner' : depth >= .455 ? 'outer' : depth >= .03 ? 'mantle' : depth > .001 ? 'crust' : '';
      if (layer && layer !== layerSaid) { layerSaid = layer; Sfx.twinkle(); Voice.say('e_' + layer); }
      const km = Math.round(depth * 6371), tc = depth < .006 ? 15 + depth * 1e5 : depth < .455 ? lerp(1000, 3700, depth / .455) : depth < .808 ? lerp(4000, 5000, (depth - .455) / .35) : 5200;
      const bx = 16, by = top();
      ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, bx, by, 210, 74, 14); ctx.fill();
      text(ctx, `Depth: ${km.toLocaleString('en-IN')} km`, bx + 14, by + 28, 18, '#FFB52E', 'left');
      text(ctx, `About ${Math.round(tc).toLocaleString('en-IN')} °C down here`, bx + 14, by + 54, 13, '#F3F1FF', 'left', 600);
      // peach: same idea in a fruit
      const px = W - 70, py = top() + 50;
      if (W > 520) {
        ctx.fillStyle = '#FFB27A'; ctx.beginPath(); ctx.arc(px, py, 40, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFD7A8'; ctx.beginPath(); ctx.arc(px, py, 36, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8A4A2A'; ctx.beginPath(); ctx.ellipse(px, py, 14, 18, 0, 0, TAU); ctx.fill();
        text(ctx, 'Like a peach!', px, py + 60, 13, '#A8B2DE', 'center', 600);
      }
    }
  };
  function geomIn() { const T = top(), B = bottom(), R = Math.min(W * .4, (B - T) * .42); return { R, cx: W / 2, cy: T + (B - T) / 2 + R * .12 }; }

  /* ---------------- volcano */
  let V = null;
  function resetV() { V = { p: 0, erupt: 0, lava: [], ash: [], flow: 0, cool: 0, layers: V ? V.layers : 0, said: false }; }
  M.volcano = {
    enter() { resetV(); setCtl([{ id: 'push', icon: 'up', label: 'Push the magma', go: true }]); Voice.say('e_volcano'); },
    act(id) { if (id === 'push' && !V.erupt) { V.p = Math.min(1, V.p + .14); Sfx.tone(90 + V.p * 60, .3, 'sawtooth', .05); if (V.p >= 1) { V.erupt = 6; V.flow = 0; V.cool = 0; Sfx.whoosh(); Voice.say('e_erupt'); } } },
    down() { this.act('push'); },
    frame(ctx, dt) {
      const T = top(), B = bottom(), gy = T + (B - T) * .62, cx = W / 2, hw = Math.min(W * .42, (B - T) * .9), hh = (B - T) * .4 + V.layers * 4;
      let g = ctx.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, '#5BA6E8'); g.addColorStop(1, '#BFE3FF'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, gy);
      const shake = V.p > .6 && !V.erupt ? (Math.random() - .5) * 4 * V.p : V.erupt > 4 ? (Math.random() - .5) * 6 : 0;
      ctx.save(); ctx.translate(shake, 0);
      ctx.fillStyle = '#6A4A34'; ctx.fillRect(0, gy, W, H - gy);
      ctx.fillStyle = '#4E3626'; for (let i = 0; i < 4; i++) ctx.fillRect(0, gy + 20 + i * (H - gy) / 4, W, 3);
      // magma chamber and pipe
      const ch = gy + (H - gy) * .5, pipeTop = gy - hh + 10, fill = V.erupt ? 1 : V.p;
      ctx.fillStyle = '#FF6A1A'; ctx.beginPath(); ctx.ellipse(cx, ch, hw * .4, (H - gy) * .22, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3A2414'; ctx.fillRect(cx - 9, pipeTop, 18, ch - pipeTop);
      const lvl = lerp(ch, pipeTop, fill); ctx.fillStyle = '#FF8A2A'; ctx.fillRect(cx - 8, lvl, 16, ch - lvl);
      // the mountain
      ctx.fillStyle = '#7A5A44'; ctx.beginPath(); ctx.moveTo(cx - hw, gy + 2); ctx.lineTo(cx - 26, gy - hh); ctx.lineTo(cx + 26, gy - hh); ctx.lineTo(cx + hw, gy + 2); ctx.fill();
      ctx.fillStyle = '#3A2414'; ctx.fillRect(cx - 9, gy - hh, 18, hh * .4);
      ctx.fillStyle = '#FF8A2A'; if (fill > .7) ctx.fillRect(cx - 8, Math.max(gy - hh, lvl), 16, (gy - hh * .6) - Math.max(gy - hh, lvl));
      for (let i = 0; i < V.layers; i++) { ctx.strokeStyle = 'rgba(30,25,25,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - hw + i * 4, gy - i * 2); ctx.lineTo(cx - 26, gy - hh + i * 4 + 4); ctx.stroke(); }
      if (V.erupt > 0) {
        V.erupt -= dt; V.flow = Math.min(1, V.flow + dt * .25);
        for (let i = 0; i < 6; i++) V.lava.push({ x: cx, y: gy - hh, vx: (Math.random() - .5) * 260, vy: -200 - Math.random() * 260, l: 0 });
        if (Math.random() < .6) V.ash.push({ x: cx + (Math.random() - .5) * 30, y: gy - hh - 20, r: 20 + Math.random() * 20, l: 0 });
        if (V.erupt <= 0) { V.cool = .01; }
      }
      if (V.flow > 0) {
        const col = V.cool > 0 ? mix([255, 120, 30], [40, 34, 34], Math.min(1, V.cool)) : [255, 120 + Math.sin(t * 8) * 30, 30];
        ctx.strokeStyle = `rgb(${col.map(v => v | 0)})`; ctx.lineWidth = 10; ctx.lineCap = 'round';
        for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * 14, gy - hh); for (let k = 0; k <= 20 * V.flow; k++) { const u = k / 20; ctx.lineTo(cx + sgn * (14 + (hw - 20) * u) + Math.sin(u * 12 + sgn) * 6, gy - hh + hh * u); } ctx.stroke(); }
        if (V.cool > 0) { V.cool += dt / 5; if (V.cool >= 1 && !V.said) { V.said = true; V.layers = Math.min(6, V.layers + 1); Voice.say('e_newland', () => { const L = V.layers; resetV(); V.layers = L; }); } }
      }
      for (let i = V.lava.length - 1; i >= 0; i--) { const p = V.lava[i]; p.l += dt; p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > gy || p.l > 2) { V.lava.splice(i, 1); continue; } ctx.fillStyle = `rgb(255,${150 + Math.random() * 80 | 0},40)`; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill(); }
      for (let i = V.ash.length - 1; i >= 0; i--) { const p = V.ash[i]; p.l += dt; p.y -= 40 * dt; p.x += 20 * dt; p.r += 10 * dt; if (p.l > 5) { V.ash.splice(i, 1); continue; } ctx.fillStyle = `rgba(70,64,64,${.5 * (1 - p.l / 5)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
      ctx.restore();
      text(ctx, 'Magma', cx, ch + 5, 14, '#2A1600');
      const bx = 16, by = T; ctx.fillStyle = 'rgba(13,20,52,.88)'; roundRect(ctx, bx, by, 200, 40, 10); ctx.fill();
      text(ctx, V.erupt > 0 ? 'ERUPTING!' : `Pressure: ${Math.round(V.p * 100)}%`, bx + 12, by + 16, 12, '#A8B2DE', 'left', 600);
      ctx.fillStyle = '#16215A'; roundRect(ctx, bx + 12, by + 23, 176, 9, 4); ctx.fill(); ctx.fillStyle = V.p > .7 ? '#FF6D8A' : '#FFB52E'; roundRect(ctx, bx + 12, by + 23, Math.max(6, 176 * (V.erupt ? 1 : V.p)), 9, 4); ctx.fill();
      if (!V.erupt && !V.flow) text(ctx, 'Tap the button (or the volcano) again and again!', W / 2, B - 4, 13, '#F3F1FF', 'center', 600);
    }
  };

  /* ---------------- water cycle */
  let WC = null;
  function resetW() { WC = { st: 'idle', k: 0, cloud: 0, vap: [], drops: [], river: 0, cx: 0 }; }
  M.water = {
    enter() { resetW(); setCtl([{ id: 'sun', label: 'Warm the sea', go: true }, { id: 'cloud', label: 'Grow the clouds', cyan: true }, { id: 'again', icon: 'again', label: 'Start again' }]); Voice.say('e_water'); },
    act(id) {
      if (id === 'again') { resetW(); return; }
      if (id === 'sun' && WC.st === 'idle') { WC.st = 'evap'; WC.k = 0; Sfx.twinkle(); Voice.say('e_evap'); }
      if (id === 'cloud' && WC.st === 'cloud') { WC.cloud = Math.min(1.6, WC.cloud + .2); Sfx.tap(); if (WC.cloud >= 1.6) { WC.st = 'move'; WC.k = 0; } }
    },
    down(x, y) { const g = this.g; if (!g) return; if (Math.hypot(x - g.sx, y - g.sy) < 60) this.act('sun'); else if (Math.hypot(x - (g.cloudX), y - g.cloudY) < 90) this.act('cloud'); },
    frame(ctx, dt) {
      const T = top(), B = bottom(), sea = B - (B - T) * .18, shore = W * (W < 600 ? .34 : .42), mtn = W * .82;
      const sx = W * .14, sy = T + 74;
      let g = ctx.createLinearGradient(0, 0, 0, B); g.addColorStop(0, '#5BA6E8'); g.addColorStop(1, '#D6EEFF'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      sunGlow(ctx, sx, sy, 26, t, .9); ctx.fillStyle = '#FFE38A'; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, TAU); ctx.fill();
      if (WC.st === 'idle') pill(ctx, 'Tap the Sun!', sx + 20, sy + 58, '#FFB52E', '#2A1600', 14);
      // land and mountains
      const peak = T + (B - T) * .32, pts = [[shore - 50, sea + 6], [shore + 30, sea - 10], [lerp(shore + 30, mtn, .45), sea - 36], [mtn, peak], [W + 30, sea - 70]];
      const landY = x => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return lerp(y0, y1, (x - x0) / (x1 - x0)); } return sea; };
      ctx.fillStyle = '#E8D3A0'; ctx.beginPath(); ctx.moveTo(shore - 60, H); pts.slice(0, 2).forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(shore + 40, H); ctx.fill();
      ctx.fillStyle = '#5E9A48'; ctx.beginPath(); ctx.moveTo(shore + 10, H); pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(W + 30, H); ctx.fill();
      ctx.fillStyle = '#7A8A6A'; ctx.beginPath(); ctx.moveTo(mtn - 70, landY(mtn - 70)); ctx.lineTo(mtn, peak); ctx.lineTo(mtn + 60, landY(mtn + 60)); ctx.fill();
      ctx.fillStyle = '#F3F6FB'; ctx.beginPath(); ctx.moveTo(mtn - 30, landY(mtn - 30)); ctx.lineTo(mtn, peak); ctx.lineTo(mtn + 28, landY(mtn + 28)); ctx.fill();
      // river: down the mountain and across the plain to the sea
      const riverPath = () => { ctx.beginPath(); for (let x = mtn - 26, i = 0; x >= shore - 10; x -= 8, i++) { const y = landY(x) + 6 + Math.sin(i * .7) * 3; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
      ctx.strokeStyle = `rgba(60,140,230,${.35 + WC.river * .6})`; ctx.lineWidth = 3 + WC.river * 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      riverPath(); ctx.stroke();
      if (WC.river > .3) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 14]); ctx.lineDashOffset = t * 40; riverPath(); ctx.stroke(); ctx.setLineDash([]); }
      text(ctx, 'River', (mtn + shore) / 2, landY((mtn + shore) / 2) + 34, 13, '#16215A', 'center', 600);
      // sea
      ctx.fillStyle = '#2A6FC0'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, sea); for (let x = 0; x <= shore - 20; x += 12) ctx.lineTo(x, sea + Math.sin(x * .05 + t * 2) * 3); ctx.lineTo(shore - 70, H); ctx.fill();
      text(ctx, 'Sea', shore * .4, sea + 30, 15, '#DDEFFF');
      // states
      const cloudY = T + (B - T) * .22;
      if (WC.st === 'evap') {
        WC.k += dt; if (Math.random() < .5) WC.vap.push({ x: Math.random() * shore * .9, y: sea - 4, l: 0 });
        WC.cloud = Math.min(.6, WC.k / 6);
        if (WC.k > 6) { WC.st = 'cloud'; Voice.say('e_cloud'); }
      }
      for (let i = WC.vap.length - 1; i >= 0; i--) { const p = WC.vap[i]; p.l += dt; p.y -= 50 * dt; p.x += Math.sin(p.l * 3 + i) * .6; if (p.y < cloudY + 20) { WC.vap.splice(i, 1); continue; } ctx.strokeStyle = `rgba(255,255,255,${.6 - p.l * .08})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + 5, p.y - 6, p.x, p.y - 12); ctx.stroke(); }
      if (WC.st === 'move') { WC.k += dt / 4; WC.cx = WC.k; if (WC.k >= 1) { WC.st = 'rain'; WC.k = 0; Voice.say('e_rain'); } ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { const y = cloudY + 60 + i * 26, x = shore * .5 + ((t * 120 + i * 90) % (W * .4)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40, y); ctx.lineTo(x + 32, y - 6); ctx.stroke(); } text(ctx, 'Monsoon winds', shore * .7, cloudY + 140, 13, '#16215A', 'center', 600); }
      const cloudX = lerp(shore * .45, mtn - 40, WC.cx);
      if (WC.st === 'rain') {
        WC.k += dt; for (let i = 0; i < 4; i++) WC.drops.push({ x: cloudX + (Math.random() - .5) * 150 * WC.cloud, y: cloudY + 30, l: 0 });
        WC.river = Math.min(1, WC.river + dt * .15); WC.cloud = Math.max(.5, WC.cloud - dt * .1);
        if (WC.k > 7) { WC.st = 'river'; WC.k = 0; Voice.say('e_river', () => { if (WC.st === 'river') { const r = WC.river; resetW(); WC.river = r * .5; } }); }
      }
      for (let i = WC.drops.length - 1; i >= 0; i--) { const p = WC.drops[i]; p.l += dt; p.y += 420 * dt; if (p.y > sea - 20 || p.l > 2) { WC.drops.splice(i, 1); continue; } ctx.strokeStyle = 'rgba(40,110,210,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2, p.y + 9); ctx.stroke(); }
      if (WC.cloud > 0) { const k = WC.cloud, dark = clamp((k - .6) / 1, 0, .6); ctx.fillStyle = `rgb(${255 - dark * 140 | 0},${255 - dark * 130 | 0},${255 - dark * 110 | 0})`; for (const [ox, oy, r] of [[-60, 6, 34], [-20, -12, 44], [26, -6, 40], [62, 8, 30], [0, 14, 40]]) { ctx.beginPath(); ctx.arc(cloudX + ox * k, cloudY + oy * k, r * k, 0, TAU); ctx.fill(); } if (WC.st === 'cloud') pill(ctx, 'Tap the cloud!', cloudX, cloudY + 70 * k, '#59E0E8', '#062A2E', 14); }
      this.g = { sx, sy, cloudX, cloudY };
      const steps = ['Sun warms the sea', 'Vapour rises', 'Clouds form', 'Rain falls', 'Rivers flow back'];
      const at = { idle: 0, evap: 1, cloud: 2, move: 2, rain: 3, river: 4 }[WC.st];
      const bw = Math.min(W - 32, 560), bx = (W - bw) / 2;
      steps.forEach((s, i) => { const x = bx + (i + .5) * bw / 5; ctx.fillStyle = i === at ? '#FFB52E' : 'rgba(13,20,52,.75)'; roundRect(ctx, x - bw / 10 + 3, T - 6, bw / 5 - 6, 28, 14); ctx.fill(); text(ctx, s, x, T + 13, clamp(bw / 48, 9, 12), i === at ? '#2A1600' : '#C9D0F2', 'center', 700); });
    }
  };

  // shared plumbing
  function setMode(m) {
    mode = m; Sfx.tap(); Voice.stop();
    $$('#earthModes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m ? 'true' : 'false'));
    for (const k in held) held[k] = false;
    M[m].enter();
  }
  $$('#earthModes button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.m)));
  $('#earthBack').addEventListener('click', () => { Sfx.whoosh(); show('explore', true); Voice.say('visit_back'); });
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  let dn = false;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); dn = true; M[mode].down?.(...pos(e)); });
  cv.addEventListener('pointermove', e => { if (dn) M[mode].move?.(...pos(e)); });
  const up = e => { if (!dn) return; dn = false; M[mode].up?.(...pos(e)); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  function frame(dt) {
    t += dt;
    const ctx = cv.getContext('2d'), d = dprNow(); ctx.setTransform(d, 0, 0, d, 0, 0);
    if (mode === 'globe' || mode === 'india' || mode === 'inside') drawSky(ctx, W, H, t, 0, 0, dt);
    M[mode].frame(ctx, dt, d);
  }
  return {
    frame, layout,
    enter(quiet) {
      layout();
      if (!seenIntro.earth) { seenIntro.earth = true; Voice.say('e_intro', () => { if (current === 'earth' && mode === 'globe') Voice.say('e_globe'); }); mode = 'globe'; $$('#earthModes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === 'globe' ? 'true' : 'false')); setCtl([{ id: 'spin', label: 'Spin', cyan: true }, { id: 'india', label: 'Find India', go: true }]); }
      else if (!quiet) setMode(mode);
    },
    leave() { for (const k in held) held[k] = false; }
  };
})();
