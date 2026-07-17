/* =====================================================================
   PhysioPath — clinical safety fixes (audit SAFE-1 / SAFE-2 / SAFE-3)

   SAFE-1  high-risk medication contraindications must shape the BUILT plan,
           not sit behind an off-by-default render toggle.
   SAFE-2  Charcot neuroarthropathy and AVN of a weight-bearing joint must
           trigger offloading + clearance (and NOT catch Charcot-Marie-Tooth).
   SAFE-3  a suspected cauda-equina emergency raises the urgent flag the
           program render gates on to withhold the plan.
===================================================================== */
import { planFor, resetState } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E, COND } from "./shared.mjs";

suite("clinical safety fixes (SAFE-1/2/3)");

const condByName = re => (E.window.CONDITIONS || []).find(c => re.test(c.name));
const medByFlag  = flag => (E.window.MEDICATIONS || []).find(m => (m.flags || []).includes(flag));

test("SAFE-1: a high-risk medication shapes the BUILT plan even with the filter off", () => {
  const fq = medByFlag("fluoroquinolone");
  assert(fq, "expected a fluoroquinolone med (e.g. ciprofloxacin) in the catalogue");
  const prog = planFor(E, { medFilter: false, medIds: [fq.id], condIds: [COND.ankle.id], weeks: 3 });
  assert(prog.flags.includes("fluoroquinolone"),
    `fluoroquinolone (Achilles-rupture risk) must reach the built plan with medFilter off — got [${prog.flags.join(", ")}]`);
});

test("SAFE-1: no medication -> no medication flags (no false positives)", () => {
  const prog = planFor(E, { medIds: [], condIds: [COND.ankle.id], weeks: 3 });
  assert(!prog.flags.includes("fluoroquinolone") && !prog.flags.includes("med_bleeding"),
    "a plan with no meds must carry no medication flags");
});

test("SAFE-2: Charcot neuroarthropathy forces offloading + clearance", () => {
  const charcot = condByName(/charcot neuroarthropathy/i);
  assert(charcot, "expected a Charcot neuroarthropathy condition");
  resetState(E, { condIds: [charcot.id], weeks: 4 });
  const f = E.gatherFlags();
  assert(f.includes("critical_offload"), `expected critical_offload, got [${f.join(", ")}]`);
  assert(E.clearanceNeeded(f), "Charcot must force medical clearance");
});

test("SAFE-2: Charcot-Marie-Tooth is NOT treated as offloading-critical", () => {
  const cmt = condByName(/charcot-marie-tooth/i);
  assert(cmt, "expected Charcot-Marie-Tooth in the catalogue");
  resetState(E, { condIds: [cmt.id] });
  assert(!E.gatherFlags().includes("critical_offload"),
    "CMT is a hereditary neuropathy, not an acute collapse risk — it must not get critical_offload");
});

test("SAFE-2: AVN of a weight-bearing joint forces offloading + clearance", () => {
  const avn = condByName(/avascular necrosis of the femoral head/i);
  assert(avn, "expected an AVN femoral head condition");
  resetState(E, { condIds: [avn.id] });
  const f = E.gatherFlags();
  assert(f.includes("critical_offload"), `expected critical_offload, got [${f.join(", ")}]`);
  assert(E.clearanceNeeded(f), "AVN of a weight-bearing joint must force clearance");
});

test("SAFE-3: cauda equina raises the urgent flag that withholds the program", () => {
  resetState(E, { screen: { cauda: true }, condIds: [COND.lbp.id] });
  assert(E.gatherFlags().includes("red_flags_urgent"),
    "cauda equina must raise red_flags_urgent (renderProgram gates on this to withhold the plan)");
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
