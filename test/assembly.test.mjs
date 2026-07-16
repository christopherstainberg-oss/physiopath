/* =====================================================================
   app.js is assembled from src/engine.js + src/ui.js. This guards against
   the one failure mode of that split: editing a src/ file but shipping a
   stale app.js. If they diverge, CI fails here with a clear instruction —
   so the file the harness loads (and the image serves) always reflects src/.
===================================================================== */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { suite, test, assert } from "./runner.mjs";
import { assemble } from "../scripts/assemble-app.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

suite("app.js is in sync with its src/ halves");
test("app.js === assemble(src/engine.js + src/ui.js)", () => {
  const committed = readFileSync(join(ROOT, "app.js"), "utf8");
  assert(committed === assemble(),
    "app.js is stale relative to src/ — run `npm run assemble` and commit app.js");
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
