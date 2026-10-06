// $BOSS Sandbox: first-person build & explore (Phase 1, single-player beta).
// Original content: neon tiles, Rug-Buster drill, SOL shard veins (in-game items, no cash value), FUD clouds.
// Not connected to ranked play, wallets, or prizes.
import * as THREE from "./three.module.min.js";

const Q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const IS_TOUCH = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
if (IS_TOUCH) document.body.classList.add("touch");

import { SX, SY, SZ, CS, NCX, NCZ, B, PALETTE, world, idx, inB, get, rng, generate as genWorld } from "./world.js";
const SAVE_KEY = "boss_sandbox_v1";
const DAY_LEN = 480;                               // seconds per full day/night cycle
let seed = 1337, edits = {}, shards = 0, plaza = { x: 40, y: 20, z: 40 };
function generate(sd) { plaza = genWorld(sd); }
function applyEdits() { for (const k in edits) world[+k] = edits[k]; }
function setBlock(x, y, z, id, fromNet) {
  if (!inB(x, y, z)) return false; const i = idx(x, y, z); if (world[i] === id) return false;
  world[i] = id; if (!mp.on) edits[i] = id; markDirty(x, z); if (!fromNet) { mp.sendEdit(x, y, z, id); scheduleSave(); } return true;
}

// ---------------- save / load ----------------
let saveT = 0;
function scheduleSave() { saveT = 1.0; }
function save() { if (mp.on) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, seed, edits, shards, sel, p: [P.x, P.y, P.z, P.yaw, P.pitch], tod })); } catch (e) {} }
function load() { if (Q.has("reset")) try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.v === 1) return s; } catch (e) {} return null; }

// ---------------- renderer / scene ----------------
const canvas = $("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_TOUCH && Q.get("aa") !== "0", powerPreference: "high-performance" });
const DPR_CAP = Math.min(2, parseFloat(Q.get("dpr")) || 2);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 500);
camera.rotation.order = "YXZ";
scene.add(camera);
scene.fog = new THREE.Fog(0x2a1040, IS_TOUCH ? 18 : 26, IS_TOUCH ? 52 : 72);
const hemi = new THREE.HemisphereLight(0xb8a8ff, 0x201030, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd0e0, 1.0); scene.add(sun); scene.add(sun.target);

// ---------------- procedural textures (original neon / beveled style) ----------------
const TS = 64, ATL = 4;
const atlasC = document.createElement("canvas"), glowC = document.createElement("canvas");
atlasC.width = atlasC.height = glowC.width = glowC.height = TS * ATL;
(function paintAtlas() {
  const g = atlasC.getContext("2d"), e = glowC.getContext("2d");
  e.fillStyle = "#000"; e.fillRect(0, 0, glowC.width, glowC.height);
  const R = rng(77);
  const slot = (s, fn) => { const x = (s % ATL) * TS, y = Math.floor(s / ATL) * TS; g.save(); e.save(); g.translate(x, y); e.translate(x, y); g.beginPath(); g.rect(0, 0, TS, TS); g.clip(); e.beginPath(); e.rect(0, 0, TS, TS); e.clip(); fn(g, e); g.restore(); e.restore(); };
  const bevel = (g, base, hi, lo, bw = 6) => { g.fillStyle = base; g.fillRect(0, 0, TS, TS);
    g.fillStyle = hi; g.beginPath(); g.moveTo(0, 0); g.lineTo(TS, 0); g.lineTo(TS - bw, bw); g.lineTo(bw, bw); g.lineTo(bw, TS - bw); g.lineTo(0, TS); g.fill();
    g.fillStyle = lo; g.beginPath(); g.moveTo(TS, TS); g.lineTo(0, TS); g.lineTo(bw, TS - bw); g.lineTo(TS - bw, TS - bw); g.lineTo(TS - bw, bw); g.lineTo(TS, 0); g.fill(); };
  const neonRect = (ctxs, col, inset, w, r = 6) => { for (const c of ctxs) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.roundRect(inset, inset, TS - inset * 2, TS - inset * 2, r); c.stroke(); } };
  const speck = (g, col, n, a) => { g.fillStyle = col; for (let i = 0; i < n; i++) { g.globalAlpha = a * (.4 + R() * .6); g.fillRect(R() * TS, R() * TS, 1 + R() * 2, 1 + R() * 2); } g.globalAlpha = 1; };
  const rockBase = (g, e) => { bevel(g, "#1b1236", "#2a1d4f", "#0d0820", 4); speck(g, "#6b4cc0", 40, .5);
    for (const c of [g, e]) { c.strokeStyle = c === g ? "rgba(170,90,255,.45)" : "rgba(120,60,200,.35)"; c.lineWidth = 1.2; c.beginPath(); let x = 8 + R() * 10, y = 10 + R() * 40; c.moveTo(x, y); for (let i = 0; i < 4; i++) { x += 8 + R() * 8; y += (R() - .5) * 16; c.lineTo(x, y); } c.stroke(); } };
  const crystals = (g, e, n, cols, sz, glowA) => { for (let i = 0; i < n; i++) { const cx = 10 + R() * 44, cy = 10 + R() * 44, s = sz * (.6 + R() * .6), a = R() * Math.PI;
      const pts = []; for (let k = 0; k < 6; k++) { const r = k % 2 ? s * .45 : s; pts.push([cx + Math.cos(a + k * Math.PI / 3) * r, cy + Math.sin(a + k * Math.PI / 3) * r * 1.4]); }
      for (const c of [g, e]) { const gr = c.createLinearGradient(cx - s, cy - s, cx + s, cy + s); cols.forEach((col, j) => gr.addColorStop(j / (cols.length - 1), col));
        c.globalAlpha = c === e ? glowA : 1; c.fillStyle = gr; c.beginPath(); pts.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); c.globalAlpha = 1; }
      g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(cx, cy); g.lineTo(pts[3][0], pts[3][1]); g.stroke(); } };
  // 0 NEON TILE
  slot(0, (g, e) => { bevel(g, "#0b1d3a", "#16345f", "#050c1c"); neonRect([g, e], "#28dcff", 9, 2.5); g.fillStyle = "rgba(40,220,255,.08)"; g.fillRect(12, 12, 40, 40); });
  // 1 VOID ROCK
  slot(1, rockBase);
  // 2 GRID TURF top: teal grid, not grass
  slot(2, (g, e) => { bevel(g, "#06282c", "#0a3a40", "#031518", 3); for (const c of [g, e]) { c.strokeStyle = c === g ? "rgba(34,224,192,.55)" : "rgba(34,224,192,.4)"; c.lineWidth = 1.5; c.beginPath(); for (let i = 16; i < TS; i += 16) { c.moveTo(i, 3); c.lineTo(i, TS - 3); c.moveTo(3, i); c.lineTo(TS - 3, i); } c.stroke(); } speck(g, "#22e0c0", 14, .5); });
  // 3 GRID TURF side: teal glow band over void rock
  slot(3, (g, e) => { rockBase(g, e); g.fillStyle = "#0a3a40"; g.fillRect(0, 0, TS, 14); for (const c of [g, e]) { c.fillStyle = "#22e0c0"; c.fillRect(0, 12, TS, 3); } });
  // 4/5 GREEN CANDLE top/side; 6/7 RED CANDLE top/side
  const candle = (s0, s1, dark, mid, hi) => {
    slot(s0, (g, e) => { bevel(g, dark, mid, "#050505", 5); for (const c of [g, e]) { c.strokeStyle = hi; c.lineWidth = 3; c.beginPath(); c.arc(32, 32, 14, 0, 7); c.stroke(); c.fillStyle = hi; c.fillRect(30, 30, 4, 4); } });
    slot(s1, (g, e) => { const gr = g.createLinearGradient(0, 0, TS, 0); gr.addColorStop(0, dark); gr.addColorStop(.35, mid); gr.addColorStop(1, dark); g.fillStyle = gr; g.fillRect(0, 0, TS, TS);
      g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(12, 0, 6, TS); for (const c of [g, e]) { c.fillStyle = hi; c.fillRect(0, 0, 3, TS); c.fillRect(TS - 3, 0, 3, TS); } });
  };
  candle(4, 5, "#06331c", "#169a58", "#28ff8c"); candle(6, 7, "#3a0812", "#d02840", "#ff3250");
  // 8 BULLION: gold bevel with stamped $
  slot(8, (g, e) => { bevel(g, "#c8961e", "#ffe27a", "#7a5208", 8); g.fillStyle = "#e8b632"; g.fillRect(8, 8, 48, 48); g.font = "900 30px Orbitron,Verdana"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#9a6a10"; g.fillText("$", 33, 34); g.fillStyle = "#fff2b8"; g.fillText("$", 32, 32); e.fillStyle = "rgba(255,200,60,.35)"; e.fillRect(8, 8, 48, 48); });
  // 9 PUMP GLASS: pink glassy with shine + up arrow
  slot(9, (g, e) => { bevel(g, "#3a0a34", "#6a1a60", "#1a0418", 4); g.fillStyle = "rgba(255,79,216,.25)"; g.fillRect(4, 4, 56, 56); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 30); g.lineTo(30, 10); g.moveTo(14, 42); g.lineTo(42, 14); g.stroke();
    for (const c of [g, e]) { c.strokeStyle = "#ff4fd8"; c.lineWidth = 3; c.beginPath(); c.moveTo(32, 50); c.lineTo(32, 22); c.moveTo(22, 32); c.lineTo(32, 20); c.lineTo(42, 32); c.stroke(); } neonRect([e], "#ff4fd8", 4, 2, 4); });
  // 10-12 SOL veins (Solana purple->teal crystals), rarer = brighter / more
  slot(10, (g, e) => { rockBase(g, e); crystals(g, e, 4, ["#9945ff", "#14f195"], 7, .8); });
  slot(11, (g, e) => { rockBase(g, e); crystals(g, e, 6, ["#14f195", "#28dcff", "#9945ff"], 9, 1); speck(e, "#14f195", 20, .8); });
  slot(12, (g, e) => { rockBase(g, e); for (const c of [g, e]) { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 26); gr.addColorStop(0, "#ffffff"); gr.addColorStop(.3, "#fff2b0"); gr.addColorStop(.6, "rgba(153,69,255,.9)"); gr.addColorStop(1, "rgba(20,241,149,0)"); c.fillStyle = gr; c.fillRect(0, 0, TS, TS); } crystals(g, e, 3, ["#fff2b0", "#14f195"], 8, 1); });
  // 13 GENESIS PLATE: unbreakable base, hazard chevrons
  slot(13, (g, e) => { g.fillStyle = "#101010"; g.fillRect(0, 0, TS, TS); g.fillStyle = "#ffd24a"; for (let i = -TS; i < TS * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 - TS, TS); g.lineTo(i - TS, TS); g.fill(); } g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(6, 6, 52, 52); });
  // 14 SOL LAMP: full glow crystal in frame
  slot(14, (g, e) => { bevel(g, "#1a1a2a", "#3a3a5a", "#08080f", 6); for (const c of [g, e]) { const gr = c.createLinearGradient(8, 8, 56, 56); gr.addColorStop(0, "#9945ff"); gr.addColorStop(1, "#14f195"); c.fillStyle = gr; c.fillRect(9, 9, 46, 46); } crystals(g, e, 2, ["#ffffff", "#c8ffe8"], 8, 1); });
  // 15 CHROME PLATE: brushed metal with rivets + thin cyan seam
  slot(15, (g, e) => { const gr = g.createLinearGradient(0, 0, TS, TS); gr.addColorStop(0, "#e8ecff"); gr.addColorStop(.5, "#8890b0"); gr.addColorStop(1, "#c8cce0"); g.fillStyle = gr; g.fillRect(0, 0, TS, TS); bevel(g, "rgba(0,0,0,0)", "rgba(255,255,255,.45)", "rgba(0,0,0,.35)", 5);
    g.strokeStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < TS; i += 3) { g.beginPath(); g.moveTo(0, i); g.lineTo(TS, i + 2); g.stroke(); } g.fillStyle = "#5a6080"; for (const [x, y] of [[11, 11], [53, 11], [11, 53], [53, 53]]) { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); }
    neonRect([g, e], "rgba(40,220,255,.6)", 17, 1.2, 3); });
})();
const atlasTex = new THREE.CanvasTexture(atlasC), glowTex = new THREE.CanvasTexture(glowC);
for (const t of [atlasTex, glowTex]) { t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.anisotropy = 4; }
const blockMat = new THREE.MeshLambertMaterial({ map: atlasTex, emissiveMap: glowTex, emissive: 0xffffff, emissiveIntensity: 1, vertexColors: true });

// ---------------- chunk mesher (face culling + per-vertex AO) ----------------
const FACES = [
  { n: [-1, 0, 0], c: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 1, 1, 0]], t: 1, sh: .82 },
  { n: [1, 0, 0], c: [[1, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]], t: 1, sh: .82 },
  { n: [0, -1, 0], c: [[1, 0, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 1, 1], [0, 0, 0, 0, 1]], t: 2, sh: .6 },
  { n: [0, 1, 0], c: [[0, 1, 1, 1, 1], [1, 1, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 0]], t: 0, sh: 1 },
  { n: [0, 0, -1], c: [[1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [1, 1, 0, 0, 1], [0, 1, 0, 1, 1]], t: 1, sh: .9 },
  { n: [0, 0, 1], c: [[0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 1, 1, 1]], t: 1, sh: .9 },
];
const AO = [.45, .65, .82, 1];
const solid = (x, y, z) => { if (x < 0 || z < 0 || x >= SX || z >= SZ) return 0; return get(x, y, z) ? 1 : 0; };
const chunks = []; const dirty = new Set();
function markDirty(x, z) { const cx = Math.floor(x / CS), cz = Math.floor(z / CS); dirty.add(cx + cz * NCX);
  if (x % CS === 0 && cx > 0) dirty.add(cx - 1 + cz * NCX); if (x % CS === CS - 1 && cx < NCX - 1) dirty.add(cx + 1 + cz * NCX);
  if (z % CS === 0 && cz > 0) dirty.add(cx + (cz - 1) * NCX); if (z % CS === CS - 1 && cz < NCZ - 1) dirty.add(cx + (cz + 1) * NCX); }
function buildChunk(ci) {
  const cx = ci % NCX, cz = Math.floor(ci / NCX), pos = [], nor = [], uv = [], col = [], ind = [];
  const ins = 0.6 / TS;
  for (let y = 0; y < SY; y++) for (let z = cz * CS; z < cz * CS + CS; z++) for (let x = cx * CS; x < cx * CS + CS; x++) {
    const id = world[idx(x, y, z)]; if (!id) continue; const bd = B[id];
    for (const f of FACES) {
      const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
      if (ny < 0) continue; if (ny < SY && solid(nx, ny, nz)) continue;
      const s = bd.tex[f.t], su = (s % ATL) / ATL, sv = Math.floor(s / ATL); const base = pos.length / 3; const ao = [];
      // tangent axes for AO
      const ax = f.n[0] ? 0 : f.n[1] ? 1 : 2, ua = (ax + 1) % 3, va = (ax + 2) % 3;
      for (const c of f.c) {
        pos.push(x + c[0], y + c[1], z + c[2]); nor.push(f.n[0], f.n[1], f.n[2]);
        const tu = ins + c[3] * (1 - 2 * ins), tv = ins + c[4] * (1 - 2 * ins);
        uv.push(su + tu / ATL, 1 - (sv + (1 - tv)) / ATL);
        const o = [x + f.n[0], y + f.n[1], z + f.n[2]], cc = [c[0], c[1], c[2]];
        const du = cc[ua] ? 1 : -1, dv = cc[va] ? 1 : -1;
        const p1 = o.slice(), p2 = o.slice(), p3 = o.slice(); p1[ua] += du; p2[va] += dv; p3[ua] += du; p3[va] += dv;
        const s1 = solid(...p1), s2 = solid(...p2), s3 = solid(...p3); const a = s1 && s2 ? 0 : 3 - (s1 + s2 + s3); ao.push(a);
        const l = AO[a] * f.sh; col.push(l, l, l);
      }
      if (ao[1] + ao[2] < ao[0] + ao[3]) ind.push(base, base + 1, base + 3, base, base + 3, base + 2);
      else ind.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }
  let mesh = chunks[ci];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(ind);
  geo.computeBoundingSphere();
  if (mesh) { mesh.geometry.dispose(); mesh.geometry = geo; } else { mesh = new THREE.Mesh(geo, blockMat); mesh.matrixAutoUpdate = false; scene.add(mesh); chunks[ci] = mesh; }
  return ind.length / 3;
}
function buildAll() { let tris = 0; for (let i = 0; i < NCX * NCZ; i++) tris += buildChunk(i); dirty.clear(); return tris; }

// ---------------- sky (synthwave sun, stars, day/night) + neon grid floor ----------------
const skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3() }, uNight: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uTop,uHor,uSun; uniform float uNight; varying vec3 vD;
  float h3(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
  void main(){ vec3 d=normalize(vD); float h=d.y;
    vec3 c = mix(uHor, uTop, smoothstep(-0.02, 0.55, h)); c = mix(c, uHor*0.35, smoothstep(0.0,-0.35,h));
    float sd = dot(d, normalize(uSun)); vec3 sc = mix(vec3(1.0,0.86,0.3), vec3(1.0,0.25,0.65), clamp((normalize(uSun).y - d.y)*6.0+0.5,0.0,1.0));
    float disc = smoothstep(0.9925,0.9935,sd); float dy = d.y-normalize(uSun).y; float stripes = (dy < 0.0) ? step(0.35, fract(dy*70.0)) : 1.0;
    c += sc*0.45*pow(max(sd,0.0),18.0)*(1.0-uNight*0.6); c = mix(c, sc, disc*stripes*(1.0-uNight));
    float moon = smoothstep(0.9975,0.998,dot(d,-normalize(uSun))); c = mix(c, vec3(0.85,0.8,1.0), moon*uNight);
    vec3 q = floor(d*260.0); float st = step(0.9965, h3(q)) * smoothstep(0.02,0.25,h) * uNight; c += vec3(st)*(0.6+0.4*h3(q+1.0));
    gl_FragColor = vec4(c,1.0);
    #include <colorspace_fragment>
  }` }));
sky.renderOrder = -10; scene.add(sky);
const gridU = { uCol: { value: new THREE.Color(0xff4fd8) }, uCol2: { value: new THREE.Color(0x28dcff) }, uFog: { value: new THREE.Color() } };
const grid = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShaderMaterial({ uniforms: gridU, fog: false,
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uCol,uCol2,uFog; varying vec3 vW; void main(){ vec2 g=abs(fract(vW.xz/4.0-0.5)-0.5)/fwidth(vW.xz/4.0); float l=1.0-min(min(g.x,g.y),1.0);
    float d=length(vW.xz-vec2(40.0)); vec3 c=mix(vec3(0.02,0.0,0.06), mix(uCol,uCol2,0.5+0.5*sin(d*0.05)), l); c=mix(c,uFog,smoothstep(40.0,260.0,d)); gl_FragColor=vec4(c,1.0);
    #include <colorspace_fragment>
  }` }));
grid.rotation.x = -Math.PI / 2; grid.position.set(SX / 2, -6, SZ / 2); scene.add(grid);

// $BOSS logo billboard on the plaza monument
let logoBoard = null;
new THREE.TextureLoader().load("../assets/logo.webp", t => { t.colorSpace = THREE.SRGBColorSpace;
  logoBoard = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, fog: true }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.37, .06, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffd24a })); logoBoard.add(ring);
  logoBoard.position.set(plaza.x, plaza.y + 4.4, plaza.z - 5); scene.add(logoBoard); }, undefined, () => {});

// ---------------- player ----------------
const P = { x: 40, y: 30, z: 40, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, ground: false, r: .3, h: 1.75, eye: 1.6, hurtCD: 0 };
const input = { f: 0, s: 0, jump: false, sprint: false, mine: false, keys: {} };
function collides(x, y, z) {
  const x0 = Math.floor(x - P.r), x1 = Math.floor(x + P.r), y0 = Math.floor(y), y1 = Math.floor(y + P.h - .001), z0 = Math.floor(z - P.r), z1 = Math.floor(z + P.r);
  for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) if (get(xx, yy, zz)) return true;
  return false;
}
function moveAxis(ax, d) {
  if (!d) return; const steps = Math.ceil(Math.abs(d) / .3), sd = d / steps;
  for (let i = 0; i < steps; i++) {
    const nx = P.x + (ax === 0 ? sd : 0), ny = P.y + (ax === 1 ? sd : 0), nz = P.z + (ax === 2 ? sd : 0);
    if (!collides(nx, ny, nz)) { P.x = nx; P.y = ny; P.z = nz; continue; }
    // auto step-up for 1-block ledges while walking (feels better on touch)
    if (ax !== 1 && P.ground && !collides(nx, P.y + 1.01, nz) && !collides(P.x, P.y + 1.01, P.z)) { P.y += 1.01; P.x = nx; P.z = nz; P.vy = Math.max(P.vy, 0); continue; }
    if (ax === 1) { if (sd < 0) { P.ground = true; P.y = Math.floor(P.y + sd) + 1; } else P.y = Math.ceil(P.y + P.h) - P.h - .001; P.vy = 0; }
    else if (ax === 0) P.vx = 0; else P.vz = 0;
    return;
  }
}
function updPlayer(dt) {
  let f = input.f, s = input.s; const k = input.keys;
  if (k.KeyW || k.ArrowUp) f += 1; if (k.KeyS || k.ArrowDown) f -= 1; if (k.KeyD || k.ArrowRight) s += 1; if (k.KeyA || k.ArrowLeft) s -= 1;
  const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
  const sp = (input.sprint || k.ShiftLeft || k.ShiftRight || len > .95 && IS_TOUCH && joy.active && joy.mag > .95) ? 6.4 : 4.4;
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const tx = (-sy * f + cy * s) * sp, tz = (-cy * f - sy * s) * sp;
  const acc = P.ground ? 14 : 5; P.vx += (tx - P.vx) * Math.min(1, acc * dt); P.vz += (tz - P.vz) * Math.min(1, acc * dt);
  if ((input.jump || k.Space) && P.ground) { P.vy = 8.3; P.ground = false; sfx.jump(); }
  input.jump = false;
  P.vy = Math.max(-40, P.vy - 24 * dt);
  P.ground = false;
  moveAxis(1, P.vy * dt); moveAxis(0, P.vx * dt); moveAxis(2, P.vz * dt);
  P.x = Math.max(P.r + .01, Math.min(SX - P.r - .01, P.x)); P.z = Math.max(P.r + .01, Math.min(SZ - P.r - .01, P.z));
  if (P.y < -20) respawn();
  P.hurtCD = Math.max(0, P.hurtCD - dt);
}
function respawn() { P.x = plaza.x; P.y = plaza.y + .1; P.z = plaza.z; P.vx = P.vy = P.vz = 0; P.yaw = 0; P.pitch = -.08; while (collides(P.x, P.y, P.z) && P.y < SY) P.y += 1; }

// ---------------- voxel raycast (Amanatides & Woo) ----------------
function raycast(o, d, max) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
  const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
  let tx = (sx > 0 ? x + 1 - o.x : o.x - x) * tdx, ty = (sy > 0 ? y + 1 - o.y : o.y - y) * tdy, tz = (sz > 0 ? z + 1 - o.z : o.z - z) * tdz;
  let n = [0, 0, 0], t = 0;
  for (let i = 0; i < 64 && t <= max; i++) {
    if (inB(x, y, z) && world[idx(x, y, z)]) return { x, y, z, n, t, id: world[idx(x, y, z)] };
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; n = [-sx, 0, 0]; } else if (ty < tz) { y += sy; t = ty; ty += tdy; n = [0, -sy, 0]; } else { z += sz; t = tz; tz += tdz; n = [0, 0, -sz]; }
  }
  return null;
}

// ---------------- target outline, drill viewmodel, laser, particles ----------------
const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x28dcff, transparent: true, opacity: .9, fog: false }));
outline.visible = false; scene.add(outline);
const coreGlow = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x9945ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
outline.add(coreGlow);
// Rug-Buster laser drill (original tool)
const drill = new THREE.Group();
const vm = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = 999; mat.depthTest = false; mat.fog = false; drill.add(m); return m; };
const dBody = vm(new THREE.BoxGeometry(.11, .11, .38), new THREE.MeshLambertMaterial({ color: 0x24203a, emissive: 0x0c0820 }));
const dStripe = vm(new THREE.BoxGeometry(.115, .02, .3), new THREE.MeshBasicMaterial({ color: 0xc0309a })); dStripe.position.set(0, .046, .02); dStripe.scale.set(.5, .6, 1);
const dBarrel = vm(new THREE.CylinderGeometry(.028, .04, .22, 10), new THREE.MeshLambertMaterial({ color: 0xc8cce0, emissive: 0x202030 })); dBarrel.rotation.x = Math.PI / 2; dBarrel.position.z = -.29;
const dRing = vm(new THREE.TorusGeometry(.05, .012, 6, 16), new THREE.MeshBasicMaterial({ color: 0x14f195 })); dRing.position.z = -.25;
const dTip = vm(new THREE.SphereGeometry(.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0x9945ff })); dTip.position.z = -.41;
const dGrip = vm(new THREE.BoxGeometry(.07, .16, .08), new THREE.MeshLambertMaterial({ color: 0x15121f })); dGrip.position.set(0, -.1, .1); dGrip.rotation.x = .3;
drill.scale.setScalar(.75); drill.rotation.y = .08; camera.add(drill);
const laser = new THREE.Mesh(new THREE.CylinderGeometry(.012, .02, 1, 6).translate(0, .5, 0).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x14f195, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
laser.visible = false; scene.add(laser);
const PN = IS_TOUCH ? 220 : 500, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN); let pHead = 0;
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
const dotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"); const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.4, "rgba(255,255,255,.8)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
const parts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: .2, map: dotTex, alphaTest: .01, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
parts.frustumCulled = false; scene.add(parts); for (let i = 0; i < PN; i++) pPos[i * 3 + 1] = -999;
function burst(x, y, z, cols, n = 40, spd = 4) { const tc = new THREE.Color(); for (let i = 0; i < n; i++) { const j = pHead; pHead = (pHead + 1) % PN; tc.set(cols[i % cols.length]);
  pPos[j * 3] = x + (Math.random() - .5) * .6; pPos[j * 3 + 1] = y + (Math.random() - .5) * .6; pPos[j * 3 + 2] = z + (Math.random() - .5) * .6;
  pVel[j * 3] = (Math.random() - .5) * spd; pVel[j * 3 + 1] = Math.random() * spd * .9 + 1; pVel[j * 3 + 2] = (Math.random() - .5) * spd; pCol[j * 3] = tc.r; pCol[j * 3 + 1] = tc.g; pCol[j * 3 + 2] = tc.b; pLife[j] = .6 + Math.random() * .6; } }
function updParts(dt) { for (let i = 0; i < PN; i++) { if (pLife[i] <= 0) continue; pLife[i] -= dt; if (pLife[i] <= 0) { pPos[i * 3 + 1] = -999; continue; }
  pVel[i * 3 + 1] -= 9 * dt; pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt; }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true; }

// ---------------- FUD clouds (night hazard) ----------------
const fudTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.translate(64, 64); const r = 40;
  g.fillStyle = "#2a1c44"; g.strokeStyle = "#ff6a8a"; g.lineWidth = 4; g.shadowColor = "#ff3250"; g.shadowBlur = 16;
  g.beginPath(); g.arc(-r * .5, 6, r * .55, 0, 7); g.arc(r * .05, -r * .25, r * .65, 0, 7); g.arc(r * .6, 8, r * .5, 0, 7); g.arc(0, r * .3, r * .6, 0, 7); g.fill(); g.shadowBlur = 0; g.stroke();
  g.strokeStyle = "#ff3250"; g.lineWidth = 4; g.beginPath(); g.moveTo(-22, -14); g.lineTo(-8, -7); g.moveTo(22, -14); g.lineTo(8, -7); g.stroke();
  g.fillStyle = "#ff3250"; g.beginPath(); g.arc(-13, -2, 5, 0, 7); g.arc(13, -2, 5, 0, 7); g.fill();
  g.font = "900 18px Orbitron,Verdana"; g.textAlign = "center"; g.fillStyle = "#ffd0d8"; g.fillText("FUD", 0, 26);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const fuds = []; let fudTimer = 2;
function spawnFud() { const a = Math.random() * 6.28, d = 16 + Math.random() * 8; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fudTex, transparent: true, fog: false }));
  s.scale.set(1.6, 1.6, 1); s.position.set(P.x + Math.cos(a) * d, P.y + 3 + Math.random() * 3, P.z + Math.sin(a) * d); scene.add(s); fuds.push({ s, hp: .7, t: Math.random() * 6 }); }
function updFuds(dt, night) {
  const want = night > .6 && !Q.has("nofud") ? 3 : 0;
  fudTimer -= dt; if (want === 0) fudTimer = 2; else if (fuds.length < want && fudTimer <= 0) { spawnFud(); fudTimer = 6 + Math.random() * 6; }
  for (let i = fuds.length - 1; i >= 0; i--) { const f = fuds[i], s = f.s; f.t += dt;
    const dx = P.x - s.position.x, dy = P.y + 1.2 - s.position.y, dz = P.z - s.position.z, d = Math.hypot(dx, dy, dz);
    const gone = want === 0; s.material.opacity = Math.max(0, Math.min(1, s.material.opacity + (gone ? -dt : dt)));
    if (gone && s.material.opacity <= 0) { scene.remove(s); fuds.splice(i, 1); continue; }
    if (d < 26 && !gone) { const sp = 1.9 / Math.max(d, .01); s.position.x += dx * sp * dt; s.position.y += dy * sp * dt + Math.sin(f.t * 2) * .01; s.position.z += dz * sp * dt; }
    if (d < 1.1 && P.hurtCD <= 0 && !gone) { P.hurtCD = 1.6; P.vx -= dx / d * 9; P.vz -= dz / d * 9; P.vy = 5; const lost = Math.min(1, shards); shards -= lost; updShards();
      pop(lost ? "FUD! −1 SHARD" : "FUD!", "#ff6a8a"); $("hurt").style.opacity = 1; setTimeout(() => $("hurt").style.opacity = 0, 250); sfx.hurt(); }
  }
}

// ---------------- mining / building ----------------
let mineT = 0, mineKey = "", hit = null, fudHit = null;
const tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3();
function aim() {
  camera.getWorldPosition(tmpV); camera.getWorldDirection(tmpD);
  hit = raycast(tmpV, tmpD, 6);
  fudHit = null; let best = hit ? hit.t : 8;
  for (const f of fuds) { const o = f.s.position, lx = o.x - tmpV.x, ly = o.y - tmpV.y, lz = o.z - tmpV.z, t = lx * tmpD.x + ly * tmpD.y + lz * tmpD.z;
    if (t < 0 || t > best) continue; const px = lx - tmpD.x * t, py = ly - tmpD.y * t, pz = lz - tmpD.z * t; if (px * px + py * py + pz * pz < .8 * .8) { best = t; fudHit = f; } }
}
let mineGrace = 0; // keeps mining briefly if the thumb wobbles off the button
function breakBlock(x, y, z, id) {
  setBlock(x, y, z, 0); const c = B[id];
  burst(x + .5, y + .5, z + .5, [c.col, 0xffffff, c.drop ? 0x14f195 : c.col], IS_TOUCH ? (c.drop ? 36 : 18) : (c.drop ? 70 : 35), c.drop ? 6 : 4);
  const gain = (c.drop || 0) + (c.cost || 0);
  if (gain) { shards += gain; updShards(); pop(`◆ +${gain} ${c.drop ? c.name.replace(" VEIN", "") : "REFUND"}`, c.drop >= 10 ? "#fff2b0" : c.drop >= 3 ? "#14f195" : "#c69bff"); sfx.shard(c.drop || 1); }
  else sfx.brk();
  mineKey = ""; mineT = 0;
}
function trySoftTapMine() {
  aim();
  if (fudHit) return false;
  if (!hit || B[hit.id].hard === Infinity) return false;
  // one-tap mine for soft pieces (hard <= 0.45) on phone
  if (B[hit.id].hard > 0.45) return false;
  breakBlock(hit.x, hit.y, hit.z, hit.id); return true;
}
function updMining(dt, time) {
  aim();
  const tgt = $("target");
  if (hit && !fudHit) { outline.visible = true; outline.position.set(hit.x + .5, hit.y + .5, hit.z + .5); const bd = B[hit.id]; tgt.textContent = bd.name + (bd.drop ? `  ◆+${bd.drop}` : bd.hard === Infinity ? "  (unbreakable)" : ""); }
  else { outline.visible = false; tgt.textContent = fudHit ? "FUD CLOUD · HOLD TO ZAP" : ""; }
  if (input.mine) mineGrace = IS_TOUCH ? 0.28 : 0; else if (mineGrace > 0) mineGrace -= dt;
  const mining = input.mine || mineGrace > 0;
  let prog = 0;
  if (mining && fudHit) { fudHit.hp -= dt; prog = 1 - fudHit.hp / .7; if (fudHit.hp <= 0) { const p = fudHit.s.position; burst(p.x, p.y, p.z, ["#ff6a8a", "#ff3250", "#ffd0d8"], IS_TOUCH ? 30 : 60, 6); scene.remove(fudHit.s); fuds.splice(fuds.indexOf(fudHit), 1); shards += 2; updShards(); pop("FUD CLEARED ◆+2", "#14f195"); sfx.zap(); } mineKey = ""; mineT = 0; }
  else if (mining && hit && B[hit.id].hard !== Infinity) {
    const key = hit.x + "," + hit.y + "," + hit.z; if (key !== mineKey) { mineKey = key; mineT = 0; }
    mineT += dt; const bd = B[hit.id]; const need = Math.max(0.18, bd.hard * (IS_TOUCH ? 0.85 : 1)); // slightly faster on phone
    prog = Math.min(1, mineT / need);
    const s = 1.004 - prog * .12 + Math.sin(time * 60) * .01 * prog; outline.scale.setScalar(s);
    coreGlow.material.color.setHex(bd.col); coreGlow.material.opacity = prog * .55;
    if (Math.random() < dt * (IS_TOUCH ? 14 : 30)) burst(hit.x + .5 + hit.n[0] * .55, hit.y + .5 + hit.n[1] * .55, hit.z + .5 + hit.n[2] * .55, [bd.col, 0xffffff], 1, 2);
    if (prog >= 1) breakBlock(hit.x, hit.y, hit.z, hit.id);
  } else if (!mining) { mineT = 0; mineKey = ""; outline.scale.setScalar(1); coreGlow.material.opacity = 0; }
  if (!mining) { outline.scale.setScalar(1); coreGlow.material.opacity = 0; }
  $("ring").setAttribute("stroke-dashoffset", (94.25 * (1 - prog)).toFixed(2));
  const firing = mining && (fudHit || (hit && B[hit.id].hard !== Infinity));
  laser.visible = !!firing; dTip.material.color.setHex(firing ? (Math.sin(time * 40) > 0 ? 0x14f195 : 0xffffff) : 0x9945ff); dRing.rotation.z += dt * (firing ? 30 : 2);
  if (firing) { dTip.getWorldPosition(tmpV); const end = fudHit ? fudHit.s.position.clone() : new THREE.Vector3(hit.x + .5 + hit.n[0] * .5, hit.y + .5 + hit.n[1] * .5, hit.z + .5 + hit.n[2] * .5);
    laser.position.copy(tmpV); laser.lookAt(end); laser.scale.set(1, 1, tmpV.distanceTo(end)); laser.material.opacity = .6 + Math.random() * .4; }
}
function place() {
  if (!hit) return; const id = PALETTE[sel], bd = B[id];
  const x = hit.x + hit.n[0], y = hit.y + hit.n[1], z = hit.z + hit.n[2];
  if (!inB(x, y, z) || get(x, y, z)) return;
  if (x + 1 > P.x - P.r && x < P.x + P.r && z + 1 > P.z - P.r && z < P.z + P.r && y + 1 > P.y && y < P.y + P.h) return;
  if (bd.cost) { if (shards < bd.cost) { pop(`NEED ◆${bd.cost} SOL SHARDS`, "#ff6a8a"); return; } shards -= bd.cost; updShards(); }
  setBlock(x, y, z, id); burst(x + .5, y + .5, z + .5, [bd.col, 0xffffff], 14, 2); sfx.place(); drillKick = 1;
}

// ---------------- HUD ----------------
let sel = 0, drillKick = 0; const drillBase = new THREE.Vector3(.3, -.27, -.6);
function pop(t, c) { const d = document.createElement("div"); d.className = "pop"; d.style.color = c; d.textContent = t; $("pops").appendChild(d); setTimeout(() => d.remove(), 1100); }
function updShards() { $("shardN").textContent = shards; }
function buildPalette() {
  const pal = $("palette"); pal.innerHTML = "";
  PALETTE.forEach((id, i) => { const b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-label", B[id].name);
    const c = document.createElement("canvas"); c.width = c.height = 48; const s = B[id].tex[1]; c.getContext("2d").drawImage(atlasC, (s % ATL) * TS, Math.floor(s / ATL) * TS, TS, TS, 0, 0, 48, 48);
    b.appendChild(c); b.insertAdjacentHTML("beforeend", `<span class="k">${i + 1}</span>` + (B[id].cost ? `<span class="c">◆${B[id].cost}</span>` : ""));
    b.addEventListener("pointerdown", e => { e.stopPropagation(); e.preventDefault(); select(i); }); pal.appendChild(b); });
  select(sel, true);
}
let nameT = null;
function select(i, quiet) { sel = (i + PALETTE.length) % PALETTE.length; [...$("palette").children].forEach((c, j) => c.classList.toggle("sel", j === sel));
  const m = $("matName"); const bd = B[PALETTE[sel]]; m.textContent = bd.name + (bd.cost ? ` · costs ◆${bd.cost}` : ""); m.style.opacity = 1; clearTimeout(nameT); nameT = setTimeout(() => m.style.opacity = 0, 1600); if (!quiet) sfx.click(); }

// ---------------- audio (tiny WebAudio blips) ----------------
let AC = null;
function tone(f, d, type = "square", v = .08, slide = 0) { if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d); }
const sfx = { jump: () => tone(300, .12, "square", .04, 200), brk: () => tone(160, .1, "triangle", .1, -80), place: () => tone(520, .06, "square", .05), click: () => tone(880, .03, "square", .03),
  shard: n => { tone(n >= 10 ? 1046 : n >= 3 ? 880 : 740, .12, "triangle", .1); setTimeout(() => tone(n >= 10 ? 1568 : 1175, .18, "triangle", .08), 70); }, hurt: () => tone(140, .25, "sawtooth", .08, -60), zap: () => tone(1200, .2, "sawtooth", .05, -900) };
function initAudio() { if (AC) { if (AC.state === "suspended") AC.resume(); return; } try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }

// ---------------- controls: desktop ----------------
let running = false, locked = false;
function maybeShowTip() {
  if (!IS_TOUCH || Q.has("notip")) return;
  try { if (localStorage.getItem(TIP_KEY) === "1") return; } catch (e) {}
  $("tip").classList.add("show");
}
function startGame() { initAudio(); $("menu").classList.add("hide"); running = true; last = performance.now();
  maybeShowTip();
  if (!IS_TOUCH && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } }
function pause() { running = false; input.mine = false; $("menu").classList.remove("hide"); $("playBtn").textContent = "RESUME"; save(); if (document.pointerLockElement) document.exitPointerLock(); }
document.addEventListener("pointerlockchange", () => { locked = document.pointerLockElement === canvas; if (!locked && running && !IS_TOUCH && !window.__SB_TEST) pause(); });
canvas.addEventListener("mousedown", e => { if (IS_TOUCH) return; if (!running) return; if (!locked && canvas.requestPointerLock && !window.__SB_TEST) { startGame(); return; }
  if (e.button === 0) input.mine = true; else if (e.button === 2) place(); });
window.addEventListener("mouseup", e => { if (e.button === 0) input.mine = false; });
canvas.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("mousemove", e => { if (!locked) return; if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return; /* ignore pointer-lock spike */ look(e.movementX * .0022, e.movementY * .0022); });
window.addEventListener("wheel", e => { if (running) select(sel + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
window.addEventListener("keydown", e => { input.keys[e.code] = true; if (e.code === "Space") e.preventDefault();
  if (/^Digit[1-8]$/.test(e.code)) select(+e.code[5] - 1); if (e.code === "KeyQ") select(sel - 1); if (e.code === "KeyE") select(sel + 1);
  if (e.code === "KeyR" && running) respawn(); if (e.code === "KeyG" && mp.on && mp.ws) mp.ws.send(JSON.stringify({ t: "emote", k: 0 })); if ((e.code === "KeyP") && running) pause(); });
window.addEventListener("keyup", e => { input.keys[e.code] = false; });
window.addEventListener("blur", () => { input.keys = {}; input.mine = false; });
function look(dx, dy) { P.yaw -= dx; P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch - dy)); }

// ---------------- controls: touch (left joystick, right drag-look, buttons) ----------------
const joy = { id: null, ox: 0, oy: 0, active: false, mag: 0, R: 64, dead: 0.18 };
const lookT = { id: null, x: 0, y: 0, moved: false };
let lookSlow = false;
const LOOK_SENS = () => lookSlow ? 0.0020 : 0.0032; // was 0.0058; slower default for iPhone thumbs
const TIP_KEY = "boss_sandbox_tip_v2";
function overUI(x, y) {
  // Don't start look/joystick on HUD buttons, palette, tip, or pause.
  const el = document.elementFromPoint(x, y);
  if (!el || el === $("touch") || el === $("game") || el === $("lookPad") || el === document.body) return false;
  return !!(el.closest && el.closest(".tbtn, #palette, #pauseBtn, #lookSlow, #tip, #menu, .chip, #badge, #shards"));
}
function inLookZone(x, y) {
  // Right side of the screen, above the action buttons, so look doesn't fight MINE/BUILD/JUMP.
  const w = innerWidth, h = innerHeight;
  if (x < w * 0.42) return false;
  // leave the bottom-right button cluster alone (~42% height in portrait, ~48% in landscape)
  const btnTop = h * (w > h ? 0.48 : 0.52);
  return y < btnTop;
}
function inMoveZone(x, y) {
  const w = innerWidth, h = innerHeight;
  if (x > w * 0.50) return false;
  // leave bottom-left palette + LOOK:SLOW alone (bottom ~22% in portrait)
  return y < h * 0.82;
}
function applyJoy(dx, dy) {
  const R = joy.R;
  let ox = joy.ox, oy = joy.oy, fx = ox + dx, fy = oy + dy;
  let d = Math.hypot(dx, dy);
  // sticky: follow the thumb when it leaves the rim so the stick doesn't snap back
  if (d > R * 1.2) {
    const over = d - R;
    const nx = dx / d, ny = dy / d;
    joy.ox += nx * over * 0.7; joy.oy += ny * over * 0.7;
    $("stick").style.left = joy.ox + "px"; $("stick").style.top = joy.oy + "px";
    dx = fx - joy.ox; dy = fy - joy.oy; d = Math.hypot(dx, dy);
  }
  const clx = d > R ? dx * R / d : dx, cly = d > R ? dy * R / d : dy;
  const mag = Math.min(1, d / R); joy.mag = mag;
  $("stick").firstElementChild.style.transform = `translate(${clx}px,${cly}px)`;
  if (mag < joy.dead) { input.s = 0; input.f = 0; return; }
  const t = (mag - joy.dead) / (1 - joy.dead); // 0..1 after dead zone
  let sx = (clx / R) * t, sf = (-cly / R) * t;
  const len = Math.hypot(sx, sf); if (len > 1) { sx /= len; sf /= len; }
  input.s = sx; input.f = sf;
}
if (IS_TOUCH) {
  const T = $("touch"); T.style.display = "block";
  for (const b of ["bMine", "bBuild", "bJump"]) $(b).style.display = "block";
  $("lookSlow").style.display = "block"; $("stickHint").style.display = "block"; $("lookPad").style.display = "block";
  $("ctlDesk").style.display = "none"; $("ctlTouch").style.display = "grid";
  const st = $("stick"), knob = st.firstElementChild;
  // First-run tip overlay (shown when PLAY is tapped — see maybeShowTip)
  $("tipGot").addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); $("tip").classList.remove("show"); try { localStorage.setItem(TIP_KEY, "1"); } catch (_) {} initAudio(); });
  const toggleLookSlow = () => { lookSlow = !lookSlow; $("lookSlow").classList.toggle("on", lookSlow); $("lookSlow").textContent = lookSlow ? "LOOK: SLOW" : "LOOK: NORM"; };
  $("lookSlow").addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); toggleLookSlow(); });

  T.addEventListener("touchstart", e => { e.preventDefault();
    for (const t of e.changedTouches) {
      if (overUI(t.clientX, t.clientY)) continue; // buttons/palette own their pointers
      if (inMoveZone(t.clientX, t.clientY) && joy.id === null) {
        joy.id = t.identifier; joy.ox = t.clientX; joy.oy = Math.min(t.clientY, innerHeight * 0.72); joy.active = true; joy.mag = 0;
        st.style.display = "block"; st.style.left = joy.ox + "px"; st.style.top = joy.oy + "px"; knob.style.transform = "";
        $("stickHint").style.display = "none"; input.f = input.s = 0;
      } else if (inLookZone(t.clientX, t.clientY) && lookT.id === null) {
        lookT.id = t.identifier; lookT.x = t.clientX; lookT.y = t.clientY; lookT.moved = false;
      }
    }
  }, { passive: false });
  T.addEventListener("touchmove", e => { e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) applyJoy(t.clientX - joy.ox, t.clientY - joy.oy);
      else if (t.identifier === lookT.id) {
        const dx = t.clientX - lookT.x, dy = t.clientY - lookT.y;
        if (!lookT.moved && Math.hypot(dx, dy) < 4) continue; // tiny wiggle ignore
        lookT.moved = true;
        look(dx * LOOK_SENS(), dy * LOOK_SENS());
        lookT.x = t.clientX; lookT.y = t.clientY;
      }
    }
  }, { passive: false });
  const end = e => { for (const t of e.changedTouches) {
    if (t.identifier === joy.id) { joy.id = null; joy.active = false; joy.mag = 0; input.f = input.s = 0; st.style.display = "none"; knob.style.transform = ""; }
    if (t.identifier === lookT.id) lookT.id = null;
  }; };
  T.addEventListener("touchend", end); T.addEventListener("touchcancel", end);

  // Action buttons: capture pointer so look-drag never steals them. Soft-tap mine on quick release.
  let mineDownAt = 0;
  const hold = (id, onDown, onUp) => {
    const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); b.classList.add("on"); onDown(e); try { b.setPointerCapture(e.pointerId); } catch (_) {} });
    const up = e => { b.classList.remove("on"); onUp && onUp(e); };
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
  };
  hold("bMine", () => { input.mine = true; mineDownAt = performance.now(); mineGrace = 0.28; },
    () => { const held = performance.now() - mineDownAt; input.mine = false;
      if (held < 220) trySoftTapMine(); // short tap = soft-block one-shot
      else mineGrace = 0.28; // brief grace after a hold so wobble doesn't cancel
    });
  hold("bBuild", () => { aim(); place(); }, null);
  hold("bJump", () => { input.jump = true; }, null);
  document.addEventListener("gesturestart", e => e.preventDefault());
  // Prevent iOS double-tap zoom stealing inputs
  let lastTouchEnd = 0; document.addEventListener("touchend", e => { const now = Date.now(); if (now - lastTouchEnd < 320) e.preventDefault(); lastTouchEnd = now; }, { passive: false });
}
$("pauseBtn").addEventListener("click", () => { if (running) pause(); else startGame(); });
$("playBtn").addEventListener("click", startGame);
$("resetBtn").addEventListener("click", () => { if (!confirm("Start a fresh world? Your builds and SOL shards on this device will be cleared.")) return; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} seed = (Math.random() * 1e9) | 0; edits = {}; shards = 0; generate(seed); buildAll(); respawn(); updShards(); save(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { save(); if (running && IS_TOUCH) pause(); } });
window.addEventListener("pagehide", save);

// ---------------- resize ----------------
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  const a = w / h; camera.fov = a >= 1 ? 72 : Math.min(100, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(38)) / a)));
  camera.updateProjectionMatrix(); drillBase.set(a >= 1 ? .3 : .17, a >= 1 ? -.27 : -.25, -.6); }
window.addEventListener("resize", resize);

// ---------------- day / night ----------------
let tod = .62;   // 0 midnight, .25 sunrise, .5 noon, .75 sunset
const C = (h) => new THREE.Color(h);
const SKY = [ // [tod, top, horizon]
  [0, C(0x05020f), C(0x2a0c3a)], [.22, C(0x0a0420), C(0x6a1a5a)], [.3, C(0x2a2a8a), C(0xff7a6a)], [.42, C(0x3050c0), C(0xd08ad8)],
  [.58, C(0x3050c0), C(0xd08ad8)], [.7, C(0x3a1a7a), C(0xff6a8a)], [.78, C(0x12062a), C(0x8a1a6a)], [1, C(0x05020f), C(0x2a0c3a)]];
function updSky(dt) {
  if (!Q.has("tod")) tod = (tod + dt / DAY_LEN) % 1; else tod = parseFloat(Q.get("tod"));
  let i = 0; while (i < SKY.length - 2 && tod > SKY[i + 1][0]) i++; const a = SKY[i], b = SKY[i + 1], k = (tod - a[0]) / (b[0] - a[0]);
  skyU.uTop.value.copy(a[1]).lerp(b[1], k); skyU.uHor.value.copy(a[2]).lerp(b[2], k);
  const ang = (tod - .25) * Math.PI * 2; skyU.uSun.value.set(Math.cos(ang) * .9, Math.sin(ang), -.35).normalize();
  const day = Math.max(0, Math.min(1, Math.sin(ang) * 3 + .3)); skyU.uNight.value = 1 - day;
  scene.fog.color.copy(skyU.uHor.value).multiplyScalar(.75); gridU.uFog.value.copy(scene.fog.color);
  hemi.intensity = .35 + day * .95; hemi.color.copy(skyU.uTop.value).lerp(C(0xffffff), .5); sun.intensity = .15 + day * 1.1;
  sun.position.set(P.x + skyU.uSun.value.x * 50, P.y + Math.abs(skyU.uSun.value.y) * 50 + 5, P.z + skyU.uSun.value.z * 50); sun.target.position.set(P.x, P.y, P.z);
  sun.color.copy(day > .2 ? C(0xffe0f0) : C(0x8a9aff));
  blockMat.emissiveIntensity = .55 + (1 - day) * .65;
  const hrs = Math.floor(tod * 24), mins = Math.floor((tod * 24 - hrs) * 60); $("clock").textContent = `${day > .5 ? "☀" : "☾"} ${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  return 1 - day;
}

// ---------------- multiplayer hook (Phase 2, local test only; off unless ?mp=ws://...) ----------------
const mp = { on: false, ws: null, id: null, others: new Map(), sendT: 0,
  sendEdit(x, y, z, id) { if (this.on && this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: "e", x, y, z, id })); } };
const SKIN_COL = { fudder: 0x8cdc3c, pumpkin: 0xff8a1e, foreman: 0xffbe28, moon: 0x96beff, shark: 0x3ad0ff, cave: 0xffa028, default: 0x28dcff };
function avatar(name, skin) { const g = new THREE.Group(); const col = SKIN_COL[skin] || SKIN_COL.default;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.3, .34, 1.1, 10), new THREE.MeshLambertMaterial({ color: 0x1a1430, emissive: col, emissiveIntensity: .25 })); body.position.y = .75; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.27, 12, 10), new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: .35 })); head.position.y = 1.55; g.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.36, .08, .1), new THREE.MeshBasicMaterial({ color: 0xffffff })); visor.position.set(0, 1.58, -.24); g.add(visor);
  const c = document.createElement("canvas"); c.width = 256; c.height = 48; const x = c.getContext("2d"); x.font = "900 26px Orbitron,Verdana"; x.textAlign = "center"; x.fillStyle = "rgba(8,6,24,.7)"; x.fillRect(0, 0, 256, 48); x.fillStyle = "#" + col.toString(16).padStart(6, "0"); x.fillText(name.slice(0, 14), 128, 34);
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), fog: false })); tag.scale.set(1.6, .3, 1); tag.position.y = 2.15; g.add(tag); scene.add(g); return g; }
function mpConnect(url) {
  mp.on = true; const name = (Q.get("name") || "anon").replace(/[^\w-]/g, "").slice(0, 14) || "anon", skin = Q.get("skin") || "default";
  const ws = new WebSocket(url); mp.ws = ws; $("badge").innerHTML = "<b>$BOSS SANDBOX</b> · LOCAL MP TEST<br><span>connecting…</span>";
  ws.onopen = () => ws.send(JSON.stringify({ t: "hello", name, skin }));
  ws.onmessage = ev => { const m = JSON.parse(ev.data);
    if (m.t === "welcome") { mp.id = m.id; seed = m.seed; edits = {}; generate(seed); for (const [i, id] of m.edits) world[i] = id; buildAll(); respawn(); for (const p of m.players) mp.others.set(p.id, { g: avatar(p.name, p.skin), p }); $("badge").innerHTML = `<b>$BOSS SANDBOX</b> · LOCAL MP TEST<br><span>${name} · ${m.players.length + 1} online</span>`; }
    else if (m.t === "join") mp.others.set(m.p.id, { g: avatar(m.p.name, m.p.skin), p: m.p });
    else if (m.t === "leave") { const o = mp.others.get(m.id); if (o) { scene.remove(o.g); mp.others.delete(m.id); } }
    else if (m.t === "p") { const o = mp.others.get(m.id); if (o) { o.p.x = m.x; o.p.y = m.y; o.p.z = m.z; o.p.yaw = m.yaw; } }
    else if (m.t === "e") setBlock(m.x, m.y, m.z, m.id, true);
    else if (m.t === "fix") { setBlock(m.x, m.y, m.z, m.id, true); if (m.why === "plaza") pop("PLAZA IS A PROTECTED ZONE", "#ffd24a"); else if (m.why === "shards") pop("NOT ENOUGH SHARDS (SERVER)", "#ff6a8a"); mp.rejects = (mp.rejects || 0) + 1; }
    else if (m.t === "sh") { shards = m.n; updShards(); }
    else if (m.t === "tp") { P.x = m.x; P.y = m.y; P.z = m.z; }
    else if (m.t === "emote") { pop(`${m.name}: ${m.text}`, "#28dcff"); mp.lastEmote = m.name + ":" + m.text; } };
  ws.onclose = () => { $("badge").innerHTML = "<b>$BOSS SANDBOX</b> · LOCAL MP TEST<br><span>disconnected</span>"; };
}
function updMP(dt) { if (!mp.on) return; mp.sendT -= dt;
  if (mp.sendT <= 0 && mp.ws && mp.ws.readyState === 1) { mp.sendT = .1; mp.ws.send(JSON.stringify({ t: "p", x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), yaw: +P.yaw.toFixed(2) })); }
  for (const o of mp.others.values()) { const g = o.g; g.position.x += (o.p.x - g.position.x) * Math.min(1, dt * 12); g.position.y += (o.p.y - g.position.y) * Math.min(1, dt * 12); g.position.z += (o.p.z - g.position.z) * Math.min(1, dt * 12); g.rotation.y = o.p.yaw || 0; } }

// ---------------- main loop ----------------
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 0, bob = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; const time = now / 1000;
  const night = updSky(running ? dt : 0);
  if (running) { updPlayer(dt); updMining(dt, time); updFuds(dt, night); }
  updMP(dt); updParts(dt);
  let n = 0; for (const ci of dirty) { buildChunk(ci); dirty.delete(ci); if (++n >= 3) break; }
  camera.position.set(P.x, P.y + P.eye, P.z); camera.rotation.set(P.pitch, P.yaw, 0);
  const moving = Math.hypot(P.vx, P.vz); bob += dt * moving * 2.2; drillKick = Math.max(0, drillKick - dt * 6);
  drill.position.set(drillBase.x + Math.cos(bob * .5) * .006 * Math.min(1, moving / 4), drillBase.y + Math.sin(bob) * .01 * Math.min(1, moving / 4) - drillKick * .025, drillBase.z + drillKick * .05);
  sky.position.copy(camera.position);
  if (logoBoard) { logoBoard.rotation.y = Math.atan2(P.x - logoBoard.position.x, P.z - logoBoard.position.z); logoBoard.position.y = plaza.y + 4.4 + Math.sin(time * 1.2) * .12; }
  if (saveT > 0) { saveT -= dt; if (saveT <= 0) save(); }
  fpsN++; fpsT += dt; if (fpsT >= 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
  renderer.render(scene, camera);
}

// ---------------- boot ----------------
const saved = load();
if (saved) { seed = saved.seed; edits = saved.edits || {}; shards = saved.shards | 0; sel = saved.sel | 0; tod = saved.tod ?? tod; }
else seed = parseInt(Q.get("seed")) || 1337;
generate(seed); applyEdits(); const tris = buildAll();
respawn(); if (saved && saved.p) { [P.x, P.y, P.z, P.yaw, P.pitch] = saved.p; if (collides(P.x, P.y, P.z)) respawn(); }
buildPalette(); updShards(); resize();
// Phase-2 hook is for LOCAL testing only: only localhost servers are accepted.
if (Q.get("mp")) { try { const u = new URL(Q.get("mp")); if (/^wss?:$/.test(u.protocol) && ["localhost", "127.0.0.1"].includes(u.hostname)) mpConnect(u.href); } catch (e) {} }
$("load").remove();
setInterval(save, 5000);
requestAnimationFrame(frame);

// test / debug hooks (harmless; used by automated checks)
window.__SB = { P, input, get: (x, y, z) => get(x, y, z), setBlock, place: () => { aim(); place(); }, aim: () => { aim(); return hit && { ...hit }; }, start: startGame, pause, look,
  state: () => ({ x: P.x, y: P.y, z: P.z, yaw: P.yaw, pitch: P.pitch, ground: P.ground, shards, sel, running, tris, fps: Math.round(fps), fuds: fuds.length, tod, mp: mp.on ? { id: mp.id, rejects: mp.rejects || 0, lastEmote: mp.lastEmote || null, others: [...mp.others.values()].map(o => ({ name: o.p.name, x: o.p.x, y: o.p.y, z: o.p.z })) } : null, info: renderer.info.render }),
  select, respawn, save, lookSlow: () => lookSlow, setLookSlow: v => { lookSlow = !!v; const b = $("lookSlow"); if (b) { b.classList.toggle("on", lookSlow); b.textContent = lookSlow ? "LOOK: SLOW" : "LOOK: NORM"; } }, trySoftTapMine, overUI, inLookZone, inMoveZone, showTip: () => { try { localStorage.removeItem(TIP_KEY); } catch(e){} $("tip").classList.add("show"); }, hideTip: () => { $("tip").classList.remove("show"); try { localStorage.setItem(TIP_KEY,"1"); } catch(e){} }, emote: k => mp.ws && mp.ws.send(JSON.stringify({ t: "emote", k })), tp: (x, y, z) => { P.x = x; P.y = y; P.z = z; P.vx = P.vy = P.vz = 0; }, B, plaza: () => plaza };
