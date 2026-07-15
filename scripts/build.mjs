/* Reproducible build: regenerate data + icons, assemble ./dist for hosting. */
import { mkdirSync, cpSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

// 1) regenerate generated assets (importing runs each generator's top-level code)
await import("./generate-conditions.mjs");
await import("./generate-exercises.mjs");
await import("./generate-medications.mjs");
await import("./generate-surgeries.mjs");
await import("./generate-sports.mjs");
await import("./generate-activities.mjs");
await import("./generate-plans.mjs");
await import("./generate-surgery-plans.mjs");
await import("./generate-adls.mjs");
await import("./generate-adl-exercises.mjs");
await import("./generate-coach-kb.mjs");
await import("./generate-icons.mjs");

// 2) fresh dist
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// 3) copy the static site
const files = ["index.html", "styles.css", "app.js", "sw.js", "manifest.webmanifest"];
for (const f of files) cpSync(join(ROOT, f), join(DIST, f));
for (const d of ["data", "icons"]) cpSync(join(ROOT, d), join(DIST, d), { recursive: true });

// 4) security + caching headers for Cloudflare Pages
writeFileSync(join(DIST, "_headers"),
`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: geolocation=(), camera=(), microphone=()
/sw.js
  Cache-Control: no-cache
`);

console.log("Built dist/ ->", files.concat(["data/", "icons/", "_headers"]).join(", "));
