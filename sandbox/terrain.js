// $BOSS Sandbox v0.9: natural terrain. The world is still a grid of tiles underneath (mining, building, collision and saves are
// unchanged), but every natural tile (rock, turf, dunes, frost, hex moss, moon dust, glitch ground, veins, bedrock) is drawn as one
// smooth organic surface: constrained elastic surface nets (each vertex relaxes toward its neighbours but stays inside its cell,
// so the surface never drifts more than half a tile from the real tiles). Chunks are meshed with a 4-tile apron so seams match.
// Player-built pieces, lamps, toys and plaza tiles stay crisp (sandbox.js cube mesher).
// LOD: near chunks use the full mesh; far chunks use a half-resolution mesh (2x2x2 tiles per cell) with a small overlap to hide seams.
// Props: organic trees (curved tapered trunks, lumpy canopies, glowing fruit) with real trunk tiles for collision/mining.
export const NAT_IDS = [2, 3, 8, 9, 10, 11, 14, 15, 16, 18, 24, 26];
export function createTerrain(THREE, W) {
  const { world, SX, SY, SZ, CS, getTop } = W, lite = !!W.lite;
  const NAT = new Uint8Array(256); for (const i of NAT_IDS) NAT[i] = 1;
  const col = h => new THREE.Color(h);
  // [top colour, side colour]
  const MC = {}; const setM = (ids, top, side) => { for (const i of ids) MC[i] = [col(top), col(side)]; };
  setM([2], 0x40335f, 0x2c2449); setM([3], 0x1f9c86, 0x3a2f5a); setM([8, 9, 10, 18], 0x3c3060, 0x2e2552); setM([11], 0x6a5420, 0x3e3014);
  setM([14], 0xe07aa8, 0xa04d80); setM([15], 0xb4d4ee, 0x6a8fc2); setM([16], 0x2a86b8, 0x35305a); setM([24], 0xb0a8d0, 0x716a96); setM([26], 0x4a1048, 0x2c0a34);
  const DEF = [col(0x40335f), col(0x2c2449)];
  // ---------------- surface nets ----------------
  const PAD = 4, ITER = 3;
  // occupancy of a padded box: 0 air, 1 solid (cube piece), 2 natural solid. Outside the world on x/z = air, y<0 = natural bedrock
  function occBox(x0, z0, nx, ny, nz, step) { const o = new Uint8Array(nx * ny * nz), id = new Uint8Array(nx * ny * nz);
    for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) { const n = i + nx * (k + nz * j); const X = x0 + i * step, Y = (j - 1) * step, Z = z0 + k * step;
      if (step === 1) { if (Y < 0) { o[n] = 2; id[n] = 11; continue; } if (Y >= SY || X < 0 || Z < 0 || X >= SX || Z >= SZ) continue; const v = world[X + SX * (Z + SZ * Y)]; if (v) { o[n] = NAT[v] ? 2 : 1; id[n] = v; } }
      else { if (Y < 0) { o[n] = 2; id[n] = 11; continue; } let s = 0, nat = 0, best = 0; for (let dy = 0; dy < step; dy++) for (let dz = 0; dz < step; dz++) for (let dx = 0; dx < step; dx++) { const XX = X + dx, YY = Y + dy, ZZ = Z + dz; if (YY >= SY || XX < 0 || ZZ < 0 || XX >= SX || ZZ >= SZ) continue; const v = world[XX + SX * (ZZ + SZ * YY)]; if (v) { s++; if (NAT[v]) { nat++; if (!best || dy === step - 1) best = v; } } }
        if (s * 2 >= step * step * step) { o[n] = nat * 2 >= s ? 2 : 1; id[n] = best || 2; } } }
    return { o, id }; }
  // build one chunk's smooth mesh. lod 0 = full res, 1 = half res
  function buildChunk(cx, cz, lod) { const st = lod ? 2 : 1, cs = CS / st, pad = lod ? 2 : PAD, x0 = cx * CS - pad * st, z0 = cz * CS - pad * st;
    const nx = cs + pad * 2, nz = nx; let mt = 0; for (let z = Math.max(0, z0); z < Math.min(SZ, z0 + nz * st); z++) for (let x = Math.max(0, x0); x < Math.min(SX, x0 + nx * st); x++) mt = Math.max(mt, getTop(x, z)); const ny = Math.min(Math.ceil(SY / st) + 2, Math.floor(mt / st) + 4); const { o, id } = occBox(x0, z0, nx, ny, nz, st);
    const S = (i, j, k) => o[i + nx * (k + nz * j)];
    // vertices: one per mixed cell (cells i..nx-2)
    const cnx = nx - 1, cny = ny - 1, cnz = nz - 1, vid = new Int32Array(cnx * cny * cnz).fill(-1); const P = [], cellOf = [];
    for (let j = 0; j < cny; j++) for (let k = 0; k < cnz; k++) for (let i = 0; i < cnx; i++) {
      let m = 0, any = 0; for (let c = 0; c < 8; c++) { const s = S(i + (c & 1), j + (c >> 2 & 1), k + (c >> 1 & 1)) ? 1 : 0; m |= s << c; } if (m === 0 || m === 255) continue;
      // average of edge crossings (binary field -> midpoints)
      let ax = 0, ay = 0, az = 0, n = 0;
      for (const [a, b] of EDGES) { const sa = m >> a & 1, sb = m >> b & 1; if (sa === sb) continue; ax += ((a & 1) + (b & 1)) * .5; ay += ((a >> 2 & 1) + (b >> 2 & 1)) * .5; az += ((a >> 1 & 1) + (b >> 1 & 1)) * .5; n++; }
      vid[i + cnx * (k + cnz * j)] = P.length / 3; P.push(i + ax / n, j + ay / n, k + az / n); cellOf.push(i, j, k); any = 1; }
    const nv = P.length / 3; if (!nv) return null;
    // quads on every sign-changing lattice edge. out = owned by this chunk and the solid side is natural
    const quads = [], outQ = [], lo = pad, hi = pad + cs, olo = lod ? pad - 1 : pad, ohi = lod ? pad + cs + 1 : pad + cs;
    const V = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= cnx || j >= cny || k >= cnz) ? -1 : vid[i + cnx * (k + cnz * j)];
    for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) { const a = S(i, j, k);
      for (let ax = 0; ax < 3; ax++) { const i2 = i + (ax === 0), j2 = j + (ax === 1), k2 = k + (ax === 2); if (i2 >= nx || j2 >= ny || k2 >= nz) continue; const b = S(i2, j2, k2); if (!a === !b) continue;
        let q; if (ax === 0) q = [V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k)]; else if (ax === 1) q = [V(i - 1, j, k - 1), V(i - 1, j, k), V(i, j, k), V(i, j, k - 1)]; else q = [V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k)];
        if (q[0] < 0 || q[1] < 0 || q[2] < 0 || q[3] < 0) continue; if (!a) q.reverse(); quads.push(q);
        const own = i >= olo && i < ohi && k >= olo && k < ohi, nat = (a ? a : b) === 2; if (own && nat) outQ.push(quads.length - 1); } }
    // constrained elastic relaxation
    // neighbours = vertices in the 6 face-adjacent cells (fast, typed arrays)
    const nbA = new Int32Array(nv * 6).fill(-1); for (let v = 0; v < nv; v++) { const ci = cellOf[v * 3], cj = cellOf[v * 3 + 1], ck = cellOf[v * 3 + 2]; nbA[v * 6] = V(ci - 1, cj, ck); nbA[v * 6 + 1] = V(ci + 1, cj, ck); nbA[v * 6 + 2] = V(ci, cj - 1, ck); nbA[v * 6 + 3] = V(ci, cj + 1, ck); nbA[v * 6 + 4] = V(ci, cj, ck - 1); nbA[v * 6 + 5] = V(ci, cj, ck + 1); }
    let cur = Float32Array.from(P), nxt = new Float32Array(cur.length);
    for (let it = 0; it < ITER; it++) { for (let v = 0; v < nv; v++) { let sx = 0, sy = 0, sz = 0, n = 0; for (let t = 0; t < 6; t++) { const u = nbA[v * 6 + t]; if (u < 0) continue; sx += cur[u * 3]; sy += cur[u * 3 + 1]; sz += cur[u * 3 + 2]; n++; }
        if (!n) { nxt[v * 3] = cur[v * 3]; nxt[v * 3 + 1] = cur[v * 3 + 1]; nxt[v * 3 + 2] = cur[v * 3 + 2]; continue; } const ci = cellOf[v * 3], cj = cellOf[v * 3 + 1], ck = cellOf[v * 3 + 2], w = .6;
        nxt[v * 3] = Math.min(ci + .98, Math.max(ci + .02, cur[v * 3] * (1 - w) + sx / n * w)); nxt[v * 3 + 1] = Math.min(cj + .98, Math.max(cj + .02, cur[v * 3 + 1] * (1 - w) + sy / n * w)); nxt[v * 3 + 2] = Math.min(ck + .98, Math.max(ck + .02, cur[v * 3 + 2] * (1 - w) + sz / n * w)); }
      const t = cur; cur = nxt; nxt = t; }
    // smooth normals from every quad in the apron (so they match across chunk seams)
    const N = new Float32Array(nv * 3); const e1 = [0, 0, 0], e2 = [0, 0, 0];
    for (const q of quads) for (const [a, b, c] of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]) { for (let d = 0; d < 3; d++) { e1[d] = cur[b * 3 + d] - cur[a * 3 + d]; e2[d] = cur[c * 3 + d] - cur[a * 3 + d]; }
      const fx = e1[1] * e2[2] - e1[2] * e2[1], fy = e1[2] * e2[0] - e1[0] * e2[2], fz = e1[0] * e2[1] - e1[1] * e2[0]; for (const v of [a, b, c]) { N[v * 3] += fx; N[v * 3 + 1] += fy; N[v * 3 + 2] += fz; } }
    // emit owned quads with per-vertex top/side colours, AO, material id
    const remap = new Int32Array(nv).fill(-1), pos = [], nor = [], cT = [], cSd = [], ao = [], mid = [], ind = []; const tc = new THREE.Color(), sc = new THREE.Color();
    const addV = v => { if (remap[v] >= 0) return remap[v]; const r = pos.length / 3; remap[v] = r; const px = cur[v * 3], py = cur[v * 3 + 1], pz = cur[v * 3 + 2];
      // world position: lattice point i = centre of tile (x0 + i*st) -> + .5*st
      pos.push(x0 + (px + .5) * st, (py - 1 + .5) * st, z0 + (pz + .5) * st); let l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1; nor.push(N[v * 3] / l, N[v * 3 + 1] / l, N[v * 3 + 2] / l);
      const ci = cellOf[v * 3], cj = cellOf[v * 3 + 1], ck = cellOf[v * 3 + 2]; let wsum = 0, best = 0, bw = 0; tc.setRGB(0, 0, 0); sc.setRGB(0, 0, 0);
      for (let c = 0; c < 8; c++) { const ii = ci + (c & 1), jj = cj + (c >> 2 & 1), kk = ck + (c >> 1 & 1); const n = ii + nx * (kk + nz * jj); if (o[n] !== 2) continue; const surf = jj + 1 < ny && !o[n + nx * nz]; const w = surf ? 3 : 1; const m = MC[id[n]] || DEF;
        tc.r += m[0].r * w; tc.g += m[0].g * w; tc.b += m[0].b * w; sc.r += m[1].r * w; sc.g += m[1].g * w; sc.b += m[1].b * w; wsum += w; if (w > bw || (w === bw && id[n] !== 2)) { bw = w; best = id[n]; } }
      if (!wsum) { wsum = 1; tc.copy(DEF[0]); sc.copy(DEF[1]); best = 2; }
      cT.push(tc.r / wsum, tc.g / wsum, tc.b / wsum); cSd.push(sc.r / wsum, sc.g / wsum, sc.b / wsum); mid.push(best);
      // AO: occupancy of the 4x4x4 tiles around the vertex (flat ground = .5)
      let occ = 0, tot = 0; const bi = Math.floor(px) - 1, bj = Math.floor(py) - 1, bk = Math.floor(pz) - 1;
      for (let jj = bj; jj < bj + 4; jj++) for (let kk = bk; kk < bk + 4; kk++) for (let ii = bi; ii < bi + 4; ii++) { if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue; tot++; if (o[ii + nx * (kk + nz * jj)]) occ++; }
      let a = 1 - Math.max(0, occ / (tot || 1) - .5) * 1.9; a = Math.max(.32, Math.min(1.08, a + (occ / (tot || 1) < .5 ? (.5 - occ / tot) * .3 : 0)));
      const wx = Math.floor(pos[r * 3]), wz = Math.floor(pos[r * 3 + 2]), wy = pos[r * 3 + 1]; if (wx >= 0 && wz >= 0 && wx < SX && wz < SZ) { const tt = getTop(wx, wz); if (wy < tt - .5) a *= Math.max(.42, .9 - (tt - wy) * .055); }
      ao.push(a); return r; };
    for (const qi of outQ) { const q = quads[qi]; const a = addV(q[0]), b = addV(q[1]), c = addV(q[2]), d = addV(q[3]);
      // split along the shorter diagonal
      const dAC = (pos[a * 3] - pos[c * 3]) ** 2 + (pos[a * 3 + 1] - pos[c * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[c * 3 + 2]) ** 2, dBD = (pos[b * 3] - pos[d * 3]) ** 2 + (pos[b * 3 + 1] - pos[d * 3 + 1]) ** 2 + (pos[b * 3 + 2] - pos[d * 3 + 2]) ** 2;
      if (dAC <= dBD) ind.push(a, b, c, a, c, d); else ind.push(a, b, d, b, c, d); }
    if (!ind.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("aTop", new THREE.Float32BufferAttribute(cT, 3)); g.setAttribute("aSide", new THREE.Float32BufferAttribute(cSd, 3)); g.setAttribute("aAo", new THREE.Float32BufferAttribute(ao, 1)); g.setAttribute("aM", new THREE.Float32BufferAttribute(mid, 1));
    g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(ind, 1) : new THREE.Uint16BufferAttribute(ind, 1)); g.computeBoundingSphere(); g.computeBoundingBox(); return g; }
  // cell corner order: bit0 = +x, bit1 = +z, bit2 = +y
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  // ---------------- terrain shader ----------------
  const U = { uSun: { value: new THREE.Vector3(.3, .8, .4) }, uSunC: { value: new THREE.Color(1, 1, 1) }, uSky: { value: new THREE.Color(.6, .6, .8) }, uGnd: { value: new THREE.Color(.15, .1, .2) },
    uFogC: { value: new THREE.Color() }, uFogN: { value: 20 }, uFogF: { value: 60 }, uLampP: { value: new THREE.Vector3() }, uLamp: { value: 0 }, uNight: { value: 0 }, uT: { value: 0 } };
  const NOISE = `float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1., 0.)), f.x), mix(h2(i + vec2(0., 1.)), h2(i + vec2(1., 1.)), f.x), f.y); }
    float tri(vec3 w, vec3 b, float s){
    #ifdef LITE
      return b.y >= max(b.x, b.z) ? vn(w.xz * s) : b.x > b.z ? vn(w.zy * s) : vn(w.xy * s);
    #else
      return vn(w.zy * s) * b.x + vn(w.xz * s) * b.y + vn(w.xy * s) * b.z;
    #endif
    }`;
  const mat = new THREE.ShaderMaterial({ uniforms: U, defines: lite ? { LITE: 1 } : {},
    vertexShader: `attribute vec3 aTop; attribute vec3 aSide; attribute float aAo; attribute float aM; varying vec3 vT; varying vec3 vS; varying float vA; flat varying float vM; varying vec3 vN; varying vec3 vW; varying float vD;
      void main(){ vT = aTop; vS = aSide; vA = aAo; vM = aM; vN = normal; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uSun, uSunC, uSky, uGnd, uFogC, uLampP; uniform float uFogN, uFogF, uLamp, uNight, uT; varying vec3 vT; varying vec3 vS; varying float vA; flat varying float vM; varying vec3 vN; varying vec3 vW; varying float vD;
      ${NOISE}
      void main(){ vec3 N = normalize(vN); vec3 b = abs(N); b /= (b.x + b.y + b.z);
        float n1 = tri(vW, b, .55), n2 = tri(vW, b, 2.1), n3 = tri(vW, b, 7.);
        float topK = smoothstep(.5, .82, N.y + (n1 - .5) * .25);
        vec3 base = mix(vS, vT, topK) * (.78 + .32 * n1 + .14 * n2 + .08 * n3);
        float d = dot(N, uSun); float sunL = max(d, 0.) * .85 + max(d + .35, 0.) * .15;
        vec3 hemi = mix(uGnd, uSky, N.y * .5 + .5);
        vec3 c = base * (hemi + uSunC * sunL) * vA;
        vec3 L = uLampP - vW; float ld = length(L); c += base * vec3(.85, .92, 1.) * uLamp * (max(dot(N, L / ld), 0.) * .8 + .2) / (1. + ld * ld * .045) * vA;
        // neon accents per material (stronger at night)
        float id = floor(vM + .5), gk = .35 + uNight * .9; vec3 em = vec3(0.);
        if (id == 3.) { vec2 g = abs(fract(vW.xz * .5) - .5); float ln = smoothstep(.47, .5, max(g.x, g.y)); em = vec3(.1, .9, .8) * ln * topK * .55 * gk * step(.35, n1); }
        else if (id == 16.) { vec2 p = vW.xz * .7; vec2 r = vec2(1., 1.732); vec2 a = mod(p, r) - r * .5, bb = mod(p - r * .5, r) - r * .5; vec2 gv = dot(a, a) < dot(bb, bb) ? a : bb; float hx = max(abs(gv.x), abs(gv.x) * .5 + abs(gv.y) * .866); em = vec3(.15, .75, 1.) * smoothstep(.45, .49, hx) * topK * .6 * gk; }
        else if (id == 14.) { float s = sin(vW.x * 1.3 + vW.z * .6 + n1 * 5.); em = vec3(1., .35, .75) * smoothstep(.93, 1., s) * .5 * gk * (.4 + topK); }
        else if (id == 15.) { float sp = step(.985, h2(floor(vW.xz * 6.) + floor(uT * 1.5) * .17)); em = vec3(.8, .95, 1.) * sp * 1.2 + vec3(.3, .6, 1.) * pow(1. - abs(N.y), 3.) * .15 * gk; }
        else if (id == 24.) { float cr = vn(vW.xz * .9); em = vec3(.6, .5, 1.) * smoothstep(.72, .76, cr) * (1. - smoothstep(.76, .8, cr)) * .5 * gk; }
        else if (id == 26.) { float st = step(.82, fract(vW.y * 3. + floor(uT * 4.) * .37 + h2(floor(vW.xz)) * 3.)); em = mix(vec3(1., .15, .85), vec3(.15, .85, 1.), step(.5, h2(floor(vW.xz * 2.)))) * st * .45 * gk; }
        else if (id == 2. || id == 11.) { float v = abs(vn(vW.xz * .45 + vW.y * .3) - .5); em = (id == 11. ? vec3(1., .8, .2) : vec3(.55, .25, 1.)) * smoothstep(.035, 0., v) * .35 * gk * (1. - topK * .6); }
        else if (id >= 8. && id <= 18.) { vec3 oc = id == 9. ? vec3(.1, 1., .6) : id == 10. ? vec3(1., .95, .7) : id == 18. ? vec3(1., .8, .25) : vec3(.6, .3, 1.); em = oc * step(.9, n3) * .8 + oc * .12; }
        c += em;
        float f = smoothstep(uFogN, uFogF, vD); gl_FragColor = vec4(mix(c, uFogC, f), 1.);
        #include <colorspace_fragment>
      }` });
  // ---------------- props: trees ----------------
  const PU = { uT: { value: 0 }, uSun: U.uSun, uSunC: U.uSunC, uSky: U.uSky, uGnd: U.uGnd, uFogC: U.uFogC, uFogN: U.uFogN, uFogF: U.uFogF, uNight: U.uNight, uLampP: U.uLampP, uLamp: U.uLamp };
  const pmat = new THREE.ShaderMaterial({ uniforms: PU,
    vertexShader: `attribute vec3 color; attribute float aE; attribute float aW; uniform float uT; varying vec3 vC; varying float vE; varying vec3 vN; varying vec3 vW; varying float vD;
      void main(){ vC = color; vE = aE; vN = normal; vec4 w = modelMatrix * vec4(position, 1.); float s = sin(uT * 1.3 + w.x * .35 + w.z * .27) + .5 * sin(uT * 2.1 + w.z * .5); w.xz += vec2(s, s * .6) * .07 * aW; vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uSun, uSunC, uSky, uGnd, uFogC, uLampP; uniform float uFogN, uFogF, uNight, uLamp; varying vec3 vC; varying float vE; varying vec3 vN; varying vec3 vW; varying float vD;
      void main(){ vec3 N = normalize(vN); float d = dot(N, uSun); float t = smoothstep(-.1, .25, d) * .65 + smoothstep(.45, .7, d) * .35;   // soft toon bands
        vec3 c = vC * (mix(uGnd, uSky, N.y * .5 + .5) + uSunC * t * .9); vec3 L = uLampP - vW; float ld = length(L); c += vC * uLamp * .7 / (1. + ld * ld * .05);
        c = mix(c, vC * (1.3 + uNight * .8), vE); float f = smoothstep(uFogN, uFogF, vD); gl_FragColor = vec4(mix(c, uFogC, f * (1. - vE * .5)), 1.);
        #include <colorspace_fragment>
      }` });
  // geometry helpers
  function pushGeo(out, g, m4, c0, c1, e, w, jit, seed) { const p = g.attributes.position, n = g.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(m4), v = new THREE.Vector3(), nn = new THREE.Vector3(); const ca = new THREE.Color(c0), cb = new THREE.Color(c1); let ymin = 1e9, ymax = -1e9;
    for (let i = 0; i < p.count; i++) { ymin = Math.min(ymin, p.getY(i)); ymax = Math.max(ymax, p.getY(i)); }
    const ix = g.index ? g.index.array : null, cnt = ix ? ix.length : p.count, base = out.p.length / 3;
    for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); if (jit) { const k = 1 + (Math.sin(v.x * 7.1 + seed) * Math.sin(v.y * 6.3 + seed * 2.) * Math.sin(v.z * 5.7 + seed * 3.)) * jit; v.multiplyScalar(k); }
      const h = (p.getY(i) - ymin) / Math.max(1e-6, ymax - ymin); v.applyMatrix4(m4); nn.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(nm).normalize(); out.p.push(v.x, v.y, v.z); out.n.push(nn.x, nn.y, nn.z);
      out.c.push(ca.r + (cb.r - ca.r) * h, ca.g + (cb.g - ca.g) * h, ca.b + (cb.b - ca.b) * h); out.e.push(e); out.w.push(w * h); }
    for (let i = 0; i < cnt; i++) out.i.push(base + (ix ? ix[i] : i)); }
  const G = { blob: new THREE.IcosahedronGeometry(1, 1), fruit: new THREE.IcosahedronGeometry(1, 0), cone: new THREE.ConeGeometry(1, 1, 7, 1).translate(0, .5, 0), leaf: new THREE.SphereGeometry(1, 5, 3) };
  const KIND = { 0: { c0: 0x3a1f4a, c1: 0x5a2f6a, can: [0xb02a8a, 0xff7ad0], fr: 0xffd24a }, 2: { c0: 0x203048, c1: 0x2a4a60, can: [0x0f7a6a, 0x3cffc8], fr: 0x9df7ff }, 3: { c0: 0x2a3a5a, c1: 0x4a6a8a, can: [0x5a9ad0, 0xe8f8ff], fr: 0xa8e8ff }, 1: { c0: 0x5a3020, c1: 0x8a5030, can: [0x1a8a5a, 0x5affb0], fr: 0xff9a3a } };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), tv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function tree(out, t) { const K = KIND[t.kind] || KIND[0]; let s = t.seed; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const bx = t.x + .5, bz = t.z + .5, by = t.y + 1, H = t.h + .6, lean = (R() - .5) * .5, la = R() * 6.28, segs = 5; const pts = [];
    for (let i = 0; i <= segs; i++) { const u = i / segs, bend = Math.sin(u * Math.PI * .9) * lean * .5 + u * u * lean * .35; pts.push(new THREE.Vector3(bx + Math.cos(la) * bend, by - .35 + u * H, bz + Math.sin(la) * bend)); }
    const curve = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(curve, segs, 1, 6, false); const tp = tg.attributes.position;
    // taper: shrink each ring toward the curve
    for (let i = 0; i < tp.count; i++) { const ring = Math.floor(i / 7), u = ring / segs, c = curve.getPointAt(Math.min(1, u)); const r = (t.kind === 1 ? .22 : .34) * (1 - u * .55) + (u < .12 ? (.12 - u) * 1.6 : 0); tp.setXYZ(i, c.x + (tp.getX(i) - c.x) * r, c.y + (tp.getY(i) - c.y) * r, c.z + (tp.getZ(i) - c.z) * r); }
    tg.computeVertexNormals(); pushGeo(out, tg, m4.identity(), K.c0, K.c1, 0, .15, 0, 0); tg.dispose(); const top = pts[segs];
    if (t.kind === 3) { // crystal pine: stacked cones
      for (let i = 0; i < 4; i++) { const r = 1.5 - i * .3, y = top.y - 1.6 + i * .85; m4.compose(sv.set(top.x, y, top.z), q.setFromAxisAngle(up, R() * 6), tv.set(r, 1.3, r)); pushGeo(out, G.cone, m4, K.can[0], K.can[1], 0, .6, .04, R() * 9); }
      m4.compose(sv.set(top.x, top.y + 1.85, top.z), q.identity(), tv.setScalar(.16)); pushGeo(out, G.fruit, m4, K.fr, 0xffffff, 1, .6, 0, 0); return; }
    if (t.kind === 1) { // dune palm: drooping fronds
      const n = 6 + Math.floor(R() * 3); for (let i = 0; i < n; i++) { const a = i / n * 6.28 + R() * .4, L = 1.3 + R() * .5; for (let k = 0; k < 3; k++) { const u = (k + 1) / 3; m4.compose(sv.set(top.x + Math.cos(a) * L * u, top.y + .15 - u * u * .9, top.z + Math.sin(a) * L * u), q.setFromAxisAngle(up, -a), tv.set(.45, .07, .2)); pushGeo(out, G.leaf, m4, K.can[0], K.can[1], 0, 1, 0, 0); } }
      for (let i = 0; i < 3; i++) { m4.compose(sv.set(top.x + (R() - .5) * .4, top.y - .15, top.z + (R() - .5) * .4), q.identity(), tv.setScalar(.14)); pushGeo(out, G.fruit, m4, K.fr, 0xffffff, 1, .3, 0, 0); } return; }
    // lumpy canopy blobs + glowing fruit
    const nb = 3 + Math.floor(R() * 3), cr = t.kind === 2 ? 1.35 : 1.2;
    for (let i = 0; i < nb; i++) { const a = R() * 6.28, d = i ? .55 + R() * .5 : 0, r = cr * (i ? .65 + R() * .35 : 1); m4.compose(sv.set(top.x + Math.cos(a) * d, top.y + .3 + (i ? (R() - .3) * .7 : .25), top.z + Math.sin(a) * d), q.setFromAxisAngle(up, R() * 6), tv.set(r, r * (t.kind === 2 ? 1.15 : .85), r)); pushGeo(out, G.blob, m4, K.can[0], K.can[1], 0, 1, .12, R() * 9); }
    const nf = lite ? 3 : 5; for (let i = 0; i < nf; i++) { const a = R() * 6.28, el = (R() - .3) * 1.2; m4.compose(sv.set(top.x + Math.cos(a) * cr * .95, top.y + .4 + el * .6, top.z + Math.sin(a) * cr * .95), q.identity(), tv.setScalar(.11 + R() * .05)); pushGeo(out, G.fruit, m4, K.fr, 0xffffff, 1, .9, 0, 0); } }
  function buildProps(list) { if (!list.length) return null; const out = { p: [], n: [], c: [], e: [], w: [], i: [] }; for (const t of list) tree(out, t);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(out.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(out.c, 3)); g.setAttribute("aE", new THREE.Float32BufferAttribute(out.e, 1)); g.setAttribute("aW", new THREE.Float32BufferAttribute(out.w, 1));
    g.setIndex(out.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(out.i, 1) : new THREE.Uint16BufferAttribute(out.i, 1)); g.computeBoundingSphere(); return g; }
  // visible ground height under a point (ray down through the near mesh), so feet sit on the smooth surface, not the tile edge
  const rc = new THREE.Raycaster(); rc.firstHitOnly = true; const rdir = new THREE.Vector3(0, -1, 0), rorg = new THREE.Vector3();
  function groundAt(meshes, x, y, z, up = .75, down = 1.3) { rorg.set(x, y + up, z); rc.set(rorg, rdir); rc.near = 0; rc.far = up + down; let best = null; for (const m of meshes) { if (!m || !m.visible) continue; const h = rc.intersectObject(m, false)[0]; if (h && (best === null || h.point.y > best)) best = h.point.y; } return best; }
  function tick(o) { U.uSun.value.copy(o.sun); U.uSunC.value.copy(o.sunC); U.uSky.value.copy(o.sky); U.uGnd.value.copy(o.gnd); U.uFogC.value.copy(o.fog.color); U.uFogN.value = o.fog.near; U.uFogF.value = o.fog.far; U.uLampP.value.copy(o.lampP); U.uLamp.value = o.lamp; U.uNight.value = o.night; U.uT.value = o.t; PU.uT.value = o.t; }
  return { NAT, buildChunk, buildProps, mat, pmat, tick, groundAt, U };
}
