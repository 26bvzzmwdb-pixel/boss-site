// Optional $BOSS burn shop for the Sandbox (OFF unless enabled, mint and serverUrl are all set
// AND a burn server confirms /config). Mirrors Chain Raiders: the player's own wallet signs a
// Token-2022 (or SPL, if tokenProgram is changed) burn. Tokens are destroyed. No refunds.
// This game never holds keys, never receives the tokens, and never sends SOL.
// The block between the markers is strict JSON so a future server can read it the same way realm does.
// Top-tier Plasma Rail is not listed: it is drop-only.

export const BURN = /*BURN-JSON*/{
  "enabled": false,
  "network": "mainnet",
  "mint": "",
  "decimals": 6,
  "tokenProgram": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  "serverUrl": "",
  "maxAgeHours": 24,
  "prices": {
    "shotgun": 800,
    "frost": 1500,
    "whip": 1800,
    "orb": 3200,
    "drill2": 400,
    "boots": 500,
    "shield": 700,
    "blast2": 2000,
    "potion": 80,
    "armor": 200
  }
}/*END-BURN-JSON*/;

let srv = null, srvP = null;
export const burnConfigured = () => !!(BURN.enabled && BURN.mint && BURN.serverUrl);
const base = () => String(BURN.serverUrl || "").replace(/\/+$/, "");

export function burnReady() {
  if (!burnConfigured()) return Promise.resolve(false);
  if (srv) return Promise.resolve(!!srv.enabled && srv.mint === BURN.mint);
  if (!srvP) srvP = fetch(base() + "/config").then(r => r.json()).then(j => {
    srv = j; if (!j || j.mint !== BURN.mint || !j.enabled) { if (srv) srv.enabled = false; return false; } return true;
  }).catch(() => { srvP = null; return false; });
  return srvP;
}
export const burnLive = () => !!(srv && srv.enabled && burnConfigured() && srv.mint === BURN.mint);
export const burnPrice = id => (srv && srv.prices && srv.prices[id]) || BURN.prices[id] || 0;

export function wallet() {
  const p = (window.phantom && window.phantom.solana) || (window.solana && window.solana.isPhantom ? window.solana : null);
  return p && p.isPhantom ? p : null;
}
export async function connectWallet() {
  const p = wallet();
  if (!p) throw new Error("Phantom wallet not found. Open the Sandbox in the Phantom app's browser, or install the Phantom extension.");
  const r = await p.connect();
  return r.publicKey.toBase58 ? r.publicKey.toBase58() : String(r.publicKey);
}
async function call(path, body) {
  if (!burnConfigured()) { const e = new Error("Burn shop is off"); e.status = 403; throw e; }
  const r = await fetch(base() + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || ("server error " + r.status)); e.status = r.status; throw e; }
  return j;
}
export const getGrants = w => call("/grants?wallet=" + encodeURIComponent(w)).then(j => j.grants || []);

// Intent -> the player's wallet signs BurnChecked + memo -> server verifies on-chain. No refund path.
export async function burnFor(owner, item, onStep = () => {}) {
  if (!burnConfigured()) throw new Error("Burn shop is off. Earn this free, or spend in-game shards. Nothing was burned.");
  if (!BURN.prices[item]) throw new Error("That item is not in the burn shop.");
  onStep("Preparing the burn…");
  const it = await call("/burn/intent", { wallet: owner, item });
  if (it.mint !== BURN.mint || it.item !== item) throw new Error("Server returned a mismatched burn. Cancelled. Nothing was signed.");
  onStep("Approve the burn of " + it.amount_tokens + " $BOSS in your wallet. This destroys them. No refund.");
  const p = wallet(); if (!p) throw new Error("Phantom wallet not found.");
  const res = await p.request({ method: "signAndSendTransaction", params: { message: it.message_base58 } });
  const sig = res && (res.signature || res);
  onStep("Burn sent. Confirming on-chain…");
  for (let i = 0; ; i++) {
    try { return await call("/burn/verify", { intent: it.intent, signature: sig }); }
    catch (e) { if (e.status === 422 && /not found/i.test(e.message) && i < 8) { await new Promise(r => setTimeout(r, 2000)); continue; } throw e; }
  }
}
