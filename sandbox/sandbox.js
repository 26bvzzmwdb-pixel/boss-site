// $BOSS Sandbox: third-person (default) / first-person build & explore (Phase 1, single-player beta).
// Original content: neon tiles, Rug-Buster drill, SOL shard veins (in-game items, no cash value), FUD wolves.
// Not connected to ranked play, wallets, or prizes.
import * as THREE from "./three.module.min.js?v=0.9.3";
import { createCharKit } from "./chars3d.js?v=0.9.3";
import { createGems } from "./gems.js?v=0.9.3";
import { createTerrain } from "./terrain.js?v=0.9.3";
import { createBosses } from "./bosses.js?v=0.9.3";
import { createLair } from "./lair.js?v=0.9.3";
import { createWolves } from "./wolves.js?v=0.9.3";

const Q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const IS_TOUCH = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
if (IS_TOUCH) document.body.classList.add("touch");
// v0.9.3: phones are landscape-first (tablets/desktop untouched). ?portrait keeps the old portrait layout for testing.
const IS_PHONE = IS_TOUCH && Math.min(screen.width || 9999, screen.height || 9999) <= 540 && !Q.has("tablet");
if (IS_PHONE) document.body.classList.add("phone");

import { SX, SY, SZ, CS, NCX, NCZ, B, PALETTE, world, idx, inB, get, rng, generate as genWorld, biomeName, pools, caches, trees, lair } from "./world.js?v=0.9.3";
const SAVE_KEY = "boss_sandbox_v2", OLD_KEY = "boss_sandbox_v1", WORLD_V = 3;   // v0.9: WORLD_V 3 = bigger natural world (older saves keep progress, get the new map)
const DAY_LEN = 480;                               // seconds per full day/night cycle
let seed = 1337, edits = {}, shards = 0, plaza = { x: 40, y: 20, z: 40 };
const topH = new Int16Array(SX * SZ);
function calcTop(x, z) { for (let y = SY - 1; y >= 0; y--) if (world[idx(x, y, z)]) { topH[x + z * SX] = y; return; } topH[x + z * SX] = -1; }
function calcAllTop() { for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) calcTop(x, z); }
function generate(sd) { plaza = genWorld(sd); calcAllTop(); if (typeof buildPools === "function") try { buildPools(); } catch (e) {} }
function applyEdits() { for (const k in edits) world[+k] = edits[k]; calcAllTop(); }
function setBlock(x, y, z, id, fromNet) {
  if (!inB(x, y, z)) return false; const i = idx(x, y, z); if (world[i] === id) return false;
  world[i] = id; if (!mp.on) edits[i] = id; calcTop(x, z); markDirty(x, z); if (x > 0) markDirty(x - 1, z); if (x < SX - 1) markDirty(x + 1, z); if (z > 0) markDirty(x, z - 1); if (z < SZ - 1) markDirty(x, z + 1); if (!fromNet) { mp.sendEdit(x, y, z, id); scheduleSave(); } return true;
}

// ---------------- save / load ----------------
let saveT = 0;
function scheduleSave() { saveT = 1.0; }
function save() { if (mp.on) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, wv: WORLD_V, seed, edits, shards, sel, p: [P.x, P.y, P.z, P.yaw, P.pitch], tod, upg, stats, Qi, qv: 3, qBase, hp: P.hp, daily, intro: introDone, dex: fish.dex, ach, bc, char: charId, view, tp: 1, set: { snd: sndOn, mus: musOn, slow: lookSlow, look: lookMul } })); } catch (e) {} }
function load() { if (Q.has("reset")) try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_KEY); } catch (e) {}
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.v === 2) return s;
    const o = JSON.parse(localStorage.getItem(OLD_KEY) || "null"); if (o && o.v === 1) return { migr: true, shards: o.shards | 0 }; } catch (e) {} return null; }

// ---------------- renderer / scene ----------------
const canvas = $("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_TOUCH && Q.get("aa") !== "0", powerPreference: "high-performance" });
const DPR_CAP = Math.min(2, parseFloat(Q.get("dpr")) || 2);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH && !Q.has("dpr") ? 1.25 : DPR_CAP));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 500);
camera.rotation.order = "YXZ";
scene.add(camera);
scene.fog = new THREE.Fog(0x2a1040, IS_TOUCH ? 18 : 26, IS_TOUCH ? 52 : 72);
const hemi = new THREE.HemisphereLight(0xb8a8ff, 0x201030, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd0e0, 1.0); scene.add(sun); scene.add(sun.target);
const lamp = new THREE.PointLight(0xd8f0ff, 0, 20, 1); camera.add(lamp); lamp.position.set(.2, .1, 0); let lampT = 0;

// ---------------- procedural textures (original neon / beveled style) ----------------
const TS = 64, ATL = 6;
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
  const sideBand = (s, top, band) => slot(s, (g, e) => { rockBase(g, e); g.fillStyle = top; g.fillRect(0, 0, TS, 14); for (const c of [g, e]) { c.fillStyle = band; c.fillRect(0, 12, TS, 3); } });
  // 16/17 DUNE GLASS: pink-sand ripples
  slot(16, (g, e) => { bevel(g, "#4a1838", "#6a2650", "#2a0a20", 3); for (const c of [g, e]) { c.strokeStyle = c === g ? "rgba(255,122,184,.6)" : "rgba(255,122,184,.35)"; c.lineWidth = 2; for (let i = 8; i < TS; i += 12) { c.beginPath(); c.moveTo(2, i); c.bezierCurveTo(20, i - 6, 40, i + 6, 62, i); c.stroke(); } } speck(g, "#ffd0e8", 18, .6); });
  sideBand(17, "#4a1838", "#ff7ab8");
  // 18/19 FROST CIRCUIT: icy panel with circuit traces
  slot(18, (g, e) => { bevel(g, "#1c3a52", "#2e5878", "#0c1c2c", 4); for (const c of [g, e]) { c.strokeStyle = c === g ? "rgba(168,232,255,.8)" : "rgba(168,232,255,.45)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(8, 20); c.lineTo(26, 20); c.lineTo(34, 30); c.lineTo(56, 30); c.moveTo(14, 48); c.lineTo(30, 48); c.lineTo(38, 40); c.moveTo(46, 8); c.lineTo(46, 22); c.stroke(); c.fillStyle = "#e8f8ff"; for (const [x, y] of [[8, 20], [56, 30], [14, 48], [38, 40], [46, 8]]) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); } } });
  sideBand(19, "#1c3a52", "#a8e8ff");
  // 20/21 HOLO MOSS: dark green with glowing hex dots
  slot(20, (g, e) => { bevel(g, "#160a3a", "#24125a", "#0a0420", 3); for (const c of [g, e]) { c.fillStyle = c === g ? "rgba(120,200,255,.8)" : "rgba(180,106,255,.6)"; for (let y = 8; y < TS; y += 14) for (let x = (y / 14 & 1) ? 14 : 7; x < TS; x += 14) { c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill(); } } });
  sideBand(21, "#160a3a", "#78c8ff");
  // 22 HOLO FROND: glowing crystal fronds
  slot(22, (g, e) => { g.fillStyle = "#04261e"; g.fillRect(0, 0, TS, TS); for (const c of [g, e]) { for (let i = 0; i < 9; i++) { const x = R() * TS, y = R() * TS, l = 10 + R() * 14, a = -.8 + R() * 1.6; c.strokeStyle = i % 3 ? "#3cffc8" : "#9df7ff"; c.globalAlpha = c === e ? .55 : .9; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); c.stroke(); } c.globalAlpha = 1; } neonRect([g], "rgba(60,255,200,.35)", 2, 1.5, 4); });
  // 23 BOSS GOLD VEIN: rock with gold nuggets
  slot(23, (g, e) => { rockBase(g, e); for (let i = 0; i < 6; i++) { const x = 8 + R() * 48, y = 8 + R() * 48, r = 3 + R() * 4; for (const c of [g, e]) { const gr = c.createRadialGradient(x - 1, y - 1, 0, x, y, r); gr.addColorStop(0, "#fff6c8"); gr.addColorStop(.5, "#ffd24a"); gr.addColorStop(1, "rgba(200,140,20,.0)"); c.globalAlpha = c === e ? .8 : 1; c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.globalAlpha = 1; } } g.font = "900 13px Orbitron,Verdana"; g.fillStyle = "#fff2b8"; g.fillText("$", 26, 38); });
  // ---- v0.7 building toys + secrets + moon ----
  const toySide = (g, e, band) => { bevel(g, "#20203a", "#3a3a5c", "#0a0a16", 4); g.fillStyle = "#14142a"; g.fillRect(6, 6, 52, 52); for (const c of [g, e]) { c.fillStyle = band; for (let i = -TS; i < TS * 2; i += 14) { c.beginPath(); c.moveTo(i, 22); c.lineTo(i + 7, 22); c.lineTo(i + 1, 30); c.lineTo(i - 6, 30); c.fill(); } } };
  slot(24, (g, e) => { bevel(g, "#06331c", "#169a58", "#021a0c", 5); for (const c of [g, e]) { c.strokeStyle = "#14f195"; c.lineWidth = 3; for (const r of [8, 16, 24]) { c.beginPath(); c.arc(32, 32, r, 0, 7); c.stroke(); } c.fillStyle = "#b8ffe0"; c.beginPath(); c.moveTo(32, 18); c.lineTo(42, 32); c.lineTo(22, 32); c.fill(); } });
  slot(25, (g, e) => toySide(g, e, "#28dcff"));
  slot(26, (g, e) => { bevel(g, "#3a2a06", "#6a5010", "#1a1204", 4); for (const c of [g, e]) { c.strokeStyle = "#ffd24a"; c.lineWidth = 5; c.lineJoin = "round"; for (const y of [14, 30, 46]) { c.beginPath(); c.moveTo(18, y + 8); c.lineTo(32, y - 4); c.lineTo(46, y + 8); c.stroke(); } } });
  slot(27, (g, e) => { g.fillStyle = "#14081e"; g.fillRect(0, 0, TS, TS); for (let i = 0; i < 4; i++) { g.fillStyle = "#f4ecff"; g.fillRect(3 + i * 15, 4, 13, 56); } for (const c of [g, e]) { c.fillStyle = "#ff4fd8"; for (const i of [0, 1, 2]) c.fillRect(13 + i * 15, 4, 7, 32); } neonRect([e], "#ff4fd8", 2, 2, 3); });
  slot(28, (g, e) => toySide(g, e, "#ff4fd8"));
  slot(29, (g, e) => { bevel(g, "#5a2008", "#c85a1a", "#2a0c02", 6); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 3; g.strokeRect(10, 10, 44, 44); for (const c of [g, e]) { c.fillStyle = c === g ? "#ffd24a" : "#ff7a3a"; c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 7 : 17, a = k * Math.PI / 5 - Math.PI / 2; c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.closePath(); c.fill(); } });
  slot(30, (g, e) => { bevel(g, "#7a5208", "#ffe27a", "#3a2604", 7); g.fillStyle = "#c8961e"; g.fillRect(9, 9, 46, 46); for (const c of [g, e]) { c.font = "900 34px Orbitron,Verdana"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = c === g ? "#fff6c8" : "#ffd24a"; c.fillText("?", 32, 34); } speck(e, "#fff2b0", 14, 1); });
  slot(31, (g, e) => { bevel(g, "#6e6694", "#9088b8", "#3e3860", 3); speck(g, "#d8d0f0", 70, .8); for (const [x, y, r] of [[18, 20, 8], [44, 40, 11], [20, 50, 5]]) { g.fillStyle = "rgba(10,6,24,.45)"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = "rgba(220,210,255,.5)"; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, Math.PI * .9, Math.PI * 1.9); g.stroke(); e.strokeStyle = "rgba(198,155,255,.25)"; e.beginPath(); e.arc(x, y, r, 0, 7); e.stroke(); } });
  slot(32, (g, e) => { rockBase(g, e); g.fillStyle = "#6e6694"; g.fillRect(0, 0, TS, 14); for (const c of [g, e]) { c.fillStyle = "#c69bff"; c.fillRect(0, 12, TS, 3); } });
  slot(34, (g, e) => { g.fillStyle = "#1a0420"; g.fillRect(0, 0, TS, TS); for (let i = 0; i < 9; i++) { const y = R() * TS, hh = 2 + R() * 6, x = R() * 20; for (const c of [g, e]) { c.fillStyle = i % 3 === 0 ? "#28dcff" : i % 3 === 1 ? "#ff2ad4" : "rgba(255,255,255,.8)"; c.globalAlpha = c === e ? .7 : .9; c.fillRect(x, y, 20 + R() * 40, hh); c.globalAlpha = 1; } } neonRect([g, e], "#ff2ad4", 3, 1.5, 2); });
  slot(35, (g, e) => { rockBase(g, e); g.fillStyle = "#1a0420"; g.fillRect(0, 0, TS, 14); for (const c of [g, e]) { c.fillStyle = "#ff2ad4"; c.fillRect(0, 12, TS, 2); c.fillStyle = "#28dcff"; c.fillRect(8, 14, 20, 2); } });
  slot(33, (g, e) => { g.fillStyle = "#120a26"; g.fillRect(0, 0, TS, TS); crystals(g, e, 5, ["#ffffff", "#e0d0ff", "#9945ff"], 10, .9); });
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
// v0.9: natural tiles are drawn as one smooth organic surface (terrain.js); this cube mesher only draws built pieces, lamps, toys, plaza
const T = createTerrain(THREE, { world, SX, SY, SZ, CS, getTop: (x, z) => topH[x + z * SX], lite: IS_TOUCH }), SMOOTH = !Q.has("cubes");
const sm = Array.from({ length: NCX * NCZ }, () => ({ m0: null, m1: null, s0: true, s1: true, lod: 1, pr: null, d: 0, vis: true }));
const LOD0_IN = IS_TOUCH ? 34 : 40, LOD0_OUT = LOD0_IN + 8;
function markDirty(x, z) { // smooth chunks are meshed with a 4-tile apron, so edits near a border touch the neighbours too
  const A = SMOOTH ? 5 : 1; for (const dz of [-A, 0, A]) for (const dx of [-A, 0, A]) { const X = x + dx, Z = z + dz; if (X < 0 || Z < 0 || X >= SX || Z >= SZ) continue; dirty.add(Math.floor(X / CS) + Math.floor(Z / CS) * NCX); } }
function buildChunk(ci) {
  const cx = ci % NCX, cz = Math.floor(ci / NCX), pos = [], nor = [], uv = [], col = [], ind = [];
  const ins = 0.6 / TS;
  for (let y = 0; y < SY; y++) for (let z = cz * CS; z < cz * CS + CS; z++) for (let x = cx * CS; x < cx * CS + CS; x++) {
    const id = world[idx(x, y, z)]; if (!id || id === 27 || (SMOOTH && T.NAT[id])) continue; const bd = B[id];
    for (const f of FACES) {
      const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
      if (ny < 0) continue; if (ny < SY && solid(nx, ny, nz)) continue;
      const s = bd.tex[f.t], su = (s % ATL) / ATL, sv = Math.floor(s / ATL); const base = pos.length / 3; const ao = [];
      let skyL = 1; if (nx >= 0 && nz >= 0 && nx < SX && nz < SZ) { const tt = topH[nx + nz * SX]; if (ny <= tt) skyL = Math.max(.52, .86 - (tt - ny) * .06); }
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
        const l = AO[a] * f.sh * skyL; col.push(l, l, l);
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
  try { buildGems(ci); } catch (e) {}
  if (SMOOTH) { const q = sm[ci]; q.s1 = true; if (q.m0 || q.lod === 0) { q.s0 = true; buildSmooth(ci, 0); } else q.s0 = true; buildProps(ci); }
  return ind.length / 3;
}
function smMesh(g, old, mat, ord) { if (old) { old.geometry.dispose(); if (g) { old.geometry = g; return old; } scene.remove(old); return null; } if (!g) return null; const m = new THREE.Mesh(g, mat); m.matrixAutoUpdate = false; if (ord) m.renderOrder = ord; scene.add(m); return m; }
function buildSmooth(ci, lod) { const q = sm[ci], cx = ci % NCX, cz = Math.floor(ci / NCX); const g = T.buildChunk(cx, cz, lod);
  if (lod === 0) { q.m0 = smMesh(g, q.m0, T.mat); q.s0 = false; } else { q.m1 = smMesh(g, q.m1, T.mat); q.s1 = false; } lodVis(ci); }
function buildProps(ci) { const q = sm[ci], cx = ci % NCX, cz = Math.floor(ci / NCX); const list = trees.filter(t => !t.dead && Math.floor(t.x / CS) === cx && Math.floor(t.z / CS) === cz); q.pr = smMesh(list.length ? T.buildProps(list) : null, q.pr, T.pmat); }
function lodVis(ci) { const q = sm[ci]; const use0 = q.lod === 0 && q.m0 && !q.s0 || (!q.m1 && q.m0); if (q.m0) q.m0.visible = q.vis && !!use0; if (q.m1) q.m1.visible = q.vis && !use0;
  if (chunks[ci]) chunks[ci].visible = q.vis; if (q.pr) q.pr.visible = q.vis && q.d < scene.fog.far - 4; const gm = gemL[ci]; if (gm) { gm.m.visible = q.vis && q.d < 52; gm.pt.visible = q.vis && q.d < 46; } }
// chunked LOD: near chunks use the full-res surface, far ones the half-res one; everything past the fog is hidden. Builds are spread over frames.
let lodT = 0; const lodQ = [];
function lodTick(dt) { if (!SMOOTH) return; lodT -= dt; if (lodT <= 0) { lodT = .2; const ox = running ? P.x : camera.position.x, oz = running ? P.z : camera.position.z, far = scene.fog.far + 18; lodQ.length = 0;
    for (let ci = 0; ci < sm.length; ci++) { const q = sm[ci], cx = (ci % NCX + .5) * CS, cz = (Math.floor(ci / NCX) + .5) * CS; const d = Math.max(0, Math.hypot(cx - ox, cz - oz) - CS * .7); q.d = d;
      const want = d < LOD0_IN ? 0 : d > LOD0_OUT ? 1 : q.lod; q.lod = want; q.vis = d < far; if ((want === 0 && (!q.m0 || q.s0)) || (want === 1 && q.s1 && q.vis)) lodQ.push([d, ci, want]); lodVis(ci); }
    lodQ.sort((a, b) => a[0] - b[0]); }
  let n = 0; while (lodQ.length && n < (IS_TOUCH ? 1 : 2)) { const [, ci, want] = lodQ.shift(); const q = sm[ci]; if (want === 0 && (!q.m0 || q.s0)) { buildSmooth(ci, 0); n++; } else if (want === 1 && q.s1) { buildSmooth(ci, 1); n++; } } }
// where the smooth surface really is under a point (so feet stand on it instead of on the hidden tile edge)
function visGround(x, y, z) { if (!SMOOTH) return null; const ci = Math.floor(x / CS) + Math.floor(z / CS) * NCX, q = sm[ci]; if (!q || !q.m0 || !q.m0.visible) return null; return T.groundAt([q.m0], x, y, z); }
// v0.9: faceted crystal clusters grow out of every open face of a gem tile (gems.js). One mesh + one glow/sparkle Points per chunk.
const GEM = createGems(THREE, { lite: IS_TOUCH }), gemL = [];
function buildGems(ci) { const cx = ci % NCX, cz = Math.floor(ci / NCX), old = gemL[ci]; if (old) { scene.remove(old.m, old.pt); old.m.geometry.dispose(); old.pt.geometry.dispose(); gemL[ci] = null; }
  const r = GEM.buildChunk(cx * CS, cz * CS, CS, SY, get); if (!r) return 0; const m = new THREE.Mesh(r.geo, GEM.mat), pt = new THREE.Points(r.pgeo, GEM.pmat); m.matrixAutoUpdate = pt.matrixAutoUpdate = false; pt.renderOrder = 3; scene.add(m, pt); gemL[ci] = { m, pt, faces: r.faces, tris: r.tris }; return r.tris; }
function buildAll() { calcAllTop(); let tris = 0; for (const q of sm) { q.s0 = q.s1 = true; q.lod = 1; }
  for (let i = 0; i < NCX * NCZ; i++) tris += buildChunk(i);
  if (SMOOTH) { const ox = plaza.x, oz = plaza.z; for (let ci = 0; ci < sm.length; ci++) { const q = sm[ci], d = Math.max(0, Math.hypot((ci % NCX + .5) * CS - ox, (Math.floor(ci / NCX) + .5) * CS - oz) - CS * .7); q.d = d; buildSmooth(ci, 1); if (d < LOD0_IN) { q.lod = 0; buildSmooth(ci, 0); } } }
  dirty.clear(); return tris; }

// ---------------- sky (synthwave sun, stars, day/night) + neon grid floor ----------------
const skyU = { uAur: { value: 0 }, uTime: { value: 0 }, uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3() }, uNight: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uTop,uHor,uSun; uniform float uNight,uAur,uTime; varying vec3 vD;
  float h3(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
  void main(){ vec3 d=normalize(vD); float h=d.y;
    vec3 c = mix(uHor, uTop, smoothstep(-0.02, 0.55, h)); c = mix(c, uHor*0.35, smoothstep(0.0,-0.35,h));
    float sd = dot(d, normalize(uSun)); vec3 sc = mix(vec3(1.0,0.86,0.3), vec3(1.0,0.25,0.65), clamp((normalize(uSun).y - d.y)*6.0+0.5,0.0,1.0));
    float disc = smoothstep(0.9925,0.9935,sd); float dy = d.y-normalize(uSun).y; float stripes = (dy < 0.0) ? step(0.35, fract(dy*70.0)) : 1.0;
    c += sc*0.45*pow(max(sd,0.0),18.0)*(1.0-uNight*0.6); c = mix(c, sc, disc*stripes*(1.0-uNight));
    float moon = smoothstep(0.9975,0.998,dot(d,-normalize(uSun))); c = mix(c, vec3(0.85,0.8,1.0), moon*uNight);
    vec3 q = floor(d*260.0); float st = step(0.9965, h3(q)) * smoothstep(0.02,0.25,h) * uNight; c += vec3(st)*(0.6+0.4*h3(q+1.0));
    if (uAur > 0.01) { float ax = atan(d.z, d.x); float band = sin(ax*3.0 + uTime*0.12 + sin(ax*7.0 + uTime*0.27)*0.7); float r = exp(-pow((h - 0.3 - 0.07*band)*8.0, 2.0)); vec3 ac = mix(vec3(0.08,1.0,0.6), vec3(1.0,0.3,0.85), 0.5+0.5*sin(ax*2.0 + uTime*0.15)); c += ac * r * smoothstep(0.05,0.2,h) * uAur * (0.55 + 0.45*sin(ax*38.0 + uTime*1.3 + band*3.0)); }
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
const P = { x: 40, y: 30, z: 40, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, ground: false, r: .3, h: 1.75, eye: 1.6, hurtCD: 0, hp: 10, regenT: 0, dbl: true };
let spaceWas = false;
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
    // swimming: climb out onto the bank (ledge up to ~1.9 tiles above your feet)
    if (ax !== 1 && P.swim) { let done = false; for (let k = 1; k <= 2 && !done; k++) { const ty = Math.floor(P.y) + k + .001; if (ty - P.y > 1.95 || ty <= P.y) continue; if (!collides(nx, ty, nz) && !collides(P.x, ty, P.z)) { P.y = ty; P.x = nx; P.z = nz; P.vy = Math.max(P.vy, 0); done = true; climbFx(); } } if (done) continue; }
    if (ax === 1) { if (sd < 0) { P.ground = true; P.y = Math.floor(P.y + sd) + 1; } else P.y = Math.min(P.y, Math.floor(P.y + sd + P.h - .001) - P.h); P.vy = 0; }   // head bump: never pushes you up through a ceiling
    else if (ax === 0) P.vx = 0; else P.vz = 0;
    return;
  }
}
let swimTipShown = false; const stuck = { t: 0, x: 0, z: 0, y: 0, emb: 0, n: 0, last: 0, why: "", clock: 0 };
function climbFx() { const q = inPool(P.x, P.z) || pools.find(q => ((P.x - q.x) / (q.rx + 1.5)) ** 2 + ((P.z - q.z) / (q.rz + 1.5)) ** 2 < 1); if (q) burst(P.x, q.y + .05, P.z, [0x28dcff, 0xffffff], 10, 2); }
// nearest dry, standable column (not inside a pool, 2 tiles of air above)
function dryLand(px, pz) { let best = null, bd = 1e9; for (let r = 1; r <= 24 && !best; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const x = Math.floor(px) + dx, z = Math.floor(pz) + dz; if (x < 1 || z < 1 || x >= SX - 1 || z >= SZ - 1) continue; if (pools.some(q => ((x + .5 - q.x) / (q.rx + .6)) ** 2 + ((z + .5 - q.z) / (q.rz + .6)) ** 2 < 1)) continue;
    const t = topH[x + z * SX]; if (t < 1 || t > SY - 4 || !get(x, t, z) || get(x, t + 1, z) || get(x, t + 2, z)) continue; const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = [x, t, z]; } } return best; }
function rescue(why) { const c = dryLand(P.x, P.z); if (!c) { respawn(); return; } P.x = c[0] + .5; P.y = c[1] + 1.01; P.z = c[2] + .5; stuck.last = why === "water" ? stuck.t : stuck.emb; stuck.why = why; P.vx = P.vy = P.vz = 0; P.swim = false; P.wet = false; stuck.t = 0; stuck.emb = 0; stuck.n++;
  burst(P.x, P.y + .5, P.z, [0x28dcff, 0x14f195, 0xffffff], 24, 3); pop(why === "water" ? "🛟 PULLED YOU ONTO DRY LAND" : "🛟 UNSTUCK", "#14f195"); }
// stuck-safety: trying to move in water for 3s without getting anywhere, or stuck inside a tile, puts you on the nearest dry land
function stuckCheck(dt, wet, trying) { stuck.clock += dt; if (collides(P.x, P.y, P.z)) { if ((stuck.emb += dt) > .6) rescue("tile"); } else stuck.emb = 0;
  if (!wet || !trying) { stuck.t = 0; stuck.x = P.x; stuck.z = P.z; stuck.y = P.y; return; }
  if (Math.hypot(P.x - stuck.x, P.z - stuck.z) > .9 || P.y > stuck.y + 1) { stuck.t = 0; stuck.x = P.x; stuck.z = P.z; stuck.y = P.y; return; }
  if ((stuck.t += dt) > 3) rescue("water"); }
function updPlayer(dt) { const g0 = P.ground;
  let f = input.f, s = input.s; const k = input.keys;
  if (k.KeyW || k.ArrowUp) f += 1; if (k.KeyS || k.ArrowDown) f -= 1; if (k.KeyD || k.ArrowRight) s += 1; if (k.KeyA || k.ArrowLeft) s -= 1;
  const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
  const pq = inPool(P.x, P.z), wet = !!pq && P.y < pq.y; if (wet && !P.wet && P.vy < -3) { burst(P.x, P.y + .5, P.z, [0x28dcff, 0xffffff], 24, 4); sfx.splash(1); } P.wet = wet;
  if (wet && !swimTipShown) { swimTipShown = true; pop(IS_TOUCH ? "🏊 SWIMMING · hold JUMP to swim up" : "🏊 SWIMMING · hold SPACE to swim up", "#9df7ff"); }
  P.leapT = Math.max(0, (P.leapT || 0) - dt); P.swim = wet && P.leapT <= 0;
  const sp = (boostT > 0 ? 2.1 : 1) * (wet ? (P.ground ? .65 : .8) : 1) * ((input.sprint || k.ShiftLeft || k.ShiftRight || len > .95 && IS_TOUCH && joy.active && joy.mag > .95) ? 6.4 : 4.4);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const tx = (-sy * f + cy * s) * sp, tz = (-cy * f - sy * s) * sp;
  const acc = P.ground ? 14 : 5; P.vx += (tx - P.vx) * Math.min(1, acc * dt); P.vz += (tz - P.vz) * Math.min(1, acc * dt);
  const jumpEdge = input.jump || (k.Space && !spaceWas); spaceWas = !!k.Space;
  if (P.ground) P.dbl = true;
  const upHeld = input.jump || input.jumpHeld || k.Space;
  if (P.swim) { // v0.9 hotfix: water is swimmable. Hold jump = swim up, otherwise you float with your head above water
    P.dbl = true; const floatY = pq.y - 1.2;
    if (input.jump && P.y > floatY - .45) { P.vy = 8.6; P.leapT = .45; P.swim = false; noise(.25, 1400, .12); burst(P.x, pq.y, P.z, [0x28dcff, 0xffffff], 14, 3); }   // hop out at the surface
    else if (upHeld) P.vy += (4.4 - P.vy) * Math.min(1, dt * 7);
    else P.vy += ((P.y < floatY ? 1.8 : -.5) - P.vy) * Math.min(1, dt * 3);
    if (len > .2 && Math.random() < dt * 4) burst(P.x, pq.y + .02, P.z, [0x9df7ff, 0xffffff], 3, 1.2); }
  else if ((input.jump || k.Space) && P.ground) { P.vy = 8.3; P.ground = false; sfx.jump(); }
  else if (jumpEdge && !P.ground && upg.boots && P.dbl) { P.dbl = false; P.vy = 8; sfx.boost(); burst(P.x, P.y, P.z, [0x28dcff, 0xff4fd8, 0xffffff], 18, 3); trauma = Math.max(trauma, .15); stats.dj = (stats.dj || 0) + 1; }
  input.jump = false;
  if (!P.swim) P.vy = Math.max(-40, P.vy - 24 * (biomeNow === "MOON BASIN" ? .42 : 1) * dt);
  P.ground = false;
  const vy0 = P.vy; moveAxis(1, P.vy * dt); moveAxis(0, P.vx * dt); moveAxis(2, P.vz * dt);
  if (!g0 && P.ground && vy0 < -5.5 && vy0 >= -14) sfx.land(-vy0, get(Math.floor(P.x), Math.floor(P.y - .05), Math.floor(P.z)));
  P.x = Math.max(P.r + .01, Math.min(SX - P.r - .01, P.x)); P.z = Math.max(P.r + .01, Math.min(SZ - P.r - .01, P.z));
  if (P.y < -20) respawn();
  stuckCheck(dt, wet, len > .2 || (upHeld && !!pq && P.y < pq.y - 1.6));
  P.hurtCD = Math.max(0, P.hurtCD - dt);
  P.regenT -= dt; if (P.regenT <= 0 && P.hp < maxHp()) { P.hp++; P.regenT = 1.4; updHP(); }
}
function respawn() { P.x = plaza.x; P.y = plaza.y + .1; P.z = plaza.z; P.vx = P.vy = P.vz = 0; P.yaw = 0; P.pitch = -.08;
  // safe spawn: if the plaza floor under spawn was dug out, rebuild a 3x3 chrome pad so you never respawn into a pit
  const fx = Math.floor(P.x), fz = Math.floor(P.z), fy = Math.floor(plaza.y) - 1; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { if (!get(fx + dx, fy, fz + dz)) setBlock(fx + dx, fy, fz + dz, 13, true); for (let y = fy + 1; y <= fy + 2; y++) if (get(fx + dx, y, fz + dz) && !(dx || dz)) setBlock(fx, y, fz, 0, true); }
  let best = 1e9; for (let z = fz - 22; z <= fz + 22; z++) for (let x = fx - 22; x <= fx + 22; x++) { if (!inB(x, 1, z)) continue; const t = topH[x + z * SX]; if (t > 0 && world[idx(x, t, z)] === 8) { const d = (x - fx) ** 2 + (z - fz) ** 2; if (d < best && d > 9) { best = d; P.yaw = Math.atan2(-(x + .5 - P.x), -(z + .5 - P.z)); } } }
  while (collides(P.x, P.y, P.z) && P.y < SY) P.y += 1; }

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

// ---------------- FUD wolves (night prowlers + THE TROGLODYTE FUDDER's summons; v0.9.2 replaced the old FUD clouds) ----------------
const fuds = []; let fudTimer = 2, WOLF = null;
// walkable ground under (x, z) at or below y: tile scan, refined by the smooth surface; null over water / off the map
function groundAt(x, y, z) { const X = Math.floor(x), Z = Math.floor(z); if (X < 1 || Z < 1 || X >= SX - 1 || Z >= SZ - 1) return null;
  for (let yy = Math.min(SY - 2, Math.floor(y)); yy >= Math.max(0, Math.floor(y) - 12); yy--) { if (!get(X, yy, Z) || get(X, yy + 1, Z)) continue; { const pq = pools.find(q => ((x - q.x) / q.rx) ** 2 + ((z - q.z) / q.rz) ** 2 < 1); if (pq && yy + 1 < pq.y + .2) return null; } const v = visGround(x, yy + 1, z); return v != null && Math.abs(v - (yy + 1)) < .6 ? v : yy + 1; } return null; }
function wolves() { return WOLF || (WOLF = createWolves(THREE, { scene, P, IS_TOUCH, list: fuds, toon: BX.toon, glowTex: shotTex, groundAt, burst, spawnOrbs, gemGeo: id => GEM.pickupGeo(id),
  inArena: (x, z) => !(boss.on && boss.arena) || Math.hypot(x - boss.arena.x, z - boss.arena.z) < boss.arena.r - 1.2,
  sfx: { howl: (x, y, z) => sfx.howl(x, y, z), snarl: (x, y, z, big) => sfx.snarl(x, y, z, big) },
  bite: (w, hx, hz) => { if (P.hurtCD > 0) return; const dx = P.x - w.x, dz = P.z - w.z, d = Math.hypot(dx, dz) || 1; P.hurtCD = 1.6; P.vx += dx / d * 8; P.vz += dz / d * 8; P.vy = 4.5;
    const lost = upg.shield ? 0 : Math.min(1, shards); shards -= lost; updShards(); pop(lost ? "WOLF BITE! −1 SHARD" : "WOLF BITE!", "#ff6a8a"); sfx.bite(); hurt(1); } })); }
function spawnFud(x, y, z) { const W = wolves(), a = Math.random() * 6.28, d = 12 + Math.random() * 6;
  if (x == null && boss.on && boss.arena) { const A = boss.arena; x = A.x + Math.cos(a) * 6; y = A.floorY + 2; z = A.z + Math.sin(a) * 6; }
  if (x == null) { x = P.x + Math.cos(a) * d; z = P.z + Math.sin(a) * d; y = P.y + 4; }
  return W.spawn(x, y, z, { boss: boss.on }); }
function updFuds(dt, night, time) { const surf = topH[Math.floor(P.x) + Math.floor(P.z) * SX] <= P.y + 2;
  const want = Q.has("nofud") ? 0 : Math.max(night > .6 && surf && !boss.on ? 2 : 0, boss.on && boss.minions ? 2 : 0);
  fudTimer -= dt; if (want === 0) fudTimer = 2; else if (fuds.length < want && fudTimer <= 0) { spawnFud(); fudTimer = 6 + Math.random() * 6; }
  if (WOLF || fuds.length) wolves().update(dt, time, { leave: want === 0 && !(boss.on && boss.kind === "fudder") }); }

let mineT = 0, mineKey = "", hit = null, fudHit = null, bossHit = false, critHit = null;
const tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3();
function aim() {
  { const cp = Math.cos(P.pitch); tmpV.set(P.x, P.y + P.eye, P.z); tmpD.set(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp); }
  // v0.9: third-person aims through the centre reticle: the ray starts at the camera, skips everything between the camera and you,
  // and a hit only counts if it is within drill reach of your own eye, so reach feels the same in every view.
  let reachMax = REACH[upg.drill];
  if (view === 1 && tpCam.ok && !photo) { tmpD.copy(tpCam.dir); const ex = P.x - tpCam.pos.x, ey = P.y + P.eye - tpCam.pos.y, ez = P.z - tpCam.pos.z, along = Math.max(0, ex * tmpD.x + ey * tmpD.y + ez * tmpD.z - .35);
    tmpV.copy(tpCam.pos).addScaledVector(tmpD, along); reachMax = REACH[upg.drill] + 1.2; }
  hit = raycast(tmpV, tmpD, reachMax);
  if (hit && view === 1 && tpCam.ok && !photo) { const hx = hit.x + .5 - P.x, hy = hit.y + .5 - (P.y + P.eye), hz = hit.z + .5 - P.z; if (hx * hx + hy * hy + hz * hz > (REACH[upg.drill] + .6) ** 2) hit = null; }
  fudHit = null; bossHit = false; critHit = null; let best = hit ? hit.t : 9;
  if (boss.on) { const bh = BX.aim(tmpV, tmpD, Math.min(30, hit ? hit.t + 1 : 30)); if (bh) { bossHit = bh; hit = null; best = bh.t; } }
  for (const f of fuds) { if (f.st === "rise" || f.st === "leave") continue; const o = f.c, lx = o.x - tmpV.x, ly = o.y - tmpV.y, lz = o.z - tmpV.z, t = lx * tmpD.x + ly * tmpD.y + lz * tmpD.z;
    if (t < 0 || t > best) continue; const px = lx - tmpD.x * t, py = ly - tmpD.y * t, pz = lz - tmpD.z * t; if (px * px + py * py + pz * pz < (IS_TOUCH ? .85 : .75) ** 2) { best = t; fudHit = f; } }
  for (const c of critters) { const o = c.s.position, lx = o.x - tmpV.x, ly = o.y - tmpV.y, lz = o.z - tmpV.z, t = lx * tmpD.x + ly * tmpD.y + lz * tmpD.z;
    if (t < 0 || t > Math.min(best, 14)) continue; const px = lx - tmpD.x * t, py = ly - tmpD.y * t, pz = lz - tmpD.z * t; if (px * px + py * py + pz * pz < (IS_TOUCH ? .8 : .6) ** 2) { best = t; critHit = c; fudHit = null; bossHit = false; hit = null; } }
  if (!critHit && !bossHit && !fudHit) aimPool(); else poolHit = null;
}
let mineGrace = 0; // keeps mining briefly if the thumb wobbles off the button
function fellTree(t) { if (t.dead) return; t.dead = true; for (let y = t.y + 1; y <= t.y + t.h; y++) if (get(t.x, y, t.z) === 27) setBlock(t.x, y, t.z, 0); const K = [0xff7ad0, 0x5affb0, 0x3cffc8, 0xe8f8ff][[0, 3, 2, 3][t.kind] ?? 0];
  burst(t.x + .5, t.y + t.h + 1, t.z + .5, [K, 0xffffff, 0x14f195], IS_TOUCH ? 30 : 60, 5); debris(t.x + .5, t.y + t.h, t.z + .5, K, 8); sfx.brk(17); spawnOrbs(t.x + .5, t.y + t.h + 1, t.z + .5, 1, 0x14f195); stats.trees = (stats.trees | 0) + 1; }
function breakBlock(x, y, z, id, chained) {
  setBlock(x, y, z, 0); const c = B[id]; if (id === 27) { const t = trees.find(t => t.x === x && t.z === z && !t.dead); if (t) fellTree(t); }
  else { const t = trees.find(t => t.x === x && t.z === z && t.y === y && !t.dead); if (t) fellTree(t); } if (id === 22) fireworks(x + .5, y + .5, z + .5);
  if (id === 23) { stats.caches = (stats.caches | 0) + 1; setTimeout(() => banner("SECRET CACHE FOUND!", `◆+25 SOL shards (in-game) · ${Math.min(5, cachesFound())}/5 in this world`), 50); sfx.cache(); charJoy = 1; }
  burst(x + .5, y + .5, z + .5, [c.col, 0xffffff, c.drop ? 0x14f195 : c.col], IS_TOUCH ? (c.drop ? 30 : 12) : (c.drop ? 60 : 28), c.drop ? 6 : 4);
  debris(x + .5, y + .5, z + .5, c.col, c.drop ? 8 : 5);
  stats.mined++; comboHit();
  if (c.drop) { stats.veins++; if (id === 9) stats.prisms++; if (id === 10) stats.cores++; if (id === 18) stats.golds++;
    const dv = c.drop * (ev.k === "pump" ? 2 : 1) + (upg.pet === "sprite" && Math.random() < .25 ? 1 : 0); spawnOrbs(x + .5, y + .5, z + .5, dv, c.col); pop(`◆ +${dv} ${c.name.replace(" VEIN", "")}${ev.k === "pump" ? " ×2" : ""}`, c.drop >= 10 ? "#fff2b0" : c.drop >= 5 ? "#ffd24a" : c.drop >= 3 ? "#14f195" : "#c69bff");
    sfx.vein(c.drop); trauma = Math.max(trauma, c.drop >= 10 ? .55 : .3); buzz(c.drop >= 5 ? 30 : 15);
    if (upg.drill >= 4 && !chained) { const seen = new Set([x + "," + y + "," + z]), q = [[x, y, z]], out = [];
      while (q.length && out.length < 10) { const [a, b2, d] = q.shift(); for (const [u, v, w] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const X = a + u, Y = b2 + v, Z = d + w, k = X + "," + Y + "," + Z; if (seen.has(k)) continue; seen.add(k); if (get(X, Y, Z) === id) { out.push([X, Y, Z]); q.push([X, Y, Z]); } } }
      out.forEach(([X, Y, Z], i) => setTimeout(() => { if (get(X, Y, Z) === id) breakBlock(X, Y, Z, id, true); }, 80 + i * 70)); if (out.length) pop(`CHAIN ×${out.length + 1}`, "#ff4fd8"); }
  } else if (c.cost) { shards += c.cost; updShards(); pop(`◆ +${c.cost} REFUND`, "#c69bff"); sfx.brk(id); trauma = Math.max(trauma, .12); }
  else { sfx.brk(id); trauma = Math.max(trauma, .12); buzz(8); }
  mineKey = ""; mineT = 0;
}
function trySoftTapMine() {
  aim();
  if (fudHit) return false;
  if (!hit || B[hit.id].hard === Infinity) return false;
  // one-tap mine for soft pieces (hard <= 0.45) on phone
  if (B[hit.id].hard / SPEED[upg.drill] > 0.45) return false;
  breakBlock(hit.x, hit.y, hit.z, hit.id); return true;
}
function updMining(dt, time) {
  aim();
  if (!mp.on && updFishing(dt, curNight, time)) { outline.visible = false; laser.visible = false; isFiring = false; minePitch = 0; $("ring").setAttribute("stroke-dashoffset", "94.25"); $("target").textContent = fish.st === "idle" ? "NEON POOL · " + (IS_TOUCH ? "TAP MINE" : "CLICK") + " TO CAST" : fish.st === "wait" ? "WAITING FOR A BITE…" : fish.st === "bite" ? "❗ BITE! TAP!" : "HOLD = ZONE RIGHT · RELEASE = LEFT"; return; }
  if (poolHit) { $("target").textContent = "NEON POOL · " + (IS_TOUCH ? "TAP MINE" : "CLICK") + " TO CAST"; outline.visible = false; }
  const tgt = $("target");
  if (critHit) { outline.visible = false; tgt.textContent = "PAPER HANDS · HOLD TO ZAP"; }
  else if (bossHit) { outline.visible = false; tgt.textContent = BOSSES[boss.kind].name + (bossHit.weak ? (boss.expose > 0 ? " · WEAK POINT ×3!" : " · WEAK POINT") : " · HOLD MINE TO BLAST"); }
  else if (hit && !fudHit) { outline.position.set(hit.x + .5, hit.y + .5, hit.z + .5); { const c = camera.position, o = outline.position; outline.visible = Math.max(Math.abs(c.x - o.x), Math.abs(c.y - o.y), Math.abs(c.z - o.z)) > .8; /* never draw the box from inside it (long stray lines) */ } const bd = B[hit.id]; tgt.textContent = bd.name + (bd.drop ? `  ◆+${bd.drop}` : bd.hard === Infinity ? "  (unbreakable)" : ""); }
  else { outline.visible = false; tgt.textContent = fudHit ? "FUD WOLF · HOLD TO ZAP" : ""; }
  if (input.mine) mineGrace = IS_TOUCH ? 0.28 : 0; else if (mineGrace > 0) mineGrace -= dt;
  const mining = input.mine || mineGrace > 0;
  let prog = 0;
  if (mining && critHit) { critHit.hp -= dt; prog = 1 - critHit.hp / .35; if (critHit.hp <= 0) zapCritter(critHit); mineKey = ""; mineT = 0; }
  else if (mining && bossHit) { bossDamage(DMG[upg.drill] * dt, bossHit.weak); mineKey = ""; mineT = 0; prog = 1 - boss.hp / boss.max; }
  else if (mining && fudHit) { if (!fuds.includes(fudHit)) { fudHit = null; } else { fudHit.hp -= dt * (1 + (upg.drill - 1) * .2); wolves().zapTick(fudHit, dt); prog = 1 - fudHit.hp / 1.1; if (fudHit.hp <= 0) { const p = wolves().kill(fudHit); burst(p.x, p.y, p.z, ["#9945ff", "#ff3a5a", "#28dcff", "#ffffff"], IS_TOUCH ? 30 : 60, 6); fudHit = null; stats.fud++; pop("FUD WOLF ZAPPED · GEMS!", "#14f195"); sfx.zap(); sfx.yelp(p.x, p.y, p.z); trauma = Math.max(trauma, .3); } } mineKey = ""; mineT = 0; }
  else if (mining && hit && B[hit.id].hard !== Infinity) {
    const key = hit.x + "," + hit.y + "," + hit.z; if (key !== mineKey) { mineKey = key; mineT = 0; }
    mineT += dt; const bd = B[hit.id]; const need = Math.max(0.12, bd.hard * (IS_TOUCH ? 0.85 : 1) / SPEED[upg.drill]); minePitch = mineT / need; // slightly faster on phone
    prog = Math.min(1, mineT / need); if ((chipT -= dt) <= 0) { chipT = .09 + Math.random() * .04; sfx.chip(hit.id, prog); }
    const s = 1.004 - prog * .12 + Math.sin(time * 60) * .01 * prog; outline.scale.setScalar(s);
    coreGlow.material.color.setHex(bd.col); coreGlow.material.opacity = prog * .55;
    if (Math.random() < dt * (IS_TOUCH ? 14 : 30)) burst(hit.x + .5 + hit.n[0] * .55, hit.y + .5 + hit.n[1] * .55, hit.z + .5 + hit.n[2] * .55, [bd.col, 0xffffff], 1, 2);
    if (prog >= 1) breakBlock(hit.x, hit.y, hit.z, hit.id);
  } else if (!mining) { mineT = 0; mineKey = ""; outline.scale.setScalar(1); coreGlow.material.opacity = 0; }
  if (!mining) { outline.scale.setScalar(1); coreGlow.material.opacity = 0; }
  $("ring").setAttribute("stroke-dashoffset", (94.25 * (1 - prog)).toFixed(2));
  const firing = mining && (critHit || bossHit || fudHit || (hit && B[hit.id].hard !== Infinity)); isFiring = !!firing; if (!firing) minePitch = 0;
  laser.visible = !!firing; laser.material.color.setHex(LASER[upg.drill]); dTip.material.color.setHex(firing ? (Math.sin(time * 40) > 0 ? 0x14f195 : 0xffffff) : 0x9945ff); dRing.rotation.z += dt * (firing ? 30 : 2);
  if (firing) { dTip.getWorldPosition(tmpV); const end = critHit ? critHit.s.position.clone() : bossHit ? boss.eye.getWorldPosition(new THREE.Vector3()) : fudHit ? fudHit.c.clone() : new THREE.Vector3(hit.x + .5 + hit.n[0] * .5, hit.y + .5 + hit.n[1] * .5, hit.z + .5 + hit.n[2] * .5);
    laser.position.copy(tmpV); laser.lookAt(end); laser.scale.set(1, 1, tmpV.distanceTo(end)); laser.material.opacity = .6 + Math.random() * .4; }
}
function place() {
  if (!hit) return; const id = PALETTE[sel], bd = B[id];
  const x = hit.x + hit.n[0], y = hit.y + hit.n[1], z = hit.z + hit.n[2];
  if (!inB(x, y, z) || get(x, y, z)) return;
  if (x + 1 > P.x - P.r && x < P.x + P.r && z + 1 > P.z - P.r && z < P.z + P.r && y + 1 > P.y && y < P.y + P.h) return;
  if (bd.cost) { if (shards < bd.cost) { pop(`NEED ◆${bd.cost} SOL SHARDS`, "#ff6a8a"); return; } shards -= bd.cost; updShards(); }
  stats["pl_" + id] = (stats["pl_" + id] | 0) + 1; stats.topBuild = Math.max(stats.topBuild | 0, y); setBlock(x, y, z, id); burst(x + .5, y + .5, z + .5, [bd.col, 0xffffff], 14, 2); sfx.place(); drillKick = 1; stats.placed++; buzz(6);
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

// ---------------- audio (WebAudio synth: sfx + generative synthwave music, no files) ----------------
// ---------------- audio (v0.9): all-synth WebAudio, no sample files. Buses: sfx / music / ambience -> compressor ----------------
let AC = null, master = null, comp = null, sfxG = null, musG = null, ambG = null, rvSend = null, sfxRv = null, noiseBuf = null, brownBuf = null, hum = null, humF = null, humG = null, meter = null, meterBuf = null;
let sndOn = true, musOn = true, minePitch = 0, isFiring = false, lastUi = 0, lastBHit = 0, chipT = 0, reelT = 0, stepLR = 1;
const MUS_V = .42, AMB_V = .6, sfxN = {};
const tNow = () => AC.currentTime + .012;   // tiny lookahead: a busy audio thread never skips a short envelope
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function note(f, d, type = "square", v = .08, slide = 0, at = 0, dest = null, lp = 0) { if (!AC) return; const t = at || tNow(), o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + d); let n = o.connect(g);
  if (lp) { const fl = AC.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; n = g.connect(fl); } n.connect(dest || sfxG); o.start(t); o.stop(t + d + .02); }
function tone(f, d, type, v, slide) { note(f, d, type, v, slide); }
function noise(d, f = 1200, v = .15, q = 1, at = 0, dest = null, type = "bandpass") { if (!AC) return; const t = at || tNow(), s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl).connect(g).connect(dest || sfxG); s.start(t, Math.random() * .5); s.stop(t + d + .02); }
// richer building blocks
function osc(t, type, f, d, v, dest, o = {}) { const n = AC.createOscillator(), g = AC.createGain(); n.type = type; n.frequency.setValueAtTime(f, t); if (o.slide) n.frequency.exponentialRampToValueAtTime(Math.max(20, f + o.slide), t + (o.sd || d)); if (o.det) n.detune.value = o.det;
  const a = o.a || .004; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + d); let last = n.connect(g);
  if (o.lp) { const fl = AC.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.setValueAtTime(o.lp, t); if (o.lp2) fl.frequency.exponentialRampToValueAtTime(o.lp2, t + d); fl.Q.value = o.lq || .7; last = g.connect(fl); }
  if (o.vib) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg).connect(n.frequency); l.start(t); l.stop(t + d + .05); }
  last.connect(dest || sfxG); n.start(t); n.stop(t + d + .05); return n; }
function nz(t, d, v, dest, o = {}) { const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = o.brown ? brownBuf : noiseBuf; s.loop = true; fl.type = o.type || "bandpass"; fl.frequency.setValueAtTime(o.f || 1200, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + d); fl.Q.value = o.q ?? 1;
  const a = o.a || .002; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl).connect(g).connect(dest || sfxG); s.start(t, Math.random() * 1.5); s.stop(t + d + .05); }
function bell(t, f, d, v, dest) { for (const [r, a] of [[1, 1], [2.76, .42], [5.4, .2], [8.93, .08]]) osc(t, "sine", f * r, d / (1 + r * .3), v * a, dest); }
function thump(t, f, d, v, dest) { osc(t, "sine", f, d, v, dest, { slide: -f * .55 }); }
function bus(p = 0, v = 1, to) { const g = AC.createGain(); g.gain.value = v; if (AC.createStereoPanner) { const s = AC.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p)); g.connect(s).connect(to || sfxG); } else g.connect(to || sfxG); return g; }
// positional: pans by angle to the camera, fades with distance. null = too far to hear
function at3(x, y, z, maxD = 34, to) { const dx = x - P.x, dy = y - P.y, dz = z - P.z, d = Math.hypot(dx, dy, dz); if (d > maxD) return null; const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), r = (dx * cy - dz * sy) / Math.max(1, d); return bus(r * .85, Math.pow(1 - d / maxD, 1.6) * (d < 3 ? 1 : 1 / (1 + (d - 3) * .06)), to); }
// surfaces: what every tile sounds like under foot / under the drill
const SURF = {}; [3, 16, 17].forEach(i => SURF[i] = "soft"); [14, 24].forEach(i => SURF[i] = "sand"); [13, 6, 12, 19, 20, 22, 11].forEach(i => SURF[i] = "metal"); [7, 25, 4, 5, 21].forEach(i => SURF[i] = "glass"); SURF[15] = "frost"; SURF[26] = "glitch"; [8, 9, 10, 18, 23].forEach(i => SURF[i] = "ore");
const surf = id => SURF[id] || "stone";
function stepSnd(id, v = 1) { const t = tNow(), k = surf(id), r = .9 + Math.random() * .2; stepLR = -stepLR; const d = bus(stepLR * .14, v * 1.35);
  if (k === "soft") { nz(t, .085, .07, d, { type: "lowpass", f: 1500 * r, q: .8, a: .008 }); nz(t + .015, .05, .035, d, { type: "bandpass", f: 3400 * r, q: 1.6 }); }
  else if (k === "sand") { nz(t, .13, .06, d, { type: "bandpass", f: 2300 * r, f2: 1400, q: .6, a: .02 }); nz(t + .03, .08, .03, d, { type: "highpass", f: 4500 }); }
  else if (k === "metal") { osc(t, "triangle", 610 * r, .1, .022, d); osc(t, "sine", 1730 * r, .14, .014, d); nz(t, .03, .05, d, { type: "bandpass", f: 2600 * r, q: 6 }); thump(t, 100, .07, .06, d); }
  else if (k === "glass") { osc(t, "sine", 2900 * r, .08, .02, d); osc(t + .01, "sine", 4300 * r, .06, .012, d); nz(t, .03, .03, d, { type: "highpass", f: 5200 }); thump(t, 130, .05, .05, d); }
  else if (k === "frost") { for (let i = 0; i < 3; i++) nz(t + i * .016, .03, .045, d, { type: "highpass", f: 2800 + Math.random() * 2600 }); thump(t, 110, .05, .05, d); }
  else if (k === "glitch") { osc(t, "square", 160 + Math.random() * 520, .045, .018, d, { lp: 2600 }); nz(t, .03, .03, d, { type: "bandpass", f: 5200, q: 3 }); thump(t, 90, .05, .04, d); }
  else { thump(t, 125 * r, .07, .08, d); nz(t, .045, .06, d, { type: "bandpass", f: 1300 * r, q: 1.3 }); } }
function chipSnd(id, prog) { const t = tNow(), k = surf(id), u = 1 + prog * .3, r = (.92 + Math.random() * .16) * u, d = bus((Math.random() - .5) * .2, .9);
  if (k === "metal") { osc(t, "triangle", 980 * r, .07, .022, d); nz(t, .025, .045, d, { type: "bandpass", f: 3200 * r, q: 9 }); }
  else if (k === "glass") { osc(t, "sine", 3300 * r, .05, .022, d); nz(t, .02, .03, d, { type: "highpass", f: 6000 }); }
  else if (k === "soft") nz(t, .05, .05, d, { type: "lowpass", f: 2600 * r, q: .9 });
  else if (k === "sand") nz(t, .06, .05, d, { type: "bandpass", f: 2900 * r, q: .5 });
  else if (k === "frost") { nz(t, .03, .045, d, { type: "highpass", f: 4200 * r }); osc(t, "sine", 3800 * r, .04, .01, d); }
  else if (k === "glitch") osc(t, "square", 300 + Math.random() * 900, .03, .016, d, { lp: 3000 });
  else { nz(t, .03, .06, d, { type: "bandpass", f: 2100 * r, q: 1.6 }); thump(t, 220 * r, .04, .04, d); if (k === "ore" && Math.random() < .35) bell(t, 2200 + prog * 1400, .25, .012, d); } }
function brkSnd(id) { const t = tNow(), k = surf(id), r = .94 + Math.random() * .12, d = bus((Math.random() - .5) * .25);
  if (k === "metal") { thump(t, 150, .16, .14, d); bell(t, 470 * r, .7, .045, d); nz(t, .12, .08, d, { type: "bandpass", f: 3100, q: 4 }); }
  else if (k === "glass") { for (let i = 0; i < 9; i++) osc(t + i * .011 + Math.random() * .01, "sine", 2400 + Math.random() * 3800, .08 + Math.random() * .14, .02, d); nz(t, .32, .1, d, { type: "highpass", f: 3800 }); thump(t, 160, .08, .07, d); }
  else if (k === "soft") { nz(t, .17, .14, d, { type: "lowpass", f: 2600, f2: 500, q: .9 }); osc(t, "sine", 320 * r, .11, .08, d, { slide: -190 }); }
  else if (k === "sand") { nz(t, .32, .13, d, { type: "bandpass", f: 2000, f2: 600, q: .5, a: .01 }); thump(t, 120, .1, .08, d); }
  else if (k === "frost") { for (let i = 0; i < 6; i++) nz(t + i * .02, .04, .06, d, { type: "highpass", f: 3000 + Math.random() * 3000 }); bell(t + .02, 1900 * r, .45, .02, d); thump(t, 130, .1, .1, d); }
  else if (k === "glitch") { [880, 660, 440, 220].forEach((f, i) => osc(t + i * .035, "square", f * r, .05, .025, d, { lp: 3200 })); nz(t, .14, .07, d, { type: "bandpass", f: 4000, q: 2 }); }
  else { thump(t, 145 * r, .2, .16, d); nz(t, .3, .18, d, { type: "lowpass", f: 1900, f2: 260, q: .8 }); for (let i = 0; i < 5; i++) nz(t + .02 + i * .028 + Math.random() * .01, .045, .055, d, { type: "bandpass", f: 1200 + Math.random() * 1900, q: 1.5 }); } }
function splashSnd(big, t0, x, y, z) { const t = t0 || tNow(), d = (x != null && at3(x, y, z, 26)) || sfxG; nz(t, .35 + big * .35, .13 + big * .08, d, { type: "lowpass", f: 3600, f2: 320, q: .8, a: .006 }); nz(t, .14, .06, d, { type: "highpass", f: 3200 });
  for (let i = 0; i < 3 + big * 5; i++) osc(t + .05 + Math.random() * (.2 + big * .3), "sine", 380 + Math.random() * 500, .06, .028, d, { slide: 700 + Math.random() * 900 }); }
function roarSnd(kind) { const t = tNow(), p = boss.on && boss.g ? boss.g.position : null, d = (p && at3(p.x, p.y, p.z, 80)) || sfxG;
  thump(t, 70, 1.1, .2, d);
  if (kind === "whale") { osc(t, "sine", 105, 1.8, .14, d, { slide: -48, vib: [5, 6], a: .2 }); osc(t, "triangle", 210, 1.6, .05, d, { slide: -80, vib: [5.5, 10], a: .25, lp: 900 }); nz(t, 1.6, .1, d, { type: "bandpass", f: 500, f2: 260, q: 3, a: .25 }); osc(t + .9, "sine", 340, .9, .03, d, { slide: 260, a: .2 }); }
  else if (kind === "fudder") { osc(t, "sawtooth", 140, 1.1, .09, d, { slide: -60, vib: [9, 14], lp: 700, lp2: 1800, lq: 5, a: .05 }); for (let i = 0; i < 6; i++) nz(t + .2 + i * .12, .1, .08, d, { type: "bandpass", f: 700 + (i % 3) * 300, q: 2 }); osc(t + .7, "triangle", 90, .8, .06, d, { slide: -30 }); }
  else if (kind === "king") { nz(t, 2.2, .26, d, { brown: 1, type: "lowpass", f: 520, f2: 90, q: .6, a: .05 }); for (let i = 0; i < 7; i++) nz(t + Math.random() * .5, .06, .1, d, { type: "bandpass", f: 2000 + Math.random() * 3000, q: 2 }); [0, 3, 7].forEach((s, i) => osc(t + .1, "sawtooth", mtof(38 + s), 1.6, .035, d, { det: (i - 1) * 12, lp: 380, lp2: 1400, lq: 4, a: .3 })); }
  else { osc(t, "sawtooth", 175, 1.2, .1, d, { slide: -95, vib: [17, 22], lp: 520, lp2: 1500, lq: 6, a: .05 }); osc(t, "square", 88, 1.3, .06, d, { slide: -38, lp: 420 }); for (let i = 0; i < 12; i++) nz(t + i * .075, .06, .07, d, { type: "bandpass", f: 900 + (i % 2) * 500, q: 1.2 }); } }
const sfx = {
  jump: () => { const t = tNow(); nz(t, .17, .04, null, { type: "bandpass", f: 520, f2: 2000, q: 1.6, a: .025 }); osc(t, "sine", 250, .1, .03, null, { slide: 170 }); },
  land: (iv, id) => { const t = tNow(), v = Math.min(1.3, iv / 16); thump(t, 120, .12 + v * .2, .06 + v * .14); if (id) stepSnd(id, .8 + v); if (v > .7) nz(t, .3, .1 * v, null, { type: "lowpass", f: 900, f2: 200 }); },
  boost: () => { note(420, .18, "sawtooth", .04, 600, 0, null, 2400); noise(.18, 3000, .06); },
  brk: id => brkSnd(id),
  chip: (id, prog) => chipSnd(id, prog),
  place: () => { const t = tNow(); thump(t, 230, .07, .09); osc(t, "triangle", 880, .05, .025); nz(t, .04, .05, null, { type: "bandpass", f: 3600, q: 2 }); },
  click: () => sfx.ui(),
  ui: () => { const t = tNow(); if (t - lastUi < .045) return; lastUi = t; osc(t, "sine", 1320, .05, .035); osc(t + .016, "sine", 1980, .045, .022); nz(t, .012, .02, null, { type: "highpass", f: 6000 }); },
  vein: n => { const t = tNow(); nz(t, .2, .16, null, { type: "bandpass", f: 2500, q: .8 }); const b = n >= 10 ? 84 : n >= 5 ? 79 : n >= 3 ? 76 : 72; [0, 4, 7, 12].forEach((s, i) => bell(t + i * .055, mtof(b + s), .7, .035)); if (n >= 5) nz(t + .1, .8, .03, null, { type: "highpass", f: 8000 }); thump(t, 160, .15, .1); },
  pick: c => { const t = tNow(), m = 76 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33][Math.min(14, c | 0)], d = bus((Math.random() - .5) * .5); bell(t, mtof(m), .45, .04, d); osc(t + .03, "sine", mtof(m + 19), .18, .012, d); },
  hurt: () => { note(140, .25, "sawtooth", .08, -60, 0, null, 900); noise(.15, 400, .15); thump(AC.currentTime, 90, .2, .14); },
  zap: () => { note(1200, .2, "sawtooth", .045, -900, 0, null, 3000); noise(.25, 1800, .1); },
  quest: () => { const t = tNow(); [72, 76, 79, 84, 88].forEach((m, i) => bell(t + i * .07, mtof(m), .6, .04)); note(mtof(60), .6, "sawtooth", .03, 0, t, null, 1200); },
  buy: () => { const t = tNow(); [67, 74, 79, 86].forEach((m, i) => note(mtof(m), .2, "square", .04, 0, t + i * .05, null, 3000)); },
  // wolves: a rising-then-falling synth howl (two detuned voices + breath), snarl, bite snap, yelp when zapped
  howl: (x, y, z) => { const t = tNow(), d = (x != null && at3(x, y, z, 60)) || sfxG, f0 = 300 + Math.random() * 60;
    for (const [type, v, det, lp] of [["triangle", .05, 0, 2400], ["sawtooth", .018, 9, 1300]]) { const n = AC.createOscillator(), g = AC.createGain(), fl = AC.createBiquadFilter(), l = AC.createOscillator(), lg = AC.createGain();
      n.type = type; n.detune.value = det; n.frequency.setValueAtTime(f0, t); n.frequency.linearRampToValueAtTime(f0 * 1.75, t + .38); n.frequency.linearRampToValueAtTime(f0 * 1.9, t + 1.05); n.frequency.exponentialRampToValueAtTime(f0 * 1.15, t + 1.75);
      l.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(10, t + .9); l.connect(lg).connect(n.frequency); fl.type = "lowpass"; fl.frequency.value = lp; fl.Q.value = 2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .18); g.gain.setValueAtTime(v, t + 1.2); g.gain.exponentialRampToValueAtTime(.0001, t + 1.85); n.connect(g).connect(fl).connect(d); n.start(t); l.start(t); n.stop(t + 1.9); l.stop(t + 1.9); }
    nz(t, 1.7, .025, d, { type: "bandpass", f: 900, f2: 1500, q: 2, a: .2 }); },
  snarl: (x, y, z, big) => { const t = tNow(), d = (x != null && at3(x, y, z, 30)) || sfxG; nz(t, big ? .3 : .5, big ? .1 : .07, d, { brown: 1, type: "lowpass", f: 520, f2: 260, q: 3, a: .02 }); osc(t, "sawtooth", big ? 120 : 85, big ? .3 : .5, .03, d, { vib: [28, 14], lp: 480, slide: big ? 60 : 0 }); },
  bite: () => { const t = tNow(); nz(t, .06, .14, null, { type: "bandpass", f: 2200, q: 2 }); thump(t, 160, .12, .12); osc(t + .02, "square", 300, .06, .02, null, { lp: 1500, slide: -150 }); },
  yelp: (x, y, z) => { const t = tNow(), d = (x != null && at3(x, y, z, 40)) || sfxG; osc(t, "triangle", 900, .22, .05, d, { slide: 500, sd: .06 }); osc(t + .08, "triangle", 1300, .25, .04, d, { slide: -800 }); },
  roar: k => roarSnd(k || boss.kind),
  bshot: () => { const t = tNow(), k = boss.kind, p = boss.g ? boss.g.position : P, d = at3(p.x, p.y, p.z, 70) || sfxG;
    if (k === "whale") { osc(t, "sine", 240, .3, .06, d, { slide: 380 }); nz(t, .2, .05, d, { type: "lowpass", f: 1200, f2: 400 }); }
    else if (k === "king") { nz(t, .22, .08, d, { type: "bandpass", f: 3500, f2: 900, q: 3 }); osc(t, "sawtooth", 1500, .18, .025, d, { slide: -1100, lp: 4000 }); }
    else note(660, .25, "square", .035, -420, 0, d, 1800); },
  bhit: () => { const t = tNow(); if (t - lastBHit < .11) return; lastBHit = t; const k = boss.kind, r = .9 + Math.random() * .2; thump(t, 150 * r, .12, .1);
    if (k === "whale") nz(t, .12, .08, null, { type: "lowpass", f: 900 * r, q: 2 }); else if (k === "king") { nz(t, .07, .07, null, { type: "bandpass", f: 4200 * r, q: 3 }); osc(t, "square", 1800 * r, .03, .012, null, { lp: 5000 }); }
    else if (k === "fudder") { nz(t, .09, .08, null, { type: "bandpass", f: 1500 * r, q: 1.5 }); osc(t, "triangle", 420 * r, .08, .03); } else { nz(t, .1, .08, null, { type: "lowpass", f: 1600 * r, q: 1.4 }); osc(t, "triangle", 300 * r, .07, .025); } },
  win: () => { const t = tNow(); [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((m, i) => note(mtof(m), .35, "square", .045, 0, t + i * .09, null, 2600)); noise(1.5, 600, .25, .5); [84, 88, 91, 96].forEach((m, i) => bell(t + .8 + i * .06, mtof(m), .9, .03)); },
  combo: c => note(mtof(84 + Math.min(12, c / 5)), .15, "square", .04, 0, 0, null, 3500),
  bounce: () => { note(170, .38, "sine", .1, 650); note(340, .28, "triangle", .04, 900); },
  fw: () => { const t = tNow(); note(700, .7, "sine", .03, 1500, t); noise(.7, 5000, .04, 3, t); for (let i = 0; i < 6; i++) noise(.08, 2000 + Math.random() * 4000, .12, 1, t + .75 + i * .06); note(60, .6, "sine", .15, -30, t + .72); },
  cache: () => { const t = tNow(); [84, 88, 91, 96, 100].forEach((m, i) => bell(t + i * .07, mtof(m), .6, .035)); noise(1, 9000, .05, 1, t, null, "highpass"); },
  ach: () => { const t = tNow(); [72, 79, 84, 88, 91].forEach((m, i) => note(mtof(m), .32, "square", .04, 0, t + i * .08, null, 3000)); note(mtof(60), 1, "sawtooth", .03, 0, t, null, 1500); },
  event: () => { const t = tNow(); [60, 67, 72, 79].forEach((m, i) => note(mtof(m), .6, "sawtooth", .03, 0, t + i * .12, null, 2200)); },
  key: m => { note(mtof(m), .45, "triangle", .07); note(mtof(m + 12), .3, "sine", .03); },
  step: id => stepSnd(id),
  splash: (big, x, y, z) => splashSnd(big || 0, 0, x, y, z),
  cast: (x, y, z) => { const t = tNow(); nz(t, .26, .06, null, { type: "bandpass", f: 500, f2: 2600, q: 2, a: .03 }); osc(t, "sine", 900, .2, .012, null, { slide: 900 }); splashSnd(0, t + .3, x, y, z); },
  bite: (x, y, z) => { const t = tNow(); osc(t, "sine", 640, .1, .06, null, { slide: -420 }); splashSnd(0, t + .02, x, y, z); osc(t + .12, "square", 1320, .08, .04, null, { lp: 4000 }); osc(t + .21, "square", 1760, .1, .035, null, { lp: 4000 }); },
  reel: (down, prog, inZ) => { const t = tNow(), f = down ? 5200 + prog * 2500 : 3400; nz(t, .014, down ? .05 : .03, null, { type: "highpass", f }); osc(t, "square", down ? 2300 + prog * 800 : 1500, .01, inZ ? .012 : .006, null, { lp: 6000 }); },
  catchFish: (v, x, y, z) => { splashSnd(1, 0, x, y, z); sfx.vein(v); },
  bark: () => { note(520, .08, "square", .05, 260, 0, null, 2000); setTimeout(() => note(600, .1, "square", .05, 300, 0, null, 2000), 130); },
  shimmer: v => { note(mtof(96 + Math.floor(Math.random() * 5) * 2), .5, "sine", v); },
  warn: () => { const t = tNow(); for (let i = 0; i < 3; i++) osc(t + i * .14, "square", 880 + i * 220, .1, .03, null, { lp: 3000 }); nz(t, .4, .03, null, { type: "bandpass", f: 2400, f2: 4800, q: 4 }); },
  bolt: (x, y, z) => { const t = tNow(), d = at3(x, y, z, 60) || sfxG; nz(t, .5, .2, d, { type: "highpass", f: 2400, f2: 600, q: .7 }); thump(t + .02, 80, .6, .2, d); nz(t + .05, 1.2, .12, d, { brown: 1, type: "lowpass", f: 600, f2: 120 }); },
  sting: kind => { const t = tNow(), base = { rug: 50, whale: 45, king: 47, fudder: 43 }[kind] || 48; thump(t, 60, 1.4, .22); [0, 7, 12, 15].forEach((s, i) => osc(t + i * .11, "sawtooth", mtof(base + s), 1.3 - i * .15, .045, musG || sfxG, { lp: 900, lp2: 3000, lq: 3, det: (i % 2 ? 9 : -9) })); nz(t, 1.4, .1, null, { brown: 1, type: "lowpass", f: 300 }); osc(t + .45, "square", mtof(base + 24), .9, .03, musG || sfxG, { lp: 2600, vib: [6, 8] }); },
};
for (const k in sfx) { const f = sfx[k]; sfx[k] = (...a) => { sfxN[k] = (sfxN[k] | 0) + 1; if (!AC || AC.state === "closed") return; try { return f(...a); } catch (e) {} }; }
// ambience: wind, water, cave drone are looping noise beds; birds, crickets and cave drips are scheduled one-shots
const amb = { wind: null, windF: null, whis: null, whisF: null, water: null, cave: null, birdT: 3, crickT: 1, dripT: 2, bloopT: 2, wT: 0, wTgt: 450, poolD: 99 };
function loopBed(buf, type, f, q, to) { const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = AC.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(to); s.start(0, Math.random() * 1.5); return [g, fl]; }
function initAmb() { [amb.wind, amb.windF] = loopBed(noiseBuf, "bandpass", 450, .55, ambG); [amb.whis, amb.whisF] = loopBed(noiseBuf, "bandpass", 1700, 9, ambG); [amb.water] = loopBed(brownBuf, "lowpass", 650, .7, ambG); [amb.cave] = loopBed(brownBuf, "lowpass", 150, .8, ambG); }
function bird(t) { sfxN.bird = (sfxN.bird | 0) + 1; const d = bus((Math.random() - .5) * 1.6, 1, ambG), kind = Math.random(), f0 = 2500 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) { const at = t + i * (kind < .5 ? .11 : .07) + Math.random() * .02; if (kind < .5) osc(at, "sine", f0, .08, .02, d, { slide: (i % 2 ? -1 : 1) * (600 + Math.random() * 900), a: .01 }); else osc(at, "sine", f0 * (1 + i * .06), .06, .016, d, { vib: [38, 260], a: .008 }); } }
function ambTick(dt) { if (!amb.wind) return; const t = tNow(), on = running && sndOn, ug = biomeNow === "UNDERGROUND", night = curNight;
  const col = Math.max(0, Math.min(SX - 1, Math.floor(P.x))) + Math.max(0, Math.min(SZ - 1, Math.floor(P.z))) * SX, alt = Math.max(0, P.y - 12) / 24, exposed = !ug;
  if ((amb.wT -= dt) <= 0) { amb.wT = 2 + Math.random() * 4; amb.wTgt = 300 + Math.random() * 500; }
  const cold = biomeNow === "FROST CHAIN" || biomeNow === "MOON BASIN";
  const wv = on ? (exposed ? .032 + alt * .06 + (cold ? .028 : 0) + (boss.on ? .02 : 0) : .01) : 0;
  amb.wind.gain.setTargetAtTime(wv, t, .8); amb.windF.frequency.setTargetAtTime(amb.wTgt * (cold ? 1.3 : 1), t, 1.5);
  amb.whis.gain.setTargetAtTime(on && exposed ? (alt * .012 + (cold ? .01 : 0)) * (.5 + .5 * Math.sin(t * .37)) : 0, t, .6); amb.whisF.frequency.setTargetAtTime(1400 + 600 * Math.sin(t * .21), t, .8);
  let pd = 99, pq = null; for (const q of pools) { const dd = Math.hypot(q.x - P.x, q.z - P.z) - Math.max(q.rx, q.rz); if (dd < pd) { pd = dd; pq = q; } } amb.poolD = pd;
  amb.water.gain.setTargetAtTime(on ? Math.pow(Math.max(0, 1 - pd / 14), 2) * .22 : 0, t, .5);
  amb.cave.gain.setTargetAtTime(on && ug ? .16 : 0, t, 1.2);
  if (sfxRv) sfxRv.gain.setTargetAtTime(ug ? .42 : .14, t, .8);
  if (!on) return;
  if (pd < 10 && (amb.bloopT -= dt) <= 0) { amb.bloopT = .7 + Math.random() * 2.2; const d = at3(pq.x, pq.y, pq.z, 18, ambG); if (d) { osc(t, "sine", 300 + Math.random() * 400, .07, .05, d, { slide: 500 + Math.random() * 600 }); } }
  if (exposed && night < .35 && biomeNow !== "MOON BASIN" && biomeNow !== "GLITCH WASTES" && (amb.birdT -= dt) <= 0) { amb.birdT = 3.5 + Math.random() * 7; bird(t); if (Math.random() < .4) bird(t + .6 + Math.random()); }
  if (exposed && night > .6 && (amb.crickT -= dt) <= 0) { amb.crickT = .6 + Math.random() * .9; const d = bus((Math.random() - .5) * 1.4, 1, ambG), f = 4300 + Math.random() * 500; for (let i = 0; i < 3; i++) osc(t + i * .045, "sine", f, .03, .007, d); }
  if (ug && (amb.dripT -= dt) <= 0) { sfxN.drip = (sfxN.drip | 0) + 1; amb.dripT = 1 + Math.random() * 2.6; const d = bus((Math.random() - .5) * 1.4, 1, ambG), f = 900 + Math.random() * 900; osc(t, "sine", f, .09, .045, d, { slide: f * 1.3, sd: .05 }); osc(t + .23, "sine", f * 1.05, .07, .012, d, { slide: f * 1.3, sd: .04 }); if (rvSend) { const g = AC.createGain(); g.gain.value = .9; g.connect(rvSend); osc(t, "sine", f, .09, .05, g, { slide: f * 1.3, sd: .05 }); } } }
let unlockN = 0;
function initAudio() { if (AC) { if (AC.state !== "running") { const r = AC.resume(); if (r && r.catch) r.catch(() => {}); } return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" }); } catch (e) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e2) { return; } }
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}   // iPhone: let game audio play like a video would
  try { const b = AC.createBuffer(1, 1, 22050), s = AC.createBufferSource(); s.buffer = b; s.connect(AC.destination); s.start(0); } catch (e) {}   // old iOS unlock trick
  { const r = AC.resume && AC.resume(); if (r && r.catch) r.catch(() => {}); }
  comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .22; comp.connect(AC.destination);
  master = AC.createGain(); master.gain.value = .95; master.connect(comp);
  meter = AC.createAnalyser(); meter.fftSize = 16384; meterBuf = new Float32Array(16384); comp.connect(meter);
  sfxG = AC.createGain(); sfxG.gain.value = sndOn ? 1 : 0; sfxG.connect(master); musG = AC.createGain(); musG.gain.value = musOn ? MUS_V : 0; musG.connect(master); ambG = AC.createGain(); ambG.gain.value = sndOn ? AMB_V : 0; ambG.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  brownBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); { const b = brownBuf.getChannelData(0); let l = 0; for (let i = 0; i < b.length; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; b[i] = l * 3.5; } }
  hum = AC.createOscillator(); hum.type = "sawtooth"; hum.frequency.value = 90; humF = AC.createBiquadFilter(); humF.type = "lowpass"; humF.frequency.value = 700; humG = AC.createGain(); humG.gain.value = 0;
  hum.connect(humF).connect(humG).connect(sfxG); hum.start(); musNext = AC.currentTime + .1;
  try { const rv = AC.createConvolver(), L = Math.floor(AC.sampleRate * 2.4), ib = AC.createBuffer(2, L, AC.sampleRate); for (let ch = 0; ch < 2; ch++) { const dd = ib.getChannelData(ch); for (let i = 0; i < L; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 2.6); } rv.buffer = ib;
    const rg = AC.createGain(); rg.gain.value = .42; rv.connect(rg).connect(master); rvSend = AC.createGain(); rvSend.gain.value = 1; rvSend.connect(rv); const ms = AC.createGain(); ms.gain.value = 1; musG.connect(ms).connect(rvSend); sfxRv = AC.createGain(); sfxRv.gain.value = .14; sfxG.connect(sfxRv).connect(rvSend); const as = AC.createGain(); as.gain.value = .3; ambG.connect(as).connect(rvSend); } catch (e) {}
  try { initAmb(); } catch (e) {}
  AC.onstatechange = () => updSndHud(); updSndHud(); }
// iPhone: audio may only start inside a real touch. Resume on every gesture until it's running (also after calls / app switches)
function unlockAudio() { if (!sndOn && !musOn && AC) return; if (AC && AC.state === "running") return; unlockN++; initAudio(); updSndHud(); }
for (const evn of ["touchstart", "touchend", "pointerdown", "pointerup", "mousedown", "keydown", "click"]) document.addEventListener(evn, unlockAudio, { capture: true, passive: true });
document.addEventListener("visibilitychange", () => { if (!AC) return; if (document.hidden) { if (AC.state === "running") AC.suspend().catch(() => {}); } else if (AC.state !== "running") { const r = AC.resume(); if (r && r.catch) r.catch(() => {}); } });
// UI click for every button (deduped with in-game clicks)
document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest("button"); if (b && b.id !== "sndHud") sfx.ui(); }, true);
function audioLevel() { if (!meter) return { peak: 0, rms: 0 }; meter.getFloatTimeDomainData(meterBuf); let pk = 0, s = 0; for (const v of meterBuf) { pk = Math.max(pk, Math.abs(v)); s += v * v; } return { peak: pk, rms: Math.sqrt(s / meterBuf.length) }; }
// music: 4-chord synthwave loop, arps soften at night, drums kick in during the boss fight
const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], PROG_N = [[57, 60, 64], [53, 57, 60], [55, 58, 62], [52, 55, 59]];
const LEAD = { "NEON FLATS": "square", "PUMP DUNES": "sawtooth", "SIGNAL GROVE": "triangle", "FROST CHAIN": "sine", "MOON BASIN": "sine", "GLITCH WASTES": "square", "UNDERGROUND": "triangle" };
const MOTIF = [[0, -1, 2, -1, 4, -1, 2, 1], [4, -1, 3, 2, 0, -1, -1, -1], [2, 4, 5, 4, 2, -1, 0, -1], [0, -1, 0, 2, 4, -1, 7, -1]], SCALE = [0, 2, 3, 5, 7, 9, 10, 12];
let musStep = 0, musNext = 0, hudT = 0;
function audioTick() { if (!AC) return; const t = tNow(); const dt = applyView.dt || .016; try { ambTick(dt); } catch (e) {} if ((hudT -= dt) <= 0) { hudT = .5; updSndHud(); }
  humG.gain.setTargetAtTime(isFiring && running ? .022 : 0, t, .03); hum.frequency.setTargetAtTime(70 + minePitch * 170 + upg.drill * 14, t, .05); humF.frequency.setTargetAtTime(500 + minePitch * 1800, t, .05);
  if (!musOn || !running) { musNext = t + .1; return; } if (musNext < t - .5) musNext = t + .05;
  while (musNext < t + .25) { const at = musNext, bar = Math.floor(musStep / 16) % 4, st = musStep % 16, nt = curNight > .6, ch = (nt ? PROG_N : PROG)[bar], fight = boss.on, phrase = Math.floor(musStep / 64);
    if (st === 0) for (const m of ch) note(mtof(m), 2.3, "sawtooth", .009, 0, at, musG, nt ? 700 : 1100);
    if (st % 2 === 0 && phrase % 2 === 1 && !fight) { const mi = MOTIF[(bar + phrase) % 4][st / 2]; if (mi >= 0) note(mtof(ch[0] + 12 + SCALE[mi]), nt ? .5 : .28, LEAD[biomeNow] || "triangle", nt ? .016 : .014, 0, at, musG, 2600); }
    if (!nt && !fight && st % 2 === 1) noise(.02, 8000, .01, 1, at, musG, "highpass");
    if (st % 4 === 0) note(mtof(ch[0] - 24), .32, "sawtooth", .05, 0, at, musG, 420);
    if (st % 2 === 0) note(mtof(ch[(st / 2) % 3] + (bar % 2 ? 12 : 0)), .14, "triangle", .022, 0, at, musG);
    if (st === 0) note(mtof(ch[2] + 12), 1.6, "sine", .02, 0, at, musG);
    if (fight) { if (st % 4 === 0) note(130, .14, "sine", .14, -90, at, musG); if (st % 8 === 4) noise(.12, 1800, .06, .8, at, musG); if (st % 2 === 1) noise(.03, 7000, .02, 1, at, musG, "highpass"); }
    musNext += fight ? .11 : curNight > .6 ? .17 : .15; musStep++; } }
function updSndHud() { const b = $("sndHud"); if (!b) return; const muted = !sndOn && !musOn, blocked = !muted && (!AC || AC.state !== "running"); const s = muted ? "🔇" : blocked ? "🔈" : "🔊"; if (b.textContent !== s) b.textContent = s; b.classList.toggle("off", muted); b.classList.toggle("blocked", blocked && running); b.setAttribute("aria-label", muted ? "Sound off: tap to turn on" : blocked ? "Tap to start sound" : "Sound on: tap to mute"); }
function updSetBtns() { const a = $("sndBtn"), b = $("musBtn"); if (a) a.textContent = "SFX: " + (sndOn ? "ON" : "OFF"); if (b) b.textContent = "MUSIC: " + (musOn ? "ON" : "OFF");
  if (sfxG) sfxG.gain.value = sndOn ? 1 : 0; if (ambG) ambG.gain.value = sndOn ? AMB_V : 0; if (musG) musG.gain.value = musOn ? MUS_V : 0; updSndHud(); }
function toggleSound() { const anyOn = sndOn || musOn; sndOn = musOn = !anyOn; initAudio(); updSetBtns(); save(); if (sndOn) { sfx.ui(); pop("🔊 SOUND ON", "#14f195"); } else pop("🔇 SOUND OFF", "#cfefff"); }
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

// ---------------- controls: desktop ----------------
let running = false, locked = false;
function maybeShowTip() {
  if (!IS_TOUCH || Q.has("notip")) return;
  try { if (localStorage.getItem(TIP_KEY) === "1") return; } catch (e) {}
  $("tip").classList.add("show");
}
function startGame() { try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (e) {} if (IS_PHONE && !window.__SB_TEST) goLandscape(); initAudio(); $("menu").classList.add("hide"); document.body.classList.remove("inmenu"); closeLab(true); running = true; last = performance.now(); if (!introDone && !mp.on && !Q.has("nointro")) intro();
  maybeShowTip();
  if (!IS_TOUCH && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } if (IS_PHONE) orientCheck(); }
function pause() { if (photo) setPhoto(false); running = false; document.body.classList.add("inmenu"); input.mine = false; $("menu").classList.remove("hide"); $("playBtn").textContent = "RESUME"; menuStats(); save(); if (document.pointerLockElement) document.exitPointerLock(); }
document.addEventListener("pointerlockchange", () => { locked = document.pointerLockElement === canvas; if (!locked && running && !IS_TOUCH && !window.__SB_TEST && !labOpen) pause(); });
canvas.addEventListener("mousedown", e => { if (IS_TOUCH) return; if (!running || labOpen) return; if (!locked && canvas.requestPointerLock && !window.__SB_TEST) { startGame(); return; }
  if (e.button === 0) input.mine = true; else if (e.button === 2) place(); });
window.addEventListener("mouseup", e => { if (e.button === 0) input.mine = false; });
canvas.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("mousemove", e => { if (!locked) return; if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return; /* ignore pointer-lock spike */ look(e.movementX * .0022, e.movementY * .0022); });
window.addEventListener("wheel", e => { if (running) select(sel + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
window.addEventListener("keydown", e => { input.keys[e.code] = true; if (e.code === "Space") e.preventDefault();
  if (/^Digit[0-9]$/.test(e.code)) select((+e.code[5] + 9) % 10); if ((e.code === "KeyU" || e.code === "Tab") && running) { e.preventDefault(); labOpen ? closeLab() : openLab(); } if (e.code === "KeyQ") select(sel - 1); if (e.code === "KeyE") select(sel + 1);
  if (e.code === "KeyR" && running) respawn(); if (e.code === "KeyG" && mp.on && mp.ws) mp.ws.send(JSON.stringify({ t: "emote", k: 0 })); if ((e.code === "KeyP") && running) pause(); if (e.code === "KeyK" && running) wantShot = true; if (e.code === "KeyJ" && running && lastShot) { if (document.pointerLockElement) document.exitPointerLock(); shareShot(); } if (e.code === "KeyV" && running) cycleView(); });
window.addEventListener("keyup", e => { input.keys[e.code] = false; });
window.addEventListener("blur", () => { input.keys = {}; input.mine = false; });
let lookMul = 1;
function look(dx, dy) { P.yaw -= dx; P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch - dy)); }
// touch look: user speed setting, gentle acceleration (precise when slow, quick flicks), aim friction over targets
function touchLook(dx, dy, mul = 1) { const sp = Math.hypot(dx, dy), acc = .7 + Math.min(.9, sp / 22), fr = (bossHit || fudHit || critHit) ? .6 : 1, k = LOOK_SENS() * lookMul * acc * fr * mul; look(dx * k, dy * k); }

// ---------------- controls: touch (left joystick, right drag-look, buttons) ----------------
const joy = { id: null, ox: 0, oy: 0, active: false, mag: 0, R: 64, dead: 0.18 };
const lookT = { id: null, x: 0, y: 0, moved: false };
let lookSlow = false;
const LOOK_SENS = () => lookSlow ? 0.0026 : 0.0042; // was 0.0058; slower default for iPhone thumbs
const TIP_KEY = "boss_sandbox_tip_v2";
function overUI(x, y) {
  // Don't start look/joystick on HUD buttons, palette, tip, or pause.
  const el = document.elementFromPoint(x, y);
  if (!el || el === $("touch") || el === $("game") || el === $("lookPad") || el === document.body) return false;
  return !!(el.closest && el.closest(".tbtn, #palette, #pauseBtn, #labBtn, #lab, #lookSlow, #tip, #menu, .chip, #shards, #photoBar, #photoBtn, #viewBtn, #shotBtn, #shareBtn, #sndHud"));
}
function landPhone() { return IS_TOUCH && innerWidth > innerHeight && innerHeight <= 540; }
function inLookZone(x, y) {
  // Right side of the screen, above the action buttons, so look doesn't fight MINE/BUILD/JUMP.
  const w = innerWidth, h = innerHeight;
  if (landPhone()) return x >= w * 0.40;   // landscape phone: the whole right side looks (buttons are excluded by overUI)
  if (x < w * 0.42) return false;
  // leave the bottom-right button cluster alone (~42% height in portrait, ~48% in landscape)
  const btnTop = h * (w > h ? 0.48 : 0.52);
  return y < btnTop;
}
function inMoveZone(x, y) {
  const w = innerWidth, h = innerHeight;
  if (landPhone()) return x < w * 0.40;
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
// ---------------- v0.9.3 landscape-first phones: rest stick, portrait overlay + pause, fullscreen/orientation lock ----------------
let resetTouch = null, rotPaused = false;
const STANDALONE = navigator.standalone === true || !!(window.matchMedia && matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches);
function safeInsets() { const el = $("safeProbe"); if (!el) return { t: 0, r: 0, b: 0, l: 0 }; const c = getComputedStyle(el); return { t: parseFloat(c.paddingTop) || 0, r: parseFloat(c.paddingRight) || 0, b: parseFloat(c.paddingBottom) || 0, l: parseFloat(c.paddingLeft) || 0 }; }
function placeStickRest() { const st = $("stick"); if (!IS_TOUCH || joy.active) return; if (!landPhone()) { st.classList.remove("rest"); st.style.display = "none"; return; }
  const si = safeInsets(), x = Math.max(10, si.l) + 74, y = innerHeight - Math.max(8, si.b) - 74; st.classList.add("rest"); st.style.left = x + "px"; st.style.top = y + "px"; }
function lockLandscape() { try { const o = screen.orientation; if (o && o.lock) { const r = o.lock("landscape"); if (r && r.catch) r.catch(() => {}); } } catch (e) {} }
// Android Chrome: fullscreen (needs a tap) then lock to landscape. iPhone Safari has neither, so this quietly does nothing there.
function goLandscape() { if (!IS_PHONE) return; try { const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen, fs = document.fullscreenElement || document.webkitFullscreenElement;
  if (rq && !fs && !STANDALONE) { const r = rq.call(el, { navigationUI: "hide" }); if (r && r.then) r.then(lockLandscape, () => {}); else lockLandscape(); } else lockLandscape(); } catch (e) {} }
if (IS_PHONE && document.documentElement.requestFullscreen && screen.orientation && screen.orientation.lock) document.body.classList.add("can-lock");
function orientCheck() { const port = IS_PHONE && innerHeight > innerWidth * 1.05 && !Q.has("portrait"); document.body.classList.toggle("portrait-phone", port);
  if (port && running) { rotPaused = true; running = false; input.mine = false; input.jump = false; input.jumpHeld = false; if (resetTouch) resetTouch(); save(); }
  else if (!port && rotPaused) { rotPaused = false; if ($("menu").classList.contains("hide")) { running = true; last = performance.now(); } }
  placeStickRest(); }
if (IS_PHONE) { window.addEventListener("resize", orientCheck); window.addEventListener("orientationchange", () => setTimeout(orientCheck, 60)); try { screen.orientation && screen.orientation.addEventListener("change", () => setTimeout(orientCheck, 60)); } catch (e) {}
  $("rotGo").addEventListener("click", e => { e.preventDefault(); goLandscape(); });
  // menu: two columns side by side on a landscape phone (title + PLAY left, characters + info right)
  { const card = document.querySelector("#menu .card"), cA = document.createElement("div"), cB = document.createElement("div"); cA.className = "mcol a"; cB.className = "mcol b"; const row = $("sndBtn").parentElement;
    for (const el of [card.querySelector(".heroRow"), card.querySelector(".title"), card.querySelector(".tag"), $("playBtn"), row]) if (el) cA.appendChild(el); while (card.firstChild) cB.appendChild(card.firstChild); card.append(cA, cB); } }
if (IS_TOUCH) {
  const T = $("touch"); T.style.display = "block";
  for (const b of ["bMine", "bBuild", "bJump"]) $(b).style.display = "block";
  $("lookSlow").style.display = "block"; $("stickHint").style.display = "block"; $("lookPad").style.display = "block";
  $("ctlDesk").style.display = "none"; $("ctlTouch").style.display = "grid";
  const st = $("stick"), knob = st.firstElementChild;
  // First-run tip overlay (shown when PLAY is tapped — see maybeShowTip)
  $("tipGot").addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); $("tip").classList.remove("show"); try { localStorage.setItem(TIP_KEY, "1"); } catch (_) {} initAudio(); });
  T.addEventListener("touchstart", () => initAudio(), { passive: true, once: true });
  const toggleLookSlow = () => { lookSlow = !lookSlow; $("lookSlow").classList.toggle("on", lookSlow); $("lookSlow").textContent = lookSlow ? "LOOK: SLOW" : "LOOK: NORM"; };
  $("lookSlow").addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); toggleLookSlow(); });

  T.addEventListener("touchstart", e => { e.preventDefault();
    for (const t of e.changedTouches) {
      if (overUI(t.clientX, t.clientY)) continue; // buttons/palette own their pointers
      if (inMoveZone(t.clientX, t.clientY) && joy.id === null) {
        const lp = landPhone(); joy.R = lp ? 54 : 64; joy.id = t.identifier; joy.ox = lp ? Math.max(66, t.clientX) : t.clientX; joy.oy = lp ? Math.min(t.clientY, innerHeight - 66) : Math.min(t.clientY, innerHeight * 0.72); joy.active = true; joy.mag = 0;
        st.classList.remove("rest"); st.style.display = "block"; st.style.left = joy.ox + "px"; st.style.top = joy.oy + "px"; knob.style.transform = "";
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
        touchLook(dx, dy);
        lookT.x = t.clientX; lookT.y = t.clientY;
      }
    }
  }, { passive: false });
  const end = e => { for (const t of e.changedTouches) {
    if (t.identifier === joy.id) { joy.id = null; joy.active = false; joy.mag = 0; input.f = input.s = 0; st.style.display = "none"; knob.style.transform = ""; placeStickRest(); }
    if (t.identifier === lookT.id) lookT.id = null;
  }; };
  T.addEventListener("touchend", end); T.addEventListener("touchcancel", end);
  resetTouch = () => { joy.id = null; joy.active = false; joy.mag = 0; lookT.id = null; input.f = input.s = 0; st.style.display = "none"; knob.style.transform = ""; for (const b of ["bMine", "bBuild", "bJump"]) $(b).classList.remove("on"); placeStickRest(); };

  // Action buttons: capture pointer so look-drag never steals them. Soft-tap mine on quick release.
  let mineDownAt = 0;
  const hold = (id, onDown, onUp) => {
    const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); b.classList.add("on"); onDown(e); try { b.setPointerCapture(e.pointerId); } catch (_) {} });
    const up = e => { b.classList.remove("on"); onUp && onUp(e); };
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
  };
  // MINE doubles as a look pad: slide your thumb while holding to aim and dig at the same time.
  const mineLook = { on: false, x: 0, y: 0, moved: 0 };
  $("bMine").addEventListener("pointermove", e => { if (!mineLook.on) return; const dx = e.clientX - mineLook.x, dy = e.clientY - mineLook.y; mineLook.x = e.clientX; mineLook.y = e.clientY; mineLook.moved += Math.abs(dx) + Math.abs(dy); touchLook(dx, dy, 1.15); });
  hold("bMine", e => { input.mine = true; mineDownAt = performance.now(); mineGrace = 0.28; mineLook.on = true; mineLook.x = e.clientX; mineLook.y = e.clientY; mineLook.moved = 0; },
    () => { const held = performance.now() - mineDownAt; input.mine = false; mineLook.on = false;
      if (held < 220 && mineLook.moved < 12) trySoftTapMine(); // short tap = soft-block one-shot
      else mineGrace = 0.28; // brief grace after a hold so wobble doesn't cancel
    });
  hold("bBuild", () => { aim(); place(); }, null);
  hold("bJump", () => { input.jump = true; input.jumpHeld = true; }, () => { input.jumpHeld = false; });
  document.addEventListener("gesturestart", e => e.preventDefault());
  // Prevent iOS double-tap zoom stealing inputs
  let lastTouchEnd = 0; document.addEventListener("touchend", e => { if (e.target.closest && e.target.closest("#lab,#menu,#tip")) return; const now = Date.now(); if (now - lastTouchEnd < 320) e.preventDefault(); lastTouchEnd = now; }, { passive: false });
}
$("pauseBtn").addEventListener("click", () => { if (running) pause(); else startGame(); });
$("playBtn").addEventListener("click", startGame);
$("resetBtn").addEventListener("click", () => { if (!confirm("Start a fresh world? Your builds, upgrades, quests and SOL shards on this device will be cleared.")) return; try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_KEY); } catch (e) {} seed = (Math.random() * 1e9) | 0; edits = {}; shards = 0; Object.assign(upg, { drill: 1, boots: 0, shield: 0, hp: 0, rod: 1 }); fish.dex = {}; for (const k in stats) stats[k] = 0; Qi = 0; qStart(); if (boss.on) bossEnd(false, true); daily.key = ""; introDone = false; met.crater = null; P.hp = maxHp(); updHP(); generate(seed); buildAll(); respawn(); updShards(); save(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { save(); if (running && IS_TOUCH) pause(); } });
window.addEventListener("pagehide", save);

// ---------------- resize ----------------
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  const a = w / h; camera.fov = a >= 1 ? 72 : Math.min(100, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(38)) / a)));
  baseFov = camera.fov; camera.updateProjectionMatrix(); drillBase.set(a >= 1 ? .3 : .17, a >= 1 ? -.27 : -.25, -.6); }
window.addEventListener("resize", resize);

// ---------------- day / night ----------------
let tod = .62, baseFov = 72;   // 0 midnight, .25 sunrise, .5 noon, .75 sunset
const C = (h) => new THREE.Color(h);
const SKY = [ // [tod, top, horizon]
  [0, C(0x05020f), C(0x2a0c3a)], [.22, C(0x0a0420), C(0x6a1a5a)], [.3, C(0x2a2a8a), C(0xff7a6a)], [.42, C(0x3050c0), C(0xd08ad8)],
  [.58, C(0x3050c0), C(0xd08ad8)], [.7, C(0x3a1a7a), C(0xff6a8a)], [.78, C(0x12062a), C(0x8a1a6a)], [1, C(0x05020f), C(0x2a0c3a)]];
const _tc = { sun: new THREE.Vector3(), sunC: new THREE.Color(), sky: new THREE.Color(), gnd: new THREE.Color(), lampP: new THREE.Vector3(), fog: null, lamp: 0, night: 0, t: 0 };
function terrTick(day) { _tc.sun.copy(skyU.uSun.value); if (_tc.sun.y < .05) _tc.sun.y = .05; _tc.sun.normalize(); _tc.sunC.copy(sun.color).multiplyScalar(sun.intensity * .8); _tc.sky.copy(hemi.color).multiplyScalar(hemi.intensity * .55); _tc.gnd.copy(hemi.groundColor).multiplyScalar(hemi.intensity * .5).add(_tc.sky.clone().multiplyScalar(.25));
  _tc.fog = scene.fog; camera.getWorldPosition(_tc.lampP); _tc.lamp = lamp.intensity * .32; _tc.night = 1 - day; _tc.t = performance.now() / 1000; T.tick(_tc); }
function updSky(dt) {
  if (!Q.has("tod")) tod = (tod + dt / DAY_LEN) % 1; else tod = parseFloat(Q.get("tod"));
  let i = 0; while (i < SKY.length - 2 && tod > SKY[i + 1][0]) i++; const a = SKY[i], b = SKY[i + 1], k = (tod - a[0]) / (b[0] - a[0]);
  skyU.uTop.value.copy(a[1]).lerp(b[1], k); skyU.uHor.value.copy(a[2]).lerp(b[2], k);
  const ang = (tod - .25) * Math.PI * 2; skyU.uSun.value.set(Math.cos(ang) * .9, Math.sin(ang), -.35).normalize();
  const day = Math.max(0, Math.min(1, Math.sin(ang) * 3 + .3)); skyU.uNight.value = 1 - day;
  scene.fog.color.copy(skyU.uHor.value).multiplyScalar(.75); gridU.uFog.value.copy(scene.fog.color);
  hemi.intensity = .62 + day * .7; hemi.color.copy(skyU.uTop.value).lerp(C(0xffffff), .5); sun.intensity = .15 + day * 1.1;
  sun.position.set(P.x + skyU.uSun.value.x * 50, P.y + Math.abs(skyU.uSun.value.y) * 50 + 5, P.z + skyU.uSun.value.z * 50); sun.target.position.set(P.x, P.y, P.z);
  sun.color.copy(day > .2 ? C(0xffe0f0) : C(0x8a9aff));
  blockMat.emissiveIntensity = .55 + (1 - day) * .65; terrTick(day); GEM.tick(performance.now() / 1000, skyU.uSun.value, day, scene.fog, renderer.domElement.height);
  lamp.intensity += (Math.max(lampT * 9, (1 - day) * 2.6) - lamp.intensity) * Math.min(1, dt * 3 + .02);
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
  $("labBtn").style.display = "none"; $("quest").style.display = "none"; $("shotBtn").style.display = "none"; $("viewBtn").style.display = "none";
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

// ---------------- progression: drill tiers, upgrades, stats ----------------
const SPEED = [0, 1, 1.6, 2.4, 3.5], REACH = [0, 5, 6, 7, 8], DMG = [0, 9, 15, 24, 38], LASER = [0, 0x14f195, 0x28dcff, 0xffd24a, 0xff4fd8];
const upg = { drill: 1, boots: 0, shield: 0, hp: 0, rod: 1, pets: {}, pet: "" };
const stats = { mined: 0, veins: 0, placed: 0, prisms: 0, golds: 0, cores: 0, fud: 0, kills: 0, combos: 0, dj: 0, lair: 0, k_fudder: 0 };
const maxHp = () => 10 + upg.hp * 4;
let trauma = 0;
const UPG = [
  { id: "drill2", name: "DRILL MK II", desc: "Mines 1.6× faster · reach 6", cost: 25, have: () => upg.drill >= 2, can: () => upg.drill === 1, need: "", buy: () => upg.drill = 2 },
  { id: "boots", name: "JET BOOTS", desc: "Double-jump in mid-air", cost: 40, have: () => upg.boots, can: () => true, buy: () => upg.boots = 1 },
  { id: "drill3", name: "DRILL MK III", desc: "2.4× faster · reach 7 · gold laser", cost: 90, have: () => upg.drill >= 3, can: () => upg.drill === 2, need: "needs MK II", buy: () => upg.drill = 3 },
  { id: "shield", name: "FUD SHIELD", desc: "FUD can't steal shards", cost: 60, have: () => upg.shield, can: () => true, buy: () => upg.shield = 1 },
  { id: "heart", name: "VIBE CORE", desc: "+4 max health (up to 3)", cost: 50, cst: () => 50 + upg.hp * 30, have: () => upg.hp >= 3, can: () => true, buy: () => { upg.hp++; P.hp = maxHp(); updHP(); } },
  { id: "rod2", name: "SYNTH ROD MK II", desc: "Faster bites · wider reel zone · rarer fish", cost: 30, have: () => (upg.rod || 1) >= 2, can: () => true, buy: () => upg.rod = 2 },
  { id: "rod3", name: "SYNTH ROD MK III", desc: "Even faster · widest zone · Golden Boss Fish odds up", cost: 90, have: () => (upg.rod || 1) >= 3, can: () => (upg.rod || 1) === 2, need: "needs ROD MK II", buy: () => upg.rod = 3 },
  { id: "drill4", name: "BOSS DRILL MK IV", desc: "3.5× · reach 8 · chain-mines whole SOL veins", cost: 220, have: () => upg.drill >= 4, can: () => upg.drill === 3, need: "needs MK III", buy: () => upg.drill = 4 },
];
let labOpen = false;
function costOf(u) { return u.cst ? u.cst() : u.cost; }
function renderLab() { const L = $("labList"); L.innerHTML = "";
  for (const u of UPG) { const have = u.have(), can = u.can(), c = costOf(u), d = document.createElement("div"); d.className = "upg" + (have ? " own" : !can ? " lock" : shards >= c ? " ok" : "");
    d.innerHTML = `<div><b>${u.name}</b><span>${u.desc}</span></div><button type="button" data-id="${u.id}">${have ? "OWNED" : !can ? (u.need || "LOCKED") : "◆" + c}</button>`; L.appendChild(d); }
  const sb = $("summonBtn"), sk = $("summonBtn2"), lv = stats.kills ? " · LV " + (stats.kills + 1) : ""; sb.disabled = boss.on || upg.drill < 2; sk.disabled = boss.on || stats.kills < 1; const sw = $("summonBtn3"); sw.disabled = boss.on || stats.kills < 2; sw.textContent = stats.kills < 2 ? "THE DUMP WHALE · bust 2 bosses first" : "SUMMON THE DUMP WHALE" + lv;
  sb.textContent = boss.on ? BOSSES[boss.kind].name + " IS HERE" : upg.drill < 2 ? "SUMMON BOSS · needs Drill MK II" : "SUMMON THE RUG PULLER" + lv; sk.textContent = stats.kills < 1 ? "THE FUD KING · bust the Rug Puller first" : "SUMMON THE FUD KING" + lv;
  $("dailyL").textContent = dailyLine(); $("buildL").textContent = bcLine();
  $("labShards").textContent = shards; $("achL").innerHTML = achHTML(); $("labStats").innerHTML = `Secret caches ${Math.min(5, cachesFound())}/5 <small>(listen for a shimmer in deep caves)</small><br>Tiles mined ${stats.mined} · Veins ${stats.veins} · Bosses busted ${stats.kills} · Fish ${stats.fish || 0}<br><b>FISHDEX</b> ` + FISH.map(f => fish.dex[f.n] ? `<span style="color:${f.c}">${f.n} ×${fish.dex[f.n]}</span>` : `<span style="opacity:.4">???</span>`).join(" · "); }
function buyUpg(id) { const u = UPG.find(q => q.id === id); if (!u || u.have() || !u.can()) return false; const c = costOf(u);
  if (shards < c) { pop(`NEED ◆${c}`, "#ff6a8a"); sfx.hurt(); return false; } shards -= c; u.buy(); updShards(); sfx.buy(); buzz(20); banner(u.name, "UNLOCKED"); renderLab(); save(); qTick(); return true; }
function renderPets() { const el = $("petL"); if (!el) return; el.innerHTML = `<b>🐾 COMPANIONS</b>` + PETS.map(([id, nm, d, c]) => { const own = upg.pets && upg.pets[id], on = upg.pet === id;
  return `<div class="pet"><img src="${petTex[id].image.toDataURL()}" alt=""><div><b>${nm}</b><small>${d}</small></div><button type="button" data-pet="${id}" class="${on ? "on" : ""}">${on ? "WITH YOU" : own ? "BRING" : "◆" + c}</button></div>`; }).join(""); }
function openLab() { labOpen = true; input.mine = false; input.f = input.s = 0; renderLab(); renderPets(); $("lab").classList.add("show"); if (document.pointerLockElement) document.exitPointerLock(); }
function closeLab(quiet) { if (!labOpen) return; labOpen = false; $("lab").classList.remove("show"); if (!quiet && !IS_TOUCH && running && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } }
$("labList").addEventListener("click", e => { const b = e.target.closest("button[data-id]"); if (b) buyUpg(b.dataset.id); });
$("labClose").addEventListener("click", () => closeLab());
$("labBtn").addEventListener("click", e => { e.stopPropagation(); if (!running || mp.on) return; labOpen ? closeLab() : openLab(); });
$("summonBtn").addEventListener("click", () => { if (summonBoss("rug")) closeLab(); });
$("summonBtn2").addEventListener("click", () => { if (summonBoss("king")) closeLab(); });
$("summonBtn3").addEventListener("click", () => { if (summonBoss("whale")) closeLab(); });
$("sndBtn").addEventListener("click", () => { sndOn = !sndOn; initAudio(); updSetBtns(); save(); });
$("musBtn").addEventListener("click", () => { musOn = !musOn; initAudio(); updSetBtns(); save(); });
function syncLookBtn() { const b = $("lookSlow"); if (b) { b.classList.toggle("on", lookSlow); b.textContent = lookSlow ? "LOOK: SLOW" : "LOOK: NORM"; } }

// ---------------- quests (also the tutorial) ----------------
const QUESTS = [
  { t: "Mine 5 tiles", h: IS_TOUCH ? "Aim at a tile, hold MINE" : "Aim at a tile, hold left click", k: "mined", n: 5, r: 3 },
  { t: "Mine any SOL vein", h: "Glowing crystals near the plaza · follow the ▲ scanner", k: "veins", n: 1, r: 3 },
  { t: "Build 5 pieces", h: IS_TOUCH ? "Pick a piece bottom-left, tap BUILD" : "Right click to place", k: "placed", n: 5, r: 4 },
  { t: "Upgrade to Drill MK II", h: "Open the ⚡ LAB (top right)", k: "drill", n: 2, r: 5, abs: 1 },
  { t: "Find a SOL Prism vein", h: "Green crystals, dig deep or explore caves", k: "prisms", n: 1, r: 6 },
  { t: "Mine 3 BOSS Gold veins", h: "Gold flecks in mid-depth rock", k: "golds", n: 3, r: 8 },
  { t: "Buy Jet Boots", h: "⚡ LAB · then double-jump", k: "boots", n: 1, r: 5, abs: 1 },
  { t: "Catch a fish", h: "Find a glowing NEON POOL, aim at it, tap MINE to cast", k: "fish", n: 1, r: 6 },
  { t: "Zap 3 FUD wolves", h: "They prowl at night. Hold MINE on them, dodge the lunge", k: "fud", n: 3, r: 8 },
  { t: "Mine a SOL Core vein", h: "Rarest. Down near the Genesis floor", k: "cores", n: 1, r: 15 },
  { t: "Bust THE RUG PULLER", h: "Summon it from the ⚡ LAB, blast its eye", k: "kills", n: 1, r: 40 },
  { t: "Build the BOSS DRILL", h: "The final ⚡ LAB upgrade", k: "drill", n: 4, r: 25, abs: 1 },
  { t: "Find the Fudder's lair", h: "Follow the ▲ scanner to the cave mouth, then go deep down the tunnel", k: "lair", n: 1, r: 10 },
  { t: "Silence THE TROGLODYTE FUDDER", h: "In its lair: dodge the rings, hit the snack bag", k: "k_fudder", n: 1, r: 60 },
];
let Qi = 0, qBase = {}, qT = 0;
function qDef(i) { if (i < QUESTS.length) return QUESTS[i]; const j = i - QUESTS.length, lv = 1 + Math.floor(j / 4);
  return [{ t: `Mine ${25 * lv} tiles`, h: "Any tiles count", k: "mined", n: 25 * lv, r: 6 * lv }, { t: `Mine ${5 * lv} SOL veins`, h: "Shard, Prism, Gold or Core", k: "veins", n: 5 * lv, r: 10 * lv },
    { t: "Hit a ×10 combo", h: "Mine tiles fast, no pauses", k: "combos", n: 1, r: 8 * lv }, { t: `Bust THE RUG PULLER (LV ${stats.kills + 1})`, h: "It gets tougher every time", k: "kills", n: 1, r: 30 + 10 * lv }][j % 4]; }
function qVal(q) { const v = q.abs ? (q.k === "drill" ? upg.drill : upg[q.k] ? 1 : 0) : stats[q.k] - (qBase[q.k] || 0); return Math.max(0, Math.min(q.n, v)); }
function qStart() { qBase = {}; for (const k in stats) qBase[k] = stats[k]; updQuest(); }
function qTick() { dailyTick(); const q = qDef(Qi); if (qVal(q) >= q.n) { shards += q.r; updShards(); banner("QUEST COMPLETE", `${q.t} · ◆+${q.r}`); sfx.quest(); buzz(40); burst(P.x, P.y + 1.2, P.z, [0xffd24a, 0x14f195, 0xff4fd8], 40, 5); Qi++; qStart(); save(); } else updQuest(); }
let lastQ = "";
function updQuest() { const q = qDef(Qi), v = qVal(q), key = Qi + ":" + v; if (key === lastQ) return; lastQ = key;
  $("qN").textContent = (Qi < QUESTS.length ? `QUEST ${Qi + 1}/${QUESTS.length}` : "BONUS QUEST") + (q.n > 1 ? ` · ${v}/${q.n}` : ""); $("qT").textContent = q.t; $("qH").textContent = q.h; $("qR").textContent = `◆+${q.r}`;
  $("qBar").style.width = (100 * v / q.n).toFixed(0) + "%"; $("qC").textContent = ""; }
let lastD = ""; function updDaily() { const t = dailyLine(); if (t !== lastD) { lastD = t; $("qD").textContent = t; } }

// ---------------- banner, HP ----------------
let banT = null;
function banner(a, b) { const el = $("banner"); el.querySelector("h2").textContent = a; el.querySelector("p").textContent = b || ""; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); clearTimeout(banT); banT = setTimeout(() => el.classList.remove("show"), 2600); }
let hpKey = "";
function updHP() { const m = maxHp(), k = P.hp + "/" + m; if (k === hpKey) return; hpKey = k; const el = $("hp"); let h = ""; for (let i = 0; i < m; i++) h += `<i class="${i < P.hp ? "on" : ""}"></i>`; el.innerHTML = h; el.classList.toggle("low", P.hp <= 3); }
function hurt(n) { P.hp -= n; P.regenT = 5; updHP(); trauma = Math.max(trauma, .5); buzz(60); sfx.hurt(); $("hurt").style.opacity = 1; setTimeout(() => $("hurt").style.opacity = 0, 250);
  if (P.hp <= 0) { banner("REKT", "Back to the plaza. Your shards are safe."); if (boss.on) bossEnd(false); P.hp = maxHp(); updHP(); respawn(); } }

// ---------------- shard orbs that fly to you ----------------
const orbGeo = new THREE.OctahedronGeometry(.12), orbMats = {}, orbs = [];
function spawnOrbs(x, y, z, val, col) { const n = Math.min(8, val), per = Math.floor(val / n); let rem = val - per * n;
  const m = orbMats[col] || (orbMats[col] = new THREE.MeshBasicMaterial({ color: col, fog: false }));
  for (let i = 0; i < n; i++) { const o = new THREE.Mesh(orbGeo, m); o.position.set(x, y, z); scene.add(o); orbs.push({ o, v: per + (rem-- > 0 ? 1 : 0), vx: (Math.random() - .5) * 4, vy: 2 + Math.random() * 3, vz: (Math.random() - .5) * 4, t: 0 }); } }
let pickN = 0;
function updOrbs(dt) { for (let i = orbs.length - 1; i >= 0; i--) { const b = orbs[i], o = b.o; b.t += dt; o.rotation.y += dt * 8; o.rotation.x += dt * 5;
  if (b.t < .35) { b.vy -= 9 * dt; o.position.x += b.vx * dt; o.position.y += b.vy * dt; o.position.z += b.vz * dt; continue; }
  const tx = P.x - o.position.x, ty = P.y + 1.1 - o.position.y, tz = P.z - o.position.z, d = Math.hypot(tx, ty, tz), sp = Math.min(40, 6 + b.t * 30);
  if (d < .5 || b.t > 4) { scene.remove(o); orbs.splice(i, 1); shards += b.v; updShards(); pickN++; sfx.pick(pickN % 15); const n = $("shards"); n.classList.remove("bump"); void n.offsetWidth; n.classList.add("bump"); continue; }
  o.position.x += tx / d * sp * dt; o.position.y += ty / d * sp * dt; o.position.z += tz / d * sp * dt; } if (!orbs.length) pickN = 0; }

// ---------------- debris cubes ----------------
const DN = IS_TOUCH ? 48 : 96, dMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.1, 0), new THREE.MeshLambertMaterial({ emissive: 0x222222 }), DN);
dMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); dMesh.frustumCulled = false; scene.add(dMesh);
const dd = Array.from({ length: DN }, () => ({ l: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0 })); let dHead = 0; const dObj = new THREE.Object3D(), dCol = new THREE.Color();
for (let i = 0; i < DN; i++) { dObj.scale.setScalar(0); dObj.updateMatrix(); dMesh.setMatrixAt(i, dObj.matrix); dMesh.setColorAt(i, dCol.set(0xffffff)); }
function debris(x, y, z, col, n) { for (let k = 0; k < n; k++) { const i = dHead; dHead = (dHead + 1) % DN; const q = dd[i]; q.l = .8 + Math.random() * .6; q.x = x + (Math.random() - .5) * .5; q.y = y + (Math.random() - .5) * .5; q.z = z + (Math.random() - .5) * .5;
  q.vx = (Math.random() - .5) * 5; q.vy = 1.5 + Math.random() * 4; q.vz = (Math.random() - .5) * 5; q.r = Math.random() * 6; dMesh.setColorAt(i, dCol.set(col)); } dMesh.instanceColor.needsUpdate = true; }
function updDebris(dt) { let any = false; for (let i = 0; i < DN; i++) { const q = dd[i]; if (q.l <= 0) continue; any = true; q.l -= dt; q.vy -= 18 * dt;
  let nx = q.x + q.vx * dt, ny = q.y + q.vy * dt, nz = q.z + q.vz * dt; if (get(Math.floor(nx), Math.floor(ny), Math.floor(nz))) { if (q.vy < 0 && !get(Math.floor(q.x), Math.floor(ny), Math.floor(q.z))) { q.vy = 0; } else { q.vy *= -.3; } q.vx *= .5; q.vz *= .5; ny = q.y; if (get(Math.floor(nx), Math.floor(q.y), Math.floor(nz))) { nx = q.x; nz = q.z; } }
  q.x = nx; q.y = ny; q.z = nz; q.r += dt * 8; dObj.position.set(q.x, q.y, q.z); dObj.rotation.set(q.r, q.r * .7, 0); dObj.scale.setScalar(q.l > 0 ? Math.min(1, q.l * 2) : 0); dObj.updateMatrix(); dMesh.setMatrixAt(i, dObj.matrix); }
  if (any) dMesh.instanceMatrix.needsUpdate = true; }

// ---------------- combo ----------------
let comboN = 0, comboT = 0;
function comboHit() { comboN++; comboT = 2.2; if (comboN >= 3) { const c = $("combo"); c.textContent = `×${comboN} COMBO`; c.classList.remove("hit"); void c.offsetWidth; c.classList.add("hit", "show"); }
  if (comboN % 10 === 0) { stats.combos++; spawnOrbs(P.x + Math.sin(-P.yaw) * 1.5, P.y + 1.4, P.z - Math.cos(P.yaw) * 1.5, 2, 0xff4fd8); pop(`COMBO ×${comboN} ◆+2`, "#ff4fd8"); sfx.combo(comboN); } }
function updCombo(dt) { if (comboT > 0) { comboT -= dt; if (comboT <= 0) { comboN = 0; $("combo").classList.remove("show"); } } }

// ---------------- bosses (v0.9: toon 3D models, 3 phases, telegraphs, weak points, intro camera — see bosses.js) ----------------
const rugTex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 168; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 168); gr.addColorStop(0, "#3a0838"); gr.addColorStop(.5, "#6a1050"); gr.addColorStop(1, "#2a0628"); g.fillStyle = gr; g.fillRect(0, 12, 256, 144);
  g.strokeStyle = "#ffd24a"; g.lineWidth = 4; g.strokeRect(10, 20, 236, 128); g.lineWidth = 2; g.strokeStyle = "#ff4fd8";
  for (let x = 24; x < 240; x += 32) for (const y of [40, 128]) { g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 10, y); g.lineTo(x, y + 10); g.lineTo(x - 10, y); g.closePath(); g.stroke(); }
  g.strokeStyle = "rgba(255,210,74,.5)"; for (let x = 4; x < 256; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 14); g.moveTo(x, 154); g.lineTo(x, 168); g.stroke(); }
  g.font = "900 22px Orbitron,Verdana"; g.textAlign = "center"; g.fillStyle = "#ffd24a"; g.fillText("RUG", 50, 92); g.fillText("PULL", 206, 92);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const shotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "#fff"); r.addColorStop(.25, "#ff6a8a"); r.addColorStop(.6, "rgba(255,50,80,.5)"); r.addColorStop(1, "rgba(255,50,80,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const BOSSES = { rug: { name: "THE RUG PULLER", hp: 240, tag: "Blast its eye with your drill!", epi: "IT WEAVES. IT WAVES. IT YANKS.", ph: ["It sweeps low now: jump it or step aside", "It pulls the floor! FUD minions incoming"] },
  king: { name: "THE FUD KING", hp: 300, tag: "Zap the crowned cloud! Hit the crown gem", epi: "RULER OF RUMOURS", ph: ["It splits into FUD minions", "FUD STORM: lightning everywhere"] },
  whale: { name: "THE DUMP WHALE", hp: 320, tag: "It DIVES at you. Sidestep, then drill the blowhole!", epi: "BELLY-FLOP CHAMPION", ph: ["Every slam sends a wave: jump it", "Double dives! Stay light on your feet"] },
  fudder: { name: "THE TROGLODYTE FUDDER", hp: 420, tag: "Hit the snack bag on its belt!", epi: "KING OF THE COMMENT CAVE", ph: ["It summons FUD WOLVES", "RAGE MODE! It left the chair!"] } };
const BOSS_TXT = { rug: ["RUG BUSTED!", "IT'S PULLING THE RUG!", "THE RUG IS LOOSE!"], king: ["KING DETHRONED!", "THE KING IS SPLITTING!", "FUD STORM!"], whale: ["WHALE BEACHED!", "THE WHALE IS DUMPING!", "DOUBLE DIVE!"], fudder: ["FUDDER SILENCED!", "THE FUDDER IS TYPING…", "RAGE QUIT? NOPE. RAGE MODE!"] };
const BC = { scene, P, IS_TOUCH, rugTex, glowTex: shotTex, get, SX, SZ, BOSSES, BOSS_TXT, sfx, burst, debris, buzz, spawnOrbs,
  spawnFud: (x, y, z) => spawnFud(x, y, z), groundY: (x, z) => { const X = Math.max(0, Math.min(SX - 1, Math.floor(x))), Z = Math.max(0, Math.min(SZ - 1, Math.floor(z))); if (BX && BX.st.arena && BX.st.arena.floorY != null && Math.hypot(x - BX.st.arena.x, z - BX.st.arena.z) < BX.st.arena.r + 2) return BX.st.arena.floorY; return topH[X + Z * SX] + 1; },
  hurt: n => hurt(n), pop: (t, c) => pop(t, c), banner: (a, b) => banner(a, b), shake: v => { trauma = Math.max(trauma, v); }, roar: () => sfx.roar(boss.kind), gemGeo: id => GEM.pickupGeo(id),
  bar: () => updBossBar(), cine: (on, a, b) => cine(on, a, b),
  onWin: (kind, p) => { stats.kills++; stats["k_" + kind] = (stats["k_" + kind] | 0) + 1; stats.lastBoss = kind; charJoy = 1; const prize = 40 + 10 * stats.kills + (kind === "fudder" ? 60 : 0); banner(BOSS_TXT[kind][0], `◆+${prize} SOL shards (in-game) · next one is tougher`); sfx.win(); buzz(200); if (window.__fudderWin && kind === "fudder") window.__fudderWin(); save(); return prize; },
  onLose: (kind, silent) => { stats.lastBoss = kind; if (kind === "fudder") lairCd = 15; if (!silent) banner("IT GOT AWAY…", kind === "fudder" ? "Head back into the lair to try again" : "Summon it again from the ⚡ LAB"); } };
const BX = createBosses(THREE, BC), boss = BX.st;
function cine(on, a, b) { document.body.classList.toggle("cine", !!on); const el = $("bossCard"); if (!el) return; if (on) { el.querySelector("h3").textContent = a || ""; el.querySelector("p").textContent = b || ""; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); } else el.classList.remove("show"); }
function summonBoss(kind = "rug", o) { if (boss.on || mp.on) return false; if (!o) { if (upg.drill < 2) return false; if (kind === "king" && stats.kills < 1) return false; if (kind === "whale" && stats.kills < 2) return false; }
  if (!BX.summon(kind, stats.kills, o || {})) return false; sfx.sting(kind); setTimeout(() => sfx.roar(kind), 500); trauma = .5; buzz(120); return true; }
function updBossBar() { const bb = $("bossbar"); bb.classList.toggle("show", boss.on); if (!boss.on) return; $("bossFill").style.width = (100 * Math.max(0, boss.hp) / boss.max).toFixed(1) + "%"; $("bossLv").textContent = `${BOSSES[boss.kind].name} · LV ${stats.kills + 1}`;
  const ph = $("bossPh"); if (ph) ph.textContent = ["◆◇◇", "◆◆◇", "◆◆◆"][boss.phase - 1] + (boss.expose > 0 ? "  WEAK POINT OPEN!" : ""); bb.classList.toggle("weak", boss.expose > 0); }
function bossDamage(n, weak) { BX.damage(n, weak); }
function bossEnd(won, silent) { BX.end(won, silent); }
let LZ = null, lairCd = 0, lairMsg = 0, lairArmed = true;
function lairArena() { const dx = lair.x - lair.throne[0], dz = lair.z - lair.throne[1], d = Math.hypot(dx, dz) || 1; return { x: lair.x, z: lair.z, r: lair.r, floorY: lair.floorY, throne: [lair.throne[0] + dx / d * 1.6, lair.throne[1] + dz / d * 1.6] }; }
function lairTick(dt, time) { if (!lair.ent) return; if (!LZ) LZ = createLair(THREE, { scene, L: lair, toon: BX.toon, add: BX.add, glow: BX.glow, IS_TOUCH });
  const d = Math.hypot(P.x - lair.x, P.z - lair.z), inside = d < lair.r - .5 && P.y < lair.floorY + 6, dm = Math.hypot(P.x - lair.ent[0], P.z - lair.ent[2]);
  LZ.tick(time, d < lair.r + 22, dm, P.y < lair.floorY + 9 && d < lair.r + 6); lairCd -= dt; lairMsg -= dt; if (d > lair.r + 8 || P.y > lair.floorY + 9) lairArmed = true;
  if (inside && !stats.lair) { stats.lair = 1; banner("THE FUDDER'S LAIR", "Something is typing very loudly…"); save(); }
  // v0.9.2: entering the lair ALWAYS wakes the Fudder. (v0.9 silently refused without Drill MK II, or while another boss was still alive.)
  if (inside && lairCd <= 0 && lairArmed && !mp.on && !(boss.on && boss.kind === "fudder")) {
    if (boss.on) { if (boss.dying || boss.intro > 0) return; const nm = BOSSES[boss.kind] ? BOSSES[boss.kind].name : "THE BOSS"; bossEnd(false, true); pop(nm + " FLED · THE FUDDER WAKES", "#b8ff6a"); }
    const A = lairArena(); lairCd = 2; let ok = false;
    try { ok = summonBoss("fudder", { arena: A, at: [A.throne[0], lair.floorY, A.throne[1]] }); } catch (e) { console.warn("fudder summon failed", e); pop("THE FUDDER IS LOADING…", "#b8ff6a"); }
    if (ok) { lairArmed = false; if (upg.drill < 2 && lairMsg <= 0) { lairMsg = 60; setTimeout(() => pop("TIP: DRILL MK II (⚡ LAB) HITS HARDER", "#ffd24a"), 4500); } } } }
// lair compass: a top-of-screen waypoint to the cave mouth (or straight to the chamber once you're underground), until you've beaten the Fudder
function updLairNav() { const el = $("lairNav"); if (!el) return; const d0 = Math.hypot(P.x - lair.x, P.z - lair.z), inside = d0 < lair.r + 2 && P.y < lair.floorY + 8;
  const show = !!lair.ent && !boss.on && !mp.on && !inside && (stats.k_fudder | 0) < 1; el.classList.toggle("show", show); if (!show) return;
  const deep = topH[Math.floor(P.x) + Math.floor(P.z) * SX] > P.y + 3 || Math.hypot(P.x - lair.ent[0], P.z - lair.ent[2]) < 4, tg = deep ? [lair.x, lair.z] : [lair.ent[0], lair.ent[2]], dd = Math.hypot(tg[0] - P.x, tg[1] - P.z);
  const ang = Math.atan2(-(tg[0] - P.x), -(tg[1] - P.z)) - P.yaw; $("lairAr").style.transform = `rotate(${(-ang * 180 / Math.PI).toFixed(1)}deg)`; $("lairD").textContent = (deep ? "▼ " : "") + dd.toFixed(0) + "m"; }
let barT = 0, navT = 0; function updBoss(dt, time) { lairTick(dt, time); if ((navT -= dt) <= 0) { navT = .1; updLairNav(); } BX.update(dt, time); if (boss.on && (barT -= dt) <= 0) { barT = .2; updBossBar(); } }

// ---------------- ore scanner: points the way to what the current quest needs ----------------
const SCAN_IDS = { veins: [8, 9, 10, 18], prisms: [9], golds: [18], cores: [10] };
let scanT = 0, scanTgt = null;
function updScan(dt) { scanT -= dt; const q = qDef(Qi), el = $("scan"); let ids = SCAN_IDS[q.k]; if (met.crater && met.craterT > 0) ids = [9, 10];
  if (q.k === "fish" && !boss.on && fish.st === "idle") { let bq = null, bd = 1e9; for (const pq of pools) { const d = Math.hypot(pq.x - P.x, pq.z - P.z); if (d < bd) { bd = d; bq = pq; } } if (bq) { el.style.display = "block"; el.className = "hud"; const ang = Math.atan2(-(bq.x - P.x), -(bq.z - P.z)) - P.yaw; $("scanAr").style.transform = `rotate(${(-ang * 180 / Math.PI).toFixed(1)}deg)`; $("scanTx").textContent = `NEON POOL ${bd.toFixed(0)}m`; return; } }
  if (!ids || boss.on) { el.style.display = "none"; scanTgt = null; return; }
  if (scanT <= 0) { scanT = 1; scanTgt = null; let best = 1e9; const px = Math.floor(P.x), py = Math.floor(P.y + 1), pz = Math.floor(P.z), R0 = met.crater && met.craterT > 0 ? 22 : 14;
    for (let y = Math.max(1, py - R0); y <= Math.min(SY - 1, py + 6); y++) for (let z = Math.max(0, pz - R0); z <= Math.min(SZ - 1, pz + R0); z++) for (let x = Math.max(0, px - R0); x <= Math.min(SX - 1, px + R0); x++) {
      const id = world[idx(x, y, z)]; if (!id || !ids.includes(id)) continue; const d = (x - px) ** 2 + (y - py) ** 2 * 1.5 + (z - pz) ** 2; if (d < best) { best = d; scanTgt = [x + .5, y + .5, z + .5, id]; } } }
  if (!scanTgt) { el.style.display = "block"; el.className = "hud none"; $("scanTx").textContent = ids.includes(10) ? "SCANNER: DIG DEEPER" : "SCANNER: NOTHING NEAR, EXPLORE"; $("scanAr").style.transform = ""; return; }
  const dx = scanTgt[0] - P.x, dz = scanTgt[2] - P.z, dy = scanTgt[1] - (P.y + 1), d = Math.hypot(dx, dy, dz);
  const ang = Math.atan2(-dx, -dz) - P.yaw; el.style.display = "block"; el.className = "hud";
  $("scanAr").style.transform = `rotate(${(-ang * 180 / Math.PI).toFixed(1)}deg)`; $("scanTx").textContent = `${B[scanTgt[3]].name.replace(" VEIN", "")} ${d.toFixed(0)}m ${dy < -2 ? "▼" : dy > 2 ? "▲" : ""}`; }

// ---------------- biome toast + adaptive resolution ----------------
let biomeNow = "", bT = 0;
function bTick(dt) { bT -= dt; if (bT > 0) return; bT = .5; if (biomeNow === "MOON BASIN") stats.moon = 1; achTick(); cacheShimmer(); const b = topH[Math.floor(P.x) + Math.floor(P.z) * SX] > P.y + 3 ? "UNDERGROUND" : biomeName(P.x, P.z); if (b && b !== biomeNow) { biomeNow = b; lampT = b === "UNDERGROUND" ? 1 : 0; const el = $("biome"); el.textContent = b; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); } updHP(); }
let resT = 0, resN = 0, resLow = 0, resHigh = 0;
function adaptRes(dt) { if (Q.has("dpr") || !running) return; resT += dt; resN++; if (resT < 2) return; const f = resN / resT; resT = 0; resN = 0; const pr = renderer.getPixelRatio(), cap = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  if (f < 48) { resHigh = 0; if (++resLow >= 1 && pr > .75) { renderer.setPixelRatio(Math.max(.75, pr - .25)); resize(); } else if (pr <= .75 && f < 42 && resLow >= 3 && KIT.outline.visible) KIT.outline.visible = false; /* last step on weak phones: drop the ink outlines */ } else if (f > 58) { resLow = 0; if (!KIT.outline.visible && ++resHigh >= 4) { KIT.outline.visible = true; resHigh = 0; } else if (++resHigh >= 4 && pr < cap) { renderer.setPixelRatio(Math.min(cap, pr + .25)); resize(); resHigh = 0; } } }

// ---------------- first-minute: drop-in intro ----------------
let introDone = false;
let introFx = 0;
function intro() { introFx = 1; introDone = true; P.y = plaza.y + 26; P.vy = -2; P.pitch = -.35; banner("WELCOME TO THE $BOSS SANDBOX", "Dig, build, and bust the rug"); sfx.boost(); met.t = 28; save(); }
let wasAir = false;
function landCheck() { if (!P.ground) { if (P.vy < -14) wasAir = true; return; } if (wasAir) { wasAir = false; trauma = .7; buzz(60); burst(P.x, P.y + .1, P.z, [0x28dcff, 0xff4fd8, 0xffd24a, 0xffffff], IS_TOUCH ? 40 : 80, 7); sfx.land(22, get(Math.floor(P.x), Math.floor(P.y - .05), Math.floor(P.z))); } }

// ---------------- SOL meteors: the wow moment (first one ~28s into a new game, then every few minutes) ----------------
const met = { t: 9999, on: false, s: null, from: null, to: null, k: 0, crater: null, craterT: 0 };
const metMat = new THREE.SpriteMaterial({ map: null, color: 0xfff2b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
function launchMeteor() { const a = P.yaw + (Math.random() - .5) * .9, d = 11 + Math.random() * 6; let x = Math.round(P.x - Math.sin(a) * d), z = Math.round(P.z - Math.cos(a) * d);
  x = Math.max(4, Math.min(SX - 5, x)); z = Math.max(4, Math.min(SZ - 5, z)); if (Math.abs(x - plaza.x) < 8 && Math.abs(z - plaza.z) < 8) { x = Math.round(plaza.x + (x > plaza.x ? 9 : -9)); }
  const y = topH[x + z * SX] + .5; metMat.map = shotTex; met.s = new THREE.Sprite(metMat); met.s.scale.set(3, 3, 1); scene.add(met.s);
  met.to = new THREE.Vector3(x + .5, y, z + .5); met.from = met.to.clone().add(new THREE.Vector3(26, 46, -14)); met.k = 0; met.on = true;
  banner("SOL METEOR INCOMING!", "Look up! ☄️"); noise(2.4, 800, .12, .5); note(900, 2.4, "sawtooth", .03, -800, 0, null, 2000); }
function impactMeteor() { const c = met.to, cx = Math.floor(c.x), cy = Math.floor(c.y), cz = Math.floor(c.z), R = 2.7;
  for (let y = cy - 3; y <= cy + 3; y++) for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 3; x <= cx + 3; x++) { const d = Math.hypot(x - cx, (y - cy) * 1.2, z - cz); const id = get(x, y, z);
    if (d < R && id && id !== 11 && y > 0) setBlock(x, y, z, 0); }
  let ores = 0; for (let y = cy - 4; y <= cy; y++) for (let z = cz - 4; z <= cz + 4; z++) for (let x = cx - 4; x <= cx + 4; x++) { const d = Math.hypot(x - cx, (y - cy) * 1.2, z - cz), id = get(x, y, z);
    if (d >= R && d < R + 1.3 && id && id !== 11 && !B[id].drop) { const r = Math.random(); if (r < .45) { setBlock(x, y, z, 9); ores++; } else if (r < .7) setBlock(x, y, z, 8); } }
  const by = cy - 3; if (get(cx, by, cz) !== 11) setBlock(cx, by, cz, 10); else setBlock(cx, by + 1, cz, 10);
  for (let i = 0; i < 4; i++) setTimeout(() => burst(c.x + (Math.random() - .5) * 3, c.y + Math.random() * 2, c.z + (Math.random() - .5) * 3, [0xfff2b0, 0x14f195, 0x9945ff, 0xffffff], IS_TOUCH ? 40 : 90, 10), i * 90);
  debris(c.x, c.y + .5, c.z, 0x9945ff, 12); const dist = Math.hypot(c.x - P.x, c.z - P.z); trauma = Math.max(trauma, Math.max(.4, 1.2 - dist / 30)); buzz(150);
  noise(1.6, 180, .5, .4); note(55, 1.4, "sine", .3, -25); scene.remove(met.s); met.s = null; met.on = false; met.crater = [cx, cy, cz]; met.craterT = 120; stats.meteors = (stats.meteors || 0) + 1;
  met.t = 180 + Math.random() * 150; banner("METEOR LANDED!", "Mine the crater: SOL Prisms + a Core inside"); }
function updMeteor(dt) { if (mp.on) return; if (met.craterT > 0) met.craterT -= dt;
  if (!met.on) { met.t -= dt; if (met.t <= 0 && !boss.on) launchMeteor(); return; }
  met.k += dt / 2.6; const k = Math.min(1, met.k), e = k * k; met.s.position.lerpVectors(met.from, met.to, e); met.s.material.rotation += dt * 4;
  if (Math.random() < .9) burst(met.s.position.x, met.s.position.y, met.s.position.z, [0xfff2b0, 0xff4fd8, 0x9945ff], 3, 1.5);
  if (k >= 1) impactMeteor(); }

// ---------------- PAPER HANDS critters (daytime, harmless, flee; zap for shards) ----------------
const paperTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#f4f0ff"; g.strokeStyle = "#28dcff"; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 18); g.lineTo(82, 18); g.lineTo(98, 34); g.lineTo(98, 104); g.lineTo(30, 104); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#c8c0e8"; g.beginPath(); g.moveTo(82, 18); g.lineTo(82, 34); g.lineTo(98, 34); g.fill(); g.fillStyle = "#3a2a6a"; g.beginPath(); g.arc(50, 54, 6, 0, 7); g.arc(78, 54, 6, 0, 7); g.fill();
  g.strokeStyle = "#3a2a6a"; g.lineWidth = 3; g.beginPath(); g.arc(64, 82, 10, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.fillStyle = "#ffd0a0"; g.strokeStyle = "#ff4fd8"; g.lineWidth = 3; for (const x of [12, 116]) { g.beginPath(); g.ellipse(x, 66, 10, 13, 0, 0, 7); g.fill(); g.stroke(); }
  g.font = "900 11px Orbitron,Verdana"; g.textAlign = "center"; g.fillStyle = "#9945ff"; g.fillText("PAPER", 64, 100); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const diaTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.shadowColor = "#28dcff"; g.shadowBlur = 16;
  g.fillStyle = "#9ff6ff"; g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 12); g.lineTo(104, 46); g.lineTo(64, 110); g.lineTo(24, 46); g.closePath(); g.fill(); g.shadowBlur = 0; g.stroke();
  g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 46); g.lineTo(104, 46); g.moveTo(44, 46); g.lineTo(64, 12); g.lineTo(84, 46); g.lineTo(64, 110); g.lineTo(44, 46); g.stroke();
  g.fillStyle = "#1a2a5a"; g.beginPath(); g.arc(52, 58, 5, 0, 7); g.arc(76, 58, 5, 0, 7); g.fill(); g.strokeStyle = "#1a2a5a"; g.lineWidth = 3; g.beginPath(); g.arc(64, 70, 8, Math.PI * .15, Math.PI * .85); g.stroke();
  g.fillStyle = "#ffd0a0"; g.strokeStyle = "#28dcff"; for (const x of [14, 114]) { g.beginPath(); g.ellipse(x, 58, 10, 13, 0, 0, 7); g.fill(); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const diaMat = new THREE.SpriteMaterial({ map: diaTex, transparent: true });
const critMat = new THREE.SpriteMaterial({ map: paperTex, transparent: true }); const critters = []; let critT = 3;
function spawnCritter(force) { const a = Math.random() * 6.28, d = force ? 6 : 10 + Math.random() * 10; const x = Math.floor(Math.max(2, Math.min(SX - 3, P.x + Math.cos(a) * d))), z = Math.floor(Math.max(2, Math.min(SZ - 3, P.z + Math.sin(a) * d)));
  const y = topH[x + z * SX] + 1; if (y < 1 || y > SY - 3) return; const dia = force === "dia" || (force !== true && Math.random() < .18); const s = new THREE.Sprite(dia ? diaMat : critMat); s.scale.set(.9, .9, 1); s.position.set(x + .5, y + .45, z + .5); scene.add(s);
  critters.push({ dia, s, hp: dia ? .6 : .35, vy: 0, dir: Math.random() * 6.28, t: 0, hopT: Math.random() }); }
function zapCritter(c) { const p = c.s.position; burst(p.x, p.y, p.z, [0xf4f0ff, 0x28dcff, 0xff4fd8], IS_TOUCH ? 24 : 50, 5); scene.remove(c.s); critters.splice(critters.indexOf(c), 1);
  if (c.dia) { spawnOrbs(p.x, p.y, p.z, 8, 0x9ff6ff); stats.diamond = (stats.diamond || 0) + 1; banner("DIAMOND HANDS!", "Rare critter · ◆+8 SOL shards"); burst(p.x, p.y, p.z, [0x9ff6ff, 0xffffff], IS_TOUCH ? 30 : 60, 7); } else { spawnOrbs(p.x, p.y, p.z, 2, 0x28dcff); pop("PAPER HANDS SOLD ◆+2", "#28dcff"); } stats.paper = (stats.paper || 0) + 1; sfx.zap(); trauma = Math.max(trauma, .2); }
function introTick() { if (introFx === 1 && P.ground) { introFx = 2; const x = P.x, y = P.y, z = P.z; trauma = .9; buzz(120); sfx.win();
    for (let i = 0; i < 5; i++) setTimeout(() => { const a = i * 1.26; burst(x + Math.cos(a) * 4, y + 4 + i * .6, z + Math.sin(a) * 4, [0xffd24a, 0xff4fd8, 0x14f195, 0x28dcff], IS_TOUCH ? 34 : 70, 7); note(600 + i * 150, .15, "triangle", .05); }, 200 + i * 260);
    spawnOrbs(x, y + 1.5, z, 5, 0xffd24a); setTimeout(() => pop("◆ +5 WELCOME SHARDS (in-game only)", "#ffd24a"), 700);
    setTimeout(() => { if (!running) return; spawnCritter("dia"); pop("💎 A DIAMOND HANDS! ZAP IT FOR ◆+8", "#9ff6ff"); }, 7000);
    setTimeout(() => { if (!running || boss.on) return; let bd = 1e9; for (const q of pools) bd = Math.min(bd, Math.hypot(q.x - P.x, q.z - P.z)); if (bd < 40) pop(`🎣 NEON POOL ${bd.toFixed(0)}m AWAY · GO FISH`, "#28dcff"); }, 22000); } }
function updCritters(dt, night) { introTick(); if (mp.on || Q.has("nocrit")) return; critT -= dt; if (night < .5 && critters.length < 3 && critT <= 0) { spawnCritter(); critT = 7 + Math.random() * 6; }
  for (let i = critters.length - 1; i >= 0; i--) { const c = critters[i], p = c.s.position; c.t += dt; const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz);
    if (d > 40 || (night > .7 && Math.random() < dt * .3)) { scene.remove(c.s); critters.splice(i, 1); continue; }
    let sp = c.dia ? 1.6 : 1.2; if (d < (c.dia ? 6 : 4.5)) { c.dir = Math.atan2(dz, dx) + Math.sin(c.t * 3) * .7; sp = c.dia ? 3.3 : 2.6; } else if (Math.random() < dt * .4) c.dir += (Math.random() - .5) * 2;
    const nx = p.x + Math.cos(c.dir) * sp * dt, nz = p.z + Math.sin(c.dir) * sp * dt, gx = Math.floor(nx), gz = Math.floor(nz);
    if (gx < 1 || gz < 1 || gx >= SX - 1 || gz >= SZ - 1) { c.dir += Math.PI; continue; }
    const gy = topH[gx + gz * SX] + 1; if (gy - (p.y - .45) <= 1.2) { p.x = nx; p.z = nz; } else c.dir += 2;
    c.hopT -= dt; if (c.hopT <= 0) { c.hopT = .45 + Math.random() * .3; c.vy = sp > 2 ? 4.5 : 3; } c.vy -= 14 * dt; p.y += c.vy * dt;
    const floor = topH[Math.floor(p.x) + Math.floor(p.z) * SX] + 1.45; if (p.y < floor) { p.y = floor; c.vy = 0; } if (c.dia) c.s.material.color.setScalar(.85 + Math.sin(c.t * 8) * .15); c.s.scale.x = .9 * (c.vy > 0 ? .9 : 1.05); }
}

// ---------------- daily quest (local only, rotates by your device's date, streaks) ----------------
const daily = { key: "", base: {}, done: false, streak: 0, last: "" };
const DPOOL = [ { t: "Mine 3 BOSS Gold veins", k: "golds", n: 3 }, { t: "Zap 3 Paper Hands", k: "paper", n: 3 }, { t: "Bust a boss", k: "kills", n: 1 }, { t: "Mine 60 tiles", k: "mined", n: 60 },
  { t: "Hit a ×10 combo twice", k: "combos", n: 2 }, { t: "Mine 2 SOL Prism veins", k: "prisms", n: 2 }, { t: "Zap 4 FUD wolves", k: "fud", n: 4 }, { t: "Build 25 pieces", k: "placed", n: 25 }, { t: "Mine 12 SOL veins", k: "veins", n: 12 }, { t: "Catch 3 fish", k: "fish", n: 3 }, { t: "Zap a Diamond Hands", k: "diamond", n: 1 }, { t: "Catch 2 fish at night", k: "fish", n: 2 } ];
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function dailyDef() { let h = 0; for (const ch of daily.key) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0; return DPOOL[h % DPOOL.length]; }
function dailyEnsure() { const k = todayKey(); if (daily.key === k) return; daily.key = k; daily.done = false; daily.base = {}; for (const s in stats) daily.base[s] = stats[s] || 0; }
function dailyVal() { const q = dailyDef(); return Math.max(0, Math.min(q.n, (stats[q.k] || 0) - (daily.base[q.k] || 0))); }
function dailyReward() { return 20 + Math.min(6, daily.streak) * 5; }
function dailyLine() { if (mp.on) return ""; dailyEnsure(); const q = dailyDef(); return daily.done ? `☀ DAILY DONE · streak ${daily.streak} · new one tomorrow` : `☀ DAILY: ${q.t} ${dailyVal()}/${q.n} · ◆+${dailyReward()}`; }
function dailyTick() { bcTick(); if (mp.on) return; dailyEnsure(); if (!daily.done && dailyVal() >= dailyDef().n) { const y = new Date(Date.now() - 864e5), yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    daily.streak = daily.last === yk ? daily.streak + 1 : 1; daily.last = daily.key; const r = dailyReward(); daily.done = true; shards += r; updShards(); banner("DAILY COMPLETE!", `◆+${r} · streak ${daily.streak} 🔥`); sfx.quest(); save(); } updDaily(); }

// ---------------- screenshot: saves a PNG on this device (never uploaded) ----------------
let wantShot = false, lastShotInfo = null;
function takeShot() { wantShot = false; try { const w = canvas.width, h = canvas.height, c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); if (photo && FILTERS[filtI][1] && "filter" in g) g.filter = FILTERS[filtI][1]; g.drawImage(canvas, 0, 0); g.filter = "none";
    const u = Math.max(1, w / 900); g.fillStyle = "rgba(8,6,24,.7)"; g.fillRect(0, h - 44 * u, w, 44 * u); g.font = `900 ${18 * u}px Orbitron,Verdana`; g.fillStyle = "#ffd24a"; g.textBaseline = "middle"; g.fillText("$BOSS SANDBOX", 14 * u, h - 22 * u);
    g.font = `700 ${11 * u}px Orbitron,Verdana`; g.fillStyle = "#cfefff"; g.textAlign = "right"; g.fillText(`◆ ${shards} SOL shards (in-game only) · Drill MK ${["", "I", "II", "III", "IV"][upg.drill]} · ${stats.kills} bosses busted`, w - 14 * u, h - 22 * u);
    const url = c.toDataURL("image/png"); lastShotInfo = { w, h, bytes: url.length, filter: photo ? FILTERS[filtI][0] : "" }; if (photo) stats.photoSnaps = (stats.photoSnaps | 0) + 1; lastShot = { url, c }; const d = new Date(), name = `boss-sandbox-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}.png`;
    if (!window.__SB_TEST) { const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
    const f = $("flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); noise(.08, 5000, .15, 1); note(1800, .05, "square", .03); pop(IS_TOUCH ? "📸 SAVED · tap SHARE to send it" : "📸 SAVED · press J to share", "#fff"); showShare(); } catch (e) { pop("SCREENSHOT FAILED", "#ff6a8a"); } }
let lastShot = null, shareT = 0;
function showShare() { const b = $("shareBtn"); b.classList.add("show"); clearTimeout(shareT); shareT = setTimeout(() => b.classList.remove("show"), 7000); }
async function shareShot() { if (!lastShot) return; const name = "boss-sandbox.png"; try { const blob = await new Promise(r => lastShot.c.toBlob(r, "image/png")); const file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "$BOSS Sandbox", text: "My $BOSS Sandbox moment 🎮" }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = lastShot.url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); pop("SHARING NOT SUPPORTED · SAVED INSTEAD", "#fff"); }
$("shareBtn").addEventListener("click", e => { e.stopPropagation(); $("shareBtn").classList.remove("show"); if (!window.__SB_TEST) shareShot(); else window.__shared = (window.__shared | 0) + 1; });
$("shotBtn").addEventListener("click", e => { e.stopPropagation(); if (running) wantShot = true; });

// ---------------- title screen: slow orbit cam behind the menu + stats ----------------
let menuA = 0;
function menuCam(dt) { menuA += dt * .06; }
function menuStats() { const el = $("mStats"); if (!el) return; const any = stats.mined > 0 || shards > 0;
  el.innerHTML = any ? `<div><b>◆ ${shards}</b>SOL shards</div><div><b>MK ${["", "I", "II", "III", "IV"][upg.drill]}</b>drill</div><div><b>${stats.kills}</b>bosses busted</div><div><b>${daily.streak || 0}🔥</b>daily streak</div><div><b>🏆 ${Object.keys(ach).length}/${ACH.length}</b>achievements</div>` : "";
  $("playBtn").textContent = running || !any ? ($("playBtn").textContent === "RESUME" ? "RESUME" : "PLAY") : "CONTINUE"; $("dailyM").textContent = dailyLine(); $("buildM").textContent = bcLine(); $("lookV").textContent = Math.round(lookMul * 100) + "%"; }
$("lookDn").addEventListener("click", () => { lookMul = Math.max(.4, +(lookMul - .1).toFixed(2)); menuStats(); save(); });
$("lookUp").addEventListener("click", () => { lookMul = Math.min(2.2, +(lookMul + .1).toFixed(2)); menuStats(); save(); });
$("howBtn").addEventListener("click", () => $("how").classList.toggle("open"));

// ---------------- NEON POOLS + FISHING (cast, bite timing, hold-to-reel minigame) ----------------
// v0.9 water: layered ripples (normal-mapped from moving waves + rings around a swimmer), fresnel sky reflection, sun glint,
// deep-to-shallow tint, soft foam at the shore, fog. Still one plane per pool.
const waterU = { uT: { value: 0 }, uNight: { value: 0 }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uTop: skyU.uTop, uHor: skyU.uHor, uFogC: { value: new THREE.Color() }, uFogN: { value: 20 }, uFogF: { value: 60 }, uRip: { value: new THREE.Vector4(0, 0, -99, 0) } };
const waterMat = new THREE.ShaderMaterial({ uniforms: waterU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vU; varying vec3 vW; varying float vD; void main(){ vU = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix*w; vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform float uT, uNight, uFogN, uFogF; uniform vec3 uSun, uTop, uHor, uFogC; uniform vec4 uRip; varying vec2 vU; varying vec3 vW; varying float vD;
    vec2 wave(vec2 p, vec2 d, float f, float s, float a){ float ph = dot(p, d) * f + uT * s; return d * cos(ph) * f * a; }
    void main(){ vec2 c = vU*2.0-1.0; float r = length(c); if (r > 1.0) discard; vec2 p = vW.xz;
      vec2 g = wave(p, normalize(vec2(1., .3)), 2.3, 1.7, .05) + wave(p, normalize(vec2(-.4, 1.)), 3.1, -1.3, .035) + wave(p, normalize(vec2(.7, -.7)), 5.3, 2.6, .018) + wave(p, normalize(vec2(-.9, -.2)), 8.7, 3.4, .008);
      float age = uT - uRip.z; if (age > 0. && age < 4.) { vec2 dv = p - uRip.xy; float dd = length(dv) + 1e-3; float ring = sin(dd * 9. - age * 7.) * exp(-dd * 1.1) * exp(-age * .9) * uRip.w; g += dv / dd * ring * .5; }
      vec3 N = normalize(vec3(-g.x, 1., -g.y)); vec3 V = normalize(cameraPosition - vW); float fr = .04 + .96 * pow(1. - max(dot(N, V), 0.), 4.);
      vec3 R = reflect(-V, N); vec3 sky = mix(uHor, uTop, smoothstep(0., .6, R.y)); vec3 L = normalize(uSun); float spec = pow(max(dot(R, L), 0.), 120.) * smoothstep(-.05, .15, L.y) * 2.2;
      vec3 deep = vec3(.0, .035, .11), shallow = vec3(.01, .19, .28);
      vec3 col = mix(shallow, deep, smoothstep(.95, .35, r)); float lit = .75 + .35 * dot(N, normalize(vec3(L.x, 1., L.z))); col = mix(col * lit, sky * vec3(.75, .9, 1.), fr * .42) + vec3(1., .95, .85) * spec;
      float foam = smoothstep(.91, 1., r + (sin(atan(c.y, c.x) * 9. + uT * 1.5) * .02 + sin(p.x * 7. + uT * 2.) * .015)); col = mix(col, vec3(.85, .97, 1.), foam * .55);
      col += vec3(.1, .6, .9) * uNight * .25 * (1. - r);
      float a = mix(.86, .97, fr) + foam * .2; col = mix(col, uFogC, smoothstep(uFogN, uFogF, vD)); gl_FragColor = vec4(col, min(1., a));
      #include <colorspace_fragment>
    }` });
const poolMeshes = [];
function buildPools() { for (const m of poolMeshes) { scene.remove(m); m.geometry.dispose(); } poolMeshes.length = 0;
  for (const q of pools) { const m = new THREE.Mesh(new THREE.PlaneGeometry(q.rx * 2, q.rz * 2), waterMat); m.rotation.x = -Math.PI / 2; m.position.set(q.x, q.y, q.z); m.renderOrder = 2; scene.add(m); poolMeshes.push(m); } }
const inPool = (x, z) => pools.find(q => ((x - q.x) / q.rx) ** 2 + ((z - q.z) / q.rz) ** 2 < 1);
const FISH = [
  { n: "NEON MINNOW", v: 1, w: 60, sp: .5, er: .2, c: "#28dcff", r: "COMMON" }, { n: "PUMP KOI", v: 3, w: 26, sp: .75, er: .35, c: "#ff4fd8", r: "COMMON" },
  { n: "CANDLE EEL", v: 4, w: 13, sp: 1.05, er: .8, c: "#28ff8c", r: "UNCOMMON" }, { n: "SHARD SNAPPER", v: 6, w: 8, sp: 1.15, er: .5, c: "#c69bff", r: "RARE" },
  { n: "RUG RAY", v: 12, w: 3, sp: 1.35, er: 1.1, c: "#ff6a8a", r: "EPIC", night: 2 }, { n: "GOLDEN BOSS FISH", v: 30, w: .7, sp: 1.6, er: 1.4, c: "#ffd24a", r: "LEGENDARY", rodW: 1.2 },
  { n: "FROST PIKE", v: 5, w: 9, sp: .95, er: .6, c: "#a8e8ff", r: "ZONE · UNCOMMON", z: "FROST CHAIN" }, { n: "DUNE GULPER", v: 5, w: 9, sp: .9, er: .5, c: "#ff7ab8", r: "ZONE · UNCOMMON", z: "PUMP DUNES" },
  { n: "SIGNAL SQUID", v: 6, w: 8, sp: 1.0, er: .9, c: "#3cffc8", r: "ZONE · RARE", z: "SIGNAL GROVE" }, { n: "MOON JELLY", v: 8, w: 7, sp: .7, er: 1.2, c: "#e0d0ff", r: "ZONE · RARE", z: "MOON BASIN", night: 2 },
  { n: "GLITCH GUPPY", v: 7, w: 7, sp: 1.25, er: 1.5, c: "#ff2ad4", r: "ZONE · RARE", z: "GLITCH WASTES" }, { n: "CIRCUIT CARP", v: 4, w: 10, sp: .8, er: .4, c: "#28dcff", r: "ZONE · UNCOMMON", z: "NEON FLATS" } ];
const fish = { st: "idle", t: 0, bob: null, pool: null, sp: null, f: .5, fv: 0, z: .4, zv: 0, prog: .3, wasDown: false, dex: {} };
const bobMat = new THREE.SpriteMaterial({ map: null, color: 0xff4fd8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]); const fLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xcfefff, transparent: true, opacity: .7, fog: false })); fLine.frustumCulled = false; fLine.visible = false; scene.add(fLine);
let poolHit = null;
function aimPool() { poolHit = null; if (fish.st !== "idle" || tmpD.y > -0.02) return; const maxT = hit ? hit.t : 14;
  for (const q of pools) { const t = (q.y - tmpV.y) / tmpD.y; if (t <= 0 || t > Math.min(maxT + 1.2, 14)) continue; const x = tmpV.x + tmpD.x * t, z = tmpV.z + tmpD.z * t;
    if (((x - q.x) / q.rx) ** 2 + ((z - q.z) / q.rz) ** 2 < 1) { poolHit = { q, x, z }; hit = null; return; } } }
function rollFish(night, zone) { const rod = upg.rod || 1, ws = FISH.map((f, i) => (f.z ? (f.z === zone ? 1 : 0) : 1) * f.w * (i >= 2 ? 1 + (rod - 1) * .6 : 1) * (night > .6 && f.night ? f.night : 1) * (f.rodW ? Math.pow(f.rodW, rod) * (rod - 1 + .5) : 1));
  let r = Math.random() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < FISH.length; i++) { r -= ws[i]; if (r <= 0) return FISH[i]; } return FISH[0]; }
function fishEnd(msg, col) { fish.st = "idle"; if (fish.bob) { scene.remove(fish.bob); fish.bob = null; } fLine.visible = false; $("reel").classList.remove("show"); if (msg) pop(msg, col || "#cfefff"); }
// returns true when fishing owns the MINE input this frame
function updFishing(dt, night, time) { const down = input.mine, press = down && !fish.wasDown; fish.wasDown = down; const rod = upg.rod || 1;
  if (fish.st === "idle") { if (poolHit && press) { bobMat.map = shotTex; fish.bob = new THREE.Sprite(bobMat); fish.bob.scale.set(.35, .35, 1); fish.bob.position.set(poolHit.x, poolHit.q.y + .05, poolHit.z); scene.add(fish.bob);
      fish.pool = poolHit.q; fish.st = "wait"; fish.t = (2 + Math.random() * 4) / (1 + (rod - 1) * .4); sfx.cast(poolHit.x, poolHit.q.y, poolHit.z); fLine.visible = true; burst(poolHit.x, poolHit.q.y, poolHit.z, [0x28dcff, 0xffffff], 10, 2); stats.casts = (stats.casts || 0) + 1; return true; }
    return poolHit != null && down; }
  const b = fish.bob.position; dTip.getWorldPosition(tmpV); const la = lineGeo.attributes.position; la.setXYZ(0, tmpV.x, tmpV.y, tmpV.z); la.setXYZ(1, b.x, b.y, b.z); la.needsUpdate = true;
  if (Math.hypot(b.x - P.x, b.z - P.z) > 16) { fishEnd("LINE SNAPPED (TOO FAR)", "#ff6a8a"); return false; }
  if (fish.st === "wait") { b.y = fish.pool.y + .05 + Math.sin(time * 3) * .03; fish.t -= dt; if (press) { fishEnd("REELED IN EARLY", "#cfefff"); return true; }
    if (fish.t <= 0) { fish.st = "bite"; fish.t = .95 + (rod - 1) * .25; fish.sp = rollFish(ev.k === "aurora" ? 1 : night, biomeName(fish.pool.x, fish.pool.z)); pop("❗ BITE! TAP NOW", "#ffd24a"); sfx.bite(b.x, b.y, b.z); buzz(40); burst(b.x, b.y, b.z, [0x28dcff, 0xffffff], 14, 3); trauma = Math.max(trauma, .15); } return true; }
  if (fish.st === "bite") { b.y = fish.pool.y - .12 + Math.sin(time * 30) * .05; fish.t -= dt; if (press) { fish.st = "reel"; fish.f = .5; fish.fv = 0; fish.z = .4; fish.zv = 0; fish.prog = .3; $("reel").classList.add("show"); $("reelFish").style.background = fish.sp.c; return true; }
    if (fish.t <= 0) { fishEnd("TOO SLOW · IT SWAM OFF", "#ff6a8a"); } return true; }
  if (fish.st === "reel") { const sp = fish.sp, zw = .29 + (rod - 1) * .06, fE = (stats.fish | 0) < 1 ? .55 : (stats.fish | 0) < 4 ? .8 : 1;
    // fish: wanders, darts more for rarer fish
    if (Math.random() < dt * (1 + sp.er * 2)) fish.fv = (Math.random() - .5) * 2.2 * sp.sp; fish.f += fish.fv * dt * fE; if (fish.f < .03 || fish.f > .97) { fish.fv *= -1; fish.f = Math.max(.03, Math.min(.97, fish.f)); }
    // zone: hold to push right, release drifts left (touch friendly: one button)
    fish.zv += (down ? 2.6 : -2.2) * dt; fish.zv *= Math.pow(.15, dt); fish.z += fish.zv * dt; if (fish.z < 0) { fish.z = 0; fish.zv = 0; } if (fish.z > 1 - zw) { fish.z = 1 - zw; fish.zv = 0; }
    const inZ = fish.f >= fish.z && fish.f <= fish.z + zw; fish.prog += (inZ ? .34 : -.15 * fE) * dt * (1.15 - sp.sp * .15);
    $("reelZone").style.left = (fish.z * 100).toFixed(1) + "%"; $("reelZone").style.width = (zw * 100).toFixed(0) + "%"; $("reelZone").classList.toggle("on", inZ); $("reelFish").style.left = (fish.f * 100).toFixed(1) + "%"; $("reelProg").style.width = (Math.max(0, Math.min(1, fish.prog)) * 100).toFixed(0) + "%";
    b.x += (Math.random() - .5) * dt * 2; b.z += (Math.random() - .5) * dt * 2; b.y = fish.pool.y - .05 + Math.sin(time * 18) * .04; if (Math.random() < dt * 8) burst(b.x, b.y, b.z, [0x28dcff], 1, 1.5);
    if ((reelT -= dt) <= 0) { reelT = down ? .05 : .11; sfx.reel(down, fish.prog, inZ); }
    if (fish.prog >= 1) { stats.fish = (stats.fish || 0) + 1; charJoy = 1; fish.dex[sp.n] = (fish.dex[sp.n] || 0) + 1; spawnOrbs(b.x, b.y + .3, b.z, sp.v, parseInt(sp.c.slice(1), 16)); banner(`CAUGHT: ${sp.n}`, `${sp.r} · ◆+${sp.v} SOL shards${fish.dex[sp.n] === 1 ? " · NEW IN FISHDEX!" : ""}`);
      burst(b.x, b.y + .3, b.z, [parseInt(sp.c.slice(1), 16), 0xffffff, 0x28dcff], IS_TOUCH ? 30 : 60, 6); sfx.catchFish(sp.v, b.x, b.y, b.z); trauma = Math.max(trauma, sp.v >= 12 ? .6 : .25); buzz(60); fishEnd(); save(); }
    else if (fish.prog <= 0) fishEnd(`${sp.n} GOT AWAY`, "#ff6a8a"); return true; }
  return false; }
function updWater(dt, time, night) { waterU.uT.value = time; waterU.uNight.value = night; waterU.uSun.value.copy(skyU.uSun.value); waterU.uFogC.value.copy(scene.fog.color); waterU.uFogN.value = scene.fog.near; waterU.uFogF.value = scene.fog.far;
  if (P.wet && running && (Math.hypot(P.vx, P.vz) > .5 || Math.abs(P.vy) > 1) && time - waterU.uRip.value.z > .55) waterU.uRip.value.set(P.x, P.z, time, 1); }

// ---------------- characters ($BOSS runner + holder skins) and camera views ----------------
const CHARS = [
  ["base_climb", "Cave Climber", 0], ["base_factory", "Factory Worker", 0], ["base_grave", "Pumpkin Head", 0], ["base_moon", "Astronaut", 0], ["base_surf", "Surfer", 0],
  ["h_fudder", "Troglodyte Fudder", 1], ["h_pumpkin", "Pumpkin King", 1], ["h_reaper", "Grim Reaper", 1], ["h_hardhat", "Gold Foreman", 1], ["h_gearcrown", "Molten Mech", 1], ["h_moonhalo", "Moon Walker", 1],
  ["h_liftoff", "Rocketeer", 1], ["h_sharkfin", "Shark Surfer", 1], ["h_tidal", "Tide King", 1], ["h_fossil", "Cave Chief", 1], ["h_volcano", "Lava Warlord", 1],
  ["m_survivor_3", "3-Round Survivor", 2], ["m_survivor_5", "5-Round Survivor", 2], ["m_survivor_10", "10-Round Survivor", 2], ["m_slayer_ohio", "Boss Slayer: Ohio", 2], ["m_slayer_moon", "Boss Slayer: Moon", 2], ["m_score_50k", "High Score 50K", 2] ];
let charId = "h_fudder", view = 1; const VIEWS = ["FIRST-PERSON", "THIRD-PERSON", "SELFIE"];
const charMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: .05 }); const charSpr = new THREE.Sprite(charMat); charSpr.scale.set(2.1, 2.1, 1); charSpr.visible = false; scene.add(charSpr);
const rimMat = new THREE.SpriteMaterial({ color: 0x28dcff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }); const rimSpr = new THREE.Sprite(rimMat); rimSpr.visible = false; scene.add(rimSpr);
const shTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(0,0,0,.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const shadowM = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false })); shadowM.rotation.x = -Math.PI / 2; shadowM.visible = false; scene.add(shadowM);
let chSq = 0, chWasG = true, chFace = 1;
const texLoader = new THREE.TextureLoader(), charTex = {}, charThumb = {};
const loadCharTex = id => charTex[id] || (charTex[id] = texLoader.load(`../assets/chars/${id}.webp`, tt => { tt.colorSpace = THREE.SRGBColorSpace; }));
function setChar(id, quiet) { if (!CHARS.find(c => c[0] === id)) id = "h_fudder"; charId = id; if (!RIG) { const t = loadCharTex(id); charMat.map = t; charMat.needsUpdate = true; rimMat.map = t; rimMat.needsUpdate = true; } else wantThumb(id, true); { const cc = CHARS.find(c => c[0] === id); rimMat.color.setHex(cc && cc[2] === 1 ? 0xffd24a : cc && cc[2] === 2 ? 0xc69bff : 0x28dcff); } const hero = $("charHero"); if (hero) { if (charThumb[id] || !RIG) hero.src = charThumb[id] || `../assets/chars/${id}.webp`; hero.classList.toggle("r3", !!charThumb[id]); } const se = document.querySelector(`#chars .ch[data-id="${id}"]`), ce = $("chars"); if (se && ce && quiet) ce.scrollLeft = Math.max(0, se.offsetLeft - ce.offsetLeft - ce.clientWidth / 2 + se.offsetWidth / 2); document.querySelectorAll("#chars .ch").forEach(e => e.classList.toggle("sel", e.dataset.id === id)); const c = CHARS.find(c => c[0] === id); $("charName").textContent = c[1] + (c[2] === 1 ? " · HOLDER SKIN" : c[2] === 2 ? " · MEDAL SKIN" : ""); if (!quiet) { sfx.click(); save(); } }
function buildCharPicker() { const el = $("chars"); el.innerHTML = ""; for (const [id, nm, k] of CHARS) { const b = document.createElement("button"); b.type = "button"; b.className = "ch" + (k ? " h" + k : ""); b.dataset.id = id; b.title = nm; b.innerHTML = RIG ? `<img alt="${nm}">` : `<img src="../assets/chars/${id}.webp" alt="${nm}" loading="lazy">`; b.addEventListener("click", () => setChar(id)); el.appendChild(b); }
  if (RIG) { if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { wantThumb(e.target.dataset.id); io.unobserve(e.target); } }, { root: el, rootMargin: "0px 140px" }); el.querySelectorAll(".ch").forEach(b => io.observe(b)); } else CHARS.forEach(c => wantThumb(c[0])); } }
function cycleView() { view = (view + 1) % 3; pop("VIEW: " + VIEWS[view], "#28dcff"); sfx.click(); save(); }
const camOff = new THREE.Vector3();
// v0.8: real 3D low-poly characters. Rounded, stylized bodies (capsules + spheres, flat-shaded) with an inverted-hull neon outline.
// Each $BOSS skin is analysed at runtime: its head and outfit are cropped from the art onto curved decals (face + chest), and the
// body, sleeve, leg and shoe colours are sampled from the matching regions of the art, so every skin stays recognizable. ?flatchar = old billboard.
const RIG = !Q.has("flatchar"), rig = new THREE.Group(); rig.visible = false; scene.add(rig);
// v0.9: hand-tuned toon characters (chars3d.js) replace the v0.8 decal mannequins. Elbows, knees, painted expressive faces, headgear, props, capes.
const KIT = createCharKit(THREE); let CM = null, rigFor = "", rigYaw = 0, mineT3 = 0, blinkT = 2.5, hurtT = 0, lastHp = 10;
const rimHex = id => { const c = CHARS.find(c => c[0] === id); return c && c[2] === 1 ? 0xffc23a : c && c[2] === 2 ? 0xb88bff : 0x28dcff; };
function dressFor(id, live) { if (CM) { rig.remove(CM.root); CM.dispose(); } CM = KIT.build(id, { lite: IS_TOUCH }); rig.add(CM.root); rigFor = id; KIT.rim.uRim.value.setHex(rimHex(id)); if (live) rig.userData.info = CM.root.userData.info; return true; }
function dressRig() { if (rigFor !== charId) dressFor(charId, true); }
// picker thumbnails: built from the same generator, rendered once by a small temporary transparent renderer, then thrown away
let thumbQ = [], TR = null, TRS = null, TRC = null, thumbIdle = 0; const TSZ = 192;
function wantThumb(id, first) { if (!RIG || charThumb[id] || thumbQ.includes(id)) return; first ? thumbQ.unshift(id) : thumbQ.push(id); }
function renderRigPNG(id, size, yaw = .42, pose) {
  if (!TR) { const c = document.createElement("canvas"); TR = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true }); TR.setPixelRatio(1); TR.outputColorSpace = THREE.SRGBColorSpace; TR.setClearColor(0x000000, 0);
    TRS = new THREE.Scene(); TRS.add(new THREE.HemisphereLight(0xe8f0ff, 0x4a3a6a, 1.7)); const k = new THREE.DirectionalLight(0xffffff, 2.0); k.position.set(2, 3, 4); TRS.add(k); const r = new THREE.DirectionalLight(0x9fdcff, .9); r.position.set(-3, 2, -2); TRS.add(r);
    TRC = new THREE.PerspectiveCamera(30, 1, .1, 30); TRC.position.set(0, 1.25, 4.7); TRC.lookAt(0, 1.08, 0); }
  if (TR.domElement.width !== size) TR.setSize(size, size, false);
  const J = KIT.build(id), rc = KIT.rim.uRim.value.getHex(); KIT.rim.uRim.value.setHex(rimHex(id)); J.root.rotation.y = yaw; posePreview(J, pose); TRS.add(J.root);
  TR.render(TRS, TRC); const url = TR.domElement.toDataURL("image/png"); TRS.remove(J.root); J.dispose(); KIT.rim.uRim.value.setHex(rc); return url; }
function posePreview(J, pose) { J.armL.rotation.set(.05, 0, -.18); J.armR.rotation.set(J.sp.prop ? -.35 : .05, 0, .18); J.elbowL.rotation.x = -.25; J.elbowR.rotation.x = J.sp.prop ? -.6 : -.25; J.legL.rotation.x = .08; J.legR.rotation.x = -.08; J.kneeL.rotation.x = .12; J.kneeR.rotation.x = .05;
  if (J.sp.propHand === "L") { J.armL.rotation.set(-.5, 0, -.25); J.elbowL.rotation.x = -.8; J.armR.rotation.set(.05, 0, .18); J.elbowR.rotation.x = -.25; }
  if (pose === "happy") J.setExpr("happy"); }
function thumbTick(dt) { if (!thumbQ.length) { if (TR && (thumbIdle += dt) > 4) { TR.dispose(); TR.forceContextLoss(); TR = TRS = TRC = null; } return; } thumbIdle = 0; let made = 0;
  while (thumbQ.length && made < (running ? 1 : 2)) { const id = thumbQ.shift(), url = renderRigPNG(id, TSZ); charThumb[id] = url; made++;
    const im = document.querySelector(`#chars .ch[data-id="${id}"] img`); if (im) { im.src = url; im.parentNode.classList.add("r3"); }
    if (id === charId) { const hero = $("charHero"); if (hero) { hero.src = url; hero.classList.add("r3"); } } } }
function updRig(time, mv, air) { dressRig(); const J = CM; if (!J) return; const dt = applyView.dt || .016, moving = photo ? 0 : Math.hypot(P.vx, P.vz), mining = photo ? POSES[poseI] === "MINE" : (input.mine || isFiring) && running;
  mineT3 = mining ? mineT3 + dt : 0; let tgt; const back = (P.vx * Math.sin(P.yaw) + P.vz * Math.cos(P.yaw)) > moving * .35; if (mining) tgt = P.yaw + Math.PI; else if (moving > .8 && !(view === 1 && back)) tgt = Math.atan2(P.vx, P.vz); else tgt = P.yaw + Math.PI;
  if (photo) tgt = rigYaw; let da = tgt - rigYaw; da = Math.atan2(Math.sin(da), Math.cos(da)); rigYaw += da * Math.min(1, dt * (moving > .8 || mining ? 10 : 4));
  rig.rotation.y = rigYaw + (charJoy > 0 ? (1 - charJoy) * Math.PI * 4 : 0); const ph = bob * 1.6, sw = Math.sin(ph) * mv, breath = Math.sin(time * 2.2) * (1 - mv);
  J.hips.position.y = J.hipY + Math.abs(Math.cos(ph)) * .05 * mv + breath * .008 - chSq * .18; J.chest.rotation.set(.1 * mv + (mining ? .16 : 0) - chSq * .3, sw * .16, 0); J.torso.scale.y = .58 * (1 + breath * .02);
  J.headG.rotation.z = Math.sin(time * .7) * .05 * (1 - mv); J.headG.rotation.x = photo ? 0 : Math.max(-.35, Math.min(.35, -P.pitch * .35)) - J.chest.rotation.x * .5 + Math.sin(time * 1.4) * .025 * (1 - mv);
  let aL = -sw * .8, aR = sw * .8, zL = -.14 - .06 * (1 - mv), zR = .14 + .06 * (1 - mv), eL = -.25 - Math.max(0, -sw) * .7, eR = -.25 - Math.max(0, sw) * .7, ezL = 0, ezR = 0, lL = sw * .75, lR = -sw * .75;
  let kL = .08 + mv * (.2 + .7 * Math.max(0, Math.sin(ph + 1.3))), kR = .08 + mv * (.2 + .7 * Math.max(0, Math.sin(ph + 1.3 + Math.PI)));
  if (!P.ground) { aL = aR = -2.3; zL = -.5; zR = .5; eL = eR = -.6; lL = -.7; lR = .25; kL = 1.1; kR = .6; } else if (moving < .3) { aL = Math.sin(time * 1.1) * .04; aR = -aL; }
  kL += chSq * 2.2; kR += chSq * 2.2; lL -= chSq * 1.1; lR -= chSq * 1.1;
  if (mining) { const hm = Math.abs(Math.sin(mineT3 * 13)); aR = -1.75 - hm * .8; zR = .12; eR = -.35 - hm * .9; aL = -.6; eL = -.9; }
  if (J.sp.propHand === "L" && !mining && P.ground && !photo) { aL = Math.min(aL, -.45); eL = -.9; }
  if (charJoy > 0) { aL = aR = -2.7; zL = -.6; zR = .6; eL = eR = -.2; }
  if (photo) { const po = POSES[poseI]; if (po === "WAVE") { aR = -.2; zR = 2.5 + Math.sin(time * 8) * .3; ezR = .6 + Math.sin(time * 8) * .4; eR = 0; } else if (po === "CHEER") { aL = aR = -2.7; zL = -.65; zR = .65; eL = eR = -.15; } else if (po === "FLEX") { aL = aR = 0; zL = -1.45; zR = 1.45; eL = eR = 0; ezL = -1.6; ezR = 1.6; } else if (po === "JUMP") { aL = aR = -2.4; zL = -.5; zR = .5; lL = -.7; lR = .25; kL = 1.1; kR = .6; } }
  const k = Math.min(1, dt * 14), L = (o, ax, v, kk = k) => { o.rotation[ax] += (v - o.rotation[ax]) * kk; };
  L(J.armL, "x", aL); L(J.armR, "x", aR, mining ? 1 : k); L(J.armL, "z", zL); L(J.armR, "z", zR); L(J.elbowL, "x", eL); L(J.elbowR, "x", eR, mining ? 1 : k); L(J.elbowL, "z", ezL); L(J.elbowR, "z", ezR);
  L(J.legL, "x", lL); L(J.legR, "x", lR); L(J.kneeL, "x", kL); L(J.kneeR, "x", kR);
  if (J.cape) J.cape.rotation.x = .12 + Math.min(1, moving / 5) * .7 + Math.max(0, P.vy * .05) + Math.sin(time * 2.3) * .05;
  if (J.flames) for (const f of J.flames) { f.scale.y = (P.ground ? .5 : 1.4) + Math.random() * .4; f.visible = !P.ground || Math.random() < .7; }
  if (J.halo) J.halo.position.y = 1.55 + Math.sin(time * 2) * .06;
  if (P.hp < lastHp) hurtT = .7; lastHp = P.hp; hurtT = Math.max(0, hurtT - dt); blinkT -= dt; if (blinkT < -.13) blinkT = 2.2 + Math.random() * 2.8;
  let ex = "neutral"; if (photo) { const po = POSES[poseI]; ex = po === "WAVE" || po === "CHEER" ? "happy" : po === "FLEX" || po === "MINE" ? "focus" : po === "JUMP" ? "surprised" : "neutral"; }
  else if (hurtT > 0) ex = "hurt"; else if (charJoy > 0) ex = "happy"; else if (mining) ex = "focus"; else if (!P.ground && P.vy > 3.5) ex = "surprised";
  if (ex === "neutral" && blinkT < 0) ex = "blink"; J.setExpr(ex);
  const sq = chSq; rig.scale.set(1 - air * .5 + sq * .35, 1 + air - sq * .4, 1 - air * .5 + sq * .35); rig.position.set(P.x, visY + Math.sin(charJoy * Math.PI) * .7 + (photo && POSES[poseI] === "JUMP" ? .45 : 0), P.z);
  KIT.rim.uRimK.value = .2 + (curNight || 0) * .3; }
function applyView(time) { const third = view > 0; drill.visible = !third; charSpr.visible = rimSpr.visible = shadowM.visible = third && !RIG; shadowM.visible = third; rig.visible = third && RIG; applyView.dt = Math.min(.05, time - (applyView.lt2 || time)); applyView.lt2 = time;
  if (!third) return; const moving = Math.hypot(P.vx, P.vz), mv = Math.min(1, moving / 3);
  if (P.ground && !chWasG) { chSq = .22; for (let i = 0; i < 10; i++) { const a = i * .628; burst(P.x + Math.cos(a) * .4, P.y + .05, P.z + Math.sin(a) * .4, [0xcfc8ff, 0x8a7ab0], 1, 1.2); } } chWasG = P.ground; chSq *= Math.pow(.004, 1 / 60); const air = P.ground ? 0 : Math.max(-.12, Math.min(.12, P.vy * .02));
  const shY = 2.1 * (1 + air - chSq * .6 + Math.sin(time * 2.2) * .012 * (1 - mv)), sx = 2.1 * (1 - air * .6 + chSq * .5);
  const side = P.vx * Math.cos(P.yaw) - P.vz * Math.sin(P.yaw); if (Math.abs(side) > .8) chFace = (view === 2 ? -1 : 1) * Math.sign(side);
  const jdt = Math.min(.05, time - (applyView.lt || time)); applyView.lt = time; if (charJoy > 0) charJoy = Math.max(0, charJoy - jdt * .9); const spin = charJoy > 0 ? Math.cos((1 - charJoy) * Math.PI * 4) : 1;
  charSpr.scale.set(sx * chFace * spin, shY, 1); const by = P.y + .2 + shY / 2 + Math.abs(Math.sin(bob)) * .08 * mv + Math.sin(charJoy * Math.PI) * .7; charSpr.position.set(P.x, by, P.z); charMat.rotation = Math.sin(bob) * .05 * mv - side * .02; if (RIG) updRig(time, mv, air);
  const tod2 = 1 - (curNight || 0) * .35; charMat.color.setScalar(tod2); rimSpr.scale.set(sx * chFace * spin * 1.07, shY * 1.05, 1); rimMat.rotation = charMat.rotation; rimMat.opacity = .35 + (curNight || 0) * .35 + Math.sin(time * 3) * .05;
  const cdx = camera.position.x - P.x, cdz = camera.position.z - P.z, cl = Math.hypot(cdx, cdz) || 1; rimSpr.position.set(P.x - cdx / cl * .06, by, P.z - cdz / cl * .06);
  const gyS = topH[Math.floor(P.x) + Math.floor(P.z) * SX] + 1.02; shadowM.position.set(P.x, Math.min(visY + .03, Math.max(gyS, P.y - 4)), P.z); const hgt = Math.max(0, P.y - gyS); shadowM.scale.setScalar(Math.max(.4, 1 - hgt * .12)); shadowM.material.opacity = Math.max(.2, 1 - hgt * .15);
  if (view === 1) { tpCamera(); return; }
  const dir = -1, dist = 2.6 * (photo ? photoZoom : 1), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), up = .2;
  let d = dist; for (let k = .4; k <= dist; k += .2) { const x = P.x + sy * k * dir, z = P.z + cy * k * dir, y = P.y + P.eye + up * k / dist; if (get(Math.floor(x), Math.floor(y), Math.floor(z))) { d = Math.max(.6, k - .3); break; } }
  camera.position.set(P.x + sy * d * dir, P.y + P.eye + up * d / dist, P.z + cy * d * dir); camera.rotation.set(-P.pitch * .5, P.yaw + Math.PI, 0); tpCam.ok = false; }
// v0.9: smooth over-the-shoulder camera (default view). Orbits with your look pitch, sits over the right shoulder, and is pulled in
// along the pivot->camera line when tiles are in the way (fast in, slow out), so it never clips into walls or cave ceilings.
const tpCam = { ok: false, pos: new THREE.Vector3(), dir: new THREE.Vector3(), d: 3.4, sh: .62, py: 0 };
function camFree(x, y, z) { const r = .22; return !get(Math.floor(x), Math.floor(y), Math.floor(z)) && !get(Math.floor(x + r), Math.floor(y), Math.floor(z)) && !get(Math.floor(x - r), Math.floor(y), Math.floor(z)) && !get(Math.floor(x), Math.floor(y + r), Math.floor(z)) && !get(Math.floor(x), Math.floor(y - r), Math.floor(z)) && !get(Math.floor(x), Math.floor(y), Math.floor(z + r)) && !get(Math.floor(x), Math.floor(y), Math.floor(z - r)); }
function tpCamera() { const dt = applyView.dt || .016, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), pc = Math.cos(P.pitch), ps = Math.sin(P.pitch);
  const fx = -sy * pc, fy = ps, fz = -cy * pc, rx = cy, rz = -sy; // forward + right
  const want = (photo ? 3.6 * photoZoom : 3.4) + Math.max(0, -P.pitch) * .5, shWant = photo ? 0 : .3 + .32 * Math.min(1, camera.aspect); // narrower shoulder on portrait phones
  const hy = visY + P.eye + .22; tpCam.py = tpCam.ok ? tpCam.py + (hy - tpCam.py) * Math.min(1, dt * 14) : hy; if (Math.abs(tpCam.py - hy) > 1.2) tpCam.py = hy;
  // shoulder offset shrinks if a wall is right beside you
  let sh = shWant; for (; sh > .05; sh -= .1) if (camFree(P.x + rx * sh, tpCam.py, P.z + rz * sh)) break; tpCam.sh += (Math.max(0, sh) - tpCam.sh) * Math.min(1, dt * 10);
  const px = P.x + rx * tpCam.sh, py = tpCam.py, pz = P.z + rz * tpCam.sh; let free = want;
  for (let k = .3; k <= want; k += .12) if (!camFree(px - fx * k, py - fy * k, pz - fz * k)) { free = Math.max(.35, k - .25); break; }
  tpCam.d = free < tpCam.d ? free : tpCam.d + (free - tpCam.d) * Math.min(1, dt * 3.5);
  const d = tpCam.d; camera.position.set(px - fx * d, py - fy * d, pz - fz * d); camera.rotation.set(P.pitch, P.yaw, 0);
  tpCam.pos.copy(camera.position); tpCam.dir.set(fx, fy, fz); tpCam.ok = true; if (RIG) rig.visible = d > 1.0 || photo; }
$("viewBtn").addEventListener("click", e => { e.stopPropagation(); if (running) cycleView(); });

// v0.9: the body + camera follow the smooth surface (within half a tile of the real tile you stand on), so slopes feel like slopes
let visY = 0, visT = 0, visG = null;
function updVisY(dt) { if (Math.abs(visY - P.y) > 1.6) visY = P.y; let tgt = P.y; if (P.ground && !P.swim) { if ((visT -= dt) <= 0) { visT = 1 / 30; visG = visGround(P.x, P.y, P.z); } if (visG != null) tgt = P.y + Math.max(-.55, Math.min(.45, visG - P.y)); } else visT = 0;
  visY += (tgt - visY) * Math.min(1, dt * (P.ground ? 10 : 22)); }
// ---------------- main loop ----------------
let curNight = 0, last = performance.now(), fpsN = 0, fpsT = 0, fps = 0, bob = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; const time = now / 1000; thumbTick(dt);
  const night = updSky(running && !photo ? dt : 0); curNight = night; updWater(dt, time, night);
  if (running && !photo) { if (boss.on && boss.intro > 0) { P.vx = P.vz = 0; } else { updPlayer(dt); landCheck(); updMining(dt, time); } updFuds(dt, night, time); updBoss(dt, time); updOrbs(dt); updCombo(dt); qT -= dt; if (qT <= 0) { qT = .25; qTick(); } bTick(dt); updScan(dt); updMeteor(dt, time); updCritters(dt, night); toyTick(dt); updEvents(dt, night); updRain(dt); updPet(dt, time); }
  else menuCam(dt);
  updMotes(dt, time, night); skyU.uTime.value = time; skyU.uAur.value += ((ev.k === "aurora" ? 1 : night > .6 ? .3 : 0) - skyU.uAur.value) * Math.min(1, dt * .8); updMP(dt); updParts(dt); updDebris(dt); audioTick(); adaptRes(dt);
  let n = 0; for (const ci of dirty) { buildChunk(ci); dirty.delete(ci); if (++n >= (IS_TOUCH ? 2 : 3)) break; } lodTick(dt); if (running) updVisY(dt);
  trauma = Math.max(0, trauma - dt * 1.8); const sh = trauma * trauma;
  camera.position.set(P.x + (Math.random() - .5) * sh * .25, visY + P.eye + (Math.random() - .5) * sh * .25, P.z + (Math.random() - .5) * sh * .25); camera.rotation.set(P.pitch + (Math.random() - .5) * sh * .04, P.yaw + (Math.random() - .5) * sh * .04, (Math.random() - .5) * sh * .06);
  if (!running) camera.rotation.set(-.1, P.yaw + menuA, 0);
  if (running) { applyView(time); BX.camTick(camera); }
  const spd = Math.hypot(P.vx, P.vz), fovT = baseFov + (spd > 5.5 ? 6 : 0); if (Math.abs(camera.fov - fovT) > .05) { camera.fov += (fovT - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); }
  const moving = Math.hypot(P.vx, P.vz); bob += dt * moving * 2.2; drillKick = Math.max(0, drillKick - dt * 6);
  drill.position.set(drillBase.x + Math.cos(bob * .5) * .006 * Math.min(1, moving / 4), drillBase.y + Math.sin(bob) * .01 * Math.min(1, moving / 4) - drillKick * .025, drillBase.z + drillKick * .05);
  sky.position.copy(camera.position);
  if (logoBoard) { logoBoard.rotation.y = Math.atan2(P.x - logoBoard.position.x, P.z - logoBoard.position.z); logoBoard.position.y = plaza.y + 4.4 + Math.sin(time * 1.2) * .12; }
  if (saveT > 0) { saveT -= dt; if (saveT <= 0) save(); }
  fpsN++; fpsT += dt; if (fpsT >= 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
  renderer.render(scene, camera); if (wantShot) takeShot();
}

// ---------------- v0.7: building toys, events, secrets, achievements, motes ----------------
let boostT = 0, toyCd = 0, lastKey = "", stepAcc = 0, charJoy = 0;
const PENTA = [0, 2, 4, 7, 9];
function toyTick(dt) { toyCd -= dt; boostT = Math.max(0, boostT - dt); if (!P.ground) { lastKey = ""; return; }
  const fx = Math.floor(P.x), fy = Math.floor(P.y - .05), fz = Math.floor(P.z), id = get(fx, fy, fz), sp = Math.hypot(P.vx, P.vz);
  if (sp > 1) { stepAcc += sp * dt; if (stepAcc > 2.2) { stepAcc = 0; if (id) sfx.step(id); if (view > 0) burst(P.x, P.y + .05, P.z, [0xcfc8ff], 2, .8); } }
  if (id === 19) { P.vy = 15.5; P.ground = false; sfx.bounce(); burst(P.x, P.y + .1, P.z, [0x14f195, 0xb8ffe0, 0xffffff], IS_TOUCH ? 16 : 30, 4); stats.bounces = (stats.bounces | 0) + 1; buzz(20); trauma = Math.max(trauma, .2); chSq = 0; return; }
  if (id === 20) { if (boostT < .9) { if (toyCd <= 0) { sfx.boost(); stats.boosts = (stats.boosts | 0) + 1; toyCd = .5; } burst(P.x, P.y + .1, P.z, [0xffd24a, 0xffffff], 4, 2); } boostT = 1.2; }
  const kk = fx + "," + fy + "," + fz; if (id === 21) { if (kk !== lastKey) { const m = 60 + PENTA[((fx + fz) % 5 + 5) % 5] + 12 * (((fy % 2) + 2) % 2); sfx.key(m); burst(fx + .5, fy + 1.05, fz + .5, [0xff4fd8, 0xffffff], 6, 1.5); stats.notes = (stats.notes | 0) + 1; } }
  lastKey = id === 21 ? kk : ""; }
function fireworks(x, y, z) { stats.fireworks = (stats.fireworks | 0) + 1; sfx.fw(); const cols = [[0xff4fd8, 0xffffff], [0x14f195, 0x28dcff], [0xffd24a, 0xff7a3a], [0x9945ff, 0xff4fd8]];
  for (let i = 0; i < 12; i++) setTimeout(() => burst(x, y + i * .55, z, [0xffd24a, 0xffffff], 2, .5), i * 55);
  for (let i = 0; i < 4; i++) setTimeout(() => { burst(x + (Math.random() - .5) * 4, y + 7 + Math.random() * 3, z + (Math.random() - .5) * 4, cols[i], IS_TOUCH ? 40 : 90, 8); trauma = Math.max(trauma, .15); }, 720 + i * 230); }
function cachesFound() { let n = 0; for (const c of caches) if (get(c[0], c[1], c[2]) !== 23) n++; return n; }
let shimT = 0;
function cacheShimmer() { if ((shimT -= .5) > 0) return; let bd = 99; for (const c of caches) { if (get(c[0], c[1], c[2]) !== 23) continue; bd = Math.min(bd, Math.hypot(c[0] + .5 - P.x, c[1] + .5 - P.y, c[2] + .5 - P.z)); }
  if (bd < 9) { sfx.shimmer(.05 * (1 - bd / 9) + .005); shimT = .5 + bd * .35; } }
// world events (local only)
const ev = { k: "", t: 0, next: 150 + Math.random() * 60, rainT: 0 };
const EVENTS = { rain: ["☔ SHARD RAIN", "Shards are falling! Run under them"], pump: ["📈 PUMP HOUR", "Every vein drop ×2 for 60 seconds"], aurora: ["🌌 AURORA NIGHT", "Look up! Rare fish bite more"] };
function startEvent(k) { if (!EVENTS[k]) return false; ev.k = k; ev.t = k === "rain" ? 30 : 60; banner(EVENTS[k][0], EVENTS[k][1]); sfx.event(); stats.events = (stats.events | 0) + 1; if (k === "aurora" && curNight < .6) tod = .02; return true; }
function updEvents(dt, night) { if (mp.on) return; const chip = $("evChip");
  if (!ev.k) { ev.next -= dt; if (ev.next <= 0 && !boss.on && !met.on) { ev.next = 200 + Math.random() * 120; startEvent(night > .6 ? (Math.random() < .6 ? "aurora" : "rain") : (Math.random() < .5 ? "rain" : "pump")); } chip.classList.remove("show"); return; }
  ev.t -= dt; chip.textContent = `${EVENTS[ev.k][0]} · ${Math.max(0, Math.ceil(ev.t))}s`; chip.classList.add("show"); if (ev.t <= 0) { pop(EVENTS[ev.k][0] + " ENDED", "#cfefff"); ev.k = ""; }
  if (ev.k === "rain") { ev.rainT -= dt; if (ev.rainT <= 0 && rain.length < 34) { ev.rainT = .28; const a = Math.random() * 6.28, d = 1 + Math.random() * 9; const s = new THREE.Sprite(rainMat); s.scale.set(.55, .55, 1); s.position.set(P.x + Math.cos(a) * d, P.y + 13 + Math.random() * 4, P.z + Math.sin(a) * d); scene.add(s); rain.push({ s, vy: -3 - Math.random() * 2, life: 7 }); } } }
const rainMat = new THREE.SpriteMaterial({ map: null, color: 0x9df7ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); const rain = [];
function updRain(dt) { rainMat.map = shotTex; for (let i = rain.length - 1; i >= 0; i--) { const r = rain[i], p = r.s.position; const gy = topH[Math.max(0, Math.min(SX - 1, Math.floor(p.x))) + Math.max(0, Math.min(SZ - 1, Math.floor(p.z))) * SX] + 1.3;
    if (p.y > gy) { p.y += r.vy * dt; if (p.y < gy) p.y = gy; } else r.life -= dt; { const hx = P.x - p.x, hz = P.z - p.z, hd = Math.hypot(hx, hz); if (hd < 4.5 && hd > .01) { const k = Math.min(1, dt * (p.y <= gy + .01 ? 5 : 1.6)); p.x += hx * k; p.z += hz * k; if (p.y <= gy + .01) p.y += (P.y + 1 - p.y) * k; } } r.s.material.rotation += dt * 3;
    if (Math.hypot(p.x - P.x, p.z - P.z) < 1.4 && p.y > P.y - .6 && p.y < P.y + 2.6) { scene.remove(r.s); rain.splice(i, 1); shards++; updShards(); stats.rain = (stats.rain | 0) + 1; pickN++; sfx.pick(pickN % 15); burst(p.x, p.y, p.z, [0x9df7ff, 0xffffff], 6, 2); continue; }
    if (r.life <= 0) { scene.remove(r.s); rain.splice(i, 1); } } }
// floating neon motes around the player (world ambience)
const MOTE_N = IS_TOUCH ? 70 : 150, moteGeo = new THREE.BufferGeometry(), moteP = new Float32Array(MOTE_N * 3), moteS = new Float32Array(MOTE_N);
for (let i = 0; i < MOTE_N; i++) { moteP[i * 3] = (Math.random() - .5) * 28; moteP[i * 3 + 1] = Math.random() * 12; moteP[i * 3 + 2] = (Math.random() - .5) * 28; moteS[i] = Math.random() * 6.28; }
moteGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MOTE_N * 3), 3));
const moteMat = new THREE.PointsMaterial({ size: .09, color: 0x9df7ff, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false }); const motes = new THREE.Points(moteGeo, moteMat); motes.frustumCulled = false; scene.add(motes);
const MOTE_C = { "NEON FLATS": 0x9df7ff, "PUMP DUNES": 0xff9ad0, "SIGNAL GROVE": 0x7dffd8, "FROST CHAIN": 0xe8f8ff, "MOON BASIN": 0xd8c8ff, "GLITCH WASTES": 0xff6ae0, "UNDERGROUND": 0xc69bff };
function updMotes(dt, time, night) { const a = moteGeo.attributes.position.array; for (let i = 0; i < MOTE_N; i++) { moteP[i * 3 + 1] += dt * .35; if (moteP[i * 3 + 1] > 12) moteP[i * 3 + 1] = 0;
    const ph = moteS[i] + time * .4; let x = moteP[i * 3] + Math.sin(ph) * .6, z = moteP[i * 3 + 2] + Math.cos(ph * .8) * .6;
    a[i * 3] = P.x + ((x - P.x % 28 + 42) % 28 - 14); a[i * 3 + 1] = P.y - 2 + moteP[i * 3 + 1]; a[i * 3 + 2] = P.z + ((z - P.z % 28 + 42) % 28 - 14); }
  moteGeo.attributes.position.needsUpdate = true; moteMat.color.setHex(MOTE_C[biomeNow] || 0x9df7ff); moteMat.opacity = .35 + night * .5 + (ev.k === "rain" ? .2 : 0); moteMat.size = biomeNow === "FROST CHAIN" ? .13 : .09; }
// achievements (local, in-game only)
const ACH = [
  ["vein", "💎", "FIRST SHARD", "Mine a SOL vein", () => stats.veins >= 1], ["miner", "⛏", "TILE MUNCHER", "Mine 250 tiles", () => stats.mined >= 250],
  ["build", "🏗", "ARCHITECT", "Build 50 pieces", () => stats.placed >= 50], ["rug", "🧹", "RUG BUSTER", "Bust THE RUG PULLER", () => (stats.k_rug | 0) >= 1 || stats.kills >= 1],
  ["king", "👑", "KING DETHRONED", "Beat THE FUD KING", () => (stats.k_king | 0) >= 1], ["whale", "🐋", "WHALE BEACHED", "Beat THE DUMP WHALE", () => (stats.k_whale | 0) >= 1], ["fudder", "🧀", "FUDDER SILENCED", "Silence THE TROGLODYTE FUDDER in its lair", () => (stats.k_fudder | 0) >= 1],
  ["fish", "🎣", "HOOKED", "Catch a fish", () => (stats.fish | 0) >= 1], ["fish10", "🐟", "NEON ANGLER", "Catch 10 fish", () => (stats.fish | 0) >= 10],
  ["dex", "📘", "FISHDEX FIVE", "Catch 5 kinds of fish", () => Object.keys(fish.dex).length >= 5], ["dia", "💠", "DIAMOND SPOTTER", "Zap a Diamond Hands", () => (stats.diamond | 0) >= 1],
  ["meteor", "☄", "STARGAZER", "See a meteor land", () => (stats.meteors | 0) >= 1], ["cache", "🗝", "TREASURE HUNTER", "Find a secret cache", () => cachesFound() >= 1],
  ["cache5", "🏆", "SECRET KEEPER", "Find all 5 secret caches", () => cachesFound() >= 5], ["bounce", "🟢", "BOING", "Bounce 10 times on Bounce Pads", () => (stats.bounces | 0) >= 10],
  ["fw", "🎆", "SHOWTIME", "Pop 3 Firework Crates", () => (stats.fireworks | 0) >= 3], ["keys", "🎹", "KEYBOARD HERO", "Play 16 notes on Synth Keys", () => (stats.notes | 0) >= 16],
  ["moon", "🌙", "MOONWALKER", "Visit the Moon Basin", () => !!stats.moon], ["core", "✨", "CORE MEMORY", "Mine a SOL Core vein", () => stats.cores >= 1],
  ["drill", "🔩", "BOSS DRILL", "Build the BOSS DRILL MK IV", () => upg.drill >= 4], ["event", "🌌", "WEATHER WATCHER", "Live through a world event", () => (stats.events | 0) >= 1],
  ["streak", "🔥", "ON A STREAK", "3-day daily streak", () => (daily.streak | 0) >= 3], ["pet", "🐾", "BEST FRIEND", "Adopt a companion", () => (stats.petsGot | 0) >= 1], ["builder", "🏗", "MASTER BUILDER", "Finish a daily Build Challenge", () => (bc.wins | 0) >= 1], ["photo", "📷", "PHOTOGRAPHER", "Snap a picture in Photo Mode", () => (stats.photoSnaps | 0) >= 1], ["zfish", "🗺", "ZONE ANGLER", "Catch 3 zone-only fish", () => FISH.filter(f => f.z && fish.dex[f.n]).length >= 3] ];
let ach = {}, achT = 0;
function achTick() { if (mp.on || !running) return; for (const a of ACH) if (!ach[a[0]] && a[4]()) { ach[a[0]] = Date.now(); shards += 5; updShards(); const el = $("ach"); $("achN").textContent = `${a[1]} ${a[2]}`; $("achD").textContent = `${a[3]} · ◆+5 (in-game)`; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); clearTimeout(achT); achT = setTimeout(() => el.classList.remove("show"), 3600); sfx.ach(); charJoy = 1; buzz(40); save(); break; } }
function achHTML() { return `<b>🏆 ACHIEVEMENTS ${Object.keys(ach).length}/${ACH.length}</b><div class="achg">` + ACH.map(a => `<span class="${ach[a[0]] ? "on" : ""}" title="${a[2]}: ${a[3]}">${a[1]}<i>${ach[a[0]] ? a[2] : "???"}</i></span>`).join("") + "</div>"; }

// ---------------- v0.8: companions (original pets, local only) ----------------
const PETS = [["pup", "PUMP PUP", "Hops after you and barks when a secret cache is near", 40], ["sprite", "SHARD SPRITE", "Floats at your shoulder · 25% chance of +1 shard per vein", 60], ["crab", "HODL CRAB", "Scuttles beside you · grabs falling rain shards + pinches Paper Hands", 50]];
const petTex = {}; (() => { const mk = (id, fn) => { const c = document.createElement("canvas"); c.width = c.height = 128; fn(c.getContext("2d")); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; petTex[id] = t; };
  mk("pup", g => { g.lineWidth = 4; g.strokeStyle = "#0a0618"; g.fillStyle = "#ff4fd8"; g.beginPath(); g.ellipse(64, 80, 34, 24, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(64, 48, 26, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#28dcff"; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(64 + s * 14, 30); g.lineTo(64 + s * 30, 10); g.lineTo(64 + s * 28, 40); g.closePath(); g.fill(); g.stroke(); }
    g.fillStyle = "#fff"; for (const s of [-1, 1]) { g.beginPath(); g.arc(64 + s * 10, 46, 7, 0, 7); g.fill(); } g.fillStyle = "#0a0618"; for (const s of [-1, 1]) { g.beginPath(); g.arc(64 + s * 10, 47, 3.5, 0, 7); g.fill(); }
    g.fillStyle = "#0a0618"; g.beginPath(); g.ellipse(64, 58, 6, 4, 0, 0, 7); g.fill(); g.strokeStyle = "#ffd24a"; g.lineWidth = 5; g.beginPath(); g.arc(64, 72, 22, .2, Math.PI - .2); g.stroke(); g.fillStyle = "#ffd24a"; g.font = "900 14px Orbitron,Verdana"; g.textAlign = "center"; g.fillText("$", 64, 94);
    g.strokeStyle = "#ff4fd8"; g.lineWidth = 7; g.beginPath(); g.moveTo(96, 80); g.quadraticCurveTo(116, 70, 112, 52); g.stroke(); });
  mk("sprite", g => { g.shadowColor = "#14f195"; g.shadowBlur = 20; const gr = g.createLinearGradient(40, 20, 88, 108); gr.addColorStop(0, "#9945ff"); gr.addColorStop(1, "#14f195"); g.fillStyle = gr; g.beginPath(); g.moveTo(64, 14); g.lineTo(92, 56); g.lineTo(64, 114); g.lineTo(36, 56); g.closePath(); g.fill(); g.shadowBlur = 0;
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 2; g.beginPath(); g.moveTo(36, 56); g.lineTo(92, 56); g.moveTo(64, 14); g.lineTo(64, 114); g.stroke(); g.fillStyle = "rgba(200,255,240,.5)"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(64 + s * 40, 50, 18, 9, s * .5, 0, 7); g.fill(); }
    g.fillStyle = "#0a0618"; for (const s of [-1, 1]) { g.beginPath(); g.arc(64 + s * 9, 62, 4.5, 0, 7); g.fill(); } g.strokeStyle = "#0a0618"; g.lineWidth = 3; g.beginPath(); g.arc(64, 72, 7, .3, Math.PI - .3); g.stroke(); });
  mk("crab", g => { g.lineWidth = 4; g.strokeStyle = "#0a0618"; g.fillStyle = "#ff7a3a"; for (const s of [-1, 1]) { g.beginPath(); g.arc(64 + s * 44, 50, 14, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#0a0618"; g.beginPath(); g.moveTo(64 + s * 44, 50); g.lineTo(64 + s * 58, 42); g.lineTo(64 + s * 58, 58); g.fill(); g.fillStyle = "#ff7a3a"; }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(64 + s * 20, 86 + k * 6); g.lineTo(64 + s * (36 + k * 4), 106 + k * 4); g.stroke(); }
    g.beginPath(); g.ellipse(64, 80, 34, 22, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#ffd24a"; g.font = "900 13px Orbitron,Verdana"; g.textAlign = "center"; g.fillText("HODL", 64, 88);
    for (const s of [-1, 1]) { g.strokeStyle = "#0a0618"; g.beginPath(); g.moveTo(64 + s * 10, 60); g.lineTo(64 + s * 12, 44); g.stroke(); g.fillStyle = "#fff"; g.beginPath(); g.arc(64 + s * 12, 40, 7, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#0a0618"; g.beginPath(); g.arc(64 + s * 12, 41, 3, 0, 7); g.fill(); } }); })();
const petMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: .05 }); const petSpr = new THREE.Sprite(petMat); petSpr.visible = false; scene.add(petSpr);
const petShadow = new THREE.Mesh(new THREE.PlaneGeometry(.8, .8), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false })); petShadow.rotation.x = -Math.PI / 2; petShadow.visible = false; scene.add(petShadow);
const pet = { x: 0, y: 0, z: 0, vy: 0, t: 0, barkT: 0, barked: {}, face: 1 };
function setPet(id) { upg.pet = id; petSpr.visible = petShadow.visible = !!id && !mp.on; if (id) { petMat.map = petTex[id]; petMat.needsUpdate = true; pet.x = P.x + 1; pet.y = P.y; pet.z = P.z + 1; } }
function petClick(id) { if (!upg.pets) upg.pets = {}; const pd = PETS.find(p => p[0] === id); if (!pd) return false;
  if (!upg.pets[id]) { if (shards < pd[3]) { pop(`NEED ◆${pd[3]} SOL SHARDS`, "#ff6a8a"); return false; } shards -= pd[3]; updShards(); upg.pets[id] = 1; sfx.buy(); banner(`${pd[1]} JOINED YOU!`, pd[2]); stats.petsGot = (stats.petsGot | 0) + 1; }
  setPet(upg.pet === id ? "" : id); renderPets(); save(); return true; }
function updPet(dt, time) { if (!upg.pet || mp.on) return; pet.t += dt; const id = upg.pet, fly = id === "sprite";
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), side = id === "crab" ? -1 : 1; const tx = P.x + cy * 1.3 * side + sy * 1.1, tz = P.z - sy * 1.3 * side + cy * 1.1;
  const dx = tx - pet.x, dz = tz - pet.z, d = Math.hypot(dx, dz); if (d > 14) { pet.x = tx; pet.z = tz; pet.y = P.y; }
  const sp = Math.min(1, dt * (d > 3 ? 5 : 2.5)); pet.x += dx * sp; pet.z += dz * sp; if (Math.abs(dx) > .05) pet.face = dx * cy - dz * sy > 0 ? 1 : -1;
  let gy = P.y; for (let y = Math.floor(P.y) + 2; y > Math.floor(P.y) - 6; y--) if (get(Math.floor(pet.x), y - 1, Math.floor(pet.z)) && !get(Math.floor(pet.x), y, Math.floor(pet.z))) { gy = y; break; }
  if (fly) pet.y += (P.y + 1.6 + Math.sin(time * 2.5) * .18 - pet.y) * Math.min(1, dt * 4);
  else { pet.vy -= 20 * dt; pet.y += pet.vy * dt; if (pet.y < gy) { pet.y = gy; pet.vy = (d > .6 || charJoy > 0) && id === "pup" ? 4.2 : 0; } }
  const s = id === "crab" ? .8 : id === "pup" ? .9 : .7, sq = fly ? 1 : 1 + Math.min(.15, Math.max(-.12, pet.vy * .03));
  petSpr.scale.set(s * pet.face * (id === "crab" ? 1 + Math.sin(pet.t * 14) * .05 * Math.min(1, d) : 1), s * sq, 1); petSpr.position.set(pet.x, pet.y + s * sq / 2 + (id === "crab" ? Math.abs(Math.sin(pet.t * 14)) * .04 * Math.min(1, d) : 0), pet.z);
  petMat.rotation = id === "crab" ? Math.sin(pet.t * 7) * .06 : fly ? Math.sin(time * 1.5) * .12 : 0; petShadow.position.set(pet.x, gy + .03, pet.z); petShadow.scale.setScalar(fly ? .6 : 1);
  if (fly && Math.random() < dt * 6) burst(pet.x, pet.y + .2, pet.z, [0x14f195, 0x9945ff], 1, .6);
  if (id === "pup") { pet.barkT -= dt; if (pet.barkT <= 0) { pet.barkT = 2.5; for (const c of caches) { if (get(c[0], c[1], c[2]) !== 23) continue; const cd = Math.hypot(c[0] - P.x, c[1] - P.y, c[2] - P.z); if (cd < 12) { sfx.bark(); pet.vy = 6; const k = c.join(); if (!pet.barked[k]) { pet.barked[k] = 1; pop("🐶 WOOF! SOMETHING SHINY IS NEAR", "#ffd24a"); } break; } } } }
  if (id === "crab") { for (const c of critters) if (c.s.position.distanceTo(petSpr.position) < 1.3) { pop("🦀 PINCH!", "#ff7a3a"); zapCritter(c); break; }
    for (let i = rain.length - 1; i >= 0; i--) { const r = rain[i].s.position; if (Math.hypot(r.x - pet.x, r.z - pet.z) < 1.6 && r.y < pet.y + 2) { scene.remove(rain[i].s); rain.splice(i, 1); shards++; updShards(); stats.rain = (stats.rain | 0) + 1; burst(r.x, r.y, r.z, [0x9df7ff], 4, 1.5); sfx.pick(3); } } } }
$("petL").addEventListener("click", e => { const b = e.target.closest("button[data-pet]"); if (b) petClick(b.dataset.pet); });

// ---------------- v0.8: PHOTO MODE (local only: pictures save to your device or open your own share sheet) ----------------
let photo = false, photoZoom = 1, poseI = 0, filtI = 0, photoPrevView = 0, photoTodI = -1;
const POSES = ["IDLE", "WAVE", "CHEER", "FLEX", "MINE", "JUMP"], FILTERS = [["NO FILTER", ""], ["NEON POP", "saturate(1.7) contrast(1.15)"], ["NOIR", "grayscale(1) contrast(1.35)"], ["VAPOR", "hue-rotate(-28deg) saturate(1.45) brightness(1.05)"], ["FILM", "sepia(.45) contrast(1.1) brightness(1.06)"]], PHOTO_TOD = [[.42, "DAY"], [.63, "SUNSET"], [.02, "NIGHT"], [.3, "MORNING"]];
function setPhoto(on) { if (on === photo || (on && !running)) return; photo = on; document.body.classList.toggle("photo", on); input.mine = false; input.f = input.s = 0;
  if (on) { photoPrevView = view; if (view === 0) view = 1; rigYaw = P.yaw + .5; P.pitch = Math.min(P.pitch, -.05); photoZoom = 1; if (document.pointerLockElement) document.exitPointerLock(); stats.photos = (stats.photos | 0) + 1; sfx.click(); updPhotoBar(); }
  else { view = photoPrevView; canvas.style.filter = ""; filtI = 0; poseI = 0; } }
function updPhotoBar() { $("phF").textContent = FILTERS[filtI][0]; $("phP").textContent = "POSE: " + POSES[poseI]; $("phT").textContent = photoTodI < 0 ? "TIME" : PHOTO_TOD[photoTodI][1]; canvas.style.filter = FILTERS[filtI][1]; }
let phDown = null; $("photoBar").addEventListener("pointerdown", e => { phDown = e.target.closest("button"); e.stopPropagation(); });
$("photoBar").addEventListener("pointerup", e => { const b = e.target.closest("button"); if (!b || b !== phDown) return; phDown = null; e.stopPropagation(); e.preventDefault(); const k = b.dataset.k; sfx.click();
  if (k === "f") filtI = (filtI + 1) % FILTERS.length; else if (k === "p") { poseI = (poseI + 1) % POSES.length; } else if (k === "t") { photoTodI = (photoTodI + 1) % PHOTO_TOD.length; tod = PHOTO_TOD[photoTodI][0]; updSky(0); }
  else if (k === "in") photoZoom = Math.max(.45, photoZoom - .15); else if (k === "out") photoZoom = Math.min(2.4, photoZoom + .15); else if (k === "snap") wantShot = true; else if (k === "x") setPhoto(false); updPhotoBar(); });
$("photoBtn").addEventListener("click", e => { e.stopPropagation(); setPhoto(!photo); });
$("sndHud").addEventListener("click", e => { e.stopPropagation(); e.preventDefault(); toggleSound(); });
{ const pad = $("photoPad"); let lx = 0, ly = 0, dn = false; pad.addEventListener("pointerdown", e => { dn = true; lx = e.clientX; ly = e.clientY; pad.setPointerCapture(e.pointerId); });
  pad.addEventListener("pointermove", e => { if (!dn || !photo) return; P.yaw -= (e.clientX - lx) * .008; P.pitch = Math.max(-1.2, Math.min(.9, P.pitch - (e.clientY - ly) * .006)); lx = e.clientX; ly = e.clientY; });
  pad.addEventListener("pointerup", () => { dn = false; }); pad.addEventListener("wheel", e => { if (!photo) return; photoZoom = Math.max(.45, Math.min(2.4, photoZoom + Math.sign(e.deltaY) * .12)); e.preventDefault(); }, { passive: false }); }
document.addEventListener("keydown", e => { if (e.code === "KeyM" && !e.repeat) toggleSound(); if (e.code === "KeyO" && running) setPhoto(!photo); else if (photo && e.code === "Escape") setPhoto(false); });

// ---------------- v0.8: daily BUILD CHALLENGE (local only, rotates by your device's date) ----------------
const bc = { key: "", base: {}, done: false, streak: 0, last: "", wins: 0 };
const BC_POOL = [ { t: "SYNTH MELODY", d: "Place 8 Synth Keys", k: "pl_21", n: 8 }, { t: "BOUNCE PARK", d: "Place 5 Bounce Pads", k: "pl_19", n: 5 }, { t: "SKY TOWER", d: "Build 12 blocks above the plaza floor", k: "tower", n: 12, abs: 1 },
  { t: "GOLD VAULT", d: "Place 12 Bullion", k: "pl_6", n: 12 }, { t: "NEON ROAD", d: "Place 25 Neon Tiles", k: "pl_1", n: 25 }, { t: "LAMP GARDEN", d: "Place 10 SOL Lamps", k: "pl_12", n: 10 },
  { t: "SPEEDWAY", d: "Place 6 Boost Strips", k: "pl_20", n: 6 }, { t: "FIREWORK SHOW", d: "Pop 3 Firework Crates", k: "fireworks", n: 3 }, { t: "GLASS HOUSE", d: "Place 15 Pump Glass", k: "pl_7", n: 15 } ];
let bcForceI = -1;
function bcDef() { if (bcForceI >= 0) return BC_POOL[bcForceI]; let h = 7; for (const ch of bc.key) h = Math.imul(h ^ ch.charCodeAt(0), 2246822519) >>> 0; return BC_POOL[h % BC_POOL.length]; }
function bcEnsure() { const k = todayKey(); if (bc.key === k) return; bc.key = k; bc.done = false; bc.base = {}; for (const st in stats) bc.base[st] = stats[st] || 0; }
function bcVal() { const q = bcDef(); if (q.k === "tower") return Math.max(0, Math.min(q.n, (stats.topBuild | 0) - plaza.y + 1)); return Math.max(0, Math.min(q.n, (stats[q.k] || 0) - (bc.base[q.k] || 0))); }
function bcLine() { if (mp.on) return ""; bcEnsure(); const q = bcDef(); return bc.done ? `🏗 BUILD CHALLENGE DONE · streak ${bc.streak} · new one tomorrow` : `🏗 BUILD CHALLENGE · ${q.t}: ${q.d} ${bcVal()}/${q.n} · ◆+30`; }
let bcLast = -1;
function bcTick() { if (mp.on) return; bcEnsure(); if (bc.done) return; const v = bcVal(), q = bcDef(); if (v !== bcLast && bcLast >= 0 && v > bcLast && v < q.n) pop(`🏗 ${q.t} ${v}/${q.n}`, "#14f195"); bcLast = v;
  if (v >= q.n) { const y = new Date(Date.now() - 864e5), yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`; bc.streak = bc.last === yk ? bc.streak + 1 : 1; bc.last = bc.key; bc.done = true; bc.wins = (bc.wins | 0) + 1;
    shards += 30; updShards(); banner("BUILD CHALLENGE COMPLETE!", `${q.t} · ◆+30 (in-game) · streak ${bc.streak} 🏗`); sfx.quest(); fireworks(P.x, P.y + 1, P.z); charJoy = 1; save(); } }

// ---------------- boot ----------------
const saved = load();
let migrated = false;
let newWorld = false; if (saved && !saved.migr && (saved.wv | 0) !== WORLD_V) { newWorld = true; saved.edits = {}; saved.p = null; }
if (saved && !saved.migr) { seed = saved.seed; edits = saved.edits || {}; shards = saved.shards | 0; sel = saved.sel | 0; tod = saved.tod ?? tod;
  if (saved.upg) Object.assign(upg, saved.upg); if (saved.stats) Object.assign(stats, saved.stats); Qi = saved.Qi | 0; if (!saved.qv && Qi >= 7) Qi++; if ((saved.qv | 0) < 3 && Qi >= 12) { Qi = 12; saved.qBase = {}; } qBase = saved.qBase || {}; P.hp = saved.hp || maxHp();
  view = saved.tp ? (saved.view ?? 1) : 1; if (saved.set) { sndOn = saved.set.snd !== false; musOn = saved.set.mus !== false; lookSlow = !!saved.set.slow; lookMul = saved.set.look || 1; } if (saved.daily) Object.assign(daily, saved.daily); if (saved.bc) Object.assign(bc, saved.bc); if (saved.dex) fish.dex = saved.dex; if (saved.ach) ach = saved.ach; if (saved.char) charId = saved.char; introDone = saved.intro !== false; if (introDone) met.t = 150 + Math.random() * 120; }
else { seed = parseInt(Q.get("seed")) || 1337; if (saved && saved.migr) { shards = saved.shards; migrated = true; } qStart(); }
generate(seed); applyEdits(); for (const t of trees) if (get(t.x, t.y + 1, t.z) !== 27 || !get(t.x, t.y, t.z)) { t.dead = true; for (let y = t.y + 1; y <= t.y + t.h; y++) if (get(t.x, y, t.z) === 27) world[idx(t.x, y, t.z)] = 0; } const tris = buildAll(); visY = P.y;
respawn(); if (saved && saved.p) { [P.x, P.y, P.z, P.yaw, P.pitch] = saved.p; if (collides(P.x, P.y, P.z)) respawn(); }
if (Q.has("fp")) view = 0; buildPools(); buildCharPicker(); if (upg.pet) setPet(upg.pet); setChar(Q.get("char") || charId, true); buildPalette(); updShards(); resize(); updQuest(); dailyEnsure(); updDaily(); menuStats(); updHP(); updSetBtns(); syncLookBtn(); orientCheck(); if (migrated) setTimeout(() => banner("BIGGER WORLD!", "Your SOL shards carried over to the new map"), 600); if (newWorld) setTimeout(() => banner("A BIGGER, WILDER WORLD!", "Rolling hills, rock arches, glowing trees · your shards, upgrades + skins carried over"), 900);
// Phase-2 hook is for LOCAL testing only: only localhost servers are accepted.
if (Q.get("mp")) { try { const u = new URL(Q.get("mp")); if (/^wss?:$/.test(u.protocol) && ["localhost", "127.0.0.1"].includes(u.hostname)) mpConnect(u.href); } catch (e) {} }
$("load").remove();
setInterval(save, 5000);
requestAnimationFrame(frame);

// test / debug hooks (harmless; used by automated checks)
window.__SB = { world: () => { let t0 = 0, t1 = 0, c0 = 0, c1 = 0, pr = 0, vis = 0; for (const q of sm) { if (q.m0) { c0++; if (q.m0.visible) t0 += q.m0.geometry.index.count / 3; } if (q.m1) { c1++; if (q.m1.visible) t1 += q.m1.geometry.index.count / 3; } if (q.pr && q.pr.visible) pr += q.pr.geometry.index.count / 3; if (q.vis) vis++; } return { smooth: SMOOTH, lod0: c0, lod1: c1, tris0: t0, tris1: t1, props: pr, visChunks: vis, trees: trees.filter(t => !t.dead).length, SX, SZ }; }, chunkLod: (x, z) => { const q = sm[Math.floor(x / CS) + Math.floor(z / CS) * NCX]; return q && { lod: q.lod, m0: !!(q.m0 && q.m0.visible), m1: !!(q.m1 && q.m1.visible), d: q.d }; }, visY: () => visY, visGround: () => visGround(P.x, P.y, P.z), trees: () => trees.filter(t => !t.dead).map(t => ({ ...t })), fell: i => fellTree(trees.filter(t => !t.dead)[i]), SX: () => SX, SZ: () => SZ, gemInfo: () => ({ cut: Object.fromEntries(Object.entries(GEM.SPEC).map(([k, v]) => [k, v.cut])), glow: GEM.mat.fragmentShader.includes("inner"), sparkle: GEM.pmat.vertexShader.includes("aK") }), gems: () => { let n = 0, f = 0, t = 0; for (const g of gemL) if (g) { n++; f += g.faces; t += g.tris; } return { chunks: n, faces: f, tris: t }; }, pools: () => pools.map(q => ({ x: q.x, y: q.y, z: q.z, rx: q.rx, rz: q.rz })), stuck: () => ({ ...stuck, swim: !!P.swim, wet: !!P.wet }), dryLand, audio: () => ({ state: AC ? AC.state : "none", snd: sndOn, mus: musOn, n: { ...sfxN }, unlock: unlockN, lvl: audioLevel(), hud: $("sndHud").textContent, amb: amb.wind ? { wind: +amb.wind.gain.value.toFixed(3), water: +amb.water.gain.value.toFixed(3), cave: +amb.cave.gain.value.toFixed(3), poolD: +amb.poolD.toFixed(1) } : null }), sfx: (k, ...a) => sfx[k](...a), toggleSound, ambMute: v => { if (ambG) ambG.gain.value = v ? 0 : AMB_V; }, setSnd: (a, b) => { sndOn = a; musOn = b; updSetBtns(); }, audioSuspend: () => AC && AC.suspend(), bc: () => ({ ...bc, def: bcDef(), v: bcVal(), line: bcLine() }), bcForce: i => { bcForceI = i; }, setPhoto, photo: () => ({ on: photo, pose: POSES[poseI], filter: FILTERS[filtI][0], zoom: photoZoom }), setChar: id => setChar(id, true), thumbs: () => ({ left: thumbQ.length, n: Object.keys(charThumb).length, r3: document.querySelectorAll("#chars .ch.r3").length }), rig: () => ({ vis: rig.visible, yaw: rigYaw, legL: CM ? CM.legL.rotation.x : 0, armR: CM ? CM.armR.rotation.x : 0, kneeL: CM ? CM.kneeL.rotation.x : 0, elbowR: CM ? CM.elbowR.rotation.x : 0, expr: CM ? CM.expr : "", dressed: rigFor, info: rig.userData.info }), petClick, pet: () => ({ ...pet, id: upg.pet, vis: petSpr.visible, px: petSpr.position.x }), FISH: () => FISH.map(f => f.n), roll: (n, z) => rollFish(n, z).n, brk: (x, y, z) => { const id = get(x, y, z); if (id) breakBlock(x, y, z, id); return id; }, topH: (x, z) => topH[x + z * SX], ACH: () => ACH.map(a => a[0]), ach: () => ({ ...ach }), startEvent, ev: () => ({ k: ev.k, t: ev.t, rain: rain.length }), caches: () => caches.map(c => [...c, get(c[0], c[1], c[2])]), cachesFound, biomeNow: () => biomeNow, setBlock: (x, y, z, id) => setBlock(x, y, z, id), sky: () => skyU.uAur.value, joy: () => charJoy, P, input, charSpr, bossPos: () => boss.on && boss.g.position.toArray(), bossKind: () => boss.kind, quests: () => QUESTS.length, qDefAt: i => qDef(i), achs: () => ({ ...ach }), introFx: () => introFx, spawnDia: () => spawnCritter("dia"), crits: () => critters.map(c => ({ dia: !!c.dia })), zapNearest: () => { const c = critters[0]; if (c) zapCritter(c); return !!c; }, shareShown: () => $("shareBtn").classList.contains("show"), shareClick: () => $("shareBtn").click(), shared: () => window.__shared | 0, get: (x, y, z) => get(x, y, z), setBlock, place: () => { aim(); place(); }, aim: () => { aim(); return hit && { ...hit }; }, start: startGame, pause, look,
  state: () => ({ x: P.x, y: P.y, z: P.z, yaw: P.yaw, pitch: P.pitch, ground: P.ground, shards, sel, running, tris, fps: Math.round(fps), fuds: fuds.length, tod, mp: mp.on ? { id: mp.id, rejects: mp.rejects || 0, lastEmote: mp.lastEmote || null, others: [...mp.others.values()].map(o => ({ name: o.p.name, x: o.p.x, y: o.p.y, z: o.p.z })) } : null, info: renderer.info.render }),
  select, respawn, save, lookSlow: () => lookSlow, setLookSlow: v => { lookSlow = !!v; const b = $("lookSlow"); if (b) { b.classList.toggle("on", lookSlow); b.textContent = lookSlow ? "LOOK: SLOW" : "LOOK: NORM"; } }, trySoftTapMine, overUI, upg, stats, quest: () => ({ i: Qi, ...qDef(Qi), v: qVal(qDef(Qi)) }), boss: () => ({ on: boss.on, hp: boss.hp, max: boss.max, phase: boss.phase }), summon: k => summonBoss(k), daily: () => ({ ...daily, line: dailyLine() }), meteor: () => { met.t = 0; }, met: () => ({ on: met.on, crater: met.crater }), critters: () => critters.map(c => ({ x: c.s.position.x, y: c.s.position.y, z: c.s.position.z })), spawnCritter: () => spawnCritter(true), lookAtCrit: () => { const c = critters.slice().sort((a, b) => a.s.position.distanceTo(camera.position) - b.s.position.distanceTo(camera.position))[0]; if (!c) return false; const o = c.s.position, dx = o.x - P.x, dz = o.z - P.z, dy = o.y - (P.y + P.eye); P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); return true; }, shot: () => { wantShot = true; }, lastShot: () => lastShotInfo, lastShotUrl: () => lastShot && lastShot.url, touchLook: (dx, dy) => touchLook(dx, dy), setLookMul: v => { lookMul = v; }, mem: () => ({ geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures, heap: performance.memory ? performance.memory.usedJSHeapSize : 0, scene: scene.children.length, orbs: orbs.length, fuds: fuds.length, shots: boss.shots.length, crit: critters.length }), fishSt: () => ({ st: fish.st, prog: fish.prog, sp: fish.sp && fish.sp.n, dex: fish.dex, n: stats.fish || 0 }), pools: () => pools, setView: v => { view = v; }, rigObj: () => rig, rinfo: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles }), headPNG: id => { const J = KIT.build(id); const u = J.headCanvas.toDataURL(); J.dispose(); return u; }, charPNG: (id, size, yaw) => new Promise(res => { const go = () => { const u = renderRigPNG(id, size || 384, yaw ?? .42); if (u) res(u); else setTimeout(go, 50); }; go(); }), view: () => view, tpCam: () => ({ ok: tpCam.ok, d: tpCam.d, sh: tpCam.sh, pos: tpCam.pos.toArray(), dir: tpCam.dir.toArray() }), aimHit: () => hit && { x: hit.x, y: hit.y, z: hit.z }, setChar: id => setChar(id, true), charId: () => charId, chars: () => CHARS.map(c => c[0]), aimState: () => ({ pool: !!poolHit, boss: bossHit, crit: !!critHit, fud: !!fudHit }), lookAtBoss: () => { if (!boss.on) return; const o = boss.g.position.clone(); if (boss.kind === "fudder") o.y += 2.2; const dx = o.x - P.x, dz = o.z - P.z, dy = o.y - (P.y + P.eye); P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); }, bossDamage: (n, w) => bossDamage(n, w), bossX: () => ({ on: boss.on, kind: boss.kind, hp: boss.hp, max: boss.max, phase: boss.phase, intro: boss.intro, act: boss.act && boss.act.n, actS: boss.act && boss.act.s, expose: boss.expose, minions: boss.minions, dying: boss.dying, fx: BX.fx.length, haz: BX.haz.length, shots: BX.shots.length, pos: boss.on ? boss.g.position.toArray() : null, weak: boss.on ? boss.eye.getWorldPosition(new THREE.Vector3()).toArray() : null, cine: document.body.classList.contains("cine") }), bossAct: n => { if (boss.on) { boss.intro = 0; cine(false); BX.clearFx(); boss.lidShut = false; boss.wind = 0; boss.act = { n, t: 0, s: 0 }; } }, bossSkipIntro: () => { boss.intro = 0; cine(false); }, bossAim: (o, d) => BX.aim(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize(), 40), bossModels: () => Object.keys(BX.models()), bossModel: k => BX.make(k).g, lair: () => { const A = lairArena(), vx = lair.x + Math.cos(lair.ea) * 7, vz = lair.z + Math.sin(lair.ea) * 7; return { ...lair, arena: A, props: !!LZ, view: [vx, lair.floorY, vz, Math.atan2(-(lair.throne[0] - vx), -(lair.throne[1] - vz)), .12] }; }, lairProps: () => LZ, lairFight: () => { const A = lairArena(); P.x = lair.x + Math.cos(lair.ea) * 6; P.z = lair.z + Math.sin(lair.ea) * 6; P.y = lair.floorY; P.vx = P.vy = P.vz = 0; lairCd = 0; lairArmed = true; return true; }, bossEnd: (w, s) => bossEnd(w, s), openLab, closeLab, buy: id => buyUpg(id), hp: () => P.hp, biome: () => biomeName(P.x, P.z), give: n => { shards += n; updShards(); }, setTod: t => { tod = t; }, dpr: () => renderer.getPixelRatio(), combo: () => comboN, inLookZone, inMoveZone, showTip: () => { try { localStorage.removeItem(TIP_KEY); } catch(e){} $("tip").classList.add("show"); }, hideTip: () => { $("tip").classList.remove("show"); try { localStorage.setItem(TIP_KEY,"1"); } catch(e){} }, emote: k => mp.ws && mp.ws.send(JSON.stringify({ t: "emote", k })), tp: (x, y, z) => { P.x = x; P.y = y; P.z = z; P.vx = P.vy = P.vz = 0; }, B, plaza: () => plaza, orient: () => ({ phone: IS_PHONE, land: landPhone(), portrait: document.body.classList.contains("portrait-phone"), rotPaused, running, rest: $("stick").classList.contains("rest"), canLock: document.body.classList.contains("can-lock") }), orientCheck, joy: () => ({ ...joy }), night: () => curNight, wolves: () => fuds.map(w => ({ st: w.st, x: w.x, y: w.y, z: w.z, hp: w.hp, c: w.c.toArray() })), spawnWolf: (x, y, z) => !!spawnFud(x, y, z), wolfFx: () => WOLF ? WOLF.fx.length : 0, lookAtWolf: () => { const w = fuds[0]; if (!w) return false; const dx = w.c.x - P.x, dz = w.c.z - P.z, dy = w.c.y - (P.y + P.eye); P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); return true; }, lairNav: () => ({ show: $("lairNav").classList.contains("show"), d: $("lairD").textContent }), lairBeacon: () => LZ ? { beam: LZ.beam.visible, mark: LZ.mark.visible } : null };
