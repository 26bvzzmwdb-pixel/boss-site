// v0.9.6 spawn hub. The plaza is a safe zone: no damage, and bosses / rifts / wolves do not spawn inside SAFE_R.
// Original toon NPCs stand with a neon shard shop. Talk to them before you walk out to a rift portal.
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

  const CAST = [
    { id: "nia", name: "NIA", role: "SHOP", dx: 3.5, dz: -0.2, yaw: Math.PI, skin: 0xffe0c4, cloth: 0xff4fd8, glow: 0x28dcff, hat: "visor", shop: true,
      lines: ["Welcome to the Shard Shop. You start as the free Rookie. Holder looks are a one-tap claim.", "Every weapon can be earned by playing. Shards are only a head start, and they have no cash value.", "Bosses and rifts stay outside the neon ring. Talk it out here, then walk out when you want a fight."] },
    { id: "vex", name: "VEX", role: "RIFTS", dx: -3.3, dz: 0.6, yaw: 0.4, skin: 0xffd8b0, cloth: 0x2a2458, glow: 0xffd24a, hat: "cap",
      lines: ["Rift portals open out past the ring. They never open in the hub.", "Follow the compass. Step in and it asks first. You stay until that boss drops.", "Come back and talk before you enter the next one. I am not going anywhere."] },
    { id: "boop", name: "BOOP", role: "HUB", dx: 0.2, dz: 2.6, yaw: Math.PI, skin: 0xfff0d8, cloth: 0x14f195, glow: 0x9945ff, hat: "halo",
      lines: ["This circle is a safe zone. No bites, no boss summons, no meteors on the rug.", "The season board lives in Nia's shop. It stays on this device.", "When you are ready, walk past the lights. The world outside is not this polite."] },
  ];

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

  let shop = null, ring = null;
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
    shop = stall(3.5, -1.5); root.add(shop);
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
  function claim() { if (open && open.shop && C.onClaim) return C.onClaim(); return null; }
  function tick(time, on) {
    root.visible = !!on;
    if (!on) { const b = document.getElementById("hubTalk"); if (b) b.classList.remove("show"); if (open) close(); return; }
    const bob = Math.sin(time * 2);
    npcs.forEach((n, i) => { n.g.position.y = Math.sin(time * 2.2 + i) * .06; const px = C.px(), pz = C.pz(), p = C.plaza(); n.g.rotation.y = Math.atan2(px - (p.x + n.dx), pz - (p.z + n.dz)); });
    if (shop) shop.traverse(o => { if (o.userData && o.userData.spin != null) o.rotation.y = time * 1.4 + o.userData.spin; });
    if (ring) ring.material.opacity = .4 + Math.sin(time * 3) * .15;
    const near = !open && nearest(C.px(), C.pz());
    const b = document.getElementById("hubTalk"); if (b) { b.classList.toggle("show", !!near && !document.body.classList.contains("inmenu")); b.textContent = near ? "TALK · " + near.name : "TALK"; }
    if (open) show();
  }
  function info() { const p = C.plaza(); return { r: SAFE_R, open: open && open.id, line, npcs: npcs.map(n => ({ id: n.id, name: n.name, shop: !!n.shop, x: p.x + n.dx, z: p.z + n.dz })), shop: true }; }
  return { root, place, nearest, talk, next, close, shopOpen, claim, tick, info, SAFE_R };
}
