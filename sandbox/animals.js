// $BOSS Sandbox v0.9.4: ANIMALS. Original toon wildlife in the neon-natural style: deer in the meadows, rabbits, foxes,
// bird flocks overhead, glowing fish in the neon pools, owls on the treetops at night and a few neutral wild wolves in the grove.
// Simple AI (wander, graze, flee if you rush them, flocking birds), pet them with BUILD. No hunting: the drill only startles them.
// Low counts, shared geometry/materials, model pools and distance LOD keep iPhone frame rates up.
export function createAnimals(THREE, C) {
  const { scene, P, IS_TOUCH, toon } = C, V3 = THREE.Vector3;
  const LODF = IS_TOUCH ? { det: 14, pose: 28, vis: 46 } : { det: 22, pose: 40, vis: 52 };
  const lineM = new THREE.MeshBasicMaterial({ color: 0x120a1e, side: THREE.BackSide });
  const add = (p, geo, mat, x = 0, y = 0, z = 0, ol = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); p.add(m); if (ol) { const o = new THREE.Mesh(geo, lineM); o.scale.setScalar(1 + ol); m.add(o); } return m; };
  const S = (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);
  const G = { s10: S(1, 12, 9), s6: S(1, 8, 6), cap: new THREE.CapsuleGeometry(1, 1, 3, 6), cone: new THREE.ConeGeometry(1, 1, 6), cyl: new THREE.CylinderGeometry(1, 1, 1, 6), box: new THREE.BoxGeometry(1, 1, 1),
    leg: new THREE.CapsuleGeometry(.05, .56, 3, 6).translate(0, -.33, 0), legS: new THREE.CapsuleGeometry(.06, .3, 3, 6).translate(0, -.18, 0), wing: new THREE.BoxGeometry(.34, .02, .16).translate(.17, 0, 0), fin: new THREE.ConeGeometry(.09, .16, 4).rotateX(-Math.PI / 2).scale(1, .35, 1) };
  const basic = c => new THREE.MeshBasicMaterial({ color: c, fog: false });
  const M = { deer: toon(0xd2a07c, 0x4a1a2a, .18), deerB: toon(0xfff0e4, 0x3a2a30, .1), antler: toon(0xbff8ff, 0x28dcff, .95), dark: toon(0x1e1424, 0x05020a, .1), eye: basic(0x10060a),
    rab: toon(0xf4ecff, 0x3a2a50, .15), rabIn: toon(0xff9ad8, 0xff4fd8, .45), glowW: toon(0xffffff, 0xbff4ff, .9), fox: toon(0xff7a36, 0x6a1a08, .25), foxW: toon(0xfff4ea, 0x3a2a2a, .1),
    bird: toon(0x28dcff, 0x0a4060, .6), wingP: toon(0xff4fd8, 0x8a1a6a, .6), beak: toon(0xffd24a, 0x7a4a00, .5), owl: toon(0x8a6aa8, 0x2a1a40, .25), owlF: toon(0xeee2ff, 0x4a3a6a, .2), owlE: basic(0xffd24a), pupil: basic(0x0a0610),
    fish: [toon(0x3cffc8, 0x3cffc8, .9), toon(0xff7ad0, 0xff4fd8, .9), toon(0xffd24a, 0xffb020, .9), toon(0x9db0ff, 0x6a7aff, .9)] };
  for (const m of M.fish) { m.transparent = true; m.opacity = .82; }
  // ---------------- models (all face +Z) ----------------
  function quad(o) { // shared quadruped rig: root > body > {neck > head, legs[4], tail}
    const root = new THREE.Group(), body = new THREE.Group(); body.position.y = o.h; root.add(body); return { root, body, legs: [], neck: null, head: null, tail: null, ears: [] }; }
  function makeDeer(stag) { const m = quad({ h: .95 }), b = m.body; add(b, G.s10, M.deer, 0, 0, 0, .05).scale.set(.34, .32, .62); add(b, G.s10, M.deerB, 0, -.12, .02).scale.set(.27, .2, .5);
    for (let i = 0; i < 6; i++) add(b, G.s6, M.deerB, (i % 2 ? .2 : -.2) * .9, .12 + (i % 3) * .04, -.25 + Math.floor(i / 2) * .22).scale.setScalar(.035); // spots
    const nk = new THREE.Group(); nk.position.set(0, .18, .42); b.add(nk); m.neck = nk; add(nk, G.cyl, M.deer, 0, .2, .08).scale.set(.1, .5, .12); nk.children[0].rotation.x = .45;
    const hd = new THREE.Group(); hd.position.set(0, .45, .22); nk.add(hd); m.head = hd; add(hd, G.s10, M.deer, 0, 0, 0, .06).scale.set(.13, .13, .17); add(hd, G.s10, M.deerB, 0, -.04, .15).scale.set(.075, .07, .1); add(hd, G.s6, M.eye, 0, -.03, .245).scale.setScalar(.03);
    for (const s of [-1, 1]) { add(hd, G.s6, M.eye, s * .09, .04, .09).scale.setScalar(.024); const e = add(hd, G.s6, M.deer, s * .13, .1, -.03); e.scale.set(.04, .1, .025); e.rotation.z = -s * .9; m.ears.push(e);
      if (stag) { const a = new THREE.Group(); a.position.set(s * .06, .12, -.02); a.rotation.z = -s * .35; hd.add(a); add(a, G.cyl, M.antler, 0, .17, 0).scale.set(.022, .34, .022); const t1 = add(a, G.cyl, M.antler, s * .06, .2, .05); t1.scale.set(.016, .16, .016); t1.rotation.set(.5, 0, -s * .8); const t2 = add(a, G.cyl, M.antler, -s * .02, .3, .06); t2.scale.set(.015, .14, .015); t2.rotation.x = .7; add(a, G.s6, M.antler, 0, .35, 0).scale.setScalar(.035); } }
    for (const [x, z] of [[-.16, .38], [.16, .38], [-.16, -.36], [.16, -.36]]) { const l = new THREE.Group(); l.position.set(x, -.08, z); b.add(l); add(l, G.leg, M.deer); m.legs.push(l); }
    const tl = new THREE.Group(); tl.position.set(0, .12, -.6); b.add(tl); add(tl, G.s6, M.deerB, 0, 0, -.04).scale.set(.06, .09, .05); m.tail = tl; return m; }
  function makeRabbit() { const m = quad({ h: .2 }), b = m.body; add(b, G.s10, M.rab, 0, 0, 0, .06).scale.set(.17, .16, .21); add(b, G.s6, M.glowW, 0, .04, -.21).scale.setScalar(.07);
    for (const s of [-1, 1]) add(b, G.s10, M.rab, s * .1, -.07, -.08).scale.set(.06, .1, .12);
    const hd = new THREE.Group(); hd.position.set(0, .13, .16); b.add(hd); m.head = hd; m.neck = hd; add(hd, G.s10, M.rab, 0, 0, 0, .07).scale.set(.12, .11, .12); add(hd, G.s6, M.rabIn, 0, -.02, .115).scale.setScalar(.022);
    for (const s of [-1, 1]) { add(hd, G.s6, M.eye, s * .07, .025, .08).scale.setScalar(.022); const e = new THREE.Group(); e.position.set(s * .045, .08, -.02); e.rotation.z = -s * .15; hd.add(e); add(e, G.s10, M.rab, 0, .12, 0).scale.set(.035, .13, .02); add(e, G.s6, M.rabIn, 0, .12, .012).scale.set(.02, .1, .01); m.ears.push(e); }
    for (const [x, z] of [[-.06, .12], [.06, .12], [-.1, -.08], [.1, -.08]]) { const l = new THREE.Group(); l.position.set(x, -.08, z); b.add(l); add(l, G.legS, M.rab).scale.setScalar(.5); m.legs.push(l); } return m; }
  function makeFox() { const m = quad({ h: .42 }), b = m.body; add(b, G.s10, M.fox, 0, 0, 0, .06).scale.set(.17, .17, .36); add(b, G.s10, M.foxW, 0, -.05, .2).scale.set(.13, .13, .14);
    const hd = new THREE.Group(); hd.position.set(0, .14, .36); b.add(hd); m.head = hd; m.neck = hd; add(hd, G.s10, M.fox, 0, 0, 0, .07).scale.set(.13, .12, .13); const sn = add(hd, G.cone, M.foxW, 0, -.03, .17); sn.scale.set(.07, .17, .06); sn.rotation.x = Math.PI / 2; add(hd, G.s6, M.dark, 0, -.03, .26).scale.setScalar(.022);
    for (const s of [-1, 1]) { add(hd, G.s6, M.eye, s * .065, .03, .1).scale.set(.024, .016, .02); const e = add(hd, G.cone, M.fox, s * .075, .14, -.01); e.scale.set(.055, .13, .03); e.rotation.z = -s * .2; m.ears.push(e); }
    for (const [x, z] of [[-.08, .2], [.08, .2], [-.08, -.2], [.08, -.2]]) { const l = new THREE.Group(); l.position.set(x, -.08, z); b.add(l); add(l, G.legS, M.dark); m.legs.push(l); }
    const tl = new THREE.Group(); tl.position.set(0, .05, -.33); b.add(tl); const tt = add(tl, G.s10, M.fox, 0, -.06, -.2); tt.scale.set(.09, .09, .26); tt.rotation.x = -.4; add(tl, G.s6, M.glowW, 0, -.15, -.42).scale.setScalar(.075); m.tail = tl; return m; }
  function makeBird() { const root = new THREE.Group(); root.scale.setScalar(IS_TOUCH ? 1.9 : 1.7); /* reads clearly as a flock overhead */ add(root, G.s6, M.bird, 0, 0, 0).scale.set(.08, .08, .15); add(root, G.s6, M.bird, 0, .05, .11).scale.setScalar(.06); const bk = add(root, G.cone, M.beak, 0, .045, .18); bk.scale.set(.02, .06, .02); bk.rotation.x = Math.PI / 2;
    const wl = new THREE.Group(), wr = new THREE.Group(); root.add(wl, wr); add(wl, G.wing, M.wingP).scale.set(1, 1, 1); add(wr, G.wing, M.wingP).scale.set(-1, 1, 1); add(root, G.box, M.wingP, 0, 0, -.16).scale.set(.1, .015, .1); return { root, wl, wr }; }
  function makeOwl() { const root = new THREE.Group(), body = new THREE.Group(); root.add(body); add(body, G.s10, M.owl, 0, .25, 0, .06).scale.set(.2, .26, .18);
    const hd = new THREE.Group(); hd.position.set(0, .5, 0); body.add(hd); add(hd, G.s10, M.owl, 0, 0, 0, .06).scale.set(.17, .15, .15); add(hd, G.s10, M.owlF, 0, -.01, .09).scale.set(.15, .12, .07);
    const eyes = []; for (const s of [-1, 1]) { const e = add(hd, G.s6, M.owlE, s * .065, .01, .15); e.scale.setScalar(.05); add(e, G.s6, M.pupil, 0, 0, .7).scale.setScalar(.5); eyes.push(e); const t = add(hd, G.cone, M.owl, s * .1, .14, 0); t.scale.set(.04, .1, .03); t.rotation.z = -s * .4; }
    const bk = add(hd, G.cone, M.beak, 0, -.05, .16); bk.scale.set(.025, .06, .025); bk.rotation.x = Math.PI * .65;
    const wl = new THREE.Group(), wr = new THREE.Group(); wl.position.set(-.18, .32, 0); wr.position.set(.18, .32, 0); body.add(wl, wr); add(wl, G.s10, M.owl, -.02, -.08, 0).scale.set(.05, .17, .13); add(wr, G.s10, M.owl, .02, -.08, 0).scale.set(.05, .17, .13);
    return { root, body, head: hd, eyes, wl, wr }; }
  function makeFish(i) { const root = new THREE.Group(), mat = M.fish[i % M.fish.length]; add(root, G.s6, mat, 0, 0, 0).scale.set(.1, .14, .32); const t = add(root, G.fin, mat, 0, 0, -.34); t.scale.setScalar(1.6);
    root.traverse(o => { o.renderOrder = 3; }); return { root, tail: t }; } // drawn after the (transparent) pool surface so the glow reads through the water
  const MAKE = { deer: () => makeDeer(Math.random() < .5), rabbit: makeRabbit, fox: makeFox, wolf: () => C.wolfModel() };
  const SP = { deer: { flee: 9, calm: 2.6, walk: 1.5, run: 7.5, h: 1.1, name: "DEER" }, rabbit: { flee: 6, calm: 2.1, walk: 1.3, run: 6.5, h: .45, name: "RABBIT" }, fox: { flee: 7, calm: 2.4, walk: 1.7, run: 6.5, h: .6, name: "FOX" }, wolf: { flee: 0, calm: 99, walk: 1.6, run: 4, h: .9, name: "WILD WOLF" } };
  const pools = { deer: [], rabbit: [], fox: [], wolf: [] }; const land = [], birds = [], fishes = [], owls = [];
  const cap = { land: IS_TOUCH ? 6 : 9, birds: IS_TOUCH ? 5 : 8, fish: IS_TOUCH ? 2 : 3, owls: IS_TOUCH ? 1 : 2 };
  let spawnT = 1, flock = null, sndT = 6, pvx = P.x, pvz = P.z, pspd = 0;
  // ---------------- land animals ----------------
  function pickSpecies(bn) { const r = Math.random(); if (bn === "SIGNAL GROVE") return r < .3 ? "deer" : r < .55 ? "fox" : r < .7 && !land.some(a => a.k === "wolf") ? "wolf" : "rabbit";
    if (bn === "NEON FLATS") return r < .45 ? "deer" : r < .85 ? "rabbit" : "fox"; if (bn === "PUMP DUNES") return r < .6 ? "rabbit" : "fox"; if (bn === "FROST CHAIN") return r < .5 ? "fox" : r < .8 ? "rabbit" : "deer";
    if (bn === "MOON BASIN") return "rabbit"; return r < .5 ? "fox" : null; }
  function spawnLand(k, x, z, o = {}) { const y = C.surface(x, z); if (y == null || C.inWater(x, z)) return null; const md = pools[k].pop() || MAKE[k](); md.root.position.set(x, y, z); md.root.rotation.y = Math.random() * 6.28; md.root.scale.setScalar(k === "deer" ? .95 + Math.random() * .15 : 1); scene.add(md.root);
    const a = { k, m: md, x, y, z, vy: 0, st: "idle", t: 0, dur: 1 + Math.random() * 3, tx: x, tz: z, ph: Math.random() * 6, spd: 0, happy: 0, petCd: 0, c: new V3(), pack: o.pack || null, hx: x, hz: z }; land.push(a); return a; }
  function freeLand(a) { scene.remove(a.m.root); pools[a.k].push(a.m); land.splice(land.indexOf(a), 1); }
  function step(a, vx, vz, dt) { const ok = (x, z, g) => g != null && g - a.y < 1.1 && a.y - g < 2.6 && !C.inWater(x, z); let nx = a.x + vx * dt, nz = a.z + vz * dt, g = C.groundAt(nx, a.y + 1.2, nz), moved = true;
    if (!ok(nx, nz, g)) { moved = false; g = C.groundAt(nx, a.y + 1.2, a.z); if (ok(nx, a.z, g)) { a.x = nx; moved = true; } else { g = C.groundAt(a.x, a.y + 1.2, nz); if (ok(a.x, nz, g)) { a.z = nz; moved = true; } else g = null; } } else { a.x = nx; a.z = nz; }
    if (g != null) { if (g > a.y) a.y += Math.min(g - a.y, dt * 8); else if (g < a.y) { a.vy -= 20 * dt; a.y = Math.max(g, a.y + a.vy * dt); if (a.y === g) a.vy = 0; } } return moved; }
  function face(a, dx, dz, dt, k = 6) { if (Math.abs(dx) + Math.abs(dz) < 1e-4) return; const t = Math.atan2(dx, dz); let d = t - a.m.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); a.m.root.rotation.y += d * Math.min(1, dt * k); }
  function poseLand(a, time, dt) { const m = a.m, L = m.legs, k = Math.min(1, dt * 12), lr = (o, p, v) => { o[p] += (v - o[p]) * k; }; const sp = a.spd, run = sp > 3;
    let nx = 0, hx = 0, by = 0, bx = 0, sw = 0, ear = 0;
    if (a.k === "rabbit") { const hop = sp > .2 ? Math.abs(Math.sin(a.ph)) : 0; a.ph += dt * (sp > .2 ? 9 + sp * 1.2 : 0); by = hop * (run ? .35 : .18); bx = sp > .2 ? -Math.cos(a.ph) * .25 : 0; sw = sp > .2 ? Math.sin(a.ph) * .8 : 0; if (a.st === "graze") { nx = .3; ear = Math.sin(time * 9 + a.ph) * .15; } }
    else { if (sp > .1) { a.ph += dt * (run ? 11 : 4 + sp * 2.2); sw = Math.sin(a.ph) * (run ? .9 : .5); by = Math.abs(Math.cos(a.ph)) * (run ? .09 : .03); if (run) bx = Math.sin(a.ph) * .08; }
      if (a.st === "graze") nx = a.k === "deer" ? 1.15 : .5; else if (a.st === "alert" || a.st === "watch") { nx = -.25; ear = .25; } else if (a.st === "sit") { bx = -.3; by = -.1; } }
    if (a.happy > 0) { by += Math.abs(Math.sin(a.happy * 14)) * .22; ear = Math.sin(a.happy * 20) * .3; }
    lr(m.body.position, "y", (a.k === "deer" ? .95 : a.k === "rabbit" ? .2 : a.k === "fox" ? .42 : .62) + by); lr(m.body.rotation, "x", bx);
    if (m.neck) lr(m.neck.rotation, "x", nx); if (m.head && m.head !== m.neck) lr(m.head.rotation, "x", hx);
    if (L.length === 4) { if (a.k === "rabbit") { lr(L[0].rotation, "x", -sw * .6); lr(L[1].rotation, "x", -sw * .6); lr(L[2].rotation, "x", sw); lr(L[3].rotation, "x", sw); }
      else if (run && a.k !== "wolf") { lr(L[0].rotation, "x", sw); lr(L[1].rotation, "x", sw * .8); lr(L[2].rotation, "x", -sw); lr(L[3].rotation, "x", -sw * .8); }
      else { lr(L[0].rotation, "x", sw); lr(L[3].rotation, "x", sw); lr(L[1].rotation, "x", -sw); lr(L[2].rotation, "x", -sw); } }
    if (m.tail) m.tail.rotation.y = Math.sin(time * (a.happy > 0 ? 18 : 3) + a.ph) * (a.happy > 0 ? .6 : .2);
    if (m.ears) for (const e of m.ears) e.rotation.x = ear; if (m.jaw) lr(m.jaw.rotation, "x", a.st === "growl" ? .35 : .04); if (m.eg) m.eg.scale.set(.5, .27, 1); }
  function updLand(dt, time, night) { const sp = pspd;
    for (let i = land.length - 1; i >= 0; i--) { const a = land[i], S = SP[a.k]; a.t += dt; a.happy = Math.max(0, a.happy - dt); a.petCd -= dt; const dx = a.x - P.x, dz = a.z - P.z, d = Math.hypot(dx, dz);
      if (d > 58) { freeLand(a); continue; }
      const near = Math.abs(P.y - a.y) < 4;
      if (a.k !== "wolf" && a.st !== "flee" && near && ((d < S.flee && sp > S.calm) || d < 1.1 || a.startle)) { a.st = "flee"; a.t = 0; a.dur = 2.2 + Math.random(); a.startle = false; C.sfx.rustle && C.sfx.rustle(a.x, a.y, a.z, a.k); }
      if (a.k === "wolf") { if (d < 4 && near && a.st !== "growl") { a.st = "growl"; a.t = 0; a.dur = 2; if (sndT < 4) C.sfx.growl && C.sfx.growl(a.x, a.y, a.z); } }
      let vx = 0, vz = 0;
      if (a.st === "flee") { const ux = dx / (d || 1), uz = dz / (d || 1); vx = ux * S.run; vz = uz * S.run; a.spd = S.run; if (!step(a, vx, vz, dt)) { const s = Math.random() < .5 ? 1 : -1; step(a, -uz * S.run * s, ux * S.run * s, dt); } face(a, vx, vz, dt, 10); if (a.t > a.dur && d > S.flee) { a.st = "idle"; a.t = 0; a.dur = 1 + Math.random() * 2; } }
      else if (a.st === "walk") { const ex = a.tx - a.x, ez = a.tz - a.z, ed = Math.hypot(ex, ez); a.spd = S.walk; if (ed < .4 || a.t > 12) { a.st = Math.random() < .55 ? "graze" : "idle"; a.t = 0; a.dur = 2 + Math.random() * 4; a.spd = 0; }
        else { vx = ex / ed * S.walk; vz = ez / ed * S.walk; if (!step(a, vx, vz, dt)) { a.st = "idle"; a.t = 0; a.dur = 1; } face(a, vx, vz, dt); } }
      else if (a.st === "growl") { a.spd = 0; face(a, -dx, -dz, dt, 5); if (a.t > a.dur) { a.st = "idle"; a.t = 0; a.dur = 1.5; } }
      else { a.spd = 0; if (a.t > a.dur) { if (a.st === "idle" && Math.random() < .25 && a.k !== "rabbit") { a.st = "alert"; a.t = 0; a.dur = 1.2; } else { let ang = Math.random() * 6.28, r = 3 + Math.random() * 7; if (a.pack && a.pack.lead && a.pack.lead !== a) { const L = a.pack.lead; a.tx = L.x + Math.cos(ang) * 2.5; a.tz = L.z + Math.sin(ang) * 2.5; } else { a.tx = a.hx + Math.cos(ang) * r; a.tz = a.hz + Math.sin(ang) * r; } a.st = "walk"; a.t = 0; } } }
      a.m.root.position.set(a.x, a.y, a.z); a.c.set(a.x, a.y + S.h * .6, a.z); if (d < LODF.pose) poseLand(a, time, dt); a.m.root.visible = d < LODF.vis;
      // LOD: ink outlines + eyes only up close (halves draw calls for far animals)
      if (!a.m.ol) { a.m.ol = []; a.m.root.traverse(o => { if (o.material === lineM || o.material === M.eye || o.material === M.pupil) a.m.ol.push(o); }); }
      const lod = d < LODF.det; if (a.m.lod !== lod) { a.m.lod = lod; for (const o of a.m.ol) o.visible = lod; } } }
  // ---------------- birds: one flock of boids circling overhead by day ----------------
  function updBirds(dt, time, night) { const want = night < .45 && !C.underground() ? cap.birds : 0;
    if (!flock && want) { const a = Math.random() * 6.28; flock = { x: P.x + Math.cos(a) * 30, z: P.z + Math.sin(a) * 30, y: 0, h: Math.random() * 6.28, t: 0 }; for (let i = 0; i < want; i++) { const md = makeBird(); scene.add(md.root); birds.push({ m: md, p: new V3(flock.x + Math.random() * 3, 0, flock.z + Math.random() * 3), v: new V3(), ph: Math.random() * 6 }); } }
    if (!flock) return; flock.t += dt; flock.h += dt * (.25 + Math.sin(flock.t * .3) * .2); const R = 16; const cx = P.x + Math.cos(flock.h) * R, cz = P.z + Math.sin(flock.h) * R; flock.x += (cx - flock.x) * Math.min(1, dt * .4); flock.z += (cz - flock.z) * Math.min(1, dt * .4);
    const gy = C.surface(flock.x, flock.z) ?? P.y; flock.y += ((gy + 11 + Math.sin(flock.t * .5) * 2) - flock.y) * Math.min(1, dt * .5); if (!flock.y) flock.y = gy + 13;
    const leave = !want; const tgt = new V3(flock.x, leave ? flock.y + 40 : flock.y, flock.z), tmp = new V3();
    for (let i = birds.length - 1; i >= 0; i--) { const b = birds[i]; tmp.copy(tgt).sub(b.p).multiplyScalar(.9); // cohesion to the flock centre
      for (const o of birds) if (o !== b) { const dd = b.p.distanceTo(o.p); if (dd < 1.4 && dd > 0) tmp.addScaledVector(new V3().subVectors(b.p, o.p), 3 / dd); else if (dd < 5) tmp.addScaledVector(o.v, .08); } // separation + alignment
      b.v.addScaledVector(tmp, dt * .8); const s = b.v.length(), mx = leave ? 14 : 8, mn = 4; if (s > mx) b.v.multiplyScalar(mx / s); else if (s < mn) b.v.multiplyScalar(mn / Math.max(.01, s)); b.p.addScaledVector(b.v, dt);
      b.m.root.position.copy(b.p); b.m.root.rotation.y = Math.atan2(b.v.x, b.v.z); b.m.root.rotation.x = -Math.atan2(b.v.y, Math.hypot(b.v.x, b.v.z)) * .6; b.ph += dt * (b.v.y > .5 ? 22 : 13); const f = Math.sin(b.ph) * .9; b.m.wl.rotation.z = f; b.m.wr.rotation.z = -f;
      if (leave && b.p.y > flock.y + 30) { scene.remove(b.m.root); birds.splice(i, 1); } }
    if (!birds.length) flock = null;
    if (want && (sndT -= dt) <= 0 && birds[0]) { sndT = 5 + Math.random() * 7; const b = birds[(Math.random() * birds.length) | 0].p; C.sfx.chirp && C.sfx.chirp(b.x, b.y, b.z); } }
  // ---------------- fish in the neon pools (they crowd round your bobber) ----------------
  function updFish(dt, time) { const near = C.pools.filter(q => Math.hypot(q.x - P.x, q.z - P.z) < 30).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z)).slice(0, 2);
    for (let i = fishes.length - 1; i >= 0; i--) if (!near.includes(fishes[i].q)) { scene.remove(fishes[i].m.root); fishes.splice(i, 1); }
    for (const q of near) { const have = fishes.filter(f => f.q === q).length; for (let n = have; n < cap.fish; n++) { const md = makeFish(fishes.length + n); scene.add(md.root); fishes.push({ q, m: md, a: Math.random() * 6.28, r: .3 + Math.random() * .45, sp: (.5 + Math.random() * .5) * (Math.random() < .5 ? 1 : -1), dep: .14 + Math.random() * .2, dart: 0, hide: 0, x: q.x, z: q.z }); } }
    const bob = C.bobber(); for (const f of fishes) { const q = f.q; f.hide = Math.max(0, f.hide - dt); f.m.root.visible = f.hide <= 0;
      const pd = Math.hypot(P.x - f.x, P.z - f.z); if (pd < 1.6 && f.dart <= 0) f.dart = 1.2; f.dart -= dt; const spd = f.dart > 0 ? 3.2 : 1;
      let tx, tz; if (bob && Math.hypot(bob.x - q.x, bob.z - q.z) < Math.max(q.rx, q.rz) + .5) { f.a += dt * spd * f.sp * 1.6; tx = bob.x + Math.cos(f.a) * (.45 + f.r * .4); tz = bob.z + Math.sin(f.a) * (.45 + f.r * .4); }
      else { f.a += dt * spd * f.sp * .7; tx = q.x + Math.cos(f.a) * q.rx * f.r * 1.3; tz = q.z + Math.sin(f.a) * q.rz * f.r * 1.3; }
      const ox = f.x, oz = f.z; f.x += (tx - f.x) * Math.min(1, dt * 2.5 * spd); f.z += (tz - f.z) * Math.min(1, dt * 2.5 * spd); const y = q.y - .1 - f.dep + Math.sin(time * 2 + f.a) * .05;
      f.m.root.position.set(f.x, y, f.z); if (Math.abs(f.x - ox) + Math.abs(f.z - oz) > 1e-4) f.m.root.rotation.y = Math.atan2(f.x - ox, f.z - oz); f.m.tail.rotation.y = Math.sin(time * (f.dart > 0 ? 26 : 10) + f.a * 3) * .5; } }
  // ---------------- owls: perch on treetops at night, hoot, fly off if you come close ----------------
  function updOwls(dt, time, night) { const want = night > .6 ? cap.owls : 0;
    if (owls.length < want && Math.random() < dt * .5) { const cand = C.trees.filter(t => !t.dead && (t.kind === 0 || t.kind === 2) && !owls.some(o => o.t === t)).map(t => [t, Math.hypot(t.x - P.x, t.z - P.z)]).filter(([, d]) => d > 8 && d < 34);
      if (cand.length) { const [t] = cand[(Math.random() * cand.length) | 0], md = makeOwl(), y = t.y + t.h + 1.25 + (t.kind === 2 ? 2.5 : 2.0); /* sit ON the canopy (top blob reaches ~+1.6 / +2.1 above the trunk top) */ md.root.scale.setScalar(1.3); md.root.position.set(t.x + .5, y, t.z + .5); scene.add(md.root); owls.push({ t, m: md, st: "perch", tt: 0, hoot: 2 + Math.random() * 6, blink: 2, y0: y, v: new V3() }); } }
    for (let i = owls.length - 1; i >= 0; i--) { const o = owls[i], m = o.m, p = m.root.position; o.tt += dt; const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz);
      if (o.st === "perch") { const want2 = Math.atan2(dx, dz); let dd = want2 - m.head.rotation.y - m.root.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); m.head.rotation.y += Math.max(-1.6, Math.min(1.6, dd)) * Math.min(1, dt * 3) * (d < 22 ? 1 : 0);
        m.head.rotation.y = Math.max(-2.2, Math.min(2.2, m.head.rotation.y)); if ((o.blink -= dt) <= 0) { o.blink = 2 + Math.random() * 4; } const bl = o.blink < .12 ? .15 : 1; for (const e of m.eyes) e.scale.set(.05, .05 * bl, .05);
        if ((o.hoot -= dt) <= 0 && d < 30) { o.hoot = 7 + Math.random() * 8; C.sfx.hoot && C.sfx.hoot(p.x, p.y, p.z); m.body.scale.y = 1.06; } m.body.scale.y += (1 - m.body.scale.y) * Math.min(1, dt * 4);
        if (d < 4.5 && Math.abs(P.y - p.y) < 6 || night < .5 || o.scare) { o.st = "fly"; o.tt = 0; const a = Math.atan2(-dx, -dz); o.v.set(Math.sin(a) * 6, 3.5, Math.cos(a) * 6); m.root.rotation.y = a; m.head.rotation.y = 0; } }
      else { o.v.y += dt * 1.2; p.addScaledVector(o.v, dt); const f = Math.sin(o.tt * 16) * 1.1; m.wl.rotation.z = f; m.wr.rotation.z = -f; if (o.tt > 4) { scene.remove(m.root); owls.splice(i, 1); } } } }
  // ---------------- spawn / despawn around the player ----------------
  function updSpawns(dt, night) { if ((spawnT -= dt) > 0) return; spawnT = 1.2; if (C.underground() || C.busy()) return; if (land.length >= cap.land) return;
    for (let tries = 0; tries < 4; tries++) { const a = Math.random() * 6.28, r = 22 + Math.random() * 16, x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; const bn = C.biome(x, z); const k = pickSpecies(bn); if (!k) continue;
      if (k === "wolf") { const pack = { lead: null }; const w1 = spawnLand("wolf", x, z, { pack }); if (!w1) continue; pack.lead = w1; spawnLand("wolf", x + 1.5, z + 1, { pack }); return; }
      const n = k === "rabbit" && Math.random() < .5 ? 2 : 1; let ok = false; for (let j = 0; j < n; j++) ok = !!spawnLand(k, x + j * 1.2, z + j * .8) || ok; if (ok) return; } }
  function update(dt, time, night) { let v = Math.hypot(P.x - pvx, P.z - pvz) / Math.max(dt, 1e-3); if (v > 40) { v = 0; pspd = 0; } // teleport/respawn: not a charge
    pspd += (Math.min(20, v) - pspd) * Math.min(1, dt * 8); pvx = P.x; pvz = P.z;
    updSpawns(dt, night); updLand(dt, time, night); updBirds(dt, time, night); updFish(dt, time); updOwls(dt, time, night); }
  // ---------------- interaction ----------------
  function aim(o, d, maxT) { let best = null, bt = maxT; for (const a of land) { const c = a.c, lx = c.x - o.x, ly = c.y - o.y, lz = c.z - o.z, t = lx * d.x + ly * d.y + lz * d.z; if (t < 0 || t > bt) continue; const px = lx - d.x * t, py = ly - d.y * t, pz = lz - d.z * t, r = SP[a.k].h * .55 + (IS_TOUCH ? .15 : 0); if (px * px + py * py + pz * pz < r * r) { bt = t; best = a; } } return best; }
  function pet(a) { if (!land.includes(a)) return false; const d = Math.hypot(a.x - P.x, a.z - P.z); if (d > 3.4) return false; if (a.st === "flee") return false; a.happy = 1.2; a.st = "idle"; a.t = 0; a.dur = 2.5;
    const first = a.petCd <= 0; a.petCd = 45; C.onPet && C.onPet(a, first); return true; }
  function startle(a) { if (!land.includes(a)) return; if (a.k === "wolf") { // provoked: the pack turns hostile
      for (const w of land.filter(q => q.k === "wolf" && (q === a || (a.pack && q.pack === a.pack)))) { const x = w.x, y = w.y, z = w.z, ry = w.m.root.rotation.y; freeLand(w); C.provoke && C.provoke(x, y, z, ry); } return; }
    a.startle = true; }
  function scareOwls() { for (const o of owls) o.scare = true; }
  function hideFish(q) { const f = fishes.find(f => f.q === q && f.hide <= 0); if (f) f.hide = 25; }
  function counts() { const c = { deer: 0, rabbit: 0, fox: 0, wolf: 0 }; for (const a of land) c[a.k]++; return { ...c, birds: birds.length, fish: fishes.length, owls: owls.length, land: land.length }; }
  function clearAll() { while (land.length) freeLand(land[0]); for (const b of birds) scene.remove(b.m.root); birds.length = 0; flock = null; for (const f of fishes) scene.remove(f.m.root); fishes.length = 0; for (const o of owls) scene.remove(o.m.root); owls.length = 0; }
  return { update, aim, pet, startle, scareOwls, hideFish, counts, clearAll, spawnLand, land, birds, fishes, owls, SP };
}
