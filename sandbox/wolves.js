// $BOSS Sandbox v0.9.2: FUD WOLVES. Original toon cave wolves (smoky violet fur, glowing eyes, neon ridge + a floating FUD glyph).
// They replace the old FUD clouds: night prowlers on the surface and THE TROGLODYTE FUDDER's summons. Prowl -> crouch telegraph -> lunge, howl.
// Shared geometry/materials + a small model pool so 3-4 wolves stay cheap on iPhone.
export function createWolves(THREE, C) {
  const { scene, P, IS_TOUCH, toon, list } = C, FAIR = IS_TOUCH ? 1.25 : 1, MAX = IS_TOUCH ? 3 : 4;
  const lineM = new THREE.MeshBasicMaterial({ color: 0x0a0414, side: THREE.BackSide });
  const add = (p, geo, mat, x = 0, y = 0, z = 0, ol = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); p.add(m); if (ol) { const o = new THREE.Mesh(geo, lineM); o.scale.setScalar(1 + ol); m.add(o); } return m; };
  const G = { torso: new THREE.SphereGeometry(.36, 14, 10), chest: new THREE.SphereGeometry(.3, 12, 9), belly: new THREE.SphereGeometry(.26, 10, 8), head: new THREE.SphereGeometry(.22, 14, 10),
    snout: new THREE.CylinderGeometry(.07, .115, .3, 8).rotateX(Math.PI / 2), nose: new THREE.SphereGeometry(.045, 8, 6), jaw: new THREE.BoxGeometry(.13, .045, .24).translate(0, 0, .12),
    ear: new THREE.ConeGeometry(.088, .25, 4), eye: new THREE.SphereGeometry(.042, 8, 6), spike: new THREE.ConeGeometry(.055, .2, 5), leg: new THREE.CapsuleGeometry(.075, .33, 3, 6).translate(0, -.2, 0),
    tail: new THREE.SphereGeometry(.11, 10, 8).scale(.9, .9, 2.7).rotateX(-.55).translate(0, -.1, -.26), tip: new THREE.SphereGeometry(.085, 8, 6), ring: new THREE.RingGeometry(.25, .95, 28).rotateX(-Math.PI / 2) };
  const M = { fur: toon(0x342a52, 0x160c2c, .35), belly: toon(0x8a78b8, 0x2a1a48, .3), ridge: toon(0xc07aff, 0x9945ff, 1.1), nose: new THREE.MeshBasicMaterial({ color: 0x0a0610 }), mouth: toon(0x7a1838, 0x3a0818, .5),
    eyeR: new THREE.MeshBasicMaterial({ color: 0xff3a5a, fog: false }), eyeP: new THREE.MeshBasicMaterial({ color: 0xd080ff, fog: false }) };
  const glowM = c => new THREE.SpriteMaterial({ map: C.glowTex, color: c, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const fudTex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 112; const g = c.getContext("2d"); g.font = "900 64px Orbitron,Verdana,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowBlur = 18; g.shadowColor = "#ff2a5a"; g.fillStyle = "rgba(40,220,255,.55)"; g.fillText("FUD", 124, 58); g.fillStyle = "rgba(255,79,216,.6)"; g.fillText("FUD", 132, 54); g.fillStyle = "#ff5a7a"; g.fillText("FUD", 128, 56); g.shadowBlur = 0; g.fillStyle = "#ffe0e8"; g.fillText("FUD", 128, 56);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  // ---- model: faces +Z ----
  function makeModel(fud = true) { const root = new THREE.Group(), body = new THREE.Group(); body.position.y = .62; root.add(body);
    add(body, G.torso, M.fur, 0, 0, 0, .06).scale.set(.95, .85, 1.6); add(body, G.chest, M.belly, 0, .0, .42, .06); add(body, G.belly, M.belly, 0, -.15, .05).scale.set(1, .6, 1.7);
    for (let i = 0; i < 3; i++) add(body, G.spike, M.ridge, 0, .3 - i * .03, .32 - i * .26).rotation.x = -.5;
    const head = new THREE.Group(); head.position.set(0, .2, .6); body.add(head);
    add(head, G.head, M.fur, 0, 0, 0, .06).scale.set(1, .9, 1.05); add(head, G.snout, M.belly, 0, -.05, .25); add(head, G.nose, M.nose, 0, -.01, .4);
    const jaw = new THREE.Group(); jaw.position.set(0, -.11, .12); head.add(jaw); add(jaw, G.jaw, M.mouth);
    for (const s of [-1, 1]) { const e = add(head, G.ear, M.fur, s * .11, .21, -.03); e.rotation.z = -s * .28; const ey = add(head, G.eye, fud ? M.eyeR : M.eyeP, s * .095, .055, .17); ey.scale.set(1.35, .7, 1); ey.rotation.z = s * .35; }
    const eg = new THREE.Sprite(glowM(fud ? 0xff3a5a : 0xb070ff)); eg.scale.set(.55, .3, 1); eg.position.set(0, .06, .22); head.add(eg);
    const tail = new THREE.Group(); tail.position.set(0, .14, -.55); body.add(tail); add(tail, G.tail, M.fur); add(tail, G.tip, M.ridge, 0, -.25, -.5);
    const legs = []; for (const [x, z] of [[-.17, .36], [.17, .36], [-.17, -.36], [.17, -.36]]) { const l = new THREE.Group(); l.position.set(x, -.1, z); body.add(l); add(l, G.leg, M.fur); legs.push(l); }
    let glyph = null; if (fud) { glyph = new THREE.Sprite(new THREE.SpriteMaterial({ map: fudTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); glyph.scale.set(.62, .27, 1); glyph.position.set(0, 1.28, 0); root.add(glyph); }
    const portal = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0x9945ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); portal.position.y = .04; root.add(portal);
    return { root, body, head, jaw, tail, legs, eg, glyph, portal }; }
  const pool = []; const getModel = () => pool.pop() || makeModel(true);
  // ---- helpers ----
  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  let howlCd = 0;
  function spawn(x, y, z, o = {}) { if (list.length >= MAX) return false; const gy = C.groundAt(x, y + 2, z); if (gy == null) return false; const m = getModel();
    m.root.position.set(x, gy, z); m.root.scale.setScalar(.01); m.root.rotation.y = Math.atan2(P.x - x, P.z - z); m.root.visible = true; scene.add(m.root);
    const w = { m, s: m.root, x, y: gy, z, vy: 0, st: "rise", t: 0, hp: 1.1, cd: 1.5 + Math.random() * 1.5, orbit: Math.random() * 6.28, dir: Math.random() < .5 ? 1 : -1, ph: Math.random() * 6, spd: 0, hitT: 0, howlT: 8 + Math.random() * 8, bit: false, c: new THREE.Vector3(), boss: !!o.boss };
    list.push(w); if (C.burst) C.burst(x, gy + .3, z, [0x9945ff, 0xff3a5a, 0x28dcff], IS_TOUCH ? 12 : 22, 3); return w; }
  function free(w) { scene.remove(w.m.root); w.m.portal.material.opacity = 0; pool.push(w.m); const i = list.indexOf(w); if (i >= 0) list.splice(i, 1); }
  function step(w, dx, dz, dt) { const nx = w.x + dx * dt, nz = w.z + dz * dt; let ok = false;
    const gx = C.groundAt(nx, w.y + 1.1, w.z); if (gx != null && gx - w.y < 1.15 && w.y - gx < 3.5 && C.inArena(nx, w.z)) { w.x = nx; ok = true; }
    const gz = C.groundAt(w.x, w.y + 1.1, nz); if (gz != null && gz - w.y < 1.15 && w.y - gz < 3.5 && C.inArena(w.x, nz)) { w.z = nz; ok = true; }
    const g = C.groundAt(w.x, w.y + 1.1, w.z); if (g != null) { if (g > w.y) { w.y += Math.min(g - w.y, dt * 9); w.vy = 0; } else if (g < w.y - .02) { w.vy -= 22 * dt; w.y = Math.max(g, w.y + w.vy * dt); if (w.y === g) w.vy = 0; } else w.vy = 0; } return ok; }
  function face(w, tx, tz, dt, k = 10) { const a = Math.atan2(tx - w.x, tz - w.z); let d = a - w.s.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); w.s.rotation.y += d * Math.min(1, dt * k); }
  function pose(w, time, dt) { const m = w.m, L = m.legs; const k = Math.min(1, dt * 14), lerp = (o, p, v) => { o[p] += (v - o[p]) * k; };
    let by = .62, bx = 0, hx = 0, jw = .05, l0 = 0, l1 = 0, l2 = 0, l3 = 0, tx = .25, ty = Math.sin(time * 6 + w.ph) * .25, eg = .55;
    if (w.st === "prowl" || w.st === "leave") { w.ph += dt * (2 + w.spd * 2.6); const s = Math.sin(w.ph) * Math.min(.75, .2 + w.spd * .13); l0 = s; l3 = s; l1 = -s; l2 = -s; by = .62 + Math.abs(Math.cos(w.ph)) * .04; hx = .08 + Math.sin(w.ph * 2) * .04; ty = Math.sin(time * 9 + w.ph) * .35; }
    else if (w.st === "wind") { const tr = Math.sin(time * 60) * .012; by = .48; bx = .2; hx = -.15; jw = .38 + Math.sin(time * 30) * .05; l0 = l1 = -.55; l2 = l3 = .55; tx = -.1; ty = 0; eg = .9 + Math.sin(time * 25) * .2; m.body.position.x = tr; }
    else if (w.st === "lunge") { const u = w.t / w.dur; bx = -.35 + u * .6; by = .66; jw = .75; l0 = l1 = -1.15; l2 = l3 = 1.05; tx = .6; ty = 0; eg = 1; }
    else if (w.st === "howl") { const u = Math.min(1, w.t / .35); by = .62 - .14 * u; bx = -.55 * u; hx = -.85 * u; jw = .25 + .3 * u + Math.sin(time * 14) * .06 * u; l0 = l1 = .35 * u; l2 = l3 = -1.25 * u; tx = -.3; ty = Math.sin(time * 4) * .1; eg = .8; }
    else if (w.st === "recover") { by = .6; hx = .1 + Math.sin(time * 20) * .05 * Math.max(0, 1 - w.t * 2); jw = .15; }
    if (w.st !== "wind") m.body.position.x = w.hitT > 0 ? Math.sin(time * 70) * .05 : 0;
    lerp(m.body.position, "y", by); lerp(m.body.rotation, "x", bx); lerp(m.head.rotation, "x", hx); lerp(m.jaw.rotation, "x", jw); lerp(L[0].rotation, "x", l0); lerp(L[1].rotation, "x", l1); lerp(L[2].rotation, "x", l2); lerp(L[3].rotation, "x", l3); lerp(m.tail.rotation, "x", tx); m.tail.rotation.y = ty;
    m.eg.scale.set(eg, eg * .55, 1); if (m.glyph) { m.glyph.position.y = 1.28 + Math.sin(time * 3 + w.ph) * .05; m.glyph.material.opacity = (Math.sin(time * 17 + w.ph * 3) > .9 ? .35 : .9) * (w.st === "wind" || w.st === "lunge" ? 1 : .8); m.glyph.position.x = Math.sin(time * 41) > .96 ? .04 : 0; } }
  // ---- update ----
  function update(dt, time, o = {}) { howlCd -= dt; const cx = P.x, cz = P.z, py = P.y;
    for (let i = list.length - 1; i >= 0; i--) { const w = list[i], m = w.m; w.t += dt; w.cd -= dt; w.hitT -= dt; w.howlT -= dt;
      const dx = cx - w.x, dz = cz - w.z, d = Math.hypot(dx, dz), dy = py - w.y;
      if (o.leave && w.st !== "leave" && w.st !== "rise") { w.st = "leave"; w.t = 0; }
      if (d > 50 && w.st !== "rise") { free(w); continue; }
      if (w.st === "rise") { const u = Math.min(1, w.t / .7); m.root.scale.setScalar(.01 + .99 * (1 - (1 - u) ** 3)); m.portal.material.opacity = .85 * (1 - u * .6); face(w, cx, cz, dt);
        if (u >= 1) { w.st = "howl"; w.t = 0; if (howlCd <= 0) { howlCd = 3.5; C.sfx.howl && C.sfx.howl(w.x, w.y, w.z); } } }
      else if (w.st === "howl") { m.portal.material.opacity = Math.max(0, m.portal.material.opacity - dt); face(w, cx, cz, dt, 4); if (w.t > 1.5) { w.st = "prowl"; w.t = 0; } }
      else if (w.st === "prowl") { w.orbit += dt * .55 * w.dir; const R = d > 9 ? 3 : 4.6, tx = cx + Math.cos(w.orbit) * R, tz = cz + Math.sin(w.orbit) * R, ex = tx - w.x, ez = tz - w.z, ed = Math.hypot(ex, ez) || 1;
        // separation from other wolves
        let sx = 0, sz = 0; for (const q of list) if (q !== w) { const qx = w.x - q.x, qz = w.z - q.z, qd = Math.hypot(qx, qz); if (qd < 1.4 && qd > 0) { sx += qx / qd * (1.4 - qd); sz += qz / qd * (1.4 - qd); } }
        const sp = (d > 12 ? 4.6 : 3.1) * (IS_TOUCH ? .9 : 1); w.spd = sp; if (!step(w, ex / ed * sp + sx * 3, ez / ed * sp + sz * 3, dt)) w.dir = -w.dir;
        if (d < 2.5) face(w, cx, cz, dt); else face(w, w.x + ex, w.z + ez, dt, 6);
        if (w.cd <= 0 && d < 6.5 && d > 1.2 && Math.abs(dy) < 2 && !list.some(q => q !== w && (q.st === "wind" || q.st === "lunge"))) { w.st = "wind"; w.t = 0; w.dur = .75 * FAIR; C.sfx.snarl && C.sfx.snarl(w.x, w.y, w.z); }
        else if (w.howlT <= 0 && d > 7) { w.howlT = 12 + Math.random() * 8; w.st = "howl"; w.t = 0; if (howlCd <= 0) { howlCd = 4; C.sfx.howl && C.sfx.howl(w.x, w.y, w.z); } } }
      else if (w.st === "wind") { face(w, cx, cz, dt, 12); w.spd = 0; if (w.t >= w.dur) { const L = Math.min(6.5, d + 1.2), ux = dx / (d || 1), uz = dz / (d || 1); w.st = "lunge"; w.t = 0; w.dur = .5; w.vx = ux * L / w.dur; w.vz = uz * L / w.dur; w.y0 = w.y; w.bit = false; C.sfx.snarl && C.sfx.snarl(w.x, w.y, w.z, 1); } }
      else if (w.st === "lunge") { const u = Math.min(1, w.t / w.dur); step(w, w.vx, w.vz, dt); const arc = Math.sin(u * Math.PI) * 1.0; m.root.position.y = w.y + arc;
        const hx = w.x + Math.sin(w.s.rotation.y) * .6, hz = w.z + Math.cos(w.s.rotation.y) * .6, hd = Math.hypot(cx - hx, cz - hz), vy = (py + .9) - (w.y + arc + .7);
        if (!w.bit && hd < .85 && Math.abs(vy) < 1.3) { w.bit = true; C.bite(w, hx, hz); }
        if (u >= 1) { w.st = "recover"; w.t = 0; w.cd = 2.3 + Math.random() * 1.6 + (IS_TOUCH ? .6 : 0); } }
      else if (w.st === "recover") { w.spd = 0; if (w.t > .9) { w.st = "prowl"; w.t = 0; } }
      else if (w.st === "leave") { const u = Math.min(1, w.t / .7); m.root.scale.setScalar(Math.max(.01, 1 - u)); m.portal.material.opacity = .8 * Math.sin(u * Math.PI); if (u >= 1) { free(w); continue; } }
      if (w.st !== "lunge") m.root.position.y = w.y; m.root.position.x = w.x; m.root.position.z = w.z;
      w.c.set(w.x, w.y + .62 + (w.st === "lunge" ? Math.sin(Math.min(1, w.t / w.dur) * Math.PI) : 0), w.z);
      if (d < 38) pose(w, time, dt); } }
  // the drill is on it: shake, and a long zap interrupts a crouch
  function zapTick(w, dt) { w.hitT = .12; if (w.st === "wind" && (w.stag = (w.stag || 0) + dt) > .35) { w.st = "recover"; w.t = 0; w.stag = 0; w.cd = 1.6; } }
  // small gem loot: three little crystals hop out, bounce, then fly to you as shards
  const fx = [], gemM = {};
  function kill(w) { const p = w.c.clone(); const ids = [8, 9, 18]; for (let i = 0; i < 3; i++) { const id = ids[i], col = { 8: 0xb070ff, 9: 0x3cffc0, 18: 0xffd24a }[id], mat = gemM[id] || (gemM[id] = toon(col, col, .9));
      const g = new THREE.Mesh(C.gemGeo ? C.gemGeo(id) : new THREE.OctahedronGeometry(.2), mat); g.scale.setScalar(1.1); g.position.copy(p); scene.add(g); const a = i / 3 * 6.28 + Math.random();
      fx.push({ g, t: 0, v: new THREE.Vector3(Math.cos(a) * 2.2, 5 + Math.random() * 2, Math.sin(a) * 2.2), col }); }
    free(w); return p; }
  function fxTick(dt) { for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; f.v.y -= 16 * dt; f.g.position.addScaledVector(f.v, dt); f.g.rotation.y += dt * 6; const gy = (C.groundAt(f.g.position.x, f.g.position.y + .5, f.g.position.z) ?? f.g.position.y - 1) + .15;
      if (f.g.position.y < gy) { f.g.position.y = gy; f.v.y = Math.abs(f.v.y) * .4; f.v.x *= .6; f.v.z *= .6; } if (f.t > 1.3) { scene.remove(f.g); C.spawnOrbs(f.g.position.x, f.g.position.y + .3, f.g.position.z, 1, f.col); fx.splice(i, 1); } } }
  function clear() { for (let i = list.length - 1; i >= 0; i--) free(list[i]); }
  return { spawn, update: (dt, time, o) => { update(dt, time, o); fxTick(dt); }, zapTick, kill, clear, makeModel, MAX, fx };
}
