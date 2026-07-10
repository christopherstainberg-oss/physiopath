/* Minimal dependency-free static server for local preview/testing. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || 5050;
const MIME = {
  ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json",
  ".webmanifest":"application/manifest+json", ".svg":"image/svg+xml", ".png":"image/png", ".ico":"image/x-icon"
};
createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end("forbidden"); return; }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream", "cache-control":"no-cache" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type":"text/plain" }).end("not found");
  }
}).listen(PORT, () => console.log(`PhysioPath dev server on http://localhost:${PORT}`));
