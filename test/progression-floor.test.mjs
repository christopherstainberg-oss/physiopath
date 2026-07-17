/* =====================================================================
   PhysioPath — biological-floor progression (audit PROG-1 / PROG-2)

   The progression resolver used to be one-directional: criteria could only ever
   HOLD a patient back (min(criteria, calendar)), never advance them — which
   contradicted the app's own "progress on the criteria, not the dates" message.

   Now each plan is classed as FLOORED (a hard tissue clock — graft/bone/repair
   healing, where the calendar must cap advancement) or CAPACITY-DRIVEN (load-
   driven conditions, where meeting the criteria advances you, early or late).
   Without a self-report the calendar still drives — the path the snapshots use.
===================================================================== */
import { planFor } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E, COND } from "./shared.mjs";

suite("biological-floor progression (PROG-1/2)");

// the full base plan for a profile (carries label/postop/ph — what planFloored reads)
function planOf(prof){ planFor(E, prof); return E.detectPlan(E.selectedConditions()[0]); }

// resolve the current phase for a profile, optionally after meeting phases 1-3 of the criteria
function resolve(prof, ticked){
  E.state.progress = {};
  let prog = planFor(E, prof);
  const label = prog.items[0].plan.label;
  const calendar = prog.items[0].planPhase;                 // no criteria -> the calendar phase
  if(ticked){ E.state.progress = { [label]: [true, true, true] }; prog = E.generateProgram(); }
  E.state.progress = {};
  return { calendar, resolved: prog.items[0].planPhase };
}

test("PROG-2: post-op / healing plans are floored; load-driven plans are not", () => {
  assert(E.planFloored(planOf({ condIds:[COND.acl.id], surgery:"yes", weeks:2 })), "post-op ACL graft must be floored");
  assert(E.planFloored(planOf({ condIds:[COND.tkr.id], surgery:"yes", weeks:4 })), "TKR must be floored");
  assert(!E.planFloored(planOf({ condIds:[COND.frozen.id], weeks:6 })), "frozen shoulder must be criteria-driven");
  assert(!E.planFloored(planOf({ condIds:[COND.ankle.id], weeks:2 })), "ankle sprain must be criteria-driven");
});

test("PROG-1: a load-driven plan ADVANCES when criteria are met ahead of the calendar", () => {
  const r = resolve({ condIds:[COND.frozen.id], weeks:6 }, true);
  assert(r.resolved > r.calendar,
    `frozen shoulder should advance past the calendar (P${r.calendar}) when criteria are met, got P${r.resolved}`);
});

test("PROG-1: a floored plan stays CALENDAR-CAPPED despite early criteria", () => {
  const r = resolve({ condIds:[COND.acl.id], surgery:"yes", weeks:2 }, true);
  assert(r.resolved <= r.calendar,
    `an ACL graft must not outrun its healing calendar (P${r.calendar}) on feel alone, got P${r.resolved}`);
});

test("no self-report -> the calendar drives (the snapshot path, unchanged)", () => {
  assert(resolve({ condIds:[COND.acl.id], surgery:"yes", weeks:2 }, false).resolved === 1, "ACL at wk 2 -> calendar phase 1");
  assert(resolve({ condIds:[COND.frozen.id], weeks:6 }, false).resolved === 0, "frozen shoulder at wk 6 -> calendar phase 0");
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
