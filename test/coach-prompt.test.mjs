/* Jeffery coach system prompt: EBP clinical-reasoning block (educational, not a clinician). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { suite, test, assert } from "./runner.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = name => readFileSync(join(ROOT, name), "utf8");

suite("Jeffery EBP clinical-reasoning prompt");

test("buildCoachSystem encodes HOAC/SINSS/ICF/FITT-VP and stays educational", () => {
  const boot = src("src/ui/4-coach-boot.js");
  assert(/CLINICAL REASONING/.test(boot), "missing CLINICAL REASONING block");
  assert(/HOAC/.test(boot), "missing HOAC-style hypothesis loop");
  assert(/SINSS/.test(boot), "missing SINSS vigor");
  assert(/\bICF\b/.test(boot), "missing ICF snapshot");
  assert(/FITT-VP/.test(boot), "missing FITT-VP dose language");
  assert(/educational aid, NOT a clinician/.test(boot), "must stay educational");
  assert(/Never diagnose/.test(boot), "must forbid diagnosis");
});

test("prompt forbids GET, 10% folklore, fabricated citations, and talking-therapy packages", () => {
  const boot = src("src/ui/4-coach-boot.js");
  assert(/never GET|Do not use graded exercise therapy|fixed incremental/i.test(boot),
    "must forbid GET / fixed incremental increases");
  assert(/10%/.test(boot) && /never/i.test(boot),
    "must tell Jeffery not to use ~10% weekly bump folklore");
  assert(/Do not invent papers|PMID|fabricat/i.test(boot),
    "must forbid invented citations");
  assert(/talking-therapy/.test(boot),
    "must not resurrect withdrawn NICE psych packages (use talking-therapy wording)");
  assert(!/this is not a CBT programme/.test(boot),
    "withdrawn-NICE tests forbid CBT phrases even as negation");
});

test("prompt defers to on-screen generateProgram and clinician plan, not a new gym program", () => {
  const boot = src("src/ui/4-coach-boot.js");
  assert(/Rotate \/ Swap \/ Remove/.test(boot),
    "must prefer Rotate/Swap/Remove of existing list");
  assert(/defer to (it|them)|Clinician's OWN plan/i.test(boot),
    "must defer to clinician plan already in context");
  assert(/pain-monitor|next morning/i.test(boot),
    "must encode pain-monitor stop rules");
});

test("hospital overlay is gated to ICU-AW / stroke / telemetry, not every acute track", () => {
  const boot = src("src/ui/4-coach-boot.js");
  assert(/HOSPITAL OVERLAY/.test(boot), "missing HOSPITAL OVERLAY block");
  const trigger = boot.split("HOSPITAL OVERLAY")[1].slice(0, 900);
  assert(/icu_aw|ICU-AW/i.test(trigger), "overlay must name ICU-AW as a trigger");
  assert(/stroke/i.test(trigger), "overlay must name stroke as a trigger");
  assert(/telemetry/i.test(trigger), "overlay must name clinician telemetry as a trigger");
  assert(/keep the (outpatient|loop above)|Otherwise keep/i.test(trigger),
    "must keep the outpatient loop when the overlay does not fire");
  assert(!/Program track is ["']acute["']/.test(trigger),
    "must not fire on every acute-track program");
});

test("hospital overlay stop-rules use clinician telemetry only — no traffic-light colours", () => {
  const boot = src("src/ui/4-coach-boot.js");
  const overlay = boot.includes("HOSPITAL OVERLAY")
    ? boot.slice(boot.indexOf("HOSPITAL OVERLAY"))
    : "";
  assert(overlay.length > 80, "overlay block too short to test");
  assert(!/TRAFFIC LIGHT/i.test(overlay), "no traffic-light system");
  assert(!/\bRED\s*→/.test(overlay) && !/\bYELLOW\s*→/.test(overlay) && !/\bGREEN\s*→/.test(overlay),
    "no RED/YELLOW/GREEN colour codes");
  assert(/clinician-prescribed telemetry/i.test(overlay),
    "stop-rules must name clinician-prescribed telemetry");
  assert(/ABOVE or BELOW|below range|out of (the )?prescribed/i.test(overlay),
    "must stop when telemetry is outside the prescribed range");
  assert(/do not invent|never invent/i.test(overlay) && /vasoactive|mcg\/kg/i.test(overlay),
    "must forbid invented vasoactive cutoffs");
});

test("hospital overlay uses a mobility ladder and forbids TEAM/AVERT dose excess", () => {
  const boot = src("src/ui/4-coach-boot.js");
  const overlay = boot.includes("HOSPITAL OVERLAY")
    ? boot.slice(boot.indexOf("HOSPITAL OVERLAY"))
    : "";
  assert(/bed\/ROM|sit \(edge|stand → walk|sit → stand → walk/i.test(overlay),
    "must encode bed → sit → stand → walk");
  assert(/highest intensity/i.test(overlay) && /longest time/i.test(overlay),
    "must forbid TEAM-style highest intensity for the longest time");
  assert(/very-early|very early/i.test(overlay) && /out-of-bed/i.test(overlay),
    "must forbid AVERT-style very-early high-dose out-of-bed for stroke");
  assert(/this session/i.test(overlay), "HOAC grain is this session, not this week");
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
