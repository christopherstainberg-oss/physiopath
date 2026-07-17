/* =====================================================================
   Assemble app.js from src/engine.js + the src/ui/*.js parts.

   app.js is a GENERATED artifact — do not edit it directly; edit the src/
   files and run `npm run assemble` (build + dev do this for you). The split is
   contiguous, so app.js is exactly this banner followed by engine.js (History /
   flags / age gates / planning) then the src/ui/*.js parts in filename order
   (rendering / coach / journal / wizard / boot). All run in ONE classic-script
   global scope sharing one `state`, so definition order across the files is
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
   flags / age gates / planning) or the src/ui/*.js parts (rendering / coach /
   journal / wizard / boot), then run \`npm run assemble\`. All parts share one
   global scope and one \`state\`; this file is the banner + the parts concatenated. */
`;

/* ui.js was split into these parts; concatenated in filename order they are byte-identical to
   the old single file, so app.js is unchanged. Update this list if you re-split. */
export const UI_PARTS = ["1-render.js", "2-program.js", "3-journal.js", "4-coach-boot.js"];

export const assemble = () =>
  BANNER + read("src/engine.js") + UI_PARTS.map(f => read("src/ui/" + f)).join("");

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
  console.log(`Assembled app.js (${(out.length / 1024).toFixed(0)}KB) from src/engine.js + src/ui/*`);
}
