/* =====================================================================
   Shared fixtures for the test suites.

   ONE engine is loaded here and imported by every *.test.mjs (ES modules are
   singletons, so they share this instance). Every test drives it through
   planFor(), which resets state first, so suites can't leak into each other —
   and we pay the ~seconds-long data-file parse once, not per file.
===================================================================== */
import { loadEngine } from "./harness.mjs";

export const E = loadEngine();

/* Resolve a representative condition out of the LIVE 40k catalogue by regex,
   so the fixtures track the shipped data rather than hard-coded ids. */
export const pick = re => {
  const c = E.window.CONDITIONS.find(c => re.test(c.name) || re.test(c.region || ""));
  if (!c) throw new Error("no condition matches " + re);
  return c;
};

export const COND = {
  acl:     pick(/acl reconstruction/i),
  tkr:     pick(/knee replacement|knee arthroplasty/i),
  thr:     pick(/hip replacement|hip arthroplasty/i),
  cuff:    pick(/rotator cuff (repair|tear)/i),
  ankle:   pick(/ankle sprain/i),
  lbp:     pick(/low back pain|lumbar/i),
  stroke:  pick(/stroke/i),
  cardiac: pick(/cardiac rehab|coronary|CABG|heart failure/i),
  copd:    pick(/COPD|pulmonary/i),
  osteo:   pick(/osteoporos/i),
  cp:      pick(/cerebral palsy/i),
  severs:  pick(/sever|calcaneal apophysitis/i),
  frozen:  pick(/frozen shoulder|adhesive capsulitis/i),
};

export const AGES_CHILD = [1, 3, 5, 8, 12];
export const AGES_TEEN = [13, 14, 15];
export const AGES_ADULT = [25, 40, 70];

/* the two prose age-gate regexes, straight out of the engine's own table */
export const MAXIMAL_RE = E.PROTO_AGE_RULES[0][0];   // olympic|clean|snatch|1rm|max effort|nordic|…
export const EQUIP_RE = E.PROTO_AGE_RULES[1][0];     // barbell|kettlebell|machine|…|leg press|bench press

/* A deterministic spread across the whole catalogue: every `count`-th condition
   in id order. Diverse regions/domains without generating all 40k programs. */
export function sampleConditions(count) {
  const all = E.window.CONDITIONS;
  const stride = Math.max(1, Math.floor(all.length / count));
  const out = [];
  for (let i = 0; i < all.length; i += stride) out.push(all[i]);
  return out;
}
