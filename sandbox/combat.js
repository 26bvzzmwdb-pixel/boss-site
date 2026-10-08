// $BOSS Sandbox v0.9.5 COMBAT: the PRISM BLASTER (ranged), the PULSE GAUNTLET (melee) and absorbed BOSS POWERS.
// Original toon sci-fi gear (crystal blaster, glove), glowing energy bolts, sparks and floating damage numbers. No gore.
// Blaster: fire-rate + heat meter (overheats if you hold it too long). Touch: soft aim assist toward the boss / weak point near the reticle.
export const WEAPONS = [
  { id: "tool", name: "DRILL", icon: "⛏", key: "Z" },
  { id: "melee", name: "PULSE GAUNTLET", icon: "🥊", key: "X" },
  { id: "blaster", name: "PRISM BLASTER", icon: "🔫", key: "C" },
];
// balance table (bosses take these before weak-point multipliers: ×1.5 on the weak point, ×3 while it is exposed)
export const COMBAT_CFG = {
  blaster: [null, { dmg: 3.6, every: .19, heat: 9, wolf: .45, name: "PRISM BLASTER" }, { dmg: 5.2, every: .16, heat: 7.5, wolf: .6, name: "PRISM BLASTER MK II" }],
  speed: 42, life: 1.3, cool: 38, coolDelay: .3, overLock: 1.7,
  melee: { dmg: 11, every: .5, range: 3.4, wolf: 1.2 },
  assist: { radius: .2, nudge: .22, maxNudge: .06 },          // touch only: fraction of the short screen side, how hard it pulls, max radians per shot
};
export const POWERS = {
  slam: { name: "CANDLE SLAM", from: "colossus", icon: "🕯", cd: 14, col: 0x14f195, css: "#14f195", desc: "Slam the ground: a shockwave hits everything within 5 m (30 to bosses, knocks out wolves)" },
  storm: { name: "STORM RING", from: "king", icon: "⚡", cd: 18, col: 0xb46aff, css: "#c08aff", desc: "Call lightning on up to 4 nearby enemies (14 each, max 2 strikes on a boss)" },
  dash: { name: "ECLIPSE DASH", from: "moth", icon: "🌑", cd: 9, col: 0xffd24a, css: "#ffd24a", desc: "Blink-dash 8 m, untouchable for 0.6 s, 18 to anything you pass through" },
};
export function createCombat(THREE, C) {
  const { scene, camera, P, IS_TOUCH } = C, V3 = THREE.Vector3, CF = COMBAT_CFG;
  const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "#fff"); r.addColorStop(.3, "rgba(255,255,255,.8)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const S = { weapon: 0, heat: 0, over: 0, fireT: 0, coolT: 0, punchT: 0, punchCd: 0, recoil: 0, dashT: 0, iT: 0, powCd: {}, shots: 0, hits: 0, lastDmg: 0, assistT: null };
  const toon = C.toon, add = C.add;
  // ---------------- models ----------------
  function makeBlaster() { const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    add(body, new THREE.CapsuleGeometry(.075, .26, 4, 10), toon(0x6a3aff, 0x3a1a9a, .45), 0, 0, 0, .08).rotation.x = Math.PI / 2;
    add(body, new THREE.BoxGeometry(.07, .16, .09), toon(0x2a1a4a), 0, -.1, -.06, .08).rotation.x = -.35;
    const brl = add(body, new THREE.CylinderGeometry(.04, .05, .2, 10), toon(0xbff8ff, 0x28dcff, .9), 0, 0, .25); brl.rotation.x = Math.PI / 2;
    const ring = add(body, new THREE.TorusGeometry(.065, .018, 6, 16), toon(0xffd24a, 0x7a4a00, .5), 0, 0, .17);
    const crys = add(body, new THREE.OctahedronGeometry(.07), toon(0x9df7ff, 0x28dcff, 1.2), 0, .1, 0); crys.scale.set(.8, 1.4, .8);
    const tip = new THREE.Object3D(); tip.position.set(0, 0, .37); body.add(tip); return { g, body, crys, tip, ring }; }
  function makeGlove() { const g = new THREE.Group(); const wm = toon(0x28dcff, 0x0a6a9a, .55);
    add(g, new THREE.SphereGeometry(.13, 14, 10), wm, 0, 0, 0, .1).scale.set(1, 1.05, 1.15); for (let i = 0; i < 4; i++) add(g, new THREE.SphereGeometry(.045, 8, 6), wm, -.07 + i * .047, .02, .12, .12);
    add(g, new THREE.TorusGeometry(.12, .035, 6, 16), toon(0xffd24a, 0x7a4a00, .5), 0, 0, -.1); const core = add(g, new THREE.SphereGeometry(.04, 8, 6), toon(0xffffff, 0x28dcff, 1.5), 0, .1, 0); return { g, core }; }
  const TP = { blaster: makeBlaster(), glove: makeGlove() }, FP = { blaster: makeBlaster(), glove: makeGlove() };
  for (const k of ["blaster", "glove"]) { FP[k].g.visible = false; camera.add(FP[k].g); }
  FP.blaster.g.position.set(.26, -.24, -.55); FP.blaster.g.rotation.y = Math.PI; FP.blaster.g.scale.setScalar(1.25);
  FP.glove.g.position.set(.3, -.3, -.5); FP.glove.g.rotation.y = Math.PI; FP.glove.g.scale.setScalar(1.3);
  let hand = null; function attach(h) { if (h === hand) return; hand = h; for (const k of ["blaster", "glove"]) { const m = TP[k].g; if (m.parent) m.parent.remove(m); if (h) h.add(m); }
    TP.blaster.g.rotation.set(Math.PI / 2, 0, 0); TP.blaster.g.position.set(0, -.06, .02); TP.blaster.g.scale.setScalar(.9); TP.glove.g.scale.setScalar(.95); TP.glove.g.position.set(0, -.03, 0); }
  // ---------------- projectiles / fx ----------------
  const boltGeo = new THREE.CapsuleGeometry(.05, .55, 3, 6).rotateX(Math.PI / 2), boltM = [null, new THREE.MeshBasicMaterial({ color: 0xbff8ff }), new THREE.MeshBasicMaterial({ color: 0xffe9ff })];
  const glowM = c => new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const bolts = [], pool = [], flashes = [];
  function getBolt(lv) { const b = pool.pop() || (() => { const m = new THREE.Mesh(boltGeo, boltM[1]); const s = new THREE.Sprite(glowM(0x28dcff)); s.scale.set(.7, .7, 1); m.add(s); return { m, s }; })(); b.m.material = boltM[lv]; b.s.material.color.setHex(lv >= 2 ? 0xff7ad0 : 0x28dcff); scene.add(b.m); return b; }
  function flash(p, col, s, life) { const sp = new THREE.Sprite(glowM(col)); sp.position.copy(p); sp.scale.set(s, s, 1); scene.add(sp); flashes.push({ sp, t: 0, life, s }); }
  const ringGeo = new THREE.RingGeometry(.8, 1, 40).rotateX(-Math.PI / 2); const rings = [];
  function ring(x, y, z, col, R, life) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.position.set(x, y + .08, z); m.scale.setScalar(.2); scene.add(m); rings.push({ m, t: 0, life, R }); }
  // ---------------- damage numbers (DOM, projected each frame) ----------------
  const dmgEl = document.getElementById("dmgs"), nums = [];
  function dmgNum(p, v, weak, col) { if (!dmgEl) return; if (nums.length > 14) { nums[0].el.remove(); nums.shift(); } const el = document.createElement("b"); el.className = "dn" + (weak ? " wk" : ""); el.textContent = Math.max(1, Math.round(v)) + (weak ? "!" : ""); if (col) el.style.color = col; dmgEl.appendChild(el);
    nums.push({ el, p: p.clone().add(new V3((Math.random() - .5) * .6, .3, (Math.random() - .5) * .6)), t: 0 }); S.lastDmg = v; }
  const pv = new V3();
  function updNums(dt) { const w = innerWidth, h = innerHeight; for (let i = nums.length - 1; i >= 0; i--) { const n = nums[i]; n.t += dt; n.p.y += dt * 1.4; pv.copy(n.p).project(camera);
      if (n.t > .85 || pv.z > 1) { n.el.remove(); nums.splice(i, 1); continue; } n.el.style.transform = `translate(${((pv.x + 1) / 2 * w).toFixed(0)}px,${((1 - pv.y) / 2 * h).toFixed(0)}px) translate(-50%,-50%) scale(${(1 + Math.max(0, .25 - n.t) * 2).toFixed(2)})`; n.el.style.opacity = n.t > .55 ? (1 - (n.t - .55) / .3).toFixed(2) : 1; } }
  // ---------------- hitting things ----------------
  function bossMult(weak) { const b = C.boss; return weak ? (b.expose > 0 ? 3 : b.lidShut ? .5 : 1.5) : 1; }
  function hitBoss(n, weak, p, col) { const b = C.boss; if (!b.on || b.dying || b.intro > 0) return false; const v = n * bossMult(weak); C.BX.damage(n, weak); dmgNum(p, v, weak && b.expose > 0, weak ? "#ffd24a" : col); S.hits++; return true; }
  function hitWolf(w, n, p) { w.hp -= n; C.wolves().zapTick(w, .25); dmgNum(p, n * 10, false, "#c8b0ff"); if (w.hp <= 0) C.killWolf(w); S.hits++; }
  function segSphere(o, d, len, c, r) { const lx = c.x - o.x, ly = c.y - o.y, lz = c.z - o.z, t = lx * d.x + ly * d.y + lz * d.z; if (t < 0 || t > len) return -1; const px = lx - d.x * t, py = ly - d.y * t, pz = lz - d.z * t; return px * px + py * py + pz * pz < r * r ? t : -1; }
  const tmp = new V3(), tmp2 = new V3(), dirT = new V3();
  function stepBolt(b, dt) { const len = b.v.length() * dt; dirT.copy(b.v).normalize(); const o = b.m.position; let best = len, kind = null, obj = null;
    const bh = C.boss.on ? C.BX.aim(o, dirT, len) : null; if (bh && bh.t < best) { best = bh.t; kind = "boss"; obj = bh; }
    for (const w of C.fuds) { if (w.st === "rise" || w.st === "leave") continue; const t = segSphere(o, dirT, best, w.c, IS_TOUCH ? .9 : .8); if (t >= 0) { best = t; kind = "wolf"; obj = w; } }
    for (const c of C.critters) { const t = segSphere(o, dirT, best, c.s.position, .6); if (t >= 0) { best = t; kind = "crit"; obj = c; } }
    const an = C.ANI && C.ANI(); if (an) { const a = an.aim(o, dirT, best); if (a) { best = 0; kind = "ani"; obj = a; } }
    // voxels (fine steps)
    if (!kind || best > .3) { const n = Math.ceil(best / .35); for (let i = 1; i <= n; i++) { const t = best * i / n; tmp.copy(o).addScaledVector(dirT, t); if (C.get(Math.floor(tmp.x), Math.floor(tmp.y), Math.floor(tmp.z))) { best = t; kind = "wall"; break; } } }
    o.addScaledVector(dirT, best); if (!kind) return false; const col = b.lv >= 2 ? 0xff7ad0 : 0x28dcff, B = CF.blaster[b.lv];
    if (kind === "boss") hitBoss(B.dmg, obj.weak, o, null); else if (kind === "wolf") hitWolf(obj, B.wolf, o); else if (kind === "crit") C.zapCritter(obj); else if (kind === "ani") an.startle(obj);
    C.burst(o.x, o.y, o.z, [col, 0xffffff, kind === "boss" && obj.weak ? 0xffd24a : col], IS_TOUCH ? 6 : 10, 3.2); flash(o, kind === "boss" && obj.weak ? 0xffd24a : col, kind === "wall" ? .6 : 1.1, .1); C.sfx.bhit && kind === "boss" && Math.random() < .5 && C.sfx.bhit(); return true; }
  // aim point under the reticle (+ touch aim assist)
  function assistTarget() { const b = C.boss, w = innerWidth, h = innerHeight, R = CF.assist.radius * Math.min(w, h); let best = null, bs = 1e9; const cand = [];
    if (b.on && !b.dying && b.intro <= 0) { cand.push([b.eye.getWorldPosition(new V3()), b.expose > 0 ? 60 : 18]); const c = b.g.position.clone(); if (C.bossCenter) c.y += C.bossCenter(); cand.push([c, 0]); }
    for (const f of C.fuds) if (f.st !== "rise" && f.st !== "leave") cand.push([f.c.clone(), 5]);
    for (const [p, bonus] of cand) { pv.copy(p).project(camera); if (pv.z > 1 || pv.z < -1) continue; const sx = pv.x * w / 2, sy = pv.y * h / 2, d = Math.hypot(sx, sy); if (d > R) continue; const sc = d - bonus; if (sc < bs) { bs = sc; best = { p, nx: pv.x, ny: pv.y }; } } return best; }
  function fire() { const lv = Math.max(1, C.blastLv()), B = CF.blaster[lv]; const ray = C.aimRay(), muzzle = (C.view() === 0 ? FP : TP).blaster.tip.getWorldPosition(new V3());
    let aimP = null; if (IS_TOUCH) { const t = assistTarget(); S.assistT = t; if (t) { aimP = t.p; const k = CF.assist.nudge, m = CF.assist.maxNudge, hf = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect); C.nudge(Math.max(-m, Math.min(m, -t.nx * hf * k)), Math.max(-m, Math.min(m, t.ny * camera.fov * Math.PI / 360 * k))); } }
    if (!aimP) { let T = 60; const bh = C.boss.on ? C.BX.aim(ray.o, ray.d, 60) : null; if (bh) T = Math.min(T, bh.t); const vt = C.rayT(ray.o, ray.d, 60); if (vt != null) T = Math.min(T, vt); aimP = ray.o.clone().addScaledVector(ray.d, Math.max(2, T)); }
    const d = aimP.clone().sub(muzzle).normalize(), bo = getBolt(lv); bo.m.position.copy(muzzle); bo.m.lookAt(muzzle.clone().add(d)); bolts.push({ ...bo, v: d.multiplyScalar(CF.speed), l: CF.life, lv });
    flash(muzzle, lv >= 2 ? 0xff9ad8 : 0x9df7ff, .55, .07); S.recoil = 1; S.heat += B.heat; S.coolT = CF.coolDelay; S.shots++; C.sfx.blast && C.sfx.blast(lv);
    if (S.heat >= 100) { S.heat = 100; S.over = CF.overLock; C.pop("🔥 BLASTER OVERHEATED!", "#ff8a3a"); C.sfx.overheat && C.sfx.overheat(); } }
  function punch() { const M = CF.melee, fwd = C.aimRay().d, fx = fwd.x, fz = fwd.z, fl = Math.hypot(fx, fz) || 1, ux = fx / fl, uz = fz / fl; S.punchT = .28; S.punchCd = M.every; C.sfx.punch && C.sfx.punch();
    const hx = P.x + ux * 1.2, hz = P.z + uz * 1.2, hy = P.y + 1.1; ring(hx, P.y, hz, 0x28dcff, 2.2, .3); C.burst(hx, hy, hz, [0x28dcff, 0xffffff], IS_TOUCH ? 6 : 12, 3); let hit = false;
    const b = C.boss; if (b.on && !b.dying && b.intro <= 0) { const wp = b.eye.getWorldPosition(tmp), c = b.g.position.clone(); if (C.bossCenter) c.y += C.bossCenter(); const R = C.bossR ? C.bossR() : 2.4;
      const inFront = (p, r) => { const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz); return d < M.range + r && (dx * ux + dz * uz) > -.3 * d && Math.abs(p.y - hy) < 2.6 + r; };
      if (inFront(wp, .5)) { hitBoss(M.dmg, true, wp, null); hit = true; } else if (inFront(c, R)) { hitBoss(M.dmg, false, c, "#9df7ff"); hit = true; } }
    for (const w of C.fuds.slice()) { if (w.st === "rise" || w.st === "leave") continue; const dx = w.x - P.x, dz = w.z - P.z, d = Math.hypot(dx, dz); if (d < M.range && dx * ux + dz * uz > -.2 * d) { hitWolf(w, M.wolf, w.c); hit = true; } }
    for (const c of C.critters.slice()) if (c.s.position.distanceTo(tmp2.set(hx, hy, hz)) < 1.8) { C.zapCritter(c); hit = true; }
    if (hit) { C.shake(.18); C.buzz && C.buzz(25); } }
  // ---------------- powers ----------------
  function power(id) { const D = POWERS[id]; if (!D) return false; if ((S.powCd[id] || 0) > 0) { C.pop(`${D.name} · ${Math.ceil(S.powCd[id])}s`, "#cfd8ff"); return false; } S.powCd[id] = D.cd; C.sfx.power && C.sfx.power(id); const b = C.boss;
    if (id === "slam") { P.vy = Math.min(P.vy, 0); ring(P.x, P.y, P.z, D.col, 5, .45); ring(P.x, P.y, P.z, 0xff3a5a, 3.5, .35); C.burst(P.x, P.y + .3, P.z, [0x14f195, 0xff3a5a, 0xffffff], IS_TOUCH ? 30 : 60, 8); C.shake(.6); C.buzz && C.buzz(70);
      if (b.on && !b.dying && b.intro <= 0) { const c = b.g.position, R = C.bossR ? C.bossR() : 2.4; if (Math.hypot(c.x - P.x, c.z - P.z) < 5 + R * .6 && Math.abs(c.y - P.y) < 7) hitBoss(30, false, c.clone().setY(c.y + 1), D.css); }
      for (const w of C.fuds.slice()) if (Math.hypot(w.x - P.x, w.z - P.z) < 5) hitWolf(w, 5, w.c); }
    else if (id === "storm") { const T = []; if (b.on && !b.dying && b.intro <= 0 && Math.hypot(b.g.position.x - P.x, b.g.position.z - P.z) < 24) { T.push("boss", "boss"); }
      for (const w of C.fuds.filter(w => w.st !== "rise" && w.st !== "leave").sort((a, c) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(c.x - P.x, c.z - P.z))) if (T.length < 4) T.push(w);
      if (!T.length) { C.pop("STORM RING · NO TARGETS IN RANGE", "#c08aff"); S.powCd[id] = 1.5; return false; }
      T.forEach((t, i) => setTimeout(() => { if (t === "boss") { if (!b.on || b.dying) return; const wp = b.eye.getWorldPosition(new V3()); C.bolt(wp.x, wp.z, D.col); hitBoss(14, b.expose > 0, wp, D.css); } else if (C.fuds.includes(t)) { C.bolt(t.x, t.z, D.col); hitWolf(t, 5, t.c); } }, 140 * i)); }
    else if (id === "dash") { const f = C.aimRay().d, l = Math.hypot(f.x, f.z) || 1; S.dash = { ux: f.x / l, uz: f.z / l, left: 8, hit: new Set() }; S.dashT = .2; S.iT = .6; P.hurtCD = Math.max(P.hurtCD, .6); P.vy = Math.max(P.vy, 2); flash(new V3(P.x, P.y + 1, P.z), D.col, 2.4, .2); }
    return true; }
  function updDash(dt) { if (!S.dash) return; const D = S.dash, step = Math.min(D.left, 40 * dt); D.left -= step; C.move(D.ux * step, D.uz * step); C.burst(P.x, P.y + .8, P.z, [0xffd24a, 0xb46aff], 3, 1.5);
    const b = C.boss; if (b.on && !b.dying && b.intro <= 0 && !D.hit.has("boss")) { const c = b.g.position, R = C.bossR ? C.bossR() : 2.4; if (Math.hypot(c.x - P.x, c.z - P.z) < R + 1.2) { D.hit.add("boss"); hitBoss(18, false, c.clone().setY(c.y + 1.5), "#ffd24a"); } }
    for (const w of C.fuds.slice()) if (!D.hit.has(w) && Math.hypot(w.x - P.x, w.z - P.z) < 1.8) { D.hit.add(w); hitWolf(w, 5, w.c); }
    if (D.left <= 0) S.dash = null; }
  // ---------------- per-frame ----------------
  function update(dt, firing0, active) { const firing = firing0 || S.tapQ; S.tapQ = false; S.iT = Math.max(0, S.iT - dt); for (const k in S.powCd) S.powCd[k] = Math.max(0, S.powCd[k] - dt); updDash(dt);
    if (S.over > 0) { S.over -= dt; S.heat = Math.max(0, S.heat - dt * 60); if (S.over <= 0) S.heat = Math.min(S.heat, 30); } else if ((S.coolT -= dt) <= 0) S.heat = Math.max(0, S.heat - dt * CF.cool);
    S.fireT -= dt; S.punchCd -= dt; S.punchT = Math.max(0, S.punchT - dt); S.recoil = Math.max(0, S.recoil - dt * 9);
    if (active && S.weapon === 2 && firing && S.over <= 0 && S.fireT <= 0) { S.fireT = CF.blaster[Math.max(1, C.blastLv())].every; fire(); }
    if (active && S.weapon === 1 && firing && S.punchCd <= 0) punch();
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.l -= dt; if (stepBolt(b, dt) || b.l <= 0) { scene.remove(b.m); pool.push({ m: b.m, s: b.s }); bolts.splice(i, 1); } }
    for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.t += dt; const k = f.t / f.life; f.sp.material.opacity = 1 - k; f.sp.scale.setScalar(f.s * (1 + k * .6)); if (k >= 1) { scene.remove(f.sp); f.sp.material.dispose(); flashes.splice(i, 1); } }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const k = r.t / r.life; r.m.scale.setScalar(.2 + k * r.R); r.m.material.opacity = 1 - k; if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); } }
    updNums(dt);
    // models: third person hand or first person view model
    const fp = C.view() === 0, show = C.showGear(); TP.blaster.g.visible = !fp && show && S.weapon === 2; TP.glove.g.visible = !fp && show && S.weapon === 1; FP.blaster.g.visible = fp && show && S.weapon === 2; FP.glove.g.visible = fp && show && S.weapon === 1;
    for (const M of [TP.blaster, FP.blaster]) { M.crys.rotation.y += dt * 3; M.crys.material.emissiveIntensity = 1.2 + S.heat / 60; M.crys.material.emissive.setHex(S.over > 0 ? 0xff5a20 : S.heat > 70 ? 0xffa040 : C.blastLv() >= 2 ? 0xff4fd8 : 0x28dcff); M.body.position.z = -S.recoil * .05; }
    FP.glove.g.position.z = -.5 - (S.punchT > 0 ? Math.sin((1 - S.punchT / .28) * Math.PI) * .35 : 0); }
  function setWeapon(i) { S.weapon = ((i % 3) + 3) % 3; return WEAPONS[S.weapon]; }
  function clear() { for (const b of bolts) scene.remove(b.m); bolts.length = 0; for (const n of nums) n.el.remove(); nums.length = 0; S.heat = 0; S.over = 0; S.dash = null; }
  return { S, update, setWeapon, attach, power, clear, fire, punch, assistTarget, dmgNum, iframes: () => S.iT > 0, WEAPONS, POWERS, CF };
}
