/* =====================================================================
   PhysioPath — session effort check-in (audit OBJ-2)

   A per-session "how hard was that? did you finish the sets?" extends the
   response-based progression signal beyond pain: grinding it out or not
   finishing HOLDS; breezing through (easy + all sets + settled pain) turns the
   weekly nudge into an "add load". No effort logged → the old pain-based signal
   is unchanged.
===================================================================== */
import { suite, test, assert } from "./runner.mjs";
import { E } from "./shared.mjs";

suite("session effort check-in (OBJ-2)");

const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
// oldest -> newest, dated within the last fortnight so effectivePain/recentEffort see them
const setLog = entries => { E.state.log = entries.map((e, i) => ({ date: iso(entries.length - 1 - i), pain: e.pain, sessions: 1, effort: e.effort, sets: e.sets })); };

test("recentEffort summarizes the last few sessions", () => {
  setLog([{ pain:3, effort:6, sets:"all" }, { pain:3, effort:8, sets:"most" }]);
  const re = E.recentEffort();
  assert(re && re.n === 2, "two sessions");
  assert(Math.abs(re.avgEffort - 7) < 0.01, `avg effort 7, got ${re.avgEffort}`);
  assert(Math.abs(re.avgSets - 1.5) < 0.01, `avg sets (all=2, most=1) = 1.5, got ${re.avgSets}`);
  E.state.log = [];
});

test("hard sessions -> HOLD even with settled pain", () => {
  setLog([{ pain:2, effort:9, sets:"most" }, { pain:2, effort:9, sets:"most" }, { pain:2, effort:8, sets:"few" }]);
  const s = E.progressionSignal();
  assert(s && s.rec === "hold", `expected hold on hard sessions, got ${JSON.stringify(s)}`);
  assert(/hard|finishing|consolidate/i.test(s.why), `reason should name it: ${s && s.why}`);
  E.state.log = [];
});

test("not finishing the sets -> HOLD", () => {
  setLog([{ pain:2, effort:5, sets:"few" }, { pain:2, effort:5, sets:"few" }, { pain:2, effort:5, sets:"few" }]);
  const s = E.progressionSignal();
  assert(s && s.rec === "hold", `only a few sets completed should hold, got ${JSON.stringify(s)}`);
  E.state.log = [];
});

test("easy + all sets + settled pain -> ADVANCE with an add-load nudge", () => {
  // 6 sessions so adherence is on-track (the default weekly target is ~4-6)
  setLog(Array.from({ length:6 }, () => ({ pain:2, effort:3, sets:"all" })));
  const s = E.progressionSignal();
  assert(s && s.rec === "advance", `expected advance, got ${JSON.stringify(s)}`);
  assert(/add load|breezing/i.test(s.why), `should nudge to add load: ${s && s.why}`);
  E.state.log = [];
});

test("no effort logged -> the pain-based signal is unchanged", () => {
  E.state.log = Array.from({ length:6 }, (_, i) => ({ date: iso(5 - i), pain:2, sessions:1 }));
  const s = E.progressionSignal();
  assert(s && s.rec === "advance", `settled pain still advances, got ${JSON.stringify(s)}`);
  assert(!/breezing/i.test(s.why), "without effort data there's no 'breezing through' claim");
  E.state.log = [];
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
