const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Standard CRC32 calculation for PNG chunks
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcPayload = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcPayload);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, crcPayload, crcBuf]);
}

function createPng(width, height, renderPixel) {
  // 8-byte PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression deflate
  ihdrData.writeUInt8(0, 11); // filter standard
  ihdrData.writeUInt8(0, 12); // interlace none
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw scanlines: width * 4 bytes + 1 filter byte per line
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    const ny = y / (height - 1); // 0.0 to 1.0

    for (let x = 0; x < width; x++) {
      const nx = x / (width - 1); // 0.0 to 1.0
      const [r, g, b, a] = renderPixel(nx, ny, x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Distance to rounded rectangle (squircle)
function squircleDist(px, py, cx, cy, rx, ry, radius) {
  const dx = Math.max(0, Math.abs(px - cx) - (rx - radius));
  const dy = Math.max(0, Math.abs(py - cy) - (ry - radius));
  return Math.sqrt(dx * dx + dy * dy) - radius;
}

// Renders the Global College Logo Mark
function renderAppLogoPixel(nx, ny) {
  const cx = 0.5;
  const cy = 0.5;
  const px = nx;
  const py = ny;

  // Squircle icon background: radius 0.45 with corner radius 0.12
  const dSquircle = squircleDist(px, py, cx, cy, 0.46, 0.46, 0.12);
  if (dSquircle > 0) {
    // Outside squircle: transparent
    return [0, 0, 0, 0];
  }

  // Smooth antialiased boundary of the squircle
  let baseAlpha = 255;
  if (dSquircle > -0.012) {
    const t = (-dSquircle) / 0.012;
    baseAlpha = Math.round(Math.max(0, Math.min(255, t * 255)));
  }

  // Deep Navy Gradient base (#0f172a to #1e293b)
  const gradT = (nx + ny) * 0.5;
  let r = Math.round(15 + gradT * (30 - 15));
  let g = Math.round(23 + gradT * (41 - 23));
  let b = Math.round(42 + gradT * (59 - 42));

  // Subtle Cyan/Gold Border Stroke
  if (dSquircle > -0.02) {
    const borderT = nx;
    r = Math.round(56 + borderT * (245 - 56));
    g = Math.round(189 + borderT * (158 - 189));
    b = Math.round(248 + borderT * (11 - 248));
    return [r, g, b, baseAlpha];
  }

  // Distance from center for radial emblem features
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx); // -PI to PI

  // 1. Globe Outer Arc (the curved "G" spine)
  // Ring radius ~ 0.32, stroke thickness ~ 0.08
  const ringDist = Math.abs(dist - 0.31);
  if (ringDist < 0.048) {
    // Cut open between angle -0.35 and 0.1 (top right opening)
    const inOpening = angle > -0.45 && angle < 0.15;
    if (!inOpening) {
      // Vibrant Royal Blue / Cyan Gradient (#38bdf8 to #2563eb)
      const ringT = (angle + Math.PI) / (2 * Math.PI);
      r = Math.round(56 * (1 - ringT) + 37 * ringT);
      g = Math.round(189 * (1 - ringT) + 99 * ringT);
      b = Math.round(248 * (1 - ringT) + 235 * ringT);
      return [r, g, b, baseAlpha];
    }
  }

  // 2. Inward Golden Bar of the "G" (horizontal bar from center to right)
  if (py >= 0.44 && py <= 0.56 && px >= 0.46 && px <= 0.79) {
    // Rich Golden Amber Gradient (#fde68a to #f59e0b)
    const barT = (px - 0.46) / 0.33;
    r = Math.round(253 * (1 - barT) + 245 * barT);
    g = Math.round(230 * (1 - barT) + 158 * barT);
    b = Math.round(138 * (1 - barT) + 11 * barT);
    return [r, g, b, baseAlpha];
  }

  // 3. Academic Mortarboard Diamond at upper right (near px=0.72, py=0.29)
  const dmx = Math.abs(px - 0.72);
  const dmy = Math.abs(py - 0.29);
  if (dmx + dmy <= 0.082) {
    // Golden diamond facet
    const diamondT = (dmx + dmy) / 0.082;
    r = Math.round(254 * (1 - diamondT) + 245 * diamondT);
    g = Math.round(240 * (1 - diamondT) + 158 * diamondT);
    b = Math.round(138 * (1 - diamondT) + 11 * diamondT);
    return [r, g, b, baseAlpha];
  }

  // 4. Central Beacon Star / Core of Knowledge (center dot)
  if (dist < 0.024) {
    return [255, 255, 255, baseAlpha];
  }
  if (dist >= 0.028 && dist <= 0.038) {
    return [56, 189, 248, Math.round(baseAlpha * 0.8)];
  }

  // 5. Subtle orbital meridian arc (dotted ring)
  const ellipseDist = Math.abs(Math.sqrt((dx * dx) / 0.07 + (dy * dy) / 0.015) - 1.0);
  if (ellipseDist < 0.08) {
    return [245, 158, 11, Math.round(baseAlpha * 0.45)];
  }

  return [r, g, b, baseAlpha];
}

const publicDir = path.join(__dirname, '../public');
const sizes = [
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'favicon-96x96.png', size: 96 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-192x192.png', size: 192 },
  { name: 'favicon-512x512.png', size: 512 },
  { name: 'logo.png', size: 512 },
  { name: 'logo-transparent.png', size: 512 },
  { name: 'logo-transparent-cropped.png', size: 512 },
  { name: 'logo-emblem-transparent.png', size: 512 },
];

console.log('Generating crisp Global College PNG app icons...');
for (const item of sizes) {
  const buf = createPng(item.size, item.size, renderAppLogoPixel);
  const outPath = path.join(publicDir, item.name);
  fs.writeFileSync(outPath, buf);
  console.log(`✓ ${item.name} (${item.size}x${item.size}) - ${(buf.length / 1024).toFixed(1)} KB`);
}
console.log('All icons successfully created!');
