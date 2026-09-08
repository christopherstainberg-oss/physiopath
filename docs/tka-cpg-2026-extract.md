# APTA TKA CPG Revision 2026 — PhysioPath extract

Source: Bove AM et al. Clinical practice guideline for physical therapist management of total knee arthroplasty: revision 2026. *Phys Ther.* 2026;106(7):pzag058. https://doi.org/10.1093/ptj/pzag058  
PDF: `/opt/data/cache/physiopath/2026-TKA-CPG.pdf` (Chris Desktop copy).  
Scope of the CPG: **primary TKA for knee OA**, adults. **Not** revision TKA, unicompartmental/partial TKA, pediatric, TKA for non-OA, or nonoperative knee OA.

PhysioPath is educational, not a PT. Encode exercise names + stop-lines + “ask your clinician.” Do not encode CPT, care-setting choice, group vs 1:1, telerehab products, CBT/pain-neuroscience as Jeffery-as-clinician, or “your labs mean Y.”

Letter grades below are from the CPG action statements (Strong / Moderate / Weak / Consensus). Visual stems: Strong = must/should; Moderate = should; Weak/Consensus = may.

## What already matches `P.knee_replacement`

Current 4-phase pool (protocols.js): ankle pumps, quad sets, heel slides, SLR → seated extension, standing bends, mini squats, bike → sit-to-stand, low step-ups, hip abduction, calf raises → progressive squats/lunges, balance, walking 20–30 min, low-impact return.  
`CURATED_SURGERIES.tka`: work extension **and** flexion early; ice + elevate; ankle pumps + DVT watch; WBAT with walker; no driving until cleared; no running/jumping.  
That already covers ROM mix, early quad work, bike, sit-to-stand, stairs, walking, no plyo.

## Do not put in the pool (CPG says skip or do not routine)

| Rec | Strength | Why it must not appear as an exercise name |
|---|---|---|
| CPM after primary uncomplicated TKA | Strong — **should not** | No meaningful ROM/function benefit; cost and it displaces active work |
| Routine brace/splint to gain ROM | Moderate — **should not routinely** | No clinically meaningful ROM gain; delays mobility |
| MLD, compression dressings, or CPM for edema | Consensus — **should not routinely** | Not proven; extra cost |
| High-impact / hop / run as “return” | (implant precaution, existing) | Keep phase 4 **low-impact** |

TENS, Kinesio tape, incision massage, computer-cryo units: **weak / mixed**. Do not add as catalog exercises. Optional one-line “your PT may use ice, tape, or TENS early if they judge it useful — not a home gadget list.”

## Encode in pool + notes (implementation map)

Hook key: `P` = `data/protocols.js` `P.knee_replacement`; `S` = `CURATED_SURGERIES` id `tka`; `N` = program notes when flag `knee_replacement`; `T` = `test/clinical-maps.test.mjs`.

### 1. Preoperative exercise (Moderate — should)

PTs **should** design preop exercise for strength, flexibility, endurance. Early postop gains fade; no single modality/setting proven superior. Neuroscience/CBT preop is thin evidence.

**PhysioPath:** if TKA condition + `surgery:"no"` (waiting / prehab), keep `knee_replacement` pool but note: *educational prehab — walking, quad/hip strength, knee motion as tolerated; this is not a substitute for a PT-designed prehab program.* Do not invent a second protocol id.

### 2. ROM A — no CPM (Strong)

**PhysioPath:** assert pool text does **not** match `/continuous passive|\\bcpm\\b/i`. Never add a CPM card.

### 3. ROM B — no routine brace/splint (Moderate)

**PhysioPath:** do not add knee immobilizer / extension splint as an exercise. Surgeon-ordered brace stays in free-text precautions, not the pool.

### 4. ROM C — PROM + AAROM + AROM (Moderate — should)

No single ROM method superior. Passive, active-assistive, and active all improve flexion.

**PhysioPath phase 1–2 names to keep or add (wording that tests can regex):**
- Heel slides / assisted knee bends (AAROM)
- Seated or supine active knee flexion/extension (AROM)
- Quad sets + terminal extension / towel under heel (extension — CPG warns flexion-elevation can threaten extension)
- Bike as assisted ROM (already phase 2)

Do **not** add PNF stretching as a named product.

### 5. ROM D — manual therapy / devices may augment AAROM (Weak)

**PhysioPath:** note only: *a PT may add joint/soft-tissue work or a slide board / pedal device; none beat standard exercise long-term.* No gadget in the pool.

### 6. Pain A — teach cryotherapy early (Moderate — should)

Ice/cryo for early pain. No device proven better than simple cold. Contraindications: cold sensitivity, poor sensation/circulation, skin issues.

**PhysioPath `S`:** keep “Ice …” and add “simple cold pack is enough — fancy cryo machines are not required.”

### 7. Pain B — TENS / tape / manual / psychologically informed **may** (Weak)

Small effects; kinesiophobia CBT only if Tampa >37 in the trial. **PhysioPath: do not ship CBT or TENS protocols.** Off-ramp already covers “pain that steadily worsens.”

### 8. Swelling A — cryo + elevate limb, knee flexed 30–90° early (Moderate — should; evidence High, downgraded)

Benefits mostly **first 72 h**. Flexion positioning can threaten extension — CPG says pair it with **extension ROM**.

**PhysioPath `S`:** “Early on, elevate the operated leg with the knee bent about 30–90° to limit swelling, **and** keep working full straightening so the knee does not stay bent.”

### 9. Swelling B — Kinesio may (Weak, mixed) — skip pool.

### 10. Swelling C — no routine MLD / compression dressings / CPM (Consensus) — skip pool.

### 11. Physical activity (Moderate — should)

Encourage **early activity** and a plan that progresses on **safety, functional tolerance, physiological response, collaborative goals**. Bike, aquatic, Tai chi safe early in trials; hiking at **1 year** for stairs/function. Step-count interventions; ~6000 steps/day cited as protective in knee OA literature (not a PhysioPath prescription).

**PhysioPath:**
- Phase 1–2: walking as tolerated (already implied by ankle pumps + later walking)
- Phase 2–3: stationary bike (exists)
- Phase 4: walking endurance 20–30 min (exists); **no running**
- `N`: “Build daily walking as you tolerate; stationary bike is a joint-friendly option. Running and jumping are not the goal after a knee replacement. A step target belongs to you and your PT — this app does not prescribe one.”

### 12. Motor function training (Strong — should)

Dynamic balance, gait retraining, movement with feedback, sit-to-stand, stairs. Benefits gait, balance, performance tests.

**PhysioPath:** keep sit-to-stand, step-ups, standing hip abduction, balance near support. Add **weight-shift / operated-leg stance** in phase 2–3 if missing. Do not add VR/gamification/shoe-orthotic gadgets.

### 13. NMES to quadriceps (Moderate — should)

At least daily, early (from ~POD 2 in trials), highest tolerable intensity, ≥ ~3 weeks. Helps strength, gait, stairs. **Do not** use with demand pacemaker, active cancer, or DVT.

**PhysioPath `N` only (we do not ship a stim unit):** “If your PT gives you a quadriceps stimulator (NMES), use it as they set it — early and strong enough to make the muscle work. Do not use electrical stim if you have a demand pacemaker, active cancer, or a known clot unless your team says otherwise.”

### 14. Progressive strength training (Strong — should)

Start in the **early postacute** period. Closed + open chain, concentric + eccentric, bands all OK. **High-intensity and low-intensity both helped; Bade et al. found no significant difference.** Arthrogenic inhibition can blunt early high-load. Progress on **soreness, pain, ROM, swelling, self-reported function** — not “more sets.”

**PhysioPath:** keep SLR, seated extension, mini squats → sit-to-stand, step-ups, hip abduction, calf raises → pain-free squats/lunges. Do **not** add hop/plyo because “strength.” `N`: “Harder is not automatically better. If swelling, night pain, or stiffness jump after a session, back off and tell your PT.”

### 15. Supervised PT should be provided (Moderate)

Setting by safety, mobility, environment, preference.

**PhysioPath:** one note, not a setting picker: “This list does not replace visits with a physical therapist. Supervised PT after knee replacement is the standard in the guideline this education follows.”

### 16. Group or individual **may** (Weak) — skip UI.

### 17. Digital health tools **should consider** (Moderate, evidence High, downgraded) — do not claim PhysioPath **is** that tool. Banner already says educational.

### 18. Start PT / mobilize within 24 h (Moderate — should)

Hospital/fast-track. **PhysioPath** cannot time a ward. `S` already has early motion + WBAT. Keep. Do not tell someone discharged home they “must walk at hour 12.”

### 19. Outpatient rather than IRF/home **may** (Weak, low evidence, conflicting) — **do not encode a discharge destination.**

### 20. Interdisciplinary care coordination (Consensus) — skip. Not an app job.

## Red-flag / stop-line (TKA-specific, educational)

CPG complications called out in motor/strength sections: **incision healing, thromboembolism, stiffness/arthrofibrosis**. Domain `msk` redflags already cover hot joint+fever, inability to WB, worsening pain.

**Add TKA `N` / `S` (not a diagnosis):**
- Calf pain, swelling, warmth, or sudden breathlessness → urgent care (DVT/PE) — already partly in `tka` precautions and Safety notes.
- Wound leaking, spreading redness, fever → surgical team.
- Knee that will not straighten or bend, or motion going backwards after it had been improving → PT/surgeon (stiffness / possible MUA territory — do not name MUA as a plan).
- CPG exclusions for *this guideline*: revision, partial knee, non-OA TKA — catalog may still map those names to `knee_replacement`; copy must not say “this follows the 2026 primary-TKA CPG” for UKA/revision.

## Tests to lock (slice 4)

1. `Total knee replacement recovery` → `c.protocol === "knee_replacement"`.
2. Early plan (weeks 2, surgery yes) **has** `/quad|heel slide|ankle pump|extension/i` and **not** `/\\bcpm\\b|continuous passive|plyometric|hop|jog|run/i`.
3. Later plan **has** `/sit-to-stand|step-up|walk|bike|balance/i` and **not** hop/run.
4. Program notes or surgery precautions **mention** ice/cryo and elevate, and **mention** extension (straightening).
5. Knee OA stays `knee_oa` (already tested) — CPG is postop TKA, not nonop OA.

## Out of scope for this extract

- Outcome-measure battery (KOOS, TUG, 6-clicks): CPG revision **deferred** evaluation/OM recommendations to a future version.
- Letter-grade UI badges.
- Pelvic floor, labs-as-diagnosis, Jeffery-as-PT.
- Changing UKA/revision off `knee_replacement` unless a later slice adds a dedicated pool.

## Cite in UI (one line max)

Educational footnote, not a claim of guideline implementation:  
“Exercise themes follow the 2026 APTA CPG on physical therapist management of primary total knee arthroplasty (Bove et al., *PTJ*). That document is for qualified PTs. This app is not medical care.”
