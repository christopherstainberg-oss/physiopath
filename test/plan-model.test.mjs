/* =====================================================================
   PhysioPath — plan model from user data (Complete 1–5)

   1. One pain/load rule (≤5/10 during; next-morning not worse)
   2. builtFrom / planDrift snapshots more than pain+flags
   3. Simple vs intensive LBP fork from fear/sleep/stress/recurrence
   4. GETP-12 education notes (POTS, ME/CFS no GET, OA modest, older power)
   5. Goal (sport / work / ADLs) shapes phase size and program.goal
   Educational only — not a prescription.
===================================================================== */
import { planFor, resetState } from "./harness.mjs";
import { suite, test, assert, assertEqual } from "./runner.mjs";
import { E, COND } from "./shared.mjs";

suite("plan model from user data (1–5)");

const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const mkLog = pains => pains.map((p, i) => {
  const row = typeof p === "object" ? p : { pain: p };
  return { date: iso(pains.length - 1 - i), sessions: 1, ...row };
});
const condByName = re => (E.window.CONDITIONS || []).find(c => re.test(c.name));
const notesOf = prog => (prog.notes || []).join(" ").toLowerCase();

test("1: pain during >5/10 HOLDS even when the old ≥7 flare rule would miss it", () => {
  resetState(E, { program: null, log: mkLog(Array(8).fill(6)) });
  const sig = E.progressionSignal();
  assert(sig && sig.rec === "hold", `pain 6/10 should hold (pain-monitor ≤5), got ${JSON.stringify(sig)}`);
  assert(/5/.test(sig.why), `hold reason should name the 5/10 rule: ${sig.why}`);
});

test("1: next-morning pain worse than during HOLDS", () => {
  resetState(E, { program: null, log: mkLog([
    { pain: 2 }, { pain: 2 }, { pain: 3, painMorning: 6 },
  ]) });
  const sig = E.progressionSignal();
  assert(sig && sig.rec === "hold", `worse next-morning pain should hold, got ${JSON.stringify(sig)}`);
  assert(/morning|overnight|settle/i.test(sig.why), `should name next-morning: ${sig && sig.why}`);
});

test("1: loadGuidance and weekly nudge drop the 10% rule; keep ≤5 and next morning", () => {
  resetState(E, { program: null, log: mkLog(Array(6).fill(2)), painRest: 2, painMove: 2 });
  const g = E.loadGuidance();
  assert(!/10%/.test(g), `loadGuidance must not cite 10%: ${g}`);
  assert(/5/.test(g) && /morning/i.test(g), `loadGuidance should teach ≤5/10 + next morning: ${g}`);
  const item = planFor(E, { condIds: [COND.tkr.id], age: 60, surgery: "yes", weeks: 8, log: [] }).items[0];
  const tw = E.thisWeekFocus(item);
  assert(tw && !/10%/.test(tw.nudge), `weekly nudge must not cite 10%: ${tw && tw.nudge}`);
});

test("2: builtFrom records weeks, sleep, stress, workDemand", () => {
  const prog = planFor(E, {
    condIds: [COND.lbp.id], age: 40, weeks: 4, sleep: "lt6", stress: "high",
    workDemand: "heavy", log: [],
  });
  const b = prog.builtFrom || {};
  assert(b.sleep === "lt6", `builtFrom.sleep, got ${JSON.stringify(b)}`);
  assert(b.stress === "high", `builtFrom.stress, got ${JSON.stringify(b)}`);
  assert(b.workDemand === "heavy", `builtFrom.workDemand, got ${JSON.stringify(b)}`);
  assert(b.weeks === 4 || b.weeks === "4", `builtFrom.weeks, got ${b.weeks}`);
});

test("2: planDrift fires when sleep changes after the plan was built", () => {
  const prog = planFor(E, { condIds: [COND.lbp.id], age: 40, weeks: 4, sleep: "lt6", log: [] });
  E.state.program = prog;
  E.state.sleep = "";
  const d = E.planDrift();
  assert(d && d.length, `expected drift after sleep change, got ${JSON.stringify(d)}`);
  assert(/sleep/i.test(d.join(" ")), `drift should name sleep: ${d.join(" ")}`);
});

test("3: fearful + poor sleep LBP gets keep-active / less-intensive notes — not a CBT package", () => {
  const prog = planFor(E, {
    condIds: [COND.lbp.id], age: 42, weeks: 4, surgery: "no",
    moveConfidence: "fearful", sleep: "lt6", stress: "high", log: [],
  });
  const n = notesOf(prog);
  assert(/keep active|stay active|less intensive|self-manage/i.test(n), `simple-fork notes missing: ${n.slice(0, 400)}`);
  assert(!/cognitive behavioural|cognitive behavioral|cbt programme|cbt program/i.test(n), "must not resurrect withdrawn NICE CBT packages");
  assert(/education|not a prescription|clinician/i.test(n), "must stay educational");
});

test("4: POTS notes recumbent→upright GETP education, not a prescription", () => {
  const c = condByName(/Postural orthostatic tachycardia syndrome \(POTS\)/i);
  assert(c, "expected POTS in catalogue");
  const n = notesOf(planFor(E, { condIds: [c.id], weeks: 8, age: 28, surgery: "no", log: [] }));
  assert(/recumbent|upright|seated/i.test(n), `POTS should mention recumbent/upright: ${n.slice(0, 400)}`);
  assert(/not a prescription|education|clinician/i.test(n), "POTS notes must stay educational");
});

test("4: ME/CFS notes forbid graded exercise / fixed increases; settled logs do not auto-advance", () => {
  const c = condByName(/Chronic fatigue syndrome \/ ME/i);
  assert(c, "expected ME/CFS in catalogue");
  const n = notesOf(planFor(E, { condIds: [c.id], weeks: 8, age: 35, surgery: "no", log: [] }));
  assert(/energy|post-exertional|pacing|limits/i.test(n), `ME/CFS should name energy limits: ${n.slice(0, 400)}`);
  assert(/graded exercise|fixed incremental|do not use GET|should not/i.test(n), `ME/CFS must warn against GET: ${n.slice(0, 400)}`);
  resetState(E, { condIds: [c.id], age: 35, weeks: 8, surgery: "no", log: mkLog(Array(14).fill(2)), program: null });
  E.generateProgram();
  const sig = E.progressionSignal();
  assert(!sig || sig.rec !== "advance", `ME/CFS must not auto-advance on a calendar GET, got ${JSON.stringify(sig)}`);
});

test("4: knee OA notes stay modest and educational", () => {
  const c = condByName(/^Knee osteoarthritis$/i) || condByName(/Knee osteoarthritis \(Left\)/i);
  assert(c, "expected Knee osteoarthritis");
  const n = notesOf(planFor(E, { condIds: [c.id], weeks: 8, age: 62, surgery: "no", log: [] }));
  assert(/modest|small|education|not a prescription/i.test(n), `OA honesty missing: ${n.slice(0, 400)}`);
});

test("5: program.goal is sport / work / adl from user data; sport gets a larger late-phase cap than ADLs", () => {
  const adl = planFor(E, { condIds: [COND.lbp.id], age: 40, weeks: 4, log: [], returnSports: [], workDemand: "" });
  assertEqual(adl.goal, "adl", "default goal");
  const work = planFor(E, { condIds: [COND.lbp.id], age: 40, weeks: 4, log: [], workDemand: "heavy" });
  assertEqual(work.goal, "work", "heavy work");
  const sport = planFor(E, { condIds: [COND.ankle.id], age: 25, weeks: 4, log: [], returnSports: ["Basketball"] });
  assertEqual(sport.goal, "sport", "return sport");
  resetState(E, { timePerDay: "20to40", returnSports: [], workDemand: "" });
  const adlN = E.phaseTarget(3);
  resetState(E, { timePerDay: "20to40", returnSports: ["Soccer"], workDemand: "" });
  const sportN = E.phaseTarget(3);
  assert(sportN > adlN, `sport late-phase cap (${sportN}) should exceed ADL cap (${adlN})`);
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
