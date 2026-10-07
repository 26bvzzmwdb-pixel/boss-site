// $BOSS Sandbox v0.9: hand-tuned stylized 3D characters, one per $BOSS skin.
// Chibi toon proportions (big head, small body, elbows + knees, mitten hands), smooth meshes, 3-tone toon shading with a neon rim light,
// constant-width ink outlines, and per-skin painted textures (face, hair, outfit patterns, neon trims) plus 3D headgear + props.
// Expressions are painted live into the head texture (neutral, blink, happy, focus, surprised, hurt). All art is original and procedural.
export function createCharKit(THREE) {
  const grad = new THREE.DataTexture(new Uint8Array([105, 180, 255]), 3, 1, THREE.RedFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const RIM = { uRim: { value: new THREE.Color(0x28dcff) }, uRimK: { value: .45 } };
  function toon(color, o = {}) { const m = new THREE.MeshToonMaterial({ color, gradientMap: grad, ...o });
    m.onBeforeCompile = sh => { sh.uniforms.uRim = RIM.uRim; sh.uniforms.uRimK = RIM.uRimK;
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uRim; uniform float uRimK;")
        .replace("#include <opaque_fragment>", "float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0); outgoingLight += uRim * rimF * uRimK;\n#include <opaque_fragment>"); };
    m.customProgramCacheKey = () => "bossToonRim"; m.userData.plain = !Object.keys(o).length; return m; }
  const outl = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { uC: { value: new THREE.Color(0x160c28) }, uW: { value: .0034 } },
    vertexShader: "#include <common>\n#include <skinning_pars_vertex>\nuniform float uW; void main(){ vec3 objectNormal = vec3(normal); vec3 transformed = vec3(position);\n#include <skinbase_vertex>\n#include <skinnormal_vertex>\n#include <skinning_vertex>\n vec4 mv = modelViewMatrix * vec4(transformed, 1.0); vec3 n = normalize(normalMatrix * objectNormal); mv.xyz += n * uW * clamp(-mv.z, 1.0, 7.0); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0);\n#include <colorspace_fragment>\n}" });
  const G = {}; const geo = (k, f) => G[k] || (G[k] = f());
  const SPH = () => geo("sph", () => new THREE.SphereGeometry(1, 26, 18)), CAP = (r, l) => geo("cap" + r + "_" + l, () => new THREE.CapsuleGeometry(r, l, 3, 10));
  const TORSO = () => geo("torso", () => { const pts = [[0, 0], [.34, .01], [.43, .1], [.47, .32], [.47, .58], [.43, .82], [.3, .97], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y)); return new THREE.LatheGeometry(pts, 28, Math.PI, Math.PI * 2); });
  const SKIRT = () => geo("skirt", () => { const pts = [[.44, 0], [.5, -.2], [.62, -.45], [.72, -.62]].map(([r, y]) => new THREE.Vector2(r, y)); return new THREE.LatheGeometry(pts, 28, Math.PI, Math.PI * 2); });
  // outlines draw last (renderOrder 2) so the depth test rejects most of their pixels; level of detail by on-screen size: small spheres get far fewer segments (a full-res sphere per fingertip cost phones ~20k triangles)
  const SPH_M = () => geo("sphM", () => new THREE.SphereGeometry(1, 18, 12)), SPH_S = () => geo("sphS", () => new THREE.SphereGeometry(1, 12, 8)), SPH_T = () => geo("sphT", () => new THREE.SphereGeometry(1, 8, 6));
  function mesh(g, m, parent, p = [0, 0, 0], s = 1, ol = true) { if (g === G.sph) { const k = typeof s === "number" ? s : Math.max(s[0], s[1], s[2]); if (k <= .07) { g = SPH_T(); ol = false; } else if (k <= .17) g = SPH_S(); else if (k <= .7) g = SPH_M(); }
    const o = new THREE.Mesh(g, m); o.userData.ol = ol; o.position.set(p[0], p[1], p[2]); if (typeof s === "number") o.scale.setScalar(s); else o.scale.set(s[0], s[1], s[2]); parent.add(o); if (ol) { const e = new THREE.Mesh(g, outl); e.renderOrder = 2; o.add(e); } return o; }
  const cvs = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const ctex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const hex = n => "#" + n.toString(16).padStart(6, "0");
  const shade = (n, k) => { const c = new THREE.Color(n); c.multiplyScalar(k); return "#" + c.getHexString(); };

  // ---------------- per-skin specs (hand-tuned from each skin's art) ----------------
  const S = {
    base_climb: { skin: 0xd9a070, hair: ["shaggy", 0x4b2913], beard: 0x4b2913, face: "grin", torso: ["leopard", 0xc08a4a, 0x4e311c], upper: "skin", lower: "skin", glove: "skin", thigh: 0xb07a3f, shin: "skin", boot: "skin", anklet: 0xf2ead8 },
    base_factory: { skin: 0xe1bb94, hair: ["short", 0x64472d], gear: ["hardhat", 0xf3cd46], face: "smile", torso: ["vest", 0x2f5194, 0xf68d35, 0xf7f3e8], upper: 0x2f5194, lower: "skin", glove: 0xf68d35, thigh: 0x2a57a8, shin: 0x2a57a8, boot: 0x64472d, prop: ["wrench", 0xc8ccd8] },
    base_grave: { skin: 0x9fb744, gear: ["pumpkin", 0xef7512], torso: ["shirt", 0x1d2f1a, 0x311a43], upper: 0x1d2f1a, lower: "skin", glove: "skin", thigh: 0x251b35, shin: 0x251b35, boot: 0x1a1426, cape: 0x602159 },
    base_moon: { skin: 0xe1bb94, gear: ["astro", 0xeef0f6, 0xf07a2a], torso: ["astro", 0xeef0f6, 0x8e9ab0], upper: 0xeef0f6, lower: 0xeef0f6, glove: 0x9aa2b4, thigh: 0xeef0f6, shin: 0xeef0f6, boot: 0x8e96a8, pack: [0xd8dce6, 0] },
    base_surf: { skin: 0xda9a69, hair: ["swoop", 0xfdd94e], face: "shades", shades: 0x24b4c3, torso: ["bare", 0xda9a69, 0x24b4c3], upper: "skin", lower: "skin", glove: "skin", thigh: 0x24b4c3, shin: "skin", boot: 0x4b3d37 },
    h_fudder: { skin: 0x7d934d, hair: ["spiky", 0x2a1a10], face: "fudder", torso: ["leopard", 0xcf8635, 0x6e3f18], upper: "skin", lower: "skin", glove: "skin", dust: 0xf0902a, thigh: 0x7f471b, shin: 0x5a3416, boot: 0x4a3419, anklet: 0xf4f1dc, prop: ["puffs", 0xf08a1c], propHand: "L" },
    h_pumpkin: { skin: 0x9fc04a, gear: ["pumpkin", 0xe97f33], torso: ["tunic", 0x4e1d6f, 0xec953e], upper: 0x4e1d6f, lower: 0x4e1d6f, glove: 0x8fd04a, thigh: 0x2a1640, shin: 0x2a1640, boot: 0x1d1028, cape: 0xe0782e, prop: ["minipump", 0xec953e] },
    h_reaper: { skin: 0xeef6f0, gear: ["hood", 0x1b2a26, 0x6dffc4], face: "skull", torso: ["robe", 0x1a2a24, 0x6dffc4], upper: 0x1a2a24, lower: 0x1a2a24, glove: 0x182229, thigh: 0x182229, shin: 0x182229, boot: 0x101418, robe: 0x1a2a24, prop: ["scythe", 0x3f3b35, 0xb0f6d2] },
    h_hardhat: { skin: 0xe7c380, hair: ["short", 0x39291d], face: "smile", torso: ["vest", 0x2f5aa8, 0xf68d35, 0xfcdd6f], upper: 0x2f5aa8, lower: 0x2f5aa8, glove: 0xfcdd6f, thigh: 0x254a91, shin: 0x254a91, boot: 0x39291d, prop: ["pick", 0xfcd34a] },
    h_gearcrown: { skin: 0xe1bc7e, gear: ["mech", 0x34353f, 0xff8a2a], torso: ["mech", 0x34353f, 0xff8a2a], upper: 0x4a4a56, lower: 0x4a4a56, glove: 0x26232b, thigh: 0x2c2d36, shin: 0x2c2d36, boot: 0x1e1e26, prop: ["hammer", 0x5f575f, 0xff8a2a] },
    h_moonhalo: { skin: 0xe1bb94, gear: ["astro", 0xf2f4fa, 0xf0a63a], halo: 0xffd24a, torso: ["astrogold", 0xf2f4fa, 0xedca7a], upper: 0xf2f4fa, lower: 0xf2f4fa, glove: 0xedca7a, thigh: 0xf2f4fa, shin: 0xf2f4fa, boot: 0xedca7a, pack: [0xe8eaf2, 0], prop: ["sword", 0xdfe8ff, 0xedca7a] },
    h_liftoff: { skin: 0xe5bf9f, hair: ["messy", 0x6a3a22], gear: ["goggles", 0x53342d, 0x8fe3ff], face: "smile", torso: ["jump", 0xc92a30, 0xf2f0ea], upper: 0xc92a30, lower: 0xc92a30, glove: 0xf2f0ea, thigh: 0x8e1820, shin: 0x8e1820, boot: 0xf2f0ea, pack: [0xdae0e4, 1], prop: ["blaster", 0xfbea9d] },
    h_sharkfin: { skin: 0xf4dea9, gear: ["shark", 0x2a6fb0, 0x75d0e1], face: "smile", torso: ["waves", 0x0a2a60, 0x75d0e1], upper: 0x0a2a60, lower: 0x0a2a60, glove: 0x75d0e1, thigh: 0x0a2a60, shin: 0x0a2a60, boot: 0x75d0e1, prop: ["board", 0xf4dea9, 0xe85a3a] },
    h_tidal: { skin: 0xeed9a5, gear: ["tidehood", 0x0c6e68, 0xf2f0e4], face: "mask", torso: ["scales", 0x0c6e68, 0x60ae9b], upper: 0x0b4e4b, lower: 0x0b4e4b, glove: 0x0b4e4b, thigh: 0x0b4e4b, shin: 0x0b4e4b, boot: 0xd9b45a, cape: 0x0e5a54, prop: ["spear", 0xd9b45a] },
    h_fossil: { skin: 0xd6a271, hair: ["shaggy", 0x3f281a], beard: 0x3f281a, bone: 1, face: "grin", torso: ["leopard", 0xbd8338, 0x5c3918], upper: "skin", lower: "skin", glove: "skin", thigh: 0x6f4c23, shin: "skin", boot: "skin", anklet: 0xe2cd97, prop: ["club", 0x7a4d1d] },
    h_volcano: { skin: 0x3a1c14, gear: ["horns", 0x4a2a24, 0xff7a2a], face: "ember", torso: ["lava", 0x311d1b, 0xff7a2a], upper: 0x311d1b, lower: 0x311d1b, glove: 0x451e15, thigh: 0x451e15, shin: 0x451e15, boot: 0x2a1410, cape: 0xa01e0e, prop: ["staff", 0x4c2b1d, 0xff7a2a] },
    m_survivor_3: { skin: 0xd8ad81, hair: ["short", 0x2f232d], gear: ["band", 0xc38446], face: "joy", torso: ["jacket", 0x8b501e, 0xe9d9b8], upper: 0x8b501e, lower: 0x8b501e, glove: 0xf6f3ea, thigh: 0x262447, shin: 0x262447, boot: 0xf6f3ea, cape: 0x7a461c, prop: ["trophy", 0xc38446, "3"] },
    m_survivor_5: { skin: 0xdbba9d, hair: ["short", 0x2f232d], gear: ["band", 0xcbd3de], face: "joy", torso: ["jacket", 0x7a8090, 0xeef0f4], upper: 0x7a8090, lower: 0x7a8090, glove: 0xf7f8f9, thigh: 0x262447, shin: 0x262447, boot: 0xf7f8f9, cape: 0x8f98a7, prop: ["trophy", 0xcbd3de, "5"] },
    m_survivor_10: { skin: 0xddaf81, hair: ["short", 0x2f232d], gear: ["band", 0xecc84a], face: "joy", torso: ["jacket", 0xbb8417, 0xfef0bf], upper: 0xbb8417, lower: 0xbb8417, glove: 0xfef0bf, thigh: 0x262447, shin: 0x262447, boot: 0xfef0bf, cape: 0xac6c03, prop: ["trophy", 0xecc84a, "10"] },
    m_slayer_ohio: { skin: 0xd8b49a, gear: ["knight", 0xb3b4c4, 0xce484c], torso: ["tabard", 0xa0a2b4, 0xce484c], upper: 0xb3b4c4, lower: 0xb3b4c4, glove: 0x5d6679, thigh: 0x5d6679, shin: 0xb3b4c4, boot: 0xce484c, cape: 0x8a1f2a, prop: ["sword", 0xe6e8f0, 0xce484c] },
    m_slayer_moon: { skin: 0xd8b49a, gear: ["knight", 0xc0cbda, 0x8fe0f8], torso: ["tabard", 0xa8b4c4, 0x8fe0f8], upper: 0xc0cbda, lower: 0xc0cbda, glove: 0x445262, thigh: 0x445262, shin: 0xc0cbda, boot: 0x8fe0f8, cape: 0x576779, prop: ["sword", 0xe6f4ff, 0x8fe0f8] },
    m_score_50k: { skin: 0xeab98a, hair: ["short", 0x2d232c], gear: ["visor", 0xffd349], face: "smirk", torso: ["neon", 0x1e1530, 0xffd349], upper: 0x1e1530, lower: 0x1e1530, glove: 0x1e1530, thigh: 0x1e1530, shin: 0x1e1530, boot: 0xffd349, prop: ["trophy", 0xffd349, "50K"] },
  };
  const FULL_HELM = { astro: 1, knight: 1, mech: 1, pumpkin: 1 };

  // ---------------- painted head texture (equirect: face centred at u=.25) ----------------
  const HW = 1024, HH = 512, FX = 256, PX = HW / (Math.PI * 2); // px per radian
  function paintHead(g, sp, expr) { const skin = hex(sp.skin); g.clearRect(0, 0, HW, HH); g.fillStyle = skin; g.fillRect(0, 0, HW, HH);
    const gear = sp.gear && sp.gear[0];
    if (gear === "pumpkin") return paintPumpkin(g, sp, expr);
    // hair cap painted on the scalp
    if (sp.hair) { g.fillStyle = hex(sp.hair[1]); g.beginPath(); g.moveTo(0, 0); const jag = sp.hair[0] === "spiky" || sp.hair[0] === "shaggy" ? 1 : 0;
      for (let x = 0; x <= HW; x += 8) { const d = Math.abs(((x - FX + HW * 1.5) % HW) - HW / 2) / (HW / 2); // 0 front .. 1 back
        const base = 168 + (390 - 168) * Math.min(1, Math.max(0, (d - .1) / .75)) ** .8; /* hair reaches the nape at the back */ g.lineTo(x, base + (jag ? Math.sin(x * .19) * 14 + Math.sin(x * .07) * 8 : Math.sin(x * .05) * 3)); }
      g.lineTo(HW, 0); g.closePath(); g.fill(); }
    if (sp.beard) { g.fillStyle = hex(sp.beard); g.beginPath(); g.moveTo(FX - 92, 270); g.quadraticCurveTo(FX - 96, 400, FX, 430); g.quadraticCurveTo(FX + 96, 400, FX + 92, 270); g.quadraticCurveTo(FX + 60, 330, FX, 338); g.quadraticCurveTo(FX - 60, 330, FX - 92, 270); g.fill(); }
    paintFace(g, sp, expr, FX, 272); }
  function eye(g, x, y, s, e, look, dark, sclera = "#fff") { g.lineWidth = 5; g.strokeStyle = dark;
    if (e === "blink" || e === "happy") { g.beginPath(); if (e === "happy") g.arc(x, y + 8, 17 * s, Math.PI * 1.1, Math.PI * 1.9); else { g.moveTo(x - 17 * s, y + 4); g.quadraticCurveTo(x, y + 12, x + 17 * s, y + 4); } g.stroke(); return; }
    const ry = (e === "focus" ? 14 : e === "surprised" ? 27 : e === "hurt" ? 6 : 23) * s, rx = (e === "surprised" ? 20 : 17) * s;
    if (e === "hurt") { g.beginPath(); g.moveTo(x - 15, y - 8); g.lineTo(x + 12, y); g.lineTo(x - 15, y + 8); g.stroke(); return; }
    g.fillStyle = sclera; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.stroke();
    const pr = (e === "surprised" ? 8 : 12) * s; g.fillStyle = dark; g.beginPath(); g.ellipse(x + look * 4, y + 2, pr, Math.min(ry - 2, pr * 1.25), 0, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(x + look * 4 - pr * .35, y - pr * .45, pr * .38, 0, 7); g.fill(); }
  function paintFace(g, sp, e, cx, cy) { const f = sp.face || "smile", dark = "#1a1020", sx = 50;
    if (f === "fudder") { // warts, one bulging red eye + one squint, heavy brow, big pink nose, gap-tooth yelling mouth with green drool
      g.fillStyle = shade(sp.skin, .7); for (const [x, y, r] of [[-120, 200, 12], [-150, 250, 8], [110, 215, 10], [140, 300, 9], [-130, 330, 11], [60, 180, 7], [-60, 170, 8], [380, 230, 14], [470, 300, 12], [-260, 260, 12]]) { g.beginPath(); g.arc(cx + x, y, r, 0, 7); g.fill(); }
      const big = e === "blink" ? "blink" : e === "happy" ? "happy" : e === "hurt" ? "hurt" : e;
      if (big === "blink" || big === "happy" || big === "hurt") { eye(g, cx - 46, cy, 1.15, big, 0, dark); eye(g, cx + 46, cy, 1, big, 0, dark); }
      else { g.lineWidth = 5; g.strokeStyle = dark; g.fillStyle = "#fffbe8"; g.beginPath(); g.ellipse(cx - 44, cy - 2, 27, e === "surprised" ? 32 : 27, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#d8202a"; g.beginPath(); g.arc(cx - 40, cy, e === "surprised" ? 9 : 13, 0, 7); g.fill(); g.fillStyle = dark; g.beginPath(); g.arc(cx - 40, cy, 5, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(cx - 45, cy - 6, 4, 0, 7); g.fill();
        g.fillStyle = "#fffbe8"; g.beginPath(); g.ellipse(cx + 46, cy + 2, 18, e === "focus" ? 6 : 10, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = dark; g.beginPath(); g.arc(cx + 44, cy + 3, 5, 0, 7); g.fill(); }
      g.strokeStyle = "#140c08"; g.lineWidth = 15; g.lineCap = "round"; g.beginPath(); g.moveTo(cx - 92, cy - 40 - (e === "surprised" ? 12 : 0)); g.lineTo(cx - 10, cy - 22); g.lineTo(cx + 20, cy - 26); g.lineTo(cx + 80, cy - 40); g.stroke();
      g.fillStyle = "#f08ca0"; g.strokeStyle = dark; g.lineWidth = 4; g.beginPath(); g.ellipse(cx + 18, cy + 34, 22, 17, .2, 0, 7); g.fill(); g.stroke();
      const my = cy + 74, mw = e === "focus" ? 34 : 48; g.fillStyle = "#4a0f1c"; g.lineWidth = 6; g.beginPath(); if (e === "happy") { g.moveTo(cx - mw, my - 10); g.quadraticCurveTo(cx, my + 40, cx + mw, my - 10); g.closePath(); } else g.ellipse(cx - 4, my, mw, e === "focus" ? 12 : e === "surprised" ? 30 : 24, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = "#fff8d8"; g.fillRect(cx - 26, my - (e === "focus" ? 12 : 22), 16, 18); g.fillRect(cx + 6, my - (e === "focus" ? 12 : 22), 16, 15);
      if (e !== "focus") { g.fillStyle = "#7bf04a"; g.beginPath(); g.ellipse(cx + 26, my + 26, 8, 15, 0, 0, 7); g.fill(); g.beginPath(); g.arc(cx + 26, my + 46, 7, 0, 7); g.fill(); } return; }
    if (f === "skull") { g.fillStyle = "#f2f7f2"; g.fillRect(cx - 160, 140, 320, 330); g.fillStyle = "#0e1714"; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(cx + d * sx, cy, 27, e === "happy" ? 14 : 31, 0, 0, 7); g.fill(); }
      g.fillStyle = "#7dffcf"; g.shadowColor = "#7dffcf"; g.shadowBlur = 16; for (const d of [-1, 1]) { g.beginPath(); g.arc(cx + d * sx, cy + (e === "happy" ? 2 : 4), e === "surprised" ? 13 : 8, 0, 7); g.fill(); } g.shadowBlur = 0;
      g.fillStyle = "#0e1714"; g.beginPath(); g.moveTo(cx, 300); g.lineTo(cx - 9, 318); g.lineTo(cx + 9, 318); g.fill(); g.strokeStyle = "#0e1714"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 40, 345); g.lineTo(cx + 40, 345); g.stroke(); for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * 12, 336); g.lineTo(cx + i * 12, 354); g.stroke(); } return; }
    if (f === "ember") { g.fillStyle = "#ffb347"; g.shadowColor = "#ff7a2a"; g.shadowBlur = 22; for (const d of [-1, 1]) { g.beginPath(); if (e === "happy") g.arc(cx + d * sx, cy + 6, 16, Math.PI * 1.1, Math.PI * 1.9); else { g.moveTo(cx + d * (sx - 22), cy - 10 + (d > 0 ? 0 : 0)); g.lineTo(cx + d * (sx + 22), cy - 2); g.lineTo(cx + d * sx, cy + (e === "surprised" ? 18 : 10)); } g.closePath ? 0 : 0; if (e === "happy") { g.lineWidth = 8; g.strokeStyle = "#ffb347"; g.stroke(); } else g.fill(); } g.shadowBlur = 0; return; }
    const lk = 0; // eyes
    if (f === "shades") { g.fillStyle = hex(sp.shades); g.strokeStyle = dark; g.lineWidth = 5; g.beginPath(); g.roundRect(cx - 92, cy - 22, 80, 42, 14); g.roundRect(cx + 12, cy - 22, 80, 42, 14); g.fill(); g.stroke(); g.beginPath(); g.moveTo(cx - 12, cy - 8); g.lineTo(cx + 12, cy - 8); g.stroke(); g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(cx - 80, cy - 14, 22, 7); g.fillRect(cx + 24, cy - 14, 22, 7); }
    else { const ee = f === "joy" && e === "neutral" ? "happy" : e; eye(g, cx - sx, cy, 1, ee, lk, dark); eye(g, cx + sx, cy, 1, ee, lk, dark); }
    // brows
    g.strokeStyle = sp.hair ? hex(sp.hair[1]) : dark; g.lineWidth = f === "grumpy" ? 13 : 7; g.lineCap = "round"; const ang = f === "grumpy" || e === "focus" ? 1 : e === "surprised" ? -1 : 0;
    if (f === "grumpy") { g.beginPath(); g.moveTo(cx - 88, cy - 44); g.lineTo(cx - 16, cy - 24 + (e === "surprised" ? -16 : 0)); g.lineTo(cx + 16, cy - 24 + (e === "surprised" ? -16 : 0)); g.lineTo(cx + 88, cy - 44); g.stroke(); }
    else if (f !== "shades") for (const d of [-1, 1]) { g.beginPath(); g.moveTo(cx + d * (sx + 22), cy - 36 - ang * 4 - (e === "surprised" ? 10 : 0)); g.lineTo(cx + d * (sx - 18), cy - 36 + ang * 8 - (e === "surprised" ? 10 : 0)); g.stroke(); }
    // nose
    g.fillStyle = shade(sp.skin, .82); g.beginPath(); g.ellipse(cx, cy + 32, 11, 8, 0, 0, 7); g.fill();
    if (f === "mask") { g.fillStyle = hex(sp.gear[2]); g.beginPath(); g.moveTo(cx - 120, cy + 28); g.quadraticCurveTo(cx, cy + 18, cx + 120, cy + 28); g.lineTo(cx + 100, cy + 140); g.quadraticCurveTo(cx, cy + 170, cx - 100, cy + 140); g.fill(); g.strokeStyle = "#9fd8cf"; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(cx - 60, cy + 70 + i * 22); g.quadraticCurveTo(cx, cy + 62 + i * 22, cx + 60, cy + 70 + i * 22); g.stroke(); } return; }
    // mouth
    const my = cy + 66; g.lineWidth = 6; g.strokeStyle = dark; g.fillStyle = "#5a1424";
    const open = e === "happy" || e === "surprised" || f === "grumpy" || (f === "grin" && e !== "blink" && e !== "focus") || (f === "joy");
    if (e === "surprised") { g.beginPath(); g.ellipse(cx, my + 4, 15, 20, 0, 0, 7); g.fill(); g.stroke(); }
    else if (f === "grumpy") { g.beginPath(); g.moveTo(cx - 52, my + 14); g.quadraticCurveTo(cx, my - 22, cx + 52, my + 14); g.quadraticCurveTo(cx, my + 4, cx - 52, my + 14); g.fill(); g.stroke(); g.fillStyle = "#fff"; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * 16 - 6, my - 2 + Math.abs(i) * 4); g.lineTo(cx + i * 16 + 6, my - 2 + Math.abs(i) * 4); g.lineTo(cx + i * 16, my + 9 + Math.abs(i) * 3); g.fill(); } }
    else if (e === "focus") { g.beginPath(); g.moveTo(cx - 22, my); g.lineTo(cx + 22, my - 4); g.stroke(); }
    else if (e === "hurt") { g.beginPath(); g.moveTo(cx - 26, my + 6); g.quadraticCurveTo(cx, my - 12, cx + 26, my + 6); g.stroke(); }
    else if (open) { g.beginPath(); g.moveTo(cx - 40, my - 6); g.quadraticCurveTo(cx, my + 42, cx + 40, my - 6); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#fff"; g.fillRect(cx - 30, my - 5, 60, 9); }
    else if (f === "smirk") { g.beginPath(); g.moveTo(cx - 30, my + 2); g.quadraticCurveTo(cx + 6, my + 14, cx + 34, my - 8); g.stroke(); }
    else { g.beginPath(); g.moveTo(cx - 32, my - 2); g.quadraticCurveTo(cx, my + 22, cx + 32, my - 2); g.stroke(); }
    if (f !== "grumpy" && f !== "shades") { g.fillStyle = "rgba(255,110,130,.28)"; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(cx + d * 82, cy + 44, 20, 11, 0, 0, 7); g.fill(); } } }
  function paintPumpkin(g, sp, e) { const o = hex(sp.gear[1]); g.fillStyle = o; g.fillRect(0, 0, HW, HH); g.strokeStyle = shade(sp.gear[1], .72); g.lineWidth = 10; for (let i = 0; i < 16; i++) { const x = i * HW / 16; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, HH); g.stroke(); } }
  function paintPumpkinGlow(g, e) { g.fillStyle = "#000"; g.fillRect(0, 0, HW, HH); const cx = FX, cy = 262; g.fillStyle = "#ffd25a"; g.shadowColor = "#ff9a20"; g.shadowBlur = 18;
    for (const d of [-1, 1]) { g.beginPath(); if (e === "happy" || e === "blink") { g.moveTo(cx + d * 70, cy + 6); g.quadraticCurveTo(cx + d * 48, cy - 34, cx + d * 22, cy + 6); g.quadraticCurveTo(cx + d * 48, cy - 12, cx + d * 70, cy + 6); } else if (e === "surprised") g.arc(cx + d * 48, cy - 4, 24, 0, 7); else { g.moveTo(cx + d * 76, cy + 14); g.lineTo(cx + d * 46, cy - 34 + (e === "focus" ? 16 : 0)); g.lineTo(cx + d * 20, cy + 14); } g.fill(); }
    g.beginPath(); g.moveTo(cx, cy + 22); g.lineTo(cx - 12, cy + 42); g.lineTo(cx + 12, cy + 42); g.fill();
    g.beginPath(); if (e === "surprised") g.ellipse(cx, cy + 86, 26, 30, 0, 0, 7); else { const w = e === "focus" ? 60 : 92; g.moveTo(cx - w, cy + 62); for (let i = 0; i <= 6; i++) g.lineTo(cx - w + i * w / 3, cy + 62 + (i % 2 ? 22 : 0) + (e === "hurt" ? -8 : 0)); g.quadraticCurveTo(cx, cy + 150, cx - w, cy + 62); } g.fill(); g.shadowBlur = 0; }

  // ---------------- outfit textures (lathe UVs: front at u=.5) ----------------
  function paintTorso(sp) { const [pat, a, b, c] = sp.torso, W = 512, H = 256, cv = cvs(W, H), g = cv.getContext("2d"); let em = null, eg = null; const glow = () => { if (!em) { em = cvs(W, H); eg = em.getContext("2d"); eg.fillStyle = "#000"; eg.fillRect(0, 0, W, H); } return eg; };
    g.fillStyle = hex(a); g.fillRect(0, 0, W, H); const r = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
    const belt = (col, buckle = 0xffd24a) => { g.fillStyle = hex(col); g.fillRect(0, H - 34, W, 22); g.fillStyle = hex(buckle); g.fillRect(W / 2 - 14, H - 36, 28, 26); };
    if (pat === "leopard") { g.fillStyle = hex(b); for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H * .92; g.beginPath(); g.ellipse(x, y, 7 + r() * 9, 5 + r() * 6, r() * 3, 0, 7); g.fill(); } g.fillStyle = shade(a, .8); g.fillRect(0, H - 18, W, 18); if (sp.bone) { g.fillStyle = "#f2ead8"; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(W / 2 - 60 + i * 20, 30 + Math.abs(i - 3) * -4 + 12, 7, 11, 0, 0, 7); g.fill(); } } }
    else if (pat === "vest") { g.fillStyle = hex(b); g.fillRect(W * .3, 0, W * .4, H); g.fillStyle = hex(c); for (const y of [H * .42, H * .66]) { g.fillRect(W * .3, y, W * .17, 16); g.fillRect(W * .53, y, W * .17, 16); } g.fillStyle = shade(b, .7); g.fillRect(W / 2 - 3, 0, 6, H); belt(0x3a2a1c, 0xc8ccd8); }
    else if (pat === "astro" || pat === "astrogold") { g.strokeStyle = hex(b); g.lineWidth = 5; for (const y of [H * .3, H * .7]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.fillStyle = "#cfd6e2"; g.fillRect(W / 2 - 46, H * .36, 92, 56); for (const [i, col] of [[0, "#ff5a6a"], [1, "#28dcff"], [2, "#ffd24a"]]) { g.fillStyle = col; g.fillRect(W / 2 - 36 + i * 26, H * .44, 18, 18); } if (pat === "astrogold") { g.fillStyle = hex(b); g.fillRect(0, H - 30, W, 18); g.fillRect(W / 2 - 4, 0, 8, H * .36); } }
    else if (pat === "bare") { g.fillStyle = shade(a, .86); g.beginPath(); g.ellipse(W / 2 - 38, H * .38, 36, 22, 0, 0, 7); g.ellipse(W / 2 + 38, H * .38, 36, 22, 0, 0, 7); g.fill(); g.fillStyle = hex(b); g.fillRect(0, H - 40, W, 40); g.fillStyle = "#ff5aa8"; g.fillRect(0, H - 40, W, 8); }
    else if (pat === "shirt") { g.fillStyle = shade(a, .75); for (let i = 0; i < 5; i++) g.fillRect(W / 2 - 3, 40 + i * 36, 6, 12); belt(b, 0x9fb744); }
    else if (pat === "tunic") { g.fillStyle = shade(a, 1.25); g.beginPath(); g.moveTo(W / 2 - 50, 0); g.lineTo(W / 2, 60); g.lineTo(W / 2 + 50, 0); g.fill(); belt(b, 0xffd24a); }
    else if (pat === "robe") { const e = glow(); for (const [cx, col] of [[W / 2 - 50, b], [W / 2 + 50, b]]) { g.strokeStyle = hex(col); g.lineWidth = 6; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, H); g.stroke(); e.strokeStyle = hex(col); e.lineWidth = 6; e.beginPath(); e.moveTo(cx, 0); e.lineTo(cx, H); e.stroke(); } g.strokeStyle = hex(b); g.lineWidth = 5; g.beginPath(); g.arc(W / 2, H * .55, 26, 0, 7); g.stroke(); e.strokeStyle = hex(b); e.lineWidth = 5; e.beginPath(); e.arc(W / 2, H * .55, 26, 0, 7); e.stroke(); }
    else if (pat === "mech") { g.fillStyle = shade(a, 1.35); g.fillRect(W / 2 - 60, 30, 120, 90); g.fillStyle = hex(b); g.fillRect(0, H - 40, W, 14); const e = glow(); e.fillStyle = hex(b); e.fillRect(0, H - 40, W, 14); e.beginPath(); e.arc(W / 2, 75, 16, 0, 7); e.fill(); g.beginPath(); g.arc(W / 2, 75, 16, 0, 7); g.fill(); }
    else if (pat === "jump") { g.fillStyle = hex(b); g.fillRect(W / 2 - 70, 0, 26, H); g.beginPath(); g.moveTo(W / 2 + 10, 50); g.lineTo(W / 2 + 50, 50); g.lineTo(W / 2 + 34, 80); g.lineTo(W / 2 + 54, 80); g.lineTo(W / 2 + 14, 130); g.lineTo(W / 2 + 26, 92); g.lineTo(W / 2 + 8, 92); g.fill(); belt(0x2a1a1a, 0xfbea9d); }
    else if (pat === "waves") { g.strokeStyle = hex(b); g.lineWidth = 7; for (let y = 30; y < H; y += 46) { g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * .05) * 10); g.stroke(); } }
    else if (pat === "scales") { g.strokeStyle = hex(b); g.lineWidth = 4; for (let y = 10; y < H; y += 22) for (let x = (y / 22 % 2) * 14; x < W; x += 28) { g.beginPath(); g.arc(x, y, 14, 0, Math.PI); g.stroke(); } belt(0xd9b45a, 0xf2f0e4); }
    else if (pat === "lava") { const e = glow(); g.strokeStyle = hex(b); e.strokeStyle = hex(b); g.lineWidth = e.lineWidth = 5; for (let i = 0; i < 9; i++) { let x = r() * W, y = 0; g.beginPath(); e.beginPath(); g.moveTo(x, y); e.moveTo(x, y); while (y < H) { x += (r() - .5) * 40; y += 18 + r() * 20; g.lineTo(x, y); e.lineTo(x, y); } g.stroke(); e.stroke(); } }
    else if (pat === "jacket") { g.fillStyle = hex(b); g.save(); g.translate(W / 2, H / 2); g.rotate(-.55); g.fillRect(-180, -14, 360, 28); g.restore(); g.fillStyle = "#2ee6a6"; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(W / 2 - 40 + i * 26, H / 2 + 26 - i * 15, 5, 0, 7); g.fill(); } g.fillStyle = shade(a, .7); g.fillRect(W / 2 - 3, 0, 6, H); }
    else if (pat === "tabard") { g.fillStyle = hex(b); g.fillRect(W * .34, 0, W * .32, H); g.fillStyle = "#fff"; g.fillRect(W / 2 - 9, 40, 18, 110); g.fillRect(W / 2 - 40, 70, 80, 18); g.fillStyle = shade(a, .7); for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 4, H); }
    else if (pat === "neon") { const e = glow(); for (const x of [W / 2 - 70, W / 2 - 30, W / 2 + 30, W / 2 + 70]) { g.fillStyle = e.fillStyle = hex(b); g.fillRect(x - 3, 0, 6, H); e.fillRect(x - 3, 0, 6, H); } g.fillRect(0, H - 34, W, 10); e.fillRect(0, H - 34, W, 10); }
    return { map: ctex(cv), em: em && ctex(em) }; }

  // ---------------- props ----------------
  function prop(sp, hand) { const [k, c1, c2] = sp.prop, P = new THREE.Group(); hand.add(P); const m1 = toon(c1), m2 = toon(c2 || c1);
    const stick = (len, r, m, y0 = 0) => mesh(CAP(r, len), m, P, [0, y0 + len / 2, 0]);
    if (k === "wrench") { stick(.42, .03, m1); const h = mesh(SPH(), m1, P, [0, .5, 0], [.09, .07, .04]); P.rotation.set(-1.1, 0, 0); }
    else if (k === "club") { stick(.3, .04, m1); mesh(SPH(), m1, P, [0, .44, 0], [.11, .19, .11]); P.rotation.set(-.9, 0, .1); }
    else if (k === "pick" || k === "hammer") { stick(.5, .028, k === "pick" ? toon(0x6a4a2a) : m1); const hd = mesh(CAP(.05, k === "pick" ? .34 : .16), k === "pick" ? m1 : toon(0x3a3a46), P, [0, .58, 0]); hd.rotation.z = Math.PI / 2; if (k === "hammer") { const gl = mesh(SPH(), toon(c2, { emissive: c2, emissiveIntensity: .8 }), P, [0, .58, .06], .045, false); } P.rotation.set(-1.0, 0, 0); }
    else if (k === "sword") { stick(.12, .03, m2); const gd = mesh(CAP(.03, .16), m2, P, [0, .15, 0]); gd.rotation.z = Math.PI / 2; mesh(SPH(), toon(c1, { emissive: c1, emissiveIntensity: .25 }), P, [0, .5, 0], [.04, .34, .012]); P.rotation.set(-1.15, 0, 0); }
    else if (k === "spear" || k === "staff" || k === "scythe") { stick(1.1, .022, m1, -.45); if (k === "spear") { for (const dx of [-.07, 0, .07]) mesh(SPH(), m1, P, [dx, .72 + (dx ? 0 : .04), 0], [.02, .09, .02]); }
      if (k === "staff") mesh(SPH(), toon(c2, { emissive: c2, emissiveIntensity: 1 }), P, [0, .72, 0], .07, false);
      if (k === "scythe") { const bl = mesh(SPH(), toon(0x9fb0a8, { emissive: c2, emissiveIntensity: .35 }), P, [.18, .62, 0], [.24, .045, .012]); bl.rotation.z = -.35; } P.rotation.set(-.25, 0, 0); }
    else if (k === "board") { mesh(SPH(), m1, P, [0, .3, .06], [.15, .55, .035]); mesh(SPH(), m2, P, [0, .3, .068], [.03, .5, .03], false); P.rotation.set(-.15, 0, 0); P.position.set(.04, -.25, .08); }
    else if (k === "trophy") { mesh(CAP(.04, .06), m1, P, [0, .08, 0]); mesh(SPH(), m1, P, [0, .2, 0], [.1, .09, .1]); mesh(CAP(.06, .02), toon(0x3a2a1c), P, [0, .02, 0], [1, .5, 1]);
      const c = cvs(128, 64), g = c.getContext("2d"); g.fillStyle = "#000"; g.font = "900 40px Verdana"; g.textAlign = "center"; g.fillText(c2, 64, 46); const t = ctex(c); const pl = new THREE.Mesh(new THREE.PlaneGeometry(.14, .07), new THREE.MeshBasicMaterial({ map: t, transparent: true })); pl.position.set(0, .2, .1); P.add(pl); P.position.set(0, .04, .03); P.rotation.set(-.2, 0, 0); }
    else if (k === "puffs") { const c = cvs(128, 160), g = c.getContext("2d"); g.fillStyle = "#f08a1c"; g.fillRect(0, 0, 128, 160); g.fillStyle = "#ffd24a"; g.beginPath(); g.ellipse(64, 80, 54, 36, 0, 0, 7); g.fill(); g.fillStyle = "#c2410c"; g.font = "900 24px Verdana"; g.textAlign = "center"; g.fillText("CHEESY", 64, 74); g.fillText("PUFFS", 64, 102); g.fillStyle = "#fff3"; g.fillRect(10, 8, 14, 140);
      const bm = toon(0xffffff, { map: ctex(c) }); const bag = mesh(SPH(), bm, P, [0, .2, .05], [.16, .21, .07]); bag.rotation.y = Math.PI / 2 - .2; mesh(SPH(), toon(0xf6b545), P, [0, .41, .05], [.12, .03, .05]); P.rotation.set(.15, 0, 0); P.userData.bag = bag; }
    else if (k === "minipump") { mesh(SPH(), toon(c1), P, [0, .12, .06], [.13, .11, .13]); mesh(CAP(.015, .04), toon(0x4c7a2a), P, [0, .25, .06]); }
    else if (k === "blaster") { const b = mesh(CAP(.06, .2), toon(0xdfe4ea), P, [0, .14, .06]); mesh(CAP(.04, .02), toon(c1, { emissive: c1, emissiveIntensity: .9 }), P, [0, .32, .06], 1, false); P.rotation.set(-1.4, 0, 0); }
    return P; }

  // ---------------- bake: merge every plain-coloured part of the whole body into ONE vertex-coloured skinned mesh ----------------
  // each part is rigidly bound (weight 1) to the joint it hangs from, so all limbs still animate, but the body costs 1 draw call + 1 outline
  // instead of ~40 (phones keep 50+ FPS); textured / emissive / two-sided parts stay separate meshes
  const isPlain = o => o.isMesh && o.material !== outl && o.material.userData && o.material.userData.plain;
  function mergeParts(parts) { let nv = 0, ni = 0; for (const p of parts) { nv += p.g.attributes.position.count; ni += p.g.index.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), idx = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni); let vo = 0, io = 0;
    for (const p of parts) { const g = p.g.clone(); g.applyMatrix4(p.m); const pa = g.attributes.position.array, na = g.attributes.normal.array, n = g.attributes.position.count; pos.set(pa, vo * 3); nor.set(na, vo * 3);
      for (let i = 0; i < n; i++) { const v = vo + i; col[v * 3] = p.c.r; col[v * 3 + 1] = p.c.g; col[v * 3 + 2] = p.c.b; si[v * 4] = p.b; sw[v * 4] = 1; } const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + vo; vo += n; io += ia.length; g.dispose(); }
    const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3));
    out.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4)); out.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4)); out.setIndex(new THREE.BufferAttribute(idx, 1)); return out; }
  function bake(root, vmat) { const bones = [], partsO = [], partsN = [], bi = n => { let i = bones.indexOf(n); if (i < 0) { i = bones.length; bones.push(n); } return i; };
    const visit = node => { const keep = [];
      const collect = (m, rel) => { const r = rel.clone().multiply(m.matrix); (m.userData.ol ? partsO : partsN).push({ g: m.geometry, m: r, c: m.material.color, b: bi(node) }); (root.userData.parts || (root.userData.parts = [])).push([m.geometry.type + (m.geometry.parameters ? ":" + Object.values(m.geometry.parameters).slice(0, 3).map(v => +(+v).toFixed(2)).join("/") : ""), m.geometry.index.count / 3, m.userData.ol ? 1 : 0]);
        for (const cc of [...m.children]) { if (cc.material === outl) continue; cc.updateMatrix(); if (isPlain(cc)) collect(cc, r); else { const t = cc; m.remove(t); t.matrix.copy(r.clone().multiply(t.matrix)); t.matrix.decompose(t.position, t.quaternion, t.scale); keep.push(t); } } };
      for (const c of [...node.children]) { c.updateMatrix(); if (isPlain(c)) { node.remove(c); collect(c, new THREE.Matrix4()); } }
      for (const t of keep) node.add(t);
      for (const c of node.children) if (c.isGroup || (c.isMesh && c.material !== outl && c.children.length)) visit(c); };
    root.updateMatrixWorld(true); visit(root);
    const merged = [], skel = new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4())), I = new THREE.Matrix4();
    const skinned = (g, m, ro) => { const sm = new THREE.SkinnedMesh(g, m); sm.bind(skel, I); sm.frustumCulled = false; sm.renderOrder = ro; root.add(sm); return sm; };
    for (const [parts, ol] of [[partsO, true], [partsN, false]]) if (parts.length) { const g = mergeParts(parts); merged.push(g); skinned(g, vmat, 0); if (ol) skinned(g, outl, 2); }
    return { geos: merged, skel }; }
  // ---------------- build ----------------
  function build(id, opt = {}) { const sp = S[id] || S.h_fudder, root = new THREE.Group(), J = { root, sp };
    const skinM = toon(sp.skin), col = v => v === "skin" ? skinM : toon(v);
    const tor = paintTorso(sp), torM = toon(0xffffff, { map: tor.map, ...(tor.em ? { emissiveMap: tor.em, emissive: 0xffffff, emissiveIntensity: .9 } : {}) });
    J.hipY = .66; J.hips = new THREE.Group(); J.hips.position.y = J.hipY; root.add(J.hips); J.chest = new THREE.Group(); J.hips.add(J.chest);
    J.torso = mesh(TORSO(), torM, J.chest, [0, -.04, 0], [.56, .58, .44]);
    if (sp.robe) { const sk = mesh(SKIRT(), toon(sp.robe, { side: THREE.DoubleSide }), J.hips, [0, .02, 0], [.56, 1, .48]); }
    // neck + head
    mesh(CAP(.09, .06), skinM, J.chest, [0, .56, 0], 1, false);
    J.headG = new THREE.Group(); J.headG.position.y = .58; J.chest.add(J.headG);
    const gear = sp.gear ? sp.gear[0] : null;
    // each expression is painted once into its own texture and then just swapped (no per-blink canvas re-upload); live heads use half-res canvases
    const hk = opt.lite ? .5 : 1, mkC = () => { const c = cvs(HW * hk, HH * hk), g = c.getContext("2d"); g.setTransform(hk, 0, 0, hk, 0, 0); return [c, g]; };
    const [hc, hg] = mkC(); const headTex = ctex(hc); let glowT = null, glowC = null;
    if (gear === "pumpkin") { [glowC] = mkC(); glowT = ctex(glowC); }
    const headM = toon(0xffffff, { map: headTex, ...(glowT ? { emissiveMap: glowT, emissive: 0xffffff, emissiveIntensity: 1.2 } : {}) });
    const EX = {}, exTex = [];
    let headGeo = SPH(); if (gear === "pumpkin") headGeo = geo("pumpkinHead", () => { const g2 = new THREE.SphereGeometry(1, 32, 20), p = g2.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - .07 * Math.pow(Math.abs(Math.cos(a * 4)), .6); p.setXYZ(i, x * k * 1.08, y * .92, z * k * 1.08); } g2.computeVertexNormals(); return g2; });
    J.head = mesh(headGeo, headM, J.headG, [0, .36, 0], .4);
    J.headCanvas = hc; J.paint = e => { let t = EX[e]; if (!t) { if (!exTex.length) t = { map: headTex, em: glowT, c: hc, g: hg }; else { const [c, g] = mkC(); t = { map: ctex(c), c, g }; if (glowT) { const [c2] = mkC(); t.em = ctex(c2); } }
        exTex.push(t); EX[e] = t; paintHead(t.g, sp, e); t.map.needsUpdate = true; if (t.em) { const gc = t.em.image, gg = gc.getContext("2d"); gg.setTransform(hk, 0, 0, hk, 0, 0); paintPumpkinGlow(gg, e); t.em.needsUpdate = true; } }
      headM.map = t.map; if (t.em) headM.emissiveMap = t.em; J.headCanvas = t.c; }; J.expr = ""; J.setExpr = e => { if (e !== J.expr) { J.expr = e; J.paint(e); } }; J.setExpr("neutral");
    if (!FULL_HELM[gear] || gear === "pumpkin") for (const d of [-1, 1]) mesh(SPH(), skinM, J.head, [d * .97, -.05, 0], [.16, .24, .14], false);
    const H = J.head; // child positions are in head-radius units (scale .4)
    // hair volumes
    if (sp.hair && !FULL_HELM[gear]) { const hm = toon(sp.hair[1]), st = sp.hair[0];
      if (st === "spiky") { const cg = geo("spike", () => new THREE.ConeGeometry(.26, .75, 6)); // a wild radiating mane like the art
        for (let i = 0; i < 15; i++) { const a = -2.2 + i / 14 * 4.4 + Math.sin(i * 2.3) * .08, len = 1 + Math.sin(i * 1.9) * .25; const R = 1.05 + len * .2; const c = mesh(cg, hm, H, [Math.sin(a) * R, Math.cos(a) * R * .95 + .05, -.22], [1.15, len * 1.25, 1.15], true); c.rotation.set(-.25, 0, -a); }
        for (let i = 0; i < 6; i++) { const a = -1 + i * .4; const c = mesh(cg, hm, H, [Math.sin(a) * .55, .95, .3], [.9, .9, .9], true); c.rotation.set(.55, 0, -a * .9); }
        mesh(SPH(), hm, H, [0, .3, -.16], [1.02, .82, .98]); }
      else if (st === "shaggy") { for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; mesh(SPH(), hm, H, [Math.sin(a) * .62, .45 + Math.cos(a * 3) * .08, Math.cos(a) * .55 - .12], [.42, .36, .42]); } mesh(SPH(), hm, H, [0, .55, -.1], [.92, .55, .9]); }
      else if (st === "swoop") { mesh(SPH(), hm, H, [0, .55, -.1], [1.02, .55, .95]); const w = mesh(geo("cone", () => new THREE.ConeGeometry(.22, .8, 7)), hm, H, [.1, .9, .45], [2.2, 1.2, 1.2]); w.rotation.set(1.1, 0, -.5); }
      else if (st === "messy") { mesh(SPH(), hm, H, [0, .5, -.1], [1.0, .6, .97]); for (let i = 0; i < 5; i++) mesh(SPH(), hm, H, [-.5 + i * .25, .82, .25 - Math.abs(i - 2) * .1], .24); }
      else mesh(SPH(), hm, H, [0, .44, -.08], [1.0, .66, .98]); }
    if (sp.beard) mesh(SPH(), toon(sp.beard), H, [0, -.62, .55], [.62, .45, .38]);
    if (sp.bone) { const bm = toon(0xf2ead8); const b = mesh(CAP(.06, .5), bm, H, [.35, 1.0, 0], 1); b.rotation.z = 1.2; for (const d of [-1, 1]) mesh(SPH(), bm, b, [0, d * .3, 0], .1); }
    // headgear
    if (gear) { const g1 = toon(sp.gear[1]), g2 = sp.gear[2] != null ? toon(sp.gear[2]) : g1;
      if (gear === "hardhat") { mesh(geo("dome", () => new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), g1, H, [0, .18, 0], [1.08, .95, 1.08]); mesh(geo("brim", () => new THREE.CylinderGeometry(1, 1, .08, 28)), g1, H, [0, .2, .12], [1.22, 1, 1.25]); mesh(CAP(.1, 1.3), g1, H, [0, .85, 0], [1, 1, 1]).rotation.x = Math.PI / 2; }
      if (gear === "astro") { H.material = toon(sp.gear[1]); const hel = mesh(SPH(), g1, H, [0, 0, 0], 1.14); const vc = cvs(256, 256), vg = vc.getContext("2d"), gr = vg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#ffd6a0"); gr.addColorStop(.45, hex(sp.gear[2])); gr.addColorStop(1, "#5a1a4a"); vg.fillStyle = gr; vg.fillRect(0, 0, 256, 256); vg.fillStyle = "rgba(255,255,255,.75)"; vg.beginPath(); vg.ellipse(80, 70, 40, 16, -.4, 0, 7); vg.fill();
        const vis = mesh(geo("visor", () => new THREE.SphereGeometry(1, 28, 16, Math.PI / 2 - .95, 1.9, .9, 1.2)), toon(0xffffff, { map: ctex(vc), emissive: sp.gear[2], emissiveIntensity: .25 }), H, [0, 0, 0], 1.17, false); mesh(geo("ring", () => new THREE.TorusGeometry(.7, .16, 10, 28)), g1, H, [0, -.95, 0], 1).rotation.x = Math.PI / 2; J.visor = vis; }
      if (gear === "knight") { H.material = g1; const kc = cvs(512, 256), kg = kc.getContext("2d"); kg.fillStyle = hex(sp.gear[1]); kg.fillRect(0, 0, 512, 256); kg.fillStyle = "#151520"; kg.fillRect(128 - 70, 110, 140, 26); kg.fillRect(128 - 12, 110, 24, 80); kg.fillStyle = hex(sp.gear[2]); kg.fillRect(128 + 30, 96, 30, 12); kg.fillRect(128 + 40, 96, 10, 34);
        H.material = toon(0xffffff, { map: ctex(kc) }); for (let i = 0; i < 6; i++) mesh(SPH(), toon(sp.gear[2]), H, [0, 1.0 + Math.sin(i * .5) * .25, .3 - i * .28], .3 - i * .03); }
      if (gear === "mech") { H.material = g1; mesh(geo("band", () => new THREE.SphereGeometry(1, 28, 6, Math.PI / 2 - 1.2, 2.4, 1.45, .28)), toon(sp.gear[2], { emissive: sp.gear[2], emissiveIntensity: 1 }), H, [0, 0, 0], 1.04, false); mesh(CAP(.04, .5), toon(0x5f575f), H, [.4, 1.1, 0], 1); mesh(SPH(), toon(sp.gear[2], { emissive: sp.gear[2], emissiveIntensity: .8 }), H, [.4, 1.45, 0], .14);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mesh(SPH(), toon(0x8a6a3a), H, [Math.sin(a) * .5, .9, Math.cos(a) * .5], [.13, .2, .13], false); } }
      if (gear === "pumpkin") { mesh(CAP(.08, .2), toon(0x4c7a2a), H, [0, 1.0, 0], 1).rotation.z = .3; const lf = mesh(SPH(), toon(0x6aa83a), H, [.2, .98, 0], [.22, .05, .13], false); }
      if (gear === "hood" || gear === "tidehood" || gear === "horns") { let hoodOpts = { side: THREE.DoubleSide };
        if (gear === "horns") { const lc = cvs(512, 256), lg = lc.getContext("2d"); lg.fillStyle = "#000"; lg.fillRect(0, 0, 512, 256); lg.strokeStyle = hex(sp.gear[2]); lg.lineWidth = 6; let rr = 3; const rnd = () => (rr = (rr * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 10; i++) { let x = rnd() * 512, y = 0; lg.beginPath(); lg.moveTo(x, y); while (y < 256) { x += (rnd() - .5) * 46; y += 16 + rnd() * 22; lg.lineTo(x, y); } lg.stroke(); } hoodOpts = { ...hoodOpts, emissiveMap: ctex(lc), emissive: 0xffffff, emissiveIntensity: 1.1 }; }
        const hood = mesh(geo("hood", () => new THREE.SphereGeometry(1, 28, 18, Math.PI / 2 + .85, Math.PI * 2 - 1.7, 0, Math.PI * .8)), toon(sp.gear[1], hoodOpts), H, [0, .05, -.04], [1.14, 1.16, 1.14]);
        if (gear !== "tidehood") { const tr = mesh(geo("hoodTrim", () => new THREE.TorusGeometry(.92, .045, 6, 28, Math.PI * 1.2)), toon(sp.gear[2], { emissive: sp.gear[2], emissiveIntensity: 1 }), H, [0, .06, .38], 1, false); tr.rotation.set(-.2, 0, -Math.PI * .1); }
        if (gear === "horns") for (const d of [-1, 1]) { const h = mesh(geo("horn", () => new THREE.ConeGeometry(.2, .9, 10)), toon(0x2a1a18, { emissive: 0xff5a1a, emissiveIntensity: .15 }), H, [d * .62, 1.0, -.05], 1); h.rotation.z = -d * .6; } }
      if (gear === "shark") { H.material = headM; const hc2 = cvs(512, 256), hg2 = hc2.getContext("2d"); hg2.fillStyle = hex(sp.gear[1]); hg2.fillRect(0, 0, 512, 256); hg2.globalCompositeOperation = "destination-out"; hg2.beginPath(); hg2.ellipse(128, 136, 50, 52, 0, 0, 7); hg2.fill(); hg2.globalCompositeOperation = "source-over"; hg2.strokeStyle = "#fff"; hg2.lineWidth = 3; for (let x = 0; x < 512; x += 40) { hg2.beginPath(); hg2.moveTo(x, 200); hg2.quadraticCurveTo(x + 20, 190, x + 40, 200); hg2.stroke(); }
        mesh(SPH(), toon(0xffffff, { map: ctex(hc2), alphaTest: .5, side: THREE.DoubleSide }), H, [0, 0, 0], 1.15, false); const rim = mesh(geo("port", () => new THREE.TorusGeometry(.62, .1, 8, 24)), toon(sp.gear[2]), H, [0, -.02, 1.02], 1); rim.rotation.x = 0; const fin = mesh(geo("fin", () => new THREE.ConeGeometry(.35, .8, 3)), toon(sp.gear[1]), H, [0, 1.25, -.25], [1, 1, .35]); fin.rotation.x = -.35; }
      if (gear === "band" || gear === "visor") { const b = mesh(geo("bandT", () => new THREE.TorusGeometry(1.0, .09, 8, 32)), toon(sp.gear[1], gear === "visor" ? { emissive: sp.gear[1], emissiveIntensity: .6 } : {}), H, [0, gear === "visor" ? .02 : .38, 0], [1.02, 1, 1.02], true); b.rotation.x = Math.PI / 2 + (gear === "visor" ? 0 : .12);
        if (gear === "visor") { const v = mesh(geo("visorWrap", () => new THREE.SphereGeometry(1, 28, 6, Math.PI / 2 - 1.0, 2.0, 1.42, .32)), toon(sp.gear[1], { emissive: sp.gear[1], emissiveIntensity: .9 }), H, [0, 0, 0], 1.05, false); }
        else for (const d of [-1, 1]) { const t = mesh(CAP(.07, .3), toon(sp.gear[1]), H, [d * .12, .2, -1.02], 1); t.rotation.set(.6, 0, d * .5); } }
      if (gear === "goggles") { const b = mesh(geo("bandT", () => new THREE.TorusGeometry(1.0, .09, 8, 32)), toon(sp.gear[1]), H, [0, .45, 0], [1.02, 1, 1.02]); b.rotation.x = Math.PI / 2 + .25; for (const d of [-1, 1]) { const l = mesh(geo("lens", () => new THREE.CylinderGeometry(.24, .24, .16, 16)), toon(sp.gear[2], { emissive: sp.gear[2], emissiveIntensity: .35 }), H, [d * .32, .55, .86], 1); l.rotation.x = Math.PI / 2 - .5; } } }
    if (sp.halo) { J.halo = mesh(geo("halo", () => new THREE.TorusGeometry(.7, .07, 8, 32)), toon(sp.halo, { emissive: sp.halo, emissiveIntensity: 1 }), H, [0, 1.55, 0], 1, false); J.halo.rotation.x = Math.PI / 2; }
    // arms: shoulder -> upper -> elbow -> forearm -> hand (+ thumb)
    const upM = col(sp.upper), loM = col(sp.lower), glM = col(sp.glove);
    for (const d of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(d * .3, .44, 0); J.chest.add(sh); mesh(SPH(), upM, sh, [0, 0, 0], .1, false); mesh(CAP(.072, .16), upM, sh, [0, -.12, 0]);
      const el = new THREE.Group(); el.position.y = -.24; sh.add(el); mesh(CAP(.066, .13), loM, el, [0, -.1, 0]); const hand = new THREE.Group(); hand.position.y = -.22; el.add(hand);
      mesh(SPH(), glM, hand, [0, 0, 0], [.088, .095, .08]); mesh(SPH(), glM, hand, [-d * .06, .02, .04], .04);
      if (sp.dust) for (let i = 0; i < 3; i++) mesh(SPH(), toon(sp.dust), hand, [(i - 1) * .04, -.075, .03], .028, false);
      J[d < 0 ? "armL" : "armR"] = sh; J[d < 0 ? "elbowL" : "elbowR"] = el; J[d < 0 ? "handL" : "handR"] = hand; }
    // legs: hip -> thigh -> knee -> shin -> boot
    const thM = col(sp.thigh), shM = col(sp.shin), btM = col(sp.boot);
    for (const d of [-1, 1]) { const hp = new THREE.Group(); hp.position.set(d * .12, .02, 0); J.hips.add(hp); mesh(CAP(.1, .16), thM, hp, [0, -.15, 0]);
      const kn = new THREE.Group(); kn.position.y = -.3; hp.add(kn); mesh(CAP(.085, .14), shM, kn, [0, -.13, 0]); const ft = mesh(SPH(), btM, kn, [0, -.29, .045], [.115, .075, .165]);
      if (sp.anklet) for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; mesh(SPH(), toon(sp.anklet), kn, [Math.sin(a) * .09, -.2, Math.cos(a) * .09], .03, false); }
      J[d < 0 ? "legL" : "legR"] = hp; J[d < 0 ? "kneeL" : "kneeR"] = kn; }
    // cape, jetpack, props
    if (sp.cape) { const cg = geo("cape", () => { const g2 = new THREE.PlaneGeometry(.62, .88, 6, 8), p = g2.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setXYZ(i, x * (1 + (.44 - y) * .45), y - .44, x * x * 1.1 + Math.sin(y * 7 + x * 3) * .02); } g2.computeVertexNormals(); return g2; });
      J.cape = new THREE.Group(); J.cape.position.set(0, .5, -.2); J.chest.add(J.cape); mesh(cg, toon(sp.cape, { side: THREE.DoubleSide }), J.cape, [0, 0, 0], 1, false); }
    if (sp.pack) { const pm = toon(sp.pack[0]); for (const d of [-1, 1]) { mesh(CAP(.09, .2), pm, J.chest, [d * .11, .3, -.27]); mesh(geo("nozzle", () => new THREE.ConeGeometry(.07, .1, 10)), toon(0x5a5f6a), J.chest, [d * .11, .1, -.27], 1, false).rotation.x = Math.PI; }
      if (sp.pack[1]) { J.flames = []; for (const d of [-1, 1]) { const f = mesh(geo("flame", () => new THREE.ConeGeometry(.06, .26, 10)), new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }), J.chest, [d * .11, -.06, -.27], 1, false); f.rotation.x = Math.PI; J.flames.push(f); } } }
    if (sp.prop) J.prop = prop(sp, sp.propHand === "L" ? J.handL : J.handR);
    root.userData.info = { head: new THREE.Color(sp.skin).getHexString(), torso: new THREE.Color(sp.torso[1]).getHexString(), legs: new THREE.Color(sp.thigh === "skin" ? sp.skin : sp.thigh).getHexString() };
    const vmat = toon(0xffffff, { vertexColors: true }); const baked = bake(root, vmat);
    J.dispose = () => { for (const t of exTex) { t.map.dispose(); if (t.em) t.em.dispose(); } root.traverse(o => { if (o.material && o.material !== outl) { for (const k of ["map", "emissiveMap"]) if (o.material[k]) o.material[k].dispose(); o.material.dispose(); } }); for (const g of baked.geos) g.dispose(); baked.skel.dispose(); };
    return J; }
  return { build, specs: S, rim: RIM, outline: outl };
}
