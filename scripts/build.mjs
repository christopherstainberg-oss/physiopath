/* Reproducible build: regenerate data + icons, assemble ./dist for hosting. */
import { mkdirSync, cpSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeApp } from "./assemble-app.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

// 0) assemble app.js from src/engine.js + the src/ui/*.js parts so dist ships the current source
writeApp();

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

// 3.5) minify the shipped app.js + styles.css IF esbuild is installed. Progressive enhancement:
// the build still works (unminified) without it — so CI and `check:drift` don't need the dep;
// run `npm install` to enable. app.js KEEPS its identifier names (minifyIdentifiers:false): the
// app uses inline onclick="fn(...)" handlers that reference global functions by name, so renaming
// top-level bindings would break the UI. Comments + whitespace are the bulk of app.js's size.
try {
  const { transform } = await import("esbuild");
  const min = async (file, opts) => {
    const src = readFileSync(join(DIST, file), "utf8");
    const { code } = await transform(src, opts);
    writeFileSync(join(DIST, file), code);
    console.log(`  minified dist/${file}: ${Math.round(src.length / 1024)}KB -> ${Math.round(code.length / 1024)}KB`);
  };
  await min("app.js", { loader: "js", minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, legalComments: "none" });
  await min("styles.css", { loader: "css", minify: true });
} catch (e) {
  if (e && e.code === "ERR_MODULE_NOT_FOUND")
    console.log("  esbuild not installed — shipping unminified (run `npm install` to enable minification)");
  else throw e;   // a real minify error must fail the build, not silently ship broken code
}

// 4) security + caching headers for Cloudflare Pages
writeFileSync(join(DIST, "_headers"),
`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: geolocation=(), camera=(), microphone=()
  Content-Security-Policy: connect-src 'self' https://api.anthropic.com data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
/sw.js
  Cache-Control: no-cache
`);

console.log("Built dist/ ->", files.concat(["data/", "icons/", "_headers"]).join(", "));
