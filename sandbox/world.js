// $BOSS Sandbox shared world module (used by the browser client AND the local Phase-2 test server).
// No rendering code here. Original block set; SOL shards are in-game items with no cash value.
// ---------------- world constants ----------------
const SX = 112, SZ = 112, SY = 44, CS = 16;          // world size, chunk size
const NCX = SX / CS, NCZ = SZ / CS;

// Blocks. tex = [top, side, bottom] atlas slots. hard = seconds to mine. drop = SOL shards. cost = shards to place.
const B = [
  null,
  { id: 1, name: "NEON TILE", tex: [0, 0, 0], hard: .35, col: 0x28dcff },
  { id: 2, name: "VOID ROCK", tex: [1, 1, 1], hard: .55, col: 0x8a5cff },
  { id: 3, name: "GRID TURF", tex: [2, 3, 1], hard: .3, col: 0x22e0c0 },
  { id: 4, name: "GREEN CANDLE", tex: [4, 5, 4], hard: .4, col: 0x28ff8c },
  { id: 5, name: "RED CANDLE", tex: [6, 7, 6], hard: .4, col: 0xff3250 },
  { id: 6, name: "BULLION", tex: [8, 8, 8], hard: .5, col: 0xffd24a, cost: 2 },
  { id: 7, name: "PUMP GLASS", tex: [9, 9, 9], hard: .3, col: 0xff4fd8 },
  { id: 8, name: "SOL SHARD VEIN", tex: [10, 10, 10], hard: 1.0, col: 0x9945ff, drop: 1 },
  { id: 9, name: "SOL PRISM VEIN", tex: [11, 11, 11], hard: 1.4, col: 0x14f195, drop: 3 },
  { id: 10, name: "SOL CORE VEIN", tex: [12, 12, 12], hard: 2.0, col: 0xfff2b0, drop: 10 },
  { id: 11, name: "GENESIS PLATE", tex: [13, 13, 13], hard: Infinity, col: 0xffd24a },
  { id: 12, name: "SOL LAMP", tex: [14, 14, 14], hard: .4, col: 0x14f195, cost: 3 },
  { id: 13, name: "CHROME PLATE", tex: [15, 15, 15], hard: .45, col: 0xd8e0ff },
  { id: 14, name: "DUNE GLASS", tex: [16, 17, 1], hard: .3, col: 0xff7ab8 },
  { id: 15, name: "FROST CIRCUIT", tex: [18, 19, 1], hard: .35, col: 0xa8e8ff },
  { id: 16, name: "HOLO MOSS", tex: [20, 21, 1], hard: .3, col: 0x7dffb0 },
  { id: 17, name: "HOLO FROND", tex: [22, 22, 22], hard: .15, col: 0x3cffc8 },
  { id: 18, name: "BOSS GOLD VEIN", tex: [23, 23, 23], hard: 1.5, col: 0xffd24a, drop: 5 },
];
const PALETTE = [1, 13, 4, 5, 7, 2, 6, 12, 14, 17];
// Biomes: 0 NEON FLATS, 1 PUMP DUNES, 2 CRYSTAL GROVE, 3 FROST CHAIN
const BIOMES = ["NEON FLATS", "PUMP DUNES", "CRYSTAL GROVE", "FROST CHAIN"];
const BIOME_TOP = [3, 14, 16, 15];

// ---------------- seeded noise ----------------
function hash3(x, y, z, s) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(s, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function vnoise(x, z, s) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi; const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash3(xi, 0, zi, s), b = hash3(xi + 1, 0, zi, s), c = hash3(xi, 0, zi + 1, s), d = hash3(xi + 1, 0, zi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, s) { let t = 0, a = 1, f = 1, n = 0; for (let i = 0; i < 4; i++) { t += vnoise(x * f, z * f, s + i * 17) * a; n += a; a *= .5; f *= 2; } return t / n; }

// ---------------- world data ----------------
const world = new Uint8Array(SX * SY * SZ);
const idx = (x, y, z) => x + SX * (z + SZ * y);
const inB = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < SZ;
const get = (x, y, z) => inB(x, y, z) ? world[idx(x, y, z)] : (y < 0 ? 11 : 0);

function biomeAt(x, z, sd) { const a = fbm(x / 44, z / 44, sd + 501), b = fbm(x / 38, z / 38, sd + 733);
  if (a > .58) return 3; if (a < .43) return b > .5 ? 2 : 1; return b > .64 ? 2 : b < .36 ? 1 : 0; }
const biome = new Uint8Array(SX * SZ);
export function generate(sd) {
  world.fill(0);
  const R = rng(sd), H = new Int16Array(SX * SZ);
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const n = fbm(x / 26, z / 26, sd), m = fbm(x / 9, z / 9, sd + 99), a = fbm(x / 44, z / 44, sd + 501);
    const frost = Math.max(0, Math.min(1, (a - .53) / .1)), dune = Math.max(0, Math.min(1, (.48 - a) / .1));
    let h = 10 + n * 12 + (m - .5) * 3 * (1 - dune * .7) + dune * Math.sin(x * .33 + z * .21) * 1.4;
    if (n > .6) h += (n - .6) * 24 * (1 + frost * 1.5);   // mesas, taller in the Frost Chain
    h += frost * 4;
    H[x + z * SX] = Math.max(6, Math.min(SY - 10, Math.round(h)));
    biome[x + z * SX] = biomeAt(x, z, sd);
  }
  const cx = SX >> 1, cz = SZ >> 1, ph = Math.max(12, Math.min(17, H[cx + cz * SX]));
  // gentle valley around spawn so the plaza opens onto the world instead of sitting in a pit
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) { const d = Math.hypot(x - cx, z - cz); if (d > 26) continue; const t = Math.max(0, Math.min(1, (d - 6) / 20)), e = t * t * (3 - 2 * t);
    H[x + z * SX] = Math.round(ph + (H[x + z * SX] - ph) * e); }
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const h = H[x + z * SX], bt = BIOME_TOP[biome[x + z * SX]];
    world[idx(x, 0, z)] = 11;
    for (let y = 1; y < h; y++) world[idx(x, y, z)] = 2;
    world[idx(x, h, z)] = bt; if (bt === 14) world[idx(x, h - 1, z)] = 14;
  }
  const far = (X, Z, r) => Math.abs(X - cx) + Math.abs(Z - cz) > r;
  // worm tunnels
  for (let w = 0; w < 15; w++) {
    let x = R() * SX, y = 4 + R() * 9, z = R() * SZ, yaw = R() * 6.28, pit = 0;
    for (let s = 0; s < 52; s++) {
      x += Math.cos(yaw); z += Math.sin(yaw); y += pit; yaw += (R() - .5) * .6; pit = Math.max(-.4, Math.min(.4, pit + (R() - .5) * .3));
      y = Math.max(3, Math.min(17, y)); const r = 1.3 + R() * .8;
      for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy + dz * dz > r * r) continue; const X = Math.round(x + dx), Y = Math.round(y + dy), Z = Math.round(z + dz);
        if (inB(X, Y, Z) && Y > 1 && far(X, Z, 11)) world[idx(X, Y, Z)] = 0;
      }
    }
  }
  // big caverns
  for (let c = 0; c < 4; c++) { const x0 = 12 + R() * (SX - 24), z0 = 12 + R() * (SZ - 24), y0 = 5 + R() * 4, rx = 4 + R() * 3, ry = 2.5 + R() * 1.5, rz = 4 + R() * 3;
    if (!far(x0, z0, 18)) continue;
    for (let y = 2; y < y0 + ry + 1; y++) for (let z = Math.floor(z0 - rz); z <= z0 + rz; z++) for (let x = Math.floor(x0 - rx); x <= x0 + rx; x++) {
      const q = ((x - x0) / rx) ** 2 + ((y - y0) / ry) ** 2 + ((z - z0) / rz) ** 2; if (q < 1 && inB(x, y, z)) world[idx(x, y, z)] = 0; } }
  const vein = (id, n, ymin, ymax, lmin, lmax) => { for (let i = 0; i < n; i++) {
    let x = Math.floor(R() * SX), z = Math.floor(R() * SZ); let y = ymin + Math.floor(R() * (ymax - ymin)); const L = lmin + Math.floor(R() * (lmax - lmin + 1));
    for (let k = 0; k < L; k++) { if (inB(x, y, z) && world[idx(x, y, z)] === 2) world[idx(x, y, z)] = id; const d = Math.floor(R() * 6); if (d === 0) x++; else if (d === 1) x--; else if (d === 2) z++; else if (d === 3) z--; else if (d === 4) y++; else y--; }
  } };
  vein(8, 250, 2, 24, 5, 10); vein(18, 60, 3, 14, 3, 6); vein(9, 80, 2, 10, 3, 6); vein(10, 32, 1, 6, 2, 3);
  // surface shard outcrops near spawn
  for (let i = 0; i < 14; i++) { const a = R() * 6.28, d = 9 + R() * 16, x = Math.round(cx + Math.cos(a) * d), z = Math.round(cz + Math.sin(a) * d); if (!inB(x, 1, z)) continue; const h = H[x + z * SX]; if (!world[idx(x, h, z)]) continue; world[idx(x, h, z)] = 8; if (R() < .5) world[idx(x, h + 1, z)] = 8; }
  // biome features
  for (let i = 0; i < 900; i++) { const x = 2 + Math.floor(R() * (SX - 4)), z = 2 + Math.floor(R() * (SZ - 4)); if (!far(x, z, 12)) continue;
    const h = H[x + z * SX], bm = biome[x + z * SX]; if (world[idx(x, h, z)] !== BIOME_TOP[bm]) continue; const roll = R();
    if (bm === 2 && roll < .16) { // holo trees: chrome trunk + frond crown
      const th = 3 + Math.floor(R() * 3); for (let y = h + 1; y <= h + th; y++) world[idx(x, y, z)] = 13;
      const top = h + th; for (let dy = -1; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const r2 = dx * dx + dz * dz + (dy - .3) * (dy - .3) * 1.8; if (r2 > 5.2 || R() < .12) continue; const X = x + dx, Y = top + dy, Z = z + dz; if (inB(X, Y, Z) && !world[idx(X, Y, Z)]) world[idx(X, Y, Z)] = 17; }
      if (R() < .3) world[idx(x, top + 1, z)] = 12;
    } else if (bm === 1 && roll < .1) { const t = R() < .55 ? 4 : 5, L = 2 + Math.floor(R() * 7); for (let y = h + 1; y <= Math.min(SY - 2, h + L); y++) world[idx(x, y, z)] = t; }
    else if (bm === 3 && roll < .08) { const L = 3 + Math.floor(R() * 5); for (let y = h + 1; y <= Math.min(SY - 2, h + L); y++) world[idx(x, y, z)] = y > h + L - 2 ? 7 : 15; }
    else if (bm === 0 && roll < .035) { const t = R() < .55 ? 4 : 5, L = 2 + Math.floor(R() * 5); for (let y = h + 1; y <= Math.min(SY - 2, h + L); y++) world[idx(x, y, z)] = t; }
  }
  // plaza: neon floor, chrome rim, lamps
  for (let z = cz - 5; z <= cz + 5; z++) for (let x = cx - 5; x <= cx + 5; x++) {
    const edge = Math.max(Math.abs(x - cx), Math.abs(z - cz)) === 5; world[idx(x, ph, z)] = edge ? 13 : ((x + z) & 1 ? 1 : 13);
    for (let y = ph + 1; y < SY; y++) world[idx(x, y, z)] = 0;
  }
  for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { world[idx(cx + dx, ph + 1, cz + dz)] = 13; world[idx(cx + dx, ph + 2, cz + dz)] = 12; }
  for (let y = ph + 1; y <= ph + 3; y++) world[idx(cx, y, cz - 4)] = 13;    // monument base
  return { x: cx + .5, y: ph + 1, z: cz + 1.5 };
}
export function biomeName(x, z) { x = Math.floor(x); z = Math.floor(z); return inB(x, 1, z) ? BIOMES[biome[x + z * SX]] : ""; }
// unbreakable / placeable rules shared with the server
export const PLACEABLE = new Set(PALETTE);
export const canBreak = id => id > 0 && B[id] && B[id].hard !== Infinity;
export const PLAZA_R = 5;   // spawn plaza is a protected build zone in multiplayer
export { SX, SY, SZ, CS, NCX, NCZ, B, PALETTE, world, idx, inB, get, rng };
