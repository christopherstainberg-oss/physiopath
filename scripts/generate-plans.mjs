/* Generate data/plans.js — realistic, evidence-informed rehab TIMELINES for the
   long tail of the condition catalogue. The 33 curated plans in app.js
   (REHAB_PLANS) cover the best-known protocols; this file extends the same shape
   to thousands more diagnoses by combining clinical ARCHETYPES (tendinopathy,
   sprain, strain, osteoarthritis, bursitis, nerve entrapment, instability,
   apophysitis, disc-by-level, …) with the body SITE, so each plan still carries
   real phase windows, per-phase milestones (progression criteria) and the
   restrictions that apply at that stage.

   Emitted shape (regexes are emitted as SOURCE strings and compiled in app.js):
     { r, label, total, freq, note, generic?, postop?,
       variants:[{k,label,sub,pick?,scale,note?}],
       ph:[[title, weekStart, weekEnd, goal, criteria, restriction] × 4] }

   Education only — a treating clinician's protocol always overrides.
   Dependency-free & deterministic (no Date/Math.random). */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "plans.js");

const out = [];
const seen = new Set();
const add = (plan) => {
  const key = plan.r.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  /* "(general)" entries are catch-alls for their family and must never outrank a
     specific named plan. detectPlan ranks by LONGEST match, so an unflagged
     catch-all can hijack: "Dupuytren's contracture" was matching the
     "Joint contracture (general)" plan on "contracture" (11 chars) instead of its
     own plan on "dupuytren" (9). Flagging them generic makes specificity win. */
  if (/\(general\)\s*$/.test(plan.label)) plan.generic = true;
  out.push(plan);
};

/* shared variant sets ---------------------------------------------------- */
/* Cross-cutting variations appended to every archetype's list. Their `pick`
   patterns deliberately mirror the CONTEXT stratifications the condition
   catalogue already generates ("— older adult (bone & fall aware)",
   "— return-to-sport focus", "— hypermobility-aware", …), so the right variation
   is auto-selected for those conditions instead of defaulting to Standard. */
const XCUT = [
  { k:"athlete", label:"Return-to-sport focus", sub:"Competitive sport is the goal", pick:"return-to-sport|athlet", scale:1.15,
    note:"Returning to sport needs more than being pain-free: strength within ~10% of the other side and passing sport-specific testing. The extra weeks are the return-to-sport phase, not extra healing." },
  { k:"work", label:"Return-to-work focus", sub:"Getting back to job demands", pick:"return-to-work|ergonomic", scale:1.05,
    note:"Match the plan to your actual job demands — lifting, sustained postures or repetition — and fix the ergonomics, or it returns with the work." },
  { k:"older", label:"Older adult", sub:"Slower healing; bone & falls matter too", pick:"older adult|bone & fall|elderly", scale:1.25,
    note:"Tissue heals more slowly with age and strength is lost faster during rest — so this runs longer, and balance and bone-loading work get ADDED rather than dropped." },
  { k:"decond", label:"Deconditioned / low fitness", sub:"Starting from a low base", pick:"deconditioned|low fitness", scale:1.3,
    note:"From a low base, build general capacity alongside the injured area, and expect the first few weeks to feel disproportionately hard — that settles." },
  { k:"irritable", label:"Highly irritable / pain-dominant", sub:"Flares very easily", pick:"high-irritability|pain-dominant", scale:1.3,
    note:"When symptoms flare easily, start lower and progress in smaller steps — boom-and-bust sets you back further than a slow, steady start." },
  { k:"postimmob", label:"Post-immobilisation reconditioning", sub:"Just out of a cast, boot or sling", pick:"post-immobili", scale:1.2,
    note:"After immobilisation expect marked stiffness and muscle loss: range first, then load. The tissue is deconditioned, so progress in small increments." },
  { k:"hypermobile", label:"Hypermobility-aware", sub:"Very flexible joints", pick:"hypermobil", scale:1.25,
    note:"With hypermobile joints do NOT chase more range — you already have plenty. Strength, mid-range control and proprioception are the targets, and progress is usually slower." },
  { k:"home", label:"Home-based (minimal equipment)", sub:"No gym access", pick:"home-based|minimal equipment", scale:1.05,
    note:"Bodyweight, bands and household objects can load tissue perfectly well — progress by adding reps, slowing the tempo, or moving to single-limb versions instead of adding weight." },
  { k:"gym", label:"Gym-based progression", sub:"Full equipment available", pick:"gym-based", scale:0.95,
    note:"With machines and free weights you can load and measure precisely — use that to progress by measurable increments rather than by feel." },
  { k:"slowheal", label:"Slower healing expected", sub:"Diabetes, smoking or steroids", pick:"diabet|smoker", scale:1.4,
    note:"Diabetes, smoking, corticosteroids and poor nutrition measurably slow healing. Stopping smoking is the single biggest thing you can change here." }
];
const PACE = [
  { k:"standard", label:"Standard", sub:"The usual criteria-based pathway", scale:1 },
  { k:"accelerated", label:"Accelerated", sub:"Progressing excellently, well supervised", scale:0.75,
    note:"Accelerated: only if you're progressing excellently with good control and no swelling — the criteria still decide, not the dates." },
  { k:"conservative", label:"Conservative", sub:"Slower healer, complications, or extra caution", scale:1.35,
    note:"Conservative: suits complications, other injuries alongside, older age, smoking or diabetes — all of which genuinely slow healing." },
  ...XCUT
];
const GRADES = (mild, mod, sev) => ([
  { k:"g1", label:"Grade I (mild)", sub:mild, pick:"grade (i|1)\\b", scale:0.45 },
  { k:"g2", label:"Grade II (moderate)", sub:mod, pick:"grade (ii|2)\\b", scale:1 },
  { k:"g3", label:"Grade III (severe)", sub:sev, pick:"grade (iii|3)\\b", scale:1.9,
    note:"Grade III (complete) tears take substantially longer and warrant assessment — some need a surgical opinion." },
  ...XCUT
]);
const TENDON_VARIANTS = [
  { k:"reactive", label:"Reactive (recent)", sub:"Came on in the last few weeks after a load spike", pick:"acute|early|reactive", scale:0.7,
    note:"Reactive tendon pain settles faster — cut the load spike that caused it, keep loading, and it often calms in 6–12 weeks." },
  { k:"standard", label:"Persistent (months)", sub:"Grumbling for a few months", scale:1 },
  { k:"degenerative", label:"Long-standing / degenerative", sub:"A year or more, thickened tendon", pick:"chronic|degenerat|long-?standing", scale:1.5,
    note:"Long-standing degenerative tendons are slower and need consistent heavy-slow loading for 6+ months; expect a good but gradual response." },
  { k:"postinj", label:"After a steroid injection", sub:"Injected recently", pick:"injection", scale:1.2,
    note:"After a corticosteroid injection the tendon is temporarily weaker — pain relief is short-term and long-term outcomes are WORSE than loading alone, so avoid heavy loading for ~2 weeks then rebuild carefully." },
  ...XCUT
];

/* ---------------- archetype builders ---------------- */
/* Each returns the plan body for a given site spec `s`:
   { label, r, part (plain-language body part), act (typical aggravating activity),
     slow? (slower-healing site), extra? (site-specific restriction) }        */

const A = {
  /* tendon overuse — load is the treatment; slow but reliable */
  tendinopathy: (s) => ({
    total: s.slow ? 26 : 18,
    freq: "Loading 3–4×/week, consistently — little and often beats occasional big sessions",
    note: `Tendinopathy is a load problem, not an inflammation problem: the ${s.part} tendon needs progressive loading, not rest. Expect 3–6 months for a real change — pain up to ~4/10 during exercise that settles by the next morning is acceptable and not damaging.`,
    variants: TENDON_VARIANTS,
    ph: [
      ["Settle & isometric loading", 0, 4,
       `Calm the irritable tendon and start pain-free isometric loading for the ${s.part}.`,
       "pain settling day to day, comfortable isometric holds, less pain with everyday use",
       `Reduce — don't stop — the aggravating load${s.act ? ` (${s.act})` : ""}. Complete rest de-conditions the tendon and makes it worse.${s.extra ? " " + s.extra : ""}`],
      ["Heavy-slow resistance loading", 4, 10,
       "Load the tendon progressively — this is the main driver of recovery.",
       "tolerating heavy-slow loading, soreness settling within 24 hours, daily tasks easier",
       "Load 3×/week with a slow tempo. Pain during loading is fine if it settles by the next morning; pain that's worse the next day means you did too much."],
      ["Strength & capacity", 10, s.slow ? 18 : 14,
       `Build strength and load tolerance through the ${s.part}'s full range.`,
       "strength approaching the other side, minimal day-to-day symptoms",
       "Keep the loading going even as pain settles — stopping early is the most common reason it comes back."],
      ["Return to full loading & prevention", s.slow ? 18 : 14, s.slow ? 26 : 18,
       "Restore full capacity and return to your sport or work demands.",
       "strength near-symmetrical, tolerating your full activity without a next-day flare",
       "Build volume by ~10% per week. Keep a maintenance loading programme — tendons flare when loading suddenly stops or spikes."]
    ]
  }),

  /* ligament sprain — heals well, graded by severity */
  sprain: (s) => ({
    total: 12,
    freq: "Daily home work + 1–2 supervised sessions/week early on",
    note: `${s.label} settles with protection then graded loading. Most ligament sprains heal well without surgery — the common mistake is stopping rehab once the pain goes, before strength and balance are restored.`,
    variants: GRADES("Stretched, stable on testing", "Partial tear, some laxity", "Complete tear, marked laxity"),
    ph: [
      ["Protect & settle", 0, 1,
       "Control pain and swelling and protect the healing ligament.",
       "swelling settling, comfortable at rest, protected movement returning",
       `Compression and elevation early, and keep moving within comfort.${s.extra ? " " + s.extra : ""}`],
      ["Restore range & normal use", 1, 3,
       `Regain full range and normal use of the ${s.part}.`,
       "full or near-full pain-free range, using it normally for daily tasks",
       "Avoid the direction of stress that injured it while it's still tender."],
      ["Strength & control", 3, 6,
       "Rebuild strength, proprioception and control.",
       "strength ≥80% of the other side, good control, no pain with loading",
       "Add speed and change of direction only once loading is comfortable."],
      ["Return to sport & prevention", 6, 12,
       "Restore power and sport-specific demands.",
       "strength ≥90%, confident with your activity, no episodes of giving way",
       "Keep the balance/proprioception work going for months — it's what prevents the next one."]
    ]
  }),

  /* muscle strain — fast but re-injures if rushed */
  strain: (s) => ({
    total: 8,
    freq: "Daily loading of the injured muscle",
    note: `Muscle strains heal quickly but re-injure easily if you go back too soon. Eccentric strength and a graded speed progression are what protect the ${s.part}.`,
    variants: GRADES("Sore and tight, minimal strength loss", "Partial tear, clear weakness", "Complete tear or avulsion"),
    ph: [
      ["Protect & gentle activation", 0, 1,
       "Settle bleeding and pain with gentle pain-free activation.",
       "walking/using it normally, pain-free gentle isometrics",
       "Avoid stretching into pain and any explosive effort. Compression early."],
      ["Range & progressive isometrics", 1, 2,
       "Restore length and start loading without pain.",
       "full pain-free range, comfortable isometrics at increasing length",
       "No high-speed or explosive work yet — this is where re-tears happen."],
      ["Eccentric strengthening", 2, 4,
       "Build eccentric strength — the protective quality for this muscle.",
       "strong pain-free eccentric work, comfortable with faster movement",
       "Progress speed gradually; soreness that lingers into the next day means back off."],
      ["Return to speed & sport", 4, 8,
       "Restore full speed, power and sport-specific loading.",
       "pain-free maximal effort, eccentric strength near-symmetrical, confident at speed",
       "Don't return until you can go at full speed pain-free. Keep the eccentric work in your programme — it substantially cuts re-injury."]
    ]
  }),

  /* osteoarthritis — managed, not cured; exercise is first-line */
  oa: (s) => ({
    total: 16,
    freq: "Exercise most days — consistency matters more than intensity",
    note: `${s.label}: exercise is first-line treatment and works as well as many drugs — it will not 'wear the joint out'. The goal is managing it well, not curing it. Expect meaningful change in 6–12 weeks, and benefits only last while you keep going.`,
    variants: [
      { k:"mild", label:"Mild", sub:"Occasional pain, little functional loss", pick:"mild|early|stage (i|1)\\b", scale:0.7 },
      { k:"moderate", label:"Moderate", sub:"Regular pain, some activity limits", scale:1 },
      { k:"severe", label:"Severe", sub:"Constant pain, marked limitation", pick:"severe|advanced|end-?stage|stage (iv|4|iii|3)\\b", scale:1.4,
        note:"Severe OA still improves with exercise — and being stronger and fitter improves outcomes if you do go on to a joint replacement. Discuss surgical options if pain and function stay poor despite good rehab." },
      { k:"flare", label:"During a flare", sub:"Currently very irritable", pick:"flare|acute", scale:1.2,
        note:"During a flare, reduce load and range rather than stopping — short-term relative rest, then rebuild." }
    ],
    ph: [
      ["Settle & restore movement", 0, 2,
       `Calm the joint and restore comfortable ${s.part} movement.`,
       "pain settling, moving the joint comfortably through most of its range",
       `Reduce aggravating load temporarily, but keep moving — rest stiffens an arthritic joint.${s.extra ? " " + s.extra : ""}`],
      ["Strengthen the muscles around the joint", 2, 6,
       "Build the muscles that support and offload the joint.",
       "strength improving, daily tasks easier, less pain with activity",
       "Some discomfort during exercise (up to ~5/10) that settles within 24 hours is expected and safe."],
      ["Progressive loading & function", 6, 12,
       "Load progressively and rebuild real-world function.",
       "clear strength gains, comfortable with stairs/walking/daily loads",
       "Progress load gradually; if it flares, drop back a level rather than stopping."],
      ["Capacity, weight & long-term management", 12, 16,
       "Build lasting capacity and a routine you'll keep.",
       "confident with your activities, a maintenance plan you can sustain",
       "Keep it up — the benefit fades within months if you stop. If you carry extra weight, even 5–10% loss meaningfully reduces joint load and pain."]
    ]
  }),

  /* bursitis — irritated bursa, usually compression/overload driven */
  bursitis: (s) => ({
    total: 12,
    freq: "Daily — short, frequent sessions",
    note: `${s.label} is usually driven by compression or a sudden increase in load. Taking the compression off and rebuilding the surrounding strength settles it — injections give short-term relief but don't fix the cause.`,
    variants: PACE,
    ph: [
      ["Reduce compression & settle", 0, 3,
       "Take the pressure off the bursa and calm the irritation.",
       "pain at rest and at night settling",
       `Avoid direct pressure and the position that compresses it${s.act ? ` (${s.act})` : ""}.${s.extra ? " " + s.extra : ""}`],
      ["Restore movement & isometrics", 3, 6,
       "Restore comfortable movement and start gentle loading.",
       "comfortable range, tolerating isometric loading",
       "Avoid repeated end-range compression while it's still irritable."],
      ["Progressive strengthening", 6, 9,
       `Rebuild strength around the ${s.part}.`,
       "good strength gains, minimal day-to-day pain",
       "Increase load gradually — spikes are what irritated it in the first place."],
      ["Return to full activity", 9, 12,
       "Restore full capacity and fix the cause.",
       "comfortable with your normal activity, strength near-symmetrical",
       "Address the technique, workload or position that overloaded it, or it will recur."]
    ]
  }),

  /* nerve entrapment / compression */
  nerve: (s) => ({
    total: 16,
    freq: "Daily nerve-glides + activity modification",
    note: `${s.label}: the nerve is compressed or irritated. Taking the pressure off, gliding the nerve gently and modifying the aggravating position is the mainstay. Nerves recover slowly (about 1 mm/day) — expect gradual change over months.`,
    variants: [
      { k:"mild", label:"Mild (pins & needles)", sub:"Intermittent tingling, no weakness", pick:"mild|early", scale:0.7 },
      { k:"moderate", label:"Moderate", sub:"Frequent symptoms, some numbness", scale:1 },
      { k:"severe", label:"Severe (weakness/wasting)", sub:"Constant numbness, weakness or muscle wasting", pick:"severe|advanced", scale:1.4,
        note:"Constant numbness, weakness or visible muscle wasting means the nerve is under sustained pressure — get reviewed. Decompression is very effective and prolonged compression can cause permanent damage." },
      { k:"postop", label:"After decompression surgery", sub:"Nerve released surgically", pick:"release|decompress|transposition", scale:0.8,
        note:"After decompression, symptoms often ease quickly but numbness can take months to fully recover; keep the nerve gliding and rebuild grip/strength gradually." }
    ],
    ph: [
      ["Offload the nerve & settle symptoms", 0, 4,
       "Take pressure off the nerve and reduce the irritation.",
       "night symptoms and pins-and-needles reducing",
       `Avoid the sustained position that compresses it${s.act ? ` (${s.act})` : ""}. Splinting at night can help.${s.extra ? " " + s.extra : ""}`],
      ["Nerve gliding & mobility", 4, 8,
       "Restore nerve mobility without provoking it.",
       "symptoms reducing during the day, comfortable with gliding",
       "Nerve glides should NOT increase your symptoms — gentle and brief is the rule, never stretch a nerve hard."],
      ["Strength & function", 8, 12,
       `Rebuild ${s.part} strength and function.`,
       "strength improving, minimal daytime symptoms",
       "Progress loading as symptoms allow; watch for symptoms creeping back with volume."],
      ["Return to full use & prevention", 12, 16,
       "Restore full function and fix the cause.",
       "symptoms settled, strength near-normal",
       "Change the ergonomics, technique or habit that compressed it. Persisting weakness or wasting warrants a surgical opinion."]
    ]
  }),

  /* joint instability / recurrent dislocation */
  instability: (s) => ({
    total: 24,
    freq: "Daily home work + 1–2 supervised sessions/week",
    note: `${s.label}: the ${s.part} needs strength, control and proprioception to feel stable again. Recurrence is highest in younger, active people — a staged, criteria-based return is what protects the joint.`,
    variants: [
      { k:"first", label:"First dislocation", sub:"First-time event", pick:"first|acute|initial", scale:1 },
      { k:"recurrent", label:"Recurrent", sub:"It keeps going out", pick:"recurrent|chronic|habitual|multidirectional", scale:1.3,
        note:"Recurrent instability despite good rehab is a reason for a surgical opinion — each dislocation adds damage." },
      { k:"postop", label:"After stabilisation surgery", sub:"Surgically stabilised", pick:"repair|stabilis|stabiliz|reconstruction|latarjet|bankart", scale:1.2,
        note:"After stabilisation, protect the repair early and follow your surgeon's range limits — returning to contact sport is typically 4–6 months." }
    ],
    ph: [
      ["Protect & settle", 0, 3,
       "Protect the joint and settle pain while tissue heals.",
       "pain settling, comfortable at rest, protected range returning",
       `Avoid the position of instability${s.extra ? " — " + s.extra : ""}.`],
      ["Restore range & activate", 3, 6,
       "Regain range within safe limits and activate the stabilisers.",
       "near-full range within safe limits, good isometric control, no apprehension mid-range",
       "Stay out of end-range positions that make the joint feel like it will go."],
      ["Strength, control & proprioception", 6, 12,
       "Build strength and joint position sense.",
       "good strength and control through range, no apprehension",
       "Introduce end-range and loaded work gradually as confidence builds."],
      ["Return to sport", 12, 24,
       "Restore power and contact/impact demands.",
       "full strength, no apprehension, confident with sport-specific loading",
       "Return to contact sport is usually 3–6 months; repeated instability warrants a surgical opinion."]
    ]
  }),

  /* growth-plate / apophysitis — paediatric, self-limiting with load management */
  apophysitis: (s) => ({
    total: 12,
    freq: "Daily gentle loading + activity modification",
    note: `${s.label} is a growth-plate overload — common in active, growing children and it does NOT cause lasting damage. It settles as load is managed and resolves once growth finishes. Complete rest isn't needed and isn't helpful.`,
    variants: [
      { k:"mild", label:"Mild", sub:"Sore after sport only", pick:"mild|early", scale:0.6 },
      { k:"moderate", label:"Moderate", sub:"Sore during sport, limping after", scale:1 },
      { k:"severe", label:"Severe", sub:"Sore with daily activity and walking", pick:"severe|acute", scale:1.5,
        note:"If it hurts with ordinary walking, cut sporting load right back for a few weeks — it settles faster than pushing through." }
    ],
    ph: [
      ["Settle & manage load", 0, 3,
       "Reduce the irritation by adjusting sporting load, not stopping it.",
       "pain with daily activity settling, able to walk comfortably",
       `Cut sport volume to a level that doesn't cause a limp or next-day pain${s.act ? ` (${s.act} is the usual aggravator)` : ""}. Ice after sport helps. This is not damaging the bone.${s.extra ? " " + s.extra : ""}`],
      ["Flexibility & gentle strengthening", 3, 6,
       "Address the tight, strong muscles pulling on the growth plate.",
       "improved flexibility, comfortable with gentle strengthening",
       "Keep sport at a tolerable level — pain up to ~3/10 that settles quickly is fine."],
      ["Progressive strengthening & impact", 6, 9,
       "Rebuild strength and reintroduce running and jumping.",
       "comfortable with running and hopping, minimal pain after sport",
       "Build sporting volume back gradually; growth spurts often trigger a flare."],
      ["Return to full sport", 9, 12,
       "Return to full training and competition.",
       "playing fully with minimal symptoms",
       "Flares during growth spurts are normal — manage load rather than stopping. It resolves when growth finishes."]
    ]
  }),

  /* intervertebral disc lesion at a level */
  disc: (s) => ({
    total: s.region === "cervical" ? 14 : 20,
    freq: "Little and often — several short sessions daily",
    note: `A ${s.part} disc lesion. Most settle without surgery — roughly half improve by 6 weeks and the majority by 3 months, and disc material reabsorbs over time. Pain moving OUT of the limb and back toward the spine ('centralisation') is a good sign. Progressive weakness, or bladder/bowel changes, need urgent review.`,
    variants: [
      { k:"standard", label:"Standard (non-surgical)", sub:"Pain, no significant weakness", scale:1 },
      { k:"weakness", label:"With nerve weakness", sub:"Clear muscle weakness or numbness", pick:"radiculopath|weakness|neuro", scale:1.3,
        note:"With genuine motor weakness get medical review — most still recover without surgery, but progressive weakness shouldn't be watched indefinitely." },
      { k:"postop", label:"After discectomy", sub:"Disc surgery already done", pick:"discectomy|laminectomy|decompress", scale:0.8,
        note:"After discectomy, limb pain usually settles fast; avoid heavy lifting and repeated bending for ~6 weeks, then rebuild — early graded activity beats prolonged rest." },
      { k:"chronic", label:"Long-standing", sub:"Months of symptoms", pick:"chronic|persistent", scale:1.5,
        note:"Long-standing symptoms are driven as much by sensitisation, sleep, stress and movement avoidance as by the disc — graded exposure matters more than any single exercise." }
    ],
    ph: [
      ["Settle & find your directional preference", 0, 2,
       "Reduce the limb pain and find the positions and movements that ease it.",
       "pain centralising (moving out of the limb toward the spine), able to move about",
       `Avoid prolonged sitting and loaded bending early. Keep moving — bed rest makes this worse.${s.extra ? " " + s.extra : ""}`],
      ["Restore movement & nerve mobility", 2, 6,
       "Restore comfortable movement and gentle nerve glide.",
       "limb pain mostly settled or centralised, moving comfortably",
       "Brief symptom increases that settle are fine; worsening or spreading limb pain is not — ease off."],
      ["Progressive strengthening", 6, 12,
       "Build trunk and limb strength and load tolerance.",
       "minimal limb symptoms, tolerating bending and lifting practice",
       "Reintroduce loaded bending and lifting gradually — the spine is robust and needs loading to get stronger."],
      ["Return to full activity & prevention", 12, s.region === "cervical" ? 14 : 20,
       "Restore full capacity for work, lifting and sport.",
       "confident with your full activities, symptoms settled",
       "Ongoing exercise is the best prevention. Progressive weakness or unrelenting pain warrants a surgical opinion."]
    ]
  })
};

/* ---------------- site lists per archetype ---------------- */

/* Tendinopathies — the biggest uncovered family */
const TENDONS = [
  ["Biceps tendinopathy", "biceps tendinopathy|bicipital tendin|long head of biceps", "shoulder", "overhead and lifting work", 0, "Avoid repeated overhead reaching and heavy front-loaded lifting while it's irritable."],
  ["Distal biceps tendinopathy", "distal biceps tendinop", "elbow", "repeated lifting with the palm up", 1, "Avoid heavy supinated (palm-up) lifting; sudden severe pain with a pop needs urgent review for a rupture."],
  ["Triceps tendinopathy", "triceps tendinop", "elbow", "repeated pressing", 0, ""],
  ["Rotator cuff tendinopathy (site-specific)", "supraspinatus tendinop|infraspinatus tendinop|subscapularis tendinop", "shoulder", "overhead work", 0, ""],
  ["Gluteal tendinopathy (site)", "gluteus medius tendinop|gluteus minimus tendinop|hip abductor tendinop", "hip", "standing on one leg, crossing your legs", 1, "Avoid crossing your legs, hanging on one hip when standing, and lying on the painful side."],
  ["Hamstring tendinopathy", "hamstring tendinop|proximal hamstring tendinop|high hamstring", "hip", "sitting on hard surfaces and deep hip bending", 1, "Avoid prolonged sitting on hard seats and deep hip flexion (deep lunges, sprinting) early — these compress the tendon."],
  ["Adductor tendinopathy", "adductor tendinop|groin tendinop", "groin", "kicking and cutting", 0, ""],
  ["Quadriceps tendinopathy", "quadriceps tendinop|quad tendinop", "knee", "jumping and deep squatting", 0, ""],
  ["Peroneal tendinopathy", "peroneal tendinop|fibularis tendinop", "ankle", "walking on uneven ground", 0, ""],
  ["Tibialis posterior tendinopathy", "tibialis posterior tendinop|posterior tibial tendinop", "ankle", "prolonged standing and walking", 1, "Supportive footwear or an orthotic matters here — this tendon holds up your arch, and an unsupported foot keeps overloading it."],
  ["Tibialis anterior tendinopathy", "tibialis anterior tendinop", "ankle", "downhill walking and running", 0, ""],
  ["De Quervain's tenosynovitis", "de quervain|dequervain|radial styloid tenosynov", "wrist", "gripping and lifting with the thumb", 0, "A thumb-spica splint helps a lot early. Lifting a baby with the thumb out is the classic aggravator."],
  ["Wrist extensor tendinopathy", "wrist extensor tendinop|extensor carpi", "wrist", "gripping and typing", 0, ""],
  ["Wrist flexor tendinopathy", "wrist flexor tendinop|flexor carpi", "wrist", "gripping", 0, ""],
  ["Intersection syndrome", "intersection syndrome", "forearm", "repeated wrist extension (rowing, lifting)", 0, ""],
  ["Trigger finger", "trigger finger|trigger thumb|stenosing tenosynov", "finger", "repeated gripping", 0, "Splinting the finger straight at night often settles it; steroid injection is effective if it persists, and locking that won't release needs review."],
  ["Gluteal / hip flexor tendinopathy", "hip flexor tendinop|iliopsoas tendinop|psoas tendinop", "hip", "repeated hip flexion (sit-ups, running)", 0, ""],
  ["Pes anserine tendinopathy", "pes anserine|pes anserinus", "knee", "repeated knee bending", 0, ""],
  ["Popliteus tendinopathy", "popliteus tendinop", "knee", "downhill running", 0, ""],
  ["Iliotibial band syndrome", "iliotibial band|\\bitb\\b syndrome|it band", "knee", "running, especially downhill", 0, "This is a compression problem — avoid deep knee bend under load and running downhill early; stretching the ITB itself doesn't help."],
  ["Swimmer's shoulder", "swimmer'?s shoulder", "shoulder", "swimming volume", 0, "Cut swim volume and fix stroke technique/breathing pattern — this is a training-load problem first."],
  ["Thrower's / pitcher's shoulder", "thrower'?s shoulder|pitcher'?s|throwing shoulder", "shoulder", "throwing volume", 0, "Throwing volume and mechanics are the cause — a graded interval throwing programme is essential."],
  ["Jumper's ankle / Achilles overload", "achilles overload|achilles paratendin", "ankle", "jumping and running", 1, ""],
  ["Plantaris tendinopathy", "plantaris tendinop", "calf", "running", 0, ""],
  ["Flexor hallucis longus tendinopathy", "flexor hallucis|\\bfhl\\b tendin", "foot", "pushing off, dancing en pointe", 0, ""],
  ["Extensor tendinopathy of the foot", "extensor tendinop.*foot|extensor digitorum longus tendin", "foot", "tight laces and walking uphill", 0, ""],
  ["Supraspinatus / cuff-related shoulder pain", "cuff-related shoulder pain|rotator cuff related", "shoulder", "overhead work", 0, ""],
  ["Wrist / hand tendinopathy", "hand tendinop|finger tendinop|thumb tendinop", "hand", "gripping and pinching", 0, ""],
  ["Shoulder (deltoid) tendinopathy", "deltoid tendinop|deltoid strain", "shoulder", "overhead lifting", 0, ""],
  ["Adductor-related groin pain", "adductor-related groin|groin overload", "groin", "kicking and change of direction", 0, ""]
];
TENDONS.forEach(([label, r, part, act, slow, extra]) => {
  const s = { label, r, part, act, slow: !!slow, extra };
  add({ r, label, ...A.tendinopathy(s) });
});

/* Sprains */
const SPRAINS = [
  ["Wrist sprain", "wrist sprain|wrist ligament (sprain|injury)", "wrist", "Avoid loaded wrist extension (push-ups, weight through the hand) while it's tender."],
  ["TFCC injury", "\\btfcc\\b|triangular fibrocartilage", "wrist", "Avoid loaded rotation and ulnar-side weight-bearing (twisting a lid, pushing up from a chair) — a wrist splint helps early."],
  ["Thumb (skier's/gamekeeper's) sprain", "skier'?s thumb|gamekeeper'?s thumb|ulnar collateral ligament.*thumb|thumb (ucl|sprain)", "thumb", "A thumb spica splint is usually needed; a complete UCL tear (Stener lesion) needs a surgical opinion."],
  ["Finger sprain / volar plate injury", "finger sprain|volar plate|\\bpip\\b sprain|jammed finger", "finger", "Buddy-taping and early gentle movement prevent the permanent stiffness these are notorious for."],
  ["PCL sprain", "\\bpcl\\b|posterior cruciate", "knee", "Avoid loaded knee flexion past 70–90° and hamstring-dominant work early — they pull the tibia backwards and stress the PCL. Quad strength is the priority."],
  ["LCL / posterolateral corner sprain", "\\blcl\\b|lateral collateral.*knee|posterolateral corner", "knee", "Avoid varus (bow-legged) stress and rotation; posterolateral corner injuries often need surgical assessment."],
  ["High ankle (syndesmosis) sprain", "syndesmosis|high ankle sprain|\\bafitl\\b", "ankle", "Avoid rotation and push-off; these take roughly TWICE as long as a normal ankle sprain and are often booted early."],
  ["Medial (deltoid) ankle sprain", "deltoid ligament|medial ankle sprain", "ankle", "Avoid rolling the foot outwards; check the syndesmosis and fibula — medial sprains are often part of a bigger injury."],
  ["Midfoot (Lisfranc) sprain", "lisfranc|midfoot sprain|tarsometatarsal (sprain|injury)", "midfoot", "These are frequently under-called and need imaging — an unstable Lisfranc needs surgery. Strict weight-bearing limits early."],
  ["Turf toe", "turf toe|first \\bmtp\\b sprain|great toe sprain", "big toe", "Avoid forced toe extension and push-off; a stiff-soled shoe or carbon plate protects it."],
  ["AC joint sprain", "\\bac\\b joint (sprain|injury)|acromioclavicular (sprain|injury|separation)", "shoulder", "Avoid cross-body reaching, overhead loading and lying on that side; a sling helps early."],
  ["Sternoclavicular sprain", "sternoclavicular", "shoulder", "Posterior SC dislocations are an emergency (airway/vessels) — get any deformity assessed urgently."],
  ["Cervical (whiplash) sprain", "whiplash|cervical sprain|neck sprain", "neck", "Collars make whiplash worse — keep moving gently. Most settle in weeks."],
  ["Thoracic sprain", "thoracic sprain|rib sprain|costovertebral", "mid-back", "Deep breathing regularly prevents chest infection when it hurts to breathe."],
  ["Elbow sprain", "elbow sprain|elbow ligament", "elbow", "Get early motion going — the elbow stiffens faster than almost any joint."],
  ["Elbow UCL sprain (thrower's elbow)", "elbow \\bucl\\b|ulnar collateral.*elbow|medial elbow ligament|thrower'?s elbow", "elbow", "No throwing until pain-free through a graded interval programme; UCL tears in throwers often need a surgical opinion."],
  ["Sacroiliac sprain", "sacroiliac (sprain|strain)|\\bsi\\b joint (sprain|strain)", "pelvis", ""],
  ["Hip sprain / labral irritation", "hip sprain|hip ligament", "hip", ""]
];
SPRAINS.forEach(([label, r, part, extra]) => add({ r, label, ...A.sprain({ label, r, part, extra }) }));

/* Muscle strains */
const STRAINS = [
  ["Quadriceps strain", "quadriceps strain|quad strain|rectus femoris (strain|tear)", "quadriceps", ""],
  ["Hip flexor strain", "hip flexor strain|iliopsoas strain|psoas strain", "hip flexor", ""],
  ["Gluteal strain", "glute (strain|tear)|gluteal strain", "glutes", ""],
  ["Rectus abdominis / abdominal strain", "abdominal strain|rectus abdominis strain|oblique strain|side strain", "abdominal wall", "Avoid heavy trunk rotation and sit-ups; breathing and coughing may hurt — support the area."],
  ["Intercostal strain", "intercostal strain|rib muscle strain", "chest wall", "Keep breathing deeply and cough with support — chest infection is the real risk here."],
  ["Pectoralis strain", "pec (strain|tear)|pectoral(is)? (strain|tear)", "chest", "A sudden pop while bench-pressing with a visible deformity is a pec rupture — that needs an urgent surgical opinion."],
  ["Latissimus / teres strain", "latissimus (strain|tear)|teres major (strain|tear)", "back", ""],
  ["Trapezius / neck muscle strain", "trapezius strain|neck muscle strain|levator scapulae strain", "neck", ""],
  ["Lumbar muscle strain", "lumbar (muscle )?strain|erector spinae strain|back muscle strain", "lower back", "Keep moving — the back is robust and bed rest slows recovery."],
  ["Biceps (arm) strain", "biceps strain|biceps (muscle )?tear", "upper arm", ""],
  ["Triceps strain", "triceps strain|triceps tear", "upper arm", ""],
  ["Forearm strain", "forearm strain", "forearm", ""],
  ["Rotator cuff strain / partial tear", "cuff (strain|partial tear)|partial.*cuff tear", "shoulder", ""],
  ["Gastrocnemius (tennis leg)", "tennis leg|medial gastrocnemius tear", "calf", ""]
];
STRAINS.forEach(([label, r, part, extra]) => add({ r, label, ...A.strain({ label, r, part, extra }) }));

/* Osteoarthritis by joint */
const OA_JOINTS = [
  ["Hip osteoarthritis", "hip osteoarthritis|hip \\boa\\b|osteoarthritis of the hip|coxarthrosis", "hip", "Cycling and pool work are usually well tolerated when walking hurts."],
  ["Knee osteoarthritis", "knee osteoarthritis|knee \\boa\\b|osteoarthritis of the knee|gonarthrosis", "knee", "Quadriceps strength is the single best-evidenced target."],
  ["Shoulder osteoarthritis", "shoulder osteoarthritis|glenohumeral osteoarthritis|shoulder \\boa\\b", "shoulder", ""],
  ["Hand / finger osteoarthritis", "osteoarthritis of the hand|hand osteoarthritis|finger osteoarthritis|\\bdip\\b osteoarthritis|\\bpip\\b osteoarthritis|heberden|bouchard", "hand", "Joint protection, built-up grips and hand exercise all help; heat before activity eases stiffness."],
  ["Thumb base (CMC) osteoarthritis", "thumb (base )?osteoarthritis|carpometacarpal osteoarthritis|\\bcmc\\b osteoarthritis|basal thumb", "thumb", "A thumb splint plus pinch-strengthening is the best-evidenced combination; avoid strong pinch grips."],
  ["Ankle osteoarthritis", "ankle osteoarthritis|ankle \\boa\\b|osteoarthritis of the ankle", "ankle", ""],
  ["Foot / big toe osteoarthritis", "hallux rigidus|first \\bmtp\\b osteoarthritis|foot osteoarthritis|midfoot osteoarthritis", "foot", "A stiff-soled or rocker shoe reduces the painful toe bend more than any exercise."],
  ["Elbow osteoarthritis", "elbow osteoarthritis|elbow \\boa\\b", "elbow", ""],
  ["Wrist osteoarthritis", "wrist osteoarthritis|wrist \\boa\\b|radiocarpal osteoarthritis|scaphotrapezi", "wrist", ""],
  ["Facet joint osteoarthritis", "facet (joint )?(osteo)?arthritis|facet arthropathy|spondylosis|zygapophyseal", "spine", "Extension and rotation usually aggravate it; flexion-based work and cycling are better tolerated."],
  ["Sacroiliac osteoarthritis", "sacroiliac (osteo)?arthritis|\\bsi\\b joint (osteo)?arthritis", "pelvis", ""],
  ["AC joint osteoarthritis", "acromioclavicular (osteo)?arthritis|\\bac\\b joint (osteo)?arthritis", "shoulder", "Cross-body reaching and bench pressing are the usual aggravators."],
  ["Patellofemoral osteoarthritis", "patellofemoral (osteo)?arthritis|patellofemoral \\boa\\b", "knee", "Deep squatting, stairs and prolonged sitting are the usual aggravators."],
  ["Cervical spondylosis", "cervical spondylosis|neck (osteo)?arthritis|cervical (osteo)?arthritis", "neck", ""],
  ["Lumbar spondylosis", "lumbar spondylosis|lumbar (osteo)?arthritis|degenerative disc disease", "lower back", "Degenerative changes on a scan are extremely common and often painless — they don't dictate your outcome."]
];
OA_JOINTS.forEach(([label, r, part, extra]) => add({ r, label, ...A.oa({ label, r, part, extra }) }));

/* Bursitis */
const BURSAE = [
  ["Subacromial bursitis", "subacromial bursitis|shoulder bursitis", "shoulder", "repeated overhead reaching", ""],
  ["Olecranon bursitis", "olecranon bursitis|elbow bursitis|student'?s elbow", "elbow", "leaning on your elbow", "A hot, red, exquisitely tender bursa with fever may be infected — that needs same-day medical review."],
  ["Trochanteric bursitis", "trochanteric bursitis|hip bursitis", "hip", "lying on that side, crossing your legs", ""],
  ["Prepatellar bursitis", "prepatellar bursitis|housemaid'?s knee|knee bursitis", "knee", "kneeling", "Kneeling pads and avoiding kneeling settle most cases; a hot red bursa with fever may be infected."],
  ["Infrapatellar bursitis", "infrapatellar bursitis|clergyman'?s knee", "knee", "kneeling", ""],
  ["Pes anserine bursitis", "pes anserine bursitis", "knee", "stairs and rising from a chair", ""],
  ["Retrocalcaneal bursitis", "retrocalcaneal bursitis|heel bursitis", "heel", "stiff heel counters on shoes", "Heel lifts and open-backed shoes take the pressure off."],
  ["Ischial bursitis", "ischial bursitis|weaver'?s bottom", "buttock", "prolonged sitting on hard seats", ""],
  ["Iliopsoas bursitis", "iliopsoas bursitis|psoas bursitis", "hip", "repeated hip flexion", ""],
  ["Scapulothoracic bursitis", "scapulothoracic bursitis|snapping scapula", "shoulder blade", "repeated overhead work", ""]
];
BURSAE.forEach(([label, r, part, act, extra]) => add({ r, label, ...A.bursitis({ label, r, part, act, extra }) }));

/* Nerve entrapments */
const NERVES = [
  ["Cubital tunnel syndrome", "cubital tunnel|ulnar nerve entrapment.*elbow|ulnar neuropathy at the elbow", "hand & forearm", "leaning on the elbow or keeping it bent (phone, sleeping)", "Avoid a bent elbow at night — a towel or splint to keep it straighter often settles the night symptoms."],
  ["Radial tunnel syndrome", "radial tunnel|radial nerve entrapment|posterior interosseous", "forearm", "repeated forearm rotation and gripping", ""],
  ["Guyon's canal syndrome", "guyon'?s canal|ulnar nerve.*wrist|handlebar palsy", "hand", "pressure on the palm (cycling handlebars, tools)", "Padded gloves and changing hand position on the bars usually fix the cycling variety."],
  ["Thoracic outlet syndrome", "thoracic outlet", "arm", "overhead work and carrying heavy bags", "Carrying heavy bags on that shoulder and sleeping with the arm overhead reliably aggravate it."],
  ["Suprascapular nerve entrapment", "suprascapular nerve", "shoulder", "repeated overhead work", ""],
  ["Meralgia paraesthetica", "meralgia paraesthetica|meralgia paresthetica|lateral femoral cutaneous", "outer thigh", "tight belts/waistbands and prolonged standing", "Tight waistbands, belts, heavy tool-belts and body armour are the classic cause — loosen them and it often resolves."],
  ["Common peroneal nerve entrapment", "common peroneal nerve|fibular nerve entrapment|peroneal neuropathy", "lower leg & foot", "crossing the legs or pressure at the outside of the knee", "Pressure at the outside of the knee (crossing legs, a tight cast/brace) is the usual cause. Foot drop needs review and often an AFO."],
  ["Tarsal tunnel syndrome", "tarsal tunnel|posterior tibial nerve entrapment", "foot", "prolonged standing and walking", "Arch support/orthotics reduce the traction on the nerve."],
  ["Morton's neuroma", "morton'?s neuroma|interdigital neuroma|intermetatarsal neuroma", "forefoot", "tight, narrow or high-heeled shoes", "Wide, low-heeled shoes plus a metatarsal dome is the first-line fix — narrow shoes are the cause."],
  ["Piriformis syndrome / deep gluteal pain", "piriformis syndrome|deep gluteal syndrome|sciatic nerve entrapment", "buttock & leg", "prolonged sitting", ""],
  ["Pudendal neuralgia", "pudendal", "pelvis", "prolonged sitting and cycling", "Avoid sitting on hard seats and cycling; a cut-out cushion helps."],
  ["Sural nerve entrapment", "sural nerve", "outer foot", "pressure from boots", ""],
  ["Digital nerve compression", "digital nerve (compression|entrapment)", "finger", "repeated pinch and tool use", ""],
  ["Axillary nerve injury", "axillary nerve", "shoulder", "", "Commonly follows a shoulder dislocation — deltoid weakness and numbness over the outer shoulder usually recover over months."],
  ["Long thoracic nerve palsy (winged scapula)", "long thoracic nerve|winged scapula|serratus palsy", "shoulder blade", "overhead and pushing work", "Recovery is slow (often 6–18 months) but usually good; avoid heavy overhead loading while the scapula wings."]
];
NERVES.forEach(([label, r, part, act, extra]) => add({ r, label, ...A.nerve({ label, r, part, act, extra }) }));

/* Instability / dislocation */
const UNSTABLE = [
  ["Patellar instability / dislocation", "patella (dislocat|instab|subluxat)|patellar (dislocat|instab|subluxat)|kneecap dislocat", "kneecap", "avoid deep knee bend with the knee turning inwards; a brace or taping helps early"],
  ["Elbow dislocation", "elbow dislocat", "elbow", "the elbow stiffens fast — early protected motion matters more here than protection"],
  ["Finger dislocation", "finger dislocat|\\bpip\\b dislocat|interphalangeal dislocat", "finger", "buddy-tape and move it early — permanent stiffness is the usual complication"],
  ["Hip dislocation", "hip dislocat", "hip", "follow your surgeon's hip precautions strictly; watch for signs of avascular necrosis"],
  ["Ankle instability", "ankle instability|chronic ankle instability|recurrent ankle sprain", "ankle", "balance training is the treatment — a brace protects while you build it"],
  ["Peroneal tendon subluxation", "peroneal (tendon )?(sublux|dislocat)", "ankle", "avoid forced ankle rotation; recurrent subluxation often needs surgery"],
  ["Shoulder multidirectional instability", "multidirectional instability|\\bmdi\\b shoulder|atraumatic shoulder instability", "shoulder", "avoid provocative end-range positions; this responds to a long, patient strengthening programme rather than surgery"],
  ["Sternoclavicular instability", "sternoclavicular (instab|dislocat|sublux)", "shoulder", "posterior dislocations are an emergency — get any deformity urgently assessed"],
  ["Distal radioulnar instability", "distal radioulnar|\\bdruj\\b", "wrist", "avoid loaded forearm rotation early"],
  ["Scapholunate instability", "scapholunate", "wrist", "avoid loaded wrist extension; untreated instability leads to arthritis — get it properly assessed"]
];
UNSTABLE.forEach(([label, r, part, extra]) => add({ r, label, ...A.instability({ label, r, part, extra }) }));

/* Apophysitis / growth-plate (paediatric) */
const APOPHYSES = [
  ["Sever's disease", "sever'?s|calcaneal apophysitis", "heel", "running and jumping on hard surfaces", "Heel raises/cushioned heel cups and softer surfaces make a real difference."],
  ["Osgood-Schlatter disease", "osgood|tibial tubercle apophysitis", "knee", "jumping, squatting and kneeling", "The bony lump is permanent but harmless. Kneeling directly on it is often the worst part."],
  ["Sinding-Larsen-Johansson", "sinding-larsen|johansson", "knee", "jumping", ""],
  ["Little League elbow", "little league elbow|medial epicondyle apophysitis", "elbow", "throwing volume", "Pitch counts and rest days are the treatment — this is a throwing-volume problem."],
  ["Little League shoulder", "little league shoulder|proximal humeral epiphysiolysis", "shoulder", "throwing volume", "Stop throwing for 6–12 weeks — this one genuinely needs a throwing break."],
  ["Iselin's disease", "iselin", "outer foot", "running and cutting", ""],
  ["Pelvic apophysitis", "pelvic apophysitis|iliac crest apophysitis|\\basis\\b apophysitis|\\baiis\\b apophysitis|ischial apophysitis", "pelvis", "sprinting and kicking", "A sudden pop while sprinting or kicking may be an avulsion fracture rather than apophysitis — that needs imaging."],
  ["Vertebral apophysitis / Scheuermann's", "scheuermann|vertebral apophysitis", "mid-back", "prolonged flexed postures", "Extension-based work and posture endurance; severe curves need specialist review."]
];
APOPHYSES.forEach(([label, r, part, act, extra]) => add({ r, label, ...A.apophysitis({ label, r, part, act, extra }) }));

/* Disc lesions by spinal level — "Disc protrusion at L4-L5" etc. */
const LEVELS = [
  ["cervical", "C", 2, 7, "neck"],
  ["thoracic", "T", 1, 12, "mid-back"],
  ["lumbar", "L", 1, 5, "lower back"]
];
LEVELS.forEach(([region, letter, from, to, part]) => {
  for (let i = from; i < to; i++) {
    const lvl = `${letter}${i}-${letter}${i + 1}`;
    add({ r: `disc (protrusion|herniation|bulge|prolapse|extrusion|lesion).*${lvl.toLowerCase()}|${lvl.toLowerCase()} disc`,
      label: `${part.replace(/^./, c => c.toUpperCase())} disc lesion (${lvl})`,
      ...A.disc({ label: `disc lesion at ${lvl}`, region, part }) });
  }
  // level-agnostic catch-all for the region
  add({ r: `${region} disc (protrusion|herniation|bulge|prolapse|extrusion)`,
    label: `${part.replace(/^./, c => c.toUpperCase())} disc lesion`, generic: true,
    ...A.disc({ label: `${region} disc lesion`, region, part }) });
});

/* ---------------- further archetypes ---------------- */

/* muscle contusion (dead leg / cork) — bleeding into muscle */
A.contusion = (s) => ({
  total: 8,
  freq: "Gentle range work several times daily early, then daily strengthening",
  note: `A ${s.part} contusion is bleeding within the muscle from a direct blow. Early gentle movement (not stretching or massage) limits stiffness. The complication to know about is myositis ossificans — bone forming in the bruise — which is made MORE likely by aggressive massage, heat or forced stretching in the first days.`,
  variants: GRADES("Mild — full range, little limp", "Moderate — restricted range and limping", "Severe — marked swelling, can barely move it"),
  ph: [
    ["Protect & pain-free movement", 0, 1,
     `Limit the bleeding and keep gentle pain-free ${s.part} movement.`,
     "swelling settling, pain-free gentle range improving, walking/using it more normally",
     "Compression and elevation, ice for pain. Do NOT massage, apply heat, drink alcohol or force a stretch in the first few days — all increase bleeding and the risk of myositis ossificans."],
    ["Restore range", 1, 3,
     "Regain full range without forcing it.",
     "full or near-full pain-free range, normal use returning",
     "Gentle active range only — pushing hard into a stretch is what causes trouble here."],
    ["Progressive strengthening", 3, 5,
     "Rebuild strength through the recovered range.",
     "strength returning toward the other side, no pain with loading",
     "If range stalls or a firm lump develops, get reviewed — that can indicate myositis ossificans."],
    ["Return to sport", 5, 8,
     "Restore full power and impact tolerance.",
     "full pain-free range and strength, confident with contact/impact",
     "Padding over the area helps for contact sport while it's still tender."]
  ]
});

/* mechanical impingement — a structure being pinched at end range */
A.impingement = (s) => ({
  total: 16,
  freq: "Daily home exercises + 1 supervised session/week",
  note: `${s.label}: a structure is being pinched at the end of the ${s.part}'s range. The fix is to improve control and strength through the mid-range and temporarily avoid the pinching position — not to force through it.`,
  variants: PACE,
  ph: [
    ["Settle & avoid the pinch", 0, 3,
     "Calm the irritated tissue by staying out of the pinching position.",
     "pain settling, comfortable through mid-range",
     `Temporarily avoid the end-range position that pinches${s.act ? ` (${s.act})` : ""} — repeatedly provoking it keeps it inflamed.${s.extra ? " " + s.extra : ""}`],
    ["Mobility & control", 3, 7,
     "Restore mobility and control so the joint moves better through range.",
     "improved range, good control in mid-range, less pinching",
     "Work up to but not into the painful end-range position."],
    ["Progressive strengthening", 7, 12,
     `Build strength around the ${s.part} through increasing range.`,
     "good strength, comfortable through most of the range",
     "Add end-range and loaded work gradually as it tolerates."],
    ["Return to full range & activity", 12, 16,
     "Restore full range and your activity demands.",
     "comfortable through full range, strength near-symmetrical",
     "If it stays stuck despite good rehab, imaging and a specialist opinion are reasonable — some structural impingements need surgery."]
  ]
});

/* articular cartilage / osteochondral lesion — slow, load-sensitive */
A.chondral = (s) => ({
  total: 26,
  freq: "Daily — low-impact, little and often",
  note: `${s.label}: cartilage has poor blood supply and heals slowly, so this is a patient, load-managed rehab. Strength around the joint protects the surface; impact and deep loaded bending are what irritate it.`,
  variants: [
    { k:"small", label:"Small / stable lesion", sub:"Managed without surgery", scale:0.8 },
    { k:"standard", label:"Standard", sub:"Moderate lesion, non-surgical", scale:1 },
    { k:"postop", label:"After cartilage surgery", sub:"Microfracture, OATS or ACI", pick:"microfracture|oats|\\baci\\b|graft|repair|transplant", scale:1.6,
      note:"After cartilage surgery the repair tissue matures over 6–12 months — weight-bearing limits early are strict, and returning to impact too soon damages the graft. Follow your surgeon's protocol exactly." },
    { k:"large", label:"Large / unstable lesion", sub:"Catching, locking or giving way", pick:"unstable|displaced|loose body", scale:1.4,
      note:"Catching, locking or a loose body warrants a surgical opinion — mechanical symptoms don't usually settle with exercise alone." }
  ],
  ph: [
    ["Settle & protect the surface", 0, 4,
     `Calm the joint and protect the cartilage while keeping the ${s.part} moving.`,
     "swelling settling, comfortable range returning",
     `Follow any weight-bearing limits. Avoid impact and deep loaded bending — those compress the lesion.${s.extra ? " " + s.extra : ""}`],
    ["Range & low-load strengthening", 4, 10,
     "Restore range and build strength without compressing the lesion.",
     "full range, good muscle activation, no swelling after exercise",
     "Swelling after exercise is the key warning sign — it means you loaded the joint more than it tolerated. Cycling and pool work are usually ideal here."],
    ["Progressive loading", 10, 18,
     "Load progressively through increasing range.",
     "strength ≥80% of the other side, no swelling with loading",
     "Add range and load gradually; still avoid repeated impact."],
    ["Return to activity", 18, 26,
     "Restore capacity and return to activity within what the joint tolerates.",
     "strength near-symmetrical, no swelling with your normal activity",
     "Low-impact activity is best long-term. Return to impact sport is a considered decision — discuss it, since cartilage lesions can progress to arthritis."]
  ]
});

/* joint stiffness / contracture — range is the whole game */
A.stiffness = (s) => ({
  total: 16,
  freq: "Little and often — short range sessions 3–5×/day beat one long one",
  note: `${s.label}: stiffness responds to frequent, sustained, tolerable range work — not to occasional forcing. Total time spent at end range is what changes it, so little and often wins. The longer a joint stays stiff the harder it is to regain, so start now.`,
  variants: PACE,
  ph: [
    ["Settle & gentle range", 0, 3,
     `Reduce pain and begin frequent gentle ${s.part} range work.`,
     "pain settling, small measurable range gains",
     `Stretch to a firm but TOLERABLE end-feel that settles within 30 minutes — forcing causes a flare that sets you back.${s.extra ? " " + s.extra : ""}`],
    ["Progressive range work", 3, 8,
     "Push range steadily with frequent sustained holds.",
     "steady measurable gains in range, less pain at end range",
     "Sustained holds (30s–2min) several times a day; heat beforehand helps. Progress is slow — that's normal."],
    ["Range + strength through new range", 8, 12,
     "Hold onto the new range by strengthening into it.",
     "range approaching the other side, strength building through the gained range",
     "Range you can't control you'll lose — strengthen into every bit you gain."],
    ["Restore full function", 12, 16,
     "Restore functional range and strength.",
     "functional range for your daily tasks, good strength",
     "If range plateaus despite genuine consistent work, get reviewed — some joints need a procedure to unlock them, and timing matters."]
  ]
});

/* inflammatory / systemic arthritis — medical disease + exercise */
A.systemic = (s) => ({
  total: 16,
  freq: "Movement daily + strengthening 2–3×/week, adjusted around flares",
  note: `${s.label} is a systemic inflammatory condition — exercise does NOT damage the joints and is strongly recommended alongside your medical treatment. It improves pain, fatigue, strength and cardiovascular risk. The art is adjusting load around flares rather than stopping.`,
  variants: [
    { k:"stable", label:"Well controlled", sub:"Settled on treatment", pick:"remission|controlled|stable", scale:0.8 },
    { k:"standard", label:"Standard", sub:"Usual day-to-day disease activity", scale:1 },
    { k:"flare", label:"During a flare", sub:"Currently active and inflamed", pick:"flare|active|acute", scale:1.3,
      note:"During an active flare: keep gentle range going to prevent stiffness, drop strengthening load right back, and don't push through hot, swollen joints. Build back as it settles." },
    { k:"deconditioned", label:"Long-standing / deconditioned", sub:"Years of disease, low fitness", pick:"chronic|long-?standing|advanced", scale:1.4 }
  ],
  ph: [
    ["Settle & protect the joints", 0, 3,
     "Calm irritable joints and keep them moving.",
     "pain and stiffness settling, moving joints through comfortable range daily",
     `Don't push through hot, swollen joints — but don't stop moving either. Coordinate with your rheumatology treatment; joint protection and pacing matter.${s.extra ? " " + s.extra : ""}`],
    ["Gentle strengthening & aerobic base", 3, 7,
     "Rebuild strength and aerobic capacity gently.",
     "tolerating light strengthening, morning stiffness easing, more activity tolerance",
     "Little and often. Ease off during a flare, then build back — a flare isn't a failure."],
    ["Progressive strengthening", 7, 12,
     "Build strength and endurance progressively.",
     "clear strength and stamina gains, stable joint symptoms",
     "Low-impact aerobic work protects the heart — cardiovascular risk is raised in inflammatory arthritis."],
    ["Capacity & long-term self-management", 12, 16,
     "Build a sustainable long-term routine.",
     "confident with your activities, a plan you can flex around flares",
     "This is lifelong management: keep exercising, keep taking your medication, and adjust load around flares rather than stopping."]
  ]
});

/* ---------------- extra specific sites ---------------- */
const MORE_TENDON = [
  ["Posterior tibial tendon dysfunction", "posterior tibial tendon dysfunction|tibialis posterior dysfunction|\\bpttd\\b|adult acquired flatfoot", "arch & inner ankle", "prolonged standing and walking", 1, "Orthotic/arch support matters as much as the exercise here — this tendon holds up your arch and keeps failing without support. Progressive heel raises are the key exercise; a collapsing arch that becomes rigid needs surgical review."],
  ["Calcific tendinitis of the shoulder", "calcific tendin", "shoulder", "overhead reaching", 1, "The acutely painful resorptive phase can be severe but is self-limiting — barbotage (needling) or an injection can help while it settles. It usually resolves eventually."],
  ["Long head biceps tendinitis", "long head biceps tendin|bicipital tendinitis", "shoulder", "overhead and lifting", 0, ""],
  ["Pectoralis major tendinopathy", "pectoralis major tendinop|pectoral tendinop", "chest", "bench pressing and pushing", 0, ""],
  ["Trapezius tendinopathy", "trapezius tendinop", "upper back", "sustained desk posture and carrying", 0, ""],
  ["Rhomboid tendinopathy", "rhomboid tendinop", "upper back", "sustained desk work", 0, ""],
  ["Latissimus tendinopathy", "latissimus tendinop", "back", "pulling and overhead work", 0, ""],
  ["Erector spinae tendinopathy", "erector spinae tendinop", "lower back", "repeated bending and lifting", 0, ""],
  ["Abdominal (oblique) tendinopathy", "abdominal .*tendinop|oblique tendinop", "abdominal wall", "rotation and throwing", 0, ""],
  ["Forearm tendinopathy", "forearm tendinop", "forearm", "gripping and repetitive tool use", 0, ""],
  ["Wrist tendinopathy", "wrist tendinop", "wrist", "gripping and typing", 0, ""],
  ["Calf (gastrocnemius) tendinopathy", "calf .*tendinop|gastrocnemius tendinop", "calf", "running and hill work", 0, ""],
  ["Groin (adductor) tendinopathy", "groin .*tendinop", "groin", "kicking and cutting", 0, ""],
  ["Achilles paratenonitis", "achilles paratenonitis|paratendinitis", "Achilles", "running volume", 1, ""],
  ["Gluteal tendinopathy (lateral hip)", "gluteal tendinop", "hip", "lying on that side and crossing your legs", 1, "Avoid crossing your legs, hanging on one hip, and lying on the painful side — compression is the driver."]
];
MORE_TENDON.forEach(([label, r, part, act, slow, extra]) =>
  add({ r, label, ...A.tendinopathy({ label, r, part, act, slow: !!slow, extra }) }));

const CONTUSIONS = [
  ["Quadriceps contusion (dead leg)", "quadriceps contusion|quad contusion|dead leg|charley horse", "thigh"],
  ["Hamstring contusion", "hamstring contusion", "hamstring"],
  ["Calf contusion", "calf .*contusion|gastrocnemius contusion", "calf"],
  ["Groin (adductor) contusion", "groin .*contusion|adductor contusion", "groin"],
  ["Hip flexor contusion", "hip flexor contusion", "hip flexor"],
  ["Gluteal contusion", "gluteal contusion|glute contusion", "buttock"],
  ["Hip pointer (iliac crest contusion)", "hip pointer|iliac crest contusion", "hip"],
  ["Biceps contusion", "biceps contusion", "upper arm"],
  ["Triceps contusion", "triceps contusion", "upper arm"],
  ["Pectoral contusion", "pectoral contusion|pec contusion", "chest"],
  ["Trapezius contusion", "trapezius contusion", "upper back"],
  ["Rhomboid contusion", "rhomboid contusion", "upper back"],
  ["Latissimus contusion", "latissimus contusion", "back"],
  ["Abdominal contusion", "abdominal .*contusion|oblique contusion", "abdominal wall"],
  ["Erector spinae contusion", "erector spinae contusion", "lower back"],
  ["Forearm contusion", "forearm contusion", "forearm"]
];
CONTUSIONS.forEach(([label, r, part]) => add({ r, label, ...A.contusion({ label, r, part }) }));

const IMPINGE = [
  ["Femoroacetabular impingement (FAI)", "femoroacetabular|\\bfai\\b|cam impingement|pincer impingement|hip impingement", "hip", "deep squatting, prolonged sitting and hip flexion past 90°", "Deep hip flexion and rotation pinch it — adjust squat depth, seat height and avoid sitting slumped. Labral tears alongside FAI often settle with strengthening; persistent mechanical symptoms may need arthroscopy."],
  ["Ischiofemoral impingement", "ischiofemoral impingement", "hip", "long strides and hip extension", ""],
  ["Fat pad impingement (Hoffa's)", "fat pad impingement|hoffa", "knee", "knee hyperextension and prolonged standing", "Taping to unload the fat pad plus avoiding knee hyperextension usually settles it; this is exquisitely tender and easily provoked."],
  ["Anterior ankle impingement", "anterior ankle impingement|footballer'?s ankle", "ankle", "deep squatting and forced dorsiflexion", ""],
  ["Posterior ankle impingement", "posterior ankle impingement|os trigonum", "ankle", "pointing the toes (dancing en pointe, kicking)", ""],
  ["Subacromial impingement", "subacromial impingement|shoulder impingement syndrome", "shoulder", "repeated overhead reaching", ""],
  ["Internal (posterior) shoulder impingement", "internal impingement|posterior impingement.*shoulder", "shoulder", "the cocking phase of throwing", ""],
  ["GIRD (internal rotation deficit)", "\\bgird\\b|internal rotation deficit", "shoulder", "throwing volume", "Posterior shoulder tightness is the target — sleeper/cross-body stretches plus throwing-volume control."],
  ["Ulnar impaction syndrome", "ulnar impaction|ulnocarpal abutment", "wrist", "loaded wrist rotation and ulnar deviation", ""],
  ["Snapping hip syndrome", "snapping hip|coxa saltans", "hip", "repeated hip flexion", "The snap itself is harmless — it only needs treating if it's painful."],
  ["Plica syndrome", "plica syndrome|synovial plica|medial plica", "knee", "repeated bending and prolonged sitting", ""],
  ["Patellar maltracking", "patellar maltracking|patella maltracking|patellar tracking", "kneecap", "squatting and stairs", ""],
  ["Sinus tarsi syndrome", "sinus tarsi", "ankle", "walking on uneven ground", ""],
  ["Scapular dyskinesis", "scapular dyskinesis|scapular dysfunction|scapular winging", "shoulder blade", "repeated overhead work", "The scapula is the shoulder's foundation — serratus and lower-trapezius control is the target."],
  ["Hip abductor weakness", "hip abductor weakness|gluteal weakness|trendelenburg", "hip", "single-leg loading", ""]
];
IMPINGE.forEach(([label, r, part, act, extra]) => add({ r, label, ...A.impingement({ label, r, part, act, extra }) }));

const CHONDRAL = [
  ["Osteochondral defect of the knee", "osteochondral (defect|lesion).*knee|chondral (defect|lesion).*knee|knee cartilage (defect|lesion)|osteochondritis dissecans.*knee", "knee", "Swelling after activity is your load gauge."],
  ["Osteochondral lesion of the talus", "osteochondral (defect|lesion).*talus|talar (osteochondral|dome) lesion|\\bocd\\b.*ankle", "ankle", ""],
  ["Cartilage defect of the hip", "cartilage .*defect.*hip|chondral (defect|lesion).*hip", "hip", ""],
  ["Osteochondritis dissecans", "osteochondritis dissecans", "joint", "In growing children this often heals with load management alone; unstable lesions need surgery."],
  ["Chondromalacia patellae", "chondromalacia", "kneecap", ""],
  ["Osteochondral defect (general)", "osteochondral|chondral (defect|lesion)|cartilage (defect|damage)", "joint", ""]
];
CHONDRAL.forEach(([label, r, part, extra]) => add({ r, label, ...A.chondral({ label, r, part, extra }) }));

const STIFF = [
  ["Elbow stiffness / contracture", "elbow (stiffness|contracture)", "elbow", "The elbow is the most contracture-prone joint in the body — frequent range work from day one is critical, and forcing it causes heterotopic bone."],
  ["Wrist stiffness / contracture", "wrist (stiffness|contracture)", "wrist", ""],
  ["Knee stiffness / arthrofibrosis", "knee (stiffness|contracture)|arthrofibrosis", "knee", "Losing knee extension is more disabling than losing flexion — prioritise getting it fully straight."],
  ["Shoulder stiffness", "shoulder (stiffness|contracture)", "shoulder", ""],
  ["Finger / hand stiffness", "(finger|hand) (stiffness|contracture)", "hand", "Hand stiffness sets fast and permanently — splinting plus frequent movement is the priority."],
  ["Ankle stiffness / contracture", "ankle (stiffness|contracture)|equinus contracture", "ankle", ""],
  ["Dupuytren's contracture", "dupuytren", "hand", "Exercise doesn't reverse the cords. Rehab matters most AFTER release surgery or needle fasciotomy — then splinting and range work prevent recurrence of the contracture."],
  ["Burn contracture", "burn (contracture|scar)|post-?burn", "skin & joint", "Scar tissue contracts for up to 18 months — sustained positioning, pressure garments, scar massage and splinting through that whole window are what preserve range."],
  ["Joint contracture (general)", "contracture", "joint", ""]
];
STIFF.forEach(([label, r, part, extra]) => add({ r, label, ...A.stiffness({ label, r, part, extra }) }));

const SYSTEMIC = [
  ["Rheumatoid arthritis", "rheumatoid", "joints", "Hot, swollen joints during a flare shouldn't be pushed. Joint protection and grip aids help hands; cardiovascular risk is raised, so aerobic work matters."],
  ["Psoriatic arthritis", "psoriatic arthritis", "joints", "Watch for enthesitis (tendon insertions) — those need loading like a tendinopathy, gradually."],
  ["Ankylosing spondylitis / axial SpA", "ankylosing spondylitis|axial spondyloarthritis|\\bspa\\b spine|spondyloarthr", "spine", "Exercise is the cornerstone here — daily extension/mobility work genuinely preserves spinal posture and function. Avoid high-impact and forced flexion if the spine has fused."],
  ["Systemic lupus erythematosus", "lupus|\\bsle\\b", "joints & body", "Fatigue is the dominant problem — pace, and avoid heat/sun exposure that can trigger flares."],
  ["Polymyalgia rheumatica", "polymyalgia", "shoulders & hips", "Symptoms respond dramatically to steroids; exercise then rebuilds the strength lost to disuse and steroid myopathy. Steroids also thin bone — keep loading."],
  ["Gout", "\\bgout\\b|gouty", "joint", "Do NOT exercise a hot acute gouty joint — rest and treat the attack, then return to activity between attacks. Long-term, urate-lowering treatment plus weight and diet management prevent attacks."],
  ["Fibromyalgia", "fibromyalgia", "body", "Graded aerobic exercise is the best-evidenced treatment, but start LOWER and go SLOWER than feels necessary — a boom-and-bust flare sets you back weeks. Sleep and pacing matter as much as the exercise."],
  ["Inflammatory arthritis (general)", "inflammatory arthritis|reactive arthritis|enteropathic arthritis", "joints", ""],
  ["Osteoporosis / low bone density", "osteoporosis|osteopenia|low bone (density|mass)|fragility fracture", "bones", "Weight-bearing, resistance and balance training build bone and prevent falls. AVOID loaded or repeated spinal flexion (sit-ups, deep bending, toe-touches) — that's what causes vertebral fractures."],
  ["Avascular necrosis", "avascular necrosis|osteonecrosis|\\bavn\\b", "joint", "Protect the joint from impact and follow any weight-bearing restriction — the bone is structurally weakened and can collapse. This needs orthopaedic follow-up; exercise supports but does not fix it."]
];
SYSTEMIC.forEach(([label, r, part, extra]) => add({ r, label, ...A.systemic({ label, r, part, extra }) }));

/* ---------------- remaining named families ---------------- */

/* Foot & ankle conditions that don't fit the archetypes above */
const FOOT = [
  ["Metatarsalgia", "metatarsalgia|forefoot pain", "forefoot", "Offload the forefoot — a metatarsal dome/pad, cushioned wide shoes and less barefoot walking on hard floors do most of the work, alongside calf and intrinsic foot strengthening."],
  ["Sesamoiditis", "sesamoiditis|sesamoid (injury|pain)", "big toe", "Offload the sesamoids with a dancer's pad and a stiff-soled shoe; avoid push-off and forced toe extension while it settles."],
  ["Flatfoot (pes planus)", "flatfoot|pes planus|fallen arch|flat feet", "arch", "Arch support plus tibialis-posterior and intrinsic foot strengthening. A flexible flatfoot that's pain-free needs no treatment at all."],
  ["Cavus (high-arched) foot", "cavus foot|pes cavus|high.?arch", "foot", "A rigid high arch absorbs shock poorly — cushioning, lateral wedging and peroneal strengthening help. New or progressive cavus should be checked for an underlying neurological cause."],
  ["Plantar plate injury", "plantar plate", "forefoot", "Taping the toe down plus a stiff-soled shoe is essential — without it the toe drifts and the tear worsens."],
  ["Freiberg's disease", "freiberg", "forefoot", "Offload the metatarsal head with a stiff sole and metatarsal pad; this is an osteochondrosis and takes months."],
  ["Accessory navicular syndrome", "accessory navicular", "arch", "Arch support to offload the accessory bone and the tibialis-posterior insertion."],
  ["Heel fat pad syndrome", "heel fat pad|fat pad atrophy", "heel", "Cushioned heel cups — this is a padding problem, not a plantar-fascia problem, so it needs shock absorption rather than stretching."],
  ["Tarsal coalition", "tarsal coalition", "midfoot", "A rigid painful flatfoot in an adolescent — orthotics and activity modification first, surgery if it stays symptomatic."],
  ["Bunion (hallux valgus)", "bunion|hallux valgus", "big toe", "Exercise won't straighten the toe, but wide shoes, toe spacers and foot strengthening reduce pain and slow progression."],
  ["Claw / hammer / mallet toe", "claw toe|hammer toe|mallet toe", "toes", "Roomy deep shoes plus toe-intrinsic work; fixed deformities need surgical review."],
  ["Shin splints (medial tibial stress syndrome)", "shin splint|medial tibial stress", "shin", "A training-load problem — cut volume, fix surfaces and footwear, build calf strength. Focal, worsening bony pain may be a stress fracture and needs imaging."]
];
FOOT.forEach(([label, r, part, extra]) => add({ r, label, ...A.tendinopathy({ label, r, part, act:"prolonged standing and walking", slow:true, extra }) }));

/* Hand & finger tendon injuries — splinting-dominated */
const HAND = [
  ["Mallet finger", "mallet finger", "fingertip", 8,
   "The fingertip splint must stay on CONTINUOUSLY for 6–8 weeks — letting the tip droop even once during that window restarts the clock. That splint is the whole treatment."],
  ["Boutonnière deformity", "boutonni", "finger", 10,
   "Splint the middle joint straight while keeping the fingertip moving. Untreated, this deformity becomes fixed."],
  ["Jersey finger (FDP avulsion)", "jersey finger|\\bfdp\\b avulsion|flexor digitorum profundus avulsion", "finger", 12,
   "This is a tendon torn off the bone and needs SURGICAL repair, usually within 1–2 weeks — it will not heal on its own."],
  ["Sagittal band injury", "sagittal band|boxer'?s knuckle", "knuckle", 8,
   "Relative-motion splinting for 6–8 weeks holds the tendon central while it heals."],
  ["Extensor tendon injury of the hand", "extensor tendon (injury|repair|laceration)", "hand", 12,
   "Follow your hand therapist's splinting and controlled-motion protocol precisely — hand tendons are unforgiving of both too much and too little movement."],
  ["Flexor tendon repair (hand)", "flexor tendon (repair|injury|laceration)", "hand", 12,
   "Early controlled motion under a hand therapist is essential: too little movement causes adhesions, too much ruptures the repair. Never grip against resistance until cleared."],
  ["Ganglion cyst", "ganglion", "wrist", 8,
   "Often harmless and frequently resolves on its own; treatment is only needed if it's painful or restricting."],
  ["Kienböck's disease", "kienb", "wrist", 16,
   "The lunate loses its blood supply — this needs orthopaedic follow-up. Splinting and load management help symptoms; later stages are managed surgically."],
  ["Scaphoid fracture", "scaphoid", "wrist", 16,
   "The scaphoid has a poor blood supply and a real non-union risk — immobilisation is long (often 8–12 weeks) and must be respected. A 'sprained wrist' still tender in the snuffbox is a scaphoid fracture until proven otherwise."]
];
/* Rescale an archetype's phase boundaries so the plan ends at `total`, keeping
   the windows contiguous, ascending and never zero-length. */
const retime = (b, total) => {
  const bounds = [b.ph[0][1], ...b.ph.map(f => f[2])];
  const span = bounds[bounds.length - 1] - bounds[0] || 1;
  const sc = bounds.map(x => Math.round((x - bounds[0]) * (total / span)) + bounds[0]);
  for (let i = 1; i < sc.length; i++) if (sc[i] <= sc[i - 1]) sc[i] = sc[i - 1] + 1;
  b.ph = b.ph.map((f, i) => [f[0], sc[i], sc[i + 1], f[3], f[4], f[5]]);
  b.total = b.ph[b.ph.length - 1][2];
  return b;
};

HAND.forEach(([label, r, part, total, extra]) =>
  add({ r, label, ...retime(A.stiffness({ label, r, part, extra }), total) }));

/* Paediatric orthopaedic */
const PAED = [
  ["Clubfoot (talipes equinovarus)", "clubfoot|talipes", "foot", 26,
   "Ponseti casting then a foot-abduction brace is the treatment — brace compliance is THE determinant of relapse and it's needed at night for years."],
  ["Developmental dysplasia of the hip (DDH)", "developmental dysplasia|\\bddh\\b|hip dysplasia", "hip", 26,
   "Harness or brace as directed — don't remove it except as instructed. Rehab supports movement and motor milestones once the hip is stable."],
  ["Perthes disease", "perthes|legg-calv", "hip", 52,
   "Containment and keeping the hip moving is the priority — maintain range and avoid high-impact loading while the head re-forms. This runs over years with orthopaedic follow-up."],
  ["Slipped capital femoral epiphysis (SCFE)", "slipped capital femoral|\\bscfe\\b|slipped upper femoral", "hip", 26,
   "This is a surgical condition — no weight-bearing until it's fixed. Afterwards follow the surgeon's weight-bearing status exactly and watch the other hip."],
  ["Cerebral palsy", "cerebral palsy|\\bgmfcs\\b|spastic dipleg|spastic hemipleg", "whole body", 52,
   "Focus on function, play-based practice and preventing contracture; work with the child's team on tone management, orthoses and equipment."],
  ["Spina bifida", "spina bifida|myelomening", "lower limbs", 52,
   "Skin checks and pressure care matter as much as strength — sensation is impaired. Watch for shunt problems and latex allergy."],
  ["Juvenile idiopathic arthritis", "juvenile idiopathic|juvenile arthritis|\\bjia\\b", "joints", 26,
   "Exercise and play are encouraged and don't harm the joints; coordinate with rheumatology and watch for eye involvement."],
  ["Toe walking", "toe walking|idiopathic toe walk", "ankle", 16,
   "Calf stretching and heel-strike retraining; persistent toe walking should be checked for a neurological cause or a tight tendo-Achilles."],
  ["Torticollis", "torticollis|congenital muscular torticollis", "neck", 16,
   "Early stretching and positioning works extremely well — the earlier it starts the better. Include tummy time and head-shape monitoring."],
  ["Brachial plexus birth injury (Erb's palsy)", "erb'?s palsy|brachial plexus birth|klumpke", "arm", 52,
   "Gentle daily range to prevent contracture while the nerve recovers; most recover substantially, but no improvement by 3 months needs specialist referral."],
  ["Osteogenesis imperfecta", "osteogenesis imperfecta|brittle bone", "bones", 52,
   "Exercise builds bone and muscle and IS recommended — but avoid impact and twisting loads; hydrotherapy is ideal."],
  ["Muscular dystrophy / SMA", "muscular dystrophy|duchenne|\\bsma\\b|spinal muscular atrophy", "whole body", 52,
   "Stay active to maintain function but AVOID eccentric and exhausting exercise — it can damage muscle. Contracture prevention and respiratory care are priorities."],
  ["Developmental coordination disorder", "developmental coordination|dyspraxia|hypotonia", "whole body", 26,
   "Task-specific practice of the actual skills the child wants — repetition and play, not generic strengthening."]
];
PAED.forEach(([label, r, part, total, extra]) => {
  const b = A.stiffness({ label, r, part, extra });
  b.total = total;
  b.freq = "Daily, play-based and little-and-often";
  b.note = `${label}: paediatric rehab is play-based and family-centred — progress is measured in function and milestones, not just range. ${extra}`;
  const step = Math.max(2, Math.round(total/4));
  b.ph = b.ph.map((f,i)=>[f[0], i*step, i===3 ? total : (i+1)*step, f[3], f[4], f[5]]);
  add({ r, label, ...b });
});

/* Spine — spondylolysis & nerve-root irritation by level */
add({ r:"spondylolysis|pars (defect|fracture)|spondylolisthesis", label:"Spondylolysis / spondylolisthesis",
  ...(() => { const b = A.disc({ label:"Spondylolysis", region:"lumbar", part:"lower back" });
    b.total = 26;
    b.freq = "Daily trunk work; avoid extension loading early";
    b.note = "A stress fracture of the pars — most become pain-free with load management and trunk strengthening over 3–6 months. Extension and rotation are the aggravators; a slip (spondylolisthesis) rarely progresses in adults.";
    b.ph[0][5] = "AVOID repeated or loaded spinal EXTENSION and rotation — that's what stresses the pars. Bracing is sometimes used in adolescents.";
    b.ph[2][2] = 14; b.ph[3][1] = 14; b.ph[3][2] = 26;
    return b; })() });
LEVELS.forEach(([region, letter, from, to, part]) => {
  for (let i = from; i < to; i++) {
    const lvl = `${letter}${i}-${letter}${i + 1}`.toLowerCase();
    add({ r: `radiculopathy at ${lvl}|${lvl} radiculopathy|nerve root .*${lvl}|spondylolysis .*${lvl}|facet .*${lvl}|stenosis at ${lvl}`,
      label: `${part.replace(/^./, c => c.toUpperCase())} nerve-root irritation (${lvl.toUpperCase()})`,
      ...A.disc({ label: `radiculopathy at ${lvl.toUpperCase()}`, region, part }) });
  }
});

/* Misc named conditions */
add({ r:"multi-?ligament knee|knee dislocation", label:"Multi-ligament knee injury",
  ...(() => { const b = A.instability({ label:"Multi-ligament knee injury", part:"knee", extra:"follow your surgeon's brace and weight-bearing limits exactly" });
    b.total = 52; b.ph[2][2] = 24; b.ph[3][1] = 24; b.ph[3][2] = 52;
    b.note = "A multi-ligament knee injury is a major injury — usually surgical and always slow (9–12 months). Nerve and vascular injury must be excluded early, and stiffness is the main complication, so early protected motion matters.";
    return b; })() });
add({ r:"pectoralis major (tear|rupture|repair)|pec major (tear|rupture|repair)", label:"Pectoralis major tear / repair",
  ...(() => { const b = A.strain({ label:"Pectoralis major tear", part:"chest", extra:"" });
    b.total = 24; b.ph = b.ph.map((f,i)=>[f[0], [0,2,6,14][i], [2,6,14,24][i], f[3], f[4], f[5]]);
    b.ph[0][5] = "A complete tear (a pop while bench-pressing, with bruising and a changed chest contour) needs an URGENT surgical opinion — repair within a few weeks gives far better results.";
    b.note = "Pectoralis major tears usually happen bench-pressing. Complete tears in active people are repaired surgically; partial tears are rehabbed. Avoid heavy pressing until well healed.";
    return b; })() });
add({ r:"pronator teres syndrome|median nerve entrapment", label:"Pronator teres syndrome",
  ...A.nerve({ label:"Pronator teres syndrome (median nerve at the elbow)", part:"forearm & hand", act:"repeated forearm rotation and gripping",
    extra:"Unlike carpal tunnel this rarely wakes you at night and the numbness includes the palm — avoid repetitive pronation and heavy gripping." }) });
add({ r:"little league(r'?s)? (shoulder|elbow)", label:"Little Leaguer's shoulder/elbow",
  ...A.apophysitis({ label:"Little Leaguer's shoulder/elbow", part:"growth plate", act:"throwing volume",
    extra:"Throwing volume is the cause — pitch counts and rest days are the treatment, and a 6–12 week throwing break is often needed." }) });
add({ r:"arthralgia|joint pain", label:"Joint pain (arthralgia)", generic:true,
  ...A.systemic({ label:"Arthralgia", part:"joints", extra:"" }) });

/* ---------------- bone stress & osteochondrosis ---------------- */
A.bonestress = (s) => ({
  total: 16,
  freq: "Daily — relative rest from impact, plus loading the rest of you",
  note: `${s.label}: bone is overloaded faster than it can remodel. This is a LOAD problem — relative rest from the aggravating impact, then a graded return, plus fixing the cause (training spikes, low energy availability/RED-S, bone health, footwear, technique). Bone stress takes 6–12 weeks to heal.`,
  variants: [
    { k:"early", label:"Early (stress reaction)", sub:"Bone oedema, no fracture line", pick:"reaction|early|mild", scale:0.7,
      note:"A stress reaction caught early settles much faster — respect it now and you avoid a full stress fracture." },
    { k:"standard", label:"Stress fracture", sub:"Established fracture line", scale:1 },
    { k:"highrisk", label:"High-risk site", sub:"Femoral neck, anterior tibia, navicular, base of 5th", pick:"femoral neck|anterior tibia|navicular|fifth metatarsal|5th metatarsal|talus|sesamoid", scale:1.6,
      note:"HIGH-RISK stress fractures (femoral neck, anterior tibial cortex, navicular, base of the 5th metatarsal) have a real risk of non-union or displacement — these need specialist assessment, often non-weight-bearing or surgery. Do not self-manage these." },
    { k:"recurrent", label:"Recurrent", sub:"Repeated bone stress injuries", pick:"recurrent|repeat|multiple", scale:1.4,
      note:"Repeated bone stress injuries warrant checking bone density, vitamin D, energy availability and (in women) menstrual function — RED-S is a common driver." }
  ],
  ph: [
    ["Offload & protect the bone", 0, 4,
     `Take the impact load off the ${s.part} and let the bone heal.`,
     "pain-free walking and daily activity, local bony tenderness settling",
     `STOP the impact activity that caused it${s.act ? ` (${s.act})` : ""}. Pain with ordinary walking means you're still overloading it. Keep training the rest of your body — cycling, pool and upper-body work are fine.${s.extra ? " " + s.extra : ""}`],
    ["Restore load tolerance", 4, 8,
     "Rebuild strength and non-impact load tolerance.",
     "no bony tenderness, comfortable with weight-bearing strength work",
     "No running or jumping yet. Address the cause now: training load, footwear, surfaces, technique, and nutrition/energy availability."],
    ["Graded return to impact", 8, 12,
     "Reintroduce impact very gradually.",
     "pain-free walking, then jogging, with no next-day bony pain",
     "Return to running in small increments (e.g. walk/jog intervals). ANY return of focal bony pain means stop and step back."],
    ["Return to sport & prevention", 12, 16,
     "Rebuild running/sport volume and prevent recurrence.",
     "back to your sport volume with no bony pain",
     "Build volume ~10%/week. Recurrence is common if the underlying load, bone health or energy-availability problem isn't fixed."]
  ]
});

/* Amputation / limb loss */
A.amputation = (s) => ({
  total: 39,
  freq: "Daily — short frequent sessions",
  note: `${s.label}: rehab runs from wound healing and shaping the residual limb, through prosthetic fitting, to walking/using it well. Residual-limb care and preventing contracture in the early weeks determine how well a prosthesis fits later.`,
  variants: [
    { k:"standard", label:"Standard", sub:"Uncomplicated healing", scale:1 },
    { k:"vascular", label:"Vascular / diabetic cause", sub:"Amputation for poor circulation or diabetes", pick:"vascular|diabet|dysvascular|ischaem|ischem", scale:1.3,
      note:"With a vascular or diabetic cause, wound healing is slower and the OTHER limb is also at risk — daily skin checks on both, and protect that remaining foot." },
    { k:"trauma", label:"Traumatic", sub:"After trauma, otherwise healthy", pick:"trauma|accident|blast", scale:0.85 },
    { k:"noprosth", label:"Without a prosthesis", sub:"Wheelchair-based mobility", pick:"wheelchair|no prosthe", scale:1.1,
      note:"Without a prosthesis the focus shifts to transfers, wheelchair skills, upper-limb strength and protecting the shoulders (they now do the walking)." }
  ],
  ph: [
    ["Wound healing, oedema & positioning", 0, 4,
     "Protect the wound, shape the residual limb and prevent contracture.",
     "wound healing, swelling reducing with compression, full joint range maintained",
     `Do NOT rest the residual limb on a pillow or sit with the joint bent all day — contracture develops fast and ruins prosthetic fitting. Compression/shrinker as directed, and check the skin daily.${s.extra ? " " + s.extra : ""}`],
    ["Strength, balance & pre-prosthetic training", 4, 10,
     "Build strength and balance ready for a prosthesis.",
     "residual limb shaped and desensitised, good strength and sitting/standing balance",
     "Keep the residual limb straight when resting. Phantom sensation and pain are normal and usually settle — mirror therapy and desensitisation help."],
    ["Prosthetic training", 10, 22,
     "Learn to wear, load and walk with the prosthesis.",
     "tolerating wear time, walking with the prosthesis and the least support you safely need",
     "Check the skin EVERY time you take it off — a red mark lasting more than 20 minutes means the socket needs adjusting. Build wear time gradually."],
    ["Advanced mobility & community", 22, 39,
     "Restore endurance, uneven ground, stairs and community activity.",
     "confident on stairs, slopes and uneven ground; community mobility restored",
     "Sockets need re-fitting as the limb changes shape. Protect your remaining limb and your shoulders — both are now doing extra work."]
  ]
});

const BONESTRESS = [
  ["Rower's rib stress injury", "rower'?s rib|rib stress (injury|fracture)", "rib", "rowing volume and ergo work", "Rib stress injuries need a real break from rowing/ergo; breathing and coughing hurt — keep breathing deeply to avoid a chest infection."],
  ["Marathoner's tibial stress", "marathoner'?s tibial|tibial stress (injury|reaction)", "shin", "running volume", "Anterior tibial cortex stress ('dreaded black line') is HIGH-RISK — focal pain on the front of the shin needs imaging, not pushing through."],
  ["Hook of hamate stress injury", "hook of hamate", "wrist", "gripping a club/bat", "Often needs surgical excision if it doesn't heal — hand a golf/bat grip change is part of prevention."],
  ["Gymnast's wrist (physeal stress)", "gymnast'?s wrist|distal radial physeal|physeal stress.*wrist", "wrist", "weight-bearing on the hands", "This is a growth-plate injury in a growing athlete — it needs a real break from weight-bearing on the hands or growth can be affected."],
  ["Weightlifter's distal clavicle osteolysis", "distal clavicle osteolysis|weightlifter'?s shoulder", "collarbone", "heavy bench pressing and dips", "Cut heavy bench/dips and narrow the grip; this is a bone-overload problem that settles when the load changes."],
  ["Pars / spine bone stress", "bone stress.*spine|vertebral stress", "spine", "repeated extension", ""],
  ["Femoral neck stress fracture", "femoral neck stress", "hip", "running volume", "HIGH-RISK: femoral neck stress fractures can displace and need urgent orthopaedic assessment — often non-weight-bearing or surgical."],
  ["Navicular stress fracture", "navicular stress", "midfoot", "running and jumping", "HIGH-RISK: the navicular has poor blood supply — this usually needs a period of non-weight-bearing in a boot and specialist follow-up."],
  ["Metatarsal stress fracture", "metatarsal stress|march fracture", "forefoot", "running and marching volume", "Base of the 5th metatarsal is high-risk for non-union — that one needs specialist review."],
  ["Snowboarder's ankle (lateral process of talus)", "snowboarder'?s ankle|lateral process.*talus", "ankle", "landing and impact", "This is a FRACTURE, not a sprain — it's very commonly missed. An ankle still swollen and painful after a snowboarding fall needs a CT. Missed ones go on to non-union and arthritis, so it needs proper immobilisation."],
  ["Bone stress injury (general)", "bone stress|stress reaction", "bone", "impact volume", ""]
];
BONESTRESS.forEach(([label, r, part, act, extra]) => add({ r, label, ...A.bonestress({ label, r, part, act, extra }) }));

const OSTEOCHONDROSES = [
  ["Köhler's disease (navicular)", "k[oö]hler", "midfoot", "A self-limiting childhood osteochondrosis of the navicular — it resolves fully. Offload with an arch support and let them stay active within comfort."],
  ["Panner's disease (capitellum)", "panner'?s", "elbow", "A self-limiting childhood osteochondrosis of the capitellum — rest from throwing/weight-bearing on the arm and it recovers. Distinguish it from OCD of the capitellum in older children, which is more serious."],
  ["Blount's disease (tibia vara)", "blount|tibia vara", "knee", "A growth-plate disorder causing bowing — this is an orthopaedic condition needing bracing or surgery. Rehab supports strength and gait around that."],
  ["Osteochondrosis (general)", "osteochondrosis|osteochondritis", "joint", "Most childhood osteochondroses are self-limiting and resolve with load management — but they need imaging and follow-up to confirm."]
];
OSTEOCHONDROSES.forEach(([label, r, part, extra]) => add({ r, label, ...A.chondral({ label, r, part, extra }) }));

const AMPUTATIONS = [
  ["Transtibial (below-knee) amputation", "transtibial|below-?knee amputation|\\bbka\\b", "residual limb", "Keep the KNEE straight when resting — a knee flexion contracture is the single biggest obstacle to walking well with a below-knee prosthesis."],
  ["Transfemoral (above-knee) amputation", "transfemoral|above-?knee amputation|\\baka\\b", "residual limb", "Avoid resting with the hip flexed or abducted — a hip flexion contracture makes an above-knee prosthesis very hard to use. Lie prone daily if you can."],
  ["Knee disarticulation", "knee disarticulation", "residual limb", ""],
  ["Hip disarticulation", "hip disarticulation", "residual limb", "Sitting balance and skin care over the pelvis are the early priorities; prosthetic use is demanding and energy-costly."],
  ["Transpelvic (hemipelvectomy)", "transpelvic|hemipelvectomy", "pelvis", "Very high energy cost for prosthetic walking — wheelchair mobility is often the practical primary option, with pressure care central."],
  ["Transhumeral / transradial amputation", "transhumeral|transradial|below-?elbow amputation|above-?elbow amputation", "residual limb", "Early prosthetic fitting improves long-term use; protect the other arm from overuse."],
  ["Shoulder disarticulation", "shoulder disarticulation|forequarter", "residual limb", ""],
  ["Wrist disarticulation", "wrist disarticulation", "residual limb", ""],
  ["Partial foot amputation", "partial foot amputation|ray amputation|transmetatarsal", "foot", "Balance changes and the remaining foot is at high risk — daily skin checks and proper footwear/filler are essential."],
  ["Digit amputation / replantation", "digit (amputation|replantation)|finger amputation|replantation", "hand", "After replantation follow the hand therapist's protocol exactly — the repair, circulation and cold intolerance all need managing; avoid nicotine entirely, it threatens the blood supply."],
  ["Amputation (general)", "amputation|limb loss|residual limb", "residual limb", ""]
];
AMPUTATIONS.forEach(([label, r, part, extra]) => add({ r, label, ...A.amputation({ label, r, part, extra }) }));

/* Sport-eponym overuse & niche named conditions, mapped to the right archetype */
const EPONYM_TENDON = [
  ["Golfer's wrist (ECU)", "golfer'?s wrist|\\becu\\b (tendinop|injury|subluxation)|hamate/ecu", "wrist", "the golf swing and gripping", 0, "ECU problems often need a splint and a grip/technique change; a subluxing ECU tendon (a snap on rotation) may need surgery."],
  ["Surfer's shoulder", "surfer'?s shoulder", "shoulder", "paddling volume", 0, ""],
  ["CrossFit shoulder overuse", "crossfit shoulder|crossfit overuse", "shoulder", "high-rep overhead work", 0, "High-rep overhead movements under fatigue are the driver — scale volume and fix technique."],
  ["Triathlete's overuse syndrome", "triathlete'?s overuse|multisport overuse", "multiple sites", "training volume across three disciplines", 0, "Total load across all three disciplines is what counts — the body doesn't know which sport caused it."],
  ["Baseball catcher's knee", "catcher'?s knee", "knee", "prolonged deep squatting", 0, ""],
  ["Skater's ankle", "skater'?s ankle", "ankle", "boot pressure and repeated push-off", 0, "Boot fit/lacing is usually the fix."],
  ["Volleyball shoulder (suprascapular)", "volleyball shoulder|suprascapular", "shoulder", "repeated spiking", 0, "Suprascapular nerve traction from repeated spiking can cause painless infraspinatus wasting — worth a nerve study if the muscle is visibly wasted."],
  ["Adductor longus enthesopathy", "adductor longus enthesopath|enthesopathy", "groin", "kicking and cutting", 1, ""],
  ["Peroneal tendon tear", "peroneal tendon (tear|injury|split)", "ankle", "walking on uneven ground", 1, "A split peroneal tendon that doesn't settle may need surgical repair; check for a high arch driving it."],
  ["Plantar fibromatosis", "plantar fibromatos|ledderhose", "arch", "prolonged standing", 1, "Nodules in the arch — offload with a cut-out insole; stretching the fascia hard tends to irritate it."],
  ["Haglund's deformity", "haglund", "heel", "stiff heel counters and uphill running", 1, "A bony bump irritated by the shoe's heel counter — open-backed or soft-heeled shoes and a heel lift take the pressure off. Avoid stretching into dorsiflexion, which compresses it."],
  ["Rotator interval lesion", "rotator interval", "shoulder", "overhead work", 0, ""],
  ["Bennett lesion", "bennett lesion", "shoulder", "throwing", 0, ""],
  ["Os acromiale", "os acromiale", "shoulder", "overhead work", 0, "An unfused growth centre — often incidental; if genuinely symptomatic it may need fixation."],
  ["SICK scapula syndrome", "sick scapula", "shoulder blade", "throwing volume", 0, "Scapular malposition, Inferior medial border prominence, Coracoid pain, dysKinesis — the fix is scapular control plus posterior-capsule and pec-minor length."],
  ["Cuboid syndrome", "cuboid syndrome", "midfoot", "walking on uneven ground", 0, "Often settles quickly with a cuboid whip/squeeze manipulation plus support — it's frequently missed."],
  ["Chronic exertional compartment syndrome", "exertional compartment", "lower leg", "running volume", 1, "Predictable pain/tightness at a set distance that stops with rest is the hallmark. Gait retraining (forefoot strike) helps some; refractory cases need fasciotomy — this doesn't settle with loading alone."],
  ["Miner's / carpet-layer's beat knee", "beat knee|carpet.?layer|miner'?s knee", "knee", "prolonged kneeling", 0, "Kneeling is the cause — knee pads and job rotation are the treatment."],
  ["Bipartite patella (symptomatic)", "bipartite patella", "kneecap", "jumping and squatting", 0, "Usually an incidental finding; when symptomatic it behaves like a bone stress problem — reduce load and strengthen."],
  ["Lateral patellar compression syndrome", "lateral patellar compression|excessive lateral pressure", "kneecap", "squatting and stairs", 0, ""],
  ["Valgus extension overload", "valgus extension overload", "elbow", "throwing", 0, "The posteromedial elbow gets pinched at ball release — throwing volume and mechanics are the drivers."],
  ["Elbow plica syndrome", "elbow plica|synovial fold.*elbow", "elbow", "repeated bending", 0, ""],
  ["Climber's finger pulley (A2) injury", "climber'?s (finger )?pulley|a2 pulley|pulley (injury|rupture)", "finger", "crimping", 0, "Crimp grip is the cause — tape/H-taping and avoiding full crimp while it heals; a loud pop with bowstringing needs a surgical opinion."],
  ["Goalkeeper's thumb", "goalkeeper'?s thumb", "thumb", "the ball forcing the thumb back", 0, "Same injury as skier's thumb (UCL) — a thumb spica splint is usually needed, and a complete tear (Stener lesion) needs surgery."],
  ["Swan-neck deformity", "swan.?neck", "finger", "gripping", 0, "A ring/figure-of-eight splint blocks the hyperextension and restores function; common in rheumatoid arthritis."],
  ["Central slip rupture", "central slip", "finger", "gripping", 0, "Splint the middle joint STRAIGHT continuously for ~6 weeks or it becomes a fixed boutonnière deformity."],
];
/* Charcot foot must NOT use the tendinopathy archetype — "reduce, don't stop
   loading" is exactly the wrong advice for an active Charcot process, where
   walking on the foot destroys the joints. It gets an offloading-first plan. */
/* Regex must NOT be a bare "charcot": that also catches Charcot-MARIE-TOOTH
   disease, a hereditary neuropathy where people walk and need strengthening —
   telling them "DO NOT WALK ON IT" would be actively harmful. Requiring a
   following space + noun excludes the hyphenated "Charcot-Marie-Tooth". */
add({ r:"charcot (foot|joint|arthropath|neuroarthropath)", label:"Charcot foot (neuroarthropathy)", total:52,
  freq:"Offloading is the treatment — exercise the rest of you while the foot is protected",
  note:"Charcot neuroarthropathy: in a person with neuropathy the bones of the foot fracture and collapse WITHOUT pain to warn them. The active phase (hot, red, swollen foot) is a medical emergency — total-contact casting and complete offloading are the treatment, and every step taken on it causes more destruction. This runs 6–12+ months until the foot is 'quiescent'.",
  variants:[
    { k:"active", label:"Active phase (hot & swollen)", sub:"Red, hot, swollen — the destructive phase", pick:"active|acute|hot", scale:1,
      note:"ACTIVE PHASE — this is an emergency. Get to a specialist foot service TODAY. Total-contact cast and non-weight-bearing until the foot cools; the temperature difference vs the other foot is what guides progression." },
    { k:"quiescent", label:"Quiescent / consolidated", sub:"Cooled and stable, in footwear", pick:"quiescent|chronic|consolidat|offloaded|reconditioning", scale:0.7,
      note:"Once quiescent, the priority is bespoke footwear/orthoses, daily skin checks and gradually rebuilding activity — recurrence and ulceration are the risks." },
    { k:"ulcer", label:"With an ulcer", sub:"Skin broken over the deformity", pick:"ulcer|wound", scale:1.3,
      note:"An ulcer over a Charcot deformity is limb-threatening — this needs urgent specialist wound care and complete offloading, not exercise progression." }],
  ph:[
    ["Active phase — total offloading", 0, 12,
     "Protect the foot completely and let the destructive phase burn out.",
     "the foot cooling (skin temperature within ~2°C of the other foot), swelling and redness settling on specialist review",
     "DO NOT WALK ON IT. Total-contact cast/boot and non-weight-bearing exactly as your specialist directs — because you can't feel it, pain will not warn you that you're causing damage. Exercise your other limbs, arms and heart instead."],
    ["Protected transition", 12, 26,
     "Transition out of the cast into protective footwear under supervision.",
     "foot temperature settled, X-rays showing consolidation, tolerating protected weight-bearing",
     "Progress weight-bearing ONLY on your specialist's say-so, in the prescribed device. Check the skin every single day — a red mark or warm spot means stop and be reviewed."],
    ["Rebuilding activity in protective footwear", 26, 39,
     "Rebuild strength, balance and walking tolerance safely.",
     "walking comfortably in bespoke footwear with no skin breakdown or new swelling",
     "Bespoke footwear/orthoses are permanent, not optional. Any new warmth, swelling or redness = stop and be seen; recurrence is common."],
    ["Long-term protection & prevention", 39, 52,
     "Protect the foot for life and keep the rest of you fit.",
     "stable foot, sustained activity without skin breakdown, daily checks routine",
     "Lifelong: daily skin checks, protective footwear, podiatry review, and tight glucose control. Protect the OTHER foot too — it's at the same risk. Avoid high-impact activity permanently."]
  ] });
EPONYM_TENDON.forEach(([label, r, part, act, slow, extra]) =>
  add({ r, label, ...A.tendinopathy({ label, r, part, act, slow: !!slow, extra }) }));

const EPONYM_NERVE = [
  ["Cyclist's ulnar (handlebar) palsy", "cyclist'?s ulnar|handlebar palsy|handlebar", "hand", "pressure on the handlebars", "Padded gloves, bar tape and changing hand position regularly usually fix it; a proper bike fit is the durable answer."],
  ["Wartenberg syndrome", "wartenberg", "back of the thumb/hand", "tight watch straps, cuffs or handcuffs", "Superficial radial nerve compression — loosen whatever is compressing the wrist (watch, strap, cuff)."],
  ["Anterior interosseous nerve syndrome", "anterior interosseous", "forearm", "repetitive forearm work", "Causes weakness making an 'OK' sign rather than numbness — many are inflammatory (neuralgic amyotrophy) and recover slowly over 12–18 months."],
  ["Quadrilateral space syndrome", "quadrilateral space", "shoulder", "overhead and throwing", "Axillary nerve compression — causes outer-shoulder numbness and deltoid/teres minor wasting."],
  ["Pectoralis minor syndrome", "pectoralis minor syndrome", "arm", "sustained overhead and rounded-shoulder postures", "A sub-type of thoracic outlet — pec minor length and scapular position are the targets."],
  ["Bowler's thumb", "bowler'?s thumb", "thumb", "gripping the bowling ball", "Digital nerve compression from the ball's thumb hole — re-drill or pad the hole."],
  ["Notalgia / cheiralgia", "notalgia|cheiralgia", "nerve", "sustained pressure", ""]
];
EPONYM_NERVE.forEach(([label, r, part, act, extra]) => add({ r, label, ...A.nerve({ label, r, part, act, extra }) }));

/* Post-op / graft & procedure families */
const POSTOP = [
  ["Latarjet procedure recovery", "latarjet|coracoid transfer|bristow", "shoulder", 26,
   "A bone-block stabilisation — the graft must heal to bone before loading. Follow your surgeon's sling and range limits; return to contact sport is usually ~6 months."],
  ["Patellar tendon (BPTB) graft recovery", "patellar tendon graft|\\bbptb\\b|bone-?patellar", "knee", 39,
   "A BPTB graft means anterior knee pain and kneeling discomfort are common early — the graft itself is strong, but expect the donor site to grumble. Quad recovery is slower than with a hamstring graft."],
  ["Hamstring graft ACL recovery", "hamstring (auto)?graft.*\\bacl\\b|\\bacl\\b.*hamstring (auto)?graft|hamstring (auto)?graft.*cruciate", "knee", 39,
   "With a hamstring graft, hamstring strength lags for months — deep-knee-flexion hamstring strength especially. Don't rush eccentric hamstring loading in the first 12 weeks."],
  ["Quadriceps tendon graft recovery", "quadriceps (tendon )?(auto)?graft", "knee", 39, ""],
  ["Tendon transfer recovery", "tendon transfer", "limb", 26,
   "A transferred tendon has to be re-learned as well as healed — protect it early, then retrain the new movement pattern deliberately."],
  // NB: no bare "fusion recovery" here — that suffix matches ANY fusion and was
  // stealing lumbar fusions from the spinal plan (which carries the no-BLT rule).
  ["Joint fusion (arthrodesis) recovery", "arthrodesis|joint fusion", "joint", 26,
   "The fused joint will not move again — rehab targets the joints around it and adapting technique. Protect the fusion until union is confirmed."],
  ["Osteotomy recovery", "osteotomy", "limb", 39,
   "The bone has been deliberately cut and realigned — weight-bearing limits are strict until union (often 6–12 weeks). Follow the surgeon's protocol precisely."],
  ["Spinal fusion recovery", "spinal fusion|lumbar fusion|cervical fusion|\\balif\\b|\\btlif\\b|\\bacdf\\b", "spine", 39,
   "No bending, lifting or twisting ('BLT') for the period your surgeon specifies — usually ~6–12 weeks while the fusion consolidates. Walking is the main early exercise."],
  ["Joint replacement (other joints)", "shoulder (replacement|arthroplasty)|ankle (replacement|arthroplasty)|elbow (replacement|arthroplasty)|reverse (total )?shoulder", "joint", 26,
   "Follow the surgeon's range and loading limits — reverse shoulder replacements in particular have specific early restrictions and a permanent lifting limit."]
];
POSTOP.forEach(([label, r, part, total, extra]) => {
  const b = retime(A.stiffness({ label, r, part, extra }), total);
  b.freq = "Short frequent sessions early, then progressive strengthening";
  b.note = `${label}: your surgeon's protocol always takes precedence over anything here. ${extra} Early protection then graded loading is the pattern — pushing too early risks the repair, doing too little costs range and strength.`;
  b.variants = PACE;
  add({ r, label, ...b });
});

/* ---------------- newly added procedures & conditions ---------------- */

/* UCL reconstruction — the throwing athlete's operation */
add({ r:"tommy john|\\bucl\\b reconstruction|ulnar collateral ligament reconstruction|elbow \\bucl\\b (reconstruction|repair)|ucl (repair|internal brace)", label:"UCL reconstruction (Tommy John)", total:52,
  freq:"Daily home work; the interval throwing programme is the backbone from ~4 months",
  note:"A tendon graft replaces the torn ulnar collateral ligament on the inner elbow. The graft has to ligamentise over months, and the thing that actually returns you to sport is the INTERVAL THROWING PROGRAMME — a structured, measured build of distance then intensity. Rushing it is the classic cause of failure. Return to competitive pitching is typically 12–18 months.",
  variants:[
    { k:"standard", label:"Standard reconstruction", sub:"Graft reconstruction (Jobe/docking)", scale:1 },
    { k:"brace", label:"UCL repair + internal brace", sub:"Repair augmented with tape — younger, acute tears", pick:"internal brace|repair", scale:0.65,
      note:"An internal-brace repair suits a young athlete with a good-quality acute avulsion — return is roughly 6–9 months rather than 12–18, but only if the tissue quality justified the repair." },
    { k:"revision", label:"Revision", sub:"Repeat reconstruction", pick:"revision", scale:1.3,
      note:"Revision UCL surgery has markedly lower return-to-same-level rates — the throwing programme must be even more conservative." },
    { k:"nonthrower", label:"Non-throwing athlete", sub:"Elbow stability for daily life/other sport", pick:"non-throw", scale:0.7,
      note:"Without throwing demands the timeline is much shorter — the long tail exists only to rebuild throwing." },
    ...XCUT ],
  ph:[
    ["Protect the graft & early motion",0,6,"Protect the reconstruction while preventing elbow stiffness.","full elbow extension regained, pain settling, brace progressing per protocol","Brace as directed. The elbow stiffens faster than almost any joint, so getting extension back early matters — but NO valgus (inward) stress on the elbow and no throwing of any kind."],
    ["Range, shoulder & scapular base",6,16,"Full elbow motion, and build the shoulder/scapular base throwing depends on.","full pain-free elbow range, good shoulder and scapular strength, no medial elbow pain","Still no throwing. Most throwing problems start at the shoulder, hips and trunk — this is the window to fix them."],
    ["Strength, kinetic chain & pre-throwing",16,24,"Build whole-body strength and start plyometric/pre-throwing drills.","full strength, pain-free plyometric drills, clean mechanics on assessment","No throwing until your surgeon clears it — usually ~4 months. Pain on the inner elbow at any point means stop and be reviewed."],
    ["Interval throwing & return to competition",24,52,"Progress the interval throwing programme to full competitive pitching.","completing the interval throwing programme pain-free at each stage, then mound work, then velocity","Follow the interval programme exactly — build DISTANCE first, then intensity, never both at once. Return to competitive pitching is typically 12–18 months; pitch counts and rest days protect the graft afterwards."]] });

/* Broström — ankle lateral ligament reconstruction */
add({ r:"brostr|lateral ankle ligament (reconstruction|repair)|ankle ligament (reconstruction|repair)|\\batfl\\b (repair|reconstruction)", label:"Ankle lateral ligament reconstruction (Broström)", total:26,
  freq:"Short frequent sessions early, then balance work daily",
  note:"The stretched lateral ankle ligaments are tightened and repaired, usually reinforced with local tissue. The repair is protected in a boot while it heals, and then BALANCE and peroneal strength are what stop it stretching out again — this operation fails when the rehab stops at 'pain-free'.",
  variants:[
    { k:"standard", label:"Standard Broström", sub:"Repair with local reinforcement", scale:1 },
    { k:"augmented", label:"Augmented / internal brace", sub:"Repair reinforced with tape or graft", pick:"internal brace|augment|graft", scale:0.85,
      note:"An augmented repair is more robust early and often allows faster weight-bearing — but the balance work is identical and just as essential." },
    { k:"revision", label:"Revision / hyperlax", sub:"Failed repair, or very lax tissue", pick:"revision|hyperlax|hypermobil", scale:1.3,
      note:"Poor-quality tissue or a failed repair usually needs a graft reconstruction and a longer protected phase." },
    ...XCUT ],
  ph:[
    ["Protect the repair",0,6,"Protect the repair in a boot and control swelling.","wound healed, swelling settling, weight-bearing progressing per your surgeon","Boot/cast and weight-bearing exactly as directed. NO inversion (rolling the foot inwards) — that is the movement the repair was made to resist."],
    ["Out of the boot: range & gait",6,10,"Restore range and normal walking.","full weight-bearing out of the boot, walking without a limp, range returning","Regain dorsiflexion and plantarflexion first; inversion range is deliberately regained LAST and never forced."],
    ["Peroneal strength & balance",10,16,"Build peroneal strength and single-leg balance — the real protection.","good single-leg balance including eyes closed, strong resisted eversion, comfortable calf raises","Balance training is the part that prevents recurrence. Don't stop when it stops hurting."],
    ["Return to sport",16,26,"Restore hopping, cutting and sport-specific agility.","confident hopping and cutting, balance and strength symmetrical","Return to cutting sport around 4–6 months. Consider a brace or taping for high-risk sport for the first season, and keep the balance work going."]] });

/* Trapeziectomy — thumb base arthritis surgery */
add({ r:"trapeziectomy|thumb \\bcmc\\b arthroplasty|basal thumb (surgery|arthroplasty)|thumb base (surgery|arthroplasty)", label:"Trapeziectomy (thumb base surgery)", total:26,
  freq:"Little and often — short hand sessions several times daily",
  note:"The arthritic trapezium bone at the base of the thumb is removed (sometimes with a tendon interposition). Pain relief is usually very good, but grip and pinch strength take a long time to return — often 6–12 months — and can lag even when pain has gone. Scar and thumb stiffness are the things rehab prevents.",
  variants:[
    { k:"standard", label:"Trapeziectomy", sub:"Bone removed, with or without interposition", scale:1 },
    { k:"lrti", label:"With ligament reconstruction (LRTI)", sub:"A tendon is used to fill and stabilise the gap", pick:"lrti|ligament reconstruction|interposition", scale:1.15,
      note:"With an LRTI the borrowed tendon needs protecting, so splinting is longer and pinch loading is delayed further." },
    { k:"implant", label:"Joint replacement / implant", sub:"An implant instead of removal", pick:"implant|replacement|arthroplasty", scale:0.85,
      note:"Implant options often restore strength faster, but carry a risk of loosening — follow your surgeon's loading limits." },
    { k:"fusion", label:"Thumb CMC fusion", sub:"The joint is fused instead", pick:"fusion|arthrodesis", scale:1.2,
      note:"A fusion trades movement for strength and durability — the thumb will not move at that joint again, and loading waits for bony union." },
    ...XCUT ],
  ph:[
    ["Splint & protect",0,4,"Protect the reconstruction and keep the other joints moving.","wound healed, splint tolerated, fingers and shoulder moving fully","Splint/cast exactly as directed. NO pinching or gripping. Move your fingers, elbow and shoulder daily — stiffness there is an avoidable complication."],
    ["Out of the splint: motion & scar",4,8,"Restore thumb motion and settle the scar.","thumb able to reach the base of the little finger, scar softening, swelling controlled","Gentle motion only — still no strong pinch. Scar and pillar tenderness at the thumb base is normal and can last months."],
    ["Progressive strengthening",8,16,"Rebuild pinch and grip.","pinch and grip improving, using the hand for daily tasks","Build pinch loading very gradually; it's the last thing to return and pushing early causes pain rather than progress."],
    ["Return to full function",16,26,"Restore strength for your work and hobbies.","grip and pinch approaching the other side, comfortable with your usual tasks","Grip and pinch commonly take 6–12 months to plateau. Pain relief usually arrives long before strength does — that's expected, not a failure."]] });

/* Proximal hamstring repair */
add({ r:"proximal hamstring (repair|reattach|reconstruction)|hamstring avulsion repair|hamstring reattachment|ischial (avulsion|tuberosity) repair", label:"Proximal hamstring repair", total:39,
  freq:"Daily; brace and loading strictly per your surgeon",
  note:"The hamstring tendons are reattached to the sitting bone (ischial tuberosity) with anchors. The whole early plan exists to stop the repair pulling off: any position that stretches the hamstring — hip bent with the knee straight — is the danger, and that includes ordinary things like sitting on a low seat or bending to pick something up.",
  variants:[
    { k:"acute", label:"Acute repair", sub:"Repaired soon after the injury", scale:1 },
    { k:"chronic", label:"Chronic / delayed repair", sub:"Repaired months after the tear", pick:"chronic|delayed|retract", scale:1.25,
      note:"A retracted, chronic tear often needs the tendon mobilised or grafted, and the sciatic nerve freed — the protected phase is longer and nerve symptoms are more common." },
    { k:"partial", label:"Partial / endoscopic repair", sub:"A partial tear or keyhole repair", pick:"partial|endoscop", scale:0.8 },
    ...XCUT ],
  ph:[
    ["Protect the repair",0,6,"Protect the reattachment; avoid any hamstring stretch.","wound healed, following brace and weight-bearing limits, no stretch felt at the sitting bone","Brace and weight-bearing exactly as directed. NO hip flexion with the knee straight — that stretches the repair off the bone. Avoid low seats, bending forward, and long sitting. Do not stretch the hamstring at all."],
    ["Wean the brace & restore range",6,12,"Come out of the brace and restore range gradually.","walking without aids or a limp, hip and knee range returning without a pulling sensation at the sitting bone","Range comes back gradually and never by forcing. Still no loaded hamstring lengthening."],
    ["Progressive strengthening",12,24,"Rebuild hamstring strength from short to long lengths.","good hamstring strength through mid-range, no pain at the sitting bone with loading","Load short-range first, then lengthen. Eccentric and long-length work comes LAST and only once pain-free."],
    ["Return to running & sport",24,39,"Restore speed and sport-specific loading.","pain-free sprinting, hamstring strength near-symmetrical, confident at speed","Return to sport is typically 6–9 months. Sitting tolerance can stay uncomfortable for a long time; persistent nerve symptoms down the leg should be reviewed."]] });

/* Nerve graft / transfer */
add({ r:"nerve (graft|transfer|repair)|neurorrhaphy|brachial plexus (reconstruction|repair|surgery)", label:"Nerve graft / transfer", total:52,
  freq:"Daily — short, frequent, motor-relearning sessions",
  note:"A repaired or re-routed nerve regrows at roughly 1 mm a day — about an inch a month — so recovery is measured in months to years, not weeks, and the muscle has to survive long enough to be re-innervated. With a nerve TRANSFER you also have to re-learn the movement, because a nerve that used to do one job is now doing another.",
  variants:[
    { k:"repair", label:"Direct repair", sub:"Nerve ends stitched together", pick:"repair|neurorrhaphy", scale:0.85 },
    { k:"graft", label:"Nerve graft", sub:"A gap bridged with donor nerve", pick:"graft", scale:1 },
    { k:"transfer", label:"Nerve transfer", sub:"A working nerve re-routed to the dead one", pick:"transfer", scale:1.05,
      note:"After a transfer the brain must relearn the movement: you initially trigger the new muscle by doing the DONOR nerve's old action, then gradually uncouple it. That motor re-education is the whole rehab." },
    { k:"plexus", label:"Brachial plexus reconstruction", sub:"Major plexus surgery", pick:"plexus", scale:1.3,
      note:"Plexus reconstruction is the longest of these — meaningful recovery takes 1–3 years, and preventing contracture and shoulder pain in the meantime is essential." },
    ...XCUT ],
  ph:[
    ["Protect the repair",0,6,"Protect the nerve repair while keeping joints mobile.","wound healed, following any positioning restrictions, full passive joint range maintained","Follow the positioning limits exactly — tension on a fresh nerve repair pulls it apart. Move every joint passively DAILY: a contracture will waste the recovery even if the nerve regrows."],
    ["Maintain the target: range & skin care",6,16,"Keep the joints supple and the skin safe while the nerve grows.","full passive range maintained, no contracture, no skin damage in the numb area","The area is numb — check the skin daily for burns, pressure and cuts, because you will not feel them. Splint as directed to hold a functional position."],
    ["Re-innervation & motor re-education",16,36,"Retrain the muscle as the nerve reaches it — this is the active phase.","a flicker of voluntary contraction appearing, then progressing to movement against gravity","Recovery follows the nerve's growth, not your effort — but the relearning does depend on you. For a transfer, start by using the donor's old action, then wean off it."],
    ["Strength & function",36,52,"Build strength and put the movement back into real tasks.","functional strength returning, using the limb in daily tasks","Recovery keeps improving for 1–2 years or more. If no contraction appears in the expected window, get reviewed — a tendon transfer may be the better option."]] });

/* Limb lengthening / external fixation */
add({ r:"limb lengthening|external fixation|ilizarov|bone transport|circular frame|hexapod", label:"Limb lengthening / external fixation", total:52,
  freq:"Daily — range work several times a day is non-negotiable",
  note:"Bone is cut and then slowly pulled apart (about 1 mm a day) so new bone forms in the gap — distraction, then a much longer consolidation phase while that new bone hardens. The muscles and nerves are being stretched the whole time, so JOINT CONTRACTURE is the main thing that ruins the result, and pin-site infection is the main complication.",
  variants:[
    { k:"lengthening", label:"Limb lengthening", sub:"Bone lengthened over a frame or nail", scale:1 },
    { k:"internal", label:"Internal lengthening nail", sub:"A magnetic nail instead of a frame", pick:"nail|internal|precice", scale:0.85,
      note:"An internal nail avoids pin sites and is far more comfortable, but the bone biology is identical — consolidation still takes roughly twice as long as the lengthening did." },
    { k:"deformity", label:"Deformity correction", sub:"Angulation corrected rather than lengthened", pick:"deformity|correction|hexapod", scale:0.9 },
    { k:"transport", label:"Bone transport (defect/infection)", sub:"A segment moved to fill a gap", pick:"transport|defect|infect|non-?union", scale:1.4,
      note:"Bone transport for a defect or infection is the longest and most demanding of these — frame time is often a year or more." },
    ...XCUT ],
  ph:[
    ["Latency & starting distraction",0,4,"Let the cut settle, start the lengthening, and protect range from day one.","distraction started as scheduled, pin sites clean, joint range maintained","Pin-site care exactly as taught — infection is the commonest complication. Start range work NOW: the muscles are about to be stretched daily and they will contract if you let them."],
    ["Distraction phase",4,16,"Lengthen at the prescribed rate while fighting to keep range.","lengthening on schedule, full joint range preserved, walking with your allowed weight-bearing","This is the hard part. Range work several times daily is non-negotiable — an equinus (tight calf) or knee contracture developing here can undo the whole operation. Report new numbness or severe pain: the nerves are being stretched too."],
    ["Consolidation",16,36,"Let the new bone harden while rebuilding strength.","X-rays showing the new bone consolidating, frame removed when your surgeon confirms it","Consolidation takes roughly twice as long as the lengthening did — this is the phase people underestimate. Weight-bearing progresses only on your surgeon's say-so."],
    ["Rebuild & return to activity",36,52,"Rebuild strength and normal function once the bone is solid.","full weight-bearing without the frame, strength and gait normalising","The new bone keeps maturing for months after the frame comes off — build impact slowly and expect refracture risk to be real early on."]] });

/* Acute compartment syndrome — post-fasciotomy rehab (the acute event is an emergency) */
add({ r:"acute compartment syndrome|fasciotomy|post-?fasciotomy", label:"Acute compartment syndrome (post-fasciotomy)", total:26,
  freq:"Daily; range work from the start, strength once wounds are closed",
  note:"⛔ Acute compartment syndrome itself is a SURGICAL EMERGENCY, not a rehab problem: pain far out of proportion to the injury, pain on passive stretch of the muscles, and a tight swollen limb mean you need emergency assessment IMMEDIATELY — muscle dies within hours. This plan is for recovery AFTER the fasciotomy that released it. How much function returns depends mostly on how quickly it was released.",
  variants:[
    { k:"standard", label:"Released early, good recovery", sub:"Decompressed promptly", scale:1 },
    { k:"delayed", label:"Delayed release / muscle damage", sub:"Some muscle was lost", pick:"delayed|late|contracture|volkmann", scale:1.6,
      note:"When release was delayed, dead muscle scars and shortens (a Volkmann-type contracture) and nerves may not fully recover — the plan becomes contracture prevention, splinting and adapting, and tendon transfers are sometimes needed later." },
    { k:"graft", label:"With skin grafting", sub:"Wounds closed with a graft", pick:"graft|skin", scale:1.2,
      note:"Grafted fasciotomy wounds need the graft protected and then scar managed for months — the scar contracts and can limit the joint by itself." },
    ...XCUT ],
  ph:[
    ["Wound care & protect range",0,4,"Protect the open/closing wounds while preserving joint range.","wounds closing or grafted and healing, full passive range maintained, no new nerve symptoms","Wound care leads here. Move every joint through range daily even while wounds are open — this is when contracture sets in. Splint in a functional position; report new numbness, weakness or worsening pain urgently."],
    ["Range, scar & early activation",4,10,"Restore range as wounds heal and start gentle activation.","wounds healed, scar softening, active movement returning in the surviving muscle","Scar over a fasciotomy is broad and adherent — massage and sustained stretch once healed. Numb areas need daily skin checks."],
    ["Progressive strengthening",10,18,"Rebuild what the muscle can do and work around what it can't.","strength improving in the surviving muscle, walking/using the limb functionally","Progress by function. Some muscle may not recover — an orthosis or a later tendon transfer can substitute, and that's a normal part of this recovery."],
    ["Return to activity & adaptation",18,26,"Restore function, adapting to any permanent deficit.","independent with your daily activities, a realistic long-term plan agreed","Outcome tracks how fast it was released. Persistent foot drop or a fixed contracture warrants a surgical opinion — braces and tendon transfers restore a lot of function."]] });

/* Exertional rhabdomyolysis */
add({ r:"rhabdomyolys|exertional rhabdo", label:"Exertional rhabdomyolysis", total:16,
  freq:"Nothing until cleared; then a slow, supervised graded return",
  note:"⛔ Rhabdomyolysis is a MEDICAL EMERGENCY when active: severe muscle pain and swelling with dark, cola-coloured urine after intense exercise means go to an emergency department NOW — muscle breakdown products can cause kidney failure. This plan is the graded return AFTER you have been assessed, treated and cleared. Returning too fast is the classic cause of a second episode.",
  variants:[
    { k:"standard", label:"Single episode, recovered", sub:"Cleared to return", scale:1 },
    { k:"severe", label:"Severe (kidney involvement)", sub:"Needed hospital treatment for the kidneys", pick:"severe|renal|kidney|dialysis|\\baki\\b", scale:1.6,
      note:"With kidney involvement, return is slower and must be supervised medically — bloodwork guides progression, not how you feel." },
    { k:"recurrent", label:"Recurrent episodes", sub:"More than once", pick:"recurrent|repeat|second", scale:1.8,
      note:"Recurrent rhabdomyolysis needs investigation for an underlying cause — a metabolic or muscle disorder, sickle-cell trait, or a drug/supplement contribution. Do not simply retrain harder." },
    { k:"sickle", label:"Sickle-cell trait", sub:"Known sickle-cell trait", pick:"sickle", scale:1.5,
      note:"With sickle-cell trait, exertional collapse and rhabdomyolysis risk is genuinely higher: avoid all-out efforts when unacclimatised, dehydrated, at altitude or unwell, and build heat acclimatisation deliberately." },
    ...XCUT ],
  ph:[
    ["Medical recovery — no training",0,2,"Recover medically. This phase is not a training phase.","cleared by your doctor, blood markers (CK) returning toward normal, urine normal colour","DO NOT train. Rest and hydration; return only when your doctor says the bloodwork allows. Dark urine, severe muscle pain or reduced urine output = emergency department."],
    ["Light aerobic reintroduction",2,6,"Reintroduce light activity well below your previous level.","tolerating light activity with normal next-day soreness and normal urine colour","Start MUCH lighter than feels necessary — walking and easy cycling. Avoid heat, dehydration and any all-out effort. Any dark urine or unusual muscle pain: stop and be reviewed."],
    ["Graded strength & load",6,12,"Rebuild strength gradually, watching how you recover.","tolerating progressive resistance work with normal recovery, no dark urine","Avoid high-volume eccentric work (the classic trigger), avoid training when unwell or sleep-deprived, and be cautious with supplements and stimulants."],
    ["Return to full training",12,16,"Return to full training with the risk factors managed.","back to full training with normal recovery, hydration and heat plan in place","Rebuild heat acclimatisation deliberately. Most single episodes return fully; recurrence means stop and investigate rather than push."]] });

/* ---------------- generic archetype catch-alls ----------------
   Marked generic:true, so ANY specific plan above (or a curated plan in app.js)
   outranks them in detectPlan. These give the long tail of named diagnoses a
   realistic, archetype-appropriate timeline instead of the flat template. */
/* ===================== CARDIAC ===================== */
/* ═══════════════════ CARDIAC & VASCULAR REHAB TIMELINES ═══════════════════
   Paste into scripts/generate-plans.mjs BEFORE the final G(...) catch-alls.
   `A`, `add`, `PACE`, `retime`, `XCUT` are already in scope.

   Every cardiac condition previously fell back to ONE generic 26-week domain
   template. These give the genuinely different pathways their real clocks:
   sternotomy is bone healing (~8wk precautions), transcatheter is a groin
   puncture (days), myocarditis is an exercise BAN (3–6 months), PAD walks INTO
   pain, ARVC is the one condition where training itself drives the disease.

   NOTE ON VARIANTS: app.js `planVariants()` appends XCUT_VARIANTS at runtime,
   deduped by key `k` — so bespoke arrays must NOT re-spread ...XCUT. Where an
   XCUT default would be clinically WRONG or unsafe here (its `athlete` variant
   auto-fires from state.returnSports and would tell an ARVC patient to chase
   return-to-sport), we deliberately re-declare that same `k` to override it.

   Education only — all cardiac rehab is clearance-gated. Not a medical device. */

/* ---------- shared cardiac fragments ---------- */
const CARDIAC_STOP =
  "⛔ STOP and get urgent help for: chest pain or pressure that doesn't ease with rest, sudden or unusual breathlessness, fainting or near-fainting, palpitations that don't settle, or a cold sweat.";
const RPE_RULE =
  "Work at RPE 11–13 (\"light\" to \"somewhat hard\") — you should be able to talk in full sentences throughout. On a beta-blocker your heart rate is blunted and target-HR maths is meaningless: go by how hard it feels.";
const VALSALVA =
  "Breathe out on the effort. No breath-holding or straining (Valsalva) — it spikes blood pressure sharply.";

/* ── 1. Acute coronary syndrome: post-MI / post-PCI / post-stent ───────────── */
A.cardiacACS = (s) => ({
  total: 26,
  freq: "2–3 supervised cardiac-rehab sessions/week + walking on most other days",
  note: `${s.note} Exercise-based cardiac rehab after ${s.ev} lowers cardiovascular death and re-admission — it is one of the most effective treatments in medicine, and it works through steady, unglamorous aerobic conditioning rather than hard efforts. Starting matters far more than starting hard. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Uncomplicated, normal pumping function", scale: 1 },
    { k: "stemi", label: "STEMI (larger heart attack)", sub: "Full-thickness — more muscle affected", pick: "\\bstemi\\b|st-elevation", scale: 1.1,
      note: "A STEMI blocks the artery completely, so more muscle is lost and the scar takes ~6 weeks to mature. Progression is a little slower, and the pumping function is worth rechecking before you push intensity." },
    { k: "nstemi", label: "NSTEMI", sub: "Partial-thickness heart attack", pick: "\\bnstemi\\b", scale: 0.9,
      note: "An NSTEMI usually damages less muscle, so conditioning returns faster — but the underlying artery disease is the same and the risk-factor work matters just as much." },
    { k: "pci", label: "Treated with a stent (PCI)", sub: "Artery opened and stented", pick: "angioplasty|\\bpci\\b|stent", scale: 0.85,
      note: "With the artery reopened promptly, less muscle is lost and you recondition faster. The stent itself puts NO limit on exercise — but do not stop your antiplatelet tablets early, because that is what clots a fresh stent." },
    { k: "multivessel", label: "Multi-vessel disease", sub: "More than one artery involved", pick: "multi-vessel", scale: 1.15,
      note: "With several arteries involved there may be untreated disease left behind, so angina can appear as you get fitter. That is information, not failure — report it rather than training through it." },
    { k: "single", label: "Single-vessel disease", sub: "One artery involved", pick: "single-vessel", scale: 0.9 },
    { k: "lowef", label: "With reduced pumping function", sub: "Ejection fraction down after the event", pick: "reduced ejection|low ejection|\\bhfref\\b", scale: 1.35,
      note: "When the ejection fraction has dropped, this becomes a heart-failure plan as well: start lower, build in short bouts, weigh yourself daily, and report a gain over ~2 kg in 2–3 days or new ankle swelling." }
  ],
  ph: [
    ["Early mobilisation & access-site care", 0, 2,
      "Get moving safely at home and learn exactly which symptoms mean stop.",
      "walking 10–15 minutes on the flat comfortably, no chest pain or unusual breathlessness, access site clean and settled, clear on your GTN plan",
      `Light activity only — walking, no lifting over ~5 kg, nothing strenuous until your team clears you. ${s.access} ${CARDIAC_STOP}`],
    ["Start cardiac rehab & build an aerobic base", 2, 6,
      "Enrol in supervised cardiac rehab and build a steady aerobic base.",
      "attending cardiac rehab, 20–30 minutes of continuous moderate walking, confident using your GTN spray",
      `${RPE_RULE} Warm up and cool down properly — abrupt starts and stops are when rhythm problems happen. Keep taking your antiplatelets: stopping them early after a stent risks clotting it.`],
    ["Aerobic capacity & resistance training", 6, 12,
      "Raise aerobic capacity and add resistance work — both matter, not just the walking.",
      "30–40 minutes of continuous moderate exercise, resistance work twice a week without symptoms, risk factors actively being treated",
      `Add resistance training now: light loads, 10–15 reps, two sets. ${VALSALVA} Report any new chest tightness on exertion rather than pushing through it.`],
    ["Lifelong maintenance & risk-factor control", 12, 26,
      "Make it permanent, and control what caused it in the first place.",
      "sustaining ≥150 min/week of moderate activity, blood pressure / cholesterol / HbA1c at target, not smoking",
      "The benefit only lasts while you keep going — it fades within months of stopping. Stopping smoking, your statin and blood-pressure control do at least as much as the exercise does; the exercise makes you able to live with all of it."]
  ]
});
const ACS = [
  ["Post-myocardial infarction (heart attack) recovery", "post-?myocardial infarction|myocardial infarction|heart attack", 26,
    "a heart attack",
    "A heart attack kills a patch of heart muscle, which becomes scar over roughly six weeks while the rest of the heart adapts around it.",
    "If the artery was reached through your GROIN, avoid heavy lifting and straining for about a week and report sudden groin swelling, a lump or bleeding urgently; through the WRIST, avoid heavy gripping for a few days."],
  ["Post-STEMI recovery", "\\bstemi\\b", 26,
    "a STEMI",
    "A STEMI is a completely blocked coronary artery — the muscle it fed dies and scars over about six weeks.",
    "If the artery was reached through your GROIN, avoid heavy lifting and straining for about a week and report sudden groin swelling, a lump or bleeding urgently; through the WRIST, avoid heavy gripping for a few days."],
  ["Post-NSTEMI recovery", "\\bnstemi\\b", 24,
    "an NSTEMI",
    "An NSTEMI is a partly blocked coronary artery — less muscle is usually lost than in a STEMI, but the artery disease behind it is the same and needs the same treatment.",
    "If the artery was reached through your GROIN, avoid heavy lifting and straining for about a week; through the WRIST, avoid heavy gripping for a few days."],
  /* NB: leads with "post-angioplasty" (16 chars) so it outranks the curated
     "Cardiac rehabilitation" plan in app.js, which matches "angioplasty" (11).
     Alternation is leftmost-first, so the longest alternative must come first. */
  ["Post-angioplasty (PCI) recovery", "post-angioplasty|angioplasty|\\bpci\\b", 16,
    "angioplasty",
    "Angioplasty reopens a narrowed coronary artery with a balloon and usually a stent. It fixes the plumbing — it does not treat the disease that narrowed the artery, which is what the rest of this plan is for.",
    "This is a puncture-site recovery: avoid heavy lifting (>~5 kg) and straining for about a week. GROIN access — report sudden swelling, a lump or bleeding urgently. WRIST access — avoid heavy gripping for a few days."],
  ["Post-stent recovery", "post-stent|coronary stent", 16,
    "a stent",
    "A stent is a scaffold holding a coronary artery open. The metal is fully covered by your own lining over a few months — which is exactly why the antiplatelet tablets are not optional during that window. The stent itself puts no limit on how hard you can exercise.",
    "This is a puncture-site recovery: avoid heavy lifting (>~5 kg) and straining for about a week. GROIN access — report sudden swelling, a lump or bleeding urgently. WRIST access — avoid heavy gripping for a few days."]
];
ACS.forEach(([label, r, total, ev, note, access]) =>
  add({ r, label, ...retime(A.cardiacACS({ label, r, ev, note, access }), total) }));

/* Diagnostic catheterisation — a groin/wrist puncture, not a cardiac event. */
add({ r: "cardiac[- ]catheteri[sz]ation|post-?cardiac-?cath\\b", label: "Post-cardiac-catheterisation reconditioning", total: 8,
  freq: "Daily walking; back to your normal routine within about a week",
  note: "A diagnostic catheterisation (angiogram) is an X-ray of your coronary arteries taken through a fine tube from the wrist or groin — nothing was fixed and no heart muscle was harmed. Recovery is about the puncture site, and it takes days. The important part is what the angiogram FOUND: that, not this procedure, decides what happens next.",
  variants: [
    { k: "standard", label: "Diagnostic only", sub: "Angiogram, nothing treated", scale: 1 },
    { k: "radial", label: "Wrist (radial) access", sub: "Through the wrist — the usual route", pick: "radial|wrist", scale: 0.8,
      note: "Wrist access has fewer bleeding problems and lets you walk almost immediately. Avoid heavy gripping and lifting with that hand for a few days; some bruising and tenderness is normal." },
    { k: "femoral", label: "Groin (femoral) access", sub: "Through the groin", pick: "femoral|groin", scale: 1.2,
      note: "Groin access needs more care: no heavy lifting or straining for about a week, and report sudden groin swelling, an expanding lump, or bleeding urgently — that can be a false aneurysm and needs same-day review." },
    { k: "pci", label: "Went on to have a stent", sub: "Treated during the same procedure", pick: "stent|\\bpci\\b|angioplasty", scale: 2,
      note: "If a stent was placed during the same procedure, this is no longer a diagnostic recovery — follow the post-stent plan, and do not stop your antiplatelet tablets early." }
  ],
  ph: [
    ["Puncture site & first days", 0, 1,
      "Let the puncture site seal and get straight back to walking.",
      "site clean, dry and settling, walking comfortably around the house",
      "No heavy lifting or straining for about a week (groin) or a few days (wrist). Bruising is normal; a rapidly expanding lump, sudden swelling, or fresh bleeding needs urgent review. Keep the site dry."],
    ["Back to normal activity", 1, 3,
      "Return to your usual daily routine and driving.",
      "back to normal daily activities, site healed, driving again if cleared",
      "Most people are back to normal within a week. Build up walking rather than jumping straight back to heavy work or the gym."],
    ["Reconditioning", 3, 6,
      "Rebuild fitness — and act on what the angiogram showed.",
      "30 minutes of moderate activity most days, a clear plan for any disease that was found",
      "If narrowings were found but not treated, angina can appear as you get fitter — report it. If the arteries were clear, that is genuinely reassuring: chest pain from another cause is still worth chasing."],
    ["Maintenance & risk-factor control", 6, 8,
      "Keep the fitness and treat the risk factors.",
      "≥150 min/week of moderate activity, risk factors being managed",
      "A normal angiogram is not a licence to ignore blood pressure, cholesterol, smoking or diabetes — it is a clean starting line."]
  ] });

/* ── 2. Stable angina & coronary artery disease ────────────────────────────── */
A.cardiacAngina = (s) => ({
  total: 26,
  freq: "Aerobic exercise most days + resistance 2×/week; supervised cardiac rehab if offered",
  note: `${s.note} Exercise trains the heart to do more work for less oxygen, so the same effort stops provoking symptoms — over a few months most people find their threshold moves up substantially. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Predictable, exertion-related symptoms", scale: 1 },
    { k: "micro", label: "Microvascular angina", sub: "Small vessels — arteries look clear", pick: "microvascular|syndrome x", scale: 1.3,
      note: "In microvascular angina the large arteries look normal and the problem is in vessels too small to see — which is real, not imagined, and often dismissed. Symptoms track exercise less predictably and GTN helps less. Steady aerobic training is one of the few things that reliably helps." },
    { k: "vasospastic", label: "Vasospastic (Prinzmetal) angina", sub: "Artery goes into spasm", pick: "vasospastic|prinzmetal|variant angina", scale: 1.2,
      note: "Vasospastic angina is the artery clamping down rather than furring up — so it often strikes AT REST, classically in the early hours, and not on exertion. Cold air, smoking and stimulants trigger the spasm: warm up indoors, cover your face in cold weather, stop smoking absolutely, and take the calcium-channel blocker that prevents it." },
    { k: "severe", label: "Symptoms at low workloads", sub: "Angina comes on easily", pick: "severe|unstable|low threshold", scale: 1.4,
      note: "Angina at low workloads, or that is changing or coming on at rest, is NOT a training problem — get reviewed before progressing. New, worsening or rest angina can be the run-up to a heart attack." }
  ],
  ph: [
    ["Find your angina threshold", 0, 3,
      "Learn the level of effort that brings symptoms on — and stay just under it.",
      "you know what brings your symptoms on and roughly at what effort, GTN to hand and you know how to use it",
      `Exercise BELOW your angina threshold, not into it. Take GTN before an effort you know provokes symptoms — that is what it is for. ${CARDIAC_STOP} Angina that is new, worsening, comes on at rest, or needs more GTN than usual means stop and be reviewed the same day.`],
    ["Build steady aerobic volume", 3, 8,
      "Build volume at a comfortable intensity — volume, not intensity, moves the threshold first.",
      "30 minutes of continuous moderate activity without symptoms, GTN needed less often",
      `${RPE_RULE} A long, thorough warm-up genuinely reduces angina — the \"warm-up phenomenon\" is real, and many people find a second effort easier than the first. ${s.extra}`],
    ["Raise the threshold & add strength", 8, 16,
      "Push the workload that provokes symptoms further out, and add resistance training.",
      "doing more work before symptoms appear, resistance training twice a week, hills or stairs easier",
      `Interval-style work — a harder few minutes, then easier — raises the threshold well and is safe below your symptom level. ${VALSALVA}`],
    ["Lifelong maintenance", 16, 26,
      "Keep the gains and treat the disease underneath.",
      "≥150 min/week sustained, symptoms stable or improved, cholesterol and blood pressure at target",
      "The threshold falls back within weeks of stopping. Symptoms creeping back down to lower workloads means the disease has moved, not that you have got lazy — get reviewed."]
  ]
});
const ANGINA = [
  ["Stable coronary artery disease", "stable coronary artery disease|coronary artery disease|\\bcad\\b",
    "Stable coronary artery disease means fatty plaque has narrowed the coronary arteries but the pattern of symptoms is predictable and unchanged.",
    "Cold weather, a big meal, and emotional stress all lower the threshold — expect worse days and plan around them."],
  ["Stable angina (reconditioning)", "stable angina|angina \\(reconditioning\\)|angina pectoris",
    "Stable angina is chest tightness that appears at a predictable level of effort and eases within minutes of stopping — the muscle is asking for more blood than the narrowed artery can deliver.",
    "Cold weather, a big meal, and emotional stress all lower the threshold — expect worse days and plan around them."],
  ["Cardiac syndrome X (microvascular angina)", "cardiac syndrome x|microvascular angina",
    "Microvascular angina is angina with normal-looking coronary arteries: the problem is in vessels too small to see on an angiogram. It is a real, physical, treatable condition — being told the arteries are \"clear\" does not mean nothing is wrong.",
    "Symptoms may not track effort neatly and can linger after stopping. Progress by weekly trend rather than by how any single session felt."],
  ["Vasospastic (Prinzmetal) angina (reconditioning)", "vasospastic|prinzmetal|variant angina",
    "Vasospastic angina is a coronary artery going into sudden spasm rather than being furred up — which is why it classically strikes at rest and in the early hours rather than on exertion.",
    "Cold is the big trigger: warm up indoors, cover your mouth and nose outdoors in winter, and avoid stimulants. Stopping smoking is not optional here — it provokes the spasm directly."],
  ["Angina (general)", "\\bangina\\b",
    "Angina is chest tightness caused by heart muscle not getting enough blood for the work it is being asked to do.",
    "Cold weather, a big meal, and emotional stress all lower the threshold."]
];
ANGINA.forEach(([label, r, note, extra]) => add({ r, label, ...A.cardiacAngina({ label, r, note, extra }) }));

/* ── 3. Open-heart surgery via median sternotomy — STERNAL PRECAUTIONS ~8wk ──
   Phase bounds are pinned to the BONE's clock (precautions lift at week 8), so
   these rows are never retimed — compressing them would move the precaution. */
const STERNAL_RULE =
  "🦴 STERNAL PRECAUTIONS (about 8 weeks): nothing heavier than ~5 kg (a full kettle), no pushing, pulling or lifting with the arms, no reaching both arms overhead or far behind you, and do NOT push up through your arms to stand — use your legs. Hug a firm pillow against your chest to cough or sneeze: coughing is essential after a general anaesthetic, so support it, never suppress it. Report any click, grinding, movement or new lump in the breastbone the SAME DAY.";
A.cardiacSternotomy = (s) => ({
  total: 26,
  freq: "Walking daily from day one; supervised cardiac rehab 2–3×/week from around week 4–6",
  note: `${s.note} To reach the heart the surgeon splits the breastbone lengthways and wires it back together, so the operation INSIDE your chest is healed long before the bone on the outside is. That bone takes about 6–8 weeks to knit, and everything in the first two months is built around protecting it. The surgery was the fix; rehab is what gives you back your capacity. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard recovery", sub: "Uncomplicated, good pumping function", scale: 1 },
    { k: "offpump", label: "Off-pump surgery", sub: "Done on a beating heart", pick: "off-pump|opcab", scale: 0.95,
      note: "Off-pump avoids the heart-lung machine, so some people feel clearer-headed sooner — but the breastbone was still cut, so the sternal precautions are IDENTICAL and last just as long." },
    { k: "valve", label: "Valve surgery", sub: "A valve repaired or replaced", pick: "valve", scale: 1,
      note: "After valve surgery the fix is immediate but the heart has to remodel around new loading conditions over months. If a mechanical valve was used you are on warfarin for life: bleeding and bruising risk means no contact sport, and INR needs monitoring." },
    { k: "myectomy", label: "Septal myectomy", sub: "Thickened muscle shaved away (HCM)", pick: "myectomy|septal reduction", scale: 1.05,
      note: "Septal myectomy removes the thickened muscle blocking the outflow of a hypertrophic heart, and it relieves the obstruction very effectively — most people can do considerably more afterwards. The underlying HCM and its rhythm risk remain, so intensity limits stay a cardiologist's decision." },
    { k: "pericardiectomy", label: "Pericardiectomy", sub: "The stiff sac around the heart removed", pick: "pericardiectomy", scale: 1.2,
      note: "Pericardiectomy strips off a scarred, rigid sac that was stopping the heart filling. Improvement is often dramatic but can take months to arrive as the squeezed muscle recovers — do not judge the operation at six weeks." },
    { k: "redo", label: "Redo / complex surgery", sub: "A repeat or combined operation", pick: "redo|revision|complex", scale: 1.35,
      note: "Repeat sternotomy is slower and the bone is less reliable second time round — precautions are often extended. Combined procedures (bypass plus valve) mean a longer bypass run and more fatigue for longer." },
    { k: "lowef", label: "With reduced pumping function", sub: "Ejection fraction is down", pick: "reduced ejection|low ejection|\\bhfref\\b", scale: 1.35,
      note: "With a reduced ejection fraction, the heart-failure rules apply on top of the sternal ones: start lower, build in short bouts, weigh daily, and report a gain over ~2 kg in 2–3 days or new swelling." },
    { k: "af", label: "With post-op atrial fibrillation", sub: "Went into AF after the operation", pick: "atrial fibrillation|\\baf\\b", scale: 1.15,
      note: "Post-operative AF affects roughly a third of people after cardiac surgery, usually in the first few days, and it is usually temporary. Your pulse will be irregular and rate-response erratic, so go by RPE rather than heart rate, and expect to be anticoagulated for a while." }
  ],
  ph: [
    ["Hospital & the first fortnight — protect the breastbone", 0, 2,
      "Get home safely, breathe deeply, walk daily — and protect the sternum absolutely.",
      "walking short distances several times a day, breathing exercises done hourly while awake, wounds clean and dry, sleeping reasonably",
      `${STERNAL_RULE} ${s.wound} Do your deep-breathing / spirometry hourly while awake — chest infection and lung collapse are the common early complications, and this prevents both. ${CARDIAC_STOP}`],
    ["Sternal healing — walking IS the workout", 2, 8,
      "Build walking volume steadily while the bone knits. Legs only — the arms wait.",
      "walking 20–30 minutes continuously, wounds healed, off strong painkillers, appetite and sleep returning",
      `Sternal precautions CONTINUE to about 8 weeks — the bone is knitting and it is the wires holding it that fail if you load it early. Legs and walking only: no chest, shoulder or arm loading. No driving until cleared (usually ~4–6 weeks): an emergency stop and a steering-wheel airbag both load the sternum directly. ${s.wound} Feeling low around weeks 2–4 is extremely common and passes — tell someone.`],
    ["Precautions lift — rebuild the upper body from a low base", 8, 14,
      "Once your surgeon confirms the bone is stable, reintroduce upper-body loading gradually.",
      "surgeon has confirmed the sternum is stable, upper-body movement comfortable and full, 30+ minutes of continuous aerobic exercise, resistance work started light",
      "Sternal precautions come off around 8 weeks — but only on your surgeon's say-so, and the chest, shoulders and arms have been unloaded for two months, so start LIGHT and build. Expect the scar to be numb, tight and occasionally to zing; that settles over months. Still no maximal lifting and no breath-holding."],
    ["Full capacity & lifelong maintenance", 14, 26,
      "Restore full capacity and keep the graft or valve working for decades.",
      "back to your usual activities and work, ≥150 min/week sustained, risk factors at target",
      "Bypass grafts and valves last far longer in people who exercise, do not smoke, and take their statin. Full sternal strength takes ~3–6 months; heavy manual work and contact sport need your surgeon's clearance. This is a lifelong habit, not a 6-month course."]
  ]
});
const STERNOTOMY = [
  /* "post-cabg" leads (9 chars) to beat the curated "Cardiac rehabilitation"
     plan's "\bcabg\b" (4) — a tie would go to the curated plan, which comes
     first in allPlans(), and that would silently drop sternal precautions. */
  ["Post-CABG (bypass) recovery", "post-cabg|\\bcabg\\b|coronary artery bypass|aortocoronary bypass",
    "Coronary bypass grafts new vessels around blocked arteries, restoring blood supply to starved heart muscle.",
    "If a vein was harvested from your leg, that wound often hurts and swells more than the chest one — elevate the leg when sitting, and expect ankle swelling for weeks."],
  ["Post-CABG (multi-vessel bypass) recovery", "cabg \\(multi-vessel|multi-vessel bypass",
    "Multi-vessel bypass grafts around several blocked arteries in one operation — a bigger procedure, but the same breastbone and the same 8-week bone clock.",
    "If veins were harvested from your leg, that wound often hurts and swells more than the chest one — elevate the leg when sitting, and expect ankle swelling for weeks."],
  ["Post-coronary-bypass-graft (off-pump) recovery", "coronary-bypass-graft|off-pump|\\bopcab\\b",
    "Off-pump bypass grafts around blocked arteries while the heart keeps beating, avoiding the heart-lung machine.",
    "If a vein was harvested from your leg, that wound often hurts and swells more than the chest one — elevate the leg when sitting."],
  ["Post-open-heart-surgery recovery", "open-heart|open heart",
    "Open-heart surgery reaches the heart through the breastbone, usually with the heart stopped and a heart-lung machine taking over.",
    "Wounds may include a leg or arm site if a graft was harvested — elevate a leg wound when sitting."],
  ["Post-median-sternotomy recovery", "sternotom",
    "A median sternotomy is the incision itself: the breastbone split lengthways and wired back together. Whatever was done inside, the bone sets the rehab clock.",
    "Keep all wounds clean and dry; report redness, discharge, or a wound that opens."],
  ["Post-cardiac-surgery reconditioning", "post-cardiac-surgery|cardiac surgery reconditioning|cardiac surgery",
    "After heart surgery the heart itself is usually fixed on day one — what is left is a healing breastbone, deconditioned muscles and lungs that need re-expanding.",
    "Keep all wounds clean and dry; report redness, discharge, or a wound that opens."],
  ["Post-aortic-valve replacement recovery", "aortic-valve replacement|aortic valve replacement|\\bsavr\\b",
    "Surgical aortic valve replacement swaps a worn valve for a mechanical or tissue one through an opened breastbone. (If yours was done through a catheter in the groin — TAVR — this is the WRONG plan: use the TAVR one, which has no sternal precautions.)",
    "Keep all wounds clean and dry. A mechanical valve ticks audibly and means lifelong warfarin; a tissue valve does not, but wears out sooner."],
  ["Post-mitral-valve repair recovery", "mitral-valve repair|mitral valve repair",
    "Mitral valve repair rebuilds your own valve rather than replacing it — it lasts longer and avoids lifelong warfarin, so it is preferred wherever it is possible.",
    "Keep all wounds clean and dry; report redness, discharge, or a wound that opens."],
  ["Post-mitral-valve replacement recovery", "mitral-valve replacement|mitral valve replacement",
    "Mitral valve replacement swaps the valve for a mechanical or tissue one through an opened breastbone.",
    "Keep all wounds clean and dry. A mechanical valve means lifelong warfarin: bleeding risk, no contact sport, and regular INR checks."],
  ["Post-tricuspid-valve surgery recovery", "tricuspid-valve surgery|tricuspid valve surgery|tricuspid valve repair",
    "Tricuspid valve surgery is usually done alongside another valve operation. The right heart is often already strained beforehand, so fluid and swelling can take longer to settle.",
    "Expect ankle and abdominal swelling to take weeks to settle — weigh daily and report a gain over ~2 kg in 2–3 days."],
  ["Post-septal-myectomy recovery", "septal-myectomy|septal myectomy|septal reduction",
    "Septal myectomy shaves away the thickened muscle obstructing the outflow of a hypertrophic heart. It relieves the obstruction very effectively — but it is open-heart surgery, and the underlying HCM does not go away.",
    "Keep all wounds clean and dry. The HCM remains: intensity ceilings and any competitive-sport question stay your cardiologist's call."],
  ["Post-pericardiectomy recovery", "pericardiectomy",
    "Pericardiectomy strips away a scarred, rigid pericardium that was squeezing the heart and stopping it filling. The benefit is often large, but can take months to appear as the constrained muscle recovers.",
    "Keep all wounds clean and dry. Judge this operation at six months, not six weeks."]
];
STERNOTOMY.forEach(([label, r, note, wound]) => add({ r, label, ...A.cardiacSternotomy({ label, r, note, wound }) }));

/* ── 4. Transcatheter / percutaneous structural procedures — NO sternotomy ─── */
A.cardiacTranscath = (s) => ({
  total: 16,
  freq: "Walking daily from day one; cardiac rehab 2×/week once the access site has settled",
  note: `${s.note} This is done through a catheter — usually up the artery or vein in your groin — so the chest is never opened and the breastbone is never cut. That means NO STERNAL PRECAUTIONS, and recovery measured in days to weeks rather than months; most people go home in 1–2 days. The limiting factor is almost always the deconditioning and frailty that built up while the valve was failing, not the procedure itself. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard (transfemoral)", sub: "Through the groin — the usual route", scale: 1 },
    { k: "frail", label: "Frail / very deconditioned", sub: "Housebound or barely mobile beforehand", pick: "frail|deconditio", scale: 1.5,
      note: "Most people having these procedures waited a long time with a failing valve and lost a great deal of muscle and confidence doing it. That deconditioning — not the valve — is now the thing limiting you, and it is entirely trainable. Expect the gains to keep coming for 6–12 months." },
    { k: "pacemaker", label: "Needed a pacemaker afterwards", sub: "New conduction block after the valve", pick: "pacemaker|conduction|heart block", scale: 1.2,
      note: "A new conduction block needing a pacemaker happens in roughly 1 in 10 after TAVR, mostly within the first week. If you now have a pacemaker, the arm on that side has a ~4–6 week lead-settling restriction: no lifting that elbow above shoulder height and nothing heavy on that side." },
    { k: "surgical", label: "Actually done by OPEN surgery", sub: "Breastbone was cut, not a catheter", pick: "sternotom|open|surgical|\\bsavr\\b", scale: 1.7,
      note: "⚠️ If your valve was done through an OPEN operation — a cut down the breastbone — this is the wrong plan: sternal precautions apply for ~8 weeks and the post-open-heart-surgery plan is the one you want. Check your discharge letter if you are not sure: a scar down the centre of your chest means open surgery." },
    { k: "apical", label: "Non-femoral access route", sub: "Through the chest wall or another artery", pick: "apical|transapical|subclavian|axillary|carotid", scale: 1.4,
      note: "When the groin arteries are unsuitable the valve goes in through the chest wall or another artery — that IS a chest incision, so expect more pain, a longer recovery, and lifting limits on that side. Follow your surgeon's specific restrictions rather than the standard transfemoral ones." }
  ],
  ph: [
    ["Access site & the first week", 0, 1,
      "Let the puncture site seal and start walking immediately.",
      "access site clean, dry and settling, walking around the house and a little outdoors, no dizziness or blackouts",
      `This is a groin-puncture recovery, not a chest recovery: there are NO sternal precautions and no chest-loading restriction. Avoid heavy lifting (>~5 kg) and straining for about a week and keep the site clean and dry; report sudden groin swelling, an expanding lump or bleeding urgently. ${s.watch} ${CARDIAC_STOP}`],
    ["Restore everyday activity", 1, 4,
      "Get back to your normal daily life — and notice how much easier it now is.",
      "back to normal daily activities, walking 20–30 minutes, driving again if cleared",
      "Push the walking: the valve is fixed and the symptoms that stopped you (breathlessness, chest tightness, dizziness on effort) should be gone. If they are NOT, that needs reporting rather than accepting. Most restrictions now come from the access site, and it has healed."],
    ["Build aerobic capacity & strength", 4, 10,
      "Rebuild the capacity and muscle lost during the years the valve was failing.",
      "30+ minutes of continuous moderate exercise, resistance training twice a week, stairs comfortable",
      `${RPE_RULE} Resistance training matters as much as walking here — the muscle loss is usually the real limiter, and unlike after a sternotomy there is nothing stopping you loading your upper body. ${VALSALVA}`],
    ["Maintenance & valve surveillance", 10, 16,
      "Keep the capacity, and keep the valve monitored.",
      "≥150 min/week sustained, back to the activities you had given up, follow-up echo arranged",
      "Tissue and transcatheter valves wear out eventually — keep your surveillance echoes. Report new breathlessness, dizziness or blackouts rather than assuming the valve is fine because it was fixed. Dental hygiene matters: tell any dentist you have a prosthetic valve."]
  ]
});
const TRANSCATH = [
  ["Post-TAVR recovery", "\\btavr\\b|\\btavi\\b|transcatheter aortic valve",
    "TAVR (or TAVI) replaces a narrowed aortic valve with a new one delivered folded up on a catheter and expanded inside the old one.",
    "Watch for a slow pulse, dizziness or blackouts: a new conduction problem needing a pacemaker happens in roughly 1 in 10, mostly in the first week."],
  ["Post-TMVr (transcatheter mitral repair) recovery", "\\btmvr\\b|transcatheter mitral|mitral repair\\) recovery",
    "TMVr repairs a leaking mitral valve through a catheter passed up a vein in the groin, usually by clipping the leaking leaflets together.",
    "This goes in through a VEIN, so the access site is even lower-risk than an artery puncture. Report groin swelling or bleeding."],
  ["Post-mitral-clip recovery", "mitral-clip|mitraclip|mitral clip",
    "A mitral clip pins the leaking leaflets of the mitral valve together through a catheter, reducing the leak without opening the chest.",
    "This goes in through a VEIN in the groin. Report groin swelling or bleeding. Breathlessness should improve within weeks — if it does not, report it."],
  ["Post-LAA-closure (Watchman) reconditioning", "laa-closure|laa closure|watchman|left atrial appendage",
    "A Watchman-type device plugs the left atrial appendage — the small pouch where clots form in atrial fibrillation — so that most people can eventually come off anticoagulation.",
    "This goes in through a VEIN in the groin. You will usually stay on blood thinners for weeks to months until a scan confirms the device has sealed — do not stop them on your own."],
  ["Aortic stenosis (post-intervention)", "aortic stenosis \\(post-intervention\\)|aortic stenosis.{0,6}post-?intervention",
    "Your narrowed aortic valve has been treated — the obstruction that was limiting you is gone, and what remains is rebuilding what you lost while it was there.",
    "⚠️ WHICH procedure matters enormously: through a catheter in the groin (TAVR) there are no sternal precautions and this plan fits. Through an OPEN operation with a cut down the breastbone, sternal precautions apply for ~8 weeks — select \"Actually done by OPEN surgery\" below, or use the post-open-heart-surgery plan."]
];
TRANSCATH.forEach(([label, r, note, watch]) => add({ r, label, ...A.cardiacTranscath({ label, r, note, watch }) }));

/* ── 5. Heart failure — training is a treatment; fluid is the thing that derails it ── */
const HF_WEIGH =
  "⚖️ Weigh yourself DAILY — same time, after the toilet, before breakfast. A gain of more than ~2 kg in 2–3 days, new or worse ankle swelling, waking up breathless, or needing extra pillows means fluid is building: contact your team BEFORE your next session. Do not train through it — that is the single most common way this goes wrong.";
A.cardiacHF = (s) => ({
  total: 30,
  freq: "Start with several SHORT bouts most days; build toward 3–5 sessions/week + resistance 2×/week",
  note: `${s.note} In heart failure, exercise training is a treatment in its own right — it improves symptoms, quality of life and hospital admissions, and it is safe when you are stable. It starts lower and climbs more slowly than you would expect, and short bouts several times a day beat one long effort. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Stable, on established treatment", scale: 1 },
    { k: "hfref", label: "Reduced ejection fraction (HFrEF)", sub: "The pump is weakened", pick: "reduced ejection|\\bhfref\\b|systolic", scale: 1.15,
      note: "In HFrEF the medication does the heavy lifting and it takes months to titrate — exercise adds to it rather than replacing it. Training improves symptoms and admissions but does not change the ejection fraction much, so judge progress by what you can DO, not by the next echo." },
    { k: "hfpef", label: "Preserved ejection fraction (HFpEF)", sub: "The pump squeezes, but the heart is stiff", pick: "preserved ejection|\\bhfpef\\b|diastolic", scale: 0.9,
      note: "In HFpEF the heart squeezes normally but cannot relax and fill — and here exercise training is arguably the single most effective treatment there is, more so than most of the drugs. Much of the limitation is in the muscles and the deconditioning rather than the heart itself. If you carry extra weight, combining weight loss with the training works better than either alone." },
    { k: "nyha1", label: "NYHA class I", sub: "No symptoms with ordinary activity", pick: "nyha class i\\b|nyha i\\b", scale: 0.7,
      note: "NYHA I means ordinary activity does not cause symptoms — you have the most room to train of anyone on this plan, and you should use it. The diagnosis is not the ceiling." },
    { k: "nyha2", label: "NYHA class II", sub: "Slight limitation on ordinary activity", pick: "nyha class ii\\b", scale: 1 },
    { k: "nyha3", label: "NYHA class III (supervised)", sub: "Symptoms with less than ordinary activity", pick: "nyha class iii", scale: 1.45,
      note: "NYHA III means less-than-ordinary activity brings symptoms on — this needs supervised, monitored exercise, and interval-style work (1–2 min on, 2–4 min easy) is usually far better tolerated than continuous effort. Progress in very small steps; a bad week is normal." },
    { k: "device", label: "With an ICD or CRT device", sub: "Implanted defibrillator or resynchroniser", pick: "\\bicd\\b|\\bcrt\\b|defibrillator|resynchron", scale: 1.1,
      note: "With an ICD, ask your team for your therapy threshold and keep your heart rate at least ~20 bpm below it — a shock during exercise is avoidable. After a CRT upgrade many people improve substantially over 3–6 months, so re-test rather than assuming your old limits still apply." },
    { k: "advanced", label: "Advanced / awaiting transplant or LVAD", sub: "Severe, being assessed for advanced therapies", pick: "advanced|end-stage|transplant|\\blvad\\b", scale: 1.6,
      note: "In advanced heart failure the goal shifts to holding on to muscle and independence and staying transplant-eligible — 'prehabilitation' genuinely improves how you do afterwards. Every step here is supervised and agreed with your advanced-HF team." }
  ],
  ph: [
    ["Stabilise & start moving in short bouts", 0, 2,
      "Establish that you are stable, and start moving in small, frequent doses.",
      "weight steady day to day, comfortable breathing at rest, walking 5–10 minutes in short bouts without severe breathlessness",
      `Do NOT train while you are decompensated. ${HF_WEIGH} Short bouts (5–10 minutes) several times a day beat one long walk. ${CARDIAC_STOP}`],
    ["Build tolerance", 2, 8,
      "Build up the length of each bout and the number of days.",
      "20 minutes of activity in a day (in bouts if needed), most days, without excessive breathlessness or next-day exhaustion",
      `${RPE_RULE} Judge it by the NEXT day: being wiped out the following day means the session was too much, even if it felt fine at the time. Fatigue is as much a heart-failure symptom as breathlessness. ${s.extra}`],
    ["Aerobic + resistance training", 8, 16,
      "Add continuous or interval aerobic work and — importantly — resistance training.",
      "20–30 minutes of continuous or interval aerobic exercise, resistance training twice a week, stairs and shopping noticeably easier",
      `Resistance training is safe in stable heart failure and matters a great deal: muscle wasting is a big part of why you feel weak, and it responds to loading. Light-to-moderate loads, 10–15 reps. ${VALSALVA}`],
    ["Long-term maintenance", 16, 30,
      "Make it a permanent habit, and keep the fluid and the medication right.",
      "sustaining ≥150 min/week (in whatever bouts work), daily weights habitual, medication optimised",
      "The gains fade within weeks of stopping — this is maintenance for life, not a course. Keep the daily weights going forever: catching fluid early at home is what keeps you out of hospital. Report a step down in what you can do rather than quietly accepting it."]
  ]
});
const HF = [
  ["Heart failure (reduced ejection fraction, HFrEF)", "heart failure \\(reduced ejection|\\bhfref\\b|reduced ejection fraction",
    "In HFrEF the heart muscle is weakened and cannot pump out enough of the blood it holds.",
    "Getting breathless is expected and is not damaging your heart — but exhaustion lasting into the next day means you overshot."],
  ["Heart failure (preserved ejection fraction, HFpEF)", "heart failure \\(preserved ejection|\\bhfpef\\b|preserved ejection fraction",
    "In HFpEF the heart squeezes normally but has become stiff and cannot relax to fill properly — so pressure backs up into the lungs, especially on effort.",
    "Much of the limitation in HFpEF is deconditioning and muscle, not the heart — which is exactly why training works so well here."],
  ["Heart failure NYHA class I", "heart failure nyha class i\\b|nyha class i\\b",
    "NYHA class I heart failure: the diagnosis is there on the scan, but ordinary activity does not bring on symptoms.",
    "You have real room to train — use it. NYHA I is the best possible starting point and the training is what keeps you there."],
  ["Heart failure NYHA class II", "heart failure nyha class ii\\b|nyha class ii\\b",
    "NYHA class II heart failure: comfortable at rest, but ordinary activity brings some breathlessness or fatigue.",
    "Getting breathless is expected and is not damaging your heart — but exhaustion lasting into the next day means you overshot."],
  ["Heart failure NYHA class III (supervised)", "heart failure nyha class iii|nyha class iii",
    "NYHA class III heart failure: comfortable at rest, but LESS than ordinary activity causes breathlessness or fatigue.",
    "Interval work — 1–2 minutes of effort, then 2–4 minutes easy — is usually far better tolerated than trying to keep going continuously. This should be supervised."],
  ["Chronic stable heart failure (Stage C)", "chronic stable heart failure|stage c\\b",
    "Stage C means structural heart disease with symptoms now or in the past — the established, treatable, long-game version of heart failure.",
    "Getting breathless is expected and is not damaging your heart — but exhaustion lasting into the next day means you overshot."],
  ["Diastolic dysfunction (reconditioning)", "diastolic dysfunction",
    "Diastolic dysfunction is a stiff heart that does not relax and fill easily — the same mechanism as HFpEF, often before it causes full heart failure.",
    "This is the stage where training does the most good: it is far easier to keep capacity than to win it back later."],
  ["Heart failure (general)", "heart failure|cardiac failure|congestive cardiac",
    "Heart failure means the heart cannot meet the body's demands at normal filling pressures — it is a syndrome with many causes, not a single disease, and 'failure' badly overstates it.",
    "Getting breathless is expected and is not damaging your heart — but exhaustion lasting into the next day means you overshot."]
];
HF.forEach(([label, r, note, extra]) => add({ r, label, ...A.cardiacHF({ label, r, note, extra }) }));

/* ── 6. Cardiomyopathies — the TYPE decides everything ─────────────────────── */
A.cardiacMyopathy = (s) => ({
  total: 26,
  freq: "Aerobic most days at moderate intensity + resistance 2×/week — within your cardiologist's limits",
  note: `${s.note} Cardiomyopathy means the heart muscle itself is abnormal, and what that means for exercise depends almost entirely on WHICH type you have: some improve markedly with treatment and training, while others carry a rhythm risk that puts a firm ceiling on intensity. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Stable, cleared for moderate exercise", scale: 1 },
    { k: "lowef", label: "With significantly reduced EF", sub: "Pumping function clearly down", pick: "reduced ejection|low ejection", scale: 1.3,
      note: "With a significantly reduced ejection fraction the heart-failure rules apply: weigh daily, build in short bouts, and report a gain over ~2 kg in 2–3 days or new swelling." },
    { k: "recovered", label: "Function has recovered", sub: "EF back to normal on treatment", pick: "recovered|normali", scale: 0.7,
      note: "If the pumping function has recovered, that is genuinely good news — but it usually recovered BECAUSE of the medication, and stopping it is the commonest way people relapse. Recovery means you can train more, not that you are cured." },
    /* Override XCUT `athlete` (scale 1.15, "return-to-sport"): it auto-fires from
       state.returnSports and would be actively unsafe advice in HCM/ARVC. */
    { k: "athlete", label: "Competitive sport question", sub: "You want to compete, not just exercise", pick: "return-to-sport", scale: 1.3,
      note: "⚠️ Competitive sport with a cardiomyopathy is a cardiologist's decision, not a training decision — it needs a shared discussion about YOUR genotype, scar, rhythm and family history. For ARVC it is contraindicated outright. Do not use this app to self-clear for competition." }
  ],
  ph: [
    ["Establish your limits with your cardiologist", 0, 3,
      "Get clear on what you are cleared for — the ceiling matters more than the starting point here.",
      "you know your agreed intensity ceiling, what to avoid, and your warning symptoms; taking your medication consistently",
      `${s.limit} ${CARDIAC_STOP} Fainting or near-fainting during or straight after exercise is never to be brushed off in a cardiomyopathy — stop and get reviewed before doing any more.`],
    ["Build a steady aerobic base", 3, 9,
      "Build a comfortable aerobic base well inside your agreed ceiling.",
      "30 minutes of continuous moderate activity without symptoms, no palpitations or dizziness on effort",
      `${RPE_RULE} Steady, moderate, boring work is the goal — it is the sudden maximal and burst efforts that provoke rhythm problems, not the steady conditioning. ${s.limit}`],
    ["Add strength & capacity", 9, 16,
      "Add resistance work and raise capacity, staying inside the ceiling.",
      "resistance training twice a week without symptoms, aerobic capacity clearly improved, daily life easier",
      `Light-to-moderate resistance training is appropriate; maximal lifting is not. ${VALSALVA} ${s.limit}`],
    ["Long-term maintenance & surveillance", 16, 26,
      "Keep it lifelong, and keep the surveillance going.",
      "≥150 min/week sustained, follow-up echo/Holter up to date, medication unchanged and taken",
      "Cardiomyopathies are followed for life — keep the echoes, Holters and appointments even when you feel well. Report new palpitations, blackouts, a drop in what you can do, or a first-degree relative with an unexplained death: these conditions run in families and relatives may need screening."]
  ]
});
const CARDIOMYOPATHIES = [
  ["Dilated cardiomyopathy", "dilated cardiomyopathy|cardiomyopathy \\(dilated\\)|\\bdcm\\b",
    "In dilated cardiomyopathy the ventricle has stretched and thinned, so it pumps weakly.",
    "Exercise is safe and helpful here alongside the medication — but it is the medication that does the heavy lifting, and a good proportion of people recover substantial function on it."],
  ["Hypertrophic cardiomyopathy", "hypertrophic cardiomyopathy|cardiomyopathy \\(hypertrophic",
    "In hypertrophic cardiomyopathy the muscle is abnormally thick, which can obstruct the outflow and creates a rhythm risk.",
    "⚠️ Moderate-intensity exercise is now known to be SAFE in HCM and is recommended — the old blanket ban has gone. What stays off the table is maximal and burst efforts, and competitive sport needs a shared decision with your cardiologist. If your outflow is OBSTRUCTED, dehydration, heavy straining and standing up quickly all worsen the obstruction: drink properly, breathe out on effort, and never hold your breath under load."],
  ["Non-obstructive hypertrophic cardiomyopathy", "non-obstructive hypertrophic cardiomyopathy|non-obstructive hypertrophic",
    "Non-obstructive HCM: the muscle is thickened, but it is not blocking the outflow of the heart.",
    "Without obstruction you have more latitude than in obstructive HCM — the dehydration and straining rules matter less — but the rhythm risk that defines HCM remains, so maximal and burst efforts and competitive sport stay a cardiologist's call."],
  ["Restrictive cardiomyopathy", "restrictive cardiomyopathy",
    "In restrictive cardiomyopathy the muscle is stiff and cannot fill, even though it may squeeze normally — so the output is low and fixed.",
    "A stiff heart cannot raise its output much on demand, so effort tolerance is genuinely limited and pushing harder does not fix it. Short, gentle, frequent sessions; avoid dehydration; stop for dizziness."],
  ["Peripartum cardiomyopathy recovery", "peripartum cardiomyopathy",
    "Peripartum cardiomyopathy is heart failure appearing late in pregnancy or in the months after delivery.",
    "About half of women recover their pumping function, mostly within 6–12 months, so this is a genuinely hopeful diagnosis — but recovery depends on taking the medication, and a future pregnancy carries real risk that must be discussed BEFORE conceiving. Exercise is safe once you are stable; fit it around feeding and sleep rather than pretending they are not happening."],
  /* The long alternative MUST come first: alternation is leftmost-first, so a
     bare "takotsubo" would match only 9 chars at position 0 and lose to the
     curated plan's "cardiomyopath" (13) later in the string. */
  ["Takotsubo (stress) cardiomyopathy recovery", "takotsubo.{0,12}cardiomyopathy|takotsubo|broken heart syndrome",
    "Takotsubo is a sudden ballooning of the left ventricle triggered by a surge of stress hormones — it looks exactly like a heart attack, but the arteries are clear.",
    "The pumping function usually recovers within 1–3 months, which is why this plan is short. It is a real cardiac event, not 'just stress' — but the outlook is good. Because it is triggered by emotional or physical stress, the psychological side is part of the treatment, not an optional extra."],
  ["Ischemic cardiomyopathy", "ischemic cardiomyopathy|ischaemic cardiomyopathy",
    "Ischaemic cardiomyopathy is a weakened heart caused by coronary artery disease — scar from previous heart attacks, or muscle that is chronically short of blood.",
    "This is heart failure AND coronary disease, so both sets of rules apply: weigh daily and watch for fluid, and report angina on exertion rather than training through it."],
  ["Alcoholic cardiomyopathy", "alcoholic cardiomyopathy|alcohol-related cardiomyopathy",
    "Alcoholic cardiomyopathy is heart muscle damaged by sustained heavy drinking.",
    "⚠️ Complete abstinence IS the treatment, and it is what decides whether the heart recovers — no amount of exercise substitutes for stopping. With sustained abstinence, function often improves markedly over 6–12 months. Ask for help with stopping if you need it: that is the single highest-value thing on this page."],
  ["Chemotherapy-induced cardiomyopathy", "chemotherapy-induced cardiomyopathy|cardiotoxic|anthracyclin|trastuzumab",
    "Some cancer treatments — anthracyclines and trastuzumab especially — can weaken the heart muscle, either during treatment or years later.",
    "Exercise appears to PROTECT the heart during and after cardiotoxic treatment, and it helps the fatigue too — so this is worth doing even when it is the last thing you feel like. Expect much bigger day-to-day swings than a purely cardiac patient: work with the good days rather than to a rigid schedule. If you are neutropenic or your platelets are low, check what is safe first."],
  ["Cardiac amyloidosis (gentle exercise)", "cardiac amyloid|amyloidosis \\(gentle",
    "In cardiac amyloidosis abnormal protein infiltrates the heart muscle, making it thick, stiff and unable to fill — with a low, fixed output.",
    "⚠️ This is a fragile physiology: the output cannot rise much on demand, and the nerves controlling blood pressure are often affected too, so blood pressure drops on standing and on effort. Keep sessions short and gentle, progress from seated to standing, avoid dehydration and hot baths, and stop for any dizziness. Blackouts need reporting urgently."],
  ["Cardiomyopathy (general)", "cardiomyopath",
    "Cardiomyopathy means the heart muscle itself is diseased — thickened, stretched, stiff or scarred.",
    "The type decides the rules, so get clear on which one you have and what your cardiologist has cleared you for before progressing intensity."]
];
CARDIOMYOPATHIES.forEach(([label, r, note, limit]) => add({ r, label, ...A.cardiacMyopathy({ label, r, note, limit }) }));

/* ARVC — bespoke: the ONE cardiomyopathy where training itself drives the disease,
   so it cannot share the "build capacity" phases above. */
add({ r: "arrhythmogenic right ventricular|arrhythmogenic cardiomyopathy|\\barvc\\b|\\bavrc\\b", label: "Arrhythmogenic right ventricular cardiomyopathy (ARVC)", total: 26,
  freq: "Low-to-moderate recreational activity only, most days — every step agreed with your cardiologist",
  note: "⛔ ARVC is the one cardiomyopathy where EXERCISE ITSELF DRIVES THE DISEASE. In ARVC the right ventricle's muscle is progressively replaced by fat and scar, and high-intensity and endurance exercise measurably ACCELERATE that replacement, worsen the ventricle, and provoke life-threatening rhythms — the more you do, the faster it progresses. This is the opposite of every other plan in this app: here, less is genuinely more. Competitive and endurance sport must stop. The same applies to gene-positive relatives with a structurally normal heart. This plan is about finding a safe, sustainable floor of activity — not about progressing.",
  variants: [
    { k: "standard", label: "Diagnosed ARVC, cleared for light activity", sub: "Cardiologist-agreed low-moderate activity", scale: 1 },
    { k: "genepos", label: "Gene-positive relative", sub: "Carrying the gene, heart looks normal so far", pick: "gene|carrier|relative|family", scale: 0.9,
      note: "A gene-positive relative with a normal heart still needs the exercise limits: in ARVC, endurance exercise is thought to help TRIGGER the phenotype in gene carriers, so restraint now may delay or prevent the disease appearing. You also need lifelong surveillance even while everything looks normal." },
    { k: "icd", label: "With an ICD", sub: "Defibrillator implanted", pick: "\\bicd\\b|defibrillator", scale: 1.1,
      note: "The ICD treats a dangerous rhythm — it does not prevent one, and it does not raise your exercise ceiling. Keep your heart rate at least ~20 bpm below the therapy threshold; ask your team for the number. Exertion is a known trigger for ARVC arrhythmias, which is exactly why the ceiling stays." },
    /* Overrides XCUT `athlete`, which would otherwise auto-fire on state.returnSports
       and hand an ARVC patient a return-to-sport progression. */
    { k: "athlete", label: "Athlete / wants to return to sport", sub: "This needs a direct conversation", pick: "return-to-sport|athlet", scale: 1,
      note: "⛔ This is the hardest conversation in sports cardiology, and the answer is usually no: competitive and endurance sport are contraindicated in ARVC because the exercise itself accelerates the disease and provokes arrhythmia. ARVC is a leading cause of sudden death in young athletes. Do not use this app to argue yourself back — talk to an inherited-cardiac-conditions specialist." },
    { k: "postablation", label: "After ablation for VT", sub: "Rhythm treated with ablation", pick: "ablation", scale: 1.15,
      note: "Ablation reduces the arrhythmia burden but does not stop the underlying disease progressing, so the exercise limits do not change afterwards. Groin access site: no heavy lifting for about a week." }
  ],
  ph: [
    ["Understand the diagnosis & stop the harmful loading", 0, 4,
      "Stop competitive and endurance training, and agree your ceiling with a specialist.",
      "endurance and competitive training stopped, an agreed activity ceiling with your cardiologist, family screening discussed",
      "⛔ Stop competitive sport, endurance training and high-intensity work NOW — in ARVC these accelerate the disease. ⛔ STOP and seek urgent help for palpitations, fainting or near-fainting during or just after exertion: in ARVC, exercise-triggered blackouts can be the warning before a cardiac arrest. Your first-degree relatives should be offered screening."],
    ["Establish a safe activity floor", 4, 10,
      "Find a level of everyday activity that keeps you healthy without provoking the disease.",
      "comfortable with low-moderate recreational activity, no palpitations or dizziness on effort, taking your beta-blocker",
      "Low-to-moderate ONLY: walking, easy cycling on the flat, light household activity. Nothing where you are gasping, and nothing competitive — including the informal competition of a running club or a group ride. Being inactive is not the goal either; a sedentary life has its own costs. Aim for a steady, unremarkable middle."],
    ["Maintain strength & general health within the ceiling", 10, 18,
      "Keep muscle and general health with light resistance work, inside the same limits.",
      "light resistance work twice a week without symptoms, weight and blood pressure well managed, no new palpitations",
      "Light-to-moderate resistance work is reasonable; maximal lifting and straining are not. Breathe out on effort. If a session leaves you with palpitations, that session was too hard — this is one condition where symptoms during exercise mean stop and report, not push on."],
    ["Lifelong surveillance & sustainable activity", 18, 26,
      "Settle into a sustainable lifelong level, with lifelong monitoring.",
      "a sustainable activity routine you can keep, surveillance (echo, Holter, MRI) up to date, relatives screened",
      "ARVC progresses and is monitored for life — keep every appointment even while you feel well. Report new palpitations, blackouts or a drop in capacity promptly. Any change to your activity ceiling is a decision for your inherited-cardiac-conditions team, not something to renegotiate with yourself when you feel good."]
  ] });

/* ── 7. Advanced therapies — heart transplant & LVAD ───────────────────────── */
A.cardiacAdvanced = (s) => ({
  total: 39,
  freq: "Supervised rehab 3×/week + daily walking — this is a year-long rebuild, not a 12-week course",
  note: `${s.note} ${s.key} This is a long rebuild: you are recovering from major surgery on top of months or years of severe heart failure, and the muscle loss from that is usually the real limiter. Expect meaningful gains to keep coming for a full year. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Uncomplicated recovery", scale: 1 },
    { k: "year1", label: "First year after transplant", sub: "The intensive surveillance year", pick: "year 1|first year|\\(year 1\\)", scale: 1.1,
      note: "The first year is the highest-risk window for rejection and infection, with frequent biopsies and the highest doses of immunosuppression — so it is also the year of most steroid myopathy and bone loss, which is exactly why resistance training matters so much now. Expect the schedule to be interrupted by appointments; work around them rather than giving up." },
    { k: "destination", label: "Destination therapy", sub: "The LVAD is the long-term answer, not a bridge", pick: "destination", scale: 1.2,
      note: "As destination therapy the device is your long-term circulation rather than a bridge to transplant — so this is about building a life around it. People live and travel and work with these for years; the routines you build now (driveline care, anticoagulation, exercise) are permanent ones." },
    { k: "bridge", label: "Bridge to transplant", sub: "Waiting for a transplant", pick: "bridge|awaiting|waiting list", scale: 1,
      note: "As a bridge, every bit of muscle and fitness you build now directly improves how you come through the transplant — 'prehabilitation' is one of the few things you control while waiting. Staying strong keeps you transplant-eligible." },
    { k: "steroid", label: "Marked steroid myopathy", sub: "High-dose steroids, proximal weakness", pick: "steroid|myopathy|prednis", scale: 1.3,
      note: "High-dose steroids waste the big muscles closest to the trunk first — thighs, hips, shoulders — so getting off a chair and climbing stairs get hard even as the new heart works perfectly. This is the specific thing resistance training fixes; it also protects bone, which the steroids are thinning at the same time." },
    { k: "rejection", label: "After a rejection episode", sub: "Treated for rejection", pick: "rejection", scale: 1.35,
      note: "After a rejection episode expect a step backwards: high-dose steroids, more fatigue, and a lower ceiling for a while. Rebuild from a lower rung rather than trying to pick up where you left off, and let the biopsy results — not your ambition — set the pace." }
  ],
  ph: [
    ["Hospital & early recovery", 0, 4,
      "Get through the early post-operative period safely and start moving daily.",
      "walking short distances several times a day, breathing exercises done regularly, wounds clean, no signs of infection or rejection",
      `${s.early} ${CARDIAC_STOP}`],
    ["Supervised reconditioning begins", 4, 12,
      "Start structured supervised rehab and rebuild the basics.",
      "walking 20–30 minutes, attending supervised rehab, resistance work started, independent with daily activities",
      `${s.mid} Progress by how it feels, not by your old numbers — the body you are training is not the one you had before you got ill.`],
    ["Aerobic & resistance training in earnest", 12, 26,
      "Train properly now: aerobic capacity and — especially — muscle.",
      "30+ minutes of continuous aerobic exercise, resistance training 2–3×/week, stairs and hills manageable, weight and blood sugar controlled",
      `Resistance training is the priority in this phase, not an optional extra: it is what reverses the steroid-driven muscle and bone loss. ${VALSALVA} ${s.late}`],
    ["Long-term conditioning & a normal life", 26, 39,
      "Build a genuinely normal, active life around the new physiology.",
      "≥150 min/week sustained, back to work or your usual roles if that is the goal, surveillance up to date, medication never missed",
      `Many people reach a very good level of fitness — some run marathons. Immunosuppression is for life and missing doses is the commonest cause of late rejection. ${s.late}`]
  ]
});
const ADVANCED = [
  ["Post-heart-transplant reconditioning", "heart-transplant|heart transplant|cardiac transplant", 39,
    "A heart transplant replaces the failing heart entirely.",
    "🫀 KEY: the new heart is DENERVATED — its nerves were cut, so it does not respond to your brain the way yours did. Your heart rate starts higher, rises SLOWLY over several minutes as hormones reach it, keeps climbing after you stop, and takes a long time to come down. This changes everything about how you train: use RPE, never heart rate; warm up for at least 10 minutes; and NEVER stop abruptly — an extended cool-down is not optional, because without fast heart-rate control your blood pressure will drop if you just stop. Some reinnervation happens after a year or so.",
    "You have had a STERNOTOMY: sternal precautions apply for ~8 weeks — nothing over ~5 kg, no pushing/pulling with the arms, no reaching both arms overhead, hug a pillow to cough. On top of that, immunosuppression means infection risk is high: avoid crowds, unwell people and busy gyms early, and report ANY fever immediately — you may not mount a normal response to infection.",
    "Warm up for a full 10 minutes and cool down for a full 10 — with a denervated heart, both are safety measures rather than good manners. Watch for rejection: unexplained fatigue, breathlessness, fluid or fever needs same-day contact, not next-week.",
    "Steroids and immunosuppression thin the bones and waste muscle, and raise blood pressure, cholesterol and blood sugar — exercise counteracts every one of those. Skin cancer risk is genuinely raised: cover up and wear sunscreen when you train outdoors."],
  ["Post-heart-transplant (year 1) reconditioning", "heart-transplant \\(year 1\\)|transplant \\(year 1\\)|first year.{0,20}transplant", 39,
    "The first year after a heart transplant: the highest-surveillance, highest-immunosuppression, fastest-gaining year.",
    "🫀 KEY: the new heart is DENERVATED — it does not respond to your nervous system. Heart rate rises slowly, keeps climbing after you stop, and falls slowly, so use RPE rather than heart rate, warm up for 10 minutes and NEVER stop abruptly. Reinnervation, if it happens, comes after about a year.",
    "You have had a STERNOTOMY: sternal precautions for ~8 weeks — nothing over ~5 kg, no arm pushing/pulling, no reaching both arms overhead. Immunosuppression is at its highest now: avoid crowds and unwell people, and report ANY fever the same day.",
    "Expect frequent biopsies and clinic visits to interrupt the schedule — work around them. Unexplained fatigue, breathlessness, fluid or fever means contact your team the same day: it can be rejection.",
    "This is the year steroid myopathy and bone loss are worst, so resistance training now pays off for decades. Keep the sun protection up."],
  ["Post-LVAD reconditioning", "\\blvad\\b|left ventricular assist|ventricular assist device", 39,
    "An LVAD is a mechanical pump implanted to take over the work of the failing left ventricle.",
    "⚙️ KEY: modern LVADs run at CONTINUOUS flow, so you may have NO palpable pulse and standard blood-pressure cuffs and pulse oximeters often will not read — your team will use a Doppler MAP instead. Do not panic about a missing pulse, and make sure anyone training you knows. The pump does not speed up when you exercise the way a heart does, so your capacity is real but capped, and RPE is the only sensible guide.",
    "🔌 DRIVELINE: the cable leaving your abdomen is the single biggest infection risk you now carry — keep the exit site scrupulously clean, immobilise the cable so it never tugs, and report redness, discharge, pain or a fever immediately. NEVER submerge it: no swimming, no baths. You have had a STERNOTOMY: sternal precautions for ~8 weeks. You are anticoagulated: no contact sport, and falls matter.",
    "Avoid deep or repeated trunk bending that could kink the cable, and avoid anything that risks a blow to the pump or the driveline. Dehydration can cause a 'suction event' where the pump pulls the ventricle closed — drink properly, especially in heat. Keep your controller and spare batteries with you at all times, including during exercise.",
    "Keep the driveline immobilised during every session — tension on it is what breaks the healed exit site and lets infection in. Report dizziness, alarms, dark urine, or new weakness urgently."],
  ["Post-LVAD (destination therapy) reconditioning", "lvad \\(destination|destination therapy", 39,
    "An LVAD as destination therapy: the pump is the long-term plan rather than a bridge to transplant.",
    "⚙️ KEY: continuous flow means you may have NO palpable pulse and cuffs may not read — this is normal for you, and anyone training you must know it. The pump does not accelerate with exercise, so capacity is real but capped; use RPE.",
    "🔌 DRIVELINE infection is the biggest long-term risk: scrupulous exit-site care, cable immobilised, never submerged — no swimming or baths. STERNOTOMY: sternal precautions ~8 weeks. Anticoagulated: no contact sport, and falls matter.",
    "Avoid deep or repeated trunk bending that kinks the cable, and protect the pump from blows. Dehydration can trigger a suction event — drink properly. Controller and spare batteries with you always.",
    "This is your circulation for the long term, so the routines you build now are permanent: driveline care, anticoagulation, and exercise. People work, travel and live well for years on these."]
];
ADVANCED.forEach(([label, r, total, note, key, early, mid, late]) =>
  add({ r, label, ...retime(A.cardiacAdvanced({ label, r, note, key, early, mid, late }), total) }));

/* ── 8. Stable (unoperated) valve disease ─────────────────────────────────── */
A.cardiacValve = (s) => ({
  total: 20,
  freq: "Aerobic most days at moderate intensity + light resistance 2×/week",
  note: `${s.note} Exercise does not wear a valve out faster and it does not make the leak or the narrowing worse — but the valve does set a ceiling on how much blood you can move, so effort tolerance is limited by the valve rather than by fitness. Staying fit is what keeps you a good candidate if it ever needs fixing. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Mild–moderate, no symptoms", sub: "Followed with periodic scans", scale: 1 },
    { k: "severe", label: "Severe valve disease", sub: "Severe on the scan", pick: "severe|critical|tight", scale: 1.4,
      note: "⚠️ Severe valve disease changes the rules: intensity limits are a cardiologist's decision, competitive and high-intensity exercise is generally off, and the appearance of ANY symptom — breathlessness, chest tightness, dizziness or blackouts on effort — is the signal that it needs fixing, usually soon. Symptoms are the trigger for surgery in valve disease; do not sit on them." },
    { k: "mild", label: "Mild, incidental finding", sub: "Picked up on a scan, no symptoms", pick: "mild|trivial|incidental|prolapse", scale: 0.6,
      note: "A mild valve finding on a scan usually means no restriction at all and a repeat scan in a few years — most people with one live entirely normally and never need anything done. Do not let an incidental echo finding stop you exercising: deconditioning would do you more harm than the valve." },
    { k: "af", label: "With atrial fibrillation", sub: "Also in AF", pick: "atrial fibrillation|\\baf\\b", scale: 1.15,
      note: "Valve disease plus AF means the atria are stretched and the rate response is erratic — use RPE rather than heart rate, and anticoagulation is usually needed (especially with mitral stenosis or a mechanical valve), so contact sport is out." }
  ],
  ph: [
    ["Establish your baseline & warning symptoms", 0, 3,
      "Get clear on the severity, your limits, and the symptoms that change the plan.",
      "you know the severity, what you are cleared for, and which symptoms mean stop; surveillance scan booked",
      `${s.limit} ⚠️ In valve disease, SYMPTOMS are the thing that matters most: new breathlessness, chest tightness, dizziness or fainting on exertion is not something to train through — it is usually the signal that the valve needs treating. Report it rather than pushing on. ${CARDIAC_STOP}`],
    ["Build an aerobic base", 3, 8,
      "Build steady aerobic fitness within your valve's ceiling.",
      "30 minutes of continuous moderate activity without symptoms, confident about your limits",
      `${RPE_RULE} Steady moderate work is well tolerated by almost every stable valve. ${s.limit}`],
    ["Add strength & capacity", 8, 14,
      "Add resistance training and raise your capacity.",
      "light-to-moderate resistance training twice a week without symptoms, daily activities easy",
      `${s.load} ${VALSALVA}`],
    ["Maintenance & surveillance", 14, 20,
      "Stay fit, and keep the valve monitored.",
      "≥150 min/week sustained, surveillance echo up to date, no new symptoms",
      "Valves are monitored for life and they change slowly — keep the echoes even when you feel perfectly well. Staying fit and a healthy weight makes valve surgery, if it is ever needed, markedly safer. Tell any dentist about a valve problem, and keep your teeth in good order: mouth bacteria are the classic cause of valve infection."]
  ]
});
const VALVES = [
  ["Aortic stenosis (stable)", "aortic stenosis \\(stable\\)|aortic stenosis",
    "In aortic stenosis the valve out of the left ventricle has narrowed and stiffened, so the heart must generate much higher pressure to push blood past it.",
    "⚠️ Aortic stenosis is the valve lesion where exertional symptoms matter most: chest tightness, breathlessness, and above all DIZZINESS OR FAINTING on effort mean urgent review — in severe AS, exertional blackouts are an ominous sign, not a curiosity. If yours is severe, high-intensity and competitive exercise are off until it is treated.",
    "Avoid maximal and heavy static lifting: with a fixed narrow outlet, the heart cannot raise its output to match a big pressure demand. Moderate, dynamic, rhythmic work is what suits this valve."],
  ["Aortic regurgitation (stable)", "aortic regurgitation",
    "In aortic regurgitation the valve leaks backwards, so the left ventricle handles the same blood twice and gradually enlarges.",
    "A leaking aortic valve tolerates dynamic exercise well — the faster heart rate actually shortens the time available to leak back. Get the ventricle size checked on your surveillance echo: it enlarging is what triggers surgery, often before you feel anything.",
    "Heavy static lifting raises the pressure the valve leaks against and increases the leak, so favour dynamic, rhythmic work over maximal strain."],
  ["Mitral stenosis (stable)", "mitral stenosis",
    "In mitral stenosis the valve into the left ventricle has narrowed, usually years after rheumatic fever, so blood backs up into the lungs — especially when the heart speeds up.",
    "⚠️ In mitral stenosis a FAST heart rate is the problem: it shortens filling time and pressure backs up into the lungs, so you get suddenly breathless with exertion, fever or AF. Rate control is the treatment, and going into AF often causes an abrupt deterioration. Report new palpitations or a step-change in breathlessness urgently.",
    "Build intensity gradually rather than in surges: it is the sudden rise in heart rate that causes the breathlessness, more than the workload itself."],
  ["Mitral regurgitation (stable)", "mitral regurgitation",
    "In mitral regurgitation the valve leaks backwards into the left atrium, so part of each beat goes the wrong way and the atrium and ventricle enlarge over time.",
    "A leaking mitral valve is usually well tolerated for years. Your surveillance echo is watching ventricle size and function and the pressure in your lungs — those, not symptoms alone, decide when repair is needed, and repair is much better than replacement when it is possible.",
    "Dynamic exercise is well tolerated. Heavy static lifting increases the leak by raising the pressure it leaks against — favour rhythmic work."],
  ["Mitral valve prolapse", "mitral valve prolapse|\\bmvp\\b",
    "In mitral valve prolapse the valve leaflets billow back as the heart squeezes. It is very common, usually entirely benign, and in most people never causes a problem at all.",
    "MVP on its own almost never restricts exercise, and finding it on a scan should not change what you do. Palpitations and atypical chest pain are common with it and are usually not dangerous. It only matters if it causes a significant leak — which your echo will show — or if you have had blackouts or a family history of sudden death, which are worth mentioning.",
    "No load restriction for uncomplicated prolapse. Train normally."],
  ["Tricuspid regurgitation (stable)", "tricuspid regurgitation",
    "In tricuspid regurgitation the valve on the right side of the heart leaks, so blood backs up into the veins — which is why it shows as swollen ankles and a distended abdomen rather than breathlessness.",
    "Tricuspid regurgitation usually reflects what is happening elsewhere — lung pressure or left-sided disease — so treating the cause matters more than the valve itself. Leg elevation and calf-pump work genuinely help the swelling.",
    "Well tolerated. Expect swelling to be worse in heat and after long periods standing; weigh yourself if the swelling changes quickly."],
  ["Pulmonary valve stenosis (stable)", "pulmonary valve stenosis|pulmonic stenosis",
    "In pulmonary valve stenosis the valve out to the lungs is narrowed — usually something you were born with, and one of the most treatable of all valve lesions.",
    "Mild pulmonary stenosis needs no restriction and never progresses in most people. If it is significant it is usually fixed with a balloon, which works extremely well and lasts. Ask where yours sits before assuming any limit.",
    "Mild disease: no restriction. Moderate or severe: get your cardiologist's ceiling before high-intensity work."],
  ["Pulmonary valve regurgitation (stable)", "pulmonary valve regurgitation|pulmonic regurgitation",
    "In pulmonary regurgitation the valve out to the lungs leaks backwards, so the right ventricle handles extra volume. It is most often seen years after a repaired congenital heart problem.",
    "A leaking pulmonary valve is tolerated for many years, but the right ventricle slowly enlarges — and the timing of valve replacement is decided on MRI measurements of that ventricle, often before you notice anything. Keep the surveillance MRIs.",
    "Well tolerated. Report a genuine drop in exercise capacity or new palpitations — capacity is one of the things used to decide the timing of intervention."],
  ["Bicuspid aortic valve (stable)", "bicuspid aortic valve|bicuspid valve",
    "A bicuspid aortic valve has two leaflets instead of three — the commonest congenital heart abnormality, present in about 1 in 100 people.",
    "⚠️ The valve is only half the story: a bicuspid valve comes with an AORTA that is prone to dilating, and that aneurysm risk — not the valve — is what drives the exercise advice. If your aorta is dilated, heavy and maximal lifting is out because it spikes the pressure inside the aorta. Get your aortic diameter from your last scan; it changes the rules. First-degree relatives should be screened, since this runs in families.",
    "⚠️ If the aorta is dilated: no maximal lifting, no heavy straining, avoid contact and collision sport. Dynamic aerobic exercise is fine and encouraged. If the aorta is normal-sized, a bicuspid valve alone is far less restrictive — but confirm that with your cardiologist rather than assuming."],
  ["Valvular heart disease (stable)", "valvular heart disease|valve disease \\(stable\\)|heart valve disease",
    "Stable valve disease means a heart valve is narrowed or leaking, but it is being watched rather than fixed.",
    "The severity and which valve decide everything — ask which one, how severe, and what your ceiling is. In valve disease, new symptoms on exertion are the signal that something has changed and usually the trigger for treatment.",
    "Dynamic, moderate, rhythmic exercise suits nearly every valve lesion. Heavy maximal straining suits none of them."]
];
VALVES.forEach(([label, r, note, limit, load]) => add({ r, label, ...A.cardiacValve({ label, r, note, limit, load }) }));

/* ── 9. Arrhythmias (rhythm itself — devices and ablation are separate) ────── */
A.cardiacArrhythmia = (s) => ({
  total: 18,
  freq: "Aerobic most days + resistance 2×/week; build gradually rather than in surges",
  note: `${s.note} Exercise is safe and beneficial with a controlled rhythm — and in atrial fibrillation it is a treatment: fitness and weight loss measurably reduce how often you go into AF and how long you stay there. ${s.hr} ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Rate-controlled, no symptoms at rest", scale: 1 },
    { k: "paroxysmal", label: "Paroxysmal (comes and goes)", sub: "Episodes that start and stop on their own", pick: "paroxysmal", scale: 0.85,
      note: "Paroxysmal AF comes and goes on its own. Exercise sometimes triggers an episode and that is unnerving, but it is not dangerous if you are anticoagulated and rate-controlled — learn your triggers (alcohol, poor sleep, dehydration, big meals, stimulants) since they are often more provoking than the exercise. Weight loss and fitness reduce episodes substantially: this is one of the best-evidenced lifestyle wins in cardiology." },
    { k: "persistent", label: "Persistent", sub: "Stays in AF until it is treated", pick: "persistent", scale: 1.1,
      note: "Persistent AF does not stop by itself and may be cardioverted or ablated. Your rate response to exercise is erratic and often excessive, so heart rate is useless as a guide — use RPE and expect worse days." },
    { k: "permanent", label: "Permanent (rate-controlled)", sub: "AF accepted; the rate is controlled", pick: "permanent|rate-controlled", scale: 1,
      note: "In permanent AF the decision has been made to control the rate rather than chase normal rhythm — which is a perfectly good outcome. Your pulse will always be irregular and rate-response erratic: RPE is your guide, and a rate that shoots up early in exercise is common rather than alarming. Anticoagulation continues regardless of how you feel." },
    { k: "athlete", label: "Endurance athlete", sub: "Years of high-volume endurance training", pick: "return-to-sport|athlet", scale: 1.1,
      note: "⚠️ Worth knowing: the relationship between exercise and AF is U-shaped. Moderate exercise protects against AF, but decades of high-volume endurance training measurably RAISE the risk of it — long-term endurance athletes get more AF than the moderately active. That does not mean stopping; it does mean that if you have AF and a long endurance history, cutting volume and intensity somewhat is a legitimate treatment rather than a defeat. Discuss it with an electrophysiologist." },
    { k: "anticoag", label: "On anticoagulation", sub: "Taking a blood thinner", pick: "anticoagul|warfarin|\\bdoac\\b|apixaban|rivaroxaban", scale: 1,
      note: "On anticoagulation, bleeding is the trade-off you accepted to avoid a stroke — and it is a good trade. Avoid contact and collision sport and activities with a real fall risk; report a significant head injury even if you feel fine. Do not stop the drug for exercise, ever." }
  ],
  ph: [
    ["Understand your rhythm & how to monitor it", 0, 2,
      "Get clear on your rhythm, your rate control, and how to gauge effort without a heart-rate number.",
      "you know your diagnosis and rate-control plan, using RPE confidently, anticoagulation sorted if needed",
      `${s.hr} ${s.limit} ${CARDIAC_STOP}`],
    ["Build an aerobic base", 2, 6,
      "Build steady aerobic fitness at a comfortable intensity.",
      "30 minutes of continuous moderate activity, palpitations not limiting you, confident about what is normal for you",
      `${RPE_RULE} Warm up and cool down gradually: it is abrupt starts and stops that most often set off an episode, not the steady work in the middle.`],
    ["Raise capacity & add strength", 6, 12,
      "Raise your capacity, add resistance work, and address the things that drive the rhythm.",
      "resistance training twice a week, aerobic capacity clearly improved, alcohol / sleep / weight being addressed",
      `${VALSALVA} ${s.drivers}`],
    ["Maintenance & risk-factor control", 12, 18,
      "Keep it up — for AF, the lifestyle work IS the rhythm treatment.",
      "≥150 min/week sustained, weight and alcohol targets met, sleep apnoea treated if you have it",
      "In AF this is not generic health advice: losing ~10% of body weight, treating sleep apnoea and cutting alcohol substantially reduce AF burden, and people who do it stay in normal rhythm far more often after cardioversion or ablation. It is one of the clearest examples in medicine of lifestyle working as well as a procedure."]
  ]
});
const ARRHYTHMIAS = [
  ["Atrial fibrillation (rate-controlled)", "atrial fibrillation \\(rate-controlled\\)|atrial fibrillation|\\bafib\\b",
    "In atrial fibrillation the top chambers quiver instead of beating, so the pulse is irregular and the heart loses the atrial 'top-up' to each beat — which costs perhaps 15–20% of output.",
    "Your pulse is irregular and your rate response to exercise is erratic and often excessive, so heart-rate targets and fitness-watch zones are meaningless: use RPE and the talk test.",
    "Anticoagulation, if you are on it, is about stroke prevention and is not negotiable for exercise. AF itself is rarely dangerous to exercise with once the rate is controlled.",
    "Alcohol is the single most under-appreciated AF trigger — even moderate drinking measurably increases episodes. Untreated sleep apnoea is the next. Both are fixable."],
  ["Paroxysmal atrial fibrillation", "paroxysmal atrial fibrillation|paroxysmal \\baf\\b",
    "Paroxysmal AF comes and goes: episodes start and stop by themselves, often lasting minutes to hours.",
    "During an episode your rate response is erratic — use RPE. Between episodes your heart rate behaves normally, which is why a fitness watch will confuse you.",
    "An episode during exercise is frightening but not dangerous if you are rate-controlled and anticoagulated. An episode with chest pain, blackout or severe breathlessness is different — get help.",
    "Learn your personal triggers: alcohol, poor sleep, dehydration, stimulants, large meals and stress provoke far more episodes than exercise does."],
  ["Persistent atrial fibrillation", "persistent atrial fibrillation|persistent \\baf\\b",
    "Persistent AF does not revert by itself — it continues until it is cardioverted, ablated, or accepted.",
    "Rate response to exercise is erratic and often excessive. Use RPE; ignore heart-rate zones entirely.",
    "Anticoagulation continues regardless of how you feel — most AF strokes happen in people who felt completely fine.",
    "Getting fit and losing weight before a cardioversion or ablation measurably improves the chance it holds. This is the highest-leverage window you will get."],
  ["Permanent atrial fibrillation (rate-controlled)", "permanent atrial fibrillation|permanent \\baf\\b",
    "In permanent AF, you and your team have decided to control the rate and live in AF rather than chase normal rhythm — which is a perfectly reasonable, evidence-supported choice.",
    "Your pulse will always be irregular and your rate will jump early in exercise then plateau. Use RPE; heart-rate maths does not apply to you.",
    "Anticoagulation continues for life. Living in AF is compatible with a very active life.",
    "Rate control plus fitness is a good combination — many people feel considerably better once they are conditioned, even while staying in AF."],
  ["Atrial flutter", "atrial flutter",
    "Atrial flutter is a fast, organised circuit in the right atrium — more regular than AF, but with the same stroke risk and often a very fast, fixed rate.",
    "Flutter often conducts at a fixed ratio, so your rate can jump abruptly (for example from 75 to 150) with little warning during exercise. Use RPE, and report abrupt rate jumps.",
    "Anticoagulation applies just as it does for AF. Typical flutter is one of the most curable arrhythmias there is — ablation works in ~95% of cases, so ask about it.",
    "Flutter and AF travel together: many people with one develop the other, so the same alcohol, weight and sleep-apnoea work applies."],
  ["Supraventricular tachycardia (reconditioning)", "supraventricular tachycardia|\\bsvt\\b",
    "SVT is a sudden fast regular rhythm from above the ventricles — it starts and stops abruptly, often out of nowhere, and typically runs at 150–250.",
    "Between episodes your heart is entirely normal, so train normally. During an episode, stop and use your vagal manoeuvres.",
    "SVT is frightening but rarely dangerous in a structurally normal heart. Learn the vagal manoeuvres (bear down hard, or the modified Valsalva with your legs raised) — they abort many episodes. An episode with blackout or chest pain needs urgent assessment.",
    "Exercise can trigger episodes in some people. Ablation cures SVT in over 95% of cases and is worth asking about if episodes are frequent or stopping you doing things."],
  ["AVNRT (reconditioning)", "\\bavnrt\\b|av nodal re-?entr",
    "AVNRT is the commonest type of SVT: a small short-circuit loop within the AV node itself, giving sudden fast regular palpitations that stop as abruptly as they start.",
    "Your heart is structurally normal and behaves normally between episodes — train normally.",
    "Vagal manoeuvres abort many episodes: the modified Valsalva (strain hard, then lie back with legs raised) works best. AVNRT is benign in a normal heart, though the pounding neck sensation is unmistakable and unpleasant.",
    "Ablation cures AVNRT in ~97% of cases with very low risk — if episodes are frequent, this is one of the most reliably successful procedures in cardiology."],
  ["Atrial tachycardia", "atrial tachycardia",
    "Atrial tachycardia is a fast rhythm driven from a focus in the atrium other than the normal pacemaker.",
    "Rate response can be erratic and episodes may be sustained — use RPE rather than heart rate.",
    "Usually benign in a structurally normal heart, but a sustained fast rate over weeks can itself weaken the heart (a tachycardia-induced cardiomyopathy) — which is reversible once the rhythm is controlled. Report sustained palpitations rather than tolerating them for months.",
    "Alcohol, stimulants and poor sleep provoke it. Ablation is often effective if it is focal."],
  ["Frequent PVCs (reconditioning)", "frequent pvc|premature ventricular|\\bpvcs?\\b|ectopic beats",
    "PVCs are extra beats from the ventricle — the 'thump' or 'skipped beat' feeling, which is actually the strong beat after the pause.",
    "PVCs classically DISAPPEAR during exercise as your rate rises, and come back afterwards — that pattern is reassuring. PVCs that get WORSE with exercise are the opposite and need reporting.",
    "In a structurally normal heart, occasional PVCs are benign and extremely common. A very high burden (roughly >10–15% of beats) can weaken the heart over time and deserves treatment — that is what your Holter is measuring.",
    "Caffeine, alcohol, stress, and poor sleep all increase them. Reassurance genuinely helps: anxiety about PVCs makes you notice them more, which drives more adrenaline, which causes more of them."],
  ["First-degree AV block", "first-degree av block|first degree.{0,3}heart block|1st-degree av",
    "First-degree AV block simply means the signal takes slightly longer than usual to cross from the atria to the ventricles — every beat still gets through.",
    "This does not restrict exercise at all and usually needs no treatment or follow-up. Train normally.",
    "First-degree block is common, often seen in fit young people with high vagal tone, and usually entirely benign — it is a finding on an ECG rather than a disease.",
    "No restriction. If you have been told about it and nothing else, this is reassurance rather than a rehab problem."],
  ["Second-degree AV block (Mobitz I)", "second-degree av block|mobitz i\\b|wenckebach|2nd-degree av",
    "In Mobitz I (Wenckebach) the conduction delay lengthens beat by beat until one beat is dropped, then the cycle restarts.",
    "Mobitz I typically IMPROVES with exercise as your rate rises and vagal tone falls — that is the reassuring pattern. Block that worsens with exercise is not Mobitz I behaviour and needs review.",
    "Mobitz I is usually benign, common in athletes and during sleep, and rarely progresses. It is the higher-grade blocks (Mobitz II, complete heart block) that need pacemakers.",
    "No restriction for asymptomatic Mobitz I. Report dizziness, blackouts or exercise intolerance — those change the picture."],
  ["Long QT syndrome (cleared)", "long qt|\\blqts\\b",
    "In long QT syndrome the heart's electrical recovery takes too long, which occasionally allows a dangerous rhythm to start.",
    "Use RPE. More importantly, know YOUR subtype: the triggers differ completely between them.",
    "⚠️ The trigger depends on the genotype and this really matters: LQT1 is triggered by EXERCISE — classically SWIMMING; LQT2 by sudden loud noises and emotion (alarm clocks, startle); LQT3 during rest and sleep. So swimming alone is specifically hazardous in LQT1, and an unexpected alarm is the risk in LQT2. Take your beta-blocker — it is what protects you, and missing doses is a common factor in events. Many QT-prolonging medicines must be avoided: check every new drug, including over-the-counter ones, against a QT list.",
    "Guidelines have moved toward allowing most people with treated Long QT to exercise after expert shared decision-making — but that is a specialist's call on YOUR genotype, not a general clearance. Never swim alone."],
  ["Left bundle branch block (reconditioning)", "left bundle branch block|\\blbbb\\b",
    "In left bundle branch block the electrical signal cannot travel down the left conducting bundle, so the left ventricle is activated late and out of step.",
    "Use RPE. Note that LBBB makes exercise ECGs hard to interpret for ischaemia, so if angina is a question you will likely need an imaging test instead.",
    "New LBBB deserves investigation — it can mark underlying heart disease. Long-standing LBBB with a normal heart is usually benign. Where LBBB coexists with heart failure, the dyssynchrony it causes is precisely what CRT (resynchronisation) fixes, often dramatically.",
    "No specific restriction beyond what any underlying condition dictates."],
  ["Bradycardia (general)", "bradycardia|slow heart rate",
    "Bradycardia is a slow heart rate — which in a fit person is usually a sign of good conditioning rather than a problem.",
    "Use RPE. A resting rate in the 40s is normal for a well-trained endurance athlete and needs nothing done about it.",
    "What matters is whether the rate RISES appropriately with exercise. A slow rate that cannot rise (chronotropic incompetence) causes exercise intolerance and may need pacing; a slow resting rate that climbs normally is just fitness.",
    "Report dizziness, blackouts, or exhaustion out of proportion to the effort — those suggest the rate is not keeping up."],
  ["Arrhythmia (general)", "arrhythmi|dysrhythmi|palpitation",
    "An arrhythmia is an abnormal heart rhythm — the term covers everything from harmless extra beats to dangerous ventricular rhythms.",
    "Which rhythm you have decides everything, so get clear on the name of yours. Use RPE if your rate response is unreliable.",
    "Most arrhythmias in a structurally normal heart are benign. The ones that matter are those causing blackouts, those arising from a damaged or scarred heart, and the inherited ones.",
    "Report blackouts, palpitations with chest pain, or a family history of sudden unexplained death — those are the features that change an arrhythmia from a nuisance to a priority."]
];
ARRHYTHMIAS.forEach(([label, r, note, hr, limit, drivers]) =>
  add({ r, label, ...A.cardiacArrhythmia({ label, r, note, hr, limit, drivers }) }));

/* ── 10. Post-ablation — a groin puncture + a 3-month blanking period ──────── */
A.cardiacAblation = (s) => ({
  total: 12,
  freq: "Walking from day one; back to full exercise from about week 2",
  note: `${s.note} Ablation is done through catheters passed up the veins in your groin, so there is no surgical wound and no chest to heal — physical recovery takes days. ⏳ The part people are not warned about is the BLANKING PERIOD: for about 3 months afterwards the burned tissue is inflamed and irritable, and palpitations or even full recurrences during that window are COMMON and do NOT mean the ablation failed. Success is judged after 3 months, not before. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Uncomplicated ablation", scale: 1 },
    { k: "af", label: "AF ablation (pulmonary vein isolation)", sub: "For atrial fibrillation", pick: "atrial fibrillation|\\baf\\b|pulmonary vein", scale: 1.2,
      note: "AF ablation is the biggest of these: more burns, a longer procedure, and the highest chance of palpitations during the blanking period. Roughly 20–40% of people need a second procedure, which is a normal part of the pathway rather than a failure. Keeping the weight, alcohol and sleep-apnoea work going is what makes it hold." },
    { k: "svt", label: "SVT / AVNRT / accessory pathway ablation", sub: "For a fast regular rhythm", pick: "\\bsvt\\b|avnrt|accessory|wolff|\\bwpw\\b", scale: 0.7,
      note: "Ablation for SVT, AVNRT or an accessory pathway is usually curative in one go — success rates are around 95–97%. Recovery is quick and there is normally no blanking-period drama and no long-term drug. This is one of cardiology's genuine cures." },
    { k: "vt", label: "VT ablation", sub: "For ventricular tachycardia", pick: "\\bvt\\b|ventricular tachycardia", scale: 1.5,
      note: "VT ablation is a bigger undertaking, usually in a heart that is already scarred, and it reduces the arrhythmia burden rather than curing the underlying disease — so your ICD and your limits stay. Recovery is slower and the underlying heart condition sets the pace." },
    { k: "repeat", label: "Repeat / redo ablation", sub: "A second or later procedure", pick: "repeat|redo|second", scale: 1.15,
      note: "Repeat ablations are common — especially for AF, where reconnection of the pulmonary veins is the usual reason. Needing a second one is expected in a fair proportion of people and does not mean anything has gone wrong." }
  ],
  ph: [
    ["Groin sites & the first week", 0, 1,
      "Let the vein puncture sites seal; walk from day one.",
      "groin sites clean, dry and settling, walking comfortably, no swelling or bleeding",
      "Avoid heavy lifting (>~5 kg) and straining for about a week and keep the groin sites clean and dry. Report sudden groin swelling, an expanding lump, or bleeding urgently. Chest soreness or a sharp pain worse on lying flat and better sitting forward can be post-ablation pericarditis — it is common and usually settles, but report it. ⛔ Severe chest pain, breathlessness or feeling faint needs emergency assessment."],
    ["Back to normal activity", 1, 3,
      "Return to full normal activity and exercise.",
      "back to normal daily activities and driving, exercising again without groin discomfort",
      "Most people are back to full exercise within about 2 weeks. Palpitations and a fluttery, irritable heart in this period are expected — the tissue is inflamed. Keep taking your anticoagulation: it continues for at least 2–3 months regardless of rhythm, and often longer depending on your stroke risk."],
    ["Reconditioning through the blanking period", 3, 8,
      "Rebuild fitness while the blanking period runs its course — and do not panic at recurrences.",
      "30+ minutes of continuous moderate exercise, understanding that blanking-period palpitations are expected",
      "⏳ Recurrences during the first 3 months are COMMON and do not predict failure — many settle as the inflammation resolves. Do not conclude the ablation has failed, and do not stop your medication on your own. Report a sustained episode, but expect some turbulence."],
    ["Judge the result & keep the drivers under control", 8, 12,
      "Assess the outcome after the blanking period, and protect the result.",
      "past 3 months, rhythm assessed by your team, weight / alcohol / sleep-apnoea plan in place",
      "Now the result can be judged. Whatever it shows, the lifestyle work is what protects it: weight loss, cutting alcohol and treating sleep apnoea substantially improve the chance an AF ablation holds. A second procedure, if needed, is a normal step and not a failure."]
  ]
});
const ABLATIONS = [
  ["Post-ablation recovery", "post-ablation|post ablation|catheter ablation|\\bablation\\b",
    "Ablation burns or freezes the small area of heart tissue driving your abnormal rhythm, usually by scarring a barrier around it."],
  ["Wolff-Parkinson-White (post-ablation)", "wolff-parkinson-white|\\bwpw\\b|pre-?excitation",
    "In WPW an extra electrical pathway bypasses the normal gate between the atria and ventricles, which can allow dangerously fast conduction — and ablating that pathway is a genuine cure, with success rates around 95%. Once it is gone and confirmed gone, the risk goes with it, and most people return to entirely unrestricted activity including competitive sport."]
];
ABLATIONS.forEach(([label, r, note]) => add({ r, label, ...A.cardiacAblation({ label, r, note }) }));

/* ── 11. Implanted devices — the ~4–6 week ARM restriction is the whole story ── */
const LEAD_RULE =
  "💪 ARM RESTRICTION (~4–6 weeks, implant side): do NOT raise that elbow above shoulder height, do not reach behind you, and lift nothing heavy with that arm. The leads are only wedged into the heart wall until scar tissue anchors them, and big overhead movements are what dislodge them — a dislodged lead means another procedure. Keep the shoulder gently moving through comfortable range though: completely immobilising it causes a frozen shoulder, which is a far more common problem than lead dislodgement.";
A.cardiacDevice = (s) => ({
  total: 14,
  freq: "Walking from day one; lower body freely; the implant-side arm waits ~4–6 weeks",
  note: `${s.note} The device goes in under the skin below your collarbone with leads threaded down a vein into the heart — so there is no chest surgery and no sternal precaution, and your legs and general fitness are not restricted at all. The only real restriction is the arm on the implant side while the leads anchor. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Uncomplicated implant", scale: 1 },
    { k: "pacemaker", label: "Pacemaker", sub: "Paces a slow heart", pick: "pacemaker|paced|\\bppm\\b", scale: 0.85,
      note: "A pacemaker treats a slow rate — it sets a floor, not a ceiling, so it does not limit how hard you can exercise. Modern devices are rate-responsive and will speed up as you move. If you get breathless at a level you should manage, the device settings may need adjusting to your activity: that is a conversation worth having rather than accepting the limit." },
    { k: "icd", label: "ICD (defibrillator)", sub: "Shocks a dangerous rhythm", pick: "\\bicd\\b|defibrillator|\\bvt\\b|ventricular tachycardia", scale: 1.15,
      note: "⚡ An ICD watches for a dangerous rhythm and shocks it. The number you need is your THERAPY THRESHOLD — the rate at which it fires — and the rule is to keep your heart rate at least ~20 bpm below it, because a fast sinus rate from hard exercise can otherwise be mistaken for a dangerous rhythm and earn you an entirely unnecessary shock. Ask your team for the number and programme your training around it. Contact and collision sport is out (it damages the leads), and there are driving rules after an implant or a shock — check them." },
    { k: "crt", label: "CRT (resynchronisation)", sub: "Re-coordinates a dyssynchronous heart", pick: "\\bcrt\\b|resynchron|biventricular", scale: 1.2,
      note: "CRT adds a third lead to make the two ventricles beat together again, and in the right person the improvement over 3–6 months is substantial — often a real jump in what you can do. So RE-TEST rather than assuming your old ceiling: many people are capable of considerably more after CRT and never find out. The benefit depends on the device pacing nearly every beat, so keep your checks." },
    { k: "crtd", label: "CRT-D", sub: "Resynchroniser plus defibrillator", pick: "crt-d|crtd", scale: 1.2,
      note: "A CRT-D both resynchronises and defibrillates, so BOTH rules apply: expect real improvement over 3–6 months, and keep your heart rate ~20 bpm below the therapy threshold. Ask for that number." },
    { k: "sicd", label: "Subcutaneous ICD", sub: "No leads inside the heart", pick: "subcutaneous|\\bs-?icd\\b", scale: 0.9,
      note: "A subcutaneous ICD sits entirely outside the heart and veins, so there is no lead to dislodge and the arm restriction is much less of an issue — but the pocket is bigger and often more uncomfortable early. It cannot pace for a slow rate, only shock." }
  ],
  ph: [
    ["Wound & lead settling — protect that arm", 0, 2,
      "Let the pocket heal and the leads settle, while keeping the shoulder gently mobile.",
      "wound clean and dry, shoulder moving comfortably within the limit, no fever or pocket redness",
      `${LEAD_RULE} Keep the wound dry until healed; report redness, swelling, discharge, fever, or the device feeling like it is moving. ${s.watch} ${CARDIAC_STOP}`],
    ["Lower-body conditioning while the leads anchor", 2, 6,
      "Train everything except that arm — legs and aerobic work are completely unrestricted.",
      "walking 30 minutes, lower-body work progressing, shoulder range coming back, wound healed",
      `The arm restriction runs to about 4–6 weeks; everything else is fair game — walking, cycling, legs, and the other arm. ${s.limit} Keep gently moving the implant-side shoulder within the limit every day: a stiff shoulder is a far commoner outcome than a dislodged lead.`],
    ["Restrictions lift — restore the shoulder & full training", 6, 10,
      "Restore full shoulder range and reintroduce upper-body loading.",
      "device check done, full pain-free shoulder range restored, resistance training in both arms",
      `Once your team confirms the leads are settled (usually at the 4–6 week check), the arm restriction lifts and normal upper-body work resumes — build back gradually. ${s.limit}`],
    ["Full activity & living with a device", 10, 14,
      "Return to full activity and settle into life with the device.",
      "back to full activity, device check schedule understood, clear on what to do if it activates",
      `Devices are checked regularly, often remotely from home. Airport security and shop scanners are fine — do not linger in them, and carry your device card. Keep mobile phones and strong magnets away from the pocket. Avoid contact and collision sport. ${s.limit}`]
  ]
});
const DEVICES = [
  ["Post-pacemaker implantation reconditioning", "post-pacemaker|pacemaker implant|pacemaker implantation",
    "A pacemaker paces the heart when it is too slow — it sets a floor under your rate, not a ceiling on it.",
    "A pacemaker does not limit exercise intensity: it is there to stop your rate falling too low.",
    "Report dizziness, blackouts or hiccup-like twitching in the chest wall — the last can mean a lead is stimulating the diaphragm and needs reprogramming."],
  ["Post-ICD implantation reconditioning", "post-icd|icd implant|icd implantation|defibrillator implant",
    "An ICD watches continuously for a dangerous ventricular rhythm and delivers a shock to stop it — it is an insurance policy, not a treatment for the underlying disease.",
    "⚡ Ask your team for your THERAPY THRESHOLD and keep your heart rate at least ~20 bpm below it: a fast sinus rate during hard exercise can otherwise be misread as a dangerous rhythm and trigger an unnecessary shock. No contact or collision sport — it damages leads. Check the driving rules that apply to you.",
    "If it ever shocks you: if you feel well afterwards, contact your team the same day; if you feel unwell, or it shocks more than once, call emergency services."],
  ["Ventricular tachycardia (ICD, cleared)", "ventricular tachycardia \\(icd|ventricular tachycardia",
    "Ventricular tachycardia is a fast rhythm arising from the ventricles themselves — it usually indicates a scarred or diseased heart, and it is the rhythm the ICD exists to treat.",
    "⚡ Keep your heart rate at least ~20 bpm below your ICD's therapy threshold — ask for the number. Exertion is a recognised trigger for VT, so your ceiling is a cardiologist's decision and steady, moderate work is the aim rather than maximal efforts.",
    "The ICD treats VT — it does not prevent it, and it does not raise your exercise ceiling. The underlying heart disease sets your limits. Report any shock, and any palpitations with dizziness, urgently."],
  ["Post-CRT (resynchronization) reconditioning", "post-crt|\\bcrt\\b|resynchron|biventricular pac",
    "CRT adds a lead to the left ventricle so both sides beat together again, undoing the dyssynchrony that a left bundle branch block causes in a failing heart.",
    "CRT often produces a genuine step-change over 3–6 months — so re-test your capacity rather than assuming your old heart-failure limits still apply. Many people can do far more afterwards and never discover it.",
    "The benefit depends on the device pacing very nearly every beat — keep your device checks, and report palpitations, since going into AF can stop it pacing effectively."],
  ["Bradycardia (paced)", "bradycardia \\(paced\\)|bradycardia.{0,10}paced",
    "Your heart rate was too slow, and a pacemaker now sets a floor under it.",
    "The pacemaker removes the slow-rate problem entirely — it does not cap your exercise. Modern devices are rate-responsive and speed up as you move.",
    "If you get unexpectedly breathless at moderate effort, the rate-response settings may need tuning to your activity level — ask, rather than assuming that is your limit now."],
  ["Sick sinus syndrome (paced)", "sick sinus|sinus node dysfunction|tachy-?brady",
    "In sick sinus syndrome the heart's own pacemaker is unreliable — often alternating slow and fast (tachy-brady) — and a pacemaker covers the slow side.",
    "The pacemaker covers the slow rates, but the fast side may still need medication, and many people with sick sinus also develop AF. Use RPE if your rate is erratic.",
    "Report palpitations, dizziness or blackouts. Chronotropic incompetence — a rate that will not rise with exercise — is common here and is exactly what rate-response programming fixes: ask if effort feels harder than it should."],
  ["First-degree AV block (paced)", "first-degree av block \\(paced\\)|av block.{0,10}paced",
    "A conduction block that has been treated with a pacemaker.",
    "The pacemaker handles the conduction problem; it does not limit your exercise intensity.",
    "Report dizziness or blackouts, and keep your device checks."]
];
DEVICES.forEach(([label, r, note, limit, watch]) => add({ r, label, ...A.cardiacDevice({ label, r, note, limit, watch }) }));

/* ── 12. Hypertension — anchored tightly: `hypertension` alone would steal
   "Pulmonary hypertension (WHO-cleared exercise)", a different, riskier disease
   in the PULMONARY domain. Every row names its stage or its exact phrasing. ── */
A.cardiacHTN = (s) => ({
  total: 16,
  freq: "Aerobic 5×/week (this one really is a most-days job) + dynamic resistance 2–3×/week",
  note: `${s.note} Exercise is a genuine antihypertensive: regular aerobic training lowers systolic pressure by roughly 5–8 mmHg, which is about what a low-dose tablet does — and it works best in exactly the people whose pressure is highest. The effect depends on FREQUENCY more than intensity, and it starts to wear off within days of stopping, which is why this is a permanent habit rather than a course. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Controlled, no complications", scale: 1 },
    { k: "stage1", label: "Stage 1", sub: "Mildly raised", pick: "stage 1|prehypertension|elevated blood pressure", scale: 0.8,
      note: "At stage 1 without other risk factors, lifestyle change alone is often the entire treatment — and exercise is the most effective single component. This is the stage where you can genuinely avoid ever needing tablets, so it is worth the effort now." },
    { k: "stage2", label: "Stage 2 (controlled)", sub: "Higher, controlled on treatment", pick: "stage 2", scale: 1.1,
      note: "At stage 2 the tablets do the bulk of the work and exercise adds to them — it does not replace them. Do not stop medication because your readings improved; the improvement usually IS the medication." },
    { k: "resistant", label: "Resistant hypertension", sub: "Still high on 3+ drugs", pick: "resistant", scale: 1.3,
      note: "Resistant hypertension means the pressure stays up despite three or more drugs including a diuretic. Exercise adds a genuinely useful amount here, and it is worth checking for the treatable causes that often lurk behind it: sleep apnoea (very common and very treatable), too much salt, alcohol, NSAIDs, and kidney or hormonal causes. Supervised exercise is sensible while the pressure is uncontrolled." },
    { k: "uncontrolled", label: "Currently uncontrolled", sub: "Readings still high", pick: "uncontrolled|severe", scale: 1.2,
      note: "⚠️ If your resting pressure is very high (roughly ≥180/110), get it treated BEFORE starting vigorous exercise — that is the one situation where the exercise should wait a few weeks for the tablets. Light walking is still fine and still helps in the meantime." }
  ],
  ph: [
    ["Establish your real baseline", 0, 2,
      "Get a true picture of your pressure and start moving most days.",
      "home readings being recorded properly (seated, rested, arm supported, twice daily), walking most days",
      `⚠️ If your resting blood pressure is ≥180/110, get it treated before vigorous exercise — light walking only until then. ${VALSALVA} Blood pressure rises normally during exercise and that is fine; it is sustained resting pressure that does the damage. Measure it properly: rested 5 minutes, seated, back supported, feet flat, arm at heart height — bad technique produces bad numbers and bad decisions. ${CARDIAC_STOP}`],
    ["Build the aerobic habit", 2, 6,
      "Get to 5 sessions a week — frequency is what lowers pressure.",
      "30 minutes of moderate aerobic exercise 5 days a week, home readings starting to trend down",
      `${RPE_RULE} Frequency beats intensity here: five moderate walks a week lowers pressure more reliably than two hard sessions. There is also an immediate effect — pressure stays lower for hours after each session — so the regularity is doing real work every single day.`],
    ["Add resistance & isometric work", 6, 11,
      "Add dynamic resistance work — and consider isometric handgrip, which is surprisingly effective.",
      "resistance training 2–3×/week, blood pressure trending toward target, weight and salt being addressed",
      `Dynamic resistance training (moderate loads, higher reps, breathing freely) lowers blood pressure and is safe. ${VALSALVA} — breath-holding under a heavy load can drive pressure to extreme levels briefly. Isometric work such as handgrip holds has strong evidence for lowering resting pressure and takes only a few minutes: worth asking about.`],
    ["Lifelong maintenance", 11, 16,
      "Keep it permanent — the benefit disappears within days of stopping.",
      "≥150 min/week sustained, blood pressure at target, salt / alcohol / weight managed, medication reviewed",
      "The blood-pressure benefit fades within about a week of stopping, so this is genuinely for life. Salt reduction, losing weight, cutting alcohol and treating sleep apnoea each add on top of the exercise. Never stop antihypertensives because your readings look good — good readings usually mean the treatment is working."]
  ]
});
const HTN = [
  ["Hypertension (stage 1)", "hypertension \\(stage 1\\)|hypertension stage 1",
    "Stage 1 hypertension is a blood pressure consistently in the mildly raised range — high enough to matter over decades, low enough that lifestyle alone often fixes it."],
  ["Hypertension (stage 2, controlled)", "hypertension \\(stage 2|hypertension stage 2",
    "Stage 2 hypertension, controlled on treatment: the pressure was substantially raised and medication is now holding it down."],
  ["Prehypertension / elevated blood pressure", "prehypertension|elevated blood pressure",
    "Elevated blood pressure (prehypertension) is the range just above ideal — not yet hypertension, but reliably heading there without action."],
  ["Hypertension with exercise programming", "hypertension with exercise",
    "Hypertension being treated with exercise as a deliberate part of the prescription — which is exactly what the evidence supports."],
  ["Resistant hypertension (supervised exercise)", "resistant hypertension",
    "Resistant hypertension: the pressure remains above target despite three or more medications including a diuretic."]
];
HTN.forEach(([label, r, note]) => add({ r, label, ...A.cardiacHTN({ label, r, note }) }));

/* Postural hypotension — the mirror image; upright is the challenge. */
add({ r: "postural hypotension|orthostatic hypotension", label: "Postural hypotension (reconditioning)", total: 14,
  freq: "Daily — short sessions, starting in positions where gravity is not the enemy",
  note: "In postural hypotension your blood pressure falls when you stand, so blood pools in your legs instead of reaching your brain — hence the dizziness, greyed-out vision and near-fainting on standing. The trick is to train in positions where gravity is not working against you (lying, seated, in water) and to progress toward upright gradually, while using the physical counter-manoeuvres that genuinely work. Deconditioning makes it worse, so the instinct to sit still is exactly wrong.",
  variants: [
    { k: "standard", label: "Standard", sub: "Dizzy on standing", scale: 1 },
    { k: "neurogenic", label: "Neurogenic", sub: "From a nerve condition (Parkinson's, diabetes, amyloid)", pick: "neurogenic|parkinson|diabet|amyloid|autonomic", scale: 1.4,
      note: "When the autonomic nerves themselves are damaged the blood-pressure reflex cannot be trained back, so the emphasis shifts to compensating: compression garments, fluid and salt, counter-manoeuvres, and avoiding the triggers. Lying flat can paradoxically push your pressure too HIGH (supine hypertension) — raise the head of the bed rather than lying flat, and check with your team before adding salt." },
    { k: "meds", label: "Medication-related", sub: "Caused or worsened by drugs", pick: "medication|drug|iatrogenic", scale: 0.8,
      note: "Blood-pressure tablets, diuretics, alpha-blockers, antidepressants and Parkinson's drugs are common culprits — and a medication review is often more effective than any exercise. Ask for one before assuming this is something you must train around." },
    { k: "decond", label: "After prolonged bed rest", sub: "Deconditioned from illness or immobility", pick: "deconditioned|bed rest|low fitness|immobili", scale: 1.1,
      note: "After prolonged bed rest the drop on standing is largely deconditioning, and it recovers well — but it takes weeks of deliberate, progressive upright work, not just getting up. This is the most trainable version of the problem." }
  ],
  ph: [
    ["Learn the counter-manoeuvres & train horizontal", 0, 3,
      "Learn what stops a faint, and train in positions that do not provoke it.",
      "you can abort a dizzy spell with counter-manoeuvres, exercising comfortably lying or seated, fluid intake up",
      "Learn the counter-manoeuvres — crossing your legs and squeezing hard, tensing your buttocks and thighs, clenching your fists, or squatting — they work fast and can abort a faint. Stand up in stages: sit on the edge of the bed, pump your ankles, then rise. Fluid and salt (unless you have been told otherwise), compression stockings, and raising the head of the bed all help. Avoid hot baths, big meals and alcohol — all three drop your pressure further."],
    ["Progress toward upright", 3, 7,
      "Build tolerance to being upright, gradually.",
      "tolerating seated and supported standing exercise without symptoms, standing for longer before dizziness",
      "Recumbent cycling, rowing and swimming are ideal here — you get a genuine training effect without the postural challenge. Water is particularly good: the pressure of the water itself stops the pooling. Progress to standing work in small increments and always have something to hold."],
    ["Upright conditioning & leg-pump strength", 7, 11,
      "Train standing, and build the calf pump that pushes blood back up.",
      "walking 20–30 minutes without dizziness, standing work tolerated, calf and thigh strength improving",
      "Calf and thigh strength IS treatment here: those muscles are the pump that returns blood against gravity, and stronger legs mean less pooling. Keep the compression on during sessions. Avoid standing still for long periods — walking is easier than standing, which surprises people."],
    ["Maintenance & independence", 11, 14,
      "Keep the conditioning and manage the triggers for the long term.",
      "confident standing and walking, falls risk reduced, triggers understood and managed",
      "Keep the conditioning going — it fades quickly, and the dizziness comes back with it. Falls are the real danger here rather than the blood pressure itself, so keep the strength and balance work permanent. Report any actual blackout: fainting with no warning, or during exertion rather than on standing, is a different and more serious problem."]
  ] });

/* ── 13. PAD & claudication — walk INTO the pain. The opposite of every other
   plan in this app. NB: no `\bpad\b` anywhere — it would steal "Fat pad
   impingement" and "Heel fat pad syndrome" from the MSK catalogue. ── */
const CLAUDICATION_RULE =
  "🚶 THE METHOD: walk until the calf pain is MODERATE (about 3–4 out of 5 — definitely there, not unbearable), STOP, stand or sit until it completely clears (usually 2–5 minutes), then walk again. Repeat for 30–45 minutes. Stopping at the first twinge does NOT work — the pain is the stimulus, and dodging it wastes the session.";
const CLTI_WARN =
  "⛔ BUT: pain in the FOOT at REST, pain at night that wakes you and eases when you hang the foot out of bed, or any ulcer, wound or blackened toe is NOT claudication — that is critical limb ischaemia, the leg is at risk, and it needs URGENT vascular review, not a walking programme.";
A.cardiacPAD = (s) => ({
  total: 26,
  freq: "3 supervised walking sessions/week, 30–45 min each, for at least 12 weeks — the dose is the point",
  note: `${s.note} ⚠️ This is the one rehab plan in this app where THE PAIN IS THE TREATMENT. The calf muscles outrun their blood supply and cramp; walking into that pain, resting, and walking again is what drives new collateral vessels to grow and trains the muscle to extract oxygen better. Supervised walking roughly doubles walking distance over 12 weeks and works as well as stenting for most people — but only if you actually walk into the pain. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Supervised programme", sub: "The gold standard — 3×/week, supervised", scale: 1 },
    { k: "fontaine2", label: "Fontaine II / Rutherford 1–3", sub: "Claudication, no rest pain", pick: "fontaine stage ii|fontaine ii|rutherford categor|rutherford 1|rutherford 2|rutherford 3|claudication", scale: 1,
      note: "This is the classification for claudication without rest pain or tissue loss — exactly the group in whom supervised exercise therapy is FIRST-LINE treatment, ahead of stenting. The evidence here is strong and consistent: do the walking programme before agreeing to a procedure." },
    /* Overrides XCUT `home` (generic "bodyweight/bands" advice), which is wrong here:
       home-based PAD walking is a specific, evidenced protocol. */
    { k: "home", label: "Home-based walking programme", sub: "No supervised programme available", pick: "home-based|minimal equipment", scale: 1.2,
      note: "Home-based walking DOES work, but only when it is structured — a step counter or app, a written schedule, a walking log, and someone checking in. Unstructured 'advice to walk more' is measurably ineffective and is the version that fails. Supervised remains better if you can get it; ask for a referral before settling." },
    { k: "diabetic", label: "With diabetes", sub: "Diabetes alongside the PAD", pick: "diabet", scale: 1.3,
      note: "⚠️ Diabetes plus PAD is the dangerous combination: neuropathy means you may NOT feel the claudication that should be limiting you, and you may not feel a blister or a stone in your shoe either. Inspect your feet every single day, never walk barefoot, and get properly fitted footwear. A small foot wound here is a genuine threat to the limb, not a nuisance." },
    { k: "smoker", label: "Current smoker", sub: "Still smoking", pick: "smoker|smoking", scale: 1.5,
      note: "🚭 Smoking is the single strongest driver of PAD and stopping is the most effective thing available to you — more than any exercise, drug or stent. Continuing to smoke roughly doubles the chance of needing an amputation and reliably blocks the grafts and stents. If you take one thing from this plan, take this one." }
  ],
  ph: [
    ["Learn the method & find your baseline", 0, 2,
      "Learn the walk–rest–walk method and establish your claudication distance.",
      "you know your claudication distance, walking into moderate pain and resting without anxiety about it, foot-care routine established",
      `${CLAUDICATION_RULE} ${CLTI_WARN} ${s.feet}`],
    ["Build walking volume", 2, 8,
      "Build to 30–45 minutes of walk–rest–walk, three times a week.",
      "completing 30 minutes of intermittent walking 3×/week, claudication distance beginning to extend",
      `Keep walking INTO the pain — the cycles are the treatment, and the rests are part of it, not a failure. Expect little change for the first 4–6 weeks: the collaterals take time to grow, and this is exactly where most people give up. ${s.feet}`],
    ["Extend your claudication distance", 8, 16,
      "Push the distance you can cover before the pain arrives.",
      "walking meaningfully further before pain, 45 minutes of intermittent walking, hills and stairs easier",
      `This is where the gains show up — most people roughly double their distance by around 12 weeks. Add hills or pace once flat walking is easy: making the muscle work harder is what keeps the stimulus going. ${VALSALVA} ${s.feet}`],
    ["Maintain — and protect the arteries everywhere else", 16, 26,
      "Keep the walking permanent, and treat the disease that caused it.",
      "walking programme sustained, not smoking, statin and antiplatelet taken, blood pressure and diabetes controlled",
      "The gains disappear within months of stopping the walking — it is maintenance for life. Just as important: PAD in your legs means the same disease is in your heart and brain arteries, and most people with PAD die of a heart attack or stroke rather than losing a leg. The statin, the antiplatelet, the blood-pressure control and stopping smoking are treating THAT — take them seriously."]
  ]
});
const PADS = [
  ["Peripheral artery disease (claudication)", "peripheral arter(y|ial) disease \\(claudication\\)|peripheral arter(y|ial) disease",
    "In peripheral artery disease, narrowed leg arteries cannot deliver enough blood when the muscles demand it — so the calf cramps on walking and eases within minutes of stopping.",
    "Check your feet daily for blisters, cuts or colour changes, wear well-fitted shoes, and never walk barefoot: a poorly supplied foot heals wounds very badly."],
  ["Intermittent claudication", "intermittent claudication|\\bclaudication\\b",
    "Intermittent claudication is the classic symptom of PAD: reproducible cramping calf pain that comes on at a predictable walking distance and eases within a few minutes of stopping.",
    "Check your feet daily for blisters, cuts or colour changes, wear well-fitted shoes, and never walk barefoot."],
  ["Peripheral artery disease (Fontaine stage II)", "fontaine stage ii|fontaine ii|peripheral arter(y|ial) disease \\(fontaine",
    "Fontaine stage II is PAD with claudication but no rest pain and no tissue loss — the stage where supervised exercise therapy is first-line treatment.",
    "Check your feet daily; report any wound, ulcer or blackened area urgently — that would move you out of stage II."],
  ["Peripheral artery disease (Rutherford category 3)", "rutherford categor|rutherford 3|peripheral arter(y|ial) disease \\(rutherford",
    "Rutherford category 3 is severe claudication — you are limited well before you want to stop, but there is no rest pain and no tissue loss.",
    "Check your feet daily; report any wound, ulcer or blackened area urgently."],
  ["Buerger's disease (thromboangiitis obliterans)", "buerger|thromboangiitis obliterans",
    "Buerger's disease inflames and blocks the small and medium arteries of the hands and feet — and it occurs almost exclusively in smokers, typically young ones.",
    "🚭 THE TREATMENT IS STOPPING SMOKING — completely and permanently, including vaping and any nicotine, and including passive smoke. This is not lifestyle advice alongside the real treatment; it IS the treatment. People who stop almost always avoid amputation. People who continue very often lose fingers and toes. No drug, procedure or exercise programme substitutes for it, and even occasional smoking keeps the disease active. Check hands and feet daily; report any ulcer, colour change or rest pain urgently."]
];
PADS.forEach(([label, r, note, feet]) => add({ r, label, ...A.cardiacPAD({ label, r, note, feet }) }));

/* CLTI — bespoke: must NOT inherit "walk into the pain". The limb is at risk. */
add({ r: "chronic limb-threatening ischemi|chronic limb-threatening ischaemi|critical limb ischemi|critical limb ischaemi|limb-threatening ischemi", label: "Chronic limb-threatening ischaemia (supervised)", total: 26,
  freq: "Only what your vascular team has cleared — this is a revascularisation problem first, an exercise problem second",
  note: "⛔ CLTI IS NOT CLAUDICATION AND THE RULES ARE REVERSED. Rest pain in the foot, pain at night relieved by hanging the leg out of bed, ulcers that will not heal, or blackened tissue mean the blood supply is inadequate even at REST — the limb is at risk, and the treatment is urgent revascularisation, not a walking programme. Do NOT walk into pain here: in claudication the pain is a training stimulus, but in CLTI it is a warning that tissue is dying. This plan is about protecting the limb, healing the wound, and reconditioning around it — always under vascular supervision.",
  variants: [
    { k: "standard", label: "Under vascular care, awaiting or after revascularisation", sub: "Team-supervised", scale: 1 },
    { k: "revasc", label: "After successful revascularisation", sub: "Blood supply restored", pick: "revascular|bypass|angioplasty|stent|post-op", scale: 0.8,
      note: "Once the blood supply is restored the picture changes completely and a graded walking programme becomes appropriate again — but your vascular team decides when, and the wound has to be healing first. Grafts and stents block if you smoke, so this is the moment that matters most for stopping." },
    { k: "wound", label: "With a wound or ulcer", sub: "Tissue loss present", pick: "ulcer|wound|gangrene|tissue loss", scale: 1.4,
      note: "With tissue loss the wound governs everything: offloading, wound care and blood supply, in that order. Weight-bearing on an ischaemic ulcer makes it bigger. Your podiatrist and vascular nurse are the key people now, and exercise works around them." },
    { k: "diabetic", label: "With diabetes", sub: "Diabetic foot disease alongside", pick: "diabet", scale: 1.5,
      note: "⚠️ Diabetes plus CLTI is the highest-risk combination there is for losing a limb: neuropathy hides the pain that would warn you, and infection spreads fast and quietly. Daily foot inspection is non-negotiable, and any new redness, swelling, smell or fever means same-day review — not next week." },
    { k: "smoker", label: "Current smoker", sub: "Still smoking", pick: "smoker|smoking", scale: 1.6,
      note: "🚭 Smoking with CLTI is the clearest path to amputation there is — it blocks the graft or stent that is currently saving your leg. Stopping is the single most effective thing you can do, and it is more important than anything else on this page." }
  ],
  ph: [
    ["Protect the limb & get revascularised", 0, 4,
      "Protect the foot and get the blood supply sorted — this phase is not a training phase.",
      "under active vascular care, revascularisation planned or done, wound care in place, foot protected",
      "⛔ Do NOT use the claudication walk-into-pain method — the pain here means tissue is starving. Urgent vascular assessment is the priority. Protect the foot absolutely: proper footwear, never barefoot, inspect it daily, and keep pressure off any wound. Do not elevate an ischaemic leg (it reduces the little flow you have) — but do not let it hang down all day either. Report spreading redness, a bad smell, fever or increasing pain the SAME DAY: infection in a poorly supplied foot moves fast."],
    ["Gentle reconditioning around the limb", 4, 10,
      "Keep the rest of you conditioned while the limb is protected and healing.",
      "wound healing or healed, general fitness maintained, upper body and unaffected leg being trained",
      "Train what you safely can: arm cranking, seated work, the other leg, and core. This keeps your fitness and your heart in shape — and remember most people with CLTI die of heart disease, so this is not filler. Keep pressure off the affected foot. Any walking is only what your vascular team has specifically cleared."],
    ["Graded walking once the blood supply allows", 10, 18,
      "Reintroduce walking gradually — but only once revascularised and healed.",
      "vascular team has cleared walking, wound healed, walking without provoking rest pain",
      "Once the blood supply is restored and the wound is healed, a graded walking programme becomes appropriate and valuable — but progression is your vascular team's call, not this app's. If rest pain or a wound returns, stop and be reviewed immediately: that means the revascularisation is failing."],
    ["Long-term limb protection & cardiovascular risk", 18, 26,
      "Protect the limb for life and treat the disease that threatens the rest of you.",
      "walking sustained within your cleared limits, foot-care routine permanent, not smoking, statin and antiplatelet taken",
      "Lifelong foot care and podiatry are what keep the limb. But be clear about the bigger picture: CLTI signals severe arterial disease everywhere, and the heart is what usually kills people with it. The statin, antiplatelet, blood-pressure and diabetes control are treating that, and stopping smoking outranks all of them."]
  ] });

/* ── 14. Vascular surgery & aneurysm repair ───────────────────────────────── */
A.cardiacVascSurg = (s) => ({
  total: 20,
  freq: "Walking daily from day one; structured reconditioning once wounds have healed",
  note: `${s.note} ${s.key} Most people having vascular surgery have arterial disease everywhere else too — so the reconditioning is not just about the operated bit, it is about the heart that has to get you through the next twenty years. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Uncomplicated recovery", scale: 1 },
    { k: "endovascular", label: "Endovascular / keyhole repair", sub: "Through the groin arteries — no big incision", pick: "endovascular|\\bevar\\b|\\btevar\\b|stent|percutaneous|keyhole", scale: 0.55,
      note: "Endovascular repair goes in through the groin arteries and avoids opening the abdomen or chest entirely — so recovery is measured in weeks rather than months, with no abdominal wound and no lifting restriction beyond the access site. The trade-off is lifelong surveillance scans to check the graft has not leaked or moved: keep every one of them, because an endoleak has no symptoms until it matters." },
    { k: "open", label: "Open repair", sub: "Opened abdomen or chest", pick: "\\bopen\\b|laparotom|thoracotom", scale: 1.5,
      note: "Open repair means a large abdominal or chest incision, so you have an abdominal-wall recovery on top of the vascular one: no lifting over ~5 kg for about 6 weeks, brace the wound when coughing, and expect fatigue for 2–3 months. Hernia at the incision is a real long-term risk — which is exactly why the lifting limit is worth respecting." },
    { k: "diabetic", label: "With diabetes", sub: "Diabetes alongside", pick: "diabet", scale: 1.3,
      note: "Diabetes slows wound healing and raises infection risk after vascular surgery, and groin wounds are notoriously prone to it. Keep glucose controlled, inspect wounds and feet daily, and report redness, discharge or a wound that opens promptly." },
    { k: "smoker", label: "Current smoker", sub: "Still smoking", pick: "smoker|smoking", scale: 1.5,
      note: "🚭 Smoking blocks grafts and stents — it is the commonest reason a vascular reconstruction fails, and it more than doubles the chance of needing it done again. Stopping now protects the operation you have just had." }
  ],
  ph: [
    ["Wounds, walking & the first weeks", 0, 3,
      "Let the wounds heal and get walking daily from day one.",
      "wounds clean, dry and healing, walking several times a day, pain controlled",
      `${s.early} Walk every day from the start — it prevents chest infections and clots, both of which are the real early risks here. ${CARDIAC_STOP}`],
    ["Build walking volume", 3, 8,
      "Build steady walking volume as the wounds settle.",
      "walking 20–30 minutes continuously, wounds healed, back to most daily activities",
      `${s.mid} ${RPE_RULE}`],
    ["Structured reconditioning", 8, 14,
      "Rebuild capacity and strength properly.",
      "30+ minutes of continuous moderate exercise, resistance training started, back to work if that is the goal",
      `${s.load} ${VALSALVA}`],
    ["Maintenance, surveillance & risk control", 14, 20,
      "Keep the graft working and treat the disease behind it.",
      "≥150 min/week sustained, surveillance scan schedule understood, not smoking, statin and antiplatelet taken",
      `${s.surv} Grafts and stents last far longer in people who do not smoke and who take their statin and antiplatelet. Vascular disease is a whole-body disease: the heart and brain arteries have the same problem, and that is what the medication is protecting.`]
  ]
});
const VASCSURG = [
  ["Post-aortic-aneurysm-repair reconditioning", "aortic-aneurysm-repair|aortic aneurysm repair|aneurysm repair",
    "An aortic aneurysm is a ballooned, weakened section of the body's main artery; repair replaces or lines it before it can burst.",
    "The repair has removed the rupture risk — that danger is behind you, and this is now a reconditioning problem.",
    "Follow your surgeon's lifting limit exactly: open repair usually means nothing over ~5 kg for ~6 weeks; endovascular repair means access-site care for about a week and little else.",
    "Build walking steadily. Report abdominal or back pain, or any groin swelling, rather than assuming it is normal healing.",
    "Reintroduce lifting gradually after an open repair — incisional hernia is a real risk and it is provoked by early heavy loading.",
    "Surveillance scans are for life after an endovascular repair: an endoleak causes no symptoms until it is dangerous, so the scan is the only way to catch it."],
  ["Abdominal aortic aneurysm (post-repair)", "abdominal aortic aneurysm|\\baaa\\b",
    "An abdominal aortic aneurysm is a ballooned section of the aorta in the abdomen, now repaired either with an open operation or a stent-graft through the groin.",
    "The rupture risk that made this urgent is now dealt with.",
    "Open repair: nothing over ~5 kg for ~6 weeks and brace the wound to cough. EVAR: access-site care for a week, then very few restrictions.",
    "Build walking steadily. Report new abdominal or back pain, or groin swelling.",
    "After an open repair, rebuild abdominal loading gradually — incisional hernia is common and early heavy lifting is what causes it.",
    "Keep every surveillance scan after EVAR. Also worth knowing: aneurysms run in families, so your siblings and children may be offered screening."],
  ["Thoracic aortic aneurysm (post-repair)", "thoracic aortic aneurysm|\\btevar\\b",
    "A thoracic aortic aneurysm is a ballooned section of the aorta in the chest, now repaired by open surgery or a stent-graft.",
    "⚠️ Even after repair, the REST of your aorta is usually abnormal — so the blood-pressure and heavy-lifting rules generally continue for life rather than ending with the operation.",
    "If this was an open repair through the breastbone or the side of the chest, follow those precautions (~8 weeks). If it was a stent-graft, the access site is the only wound.",
    "⚠️ Keep blood pressure well controlled — pressure surges are what stress the remaining aorta. Avoid maximal lifting and breath-holding.",
    "⚠️ Lifelong: no maximal lifting, no heavy straining, avoid contact and collision sport. Moderate dynamic exercise is encouraged and safe — it is the pressure spikes, not the activity, that matter.",
    "Lifelong surveillance imaging of the whole aorta. If you have a connective-tissue condition (Marfan, Loeys-Dietz) or a bicuspid valve, family screening matters too."],
  ["Post-endovascular-repair reconditioning", "endovascular-repair|endovascular repair|\\bevar\\b",
    "Endovascular repair lines the weakened artery from the inside using a stent-graft delivered through the groin arteries — no large incision at all.",
    "This is a groin-puncture recovery: recovery is measured in weeks, not months, and most people are back to normal quickly.",
    "Avoid heavy lifting and straining for about a week and keep the groin sites clean and dry. Report sudden groin swelling, an expanding lump, or bleeding urgently.",
    "Get back to normal activity quickly — that is the whole advantage of this approach.",
    "There is no abdominal wound to protect, so resistance training can resume early.",
    "⚠️ Surveillance scans are LIFELONG and genuinely matter: an endoleak — blood getting back into the old aneurysm sac — has no symptoms at all until it becomes dangerous. The scan is the only way to find it. Do not drift out of follow-up."],
  ["Post-lower-limb bypass reconditioning", "lower-limb bypass|lower limb bypass|femoral-popliteal|fem-?pop|leg bypass",
    "A lower-limb bypass routes blood around a blocked leg artery using a vein or a synthetic tube, restoring supply to the foot.",
    "The graft is only as good as the arteries either end of it — and it stays open far better in people who walk, take their antiplatelet and statin, and do not smoke.",
    "Wound care matters especially in the groin, where infection is common. Expect leg swelling for weeks — elevate when sitting. Report redness, discharge, fever or a wound that opens.",
    "Walking is what keeps the graft open — it is treatment, not just fitness. Report a sudden return of pain, coldness, numbness or a pale foot IMMEDIATELY: that can be the graft blocking, and it is time-critical.",
    "Rebuild leg strength progressively. Keep checking your feet daily.",
    "Graft surveillance scans catch a narrowing before it blocks, which is far easier to fix — keep them. 🚭 Smoking is the commonest reason these grafts fail."],
  ["Carotid endarterectomy recovery", "carotid endarterectomy|\\bcea\\b",
    "Carotid endarterectomy cleans the plaque out of the carotid artery in the neck to prevent a stroke.",
    "This operation is about preventing a FUTURE stroke — the benefit is invisible, which makes it easy to under-value the medication that goes with it.",
    "⛔ Report any stroke symptoms IMMEDIATELY — face droop, arm weakness, speech difficulty: call emergency services. Also report severe headache, seizure or confusion: after the artery is reopened, hyperperfusion syndrome is a rare but serious early complication, and blood-pressure control prevents it. Expect neck numbness and stiffness; keep the neck gently moving.",
    "Keep blood pressure well controlled — this matters more than usual in the first weeks. Neck stiffness and numbness around the scar are normal and settle over months.",
    "Build back to full activity. The numb patch on your neck and under the ear may take a year to fade and sometimes never fully does.",
    "Keep the statin and antiplatelet going for life — they, plus blood-pressure control and not smoking, are what actually prevent the next stroke."],
  ["Post-carotid-stent reconditioning", "carotid-stent|carotid stent|carotid stenting",
    "A carotid stent props open the narrowed neck artery from the inside, delivered through a catheter from the groin.",
    "Like the operation, this is about preventing a future stroke rather than making you feel better now.",
    "⛔ Report any stroke symptoms IMMEDIATELY — face droop, arm weakness, speech difficulty: call emergency services. Groin access site: avoid heavy lifting and straining for about a week; report swelling or bleeding.",
    "Do NOT stop your dual antiplatelet tablets early — a fresh carotid stent clotting causes a stroke. Keep blood pressure controlled.",
    "Build back to full activity once the groin has healed. There is no neck wound to work around.",
    "Keep the statin and antiplatelets going, and keep your surveillance scans."],
  ["Post-varicose-vein-procedure reconditioning", "varicose-vein|varicose vein|vein ablation|sclerotherapy|\\bevla\\b",
    "A varicose vein procedure closes off the faulty surface veins that were letting blood flow backwards down the leg — the deep veins, which do the real work, are untouched.",
    "⚠️ WALK IMMEDIATELY — this is the one where the instruction surprises people. Walking from the same day prevents clots and speeds recovery; sitting still is the thing to avoid.",
    "Wear your compression stockings exactly as instructed — they are doing much of the work. Walk from day one, ideally 10–20 minutes several times a day. Expect bruising, tightness and a cord-like feel along the treated vein for weeks; that is normal healing.",
    "Avoid prolonged standing and prolonged sitting — both are worse for you than walking. Report a hot, red, painful swollen calf urgently: that could be a DVT.",
    "Return to normal exercise within 1–2 weeks. Avoid long periods standing still, which is what caused the pressure problem in the first place.",
    "Varicose veins recur over years in a fair proportion of people — that is the natural history, not a failed procedure. Keeping active, keeping weight down and avoiding long static standing all slow it."]
];
VASCSURG.forEach(([label, r, note, key, early, mid, load, surv]) =>
  add({ r, label, ...A.cardiacVascSurg({ label, r, note, key, early, mid, load, surv }) }));

/* Aortic dissection — bespoke: the lifelong BP/lifting rules are the plan. */
add({ r: "aortic dissection|type a dissection|type b dissection", label: "Aortic dissection recovery", total: 39,
  freq: "Gentle aerobic most days, within a strict blood-pressure ceiling — this is a lifelong set of rules",
  note: "⛔ An aortic dissection is a tear in the inner lining of the aorta that lets blood split the wall apart — it is one of the most lethal things in medicine, and surviving one changes the rules permanently. The remaining aorta is damaged and weaker than normal FOR LIFE, whether or not part of it was repaired. Everything here is built around one principle: keep the pressure inside the aorta low and steady. That means aggressive blood-pressure control, no maximal lifting, no straining, and no explosive effort — forever, not for six weeks. Moderate aerobic exercise is safe, encouraged and genuinely good for you; it is the PRESSURE SPIKES that tear aortas, not activity itself.",
  variants: [
    { k: "typeb", label: "Type B (managed medically)", sub: "Descending aorta — usually treated with drugs", pick: "type b|descending", scale: 1,
      note: "Type B dissections involve the descending aorta and are usually managed with intensive blood-pressure control rather than surgery — which means the medication IS the treatment, and taking it exactly as prescribed is the single thing keeping the aorta intact. The dissected segment stays with you and is watched with scans for life." },
    { k: "typea", label: "Type A (emergency surgery)", sub: "Ascending aorta — repaired as an emergency", pick: "type a|ascending", scale: 1.35,
      note: "Type A dissections involve the ascending aorta and are repaired as an emergency through a sternotomy — so sternal precautions apply for ~8 weeks on top of everything else. You have survived something with very high mortality, and it is normal for that to take a psychological toll: anxiety and low mood afterwards are extremely common and worth treating." },
    { k: "endovascular", label: "After a stent-graft (TEVAR)", sub: "Lined from the inside", pick: "\\btevar\\b|stent-graft|endovascular", scale: 0.85,
      note: "A stent-graft lines the torn segment from inside via the groin, so physical recovery is quick — but it does NOT restore a normal aorta, and the blood-pressure ceiling, the lifting rules and the lifelong surveillance scans all continue exactly as before." },
    { k: "connective", label: "With a connective-tissue condition", sub: "Marfan, Loeys-Dietz, vascular Ehlers-Danlos", pick: "marfan|loeys|ehlers|connective tissue", scale: 1.4,
      note: "⚠️ With a connective-tissue disorder the whole arterial tree is fragile, not just the dissected part, and the restrictions are stricter and permanent: no isometric or maximal work at all, no contact sport, no competitive sport. Your first-degree relatives should be screened — this is inherited, and finding it before a dissection is the entire point." },
    /* Overrides XCUT `athlete`: a return-to-sport progression here is dangerous. */
    { k: "athlete", label: "Athlete / wants to return to sport", sub: "This needs a specialist conversation", pick: "return-to-sport|athlet", scale: 1.3,
      note: "⛔ Competitive sport, heavy weight training and contact sport are contraindicated after an aortic dissection — a Valsalva under a heavy bar can push aortic pressure to levels that tear it. Endurance activity at moderate intensity is usually fine and often encouraged. This is a decision for an aortic specialist who knows your imaging, not something to work out from a training plan." }
  ],
  ph: [
    ["Survive, stabilise & learn the rules", 0, 4,
      "Recover from the acute event and understand what has permanently changed.",
      "blood pressure at target consistently, medication established, you understand the lifelong restrictions, walking gently",
      "⛔ Blood-pressure control is everything: your beta-blocker is not optional and missing doses is genuinely dangerous. Target is usually a systolic around 120 or lower — ask for your number. Gentle walking ONLY at this stage. No lifting, no straining, no pushing, no bearing down (treat constipation actively — straining on the toilet is a real pressure spike). ⛔ Sudden severe tearing chest or back pain means call emergency services immediately: that is how a further dissection presents."],
    ["Gentle aerobic reconditioning", 4, 12,
      "Rebuild gentle aerobic fitness inside the pressure ceiling.",
      "walking 20–30 minutes comfortably, blood pressure stable on exertion, no chest or back pain",
      "Moderate, rhythmic, continuous work only: walking, easy cycling, gentle swimming. Nothing where you strain, hold your breath, or go all-out. If you can talk comfortably you are in the right zone. Avoid heavy pushing and pulling. The anxiety at this stage is normal and often the hardest part — many people find they are frightened to exert themselves at all, which is worth naming and getting help with."],
    ["Build capacity within permanent limits", 12, 24,
      "Build real aerobic capacity, with strength work kept deliberately light.",
      "30–45 minutes of continuous moderate exercise, light resistance work without straining, blood pressure at target",
      "Resistance work: LIGHT loads and high reps only, breathing freely throughout — never hold your breath, never grind out a maximal rep. As a rule of thumb people are advised to stay well away from maximal lifting (often framed as nothing beyond roughly half your body weight, and no straining) — get your specialist's version of this. Avoid contact and collision sport permanently."],
    ["Lifelong: pressure control, surveillance & a full life", 24, 39,
      "Settle into a permanently modified but genuinely active life.",
      "≥150 min/week of moderate aerobic activity sustained, blood pressure consistently at target, surveillance imaging up to date, not smoking",
      "This is for life: the blood-pressure medication, the imaging schedule, and the lifting limits do not expire. But the message is not 'do nothing' — sedentary living carries its own serious risks, and moderate aerobic exercise is safe, protective and encouraged. Report sudden severe chest or back pain, or new hoarseness or swallowing trouble, urgently. If yours was linked to a connective-tissue disorder or a bicuspid valve, make sure your relatives get screened."]
  ] });

/* ── 15. Venous disease — DVT, insufficiency, post-thrombotic syndrome ─────── */
const CALF_PUMP =
  "Your calf is a pump: every step squeezes the deep veins and pushes blood back up against gravity, and the valves stop it falling back. Walking and calf raises ARE the treatment — standing still is worse for these veins than walking, which is why supermarket queues hurt more than the walk there.";
A.cardiacVenous = (s) => ({
  total: 16,
  freq: "Walking daily + calf-pump work several times a day; compression worn throughout",
  note: `${s.note} ${CALF_PUMP} ${s.key} ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Uncomplicated, on treatment", scale: 1 },
    { k: "acute", label: "Recent / acute clot", sub: "Diagnosed in the last few weeks", pick: "acute|recent|post-?dvt", scale: 1,
      note: "⚠️ Old advice was bed rest. That was WRONG: early walking with compression is safe, does not increase the risk of the clot travelling to the lungs, and reduces pain, swelling and long-term post-thrombotic syndrome. Get moving once you are anticoagulated — but report sudden breathlessness or chest pain immediately, as that is how a clot in the lung presents." },
    { k: "chronic", label: "Chronic / long-standing", sub: "Months or years on", pick: "chronic|long-?standing|post-?thrombotic", scale: 1.3,
      note: "Long-standing venous disease means the valves are permanently damaged and the swelling is now a management problem rather than a healing one. Compression and the calf pump are lifelong tools, not a course of treatment — the benefit is real but it stops when you stop." },
    { k: "anticoag", label: "On anticoagulation", sub: "Taking a blood thinner", pick: "anticoagul|warfarin|\\bdoac\\b|apixaban|rivaroxaban", scale: 1,
      note: "On anticoagulation, avoid contact and collision sport and anything with a real fall risk, and report a significant head injury even if you feel fine. Do not stop the drug to exercise. Most people are treated for at least 3 months; whether it continues depends on why the clot happened." },
    { k: "ulcer", label: "With a venous ulcer", sub: "An open wound present", pick: "ulcer|wound", scale: 1.6,
      note: "With a venous ulcer, compression is the treatment that heals it — and exercise on top of compression heals it faster and keeps it from coming back. Elevate the leg above heart height when resting. This is slow: months rather than weeks, and the recurrence rate is high without lifelong compression." }
  ],
  ph: [
    ["Start moving & get the compression right", 0, 2,
      "Get walking early with proper compression — the opposite of the old bed-rest advice.",
      "walking daily, compression worn correctly all day, swelling and pain starting to settle",
      `${s.early} Wear compression as prescribed — it is doing much of the work, and it is only useful if it is actually on. Elevate the leg above heart height when resting. ⛔ Report sudden breathlessness, chest pain worse on breathing in, or coughing blood IMMEDIATELY — that is a clot in the lung and it is an emergency.`],
    ["Build the calf pump", 2, 6,
      "Build walking volume and start dedicated calf-pump work.",
      "walking 20–30 minutes, calf raises done several times daily, swelling reducing through the day",
      `Calf raises, ankle pumps and walking, several times a day. Ankle STIFFNESS is a hidden problem here: a stiff ankle cannot pump, so keeping ankle range full is part of the treatment. Avoid long periods standing still or sitting with the legs down — both let blood pool. ${s.mid}`],
    ["Progressive conditioning", 6, 11,
      "Build aerobic fitness and leg strength properly.",
      "30+ minutes of continuous exercise, calf strength clearly improved, swelling well controlled",
      `Cycling, swimming and walking are all excellent — water is particularly good, because the water pressure itself acts like a compression stocking. Resistance work for the calves and thighs directly improves the pump. ${VALSALVA}`],
    ["Long-term management", 11, 16,
      "Make the compression and the calf work permanent.",
      "activity sustained, compression routine established, swelling manageable, skin intact",
      `${s.late} Look after the skin: dry, itchy, discoloured skin around the ankle is the warning sign before an ulcer, and moisturising plus compression prevents it. Report a hot, red, painful, swollen calf — that could be a new clot — and report any break in the skin early, when it is far easier to heal.`]
  ]
});
const VENOUS = [
  ["Post-DVT reconditioning", "post-?dvt|deep vein thrombos|deep venous thrombos",
    "A DVT is a clot in a deep vein, usually in the calf or thigh, treated with anticoagulation.",
    "⚠️ Early walking with compression is SAFE and is now the recommendation — the old bed-rest advice was wrong and made post-thrombotic syndrome more likely.",
    "Start walking as soon as you are anticoagulated and the pain allows — it does not dislodge the clot. Expect the leg to be swollen and tender for weeks.",
    "Around a third to a half of people develop some post-thrombotic syndrome — swelling, aching and skin changes — and the calf pump plus compression is what prevents it.",
    "Whether anticoagulation continues past 3 months depends on WHY the clot happened: a clot after surgery is a different risk from an unprovoked one. Make sure you know your plan."],
  ["Chronic DVT (reconditioning)", "chronic dvt|chronic deep vein",
    "A chronic DVT is an old clot that has not fully cleared, leaving the vein narrowed or blocked and the valves damaged.",
    "The clot itself is no longer the danger — the damaged valves and the resulting pressure are what cause the ongoing swelling and skin changes.",
    "Compression and walking are the mainstays. Expect swelling that is worse by evening and better overnight.",
    "The leg will likely always swell somewhat. Compression plus the calf pump keeps it manageable and protects the skin.",
    "This is lifelong management rather than a cure — but done properly it prevents the ulcers that are the real long-term risk."],
  ["Post-thrombotic syndrome (reconditioning)", "post-?thrombotic syndrome",
    "Post-thrombotic syndrome is the long-term consequence of a DVT: damaged valves let blood pool, so the leg aches, swells, discolours and eventually the skin breaks down.",
    "This is a pressure problem, and compression is the single most effective treatment — the exercise works by driving the pump that lowers that pressure.",
    "Wear compression every day from the moment you get up: putting it on before the leg swells is far more effective than after.",
    "Exercise measurably improves symptoms here — a structured calf-strengthening programme is one of the few things shown to help.",
    "Protect the skin around the ankle: that is where ulcers start, and preventing one is vastly easier than healing one."],
  ["Post-thrombophlebitis reconditioning", "post-?thrombophlebitis",
    "Thrombophlebitis is a clot with inflammation in a vein — after it settles, the vein is often left hard, cord-like and tender.",
    "The hard cord you can feel along the vein is scarred vein, and it softens over months.",
    "Keep walking. Warmth and simple anti-inflammatories help the local discomfort.",
    "Expect a firm, tender cord for weeks to months — that is normal healing, not an ongoing clot.",
    "Superficial clots can extend into the deep system, so report increasing pain, swelling or redness spreading up the leg."],
  ["Superficial thrombophlebitis (reconditioning)", "superficial thrombophlebitis|superficial vein thrombos",
    "Superficial thrombophlebitis is a clot in a surface vein — painful, red and hard along its length, but not the same danger as a DVT.",
    "It is usually far less serious than a DVT, but it is not always trivial: extensive ones, or ones near the groin, can extend into the deep veins and are sometimes anticoagulated.",
    "Keep walking and keep the leg moving — this does not need rest. Compression helps the pain.",
    "Report spreading redness, increasing swelling of the whole limb, or fever — those suggest extension or infection.",
    "Recurrent episodes without an obvious cause deserve investigation."],
  ["Chronic venous insufficiency (exercise)", "chronic venous insufficiency|venous insufficiency|venous hypertension",
    "In chronic venous insufficiency the valves in the leg veins no longer close properly, so blood falls back down and pressure builds at the ankle.",
    "This is the condition where exercise is most directly mechanical: you are rebuilding the pump that the broken valves can no longer support.",
    "Compression from the moment you get up. Elevate above heart height when resting.",
    "Structured calf-muscle training measurably improves the pump function and the symptoms — this is well evidenced and under-used.",
    "Avoid long static standing, keep moving, keep the skin moisturised, and keep weight down — every one of those lowers the pressure at your ankle."],
  ["Chronic venous ulcer (exercise adjunct)", "venous ulcer|venous leg ulcer",
    "A venous ulcer is a wound — usually just above the ankle — caused by sustained venous pressure damaging the skin.",
    "⚠️ COMPRESSION is what heals venous ulcers, and exercise on top of compression heals them faster and reduces recurrence. Exercise is the adjunct here; the compression is the treatment.",
    "Compression bandaging as prescribed, and elevate the leg above heart height whenever you rest. Keep walking — immobility is what keeps these open.",
    "Progressive calf exercise improves healing rates. Ankle range matters: a stiff ankle cannot pump, and many people with long-standing ulcers have lost most of theirs.",
    "Recurrence is common and lifelong compression stockings are what prevent it — the ulcer healing is the halfway point, not the finish. Report increasing pain, spreading redness, odour or fever: that is infection."]
];
VENOUS.forEach(([label, r, note, key, early, mid, late]) =>
  add({ r, label, ...A.cardiacVenous({ label, r, note, key, early, mid, late }) }));

/* ── 16. Lymphoedema — the "lifting is dangerous" myth is wrong (PAL trial) ── */
A.cardiacLymph = (s) => ({
  total: 20,
  freq: "Daily — compression on, gradual progression, consistency over intensity",
  note: `${s.note} ⚠️ The most important thing to know here overturns the old advice: SLOWLY PROGRESSIVE RESISTANCE TRAINING IS SAFE and does NOT worsen lymphoedema — the trials that tested it found FEWER flare-ups in the people who lifted weights, not more. For decades people were told to avoid lifting with an affected limb, and that advice caused avoidable weakness and disability. The rules that actually matter are: wear your compression, start light, and progress slowly. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Established lymphoedema, stable", scale: 1 },
    { k: "upper", label: "Arm / upper limb", sub: "Usually after breast-cancer treatment", pick: "upper limb|\\barm\\b|breast", scale: 0.9,
      note: "Arm lymphoedema most often follows breast-cancer surgery or radiotherapy. This is exactly the group studied in the PAL trial: supervised, slowly progressive weight training did not worsen swelling and reduced flare-ups. Wear your sleeve during exercise, and get the programme started under supervision." },
    { k: "lower", label: "Leg / lower limb", sub: "Lower-limb swelling", pick: "lower-limb|lower limb|\\bleg\\b", scale: 1.1,
      note: "Leg lymphoedema has gravity working against it all day, so compression matters even more and the volumes involved are larger. The calf pump does real work here: walking and calf raises help directly." },
    { k: "nodes", label: "After lymph-node dissection", sub: "Nodes surgically removed", pick: "lymph-node|node dissection|axillary|groin dissection", scale: 1.1,
      note: "After node dissection the drainage routes are permanently reduced, so the limb has less reserve — but the remaining vessels do adapt and collateral drainage develops. Starting gently and building slowly is what lets that adaptation happen. Risk is lifelong, so the skin care is lifelong too." },
    { k: "cellulitis", label: "History of cellulitis", sub: "Recurrent skin infections", pick: "cellulitis|infection", scale: 1.4,
      note: "⚠️ Cellulitis in a lymphoedematous limb is a serious, recurring problem: each episode damages more lymphatics and makes the swelling worse, creating a vicious cycle. Meticulous skin care, treating athlete's foot and any break in the skin promptly, and knowing when to start antibiotics are all central. Some people keep a standby course at home." }
  ],
  ph: [
    ["Skin care, compression & gentle movement", 0, 3,
      "Get the compression and skin care right, and start gentle, rhythmic movement.",
      "compression worn correctly and daily, skin-care routine established, gentle range and pumping exercises done",
      `Compression garment on for every session — this is the one non-negotiable. ⛔ Skin care is the biggest safety issue: a hot, red, swollen, tender limb WITH fever or feeling unwell is CELLULITIS and needs antibiotics urgently — not a workout. Treat every cut, bite and crack promptly, moisturise daily, and treat athlete's foot. ${s.extra}`],
    ["Start slowly progressive resistance work", 3, 8,
      "Begin light resistance training — properly, slowly, with compression on.",
      "light resistance work twice a week with compression on, no sustained increase in swelling, confident with the routine",
      "Start LIGHT — lighter than you think necessary — and add small increments. The evidence says this is safe; it also says the safety comes from the slow progression. If the limb is heavier or tighter for more than a day after a session, drop back a level and build again more slowly. A short-lived feeling of fullness during or just after exercise is normal and settles."],
    ["Build strength & aerobic capacity", 8, 14,
      "Progress the loading and add aerobic work.",
      "resistance training progressing steadily, 30 minutes of aerobic exercise most days, limb volume stable",
      `Keep progressing — slowly. Aerobic exercise helps too, and being a healthy weight measurably reduces lymphoedema severity, so the two work together. Deep breathing exercises genuinely assist lymph flow through the chest. ${VALSALVA}`],
    ["Lifelong management", 14, 20,
      "Make it permanent — this is management, not cure.",
      "exercise routine sustained, compression and skin care habitual, limb stable, flare plan understood",
      "Lymphoedema is managed rather than cured, and the management is lifelong: compression, skin care, exercise and weight. The good news is that people who stay strong and active have fewer flares, less swelling and better function — the old advice to protect the limb by not using it achieved the opposite. Report any sudden increase in swelling, or signs of infection, promptly."]
  ]
});
const LYMPH = [
  ["Lymphedema (exercise management)", "lymph(o)?edema \\(exercise management\\)|lymph(o)?oedema \\(exercise",
    "Lymphoedema is swelling caused by a lymphatic system that cannot drain the fluid the limb produces — so protein-rich fluid accumulates in the tissues.",
    "Elevate the limb when resting, and avoid very hot baths and saunas, which increase the fluid load."],
  ["Lower-limb lymphedema (exercise management)", "lower-limb lymph(o)?edema|lower limb lymph(o)?edema",
    "Lower-limb lymphoedema is lymphatic swelling of the leg, with gravity working against drainage all day long.",
    "Elevate the leg above heart height when resting, and take the compression off only at night. Check between your toes daily — athlete's foot is a classic route in for cellulitis."],
  ["Post-lymph-node-dissection lymphedema (limb)", "lymph-node-dissection lymph(o)?edema|post-?lymph-?node dissection|node dissection lymph",
    "After lymph nodes are surgically removed, the limb they drained has permanently reduced drainage capacity — and swelling can appear months or years later.",
    "The risk is lifelong, so the skin care is lifelong. Avoid burns, cuts and insect bites on that limb where you can, and treat any that happen promptly."],
  ["Lymphedema (general)", "lymph(o)?edema|lymph(o)?oedema|lymphatic insufficiency",
    "Lymphoedema is swelling from a lymphatic system that cannot clear the fluid a limb produces.",
    "Elevate the limb when resting; avoid very hot baths and saunas."]
];
LYMPH.forEach(([label, r, note, extra]) => add({ r, label, ...A.cardiacLymph({ label, r, note, extra }) }));

/* ── 17. Adult congenital heart disease ───────────────────────────────────── */
A.cardiacACHD = (s) => ({
  total: 20,
  freq: "Aerobic most days + resistance 2×/week, within your ACHD team's limits",
  note: `${s.note} ${s.key} Adults with congenital heart disease were, for decades, told to take it easy — and the result was a generation who became deconditioned rather than safe. Most people with repaired congenital heart disease should be exercising, and the great majority of them can do far more than they were led to believe. What you need is YOUR specific ceiling from an ACHD specialist, not a general one. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Repaired & stable", sub: "Good repair, no significant residual problem", scale: 1 },
    { k: "residual", label: "With a residual lesion", sub: "A leak, narrowing or enlarged chamber remains", pick: "residual|regurgitation|stenosis|dilat", scale: 1.25,
      note: "Very few congenital repairs are truly 'cured' — most leave something behind, and that residual lesion is what your surveillance is tracking. It usually does not stop you exercising, but it does mean your ceiling is a specialist's decision and that the scans matter." },
    { k: "arrhythmia", label: "With an arrhythmia", sub: "Rhythm problems as well", pick: "arrhythmi|atrial|flutter|fibrillation|tachycard", scale: 1.3,
      note: "Arrhythmia is the commonest late complication of congenital heart disease — scar from the original repair provides the circuit. Use RPE if your rate response is erratic, and report palpitations, dizziness or blackouts rather than pushing through: in ACHD these are usually worth investigating." },
    { k: "cyanotic", label: "Cyanotic / low oxygen saturations", sub: "Oxygen levels run low", pick: "cyanotic|cyanosis|desaturat", scale: 1.5,
      note: "⚠️ With cyanotic physiology your saturations fall further with exercise, and that is expected rather than alarming — but the ceiling is genuinely lower and must be set by your ACHD team. Dehydration is dangerous here because the blood is already thick: drink properly. Never let anyone give you an air-containing IV line, and get dental work covered — paradoxical emboli are a real risk." },
    /* Overrides XCUT `athlete`: sport clearance in ACHD is a specialist decision. */
    { k: "athlete", label: "Competitive sport question", sub: "You want to compete", pick: "return-to-sport|athlet", scale: 1.15,
      note: "Competitive sport with congenital heart disease is decided case by case by an ACHD specialist — for many simple repaired lesions the answer is yes with few limits, while for Fontan, cyanotic physiology, aortopathy or significant arrhythmia it is far more restricted. Get the answer from someone holding your imaging." }
  ],
  ph: [
    ["Get your specific ceiling from an ACHD specialist", 0, 3,
      "Find out what YOUR anatomy allows — the general advice is not the answer here.",
      "you know your exact diagnosis, what was repaired, any residual lesions, and your agreed limits; under ACHD follow-up",
      `${s.limit} Make sure you are under a specialist ADULT congenital service — this is a small subspecialty and general cardiology often is not equipped for it. Many adults fall out of follow-up in their late teens and turn up in trouble years later; if that is you, get back in. ${CARDIAC_STOP}`],
    ["Build an aerobic base", 3, 9,
      "Build steady aerobic fitness within your limits.",
      "30 minutes of continuous moderate activity, no palpitations or unusual breathlessness, confident with your limits",
      `${RPE_RULE} ${s.limit}`],
    ["Add strength & capacity", 9, 15,
      "Add resistance work and raise your capacity.",
      "resistance training twice a week, aerobic capacity improved, doing things you had assumed were off-limits",
      `${s.load} ${VALSALVA}`],
    ["Lifelong activity & surveillance", 15, 20,
      "Build a permanently active life, with permanent follow-up.",
      "≥150 min/week sustained, ACHD follow-up and imaging up to date, contraception / pregnancy discussed if relevant",
      "Congenital heart disease needs lifelong specialist follow-up — the commonest serious mistake adults make is drifting out of it while feeling well. Report a genuine drop in exercise capacity, new palpitations or blackouts. If you might become pregnant, discuss it BEFORE conceiving: the risk varies enormously by lesion, and some need managing from the start."]
  ]
});
const ACHD = [
  ["Tetralogy of Fallot (repaired, adult)", "tetralogy of fallot|\\btof\\b.{0,12}repair|repaired tetralogy",
    "Tetralogy of Fallot is four linked defects repaired in infancy — closing a hole between the ventricles and relieving the obstruction to the lungs.",
    "The near-universal legacy is a LEAKING PULMONARY VALVE, which slowly enlarges the right ventricle over decades. That, and the arrhythmia risk from the original surgical scar, are what your follow-up is tracking.",
    "Most adults with repaired TOF exercise well and should. Your MRI measurements of the right ventricle are what decide the timing of a pulmonary valve replacement — often before you notice anything, which is exactly why the scans matter.",
    "Resistance work is usually fine. Report palpitations and any drop in capacity — arrhythmia is the main late risk and a real cause of sudden death in this group."],
  ["Atrial septal defect (repaired)", "atrial septal defect|\\basd\\b",
    "An atrial septal defect is a hole between the two upper chambers, closed either with a device through a vein or surgically.",
    "A closed ASD in an adult with normal lung pressures is close to a cure — most people have no restriction at all and a normal life expectancy.",
    "Usually no restriction after successful closure. If it was closed with a device you will take antiplatelets for a few months and need endocarditis-aware dental care for six. Late atrial arrhythmia is the main thing to watch for, especially if it was closed later in life.",
    "No specific load restriction for a well-closed ASD with normal lung pressures. Report palpitations."],
  ["Ventricular septal defect (repaired)", "ventricular septal defect|\\bvsd\\b",
    "A ventricular septal defect is a hole between the two pumping chambers, usually closed with a patch in childhood.",
    "A well-repaired VSD with normal lung pressures usually means a normal heart and a normal life — this is one of the best outcomes in congenital cardiology.",
    "Usually no restriction after a good repair. Small residual leaks are common and rarely matter. Keep endocarditis prevention in mind for dental work if a patch or device was used.",
    "No specific load restriction for a well-repaired VSD with normal lung pressures."],
  ["Coarctation of the aorta (repaired)", "coarctation",
    "Coarctation is a narrowing of the aorta, repaired by surgery or a stent — usually in childhood.",
    "⚠️ Repair is NOT a cure: hypertension persists or returns in a large proportion of people even after a technically perfect repair, and it is the main long-term threat. Re-narrowing and aneurysm at the repair site are the others.",
    "⚠️ Have your blood pressure checked in BOTH arms and compared with your legs — a gradient means re-coarctation. Blood-pressure control is the single most important thing in your long-term care, and it is frequently under-treated in this group. Keep your aortic imaging up to date.",
    "⚠️ Avoid maximal and heavy isometric lifting, which spikes aortic pressure — particularly important if there is any aneurysm or residual narrowing at the repair site. Dynamic aerobic exercise is encouraged. A bicuspid aortic valve coexists in a majority of people with coarctation, so ask whether you have one."],
  ["Ebstein anomaly (reconditioning)", "ebstein",
    "In Ebstein anomaly the tricuspid valve is displaced down into the right ventricle, so it leaks and the right heart is enlarged and inefficient.",
    "The severity varies enormously — from a lifelong non-issue to severe disease — so general statements are almost useless here. Accessory electrical pathways (WPW) are common with it, which is why arrhythmia features so heavily.",
    "Ask where your severity sits. Report palpitations: accessory pathways and atrial arrhythmias are common and very treatable with ablation. A hole between the atria often coexists, which can drop your oxygen levels on exertion and creates a paradoxical-embolus risk.",
    "Moderate exercise suits most people with mild-to-moderate disease. Severe disease needs a specialist ceiling."],
  ["Transposition (post arterial switch)", "transposition|arterial switch|\\btga\\b|post arterial switch",
    "In transposition the two great arteries come off the wrong ventricles; the arterial switch operation moves them back to the correct chambers in the first weeks of life.",
    "The arterial switch gives an excellent long-term result — most adults have near-normal hearts, exercise normally and were never meaningfully limited.",
    "The things followed are the coronary arteries (they were moved during the switch and are rarely a problem), the neo-aortic valve, and any narrowing at the suture lines. Report chest pain on exertion, which given the moved coronaries is worth taking seriously rather than dismissing.",
    "Most people need no restriction after an arterial switch. If you had the OLDER atrial switch (Mustard or Senning), the picture is quite different — the right ventricle is doing the systemic work, capacity is lower, arrhythmias are common, and you need a specialist ceiling."],
  ["Patent ductus arteriosus (repaired)", "patent ductus arteriosus|\\bpda\\b|ductus arteriosus",
    "The ductus arteriosus is a normal fetal blood vessel that should close at birth; when it stays open it is closed with a device or surgically.",
    "A closed PDA in someone with normal lung pressures is a genuine cure — this is the most straightforwardly fixed of all congenital heart lesions.",
    "Usually no restriction and no ongoing follow-up needed after successful closure. Endocarditis-aware dental care for six months after a device.",
    "No load restriction after a well-closed PDA. Train normally."],
  ["Congenital heart disease (adult, cleared)", "congenital heart disease|adult congenital|\\bachd\\b|grown-?up congenital",
    "Adult congenital heart disease covers everything from a closed hole with a completely normal heart to a single-ventricle circulation — the term itself tells you very little.",
    "There are now more adults than children living with congenital heart disease, and most of them should be exercising more than they are. The old blanket caution did real harm.",
    "Get your specific diagnosis, what was done, what is left, and your agreed ceiling from an ADULT congenital specialist — general advice cannot substitute for that here.",
    "The right load limits depend entirely on your anatomy: aortopathy and cyanotic lesions restrict lifting; most simple repaired lesions do not restrict anything."]
];
ACHD.forEach(([label, r, note, key, limit, load]) => add({ r, label, ...A.cardiacACHD({ label, r, note, key, limit, load }) }));

/* Fontan — bespoke: no ventricle drives the lungs, so the LEG MUSCLES do. */
add({ r: "fontan|single ventricle|total cavopulmonary", label: "Fontan circulation (exercise)", total: 26,
  freq: "Aerobic most days, moderate and steady + light resistance 2–3×/week — under ACHD supervision",
  note: "In a Fontan circulation there is only one working ventricle, so the veins are plumbed DIRECTLY into the lungs — there is no pump pushing blood through them at all. Blood flows to your lungs passively, driven by the pressure in your veins, your breathing, and — critically — YOUR LEG MUSCLES. 🦵 This is why exercise is not merely allowed in a Fontan: your skeletal muscle is functionally a second heart, and training it directly improves your circulation. Fontan patients were once told to avoid exercise; we now know that was exactly backwards, and that fitter Fontan patients do better on almost every measure. Your capacity is genuinely reduced (a Fontan cannot raise its output much), but it IS trainable, and every bit matters.",
  variants: [
    { k: "standard", label: "Stable Fontan", sub: "Well, under ACHD follow-up", scale: 1 },
    { k: "athlete", label: "Wants to do more / sport", sub: "Pushing capacity", pick: "return-to-sport|athlet", scale: 1.15,
      note: "Many people with a Fontan safely do a great deal — recreational sport, hiking, cycling. What is generally avoided is maximal straining, heavy isometric lifting (it obstructs venous return, which IS your pulmonary blood flow), contact sport if you are anticoagulated, and diving. Competitive sport is an ACHD specialist's decision on your anatomy and function." },
    { k: "failing", label: "Failing Fontan", sub: "Declining capacity, fluid, protein loss or liver problems", pick: "failing|protein-losing|plastic bronchitis|cirrhosis|liver", scale: 1.6,
      note: "⚠️ A failing Fontan — falling exercise capacity, fluid retention, protein-losing enteropathy, or liver disease — is a serious and specialist situation. Exercise still helps but every step is prescribed and supervised by your ACHD team, and any decline in what you can do needs reporting promptly rather than training through." },
    { k: "arrhythmia", label: "With arrhythmia", sub: "Atrial rhythm problems", pick: "arrhythmi|atrial|flutter|fibrillation", scale: 1.35,
      note: "Atrial arrhythmias are common in a Fontan and are badly tolerated: the circulation depends on smooth, low venous pressure, and losing sinus rhythm can cause an abrupt deterioration. Report palpitations promptly — this is not a wait-and-see situation." },
    { k: "anticoag", label: "On anticoagulation", sub: "Taking a blood thinner", pick: "anticoagul|warfarin|\\bdoac\\b", scale: 1,
      note: "Anticoagulation is common in a Fontan because sluggish venous flow clots easily. No contact or collision sport, and report significant head injuries. Do not stop it for exercise." }
  ],
  ph: [
    ["Understand your circulation & get your limits", 0, 4,
      "Understand why your legs matter so much, and get your ceiling from an ACHD specialist.",
      "under ACHD follow-up, you know your agreed limits, hydration habit established, walking daily",
      "💧 HYDRATION IS A SAFETY ISSUE, not a comfort one: your lungs are perfused by venous pressure, so dehydration directly reduces blood flow to your lungs and can drop you. Drink properly before, during and after — and be extra careful in heat. ❌ Avoid heavy straining and breath-holding: bearing down raises the pressure in your chest, which OBSTRUCTS the passive flow into your lungs. Breathe out on effort, always. ⛔ Report new palpitations, blackouts, or a drop in capacity promptly."],
    ["Build steady aerobic work — the leg pump", 4, 10,
      "Build steady aerobic exercise: your legs are pumping blood through your lungs.",
      "20–30 minutes of continuous moderate activity, comfortable with your pacing, no dizziness",
      "Rhythmic leg work — walking, cycling, swimming — is ideal, because the calf pump is directly driving your pulmonary blood flow. Swimming is particularly good: the water pressure assists venous return, and being horizontal helps too. Expect to be more breathless than others at the same pace: that is your physiology, not poor effort. Pace steadily rather than in surges."],
    ["Add light resistance & build capacity", 10, 18,
      "Add light resistance work — muscle is circulation for you.",
      "light-to-moderate resistance training 2–3×/week without straining, aerobic capacity improved, daily life easier",
      "Light-to-moderate resistance work with free breathing builds the muscle pump that drives your circulation — it is genuinely therapeutic. But NO maximal lifting and no Valsalva: a heavy strain obstructs venous return and, in a Fontan, venous return is your cardiac output. High reps, light loads, breathe throughout."],
    ["Lifelong conditioning & surveillance", 18, 26,
      "Keep conditioning permanently, with lifelong specialist follow-up.",
      "activity sustained most days, ACHD follow-up and liver surveillance up to date, hydration and pacing habitual",
      "Staying fit is one of the few things you genuinely control that improves how a Fontan does over decades. Follow-up is lifelong and must include LIVER surveillance — chronic high venous pressure damages the liver over the years (Fontan-associated liver disease) and it is silent until late. Report declining capacity, fluid retention, or swelling of the abdomen promptly."]
  ] });

/* ── 18. Myocarditis / pericarditis — RETURN-TO-EXERCISE RESTRICTION.
   This is the archetype where people actually die. Phase 1 is a BAN, and it is
   deliberately long: exercising through myocarditis is a leading cause of sudden
   cardiac death in young people. Nothing here is retimed shorter. ── */
const RTE_BAN =
  "⛔ NO EXERCISE. This is not caution — it is the entire treatment, and it is the one instruction on this page that can save your life. While the heart muscle is inflamed, exercise can trigger a fatal rhythm: myocarditis causes a substantial share of sudden cardiac deaths in young people and athletes, and the deaths characteristically happen in people who felt well enough to train. Feeling fine means nothing here — the inflammation is invisible and you cannot feel it resolving. Abstain from ALL sport and moderate-to-vigorous exercise until you are formally re-assessed and cleared.";
A.cardiacInflam = (s) => ({
  total: 39,
  freq: `NOTHING for ${s.ban}; then a slow, formally cleared, graded return`,
  note: `${s.note} ${s.key} ⚠️ The defining feature of this diagnosis is a RETURN-TO-EXERCISE RESTRICTION of roughly ${s.ban} — and it exists because this is genuinely where people die. Recovery is not judged by how you feel: it is judged by tests (echo, ECG/Holter, blood markers, often an MRI). Feeling fine is not clearance. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "Uncomplicated, function normal", scale: 1 },
    { k: "athlete", label: "Athlete / competitive sport", sub: "You train or compete seriously", pick: "return-to-sport|athlet", scale: 1.15,
      note: "⛔ Athletes are the highest-risk group here and the ones who most often push back on this advice — which is precisely why myocarditis is a leading cause of sudden cardiac death in sport. Guidelines require abstinence from all competitive sport for 3–6 months, followed by FORMAL re-evaluation (echo, 24-hour Holter, exercise test, usually cardiac MRI) before any return. There is no version of this where you self-clear because you feel fine, and no medal worth the alternative." },
    { k: "reducedef", label: "With reduced heart function", sub: "The inflammation weakened the pump", pick: "reduced ejection|low ejection|\\bhfref\\b|dysfunction", scale: 1.5,
      note: "If the inflammation has left the pumping function reduced, the restriction is longer, the heart-failure rules apply on top, and return depends on function recovering. A proportion of people are left with a dilated cardiomyopathy — which is treatable, but changes this from an episode into a condition." },
    { k: "arrhythmia", label: "With arrhythmia", sub: "Rhythm problems during the illness", pick: "arrhythmi|ventricular|palpitation|\\bvt\\b", scale: 1.6,
      note: "⛔ Arrhythmia during myocarditis is the highest-risk feature there is and extends the restriction considerably — the scar left by the inflammation provides a permanent substrate for dangerous rhythms. Clearance requires a clean Holter and exercise test, and some people need an ICD. Do not negotiate this timeline." },
    { k: "recurrent", label: "Recurrent", sub: "It has come back", pick: "recurrent|relaps|repeat", scale: 1.4,
      note: "Recurrence is common in pericarditis in particular (roughly 15–30%), and each episode restarts the clock. Stopping colchicine early is a leading cause of recurrence — finish the full course even though you feel better. Recurrent pericarditis is unpleasant but rarely dangerous; recurrent myocarditis is a different matter and needs specialist input." },
    { k: "viral", label: "After a viral illness", sub: "Followed a viral infection", pick: "viral|post-?viral|covid|influenza", scale: 1,
      note: "Most myocarditis follows a viral illness — which is exactly why 'train through a chest infection' is such dangerous advice. The general rule is worth keeping for life: if you have symptoms BELOW the neck (fever, body aches, chest symptoms), do not train. Above the neck only (a blocked nose), gentle activity is usually fine." }
  ],
  ph: [
    ["Complete rest — the restriction IS the treatment", 0, s.p1,
      "Do not exercise. Let the inflammation resolve completely.",
      "symptoms resolved, blood markers (troponin/CRP) normalised, no arrhythmia — confirmed by your team, NOT by how you feel",
      `${RTE_BAN} ${s.rest}`],
    ["Continued abstinence & formal re-assessment", s.p1, s.p2,
      "Stay off exercise and complete the formal tests that decide whether you can return.",
      "re-assessment done (echo, ECG/Holter, exercise test, usually cardiac MRI), function normal, no arrhythmia, and FORMAL clearance given",
      `⛔ Still no sport and no moderate-to-vigorous exercise. Normal daily activity — walking about, work, stairs — is fine unless told otherwise; it is the training that is banned, not living. Clearance is a decision made ON TEST RESULTS by your cardiologist. If your MRI still shows inflammation or oedema, the clock keeps running regardless of how well you feel. ${s.rest}`],
    ["Graded, monitored return to exercise", s.p2, s.p3,
      "Return gradually and deliberately — only after formal clearance.",
      "cleared in writing, tolerating progressive light-to-moderate exercise with no symptoms, no palpitations",
      "Only start this phase once you have been formally CLEARED. Then return gradually over weeks, not days — start well below your old level and build. ⛔ STOP and be re-assessed immediately for any chest pain, palpitations, unusual breathlessness, dizziness or fainting during the return: those mean the process has to pause, not that you should push on. Expect your fitness to have dropped substantially after months off; that is normal and it comes back."],
    ["Full return & long-term follow-up", s.p3, 39,
      "Rebuild to full capacity and keep the follow-up going.",
      "back to full training or activity without symptoms, follow-up imaging as arranged, clear on the rules if it recurs",
      "Most people recover completely and return to everything they did before. Some are left with scar that carries a long-term rhythm risk, which is why the follow-up imaging matters even once you feel entirely well. Remember the lesson for life: never train through a febrile illness — that is how this starts."]
  ]
});
const INFLAM = [
  ["Myocarditis recovery (cleared)", "myocarditis", "3–6 months", 12, 24, 32,
    "Myocarditis is inflammation of the heart MUSCLE itself, usually triggered by a virus.",
    "⚠️ This is the diagnosis in this app where the restriction matters most: inflamed heart muscle is electrically unstable, and exercise on top of it can trigger a fatal arrhythmia. The current guidance is abstinence from all competitive sport and moderate-to-vigorous exercise for 3–6 months from the onset of the illness, then formal re-evaluation before ANY return.",
    "Rest, and treat the illness. Avoid alcohol and NSAIDs unless your team specifically says otherwise (in myocarditis, unlike pericarditis, NSAIDs are often discouraged). Report any palpitations, blackouts, breathlessness or ankle swelling immediately."],
  ["Pericarditis recovery (cleared)", "pericarditis", "1–3 months (longer for athletes)", 4, 12, 20,
    "Pericarditis is inflammation of the SAC around the heart rather than the muscle — hence the sharp chest pain that is worse lying flat and better sitting forward.",
    "Pericarditis is far less dangerous than myocarditis because the muscle is not inflamed — but exercise makes it flare and prolongs it, so restriction until symptom-free with a normal CRP is standard. Athletes are generally held to 3 months. Some people have myopericarditis — both together — and then the myocarditis rules govern, so make sure you know which you have.",
    "Take the full course of colchicine — stopping it early is a leading cause of recurrence, and recurrence affects up to a third of people. NSAIDs plus colchicine is the standard treatment. Report breathlessness, swelling, or feeling faint: a large effusion can compress the heart (tamponade) and that is an emergency."],
  ["Constrictive pericarditis (reconditioning)", "constrictive pericarditis", "until your team clears you", 4, 10, 20,
    "In constrictive pericarditis the sac around the heart has become scarred and rigid, squeezing the heart so it cannot fill.",
    "This is a mechanical problem rather than an inflammatory one: the heart cannot fill, so output is fixed and low, and exercise capacity is genuinely limited no matter how hard you try. Fluid, swollen legs and a distended abdomen dominate the picture. The definitive treatment is surgical removal of the sac (pericardiectomy), and reconditioning works best after it.",
    "Expect a fixed, low ceiling until it is treated — this is not something you can train through. Weigh yourself daily and report fluid gain. If you have had a pericardiectomy, improvement can take months to arrive as the squeezed muscle recovers."],
  ["Infective endocarditis recovery", "infective endocarditis|bacterial endocarditis|\\bendocarditis\\b", "the duration of your antibiotic course and beyond", 6, 14, 24,
    "Infective endocarditis is an infection of the heart valves themselves, treated with weeks of intravenous antibiotics and sometimes surgery.",
    "This is a serious systemic illness, not just a heart problem: you have been through weeks of IV antibiotics, often with fevers, weight loss and profound deconditioning. Any valve damage left behind is permanent and sets your limits, and if you needed valve surgery those precautions apply too.",
    "Complete the full antibiotic course — relapse is a real risk. Report fever, night sweats, new breathlessness or any stroke symptoms urgently: emboli from the valve are the classic complication. Dental hygiene now matters for life, and you will need antibiotic cover for dental work: you are in the highest-risk group for a repeat."],
  ["Post-infective-endocarditis reconditioning", "post-?infective-?endocarditis|post-?endocarditis", "the duration of your antibiotic course and beyond", 6, 14, 24,
    "Reconditioning after an episode of infective endocarditis has been treated.",
    "The deconditioning after weeks of IV antibiotics and systemic illness is usually profound and is the main thing limiting you now — that is trainable. Any residual valve damage sets the ceiling, so find out what was left behind.",
    "Report fever, night sweats or new breathlessness — relapse and late valve failure both happen. Lifelong dental care and antibiotic prophylaxis: having had endocarditis once is the strongest risk factor for having it again."]
];
INFLAM.forEach(([label, r, ban, p1, p2, p3, note, key, rest]) =>
  add({ r, label, ...A.cardiacInflam({ label, r, ban, p1, p2, p3, note, key, rest }) }));

/* ── 19. Cardiometabolic — metabolic syndrome & type 2 diabetes ────────────── */
A.cardiacMetab = (s) => ({
  total: 26,
  freq: "Aerobic 5×/week + resistance 2–3×/week — and break up sitting every 30 minutes",
  note: `${s.note} ${s.key} Exercise works here through more than weight: it improves insulin sensitivity for 24–72 hours after EACH session, which is why frequency matters more than any single workout, and why 'don't go more than two days without' is a real prescription rather than a slogan. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "No complications", scale: 1 },
    /* Overrides XCUT `slowheal`, whose pick "diabet" auto-fires on "Type 2 diabetes"
       and would otherwise attach wound-healing advice to a cardiometabolic plan. */
    { k: "slowheal", label: "With diabetes complications", sub: "Neuropathy, retinopathy or kidney involvement", pick: "diabet|smoker", scale: 1.3,
      note: "⚠️ Complications change the exercise, not whether you do it. NEUROPATHY: you may not feel a blister or a stone in your shoe — inspect your feet daily, wear proper footwear, never go barefoot, and favour non-weight-bearing options if there is an active foot problem. RETINOPATHY: if it is proliferative or untreated, avoid heavy straining, breath-holding and head-down positions, which can bleed the eye — get it checked before starting heavy resistance work. KIDNEY DISEASE: exercise is safe and beneficial; just build gradually." },
    { k: "insulin", label: "On insulin or sulfonylureas", sub: "Medication that can cause hypos", pick: "insulin|sulfonylurea|gliclazide|glipizide", scale: 1.1,
      note: "⚠️ Insulin and sulfonylureas can cause HYPOGLYCAEMIA during and — importantly — for up to 24 hours AFTER exercise, with the delayed overnight hypo being the one that catches people out. Carry fast-acting carbohydrate always, check your glucose before and after early on, and do not inject into a limb you are about to work hard. Your doses may need reducing as you get fitter: that is success, but it needs managing with your team, not alone. Metformin and the newer drugs do not cause hypos on their own." },
    { k: "obese", label: "With significant obesity", sub: "Weight is the main driver", pick: "obes|weight|bariatric", scale: 1.2,
      note: "Start with what your joints will tolerate: walking, water-based exercise, cycling and seated work all avoid the pounding. Losing 5–10% of body weight produces a genuinely disproportionate improvement in blood pressure, glucose and lipids. And exercise matters even if the scales barely move — fitness independently predicts survival, and 'fat but fit' beats 'thin but unfit' in the data." },
    { k: "prediabetes", label: "Prediabetes", sub: "Not yet diabetic", pick: "prediabet|impaired glucose|insulin resistance", scale: 0.85,
      note: "At the prediabetes stage this is the highest-value intervention in the whole of preventive medicine: intensive lifestyle change cuts progression to type 2 diabetes by roughly 58% — outperforming metformin in head-to-head trials. This is the window where you can genuinely change the outcome." }
  ],
  ph: [
    ["Start moving & establish the habit", 0, 4,
      "Get moving most days and break up the sitting — start where you actually are.",
      "some activity on most days, sitting broken up regularly, baseline numbers known (BP, HbA1c, lipids, weight)",
      `${s.safety} Start where you are, not where you think you should be — the commonest failure here is starting too hard and quitting in three weeks. Breaking up long sitting with 2–3 minutes of movement every 30 minutes measurably improves glucose, independently of your workouts.`],
    ["Build aerobic volume", 4, 10,
      "Build toward 150 minutes a week of moderate aerobic exercise.",
      "150 min/week of moderate aerobic activity, no more than 2 consecutive days off, weight trending down",
      `${RPE_RULE} Do not go more than two days without exercising — the insulin-sensitivity benefit of a session lasts roughly 24–72 hours, so the gaps are what undo it. Consistency genuinely beats intensity here.`],
    ["Add resistance training", 10, 18,
      "Add resistance training — muscle is where glucose goes.",
      "resistance training 2–3×/week, HbA1c and blood pressure improving, waist reducing",
      `Resistance training is not optional in this plan: muscle is the largest site of glucose disposal in the body, so building it directly improves your glucose control — and combining aerobic and resistance work lowers HbA1c more than either alone. ${VALSALVA}`],
    ["Lifelong maintenance", 18, 26,
      "Make it permanent — this is the treatment, not a phase.",
      "≥150 min/week sustained, resistance work continuing, HbA1c / BP / lipids at target, medication reviewed",
      "The benefits reverse within days to weeks of stopping — insulin sensitivity falls first. This is a permanent change or it is nothing. As you get fitter your medication may need REDUCING: that is the goal, but do it with your team. Remember what this is actually for: metabolic syndrome and type 2 diabetes are cardiovascular diseases, and it is heart attacks and strokes you are preventing, not just numbers on a blood test."]
  ]
});
const METAB = [
  ["Metabolic syndrome (cardiac risk reduction)", "metabolic syndrome|syndrome \\(cardiac risk",
    "Metabolic syndrome is a cluster — central obesity, raised blood pressure, raised glucose, high triglycerides and low HDL — that together multiply cardiovascular risk well beyond the sum of its parts.",
    "Exercise improves every single component of the cluster at once, which no single drug does.",
    "If your blood pressure is very high (≥180/110) get it treated before vigorous exercise. Otherwise the main risk here is doing nothing."],
  ["Type 2 diabetes (cardiometabolic exercise)", "type 2 diabetes|\\bt2dm\\b|type ii diabetes|cardiometabolic exercise",
    "Type 2 diabetes is fundamentally a cardiovascular disease that shows up as a glucose problem — most people with it die of heart disease, which is why it sits in the cardiac section rather than a metabolic one.",
    "Exercise is a genuine glucose-lowering treatment: it drives glucose into muscle by a pathway that does not need insulin at all, which is exactly why it works when insulin resistance is the problem.",
    "⚠️ If you take insulin or a sulfonylurea, carry fast-acting carbohydrate and check your glucose — hypos can occur during and up to 24 hours after exercise. Inspect your feet daily if you have any neuropathy. If you have proliferative retinopathy, get it reviewed before heavy resistance work."]
];
METAB.forEach(([label, r, note, key, safety]) => add({ r, label, ...A.cardiacMetab({ label, r, note, key, safety }) }));

/* ── 20. Vasospasm & large-vessel vasculitis ──────────────────────────────── */
add({ r: "raynaud", label: "Raynaud's phenomenon (exercise)", total: 12,
  freq: "Aerobic most days — warm up indoors, and dress for the cold before you feel it",
  note: "In Raynaud's the small arteries of the fingers and toes clamp down in response to cold or stress, so the digits go white, then blue, then red and painful as blood returns. Exercise genuinely helps — it improves the health of the blood-vessel lining and boosts circulation — but the practical management is mostly about WARMTH and avoiding the triggers. The condition itself is rarely dangerous; it is the ulcers at the extreme end that matter.",
  variants: [
    { k: "primary", label: "Primary Raynaud's", sub: "On its own, no underlying disease", pick: "primary", scale: 1,
      note: "Primary Raynaud's — the common kind, typically starting young and often in the family — is a nuisance rather than a danger. It does not progress to tissue damage and needs warmth and reassurance more than treatment." },
    { k: "secondary", label: "Secondary Raynaud's", sub: "Part of another condition (scleroderma, lupus)", pick: "secondary|scleroderma|lupus|connective tissue|\\bsle\\b", scale: 1.4,
      note: "⚠️ Secondary Raynaud's — associated with scleroderma, lupus or another connective-tissue disease — is different: it CAN cause ulcers and tissue loss, and it needs rheumatology input. Starting after age 30, being asymmetrical, or causing ulcers are the features that suggest it. Report any digital ulcer or a finger that stays white promptly." },
    { k: "smoker", label: "Current smoker", sub: "Still smoking", pick: "smoker|smoking", scale: 1.3,
      note: "🚭 Nicotine constricts exactly the arteries that are already clamping down — smoking makes Raynaud's worse in a direct, mechanical way, and stopping helps quickly." },
    { k: "vibration", label: "Vibration-related", sub: "From tools or machinery at work", pick: "vibration|hand-arm|\\bhavs\\b|occupational", scale: 1.3,
      note: "Vibration-induced Raynaud's (hand-arm vibration syndrome) comes from years of power tools and it is an occupational disease — it can be permanent if exposure continues, so reducing or eliminating the vibration exposure is the treatment. This is reportable in many countries and your employer has duties here." }
  ],
  ph: [
    ["Warmth, triggers & getting started", 0, 2,
      "Get the warmth strategy right and start regular aerobic exercise.",
      "warm-clothing routine established, triggers identified, exercising most days",
      "Keep your CORE warm, not just your hands — your body shuts down the fingers to protect core temperature, so a warm torso is what keeps your hands open. Layers, gloves before you go out (not once you are cold), hats, and warm the car up first. Avoid sudden cold: the supermarket freezer aisle and cold tap are classic triggers. Stop smoking. Avoid decongestants, caffeine and beta-blockers where you can — all constrict. Report any finger ulcer or a digit that stays white and painful."],
    ["Build the aerobic habit", 2, 5,
      "Build regular aerobic exercise — it improves the vessels themselves.",
      "30 minutes of moderate exercise most days, attacks becoming less frequent or shorter",
      "Warm up INDOORS before going out into the cold, and dress for the temperature you will be in at the end of the session, not the start. If an attack begins, get warm and move — swinging the arms, putting hands in your armpits or under warm (not hot) water helps them reopen. Never use direct high heat on numb fingers: you can burn skin you cannot feel."],
    ["Strength & circulation work", 5, 9,
      "Add resistance training and hand/foot circulation work.",
      "resistance training twice a week, hand and foot warmth better maintained during activity",
      "Grip and hand exercises help maintain circulation. Keep the extremities protected during outdoor sessions — glove liners, warm socks, and hand warmers work well. Wet plus cold is far worse than cold alone, so stay dry."],
    ["Long-term management", 9, 12,
      "Keep it going year-round, and know what needs review.",
      "activity sustained, attacks manageable, clear on when to seek review",
      "Attacks are worse in winter and improve in summer — keep the exercise going year-round so you go into winter conditioned. Report a change in the pattern, ulcers, or sores on the fingertips: those move this from a nuisance to something needing rheumatology or vascular input."]
  ] });

A.cardiacVasculitis = (s) => ({
  total: 26,
  freq: "Daily gentle activity while on high-dose steroids; build as the dose comes down",
  note: `${s.note} ${s.key} The rehab problem here is usually not the artery — it is the STEROIDS: high-dose glucocorticoids waste the big muscles closest to the trunk, thin the bones and raise blood sugar, all within weeks. Resistance exercise is the direct antidote to all three, which is why exercise is part of the treatment rather than an afterthought. ${CARDIAC_STOP}`,
  variants: [
    { k: "standard", label: "Standard", sub: "On treatment, disease controlled", scale: 1 },
    { k: "highdose", label: "On high-dose steroids", sub: "40mg+ prednisolone or recently started", pick: "high-dose|steroid|prednis", scale: 1.3,
      note: "On high-dose steroids expect proximal weakness (getting out of a chair and climbing stairs get hard) within weeks, bone loss from the first months, mood and sleep disruption, and raised blood sugar. You should be on bone protection — ask if you are not. Resistance training now measurably limits all of this, and it is far easier to prevent the weakness than to rebuild it later." },
    { k: "tapering", label: "Tapering off steroids", sub: "Dose coming down", pick: "taper|reducing|weaning", scale: 0.9,
      note: "As the steroid dose falls, strength returns and your capacity climbs — this is the phase where progress feels rapid. But watch for a disease flare as the dose comes down, and report returning symptoms rather than pushing through them." },
    { k: "relapse", label: "Relapsing disease", sub: "It has flared again", pick: "relaps|flare|recurrent", scale: 1.4,
      note: "A relapse usually means the steroid dose goes back up, and with it another round of muscle and bone loss — so expect a step backwards and rebuild from a lower rung. Report returning symptoms early: flares treated early need less steroid." }
  ],
  ph: [
    ["Control the disease & protect muscle and bone", 0, 4,
      "Get the disease treated, and start protecting your muscle and bone from the steroids immediately.",
      "on treatment with symptoms settling, gentle daily activity established, bone protection and blood-sugar monitoring discussed",
      `${s.urgent} Start gentle resistance work NOW rather than waiting to feel better — steroid muscle and bone loss begin within weeks, and prevention is far easier than recovery. Ask about bone protection (calcium, vitamin D, often a bisphosphonate) and blood-sugar monitoring if you are on a high dose.`],
    ["Rebuild strength as the dose falls", 4, 12,
      "Rebuild the proximal strength the steroids have taken.",
      "getting out of a chair without using your arms, climbing stairs comfortably, walking 20–30 minutes",
      `Focus on the muscles closest to the trunk — thighs, hips, shoulders — because those are exactly what steroids waste. Sit-to-stand practice is the single most useful exercise here. ${s.limit} Balance work matters too: steroid-thinned bone plus weak thighs is how people break hips.`],
    ["Build capacity & bone loading", 12, 20,
      "Build aerobic capacity and load the bones deliberately.",
      "30+ minutes of continuous exercise, resistance training 2–3×/week, strength clearly recovered, steroid dose reducing",
      `Weight-bearing and resistance exercise are what maintain bone density against the steroids — this is a direct, evidenced protective effect. ${VALSALVA} ${s.limit}`],
    ["Maintenance & relapse awareness", 20, 26,
      "Keep the strength, and know the signs of a flare.",
      "≥150 min/week sustained, strength maintained, bone density checked, clear on relapse symptoms",
      `${s.urgent} Keep the resistance training going for as long as you are on steroids and beyond — bone recovers slowly. Report returning symptoms early rather than waiting for the next appointment: flares caught early are treated with less steroid, which is the whole game.`]
  ]
});
const VASCULITIS = [
  ["Giant cell arteritis (reconditioning)", "giant cell arteritis|temporal arteritis|\\bgca\\b",
    "Giant cell arteritis inflames the medium and large arteries, classically those in the temples — causing headache, scalp tenderness and jaw pain on chewing.",
    "It is treated with high-dose steroids, often for a year or more, and it frequently overlaps with polymyalgia rheumatica.",
    "⛔ NEW VISUAL SYMPTOMS ARE AN EMERGENCY: any loss of vision, double vision or a curtain across your sight means immediate medical attention — GCA can cause irreversible blindness within hours, and it is preventable only if treated fast. Do not wait to see how it goes. Jaw pain on chewing is the other classic warning.",
    "Steroid myopathy is often the main limiter — the weakness is the drug, not the disease, and it responds to training."],
  ["Takayasu arteritis (reconditioning)", "takayasu",
    "Takayasu arteritis inflames the aorta and its main branches, narrowing them — typically in young women — which is why it is sometimes called 'pulseless disease'.",
    "The narrowed subclavian arteries mean arm pulses and blood pressure can be absent or falsely low on one or both sides.",
    "⚠️ BLOOD PRESSURE IS UNRELIABLE in an affected arm — a normal reading there can hide dangerous hypertension elsewhere, so find out which limb gives a true reading and always use that one. Report new limb claudication, dizziness, or stroke symptoms. Arm claudication on exertion is common; discuss your limits with your rheumatology and vascular teams.",
    "Steroid myopathy plus the arterial narrowing both limit you. Aerobic work is beneficial; be guided on intensity by your team, especially with any cerebral or coronary involvement."]
];
VASCULITIS.forEach(([label, r, note, key, urgent, limit]) =>
  add({ r, label, ...A.cardiacVasculitis({ label, r, note, key, urgent, limit }) }));

/* ── 21. Athlete's heart — NOT a disease. Reassurance + detraining, not rehab.
   Note this overrides XCUT `athlete`, whose pick "athlet" WOULD otherwise fire on
   this very name and attach return-to-sport-after-injury advice to a healthy heart. */
add({ r: "athlete'?s heart|athletic heart|athletes heart", label: "Athlete's heart (reassurance reconditioning)", total: 12,
  freq: "Carry on training — this plan is about clarifying a finding, not treating a disease",
  note: "Athlete's heart is a NORMAL, physiological adaptation to years of training, not a disease: the chambers enlarge, the walls thicken a little, and the resting rate falls — all of which are how a trained heart is supposed to look. A resting pulse in the 40s, an impressive ECG and a big left ventricle are the rewards of your training, not warnings. It matters only because it can look like the conditions that DO kill athletes — hypertrophic cardiomyopathy and ARVC — so this is about distinguishing a normal adapted heart from a dangerous one. In the great majority of cases the answer is that everything is fine.",
  variants: [
    { k: "standard", label: "Confirmed physiological adaptation", sub: "Assessed, and it is normal athlete's heart", scale: 1 },
    { k: "athlete", label: "Currently training / competing", sub: "Actively in training", pick: "return-to-sport|athlet", scale: 1,
      note: "If this has been assessed and confirmed as physiological adaptation, there is no restriction at all and no reason to stop or modify your training. This plan exists to explain the finding, not to limit you." },
    { k: "greyzone", label: "Grey-zone finding", sub: "Between normal adaptation and cardiomyopathy", pick: "grey|gray|borderline|indeterminate|uncertain", scale: 2,
      note: "⚠️ The 'grey zone' — wall thickness around 13–15 mm, or a dilated but well-functioning ventricle — is where athlete's heart and cardiomyopathy genuinely overlap and cannot be told apart on one scan. Do not self-diagnose either way. This needs a sports-cardiology opinion, usually with an MRI, sometimes genetic testing, and occasionally a period of DETRAINING: a physiological heart regresses when you stop training, whereas a cardiomyopathy does not. That test takes 3 months and is worth doing properly." },
    { k: "family", label: "With a family history", sub: "Sudden death or cardiomyopathy in the family", pick: "family|genetic|inherited|sudden death", scale: 1.5,
      note: "⚠️ A family history of unexplained sudden death, drowning, or cardiomyopathy substantially changes the interpretation of any borderline finding — it should be a much lower threshold for full assessment and genetic testing. Mention it explicitly; it is the single most useful piece of information you can give a sports cardiologist, and it is routinely forgotten." },
    { k: "symptoms", label: "With symptoms", sub: "Blackouts, chest pain or palpitations on exertion", pick: "syncope|blackout|palpitation|chest pain|symptom", scale: 2,
      note: "⛔ Symptoms change everything. Fainting DURING exertion (as opposed to after finishing), chest pain on exertion, or palpitations with dizziness are never attributable to athlete's heart — they need urgent assessment before you train again. Exertional syncope in an athlete is a red flag until proven otherwise; this is the presentation that precedes deaths." }
  ],
  ph: [
    ["Clarify the finding", 0, 2,
      "Establish whether this is normal adaptation or something that needs attention.",
      "assessment arranged or done, family history discussed, no exertional symptoms",
      "⛔ The only things that genuinely worry a sports cardiologist: fainting or near-fainting DURING exercise, chest pain on exertion, palpitations with dizziness, or a family history of sudden unexplained death under 40. If you have any of those, stop training and get assessed BEFORE your next session. Without them, an enlarged heart and a slow pulse in a trained athlete are almost always physiological — and being told your ECG is 'abnormal' by someone unfamiliar with athletes' ECGs is extremely common and usually a false alarm."],
    ["Understand what was found", 2, 5,
      "Understand your specific findings and what they mean.",
      "you understand your echo/ECG findings, clear on whether any follow-up is needed",
      "Ask specifically whether the findings fit physiological adaptation or fall in the grey zone. Features that favour a NORMAL athlete's heart: symmetrical thickening under ~13 mm, a large chamber with excellent function, normal filling, a heart rate that behaves normally, and — importantly — findings that regress with detraining. Features that favour disease: asymmetrical thickening, a small chamber, impaired relaxation, arrhythmia, or a family history."],
    ["Train on (or detrain to test, if advised)", 5, 9,
      "Carry on training normally — or complete a detraining period if that was recommended.",
      "training normally without symptoms, or detraining period completed and re-scanned",
      "If it is physiological: no restriction whatsoever — carry on. If a detraining trial was advised, it needs about 3 months of genuinely reduced training to be interpretable, and it answers the question definitively: physiological adaptation regresses, a cardiomyopathy does not. Frustrating, but far better than the alternative of never knowing."],
    ["Ongoing training & sensible surveillance", 9, 12,
      "Train normally, with an appropriate level of ongoing checking.",
      "training normally, any recommended follow-up scheduled, clear on the symptoms that would need review",
      "For confirmed athlete's heart, no restriction and usually no routine follow-up beyond whatever screening your sport requires. Keep the rule for life: never train through a febrile illness (that is how myocarditis starts), and always report exertional blackouts, exertional chest pain, or palpitations with dizziness rather than explaining them away as fatigue or dehydration."]
  ] });

/* ── 22. Family catch-all. Label ends "(general)" → auto-flagged generic:true,
   so it can never outrank any specific plan above or any curated plan. ── */
add({ r: "cardiac deconditioning|cardiac rehab|cardiac reconditioning|heart condition|cardiovascular disease|\\bcvd\\b", label: "Cardiac reconditioning (general)", total: 26,
  freq: "Aerobic most days (build toward 150 min/week) + resistance 2–3×/week",
  note: "Exercise-based cardiac rehabilitation reduces cardiovascular death and re-hospitalisation, and it is one of the most effective and most under-used treatments in medicine — fewer than half the people who should be referred ever go. Progress by symptoms and perceived exertion rather than by heart rate, especially on a beta-blocker, which blunts the rate and makes target-HR maths meaningless. This is a general plan: if you know your specific diagnosis, choose it instead — the differences between them are substantial.",
  variants: PACE,
  ph: [
    ["Early mobilisation", 0, 2,
      "Re-establish safe everyday activity and learn your warning symptoms.",
      "walking short distances comfortably, confident about which symptoms mean stop",
      `Light activity only at this stage. ${CARDIAC_STOP}`],
    ["Early outpatient recovery", 2, 6,
      "Rebuild daily activity and start structured aerobic work.",
      "comfortable walking 10–20 minutes, no symptoms with light activity",
      `${RPE_RULE} Get referred to a supervised programme if you have not been — it is the single best thing available to you here.`],
    ["Supervised aerobic & resistance training", 6, 14,
      "Build aerobic capacity and strength, ideally supervised.",
      "30+ minutes of continuous moderate aerobic exercise, tolerating resistance work twice a week",
      `Progress gradually and report new chest symptoms straight away. ${VALSALVA}`],
    ["Long-term maintenance", 14, 26,
      "Make it lifelong and manage your risk factors.",
      "sustaining ≥150 min/week of moderate activity, risk factors actively managed",
      "The benefit fades within months of stopping — this is for life. Blood pressure, cholesterol, smoking and diabetes control do at least as much as the exercise; the exercise is what makes the rest of it worth having."]
  ] });

/* ===================== PULMONARY ===================== */
/* ============================================================================
   PULMONARY / RESPIRATORY rehab timelines
   ----------------------------------------------------------------------------
   Paste into scripts/generate-plans.mjs BEFORE the final G(...) catch-alls.
   In scope here: A, add, PACE, retime, XCUT.

   Cross-cutting variants (older adult, deconditioned, home-based, …) are
   appended by app.js planVariants() and deduped by key `k` — so they are NOT
   re-added below. Where a cross-cutting option would give actively WRONG advice
   (e.g. "Return-to-sport focus" or "progress by measurable increments" for
   someone with post-exertional malaise, or for pulmonary hypertension), the key
   is deliberately REDEFINED here so the safe version wins the dedupe.

   ⚠ ONE-WORD CHANGE NEEDED IN app.js FOR FULL EFFECT (see line ~2334):
     The curated REHAB_PLANS entry labelled "Pulmonary rehabilitation" matches
       /\bcopd\b|emphysema|chronic bronchitis|pulmonary rehab|pulmonary fibrosis
        |interstitial lung|bronchiectasis|\bild\b/
     and is NOT flagged generic. Curated plans are concatenated FIRST and
     detectPlan breaks ties with `len > bestLen` (strictly greater), so a curated
     plan matching an ENTIRE condition name can never be out-ranked: "Emphysema"
     (9 chars) and "Chronic bronchitis" (18 chars) are matched in full by it, and
     no regex here can match more characters than the name has. Those two keep
     the old 12-week template until that curated entry gets `generic: true`.
     With it added, all 97 pulmonary conditions resolve here, and the curated
     entry still does its real job — catching bare "COPD" / "ILD" /
     "Bronchiectasis" / "Pulmonary fibrosis" as the family catch-all, which is
     exactly what a generic is for. (Verified by simulating detectPlan against
     all 97 names both ways: 95/97 before the change, 97/97 after.)
     This is also why the ILD family entry below is deliberately NOT "(general)".

   Education only — a treating clinician's protocol always overrides.
   ========================================================================= */

/* ---------------------------------------------------------------- variants -- */

const OBSTRUCTIVE_VARIANTS = [
  { k:"standard", label:"Standard", sub:"Stable, between flare-ups", scale:1 },
  { k:"postexac", label:"Just after a flare-up", sub:"Recovering from an exacerbation or admission", pick:"exacerbation|flare|admission", scale:1.2,
    note:"Starting rehab within a few weeks of a flare-up gives the BIGGEST gains of all and cuts the chance of being readmitted — but start gently: a week in a hospital bed costs a surprising amount of leg strength." },
  { k:"oxygen", label:"On oxygen / dropping your sats", sub:"You use oxygen, or your sats fall when you walk", pick:"oxygen|desaturat|supervised|gold stage 4", scale:1.3,
    note:"Exercise WITH your oxygen exactly as prescribed — turning it off to 'try harder' is not bravery, it just starves the muscles you are trying to train. Intervals (short bursts with rests) let you do far more total work at a saturation you can hold." },
  { k:"frail", label:"Breathless washing & dressing", sub:"Breathless at rest or on tiny tasks", pick:"end-?stage|very severe", scale:1.45,
    note:"When you are breathless washing and dressing, those tasks ARE the training. Sitting to shower, a perching stool and pacing every step count as rehab, and the plan builds out from there." },
  { k:"niv", label:"On home NIV / retaining CO2", sub:"Overnight ventilation or raised CO2", pick:"\\bniv\\b|hypercapn|ventilat", scale:1.4,
    note:"With CO2 retention, exercise is still safe and worthwhile, but it must be paced and monitored — morning headaches, worsening drowsiness or confusion mean your ventilation needs review, not a harder push." }
];

const ASTHMA_VARIANTS = [
  { k:"standard", label:"Well controlled", sub:"Reliever needed twice a week or less", scale:1 },
  { k:"uncontrolled", label:"Poorly controlled right now", sub:"Frequent reliever, night waking, recent flare", pick:"severe persistent|step 4|uncontrolled|brittle", scale:1.4,
    note:"If you need your reliever more than twice a week, wake at night with symptoms, or have had a course of steroids in the last year, your asthma is NOT controlled. Fix that with your clinician first — training hard on uncontrolled asthma is how people end up in hospital, and the breathlessness you blame on fitness will not budge until control is sorted." },
  { k:"eib", label:"Exercise-induced only", sub:"Symptoms only with exercise", pick:"exercise.induced|\\beib\\b", scale:0.8,
    note:"True exercise-induced bronchoconstriction responds to a reliever 10–15 minutes BEFORE you start plus a long, progressive warm-up — that warm-up buys a refractory period of roughly 1–3 hours in most people. If your symptoms come on within seconds, sit in your THROAT rather than your chest, and no inhaler ever touches them, ask about laryngeal obstruction instead — it is commonly misdiagnosed as asthma." },
  { k:"ocs", label:"On steroid tablets / biologics", sub:"Maintenance prednisolone or an injectable", pick:"eosinophilic|biologic|steroid.dependent", scale:1.3,
    note:"Long-term steroid tablets weaken the big muscles closest to your hips and shoulders (steroid myopathy) and thin bone — so resistance training here is treating a side effect, not optional extra. Biologics have genuinely reduced steroid use for many people; ask whether you qualify." },
  { k:"allergic", label:"Allergy-driven", sub:"Pollen, pets, dust or mould set it off", pick:"allergic|eosinophilic|aspergillosis", scale:1.1,
    note:"Train indoors when your trigger is high (pollen counts peak in the morning and early evening), shower and change after outdoor sessions, and treat the nose as well as the chest — untreated hay fever keeps asthma unstable." }
];

/* Post-exertional malaise: NO graded-exercise options exist in this list, by
   design. `athlete`, `decond`, `gym` and `work` are redefined so the appended
   cross-cutting versions (which all preach progressive overload) cannot apply. */
const PEM_VARIANTS = [
  { k:"pem", label:"PEM-dominant — pacing only", sub:"Activity triggers a delayed crash", scale:1 },
  { k:"severe", label:"Severe / mostly housebound", sub:"Bed- or house-bound much of the time", pick:"severe|housebound|bedbound", scale:1.9,
    note:"When you are this affected, rehab is radical rest, light and noise management, and help with daily tasks. Even sitting up, conversation and screens are exertion and must be rationed. Pushing here causes long, sometimes permanent, deterioration." },
  { k:"dysaut", label:"With dysautonomia / PoTS", sub:"Dizzy, racing heart, worse standing up", pick:"dysautonomia|\\bpots\\b|orthostatic", scale:1.3,
    note:"When standing is the trigger, work HORIZONTAL first — recumbent bike, rowing, floor or pool work — because those avoid the blood-pooling that drives the symptoms. Compression garments to waist height, and salt and fluid if your clinician agrees, do more than any exercise here." },
  { k:"dyspnoea", label:"Breathing-pattern dominant", sub:"Breathless out of proportion to the tests", pick:"exertional dyspn|breathless", scale:0.85,
    note:"When the tests are normal but you are still breathless, the pattern is usually the problem: fast, shallow, upper-chest breathing that never quite satisfies. Breathing retraining is the lever here, not fitness — and it works faster than reconditioning does." },
  { k:"noPem", label:"No PEM — fatigue only", sub:"Tired, but no delayed crashes", pick:"deconditioning", scale:0.6,
    note:"If you are certain there is no post-exertional malaise — no delayed crash 12–72 hours later, ever — then ordinary graded reconditioning is safe and appropriate, and you should expect steady progress. Re-screen honestly every few weeks: PEM can appear later." },
  /* deliberate overrides of the cross-cutting defaults ---------------------- */
  { k:"athlete", label:"You were an athlete before", sub:"Sport is what you want back", scale:2.2,
    note:"This is the hardest message in this plan: with PEM, the training instincts that made you good at sport are the exact instincts that will harm you. 'Push through', 'earn it back', 'test yourself' — all of it makes this condition worse, and the damage can be lasting. Recovery here is won by holding back, and many people relapse for months because they treated a good week as permission." },
  { k:"decond", label:"Worried you're just deconditioned", sub:"Told it's only lost fitness", scale:1.2,
    note:"Deconditioning and PEM look similar from outside and are opposite in treatment. The tell is TIMING: lost fitness makes you tired DURING and better with training; PEM hits 12–72 hours LATER and gets worse with training. If you crash the day after, you are not deconditioned — and being told you are is the most common reason people harm themselves here." },
  { k:"gym", label:"Gym available", sub:"Full equipment", scale:1,
    note:"Equipment does not change the rules — measurable increments are exactly what you must NOT chase here. Use the gym for short, sub-threshold, seated or recumbent activity with long rests, and leave before you feel you have done something." },
  { k:"work", label:"Getting back to work", sub:"Job demands are the goal", scale:1.4,
    note:"Return to work here is a pacing project, not a fitness one: phased hours, control over your own breaks, cognitive load counted as exertion (it triggers PEM just as reliably as physical effort), and no rebuilding stamina by doing more. Going back full-time too early is one of the commonest causes of a long relapse." }
];

const PH_VARIANTS = [
  { k:"fc2", label:"WHO class II — stable on therapy", sub:"Comfortable at rest, symptoms on normal activity", scale:1 },
  { k:"fc3", label:"WHO class III", sub:"Marked limitation with less-than-ordinary activity", pick:"supervised|class iii", scale:1.35,
    note:"At class III the programme belongs in a specialist centre with monitoring. The gains are real, but the margin for error is much smaller." },
  { k:"cteph", label:"CTEPH", sub:"Clot-related pulmonary hypertension", pick:"thromboembolic|\\bcteph\\b", scale:1.15,
    note:"CTEPH is the one form of pulmonary hypertension that can be CURED — pulmonary endarterectomy removes the organised clot and can normalise the pressures. Anyone with CTEPH deserves assessment at a surgical centre before settling for drugs alone; balloon pulmonary angioplasty is an option if you are not a surgical candidate. Anticoagulation is lifelong." },
  { k:"postpea", label:"After endarterectomy / angioplasty", sub:"Clot surgically cleared", pick:"post-endarterectomy|post-\\bpea\\b", scale:0.9,
    note:"After a successful endarterectomy the ceiling genuinely lifts — but the sternotomy still needs 8–12 weeks of protection, and the restrictions below stay until your team has re-measured your pressures." },
  /* deliberate overrides of the cross-cutting defaults ---------------------- */
  { k:"athlete", label:"Sport is the goal", sub:"You want competition back", scale:1.5,
    note:"This is the plan's hard limit: competitive and high-intensity sport is NOT a goal in pulmonary hypertension, at any functional class. The failing chamber here is the right ventricle, and it cannot raise its output to meet a maximal effort — which is why exercise-related syncope and sudden death are recognised risks in this condition and not in most others. Everything below is built to make ordinary life easier, and that is the goal." },
  { k:"gym", label:"Gym available", sub:"Full equipment", scale:1,
    note:"Use it for LIGHT weights and high repetitions only. The gym staples to avoid are the ones that trap your breath: heavy sets, leg press to failure, overhead pressing and anything that makes you grunt. If you cannot talk through it, it is too heavy." }
];

const THORACIC_VARIANTS = [
  { k:"keyhole", label:"Keyhole (VATS / robotic)", sub:"Two or three small port incisions", pick:"\\bvats\\b|video.assisted|thoracoscop|robotic|keyhole|minimally invasive", scale:0.7,
    note:"Keyhole surgery spares the big chest-wall muscles, so pain settles faster and you get moving sooner — but the ports still run between the ribs, so the nerve-irritation pain and numbness are much the same, and they are not a sign anything is wrong." },
  { k:"open", label:"Open thoracotomy", sub:"A long incision around the side of the chest", pick:"thoracotom|open|clamshell|decortication", scale:1.25,
    note:"An open thoracotomy cuts through latissimus dorsi and serratus anterior and spreads the ribs — that is why the shoulder on that side goes weak and stiff, the shoulder blade wings, and posture drifts. It also explains why the pain outlasts the wound: up to half of people get lingering nerve pain along the scar. Shoulder and posture work is not an add-on here; the muscle has been cut and needs rebuilding." },
  { k:"standard", label:"Standard recovery", sub:"Uncomplicated, drains out on time", scale:1 },
  { k:"airleak", label:"Prolonged air leak / drain still in", sub:"The drain stayed in past a week", pick:"air leak|prolonged", scale:1.3,
    note:"A prolonged air leak is common and usually settles by itself. Keep walking WITH the drain — mobilising does not prolong it and lying still risks clots and pneumonia. Never lift the drain bottle above your chest." },
  { k:"chemo", label:"Having chemo / radiotherapy too", sub:"Oncology treatment alongside", pick:"chemo|radiotherap|adjuvant|mesotheli", scale:1.4,
    note:"Exercise during chemotherapy is safe and reduces fatigue — the evidence is good and counter-intuitive. Work around the cycle: expect to do less in the days after each dose, and take what you can get in the better week rather than abandoning the plan." }
];

const CLEARANCE_VARIANTS = [
  { k:"standard", label:"Stable", sub:"Between infections", scale:1 },
  { k:"exac", label:"During / just after an exacerbation", sub:"More sputum, feeling rough, on antibiotics", pick:"exacerbation|infection|flare", scale:1.3,
    note:"During an exacerbation, clearance goes UP and exercise comes down — but not to zero. Keep gentle activity going through the antibiotic course; it is the fastest route back to your baseline." },
  { k:"colonised", label:"Chronic pseudomonas / NTM", sub:"A persistent bug, on long-term antibiotics", pick:"nontuberculous|non-tuberculous|\\bntm\\b|pseudomonas|mycobacter", scale:1.25,
    note:"Long antibiotic courses carry side effects that change this plan: amikacin can damage hearing and balance (tell your team about dizziness — and add balance work), and ethambutol can affect vision. Weight loss is common and matters; you cannot rebuild muscle in a calorie deficit." },
  { k:"advanced", label:"Advanced disease", sub:"Low lung function, on oxygen", pick:"severe|advanced|oxygen", scale:1.4,
    note:"With advanced disease, keep exercising but respect two specific limits: coughing up frank blood means stop and get reviewed, and sudden one-sided chest pain with breathlessness may be a pneumothorax. Both are more common here, and both are reasons to stop rather than push." }
];


const ILD_VARIANTS = [
  { k:"standard", label:"Stable, mild desaturation", sub:"Sats hold reasonably on walking", scale:1 },
  { k:"desat", label:"Heavy desaturation on exertion", sub:"Sats drop a long way when you move", pick:"idiopathic pulmonary fibrosis|\\bipf\\b|usual interstitial|combined pulmonary fibrosis", scale:1.25,
    note:"When your saturations fall steeply, ambulatory oxygen is what makes training possible rather than a sign of defeat — it lets you do enough work to actually get a training effect. Heavy desaturation also warrants pulmonary hypertension screening, because it often travels with it." },
  { k:"progressive", label:"Progressive fibrosis", sub:"Getting worse despite treatment", pick:"idiopathic pulmonary fibrosis|\\bipf\\b|usual interstitial", scale:1.2,
    note:"With progressive fibrosis, rehab is aimed at keeping you at your best for as long as possible rather than at recovery, and the gains fade quickly once you stop — so it needs to be continuous. Make sure the antifibrotic and transplant conversations are happening in parallel, and early: transplant referral is very often left too late." },
  { k:"inflam", label:"Inflammatory / steroid-responsive", sub:"Sarcoid, HP, drug-induced, radiation", pick:"sarcoidosis|hypersensitivity|drug.induced|radiation|connective", scale:0.85,
    note:"Inflammatory interstitial disease can genuinely IMPROVE with treatment, unlike fibrosis — so expect your ceiling to rise as the inflammation settles, and re-test rather than assuming today's limit is permanent. The steroids that treat it weaken the muscles closest to your hips and shoulders, which is why resistance training is part of the treatment here." },
  { k:"cystic", label:"Cystic lung disease", sub:"LAM or Langerhans — pneumothorax risk", pick:"lymphangioleiomyomatosis|langerhans|\\bplch\\b", scale:1.1,
    note:"With cystic lung disease, a sudden sharp one-sided chest pain with new breathlessness may be a collapsed lung — this is common enough here to plan for. Get it assessed the same day rather than waiting. Ask your team about flying and about diving (usually ruled out)." }
];

const DUST_VARIANTS = [
  { k:"standard", label:"Simple / early disease", sub:"Changes on the scan, modest symptoms", scale:1 },
  { k:"pmf", label:"Progressive massive fibrosis", sub:"Large masses, marked breathlessness", pick:"silicosis|coal", scale:1.35,
    note:"Once the small nodules coalesce into large masses, the disease can keep progressing even years after the exposure stopped — which is unfair but important to know, because it means continued surveillance rather than discharge." },
  { k:"accelerated", label:"Accelerated / high-intensity exposure", sub:"Heavy recent exposure, fast progression", pick:"silicosis", scale:1.4,
    note:"Accelerated silicosis from very heavy exposure — engineered stone worktop cutting is the notorious modern cause — hits young workers hard and fast, progresses over a few years rather than decades, and can lead to transplant. If this is you, exposure must stop completely and immediately, and your workmates need testing." },
  { k:"immune", label:"Immune-mediated", sub:"Beryllium or antigen-driven", pick:"berylliosis|beryllium|farmer|hypersensitivity", scale:0.9,
    note:"This type is an immune reaction rather than simple dust scarring, which means it can respond to steroids and can partly improve — but only once the exposure has completely stopped. Continued exposure at any level keeps it going, however good the treatment." },
  { k:"reversible", label:"Early & still reversible", sub:"Symptoms tied to the working week", pick:"byssinosis", scale:0.75,
    note:"Chest tightness that is worst on the first day back after a break and eases through the week is the classic pattern, and at this stage it is REVERSIBLE — leave the exposure now and it largely resolves. Stay in it and it becomes fixed, permanent obstruction. The timing of that decision is everything." }
];

const TRANSPLANT_VARIANTS = [
  { k:"double", label:"Double lung transplant", sub:"Both lungs replaced", pick:"double|bilateral", scale:1,
    note:"A double transplant gives the higher ceiling and the better long-term outlook — many people get back to near-normal activity and some to sport. If it was done through a clamshell or a divided breastbone, treat it like a sternotomy: no pushing, pulling or lifting more than a few kilos, and no arms-behind-the-back movements for 8–12 weeks while the bone knits." },
  { k:"single", label:"Single lung transplant", sub:"One lung replaced, your own lung stays", pick:"single", scale:1.15,
    note:"With a single transplant your OWN diseased lung is still in there, and it still misbehaves: if it was emphysema it over-inflates and squashes the new lung, and blood and air do not match up well between the two. That means a genuinely lower ceiling than a double, and the native lung stays a source of infection and cancer risk that gets monitored for life." },
  { k:"standard", label:"Standard recovery", sub:"No rejection, no major complications", scale:1 },
  { k:"rejection", label:"Rejection or CLAD", sub:"Graft function falling", pick:"rejection|\\bclad\\b|\\bbos\\b|bronchiolitis obliterans", scale:1.5,
    note:"When graft function falls, exercise still helps but the plan slows down and the medical side takes the lead. Home spirometry is how this is caught early — a sustained drop of around 10% is a reason to phone your team, not to wait for the next clinic." }
];

const PE_VARIANTS = [
  { k:"standard", label:"Standard PE", sub:"Stable, treated as an outpatient or a short stay", scale:1 },
  { k:"submassive", label:"Large PE with heart strain", sub:"Right heart strain, needed a hospital stay", pick:"submassive|massive|thrombolys|right heart", scale:1.4,
    note:"When the clot was big enough to strain the right side of the heart, go slower early and let the heart recover before you push — the strain usually resolves over weeks to months, and the follow-up echocardiogram is what tells you it has." },
  { k:"provoked", label:"Provoked clot", sub:"After surgery, immobility or a flight", pick:"provoked|post-?op|surgery|travel", scale:0.9,
    note:"A provoked clot with the cause removed usually means a defined course of anticoagulation and a low recurrence risk — which is genuinely reassuring, and worth hearing." },
  { k:"unprovoked", label:"Unprovoked or recurrent", sub:"No obvious trigger, or more than one", pick:"unprovoked|recurrent|thrombophilia", scale:1.15,
    note:"An unprovoked or recurrent clot usually means long-term anticoagulation, and that shapes what sport is sensible — contact and collision sport, and anything with a real head-injury risk, stay off the list while you are anticoagulated." }
];

const CRITICAL_VARIANTS = [
  { k:"standard", label:"Standard ICU recovery", sub:"Ventilated for days to a week", scale:1 },
  { k:"prolonged", label:"Prolonged ventilation", sub:"Weeks on a ventilator, slow wean", pick:"weaning|prolonged|tracheostom", scale:1.4,
    note:"A long wean means the diaphragm itself wasted while the machine did the work — that starts within DAYS of ventilation. Inspiratory muscle training measurably improves the chances of getting off the ventilator, and it is one of the few things you can actively do during weaning." },
  { k:"ards", label:"ARDS", sub:"Severe lung injury", pick:"\\bards\\b|acute respiratory distress", scale:1.3,
    note:"After ARDS the lungs themselves usually recover remarkably well — lung function often returns close to normal within a year. It is the muscles, the nerves and the mind that lag, and survivors commonly still have reduced walking distance years later. That mismatch is confusing unless someone tells you: normal lung tests do not mean you should feel normal." },
  { k:"trach", label:"With a tracheostomy", sub:"Tube still in, or recently out", pick:"tracheostom|tracheotom", scale:1.25,
    note:"With a tracheostomy the swallow needs assessing before you eat — silent aspiration, where food goes down the wrong way without any cough to warn you, is common and dangerous. A speaking valve gets your voice back and helps the swallow. After decannulation, new noisy breathing or stridor weeks to months later can mean the windpipe has narrowed and needs urgent review." },
  { k:"pics", label:"Struggling psychologically", sub:"Flashbacks, anxiety, low mood, brain fog", pick:"\\bpics\\b|post-intensive", scale:1.3,
    note:"Nightmares, flashbacks, panic and a memory that will not hold anything are an extremely common part of surviving intensive care, not a separate weakness — and they are the most under-treated part of it. Ask for the follow-up clinic and for psychological help specifically; physical rehab alone does not fix this half." }
];

const SLEEP_VARIANTS = [
  { k:"standard", label:"Obstructive sleep apnoea", sub:"On CPAP, otherwise well", scale:1 },
  { k:"ohs", label:"Obesity hypoventilation", sub:"Raised CO2, on ventilation", pick:"hypoventilation|\\bohs\\b|pickwickian", scale:1.3,
    note:"Obesity hypoventilation is more serious than sleep apnoea alone — you retain carbon dioxide during the day, and untreated it carries a genuinely high mortality. Nightly ventilation is the treatment and it is not optional. Avoid sedatives, strong painkillers and alcohol, which all suppress the drive to breathe you are already short of." },
  { k:"central", label:"Central sleep apnoea", sub:"The drive to breathe pauses, not the airway", pick:"central|cheyne", scale:1.2,
    note:"Central apnoea is usually a symptom of something else — most often heart failure, or opioid medication — so treating THAT is the main event. One specific warning: adaptive servo-ventilation is contraindicated in heart failure with a weak pump (ejection fraction at or below 45%), because a large trial found it increased deaths. If you have both, make sure whoever set up your machine knew your ejection fraction." },
  { k:"restrict", label:"Obesity-related restriction", sub:"Breathless because the chest can't expand", pick:"restrictive", scale:1.15,
    note:"Weight around the chest and abdomen splints the ribcage and pushes the diaphragm up, and it is much worse lying flat — so exercise upright, sleep propped, and expect the water to be the easiest place to train because it takes the load off your joints while you build volume." },
  { k:"nowt", label:"Weight loss isn't the goal", sub:"Weight stable or not a target", scale:0.9,
    note:"Worth knowing: exercise cuts the number of breathing events per hour by around a quarter to a third and improves daytime sleepiness EVEN with no weight change at all. If weight loss is not your goal, the fitness benefit here still stands entirely on its own." }
];

const BREATHING_VARIANTS = [
  { k:"standard", label:"Dysfunctional breathing", sub:"Fast, high, unsatisfying breathing", scale:1 },
  { k:"hypervent", label:"Hyperventilation", sub:"Tingling, dizziness, air hunger", pick:"hyperventilation", scale:1,
    note:"The tingling round your mouth and fingers, the dizziness and the chest tightness are all the direct result of low carbon dioxide from over-breathing — they are not a sign of anything sinister, and they resolve as the pattern retrains. Knowing WHY it happens takes most of the fear out of it, and the fear is what drives the next episode." },
  { k:"ilo", label:"Vocal cord dysfunction / laryngeal obstruction", sub:"Throat closes, noisy breathing IN", pick:"vocal cord|laryngeal|\\bvcd\\b|\\beilo\\b", scale:1.1,
    note:"This is the great asthma impostor: the throat tightens and the noise comes on breathing IN rather than out, it hits within seconds of hard exercise and vanishes within minutes of stopping, your oxygen stays normal, and no inhaler has ever touched it. If that is your story, more asthma medication will not help — speech and language therapy breathing techniques are the treatment, and they work well." },
  { k:"cough", label:"Chronic cough", sub:"Coughing at everything, throat tickle", pick:"chronic cough", scale:1.2,
    note:"Chronic cough is usually a hypersensitive cough reflex — the nerves are set too low, so talking, laughing, perfume or cold air set it off. Cough-suppression therapy from a speech therapist genuinely works, and there are medications that turn the reflex down. First, make sure the treatable drivers are excluded — and if you take an ACE-inhibitor blood pressure tablet, that alone causes cough in about one in ten people and is worth changing before anything else." },
  { k:"refractory", label:"Breathless despite everything treated", sub:"The cause is optimally treated and you're still breathless", pick:"chronic breathlessness", scale:1.1,
    note:"When the underlying cause is treated as well as it can be and you are still breathless, that is a recognised condition in its own right and it deserves treating in its own right. The handheld fan, pacing, breathing retraining and — where appropriate — low-dose opioids all have evidence behind them. Being told 'there is nothing more to do' is not accurate." }
];

const CHESTWALL_VARIANTS = [
  { k:"standard", label:"Chest-wall restriction", sub:"Reduced expansion, no recent surgery", scale:1 },
  { k:"scoliosis", label:"Kyphoscoliosis", sub:"Curved spine restricting the chest", pick:"kyphoscolios|scolios", scale:1.2,
    note:"The steeper the curve, the more the ribcage is compromised — and severe curves eventually cause breathing failure at night before they cause it by day. Morning headaches, unrefreshing sleep and daytime sleepiness are the early signs, and overnight ventilation transforms them." },
  { k:"nuss", label:"After a Nuss bar (pectus)", sub:"Metal bar behind the breastbone", pick:"pectus|post-op|nuss", scale:1.3,
    note:"There is a metal bar behind your breastbone and it can move if you twist or bend early — that means log-rolling to get out of bed, sleeping on your back, and no twisting, bending, rolling or lifting for about 6 weeks, then a graded return with no contact sport for around 3 months. Do not slouch: the bar fixes the chest, but posture is what holds the result. The pain is significant and needs proper management, because a chest that hurts too much to breathe deeply gets infected." },
  { k:"postop", label:"After chest-wall surgery", sub:"Recent reconstruction or repair", pick:"post-op|reconstruction|repair", scale:1.25,
    note:"Follow your surgeon's restrictions to the letter for the first 6–8 weeks — they exist to stop the repair moving before it is held by anything but the metalwork. Breathing exercises still happen every day within those limits." }
];

const RESPMUSCLE_VARIANTS = [
  { k:"standard", label:"Diaphragm weakness", sub:"Weak but stable", scale:1 },
  { k:"phrenic", label:"Phrenic nerve palsy", sub:"One side paralysed", pick:"phrenic|palsy", scale:1.2,
    note:"One paralysed diaphragm is usually tolerated surprisingly well once you are over the shock of it, and it often recovers — commonly over 6 to 24 months, so do not accept a permanent label early. Both sides paralysed is a different and much more serious situation that needs specialist input and usually night-time ventilation." },
  { k:"neuromusc", label:"Neuromuscular disease", sub:"Muscle or nerve disease affecting breathing", pick:"neuromuscular", scale:1.4,
    note:"⛔ In progressive neuromuscular disease, do NOT train to exhaustion and avoid heavy eccentric work (lowering heavy loads slowly) — in these conditions that can damage muscle rather than build it. The aims are maintaining what you have, keeping the chest clear and staying out of hospital, not getting stronger. Breathing function gets tracked over time, and cough assistance and night-time ventilation are added when the numbers say so — before a crisis, not during one." },
  { k:"plication", label:"After diaphragm plication", sub:"The floppy diaphragm surgically tightened", pick:"plication", scale:1.15,
    note:"Plication tightens the paralysed diaphragm down so it stops billowing up into the chest, and the breathlessness lying flat usually improves markedly — but it is still a thoracic operation, so the breathing exercises, the shoulder and the scar all need the same attention as any other. Sleep propped for the first few weeks." },
  { k:"imt", label:"Training programme only", sub:"Breathing-muscle training as the goal", pick:"respiratory.muscle.training|inspiratory muscle training|\\bimt\\b|program", scale:0.75,
    note:"Inspiratory muscle training on its own reliably improves breathing-muscle strength and reduces breathlessness, and it is useful as an add-on in COPD, heart failure and ventilator weaning. It is an ADD-ON though: it does not replace walking, cycling and lifting, and on its own it will not make you fit." }
];

const POSTINF_VARIANTS = [
  { k:"standard", label:"Community pneumonia", sub:"Treated at home or a short admission", scale:1 },
  { k:"severe", label:"Severe / needed intensive care", sub:"Ventilated or in ICU", pick:"severe|\\bicu\\b|ventilat", scale:1.8,
    note:"If this put you in intensive care, the recovery is a critical-illness recovery rather than a chest-infection one: 6–12 months at least, with weakness and fatigue that has nothing to do with your lungs." },
  { k:"tb", label:"Post-tuberculosis", sub:"TB treated, damage left behind", pick:"tuberculosis", scale:1.3,
    note:"Post-TB lung damage is permanent and under-recognised: scarring, bronchiectasis, cavities and airway obstruction, and around half of people are left with measurable impairment. That means lifelong airway clearance if you make sputum, and it means coughing up blood always needs investigating rather than assuming it is old damage. Finish the full drug course whatever else happens — that part is not negotiable." },
  { k:"flu", label:"After influenza", sub:"Flu with secondary pneumonia", pick:"influenza", scale:1.1,
    note:"Influenza with a secondary bacterial pneumonia on top hits harder than either alone and takes longer to recover from. Get vaccinated for next season — this is the one recurrence you can genuinely prevent." },
  { k:"empyema", label:"With fluid or empyema", sub:"Infected fluid needed draining", pick:"empyema|effusion|drain", scale:1.4,
    note:"Once infected fluid has been in the chest, the lung needs to re-expand into the space and that takes weeks — deep breathing is what does it, so it is worth the discomfort. Antibiotics run for weeks rather than days here." }
];

const MESO_VARIANTS = [
  { k:"standard", label:"On treatment", sub:"Chemotherapy or immunotherapy", scale:1 },
  { k:"postop", label:"After surgery", sub:"Pleurectomy or decortication", pick:"post-op|pleurectom|decortication|surgery", scale:1.4,
    note:"After surgery for mesothelioma the chest-wall pain and the shoulder on that side both need real work, and the breathing exercises matter as much as after any thoracotomy." },
  { k:"symptom", label:"Symptom control focus", sub:"Comfort and function are the goal", pick:"palliative|advanced", scale:0.8,
    note:"When comfort and function are the goal, that IS the plan, not a lesser version of it — energy conservation, the fan, pacing and keeping the activities that matter to you are legitimate treatment with evidence behind them." },
  { k:"ipc", label:"With an indwelling pleural drain", sub:"A permanent drain for fluid", pick:"catheter|\\bipc\\b|pleurodesis|effusion", scale:1.1,
    note:"An indwelling pleural catheter lets you drain fluid at home and get on with life, and you can exercise normally with one — keep the site dry and clean, watch for redness or fever, and do not let it become a reason to stop moving." }
];


/* ------------------------------------------------------------- archetypes -- */

/* Obstructive airways disease — COPD by GOLD stage, chronic bronchitis,
   emphysema, alpha-1, bronchiolitis obliterans. */
A.copd = (s) => ({
  total: 12,
  freq: s.freq,
  note: `${s.why} Pulmonary rehabilitation improves breathlessness, walking distance and quality of life more than any inhaler does — it is the most effective treatment in respiratory medicine that most people have never been offered. The most important thing to understand: being breathless during exercise is EXPECTED, and it is not damaging your lungs. Avoiding activity because it makes you breathless is what starts the spiral — less activity, weaker muscles, more breathlessness for the same task, less activity again.`,
  variants: OBSTRUCTIVE_VARIANTS,
  ph: [
    ["Breathing control & an honest baseline", 0, 2,
     "Learn pursed-lip breathing and pacing, get your inhaler timing right, and set a baseline you can actually repeat.",
     "a walking distance you can repeat on an average day, pursed-lip breathing you reach for automatically when you get puffed, reliever taken before exercise if prescribed",
     `Aim for breathlessness around 3–4 out of 10 — that is the TARGET, not a warning. Breathe out through pursed lips for about twice as long as you breathe in; it holds the floppy airways open and is the fastest way to recover. ${s.mode}${s.extra ? " " + s.extra : ""}`],
    ["Building aerobic capacity", 2, 6,
     "Increase walking or cycling endurance — this is the part that changes how you feel day to day.",
     "walking further before you have to stop, recovering more quickly when you do, fewer stops on the same route",
     `Recovery pauses are part of the method, not a failure — stop, purse your lips, lean forward onto your hands (it gives your neck and shoulder muscles something to pull against), then go again. ${s.mode}`],
    ["Strength, arms & daily tasks", 6, 10,
     "Add resistance training, including arm work, and turn it into easier daily tasks.",
     "clear strength gains, stairs and carrying feel easier, tolerating resistance work without a next-day setback",
     "Include arm work even though it feels more breathless than leg work: unsupported arm exercise is disproportionately breathless because those muscles help you breathe when they are not busy holding your arms up. That is exactly why washing your hair and hanging out washing are so hard — and why training them pays off."],
    ["Maintenance & a flare-up plan", 10, 12,
     "Lock the gains in with something you will actually keep doing, and know exactly what to do when you get ill.",
     "a sustained improvement in walking distance, a written action plan you understand, a routine you can keep without a class",
     "This is the phase people skip and the one that decides the outcome: the gains fade within 6–12 months if you stop. Keep a written action plan and rescue medication for flare-ups, keep vaccinations up to date, and if you still smoke, stopping remains the only thing that changes the course of the disease itself."]
  ]
});

/* Asthma — the limiter is CONTROL, not fitness. */
A.asthma = (s) => ({
  total: 10,
  freq: s.freq,
  note: `${s.why} Asthma should not stop you exercising — a large share of Olympic endurance medallists have it. The rule that matters: if exercise reliably makes you wheeze, the answer is better CONTROL, not less exercise. Being unfit makes you breathless; breathlessness with wheeze, cough and chest tightness is asthma talking, and no amount of training will out-run it.`,
  variants: ASTHMA_VARIANTS,
  ph: [
    ["Get control first", 0, 2,
     "Sort out control, adherence and inhaler technique before you try to build fitness.",
     "reliever needed twice a week or less, no night waking, inhaler technique checked by someone who watched you do it, a written asthma action plan",
     `Do NOT start hard training on uncontrolled asthma. Most "my asthma is bad" turns out to be the preventer inhaler not taken, or taken with poor technique — most people use theirs wrong, and a spacer fixes a lot of it. ${s.extra ? s.extra + " " : ""}Never exercise through a flare, and if your reliever isn't lasting 4 hours, that is an urgent medical problem, not a training problem.`],
    ["Long warm-up & aerobic base", 2, 5,
     "Build an aerobic base on the back of a proper warm-up.",
     "completing steady sessions without needing your reliever mid-way, warm-up routine established",
     `${s.warm} Cold, dry air is the classic trigger — a scarf or mask over your mouth in winter genuinely helps, and so does swapping outdoors for indoors on freezing or high-pollen days.`],
    ["Progressive aerobic & strength", 5, 8,
     "Increase intensity and add resistance training.",
     "handling harder sessions with no more reliever than usual, no night symptoms after training days",
     "Track reliever use as your progress marker: needing it MORE as training gets harder means control has slipped — go back a step and review the preventer rather than pushing on. Interval work suits asthma well, because the hardest breathing comes in bursts instead of being sustained."],
    ["Full training & self-management", 8, 10,
     "Return to your full activity with a plan that keeps control while you train.",
     "training or playing at your normal level, stable reliever use, confident with your action plan",
     "Keep the warm-up permanently — it is not a beginner's step, it is your protection. Review with your clinician yearly and after any flare, and keep a spare reliever wherever you train."]
  ]
});

/* Post-exertional malaise — pacing ONLY. Graded exercise is contraindicated.
   There is deliberately NO progressive-overload phase anywhere in this
   archetype: PEM is the one presentation in this app where doing more is the
   injury. */
A.pacing = (s) => ({
  total: 26,
  freq: "Activity broken into short chunks with real rest between — every day, always below your limit, never 'making up for' a good day",
  note: `${s.why} ⛔ This plan does NOT progressively increase your activity, and that is deliberate. If effort is followed by a delayed crash — feeling much worse hours or DAYS later, lasting days or weeks — that is post-exertional malaise (PEM), and graded exercise therapy is CONTRAINDICATED. Pushing through does not build tolerance; it causes deterioration that can be prolonged and is sometimes permanent. People with PEM consistently report graded exercise as the thing that harmed them most, which is why it was withdrawn from guidance. Rest here is a treatment, not a failure of willpower.`,
  variants: PEM_VARIANTS,
  ph: [
    ["Find your energy envelope", 0, 4,
     "Work out what you can do WITHOUT triggering a crash — measured on your worst days, not your best ones.",
     "you can describe your own limits, the boom-and-bust cycle has stopped, symptoms no longer swing wildly from week to week",
     `Set your baseline at what you could manage on a BAD day — set it from a good day and you will crash, every time. Stop BEFORE you feel you need to; by the time you feel it, you have already overdone it. Count everything as exertion: thinking, talking, screens, emotion and standing all draw on the same budget as walking.${s.extra ? " " + s.extra : ""}`],
    ["Stabilise inside the envelope", 4, 12,
     "Live consistently below the threshold until the crashes stop — the same amount on good days as on bad ones.",
     "several weeks with no crashes, symptoms fairly steady day to day, activity level the same on good and bad days",
     "The discipline here is doing LESS on a good day. Feeling better is not permission — it is the most reliable warning sign in this condition, because the payback arrives after you have spent it. Break activity into short chunks with rest BETWEEN them, and rest means genuinely doing nothing, not switching to your phone."],
    ["Test the edges — only if you're stable", 12, 20,
     "If, and only if, you have been crash-free for weeks, try tiny increases — and be ready to drop straight back.",
     "crash-free for at least 4–6 weeks before you change anything, small increases held for a fortnight with no payback",
     "Change ONE thing at a time, by a tiny amount (a minute or two, not ten), then hold it for 1–2 weeks and watch — PEM can arrive 12–72 hours later, so a good evening tells you nothing. Any payback means go back to the previous level; that is information, not failure. If you are not stable, stay in the phase above for as long as it takes. There is no schedule here, and the weeks shown are not a target."],
    ["Sustainable activity & a relapse plan", 20, 26,
     "Build a life that fits inside the envelope, and know what to do when it shrinks.",
     "a sustainable routine, an agreed plan for crashes, support in place for the tasks that reliably cost too much",
     "Expect the envelope to change — with infections, stress, heat and hormones — and shrink your activity to match rather than defending yesterday's level. Get help with the tasks that always cost more than they are worth: conserving energy for what matters to you is the whole strategy, not a concession."]
  ]
});

/* Post-COVID / post-viral WITHOUT PEM — reconditioning, PEM-screened at the
   gate every time, because getting this triage wrong is what harms people. */
A.postviral = (s) => ({
  total: 14,
  freq: "Short, easy sessions most days — frequency first, intensity much later",
  note: `${s.why} ⛔ Read this before you start: if activity is followed by a DELAYED crash — feeling much worse 12–72 hours afterwards, lasting days — that is post-exertional malaise, and this is the WRONG plan for you. Graded exercise is contraindicated with PEM; use a pacing approach instead and do not push through. If there is genuinely no delayed payback, then gentle graded reconditioning is safe and effective, and you should expect real progress.`,
  variants: PEM_VARIANTS,
  ph: [
    ["Screen for post-exertional malaise", 0, 2,
     "Establish whether you crash after activity — everything else depends on the answer.",
     "two weeks of gentle activity with an honest symptom diary showing NO delayed worsening at 12–72 hours",
     "This phase is a test, not training. Do a little, then watch the next two days. Worse the same evening and fine tomorrow is ordinary fatigue and you may proceed. Fine on the day and wiped out 24–72 hours later is PEM — stop, switch to a pacing plan, and do not let anyone tell you it is just deconditioning."],
    ["Low-intensity aerobic restart", 2, 6,
     "Rebuild the habit of daily easy movement at an intensity that feels almost too easy.",
     "walking most days at a conversational pace, no delayed payback, sleep and energy trending the right way",
     "Conversational pace means you can speak in full sentences — if you cannot, you are going too hard. Little and often beats one big effort. Breathlessness that is out of proportion to your test results is usually a breathing PATTERN problem, so keep the breathing slow, low and through your nose."],
    ["Graded aerobic & strength", 6, 11,
     "Add intensity and resistance work now that you know activity does not set you back.",
     "tolerating longer or brisker sessions with normal next-day recovery, strength returning, back to most daily activities",
     "Progress ONE thing at a time and keep re-screening for delayed payback — PEM can appear later, especially after another infection. Expect a wobbly, non-linear recovery: post-viral fatigue is genuinely worse some weeks for no reason you can identify, and that alone is not a reason to abandon the plan."],
    ["Full return to activity", 11, 14,
     "Return to your normal work, exercise and life.",
     "back to your usual activities without a setback, confident you can push a bit and still be fine tomorrow",
     "Go back to work and sport in graded steps rather than all at once, and keep something in reserve for a few months. If a new infection knocks you back, drop to an earlier phase and rebuild instead of trying to hold your level through it."]
  ]
});


/* Interstitial / fibrotic lung disease — DESATURATION is the limiter, not
   breathlessness. Oxygen is titrated to hold the target, and resistance work
   desaturates less than walking does. */
A.ild = (s) => ({
  total: 12,
  freq: "Supervised sessions 2–3×/week with an oximeter on + walking on the other days",
  note: `${s.why} What makes this different from COPD: the limiter is your oxygen LEVEL, not the sensation of breathlessness. Your saturations can fall fast and a long way on quite ordinary exertion, sometimes before you feel especially bad — so the oximeter, not your effort, sets the pace. Rehab genuinely works here (better walking distance, less breathlessness), but the benefit fades faster than in COPD, so continuing is the whole game.`,
  variants: ILD_VARIANTS,
  ph: [
    ["Baseline & oxygen titration", 0, 2,
     "Find out what your saturations actually do when you move, and settle on the oxygen flow that holds them.",
     "a walk test with oximetry done, your personal SpO2 target agreed, the oxygen flow that holds it during exercise established",
     `Keep SpO2 at or above 88–90% during exercise, or whatever target your team set. Slow down or stop and recover when it drops below — a fall of more than 4%, or below 88%, is worth telling your team about. Do not judge intensity by how breathless you feel: in fibrosis the two come apart.${s.extra ? " " + s.extra : ""}`],
    ["Aerobic training with saturation monitoring", 2, 6,
     "Build endurance in intervals, using oxygen and recovery pauses to keep the saturations up.",
     "more total walking or cycling time per session, saturations recovering quickly in the pauses, oxygen use settled into a routine",
     "Intervals are not a compromise here — short bursts with recovery let you do far more total work at a saturation you can hold than one continuous effort would. If you have ambulatory oxygen, use it exactly as prescribed and turn it UP for exercise if your team has told you to; leaving it off to prove a point simply starves the muscles you are training."],
    ["Strength & function", 6, 9,
     "Build leg and arm strength — the part of this you can most reliably change.",
     "clear strength gains, standing from a chair and stairs easier, less desaturation for the same daily task",
     "Resistance training is your friend here: lifting weights drops the saturations far less than walking does, so you can load the muscles properly even when your walking is very limited. Keep the reps steady and breathe out on the effort rather than holding your breath."],
    ["Maintenance, oxygen & looking ahead", 9, 12,
     "Keep it going, and get the bigger decisions in motion early.",
     "a maintenance routine you will keep, oxygen and equipment sorted for home, the right referrals under way",
     "The benefit in fibrotic disease can fade within about 6 months of stopping — faster than in COPD — so maintenance is not optional. Make sure the big things are moving in parallel: antifibrotic drugs if you have IPF, an early transplant conversation if you might be a candidate (early is the point — referral is often left too late), pulmonary hypertension screening if you desaturate heavily, and vaccinations."]
  ]
});

/* Occupational dust disease — the treatment is STOPPING THE EXPOSURE. */
A.pneumoconiosis = (s) => ({
  total: 14,
  freq: "Supervised sessions 2–3×/week + walking on the other days",
  note: `${s.why} The most important line in this plan is not an exercise: no further exposure. The scarring already there will not reverse, but continued exposure keeps adding to it, and stopping is the only thing that changes where you end up. Rehab cannot undo the fibrosis — what it reliably does is make you fitter, stronger and less breathless doing the same tasks, which is worth a great deal.`,
  variants: DUST_VARIANTS,
  ph: [
    ["Stop the exposure & set a baseline", 0, 2,
     "End the exposure, get the paperwork moving, and establish a safe starting point.",
     "exposure stopped or properly controlled, the condition reported through the right channels, a baseline walk with oximetry",
     `No further exposure — that comes before anything in this plan. Report it: these are recognised industrial diseases and you may be entitled to compensation and benefits, which is easier to pursue now than years from now, and matters to your family as well as to you. Tell your employer, and check whether workmates should be screened too.${s.extra ? " " + s.extra : ""}`],
    ["Aerobic base with saturation awareness", 2, 6,
     "Rebuild walking endurance, watching what your saturations do.",
     "walking further before stopping, saturations holding at or above 88–90% with recovery pauses",
     "Breathlessness of 3–4 out of 10 is the working target, but if your saturations drop on exertion they take priority over the feeling. Recovery pauses and interval work let you do more total work than pushing continuously."],
    ["Strength & work capacity", 6, 10,
     "Build the strength you need for your actual job and daily demands.",
     "clear strength gains, tolerating the physical demands you need to meet, less breathless for the same task",
     "Match the training to what you really have to do. If you are going back to any work, the exposure control question comes first — a different job in the same dust is not a solution, and respiratory protection is a last resort, not a substitute for removing the dust."],
    ["Maintenance, surveillance & protection", 10, 14,
     "Keep the fitness, and stay on top of the surveillance this needs.",
     "a routine you will keep, surveillance appointments in the diary, smoking stopped, vaccinations current",
     `Stay in the surveillance programme — these conditions are followed for a reason and progression can be silent. ${s.watch} If you smoke, stopping matters more here than in almost any other condition on this list, because the risks multiply rather than add.`]
  ]
});

/* Bronchiectasis / CF / PCD / NTM — AIRWAY CLEARANCE BEFORE EXERCISE. */
A.clearance = (s) => ({
  total: 16,
  freq: "Airway clearance every day (twice daily when producing sputum), exercise on top 4–5×/week",
  note: `${s.why} The order matters and it is not negotiable: airway clearance FIRST, exercise afterwards. Exercising on a chest full of sputum is harder, less effective and more likely to end in an infection — clearing first means you train the muscles rather than fight the mucus. Exercise helps loosen secretions and is a genuinely powerful addition, but it is an ADDITION to your clearance routine, never a replacement for it.`,
  variants: CLEARANCE_VARIANTS,
  ph: [
    ["Get airway clearance working first", 0, 2,
     "Establish a clearance routine that actually shifts sputum, and get the order of your treatments right.",
     "a clearance technique you can do independently and will keep up, sputum shifting, the daily order of treatments settled",
     `Clear your airways BEFORE you exercise, not after. Get the sequence right, because it roughly doubles what each step achieves: reliever inhaler → nebulised saline or mucolytic if prescribed → clearance → exercise → inhaled antibiotic last. Have your technique taught properly — active cycle of breathing, autogenic drainage or an oscillating PEP device all work, and the best one is the one you will actually do every day.${s.extra ? " " + s.extra : ""}`],
    ["Exercise as clearance + aerobic base", 2, 6,
     "Use exercise to help shift secretions while you rebuild an aerobic base.",
     "clearance routine automatic, walking or cycling most days, sputum easier to clear on exercise days",
     "Exercise loosens sputum through deeper breathing and vibration — expect to cough more during and after a session, and clear it properly rather than suppressing it. That extra cough is the treatment working, not a setback. Keep hydrated: thick secretions are much harder to move."],
    ["Progressive aerobic & strength", 6, 11,
     "Build real fitness and strength on top of a stable clearance routine.",
     "clear gains in walking or cycling capacity, resistance training established, fewer or shorter exacerbations",
     `${s.gain} Include resistance work — muscle mass and nutrition track outcomes closely in these conditions, and being underweight is a bigger problem than being unfit.`],
    ["Lifelong maintenance", 11, 16,
     "Turn this into something permanent, because this is a permanent condition.",
     "clearance and exercise both embedded in your day, an exacerbation action plan you understand, review appointments in place",
     `This is lifelong: the vicious cycle here is infection → inflammation → more damage → more infection, and daily clearance plus exercise is what breaks it. Have an action plan and rescue antibiotics, and act early — a change in sputum colour or volume, or new fatigue, means start the plan rather than wait and see.${s.watch ? " " + s.watch : ""}`]
  ]
});


/* Thoracic surgery — the early enemy is a chest infection; the late enemy is a
   stiff, weak shoulder and a painful scar nobody warned you about. */
A.thoracic = (s) => ({
  total: 16,
  freq: "Breathing exercises hourly while awake in the first weeks, then daily shoulder & walking work",
  note: `${s.why} Two things decide how this goes. Early: breathing and coughing, done properly and often, because a chest infection or a collapsed segment is the main complication and it is largely preventable. Later: the shoulder, posture and the scar. ${s.ceiling}`,
  variants: THORACIC_VARIANTS,
  ph: [
    ["Breathe, clear, move & protect the wound", 0, 2,
     "Keep the lung inflated and the chest clear, and get the shoulder moving straight away.",
     "deep breathing and supported coughing done hourly, walking on the ward or at home, shoulder moving on the operated side, wound clean and dry",
     `Deep breathing and a supported cough (hug a pillow or your forearm against the wound — firm pressure genuinely reduces the pain) every hour you are awake. This is the single most valuable thing you do this fortnight. Start gentle shoulder movement on the operated side from day one: that shoulder stiffens with remarkable speed and is much harder to get back later. If you have a chest drain, keep walking with it and never lift the bottle above chest height.${s.extra ? " " + s.extra : ""}`],
    ["Range, posture & walking", 2, 6,
     "Get full shoulder range and upright posture back, and build walking time.",
     "full or near-full shoulder range on the operated side, standing straight without listing toward the scar, walking 20–30 minutes",
     "Expect numbness, tingling, burning or a dead patch along the scar and under the arm — the nerves between the ribs are stretched or cut in every one of these operations, and it is normal, not a complication. It can take months to settle and sometimes never fully does. Do not curl protectively around the wound: the sideways lean becomes a habit and then a posture. No heavy lifting yet, and follow any lifting limit your surgeon set."],
    ["Aerobic & strength rebuild", 6, 12,
     "Rebuild aerobic capacity and the chest-wall and shoulder-girdle strength that was cut.",
     "walking briskly or cycling without stopping, resistance training under way, shoulder strength approaching the other side",
     `${s.strength} Some scar and rib-cage discomfort with movement is expected as you load it. Sharp, new or one-sided chest pain with breathlessness is different — get that checked.`],
    ["Return to full capacity", 12, 16,
     "Get back to your work, driving, travel and sport within whatever ceiling this operation leaves.",
     "back to your normal activities, breathlessness settled to your new normal, a clear picture of your actual ceiling",
     `${s.ceilingLate} Persistent burning nerve pain along the scar affects a substantial minority after an open operation and responds better to nerve pain medication and desensitisation than to ordinary painkillers — ask, rather than assuming you have to live with it.`]
  ]
});

/* Lung transplant — the new lungs are usually not the limiter. The muscles are. */
A.transplant = (s) => ({
  total: 26,
  freq: "Daily — supervised rehab 2–3×/week for the first few months",
  note: `${s.why} The surprise for most people: after a successful transplant the LUNGS are rarely what holds you back — the muscles are. Years of deconditioning before the operation, plus steroids and anti-rejection drugs that weaken muscle directly, mean your legs are the bottleneck long after your breathing has stopped being one. That is good news, because muscle responds to training.`,
  variants: TRANSPLANT_VARIANTS,
  ph: [
    ["Sit, stand, breathe & clear", 0, 2,
     "Get upright and moving early, and take over the coughing your new lungs cannot do for you.",
     "sitting out of bed and standing with help, deliberate deep breathing and coughing every hour, walking short distances",
     `Your transplanted lung is DENERVATED below the join — it cannot feel secretions and will not make you cough. You have to cough deliberately and on a schedule, because the reflex that protected you your whole life is gone and will not come back. Chest clearance is therefore a permanent job, not a temporary one.${s.extra ? " " + s.extra : ""}`],
    ["Restore walking & basic strength", 2, 8,
     "Rebuild walking and get the big muscles working again.",
     "walking independently for 10–15 minutes, standing from a chair without using your arms, off supplementary oxygen",
     "Infection precautions shape this phase: you are heavily immunosuppressed, so avoid crowded gyms, pools and unwell people early on, wash your hands relentlessly, and take fever seriously — get it assessed the same day rather than waiting to see. Home exercise and outdoor walking are safer than a busy gym for now."],
    ["Progressive aerobic & resistance", 8, 18,
     "Train the muscles hard — this is where the function comes from.",
     "clear aerobic gains, resistance training established, back to independent daily life",
     "Prioritise the quadriceps: steroids and calcineurin inhibitors hit the muscles closest to your hips and shoulders hardest, and quad strength predicts what you will actually be able to do. Bone matters too — steroids plus pre-transplant illness means osteoporosis is common, so weight-bearing work and a bone review both belong here."],
    ["Return to life & lifelong surveillance", 18, 26,
     "Get your life back, and learn the surveillance that protects the graft.",
     "back to work, travel or sport as agreed, home spirometry routine established, confident with your medications",
     `Learn your numbers: a sustained fall in your home spirometry of around 10% or more is how chronic rejection announces itself, and it needs reporting rather than watching. Never miss immunosuppression doses. Sun protection is not cosmetic — skin cancer risk rises substantially on these drugs — and no live vaccines. ${s.ceiling}`]
  ]
});

/* Pulmonary hypertension — syncope and sudden-death risk. LOW intensity,
   supervised, no Valsalva. The right ventricle cannot meet a maximal demand. */
A.ph = (s) => ({
  total: 15,
  freq: "Supervised low-intensity sessions 3–5×/week in a specialist programme",
  note: `${s.why} ⛔ This is the one pulmonary plan where "listen to your body and push a bit" is wrong advice. The problem is the right side of your heart pushing against high pressure in the lungs: it cannot increase its output to meet a hard effort, so a maximal push does not just feel bad — it can drop your blood pressure and your consciousness. Exercise-related fainting and sudden death are recognised risks in pulmonary hypertension. The evidence supporting rehab here is specifically for LOW-intensity, SUPERVISED programmes in specialist centres, and it does not transfer to training hard on your own.`,
  variants: PH_VARIANTS,
  ph: [
    ["Supervised low-intensity start only", 0, 3,
     "Start only once your PH team says the disease is stable on optimised therapy — and start supervised.",
     "your PH team has cleared you, the programme is supervised, you can list the symptoms that mean STOP, you stay comfortably able to talk throughout",
     `STOP IMMEDIATELY and get reviewed for: dizziness, light-headedness, feeling you might faint, chest pain, palpitations, or unusual breathlessness. In pulmonary hypertension these are not symptoms to push through — they mean your heart's output is not meeting demand, and fainting during exertion is a serious warning sign of severe disease. Do not start this without your specialist team's agreement and targeted therapy optimised first.${s.extra ? " " + s.extra : ""}`],
    ["Low-intensity aerobic, in intervals", 3, 7,
     "Build endurance at genuinely low intensity, in short bouts with generous rests.",
     "more total walking or cycling time at an easy effort, saturations at or above 90%, no dizziness, recovering fully between bouts",
     "Keep the effort at about 3–4 out of 10 and stay able to hold a conversation — that is the ceiling, not the starting point. Intervals with long rests, not continuous pushing. No high-intensity training, no all-out efforts, no competitive sport, and stop while you still feel you could do more."],
    ["Light resistance & respiratory muscle training", 7, 11,
     "Add light resistance work and inspiratory muscle training without ever trapping your breath.",
     "light weights with high repetitions tolerated, breathing out on every effort, no straining or breath-holding",
     "NO Valsalva and no breath-holding — bearing down against a closed throat spikes the pressure in your chest, collapses the blood coming back to the heart and is exactly how people faint in this condition. Breathe OUT on the effort, every rep. Light weights and high reps only: no heavy sets, no lifting to failure, no overhead pressing, nothing that makes you grunt or strain. If you cannot talk through it, it is too heavy."],
    ["Maintain within your ceiling", 11, 15,
     "Keep the gains, and live well inside a limit you understand.",
     "a sustained improvement in walking distance, a maintenance routine you can keep safely, clear on what to avoid",
     `Know the things that make this dangerous outside the gym: heat, hot tubs and saunas (they drop your blood pressure), dehydration, altitude and unpressurised flights (low oxygen tightens the lung vessels — get air travel assessed), and pregnancy, which carries very high risk in pulmonary hypertension and needs a proper conversation about contraception. ${s.watch}`]
  ]
});

/* Pulmonary embolism — the fear is the biggest barrier; the plan is
   reassurance plus a real CTEPH safety net at 3 months. */
A.pe = (s) => ({
  total: 12,
  freq: "Walking daily from the start, building to structured sessions 4–5×/week",
  note: `${s.why} Two things people are rarely told. First: once you are anticoagulated and stable, moving is SAFE and encouraged — the old advice to lie still has gone, and staying still causes more clots, not fewer. Second: if you are still breathless months later, that is a recognised thing with a name, not anxiety and not weakness — up to half of people have reduced capacity at 6 months, and a small but important number have a treatable cause behind it.`,
  variants: PE_VARIANTS,
  ph: [
    ["Early mobilisation on anticoagulation", 0, 2,
     "Get walking again once you are anticoagulated and stable — gently, but genuinely.",
     "anticoagulation established, walking around the house and outside daily, breathlessness at rest settled",
     `Being anticoagulated changes what is sensible: avoid contact and collision sport and anything with a real fall or head-injury risk while you are on treatment, and know your bleeding warning signs. Otherwise walk. Pleuritic chest pain on breathing in is common early and settles over weeks.${s.extra ? " " + s.extra : ""}`],
    ["Aerobic rebuild", 2, 6,
     "Rebuild walking and cycling capacity, and rebuild confidence with it.",
     "walking 20–30 minutes without stopping, breathlessness improving week to week, less anxious about exertion",
     "Fear is the biggest barrier here and it is completely understandable — a lot of people are quietly terrified that exertion will cause another clot. It will not. Graded, monitored exercise is safe and is one of the better treatments for the breathlessness itself."],
    ["Strength & capacity", 6, 9,
     "Add intensity and resistance work.",
     "tolerating brisker or longer sessions, resistance training established, back to most normal activities",
     "Expect progress to be real but slower than you would like. Recurrent clot symptoms — new one-sided calf swelling and pain, sudden breathlessness, or sharp chest pain — mean same-day medical assessment, not a rest day."],
    ["Full return + a CTEPH safety net", 9, 12,
     "Return to full activity, and make sure persistent breathlessness gets properly investigated.",
     "back to your normal exercise and work, or a referral in motion if you are not",
     `If you are still significantly breathless around 3 months in, that needs investigating rather than accepting: post-PE syndrome is common, and in a small percentage the clot organises into scar and causes chronic thromboembolic pulmonary hypertension — which is worth finding, because it is the one form of pulmonary hypertension that surgery can CURE. Ask for an echocardiogram. ${s.watch}`]
  ]
});


/* Critical illness — ARDS, ventilator weaning, tracheostomy. Long, and the
   psychological half is not optional. */
A.critical = (s) => ({
  total: 30,
  freq: "Little and often, every day — several very short bouts beat one long session for months",
  note: `${s.why} Set your expectations honestly: this is a 6–12 month recovery at least, and many people are still improving at two years. Muscle is lost in critical illness at a rate that has to be seen to be believed — a couple of percent a DAY in the first week, which is why people who were fit are shocked at being unable to stand. Alongside the physical, expect memory and concentration problems, and anxiety, low mood or nightmares and flashbacks — this cluster affects up to a third of ICU survivors, it has a name, and it is treatable.`,
  variants: CRITICAL_VARIANTS,
  ph: [
    ["Sit up, stand, breathe", 0, 4,
     "Get out of bed, get upright, and start reclaiming the breathing muscles.",
     "sitting out of bed daily, standing with help, taking part in your own care, breathing exercises established",
     `Progress is measured in things like sitting on the edge of the bed, not in minutes on a bike. Expect profound weakness — up to half of people ventilated for a week or more get genuine nerve and muscle damage from the illness itself, so this is not simply lost fitness and it recovers over months. Nutrition and protein matter as much as exercise: you cannot rebuild muscle without the raw materials.${s.extra ? " " + s.extra : ""}`],
    ["Walk & rebuild basic strength", 4, 12,
     "Get walking independently and rebuild the strength for ordinary daily tasks.",
     "walking indoors independently, standing from a chair unaided, managing washing and dressing, sleeping better",
     "Fatigue here is not laziness and pushing through it does not fix it — short, frequent bouts with real rest between work far better than one long effort. Address the psychological side deliberately rather than waiting for it to pass: intrusive memories, nightmares and a fear of hospitals are common after intensive care and respond to treatment. An ICU diary or follow-up clinic helps more than people expect."],
    ["Progressive aerobic & strength", 12, 22,
     "Build real aerobic capacity and strength back.",
     "walking outdoors for 30 minutes, structured resistance training established, back to most of your own activities",
     "This is where it starts to feel like ordinary training, and where the gains come quickly enough to notice. Keep protein intake up. Do not compare yourself to who you were before you got ill — compare to last month."],
    ["Return to life & work", 22, 30,
     "Rebuild the life around the fitness — work, driving, relationships.",
     "back to work in some form if that is the goal, a realistic view of what has and has not returned",
     `Return to work phased, not all at once, and take the cognitive side seriously — concentration and memory problems are a common reason returns fail, and they are not a character flaw. ${s.watch}`]
  ]
});

/* Sleep-disordered breathing & obesity-related restriction — treat the
   breathing first; exercise is an adjunct with real, measurable effects. */
A.sleep = (s) => ({
  total: 20,
  freq: "Aerobic activity most days + resistance training 2–3×/week — this is a long-game plan",
  note: `${s.why} The number worth knowing: exercise reduces the number of breathing events per hour by roughly a quarter to a third — and it does that EVEN IF you lose no weight at all, while also improving daytime sleepiness. That is a real, independent effect, not a consolation prize. It does not, however, replace your CPAP or ventilation.`,
  variants: SLEEP_VARIANTS,
  ph: [
    ["Treat the breathing first, then move", 0, 3,
     "Get the CPAP or ventilation working properly, and start building daily activity.",
     "using your machine most nights for 4+ hours, daytime sleepiness improving, walking daily",
     `Exercise does NOT replace CPAP — treat them as separate jobs. And the safety point that matters most: if you are sleepy at the wheel you must not drive until you are treated, and in many places you are legally required to tell the licensing authority. Untreated sleepiness at the wheel is one of the genuinely dangerous consequences of this condition.${s.extra ? " " + s.extra : ""}`],
    ["Build daily activity", 3, 8,
     "Establish consistent daily movement — volume first, intensity later.",
     "activity on most days, machine use steady, sleep quality and morning headaches improving",
     "Start where you actually are, not where you think you should be. If exercise is uncomfortable because of weight or joints, use the water, a bike or a cross-trainer — the goal is total volume you can sustain, and the sleep benefits come from consistency rather than intensity."],
    ["Aerobic, resistance & weight", 8, 14,
     "Add intensity and resistance work, and address weight as the disease-modifier it is.",
     "clear aerobic gains, resistance training established, weight trending down if that is a goal",
     `${s.weight} Keep resistance training in whatever else you do: when people lose weight without it, a big share of what they lose is muscle, which is the opposite of what you want here.`],
    ["Sustain", 14, 20,
     "Make it permanent, and get re-tested rather than guessing.",
     "a routine you can keep, machine use embedded, a re-assessment arranged if things have changed a lot",
     `If you lose a significant amount of weight or your symptoms change, get re-assessed — pressures may need adjusting and, with enough weight loss, mild disease can resolve. Do not simply stop using the machine because you feel better; that is what the re-test is for. ${s.watch}`]
  ]
});

/* Breathing-pattern disorders — nothing is damaged; the pattern is the problem.
   These respond fast, and that framing is itself therapeutic. */
A.breathing = (s) => ({
  total: 10,
  freq: "Short breathing practice several times daily — 5 minutes × 4 beats 20 minutes × 1",
  note: `${s.why} Here is the good news, and it is genuine: your lungs are not damaged. This is a pattern — a habit your breathing has fallen into — and patterns retrain. That is why this plan is measured in weeks rather than the months everything else on this list takes. The frustrating part is usually that you have been told "your tests are normal" as if that meant nothing was wrong. Something IS wrong; it is just mechanical rather than structural, and it is fixable.`,
  variants: BREATHING_VARIANTS,
  ph: [
    ["Understand it & release the pattern", 0, 2,
     "Understand what is happening, and unlearn the bracing that keeps it going.",
     "you can explain your own symptoms, aware of your breathing pattern at rest, upper-chest and shoulder tension easing",
     `Your symptoms are real and they are explainable: breathing too fast or too high blows off carbon dioxide, and low carbon dioxide is what produces the tingling, dizziness, chest tightness and that maddening feeling of not being able to get a satisfying breath. It feeds itself — the harder you try to breathe, the worse it gets.${s.extra ? " " + s.extra : ""}`],
    ["Breathing retraining", 2, 5,
     "Retrain the mechanics: nose, low, slow, with a relaxed breath out.",
     "nose-breathing at rest most of the time, breathing low into the belly rather than high into the chest, a longer relaxed breath out, fewer episodes",
     `Nose, low, slow. The breath OUT should be relaxed and slightly longer than the breath in — do not force it. Do not use a paper bag: it is not recommended and is dangerous if the real cause turns out to be a lack of oxygen. ${s.tech}`],
    ["Retrain under load", 5, 8,
     "Hold the pattern while you exercise, and get your rescue technique working when it counts.",
     "keeping the pattern during moderate exercise, a rescue technique that works within a minute or two, exercising without an episode",
     "Take the technique into exercise deliberately, starting easy and building. This is where the retraining sticks — and where the fear of the next episode starts to fade, which is usually the bigger win."],
    ["Consolidate & prevent", 8, 10,
     "Make the new pattern automatic and know what brings the old one back.",
     "the pattern holding without you thinking about it, confident with your rescue technique, back to full activity",
     `Relapses cluster around stress, illness and poor sleep — the same triggers every time. Notice it early and go back to the practice for a week rather than letting it re-establish. ${s.watch}`]
  ]
});

/* Restrictive chest wall — the ribcage, not the lungs, is the limiter. */
A.chestwall = (s) => ({
  total: 20,
  freq: "Daily breathing & posture work + aerobic and strength training as it allows",
  note: `${s.why} The lungs here are usually fine — it is the container that is the problem. A chest wall that cannot expand properly means smaller breaths, more work to breathe, and breathing that gets worse lying down and worse again asleep. So the targets are the ribcage's movement, the muscles that drive it, and your night-time breathing.`,
  variants: CHESTWALL_VARIANTS,
  ph: [
    ["Protect & breathe", 0, 4,
     "Protect whatever needs protecting, and keep the lung bases inflated.",
     "deep breathing several times daily, comfortable enough to sleep, walking daily",
     `${s.protect} Breathing exercises that reach the bottom of the lungs matter here, because the lower zones are where things collapse and get infected first.`],
    ["Posture, range & breathing", 4, 10,
     "Restore what movement the chest wall and spine have, and train the breathing muscles.",
     "posture improved and easier to hold, chest expansion measurably better, inspiratory muscle training established",
     "Inspiratory muscle training is worth real effort here — with a stiff chest wall, a stronger diaphragm is the most direct lever you have on breathlessness. Posture work is not cosmetic: a collapsed, flexed posture mechanically reduces the volume your chest can hold."],
    ["Strength & aerobic", 10, 18,
     "Build general strength and aerobic capacity within the mechanical limit.",
     "clear aerobic and strength gains, daily activities easier, breathlessness improved for the same task",
     `${s.strength} Expect a ceiling that is set by the shape of your chest rather than your effort — but the distance between where you are and that ceiling is usually much bigger than people assume.`],
    ["Full return & long-term watch", 18, 20,
     "Return to full activity and keep an eye on the things that creep up slowly.",
     "back to your normal activities, a maintenance routine, monitoring arranged if you need it",
     `${s.watch}`]
  ]
});

/* Respiratory muscle weakness — orthopnoea is the hallmark, and in
   neuromuscular disease exhausting exercise is itself the hazard. */
A.respmuscle = (s) => ({
  total: 16,
  freq: "Inspiratory muscle training twice daily + general activity as tolerated",
  note: `${s.why} The tell-tale sign of a weak diaphragm is breathlessness LYING FLAT — within seconds to a minute of lying down, and relieved by sitting up. It happens because the abdominal contents push up against a diaphragm that cannot push back. If that is you, sleeping propped up is not a preference, it is a treatment.`,
  variants: RESPMUSCLE_VARIANTS,
  ph: [
    ["Assess & protect your breathing", 0, 2,
     "Understand how weak the breathing muscles actually are and protect what you have.",
     "breathing function measured (including lying down), sleeping position sorted, a plan for chest infections agreed",
     `Sleep propped up if lying flat makes you breathless, and get your breathing measured both sitting AND lying — a big drop when you lie down is how diaphragm weakness is caught. Warning signs that your night-time breathing needs support: morning headaches, unrefreshing sleep, daytime sleepiness, vivid dreams.${s.extra ? " " + s.extra : ""}`],
    ["Inspiratory muscle training", 2, 6,
     "Train the breathing muscles specifically.",
     "training twice daily at the prescribed load, inspiratory strength improving, breathlessness easing with daily tasks",
     `${s.imt}`],
    ["Add functional & aerobic work", 6, 11,
     "Build general activity and function around the breathing work.",
     "walking or cycling regularly, daily tasks easier, no post-exercise exhaustion lasting into the next day",
     `${s.load}`],
    ["Maintain", 11, 16,
     "Keep it going and protect against the thing that actually causes trouble.",
     "training maintained, a chest-infection action plan in place, monitoring arranged",
     `Chest infections are the real danger with weak breathing muscles, because a weak cough cannot clear them: keep vaccinations current, act on infections early rather than waiting, and ask about cough assistance — breath-stacking or a cough-assist machine — if your cough is weak. ${s.watch}`]
  ]
});

/* After pneumonia, TB or influenza — recovery is far slower than people expect,
   and saying so plainly is most of the treatment. */
A.postinfection = (s) => ({
  total: 14,
  freq: "Daily walking building to structured sessions 4–5×/week",
  note: `${s.why} The thing nobody warns you about: this takes much longer than you think. Around half of people are still not back to normal a month after pneumonia, fatigue commonly runs for two to three months, the cough can last six weeks or more, and the X-ray takes 6–12 weeks to clear even when you feel fine. None of that means something is wrong — but being told to expect a fortnight and still being wiped out at three months makes people think it does.`,
  variants: POSTINF_VARIANTS,
  ph: [
    ["Rest, clear & restart gently", 0, 2,
     "Let the acute illness settle while keeping the chest clear and moving a little.",
     "fever settled, breathing comfortable at rest, walking around the house, clearing sputum effectively",
     `Rest is appropriate here — this is one of the few phases in this app where it is. Keep deep breathing and coughing going to clear the chest, and get up and move a few times a day to protect against clots and further collapse.${s.extra ? " " + s.extra : ""}`],
    ["Rebuild walking", 2, 6,
     "Rebuild walking tolerance at an easy, conversational pace.",
     "walking 20–30 minutes daily, fatigue improving week to week, cough settling",
     "Expect fatigue to be the last thing to go and to lag well behind the chest. Watch for delayed crashes 12–72 hours after activity — if that pattern appears, this is the wrong plan and you should pace instead of push."],
    ["Aerobic & strength", 6, 11,
     "Add intensity and rebuild the strength lost while you were ill.",
     "tolerating brisker sessions, resistance training established, back to most normal activities",
     "This is ordinary reconditioning now. If you were in hospital or in bed for a week or more, expect the strength loss to be substantial and the rebuild to take a couple of months."],
    ["Full return", 11, 14,
     "Return to full work and exercise.",
     "back to your usual level, or a review arranged if you are not",
     `If you are still breathless or unwell at around 3 months, that deserves review rather than patience — a repeat X-ray at 6 weeks is routine, and persistent symptoms can mean something was missed. ${s.watch}`]
  ]
});

/* Mesothelioma — the goal is quality of life and symptom control, not "return
   to full capacity". The framing is deliberately different. */
A.meso = (s) => ({
  total: 12,
  freq: "Little and often, built around treatment and how you feel that week",
  note: `${s.why} This plan is built around what matters to YOU rather than a fitness target, and the order is deliberate: pain and breathlessness first, activity second. Exercise is safe here and helps fatigue and quality of life, including during chemotherapy or immunotherapy — that surprises people, but the evidence is consistent. It is not going to happen through unmanaged pain, though, which is why that comes first.`,
  variants: MESO_VARIANTS,
  ph: [
    ["Symptom control first", 0, 2,
     "Get pain and breathlessness properly managed — nothing else works until they are.",
     "pain controlled enough to move and sleep, breathlessness manageable, fluid drained if it needed draining",
     `Get the pain properly treated and do not tolerate it stoically — this tumour grows into the chest wall and nerves, so the pain is often nerve pain that ordinary painkillers barely touch and specific nerve-pain treatment does. Ask for the pain or palliative care team early: they are not only for the end, and early involvement measurably improves both quality of life and mood.${s.extra ? " " + s.extra : ""}`],
    ["Gentle activity & energy conservation", 2, 5,
     "Start gentle activity and learn to spend your energy where it counts.",
     "walking a little most days, using a handheld fan for breathlessness, energy going to the things you actually value",
     "A cheap handheld fan directed at your face genuinely reduces breathlessness — the cool air on the nerves of the face changes how breathless you feel, it works within minutes, and it is one of the best-evidenced things in this whole plan. Prioritise, plan, pace and position: sit to do tasks, put things within reach, and stop spending energy on things that do not matter to you."],
    ["Build what you can, when treatment allows", 5, 9,
     "Build strength and activity in the windows treatment leaves you.",
     "some resistance work most weeks, walking further on the good days, maintaining independence with what matters",
     "Work with the treatment cycle rather than against it: expect less in the days after each dose and take what you can in the better week. Keeping muscle and staying out of a chair protects your independence, which is usually what people most want to keep."],
    ["Sustain function & quality of life", 9, 12,
     "Keep doing what matters to you for as long as possible.",
     "the activities that matter to you still happening, support in place, plans made on your own terms",
     `Make sure the compensation claim is moving if you have not already — this is a recognised industrial disease with dedicated schemes, the process rewards starting early, and it matters for your family as well as for you. Take the psychological support that is offered; this diagnosis is a lot to carry, and carrying it alone helps nobody. ${s.watch}`]
  ]
});


/* ----------------------------------------------------------- site tables -- */
/* Regex notes for anyone editing these:
   - `r` is a regex SOURCE string, matched case-insensitively against the
     diagnosis NAME. detectPlan ranks by LONGEST match; non-generic beats generic.
   - Parentheses in condition names are escaped by bridging with `.{0,n}` rather
     than matching them literally — "COPD (GOLD stage 1)" is reached with
     `copd.{0,3}gold stage 1`, which also matches "COPD GOLD stage 1".
   - Never use a bare `lung`, `pulmonary`, `pneumon`, `sarcoid` or `post-viral`:
     each of those hijacks unrelated diagnoses in this catalogue (`sarcoid` hits
     "Sarcoid arthropathy" [msk]; `post-viral` hits "Post-viral reactive
     arthralgia" [msk]; `pulmonary` hits the cardiac pulmonary-valve entries).
   - "Severe persistent asthma (step 4–5)" contains an EN DASH — never match it. */

const COPD_FREQ = "Supervised sessions 2–3×/week + walking on the other days";

const OBSTRUCTIVE = [
  ["COPD (GOLD stage 1 — mild)", "copd.{0,3}gold stage 1|gold stage (1|i)\\b", 12, COPD_FREQ,
   "COPD at GOLD 1 means your airflow test is still near normal and you may only notice it on hills or stairs.",
   "Continuous walking or cycling is usually well tolerated at this stage — build steady 20–30 minute sessions.",
   "This is the best possible time to be doing this. Stopping smoking now, while the loss is still small, changes your entire trajectory — and the fitness you build here is what you will be living off in twenty years."],
  ["COPD (GOLD stage 2 — moderate)", "copd.{0,3}gold stage 2|gold stage (2|ii)\\b", 13, COPD_FREQ,
   "COPD at GOLD 2 means airflow is moderately reduced and breathlessness on hills and stairs is now a regular feature.",
   "Continuous walking usually works, but switch to intervals — 2–3 minutes of walking, a pause, repeat — whenever continuous work leaves you unable to finish the session.",
   "This is the stage where most people first get referred to pulmonary rehab, and where it delivers its biggest wins."],
  ["COPD (GOLD stage 3 — severe, supervised)", "copd.{0,3}gold stage 3|gold stage (3|iii)\\b", 16, "Supervised sessions 2–3×/week — intervals, with an oximeter on",
   "COPD at GOLD 3 means airflow is severely reduced, breathlessness limits ordinary daily tasks, and flare-ups are more frequent.",
   "Use INTERVALS rather than continuous work: short bursts with rests let you do considerably more total training at a breathlessness and saturation level you can actually hold, and at this stage that difference is large.",
   "Supervision matters from here on — your saturations can drop when you walk, and that needs measuring rather than guessing at."],
  ["COPD (GOLD stage 4 — very severe, supervised)", "copd.{0,3}gold stage 4|gold stage (4|iv)\\b", 20, "Supervised sessions 2–3×/week — short intervals, oximetry, oxygen as prescribed",
   "COPD at GOLD 4 means very severe airflow limitation, often with low oxygen levels, and breathlessness with washing and dressing.",
   "Short intervals ONLY — 30–60 seconds of work with a full recovery, repeated. Many people at this stage cannot sustain even three continuous minutes, and that is precisely why intervals work: the same total training, at a level you can hold.",
   "Everyday tasks ARE your training here — sitting to shower, a perching stool, a rollator (which genuinely reduces breathlessness by supporting your arms), and pacing every single step. If you use oxygen, exercise with it exactly as prescribed."],
  ["COPD with pulmonary rehabilitation", "copd.{0,3}pulmonary rehab|copd with pulmonary rehab", 12, COPD_FREQ,
   "You are enrolled in pulmonary rehabilitation — a supervised programme of exercise plus education, and the best-evidenced treatment there is for this condition.",
   "Your programme sets the format; intervals are always a legitimate option if continuous work is too breathless.",
   "Finish the course — completion rates are poor and the people who drop out are the people who do not get the benefit. Then find a maintenance option before the course ends, because the gains fade within 6–12 months without one."],
  ["Chronic bronchitis", "chronic bronchitis", 12, COPD_FREQ,
   "Chronic bronchitis is the cough-and-sputum face of COPD: inflamed, mucus-producing airways, defined by a productive cough on most days for at least three months a year, two years running.",
   "Continuous or interval work both suit; clear your chest before a session and it will go considerably better.",
   "The cough is doing a job — do not suppress it. If you produce sputum most days, a clearance technique before exercise makes the session easier and reduces infections."],
  ["Emphysema", "emphysema", 14, COPD_FREQ,
   "Emphysema is destroyed air sacs and floppy airways: air gets IN but struggles to get out, so your lungs stay over-inflated and there is no room for the next breath.",
   "Intervals suit emphysema particularly well, because the problem builds up with continuous work: the faster you breathe, the less time you have to breathe out, so air stacks up and each breath starts from a worse position. Slow down before that spiral starts.",
   "Pursed-lip breathing is not a comfort measure here — it splints the floppy airways open from the inside so you can actually empty your chest. Breathe out for about twice as long as you breathe in, and lean forward onto your hands when you need to recover."],
  ["Alpha-1 antitrypsin emphysema", "alpha.?1 antitrypsin( emphysema)?|alpha.?one antitrypsin", 16, COPD_FREQ,
   "Alpha-1 antitrypsin deficiency is an inherited condition in which the protein that protects your lungs from your own enzymes is missing — so emphysema develops decades early, often in the lower lungs, and often in people who barely smoked.",
   "Intervals and pursed-lip breathing, as with any emphysema — the mechanics are the same, the cause is not.",
   "Two things follow from it being genetic. Your siblings and children should be tested — it is a simple blood test and knowing early matters enormously. And smoking is catastrophic rather than merely bad here: it can bring the disease forward by decades. Ask about augmentation therapy, and about your liver, which the same faulty protein can affect."],
  ["Bronchiolitis obliterans", "bronchiolitis obliterans|constrictive bronchiolitis|popcorn lung", 20, "Supervised sessions 2–3×/week + daily walking",
   "Bronchiolitis obliterans is scarring that narrows the smallest airways — from a transplant rejecting, an inhalation injury, or after certain infections. Air gets trapped behind them, and the scarring does not reverse.",
   "Intervals, exactly as in emphysema: air trapping is the shared problem, and short bursts with recovery let you empty your chest between efforts.",
   "The aim is to hold your ground and stay as strong as possible, since the airway damage itself is fixed. After a transplant this is what chronic rejection looks like — home spirometry catches it early, and a sustained fall of around 10% is a reason to ring your team."]
];
OBSTRUCTIVE.forEach(([label, r, total, freq, why, mode, extra]) =>
  add({ r, label, ...retime(A.copd({ label, r, freq, why, mode, extra }), total) }));

const ASTHMA_FREQ = "4–5×/week, always after a proper warm-up";
const EIB_WARM = "Warm up for a LONG time — 10–15 minutes building gradually, ideally with a few short bursts near the end. This is not padding: a hard warm-up triggers a refractory period of roughly 1–3 hours during which the airways will not react the same way, and it is one of the best-evidenced things in this plan.";
const STD_WARM = "Warm up gradually for a good 10 minutes before you push — asthmatic airways react to a sudden increase in ventilation, so easing into it is protective rather than optional.";

const ASTHMAS = [
  ["Asthma (exercise-induced)", "asthma.{0,3}exercise.induced|exercise.induced asthma|exercise.induced bronchoconstriction|\\beib\\b", 8, ASTHMA_FREQ,
   "Exercise-induced bronchoconstriction is your airways reacting to the drying and cooling caused by moving a lot of air — typically hitting 5–10 minutes IN or just after you stop, rather than the moment you start.",
   EIB_WARM,
   "Take your reliever 10–15 minutes BEFORE you start, if that is what you have been prescribed."],
  ["Asthma (stable, reconditioning)", "asthma.{0,3}stable|stable asthma", 10, ASTHMA_FREQ,
   "Your asthma is stable and the job now is rebuilding the fitness that got lost while it was not.",
   STD_WARM, ""],
  ["Allergic asthma (reconditioning)", "allergic asthma", 10, ASTHMA_FREQ,
   "Allergic asthma is driven by things you breathe in — pollen, dust mite, pets, mould — which set off inflammation that narrows the airways.",
   STD_WARM,
   "Treat the nose as well as the chest: untreated hay fever keeps asthma unstable, and a steroid nasal spray often improves the chest too."],
  ["Mild persistent asthma", "mild persistent asthma", 9, ASTHMA_FREQ,
   "Mild persistent asthma means symptoms more than twice a week but not daily — enough to need a regular preventer inhaler rather than just a reliever.",
   STD_WARM, ""],
  ["Moderate persistent asthma", "moderate persistent asthma", 11, ASTHMA_FREQ,
   "Moderate persistent asthma means daily symptoms and night waking most weeks — a level that needs a combination inhaler and proper review.",
   STD_WARM,
   "Daily symptoms mean your current treatment is not holding it — that is a review, not a reason to train harder."],
  ["Severe persistent asthma (step 4–5)", "severe persistent asthma|asthma.{0,3}step 4|brittle asthma", 14, "3–4×/week, guided by your control that week",
   "Severe asthma means symptoms persist despite high-dose combination treatment taken properly — it is a different beast from ordinary asthma, not simply more of it.",
   STD_WARM,
   "Ask about biologics if you are not already on one: injectable treatments have transformed severe asthma and got many people off steroid tablets entirely. If you are on maintenance prednisolone, resistance training is treating the muscle-wasting side effect, and your bones need checking."],
  ["Eosinophilic asthma (reconditioning)", "eosinophilic asthma", 12, "3–4×/week",
   "Eosinophilic asthma is driven by a particular inflammatory white cell, which shows up in your blood tests and tends to mean frequent flares and steroid courses.",
   STD_WARM,
   "This is the type that responds best to biologics — if you have had repeated steroid courses, ask whether you qualify, because it is a different life."],
  ["Allergic bronchopulmonary aspergillosis (reconditioning)", "allergic bronchopulmonary aspergillosis|\\babpa\\b", 14, "3–4×/week, after clearance if you produce sputum",
   "ABPA is an allergic reaction to a common mould growing in the airways of people with asthma — it causes thick mucus plugs, flares, and over time can scar the central airways into bronchiectasis.",
   STD_WARM,
   "If you produce sputum or cough up plugs, clear your chest BEFORE you exercise — this behaves partly like bronchiectasis, and the clearance-first rule applies. Coughing up brownish plugs is characteristic and worth reporting."],
  ["Asthma (general)", "\\basthma\\b", 10, ASTHMA_FREQ,
   "Asthma is variable narrowing of the airways — it changes hour to hour, and that variability is the whole character of it.",
   STD_WARM, ""]
];
ASTHMAS.forEach(([label, r, total, freq, why, warm, extra]) =>
  add({ r, label, ...retime(A.asthma({ label, r, freq, why, warm, extra }), total) }));


/* Post-COVID & post-viral. The split between these two tables is the single
   most consequential decision in this file: PEM-dominant presentations get the
   pacing archetype (no progressive overload ANYWHERE), and the rest get the
   PEM-screened reconditioning archetype which sends you to pacing at the gate
   if you screen positive. Deliberately NO bare `post-covid` or `post-viral`
   pattern — the first would steal "Post-COVID lung fibrosis" (which is a
   fibrotic disease and belongs with the ILDs) and the second would steal
   "Post-viral reactive arthralgia" from the msk domain. */
const PACED = [
  ["Long COVID (fatigue-limited)", "long covid|long.haul covid|post-covid.{0,3}fatigue.limited",
   "Long COVID with fatigue as the limiter means the problem is not your lungs and not your fitness — it is that exertion of any kind is followed by a disproportionate, delayed payback.",
   "If you take one thing from this plan: the delayed crash is the diagnostic feature and the thing to design around. It is why 'just build up slowly' fails here when it works everywhere else."],
  ["Post-viral fatigue reconditioning", "post-viral fatigue|post.viral fatigue syndrome|myalgic encephalomyelitis|\\bme/cfs\\b|chronic fatigue syndrome",
   "Post-viral fatigue is a recognised condition that follows many infections, not a failure to get going again — and where post-exertional malaise is present it overlaps closely with ME/CFS.",
   "Being told this is deconditioning, or that you are anxious, is common and it is wrong when PEM is present. The physiology is different, and so is the treatment."],
  ["Post-COVID dysautonomia (paced exercise)", "post-covid dysautonomia|covid.{0,3}dysautonomia|post-covid.{0,3}\\bpots\\b",
   "Post-COVID dysautonomia means the automatic nervous system that manages your heart rate and blood pressure on standing is not doing its job — so standing itself becomes exertion.",
   "Work HORIZONTAL first: recumbent bike, rowing, floor and pool work all avoid the blood pooling that drives your symptoms, and they let you do real work without provoking a crash. Compression to waist height, and salt and fluids if your clinician agrees, will do more than any exercise here. Rise slowly, and never stand still for long."],
  ["Post-COVID exertional dyspnea (paced)", "post-covid exertional dyspn|covid.{0,3}exertional dyspn|post-covid breathlessness",
   "Breathlessness on exertion after COVID, with normal or near-normal tests, is usually a breathing PATTERN problem rather than lung damage — fast, shallow, upper-chest breathing that never satisfies.",
   "Breathing retraining is the lever here and it works faster than reconditioning does: nose, low, slow, with a relaxed breath out. Screen for the delayed crash first, though — if it is there, pacing rules everything else."]
];
PACED.forEach(([label, r, why, extra]) =>
  add({ r, label, ...A.pacing({ label, r, why, extra }) }));

const POSTVIRAL = [
  ["Post-COVID-19 recovery", "post-covid-19 recovery|post-covid recovery|post-covid-19 reconditioning", 14,
   "Most people recover from COVID steadily over weeks to a few months, and gentle graded activity is exactly right for them.",
   "Screen honestly before you assume you are in that group — the delayed crash changes the plan completely."],
  ["Post-COVID deconditioning", "post-covid deconditioning|covid.{0,3}deconditioning", 12,
   "Time in bed or out of action costs strength and fitness fast, and rebuilding it is straightforward reconditioning — provided that is genuinely all this is.",
   "'Deconditioning' is the label most often put on post-exertional malaise by mistake, and acting on it causes real harm. Prove it is deconditioning with the two-day test below before you accept the label."]
];
POSTVIRAL.forEach(([label, r, total, why, extra]) =>
  add({ r, label, ...retime(A.postviral({ label, r, why, extra }), total) }));

/* Interstitial lung disease. "Interstitial lung disease" is deliberately NOT
   flagged generic: the curated REHAB_PLANS entry in app.js matches
   `interstitial lung` (17 chars) and is non-generic, so a generic catch-all here
   would lose to it and the whole family would fall back to the 12-week template. */
const ILDS = [
  ["Idiopathic pulmonary fibrosis", "idiopathic pulmonary fibrosis|\\bipf\\b", 12,
   "IPF is progressive scarring of the lung with no identified cause — the lung stiffens, oxygen struggles to cross into the blood, and it does not reverse.",
   "Ask about antifibrotic drugs (they slow the decline rather than reverse it) and about transplant assessment EARLY if you might be a candidate — referral is very commonly left too late, and being fitter improves your chances if you get there."],
  ["Interstitial lung disease", "interstitial lung disease", 12,
   "Interstitial lung disease is a family of conditions that inflame or scar the tissue between the air sacs, making the lungs stiff and small and starving the blood of oxygen on exertion.",
   "Getting the exact type identified matters more than it might seem — some types are inflammatory and genuinely improve with treatment, others scar and do not, and the plans diverge from there."],
  ["Non-specific interstitial pneumonia (NSIP)", "non.?specific interstitial pneumonia|\\bnsip\\b", 12,
   "NSIP is a pattern of uniform inflammation and mild scarring — and its outlook is considerably better than IPF, which is worth knowing if you have been reading about fibrosis in general.",
   "The cellular form in particular responds to immune-suppressing treatment and can improve substantially. Check whether an underlying connective tissue disease is driving it — NSIP is often the lung telling you about a systemic condition."],
  ["Usual interstitial pneumonia (UIP)", "usual interstitial pneumonia|\\buip\\b", 12,
   "UIP is the scarring pattern seen in IPF — patchy, honeycomb-like fibrosis that progresses and does not reverse.",
   "A UIP pattern carries the same practical consequences as IPF whatever the cause: antifibrotics, early transplant discussion, and oxygen assessment."],
  ["Hypersensitivity pneumonitis", "hypersensitivity pneumonitis|extrinsic allergic alveolitis", 12,
   "Hypersensitivity pneumonitis is your immune system reacting to something you are breathing in — birds, mould, hot tubs, humidifiers — and inflaming the lung tissue itself.",
   "Finding and REMOVING the trigger is the treatment, and it beats every drug here: get rid of the birds, fix the damp, stop using the hot tub. Caught early it can resolve almost completely; left in the exposure it scars permanently and behaves like IPF. That is the whole decision."],
  ["Connective-tissue-disease ILD", "connective.tissue.disease ild|\\bctd.ild\\b|connective tissue disease.{0,12}lung", 13,
   "This is lung involvement from a systemic autoimmune condition — rheumatoid arthritis, scleroderma, myositis or lupus — where the same process attacking your joints or skin is also inflaming your lungs.",
   "Two things shape the training. The immune-suppressing treatment can genuinely improve your lungs, so your ceiling may rise — re-test rather than assuming. And the systemic disease comes too: joint protection, Raynaud's (keep your hands and core warm, which matters more than it sounds), and steroid-related muscle weakness that resistance training directly counters."],
  ["Drug-induced interstitial lung disease", "drug.induced interstitial lung disease|drug.induced ild|drug.induced pneumonitis", 12,
   "Some medicines inflame the lungs — amiodarone, methotrexate, nitrofurantoin, bleomycin and the newer cancer immunotherapies are the well-known ones.",
   "STOPPING the drug is the treatment, and it must be a medical decision, not yours alone — some of these are treating something serious. Caught early it often improves substantially or resolves; that window is why this gets flagged so hard. Make sure the drug is recorded as an allergy so nobody restarts it."],
  ["Radiation pneumonitis (reconditioning)", "radiation pneumonitis|radiation.induced lung", 12,
   "Radiation pneumonitis is inflammation in the lung that was in the treatment field, typically appearing 6 weeks to 6 months after radiotherapy.",
   "This one has a better trajectory than most on this list: it is steroid-responsive and often settles, though it can leave a patch of fibrosis behind. Expect your ceiling to improve over months, and re-test rather than settling for today's limit."],
  ["Sarcoidosis (pulmonary, reconditioning)", "sarcoidosis.{0,3}pulmonary|pulmonary sarcoidosis", 12,
   "Pulmonary sarcoidosis is clumps of inflammatory cells in the lungs and lymph nodes — it often settles by itself, and many people never need treatment at all.",
   "The thing that catches people out: FATIGUE is usually the dominant symptom and it correlates poorly with how the lungs actually look, so a good scan does not mean you should feel fine. It is also the symptom that responds best to exercise, which is a genuinely useful fact."],
  ["Sarcoidosis (multisystem reconditioning)", "sarcoidosis.{0,3}multisystem|multisystem sarcoidosis|systemic sarcoidosis", 14,
   "Sarcoidosis affecting several organs — lungs plus skin, eyes, joints, nerves or heart.",
   "⛔ Get the HEART specifically checked before you train: cardiac sarcoidosis affects a meaningful minority, it causes dangerous rhythm disturbances, and it is the reason exercise clearance here is not a formality. Palpitations, blackouts or feeling faint mean stop and get assessed urgently. Steroid myopathy and eye involvement both need managing alongside."],
  ["Pulmonary Langerhans cell histiocytosis (reconditioning)", "pulmonary langerhans|langerhans cell histiocytosis|\\bplch\\b", 13,
   "PLCH is a smoking-related disease that fills the lungs with nodules and then cysts, almost exclusively in current or recent smokers.",
   "STOPPING SMOKING is the treatment and it is genuinely disease-modifying — this condition can stabilise or regress on that alone, which is rare and worth everything. The cysts bring a real risk of a collapsed lung, so sudden sharp one-sided chest pain with breathlessness needs same-day assessment."],
  ["Lymphangioleiomyomatosis (reconditioning)", "lymphangioleiomyomatosis", 13,
   "LAM is a rare condition, almost always in women, where abnormal muscle-like cells grow through the lungs and leave them full of cysts.",
   "Collapsed lung is common enough here to plan around — around two thirds of people have one at some point — so know the symptoms and get sudden one-sided chest pain assessed the same day. Ask about sirolimus, which can stabilise lung function; about oestrogen-containing contraception, usually avoided; and about flying and diving before you book."],
  ["Combined pulmonary fibrosis & emphysema (reconditioning)", "combined pulmonary fibrosis|\\bcpfe\\b|fibrosis (and|&) emphysema", 14,
   "CPFE is fibrosis in the lower lungs and emphysema in the upper — two diseases whose effects on the breathing tests cancel each other out.",
   "This is why the numbers lie here: your spirometry and lung volumes can look almost reasonable while your gas transfer is dreadful and your saturations collapse on walking. Trust the oximeter, not the report. Pulmonary hypertension is common in CPFE and worth screening for."],
  ["Post-COVID lung fibrosis (reconditioning)", "post-covid lung fibrosis|covid.{0,3}lung fibrosis|post-covid pulmonary fibrosis", 14,
   "Scarring left behind after severe COVID pneumonia, usually after a spell in hospital or intensive care.",
   "Unlike IPF, this frequently IMPROVES over 6–12 months rather than progressing — the scarring often remodels and the tests get better. Expect your ceiling to rise, and if you were in intensive care, remember the muscles and the mind take longer than the lungs do."],
  ["Sarcoidosis (general)", "sarcoidosis", 12,
   "Sarcoidosis is inflammation forming small clumps of cells in the organs it affects — most often the lungs, and often settling on its own.",
   "Fatigue is usually the dominant symptom and responds better to exercise than to anything else. Have the heart checked before training if there is any multisystem involvement."]
];
ILDS.forEach(([label, r, total, why, extra]) =>
  add({ r, label, ...retime(A.ild({ label, r, why, extra }), total) }));

/* Occupational dust disease. `farmer's lung` uses a straight apostrophe in this
   catalogue, but `.` is used to bridge it in case that ever changes. */
const DUSTS = [
  ["Asbestosis", "asbestosis", 14,
   "Asbestosis is scarring of the lung from asbestos fibres breathed in decades ago — typically 20–40 years before it shows up, which is why it appears long after the job ended.",
   "Report it and pursue the claim: this is a recognised industrial disease with compensation routes, and starting early makes it much easier.",
   "Stay in surveillance: asbestos also raises your risk of mesothelioma and lung cancer, and new chest pain, weight loss or coughing blood need prompt assessment rather than watchful waiting."],
  ["Silicosis", "silicosis", 14,
   "Silicosis is scarring from breathing crystalline silica dust — stone, sand, concrete, engineered worktops — and it can keep progressing even after the exposure ends.",
   "If you cut, grind or polish engineered stone, this needs urgent action: that exposure causes a fast, severe form in young workers, and your workmates need testing too.",
   "⛔ Get screened for TUBERCULOSIS and stay screened: silica cripples the lung's scavenger cells, so TB risk is several times higher than normal and it is the classic complication. Any new fever, night sweats, weight loss or worsening cough needs a TB test, not a course of ordinary antibiotics."],
  ["Coal workers' pneumoconiosis", "coal.{0,3}workers?.{0,3}pneumoconiosis|coal.?worker.{0,3}lung|black lung", 14,
   "Coal workers' pneumoconiosis is coal dust deposited in the lungs, causing nodules that can grow together into large fibrotic masses.",
   "Report it and claim — this is a recognised industrial disease with established compensation schemes.",
   "Stay in surveillance: the simple form can progress to progressive massive fibrosis even years after you left the pit. Coal dust also causes ordinary COPD alongside, so the obstructive side needs treating too."],
  ["Berylliosis", "berylliosis|beryllium disease", 14,
   "Chronic beryllium disease is an immune reaction to beryllium — used in aerospace, electronics, dentistry and nuclear work — rather than simple dust scarring, which is why it looks so much like sarcoidosis on a scan.",
   "It is frequently misdiagnosed as sarcoidosis for years. If you have ever worked with beryllium, say so and ask for the specific blood test — the treatment and the compensation both depend on the right label.",
   "Being immune-mediated, it can respond to steroids and partly improve — but only once exposure has completely stopped. Anyone else in that workplace should be tested."],
  ["Byssinosis", "byssinosis|brown lung|mill fever", 12,
   "Byssinosis is a reaction to cotton, flax or hemp dust — the classic sign is chest tightness on the first day back at work after a break, easing as the week goes on.",
   "That Monday pattern is the diagnosis, and the timing matters enormously: caught at this stage it is REVERSIBLE and largely resolves when the exposure stops. Continue in the dust and it becomes permanent, fixed obstruction.",
   "If the tightness has stopped following the working week and is now there all the time, the reversible window has closed — which makes stopping the exposure more urgent, not less."],
  ["Farmer's lung", "farmer.{0,2}s lung|farmers lung", 13,
   "Farmer's lung is a hypersensitivity reaction to mould spores in damp hay, grain or straw — your immune system inflaming the lung tissue in response to something you breathe in at work.",
   "AVOIDING THE ANTIGEN is the treatment and nothing else substitutes for it: dry the hay properly, ventilate the barn, use a proper respirator for dusty jobs, and consider mechanising the worst tasks.",
   "Caught early and with the exposure stopped, this largely resolves. Keep breathing the spores and it becomes permanent fibrosis that behaves like IPF — the acute attacks are a warning worth heeding, not something to work through."]
];
DUSTS.forEach(([label, r, total, why, extra, watch]) =>
  add({ r, label, ...retime(A.pneumoconiosis({ label, r, why, extra, watch }), total) }));


/* Airway clearance conditions — clearance BEFORE exercise, every time. */
const CLEARANCE = [
  ["Bronchiectasis (airway clearance & exercise)", "bronchiectasis.{0,3}airway clearance", 16,
   "Bronchiectasis is permanently widened, floppy airways that cannot clear themselves, so mucus pools, gets infected, and causes more damage — a cycle that feeds itself.",
   "Daily clearance is what breaks that cycle, and it is the treatment whether or not you feel unwell that day.",
   "Exercise is one of the best clearance aids there is — the deeper breathing and the movement shift secretions that sitting still never will.",
   "Know your baseline sputum colour and volume so you can spot a change early."],
  ["Non-CF bronchiectasis", "non.?cf bronchiectasis|non.?cystic fibrosis bronchiectasis|idiopathic bronchiectasis", 16,
   "Bronchiectasis not caused by cystic fibrosis — often following a childhood infection, an immune problem, reflux, or with no cause ever found.",
   "It is worth chasing the cause even years on: a treatable driver (immune deficiency, ABPA, reflux) changes the management substantially.",
   "Exercise loosens secretions and improves capacity; expect to cough more during a session, and clear it rather than suppress it.",
   "Get a sputum sample checked when things change — knowing which bug you grow shapes which antibiotic actually works."],
  ["Cystic fibrosis (adult reconditioning)", "cystic fibrosis.{0,3}adult|adult cystic fibrosis", 16,
   "Cystic fibrosis makes secretions everywhere thick and sticky — the lungs cannot clear them, the pancreas struggles, and it affects the whole body rather than just the chest.",
   "The modern picture has changed enormously: CFTR modulator drugs have transformed lung function and life expectancy for most people who can take them.",
   "This is worth knowing: exercise capacity independently predicts survival in cystic fibrosis. Training is not a lifestyle add-on here, it is prognostic — which is a rare and powerful thing to be able to say.",
   "Specific to CF: you lose a LOT of salt in sweat, so extra salt and fluid matter in heat and hard sessions, and plain water alone can leave you worse off. Watch for CF-related diabetes, keep an eye on bone density before high-impact work, and follow cross-infection rules strictly — do not share gyms or waiting rooms with other people who have CF."],
  ["Cystic fibrosis (airway clearance + exercise)", "cystic fibrosis.{0,3}airway clearance", 16,
   "Cystic fibrosis makes airway secretions thick and sticky, so they sit, get infected and scar the airways — clearance is the daily counter-measure.",
   "Get the sequence right, because it roughly doubles the benefit of each step.",
   "Exercise is a proven adjunct to clearance in CF and independently predicts survival — but it does not replace your physio session, it follows it.",
   "Salt and fluid replacement in heat, cross-infection precautions, and stop and get reviewed if you cough up frank blood."],
  ["Primary ciliary dyskinesia", "primary ciliary dyskinesia|kartagener|\\bpcd\\b", 16,
   "In primary ciliary dyskinesia the tiny hairs that sweep mucus out of your airways do not beat properly — so clearance that happens automatically for everyone else simply does not happen for you.",
   "Because the cilia will never work, manual clearance is not a phase you get past — it is a permanent daily substitute for a system you were born without.",
   "Exercise is a genuinely important part of clearance here, precisely because the automatic mechanism is absent.",
   "The same faulty cilia explain the glue ear and hearing problems, the sinus disease, the fertility issues, and the fact that around half of people have their organs mirror-imaged. Keep hearing under review — it affects far more than your ears."],
  ["Nontuberculous mycobacterial lung disease (reconditioning)", "nontuberculous mycobacterial|non.?tuberculous mycobacterial|\\bntm\\b|mycobacterium avium", 18,
   "NTM lung disease is a slow infection with environmental mycobacteria — cousins of TB found in soil and water — which usually take hold in airways already damaged by bronchiectasis or COPD.",
   "Treatment is a long haul: multiple antibiotics for 12–18 months, and the side effects are a real part of your rehab rather than a footnote.",
   "Keep exercising through the antibiotic course — it protects the muscle and appetite that the treatment erodes.",
   "Watch the specific drug side effects: amikacin damages hearing and BALANCE (report dizziness, and add balance work), ethambutol can affect vision, and weight loss is common and matters — you cannot rebuild muscle without eating. It is not contagious, unlike TB."]
];
CLEARANCE.forEach(([label, r, total, why, extra, gain, watch]) =>
  add({ r, label, ...retime(A.clearance({ label, r, why, extra, gain, watch }), total) }));

/* Thoracic surgery. All non-generic (except the family catch-all) so they
   out-rank the "Thoracic (lung) surgery" archetype in data/surgery-plans.js when
   a surgery is explicitly selected — surgeryPlanFor() checks allPlans() first
   and returns any non-generic name match. */
const THORACIC = [
  ["Post-lobectomy recovery", "post-lobectomy|\\blobectomy\\b", 16,
   "A lobectomy removes one lobe of a lung — commonly for cancer — and the remaining lung expands to take up the space.",
   "The ceiling here is genuinely good news: you typically lose only around 10–15% of your lung function, most people compensate well, and by 3–6 months the majority are back to near their previous activity.",
   "Build aerobic work steadily — the remaining lung expands into the space and the function you get back tends to exceed what people expect.",
   "Most people return to full normal activity, including sport. Breathlessness on hills may persist a little longer than you would like, and that usually keeps improving for up to a year."],
  ["Post-lobectomy (left) reconditioning", "post-lobectomy.{0,3}left|left.{0,10}lobectomy", 16,
   "A lobectomy on the left removes one of the two left lobes; the left lung is the smaller of the two, so proportionally you lose a little less than the same operation on the right.",
   "Expect a good ceiling — around 10–15% of function, largely compensated within months.",
   "Build aerobic work steadily and expect a good return.",
   "Most people get back to full activity. Keep the shoulder and posture work going on the operated side well past the point it feels necessary."],
  ["Post-lobectomy (right) reconditioning", "post-lobectomy.{0,3}right|right.{0,10}lobectomy", 16,
   "A lobectomy on the right removes one of the three right lobes; the right lung is the larger, so a right lobectomy takes a slightly bigger share of your total capacity.",
   "Expect a good ceiling — typically 10–20% of function, largely compensated within months.",
   "Build aerobic work steadily and expect a good return.",
   "Most people get back to full activity. Keep the shoulder and posture work going on the operated side well past the point it feels necessary."],
  ["Post-pneumonectomy recovery", "pneumonectomy", 26,
   "A pneumonectomy removes an ENTIRE lung. The space fills with fluid over months and your remaining lung does all the work from now on.",
   "⛔ Be clear about this, because being told it late is worse: your ceiling is permanently and substantially lower, and it does not come back. You have roughly half the lung you had, the remaining one cannot grow to compensate, and breathlessness on hills and stairs is your new normal rather than a rehab failure. Do not measure yourself against someone who had a lobectomy — it is a fundamentally different operation.",
   "Progress by function rather than by targets: the aim is to make the most of one lung, and that is a real and worthwhile goal. Expect gains to keep coming for a year.",
   "Irregular heartbeats are common in the first weeks and usually settle. Long term, be alert to any change in breathlessness — the space where the lung was can shift the heart and airways over time. Air travel and diving both need specialist advice, and diving is off the table."],
  ["Post-thoracotomy recovery", "thoracotomy", 18,
   "A thoracotomy is a long incision around the side of the chest with the ribs spread apart — it is one of the more painful operations there is, and it cuts through major muscles to get in.",
   "The shoulder is the story here: latissimus dorsi and serratus anterior are divided to open the chest, which is exactly why that shoulder goes weak and stiff, why the shoulder blade wings, and why posture drifts toward the scar. This muscle has been CUT — rebuilding it is a core part of the plan, not an afterthought.",
   "Work the shoulder girdle and posture deliberately alongside the aerobic work: shrugs, rows, wall slides and thoracic extension. Winging and weakness improve over months with specific work and stay if you ignore them.",
   "Persistent burning nerve pain along the scar affects up to half of people after a thoracotomy — it is the intercostal nerves, not something going wrong, and it responds to nerve-pain medication and desensitisation far better than to ordinary painkillers. Ask, rather than assuming this is just how it is now."],
  ["Post-decortication (empyema) reconditioning", "post-decortication|decortication", 20,
   "A decortication peels a thick rind of infected scar off a lung that has been trapped and unable to expand — it is done through a full thoracotomy and it is a big operation.",
   "Two jobs at once: the lung has to re-expand into a space it has not occupied for weeks or months, and the thoracotomy has cut the same chest-wall muscles as any other. Deep breathing is what re-expands the lung, so it is worth the pain.",
   "Expect a prolonged air leak and a drain that stays in longer than you hoped — both are common here and neither means it has failed. Keep walking with the drain in.",
   "Re-expansion continues for months and so does your improvement. Antibiotics usually run for weeks. Keep the shoulder and posture work going."],
  ["Post-lung-volume-reduction reconditioning", "lung.volume.reduction|\\blvrs\\b|post-lung-volume", 20,
   "Lung volume reduction removes or blocks off the worst-destroyed emphysematous parts of the lung, so the healthier parts and the diaphragm can work in a mechanically sensible position again.",
   "This is one of the few operations that can make an emphysematous chest work BETTER rather than just removing disease — but it is highly selective, and rehab before and after is a mandatory part of it rather than an optional extra.",
   "Expect genuine gains — less hyperinflation means a diaphragm that can actually pull. Keep pursed-lip breathing going; the mechanics improve but they do not become normal.",
   "The benefit is real but not permanent, and the underlying emphysema carries on. Maintenance exercise is what protects the result you paid for."],
  ["Post-pleurodesis recovery", "pleurodesis", 14,
   "A pleurodesis deliberately inflames and sticks the two linings of the lung together so fluid or air cannot collect between them again.",
   "It is genuinely painful for the first days — that is the treatment working, because the inflammation is what creates the stickiness. Get the pain properly managed, because a chest that hurts too much to breathe deeply will not stick down and will get infected.",
   "Deep breathing keeps the lung pressed against the chest wall, which is exactly what has to happen for this to work.",
   "Once it has stuck, it has stuck — most people get back to full activity. Mention the pleurodesis before any future chest surgery or scan."],
  ["Post-pleural-effusion recovery", "pleural.effusion|post-pleural", 12,
   "Fluid collected between the lung and the chest wall and compressed the lung; once drained, the lung re-expands into the space.",
   "The cause matters more than the drainage: the fluid is a symptom, and what caused it drives everything.",
   "Deep breathing re-expands the compressed lung — do it deliberately and often for the first weeks.",
   "Breathlessness usually improves quickly once it is drained. Fluid coming back needs investigating rather than just re-draining."],
  ["Post-pneumothorax recovery", "pneumothorax", 12,
   "A pneumothorax is air leaking into the space around the lung, letting it collapse — sometimes spontaneously in tall, slim young people, sometimes from underlying lung disease.",
   "⛔ Two hard rules that catch people out. FLYING: no flying until it has fully resolved and your team confirms it — typically at least 1–2 weeks after full re-expansion on a scan, because cabin pressure expands trapped air. DIVING: scuba diving is permanently OFF after a spontaneous pneumothorax unless you have had definitive surgery on both sides and specialist clearance — the risk on ascent is a fatal one, not a theoretical one.",
   "Avoid heavy lifting and straining early, then build normally. Once healed, exercise does not cause recurrence.",
   "Smoking multiplies the recurrence risk many times over, and stopping is the single most effective prevention there is. Recurrence is most likely in the first year. Sudden one-sided chest pain with breathlessness means get assessed the same day."],
  ["Post-empyema recovery", "post-empyema|empyema", 16,
   "An empyema is infected pus in the space around the lung — it needs draining and a long antibiotic course, and it leaves the lung stuck down and unable to expand fully.",
   "The lung has to re-expand into a space it has not used for weeks, and deep breathing is what does that. It is uncomfortable and it is the treatment.",
   "Expect this to take longer than a pneumonia — weeks of antibiotics and months of getting your capacity back.",
   "If the lung stays trapped despite drainage, a decortication may be needed to peel the rind off — that is a recognised next step, not a failure."],
  ["Post-thoracic-surgery recovery", "thoracic.surgery|chest surgery|\\bvats\\b|video.assisted thoracoscop|thoracoscop|wedge resection|lung resection", 16,
   "Surgery on the chest — however it was done, the ribs and the muscles between them were involved, and your breathing mechanics are temporarily disrupted.",
   "The early priority is the same for every one of these: breathe deeply and cough properly, hourly, because a chest infection is the main preventable complication.",
   "Build aerobic and shoulder-girdle work together.",
   "Keyhole surgery recovers considerably faster than open, but the nerve irritation between the ribs is much the same either way."],
  ["Diaphragm plication recovery", "diaphragm(atic)? plication|\\bplication\\b", 16,
   "A plication tightens a paralysed, floppy diaphragm down flat so it stops billowing up into the chest and squashing the lung above it.",
   "The breathlessness lying flat should improve markedly — that is the point of the operation. Sleep propped up for the first few weeks anyway while it settles.",
   "Breathing exercises and shoulder work as for any thoracic operation; the mechanics improve steadily over months.",
   "Most people get a real and lasting improvement in breathlessness. The nerve itself is not repaired by this — the diaphragm is simply held where it can stop getting in the way."],
  ["Thoracic surgery (general)", "thoracic (operation|procedure)|post-thoracic", 16,
   "An operation on the chest, involving the ribs and the muscles between them.",
   "Breathing exercises and supported coughing hourly in the early phase are the highest-value thing you do.",
   "Rebuild aerobic capacity and shoulder-girdle strength together.",
   "Follow your surgeon's specific restrictions — they override anything here."]
];
THORACIC.forEach(([label, r, total, why, ceiling, strength, ceilingLate]) =>
  add({ r, label, ...retime(A.thoracic({ label, r, why, ceiling, strength, ceilingLate, extra:"" }), total) }));

const TRANSPLANTS = [
  ["Post-lung-transplant reconditioning", "lung.transplant|post-lung.transplant", 26,
   "New lungs, and a new set of rules: the breathing problem is solved and replaced by a lifelong management job.",
   "Your ceiling is generally good and many people return to full active lives — the muscles decide how close you get, and they respond to training."],
  ["Post-double-lung-transplant reconditioning", "double.lung.transplant|bilateral lung transplant|post-double", 26,
   "Both lungs replaced — the option with the higher ceiling and the better long-term outlook.",
   "Expect a genuinely high ceiling: with both lungs replaced, many people get back to sport and full work. If your breastbone was divided, treat it like any sternotomy for the first 8–12 weeks."],
  ["Post-single-lung-transplant reconditioning", "single.lung.transplant|post-single", 26,
   "One lung replaced, and your own diseased lung stays where it is.",
   "Your ceiling is lower than a double transplant and that is expected rather than a failure: your old lung is still there, still diseased, and if it was emphysema it over-inflates and crowds the new one. It also stays under surveillance for infection and cancer for life."]
];
TRANSPLANTS.forEach(([label, r, total, why, ceiling]) =>
  add({ r, label, ...retime(A.transplant({ label, r, why, ceiling, extra:"" }), total) }));

const PHS = [
  ["Pulmonary hypertension (WHO-cleared exercise)", "pulmonary hypertension", 15,
   "Pulmonary hypertension is high pressure in the arteries of the lungs, forcing the right side of your heart to push against a load it was never built for.",
   "Your team has cleared you, which means they judge the disease stable enough for supervised training — that clearance is specific to your current condition, so anything that changes needs re-checking rather than pushing through.",
   "Keep the reviews going: this is a condition where treatment gets escalated based on measurements rather than symptoms, and worsening breathlessness, swelling or fainting means get seen now."],
  ["Pulmonary arterial hypertension (supervised)", "pulmonary arterial hypertension|\\bpah\\b", 15,
   "Pulmonary arterial hypertension is disease of the small lung arteries themselves — they thicken and narrow, so the right side of the heart has to generate far more pressure to push blood through.",
   "The supervision is not bureaucracy: this is the group where exercise-related fainting and sudden death are documented, and where the trial evidence for rehab comes specifically from monitored, low-intensity, specialist-centre programmes.",
   "Make sure targeted therapy is optimised before rehab, not instead of it — drugs first, exercise as the addition. Fainting, chest pain on exertion, or coughing up blood mean stop and be seen urgently."],
  ["Chronic thromboembolic pulmonary hypertension", "chronic thromboembolic pulmonary hypertension|\\bcteph\\b", 15,
   "CTEPH is pulmonary hypertension caused by old clot that never dissolved and instead turned into fibrous scar, permanently blocking the lung arteries.",
   "This is the one that can be CURED, and it is the most important thing on this page: pulmonary endarterectomy surgically removes the organised clot and can bring the pressures back to normal. Anyone with CTEPH deserves assessment at a specialist surgical centre before accepting drugs as the answer — and if surgery is not possible, balloon angioplasty is the next question to ask.",
   "Anticoagulation is lifelong here, which shapes what sport is sensible — no contact or collision sport, and take head injuries seriously."]
];
PHS.forEach(([label, r, total, why, extra, watch]) =>
  add({ r, label, ...retime(A.ph({ label, r, why, extra, watch }), total) }));

const PES = [
  ["Pulmonary embolism recovery", "pulmonary embolism", 12,
   "A pulmonary embolism is a clot that travelled to the lungs and blocked part of the blood supply — usually from a vein in the leg.",
   "Once you are anticoagulated and stable, movement is safe and actively encouraged: walking does not dislodge anything, and lying still causes more clots.",
   "Ask about how long your anticoagulation should run and whether the cause was ever identified — that decision shapes your recurrence risk more than anything you do in the gym."],
  ["Post-pulmonary-embolism reconditioning", "post-pulmonary.embolism|post.\\bpe\\b reconditioning|pulmonary.embolism reconditioning", 12,
   "You are past the acute clot and rebuilding the capacity it cost you — which is often much more than people were led to expect.",
   "Persistent breathlessness after a PE is common and it is not in your head: up to half of people have reduced exercise capacity at 6 months, and it has a name — post-PE syndrome.",
   "The 3-month mark is the one to hold your clinicians to: still breathless then means an echocardiogram, because a small number have chronic thromboembolic pulmonary hypertension, and that one is surgically curable."]
];
PES.forEach(([label, r, total, why, extra, watch]) =>
  add({ r, label, ...retime(A.pe({ label, r, why, extra, watch }), total) }));


const CRITICALS = [
  ["Post-ARDS recovery", "\\bards\\b|acute respiratory distress", 30,
   "ARDS is severe, whole-lung inflammation that floods the air sacs and requires a ventilator — you have survived one of the most serious things in medicine.",
   "The lungs themselves usually recover remarkably well — lung function is often close to normal within a year. What lags is everything else: muscle, nerve, memory and mood. That mismatch is confusing unless someone spells it out, so hear it now — normal lung tests do not mean you should feel normal.",
   "Expect improvement to continue for a year or more, and take the psychological follow-up seriously rather than treating it as optional."],
  ["Ventilator-weaning reconditioning", "ventilator.weaning|vent weaning|weaning from (the )?ventilat|difficult wean", 30,
   "Coming off a ventilator after a long period on one — your diaphragm has had the machine doing its work and has wasted accordingly.",
   "The diaphragm starts weakening within DAYS of being ventilated, simply because it is not being used. That is why inspiratory muscle training genuinely improves the chances of getting off the machine — it is one of the few things you can actively contribute to your own wean.",
   "Expect the wean to be a stuttering process with setbacks that are normal rather than failures. Progress is measured in hours off the machine."],
  ["Post-tracheostomy reconditioning", "tracheostom|tracheotom", 28,
   "A tracheostomy — a breathing tube through the front of the neck — either still in place or recently removed.",
   "Get your swallow assessed before you eat: with a tracheostomy, food and drink can go down the wrong way with NO cough to warn you, and that silent aspiration is both common and dangerous. A speaking valve gets your voice back and usually improves the swallow too.",
   "After the tube comes out, new noisy or wheezy breathing weeks to months later can mean the windpipe has narrowed where the tube sat — that needs urgent review, not an asthma inhaler. The scar softens over a year."]
];
CRITICALS.forEach(([label, r, total, why, extra, watch]) =>
  add({ r, label, ...retime(A.critical({ label, r, why, extra, watch }), total) }));

const SLEEPS = [
  ["Obstructive sleep apnea (exercise adjunct)", "obstructive sleep apn.{0,1}ea.{0,12}adjunct", 16,
   "Obstructive sleep apnoea is your airway collapsing repeatedly while you sleep — each time, you stop breathing until your brain wakes you just enough to reopen it, hundreds of times a night.",
   "Exercise here is an ADJUNCT, and a surprisingly effective one: it cuts the number of events per hour by roughly a quarter to a third on its own.",
   "It does not replace the CPAP, and the CPAP does not replace it — they treat different parts of the problem.",
   "If your symptoms change substantially, get re-tested rather than adjusting things yourself."],
  ["Obstructive sleep apnea (exercise + weight)", "obstructive sleep apn.{0,1}ea.{0,16}weight", 20,
   "Obstructive sleep apnoea driven by weight — fat around the neck and abdomen narrows the airway and splints the chest, and the airway collapses when the muscles relax in sleep.",
   "Weight is the disease-modifier here, and the numbers are worth knowing: roughly 10% weight loss cuts the events by about a quarter, and losing 10–15% can resolve mild disease outright.",
   "Aim for a sustainable deficit alongside resistance training, and be realistic about the timescale — this is measured in months and the plan reflects that.",
   "Get re-tested after significant weight loss: your pressures may need lowering, and mild disease can genuinely resolve. Do not just stop the machine because you feel better — that is what the re-test is for."],
  ["Central sleep apnea (reconditioning)", "central sleep apn.{0,1}ea|cheyne.stokes", 18,
   "In central sleep apnoea the airway is open but the brain simply stops sending the signal to breathe — it is a control problem rather than a blockage.",
   "This is usually a symptom of something else, most often heart failure or opioid medication, so treating THAT is the main event and the exercise is support.",
   "If heart failure is behind it, exercise training is genuinely disease-modifying and this plan is worth real effort.",
   "One specific safety point: adaptive servo-ventilation is contraindicated in heart failure with a weak pump (ejection fraction 45% or below) because a major trial found it increased deaths. If you have both, check whoever set up your machine knew your ejection fraction."],
  ["Obesity hypoventilation (reconditioning)", "obesity hypoventilation|\\bohs\\b|pickwickian", 20,
   "Obesity hypoventilation means the weight of the chest and abdomen has reduced your breathing enough that carbon dioxide builds up in your blood, day and night — not just apnoea, but under-breathing.",
   "This is more serious than sleep apnoea alone and untreated it carries a genuinely high mortality — nightly ventilation is treatment, not a comfort measure.",
   "Weight loss is the only thing that reverses the underlying mechanics, and every kilo counts here.",
   "Avoid sedatives, strong painkillers and alcohol — they suppress the very breathing drive you are already short of. Worsening morning headaches, drowsiness or confusion mean your ventilation needs urgent review."],
  ["Obesity-related restrictive lung", "obesity.{0,10}restrictive", 20,
   "Weight around the chest and abdomen physically splints the ribcage and pushes the diaphragm upwards, so your lungs cannot fill — the lungs are healthy, the mechanics are not.",
   "It is much worse lying flat, because gravity stops helping and the abdominal contents press up into the chest.",
   "Exercise upright, sleep propped, and expect water-based work to be the easiest place to build volume — it unloads your joints while you train.",
   "This improves with weight loss more reliably than almost anything else in this section, because the cause is purely mechanical."]
];
SLEEPS.forEach(([label, r, total, why, extra, weight, watch]) =>
  add({ r, label, ...retime(A.sleep({ label, r, why, extra, weight, watch }), total) }));

/* Breathing-pattern disorders. "Chronic cough / breathing pattern disorder" is
   reached via `chronic cough.{0,3}breathing pattern` so it out-matches
   "Dysfunctional breathing pattern" — a bare `breathing pattern disorder` here
   would steal it. */
const BREATHING = [
  ["Chronic cough / breathing pattern disorder", "chronic cough.{0,3}breathing pattern|chronic cough", 12,
   "A cough that has outlived its cause, driven by a cough reflex that has become hypersensitive — so talking, laughing, perfume or cold air now set it off.",
   "The nerves are set too low rather than there being something in your chest — which is why cough suppression therapy from a speech therapist works, and why more antibiotics do not.",
   "Suppression techniques: swallow instead of coughing, sip water, breathe out through pursed lips when the tickle starts, and break the cough-irritation-cough cycle deliberately.",
   "Make sure the treatable drivers are excluded — asthma, reflux, and nasal drip. And if you take an ACE-inhibitor blood pressure tablet, that alone causes cough in about one in ten people and is the first thing to change."],
  ["Hyperventilation syndrome (breathing retraining)", "hyperventilation syndrome", 10,
   "Breathing faster or deeper than your body needs, which drops your carbon dioxide and produces a very convincing set of frightening symptoms.",
   "The tingling, dizziness, chest tightness and air hunger are all the direct result of low carbon dioxide — real, explainable, and not dangerous.",
   "Slow, low, nasal breathing with a relaxed breath out. Practise little and often when you are calm, so it is available when you are not.",
   "Episodes cluster around stress and poor sleep. Notice it early and go back to the practice."],
  ["Chronic hyperventilation (breathing retraining)", "chronic hyperventilation", 12,
   "Long-standing over-breathing that has become your normal resting pattern — so the symptoms are constant background rather than dramatic attacks.",
   "When it has been going on for years your body has partly adapted, which makes it subtler and slower to retrain — but no less fixable.",
   "Slow, low, nasal breathing. Expect this to take longer than acute hyperventilation because you are unlearning a long-established habit.",
   "Sighing, yawning and frequent throat-clearing are the tells — notice them as your early warning."],
  ["Vocal cord dysfunction (breathing)", "vocal cord dysfunction|\\bvcd\\b|paradoxical vocal fold", 11,
   "Your vocal cords close when they should open, so the obstruction is at your THROAT rather than in your lungs — which is why it feels so different from asthma once you know what to look for.",
   "The tells: noise when you breathe IN rather than out, tightness in the throat not the chest, it comes on in seconds and goes in minutes, your oxygen stays normal, and no inhaler has ever touched it.",
   "Speech and language therapy techniques are the treatment: a quick sniff, breathing out through pursed lips or a straw, relaxed-throat breathing. They work quickly once taught properly.",
   "This is very commonly misdiagnosed as asthma, sometimes for years and sometimes with steroids that were never going to help. Getting the right label is most of the battle."],
  ["Exercise-induced laryngeal obstruction", "exercise.induced laryngeal obstruction|\\beilo\\b", 11,
   "Your larynx narrows during hard exercise instead of opening up — noisy, frightening breathing at peak effort that stops within minutes of you stopping.",
   "The pattern that separates this from asthma: it hits at PEAK effort rather than 5–10 minutes in, it is noisy breathing IN, it resolves within minutes of stopping rather than taking 30, and a reliever does nothing.",
   "Speech and language therapy breathing techniques plus a proper warm-up. Many athletes learn to abort an episode within seconds once they have the technique.",
   "It is common in young athletes and very commonly treated as asthma first. The definitive test is watching the larynx during exercise."],
  ["Inducible laryngeal obstruction (exercise)", "inducible laryngeal obstruction", 11,
   "The larynx narrows in response to a trigger — exercise, strong smells, cold air, stress — causing sudden breathing difficulty at the throat.",
   "Same family as vocal cord dysfunction: throat, not chest; noise breathing in; seconds to onset and minutes to resolve; normal oxygen.",
   "Speech and language therapy techniques, plus identifying and reducing your triggers.",
   "Frequently mistaken for severe asthma, sometimes to the point of emergency treatment that was never going to work."],
  ["Dysfunctional breathing pattern", "dysfunctional breathing", 10,
   "Your breathing has fallen into an inefficient pattern — fast, shallow, upper-chest, with frequent sighs and a persistent sense of not getting a satisfying breath.",
   "It commonly rides alongside asthma and gets mistaken for it — which leads to more and more asthma treatment that cannot fix a mechanical problem.",
   "Nose, low, slow. Breathe into your lower ribs and belly rather than your upper chest, and let the breath out go rather than pushing it.",
   "If you also have asthma, treat both — controlling one will not fix the other, and knowing which symptom is which is genuinely liberating."],
  ["Chronic breathlessness syndrome (breathing retraining)", "chronic breathlessness", 12,
   "Breathlessness that persists even though the condition causing it is being treated as well as it can be — recognised in its own right, and treatable in its own right.",
   "Being told 'there is nothing more we can do for your breathing' is not accurate, and this plan exists because of that.",
   "The handheld fan is the standout: cool air on your face genuinely reduces the sensation of breathlessness within minutes, through the nerves of the face rather than any change in oxygen. It is cheap, it is well-evidenced, and it is under-used.",
   "Breathing retraining, pacing and — for refractory breathlessness — low-dose opioids all have evidence behind them. Ask about a breathlessness service."],
  ["Breathing pattern disorder (general)", "breathing pattern disorder|breathing pattern dysfunction", 10,
   "Your breathing pattern itself has become the problem — not the lungs, which is why the tests keep coming back normal.",
   "Normal tests do not mean nothing is wrong; they mean the problem is mechanical rather than structural, and mechanical problems retrain.",
   "Nose, low, slow, with a relaxed breath out.",
   "Relapses follow stress, illness and poor sleep. Catch it early."]
];
BREATHING.forEach(([label, r, total, why, extra, tech, watch]) =>
  add({ r, label, ...retime(A.breathing({ label, r, why, extra, tech, watch }), total) }));

const CHESTWALLS = [
  ["Kyphoscoliosis-related restrictive lung", "kyphoscolios|scoliosis.{0,10}restrictive|scoliosis.{0,10}lung", 20,
   "A curved, rotated spine twists the ribcage with it, so the chest cannot expand properly and the breathing muscles work at a mechanical disadvantage.",
   "Nothing to protect here structurally — the priority is keeping what expansion you have and training the muscles that drive it.",
   "Build aerobic capacity and general strength; there is usually much more room to improve than people assume.",
   "The thing to watch for is night-time breathing: severe curves cause breathing failure at night long before they do by day. Morning headaches, unrefreshing sleep and daytime sleepiness are the early signs, and overnight ventilation transforms them — so mention them rather than putting them down to age or stress."],
  ["Pectus excavatum (post-op reconditioning)", "pectus", 22,
   "A sunken breastbone, repaired surgically — most commonly with a curved metal bar slid behind the sternum to push it out and held there for a couple of years.",
   "⛔ The bar can DISPLACE if you twist, bend or roll early, and that means another operation. Log-roll to get in and out of bed, sleep on your back, and no twisting, bending, rolling or lifting for around 6 weeks. Pain relief matters more than stoicism here: a chest too painful to breathe deeply gets infected.",
   "Posture work is the part people skip and the part that holds the result — the bar fixes the chest, but slouching around it wastes the operation. No contact sport for around 3 months, then build back.",
   "The bar usually stays for 2–3 years and then comes out in a much smaller operation. Most people get an excellent and lasting result."],
  ["Chest-wall deformity (general)", "chest.wall deformity|chest.wall reconditioning|pectus carinatum|thoracic cage deformity", 18,
   "A chest wall whose shape or stiffness limits how much the lungs can fill — the lungs themselves are usually normal.",
   "Follow any surgical restrictions you have been given; otherwise the priority is expansion and the muscles that create it.",
   "Build strength and aerobic capacity — the gap between where you are and your mechanical ceiling is usually large.",
   "If you get morning headaches, unrefreshing sleep or daytime sleepiness, ask about your breathing overnight — restrictive chests under-breathe in sleep first."]
];
CHESTWALLS.forEach(([label, r, total, why, protect, strength, watch]) =>
  add({ r, label, ...retime(A.chestwall({ label, r, why, protect, strength, watch }), total) }));

const RESPMUSCLES = [
  ["Diaphragmatic weakness (reconditioning)", "diaphragmatic weakness|diaphragm weakness|eventration", 16,
   "Your main breathing muscle is weak, so the accessory muscles in your neck and chest are doing work they were never designed to sustain.",
   "The hallmark is breathlessness within seconds of lying flat, relieved by sitting up.",
   "Train at around 30–50% of your maximum inspiratory pressure, roughly 30 breaths twice a day. Expect measurable strength gains within 6–8 weeks — this is one of the faster-responding things in this whole file.",
   "Build general activity alongside; the breathing training helps the breathlessness, but the walking is what gives you the capacity.",
   "Get reviewed if it is getting worse rather than better — progressive weakness needs a cause found."],
  ["Phrenic nerve palsy (breathing)", "phrenic", 16,
   "The nerve driving your diaphragm is not working — commonly after cardiac surgery, a viral illness, or an injury to the neck or chest.",
   "One paralysed diaphragm is usually tolerated better than you would expect, and it often recovers.",
   "Train at around 30–50% of your maximum inspiratory pressure, roughly 30 breaths twice a day, and expect strength to improve over weeks.",
   "Build general aerobic work alongside — with one working diaphragm, overall fitness does a lot of compensating.",
   "Recovery commonly takes 6–24 months, so do not accept a permanent label early. If it has not recovered after that and you remain limited, plication is an option worth asking about. Both sides affected is a different, much more serious situation needing specialist care."],
  ["Neuromuscular respiratory weakness", "neuromuscular respiratory", 18,
   "The muscle or nerve disease affecting the rest of you also affects your breathing muscles and your cough.",
   "The aim here is maintaining and protecting, not getting stronger — and that is a legitimate goal, not a lesser one.",
   "Inspiratory muscle training can help, but the load must be modest — this is not a strength programme, and it should never leave you exhausted.",
   "⛔ Do NOT train to exhaustion, and avoid heavy eccentric work (slowly lowering heavy loads) — in these conditions that can damage muscle rather than build it. Stay active to keep function and prevent contractures, and stop well short of fatigue.",
   "Breathing function needs tracking over time, sitting AND lying. Cough assistance and night-time ventilation get added when the numbers say so — ideally before a crisis rather than during one. Chest infections are what actually cause harm here, so vaccinate and act early."],
  ["Respiratory-muscle-training program", "respiratory.muscle.training|inspiratory muscle training|\\bimt\\b|breathing muscle training", 12,
   "A programme to strengthen the muscles you breathe with, using a device that makes you work against a resistance as you breathe in.",
   "It reliably improves breathing-muscle strength and reduces breathlessness — the evidence is solid.",
   "The standard prescription: around 30–50% of your maximum inspiratory pressure, 30 breaths twice daily, most days, for 6–8 weeks, with the resistance adjusted up as you get stronger. Expect measurable gains by 6–8 weeks.",
   "This is an ADD-ON, not a substitute: it will not make you fit. Walking, cycling and lifting still have to happen.",
   "Useful as an adjunct in COPD, heart failure, weaning from a ventilator, and where breathing-muscle weakness is the specific limiter."]
];
RESPMUSCLES.forEach(([label, r, total, why, extra, imt, load, watch]) =>
  add({ r, label, ...retime(A.respmuscle({ label, r, why, extra, imt, load, watch }), total) }));

const POSTINFS = [
  ["Post-pneumonia recovery", "post-pneumonia|after pneumonia|pneumonia recovery", 14,
   "Your lung was infected and inflamed; the infection is treated, and now the tissue and your whole system have to recover.",
   "Do not measure yourself against how quickly the antibiotics worked — the chest clears long before you feel right.",
   "A follow-up chest X-ray at around 6 weeks is routine — make sure it happens, especially if you smoke or are over 50, because it is how anything hiding underneath gets found."],
  ["Post-influenza pneumonia recovery", "post-influenza pneumonia|influenza pneumonia|post-flu pneumonia", 15,
   "Influenza followed by pneumonia — either from the virus itself or a bacterial infection taking hold on top of it.",
   "This combination hits harder and recovers slower than either alone; expect fatigue to run for months rather than weeks.",
   "Get vaccinated for next season — this is the one recurrence you can genuinely prevent."],
  ["Post-tuberculosis lung reconditioning", "post-tuberculosis|post.?tb lung|after tuberculosis", 18,
   "TB has been treated, but it leaves damage behind: scarring, widened airways, cavities and narrowed airways that do not reverse.",
   "Around half of people treated for TB are left with measurable lung impairment — this is a real, under-recognised condition, not you failing to bounce back.",
   "Finish the full drug course whatever else happens. Long term: daily airway clearance if you produce sputum, and coughing up blood always needs investigating rather than being written off as old damage — an aspergilloma can grow in an old cavity."]
];
POSTINFS.forEach(([label, r, total, why, extra, watch]) =>
  add({ r, label, ...retime(A.postinfection({ label, r, why, extra, watch }), total) }));

add({ r:"mesothelioma", label:"Mesothelioma (reconditioning)",
  ...A.meso({ label:"Mesothelioma", r:"mesothelioma",
    why:"Mesothelioma is a cancer of the lining of the lung, caused by asbestos breathed in decades ago — often 20–50 years before it appears, and often after an exposure you barely remember.",
    extra:"Fluid around the lung is the usual cause of the breathlessness and draining it helps quickly — an indwelling catheter lets you drain at home and get on with your life.",
    watch:"Exercise is safe during chemotherapy and immunotherapy and reduces fatigue — which is the opposite of what most people assume, and worth acting on." }) });

/* ===================== NEURO + MSK long tail ===================== */
/* ============================================================================
   NEURO + MSK-GAP timelines — paste into scripts/generate-plans.mjs directly
   BEFORE the "generic archetype catch-alls" G(...) block.
   `A`, `add`, `PACE`, `retime`, `XCUT` are already in scope. No imports.

   Everything here targets diagnoses that previously matched NO plan at all and
   fell through to DOMAIN_FALLBACK: spinal cord injury by level, TBI by severity,
   concussion, the junctional spinal levels the LEVELS loop cannot build
   (C7-T1 / T12-L1 / L5-S1), and post-repair muscle tears.

   REGEX RULES OBSERVED HERE (this codebase has been bitten before):
     - `r`/`pick` are SOURCE strings, case-insensitive, matched on the diagnosis.
     - detectPlan ranks non-generic first, then LONGEST match — so any family
       catch-all is labelled "X (general)" (auto-flagged generic by add()).
     - Alternatives are anchored with enough words to be unambiguous. Never a
       bare `charcot` (Charcot-Marie-Tooth is a walking neuropathy, NOT the
       Charcot foot whose restriction is "do not walk on it"), never a bare
       `tetraplegia` where an ASIA-graded plan must win, never a bare
       `artery dissection` (that would hijack "carotid dissection STROKE" out of
       the curated stroke plan).
     - Parentheses/metacharacters in names are escaped.
   Education only — a treating clinician's protocol always overrides.
   ============================================================================ */

/* ---------------- spinal cord injury, by level ---------------- */
/* The functional target of SCI rehab is set almost entirely by the LEVEL: the
   lowest working muscle decides what independence looks like. Autonomic
   dysreflexia is a medical emergency at T6 and above, so that warning is
   attached per level rather than written once. */
A.sci = (s) => retime({
  total: 52,
  freq: "Daily, and most of the day — this is a whole rehabilitation programme, not a set of exercises",
  note: `A ${s.lvl} spinal cord injury leaves you ${s.spared}. That is what sets the realistic target: ${s.goal}. Rehab at this level is about building strength and skill into everything that still works, and using equipment for what doesn't — the timeline below is about learning function, not about the cord healing.`,
  variants: [
    { k: "complete", label: "Complete (AIS A)", sub: "No movement or feeling below the level",
      pick: `injury \\(${s.low}, complete\\)`, scale: 1,
      note: "With a complete injury the level sets a firm ceiling, so rehab aims squarely at mastering what's above it. That is not a small goal — most of the independence people gain comes from skill and equipment, not from recovery." },
    { k: "incomplete", label: "Incomplete (AIS B–D)", sub: "Some movement or feeling is preserved below the level",
      pick: `injury \\(${s.low}, incomplete\\)`, scale: 0.9,
      note: "An incomplete injury means some signal still crosses, so there is genuine potential for neurological recovery — most of it in the first 6–12 months, though it can continue for years. That's why this pathway adds heavy, repetitive, task-specific practice of the movements you DO have rather than only training compensations." }
  ],
  ph: [
    ["Medical stability, breathing, skin & first sitting", 0, 4,
     `Get medically stable, protect the healing spine, keep the chest and skin healthy, and start getting upright.${s.resp ? " Breathing comes first at this level." : ""}`,
     "spine cleared or braced as your surgeon directs, sitting up without your blood pressure dropping, chest clear, skin intact",
     `${s.ad ? "AUTONOMIC DYSREFLEXIA IS A MEDICAL EMERGENCY AT THIS LEVEL. A sudden pounding headache, sweating or flushing above the injury, and a blood pressure climbing fast, means something below the injury is hurting — usually a blocked catheter or a full bowel. SIT UP, do NOT lie flat, loosen anything tight, find and remove the cause, and get urgent help: untreated it causes strokes and seizures. " : ""}Follow your spinal brace and log-roll instructions exactly. Expect your blood pressure to drop when you first sit up — come up gradually. Pressure care starts NOW: skin over the tailbone and heels can break down in hours, not days.${s.resp ? " Assisted coughing and secretion clearance are as important as any exercise here." : ""}`],
    ["Sitting balance, transfers & wheelchair skills", 4, 12,
     `Build the sitting balance and the arm strength that everything else depends on, and start ${s.mob}.`,
     "sitting balanced with hands free, moving yourself in bed, starting transfers, tolerating a full day up in the chair",
     `Your shoulders have just become weight-bearing joints — they now do the work your legs used to. Shoulder pain eventually affects most wheelchair users and it is far easier to prevent than to fix, so build the muscles that pull BACKWARDS and DOWNWARDS, and get transfer technique right early. Lift or shift your weight every 15–30 minutes, every time you are sitting.${s.ad ? " Autonomic dysreflexia remains an emergency — know your triggers and your plan." : ""}`],
    ["Functional independence & equipment mastery", 12, 26,
     `Turn the strength into real independence: ${s.goal}.`,
     "transfers and daily self-care at your realistic level for this injury, confident wheelchair skills, managing your own bladder, bowel and skin routine",
     `Progress by skill, not by dates — this is the phase where equipment set-up matters as much as exercise. A badly fitted chair or cushion causes pressure sores and shoulder injuries.${s.tenodesis ? " Protect your TENODESIS grasp: do NOT let anyone stretch your finger flexors out straight. A little natural tightness in those tendons is what closes your fingers when you cock the wrist back — stretch it away and you lose your grip." : ""}${s.ad ? " Autonomic dysreflexia: still an emergency, for life." : ""}`],
    ["Community reintegration & lifelong self-management", 26, 52,
     "Get back to home, community, work or study — and lock in the routines that protect you for decades.",
     "managing at home and in the community with your equipment, a fitness routine you keep, skin and shoulders healthy",
     `Skin checks, pressure relief and shoulder care are lifelong, not a phase. Cardiovascular disease is now a bigger long-term risk to you than the injury itself, so keep training aerobically at whatever intensity your level allows.${s.ad ? " Everyone around you — family, employer, any new doctor — should know what autonomic dysreflexia is and what to do." : ""}`]
  ]
}, s.total);

/*  lvl, low(regex-safe), spared, goal, mob, total, ad(T6 & above), resp, tenodesis  */
const SCI_LEVELS = [
  ["C4", "c4", "with your head, neck and shoulder shrug, and a diaphragm that often works only partly",
   "breathing off a ventilator where that's possible, driving a power chair with head, chin or sip-and-puff controls, and directing your own care confidently",
   "getting used to a power chair", 64, true, true, false],
  ["C5", "c5", "with your shoulders and biceps — you can bend the elbow but not straighten it, and the wrist doesn't work yet",
   "feeding, grooming and writing with a wrist cuff and arm support, and a power chair for distance",
   "power-chair skills, with a manual chair over short distances", 60, true, false, false],
  ["C6", "c6", "with wrist EXTENSION — the most valuable muscle you have at this level",
   "a tenodesis grasp (cocking the wrist back closes the fingers for you), dressing your upper body, sliding-board transfers, and driving with hand controls",
   "manual wheelchair propulsion", 56, true, false, true],
  ["C7", "c7", "with a working triceps, so you can straighten the elbow and push down",
   "independent transfers and pressure-relief lifts, an independent manual wheelchair, and most of your own self-care — this level is the watershed for independence",
   "independent manual wheelchair skills", 52, true, false, false],
  ["C8", "c8", "with finger flexors, so you have a real grasp rather than a tenodesis one",
   "independent self-care, transfers and manual wheelchair with a genuinely functional hand",
   "independent manual wheelchair skills", 48, true, false, false],
  ["T1", "t1", "with the small muscles of the hand working",
   "full hand function and complete independence in self-care, transfers and a manual wheelchair",
   "independent manual wheelchair skills", 44, true, false, false],
  ["T2", "t2", "with full arm and hand function, but limited trunk control and a partly affected chest wall",
   "complete wheelchair independence — including kerbs, slopes and getting off the floor — and standing in a frame",
   "advanced wheelchair skills", 40, true, false, false],
  ["T4", "t4", "with full arm and hand function and a little more trunk control",
   "complete wheelchair independence including kerbs and floor transfers, plus standing in a frame for bone and bowel health",
   "advanced wheelchair skills", 40, true, false, false],
  ["T6", "t6", "with full arms and hands and useful upper trunk control",
   "complete wheelchair independence, advanced chair skills, and standing in a frame",
   "advanced wheelchair skills", 38, true, false, false],
  ["T8", "t8", "with your upper abdominals and a good deal of trunk control",
   "excellent trunk control, full wheelchair independence, and standing or exercise walking in long leg braces",
   "advanced wheelchair skills", 36, false, false, false],
  ["T10", "t10", "with most of your abdominals and strong trunk control",
   "full trunk control and wheelchair independence, with standing and exercise walking in long leg braces",
   "advanced wheelchair skills", 36, false, false, false],
  ["T12", "t12", "with your abdominals and trunk fully working, and the hip flexors close by",
   "full trunk control and wheelchair independence, and exercise walking with long leg braces and crutches",
   "advanced wheelchair skills", 36, false, false, false],
  ["L1", "l1", "with your hip flexors starting to work",
   "walking around the house in long leg braces with crutches, using a wheelchair for any distance",
   "wheelchair skills alongside brace work", 34, false, false, false],
  ["L2", "l2", "with useful hip flexors",
   "household walking in long leg braces with crutches, with a wheelchair for distance and endurance",
   "wheelchair skills alongside brace work", 34, false, false, false],
  ["L3", "l3", "with part of your quadriceps — the knee is beginning to straighten",
   "walking with knee-ankle or ankle braces and crutches, with a wheelchair still useful for longer distances",
   "brace and crutch walking", 32, false, false, false],
  ["L4", "l4", "with a working quadriceps and a stable knee",
   "community walking with ankle-foot braces and sticks or crutches",
   "brace and crutch walking", 30, false, false, false],
  ["L5", "l5", "with the muscles that lift the foot working, though push-off is weak",
   "community walking with an ankle-foot orthosis, usually without needing a wheelchair",
   "walking with an ankle-foot orthosis", 28, false, false, false],
  ["S1", "s1", "with your calf working, so you can push off",
   "walking with little or no bracing, with endurance and power the main things to rebuild",
   "walking, then building distance", 26, false, false, false]
];
SCI_LEVELS.forEach(([lvl, low, spared, goal, mob, total, ad, resp, tenodesis]) => add({
  /* the comma anchors the level: `\(t1,` cannot match "(T10," or "(T12," */
  r: `spinal cord injury \\(${low}[,)]`,
  label: `Spinal cord injury (${lvl})`,
  ...A.sci({ lvl, low, spared, goal, mob, total, ad, resp, tenodesis })
}));

/* Level-unspecified tetraplegia / paraplegia. Left NON-generic: these are real
   catalogue diagnoses in their own right, and the level-specific and ASIA-graded
   plans above still outrank them on every name they own purely by being LONGER
   matches ("incomplete tetraplegia (asia c)" = 31 chars beats "tetraplegia" = 11;
   "hereditary spastic parapleg" = 27 beats "paraplegia" = 10). Both verified. */
add({ r: "cervical spinal cord injury|\\btetraplegia\\b|\\bquadriplegia\\b", label: "Cervical spinal cord injury (tetraplegia)",
  ...A.sci({ lvl: "cervical", low: "c6", spared: "with your shoulders and arms working to a degree that depends on exactly which level was injured",
    goal: "the most independence your particular level allows — the difference between C5, C6 and C7 is enormous, so the level matters more than the label 'tetraplegia'",
    mob: "wheelchair skills", total: 52, ad: true, resp: false, tenodesis: false }) });
add({ r: "thoracic spinal cord injury|\\bparaplegia\\b", label: "Thoracic spinal cord injury (paraplegia)",
  ...A.sci({ lvl: "thoracic", low: "t6", spared: "with full arm and hand function, and trunk control that depends on how high the injury is",
    goal: "complete wheelchair independence, and standing or exercise walking depending on the level",
    mob: "advanced wheelchair skills", total: 38, ad: true, resp: false, tenodesis: false }) });

/* ---------------- incomplete SCI graded by ASIA / AIS ---------------- */
A.asia = (s) => retime({
  total: 44,
  freq: "Daily, high-repetition task practice — dose is what drives recovery here",
  note: `${s.label} means the injury is INCOMPLETE: signal still crosses the injured segment, so there is real potential for neurological recovery. ${s.detail} Most recovery happens in the first 6–12 months, which is exactly why the work is heavy, repetitive and task-specific rather than compensatory.`,
  variants: PACE,
  ph: [
    ["Stability, positioning & finding what works", 0, 4,
     "Get medically stable, protect the spine, and map out exactly what movement and sensation you have.",
     "spine protected as directed, sitting tolerated, a clear picture of what's preserved",
     "AUTONOMIC DYSREFLEXIA IS AN EMERGENCY if your injury is at T6 or above: pounding headache and rising blood pressure means something below the injury is hurting (usually bladder or bowel) — sit up, don't lie flat, remove the cause, get urgent help. Pressure care and skin checks start immediately."],
    ["High-repetition task-specific practice", 4, 14,
     "Drive recovery with intensive, repetitive practice of the movements you actually have.",
     "measurable gains in the muscles you can activate, sitting balance with hands free, starting transfers",
     "Dose matters more than variety: hundreds of repetitions of the right task beats a long list of exercises. Shoulders are now weight-bearing joints — protect them from day one."],
    [s.walk ? "Standing, gait training & strength" : "Transfers, strength & functional independence", 14, 28,
     s.walk ? "Rebuild standing and walking, with body-weight support and bracing as needed." : "Convert the strength into transfers and independent daily function.",
     s.walk ? "standing with support, walking with aids or bracing over useful distances" : "independent or assisted transfers, confident wheelchair skills, self-care progressing",
     "Progress by what you achieve, not by the calendar. Falls are a real risk once you're upright — do the harder work with someone there."],
    ["Community function & long-term training", 28, 44,
     "Push endurance, balance and confidence into real life, and keep the gains.",
     "managing at home and in the community, a training routine you'll actually keep",
     "Recovery can keep creeping on for years, but only with continued loading — gains fade fast if training stops. Skin, shoulders and cardiovascular fitness are lifelong priorities."]
  ]
}, s.total);
[["Incomplete tetraplegia (ASIA C)", "incomplete tetraplegia \\(asia c\\)", "Most of the muscles below the level work, but at less than half strength — so movement is present but not yet functional.", false, 48],
 ["Incomplete tetraplegia (ASIA D)", "incomplete tetraplegia \\(asia d\\)", "Most muscles below the level are at least half strength, so useful function — often including walking — is a realistic goal.", true, 40],
 ["Incomplete paraplegia (ASIA C)", "incomplete paraplegia \\(asia c\\)", "The legs have movement but less than half strength, so standing and braced walking are worth training even if a wheelchair stays the main way to get around.", true, 44],
 ["Incomplete paraplegia (ASIA D)", "incomplete paraplegia \\(asia d\\)", "The legs are at least half strength, so walking is a realistic goal — the work is strength, endurance and balance.", true, 36]
].forEach(([label, r, detail, walk, total]) => add({ r, label, ...A.asia({ label, detail, walk, total }) }));

/* ---------------- cord syndromes ---------------- */
A.cordSyndrome = (s) => retime({
  total: 40,
  freq: "Daily task-specific practice + strength work",
  note: `${s.label}: ${s.what} ${s.prog}`,
  variants: PACE,
  ph: [
    ["Diagnosis, protection & early mobility", 0, 4,
     "Settle the medical picture, protect the spine, and get moving safely.",
     "medically stable, sitting and standing as safety allows, a clear map of what's affected",
     `${s.ad ? "If your injury is at T6 or above, AUTONOMIC DYSREFLEXIA is a medical emergency — a pounding headache with rising blood pressure means something below the injury is hurting; sit up, find the cause, get urgent help. " : ""}Follow any spinal precautions exactly.${s.extra ? " " + s.extra : ""}`],
    ["Strength, balance & task practice", 4, 14,
     `Rebuild strength and control in what works, with high-repetition practice of ${s.focus}.`,
     "measurable strength gains, safer balance, daily tasks getting easier",
     "Numb areas need eyes on them: check skin daily and look at your feet. Fatigue is normal — spread work through the day rather than one hard session."],
    ["Function, gait & independence", 14, 26,
     "Turn strength into walking, transfers and independent daily function.",
     "walking or transferring at your realistic level, managing self-care, confident with your aids",
     "Falls are the main risk in this phase. Use the aid you actually need rather than the one you'd like to need."],
    ["Community function & maintenance", 26, 40,
     "Build endurance and confidence for real life, and keep training long-term.",
     "managing at home and in the community, a routine you'll sustain",
     "Gains fade without ongoing training. Keep aerobic work going — long-term heart and metabolic health matter as much as the neurology."]
  ]
}, s.total);
const CORD_SYNDROMES = [
  ["Central cord syndrome", "central cord syndrome",
   "the middle of the cord is damaged, usually from a hyperextension neck injury in someone with an already narrow canal — so the ARMS are weaker than the legs, and the hands worst of all.",
   "Most people recover a useful amount and many walk again; hand function is the slowest to return and often the last thing left.",
   "hand and arm function", true, "Neck extension is what caused it — avoid tipping the head back, especially looking up or during any manual therapy."],
  ["Brown-Séquard syndrome", "brown-s[eé]quard",
   "one half of the cord is damaged, which produces a strange but characteristic split — weakness on the SAME side as the injury, and loss of pain and temperature sensation on the OPPOSITE side.",
   "This has the best prognosis of all the cord syndromes — the large majority of people walk again.",
   "the weak side, while protecting the numb side", true, "The side that FEELS normal is the weak one, and the side that feels numb to heat and pain is the strong one — so burns and injuries happen on the leg you walk best on. Check it daily."],
  ["Anterior cord syndrome", "anterior cord syndrome",
   "the front two-thirds of the cord is damaged, usually from a loss of blood supply — so movement and pain/temperature sensation are lost, while position sense and vibration (carried at the back) survive.",
   "This carries the poorest prognosis of the cord syndromes, so rehab leans early on equipment, compensation and preserving what works.",
   "preserved position sense, which is your best asset here", true, ""],
  ["Posterior cord syndrome", "posterior cord syndrome",
   "the back of the cord is damaged, so strength is largely preserved but position sense and vibration are lost — you can move well but you can't feel where your limbs are.",
   "Prognosis for strength is good; the challenge is balance, because the body has lost the sense it normally navigates by.",
   "vision-guided balance and foot placement", true, "Balance collapses in the dark or with the eyes shut — that's the hallmark. Light the house well, especially the route to the bathroom at night."],
  ["Conus medullaris syndrome", "conus medullaris",
   "the very end of the cord is damaged, giving a mix of cord and nerve-root signs, with bladder, bowel and sexual function affected early and often severely.",
   "Recovery is variable; bladder and bowel management is usually the biggest day-to-day issue rather than the legs.",
   "leg strength and a reliable bladder/bowel routine", false, "Any NEW or worsening bladder or bowel change needs urgent review — do not wait to see if it settles."],
  ["Transverse myelitis recovery", "transverse myelitis",
   "the cord became inflamed across a segment, usually over hours to days, from an immune or infectious trigger rather than an injury.",
   "Recovery is genuinely unpredictable: roughly a third recover well, a third partially, and a third little — and it can continue over 2 years, so sustained rehab is worth it.",
   "whatever movement is returning", true, "Fatigue is prominent and real. Build up gradually rather than testing your limits early."],
  ["Spinal cord infarction recovery", "spinal cord infarct",
   "the cord lost its blood supply — a stroke of the spinal cord — usually affecting the front of the cord.",
   "Most recovery happens in the first 6–12 months; the pattern usually looks like anterior cord syndrome, so position sense is often the asset you build on.",
   "preserved sensation and any returning strength", true, "Manage the cause — blood pressure and vascular risk — alongside the rehab, or you risk another event."],
  ["Syringomyelia", "syringomyelia|\\bsyrinx\\b",
   "a fluid-filled cavity has formed inside the cord and expands slowly, classically causing a 'cape' of lost pain and temperature sensation across the shoulders and arms while touch is preserved.",
   "This is progressive rather than a one-off injury, so rehab aims at maintaining function and protecting numb skin, and any rapid change needs review rather than more exercise.",
   "shoulder and arm strength and burn prevention", false, "You can't feel heat or pain across the shoulders and hands, so burns and cuts go unnoticed — check skin and be careful with hot water, cooking and cigarettes. Straining, coughing and heavy lifting can raise pressure in the cavity and worsen symptoms; NEW or fast-worsening weakness needs a scan, not more rehab."],
  ["Tethered cord syndrome (adult)", "tethered cord",
   "the cord is anchored at its lower end and gets stretched with movement and growth, producing back and leg pain, weakness and bladder changes that worsen with bending and activity.",
   "After surgical release, rehab rebuilds strength gradually; without surgery the aim is to avoid the positions that stretch the cord.",
   "hip and leg strength within a comfortable range", false, "Repeated or end-range forward bending stretches the tether and provokes symptoms — avoid it. New bladder or bowel change needs urgent review."],
  ["Hereditary spastic paraplegia", "hereditary spastic parapleg|\\bhsp\\b gait",
   "an inherited condition in which the long nerve pathways to the legs degenerate slowly, causing progressive stiffness (spasticity) more than true weakness.",
   "It progresses slowly over years. Exercise doesn't stop it, but stretching, strength and aerobic work measurably preserve walking and reduce stiffness — so this is a long-term maintenance programme rather than a recovery one.",
   "hip flexor, calf and hamstring length plus hip strength", false, "Stiffness is the dominant problem, not weakness — daily stretching matters more than heavy loading. Sudden worsening isn't typical of HSP and deserves review."]
];
CORD_SYNDROMES.forEach(([label, r, what, prog, focus, ad, extra]) =>
  add({ r, label, ...A.cordSyndrome({ label, what, prog, focus, ad, extra, total: 40 }) }));

/* ---------------- cauda equina ---------------- */
/* Kept separate from the cord syndromes because the safety message is different
   and absolute: this is the one where a NEW bladder/bowel change is an emergency. */
A.caudaEquina = (s) => retime({
  total: 40,
  freq: "Daily — gentle nerve and strength work, built up slowly",
  note: `Cauda equina syndrome is compression of the bundle of nerve roots at the bottom of the spine. ${s.what} Nerve roots recover slowly — about a millimetre a day — so improvement is measured over months to two years, and bladder, bowel and sexual function usually lag well behind leg strength.`,
  variants: PACE,
  ph: [
    [s.postop ? "Post-decompression recovery & walking" : "Protection, symptom control & early movement", 0, 4,
     s.postop ? "Recover from the decompression, walk little and often, and protect the healing nerves." : "Settle symptoms, keep moving gently, and get the bladder and bowel routine established.",
     "wound settled and comfortable, walking short distances several times a day, a bladder and bowel routine in place",
     "ANY NEW OR WORSENING BLADDER OR BOWEL CHANGE IS A MEDICAL EMERGENCY — new difficulty passing or holding urine, new incontinence, or new numbness in the saddle area (between the legs, around the back passage) needs the emergency department the SAME DAY, not a physio appointment. That applies even after surgery: re-compression from bleeding or swelling is treatable if it's caught fast. Avoid heavy lifting and repeated bending for now, and walk little and often instead."],
    ["Restore movement, walking distance & confidence", 4, 12,
     "Build walking distance and normal spinal movement, and start loading the legs.",
     "walking 20–30 minutes comfortably, bending and daily tasks without a flare, numb areas identified and protected",
     "Numb skin can't warn you: check your feet and saddle area regularly, and be careful with hot water and tight shoes. Build gradually — nerve pain flares if you jump volume too fast."],
    ["Strength, bladder/bowel & pelvic floor rehabilitation", 12, 24,
     "Rebuild leg and trunk strength, and work seriously on pelvic floor, bladder and bowel function.",
     "clear leg strength gains, a reliable bladder and bowel routine, improving pelvic floor control",
     "Pelvic floor and continence rehab is not optional here — it's usually the part that most affects your life, and it needs specialist input rather than generic exercises. Progress is slow; that's the nerve, not your effort."],
    ["Return to work, activity & long-term management", 24, 40,
     "Get back to work and the activities you want, and adapt what needs adapting.",
     "managing your job and daily life, a maintenance routine, continence managed as well as it can be",
     "Some numbness or bladder change may be permanent — that's worth knowing rather than being surprised by, and it doesn't mean rehab failed. Keep the emergency rules in mind for life: a new change is always a new emergency."]
  ]
}, s.total);
[["Cauda equina (post-decompression recovery)", "cauda equina \\(post-decompression|cauda equina.*(post-decompression|post-operative|after surgery)|post-decompression cauda equina",
  "Yours has been decompressed surgically — the pressure is off, and now the nerves recover on their own timetable.", true, 40],
 ["Cauda equina syndrome (rehabilitation)", "cauda equina syndrome \\(rehabilitation\\)|cauda equina syndrome \\(neuro recovery\\)|cauda equina syndrome",
  "It is a surgical emergency when it happens, and rehab starts once the pressure has been taken off.", true, 44]
].forEach(([label, r, what, postop, total]) => add({ r, label, ...A.caudaEquina({ label, what, postop, total }) }));

/* ---------------- concussion & TBI ---------------- */
/* Deliberately reflects CURRENT evidence: prolonged rest in a dark room is
   harmful. Brief (24–48h) relative rest, then EARLY sub-symptom-threshold
   aerobic exercise shortens recovery. Staged return, never same-day. */
A.concussion = () => ({
  total: 6,
  freq: "Daily light aerobic exercise below your symptom threshold, 20 minutes, from about day 2",
  note: "A concussion is a functional brain injury, not a structural one — scans are normal, which doesn't mean nothing happened. The old advice to rest in a dark room until symptoms vanish is now known to make recovery SLOWER: after 24–48 hours of relative rest, light aerobic exercise kept just below the level that worsens your symptoms measurably speeds recovery. Most adults recover in 2–4 weeks, and children take a little longer.",
  variants: [
    { k: "standard", label: "Standard recovery", sub: "Typical — settling over 2–4 weeks", scale: 1 },
    { k: "child", label: "Child or adolescent", sub: "Under 18", pick: "child|adolescent|paediatric|pediatric|young", scale: 1.3,
      note: "Children and teenagers take longer than adults (often up to 4 weeks) and must complete return-to-LEARN before return-to-sport. School comes before sport, every time." },
    { k: "recurrent", label: "Repeat concussion", sub: "Not your first", pick: "repeat|recurrent|second|multiple|prior concussion", scale: 1.5,
      note: "Repeat concussions take longer each time and the threshold for a further one drops. A history of several warrants a proper discussion about the sport itself, not just about this recovery." },
    { k: "slowrec", label: "Slow to settle", sub: "Still symptomatic beyond 2 weeks", pick: "persistent|prolonged|slow", scale: 1.6,
      note: "Beyond about 2 weeks (4 in children), this needs targeted assessment rather than more waiting — the cervical spine, the vestibular/ocular system and mood/sleep are the usual drivers, and each has its own treatment." }
  ],
  ph: [
    ["Relative rest, then start moving (first 48 hours)", 0, 1,
     "Rest relatively — not absolutely — for 24–48 hours, then start light aerobic exercise below your symptom threshold.",
     "through the first 24–48 hours, able to do 20 minutes of light exercise that raises symptoms by no more than 2 points out of 10",
     "NEVER return to play on the same day as a concussion, at any age — the developing second injury is the dangerous one. Get urgent medical review for: worsening headache, repeated vomiting, increasing drowsiness, weakness or numbness, seizures, slurred speech, or unequal pupils. No alcohol, and avoid screens only insofar as they actually provoke symptoms — total darkness is not the goal."],
    ["Sub-threshold aerobic exercise & return to learn/work", 1, 2,
     "Build daily aerobic exercise below your symptom threshold, and get back to school or work in graded steps.",
     "20–30 minutes of aerobic exercise without symptoms spiking, back at school or work at least part-time, sleeping better",
     "The rule is sub-SYMPTOM-threshold: exercise to the point symptoms just begin to nudge up, then hold there — an increase of more than 2/10, or one that doesn't settle within an hour, means you went too hard. Still no contact, no head-impact risk, and nothing where falling is likely."],
    ["Staged return to sport: steps 1–4", 2, 4,
     "Work through the graded return-to-sport steps: light aerobic, then sport-specific movement, then non-contact drills.",
     "each step completed with at least 24 hours between them and no return of symptoms, back to full school or work first",
     "At least 24 hours per step, and only one step at a time. If symptoms return, drop back a step and try again the next day. Return to LEARN must be complete before you finish return-to-play — the brain that can't concentrate in class isn't ready for contact."],
    ["Full contact practice & return to play", 4, 6,
     "Return to full contact training, then to competition, once you're cleared.",
     "medical clearance, full training with no symptoms, confident in contact",
     "Full contact needs medical clearance first. Going back while still symptomatic is what turns a 3-week problem into a 3-month one — and a second impact before recovery is the rare but catastrophic scenario everyone is trying to avoid."]
  ]
});
add({ r: "mild traumatic brain injury|\\bmtbi\\b|\\bconcussion\\b|concussed", label: "Concussion / mild TBI", ...A.concussion() });

A.tbi = (s) => retime({
  total: 52,
  freq: "Daily therapy across movement, thinking and fatigue management",
  note: `${s.intro} Recovery is fastest in the first 6 months and continues for years, and it is rarely just physical — fatigue, attention, memory and mood usually drive day-to-day function more than strength does. ${s.detail}`,
  variants: [
    { k: "moderate", label: "Moderate TBI", sub: "Knocked out for up to a day; abnormal scan", pick: "\\bmoderate\\b", scale: 1 },
    { k: "mild", label: "Mild TBI / concussion", sub: "Brief or no loss of consciousness", pick: "\\bmild\\b", scale: 0.25,
      note: "At the mild end this is a concussion: brief relative rest, then early sub-threshold aerobic exercise and a staged return. Most people are recovered in 2–4 weeks." },
    { k: "severe", label: "Severe TBI", sub: "Prolonged unconsciousness; significant injury on the scan", pick: "\\bsevere\\b|\\bcoma\\b", scale: 1.6,
      note: "After a severe injury, rehab runs for years rather than months and usually involves a whole team. Physical recovery often outpaces thinking, behaviour and fatigue — which are what actually decide independence, work and relationships." },
    { k: "posttraumaticamnesia", label: "Prolonged post-traumatic amnesia", sub: "Confused and disoriented for a long spell", pick: "post-traumatic amnesia|\\bpta\\b", scale: 1.5,
      note: "The length of post-traumatic amnesia — how long before continuous memory restarts — is one of the better predictors of long-term outcome. During it, keep the environment calm, consistent and low-stimulus; formal exercise achieves little until it clears." }
  ],
  ph: [
    ["Medical stability, orientation & gentle movement", 0, 4,
     "Get medically stable, protect the brain from a second injury, and start gentle, low-stimulus movement.",
     "medically stable, oriented and following instructions, sitting and standing with help, sleeping in a normal cycle",
     "Protect against a second head injury above all else — no contact, no heights, no driving, no alcohol. Keep the environment calm and quiet: noise, crowds and screens genuinely worsen things at this stage. Seek urgent review for worsening headache, vomiting, new weakness, seizures or increasing drowsiness."],
    ["Fatigue management & graded activity", 4, 14,
     "Build a daily rhythm of activity and rest, and start graded aerobic and strength work.",
     "a consistent daily routine, tolerating 20–30 minutes of light aerobic exercise, fatigue predictable rather than random",
     "Fatigue is the single biggest limiter after a brain injury, and it's neurological, not laziness — pace deliberately and rest BEFORE you crash rather than after. Boom-and-bust sets recovery back by days each time."],
    ["Balance, strength & cognitive-motor work", 14, 30,
     "Rebuild balance, strength and walking, and start combining movement with thinking tasks.",
     "walking confidently, balance clearly improving, managing tasks that combine moving and thinking",
     "Dual-task work — walking while counting, carrying, or holding a conversation — is where the real deficits show up and where real life happens. Falls risk stays elevated; a second brain injury is the thing to avoid."],
    ["Community, work & long-term reintegration", 30, 52,
     "Get back toward work, study, driving and community life, with the right supports.",
     "managing at home and in the community, a graded return to work or study underway, driving formally assessed if relevant",
     "Driving needs formal assessment and often a legal clearance — do not simply resume. Return to work almost always needs to be graded and adjusted; going back full-time immediately is the most common way it fails."]
  ]
}, s.total);
add({ r: "traumatic brain injury|\\btbi\\b|\\bhead injury\\b|diffuse axonal", label: "Traumatic brain injury",
  ...A.tbi({ intro: "A traumatic brain injury is graded by how severe the initial injury was — how long consciousness and continuous memory were lost, and what the scan showed.",
    detail: "Use the severity selector to match this to your injury; the difference between mild, moderate and severe is the difference between weeks and years.", total: 52 }) });
add({ r: "paediatric (traumatic|acquired) brain injury|pediatric (traumatic|acquired) brain injury|child(hood)? (traumatic|acquired) brain injury", label: "Paediatric brain injury",
  ...A.tbi({ intro: "A brain injury in a child recovers on a different timetable to an adult's, and the effects can appear years later as the child grows into skills the injured area was meant to run.",
    detail: "School is the main rehabilitation setting — return-to-learn comes before return-to-sport, and the education plan matters as much as any exercise. Long-term follow-up matters because new difficulties can surface at each new stage of schooling.", total: 60 }) });

/* Post-concussion syndrome and its two treatable sub-types. Each needs a LONGER
   match than the plain `\bconcussion\b` in the concussion plan above. */
A.pcs = (s) => retime({
  total: 16,
  freq: "Daily sub-threshold aerobic exercise + the targeted work for your driver",
  note: `${s.what} The important message is that persistent symptoms after a concussion are usually NOT ongoing brain damage — they are treatable problems in specific systems, and each responds to targeted rehab rather than to more rest.`,
  variants: PACE,
  ph: [
    ["Assess the driver & restart sub-threshold aerobic exercise", 0, 2,
     `Work out what is actually driving your symptoms, and get back to daily aerobic exercise below your symptom threshold.`,
     "a clear idea of the main driver, 20 minutes of daily aerobic exercise without a symptom spike",
     "Rest is not the treatment and hasn't been for years — deconditioning makes every one of these symptoms worse. Exercise to where symptoms just begin to rise, then hold; more than a 2/10 rise means you overshot."],
    [s.ph2, 2, 6,
     s.goal2,
     s.crit2,
     s.restrict2],
    ["Build capacity & tolerance", 6, 11,
     "Increase the intensity and the complexity, and get back to work, school and normal activity.",
     "tolerating busy environments and screens, back at work or school, exercising near normal intensity",
     "Symptoms that rise a little during a session and settle within an hour are fine and expected. Sleep, mood and stress genuinely drive these symptoms — treating them is part of the rehab, not a distraction from it."],
    ["Return to full activity & sport", 11, 16,
     "Return to full activity, including sport, and keep the aerobic base you've built.",
     "full activity without a symptom flare, medical clearance for contact if relevant",
     "Persisting symptoms are very treatable but rarely resolve by waiting. If you're stuck, it usually means the driver was misidentified — go back and reassess rather than pushing harder."]
  ]
}, s.total);
add({ r: "post-concussion syndrome|persistent post-concussi|post-concussive syndrome", label: "Post-concussion syndrome",
  ...A.pcs({ what: "Symptoms lasting beyond about 4 weeks after a concussion — headache, dizziness, fog, fatigue, poor sleep.",
    ph2: "Treat the driver: neck, vestibular/ocular, or autonomic", goal2: "Target whichever system is driving your symptoms with specific treatment.",
    crit2: "the targeted treatment producing measurable change within 2–3 weeks", restrict2: "The three common drivers are the NECK (whiplash happened at the same moment), the VESTIBULAR/OCULAR system, and exercise intolerance from autonomic dysregulation. They need different treatments, so getting the driver right is most of the battle.", total: 16 }) });
add({ r: "post-concussion cervical|concussion.*cervical dysfunction|cervicogenic post-concussi", label: "Post-concussion cervical dysfunction",
  ...A.pcs({ what: "Neck-driven symptoms after a concussion: the same force that concussed the brain whiplashed the neck, and the neck refers headache and dizziness that feel identical to concussion symptoms.",
    ph2: "Neck treatment: manual therapy & deep neck flexor training", goal2: "Treat the neck directly — this is what actually changes these symptoms.",
    crit2: "headache and dizziness clearly reducing, deep neck flexor endurance improving, full comfortable neck range",
    restrict2: "The neck is the treatable cause here, and it responds well to manual therapy plus deep neck flexor and scapular training. Dizziness coming from the neck (not the inner ear) is a real and specific diagnosis — this is why it doesn't respond to rest.", total: 14 }) });
add({ r: "post-concussion visual|post-concussion vestibular|concussion.*(visual/vestibular|vestibular/visual|visual and vestibular)", label: "Post-concussion visual / vestibular dysfunction",
  ...A.pcs({ what: "Vestibular and ocular-motor symptoms after a concussion: dizziness, blurring, trouble with busy environments, and symptoms triggered by screens, supermarkets or head movement.",
    ph2: "Vestibular & ocular-motor rehabilitation", goal2: "Retrain gaze stability, convergence and balance with specific vestibular and ocular-motor exercises.",
    crit2: "gaze stabilisation and convergence improving, tolerating head movement and busy environments better",
    restrict2: "These exercises are SUPPOSED to provoke mild symptoms — that's the stimulus that drives adaptation. Aim for a mild, brief provocation that settles within 15–20 minutes; avoiding all provocation is what keeps this going for months.", total: 15 }) });

/* ---------------- TIA ---------------- */
/* Must not be hijacked by, nor hijack, the curated stroke plan: no `stroke` here. */
add({ r: "transient isch[ae]mic attack|\\btia\\b|mini-?stroke", label: "Transient ischaemic attack (reconditioning)",
  total: 12, freq: "Aerobic exercise most days, building to 150 minutes/week, plus strength twice a week",
  note: "A TIA leaves no lasting damage, which is exactly why it gets under-treated — but it is the loudest warning you will ever get. The risk of a full stroke is highest in the first days and weeks, so the urgent work is medical (blood pressure, cholesterol, heart rhythm, blood thinning); exercise is what keeps that risk down for the rest of your life.",
  variants: PACE,
  ph: [
    ["Urgent medical work-up & gentle restart", 0, 2,
     "Get the medical assessment done and start gentle daily activity.",
     "urgent assessment completed, medication started, walking comfortably each day",
     "This phase is medical, not athletic. A TIA needs same-week specialist assessment — the stroke risk is highest in the first 48 hours to 7 days. Get urgent help for any symptoms that come back and DON'T go away: face droop, arm weakness, speech trouble. Blood pressure and heart rhythm come before training."],
    ["Build the aerobic base", 2, 5,
     "Build up to regular moderate aerobic exercise — the intervention with the best evidence here.",
     "30 minutes of moderate activity most days, blood pressure trending down, comfortable at a conversational pace",
     "Moderate means you can talk but not sing. If your blood pressure is still uncontrolled, get it treated before pushing intensity — and check with your doctor first if you have heart disease or new symptoms on exertion."],
    ["Add strength & manage every risk factor", 5, 9,
     "Add resistance training and address every modifiable risk factor properly.",
     "strength training twice a week, blood pressure at target, smoking stopped, medication routine established",
     "Exercise alone won't do it. Blood pressure control, stopping smoking, lipids, diabetes and atrial fibrillation each independently drive stroke risk — this is where the results actually come from."],
    ["Long-term prevention", 9, 12,
     "Lock in a routine that keeps working for decades.",
     "150 minutes a week of moderate activity sustained, risk factors controlled, a plan you'll keep",
     "The benefit is entirely in the keeping. Most of the stroke risk after a TIA is preventable — but only while the medication and the exercise continue."]
  ] });

/* ---------------- acquired brain injury / haemorrhage / neurosurgical ---------------- */
/* NB: none of these may contain a bare `stroke`, `dissection` or `h(a)emorrhage`
   alternative — the curated stroke plan owns every name containing "stroke". */
A.abi = (s) => retime({
  total: 40,
  freq: "Daily task-specific practice; little and often beats one long session",
  note: `${s.what} ${s.prog} Recovery is driven by repetition of the specific tasks you want back — the brain reorganises around what you practise, and dose is the single biggest lever you control.`,
  variants: PACE,
  ph: [
    ["Medical stability & early mobilisation", 0, 3,
     "Get medically stable and start moving early, within whatever limits your team sets.",
     "medically stable, sitting out of bed, starting to stand with help",
     `${s.acute} Early movement helps, but very early aggressive exercise in the first 24 hours does not — follow your team's timing. Get urgent review for a sudden severe headache, new weakness, vomiting, seizure or increasing drowsiness.`],
    ["Fatigue management & graded activity", 3, 12,
     "Establish a rhythm of activity and rest, and build graded aerobic and strength work.",
     "a predictable daily routine, tolerating 20–30 minutes of light activity, fatigue manageable",
     "Fatigue after a brain injury is neurological and it dominates everything. Pace by the clock rather than by how you feel — rest before the crash, not after it."],
    ["Task-specific practice, balance & strength", 12, 26,
     `Practise the actual tasks you want back — ${s.focus} — with high repetition.`,
     "walking and balance clearly improved, real gains in the tasks you've practised, daily activities more independent",
     "High repetition of the specific task beats general exercise. Falls risk is high — do harder work with someone present."],
    ["Community reintegration & long-term training", 26, 40,
     "Rebuild endurance and confidence for community life, work or study.",
     "managing at home and in the community, a sustained exercise routine, work or study plan underway",
     "Driving needs formal assessment — don't just resume. Keep aerobic exercise going for life: it protects against a further event and is the best thing you can do for long-term brain health."]
  ]
}, s.total);
const ABI = [
  ["Subarachnoid haemorrhage recovery", "subarachnoid h(a)?emorrhage|subarachnoid haemorrhage|\\bsah\\b recovery|ruptured (cerebral )?aneurysm",
   "Bleeding into the space around the brain, usually from a ruptured aneurysm.",
   "Physical recovery is often surprisingly good, while fatigue, memory, concentration and mood are what actually limit life afterwards — and they are consistently under-estimated by everyone except the person living with them.",
   "walking endurance, balance and cognitive-motor tasks",
   "Blood pressure control matters enormously early on, and the first weeks carry a risk of vessel spasm and re-bleeding — this phase is run by your neurosurgical team, not by an exercise plan.", 44],
  ["Intracerebral haemorrhage recovery", "intracerebral h(a)?emorrhage|intracerebral haemorrhage|spontaneous intracerebral|\\bich\\b recovery",
   "Bleeding directly into the brain tissue, most often driven by high blood pressure.",
   "Early recovery is usually slower than after a clot, but the long-term ceiling is often as good or better — so early slowness is not a reason to expect a poor result.",
   "the specific movements and tasks you've lost",
   "Blood pressure control is the treatment and the prevention — it's what caused the bleed and what prevents the next one.", 44],
  ["Cerebral venous sinus thrombosis recovery", "cerebral venous sinus thrombosis|venous sinus thrombosis|\\bcvst\\b",
   "A clot in one of the brain's draining veins, which raises pressure inside the head — most common in younger adults.",
   "The outlook is generally good, with most people making a substantial recovery; headache and fatigue tend to outlast everything else.",
   "aerobic endurance and any residual weakness",
   "You'll be on anticoagulation — that means a real bleeding risk, so avoid contact sport and anything with a fall risk while you're on it. New severe headache, visual change or seizure needs urgent review.", 32],
  ["Vertebral artery dissection recovery", "vertebral artery dissection|vertebrobasilar dissection",
   "A tear in the wall of an artery at the back of the neck, often after a neck injury, a sudden turn, or even a trivial strain.",
   "The artery usually heals over about 3–6 months and most people recover well; the priority early is simply not disturbing it.",
   "balance, neck control and general conditioning",
   "AVOID end-range neck rotation and extension, and do NOT have your neck manipulated — that's how many of these happen. No heavy lifting, straining or contact sport until your specialist clears you. You are likely on blood thinning, which adds a bleeding risk of its own.", 30],
  ["Moyamoya disease (post-revascularisation)", "moyamoya",
   "A rare condition in which the main arteries at the base of the brain narrow progressively and a fragile network of small vessels takes over — usually treated by surgically rerouting blood supply.",
   "After revascularisation the blood supply improves substantially, and rehab focuses on rebuilding function safely.",
   "walking, balance and graded aerobic fitness",
   "The specific danger here is HYPERVENTILATION — blowing off carbon dioxide narrows the brain's blood vessels and can trigger symptoms or a stroke. So avoid breath-holding, straining, blowing hard, and very intense exertion. Dehydration and low blood pressure are also risky: drink well and progress intensity slowly.", 36],
  ["Cerebellar haemorrhage recovery", "cerebellar h(a)?emorrhage|cerebellar haemorrhage|cerebellar bleed",
   "Bleeding into the cerebellum — the part of the brain that coordinates movement.",
   "Strength is usually preserved; the problem is coordination and balance, and that responds well to sustained, specific balance training over months.",
   "balance, coordination and accurate limb placement",
   "Expect coordination rather than weakness to be the issue. Falls risk is high and doesn't match how strong you feel — use support during balance work.", 40],
  ["Lateral medullary (Wallenberg) syndrome", "lateral medullary|wallenberg",
   "An injury to the side of the brainstem, giving a distinctive mix: severe vertigo, difficulty swallowing, a hoarse voice, unsteadiness, and a curious split where pain and temperature sensation are lost on one side of the face and the OPPOSITE side of the body.",
   "Recovery is generally good for walking; swallowing is often the limiting problem early and needs specialist assessment before anything is eaten or drunk.",
   "balance, gaze stability and trunk control",
   "SWALLOWING must be assessed before eating or drinking — silent aspiration is common and causes pneumonia. Severe vertigo and a strong pull to one side make falls very likely early on.", 40],
  ["Locked-in syndrome (supportive exercise)", "locked-in syndrome",
   "A brainstem injury that leaves thinking and awareness fully intact while almost all voluntary movement is lost — usually with eye movement or blinking preserved as the way to communicate.",
   "Cognition is INTACT. That single fact should govern everything: the person understands every word said in the room. Communication comes first, and some people do regain movement over years.",
   "communication, any voluntary movement, and preventing complications",
   "Assume everything is understood, and speak to the person, not about them. The real work here is establishing communication, preventing pressure sores and contractures, and protecting breathing and chest health.", 52],
  ["Post-craniotomy motor reconditioning", "post-craniotomy|after (a )?craniotomy|craniotomy recovery",
   "Recovery after surgery that opened the skull — for a tumour, a bleed or an aneurysm.",
   "Recovery depends far more on what was operated on and where than on the operation itself; fatigue after a craniotomy is profound and lasts months.",
   "walking, balance and graded return to activity",
   "Avoid heavy lifting, straining and bending head-down for about 6 weeks — they raise pressure inside the head. Follow your surgeon's limits on flying and on any bone-flap precautions. Seizure risk means driving is restricted; check the rules that apply to you.", 30],
  ["Post-encephalitis reconditioning", "post-encephalitis|after encephalitis|encephalitis recovery",
   "Recovery after inflammation of the brain itself, from infection or an immune reaction.",
   "Recovery is slow and often continues over 1–2 years. Fatigue, memory and mood problems typically outlast the physical ones by a long way, and seizures are common.",
   "endurance, balance and cognitive-motor tasks",
   "Fatigue here is severe and easily under-estimated — pacing is the core skill. Seizures are common after encephalitis, so check driving and swimming rules, and never swim alone.", 44],
  ["Post-meningitis reconditioning", "post-meningitis|after meningitis|meningitis recovery",
   "Recovery after infection of the linings around the brain and cord.",
   "Most people recover well. Where problems persist they're usually fatigue, balance (the inner ear is often affected) and hearing rather than weakness.",
   "balance, gaze stability and aerobic endurance",
   "Hearing and balance organs are commonly damaged by meningitis — get hearing checked if it seems off, and expect balance work to be a real part of this. Deep fatigue for months is normal, not a setback.", 32],
  ["Post-encephalopathy reconditioning", "post-encephalopathy|encephalopathy reconditioning|after encephalopathy",
   "Recovery after a period where the brain was globally unwell — from low oxygen, liver or kidney failure, sepsis or a metabolic crisis — rather than from a focal injury.",
   "Recovery tracks whatever caused it. Where the underlying cause is fixed, function usually improves steadily over months, though attention and fatigue lag.",
   "endurance, balance and everyday functional tasks",
   "Treat the cause first — this improves as the underlying illness is corrected, and no amount of exercise substitutes for that.", 36]
];
ABI.forEach(([label, r, what, prog, focus, acute, total]) => add({ r, label, ...A.abi({ label, what, prog, focus, acute, total }) }));

/* ---------------- post-spinal-surgery neurological reconditioning ---------------- */
A.spineNeuroRecon = (s) => ({
  total: 24, freq: "Daily walking + graded strength work",
  note: `${s.what} Nerves that have been compressed for a long time recover slowly — roughly a millimetre a day — so leg strength and numbness lag well behind the wound healing, and that lag is normal rather than a sign the surgery failed.`,
  variants: PACE,
  ph: [
    ["Protect the surgery & walk little and often", 0, 6,
     "Let the surgery heal, walk frequently in short bouts, and avoid the loads that stress it.",
     "wound healed, walking 10–15 minutes several times a day, off strong pain relief",
     `AVOID heavy lifting, repeated bending and twisting for the first 6 weeks. Walking little and often is the treatment — sitting for long spells is usually what hurts most. ${s.fusion ? "After a fusion the bone has to knit: follow your surgeon's brace and lifting limits exactly, and don't smoke — nicotine measurably reduces fusion rates. " : ""}NEW bladder or bowel changes, or fast-worsening leg weakness, need urgent review.`],
    ["Restore movement & normal walking", 6, 12,
     "Restore comfortable spinal movement and normal walking distance.",
     "walking 30 minutes, bending and daily tasks without a flare, moving without guarding",
     "Start loading gradually now. Numbness and some nerve pain often persist for months — that's the nerve recovering, not the exercise damaging anything."],
    ["Progressive strengthening", 12, 18,
     "Rebuild trunk, hip and leg strength properly.",
     "clear strength gains, comfortable lifting technique, back to most daily activity",
     "Progressive loading is protective, not dangerous — your spine is not fragile after this. Build up in steps rather than testing it."],
    ["Return to work, activity & long-term care", 18, 24,
     "Return to full activities and keep a routine that protects the spine.",
     "back to work and activity, a maintenance routine you'll keep, confident bending and lifting",
     "The strongest predictor of another episode is stopping exercise. Heavy manual work usually needs a graded return and an honest look at technique."]
  ]
});
add({ r: "post-spinal-decompression|after spinal decompression|post-decompression reconditioning", label: "Post-spinal-decompression reconditioning",
  ...A.spineNeuroRecon({ what: "The nerves have been decompressed, so the pressure is off and now they recover on their own timetable.", fusion: false }) });
add({ r: "post-spinal-fusion|after spinal fusion|spinal fusion reconditioning", label: "Post-spinal-fusion neuro reconditioning",
  ...A.spineNeuroRecon({ what: "A fusion joins vertebrae into one solid block, so bone has to knit as well as nerves recovering.", fusion: true }) });

/* ---------------- multiple sclerosis ---------------- */
A.ms = (s) => retime({
  total: 24, freq: "Aerobic 2–3×/week + strength 2×/week, in short bouts with rests",
  note: `${s.what} Exercise used to be discouraged in MS; that was wrong. It measurably improves strength, walking, fatigue and mood, and it does NOT trigger relapses. The rule that matters is heat: overheating temporarily blocks conduction in damaged nerves, so symptoms flare while you're hot and settle as you cool.`,
  variants: [
    { k: "standard", label: "General MS management", sub: "Mixed or unspecified", scale: 1 },
    { k: "rrms", label: "Relapsing-remitting", sub: "Attacks with recovery between", pick: "relapsing", scale: 0.85,
      note: "Between relapses, train properly — this is when fitness is most worth building. During a relapse drop back to gentle movement and rebuild after; the relapse recovers on its own timetable, not faster for being pushed." },
    { k: "progressive", label: "Progressive", sub: "Gradual change without clear attacks", pick: "progressive", scale: 1.3,
      note: "In progressive MS the goal shifts from gaining to keeping: exercise still slows functional decline and preserves walking, but progress is measured in what you haven't lost. That is a real result, not a consolation prize." }
  ],
  ph: [
    ["Assess, cool & start moving", 0, 3,
     "Find your baseline, get a heat strategy in place, and start short bouts of activity.",
     "a realistic baseline, exercising without a lasting flare, a cooling plan that works",
     "HEAT is the key limiter: a hot room, a hot bath or a hard session can temporarily bring back old symptoms (Uhthoff's phenomenon). It's temporary and it is NOT damage or a relapse — but avoid it by exercising cool, pre-cooling, and drinking cold fluid. Train in the morning if afternoons are worse."],
    [s.ph2, 3, 9, s.goal2, s.crit2, s.restrict2],
    ["Build strength & aerobic capacity", 9, 17,
     "Build real strength and aerobic fitness in short, repeated bouts.",
     "clear strength gains, 20–30 minutes of aerobic work tolerated, daily tasks easier",
     "Short bouts with rests achieve far more than one long session — MS fatigue is central, not muscular, so 3×10 minutes is often possible when 1×30 isn't. Stop for genuine weakness, not for tiredness."],
    ["Long-term routine & flare planning", 17, 24,
     "Settle into a routine you'll keep, with a plan for relapses and bad days.",
     "a sustained routine, a clear plan for relapses, symptoms managed day to day",
     "Fitness fades faster in MS than in most conditions, so consistency beats intensity. Have a relapse plan: drop the load, keep gently moving, rebuild — don't stop altogether."]
  ]
}, s.total);
add({ r: "multiple sclerosis", label: "Multiple sclerosis",
  ...A.ms({ what: "MS damages the insulation around nerve fibres so signals slow or fail — which is why symptoms come and go, and why heat makes them worse.",
    ph2: "Balance, walking & strength foundations", goal2: "Build balance, walking quality and base strength.",
    crit2: "steadier balance, walking further and more confidently, strength improving",
    restrict2: "Falls are common and under-reported. Train balance where a fall is safe. Report a genuine relapse — new symptoms lasting over 24 hours without a fever — rather than exercising through it.", total: 24 }) });
add({ r: "ms-related fatigue|\\bms\\b fatigue management", label: "MS-related fatigue management",
  ...A.ms({ what: "MS fatigue is the most disabling symptom for most people with MS and it is nothing like ordinary tiredness — it's central, neurological, and sleep doesn't fix it.",
    ph2: "Pacing, energy budgeting & aerobic base", goal2: "Learn to budget energy across the day and build an aerobic base in small bouts.",
    crit2: "a predictable daily rhythm, fewer crashes, tolerating short bouts of aerobic work",
    restrict2: "Counter-intuitively, aerobic exercise REDUCES MS fatigue — the trap is doing it all in one go. Break activity into short bouts with real rests and schedule what matters for your best time of day. Pushing to exhaustion costs you the next two days.", total: 20 }) });
add({ r: "ms-related balance|\\bms\\b balance impairment", label: "MS-related balance impairment",
  ...A.ms({ what: "Balance in MS is hit from several directions at once — position sense, the vestibular system, strength and coordination — which is why it needs balance-specific training rather than general exercise.",
    ph2: "Balance-specific training", goal2: "Train balance directly and specifically, in progressively harder conditions.",
    crit2: "steadier with eyes closed and on soft surfaces, fewer stumbles, confident turning",
    restrict2: "Balance training has to be genuinely challenging to work — which means doing it where a fall is safe. Position sense is often the weak link, so eyes-closed and uneven-surface work is the treatment. Turning and dual-tasking are when people actually fall.", total: 22 }) });
add({ r: "ms-related spasticity|\\bms\\b spasticity management", label: "MS-related spasticity management",
  ...A.ms({ what: "Spasticity in MS is stiffness from an over-active stretch reflex rather than tight muscle — which is why it changes through the day and worsens when you're cold, tired, in pain or fighting an infection.",
    ph2: "Daily stretching & spasticity routine", goal2: "Establish a daily stretching and positioning routine that genuinely reduces the stiffness.",
    crit2: "easier movement after stretching, less night cramping, better positioning and comfort",
    restrict2: "Anything unpleasant below the level — a full bladder, constipation, an infection, a pressure sore, an ingrown toenail — cranks spasticity up. Look for that FIRST when it suddenly worsens; it's usually a urine infection, not the MS. Some spasticity is useful (it helps some people stand and transfer), so the goal is to manage it, not abolish it.", total: 24 }) });

/* ---------------- Parkinson's & atypical parkinsonism ---------------- */
A.parkinsons = (s) => retime({
  total: 26, freq: "Most days — this is treatment, and it needs the consistency of medication",
  note: `Parkinson's slowly reduces dopamine and the brain's movement 'volume control' turns down — so movements shrink without you noticing. ${s.what} Exercise is the only thing shown to slow the progression of the condition itself, and it has to be BIG, fast and effortful to work: gentle exercise keeps you fit but doesn't retrain amplitude.`,
  variants: [
    { k: "moderate", label: "Moderate stage", sub: "Both sides affected; balance becoming an issue", pick: "\\bmoderate\\b", scale: 1.15,
      note: "At the moderate stage, freezing and balance become the priorities and cueing strategies matter as much as the strength work." },
    { k: "early", label: "Early stage", sub: "Symptoms on one side; independent", pick: "\\bearly\\b", scale: 0.85,
      note: "Early is when exercise pays off most — vigorous aerobic work, genuinely out of breath, is the intervention with real evidence for slowing progression. Start now rather than when things get difficult." },
    { k: "advanced", label: "Advanced stage", sub: "Needs help to move about", pick: "advanced|\\blate\\b", scale: 1.4,
      note: "Later, the focus shifts to safety, transfers and preventing the complications of not moving. Falls and their fractures are what change the trajectory." }
  ],
  ph: [
    ["Assess, time the medication & start big movement", 0, 4,
     "Get a baseline, time exercise to your medication, and start large-amplitude movement training.",
     "exercising in your ON period, movements visibly bigger, a routine started",
     "Exercise during your ON time — usually about an hour after medication — or you're training the disease rather than the movement. Movements must feel EXAGGERATED to come out normal-sized: your internal sense of amplitude is what's broken, so what feels 'far too big' is usually just right."],
    ["High-intensity aerobic & amplitude training", 4, 11,
     "Build genuinely vigorous aerobic exercise and keep training large, fast movements.",
     "properly hard aerobic work 3×/week, amplitude maintained, walking with longer steps",
     "Intensity is the active ingredient. Gentle walking is good for you but it is not the treatment — the evidence sits with vigorous work (cycling, treadmill, boxing-style training) hard enough that you can't hold a conversation."],
    ["Balance, freezing & dual-task training", 11, 19,
     "Train balance hard, learn cueing for freezing, and practise dual-tasking.",
     "steadier turning, a cueing strategy that gets you out of a freeze, safer dual-tasking",
     "FREEZING responds to external cues, not to effort — a beat, a rhythm, a line on the floor, counting, or stepping over an imaginary object. Turning and doorways are the classic triggers and the classic falls. Do NOT try to push through a freeze; cue out of it."],
    ["Lifelong routine & fall prevention", 19, 26,
     "Lock in an exercise habit for life and fall-proof the home and routine.",
     "exercising most days, home hazards addressed, a plan for when things change",
     "The benefits stop when the exercise stops — this is a lifelong prescription, not a course of treatment. Falls are the main threat to independence, and Parkinson's medication commonly drops blood pressure on standing, so check that too."]
  ]
}, s.total);
add({ r: "parkinson'?s disease|parkinsonism|\\bparkinson'?s\\b|idiopathic parkinson", label: "Parkinson's disease",
  ...A.parkinsons({ what: "That's why the classic picture is small handwriting, a shuffling step and a quiet voice — the movements aren't weak, they're under-scaled.", total: 26 }) });
add({ r: "progressive supranuclear palsy|corticobasal degeneration|parkinson-plus|atypical parkinsonism", label: "Atypical parkinsonism (PSP / CBD / Parkinson-plus)",
  ...(() => { const b = A.parkinsons({ what: "", total: 22 });
    b.note = "Progressive supranuclear palsy, corticobasal degeneration and the other 'Parkinson-plus' conditions look like Parkinson's early on, but they progress faster, respond far less to Parkinson's medication, and hit balance early and hard. Backward falls in the first year are the hallmark of PSP and they happen without warning, because the protective reactions that normally save you are lost — so this plan is weighted toward safety and equipment much earlier than a Parkinson's plan.";
    b.ph[0][5] = "Falls — usually BACKWARDS and with no protective reaction — are the defining risk and they come early. Don't delay equipment or supervision until after the first fracture. In PSP, downward gaze is often lost, which makes stairs, kerbs and objects on the floor especially dangerous.";
    b.ph[1][5] = "Exercise maintains function, comfort and confidence and is well worth doing at a moderate intensity. Unlike Parkinson's, it will not slow these conditions — it's fairer to know that than to be told otherwise.";
    b.ph[3][5] = "This progresses faster than Parkinson's, so review the plan often and adapt early rather than late. Swallowing and speech commonly need specialist input; report choking or coughing on food rather than working around it.";
    return b; })() });

/* ---------------- MND & post-polio: the OVERWORK-WEAKNESS caution ---------------- */
A.mnd = (s) => retime({
  total: 24, freq: "Short, light sessions with generous rest — little and often, never to fatigue",
  note: `${s.what} The rule here is the opposite of most rehab: do NOT train to fatigue. Muscles whose nerve supply is failing can be permanently damaged by over-working them, so this plan keeps activity gentle and sub-maximal to maintain what you have rather than burn it out.`,
  variants: PACE,
  ph: [
    ["Assess, pace & protect", 0, 3,
     "Establish what you have, and find a level of activity that never leaves you weaker the next day.",
     "a clear baseline, activity without next-day weakness, a pacing plan in place",
     "The warning sign of OVERWORK WEAKNESS is being weaker 30 minutes to a day afterwards, or aching that lasts more than an hour. If that happens you did too much and must reduce — this is the one setting where 'no pain, no gain' is actively harmful."],
    ["Gentle maintenance & range", 3, 10,
     "Maintain range of movement and gentle strength, and protect the joints.",
     "full comfortable range maintained, activity without next-day weakness, daily tasks manageable",
     "Stretching and range work are safe and valuable; heavy resistance is not. Spend your energy on what matters to you — energy spent in a gym is energy not available for living."],
    ["Function, equipment & breathing", 10, 17,
     "Keep daily function going with equipment and adaptation, and look after breathing.",
     "equipment in place before it's urgently needed, function maintained, breathing monitored",
     "Get equipment EARLY — waiting until it's needed means waiting until you're less able to learn it. Breathing muscles matter: report breathlessness lying flat, morning headaches or broken sleep, because breathing support improves both quality and length of life."],
    ["Comfort, participation & review", 17, 24,
     "Keep doing what matters to you, comfortably, and review as things change.",
     "doing what matters most, comfortable, plans reviewed regularly",
     "Success here is measured in comfort and participation, not in strength gains. Reassess often — needs change, and staying ahead of them is what keeps life good."]
  ]
}, s.total);
add({ r: "amyotrophic lateral sclerosis|\\bals\\b \\(supportive|motor neuron disease|motor neurone disease|\\bmnd\\b|primary lateral sclerosis|progressive muscular atrophy|kennedy'?s disease", label: "Motor neurone disease (supportive exercise)",
  ...A.mnd({ what: "Motor neurone disease progressively destroys the nerves that drive muscle. Gentle exercise maintains range, comfort and function and is worth doing; heavy exercise cannot build strength in a muscle losing its nerve supply and may hasten its loss.", total: 24 }) });
add({ r: "post-polio syndrome|post-poliomyelitis", label: "Post-polio syndrome",
  ...A.mnd({ what: "Decades after polio, the surviving nerve cells that sprouted to take over from the dead ones become overloaded and start to fail — which is why new weakness and fatigue appear 30–40 years later in muscles that had fully recovered.", total: 22 }) });

/* ---------------- muscle disease & neuromuscular junction ---------------- */
A.myopathy = (s) => retime({
  total: 24, freq: "Moderate aerobic + sub-maximal strength, 3×/week, never to exhaustion",
  note: `${s.what} Moderate, sub-maximal exercise is safe and helpful in this group, and inactivity makes things measurably worse — but high-intensity and heavy lowering (eccentric) work can damage fragile muscle, so the dose sits deliberately in the middle.`,
  variants: PACE,
  ph: [
    ["Assess & establish a safe dose", 0, 3,
     "Find a level of exercise that leaves you no worse the next day.",
     "a baseline established, exercise without next-day soreness or weakness, urine normal colour",
     `Stop and seek review for DARK or cola-coloured urine, severe muscle pain, or marked weakness after exercise — that is muscle breaking down and it can damage the kidneys.${s.extra ? " " + s.extra : ""}`],
    ["Aerobic base", 3, 10,
     "Build a steady aerobic base at a moderate, conversational intensity.",
     "20–30 minutes of continuous moderate activity, recovering normally by the next day",
     "Aerobic exercise is the best-evidenced part of this and is well tolerated. Keep it steady and conversational rather than interval-based."],
    ["Sub-maximal strengthening", 10, 17,
     "Add light-to-moderate resistance work through the mid-range.",
     "strength maintained or improving, no next-day weakness, daily tasks easier",
     "Stay sub-maximal — roughly a weight you could lift 15 times, done 10 times. AVOID heavy eccentric (lowering) work, which is what damages fragile muscle, and never train to failure."],
    ["Long-term maintenance", 17, 24,
     "Keep a sustainable routine and adapt as things change.",
     "a routine you'll keep, function maintained, reviewed regularly",
     "Consistency beats intensity, permanently. Deconditioning is a real and avoidable second problem stacked on top of the muscle disease — most people lose more to inactivity in a year than to the condition."]
  ]
}, s.total);
[["Myotonic dystrophy", "myotonic dystrophy|steinert'?s disease",
  "Myotonic dystrophy causes both weakness and myotonia — muscles that grip and won't let go, then loosen with repetition.",
  "Myotonic dystrophy affects the HEART's rhythm and the breathing muscles, often before the limbs cause much trouble — cardiac review and monitoring are essential, and blackouts or palpitations need urgent attention rather than an exercise tweak. Daytime sleepiness is part of the condition, not laziness.", 24],
 ["Congenital myopathy (reconditioning)", "congenital myopathy",
  "A congenital myopathy is present from birth, is relatively stable rather than rapidly progressive, and mainly weakens the muscles closest to the trunk.",
  "Because it's stable, sensible training genuinely builds capacity. Breathing and spinal curvature need monitoring, and some types carry a malignant hyperthermia risk with anaesthetic — make sure any surgeon, anaesthetist or dentist knows the diagnosis.", 26],
 ["Mitochondrial myopathy", "mitochondrial myopathy|mitochondrial disease",
  "In mitochondrial disease the muscle's energy factories fail, so exercise capacity is limited by energy supply rather than by muscle bulk.",
  "Exercise IS beneficial here and improves capacity, but the margins are narrow: avoid prolonged fasting, dehydration, extremes of heat or cold, and all-out efforts, any of which can trigger a metabolic crisis. Build very gradually and never train when unwell.", 26],
 ["Inclusion body myositis", "inclusion body myositis",
  "Inclusion body myositis is a slowly progressive muscle disease that classically weakens the QUADRICEPS and the finger flexors — so knees give way and grip fails, in a very characteristic pattern.",
  "This one doesn't respond to immune treatment, which makes exercise the main intervention rather than an add-on: moderate resistance and aerobic training are safe and slow functional decline. Falls from the knee buckling are the main risk, and swallowing is commonly affected — get it assessed if food sticks.", 26]
].forEach(([label, r, what, extra, total]) => add({ r, label, ...A.myopathy({ label, what, extra, total }) }));
add({ r: "myasthenia gravis|lambert-eaton|myasthenic syndrome", label: "Myasthenia gravis / myasthenic syndrome (exercise management)",
  ...(() => { const b = A.myopathy({ what: "", extra: "", total: 20 });
    b.note = "In myasthenia the signal fails where nerve meets muscle, so the defining feature is FATIGABLE weakness: strength fades with repetition and comes back with rest. That's why the exercise rule here is short bouts with real rests, timed to your medication — and never training to fatigue.";
    b.freq = "Short bouts with generous rests, timed to your medication; 3×/week";
    b.ph[0][5] = "A MYASTHENIC CRISIS — worsening weakness with breathlessness or difficulty swallowing — is a medical emergency; get urgent help rather than resting it off. Heat, infection and a number of common medicines (including certain antibiotics) worsen myasthenia badly, so check any new medicine against the diagnosis.";
    b.ph[2][5] = "Exercise in your strongest window — usually about an hour after medication — and stop while you still have reserve. Strength that fades within a set is the condition, not deconditioning: rest, and it returns.";
    return b; })() });

/* ---------------- CMT — full name anchored ---------------- */
/* A bare `charcot` alternative here would drag Charcot-Marie-Tooth (a WALKING
   neuropathy) into the Charcot FOOT plan, whose restriction is "do not walk on
   it". That exact bug has bitten this repo before. Never shorten this. */
add({ r: "charcot-marie-tooth|hereditary motor and sensory neuropathy|peroneal muscular atrophy", label: "Charcot-Marie-Tooth disease",
  total: 26, freq: "Moderate exercise 3×/week + daily stretching; never to exhaustion",
  note: "Charcot-Marie-Tooth is an inherited neuropathy that affects the nerves to the feet and hands first — giving high arches, hammer toes, foot drop and a high-stepping walk. Moderate exercise is safe and helpful and inactivity is the real enemy, but muscles with a failing nerve supply can be damaged by over-work, so this stays deliberately sub-maximal.",
  variants: [
    { k: "standard", label: "Adult CMT", sub: "The usual pathway", scale: 1 },
    { k: "juvenile", label: "Juvenile / childhood", sub: "Diagnosed as a child", pick: "juvenile|child|paediatric|pediatric", scale: 0.85,
      note: "In children, keep it playful and keep them active — the priorities are foot posture, keeping the calf and heel cord long, and watching for a scoliosis as they grow." },
    { k: "advanced", label: "More advanced", sub: "Marked weakness or wasting", pick: "advanced|severe|marked", scale: 1.3,
      note: "With marked weakness, orthoses and equipment do more for function than any strengthening will — and getting them early preserves walking, energy and joints." }
  ],
  ph: [
    ["Assess, brace & protect the feet", 0, 4,
     "Sort out footwear, bracing and foot care, and set a safe exercise level.",
     "orthoses or AFOs fitted if needed, skin intact, exercise without next-day weakness",
     "This is a WALKING condition — keep walking. Foot drop and poor balance cause trips, so ankle-foot orthoses are enabling rather than a defeat. Numb feet need daily checks: blisters, pressure and burns go unnoticed. Do not train to exhaustion; muscles with a failing nerve supply recover from it badly."],
    ["Balance, ankle & foot strength", 4, 11,
     "Train balance directly, and strengthen what's left around the ankle and foot.",
     "steadier balance, fewer trips, tolerating 20–30 minutes of walking or cycling",
     "Balance training is the highest-value thing here, because position sense is impaired — train it where a fall is safe. Cycling and swimming load the legs without the trip risk."],
    ["Aerobic capacity & proximal strength", 11, 19,
     "Build aerobic fitness and strengthen the stronger muscles nearer the trunk.",
     "an aerobic base established, hip and thigh strength improving, daily tasks easier",
     "Train the muscles closer to the trunk — they're better innervated and carry the biggest functional payoff. Moderate intensity only: aching beyond an hour, or weakness the next day, means back off."],
    ["Long-term maintenance & hand function", 19, 26,
     "Keep the routine going and adapt for hand function as needed.",
     "a sustained routine, function maintained, adaptations in place",
     "This is lifelong maintenance and it works — people who keep exercising stay functional markedly longer. Watch for a slowly worsening scoliosis and for hand weakness, and get equipment early rather than late."]] });

/* ---------------- Guillain-Barré ---------------- */
add({ r: "guillain-barr[eé]|acute inflammatory demyelinating polyradiculoneuropathy", label: "Guillain-Barré syndrome recovery",
  total: 40, freq: "Short, frequent, sub-maximal sessions — build very gradually",
  note: "Guillain-Barré is an immune attack on the peripheral nerves: weakness rises from the feet upward over days, plateaus, then slowly recovers. Recovery follows the nerve's timetable — months, sometimes 1–2 years — and the commonest rehab mistake is pushing too hard too early, because over-working a re-innervating muscle sets it back.",
  variants: [
    { k: "standard", label: "Typical recovery", sub: "Walking again within a few months", scale: 1 },
    { k: "severe", label: "Severe (needed ventilation)", sub: "Needed breathing support", pick: "severe|ventilat", scale: 1.5,
      note: "After a severe episode needing ventilation, recovery runs over 1–2 years and critical-illness weakness is layered on top of the nerve injury. Progress is real but slow — measure it monthly, not daily." },
    { k: "paeds", label: "Child", sub: "In a child", pick: "paediatric|pediatric|child|juvenile", scale: 0.75,
      note: "Children recover from Guillain-Barré faster and more completely than adults — the outlook is genuinely good. Keep it playful and let fatigue set the pace." }
  ],
  ph: [
    ["Acute care, breathing & positioning", 0, 4,
     "Get through the acute phase safely: breathing, positioning and gentle range of movement.",
     "past the plateau, breathing safely, joints moving freely, skin and nerves protected",
     "Weakness climbing UPWARD, or any breathing or swallowing difficulty, is a medical emergency — this can reach the breathing muscles quickly. In this phase the work is passive range, positioning and pressure care, NOT strengthening. Nerve pain is common, severe, and needs treating properly."],
    ["Early gentle activity & sitting", 4, 12,
     "Start gentle active movement and rebuild sitting tolerance as the nerves begin to recover.",
     "sitting balanced, active movement returning, no next-day worsening after activity",
     "Do NOT train to fatigue — over-working a recovering muscle is the classic error here and costs weeks. Little and often, and stop while you still have something left. Profound fatigue is normal and outlasts the weakness."],
    ["Progressive strength & standing", 12, 26,
     "Rebuild strength gradually and get back to standing and walking.",
     "standing and walking with aids, strength clearly improving, fatigue more predictable",
     "Progress in small increments. Feet and hands are often numb — check skin daily. Expect recovery to be slower than everyone around you assumes."],
    ["Return to work, activity & endurance", 26, 40,
     "Rebuild endurance and get back to work and normal life.",
     "back to most activities, a graded return to work underway, endurance rebuilt",
     "Most people recover well, but residual fatigue and mild weakness commonly persist for a year or more — that's normal, not a relapse. A graded return to work beats a full-time one almost every time."]] });

/* ---------------- facial nerve ---------------- */
add({ r: "bell'?s palsy|facial nerve palsy|facial palsy", label: "Bell's palsy / facial nerve palsy",
  total: 16, freq: "Short daily sessions in front of a mirror — quality, never force",
  note: "Bell's palsy is a sudden weakness of one side of the face caused by swelling of the facial nerve. Most people recover well and about 7 in 10 recover completely — steroids started within 72 hours meaningfully improve the odds, so getting seen early matters far more than any exercise.",
  variants: [
    { k: "standard", label: "Typical Bell's palsy", sub: "Recovering over weeks", scale: 1 },
    { k: "severe", label: "Severe / slow to recover", sub: "Complete weakness, little movement by 3 weeks", pick: "severe|complete", scale: 1.8,
      note: "Complete weakness with no movement by 3 weeks recovers more slowly and carries a higher chance of synkinesis — the miswiring where the eye closes when you smile. That risk is exactly why forced, maximal exercise is discouraged." },
    { k: "ramsay", label: "Ramsay Hunt syndrome", sub: "With a painful rash (shingles)", pick: "ramsay|zoster", scale: 1.6,
      note: "Ramsay Hunt — shingles of the facial nerve — is more painful, more often affects hearing and balance, and recovers less completely than Bell's palsy. It needs antiviral treatment urgently." }
  ],
  ph: [
    ["Protect the eye & start gentle movement", 0, 2,
     "Protect the eye above all else, and begin gentle, small facial movements in a mirror.",
     "eye protected and comfortable, small symmetrical movements attempted, steroids started if within 72 hours",
     "THE EYE IS THE EMERGENCY, not the smile. If it won't close fully the cornea can dry out and ulcerate within days — use lubricating drops through the day, ointment and taping at night, and seek urgent help for eye pain, redness or blurring. See a doctor within 72 hours: steroids only work early. Weakness of an arm or leg alongside the face is a STROKE until proven otherwise — call emergency services."],
    ["Small, symmetrical, controlled movements", 2, 6,
     "Retrain small, precise, symmetrical movements — never big or forced ones.",
     "small controlled movements on the weak side, the strong side not over-pulling",
     "Do NOT do big, forced, maximal facial exercises, and don't use electrical stimulation. Both encourage SYNKINESIS — the miswiring that makes your eye close when you smile — which is harder to live with than the original weakness. Small, slow, symmetrical, in a mirror."],
    ["Coordination & expression retraining", 6, 11,
     "Rebuild coordinated, natural expression and eating and speaking function.",
     "more symmetrical expression, eating and drinking without spilling, clearer speech",
     "Quality over effort throughout. If the strong side over-pulls, hold it back gently with a finger while the weak side does the work."],
    ["Refine, and manage any synkinesis", 11, 16,
     "Refine natural expression and treat any miswiring that has developed.",
     "natural symmetrical expression at rest and in movement, synkinesis managed",
     "If synkinesis has developed, the treatment is specific retraining (and sometimes botulinum toxin), not more exercise. Little or no recovery by 4 months needs specialist review."]] });

/* ---------------- plexopathy ---------------- */
A.plexopathy = (s) => retime({
  total: 36, freq: "Daily range of movement + gentle graded strengthening as it returns",
  note: `${s.what} Nerve recovers at roughly a millimetre a day, so expect months and measure progress monthly rather than daily. ${s.prog}`,
  variants: PACE,
  ph: [
    ["Pain control, protection & range", 0, 4,
     "Get on top of the pain, protect the limb, and keep every joint moving.",
     "pain controlled, full passive range maintained, skin and joints protected",
     `Nerve pain in this phase is often severe and needs proper medication rather than exercise. Keep every joint moving passively — a stiff shoulder is a second, entirely avoidable problem on top of the nerve injury.${s.extra ? " " + s.extra : ""}`],
    ["Support, protect & early activation", 4, 12,
     "Support the limb, prevent contracture, and start activating whatever fires.",
     "range preserved, first flickers of activity appearing, limb supported and protected",
     "Support a heavy, weak arm — an unsupported one drags the shoulder down into a painful subluxation. A numb limb can't warn you: check the skin and be careful around heat."],
    ["Graded strengthening as reinnervation arrives", 12, 24,
     "Strengthen progressively as muscles come back, working from the trunk outward.",
     "clear return of muscle activity, strength progressing, using the limb functionally",
     "Recovery travels from the shoulder outward to the hand, so the hand is last and slowest. Don't train a barely-reinnervating muscle to exhaustion — brief, frequent and sub-maximal is what works."],
    ["Function, adaptation & long-term", 24, 36,
     "Restore function, adapt what doesn't return, and rebuild capacity.",
     "functional use of the limb, adaptations in place, strength plateaued or still improving",
     "Recovery can continue for 2–3 years. If nothing has returned by 3–6 months, get a specialist opinion — nerve surgery and tendon transfers are time-sensitive and the window genuinely closes."]
  ]
}, s.total);
[["Pan-brachial plexopathy", "pan-brachial plexopathy|complete brachial plexus",
  "The whole brachial plexus is injured, so the entire arm is affected — usually from a high-energy traction injury such as a motorbike accident.",
  "This is the most severe pattern and spontaneous recovery is limited; the priorities are pain, preventing a stiff contracted limb, and getting a surgical opinion early while reconstruction is still possible.",
  " Get a specialist opinion EARLY — nerve grafting and transfers work best within 3–6 months of injury.", 44],
 ["Lumbosacral plexopathy", "lumbosacral plexopathy|lumbar plexopathy",
  "The nerve network supplying the leg is injured — from surgery, childbirth, a bleed, radiation, diabetes or a tumour.",
  "Recovery depends on the cause but is often good over 6–18 months; diabetic amyotrophy in particular recovers slowly but substantially.",
  " Falls are the main risk while the quadriceps is weak — a knee that buckles without warning needs a brace, not bravery.", 40],
 ["Radiation-induced plexopathy", "radiation-induced plexopathy|radiation plexopathy|post-radiation plexopathy",
  "Nerve damage from radiotherapy given years, sometimes decades, earlier — scarred tissue slowly tightens around the plexus.",
  "Unlike a traumatic injury this tends to progress slowly rather than recover, so the goal is maintaining function, range and comfort rather than expecting return.",
  " A NEW or rapidly worsening plexopathy in someone with a cancer history needs investigation to tell radiation damage from tumour recurrence — that's a scan question, not a rehab one. Radiated tissue is fragile and lymphoedema risk is high, so progress load gently.", 40],
 ["Neuralgic amyotrophy (Parsonage-Turner)", "neuralgic amyotrophy|parsonage-?turner|brachial neuritis",
  "It starts with sudden severe shoulder pain — often waking you at night — which fades over days to weeks and leaves marked weakness and a winged shoulder blade behind it.",
  "The pain settles first and the weakness afterwards, usually over 1–3 years, and most people recover well.",
  " Do NOT over-work it early — there is evidence that aggressive early exercise worsens the outcome in this particular condition. Pain first, then gentle scapular work, then strength.", 44]
].forEach(([label, r, what, prog, extra, total]) => add({ r, label, ...A.plexopathy({ label, what, prog, extra, total }) }));

/* ---------------- cranial nerve palsies ---------------- */
A.cranialNerve = (s) => ({
  total: 16, freq: "Short, frequent daily sessions — a few minutes several times a day",
  note: `${s.what} ${s.prog} Most isolated palsies of this kind recover over 3–6 months; the rehab work is about functioning safely and comfortably while that happens.`,
  variants: PACE,
  ph: [
    ["Investigate, protect & compensate", 0, 3,
     "Get the cause identified, and set up the safest way to function meanwhile.",
     "cause investigated, a safe strategy in place, symptoms manageable",
     `A new palsy of this nerve needs a cause found before it needs exercises — that's a medical assessment, not a rehab one. Seek urgent review if it came with severe headache, other new neurological symptoms, or any change in consciousness.${s.extra ? " " + s.extra : ""}`],
    ["Adapt & retrain", 3, 8,
     `Retrain ${s.focus}, and adapt daily activities around it.`,
     "managing daily tasks safely, symptoms better controlled, compensations working",
     "Compensating well is a legitimate goal while the nerve recovers — it isn't giving up on recovery."],
    ["Rebuild function as it recovers", 8, 12,
     "Rebuild function as the nerve recovers, and reduce the compensations.",
     "function improving, less reliance on compensation, activities widening",
     "Recovery is usually gradual over months. Do the retraining little and often rather than in long sessions."],
    ["Return to full activity or adapt long-term", 12, 16,
     "Return to full activity, or settle into a long-term adaptation if it hasn't fully recovered.",
     "back to your activities, or a stable adaptation you can live with",
     "No recovery by about 6 months needs a specialist opinion — surgical and prism options are worth knowing about."]
  ]
});
[["Oculomotor (CN III) palsy recovery", "oculomotor \\(cn iii\\)|oculomotor nerve palsy|third nerve palsy",
  "The third cranial nerve moves most of the eye, lifts the eyelid and narrows the pupil — so a palsy gives double vision, a drooping lid and often a large pupil.",
  "The drooping lid can actually mask the double vision at first.", "gaze control and safe movement while you have double vision",
  " A third nerve palsy with a DILATED pupil, especially with pain, can mean an aneurysm pressing on the nerve — that is a same-day emergency. Double vision makes stairs and driving dangerous: don't drive until you're assessed, and patch one eye to move about safely."],
 ["Trochlear (CN IV) palsy recovery", "trochlear \\(cn iv\\)|trochlear nerve palsy|fourth nerve palsy|superior oblique palsy",
  "The fourth cranial nerve runs one small muscle that rolls the eye down and inward, so a palsy gives vertical double vision that's worst looking down.",
  "The classic sign is a head tilt away from the affected side to cancel it out — often a lifelong habit visible in old photographs.", "head position, balance and safe stair use",
  " Vertical double vision looking DOWN makes stairs the specific hazard here. Use handrails, and don't drive until you're assessed."],
 ["Abducens (CN VI) palsy recovery", "abducens \\(cn vi\\)|abducens nerve palsy|sixth nerve palsy|lateral rectus palsy",
  "The sixth cranial nerve turns the eye outward, so a palsy gives horizontal double vision that's worst looking toward the affected side.",
  "It's the commonest of the eye-movement palsies and often recovers over 3–6 months, particularly where diabetes or blood pressure caused it.", "gaze control, head turning and safe mobility",
  " A sixth nerve palsy can be a sign of raised pressure inside the head — with headache, vomiting or visual blackouts, that's urgent. Horizontal double vision makes driving unsafe until you're assessed."],
 ["Hypoglossal (CN XII) palsy recovery", "hypoglossal \\(cn xii\\)|hypoglossal nerve palsy|twelfth nerve palsy",
  "The twelfth cranial nerve drives the tongue, so a palsy makes the tongue deviate to the weak side and causes trouble with speech and with moving food around the mouth.",
  "An isolated hypoglossal palsy is rare and always needs its cause found.", "tongue movement, speech clarity and safe swallowing",
  " SWALLOWING must be assessed before this is treated as a speech problem — food pocketing in the cheek and choking are real risks. Speech and language therapy is the specialist input here, not general exercise."]
].forEach(([label, r, what, prog, focus, extra]) => add({ r, label, ...A.cranialNerve({ label, what, prog, focus, extra }) }));

/* Piriformis-related sciatic irritation — the existing "Piriformis syndrome /
   deep gluteal pain" regex doesn't reach this name. Reuse the nerve archetype. */
add({ r: "piriformis-related sciatic", label: "Piriformis-related sciatic irritation",
  ...A.nerve({ label: "Piriformis-related sciatic irritation", part: "buttock & leg",
    act: "prolonged sitting, especially on a hard seat or on a wallet",
    extra: "True sciatica from the spine is far commoner than piriformis-related irritation — if pain runs below the knee in a clear band, or there's weakness, get the back assessed rather than chasing the buttock." }) });

/* ---------------- vestibular ---------------- */
/* BPPV is deliberately NOT lumped in with the rest: it is a mechanical problem
   fixed by a repositioning manoeuvre in minutes, not by weeks of exercise. */
add({ r: "benign paroxysmal positional vertigo|\\bbppv\\b|positional vertigo", label: "Benign paroxysmal positional vertigo (BPPV)",
  total: 6, freq: "A repositioning manoeuvre, then daily habituation work only if needed",
  note: "BPPV is a mechanical problem, not a disease: crystals that belong elsewhere in the inner ear have fallen into one of the balance canals, so moving your head sends a false spinning signal. It's the commonest cause of vertigo and the important thing to know is that a repositioning manoeuvre fixes it in minutes with about an 80–90% success rate — this is not a condition you should be doing exercises for over months.",
  variants: [
    { k: "posterior", label: "Posterior canal (typical)", sub: "The usual type — spinning on lying down or rolling over", scale: 1 },
    { k: "horizontal", label: "Horizontal canal", sub: "Worst rolling over in bed", pick: "horizontal|lateral canal", scale: 1.2,
      note: "The horizontal canal type needs a different manoeuvre (a barbecue roll rather than an Epley) — which is exactly why a proper assessment beats a manoeuvre learned from a video." },
    { k: "recurrent", label: "Recurrent BPPV", sub: "Keeps coming back", pick: "recurrent|persistent|chronic", scale: 1.5,
      note: "BPPV recurs in a good proportion of people — that's the nature of it, not a failure. Recurrent cases warrant checking vitamin D and bone health, which are linked to it." }
  ],
  ph: [
    ["Diagnose the canal & reposition", 0, 1,
     "Get the right canal and side identified, and have the correct repositioning manoeuvre done.",
     "positional testing done, the correct manoeuvre performed, vertigo markedly reduced or gone",
     "Get properly assessed rather than treating yourself from a video: the manoeuvre depends on WHICH canal and which side, and the wrong one can move the crystals somewhere worse. Vertigo with new deafness, double vision, slurred speech, weakness or a severe headache is NOT BPPV — that's an emergency."],
    ["Recheck & repeat if needed", 1, 2,
     "Recheck the positional test and repeat the manoeuvre if the vertigo is still there.",
     "positional test negative, no spinning with position changes",
     "Most people need one or two manoeuvres. Post-manoeuvre positioning restrictions are no longer thought necessary — you don't have to sleep upright."],
    ["Habituation & balance if symptoms linger", 2, 4,
     "If lingering unsteadiness remains after the spinning has gone, treat that with habituation and balance work.",
     "steady with head movement, confident walking and turning",
     "A residual off-balance feeling after successful treatment is common and settles with movement, NOT with rest. Avoiding head movement is what makes it persist."],
    ["Return to full activity & recurrence plan", 4, 6,
     "Get back to normal activity and know what to do if it returns.",
     "back to normal activity including driving, a clear plan if it recurs",
     "It can come back — knowing what it is means you get it treated in a week rather than suffering for months. Don't drive during an active spinning episode."]] });

A.vestibular = (s) => retime({
  total: 12, freq: "Gaze-stability and balance exercises 3×/day, in short sessions",
  note: `${s.what} Vestibular rehabilitation works by DRIVING adaptation: the exercises are meant to provoke mild symptoms, because that mismatch is the signal the brain uses to recalibrate. Avoiding all provocation is the single commonest reason people stay dizzy for months.`,
  variants: PACE,
  ph: [
    ["Settle, assess & start gaze stability", 0, 2,
     "Get the diagnosis right, settle the acute symptoms, and start gaze-stabilisation exercises.",
     "able to do short gaze-stability sets, symptoms settling within 20 minutes afterwards",
     `Stop vestibular sedative medication as early as you can — beyond the first day or two it BLOCKS the adaptation you're trying to drive and prolongs recovery. Sudden vertigo with new deafness, double vision, slurred speech, weakness or severe headache is a stroke until proven otherwise: that's an emergency.${s.extra ? " " + s.extra : ""}`],
    ["Adaptation & habituation", 2, 6,
     "Build up gaze stability and deliberately habituate to the movements that provoke you.",
     "gaze stability with faster head movement, provoking movements causing less symptom, steadier walking",
     "The exercises SHOULD provoke mild symptoms — aim for a mild bump that settles within 15–20 minutes. If it lasts longer, do less; if nothing at all happens, do more. This is the one setting where 'it made me a bit dizzy' means it's working."],
    ["Dynamic balance & real-world environments", 6, 9,
     "Progress to walking with head turns, uneven ground and busy visual environments.",
     "walking with head turns confidently, coping in shops and crowds, balance markedly improved",
     "Busy visual environments — supermarkets, traffic, crowds — are the hardest and the most important to train. Avoiding them keeps the problem alive."],
    ["Return to full activity", 9, 12,
     "Return to driving, work, sport and everything you've been avoiding.",
     "back to full activity, confident with head movement and in busy places",
     "Recovery depends on compensation, and compensation depends on exposure. The people who recover are the ones who keep moving; the people who stay dizzy are the ones who kept still."]
  ]
}, s.total);
const VESTIBULAR = [
  ["Unilateral vestibular hypofunction", "unilateral vestibular hypofunction|unilateral vestibular loss|vestibular hypofunction \\(unilateral\\)",
   "One balance organ has lost function, so the two sides no longer match and the brain reads the difference as movement.",
   "", 12],
  ["Bilateral vestibular hypofunction", "bilateral vestibular hypofunction|bilateral vestibular loss|bilateral vestibulopathy",
   "Both balance organs have lost function — often from certain antibiotics — so there's no good side for the brain to compensate with, and vision and position sense must take over the job.",
   " With BOTH sides gone, you cannot compensate the usual way: recovery is about substituting vision and foot sensation instead. That makes DARKNESS genuinely dangerous — night-time falls are the main risk, so light the route to the bathroom and never swim alone or dive underwater, where there's no visual reference at all.", 20],
  ["Labyrinthitis recovery", "labyrinthitis",
   "The inner ear balance organ became inflamed, usually after a viral illness, causing severe vertigo — and, unlike vestibular neuritis, hearing is affected too.",
   " Hearing loss with the vertigo is what separates labyrinthitis from vestibular neuritis, and it needs prompt medical assessment — sudden hearing loss is time-critical and treatable.", 12],
  ["Ménière's disease (between episodes)", "m[eé]ni[eè]re",
   "Ménière's causes attacks of vertigo lasting hours, with fluctuating hearing, ringing and a feeling of fullness in the ear, from pressure changes in the inner ear.",
   " Rehab works BETWEEN attacks, not during them — during an attack the only thing to do is be safe. Because the function fluctuates, progress is uneven, which is normal here rather than a sign of failure. Salt, caffeine, alcohol and stress are the common triggers worth managing.", 16],
  ["Vestibular migraine (reconditioning)", "vestibular migraine|migrainous vertigo",
   "Vestibular migraine causes dizziness and motion sensitivity as a migraine phenomenon — often with no headache at all, which is why it's so frequently missed.",
   " This is a MIGRAINE problem, so migraine management — sleep, regular meals, hydration, trigger management and sometimes preventive medication — does more than any exercise. Push habituation gently: too much provocation triggers an attack rather than adaptation.", 16],
  ["Post-traumatic vertigo", "post-traumatic vertigo|vertigo after (a )?head injury|traumatic vertigo",
   "Dizziness after a head injury, which can come from several sources at once — displaced inner-ear crystals, a damaged balance organ, the neck, or the concussion itself.",
   " Get BPPV excluded first — it's the commonest cause after a head injury and it's fixed in minutes by a manoeuvre rather than by weeks of exercise. The neck is frequently involved too, since whatever hit your head also whipped your neck.", 14],
  ["Superior canal dehiscence (post-op balance)", "superior canal dehiscence|superior semicircular canal dehiscence",
   "A thin or missing patch of bone over one of the balance canals creates a 'third window', so loud sounds and pressure changes cause dizziness and you hear your own eye movements, heartbeat and footsteps inside your head.",
   " After surgical repair, avoid straining, nose-blowing, heavy lifting and anything that raises pressure in the head or ear for as long as your surgeon directs — that's the same pressure route that caused the symptoms.", 16],
  ["Vestibulocochlear schwannoma (post-op balance)", "vestibulocochlear schwannoma|acoustic neuroma|vestibular schwannoma",
   "After surgery for a benign tumour on the balance and hearing nerve, that balance organ is usually gone completely — so this is a one-sided vestibular loss with a known start date.",
   " Because the nerve was deliberately cut, compensation — not recovery — is the goal, and it works well. Expect it to feel worse before it feels better, and expect facial nerve weakness to need separate attention if it's present.", 16],
  ["Mal de debarquement syndrome", "mal de debarquement|mal de d[eé]barquement",
   "A persistent sensation of rocking or swaying after a boat, plane or long car journey — the classic feature is that it gets BETTER when you drive or move, and worse when you sit still.",
   " Standard vestibular exercises often make this one worse, which is the opposite of most dizziness. It's a rhythm-perception problem rather than an inner-ear one, so it needs specific treatment — passive motion and a gentle, graded approach rather than aggressive habituation.", 16],
  ["Ocular vestibular dysfunction", "ocular vestibular dysfunction|oculomotor dysfunction|visual vertigo|visually induced dizziness",
   "The eyes and the balance system have fallen out of step, so busy visual environments — supermarket aisles, traffic, scrolling screens, patterned floors — trigger dizziness even though the inner ear itself may be fine.",
   " The treatment is graded exposure to exactly the visual environments you're avoiding, plus ocular-motor retraining. Sunglasses indoors and avoiding shops feel helpful and make it worse in the long run.", 14]
];
VESTIBULAR.forEach(([label, r, what, extra, total]) => add({ r, label, ...A.vestibular({ label, what, extra, total }) }));
add({ r: "cervicogenic dizziness", label: "Cervicogenic dizziness",
  ...(() => { const b = A.vestibular({ what: "Dizziness coming from the NECK rather than the inner ear: neck position sense feeds the balance system, and a painful, stiff or injured neck sends it faulty information.", extra: "", total: 12 });
    b.note = "Cervicogenic dizziness is dizziness coming from the NECK rather than the inner ear — your neck feeds position information into the balance system, and a painful or stiff neck sends faulty data. It's a diagnosis of exclusion: the inner ear and central causes must be ruled out first, because treating the neck won't help if the problem is elsewhere. It's an unsteadiness or floating that tracks with neck pain and neck movement rather than true spinning.";
    b.ph[0][5] = "This is a diagnosis of EXCLUSION — inner-ear and central causes must be ruled out first. True spinning is rarely cervicogenic. Never have the neck manipulated at end-range rotation if there's any vascular concern.";
    b.ph[1][0] = "Treat the neck: manual therapy & deep neck flexor training";
    b.ph[1][5] = "The neck is the target here: manual therapy plus deep neck flexor and position-sense retraining is what changes it. Generic vestibular exercises alone tend not to work, because the inner ear isn't the problem.";
    return b; })() });
add({ r: "persistent postural-perceptual dizziness|\\bpppd\\b|chronic subjective dizziness", label: "Persistent postural-perceptual dizziness (PPPD)",
  ...(() => { const b = A.vestibular({ what: "", extra: "", total: 20 });
    b.note = "PPPD is a persistent unsteadiness and rocking that usually follows an episode of genuine dizziness — the original trigger has resolved, but the brain has got stuck in a high-alert balance strategy, over-relying on vision and stiffening up to avoid falling. It is a real, recognised condition with a real mechanism, not anxiety and not imagined, and it responds well to specific treatment: vestibular habituation, plus addressing the vigilance that keeps it running.";
    b.freq = "Daily habituation + graded exposure, built up gently and consistently";
    b.ph[0][0] = "Understand the mechanism & start gentle habituation";
    b.ph[0][5] = "Understanding this is genuinely part of the treatment: the balance system is working, but the software has got stuck on high alert. The strategies that feel safest — holding walls, staring at the floor, avoiding shops, moving stiffly — are exactly what keep it going.";
    b.ph[1][5] = "Progress gently: unlike most vestibular problems, aggressive provocation backfires here. Small, consistent, daily exposure beats hard sessions. Anxiety and low mood commonly travel with PPPD and treating them improves the dizziness measurably — that's mechanism, not blame.";
    b.ph[2][5] = "Busy visual environments are the core of the treatment. Go back to the supermarket. Walk without holding on. Look up.";
    return b; })() });

/* ---------------- balance decline & falls ---------------- */
add({ r: "age-related balance decline|falls risk|falls-prevention|fall prevention|age-related balance", label: "Age-related balance decline / falls risk",
  total: 16, freq: "Balance training 3×/week minimum, plus strength 2×/week — dose is what makes this work",
  note: "Falls are not an inevitable part of getting older — they're a treatable, predictable problem. Exercise reduces falls by roughly a quarter, but only if it is genuinely CHALLENGING to balance and there's enough of it: the evidence points to about 3 hours a week, sustained. Gentle seated exercise, however pleasant, does not prevent falls.",
  variants: PACE,
  ph: [
    ["Assess the risk & start", 0, 3,
     "Find out what's actually driving the risk, and start balance and strength work.",
     "medication reviewed, eyesight checked, blood pressure checked lying and standing, exercising twice a week",
     "Look for the treatable causes first: medications (especially sedatives, blood pressure tablets and anything for sleep), blood pressure dropping on standing, poor eyesight or new varifocals, foot pain and bad footwear. Any fall with a head injury, or while on blood thinners, needs medical review."],
    ["Challenging balance & leg strength", 3, 8,
     "Train balance at a level that genuinely challenges you, and build leg strength.",
     "standing on one leg longer, rising from a chair without hands, walking more confidently",
     "It must be HARD to work: reducing your base, moving your arms, turning your head, and standing without holding on. Do it beside a worktop so a wobble is safe — but if you never wobble, it isn't training your balance."],
    ["Function, dual-tasking & home safety", 8, 12,
     "Practise real-life tasks, add dual-tasking, and fix the home hazards.",
     "confident turning and carrying, home hazards addressed, dual-tasking safely",
     "Most falls happen while doing something else — carrying, talking, reaching, turning, or hurrying to the toilet. That's what to practise. Loose rugs, poor lighting, trailing leads and the route to the bathroom at night are the classic hazards."],
    ["Keep it going — this only works while you do it", 12, 16,
     "Make it permanent, and add bone-loading if bone density is a concern.",
     "exercising 3×/week sustained, confident on your feet, a plan for getting up off the floor",
     "The benefit disappears within months of stopping — this is permanent, not a course. Learn how to get up off the floor, and how to call for help if you can't: lying on the floor for hours is what turns a fall into a hospital admission."]] });

/* ---------------- ataxia ---------------- */
A.ataxia = (s) => retime({
  total: 20, freq: "Daily balance and coordination work — dose and repetition drive this",
  note: `${s.what} ${s.prog} Coordination training genuinely works in ataxia — the evidence for intensive balance and gait training is good even in progressive conditions — but it must be specific and frequent, and the gains fade if it stops.`,
  variants: PACE,
  ph: [
    ["Assess, make it safe & start", 0, 3,
     "Establish a baseline, make the environment safe, and start coordination work.",
     "a baseline set, home hazards addressed, exercising safely with support",
     `Falls are the dominant risk and they don't match how strong you feel — strength is often normal while coordination isn't. Train where a fall is safe, and get the walking aid right early: an aid is not a defeat.${s.extra ? " " + s.extra : ""}`],
    ["Static & dynamic balance training", 3, 9,
     "Build static then dynamic balance, and train accurate limb placement.",
     "steadier standing, more accurate foot placement, walking with better control",
     "Intensity and repetition matter more than variety. Slow, controlled, accurate movement is the target — speed comes last, if at all."],
    ["Gait, coordination & function", 9, 15,
     "Train walking, turning and the coordination that daily tasks actually need.",
     "walking further and more confidently, turning safely, daily tasks more accurate",
     "Turning and changing direction are where people fall. Practise them deliberately, with support."],
    ["Long-term maintenance", 15, 20,
     "Keep the training going — this is what preserves function.",
     "a sustained routine, function maintained or improved, aids and adaptations right",
     "The gains fade when training stops, so this is ongoing. In progressive ataxias, maintaining function IS the win — measure it against where you'd otherwise be, not against where you were."]
  ]
}, s.total);
const ATAXIAS = [
  ["Ataxia (functional balance training)", "ataxia \\(functional balance|functional balance training",
   "Ataxia is a loss of coordination — the strength is there, but the timing and accuracy of movement aren't.",
   "Whatever the cause, targeted balance and coordination training measurably improves function.", " ", 20],
  ["Ataxic gait rehabilitation", "ataxic gait",
   "An ataxic walk is wide-based, unsteady and irregular — it looks like drunkenness because it's the same part of the brain being affected.",
   "Gait-specific training, including treadmill work with support, is the highest-value intervention here.", " Wide-based walking is a compensation that's helping you — narrowing the base is a training goal, not something to force in daily life.", 20],
  ["Friedreich's ataxia", "friedreich'?s ataxia",
   "Friedreich's ataxia is an inherited condition affecting the cerebellum, the spinal cord and the nerves, usually starting in childhood or adolescence.",
   "It progresses over years, and exercise preserves function and independence for longer even though it doesn't stop the condition.",
   " Friedreich's affects the HEART in most people — a cardiomyopathy that needs monitoring and that must shape exercise intensity, so get cardiac review before pushing hard. Scoliosis and diabetes are common too and need watching.", 24],
  ["Spinocerebellar ataxia", "spinocerebellar ataxia",
   "The spinocerebellar ataxias are a family of inherited conditions in which the cerebellum slowly degenerates, causing progressive incoordination, unsteady walking and slurred speech.",
   "They progress slowly over years; intensive coordination training has good evidence for improving function even as the condition advances.", " ", 24],
  ["Sensory ataxia (proprioceptive)", "sensory ataxia|proprioceptive ataxia",
   "Sensory ataxia isn't a cerebellar problem at all: the coordination centres work fine, but they're not being told where the limbs are, because position sense is lost.",
   "It responds well to training that substitutes VISION for the missing position sense — which is why it looks so different from cerebellar ataxia in the dark.",
   " The hallmark is that balance collapses with the eyes closed or in the dark — that's diagnostic, and it's also the danger. Light the house well, especially the night-time route to the bathroom, and never rely on balance in poor light.", 20],
  ["Acquired cerebellar ataxia", "acquired cerebellar ataxia|cerebellar ataxia",
   "Coordination lost through damage to the cerebellum — from a stroke, alcohol, a tumour, an immune process or a toxin — rather than through an inherited condition.",
   "Where the cause is removed or treated, meaningful recovery over months is common, and intensive training accelerates it.", " Treating the underlying cause comes first — alcohol-related and immune ataxias in particular can improve substantially once the cause is addressed.", 22],
  ["Cerebellar cognitive-affective (motor) reconditioning", "cerebellar cognitive-affective",
   "The cerebellum does more than coordinate movement — it also tunes thinking, attention and emotional regulation, so cerebellar damage can produce a mix of motor and cognitive-emotional difficulty.",
   "The motor side responds to coordination training; the cognitive and emotional side needs recognising rather than being mistaken for a psychiatric problem.",
   " The cognitive and emotional changes here are neurological, not psychological — recognising that usually helps more than any exercise.", 22]
];
ATAXIAS.forEach(([label, r, what, prog, extra, total]) => add({ r, label, ...A.ataxia({ label, what, prog, extra, total }) }));
/* SCA subtypes — need a LONGER match than the plain "spinocerebellar ataxia" plan */
[["Spinocerebellar ataxia type 1", "spinocerebellar ataxia type 1|\\bsca ?1\\b", "SCA1 tends to progress somewhat faster than the other common types and often involves the nerves outside the brain too."],
 ["Spinocerebellar ataxia type 2", "spinocerebellar ataxia type 2|\\bsca ?2\\b", "SCA2 characteristically slows the eyes' quick movements early, and often brings a tremor and neuropathy alongside the ataxia."],
 ["Spinocerebellar ataxia type 3", "spinocerebellar ataxia type 3|\\bsca ?3\\b|machado-joseph", "SCA3 (Machado-Joseph disease) is the commonest type worldwide and often adds stiffness, eye-movement problems and restless legs to the ataxia."],
 ["Spinocerebellar ataxia type 6", "spinocerebellar ataxia type 6|\\bsca ?6\\b", "SCA6 usually starts later in life, progresses most slowly of the common types, and stays fairly purely cerebellar — which means the outlook for staying functional with training is comparatively good."]
].forEach(([label, r, detail]) => add({ r, label,
  ...(() => { const b = A.ataxia({ what: "This is one of the inherited spinocerebellar ataxias, in which the cerebellum slowly degenerates over years, causing progressive incoordination, unsteady walking and slurred speech.", prog: detail, extra: " ", total: 24 }); return b; })() }));

/* ---------------- movement disorders ---------------- */
A.movement = (s) => retime({
  total: 16, freq: "Daily short sessions — little and often",
  note: `${s.what} ${s.prog}`,
  variants: PACE,
  ph: [
    ["Assess, understand & start", 0, 3,
     "Get the diagnosis and treatment right, and start work that targets function rather than the movement itself.",
     "medical treatment optimised, a baseline set, a routine started",
     `Medical treatment — and for many of these, botulinum toxin — usually does more than exercise, and rehab works best alongside it rather than instead of it.${s.extra ? " " + s.extra : ""}`],
    [s.ph2, 3, 8, s.goal2, s.crit2, s.restrict2],
    ["Function, strength & conditioning", 8, 12,
     "Build strength and general conditioning around the movement problem.",
     "strength and fitness improving, daily tasks easier, better postural control",
     "General fitness matters here: these conditions cost energy, and a fitter body copes better with an involuntary movement it can't stop."],
    ["Long-term routine", 12, 16,
     "Settle into a routine that keeps function and comfort where you want them.",
     "a sustained routine, function maintained, treatment reviewed regularly",
     "Review regularly — these conditions change, and so should the plan. Fatigue from constant involuntary movement is real; pace accordingly."]
  ]
}, s.total);
const MOVEMENT = [
  ["Cervical dystonia", "cervical dystonia|spasmodic torticollis",
   "Cervical dystonia pulls the neck involuntarily into a turn, tilt or shift — the muscles are contracting against your will, not tight from posture.",
   "Botulinum toxin injections are the main treatment and work well; physiotherapy alongside them measurably improves the result and extends the benefit between injections.",
   "Sensory tricks & posture retraining", "Use your sensory trick deliberately, and retrain neck control around the injection cycle.",
   "less pull, better head position, less neck pain, more comfortable range",
   "Most people have a 'sensory trick' — a light touch on the face or the back of the head that reduces the pull. That's a real neurological phenomenon and it's worth using rather than hiding. Time your rehab to the injection cycle: the 2–6 week window after botulinum toxin is when retraining works best.",
   " Stretching against a dystonic pull doesn't work — the muscle isn't short, it's being told to contract.", 20],
  ["Blepharospasm (functional)", "blepharospasm",
   "Blepharospasm is involuntary forced closing of the eyelids — not a tic and not a habit, but a focal dystonia of the muscles around the eye.",
   "Botulinum toxin is the mainstay and is highly effective; the rehab role is about sensory tricks, managing triggers and staying safe.",
   "Sensory tricks & trigger management", "Find the sensory tricks that help and manage the environmental triggers.",
   "longer periods with the eyes comfortably open, tricks that work, triggers identified",
   "Bright light, wind, stress and driving are the classic triggers, and tinted glasses genuinely help. Sensory tricks — humming, chewing, talking, touching the brow — often open the eyes.",
   " Functional blindness from the eyes being forced shut makes DRIVING dangerous — be honest about this one.", 14],
  ["Hemifacial spasm (functional)", "hemifacial spasm",
   "Hemifacial spasm is involuntary twitching of one side of the face, usually because a blood vessel is pressing on the facial nerve where it leaves the brainstem.",
   "Botulinum toxin controls it well, and surgery to move the vessel off the nerve can cure it — so this is largely a medical problem rather than an exercise one.",
   "Adapt & manage triggers", "Manage triggers and keep facial function comfortable.",
   "spasms less frequent or better controlled, comfortable facial function",
   "Fatigue, stress and speaking a lot make it worse. Note this is different from a facial tic and from blepharospasm — it's one-sided and it involves a compressed nerve.",
   " Facial exercises don't stop hemifacial spasm and forced exercise can make it worse — the treatment is medical.", 14],
  ["Chorea (functional balance)", "\\bchorea\\b|choreiform",
   "Chorea is continuous, flowing, unpredictable involuntary movement that flits from one body part to another — it often looks like restlessness or fidgeting.",
   "Exercise doesn't stop chorea, but it improves balance, strength and endurance, and there's decent evidence it helps function and mood in Huntington's specifically.",
   "Balance, trunk control & safety", "Train balance and trunk control against a constantly moving background.",
   "steadier sitting and standing, fewer falls, better trunk control",
   "Falls are common because the chorea itself throws you off balance. Train where a fall is safe and consider padding and home modifications early.",
   " Chorea burns a lot of energy — weight loss is common and often needs extra calories rather than more exercise.", 18],
  ["Huntington's disease (reconditioning)", "huntington'?s",
   "Huntington's is an inherited condition causing chorea, plus progressive changes in thinking and mood — and the cognitive and behavioural side usually affects daily life more than the movement does.",
   "Exercise has real evidence in Huntington's for improving fitness, balance and function, and it's safe throughout — this is well worth doing.",
   "Balance, gait & functional strength", "Build balance, walking and functional strength, with structure and routine.",
   "steadier balance, walking maintained, strength improving, routine established",
   "Keep it simple, structured and repetitive — new or complex routines are hard to learn as the condition progresses, so build habits early while learning is easier. Falls are a major issue.",
   " Weight loss is common and matters: people with Huntington's often need substantially more calories than expected, and losing weight worsens the outlook.", 22],
  ["Myoclonus (functional)", "myoclonus|myoclonic",
   "Myoclonus is a sudden, brief, shock-like jerk — like the jump you get falling asleep, but happening when you don't want it.",
   "Treatment is mostly medical and depends entirely on the cause; rehab manages the functional consequences, especially falls when the legs jerk.",
   "Safety, balance & function", "Manage the functional impact and make movement safe.",
   "fewer falls or drops, safer daily tasks, better function around the jerks",
   "Sudden leg jerks cause falls without warning and sudden arm jerks cause drops — so hot drinks, knives, stairs and heights all need thought. Startle, movement and stress are common triggers.",
   " Myoclonus always needs its cause investigated — it can be epileptic, metabolic or drug-induced, and each has a different treatment.", 14],
  ["Tardive dyskinesia (reconditioning)", "tardive dyskinesia|tardive",
   "Tardive dyskinesia is involuntary movement — classically of the face, lips and tongue — caused by long-term use of certain medications, usually antipsychotics.",
   "The most important step is a medication review, since the cause is a drug; exercise addresses conditioning, balance and the metabolic side-effects that usually travel with it.",
   "Conditioning & balance", "Build general conditioning and balance around the movements.",
   "fitness improving, balance steadier, function maintained",
   "This needs a medication review by the prescriber — never stop or change psychiatric medication yourself, because stopping abruptly can make the movements worse and destabilise the underlying condition. There are now specific licensed treatments worth asking about.",
   " ", 16],
  ["Tourette / tic reconditioning", "tourette|\\btics?\\b reconditioning|tic disorder",
   "Tics are brief, repetitive movements or sounds preceded by an urge that builds until the tic releases it — they're suppressible for a while, but suppression makes the urge build.",
   "The best-evidenced treatment is behavioural (habit-reversal training / CBIT), and exercise helps by reducing stress and improving fitness and self-esteem.",
   "Habit reversal principles & fitness", "Support the behavioural approach and build fitness and confidence.",
   "tics better managed, fitness improving, confidence better",
   "Telling someone to stop ticcing makes tics worse, and so does suppressing them all day — the urge builds and it comes out later. Exercise and absorbing activity genuinely reduce tics for many people. Stress, excitement and fatigue increase them.",
   " Severe neck tics can occasionally injure the neck — that's rare, but worth mentioning to a doctor if head-jerking tics are violent.", 16],
  ["Wilson's disease (motor reconditioning)", "wilson'?s disease",
   "Wilson's disease lets copper build up in the liver and brain, producing tremor, stiffness, poor coordination and slurred speech — usually in a young person.",
   "It is one of the few genuinely TREATABLE causes of a movement disorder: medication that removes copper can reverse much of it, so the medical treatment does the heavy lifting and rehab supports the recovery.",
   "Coordination, tremor management & function", "Rebuild coordination and function as the medical treatment takes effect.",
   "coordination improving, function returning, treatment adherence solid",
   "Taking the medication is the single most important thing here, for life — stopping it can be fatal. Improvement can continue for years on treatment, so rehab is rebuilding on a rising tide.",
   " Liver disease usually travels with this and may limit exercise; get it assessed.", 22]
];
MOVEMENT.forEach(([label, r, what, prog, ph2, goal2, crit2, restrict2, extra, total]) =>
  add({ r, label, ...A.movement({ label, what, prog, ph2, goal2, crit2, restrict2, extra, total }) }));

/* tremor & focal dystonia — task-specific, so kept apart from the general group */
add({ r: "essential tremor|dystonic tremor", label: "Essential tremor / dystonic tremor (functional training)",
  ...A.movement({ what: "Essential tremor is a shaking that appears when you USE the hand — reaching, holding a cup, writing — rather than at rest, which is what separates it from Parkinson's tremor.",
    prog: "It can't be trained away, but function can be markedly improved with weighting, technique and equipment, and medical options exist that are worth exploring.",
    ph2: "Function, weighting & technique", goal2: "Improve function with weighting, technique and adaptive equipment.",
    crit2: "eating, drinking and writing more manageable, less spillage, more confidence in public",
    restrict2: "Weighted cutlery and cups, wider handles, using both hands, and bracing the elbows against the body all genuinely help. Caffeine, stress, tiredness and low blood sugar all amplify tremor. Strengthening does not reduce tremor — but the equipment and technique do.",
    extra: " Alcohol famously reduces essential tremor for an hour or two, which is a real pharmacological effect and a real path into dependence — it isn't a treatment.", total: 14 }) });
add({ r: "writer'?s cramp|task-specific focal dystonia|task-specific dystonia|musician'?s dystonia|focal hand dystonia", label: "Task-specific focal dystonia (writer's cramp)",
  ...A.movement({ what: "A task-specific dystonia only appears during ONE particular skilled task — writing, playing an instrument, a specific grip — and the same muscles work perfectly for everything else. It's a mis-wiring in the brain's map of the hand, driven by years of repetitive, highly-skilled practice.",
    prog: "It is not overuse, not tendinitis and not weakness, and resting it doesn't help. Treatment is retraining the movement, sensory retraining and often botulinum toxin.",
    ph2: "Sensory retraining & altered task practice", goal2: "Retrain the task differently and work on sensory discrimination.",
    crit2: "the task achievable in a modified way, sensory discrimination improving, less cramping",
    restrict2: "Practising the task the SAME way just reinforces the faulty map — that's what caused it. Change the tool, the grip, the size, the speed, or the hand. Sensory retraining (discriminating textures and positions) targets the actual mechanism, which is a smeared sensory map rather than a muscle problem.",
    extra: " Rest does not fix this and neither does strengthening — a common and costly misunderstanding that wastes months.", total: 18 }) });
add({ r: "dystonia \\(functional rehabilitation\\)|generalis?ed dystonia|\\bdystonia\\b", label: "Dystonia (functional rehabilitation)",
  ...A.movement({ what: "Dystonia is sustained or repetitive involuntary muscle contraction that twists a body part into an abnormal posture — the muscle isn't short or weak, it's being told to contract.",
    prog: "Botulinum toxin and medication are the main treatments; rehab adds function, comfort and the sensory tricks that reduce the pull.",
    ph2: "Sensory tricks, posture & function", goal2: "Use sensory tricks, work on posture, and keep joints and muscles healthy.",
    crit2: "better postures, less pain, tricks working, range maintained",
    restrict2: "Stretching a dystonic muscle hard doesn't lengthen it — it isn't short. Sensory tricks (a light touch in the right place) are a real neurological phenomenon worth exploiting. Time rehab into the 2–6 week window after botulinum toxin, when the muscle is quietest and retraining works best.",
    extra: " Dystonia in a child, or dystonia that spreads, needs specialist review — there are treatable causes that must not be missed.", total: 18 }) });
add({ r: "restless legs syndrome", label: "Restless legs syndrome (exercise)",
  total: 12, freq: "Moderate exercise most days — but NOT in the late evening",
  note: "Restless legs syndrome is an irresistible urge to move the legs, worse at rest and in the evening, and relieved by moving — which is why it wrecks sleep. Moderate regular exercise measurably reduces it; the catch is timing, because intense exercise close to bedtime makes it worse.",
  variants: PACE,
  ph: [
    ["Check the treatable causes & start moving", 0, 2,
     "Get iron checked and start regular moderate exercise at the right time of day.",
     "ferritin (iron stores) checked, exercising most days, a routine forming",
     "Get your IRON checked — low iron stores are the commonest reversible cause, and the threshold for treating is much higher than for ordinary anaemia, so 'normal' may not be normal enough here. Some antidepressants, antihistamines and anti-sickness drugs make RLS markedly worse; review them with your prescriber."],
    ["Build a moderate routine", 2, 6,
     "Build up to regular moderate aerobic exercise and add leg strength work.",
     "30 minutes of moderate exercise most days, symptoms easing, sleep improving",
     "MODERATE is the sweet spot: too little doesn't help, and hard or late exercise makes symptoms worse that night. Finish anything vigorous at least 3–4 hours before bed."],
    ["Sleep, stretching & triggers", 6, 9,
     "Add an evening stretching routine and address the triggers.",
     "sleep clearly better, evening symptoms reduced, triggers identified",
     "Caffeine, alcohol and nicotine all worsen it, especially in the evening. Evening stretching, a warm bath and pneumatic compression all have some evidence behind them."],
    ["Long-term management", 9, 12,
     "Keep the routine going and know when to seek medical treatment.",
     "a sustained routine, symptoms manageable, sleep restored",
     "If exercise and iron aren't enough, medication works well — but be aware of 'augmentation', where the standard dopamine drugs eventually make the condition WORSE and spread it to the arms and daytime. That's a reason to discuss modern alternatives with your doctor."]] });

/* ---------------- functional neurological disorder ---------------- */
/* FND rehab is genuinely different: attention to the movement is the problem, so
   the whole method is to work AUTOMATICALLY and distract away from the limb. */
A.fnd = (s) => retime({
  total: 16, freq: "Short, frequent, movement-focused sessions — quality over quantity",
  note: `${s.what} FND is a problem with how the brain ACCESSES movement, not with the nervous system's wiring — the hardware is intact and the software has a fault, which is why the movement is often normal when you're distracted and abnormal when you watch it. It is a real, common, diagnosable condition — not imagined, not put on — and it has specific, effective treatment.`,
  variants: PACE,
  ph: [
    ["Understand the diagnosis — this IS the first treatment", 0, 3,
     "Understand what FND is and how it works. This isn't preamble; it's the intervention with the best evidence.",
     "a diagnosis you understand and believe, seeing the movement change with distraction, ready to start",
     "Believing the diagnosis is the strongest predictor of getting better, which is why this phase exists. FND is diagnosed by POSITIVE signs — the doctor demonstrates that the movement works when your attention is elsewhere — not by ruling everything else out and shrugging. It is not 'all in your head', it is not attention-seeking, and it can happen to anyone."],
    [s.ph2, 3, 8, s.goal2, s.crit2, s.restrict2],
    ["Build automatic, distracted movement", 8, 12,
     "Build up normal movement patterns performed automatically, without watching them.",
     "movement more automatic, symptoms less frequent, doing more without thinking about it",
     "Keep working at the edge of automatic. The moment it becomes effortful and self-monitored, change the task — go faster, add a rhythm, add a conversation, change the direction."],
    ["Return to life & relapse planning", 12, 16,
     "Get back to normal activity and have a plan for setbacks.",
     "back to your activities, a relapse plan you can use, confident in movement",
     "Setbacks are part of FND and don't undo progress — having a plan for them is what stops one bad week becoming a bad year. Recovery is genuinely possible; the people who do best are the ones who understood the diagnosis and kept practising."]
  ]
}, s.total);
add({ r: "functional neurological disorder|\\bfnd\\b|conversion disorder", label: "Functional neurological disorder rehabilitation",
  ...A.fnd({ what: "",
    ph2: "Retrain movement — automatically, not deliberately", goal2: "Retrain normal movement using distraction and automatic tasks rather than concentration.",
    crit2: "normal movement appearing during distracted tasks, symptoms easing, confidence growing",
    restrict2: "The core rule is counter-intuitive: do NOT concentrate on the affected part. Attention makes FND worse — that's the mechanism. So the treatment is distraction, rhythm, dual-tasking and automatic movement. Symptom monitoring, watching the limb and trying harder all backfire here.", total: 16 }) });
add({ r: "functional gait disorder|functional limb weakness|functional movement disorder|functional (weakness|tremor|dystonia)", label: "Functional gait / movement disorder rehabilitation",
  ...A.fnd({ what: "",
    ph2: "Retrain walking — automatically, with rhythm and distraction", goal2: "Retrain a normal walking pattern using rhythm, speed and distraction rather than concentration.",
    crit2: "more normal walking during distracted or rhythmic tasks, walking further, less reliance on aids",
    restrict2: "Walking gets WORSE the harder you concentrate on it — that's the mechanism, not a character flaw. Use rhythm (a metronome, music, counting), change the speed, walk backwards or sideways, or talk while walking: these often produce a normal pattern immediately, and that's both diagnostic and therapeutic. Try to reduce reliance on aids and wheelchairs where it's safe, because they reinforce the pattern.", total: 18 }) });

/* ---------------- autonomic ---------------- */
A.autonomic = (s) => retime({
  total: 20, freq: "Recumbent exercise 3–5×/week, starting very low and progressing slowly",
  note: `${s.what} ${s.prog} The counter-intuitive rule is to start LYING DOWN or seated — rowing, recumbent cycling, swimming — because upright exercise is what provokes symptoms, and starting upright is why most attempts fail in week one.`,
  variants: PACE,
  ph: [
    ["Fluids, salt, compression & recumbent start", 0, 4,
     "Get the non-exercise measures right first, and start exercising in a lying or seated position.",
     "fluid and salt intake up, compression in use, 15–20 minutes of recumbent exercise tolerated",
     `The basics do more than exercise at this stage: 2–3 litres of fluid a day, increased salt if your doctor agrees, compression garments (waist-high work best), and getting up in stages rather than all at once. Do NOT start with upright exercise — it will provoke symptoms and you'll conclude exercise doesn't work.${s.extra ? " " + s.extra : ""}`],
    ["Build recumbent aerobic base", 4, 10,
     "Build up recumbent aerobic exercise duration and add lower-body strength work.",
     "25–30 minutes of recumbent exercise, leg and core strength improving, fewer symptoms day to day",
     "Progress duration before intensity. Leg and abdominal strength genuinely matter here — those muscles pump blood back up to the heart, so building them is treatment rather than general fitness. Expect setbacks around illness and hormonal cycles."],
    ["Transition toward upright", 10, 16,
     "Gradually shift from recumbent toward upright exercise.",
     "tolerating semi-upright then upright exercise, standing longer, symptoms better controlled",
     "This is the phase that has to be slow. Move from rowing to recumbent bike to upright bike to treadmill over weeks. If symptoms spike, drop back a stage rather than abandoning it."],
    ["Upright exercise & long-term management", 16, 20,
     "Establish upright exercise and a long-term routine.",
     "regular upright exercise, a routine you can keep, symptoms manageable day to day",
     "Deconditioning makes every one of these symptoms worse, so this is a permanent routine rather than a course of treatment. Recovery is often measured in many months — the graded programmes with the best evidence run for around 3 months minimum before real change shows."]
  ]
}, s.total);
[["Postural orthostatic tachycardia syndrome (POTS)", "postural orthostatic tachycardia|\\bpots\\b",
  "POTS is a big rise in heart rate on standing — 30 beats or more — without the blood pressure dropping, causing dizziness, palpitations, fatigue and brain fog.",
  "Structured, graded exercise is one of the best-evidenced treatments and can substantially improve or even resolve it, but it needs 3+ months and it has to start in the right position.",
  " Expect symptoms to worsen in the first 2–4 weeks before they improve — that is normal and it's the point at which most people quit. Heat, big meals, alcohol and standing still are the classic provokers.", 24],
 ["Orthostatic intolerance (reconditioning)", "orthostatic intolerance|orthostatic hypotension",
  "Symptoms on standing — light-headedness, greying vision, fatigue — because blood pools in the legs and doesn't get back to the brain quickly enough.",
  "Physical counter-manoeuvres and graded reconditioning work well, and reviewing the medications that cause it often works even faster.",
  " Get a medication review: blood pressure tablets, diuretics, antidepressants, alpha-blockers and Parkinson's drugs are common culprits. Counter-manoeuvres — crossing the legs and tensing, squeezing a ball, clenching the buttocks — genuinely raise blood pressure and are worth learning.", 16],
 ["Pure autonomic failure (reconditioning)", "pure autonomic failure",
  "The autonomic nervous system fails on its own, without the rest of the neurological system being affected, so blood pressure isn't regulated on standing.",
  "This is progressive and management is about compensating: exercise maintains conditioning and helps the muscle pump, but it won't restore the reflex.",
  " Blood pressure often SWINGS here — dangerously high lying down and low standing up — so raise the head of the bed at night, and be careful with anything that lowers it further. Exercise recumbent, and in a cool environment: sweating regulation is impaired, making overheating a genuine risk.", 20],
 ["Baroreflex failure (reconditioning)", "baroreflex failure",
  "The reflex that normally keeps blood pressure steady has failed — usually after neck surgery, radiation or a brainstem problem — so blood pressure swings wildly with emotion, activity and rest.",
  "Rehab is about predictability: consistent routines, steady graded activity, and avoiding the surges.",
  " Blood pressure here is volatile in BOTH directions and stress or pain can send it very high — this needs close medical supervision, and exercise intensity must be agreed with your specialist rather than pushed.", 20]
].forEach(([label, r, what, prog, extra, total]) => add({ r, label, ...A.autonomic({ label, what, prog, extra, total }) }));

/* ---------------- headache (neuro-side) ---------------- */
A.headacheNeuro = (s) => retime({
  total: 14, freq: "Aerobic exercise 3×/week + daily neck and posture work",
  note: `${s.what} ${s.prog} Regular aerobic exercise has real evidence as a headache preventive — it's about as effective as some preventive medication — but it has to be regular and it takes 6–8 weeks to show.`,
  variants: PACE,
  ph: [
    ["Diagnose, track & start gently", 0, 3,
     "Get the headache type right, start a diary, and begin gentle regular aerobic exercise.",
     "a headache diary running, triggers emerging, exercising gently 3×/week",
     `Get the diagnosis right first — different headaches need different treatment and generic advice helps nobody. RED FLAGS needing urgent review: a sudden 'worst ever' headache peaking in seconds, headache with fever and a stiff neck, a new headache after 50, one that's worse lying down or with coughing, or one with new neurological symptoms.${s.extra ? " " + s.extra : ""}`],
    [s.ph2, 3, 7, s.goal2, s.crit2, s.restrict2],
    ["Build aerobic capacity & neck endurance", 7, 11,
     "Build up aerobic exercise and deep neck flexor endurance.",
     "30 minutes of aerobic exercise 3×/week, better neck endurance, headache frequency falling",
     "Start gently: sudden hard exercise triggers migraine in some people, whereas regular graded aerobic exercise prevents it. Build over weeks. Hydration and not skipping meals matter more than people expect."],
    ["Prevention & long-term routine", 11, 14,
     "Lock in the routine and the trigger management that keeps headaches down.",
     "headache frequency and severity clearly reduced, a routine you'll keep, triggers managed",
     "Consistency is the whole point — regular sleep, regular meals, regular exercise. The most common reason a preventive approach 'fails' is that it wasn't given 8 weeks."]
  ]
}, s.total);
[["Chronic migraine (cervical component)", "chronic migraine",
  "Migraine on 15 or more days a month, where the neck is also contributing — neck pain is present in most migraine attacks, and the nerves from the upper neck and from the head converge on the same brainstem nucleus, which is why they feed each other.",
  "Treating the neck reduces migraine burden in people who have both.",
  "Treat the neck & reduce the load", "Treat the neck alongside the migraine management.",
  "less neck pain, fewer headache days, better neck range and endurance",
  "Watch for MEDICATION-OVERUSE headache: using acute painkillers (especially codeine or triptans) on more than 10–15 days a month converts episodic migraine into chronic daily headache. That's the single commonest reversible cause of chronic migraine, and the fix is withdrawal, not more tablets.", " ", 16],
 ["Cluster headache (reconditioning)", "cluster headache",
  "Cluster headache causes excruciating one-sided pain around the eye, with a red watery eye and blocked nose, in attacks lasting 15 minutes to 3 hours, often at the same time each night — it is one of the most severe pains known.",
  "Exercise doesn't treat cluster headache; oxygen and specific medications do. Reconditioning is for between clusters, when the fitness lost during a bout can be rebuilt.",
  "Recondition between bouts", "Rebuild fitness between clusters, and know the acute treatment.",
  "fitness rebuilt between bouts, acute treatment plan in place",
  "Make sure you have proper acute treatment — high-flow oxygen and injectable triptans work within minutes, and many people with cluster headache have never been offered them. ALCOHOL reliably triggers attacks during a bout. Don't try to exercise through a cluster bout; recondition afterwards.", " ", 12],
 ["Medication-overuse headache (reconditioning)", "medication-overuse headache|medication overuse headache|rebound headache",
  "Taking acute painkillers too often — more than 10–15 days a month — makes the brain more headache-prone, so the treatment becomes the cause and you get a daily headache.",
  "It's fully reversible: stopping the overused medication resolves it, though it gets worse for 1–2 weeks first, which is exactly why people don't get through it alone.",
  "Withdrawal support & graded activity", "Get through the withdrawal period with support, and use exercise to help.",
  "overused medication stopped, through the worst of the withdrawal, headache days falling",
  "Expect it to get WORSE for 1–2 weeks after stopping — that's withdrawal, not proof you need the tablets. Plan it with your doctor: some medications (opioids, barbiturates, benzodiazepines) must NOT be stopped abruptly. Aerobic exercise, hydration and sleep genuinely ease the withdrawal.", " ", 12],
 ["New daily persistent headache (reconditioning)", "new daily persistent headache|\\bndph\\b",
  "A headache that starts one day, is remembered exactly, and never stops — daily and unremitting from the outset, often after an infection or a stressful event.",
  "It's one of the more stubborn headaches to treat, and the aim is usually function and quality of life alongside whatever medical treatment is tried.",
  "Function-focused graded activity", "Rebuild function and activity despite the headache rather than waiting for it to go.",
  "activity and function improving, deconditioning reversed, mood and sleep better",
  "Because this one often doesn't resolve, waiting for it to go before living costs years. The goal is to rebuild function alongside it — which, in a nice paradox, is also what most often reduces it. Watch for medication overuse, which commonly develops on top.", " ", 16],
 ["Post-traumatic headache (concussion-related)", "post-traumatic headache",
  "Headache after a head injury — the commonest symptom after a concussion, and usually migraine-like or tension-like rather than a new kind of headache.",
  "Most settle within 3 months. The neck is very commonly involved, and exercise intolerance is often the driver.",
  "Treat the neck & sub-threshold aerobic exercise", "Treat the neck and rebuild sub-symptom-threshold aerobic exercise.",
  "headache frequency falling, neck improving, aerobic exercise tolerated",
  "Rest is not the treatment. Sub-symptom-threshold aerobic exercise helps post-traumatic headache, and the neck — whiplashed by the same impact — is a very common and very treatable driver. Watch hard for medication-overuse headache, which develops easily here.", " ", 14]
].forEach(([label, r, what, prog, ph2, goal2, crit2, restrict2, extra, total]) =>
  add({ r, label, ...A.headacheNeuro({ label, what, prog, ph2, goal2, crit2, restrict2, extra, total }) }));

/* ---------------- pain-system conditions ---------------- */
add({ r: "complex regional pain syndrome|\\bcrps\\b|reflex sympathetic dystrophy|causalgia", label: "Complex regional pain syndrome",
  total: 20, freq: "Little and often — several very short sessions a day beats one long one",
  note: "CRPS is pain far out of proportion to the injury, with changes in skin colour, temperature, sweating and swelling, and a limb that becomes exquisitely sensitive to touch. The nervous system has become sensitised — the limb is not damaged in the way the pain implies. The single most important thing is to KEEP USING the limb: immobilising it is what entrenches CRPS, and early movement is what resolves it.",
  variants: [
    { k: "early", label: "Early (under 3 months)", sub: "Recent onset", pick: "acute|early", scale: 0.7,
      note: "Caught early, CRPS has a good outlook — most cases settle substantially within a year, and early movement and normal use are the biggest levers you have." },
    { k: "standard", label: "Established", sub: "Several months in", scale: 1 },
    { k: "chronic", label: "Long-standing", sub: "A year or more", pick: "chronic|long-?standing|persistent", scale: 1.5,
      note: "Long-standing CRPS is harder, and the goal shifts toward function and desensitisation rather than pain elimination. Progress is real but slow, and it comes from graded exposure rather than from rest or protection." }
  ],
  ph: [
    ["Desensitise & keep the limb in the picture", 0, 4,
     "Start desensitisation and gentle movement, and get the limb back into your body map.",
     "tolerating light touch, moving the limb gently, using it a little in daily tasks",
     "Do NOT rest, splint or protect this limb — that is precisely what makes CRPS worse and it's the commonest mistake made with it. Gentle movement and normal use are the treatment, even though they're uncomfortable. Mirror therapy and graded motor imagery target the brain's distorted map of the limb and have real evidence."],
    ["Graded motor imagery & progressive movement", 4, 9,
     "Work through laterality recognition, imagined movement and mirror therapy, and increase real movement.",
     "mirror work tolerated, movement range increasing, using the limb more in daily life",
     "Progress by small, tolerable steps. Pain here does NOT signal damage — it signals a sensitised system, so working into moderate discomfort is safe and necessary. Flares settle; avoidance doesn't."],
    ["Strength, loading & normal use", 9, 15,
     "Build strength and load tolerance, and normalise how you use the limb.",
     "loading the limb, strength improving, using it normally for most daily tasks",
     "Weight-bearing and loading are safe and are part of the treatment. Watch for the limb being 'left out' of movements — the brain's map shrinks when you stop using a part, and that keeps the pain going."],
    ["Return to full function", 15, 20,
     "Return to work, activity and normal life with the limb fully in use.",
     "full functional use, back to work and activity, flares manageable and short",
     "Most people improve substantially, especially when treated early. Flares happen and are not relapses. Pain relief, psychological support and physiotherapy together beat any of them alone."]] });
add({ r: "phantom limb", label: "Phantom limb reconditioning",
  total: 16, freq: "Mirror therapy or imagery daily, 15 minutes, plus stump and general conditioning",
  note: "Phantom limb pain is pain felt in a limb that isn't there — and it is entirely real, generated by the brain's map of the body, which doesn't update when the limb goes. Most people after an amputation experience it. Mirror therapy works by giving the brain visual proof that the limb can move and is not in pain, which is a genuine treatment rather than a trick.",
  variants: PACE,
  ph: [
    ["Understand it, protect the stump & start mirror work", 0, 3,
     "Understand the mechanism, look after the residual limb, and start mirror therapy or imagery.",
     "mirror therapy started, stump healing and desensitising, understanding what phantom pain is",
     "Phantom pain is real pain from a real mechanism — being told it's imaginary is both wrong and unhelpful. Distinguish it from RESIDUAL LIMB pain (pain in the stump itself), which has different causes — a neuroma, a poor socket fit, infection — and different treatment. Increasing stump pain with redness or discharge needs urgent review."],
    ["Mirror therapy, desensitisation & prosthetic tolerance", 3, 8,
     "Build up mirror therapy, desensitise the residual limb, and build prosthetic wearing time.",
     "phantom pain reducing, residual limb tolerating touch and pressure, prosthetic wear increasing",
     "Consistency matters more than session length — 15 minutes daily beats an hour weekly. A well-fitted socket does more for phantom pain than most medication; a painful socket makes everything worse."],
    ["Strength, gait & function", 8, 13,
     "Build strength and retrain walking or function with the prosthesis.",
     "walking or functioning well with the prosthesis, strength improving, phantom pain manageable",
     "Prosthetic use itself reduces phantom pain — the more the brain gets normal-feeling input from that side, the less it generates pain. Watch the other limb: it's now doing extra work and is at risk."],
    ["Return to activity & long-term", 13, 16,
     "Return to work, activity and sport, and settle into long-term management.",
     "back to your activities, phantom pain manageable, a routine established",
     "Phantom sensation usually persists in some form and that's normal; phantom PAIN usually reduces markedly over months to years. Keep the skin and the other limb under close watch for life."]] });
add({ r: "chronic fatigue syndrome|myalgic encephalomyelitis|\\bme/cfs\\b|\\bcfs\\b \\(graded", label: "Chronic fatigue syndrome / ME (cautious activity management)",
  total: 24, freq: "Activity kept WITHIN your energy envelope — consistency, never progression for its own sake",
  note: "The defining feature of ME/CFS is post-exertional malaise: a delayed, disproportionate crash 12–48 hours after activity that can last days or weeks. That changes everything, because it means the usual rehab logic of steadily increasing exercise is not safe here. Current guidance no longer recommends graded exercise therapy as a treatment or a cure — the approach is PACING: finding your energy envelope and staying inside it.",
  variants: [
    { k: "standard", label: "Pacing (energy envelope)", sub: "The approach current guidance supports", scale: 1 },
    { k: "severe", label: "Severe ME/CFS", sub: "Housebound or bedbound", pick: "severe|housebound|bedbound", scale: 2,
      note: "In severe ME/CFS even sitting up, light or conversation can trigger a crash. The priority is preventing deterioration and maintaining basic comfort, position and joint range — not exercise. This needs specialist input, and well-meant encouragement to push can cause serious lasting harm." },
    { k: "mild", label: "Milder / stable", sub: "Working or studying with adjustments", pick: "\\bmild\\b|stable", scale: 0.7,
      note: "At the milder end there's more room to move within the envelope — but the envelope still governs, and the boom-and-bust cycle is still what causes the crashes." }
  ],
  ph: [
    ["Find your baseline & recognise post-exertional malaise", 0, 4,
     "Find the level of activity you can do on a BAD day without a crash. That, not your best day, is your baseline.",
     "an activity diary running, post-exertional malaise recognised and tracked, a sustainable baseline identified",
     "This phase is about finding your limits, NOT testing them. Post-exertional malaise is delayed by 12–48 hours, which is what makes it so easy to overshoot — you feel fine at the time and pay for it two days later. Set the baseline by what you can manage on a bad day and repeat consistently."],
    ["Stabilise within the envelope", 4, 11,
     "Stay consistently inside the envelope until the crashes stop. Stability comes before any increase.",
     "no post-exertional crashes for several consecutive weeks, activity consistent day to day, symptoms stable",
     "Do the SAME amount on good days as on bad days — that is the entire discipline of pacing, and it's the hardest part. Boom-and-bust is what keeps ME/CFS going: the good day you overdo costs you the next three."],
    ["Cautious, optional, tiny increases", 11, 18,
     "Only if you've been genuinely stable and crash-free, consider very small increases — and reverse them immediately if symptoms return.",
     "several stable crash-free weeks before any increase, any increase held without a crash",
     "Increases are OPTIONAL and must be tiny, and any return of post-exertional malaise means go back down at once. There is no obligation to progress — this is not a fitness programme, and pushing through does not build tolerance in this condition, it causes relapse. Nobody should be pressuring you up this ladder."],
    ["Sustainable long-term management", 18, 24,
     "Live sustainably within your envelope, with adjustments that let you spend energy on what matters.",
     "a stable sustainable routine, energy spent on what matters most, crashes rare",
     "The envelope can widen over time for some people and not for others, and neither is a matter of effort or attitude. Orthostatic intolerance and sleep problems commonly travel with this and are separately treatable — worth chasing, because they widen the envelope."]] });

/* ---------------- cognitive-mobility ---------------- */
A.cognitiveMobility = (s) => retime({
  total: 20, freq: "Aerobic exercise most days + strength 2×/week + balance work",
  note: `${s.what} ${s.prog}`,
  variants: PACE,
  ph: [
    ["Assess, structure & start", 0, 3,
     "Get a baseline and start a simple, structured, repeatable routine.",
     "a routine started, safe environment, exercising 3×/week",
     `Keep it simple and repeatable — a routine that's the same each time is far easier to learn and stick to than a varied one. ${s.extra}`],
    ["Aerobic base & strength", 3, 9,
     "Build aerobic exercise and strength — the two with the best evidence for brain health.",
     "30 minutes of aerobic exercise most days, strength improving, walking better",
     "Aerobic exercise has the best evidence of anything for cognition and for slowing decline. Group and social exercise works better than solo here — the social side is part of the benefit, not a bonus."],
    ["Balance, dual-tasking & falls prevention", 9, 15,
     "Add balance training and dual-task practice, and address falls risk.",
     "steadier balance, safer dual-tasking, home hazards addressed",
     "Falls risk is roughly doubled with cognitive impairment, and dual-tasking is where it shows. Train it where a fall is safe, and get the home sorted."],
    ["Long-term routine & support", 15, 20,
     "Make it a sustained habit with the right support around it.",
     "a sustained routine, function maintained, support in place",
     "Consistency and support are what make this work. Involve family or a carer — routines that depend on remembering to do them are the ones that stop."]
  ]
}, s.total);
[["Mild cognitive impairment (exercise program)", "mild cognitive impairment|\\bmci\\b",
  "Mild cognitive impairment is measurable memory or thinking change that hasn't yet affected independence — it's a risk state, not a diagnosis of dementia, and a meaningful proportion of people stay stable or improve.",
  "Exercise is the single best-evidenced intervention available for MCI: aerobic exercise improves cognition and probably slows progression, and no drug currently matches it.",
  "Blood pressure, hearing, sleep, mood and social contact are all modifiable and all affect cognition — treating them is part of this, not separate from it.", 20],
 ["Dementia-related mobility (gentle exercise)", "dementia|alzheimer'?s",
  "Mobility and physical function decline in dementia partly from the condition and substantially from inactivity — which is the part that can be changed.",
  "Exercise improves physical function, mood, sleep and behaviour in dementia, and helps carers as much as it helps the person.",
  "Keep instructions short and demonstrate rather than explain. Familiar, rhythmic, repetitive activity — walking, dancing, music-based movement — works far better than anything new or complex. Distress during exercise usually means the task is too complex or the environment too busy, not that exercise is wrong.", 20]
].forEach(([label, r, what, prog, extra, total]) => add({ r, label, ...A.cognitiveMobility({ label, what, prog, extra, total }) }));
add({ r: "normal pressure hydrocephalus", label: "Normal pressure hydrocephalus (gait)",
  ...(() => { const b = A.cognitiveMobility({ what: "", prog: "", extra: "", total: 18 });
    b.note = "Normal pressure hydrocephalus causes a distinctive triad — a stuck, shuffling, wide-based walk with the feet seeming glued to the floor, plus urinary urgency and slowed thinking. It matters enormously because it is one of the few REVERSIBLE causes of walking and cognitive decline in older people: draining the fluid with a shunt can improve it dramatically, and gait improves most of all.";
    b.ph[0][0] = "Get it investigated — this one may be reversible";
    b.ph[0][5] = "This needs proper investigation rather than acceptance as 'ageing' — a tap test and shunt assessment can be life-changing, and gait responds best of the three symptoms. Falls risk is high because the gait is magnetic and turning is unstable.";
    b.ph[1][0] = "Gait training (and post-shunt rebuilding)";
    b.ph[1][5] = "If a shunt has been placed, expect gait to improve over weeks to months and rebuild strength and confidence alongside it. Report headaches, drowsiness or sudden worsening after a shunt — it can block or over-drain.";
    return b; })() });
add({ r: "arnold-chiari|chiari malformation", label: "Arnold-Chiari malformation (reconditioning)",
  ...(() => { const b = A.cognitiveMobility({ what: "", prog: "", extra: "", total: 18 });
    b.note = "In a Chiari malformation the lower part of the cerebellum sits below the base of the skull and crowds the space where the brain meets the spinal cord. The classic symptom is a headache at the BACK of the head brought on by coughing, sneezing, straining or laughing — because those raise the pressure that's already tight there.";
    b.freq = "Gentle, graded activity — nothing that involves straining or breath-holding";
    b.ph[0][0] = "Understand the pressure rule & start gently";
    b.ph[0][5] = "AVOID anything that raises pressure inside the head: breath-holding, straining, heavy lifting with a held breath (the Valsalva manoeuvre), inversions and head-down positions. Breathe OUT on effort, always. Avoid contact sport and end-range neck extension. Get urgent review for new swallowing trouble, arm weakness or numbness, or worsening headache — a syrinx can develop.";
    b.ph[1][0] = "Graded aerobic & postural conditioning";
    b.ph[1][5] = "Build gentle aerobic fitness while keeping the pressure rules — cycling and walking are usually well tolerated, while heavy lifting and straining are not. After decompression surgery, follow your surgeon's neck and lifting limits.";
    b.ph[2][0] = "Neck, shoulder girdle & balance";
    b.ph[2][5] = "Neck and shoulder-girdle strengthening is usually well tolerated in the mid-range. Keep breathing through every effort — never hold your breath.";
    return b; })() });

/* ---------------- spasticity, neglect, central foot drop ---------------- */
/* Anchored HARD: a bare `spasticity` or `foot drop` here would outrank the
   curated stroke plan on "Post-stroke spasticity (upper limb)", and would drag
   "Peroneal nerve palsy (foot drop)" — a PERIPHERAL nerve injury — into a
   central-lesion plan. Both would be wrong. */
A.spasticityMgmt = (s) => ({
  total: 16, freq: "Daily stretching and positioning + strength work for the opposing muscles",
  note: `Spasticity is stiffness from an over-active stretch reflex after damage to the brain or cord — the muscle isn't short, it's being told to contract, and the faster you move it the harder it resists. That's why it varies through the day and worsens when you're tired, cold, in pain or unwell. ${s.what}`,
  variants: PACE,
  ph: [
    ["Find the triggers & establish positioning", 0, 3,
     "Identify what's cranking the spasticity up, and get positioning and stretching right.",
     "triggers identified, a daily stretching and positioning routine running, comfortable positioning",
     `Anything unpleasant below the level of injury turns spasticity up: a full bladder, constipation, a urine infection, a pressure sore, an ingrown toenail, tight clothing. When spasticity suddenly worsens, look for THAT first — it's usually an infection, not a deterioration. Some spasticity is useful (it helps people stand and transfer), so the goal is to manage it, not abolish it.${s.extra}`],
    ["Sustained stretch, splinting & botulinum toxin window", 3, 8,
     "Use sustained stretch and splinting, and make the most of any botulinum toxin.",
     "range maintained or improved, less resistance to movement, splints tolerated",
     "Sustained, slow, prolonged stretch works; fast stretch triggers the reflex and achieves nothing. If botulinum toxin is used, the 2–6 week window afterwards is when stretching and retraining pay off most — that's the appointment to build the rehab around."],
    ["Strengthen the opposing muscles & retrain function", 8, 12,
     "Strengthen the muscles that oppose the spastic ones, and retrain functional movement.",
     "better active control, function improving, less effort in daily tasks",
     "Strengthening does NOT worsen spasticity — that's an old myth that cost people decades of function. The muscles opposing the spastic ones are usually weak and need training."],
    ["Function & long-term routine", 12, 16,
     "Keep range and function with a routine you can sustain.",
     "a sustained routine, range maintained, function preserved",
     "Contractures — where the muscle genuinely does shorten permanently — are what you're preventing, and they're far easier to prevent than to treat. This routine is permanent."]
  ]
});
add({ r: "spasticity management \\(upper limb\\)|upper limb spasticity management", label: "Spasticity management (upper limb)",
  ...A.spasticityMgmt({ what: "In the arm the typical pattern pulls the shoulder in, the elbow, wrist and fingers into a bend, and the thumb into the palm.",
    extra: " Watch the hand: a fist that can't be opened macerates the palm and gets infected. Hand hygiene and a resting splint prevent that." }) });
add({ r: "spasticity management \\(lower limb\\)|lower limb spasticity management", label: "Spasticity management (lower limb)",
  ...A.spasticityMgmt({ what: "In the leg the typical pattern stiffens the knee straight, points the foot down and turns it in, which catches the toes when walking.",
    extra: " A foot pointing down and turning in makes trips and ankle sprains likely; an ankle-foot orthosis usually does more for walking than any amount of stretching." }) });
add({ r: "foot drop \\(central\\)|central foot drop", label: "Foot drop (central) rehabilitation",
  total: 16, freq: "Daily walking practice + ankle work; orthosis or stimulator as advised",
  note: "A foot drop from a BRAIN or spinal cord cause behaves differently from one caused by a squashed nerve at the knee: the muscle still has its nerve supply, but the signal to lift the foot isn't getting through properly, and there's often spasticity in the calf pulling against it. That's why the treatment is different — retraining and stimulation rather than waiting for a nerve to regrow.",
  variants: PACE,
  ph: [
    ["Make walking safe: orthosis or stimulator", 0, 3,
     "Get the foot clearing the ground safely, with an orthosis or functional electrical stimulation.",
     "walking without catching the toes, an AFO or stimulator fitted, no trips",
     "Catching the toes causes falls, and falls cause fractures — so an ankle-foot orthosis is enabling, not a defeat. Functional electrical stimulation is an option in central foot drop specifically, because the nerve to the muscle still works; it's usually not an option when the nerve itself is damaged. Check skin under any orthosis daily, especially if sensation is reduced."],
    ["Activate the lifters & stretch the calf", 3, 8,
     "Retrain the muscles that lift the foot, and keep the calf long.",
     "some active lift returning or maintained, calf staying long enough to get the foot to neutral",
     "The calf tightens fast in a dropped foot and a short calf makes the drop permanent — daily calf stretch is as important as the strengthening. Fast stretch triggers spasticity; go slow and sustained."],
    ["Gait retraining & balance", 8, 12,
     "Retrain a normal walking pattern and build balance.",
     "walking with better clearance and a more normal pattern, steadier balance",
     "Hip-hitching and swinging the leg out are compensations that work — but they cost energy and wear the hip and back. Retrain toward normal where it's achievable, and accept the compensation where it isn't."],
    ["Endurance & community walking", 12, 16,
     "Build walking distance and confidence in the community.",
     "walking useful distances, confident on kerbs and uneven ground, a sustained routine",
     "Uneven ground, kerbs and tiredness at the end of the day are when the toe catches. Keep the orthosis on for distance even if you manage without it at home."]] });
add({ r: "hemineglect|hemispatial neglect|unilateral (spatial )?neglect|visual neglect", label: "Hemineglect rehabilitation",
  total: 16, freq: "Short, frequent daily sessions with scanning practice built into real tasks",
  note: "Neglect is a failure to ATTEND to one side of the world — usually the left — rather than a failure to see it. The eyes work; the attention doesn't go there. It's why someone eats half a plate of food, shaves half a face, or reads half a page, and it's often not noticed by the person themselves, which is the hardest part.",
  variants: PACE,
  ph: [
    ["Make the environment safe & start scanning", 0, 3,
     "Set the environment up safely and begin structured scanning to the neglected side.",
     "a safe environment, structured scanning started, cues being used",
     "Safety first: bumping into doorframes, missing obstacles on the neglected side, and unsafe transfers are the immediate risks. Put important things on the neglected side deliberately, and use a bright anchor (a coloured strip or tape) at the edge to give the eye something to find. Neglect makes driving unsafe — this needs formal assessment."],
    ["Scanning training & limb activation", 3, 8,
     "Train systematic scanning and get the neglected limb moving to bring that side back into attention.",
     "scanning more systematically, finding items on the neglected side, using the neglected limb more",
     "MOVING the neglected arm on the neglected side helps the attention go there — limb activation is a real treatment, not a bonus. Prism adaptation and visual scanning training are the best-evidenced approaches."],
    ["Function, reading & daily tasks", 8, 12,
     "Build scanning into real tasks — eating, dressing, reading, moving about.",
     "eating a whole plate, dressing both sides, reading a full line, navigating doorways safely",
     "Practise in the real task, not just at a table — neglect that improves on paper often doesn't transfer unless you train the actual activity."],
    ["Community mobility & long-term strategies", 12, 16,
     "Get out into busy environments with reliable strategies.",
     "safe in busy environments, strategies used automatically, family understand and support them",
     "Neglect often improves substantially over the first months. Where it persists, the strategy has to become automatic — and family need to understand it, because 'he's just not trying' is the commonest and most damaging misreading of neglect."]] });

/* ---------------- postural neuro syndromes ---------------- */
A.postureNeuro = (s) => ({
  total: 20, freq: "Daily extensor strengthening + stretching; little and often",
  note: `${s.what} ${s.prog}`,
  variants: PACE,
  ph: [
    ["Find the cause & start extensor work", 0, 4,
     "Get the underlying cause identified, and start strengthening the muscles that hold you up.",
     "a cause identified, extensor strengthening started, aware of posture through the day",
     `This posture is a SYMPTOM, so the cause matters: Parkinson's, myopathy, motor neurone disease, myasthenia and medication side-effects all cause it and are treated differently. ${s.extra}`],
    ["Extensor strength & stretching the front", 4, 10,
     `Strengthen ${s.ext} and stretch what has shortened at the front.`,
     "better posture held for longer, extensor strength improving, less pain",
     "The muscles at the back are weak and overstretched, and the ones at the front have shortened — so it's strengthen behind, stretch in front. Work in short frequent bouts; these muscles fatigue quickly."],
    ["Endurance, positioning & equipment", 10, 15,
     "Build endurance in the position and get equipment and supports right.",
     "posture held through more of the day, walking and eating easier, supports helping",
     `Endurance matters more than strength here — the posture collapses when the muscles tire, which is why it's worse late in the day.${s.equip}`],
    ["Long-term maintenance", 15, 20,
     "Maintain what you've gained with a permanent routine.",
     "a sustained routine, posture and function maintained, reviewed regularly",
     "This needs to continue: the posture returns within weeks of stopping. Review the cause periodically — treating it (or a medication change) sometimes does more than any exercise."]
  ]
});
add({ r: "camptocormia", label: "Camptocormia (reconditioning)",
  ...A.postureNeuro({ what: "Camptocormia is a marked forward bending of the trunk that appears on standing and walking and disappears completely on lying down — that disappearance is the key feature and tells you the spine itself is not fixed in that shape.",
    prog: "It's usually driven by Parkinson's or a muscle disease, and it responds partly to treating the cause, partly to extensor strengthening, and often to equipment.",
    ext: "the spinal extensors and hip extensors", extra: "Because it vanishes lying down, exercising lying face-down is often the most effective starting position — you can strengthen the extensors there without gravity beating you.",
    equip: " A high walking frame, a rucksack-style brace or Nordic poles often achieve more upright walking than exercise alone, and there's no prize for refusing them." }) });
add({ r: "dropped-head syndrome|dropped head syndrome|head ptosis", label: "Dropped-head syndrome (reconditioning)",
  ...A.postureNeuro({ what: "Dropped-head syndrome is a weakness of the neck extensors that lets the chin fall toward the chest, so you can't lift your head to look ahead — it comes on gradually and is exhausting and isolating.",
    prog: "The causes range from an isolated neck-extensor myopathy to Parkinson's, myasthenia and motor neurone disease — and some of those are treatable, so the diagnosis genuinely matters.",
    ext: "the neck extensors", extra: "Get this properly investigated: myasthenia in particular can present exactly like this and is highly treatable, so it must not be missed.",
    equip: " A collar helps eating, talking and looking ahead, but it also lets the muscles weaken further — so use it for specific tasks rather than all day, and keep the strengthening going alongside." }) });

/* ---------------- paediatric neuro ---------------- */
A.pedsNeuro = (s) => retime({
  total: 24, freq: "Daily play-based practice, woven into ordinary routines rather than set as exercises",
  note: `${s.what} ${s.prog} In children the treatment IS play: motor skills are learned through repetition of things a child wants to do, so a session that feels like a game will always beat a session that feels like therapy.`,
  variants: PACE,
  ph: [
    ["Assess, involve the family & start play", 0, 4,
     "Understand where the child is, get the family on board, and start play-based practice.",
     "a clear picture of the child's skills, family confident with the activities, the child engaged",
     `Practice has to be woven into daily routines to get the repetitions that matter — a home programme done as 'exercises' rarely survives a fortnight. Follow the child's motivation.${s.extra}`],
    [s.ph2, 4, 12, s.goal2, s.crit2, s.restrict2],
    ["Build strength, coordination & participation", 12, 19,
     "Build strength and coordination, and get the child participating with peers.",
     "clear skill gains, joining in with other children, strength and endurance improving",
     "Participation is the goal, not a normal-looking movement — a child who joins in is a child who keeps practising. Group activities, swimming and cycling all build capacity while feeling like fun."],
    ["Long-term development & review", 19, 24,
     "Support ongoing development and review as the child grows.",
     "skills maintained and progressing, activities sustainable, review scheduled",
     "Children change as they grow, and skills that were fine can become difficult as the body gets bigger — periodic review matters. Keep them active for life: that's the outcome that actually counts."]
  ]
}, s.total);
add({ r: "gross motor developmental delay|global developmental delay|developmental delay|motor developmental delay", label: "Developmental delay (motor)",
  ...A.pedsNeuro({ what: "Developmental delay means motor milestones are arriving later than expected.",
    prog: "The cause matters and needs looking for, but the treatment is broadly the same: lots of practice of the skills just beyond the child's current level, made fun enough to repeat hundreds of times.",
    ph2: "Milestone practice & strength", goal2: "Practise the skills just beyond where the child is now — the next milestone, not the one after.",
    crit2: "new milestones emerging, better postural control, more independent movement",
    restrict2: "Aim just above current ability — too hard and the child disengages, too easy and nothing changes. Tummy time, floor play and letting them work things out beats equipment that holds them in position. Report any LOSS of skills the child previously had — going backwards is different from being delayed and needs urgent assessment.",
    extra: " A child who loses skills they used to have needs urgent medical review — that's regression, not delay.", total: 26 }) });
add({ r: "autism-related motor|autism.*(motor|coordination)|autistic.*motor", label: "Autism-related motor coordination (exercise support)",
  ...A.pedsNeuro({ what: "Motor coordination difficulties are very common in autistic children and are often overlooked because attention goes to communication and social differences first.",
    prog: "Exercise helps coordination, sleep, mood and regulation — and the way it's delivered matters more than what's in it.",
    ph2: "Predictable, interest-led motor practice", goal2: "Build motor skills through predictable, structured, interest-led activity.",
    crit2: "coordination improving, engaging with the activity, less distress around it",
    restrict2: "Predictability is what makes this work: same place, same order, clear visual structure, warning before changes. Build it around the child's interests rather than a standard programme. Sensory factors are real — a noisy echoing sports hall can make participation impossible for reasons that have nothing to do with the exercise.",
    extra: " Watch for hypermobility, which is common in autistic children and changes what's appropriate.", total: 24 }) });
add({ r: "down syndrome|trisomy 21", label: "Down syndrome (motor / exercise support)",
  ...A.pedsNeuro({ what: "In Down syndrome, low muscle tone and very lax ligaments mean joints are loose and motor milestones come later — the muscles work, but the joints don't give them a stable base to work from.",
    prog: "Strength training is safe and genuinely valuable here, and the goal is stability and strength rather than more flexibility, which there is already plenty of.",
    ph2: "Stability, strength & milestone practice", goal2: "Build strength and joint stability, and practise motor milestones.",
    crit2: "better postural control, strength improving, milestones progressing, walking steadier",
    restrict2: "Do NOT stretch for more range — the joints are already too lax, and more flexibility makes them less stable. Strength and control are the targets. ATLANTOAXIAL INSTABILITY affects a minority and matters: get it assessed before any activity involving neck flexion or impact — trampolining, diving, gymnastics, contact sport and forward rolls are the classic concerns. Any new neck pain, changed walking, altered bladder or bowel control, or new arm weakness needs urgent review.",
    extra: " Heart conditions are common in Down syndrome and should be known about before exercise intensity is pushed.", total: 26 }) });

/* ---------------- stiff-person ---------------- */
add({ r: "stiff-person syndrome|stiff person syndrome", label: "Stiff-person syndrome (reconditioning)",
  total: 20, freq: "Gentle daily stretching and movement — never forced, never fast",
  note: "Stiff-person syndrome is a rare immune condition causing progressive muscle rigidity in the trunk and limbs, plus dramatic painful spasms triggered by noise, touch, stress or being startled. The spasms are severe enough to break bones and to cause falls with no protective reaction at all — which is why safety, not fitness, leads this plan.",
  variants: PACE,
  ph: [
    ["Understand the triggers & make it safe", 0, 4,
     "Identify what triggers the spasms and make the environment safe.",
     "triggers identified, environment adapted, medical treatment optimised",
     "Startle is a trigger: sudden noise, unexpected touch, stress and haste all set off spasms. Falls happen like a felled tree, with no protective reaction, so falls precautions matter more here than almost anywhere. Approach and touch the person only with warning. Medical treatment (muscle relaxants and immune therapy) does the heavy lifting — exercise supports it."],
    ["Gentle stretching & relaxation", 4, 10,
     "Work on gentle stretching, breathing and relaxation to reduce the background rigidity.",
     "less background stiffness, more comfortable movement, relaxation techniques working",
     "Slow, gentle, warned-in-advance movement only. Fast passive stretching triggers spasm and can injure. Heat, warm water and relaxation genuinely reduce rigidity — hydrotherapy is often the best-tolerated setting for this condition."],
    ["Graded movement & function", 10, 15,
     "Build gentle graded movement and maintain function.",
     "function maintained, walking safer, spasms less frequent",
     "Progress very gently. Anxiety and the condition feed each other — task-specific fear (crossing a road, an open space) is a recognised feature of stiff-person syndrome and is neurological, not a phobia."],
    ["Maintenance & long-term", 15, 20,
     "Maintain movement, comfort and safety long term.",
     "a sustained gentle routine, function preserved, treatment reviewed",
     "This is long-term maintenance alongside medical treatment. Because rigidity restricts the chest, breathing exercises matter. Never push through a spasm."]] });

/* ============================ MSK GAPS ============================ */

/* ---------------- the JUNCTIONAL spinal levels ---------------- */
/* The LEVELS loop earlier in this file builds `${letter}${i}-${letter}${i+1}`
   inside one region at a time (C 2→7, T 1→12, L 1→5), so it structurally cannot
   emit the three levels that CROSS regions — C7-T1, T12-L1 and L5-S1. L5-S1 is
   the commonest disc level in the body, so that gap mattered. Same regex shape
   and same archetype as the loop, so these behave identically to every other
   level; per that established precedent a level-specific plan outranks the
   broader curated "Lumbar disc / sciatica" on "Disc herniation at L5-S1",
   exactly as it already does on "Disc herniation at L4-L5". */
const JUNCTIONS = [
  ["C7-T1", "cervical", "neck",
   "This is the cervicothoracic junction, where the mobile neck meets the stiff upper back. The C8 nerve root leaves here — it runs to the little and ring fingers and to the small muscles that grip, so symptoms show up as pain down the inner arm with a weak, clumsy grip rather than the thumb-side symptoms of a higher level.",
   "Weakness of grip, or wasting of the small muscles between the thumb and finger, needs review rather than watching. Because this level is where the neck's mobility meets the ribcage's stiffness, getting the upper back moving usually does more for it than working the neck itself."],
  ["T12-L1", "thoracic", "mid-back",
   "This is the thoracolumbar junction — the hinge where the rigid, rib-braced thoracic spine meets the mobile lumbar spine, which is why it takes so much load. It is also the one disc level with a genuinely different risk: the spinal cord itself usually ENDS around L1, so a large disc lesion here can press on the cord or the conus rather than on a single nerve root.",
   "This level is different from a lumbar disc: the cord can end right here, so bladder or bowel changes, numbness in the saddle area, or weakness in BOTH legs are an emergency and need the same-day emergency department — not a physio appointment. Rotation and end-range extension are the aggravators at this junction."],
  ["L5-S1", "lumbar", "lower back",
   "L5-S1 is the commonest disc level in the body — it sits at the very bottom of the spine and takes the most load. The S1 nerve root leaves here and runs down the back of the leg into the calf and the sole, so the classic pattern is pain to the outer foot, a weak push-off, and a lost ankle reflex.",
   "Trouble rising onto tiptoes on that leg alone is real S1 weakness and warrants review. Bladder or bowel changes, or numbness in the saddle area, are a cauda equina emergency — same day, emergency department."]
];
JUNCTIONS.forEach(([LVL, region, part, why, extra]) => {
  const lvl = LVL.toLowerCase();
  const Part = part.replace(/^./, c => c.toUpperCase());
  add({ r: `disc (protrusion|herniation|bulge|prolapse|extrusion|lesion).*${lvl}|${lvl} disc`,
    label: `${Part} disc lesion (${LVL})`,
    ...(() => { const b = A.disc({ label: `disc lesion at ${LVL}`, region, part });
      b.note = `${b.note} ${why}`;
      b.ph[0][5] = `${b.ph[0][5]} ${extra}`;
      return b; })() });
  /* NB: the existing LEVELS loop also carries a `spondylolysis .*<level>`
     alternative, which makes "Spondylolysis (pars defect) at L4-L5" resolve to the
     nerve-root plan instead of the dedicated pars plan. That is pre-existing
     behaviour and out of scope here, but it is NOT reproduced: a pars stress
     fracture needs "avoid loaded extension", not a disc/nerve-root timeline, so
     "Spondylolysis (pars defect) at L5-S1 / C7-T1" keeps the spondylolysis plan. */
  add({ r: `radiculopathy at ${lvl}|${lvl} radiculopathy|nerve root .*${lvl}|facet .*${lvl}|stenosis at ${lvl}`,
    label: `${Part} nerve-root irritation (${LVL})`,
    ...(() => { const b = A.disc({ label: `radiculopathy at ${LVL}`, region, part });
      b.note = `${b.note} ${why}`;
      b.ph[0][5] = `${b.ph[0][5]} ${extra}`;
      return b; })() });
});

/* ---------------- spinal stenosis ---------------- */
A.stenosis = (s) => retime({
  total: 20, freq: "Daily walking to tolerance + flexion-biased exercise and strength work 3×/week",
  note: `${s.what} ${s.prog}`,
  variants: PACE,
  ph: [
    ["Settle symptoms & find your position of ease", 0, 4,
     `Reduce the irritation and find the positions and distances you can work within.`,
     "a clear sense of your walking distance, symptoms settling with the position of ease, exercising comfortably",
     s.restrict],
    [s.ph2, 4, 9, s.goal2, s.crit2, s.restrict2],
    ["Build walking distance & strength", 9, 15,
     "Increase walking tolerance in intervals, and build hip, trunk and leg strength.",
     "walking noticeably further before symptoms start, clear strength gains, doing more day to day",
     s.ph3r],
    ["Capacity & long-term management", 15, 20,
     "Build lasting capacity and settle into long-term management.",
     "walking the distances you need, a maintenance routine you'll keep, symptoms predictable",
     "Stenosis is a structural narrowing, so exercise doesn't widen the canal — it makes you better able to live with it, and that works well for most people. Where walking distance stays severely limited despite good rehab, decompression surgery is very effective and worth discussing."]
  ]
}, s.total);
add({ r: "lumbar spinal stenosis|lumbar canal stenosis|neurogenic claudication|central canal stenosis|lateral recess stenosis", label: "Lumbar spinal stenosis",
  ...A.stenosis({
    what: "Lumbar stenosis is a narrowing of the space the nerves run through in the lower back, so walking brings on heavy, aching, tired legs that ease within a minute or two of sitting or bending forward.",
    prog: "The pattern is the diagnosis: bending FORWARD opens the canal and relieves it, which is why people can cycle for miles but not walk to the shops, and why they lean on a trolley in the supermarket without ever noticing they do it.",
    restrict: "Extension — standing tall, leaning back, walking downhill — closes the canal and provokes symptoms; flexion opens it. Use that: lean on a trolley, sit for a minute, cycle instead of walk. Leg symptoms that come on with walking and ease with REST but not with bending forward can be poor circulation rather than stenosis, and that's a different diagnosis needing different treatment. New bladder or bowel changes are an emergency.",
    ph2: "Flexion-biased exercise & nerve mobility", goal2: "Use flexion-biased exercise to open the canal, and get the nerves gliding.",
    crit2: "walking further before symptoms start, comfortable with the flexion-based routine, nerves less irritable",
    restrict2: "Flexion-biased exercise — knees to chest, cycling, seated work — is the treatment here, which is the opposite of most back advice. Avoid prolonged standing and walking downhill, which are the worst combination.",
    ph3r: "Build walking in INTERVALS: walk to just before symptoms start, sit for a minute, then go again. That builds far more total distance than one long walk into symptoms, and it's how people get back to the shops.", total: 20 }) });
add({ r: "cervical stenosis|cervical canal stenosis|cervical myelopathy|cervical spondylotic myelopathy", label: "Cervical stenosis",
  ...A.stenosis({
    what: "Cervical stenosis is a narrowing of the canal in the neck. It matters far more than lumbar stenosis, because what's being squeezed here is the SPINAL CORD itself rather than individual nerve roots.",
    prog: "The warning signs are subtle and easily dismissed: clumsy hands, dropping things, trouble with buttons, a changed walk, and a feeling of unsteadiness. Those are cord signs (myelopathy), not neck pain — and they change the whole picture.",
    restrict: "THIS IS THE ONE TO TAKE SERIOUSLY. Get urgent review for clumsy hands, dropping things, difficulty with buttons or coins, unsteady walking, or any bladder or bowel change — those are signs the cord is being compressed, and surgery to decompress it prevents permanent damage rather than reversing it. Do NOT have the neck manipulated, and avoid end-range extension and heavy loading through the neck. Contact sport is out.",
    ph2: "Gentle range, posture & safe strengthening", goal2: "Restore comfortable mid-range neck movement and build safe deep-neck and scapular strength.",
    crit2: "comfortable mid-range movement, better scapular and deep-neck control, cord signs not progressing",
    restrict2: "Work in the MID-RANGE only — end-range extension narrows the canal further. If cord signs (hand clumsiness, unsteady walking) are present or progressing, this is a surgical conversation and exercise is not the answer.",
    ph3r: "Balance and walking matter here, because myelopathy affects the legs as much as the hands — falls are a real risk. Build strength around the neck and shoulder girdle, and keep the neck out of end-range.", total: 22 }) });
add({ r: "spinal epidural lipomatosis", label: "Spinal epidural lipomatosis (reconditioning)",
  ...(() => { const b = A.stenosis({
      what: "Spinal epidural lipomatosis is an overgrowth of the normal fat inside the spinal canal, which crowds the nerves and produces the same picture as stenosis.",
      prog: "What makes it different is that it is often REVERSIBLE: it's strongly linked to long-term steroid use, obesity and some hormonal conditions, and treating those can genuinely shrink the fat and relieve the symptoms.",
      restrict: "This one has a treatable cause: long-term steroids and obesity are the main drivers. Reviewing steroid treatment with your doctor and losing weight are more likely to change this than any exercise — and unlike bony stenosis, that can actually reverse it. New bladder or bowel changes are an emergency.",
      ph2: "Flexion-biased exercise & weight management", goal2: "Use flexion-biased exercise for symptoms while addressing the underlying cause.",
      crit2: "symptoms easing, weight trending down if relevant, steroid treatment reviewed",
      restrict2: "The exercise is the same as for stenosis — flexion-biased and interval-based — but the real lever here is the cause. Never stop steroid medication on your own; it must be tapered by your prescriber.",
      ph3r: "Build walking in intervals and keep going with the weight and steroid management — that's what shrinks the fat and gives lasting change.", total: 20 });
    return b; })() });

/* ---------------- failed back / post-laminectomy / adjacent segment ---------------- */
add({ r: "failed back surgery syndrome|post-laminectomy syndrome|failed back", label: "Failed back surgery syndrome",
  total: 26, freq: "Daily graded activity — consistency matters far more than intensity here",
  note: "'Failed back surgery syndrome' is an unhelpful name for a real problem: persisting pain after spinal surgery. The surgery usually did what it was meant to do mechanically — the nerve was decompressed — but pain persisted, because by this stage the pain is being generated and amplified by a sensitised nervous system as much as by any structure. That's why more scans and more surgery so often disappoint, and why graded activity, sleep, and pain-system treatment do better.",
  variants: [
    { k: "standard", label: "Standard pathway", sub: "Persisting pain after spinal surgery", scale: 1 },
    { k: "multiop", label: "Multiple previous operations", sub: "More than one spinal surgery", pick: "revision|multiple|repeat|second", scale: 1.4,
      note: "Each further spinal operation has a lower chance of helping than the one before — that's a well-established pattern and an important thing to know before agreeing to another. Rehab, pain management and graded activity have better odds at this point than more surgery." },
    { k: "neuropathic", label: "Mostly nerve pain", sub: "Burning, shooting leg pain", pick: "neuropathic|radicular|nerve pain|burning", scale: 1.2,
      note: "Burning, shooting, electric leg pain is neuropathic and responds to different medication than ordinary pain — ordinary painkillers do very little for it. That's worth a proper medication review, because getting it right makes the rehab possible." }
  ],
  ph: [
    ["Understand the pain & restart movement", 0, 5,
     "Understand why pain has persisted, and restart gentle, regular, graded movement.",
     "a routine of daily gentle activity, understanding the pain mechanism, sleep being addressed",
     "The first step is knowing that persisting pain here does NOT mean the surgery failed structurally or that something is still broken — a sensitised nervous system produces real pain without ongoing damage. Hurt does not equal harm. That said, NEW weakness, or any bladder or bowel change, is different and needs urgent review."],
    ["Graded activity & desensitisation", 5, 12,
     "Build activity steadily by the clock rather than by how you feel, and desensitise movement.",
     "activity increasing week on week, fewer boom-and-bust cycles, moving with less guarding",
     "Pace by time and plan, not by pain — the boom-and-bust cycle (doing lots on good days, nothing on bad ones) is what keeps this going. Increase by small fixed amounts regardless of the day."],
    ["Strength, conditioning & confidence", 12, 20,
     "Build genuine strength and aerobic fitness, and rebuild confidence in bending and lifting.",
     "clear strength gains, aerobic fitness improving, bending and lifting without fear",
     "Loading the spine is safe and is part of the treatment. Movement avoidance and fear are stronger predictors of long-term disability here than anything on the scan."],
    ["Return to life & long-term self-management", 20, 26,
     "Get back to work and the life you want, with a plan you own.",
     "back to work and activities, a flare plan you can use, medication rationalised",
     "The realistic goal is a good life with manageable pain rather than no pain at all — and aiming at function usually reduces the pain more than aiming at the pain does. Repeated scans and repeated surgery rarely help at this stage; a multidisciplinary pain programme has the best evidence."]] });
add({ r: "post-laminectomy recovery|post-laminectomy|after (a )?laminectomy|post-discectomy recovery", label: "Post-laminectomy recovery",
  ...A.spineNeuroRecon({ what: "A laminectomy removes bone from the back of the vertebra to take pressure off the nerves.", fusion: false }) });
add({ r: "adjacent segment disease|adjacent segment degeneration", label: "Adjacent segment disease",
  total: 20, freq: "Daily mobility for the levels above and below + strength work 3×/week",
  note: "After a spinal fusion, the levels immediately above and below have to do the movement the fused level no longer does — and over years they wear faster as a result. That's adjacent segment disease. It is a predictable consequence of fusion rather than anything you did wrong, and it's usually managed well without more surgery.",
  variants: PACE,
  ph: [
    ["Settle symptoms & assess the whole spine", 0, 4,
     "Settle the irritation and look at how the whole spine and hips are moving, not just the painful level.",
     "symptoms settling, a clear picture of where movement is and isn't happening",
     "The painful level is being overworked because something else isn't moving. Look above, below and at the hips — that's where the fix usually is. New leg weakness or bladder/bowel change needs urgent review."],
    ["Restore movement everywhere else", 4, 9,
     "Get the hips, the thoracic spine and the unfused levels moving well, to share the load.",
     "better hip and thoracic mobility, more evenly shared movement, less strain at the adjacent level",
     "You cannot make the fused level move — so the whole strategy is to give the movement somewhere else to go. Hip and thoracic mobility do more for this than anything aimed at the sore spot."],
    ["Strength & load-sharing", 9, 15,
     "Build trunk, hip and leg strength so the spine is supported through load.",
     "clear strength gains, tolerating daily loads, symptoms less frequent",
     "Progressive loading is protective. Deadlift-style hinging from the hips (rather than the back) protects the adjacent level and is worth learning properly."],
    ["Long-term management", 15, 20,
     "Settle into long-term management that protects the remaining levels.",
     "a maintenance routine you'll keep, symptoms manageable, activity restored",
     "Keep this going for the long term: the levels next to a fusion need looking after for life. Further fusion is sometimes needed, but it moves the problem along one level rather than curing it — so exercise first is generally the right order."]] });

/* ---------------- sacroiliac joint, coccyx & pelvic girdle ---------------- */
A.siPelvis = (s) => retime({
  total: 14, freq: "Daily short sessions — little and often",
  note: `${s.what} ${s.prog}`,
  variants: PACE,
  ph: [
    ["Settle & offload", 0, 3,
     "Calm the irritation and take the load off the painful structure.",
     "pain settling at rest and at night, comfortable in your usual positions",
     s.restrict],
    [s.ph2, 3, 7, s.goal2, s.crit2, s.restrict2],
    ["Progressive strengthening", 7, 11,
     `Rebuild strength and control around the ${s.part}.`,
     "clear strength gains, daily tasks easier, pain less frequent",
     "Progress load gradually. Single-leg work — standing, stepping, climbing stairs — is where pelvic control actually gets trained."],
    ["Return to full activity & prevention", 11, 14,
     "Return to full activity and address whatever set it off.",
     "back to your normal activity, strength near-symmetrical, a maintenance routine",
     "Fix the cause — the loading pattern, the training spike, the posture or the asymmetry — or it comes back. Keep the strength work going; it's what holds the gain."]
  ]
}, s.total);
add({ r: "sacroiliac joint dysfunction|sacroiliac (joint )?(pain|dysfunction)|\\bsi\\b joint (pain|dysfunction)|si joint dysfunction", label: "Sacroiliac joint dysfunction",
  ...A.siPelvis({ part: "pelvis",
    what: "The sacroiliac joints join the base of the spine to the pelvis. They barely move — a couple of millimetres — so despite what you may have been told, they don't go 'out' and need putting back.",
    prog: "SI pain is a load-tolerance problem: the joint is being asked to take more than it currently tolerates, usually because the hips and trunk aren't sharing the work. Strength and load management fix it; repeated 'realignment' does not.",
    restrict: "Nothing is out of place and nothing needs putting back — that model is wrong and it makes people fearful and dependent on treatment. Avoid the asymmetrical loading that provokes it early on: standing on one leg, crossing your legs, and long car journeys.",
    ph2: "Restore hip & trunk control", goal2: "Get the hips and trunk sharing the load properly.",
    crit2: "better hip strength and control, less pain with single-leg tasks, sleeping better",
    restrict2: "Gluteal strength is the single highest-value thing here — the SI joint is stabilised by muscle, not by ligaments alone. Avoid the sustained asymmetrical positions that keep irritating it.", total: 14 }) });
add({ r: "sacroiliitis", label: "Sacroiliitis",
  ...(() => { const b = A.siPelvis({ part: "pelvis",
      what: "Sacroiliitis is INFLAMMATION of the sacroiliac joint — which makes it a genuinely different problem from mechanical SI joint pain, even though it hurts in the same place.",
      prog: "The pattern gives it away: inflammatory pain is worse with REST and better with movement, wakes you in the second half of the night, and comes with more than 30 minutes of morning stiffness. That's the opposite of mechanical pain, and it points to axial spondyloarthritis, which needs medical treatment rather than just exercise.",
      restrict: "This pattern — worse at rest, better with movement, night pain, prolonged morning stiffness, and someone under 45 — needs a rheumatology opinion, because inflammatory back disease responds to specific medication and is often diagnosed years late. Exercise helps a great deal but it is not the whole treatment.",
      ph2: "Daily mobility & inflammatory-pain management", goal2: "Establish a daily mobility routine, which is the mainstay for inflammatory joint disease.",
      crit2: "morning stiffness reducing, mobility maintained, medical treatment underway",
      restrict2: "Movement is medicine here in a very literal sense: the worst thing for inflammatory back disease is rest, and daily mobility genuinely slows the stiffening. Don't stop exercising during a flare — reduce the load but keep moving.", total: 16 });
    b.freq = "Daily mobility — non-negotiable in inflammatory joint disease — plus strength 2–3×/week";
    b.ph[3][5] = "This is lifelong daily maintenance rather than a course of treatment. Keep the spine and chest moving, and stay under rheumatology review — modern medication changes the long-term outlook dramatically.";
    return b; })() });
add({ r: "coccydynia|coccyx pain|tailbone pain|sacrococcygeal pain", label: "Coccydynia",
  ...(() => { const b = A.siPelvis({ part: "tailbone",
      what: "Coccydynia is pain at the tailbone, usually after a fall onto it, a childbirth, or long periods sitting on a hard seat.",
      prog: "It's stubborn and often lasts months, but the large majority settle without anything invasive — the single most effective intervention is simply changing how you sit.",
      restrict: "Get a wedge or doughnut cushion with a CUT-OUT at the back so the tailbone doesn't touch the seat at all — that one change does more than any exercise. Sit leaning slightly forward, avoid soft sofas that let you roll back onto it, and don't sit for long stretches. Constipation makes it markedly worse, so deal with that.",
      ph2: "Pelvic floor release & sitting tolerance", goal2: "Release the pelvic floor muscles that attach to the tailbone, and build sitting tolerance.",
      crit2: "sitting longer comfortably, less pain rising from a chair, pelvic floor less tense",
      restrict2: "The pelvic floor attaches directly to the coccyx and is usually part of the problem — so this often needs a pelvic health physiotherapist rather than generic exercises, and internal release techniques are frequently what unlocks it. Do NOT do strong pelvic floor squeezes here: the muscle is usually over-tight already, and clenching it harder pulls on the sore tailbone.",
      total: 16 });
    return b; })() });
add({ r: "pelvic girdle pain|pubic symphysis dysfunction|symphysis pubis dysfunction|\\bspd\\b pregnancy", label: "Pelvic girdle pain",
  ...(() => { const b = A.siPelvis({ part: "pelvis",
      what: "Pelvic girdle pain is pain around the back of the pelvis, the pubic bone, or both — commonest in and after pregnancy, when hormones and a shifting load change how the pelvis tolerates weight.",
      prog: "The pelvis is not unstable and nothing is separating — the joints are simply being loaded beyond what they currently tolerate. That's important, because fear of 'instability' makes people stop moving, and stopping moving makes it worse.",
      restrict: "Your pelvis is not falling apart — that language is wrong and it does harm. What helps: keep the legs together when rolling in bed or getting out of a car, avoid standing on one leg to dress, take stairs one at a time, and keep steps short. A pelvic support belt genuinely helps some people and is worth trying.",
      ph2: "Hip & trunk strength within comfort", goal2: "Build hip and trunk strength within a comfortable range.",
      crit2: "walking further comfortably, stairs easier, less pain turning in bed",
      restrict2: "Avoid the asymmetrical, wide-legged and single-leg loading that provokes it, but do NOT stop moving — rest makes pelvic girdle pain worse, not better. Keep within comfort and build gradually.", total: 14 });
    b.variants = [
      { k: "standard", label: "Standard", sub: "The usual criteria-based pathway", scale: 1 },
      { k: "pregnancy", label: "During pregnancy", sub: "Currently pregnant", pick: "pregnan|antenatal", scale: 1.2,
        note: "During pregnancy this is managed rather than cured — the load and the hormones are ongoing. The good news is that the large majority resolve within a few months of delivery. Keep moving within comfort; a support belt and modified movement do most of the work." },
      { k: "postpartum", label: "After delivery", sub: "Postnatal", pick: "postpartum|postnatal|post-natal|after (delivery|birth)", scale: 0.85,
        note: "After delivery most pelvic girdle pain settles within weeks to a few months as hormones normalise and load reduces. Progressive strengthening now works well and is safe — this is the phase to rebuild rather than protect." }];
    return b; })() });
add({ r: "levator ani syndrome|pelvic floor dysfunction|pelvic floor \\(exercise\\)", label: "Pelvic floor dysfunction / levator ani syndrome",
  ...(() => { const b = A.siPelvis({ part: "pelvic floor",
      what: "Pelvic floor problems come in two opposite flavours, and they need opposite treatment: a floor that's too WEAK (leaking, prolapse symptoms) and a floor that's too TIGHT (pain, urgency, difficulty emptying, painful sex). Levator ani syndrome is the tight kind.",
      prog: "Getting which one you have right is the whole game — doing squeezes for an over-tight pelvic floor makes it worse, and it's a very common mistake.",
      restrict: "Do NOT default to Kegels. If your problem is PAIN, urgency, difficulty emptying or painful sex, the muscle is likely over-tight and squeezing it harder will worsen everything — the treatment is relaxation, breathing and release. If the problem is LEAKING, strengthening is right. A pelvic health physiotherapist can tell you which, and that assessment is worth more than any exercise list.",
      ph2: "Release or strengthen — whichever you actually need", goal2: "Follow the right path for your type: down-training and release, or progressive strengthening.",
      crit2: "symptoms improving on the correct pathway, better awareness and control of the muscle",
      restrict2: "Breathing drives the pelvic floor: it drops as you breathe in and lifts as you breathe out. That link is the most useful tool for a tight floor, and holding your breath is what keeps it clenched.", total: 16 });
    return b; })() });

/* ---------------- cervicogenic headache, text neck & postural syndromes ---------------- */
add({ r: "cervicogenic headache|cervicogenic cephalgia", label: "Cervicogenic headache",
  total: 12, freq: "Daily deep neck flexor work + 1–2 manual therapy sessions/week early on",
  note: "A cervicogenic headache is a headache generated by the NECK — the nerves from the top three neck segments and the nerve that supplies the head converge on the same relay station in the brainstem, so the brain genuinely cannot tell where the signal came from and reads neck pain as head pain. The tell is a one-sided headache that always starts at the back and spreads forward, is brought on by neck posture or movement, and never swaps sides.",
  variants: PACE,
  ph: [
    ["Confirm the pattern & settle", 0, 2,
     "Confirm this is coming from the neck, and settle the irritation.",
     "headache reproducible from the neck, frequency starting to fall, comfortable neck range",
     "The pattern matters: cervicogenic headaches are one-sided, always the same side, start at the back of the head and spread forward, and are provoked by neck position or movement. A headache that swaps sides, comes with nausea and light sensitivity, or throbs, is more likely migraine — and it needs different treatment. A sudden 'worst-ever' headache is an emergency."],
    ["Manual therapy & deep neck flexor training", 2, 6,
     "Combine manual therapy to the upper neck with deep neck flexor and scapular training — the combination is what works.",
     "headache frequency clearly down, deep neck flexor endurance improving, better upper-neck movement",
     "The evidence is strongest for manual therapy AND exercise together — either alone does noticeably less. The deep neck flexors (the ones that nod your head, not the ones that lift it) are the target, and they're trained with gentle endurance holds, not strong efforts."],
    ["Endurance, posture & ergonomics", 6, 9,
     "Build neck and shoulder-girdle endurance and fix the sustained postures that provoke it.",
     "sustained postures tolerated, headache infrequent, workstation sorted",
     "Sustained postures are the trigger, so endurance matters more than strength. Fix the workstation and the phone habit, or the headaches track the working week."],
    ["Prevention & long-term", 9, 12,
     "Keep the headaches away with a routine you'll actually keep.",
     "headaches rare, a maintenance routine, triggers managed",
     "This recurs if the neck endurance and the ergonomics slide. Watch for medication-overuse headache: painkillers on more than 10–15 days a month create a daily headache of their own."]] });
A.postural = (s) => ({
  total: 14, freq: "Short, frequent daily sessions — posture is an endurance problem, so little and often wins",
  note: `${s.what} ${s.prog}`,
  variants: PACE,
  ph: [
    ["Settle symptoms & build awareness", 0, 3,
     "Settle the irritated tissue and build awareness of the position through the day.",
     "symptoms settling, aware of the position, workstation and habits reviewed",
     `${s.restrict} There is no single 'correct' posture, and posture is a weaker cause of pain than it's usually given credit for — the best posture is genuinely the next one, so the real target is variety and endurance, not sitting up straight.`],
    ["Mobility where it's stiff", 3, 7,
     `Restore movement where it has actually stiffened — ${s.mob}.`,
     "better mobility in the stiff areas, more comfortable in the corrected position, less end-of-day ache",
     "Stretching the sore, overstretched muscles feels good for ten minutes and changes nothing — they're long and weak, not short. Mobilise what's genuinely stiff and strengthen what's genuinely weak."],
    ["Endurance strengthening", 7, 11,
     `Build endurance in ${s.strong}.`,
     "holding good positions for longer, less fatigue by the end of the day, clear strength gains",
     "Endurance is the target, not maximal strength — these muscles need to work quietly for eight hours, not lift heavy once. Frequent short sets beat occasional long ones."],
    ["Habit, ergonomics & long-term", 11, 14,
     "Make it a habit and fix the environment that created it.",
     "sustained comfort through a working day, workstation and habits adjusted, a routine you keep",
     "Movement breaks beat any chair: get up every 30–45 minutes. The best desk setup in the world still hurts if you don't move from it."]
  ]
});
add({ r: "text neck syndrome|text neck|tech neck", label: "Text neck syndrome",
  ...A.postural({
    what: "'Text neck' describes neck pain from long periods looking down at a phone or tablet.",
    prog: "The often-quoted figure that a bent head weighs 27kg is a modelling estimate that's been badly over-sold — necks are strong and adaptable, and this is not damaging your spine. What actually happens is simpler: holding any position for hours fatigues the muscles that hold it, and fatigued muscles ache.",
    restrict: "Your neck is not being destroyed by your phone — that claim isn't supported and the fear it causes does more harm than the posture. It's a load-duration problem: the fix is bringing the phone up, taking breaks, and building endurance.",
    mob: "the upper back, which is usually the genuinely stiff part",
    strong: "the deep neck flexors and the muscles between the shoulder blades" }) });
add({ r: "postural thoracic pain|postural cervical kyphosis|postural thoracic kyphosis|thoracic hyperkyphosis|postural kyphosis", label: "Postural thoracic pain / kyphosis",
  ...A.postural({
    what: "Postural thoracic pain is aching between the shoulder blades that builds through the day and eases when you move or lie down.",
    prog: "The key feature of a POSTURAL kyphosis is that it's flexible — you can straighten it up when you think about it, which means it can be changed. A fixed, rigid curve that won't straighten is a structural one (Scheuermann's or an osteoporotic curve) and behaves differently.",
    restrict: "Check whether the curve straightens when you lift your chest: if it does, this is postural and it responds well to exercise. If it's rigid and won't correct, that's structural and needs assessment — especially if you're older, when it may reflect vertebral fractures.",
    mob: "the thoracic spine into extension and rotation, and the front of the chest",
    strong: "the thoracic extensors and the lower trapezius and scapular muscles" }) });
add({ r: "upper-crossed syndrome|upper crossed syndrome", label: "Upper-crossed syndrome",
  ...A.postural({
    what: "'Upper-crossed syndrome' describes a familiar pattern: rounded shoulders, a forward head, a tight chest and upper traps, with weak deep neck flexors and weak lower shoulder-blade muscles.",
    prog: "It's a useful description of a common pattern rather than a diagnosis, and the pattern is not itself proof of anything — plenty of people have it without pain. Treat the symptoms and the capacity, not the shape.",
    restrict: "Having this pattern doesn't mean you're injured or that you must correct it — many people look like this and have no pain at all. Treat it if it's uncomfortable or limiting; don't treat a photograph.",
    mob: "the chest, the upper back and the shoulder girdle",
    strong: "the deep neck flexors and the lower and middle trapezius" }) });
add({ r: "lower-crossed syndrome|lower crossed syndrome|flatback syndrome|sagittal-imbalance|sagittal imbalance", label: "Lower-crossed / sagittal-alignment syndromes",
  ...(() => { const b = A.postural({
      what: "These describe patterns in how the pelvis and lumbar spine sit: an increased arch with tight hip flexors and weak glutes and abdominals (lower-crossed), or the opposite — a flattened lumbar curve that leaves you leaning forwards (flatback and sagittal imbalance).",
      prog: "Mild versions are common, changeable and often painless. But a genuine, fixed sagittal imbalance — where you cannot stand upright without bending your knees, and you tire badly just standing — is a structural problem that often follows spinal fusion, and it needs specialist assessment rather than exercises.",
      restrict: "If you physically CANNOT stand up straight without bending your knees, and standing exhausts you, that's a fixed sagittal imbalance and it needs a spinal surgical opinion — exercise won't correct it. If the posture is flexible and correctable, this plan applies.",
      mob: "the hip flexors, and the lumbar spine in whichever direction it's actually stiff",
      strong: "the glutes, the abdominals and the spinal extensors" });
    return b; })() });
add({ r: "cervicothoracic junction dysfunction|thoracolumbar junction syndrome|maigne syndrome", label: "Junctional spine dysfunction (cervicothoracic / thoracolumbar)",
  ...(() => { const b = A.postural({
      what: "The junctions — where the neck meets the upper back, and where the ribcage meets the lower back — are transition zones where a mobile part of the spine meets a stiff one, so they take concentrated stress.",
      prog: "Maigne syndrome is the classic example and a genuinely useful one to know: irritation at the thoracolumbar junction refers pain DOWNWARD into the buttock, groin and outer hip — so people get treated for months for hip or back pain while the actual source sits several levels higher and is never examined.",
      restrict: "Pain is often felt a long way from the source at these junctions: thoracolumbar irritation refers to the buttock, groin and outer hip, and cervicothoracic irritation refers to the shoulder blade and outer arm. If treatment aimed at where it hurts hasn't worked, the source may simply be somewhere else.",
      mob: "the junction itself and the stiff region next to it — usually the thoracic spine or the ribs",
      strong: "the deep trunk and scapular muscles that control the junction" });
    return b; })() });
add({ r: "levator scapulae syndrome", label: "Levator scapulae syndrome",
  ...(() => { const b = A.postural({
      what: "The levator scapulae runs from the top of the shoulder blade to the upper neck, and it aches at that top inner corner of the shoulder blade — a very recognisable, very specific spot people can point to with one finger.",
      prog: "It's almost always a symptom rather than a cause: it overworks when the shoulder blade isn't supported by the lower trapezius and serratus anterior, so treating the trigger point alone gives relief that lasts days, while training the scapular support lasts.",
      restrict: "Massage and trigger-point work here feel wonderful and wear off, because the muscle is overworking for a reason. Carrying a heavy bag on that shoulder, cradling a phone against your ear, and a screen set too low are the usual reasons — fix those first.",
      mob: "the neck and the upper back",
      strong: "the lower trapezius and serratus anterior, so the levator doesn't have to hold the shoulder blade up on its own" });
    return b; })() });
add({ r: "serratus anterior dysfunction", label: "Serratus anterior dysfunction",
  ...(() => { const b = A.postural({
      what: "The serratus anterior holds the shoulder blade flat against the ribs and rotates it upward so the arm can reach overhead. When it doesn't work, the shoulder blade wings off the ribcage and overhead reach becomes weak and painful.",
      prog: "There are two very different causes and they need separating: a NERVE palsy (the long thoracic nerve), which causes obvious winging and recovers slowly over 6–18 months, or simple weakness and poor control, which responds quickly to training.",
      restrict: "If the shoulder blade wings dramatically and the muscle is genuinely paralysed, this is a long thoracic nerve palsy — recovery takes 6–18 months, it's usually good, and heavy overhead loading should wait until the winging settles. Pushing hard overhead against a winging scapula just irritates the shoulder.",
      mob: "the thoracic spine, which the shoulder blade has to slide on",
      strong: "the serratus anterior itself — protraction and upward rotation, worked in the mid-range before overhead" });
    return b; })() });
add({ r: "lumbar multifidus dysfunction|cervical deep-flexor dysfunction|deep-flexor dysfunction", label: "Deep spinal stabiliser dysfunction",
  ...(() => { const b = A.postural({
      what: "The deep stabilisers — multifidus in the low back, the deep neck flexors in the neck — switch off and waste after an episode of spinal pain, and they don't automatically switch back on when the pain goes.",
      prog: "That's a real, measurable phenomenon. But the old idea that you must 'switch on your core' before doing anything else has not held up: specific stabiliser training is no better than general exercise for most people. It's useful, it isn't magic, and general strength and activity matter more.",
      restrict: "You do not need to brace your core to move safely, and you don't have to master a specific activation before you're allowed to exercise — that idea made a lot of people fearful of their own spines. Gentle specific work is a reasonable start; general strengthening and activity are what actually change outcomes.",
      mob: "whichever part of the spine or hips is genuinely stiff",
      strong: "the deep stabilisers early, then general trunk and hip strength — which is where the real benefit is" });
    return b; })() });

/* ---------------- ribs & chest wall ---------------- */
add({ r: "rib dysfunction|costotransverse joint dysfunction|costovertebral (joint )?dysfunction|rib (joint )?(sprain|dysfunction)", label: "Rib dysfunction",
  total: 10, freq: "Daily breathing and mobility work + strength as it settles",
  note: "Each rib forms small joints with the spine, and those joints can become irritated — typically after an awkward twist, a heavy lift, a bout of coughing, or a night in a bad position. The classic picture is a sharp, well-localised catch beside the spine or under the shoulder blade, made worse by a deep breath, a cough, or twisting.",
  variants: PACE,
  ph: [
    ["Settle the joint & keep breathing deeply", 0, 2,
     "Calm the irritated joint while making sure you keep breathing fully.",
     "less catching with breathing, comfortable at night, breathing deeply without guarding",
     "Keep taking deep breaths even though it catches — splinting your breathing to avoid the pain is how people end up with a chest infection, and that's a far bigger problem than the rib. Chest pain with breathlessness, palpitations, coughing blood, or a heavy central pressure is NOT a rib joint — that's an emergency."],
    ["Restore rib & thoracic movement", 2, 5,
     "Restore movement through the ribs and the thoracic spine.",
     "full comfortable rotation and side-bending, deep breath without a catch",
     "The ribs move with the thoracic spine, so mobilising the spine and rotation is what frees them. Manual therapy often gives quick relief here and is worth combining with the exercise."],
    ["Strength & load tolerance", 5, 8,
     "Rebuild strength through the trunk and shoulder girdle.",
     "clear strength gains, lifting and twisting comfortably, no catching",
     "Build back into rotation and lifting gradually — those are what provoked it."],
    ["Return to full activity", 8, 10,
     "Return to full activity, including sport and lifting.",
     "back to your normal activity without catching, a maintenance routine",
     "Recurrence is common if the thoracic spine stays stiff and the trunk stays weak. If it keeps recurring in the same spot, get it looked at properly — persistent, unchanging rib pain occasionally has another cause."]] });
add({ r: "costochondritis|tietze", label: "Costochondritis",
  total: 12, freq: "Gentle daily mobility; avoid the aggravating loads early",
  note: "Costochondritis is inflammation where the ribs meet the breastbone. It causes sharp, localised front-of-chest pain that's tender to press and worse with deep breaths, coughing and twisting — and because it's chest pain, it's frightening. The reassuring part is that it's harmless and self-limiting; the tenderness to touch is what distinguishes it, since heart pain doesn't reproduce when you press on it.",
  variants: PACE,
  ph: [
    ["Exclude the serious causes & settle", 0, 3,
     "Make sure this is what it is, then settle the irritation.",
     "serious causes excluded, pain settling, breathing deeply without splinting",
     "Get chest pain assessed properly the first time rather than assuming — costochondritis is a diagnosis made after the dangerous causes are excluded. Seek EMERGENCY help for chest pain with breathlessness, sweating, nausea, pain spreading to the jaw or arm, palpitations, or coughing blood. Costochondritis is tender when you press the spot; heart pain isn't."],
    ["Gentle mobility & breathing", 3, 7,
     "Keep the ribcage and thoracic spine moving and breathe fully.",
     "less pain with deep breathing, better thoracic rotation, sleeping better",
     "Avoid heavy pressing, push-ups and chest work while it's irritable, but keep breathing deeply and keep the spine moving. Guarding your breathing prolongs it."],
    ["Graded return to loading", 7, 10,
     "Reintroduce upper-body loading gradually.",
     "tolerating pressing and pulling, comfortable with daily tasks",
     "Rebuild pressing and lifting in small steps. It can take several months to fully settle, and that's normal for this rather than a sign of anything sinister."],
    ["Return to full activity", 10, 12,
     "Return to full training and activity.",
     "back to full activity, chest comfortable under load",
     "It commonly recurs and remains harmless when it does. Sudden increases in upper-body training and prolonged coughing are the usual triggers."]] });

/* ---------------- scoliosis ---------------- */
/* Task rule respected: curve-SPECIFIC exercise (PSSE — Schroth, SEAS, BSPTS),
   not generic core work. Generic core strengthening does not change a curve. */
A.scoliosis = (s) => retime({
  total: 26, freq: "Curve-specific exercises 4–5×/week — this is a skill programme, and consistency is everything",
  note: `${s.what} ${s.prog} The exercise that works for scoliosis is curve-SPECIFIC (the PSSE family — Schroth, SEAS, BSPTS): three-dimensional self-correction with specific breathing into the collapsed side, taught by a trained therapist and held with active control. Generic core strengthening, Pilates and general exercise are good for you and do not change a curve — that distinction is the whole point.`,
  variants: PACE,
  ph: [
    ["Assess the curve & learn self-correction", 0, 5,
     "Get the curve properly measured and learn the three-dimensional self-correction for YOUR curve pattern.",
     "curve measured and pattern identified, able to find the self-corrected position, understanding the plan",
     `${s.restrict} Generic core exercise, swimming and Pilates are all good for general health but none of them change a curve — only curve-specific exercise, and bracing where indicated, do that. Getting the curve pattern identified is what makes the exercise specific, so this phase can't be skipped.`],
    ["Build the correction & the breathing", 5, 12,
     "Build the self-corrected posture with the specific rotational breathing that expands the collapsed side.",
     "holding the correction with control, rotational breathing working, correction becoming familiar",
     "The rotational breathing is not a relaxation exercise — it's actively de-rotating the ribcage from the inside, and it's the part that makes this different from ordinary exercise. It needs teaching properly; videos rarely get it across."],
    ["Endurance & carry it into daily life", 12, 20,
     "Build endurance in the corrected position and carry it into everyday activities.",
     "correction held during daily tasks, better endurance, posture improving in daily life",
     `Carrying the correction into daily life is where the benefit actually lives — an exercise done well for 20 minutes and abandoned for the other 15 hours changes little.${s.brace}`],
    ["Long-term maintenance & monitoring", 20, 26,
     "Keep it going and stay monitored.",
     "a sustained routine, curve stable on review, good trunk strength and endurance",
     s.monitor]
  ]
}, s.total);
add({ r: "adolescent idiopathic scoliosis|scoliosis \\(conservative management\\)|idiopathic scoliosis \\(conservative\\)|scoliosis \\(conservative", label: "Adolescent idiopathic scoliosis (conservative)",
  ...A.scoliosis({
    what: "Adolescent idiopathic scoliosis is a three-dimensional twist of the spine — it bends sideways AND rotates, which is why one side of the ribcage becomes prominent and why a flat, two-dimensional 'straighten up' does nothing.",
    prog: "In a growing child, the risk of the curve progressing depends on how much growth is left and how big the curve already is — which is why monitoring during growth spurts matters so much, and why the same curve is treated urgently at 12 and watched at 17.",
    restrict: "Growth is the driver: curves progress fastest during the adolescent growth spurt, so regular monitoring through that window is the single most important thing. Bracing has strong evidence for preventing progression in a growing spine with a curve of roughly 20–40 degrees — it is not old-fashioned, it works, and refusing it can mean surgery later.",
    brace: " If you have a brace, wear-time is what determines whether it works — the effect is dose-dependent and the evidence is unambiguous. Exercise complements the brace; it does not replace it.",
    monitor: "Keep monitoring until growth finishes — that's when the risk of progression ends. Curves beyond about 45–50 degrees in a growing child usually need a surgical opinion, and reaching that point isn't a failure of exercise; some curves progress regardless.", total: 26 }) });
add({ r: "adult idiopathic scoliosis|adult degenerative scoliosis|degenerative scoliosis|adult scoliosis", label: "Adult scoliosis (conservative)",
  ...A.scoliosis({
    what: "Adult scoliosis is either a childhood curve grown up, or a new curve from asymmetrical wear of the discs and facet joints as they degenerate.",
    prog: "Adults are a genuinely different problem from adolescents: the goal is not to change the curve — in a mature skeleton it barely can be — but to reduce pain, keep you upright, and maintain walking distance and function. Adult curves progress slowly, roughly a degree a year, and pain correlates poorly with how big the curve looks.",
    restrict: "The size of the curve on your scan predicts your symptoms poorly — plenty of large adult curves are painless, and plenty of small ones hurt. So treat the symptoms and the function, not the X-ray. In adults the aim is management, not correction.",
    brace: " Bracing in adults is used for symptom relief rather than to change the curve, and long-term use can weaken the trunk muscles — so use it selectively.",
    monitor: "Watch for stenosis symptoms — leg pain and heaviness on walking that eases when you sit — which are common in degenerative scoliosis and treatable in their own right. Keep bone health under review: osteoporosis and scoliosis together accelerate each other.", total: 24 }) });
add({ r: "back pain in the young athlete|young athlete'?s back|adolescent back pain", label: "Back pain in the young athlete",
  total: 14, freq: "Daily trunk work; avoid extension loading until cleared",
  note: "Back pain in a growing athlete is treated differently from back pain in an adult, and the reason is important: in adults, back pain is usually non-specific and benign, but in an adolescent athlete a stress fracture of the pars (spondylolysis) is genuinely common — especially in sports that repeatedly arch and twist the back, like gymnastics, cricket bowling, tennis and diving. Persistent back pain in a young athlete deserves a proper diagnosis rather than reassurance.",
  variants: PACE,
  ph: [
    ["Get a diagnosis — don't just rest it", 0, 3,
     "Get it properly assessed, because the diagnosis genuinely changes the treatment.",
     "properly assessed, imaging if extension-related pain persists, a clear diagnosis",
     "Persistent back pain in a young athlete — especially one-sided pain made worse by arching backwards — needs imaging rather than reassurance: a pars stress fracture caught early heals, and one missed becomes a long-term problem. Red flags needing urgent review: night pain that wakes them, fever, weight loss, or any neurological symptoms."],
    ["Relative rest from the aggravator & trunk work", 3, 7,
     "Stop the loading that causes it and build trunk control in a neutral position.",
     "pain settling, trunk endurance improving, comfortable in daily activity",
     "AVOID repeated or loaded spinal EXTENSION and rotation — that's what stresses the pars. This means a genuine break from the aggravating sport skill, not just 'taking it easier', and that conversation with the coach needs having."],
    ["Progressive loading & movement quality", 7, 11,
     "Rebuild loading gradually, and fix the movement pattern that overloaded the back.",
     "tolerating progressive loading, hip and thoracic mobility improved, technique addressed",
     "Stiff hips and a stiff thoracic spine force the low back to do their movement — that's usually the underlying reason, and fixing it is what prevents recurrence."],
    ["Graded return to sport", 11, 14,
     "Return to sport in graded steps, with the training load managed.",
     "pain-free with sport-specific loading, technique adjusted, training load sensible",
     "Return gradually and watch the total load — early sport specialisation and year-round training in one sport are the biggest risk factors for this. Playing a second sport, or having an off-season, is genuinely protective."]] });
add({ r: "baastrup|kissing spine|symptomatic schmorl'?s node|modic endplate|bertolotti", label: "Named lumbar structural variants (Baastrup's / Schmorl's node / Modic / Bertolotti)",
  total: 16, freq: "Daily flexion-biased mobility + progressive strength 3×/week",
  note: "These are named findings on a scan — touching spinous processes (Baastrup's), a disc pressing into the vertebral bone (a Schmorl's node), inflammatory endplate changes (Modic), or an extra-large transverse process forming a false joint with the pelvis (Bertolotti's). The crucial context: all of them are found frequently in people with NO pain at all, so a scan report naming one does not establish that it's the cause of yours.",
  variants: PACE,
  ph: [
    ["Put the scan in perspective & settle", 0, 4,
     "Understand what the finding means, and settle the symptoms.",
     "symptoms settling, a realistic understanding of the scan, moving with less guarding",
     "A named finding on a report is not a diagnosis and not a life sentence — these appear in large numbers of pain-free people, and being told you have one is itself a risk factor for staying disabled. Treat the pain and the function, not the report."],
    ["Restore movement", 4, 8,
     "Restore comfortable spinal and hip movement, biased away from whatever provokes you.",
     "comfortable range, daily tasks without a flare, less guarding",
     "Baastrup's and Bertolotti's are typically provoked by EXTENSION — arching back and standing for long periods — so a flexion bias usually eases them. Work out your own direction of ease and use it."],
    ["Progressive strengthening", 8, 13,
     "Build trunk, hip and leg strength — the thing that most reliably changes back symptoms.",
     "clear strength gains, tolerating loading, activity increasing",
     "Progressive loading is safe and protective for all of these. Your spine is robust, and these findings do not make it fragile."],
    ["Return to full activity", 13, 16,
     "Return to full activity with a maintenance routine.",
     "back to your activities, a routine you'll keep, symptoms manageable",
     "If symptoms genuinely localise to one of these structures and don't settle with good rehab, targeted injection can confirm the source — that's the point at which the scan finding becomes useful, and not before."]] });

/* ---------------- REPAIRED muscle tears ---------------- */
/* The whole point of this family: a repaired tear is NOT a strain. A strain is
   torn tissue healing itself, and it can be loaded early. A repair is torn tissue
   held together by stitches until it knits — so the early phase protects, and the
   generic "Muscle strain" archetype would give dangerously early loading advice.
   NB: hamstring and rotator-cuff post-repair names are deliberately ABSENT — the
   curated "Hamstring strain" and "Rotator cuff / subacromial pain" plans in app.js
   already own those names, and duplicating them here would shadow them. */
const REPAIR_VARIANTS = [
  { k: "standard", label: "Standard repair", sub: "Repaired soon after the tear", scale: 1 },
  { k: "acute", label: "Early (acute) repair", sub: "Repaired within days of the injury", pick: "acute|early", scale: 0.9,
    note: "Repaired early, the tissue ends were still healthy and close together — that's the best starting point and it usually means a smoother, slightly quicker rehab." },
  { k: "chronic", label: "Delayed / retracted repair", sub: "Repaired weeks or months later", pick: "chronic|delayed|retracted|neglected", scale: 1.35,
    note: "When a tear is repaired late the muscle has already shortened and scarred, so the repair is under more tension and needs longer protection. Expect a slower timeline and a slightly lower ceiling — that's the biology, not your effort." },
  { k: "revision", label: "Revision / re-repair", sub: "After a failed first repair", pick: "revision|re-?repair|re-?rupture|failed", scale: 1.45,
    note: "A re-repair is protected for longer, because the tissue has already failed once and the surgeon is working with less to hold onto. This is the pathway where rushing costs the most." }
];
A.repairedTear = (s) => retime({
  total: 24,
  freq: "Little and often — several short sessions daily early, then strength work 3–4×/week",
  note: `Your ${s.part} muscle was torn and surgically REPAIRED. That is a genuinely different problem from a strain, and the difference drives this whole plan: a strain is torn tissue healing itself and can be loaded early, whereas a repair is torn tissue held together by stitches until the tissue itself knits. Until that happens the stitches are the only thing holding it — so the early weeks protect, and loading comes later than instinct suggests.`,
  variants: REPAIR_VARIANTS,
  ph: [
    ["Surgical protection — the repair holds, you don't test it", 0, 3,
     `Protect the repair, control swelling, and keep everything AROUND the ${s.part} moving.`,
     "wound healing cleanly, swelling settling, comfortable at rest, moving the joints either side",
     `Follow your surgeon's sling, brace and weight-bearing instructions EXACTLY — they exist because of what the repair can and can't take. Do NOT actively contract the repaired muscle and do NOT stretch it: both pull straight on the repair, and that's how re-ruptures happen. Keep the neighbouring joints moving so you don't create a stiffness problem on top.${s.extra ? " " + s.extra : ""} Get urgent review for a wound that's hot, red, leaking or increasingly painful, or a calf that becomes swollen and tender.`],
    ["Protected movement & gentle activation", 3, 8,
     `Restore range within your surgeon's limits, and start switching the ${s.part} back on gently.`,
     "range progressing within the allowed limits, a gentle contraction without pain, walking or using it normally for light daily tasks",
     "Passive and assisted movement first, then gentle active movement without resistance. A sudden pop, a sharp giving-way, or a visible change in the muscle's shape means stop and get reviewed — that's the pattern of a re-rupture. No stretching into the repair yet."],
    ["Progressive strengthening", 8, 16,
     `Rebuild strength through the ${s.part}'s range, progressing load steadily.`,
     "strength clearly improving, full comfortable range, daily activities easy, no swelling after loading",
     "Now load it — progressively, and from the middle of the range outward. This is where the muscle actually rebuilds, and under-loading here is the commonest reason people are left permanently weak. Add eccentric (lowering) work only once your clinician clears it: it builds the most strength and puts the most stress on a repair."],
    ["Return to full loading & sport", 16, 24,
     "Restore full strength and power, and return to sport or heavy work.",
     "strength within about 10% of the other side, full range, sport-specific work without a next-day reaction, clinician clearance",
     `Full return typically takes 4–6 months, and going early is the main cause of re-rupture. Strength symmetry matters more than the date — get it measured rather than guessed.${s.rts ? " " + s.rts : ""}`]
  ]
}, s.total);
/*  label, muscle regex (escaped), plain-language part, site-specific restriction, total  */
const REPAIRED_TEARS = [
  /* --- neck --- */
  ["Sternocleidomastoid tear (post-repair)", "sternocleidomastoid", "neck", "Avoid end-range neck rotation and side-bending away from the repair — that's the direction that stretches it.", 18],
  ["Scalene tear (post-repair)", "scalene", "side of the neck", "The nerves and vessels to the arm pass between the scalenes, so report any new arm numbness, tingling or heaviness rather than working through it.", 18],
  ["Splenius capitis tear (post-repair)", "splenius capitis", "back of the neck", "Avoid end-range neck flexion, which stretches the repair, and support the head when lying down.", 18],
  /* --- shoulder girdle --- */
  ["Trapezius tear (post-repair)", "trapezius", "upper back and neck", "Avoid shrugging, carrying and overhead reaching. Support the arm — its weight hangs directly on a repaired trapezius.", 22],
  ["Rhomboid tear (post-repair)", "rhomboid", "area between the shoulder blades", "Avoid rowing, pulling and reaching forward across the body, which all load the repair. Support the arm early.", 22],
  ["Subscapularis tear (post-repair)", "subscapularis", "front of the shoulder (rotator cuff)", "This is a ROTATOR CUFF repair, so the cuff rules apply: no active internal rotation, and — critically — no passive EXTERNAL rotation past your surgeon's limit, because that stretches the repair directly. Do not push the arm backwards, and don't reach behind your back or tuck in a shirt.", 26],
  ["Teres minor tear (post-repair)", "teres minor", "back of the shoulder (rotator cuff)", "This is a ROTATOR CUFF repair: sling as directed, no active external rotation, and no lifting anything with the arm for the first 6 weeks — including a kettle or a door.", 26],
  ["Anterior deltoid tear (post-repair)", "anterior deltoid", "front of the shoulder", "Avoid lifting the arm forwards actively and avoid pushing. Don't let the arm hang unsupported — its weight pulls on the repair.", 24],
  ["Posterior deltoid tear (post-repair)", "posterior deltoid", "back of the shoulder", "Avoid pulling the arm backwards actively and avoid reaching across the body, which stretches the repair.", 24],
  ["Serratus anterior tear (post-repair)", "serratus anterior", "side of the chest", "Avoid pushing and overhead reaching. The shoulder blade may wing while this heals — that's expected, and forcing overhead work against it just irritates the shoulder.", 24],
  /* --- arm & forearm --- */
  ["Coracobrachialis tear (post-repair)", "coracobrachialis", "upper arm", "Avoid lifting the arm forwards and avoid resisted elbow bending early on.", 22],
  ["Brachialis tear (post-repair)", "brachialis", "front of the upper arm", "Avoid resisted elbow bending and avoid letting the elbow straighten fully under load — both pull on the repair. Watch for stiffness: the elbow stiffens faster than almost any other joint, and getting it back is hard.", 22],
  ["Brachioradialis tear (post-repair)", "brachioradialis", "forearm", "Avoid resisted elbow bending and forceful forearm twisting. Elbow stiffness is the complication to watch for.", 20],
  ["Forearm tear (post-repair)", "forearm", "forearm", "Avoid gripping, lifting and forceful forearm rotation. Keep the fingers, wrist and elbow moving unless your surgeon says otherwise — stiffness here costs hand function.", 22],
  ["Wrist flexor group tear (post-repair)", "wrist flexor group", "front of the forearm", "Avoid gripping and resisted wrist bending. Keep the fingers moving to prevent them stiffening — a stiff hand is a bigger problem than a weak wrist.", 20],
  ["Wrist extensor group tear (post-repair)", "wrist extensor group", "back of the forearm", "Avoid resisted wrist extension and gripping — gripping strongly loads the wrist extensors even though it feels like a hand action.", 20],
  ["Flexor digitorum tear (post-repair)", "flexor digitorum", "forearm and hand", "If this was a hand FLEXOR TENDON repair rather than a forearm muscle repair, the protocol is stricter and quite specific — early controlled motion under a hand therapist, with a real risk of rupture if you grip. Check which you had, because it changes everything. Keep the fingers moving exactly as instructed: stiffness and rupture are opposite risks here and the protocol threads between them.", 22],
  ["Extensor digitorum tear (post-repair)", "extensor digitorum", "back of the forearm and hand", "If this was a hand EXTENSOR TENDON repair, follow the hand therapist's splinting protocol exactly — the fingers must be held straight for the tendon to heal, and one hard grip can undo it.", 22],
  /* --- trunk --- */
  ["Rectus abdominis tear (post-repair)", "rectus abdominis", "front of the abdomen", "Avoid sit-ups, crunches, straining and heavy lifting. Log-roll to get in and out of bed rather than sitting straight up, and support the abdomen with a pillow when you cough or sneeze.", 22],
  ["Abdominal (oblique) tear (post-repair)", "abdominal \\(oblique\\)", "side of the abdomen", "Avoid twisting, side-bending and sit-ups — rotation is exactly what the obliques do and exactly what pulls the repair apart. Support the abdomen when coughing.", 22],
  ["Transversus abdominis tear (post-repair)", "transversus abdominis", "deep abdominal wall", "Avoid straining, heavy lifting and anything that pushes the abdomen outward. Breathe OUT on effort rather than holding your breath, and treat constipation — straining is a direct load on the repair.", 22],
  ["Erector spinae tear (post-repair)", "erector spinae", "back", "Avoid bending forwards, lifting and twisting. Log-roll in and out of bed. Walking little and often is the best early exercise; prolonged sitting is usually the least comfortable.", 24],
  ["Quadratus lumborum tear (post-repair)", "quadratus lumborum", "side of the lower back", "Avoid side-bending, twisting and carrying anything one-handed — a single heavy shopping bag loads the QL directly.", 22],
  ["Intercostal tear (post-repair)", "intercostal", "ribcage", "Keep breathing DEEPLY even though it's uncomfortable — splinting your breathing risks a chest infection, which is a far bigger problem than the repair. Support the ribs with a pillow when you cough. Avoid twisting and lifting.", 18],
  /* --- hip & groin --- */
  ["Hip flexor tear (post-repair)", "hip flexor", "front of the hip", "Avoid actively lifting the knee toward the chest and avoid stretching the hip backwards — both pull on the repair. Getting in and out of a car and climbing stairs are the awkward ones; lead with the other leg.", 24],
  ["Psoas major tear (post-repair)", "psoas major", "front of the hip and deep abdomen", "Avoid actively lifting the knee and avoid extending the hip backwards. Sitting up from lying uses the psoas hard — log-roll instead.", 24],
  ["Iliacus tear (post-repair)", "iliacus", "front of the hip", "Avoid actively lifting the knee toward the chest, and avoid stretching the hip into extension.", 24],
  ["Gluteal tear (post-repair)", "gluteal", "buttock", "Avoid crossing your legs, lying on that side, and single-leg loading. A high seat helps — rising from a low chair loads a repaired gluteal hard. Follow your surgeon's weight-bearing limits exactly.", 26],
  ["Gluteus maximus tear (post-repair)", "gluteus maximus", "buttock", "Avoid stairs, hills, rising from low seats and deep squatting — those all load the gluteus maximus heavily. Use a high chair.", 26],
  ["Gluteus minimus tear (post-repair)", "gluteus minimus", "outer hip", "Avoid lying on that side, crossing your legs, and standing on that leg alone. Sleep with a pillow between your knees to keep the repair off tension.", 26],
  ["Tensor fasciae latae tear (post-repair)", "tensor fasciae latae", "outer hip", "Avoid lying on that side and avoid crossing your legs, which puts the repair on stretch.", 22],
  ["Piriformis tear (post-repair)", "piriformis", "deep in the buttock", "The sciatic nerve runs right beside the piriformis, so report new leg numbness, tingling or weakness rather than pushing on. Avoid prolonged sitting and turning the leg outward against resistance.", 22],
  ["Groin (adductor) tear (post-repair)", "groin \\(adductor\\)", "groin", "Avoid squeezing the legs together, avoid stretching them apart, and take care getting in and out of the car — that movement is exactly what pulls on an adductor repair. A pillow between the knees helps at night.", 24],
  ["Adductor longus tear (post-repair)", "adductor longus", "groin", "Avoid squeezing the legs together and avoid any stretch into the splits direction. Getting out of a car is the classic moment it hurts — swing both legs together.", 24],
  ["Adductor magnus tear (post-repair)", "adductor magnus", "inner thigh", "Avoid squeezing the legs together and avoid wide-legged positions. Keep the knees together getting in and out of the car and bed.", 24],
  ["Gracilis tear (post-repair)", "gracilis", "inner thigh", "Avoid squeezing the legs together and avoid stretching the inner thigh. The gracilis crosses both the hip and the knee, so avoid combining a straight knee with a wide leg position.", 22],
  ["Pectineus tear (post-repair)", "pectineus", "groin", "Avoid squeezing the legs together and avoid actively lifting the knee, since the pectineus does both.", 22],
  /* --- thigh & knee --- */
  ["Quadriceps tear (post-repair)", "quadriceps", "thigh", "Follow your brace and weight-bearing instructions exactly — a repaired quadriceps usually means a brace locked straight for walking, because a bent knee under load pulls directly on the repair. Do NOT actively straighten the knee against resistance, and do not let the knee bend beyond your surgeon's limit. Stairs and getting out of low chairs are the risky moments.", 26],
  ["Vastus medialis tear (post-repair)", "vastus medialis", "inner thigh", "Avoid resisted knee straightening and avoid bending the knee past your surgeon's limit — both load the repair.", 24],
  ["Vastus lateralis tear (post-repair)", "vastus lateralis", "outer thigh", "Avoid resisted knee straightening and deep knee bending while the repair heals.", 24],
  ["Vastus intermedius tear (post-repair)", "vastus intermedius", "front of the thigh", "Avoid resisted knee straightening and deep knee bending. Expect this one to stiffen — it sits deep against the bone, so scarring can limit knee bend.", 24],
  ["Sartorius tear (post-repair)", "sartorius", "front of the thigh", "The sartorius crosses both hip and knee, so avoid combining hip extension with knee straightening — and avoid the cross-legged position it's named for.", 22],
  ["Semimembranosus tear (post-repair)", "semimembranosus", "back of the thigh", "Avoid bending forwards with a straight leg, and avoid resisted knee bending. Sitting on a hard seat presses directly on the repair — use a cushion.", 26],
  ["Semitendinosus tear (post-repair)", "semitendinosus", "back of the thigh", "Avoid stretching into a straight-leg bend forwards, and avoid resisted knee bending. No aggressive hamstring stretching at all in the early phase.", 26],
  ["Popliteus tear (post-repair)", "popliteus", "back of the knee", "Avoid twisting on a bent knee and avoid full knee straightening under load while it heals — the popliteus unlocks the knee, so rotation is its job and its risk.", 22],
  /* --- lower leg --- */
  ["Calf (gastrocnemius) tear (post-repair)", "calf \\(gastrocnemius\\)", "calf", "Follow your boot and heel-wedge instructions exactly, and do NOT stretch the calf — pushing the toes up towards you pulls straight on the repair. Watch for a swollen, hot, tender calf: a clot is a real risk after calf surgery and needs same-day assessment.", 24],
  ["Soleus tear (post-repair)", "soleus", "deep calf", "Do NOT stretch the calf, especially with the knee bent — that's the position that loads the soleus. Follow your boot and weight-bearing instructions, and watch for signs of a clot.", 24],
  ["Plantaris tear (post-repair)", "plantaris", "calf", "Avoid calf stretching while it heals. The plantaris is a small, expendable muscle, so this usually recovers well and comparatively quickly.", 16],
  ["Tibialis anterior tear (post-repair)", "tibialis anterior", "front of the shin", "Avoid resisted lifting of the foot and avoid letting the foot drop into a stretch. You may catch your toes while this is weak — that's a trip risk worth taking seriously.", 22],
  ["Tibialis posterior tear (post-repair)", "tibialis posterior", "inner ankle", "Follow your boot and weight-bearing instructions exactly. The tibialis posterior holds up the arch of the foot, so a failed repair means a flattening foot — this is one to protect properly rather than rush.", 26],
  ["Fibularis longus tear (post-repair)", "fibularis longus", "outer lower leg", "Avoid turning the sole of the foot inward, which stretches the repair, and avoid resisted turning outward. The fibularis muscles protect against ankle sprains, so be careful on uneven ground while it's weak.", 22],
  ["Fibularis brevis tear (post-repair)", "fibularis brevis", "outer lower leg", "Avoid turning the sole of the foot inward and avoid resisted eversion. Uneven ground is a sprain risk while this is weak.", 22]
];
REPAIRED_TEARS.forEach(([label, mr, part, extra, total]) => add({
  r: `${mr} tear \\(post-repair\\)|${mr} (tear|rupture) repair`,
  label, ...A.repairedTear({ label, part, extra, total })
}));

/* Plantaris RUPTURE (not repaired) — famously benign and often mistaken for a clot. */
add({ r: "plantaris rupture", label: "Plantaris rupture",
  ...(() => { const b = A.strain({ label: "Plantaris rupture", part: "calf", extra: "" });
    b.total = 8; b.ph = b.ph.map((f, i) => [f[0], [0, 1, 3, 5][i], [1, 3, 5, 8][i], f[3], f[4], f[5]]);
    b.note = "The plantaris is a small, largely expendable muscle in the calf. Rupturing it feels dramatic — a sudden snap at the back of the calf, as if you'd been kicked or shot — but it's genuinely harmless and it recovers fully without any treatment. It's mostly worth knowing about because of what it mimics.";
    b.ph[0][5] = "The important thing here is what else this can be: a swollen, hot, tender calf can be a BLOOD CLOT (DVT), and a sudden snap with an inability to push off can be an Achilles rupture. Both need same-day assessment, so get the diagnosis confirmed rather than assuming. Once it's confirmed as plantaris, you can be entirely reassured.";
    b.ph[3][5] = "Full recovery is the norm within a couple of months, with no lasting weakness — the muscle isn't needed. Rebuild calf loading gradually and get back to normal.";
    return b; })() });

/* ---------------- tendon repairs & avulsions ---------------- */
/* Anchored to avoid the curated plans: `patellar tendon (repair|rupture)` cannot
   match "patellar tendinopathy", and `quadriceps tendon (repair|rupture)` cannot
   match "quadriceps tendinopathy" — both of those are owned by the curated
   "Patellar tendinopathy (jumper's knee)" plan. */
A.tendonRepair = (s) => retime({
  total: 26, freq: "Daily range work early (stiffness is the enemy), then progressive strengthening 3–4×/week",
  note: `${s.what} A repaired tendon is protected for far longer than a strain, because tendon knits slowly and the repair carries your whole body weight through it once you're up. ${s.prog}`,
  variants: REPAIR_VARIANTS,
  ph: [
    ["Protect the repair", 0, 6,
     "Protect the repair completely while it knits, and control swelling.",
     "wound healed, swelling settling, following the brace and weight-bearing rules, no extensor lag developing",
     `Follow your brace and weight-bearing instructions to the letter — this is the phase where the repair is at its weakest and where re-ruptures happen. ${s.protect}`],
    ["Protected range & gentle activation", 6, 12,
     "Regain range within your surgeon's limits and start switching the muscle on gently.",
     "range progressing to the allowed limit, a gentle contraction with no lag, walking in the brace comfortably",
     `Range first, then load. ${s.mid} Report any sudden give-way, pop or change in shape immediately — that's how a re-rupture presents.`],
    ["Progressive strengthening", 12, 19,
     "Build strength progressively through range as the repair matures.",
     "full range, clear strength gains, out of the brace, walking normally",
     "The tendon keeps getting stronger for a year or more, so keep loading it steadily. Under-loading now leaves lasting weakness, which is the commonest bad outcome of these repairs — more common than re-rupture."],
    ["Return to full activity & sport", 19, 26,
     "Restore full strength and power, and return to sport or heavy work.",
     "strength within about 10% of the other side, full range, hopping or loading tests passed, clinician clearance",
     `Return to sport is usually 6–12 months, and it's driven by strength testing rather than by the date. ${s.rts}`]
  ]
}, s.total);
add({ r: "distal quadriceps tendon repair|quadriceps tendon (repair|rupture|reattach)|quadriceps tendon tear", label: "Quadriceps tendon repair recovery",
  ...A.tendonRepair({
    what: "The quadriceps tendon connects the thigh muscle to the top of the kneecap, and a rupture is usually a sudden give-way while landing or stumbling — after which the knee cannot be straightened at all.",
    prog: "Repaired promptly, results are good, and the main enemies are stiffness early and lasting quadriceps weakness later.",
    protect: "The brace is usually locked straight for walking, because a bent knee under load pulls directly on the repair. Do NOT actively straighten the knee against resistance and do not bend beyond the surgeon's limit. An extensor lag — being unable to fully straighten the knee actively — must be reported early.",
    mid: "Bend the knee only within the allowed range; forcing flexion pulls on the repair, but avoiding it entirely leaves you stiff, so the prescribed range is a genuine sweet spot.",
    rts: "Expect quadriceps strength to lag for a year. Kneeling is often uncomfortable long-term. Stairs and getting out of low chairs are the last things to feel normal.", total: 26 }) });
add({ r: "patellar tendon (repair|rupture|reattach)|patellar tendon tear", label: "Patellar tendon repair recovery",
  ...A.tendonRepair({
    what: "The patellar tendon connects the kneecap to the shin bone, and a rupture leaves the kneecap riding high with no ability to straighten the knee — it typically happens in younger, more active people than a quadriceps rupture.",
    prog: "Results after prompt repair are generally good, though stiffness and quadriceps weakness both need active prevention.",
    protect: "The brace is usually locked straight for walking. Do NOT actively straighten the knee against resistance and do not bend past the surgeon's limit — both load the repair directly.",
    mid: "Work the allowed range daily: this knee stiffens quickly, and getting flexion back late is much harder than keeping it.",
    rts: "Quadriceps strength takes about a year to catch up, and jumping sports come last. Strength testing, not the calendar, decides.", total: 26 }) });
add({ r: "hamstring (avulsion|origin repair)|proximal hamstring (avulsion|repair|rupture|reattach)|ischial (tuberosity )?avulsion", label: "Proximal hamstring avulsion / repair recovery",
  ...(() => { const b = A.tendonRepair({
      what: "A proximal hamstring avulsion is the tendons tearing clean off the sitting bone — usually in a violent slip where the leg shoots forward with the knee straight. It's a genuinely different injury from a hamstring strain: there's often a pop, dramatic bruising down the back of the thigh, and difficulty sitting.",
      prog: "This is one of the longest rehabs in the body and the protection phase is long and non-negotiable.",
      protect: "This is a LONG protection phase and it is not negotiable: NO stretching of the hamstring at all, and no bending forwards with a straight leg. A brace limiting hip flexion is common. The sciatic nerve sits right on the repair, so report new leg numbness, tingling or weakness rather than pushing through it. Sitting directly on the repair hurts — use a cushion.",
      mid: "Still NO aggressive hamstring stretching — the repair is being pulled apart by exactly that movement, and this is where impatience causes re-ruptures. Range comes back gradually and largely on its own.",
      rts: "Return to sport is usually 6–12 months. Sprinting is the very last thing to return, because that's the mechanism that tears it. Re-rupture risk is real and highest in those who rushed.", total: 30 });
    b.freq = "Daily gentle work within strict limits — this one rewards patience more than effort";
    return b; })() });
add({ r: "achilles tendon rupture recovery|achilles tendon (rupture|tear) (recovery|rehab)|ruptured achilles tendon", label: "Achilles tendon rupture recovery",
  ...(() => { const b = A.tendonRepair({
      what: "An Achilles rupture usually feels like being kicked or hit in the back of the ankle, often with an audible snap, and afterwards you can't push off or rise onto that toe.",
      prog: "Surgical and non-surgical treatment give broadly similar outcomes now that early functional rehab is used in both — what actually determines the result is the rehab, not the choice of treatment.",
      protect: "Follow the boot and heel-wedge protocol exactly, and do NOT stretch the calf — pushing the toes up toward you pulls straight on the healing tendon and is how it re-ruptures. Sleep in the boot if you've been told to; the classic re-rupture happens getting up in the night without it. Watch for a clot: a swollen, hot, painful calf needs same-day assessment.",
      mid: "The heel wedges come down gradually — that IS the stretching programme, and doing extra on your own undoes it. Do not push the ankle past neutral until you're cleared.",
      rts: "Expect the calf to stay visibly smaller and weaker for a year or more — that's the single most predictable finding after this injury, and it's fought with heavy, slow, sustained calf loading. Being able to do 25 single-leg heel raises is a far better guide to readiness than any date. Re-rupture risk is highest between 6 and 12 weeks, when it feels much better than it is.", total: 30 });
    return b; })() });
add({ r: "extensor pollicis longus (repair|rupture|tendon transfer)", label: "Extensor pollicis longus repair recovery",
  ...(() => { const b = A.tendonRepair({
      what: "The extensor pollicis longus straightens the end joint of the thumb and lifts it away from the palm. It ruptures characteristically after a wrist fracture — sometimes weeks later, as the tendon frays over the healing bone — and is usually reconstructed with a tendon transfer rather than a direct repair.",
      prog: "Results are generally good, but the hand therapy protocol here is precise and it must be followed exactly.",
      protect: "Follow the hand therapist's splinting protocol EXACTLY — the thumb must be held out and straight for the repair to heal, and a single strong grip or a moment out of the splint can rupture it. This is a small tendon with no margin for improvisation.",
      mid: "Movement is introduced in a very controlled way. Stiffness and rupture are the two opposite risks, and the protocol is threading between them — which is why it's so specific.",
      rts: "After a tendon transfer you have to LEARN the new movement, because a different muscle is now doing the job — that re-education takes weeks and is a normal part of it, not a complication. Grip and pinch strength return over months.", total: 20 });
    b.freq = "Short, frequent, protocol-driven hand therapy sessions daily";
    return b; })() });

/* ---------------- AC joint, Hill-Sachs, Essex-Lopresti ---------------- */
add({ r: "ac joint separation|acromioclavicular (joint )?separation|acromioclavicular (joint )?(sprain|injury|disruption)|shoulder separation|coracoclavicular ligament (injury|sprain)", label: "AC joint separation recovery",
  total: 14, freq: "Daily range work early, then progressive strengthening 3–4×/week",
  note: "An AC joint separation is a tear of the ligaments holding the collarbone to the shoulder blade — almost always from landing directly on the point of the shoulder. It is NOT a dislocated shoulder, which is a different injury entirely. Most are managed without surgery and do well, and the step deformity that often remains is cosmetic rather than functional: people regularly return to full sport with a visible bump.",
  variants: [
    { k: "g1", label: "Grade I–II (mild)", sub: "Little or no step; ligaments stretched or partly torn", pick: "grade (i|ii|1|2)\\b|mild", scale: 0.5,
      note: "Grades I and II settle quickly and reliably without surgery — usually 2–6 weeks back to most things. The joint stays a bit tender to press for months, which is normal." },
    { k: "g3", label: "Grade III", sub: "A clear step; ligaments fully torn", scale: 1,
      note: "Grade III is the debated one. Evidence supports treating most non-surgically first, with equivalent outcomes to surgery and fewer complications — the step remains but function usually doesn't suffer. Surgery is reserved for those who don't get on with it." },
    { k: "g45", label: "Grade IV–VI (severe)", sub: "The collarbone is displaced badly", pick: "grade (iv|v|vi|4|5|6)\\b|severe", scale: 1.8,
      note: "Grades IV to VI displace the collarbone into or through surrounding tissue and are surgical — this needs a surgeon's opinion promptly rather than a rehab plan alone." }
  ],
  ph: [
    ["Protect, settle & keep the elbow moving", 0, 2,
     "Settle the pain, support the arm, and keep everything else moving.",
     "pain settling, comfortable in a sling, elbow, wrist and hand moving freely",
     "Use the sling for comfort — the arm's weight hangs directly on the injured ligaments, so supporting it is genuine pain relief. Avoid lifting, reaching across your body and lying on that side. Keep the elbow, wrist and hand moving so they don't stiffen. Numbness, coldness or a pale hand needs urgent review."],
    ["Restore range", 2, 5,
     "Regain full shoulder range as the pain allows.",
     "full or near-full range, out of the sling, using the arm for light daily tasks",
     "Avoid cross-body reaching for now — that movement compresses the AC joint directly and is the last one to become comfortable. Overhead reaching usually returns before it."],
    ["Progressive strengthening", 5, 10,
     "Rebuild the shoulder-blade and rotator cuff strength that supports the joint.",
     "clear strength gains, comfortable overhead, no pain with daily loading",
     "Build the scapular muscles — especially the trapezius, which actively holds the collarbone up and takes load off the healed ligaments. Reintroduce pressing and dips gradually; they load the AC joint hard."],
    ["Return to sport & contact", 10, 14,
     "Return to full activity, including contact sport.",
     "full strength and range, confident with contact and overhead loading, no pain with cross-body movement",
     "Contact sport usually returns at 6–12 weeks depending on the grade. Expect the bump to stay if you have one, and expect the joint to remain tender to direct pressure for months — neither means it hasn't healed. Bench pressing and dips are the movements most likely to grumble long-term; a narrower grip helps."]] });
add({ r: "hill-?sachs", label: "Hill-Sachs lesion recovery",
  total: 16, freq: "Daily range and rotator cuff work, then progressive strengthening",
  note: "A Hill-Sachs lesion is a dent in the back of the ball of the shoulder, punched in by the rim of the socket when the shoulder dislocated. It is a consequence of a dislocation rather than a separate injury — so the real question isn't the dent, it's whether the shoulder is now unstable and likely to dislocate again. Small dents are common, harmless and don't need treating.",
  variants: PACE,
  ph: [
    ["Settle & protect the healing shoulder", 0, 3,
     "Settle the pain from the dislocation and protect the shoulder while the soft tissue heals.",
     "pain settling, comfortable range within safe limits, elbow and hand moving freely",
     "Avoid the position that dislocates it — for the common anterior dislocation, that's the arm out to the side and rotated backwards, the throwing position. Sudden apprehension in that position is a warning, not something to test. Numbness over the outer shoulder is common (the axillary nerve) and usually recovers over weeks to months."],
    ["Restore range & rotator cuff control", 3, 8,
     "Restore range within safe limits and rebuild rotator cuff control.",
     "full range except the apprehension position, good cuff strength, no episodes of the shoulder slipping",
     "The rotator cuff and the shoulder-blade muscles are what actually stop the shoulder dislocating again — the dent doesn't. That's where the work goes."],
    ["Strength & progressive loading", 8, 13,
     "Build strength through range and into loaded positions.",
     "clear strength gains, comfortable and controlled in more provocative positions",
     "Progress into the vulnerable range gradually and under control. Confidence and control matter as much as raw strength."],
    ["Return to sport & instability assessment", 13, 16,
     "Return to sport, and get the instability properly assessed if it's recurring.",
     "full strength, confident in sport-specific positions, no instability episodes",
     "A LARGE dent that engages the socket rim, or repeated dislocations, is a surgical conversation — this is where the size of the lesion starts to matter, because an engaging Hill-Sachs makes further dislocations very likely regardless of rehab. Recurrence is especially high in young athletes, so don't take repeated dislocations as bad luck."]] });
add({ r: "essex-?lopresti", label: "Essex-Lopresti injury recovery",
  total: 30, freq: "Daily range work within limits — stiffness is the main enemy here",
  note: "An Essex-Lopresti injury is far more than the radial head fracture it looks like on the X-ray: the membrane running the whole length of the forearm is torn as well, plus the joint at the wrist end — so the entire forearm is unstable, and the radius can slide upward. It is frequently missed initially, because everyone looks at the elbow, and that missed diagnosis is what causes the long-term problems.",
  variants: PACE,
  ph: [
    ["Recognise the whole injury & protect", 0, 6,
     "Make sure the whole injury is recognised and protect the forearm as directed.",
     "the full injury identified (elbow AND wrist AND the membrane between), following the surgeon's limits, swelling settling",
     "The critical point: if only the elbow was treated and the wrist was never examined or imaged, this may have been missed — and a missed Essex-Lopresti is the one that goes badly. Wrist pain after a radial head fracture is the tell. Do NOT load through the forearm, and avoid forearm rotation entirely unless cleared. The radial head must usually be preserved or replaced, never simply removed, or the radius migrates upward."],
    ["Protected range", 6, 13,
     "Regain elbow and forearm range within your surgeon's limits.",
     "elbow range progressing, forearm rotation returning within limits, wrist comfortable",
     "Elbow stiffness is the commonest complication of any elbow injury and it's much easier to prevent than to treat — so work the allowed range daily. Report increasing wrist pain: that's the radius migrating upward, and it needs review."],
    ["Progressive strengthening", 13, 22,
     "Rebuild grip and forearm strength gradually.",
     "grip strength improving, forearm rotation functional, wrist tolerating load",
     "Build grip and rotation gradually — gripping compresses the forearm lengthways, which is exactly the direction the injury made unstable."],
    ["Return to function & long-term monitoring", 22, 30,
     "Return to function, with realistic expectations and ongoing monitoring.",
     "functional range and strength, managing work and daily tasks, wrist stable",
     "Be realistic: this injury commonly leaves some lasting stiffness and wrist pain even when everything is done well, and it needs long-term follow-up. Getting the diagnosis right early is what most improves the outcome — after that, patience."]] });

/* ---------------- post-abdominal-surgery core recovery ---------------- */
A.abdoCore = (s) => retime({
  total: 12, freq: "Walking every day from day one, plus breathing work; core loading comes later",
  note: `${s.what} The abdominal wall has been cut and stitched, and it needs about 6 weeks to regain most of its strength — so the early plan is walking and breathing, not core exercise. ${s.prog}`,
  variants: [
    { k: "open", label: "Open surgery", sub: "A full incision", pick: "\\bopen\\b|laparotom", scale: 1.25,
      note: "Open surgery cuts through the whole abdominal wall, so healing is slower and the hernia risk higher than with keyhole. Expect roughly 6–8 weeks before real loading and 3 months before heavy lifting." },
    { k: "keyhole", label: "Keyhole (laparoscopic)", sub: "Small port incisions", pick: "laparoscop|keyhole|robotic|minimally invasive", scale: 0.7,
      note: "Keyhole surgery spares most of the abdominal wall, so recovery is quicker — but the port sites are still holes in that wall and can herniate, so the lifting limits still apply even though you feel fine sooner." },
    { k: "standard", label: "Standard", sub: "The usual pathway", scale: 1 }
  ],
  ph: [
    ["Breathe, walk & protect the wound", 0, 2,
     "Get walking and breathing well, protect the incision, and manage the bowel.",
     "walking several times a day, breathing deeply and coughing effectively, wound clean and dry, bowels moving",
     `Walking from day one is the single best thing you can do — it prevents clots, chest infections and a sluggish bowel. Support the wound with a rolled towel or a pillow when you cough or sneeze; it hurts less and is genuinely protective. Breathe OUT on any effort and never hold your breath. Do NOT lift anything heavier than about 5kg (a full kettle), and do NOT do sit-ups or crunches. Log-roll onto your side to get out of bed instead of sitting straight up. Treat constipation actively — straining is a direct load on a fresh repair.${s.extra ? " " + s.extra : ""} Get urgent help for a wound that is hot, red, opening or leaking, a fever, a swollen painful calf, chest pain, or sudden breathlessness.`],
    ["Build walking & gentle activation", 2, 6,
     "Build walking distance and start very gentle deep abdominal activation.",
     "walking 20–30 minutes, gentle abdominal activation without pain or bulging, wound healed, off strong pain relief",
     "Still no lifting beyond about 5kg, and still no sit-ups or planks. Start reconnecting with the deep abdominal muscles gently — a soft draw-in with normal breathing, not a hard brace. Watch for any BULGE along the incision when you sit up or strain: that's a hernia forming and it needs reviewing, not pushing through."],
    ["Progressive core & general strengthening", 6, 9,
     "Start real strengthening of the abdominal wall and get back to general conditioning.",
     "tolerating progressive core loading with no bulging or doming, lifting normally around the house, general fitness returning",
     "The abdominal wall has most of its strength back by about 6 weeks, so you can start loading it properly now — build up rather than testing it. Progress from deep activation to loaded work over these weeks. Any doming or bulging along the midline or the incision means the load is too high — regress it."],
    ["Return to full lifting, work & sport", 9, 12,
     "Return to full lifting, work and sport.",
     "back to your normal lifting and activity, core strength restored, no bulging under load",
     "Heavy manual work and heavy lifting usually wait until about 3 months, especially after open surgery — the wall keeps gaining strength for months after it feels fine. Incisional hernias mostly occur in the first year and are strongly linked to early heavy lifting, smoking and infection."]
  ]
}, s.total);
const ABDO = [
  ["Post-abdominal-surgery core recovery", "post-abdominal-surgery|after abdominal surgery|abdominal surgery core", "You've had abdominal surgery.", "Recovery is driven by what was done and how it was accessed — keyhole or open matters more than which organ.", "", 12],
  ["Post-laparotomy recovery", "post-laparotomy|after (a )?laparotomy|\\blaparotomy\\b", "A laparotomy is a full open incision through the abdominal wall.", "This is the slowest of the abdominal recoveries and carries the highest hernia risk, so the lifting limits genuinely matter.", "", 14],
  ["Post-laparoscopy core recovery", "post-laparoscopy|after (a )?laparoscopy|laparoscop(y|ic) core", "Keyhole surgery uses several small incisions rather than one long one.", "You'll feel well quickly — much quicker than the abdominal wall actually heals, which is the trap. The port sites can still herniate.", "Shoulder-tip pain after keyhole surgery is normal and comes from the gas used to inflate the abdomen irritating the diaphragm — it settles in a few days and walking helps it clear.", 9],
  ["Post-hernia-repair (inguinal) recovery", "post-hernia-repair \\(inguinal\\)|inguinal hernia repair", "An inguinal hernia repair reinforces the groin, usually with mesh.", "Mesh repairs are strong quickly, and modern advice is to return to normal activity as soon as comfort allows rather than resting — but heavy lifting still waits.", "Some groin numbness or an aching, pulling sensation is common for weeks — nerves run right through this area. Persistent severe groin pain after a hernia repair is a recognised problem worth reporting early rather than enduring.", 10],
  ["Post-hernia-repair (umbilical) recovery", "post-hernia-repair \\(umbilical\\)|umbilical hernia repair", "An umbilical hernia repair closes a defect at the navel.", "Small repairs recover quickly; recurrence is closely linked to early heavy lifting, coughing and constipation.", "", 10],
  ["Post-hernia-repair (incisional / ventral) recovery", "post-hernia-repair \\(incisional|incisional hernia repair|ventral hernia repair", "An incisional hernia repair fixes a hernia that formed through a previous surgical scar.", "This is the most demanding of the hernia repairs: the wall has already failed once there, so protection is longer and the lifting limits are stricter.", "This wall has already failed once, so treat the restrictions as real. Recurrence rates are significant and are driven by early loading, smoking, obesity and coughing.", 16],
  ["Post-C-section (Caesarean) recovery", "post-c-section|post-caesarean|post-cesarean|caesarean|\\bc-section\\b", "A caesarean is major abdominal surgery — through skin, fat, fascia and muscle — that happens to end with a baby.", "The recovery it deserves is routinely underestimated, because you're discharged caring for a newborn while healing from an operation that would otherwise have you signed off for six weeks.", "You cannot avoid lifting your baby, and nobody expects you to — but lift with your legs, keep the baby close, and set things up so you don't have to lift anything heavier. Pelvic floor work still applies after a caesarean: it was pregnancy that loaded it, not just delivery. Get urgent help for heavy bleeding, a fever, a hot red wound, calf pain, or breathlessness.", 12],
  ["Post-hysterectomy core recovery", "post-hysterectomy|after (a )?hysterectomy", "A hysterectomy removes the uterus, and there's now a healing internal repair at the top of the vagina as well as the abdominal wall.", "The internal repair is why lifting limits here are about more than the scar you can see.", "Avoid heavy lifting, straining and impact for the first 6–12 weeks — the internal repair at the top of the vagina is healing, and pressure from above is what strains it. Report any new vaginal bleeding or discharge. Pelvic floor rehabilitation matters here: prolapse risk rises after hysterectomy.", 14],
  ["Post-appendectomy recovery", "post-appendectomy|after (an )?appendectomy|appendicectomy", "An appendectomy is usually keyhole and usually straightforward.", "Recovery is quick, especially if it was keyhole and the appendix hadn't burst — most people are back to normal within a few weeks.", "If the appendix had perforated, expect a longer recovery with a higher infection risk and a slower return to activity.", 8],
  ["Post-colectomy / bowel-resection recovery", "post-colectomy|bowel-resection|bowel resection|colectomy|hemicolectomy", "A bowel resection removes a segment of bowel and joins the ends together.", "That join takes time to heal and is the reason the early limits exist — plus your bowel habit will be unpredictable for months, which is normal.", "Expect an unpredictable bowel habit for months — that settles. If you have a stoma, avoid heavy lifting and get a support garment; parastomal hernia is common and strongly linked to early lifting. Report a fever, increasing abdominal pain or a rigid abdomen urgently.", 14],
  ["Post-cholecystectomy recovery", "post-cholecystectomy|gallbladder removal|cholecystectomy", "Gallbladder removal is usually keyhole and recovery is quick.", "Most people are back to normal within 2–4 weeks.", "Shoulder-tip pain from the gas used during keyhole surgery is normal and settles within days. Fatty foods may cause loose stools for a few weeks while the bile flow readjusts.", 8],
  ["Post-abdominoplasty core recovery", "post-abdominoplasty|abdominoplasty|tummy tuck", "An abdominoplasty removes excess skin and usually tightens the abdominal muscles back together in the midline.", "That muscle repair is the part that governs the rehab — it's a genuine surgical repair of the abdominal wall, not just a skin operation.", "If the muscles were repaired in the midline, that repair is under tension: avoid ANY sit-up-style movement, straining or heavy lifting for the full period your surgeon specifies. You'll be bent forward at first to keep tension off — straighten up gradually as directed. Report a hot, red or leaking wound, or a swollen painful calf.", 14],
  ["Post-prostatectomy core & pelvic recovery", "post-prostatectomy|after (a )?prostatectomy|prostatectomy", "Removing the prostate disturbs the sphincter and support structures that keep you continent, which is why leaking afterwards is so common.", "Pelvic floor training is the main intervention — and starting it BEFORE surgery measurably shortens the time to becoming dry again.", "Pelvic floor exercises are the core of this recovery, and they're worth learning properly from a specialist rather than guessing — a large proportion of people do them wrong, and doing them wrong achieves nothing. Continence usually improves over 3–12 months. Avoid heavy lifting and straining early. Report leg swelling or calf pain urgently.", 16]
];
ABDO.forEach(([label, r, what, prog, extra, total]) => add({ r, label, ...A.abdoCore({ label, what, prog, extra, total }) }));
add({ r: "diastasis recti|rectus diastasis|abdominal separation", label: "Diastasis recti rehabilitation",
  total: 16, freq: "Daily short sessions of graded loading — consistency matters more than intensity",
  note: "Diastasis recti is a widening of the gap between the two halves of the abdominal muscle, with the tissue between them stretched thin. It happens in essentially every pregnancy and it's normal — the question isn't whether there's a gap, it's whether the tissue between can generate tension. A narrow gap that stays soft and bulging is more of a problem than a wider gap that goes taut under load, which is why the tape-measure approach misleads people.",
  variants: [
    { k: "postpartum", label: "Postpartum", sub: "After pregnancy", pick: "postpartum|postnatal|post-natal|pregnan", scale: 1,
      note: "Most diastasis narrows substantially on its own in the first 8 weeks after delivery. Beyond about 8–12 weeks it stops closing spontaneously, and that's when graded loading does the work." },
    { k: "standard", label: "General", sub: "Not pregnancy-related", scale: 1 },
    { k: "severe", label: "Large or long-standing", sub: "A wide gap, or years since", pick: "severe|large|long-?standing|chronic", scale: 1.5,
      note: "A large or long-standing diastasis responds more slowly and may not fully close — but function, appearance and symptoms all still improve substantially with loading. Where there's a true hernia in the midline, that's a surgical question." }
  ],
  ph: [
    ["Restore the connection: breathing & deep activation", 0, 4,
     "Reconnect breathing, the deep abdominals and the pelvic floor so they work together again.",
     "able to generate tension across the gap, breathing and abdominal activation coordinated, no doming with gentle work",
     "The old advice — never do crunches, avoid all loading, brace constantly — has not held up. The tissue responds to LOAD, and the trick is finding the level where the midline stays taut instead of doming. Watch the midline: if it domes, tents or bulges, that particular exercise is too hard right now. That's your gauge, not the gap width. A visible bulge that's firm or painful may be a true hernia and needs assessment."],
    ["Graded loading without doming", 4, 9,
     "Progressively load the abdominal wall, staying at the level where the midline holds.",
     "tolerating progressively harder loading with no doming, tension across the midline maintained, function improving",
     "Progress by whether the midline holds, not by how it feels. Head lifts, then partial curls, then loaded work — each step is allowed as soon as you can do it without doming. Breathing out through effort helps the wall hold."],
    ["Progressive strengthening & real-world loading", 9, 13,
     "Build real strength, including lifting and carrying — the things life actually demands.",
     "lifting and carrying without doming, clear strength gains, confident with daily loads",
     "Carrying children, shopping and car seats is the real test — train for it deliberately rather than avoiding it. Avoidance keeps the wall weak and the gap functionally worse."],
    ["Return to full activity & sport", 13, 16,
     "Return to full training, including impact and heavier lifting.",
     "back to full activity without doming, strength restored, confident under load",
     "The gap may never fully close, and that's usually fine — the goal is a wall that generates tension and does its job. If there is a true hernia, or if function stays poor despite good rehab, surgical repair is worth discussing."]] });

/* ---------------- pregnancy & postpartum ---------------- */
add({ r: "round ligament pain", label: "Round ligament pain (reconditioning)",
  total: 8, freq: "Gentle daily movement; this is about management rather than training",
  note: "Round ligament pain is a sharp, brief, one-sided stab low in the abdomen or groin during pregnancy, triggered by standing up quickly, rolling over, coughing or sneezing. The round ligaments support the growing uterus and are being stretched — it's harmless, extremely common in the second trimester, and it eases with a bit of technique.",
  variants: PACE,
  ph: [
    ["Recognise it & settle it", 0, 2,
     "Confirm what it is and use the simple measures that reduce it.",
     "recognising the pattern, fewer episodes, moving more comfortably",
     "This is harmless — but abdominal pain in pregnancy always deserves checking the first time, because several serious things can feel similar. Get urgent review for pain that is CONSTANT rather than brief, pain with bleeding, fever, regular tightenings, reduced fetal movements, or pain with dizziness. Round ligament pain is brief, sharp, positional and settles within seconds to minutes."],
    ["Movement technique & support", 2, 4,
     "Change how you move so you stop triggering it.",
     "moving without triggering it, sleeping more comfortably",
     "Move more slowly into and out of positions, bend your knees and flex your hips before you sneeze or cough, roll rather than twist getting out of bed, and try a pillow between the knees at night. A maternity support belt helps some people considerably."],
    ["Gentle strength & mobility", 4, 6,
     "Keep hips and trunk gently strong and mobile through the pregnancy.",
     "comfortable with daily activity, hips and trunk feeling supported",
     "Keep exercising through pregnancy — it's safe and beneficial. Avoid the wide, sudden or twisting movements that provoke it, and stop and be checked for any bleeding, fluid loss, dizziness or contractions."],
    ["Ongoing management", 6, 8,
     "Manage it through the rest of the pregnancy.",
     "symptoms manageable, staying active, a plan for the rest of the pregnancy",
     "It typically eases in the third trimester and resolves completely after delivery. Staying active is protective, not risky."]] });
A.postnatal = (s) => retime({
  total: 16, freq: "Daily walking and pelvic floor work from early on; strength added gradually",
  note: `${s.what} ${s.prog} The 'six-week check' is a checkpoint, not a starting gun — tissue is still remodelling for months, and hormonal changes keep ligaments lax while breastfeeding.`,
  variants: PACE,
  ph: [
    ["Recover, walk & restart the pelvic floor", 0, 3,
     "Recover, walk gently and daily, and restart pelvic floor work.",
     "walking comfortably, pelvic floor exercises started, bleeding settling, wound or tear healing",
     `Start pelvic floor exercises as soon as you comfortably can — early is better, and this is the single highest-value thing in the whole postnatal recovery. Avoid heavy lifting beyond your baby, and avoid impact for now. ${s.extra} Get urgent help for heavy bleeding (soaking a pad an hour), a fever, a hot red wound, calf pain, breathlessness, or a severe headache.`],
    ["Rebuild the deep system & walking", 3, 7,
     "Rebuild the deep abdominal and pelvic floor system and build walking distance.",
     "walking 30 minutes comfortably, pelvic floor strength improving, no leaking with daily tasks, deep abdominals engaging",
     "Breathing, pelvic floor and deep abdominals work as one system — train them together rather than as separate exercises. Leaking is common but it is NOT something you have to accept: it's treatable, and it responds well to proper training."],
    ["Progressive strengthening", 7, 12,
     "Build real strength — legs, back, arms and trunk. Motherhood is a physical job.",
     "clear strength gains, lifting and carrying comfortably, no leaking or heaviness under load",
     "You lift a growing weight dozens of times a day, so train for it. Stop and reassess if you feel heaviness or dragging in the vagina, or start leaking — those mean the load is beyond what the pelvic floor can support yet."],
    ["Return to impact & sport", 12, 16,
     "Return to running, impact and sport once the pelvic floor can take it.",
     "no leaking or heaviness with impact, strength restored, running comfortably",
     "Running is usually not advised before about 12 weeks, and readiness is about the pelvic floor rather than the calendar — leaking, heaviness or dragging while running means it isn't ready, and pushing through it risks prolapse. A pelvic health physiotherapist can assess this properly, and it's worth doing."]
  ]
}, s.total);
add({ r: "post-vaginal-delivery|after vaginal delivery|post-natal recovery|postnatal reconditioning", label: "Post-vaginal-delivery recovery",
  ...A.postnatal({ what: "After a vaginal delivery the pelvic floor has been stretched substantially, and often torn or cut.",
    prog: "It recovers well with the right work, but it doesn't recover on its own timetable regardless of what you do — the pelvic floor training is what makes the difference.",
    extra: "If you had a significant tear (third or fourth degree), follow your specialist's guidance specifically — this needs more care and usually specialist pelvic health input.", total: 16 }) });
add({ r: "post-caesarean reconditioning", label: "Post-caesarean reconditioning",
  ...A.postnatal({ what: "A caesarean is major abdominal surgery, and the recovery it needs is consistently underestimated because you're discharged straight into caring for a newborn.",
    prog: "The abdominal wall needs about 6 weeks to regain most of its strength, and the pelvic floor still needs training — it was the pregnancy that loaded it, not just the mode of delivery.",
    extra: "Support the wound when you cough, log-roll out of bed, and breathe out on effort. Do not do sit-ups or crunches yet.", total: 18 }) });

/* ---------------- oncology rehabilitation ---------------- */
A.onco = (s) => retime({
  total: 16, freq: "Aerobic exercise most days + resistance 2×/week, scaled to how you are that day",
  note: `${s.what} ${s.prog} Exercise during and after cancer treatment is safe and it is one of the best-evidenced supportive treatments there is — it improves fatigue, strength, mood and quality of life, and for several cancers it is associated with better survival. The old advice to rest through treatment was wrong.`,
  variants: PACE,
  ph: [
    ["Assess, start gently & set the rules", 0, 3,
     "Get a safe baseline and start gentle regular activity around your treatment.",
     "a realistic baseline, exercising gently several times a week, clear on the safety limits",
     `${s.restrict} Stop and seek review for new or worsening bone pain, unexplained breathlessness, dizziness, a fever while on chemotherapy, or a new swollen painful calf. Exercise around your treatment cycle: most people are able to do more in the days before the next dose than immediately after.`],
    [s.ph2, 3, 8, s.goal2, s.crit2, s.restrict2],
    ["Build strength & aerobic capacity", 8, 13,
     "Build genuine strength and aerobic fitness as treatment allows.",
     "resistance training twice a week, aerobic fitness improving, fatigue reducing, daily tasks easier",
     "Resistance training is safe during and after cancer treatment — including for people with lymphoedema, where it was wrongly prohibited for years. Build up gradually and expect good and bad weeks that track the treatment rather than your effort."],
    ["Long-term routine & survivorship", 13, 16,
     "Settle into a long-term routine that supports recovery and long-term health.",
     "a sustained routine, fitness and strength restored toward baseline, fatigue manageable",
     "Aim toward 150 minutes a week of moderate activity plus twice-weekly strength work — that's the target associated with the best outcomes. Late effects of treatment can appear months or years later, so keep this reviewed."]
  ]
}, s.total);
add({ r: "post-mastectomy.*rehabilitation|post-mastectomy|after (a )?mastectomy", label: "Post-mastectomy shoulder rehabilitation",
  ...A.onco({ what: "After a mastectomy the shoulder often stiffens, both from the surgery itself and from holding the arm protectively.",
    prog: "Shoulder range recovers well with early, gentle, progressive work — and getting it back early prevents a frozen shoulder, which is much harder to fix than to prevent.",
    restrict: "Follow your surgeon's limits on how far to lift the arm while drains are in and the wound is healing. Look out for CORDING (axillary web syndrome) — tight, painful cords running from the armpit down the inner arm, which appear weeks after surgery. It looks alarming, it's common, and it responds very well to gentle stretching and manual therapy, so it's worth naming rather than fearing. Report a swollen, red, hot arm.",
    ph2: "Restore shoulder range", goal2: "Regain full shoulder range gently and progressively.",
    crit2: "shoulder range approaching the other side, able to reach overhead, cording easing if present",
    restrict2: "Progress range steadily — the window for preventing lasting stiffness is early. If radiotherapy is planned, you'll need enough range to get into position for it, so this is time-sensitive. Lymphoedema risk is real but resistance training does NOT cause it: that advice was overturned by good trials, and strength work is protective.", total: 16 }) });
add({ r: "post-lumpectomy.*rehabilitation|post-lumpectomy|after (a )?lumpectomy|breast-conserving surgery", label: "Post-lumpectomy shoulder rehabilitation",
  ...A.onco({ what: "After breast-conserving surgery the shoulder can stiffen, especially if lymph nodes were sampled or removed.",
    prog: "Recovery is usually quicker than after mastectomy, but the same principle applies: early gentle range work prevents lasting stiffness.",
    restrict: "Follow your surgeon's early limits. Watch for cording — tight painful cords from the armpit down the arm — which is common and treatable. Report a swollen, red or hot arm.",
    ph2: "Restore shoulder range", goal2: "Regain full shoulder range gently and progressively.",
    crit2: "full or near-full shoulder range, comfortable reaching overhead",
    restrict2: "If radiotherapy is planned you'll need good shoulder range to be positioned for it — so this work is time-critical rather than optional. Radiotherapy itself causes tightening over the following months, so keep the range work going through and after it.", total: 12 }) });
add({ r: "cancer-related fatigue|cancer related fatigue", label: "Cancer-related fatigue (graded exercise)",
  ...A.onco({ what: "Cancer-related fatigue is an overwhelming exhaustion that rest does not fix — it's the most common and most disabling symptom of cancer treatment, and it's quite different from ordinary tiredness.",
    prog: "Here's the counter-intuitive part, and it's well established: EXERCISE is the single most effective treatment for it, more effective than any drug. Resting more makes it worse.",
    restrict: "Resting more is the instinctive response and it makes fatigue worse — deconditioning deepens the exhaustion, which prompts more rest, and the spiral tightens. Start small and be consistent. Anaemia, thyroid problems, sleep and mood all contribute and are separately treatable — worth checking rather than assuming it's all the cancer.",
    ph2: "Build consistent low-level activity", goal2: "Establish consistent daily activity at a level you can repeat tomorrow.",
    crit2: "activity most days, fatigue becoming more predictable, less boom-and-bust",
    restrict2: "Consistency beats intensity by a wide margin. A 10-minute walk every day does far more than one long walk a week. Do the important things at your best time of day, and expect the pattern to follow your treatment cycle.", total: 16 }) });
add({ r: "breast-cancer-related lymphedema|breast-cancer-related lymphoedema|lymphedema \\(upper limb\\)|lymphoedema \\(upper limb\\)", label: "Breast-cancer-related lymphoedema (upper limb)",
  ...A.onco({ what: "Lymphoedema is swelling from a lymph system that can no longer drain the arm properly, after nodes were removed or irradiated.",
    prog: "The single most important correction here: resistance training is SAFE and is protective. For years people were told to avoid lifting with that arm — good trials overturned that completely, and slowly progressive strength training reduces flare-ups rather than causing them.",
    restrict: "Do NOT avoid using the arm — that advice was wrong and it left a generation of women weaker and no less swollen. Wear your compression garment during exercise, progress load SLOWLY (small increments, never sudden jumps), and build gradually. Report a red, hot, painful arm with a fever urgently — cellulitis is a real risk and needs antibiotics promptly.",
    ph2: "Compression, drainage & gentle loading", goal2: "Get compression and skin care right, and start slowly progressive resistance work.",
    crit2: "compression being used consistently, swelling stable or reducing, tolerating light resistance work",
    restrict2: "Compression and skin care are the foundation — the exercise sits on top of them. Look after the skin meticulously: cuts, burns, insect bites and even scratches can trigger infection in a limb that can't drain.", total: 20 }) });
add({ r: "head & neck cancer.*rehabilitation|head and neck cancer.*rehabilitation|head & neck cancer|head and neck cancer", label: "Head & neck cancer neck/shoulder rehabilitation",
  ...A.onco({ what: "Neck and shoulder problems after head and neck cancer treatment are common and have a specific cause: the nerve that runs the trapezius (the spinal accessory nerve) is often damaged or removed during neck dissection, so the shoulder blade droops and wings and the shoulder aches constantly.",
    prog: "This responds genuinely well to progressive strengthening — which was avoided for years out of caution, wrongly.",
    restrict: "Progressive shoulder strengthening is the treatment for shoulder dysfunction after neck dissection, and the evidence for it is good. Watch for TRISMUS (a jaw that won't open) after radiotherapy — daily jaw stretching started early prevents it, and once established it's very hard to reverse. Report swallowing difficulty, which needs specialist assessment. Neck lymphoedema is common and treatable.",
    ph2: "Shoulder girdle strengthening & jaw range", goal2: "Strengthen the shoulder girdle progressively, and keep the jaw and neck moving.",
    crit2: "shoulder strength improving, less shoulder ache, jaw opening maintained, neck range preserved",
    restrict2: "If the trapezius is denervated, the other scapular muscles must be trained to take over — that's what reduces the pain and the droop. Radiated tissue tightens progressively for months to years, so the stretching is a long-term commitment rather than a course.", total: 20 }) });
const RADFIB = [
  ["Post-radiation fibrosis (neck)", "post-radiation fibrosis \\(neck\\)|radiation fibrosis.*neck", "neck and jaw",
   "jaw opening, neck range and swallowing",
   "TRISMUS — a jaw that progressively won't open — is the complication to prevent here, and daily jaw stretching is what prevents it. Once established it's very difficult to reverse, so start early and don't stop. Report swallowing difficulty: it needs specialist assessment, and silent aspiration causes pneumonia."],
  ["Post-radiation fibrosis (shoulder)", "post-radiation fibrosis \\(shoulder\\)|radiation fibrosis.*shoulder", "shoulder and chest wall",
   "shoulder range and chest-wall extensibility",
   "Radiated skin and tissue are fragile and heal poorly, so progress load gradually and protect the skin. Lymphoedema risk is raised in a radiated limb — report a swollen, hot or red arm."],
  ["Post-radiation fibrosis (pelvis)", "post-radiation fibrosis \\(pelvis\\)|radiation fibrosis.*pelvis", "pelvis and hips",
   "hip range, pelvic floor function and walking",
   "Pelvic radiotherapy commonly affects bladder, bowel and sexual function, and those are treatable rather than something to endure — pelvic health physiotherapy helps. Radiated bone is weaker: pelvic and hip insufficiency fractures are a recognised late effect, so report new bone pain rather than training through it."]
];
RADFIB.forEach(([label, r, part, focus, restrict]) => add({ r, label,
  ...A.onco({ what: `Radiation fibrosis is progressive tightening and scarring of tissue in the ${part} that was irradiated — and it's a LATE effect, often appearing months to years after treatment finished, which is why people don't connect the two.`,
    prog: "It tends to progress slowly rather than resolve, so the goal is maintaining range and function with sustained daily work — and that genuinely does hold ground.",
    restrict,
    ph2: "Daily stretching & range maintenance", goal2: `Maintain and where possible improve ${focus}.`,
    crit2: "range maintained or improving, function preserved, a daily routine established",
    restrict2: "This is a long-term daily commitment rather than a course of treatment — radiated tissue keeps tightening, so the stretching keeps going. Sustained, gentle, frequent stretching beats occasional aggressive stretching, which just injures fragile tissue.", total: 24 }) }));
add({ r: "bone metastasis|bone metastases|metastatic bone disease|skeletal metastas", label: "Bone metastasis (supervised gentle exercise)",
  ...(() => { const b = A.onco({ what: "", prog: "", restrict: "", ph2: "", goal2: "", crit2: "", restrict2: "", total: 16 });
    b.note = "Cancer that has spread to bone weakens that bone from the inside, so it can break under loads it would normally handle easily — sometimes under body weight alone. Exercise is still valuable and is no longer withheld: it improves fatigue, strength, mood and function. But it must be modified for where the disease is, and that makes specialist supervision genuinely necessary rather than a formality.";
    b.freq = "Supervised, gentle, regular activity — modified around where the disease is";
    b.ph[0][0] = "Get the lesions mapped & set the safe limits";
    b.ph[0][3] = "Find out where the disease is and what that means for loading, then start gentle supervised activity.";
    b.ph[0][4] = "the sites known, exercise limits agreed with your oncology team, gentle activity started safely";
    b.ph[0][5] = "This is the one where you must NOT improvise: your team needs to tell you where the lesions are and which bones are at risk of breaking. Avoid high impact, twisting under load, and heavy resistance through an affected bone. NEW or worsening bone pain — especially at night, or a sudden increase — can mean an impending fracture and needs review before you exercise again. SPINAL metastasis with new leg weakness, numbness, or any bladder or bowel change is a spinal cord compression: that is a same-day emergency, and delay causes permanent paralysis.";
    b.ph[1][0] = "Gentle supervised activity within the limits";
    b.ph[1][3] = "Build gentle, regular, supervised activity that respects the affected bones.";
    b.ph[1][4] = "regular gentle activity, no new bone pain, function maintained";
    b.ph[1][5] = "Work the unaffected areas more freely and the affected ones gently. Walking, stationary cycling and supported strength work are usually well tolerated. Avoid loaded spinal flexion and rotation if the spine is involved.";
    b.ph[2][0] = "Maintain strength, function & bone health";
    b.ph[2][3] = "Maintain strength and function, and support bone health alongside your medical treatment.";
    b.ph[2][4] = "strength and function maintained, fatigue manageable, no new pain";
    b.ph[2][5] = "Bone-targeted medication and radiotherapy do most of the work of protecting the bone — exercise maintains you around them. Report new pain rather than pushing through: this is the setting where pain genuinely can mean structural failure.";
    b.ph[3][5] = "Keep this under regular review — the disease changes, and the safe limits change with it. The goal is quality of life and function, and both are genuinely improved by staying as active as is safe.";
    return b; })() });
const ONCO_RECON = [
  ["Post-prostatectomy reconditioning", "post-prostatectomy reconditioning", "after prostate surgery",
   "Pelvic floor training is the priority alongside general reconditioning, and continence improves over 3–12 months.", 16],
  ["Post-abdominal-cancer-surgery reconditioning", "post-abdominal-cancer-surgery|abdominal cancer surgery reconditioning", "after major abdominal cancer surgery",
   "Avoid heavy lifting for about 6–12 weeks and watch for an incisional hernia — a bulge along the scar under load needs reviewing. Walking from day one is the highest-value thing.", 18],
  ["Post-colorectal-surgery reconditioning", "post-colorectal-surgery|colorectal surgery reconditioning", "after colorectal cancer surgery",
   "If you have a stoma, avoid heavy lifting and use a support garment — parastomal hernia is common and linked to early lifting. Expect an unpredictable bowel habit for months; it settles.", 18],
  ["Post-thoracic-oncology reconditioning", "post-thoracic-oncology|thoracic oncology reconditioning|after lung (cancer )?surgery", "after chest or lung cancer surgery",
   "Breathing exercises and early walking prevent chest infections and are the priority. Expect breathlessness on exertion to improve over months as the remaining lung adapts. Report fever, increasing breathlessness or coughing blood urgently.", 18],
  ["Post-stem-cell-transplant reconditioning", "post-stem-cell-transplant|stem cell transplant reconditioning|bone marrow transplant reconditioning", "after a stem cell or bone marrow transplant",
   "Your immune system is profoundly suppressed for months: avoid gyms and crowded places until your team clears you, and stop for any fever — that's an emergency when neutropenic, not a reason to train lighter. Graft-versus-host disease can stiffen skin and joints and needs specific management. Steroid-related muscle weakness is common and responds well to resistance training.", 24],
  ["Limb-salvage (sarcoma) reconditioning", "limb-salvage|limb salvage|sarcoma reconditioning|endoprosthe", "after limb-salvage surgery for a sarcoma",
   "Follow your surgeon's weight-bearing and range limits exactly — a massive endoprosthesis or a bone graft has very specific limits, and they are not negotiable or generic. Muscle was often removed alongside the tumour, so the goal is function with what remains rather than symmetry. Report any new pain, swelling or a change in the limb's shape.", 30],
  ["Skin graft recovery (limb)", "skin graft recovery|skin graft \\(limb\\)|after (a )?skin graft", "after a skin graft",
   "The graft needs to take before anything stretches it — follow the surgeon's timeline exactly, because a graft lost to early movement means starting again. Once healed, scar massage and sustained gentle stretching prevent the contracture that limits the joint. Protect it from the sun for at least a year: grafted skin burns easily and permanently.", 20],
  ["Flap reconstruction recovery (limb)", "flap reconstruction|free flap|myocutaneous flap", "after a flap reconstruction",
   "A flap has its own blood supply that must not be compressed or stretched — follow positioning instructions exactly in the early weeks, because flap failure is catastrophic and largely preventable. Report any colour change, coolness or increasing swelling of the flap urgently. The donor site is a second injury needing its own rehab, and it's often the part that limits you.", 22]
];
ONCO_RECON.forEach(([label, r, ctx, restrict, total]) => add({ r, label,
  ...A.onco({ what: `Reconditioning ${ctx}.`,
    prog: "Recovery after major cancer surgery and treatment is measured in months, and fatigue outlasts the wound by a long way — that's normal rather than a setback.",
    restrict,
    ph2: "Rebuild walking, function & confidence", goal2: "Rebuild walking distance, daily function and confidence.",
    crit2: "walking further, daily tasks manageable, fatigue reducing, confidence returning",
    restrict2: "Build by small consistent increments and expect the treatment cycle, not your effort, to dictate the good and bad weeks. Progress is real but slow; measure it monthly.", total }) }));

/* ---------------- geriatric reconditioning ---------------- */
A.geriRecon = (s) => retime({
  total: 16, freq: "Progressive resistance 2–3×/week + balance work most days + daily walking",
  note: `${s.what} ${s.prog} The critical point: this needs PROGRESSIVE RESISTANCE training — real, measurable, increasing load. Gentle chair-based exercise is pleasant and maintains very little; muscle only rebuilds against meaningful resistance, at any age. People in their nineties gain strength.`,
  variants: PACE,
  ph: [
    ["Assess, address the causes & start", 0, 3,
     "Get a baseline, address the reversible contributors, and start resistance training.",
     "a baseline measured (chair rises, grip, walking speed), medication and nutrition reviewed, exercising twice a week",
     `${s.restrict} Protein matters as much as the exercise: older muscle needs MORE protein than younger muscle to rebuild, and under-eating protein is why many programmes fail. Review medications, vitamin D, thyroid and mood — all treatable contributors.`],
    ["Progressive resistance & balance", 3, 8,
     "Build genuine progressive resistance training and challenging balance work.",
     "load increasing week on week, rising from a chair without hands, standing on one leg longer",
     "Load must PROGRESS or nothing changes — the same band, week after week, achieves nothing. Aim for work that's genuinely hard by the last few repetitions. Balance training must be challenging enough to wobble, done where a fall is safe."],
    ["Function, power & endurance", 8, 13,
     "Add power (moving quickly), and train the tasks that daily life needs.",
     "rising from a chair quickly, walking faster, stairs manageable, carrying comfortably",
     "POWER — moving with speed, not just strength — is what's lost first with age and what saves you when you stumble. Train getting up quickly, stepping fast, and reacting. This is what separates a stumble from a fracture."],
    ["Long-term routine & independence", 13, 16,
     "Make it permanent — this only works while you keep doing it.",
     "training 2–3×/week sustained, function improved, confident and independent",
     "Gains are lost within weeks of stopping, so this is permanent. Group and social exercise sustains far better than solo home programmes — the social element is part of what makes it work, not a bonus."]
  ]
}, s.total);
const GERI = [
  ["Sarcopenia (progressive resistance)", "sarcopenia",
   "Sarcopenia is the age-related loss of muscle mass, strength and function — and it's a diagnosis, not an inevitability.",
   "It's substantially reversible: progressive resistance training plus adequate protein rebuilds muscle at any age, and the strength gains come faster than the size gains.",
   "This is not something to accept as ageing — it responds to training. Weakness that's new or one-sided, or rapid weight loss, needs a medical cause looked for rather than a gym programme.", 18],
  ["Frailty reconditioning", "\\bfrailty\\b|frail (older|elderly)",
   "Frailty is a state where small stresses — a minor infection, a new tablet, a night in hospital — cause disproportionate, lasting decline.",
   "It is NOT irreversible: multi-component exercise (resistance, balance, aerobic and functional training together) measurably reverses frailty, and it's one of the highest-value interventions in medicine.",
   "Multi-component exercise is what works — resistance alone or walking alone does noticeably less. Nutrition, medication review, vision, hearing and social contact all matter here and are all treatable.", 20],
  ["Post-ICU reconditioning", "post-icu|post-intensive care|intensive care.*reconditioning|critical illness (weakness|myopathy|neuropathy)",
   "Intensive care leaves profound weakness — people lose a substantial share of their muscle in the first week, and nerves and muscle are both damaged by critical illness itself, not just by lying still.",
   "Recovery takes months to years, and post-intensive-care syndrome affects the mind as much as the body: fatigue, memory, concentration, anxiety and post-traumatic stress are all common and all under-recognised.",
   "Expect this to be slow and expect the cognitive and emotional side to be as real as the physical. Breathlessness and fatigue improve over many months. Progress is genuine but measured monthly, not daily — comparing yourself to before is demoralising and unhelpful.", 26],
  ["Post-hospitalisation deconditioning", "post-hospitalization deconditioning|post-hospitalisation deconditioning|post-delirium mobility|hospital-associated deconditioning",
   "A hospital stay costs older people muscle and confidence fast — bed rest for a few days does measurable damage, and much of the decline after admission comes from the immobility rather than the illness.",
   "It reverses well with prompt progressive training, and the sooner it starts the more completely it comes back.",
   "Start as soon as you're medically able — every week of delay costs muscle that takes longer to rebuild. After delirium, confusion and slowed thinking can take weeks to months to clear, and that's a recognised part of recovery rather than a new permanent state.", 16],
  ["Multimorbidity exercise reconditioning", "multimorbidity",
   "Living with several long-term conditions at once makes exercise feel impossible to plan — every condition seems to have its own rules, and they appear to conflict.",
   "They mostly don't: the same moderate aerobic and resistance programme benefits nearly all of them at once, and exercise is one of the few interventions that treats several conditions simultaneously without adding a single side-effect.",
   "Start where your MOST limiting condition allows and build from there. The conditions that need genuine caution — unstable heart disease, uncontrolled symptoms, acute flares — need clearing first, but the rest usually align rather than conflict.", 18]
];
GERI.forEach(([label, r, what, prog, restrict, total]) => add({ r, label, ...A.geriRecon({ label, what, prog, restrict, total }) }));
add({ r: "osteoporotic vertebral compression|vertebral compression \\(reconditioning\\)|osteoporotic vertebral fracture", label: "Osteoporotic vertebral compression (reconditioning)",
  ...(() => { const b = A.geriRecon({ what: "", prog: "", restrict: "", total: 20 });
    b.note = "An osteoporotic vertebral fracture is a vertebra crushing under everyday load — often without any fall at all, sometimes just from a cough or lifting a kettle. It matters far beyond the pain: one vertebral fracture roughly quintuples the risk of the next, and the resulting stoop reduces lung capacity and appetite. The single most important thing is that this is a sentinel event demanding osteoporosis treatment — and it's very often missed.";
    b.freq = "Daily extensor and balance work; progressive resistance added carefully, avoiding spinal flexion";
    b.ph[0][0] = "Settle the pain & get the osteoporosis TREATED";
    b.ph[0][3] = "Settle the fracture pain, and make sure the underlying osteoporosis is actually being treated.";
    b.ph[0][4] = "pain settling, osteoporosis treatment started, walking gently each day, bone-health review arranged";
    b.ph[0][5] = "AVOID loaded spinal FLEXION — no sit-ups, crunches, toe-touches, or lifting with a rounded back. Bending forward under load is exactly the force that crushes an osteoporotic vertebra, and it's how the next one happens. This fracture is a sentinel event: make sure someone is treating the osteoporosis itself, because a large majority of people who have one are never started on bone medication, and that is the single biggest missed opportunity here. Sudden severe pain with leg weakness or bladder/bowel change needs urgent review.";
    b.ph[1][0] = "Extensor strengthening & posture";
    b.ph[1][3] = "Strengthen the back extensors and work on posture — this specifically reduces further fractures.";
    b.ph[1][4] = "back extensor strength improving, standing taller, pain reducing, walking further";
    b.ph[1][5] = "Back EXTENSOR strengthening is the evidence-based intervention here: it reduces future vertebral fractures. Keep the spine neutral or slightly extended and never load it in flexion.";
    b.ph[2][0] = "Balance, falls prevention & safe resistance";
    b.ph[2][5] = "Falls prevention is fracture prevention. Progressive resistance is safe and builds bone — but keep it out of spinal flexion, and get it supervised at first. High-impact work is not appropriate with an established vertebral fracture.";
    b.ph[3][5] = "Keep the extensor work and the bone medication going long-term — both work only while continued. Vitamin D, calcium and protein all matter alongside them.";
    return b; })() });

/* ---------------- cartilage repair & chondral lesions ---------------- */
add({ r: "cartilage repair|microfracture|autologous chondrocyte|\\baci\\b|\\bmaci\\b|osteochondral (autograft|allograft)|\\boats\\b procedure|mosaicplasty", label: "Cartilage repair recovery",
  total: 39, freq: "Range of movement several times daily from the start; loading is introduced strictly to protocol",
  note: "Cartilage repair is one of the slowest rehabs in the body, and the reason is worth understanding: the repair tissue starts as a soft clot and only gradually turns into something resembling cartilage, taking a year or more to mature. It is at its most fragile between about 6 and 12 weeks — precisely when the knee starts feeling good. That mismatch between how it feels and what it can take is why protocol discipline matters so much here.",
  variants: [
    { k: "microfracture", label: "Microfracture", sub: "Small holes made to bring in a healing clot", pick: "microfracture|marrow stimulation", scale: 1,
      note: "Microfracture fills the defect with fibrocartilage — a scar-type cartilage that's less durable than the original. It works well for small defects, and results can decline after some years, which is why it's usually chosen for smaller lesions." },
    { k: "aci", label: "Cell-based repair (ACI/MACI)", sub: "Your own cells grown and implanted", pick: "autologous chondrocyte|\\baci\\b|\\bmaci\\b|cell", scale: 1.2,
      note: "Cell-based repair produces tissue closer to real cartilage, but it matures slowly — protection is longer and full return is often 12–18 months. The graft is genuinely delicate in the first 6 weeks." },
    { k: "osteochondral", label: "Osteochondral graft", sub: "A plug of bone and cartilage transferred", pick: "osteochondral|autograft|allograft|mosaicplasty|\\boats\\b", scale: 0.95,
      note: "An osteochondral graft brings real cartilage on a bone plug, and the bone has to knit — so weight-bearing is dictated by bone healing rather than cartilage maturation. The cartilage surface itself is mature from day one." },
    { k: "patellofemoral", label: "Kneecap (patellofemoral) lesion", sub: "The repair is behind the kneecap", pick: "patell|trochlea|kneecap", scale: 1.1,
      note: "A repair behind the kneecap changes the rules: weight-bearing with the knee STRAIGHT is usually fine (the kneecap isn't in contact there), but bending under load grinds directly on the repair — so the limits are about range, not about weight." }
  ],
  ph: [
    ["Protect the repair & move without loading it", 0, 6,
     "Protect the fragile repair while keeping the joint moving — motion feeds cartilage.",
     "full passive range progressing, swelling settling, quadriceps switching on, following weight-bearing limits exactly",
     "Follow your weight-bearing and brace instructions EXACTLY — this is not an area where feeling fine means anything. Cartilage has no blood supply and is fed by joint fluid being squeezed through it, so MOTION is the treatment: continuous passive motion or frequent gentle bending is what nourishes the repair. Non-weight-bearing or partial weight-bearing is usual for 6 weeks or so. The repair is a soft clot at this stage — body weight through it would destroy it."],
    ["Graded weight-bearing", 6, 12,
     "Progress weight-bearing gradually to full, as your surgeon directs.",
     "full weight-bearing achieved on schedule, full range, walking without a limp, minimal swelling",
     "This is the DANGEROUS phase: the knee feels good and the repair is at its weakest and softest. Progress weight-bearing on the protocol's timetable and not on how it feels. Swelling after activity is the signal you did too much — it means the joint is irritated, and it should guide you."],
    ["Progressive strengthening", 12, 24,
     "Rebuild strength progressively as the repair matures.",
     "quadriceps strength approaching the other side, no swelling after loading, full range, walking normally",
     "Still no impact and no twisting. Cycling and swimming load the joint safely and are ideal here. Build strength steadily — quadriceps weakness is what most limits people a year out."],
    ["Return to impact & sport", 24, 39,
     "Return gradually to impact and sport as the repair matures fully.",
     "strength within about 10% of the other side, no swelling with loading, hop tests passed, surgeon's clearance",
     "Running usually waits until around 6 months and pivoting sport until 9–18 months, depending on the technique used and the size of the lesion. The repair keeps maturing for 1–2 years. Impact sport on a cartilage repair is a genuine discussion about the joint's long-term future, not just this season."]] });
add({ r: "chondral flap tear", label: "Chondral flap tear of the knee",
  total: 16, freq: "Daily range and quadriceps work; loading as symptoms allow",
  note: "A chondral flap is a piece of joint cartilage that has partly lifted away and hinges like a loose flap. It causes catching, clicking and swelling, and because cartilage itself has no nerve supply, the pain comes from the irritation it causes rather than from the cartilage being torn. Cartilage doesn't heal itself, so a flap doesn't reattach — but a stable, unloaded flap can settle down and become symptom-free.",
  variants: PACE,
  ph: [
    ["Settle the joint", 0, 3,
     "Settle the swelling and irritation.",
     "swelling settling, catching less frequent, comfortable range returning",
     "TRUE LOCKING — a knee that physically will not straighten — is different from catching and needs prompt assessment, because a displaced fragment can jam the joint. Avoid deep squatting, twisting and impact while it's irritable. Swelling is your guide: a knee that swells after activity is telling you clearly."],
    ["Restore range & quadriceps", 3, 7,
     "Restore full range and rebuild the quadriceps.",
     "full range, quadriceps strength improving, walking normally, less catching",
     "Quadriceps strength protects the joint surface by absorbing load — it's the highest-value thing you can do here. Cycling loads the knee gently and is ideal."],
    ["Progressive loading", 7, 12,
     "Build strength and load tolerance through range.",
     "clear strength gains, tolerating daily loading, no swelling afterwards",
     "Progress by whether the joint swells rather than by how it feels at the time. Recurrent swelling means the flap is being irritated and the load is too high."],
    ["Return to activity", 12, 16,
     "Return to your activities with the joint protected long-term.",
     "back to your activities without swelling, strength restored, catching resolved or manageable",
     "If catching, locking or swelling persists despite good rehab, arthroscopic trimming of the flap is straightforward and usually effective — that's a reasonable conversation rather than a failure. Long-term, protecting the joint surface matters: weight, strength and activity choice all influence how this knee ages."]] });

/* ---------------- arthroscopy & ligament reconstruction ---------------- */
A.scope = (s) => retime({
  total: 16, freq: "Daily range work early, then progressive strengthening 3–4×/week",
  note: `${s.what} ${s.prog}`,
  variants: PACE,
  ph: [
    ["Settle, protect & restore early range", 0, 3,
     "Settle the swelling and start restoring range within your surgeon's limits.",
     "swelling settling, portals healed, range progressing, following weight-bearing limits",
     `Follow your surgeon's weight-bearing and range limits — arthroscopy is keyhole, so it LOOKS minor from the outside, but what was done inside dictates the rules, and the small scars tell you nothing. ${s.restrict} Report a hot, swollen, increasingly painful joint with fever — infection after arthroscopy is rare but serious — or a swollen, tender calf.`],
    ["Full range & normal walking", 3, 7,
     "Regain full range and a normal walking pattern.",
     "full or near-full range, walking without aids or a limp, minimal swelling",
     "Swelling after activity means you've done too much — it's the most reliable feedback the joint gives. Build in steps."],
    ["Progressive strengthening", 7, 12,
     `Rebuild strength around the ${s.part}.`,
     "clear strength gains, tolerating loading, no swelling after activity, daily tasks easy",
     "This is where the outcome is actually determined. The surgery removed or repaired something; the strength is what makes the joint work — and under-doing this phase is the commonest reason people are disappointed with a good operation."],
    ["Return to sport & full activity", 12, 16,
     "Return to full activity and sport.",
     "strength within about 10% of the other side, sport-specific work without swelling, confident",
     `${s.rts} Strength symmetry, not the calendar, should decide.`]
  ]
}, s.total);
add({ r: "hip arthroscopy", label: "Hip arthroscopy recovery",
  ...A.scope({ part: "hip",
    what: "Hip arthroscopy is keyhole surgery inside the hip joint — usually to reshape impinging bone and repair the labrum.",
    prog: "It's a bigger recovery than the small scars suggest: the hip is deep, the joint is distracted during surgery, and full return commonly takes 4–6 months.",
    restrict: "Follow your range and weight-bearing limits precisely — if the labrum was repaired, there are usually specific limits on rotation and extension, and if bone was reshaped there may be limits to protect it. Avoid hip flexor irritation, which is extremely common after this surgery: don't do straight-leg raises early.",
    rts: "Full return is usually 4–6 months. Hip flexor tendinitis and lasting gluteal weakness are the two commonest reasons people plateau — both are treatable and neither means the surgery failed.", total: 20 }) });
add({ r: "ankle arthroscopy", label: "Ankle arthroscopy recovery",
  ...A.scope({ part: "ankle",
    what: "Ankle arthroscopy is keyhole surgery inside the ankle — usually to remove impinging bone or scar tissue, or to treat a cartilage lesion.",
    prog: "Recovery is quick for a simple debridement and much slower if cartilage was treated, so what was actually done matters more than the procedure's name.",
    restrict: "If a cartilage (osteochondral) lesion was treated, the weight-bearing restrictions are strict and long — often 6 weeks non-weight-bearing — and they're completely different from a simple debridement. Make sure you know which you had.",
    rts: "Simple debridement usually returns to sport at 6–12 weeks; cartilage work takes 4–6 months or more.", total: 14 }) });
add({ r: "lateral ligament reconstruction|brostr[oö]m|ankle ligament reconstruction|lateral ankle (ligament )?reconstruction", label: "Lateral ligament reconstruction recovery",
  ...A.scope({ part: "ankle",
    what: "This tightens or reconstructs the torn ligaments on the outside of the ankle after repeated sprains and ongoing giving-way — the Broström procedure is the usual one.",
    prog: "Results are good, and the rehab matters as much as the surgery: the ligament is only half the story, since the balance and proprioception that failed before surgery are still absent afterwards unless they're trained.",
    restrict: "Do NOT turn the sole of the foot inward — that's the exact movement that stretches the repair, and it's the movement that caused the original sprains. Follow the boot and weight-bearing protocol precisely for the first 6 weeks.",
    rts: "Return to sport is usually 4–6 months. Balance and proprioception training is what prevents the next sprain — the surgery restores the ligament, but the reflexes have to be retrained deliberately or the cycle simply repeats.", total: 20 }) });

/* ---------------- small joint replacements ---------------- */
A.smallJoint = (s) => retime({
  total: 16, freq: "Short, frequent daily range sessions — several times a day beats one long one",
  note: `${s.what} ${s.prog} Small joint replacements are about PAIN RELIEF and useful function rather than restoring a normal joint — expectations set correctly here make the difference between a satisfied and a disappointed result.`,
  variants: PACE,
  ph: [
    ["Protect, elevate & start gentle movement", 0, 3,
     "Protect the replacement, control swelling, and start the gentle movement your surgeon allows.",
     "swelling settling, wound healed, gentle movement started within limits, neighbouring joints moving freely",
     `Elevate to control swelling — swelling is what causes stiffness in small joints, and stiffness is the main enemy here. Follow your splint and range instructions exactly.${s.restrict} Keep every neighbouring joint moving so you don't end up with a stiff hand or foot around a good new joint.`],
    ["Restore range", 3, 7,
     "Regain the useful range within your surgeon's limits.",
     "range progressing toward the expected target, using it for light daily tasks",
     "Little and often is the rule — small joints respond to frequent short sessions, and stiffen fast if left. The range you get by about 3 months is broadly the range you keep."],
    ["Functional strengthening", 7, 12,
     "Build functional strength for daily tasks.",
     "managing daily tasks, strength improving, pain much reduced",
     `${s.load} Build gradually into function rather than testing the joint.`],
    ["Return to activity & long-term protection", 12, 16,
     "Return to daily activity and protect the replacement long term.",
     "back to daily activities comfortably, pain relieved, protective habits established",
     `${s.longterm} Report increasing pain, swelling or a change in how the joint feels — loosening and wear present that way, and small joint replacements have a finite lifespan.`]
  ]
}, s.total);
add({ r: "total wrist replacement|wrist arthroplasty", label: "Total wrist replacement recovery",
  ...A.smallJoint({ what: "A wrist replacement relieves pain while keeping some movement — the alternative, fusion, gives a strong pain-free wrist with no movement at all.",
    prog: "It's usually chosen for lower-demand hands, most often in rheumatoid arthritis, precisely because it doesn't tolerate heavy loading.",
    restrict: " Do NOT bear weight through this wrist — no pushing up from a chair with the palm, and no press-ups, ever.",
    load: "The lifting limit is usually permanent and modest — often around 2–5kg. This joint trades durability for movement.",
    longterm: "Avoid impact, heavy lifting and weight-bearing through the wrist for life — that's the deal this replacement makes. Push up from a chair with your forearm or knuckles, not your palm.", total: 16 }) });
add({ r: "first mtp joint replacement|1st mtp joint replacement|first metatarsophalangeal (joint )?replacement|hallux.*(implant|arthroplasty)", label: "First MTP joint replacement recovery",
  ...A.smallJoint({ what: "This replaces the big toe joint, usually for advanced arthritis (hallux rigidus), aiming to relieve pain while keeping the toe bending.",
    prog: "Fusion remains the more durable option and is often preferred for active people — a replacement keeps movement but is less robust.",
    restrict: " Follow your weight-bearing instructions and use the post-op shoe — that stiff sole exists to keep the toe from bending while it heals.",
    load: "The big toe takes a large share of push-off force, so build back into walking gradually.",
    longterm: "Avoid running, jumping and deep toe-bending activities long-term. Stiff-soled or rocker-soled shoes reduce load through this joint substantially and are worth adopting permanently.", total: 16 }) });
add({ r: "\\bmcp\\b joint replacement|metacarpophalangeal (joint )?replacement|\\bpip\\b joint replacement|proximal interphalangeal (joint )?replacement|finger joint replacement", label: "Finger joint replacement (MCP / PIP) recovery",
  ...A.smallJoint({ what: "Replacing finger knuckles — most often in rheumatoid arthritis — is done primarily to correct deformity, relieve pain and improve the hand's appearance and alignment.",
    prog: "Grip strength usually does NOT improve much and can even reduce slightly; understanding that in advance is what makes people happy with the result rather than disappointed.",
    restrict: " Follow the hand therapist's splinting protocol exactly — the splint holds the alignment while the soft tissues heal around the implant, and the alignment IS the operation.",
    load: "Avoid strong pinch and grip, and never use the hand in ways that push the fingers toward the little-finger side — that's the deforming force this surgery corrected, and it will recur.",
    longterm: "Avoid heavy grip and pinch permanently, and use joint-protection techniques: bigger handles, two hands, and tools instead of fingers. Implant fracture and recurrent deformity are the long-term issues.", total: 16 }) });

/* ---------------- TMJ ---------------- */
/* Anchored per-name rather than on a bare `\btmj\b`, which would have pulled
   "TMJ osteoarthritis" and "TMJ arthralgia" off their existing archetypes. */
A.tmj = (s) => ({
  total: 12, freq: "Short, gentle sessions several times daily — never force the jaw",
  note: `${s.what} ${s.prog} The jaw responds to the same principles as any other joint, with one difference: you cannot rest it, because you have to eat, talk and swallow — so management is about reducing the unnecessary load rather than stopping.`,
  variants: PACE,
  ph: [
    ["Unload the jaw & settle", 0, 3,
     "Take the unnecessary load off the jaw and settle the irritation.",
     "pain settling, less clicking or catching, more comfortable eating",
     `Rest the jaw in its neutral position: teeth APART, tongue resting on the roof of the mouth, lips together. Most people clench without knowing it. Avoid chewing gum, hard or chewy food, wide yawning (support the chin), nail biting, and resting your chin on your hand. Cut food small.${s.restrict} A jaw that LOCKS shut and won't open, or won't close, needs prompt assessment.`],
    [s.ph2, 3, 6, s.goal2, s.crit2, s.restrict2],
    ["Control, strength & posture", 6, 9,
     "Build controlled jaw movement and address the neck and posture that feed into it.",
     "controlled opening without deviation, better neck posture, less pain with eating",
     "The neck and the jaw are closely linked — the upper neck refers pain to the jaw and vice versa, so treating the neck is often part of treating the jaw. A forward head position measurably changes how the jaw tracks."],
    ["Return to normal function & prevention", 9, 12,
     "Return to normal eating and talking, and manage the drivers.",
     "eating normally, pain resolved or minimal, habits and stress managed",
     "Stress and clenching are the commonest drivers, and they're what makes this recur — so managing them IS the treatment, not an afterthought. A night splint helps some people; it protects the teeth from grinding rather than curing the jaw."]
  ]
});
add({ r: "temporomandibular joint dysfunction|temporomandibular (joint )?disorder|temporomandibular dysfunction", label: "Temporomandibular joint dysfunction",
  ...A.tmj({ what: "TMJ dysfunction is pain and restricted movement of the jaw joint and the muscles that move it.",
    prog: "The great majority settle with conservative treatment, and it's mostly self-limiting — irreversible dental work aimed at 'fixing the bite' is rarely necessary and can make things worse.",
    restrict: "",
    ph2: "Gentle range & control", goal2: "Restore comfortable, controlled jaw movement.",
    crit2: "opening more comfortably, less deviation, eating more normally",
    restrict2: "Gentle controlled movement, never forced. Do NOT push into a painful stretch — the jaw responds badly to force. Aim for a straight opening path rather than maximum distance." }) });
add({ r: "jaw clicking", label: "Jaw clicking (TMJ) rehabilitation",
  ...A.tmj({ what: "Clicking in the jaw is the disc inside the joint slipping on and off the condyle as you open and close.",
    prog: "The most useful fact here: a PAINLESS click needs no treatment at all. Jaw clicking is extremely common, most clicks never progress to anything, and chasing them causes more harm than the click does.",
    restrict: " A painless click is not a problem and does not need fixing — clicking alone is not a disease.",
    ph2: "Controlled opening & disc management", goal2: "Train a controlled opening path and reduce the clicking where it's bothersome.",
    crit2: "less clicking or a click that doesn't bother you, controlled straight opening",
    restrict2: "Do not repeatedly test the click — poking at it keeps it irritated. Training a controlled, straight, moderate opening (rather than a maximal one) often reduces it. If clicking suddenly stops and the jaw won't open fully, that's a disc that has locked and needs prompt assessment." }) });
add({ r: "tmj disc displacement", label: "TMJ disc displacement",
  ...A.tmj({ what: "The disc that cushions the jaw joint has slipped forward. If it slips back into place as you open, you get a click and the jaw opens fully ('with reduction'). If it doesn't, it acts as a doorstop and blocks opening ('without reduction').",
    prog: "Both settle well with conservative treatment. Even a locked disc usually improves substantially over months as the tissue behind it adapts — the joint remodels around the problem, which is why patience beats intervention.",
    restrict: " If your jaw is LOCKED and won't open past about 25–30mm, get it assessed promptly — early management improves the outcome, and prolonged limited opening leads to lasting stiffness.",
    ph2: "Restore opening & disc mechanics", goal2: "Restore opening range and the smoothest jaw mechanics available to you.",
    crit2: "opening improving toward 40mm, eating more comfortably, movement smoother",
    restrict2: "Gentle, controlled, progressive opening — never forced. Displacement WITHOUT reduction (a locked jaw) improves slowly but reliably over months in most people; surgery is rarely needed and shouldn't be rushed into. Displacement WITH reduction often needs nothing beyond managing the load." }) });
add({ r: "myogenous tmj|masticatory myofascial pain|bruxism", label: "Myogenous TMJ disorder / bruxism-related jaw pain",
  ...A.tmj({ what: "This is jaw pain coming from the MUSCLES rather than the joint — the commonest kind by far, and typically from clenching and grinding.",
    prog: "Muscle-based jaw pain responds very well to unloading, gentle exercise and stress management. The classic pattern is waking with an aching jaw and tight temples after a night of grinding.",
    restrict: " Grinding usually happens in your sleep, so you can't simply decide to stop — a night splint protects the teeth and often reduces the morning pain, but it's a shield rather than a cure.",
    ph2: "Muscle release, relaxation & habit reversal", goal2: "Release the jaw muscles and break the daytime clenching habit.",
    crit2: "less morning jaw ache, catching yourself clenching and releasing, temples less tender",
    restrict2: "Daytime clenching is a habit you CAN change, and catching it is most of the fix: set reminders, and each time check that your teeth are apart. Stress, poor sleep, caffeine and some medications all increase grinding. Heat and gentle massage to the temples and cheeks genuinely help." }) });

/* ---------------- headache with a neck component (MSK side) ---------------- */
add({ r: "tension-type headache|tension headache|migraine-associated neck dysfunction|migraine.*neck dysfunction", label: "Tension-type / migraine-associated neck dysfunction",
  total: 12, freq: "Daily deep neck flexor and postural endurance work + regular aerobic exercise",
  note: "Neck dysfunction and headache travel together for a real anatomical reason: the nerves from the top three neck segments and the nerve supplying the head converge on the same relay in the brainstem, so the brain genuinely cannot separate them. That's why neck pain occurs in most migraine attacks — and why treating the neck reduces headache burden in people who have both, even when the headache itself is a migraine rather than a neck problem.",
  variants: PACE,
  ph: [
    ["Identify the headache type & start", 0, 2,
     "Work out what kind of headache you actually have, and start neck treatment.",
     "a headache diary running, headache type clarified, neck treatment started",
     "Getting the type right matters, because they need different treatment: tension-type headache is a band-like pressure on both sides, while migraine is usually one-sided and throbbing with nausea and light sensitivity — and many people have both. Red flags needing urgent review: a sudden 'worst-ever' headache, fever with a stiff neck, a new headache after 50, one worse lying down or with coughing, or new neurological symptoms."],
    ["Manual therapy & deep neck flexor training", 2, 6,
     "Treat the neck with manual therapy plus deep neck flexor and scapular training.",
     "headache frequency falling, deep neck flexor endurance improving, less neck tenderness",
     "The combination of manual therapy AND exercise is what has the evidence — either alone does less. Watch for MEDICATION-OVERUSE headache: painkillers on more than 10–15 days a month create a daily headache of their own, and that is the single most common reversible cause of chronic daily headache."],
    ["Endurance, aerobic exercise & ergonomics", 6, 9,
     "Build postural endurance and regular aerobic exercise, and fix the workstation.",
     "sustained postures tolerated, exercising aerobically 3×/week, headaches less frequent",
     "Regular aerobic exercise is a genuine headache preventive — roughly as effective as some preventive medication — but it takes 6–8 weeks to show, so don't judge it early. Sleep, hydration and regular meals matter more than people expect."],
    ["Prevention & long-term", 9, 12,
     "Keep headaches down with a routine you'll actually maintain.",
     "headaches infrequent, a sustained routine, triggers managed",
     "This works while you do it. If headaches remain frequent despite good neck treatment and regular exercise, it's worth revisiting the diagnosis and considering preventive medication — persistent frequent headache is under-treated, not something to put up with."]] });

/* ---------------- systemic / inflammatory / connective tissue ---------------- */
/* Named A.ctd / CTD, NOT A.systemic / SYSTEMIC: those already exist earlier in
   this file (rheumatoid, lupus, gout, osteoporosis...) and A.systemic is still
   referenced BELOW this insertion point by the generic "Inflammatory arthritis"
   catch-all — redefining it would silently swap that archetype out. */
A.ctd = (s) => retime({
  total: 18, freq: "Aerobic 3×/week + resistance 2×/week, scaled to disease activity",
  note: `${s.what} ${s.prog} Exercise in inflammatory and connective tissue disease was avoided for decades on the theory that it would worsen the disease. That was wrong: it's safe, it does not increase disease activity, and it improves fatigue, strength, function and cardiovascular risk — which matters, because heart disease, not the joints, is what shortens life in most of these conditions.`,
  variants: PACE,
  ph: [
    ["Assess disease activity & start", 0, 3,
     "Get a baseline, make sure the medical treatment is right, and start gentle regular exercise.",
     "medical treatment optimised, a baseline set, exercising gently 2–3×/week",
     `Get the disease itself treated properly — exercise complements medication here, it doesn't replace it. ${s.restrict} During an active FLARE, reduce load and keep gently moving rather than stopping altogether: complete rest costs strength and stiffens joints, and neither helps.`],
    [s.ph2, 3, 8, s.goal2, s.crit2, s.restrict2],
    ["Build strength & aerobic capacity", 8, 14,
     "Build genuine strength and aerobic fitness.",
     "resistance training twice a week, aerobic fitness improving, fatigue reducing, function better",
     "Resistance training is safe and effective in these conditions and does not flare them. Long-term steroid use causes real muscle weakness and bone loss, and resistance training is the direct counter to both."],
    ["Long-term routine", 14, 18,
     "Settle into a sustainable long-term routine that flexes with the disease.",
     "a sustained routine, function maintained, a plan for flares",
     "Have a flare plan: drop the intensity, keep the frequency, resume when it settles. Cardiovascular risk is elevated in most inflammatory diseases and aerobic exercise is the main thing you control."]
  ]
}, s.total);
const CTD = [
  ["Systemic sclerosis (reconditioning)", "systemic sclerosis|scleroderma",
   "Systemic sclerosis hardens and tightens the skin and the tissue beneath it, so joints stiffen from the outside in — the hands and face are affected earliest and most.",
   "Daily stretching is the mainstay and it must be relentless, because the tightening is progressive and lost range doesn't come back.",
   "Daily hand and face stretching is the single highest-value thing and it needs doing every day for life — range lost to skin tightening is very hard to regain. Protect against COLD: Raynaud's is near-universal here, and cold triggers attacks that can ulcerate fingertips, so warm gloves and a warm environment are medical treatment, not comfort. Report breathlessness — lung involvement is common and needs monitoring. Digital ulcers need prompt care.",
   "Daily stretching & hand function", "Maintain hand, face and joint range with relentless daily stretching.",
   "range maintained, hand function preserved, mouth opening maintained, skin supple",
   "Stretch every day — including the mouth and face, which people forget until eating and dental care become difficult. Gentle and sustained beats aggressive: fragile skin tears.", 24],
  ["Dermatomyositis / polymyositis (reconditioning)", "dermatomyositis|polymyositis",
   "These are immune attacks on muscle, causing weakness closest to the trunk — difficulty with stairs, rising from chairs and reaching overhead — often with a characteristic rash in dermatomyositis.",
   "Exercise was long avoided here for fear of worsening the muscle inflammation. Good evidence has overturned that: exercise is safe even in active disease and improves strength and function without raising muscle enzymes.",
   "Exercise does not worsen the muscle inflammation — that fear was disproved, and inactivity causes much of the weakness that gets blamed on the disease. Report SWALLOWING difficulty, which is common and risks aspiration, and breathlessness, which can mean lung involvement. Both need prompt assessment rather than exercise modification.",
   "Graded strengthening from the trunk outward", "Build strength in the muscles closest to the trunk — the ones this disease targets.",
   "rising from a chair more easily, stairs manageable, overhead reach improving",
   "Train the hips and shoulders — that's where the weakness is and where the function is. Start sub-maximal and build; this responds well.", 20],
  ["Juvenile dermatomyositis (reconditioning)", "juvenile dermatomyositis",
   "The childhood form of dermatomyositis, affecting muscle and skin.",
   "Exercise is safe and beneficial here too, and keeping a child active protects their strength, bones and confidence through what can be a long treatment.",
   "Exercise does not worsen the disease. Watch for CALCINOSIS — hard calcium deposits under the skin — which is more common in children and needs specialist management. Long-term steroids affect growth, bone and muscle, so weight-bearing activity matters. Keep it play-based.",
   "Play-based strengthening & activity", "Build strength and keep the child active and participating.",
   "strength improving, joining in with peers, keeping up at school",
   "Keep it fun and keep them included. Rest was the old advice and it cost children strength, bone density and childhood.", 22],
  ["Mixed connective tissue disease (reconditioning)", "mixed connective tissue disease|\\bmctd\\b|undifferentiated connective tissue disease|\\buctd\\b",
   "These are overlap conditions with features of lupus, scleroderma and myositis together, so the picture varies enormously from person to person.",
   "Because the mix differs, the exercise plan follows whichever features you actually have rather than the label.",
   "The plan follows your dominant features: Raynaud's means keeping warm, muscle involvement means graded strengthening, joint involvement means range and pacing. Report breathlessness — pulmonary hypertension is a recognised complication of MCTD specifically and needs monitoring.",
   "Graded aerobic & strength around your features", "Build aerobic and strength work shaped around your dominant features.",
   "fitness improving, fatigue reducing, function better, flares manageable",
   "Fatigue is usually the biggest limiter — pace and be consistent rather than pushing. Protect against cold if Raynaud's is present.", 18],
  ["Adult-onset Still's disease (reconditioning)", "still'?s disease|adult-onset still",
   "Still's disease causes spiking fevers, a salmon-coloured rash and arthritis, often in a young adult, and it can be systemically severe.",
   "Between flares, exercise rebuilds what the illness and the steroids take away — and steroid-related muscle loss is usually the bigger problem by the second year.",
   "Do not exercise through an active flare with fevers — this is a systemic illness and the fever is the sign. Rebuild between flares. Long-term steroids cause muscle weakness and bone loss, both directly countered by resistance training.",
   "Rebuild between flares", "Rebuild strength and fitness between flares.",
   "strength returning, fitness improving, function restored between flares",
   "Expect a stop-start pattern that follows the disease rather than your effort — that's not failure. Resume gradually after each flare.", 18],
  ["Relapsing polychondritis (reconditioning)", "relapsing polychondritis",
   "Relapsing polychondritis is an immune attack on cartilage — ears, nose, joints and, critically, the airway.",
   "Exercise maintains function and fitness between flares, with airway involvement the thing that governs how hard you can safely work.",
   "AIRWAY involvement is the serious feature: report any breathlessness, noisy breathing, hoarseness or stridor urgently, and do not push exercise intensity if the airway is involved — this is not an ordinary exercise limitation. Avoid pressure on inflamed ears and nose.",
   "Gentle aerobic & strength between flares", "Maintain fitness and strength between flares, within airway limits.",
   "fitness maintained, function preserved, flares managed",
   "Keep intensity moderate and agreed with your specialist if the airway is involved. Rebuild after each flare.", 18],
  ["IgG4-related disease (reconditioning)", "igg4-related disease|igg4 related",
   "IgG4-related disease causes tumour-like swellings and fibrosis in various organs, and it usually responds dramatically to steroids.",
   "Reconditioning here is largely about recovering from the illness and the steroids rather than the exercise having any direct effect on the disease.",
   "This responds very well to medical treatment, so the medication does the work. Steroid-related muscle weakness and bone loss are the main things exercise addresses. Report any new organ symptoms.",
   "Rebuild strength & fitness", "Rebuild strength and aerobic fitness after treatment.",
   "strength improving, fitness returning, function restored",
   "Resistance training directly counters the steroid-related weakness — that's the specific target here.", 16],
  ["Eosinophilic fasciitis (reconditioning)", "eosinophilic fasciitis|shulman",
   "Eosinophilic fasciitis causes the fascia beneath the skin to inflame and harden, often after unusual exertion, producing a distinctive puckered 'orange-peel' skin and rapidly stiffening limbs.",
   "Early aggressive stretching alongside steroid treatment is what preserves range — and range lost to fibrosis is very hard to recover.",
   "Stretch early, daily and persistently — this fibroses fast, and joint contractures form within months if it isn't stretched through. This is one where the physiotherapy genuinely changes the long-term outcome rather than just supporting it.",
   "Daily aggressive stretching & range", "Maintain range with sustained daily stretching through every affected area.",
   "range maintained or improving, contractures prevented, function preserved",
   "Prioritise range over strength while the disease is active — contracture is the enemy. Keep every joint moving through full range daily.", 22],
  ["SAPHO syndrome (reconditioning)", "sapho syndrome|\\bsapho\\b|chronic recurrent multifocal osteomyelitis",
   "SAPHO combines skin problems with painful inflammation of bone and joints, classically at the front of the chest where the collarbone meets the breastbone.",
   "It flares and settles unpredictably; exercise maintains mobility, particularly of the chest wall and spine.",
   "Chest wall pain here is inflammatory rather than mechanical — keep the chest and spine moving and keep breathing deeply. Bone pain that's new or worsening needs review rather than more exercise.",
   "Chest wall & spinal mobility", "Maintain chest wall and spinal mobility, which is what this affects most.",
   "chest expansion maintained, spinal mobility preserved, pain manageable",
   "Daily mobility for the chest and spine is the priority. Don't stop during a flare — reduce and keep moving.", 18],
  ["Palindromic rheumatism", "palindromic rheumatism",
   "Palindromic rheumatism causes sudden attacks of joint pain and swelling that come on over hours, last days, and then vanish completely leaving no damage at all.",
   "Between attacks you are entirely normal, so the plan is to train fully between attacks and back off during them. A proportion of people go on to develop rheumatoid arthritis, so it's worth staying under review.",
   "Between attacks, train normally — there's no damage and no restriction. During an attack, rest the affected joint and keep the rest of you moving. Because a proportion progress to rheumatoid arthritis, stay under rheumatology review rather than being discharged.",
   "Train fully between attacks", "Build strength and fitness fully in the symptom-free periods.",
   "training normally between attacks, fitness building, attacks managed",
   "The symptom-free periods are genuinely symptom-free — use them properly rather than training cautiously out of habit.", 14],
  ["CPPD / pseudogout reconditioning", "\\bcppd\\b|pseudogout|chondrocalcinosis|calcium pyrophosphate",
   "CPPD is calcium crystal deposition in cartilage. It can cause sudden hot swollen joints that mimic gout (pseudogout), or a slower arthritis — and chondrocalcinosis is simply what those crystals look like on an X-ray.",
   "Acute attacks are treated medically; between them, this is managed exactly like osteoarthritis, with strength and load management.",
   "A hot, swollen, exquisitely painful joint with fever must be assumed to be INFECTION until proven otherwise — septic arthritis destroys a joint in days and looks identical to pseudogout. That needs same-day assessment and joint aspiration, not anti-inflammatories and hope. Chondrocalcinosis on an X-ray without symptoms needs no treatment at all.",
   "Strength & load management between attacks", "Build strength and manage load between attacks, as for osteoarthritis.",
   "strength improving, attacks less disruptive, function better",
   "Between attacks, train as for osteoarthritis — progressive strengthening is safe and effective. During an acute attack, rest the joint and get it treated.", 16]
];
CTD.forEach(([label, r, what, prog, restrict, ph2, goal2, crit2, restrict2, total]) =>
  add({ r, label, ...A.ctd({ label, what, prog, restrict, ph2, goal2, crit2, restrict2, total }) }));

/* hypermobility — the goal is stability, never more range */
add({ r: "ehlers-danlos|hypermobility spectrum|hypermobility disorder|benign joint hypermobility|joint hypermobility syndrome|\\bheds\\b", label: "Ehlers-Danlos / hypermobility spectrum",
  total: 26, freq: "Strength and control work 3×/week, progressed slowly — this is a long game",
  note: "In hypermobility the connective tissue is more elastic than it should be, so joints move beyond their safe range and the ligaments that normally protect them don't. The single most important principle: do NOT chase more flexibility — you have plenty, and stretching makes it worse. Strength, mid-range control and position sense are the targets, and progress is genuinely slower than in other people, which is biology rather than effort.",
  variants: [
    { k: "standard", label: "Hypermobility spectrum / hEDS", sub: "Joints that move too far", scale: 1 },
    { k: "paeds", label: "Child or adolescent", sub: "In a growing child", pick: "paediatric|pediatric|child|juvenile|benign joint", scale: 0.8,
      note: "Children are naturally more flexible and many grow out of the symptoms. Keep them active and strong rather than protected — and steer them toward strength-based activities and away from those that reward extreme range, like contortion-style gymnastics." },
    { k: "severe", label: "Frequent dislocations / severe", sub: "Joints subluxing or dislocating often", pick: "severe|dislocat|sublux|frequent", scale: 1.4,
      note: "With frequent subluxations, work strictly in the mid-range and build control before load. Bracing and taping help some joints. This needs specialist input and a lot of patience — progress is real but slow." }
  ],
  ph: [
    ["Understand it, protect & start mid-range control", 0, 5,
     "Understand the principle, stop the harmful habits, and start mid-range control work.",
     "understanding why stretching is out, working comfortably in the mid-range, joint position awareness improving",
     "STOP STRETCHING. This is the hardest thing to accept because stretching feels wonderful with hypermobile tissue — but you're stretching already-lax tissue and making the joint less stable, and the relief lasts minutes. Avoid end-range positions, hanging on your joints, sitting in a W or with legs tucked under, and locking your knees and elbows straight. Learn where 'neutral' actually is — hypermobile people usually can't feel it, and that's the root of the problem."],
    ["Build strength & proprioception", 5, 12,
     "Build strength through the mid-range and retrain your sense of joint position.",
     "clear strength gains in the mid-range, better joint position sense, fewer subluxations, less pain after activity",
     "Progress SLOWLY — hypermobile tissue is easily irritated and flares set you back weeks, so smaller increments get you further. Position sense is genuinely impaired here, so train it deliberately with mirrors and feedback. Expect delayed soreness to be worse and longer than other people's."],
    ["Progressive loading & endurance", 12, 20,
     "Build load tolerance and endurance for real-life demands.",
     "tolerating progressive load, endurance improving, daily activity easier, fewer flares",
     "Endurance matters as much as strength, because your joints need muscular support all day rather than for one lift. Fatigue is when subluxations happen. Pacing genuinely matters here, and fatigue, dizziness on standing (POTS) and gut symptoms commonly travel with hypermobility — all treatable in their own right and all worth chasing."],
    ["Long-term management", 20, 26,
     "Settle into permanent management with realistic expectations.",
     "a sustained routine, joints more stable, flares less frequent and shorter",
     "This is lifelong: the tissue doesn't change, but the muscular support around it does — and it fades fast without training. Choose activities that build strength and control (swimming, cycling, resistance work) over those that reward extreme range. Progress here is measured over months and years, and that's normal."]] });
add({ r: "marfan syndrome", label: "Marfan syndrome (exercise management)",
  total: 20, freq: "Moderate-intensity aerobic exercise most days — never maximal, never straining",
  note: "Marfan syndrome affects the connective tissue that builds the body's scaffolding — so people are typically tall with long limbs, lax joints and a flexible chest. The reason exercise advice here is so specific has nothing to do with the joints: the AORTA, the main artery leaving the heart, is weaker than it should be and can enlarge and tear. That risk, not the musculoskeletal side, governs everything below.",
  variants: PACE,
  ph: [
    ["Get cardiac clearance & set the limits", 0, 4,
     "Get cardiac assessment and clear limits before doing anything else.",
     "cardiac review and aortic measurement done, exercise limits agreed with your cardiologist, moderate activity started",
     "This is a CARDIAC question before it is a musculoskeletal one, and it must not be skipped. AVOID: maximal or all-out efforts, heavy weightlifting, straining or breath-holding (the Valsalva manoeuvre), contact and collision sport, and competitive sport generally. All of them spike blood pressure through a weakened aorta. Get urgent help for sudden severe chest, back or abdominal pain — an aortic dissection is a life-threatening emergency and this is the population it happens in. Also report sudden visual change (lens dislocation) and sudden breathlessness (a collapsed lung)."],
    ["Moderate aerobic exercise", 4, 10,
     "Build regular moderate-intensity aerobic exercise, well below maximum.",
     "30 minutes of moderate aerobic activity most days, comfortable conversational pace, no straining",
     "MODERATE means you can hold a conversation. Walking, gentle cycling, swimming (not competitive), and doubles rather than singles. Never work to exhaustion, and never hold your breath. Avoid isometric holds against heavy resistance."],
    ["Light resistance & joint stability", 10, 16,
     "Add light, high-repetition resistance work and joint stability training.",
     "light resistance work tolerated, joint stability improving, no straining or breath-holding",
     "Light weights and higher repetitions only — breathe OUT on every effort and never hold your breath. The joints are hypermobile, so mid-range control is the target rather than more range. Do NOT stretch for flexibility."],
    ["Long-term routine & monitoring", 16, 20,
     "Settle into a lifelong routine with ongoing cardiac monitoring.",
     "a sustained moderate routine, cardiac monitoring scheduled, joints stable",
     "Lifelong cardiac monitoring is non-negotiable — the aorta is measured regularly and medication and surgery are timed by it. Exercise is genuinely good for you here; it just has a firm ceiling."]] });
add({ r: "paget'?s disease of bone|osteitis deformans", label: "Paget's disease of bone",
  total: 16, freq: "Weight-bearing aerobic exercise most days + resistance 2×/week, within pain limits",
  note: "In Paget's disease bone is broken down and rebuilt too quickly, producing bone that's bigger but disorganised and structurally weaker — so it bends and fractures under loads normal bone would manage. It often causes no symptoms at all and is found by accident; where it does cause problems, medication that slows the bone turnover is the main treatment.",
  variants: PACE,
  ph: [
    ["Get it treated & assess the affected bones", 0, 3,
     "Make sure the disease is being treated medically and find out which bones are involved.",
     "medical treatment underway, affected bones known, gentle activity started",
     "Find out WHICH bones are affected, because that determines what's safe: pagetic bone bends and fractures more easily, and a weight-bearing bone changes the plan. NEW or increasing bone pain, or a sudden change, needs review — fracture and (rarely) malignant change present that way. Avoid high impact through affected weight-bearing bone."],
    ["Weight-bearing activity & strength", 3, 8,
     "Build weight-bearing activity and strength within comfort.",
     "walking regularly, strength improving, no new bone pain",
     "Weight-bearing exercise is good for bone generally and is encouraged here — but keep it moderate through affected bones and avoid impact. Watch for changes in leg shape or a limb bowing."],
    ["Function, gait & joint protection", 8, 13,
     "Address the gait and the joints next door to the affected bone.",
     "walking better, joints more comfortable, function improved",
     "Pagetic bone near a joint causes secondary arthritis, and a bowed bone changes how you walk and loads everything else — so the hips, knees and back often need as much attention as the affected bone itself."],
    ["Long-term management", 13, 16,
     "Maintain function and stay under review.",
     "a sustained routine, function maintained, medical review scheduled",
     "Stay under review: hearing loss (if the skull is involved), fractures and secondary arthritis are the long-term issues. Medication controls the bone turnover well."]] });
add({ r: "diffuse idiopathic skeletal hyperostosis|\\bdish\\b syndrome|forestier'?s disease", label: "Diffuse idiopathic skeletal hyperostosis (DISH)",
  total: 16, freq: "Daily mobility and postural work + strength 2×/week",
  note: "In DISH, ligaments along the spine turn to bone, fusing segments together — most often down the right side of the thoracic spine. It's often silent and found incidentally, but it makes the spine progressively stiff and, importantly, BRITTLE: a fused spine behaves like a long bone, so a relatively minor fall can fracture it right through.",
  variants: PACE,
  ph: [
    ["Understand the stiffness & the fracture risk", 0, 3,
     "Understand what's fused and what that means for safety.",
     "aware of the fracture risk, gentle mobility started, falls risk addressed",
     "A fused spine is BRITTLE and fractures like a long bone — so any fall with new back pain needs proper imaging rather than reassurance, and these fractures are missed frequently and are unstable when they happen. Falls prevention matters more here than for most stiff spines. Avoid high-impact activity and end-range spinal forcing. Difficulty swallowing can occur when neck bone spurs press on the gullet — report it."],
    ["Maintain what movement you have", 3, 8,
     "Maintain the movement in the segments that aren't fused, and keep the chest expanding.",
     "mobility maintained in the mobile segments, chest expansion preserved, posture better",
     "You cannot restore movement to fused segments, so the goal is protecting the ones that still move and keeping the ribcage expanding. Do NOT force a fused segment — that's how they fracture."],
    ["Strength, posture & balance", 8, 13,
     "Build strength, posture and balance to protect the spine and prevent falls.",
     "strength improving, balance steadier, posture maintained, walking confidently",
     "Balance and strength are fracture prevention here. Metabolic conditions travel with DISH — diabetes, obesity and metabolic syndrome are strongly linked — and treating them matters."],
    ["Long-term maintenance", 13, 16,
     "Keep mobility, strength and safety long-term.",
     "a sustained routine, mobility and strength maintained, falls risk managed",
     "This progresses slowly, so the routine is permanent. Keep the metabolic health under review — that's the part with the biggest effect on your overall outlook."]] });
add({ r: "osteomalacia|renal osteodystrophy|hyperparathyroid bone disease|fibrous dysplasia", label: "Metabolic bone disease (reconditioning)",
  total: 18, freq: "Weight-bearing activity daily + progressive resistance 2×/week, once the cause is treated",
  note: "In these conditions the bone is soft or structurally abnormal rather than simply thin — from a lack of vitamin D or phosphate (osteomalacia), kidney disease (renal osteodystrophy), an overactive parathyroid gland, or abnormal bone development (fibrous dysplasia). The crucial difference from osteoporosis: several of these are largely REVERSIBLE by treating the cause, and exercise only helps once that's underway.",
  variants: PACE,
  ph: [
    ["Treat the CAUSE first", 0, 4,
     "Get the underlying metabolic problem diagnosed and treated — that's what changes the bone.",
     "the cause identified and treatment started, bloods being monitored, gentle activity underway",
     "The medical treatment does the work here, not the exercise: vitamin D replacement in osteomalacia transforms it, and the deep aching bone pain and muscle weakness often improve dramatically within weeks. Exercising soft bone hard is not useful and risks fracture. Report new or focal bone pain — insufficiency fractures are common in soft bone and often missed."],
    ["Gentle weight-bearing & muscle recovery", 4, 9,
     "Build gentle weight-bearing activity and rebuild the muscle weakness these conditions cause.",
     "walking comfortably, proximal muscle weakness improving, bone pain settling",
     "The weakness in these conditions is real and metabolic — it improves as the cause is treated, and rebuilds faster with training. Keep loading moderate while the bone is still soft."],
    ["Progressive resistance & bone loading", 9, 14,
     "Build progressive resistance training as the bone quality improves.",
     "resistance training progressing, strength clearly improved, no new bone pain",
     "Once the biochemistry is corrected, the bone remineralises and can take normal loading — progressive resistance is then genuinely good for it. Fibrous dysplasia is different: the abnormal bone stays abnormal, so avoid impact through affected bones and get the safe limits from your specialist."],
    ["Long-term bone health", 14, 18,
     "Maintain bone health long-term with exercise and ongoing medical management.",
     "a sustained routine, bone chemistry stable, strength maintained",
     "Keep the medical treatment and the monitoring going — the bone stays healthy only while the underlying condition is controlled. Vitamin D, calcium, protein and weight-bearing exercise together are what maintain it."]] });
add({ r: "myositis ossificans", label: "Myositis ossificans (reconditioning)",
  total: 20, freq: "Gentle pain-free range work only — never forced, never massaged",
  note: "Myositis ossificans is bone forming inside a muscle after a deep bruise or a bad tear — most classically in the thigh after a heavy knock. It matters mainly because of what makes it WORSE: aggressive massage, forced stretching, and heat applied to a fresh muscle bruise are exactly what trigger it, which means it's largely an iatrogenic problem, caused by well-meant treatment.",
  variants: PACE,
  ph: [
    ["Do no harm & gentle pain-free movement", 0, 4,
     "Protect it, and move gently within a completely pain-free range.",
     "pain settling, gentle pain-free range maintained, swelling reducing",
     "Do NOT massage it, do NOT stretch it forcefully, and do NOT apply heat. Those three things are what cause and worsen this, and they're routinely done to muscle injuries by people trying to help. Gentle, pain-free, active movement only. A hard lump in a muscle that's getting bigger, or a joint that's losing range, needs imaging."],
    ["Gentle active range", 4, 9,
     "Gradually restore range with gentle active movement only.",
     "range improving gradually, the lump stable or shrinking, comfortable daily use",
     "Active movement — your own muscle moving the joint — is safe. Passive forcing is not. Progress by what the muscle allows, and expect it to be slow."],
    ["Gentle progressive strengthening", 9, 15,
     "Start gentle strengthening as it matures.",
     "strength improving, range continuing to improve, no increase in the lump",
     "The bone within the muscle matures over 6–12 months and often shrinks substantially on its own. Patience genuinely beats intervention — most of these resolve or become symptom-free without surgery."],
    ["Return to activity", 15, 20,
     "Return to full activity as it matures.",
     "full or functional range, strength restored, back to activity",
     "Surgery to remove it, if ever needed, waits until the bone is fully mature — usually a year or more — because removing it early reliably makes it come back worse. Protect the area from further knocks with padding if you're returning to contact sport."]] });

/* ---------------- pain-system conditions (MSK side) ---------------- */
add({ r: "central sensitization|central sensitisation|chronic widespread pain|nociplastic pain", label: "Central sensitisation / chronic widespread pain (graded exercise)",
  total: 20, freq: "Little and often, every day, at a level you can repeat tomorrow",
  note: "In central sensitisation the nervous system's volume control has been turned up: the alarm system has become more sensitive, so normal signals are amplified and things that shouldn't hurt do. The pain is entirely real — the difference is that it reflects a sensitised system rather than damaged tissue, which is why scans look normal and why treatments aimed at tissue keep failing.",
  variants: [
    { k: "standard", label: "Standard graded exposure", sub: "The usual pathway", scale: 1 },
    { k: "severe", label: "Highly sensitised", sub: "Widespread pain, flares very easily", pick: "severe|widespread|fibromyalgia|high-irritability", scale: 1.5,
      note: "When the system is highly sensitised, start far lower than seems worthwhile and progress in tiny steps. Aerobic exercise has the best evidence in fibromyalgia and widespread pain — but the dose has to start almost absurdly small, because that's what makes it sustainable." },
    { k: "mild", label: "Localised / early", sub: "One area, more recent", pick: "\\bmild\\b|localis|localiz|early", scale: 0.7,
      note: "Caught earlier and confined to one area, this responds faster — graded exposure to the specific feared movements does most of the work." }
  ],
  ph: [
    ["Understand the pain & find a baseline", 0, 4,
     "Understand what's driving the pain, and find a baseline you can sustain on a bad day.",
     "understanding the mechanism, a sustainable baseline found, moving daily",
     "Understanding this genuinely reduces pain — that's a real, replicated finding, not a consolation. Hurt does not equal harm here: the alarm is over-sensitive, not the tissue damaged. Set your baseline by what you can do on a BAD day and repeat it consistently, rather than by your best day."],
    ["Graded exposure & consistency", 4, 10,
     "Build activity by small fixed increments, regardless of how any given day feels.",
     "activity increasing steadily, fewer boom-and-bust cycles, flares shorter",
     "Increase by time and plan, NOT by how you feel — the boom-and-bust cycle is what maintains sensitisation. Flares will happen; they aren't damage and they aren't failure. Sleep, stress and mood directly change pain sensitivity — that's neurophysiology, not psychology, and treating them lowers pain."],
    ["Build capacity & confidence", 10, 16,
     "Build real strength and aerobic capacity, and re-approach the movements you've been avoiding.",
     "strength and fitness improving, doing things you'd stopped doing, flares manageable",
     "Aerobic exercise is the best-evidenced treatment for widespread pain. Graded exposure to feared movements retrains the alarm — that's the mechanism, and avoidance is what keeps it sensitised."],
    ["Long-term self-management", 16, 20,
     "Build a life that works, with a plan for flares.",
     "back to what matters to you, a flare plan you can use, activity sustained",
     "The realistic goal is a good life with manageable pain rather than no pain — and aiming at function usually reduces the pain more than aiming at the pain does. Keep going through flares at a reduced level rather than stopping."]] });
add({ r: "delayed-onset muscle soreness|\\bdoms\\b", label: "Delayed-onset muscle soreness (reconditioning)",
  total: 4, freq: "Keep moving gently — this resolves on its own",
  note: "DOMS is the muscle soreness that peaks 24–72 hours after unfamiliar exercise, especially anything with a lot of lowering (eccentric) work. It's a normal adaptive response to a new stimulus, not an injury and not a sign you damaged anything. The reassuring part: it protects you — do the same session again and you'll get much less soreness, an effect that lasts weeks.",
  variants: PACE,
  ph: [
    ["Understand it & keep moving", 0, 1,
     "Recognise it for what it is and keep moving gently.",
     "soreness peaking and starting to settle, moving comfortably, no alarming symptoms",
     "This is normal and harmless. But know the one dangerous mimic: if the soreness is severe and out of proportion, the limb is swollen, and your urine turns dark or cola-coloured, that's RHABDOMYOLYSIS — muscle breaking down and damaging the kidneys — and it's a medical emergency. Ordinary DOMS is symmetrical, proportionate, and never changes your urine."],
    ["Active recovery", 1, 2,
     "Move gently — light activity eases it faster than rest.",
     "soreness settling, full range returning, comfortable with daily activity",
     "Light activity, gentle movement and a warm-up all reduce it temporarily. Almost nothing has strong evidence for preventing it — not stretching, not ice baths, not massage (though massage does help it feel better). Time is the treatment."],
    ["Return to training", 2, 3,
     "Return to training, adjusting the load rather than avoiding it.",
     "back to training, soreness resolved, load adjusted sensibly",
     "Train the same movement again sooner rather than later — the repeated-bout effect means the second session causes far less soreness and builds the protection. Don't add another big new stimulus on top while you're still very sore."],
    ["Prevent the next big bout", 3, 4,
     "Build load sensibly so it doesn't happen every time.",
     "training consistently, load progressing sensibly, soreness proportionate",
     "The cause is a sudden jump in unfamiliar load, so build up by roughly 10% a week and introduce new exercises gradually. Some soreness after genuinely new work is normal and fine — being unable to walk down stairs for four days is a sign you jumped too far."]] });

/* ---------------- misc MSK ---------------- */
add({ r: "leg length discrepancy|leg-length discrepancy|limb length discrepancy", label: "Leg length discrepancy management",
  total: 14, freq: "Daily strength and gait work; any shoe raise introduced gradually",
  note: "A difference in leg length is extremely common — most people have one, and differences under about 2cm usually cause no problems at all and need nothing. The important distinction is between a TRUE difference (the bones really are different lengths) and an APPARENT one (the bones are equal but a tilted pelvis, a tight muscle or a stiff joint makes them behave unequally) — because a shoe raise fixes the first and makes the second worse.",
  variants: PACE,
  ph: [
    ["Work out which kind it is", 0, 3,
     "Establish whether this is a true structural difference or an apparent one.",
     "true versus apparent difference established, the amount measured properly, a plan agreed",
     "Get it measured properly rather than eyeballed — apparent differences from a tilted pelvis or a stiff hip are commoner than true ones, and putting a raise under an apparent difference locks in the problem. Differences under 2cm rarely need anything at all."],
    ["Address the apparent component", 3, 7,
     "Treat whatever is making the legs behave unequally — stiffness, tightness, or a pelvic tilt.",
     "hip and spinal mobility improved, pelvic position more level, walking more symmetrical",
     "Fix the flexible component first and re-measure. A great deal of 'leg length difference' disappears once a stiff hip or a tight side is treated."],
    ["Strength & symmetrical loading", 7, 11,
     "Build strength and retrain symmetrical loading through both legs.",
     "strength more symmetrical, walking more even, less one-sided loading",
     "Long-standing asymmetry means one side has been doing more for years — the weakness that results is often the actual source of the symptoms, rather than the length difference itself."],
    ["Shoe raise if needed & long-term", 11, 14,
     "Introduce a shoe raise gradually if there's a genuine structural difference.",
     "raise tolerated if used, walking comfortably, symptoms resolved",
     "Introduce a raise GRADUALLY — a quarter of the difference at a time, over weeks. Correcting a long-standing difference all at once reliably causes back and hip pain, because the whole system has adapted around it. Full correction isn't always the goal; comfort is."]] });
add({ r: "spring ligament insufficiency|spring \\(calcaneonavicular\\) ligament (insufficiency|failure)", label: "Spring ligament insufficiency",
  total: 20, freq: "Daily foot and calf strengthening + orthotic support",
  note: "The spring ligament is the hammock that holds up the arch of the foot from underneath. When it fails, the arch collapses and the foot rolls in and flattens — and it rarely fails alone, because the tibialis posterior tendon is usually failing at the same time. Together they cause the adult acquired flatfoot, and catching it while the foot is still flexible is what determines whether this is a rehab problem or a surgical one.",
  variants: PACE,
  ph: [
    ["Support the arch & settle", 0, 4,
     "Get the arch supported and settle the irritation.",
     "orthotic support in place, pain settling, walking more comfortably",
     "Get proper arch support early — this is one of the few foot problems where an orthotic genuinely changes the outcome rather than just the symptoms, because it takes load off a failing structure while you strengthen it. Check whether the foot is still FLEXIBLE (the arch reappears when you tiptoe or the foot is unloaded): a flexible foot responds to rehab, while a rigid one has passed that point and needs a surgical opinion. Avoid barefoot walking on hard floors and unsupportive shoes."],
    ["Tibialis posterior & foot strengthening", 4, 10,
     "Strengthen the tibialis posterior and the small muscles of the foot — the active support for the arch.",
     "able to do a single-leg heel raise, arch better supported, foot strength improving",
     "The tibialis posterior is the muscle that holds the arch up dynamically, and strengthening it is the core of this. The single-leg heel raise is both the test and the exercise — being unable to do one, or losing the arch when you try, is the classic sign."],
    ["Progressive loading & gait", 10, 16,
     "Build load tolerance and retrain how you walk.",
     "walking further comfortably, heel raises with good control, better foot position when walking",
     "Build gradually. Watch the arch during loading: if it collapses, the load is beyond what it can currently support."],
    ["Return to activity & long-term support", 16, 20,
     "Return to activity with the arch supported long-term.",
     "back to your activities, arch supported, strength maintained",
     "The orthotic is usually long-term — the ligament doesn't regenerate, so the support and the strength are what hold the arch. If the foot becomes rigid, or deformity progresses despite good rehab, that's a surgical conversation and worth having before the foot stiffens."]] });

/* ---------------- body-region rehabilitation catch-alls ---------------- */
/* Deliberately full-phrase regexes: `shoulder rehabilitation` (23 chars) can only
   match a name containing that exact phrase. The two names that DO contain it —
   "Post-mastectomy shoulder rehabilitation" and "Head & neck cancer neck/shoulder
   rehabilitation" — are matched LONGER by their own plans in part 7, so they win.
   Verified by the shadow/route probes. */
A.regionGeneral = (s) => ({
  total: 14, freq: "Daily home work + 1–2 supervised sessions/week early on",
  note: `A general ${s.part} rehabilitation programme. Without a specific diagnosis this follows the pathway that suits almost every ${s.part} problem: settle it, restore movement, rebuild strength, then return to full load. If you know the specific diagnosis, choose it instead — the timeline and the restrictions will be more precise.`,
  variants: PACE,
  ph: [
    ["Settle symptoms & restore early movement", 0, 3,
     `Calm the ${s.part} down and restore comfortable early movement.`,
     "pain settling at rest and at night, comfortable early range, daily tasks manageable",
     `Reduce — don't stop — the activity that aggravates it. Complete rest de-conditions the area and slows recovery.${s.extra}`],
    ["Restore full range & normal use", 3, 6,
     `Regain full range and normal everyday use of the ${s.part}.`,
     "full or near-full pain-free range, using it normally for daily tasks",
     "Movement is the priority in this phase. Pain up to a mild level during movement that settles quickly is acceptable; pain that's worse the next day means you did too much."],
    ["Progressive strengthening", 6, 11,
     `Rebuild strength and control through the ${s.part}'s full range.`,
     "strength approaching the other side, minimal day-to-day symptoms, tolerating daily loads",
     "This phase determines the outcome, and it's the one most often cut short. Strength is what stops the problem returning — stopping when the pain goes is the commonest reason people relapse."],
    ["Return to full activity & prevention", 11, 14,
     "Restore full capacity and return to your work and sport demands.",
     "strength near-symmetrical, tolerating your full activity without a next-day flare",
     "Build volume by about 10% per week and keep a maintenance routine. Address whatever overloaded it — the training spike, the technique, the workstation — or it recurs."]
  ]
});
[["Shoulder rehabilitation", "shoulder rehabilitation", "shoulder", " Avoid repeated overhead work while it's irritable, and don't sleep on that side if it wakes you."],
 ["Cervical spine rehabilitation", "cervical spine rehabilitation", "neck", " Keep the neck moving gently — collars and rest make neck pain worse, not better. Get urgent review for arm weakness, clumsy hands or unsteady walking."],
 ["Lumbar spine rehabilitation", "lumbar spine rehabilitation", "lower back", " Keep moving and walk little and often — bed rest is actively harmful for back pain. Get urgent review for bladder or bowel changes, or numbness in the saddle area."],
 ["Hip rehabilitation", "hip rehabilitation", "hip", " Avoid prolonged sitting in low chairs and deep hip flexion while it's irritable."],
 ["Knee rehabilitation", "knee rehabilitation", "knee", " Swelling after activity is the most reliable signal that you did too much — let it guide you. Avoid deep squatting and kneeling while it's irritable."],
 ["Ankle rehabilitation", "ankle rehabilitation", "ankle", " Balance and proprioception work is what prevents the next ankle problem — it's the part most often skipped."]
].forEach(([label, r, part, extra]) => add({ r, label, ...A.regionGeneral({ label, part, extra }) }));

/* ---------------- occupational & sport-specific overuse ---------------- */
A.occOveruse = (s) => retime({
  total: 14, freq: "Daily mobility + strengthening 3×/week, alongside fixing the actual exposure",
  note: `${s.what} ${s.prog} The exposure that caused it is part of the treatment: if the load, technique or set-up doesn't change, the problem comes back with the job.`,
  variants: PACE,
  ph: [
    ["Settle & change the exposure", 0, 3,
     `Settle the symptoms and change what's causing them${s.act ? ` — ${s.act}` : ""}.`,
     "symptoms settling, the aggravating exposure modified, working more comfortably",
     `Modify the load rather than stopping altogether — complete rest de-conditions the tissue and makes returning harder. ${s.restrict}`],
    ["Restore movement & capacity", 3, 7,
     `Restore comfortable movement and begin loading the ${s.part}.`,
     "comfortable range, tolerating early loading, symptoms easing through the working day",
     "Build tolerance progressively. Symptoms that settle by the next morning are acceptable; symptoms worse the next day mean you did too much."],
    ["Progressive strengthening & endurance", 7, 11,
     `Build the strength and endurance the ${s.part} needs for your actual demands.`,
     "clear strength gains, sustaining your work demands, symptoms infrequent",
     "Match the training to the real demand: if the job is repetitive and sustained, train endurance; if it's heavy, train strength. Micro-breaks through the day do more than any single exercise session."],
    ["Return to full demands & prevention", 11, 14,
     "Return to full work or sport demands with the exposure managed.",
     "full demands tolerated, ergonomics or technique addressed, a maintenance routine",
     `Fix the cause or it returns. ${s.prevent}`]
  ]
}, s.total);
const OCC_LBP = [
  ["Rower's low-back pain", "rower'?s low-back|rowing low-back|rower'?s back", "repeated loaded flexion at the catch, and long training volumes",
   "Rowing loads the lower back in a flexed position thousands of times per session. Reduce volume on the ergometer specifically — it's harder on the back than water rowing — and get the catch position and the sequencing coached."],
  ["Golfer's low-back pain", "golfer'?s low-back|golf.*low-back|golfer'?s back", "the rotational load of the swing, and carrying the bag",
   "The golf swing loads the lower back in rotation and side-bending under speed. Hip and thoracic rotation is what protects the lumbar spine — if they don't turn, the low back does it instead. Get the swing looked at, and use a trolley."],
  ["Equestrian's low-back pain", "equestrian'?s low-back|horse riding.*back|rider'?s low-back", "the repeated impact and asymmetry of riding",
   "Riding loads the spine with repeated small impacts and a lot of asymmetry. Check the saddle fit and your own symmetry — riders commonly sit crooked without knowing. Core endurance and hip mobility protect the back here."],
  ["Long-haul-driver's low-back pain", "long-haul-driver'?s low-back|driver'?s low-back|driving low-back", "prolonged sitting with whole-body vibration",
   "Prolonged sitting plus whole-body vibration is a genuinely established risk for back pain — it's not just the sitting. Break the journey and get out every couple of hours, set the seat up properly (lumbar support, seat height, close enough not to reach), and a seat cushion that damps vibration genuinely helps."],
  ["Nursing-related low-back injury", "nursing-related low-back|nurse'?s low-back|nursing low-back", "repeated patient handling and awkward lifting",
   "Patient handling is the highest-risk manual task there is, because the load is heavy, unpredictable and can't be held close. Use the equipment every time — hoists and slide sheets exist for this reason — and never lift a patient alone because it's quicker."],
  ["Warehouse lifting low-back injury", "warehouse lifting low-back|warehouse low-back|manual-handling low-back", "repeated lifting, especially with twisting or from floor level",
   "Lifting itself doesn't damage backs — but sudden increases in lifting volume, twisting under load, fatigue and lifting from floor level all raise the risk. Keep the load close, avoid twisting, and get the shelf heights right so nothing lives on the floor."]
];
OCC_LBP.forEach(([label, r, act, restrict]) => add({ r, label,
  ...A.occOveruse({ part: "lower back", act,
    what: `Low back pain related to ${act}.`,
    prog: "Back pain related to work or sport is rarely a sign of damage — it's usually a load-tolerance problem, and the back is far more robust than it feels. Staying at work with modifications produces better outcomes than signing off and resting.",
    restrict: "Keep working and keep moving if you possibly can — staying active and at work (with modifications) produces better outcomes than rest, and rest is now known to be one of the worst things for back pain. Get urgent review for bladder or bowel changes, saddle numbness, or progressive leg weakness.",
    prevent: "Build genuine capacity — a stronger back tolerates more — and manage the total load. Fatigue is when injuries happen.", total: 12 }) }));
add({ r: "cricket fast-bowler'?s lumbar|fast bowler'?s lumbar|fast-bowler'?s (lumbar|back)", label: "Cricket fast-bowler's lumbar stress",
  ...(() => { const b = A.occOveruse({ part: "lower back", act: "the extreme extension and rotation of the bowling action",
      what: "", prog: "", restrict: "", prevent: "", total: 20 });
    b.note = "Low back pain in a fast bowler is a different problem from ordinary back pain, and it must be treated as such: lumbar bone stress injury (a pars stress fracture) is very common in fast bowlers, especially adolescents, because the action combines extreme extension, rotation and side-bending under high load. Persistent one-sided back pain in a fast bowler is a stress fracture until proven otherwise.";
    b.ph[0][0] = "Stop bowling & get imaged";
    b.ph[0][3] = "Stop bowling and get properly imaged — this is not a wait-and-see problem.";
    b.ph[0][4] = "bowling stopped, MRI obtained, a diagnosis rather than an assumption";
    b.ph[0][5] = "STOP BOWLING and get an MRI. One-sided low back pain in a fast bowler is a bone stress injury until proven otherwise, and bowling through it turns a stress reaction that heals in weeks into a fracture that takes many months. This is one of the few settings where genuine rest from the specific activity is essential rather than harmful.";
    b.ph[1][0] = "Bone healing & trunk conditioning";
    b.ph[1][5] = "Bone stress needs genuine time off the aggravating load — usually 3 months or more for an established fracture. AVOID loaded extension and rotation. Keep general fitness going with running and non-extension work.";
    b.ph[2][5] = "Address the real causes: a mixed bowling action (where the shoulders and hips counter-rotate) massively raises the risk, and so does bowling workload — overs bowled per week and the sudden increases between seasons. Hip and thoracic mobility protect the lumbar spine.";
    b.ph[3][5] = "Return to bowling is a graded programme counted in balls per session, over months — not a decision. Get the action screened and the workload monitored, or it recurs. Adolescent bowlers need strict workload limits; this is the age it happens.";
    return b; })() });
const OCC_MISC = [
  ["Delivery / warehouse shoulder overuse", "delivery-driver'?s shoulder|delivery driver.*shoulder|warehouse overhead-lift shoulder", "shoulder",
   "repeated lifting, reaching into vehicles and overhead placement",
   "Repetitive overhead and reaching-forward loads with awkward, heavy parcels.",
   "Reaching into a van at arm's length multiplies the load on the shoulder enormously compared with holding the same parcel close — get the load close before you lift it, and use the vehicle's step rather than reaching up.",
   "Rotator cuff and scapular endurance is what tolerates repetitive overhead work. Fix the reaching technique and the vehicle set-up.", 14],
  /* NB: no `carpet.?layer` alternative — the existing "Miner's / carpet-layer's
     beat knee" plan owns that name and is the better home for it. */
  ["Construction-worker's knee (kneeling)", "construction-worker'?s knee|construction worker.*knee|kneeling knee", "knee",
   "prolonged kneeling and squatting",
   "Prolonged kneeling irritates the tissue in front of the kneecap and loads the joint surfaces heavily.",
   "Knee pads are the single most effective intervention and are treatment rather than PPE box-ticking. A hot, red, swollen, exquisitely tender lump in front of the kneecap may be an infected bursa and needs same-day assessment.",
   "Break up kneeling time, use pads always, and build quadriceps and hip strength — a strong leg tolerates kneeling far better.", 14],
  /* NB: deliberately does NOT match "prolonged-standing plantar heel pain" —
     that name is plantar heel pain and the curated "Plantar fasciitis" plan owns
     it. A `prolonged-standing (plantar )?heel` alternative here matched 31
     chars vs curated's 12 and hijacked it. Caught by the shadow guard. */
  ["Retail-worker's foot pain", "retail-worker'?s foot|retail worker.*foot", "foot",
   "prolonged standing on hard floors",
   "Standing all day on hard floors loads the heel and arch continuously with no recovery between steps.",
   "Footwear and an anti-fatigue mat do more here than any exercise — hard floors are the cause. Shift your weight, and use any chance to sit.",
   "Calf and foot strengthening builds tolerance; footwear and floor surface reduce the load. Both are needed.", 14],
  ["Musician's focal upper-limb overuse", "musician'?s focal upper-limb|musician'?s (overuse|upper-limb)|violinist'?s neck|instrumentalist overuse", "arm and hand",
   "long practice sessions, a sudden increase in practice, and sustained awkward postures",
   "Playing-related pain in musicians comes from sustained, highly repetitive, precise loading — often after a sudden increase in practice before an audition or exam.",
   "Do NOT simply stop playing — a musician's livelihood and identity are in their hands, and complete rest de-conditions the tissue and delays return. Reduce and modify instead. Watch for focal DYSTONIA, which is different: painless loss of control in one specific playing task. That needs specific treatment, and rest makes no difference to it.",
   "Practice load is the cause: build up gradually, take micro-breaks every 20–30 minutes, and get the technique and instrument set-up looked at. Sudden increases before performances are the classic trigger.", 16],
  ["Drummer's wrist overuse", "drummer'?s wrist|drumming wrist|percussion.*wrist", "wrist",
   "high-repetition drumming, especially after a change in grip, sticks or volume",
   "High-repetition, high-speed wrist loading, often after a change in technique, stick weight or playing volume.",
   "Modify the load rather than stopping. Check what changed — sticks, grip, kit height, playing surface or volume are the usual culprits, and heavier sticks or a new practice pad are common triggers.",
   "Grip and forearm endurance, sensible practice volume, and the right stick and kit set-up. Build up rather than jumping in before a tour.", 12],
  ["Hand-arm vibration syndrome", "hand-arm vibration|\\bhavs\\b|vibration white finger", "hand and arm",
   "using vibrating tools",
   "Hand-arm vibration syndrome is nerve, blood vessel and joint damage from prolonged use of vibrating tools — giving numb, tingling fingers, lost dexterity, and fingers that go white and painful in the cold.",
   "This one is genuinely different from an overuse injury: the damage is largely PERMANENT and the only effective treatment is stopping the exposure. Reducing vibration exposure is not an ergonomic nicety, it's the treatment. Keep the hands WARM — cold triggers the attacks. Stop smoking: nicotine constricts the same vessels and makes it markedly worse. This is a reportable industrial disease in many countries and your employer has legal duties around exposure limits.",
   "Exposure control is everything: tool selection, anti-vibration gloves, limiting trigger time, and keeping warm. Exercise maintains dexterity and grip but cannot reverse the damage — prevention is the whole game, including for the other hand.", 16]
];
OCC_MISC.forEach(([label, r, part, act, what, restrict, prevent, total]) =>
  add({ r, label, ...A.occOveruse({ label, part, act, what, prog: "", restrict, prevent, total }) }));
add({ r: "overtraining syndrome|overuse syndrome|multisport overtraining|marathoner'?s overuse|triathlete'?s overtraining|unexplained underperformance", label: "Overtraining syndrome / relative energy deficiency",
  total: 24, freq: "REST first. Then a slow, structured rebuild — the opposite of your instinct",
  note: "Overtraining syndrome is a state of long-term underperformance and fatigue caused by training load exceeding recovery for months — and the cruel part is that the athlete's instinct, to train harder because performance is dropping, is exactly what deepens it. Underneath it, very often, is simply not eating enough for the training being done (relative energy deficiency), which disrupts hormones, bone and immune function.",
  variants: [
    { k: "standard", label: "Overreaching / early", sub: "Weeks of underperformance", scale: 0.6,
      note: "Caught at the overreaching stage, a week or two of genuine rest usually restores performance completely. This is the stage worth catching." },
    { k: "established", label: "Established overtraining", sub: "Months of underperformance", pick: "chronic|established|months|syndrome", scale: 1,
      note: "Established overtraining syndrome takes months to recover — often 3–6, sometimes longer. There is no shortcut, and every attempt to shortcut it extends it." },
    { k: "reds", label: "With low energy availability (RED-S)", sub: "Under-eating for the training load", pick: "red-s|reds|energy deficien|amenorrh|\\breda\\b", scale: 1.3,
      note: "If energy availability is low, no amount of rest fixes this until the eating changes — that's the actual cause, and training is just what exposed it. This needs proper assessment: bone density, hormones and, where relevant, a specialist eating-disorder or sports-medicine team." }
  ],
  ph: [
    ["Stop, investigate & rest properly", 0, 4,
     "Stop training and get the other causes excluded — this diagnosis is made by exclusion.",
     "other causes excluded, genuinely resting, sleep improving, eating adequately",
     "Get the mimics excluded FIRST: anaemia, iron deficiency, thyroid disease, glandular fever, coeliac disease, diabetes and depression all look exactly like this and are all treatable. Then rest — properly, not 'easy training'. This is one of the few conditions where genuine rest is the treatment rather than the enemy. Are you eating enough? Under-eating for your training load is the commonest driver, and it also thins bone and stops periods."],
    ["Rest, sleep & fuel", 4, 10,
     "Prioritise sleep and eating, and stay away from structured training.",
     "sleeping well, weight and energy stable, mood improving, resting heart rate normalising",
     "Sleep and food are the treatment in this phase. Resist the urge to 'just keep ticking over' — that's what turns a 6-week problem into a 6-month one. Track how you feel rather than what you did."],
    ["Very gradual reintroduction", 10, 18,
     "Reintroduce training very gradually, guided by how you recover rather than by a plan.",
     "tolerating light training with normal recovery, mood and sleep stable, performance beginning to return",
     "Start far lighter than feels reasonable and progress only if you recover well from each step. Any return of the fatigue, mood change or poor sleep means drop back — those are the markers, not your times."],
    ["Return to full training & prevention", 18, 24,
     "Return to full training with recovery and fuelling built into the plan.",
     "back to full training, performance restored, recovery and nutrition planned deliberately",
     "Prevention is structural: planned rest weeks, adequate fuelling, sleep, and monitoring load rather than just adding to it. Recurrence is common in athletes who return to the same pattern that caused it — the training plan has to change, not just the athlete."]] });

/* ---------------- paediatric MSK ---------------- */
A.pedsMsk = (s) => retime({
  total: 12, freq: "Play-based activity; monitoring rather than daily exercises for most of these",
  note: `${s.what} ${s.prog}`,
  variants: PACE,
  ph: [
    ["Assess, reassure & monitor", 0, 4,
     "Get it properly assessed, understand what's normal, and start monitoring.",
     "assessed and the diagnosis clear, family reassured or referred appropriately, monitoring arranged",
     `${s.restrict}`],
    ["Keep active & watch", 4, 8,
     "Keep the child active and normal, and watch for the features that would change the plan.",
     "child active and participating normally, no concerning features developing",
     "Keep them running, playing and normal — restricting a child's activity for a condition that needs no restriction does real harm to their strength, bone and confidence. Watch rather than treat."],
    ["Strength & function if needed", 8, 10,
     "Add strengthening and functional work only if there's an actual functional problem.",
     "strength and function good, keeping up with peers",
     "Treat a problem, not a picture — if the child is running, playing and keeping up, the appearance rarely needs treating."],
    ["Review & long-term", 10, 12,
     "Review as they grow.",
     "resolving as expected, or referred on if not",
     `${s.review}`]
  ]
}, s.total);
[["Metatarsus adductus", "metatarsus adductus",
  "Metatarsus adductus is a foot where the front half curves inward, present from birth — it's the commonest foot difference in newborns.",
  "The great majority resolve completely on their own without any treatment, especially if the foot is flexible enough to be straightened by hand.",
  "Check flexibility: if the foot straightens easily with gentle handling, it will almost certainly resolve on its own — most do by school age. A RIGID foot that won't correct needs an orthopaedic opinion and may need casting, which works best in the first few months. Special shoes and braces do not help the flexible kind.",
  "Most resolve by around 4–5 years. Hip screening matters too, since hip dysplasia is more common in babies with this."],
 ["Genu valgum (knock knees)", "genu valgum|knock knees",
  "Knock knees, where the knees touch and the ankles don't.",
  "This is a NORMAL developmental stage: children are typically most knock-kneed around age 3–5 and then straighten out on their own by about 7. It's a phase, not a deformity.",
  "This is normal development and needs no treatment in the typical age range — no braces, no special shoes, no exercises. Refer if: it's asymmetric (one side only), it's severe, it's getting worse after age 7, the child is very short, or it's painful — those suggest an underlying cause like rickets or a growth-plate problem, which is a different matter entirely.",
  "Reassess if it hasn't improved by about 7–8 years, or if any concerning feature appears. Otherwise this simply resolves."],
 ["Genu varum (bow legs)", "genu varum|bow legs|bowed legs",
  "Bow legs, where the knees stay apart when the feet are together.",
  "This is NORMAL in babies and toddlers — nearly all children are bow-legged until about age 2, then swing through to knock knees, then straighten. It's a developmental sequence.",
  "Normal under about 2 years and needs nothing. Refer if: it's getting WORSE after age 2, it's one-sided, it's severe, the child is short for their age, or there's a limp or pain. Blount's disease and rickets both present this way and both need treating — Blount's in particular worsens rather than resolves, so a bow leg that isn't improving by 2 is the one to check.",
  "Expect it to correct by about age 2–3. Anything progressing after that needs orthopaedic assessment."],
 ["Congenital vertical talus", "congenital vertical talus|rocker-bottom foot",
  "Congenital vertical talus is a rigid flatfoot present from birth, with the sole convex — a 'rocker-bottom' shape — because one of the ankle bones is dislocated and pointing downward.",
  "This one is genuinely different from the benign paediatric foot conditions: it does NOT resolve on its own and it always needs treatment. Early gentle casting (the Dobbs method) followed by a small surgical procedure gives good results, and starting early matters.",
  "This needs prompt specialist referral — it is a true dislocation, not a flexible flatfoot, and it will not correct itself. Treatment starts in the first months of life and outcomes are much better when it does. It is frequently associated with other conditions, so the child needs a full assessment rather than just a foot one.",
  "Long-term orthopaedic follow-up is needed through growth, and bracing after correction is what prevents it recurring."]
].forEach(([label, r, what, prog, restrict, review]) => add({ r, label, ...A.pedsMsk({ label, what, prog, restrict, review, total: 12 }) }));

/* The generic family catch-alls MUST stay last: they are flagged generic and can
   never outrank the specific plans above, but reading order keeps that obvious. */
const G = (r, label, body) => add({ r, label, generic: true, ...body });
G("tendinopath|tendinitis|tendinosis|tendonitis|tenosynovit", "Tendinopathy",
  A.tendinopathy({ label:"Tendinopathy", part:"affected tendon", act:"the repetitive load that brought it on", slow:false, extra:"" }));
G("\\bsprain\\b|ligament (injury|tear|rupture)", "Ligament sprain",
  A.sprain({ label:"Ligament sprain", part:"joint", extra:"" }));
G("\\bstrain\\b|muscle (tear|pull|rupture)|myofascial", "Muscle strain",
  A.strain({ label:"Muscle strain", part:"muscle", extra:"" }));
G("\\bcontusion\\b|\\bbruis|haematoma|hematoma", "Muscle contusion",
  A.contusion({ label:"Contusion", part:"muscle", extra:"" }));
G("osteoarthritis|osteoarthrosis|\\bdjd\\b|degenerative (joint|arthritis)|arthrosis", "Osteoarthritis",
  A.oa({ label:"Osteoarthritis", part:"joint", extra:"" }));
G("bursit|bursopath", "Bursitis",
  A.bursitis({ label:"Bursitis", part:"joint", act:"the position that compresses it", extra:"" }));
G("entrapment|neuropath|nerve (compression|irritation|injury|palsy)|neuralgia|neuritis", "Nerve entrapment",
  A.nerve({ label:"Nerve entrapment/compression", part:"affected limb", act:"the sustained position that compresses it", extra:"" }));
G("instabilit|dislocat|sublux", "Joint instability",
  A.instability({ label:"Joint instability", part:"joint", extra:"stay out of the position where it feels like it will give way" }));
G("apophysit|growth plate|\\bphysis\\b|osgood|traction apophys", "Apophysitis (growth plate)",
  A.apophysitis({ label:"Apophysitis", part:"growth plate", act:"sport volume", extra:"" }));
G("impingement|pinch", "Impingement",
  A.impingement({ label:"Impingement", part:"joint", act:"the end-range position that pinches", extra:"" }));
G("(stiffness|contracture|frozen|ankylos|reduced range)", "Joint stiffness",
  A.stiffness({ label:"Joint stiffness", part:"joint", extra:"" }));
G("arthritis|arthropath", "Inflammatory arthritis",
  A.systemic({ label:"Arthritis", part:"joints", extra:"" }));
G("weakness|deconditio|atrophy|disuse", "Weakness & deconditioning",
  A.oa({ label:"Weakness / deconditioning", part:"affected area", extra:"" }));

const banner = "/* AUTO-GENERATED by scripts/generate-plans.mjs — do not edit by hand.\n" +
  "   Realistic rehab timelines (phase windows + milestones + restrictions) for the\n" +
  "   long tail of the condition catalogue. `r`/`pick` are regex SOURCE strings,\n" +
  "   compiled in app.js. Curated REHAB_PLANS in app.js take precedence. */\n";
writeFileSync(OUT, banner + "window.PLAN_DEFS = " + JSON.stringify(out) + ";\n");
console.log(`Wrote ${out.length} generated rehab plans to ${OUT}`);
