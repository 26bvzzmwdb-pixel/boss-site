// $BOSS Sandbox v0.9: props for THE TROGLODYTE FUDDER's lair (gaming-chair throne, cheese-puff bag piles, wall of FUD screens,
// glowing cables, cave-mouth sign). Pure decoration: the cave itself is carved in world.js so mining/collision stay tile-based.
export function createLair(THREE, C) {
  const { scene, L, toon, add, glow, IS_TOUCH } = C; const g = new THREE.Group(); g.position.set(L.x, L.floorY, L.z); scene.add(g);
  const face = Math.atan2(-Math.cos(L.ea), -Math.sin(L.ea));   // unused helper angle
  const toLocal = (x, z) => [x - L.x, z - L.z];
  // ---- throne: an oversized gaming chair with neon trim, facing the tunnel ----
  const th = new THREE.Group(); const [tx, tz] = toLocal(L.throne[0], L.throne[1]); th.position.set(tx, 0, tz); th.rotation.y = Math.atan2(Math.cos(L.ea), Math.sin(L.ea)); th.scale.setScalar(1.7); g.add(th);
  const blk = toon(0x1c1a2a, 0x0a0812, .3), pink = toon(0xff4fd8, 0xff4fd8, .9), grn = toon(0x8cdc3c, 0x8cdc3c, .8);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const leg = add(th, new THREE.BoxGeometry(.12, .08, .7), blk, Math.sin(a) * .35, .12, Math.cos(a) * .35); leg.rotation.y = a; add(th, new THREE.SphereGeometry(.07, 8, 6), blk, Math.sin(a) * .68, .07, Math.cos(a) * .68); }
  add(th, new THREE.CylinderGeometry(.07, .09, .5, 10), toon(0x9a9ab0), 0, .4, 0);
  const seat = add(th, new THREE.BoxGeometry(1.1, .22, 1, 2, 1, 2), blk, 0, .72, 0, .03);
  const back = add(th, new THREE.BoxGeometry(1.05, 1.7, .22, 2, 4, 1), blk, 0, 1.65, -.48, .03); back.rotation.x = -.12;
  for (const s of [-1, 1]) { add(back, new THREE.BoxGeometry(.14, 1.6, .05), s < 0 ? pink : grn, s * .32, 0, .12); add(th, new THREE.BoxGeometry(.12, .1, .7), blk, s * .58, 1.05, -.02, .05); add(th, new THREE.BoxGeometry(.06, .3, .06), blk, s * .58, .9, -.02);
    const wing = add(back, new THREE.BoxGeometry(.22, .5, .2), blk, s * .55, .55, .05, .04); wing.rotation.z = s * -.25; }
  add(back, new THREE.BoxGeometry(.6, .3, .06), pink, 0, .7, .13); add(back, new THREE.CylinderGeometry(.16, .16, .7, 12), toon(0x2a2840), 0, .45, .15).rotation.z = Math.PI / 2;
  const tg = glow(th, 0xff4fd8, 3.4, 0, 1.6, -.7); tg.material.opacity = .35;
  // ---- cheese-puff bag piles ----
  const bagM = [toon(0xff8a1e, 0xff6a00, .35), toon(0xffb81e, 0xff9000, .35), toon(0xff5a3a, 0xff3a1a, .3)], lab = toon(0xfff2b0, 0xffd24a, .3), puffM = toon(0xffa03a, 0xff8020, .4);
  const bagGeo = new THREE.BoxGeometry(.55, .75, .2, 1, 2, 1); { const pa = bagGeo.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); pa.setZ(i, pa.getZ(i) * (1.6 - Math.abs(y) * 1.4)); } bagGeo.computeVertexNormals(); }
  const puffGeo = new THREE.CapsuleGeometry(.07, .12, 3, 6), crimp = new THREE.BoxGeometry(.58, .07, .05);
  const piles = []; const nP = IS_TOUCH ? 4 : 6;
  for (let p = 0; p < nP; p++) { const a = L.ea + Math.PI + (p - (nP - 1) / 2) * .62 + (p % 2 ? .1 : -.1), r = L.r - 2.4 - (p % 2) * .8; const pg = new THREE.Group(); pg.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.add(pg); piles.push(pg);
    const n = 5 + (p % 3) * 2; for (let i = 0; i < n; i++) { const b = add(pg, bagGeo, bagM[(i + p) % 3], (Math.random() - .5) * 1.4, .35 + Math.floor(i / 4) * .45, (Math.random() - .5) * 1.4, .04); b.rotation.set((Math.random() - .5) * 1.2, Math.random() * 6, (Math.random() - .5) * 1.4);
      add(b, crimp, b.material, 0, .4, 0); const l = add(b, new THREE.CircleGeometry(.16, 12), lab, 0, .02, .135); }
    for (let i = 0; i < 10; i++) { const q = add(pg, puffGeo, puffM, (Math.random() - .5) * 2.4, .06, (Math.random() - .5) * 2.4); q.rotation.set(Math.random() * 3, Math.random() * 3, Math.PI / 2); } }
  // ---- wall of FUD screens behind the throne (canvas texture, flickers) ----
  const scr = []; const words = [["FUD", "#ff3a5a"], ["IT'S OVER", "#ff6a8a"], ["WEN?", "#ffd24a"], ["NGMI", "#ff3a5a"], ["COPE", "#b8ff6a"], ["SO OVER", "#ff6a8a"], ["REKT", "#ff3a5a"]];
  function screenTex(w, c, seed) { const cv = document.createElement("canvas"); cv.width = 256; cv.height = 160; const x = cv.getContext("2d"); x.fillStyle = "#1a0a26"; x.fillRect(0, 0, 256, 160); x.strokeStyle = "rgba(255,80,120,.25)"; for (let i = 0; i < 160; i += 4) { x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
    x.strokeStyle = c; x.lineWidth = 5; x.beginPath(); let y = 40; x.moveTo(10, y); for (let i = 1; i <= 12; i++) { y += (((seed * 7 + i * 13) % 11) - 3) * 3.2; x.lineTo(10 + i * 19, Math.min(150, y)); } x.stroke();
    x.font = "900 " + (w.length > 5 ? 34 : 48) + "px Orbitron,Verdana,sans-serif"; x.textAlign = "center"; x.fillStyle = c; x.shadowColor = c; x.shadowBlur = 14; x.fillText(w, 128, 84); x.fillText(w, 128, 84); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t; }
  const frame = toon(0x22202e, 0x0a0812, .3), nS = IS_TOUCH ? 5 : 7;
  for (let i = 0; i < nS; i++) { const a = L.ea + Math.PI + (i - (nS - 1) / 2) * .26, r = L.r - .9, row = i % 2, sg = new THREE.Group(); sg.position.set(Math.cos(a) * r, 2.4 + row * 1.5, Math.sin(a) * r); g.add(sg);
    sg.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); add(sg, new THREE.BoxGeometry(2, 1.3, .15), frame, 0, 0, -.06, .03); const [w, c] = words[i % words.length];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshBasicMaterial({ map: screenTex(w, c, i + 1), toneMapped: false })); m.position.z = .03; sg.add(m); const gl = glow(sg, new THREE.Color(c).getHex(), 3, 0, 0, .3); gl.material.opacity = .28; scr.push([m, gl, Math.random() * 6]);
    add(sg, new THREE.CylinderGeometry(.04, .04, 2.4 + row * 1.5, 6), frame, 0, -(2.4 + row * 1.5) / 2 - .6, -.1); }
  // cables snaking from the screens to the throne
  const cabM = toon(0x14121e, 0x28dcff, .25); for (let i = 0; i < 4; i++) { const pts = []; const a = L.ea + Math.PI + (i - 1.5) * .4; for (let k = 0; k <= 6; k++) { const t = k / 6, r = (L.r - 1) * (1 - t) + 1.2 * t; pts.push(new THREE.Vector3(Math.cos(a + Math.sin(k) * .1) * r + tx * t * .9, .06, Math.sin(a + Math.sin(k) * .1) * r + tz * t * .9)); }
    add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, .05, 5), cabM); }
  // ---- cave mouth: two leaning stone posts + glowing sign pointing down ----
  const mouth = new THREE.Group(); mouth.position.set(L.ent[0], L.ent[1] - .2, L.ent[2]); scene.add(mouth); const stone = toon(0x4a3f60, 0x1a1028, .2);
  for (const s of [-1, 1]) { const p = add(mouth, new THREE.CylinderGeometry(.25, .45, 3.4, 7), stone, Math.sin(L.ea) * s * 2.6, 1.5, -Math.cos(L.ea) * s * 2.6, .04); p.rotation.z = s * .12; }
  const sc = document.createElement("canvas"); sc.width = 512; sc.height = 160; { const x = sc.getContext("2d"); x.fillStyle = "rgba(20,8,30,.85)"; x.fillRect(8, 8, 496, 144); x.strokeStyle = "#8cdc3c"; x.lineWidth = 6; x.strokeRect(8, 8, 496, 144); x.font = "900 44px Orbitron,Verdana,sans-serif"; x.textAlign = "center"; x.fillStyle = "#b8ff6a"; x.shadowColor = "#8cdc3c"; x.shadowBlur = 16; x.fillText("FUDDER'S LAIR", 256, 72); x.font = "700 26px Orbitron,Verdana,sans-serif"; x.fillStyle = "#ffd24a"; x.fillText("▼ DEEP BELOW · ENTER IF YOU DARE ▼", 256, 122); }
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true })); sign.scale.set(4.4, 1.38, 1); sign.position.set(0, 3.9, 0); mouth.add(sign); glow(mouth, 0x8cdc3c, 6, 0, 3.6, 0).material.opacity = .3;
  // ---- v0.9.2 beacon: a tall green/pink light pillar over the cave mouth + a floating marker you can see from anywhere ----
  const bc = document.createElement("canvas"); bc.width = 4; bc.height = 128; { const x = bc.getContext("2d"), gr = x.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 4, 128); }
  const bt = new THREE.CanvasTexture(bc); const beamM = c => new THREE.MeshBasicMaterial({ color: c, map: bt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Group(); beam.position.set(L.ent[0], L.ent[1] - .5, L.ent[2]); scene.add(beam);
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(.55, .9, 46, 12, 1, true).translate(0, 23, 0), beamM(0x8cdc3c)), b2 = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, 52, 8, 1, true).translate(0, 26, 0), beamM(0xff4fd8)); beam.add(b1, b2);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.2, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb8ff6a, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); ring.position.y = .35; beam.add(ring);
  const mc = document.createElement("canvas"); mc.width = 256; mc.height = 128; { const x = mc.getContext("2d"); x.fillStyle = "rgba(14,6,26,.88)"; x.strokeStyle = "#b8ff6a"; x.lineWidth = 6; x.beginPath(); x.roundRect ? x.roundRect(10, 8, 236, 80, 18) : x.rect(10, 8, 236, 80); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(108, 88); x.lineTo(128, 120); x.lineTo(148, 88); x.closePath(); x.fillStyle = "#b8ff6a"; x.fill(); x.font = "52px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("🧀", 58, 50);
    x.font = "900 26px Orbitron,Verdana,sans-serif"; x.fillStyle = "#b8ff6a"; x.shadowColor = "#8cdc3c"; x.shadowBlur = 10; x.fillText("FUDDER", 160, 38); x.fillStyle = "#ffd24a"; x.font = "900 19px Orbitron,Verdana,sans-serif"; x.fillText("LAIR ▼", 160, 66); }
  const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace; const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, transparent: true, depthTest: false, depthWrite: false, fog: false })); mark.renderOrder = 20; beam.add(mark);
  function tick(t, near, dm = 99, inCave = false) { g.visible = near; beam.visible = !inCave; if (!inCave) { const p = .75 + .25 * Math.sin(t * 2.4); b1.material.opacity = .45 * p; b2.material.opacity = .7 * p; ring.scale.setScalar(1 + (t * .6 % 1) * .8); ring.material.opacity = .6 * (1 - t * .6 % 1);
      const s = Math.max(2.2, Math.min(9, dm * .085)); mark.scale.set(s * 2, s, 1); mark.position.y = (dm < 24 ? 6.4 : 7 + Math.min(14, dm * .08)) + Math.sin(t * 2) * .3; mark.visible = dm > 6; }
    if (!near) return; for (const [m, gl, ph] of scr) { const f = Math.sin(t * 13 + ph * 5) > .93 ? .35 : 1; m.material.color.setScalar(f); gl.material.opacity = .22 + .1 * Math.sin(t * 3 + ph); } tg.material.opacity = .3 + .1 * Math.sin(t * 2.2); }
  return { g, th, mouth, beam, mark, tick, seatY: L.floorY + .72 * 1.7 };
}
