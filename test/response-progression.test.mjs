/* =====================================================================
   PhysioPath — response-based progression (journal-driven)

   The plan is time-based, but a phase should hold or clear on what the person
   is actually LOGGING, not just the calendar. progressionSignal() turns the
   journal into a call — auto-regress on a rising trend or a flare, consolidate
   when sessions are behind, green-light only when settled AND consistent — and
   thisWeekFocus() adopts it over the time-based nudge when the data supports it.
===================================================================== */
import { planFor, resetState } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E, COND } from "./shared.mjs";

suite("response-based progression (journal-driven)");

// ISO date n days ago — real Date is fine in the test process (only workflows ban it).
const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
// oldest -> newest, dated within the last two weeks so recentPain() sees them.
const mkLog = pains => pains.map((p, i) => ({ date: iso(pains.length - 1 - i), pain: p, sessions: 1 }));

test("a rising pain trend -> HOLD (auto-regress)", () => {
  resetState(E, { program: null, log: mkLog([2, 2, 2, 2, 2, 2, 2, 5, 5, 5, 5, 5, 5, 5]) });
  const sig = E.progressionSignal();
  assert(sig && sig.rec === "hold", `expected hold on a rising trend, got ${JSON.stringify(sig)}`);
  assert(/trending up|ease back/i.test(sig.why), `hold reason should name the trend: ${sig.why}`);
});

test("a current flare (>=7/10) -> HOLD even without a rising trend", () => {
  resetState(E, { program: null, log: mkLog(Array(14).fill(8)) });
  const sig = E.progressionSignal();
  assert(sig && sig.rec === "hold", `expected hold at a steady 8/10, got ${JSON.stringify(sig)}`);
});

test("settled + consistent -> ADVANCE (green light)", () => {
  resetState(E, { program: null, log: mkLog(Array(14).fill(2)) });
  const sig = E.progressionSignal();
  assert(sig && sig.rec === "advance", `expected advance when settled and consistent, got ${JSON.stringify(sig)}`);
});

test("too little logged data -> null (fall back to time-based)", () => {
  resetState(E, { program: null, log: mkLog([3]) });
  assert(E.progressionSignal() === null, "one logged day is not a trend");
  resetState(E, { program: null, log: [] });
  assert(E.progressionSignal() === null, "no log -> null");
});

test("thisWeekFocus adopts the journal signal over the time-based nudge", () => {
  const rising = mkLog([2, 2, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6]);
  const item = planFor(E, { condIds: [COND.tkr.id], age: 60, surgery: "yes", weeks: 8, log: rising }).items[0];
  const tw = E.thisWeekFocus(item);
  assert(tw.signal === "hold", `expected the weekly focus to hold, got ${tw.signal}`);
  assert(/trending up|ease back/i.test(tw.nudge), `nudge should carry the hold reason: ${tw.nudge}`);
});

test("with no journal, thisWeekFocus stays time-based", () => {
  const item = planFor(E, { condIds: [COND.tkr.id], age: 60, surgery: "yes", weeks: 8, log: [] }).items[0];
  const tw = E.thisWeekFocus(item);
  assert(tw.signal === null, `expected no signal without logs, got ${tw.signal}`);
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
