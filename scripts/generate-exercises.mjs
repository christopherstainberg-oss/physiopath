/* =====================================================================
   PhysioPath — exercise library generator
   Produces data/exercises.js -> window.EXERCISES = [ ... ]
   Each entry: { id, name, region:[..], pattern, equipment, difficulty(1-4),
                 tags:[..], dose, cue }
   Variance comes from base movements × equipment × modifiers (load, stance,
   tempo, position, surface, range). Tags feed the contraindication engine.
   Educational content only.
===================================================================== */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = `${__dirname}/../data/exercises.js`;

const T = { impact:"impact", valsalva:"valsalva", overhead:"overhead", flexLoad:"spine_flexion_load",
  ext:"spine_extension", deepHipFlex:"deep_hip_flexion", hipAddIR:"hip_add_ir", balance:"balance",
  highInt:"high_intensity", supine:"supine_flat", prone:"prone", inversion:"inversion",
  endNeck:"end_range_neck", wb:"weight_bearing", grip:"grip_isometric", breath:"breath_hold", aerobic:"aerobic" };

/* Equipment: [display prefix, extra tag hints] */
const EQUIP = {
  bw:["",[]], db:["Dumbbell",[]], kb:["Kettlebell",[]], bb:["Barbell",[T.valsalva]],
  band:["Band",[]], cable:["Cable",[]], mach:["Machine",[]], mb:["Med-ball",[]],
  trx:["Suspension",[]], sb:["Sandbag",[T.valsalva]]
};

/* Base movements. tags = always-on tags for this pattern. */
const BASES = [
  // ---- Lower body ----
  {b:"squat", pat:"squat", reg:["Knee","Hip"], tags:[T.wb], eq:["bw","db","kb","bb","band","mach"],
   mods:["","tempo","paused","1.5-rep","heel-elevated","box","goblet","front","overhead","split","Bulgarian split","single-leg","deep","partial-range","wall (isometric)","sumo"]},
  {b:"deadlift / hip hinge", pat:"hinge", reg:["Hip","Spine","Core"], tags:[T.wb], eq:["bw","db","kb","bb","band"],
   mods:["","Romanian","single-leg Romanian","tempo","paused","deficit","stiff-leg","good-morning","hip-hinge drill","staggered-stance"]},
  {b:"lunge", pat:"lunge", reg:["Knee","Hip"], tags:[T.wb,T.balance], eq:["bw","db","kb","bb"],
   mods:["forward","reverse","walking","lateral","curtsy","deficit","tempo","paused","deep","step-back"]},
  {b:"step-up", pat:"lunge", reg:["Knee","Hip"], tags:[T.wb,T.balance], eq:["bw","db","kb"],
   mods:["low","high","lateral","tempo","slow-eccentric (step-down)","crossover"]},
  {b:"bridge / hip thrust", pat:"hinge", reg:["Hip","Glute","Core"], tags:[], eq:["bw","db","kb","bb","band"],
   mods:["double-leg","single-leg","marching","tempo","paused (isometric)","feet-elevated","banded-abduction"]},
  {b:"calf raise", pat:"calf", reg:["Ankle","Calf"], tags:[T.wb], eq:["bw","db","mach"],
   mods:["double-leg","single-leg","seated (soleus)","off-step (eccentric)","paused (isometric)","bent-knee"]},
  {b:"hamstring curl", pat:"pull", reg:["Hip","Knee"], tags:[], eq:["band","mach","trx"],
   mods:["","slider","Nordic (eccentric)","single-leg","tempo","isometric hold"]},
  {b:"leg extension", pat:"push", reg:["Knee"], tags:[], eq:["band","mach"], mods:["","single-leg","tempo","terminal-range","isometric hold"]},
  {b:"hip abduction", pat:"push", reg:["Hip","Glute"], tags:[], eq:["bw","band","cable","mach"],
   mods:["side-lying","standing","clamshell","seated","banded-walk","tempo"]},
  {b:"hip adduction", pat:"pull", reg:["Hip"], tags:[T.hipAddIR], eq:["bw","band","cable","mach"], mods:["side-lying","Copenhagen","standing","seated","isometric squeeze"]},
  {b:"glute kickback", pat:"hinge", reg:["Hip","Glute"], tags:[], eq:["bw","band","cable"], mods:["quadruped","standing","tempo","pulse"]},
  {b:"box jump", pat:"plyo", reg:["Knee","Hip"], tags:[T.impact,T.highInt,T.wb], eq:["bw"], mods:["low","step-down landing","single-leg","lateral","depth (advanced)"]},
  {b:"hop / bound", pat:"plyo", reg:["Ankle","Knee"], tags:[T.impact,T.highInt,T.wb,T.balance], eq:["bw"], mods:["pogo","single-leg","lateral","forward","triple","stick-landing"]},
  {b:"single-leg balance", pat:"balance", reg:["Ankle","Knee","Balance"], tags:[T.balance], eq:["bw"],
   mods:["eyes-open","eyes-closed","on foam","on BOSU","with reach","with head turns","with perturbation","tandem"]},
  {b:"ankle mobility drill", pat:"mobility", reg:["Ankle"], tags:[], eq:["bw","band"], mods:["dorsiflexion","4-way band","alphabet","knee-to-wall","inversion/eversion"]},
  {b:"foot intrinsic exercise", pat:"mobility", reg:["Foot"], tags:[], eq:["bw"], mods:["short-foot","toe yoga","towel scrunch","toe spread","arch doming"]},
  {b:"wall sit", pat:"isometric", reg:["Knee","Hip"], tags:[T.wb], eq:["bw"], mods:["double-leg","single-leg","with band abduction","tempo (slide)"]},
  {b:"sled push / drag", pat:"carry", reg:["Full body","Hip","Knee"], tags:[T.wb,T.aerobic], eq:["sb"], mods:["forward push","backward drag","lateral"]},

  // ---- Upper body ----
  {b:"row", pat:"pull", reg:["Scapula/Upper back","Shoulder"], tags:[], eq:["db","kb","bb","band","cable","mach","trx"],
   mods:["seated","bent-over","single-arm","chest-supported","inverted","high (face-pull)","wide","tempo","paused"]},
  {b:"pull-down / pull-up", pat:"pull", reg:["Scapula/Upper back","Shoulder"], tags:[], eq:["band","cable","mach","trx"],
   mods:["lat pull-down","assisted pull-up","neutral-grip","wide-grip","straight-arm","scapular (activation)"]},
  {b:"chest press / push-up", pat:"push", reg:["Shoulder","Chest"], tags:[], eq:["bw","db","bb","band","cable","mach","trx"],
   mods:["flat","incline","decline","wall","knee","single-arm","tempo","paused","push-up-plus","close-grip"]},
  {b:"overhead press", pat:"push", reg:["Shoulder"], tags:[T.overhead,T.valsalva], eq:["db","kb","bb","band","cable"],
   mods:["seated","standing","single-arm","half-kneeling","Arnold","landmine","tempo","Z-press"]},
  {b:"lateral raise", pat:"push", reg:["Shoulder"], tags:[T.overhead], eq:["db","band","cable"], mods:["standing","seated","leaning","partial (below shoulder)","tempo"]},
  {b:"front raise", pat:"push", reg:["Shoulder"], tags:[T.overhead], eq:["db","band","cable","mb"], mods:["","alternating","plate","to-90°","tempo"]},
  {b:"rear-delt fly", pat:"pull", reg:["Scapula/Upper back","Shoulder"], tags:[], eq:["db","band","cable","mach"], mods:["bent-over","prone","seated","tempo"]},
  {b:"shoulder external rotation", pat:"pull", reg:["Shoulder"], tags:[], eq:["db","band","cable"], mods:["elbow-at-side","90/90","side-lying","in-scaption","tempo","isometric"]},
  {b:"shoulder internal rotation", pat:"push", reg:["Shoulder"], tags:[], eq:["db","band","cable"], mods:["elbow-at-side","90/90","side-lying","isometric"]},
  {b:"scaption / full-can raise", pat:"push", reg:["Shoulder"], tags:[T.overhead], eq:["db","band"], mods:["below-shoulder","full","tempo","isometric hold"]},
  {b:"scapular Y-T-W", pat:"pull", reg:["Scapula/Upper back","Shoulder"], tags:[T.prone], eq:["bw","db","band"], mods:["prone Y","prone T","prone W","wall","standing band"]},
  {b:"face pull", pat:"pull", reg:["Scapula/Upper back","Shoulder"], tags:[], eq:["band","cable"], mods:["","half-kneeling","seated","with external rotation"]},
  {b:"biceps curl", pat:"pull", reg:["Elbow","Forearm"], tags:[], eq:["db","kb","bb","band","cable"], mods:["","hammer","incline","reverse","concentration","tempo","21s"]},
  {b:"triceps extension", pat:"push", reg:["Elbow"], tags:[], eq:["db","band","cable"], mods:["overhead","kickback","skull-crusher","press-down","tempo"]},
  {b:"wrist curl / extension", pat:"pull", reg:["Wrist / Hand","Forearm"], tags:[], eq:["db","band"], mods:["wrist flexion","wrist extension","radial deviation","ulnar deviation","pronation/supination","eccentric","isometric"]},
  {b:"grip / carry", pat:"carry", reg:["Wrist / Hand","Forearm","Core"], tags:[T.grip], eq:["db","kb","sb"], mods:["farmer","suitcase (single-side)","overhead carry","front-rack carry","dead-hang","towel grip"]},
  {b:"shoulder pendulum / ROM", pat:"mobility", reg:["Shoulder"], tags:[], eq:["bw"], mods:["pendulum","cane-assisted flexion","wall walk","cross-body stretch","sleeper stretch","table slide"]},

  // ---- Core / spine ----
  {b:"plank", pat:"isometric", reg:["Core"], tags:[], eq:["bw","trx"], mods:["front","side","from-knees","long-lever","with reach","with leg-lift","RKC"]},
  {b:"dead bug", pat:"anti-ext", reg:["Core"], tags:[T.supine], eq:["bw","band"], mods:["","with band","weighted","slow tempo","contralateral"]},
  {b:"bird-dog", pat:"anti-rot", reg:["Core","Spine"], tags:[], eq:["bw","band"], mods:["","with band row","slow tempo","with reach","hover"]},
  {b:"Pallof press", pat:"anti-rot", reg:["Core"], tags:[], eq:["band","cable"], mods:["tall-kneeling","half-kneeling","standing","with step","overhead"]},
  {b:"spinal mobility drill", pat:"mobility", reg:["Spine","Thoracic/Upper back"], tags:[], eq:["bw"], mods:["cat-camel","open-book (thoracic rotation)","segmental cat-camel","thread-the-needle","seated rotation","foam-roller extension"]},
  {b:"anti-rotation chop / lift", pat:"rotate", reg:["Core"], tags:[], eq:["band","cable","mb"], mods:["high-to-low chop","low-to-high lift","horizontal","half-kneeling","standing"]},
  {b:"loaded carry (anti-lateral)", pat:"carry", reg:["Core","Grip"], tags:[T.grip], eq:["db","kb"], mods:["suitcase","farmer","waiter","bottoms-up"]},
  {b:"back extension", pat:"extension", reg:["Spine"], tags:[T.ext,T.prone], eq:["bw","band"], mods:["prone (Superman)","hip-extension only","45° bench","bird-dog hold","cobra"]},
  {b:"curl-up (trunk flexion)", pat:"flexion", reg:["Core"], tags:[T.flexLoad], eq:["bw","cable","mb"], mods:["McGill curl-up","reverse crunch","weighted crunch","cable crunch","V-up"]},

  // ---- Neck ----
  {b:"deep neck flexor drill", pat:"isometric", reg:["Neck"], tags:[], eq:["bw"], mods:["chin tuck","chin-tuck hold","supine nod","against-band","4-way isometric"]},
  {b:"cervical mobility", pat:"mobility", reg:["Neck"], tags:[T.endNeck], eq:["bw"], mods:["rotation","side-bend","flexion/extension","retraction","upper-trap stretch","levator stretch"]},

  // ---- Balance / gait / neuro ----
  {b:"weight-shift drill", pat:"balance", reg:["Balance","Core"], tags:[T.balance], eq:["bw"], mods:["side-to-side","forward-back","diagonal","with reach","on foam"]},
  {b:"gait drill", pat:"gait", reg:["Gait","Balance"], tags:[T.wb,T.balance], eq:["bw"], mods:["heel-to-toe (tandem walk)","braiding (grapevine)","backward walking","high-knee march","with head turns","obstacle stepping","dual-task"]},
  {b:"dynamic balance reach", pat:"balance", reg:["Balance","Hip","Knee"], tags:[T.balance], eq:["bw"], mods:["star-excursion","single-leg reach","multidirectional reach","on foam","with catch"]},

  // ---- Vestibular ----
  {b:"gaze stabilization", pat:"vestibular", reg:["Vestibular","Balance"], tags:[], eq:["bw"], mods:["VOR x1 (horizontal)","VOR x1 (vertical)","VOR x2","seated","standing","walking"]},
  {b:"habituation drill", pat:"vestibular", reg:["Vestibular"], tags:[], eq:["bw"], mods:["seated-to-standing","head-turn","bending","rolling","visual-motion tolerance"]},

  // ---- Cardio / conditioning / breathing ----
  {b:"walking program", pat:"cardio", reg:["Cardio","Full body"], tags:[T.aerobic,T.wb], eq:["bw"], mods:["flat continuous","interval","incline","brisk","Nordic (poles)","treadmill"]},
  {b:"cycling", pat:"cardio", reg:["Cardio"], tags:[T.aerobic], eq:["mach"], mods:["steady-state","interval","recumbent","low-resistance"]},
  {b:"rowing (ergometer)", pat:"cardio", reg:["Cardio","Full body"], tags:[T.aerobic], eq:["mach"], mods:["steady-state","interval","technique-focus"]},
  {b:"elliptical / cross-trainer", pat:"cardio", reg:["Cardio"], tags:[T.aerobic], eq:["mach"], mods:["steady-state","interval","forward","reverse"]},
  {b:"stair climbing", pat:"cardio", reg:["Cardio","Knee","Hip"], tags:[T.aerobic,T.wb], eq:["mach"], mods:["machine","real-stairs","interval"]},
  {b:"jogging / run progression", pat:"cardio", reg:["Cardio","Knee","Ankle"], tags:[T.aerobic,T.impact,T.highInt,T.wb], eq:["bw"], mods:["walk-run intervals","easy continuous","tempo","strides"]},
  {b:"swimming / aquatic", pat:"cardio", reg:["Cardio","Full body"], tags:[T.aerobic], eq:["bw"], mods:["freestyle","aqua-jogging","kickboard","aqua-therapy drills"]},
  {b:"breathing exercise", pat:"breathing", reg:["Breathing","Core"], tags:[], eq:["bw"], mods:["diaphragmatic","pursed-lip","segmental (rib)","paced","incentive-spirometry","box-breathing"]},
];

/* ---- generation ---- */
const out = [];
const seen = new Set();
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);

function deriveTags(name, base, extra){
  const l = name.toLowerCase();
  const t = new Set([...(base.tags||[]), ...extra]);
  if(/jump|hop|bound|pogo|depth|plyo|explosive|clap/.test(l)){ t.add(T.impact); t.add(T.highInt); t.add(T.wb); }
  if(/run|jog|sprint|stride|shuttle|agility/.test(l)){ t.add(T.impact); t.add(T.aerobic); t.add(T.highInt); }
  if(/overhead|snatch|jerk|full-can|scaption|waiter|z-press|arnold/.test(l)) t.add(T.overhead);
  if(/barbell|sandbag|deadlift|good-morning|front-rack|heavy/.test(l)) t.add(T.valsalva);
  if(/single-leg|pistol|bosu|foam|tandem|balance|perturbation|star-excursion|slackline|bottoms-up/.test(l)) t.add(T.balance);
  if(/crunch|sit-up|v-up|curl-up|trunk flexion/.test(l)) t.add(T.flexLoad);
  if(/superman|cobra|back extension|prone/.test(l)) { t.add(T.ext); }
  if(/prone/.test(l)) t.add(T.prone);
  if(/supine|dead bug/.test(l)) t.add(T.supine);
  if(/deep squat|pistol|deep lunge|deep$/.test(l)) t.add(T.deepHipFlex);
  if(/carry|farmer|suitcase|dead-hang|grip|hang/.test(l)) t.add(T.grip);
  if(base.pat==="cardio" && !/aqua|swim|cycl|recumbent/.test(l)) t.add(T.wb);
  if(base.pat==="cardio") t.add(T.aerobic);
  return [...t];
}
function difficulty(name, base){
  const l = name.toLowerCase();
  if(/plyo|jump|hop|bound|pogo|depth|sprint|explosive|nordic|pistol|single-leg romanian|clap|advanced/.test(l)) return 4;
  if(/single-leg|eccentric|deficit|deep|barbell|sandbag|long-lever|rkc|bottoms-up|tempo|paused|1\.5|z-press|copenhagen/.test(l)) return 3;
  if(/isometric|hold|activation|chin tuck|pendulum|rom|mobility|stretch|assisted|wall|from-knees|drill|segmental|pursed|diaphragm|incentive|short-foot|toe|seated nod/.test(l)) return 1;
  return 2;
}
const DOSE = {
  isometric:["4×20–45s hold","5×10s hold","3×30s hold"], mobility:["2–3×30s","2×10 each","3×10 slow"],
  balance:["3×30s","3×45s","3×30s each"], plyo:["3×6–10","4×5","3×8 each"],
  strength:["3×8–12","3×10","4×8","3×12"], carry:["3×20–40 m","4×30 s","3×2 lengths"],
  cardio:["15–25 min","10–20 min (intervals)","20–30 min"], vestibular:["3×1 min","2–3× day, 1 min","3×30–60s"],
  breathing:["3×1 min","5×6 breaths","2–3 min"], anti:["3×10 each","3×8 slow","3×12"],
  push:["3×8–12","3×10","3×12"], pull:["3×10–15","3×12","3×10 each"], hinge:["3×8–10","3×10","4×8"],
  squat:["3×8–12","3×10","4×8"], lunge:["3×8–10 each","3×10 each"], calf:["3×12–15","4×12","3×15"],
  extension:["3×10–12","3×12","3×15"], flexion:["3×10–12","3×12","3×15"], gait:["3×15–20 m","3×20 m","4×15 m"], rotate:["3×10 each","3×8 each","3×12 each"]
};
const CUE = {
  squat:"Knees track over toes; control the descent.", hinge:"Hinge from the hips, neutral spine, brace lightly.",
  lunge:"Vertical shin, controlled, knee stable.", calf:"Full range, slow lower.", push:"Controlled, full range, exhale on effort.",
  pull:"Lead with the elbow, squeeze, control the return.", isometric:"Hold steady, breathe normally.",
  mobility:"Slow and pain-free through range.", balance:"Steady near support; progress difficulty gradually.",
  plyo:"Soft, quiet landings; quality over quantity.", carry:"Tall posture, braced, even steps.",
  cardio:"Conversational pace unless intervals prescribed.", vestibular:"Provoke mild symptoms, then let them settle.",
  breathing:"Slow, relaxed; never hold your breath.", "anti-ext":"Keep the low back flat; move the limbs, not the spine.",
  "anti-rot":"Resist the twist; keep hips and shoulders square.", extension:"Small controlled range; avoid pinching.",
  flexion:"Curl through the upper spine; avoid straining the neck.", gait:"Even, deliberate steps; look ahead.",
  rotate:"Rotate through the trunk, control the return."
};
const pick = (arr, i) => arr[i % arr.length];

for(const base of BASES){
  let idx = 0;
  for(const ek of base.eq){
    const [elabel, etags] = EQUIP[ek];
    for(const m of base.mods){
      const parts = [elabel, m, base.b].filter(Boolean).join(" ").replace(/\s+/g," ").trim();
      const name = cap(parts);
      const key = slug(name);
      if(seen.has(key)) continue; seen.add(key);
      const tags = deriveTags(name, base, etags);
      const diff = difficulty(name, base);
      const doseKey = DOSE[base.pat] ? base.pat : (base.pat in DOSE ? base.pat : "strength");
      const dose = pick(DOSE[doseKey] || DOSE.strength, idx);
      const cue = CUE[base.pat] || "Move with control, keep it pain-free.";
      out.push({ id:"e"+(out.length+1), name, region:base.reg, pattern:base.pat,
        equipment: elabel || "bodyweight", difficulty:diff, tags, dose, cue });
      idx++;
    }
  }
}

/* Pad toward 5000 with surface / tempo / range context variants of existing
   exercises — real programming variance (tempo, ROM, surface, unilateral). */
const CONTEXT = [
  ["slow-tempo (3s eccentric)", 0], ["with 2s pause", 0], ["partial-range", 0], ["full-range", 0],
  ["on unstable surface", 1], ["banded (accommodating)", 0], ["unilateral", 1], ["with isometric hold", 0],
  ["low-load / high-rep", -1], ["progressive-overload", 1], ["deload / technique", -1]
];
const TARGET = 5000;
const baseCount = out.length;
outer:
for(const [ctx, dBump] of CONTEXT){
  for(let i=0;i<baseCount;i++){
    if(out.length >= TARGET) break outer;
    const src = out[i];
    if(src._ctx) continue;
    const name = cap(`${src.name} — ${ctx}`);
    const key = slug(name); if(seen.has(key)) continue; seen.add(key);
    let diff = Math.max(1, Math.min(4, src.difficulty + dBump));
    const tags = new Set(src.tags);
    if(/unstable/.test(ctx)) tags.add(T.balance);
    out.push({ id:"e"+(out.length+1), name, region:src.region, pattern:src.pattern,
      equipment:src.equipment, difficulty:diff, tags:[...tags], dose:src.dose, cue:src.cue, _ctx:true });
  }
}
out.forEach(e=>{ delete e._ctx; });

mkdirSync(dirname(OUT), { recursive:true });
const byReg = {}; out.forEach(e=>e.region.forEach(r=>byReg[r]=(byReg[r]||0)+1));
const banner = `/* AUTO-GENERATED by scripts/generate-exercises.mjs — do not edit by hand.
   ${out.length} exercises with variance (base movements × equipment × modifiers).
   Educational content only. */\n`;
writeFileSync(OUT, `${banner}window.EXERCISES = ${JSON.stringify(out)};\n`);
console.log(`Wrote ${out.length} exercises (${baseCount} base + ${out.length-baseCount} context variants)`);
console.log("by region:", byReg);
