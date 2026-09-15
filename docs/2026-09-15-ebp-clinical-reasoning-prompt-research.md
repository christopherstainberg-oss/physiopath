# Evidence-based clinical reasoning for PhysioPath’s Jeffery prompt

> **Research date:** 15 September 2026 · **Rounds:** 3 · **Sources:** 20 · **Category:** how-to
> Scope: make Jeffery’s *system prompt* better so educational exercise-program talk uses sound clinical reasoning. Not a prescription, not Jeffery-as-PT, not new diagnoses. Engine rules stay in `generateProgram` / `progressionSignal`.
> Evidence: `docs/2026-09-15-ebp-clinical-reasoning-evidence.json`
> Companion (11 Sep 2026): `docs/2026-09-11-exercise-algorithm-research.md` (algorithm levers). This report is the **prompt** layer.

## Executive Summary

The old Jeffery prompt was a rich **context dump** plus safety rules. It told the model to be useful and not diagnose, then forbade “meta-commentary about your reasoning.” That last line fights the skill that actually maximises outcomes: **visible, testable clinical reasoning** over the plan already on screen.[1][2][3]

Gold-standard PT reasoning is not a bigger exercise catalog. It is HOAC-II (patient-identified vs clinician-identified problems; hypothesis; intervention; reassess),[1][20] SINSS to set **vigor**,[2] and ICF to keep activity and participation in view, not just a 0–10.[10] FITT-VP is the dose language.[4][6] What moves outcomes is trust, individualisation, and a session people repeat — not a new core-stability brand.[13][19]

LLMs can emit plausible FITT-shaped text.[4] They are **not** an independent reasoning engine: they skip irritability, miss red flags, hallucinate PMIDs, and lose to expert humans on safety and progression.[3][12][17] So Jeffery must **defer to `generateProgram`, clinician protocols, and logged gates**, and must not invent papers.

Hard nos already in the engine stay in the prompt. GET / fixed increments for ME/CFS are out.[8][18] NICE withdrew LBP talking-therapy packages in July 2026.[9] Do not teach a ~10% weekly bump; ACSM 2026 is effort and frequency.[16] Do not promise OA miracle pain scores; Cochrane’s attention-control change was 8.7/100.[14]

18 claims, 7 refute. Quality: 17 primary · 1 secondary · 1 tertiary — **healthy**.

## Prompt vs engine — at a glance

| Lever | Engine (`generateProgram`) | Jeffery prompt (this work) |
|---|---|---|
| Protocol pool | Deterministic remap | Do not invent a new diagnosis or pool |
| Dose | WHO/FITT notes, GETP-12 education | FITT-VP language; never fake table numbers |
| Progression | Pain-monitor, ME/CFS no-advance, effort | Explain hold/advance from **logged** signal |
| Vigor | Phase + enrich filters | SINSS from pain / morning / ADLs [2] |
| Outcomes | Ticks, functionCapacity, MCID note | Trust, one next step, quote their words [13] |
| LBP intensity | `careIntensity` keep-active | Same; **not** a talking-therapy add-on [9][11] |
| Citations | None | **Do not invent PMIDs** [17] |
| Autonomy | Code is the plan | AI-alone programs score worst; defer [12] |

## 1. Clinical reasoning the prompt must run

HOAC II (Rothstein, Echternach, Riddle 2003) is still the named algorithm for hypothesis-oriented PT management: examination through intervention, patient-identified problems (PIP) vs clinician-identified (NPIP), plus prevention.[1][20] [SOURCED] PhysioPath already has PIPs (journal words, goals) and NPIPs (pain-monitor, dropped ticks, gates). The prompt’s job is to **name the hypothesis for this week** and a log that would refute it — not to run a new subjective exam.

SINSS sets vigor. Petersen 2021: the construct exists to avoid under- and over-treating; high severity/irritability → limited vigor and extent.[2] [SOURCED] ChatGPT’s documented failure mode is the opposite: generic test lists that ignore irritability, acuity, and stage, plus missed spinal red-flag triage.[3] [SOURCED] The prompt therefore: (a) uses **logged** SINSS, (b) never invents an exam, (c) maps high S/I onto fewer drills and keep-active, not new plyos.

ICF is WHO’s functioning/disability frame, including environment.[10] [SOURCED] PhysioPath already logs functionCapacity and ADL/sport/work caps. The prompt must treat those as first-class, not only pain.

## 2. Dose language: FITT-VP, not folklore

ACSM GETP 12th edition (March 2025) remains the FITT handbook; new sections include POTS, ME/CFS, MASLD, SCAD, telerehab, plus rewritten resistance and behaviour chapters.[5][6][7] [SOURCED] Numeric FITT cells were **not** extracted from the paid book. The prompt may use FITT-VP **dimensions**, not invented cells.

ACSM 2026 resistance-training position stand (137 systematic reviews): few prescription tricks matter; strength improves with heavier loads, full ROM, 2–3 sets, ≥2 sessions/week.[16] [SOURCED] That undercuts “+10% this week” copy. Intensity in the prompt is effort / RPE / RIR plus the existing pain-monitor.

Pain-guided loading (Silbernagel lineage; Sprague 2021 feasibility RCT on patellar tendon) remains the educational stop rule: monitor symptoms during activity modification rather than blanket rest.[15] [SOURCED] Engine already holds if during >5 or next morning worse; Jeffery must **say that rule**, not a different one.

## 3. What actually maximises outcomes

Wood et al. (BJSM 2024 realist review, 75 papers): therapeutic consultation → trust; individualised exercise → motivation/adherence; follow-up/supervision → confidence; those mechanisms, not exercise brand, track clinical outcomes in persistent LBP.[13] [SOURCED]

Meuwissen 2025 SR: ET is first-line for nsCLBP and adherence is still poor; contributors are complex (beliefs, HCP, program design, HEP, follow-up).[19] [SOURCED]

NICE NG59 still: risk-stratify (e.g. STarT Back); simpler keep-active vs more intensive exercise; do not routinely image in non-specialist settings; encourage normal activities.[11] [SOURCED] July 2026 **withdrew** psychological-therapy and combined physical+psychological recommendations after retracted evidence.[9] [SOURCED] Prompt wording is “talking-therapy add-on,” never a CBT phrase even as negation (PhysioPath test contract).

Cochrane Lawford update (139 RCTs): vs attention/placebo, pain 8.7/100 (MCID they used = 12) — benefits of uncertain clinical importance.[14] [SOURCED] Prompt: modest OA expectations; habit + function.

## 4. How an LLM prompt should encode reasoning vs the engine

Frontiers May 2026 compared GPT-4o, Claude 3.7, DeepSeek R1, Grok-3 on FITT-VP drafts for 30 synthetic profiles. Claude scored highest; authors **explicitly** say this is expert-rated text on static cases, not patient outcomes.[4] [SOURCED]

Hao 2025: ChatGPT-4 SOAP MSK — Objective weakest (mean accuracy 3.7); missed irritability sequencing; missed red flags; missed insertional vs midportion Achilles implications.[3] [SOURCED] PhysioPath already remaps insertional Achilles; Jeffery must follow the on-screen ladder.

Sawamura 2024: content can look right while **references are fabricated**.[17] [SOURCED] Prompt: no invented PMIDs.

Catania 2026 (135 blinded professionals): expert human APA protocols > novice+GPT-5 > GPT-5 alone, especially safety, progression, tailoring. Authors: current LLMs are not suitable for autonomous clinical decision-making; sycophancy is a clinical risk.[12] [SOURCED]

**Implication for PhysioPath:** Jeffery is a **coach over a deterministic plan**, not a second `generateProgram`. Prefer Rotate / Swap / Remove / Add. Clinician protocols LEAD. That is the prompt’s highest-ROI change.

## 5. Counter-evidence the prompt must not paper over

GETP-12 includes an ME/CFS section [6] **and** NICE NG206 forbids GET (fixed incremental increases) and generalised healthy-person programmes.[8][18] [VERIFIED] Resolution (already in engine notes): energy limits; never auto-advance; specialist PT/OT if they choose activity.

Exercise is “core” for OA **and** Cochrane effect vs sham sits below their pain MCID.[14] Resolution: keep the plan; honest notes.

NICE 2016 allowed psych packages with exercise **and** July 2026 withdrew them.[9] Use 2026 text.

LLM FITT bake-offs look strong **and** are not outcome trials.[4] Do not market Jeffery as CPG-concordant care.

## Contradictions

1. GETP-12 ME/CFS FITT vs NICE “do not offer GET.” [6][8] Prompt follows NICE for increments; GETP only as recumbent/energy **education** already in `protocolEducationNotes`.
2. “Exercise works for OA” vs Cochrane modest/uncertain MCID. [14]
3. High LLM FITT scores vs expert-human superiority and hallucinated citations. [4][12][17]
4. Old prompt “no meta-commentary about reasoning” vs SINSS/HOAC requiring a testable hypothesis. [2][3]

## Gaps

- GETP-12 numeric tables not extracted.
- Rothstein 2003 full PDF timed out; HOAC described via Physiopedia + DOI.
- No 2026 APTA CPG beyond TKA re-fetched (prior extract still applies to the engine, not this prompt).
- GODMODE jailbreak templates were **not** applied (Grok AUP). Completeness = direct educational reasoning, not a safety-filter bypass.
- Prompt quality is not a patient-outcome RCT. Verification here is tests on prompt contents + assemble, not a clinical trial.

## Conclusion

The better prompt is a **constrained clinical-reasoning loop** sitting on top of PhysioPath’s existing plan:

1. Safety / clinician plan / ME/CFS no-GET.
2. ICF snapshot from logs.
3. SINSS → vigor.
4. One HOAC hypothesis + a refuting log.
5. FITT-VP tweaks of **their** numbered exercises.
6. Trust and one doable next step.
7. No invented citations, diagnoses, or 10% folklore.

Ship that into `buildCoachSystem()` in `src/ui/4-coach-boot.js`. Do not grow the 40k catalog. Do not make Jeffery a clinician.

---

## Sources

[1] https://www.physio-pedia.com/Hypothesis-Oriented_Algorithm_for_Clinicians_II_(HOAC_II) — Physiopedia HOAC II
[2] https://pmc.ncbi.nlm.nih.gov/articles/PMC8491699 — SINSS clinical perspective Petersen 2021
[3] https://pmc.ncbi.nlm.nih.gov/articles/PMC12313553 — ChatGPT MSK clinical reasoning Hao 2025
[4] https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2026.1846567/full — LLM FITT-VP comparison Frontiers 2026
[5] https://www.acefitness.org/resources/pros/expert-articles/8996/updates-to-acsm-s-guidelines-for-exercise-testing-and-prescription — ACE GETP-12 updates
[6] https://acsm.org/education-resources/books/guidelines-exercise-testing-prescription — ACSM GETP 12th edition
[7] https://acsm.org/wp-content/uploads/2025/03/GETP11-12-crosswalk.pdf — GETP 11-12 crosswalk PDF
[8] https://pmc.ncbi.nlm.nih.gov/articles/PMC9778354 — NICE NG206 ME/CFS primary care summary PMC
[9] https://www.nice.org.uk/guidance/NG59/chapter/update-information — NICE NG59 July 2026 update information
[10] https://www.who.int/standards/classifications/international-classification-of-functioning-disability-and-health — WHO ICF
[11] https://www.nice.org.uk/guidance/ng59/chapter/Recommendations — NICE NG59 LBP recommendations
[12] https://pmc.ncbi.nlm.nih.gov/articles/PMC13027591 — AI vs expert APA prescription Catania 2026
[13] https://eprints.whiterose.ac.uk/id/eprint/209625/1/bjsports-2023-107598.pdf — Wood et al BJSM 2024 realist review LBP exercise
[14] https://www.cochrane.org/CD004376/MUSKEL_exercise-osteoarthritis-knee — Cochrane exercise for knee OA
[15] https://pmc.ncbi.nlm.nih.gov/articles/PMC7905015 — Sprague pain-guided activity patellar tendinopathy 2021
[16] https://pubmed.ncbi.nlm.nih.gov/41843416 — ACSM RT Position Stand 2026 Currier
[17] https://pmc.ncbi.nlm.nih.gov/articles/PMC11060764 — Sawamura ChatGPT PT clinical questions 2024
[18] https://www.nice.org.uk/guidance/ng206/chapter/Recommendations — NICE NG206 ME/CFS recommendations
[19] https://www.mdpi.com/2077-0383/14/17/6251 — Meuwissen 2025 nsCLBP exercise adherence SR
[20] https://doi.org/10.1093/ptj/83.5.455 — Rothstein HOAC II Phys Ther 2003
