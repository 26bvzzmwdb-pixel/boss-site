// $BOSS Sandbox v0.9: faceted crystal gems. Every ore tile grows a cluster of 3D crystals out of each open face.
// Each gem type has its own cut: SOL Shard = hex quartz points, SOL Prism = triangular blades, SOL Core = a glowing
// faceted orb in a crown of points, BOSS Gold = chunky double-point nuggets, Moon Crystal = needle sprays.
// Crystals share one shader: flat facets, inner glow that brightens toward the tip, fresnel rim, sharp sun glints and
// per-crystal twinkle. A Points layer adds a soft additive halo per cluster (bloom-like) and twinkling star sparkles.
export function createGems(THREE, opt = {}) {
  const lite = !!opt.lite;
  const SPEC = {
    8: { cut: "quartz", n: [3, 5], len: [.32, .7], rad: [.07, .11], c0: 0x5a22e8, c1: 0x14f195, halo: 0x9945ff },
    9: { cut: "blade", n: [4, 6], len: [.4, .85], rad: [.06, .1], c0: 0x0ea870, c1: 0x7dfcff, halo: 0x14f195 },
    10: { cut: "core", n: [4, 5], len: [.25, .5], rad: [.06, .09], c0: 0xb58cff, c1: 0xfff6d0, halo: 0xfff2b0 },
    18: { cut: "nugget", n: [3, 4], len: [.22, .4], rad: [.1, .15], c0: 0xc07a10, c1: 0xfff0a0, halo: 0xffc23a },
    25: { cut: "needle", n: [6, 9], len: [.3, .8], rad: [.025, .045], c0: 0x8a6ad8, c1: 0xffffff, halo: 0xd8c8ff },
  };
  const isGem = id => !!SPEC[id];
  // ---- crystal cuts: arrays of triangles in local space (axis +Y, base at y=0, radius 1, height 1) + per-vertex height 0..1
  function ring(n, r, y, rot = 0) { const p = []; for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; p.push([Math.cos(a) * r, y, Math.sin(a) * r]); } return p; }
  function prism(n, tipH, bodyH, skew = 0, rTop = 1) { const T = [], b = ring(n, 1, 0), t = ring(n, rTop, bodyH), tip = [skew, bodyH + tipH, skew * .5];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; T.push([b[i], t[j], b[j]], [b[i], t[i], t[j]]); T.push([t[i], tip, t[j]]); } return T; }
  function bipyramid(n, hb, ht) { const T = [], m = ring(n, 1, hb), lo = [0, 0, 0], hi = [0, hb + ht, 0]; for (let i = 0; i < n; i++) { const j = (i + 1) % n; T.push([m[i], hi, m[j]], [m[j], lo, m[i]]); } return T; }
  function ico() { const g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position, T = []; for (let i = 0; i < p.count; i += 3) T.push([0, 1, 2].map(k => [p.getX(i + k), p.getY(i + k) + 1, p.getZ(i + k)])); g.dispose(); return T; }
  const CUTS = { quartz: prism(6, .32, .68), blade: prism(3, .4, .6, .25, .8), nugget: bipyramid(8, .45, .55), needle: prism(4, .25, .75, 0, .7), ico: ico() };
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3(), tC = new THREE.Vector3(), cA = new THREE.Color(), cB = new THREE.Color();
  // emit one crystal: cut, base position, axis (unit), length, radius, colors, seed
  function emit(out, cut, bx, by, bz, ax, len, rad, c0, c1, seed, maxH) { tmpQ.setFromUnitVectors(up, ax); const roll = new THREE.Quaternion().setFromAxisAngle(ax, seed * 6.283); tmpQ.premultiply(roll);
    tmpM.compose(tmpV.set(bx, by, bz), tmpQ, new THREE.Vector3(rad, len, rad)); const T = CUTS[cut]; cA.setHex(c0); cB.setHex(c1);
    for (const tri of T) { tA.fromArray(tri[0]).applyMatrix4(tmpM); tB.fromArray(tri[1]).applyMatrix4(tmpM); tC.fromArray(tri[2]).applyMatrix4(tmpM);
      nrm.subVectors(tC, tB).cross(tmpV.subVectors(tA, tB)).normalize(); if (!isFinite(nrm.x)) continue;
      for (let k = 0; k < 3; k++) { const v = k === 0 ? tA : k === 1 ? tB : tC, h = Math.max(0, Math.min(1, tri[k][1] / maxH)); out.p.push(v.x, v.y, v.z); out.n.push(nrm.x, nrm.y, nrm.z);
        out.c.push(cA.r + (cB.r - cA.r) * h, cA.g + (cB.g - cA.g) * h, cA.b + (cB.b - cA.b) * h); out.h.push(h); out.s.push(seed); } } }
  function hsh(x, y, z, k) { let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791) ^ Math.imul(k, 2654435761); h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
  const FN = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  // cluster on one open face of an ore tile
  function cluster(out, pts, id, x, y, z, f) { const S = SPEC[id], n = f; let k = 0; const R = () => hsh(x, y, z, 31 + k++ * 7 + FN.indexOf(n) * 101);
    const ua = n[0] ? [0, 1, 0] : [1, 0, 0], va = [n[1] * ua[2] - n[2] * ua[1], n[2] * ua[0] - n[0] * ua[2], n[0] * ua[1] - n[1] * ua[0]];
    const cx = x + .5 + n[0] * .47, cy = y + .5 + n[1] * .47, cz = z + .5 + n[2] * .47; const ax = new THREE.Vector3();
    let cnt = S.n[0] + Math.floor(R() * (S.n[1] - S.n[0] + 1)); if (lite) cnt = Math.max(2, cnt - 1);
    if (S.cut === "core") { // big glowing faceted orb sitting in the middle of a crown of points
      const r0 = .2 + R() * .05; emit(out, "ico", cx + n[0] * (r0 * .2), cy + n[1] * (r0 * .2) - r0 * (n[1] ? 0 : 1) * 0, cz + n[2] * (r0 * .2), ax.set(...n), r0, r0, 0xd8b0ff, 0xffffff, R(), 2);
      for (let i = 0; i < cnt; i++) { const a = i / cnt * 6.283 + R(), rr = .26; const ox = Math.cos(a) * rr, oy = Math.sin(a) * rr; ax.set(n[0] + (ua[0] * ox + va[0] * oy) * 1.6, n[1] + (ua[1] * ox + va[1] * oy) * 1.6, n[2] + (ua[2] * ox + va[2] * oy) * 1.6).normalize();
        emit(out, "quartz", cx + ua[0] * ox + va[0] * oy, cy + ua[1] * ox + va[1] * oy, cz + ua[2] * ox + va[2] * oy, ax, S.len[0] + R() * (S.len[1] - S.len[0]), S.rad[0] + R() * (S.rad[1] - S.rad[0]), S.c0, S.c1, R(), 1); } }
    else for (let i = 0; i < cnt; i++) { const ox = (R() - .5) * .62, oy = (R() - .5) * .62, tilt = S.cut === "nugget" ? .9 : S.cut === "needle" ? 1.1 : .7;
      ax.set(n[0] + (ua[0] * ox + va[0] * oy) * tilt + (R() - .5) * .3, n[1] + (ua[1] * ox + va[1] * oy) * tilt + (R() - .5) * .3, n[2] + (ua[2] * ox + va[2] * oy) * tilt + (R() - .5) * .3).normalize();
      const big = (i === 0 ? 1.35 : 1) * (n[1] > 0 ? 1.25 : n[1] < 0 ? .8 : 1), len = (S.len[0] + R() * (S.len[1] - S.len[0])) * big, rad = (S.rad[0] + R() * (S.rad[1] - S.rad[0])) * (big > 1 ? 1.2 : 1);
      emit(out, S.cut, cx + ua[0] * ox + va[0] * oy - n[0] * .04, cy + ua[1] * ox + va[1] * oy - n[1] * .04, cz + ua[2] * ox + va[2] * oy - n[2] * .04, ax, len, rad, S.c0, S.c1, R(), 1); }
    // halo (kind 0) + sparkles (kind 1)
    const hc = new THREE.Color(S.halo); pts.p.push(cx + n[0] * .28, cy + n[1] * .28, cz + n[2] * .28); pts.c.push(hc.r, hc.g, hc.b); pts.k.push(0); pts.s.push(R()); pts.z.push(id === 10 ? 2.3 : 1.7);
    const ns = lite ? 2 : 3; for (let i = 0; i < ns; i++) { pts.p.push(cx + n[0] * (.2 + R() * .5) + (R() - .5) * .7 * (1 - Math.abs(n[0])), cy + n[1] * (.2 + R() * .5) + (R() - .5) * .7 * (1 - Math.abs(n[1])), cz + n[2] * (.2 + R() * .5) + (R() - .5) * .7 * (1 - Math.abs(n[2]))); pts.c.push(1, 1, 1); pts.k.push(1); pts.s.push(R()); pts.z.push(.38 + R() * .2); } }
  // ---- materials
  const U = { uT: { value: 0 }, uSun: { value: new THREE.Vector3(.3, .8, .4) }, uDay: { value: 1 }, uFogC: { value: new THREE.Color() }, uFogN: { value: 20 }, uFogF: { value: 60 }, uScale: { value: 400 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: `attribute vec3 color; attribute float aH; attribute float aS; varying vec3 vC; varying vec3 vN; varying vec3 vW; varying float vH; varying float vS; varying float vD;
    void main(){ vC = color; vN = normal; vH = aH; vS = aS; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uT; uniform vec3 uSun; uniform float uDay; uniform vec3 uFogC; uniform float uFogN; uniform float uFogF; varying vec3 vC; varying vec3 vN; varying vec3 vW; varying float vH; varying float vS; varying float vD;
    void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float nv = abs(dot(N,V)); float fres = pow(1. - nv, 2.2);
      float facet = .55 + .45 * dot(N, normalize(vec3(.35,.85,.4)));
      float pulse = .85 + .15 * sin(uT * 2.2 + vS * 30.);
      vec3 inner = vC * (.5 + .75 * vH) * pulse;                       // glow brightens toward the tip
      vec3 c = inner * (.55 + .5 * facet) + vC * (1. - nv) * .25;       // facets catch light differently
      vec3 L = normalize(uSun); vec3 H = normalize(L + V); float sp = pow(max(dot(N,H),0.), 70.) * (.35 + .65 * uDay);
      vec3 H2 = normalize(V + vec3(0.,.4,0.)); float sp2 = pow(max(dot(N,H2),0.), 40.) * .35;   // camera-side glint so caves sparkle too
      float tw = pow(max(0., sin(uT * 2.6 + vS * 61.)), 24.);
      c += vec3(1.) * (sp * 1.4 + sp2 + tw * .9 * (.4 + vH));
      c += mix(vC, vec3(1.), .55) * fres * 1.1;
      c += vC * smoothstep(.75, 1., vH) * .7;
      float f = smoothstep(uFogN, uFogF, vD); gl_FragColor = vec4(mix(c, uFogC, f * .85), 1.); }` });
  const pmat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 color; attribute float aK; attribute float aS; attribute float aZ; uniform float uT; uniform float uScale; varying vec3 vC; varying float vK; varying float vA;
    void main(){ vC = color; vK = aK; vec4 mv = modelViewMatrix * vec4(position,1.); float tw = aK > .5 ? pow(max(0., sin(uT * (1.6 + aS * 1.4) + aS * 40.)), 6.) : .75 + .25 * sin(uT * 1.7 + aS * 20.);
      vA = tw; float fade = 1. - smoothstep(30., 55., -mv.z); vA *= fade; gl_PointSize = aZ * uScale / max(.5, -mv.z) * (aK > .5 ? (.35 + tw) : 1.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vK; varying float vA; void main(){ vec2 q = gl_PointCoord * 2. - 1.; float a;
      if (vK > .5) { float s = max(0., 1. - abs(q.x) * 7.) * max(0., 1. - abs(q.y)) + max(0., 1. - abs(q.y) * 7.) * max(0., 1. - abs(q.x)); a = s + max(0., 1. - length(q) * 2.2); }
      else { float d = length(q); a = pow(max(0., 1. - d), 2.2) * .38; }
      if (a < .01) discard; gl_FragColor = vec4(vC * a * vA, 1.); }` });
  // ---- chunk builder: scans the chunk, emits clusters on open faces of gem tiles
  function buildChunk(x0, z0, CSz, SY, get) { const out = { p: [], n: [], c: [], h: [], s: [] }, pts = { p: [], c: [], k: [], s: [], z: [] }; let faces = 0;
    for (let y = 0; y < SY; y++) for (let z = z0; z < z0 + CSz; z++) for (let x = x0; x < x0 + CSz; x++) { const id = get(x, y, z); if (!SPEC[id]) continue;
      for (const f of FN) { if (get(x + f[0], y + f[1], z + f[2])) continue; if (y + f[1] < 0) continue; cluster(out, pts, id, x, y, z, f); faces++; } }
    if (!faces) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(out.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(out.c, 3));
    g.setAttribute("aH", new THREE.Float32BufferAttribute(out.h, 1)); g.setAttribute("aS", new THREE.Float32BufferAttribute(out.s, 1)); g.computeBoundingSphere();
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.Float32BufferAttribute(pts.p, 3)); pg.setAttribute("color", new THREE.Float32BufferAttribute(pts.c, 3)); pg.setAttribute("aK", new THREE.Float32BufferAttribute(pts.k, 1)); pg.setAttribute("aS", new THREE.Float32BufferAttribute(pts.s, 1)); pg.setAttribute("aZ", new THREE.Float32BufferAttribute(pts.z, 1)); pg.computeBoundingSphere();
    return { geo: g, pgeo: pg, faces, tris: out.p.length / 9 }; }
  // small loose gem for pickups / loot: same shader, cut by type
  const pickGeo = {};
  function pickupGeo(id) { if (pickGeo[id]) return pickGeo[id]; const S = SPEC[id] || SPEC[8], out = { p: [], n: [], c: [], h: [], s: [] }, a = new THREE.Vector3(0, 1, 0);
    if (S.cut === "core") emit(out, "ico", 0, -.09, 0, a, .09, .09, S.c0, S.c1, .3, 2); else if (S.cut === "nugget") emit(out, "nugget", 0, -.1, 0, a, .2, .1, S.c0, S.c1, .3, 1); else { emit(out, S.cut, 0, 0, 0, a, .24, .06, S.c0, S.c1, .3, 1); emit(out, S.cut, 0, 0, 0, a.set(0, -1, 0), .16, .06, S.c0, S.c1, .6, 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(out.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(out.c, 3)); g.setAttribute("aH", new THREE.Float32BufferAttribute(out.h, 1)); g.setAttribute("aS", new THREE.Float32BufferAttribute(out.s, 1)); g.computeBoundingSphere(); return pickGeo[id] = g; }
  function tick(t, sunDir, day, fog, pxH) { U.uT.value = t; if (sunDir) U.uSun.value.copy(sunDir); U.uDay.value = day; if (fog) { U.uFogC.value.copy(fog.color); U.uFogN.value = fog.near; U.uFogF.value = fog.far; } if (pxH) U.uScale.value = pxH * .5; }
  return { SPEC, isGem, mat, pmat, buildChunk, pickupGeo, tick, CUTS };
}
