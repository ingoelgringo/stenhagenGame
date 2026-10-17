'use strict';
// Pixelgrafik för spelet. Varje sprite skrivs som rader av tecken där varje tecken
// är en färg i paletten nedan ('.' = genomskinligt). En mörk kontur läggs på automatiskt
// så att figurerna syns mot den detaljerade bakgrunden.

const PIXEL = 3; // hur många skärmpixlar (i spelets upplösning) en spritepixel blir

const PALETTE = {
  k: '#2b1d14', // mörk kontur/ögon
  h: '#6b3b1f', // hår brunt
  H: '#f2d16b', // hår blont
  s: '#f2c39b', // hud
  r: '#f7c628', // tröja gul
  R: '#d49a12', // tröja mörkgul
  b: '#2f5fa8', // byxor blå
  w: '#ffffff',
  o: '#e8913a', // katt orange
  O: '#b8641e',
  p: '#f4a0a0', // rosa
  n: '#5aa83f', // orm grön
  N: '#2f6a22',
  P: '#f07ab0', // småbarnströja
  c: '#3c7d5a', // vuxens jacka
  d: '#333a4a', // vuxens byxor
  v: '#2a3b6b', // barnvagn
  B: '#6b4a2e', // vildsvin
  D: '#4a3220',
  m: '#c0857a', // tryne
  F: '#d23c3c', // röd
  g: '#9aa0a6', // grå
  G: '#5d6166',
  K: '#141414', // brunnshål
  y: '#ffe14d', // stjärna
  Y: '#e0a800',
  l: '#8a4fa8', // mammas klänning
  t: '#c49a6c', // skateboard
};
const OUTLINE = '#22160f';

function buildSprite(rows, overrides, outline = true) {
  const pal = Object.assign({}, PALETTE, overrides);
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w + 2;
  c.height = h + 2;
  const g = c.getContext('2d');
  const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < rows[y].length && rows[y][x] !== '.';
  if (outline) {
    g.fillStyle = OUTLINE;
    for (let y = -1; y <= h; y++) {
      for (let x = -1; x <= w; x++) {
        if (filled(x, y)) continue;
        if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) g.fillRect(x + 1, y + 1, 1, 1);
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      g.fillStyle = pal[ch] || '#ff00ff';
      g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  return { canvas: c, w, h };
}

// Ritar en sprite centrerad på cx med fötterna (nedersta raden) på footY.
function drawSprite(ctx, spr, cx, footY, scale = PIXEL) {
  const W = (spr.w + 2) * scale;
  const H = (spr.h + 2) * scale;
  ctx.drawImage(spr.canvas, Math.round(cx - W / 2), Math.round(footY - (spr.h + 1) * scale), W, H);
}

// Liten rutnätshjälp för sprites som är enklare att rita med linjer och cirklar.
function grid(w, h) {
  const cells = Array.from({ length: h }, () => Array(w).fill('.'));
  return {
    set(x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (y >= 0 && y < h && x >= 0 && x < w) cells[y][x] = c;
    },
    line(x0, y0, x1, y1, c) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let i = 0; i <= n; i++) this.set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
    },
    ring(cx, cy, r, c) {
      for (let a = 0; a < 64; a++) this.set(cx + Math.cos(a / 64 * Math.PI * 2) * r, cy + Math.sin(a / 64 * Math.PI * 2) * r, c);
    },
    rows() { return cells.map(r => r.join('')); },
  };
}

// ---- Barnet (tittar åt höger) ----
const KID_TOP = [
  '...hhhh...',
  '..hhhhhhh.',
  '..hhhssss.',
  '..hhsssks.',
  '...ssss...',
  '...rrrr...',
  '..RRRRRR..',
  '..rrrrrr..',
  '..srrrrs..',
  '...bbbb...',
];
const KID_LEGS = {
  runA:   ['..bb..bb..', '.bb....bb.', '.ww....ww.'],
  runB:   ['...bbbb...', '....bb....', '....www...'],
  jump:   ['..bbbbbb..', '..bb...b..', '..ww...ww.'],
  sit:    ['....bbbbb.', '.......bb.', '.......b..', '.......ww.'],
  stand:  ['..bb..bb..', '..b....b..', '.ww....ww.'],
  skateA: ['..bb..bb..', '.bb....bb.', '.ww....ww.', '.GG....GG.'],
  skateB: ['...bbbb...', '...bb.bb..', '..ww...ww.', '..GG...GG.'],
};

function kidSprites(overrides) {
  const out = {};
  for (const k in KID_LEGS) out[k] = buildSprite([...KID_TOP, ...KID_LEGS[k]], overrides);
  return out;
}

function bikeRows() {
  const g = grid(20, 12);
  g.ring(4, 7, 4, 'k');
  g.ring(15, 7, 4, 'k');
  g.set(4, 7, 'g'); g.set(15, 7, 'g');
  g.line(4, 7, 9, 8, 'F');
  g.line(4, 7, 8, 3, 'F');
  g.line(8, 2, 9, 8, 'F');
  g.line(8, 3, 14, 3, 'F');
  g.line(9, 8, 14, 3, 'F');
  g.line(14, 2, 15, 7, 'F');
  g.line(7, 1, 9, 1, 'k'); // sadel
  g.line(13, 0, 15, 0, 'k'); // styre
  g.set(14, 1, 'k');
  return g.rows();
}

function snakeRows(phase) {
  const g = grid(21, 6);
  for (let x = 4; x < 21; x++) {
    const y = 3 + Math.round(Math.sin(x * 0.6 + phase) * 1.2 * Math.min(1, (x - 3) / 4));
    g.set(x, y, 'n');
    if (x < 18) g.set(x, y + 1, 'N');
  }
  for (const [x, y] of [[1, 2], [2, 2], [3, 2], [1, 3], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4]]) g.set(x, y, 'n');
  g.set(2, 2, 'k');
  g.set(0, 4, 'F'); // tunga
  return g.rows();
}

function makeSprites() {
  const S = {};
  S.kid = kidSprites();
  S.ella = kidSprites({ h: '#f2d16b', r: '#4caf50', R: '#2e7d32', b: '#8b4fa8' });

  S.bike = buildSprite(bikeRows(), null, false);
  S.bikeBlue = buildSprite(bikeRows(), { F: '#3f7fd6' }, false);
  S.board = buildSprite([
    't............t',
    '.tttttttttttt.',
    '..kk......kk..',
  ]);
  S.skateIcon = buildSprite([
    'ww....',
    'ww....',
    'wwwww.',
    'wwwwww',
    'FFFFFF',
    'G.G.G.',
  ]);

  // ---- Hinder (tittar åt vänster, mot barnet) ----
  const catA = [
    '.o.o........',
    '.ooo........',
    'okoo......o.',
    'pooo.....o..',
    '.ooooooooo..',
    '..oOoOoOoo..',
    '..o.o..o.o..',
    '..o.o..o.o..',
  ];
  const catB = catA.slice(0, 6).concat(['...oo..oo...', '...oo..oo...']);
  S.cat = [buildSprite(catA), buildSprite(catB)];
  S.grayCat = [buildSprite(catA, { o: '#9aa0a6', O: '#5d6166' }), buildSprite(catB, { o: '#9aa0a6', O: '#5d6166' })];

  S.snake = [buildSprite(snakeRows(0)), buildSprite(snakeRows(Math.PI))];

  S.hole = [buildSprite([
    '..GGGGGGGGGGGG.....',
    '.GKKKKKKKKKKKKG.ggg',
    '.GKKKKKKKKKKKKGgggg',
    '..GGGGGGGGGGGG.ggg.',
  ])];

  const todTop = [
    '..HHHH..',
    '.HHHHHH.',
    '.ssssHH.',
    '.skssHH.',
    '..sssH..',
    '.PPPPP..',
    'sPPPPPs.',
    '.PPPPP..',
    '.wwwww..',
  ];
  S.toddler = [
    buildSprite([...todTop, '..s..s..', '.FF..FF.']),
    buildSprite([...todTop, '..s.s...', '.FF.FF..']),
  ];

  S.adult = [buildSprite([
    '...............hhh...',
    '..............hhhhh..',
    '..............sssh...',
    '..............kssh...',
    '...............ss....',
    '.............cccccc..',
    '............cccccccc.',
    '..vvvv......cccccccc.',
    '.vvvvvv...sscccccccc.',
    'vvvvvvv..k..cccccccc.',
    'vvvvvvv.k....cccccc..',
    'vvvvvvvvk....cccccc..',
    'vvvvvvvvv....cccccc..',
    'vvvvvvvvv....dddddd..',
    '.vvvvvvv.....dd..dd..',
    '..k...k......dd..dd..',
    '.kgk.kgk.....dd..dd..',
    '..k...k.....kkk.kkk..',
  ])];

  // ---- Jagare (tittar åt höger) ----
  const boarTop = [
    '...D.D.D.D........',
    '..DDDDDDDDDD......',
    '.DBBBBBBBBBBBD....',
    'DBBBBBBBBBBBBBBB..',
    'BBBBBBBBBBBBBBkBB.',
    'BBBBBBBBBBBBBBBBmm',
    'BBBBBBBBBBBBBBBwmm',
    '.BBBBBBBBBBBBBBw..',
    '..BBBBBBBBBBBB....',
  ];
  S.boar = [
    buildSprite([...boarTop, '..BB.BB...BB.BB...', '..DD.DD...DD.DD...']),
    buildSprite([...boarTop, '...BBB.....BBB....', '...D.D.....D.D....']),
  ];

  const momTop = [
    '....hhhh..',
    '...hhhhhh.',
    '..hhhssss.',
    '..hhhssks.',
    '..hh.sss..',
    '...llllll.',
    '..llllllls',
    '..sllllll.',
    '...llllll.',
    '..llllllll',
    '..llllllll',
    '...ss..ss.',
  ];
  S.mom = [
    buildSprite([...momTop, '..ss....ss', '.kk....kk.']),
    buildSprite([...momTop, '....ss.s..', '....kkk...']),
  ];

  // ---- Övrigt ----
  S.star = buildSprite([
    '...y...',
    '..yyy..',
    'yyyyyyy',
    '.yyYyy.',
    '.yy.yy.',
    'yy...yy',
  ]);
  const heart = [
    '.FF.FF.',
    'FFFFFFF',
    'FFFFFFF',
    '.FFFFF.',
    '..FFF..',
    '...F...',
  ];
  S.heart = buildSprite(heart);
  S.heartEmpty = buildSprite(heart, { F: '#55505a' });
  return S;
}
