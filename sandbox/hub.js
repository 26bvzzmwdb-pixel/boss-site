// v0.9.7 spawn hub. The plaza is a safe zone: no damage, and bosses / rifts / wolves do not spawn inside SAFE_R.
// Original toon NPCs, the GUILD HOUSE (shop) with a hanging GUILD sign, the Guild contract board, and a big Season 1 rank sign.
// v0.9.9: an EXIT PORTAL at spawn leaves the game and goes back to the $BOSS website (asks first, progress is saved).
// v0.9.8: the rank sign shows the LIVE shared Season board (top 5 for everyone, from the $BOSS score server). Falls back to this device if offline.
export const SAFE_R = 11;

export function createHub(THREE, C) {
  const toon = C.toon;
  const root = new THREE.Group();
  C.scene.add(root);
  const npcs = [];
  let open = null, line = 0;

  const signTex = (text, a, b) => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 160;
    const g = c.getContext("2d");
    g.clearRect(0, 0, 512, 160);
    g.font = "900 64px Orbitron,Verdana,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = a; g.shadowBlur = 22; g.fillStyle = b; g.fillText(text, 256, 80);
    g.shadowBlur = 0; g.fillStyle = "#ffffff"; g.fillText(text, 256, 80);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const tag = (text, col) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex(text, col, col), transparent: true, depthWrite: false, fog: false })); s.scale.set(1.7, .52, 1); s.position.y = 2.15; return s; };
  const guy = (skin, cloth, glow, hat) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.26, .52, 4, 10), toon(cloth, glow, .45)); body.position.y = .78; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.26, 14, 12), toon(skin, glow, .15)); head.position.y = 1.38; g.add(head);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0x140818 })); e.position.set(s * .09, 1.42, .2); g.add(e);
      const p = new THREE.Mesh(new THREE.SphereGeometry(.02, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); p.position.set(s * .1, 1.44, .24); g.add(p); }
    if (hat === "visor") { const v = new THREE.Mesh(new THREE.BoxGeometry(.42, .08, .16), toon(glow, glow, 1.1)); v.position.set(0, 1.46, .16); g.add(v); }
    else if (hat === "cap") { const c = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(glow, glow, .6)); c.position.y = 1.58; g.add(c);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(.34, .04, .22), toon(glow, glow, .5)); brim.position.set(0, 1.52, .16); g.add(brim); }
    else { const bow = new THREE.Mesh(new THREE.TorusGeometry(.16, .035, 6, 14), toon(glow, glow, .9)); bow.position.set(0, 1.62, 0); bow.rotation.x = Math.PI / 2; g.add(bow); }
    return g;
  };

  // talk-to spots that are not people: the contract board and the big rank sign
  const PROPS = [
    { id: "board", name: "GUILD BOARD", role: "CONTRACTS", dx: 0.0, dz: -2.7, quests: true, lines: ["Guild contracts pay extra ◆ shards. The top ones pay a BOSS POWER. Finish one, then come back here to claim it."] },
    { id: "exit", name: "EXIT PORTAL", role: "$BOSS SITE", dx: 5.4, dz: 3.2, exit: true, lines: ["This portal leaves the Sandbox and takes you back to the $BOSS website. Your world and shards are saved, so you can jump back in any time."] },
    { id: "ranks", name: "SEASON 1", role: "RANKS", dx: -4.0, dz: -3.9, ranks: true, lines: ["The big sign is LIVE: the shared Season 1 top 5, same for every player. Link Phantom here (free, no transaction) to rank.", "Rounds last 3 days. The top 5 split the Sandbox SOL pot 40 / 25 / 15 / 12 / 8 every round. Free to play, no purchase needed."] },
  ];
  const CAST = [
    { id: "nia", name: "NIA", role: "GUILD SHOP", dx: 3.6, dz: -1.9, yaw: Math.PI, skin: 0xffe0c4, cloth: 0xff4fd8, glow: 0x28dcff, hat: "visor", shop: true,
      lines: ["Welcome to the Guild House. You start as the free Rookie. Holder looks are a one-tap claim.", "Every weapon can be earned by playing. Shards are only a head start, and they have no cash value.", "Bosses and rifts stay outside the neon ring. Talk it out here, then walk out when you want a fight."] },
    { id: "vex", name: "VEX", role: "RIFTS", dx: -3.3, dz: 0.6, yaw: 0.4, skin: 0xffd8b0, cloth: 0x2a2458, glow: 0xffd24a, hat: "cap",
      lines: ["Rift portals open out past the ring. They never open in the hub.", "Follow the compass. Step in and it asks first. You stay until that boss drops.", "Come back and talk before you enter the next one. I am not going anywhere."] },
    { id: "boop", name: "BOOP", role: "HUB", dx: 0.2, dz: 2.6, yaw: Math.PI, skin: 0xfff0d8, cloth: 0x14f195, glow: 0x9945ff, hat: "halo",
      lines: ["This circle is a safe zone. No bites, no boss summons, no meteors on the rug.", "The big sign is the Season 1 board. Guild contracts are pinned on the board by the door.", "When you are ready, walk past the lights. The world outside is not this polite."] },
  ];

  // ---- v0.9.7 GUILD HOUSE: a little timber-and-neon hall with an open front, a counter inside, and a swinging GUILD sign ----
  const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const guildSignTex = () => canvasTex(512, 220, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#6a3f1e"); gr.addColorStop(1, "#3a2010"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 3; for (let y = 30; y < h; y += 38) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 6, w * .7, y - 6, w, y); g.stroke(); }
    g.strokeStyle = "#ffd24a"; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20); g.strokeStyle = "#ff4fd8"; g.lineWidth = 3; g.strokeRect(24, 24, w - 48, h - 48);
    g.font = "900 104px Orbitron,Verdana,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 12; g.strokeStyle = "#1a0c04"; g.strokeText("GUILD", w / 2 + 20, h / 2 + 6);
    g.shadowColor = "#ffd24a"; g.shadowBlur = 24; g.fillStyle = "#ffe27a"; g.fillText("GUILD", w / 2 + 20, h / 2 + 6); g.shadowBlur = 0;
    g.save(); g.translate(78, h / 2 + 4); g.strokeStyle = "#e8f8ff"; g.lineWidth = 9; g.lineCap = "round"; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-34 * s, 38); g.lineTo(34 * s, -38); g.stroke(); } g.fillStyle = "#28dcff"; g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fill(); g.restore(); });
  function guildHouse(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); const W = 4.4, D = 3.1, H = 2.5;
    const wood = toon(0x5a3a22, 0x2a1408, .12), dark = toon(0x2a1a2e, 0x140818, .2), stone = toon(0x3a3450, 0x1a1428, .18), roofM = toon(0x6a2a8a, 0x9945ff, .35), neonC = new THREE.MeshBasicMaterial({ color: 0x28dcff }), neonP = new THREE.MeshBasicMaterial({ color: 0xff4fd8 }), gold = toon(0xffd24a, 0xffb020, .8);
    const box = (w, h, d, m, px, py, pz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); g.add(b); return b; };
    box(W + .5, .22, D + .6, stone, 0, .11, 0);                                  // stone floor
    box(W, H, .18, dark, 0, H / 2 + .2, -D / 2);                                // back wall
    for (const s of [-1, 1]) { box(.18, H, D, dark, s * W / 2, H / 2 + .2, 0);     // side walls
      for (const zz of [-D / 2, D / 2]) box(.26, H + .1, .26, wood, s * W / 2, H / 2 + .2, zz);   // timber posts
      box(.16, .16, D + .1, wood, s * W / 2, H * .55, 0);                         // cross beam
      const win = box(.06, .7, .9, new THREE.MeshBasicMaterial({ color: 0xffd27a }), s * (W / 2 + .07), 1.6, 0); win.userData.win = 1;
      box(.08, .08, 1.0, wood, s * (W / 2 + .1), 1.6, 0); box(.08, .8, .08, wood, s * (W / 2 + .1), 1.6, 0); }
    box(W + .3, .3, .3, wood, 0, H + .3, D / 2);                                // front lintel
    box(W + .3, .06, .06, neonC, 0, H + .1, D / 2 + .16);                        // neon under the lintel
    // pitched roof: two slabs meeting at a ridge, with neon trim
    const pitch = .62, half = (D + .9) / 2 / Math.cos(pitch), rise = Math.tan(pitch) * (D + .9) / 2;
    for (const s of [-1, 1]) { const slab = new THREE.Mesh(new THREE.BoxGeometry(W + .9, .16, half * 1.04), roofM); slab.position.set(0, H + .45 + rise / 2, s * (D + .9) / 4); slab.rotation.x = s * pitch; g.add(slab);
      const tr = new THREE.Mesh(new THREE.BoxGeometry(W + .95, .05, .05), s < 0 ? neonP : neonC); tr.position.set(0, H + .38, s * (D + .9) / 2); g.add(tr); }
    box(W + 1, .14, .14, gold, 0, H + .5 + rise, 0);                             // ridge
    { const gg = new THREE.BufferGeometry(), hz = D / 2 + .1; gg.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -hz, 0, 0, hz, 0, rise + .1, 0], 3)); gg.computeVertexNormals();
      for (const s of [-1, 1]) { const gable = new THREE.Mesh(gg, toon(0x2a1a2e, 0x140818, .2)); gable.material.side = THREE.DoubleSide; gable.position.set(s * W / 2, H + .45, 0); g.add(gable); } }
    box(.5, 1, .5, stone, -W / 2 + .7, H + rise + .6, -D / 4);                    // chimney
    // inside: counter, shelves of potions, the shop gems
    box(W - .9, .9, .7, wood, 0, .65, .35); box(W - .8, .08, .78, neonC, 0, 1.12, .35);
    for (const yy of [1.35, 1.95]) { box(W - .8, .06, .4, wood, 0, yy, -D / 2 + .3);
      for (let i = 0; i < 7; i++) { const c = [0xff4fd8, 0x28dcff, 0x14f195, 0xffd24a][i % 4]; const pot = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, .24, 8), toon(c, c, .9)); pot.position.set(-W / 2 + .75 + i * .48, yy + .15, -D / 2 + .3); g.add(pot); } }
    [0x28dcff, 0xffd24a, 0xff4fd8].forEach((col, i) => { const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.17), toon(col, col, 1)); gem.position.set(-.55 + i * .55, 1.42, .35); gem.userData.spin = i; g.add(gem); });
    // banners on the front posts + lanterns
    for (const s of [-1, 1]) { const ban = new THREE.Mesh(new THREE.PlaneGeometry(.5, 1.1), toon(s < 0 ? 0x9945ff : 0x14f195, s < 0 ? 0x9945ff : 0x14f195, .5)); ban.material.side = THREE.DoubleSide; ban.position.set(s * (W / 2 + .02), H - .5, D / 2 + .16); g.add(ban);
      const lan = new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc860 })); lan.position.set(s * (W / 2 - .3), H - .05, D / 2 + .3); lan.userData.lamp = s; g.add(lan); }
    // the hanging GUILD sign: bracket + chains + a swinging plank
    box(.12, .12, 1.0, wood, W / 2 - .9, H + .62, D / 2 + .5);
    const pivot = new THREE.Group(); pivot.position.set(W / 2 - .9, H + .56, D / 2 + .95); g.add(pivot);
    for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .4, 4), toon(0xc0c0d0)); ch.position.set(s * .7, -.2, 0); pivot.add(ch); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.75, .75), new THREE.MeshBasicMaterial({ map: guildSignTex(), side: THREE.DoubleSide, toneMapped: false })); sign.position.y = -.78; pivot.add(sign);
    g.userData.pivot = pivot;
    // a glowing GUILD HALL word over the door too
    const top = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex("GUILD HALL", "#ffd24a", "#ff4fd8"), transparent: true, depthWrite: false, fog: false })); top.scale.set(2.6, .8, 1); top.position.set(0, H + rise + 1.15, D / 2 - .4); g.add(top);
    return g;
  }
  // ---- Guild contract board (cork + pinned notes; text comes from the game) ----
  let qTex = null, qMesh = null, qKey = "";
  function drawQuests(list) { const k = JSON.stringify(list || []); if (k === qKey && qTex) return; qKey = k;
    const t = canvasTex(512, 384, (g, w, h) => { g.fillStyle = "#7a5530"; g.fillRect(0, 0, w, h); g.fillStyle = "#b98a52"; g.fillRect(14, 60, w - 28, h - 74);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(80,50,20,${Math.random() * .25})`; g.fillRect(14 + Math.random() * (w - 28), 60 + Math.random() * (h - 74), 3, 3); }
      g.font = "900 34px Orbitron,Verdana,sans-serif"; g.textAlign = "center"; g.fillStyle = "#ffe27a"; g.shadowColor = "#ffd24a"; g.shadowBlur = 10; g.fillText("GUILD CONTRACTS", w / 2, 42); g.shadowBlur = 0;
      (list || []).slice(0, 3).forEach((q, i) => { const x = 24 + i * 160, y = 80 + (i % 2) * 14; g.save(); g.translate(x + 72, y + 120); g.rotate((i - 1) * .05); g.fillStyle = q.done ? "#d8ffe8" : "#fff6dc"; g.fillRect(-70, -112, 140, 236);
        g.fillStyle = "#ff3a5a"; g.beginPath(); g.arc(0, -100, 8, 0, 7); g.fill(); g.fillStyle = "#2a1a10"; g.textAlign = "center"; g.font = "900 15px Verdana,sans-serif";
        const words = String(q.t || "").toUpperCase().split(" "); let line = "", yy = -70; for (const wd of words) { if ((line + " " + wd).trim().length > 12) { g.fillText(line.trim(), 0, yy); yy += 18; line = wd; } else line += " " + wd; } g.fillText(line.trim(), 0, yy);
        g.font = "700 12px Verdana,sans-serif"; g.fillStyle = "#5a4030"; g.fillText((q.v | 0) + " / " + (q.n | 0), 0, yy + 26);
        g.font = "900 16px Verdana,sans-serif"; g.fillStyle = "#1a7a4a"; g.fillText("◆" + (q.sh | 0), 0, yy + 52); if (q.power) { g.fillStyle = "#9945ff"; g.fillText("+ POWER", 0, yy + 72); }
        if (q.done) { g.fillStyle = "#14b06a"; g.font = "900 22px Orbitron,Verdana,sans-serif"; g.fillText("DONE!", 0, 96); } g.restore(); }); });
    if (qMesh) { if (qMesh.material.map) qMesh.material.map.dispose(); qMesh.material.map = t; qMesh.material.needsUpdate = true; } qTex = t; }
  function questBoard(x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); const wood = toon(0x5a3a22, 0x2a1408, .12);
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.14, 2.3, .14), wood); post.position.set(s * 1.05, 1.15, 0); g.add(post); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, .1, .45), toon(0x6a2a8a, 0x9945ff, .35)); roof.position.set(0, 2.32, .05); roof.rotation.x = .25; g.add(roof);
    drawQuests([]); qMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5), new THREE.MeshBasicMaterial({ map: qTex, toneMapped: false })); qMesh.position.set(0, 1.38, .08); g.add(qMesh);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.6, .08), wood); back.position.set(0, 1.38, 0); g.add(back); return g; }
  // ---- BIG Season 1 rank sign ----
  let lbTex = null, lbMesh = null, lbKey = "";
  function drawRanks(d) { const k = JSON.stringify(d || {}); if (k === lbKey && lbTex) return; lbKey = k; const rows = (d && d.rows) || [];
    const t = canvasTex(1024, 640, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1a0c38"); gr.addColorStop(1, "#08061a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#ffd24a"; g.lineWidth = 12; g.strokeRect(8, 8, w - 16, h - 16); g.strokeStyle = "#28dcff"; g.lineWidth = 4; g.strokeRect(26, 26, w - 52, h - 52);
      g.textAlign = "center"; g.font = (d && d.live ? "900 60px" : "900 70px") + " Orbitron,Verdana,sans-serif"; g.shadowColor = "#ffd24a"; g.shadowBlur = 26; g.fillStyle = "#ffe27a"; g.fillText(d && d.live ? "🏆 SEASON 1 · LIVE" : "🏆 SEASON 1", w / 2, 104); g.shadowBlur = 0;
      g.font = "700 22px Verdana,sans-serif"; g.fillStyle = "#9df7ff"; g.fillText("Bosses · shards earned · legendary wins", w / 2, 140);
      const medal = ["#ffd24a", "#d8e0ff", "#ff9a4a", "#b8a0ff", "#b8a0ff"];
      for (let i = 0; i < 5; i++) { const r = rows[i], y = 205 + i * 66; g.fillStyle = i % 2 ? "rgba(255,255,255,.05)" : "rgba(40,220,255,.08)"; g.fillRect(60, y - 44, w - 120, 58);
        if (r && r.you) { g.strokeStyle = "#14f195"; g.lineWidth = 3; g.strokeRect(60, y - 44, w - 120, 58); }
        g.textAlign = "left"; g.font = "900 40px Orbitron,Verdana,sans-serif"; g.fillStyle = medal[i]; g.fillText("#" + (i + 1), 84, y);
        g.font = "900 36px Verdana,sans-serif"; g.fillStyle = r ? "#ffffff" : "rgba(255,255,255,.3)"; g.fillText(r ? String(r.name).slice(0, 16) : "— open spot —", 200, y);
        g.textAlign = "right"; g.fillStyle = r ? "#14f195" : "rgba(255,255,255,.3)"; g.fillText(r ? Number(r.score).toLocaleString("en-US") : "", w - 90, y); }
      g.textAlign = "center"; g.font = "700 22px Verdana,sans-serif"; g.fillStyle = "#ffb0c0"; g.fillText(d && d.you ? d.you : "Play to get on the board", w / 2, 560);
      g.fillStyle = "#cfd8ff"; g.font = "700 19px Verdana,sans-serif"; g.fillStyle = d && d.live ? "#14f195" : "#cfd8ff"; g.fillText((d && d.foot) || "Connecting to the LIVE board…", w / 2, 598); });
    if (lbMesh) { if (lbMesh.material.map) lbMesh.material.map.dispose(); lbMesh.material.map = t; lbMesh.material.needsUpdate = true; } lbTex = t; }
  function rankSign(x, z, yaw) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; const metal = toon(0x2a2840, 0x140818, .25);
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, 4.4, 8), metal); post.position.set(s * 2.4, 2.2, -.05); g.add(post);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshBasicMaterial({ color: s < 0 ? 0xffd24a : 0x28dcff })); bulb.position.set(s * 2.4, 4.48, -.05); g.add(bulb); }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.1, 3.25, .16), metal); frame.position.set(0, 2.75, -.1); g.add(frame);
    drawRanks(null); lbMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 3.06), new THREE.MeshBasicMaterial({ map: lbTex, toneMapped: false })); lbMesh.position.set(0, 2.75, 0); g.add(lbMesh);
    const glowM = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.7), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false })); glowM.position.set(0, 2.75, -.2); g.add(glowM); g.userData.glow = glowM;
    return g; }


  // ---- v0.9.9 EXIT PORTAL: a gold-ringed swirl on two stone pillars. Walk in (or TALK) and it asks before leaving for the $BOSS website ----
  const swirlTex = () => canvasTex(256, 256, (g, w, h) => { const cx = w / 2, cy = h / 2; const rg = g.createRadialGradient(cx, cy, 4, cx, cy, w / 2); rg.addColorStop(0, "#ffffff"); rg.addColorStop(.25, "#ffe27a"); rg.addColorStop(.6, "#ff4fd8"); rg.addColorStop(1, "rgba(153,69,255,0)"); g.fillStyle = rg; g.fillRect(0, 0, w, h);
    g.lineWidth = 7; g.lineCap = "round"; for (let a = 0; a < 6; a++) { g.strokeStyle = a % 2 ? "rgba(40,220,255,.85)" : "rgba(255,255,255,.75)"; g.beginPath(); for (let t = 0; t < 1; t += .02) { const r = 10 + t * 112, an = a * Math.PI / 3 + t * 5.2; const x = cx + Math.cos(an) * r, y = cy + Math.sin(an) * r; t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } });
  const exitSignTex = () => canvasTex(512, 160, (g, w, h) => { g.fillStyle = "rgba(8,6,24,.88)"; g.fillRect(0, 0, w, h); g.strokeStyle = "#ffd24a"; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.textAlign = "center"; g.textBaseline = "middle"; g.font = "900 50px Orbitron,Verdana,sans-serif"; g.shadowColor = "#ff4fd8"; g.shadowBlur = 18; g.fillStyle = "#ffe27a"; g.fillText("$BOSS SITE ↩", w / 2, 62); g.shadowBlur = 0;
    g.font = "700 24px Verdana,sans-serif"; g.fillStyle = "#9df7ff"; g.fillText("EXIT PORTAL · leave the game", w / 2, 118); });
  function exitPortal(x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z);
    const stone = toon(0x3a3450, 0x1a1428, .18), gold = toon(0xffd24a, 0xffb020, .9);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, .24, 24), stone); base.position.y = .12; g.add(base);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false })); pad.rotation.x = -Math.PI / 2; pad.position.y = .26; g.add(pad); g.userData.pad = pad;
    for (const s of [-1, 1]) { const pil = new THREE.Mesh(new THREE.BoxGeometry(.42, 3.1, .42), stone); pil.position.set(s * 1.55, 1.75, 0); g.add(pil);
      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(.26), gold); cap.position.set(s * 1.55, 3.5, 0); cap.userData.spin = s + 2; g.add(cap); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, .13, 10, 40), gold); ring.position.y = 1.85; g.add(ring);
    const neon = new THREE.Mesh(new THREE.TorusGeometry(1.42, .04, 6, 48), new THREE.MeshBasicMaterial({ color: 0x28dcff })); neon.position.y = 1.85; g.add(neon);
    const sw = new THREE.Mesh(new THREE.CircleGeometry(1.14, 40), new THREE.MeshBasicMaterial({ map: swirlTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); sw.position.y = 1.85; g.add(sw); g.userData.swirl = sw;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .81), new THREE.MeshBasicMaterial({ map: exitSignTex(), transparent: true, side: THREE.DoubleSide, toneMapped: false })); sign.position.set(0, 3.95, 0); g.add(sign);
    return g; }

  function stall(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, .16), toon(0x1a1030, 0xff4fd8, .35)); back.position.set(0, 1.15, -.7); g.add(back);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, .85, .9), toon(0x241840, 0x28dcff, .4)); counter.position.y = .45; g.add(counter);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.28, .08, .94), new THREE.MeshBasicMaterial({ color: 0x28dcff })); trim.position.y = .9; g.add(trim);
    const trim2 = new THREE.Mesh(new THREE.BoxGeometry(2.36, .08, .08), new THREE.MeshBasicMaterial({ color: 0xff4fd8 })); trim2.position.set(0, 2.02, -.7); g.add(trim2);
    for (const s of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 2.3, 6), toon(0x140818, 0x28dcff, .3)); pole.position.set(s * 1.15, 1.15, -.55); g.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshBasicMaterial({ color: s < 0 ? 0x28dcff : 0xff4fd8 })); bulb.position.set(s * 1.15, 2.3, -.55); g.add(bulb); }
    const cols = [0x28dcff, 0xffd24a, 0xff4fd8];
    cols.forEach((col, i) => { const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.16), toon(col, col, 1)); gem.position.set(-.45 + i * .45, 1.12, .05); gem.userData.spin = i; g.add(gem); });
    const board = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex("SHARD SHOP", "#28dcff", "#ff4fd8"), transparent: true, depthWrite: false, fog: false }));
    board.scale.set(2.4, .75, 1); board.position.set(0, 2.45, -.6); g.add(board);
    return g;
  }

  let shop = null, ring = null, qb = null, rs = null, portal = null, signT = 0, inPortal = false;
  function place() {
    const p = C.plaza();
    root.position.set(p.x, p.y, p.z);
    root.clear && root.clear();
    while (root.children.length) root.remove(root.children[0]);
    npcs.length = 0;
    ring = new THREE.Mesh(new THREE.TorusGeometry(SAFE_R - 1.2, .08, 8, 64), new THREE.MeshBasicMaterial({ color: 0x28dcff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = Math.PI / 2; ring.position.y = .06; root.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), new THREE.MeshBasicMaterial({ color: 0x9945ff, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = .04; root.add(disc);
    shop = guildHouse(3.7, -4.6); root.add(shop);
    qb = questBoard(0.0, -3.7); root.add(qb);
    rs = rankSign(-4.3, -5.2, .42); root.add(rs); signT = 0;
    { const ex = PROPS.find(k => k.exit); portal = exitPortal(ex.dx, ex.dz); root.add(portal); inPortal = false; }
    for (const k of PROPS) npcs.push({ ...k, g: null, x: () => p.x + k.dx, z: () => p.z + k.dz });
    for (const c of CAST) {
      const g = guy(c.skin, c.cloth, c.glow, c.hat); g.position.set(c.dx, 0, c.dz); g.rotation.y = c.yaw; g.add(tag(c.name, c.glow === 0xffd24a ? "#ffd24a" : c.glow === 0x14f195 ? "#14f195" : "#ff4fd8"));
      root.add(g); npcs.push({ ...c, g, x: () => p.x + c.dx, z: () => p.z + c.dz });
    }
  }

  function nearest(x, z) {
    const p = C.plaza(); let best = null, bd = 2.7;
    for (const n of npcs) { const d = Math.hypot(x - (p.x + n.dx), z - (p.z + n.dz)); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  function show() {
    const el = document.getElementById("hubDlg"); if (!el || !open) return;
    document.getElementById("hubWho").textContent = open.name + " · " + open.role;
    document.getElementById("hubLine").textContent = open.lines[line];
    document.getElementById("hubShop").hidden = !open.shop; const cl = document.getElementById("hubClaim"); if (cl) cl.hidden = !open.shop;
    const hq = document.getElementById("hubQuests"); if (hq) hq.hidden = !(open.quests || open.shop); const hr = document.getElementById("hubRanks"); if (hr) hr.hidden = !open.ranks; const hx = document.getElementById("hubExit"); if (hx) hx.hidden = !open.exit;
    document.getElementById("hubNext").hidden = line >= open.lines.length - 1;
    el.classList.add("show");
  }
  function talk(id) {
    const n = npcs.find(q => q.id === id) || nearest(C.px(), C.pz());
    if (!n) return null;
    open = n; line = 0; show(); C.onOpen && C.onOpen(true); return n.id;
  }
  function next() { if (!open) return; if (line < open.lines.length - 1) { line++; show(); } else close(); }
  function close() { open = null; const el = document.getElementById("hubDlg"); if (el) el.classList.remove("show"); C.onOpen && C.onOpen(false); }
  function shopOpen() { if (open && open.shop && C.onShop) { close(); C.onShop(); } }
  function quests() { if (open && (open.quests || open.shop) && C.onQuests) { close(); C.onQuests(); } }
  function ranks() { if (open && open.ranks && C.onRanks) { close(); C.onRanks(); } }
  function leave() { if (open && open.exit && C.onExit) { close(); C.onExit(); return true; } return false; }
  function claim() { if (open && open.shop && C.onClaim) return C.onClaim(); return null; }
  function tick(time, on) {
    root.visible = !!on;
    if (!on) { const b = document.getElementById("hubTalk"); if (b) b.classList.remove("show"); if (open) close(); return; }
    const bob = Math.sin(time * 2);
    if (shop && shop.userData.pivot) shop.userData.pivot.rotation.x = Math.sin(time * 1.3) * .1;
    if (shop) shop.traverse(o => { if (o.userData && o.userData.lamp) o.scale.setScalar(1 + Math.sin(time * 7 + o.userData.lamp) * .08); });
    if (rs && rs.userData.glow) rs.userData.glow.material.opacity = .1 + .06 * Math.sin(time * 2);
    if (time >= signT) { signT = time + 2; try { if (C.ranks) drawRanks(C.ranks()); if (C.quests) drawQuests(C.quests()); } catch (e) {} }
    npcs.forEach((n, i) => { if (!n.g) return; n.g.position.y = Math.sin(time * 2.2 + i) * .06; const px = C.px(), pz = C.pz(), p = C.plaza(); n.g.rotation.y = Math.atan2(px - (p.x + n.dx), pz - (p.z + n.dz)); });
    if (shop) shop.traverse(o => { if (o.userData && o.userData.spin != null) o.rotation.y = time * 1.4 + o.userData.spin; });
    if (ring) ring.material.opacity = .4 + Math.sin(time * 3) * .15;
    if (portal) { const u = portal.userData; if (u.swirl) u.swirl.rotation.z = -time * 2.2; if (u.pad) u.pad.material.opacity = .25 + .15 * Math.sin(time * 4);
      portal.traverse(o => { if (o.userData && o.userData.spin != null) o.rotation.y = time * 1.6 + o.userData.spin; });
      // stepping onto the portal pad opens the "leave the game?" prompt once; step off and back on to see it again
      const ex = PROPS.find(k => k.exit), p = C.plaza(), d = Math.hypot(C.px() - (p.x + ex.dx), C.pz() - (p.z + ex.dz));
      if (d < 1.2 && !inPortal) { inPortal = true; if (!open) talk("exit"); } else if (d > 1.9) inPortal = false; }
    const near = !open && nearest(C.px(), C.pz());
    const b = document.getElementById("hubTalk"); if (b) { b.classList.toggle("show", !!near && !document.body.classList.contains("inmenu")); b.textContent = near ? "TALK · " + near.name : "TALK"; }
    if (open) show();
  }
  function info() { const p = C.plaza(); return { r: SAFE_R, open: open && open.id, line, npcs: npcs.map(n => ({ id: n.id, name: n.name, shop: !!n.shop, quests: !!n.quests, ranks: !!n.ranks, x: p.x + n.dx, z: p.z + n.dz })), shop: true, guild: !!shop, board: !!qb, sign: !!rs, portal: !!portal }; }
  function refresh() { signT = 0; }
  return { root, place, nearest, talk, next, close, shopOpen, leave, claim, quests, ranks, refresh, tick, info, SAFE_R, signKey: () => ({ ranks: lbKey, quests: qKey }) };
}
