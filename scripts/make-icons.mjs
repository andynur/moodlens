// Generates the extension/store icons (public/icons/icon-<size>.png) without extra dependencies.
// Design: padded purple tile, white graduation cap (lucide `graduation-cap` geometry, as in the side panel
// header) and a small gold insight spark. store-assets/logo.svg and BrandMark in src/sidepanel/ui.tsx match.
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

// Graduation cap strokes in lucide's 24-unit grid, flattened to polylines.
const CAP_BOARD = [
  [21.6, 10],
  [12, 5],
  [2.4, 10],
  [12, 15],
  [21.6, 10]
];
const CAP_TASSEL = [
  [22, 10],
  [22, 16]
];
const CAP_BAND = [
  [6, 12.5],
  ...Array.from({ length: 17 }, (_, i) => {
    const angle = Math.PI - (i / 16) * Math.PI;
    return [12 + 6 * Math.cos(angle), 16 + 3 * Math.sin(angle)];
  }),
  [18, 12.5]
];
// Grid-to-tile mapping in 128-unit icon space: lucide (12, 12) lands at (62, 68), scaled 2.7x.
const CAP_SCALE = 2.7;
const CAP_X = 62;
const CAP_Y = 68;

function segmentDistance(x, y, [ax, ay], [bx, by]) {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - (ax + t * vx), y - (ay + t * vy));
}

function icon(size) {
  // Toolbar sizes fill the canvas like other extension icons; the store icon keeps the
  // Chrome Web Store 16px transparent margin around 96px artwork.
  const padding = size * (size <= 32 ? 0 : size <= 48 ? 0.0625 : 0.125);
  const radius = (size - 2 * padding) * 0.24;
  // Artwork is drawn in 128-unit space with the tile at 16..112, then fitted to the tile.
  const unit = (size - 2 * padding) / 96;
  const toPixel = (value) => padding + (value - 16) * unit;
  // Thicker strokes and a solid board at small sizes keep the cap readable in the toolbar.
  const halfStroke = (size <= 32 ? 1.2 : 1) * 0.5 * 2 * CAP_SCALE * unit;
  const solidBoard = size <= 16;
  const lines = [CAP_BOARD, CAP_TASSEL, CAP_BAND].map((line) =>
    line.map(([x, y]) => [toPixel(CAP_X + (x - 12) * CAP_SCALE), toPixel(CAP_Y + (y - 12) * CAP_SCALE)])
  );
  const inSquare = (x, y) => {
    const dx = Math.max(padding + radius - x, 0, x - (size - padding - radius));
    const dy = Math.max(padding + radius - y, 0, y - (size - padding - radius));
    return dx * dx + dy * dy <= radius * radius;
  };
  const inBoard = (x, y) => {
    const [right, top] = lines[0];
    return Math.abs(x - top[0]) / (right[0] - top[0]) + Math.abs(y - right[1]) / (right[1] - top[1]) <= 1;
  };
  const inCap = (x, y) =>
    (solidBoard && inBoard(x, y)) ||
    lines.some((line) => line.slice(1).some((point, i) => segmentDistance(x, y, line[i], point) <= halfStroke));
  const inSpark = (x, y) =>
    size >= 32 && Math.abs(x - toPixel(88.32)) / (7.04 * unit) + Math.abs(y - toPixel(37.12)) / (9.6 * unit) <= 1;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const alpha = coverage(x, y, inSquare);
      const cap = coverage(x, y, inCap);
      const spark = coverage(x, y, inSpark);
      const color = PURPLE.map((value, i) => {
        const withCap = value + (WHITE[i] - value) * cap;
        return Math.round(withCap + (GOLD[i] - withCap) * spark);
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
