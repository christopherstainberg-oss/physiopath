/* =====================================================================
   PhysioPath — comorbidity healing-scaler

   Systemic factors that slow tissue healing (diabetes, current smoking,
   long-term steroids, CKD, active cancer treatment, PAD, heavy alcohol, a
   high BMI) each stretch the recovery timeline a little, and they COMPOUND —
   the whole point of the scaler is that a diabetic smoker runs longer than
   either alone, instead of collapsing to a single flat variant. These pin
   that behaviour: a single factor extends, factors stack, and the product is
   capped so it can never run away. Age is deliberately excluded here (the
   `older` variant owns it), so these profiles hold age fixed at 60.
===================================================================== */
import { planFor } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E, COND } from "./shared.mjs";

suite("comorbidity healing-scaler");

// A post-op TKR: a real REHAB_PLANS timeline to scale, with age < 70 so the
// older-adult pathway stays out of the way and healingScale is what moves.
const BASE = { condIds: [COND.tkr.id], age: 60, surgery: "yes", weeks: 6 };
const weeksFor = extra => planFor(E, { ...BASE, ...extra }).totalWeeks;

const baseline = weeksFor({});

test("baseline (no comorbidities) is a sane, unscaled timeline", () => {
  assert(baseline >= 12, `expected a real multi-week plan, got ${baseline}w`);
});

test("a single healing comorbidity extends the timeline", () => {
  const diabetic = weeksFor({ flags: ["diabetes"] });
  assert(diabetic > baseline,
    `diabetes should extend the ${baseline}w timeline, got ${diabetic}w`);
});

test("comorbidities COMPOUND — stacked factors exceed any single one", () => {
  const one = weeksFor({ flags: ["diabetes"] });
  const three = weeksFor({ flags: ["diabetes"], smoking: "current", alcohol: "heavy" });
  assert(three > one,
    `a diabetic smoker who drinks heavily should run longer than diabetes alone (${one}w), got ${three}w`);
});

test("a high BMI counts as a healing factor", () => {
  const obese = weeksFor({ vitals: { ...E.state.vitals, height: 170, weight: 120 } }); // BMI ~41
  assert(obese > baseline, `a high BMI should extend ${baseline}w, got ${obese}w`);
});

test("the scaler is CAPPED — it can never run away", () => {
  const everything = weeksFor({
    flags: ["diabetes", "ckd", "cancer_treatment", "pad"],
    smoking: "current", alcohol: "heavy",
    vitals: { ...E.state.vitals, height: 170, weight: 120 },
  });
  // cap is 1.6x; allow a couple of weeks of boundary rounding either side.
  assert(everything > baseline, `should still be extended, got ${everything}w`);
  assert(everything <= Math.round(baseline * 1.6) + 2,
    `every factor at once must stay under the ~1.6x cap of ${baseline}w, got ${everything}w`);
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
