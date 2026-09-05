/* Returning-user home + coverage honesty + Jeffery Grok defaults. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { suite, test, assert } from "./runner.mjs";
import { E } from "./shared.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = name => readFileSync(join(ROOT, name), "utf8");

suite("coverage honesty");
test("README does not claim 32 protocols or 2,000 conditions", () => {
  const md = src("README.md");
  assert(!/32 rehab protocols/.test(md), "README still says 32 protocols");
  assert(!/2,000-condition catalog/.test(md), "README still says 2,000-condition catalog");
  assert(!/Search 2,000\+ conditions/.test(md), "README still says Search 2,000+");
  assert(/share a (hand-authored )?protocol|protocol pool|generated names/i.test(md),
    "README should say generated names share protocol pools");
});

test("injury UI mentions shared protocol pools, not a unique plan per name", () => {
  const html = src("index.html");
  assert(/protocol pool|share a protocol|generated catalogue/i.test(html),
    "index.html should disclose that many names share a protocol pool");
});

suite("today's session landing");
test("landingStep sends a saved program to Program (step 4)", () => {
  assert(typeof E.landingStep === "function", "expected window.landingStep");
  assert(E.landingStep({ program: { totalWeeks: 8 }, step: 0 }, null) === 4,
    "returning user with a program should open today's Program");
  assert(E.landingStep({ program: null, step: 2 }, null) === 2,
    "mid-wizard without a program keeps the saved step");
  assert(E.landingStep({ program: { totalWeeks: 8 }, step: 0 }, "coach") === 7,
    "?go= still wins");
});

suite("Jeffery Grok");
test("empty coach settings default to xAI grok-4.6", () => {
  assert(typeof E.defaultLlmBase === "function" || /api\.x\.ai/.test(src("src/ui/4-coach-boot.js")),
    "Jeffery should default at api.x.ai");
  const boot = src("src/ui/4-coach-boot.js") + src("index.html");
  assert(/grok-4\.6/.test(boot), "Jeffery default model must be grok-4.6");
  assert(/api\.x\.ai/.test(boot), "Jeffery default base must be xAI");
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
