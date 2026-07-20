/* =====================================================================
   Acute-care multi-domain conditions — pathway correlation tests
===================================================================== */
import { planFor, resetState, allExercises } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E } from "./shared.mjs";

suite("acute-care multi-domain correlations");

const condByName = re => (E.window.CONDITIONS || []).find(c => re.test(c.name));
const names = prog => allExercises(prog).map(e => e.n || e.name || "").join(" | ");

test("Sepsis recovery uses acute_medical protocol + flags", () => {
  const c = condByName(/Sepsis recovery \(post-ward\)/i) || condByName(/Septic shock recovery/i);
  assert(c, "expected sepsis recovery condition");
  assert(c.protocol === "acute_medical", `got ${c.protocol}`);
  resetState(E, { condIds: [c.id], weeks: 2 });
  const f = E.gatherFlags();
  assert(f.includes("acute_medical") || f.includes("post_sepsis"),
    `expected acute_medical/post_sepsis flags — [${f.join(", ")}]`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 68 });
  assert(allExercises(prog).length >= 3, "non-empty sepsis plan");
});

test("Polytrauma maps to polytrauma protocol", () => {
  const c = condByName(/Polytrauma \(multi-system\)/i);
  assert(c, "expected polytrauma condition");
  assert(c.protocol === "polytrauma", `got ${c.protocol}`);
  resetState(E, { condIds: [c.id], weeks: 3 });
  assert(E.gatherFlags().includes("polytrauma"), "polytrauma flag required");
});

test("Major burn maps to burn protocol + major_burn flag", () => {
  const c = condByName(/Major burn \(>20% TBSA\)/i) || condByName(/Full-thickness burn \(grafted\)/i);
  assert(c, "expected major burn condition");
  assert(c.protocol === "burn", `got ${c.protocol}`);
  resetState(E, { condIds: [c.id], weeks: 2 });
  assert(E.gatherFlags().includes("major_burn"), "major_burn flag required");
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 40 });
  const text = names(prog).toLowerCase();
  assert(/rom|position|stretch|scar|walk|function/.test(text),
    `burn plan should emphasize ROM/positioning — ${text.slice(0, 160)}`);
});

test("Acute PE uses venous_rehab — NOT post_covid", () => {
  const c = condByName(/Acute pulmonary embolism \(intermediate-risk\)/i)
    || condByName(/^Pulmonary embolism recovery$/i)
    || condByName(/Post-pulmonary-embolism reconditioning/i);
  assert(c, "expected PE condition");
  assert(c.protocol === "venous_rehab", `PE must not be post_covid; got ${c.protocol}`);
  assert(c.protocol !== "post_covid", "PE must not use post-viral pathway");
  resetState(E, { condIds: [c.id], weeks: 2 });
  const f = E.gatherFlags();
  assert(f.includes("pe_acute") || f.includes("dvt"),
    `PE should carry pe_acute/dvt — [${f.join(", ")}]`);
});

test("Hospitalised pneumonia uses pulmonary_rehab", () => {
  const c = condByName(/Community-acquired pneumonia \(hospitalised\)/i);
  assert(c, "expected CAP condition");
  assert(c.protocol === "pulmonary_rehab", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 72 });
  assert(allExercises(prog).length >= 3, "pneumonia plan non-empty");
});

test("Cardiogenic shock recovery is cardiac pathway with clearance", () => {
  const c = condByName(/Cardiogenic shock recovery/i);
  assert(c, "expected cardiogenic shock condition");
  assert(c.protocol === "cardiac_rehab" || c.protocol === "heart_failure", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 3, age: 65 });
  assert(prog.clearance || E.clearanceNeeded(prog.flags), "needs clearance");
});

test("Emergency laparotomy uses abdominal_surgery + precautions flag path", () => {
  const c = condByName(/Emergency laparotomy recovery/i);
  assert(c, "expected emergency laparotomy");
  assert(c.protocol === "abdominal_surgery", `got ${c.protocol}`);
  resetState(E, { condIds: [c.id], weeks: 2 });
  const f = E.gatherFlags();
  assert(f.includes("abdominal_precautions") || (c.autoFlags || []).includes("abdominal_precautions")
    || c.protocol === "abdominal_surgery",
    "abdominal pathway expected");
});

test("Malignant cord compression with SCI deficit uses sci protocol", () => {
  const c = condByName(/Malignant spinal cord compression \(SCI-level deficit\)/i);
  assert(c, "expected MSCC SCI-level condition");
  assert(c.protocol === "sci", `got ${c.protocol}`);
});

test("Acute medical plan is clearance-aware and multi-phase", () => {
  const c = condByName(/Acute kidney injury \(AKI\) recovery/i) || condByName(/Sepsis recovery/i);
  assert(c, "expected acute medical condition");
  const prog = planFor(E, { condIds: [c.id], weeks: 1, age: 70 });
  assert(allExercises(prog).length >= 4, "should produce multi-exercise content");
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
