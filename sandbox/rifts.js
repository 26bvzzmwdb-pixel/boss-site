// $BOSS Sandbox v0.9.5 BOSS RIFTS: glowing portals open at random spots on a timer. Walk in (after a warning) to fight a boss in a sealed arena.
// Rarer rifts are rarer, harder and drop better in-game loot (shards / gems only, no cash value). Everything tunable lives in RIFT_CFG.
export const RIFT_CFG = {
  firstDelay: [70, 100],     // seconds of play before the first rift
  gap: [150, 240],           // seconds between rifts (random in range)
  life: 180,                 // a rift closes after this many seconds if nobody uses it
  retryLife: 60,             // after a lost fight the same rift stays open at least this long
  maxOpen: 2,                // at most this many rifts open at once
  dist: [22, 55],            // spawn distance from the player
  arena: { r: 16, floorY: 150 },
  // what a DEATH inside a rift wipes (reward/holder skins, achievements and builds are always safe)
  wipe: { shards: true, blaster: true, powers: true, lab: false, companions: false },
  // w = spawn weight (odds = w / total). Scaling: hp ×, dmg × (per hit, rounded up), spd × (projectiles/waves/dashes), tele × (telegraph time, lower = shorter warning),
  // rest × (downtime between attacks), phases, extra (+N projectiles / rings per attack), adds (rift wolves per wave from phase 2), addEvery (s), loot (◆ shards), blastDrop (MK II blaster chance), power (absorb the boss power)
  tiers: [
    { key: "common", name: "COMMON", w: 62, col: 0x5affb0, css: "#5affb0", bosses: ["rug", "whale"], hp: 1.0, dmg: 1, spd: 1.0, tele: 1.0, rest: 1.0, phases: 3, extra: 0, adds: 0, addEvery: 99, loot: 60, blastDrop: 0, power: false, parts: 36, beam: 16, lvl: 0 },
    { key: "rare", name: "RARE", w: 26, col: 0x3aa0ff, css: "#59b4ff", bosses: ["jelly"], hp: 1.4, dmg: 1, spd: 1.1, tele: .92, rest: .85, phases: 3, extra: 1, adds: 1, addEvery: 18, loot: 110, blastDrop: .08, power: false, parts: 60, beam: 24, lvl: .5 },
    { key: "epic", name: "EPIC", w: 9, col: 0xb46aff, css: "#c08aff", bosses: ["colossus", "king"], hp: 1.9, dmg: 1.5, spd: 1.2, tele: .84, rest: .72, phases: 4, extra: 2, adds: 2, addEvery: 15, loot: 190, blastDrop: .3, power: true, parts: 96, beam: 32, lvl: 1 },
    { key: "legendary", name: "LEGENDARY", w: 3, col: 0xffb020, css: "#ffc040", bosses: ["moth"], hp: 2.6, dmg: 2, spd: 1.3, tele: .76, rest: .58, phases: 5, extra: 3, adds: 2, addEvery: 12, loot: 340, blastDrop: 1, power: true, parts: 140, beam: 42, lvl: 1.5 },
  ],
};
export function tierOdds() { const T = RIFT_CFG.tiers, s = T.reduce((a, t) => a + t.w, 0); return T.map(t => [t.name, Math.round(t.w / s * 1000) / 10]); }
export function createRifts(THREE, C) {
  const { scene, P, IS_TOUCH } = C, CFG = RIFT_CFG, V3 = THREE.Vector3;
  const rnd = ([a, b]) => a + Math.random() * (b - a);
  const portals = []; let timer = rnd(CFG.firstDelay), uid = 0;
  const pickTier = () => { if (C.force) { const f = CFG.tiers.find(t => t.key === C.force); if (f) return f; } const s = CFG.tiers.reduce((a, t) => a + t.w, 0); let r = Math.random() * s; for (const t of CFG.tiers) { r -= t.w; if (r <= 0) return t; } return CFG.tiers[0]; };
  // ---------------- shared visuals ----------------
  const swirlV = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }";
  const swirlF = "uniform float uT; uniform vec3 uC; uniform float uA; varying vec2 vUv; void main(){ vec2 p = vUv - .5; float r = length(p) * 2.; if (r > 1.) discard; float a = atan(p.y, p.x);" +
    " float s = sin(a * 3. + r * 9. - uT * 3.5) * .5 + .5; float c = smoothstep(1., .0, r); vec3 col = mix(uC * .35, uC * 1.6 + .25, s * c) + vec3(1.) * pow(c, 6.) * .9; gl_FragColor = vec4(col, (.55 + .45 * s) * smoothstep(1., .82, r) * uA); }";
  const beamF = "uniform vec3 uC; uniform float uT; varying vec2 vUv; void main(){ float f = (1. - vUv.y); float s = .65 + .35 * sin(vUv.y * 30. - uT * 4.); gl_FragColor = vec4(uC * 1.3 + .1, f * f * .55 * s); }";
  const partV = "attribute vec3 aP; uniform float uT; uniform float uS; void main(){ float a = aP.x + uT * aP.z; float r = aP.y; float h = mod(aP.z * 7. + uT * (.4 + aP.z * .3), 3.2); vec3 p = vec3(cos(a) * r, h - .2, sin(a) * r * .35); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = uS * (1.0 + aP.z) * (60. / -mv.z); gl_Position = projectionMatrix * mv; }";
  const partF = "uniform vec3 uC; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q); if (d > .5) discard; gl_FragColor = vec4(uC * 1.4 + .2, (1. - d * 2.)); }";
  const ringT = new THREE.TorusGeometry(1.35, .13, 10, 40), discG = new THREE.CircleGeometry(1.24, 40), beamG = new THREE.CylinderGeometry(.28, .7, 1, 14, 1, true).translate(0, .5, 0), groundG = new THREE.RingGeometry(1.3, 2.2, 40).rotateX(-Math.PI / 2), shardG = new THREE.OctahedronGeometry(.16);
  const labelTex = (txt, css) => { const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d"); x.font = "900 30px Orbitron,Verdana,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 8; x.strokeStyle = "#0a0414"; x.strokeText(txt, 128, 33); x.fillStyle = css; x.fillText(txt, 128, 33); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  function portalMesh(tier, label, scale = 1) { const g = new THREE.Group(), col = new THREE.Color(tier.col), add = THREE.AdditiveBlending;
    const inner = new THREE.Group(); inner.position.y = 1.55; inner.scale.setScalar(scale); g.add(inner);
    const ring = new THREE.Mesh(ringT, C.toon(tier.col, tier.col, 1.1)); inner.add(ring);
    const su = { uT: { value: 0 }, uC: { value: col }, uA: { value: 1 } }; const disc = new THREE.Mesh(discG, new THREE.ShaderMaterial({ uniforms: su, vertexShader: swirlV, fragmentShader: swirlF, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: add })); inner.add(disc);
    const bu = { uT: su.uT, uC: { value: col } }; const beam = new THREE.Mesh(beamG, new THREE.ShaderMaterial({ uniforms: bu, vertexShader: swirlV, fragmentShader: beamF, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: add, fog: false })); beam.scale.set(1, tier.beam || 20, 1); g.add(beam);
    const gr = new THREE.Mesh(groundG, new THREE.MeshBasicMaterial({ color: tier.col, transparent: true, opacity: .55, blending: add, depthWrite: false })); gr.position.y = .06; g.add(gr);
    const n = Math.round((tier.parts || 40) * (IS_TOUCH ? .6 : 1)), arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = Math.random() * 6.28; arr[i * 3 + 1] = .4 + Math.random() * 1.7; arr[i * 3 + 2] = Math.random(); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); pg.setAttribute("aP", new THREE.BufferAttribute(arr, 3)); pg.boundingSphere = new THREE.Sphere(new V3(0, 1.5, 0), 4);
    const pts = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: { uT: su.uT, uC: { value: col }, uS: { value: tier.key === "legendary" ? 3.2 : tier.key === "epic" ? 2.6 : 2 } }, vertexShader: partV, fragmentShader: partF, transparent: true, depthWrite: false, blending: add })); g.add(pts);
    const shards = []; if (tier.key === "epic" || tier.key === "legendary") for (let i = 0; i < (tier.key === "legendary" ? 8 : 5); i++) { const s = new THREE.Mesh(shardG, C.toon(tier.col, tier.col, 1.2)); g.add(s); shards.push(s); }
    let lab = null; if (label) { lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(label, tier.css), transparent: true, depthWrite: false, fog: false })); lab.scale.set(3.2, .8, 1); lab.position.y = 3.6 * scale; g.add(lab); }
    return { g, inner, ring, disc, su, beam, gr, pts, shards, lab }; }
  function animPortal(M, t, k = 1) { M.su.uT.value = t; M.inner.rotation.y = Math.atan2(P.x - M.g.position.x, P.z - M.g.position.z); M.ring.rotation.z = t * .6; M.inner.scale.setScalar(k * (1 + Math.sin(t * 3) * .03));
    M.shards.forEach((s, i) => { const a = t * .8 + i * 6.283 / M.shards.length; s.position.set(Math.cos(a) * 2, 1.6 + Math.sin(t * 2 + i) * .5, Math.sin(a) * 2); s.rotation.y = t * 2; }); M.gr.material.opacity = .35 + Math.sin(t * 4) * .15; }
  function dispose(M) { M.g.traverse(o => { if (o.material && o.material.map && o.material.map !== null && o.isSprite) o.material.map.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); M.g.parent && M.g.parent.remove(M.g); M.pts.geometry.dispose(); }
  // ---------------- world portals ----------------
  function spawn(tierKey, dist) { const tier = tierKey ? CFG.tiers.find(t => t.key === tierKey) || pickTier() : pickTier();
    for (let tries = 0; tries < 60; tries++) { const a = Math.random() * 6.283, d = dist != null ? dist : rnd(CFG.dist), x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d; const s = C.spot(x, z); if (!s) continue;
      if (portals.some(p => Math.hypot(p.x - s[0], p.z - s[2]) < 12)) continue; const kind = tier.bosses[(Math.random() * tier.bosses.length) | 0];
      const M = portalMesh(tier, tier.name + " RIFT"); M.g.position.set(s[0], s[1], s[2]); scene.add(M.g); const p = { id: ++uid, tier, kind, x: s[0], y: s[1], z: s[2], life: CFG.life, M, open: 0, cd: 0 }; portals.push(p); C.onOpen && C.onOpen(p); return p; }
    return null; }
  function close(p, why) { const i = portals.indexOf(p); if (i < 0) return; portals.splice(i, 1); dispose(p.M); C.onClose && C.onClose(p, why); }
  function update(dt, time, active) { // active = in the overworld and free to roam (not in a rift / boss fight / menu)
    if (active) { timer -= dt; if (timer <= 0) { timer = rnd(CFG.gap); if (portals.length < CFG.maxOpen) spawn(); } }
    for (let i = portals.length - 1; i >= 0; i--) { const p = portals[i]; if (!p.busy) p.life -= dt; p.cd -= dt; p.open = Math.min(1, p.open + dt * 1.5);
      const k = p.life < 8 ? Math.max(.05, p.life / 8) * (.85 + Math.random() * .15) : 1 - (1 - p.open) ** 3; animPortal(p.M, time, k);
      if (p.life <= 0) { close(p, "faded"); continue; }
      if (active && p.cd <= 0 && Math.hypot(P.x - p.x, P.z - p.z) < 1.5 && Math.abs(P.y - p.y) < 2.6) { p.cd = 1; C.onTouch && C.onTouch(p); } } }
  // ---------------- the sealed arena ----------------
  let A = null;
  const domeV = "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }";
  const domeF = "uniform vec3 uC; uniform float uT; uniform float uD; varying vec3 vP; void main(){ float h = vP.y; vec3 top = vec3(.02,.01,.05); vec3 hor = uC * .55 + vec3(.05,.02,.08); vec3 c = mix(hor, top, smoothstep(-.05, .55, h)); c += uC * .25 * pow(max(0., 1. - abs(h - .02) * 6.), 2.);" +
    " float s = sin(atan(vP.z, vP.x) * 9. + uT * .3 + h * 12.) * .5 + .5; c += uC * .08 * s * smoothstep(.6, .0, abs(h)); c = mix(c, c * .25, uD); gl_FragColor = vec4(c, 1.); }";
  const barF = "uniform vec3 uC; uniform float uT; uniform float uA; varying vec2 vUv; void main(){ float y = vUv.y; float hx = abs(fract(vUv.x * 64.) - .5) + abs(fract(y * 6. + floor(vUv.x * 64.) * .5) - .5); float line = smoothstep(.46, .5, hx);" +
    " float scan = smoothstep(.0, .05, abs(fract(y * 2. - uT * .4) - .5)); float a = (line * .55 + (1. - y) * .25 + (1. - scan) * .35) * smoothstep(1., .55, y) * uA; gl_FragColor = vec4(uC * 1.4 + .15, a); }";
  const floorTex = tier => { const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d"); const g = x.createRadialGradient(256, 256, 20, 256, 256, 256); g.addColorStop(0, "#2a1c48"); g.addColorStop(.8, "#140c26"); g.addColorStop(1, "#0a0614"); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = tier.css; x.globalAlpha = .28; x.lineWidth = 2; const R = 22; for (let row = -1; row < 14; row++) for (let col = -1; col < 14; col++) { const cx = col * R * 1.73 + (row % 2) * R * .866, cy = row * R * 1.5; x.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } x.closePath(); x.stroke(); }
    x.globalAlpha = .8; x.lineWidth = 6; for (const r of [250, 170, 60]) { x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  function buildArena(tier) { const R = CFG.arena.r, fy = CFG.arena.floorY, cx = C.SX / 2, cz = C.SZ / 2, g = new THREE.Group(); g.position.set(cx, fy, cz); const col = new THREE.Color(tier.col), add = THREE.AdditiveBlending; const u = { uT: { value: 0 }, uC: { value: col }, uA: { value: 1 }, uD: { value: 0 } };
    const dome = new THREE.Mesh(new THREE.SphereGeometry(70, 28, 16), new THREE.ShaderMaterial({ uniforms: u, vertexShader: domeV, fragmentShader: domeF, side: THREE.BackSide, depthWrite: false, fog: false })); dome.renderOrder = -5; g.add(dome);
    const ft = floorTex(tier); const floor = new THREE.Mesh(new THREE.CylinderGeometry(R + .4, R * .82, 1.4, 48), [new THREE.MeshToonMaterial({ color: 0x2a2040, gradientMap: C.grad }), new THREE.MeshToonMaterial({ map: ft, gradientMap: C.grad, emissive: 0xffffff, emissiveMap: ft, emissiveIntensity: .55 }), new THREE.MeshToonMaterial({ color: 0x1a1428, gradientMap: C.grad })]); floor.position.y = -.7; g.add(floor);
    const under = new THREE.Mesh(new THREE.ConeGeometry(R * .82, 14, 24), C.toon(0x231a36, 0x0a0614, .2)); under.rotation.x = Math.PI; under.position.y = -8.4; g.add(under);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(R + .25, .18, 8, 64), C.toon(tier.col, tier.col, 1.2)); edge.rotation.x = Math.PI / 2; edge.position.y = .02; g.add(edge);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(R + .3, R + .3, 7, 64, 1, true), new THREE.ShaderMaterial({ uniforms: u, vertexShader: swirlV, fragmentShader: barF, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: add })); bar.position.y = 3.5; g.add(bar);
    const rocks = []; for (let i = 0; i < (IS_TOUCH ? 7 : 12); i++) { const a = i / (IS_TOUCH ? 7 : 12) * 6.283 + Math.random() * .3, r = R + 7 + Math.random() * 16, s = 1 + Math.random() * 2.2; const m = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), C.toon(i % 3 ? 0x3a2a5a : tier.col, tier.col, i % 3 ? .15 : .9)); m.position.set(Math.cos(a) * r, -2 + Math.random() * 12, Math.sin(a) * r); m.scale.y = 1.6; g.add(m); rocks.push([m, m.position.y, Math.random() * 6]); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const pil = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, 3.2, 6), C.toon(0x2a2040, tier.col, .25)); pil.position.set(Math.cos(a) * (R + 1.4), 1.2, Math.sin(a) * (R + 1.4)); g.add(pil); const gem = new THREE.Mesh(shardG, C.toon(tier.col, tier.col, 1.3)); gem.scale.setScalar(2.4); gem.position.set(Math.cos(a) * (R + 1.4), 3.3, Math.sin(a) * (R + 1.4)); g.add(gem); rocks.push([gem, 3.3, i]); }
    scene.add(g); return { g, u, bar, dome, floor, rocks, ft, R, fy, cx, cz, sealT: 0, entry: null, exit: null, tier }; }
  function enter(p) { if (A) leaveArena(); A = buildArena(p.tier); p.busy = true; const M = portalMesh(p.tier, null, 1); M.g.position.set(A.cx, A.fy, A.cz + A.R - 1.2); scene.add(M.g); A.entry = M; A.entryT = 0; A.portal = p; return A; }
  function openExit() { if (!A || A.exit) return; const M = portalMesh({ key: "home", col: 0xfff2b0, css: "#fff2b0", parts: 60, beam: 14 }, "PORTAL HOME"); M.g.position.set(A.cx, A.fy, A.cz); scene.add(M.g); A.exit = M; A.exitT = 0; }
  function leaveArena() { if (!A) return; if (A.entry) dispose(A.entry); if (A.exit) dispose(A.exit); A.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }); A.ft.dispose(); scene.remove(A.g); A = null; }
  function arenaTick(dt, time, dark) { if (!A) return; A.u.uT.value = time; A.u.uD.value += ((dark ? 1 : 0) - A.u.uD.value) * Math.min(1, dt * 4);
    if (A.entry) { A.entryT += dt; const k = Math.max(0, 1 - A.entryT / 1.3); animPortal(A.entry, time, Math.max(.01, k)); if (k <= 0) { dispose(A.entry); A.entry = null; } }
    if (A.exit) { A.exitT += dt; animPortal(A.exit, time, Math.min(1, A.exitT * 1.5)); }
    A.u.uA.value += ((A.exit ? .15 : 1) - A.u.uA.value) * Math.min(1, dt * 2); for (const [m, y0, ph] of A.rocks) { m.position.y = y0 + Math.sin(time * .6 + ph) * .5; m.rotation.y += dt * .2; } }
  function clearAll() { while (portals.length) close(portals[0], "clear"); leaveArena(); }
  return { portals, spawn, close, update, enter, openExit, leaveArena, arenaTick, arena: () => A, clearAll, timer: () => timer, setTimer: v => { timer = v; }, pickTier, CFG };
}
