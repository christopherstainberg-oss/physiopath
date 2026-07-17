/* Data-drift guard. Run AFTER a build (see `npm run check:drift`): the container image
   regenerates every data file at build time, but the safety suite tests the COMMITTED data —
   this keeps the two identical, so a generator can't be edited without committing its output
   and silently shipping bytes nothing tested.

   Uses `git diff` (NOT `git status`) because git diff normalises line endings, so it won't
   false-positive on a Windows autocrlf checkout. app.js integrity is already covered by the
   assembly drift test, so this checks the generated data + icons. */
import { execSync } from "node:child_process";

const out = execSync("git diff --stat -- data icons", { encoding: "utf8" }).trim();
if (out) {
  console.error("Data drift — a generator changed without committing its regenerated output:\n\n" + out);
  console.error("\nFix: run `npm run build` and commit the changes under data/ and icons/.");
  process.exit(1);
}
console.log("data-drift check: committed data matches a fresh regeneration ✓");
