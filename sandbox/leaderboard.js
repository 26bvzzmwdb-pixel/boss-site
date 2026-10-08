// $BOSS Sandbox Season 1 board. One score from bosses, shards earned, and legendary rift wins.
// Saved on this device only. Multiplayer / hosting stays off. This file never sends SOL.
// Prize figures are a display stub Noah can fund later from creator fees (separate from the runner board).
// v0.9.7 anti-farm: Legendary/Epic weigh heavily, Common is nearly worthless, and every repeat kill of the SAME boss pays less.

export const POINTS = { common: 5, rare: 60, epic: 600, legendary: 2000 };
export const SHARD_PER_POINT = 50;   // 1 point per 50 ◆ earned this season (not what you are carrying)
export const LEG_BONUS = 500;        // extra on top of the Legendary boss points, per legendary rift win (also diminishes on repeats)
export const REPEAT_DECAY = 0.7;     // each repeat kill of the same boss pays 70% of the one before
export const REPEAT_FLOOR = 0.05;    // ...down to 5% of full value, never less
// Lab-summoned bosses are not rift bosses: they score as Common. The Troglodyte Fudder can only die once, so he scores as Legendary.
export const BOSS_TIER = { rug: "common", whale: "common", jelly: "rare", king: "common", colossus: "epic", fudder: "legendary", moth: "legendary" };
export function repeatMult(n) { return Math.max(REPEAT_FLOOR, Math.pow(REPEAT_DECAY, Math.max(0, (n | 0) - 1))); }
export function killPoints(tier, nth, leg) { return Math.round(((POINTS[tier] || 0) + (leg ? LEG_BONUS : 0)) * repeatMult(nth)); }
export const TIERS = ["common", "rare", "epic", "legendary"];

// Same top-5 split as the runner prize config (rules v1.2). This pot is NOT that pot:
// runner takes 20% of creator fees; the Sandbox board is drawn at 10%, only when a round is paid out.
export const PRIZE = {
  season: "Season 1",
  seasonId: 1,
  potPctOfCreatorFees: 10,
  runnerPotPct: 20,
  topN: 5,
  split: [40, 25, 15, 12, 8],
  minPotSol: 0.05,
  rollover: true,
  potSol: 0,            // unfunded. Display only. Nothing in this game moves SOL.
  allowReset: false,    // Noah can flip this later. ?lbreset=1 also shows the button.
  sends: false,
};

export const FORMULA_TEXT = "SCORE = boss points + floor(◆ earned this season ÷ 50). Boss points per kill: Common 5 · Rare 60 · Epic 600 · Legendary 2,000 (+500 for a legendary rift win). Farming the same boss pays less every time: each repeat is worth 70% of the last, down to 5%. Lab bosses count as Common. The Troglodyte Fudder can only be beaten once and counts as Legendary. ◆ SOL shards are in-game items with no cash value. Dying in a rift wipes what you are carrying, not the shards you already earned this season.";

export const PRIZE_TEXT = "Prize SOL, if a round is paid out, comes only from creator fees: 10% of fees received go to this Sandbox pot (the runner board's pot is separate, at 20%). Top 5 share that pot 40% / 25% / 15% / 12% / 8%. Under 0.05 SOL, nothing is paid and the pot rolls over. Unfilled places roll over too. This game does not send SOL. The pot is not funded yet.";

const KEY = "boss_sb_board_s1";

export function scoreOf(e) {
  if (!e) return 0;
  const k = e.kills || {};
  let pts = 0;
  if (e.pts != null) pts = e.pts | 0;   // v0.9.7: points banked per kill with repeat decay
  else { for (const t of TIERS) pts += (k[t] | 0) * POINTS[t]; pts += (e.legs | 0) * LEG_BONUS; }   // older rows / seeded rivals
  return pts + Math.floor((e.shards | 0) / SHARD_PER_POINT);
}

function blankKills() { return { common: 0, rare: 0, epic: 0, legendary: 0 }; }

function emptyState() { return { v: 1, seasonId: PRIZE.seasonId, name: "", self: "", linked: "", board: [] }; }

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && s.v === 1 && s.seasonId === PRIZE.seasonId && Array.isArray(s.board)) return s;
  } catch (e) {}
  return emptyState();
}
function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

function trunc(a) { return a.length > 10 ? a.slice(0, 4) + "…" + a.slice(-4) : a; }
function cleanName(s) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, 16); }

function readWallet() {
  try {
    const ph = window.phantom && window.phantom.solana;
    if (ph && ph.isPhantom && ph.publicKey) return String(ph.publicKey.toBase58 ? ph.publicKey.toBase58() : ph.publicKey);
    const s = window.solana;
    if (s && s.isPhantom && s.publicKey) return String(s.publicKey.toBase58 ? s.publicKey.toBase58() : s.publicKey);
  } catch (e) {}
  return null;
}

export function createBoard() {
  let st = load();
  let potSol = PRIZE.potSol;   // memory only, never a balance we spend

  function persist() { save(st); }
  function rowById(id) { return st.board.find(e => e.id === id) || null; }
  function fresh(id, name, wallet) { return { id, name, wallet: wallet || null, kills: blankKills(), shards: 0, legs: 0, bosses: 0, score: 0, at: Date.now() }; }

  function ident() {
    const w = readWallet() || st.linked || null;
    if (w) return { id: "w:" + w, name: trunc(w), wallet: w };
    const name = cleanName(st.name) || "Player";
    return { id: "n:" + name.toLowerCase(), name, wallet: null };
  }

  function migrate(fromId, toId, name, wallet) {
    if (!fromId || fromId === toId) return;
    const a = rowById(fromId), b = rowById(toId);
    if (!a) return;
    if (!b) { a.id = toId; a.name = name; a.wallet = wallet || null; }
    else if (scoreOf(a) >= scoreOf(b)) {
      const keepAt = b.at;
      Object.assign(b, a, { id: toId, name, wallet: wallet || null, at: Math.max(keepAt || 0, a.at || 0) });
      st.board = st.board.filter(e => e !== a);
    } else st.board = st.board.filter(e => e !== a);
  }

  function me() {
    const idn = ident();
    if (st.self && st.self !== idn.id) migrate(st.self, idn.id, idn.name, idn.wallet);
    st.self = idn.id;
    let e = rowById(idn.id);
    if (!e) { e = fresh(idn.id, idn.name, idn.wallet); st.board.push(e); }
    e.name = idn.name; e.wallet = idn.wallet;
    if (!e.kills) e.kills = blankKills();
    return e;
  }

  function touchScore(e) { const s = scoreOf(e); if (s >= (e.score | 0)) e.score = s; e.at = Date.now(); persist(); return e; }

  function ranked() {
    return st.board.map(e => Object.assign({}, e, { kills: Object.assign(blankKills(), e.kills), score: scoreOf(e) }))
      .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)));
  }
  function youRank(rows) { const id = me().id; const i = (rows || ranked()).findIndex(e => e.id === id); return i < 0 ? null : i + 1; }

  function plan(board, pot) {
    const p = pot == null ? potSol : +pot;
    const potLam = Math.max(0, Math.floor((isFinite(p) ? p : 0) * 1e9));
    const pay = potLam >= Math.floor(PRIZE.minPotSol * 1e9);
    const rows = (board || ranked()).slice(0, PRIZE.topN);
    const legs = [];
    for (let i = 0; i < PRIZE.topN; i++) {
      const pct = PRIZE.split[i];
      const row = rows[i] || null;
      const lam = pay && row ? Math.floor(potLam * pct / 100) : 0;
      legs.push({ rank: i + 1, pct, name: row ? row.name : null, id: row ? row.id : null, sol: lam / 1e9, lamports: lam, filled: !!row });
    }
    const paid = legs.reduce((s, l) => s + l.lamports, 0);
    return {
      rules: "sandbox-season-1", sends: false, funded: potLam > 0, potPctOfCreatorFees: PRIZE.potPctOfCreatorFees,
      separateFromRunnerPct: PRIZE.runnerPotPct, topN: PRIZE.topN, split: PRIZE.split.slice(), minPotSol: PRIZE.minPotSol,
      rollover: true, potSol: potLam / 1e9, belowMinimum: !pay, paidLamports: paid, carryLamports: potLam - paid, legs,
      note: "Stub only. Does not send SOL. Payouts are funded from creator fees when a round is paid out.",
    };
  }

  return {
    PRIZE, FORMULA_TEXT, PRIZE_TEXT, POINTS, scoreOf, BOSS_TIER, killPoints, repeatMult,
    nextPoints: (kind, tierKey, leg) => { const t = TIERS.indexOf(tierKey) >= 0 ? tierKey : (BOSS_TIER[kind] || "common"), e = me(); return killPoints(t, ((e.kk || {})[kind] | 0) + 1, leg); },
    me: () => Object.assign({}, me(), { score: scoreOf(me()) }),
    ranked, youRank, plan,
    name: () => ident().name,
    wallet: () => ident().wallet,
    setName: n => {
      const next = cleanName(n);
      if (!next) return me();
      st.name = next;
      if (!readWallet() && !st.linked) {
        const prev = st.self;
        const id = "n:" + next.toLowerCase();
        migrate(prev, id, next, null); st.self = id;
        const e = me(); e.name = next;
      }
      persist(); return me();
    },
    noteWallet: addr => {
      // Player tapped Connect. Stores the address for the board key. Does not spend SOL or tokens.
      const w = String(addr || "").trim();
      if (!w) return me();
      st.linked = w;
      const prev = st.self;
      migrate(prev, "w:" + w, trunc(w), w); st.self = "w:" + w;
      persist(); return me();
    },
    refresh: () => me(),
    kill: (kind, tierKey, leg) => {
      const t = TIERS.indexOf(tierKey) >= 0 ? tierKey : (BOSS_TIER[kind] || "common");
      const e = me();
      if (e.pts == null) e.pts = scoreOf(Object.assign({}, e, { shards: 0 }));   // bank older kills once, then decay from here
      e.kk = e.kk || {}; const nth = e.kk[kind] = (e.kk[kind] | 0) + 1;
      e.last = killPoints(t, nth, leg); e.pts = (e.pts | 0) + e.last;
      e.kills[t] = (e.kills[t] | 0) + 1;
      e.bosses = (e.bosses | 0) + 1;
      if (leg) e.legs = (e.legs | 0) + 1;
      return touchScore(e);
    },
    earn: n => { n = n | 0; if (n <= 0) return me(); const e = me(); e.shards = (e.shards | 0) + n; return touchScore(e); },
    setPot: n => { potSol = Math.max(0, +n || 0); return plan(); },
    pot: () => potSol,
    resetAllowed: () => !!(PRIZE.allowReset || new URLSearchParams(location.search).has("lbreset")),
    resetSeason: () => {
      if (!(PRIZE.allowReset || new URLSearchParams(location.search).has("lbreset"))) return false;
      const name = st.name;
      st = emptyState(); st.name = name; me(); persist(); return true;
    },
    seed: (name, stats) => {
      const nm = cleanName(name) || "Rival";
      const id = "n:" + nm.toLowerCase();
      let e = rowById(id);
      if (!e) { e = fresh(id, nm, null); st.board.push(e); }
      e.name = nm;
      if (stats) {
        if (stats.kills) e.kills = Object.assign(blankKills(), stats.kills);
        if (stats.shards != null) e.shards = stats.shards | 0;
        if (stats.legs != null) e.legs = stats.legs | 0;
        e.bosses = TIERS.reduce((s, t) => s + (e.kills[t] | 0), 0); delete e.pts; delete e.kk;
      }
      return touchScore(e);
    },
    dump: () => JSON.parse(JSON.stringify(st)),
  };
}
