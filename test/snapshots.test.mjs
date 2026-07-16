/* =====================================================================
   PhysioPath — clinician-profile snapshots

   The invariant suites prove nothing FORBIDDEN reaches the plan. These pin a
   dozen-plus clinician-shaped profiles to the plan SHAPE they should produce —
   the right track, a sane timeline, the expected clearance state, and a
   domain-appropriate signature exercise actually present (plus precaution
   flags, and the child floors on the paediatric ones). That's the other half:
   a regression that quietly produces a bland-but-wrong plan fails here.

   generateProgram is deterministic, but these assert on stable, environment-
   independent facts (track / totalWeeks from REHAB_PLANS, clearance, a
   signature match) rather than an exact exercise list, so they can't flake
   across Node versions while still catching real drift.
===================================================================== */
import { planFor, allExercises, phaseSizes } from "./harness.mjs";
import { suite, test, assert, assertEqual } from "./runner.mjs";
import { E, COND, MAXIMAL_RE, EQUIP_RE } from "./shared.mjs";

const sternalAvoid = E.SPECIAL_PRECAUTIONS.sternal.avoid;

const PROFILES = [
  { name: "ACL recon, post-op, returning to sport",
    profile: { condIds: [COND.acl.id], age: 25, surgery: "yes", weeks: 4, returnSports: ["Basketball"] },
    track: "acute", weeks: 30, clearance: true, sig: /quad|hamstring|balance|squat|bike/i },
  { name: "Total knee replacement, older adult",
    profile: { condIds: [COND.tkr.id], age: 68, surgery: "yes", weeks: 6 },
    track: "acute", weeks: 26, clearance: true, sig: /quad|heel slide|knee|hamstring/i },
  { name: "Rotator cuff repair, post-op",
    profile: { condIds: [COND.cuff.id], age: 55, surgery: "yes", weeks: 3 },
    track: "acute", weeks: 12, clearance: true, sig: /pendulum|external rotation|scapular|rotator|cane/i },
  { name: "Frozen shoulder, conservative",
    profile: { condIds: [COND.frozen.id], age: 52, weeks: 8 },
    track: "chronic", weeks: 52, clearance: false, sig: /pendulum|reach|wall|cane|slide/i },
  { name: "Low back pain",
    profile: { condIds: [COND.lbp.id], age: 40, weeks: 4 },
    track: "acute", weeks: 20, clearance: false, sig: /walk|pelvic tilt|bird|glute bridge|cat|nerve glide/i },
  { name: "Stroke recovery (neuro)",
    profile: { condIds: [COND.stroke.id], age: 60, weeks: 12 },
    track: "chronic", weeks: 26, clearance: true, sig: /gait|sit.?to.?stand|reach|weight shift|grasp|task|standing/i },
  { name: "Cardiac rehab",
    profile: { condIds: [COND.cardiac.id], age: 65, weeks: 6 },
    track: "acute", weeks: 26, clearance: true, sig: /walk|breathing|cycl|endurance|warm.?up|cool.?down/i },
  { name: "Pulmonary rehab (COPD)",
    profile: { condIds: [COND.copd.id], age: 70, weeks: 6 },
    track: "acute", weeks: 15, clearance: true, sig: /breath|walk|pursed|endurance|airway/i },
  { name: "Cerebral palsy, child (8)",
    profile: { condIds: [COND.cp.id], age: 8, weeks: 8 },
    track: "chronic", weeks: 52, clearance: true, sig: /stretch|balance|posture|sit.?to.?stand|reach|motor|breathing/i, child: true },
  { name: "Sever's, adolescent (11)",
    profile: { condIds: [COND.severs.id], age: 11, weeks: 6 },
    track: "acute", weeks: 7, clearance: false, sig: /calf|stretch|isometric|rom|walk/i, child: true },
  { name: "Ankle sprain",
    profile: { condIds: [COND.ankle.id], age: 30, weeks: 4 },
    track: "acute", weeks: 5, clearance: false, sig: /ankle|balance|eversion|alphabet|rom/i },
  { name: "Osteoporosis",
    profile: { condIds: [COND.osteo.id], age: 72, weeks: 8 },
    track: "chronic", weeks: 20, clearance: false, sig: /weight-bearing|walk|resistance|posture|balance/i },
  { name: "Total knee replacement, non-weight-bearing",
    profile: { condIds: [COND.tkr.id], age: 60, surgery: "yes", weeks: 2,
               weightBearing: { status: "nwb", pct: "", lbs: "", side: "right", limb: "le" } },
    track: "acute", weeks: 26, clearance: true, sig: /quad|heel slide|ankle pump|seated/i, flags: ["wb_nwb"] },
  { name: "Cardiac rehab, sternal precautions",
    profile: { condIds: [COND.cardiac.id], age: 64, surgery: "yes", weeks: 3, specialPrecautions: ["sternal"] },
    track: "acute", weeks: 26, clearance: true, sig: /walk|breath|cycl/i,
    flags: ["sternal_precautions"], mustNot: sternalAvoid },
];

suite("clinician-profile snapshots");
for (const p of PROFILES) {
  test(p.name, () => {
    const prog = planFor(E, p.profile);
    const names = allExercises(prog).map(e => e.n);

    assertEqual(prog.track, p.track, `${p.name}: track`);
    assertEqual(prog.totalWeeks, p.weeks, `${p.name}: totalWeeks`);
    assertEqual(!!prog.clearance, p.clearance, `${p.name}: clearance`);

    const sizes = phaseSizes(prog);
    assert(sizes.length >= 1 && sizes.every(row => row.length === 4),
      `${p.name}: expected 4 phases per condition, got ${JSON.stringify(sizes)}`);

    assert(names.some(n => p.sig.test(n)),
      `${p.name}: no signature exercise matching ${p.sig} — plan may be wrong-but-plausible. Sample: ${[...new Set(names)].slice(0, 6).join(" | ")}`);

    if (p.flags) for (const f of p.flags)
      assert(prog.flags.includes(f), `${p.name}: expected flag "${f}", got [${prog.flags.join(", ")}]`);

    if (p.mustNot) {
      const bad = names.filter(n => p.mustNot.test(n));
      assert(bad.length === 0, `${p.name}: forbidden movement present: ${bad.slice(0, 4).join("; ")}`);
    }

    if (p.child) {
      const max = names.filter(n => MAXIMAL_RE.test(n));
      const eq = names.filter(n => EQUIP_RE.test(n));
      assert(max.length === 0, `${p.name}: child plan leaked maximal work: ${max.join("; ")}`);
      assert(eq.length === 0, `${p.name}: child plan leaked free-weight/machine work: ${eq.join("; ")}`);
    }
  });
}

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
