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

## Deploy to Cloudflare Pages (auto-deploy)

Two supported paths — pick one:

### Option A — Dashboard Git integration (recommended, zero secrets)
1. Push this repo to GitHub (already done if you're reading this there).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick this repo.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Save & Deploy. Cloudflare now **auto-deploys on every push to `main`**.

### Option B — GitHub Actions (already wired in `.github/workflows/deploy.yml`)
Add two repository secrets (GitHub → Settings → Secrets and variables → Actions):
- `CLOUDFLARE_API_TOKEN` — a token with the **Cloudflare Pages: Edit** permission.
- `CLOUDFLARE_ACCOUNT_ID` — from your Cloudflare dashboard URL / account home.

Every push to `main` then builds and runs `wrangler pages deploy dist --project-name=physiopath`.

> You only need **one** of the two. Option A is simplest; Option B keeps deploys inside GitHub Actions.

## Project structure

```
index.html            app shell (loads data + app)
styles.css            mobile-first, theme-aware styles
app.js                wizard flow, program generation, coach
data/conditions.js    generated 2,000-condition catalog
data/protocols.js     rehab protocols + contraindication engine
manifest.webmanifest  PWA manifest
sw.js                 offline service worker
icons/                app icons (svg + png)
scripts/              generators, static server, build
.github/workflows/    Cloudflare Pages auto-deploy
```

## License

MIT — see intent: educational use. Not a medical device; provided without warranty.
