/* =====================================================================
   PhysioPath — broad catalogue coverage

   The safety.test.mjs suite spot-checks ~13 hand-picked conditions. This one
   trades depth for BREADTH: it strides a deterministic sample across the whole
   40k-condition catalogue and asserts the same safety invariants hold
   everywhere, so a condition that routes to the wrong protocol can't hide.

   It also guards the two mechanisms the age gate actually relies on:
     • the gate HAS TEETH — an adult sport plan really does contain maximal
       work, and the identical child profile has it stripped (not merely that
       none happened to be present);
     • the PROSE age-rule table (protoAgeMin / PROTO_AGE_RULES) still assigns
       the floors the engine depends on — the drift that "silently slips a new
       name past a regex" fails loudly here.
===================================================================== */
import { planFor, allExercises, phaseSizes } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E, COND, MAXIMAL_RE, EQUIP_RE, sampleConditions } from "./shared.mjs";

/* One deterministic stride across the catalogue; each program generated once
   per age and reused by every assertion below (generation is the only cost). */
const SAMPLE = sampleConditions(50);
const SWEEP_AGES = [6, 12, 40];
const sweep = {};
for (const age of SWEEP_AGES) {
  sweep[age] = SAMPLE.map(c => {
    const prog = planFor(E, { condIds: [c.id], age, weeks: 6 });
    return { cond: c.name, ex: allExercises(prog), sizes: phaseSizes(prog) };
  });
}
const offenders = (age, pred, show) =>
  sweep[age].flatMap(r => r.ex.filter(pred).map(e => `${r.cond}: ${show(e)}`));

/* ------------------------------------------------------------------ */
suite(`catalogue sweep — structure (${SAMPLE.length} conditions across the catalogue)`);
for (const age of SWEEP_AGES) {
  test(`4 non-empty phases per condition @ age ${age}`, () => {
    const bad = sweep[age].filter(r =>
      !r.sizes.length || r.sizes.some(ph => ph.length !== 4 || ph.some(n => n < 1)));
    assert(bad.length === 0,
      `${bad.length} condition(s) with a bad phase shape, e.g. ` +
      bad.slice(0, 5).map(r => `${r.cond} ${JSON.stringify(r.sizes)}`).join("; "));
  });
  test(`every exercise carries a display name @ age ${age}`, () => {
    const bad = offenders(age, e => !e.n || !String(e.n).trim(), () => "(blank)");
    assert(bad.length === 0, `blank exercise name(s): ${[...new Set(bad)].slice(0, 5).join("; ")}`);
  });
}

/* ------------------------------------------------------------------ */
suite("catalogue sweep — child safety floors");
for (const age of [6, 12]) {
  test(`no maximal / ballistic names @ age ${age}`, () => {
    const off = offenders(age, e => MAXIMAL_RE.test(e.n), e => e.n);
    assert(off.length === 0, `${off.length} maximal name(s) at age ${age}: ${off.slice(0, 5).join("; ")}`);
  });
  test(`no coached free-weight / machine names @ age ${age}`, () => {
    const off = offenders(age, e => EQUIP_RE.test(e.n), e => e.n);
    assert(off.length === 0, `${off.length} equipment name(s) at age ${age}: ${off.slice(0, 5).join("; ")}`);
  });
  test(`declared-window exercises pass exAgeOk @ age ${age}`, () => {
    const off = offenders(age,
      e => (e.aMin != null || e.aMax != null) && !E.exAgeOk(e, age),
      e => `${e.n} [${E.exAgeMin(e)}–${E.exAgeMax(e)}]`);
    assert(off.length === 0, `${off.length} window violation(s) at age ${age}: ${off.slice(0, 5).join("; ")}`);
  });
}

/* ------------------------------------------------------------------ */
suite("catalogue sweep — adults get no play moves");
test("no exercise is capped below the adult @ age 40", () => {
  const off = offenders(40, e => E.exAgeMax(e) <= 40, e => `${e.n} (max ${E.exAgeMax(e)})`);
  assert(off.length === 0, `${off.length} play move(s) at age 40: ${off.slice(0, 5).join("; ")}`);
});

/* ------------------------------------------------------------------ */
suite("age gate has teeth (removes maximal work for children)");
for (const key of ["acl", "ankle"]) {
  test(`${key}: adult sport plan HAS maximal work, the child's has none`, () => {
    const sport = { returnSports: ["Basketball"], weeks: 8 };
    const adultMax = allExercises(planFor(E, { condIds: [COND[key].id], age: 30, ...sport }))
      .filter(e => MAXIMAL_RE.test(e.n));
    const childMax = allExercises(planFor(E, { condIds: [COND[key].id], age: 12, ...sport }))
      .filter(e => MAXIMAL_RE.test(e.n));
    // if this ever fails, the check itself has gone toothless (prose no longer
    // emits maximal names) — investigate before assuming the gate is fine.
    assert(adultMax.length >= 1, `expected the adult ${key} sport plan to include maximal work`);
    assert(childMax.length === 0, `child (12) ${key} plan leaked maximal work: ${childMax.map(e => e.n).join("; ")}`);
  });
}

/* ------------------------------------------------------------------ */
suite("prose age-rule table integrity (protoAgeMin / PROTO_AGE_RULES)");
test("maximal-effort names floor at 14", () => {
  for (const n of ["Power clean", "Snatch balance", "Nordic hamstring curl", "Depth jump",
                   "Pro-agility 5-10-5 shuttle", "1RM back squat test", "Bounding"])
    assert(E.protoAgeMin(n) >= 14, `${n} → ${E.protoAgeMin(n)}, expected ≥14`);
});
test("free-weight / machine names floor at 13", () => {
  for (const n of ["Barbell back squat", "Kettlebell swing", "Leg press", "Bench press", "Machine row"])
    assert(E.protoAgeMin(n) >= 13, `${n} → ${E.protoAgeMin(n)}, expected ≥13`);
});
test("child-appropriate names are not gated up", () => {
  for (const n of ["Pendulum swings", "Ankle pumps", "Quad sets", "Heel slides"])
    assert(E.protoAgeMin(n) < 13, `${n} → ${E.protoAgeMin(n)}, expected child-usable (<13)`);
});
test("the effort floor (14) is applied before the equipment floor (13)", () => {
  // The order is load-bearing: heavy-equipment moves that are ALSO maximal must
  // inherit 14, not 13. If these thresholds/rows are swapped, the split breaks.
  assert(E.PROTO_AGE_RULES[0][1] === 14, `row 0 threshold ${E.PROTO_AGE_RULES[0][1]}, expected 14 (maximal)`);
  assert(E.PROTO_AGE_RULES[1][1] === 13, `row 1 threshold ${E.PROTO_AGE_RULES[1][1]}, expected 13 (free weights)`);
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
