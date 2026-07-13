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
  endNeck:"end_range_neck", wb:"weight_bearing", grip:"grip_isometric", breath:"breath_hold", aerobic:"aerobic", deepWater:"deep_water" };

/* Equipment: [display prefix, extra tag hints] */
const EQUIP = {
  bw:["",[]], db:["Dumbbell",[]], kb:["Kettlebell",[]], bb:["Barbell",[T.valsalva]],
  band:["Band",[]], cable:["Cable",[]], mach:["Machine",[]], mb:["Med-ball",[]],
  trx:["Suspension",[]], sb:["Sandbag",[T.valsalva]],
  // ---- ordinary household objects used as improvised equipment ----
  can:["Soup-can",[]], bottle:["Water-bottle",[]], jug:["Water-jug",[]], book:["Heavy-book",[]],
  pack:["Backpack",[]], towel:["Towel",[]], loop:["Loop-band",[]], broom:["Broomstick",[]],
  chair:["Chair",[]], stair:["Stair-step",[]]
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
  {b:"", pat:"balance", reg:["Balance","Ankle","Knee","Hip"], tags:[T.balance], eq:["bw"],
   mods:["tandem (heel-to-toe) stance","single-leg stance eyes-closed","single-leg balance on cushion","single-leg balance with head turns","single-leg balance with ball toss","Y-balance reach","single-leg RDL balance","hop-and-stick landing","single-leg hop-to-balance","reactive perturbation drill (near support)"]},

  // ---- Agility / change-of-direction (return-to-sport; specific, tiered) ----
  {b:"", pat:"agility", reg:["Balance","Knee","Ankle","Hip","Full body"], tags:[T.wb,T.highInt], eq:["bw"],
   mods:["agility ladder two-feet in/out","agility ladder in-in-out-out","agility ladder lateral (Ali shuffle)","dot drill","line hops front-to-back","line hops side-to-side","lateral shuffle drill","carioca (grapevine)","A-skip drill","backpedal-to-sprint","box agility drill","figure-8 runs","pro-agility 5-10-5 shuttle","T-drill agility run","45° cutting drill","90° cutting drill","zig-zag cutting drill","reactive mirror drill","shuttle run"]},
  {b:"", pat:"plyo", reg:["Knee","Ankle","Hip"], tags:[T.impact,T.highInt,T.wb,T.balance], eq:["bw"],
   mods:["double-leg drop-and-stick landing","single-leg drop-and-stick landing","broad jump to stick","lateral hop-and-stick","deceleration drill (accel-decel)","single-leg lateral bound-and-stick","depth-drop landing","cut-and-stick drill"]},

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
  // ---- Circulation / early-mobility (safe non-weight-bearing; great after surgery, bed rest or when immobilized) ----
  {b:"", pat:"pump", reg:["Ankle","Calf"], tags:[], eq:["bw"],
   cue:"Point your toes away, then pull them back up toward you — pump slowly and fully to keep blood moving, reduce swelling and lower clot risk. Safe to do lying or seated, even when non-weight-bearing.",
   mods:["ankle pumps","seated ankle pumps","ankle pumps with legs elevated","point-and-flex ankle pumps","ankle circles","ankle alphabet","long-sitting ankle pumps","towel-assisted ankle pumps","hourly ankle pumps (bed or desk)","toe-and-heel rock"]},
  // ---- Supine therapeutic set (lying on the back; foundational low-load work — ideal early, post-op or when weight-bearing is limited). Several variations per exercise. ----
  {b:"", pat:"supine", reg:["Knee","Hip","Supine (therapeutic)"], tags:[], eq:["bw"],
   cue:"Lie on your back and move slowly through a pain-free range (or build a steady hold), keeping your core gently braced and your low back comfortable.",
   mods:[
     "quad sets","quad sets with a towel roll under the knee","quad sets with a 5s hold","quad sets with a straight-leg raise",
     "short arc quads (SAQ)","short arc quads over a bolster","short arc quads with a 3s hold","short arc quads with a light ankle weight","resisted short arc quads (band)",
     "straight leg raise","straight leg raise with a 5s hold","straight leg raise with a light ankle weight","bent-knee straight leg raise","straight leg raise into abduction","resisted straight leg raise (band)",
     "supine hip abduction","supine hip abduction with a 3s hold","resisted supine hip abduction (band)",
     "supine hip adduction squeeze","supine hip adduction squeeze with a 5s hold","supine hip adduction with a ball",
     "heel slides","heel slides with a strap assist","heel slides with a towel under the heel","wall heel slides (legs-up-the-wall)",
     "glute sets","glute sets with a 5s hold","glute bridge","glute bridge with a 3s hold","single-leg glute bridge","glute bridge with marching","glute bridge with feet elevated","banded glute bridge",
     "supine marching (hip flexion)","supine marching with a hold",
     "single knee-to-chest","single knee-to-chest with a 20s hold","double knee-to-chest","knee-to-chest with a strap assist",
     "bent-knee fallout (hip external rotation)","bent-knee fallout with a 3s hold",
     "terminal knee extension (towel roll)","terminal knee extension with a 5s hold",
     "hamstring sets (heel dig)","hamstring sets with a 5s hold",
     "posterior pelvic tilt","posterior pelvic tilt with a 5s hold",
     "supine ankle pumps","supine abdominal bracing","supine abdominal bracing with heel slides"]},
  // ---- Seated therapeutic set (sitting in a sturdy chair; supported, no standing-balance demand). Several variations per exercise. ----
  {b:"", pat:"seated", reg:["Knee","Hip","Seated (therapeutic)"], tags:[], eq:["bw"],
   cue:"Sit tall in a sturdy chair with your feet supported; move the working leg slowly and controlled through a pain-free range (or build a steady hold).",
   mods:[
     "long arc quads (LAQ)","long arc quads with a 5s hold","long arc quads with a slow eccentric lower","long arc quads with a light ankle weight","resisted long arc quads (band)","long arc quads to 45° (short range)",
     "seated active knee flexion","seated knee flexion with a strap assist","seated knee flexion hold",
     "seated marching (hip flexion)","seated marching with a hold","seated hip flexion with a light ankle weight","resisted seated hip flexion (band)",
     "seated hip abduction (band)","seated hip abduction against a strap","seated hip abduction with a hold",
     "seated hip adduction squeeze (ball)","seated hip adduction squeeze with a 5s hold",
     "seated knee extension isometric","seated knee extension isometric against a strap",
     "seated hamstring curl (heel drag)","seated hamstring curl with a band","seated hamstring curl with a hold",
     "seated heel raises","seated heel raises with a hold","seated toe raises (dorsiflexion)","seated toe raises with a hold",
     "seated hip flexion hold","seated terminal knee extension","seated terminal knee extension with a hold","seated leg extension with a light ankle weight"]},
  // ---- Standing therapeutic set (supported, upright/weight-bearing — the bridge from table exercises to walking). Several variations per exercise. ----
  {b:"", pat:"standing", reg:["Knee","Hip","Standing (therapeutic)"], tags:[T.wb], eq:["bw"],
   cue:"Stand tall holding a sturdy counter or rail for support; keep your hips level and move slowly and controlled through a pain-free range (or hold).",
   mods:[
     "standing hip abduction (holding a counter)","standing hip abduction with a 3s hold","standing hip abduction with a light ankle weight","resisted standing hip abduction (band)",
     "standing hip extension (holding a counter)","standing hip extension with a 3s hold","resisted standing hip extension (band)",
     "standing marching (hip flexion)","standing hip flexion with a hold","resisted standing hip flexion (band)",
     "standing hip adduction (band)",
     "standing hamstring curl","standing hamstring curl with a hold","resisted standing hamstring curl (band)",
     "supported mini squats (holding a counter)","mini squats to a chair","wall-supported mini squats",
     "sit-to-stand from a chair","sit-to-stand with a slow lower","sit-to-stand to a higher surface",
     "supported double-leg heel raises","supported single-leg heel raises","standing heel raises with a 3s hold","supported toe raises (dorsiflexion)",
     "standing terminal knee extension (band)",
     "standing weight shifts (side-to-side)","standing weight shifts (forward-back)","single-leg stance (holding a counter)","single-leg stance with a 20s hold","tandem stance (holding a counter)",
     "low forward step-ups (holding a rail)","low lateral step-ups",
     "supported mini lunges","supported partial-range split squat",
     "standing hamstring stretch (heel on a step)","standing calf stretch (against a wall)"]},
  // ---- Pool / aquatic therapeutic set (buoyancy offloads the joints — great when weight-bearing hurts). Deep-water moves tagged deep_water (gated by water confidence/age). Several variations per exercise. ----
  {b:"", pat:"pool", reg:["Hip","Knee","Cardio","Pool / aquatic (therapeutic)"], tags:[], eq:["bw"],
   cue:"Work in chest-deep water so buoyancy offloads your joints; move slowly against the water's resistance, hold the pool wall or edge when you need support, and keep it pain-free.",
   mods:[
     "water walking (forward)","water walking (backward)","water walking (sideways)","water walking with high knees",
     "pool marching","pool marching with arm drive","high-knee pool marching",
     "shallow-water jogging","aqua jogging (chest-deep)","deep-water running (flotation belt)",
     "standing hip abduction (at the pool wall)","standing hip abduction with a hold (pool)","standing hip adduction (pool)","standing hip flexion (at the pool wall)","standing hip extension (at the pool wall)",
     "standing knee bends (pool)","mini squats (pool)","wall-supported squats (pool)",
     "heel raises (pool)","toe raises (pool)",
     "flutter kicks (holding the wall)","scissor kicks (holding the wall)","bicycle kicks (holding the wall)",
     "pool leg swings (front-to-back)","pool leg swings (side-to-side)",
     "standing balance (pool)","single-leg stance (pool)","tandem stance (pool)",
     "supported pool lunges","forward step-ups (pool step)",
     "standing trunk rotation (water resistance)","arm sweeps (water resistance)",
     "treading water","cross-country ski (pool, no-touch)","aqua jumping jacks",
     "kickboard flutter kick (deep end)","standing hamstring stretch (pool)","standing calf stretch (at the pool wall)","wall push-offs (pool)"]},

  // ---- Pediatric / developmental (0–18 yrs; play-based, low-load, parent/therapist supervised) ----
  {b:"(infant)", pat:"general", reg:["Full body"], tags:["pediatric"], eq:["bw"], cue:"Parent-led play — gentle, on the floor, and always supervised.",
   mods:["tummy time","supported sitting","rolling side-to-side","reaching for toys","assisted crawling","pull-to-stand","cruising along furniture","supported standing","assisted stepping","gentle kicking play"]},
  {b:"(toddler)", pat:"gait", reg:["Gait","Balance","Full body"], tags:["pediatric","balance"], eq:["bw"], cue:"Turn it into a game; supervise closely and keep it fun.",
   mods:["walking practice","stair climbing with help","stepping over toys","squat-to-stand play","ball-rolling play","gentle two-foot jumping","marching game","backward-walking game","balance-line walk","obstacle crawl"]},
  {b:"(kids balance game)", pat:"balance", reg:["Balance","Full body"], tags:["pediatric","balance"], eq:["bw"], cue:"Make it playful; stand near help and progress slowly.",
   mods:["single-leg flamingo stand","tightrope-line walk","hopscotch hops","balance-board play","freeze-dance stops","beanbag balance","stepping-stones","heel-to-toe walk","spin-and-steady","catch on one leg"]},
  {b:"(kids animal walk)", pat:"general", reg:["Full body","Core"], tags:["pediatric","weight_bearing"], eq:["bw"], cue:"Playful animal walks build strength; keep it light and fun.",
   mods:["bear crawl","crab walk","frog jumps","bunny hops","wheelbarrow walk with helper","donkey kicks","inchworm","duck walk","superhero plank","assisted monkey hang"]},
  {b:"(kids jumping game)", pat:"plyo", reg:["Knee","Ankle","Balance"], tags:["pediatric","impact","balance"], eq:["bw"], cue:"Soft, quiet landings; short playful bursts with rest.",
   mods:["two-foot jumps","jump over a line","star jumps","hopscotch","skipping practice","side-to-side hops","jump-and-freeze","bunny-hop course","leapfrog","cone-weave run"]},
  {b:"(teen)", pat:"squat", reg:["Knee","Hip","Full body"], tags:["pediatric","weight_bearing"], eq:["bw","band","can","bottle","pack"], cue:"Learn good form first with light or bodyweight load.",
   mods:["squat","split squat","step-up","glute bridge","wall sit","calf raise","reverse lunge","single-leg balance","incline push-up","plank hold"]},
];

/* Ordinary household objects double as improvised equipment — inject them into
   the loadable / band / support movements so many exercises get a home variant. */
for(const b of BASES){
  if(b.eq.includes("db")) for(const e of ["can","bottle","jug","book","pack"]) if(!b.eq.includes(e)) b.eq.push(e);
  if(b.eq.includes("kb")) for(const e of ["jug","pack"]) if(!b.eq.includes(e)) b.eq.push(e);
  if(b.eq.includes("bb")) for(const e of ["broom","pack"]) if(!b.eq.includes(e)) b.eq.push(e);
  if(b.eq.includes("mb")) for(const e of ["pack","book"]) if(!b.eq.includes(e)) b.eq.push(e);
  if(b.eq.includes("band")) for(const e of ["loop","towel"]) if(!b.eq.includes(e)) b.eq.push(e);
  if(/step-up|wall sit|calf raise|chest press|push-up|dip|single-leg balance|sit-to-stand|glute/i.test(b.b)) if(!b.eq.includes("chair")) b.eq.push("chair");
}

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
  if(base.pat==="pool"){                                   // aquatic: buoyancy offloads joints (no weight_bearing tag)
    if(/jog|run|jumping jack|cross-country|tread|cycl/.test(l)) t.add(T.aerobic);
    if(/deep-?water|deep end|treading|flotation|belt|no-touch/.test(l)) t.add(T.deepWater);
  }
  if(base.pat==="agility" || /agility|ladder|carioca|shuffle|shuttle|cutting|zig-zag|dot drill|line hops|backpedal|figure-8|mirror drill|a-skip|box drill|5-10-5|t-drill/.test(l)){
    t.add(T.wb); t.add(T.highInt); t.add(T.balance);
  }
  if(/cutting|shuttle|zig-zag|reactive|mirror|drop-and-stick|depth-drop|bound-and-stick|cut-and-stick|sprint/.test(l)) t.add(T.impact);
  return [...t];
}
function difficulty(name, base){
  const l = name.toLowerCase();
  if(base.pat==="pump"||base.pat==="supine"||base.pat==="seated"||base.pat==="pool") return 1;   // circulation, supine/seated & aquatic therapeutic sets are beginner-level
  if(/pro-agility|5-10-5|t-drill|cutting|zig-zag|reactive|mirror drill|bound-and-stick|cut-and-stick|depth-drop|shuttle run/.test(l)) return 4;
  if(/agility|ladder|carioca|shuffle|dot drill|line hops|backpedal|box drill|figure-8|a-skip|deceleration|drop-and-stick|hop-and-stick|hop-to-balance/.test(l)) return 3;
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
  pump:["3×20 slow","2×20 each","hourly ×15–20","10–15 each, several × day"],
  supine:["3×10","3×12","2×15","3×10 (5s hold)"], seated:["3×10","3×12","2×15","3×10 each"],
  standing:["3×10","3×12","2×15","3×10 each"],
  pool:["2–3×10","3×12","10–15 min","2×20 steps"],
  breathing:["3×1 min","5×6 breaths","2–3 min"], anti:["3×10 each","3×8 slow","3×12"],
  push:["3×8–12","3×10","3×12"], pull:["3×10–15","3×12","3×10 each"], hinge:["3×8–10","3×10","4×8"],
  squat:["3×8–12","3×10","4×8"], lunge:["3×8–10 each","3×10 each"], calf:["3×12–15","4×12","3×15"],
  extension:["3×10–12","3×12","3×15"], flexion:["3×10–12","3×12","3×15"], gait:["3×15–20 m","3×20 m","4×15 m"], rotate:["3×10 each","3×8 each","3×12 each"],
  agility:["3×20–30s","3×5 each way","4–6 reps","3×10–20 m"],
  general:["play for 5–10 min","2–3 short bouts","3×8–10 playful reps","a few times a day"]
};
const CUE = {
  squat:"Knees track over toes; control the descent.", hinge:"Hinge from the hips, neutral spine, brace lightly.",
  lunge:"Vertical shin, controlled, knee stable.", calf:"Full range, slow lower.", push:"Controlled, full range, exhale on effort.",
  pull:"Lead with the elbow, squeeze, control the return.", isometric:"Hold steady, breathe normally.",
  mobility:"Slow and pain-free through range.", balance:"Steady near support; progress difficulty gradually.",
  plyo:"Soft, quiet landings; quality over quantity.", carry:"Tall posture, braced, even steps.",
  cardio:"Conversational pace unless intervals prescribed.", vestibular:"Provoke mild symptoms, then let them settle.",
  breathing:"Slow, relaxed; never hold your breath.", pump:"Slow, full point-and-flex; keep it easy and pain-free.",
  supine:"Lie on your back; move slowly, brace gently, stay pain-free.", seated:"Sit tall in a sturdy chair; slow and controlled, pain-free.",
  standing:"Hold a sturdy support; keep hips level, move slow and controlled.",
  pool:"In chest-deep water; move slow against the water, hold the wall if needed.", "anti-ext":"Keep the low back flat; move the limbs, not the spine.",
  "anti-rot":"Resist the twist; keep hips and shoulders square.", extension:"Small controlled range; avoid pinching.",
  flexion:"Curl through the upper spine; avoid straining the neck.", gait:"Even, deliberate steps; look ahead.",
  rotate:"Rotate through the trunk, control the return.",
  agility:"Accelerate, brake and change direction under control; knee over the foot, quality over speed."
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
      const cue = base.cue || CUE[base.pat] || "Move with control, keep it pain-free.";
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
  ["low-load / high-rep", -1], ["progressive-overload", 1], ["deload / technique", -1],
  ["tempo 3-1-3", 0], ["with a 1s pause", 0], ["paused mid-range", 0], ["1.5-rep style", 1],
  ["cluster set", 0], ["circuit format", 0], ["EMOM style", 0], ["for-time (quality)", 0],
  ["seated variation", -1], ["supported variation", -1], ["standing variation", 0], ["eccentric-only", 0],
  ["explosive concentric", 1], ["controlled negatives", 0], ["extended range", 1], ["short-range / pain-free", -1]
];
const TARGET = 20000;
const baseCount = out.length;
outer:
for(const [ctx, dBump] of CONTEXT){
  for(let i=0;i<baseCount;i++){
    if(out.length >= TARGET) break outer;
    const src = out[i];
    if(src._ctx) continue;
    if(src.tags && src.tags.includes("pediatric")) continue;   // keep kids' play exercises clean
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
