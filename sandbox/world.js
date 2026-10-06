// $BOSS Sandbox shared world module (used by the browser client AND the local Phase-2 test server).
// No rendering code here. Original block set; SOL shards are in-game items with no cash value.
// ---------------- world constants ----------------
const SX = 80, SZ = 80, SY = 40, CS = 16;          // world size, chunk size
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
];
const PALETTE = [1, 13, 4, 5, 7, 2, 6, 12];

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

export function generate(sd) {
  world.fill(0);
  const R = rng(sd), H = new Int16Array(SX * SZ);
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const n = fbm(x / 26, z / 26, sd), m = fbm(x / 9, z / 9, sd + 99);
    let h = Math.round(10 + n * 12 + (m - .5) * 3);
    if (n > .62) h += Math.round((n - .62) * 22);       // mesas
    H[x + z * SX] = Math.max(6, Math.min(SY - 8, h));
  }
  // spawn plaza (flattened)
  const cx = SX >> 1, cz = SZ >> 1, ph = Math.max(12, Math.min(18, H[cx + cz * SX]));
  for (let z = cz - 7; z <= cz + 7; z++) for (let x = cx - 7; x <= cx + 7; x++) { const d = Math.max(Math.abs(x - cx), Math.abs(z - cz)); const t = Math.max(0, (d - 5) / 3); H[x + z * SX] = Math.round(ph * (1 - t) + H[x + z * SX] * t); }
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const h = H[x + z * SX];
    world[idx(x, 0, z)] = 11;
    for (let y = 1; y < h; y++) world[idx(x, y, z)] = 2;
    world[idx(x, h, z)] = 3;
  }
  // tunnels (so veins show up in cave walls)
  for (let w = 0; w < 7; w++) {
    let x = R() * SX, y = 4 + R() * 8, z = R() * SZ, yaw = R() * 6.28, pit = 0;
    for (let s = 0; s < 46; s++) {
      x += Math.cos(yaw); z += Math.sin(yaw); y += pit; yaw += (R() - .5) * .6; pit = Math.max(-.4, Math.min(.4, pit + (R() - .5) * .3));
      y = Math.max(3, Math.min(16, y)); const r = 1.3 + R() * .7;
      for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy + dz * dz > r * r) continue; const X = Math.round(x + dx), Y = Math.round(y + dy), Z = Math.round(z + dz);
        if (inB(X, Y, Z) && Y > 1 && Math.abs(X - cx) + Math.abs(Z - cz) > 10) world[idx(X, Y, Z)] = 0;
      }
    }
  }
  // SOL veins: common shards, rarer prisms deeper, rarest cores near the Genesis plate
  const vein = (id, n, ymin, ymax, lmin, lmax) => { for (let i = 0; i < n; i++) {
    let x = Math.floor(R() * SX), z = Math.floor(R() * SZ); let y = ymin + Math.floor(R() * (ymax - ymin)); const L = lmin + Math.floor(R() * (lmax - lmin + 1));
    for (let k = 0; k < L; k++) { if (inB(x, y, z) && world[idx(x, y, z)] === 2) world[idx(x, y, z)] = id; const d = Math.floor(R() * 6); if (d === 0) x++; else if (d === 1) x--; else if (d === 2) z++; else if (d === 3) z--; else if (d === 4) y++; else y--; }
  } };
  vein(8, 120, 2, 22, 5, 10); vein(9, 40, 2, 10, 3, 6); vein(10, 16, 1, 6, 2, 3);
  // a few surface shard outcrops so new players find one quickly
  for (let i = 0; i < 10; i++) { const a = R() * 6.28, d = 9 + R() * 14, x = Math.round(cx + Math.cos(a) * d), z = Math.round(cz + Math.sin(a) * d); if (!inB(x, 1, z)) continue; const h = H[x + z * SX]; world[idx(x, h, z)] = 8; if (R() < .5) world[idx(x, h + 1, z)] = 8; }
  // candle pillars (green / red), like a chart
  for (let i = 0; i < 26; i++) { const x = Math.floor(R() * SX), z = Math.floor(R() * SZ); if (Math.abs(x - cx) < 9 && Math.abs(z - cz) < 9) continue;
    const h = H[x + z * SX], t = R() < .55 ? 4 : 5, L = 2 + Math.floor(R() * 6); for (let y = h + 1; y <= Math.min(SY - 2, h + L); y++) world[idx(x, y, z)] = t; }
  // plaza: neon floor, chrome rim, lamps
  for (let z = cz - 5; z <= cz + 5; z++) for (let x = cx - 5; x <= cx + 5; x++) {
    const edge = Math.max(Math.abs(x - cx), Math.abs(z - cz)) === 5; world[idx(x, ph, z)] = edge ? 13 : ((x + z) & 1 ? 1 : 13);
    for (let y = ph + 1; y < SY; y++) world[idx(x, y, z)] = 0;
  }
  for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { world[idx(cx + dx, ph + 1, cz + dz)] = 13; world[idx(cx + dx, ph + 2, cz + dz)] = 12; }
  for (let y = ph + 1; y <= ph + 3; y++) world[idx(cx, y, cz - 4)] = 13;    // monument base
  return { x: cx + .5, y: ph + 1, z: cz + 1.5 };
}
// unbreakable / placeable rules shared with the server
export const PLACEABLE = new Set(PALETTE);
export const canBreak = id => id > 0 && B[id] && B[id].hard !== Infinity;
export const PLAZA_R = 5;   // spawn plaza is a protected build zone in multiplayer
export { SX, SY, SZ, CS, NCX, NCZ, B, PALETTE, world, idx, inB, get, rng };
