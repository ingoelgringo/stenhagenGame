// Ritar spelets ikon på ett 32x32-rutnät och skalar upp med närmaste granne.
// node tools/make-icon.mjs assets
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const out = process.argv[2];
const PAL = {
  k: '#2b1d14', h: '#6b3b1f', s: '#f2c39b', r: '#f7c628', R: '#d49a12', b: '#2f5fa8', w: '#ffffff',
  G: '#5d6166', g: '#9aa0a6', y: '#ffe14d',
  S: '#10142a', T: '#1c2350', // himmel, nedtill lite ljusare
  A: '#b8443a', a: '#8e2f28', X: '#74302a', // radhus, skugga, tak
};
const OUTLINE = '#22160f';
const N = 32;
const px = Array.from({ length: N }, () => Array(N).fill(PAL.S));
const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px[y][x] = c; };

// Himmel med stjärnor
fill(0, 12, N - 1, 13, PAL.T);
for (const [x, y] of [[3, 3], [26, 2], [20, 6], [8, 8], [29, 9]]) px[y][x] = PAL.y;
// Radhus med sadeltak och tända fönster
for (let i = 0; i < 4; i++) {
  const x0 = i * 8;
  fill(x0, 14, x0 + 7, 21, PAL.A);
  fill(x0 + 7, 14, x0 + 7, 21, PAL.a);
  for (let r = 0; r < 4; r++) fill(x0 + r, 13 - r, x0 + 7 - r, 13 - r, PAL.X);
  if (i === 1 || i === 2) continue; // inga fönster bakom barnet
  fill(x0 + 2, 16, x0 + 3, 17, PAL.y);
  fill(x0 + 5, 16, x0 + 5, 17, PAL.y);
}
// Trottoar och gata med mittlinje
fill(0, 22, N - 1, 23, PAL.g);
fill(0, 24, N - 1, N - 1, PAL.G);
for (let x = 2; x < N; x += 6) fill(x, 28, x + 2, 28, PAL.w);

// Barnet i språng (KID_TOP + runA ur js/sprites.js), med kontur som i buildSprite
const kid = [
  '...hhhh...', '..hhhhhhh.', '..hhhssss.', '..hhsssks.', '...ssss...', '...rrrr...',
  '..RRRRRR..', '..rrrrrr..', '..srrrrs..', '...bbbb...',
  '..bb..bb..', '.bb....bb.', '.ww....ww.',
];
const kx = 10, ky = 12; // övre vänstra hörnet för spriten (konturen hamnar en pixel utanför)
const on = (x, y) => y >= 0 && y < kid.length && x >= 0 && x < kid[y].length && kid[y][x] !== '.';
for (let y = -1; y <= kid.length; y++) for (let x = -1; x <= 10; x++) {
  if (on(x, y)) px[ky + y][kx + x] = PAL[kid[y][x]];
  else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) px[ky + y][kx + x] = OUTLINE;
}

// size: bildens sida, art: rutnätets sida i bildpixlar (centrerat, kanterna förlängs utåt)
function png(size, art) {
  const scale = art / N, off = (size - art) / 2;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    const gy = Math.min(N - 1, Math.max(0, Math.floor((y - off) / scale)));
    for (let x = 0; x < size; x++) {
      const gx = Math.min(N - 1, Math.max(0, Math.floor((x - off) / scale)));
      const c = px[gy][gx];
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = parseInt(c.slice(1, 3), 16); raw[i + 1] = parseInt(c.slice(3, 5), 16); raw[i + 2] = parseInt(c.slice(5, 7), 16);
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
  const crc = b => { let c = ~0; for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (~c) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync(join(out, 'icon-180.png'), png(180, 160)); // 5 px per ruta, 10 px kant
writeFileSync(join(out, 'icon-192.png'), png(192, 192)); // 6 px per ruta
writeFileSync(join(out, 'icon-512.png'), png(512, 512)); // 16 px per ruta
writeFileSync(join(out, 'icon-maskable-512.png'), png(512, 384)); // motivet inom Androids säkra zon (80 %)
