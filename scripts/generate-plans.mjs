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
  out.push(plan);
};

/* shared variant sets ---------------------------------------------------- */
const PACE = [
  { k:"standard", label:"Standard", sub:"The usual criteria-based pathway", scale:1 },
  { k:"accelerated", label:"Accelerated", sub:"Progressing excellently, well supervised", scale:0.75,
    note:"Accelerated: only if you're progressing excellently with good control and no swelling — the criteria still decide, not the dates." },
  { k:"conservative", label:"Conservative", sub:"Slower healer, complications, or extra caution", scale:1.35,
    note:"Conservative: suits complications, other injuries alongside, older age, smoking or diabetes — all of which genuinely slow healing." }
];
const GRADES = (mild, mod, sev) => ([
  { k:"g1", label:"Grade I (mild)", sub:mild, pick:"grade (i|1)\\b", scale:0.45 },
  { k:"g2", label:"Grade II (moderate)", sub:mod, pick:"grade (ii|2)\\b", scale:1 },
  { k:"g3", label:"Grade III (severe)", sub:sev, pick:"grade (iii|3)\\b", scale:1.9,
    note:"Grade III (complete) tears take substantially longer and warrant assessment — some need a surgical opinion." }
]);
const TENDON_VARIANTS = [
  { k:"reactive", label:"Reactive (recent)", sub:"Came on in the last few weeks after a load spike", pick:"acute|early|reactive", scale:0.7,
    note:"Reactive tendon pain settles faster — cut the load spike that caused it, keep loading, and it often calms in 6–12 weeks." },
  { k:"standard", label:"Persistent (months)", sub:"Grumbling for a few months", scale:1 },
  { k:"degenerative", label:"Long-standing / degenerative", sub:"A year or more, thickened tendon", pick:"chronic|degenerat|long-?standing", scale:1.5,
    note:"Long-standing degenerative tendons are slower and need consistent heavy-slow loading for 6+ months; expect a good but gradual response." },
  { k:"postinj", label:"After a steroid injection", sub:"Injected recently", pick:"injection", scale:1.2,
    note:"After a corticosteroid injection the tendon is temporarily weaker — pain relief is short-term and long-term outcomes are WORSE than loading alone, so avoid heavy loading for ~2 weeks then rebuild carefully." }
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
add({ r:"pectoralis major (tear|rupture)|pec major (tear|rupture)", label:"Pectoralis major tear",
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
add({ r:"charcot (foot|arthropath|neuroarthropath)|charcot", label:"Charcot foot (neuroarthropathy)", total:52,
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
  ["Hamstring graft recovery", "hamstring (autograft|graft)", "knee", 39,
   "With a hamstring graft, hamstring strength lags for months — deep-knee-flexion hamstring strength especially. Don't rush eccentric hamstring loading in the first 12 weeks."],
  ["Quadriceps tendon graft recovery", "quadriceps (tendon )?(auto)?graft", "knee", 39, ""],
  ["Tendon transfer recovery", "tendon transfer", "limb", 26,
   "A transferred tendon has to be re-learned as well as healed — protect it early, then retrain the new movement pattern deliberately."],
  ["Joint fusion (arthrodesis) recovery", "arthrodesis|joint fusion|fusion recovery", "joint", 26,
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

/* ---------------- generic archetype catch-alls ----------------
   Marked generic:true, so ANY specific plan above (or a curated plan in app.js)
   outranks them in detectPlan. These give the long tail of named diagnoses a
   realistic, archetype-appropriate timeline instead of the flat template. */
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
