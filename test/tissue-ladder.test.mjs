/* =====================================================================
   PhysioPath — week-resolved progression (tissue loading ladders)

   A static per-phase dose can't say "do one more set than last week". These
   pin the layer that can: tissueClass() routes a condition to the right ladder
   (a tendon remodels under heavy-slow load; a bone needs progressive weight-
   bearing; a nerve needs high-repetition task practice), and thisWeekFocus()
   resolves where in the current phase the person is and the single thing to
   change THIS week — without touching the plan's weeks or doses.
===================================================================== */
import { planFor, resetState } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E, COND } from "./shared.mjs";

suite("week-resolved progression (tissue ladders)");

test("tissueClass routes each condition to the right ladder", () => {
  resetState(E, { surgery: "no" });
  const cases = [
    ["Achilles tendinopathy", "tendon"],
    ["Tibial stress fracture", "bone"],
    ["Knee cartilage defect (microfracture)", "cartilage"], // must beat the bone regex
    ["ACL reconstruction", "ligament"],
    ["Hamstring strain", "muscle"],
    ["Stroke recovery", "nerve"],
    ["Non-specific low back pain", "general"],
  ];
  for (const [name, cls] of cases) {
    const got = E.tissueClass({ name });
    assert(got === cls, `"${name}" -> expected ${cls}, got ${got}`);
  }
});

test("every ladder has a rung for all four phase stages", () => {
  for (const k of Object.keys(E.LOADING_LADDER)) {
    const rungs = E.LOADING_LADDER[k];
    assert(rungs.length === 4 && rungs.every(r => typeof r === "string" && r.length > 10),
      `ladder "${k}" must have four non-trivial rungs`);
  }
});

test("thisWeekFocus resolves week-in-phase, a rung and an actionable nudge", () => {
  const item = planFor(E, { condIds: [COND.tkr.id], age: 60, surgery: "yes", weeks: 8 }).items[0];
  const tw = E.thisWeekFocus(item);
  assert(tw, "expected a focus for a matched-plan item");
  assert(tw.wip >= 1 && tw.wip <= tw.len, `week-in-phase ${tw.wip} must be within 1..${tw.len}`);
  assert(typeof tw.rung === "string" && tw.rung.length > 10, "rung should be a real cue");
  assert(/week|set|tempo|tolerance|progress|phase/i.test(tw.nudge), `nudge should be actionable, got: ${tw.nudge}`);
});

test("the nudge distinguishes the start of a phase from mid-phase", () => {
  const early = E.thisWeekFocus(planFor(E, { condIds: [COND.tkr.id], age: 60, surgery: "yes", weeks: 0 }).items[0]);
  assert(/start of this phase|establish tolerance/i.test(early.nudge),
    `expected a start-of-phase nudge at week 0, got: ${early.nudge}`);
});

test("thisWeekFocus is null when there is no matched plan phase", () => {
  assert(E.thisWeekFocus(null) === null, "null item -> null");
  assert(E.thisWeekFocus({ name: "x", phases: [], planPhase: -1 }) === null, "no phase -> null");
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
