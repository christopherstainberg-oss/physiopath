# Evidence-based upgrades to a rehab exercise algorithm (2026)

> **Research date:** 11 September 2026 · **Rounds:** 2 · **Sources:** 10 · **Category:** how-to
> Scope: educational improvements to PhysioPath’s `generateProgram` / `progressionSignal` / `thisWeekFocus` / `protocolEducationNotes` — **not** a prescription, not Jeffery-as-PT, not new diagnoses.
> Evidence: `docs/2026-09-11-exercise-algorithm-evidence.json`

## Executive Summary

PhysioPath already encodes several 2020s-era ideas: protect-first protocol pools, four-phase **tissue loading ladders** (including tendon heavy-slow resistance), **journal pain-trend hold/advance**, **session effort 0–10 + set completion**, a **biological floor vs capacity-driven** calendar, **ROM/SLS symmetry gates**, WHO **150–300 min + 2 strength days** education on selected pools, and the **2026 APTA TKA CPG**. The remaining gap is not “more exercise names.” It is **making a few well-cited clinical rules first-class in the algorithm**, and **not encoding a few popular but withdrawn or harmful ones**.

Highest-yield, guideline-backed upgrades:

1. **Code the Silbernagel/Thomeé pain-monitoring model** (≤5/10 during; back to baseline next morning) — PhysioPath only has this as tendon-ladder prose today. [3] [4] [VERIFIED]
2. **GETP 12th edition (March 2025) FITT education** for special populations already in the catalog (POTS, ME/CFS, older-adult power, arthritis, telerehab, behaviour/self-efficacy) — **without new MASLD/SCAD diagnosis names**. [1] [2] [VERIFIED]
3. **NICE NG59 risk-stratified low-back intensity** (keep-active vs more intensive exercise). July 2026 **withdrew** the CBT-package recs after retracted evidence — do not add those. [5] [6] [VERIFIED]
4. **ACSM 2026 resistance-training position stand:** few %1RM tricks matter; **≥2 sessions/week + high effort** (and heavier loads for strength). That **undercuts the ~10% weekly bump** still in `thisWeekFocus`. [8] [11] [SOURCED]
5. **Do not add graded exercise therapy (GET)** for ME/CFS. NICE NG206 (reviewed January 2025, no rec change) says fixed-increment GET **should not be undertaken**. [9] [SOURCED]

Cochrane 2024 (139 RCTs) is the important **modesty check** for knee OA: exercise helps, but vs attention/placebo the pain change (8.7/100) sits **below the 12-point MCID**. The algorithm should promise **function + habit**, not miracle pain scores. [7] [SOURCED]

BFR belongs as a **“if your PT issued it” note** (same pattern as NMES on TKA), not a DIY catalog move. [10] [SOURCED]

11 claims, 4 refute. Quality: 9 primary · 1 secondary · 0 tertiary — **healthy**.

## What to change vs what you already have

| Algorithm lever | PhysioPath today | 2025–2026 evidence says | Action |
|---|---|---|---|
| Load this week | `~10% up` time nudge | Few RTx variables matter; high effort ≥2×/wk [8] | Replace 10% copy with effort/RIR language |
| Pain gate | Trend-up or ≥7/10 **hold** | Tendinopathy RCT: ≤5/10 **and** next-morning baseline [3] [4] | Log during vs next-morning; hold if 24h worse |
| Tissue path | HSR / isometric / energy-storage ladders | Still current for tendon | Keep; wire 24h rule to it |
| Calendar vs criteria | Floored (graft/bone) vs capacity-driven | Matches GETP “don’t outrun healing” | Keep |
| Objective gates | Knee/shoulder/ankle ROM + SLS symmetry | Incomplete for ACL RTS (time + hop/LSI + psych) | Optional hop/time education, not a DIY hop test |
| Dose card | WHO/FITT on general_msk + cardiac-ish pools | GETP-12 adds POTS table, ME/CFS section, arthritis FITT, older power/HIIT, telerehab, Ch.12 behaviour [1] [2] | Expand **notes**, not catalog |
| LBP | Sciatica → radiculopathy pool, strip late lifts | NICE: stay active; STarT-style simple vs intensive; no routine imaging [5] | Stratify intensity; 2026: **no** CBT-package rec [6] |
| OA | `knee_oa` / `hip_oa` protect-first | Cochrane: modest, often < MCID vs sham [7] | Honest effect-size education |
| ME/CFS / POTS | `balance_neuro` | GETP-12 has FITT sections; NICE forbids GET [9] | Energy management notes; **never** auto-progress time |
| Gadgets | NMES note if PT issued | BFR same class [10] | Education only |
| Behaviour | Adherence hold if behind | GETP-12 TTM / self-efficacy tables [2] | Tiny check-in, not a therapy product |

## 1. Pain-monitoring (highest clinical ROI)

Silbernagel 2007 (n=38, AJSM): people with Achilles tendinopathy who **kept running/jumping under a pain-monitoring model** improved VISA-A about as much as those told to stop those activities for 6 weeks. No negative effect of continued, monitored loading. [3] [SOURCED]

The model (Thomeé → Silbernagel; restated in Sprague 2021 PMC): **NPRS ≤ 5/10 during and immediately after**; **return to pre-activity by the next morning**. [4] [VERIFIED]

PhysioPath already says “next-morning settled” on the tendon ladder and holds on a rising journal trend or ≥7/10. That is **not the same rule**. A 6/10 that is gone by morning is allowed in Silbernagel and would **hold** today if it is a “flare.” A 3/10 that is **worse the next morning** should hold and currently might **advance**.

Algorithm shape (education, user-logged):

- Per session: pain **during**, pain **next morning**.
- If during > 5 **or** morning > pre-session → `progressionSignal = hold`.
- If both OK and effort not grinding → allow the existing advance path.

Do not treat this as a licence to ignore surgical floors.

## 2. GETP-12 FITT — education notes, not new diagnoses

ACSM’s *Guidelines for Exercise Testing and Prescription*, **12th edition** (LWW, March 2025) is the current FITT-VP handbook. Official new sections: sex differences, transgender/gender-diverse, **SCAD**, **POTS**, pediatric cardiac, **MASLD**, **ME/CFS**, plus pulmonary **respiratory muscle training**; Chapter 5 resistance and Chapter 12 behaviour were rewritten. [1] [SOURCED]

The March 2025 faculty **11→12 crosswalk** (primary ACSM PDF) is the implementable map: [2] [SOURCED]

- POTS: new Table 8.4 exercise program (typically recumbent → upright, not jump-to-HIIT).
- ME/CFS: new section pp. 417–425 — pair with NICE **no GET**, not with PhysioPath’s generic “nudge 10%.”
- Older adults: HIIT / **muscle power** / balance; SARC-F / frailty screens in the book.
- Arthritis FITT: aerobic **Time** updated (Ch. 10).
- Cancer, diabetes, hypertension, PAD, COPD, HIV, kidney: FITT cells updated.
- **Telerehabilitation** new section (use as honesty: lists are not supervised PT).
- Ch. 12: transtheoretical model, self-efficacy, change talk — maps to adherence, not a CBT product.

PhysioPath skill already says: **do not invent MASLD/SCAD catalog names**; remap GETP-12 special pops **only if** they dump to `general_msk`; POTS/ME/CFS are already `balance_neuro`. The upgrade is `protocolEducationNotes`, not 40k more titles.

Full numeric FITT cells live in the paid book. Do not invent them. [w2]

## 3. Low back: stay active, stratify, do not resurrect withdrawn psych packages

NICE **NG59** (assessment/management of LBP and sciatica, 16+): [5] [SOURCED]

- Consider **STarT Back-style** risk stratification at first contact.
- Low risk → reassurance, **keep active**, self-management.
- Higher risk → more intensive **exercise** (± manual therapy).
- **Group exercise** (biomechanical, aerobic, mind–body, or mix) — type by preference, not a magic core-stability brand.
- **Do not routinely image** in non-specialist settings.
- No belts/corsets/foot orthotics/rocker soles/traction as management.

**July 2026 NG59 update** (Guideline Central summary of NICE): psychological-therapy and **combined physical + psychological programme** recommendations were **withdrawn** because they partly rested on **retracted** evidence. Manual therapy 1.2.7 now: only as part of a package **that includes exercise**. [6] [SOURCED]

Algorithm: a simple vs intensive LBP fork on existing lumbar/radiculopathy pools. Do **not** add a CBT-module because an older NICE PDF still floats around the web.

## 4. Knee OA: keep exercise, drop overclaim

Cochrane **Lawford et al.** update (search to **4 January 2024**; 139 RCTs, 12,468 people): land-based exercise vs attention/placebo may improve pain **8.7/100** (MCID they used = **12**) and function **11.3/100** (MCID 13). Vs no treatment, pain **13.1** (crosses MCID) and function **12.5**. Certainty low–moderate; many small/biased trials. [7] [SOURCED]

OARSI and NICE still call exercise **core** treatment. The algorithm should: keep `knee_oa` / `hip_oa` aerobic + strength + neuromuscular; **state modest expected change**; 24h traffic-light fits OA education too. Do not add volume because “stronger is always better” (TKA CPG already says high ≈ low intensity).

## 5. Resistance progression: effort and frequency beat the 10% rule

ACSM **2026 Position Stand** (Currier et al., *MSSE* 58(4), overview of **137 systematic reviews**): compared with no exercise, RT improves strength, size, power, gait, balance. **Few prescription variables** changed those outcomes. Strength was better with **≥80% 1RM**, **full ROM**, **2–3 sets**, exercise **early in the session**, **≥2 sessions/week**. Hypertrophy: **≥10 sets/week**. Primary recommendation: **high effort, ≥ twice weekly, all major groups**. [8] [SOURCED]

PhysioPath’s mid-phase nudge is still “No more than ~10% up from last week.” That number is a running-load folk rule, not this evidence base. [11] [REASONED from c8 vs engine.js]

Safer educational replacement: if pain-monitor and floors allow, add load when sessions feel **easy and complete**; hold when grinding or unfinished — which `recentEffort()` **already does**. Align the **copy** with ACSM; stop citing 10%.

## 6. What not to encode

| Idea | Why not |
|---|---|
| **GET** (fixed weekly minute increases) for ME/CFS | NICE NG206: that approach **should not be undertaken**; Jan 2025 surveillance: no rec change. [9] |
| CBT / combined physical–psychological LBP packages as NICE-backed | Withdrawn July 2026 after retracted evidence. [6] |
| New catalog rows for MASLD / SCAD | GETP-12 describes FITT; PhysioPath mapping rule forbids inventing those names. |
| DIY **BFR** / **NMES** as library exercises | ACSM BFR: 20–40% 1RM, 40–80% arterial occlusion, <10 min continuous, clinician if clot/cardiac risk. [10] Same pattern as existing TKA NMES note. |
| Promising OA pain drops larger than Cochrane | 8.7/100 vs attention is below their MCID. [7] |
| Hop-test battery as an unsupervised in-app test | Function+time RTS is evidence-based in clinic; not a kiosk. (Delaware–Oslo full text was blocked this pass.) [w3] |

## Contradictions

1. **GETP-12 includes an ME/CFS exercise section** [2] **vs NICE “do not do GET.”** [9] Resolution: individualised, symptom-contingent activity **inside energy limits**, specialist PT/OT if they choose to progress — **not** PhysioPath auto-incrementing session time.
2. **Exercise is “core” for OA** in OARSI/NICE **vs Cochrane modest/uncertain MCID** vs placebo. [7] Resolution: keep the plan; **honest notes**.
3. **Silbernagel allows ≤5/10 loading** [4] **vs PhysioPath hold at ≥7 and on any rising trend.** Rising-trend hold is still reasonable for surgical floors; the 24h rule is the missing tendinopathy/OA piece.
4. **NICE 2016 allowed psych packages with exercise** **vs 2026 withdrawal.** [6] Use the 2026 text.

## Gaps

- GETP-12 **numeric FITT tables** not extracted (book). [w2]
- WHO 2020 PAG PDF did not extract; 150-minute card is already in-app from prior work.
- Grindem/Delaware–Oslo ACL RTS PDF Cloudflare-blocked; do not quote the 84% figure from memory. [w3]
- Illinois/other law N/A here.
- No 2026 APTA CPG beyond TKA was re-fetched this pass.

## Conclusion

The evidence-based way to improve this protocol is **not** a bigger exercise catalog. It is: **(1)** a real 24-hour pain-monitor in `progressionSignal`, **(2)** GETP-12 education notes on pools you already have, **(3)** NICE LBP simple vs intensive without withdrawn psych add-ons, **(4)** ACSM high-effort ≥2×/week instead of 10% folklore, **(5)** hard **no** on GET for ME/CFS. Everything else (BFR, hop RTS, PROMs) stays “ask your clinician / if issued.”

PhysioPath remains educational. This is not a treatment plan for a named person.

---
## Sources

**Quality distribution:** 9 primary · 1 secondary · 0 tertiary — **healthy**

| # | Title | URL | Quality | Accessed |
|---|-------|-----|---------|----------|
| 1 | ACSM GETP 12th edition | https://acsm.org/education-resources/books/guidelines-exercise-testing-prescription/ | primary | 2026-09-11 |
| 2 | GETP 11–12 Crosswalk PDF | https://acsm.org/wp-content/uploads/2025/03/GETP11-12-crosswalk.pdf | primary | 2026-09-11 |
| 3 | Silbernagel et al. AJSM 2007 | https://pubmed.ncbi.nlm.nih.gov/17307888 | primary | 2026-09-11 |
| 4 | Sprague et al. pain-guided activity 2021 | https://pmc.ncbi.nlm.nih.gov/articles/PMC7905015 | primary | 2026-09-11 |
| 5 | NICE NG59 LBP/sciatica | https://www.ncbi.nlm.nih.gov/books/NBK562933/ | primary | 2026-09-11 |
| 6 | Guideline Central: NICE LBP July 2026 update | https://www.guidelinecentral.com/insights/aug-2026-nice-lowbackpainsciaticaover16-guideline-spotlight/ | secondary | 2026-09-11 |
| 7 | Cochrane: exercise for knee OA (search to 4 Jan 2024) | https://www.cochrane.org/CD004376/MUSKEL_exercise-osteoarthritis-knee | primary | 2026-09-11 |
| 8 | ACSM RT Position Stand 2026 (Currier) | https://pubmed.ncbi.nlm.nih.gov/41843416/ | primary | 2026-09-11 |
| 9 | NICE NG206 ME/CFS recommendations | https://www.nice.org.uk/guidance/ng206/chapter/Recommendations | primary | 2026-09-11 |
| 10 | ACSM BFR Resistance Exercise 101 | https://acsm.org/blood-flow-restriction-bfr-resistance-exercise-101-infographic/ | primary | 2026-09-11 |

**Evidence key** — `[VERIFIED]` ≥2 independent cited sources · `[SOURCED]` one named source · `[REASONED]` inference · `[ESTIMATED]` calculated.

---
📊 Research stats: ~40 min · 2 rounds · 12 queries · 16 URL fetch attempts · 10 sources cited
