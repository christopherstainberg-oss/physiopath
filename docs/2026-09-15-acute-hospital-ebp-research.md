# Acute / hospital PT reasoning for PhysioPath’s Jeffery prompt

> **Research date:** 15 September 2026 · **Rounds:** 3 · **Sources:** 18 · **Category:** how-to
> Scope: make Jeffery’s *system prompt* better with a **narrow** focus on acute/hospital physical rehabilitation. Educational, not a prescription, not Jeffery-as-PT, not new diagnoses. Engine rules stay in `generateProgram` / `progressionSignal`.
> Prompt artifact: `docs/jeffery-acute-hospital-prompt.md`
> Prior general (outpatient-flavoured) prompt research: `docs/2026-09-15-ebp-clinical-reasoning-prompt-research.md`

## Executive Summary

The 15 September Jeffery loop (HOAC / SINSS / ICF / FITT-VP) is the right **algorithm**, and it is still taught for acute cardiopulmonary coursework.[11][15] It is the wrong **flavour** for hospital work. That loop currently talks like outpatient MSK: tendon ladders, OA pain scores, plyos, “this week,” sport cutting. Acute-care PTs do not reason that way. They fuse medical data with mobility/safety in a fast environment, reassess continuously, and aim at an appropriate **discharge setting**, not a gym program.[7]

Hospital evidence does **not** say “more, earlier, harder.”[1][19] SCCM’s March 2025 PADIS update **conditionally** suggests enhanced mobilisation over usual care (moderate certainty), with resource limits as the implementation barrier.[5][6] An expert panel still recommends starting mobilisation within 72 h when there is no contraindication, stepwise to the highest **safe** level, inside an ABCDEF-style bundle.[4] PulmCCM notes ordinary PT for ventilated patients is still not routine.[12] The TEAM trial (n=750 ventilated adults) found that pushing extra early active mobilisation (~21 vs ~9 min/day) did **not** increase days alive and out of hospital at 180 days, and **did** increase mobilisation-attributable adverse events (9.2% vs 4.1%).[1] AVERT (n=2104 stroke) found very early, frequent, higher-dose out-of-bed work **reduced** the odds of a favourable 3-month outcome versus usual care (46% vs 50%; adjusted OR 0.73, 0.59–0.90).[19]

So the better prompt is a **traffic-light + mobility-ladder overlay** on the existing loop: defer to logged vitals/telemetry/precautions/on-screen protocol; one session-level HOAC hypothesis; short bouts at RPE/talk-test; never invented vasopressor cutoffs; never Jeffery-as-intensivist.[3][14]

## Overlay vs current prompt — at a glance

| Lever | Current Jeffery prompt | Acute/hospital overlay (this work) |
|---|---|---|
| When it fires | Every exercise answer | Only acute track, clearance, ICU/ward flags, telemetry, surgical precautions |
| Safety | Red-flag list + precautions | Traffic light from **logged** telemetry/flags; no invented MAP/FiO2/mcg/kg/min |
| SINSS irritability | Pain during >5 or next morning | Desat / HR-BP out of telemetry / arrhythmia / delirium, plus pain-monitor |
| ICF participation | Sport / work | ADLs + next setting (home vs in-person rehab) |
| HOAC time grain | “This week” | **This session** |
| Dose | FITT-VP, no 10% folklore | Short frequent bouts; forbid “highest intensity longest time” (TEAM) |
| Stroke | Generic neuro | No AVERT-style very-early high-dose out-of-bed |
| Ladder | Rotate/Swap gym list | Bed/ROM → sit → stand → walk (Supine/Seated/Standing already in app) |
| Outcome | Trust + a session they repeat | Same, plus a **safe next mobility rung** |
| Citations | No invented PMIDs | Same; plus do not invent ICU numbers |

## 1. How acute-care PTs actually reason

Masley et al. interviewed 18 PTs in three US academic medical centers. Themes: collect/analyse medical information; apply specialised PT knowledge; communicate both ways; **continual dynamic assessment**; rapid decisions in a crowded environment. Major concerns were mobility and safety; goals were an optimal plan and an **appropriate discharge setting**.[7] [SOURCED]

That is HOAC, used in hospital clothing: patient-identified problems (cannot sit, want to go home) versus clinician-identified problems (telemetry out, dropped ticks, raised ICP flag).[15] UNLV’s 2026 acute cardiopulmonary syllabus still names HOAC II, ICF, and the Guide to PT Practice as the reasoning stack, plus chart review, lines/tubes, and PPE.[11] [SOURCED]

APTA Acute Care publishes entry-level core competencies for this environment; they are skills and behaviours, not a bigger exercise catalog.[10] [SOURCED]

**Prompt implication:** keep HOAC/ICF/SINSS names; change the *inputs* to vitals, telemetry, precautions, functionCapacity, and discharge-shaped ADLs.[7][15] Do not run a new SOAP exam the app cannot perform.[unverified]

## 2. What the CPGs actually say (through 2026)

**SCCM PADIS 2025 (March):** vs 2018’s “we suggest performing rehabilitation or mobilisation,” 2025 says: *We suggest providing enhanced mobilization/rehabilitation over usual care … (Conditional; moderate certainty).* The condition is resources, not “always max intensity.”[5][6] [VERIFIED] PulmCCM (3 Apr 2025) notes most hospitals still do not even deliver ordinary PT to ventilated patients routinely.[12] [SOURCED]

**Schaller et al., Intensive Care Medicine 2024** (46 recommendations; English update to April 2024): start early mobilisation within 72 h of ICU admission when no contraindication; protocol with active and passive components; stepwise to the highest possible **safe** level; integrate into a pain/agitation/delirium/spontaneous-breathing bundle; they could **not** give evidence-based absolute vital-sign cutoffs for starting, and listed expert stop signals (desaturation, large HR/BP swings, MAP collapse, new arrhythmia needing treatment, drop in consciousness, untreatable pain).[4] [SOURCED]

**Hodgson 2014 consensus** (23 ICU experts): four buckets — respiratory, cardiovascular, neurological, other. ETT is **not** a contraindication. Green-ish respiratory: FiO2 <0.6, SpO2 >90%, RR <30 if no other contraindications. **No consensus on vasoactive dose.**[3] [VERIFIED] Later vasoactive SRs still show mobilisation is often feasible at low doses with ~2% adverse events, and rare at high doses — still no agreed mcg/kg/min line.[16] [SOURCED]

**2026 ICM “standard of care” review:** physical rehab in ICU is generally safe with low event rates; care must span ICU → ward → community for physical, cognitive, and psychological sequelae.[13] [SOURCED]

PhysioPath already has the matching **engine** pieces: `icu_aw`, stroke + `raised_icp`, PE → `venous_rehab` not `post_covid`, delirium → `encephalopathy`, sternal/abdominal/spinal avoid-lists, telemetry vs target, acute-track RPE 9–12, little-and-often when movement pain ≥6.[unverified] The prompt never named that ladder.[unverified]

## 3. Counter-evidence the overlay must not paper over

**TEAM (Hodgson, NEJM 2022; 49 ICUs, 6 countries, 750 ventilated adults).** Primary: days alive and out of hospital at 180 days — 143 vs 145, difference −2 (95% CI −10 to 6), P=0.62. Extra physiotherapy (~20.8 vs 8.8 min/day active) did not help that outcome. Mobilisation-attributable AEs 9.2% vs 4.1% (P=0.005); 7 vs 1 serious AEs. Usual-care sites were already mobilising fairly well.[1] [VERIFIED] The Bottom Line reading: do not read TEAM as “stop early PT”; read it as **individualise**, and do not treat “highest activity for the longest time” as a default.[9] [SOURCED]

**AVERT (Bernhardt, Lancet 2015; 56 stroke units, 2104 patients).** Very early mobilisation (<24 h, extra out-of-bed sessions) vs usual care: favourable mRS 0–2 at 3 months **46% vs 50%**, adjusted OR **0.73 (0.59–0.90), P=0.004**.[19] [VERIFIED] Signal looked worse in severe stroke and ICH (no significant interaction).[19] A later AVERT analysis reported increased 14-day mortality with the high-dose intensive regimen (Class I evidence in that paper’s wording).[18] [SOURCED] Prompt: for on-screen stroke/ICH/`raised_icp`, do **not** coach very-early frequent high-dose out-of-bed work.

**Mari et al. 2024 SRMA (16 RCTs, 2385):** mobilisation within 72 h associated with shorter ICU stay and ventilation, better strength/function, **no** increase in AEs or mortality.[8] [SOURCED] That **conflicts** with TEAM on adverse events. Resolution for the prompt: prefer the large dedicated RCT (TEAM) for “does extra intensity help ventilated adults?”, and the SRMA for “starting *some* mobilisation inside 72 h vs delayed usual care.” PhysioPath should not market Jeffery as CPG-concordant ICU care.

## 4. How the overlay encodes reasoning without becoming a clinician

Catania 2026 (already in the general prompt report): expert-human programs beat LLM-alone on safety and progression.[unverified] Jeffery remains a **coach over a deterministic plan**.[unverified]

Hospital-specific failure modes if we skip the overlay:

1. Outpatient FITT on an ICU-AW list (“add 10%, add hops”).
2. Invented vasoactive or MAP cutoffs (Hodgson: no consensus).[3]
3. AVERT-style “get them up now, often” on ICH/`raised_icp`.[19]
4. TEAM-style “highest intensity longest time.”[1]
5. Treating labs as a diagnosis (“your labs mean you have Y”) — already forbidden in the PhysioPath skill.
6. Ignoring telemetry the Health tab already computed.

The overlay’s traffic light **only** uses fields already in USER CONTEXT: red-flag screen, telemetry in/out of clinician range, precautions, clearance, `raised_icp`, PE/DVT flags, journal vitals.[unverified] Yellow if vasopressors appear in free text — **no numbers**.[3] Green only to climb one rung on the existing list.

Dose language matches the engine: acute track is already RPE 9–12 and “5–7 short sessions” when movement pain is high.[unverified] The prompt must say that, not a different rule.

## Contradictions

1. SCCM 2025 “enhanced mobilisation” vs TEAM “extra minutes, more AEs, no 180-day benefit.”[1][5] Overlay: enhanced = **start and progress a safe ladder**, not a TEAM intervention.
2. Mari 2024 SRMA “EM does not increase AEs” vs TEAM 9.2% vs 4.1%.[1][8] Overlay follows TEAM for intensity; SRMA for *whether to start*.
3. 72 h start (Schaller/Mari) vs AVERT harm inside 24 h in stroke.[19][4] Overlay is protocol-specific: stroke/ICH ≠ medical ICU-AW.[8]
4. Hodgson green FiO2/SpO2/RR vs Schaller “no evidence-based absolute start values.”[3][4] Overlay: do not quote numbers the app does not have; use **prescribed telemetry**.

## Gaps

- GETP-12 and APTA Acute Care lab-values PDF were not fully extracted (paywall / wrong PMID on first AMP-PAC lookup). Labs stay “educational trend,” not a new cutoff table.
- AMP-PAC 6-Clicks primary paper not re-fetched; discharge reasoning is grounded in Masley (mobility, safety, next setting) rather than a 6-Clicks threshold.[7]
- No 2026 APTA CPG that is *only* “acute care PT” as a single document; Academy competencies are the stand-in.[10]
- GODMODE jailbreak templates were **not** applied (Grok AUP + PhysioPath: do not jailbreak Jeffery into a clinician). Completeness = unhedged educational reasoning, not a safety-filter bypass.
- Prompt quality is not a patient-outcome RCT.[unverified] Verification is tests on prompt contents + assemble, if/when this slice is picked.

## Conclusion

The better prompt for acute/hospital PhysioPath is **not** a second `generateProgram` and not a louder outpatient HOAC block. It is a constrained overlay:

1. Traffic light from logged telemetry/flags.
2. ICF as bed/sit/stand/walk + next setting.
3. Hospital SINSS (hemodynamic/neuro irritability).
4. One **session** hypothesis + a refuting log.
5. Mobility ladder on numbered exercises; short bouts; no TEAM max-intensity; no AVERT VEM for stroke/ICH.
6. Protocol-specific holds already in the engine (ICU-AW, PE, delirium, sternal, GBS, myasthenia, ME/CFS no GET).
7. No invented citations or ICU numbers.

Ship path when picked: RED tests in `test/coach-prompt.test.mjs` → insert overlay in `src/ui/4-coach-boot.js` → assemble → `npm test`. Do not grow the 40k catalog.

---

## Sources

[1] https://www.nejm.org/doi/full/10.1056/NEJMoa2209083 — TEAM trial: Early Active Mobilization during Mechanical Ventilation in the ICU (NEJM 2022)
[3] https://ccforum.biomedcentral.com/articles/10.1186/s13054-014-0658-y — Hodgson 2014 expert consensus safety criteria for ICU mobilization
[4] https://link.springer.com/article/10.1007/s00134-024-07532-2 — Schaller 2024 ICM guideline on positioning and early mobilisation
[5] https://journals.lww.com/ccmjournal/fulltext/2025/03000/a_focused_update_to_the_clinical_practice.17.aspx — SCCM PADIS focused update 2025
[6] https://www.guidelinecentral.com/insights/sept-2025-sccm-preventionmanagementadultsicu-guideline-timeline — Guideline Central: SCCM PADIS 2018 vs 2025 comparison
[7] https://pubmed.ncbi.nlm.nih.gov/21511991 — Masley 2011: PT practice in acute care qualitative study
[8] https://www.wjgnet.com/2220-3141/full/v14/i4/107396.htm — Mari 2024 SRMA: safety and early mobilization in ICU (16 RCTs)
[9] https://www.thebottomline.org.uk/summaries/team — The Bottom Line summary of TEAM
[10] https://www.apta.org/for-educators/curriculum-resources/acute-care — APTA Acute Care core competencies for educators
[11] https://unlv.edu/sites/default/files/media/document/2026-03/DPT-770-Syllabus.pdf — UNLV DPT-770 2026: HOAC II and ICF in acute care cardiopulmonary
[12] https://www.pulmccm.org/p/guideline-update-early-mobilization — PulmCCM March 2025: SCCM enhanced mobilization update
[13] https://link.springer.com/article/10.1007/s00134-026-08427-0 — Standard of care for rehabilitation in critical illness (ICM 2026)
[14] https://www.physio-pedia.com/Early_Mobilization_in_the_ICU — Physiopedia: Early Mobilization in the ICU (traffic light)
[15] https://doi.org/10.1093/ptj/83.5.455 — Rothstein 2003 HOAC II
[16] https://www.medintensiva.org/en-early-mobilisation-in-patients-with-articulo-S2173572724002613 — Early mobilisation with vasoactive drugs SR/MA Medicina Intensiva
[18] https://neurology.org/doi/abs/10.1212/WNL.0000000000011106 — AVERT 14-day fatal/nonfatal events Neurology
[19] https://pubmed.ncbi.nlm.nih.gov/25892679 — AVERT trial PubMed abstract (Bernhardt Lancet 2015)

**Evidence key** — `[VERIFIED]` corroborated across ≥2 independent, cited, dated sources · `[SOURCED]` from one named source, not independently corroborated · `[REASONED]` analytical judgement / inference · `[ESTIMATED]` calculation or stated assumption.
