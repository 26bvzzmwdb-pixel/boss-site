// $BOSS Sandbox shared world module (used by the browser client AND the local Phase-2 test server).
// No rendering code here. Original block set; SOL shards are in-game items with no cash value.
// ---------------- world constants ----------------
const SX = 160, SZ = 160, SY = 48, CS = 16;          // world size, chunk size (v0.9: 2x the area of v0.8)
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
  { id: 16, name: "HEX FIELD", tex: [20, 21, 1], hard: .3, col: 0x78c8ff },
  { id: 17, name: "HOLO FROND", tex: [22, 22, 22], hard: .15, col: 0x3cffc8 },
  { id: 18, name: "BOSS GOLD VEIN", tex: [23, 23, 23], hard: 1.5, col: 0xffd24a, drop: 5 },
  { id: 19, name: "BOUNCE PAD", tex: [24, 25, 25], hard: .3, col: 0x14f195, cost: 2, toy: "bounce" },
  { id: 20, name: "BOOST STRIP", tex: [26, 25, 25], hard: .3, col: 0xffd24a, cost: 2, toy: "boost" },
  { id: 21, name: "SYNTH KEY", tex: [27, 28, 28], hard: .25, col: 0xff4fd8, cost: 1, toy: "key" },
  { id: 22, name: "FIREWORK CRATE", tex: [29, 29, 29], hard: .2, col: 0xff7a3a, cost: 3, toy: "fw" },
  { id: 23, name: "SECRET CACHE", tex: [30, 30, 30], hard: 1.2, col: 0xffd24a, drop: 25, secret: 1 },
  { id: 24, name: "MOON DUST", tex: [31, 32, 1], hard: .3, col: 0xc8c0e8 },
  { id: 25, name: "MOON CRYSTAL", tex: [33, 33, 33], hard: .3, col: 0xe0d0ff },
  { id: 26, name: "GLITCH TILE", tex: [34, 35, 1], hard: .3, col: 0xff2ad4 },
  { id: 27, name: "GLOW BARK", tex: [1, 1, 1], hard: .6, col: 0xb07aff },   // v0.9: tree trunks (drawn as organic trees, solid like any tile)
];
const PALETTE = [1, 13, 4, 5, 7, 2, 6, 12, 14, 17, 19, 20, 21, 22];
// Biomes: 0 NEON FLATS, 1 PUMP DUNES, 2 CRYSTAL GROVE, 3 FROST CHAIN
const BIOMES = ["NEON FLATS", "PUMP DUNES", "SIGNAL GROVE", "FROST CHAIN", "MOON BASIN", "GLITCH WASTES"];
const BIOME_TOP = [3, 14, 16, 15, 24, 26];

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

export const MOON = { x: 112, z: 74, r: 16 };
function biomeAt(x, z, sd) { if (Math.hypot(x - MOON.x, z - MOON.z) < MOON.r + (fbm(x / 6, z / 6, sd + 77) - .5) * 5) return 4; if (fbm(x / 40, z / 40, sd + 1213) < .35 && Math.hypot(x - SX / 2, z - SZ / 2) > 40) return 5; const a = fbm(x / 56, z / 56, sd + 501), b = fbm(x / 46, z / 46, sd + 733);
  if (a > .58) return 3; if (a > .44 && a < .57 && fbm(x / 36, z / 36, sd + 911) > .62) return 4; if (a < .43) return b > .5 ? 2 : 1; return b > .64 ? 2 : b < .36 ? 1 : 0; }
const biome = new Uint8Array(SX * SZ);
export const pools = [], caches = [], trees = [];
export function generate(sd) {
  world.fill(0);
  const R = rng(sd), H = new Int16Array(SX * SZ);
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    // v0.9: rolling hills (broad swells + soft ridges), dune swells, taller rounded peaks in the Frost Chain
    const n = fbm(x / 50, z / 50, sd), m = fbm(x / 17, z / 17, sd + 99), r = fbm(x / 31, z / 31, sd + 404), a = fbm(x / 56, z / 56, sd + 501);
    const frost = Math.max(0, Math.min(1, (a - .53) / .1)), dune = Math.max(0, Math.min(1, (.48 - a) / .1)), rr = 1 - Math.abs(r * 2 - 1);
    let h = 10 + n * 14 + (m - .5) * 4 * (1 - dune * .6) + dune * (Math.sin(x * .19 + z * .12) * 1.6 + Math.sin(x * .07 - z * .1) * 1.3);
    h += Math.pow(rr, 3) * 8 * (.45 + frost * 1.3) + frost * 3;
    H[x + z * SX] = Math.max(6, Math.min(SY - 12, Math.round(h)));
    biome[x + z * SX] = biomeAt(x, z, sd);
  }
  const cx = SX >> 1, cz = SZ >> 1, ph = Math.max(12, Math.min(17, H[cx + cz * SX]));
  // gentle valley around spawn so the plaza opens onto the world instead of sitting in a pit
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) { const d = Math.hypot(x - cx, z - cz); if (d > 30) continue; const t = Math.max(0, Math.min(1, (d - 7) / 23)), e = t * t * (3 - 2 * t);
    H[x + z * SX] = Math.round(ph + (H[x + z * SX] - ph) * e); }
  { const mh = H[MOON.x + MOON.z * SX]; const cr = [[0, 0, 5, 2], [-7, 4, 3.5, 2], [6, -6, 4, 2], [5, 7, 3, 1]];
    for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) { const d = Math.hypot(x - MOON.x, z - MOON.z); if (d > MOON.r + 4) continue; const t = Math.max(0, Math.min(1, (d - MOON.r + 4) / 6)); let h = Math.round(mh + (H[x + z * SX] - mh) * t);
      for (const [ox, oz, r, dp] of cr) { const q = Math.hypot(x - MOON.x - ox, z - MOON.z - oz); if (q < r) h -= Math.round(dp * (1 - (q / r) ** 2)); else if (q < r + 1.2) h += 1; } H[x + z * SX] = Math.max(6, h); } }
  for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const h = H[x + z * SX], bt = BIOME_TOP[biome[x + z * SX]];
    world[idx(x, 0, z)] = 11;
    for (let y = 1; y < h; y++) world[idx(x, y, z)] = 2;
    world[idx(x, h, z)] = bt; if (bt === 14) world[idx(x, h - 1, z)] = 14;
  }
  const far = (X, Z, r) => Math.abs(X - cx) + Math.abs(Z - cz) > r;
  // neon pools (fishing spots): shallow elliptical basins on flat ground, lit neon floor
  pools.length = 0;
  for (let tries = 0; tries < 500 && pools.length < 14; tries++) { const rx = 2.5 + R() * 2.2, rz = 2 + R() * 2.2; let x0 = 6 + R() * (SX - 12), z0 = 6 + R() * (SZ - 12); if (tries === 0) { x0 = MOON.x + 9; z0 = MOON.z + 1; }
    if (!far(x0, z0, 20) || pools.some(q => Math.hypot(q.x - x0, q.z - z0) < 18)) continue; let lo = 99, hi = -1;
    for (let z = Math.floor(z0 - rz); z <= z0 + rz; z++) for (let x = Math.floor(x0 - rx); x <= x0 + rx; x++) { const h = H[x + z * SX]; lo = Math.min(lo, h); hi = Math.max(hi, h); }
    if (hi - lo > 2) continue; const wl = lo;
    for (let z = Math.floor(z0 - rz - 1); z <= z0 + rz + 1; z++) for (let x = Math.floor(x0 - rx - 1); x <= x0 + rx + 1; x++) { const q = ((x + .5 - x0) / rx) ** 2 + ((z + .5 - z0) / rz) ** 2; if (!inB(x, 1, z)) continue;
      // v0.9 hotfix: stepped basin (deep middle, wading shelf, rim) so every level is a 1-tile step: you can always walk out
      if (q < 1) { for (let y = wl - 1; y < Math.min(SY, wl + 4); y++) world[idx(x, y, z)] = 0; world[idx(x, wl - 2, z)] = 1; const qq = (X, Z) => ((X + .5 - x0) / rx) ** 2 + ((Z + .5 - z0) / rz) ** 2, deep = q < .4 && qq(x + 1, z) < 1 && qq(x - 1, z) < 1 && qq(x, z + 1) < 1 && qq(x, z - 1) < 1;
        if (!deep) { world[idx(x, wl - 1, z)] = 1; H[x + z * SX] = wl - 1; } else H[x + z * SX] = wl - 2; }
      else if (q < 1.6) { const tp = world[idx(x, Math.min(SY - 1, H[x + z * SX]), z)]; for (let y = wl + 1; y < Math.min(SY, wl + 4); y++) world[idx(x, y, z)] = 0; world[idx(x, wl, z)] = [2, 3, 14, 15, 16, 24, 26].includes(tp) ? tp : 2; H[x + z * SX] = wl; } }
    pools.push({ x: x0, z: z0, rx, rz, y: wl + .55 }); }
  // v0.9 rock formations: half-buried boulders, arches and tall hoodoos in each zone's own stone (drawn smooth by terrain.js)
  const R3 = rng(sd ^ 0x0f0a11), STONE = [2, 14, 2, 15, 24, 26], nearPool = (x, z, m) => pools.some(q => ((x - q.x) / (q.rx + m)) ** 2 + ((z - q.z) / (q.rz + m)) ** 2 < 1);
  const blob = (x0, y0, z0, rx, ry, rz, id) => { for (let y = Math.floor(y0 - ry); y <= y0 + ry; y++) for (let z = Math.floor(z0 - rz); z <= z0 + rz; z++) for (let x = Math.floor(x0 - rx); x <= x0 + rx; x++) { if (!inB(x, y, z) || y < 1) continue; const q = ((x + .5 - x0) / rx) ** 2 + ((y + .5 - y0) / ry) ** 2 + ((z + .5 - z0) / rz) ** 2; if (q < 1) world[idx(x, y, z)] = id; } };
  const formations = [];
  for (let i = 0, made = 0; i < 400 && made < 46; i++) { const x = 4 + R3() * (SX - 8), z = 4 + R3() * (SZ - 8); if (!far(x, z, 16) || nearPool(x, z, 4) || formations.some(f => Math.hypot(f[0] - x, f[1] - z) < 7)) continue;
    const bm = biome[Math.floor(x) + Math.floor(z) * SX], h = H[Math.floor(x) + Math.floor(z) * SX], id = STONE[bm], kind = R3(); made++; formations.push([x, z]);
    if (kind < .55) { const r = 1.3 + R3() * 1.5; blob(x, h + r * .35, z, r * (1 + R3() * .5), r * .85, r * (1 + R3() * .4), id); if (R3() < .5) blob(x + r * .8, h + r * .2, z + (R3() - .5) * r, r * .6, r * .55, r * .6, id); }
    else if (kind < .85 && (bm === 1 || bm === 3 || bm === 5 || bm === 0)) { let y = h, r = 1.5 + R3() * .8; const tall = 5 + Math.floor(R3() * 7); while (y < h + tall && y < SY - 6) { blob(x + (R3() - .5) * .5, y + r * .6, z + (R3() - .5) * .5, r, r * .9, r, id); y += r * 1.1; r = Math.max(.9, r * (.8 + R3() * .15)); } blob(x, y + .8, z, r * 1.5, .9, r * 1.5, id); }
    else { const a = R3() * 3.14, span = 4 + R3() * 3, rad = 1 + R3() * .4; for (let t = 0; t <= 1.0001; t += .04) { const ang = t * Math.PI, px = x + Math.cos(a) * Math.cos(ang) * span, pz = z + Math.sin(a) * Math.cos(ang) * span, base = H[Math.max(0, Math.min(SX - 1, Math.round(px))) + Math.max(0, Math.min(SZ - 1, Math.round(pz))) * SX];
        blob(px, base + Math.sin(ang) * span * 1.1, pz, rad, rad, rad, id); } } }
  // worm tunnels
  for (let w = 0; w < 30; w++) {
    let x = R() * SX, y = 4 + R() * 10, z = R() * SZ, yaw = R() * 6.28, pit = 0;
    for (let s = 0; s < 52; s++) {
      x += Math.cos(yaw); z += Math.sin(yaw); y += pit; yaw += (R() - .5) * .6; pit = Math.max(-.4, Math.min(.4, pit + (R() - .5) * .3));
      y = Math.max(3, Math.min(19, y)); const r = 1.3 + R() * .8;
      for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy + dz * dz > r * r) continue; const X = Math.round(x + dx), Y = Math.round(y + dy), Z = Math.round(z + dz);
        if (inB(X, Y, Z) && Y > 1 && far(X, Z, 11)) world[idx(X, Y, Z)] = 0;
      }
    }
  }
  // big caverns
  for (let c = 0; c < 8; c++) { const x0 = 12 + R() * (SX - 24), z0 = 12 + R() * (SZ - 24), y0 = 5 + R() * 4, rx = 4 + R() * 3, ry = 2.5 + R() * 1.5, rz = 4 + R() * 3;
    if (!far(x0, z0, 18)) continue;
    for (let y = 2; y < y0 + ry + 1; y++) for (let z = Math.floor(z0 - rz); z <= z0 + rz; z++) for (let x = Math.floor(x0 - rx); x <= x0 + rx; x++) {
      const q = ((x - x0) / rx) ** 2 + ((y - y0) / ry) ** 2 + ((z - z0) / rz) ** 2; if (q < 1 && inB(x, y, z)) world[idx(x, y, z)] = 0; } }
  const vein = (id, n, ymin, ymax, lmin, lmax) => { for (let i = 0; i < n; i++) {
    let x = Math.floor(R() * SX), z = Math.floor(R() * SZ); let y = ymin + Math.floor(R() * (ymax - ymin)); const L = lmin + Math.floor(R() * (lmax - lmin + 1));
    for (let k = 0; k < L; k++) { if (inB(x, y, z) && world[idx(x, y, z)] === 2) world[idx(x, y, z)] = id; const d = Math.floor(R() * 6); if (d === 0) x++; else if (d === 1) x--; else if (d === 2) z++; else if (d === 3) z--; else if (d === 4) y++; else y--; }
  } };
  vein(8, 520, 2, 26, 5, 10); vein(18, 120, 3, 15, 3, 6); vein(9, 165, 2, 11, 3, 6); vein(10, 66, 1, 6, 2, 3);
  // surface shard outcrops near spawn
  for (let i = 0; i < 18; i++) { const a = R() * 6.28, d = 9 + R() * 18, x = Math.round(cx + Math.cos(a) * d), z = Math.round(cz + Math.sin(a) * d); if (!inB(x, 1, z)) continue; const h = H[x + z * SX]; if (!world[idx(x, h, z)]) continue; world[idx(x, h, z)] = 8; if (R() < .5) world[idx(x, h + 1, z)] = 8; }
  // biome features
  // v0.9: organic trees (trunk = GLOW BARK tiles so they're solid and minable; canopy drawn by terrain.js), fewer neon candle pillars
  trees.length = 0; const R4 = rng(sd ^ 0x7ee5), TREE_P = [.05, .025, .2, .06, 0, 0];
  for (let i = 0; i < 2600; i++) { const x = 3 + Math.floor(R4() * (SX - 6)), z = 3 + Math.floor(R4() * (SZ - 6)); if (!far(x, z, 12)) continue;
    let h = SY - 2; while (h > 1 && !world[idx(x, h, z)]) h--; const bm = biome[x + z * SX], roll = R4(); if (world[idx(x, h, z)] !== BIOME_TOP[bm] || world[idx(x, h + 1, z)]) continue;
    if (roll < TREE_P[bm] && !nearPool(x, z, 2.5) && !trees.some(t => Math.abs(t.x - x) + Math.abs(t.z - z) < 5)) { const th = (bm === 1 ? 4 : 3) + Math.floor(R4() * 3); if (h + th + 4 >= SY) continue; let clear = true; for (let y = h + 1; y <= h + th + 2; y++) if (world[idx(x, y, z)]) clear = false; if (!clear) continue;
      for (let y = h + 1; y <= h + th; y++) world[idx(x, y, z)] = 27; trees.push({ x, z, y: h, h: th, kind: bm, seed: 1 + Math.floor(R4() * 2e9) }); continue; }
    const r2 = R4();
    if (bm === 1 && r2 < .03) { const t = R4() < .55 ? 4 : 5, L = 2 + Math.floor(R4() * 6); for (let y = h + 1; y <= Math.min(SY - 2, h + L); y++) world[idx(x, y, z)] = t; }
    else if (bm === 4 && r2 < .1) { const L = 1 + Math.floor(R4() * 3); for (let y = h + 1; y <= Math.min(SY - 2, h + L); y++) world[idx(x, y, z)] = 25; }
    else if (bm === 5 && r2 < .05) { const y0 = h + 2 + Math.floor(R4() * 3); if (y0 < SY - 2) { world[idx(x, y0, z)] = 7; if (R4() < .4 && y0 + 1 < SY - 1) world[idx(x, y0 + 1, z)] = 26; } }
    else if (bm === 0 && r2 < .008) { const t = R4() < .55 ? 4 : 5, L = 2 + Math.floor(R4() * 4); for (let y = h + 1; y <= Math.min(SY - 2, h + L); y++) world[idx(x, y, z)] = t; }
  }
  // plaza: neon floor, chrome rim, lamps
  for (let z = cz - 5; z <= cz + 5; z++) for (let x = cx - 5; x <= cx + 5; x++) {
    const edge = Math.max(Math.abs(x - cx), Math.abs(z - cz)) === 5; world[idx(x, ph, z)] = edge ? 13 : ((x + z) & 1 ? 1 : 13);
    for (let y = ph + 1; y < SY; y++) world[idx(x, y, z)] = 0;
  }
  for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { world[idx(cx + dx, ph + 1, cz + dz)] = 13; world[idx(cx + dx, ph + 2, cz + dz)] = 12; }
  for (let y = ph + 1; y <= ph + 3; y++) world[idx(cx, y, cz - 4)] = 13;    // monument base
  // secret caches: 5 hidden gold boxes on cave floors (own RNG so the rest of the world is unchanged)
  caches.length = 0; const R2 = rng(sd ^ 0x5ec2e7);
  for (let t = 0; t < 6000 && caches.length < 5; t++) { const x = 2 + Math.floor(R2() * (SX - 4)), z = 2 + Math.floor(R2() * (SZ - 4)), y = 3 + Math.floor(R2() * 12);
    if (!far(x, z, 18) || H[x + z * SX] < y + 3 || world[idx(x, y, z)] || world[idx(x, y + 1, z)] || world[idx(x, y - 1, z)] !== 2) continue;
    if (caches.some(c => Math.abs(c[0] - x) + Math.abs(c[2] - z) < 18)) continue; world[idx(x, y - 1, z)] = 23; caches.push([x, y - 1, z]); }
  return { x: cx + .5, y: ph + 1, z: cz + 1.5 };
}
export function biomeName(x, z) { x = Math.floor(x); z = Math.floor(z); return inB(x, 1, z) ? BIOMES[biome[x + z * SX]] : ""; }
// unbreakable / placeable rules shared with the server
export const PLACEABLE = new Set(PALETTE);
export const canBreak = id => id > 0 && B[id] && B[id].hard !== Infinity;
export const PLAZA_R = 5;   // spawn plaza is a protected build zone in multiplayer
export { SX, SY, SZ, CS, NCX, NCZ, B, PALETTE, world, idx, inB, get, rng };
