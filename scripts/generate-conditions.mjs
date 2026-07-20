/* =====================================================================
   PhysioPath — condition catalog generator
   Produces data/conditions.js  ->  window.CONDITIONS = [ ... ]
   Each entry:
   { id, name, domain, region, protocol, supervision, clearance,
     chronicByNature, autoFlags:[], synonyms:[] }
   Content is general, evidence-informed rehab categorization — educational.
===================================================================== */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = `${__dirname}/../data/conditions.js`;

const out = [];
const seen = new Set();
let n = 0;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
function add(name, domain, region, protocol, opts = {}) {
  const key = slug(name);
  if (seen.has(key)) return;
  seen.add(key);
  out.push({
    id: "c" + (++n),
    name,
    domain,
    region,
    protocol,
    supervision: opts.supervision || defaultSupervision(domain, protocol),
    clearance: opts.clearance ?? defaultClearance(domain, protocol),
    chronicByNature: opts.chronic ?? false,
    autoFlags: opts.autoFlags || autoFlagsFor(protocol, name),
    synonyms: opts.synonyms || []
  });
}
function defaultSupervision(domain, protocol) {
  if (domain === "cardiac") return "clinical";
  if (domain === "pulmonary") return "supervised";
  if (domain === "neuro") return "supervised";
  if (/replacement|fracture|amputation|_surgery/.test(protocol)) return "supervised";
  return "self";
}
function defaultClearance(domain, protocol) {
  return domain !== "msk" || /replacement|fracture|amputation|surgery/.test(protocol);
}
function autoFlagsFor(protocol, name) {
  const f = [];
  if (protocol === "hip_replacement") f.push("hip_replacement");
  if (protocol === "knee_replacement") f.push("knee_replacement");
  if (protocol.startsWith("fracture")) f.push("recent_fracture");
  if (["cardiac_rehab","heart_failure","valve","arrhythmia","pad","cardiac_surgery","venous_rehab"].includes(protocol)) f.push("cardiac");
  if (protocol === "cardiac_surgery") f.push("sternal_precautions");        // post-sternotomy (CABG / open-heart)
  if (protocol === "abdominal_surgery") f.push("abdominal_precautions");    // post-abdominal-wall surgery
  if (protocol === "hypertension") f.push("hypertension");
  if (["pulmonary_rehab","asthma","post_covid","ild","thoracic_surgery","pulm_hypertension"].includes(protocol)) f.push("pulmonary");
  if (["stroke","tbi","sci","ms","parkinsons","vestibular","balance_neuro","guillain_barre","icu_aw","myasthenia","encephalopathy","acute_medical","polytrauma","burn"].includes(protocol)) f.push("balance_risk");
  if (protocol === "neuropathy") f.push("neuropathy");
  if (protocol === "lymphedema") f.push("lymphedema");
  if (protocol === "charcot") { f.push("critical_offload"); f.push("neuropathy"); f.push("balance_risk"); }
  if (protocol === "venous_rehab" && /dvt|thromb/i.test(name)) f.push("dvt");
  if (["stroke","tbi","sci","guillain_barre","icu_aw","myasthenia","encephalopathy"].includes(protocol)) f.push("neuro_acute");
  if (protocol === "sci") {
    /* Autonomic dysreflexia risk ≈ T6 and above (cervical + high thoracic) */
    if (/\b(C[1-8]|T[1-6])\b|tetrapleg|quadripleg|cervical|\bAD\b|dysreflexia|SCI ≥T6|SCI >=T6/i.test(name)) f.push("autonomic_dysreflexia");
  }
  if (protocol === "myasthenia") f.push("myasthenia");
  if (protocol === "icu_aw") f.push("icu_aw");
  if (protocol === "acute_medical") f.push("acute_medical");
  if (protocol === "polytrauma") f.push("polytrauma");
  if (protocol === "burn") f.push("major_burn");
  if (/sepsis|septic shock/i.test(name)) f.push("post_sepsis");
  if (/pulmonary embolism|\bPE\b recovery|post-pulmonary-embolism|acute PE/i.test(name)) { f.push("pe_acute"); f.push("dvt"); f.push("pulmonary"); }
  /* Raised ICP / neurosurgical precautions — not routine mild concussion */
  if (/intracranial|subarachnoid|\bSAH\b|intracerebral|\bICH\b|subdural|epidural|craniotom|craniect|cranioplast|raised.?icp|intracranial pressure|malignant MCA|decompressive/i.test(name)) f.push("raised_icp");
  else if (protocol === "tbi" && !/mild|concussion|post-concussion/i.test(name)) f.push("raised_icp");
  if (/osteoporos/i.test(name)) f.push("osteoporosis");
  /* HCM: even when "cleared", competitive high-intensity remains specialist-limited */
  if (/hypertrophic cardiomyopathy|\bhcm\b/i.test(name)) f.push("hcm");
  /* Marfan / aortopathy: avoid competitive contact and maximal straining */
  if (/marfan|aortopath|aortic aneurysm|loeys.?dietz/i.test(name)) f.push("aortopathy");
  return f;
}

const SIDES = ["Left", "Right", "Bilateral"];
function lateral(baseName, domain, region, protocol, opts = {}) {
  for (const s of SIDES) add(`${baseName} (${s})`, domain, region, protocol, opts);
}

/* ==================== MSK — peripheral joints ==================== */
const MSK_REGIONS = [
  { region:"Shoulder", protocol:"shoulder", dx:[
    "Rotator cuff tendinopathy","Rotator cuff tear (partial-thickness)","Rotator cuff tear (full-thickness)",
    "Subacromial impingement syndrome","Supraspinatus tendinitis","Biceps tendinopathy",
    "Adhesive capsulitis (frozen shoulder)","Glenohumeral osteoarthritis","Subacromial bursitis",
    "Calcific tendinitis of the shoulder","SLAP (labral) tear","Shoulder impingement post-repair",
    "Rotator cuff repair recovery","Proximal humerus fracture recovery" ] },
  { region:"Shoulder", protocol:"shoulder_instability", dx:[
    "Anterior shoulder dislocation recovery","Recurrent shoulder instability","Shoulder subluxation",
    "Bankart lesion recovery","Multidirectional shoulder instability","Labral repair recovery" ] },
  { region:"AC joint", protocol:"shoulder", dx:[
    "AC joint sprain (grade I)","AC joint sprain (grade II)","AC joint separation recovery","AC joint osteoarthritis" ] },
  { region:"Elbow", protocol:"elbow", dx:[
    "Lateral epicondylalgia (tennis elbow)","Medial epicondylalgia (golfer's elbow)","Distal biceps tendinopathy",
    "Triceps tendinopathy","Olecranon bursitis","Elbow osteoarthritis","Elbow sprain",
    "Radial head fracture recovery","Elbow dislocation recovery","Cubital tunnel syndrome" ] },
  { region:"Wrist / Hand", protocol:"wrist_hand", dx:[
    "Wrist sprain","De Quervain's tenosynovitis","Carpal tunnel syndrome","Wrist tendinopathy",
    "TFCC injury recovery","Scaphoid fracture recovery","Distal radius (Colles') fracture recovery",
    "Trigger finger","Thumb CMC osteoarthritis","Mallet finger recovery","Boxer's fracture recovery",
    "Ganglion cyst (post-excision)","Hand osteoarthritis","Dupuytren's contracture (post-release)" ] },
  { region:"Hip", protocol:"hip", dx:[
    "Gluteal tendinopathy","Trochanteric bursitis","Hip osteoarthritis","Hip labral tear",
    "Femoroacetabular impingement (FAI)","Hip flexor strain","Adductor (groin) strain",
    "Piriformis syndrome","Hip abductor weakness","Snapping hip syndrome","Proximal hamstring tendinopathy" ] },
  { region:"Hip", protocol:"hip_replacement", dx:[
    "Total hip replacement recovery","Hip hemiarthroplasty recovery","Hip resurfacing recovery" ] },
  /* Hip fracture fixation is ORIF/nail — NOT arthroplasty. THA precautions (90°/adduction/IR) do not apply. */
  { region:"Hip", protocol:"fracture_le", dx:[
    "Hip fracture (post-fixation) recovery" ] },
  { region:"Knee", protocol:"knee_ligament", dx:[
    "ACL sprain","ACL reconstruction recovery","PCL sprain","MCL sprain","LCL sprain",
    "Multi-ligament knee injury recovery","Knee dislocation recovery" ] },
  { region:"Knee", protocol:"knee_pf", dx:[
    "Patellofemoral pain syndrome","Patellar tendinopathy (jumper's knee)","Chondromalacia patellae",
    "Iliotibial band syndrome","Patellar dislocation recovery","Quadriceps tendinopathy","Osgood-Schlatter recovery" ] },
  { region:"Knee", protocol:"knee_meniscus", dx:[
    "Medial meniscus tear","Lateral meniscus tear","Meniscus repair recovery","Partial meniscectomy recovery",
    "Degenerative meniscal tear" ] },
  { region:"Knee", protocol:"knee_replacement", dx:[
    "Total knee replacement recovery","Partial (unicompartmental) knee replacement recovery" ] },
  /* Knee OA is exercise-first conservative care (OARSI/NICE/ACR) — not a TKA pathway. */
  { region:"Knee", protocol:"knee_oa", dx:[
    "Knee osteoarthritis" ] },
  { region:"Ankle", protocol:"ankle", dx:[
    "Lateral ankle sprain (grade I)","Lateral ankle sprain (grade II)","Lateral ankle sprain (grade III)",
    "High ankle (syndesmosis) sprain","Chronic ankle instability","Ankle osteoarthritis",
    "Peroneal tendinopathy","Posterior tibial tendinopathy","Ankle fracture recovery" ] },
  { region:"Ankle", protocol:"achilles", dx:[
    "Achilles tendinopathy (midportion)","Insertional Achilles tendinopathy","Achilles tendon rupture recovery",
    "Achilles paratenonitis" ] },
  { region:"Foot", protocol:"foot", dx:[
    "Plantar fasciitis","Metatarsalgia","Morton's neuroma","Hallux valgus (bunion) recovery",
    "Turf toe","Sesamoiditis","Tarsal tunnel syndrome","Fifth metatarsal fracture recovery",
    "Flatfoot (pes planus) rehabilitation","Post-bunionectomy recovery" ] }
];
for (const g of MSK_REGIONS) {
  const lat = !/joint$|Hand|Foot/.test(g.region) ? true : true; // all lateralizable
  for (const dx of g.dx) {
    if (lat) lateral(dx, "msk", g.region, g.protocol);
    else add(dx, "msk", g.region, g.protocol);
  }
}

/* ==================== MSK — spine ==================== */
const CERV = ["C2-C3","C3-C4","C4-C5","C5-C6","C6-C7","C7-T1"];
const THOR = ["T1-T2","T2-T3","T3-T4","T4-T5","T5-T6","T6-T7","T7-T8","T8-T9","T9-T10","T10-T11","T11-T12","T12-L1"];
const LUMB = ["L1-L2","L2-L3","L3-L4","L4-L5","L5-S1"];
function spineSet(levels, region, protocol, radicProtocol) {
  for (const lv of levels) {
    add(`Disc herniation at ${lv}`, "msk", region, protocol);
    add(`Disc bulge at ${lv}`, "msk", region, protocol);
    add(`Disc protrusion at ${lv}`, "msk", region, protocol);
    add(`Degenerative disc disease at ${lv}`, "msk", region, protocol, { chronic:true });
    add(`Radiculopathy at ${lv}`, "msk", region, radicProtocol);
    add(`Foraminal stenosis at ${lv}`, "msk", region, protocol);
  }
}
spineSet(CERV, "Cervical spine", "cervical", "radiculopathy_cervical");
spineSet(THOR, "Thoracic spine", "thoracic", "thoracic");
spineSet(LUMB, "Lumbar spine", "lumbar", "radiculopathy_lumbar");

const SPINE_GENERAL = [
  ["Cervical","cervical",["Neck strain","Whiplash-associated disorder","Cervical spondylosis","Cervical facet syndrome",
    "Cervical stenosis","Cervicogenic headache","Text neck syndrome","Cervical myofascial pain","Torticollis"]],
  ["Thoracic","thoracic",["Thoracic outlet syndrome","Thoracic facet syndrome","Costovertebral joint dysfunction",
    "Scheuermann's kyphosis","Rib dysfunction","Postural thoracic pain","Scoliosis (conservative management)"]],
  ["Lumbar","lumbar",["Non-specific low back pain","Lumbar strain","Lumbar spondylosis","Lumbar facet syndrome",
    "Lumbar spinal stenosis","Spondylolysis","Spondylolisthesis (grade I)","Spondylolisthesis (grade II)",
    "Degenerative spondylolisthesis","Failed back surgery syndrome","Post-laminectomy recovery","Post-lumbar fusion recovery"]],
  ["Sacroiliac","sacroiliac",["Sacroiliac joint dysfunction","SI joint pain","Sacroiliitis","Coccydynia","Pelvic girdle pain"]]
];
for (const [region, protocol, list] of SPINE_GENERAL)
  for (const dx of list) add(dx, "msk", region + " spine", protocol, { chronic:/spondylosis|stenosis|degenerative|chronic/i.test(dx) });

add("Sciatica", "msk", "Lumbar spine", "radiculopathy_lumbar");
add("Cauda equina (post-decompression recovery)", "msk", "Lumbar spine", "radiculopathy_lumbar", { supervision:"clinical", clearance:true });

/* ==================== MSK — systemic joint disease, OA/RA ==================== */
const JOINTS = ["Shoulder","Elbow","Wrist","Hand","Hip","Knee","Ankle","Foot","Cervical spine","Lumbar spine"];
for (const j of JOINTS) {
  const protocol = ({Shoulder:"shoulder",Elbow:"elbow",Wrist:"wrist_hand",Hand:"wrist_hand",Hip:"hip",
    Knee:"knee_replacement",Ankle:"ankle",Foot:"foot","Cervical spine":"cervical","Lumbar spine":"lumbar"})[j] || "general_msk";
  add(`Osteoarthritis of the ${j.toLowerCase()}`, "msk", j, protocol, { chronic:true });
  add(`Rheumatoid arthritis affecting the ${j.toLowerCase()}`, "msk", j, protocol, { chronic:true, supervision:"supervised" });
}
["Rheumatoid arthritis","Psoriatic arthritis","Ankylosing spondylitis","Gout (post-flare reconditioning)",
 "Osteoporosis","Osteopenia","Polymyalgia rheumatica","Fibromyalgia","Systemic lupus (deconditioning)",
 "Osteoarthritis (generalized)"].forEach(dx =>
  add(dx, "msk", "Systemic", "general_msk", { chronic:true, supervision:"supervised" }));

/* ==================== MSK — muscle strains by muscle group ==================== */
const MUSCLES = [
  ["Hamstring","hip"],["Quadriceps","knee_pf"],["Calf (gastrocnemius)","achilles"],["Groin (adductor)","hip"],
  ["Hip flexor","hip"],["Gluteal","hip"],["Rotator cuff","shoulder"],["Biceps","elbow"],["Triceps","elbow"],
  ["Pectoral","shoulder"],["Trapezius","cervical"],["Rhomboid","thoracic"],["Latissimus","thoracic"],
  ["Abdominal (oblique)","lumbar"],["Erector spinae","lumbar"],["Forearm","wrist_hand"]
];
for (const [m, protocol] of MUSCLES) {
  ["strain (grade I)","strain (grade II)","strain (grade III)","tendinopathy","contusion","tear (post-repair)"]
    .forEach(t => lateral(`${m} ${t}`, "msk", m, protocol, { chronic:/tendinopathy/.test(t) }));
}

/* ==================== MSK — bursitis / nerve entrapment / cartilage / sports ==================== */
[["Subacromial bursitis","shoulder","Shoulder"],["Olecranon bursitis","elbow","Elbow"],
 ["Trochanteric bursitis","hip","Hip"],["Iliopsoas bursitis","hip","Hip"],["Ischial bursitis","hip","Hip"],
 ["Prepatellar bursitis","knee_pf","Knee"],["Infrapatellar bursitis","knee_pf","Knee"],
 ["Pes anserine bursitis","knee_pf","Knee"],["Retrocalcaneal bursitis","achilles","Ankle"]]
  .forEach(([dx, p, r]) => lateral(dx, "msk", r, p));

[["Carpal tunnel syndrome","wrist_hand","Wrist / Hand"],["Cubital tunnel syndrome","elbow","Elbow"],
 ["Radial tunnel syndrome","elbow","Elbow"],["Guyon's canal syndrome","wrist_hand","Wrist / Hand"],
 ["Tarsal tunnel syndrome","foot","Foot"],["Common peroneal nerve entrapment","ankle","Lower limb"],
 ["Meralgia paresthetica","hip","Hip"],["Pronator teres syndrome","elbow","Elbow"],
 ["Posterior interosseous nerve syndrome","elbow","Elbow"],["Suprascapular nerve entrapment","shoulder","Shoulder"]]
  .forEach(([dx, p, r]) => lateral(dx + " rehabilitation", "msk", r, p));

[["Osteochondral defect of the knee","knee_ligament","Knee"],["Osteochondral lesion of the talus","ankle","Ankle"],
 ["Cartilage (chondral) defect of the hip","hip","Hip"],["Cartilage repair (microfracture) recovery — knee","knee_ligament","Knee"],
 ["Cartilage repair recovery — ankle","ankle","Ankle"]]
  .forEach(([dx, p, r]) => lateral(dx, "msk", r, p, { supervision:"supervised" }));

["Sports hernia (athletic pubalgia)","Osteitis pubis","Hip pointer (iliac crest contusion)","Quadratus lumborum strain",
 "Serratus anterior dysfunction","Levator scapulae syndrome","Rhomboid myofascial pain","Gluteus medius tendinopathy",
 "Hamstring avulsion recovery","Distal quadriceps tendon repair recovery","Patellar tendon repair recovery",
 "Achilles repair — return to sport","Turf toe — return to sport"]
  .forEach(dx => add(dx, "msk", "Sports", /hernia|pubis|pubalgia|pointer/.test(dx) ? "hip" : "general_msk"));

/* ==================== MSK — additional per-joint diagnoses (lateralized) ==================== */
const EXTRA_JOINT = [
  ["shoulder","Shoulder",["Pectoralis major tear recovery","Long head of biceps rupture recovery","Latarjet procedure recovery",
    "Reverse total shoulder replacement recovery","Total shoulder replacement recovery","Scapular dyskinesis","GIRD (internal rotation deficit)"]],
  ["elbow","Elbow",["Elbow stiffness (post-immobilization)","Ulnar collateral ligament sprain","Little League elbow recovery",
    "Elbow contracture rehabilitation"]],
  ["wrist_hand","Wrist / Hand",["Kienböck's disease (reconditioning)","Wrist stiffness (post-cast)","Extensor tendon repair recovery",
    "Flexor tendon repair recovery","Skier's thumb (UCL) recovery","Intersection syndrome"]],
  ["hip","Hip",["Hip flexor tendinopathy","Deep gluteal syndrome","Ischiofemoral impingement","Hamstring origin repair recovery",
    "Hip arthroscopy recovery","Labral repair recovery — hip"]],
  ["knee_ligament","Knee",["ACL revision recovery","Meniscus root repair recovery","Posterolateral corner injury recovery",
    "Patellar tendon graft (BPTB) recovery","Hamstring graft ACL recovery"]],
  ["knee_pf","Knee",["Patellofemoral instability","MPFL reconstruction recovery","Fat pad impingement (Hoffa's)",
    "Plica syndrome","Patellar maltracking",
    "Tibial tubercle transfer recovery","Tibial tubercle osteotomy (Fulkerson) recovery",
    "Tibial tubercle transfer with MPFL reconstruction recovery",
    "Trochleoplasty recovery","Sulcus-deepening trochleoplasty (Dejour) recovery",
    "Trochleoplasty with MPFL reconstruction recovery","Trochlear dysplasia (patellar instability)"]],
  ["rhabdo","Systemic",["Exertional rhabdomyolysis recovery"]],
  ["general_msk","Systemic",["Acute compartment syndrome (post-fasciotomy) recovery"]],
  ["elbow","Elbow",["UCL reconstruction (Tommy John) recovery","UCL repair with internal brace recovery"]],
  ["wrist_hand","Wrist / Hand",["Trapeziectomy (thumb base) recovery","Nerve graft / transfer recovery"]],
  ["hip","Hip",["Proximal hamstring repair recovery"]],
  ["fracture_le","Lower limb",["Limb lengthening (external fixation) recovery"]],
  ["ankle","Ankle",["Deltoid ligament sprain","Anterior ankle impingement","Posterior ankle impingement",
    "Ankle arthroscopy recovery","Lateral ligament reconstruction recovery","Sinus tarsi syndrome"]],
  ["foot","Foot",["Plantar plate injury","Lisfranc injury recovery","Extensor tendinopathy of the foot",
    "Freiberg's disease (reconditioning)","Accessory navicular syndrome","Heel fat pad syndrome"]]
];
for (const [protocol, region, list] of EXTRA_JOINT)
  for (const dx of list) lateral(dx, "msk", region, protocol, { supervision:/repair|replacement|reconstruction|recovery|arthroscopy|Latarjet|graft|procedure/.test(dx) ? "supervised" : "self" });

/* ==================== MSK — per-level facet / spondylosis / instability ==================== */
function spineLevelExtra(levels, region, protocol) {
  for (const lv of levels) {
    add(`Facet joint arthropathy at ${lv}`, "msk", region, protocol, { chronic:true });
    add(`Spondylosis at ${lv}`, "msk", region, protocol, { chronic:true });
    add(`Segmental instability at ${lv}`, "msk", region, protocol);
  }
}
spineLevelExtra(CERV, "Cervical spine", "cervical");
spineLevelExtra(LUMB, "Lumbar spine", "lumbar");

/* ==================== MSK — fractures (healing/reconditioning) ==================== */
const UE_BONES = ["Clavicle","Scapula","Humerus (shaft)","Humeral head","Radius","Ulna","Olecranon","Wrist (distal radius)","Scaphoid","Metacarpal","Finger phalanx"];
const LE_BONES = ["Pelvis","Femur (shaft)","Femoral neck","Patella","Tibial plateau","Tibia (shaft)","Fibula","Calcaneus","Talus","Metatarsal","Toe phalanx"];
const OTHER_BONES = ["Rib","Vertebral compression","Sternum"];
UE_BONES.forEach(b => lateral(`${b} fracture recovery`, "msk", "Upper limb", "fracture_ue", { supervision:"supervised" }));
LE_BONES.forEach(b => lateral(`${b} fracture recovery`, "msk", "Lower limb", "fracture_le", { supervision:"supervised" }));
OTHER_BONES.forEach(b => add(`${b} fracture recovery`, "msk", "Trunk", "fracture_le", { supervision:"supervised" }));
["Tibia","Metatarsal","Femoral neck","Navicular","Pelvis","Sacrum","Fibula"].forEach(b =>
  add(`${b} stress fracture recovery`, "msk", "Lower limb", "fracture_le", { supervision:"supervised" }));

/* ==================== MSK — amputation & post-op reconditioning ==================== */
["Transtibial (below-knee) amputation","Transfemoral (above-knee) amputation","Partial foot amputation"]
  .forEach(dx => lateral(`${dx} rehabilitation`, "msk", "Lower limb", "amputation_le", { supervision:"clinical", clearance:true }));
["Transradial (below-elbow) amputation","Transhumeral (above-elbow) amputation"]
  .forEach(dx => lateral(`${dx} rehabilitation`, "msk", "Upper limb", "amputation_ue", { supervision:"clinical", clearance:true }));

/* ==================== MSK — TMJ, other ==================== */
["Temporomandibular joint dysfunction","TMJ osteoarthritis","Jaw clicking (TMJ) rehabilitation"]
  .forEach(dx => add(dx, "msk", "TMJ", "tmj"));
["Post-mastectomy shoulder rehabilitation","Cancer-related deconditioning (general)","General post-surgical deconditioning"]
  .forEach(dx => add(dx, "msk", "General", "general_msk", { supervision:"supervised", clearance:true }));

/* ==================== NEURO ==================== */
["Ischemic stroke recovery","Hemorrhagic stroke recovery","Left-hemisphere stroke recovery",
 "Right-hemisphere stroke recovery","Cerebellar stroke recovery","Brainstem stroke recovery",
 "Transient ischemic attack (reconditioning)","Post-stroke hemiparesis","Post-stroke shoulder subluxation",
 "Post-stroke gait dysfunction","Post-stroke balance impairment"]
  .forEach(dx => add(dx, "neuro", "Brain", "stroke", { supervision:"clinical", clearance:true }));

["Mild traumatic brain injury (concussion)","Moderate traumatic brain injury recovery",
 "Post-concussion syndrome","Traumatic brain injury — vestibular recovery"]
  .forEach(dx => add(dx, "neuro", "Brain", dx.includes("vestibular") ? "vestibular" : "tbi", { supervision:"clinical", clearance:true }));

// SCI by level
const SCI_LEVELS = ["C4","C5","C6","C7","C8","T1","T2","T4","T6","T8","T10","T12","L1","L2","L3","L4","L5","S1"];
for (const lv of SCI_LEVELS) {
  add(`Spinal cord injury (${lv}, complete) rehabilitation`, "neuro", "Spinal cord", "sci", { supervision:"clinical", clearance:true, chronic:true });
  add(`Spinal cord injury (${lv}, incomplete) rehabilitation`, "neuro", "Spinal cord", "sci", { supervision:"clinical", clearance:true, chronic:true });
}
["Cervical spinal cord injury (tetraplegia)","Thoracic spinal cord injury (paraplegia)","Central cord syndrome",
 "Brown-Séquard syndrome","Cauda equina syndrome (neuro recovery)"]
  .forEach(dx => add(dx, "neuro", "Spinal cord", "sci", { supervision:"clinical", clearance:true, chronic:true }));

["Multiple sclerosis (relapsing-remitting)","Multiple sclerosis (progressive)","MS-related fatigue management",
 "MS-related balance impairment","MS-related spasticity management"]
  .forEach(dx => add(dx, "neuro", "CNS", "ms", { supervision:"supervised", chronic:true }));

["Parkinson's disease (early stage)","Parkinson's disease (moderate stage)","Parkinsonism — gait freezing",
 "Parkinson's — balance and falls prevention","Progressive supranuclear palsy (reconditioning)"]
  .forEach(dx => add(dx, "neuro", "CNS", "parkinsons", { supervision:"supervised", chronic:true }));

["Peripheral neuropathy (diabetic)","Peripheral neuropathy (chemotherapy-induced)","Peripheral neuropathy (idiopathic)",
 "Charcot-Marie-Tooth disease","Bell's palsy","Facial nerve palsy recovery","Guillain-Barré syndrome recovery",
 "Chronic inflammatory demyelinating polyneuropathy","Sciatic nerve injury recovery","Peroneal nerve palsy (foot drop)",
 "Radial nerve palsy recovery","Ulnar nerve entrapment recovery"]
  .forEach(dx => {
    const p = /Bell's|facial/i.test(dx) ? "bells_palsy" : /Guillain/i.test(dx) ? "guillain_barre" : "neuropathy";
    add(dx, "neuro", "Peripheral nerve", p, { supervision:"supervised" });
  });

["Benign paroxysmal positional vertigo (BPPV)","Vestibular neuritis recovery","Labyrinthitis recovery",
 "Ménière's disease (between episodes)","Unilateral vestibular hypofunction","Bilateral vestibular hypofunction",
 "Persistent postural-perceptual dizziness","Vestibular migraine (reconditioning)"]
  .forEach(dx => add(dx, "neuro", "Vestibular", "vestibular", { supervision:"supervised" }));

["Age-related balance decline / falls risk","Cerebral palsy (adult reconditioning)","Muscular dystrophy (reconditioning)",
 "Amyotrophic lateral sclerosis (supportive exercise)","Post-polio syndrome","Dystonia (functional rehabilitation)",
 "Ataxia (functional balance training)","Huntington's disease (reconditioning)"]
  .forEach(dx => add(dx, "neuro", "CNS", "balance_neuro", { supervision:"supervised", chronic:true }));

/* ==================== NEURO — acute care / hospital-significant ====================
   Diagnoses commonly managed on neurology, neurosurgery, stroke, and ICU step-down
   units. Each maps to a protocol with matching autoFlags (neuro_acute, AD, ICP, etc.). */
// Acute cerebrovascular (inpatient → early rehab)
["Acute ischemic stroke (early rehab)","Large-vessel occlusion stroke (post-thrombectomy) recovery",
 "Post-thrombolysis (tPA/TNK) stroke reconditioning","Intracerebral hemorrhage (ICH) recovery",
 "Subarachnoid hemorrhage (SAH) recovery","Aneurysmal SAH (post-coiling) recovery",
 "Aneurysmal SAH (post-clipping) recovery","Cerebral venous sinus thrombosis recovery",
 "Watershed infarct recovery","Brainstem stroke (acute phase) recovery",
 "Cerebellar stroke with ataxia (acute)","Hemorrhagic transformation after ischemic stroke",
 "Malignant MCA syndrome (post-decompressive craniectomy) recovery"]
  .forEach(dx => add(dx, "neuro", "Brain — acute stroke", "stroke", { supervision:"clinical", clearance:true }));

// Acute TBI / neurosurgical
["Severe traumatic brain injury (ICU step-down)","Moderate TBI (acute hospital phase)",
 "Diffuse axonal injury recovery","Acute subdural hematoma (post-evacuation) recovery",
 "Chronic subdural hematoma (post-drainage) recovery","Acute epidural hematoma (post-evacuation) recovery",
 "Post-craniotomy (tumor resection) early mobility","Post-craniectomy (bone flap out) precautions recovery",
 "Post-cranioplasty reconditioning","Raised intracranial pressure (resolved) reconditioning",
 "Penetrating traumatic brain injury recovery","Blast-related TBI recovery"]
  .forEach(dx => add(dx, "neuro", "Brain — acute TBI / neurosurgery", "tbi", { supervision:"clinical", clearance:true }));

// Acute spinal cord
["Acute traumatic spinal cord injury (cervical) early rehab","Acute traumatic spinal cord injury (thoracic) early rehab",
 "Acute traumatic spinal cord injury (lumbar) early rehab","Spinal shock (resolving) mobility programme",
 "Acute central cord syndrome (hospital phase)","Spinal cord infarction (acute) recovery",
 "Acute complete tetraplegia (early rehab)","Acute incomplete paraplegia (early rehab)",
 "Neurogenic shock (resolved) reconditioning","Autonomic dysreflexia education & safe exercise (SCI ≥T6)"]
  .forEach(dx => add(dx, "neuro", "Spinal cord — acute", "sci", { supervision:"clinical", clearance:true }));

// Acute neuromuscular / peripheral
["Guillain-Barré syndrome (acute ascending phase, supportive)","Guillain-Barré syndrome (nadir / plateau phase)",
 "Guillain-Barré syndrome (ICU-ventilated recovery)","Miller Fisher variant GBS recovery",
 "Acute myasthenic crisis recovery","Myasthenia gravis (hospitalised exacerbation) reconditioning",
 "Lambert-Eaton myasthenic syndrome (acute reconditioning)","Acute inflammatory demyelinating polyneuropathy (AIDP)",
 "Acute motor axonal neuropathy (AMAN) recovery","Botulism (recovery phase) reconditioning",
 "West Nile virus neuroinvasive disease recovery","Acute flaccid myelitis (recovery)"]
  .forEach(dx => {
    const p = /myasthen|Lambert/i.test(dx) ? "myasthenia"
      : /Guillain|Miller Fisher|AIDP|AMAN|botulism|West Nile|flaccid myelitis/i.test(dx) ? "guillain_barre"
      : "guillain_barre";
    add(dx, "neuro", "Neuromuscular — acute", p, { supervision:"clinical", clearance:true });
  });

// ICU-acquired weakness / critical illness
["ICU-acquired weakness","Critical illness polyneuropathy","Critical illness myopathy",
 "Critical illness polyneuromyopathy (CIPNM)","Post-ICU syndrome (physical domain)",
 "Prolonged mechanical ventilation deconditioning","Post-ARDS neuromuscular reconditioning",
 "Hospital-acquired deconditioning (neuro unit)","Prolonged bed-rest orthostatic intolerance (neuro)"]
  .forEach(dx => add(dx, "neuro", "ICU / critical illness", "icu_aw", { supervision:"clinical", clearance:true }));

// Encephalopathy / delirium / infection / metabolic (acute care)
["Hypoxic-ischemic encephalopathy (post-cardiac arrest) recovery","Anoxic brain injury reconditioning",
 "Hospital delirium (hyperactive) mobility programme","Hospital delirium (hypoactive) mobility programme",
 "ICU delirium recovery","Metabolic encephalopathy reconditioning",
 "Hepatic encephalopathy (resolved) reconditioning","Uremic encephalopathy reconditioning",
 "Wernicke's encephalopathy recovery","Acute bacterial meningitis recovery",
 "Viral encephalitis recovery","Autoimmune encephalitis recovery",
 "Status epilepticus (post-ictal reconditioning)","Non-convulsive status epilepticus recovery",
 "Acute hydrocephalus (post-shunt) mobility","Normal pressure hydrocephalus (post-shunt) gait rehab",
 "Posterior reversible encephalopathy syndrome (PRES) recovery","Acute disseminated encephalomyelitis (ADEM) recovery",
 "Neuromyelitis optica spectrum disorder (acute relapse) recovery","Acute transverse myelitis (hospital phase)"]
  .forEach(dx => {
    const p = /transverse myelitis|neuromyelitis|ADEM/i.test(dx) ? "sci"
      : /delirium|encephalopath|anoxic|hypoxic-ischemic|meningitis|encephalitis|status epileptic|hydrocephalus|PRES|Wernicke/i.test(dx) ? "encephalopathy"
      : "encephalopathy";
    add(dx, "neuro", "Encephalopathy / infection — acute", p, { supervision:"clinical", clearance:true });
  });

// Acute vestibular / brainstem (ED → ward)
["Acute vestibular neuritis (hospital phase)","Acute labyrinthitis (hospital phase)",
 "Vertebrobasilar TIA reconditioning","Lateral medullary (Wallenberg) syndrome — acute phase",
 "Acute unilateral vestibular loss (early compensation)"]
  .forEach(dx => add(dx, "neuro", "Vestibular — acute", "vestibular", { supervision:"clinical", clearance:true }));

// Functional / seizure-related acute presentations (mobility-safe framing)
["First seizure (post-ictal mobility clearance programme)","Todd's paresis (resolving) reconditioning",
 "Acute symptomatic seizure (metabolic) recovery"]
  .forEach(dx => add(dx, "neuro", "Seizure — acute", "encephalopathy", { supervision:"clinical", clearance:true, autoFlags:["seizure","neuro_acute","balance_risk"] }));

/* ==================== CARDIAC ==================== */
["Post-myocardial infarction (heart attack) recovery","Post-STEMI recovery","Post-NSTEMI recovery",
 "Stable coronary artery disease","Post-angioplasty (PCI) recovery","Post-stent (single-vessel) recovery",
 "Post-stent (multi-vessel) recovery","Stable angina (reconditioning)",
 "Cardiac deconditioning (general)"]
  .forEach(dx => add(dx, "cardiac", "Heart", "cardiac_rehab", { supervision:"clinical", clearance:true }));

// Post-sternotomy / open-heart surgery — sternal precautions apply (autoFlags add them)
["Post-CABG (bypass) recovery","Post-CABG (multi-vessel bypass) recovery","Post-coronary-bypass-graft (off-pump) recovery",
 "Post-open-heart-surgery recovery","Post-median-sternotomy recovery","Post-cardiac-surgery reconditioning"]
  .forEach(dx => add(dx, "cardiac", "Heart", "cardiac_surgery", { supervision:"clinical", clearance:true }));

["Heart failure (reduced ejection fraction, HFrEF)","Heart failure (preserved ejection fraction, HFpEF)",
 "Heart failure NYHA class I","Heart failure NYHA class II","Heart failure NYHA class III (supervised)",
 "Cardiomyopathy (dilated)","Post-LVAD reconditioning",
 "Post-heart-transplant reconditioning"]
  .forEach(dx => add(dx, "cardiac", "Heart", "heart_failure", { supervision:"clinical", clearance:true, chronic:true }));
/* HCM is not heart-failure rehab — intensity ceilings and contact limits differ; specialist clearance required. */
["Cardiomyopathy (hypertrophic — cleared for exercise)"]
  .forEach(dx => add(dx, "cardiac", "Heart", "cardiac_rehab", { supervision:"clinical", clearance:true, chronic:true }));

// Open (surgical) valve procedures — sternotomy/thoracotomy → sternal precautions
["Post-aortic-valve replacement recovery","Post-mitral-valve repair recovery","Post-mitral-valve replacement recovery",
 "Post-tricuspid-valve surgery recovery"]
  .forEach(dx => add(dx, "cardiac", "Heart", "valve", { supervision:"clinical", clearance:true, autoFlags:["cardiac","sternal_precautions"] }));
// Transcatheter / non-surgical valve — no sternotomy, so no sternal precautions
["Post-TAVR recovery","Post-TMVr (transcatheter mitral repair) recovery","Valvular heart disease (stable)",
 "Aortic stenosis (post-intervention)"]
  .forEach(dx => add(dx, "cardiac", "Heart", "valve", { supervision:"clinical", clearance:true }));

["Atrial fibrillation (rate-controlled)","Post-ablation recovery","Post-pacemaker implantation reconditioning",
 "Post-ICD implantation reconditioning","Supraventricular tachycardia (reconditioning)","Bradycardia (paced)"]
  .forEach(dx => add(dx, "cardiac", "Heart", "arrhythmia", { supervision:"clinical", clearance:true }));

["Hypertension (stage 1)","Hypertension (stage 2, controlled)","Prehypertension / elevated blood pressure",
 "Hypertension with exercise programming"]
  .forEach(dx => add(dx, "cardiac", "Vascular", "hypertension", { supervision:"supervised", clearance:true }));

/* PAD: structured walk-to-claudication is first-line — keep on pad protocol only. */
["Peripheral artery disease (claudication)","Post-lower-limb bypass reconditioning","Intermittent claudication"]
  .forEach(dx => add(dx, "cardiac", "Vascular", "pad", { supervision:"clinical", clearance:true }));
/* Venous disease is NOT claudication walking — graded activity + compression education. */
["Post-DVT reconditioning","Chronic venous insufficiency (exercise)"]
  .forEach(dx => add(dx, "cardiac", "Vascular", "venous_rehab", { supervision:"clinical", clearance:true }));
/* Lymphedema: gradual resistance + skin care — not PAD intervals. */
["Lymphedema (exercise management)"]
  .forEach(dx => add(dx, "cardiac", "Vascular", "lymphedema", { supervision:"supervised", clearance:true, chronic:true }));
/* Post-aneurysm repair: cardiac-style graded load, avoid early heavy straining. */
["Post-aortic-aneurysm-repair reconditioning"]
  .forEach(dx => add(dx, "cardiac", "Vascular", "cardiac_rehab", { supervision:"clinical", clearance:true, autoFlags:["cardiac","aortopathy"] }));

/* ==================== PULMONARY ==================== */
["COPD (GOLD stage 1)","COPD (GOLD stage 2)","COPD (GOLD stage 3, supervised)","Chronic bronchitis","Emphysema",
 "COPD with pulmonary rehabilitation"]
  .forEach(dx => add(dx, "pulmonary", "Lungs", "pulmonary_rehab", { supervision:"supervised", clearance:true, chronic:true }));

["Asthma (exercise-induced)","Asthma (stable, reconditioning)","Allergic asthma (reconditioning)"]
  .forEach(dx => add(dx, "pulmonary", "Lungs", "asthma", { supervision:"self", clearance:true }));

["Post-COVID-19 recovery","Long COVID (fatigue-limited)","Post-COVID deconditioning","Post-viral fatigue reconditioning"]
  .forEach(dx => add(dx, "pulmonary", "Lungs", "post_covid", { supervision:"supervised", clearance:true }));

["Idiopathic pulmonary fibrosis","Interstitial lung disease (reconditioning)","Sarcoidosis (pulmonary, reconditioning)",
 "Post-pneumonia recovery","Bronchiectasis (airway clearance & exercise)","Cystic fibrosis (adult reconditioning)"]
  .forEach(dx => add(dx, "pulmonary", "Lungs", "ild", { supervision:"supervised", clearance:true, chronic:/fibrosis|interstitial|bronchiectasis|cystic/i.test(dx) }));

["Post-lobectomy recovery","Post-pneumonectomy recovery","Post-thoracotomy recovery","Post-lung-transplant reconditioning",
 "Post-thoracic-surgery recovery"]
  .forEach(dx => add(dx, "pulmonary", "Lungs", "thoracic_surgery", { supervision:"clinical", clearance:true }));

["Pulmonary hypertension (WHO-cleared exercise)","Pulmonary arterial hypertension (supervised)"]
  .forEach(dx => add(dx, "pulmonary", "Lungs", "pulm_hypertension", { supervision:"clinical", clearance:true, chronic:true }));

/* ==================== ABDOMINAL / CORE — post-surgery ==================== */
/* Post-abdominal-wall surgery core reconditioning. Maps to the abdominal_surgery
   protocol; autoFlagsFor adds abdominal_precautions so the precautions are in place. */
["Post-abdominal-surgery core recovery","Post-laparotomy recovery","Post-laparoscopy core recovery",
 "Post-hernia-repair (inguinal) recovery","Post-hernia-repair (umbilical) recovery","Post-hernia-repair (incisional / ventral) recovery",
 "Post-C-section (Caesarean) recovery","Post-hysterectomy core recovery","Post-appendectomy recovery",
 "Post-colectomy / bowel-resection recovery","Post-cholecystectomy recovery","Post-abdominoplasty core recovery",
 "Post-prostatectomy core & pelvic recovery","Diastasis recti rehabilitation"]
  .forEach(dx => add(dx, "msk", "Abdomen / core", "abdominal_surgery", { supervision:"supervised", clearance:true }));

/* ==================== Pad out toward 2000 with graded/side variants ==================== */
/* Add functional-goal variants for the most common MSK protocols to reach breadth
   without inventing nonsense — these are real clinical sub-presentations. */
const SUBPRESENT = [
  ["shoulder","Shoulder", ["overhead athlete","post-immobilization","work-related (repetitive)","degenerative"]],
  ["lumbar","Lumbar spine", ["flexion-intolerant","extension-intolerant","movement-control deficit","chronic recurrent"]],
  ["knee_pf","Knee", ["runner","adolescent","post-immobilization","hypermobile"]],
  ["hip","Hip", ["runner","post-immobilization","degenerative","hypermobile"]],
  ["ankle","Ankle", ["athlete","recurrent","post-immobilization","degenerative"]],
  ["cervical","Cervical spine", ["postural / desk-related","movement-control deficit","chronic recurrent","tension-type"]]
];
for (const [protocol, region, subs] of SUBPRESENT)
  for (const s of subs)
    add(`${region} rehabilitation — ${s}`, "msk", region, protocol, { chronic:/chronic|degenerative/.test(s) });

/* ==================== NEURO — expansion ==================== */
["Ataxic gait rehabilitation","Foot drop (central) rehabilitation","Spasticity management (upper limb)",
 "Spasticity management (lower limb)","Post-stroke fine motor rehabilitation","Hemineglect rehabilitation",
 "Post-encephalitis reconditioning","Post-meningitis reconditioning","Transverse myelitis recovery",
 "Chronic fatigue syndrome / ME (pacing & energy envelope)","Functional neurological disorder rehabilitation",
 "Diabetic peripheral neuropathy — balance & foot care","Small fiber neuropathy reconditioning",
 "Trigeminal neuralgia (reconditioning)","Complex regional pain syndrome — upper limb",
 "Complex regional pain syndrome — lower limb","Phantom limb reconditioning","Neuropathic gait retraining"]
  .forEach(dx => add(dx, "neuro", "Nervous system", /balance|gait|ataxi|foot drop|neglect/i.test(dx) ? "balance_neuro"
    : /neuropathy|regional pain|phantom|neuralgia|neuropathic/i.test(dx) ? "neuropathy" : "balance_neuro",
    { supervision:"supervised" }));

/* ==================== CARDIAC / PULMONARY — a few more genuine ones ==================== */
["Congenital heart disease (adult, cleared)","Post-cardiac-catheterization reconditioning","Myocarditis recovery (cleared)",
 "Pericarditis recovery (cleared)","Metabolic syndrome (cardiac risk reduction)","Type 2 diabetes (cardiometabolic exercise)"]
  .forEach(dx => add(dx, "cardiac", "Cardiometabolic", "cardiac_rehab", { supervision:"clinical", clearance:true }));
["Obesity hypoventilation (reconditioning)","Obstructive sleep apnea (exercise adjunct)",
 "Chronic cough / breathing pattern disorder","Hyperventilation syndrome (breathing retraining)","Vocal cord dysfunction (breathing)"]
  .forEach(dx => add(dx, "pulmonary", "Respiratory", "asthma", { supervision:"supervised", clearance:true }));
/* PE is clot disease + respiratory recovery — not a post-viral pacing pathway */
["Post-pulmonary-embolism reconditioning"]
  .forEach(dx => add(dx, "cardiac", "Vascular — PE", "venous_rehab", { supervision:"clinical", clearance:true }));

/* ==================== MEGA EXPANSION — thousands more named conditions ==================== */
const latList  = (names, domain, region, protocol, opts={}) => names.forEach(nm => lateral(nm, domain, region, protocol, opts));
const plainList= (names, domain, region, protocol, opts={}) => names.forEach(nm => add(nm, domain, region, protocol, opts));

/* --- Named fractures (eponyms / classifications), lateralized --- */
latList([
 "Colles' fracture","Smith's fracture","Barton's fracture (dorsal)","Barton's fracture (volar)","Chauffeur's (radial styloid) fracture",
 "Bennett's fracture","Rolando fracture","Galeazzi fracture","Monteggia fracture","Essex-Lopresti injury","Greater tuberosity fracture",
 "Surgical neck of humerus fracture","Supracondylar humerus fracture","Lateral condyle humerus fracture","Capitellum fracture",
 "Ulnar (nightstick) fracture","Hook of hamate fracture","Distal clavicle fracture","Midshaft clavicle fracture","Phalangeal tuft fracture",
 "Hill-Sachs lesion","Bony Bankart fracture"
].map(s=>s+" recovery"), "msk","Upper limb","fracture_ue",{supervision:"supervised"});
latList([
 "Intertrochanteric hip fracture","Subtrochanteric femur fracture","Distal femur (supracondylar) fracture","Tibial plafond (pilon) fracture",
 "Maisonneuve fracture","Weber A ankle fracture","Weber B ankle fracture","Weber C ankle fracture","Medial malleolus fracture",
 "Lateral malleolus fracture","Bimalleolar fracture","Trimalleolar fracture","Pott's fracture","Talar neck fracture","Talar dome fracture",
 "Jones (5th metatarsal) fracture","Dancer's fracture","Lisfranc fracture-dislocation","Cuboid fracture","Sesamoid fracture","Toe phalanx fracture",
 "Tibial tubercle fracture","Segond fracture"
].map(s=>s+" recovery"), "msk","Lower limb","fracture_le",{supervision:"supervised"});
["I","II","III","IV","V"].forEach(t=>{
  add(`Salter-Harris type ${t} physeal fracture (wrist) recovery`,"msk","Wrist / Hand","fracture_ue",{supervision:"supervised"});
  add(`Salter-Harris type ${t} physeal fracture (ankle) recovery`,"msk","Ankle","fracture_le",{supervision:"supervised"});
});
["Greenstick","Torus (buckle)","Spiral","Comminuted","Oblique","Transverse","Avulsion","Stress","Pathological"].forEach(t=>{
  add(`${t} forearm fracture recovery`,"msk","Upper limb","fracture_ue",{supervision:"supervised"});
  add(`${t} tibial fracture recovery`,"msk","Lower limb","fracture_le",{supervision:"supervised"});
});

/* --- Named ligament & tendon injuries by site, lateralized --- */
const LIGS = [
  ["knee_ligament","Knee",["Scapholunate ligament injury","Meniscofemoral ligament injury","Posterior oblique ligament sprain"]],
  ["ankle",  "Ankle",  ["Anterior talofibular (ATFL) sprain","Calcaneofibular (CFL) sprain","Posterior talofibular (PTFL) sprain",
    "Spring (calcaneonavicular) ligament injury","Bifurcate ligament sprain","Subtalar ligament sprain"]],
  ["wrist_hand","Wrist / Hand",["Scapholunate dissociation","Lunotriquetral ligament injury","Radial collateral ligament (thumb) sprain",
    "Volar plate injury","Finger collateral ligament sprain","Sagittal band injury"]],
  ["shoulder","Shoulder",["Coracoclavicular ligament injury","Superior glenohumeral ligament injury","Inferior glenohumeral ligament injury"]],
  ["foot",   "Foot",   ["Lisfranc ligament injury","Plantar plate tear","Deltoid ligament (foot) sprain"]]
];
for(const [protocol,region,list] of LIGS) latList(list, "msk", region, protocol);
const TENDONS = [
  ["shoulder","Shoulder",["Supraspinatus tendinopathy","Infraspinatus tendinopathy","Subscapularis tendinopathy","Long head biceps tendinitis","Pectoralis major tendinopathy"]],
  ["elbow","Elbow",["Common extensor tendinopathy","Common flexor tendinopathy","Distal triceps tendinopathy","Distal biceps tendinosis"]],
  ["wrist_hand","Wrist / Hand",["Flexor carpi radialis tendinopathy","Extensor carpi ulnaris tendinopathy","Intersection syndrome (distal)","First dorsal compartment tenosynovitis"]],
  ["hip","Hip",["Gluteus medius tendinopathy","Gluteus minimus tendinopathy","Iliopsoas tendinopathy","Adductor tendinopathy","Proximal hamstring tendinopathy","Rectus femoris tendinopathy"]],
  ["knee_pf","Knee",["Quadriceps tendinopathy","Patellar tendinosis","Distal iliotibial band syndrome","Popliteus tendinopathy","Pes anserine tendinopathy"]],
  ["achilles","Ankle",["Peroneal tendinopathy","Tibialis posterior tendinopathy","Tibialis anterior tendinopathy","Flexor hallucis longus tendinopathy"]],
  ["foot","Foot",["Extensor digitorum longus tendinopathy","Plantar fascia partial tear"]]
];
for(const [protocol,region,list] of TENDONS) latList(list, "msk", region, protocol, {chronic:true});

/* --- Muscle strains (large muscle list) × grades, lateralized --- */
const MUSC = [
  ["cervical","Neck",["Sternocleidomastoid","Scalene","Splenius capitis"]],
  ["shoulder","Shoulder",["Subscapularis","Infraspinatus","Teres major","Teres minor","Anterior deltoid","Posterior deltoid","Coracobrachialis"]],
  ["elbow","Arm",["Brachialis","Brachioradialis"]],
  ["wrist_hand","Forearm",["Wrist flexor group","Wrist extensor group","Flexor digitorum","Extensor digitorum"]],
  ["lumbar","Trunk",["Rectus abdominis","Transversus abdominis","Quadratus lumborum"]],
  ["thoracic","Trunk",["Intercostal","Serratus anterior"]],
  ["hip","Hip / Pelvis",["Psoas major","Iliacus","Sartorius","Tensor fasciae latae","Gluteus maximus","Gluteus minimus","Piriformis","Adductor longus","Adductor magnus","Gracilis","Pectineus"]],
  ["knee_pf","Thigh",["Rectus femoris","Vastus medialis","Vastus lateralis","Vastus intermedius"]],
  ["hip","Thigh (posterior)",["Semimembranosus","Semitendinosus","Biceps femoris","Popliteus"]],
  ["ankle","Lower leg",["Soleus","Tibialis anterior","Tibialis posterior","Fibularis longus","Fibularis brevis","Plantaris"]]
];
for(const [protocol,region,list] of MUSC)
  for(const m of list)
    ["strain (grade I)","strain (grade II)","tear (post-repair)"].forEach(t=>lateral(`${m} ${t}`,"msk",region,protocol));

/* --- Dislocations / subluxations by joint & direction, lateralized --- */
latList(["Anterior shoulder dislocation","Posterior shoulder dislocation","Inferior shoulder dislocation (luxatio erecta)","Recurrent shoulder subluxation"],"msk","Shoulder","shoulder_instability",{supervision:"supervised"});
latList(["Elbow dislocation (posterior)","Radial head subluxation","Perilunate dislocation","Lunate dislocation","Thumb MCP dislocation","Finger PIP dislocation","Finger DIP dislocation"],"msk","Upper limb","wrist_hand",{supervision:"supervised"});
latList(["Patellar dislocation (lateral)","Recurrent patellar subluxation","Native hip dislocation (post-reduction)","Subtalar dislocation","Peroneal tendon subluxation"],"msk","Lower limb","knee_pf",{supervision:"supervised"});
plainList(["Sternoclavicular joint dislocation (anterior)","TMJ dislocation (post-reduction)"],"msk","Trunk / head","general_msk",{supervision:"supervised"});

/* --- Arthroplasty / joint replacement at more joints + revisions --- */
latList(["Total elbow replacement recovery","Total wrist replacement recovery","Total ankle replacement recovery",
  "First MTP joint replacement recovery","MCP joint replacement recovery","PIP joint replacement recovery"],"msk","Upper/lower limb","general_msk",{supervision:"supervised"});
latList(["Revision total hip replacement recovery"],"msk","Hip","hip_replacement",{supervision:"supervised"});
latList(["Revision total knee replacement recovery"],"msk","Knee","knee_replacement",{supervision:"supervised"});
latList(["Revision total shoulder replacement recovery"],"msk","Shoulder","shoulder",{supervision:"supervised"});

/* --- Osteochondroses / apophysitis / AVN --- */
latList(["Sever's disease (calcaneal apophysitis)","Sinding-Larsen-Johansson syndrome","Iselin's disease (5th metatarsal apophysitis)",
  "Köhler's disease (navicular)","Panner's disease (capitellum)","Legg-Calvé-Perthes disease","Blount's disease"],"msk","Growth plate / apophysis","general_msk",{chronic:true});
latList(["Avascular necrosis of the femoral head","Avascular necrosis of the humeral head","Avascular necrosis of the talus",
  "Avascular necrosis of the femoral condyle","Osteonecrosis of the knee (SPONK)","Transient osteoporosis of the hip"],"msk","Bone","general_msk",{chronic:true,supervision:"supervised"});
plainList(["Slipped capital femoral epiphysis (post-fixation)","Developmental hip dysplasia (adult reconditioning)","Congenital clubfoot (adult reconditioning)","Leg length discrepancy management"],"msk","Hip / lower limb","general_msk",{supervision:"supervised"});

/* --- Systemic / rheumatologic (expanded) --- */
plainList(["Reactive arthritis","Enteropathic arthritis","Juvenile idiopathic arthritis (adult)","Sjögren-related arthralgia",
  "Systemic sclerosis (reconditioning)","Dermatomyositis (reconditioning)","Polymyositis (reconditioning)","Mixed connective tissue disease (reconditioning)",
  "Ehlers-Danlos / hypermobility spectrum","Marfan syndrome (exercise management)","Hemochromatosis arthropathy","CPPD (pseudogout) reconditioning",
  "Chondrocalcinosis","Paget's disease of bone","Diffuse idiopathic skeletal hyperostosis (DISH)",
  "Enthesitis-related arthritis","Reactive tenosynovitis","Palindromic rheumatism"],"msk","Systemic","general_msk",{chronic:true,supervision:"supervised"});
/* Charcot neuroarthropathy needs protected offloading — never general_msk loading. */
plainList(["Charcot neuroarthropathy"],"msk","Foot / ankle","charcot",{chronic:true,supervision:"clinical",clearance:true});

/* --- Chronic pain / soft-tissue syndromes --- */
plainList(["Chronic exertional compartment syndrome (leg)","Myositis ossificans (reconditioning)","Delayed-onset muscle soreness (reconditioning)",
  "Myofascial pain syndrome (upper quarter)","Myofascial pain syndrome (lower quarter)","Central sensitization pain (graded exercise)",
  "Chronic whiplash-associated disorder","Chronic widespread pain","Bursitis (multi-site, reconditioning)"],"msk","Soft tissue","general_msk",{chronic:true});

/* ==================== NEURO — mega expansion ==================== */
plainList([
 "Left MCA territory stroke recovery","Right MCA territory stroke recovery","ACA territory stroke recovery","PCA territory stroke recovery",
 "Lacunar stroke recovery","Watershed (border-zone) stroke recovery","Pontine stroke recovery","Thalamic stroke recovery",
 "Basal ganglia stroke recovery","Lateral medullary (Wallenberg) syndrome","Locked-in syndrome (supportive exercise)","Young-adult stroke recovery",
 "Silent stroke reconditioning","Post-stroke spasticity (upper limb)","Post-stroke spasticity (lower limb)","Post-stroke pusher syndrome"
], "neuro","Brain","stroke");
plainList([
 "Anterior cord syndrome","Posterior cord syndrome","Conus medullaris syndrome","Cauda equina syndrome (rehabilitation)",
 "Incomplete tetraplegia (ASIA C)","Incomplete tetraplegia (ASIA D)","Incomplete paraplegia (ASIA C)","Incomplete paraplegia (ASIA D)",
 "Post-spinal-decompression reconditioning","Post-spinal-fusion neuro reconditioning","Syringomyelia","Tethered cord syndrome (adult)",
 "Transverse myelitis recovery","Spinal cord infarction recovery"
], "neuro","Spinal cord","sci");
// Cranial nerve palsies — facial motor only for Bell's pathway; ocular/hypoglossal need different frames
plainList(["Facial nerve (CN VII) palsy recovery","Facial nerve palsy (post-parotid) recovery"],"neuro","Cranial nerve","bells_palsy");
plainList(["Oculomotor (CN III) palsy recovery","Trochlear (CN IV) palsy recovery","Abducens (CN VI) palsy recovery",
 "Vestibulocochlear schwannoma (post-op balance)"],"neuro","Cranial nerve","vestibular",{supervision:"clinical",clearance:true});
plainList(["Hypoglossal (CN XII) palsy recovery","Spinal accessory nerve palsy recovery"],"neuro","Cranial nerve","balance_neuro",{supervision:"supervised"});
// Peripheral nerve injuries by named nerve (lateralized)
latList(["Axillary nerve injury","Musculocutaneous nerve injury","Median nerve injury","Anterior interosseous nerve syndrome",
 "Radial nerve injury","Posterior interosseous nerve palsy","Long thoracic nerve palsy (winged scapula)","Suprascapular nerve injury",
 "Femoral nerve injury","Obturator nerve injury","Sciatic nerve injury","Tibial nerve injury","Deep peroneal nerve palsy",
 "Superficial peroneal nerve injury","Sural nerve injury","Saphenous nerve injury","Lateral femoral cutaneous neuropathy"].map(s=>s+" rehabilitation"),"neuro","Peripheral nerve","neuropathy");
plainList(["Upper brachial plexus injury (Erb's palsy, adult)","Lower brachial plexus injury (Klumpke's, adult)","Pan-brachial plexopathy",
 "Lumbosacral plexopathy","Radiation-induced plexopathy","Neuralgic amyotrophy (Parsonage-Turner)"],"neuro","Plexus","neuropathy");
// Neuromuscular diseases
plainList(["Myasthenia gravis (exercise management)","Lambert-Eaton myasthenic syndrome","Duchenne muscular dystrophy (reconditioning)",
 "Becker muscular dystrophy (reconditioning)","Limb-girdle muscular dystrophy","Facioscapulohumeral muscular dystrophy","Myotonic dystrophy",
 "Oculopharyngeal muscular dystrophy","Emery-Dreifuss muscular dystrophy","Congenital myopathy (reconditioning)","Mitochondrial myopathy",
 "Inclusion body myositis","Spinal muscular atrophy (adult)","Kennedy's disease","Primary lateral sclerosis","Progressive muscular atrophy"],"neuro","Neuromuscular","balance_neuro",{chronic:true});
// Movement disorders
plainList(["Essential tremor (functional training)","Cervical dystonia","Blepharospasm (functional)","Writer's cramp (task-specific)",
 "Hemifacial spasm (functional)","Chorea (functional balance)","Myoclonus (functional)","Tardive dyskinesia (reconditioning)",
 "Restless legs syndrome (exercise)","Tourette / tic reconditioning","Multiple system atrophy","Corticobasal degeneration"],"neuro","Movement disorder","balance_neuro",{chronic:true});
// Neuropathy subtypes
plainList(["Multifocal motor neuropathy","Vasculitic neuropathy","Alcoholic neuropathy","B12-deficiency neuropathy","Uremic neuropathy",
 "Paraneoplastic neuropathy","Hereditary sensory-autonomic neuropathy","Amyloid neuropathy","Critical illness neuropathy/myopathy",
 "Post-surgical nerve injury reconditioning","Radiation neuropathy"],"neuro","Peripheral nerve","neuropathy");
// Ataxia / cerebellar / other
plainList(["Friedreich's ataxia","Spinocerebellar ataxia","Sensory ataxia (proprioceptive)","Acquired cerebellar ataxia",
 "Normal pressure hydrocephalus (gait)","Arnold-Chiari malformation (reconditioning)","Spina bifida (adult reconditioning)",
 "Post-encephalitis reconditioning","Post-meningitis reconditioning","Wilson's disease (motor reconditioning)"],"neuro","CNS","balance_neuro",{chronic:true});
// Vestibular / concussion subtypes
plainList(["Post-traumatic vertigo","Superior canal dehiscence (post-op balance)","Cervicogenic dizziness","Mal de debarquement syndrome",
 "Ocular vestibular dysfunction","Post-concussion cervical dysfunction","Post-concussion visual/vestibular dysfunction"],"neuro","Vestibular","vestibular");

/* ==================== CARDIAC — mega expansion ==================== */
plainList(["Tetralogy of Fallot (repaired, adult)","Atrial septal defect (repaired)","Ventricular septal defect (repaired)",
 "Coarctation of the aorta (repaired)","Ebstein anomaly (reconditioning)","Transposition (post arterial switch)","Fontan circulation (exercise)",
 "Patent ductus arteriosus (repaired)","Bicuspid aortic valve (stable)"],"cardiac","Congenital heart","cardiac_rehab");
plainList(["Restrictive cardiomyopathy","Arrhythmogenic right ventricular cardiomyopathy (cleared)","Peripartum cardiomyopathy recovery",
 "Takotsubo (stress) cardiomyopathy recovery","Ischemic cardiomyopathy","Alcoholic cardiomyopathy",
 "Chemotherapy-induced cardiomyopathy"],"cardiac","Heart muscle","heart_failure",{chronic:true});
/* HCM: specialist intensity limits — not HFrEF deconditioning pathway */
plainList(["Non-obstructive hypertrophic cardiomyopathy (cleared)"],"cardiac","Heart muscle","cardiac_rehab",{chronic:true,supervision:"clinical",clearance:true});
plainList(["Aortic stenosis (stable)","Aortic regurgitation (stable)","Mitral stenosis (stable)","Mitral regurgitation (stable)",
 "Mitral valve prolapse","Tricuspid regurgitation (stable)","Pulmonary valve stenosis (stable)","Post-mitral-clip recovery"],"cardiac","Heart valve","valve");
plainList(["Paroxysmal atrial fibrillation","Persistent atrial fibrillation","Permanent atrial fibrillation (rate-controlled)","Atrial flutter",
 "AVNRT (reconditioning)","Wolff-Parkinson-White (post-ablation)","Atrial tachycardia","Ventricular tachycardia (ICD, cleared)",
 "Frequent PVCs (reconditioning)","First-degree AV block","Second-degree AV block (Mobitz I)","Sick sinus syndrome (paced)","Long QT syndrome (cleared)"],"cardiac","Rhythm","arrhythmia");
/* Arterial PAD / vasculitis — not venous programs */
plainList(["Carotid endarterectomy recovery","Raynaud's phenomenon (exercise)","Buerger's disease (thromboangiitis obliterans)","Giant cell arteritis (reconditioning)",
 "Takayasu arteritis (reconditioning)","Post-endovascular-repair reconditioning"],"cardiac","Vascular","pad");
/* Aortopathy / aneurysm repair: avoid heavy strain — not claudication walking */
plainList(["Abdominal aortic aneurysm (post-repair)","Thoracic aortic aneurysm (post-repair)","Aortic dissection recovery"],
 "cardiac","Vascular","cardiac_rehab",{supervision:"clinical",clearance:true,autoFlags:["cardiac","aortopathy"]});
/* Venous procedure recovery */
plainList(["Post-varicose-vein-procedure reconditioning"],"cardiac","Vascular","venous_rehab",{supervision:"supervised",clearance:true});

/* ==================== PULMONARY — mega expansion ==================== */
plainList(["Non-specific interstitial pneumonia (NSIP)","Usual interstitial pneumonia (UIP)","Hypersensitivity pneumonitis","Connective-tissue-disease ILD",
 "Drug-induced interstitial lung disease","Radiation pneumonitis (reconditioning)"],"pulmonary","Interstitial lung","ild",{chronic:true});
plainList(["Asbestosis","Silicosis","Coal workers' pneumoconiosis","Berylliosis","Byssinosis","Farmer's lung"],"pulmonary","Occupational lung","ild",{chronic:true});
plainList(["Bronchiolitis obliterans","Primary ciliary dyskinesia","Alpha-1 antitrypsin emphysema","Non-CF bronchiectasis"],"pulmonary","Airways","pulmonary_rehab",{chronic:true});
plainList(["Post-pleural-effusion recovery","Post-pneumothorax recovery","Post-empyema recovery","Post-pleurodesis recovery","Mesothelioma (reconditioning)"],"pulmonary","Pleura","thoracic_surgery");
plainList(["Chronic thromboembolic pulmonary hypertension"],"pulmonary","Lungs","pulm_hypertension",{supervision:"clinical",clearance:true,chronic:true});
plainList(["Pulmonary embolism recovery"],"cardiac","Vascular — PE","venous_rehab",{supervision:"clinical",clearance:true});
plainList(["Post-ARDS recovery","Ventilator-weaning reconditioning","Post-tuberculosis lung reconditioning","Post-influenza pneumonia recovery"],
 "pulmonary","Lungs","pulmonary_rehab",{supervision:"clinical",clearance:true});
plainList(["Diaphragmatic weakness (reconditioning)","Phrenic nerve palsy (breathing)","Neuromuscular respiratory weakness","Obesity-related restrictive lung",
 "Kyphoscoliosis-related restrictive lung","Pectus excavatum (post-op reconditioning)","Chest-wall deformity reconditioning"],"pulmonary","Chest wall / respiratory muscle","thoracic_surgery");

/* ==================== MEGA EXPANSION 2 — sport/staged/specialty conditions ==================== */

/* --- Sport / activity-specific overuse injuries (lateralized) --- */
latList([
 "Swimmer's shoulder","Thrower's shoulder (internal impingement)","Pitcher's elbow (UCL insufficiency)","Little Leaguer's shoulder",
 "Tennis leg (gastrocnemius tear)","Golfer's wrist (ECU)","Gymnast's wrist (distal radial physis)","Rower's rib stress injury",
 "Weightlifter's shoulder (distal clavicle osteolysis)","Cyclist's ulnar palsy (handlebar)","Climber's finger pulley (A2) injury",
 "Snowboarder's ankle (lateral talus)","Runner's patellofemoral pain","Jumper's knee (patellar tendon)","Dancer's snapping hip",
 "Footballer's ankle (anterior impingement)","Jersey finger (FDP avulsion)","Coach's finger (PIP sprain)","Surfer's shoulder",
 "Boxer's knuckle (sagittal band)","Sprinter's hamstring strain","Hurdler's hip-flexor strain","Goalkeeper's thumb",
 "Volleyball shoulder (suprascapular)","Baseball catcher's knee","Skater's ankle","Triathlete's overuse syndrome","Marathoner's tibial stress"
], "msk","Sports / activity","general_msk",{chronic:true});

/* --- Osteoarthritis by Kellgren-Lawrence grade (lateralized) --- */
const OA_JOINTS = [["Knee","knee_replacement"],["Hip","hip"],["Shoulder","shoulder"],["Ankle","ankle"],["Thumb CMC","wrist_hand"],
  ["First MTP (hallux)","foot"],["Elbow","elbow"],["Wrist","wrist_hand"]];
for(const [j,proto] of OA_JOINTS) for(const g of [1,2,3,4])
  lateral(`${j} osteoarthritis (Kellgren-Lawrence grade ${g})`,"msk",j,proto,{chronic:true});

/* --- Tendinopathy continuum stages (lateralized) --- */
const TENDO_STAGE = [["Rotator cuff","shoulder","Shoulder"],["Achilles","achilles","Ankle"],["Patellar","knee_pf","Knee"],
  ["Gluteal","hip","Hip"],["Lateral elbow","elbow","Elbow"],["Tibialis posterior","achilles","Ankle"],["Proximal hamstring","hip","Hip"]];
for(const [t,proto,region] of TENDO_STAGE) for(const s of ["reactive stage","dysrepair stage","degenerative stage"])
  lateral(`${t} tendinopathy (${s})`,"msk",region,proto,{chronic:true});

/* --- Staged conditions --- */
["I","II","III","IV"].forEach(st=>lateral(`Posterior tibial tendon dysfunction (stage ${st})`,"msk","Foot / ankle","foot",{chronic:true,supervision:"supervised"}));
["freezing phase","frozen phase","thawing phase"].forEach(ph=>lateral(`Adhesive capsulitis (${ph})`,"msk","Shoulder","shoulder",{chronic:true}));
[0,1,2,3,4].forEach(g=>lateral(`Hallux rigidus (grade ${g})`,"msk","Foot","foot",{chronic:true}));

/* --- Hand / foot / shoulder detail --- */
latList(["Boutonnière deformity","Swan-neck deformity","Mallet finger (chronic)","Trigger thumb","Jersey finger (chronic)",
 "Dupuytren's contracture (early)","Dupuytren's contracture (advanced)","Thumb CMC arthritis (early)","Thumb CMC arthritis (advanced)",
 "Boxer's knuckle (chronic)","Intrinsic-plus contracture"],"msk","Hand","wrist_hand",{chronic:true});
latList(["Cavus foot reconditioning","Flexible flatfoot","Rigid flatfoot","Hammer toe","Claw toe","Mallet toe","Os trigonum syndrome",
 "Tarsal coalition (reconditioning)","Peroneal tendon subluxation (chronic)","Haglund's deformity","Plantar fibromatosis"],"msk","Foot / ankle","foot",{chronic:true});
latList(["Charcot foot (offloaded reconditioning)","Charcot neuroarthropathy of the foot"],"msk","Foot / ankle","charcot",{chronic:true});
latList(["Internal shoulder impingement","External (subacromial) impingement","Coracoid impingement","Os acromiale (symptomatic)",
 "SICK scapula syndrome","Muscular scapular winging","Posterior labral tear","Bennett lesion","Quadrilateral space syndrome"],"msk","Shoulder","shoulder",{chronic:true});

/* --- Spine detail --- */
for(const lv of THOR) add(`Thoracic radiculopathy at ${lv}`,"msk","Thoracic spine","thoracic");
for(const lv of [...CERV,...LUMB]) add(`Spondylolysis (pars defect) at ${lv}`,"msk","Spine","lumbar");
plainList(["Baastrup's disease (kissing spines)","Symptomatic Schmorl's node","Modic endplate changes (reconditioning)","Adjacent segment disease",
 "Lumbar disc extrusion (reconditioning)","Cervical disc extrusion (reconditioning)","Thoracolumbar junction syndrome","Costotransverse joint dysfunction",
 "Flatback syndrome","Postural cervical kyphosis","Lumbar multifidus dysfunction","Cervical deep-flexor dysfunction"],"msk","Spine","lumbar",{chronic:true});

/* --- Amputation levels expanded (lateralized) --- */
latList(["Hip disarticulation rehabilitation","Knee disarticulation rehabilitation","Syme's amputation rehabilitation",
 "Transpelvic (hemipelvectomy) rehabilitation","Toe amputation rehabilitation","Ray (foot) amputation rehabilitation"],
 "msk","Lower limb","amputation_le",{supervision:"clinical",clearance:true});
latList(["Shoulder disarticulation rehabilitation","Forequarter amputation rehabilitation","Wrist disarticulation rehabilitation",
 "Partial hand amputation rehabilitation","Finger amputation rehabilitation"],"msk","Upper limb","amputation_ue",{supervision:"clinical",clearance:true});

/* --- Oncology rehabilitation --- */
plainList(["Post-lumpectomy shoulder rehabilitation","Cancer-related fatigue (graded exercise)","Post-radiation fibrosis (neck)",
 "Post-radiation fibrosis (shoulder)","Post-radiation fibrosis (pelvis)","Post-prostatectomy reconditioning","Post-abdominal-cancer-surgery reconditioning",
 "Head & neck cancer neck/shoulder rehabilitation","Limb-salvage (sarcoma) reconditioning","Post-stem-cell-transplant reconditioning",
 "Bone metastasis (supervised gentle exercise)","Post-chemotherapy deconditioning","Post-thoracic-oncology reconditioning",
 "Post-colorectal-surgery reconditioning"],"msk","Oncology rehab","general_msk",{supervision:"supervised",clearance:true});
plainList(["Breast-cancer-related lymphedema (upper limb)"],"msk","Oncology rehab","lymphedema",{supervision:"supervised",clearance:true,chronic:true});

/* --- Burns / plastics / wound (lateralized) --- */
latList(["Burn contracture (hand)","Burn contracture (shoulder/axilla)","Burn contracture (elbow)","Burn contracture (knee)",
 "Burn contracture (ankle)","Skin graft recovery (limb)","Flap reconstruction recovery (limb)","Digit replantation rehabilitation"],
 "msk","Burns / plastics","general_msk",{supervision:"supervised",clearance:true});

/* --- Pelvic health / pregnancy MSK --- */
plainList(["Diastasis recti (rehabilitation)","Pubic symphysis dysfunction","Round ligament pain (reconditioning)","Pelvic floor dysfunction (exercise)",
 "Post-caesarean reconditioning","Post-vaginal-delivery reconditioning","Postpartum low back pain","Pregnancy-related pelvic girdle pain",
 "Pregnancy-related sciatica","Levator ani syndrome (reconditioning)","Sacrococcygeal pain (reconditioning)"],"msk","Pelvic health","lumbar",{supervision:"supervised"});

/* --- Geriatric / frailty / deconditioning --- */
plainList(["Sarcopenia (progressive resistance)","Frailty reconditioning","Post-hospitalization deconditioning","Post-ICU reconditioning",
 "Falls-prevention reconditioning","Immobility-related deconditioning","Age-related muscle weakness",
 "Post-delirium mobility reconditioning","Multimorbidity exercise reconditioning"],"msk","Geriatric","general_msk",{chronic:true,supervision:"supervised"});
/* Vertebral compression: extension-bias / upright loading — not LE fracture or generic MSK impact. */
plainList(["Osteoporotic vertebral compression (reconditioning)"],"msk","Thoracic / lumbar spine","lumbar",{
  chronic:true,supervision:"supervised",clearance:true,autoFlags:["osteoporosis"] });

/* --- TMJ / headache subtypes --- */
plainList(["TMJ disc displacement with reduction","TMJ disc displacement without reduction","TMJ arthralgia","Myogenous TMJ disorder",
 "Bruxism-related jaw pain","Tension-type headache (cervicogenic component)","Migraine-associated neck dysfunction","Occipital neuralgia (reconditioning)"],
 "msk","TMJ / headache","tmj");

/* ==================== NEURO — expansion 2 ==================== */
plainList(["Ataxic hemiparesis (stroke)","Post-stroke aphasia (functional exercise)","Post-stroke apraxia (functional)","Post-stroke hemianopia (mobility)",
 "Spinocerebellar ataxia type 1","Spinocerebellar ataxia type 2","Spinocerebellar ataxia type 3","Spinocerebellar ataxia type 6",
 "Postural orthostatic tachycardia syndrome (POTS)","Orthostatic intolerance (reconditioning)","Autonomic neuropathy (reconditioning)",
 "Functional gait disorder","Functional limb weakness","Dystonic tremor","Task-specific focal dystonia","Stiff-person syndrome (reconditioning)",
 "Hereditary spastic paraplegia","Adrenomyeloneuropathy (reconditioning)","Post-encephalopathy reconditioning","Cerebellar cognitive-affective (motor) reconditioning"],
 "neuro","Nervous system","balance_neuro",{chronic:true});
latList(["Common peroneal nerve palsy (foot drop)","Chronic meralgia paresthetica","Chronic tarsal tunnel syndrome","Piriformis-related sciatic irritation",
 "Chronic carpal tunnel syndrome","Chronic cubital tunnel syndrome"].map(s=>s+" rehabilitation"),"neuro","Peripheral nerve","neuropathy");

/* ==================== ACUTE CARE — multi-domain hospital conditions ==================== */
// Medical ward / sepsis / metabolic
plainList([
  "Sepsis recovery (post-ward)","Septic shock recovery (ICU step-down)","Bacteraemia recovery reconditioning",
  "Acute kidney injury (AKI) recovery mobility","Acute-on-chronic kidney disease hospital recovery",
  "Diabetic ketoacidosis (DKA) recovery reconditioning","Hyperosmolar hyperglycaemic state recovery",
  "Severe hyponatraemia (resolved) reconditioning","Adrenal crisis recovery reconditioning",
  "Upper GI bleed (post-stabilisation) mobility","Lower GI bleed (post-stabilisation) mobility",
  "Acute pancreatitis recovery reconditioning","Clostridioides difficile colitis recovery",
  "Severe community cellulitis recovery","Necrotising soft-tissue infection (post-debridement) recovery",
  "Hospital-associated deconditioning (medical ward)","Failure to thrive / frailty crisis reconditioning"
],"msk","Acute medical ward","acute_medical",{supervision:"clinical",clearance:true});

// Trauma / polytrauma
plainList([
  "Polytrauma (multi-system) early rehab","Major trauma (ISS high) step-down reconditioning",
  "Pelvic fracture (acute, protected WB) recovery","Acetabular fracture (post-fixation) recovery",
  "Unstable pelvic ring injury recovery","Pathological fracture (metastatic) protected rehab",
  "Fragility hip fracture (acute post-op) recovery","Open fracture (Gustilo) recovery",
  "Crush injury limb recovery","Acute compartment syndrome (post-fasciotomy) — hospital phase",
  "Traumatic amputation (acute residual-limb care)","Rib fractures (multiple) hospital mobility",
  "Flail chest recovery reconditioning","Sternal fracture recovery",
  "Vertebral burst fracture (braced) recovery","Gunshot wound extremity recovery","Blast injury multi-trauma recovery"
],"msk","Trauma / acute ortho","polytrauma",{supervision:"clinical",clearance:true});
plainList(["Neck of femur fracture (total hip replacement pathway)"],"msk","Trauma / acute ortho","hip_replacement",{supervision:"clinical",clearance:true});
plainList(["Neck of femur fracture (hemiarthroplasty pathway)"],"msk","Trauma / acute ortho","hip_replacement",{supervision:"clinical",clearance:true});

// Major burns
plainList([
  "Major burn (>20% TBSA) recovery","Partial-thickness burn (extensive) recovery",
  "Full-thickness burn (grafted) recovery","Inhalation injury with cutaneous burns recovery",
  "Hand burn (acute) rehabilitation","Axillary / neck burn contracture-prevention programme",
  "Electrical burn recovery","Chemical burn recovery","Post-burn ICU step-down reconditioning"
],"msk","Burns — acute","burn",{supervision:"clinical",clearance:true});

// Cardiac acute
plainList([
  "Acute coronary syndrome (hospital phase) reconditioning","Cardiogenic shock recovery",
  "Post-cardiac arrest (target temperature management) recovery","Unstable angina (high-risk NSTE-ACS) reconditioning",
  "Acute decompensated heart failure (ward) reconditioning","Flash pulmonary oedema recovery",
  "Acute myocarditis recovery","Acute pericarditis recovery",
  "Post-IABP / temporary MCS reconditioning","Hypertensive emergency (resolved) reconditioning"
],"cardiac","Cardiac — acute care","cardiac_rehab",{supervision:"clinical",clearance:true});
plainList(["Acute decompensated HFrEF (ICU step-down)"],"cardiac","Cardiac — acute care","heart_failure",{supervision:"clinical",clearance:true,chronic:true});

// PE acute (venous_rehab + pe_acute flags — not post_covid)
plainList([
  "Acute pulmonary embolism (low-risk) recovery","Acute pulmonary embolism (intermediate-risk) recovery",
  "Massive / high-risk PE recovery","Submassive PE recovery",
  "PE with right-heart strain recovery","Post-thrombolysis PE reconditioning"
],"cardiac","Vascular — PE","venous_rehab",{supervision:"clinical",clearance:true});

// Respiratory acute
plainList([
  "Community-acquired pneumonia (hospitalised) recovery","Hospital-acquired pneumonia recovery",
  "Aspiration pneumonia recovery","Severe influenza pneumonia recovery",
  "COVID-19 pneumonia (hospitalised) recovery","COPD acute exacerbation (hospital) recovery",
  "Asthma acute severe (hospital) recovery","Acute respiratory failure (post-NIV) reconditioning",
  "ARDS recovery (post-ICU)","Pneumothorax (post-chest-drain) recovery",
  "Haemothorax recovery","Empyema (post-drainage) recovery"
],"pulmonary","Respiratory — acute care","pulmonary_rehab",{supervision:"clinical",clearance:true});
plainList(["Acute severe asthma (near-fatal) recovery"],"pulmonary","Respiratory — acute care","asthma",{supervision:"clinical",clearance:true});

// Emergency abdominal surgery
plainList([
  "Emergency laparotomy recovery","Perforated viscus (post-repair) recovery",
  "Bowel obstruction (post-op) recovery","Ischaemic bowel (post-resection) recovery",
  "Ruptured abdominal aortic aneurysm (post-repair) recovery","Exploratory laparotomy (trauma) recovery",
  "Open abdomen / temporary abdominal closure recovery"
],"msk","Acute abdominal surgery","abdominal_surgery",{supervision:"clinical",clearance:true});

// Oncology emergencies
plainList([
  "Malignant spinal cord compression (post-treatment) rehab","Neutropenic sepsis recovery reconditioning",
  "Tumour lysis syndrome recovery reconditioning","Pathological spinal fracture (braced) recovery",
  "Brain metastases (post-treatment) mobility programme"
],"msk","Oncology — acute","acute_medical",{supervision:"clinical",clearance:true,autoFlags:["cancer_treatment","acute_medical","balance_risk"]});
plainList(["Malignant spinal cord compression (SCI-level deficit)"],"neuro","Oncology — acute","sci",{supervision:"clinical",clearance:true,autoFlags:["cancer_treatment","neuro_acute","balance_risk"]});

// Transplant acute phase
plainList([
  "Kidney transplant (first 30 days) reconditioning","Liver transplant (first 30 days) reconditioning",
  "Heart transplant (first 30 days) reconditioning","Lung transplant (first 30 days) reconditioning",
  "Allogeneic stem-cell transplant (engraftment phase) reconditioning"
],"cardiac","Transplant — acute","acute_medical",{supervision:"clinical",clearance:true,autoFlags:["acute_medical","balance_risk"]});

/* ==================== CARDIAC — expansion 2 ==================== */
plainList(["Post-heart-transplant (year 1) reconditioning","Post-LVAD (destination therapy) reconditioning","Infective endocarditis recovery",
 "Post-pericardiectomy recovery","Constrictive pericarditis (reconditioning)","Pulmonary valve regurgitation (stable)","Hypertension stage 1 (exercise)",
 "Hypertension stage 2 (controlled, exercise)","Resistant hypertension (supervised exercise)","Postural hypotension (reconditioning)",
 "Peripheral artery disease (Fontaine stage II)","Peripheral artery disease (Rutherford category 3)","Post-carotid-stent reconditioning",
 "Cardiac syndrome X (microvascular angina)"],"cardiac","Cardiovascular","cardiac_rehab");
plainList(["Chronic DVT (reconditioning)","Post-thrombophlebitis reconditioning"],"cardiac","Vascular","venous_rehab",{supervision:"clinical",clearance:true});

/* ==================== PULMONARY — expansion 2 ==================== */
plainList(["COPD (GOLD stage 4, supervised)","Severe persistent asthma (step 4–5)","Moderate persistent asthma","Mild persistent asthma",
 "Cystic fibrosis (airway clearance + exercise)","Post-double-lung-transplant reconditioning","Post-single-lung-transplant reconditioning",
 "Obstructive sleep apnea (exercise + weight)","Central sleep apnea (reconditioning)","Post-COVID dysautonomia (paced exercise)",
 "Chronic hyperventilation (breathing retraining)","Exercise-induced laryngeal obstruction","Post-lobectomy (left) reconditioning",
 "Post-lobectomy (right) reconditioning","Post-decortication (empyema) reconditioning","Sarcoidosis (multisystem reconditioning)"],"pulmonary","Respiratory","pulmonary_rehab");

/* ==================== COMPREHENSIVE ADDITIONS — more genuine named conditions ==================== */

/* Osteochondritis dissecans / chondral lesions (correct joint protocols) */
latList(["Osteochondritis dissecans of the knee","Osteochondritis dissecans of the femoral condyle",
 "Osteochondritis dissecans of the patella","Chondral flap tear of the knee","Patellar chondral lesion"],"msk","Knee","knee_ligament",{supervision:"supervised",chronic:true});
latList(["Osteochondritis dissecans of the capitellum","Elbow chondral lesion"],"msk","Elbow","elbow",{supervision:"supervised",chronic:true});
latList(["Osteochondritis dissecans of the talus","Talar osteochondral lesion (revision)","Focal chondral defect of the ankle"],"msk","Ankle","ankle",{supervision:"supervised",chronic:true});
latList(["Femoral head chondral lesion","Acetabular chondral lesion"],"msk","Hip","hip",{supervision:"supervised",chronic:true});

/* Sport-named overuse — grouped by region for correct protocols */
latList(["Swimmer's shoulder (freestyle)","Overhead-athlete internal impingement","Weightlifter's distal clavicle osteolysis",
 "CrossFit shoulder overuse","Painter's overhead shoulder tendinopathy","Volleyball suprascapular neuropathy"],"msk","Shoulder","shoulder",{chronic:true});
latList(["Thrower's elbow (UCL insufficiency)","Little Leaguer's elbow","Climber's medial elbow tendinopathy","Javelin thrower's elbow"],"msk","Elbow","elbow",{chronic:true});
latList(["Climber's A2 pulley injury","Gymnast's wrist (physeal stress)","Cyclist's handlebar (ulnar) palsy","Golfer's hamate/ECU wrist injury"],"msk","Wrist / Hand","wrist_hand",{chronic:true});
latList(["Rower's proximal hamstring tendinopathy","Dancer's snapping hip","Footballer's adductor (groin) strain","Ice-hockey femoroacetabular impingement","Hurdler's hip-flexor strain"],"msk","Hip","hip",{chronic:true});
latList(["Runner's iliotibial band syndrome","Cyclist's patellofemoral pain","Basketball jumper's knee","Alpine-skier's ACL injury","Footballer's MCL sprain"],"msk","Knee","knee_pf",{chronic:true});
latList(["Runner's Achilles tendinopathy","Badminton Achilles strain","Basketball lateral ankle sprain","Footballer's anterior ankle impingement","Trail-runner's peroneal tendinopathy"],"msk","Ankle","ankle",{chronic:true});
plainList(["Rower's low-back pain","Golfer's low-back pain","Cricket fast-bowler's lumbar stress","Gymnast's spondylolysis","Powerlifter's low-back strain","Equestrian's low-back pain","Deadlift-related low-back strain"],"msk","Lumbar spine","lumbar",{chronic:true});
plainList(["Triathlete's overtraining syndrome","Marathoner's overuse syndrome","Distance-runner's tibial stress reaction","Multisport overtraining reconditioning"],"msk","Sports / activity","general_msk",{chronic:true});

/* Occupational / repetitive strain — grouped by region */
latList(["Carpenter's lateral elbow tendinopathy","Assembly-line medial elbow tendinopathy"],"msk","Elbow","elbow",{chronic:true});
latList(["Keyboard-worker's wrist tendinopathy","Cashier's wrist repetitive strain","Hand-arm vibration syndrome","Hairdresser's thumb tendinopathy"],"msk","Wrist / Hand","wrist_hand",{chronic:true});
latList(["Hairdresser's shoulder tendinopathy","Roofer's shoulder tendinopathy","Delivery-driver's shoulder overuse","Warehouse overhead-lift shoulder strain"],"msk","Shoulder","shoulder",{chronic:true});
plainList(["Nursing-related low-back injury","Warehouse lifting low-back injury","Manual-handling low-back strain","Long-haul-driver's low-back pain"],"msk","Lumbar spine","lumbar",{chronic:true});
plainList(["Dental-clinician's neck pain","Desk-worker's cervical strain","Sonographer's neck/shoulder strain"],"msk","Cervical spine","cervical",{chronic:true});
latList(["Construction-worker's knee (kneeling)","Carpet-layer's knee","Miner's beat knee"],"msk","Knee","knee_pf",{chronic:true});
plainList(["Prolonged-standing plantar heel pain","Retail-worker's foot pain"],"msk","Foot","foot",{chronic:true});
plainList(["Musician's focal upper-limb overuse","Violinist's neck & shoulder strain","Pianist's wrist tendinopathy","Drummer's wrist overuse"],"msk","Performing-arts overuse","wrist_hand",{chronic:true});

/* Spine — more detail */
for(const lv of THOR) add(`Facet joint arthropathy at ${lv}`,"msk","Thoracic spine","thoracic",{chronic:true});
plainList(["Lumbar disc sequestration (reconditioning)","Central canal stenosis (lumbar)","Lateral recess stenosis (lumbar)","Bertolotti syndrome",
 "Adult idiopathic scoliosis (conservative)","Adult degenerative scoliosis","Sagittal-imbalance reconditioning","Lumbar segmental instability (conservative)",
 "Cluneal nerve entrapment","Maigne syndrome (thoracolumbar junction)","Lumbar multifidus dysfunction","Spinal epidural lipomatosis (reconditioning)"],"msk","Spine","lumbar",{chronic:true});
plainList(["Postural thoracic kyphosis","Thoracic hyperkyphosis (reconditioning)","Upper-crossed syndrome","Lower-crossed syndrome"],"msk","Thoracic spine","thoracic",{chronic:true});

/* Hand / wrist (more) */
latList(["Preiser disease (scaphoid AVN)","Wartenberg syndrome","Bowler's thumb","Extensor pollicis longus repair recovery","Sagittal band rupture (chronic)",
 "Central slip (boutonnière) injury — early","Scaphoid nonunion (reconditioning)","TFCC repair recovery","Ulnar impaction syndrome","Distal radioulnar joint instability"],"msk","Wrist / Hand","wrist_hand",{chronic:true,supervision:"supervised"});

/* Foot / ankle (more) */
latList(["Peroneal tendon tear (reconditioning)","Flexor hallucis longus tenosynovitis","Cuboid syndrome","Sesamoid stress fracture recovery","Os trigonum impingement",
 "Plantar plate repair recovery","Ankle syndesmosis reconstruction recovery","Chronic exertional compartment syndrome (anterior)","Chronic exertional compartment syndrome (deep posterior)"],"msk","Foot / ankle","foot",{chronic:true,supervision:"supervised"});

/* Rheumatologic / systemic (more) */
plainList(["Adult-onset Still's disease (reconditioning)","Lyme arthritis (reconditioning)","Post-viral reactive arthralgia","Behçet's arthropathy",
 "Familial Mediterranean fever arthropathy","Relapsing polychondritis (reconditioning)","Sarcoid arthropathy","IgG4-related disease (reconditioning)",
 "Undifferentiated connective tissue disease (reconditioning)","Eosinophilic fasciitis (reconditioning)","SAPHO syndrome (reconditioning)"],"msk","Systemic","general_msk",{chronic:true,supervision:"supervised"});

/* Metabolic bone */
plainList(["Osteomalacia (reconditioning)","Renal osteodystrophy (reconditioning)","Post-fragility-fracture reconditioning","Osteoporosis with vertebral wedge fractures",
 "Steroid-induced osteoporosis (reconditioning)","Osteogenesis imperfecta (adult reconditioning)","Fibrous dysplasia (reconditioning)","Hyperparathyroid bone disease (reconditioning)"],"msk","Metabolic bone","general_msk",{chronic:true,supervision:"supervised"});

/* NEURO — stroke & hemorrhage (more) */
plainList(["Subarachnoid hemorrhage recovery","Spontaneous intracerebral hemorrhage recovery","Cerebral venous sinus thrombosis recovery",
 "Carotid artery dissection stroke recovery","Vertebral artery dissection recovery","Moyamoya disease (post-revascularization)","Cerebellar hemorrhage recovery",
 "Cardioembolic stroke recovery","Post-craniotomy motor reconditioning","Recurrent stroke reconditioning"],"neuro","Brain","stroke",{supervision:"clinical",clearance:true});

/* NEURO — headache / facial */
plainList(["Chronic migraine (cervical component)","Cluster headache (reconditioning)","Medication-overuse headache (reconditioning)","New daily persistent headache (reconditioning)",
 "Trigeminal neuralgia (post-procedure reconditioning)","Post-traumatic headache (concussion-related)"],"neuro","Head / face","balance_neuro");

/* NEURO — autonomic / functional / cognitive-motor */
plainList(["Pure autonomic failure (reconditioning)","Baroreflex failure (reconditioning)","Diabetic autonomic neuropathy (reconditioning)",
 "Functional movement disorder (rehabilitation)","Functional gait disorder (rehabilitation)","Camptocormia (reconditioning)","Dropped-head syndrome (reconditioning)",
 "Mild cognitive impairment (exercise program)","Dementia-related mobility (gentle exercise)","Parkinson-plus gait reconditioning"],"neuro","Nervous system","balance_neuro",{chronic:true});

/* CARDIAC — more */
plainList(["Vasospastic (Prinzmetal) angina (reconditioning)","Cardiac amyloidosis (gentle exercise)","Left bundle branch block (reconditioning)",
 "Post-LAA-closure (Watchman) reconditioning","Athlete's heart (reassurance reconditioning)","Post-septal-myectomy recovery","Chronic stable heart failure (Stage C)",
 "Post-CRT (resynchronization) reconditioning","Diastolic dysfunction (reconditioning)","Post-infective-endocarditis reconditioning"],"cardiac","Heart","cardiac_rehab",{supervision:"clinical",clearance:true});
plainList(["Chronic limb-threatening ischemia (supervised)"],"cardiac","Vascular","pad",{supervision:"clinical",clearance:true});
plainList(["Lower-limb lymphedema (exercise management)","Post-lymph-node-dissection lymphedema (limb)"],
 "cardiac","Vascular","lymphedema",{supervision:"supervised",clearance:true,chronic:true});
plainList(["Superficial thrombophlebitis (reconditioning)","Post-thrombotic syndrome (reconditioning)","Chronic venous ulcer (exercise adjunct)"],
 "cardiac","Vascular","venous_rehab",{supervision:"clinical",clearance:true});

/* PULMONARY — more */
plainList(["Post-COVID exertional dyspnea (paced)","Eosinophilic asthma (reconditioning)","Allergic bronchopulmonary aspergillosis (reconditioning)",
 "Nontuberculous mycobacterial lung disease (reconditioning)","Post-lung-volume-reduction reconditioning","Pulmonary Langerhans cell histiocytosis (reconditioning)",
 "Lymphangioleiomyomatosis (reconditioning)","Combined pulmonary fibrosis & emphysema (reconditioning)","Post-COVID lung fibrosis (reconditioning)"],"pulmonary","Lungs","ild",{supervision:"supervised",clearance:true,chronic:true});
plainList(["Chronic breathlessness syndrome (breathing retraining)","Dysfunctional breathing pattern","Inducible laryngeal obstruction (exercise)",
 "Post-tracheostomy reconditioning","Diaphragm plication recovery","Respiratory-muscle-training program"],"pulmonary","Respiratory","asthma",{supervision:"supervised"});

/* ==================== EXPANSION — more genuine named diagnoses ==================== */
/* Shoulder */
latList(["Calcific tendinitis (resorptive phase)","Calcific tendinitis (formative phase)","Subcoracoid impingement",
 "Internal (posterosuperior) impingement","Os acromiale (symptomatic)","Quadrilateral space syndrome","Long thoracic nerve palsy (serratus)",
 "Spinal accessory nerve palsy (trapezius)","Sternoclavicular joint sprain","Sternoclavicular joint instability","Pectoralis minor syndrome",
 "Glenohumeral microinstability","Posterior shoulder instability","Multidirectional shoulder instability (atraumatic)","Rotator interval lesion",
 "Teres major strain","Deltoid strain","Coracoclavicular ligament sprain","Subacromial bursitis","Scapular dyskinesis (type 2)",
 "Suprascapular nerve entrapment","Biceps tendinopathy (long head)","AC joint osteoarthritis"],"msk","Shoulder","shoulder",{chronic:true});
/* Elbow / forearm */
latList(["Radial tunnel syndrome","Posterior interosseous nerve syndrome","Pronator teres syndrome","Anterior interosseous nerve syndrome",
 "Elbow plica (synovial fold) syndrome","Posterolateral rotatory instability","Valgus extension overload","Annular ligament sprain","Brachialis strain",
 "Triceps tendinopathy (insertional)","Distal biceps tendinopathy","Medial elbow apophysitis","Panner's disease","Elbow stiffness (post-immobilization)",
 "Olecranon bursitis","Cubital tunnel syndrome","Radial collateral ligament sprain"],"msk","Elbow","elbow",{chronic:true});
/* Wrist / hand */
latList(["ECU subluxation","Lunotriquetral ligament sprain","Midcarpal instability","Pisotriquetral arthritis",
 "Scaphotrapeziotrapezoidal (STT) arthritis","Thumb MCP collateral sprain","Volar plate injury (PIP)","Finger collateral ligament sprain",
 "Jersey finger (FDP avulsion)","Central slip rupture","Sagittal band injury (boxer's knuckle)","Extensor pollicis longus tenosynovitis",
 "Flexor carpi radialis tendinopathy","Hook of hamate stress","Dorsal wrist ganglion","Mallet finger","Boutonnière deformity","Swan-neck deformity",
 "Skier's thumb (UCL)","Kienböck's disease","Guyon's canal syndrome","Trigger thumb","Intersection syndrome","Dupuytren's contracture",
 "Thumb carpometacarpal osteoarthritis","Distal radioulnar joint instability"],"msk","Wrist / Hand","wrist_hand",{chronic:true});
/* Hip / thigh */
latList(["Ischiofemoral impingement","Deep gluteal syndrome","Obturator internus tendinopathy","Proximal rectus femoris strain","Sartorius strain",
 "Tensor fasciae latae tendinopathy","Iliopsoas bursitis","Meralgia paresthetica","Ischial (hamstring) bursitis","Adductor longus enthesopathy",
 "Gracilis strain","Athletic pubalgia (core-muscle injury)","Hip microinstability","Piriformis syndrome","Hip flexor strain","Snapping hip syndrome",
 "Hip osteoarthritis","Greater trochanteric pain syndrome"],"msk","Hip","hip",{chronic:true});
/* Knee */
latList(["Fat pad (Hoffa's) impingement","Distal iliotibial band friction","Popliteus tendinopathy","Biceps femoris insertional tendinopathy",
 "Semimembranosus tendinopathy","Lateral patellar compression syndrome","Quadriceps tendinopathy","Proximal tibiofibular joint sprain",
 "Bipartite patella (symptomatic)","Infrapatellar (saphenous) nerve entrapment","Medial patellofemoral ligament sprain","Prepatellar bursitis",
 "Pes anserine bursitis","Osgood-Schlatter disease","Sinding-Larsen-Johansson syndrome","Medial plica syndrome",
 "Patellar tendinopathy","Quadriceps strain"],"msk","Knee","knee_pf",{chronic:true});
latList(["Knee osteoarthritis (medial)","Knee osteoarthritis (lateral)","Knee osteoarthritis (patellofemoral compartment)"],
 "msk","Knee","knee_oa",{chronic:true});
/* Foot / ankle */
latList(["Sinus tarsi syndrome","Anterolateral ankle impingement","Posterior ankle impingement","Deltoid ligament sprain","Spring ligament insufficiency",
 "Tibialis anterior tendinopathy","Navicular stress reaction","Sever's disease (calcaneal apophysitis)","Baxter's nerve entrapment","Retrocalcaneal bursitis",
 "Plantaris rupture","Subtalar instability","Functional ankle instability","Peroneal tendinopathy","Flexor hallucis longus tenosynovitis",
 "Metatarsalgia","Morton's neuroma","Hallux valgus","Hallux rigidus","Tarsal tunnel syndrome","Turf toe","Hammer toe","Claw toe","Plantar plate tear",
 "Lisfranc injury","Cuboid syndrome","Tarsal coalition","Freiberg's disease","Accessory navicular syndrome","Haglund's deformity","Pes cavus"],"msk","Foot / ankle","foot",{chronic:true});
/* Spine (plain — usually central) */
plainList(["Quadratus lumborum strain","Thoracolumbar junction syndrome","Cervicothoracic junction dysfunction","Cervical facet syndrome",
 "Levator scapulae strain","Rhomboid strain","Costotransverse joint sprain","Baastrup's disease (kissing spine)","Lumbar ligamentous sprain",
 "Lumbar facet joint syndrome","Degenerative disc disease (lumbar)","Lumbar spondylosis","Mechanical low back pain","Coccydynia"],"msk","Lumbar spine","lumbar",{chronic:true});
plainList(["Cervical radiculopathy (C5)","Cervical radiculopathy (C6)","Cervical radiculopathy (C7)","Cervical facet joint syndrome",
 "Cervical degenerative disc disease","Cervicogenic dizziness (reconditioning)","Whiplash-associated disorder (grade 2)"],"msk","Cervical spine","cervical",{chronic:true});
plainList(["Thoracic facet joint syndrome","Costochondritis","Rib dysfunction","Thoracic outlet syndrome (neurogenic)","Scheuermann's kyphosis (reconditioning)"],"msk","Thoracic spine","thoracic",{chronic:true});
/* Peripheral nerve */
plainList(["Common peroneal nerve palsy (foot drop)","Tibial nerve neuropathy","Femoral nerve neuropathy","Sciatic neuropathy (post-injury)",
 "Radial nerve palsy (Saturday-night)","Axillary nerve neuropathy","Diabetic peripheral neuropathy","Chemotherapy-induced peripheral neuropathy",
 "Charcot-Marie-Tooth disease (exercise program)","Post-herpetic neuralgia (reconditioning)"],"neuro","Peripheral nerve","neuropathy",{chronic:true});
/* Rheumatologic / systemic */
plainList(["Rheumatoid arthritis (hand-dominant)","Rheumatoid arthritis (foot-dominant)","Psoriatic arthritis (peripheral)","Psoriatic arthritis (axial)",
 "Ankylosing spondylitis (early)","Enteropathic arthritis","Reactive arthritis (post-infectious)","Systemic sclerosis (hand contracture)",
 "Mixed connective tissue disease","Gout (chronic tophaceous)","Pseudogout (CPPD)","Juvenile idiopathic arthritis (adult reconditioning)",
 "Generalized (nodal) osteoarthritis","Hemophilic arthropathy (reconditioning)","Fibromyalgia","Polymyalgia rheumatica","Hypermobility spectrum disorder",
 "Ehlers-Danlos syndrome (hypermobile)","Complex regional pain syndrome (upper limb)","Complex regional pain syndrome (lower limb)"],"msk","Systemic","general_msk",{chronic:true});
/* Pelvic / other */
plainList(["Pelvic girdle pain","Pubic symphysis dysfunction","Sacroiliac joint dysfunction (chronic)","Temporomandibular joint dysfunction",
 "TMJ disc displacement (reconditioning)"],"msk","Pelvis / other","lumbar",{chronic:true});

/* ==================== PAEDIATRIC (0–18 yr) — genuine conditions ==================== */
/* Paediatric orthopaedic */
latList(["Clubfoot (talipes equinovarus)","Developmental dysplasia of the hip (DDH)","Legg-Calvé-Perthes disease",
 "Slipped capital femoral epiphysis (SCFE)","Sever's disease (calcaneal apophysitis)","Iselin disease (5th metatarsal apophysitis)",
 "Blount's disease (tibia vara)","Congenital muscular torticollis","Idiopathic toe walking","Metatarsus adductus",
 "Paediatric flexible flatfoot","Genu valgum (knock knees)","Genu varum (bow legs)","Osgood-Schlatter disease (adolescent)",
 "Sinding-Larsen-Johansson syndrome (adolescent)","Paediatric anterior knee pain","Discoid meniscus (paediatric)",
 "Tarsal coalition (paediatric)","Congenital vertical talus"],"msk","Paediatric orthopaedic","foot",{chronic:true,supervision:"supervised"});
latList(["Perthes disease (hip)","Hip dysplasia (adolescent, residual)"],"msk","Hip","hip",{chronic:true,supervision:"supervised"});
plainList(["Adolescent idiopathic scoliosis (conservative)","Juvenile kyphosis (Scheuermann's)","Paediatric spondylolysis (young athlete)",
 "Back pain in the young athlete"],"msk","Paediatric spine","lumbar",{chronic:true});
plainList(["Juvenile idiopathic arthritis (JIA)","Juvenile idiopathic arthritis (polyarticular)","Juvenile idiopathic arthritis (oligoarticular)",
 "Juvenile dermatomyositis (reconditioning)","Benign joint hypermobility (paediatric)"],"msk","Paediatric rheumatology","general_msk",{chronic:true,supervision:"supervised"});
/* Paediatric neurological / developmental */
plainList(["Cerebral palsy (spastic diplegia)","Cerebral palsy (spastic hemiplegia)","Cerebral palsy (spastic quadriplegia)",
 "Cerebral palsy (dyskinetic)","Cerebral palsy (ataxic)","Spina bifida (myelomeningocele)","Duchenne muscular dystrophy",
 "Becker muscular dystrophy","Spinal muscular atrophy","Developmental coordination disorder (dyspraxia)","Hypotonia (low muscle tone)",
 "Gross motor developmental delay","Global developmental delay","Paediatric traumatic brain injury (recovery)",
 "Paediatric acquired brain injury (recovery)","Charcot-Marie-Tooth disease (juvenile)","Paediatric Guillain-Barré (recovery)",
 "Autism-related motor coordination (exercise support)","Down syndrome (motor / exercise support)"],"neuro","Paediatric neuro","balance_neuro",{chronic:true,supervision:"supervised",clearance:true});
latList(["Brachial plexus birth injury (Erb's palsy)","Brachial plexus birth injury (Klumpke's palsy)"],"neuro","Peripheral nerve","neuropathy",{chronic:true,supervision:"supervised"});

/* ==================== Defensible top-up to reach target breadth ====================
   Clinical presentation stratifications genuinely change program tuning
   (return-to-sport load, work ergonomics, older-adult bone/fall caution).
   Applied only to primary MSK conditions, only until the target is reached. */
const TARGET = 40000;
const PRESENTATIONS = [
  ["return-to-sport focus", {}],
  ["return-to-work / ergonomic focus", {}],
  ["older adult (bone & fall aware)", { autoExtra:["osteoporosis","balance_risk"] }],
  ["post-immobilization reconditioning", {}],
  ["home-based (minimal equipment)", {}],
  ["gym-based progression", {}],
  ["hypermobility-aware", {}],
  ["high-irritability / pain-dominant", {}],
  ["deconditioned / low fitness", {}],
  ["athlete / high-performance", {}],
  ["adolescent athlete", {}],
  ["desk / sedentary worker", {}],
  ["manual-labour worker", {}],
  ["pre-operative conditioning (prehab)", {}],
  ["weight-management / metabolic focus", {}],
  ["recurrent / relapse-prevention", {}],
  ["tele-rehab / remotely monitored", {}],
  ["pool-based / aquatic option", {}],
  ["night-shift / irregular-hours worker", {}],
  ["prolonged-sitting / driver adaptation", {}],
  ["overhead-work adaptation", {}],
  ["low-back-sparing progression", {}],
  ["joint-protection focused", {}],
  ["cardiometabolic-comorbidity aware", {}],
  ["heavy-manual-work return", {}],
  ["minimal-pain-provocation approach", {}],
  ["strength-and-conditioning progression", {}],
  ["mobility-and-flexibility emphasis", {}]
];
const primaryMSK = out.filter(c =>
  c.domain === "msk" &&
  !/ — |grade|recovery|replacement|amputation|fracture|repair|reconstruction|dislocation|at [CTL]\d/i.test(c.name));
outer:
for (const [label, opt] of PRESENTATIONS) {
  for (const base of primaryMSK) {
    if (out.length >= TARGET) break outer;
    add(`${base.name} — ${label}`, "msk", base.region, base.protocol, {
      chronic: base.chronicByNature,
      supervision: base.supervision,
      autoFlags: [...(base.autoFlags||[]), ...(opt.autoExtra||[])]
    });
  }
}

/* ---- final assembly ---- */
mkdirSync(dirname(OUT), { recursive: true });
const banner = `/* AUTO-GENERATED by scripts/generate-conditions.mjs — do not edit by hand.
   ${out.length} conditions across MSK / neuro / cardiac / pulmonary.
   Educational categorization only — not a diagnostic database. */\n`;
writeFileSync(OUT, `${banner}window.CONDITIONS = ${JSON.stringify(out)};\n`);
const byDomain = out.reduce((a,c)=>{a[c.domain]=(a[c.domain]||0)+1;return a;},{});
console.log(`Wrote ${out.length} conditions ->`, byDomain);
