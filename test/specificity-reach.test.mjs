/* =====================================================================
   PhysioPath — injury-specificity reach (audit SPEC-1 / SPEC-5)

   SPEC-1  the biggest uncovered buckets (arthroplasty recovery, Achilles
           rupture, cuff repair, lumbar fusion) previously fell through to
           generic regional fill — they now carry an injury-specific focus.
   SPEC-5  cuff-muscle synonyms ("supraspinatus tear/-itis") routed to the
           generic tendinopathy bucket; they now hit the cuff focus.

   And a guard that the PROTECT-first surgical focuses don't swallow their
   conservative (load-early) counterparts.
===================================================================== */
import { suite, test, assert } from "./runner.mjs";
import { E } from "./shared.mjs";

suite("injury specificity reach (SPEC-1/5)");

const focusNote = n => { const f = E.detectFocus(n); return f ? f.focus : null; };

test("SPEC-1: high-volume post-surgical buckets now get an injury-specific focus", () => {
  const cases = [
    ["Total knee replacement recovery", /extension|quad|range/i],
    ["Total hip replacement recovery",  /glute|abductor|gait/i],
    ["Achilles tendon rupture recovery", /dorsiflexion|heel|calf/i],
    ["Rotator cuff repair recovery",    /protect|passive/i],
    ["Post-lumbar fusion recovery",     /fusion|bending|core/i],
  ];
  for (const [name, re] of cases) {
    const note = focusNote(name);
    assert(note, `"${name}" must now carry a focus (was generic regional fill)`);
    assert(re.test(note), `"${name}" focus should name its key priority — got: ${note}`);
  }
});

test("SPEC-5: cuff-muscle synonyms route to the cuff focus, not generic", () => {
  for (const n of ["Supraspinatus tear", "Supraspinatus tendinitis", "Infraspinatus tear", "Subscapularis strain"]) {
    const note = focusNote(n);
    assert(note && /rotator-cuff|external-rotation/i.test(note), `"${n}" should hit the cuff focus, got: ${note}`);
  }
});

test("protect-first surgical focuses stay distinct from their conservative versions", () => {
  assert(/protect the repair/i.test(focusNote("Rotator cuff repair recovery") || ""), "cuff repair -> protect-first");
  assert(/external-rotation strength/i.test(focusNote("Rotator cuff tendinopathy") || ""), "cuff tendinopathy -> loading focus");
  assert(/never stretch into dorsiflexion/i.test(focusNote("Achilles tendon rupture") || ""), "achilles rupture -> protect-first");
  assert(/load the achilles progressively/i.test(focusNote("Achilles tendinopathy (midportion)") || ""), "achilles tendinopathy -> loading focus");
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
