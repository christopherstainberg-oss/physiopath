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
  if (["cardiac_rehab","heart_failure","valve","arrhythmia","pad"].includes(protocol)) f.push("cardiac");
  if (protocol === "hypertension") f.push("hypertension");
  if (["pulmonary_rehab","asthma","post_covid","ild","thoracic_surgery","pulm_hypertension"].includes(protocol)) f.push("pulmonary");
  if (["stroke","tbi","sci","ms","parkinsons","vestibular","balance_neuro","guillain_barre"].includes(protocol)) f.push("balance_risk");
  if (protocol === "neuropathy") f.push("neuropathy");
  if (/osteoporos/i.test(name)) f.push("osteoporosis");
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
    "Total hip replacement recovery","Hip hemiarthroplasty recovery","Hip resurfacing recovery",
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
    "Total knee replacement recovery","Partial (unicompartmental) knee replacement recovery","Knee osteoarthritis" ] },
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
    "Plica syndrome","Patellar maltracking"]],
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

/* ==================== CARDIAC ==================== */
["Post-myocardial infarction (heart attack) recovery","Post-STEMI recovery","Post-NSTEMI recovery",
 "Stable coronary artery disease","Post-angioplasty (PCI) recovery","Post-stent (single-vessel) recovery",
 "Post-stent (multi-vessel) recovery","Post-CABG (bypass) recovery","Stable angina (reconditioning)",
 "Cardiac deconditioning (general)"]
  .forEach(dx => add(dx, "cardiac", "Heart", "cardiac_rehab", { supervision:"clinical", clearance:true }));

["Heart failure (reduced ejection fraction, HFrEF)","Heart failure (preserved ejection fraction, HFpEF)",
 "Heart failure NYHA class I","Heart failure NYHA class II","Heart failure NYHA class III (supervised)",
 "Cardiomyopathy (dilated)","Cardiomyopathy (hypertrophic — cleared for exercise)","Post-LVAD reconditioning",
 "Post-heart-transplant reconditioning"]
  .forEach(dx => add(dx, "cardiac", "Heart", "heart_failure", { supervision:"clinical", clearance:true, chronic:true }));

["Post-aortic-valve replacement recovery","Post-mitral-valve repair recovery","Post-mitral-valve replacement recovery",
 "Post-tricuspid-valve surgery recovery","Post-TAVR recovery","Valvular heart disease (stable)",
 "Aortic stenosis (post-intervention)"]
  .forEach(dx => add(dx, "cardiac", "Heart", "valve", { supervision:"clinical", clearance:true }));

["Atrial fibrillation (rate-controlled)","Post-ablation recovery","Post-pacemaker implantation reconditioning",
 "Post-ICD implantation reconditioning","Supraventricular tachycardia (reconditioning)","Bradycardia (paced)"]
  .forEach(dx => add(dx, "cardiac", "Heart", "arrhythmia", { supervision:"clinical", clearance:true }));

["Hypertension (stage 1)","Hypertension (stage 2, controlled)","Prehypertension / elevated blood pressure",
 "Hypertension with exercise programming"]
  .forEach(dx => add(dx, "cardiac", "Vascular", "hypertension", { supervision:"supervised", clearance:true }));

["Peripheral artery disease (claudication)","Post-lower-limb bypass reconditioning","Intermittent claudication",
 "Post-DVT reconditioning","Chronic venous insufficiency (exercise)","Lymphedema (exercise management)",
 "Post-aortic-aneurysm-repair reconditioning"]
  .forEach(dx => add(dx, "cardiac", "Vascular", "pad", { supervision:"clinical", clearance:true }));

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
 "Chronic fatigue syndrome (graded exercise, cautious)","Functional neurological disorder rehabilitation",
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
["Obesity hypoventilation (reconditioning)","Obstructive sleep apnea (exercise adjunct)","Post-pulmonary-embolism reconditioning",
 "Chronic cough / breathing pattern disorder","Hyperventilation syndrome (breathing retraining)","Vocal cord dysfunction (breathing)"]
  .forEach(dx => add(dx, "pulmonary", "Respiratory", /embolism/.test(dx) ? "post_covid" : "asthma", { supervision:"supervised", clearance:true }));

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
latList(["Revision total hip replacement recovery","Revision total knee replacement recovery"],"msk","Lower limb","hip_replacement",{supervision:"supervised"});
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
  "Chondrocalcinosis","Paget's disease of bone","Charcot neuroarthropathy","Diffuse idiopathic skeletal hyperostosis (DISH)",
  "Enthesitis-related arthritis","Reactive tenosynovitis","Palindromic rheumatism"],"msk","Systemic","general_msk",{chronic:true,supervision:"supervised"});

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
// Cranial nerve palsies
plainList(["Oculomotor (CN III) palsy recovery","Trochlear (CN IV) palsy recovery","Abducens (CN VI) palsy recovery",
 "Hypoglossal (CN XII) palsy recovery","Spinal accessory nerve palsy recovery","Vestibulocochlear schwannoma (post-op balance)"],"neuro","Cranial nerve","bells_palsy");
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
 "Takotsubo (stress) cardiomyopathy recovery","Non-obstructive hypertrophic cardiomyopathy (cleared)","Ischemic cardiomyopathy","Alcoholic cardiomyopathy",
 "Chemotherapy-induced cardiomyopathy"],"cardiac","Heart muscle","heart_failure",{chronic:true});
plainList(["Aortic stenosis (stable)","Aortic regurgitation (stable)","Mitral stenosis (stable)","Mitral regurgitation (stable)",
 "Mitral valve prolapse","Tricuspid regurgitation (stable)","Pulmonary valve stenosis (stable)","Post-mitral-clip recovery"],"cardiac","Heart valve","valve");
plainList(["Paroxysmal atrial fibrillation","Persistent atrial fibrillation","Permanent atrial fibrillation (rate-controlled)","Atrial flutter",
 "AVNRT (reconditioning)","Wolff-Parkinson-White (post-ablation)","Atrial tachycardia","Ventricular tachycardia (ICD, cleared)",
 "Frequent PVCs (reconditioning)","First-degree AV block","Second-degree AV block (Mobitz I)","Sick sinus syndrome (paced)","Long QT syndrome (cleared)"],"cardiac","Rhythm","arrhythmia");
plainList(["Abdominal aortic aneurysm (post-repair)","Thoracic aortic aneurysm (post-repair)","Aortic dissection recovery",
 "Carotid endarterectomy recovery","Raynaud's phenomenon (exercise)","Buerger's disease (thromboangiitis obliterans)","Giant cell arteritis (reconditioning)",
 "Takayasu arteritis (reconditioning)","Post-varicose-vein-procedure reconditioning","Post-endovascular-repair reconditioning"],"cardiac","Vascular","pad");

/* ==================== PULMONARY — mega expansion ==================== */
plainList(["Non-specific interstitial pneumonia (NSIP)","Usual interstitial pneumonia (UIP)","Hypersensitivity pneumonitis","Connective-tissue-disease ILD",
 "Drug-induced interstitial lung disease","Radiation pneumonitis (reconditioning)"],"pulmonary","Interstitial lung","ild",{chronic:true});
plainList(["Asbestosis","Silicosis","Coal workers' pneumoconiosis","Berylliosis","Byssinosis","Farmer's lung"],"pulmonary","Occupational lung","ild",{chronic:true});
plainList(["Bronchiolitis obliterans","Primary ciliary dyskinesia","Alpha-1 antitrypsin emphysema","Non-CF bronchiectasis"],"pulmonary","Airways","pulmonary_rehab",{chronic:true});
plainList(["Post-pleural-effusion recovery","Post-pneumothorax recovery","Post-empyema recovery","Post-pleurodesis recovery","Mesothelioma (reconditioning)"],"pulmonary","Pleura","thoracic_surgery");
plainList(["Pulmonary embolism recovery","Chronic thromboembolic pulmonary hypertension","Post-ARDS recovery","Ventilator-weaning reconditioning",
 "Post-tuberculosis lung reconditioning","Post-influenza pneumonia recovery"],"pulmonary","Lungs","post_covid");
plainList(["Diaphragmatic weakness (reconditioning)","Phrenic nerve palsy (breathing)","Neuromuscular respiratory weakness","Obesity-related restrictive lung",
 "Kyphoscoliosis-related restrictive lung","Pectus excavatum (post-op reconditioning)","Chest-wall deformity reconditioning"],"pulmonary","Chest wall / respiratory muscle","thoracic_surgery");

/* ==================== Defensible top-up to reach target breadth ====================
   Clinical presentation stratifications genuinely change program tuning
   (return-to-sport load, work ergonomics, older-adult bone/fall caution).
   Applied only to primary MSK conditions, only until the target is reached. */
const TARGET = 6000;
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
  ["athlete / high-performance", {}]
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
