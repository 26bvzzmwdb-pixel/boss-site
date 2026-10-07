// $BOSS Sandbox: first-person build & explore (Phase 1, single-player beta).
// Original content: neon tiles, Rug-Buster drill, SOL shard veins (in-game items, no cash value), FUD clouds.
// Not connected to ranked play, wallets, or prizes.
import * as THREE from "./three.module.min.js";

const Q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const IS_TOUCH = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
if (IS_TOUCH) document.body.classList.add("touch");

import { SX, SY, SZ, CS, NCX, NCZ, B, PALETTE, world, idx, inB, get, rng, generate as genWorld, biomeName, pools, caches } from "./world.js";
const SAVE_KEY = "boss_sandbox_v2", OLD_KEY = "boss_sandbox_v1";
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
function save() { if (mp.on) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, seed, edits, shards, sel, p: [P.x, P.y, P.z, P.yaw, P.pitch], tod, upg, stats, Qi, qv: 2, qBase, hp: P.hp, daily, intro: introDone, dex: fish.dex, ach, char: charId, set: { snd: sndOn, mus: musOn, slow: lookSlow, look: lookMul } })); } catch (e) {} }
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
  return ind.length / 3;
}
function buildAll() { calcAllTop(); let tris = 0; for (let i = 0; i < NCX * NCZ; i++) tris += buildChunk(i); dirty.clear(); return tris; }

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
    if (ax === 1) { if (sd < 0) { P.ground = true; P.y = Math.floor(P.y + sd) + 1; } else P.y = Math.ceil(P.y + P.h) - P.h - .001; P.vy = 0; }
    else if (ax === 0) P.vx = 0; else P.vz = 0;
    return;
  }
}
function updPlayer(dt) {
  let f = input.f, s = input.s; const k = input.keys;
  if (k.KeyW || k.ArrowUp) f += 1; if (k.KeyS || k.ArrowDown) f -= 1; if (k.KeyD || k.ArrowRight) s += 1; if (k.KeyA || k.ArrowLeft) s -= 1;
  const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
  const wet = inPool(P.x, P.z) && P.y < (inPool(P.x, P.z) || {}).y; if (wet && !P.wet && P.vy < -3) { burst(P.x, P.y + .5, P.z, [0x28dcff, 0xffffff], 24, 4); noise(.3, 900, .15); } P.wet = wet;
  const sp = (boostT > 0 ? 2.1 : 1) * (wet ? .6 : 1) * ((input.sprint || k.ShiftLeft || k.ShiftRight || len > .95 && IS_TOUCH && joy.active && joy.mag > .95) ? 6.4 : 4.4);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const tx = (-sy * f + cy * s) * sp, tz = (-cy * f - sy * s) * sp;
  const acc = P.ground ? 14 : 5; P.vx += (tx - P.vx) * Math.min(1, acc * dt); P.vz += (tz - P.vz) * Math.min(1, acc * dt);
  const jumpEdge = input.jump || (k.Space && !spaceWas); spaceWas = !!k.Space;
  if (P.ground) P.dbl = true;
  if ((input.jump || k.Space) && P.ground) { P.vy = 8.3; P.ground = false; sfx.jump(); }
  else if (jumpEdge && !P.ground && upg.boots && P.dbl) { P.dbl = false; P.vy = 8; sfx.boost(); burst(P.x, P.y, P.z, [0x28dcff, 0xff4fd8, 0xffffff], 18, 3); trauma = Math.max(trauma, .15); stats.dj = (stats.dj || 0) + 1; }
  input.jump = false;
  P.vy = Math.max(-40, P.vy - 24 * (biomeNow === "MOON BASIN" ? .42 : 1) * dt);
  P.ground = false;
  moveAxis(1, P.vy * dt); moveAxis(0, P.vx * dt); moveAxis(2, P.vz * dt);
  P.x = Math.max(P.r + .01, Math.min(SX - P.r - .01, P.x)); P.z = Math.max(P.r + .01, Math.min(SZ - P.r - .01, P.z));
  if (P.y < -20) respawn();
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
  const want = Q.has("nofud") ? 0 : Math.max(night > .6 ? 3 : 0, boss.on && boss.phase === 2 ? 2 : 0);
  fudTimer -= dt; if (want === 0) fudTimer = 2; else if (fuds.length < want && fudTimer <= 0) { spawnFud(); fudTimer = 6 + Math.random() * 6; }
  for (let i = fuds.length - 1; i >= 0; i--) { const f = fuds[i], s = f.s; f.t += dt;
    const dx = P.x - s.position.x, dy = P.y + 1.2 - s.position.y, dz = P.z - s.position.z, d = Math.hypot(dx, dy, dz);
    const gone = want === 0; s.material.opacity = Math.max(0, Math.min(1, s.material.opacity + (gone ? -dt : dt)));
    if (gone && s.material.opacity <= 0) { scene.remove(s); s.material.dispose(); fuds.splice(i, 1); continue; }
    if (d < 26 && !gone) { const sp = 1.9 / Math.max(d, .01); s.position.x += dx * sp * dt; s.position.y += dy * sp * dt + Math.sin(f.t * 2) * .01; s.position.z += dz * sp * dt; }
    if (d < 1.1 && P.hurtCD <= 0 && !gone) { P.hurtCD = 1.6; P.vx -= dx / d * 9; P.vz -= dz / d * 9; P.vy = 5; const lost = upg.shield ? 0 : Math.min(1, shards); shards -= lost; updShards();
      pop(lost ? "FUD! −1 SHARD" : "FUD!", "#ff6a8a"); hurt(1); }
  }
}

// ---------------- mining / building ----------------
let mineT = 0, mineKey = "", hit = null, fudHit = null, bossHit = false, critHit = null;
const tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3();
function aim() {
  { const cp = Math.cos(P.pitch); tmpV.set(P.x, P.y + P.eye, P.z); tmpD.set(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp); }
  hit = raycast(tmpV, tmpD, REACH[upg.drill]);
  fudHit = null; bossHit = false; critHit = null; let best = hit ? hit.t : 9;
  if (boss.on) { const o = boss.g.position, lx = o.x - tmpV.x, ly = o.y - tmpV.y, lz = o.z - tmpV.z, t = lx * tmpD.x + ly * tmpD.y + lz * tmpD.z; if (t > 0 && t < 30) { const px = lx - tmpD.x * t, py = ly - tmpD.y * t, pz = lz - tmpD.z * t; if (px * px + py * py + pz * pz < (boss.kind !== "rug" ? (IS_TOUCH ? 3.2 : 2.6) : (IS_TOUCH ? 2.7 : 2)) ** 2 && (!hit || t < hit.t + 1)) { bossHit = true; hit = null; best = t; } } }
  for (const f of fuds) { const o = f.s.position, lx = o.x - tmpV.x, ly = o.y - tmpV.y, lz = o.z - tmpV.z, t = lx * tmpD.x + ly * tmpD.y + lz * tmpD.z;
    if (t < 0 || t > best) continue; const px = lx - tmpD.x * t, py = ly - tmpD.y * t, pz = lz - tmpD.z * t; if (px * px + py * py + pz * pz < .8 * .8) { best = t; fudHit = f; } }
  for (const c of critters) { const o = c.s.position, lx = o.x - tmpV.x, ly = o.y - tmpV.y, lz = o.z - tmpV.z, t = lx * tmpD.x + ly * tmpD.y + lz * tmpD.z;
    if (t < 0 || t > Math.min(best, 14)) continue; const px = lx - tmpD.x * t, py = ly - tmpD.y * t, pz = lz - tmpD.z * t; if (px * px + py * py + pz * pz < (IS_TOUCH ? .8 : .6) ** 2) { best = t; critHit = c; fudHit = null; bossHit = false; hit = null; } }
  if (!critHit && !bossHit && !fudHit) aimPool(); else poolHit = null;
}
let mineGrace = 0; // keeps mining briefly if the thumb wobbles off the button
function breakBlock(x, y, z, id, chained) {
  setBlock(x, y, z, 0); const c = B[id]; if (id === 22) fireworks(x + .5, y + .5, z + .5);
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
  else if (bossHit) { outline.visible = false; tgt.textContent = BOSSES[boss.kind].name + " · HOLD MINE TO BLAST"; }
  else if (hit && !fudHit) { outline.visible = true; outline.position.set(hit.x + .5, hit.y + .5, hit.z + .5); const bd = B[hit.id]; tgt.textContent = bd.name + (bd.drop ? `  ◆+${bd.drop}` : bd.hard === Infinity ? "  (unbreakable)" : ""); }
  else { outline.visible = false; tgt.textContent = fudHit ? "FUD CLOUD · HOLD TO ZAP" : ""; }
  if (input.mine) mineGrace = IS_TOUCH ? 0.28 : 0; else if (mineGrace > 0) mineGrace -= dt;
  const mining = input.mine || mineGrace > 0;
  let prog = 0;
  if (mining && critHit) { critHit.hp -= dt; prog = 1 - critHit.hp / .35; if (critHit.hp <= 0) zapCritter(critHit); mineKey = ""; mineT = 0; }
  else if (mining && bossHit) { bossDamage(DMG[upg.drill] * dt); mineKey = ""; mineT = 0; prog = 1 - boss.hp / boss.max; }
  else if (mining && fudHit) { fudHit.hp -= dt; prog = 1 - fudHit.hp / .7; if (fudHit.hp <= 0) { const p = fudHit.s.position; burst(p.x, p.y, p.z, ["#ff6a8a", "#ff3250", "#ffd0d8"], IS_TOUCH ? 30 : 60, 6); scene.remove(fudHit.s); fudHit.s.material.dispose(); fuds.splice(fuds.indexOf(fudHit), 1); spawnOrbs(p.x, p.y, p.z, 2, 0xff6a8a); stats.fud++; pop("FUD CLEARED ◆+2", "#14f195"); sfx.zap(); trauma = Math.max(trauma, .3); } mineKey = ""; mineT = 0; }
  else if (mining && hit && B[hit.id].hard !== Infinity) {
    const key = hit.x + "," + hit.y + "," + hit.z; if (key !== mineKey) { mineKey = key; mineT = 0; }
    mineT += dt; const bd = B[hit.id]; const need = Math.max(0.12, bd.hard * (IS_TOUCH ? 0.85 : 1) / SPEED[upg.drill]); minePitch = mineT / need; // slightly faster on phone
    prog = Math.min(1, mineT / need);
    const s = 1.004 - prog * .12 + Math.sin(time * 60) * .01 * prog; outline.scale.setScalar(s);
    coreGlow.material.color.setHex(bd.col); coreGlow.material.opacity = prog * .55;
    if (Math.random() < dt * (IS_TOUCH ? 14 : 30)) burst(hit.x + .5 + hit.n[0] * .55, hit.y + .5 + hit.n[1] * .55, hit.z + .5 + hit.n[2] * .55, [bd.col, 0xffffff], 1, 2);
    if (prog >= 1) breakBlock(hit.x, hit.y, hit.z, hit.id);
  } else if (!mining) { mineT = 0; mineKey = ""; outline.scale.setScalar(1); coreGlow.material.opacity = 0; }
  if (!mining) { outline.scale.setScalar(1); coreGlow.material.opacity = 0; }
  $("ring").setAttribute("stroke-dashoffset", (94.25 * (1 - prog)).toFixed(2));
  const firing = mining && (critHit || bossHit || fudHit || (hit && B[hit.id].hard !== Infinity)); isFiring = !!firing; if (!firing) minePitch = 0;
  laser.visible = !!firing; laser.material.color.setHex(LASER[upg.drill]); dTip.material.color.setHex(firing ? (Math.sin(time * 40) > 0 ? 0x14f195 : 0xffffff) : 0x9945ff); dRing.rotation.z += dt * (firing ? 30 : 2);
  if (firing) { dTip.getWorldPosition(tmpV); const end = critHit ? critHit.s.position.clone() : bossHit ? boss.eye.getWorldPosition(new THREE.Vector3()) : fudHit ? fudHit.s.position.clone() : new THREE.Vector3(hit.x + .5 + hit.n[0] * .5, hit.y + .5 + hit.n[1] * .5, hit.z + .5 + hit.n[2] * .5);
    laser.position.copy(tmpV); laser.lookAt(end); laser.scale.set(1, 1, tmpV.distanceTo(end)); laser.material.opacity = .6 + Math.random() * .4; }
}
function place() {
  if (!hit) return; const id = PALETTE[sel], bd = B[id];
  const x = hit.x + hit.n[0], y = hit.y + hit.n[1], z = hit.z + hit.n[2];
  if (!inB(x, y, z) || get(x, y, z)) return;
  if (x + 1 > P.x - P.r && x < P.x + P.r && z + 1 > P.z - P.r && z < P.z + P.r && y + 1 > P.y && y < P.y + P.h) return;
  if (bd.cost) { if (shards < bd.cost) { pop(`NEED ◆${bd.cost} SOL SHARDS`, "#ff6a8a"); return; } shards -= bd.cost; updShards(); }
  setBlock(x, y, z, id); burst(x + .5, y + .5, z + .5, [bd.col, 0xffffff], 14, 2); sfx.place(); drillKick = 1; stats.placed++; buzz(6);
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
let AC = null, master = null, sfxG = null, musG = null, noiseBuf = null, hum = null, humF = null, humG = null;
let sndOn = true, musOn = true, minePitch = 0, isFiring = false;
function note(f, d, type = "square", v = .08, slide = 0, at = 0, dest = null, lp = 0) { if (!AC) return; const t = at || AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + d); let n = o.connect(g);
  if (lp) { const fl = AC.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; n = g.connect(fl); } n.connect(dest || sfxG); o.start(t); o.stop(t + d + .02); }
function tone(f, d, type, v, slide) { note(f, d, type, v, slide); }
function noise(d, f = 1200, v = .15, q = 1, at = 0, dest = null, type = "bandpass") { if (!AC) return; const t = at || AC.currentTime, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl).connect(g).connect(dest || sfxG); s.start(t, Math.random() * .5); s.stop(t + d + .02); }
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const BRK_F = { 2: 500, 3: 900, 14: 1800, 15: 2400, 16: 900, 17: 3200, 7: 3000, 13: 2600, 6: 1400 };
const sfx = {
  jump: () => note(300, .12, "square", .035, 200),
  boost: () => { note(420, .18, "sawtooth", .04, 600, 0, null, 2400); noise(.18, 3000, .06); },
  brk: id => { const f = BRK_F[id] || 1200; noise(.13, f, .22, 1.2); note(f / 8, .1, "triangle", .12, -60); },
  place: () => { note(520, .05, "square", .04); noise(.05, 4000, .05); },
  click: () => note(880, .03, "square", .025),
  vein: n => { noise(.2, 2500, .2, .8); const b = n >= 10 ? 84 : n >= 5 ? 79 : n >= 3 ? 76 : 72; [0, 4, 7].forEach((s, i) => note(mtof(b + s), .22, "triangle", .07, 0, AC ? AC.currentTime + i * .05 : 0)); },
  pick: c => { const m = 76 + Math.min(14, c); note(mtof(m), .09, "sine", .06); note(mtof(m + 12), .07, "triangle", .025); },
  hurt: () => { note(140, .25, "sawtooth", .08, -60, 0, null, 900); noise(.15, 400, .15); },
  zap: () => { note(1200, .2, "sawtooth", .045, -900, 0, null, 3000); noise(.25, 1800, .1); },
  quest: () => { if (!AC) return; const t = AC.currentTime; [72, 76, 79, 84, 88].forEach((m, i) => note(mtof(m), .3, "triangle", .07, 0, t + i * .07)); note(mtof(60), .6, "sawtooth", .03, 0, t, null, 1200); },
  buy: () => { if (!AC) return; const t = AC.currentTime; [67, 74, 79, 86].forEach((m, i) => note(mtof(m), .2, "square", .04, 0, t + i * .05, null, 3000)); },
  roar: () => { note(220, 1.2, "sawtooth", .12, -170, 0, null, 900); note(110, 1.4, "square", .08, -70, 0, null, 500); noise(1.2, 300, .2, .7); },
  bshot: () => note(660, .25, "square", .035, -420, 0, null, 1800),
  bhit: () => noise(.06, 3500, .05, 2),
  win: () => { if (!AC) return; const t = AC.currentTime; [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((m, i) => note(mtof(m), .35, "square", .05, 0, t + i * .09, null, 2600)); noise(1.5, 600, .25, .5); },
  combo: c => note(mtof(84 + Math.min(12, c / 5)), .15, "square", .04, 0, 0, null, 3500),
  bounce: () => { note(170, .38, "sine", .1, 650); note(340, .28, "triangle", .04, 900); },
  fw: () => { if (!AC) return; const t = AC.currentTime; note(700, .7, "sine", .03, 1500, t); noise(.7, 5000, .04, 3, t); for (let i = 0; i < 6; i++) noise(.08, 2000 + Math.random() * 4000, .12, 1, t + .75 + i * .06); note(60, .6, "sine", .15, -30, t + .72); },
  cache: () => { if (!AC) return; const t = AC.currentTime; [84, 88, 91, 96, 100].forEach((m, i) => note(mtof(m), .4, "triangle", .06, 0, t + i * .07)); noise(1, 9000, .05, 1, t, null, "highpass"); },
  ach: () => { if (!AC) return; const t = AC.currentTime; [72, 79, 84, 88, 91].forEach((m, i) => note(mtof(m), .32, "square", .04, 0, t + i * .08, null, 3000)); note(mtof(60), 1, "sawtooth", .03, 0, t, null, 1500); },
  event: () => { if (!AC) return; const t = AC.currentTime; [60, 67, 72, 79].forEach((m, i) => note(mtof(m), .6, "sawtooth", .03, 0, t + i * .12, null, 2200)); },
  key: m => { note(mtof(m), .45, "triangle", .07); note(mtof(m + 12), .3, "sine", .03); },
  step: id => noise(.045, (BRK_F[id] || 1200) * .7, .03, 1.5),
  bark: () => { note(520, .08, "square", .05, 260, 0, null, 2000); setTimeout(() => note(600, .1, "square", .05, 300, 0, null, 2000), 130); },
  shimmer: v => { note(mtof(96 + Math.floor(Math.random() * 5) * 2), .5, "sine", v); },
};
function initAudio() { if (AC) { if (AC.state === "suspended") AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = AC.createGain(); master.gain.value = .9; master.connect(AC.destination);
  sfxG = AC.createGain(); sfxG.gain.value = sndOn ? 1 : 0; sfxG.connect(master); musG = AC.createGain(); musG.gain.value = musOn ? .55 : 0; musG.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  hum = AC.createOscillator(); hum.type = "sawtooth"; hum.frequency.value = 90; humF = AC.createBiquadFilter(); humF.type = "lowpass"; humF.frequency.value = 700; humG = AC.createGain(); humG.gain.value = 0;
  hum.connect(humF).connect(humG).connect(sfxG); hum.start(); musNext = AC.currentTime + .1;
  try { const rv = AC.createConvolver(), L = Math.floor(AC.sampleRate * 2.4), ib = AC.createBuffer(2, L, AC.sampleRate); for (let ch = 0; ch < 2; ch++) { const dd = ib.getChannelData(ch); for (let i = 0; i < L; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 2.6); } rv.buffer = ib;
    const rg = AC.createGain(); rg.gain.value = .42; musG.connect(rv); rv.connect(rg).connect(master); const ss = AC.createGain(); ss.gain.value = .14; sfxG.connect(ss).connect(rv); } catch (e) {} }
// music: 4-chord synthwave loop, arps soften at night, drums kick in during the boss fight
const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], PROG_N = [[57, 60, 64], [53, 57, 60], [55, 58, 62], [52, 55, 59]];
const LEAD = { "NEON FLATS": "square", "PUMP DUNES": "sawtooth", "SIGNAL GROVE": "triangle", "FROST CHAIN": "sine", "MOON BASIN": "sine", "GLITCH WASTES": "square", "UNDERGROUND": "triangle" };
const MOTIF = [[0, -1, 2, -1, 4, -1, 2, 1], [4, -1, 3, 2, 0, -1, -1, -1], [2, 4, 5, 4, 2, -1, 0, -1], [0, -1, 0, 2, 4, -1, 7, -1]], SCALE = [0, 2, 3, 5, 7, 9, 10, 12];
let musStep = 0, musNext = 0;
function audioTick() { if (!AC) return; const t = AC.currentTime;
  humG.gain.setTargetAtTime(isFiring && running ? .028 : 0, t, .03); hum.frequency.setTargetAtTime(70 + minePitch * 170 + upg.drill * 14, t, .05); humF.frequency.setTargetAtTime(500 + minePitch * 1800, t, .05);
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
function updSetBtns() { const a = $("sndBtn"), b = $("musBtn"); if (a) a.textContent = "SFX: " + (sndOn ? "ON" : "OFF"); if (b) b.textContent = "MUSIC: " + (musOn ? "ON" : "OFF");
  if (sfxG) sfxG.gain.value = sndOn ? 1 : 0; if (musG) musG.gain.value = musOn ? .55 : 0; }
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

// ---------------- controls: desktop ----------------
let running = false, locked = false;
function maybeShowTip() {
  if (!IS_TOUCH || Q.has("notip")) return;
  try { if (localStorage.getItem(TIP_KEY) === "1") return; } catch (e) {}
  $("tip").classList.add("show");
}
function startGame() { initAudio(); $("menu").classList.add("hide"); document.body.classList.remove("inmenu"); closeLab(true); running = true; last = performance.now(); if (!introDone && !mp.on && !Q.has("nointro")) intro();
  maybeShowTip();
  if (!IS_TOUCH && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } }
function pause() { running = false; document.body.classList.add("inmenu"); input.mine = false; $("menu").classList.remove("hide"); $("playBtn").textContent = "RESUME"; menuStats(); save(); if (document.pointerLockElement) document.exitPointerLock(); }
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
  return !!(el.closest && el.closest(".tbtn, #palette, #pauseBtn, #labBtn, #lab, #lookSlow, #tip, #menu, .chip, #shards"));
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
  T.addEventListener("touchstart", () => initAudio(), { passive: true, once: true });
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
        touchLook(dx, dy);
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
  // MINE doubles as a look pad: slide your thumb while holding to aim and dig at the same time.
  const mineLook = { on: false, x: 0, y: 0, moved: 0 };
  $("bMine").addEventListener("pointermove", e => { if (!mineLook.on) return; const dx = e.clientX - mineLook.x, dy = e.clientY - mineLook.y; mineLook.x = e.clientX; mineLook.y = e.clientY; mineLook.moved += Math.abs(dx) + Math.abs(dy); touchLook(dx, dy, 1.15); });
  hold("bMine", e => { input.mine = true; mineDownAt = performance.now(); mineGrace = 0.28; mineLook.on = true; mineLook.x = e.clientX; mineLook.y = e.clientY; mineLook.moved = 0; },
    () => { const held = performance.now() - mineDownAt; input.mine = false; mineLook.on = false;
      if (held < 220 && mineLook.moved < 12) trySoftTapMine(); // short tap = soft-block one-shot
      else mineGrace = 0.28; // brief grace after a hold so wobble doesn't cancel
    });
  hold("bBuild", () => { aim(); place(); }, null);
  hold("bJump", () => { input.jump = true; }, null);
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
  blockMat.emissiveIntensity = .55 + (1 - day) * .65;
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
const stats = { mined: 0, veins: 0, placed: 0, prisms: 0, golds: 0, cores: 0, fud: 0, kills: 0, combos: 0, dj: 0 };
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
  $("dailyL").textContent = dailyLine();
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
  { t: "Zap 3 FUD clouds", h: "They drift in at night. Hold MINE on them", k: "fud", n: 3, r: 8 },
  { t: "Mine a SOL Core vein", h: "Rarest. Down near the Genesis floor", k: "cores", n: 1, r: 15 },
  { t: "Bust THE RUG PULLER", h: "Summon it from the ⚡ LAB, blast its eye", k: "kills", n: 1, r: 40 },
  { t: "Build the BOSS DRILL", h: "The final ⚡ LAB upgrade", k: "drill", n: 4, r: 25, abs: 1 },
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
const DN = IS_TOUCH ? 48 : 96, dMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.16, .16, .16), new THREE.MeshLambertMaterial({ emissive: 0x222222 }), DN);
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

// ---------------- THE RUG PULLER (boss) ----------------
const boss = { kind: "rug", on: false, g: null, eye: null, rug: null, hp: 0, max: 0, t: 0, shotT: 2, phase: 1, shots: [], flash: 0 };
const rugTex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 168; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 168); gr.addColorStop(0, "#3a0838"); gr.addColorStop(.5, "#6a1050"); gr.addColorStop(1, "#2a0628"); g.fillStyle = gr; g.fillRect(0, 12, 256, 144);
  g.strokeStyle = "#ffd24a"; g.lineWidth = 4; g.strokeRect(10, 20, 236, 128); g.lineWidth = 2; g.strokeStyle = "#ff4fd8";
  for (let x = 24; x < 240; x += 32) for (const y of [40, 128]) { g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 10, y); g.lineTo(x, y + 10); g.lineTo(x - 10, y); g.closePath(); g.stroke(); }
  g.strokeStyle = "rgba(255,210,74,.5)"; for (let x = 4; x < 256; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 14); g.moveTo(x, 154); g.lineTo(x, 168); g.stroke(); }
  g.font = "900 22px Orbitron,Verdana"; g.textAlign = "center"; g.fillStyle = "#ffd24a"; g.fillText("RUG", 50, 92); g.fillText("PULL", 206, 92);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const shotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "#fff"); r.addColorStop(.25, "#ff6a8a"); r.addColorStop(.6, "rgba(255,50,80,.5)"); r.addColorStop(1, "rgba(255,50,80,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const BOSSES = { rug: { name: "THE RUG PULLER", hp: 200, tag: "Blast its eye with your drill!" }, king: { name: "THE FUD KING", hp: 250, tag: "Zap the crowned cloud! It splits into minions" }, whale: { name: "THE DUMP WHALE", hp: 260, tag: "It DIVES at you. Sidestep, then drill it!" } };
const BOSS_TXT = { rug: ["IT'S PULLING THE RUG!", "RUG BUSTED!"], king: ["THE KING IS SPLITTING!", "KING DETHRONED!"], whale: ["THE WHALE IS DUMPING!", "WHALE BEACHED!"] };
const whaleTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.translate(128, 132);
  g.shadowColor = "#28dcff"; g.shadowBlur = 28; g.fillStyle = "#123a5e"; g.strokeStyle = "#28dcff"; g.lineWidth = 6; g.beginPath(); g.ellipse(-6, 6, 92, 58, 0, 0, 7); g.fill(); g.shadowBlur = 0; g.stroke();
  g.fillStyle = "#123a5e"; g.beginPath(); g.moveTo(78, -4); g.lineTo(122, -40); g.lineTo(112, 4); g.lineTo(122, 44); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#bfefff"; g.beginPath(); g.ellipse(-14, 34, 64, 22, 0, 0, Math.PI); g.fill(); g.strokeStyle = "#5fd0ff"; g.lineWidth = 2; for (let i = -60; i < 40; i += 14) { g.beginPath(); g.moveTo(i, 36); g.lineTo(i + 4, 52); g.stroke(); }
  g.fillStyle = "#ff3250"; g.beginPath(); g.arc(-52, -8, 11, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(-55, -11, 4, 0, 7); g.fill();
  g.strokeStyle = "#ff3250"; g.lineWidth = 6; g.beginPath(); g.moveTo(-70, -26); g.lineTo(-38, -20); g.stroke();
  g.fillStyle = "#28dcff"; for (const [x, y] of [[-20, -78], [-4, -96], [12, -80]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
  g.font = "900 22px Orbitron,Verdana"; g.textAlign = "center"; g.fillStyle = "#e0f8ff"; g.fillText("DUMP WHALE", 0, 104); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const kingTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.translate(128, 140); const r = 80;
  g.fillStyle = "#24163c"; g.strokeStyle = "#b46aff"; g.lineWidth = 7; g.shadowColor = "#9945ff"; g.shadowBlur = 30;
  g.beginPath(); g.arc(-r * .55, 10, r * .55, 0, 7); g.arc(0, -r * .25, r * .7, 0, 7); g.arc(r * .6, 12, r * .5, 0, 7); g.arc(0, r * .32, r * .62, 0, 7); g.fill(); g.shadowBlur = 0; g.stroke();
  g.fillStyle = "#ffd24a"; g.beginPath(); g.moveTo(-46, -70); g.lineTo(-46, -112); g.lineTo(-24, -88); g.lineTo(0, -122); g.lineTo(24, -88); g.lineTo(46, -112); g.lineTo(46, -70); g.closePath(); g.fill();
  g.fillStyle = "#ff3250"; for (const x of [-26, 0, 26]) { g.beginPath(); g.arc(x, -80, 5, 0, 7); g.fill(); }
  g.strokeStyle = "#ff3250"; g.lineWidth = 7; g.beginPath(); g.moveTo(-44, -20); g.lineTo(-14, -6); g.moveTo(44, -20); g.lineTo(14, -6); g.stroke();
  g.fillStyle = "#ff3250"; g.beginPath(); g.arc(-26, 6, 9, 0, 7); g.arc(26, 6, 9, 0, 7); g.fill(); g.strokeStyle = "#ffd0d8"; g.lineWidth = 5; g.beginPath(); g.arc(0, 50, 24, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  g.font = "900 26px Orbitron,Verdana"; g.textAlign = "center"; g.fillStyle = "#e8d0ff"; g.fillText("FUD KING", 0, 96); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const shotMat = new THREE.SpriteMaterial({ map: null, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const whaleShotMat = new THREE.SpriteMaterial({ map: null, color: 0x28dcff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const kingShotMat = new THREE.SpriteMaterial({ map: null, color: 0xb46aff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const bossGroups = {};
function makeBoss(kind) { const g = new THREE.Group(); let eye, ring, rug = null;
  if (kind === "rug") { rug = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.9, 16, 10), new THREE.MeshBasicMaterial({ map: rugTex, side: THREE.DoubleSide, transparent: true }));
    rug.userData.base = rug.geometry.attributes.position.array.slice(); g.add(rug);
    eye = new THREE.Mesh(new THREE.SphereGeometry(.55, 20, 14), new THREE.MeshBasicMaterial({ color: 0xff3250 })); eye.position.z = .35; g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 10), new THREE.MeshBasicMaterial({ color: 0x110010 })); pupil.position.z = .42; eye.add(pupil);
    ring = new THREE.Mesh(new THREE.TorusGeometry(.8, .07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd24a })); ring.position.z = .3; g.add(ring); }
  else { const body = new THREE.Sprite(new THREE.SpriteMaterial({ map: kind === "whale" ? whaleTex : kingTex, transparent: true })); body.scale.set(5.4, 5.4, 1); g.add(body); g.userData.body = body;
    eye = new THREE.Mesh(new THREE.SphereGeometry(.4, 14, 10), new THREE.MeshBasicMaterial({ color: 0xb46aff, transparent: true, opacity: .0 })); eye.position.z = .2; g.add(eye);
    ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, .06, 6, 40), new THREE.MeshBasicMaterial({ color: 0xb46aff, transparent: true, opacity: .6 })); ring.rotation.x = Math.PI / 2; g.add(ring); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: shotTex, color: kind === "rug" ? 0xff4fd8 : kind === "whale" ? 0x28dcff : 0x9945ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(6, 6, 1); halo.position.z = -.2; g.add(halo);
  bossGroups[kind] = { g, eye, ring, rug }; }
function summonBoss(kind = "rug") { if (boss.on || upg.drill < 2 || mp.on) return false; if (kind === "king" && stats.kills < 1) return false; if (kind === "whale" && stats.kills < 2) return false; if (!bossGroups[kind]) makeBoss(kind);
  shotMat.map = shotTex; kingShotMat.map = shotTex; whaleShotMat.map = shotTex; boss.diveT = 6; boss.hitCd = 0; const bg = bossGroups[kind]; boss.kind = kind; boss.g = bg.g; boss.eye = bg.eye; boss.ring = bg.ring; boss.rug = bg.rug;
  boss.on = true; boss.phase = 1; boss.t = 0; boss.shotT = 3.5; boss.max = Math.round(BOSSES[kind].hp * (1 + .45 * stats.kills)); boss.hp = boss.max;
  boss.g.position.set(P.x + Math.sin(-P.yaw) * 14, P.y + 14, P.z - Math.cos(P.yaw) * 14); scene.add(boss.g); $("bossbar").classList.add("show"); updBossBar();
  banner(BOSSES[kind].name, BOSSES[kind].tag); sfx.roar(); trauma = .8; buzz(120); return true; }
function updBossBar() { $("bossFill").style.width = (100 * Math.max(0, boss.hp) / boss.max).toFixed(1) + "%"; $("bossLv").textContent = `${BOSSES[boss.kind].name} · LV ${stats.kills + 1}`; }
function bossDamage(n) { if (!boss.on) return; boss.hp -= n; boss.flash = .08; updBossBar(); if (Math.random() < .25) { const p = boss.eye.getWorldPosition(tmpV); burst(p.x, p.y, p.z, [0xffd24a, 0xff4fd8, 0xffffff], 2, 5); sfx.bhit(); } trauma = Math.max(trauma, .12);
  if (boss.phase === 1 && boss.hp < boss.max / 2) { boss.phase = 2; banner(BOSS_TXT[boss.kind][0], "Phase 2: FUD minions incoming"); sfx.roar(); trauma = .6; fudTimer = 0; }
  if (boss.hp <= 0) bossEnd(true); }
function bossEnd(won, silent) { if (!boss.on) return; boss.on = false; const p = boss.g.position.clone(); scene.remove(boss.g); $("bossbar").classList.remove("show");
  for (const s of boss.shots) scene.remove(s.s); boss.shots.length = 0; stats.lastBoss = boss.kind;
  if (won) { stats.kills++; stats["k_" + boss.kind] = (stats["k_" + boss.kind] | 0) + 1; charJoy = 1; const prize = 40 + 10 * stats.kills; for (let i = 0; i < 6; i++) setTimeout(() => { burst(p.x + (Math.random() - .5) * 3, p.y + (Math.random() - .5) * 2, p.z + (Math.random() - .5) * 3, [0xffd24a, 0xff4fd8, 0x14f195, 0xffffff], IS_TOUCH ? 30 : 60, 8); debris(p.x, p.y, p.z, [0xff4fd8, 0xffd24a, 0x6a1050][i % 3], 6); trauma = 1; }, i * 120);
    spawnOrbs(p.x, p.y, p.z, prize, 0xffd24a); banner(BOSS_TXT[boss.kind][1], `◆+${prize} SOL shards · next one is tougher`); sfx.win(); buzz(200); save(); }
  else if (!silent) banner("IT GOT AWAY…", "Summon it again from the ⚡ LAB"); }
function updBoss(dt, time) { if (!boss.on) return; const g = boss.g; boss.t += dt; const a = boss.t * .35;
  let tx = P.x + Math.cos(a) * 8, tz = P.z + Math.sin(a) * 8; tx = Math.max(2, Math.min(SX - 2, tx)); tz = Math.max(2, Math.min(SZ - 2, tz));
  let gy = Math.max(topH[Math.floor(tx) + Math.floor(tz) * SX] + 4, P.y + 4 + Math.sin(boss.t * .8) * 1.5);
  let k = Math.min(1, dt * 1.3);
  if (boss.kind === "whale") { const was = boss.diveT; boss.diveT -= dt; boss.hitCd -= dt; if (was > 1.2 && boss.diveT <= 1.2) { pop("🐋 DUMP DIVE INCOMING! MOVE!", "#28dcff"); sfx.roar(); }
    if (boss.diveT <= 0) { if (!boss.dv) boss.dv = [P.x, P.y + 1.2, P.z]; tx = boss.dv[0]; tz = boss.dv[2]; gy = boss.dv[1]; k = Math.min(1, dt * 3.2); if (Math.random() < .6) burst(g.position.x, g.position.y, g.position.z, [0x28dcff, 0xbfefff], 2, 2);
      if (boss.hitCd <= 0 && g.position.distanceTo(tmpV.set(P.x, P.y + 1, P.z)) < 2.3) { boss.hitCd = 1.5; const ax = P.x - g.position.x, az = P.z - g.position.z, al = Math.hypot(ax, az) || 1; P.vx += ax / al * 9; P.vz += az / al * 9; P.vy = 6; pop("DUMPED ON! −1", "#ff6a8a"); hurt(1); if (!boss.on) return; }
      if (boss.diveT < -1.5) { boss.diveT = boss.phase === 2 ? 5 : 7; boss.dv = null; trauma = Math.max(trauma, .3); } } } g.position.x += (tx - g.position.x) * k; g.position.y += (gy - g.position.y) * k; g.position.z += (tz - g.position.z) * k;
  g.lookAt(P.x, P.y + P.eye, P.z); boss.ring.rotation.z += dt * (boss.phase === 2 ? 5 : 2);
  if (boss.kind !== "rug") { const bd = g.userData.body; bd.material.rotation = Math.sin(boss.t * 1.3) * .12; const sc = (boss.kind === "whale" ? 6.2 : 5.4) * (1 + Math.sin(boss.t * 2.4) * .05) * (boss.flash > 0 ? 1.08 : 1); bd.scale.set(sc, sc, 1); bd.material.color.setHex(boss.flash > 0 ? 0xffffff : boss.phase === 2 ? 0xffb0ff : 0xffffff); }
  else { const pa = boss.rug.geometry.attributes.position, b = boss.rug.userData.base; for (let i = 0; i < pa.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; pa.array[i * 3 + 2] = Math.sin(x * 1.5 + boss.t * 4) * .28 + Math.sin(y * 2 + boss.t * 3) * .12 - Math.abs(x) * .1; } pa.needsUpdate = true; }
  boss.flash -= dt; if (boss.kind === "rug") boss.eye.material.color.setHex(boss.flash > 0 ? 0xffffff : boss.phase === 2 ? 0xff8a00 : 0xff3250); boss.eye.scale.setScalar(1 + Math.sin(time * 6) * .06 + (boss.flash > 0 ? .15 : 0));
  boss.shotT -= dt; if (boss.shotT <= 0) { const K = boss.kind !== "rug", W = boss.kind === "whale"; boss.shotT = W ? (boss.phase === 2 ? 3.2 : 4.2) : K ? (boss.phase === 2 ? 2.8 : 3.4) : (boss.phase === 2 ? 1.9 : 2.8); const n = K ? (boss.phase === 2 ? 7 : 5) : (boss.phase === 2 ? 3 : 1), o = boss.eye.getWorldPosition(new THREE.Vector3());
    for (let i = 0; i < n; i++) { const d = new THREE.Vector3(P.x - o.x, P.y + 1.2 - o.y, P.z - o.z).normalize(); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (n - 1) / 2) * (K ? .22 : .28));
      const s = new THREE.Sprite(W ? whaleShotMat : K ? kingShotMat : shotMat); s.scale.set(K ? 1.1 : .9, K ? 1.1 : .9, 1); s.position.copy(o); scene.add(s); boss.shots.push({ s, v: d.multiplyScalar(K ? (boss.phase === 2 ? 5 : 4.2) : (boss.phase === 2 ? 7 : 5.5)), l: 5 }); } sfx.bshot(); }
  for (let i = boss.shots.length - 1; i >= 0; i--) { const q = boss.shots[i], s = q.s; q.l -= dt; s.position.addScaledVector(q.v, dt);
    const dx = P.x - s.position.x, dy = P.y + 1 - s.position.y, dz = P.z - s.position.z;
    if (dx * dx + dy * dy + dz * dz < .55) { scene.remove(s); boss.shots.splice(i, 1); P.vx -= q.v.x * .8; P.vz -= q.v.z * .8; P.vy = 4; const dm = boss.phase === 2 && boss.kind === "rug" ? 2 : 1; pop(`RUGGED! −${dm}`, "#ff6a8a"); hurt(dm); if (!boss.on) return; continue; }
    if (q.l <= 0 || get(Math.floor(s.position.x), Math.floor(s.position.y), Math.floor(s.position.z))) { burst(s.position.x, s.position.y, s.position.z, [0xff3250, 0xff6a8a], 8, 3); scene.remove(s); boss.shots.splice(i, 1); } }
  if (Math.hypot(g.position.x - P.x, g.position.z - P.z) > 45) bossEnd(false); }

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
  if (f < 48) { resHigh = 0; if (++resLow >= 1 && pr > .75) { renderer.setPixelRatio(Math.max(.75, pr - .25)); resize(); } } else if (f > 58) { resLow = 0; if (++resHigh >= 4 && pr < cap) { renderer.setPixelRatio(Math.min(cap, pr + .25)); resize(); resHigh = 0; } } }

// ---------------- first-minute: drop-in intro ----------------
let introDone = false;
let introFx = 0;
function intro() { introFx = 1; introDone = true; P.y = plaza.y + 26; P.vy = -2; P.pitch = -.35; banner("WELCOME TO THE $BOSS SANDBOX", "Dig, build, and bust the rug"); sfx.boost(); met.t = 28; save(); }
let wasAir = false;
function landCheck() { if (!P.ground) { if (P.vy < -14) wasAir = true; return; } if (wasAir) { wasAir = false; trauma = .7; buzz(60); burst(P.x, P.y + .1, P.z, [0x28dcff, 0xff4fd8, 0xffd24a, 0xffffff], IS_TOUCH ? 40 : 80, 7); sfx.brk(13); note(70, .5, "sine", .2, -40); } }

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
  { t: "Hit a ×10 combo twice", k: "combos", n: 2 }, { t: "Mine 2 SOL Prism veins", k: "prisms", n: 2 }, { t: "Zap 4 FUD clouds", k: "fud", n: 4 }, { t: "Build 25 pieces", k: "placed", n: 25 }, { t: "Mine 12 SOL veins", k: "veins", n: 12 }, { t: "Catch 3 fish", k: "fish", n: 3 }, { t: "Zap a Diamond Hands", k: "diamond", n: 1 }, { t: "Catch 2 fish at night", k: "fish", n: 2 } ];
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function dailyDef() { let h = 0; for (const ch of daily.key) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0; return DPOOL[h % DPOOL.length]; }
function dailyEnsure() { const k = todayKey(); if (daily.key === k) return; daily.key = k; daily.done = false; daily.base = {}; for (const s in stats) daily.base[s] = stats[s] || 0; }
function dailyVal() { const q = dailyDef(); return Math.max(0, Math.min(q.n, (stats[q.k] || 0) - (daily.base[q.k] || 0))); }
function dailyReward() { return 20 + Math.min(6, daily.streak) * 5; }
function dailyLine() { if (mp.on) return ""; dailyEnsure(); const q = dailyDef(); return daily.done ? `☀ DAILY DONE · streak ${daily.streak} · new one tomorrow` : `☀ DAILY: ${q.t} ${dailyVal()}/${q.n} · ◆+${dailyReward()}`; }
function dailyTick() { if (mp.on) return; dailyEnsure(); if (!daily.done && dailyVal() >= dailyDef().n) { const y = new Date(Date.now() - 864e5), yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    daily.streak = daily.last === yk ? daily.streak + 1 : 1; daily.last = daily.key; const r = dailyReward(); daily.done = true; shards += r; updShards(); banner("DAILY COMPLETE!", `◆+${r} · streak ${daily.streak} 🔥`); sfx.quest(); save(); } updDaily(); }

// ---------------- screenshot: saves a PNG on this device (never uploaded) ----------------
let wantShot = false, lastShotInfo = null;
function takeShot() { wantShot = false; try { const w = canvas.width, h = canvas.height, c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.drawImage(canvas, 0, 0);
    const u = Math.max(1, w / 900); g.fillStyle = "rgba(8,6,24,.7)"; g.fillRect(0, h - 44 * u, w, 44 * u); g.font = `900 ${18 * u}px Orbitron,Verdana`; g.fillStyle = "#ffd24a"; g.textBaseline = "middle"; g.fillText("$BOSS SANDBOX", 14 * u, h - 22 * u);
    g.font = `700 ${11 * u}px Orbitron,Verdana`; g.fillStyle = "#cfefff"; g.textAlign = "right"; g.fillText(`◆ ${shards} SOL shards (in-game only) · Drill MK ${["", "I", "II", "III", "IV"][upg.drill]} · ${stats.kills} bosses busted`, w - 14 * u, h - 22 * u);
    const url = c.toDataURL("image/png"); lastShotInfo = { w, h, bytes: url.length }; lastShot = { url, c }; const d = new Date(), name = `boss-sandbox-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}.png`;
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
  $("playBtn").textContent = running || !any ? ($("playBtn").textContent === "RESUME" ? "RESUME" : "PLAY") : "CONTINUE"; $("dailyM").textContent = dailyLine(); $("lookV").textContent = Math.round(lookMul * 100) + "%"; }
$("lookDn").addEventListener("click", () => { lookMul = Math.max(.4, +(lookMul - .1).toFixed(2)); menuStats(); save(); });
$("lookUp").addEventListener("click", () => { lookMul = Math.min(2.2, +(lookMul + .1).toFixed(2)); menuStats(); save(); });
$("howBtn").addEventListener("click", () => $("how").classList.toggle("open"));

// ---------------- NEON POOLS + FISHING (cast, bite timing, hold-to-reel minigame) ----------------
const waterU = { uT: { value: 0 }, uNight: { value: 0 } };
const waterMat = new THREE.ShaderMaterial({ uniforms: waterU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform float uT, uNight; varying vec2 vU; varying vec3 vW; void main(){ vec2 c = vU*2.0-1.0; float r = length(c); if (r > 1.0) discard;
    float w = sin(vW.x*2.3+uT*1.7)*sin(vW.z*2.1-uT*1.3) + sin((vW.x+vW.z)*3.1+uT*2.4)*.5; float ring = smoothstep(.06,.0,abs(fract(r*3.0-uT*.25)-.5)-.44);
    vec3 col = mix(vec3(.05,.25,.55), vec3(.1,.85,.95), .5+.25*w); col = mix(col, vec3(1.0,.35,.85), ring*.35) + vec3(smoothstep(.95,1.0,r))*.6;
    gl_FragColor = vec4(col*(1.0+uNight*.3), .72 + .1*w);
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
      fish.pool = poolHit.q; fish.st = "wait"; fish.t = (2 + Math.random() * 4) / (1 + (rod - 1) * .4); note(500, .25, "sine", .05, -300); noise(.2, 2500, .08); fLine.visible = true; burst(poolHit.x, poolHit.q.y, poolHit.z, [0x28dcff, 0xffffff], 10, 2); stats.casts = (stats.casts || 0) + 1; return true; }
    return poolHit != null && down; }
  const b = fish.bob.position; dTip.getWorldPosition(tmpV); const la = lineGeo.attributes.position; la.setXYZ(0, tmpV.x, tmpV.y, tmpV.z); la.setXYZ(1, b.x, b.y, b.z); la.needsUpdate = true;
  if (Math.hypot(b.x - P.x, b.z - P.z) > 16) { fishEnd("LINE SNAPPED (TOO FAR)", "#ff6a8a"); return false; }
  if (fish.st === "wait") { b.y = fish.pool.y + .05 + Math.sin(time * 3) * .03; fish.t -= dt; if (press) { fishEnd("REELED IN EARLY", "#cfefff"); return true; }
    if (fish.t <= 0) { fish.st = "bite"; fish.t = .95 + (rod - 1) * .25; fish.sp = rollFish(ev.k === "aurora" ? 1 : night, biomeName(fish.pool.x, fish.pool.z)); pop("❗ BITE! TAP NOW", "#ffd24a"); note(1320, .08, "square", .06); note(1760, .1, "square", .05, 0, AC ? AC.currentTime + .09 : 0); buzz(40); burst(b.x, b.y, b.z, [0x28dcff, 0xffffff], 14, 3); trauma = Math.max(trauma, .15); } return true; }
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
    if (inZ && Math.random() < dt * 10) note(300 + fish.prog * 500, .04, "triangle", .02);
    if (fish.prog >= 1) { stats.fish = (stats.fish || 0) + 1; charJoy = 1; fish.dex[sp.n] = (fish.dex[sp.n] || 0) + 1; spawnOrbs(b.x, b.y + .3, b.z, sp.v, parseInt(sp.c.slice(1), 16)); banner(`CAUGHT: ${sp.n}`, `${sp.r} · ◆+${sp.v} SOL shards${fish.dex[sp.n] === 1 ? " · NEW IN FISHDEX!" : ""}`);
      burst(b.x, b.y + .3, b.z, [parseInt(sp.c.slice(1), 16), 0xffffff, 0x28dcff], IS_TOUCH ? 30 : 60, 6); sfx.vein(sp.v); trauma = Math.max(trauma, sp.v >= 12 ? .6 : .25); buzz(60); fishEnd(); save(); }
    else if (fish.prog <= 0) fishEnd(`${sp.n} GOT AWAY`, "#ff6a8a"); return true; }
  return false; }
function updWater(dt, time, night) { waterU.uT.value = time; waterU.uNight.value = night; }

// ---------------- characters ($BOSS runner + holder skins) and camera views ----------------
const CHARS = [
  ["base_climb", "Cave Climber", 0], ["base_factory", "Factory Worker", 0], ["base_grave", "Pumpkin Head", 0], ["base_moon", "Astronaut", 0], ["base_surf", "Surfer", 0],
  ["h_fudder", "Troglodyte Fudder", 1], ["h_pumpkin", "Pumpkin King", 1], ["h_reaper", "Grim Reaper", 1], ["h_hardhat", "Gold Foreman", 1], ["h_gearcrown", "Molten Mech", 1], ["h_moonhalo", "Moon Walker", 1],
  ["h_liftoff", "Rocketeer", 1], ["h_sharkfin", "Shark Surfer", 1], ["h_tidal", "Tide King", 1], ["h_fossil", "Cave Chief", 1], ["h_volcano", "Lava Warlord", 1],
  ["m_survivor_3", "3-Round Survivor", 2], ["m_survivor_5", "5-Round Survivor", 2], ["m_survivor_10", "10-Round Survivor", 2], ["m_slayer_ohio", "Boss Slayer: Ohio", 2], ["m_slayer_moon", "Boss Slayer: Moon", 2], ["m_score_50k", "High Score 50K", 2] ];
let charId = "h_fudder", view = 0; const VIEWS = ["FIRST-PERSON", "THIRD-PERSON", "SELFIE"];
const charMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: .05 }); const charSpr = new THREE.Sprite(charMat); charSpr.scale.set(2.1, 2.1, 1); charSpr.visible = false; scene.add(charSpr);
const rimMat = new THREE.SpriteMaterial({ color: 0x28dcff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }); const rimSpr = new THREE.Sprite(rimMat); rimSpr.visible = false; scene.add(rimSpr);
const shTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(0,0,0,.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const shadowM = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false })); shadowM.rotation.x = -Math.PI / 2; shadowM.visible = false; scene.add(shadowM);
let chSq = 0, chWasG = true, chFace = 1;
const texLoader = new THREE.TextureLoader(), charTex = {};
function setChar(id, quiet) { if (!CHARS.find(c => c[0] === id)) id = "h_fudder"; charId = id; const t = charTex[id] || (charTex[id] = texLoader.load(`../assets/chars/${id}.webp`, tt => { tt.colorSpace = THREE.SRGBColorSpace; }));
  charMat.map = t; charMat.needsUpdate = true; rimMat.map = t; rimMat.needsUpdate = true; { const cc = CHARS.find(c => c[0] === id); rimMat.color.setHex(cc && cc[2] === 1 ? 0xffd24a : cc && cc[2] === 2 ? 0xc69bff : 0x28dcff); } const hero = $("charHero"); if (hero) hero.src = `../assets/chars/${id}.webp`; const se = document.querySelector(`#chars .ch[data-id="${id}"]`), ce = $("chars"); if (se && ce && quiet) ce.scrollLeft = Math.max(0, se.offsetLeft - ce.offsetLeft - ce.clientWidth / 2 + se.offsetWidth / 2); document.querySelectorAll("#chars .ch").forEach(e => e.classList.toggle("sel", e.dataset.id === id)); const c = CHARS.find(c => c[0] === id); $("charName").textContent = c[1] + (c[2] === 1 ? " · HOLDER SKIN" : c[2] === 2 ? " · MEDAL SKIN" : ""); if (!quiet) { sfx.click(); save(); } }
function buildCharPicker() { const el = $("chars"); el.innerHTML = ""; for (const [id, nm, k] of CHARS) { const b = document.createElement("button"); b.type = "button"; b.className = "ch" + (k ? " h" + k : ""); b.dataset.id = id; b.title = nm; b.innerHTML = `<img src="../assets/chars/${id}.webp" alt="${nm}" loading="lazy">`; b.addEventListener("click", () => setChar(id)); el.appendChild(b); } }
function cycleView() { view = (view + 1) % 3; pop("VIEW: " + VIEWS[view], "#28dcff"); sfx.click(); }
const camOff = new THREE.Vector3();
function applyView(time) { const third = view > 0; drill.visible = !third; charSpr.visible = rimSpr.visible = shadowM.visible = third;
  if (!third) return; const moving = Math.hypot(P.vx, P.vz), mv = Math.min(1, moving / 3);
  if (P.ground && !chWasG) { chSq = .22; for (let i = 0; i < 10; i++) { const a = i * .628; burst(P.x + Math.cos(a) * .4, P.y + .05, P.z + Math.sin(a) * .4, [0xcfc8ff, 0x8a7ab0], 1, 1.2); } } chWasG = P.ground; chSq *= Math.pow(.004, 1 / 60); const air = P.ground ? 0 : Math.max(-.12, Math.min(.12, P.vy * .02));
  const shY = 2.1 * (1 + air - chSq * .6 + Math.sin(time * 2.2) * .012 * (1 - mv)), sx = 2.1 * (1 - air * .6 + chSq * .5);
  const side = P.vx * Math.cos(P.yaw) - P.vz * Math.sin(P.yaw); if (Math.abs(side) > .8) chFace = (view === 2 ? -1 : 1) * Math.sign(side);
  const jdt = Math.min(.05, time - (applyView.lt || time)); applyView.lt = time; if (charJoy > 0) charJoy = Math.max(0, charJoy - jdt * .9); const spin = charJoy > 0 ? Math.cos((1 - charJoy) * Math.PI * 4) : 1;
  charSpr.scale.set(sx * chFace * spin, shY, 1); const by = P.y + .2 + shY / 2 + Math.abs(Math.sin(bob)) * .08 * mv + Math.sin(charJoy * Math.PI) * .7; charSpr.position.set(P.x, by, P.z); charMat.rotation = Math.sin(bob) * .05 * mv - side * .02;
  const tod2 = 1 - (curNight || 0) * .35; charMat.color.setScalar(tod2); rimSpr.scale.set(sx * chFace * spin * 1.07, shY * 1.05, 1); rimMat.rotation = charMat.rotation; rimMat.opacity = .35 + (curNight || 0) * .35 + Math.sin(time * 3) * .05;
  const cdx = camera.position.x - P.x, cdz = camera.position.z - P.z, cl = Math.hypot(cdx, cdz) || 1; rimSpr.position.set(P.x - cdx / cl * .06, by, P.z - cdz / cl * .06);
  const gyS = topH[Math.floor(P.x) + Math.floor(P.z) * SX] + 1.02; shadowM.position.set(P.x, Math.min(P.y + .03, Math.max(gyS, P.y - 4)), P.z); const hgt = Math.max(0, P.y - gyS); shadowM.scale.setScalar(Math.max(.4, 1 - hgt * .12)); shadowM.material.opacity = Math.max(.2, 1 - hgt * .15);
  const dir = view === 1 ? 1 : -1, dist = view === 1 ? 3.6 : 2.6, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), up = view === 1 ? 1.1 : .2;
  let d = dist; for (let k = .4; k <= dist; k += .2) { const x = P.x + sy * k * dir, z = P.z + cy * k * dir, y = P.y + P.eye + up * k / dist; if (get(Math.floor(x), Math.floor(y), Math.floor(z))) { d = Math.max(.6, k - .3); break; } }
  camera.position.set(P.x + sy * d * dir, P.y + P.eye + up * d / dist, P.z + cy * d * dir); if (view === 2) camera.rotation.set(-P.pitch * .5, P.yaw + Math.PI, 0); else camera.rotation.set(P.pitch - .18, P.yaw, 0); }
$("viewBtn").addEventListener("click", e => { e.stopPropagation(); if (running) cycleView(); });

// ---------------- main loop ----------------
let curNight = 0, last = performance.now(), fpsN = 0, fpsT = 0, fps = 0, bob = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; const time = now / 1000;
  const night = updSky(running ? dt : 0); curNight = night; updWater(dt, time, night);
  if (running) { updPlayer(dt); landCheck(); updMining(dt, time); updFuds(dt, night); updBoss(dt, time); updOrbs(dt); updCombo(dt); qT -= dt; if (qT <= 0) { qT = .25; qTick(); } bTick(dt); updScan(dt); updMeteor(dt, time); updCritters(dt, night); toyTick(dt); updEvents(dt, night); updRain(dt); updPet(dt, time); }
  else menuCam(dt);
  updMotes(dt, time, night); skyU.uTime.value = time; skyU.uAur.value += ((ev.k === "aurora" ? 1 : night > .6 ? .3 : 0) - skyU.uAur.value) * Math.min(1, dt * .8); updMP(dt); updParts(dt); updDebris(dt); audioTick(); adaptRes(dt);
  let n = 0; for (const ci of dirty) { buildChunk(ci); dirty.delete(ci); if (++n >= (IS_TOUCH ? 2 : 3)) break; }
  trauma = Math.max(0, trauma - dt * 1.8); const sh = trauma * trauma;
  camera.position.set(P.x + (Math.random() - .5) * sh * .25, P.y + P.eye + (Math.random() - .5) * sh * .25, P.z + (Math.random() - .5) * sh * .25); camera.rotation.set(P.pitch + (Math.random() - .5) * sh * .04, P.yaw + (Math.random() - .5) * sh * .04, (Math.random() - .5) * sh * .06);
  if (!running) camera.rotation.set(-.1, P.yaw + menuA, 0);
  if (running) applyView(time);
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
  ["king", "👑", "KING DETHRONED", "Beat THE FUD KING", () => (stats.k_king | 0) >= 1], ["whale", "🐋", "WHALE BEACHED", "Beat THE DUMP WHALE", () => (stats.k_whale | 0) >= 1],
  ["fish", "🎣", "HOOKED", "Catch a fish", () => (stats.fish | 0) >= 1], ["fish10", "🐟", "NEON ANGLER", "Catch 10 fish", () => (stats.fish | 0) >= 10],
  ["dex", "📘", "FISHDEX FIVE", "Catch 5 kinds of fish", () => Object.keys(fish.dex).length >= 5], ["dia", "💠", "DIAMOND SPOTTER", "Zap a Diamond Hands", () => (stats.diamond | 0) >= 1],
  ["meteor", "☄", "STARGAZER", "See a meteor land", () => (stats.meteors | 0) >= 1], ["cache", "🗝", "TREASURE HUNTER", "Find a secret cache", () => cachesFound() >= 1],
  ["cache5", "🏆", "SECRET KEEPER", "Find all 5 secret caches", () => cachesFound() >= 5], ["bounce", "🟢", "BOING", "Bounce 10 times on Bounce Pads", () => (stats.bounces | 0) >= 10],
  ["fw", "🎆", "SHOWTIME", "Pop 3 Firework Crates", () => (stats.fireworks | 0) >= 3], ["keys", "🎹", "KEYBOARD HERO", "Play 16 notes on Synth Keys", () => (stats.notes | 0) >= 16],
  ["moon", "🌙", "MOONWALKER", "Visit the Moon Basin", () => !!stats.moon], ["core", "✨", "CORE MEMORY", "Mine a SOL Core vein", () => stats.cores >= 1],
  ["drill", "🔩", "BOSS DRILL", "Build the BOSS DRILL MK IV", () => upg.drill >= 4], ["event", "🌌", "WEATHER WATCHER", "Live through a world event", () => (stats.events | 0) >= 1],
  ["streak", "🔥", "ON A STREAK", "3-day daily streak", () => (daily.streak | 0) >= 3], ["pet", "🐾", "BEST FRIEND", "Adopt a companion", () => (stats.petsGot | 0) >= 1], ["zfish", "🗺", "ZONE ANGLER", "Catch 3 zone-only fish", () => FISH.filter(f => f.z && fish.dex[f.n]).length >= 3] ];
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

// ---------------- boot ----------------
const saved = load();
let migrated = false;
if (saved && !saved.migr) { seed = saved.seed; edits = saved.edits || {}; shards = saved.shards | 0; sel = saved.sel | 0; tod = saved.tod ?? tod;
  if (saved.upg) Object.assign(upg, saved.upg); if (saved.stats) Object.assign(stats, saved.stats); Qi = saved.Qi | 0; if (!saved.qv && Qi >= 7) Qi++; qBase = saved.qBase || {}; P.hp = saved.hp || maxHp();
  if (saved.set) { sndOn = saved.set.snd !== false; musOn = saved.set.mus !== false; lookSlow = !!saved.set.slow; lookMul = saved.set.look || 1; } if (saved.daily) Object.assign(daily, saved.daily); if (saved.dex) fish.dex = saved.dex; if (saved.ach) ach = saved.ach; if (saved.char) charId = saved.char; introDone = saved.intro !== false; if (introDone) met.t = 150 + Math.random() * 120; }
else { seed = parseInt(Q.get("seed")) || 1337; if (saved && saved.migr) { shards = saved.shards; migrated = true; } qStart(); }
generate(seed); applyEdits(); const tris = buildAll();
respawn(); if (saved && saved.p) { [P.x, P.y, P.z, P.yaw, P.pitch] = saved.p; if (collides(P.x, P.y, P.z)) respawn(); }
buildPools(); buildCharPicker(); if (upg.pet) setPet(upg.pet); setChar(Q.get("char") || charId, true); buildPalette(); updShards(); resize(); updQuest(); dailyEnsure(); updDaily(); menuStats(); updHP(); updSetBtns(); syncLookBtn(); if (migrated) setTimeout(() => banner("BIGGER WORLD!", "Your SOL shards carried over to the new map"), 600);
// Phase-2 hook is for LOCAL testing only: only localhost servers are accepted.
if (Q.get("mp")) { try { const u = new URL(Q.get("mp")); if (/^wss?:$/.test(u.protocol) && ["localhost", "127.0.0.1"].includes(u.hostname)) mpConnect(u.href); } catch (e) {} }
$("load").remove();
setInterval(save, 5000);
requestAnimationFrame(frame);

// test / debug hooks (harmless; used by automated checks)
window.__SB = { petClick, pet: () => ({ ...pet, id: upg.pet, vis: petSpr.visible, px: petSpr.position.x }), FISH: () => FISH.map(f => f.n), roll: (n, z) => rollFish(n, z).n, brk: (x, y, z) => { const id = get(x, y, z); if (id) breakBlock(x, y, z, id); return id; }, topH: (x, z) => topH[x + z * SX], ACH: () => ACH.map(a => a[0]), ach: () => ({ ...ach }), startEvent, ev: () => ({ k: ev.k, t: ev.t, rain: rain.length }), caches: () => caches.map(c => [...c, get(c[0], c[1], c[2])]), cachesFound, biomeNow: () => biomeNow, setBlock: (x, y, z, id) => setBlock(x, y, z, id), sky: () => skyU.uAur.value, joy: () => charJoy, P, input, charSpr, bossPos: () => boss.on && boss.g.position.toArray(), bossKind: () => boss.kind, quests: () => QUESTS.length, introFx: () => introFx, spawnDia: () => spawnCritter("dia"), crits: () => critters.map(c => ({ dia: !!c.dia })), zapNearest: () => { const c = critters[0]; if (c) zapCritter(c); return !!c; }, shareShown: () => $("shareBtn").classList.contains("show"), shareClick: () => $("shareBtn").click(), shared: () => window.__shared | 0, get: (x, y, z) => get(x, y, z), setBlock, place: () => { aim(); place(); }, aim: () => { aim(); return hit && { ...hit }; }, start: startGame, pause, look,
  state: () => ({ x: P.x, y: P.y, z: P.z, yaw: P.yaw, pitch: P.pitch, ground: P.ground, shards, sel, running, tris, fps: Math.round(fps), fuds: fuds.length, tod, mp: mp.on ? { id: mp.id, rejects: mp.rejects || 0, lastEmote: mp.lastEmote || null, others: [...mp.others.values()].map(o => ({ name: o.p.name, x: o.p.x, y: o.p.y, z: o.p.z })) } : null, info: renderer.info.render }),
  select, respawn, save, lookSlow: () => lookSlow, setLookSlow: v => { lookSlow = !!v; const b = $("lookSlow"); if (b) { b.classList.toggle("on", lookSlow); b.textContent = lookSlow ? "LOOK: SLOW" : "LOOK: NORM"; } }, trySoftTapMine, overUI, upg, stats, quest: () => ({ i: Qi, ...qDef(Qi), v: qVal(qDef(Qi)) }), boss: () => ({ on: boss.on, hp: boss.hp, max: boss.max, phase: boss.phase }), summon: k => summonBoss(k), daily: () => ({ ...daily, line: dailyLine() }), meteor: () => { met.t = 0; }, met: () => ({ on: met.on, crater: met.crater }), critters: () => critters.map(c => ({ x: c.s.position.x, y: c.s.position.y, z: c.s.position.z })), spawnCritter: () => spawnCritter(true), lookAtCrit: () => { const c = critters.slice().sort((a, b) => a.s.position.distanceTo(camera.position) - b.s.position.distanceTo(camera.position))[0]; if (!c) return false; const o = c.s.position, dx = o.x - P.x, dz = o.z - P.z, dy = o.y - (P.y + P.eye); P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); return true; }, shot: () => { wantShot = true; }, lastShot: () => lastShotInfo, touchLook: (dx, dy) => touchLook(dx, dy), setLookMul: v => { lookMul = v; }, mem: () => ({ geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures, heap: performance.memory ? performance.memory.usedJSHeapSize : 0, scene: scene.children.length, orbs: orbs.length, fuds: fuds.length, shots: boss.shots.length, crit: critters.length }), fishSt: () => ({ st: fish.st, prog: fish.prog, sp: fish.sp && fish.sp.n, dex: fish.dex, n: stats.fish || 0 }), pools: () => pools, setView: v => { view = v; }, setChar: id => setChar(id, true), charId: () => charId, chars: () => CHARS.map(c => c[0]), aimState: () => ({ pool: !!poolHit, boss: bossHit, crit: !!critHit, fud: !!fudHit }), lookAtBoss: () => { if (!boss.on) return; const o = boss.g.position, dx = o.x - P.x, dz = o.z - P.z, dy = o.y - (P.y + P.eye); P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); }, bossDamage: n => bossDamage(n), openLab, closeLab, buy: id => buyUpg(id), hp: () => P.hp, biome: () => biomeName(P.x, P.z), give: n => { shards += n; updShards(); }, setTod: t => { tod = t; }, dpr: () => renderer.getPixelRatio(), combo: () => comboN, inLookZone, inMoveZone, showTip: () => { try { localStorage.removeItem(TIP_KEY); } catch(e){} $("tip").classList.add("show"); }, hideTip: () => { $("tip").classList.remove("show"); try { localStorage.setItem(TIP_KEY,"1"); } catch(e){} }, emote: k => mp.ws && mp.ws.send(JSON.stringify({ t: "emote", k })), tp: (x, y, z) => { P.x = x; P.y = y; P.z = z; P.vx = P.vy = P.vz = 0; }, B, plaza: () => plaza };
