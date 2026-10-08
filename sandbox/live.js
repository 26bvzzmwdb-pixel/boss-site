// $BOSS Sandbox v0.9.8 LIVE shared Season board client. Talks to the $BOSS score server (same server as the ranked runner).
// How scores sync: every boss win and every ◆ earned is queued here as a small event. Once you link Phantom (one FREE signed
// message, no transaction), the queue is sent every few seconds. The SERVER does the scoring (same formula as leaderboard.js),
// caps impossible streams, and keeps one shared board per 3-day round. Everyone sees the same top 5 on the spawn sign.
// Play first, link later: events up to 6 hours old still count once you sign in. Nothing here ever sends SOL or tokens.

export const LIVE_CFG = {
  on: true,
  api: "https://boss-runner-fto6.onrender.com",
  poll: 20000,      // board refresh (ms)
  flush: 6000,      // event upload (ms)
  maxQueue: 1500,
  maxAgeMs: 6 * 3600 * 1000,
};
const QKEY = "boss_sb_live_v1";
const AUTH_HEADER = "$BOSS Sandbox board sign-in (free, no transaction)";
const b64 = u8 => { let s = ""; for (const c of u8) s += String.fromCharCode(c); return btoa(s); };
const hex = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, "0")).join(""); };
const trunc = a => (a && a.length > 10 ? a.slice(0, 4) + "…" + a.slice(-4) : a || "");

function apiBase() {
  try { const q = new URLSearchParams(location.search).get("lbapi"); if (q) { const u = new URL(q); if (u.protocol === "https:" || ["localhost", "127.0.0.1"].includes(u.hostname)) return u.origin; } } catch (e) {}
  return LIVE_CFG.api.replace(/\/+$/, "");
}
function phantom() { const p = (window.phantom && window.phantom.solana) || (window.solana && window.solana.isPhantom ? window.solana : null); return p && p.isPhantom ? p : null; }
function phWallet() { try { const p = phantom(); if (p && p.publicKey) return String(p.publicKey.toBase58 ? p.publicKey.toBase58() : p.publicKey); } catch (e) {} return null; }

export function createLive(opts = {}) {
  const on = LIVE_CFG.on && !new URLSearchParams(location.search).has("lboff");
  const base = apiBase();
  let st = { q: [], tok: {}, w: "" };
  try { const s = JSON.parse(localStorage.getItem(QKEY) || "null"); if (s && Array.isArray(s.q)) st = Object.assign(st, s); } catch (e) {}
  const save = () => { try { localStorage.setItem(QKEY, JSON.stringify(st)); } catch (e) {} };
  let data = null, ok = false, err = "", lastPoll = 0, busy = false, you = null, rejected = [], signing = false, serverRound = null;

  const wallet = () => phWallet() || st.w || "";
  const token = () => { const w = wallet(), t = w && st.tok[w]; return t && t.exp > Date.now() + 60000 ? t.token : null; };
  function prune() { const cut = Date.now() - LIVE_CFG.maxAgeMs; st.q = st.q.filter(e => e.at >= cut).slice(-LIVE_CFG.maxQueue); }
  function push(ev) { if (!on) return; ev.id = ev.id || (Date.now().toString(36) + hex(5)); ev.at = ev.at || Date.now(); st.q.push(ev); prune(); save(); }

  async function call(path, body) {
    const r = await fetch(base + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || ("server " + r.status)); e.status = r.status; e.code = j.code; throw e; }
    return j;
  }
  async function poll(force) {
    if (!on || busy && !force) return;
    if (!force && Date.now() - lastPoll < LIVE_CFG.poll) return;
    lastPoll = Date.now();
    try { const w = wallet(); data = await call("/api/sandbox/board?n=20" + (w ? "&wallet=" + encodeURIComponent(w) : "")); ok = true; err = ""; serverRound = data.round;
      if (data.you && w) you = data.you; opts.onUpdate && opts.onUpdate(); }
    catch (e) { ok = false; err = e.message || "offline"; }
  }
  async function flush() {
    if (!on || busy) return; const tk = token(); if (!tk || !st.q.length) return;
    busy = true;
    try {
      prune(); const batch = st.q.slice(0, 150);
      const r = await call("/sandbox/events", { token: tk, events: batch });
      const sent = new Set(batch.map(e => e.id)); st.q = st.q.filter(e => !sent.has(e.id)); save();
      you = r.you; rejected = (r.rejected || []).concat(rejected).slice(0, 20); ok = true; err = "";
      if (r.rejected && r.rejected.length && opts.onReject) opts.onReject(r.rejected);
      busy = false; await poll(true);
    } catch (e) {
      if (e.status === 401) { delete st.tok[wallet()]; save(); }
      else if (e.status === 403 && e.code === "pre") { /* board not open yet: keep the queue */ }
      else if (e.status === 400 || e.status === 413) { st.q = st.q.slice(150); save(); }   // malformed batch: drop it instead of looping forever
      err = e.message || "offline";
    } finally { busy = false; }
  }

  // One free signMessage in Phantom -> a board token for 7 days. No transaction, nothing is spent.
  async function signIn() {
    if (!on) throw new Error("Live board is off");
    const p = phantom(); if (!p) throw new Error("Phantom not found. Open the Sandbox in the Phantom app's browser (or install the extension) to rank on the live board.");
    if (signing) throw new Error("Check Phantom: a sign-in is waiting");
    signing = true;
    try {
      const r = await p.connect(); const w = r.publicKey.toBase58 ? r.publicKey.toBase58() : String(r.publicKey);
      st.w = w; save();
      if (token()) { await flush(); await poll(true); return w; }
      const issued = Date.now(), nonce = hex(16);
      const msg = [AUTH_HEADER, "wallet: " + w, "issued: " + issued, "nonce: " + nonce, "Links this wallet to the shared Sandbox Season board. Free. No SOL or tokens move."].join("\n");
      const s = await p.signMessage(new TextEncoder().encode(msg), "utf8");
      const sig = b64(s.signature || s);
      const j = await call("/sandbox/auth", { wallet: w, issued_ms: issued, nonce, signature: sig });
      st.tok[w] = { token: j.token, exp: j.expires_ms }; save();
      await flush(); await poll(true); return w;
    } finally { signing = false; }
  }

  if (on) { setTimeout(() => poll(true), 1200); setInterval(() => { flush(); poll(false); }, LIVE_CFG.flush); }

  return {
    on, base,
    kill: (kind, tier, leg) => push({ t: "kill", kind, tier: tier || null, leg: !!leg }),
    earn: n => { n = n | 0; if (!on || n <= 0) return; const last = st.q[st.q.length - 1];
      if (last && last.t === "shards" && last.n + n <= 1500 && Date.now() - last.at < 15000) { last.n += n; last.at = Date.now(); save(); } else push({ t: "shards", n }); },
    signIn, flush, poll: () => poll(true),
    signed: () => !!token(), wallet, pending: () => st.q.length,
    state: () => ({ on, ok, err, signed: !!token(), wallet: wallet(), name: trunc(wallet()), pending: st.q.length, you, rejected: rejected.slice(), round: data && data.round_info, rows: (data && data.rows) || [], prize: data && data.prize, players: data ? data.players : 0, live: !!(data && data.live) }),
    roundText() { const r = data && data.round_info; if (!r) return ""; if (r.pre) return "Opens soon"; const s = Math.max(0, Math.floor((r.end_ms - Date.now()) / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
      return "Round " + r.round + " · ends in " + (d ? d + "d " : "") + h + "h " + String(m).padStart(2, "0") + "m"; },
  };
}
