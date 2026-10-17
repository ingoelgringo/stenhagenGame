'use strict';
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const touchEl = document.getElementById('touch');

  // ---- Konstanter ----
  const H = 362;                 // spelets höjd = bakgrundsbilderna i halv storlek
  const LANE_Y = [290, 322];     // fötternas y på trottoaren (0) resp. gatan (1)
  const PX_PER_M = 30;
  const GRAVITY = 1500;
  const TILE_W = 1086;
  const BG_B_SHIFT = 18;         // gårdsbildens gata ligger högre, flytta ned så gatorna linjerar
  const SKY = 'rgb(39,131,238)';
  const FONT = '"Press Start 2P", monospace';

  let W = 800;

  const VEHICLES = {
    run:    { label: 'Springer',      speed: 200, jump: 460, hitW: 20 },
    bike:   { label: 'Cykel!',        speed: 270, jump: 400, hitW: 40 },
    skates: { label: 'Rullskridskor!', speed: 240, jump: 440, hitW: 20 },
    board:  { label: 'Skateboard!',   speed: 250, jump: 530, hitW: 30 },
  };

  const OBSTACLES = {
    cat:     { skins: () => [SPR.cat, SPR.grayCat], vx: -25, lanes: [0, 1], say: ['Mjau!', 'Fräs!'] },
    snake:   { skins: () => [SPR.snake], vx: -20, lanes: [0, 1], say: ['Sssss!'] },
    hole:    { skins: () => [SPR.hole], vx: 0, lanes: [1], hole: true, say: ['Oj, en brunn!'] },
    toddler: { skins: () => [SPR.toddler], vx: -12, lanes: [0], say: ['Hihi!', 'Bä!'] },
    adult:   { skins: () => [SPR.adult], vx: -35, lanes: [0, 1], tall: true, say: ['Hallå där!', 'Se upp!'] },
  };

  const ALL_OBSTACLES = Object.keys(OBSTACLES);
  const ALL_VEHICLES = ['bike', 'skates', 'board'];

  const MISSIONS = [
    {
      id: 'park', title: 'Till lekparken', kind: 'reach', meters: 150, hearts: 3, goal: 'LEKPARKEN',
      pool: ['cat', 'snake', 'toddler', 'hole'], vehicles: ['skates', 'board'],
      text: ['Spring till lekparken!', 'Hoppa över katter och ormar.', 'Byt fil om någon är i vägen.'],
      win: ['Du kom fram till lekparken!', 'Dags att gunga.'],
    },
    {
      id: 'ella', title: 'Ikapp Ella!', kind: 'chase', meters: 250, goal: 'KIOSKEN',
      pool: ALL_OBSTACLES, vehicles: ALL_VEHICLES,
      text: ['Ella cyklar till kiosken.', 'Hinn ikapp henne innan', 'hon är framme!', 'Tips: leta efter en cykel.'],
      win: ['Du hann ikapp Ella!', 'Nu köper ni glass ihop.'],
      fail: ['Ella hann först till kiosken.', 'Försök igen!'],
    },
    {
      id: 'boar', title: 'Vildsvinet!', kind: 'escape', chaser: 'boar', meters: 220, goal: 'HEMMA',
      pool: ALL_OBSTACLES, vehicles: ALL_VEHICLES,
      text: ['Ett nyfiket vildsvin vill', 'leka kull med dig.', 'Spring hem innan det', 'hinner ikapp!'],
      win: ['Du kom hem!', 'Vildsvinet lunkar tillbaka', 'till skogen.'],
    },
    {
      id: 'mom', title: 'Mamma ropar', kind: 'escape', chaser: 'mom', meters: 260, goal: 'OLLES HUS',
      pool: ALL_OBSTACLES, vehicles: ALL_VEHICLES,
      text: ['Mamma ropar att maten är klar.', 'Men du måste lämna tillbaka', 'Olles boll först!'],
      win: ['Olle fick tillbaka bollen!', 'Nu kan du gå hem och äta.'],
    },
    {
      id: 'free', title: 'Fri lek', kind: 'endless', hearts: 3,
      pool: ALL_OBSTACLES, vehicles: ALL_VEHICLES,
      text: ['Spring så långt du kan!', 'Farten ökar hela tiden.'],
    },
  ];

  const CHASERS = {
    boar: {
      speed: 193, start: 260, sprites: () => SPR.boar,
      lines: ['Grymt!', 'Nöff nöff!', 'Vänta på mig!'],
      caught: ['Vildsvinet hann ikapp', 'och ville bara gosa.', 'Försök igen!'],
    },
    mom: {
      speed: 191, start: 240, sprites: () => SPR.mom,
      lines: ['Maten är klar!', 'Det är fiskpinnar!', 'Kom in nu!', 'Tvätta händerna!'],
      caught: ['Mamma hann ikapp.', 'Bollen får vänta', 'till imorgon.'],
    },
  };
  const FRIEND = { speed: 185, start: 300, lines: ['Du tar mig aldrig!', 'Pling pling!', 'Hihi!'] };

  // ---- Hjälpare ----
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---- Grafik ----
  let SPR = null;
  const bgA = new Image();
  const bgB = new Image();
  // nedskalade kopior av bilderna i images/ (spelet ritar dem ändå i halv storlek)
  bgA.src = 'assets/gata.png';
  bgB.src = 'assets/gard.png';

  // ---- Ljud (enkla syntljud, inga filer behövs) ----
  let actx = null;
  let muted = false;
  function wakeAudio() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    }
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function tone(freq, dur, { type = 'square', vol = 0.05, slide = 0, delay = 0 } = {}) {
    if (!actx || muted) return;
    const t0 = actx.currentTime + delay;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  const sfx = {
    jump: () => tone(300, 0.15, { slide: 300 }),
    star: () => { tone(988, 0.08); tone(1319, 0.12, { delay: 0.07 }); },
    hit: () => tone(200, 0.3, { type: 'sawtooth', slide: -120, vol: 0.04 }),
    pickup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, { delay: i * 0.07 })),
    win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { delay: i * 0.13 })),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.22, { delay: i * 0.18, type: 'triangle', vol: 0.08 })),
    bell: () => { tone(2093, 0.2, { type: 'sine' }); tone(2093, 0.25, { type: 'sine', delay: 0.16 }); },
    grunt: () => tone(110, 0.2, { type: 'sawtooth', vol: 0.04, slide: -30 }),
  };

  // ---- Sparning ----
  const SAVE_KEY = 'stenhagen-spel-v1';
  let save = { stars: {}, best: 0 };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY))); } catch (e) { /* ingen sparning */ }
  function storeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ingen sparning */ }
  }

  // ---- Tillstånd ----
  let state = 'menu';       // menu | ready | play | pause | win | lose
  let mission = null;
  let world = null;
  let menuCam = 0;
  let menuSel = 0;
  let uiButtons = [];
  let pointer = { x: -1, y: -1 };
  let touchMode = window.matchMedia('(pointer: coarse)').matches;
  const input = { jumpHeld: false, jumpPointer: null };

  function startMission(m) {
    mission = m;
    world = {
      t: 0,
      player: {
        x: 0, alt: 0, va: 0, lane: 1, laneY: LANE_Y[1], vehicle: 'run', speed: 0,
        slowT: 0, slowDur: 1, slowMin: 1, invT: 0, anim: 0, jumpBuf: 0, onGround: true, bubble: null,
      },
      obstacles: [], stars: [], pickups: [], particles: [],
      nextSpawnX: 650,
      goalX: m.meters ? m.meters * PX_PER_M : Infinity,
      hearts: m.hearts || 0,
      starsTaken: 0,
      friend: m.kind === 'chase' ? { x: FRIEND.start, anim: 0, talkT: 2, bubble: null } : null,
      chaser: m.kind === 'escape' ? { x: -CHASERS[m.chaser].start, anim: 0, talkT: 1, bubble: null } : null,
      shake: 0,
      endT: 0,
      lines: [],
    };
    state = 'ready';
  }

  function playerScreenX() {
    if (mission.kind === 'escape') return Math.min(W * 0.45, 340);
    if (mission.kind === 'chase') return 170;
    return 200;
  }

  function say(ent, text, t = 1.6) { ent.bubble = { text, t }; }

  // ---- Utplacering av hinder, stjärnor och fordon ----
  function addObstacle(type, lane, x) {
    const def = OBSTACLES[type];
    const skin = pick(def.skins());
    world.obstacles.push({
      type, lane, x, skin,
      w: skin[0].w * PIXEL, h: skin[0].h * PIXEL,
      vx: def.vx * rand(0.7, 1.3),
      alt: 0, va: 0, hit: false, fade: 1, seed: Math.random() * 10, bubble: null,
    });
  }

  function addStar(x, lane, alt) { world.stars.push({ x, lane, alt, taken: false }); }

  function spawnChunk(diff) {
    const w = world, m = mission;
    const x = w.nextSpawnX;
    const type = pick(m.pool);
    const def = OBSTACLES[type];
    const lane = pick(def.lanes);
    const other = 1 - lane;
    addObstacle(type, lane, x);

    const r = Math.random();
    if (r < 0.2 + 0.15 * (diff - 1)) {
      // båda filerna blockeras, men den andra alltid med något som går att hoppa över
      const opts = m.pool.filter(t => !OBSTACLES[t].tall && OBSTACLES[t].lanes.includes(other));
      if (opts.length) addObstacle(pick(opts), other, x + rand(-30, 30));
    } else if (r < 0.6) {
      if (def.tall) {
        for (let i = 0; i < 4; i++) addStar(x - 90 + i * 40, other, 14);
      } else {
        // en båge av stjärnor lär barnet att hoppa
        addStar(x - 45, lane, 35); addStar(x, lane, 60); addStar(x + 45, lane, 35);
      }
    } else if (r < 0.8) {
      const l = Math.random() < 0.5 ? 0 : 1;
      for (let i = 0; i < 3; i++) addStar(x + 140 + i * 30, l, 14);
    }

    const waiting = w.pickups.some(pk => !pk.taken);
    if (!waiting && w.player.vehicle === 'run' && m.vehicles.length && Math.random() < 0.2) {
      w.pickups.push({ kind: pick(m.vehicles), x: x + 170, lane: Math.random() < 0.5 ? 0 : 1, taken: false });
    }
    const speedNow = VEHICLES[w.player.vehicle].speed * diff;
    w.nextSpawnX += rand(320, 520) * (speedNow / 200) / Math.sqrt(diff);
  }

  // ---- Uppdatering ----
  function inLane(p, lane) {
    return p.lane === lane && Math.abs(p.laneY - LANE_Y[lane]) < 14;
  }

  function bump(o) {
    const w = world, p = w.player, def = OBSTACLES[o.type];
    o.hit = true;
    if (!def.hole) o.va = 260;
    say(o, pick(def.say));
    p.invT = 1.3;
    w.shake = 0.25;
    sfx.hit();
    puff(p.x, p.laneY - p.alt - 10, '#ffffff', 8);
    if (p.vehicle !== 'run') {
      // fordonet skyddar en gång – man tappar det i stället för att tappa ett hjärta
      p.vehicle = 'run';
      p.slowMin = 0.5; p.slowDur = p.slowT = 0.8;
      say(p, 'Hoppsan!');
    } else {
      p.slowMin = 0.3; p.slowDur = p.slowT = 1.1;
      say(p, pick(['Aj!', 'Hoppsan!', 'Oj oj!']));
      if (mission.hearts) {
        w.hearts--;
        if (w.hearts <= 0) {
          finish(false, mission.kind === 'endless'
            ? [`Du sprang ${Math.floor(p.x / PX_PER_M)} meter!`]
            : ['Du blev trött och gick', 'hem och åt glass.', 'Försök igen!']);
        }
      }
    }
  }

  function puff(x, y, color = '#d8d2c4', n = 5) {
    for (let i = 0; i < n; i++) {
      world.particles.push({ x, y, vx: rand(-60, 60), vy: rand(-80, -10), t: rand(0.3, 0.6), color, size: rand(2, 4) });
    }
  }

  function update(dt) {
    const w = world, p = w.player, m = mission;
    w.t += dt;
    const diff = m.kind === 'endless' ? Math.min(1.6, 1 + w.t / 120) : 1;

    // fart (med inbromsning efter en krock)
    let slow = 1;
    if (p.slowT > 0) {
      p.slowT -= dt;
      slow = p.slowMin + (1 - p.slowMin) * (1 - Math.max(0, p.slowT) / p.slowDur);
    }
    const veh = VEHICLES[p.vehicle];
    p.speed = veh.speed * slow * diff;
    p.x += p.speed * dt;
    p.anim += p.speed * dt;

    // hopp: knapptryck sparas en kort stund så att tidiga tryck inte försvinner
    if (p.jumpBuf > 0) p.jumpBuf -= dt;
    if (p.jumpBuf > 0 && p.onGround) {
      p.va = veh.jump; p.onGround = false; p.jumpBuf = 0;
      sfx.jump();
    }
    if (!p.onGround) {
      if (!input.jumpHeld && p.va > 220) p.va = 220; // släpper man tidigt blir hoppet lägre
      p.va -= GRAVITY * dt;
      p.alt += p.va * dt;
      if (p.alt <= 0) {
        p.alt = 0; p.va = 0; p.onGround = true;
        puff(p.x, p.laneY);
      }
    }
    const ty = LANE_Y[p.lane];
    p.laneY += Math.sign(ty - p.laneY) * Math.min(Math.abs(ty - p.laneY), 260 * dt);
    if (p.invT > 0) p.invT -= dt;
    if (w.shake > 0) w.shake -= dt;

    // nya hinder framför barnet
    while (w.nextSpawnX < p.x + W + 200 && w.nextSpawnX < w.goalX - 350) spawnChunk(diff);

    // hinder
    for (const o of w.obstacles) {
      if (o.hit) {
        if (!OBSTACLES[o.type].hole) {
          o.va -= GRAVITY * dt; o.alt = Math.max(0, o.alt + o.va * dt);
          o.x += 120 * dt;
          o.fade -= dt;
        }
      } else {
        o.x += o.vx * dt;
        if (p.invT <= 0 && inLane(p, o.lane)) {
          const dx = Math.abs(p.x - o.x);
          const hit = OBSTACLES[o.type].hole
            ? p.alt < 2 && dx < o.w / 2 - 6
            : dx < (veh.hitW + o.w) / 2 * 0.8 && p.alt < o.h * 0.8;
          if (hit) bump(o);
        }
      }
      if (o.bubble) o.bubble.t -= dt;
    }

    // stjärnor
    for (const s of w.stars) {
      if (s.taken || !inLane(p, s.lane)) continue;
      if (Math.abs(p.x - s.x) < 18 && Math.abs(p.alt + 18 - s.alt) < 24) {
        s.taken = true;
        w.starsTaken++;
        sfx.star();
        puff(s.x, LANE_Y[s.lane] - s.alt, '#ffe14d', 6);
      }
    }

    // fordon att plocka upp
    for (const pk of w.pickups) {
      if (pk.taken || !inLane(p, pk.lane)) continue;
      if (Math.abs(p.x - pk.x) < 24 && p.alt < 50) {
        pk.taken = true;
        p.vehicle = pk.kind;
        say(p, VEHICLES[pk.kind].label);
        sfx.pickup();
        puff(pk.x, LANE_Y[pk.lane] - 20, '#ffffff', 10);
      }
    }

    // kompisen som ska hinnas ikapp
    if (w.friend) {
      const f = w.friend;
      const gap = f.x - p.x;
      const sp = FRIEND.speed * (gap > 600 ? 0.9 : 1);
      f.x += sp * dt; f.anim += sp * dt;
      f.talkT -= dt;
      if (f.talkT <= 0) {
        const line = pick(FRIEND.lines);
        say(f, line);
        if (line.startsWith('Pling')) sfx.bell();
        f.talkT = rand(3.5, 6);
      }
      if (f.bubble) f.bubble.t -= dt;
      if (gap <= 12) finish(true, m.win);
      else if (f.x >= w.goalX) finish(false, m.fail);
    }

    // den som jagar barnet
    if (w.chaser) {
      const c = w.chaser, def = CHASERS[m.chaser];
      const gap = p.x - c.x;
      const sp = gap > 420 ? p.speed + 15 : def.speed; // tappa aldrig bort jagaren helt
      c.x += sp * dt; c.anim += sp * dt;
      c.talkT -= dt;
      if (c.talkT <= 0) {
        say(c, pick(def.lines));
        if (m.chaser === 'boar') sfx.grunt();
        c.talkT = rand(3, 5);
      }
      if (c.bubble) c.bubble.t -= dt;
      if (gap <= 14) finish(false, def.caught);
    }

    if (p.x >= w.goalX && m.kind !== 'chase') finish(true, m.win);
    if (p.bubble) p.bubble.t -= dt;

    // städa bort det som passerat
    const left = p.x - W;
    w.obstacles = w.obstacles.filter(o => o.x > left && o.fade > 0);
    w.stars = w.stars.filter(s => s.x > left && !s.taken);
    w.pickups = w.pickups.filter(pk => pk.x > left && !pk.taken);
  }

  function updateParticles(dt) {
    if (!world) return;
    for (const pt of world.particles) {
      pt.t -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 300 * dt;
    }
    world.particles = world.particles.filter(pt => pt.t > 0);
  }

  function finish(win, lines) {
    if (state !== 'play') return;
    const w = world;
    state = win ? 'win' : 'lose';
    w.endT = 0;
    w.lines = lines || [];
    if (win) sfx.win(); else sfx.lose();
    if (win) save.stars[mission.id] = Math.max(save.stars[mission.id] || 0, w.starsTaken);
    if (mission.kind === 'endless') {
      const meters = Math.floor(w.player.x / PX_PER_M);
      w.newBest = meters > save.best;
      save.best = Math.max(save.best, meters);
    }
    storeSave();
  }

  // ---- Ritning ----
  function drawText(text, x, y, size = 8, color = '#ffffff', align = 'left') {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 2.5);
    ctx.strokeStyle = '#1a1a2e';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPanel(x, y, w, h) {
    roundRect(x, y, w, h, 8);
    ctx.fillStyle = 'rgba(20, 30, 70, 0.88)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  function button(x, y, w, h, label, action, selected) {
    const hover = pointer.x >= x && pointer.x <= x + w && pointer.y >= y && pointer.y <= y + h;
    roundRect(x, y, w, h, 6);
    ctx.fillStyle = selected || hover ? '#ffe14d' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1a1a2e';
    ctx.stroke();
    ctx.font = `8px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1a2e';
    ctx.fillText(label, x + 12, y + h / 2 + 1);
    uiButtons.push({ x, y, w, h, action });
  }

  // Bakgrunden är en lång remsa: radhus, speglade radhus, speglad gård, gård.
  // Speglingen gör att de flesta skarvar passar perfekt; de två som inte gör det tonas mjukt.
  const FADE_W = 160;
  let strip = null;

  function bTile() {
    const c = document.createElement('canvas');
    c.width = TILE_W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = SKY;
    g.fillRect(0, 0, TILE_W, BG_B_SHIFT);
    g.drawImage(bgB, 0, BG_B_SHIFT, TILE_W, H);
    return c;
  }

  function fadedTile(src, mirror, fadeLeft) {
    const c = document.createElement('canvas');
    c.width = TILE_W; c.height = H;
    const g = c.getContext('2d');
    if (mirror) { g.translate(TILE_W, 0); g.scale(-1, 1); }
    g.drawImage(src, 0, 0, TILE_W, H);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const grad = g.createLinearGradient(fadeLeft ? 0 : TILE_W, 0, fadeLeft ? FADE_W : TILE_W - FADE_W, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = grad;
    g.fillRect(0, 0, TILE_W, H);
    return c;
  }

  function buildStrip() {
    if (!bgA.naturalWidth || !bgB.naturalWidth) return;
    strip = document.createElement('canvas');
    strip.width = TILE_W * 4; strip.height = H;
    const g = strip.getContext('2d');
    const drawA = (x, mirror) => {
      g.save();
      if (mirror) { g.translate(x + TILE_W, 0); g.scale(-1, 1); x = 0; }
      g.drawImage(bgA, x, 0, TILE_W, H);
      g.restore();
    };
    drawA(0, false);
    drawA(TILE_W, true);
    drawA(TILE_W * 2, false); // under gården, syns bara i övertoningarna
    drawA(TILE_W * 3, true);
    const b = bTile();
    g.drawImage(fadedTile(b, true, true), TILE_W * 2, 0);
    g.drawImage(fadedTile(b, false, false), TILE_W * 3, 0);
  }
  bgA.onload = buildStrip;
  bgB.onload = buildStrip;

  function drawBackground(camX) {
    if (!strip) return;
    const sw = strip.width;
    const off = ((camX % sw) + sw) % sw;
    ctx.drawImage(strip, -Math.round(off), 0);
    if (sw - off < W) ctx.drawImage(strip, Math.round(sw - off), 0);
  }

  function drawBubble(b, x, y) {
    if (!b || b.t <= 0) return;
    ctx.font = `8px ${FONT}`;
    const tw = ctx.measureText(b.text).width;
    const w = tw + 14, h = 18;
    const bx = Math.round(clamp(x - w / 2, 4, W - w - 4)), by = Math.round(y - h - 6);
    roundRect(bx, by, w, h, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a1a2e';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 4, by + h - 1); ctx.lineTo(x, by + h + 6); ctx.lineTo(x + 4, by + h - 1);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, bx + 7, by + h / 2 + 1);
  }

  function drawShadow(sx, groundY, alt, width) {
    const s = clamp(1 - alt / 150, 0.4, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx, groundY + 1, width / 2 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer(p, sx) {
    if (p.invT > 0 && Math.floor(p.invT * 10) % 2 === 0) return;
    const y = p.laneY - p.alt;
    const k = SPR.kid;
    const f = Math.floor(p.anim / 20) % 2;
    switch (p.vehicle) {
      case 'bike':
        drawSprite(ctx, SPR.bike, sx, y);
        drawSprite(ctx, k.sit, sx - 4, y - 18);
        break;
      case 'board':
        drawSprite(ctx, SPR.board, sx, y);
        drawSprite(ctx, p.onGround ? k.stand : k.jump, sx, y - 6);
        break;
      case 'skates':
        drawSprite(ctx, Math.floor(p.anim / 40) % 2 ? k.skateA : k.skateB, sx, y);
        break;
      default:
        drawSprite(ctx, !p.onGround ? k.jump : (f ? k.runA : k.runB), sx, y);
    }
  }

  function drawGoalSign(sx, label) {
    const base = LANE_Y[0] - 4;
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(sx - 3, base - 70, 6, 70);
    ctx.font = `8px ${FONT}`;
    const w = ctx.measureText(label).width + 16;
    roundRect(sx - w / 2, base - 92, w, 24, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1a1a2e';
    ctx.stroke();
    ctx.fillStyle = '#d23c3c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, sx, base - 79);
  }

  function drawFinishLine(sx) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#ffffff' : '#222222';
        ctx.fillRect(Math.round(sx - 6 + j * 6), 298 + i * 6, 6, 6);
      }
    }
  }

  function drawWorld(camX) {
    const w = world, p = w.player;
    const items = [];
    const sxOf = x => Math.round(x - camX);

    if (isFinite(w.goalX)) {
      drawFinishLine(sxOf(w.goalX));
      items.push({ y: LANE_Y[0] - 1, draw: () => drawGoalSign(sxOf(w.goalX), mission.goal) });
    }

    for (const o of w.obstacles) {
      const sx = sxOf(o.x);
      if (sx < -80 || sx > W + 80) continue;
      const isHole = OBSTACLES[o.type].hole;
      items.push({
        y: LANE_Y[o.lane] - (isHole ? 60 : 0),
        draw: () => {
          if (!isHole) drawShadow(sx, LANE_Y[o.lane], o.alt, o.w * 0.8);
          const frames = o.skin;
          const spr = frames[Math.floor(w.t * 6 + o.seed) % frames.length];
          ctx.globalAlpha = clamp(o.fade, 0, 1);
          drawSprite(ctx, spr, sx, LANE_Y[o.lane] - o.alt);
          ctx.globalAlpha = 1;
        },
        bubble: () => drawBubble(o.bubble, sx, LANE_Y[o.lane] - o.alt - o.h - 4),
      });
    }

    for (const s of w.stars) {
      const sx = sxOf(s.x);
      if (sx < -20 || sx > W + 20) continue;
      const bob = Math.sin(w.t * 5 + s.x * 0.05) * 2;
      items.push({ y: LANE_Y[s.lane] - 0.5, draw: () => drawSprite(ctx, SPR.star, sx, LANE_Y[s.lane] - s.alt + 9 + bob) });
    }

    for (const pk of w.pickups) {
      const sx = sxOf(pk.x);
      if (sx < -40 || sx > W + 40) continue;
      const cy = LANE_Y[pk.lane] - 24 + Math.sin(w.t * 4) * 3;
      items.push({
        y: LANE_Y[pk.lane] - 0.5,
        draw: () => {
          ctx.beginPath();
          ctx.arc(sx, cy, 20, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          if (pk.kind === 'bike') drawSprite(ctx, SPR.bike, sx, cy + 9, 1.5);
          else if (pk.kind === 'board') drawSprite(ctx, SPR.board, sx, cy + 4, 2);
          else drawSprite(ctx, SPR.skateIcon, sx, cy + 8, 2.5);
        },
      });
    }

    if (w.friend) {
      const f = w.friend, sx = sxOf(f.x), y = LANE_Y[1];
      items.push({
        y,
        draw: () => {
          drawShadow(sx, y, 0, 50);
          drawSprite(ctx, SPR.bikeBlue, sx, y);
          drawSprite(ctx, SPR.ella.sit, sx - 4, y - 18);
        },
        bubble: () => drawBubble(f.bubble, sx, y - 66),
      });
    }

    if (w.chaser) {
      const c = w.chaser, sx = sxOf(c.x), y = LANE_Y[1];
      const frames = CHASERS[mission.chaser].sprites();
      const spr = frames[Math.floor(c.anim / 22) % frames.length];
      items.push({
        y: y + 0.5,
        draw: () => {
          drawShadow(sx, y, 0, spr.w * PIXEL * 0.8);
          drawSprite(ctx, spr, sx, y);
        },
        bubble: () => drawBubble(c.bubble, sx, y - spr.h * PIXEL - 8),
      });
    }

    const psx = sxOf(p.x);
    items.push({
      y: p.laneY + 0.2,
      draw: () => {
        drawShadow(psx, p.laneY, p.alt, p.vehicle === 'bike' ? 50 : 24);
        drawPlayer(p, psx);
      },
      bubble: () => drawBubble(p.bubble, psx, p.laneY - p.alt - (p.vehicle === 'bike' ? 70 : 50)),
    });

    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    for (const pt of w.particles) {
      ctx.globalAlpha = clamp(pt.t * 2, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x - camX), Math.round(pt.y), pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    for (const it of items) if (it.bubble) it.bubble();
  }

  function drawArrow(x, y, dir, color) {
    ctx.beginPath();
    ctx.moveTo(x, y - 8); ctx.lineTo(x + dir * 10, y); ctx.lineTo(x, y + 8);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a1a2e';
    ctx.stroke();
  }

  function drawHUD(camX) {
    const w = world, p = w.player;
    let x = 12;
    if (mission.hearts) {
      for (let i = 0; i < mission.hearts; i++) {
        drawSprite(ctx, i < w.hearts ? SPR.heart : SPR.heartEmpty, x + 10 + i * 26, 30);
      }
      x += mission.hearts * 26 + 10;
    }
    drawSprite(ctx, SPR.star, x + 10, 30);
    drawText(String(w.starsTaken), x + 26, 15, 16);

    if (isFinite(w.goalX)) {
      const bw = Math.min(260, W - 320), bx = Math.round(W / 2 - bw / 2), by = 14;
      roundRect(bx, by, bw, 10, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      const mark = (wx, color) => {
        const mx = bx + clamp(wx / w.goalX, 0, 1) * bw;
        ctx.beginPath();
        ctx.arc(mx, by + 5, 7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1a1a2e';
        ctx.stroke();
      };
      drawText(mission.goal, bx + bw + 10, by + 1, 8, '#ffe14d');
      if (w.chaser) mark(w.chaser.x, mission.chaser === 'boar' ? '#6b4a2e' : '#8a4fa8');
      if (w.friend) mark(w.friend.x, '#4caf50');
      mark(p.x, '#f7c628');
    } else {
      drawText(`${Math.floor(p.x / PX_PER_M)} m`, W / 2, 14, 16, '#ffffff', 'center');
      if (save.best) drawText(`Rekord ${save.best} m`, W / 2, 36, 8, '#ffe14d', 'center');
    }

    // pilar mot den man jagar / den som jagar en när de är utanför bild
    if (w.friend) {
      const sx = w.friend.x - camX;
      if (sx > W - 10) {
        drawArrow(W - 24, 120, 1, '#4caf50');
        drawText(`Ella ${Math.ceil((w.friend.x - p.x) / PX_PER_M)} m`, W - 30, 115, 8, '#ffffff', 'right');
      }
    }
    if (w.chaser) {
      const sx = w.chaser.x - camX;
      if (sx < 10) {
        const blink = Math.floor(w.t * 4) % 2 ? '#ff6b6b' : '#ffffff';
        drawArrow(24, 120, -1, blink);
        drawText(`${Math.ceil((p.x - w.chaser.x) / PX_PER_M)} m`, 30, 115, 8, blink);
      }
    }
  }

  function dim(alpha = 0.45) {
    ctx.fillStyle = `rgba(10,15,40,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawMenu() {
    dim(0.35);
    drawText('SPRING I', W / 2, 26, 16, '#ffe14d', 'center');
    drawText('STENHAGEN!', W / 2, 48, 24, '#ffffff', 'center');
    const bw = 320, bx = Math.round(W / 2 - bw / 2);
    MISSIONS.forEach((m, i) => {
      const y = 90 + i * 40;
      button(bx, y, bw, 34, `${i + 1}. ${m.title}`, () => startMission(m), i === menuSel);
      if (m.id === 'free' && save.best) {
        ctx.fillStyle = '#1a1a2e';
        ctx.textAlign = 'right';
        ctx.fillText(`${save.best} m`, bx + bw - 12, y + 18);
      } else if (save.stars[m.id] !== undefined) {
        drawSprite(ctx, SPR.star, bx + bw - 44, y + 24, 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.textAlign = 'left';
        ctx.fillText(String(save.stars[m.id]), bx + bw - 32, y + 18);
      }
    });
    const hint = touchMode ? 'Tryck på ett uppdrag för att börja!' : `Välj med pilarna + Enter eller klicka.   M = ljud ${muted ? 'av' : 'på'}`;
    drawText(hint, W / 2, 296, 8, '#ffffff', 'center');
  }

  function drawReady() {
    dim(0.3);
    const pw = 440, px = Math.round(W / 2 - pw / 2), py = 64;
    const lines = mission.text;
    const ph = 130 + lines.length * 16;
    drawPanel(px, py, pw, ph);
    drawText(mission.title, W / 2, py + 16, 16, '#ffe14d', 'center');
    lines.forEach((l, i) => drawText(l, W / 2, py + 46 + i * 16, 8, '#ffffff', 'center'));
    const cy = py + 56 + lines.length * 16;
    if (touchMode) {
      drawText('Höger sida = hoppa (håll = högre)', W / 2, cy, 8, '#9fd3ff', 'center');
      drawText('Vänster sida: upp = trottoar, ner = gata', W / 2, cy + 14, 8, '#9fd3ff', 'center');
    } else {
      drawText('Mellanslag = hoppa (håll = högre)', W / 2, cy, 8, '#9fd3ff', 'center');
      drawText('Pil upp/ner = trottoar/gata', W / 2, cy + 14, 8, '#9fd3ff', 'center');
    }
    if (Math.floor(performance.now() / 500) % 2) {
      drawText(touchMode ? 'Tryck HOPPA för att börja!' : 'Tryck mellanslag för att börja!', W / 2, py + ph - 24, 8, '#ffe14d', 'center');
    }
  }

  function drawResult() {
    const w = world, win = state === 'win';
    dim(0.4);
    const pw = 420, px = Math.round(W / 2 - pw / 2), py = 60;
    const ph = 150 + w.lines.length * 16;
    drawPanel(px, py, pw, ph);
    const title = win ? 'BRA JOBBAT!' : (mission.kind === 'endless' ? 'SLUT PÅ ORK!' : 'NÄSTAN!');
    drawText(title, W / 2, py + 16, 16, win ? '#ffe14d' : '#ff9f9f', 'center');
    w.lines.forEach((l, i) => drawText(l, W / 2, py + 46 + i * 16, 8, '#ffffff', 'center'));
    const sy = py + 56 + w.lines.length * 16;
    drawSprite(ctx, SPR.star, W / 2 - 40, sy + 14);
    drawText(`x ${w.starsTaken}`, W / 2 - 24, sy + 2, 8);
    if (w.newBest) drawText('Nytt rekord!', W / 2 + 30, sy + 2, 8, '#ffe14d');

    const idx = MISSIONS.indexOf(mission);
    const next = MISSIONS[idx + 1];
    const btnY = py + ph - 48;
    if (win && next) {
      button(px + 20, btnY, 120, 36, 'Nästa', () => startMission(next), true);
      button(px + 150, btnY, 120, 36, 'Igen', () => startMission(mission));
    } else {
      button(px + 20, btnY, 120, 36, 'Igen', () => startMission(mission), true);
    }
    button(px + pw - 140, btnY, 120, 36, 'Meny', toMenu);
  }

  function drawPause() {
    dim(0.5);
    const pw = 300, px = Math.round(W / 2 - pw / 2), py = 100;
    drawPanel(px, py, pw, 120);
    drawText('PAUS', W / 2, py + 16, 16, '#ffe14d', 'center');
    button(px + 20, py + 66, 120, 36, 'Fortsätt', () => { state = 'play'; }, true);
    button(px + pw - 140, py + 66, 120, 36, 'Meny', toMenu);
  }

  function render() {
    uiButtons = [];
    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;

    if (state === 'menu') {
      drawBackground(menuCam);
      ctx.imageSmoothingEnabled = false;
      drawMenu();
      return;
    }

    const camX = world.player.x - playerScreenX();
    ctx.save();
    if (world.shake > 0) ctx.translate(Math.round(rand(-3, 3)), Math.round(rand(-2, 2)));
    drawBackground(camX);
    ctx.imageSmoothingEnabled = false;
    drawWorld(camX);
    ctx.restore();
    drawHUD(camX);

    if (state === 'ready') drawReady();
    else if (state === 'pause') drawPause();
    else if (state === 'win' || state === 'lose') drawResult();
  }

  // ---- Styrning ----
  function toMenu() {
    state = 'menu';
    world = null;
  }

  function press(action) {
    wakeAudio();
    if (state === 'menu') {
      if (action === 'up') menuSel = (menuSel + MISSIONS.length - 1) % MISSIONS.length;
      else if (action === 'down') menuSel = (menuSel + 1) % MISSIONS.length;
      else if (action === 'jump') startMission(MISSIONS[menuSel]);
      return;
    }
    if (state === 'ready') {
      if (action === 'jump') state = 'play';
      return;
    }
    if (state === 'pause') {
      if (action === 'jump') state = 'play';
      return;
    }
    if (state === 'win' || state === 'lose') {
      if (action === 'jump' && world.endT > 0.7) {
        const next = MISSIONS[MISSIONS.indexOf(mission) + 1];
        startMission(state === 'win' && next ? next : mission);
      }
      return;
    }
    const p = world.player;
    if (action === 'jump') p.jumpBuf = 0.15;
    else if (action === 'up') p.lane = 0;
    else if (action === 'down') p.lane = 1;
  }

  function togglePause() {
    if (state === 'play') state = 'pause';
    else if (state === 'pause') state = 'play';
  }

  const KEYS = {
    Space: 'jump', Enter: 'jump',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
  };

  window.addEventListener('keydown', e => {
    touchMode = false;
    const action = KEYS[e.code];
    if (action) {
      e.preventDefault();
      if (action === 'jump') input.jumpHeld = true;
      if (!e.repeat) press(action);
    } else if (e.code >= 'Digit1' && e.code <= 'Digit5' && state === 'menu') {
      wakeAudio();
      startMission(MISSIONS[Number(e.code.slice(5)) - 1]);
    } else if (e.code === 'KeyP') {
      togglePause();
    } else if (e.code === 'Escape') {
      if (state === 'play') togglePause();
      else if (state !== 'menu') toMenu();
    } else if (e.code === 'KeyM') {
      muted = !muted;
    }
  });
  window.addEventListener('keyup', e => {
    if (KEYS[e.code] === 'jump') input.jumpHeld = false;
  });
  function autoPause() {
    input.jumpHeld = false;
    if (state === 'play') state = 'pause';
  }
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  // På mobilen: helskärm och liggande läge när det går (Android; iPhone ignorerar det)
  function goFullscreen() {
    if (!touchMode || document.fullscreenElement) return;
    const el = document.documentElement;
    if (!el.requestFullscreen) return;
    el.requestFullscreen().then(() => {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    }).catch(() => {});
  }

  function startJump(pointerId) {
    input.jumpHeld = true;
    input.jumpPointer = pointerId;
    press('jump');
  }
  function endJump(pointerId) {
    if (input.jumpPointer === pointerId) {
      input.jumpHeld = false;
      input.jumpPointer = null;
    }
  }

  canvas.addEventListener('pointermove', e => { pointer = toCanvas(e); });
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (e.pointerType === 'touch') touchMode = true;
    wakeAudio();
    pointer = toCanvas(e);
    const b = uiButtons.find(b => pointer.x >= b.x && pointer.x <= b.x + b.w && pointer.y >= b.y && pointer.y <= b.y + b.h);
    if (b) {
      if (state === 'menu') goFullscreen();
      b.action();
      return;
    }
    if (state === 'play' && touchMode && pointer.x < W * 0.4) {
      // vänstra delen av skärmen byter fil: övre halvan = trottoar, nedre = gata
      press(pointer.y < H * 0.6 ? 'up' : 'down');
    } else if (state === 'ready' || state === 'play') {
      startJump(e.pointerId);
    }
  });
  canvas.addEventListener('pointerup', e => endJump(e.pointerId));
  canvas.addEventListener('pointercancel', e => endJump(e.pointerId));
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  function holdButton(id, action) {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      touchMode = true;
      wakeAudio();
      if (action === 'pause') togglePause();
      else if (action === 'jump') startJump(e.pointerId);
      else press(action);
    });
    const release = e => endJump(e.pointerId);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  holdButton('btnUp', 'up');
  holdButton('btnDown', 'down');
  holdButton('btnJump', 'jump');
  holdButton('btnPause', 'pause');

  // ---- Storlek: höjden är fast, bredden följer fönstret ----
  function resize() {
    W = clamp(Math.round(H * window.innerWidth / window.innerHeight), 640, TILE_W);
    canvas.width = W;
    canvas.height = H;
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = `${Math.floor(W * scale)}px`;
    canvas.style.height = `${Math.floor(H * scale)}px`;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();

  // ---- Huvudloop ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (state === 'play') update(dt);
    else if (state === 'menu') menuCam += 40 * dt;
    if (world && (state === 'win' || state === 'lose')) world.endT += dt;
    updateParticles(dt);
    render();
    touchEl.classList.toggle('on', touchMode && (state === 'play' || state === 'ready' || state === 'pause'));
    requestAnimationFrame(frame);
  }

  SPR = makeSprites();
  // Testläge: index.html?demo=<uppdrag> startar direkt och kör en stund (för skärmdumpar)
  const demo = new URLSearchParams(location.search).get('demo');
  menuCam = Number(new URLSearchParams(location.search).get('cam')) || 0;
  if (new URLSearchParams(location.search).get('touch')) touchMode = true;
  if (demo) {
    const m = MISSIONS.find(m => m.id === demo) || MISSIONS[0];
    startMission(m);
    state = 'play';
    const frames = Number(new URLSearchParams(location.search).get('t')) || 60;
    for (let i = 0; i < frames && state === 'play'; i++) update(1 / 60);
  }
  requestAnimationFrame(frame);
})();
