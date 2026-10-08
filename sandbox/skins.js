// Holder skins are NFTs later. Everyone starts on the free Rookie.
// This check is OFF: it does not mint, does not spend SOL, and does not read the chain.
// The block between the markers is strict JSON so a future checker can read it.
export const STARTER = "starter";
export const SKIN_NFT = /*SKIN-JSON*/{
  "enabled": false,
  "collection": "",
  "sendsSol": false,
  "mints": false
}/*END-SKIN-JSON*/;

const KEY = "boss_sb_nft_skins_v1";
function bag() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
export function heldSkins() { const ids = bag().ids; return Array.isArray(ids) ? ids : []; }
export function skinHeld(id) { return heldSkins().indexOf(id) >= 0; }

// One-tap claim calls this after Phantom connects. Stub: grants nothing.
export function claimHolderSkins(wallet) {
  return {
    ok: false,
    wallet: wallet || "",
    claimed: [],
    enabled: false,
    collection: SKIN_NFT.collection || "",
    mints: false,
    sendsSol: false,
    reason: "Holder NFT check is off. Nothing was minted and no SOL was spent."
  };
}

// Future verifier would call this after a real wallet check. The claim stub does not.
export function rememberHeld(ids) {
  const b = bag();
  const next = new Set([...(b.ids || []), ...(ids || [])]);
  b.ids = [...next];
  try { localStorage.setItem(KEY, JSON.stringify(b)); } catch (e) {}
  return b.ids;
}
