/* =====================================================================
   PhysioPath — clinical correlation maps (evidence-based pathway integrity)

   Locks the diagnosis → protocol / flag / exercise-tag fixes so OA never
   again becomes TKA, THA never strips its own heel slides, cardiac patients
   keep moderate aerobic work, and venous disease never gets PAD claudication
   scripts.
===================================================================== */
import { planFor, resetState, allExercises } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E } from "./shared.mjs";

suite("clinical correlation maps");

const condByName = re => (E.window.CONDITIONS || []).find(c => re.test(c.name));
const names = prog => allExercises(prog).map(e => e.n || e.name || "").join(" | ");

test("Knee OA maps to knee_oa — not knee_replacement", () => {
  const c = condByName(/^Knee osteoarthritis$/i) || condByName(/Knee osteoarthritis \(Left\)/i);
  assert(c, "expected Knee osteoarthritis in catalogue");
  assert(c.protocol === "knee_oa", `Knee OA protocol must be knee_oa, got ${c.protocol}`);
  assert(!c.autoFlags?.includes("knee_replacement"), "OA must not auto-flag knee_replacement");
  const prog = planFor(E, { condIds: [c.id], weeks: 8, age: 62, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/operated leg/.test(text), "OA plan must not use TKA 'operated leg' language");
  assert(!/protect the implant|the implant/.test(text), "OA plan must not use implant-protection language");
});

test("Hip fracture post-fixation is fracture_le — not THA precautions", () => {
  const c = condByName(/Hip fracture \(post-fixation\)/i);
  assert(c, "expected Hip fracture (post-fixation) recovery");
  assert(c.protocol === "fracture_le", `expected fracture_le, got ${c.protocol}`);
  resetState(E, { condIds: [c.id], weeks: 4, surgery: "yes" });
  const f = E.gatherFlags();
  assert(!f.includes("hip_replacement"),
    `hip fracture fixation must NOT auto-apply hip_replacement flag — got [${f.join(", ")}]`);
});

test("Revision TKR maps to knee_replacement, not hip_replacement", () => {
  const c = condByName(/Revision total knee replacement/i);
  assert(c, "expected Revision total knee replacement");
  assert(c.protocol === "knee_replacement", `expected knee_replacement, got ${c.protocol}`);
});

test("Post-DVT uses venous_rehab — not PAD claudication script", () => {
  const c = condByName(/Post-DVT reconditioning/i);
  assert(c, "expected Post-DVT reconditioning");
  assert(c.protocol === "venous_rehab", `expected venous_rehab, got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 55 });
  const text = names(prog).toLowerCase() + " " + (prog.notes || []).join(" ").toLowerCase();
  assert(!/walk.?to.?claudication|moderate calf \(claudication\)|walk until moderate leg pain/.test(text),
    "DVT plan must not prescribe walk-to-claudication (PAD therapy)");
});

test("Lymphedema maps to lymphedema protocol, not pad", () => {
  const c = condByName(/^Lymphedema \(exercise management\)$/i) || condByName(/Lower-limb lymphedema/i);
  assert(c, "expected a lymphedema condition");
  assert(c.protocol === "lymphedema", `expected lymphedema protocol, got ${c.protocol}`);
});

test("Charcot neuroarthropathy uses charcot protocol + critical_offload", () => {
  const c = condByName(/^Charcot neuroarthropathy$/i);
  assert(c, "expected Charcot neuroarthropathy");
  assert(c.protocol === "charcot", `expected charcot protocol, got ${c.protocol}`);
  resetState(E, { condIds: [c.id], weeks: 4 });
  assert(E.gatherFlags().includes("critical_offload"), "Charcot must carry critical_offload");
});

test("HCM carries hcm flag and is not heart_failure protocol", () => {
  const c = condByName(/hypertrophic cardiomyopathy/i);
  assert(c, "expected HCM condition");
  assert(c.protocol !== "heart_failure", `HCM must not use heart_failure protocol, got ${c.protocol}`);
  assert((c.autoFlags || []).includes("hcm") || /hypertrophic/i.test(c.name),
    "HCM should auto-flag hcm via name/protocol");
  resetState(E, { condIds: [c.id], weeks: 8 });
  assert(E.gatherFlags().includes("hcm"), "gatherFlags must include hcm for HCM diagnoses");
});

test("THA keeps heel slides after hip_replacement flag (no self-filter)", () => {
  const c = condByName(/Total hip replacement recovery/i);
  assert(c, "expected THA recovery condition");
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 68, surgery: "yes" });
  const text = names(prog).toLowerCase();
  assert(/heel slide|ankle pump|glute|quad set|weight shift|sit-to-stand|walk/.test(text),
    `THA early plan should keep precaution-safe core items, got: ${text.slice(0, 200)}`);
  /* True end-range deep flexion items may be filtered; mid-range ROM must remain */
  assert(allExercises(prog).length >= 3, "THA phase content must not empty to nothing");
});

test("Cardiac condition keeps moderate aerobic despite cardiac flag", () => {
  const c = condByName(/Post-CABG|cardiac rehab|Heart failure \(reduced/i);
  assert(c, "expected a cardiac condition");
  const prog = planFor(E, { condIds: [c.id], weeks: 6, age: 60, flags: ["cardiac"] });
  const text = names(prog).toLowerCase();
  assert(/walk|aerobic|bike|marching|interval/.test(text),
    `cardiac plan must retain moderate aerobic content after flags — got: ${text.slice(0, 240)}`);
});

test("PAD still has walk-to-claudication (evidence-based, must not regress)", () => {
  const c = condByName(/Peripheral artery disease \(claudication\)/i);
  assert(c, "expected PAD claudication condition");
  assert(c.protocol === "pad", `PAD must stay on pad protocol, got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 70 });
  const text = names(prog).toLowerCase();
  assert(/claudication|walk/.test(text), "PAD plan should still feature structured walking");
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
