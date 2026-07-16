/* Tiny zero-dependency test runner. `test(name, fn)`, assertions, `report()`.
   Kept deliberately small — the value is in the invariants, not the framework. */
let passed = 0, failed = 0;
const failures = [];
let currentSuite = "";

export function suite(name) { currentSuite = name; }

export function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(".");
  } catch (e) {
    failed++;
    failures.push({ name: (currentSuite ? currentSuite + " › " : "") + name, msg: e.message });
    process.stdout.write("F");
  }
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

export function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || "not equal"} — expected ${expected}, got ${actual}`);
}

/* Assert a predicate holds for every item; on failure, name a few offenders. */
export function assertEvery(items, pred, describe) {
  const bad = items.filter(x => !pred(x));
  if (bad.length) {
    const sample = bad.slice(0, 5).map(describe).join("; ");
    throw new Error(`${bad.length}/${items.length} failed: ${sample}`);
  }
}

export function report() {
  process.stdout.write("\n\n");
  for (const f of failures) console.log(`  ✗ ${f.name}\n      ${f.msg}`);
  const total = passed + failed;
  console.log(`\n${failed ? "FAIL" : "PASS"} — ${passed}/${total} passed${failed ? `, ${failed} failed` : ""}\n`);
  if (failed) process.exit(1);
}
