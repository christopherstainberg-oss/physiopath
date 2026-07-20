/* =====================================================================
   Acute-care neurological conditions — pathway correlation tests
===================================================================== */
import { planFor, resetState, allExercises } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E } from "./shared.mjs";

suite("acute-care neurological correlations");

const condByName = re => (E.window.CONDITIONS || []).find(c => re.test(c.name));
const names = prog => allExercises(prog).map(e => e.n || e.name || "").join(" | ");

test("catalogue includes acute ischemic stroke early rehab", () => {
  const c = condByName(/Acute ischemic stroke \(early rehab\)/i);
  assert(c, "expected Acute ischemic stroke (early rehab)");
  assert(c.protocol === "stroke", `protocol stroke, got ${c.protocol}`);
  assert(c.domain === "neuro", "domain neuro");
  assert((c.autoFlags || []).includes("neuro_acute") || (c.autoFlags || []).includes("balance_risk"),
    "should carry neuro safety flags");
});

test("ICH / SAH map to stroke + raised_icp where named", () => {
  const ich = condByName(/Intracerebral hemorrhage \(ICH\) recovery/i);
  assert(ich, "expected ICH recovery");
  assert(ich.protocol === "stroke", `got ${ich.protocol}`);
  resetState(E, { condIds: [ich.id], weeks: 2 });
  const f = E.gatherFlags();
  assert(f.includes("raised_icp") || f.includes("neuro_acute"),
    `expected raised_icp or neuro_acute, got [${f.join(", ")}]`);
});

test("cervical SCI carries autonomic_dysreflexia flag", () => {
  const c = condByName(/Acute traumatic spinal cord injury \(cervical\)/i)
    || condByName(/Spinal cord injury \(C5/i);
  assert(c, "expected cervical SCI condition");
  resetState(E, { condIds: [c.id], weeks: 3 });
  const f = E.gatherFlags();
  assert(f.includes("autonomic_dysreflexia"),
    `cervical/high SCI must flag AD risk — got [${f.join(", ")}]`);
  assert(f.includes("balance_risk"), "SCI should include balance_risk");
});

test("GBS acute uses guillain_barre protocol and sub-fatigue content", () => {
  const c = condByName(/Guillain-Barré syndrome \(ICU-ventilated recovery\)/i)
    || condByName(/Guillain-Barré syndrome recovery/i);
  assert(c, "expected GBS condition");
  assert(c.protocol === "guillain_barre", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 3, age: 45 });
  assert(allExercises(prog).length >= 3, "GBS plan must have exercises");
  const text = names(prog).toLowerCase();
  assert(/rom|activation|balance|walk|sit|strength|breathing/.test(text),
    `GBS plan should include early neuro content — ${text.slice(0, 180)}`);
});

test("ICU-acquired weakness uses icu_aw protocol", () => {
  const c = condByName(/^ICU-acquired weakness$/i)
    || condByName(/Critical illness polyneuropathy/i);
  assert(c, "expected ICU-AW condition");
  assert(c.protocol === "icu_aw", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 58 });
  assert(E.gatherFlags().includes("icu_aw") || (c.autoFlags || []).includes("icu_aw"),
    "icu_aw flag expected");
  assert(allExercises(prog).some(e => /sit|stand|rom|walk|bed|edge/i.test(e.n || "")),
    "ICU-AW early plan should emphasize mobility/ROM");
});

test("Myasthenic crisis maps to myasthenia protocol", () => {
  const c = condByName(/myasthenic crisis/i) || condByName(/Myasthenia gravis \(hospitalised/i);
  assert(c, "expected myasthenia acute condition");
  assert(c.protocol === "myasthenia", `got ${c.protocol}`);
  resetState(E, { condIds: [c.id], weeks: 2 });
  assert(E.gatherFlags().includes("myasthenia"), "myasthenia flag required");
});

test("Hospital delirium uses encephalopathy protocol", () => {
  const c = condByName(/Hospital delirium \(hypoactive\)/i) || condByName(/ICU delirium recovery/i);
  assert(c, "expected delirium condition");
  assert(c.protocol === "encephalopathy", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 1, age: 78 });
  const text = names(prog).toLowerCase();
  assert(/orient|sit|walk|rom|transfer|balance|supervision|supervised|reorient/i.test(text)
    || allExercises(prog).length >= 3,
    "delirium plan should emphasize safe mobility / reorientation");
});

test("mild concussion does not force raised_icp like severe TBI", () => {
  const mild = condByName(/Mild traumatic brain injury \(concussion\)/i);
  const severe = condByName(/Severe traumatic brain injury/i) || condByName(/Acute subdural hematoma/i);
  assert(mild, "expected mild TBI/concussion");
  resetState(E, { condIds: [mild.id], weeks: 2 });
  const mildFlags = E.gatherFlags();
  if (severe) {
    resetState(E, { condIds: [severe.id], weeks: 2 });
    const sevFlags = E.gatherFlags();
    assert(sevFlags.includes("raised_icp"), `severe TBI/neurosurg should raise ICP flag — [${sevFlags.join(", ")}]`);
  }
  /* mild may still have neuro_acute/balance; ICP should not be automatic for concussion */
  assert(!mildFlags.includes("raised_icp"),
    `mild concussion must not auto-apply raised_icp — got [${mildFlags.join(", ")}]`);
});

test("acute neuro program is non-empty and clearance-aware", () => {
  const c = condByName(/Post-thrombectomy/i) || condByName(/Acute ischemic stroke/i);
  assert(c, "expected acute stroke condition");
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 70 });
  assert(prog.clearance || E.clearanceNeeded(prog.flags), "acute neuro should need clearance");
  assert(allExercises(prog).length >= 4, "should produce multi-exercise phases");
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
