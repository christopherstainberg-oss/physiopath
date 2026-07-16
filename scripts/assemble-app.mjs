/* =====================================================================
   Assemble app.js from src/engine.js + src/ui.js.

   app.js is a GENERATED artifact — do not edit it directly; edit the src/
   files and run `npm run assemble` (build + dev do this for you). The split is
   contiguous, so app.js is exactly this banner followed by the two halves
   concatenated: engine.js (History / flags / age gates / planning) then ui.js
   (rendering / coach / journal / wizard / boot). Both run in ONE classic-script
   global scope sharing one `state`, so definition order across the two files is
   irrelevant — every engine function is only called after the whole script has
   executed. test/assembly.test.mjs fails if app.js drifts from the src/ files.
===================================================================== */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = f => readFileSync(join(ROOT, f), "utf8");

/* Kept in sync with test/assembly.test.mjs — both import nothing, so this
   constant is the single definition and the test re-derives app.js from it. */
export const BANNER =
`/* AUTO-ASSEMBLED — do not edit app.js directly. Edit src/engine.js (History /
   flags / age gates / planning) or src/ui.js (rendering / coach / journal /
   wizard / boot), then run \`npm run assemble\`. The two files share one global
   scope and one \`state\`; this file is the banner + the two halves concatenated. */
`;

export const assemble = () => BANNER + read("src/engine.js") + read("src/ui.js");

export const writeApp = () => {
  const out = assemble();
  writeFileSync(join(ROOT, "app.js"), out);
  return out;
};

/* Run directly → write app.js. build.mjs imports writeApp(); the drift test
   imports assemble() and compares. */
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = writeApp();
  console.log(`Assembled app.js (${(out.length / 1024).toFixed(0)}KB) from src/engine.js + src/ui.js`);
}
