# PhysioPath ✚

**Personalized, contraindication-aware injury-recovery programs** — an installable, offline-capable
Progressive Web App (PWA) covering **musculoskeletal, neurological, cardiac, and pulmonary** rehabilitation.

> ⚠️ **Educational tool — not medical advice.** PhysioPath gives general, evidence-informed guidance.
> It cannot diagnose you or replace a licensed clinician. Get a professional evaluation before starting,
> especially after surgery, a fracture, or with heart, lung, or neurological conditions.

## What it does

1. **Medical history questionnaire first** — captures medical precautions (contraindications) *before* you pick an injury.
2. **Search 2,000+ conditions** across MSK, neuro, cardiac, and pulmonary — each mapped to a rehab protocol.
3. **Acuteness scaling** — `0–6 weeks → Acute` (16-week plan, longer protective phase) vs `6+ weeks → Chronic`
   (14-week plan focused on progressive loading). Adjusts for pain level, surgery, and fitness.
4. **Contraindication engine** — filters or modifies exercises based on your history (e.g. removes loaded spinal
   flexion & impact for osteoporosis, breath-holding/heavy grip for heart conditions, deep hip flexion for a hip
   replacement), backfills safe substitutes, and shows personalized precautions + a clearance banner when needed.
5. **AI Recovery Coach** — answers questions about pain, ice vs heat, precautions, when to see a doctor, and more,
   personalized to your conditions. Runs fully on-device (no data leaves your browser).

## Run locally

```bash
npm run serve     # static server at http://localhost:5050
```

The app is plain static files (`index.html`, `styles.css`, `app.js`, `data/`, `icons/`) — you can also just open
`index.html`, though the PWA/offline features need to be served over http(s).

## Build

```bash
npm run build     # regenerates data/conditions.js + icons, assembles ./dist
```

- `scripts/generate-conditions.mjs` — generates the 2,000-condition catalog (`data/conditions.js`).
- `scripts/generate-icons.mjs` — generates PNG app icons.
- `data/protocols.js` — the 32 rehab protocols + contraindication rules engine (hand-authored).

## Deploy with Docker / Portainer (GHCR)

The app ships as a small nginx container. On every push to `main`, GitHub Actions
(`.github/workflows/docker-publish.yml`) builds the image and publishes it to the
**GitHub Container Registry** at `ghcr.io/christopherstainberg-oss/physiopath:latest`.

### Run locally
```bash
docker compose up -d          # → http://localhost:8080
# or build from source:
docker build -t physiopath . && docker run -d -p 8080:80 physiopath
```

### Portainer Stack
1. In Portainer: **Stacks → Add stack → Web editor**.
2. Paste the contents of [`docker-compose.yml`](docker-compose.yml) (or point it at this repo).
3. **Deploy the stack.** Browse to `http://<host-ip>:8080` (change the `8080:80` port map as needed).
4. **Updates:** the stack ships a [Watchtower](https://containrrr.dev/watchtower/) service that
   auto-pulls a fresh `:latest` and recreates the container within ~5 min of each new build — so
   redeploying the stack is normally enough. To force it now: Portainer → the stack →
   **Update the stack → tick *Re-pull image and redeploy*** (or on the host,
   `docker compose pull && docker compose up -d`). Docker's `:latest` never updates on its own —
   a plain redeploy reuses the cached image, which is why an old version can appear to "stick."

> **GHCR image visibility:** the package is private by default. Either make it public
> (GitHub → your profile → **Packages → physiopath → Package settings → Change visibility → Public**),
> **or** add registry credentials in Portainer (**Registries → Add registry → Custom**,
> URL `ghcr.io`, username = your GitHub username, password = a PAT with `read:packages`).

### Alternative: Cloudflare Pages / any static host
It's still a plain static site — the built `dist/` (or the repo root) can be served by
Cloudflare Pages, Netlify, GitHub Pages, etc. Build command `npm run build`, output `dist`.

## Project structure

```
index.html            app shell (loads data + app)
styles.css            mobile-first, theme-aware styles
app.js                wizard flow, program generation, coach, library, explanations
data/conditions.js    generated 10,000-condition catalog
data/exercises.js     generated 5,000-exercise library
data/protocols.js     rehab protocols + contraindication engine
manifest.webmanifest  PWA manifest
sw.js                 offline service worker
icons/                app icons (svg + png)
scripts/              generators, static server, build
Dockerfile            multi-stage build → nginx static image
nginx.conf            static-serve config (PWA MIME, caching, headers)
docker-compose.yml    Portainer Stack / local run
.github/workflows/    GHCR image publish
```

## License

MIT — see intent: educational use. Not a medical device; provided without warranty.
