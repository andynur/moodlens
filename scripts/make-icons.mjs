// Generates the extension/store icons (public/icons/icon-<size>.png) without extra dependencies.
// Design: padded purple tile, white study lens and a small gold insight spark.
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const SIZES = [16, 32, 48, 128];
const PURPLE = [86, 69, 212];
const WHITE = [255, 255, 255];
const GOLD = [245, 215, 94];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

// Coverage of a pixel by a shape, using 4x4 supersampling for smooth edges.
function coverage(x, y, inside) {
  let hits = 0;
  for (let sy = 0; sy < 4; sy++)
    for (let sx = 0; sx < 4; sx++) if (inside(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) hits++;
  return hits / 16;
}

function icon(size) {
  const padding = size * 0.125;
  const radius = size * 0.18;
  const centerX = size * 0.47;
  const centerY = size * 0.48;
  const ringOuter = size * 0.22;
  const ringInner = size * 0.135;
  const inSquare = (x, y) => {
    const dx = Math.max(padding + radius - x, 0, x - (size - padding - radius));
    const dy = Math.max(padding + radius - y, 0, y - (size - padding - radius));
    return dx * dx + dy * dy <= radius * radius;
  };
  const inRing = (x, y) => {
    const d = Math.hypot(x - centerX, y - centerY);
    return d <= ringOuter && d >= ringInner;
  };
  const inHandle = (x, y) => {
    const ax = size * 0.61;
    const ay = size * 0.62;
    const bx = size * 0.72;
    const by = size * 0.73;
    const vx = bx - ax;
    const vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(x - (ax + t * vx), y - (ay + t * vy)) <= size * 0.045;
  };
  const inSpark = (x, y) =>
    size >= 32 && Math.abs(x - size * 0.69) / (size * 0.055) + Math.abs(y - size * 0.29) / (size * 0.075) <= 1;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const alpha = coverage(x, y, inSquare);
      const lens = Math.max(coverage(x, y, inRing), coverage(x, y, inHandle));
      const spark = coverage(x, y, inSpark);
      const color = PURPLE.map((value, i) => {
        const withLens = value + (WHITE[i] - value) * lens;
        return Math.round(withLens + (GOLD[i] - withLens) * spark);
      });
      row.set([...color, Math.round(alpha * 255)], 1 + x * 4);
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

await mkdir('public/icons', { recursive: true });
for (const size of SIZES) await writeFile(`public/icons/icon-${size}.png`, icon(size));
console.log(`Wrote ${SIZES.length} icons to public/icons/`);
