/* =====================================================================
   Test entry point — runs every suite against ONE shared engine and reports
   once. Importing each *.test.mjs registers-and-runs its tests (the runner
   executes each test synchronously on definition); report() then prints the
   summary and sets the exit code. `npm test` runs this.

   Individual files are still runnable on their own (`node test/coverage.test.mjs`)
   — each self-reports only when it's the process entry point.
===================================================================== */
import "./assembly.test.mjs";
import "./safety.test.mjs";
import "./coverage.test.mjs";
import "./snapshots.test.mjs";
import "./migration.test.mjs";
import "./coach-stream.test.mjs";
import "./safety-fixes.test.mjs";
import "./progression-floor.test.mjs";
import "./specificity-reach.test.mjs";
import { report } from "./runner.mjs";

report();
