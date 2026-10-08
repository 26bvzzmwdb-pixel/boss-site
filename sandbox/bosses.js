// $BOSS Sandbox v0.9 bosses: toon-shaded 3D models built from simple shapes (no textures to download), three phases each,
// every big attack is telegraphed on the ground first, glowing weak points take extra damage, a short intro camera,
// and a crystal-burst finish. Damage on the player is capped (one hit per second) so fights stay fair on touch screens.
export function createBosses(THREE, C) {
  const { scene, P, IS_TOUCH } = C, V3 = THREE.Vector3;
  const FAIR = IS_TOUCH ? 1.3 : 1, SPD = IS_TOUCH ? .82 : 1;
  const grad = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const toon = (c, e = 0, ei = 0, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, emissive: e, emissiveIntensity: ei, ...o });
  const lineM = new THREE.MeshBasicMaterial({ color: 0x12061e, side: THREE.BackSide });
  const add = (p, geo, mat, x = 0, y = 0, z = 0, ol = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); p.add(m); if (ol) { const o = new THREE.Mesh(geo, lineM); o.scale.setScalar(1 + ol); m.add(o); } return m; };
  const S = (r, w = 18, h = 12) => new THREE.SphereGeometry(r, w, h);
  const glowM = c => new THREE.SpriteMaterial({ map: C.glowTex, color: c, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = (p, c, s, x = 0, y = 0, z = 0) => { const g = new THREE.Sprite(glowM(c)); g.scale.set(s, s, 1); g.position.set(x, y, z); p.add(g); return g; };
  const addM = (c, o = .8) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  // ---------------- models ----------------
  function glove(p, x, y, z, s) { const h = new THREE.Group(); h.position.set(x, y, z); h.scale.setScalar(s); p.add(h); const wm = toon(0xfff4fb, 0x553355, .15);
    add(h, S(.32, 14, 10), wm, 0, 0, 0, .08); for (let i = 0; i < 4; i++) { const f = add(h, new THREE.CapsuleGeometry(.075, .2, 3, 8), wm, -.2 + i * .135, .3, .05, .12); f.rotation.z = (i - 1.5) * -.12; }
    const th = add(h, new THREE.CapsuleGeometry(.08, .16, 3, 8), wm, .33 * Math.sign(x || 1), .02, .1, .12); th.rotation.z = -Math.sign(x || 1) * 1.1;
    add(h, new THREE.TorusGeometry(.3, .08, 8, 18), toon(0xffd24a, 0x7a4a00, .4), 0, -.28, 0).rotation.x = Math.PI / 2; return h; }
  function makeRug() { const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const rug = add(body, new THREE.PlaneGeometry(4.4, 2.9, 16, 10), toon(0xffffff, 0x6a1050, .35, { map: C.rugTex, side: THREE.DoubleSide })); rug.userData.base = rug.geometry.attributes.position.array.slice();
    const tas = []; const tm = toon(0xffd24a, 0x7a4a00, .45); for (let i = 0; i < 10; i++) { const t = add(body, new THREE.CylinderGeometry(.03, .1, .55, 6).translate(0, -.27, 0), tm, -2.05 + i * .455, -1.42, 0); tas.push(t); }
    const eye = new THREE.Group(); eye.position.z = .5; body.add(eye);
    add(eye, S(.66, 24, 16), toon(0xffffff, 0xffe0f0, .25), 0, 0, 0, .06);
    const iris = add(eye, S(.36, 20, 14), toon(0xff3250, 0xff3250, .9), 0, 0, .42); iris.scale.z = .45; add(iris, S(.17, 14, 10), new THREE.MeshBasicMaterial({ color: 0x14000f }), 0, 0, .3); add(iris, S(.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), .1, .1, .4);
    const lid = add(eye, new THREE.SphereGeometry(.71, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x7a1460, 0x3a0838, .3, { side: THREE.DoubleSide }), 0, 0, 0, .05);
    const brow = add(eye, new THREE.BoxGeometry(1.1, .16, .16), toon(0x2a0628), 0, .86, .3); 
    const hL = glove(body, -2.15, 1.3, .2, 1), hR = glove(body, 2.15, 1.3, .2, 1);
    const halo = glow(g, 0xff4fd8, 6.5, 0, 0, -.3), wg = glow(eye, 0xff6a8a, 2.2, 0, 0, .5);
    return { g, weak: iris, wg, halo, hitR: IS_TOUCH ? 2.7 : 2.1, weakR: IS_TOUCH ? .8 : .6, hover: 4,
      anim(st, t, dt) { const pa = rug.geometry.attributes.position, b = rug.userData.base, sp = st.act && st.act.n === "sweep" && st.act.s === 1 ? 9 : 4;
        for (let i = 0; i < pa.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; pa.array[i * 3 + 2] = Math.sin(x * 1.5 + t * sp) * .28 + Math.sin(y * 2 + t * 3) * .12 - Math.abs(x) * .1; } pa.needsUpdate = true;
        tas.forEach((q, i) => q.rotation.z = Math.sin(t * 3.2 + i * .7) * .35); const wind = st.wind || 0;
        hL.position.y = 1.3 + Math.sin(t * 2.4) * .12 + wind * .5; hR.position.y = 1.3 + Math.sin(t * 2.4 + 1) * .12 + wind * .5; hL.rotation.z = -.3 - wind * .6; hR.rotation.z = .3 + wind * .6;
        const lidT = st.lidShut ? 1.45 : st.expose > 0 ? -.75 : -.3 + Math.sin(t * .7) * .1; lid.rotation.x += (lidT - lid.rotation.x) * Math.min(1, dt * 10);
        brow.rotation.z = st.phase >= 2 ? Math.sin(t * 8) * .08 : 0; brow.position.y = .86 - (st.phase >= 3 ? .12 : 0);
        iris.material.emissive.setHex(st.flash > 0 ? 0xffffff : st.phase >= 3 ? 0xff8a00 : 0xff3250); iris.material.emissiveIntensity = .9 + wind * 1.6 + (st.expose > 0 ? .8 : 0);
        wg.material.opacity = .25 + wind * .6 + (st.expose > 0 ? .4 + Math.sin(t * 12) * .15 : 0); eye.scale.setScalar(1 + Math.sin(t * 6) * .04 + (st.flash > 0 ? .12 : 0)); } };
  }
  function makeWhale() { const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.scale.setScalar(1.1);
    const skin = toon(0x2a6fb0, 0x0a2a50, .45), belly = toon(0xcff4ff, 0x3a7aa0, .25);
    const b = add(body, S(1, 28, 18), skin, 0, 0, 0, .04); b.scale.set(1.45, 1.2, 2.5);
    const bl = add(body, S(1, 24, 14), belly, 0, -.4, .2); bl.scale.set(1.2, .85, 2.25);
    for (let i = 0; i < 5; i++) { const gr = add(body, new THREE.TorusGeometry(1, .025, 4, 24, Math.PI * .7), toon(0x7ac8e8), 0, -.45, -.6 + i * .45); gr.scale.set(1.18, .82, 1); gr.rotation.z = Math.PI * 1.15; gr.rotation.x = 0; gr.rotation.y = 0; }
    const eyes = []; for (const s of [-1, 1]) { const e = add(body, S(.24, 14, 10), toon(0xffffff), s * 1.1, .28, 1.75, .1); add(e, S(.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0x0a0418 }), s * .05, 0, .14); const br = add(body, new THREE.BoxGeometry(.55, .1, .12), toon(0x0d2440), s * 1.05, .58, 1.8); br.rotation.z = s * -.35; br.rotation.y = s * -.4; eyes.push(e); }
    const mouth = add(body, new THREE.TorusGeometry(.9, .045, 6, 24, Math.PI * .8), new THREE.MeshBasicMaterial({ color: 0x0a1a30 }), 0, -.15, 2.05); mouth.rotation.z = Math.PI * 1.1; mouth.rotation.x = -.35;
    const tail = new THREE.Group(); tail.position.set(0, .1, -2.3); body.add(tail); const stalk = add(tail, new THREE.ConeGeometry(.55, 1.6, 14), skin, 0, 0, -.6); stalk.rotation.x = -Math.PI / 2;
    for (const s of [-1, 1]) { const f = add(tail, S(1, 16, 8), skin, s * .75, 0, -1.35, .05); f.scale.set(.85, .1, .42); f.rotation.y = s * .45; }
    const fl = []; for (const s of [-1, 1]) { const f = add(body, S(1, 14, 8), skin, s * 1.45, -.45, .5, .05); f.scale.set(.75, .1, .38); f.rotation.z = s * .5; fl.push(f); }
    const hole = add(body, new THREE.TorusGeometry(.24, .08, 8, 20), toon(0x28dcff, 0x28dcff, .8), 0, 1.16, .7); hole.rotation.x = Math.PI / 2 - .25;
    const core = add(body, S(.17, 12, 8), toon(0xbfffff, 0x28dcff, 1.2), 0, 1.15, .7); const wg = glow(body, 0x28dcff, 2.2, 0, 1.4, .7);
    const halo = glow(g, 0x28dcff, 7, 0, 0, 0); halo.material.opacity = .35;
    return { g, weak: core, wg, halo, hitR: IS_TOUCH ? 3.0 : 2.5, weakR: IS_TOUCH ? .9 : .65, hover: 4.5,
      anim(st, t, dt) { const sw = st.act && st.act.n === "dive" && st.act.s === 2 ? 9 : 3; tail.rotation.x = Math.sin(t * sw) * .35; fl[0].rotation.x = Math.sin(t * 2.6) * .3; fl[1].rotation.x = -Math.sin(t * 2.6) * .3;
        body.rotation.z = Math.sin(t * 1.1) * .06; body.position.y = Math.sin(t * 1.4) * .15; const stun = st.expose > 0; eyes.forEach(e => e.scale.y = stun ? .35 : 1);
        core.material.emissive.setHex(st.flash > 0 ? 0xffffff : st.phase >= 3 ? 0x6ad8ff : 0x28dcff); core.material.emissiveIntensity = stun ? 2.4 + Math.sin(t * 14) * .6 : .7 + (st.wind || 0); core.scale.setScalar(stun ? 1.5 : 1);
        wg.material.opacity = stun ? .8 : .25 + (st.wind || 0) * .4; if (stun && Math.random() < dt * 14) { const p = core.getWorldPosition(new V3()); C.burst(p.x, p.y + .2, p.z, [0xbfefff, 0x28dcff, 0xffffff], 2, 3); } } };
  }
  function makeKing() { const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const cm = toon(0x5a3f88, 0x24163c, .5), parts = [[0, 0, 0, 1.3], [-1.1, -.2, .1, .95], [1.1, -.15, .1, .95], [-.6, .65, -.1, .9], [.6, .7, -.1, .9], [0, -.65, .3, .9], [-1.85, -.5, 0, .62], [1.85, -.45, 0, .62]];
    const puffs = parts.map(([x, y, z, r]) => add(body, S(r, 18, 12), cm, x, y, z, .05));
    const eyes = []; for (const s of [-1, 1]) { const e = add(body, S(.24, 14, 10), toon(0xff3250, 0xff3250, 1.1), s * .45, .12, 1.22); e.scale.set(1, .55, .4); eyes.push(e); const br = add(body, new THREE.BoxGeometry(.6, .12, .14), toon(0x140a24), s * .48, .45, 1.2); br.rotation.z = s * -.42; }
    const mouth = add(body, new THREE.TorusGeometry(.32, .06, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x140a24 }), 0, -.45, 1.28);
    const crown = new THREE.Group(); crown.position.set(0, 1.45, .1); body.add(crown); const gm = toon(0xffd24a, 0x8a5a00, .55);
    add(crown, new THREE.CylinderGeometry(.72, .82, .38, 18, 1, true), new THREE.MeshToonMaterial({ color: 0xffd24a, gradientMap: grad, emissive: 0x8a5a00, emissiveIntensity: .55, side: THREE.DoubleSide }), 0, 0, 0);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const s = add(crown, new THREE.ConeGeometry(.14, .5, 8), gm, Math.sin(a) * .74, .42, Math.cos(a) * .74); add(s, S(.08, 8, 6), toon(0xfff2b0, 0xffd24a, .8), 0, .28, 0); }
    const gem = add(crown, new THREE.OctahedronGeometry(.24), toon(0xff2a6a, 0xff2a6a, 1.2), 0, .02, .82); const wg = glow(crown, 0xff4f8a, 1.8, 0, 0, .9);
    const halo = glow(g, 0x9945ff, 7, 0, 0, -.4); halo.material.opacity = .45;
    return { g, weak: gem, wg, halo, hitR: IS_TOUCH ? 2.9 : 2.3, weakR: IS_TOUCH ? .8 : .55, hover: 5,
      anim(st, t, dt) { puffs.forEach((p, i) => p.scale.setScalar(1 + Math.sin(t * 2 + i) * .05 + (st.flash > 0 ? .06 : 0))); const lift = st.expose > 0 ? .55 : (st.wind || 0) * .3;
        crown.position.y += (1.45 + lift - crown.position.y) * Math.min(1, dt * 8); crown.rotation.z = st.expose > 0 ? Math.sin(t * 9) * .15 : Math.sin(t * 1.3) * .05; gem.rotation.y = t * 2;
        gem.material.emissiveIntensity = (st.expose > 0 ? 2.4 : 1) + (st.wind || 0) * 1.2; wg.material.opacity = st.expose > 0 ? .85 : .3 + (st.wind || 0) * .3; eyes.forEach(e => e.material.emissive.setHex(st.flash > 0 ? 0xffffff : st.phase >= 3 ? 0xff8a00 : 0xff3250));
        cm.color.setHex(st.phase >= 3 ? 0x3a2860 : 0x5a3f88); mouth.rotation.z = Math.PI + Math.sin(t * 3) * .05; } };
  }
  // Troglodyte Fudder: a hunched, hairy cave-dweller in a hoodie with a snack bag on the belt (the weak point)
  function makeFudder() { const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.scale.setScalar(1.25);
    const skin = toon(0x9adc5a, 0x2a4a10, .3), hood = toon(0x4a4f6a, 0x15172a, .3), hair = toon(0x3a2a1a, 0, 0), pants = toon(0x2a3550);
    const torso = add(body, S(1, 20, 14), hood, 0, 1.3, 0, .04); torso.scale.set(1.15, 1.05, .9);
    const belly = add(body, S(.8, 18, 12), toon(0x6a7090), 0, 1.05, .35); belly.scale.set(1, .9, .7);
    const head = new THREE.Group(); head.position.set(0, 2.45, .25); body.add(head);
    add(head, S(.62, 20, 14), skin, 0, 0, 0, .05).scale.set(1, .95, .95);
    const hd = add(head, new THREE.SphereGeometry(.72, 20, 12, 0, Math.PI * 2, 0, Math.PI * .55), hood, 0, .02, -.08, .04); hd.rotation.x = -.35;
    for (let i = 0; i < 9; i++) { const a = -1.2 + i * .3; const h = add(head, new THREE.ConeGeometry(.12, .5, 6), hair, Math.sin(a) * .45, .5 + Math.cos(a) * .05, Math.cos(a) * .2 - .1); h.rotation.z = -a * .6; }
    const brow = add(head, new THREE.BoxGeometry(.85, .14, .2), hair, 0, .22, .52); const eyes = [];
    for (const s of [-1, 1]) { const e = add(head, S(.13, 12, 8), toon(0xfffbe0, 0xffe080, .5), s * .22, .07, .55); add(e, S(.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a0a00 }), 0, 0, .1); eyes.push(e); }
    add(head, S(.16, 12, 8), toon(0x7ab84a), 0, -.08, .62); const mouth = add(head, new THREE.TorusGeometry(.18, .04, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x1a0a00 }), 0, -.3, .55);
    const arms = []; for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * 1.05, 1.85, 0); body.add(sh); const up = add(sh, new THREE.CapsuleGeometry(.24, .7, 4, 10), hood, 0, -.45, 0, .05);
      const fist = add(sh, S(.3, 14, 10), skin, 0, -1.05, .05, .06); arms.push(sh); }
    for (const s of [-1, 1]) { const l = add(body, new THREE.CapsuleGeometry(.28, .4, 4, 10), pants, s * .45, .35, 0, .05); add(body, S(.32, 12, 8), toon(0xe8e8f0), s * .45, .02, .12).scale.set(1, .5, 1.4); }
    // snack bag on the belt: the weak point (crinkly foil, glows when it rips open)
    const bag = add(body, new THREE.BoxGeometry(.55, .7, .25, 2, 2, 1), toon(0xff8a1e, 0xff5a00, .6), .55, .85, .78, .06); bag.rotation.z = -.2;
    const puff = add(bag, S(.12, 8, 6), toon(0xffb040, 0xff8a00, .6), 0, .42, .02); const wg = glow(bag, 0xffa040, 1.8, 0, 0, .3);
    const halo = glow(g, 0x8cdc3c, 7, 0, 1.5, -.5); halo.material.opacity = .3;
    return { g, weak: bag, wg, halo, hitR: IS_TOUCH ? 2.9 : 2.4, weakR: IS_TOUCH ? .85 : .6, hover: 0, ground: true, center: 1.9,
      anim(st, t, dt) { const w = st.wind || 0, rage = st.phase >= 3; const run = st.moving ? 1 : 0; body.rotation.z = Math.sin(t * (run ? 9 : 2)) * (run ? .08 : .03);
        head.rotation.x = -.1 + Math.sin(t * 1.7) * .05 - w * .3; head.position.y = 2.45 + Math.sin(t * 2) * .03;
        arms[0].rotation.x = -w * 2.4 + (run ? Math.sin(t * 9) * .6 : Math.sin(t * 1.5) * .1); arms[1].rotation.x = -w * 2.4 + (run ? -Math.sin(t * 9) * .6 : Math.sin(t * 1.5 + 1) * .1);
        arms[0].rotation.z = -.15 - (st.act && st.act.n === "slam" ? w * .3 : 0); arms[1].rotation.z = .15;
        brow.rotation.z = rage ? Math.sin(t * 10) * .1 : 0; eyes.forEach(e => e.material.emissive.setHex(st.flash > 0 ? 0xffffff : rage ? 0xff3020 : 0xffe080)); mouth.scale.y = st.act && st.act.n === "rant" ? 1.8 : 1;
        bag.material.emissiveIntensity = (st.expose > 0 ? 2 + Math.sin(t * 14) * .5 : .6) + w * .4; wg.material.opacity = st.expose > 0 ? .9 : .3; puff.position.y = .42 + (st.expose > 0 ? Math.abs(Math.sin(t * 8)) * .2 : 0);
        torso.material.color.setHex(rage ? 0x5a3a4a : 0x4a4f6a); } };
  }
  const MAKERS = { rug: makeRug, whale: makeWhale, king: makeKing, fudder: makeFudder }, models = {};

  // ---------------- fight state ----------------
  const st = { on: false, kind: "rug", hp: 0, max: 0, phase: 1, t: 0, intro: 0, introD: 2.6, act: null, cd: 2, expose: 0, flash: 0, wind: 0, lidShut: false, minions: false, dying: 0, g: null, eye: null, lvl: 0, arena: null, moving: false };
  let M = null; const shots = [], fx = [], haz = []; let iT = 0;
  const gy = (x, z) => C.groundY(x, z);
  function hurtP(n, msg, push) { if (iT > 0 || P.hp <= 0) return false; iT = IS_TOUCH ? 1.3 : 1; if (push) { P.vx += push.x; P.vz += push.z; P.vy = Math.max(P.vy, push.y || 5); } C.pop(msg + " −" + n, "#ff6a8a"); C.hurt(n); return true; }
  // flat ground marker (telegraph): a ring that fills up until the hit lands
  const ringGeo = new THREE.RingGeometry(.86, 1, 48).rotateX(-Math.PI / 2), discGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), bandGeo = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true).translate(0, .5, 0);
  function marker(x, z, r, col, dur, onEnd) { const y = gy(x, z) + .06, g = new THREE.Group(); g.position.set(x, y, z); const ring = new THREE.Mesh(ringGeo, addM(col, .9)), fill = new THREE.Mesh(discGeo, addM(col, .35)); ring.scale.setScalar(r); g.add(ring, fill); scene.add(g);
    fx.push({ k: "mark", g, fill, r, t: 0, dur, onEnd }); return g; }
  function stripe(x, z, dx, dz, len, w, col, dur, onEnd) { const g = new THREE.Mesh(new THREE.PlaneGeometry(w, len).rotateX(-Math.PI / 2).translate(0, 0, len / 2), addM(col, .4)); g.position.set(x, gy(x, z) + .08, z); g.rotation.y = Math.atan2(dx, dz); scene.add(g); fx.push({ k: "stripe", g, t: 0, dur, onEnd }); }
  // expanding shockwave ring along the ground: jump over it
  function wave(x, z, col, spd, maxR, h = .8, dmg = 1, msg = "SHOCKWAVE") { const g = new THREE.Group(); const y = gy(x, z); g.position.set(x, y, z); const band = new THREE.Mesh(bandGeo, addM(col, .55)), ring = new THREE.Mesh(ringGeo, addM(col, .9)); band.scale.set(1, h, 1); g.add(band, ring); scene.add(g);
    const w = { k: "wave", g, band, ring, x, z, y, r: .5, spd: spd * SPD, maxR, h, dmg, msg, hit: false }; haz.push(w); return w; }
  const txtTex = {}; function wordTex(t, c) { const k = t + c; if (txtTex[k]) return txtTex[k]; const cv = document.createElement("canvas"); cv.width = 256; cv.height = 96; const x = cv.getContext("2d"); x.font = "900 54px Orbitron,Verdana,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 10; x.strokeStyle = "#14081e"; x.strokeText(t, 128, 50); x.fillStyle = c; x.fillText(t, 128, 50); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return (txtTex[k] = tx); }
  const RANT = ["FUD!", "NGMI", "IT'S OVER", "WEN?", "COPE", "REKT", "SO OVER", "FUD!"];
  function rantWave(x, z, spd, maxR) { const w = wave(x, z, 0x8cdc3c, spd, maxR, .8, 1, "FUD RANT"); w.txt = []; const n = IS_TOUCH ? 8 : 12; for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTex(RANT[i % RANT.length], i % 2 ? "#b8ff6a" : "#ff6a8a"), transparent: true, depthWrite: false })); sp.scale.set(1.7, .64, 1); scene.add(sp); w.txt.push([sp, i / n * 6.283 + Math.random() * .2]); } return w; }
  function shot(o, d, spd, col, size, dmg = 1, msg = "RUGGED", grav = 0) { const s = new THREE.Sprite(glowM(col)); s.material.opacity = 1; s.scale.set(size, size, 1); s.position.copy(o); scene.add(s); const core = new THREE.Mesh(S(size * .18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); s.add(core);
    const q = { s, v: d.clone().normalize().multiplyScalar(spd * SPD), l: 6, dmg, msg, grav, col }; shots.push(q); return q; }
  function bolt(x, z, col) { const y = gy(x, z), h = 22, m = new THREE.Mesh(new THREE.CylinderGeometry(.12, .3, h, 6, 8, true).translate(0, h / 2, 0), addM(col, 1)); const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i++) if (pa.getY(i) > .5 && pa.getY(i) < h - .5) { pa.setX(i, pa.getX(i) + (Math.random() - .5) * .9); pa.setZ(i, pa.getZ(i) + (Math.random() - .5) * .9); }
    m.position.set(x, y, z); scene.add(m); fx.push({ k: "bolt", g: m, t: 0, dur: .35 }); C.burst(x, y + .3, z, [0xffffff, col, 0xffd24a], IS_TOUCH ? 14 : 26, 6); C.sfx.bolt && C.sfx.bolt(x, y, z); C.shake(.25); }
  function inR(x, z, r) { return Math.hypot(P.x - x, P.z - z) < r; }
  function clearFx() { for (const f of fx) scene.remove(f.g); fx.length = 0; for (const h of haz) { scene.remove(h.g); if (h.txt) for (const [sp] of h.txt) scene.remove(sp); } haz.length = 0; for (const s of shots) scene.remove(s.s); shots.length = 0; }

  // ---------------- attacks per boss ----------------
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function startAct(n, o = {}) { st.lidShut = false; st.act = { n, t: 0, s: 0, ...o }; }
  function choose() { const k = st.kind, ph = st.phase;
    if (k === "rug") return ph === 1 ? pick(["volley", "volley", "sweep"]) : ph === 2 ? pick(["volley", "sweep", "sweep"]) : pick(["volley", "sweep", "yank"]);
    if (k === "whale") return ph === 1 ? pick(["dive", "dive", "bubbles"]) : pick(["dive", "dive", "bubbles"]);
    if (k === "king") return ph === 1 ? pick(["bolts", "spread"]) : ph === 2 ? pick(["bolts", "spread", "bolts"]) : pick(["storm", "bolts", "spread"]);
    if (k === "fudder") return st.phase === 1 ? pick(["puffs", "puffs", "rant"]) : st.phase === 2 ? pick(["puffs", "rant", "slam"]) : pick(["slam", "rant", "puffs", "clouds"]);
    return "volley"; }
  const tmp = new V3(), tmp2 = new V3(), rockGeo = new THREE.DodecahedronGeometry(.6, 0), rockMat = toon(0x6a5a7a, 0x1a1028, .3);
  function weakPos() { return M.weak.getWorldPosition(tmp2); }
  function act(dt) { const a = st.act, g = st.g, k = st.kind; if (!a) return; a.t += dt; const ph = st.phase, W = FAIR;
    const toP = tmp.set(P.x - g.position.x, P.y + 1.1 - g.position.y, P.z - g.position.z);
    if (a.n === "volley") { const wd = .8 * W; st.wind = Math.min(1, a.t / wd); if (a.s === 0 && a.t > wd) { a.s = 1; const n = ph === 1 ? 1 : ph === 2 ? 3 : 5, o = weakPos().clone();
        for (let i = 0; i < n; i++) shot(o, toP.clone().applyAxisAngle(new V3(0, 1, 0), (i - (n - 1) / 2) * .26), ph >= 3 ? 7 : 5.8, 0xff4f7a, .95, 1, "RUGGED"); C.sfx.bshot(); }
      if (a.t > wd + .5) { st.wind = 0; return true; } }
    else if (a.n === "sweep") { // rug drops low, shows its path, then rushes along it: jump it or step aside
      if (a.s === 0) { const d = Math.hypot(toP.x, toP.z) || 1; a.dx = toP.x / d; a.dz = toP.z / d; a.sx = P.x - a.dx * 11; a.sz = P.z - a.dz * 11; a.s = 1; a.t = 0; st.lidShut = true; }
      if (a.s === 1) { st.wind = Math.min(1, a.t); st.goal = [a.sx, gy(a.sx, a.sz) + .9, a.sz]; if (a.t > .9) { a.s = 2; a.t = 0; stripe(a.sx, a.sz, a.dx, a.dz, 24, 3.8, 0xff3250, 1.25 * W); C.pop("RUG SWEEP! JUMP IT OR SIDESTEP", "#ffb0d8"); C.sfx.warn && C.sfx.warn(); } }
      if (a.s === 2) { st.goal = [a.sx, gy(a.sx, a.sz) + .9, a.sz]; g.rotation.set(0, Math.atan2(a.dx, a.dz), 0); if (a.t > 1.25 * W) { a.s = 3; a.t = 0; a.p = 0; C.roar(); } }
      if (a.s === 3) { a.p += dt * 15 * SPD; const x = a.sx + a.dx * a.p, z = a.sz + a.dz * a.p, gyy = gy(x, z); g.position.set(x, gyy + .9, z); st.goal = null; st.moving = true;
        const rx = P.x - x, rz = P.z - z, along = rx * a.dx + rz * a.dz, lat = Math.abs(-rx * a.dz + rz * a.dx); if (!a.hit && Math.abs(along) < .9 && lat < 2.1 && P.y < gyy + 1.15) { a.hit = hurtP(ph >= 3 ? 2 : 1, "SWEPT", { x: a.dx * 8, z: a.dz * 8, y: 7 }); }
        if (Math.random() < .5) C.burst(x, gyy + .3, z, [0xff4fd8, 0xffd24a], 2, 2); if (a.p > 24) { a.s = 4; a.t = 0; st.lidShut = false; st.moving = false; st.wind = 0; st.expose = 2.2 * W; C.pop("IT'S DIZZY! BLAST THE EYE!", "#ffd24a"); } }
      if (a.s === 4 && a.t > .3) return true; }
    else if (a.n === "yank") { // both hands pull the floor out: ring around you, get out
      if (a.s === 0) { a.s = 1; a.x = P.x; a.z = P.z; marker(a.x, a.z, 3.2, 0xff8a00, 1.15 * W); C.pop("THE FLOOR IS BEING PULLED! MOVE!", "#ffb060"); C.sfx.warn && C.sfx.warn(); }
      st.wind = Math.min(1, a.t / (1.15 * W)); if (a.s === 1 && a.t > 1.15 * W) { a.s = 2; st.wind = 0; C.shake(.5); C.burst(a.x, gy(a.x, a.z) + .3, a.z, [0xff8a00, 0xff4fd8, 0xffd24a], IS_TOUCH ? 20 : 40, 7); if (inR(a.x, a.z, 3.2)) hurtP(1, "FLOOR PULLED", { x: 0, z: 0, y: 9 }); }
      if (a.t > 1.15 * W + .6) return true; }
    else if (a.n === "dive") { // whale marks your spot, rises, then slams down on it. after the slam it is stunned (blowhole open)
      const n = a.n2 || 0; if (a.s === 0) { a.x = P.x; a.z = P.z; a.y = gy(a.x, a.z); a.s = 1; marker(a.x, a.z, 2.8, 0x28dcff, (n ? 1 : 1.45) * W); C.pop(n ? "AGAIN! MOVE!" : "🐋 DUMP DIVE! GET OUT OF THE RING!", "#28dcff"); C.sfx.warn && C.sfx.warn(); }
      const tw = (n ? 1 : 1.45) * W; if (a.s === 1) { st.goal = [a.x, a.y + 9, a.z]; st.wind = a.t / tw; if (a.t > tw) { a.s = 2; a.t = 0; } }
      if (a.s === 2) { st.goal = null; const k2 = Math.min(1, a.t / .4); g.position.set(g.position.x + (a.x - g.position.x) * k2, a.y + 9 - 8 * k2 * k2, g.position.z + (a.z - g.position.z) * k2); g.rotation.x = 1.1 * (1 - k2);
        if (k2 >= 1) { a.s = 3; a.t = 0; g.rotation.x = 0; C.shake(.8); C.buzz(80); C.sfx.splash(1, a.x, a.y, a.z); C.burst(a.x, a.y + .3, a.z, [0x28dcff, 0xbfefff, 0xffffff], IS_TOUCH ? 30 : 60, 8); if (inR(a.x, a.z, 2.8) && P.y < a.y + 2.5) hurtP(st.phase >= 3 ? 2 : 1, "DUMPED ON", { x: (P.x - a.x) * 3, z: (P.z - a.z) * 3, y: 7 });
          if (st.phase >= 2) wave(a.x, a.z, 0x28dcff, 8, 15, .7, 1, "SPLASH WAVE"); st.wind = 0; if (st.phase >= 3 && !n) { a.n2 = 1; a.s = 0; a.t = 0; return false; } st.expose = 2.4 * W; C.pop("STUNNED! HIT THE GLOWING BLOWHOLE!", "#bfefff"); } }
      if (a.s === 3) { st.goal = [a.x, a.y + 1.6, a.z]; if (a.t > 2.4 * W) return true; } }
    else if (a.n === "bubbles") { const wd = .75 * W; st.wind = Math.min(1, a.t / wd); if (a.s === 0 && a.t > wd) { a.s = 1; const n = ph === 1 ? 3 : 5, o = g.position.clone(); o.y += .5; for (let i = 0; i < n; i++) shot(o, toP.clone().applyAxisAngle(new V3(0, 1, 0), (i - (n - 1) / 2) * .3), 4.6, 0x28dcff, 1.2, 1, "BUBBLED"); C.sfx.bshot(); }
      if (a.t > wd + .5) { st.wind = 0; return true; } }
    else if (a.n === "bolts" || a.n === "storm") { // the king lifts its crown (gem exposed) and calls lightning on marked spots
      if (a.s === 0) { a.s = 1; const n = a.n === "storm" ? 8 : ph === 1 ? 3 : 5; a.pts = []; for (let i = 0; i < n; i++) { const r = i === 0 ? 0 : a.n === "storm" ? 3 + (i % 3) * 2.2 : 2.2 + Math.random() * 3, an = i * 2.4 + Math.random(); a.pts.push([P.x + Math.cos(an) * r, P.z + Math.sin(an) * r, i * (a.n === "storm" ? .22 : .3)]); }
        st.expose = (1.2 + n * .3) * W; C.pop(a.n === "storm" ? "⚡ FUD STORM! WATCH THE RINGS" : "⚡ LIGHTNING! LEAVE THE RINGS", "#ffe08a"); C.sfx.warn && C.sfx.warn(); }
      for (const q of a.pts) if (!q.m && a.t >= q[2]) { q.m = 1; marker(q[0], q[1], 1.5, 0xffd24a, 1.05 * W); } // rings on the game clock, so every strike gets its full warning
      for (const q of a.pts) if (q.m && !q.done && a.t > q[2] + 1.05 * W) { q.done = 1; bolt(q[0], q[1], 0xb46aff); if (inR(q[0], q[1], 1.5)) hurtP(1, "ZAPPED", { x: 0, z: 0, y: 5 }); }
      st.wind = .6; if (a.pts.every(q => q.done) && a.t > 2) { st.wind = 0; return true; } }
    else if (a.n === "spread") { const wd = .8 * W; st.wind = Math.min(1, a.t / wd); if (a.s === 0 && a.t > wd) { a.s = 1; const n = ph === 1 ? 5 : 7, o = g.position.clone(); for (let i = 0; i < n; i++) shot(o, toP.clone().applyAxisAngle(new V3(0, 1, 0), (i - (n - 1) / 2) * .22), ph >= 2 ? 5 : 4.3, 0xb46aff, 1.1, 1, "FUDDED"); C.sfx.bshot(); }
      if (a.t > wd + .5) { st.wind = 0; return true; } }
    else if (a.n === "puffs") { // cheese-puff bombs lobbed onto marked spots
      const wd = .7 * W; st.wind = Math.min(1, a.t / wd); if (a.s === 0 && a.t > wd) { a.s = 1; st.wind = 0; const n = ph === 1 ? 3 : ph === 2 ? 4 : 5, T = 1.35 * W, o = weakPos().clone(); o.y += 1.2; C.sfx.warn && C.sfx.warn(); C.pop("🧀 CHEESE-PUFF BOMBS! LEAVE THE RINGS", "#ffb040");
        for (let i = 0; i < n; i++) { const an = Math.random() * 6.283, r = i === 0 ? 0 : 1.8 + Math.random() * 2.6, x = P.x + Math.cos(an) * r, z = P.z + Math.sin(an) * r, y = gy(x, z); marker(x, z, 1.6, 0xffa040, T);
          const G = 14, v = new V3((x - o.x) / T, (y + .2 - o.y + .5 * G * T * T) / T, (z - o.z) / T); const q = shot(o, v, 1, 0xffa040, 1.1, 1, "PUFFED", G); q.v.copy(v); q.l = T + .05; q.onHit = pp => { C.burst(pp.x, pp.y + .2, pp.z, [0xffa040, 0xffd060, 0xfff0b0], IS_TOUCH ? 12 : 24, 5); C.shake(.2); if (inR(pp.x, pp.z, 1.6) && P.y < pp.y + 1.6) hurtP(1, "PUFFED", { x: 0, z: 0, y: 5 }); }; } }
      if (a.t > wd + 1.6 * W) return true; }
    else if (a.n === "rant") { // FUD rant: the screens flash, words fly out as a shockwave ring along the floor. jump over it
      const wd = 1 * W; st.wind = Math.min(1, a.t / wd); if (a.s === 0) { a.s = 1; C.pop("📢 FUD RANT INCOMING! JUMP THE WORDS", "#b8ff6a"); C.sfx.warn && C.sfx.warn(); }
      const n = ph === 1 ? 1 : 2; if (a.s >= 1 && a.s <= n && a.t > wd + (a.s - 1) * 1.1) { a.s++; const g2 = st.g.position; rantWave(g2.x, g2.z, 6.5, 17); C.roar(); }
      if (a.t > wd + n * 1.1 + .6) { st.wind = 0; if (ph < 3 && Math.random() < .5) { st.expose = 2 * W; C.pop("SNACK BREAK! HIT THE BAG", "#ffd24a"); } return true; } }
    else if (a.n === "clouds") { // v0.9.2: summons a pack of FUD WOLVES out of glitch portals (was FUD clouds), then munches (bag exposed)
      const wd = .8 * W; st.wind = Math.min(1, a.t / wd); if (a.s === 0 && a.t > wd) { a.s = 1; st.wind = 0; const A = st.arena || { x: st.g.position.x, z: st.g.position.z, floorY: P.y }; const nW = IS_TOUCH ? 2 : 3, a0 = Math.random() * 6.283; for (let i = 0; i < nW; i++) { const an = a0 + i * 6.283 / nW; C.spawnFud && C.spawnFud(A.x + Math.cos(an) * 6, (A.floorY || P.y) + 2, A.z + Math.sin(an) * 6); }
        C.pop("🐺 FUD WOLVES SUMMONED! ZAP THEM", "#c8b0ff"); st.expose = 2.4 * W; }
      if (a.t > wd + 2.4 * W) return true; }
    else if (a.n === "slam") { // rage: slams the floor, rocks fall from the ceiling on marked spots, then a snack break
      const wd = .9 * W; if (a.s === 0) { a.s = 1; a.x = st.g.position.x; a.z = st.g.position.z; marker(a.x, a.z, 3.4, 0xff5030, wd); C.pop("👊 GROUND SLAM! BACK OFF", "#ff8060"); C.sfx.warn && C.sfx.warn(); }
      st.wind = Math.min(1, a.t / wd); if (a.s === 1 && a.t > wd) { a.s = 2; st.wind = 0; C.shake(.9); C.buzz(90); C.roar(); const y0 = gy(a.x, a.z); C.burst(a.x, y0 + .3, a.z, [0x8cdc3c, 0xffffff, 0x8a7a9a], IS_TOUCH ? 24 : 50, 8); if (inR(a.x, a.z, 3.4) && P.y < y0 + 1.8) hurtP(1, "SLAMMED", { x: (P.x - a.x) * 2, z: (P.z - a.z) * 2, y: 7 }); wave(a.x, a.z, 0x8cdc3c, 7, 9, .6, 1, "SHOCKWAVE");
        const n = IS_TOUCH ? 4 : 6, ceil = (st.arena && st.arena.floorY != null ? st.arena.floorY : y0) + 8.5; for (let i = 0; i < n; i++) { const an = Math.random() * 6.283, r = i === 0 ? 0 : 2 + Math.random() * 5, x = P.x + Math.cos(an) * r, z = P.z + Math.sin(an) * r, y1 = gy(x, z), T = 1.25 * W;
          marker(x, z, 1.4, 0xc8b0ff, T); setTimeout(() => { if (!st.on) return; const m = new THREE.Mesh(rockGeo, rockMat); m.scale.setScalar(.8 + Math.random() * .5); m.position.set(x, ceil, z); scene.add(m); fx.push({ k: "rock", g: m, t: 0, dur: .45, y0: ceil, y1: y1 + .4 }); }, T * 1000 - 450); } }
      if (a.s === 2 && a.t > wd + 1.5 * W) { a.s = 3; st.expose = 2.2 * W; C.pop("SNACK BREAK! HIT THE BAG", "#ffd24a"); }
      if (a.t > wd + 1.5 * W + 2.2 * W) return true; }
    return false; }

  // ---------------- lifecycle ----------------
  function summon(kind, lvl, o = {}) { if (st.on) return false; if (!models[kind]) models[kind] = MAKERS[kind](); M = models[kind]; const D = C.BOSSES[kind];
    Object.assign(st, { on: true, kind, lvl, phase: 1, t: 0, intro: st.introD, act: null, cd: 1.6, expose: 0, flash: 0, wind: 0, lidShut: false, minions: false, dying: 0, g: M.g, eye: M.weak, goal: null, arena: o.arena || null, moving: false });
    st.max = Math.round(D.hp * (1 + .45 * lvl)); st.hp = st.max; iT = 0;
    const g = M.g; g.rotation.set(0, 0, 0); g.scale.setScalar(1); g.visible = true;
    if (o.at) g.position.set(o.at[0], o.at[1], o.at[2]); else g.position.set(P.x + Math.sin(-P.yaw) * 13, P.y + 12, P.z - Math.cos(P.yaw) * 13);
    scene.add(g); C.bar(); C.cine(true, D.name, D.epi || D.tag); return true; }
  function damage(n, weak) { if (!st.on || st.dying || st.intro > 0) return; const mult = weak ? (st.expose > 0 ? 3 : st.lidShut ? .5 : 1.5) : 1; st.hp -= n * mult; st.flash = .08; C.bar();
    if (weak && st.expose > 0 && (st.wpT = (st.wpT || 0) - 1) < 0) { st.wpT = 25; C.pop("WEAK POINT ×3!", "#ffd24a"); }
    if (Math.random() < .25 * mult) { const p = (weak ? M.weak : M.g).getWorldPosition(tmp); C.burst(p.x, p.y, p.z, [0xffd24a, 0xff4fd8, 0xffffff], 2 + (weak ? 3 : 0), 5); C.sfx.bhit(); } C.shake(.12);
    const ph = st.hp < st.max / 3 ? 3 : st.hp < st.max * 2 / 3 ? 2 : 1;
    if (ph > st.phase && st.hp > 0) { st.phase = ph; const T = C.BOSS_TXT[st.kind]; C.banner(T[ph - 1] || T[0], C.BOSSES[st.kind].ph[ph - 2]); C.roar(); C.shake(.6); st.act = null; st.cd = 1.2; st.expose = 1.6; st.lidShut = false; st.wind = 0; st.moving = false;
      st.minions = (st.kind === "king" && ph >= 2) || (st.kind === "rug" && ph >= 3) || (st.kind === "fudder" && ph >= 2); C.onPhase && C.onPhase(st.kind, ph); }
    if (st.hp <= 0) { st.hp = 0; st.dying = 1.3; st.act = null; st.wind = 0; st.minions = false; clearFx(); C.bar(); C.roar(); } }
  // crystal burst: the boss shatters into gem crystals that bounce, then turn into pickups
  const gemMats = {}; const GC = { 8: 0xb070ff, 9: 0x3cffc0, 10: 0xfff2b0, 18: 0xffd24a, 25: 0xe0d0ff };
  function gemBurst(p, prize) { const ids = [8, 9, 18, 10, 8, 9, 18, 25], n = IS_TOUCH ? 16 : 26; for (let i = 0; i < n; i++) { const id = ids[i % ids.length]; const mat = gemMats[id] || (gemMats[id] = toon(GC[id], GC[id], .9));
      const m = new THREE.Mesh(C.gemGeo ? C.gemGeo(id) : new THREE.OctahedronGeometry(.25), mat); m.scale.setScalar(1.6 + Math.random() * 1.2); m.position.copy(p); const a = Math.random() * 6.28, up = 5 + Math.random() * 6, sp = 2.5 + Math.random() * 4;
      scene.add(m); fx.push({ k: "gem", g: m, t: 0, dur: 2.2 + Math.random() * .5, v: new V3(Math.cos(a) * sp, up, Math.sin(a) * sp), w: new V3(Math.random() * 8, Math.random() * 8, 0), col: GC[id], last: i === n - 1, val: Math.floor(prize / n) + (i < prize % n ? 1 : 0) }); }
    for (let i = 0; i < 6; i++) setTimeout(() => { C.burst(p.x + (Math.random() - .5) * 3, p.y + (Math.random() - .5) * 2, p.z + (Math.random() - .5) * 3, [0xffd24a, 0xff4fd8, 0x14f195, 0xffffff], IS_TOUCH ? 30 : 60, 8); C.shake(1); }, i * 110); }
  function end(won, silent) { if (!st.on) return; const p = st.g.position.clone(); if (M.ground) p.y += M.center || 1.5; st.on = false; scene.remove(st.g); clearFx(); st.minions = false; st.act = null; C.cine(false); st.intro = 0;
    if (won) { const prize = C.onWin(st.kind, p); gemBurst(p, prize); } else C.onLose(st.kind, silent); C.bar(); }
  function aim(o, d, maxT) { if (!st.on || st.dying) return null; const hitS = (c, r) => { const lx = c.x - o.x, ly = c.y - o.y, lz = c.z - o.z, t = lx * d.x + ly * d.y + lz * d.z; if (t < 0 || t > maxT) return -1; const px = lx - d.x * t, py = ly - d.y * t, pz = lz - d.z * t; return px * px + py * py + pz * pz < r * r ? t : -1; };
    const w = hitS(weakPos(), M.weakR); if (w >= 0) return { t: w, weak: true }; const c = st.g.position.clone(); if (M.ground) c.y += M.center; const b = hitS(c, M.hitR); return b >= 0 ? { t: b, weak: false } : null; }
  function update(dt, time) { iT -= dt;
    // effects run even after the boss is gone (crystal burst)
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; const k = f.t / f.dur;
      if (f.k === "mark") { f.fill.scale.setScalar(Math.max(.01, Math.min(1, k)) * f.r); f.fill.material.opacity = .2 + k * .35; f.g.children[0].material.opacity = .6 + Math.sin(f.t * 18) * .3; }
      else if (f.k === "stripe") f.g.material.opacity = .25 + Math.sin(f.t * 16) * .15 + k * .2;
      else if (f.k === "bolt") f.g.material.opacity = 1 - k;
      else if (f.k === "rock") { const e = Math.min(1, k * k); f.g.position.y = f.y0 + (f.y1 - f.y0) * e; f.g.rotation.x += dt * 5; if (k >= 1) { C.shake(.3); C.burst(f.g.position.x, f.y1 + .2, f.g.position.z, [0x8a7a9a, 0x5a4a6a, 0xd0c0ff], IS_TOUCH ? 10 : 20, 5); C.debris && C.debris(f.g.position.x, f.y1 + .3, f.g.position.z, 0x6a5a7a, 5); if (inR(f.g.position.x, f.g.position.z, 1.4) && P.y < f.y1 + 2) hurtP(1, "ROCKFALL", { x: 0, z: 0, y: 4 }); } }
      else if (f.k === "gem") { f.v.y -= 16 * dt; f.g.position.addScaledVector(f.v, dt); f.g.rotation.x += f.w.x * dt; f.g.rotation.y += f.w.y * dt; const gg = gy(f.g.position.x, f.g.position.z) + .2; if (f.g.position.y < gg) { f.g.position.y = gg; f.v.y = Math.abs(f.v.y) * .45; f.v.x *= .6; f.v.z *= .6; f.w.multiplyScalar(.6); }
        if (k >= 1 && f.val > 0) C.spawnOrbs(f.g.position.x, f.g.position.y + .3, f.g.position.z, f.val, f.col); }
      if (k >= 1) { scene.remove(f.g); fx.splice(i, 1); if (f.onEnd) f.onEnd(); } }
    for (let i = haz.length - 1; i >= 0; i--) { const h = haz[i]; h.r += h.spd * dt; h.g.scale.set(h.r, 1, h.r); h.band.material.opacity = .55 * (1 - h.r / h.maxR); h.ring.material.opacity = .9 * (1 - h.r / h.maxR);
      const d = Math.hypot(P.x - h.x, P.z - h.z); if (!h.hit && Math.abs(d - h.r) < .55 && P.y < gy(P.x, P.z) + h.h * .9) h.hit = hurtP(h.dmg, h.msg, { x: (P.x - h.x) / (d || 1) * 6, z: (P.z - h.z) / (d || 1) * 6, y: 6 });
      if (h.txt) for (const [sp, an] of h.txt) { sp.position.set(h.x + Math.cos(an + h.r * .05) * h.r, h.y + .55 + Math.sin(h.r * 2 + an * 3) * .1, h.z + Math.sin(an + h.r * .05) * h.r); sp.material.opacity = 1 - (h.r / h.maxR) ** 2; }
      if (h.r >= h.maxR) { scene.remove(h.g); if (h.txt) for (const [sp] of h.txt) scene.remove(sp); haz.splice(i, 1); } }
    for (let i = shots.length - 1; i >= 0; i--) { const q = shots[i], s = q.s; q.l -= dt; q.v.y -= q.grav * dt; s.position.addScaledVector(q.v, dt);
      const dx = P.x - s.position.x, dy = P.y + 1 - s.position.y, dz = P.z - s.position.z;
      if (dx * dx + dy * dy + dz * dz < .6) { scene.remove(s); shots.splice(i, 1); hurtP(q.dmg, q.msg, { x: q.v.x * .8, z: q.v.z * .8, y: 4 }); if (q.onHit) q.onHit(s.position); continue; }
      if (q.l <= 0 || C.get(Math.floor(s.position.x), Math.floor(s.position.y), Math.floor(s.position.z))) { C.burst(s.position.x, s.position.y, s.position.z, [q.col, 0xffffff], 8, 3); if (q.onHit) q.onHit(s.position); scene.remove(s); shots.splice(i, 1); } }
    if (!st.on) return; const g = st.g; st.t += dt; st.flash -= dt; st.expose = Math.max(0, st.expose - dt);
    if (st.dying > 0) { st.dying -= dt; g.rotation.y += dt * 9; g.position.y += dt * .6; g.scale.setScalar(1 + (1.3 - st.dying) * .25); st.flash = Math.sin(st.t * 30) > 0 ? .05 : 0; if (Math.random() < dt * 20) { const p = g.position; C.burst(p.x + (Math.random() - .5) * 2, p.y + (M.center || 0) + (Math.random() - .5) * 2, p.z + (Math.random() - .5) * 2, [0xffd24a, 0xffffff, 0xff4fd8], 6, 5); }
      M.anim(st, st.t, dt); if (st.dying <= 0) end(true); return; }
    const hov = M.hover; let goal = st.goal;
    if (st.intro > 0) { st.intro -= dt; if (st.intro <= 0) { C.cine(false); st.intro = 0; } }
    else if (!st.act) { st.cd -= dt; if (st.cd <= 0) startAct(choose()); }
    else if (act(dt)) { st.act = null; st.goal = null; st.cd = (st.phase === 1 ? 1.8 : st.phase === 2 ? 1.4 : 1.0) * (IS_TOUCH ? 1.25 : 1); st.moving = false; }
    if (st.kind === "fudder" && st.intro <= 0 && !(st.act && st.act.n === "slam" && st.act.s >= 1)) { const A = st.arena, th = A && A.throne; if (st.phase < 3 && th) { st.goal = [th[0], A.floorY, th[1]]; st.moving = false; }
      else { const dx = P.x - g.position.x, dz = P.z - g.position.z, d = Math.hypot(dx, dz) || 1; st.moving = d > 3.2; const sp = (IS_TOUCH ? 2.3 : 2.8) * dt; const nx = g.position.x + (st.moving ? dx / d * sp : 0), nz = g.position.z + (st.moving ? dz / d * sp : 0); st.goal = [nx, gy(nx, nz), nz]; } }
    goal = st.goal; const a = st.t * .35;
    if (!(st.act && (st.act.s === 3 && st.act.n === "sweep" || st.act.n === "dive" && st.act.s === 2))) {
      let tx, ty, tz; if (goal) [tx, ty, tz] = goal; else if (M.ground) { tx = g.position.x; tz = g.position.z; ty = gy(tx, tz); }
      else { const R = st.kind === "king" ? 9 : 8; tx = P.x + Math.cos(a) * R; tz = P.z + Math.sin(a) * R; tx = Math.max(2, Math.min(C.SX - 2, tx)); tz = Math.max(2, Math.min(C.SZ - 2, tz)); ty = Math.max(gy(tx, tz) + hov, P.y + hov + Math.sin(st.t * .8) * 1.2); }
      const k = st.kind === "fudder" && st.phase >= 3 ? 1 : Math.min(1, dt * (goal ? 2.6 : 1.3)); g.position.x += (tx - g.position.x) * k; g.position.y += (ty - g.position.y) * k; g.position.z += (tz - g.position.z) * k;
      if (M.ground) g.rotation.set(0, Math.atan2(P.x - g.position.x, P.z - g.position.z), 0); else { g.lookAt(P.x, P.y + P.eye, P.z); } }
    M.anim(st, st.t, dt); M.halo.material.opacity = (st.kind === "rug" ? .5 : .35) + (st.phase >= 3 ? .2 : 0) + Math.sin(st.t * 3) * .05;
    if (!st.arena && Math.hypot(g.position.x - P.x, g.position.z - P.z) > 45) end(false); else if (st.arena && Math.hypot(P.x - st.arena.x, P.z - st.arena.z) > st.arena.r + 12) end(false); }
  // intro camera: swings from your view to a low 3/4 shot of the boss and back (2.6s)
  const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), p0 = new V3(), mm = new THREE.Matrix4(), up = new V3(0, 1, 0);
  function camTick(cam) { if (!st.on || st.intro <= 0) return false; const k = 1 - st.intro / st.introD, w = Math.sin(Math.min(1, k * 1.25) * Math.PI) ** .7; const g = st.g.position, c = tmp.copy(g); if (M.ground) c.y += M.center || 1.5;
    const dx = cam.position.x - c.x, dz = cam.position.z - c.z, d = Math.hypot(dx, dz) || 1; p0.set(c.x + dx / d * 6.5 - dz / d * 3, c.y + .6 + k * .8, c.z + dz / d * 6.5 + dx / d * 3);
    q0.copy(cam.quaternion); mm.lookAt(p0, c, up); q1.setFromRotationMatrix(mm); cam.position.lerp(p0, w); cam.quaternion.slerpQuaternions(q0, q1, w); return true; }
  return { st, summon, damage, end, aim, update, camTick, clearFx, models: () => models, make: k => (models[k] || (models[k] = MAKERS[k]())), hurtP, marker, wave, shot, bolt, fx, haz, shots, toon, add, glow, grad };
}
