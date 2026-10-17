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

// Core emblem renderer with configurable background shape & scale
function renderEmblem(nx, ny, options = {}) {
  const { isCircle = false, isForeground = false, isAdmin = false, scale = 1.0 } = options;
  const cx = 0.5;
  const cy = 0.5;

  // Transform coordinates if scaled
  const px = (nx - cx) / scale + cx;
  const py = (ny - cy) / scale + cy;

  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  let baseAlpha = 255;

  if (isForeground) {
    // Foreground for adaptive icons: transparent background, only the emblem
    if (dist > 0.49) return [0, 0, 0, 0];
  } else if (isCircle) {
    // Circular icon
    const dCirc = dist - 0.48;
    if (dCirc > 0) return [0, 0, 0, 0];
    if (dCirc > -0.015) {
      baseAlpha = Math.round(Math.max(0, Math.min(255, (-dCirc / 0.015) * 255)));
    }
  } else {
    // Squircle base
    const dSquircle = squircleDist(px, py, cx, cy, 0.46, 0.46, 0.12);
    if (dSquircle > 0) return [0, 0, 0, 0];
    if (dSquircle > -0.012) {
      baseAlpha = Math.round(Math.max(0, Math.min(255, (-dSquircle / 0.012) * 255)));
    }
  }

  // Base Background Colors
  let r = 15, g = 23, b = 42; // Deep Navy #0f172a
  const gradT = (nx + ny) * 0.5;

  if (isAdmin) {
    // Platform Owner Admin: Deep Obsidian/Indigo to Emerald (#090d16 to #042f2e)
    r = Math.round(9 + gradT * (4 - 9));
    g = Math.round(13 + gradT * (47 - 13));
    b = Math.round(22 + gradT * (46 - 22));
  } else {
    // Institutional Navy #0f172a to #1e293b
    r = Math.round(15 + gradT * (30 - 15));
    g = Math.round(23 + gradT * (41 - 23));
    b = Math.round(42 + gradT * (59 - 42));
  }

  // Outer border stroke
  if (!isForeground) {
    const dEdge = isCircle ? (dist - 0.48) : squircleDist(px, py, cx, cy, 0.46, 0.46, 0.12);
    if (dEdge > -0.02) {
      if (isAdmin) {
        // Emerald / Amber gold border
        const bT = nx;
        r = Math.round(16 + bT * (245 - 16));
        g = Math.round(185 + bT * (158 - 185));
        b = Math.round(129 + bT * (11 - 129));
      } else {
        const borderT = nx;
        r = Math.round(56 + borderT * (245 - 56));
        g = Math.round(189 + borderT * (158 - 189));
        b = Math.round(248 + borderT * (11 - 248));
      }
      return [r, g, b, baseAlpha];
    }
  }

  // 1. Globe Outer Arc (the curved "G" spine)
  const ringDist = Math.abs(dist - 0.31);
  if (ringDist < 0.048) {
    const inOpening = angle > -0.45 && angle < 0.15;
    if (!inOpening) {
      const ringT = (angle + Math.PI) / (2 * Math.PI);
      if (isAdmin) {
        // Emerald-to-Cyan Arc (#10b981 to #06b6d4)
        r = Math.round(16 * (1 - ringT) + 6 * ringT);
        g = Math.round(185 * (1 - ringT) + 182 * ringT);
        b = Math.round(129 * (1 - ringT) + 212 * ringT);
      } else {
        // Vibrant Royal Blue / Cyan Gradient (#38bdf8 to #2563eb)
        r = Math.round(56 * (1 - ringT) + 37 * ringT);
        g = Math.round(189 * (1 - ringT) + 99 * ringT);
        b = Math.round(248 * (1 - ringT) + 235 * ringT);
      }
      return [r, g, b, baseAlpha];
    }
  }

  // 2. Inward Golden Bar of the "G" (horizontal bar from center to right)
  if (py >= 0.44 && py <= 0.56 && px >= 0.46 && px <= 0.79) {
    const barT = (px - 0.46) / 0.33;
    r = Math.round(253 * (1 - barT) + 245 * barT);
    g = Math.round(230 * (1 - barT) + 158 * barT);
    b = Math.round(138 * (1 - barT) + 11 * barT);
    return [r, g, b, baseAlpha];
  }

  // 3. Academic Mortarboard Diamond / Shield Apex
  const dmx = Math.abs(px - 0.72);
  const dmy = Math.abs(py - 0.29);
  if (dmx + dmy <= 0.082) {
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
    return isAdmin ? [52, 211, 153, Math.round(baseAlpha * 0.9)] : [56, 189, 248, Math.round(baseAlpha * 0.9)];
  }

  // 5. Subtle orbital meridian arc
  const ellipseDist = Math.abs(Math.sqrt((dx * dx) / 0.07 + (dy * dy) / 0.015) - 1.0);
  if (ellipseDist < 0.08) {
    return [245, 158, 11, Math.round(baseAlpha * 0.45)];
  }

  if (isForeground) {
    return [0, 0, 0, 0];
  }

  return [r, g, b, baseAlpha];
}

// Splash Screen Renderer (Full Navy frame with centered emblem)
function renderSplashPixel(nx, ny) {
  const cx = 0.5;
  const cy = 0.5;
  const scale = 0.42; // Emblem occupies 42% of splash center

  const px = (nx - cx) / scale + cx;
  const py = (ny - cy) / scale + cy;

  // Background gradient: Institutional Deep Navy #090d16 -> #0f172a
  const gradT = (nx + ny) * 0.5;
  const bgR = Math.round(9 + gradT * (15 - 9));
  const bgG = Math.round(13 + gradT * (23 - 13));
  const bgB = Math.round(22 + gradT * (42 - 22));

  if (px >= 0 && px <= 1 && py >= 0 && py <= 1) {
    const emblem = renderEmblem(px, py, { isCircle: false, isForeground: false, scale: 1.0 });
    const a = emblem[3] / 255;
    if (a > 0) {
      return [
        Math.round(emblem[0] * a + bgR * (1 - a)),
        Math.round(emblem[1] * a + bgG * (1 - a)),
        Math.round(emblem[2] * a + bgB * (1 - a)),
        255
      ];
    }
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.join(__dirname, '../public');
const resDir = path.join(__dirname, '../android/app/src/main/res');

console.log('--- Generating Web & Desktop Icons ---');
const webSizes = [
  { name: 'favicon-48x48.png', size: 48, fn: (nx, ny) => renderEmblem(nx, ny, {}) },
  { name: 'favicon-96x96.png', size: 96, fn: (nx, ny) => renderEmblem(nx, ny, {}) },
  { name: 'apple-touch-icon.png', size: 180, fn: (nx, ny) => renderEmblem(nx, ny, {}) },
  { name: 'favicon-192x192.png', size: 192, fn: (nx, ny) => renderEmblem(nx, ny, {}) },
  { name: 'favicon-512x512.png', size: 512, fn: (nx, ny) => renderEmblem(nx, ny, {}) },
  { name: 'logo.png', size: 512, fn: (nx, ny) => renderEmblem(nx, ny, {}) },
  { name: 'logo-transparent.png', size: 512, fn: (nx, ny) => renderEmblem(nx, ny, {}) },
  { name: 'logo-transparent-cropped.png', size: 512, fn: (nx, ny) => renderEmblem(nx, ny, {}) },
  { name: 'logo-emblem-transparent.png', size: 512, fn: (nx, ny) => renderEmblem(nx, ny, {}) },
  // SaaS Admin Specific App Icon
  { name: 'logo-saas-admin.png', size: 512, fn: (nx, ny) => renderEmblem(nx, ny, { isAdmin: true }) },
];

for (const item of webSizes) {
  const buf = createPng(item.size, item.size, item.fn);
  fs.writeFileSync(path.join(publicDir, item.name), buf);
  console.log(`✓ public/${item.name} (${item.size}x${item.size}) - ${(buf.length / 1024).toFixed(1)} KB`);
}

console.log('\n--- Generating Android Native Mipmap & Splash Suite ---');
const androidMipmaps = [
  { folder: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
];

for (const m of androidMipmaps) {
  const targetDir = path.join(resDir, m.folder);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  // 1. Standard Squircle ic_launcher.png
  const iconBuf = createPng(m.iconSize, m.iconSize, (nx, ny) => renderEmblem(nx, ny, {}));
  fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), iconBuf);

  // 2. Round ic_launcher_round.png
  const roundBuf = createPng(m.iconSize, m.iconSize, (nx, ny) => renderEmblem(nx, ny, { isCircle: true }));
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), roundBuf);

  // 3. Adaptive Foreground ic_launcher_foreground.png (scaled at 0.68)
  const fgBuf = createPng(m.fgSize, m.fgSize, (nx, ny) => renderEmblem(nx, ny, { isForeground: true, scale: 0.68 }));
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), fgBuf);

  console.log(`✓ ${m.folder}: ic_launcher (${m.iconSize}px), round (${m.iconSize}px), foreground (${m.fgSize}px)`);

  // --- SaaS Admin Flavor Icons ---
  const saasAdminResDir = path.join(__dirname, '../android/app/src/saasAdmin/res', m.folder);
  if (!fs.existsSync(saasAdminResDir)) fs.mkdirSync(saasAdminResDir, { recursive: true });

  const adminIconBuf = createPng(m.iconSize, m.iconSize, (nx, ny) => renderEmblem(nx, ny, { isAdmin: true }));
  fs.writeFileSync(path.join(saasAdminResDir, 'ic_launcher.png'), adminIconBuf);

  const adminRoundBuf = createPng(m.iconSize, m.iconSize, (nx, ny) => renderEmblem(nx, ny, { isAdmin: true, isCircle: true }));
  fs.writeFileSync(path.join(saasAdminResDir, 'ic_launcher_round.png'), adminRoundBuf);

  const adminFgBuf = createPng(m.fgSize, m.fgSize, (nx, ny) => renderEmblem(nx, ny, { isAdmin: true, isForeground: true, scale: 0.68 }));
  fs.writeFileSync(path.join(saasAdminResDir, 'ic_launcher_foreground.png'), adminFgBuf);
}
console.log('✓ SaaS Admin Flavor Mipmap Icons Generated!');

console.log('\n--- Generating Android Splash Screens ---');
const splashFolders = [
  'drawable',
  'drawable-land-mdpi',
  'drawable-land-hdpi',
  'drawable-land-xhdpi',
  'drawable-land-xxhdpi',
  'drawable-land-xxxhdpi',
  'drawable-port-mdpi',
  'drawable-port-hdpi',
  'drawable-port-xhdpi',
  'drawable-port-xxhdpi',
  'drawable-port-xxxhdpi',
];

const splashBuf = createPng(512, 512, renderSplashPixel);
for (const folder of splashFolders) {
  const targetDir = path.join(resDir, folder);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'splash.png'), splashBuf);
}
console.log(`✓ Updated splash.png across all ${splashFolders.length} drawable orientations!`);

console.log('\nAll App Icons & Android Resources Rendered Successfully!');
