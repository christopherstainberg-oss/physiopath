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

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
