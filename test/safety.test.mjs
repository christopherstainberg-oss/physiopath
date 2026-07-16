/* =====================================================================
   PhysioPath — clinical-safety invariants

   These are the properties whose violation is INVISIBLE in the UI but wrong
   for a patient — the class of regression that shipped a "barbell tempo
   deadlift" to a 4-year-old with cerebral palsy and a byte-identical plan to
   a 1-year-old and a 40-year-old. Each test drives the real generateProgram()
   over a matrix of profiles and asserts a safety property, using the app's
   OWN rule definitions (PROTO_AGE_RULES, SPECIAL_PRECAUTIONS, the tag vocab)
   so the tests move in lockstep with the engine.
===================================================================== */
import { planFor, allExercises, phaseSizes } from "./harness.mjs";
import { suite, test, assert, assertEvery, report } from "./runner.mjs";
import { E, COND, AGES_CHILD, AGES_TEEN, AGES_ADULT, MAXIMAL_RE, EQUIP_RE } from "./shared.mjs";

/* ===================================================================
   1. No empty phases — a phase with zero exercises is an abandoned plan.
=================================================================== */
suite("no empty phases");
{
  const conds = ["acl", "tkr", "cuff", "ankle", "lbp", "stroke", "cardiac", "osteo", "cp", "severs"];
  for (const key of conds) {
    for (const age of [2, 5, 10, 16, 35, 70]) {
      for (const surgery of ["no", "yes"]) {
        test(`${key} age ${age} surgery=${surgery}`, () => {
          const prog = planFor(E, { condIds: [COND[key].id], age, weeks: 4, surgery });
          const sizes = phaseSizes(prog);
          assert(sizes.length > 0, "no conditions in program");
          assertEvery(
            sizes.flatMap((row, ci) => row.map((n, pi) => ({ n, ci, pi }))),
            x => x.n >= 1,
            x => `condition ${x.ci} phase ${x.pi} is empty`
          );
        });
      }
    }
  }
}

/* ===================================================================
   2. Age gate, both directions — the "one comparison does both directions"
      contract: an adult never gets a play move, a child never gets an adult
      move. Asserted on every LIBRARY exercise (one with a declared window),
      which is exactly what exAgeOk governs.
=================================================================== */
suite("age window (exAgeOk) holds for library exercises");
{
  const profiles = [
    ...AGES_CHILD.map(age => ({ key: "cp", age })),
    ...AGES_CHILD.map(age => ({ key: "severs", age })),
    ...AGES_ADULT.map(age => ({ key: "acl", age })),
    ...AGES_ADULT.map(age => ({ key: "osteo", age })),
    ...AGES_TEEN.map(age => ({ key: "ankle", age })),
  ];
  for (const { key, age } of profiles) {
    test(`${key} age ${age}`, () => {
      const prog = planFor(E, { condIds: [COND[key].id], age, weeks: 6 });
      const declared = allExercises(prog).filter(e => e.aMin != null || e.aMax != null);
      assertEvery(
        declared,
        e => E.exAgeOk(e, age),
        e => `"${e.n}" window ${E.exAgeMin(e)}–${E.exAgeMax(e)} at age ${age}`
      );
    });
  }
}

/* ===================================================================
   3. The two hard clinical floors, by NAME (catches prose/protocol items
      that bypass the library — the exact path the CP barbell took):
        • under 13 → no coached free-weight / machine equipment
        • under 14 → no maximal / ballistic effort
=================================================================== */
suite("no free weights <13, no maximal/ballistic <14");
{
  const conds = ["acl", "tkr", "cp", "severs", "ankle", "stroke", "lbp"];
  for (const key of conds) {
    for (const age of [3, 8, 12, 13]) {
      test(`${key} age ${age}`, () => {
        const prog = planFor(E, { condIds: [COND[key].id], age, weeks: 6 });
        const ex = allExercises(prog);
        if (age < 14) {
          assertEvery(ex, e => !MAXIMAL_RE.test(e.n), e => `maximal/ballistic "${e.n}" at age ${age}`);
        }
        if (age < 13) {
          assertEvery(ex, e => !EQUIP_RE.test(e.n), e => `free-weight/machine "${e.n}" at age ${age}`);
        }
      });
    }
  }
}

/* ===================================================================
   4. Adult plans contain no play moves — the other side of #2, verified
      end-to-end (not just on declared-window items): no exercise's upper
      age bound sits below the adult.
=================================================================== */
suite("adults get no paediatric play moves");
{
  for (const key of ["acl", "tkr", "cardiac", "lbp"]) {
    for (const age of AGES_ADULT) {
      test(`${key} age ${age}`, () => {
        const prog = planFor(E, { condIds: [COND[key].id], age, weeks: 6 });
        assertEvery(
          allExercises(prog),
          e => E.exAgeMax(e) > age,
          e => `play move "${e.n}" (max ${E.exAgeMax(e)}) at age ${age}`
        );
      });
    }
  }
}

/* ===================================================================
   5. Non-weight-bearing strips standing / impact / balance load.
=================================================================== */
suite("NWB removes weight-bearing, impact & balance");
{
  const banned = ["weight_bearing", "impact", "balance"];
  for (const key of ["tkr", "thr", "ankle", "acl"]) {
    test(`${key} NWB (lower limb)`, () => {
      const prog = planFor(E, {
        condIds: [COND[key].id], age: 45, weeks: 3, surgery: "yes",
        weightBearing: { status: "nwb", pct: "", lbs: "", side: "right", limb: "le" },
      });
      assert(prog.flags.includes("wb_nwb"), "wb_nwb flag not set");
      assertEvery(
        allExercises(prog),
        e => !(e.tags || []).some(t => banned.includes(t)),
        e => `"${e.n}" carries [${(e.tags || []).filter(t => banned.includes(t)).join(",")}]`
      );
    });
  }
}

/* ===================================================================
   6. Surgical-site precautions remove the named-forbidden movements,
      using each precaution's OWN avoid-regex from SPECIAL_PRECAUTIONS.
=================================================================== */
suite("special precautions strip forbidden movements");
{
  for (const spKey of ["sternal", "abdominal", "spinal"]) {
    const rule = E.SPECIAL_PRECAUTIONS[spKey];
    for (const key of ["cardiac", "lbp", "acl"]) {
      test(`${spKey} · ${key}`, () => {
        const prog = planFor(E, {
          condIds: [COND[key].id], age: 55, weeks: 4, surgery: "yes",
          specialPrecautions: [spKey],
        });
        assert(prog.flags.includes(rule.flag), `${rule.flag} not set`);
        assertEvery(
          allExercises(prog),
          e => !rule.avoid.test(e.n),
          e => `${spKey}-forbidden "${e.n}"`
        );
      });
    }
  }
}

/* ===================================================================
   7. Clearance gate surfaces for the conditions/vitals that demand it.
=================================================================== */
suite("clearance gate");
{
  test("active cancer treatment → clearance", () => {
    const prog = planFor(E, { condIds: [COND[aclSafe()].id], age: 50, weeks: 6, flags: ["cancer_treatment"] });
    assert(prog.clearance === true, "expected clearance for cancer_treatment");
  });
  test("hypertensive crisis vitals → clearance", () => {
    const prog = planFor(E, {
      condIds: [COND.lbp.id], age: 50, weeks: 6,
      vitals: { restHR: "", sbp: "190", dbp: "120", spo2: "", rr: "", height: "", weight: "" },
    });
    assert(prog.flags.includes("vital_bp_crisis"), "vital_bp_crisis not derived");
    assert(prog.clearance === true, "expected clearance for BP crisis");
  });
  test("PAR-Q chest pain → clearance", () => {
    const prog = planFor(E, { condIds: [COND.lbp.id], age: 40, weeks: 6, parq: { pain: true, faint: false, doc: false } });
    assert(prog.clearance === true, "expected clearance for PAR-Q pain");
  });
}
function aclSafe() { return "acl"; }

/* ===================================================================
   8. Negative controls — prove the invariants have TEETH. A suite that
      cannot fail is worthless, so here we hand the same checks a plan we
      KNOW is unsafe and assert they reject it.
=================================================================== */
suite("negative controls (invariants must reject known-bad plans)");
{
  test("equipment regex catches a barbell name", () => {
    assert(EQUIP_RE.test("Barbell back squat"), "EQUIP_RE failed to match a barbell");
  });
  test("maximal regex catches a power-clean name", () => {
    assert(MAXIMAL_RE.test("Power clean from blocks"), "MAXIMAL_RE failed to match a clean");
  });
  test("child age gate rejects an adult library move", () => {
    const adultMove = E.window.EXERCISES.find(e => e.aMin != null && e.aMin >= 14) ||
      { n: "Barbell tempo deadlift", aMin: 16, aMax: 200 };
    assert(!E.exAgeOk(adultMove, 4), "exAgeOk let an adult move through for a 4-year-old");
  });
  test("NWB banned-tag check rejects a weight-bearing move", () => {
    const bad = { n: "Standing calf raise", tags: ["weight_bearing"] };
    assert((bad.tags || []).some(t => ["weight_bearing", "impact", "balance"].includes(t)),
      "banned-tag check missed a weight_bearing move");
  });
  test("sternal avoid-regex rejects an overhead press", () => {
    assert(E.SPECIAL_PRECAUTIONS.sternal.avoid.test("Overhead press"),
      "sternal avoid regex missed an overhead press");
  });
}

/* Report only when run directly (`node test/safety.test.mjs`); the aggregator
   test/index.mjs imports every suite and calls report() once at the end. */
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) report();
