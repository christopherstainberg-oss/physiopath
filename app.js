/* =====================================================================
   PhysioPath — application logic
   Flow: Medical history → Injury selection → Details → Program → Coach
   Uses window.CONDITIONS (data/conditions.js) and the protocol +
   contraindication engine (data/protocols.js).
===================================================================== */
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

/* ---------- medical-history questionnaire → contraindication flags ---------- */
/* Groups organise the history checklist; each item's flag drives a
   CONTRA_RULE (in protocols.js) so ticking it adjusts the exercise plan. */
const HIST_GROUPS = [
  { key:"heart",   icon:"🫀", label:"Heart & circulation" },
  { key:"lungs",   icon:"🫁", label:"Lungs & breathing" },
  { key:"bones",   icon:"🦴", label:"Bones & joints" },
  { key:"neuro",   icon:"🧠", label:"Nerves, balance & brain" },
  { key:"general", icon:"🩺", label:"General health" }
];
const HISTORY_ITEMS = [
  // heart & circulation
  { flag:"cardiac",              group:"heart", label:"Heart condition (heart disease, prior heart attack, heart failure, angina)" },
  { flag:"hypertension",         group:"heart", label:"High blood pressure" },
  { flag:"pacemaker_icd",        group:"heart", label:"Pacemaker or ICD" },
  { flag:"dvt",                  group:"heart", label:"Blood-clot history (DVT/PE) or taking blood thinners" },
  { flag:"pad",                  group:"heart", label:"Peripheral artery disease / poor leg circulation (claudication)" },
  { flag:"bleeding_disorder",    group:"heart", label:"Bleeding disorder (haemophilia, low platelets)" },
  // lungs
  { flag:"pulmonary",            group:"lungs", label:"Lung / breathing condition (COPD, asthma, etc.)" },
  { flag:"fatigue",              group:"lungs", label:"Chronic fatigue, post-viral, or long COVID" },
  // bones & joints
  { flag:"osteoporosis",         group:"bones", label:"Osteoporosis or low bone density" },
  { flag:"recent_fracture",      group:"bones", label:"A fracture in the last 3 months" },
  { flag:"hip_replacement",      group:"bones", label:"Recent hip replacement" },
  { flag:"knee_replacement",     group:"bones", label:"Recent knee replacement" },
  { flag:"inflammatory_arthritis", group:"bones", label:"Inflammatory arthritis (rheumatoid, psoriatic, ankylosing, lupus, gout)" },
  { flag:"hypermobility",        group:"bones", label:"Very flexible / hypermobile joints (or hEDS)" },
  // nerves, balance & brain
  { flag:"balance_risk",         group:"neuro", label:"Dizziness, vertigo, or balance / falls problems" },
  { flag:"neuropathy",           group:"neuro", label:"Numbness, tingling, or nerve damage" },
  { flag:"neuro_condition",      group:"neuro", label:"Neurological condition (MS, Parkinson's, prior stroke)" },
  { flag:"seizure",              group:"neuro", label:"Seizures or epilepsy" },
  // general health
  { flag:"diabetes",             group:"general", label:"Diabetes" },
  { flag:"ckd",                  group:"general", label:"Chronic kidney disease" },
  { flag:"cancer_treatment",     group:"general", label:"Cancer, or in active treatment (chemo / radiation)" },
  { flag:"lymphedema",           group:"general", label:"Lymphedema, or lymph nodes removed" },
  { flag:"chronic_pain",         group:"general", label:"Chronic widespread pain or fibromyalgia" },
  { flag:"reflux",               group:"general", label:"Acid reflux (GORD) or hiatal hernia" },
  { flag:"hernia",               group:"general", label:"Abdominal or groin hernia (not yet repaired)" },
  { flag:"pregnancy",            group:"general", label:"Pregnant or recently postpartum" },
  { flag:"recent_surgery",       group:"general", label:"Any surgery in the last 6 weeks" }
];

/* ---------- program phase templates ---------- */
const TEMPLATE = {
  acute: { total:16, focus:"protecting healing tissue, then progressively loading it",
    phases:[
      {title:"Protect & Calm", goal:"Control pain and swelling, keep gentle motion, prevent stiffness."},
      {title:"Restore Motion", goal:"Rebuild full pain-free range and re-activate muscles."},
      {title:"Build Strength", goal:"Progressively load the tissue and rebuild strength & control."},
      {title:"Return to Activity", goal:"Add capacity, speed and task-specific demands safely."} ] },
  chronic: { total:14, focus:"progressive loading and rebuilding capacity",
    phases:[
      {title:"Assess & Mobilize", goal:"Restore mobility and calm irritable tissue with gentle loading."},
      {title:"Progressive Loading", goal:"Load the tissue steadily — the key driver of chronic recovery."},
      {title:"Strength & Capacity", goal:"Build strength, endurance and tissue tolerance."},
      {title:"Return to Performance", goal:"Restore power and full, activity-specific capacity."} ] }
};

const DOMAIN_NAME = { msk:"musculoskeletal", neuro:"neurological", cardiac:"cardiac", pulmonary:"pulmonary" };
const DOMAIN_REDFLAGS = {
  msk:"Get it checked for: inability to bear weight or use the limb, obvious deformity, a hot/swollen joint with fever, new numbness or weakness, or pain that steadily worsens despite rest.",
  neuro:"Seek prompt care for: new or worsening weakness/numbness, trouble speaking or swallowing, sudden severe headache, new loss of balance, or loss of bladder/bowel control.",
  cardiac:"Stop and seek urgent care for: chest pain or pressure, unusual breathlessness, palpitations, fainting, or cold sweats. Report rapid weight gain or new swelling to your team.",
  pulmonary:"Seek care for: worsening breathlessness at rest, chest pain, blue-tinged lips/fingertips, fever with discolored sputum, or oxygen readings below your prescribed level."
};

/* ---------- surgical precautions library ----------
   Each surgery: precautions [{t:text, w:typical weeks to follow (0 = ongoing/until cleared)}].
   `match` auto-detects the surgery from a selected condition's name.
   Generalized education — a surgeon's specific protocol always takes precedence. */
const CURATED_SURGERIES = [
  { id:"tha", name:"Total hip replacement (arthroplasty)", match:/hip replacement|hip arthroplasty|hemiarthroplasty|hip resurfacing/, autoFlags:["hip_replacement"],
    precautions:[
      {t:"Hip precautions: don't bend the hip past 90° (avoid deep bending/low chairs).",w:12},
      {t:"Don't cross your legs or bring the operated leg across your body's midline.",w:12},
      {t:"Don't rotate the operated leg or foot inward.",w:12},
      {t:"Use a raised toilet seat and a firm, higher chair; avoid low, soft seats.",w:12},
      {t:"Weight-bear as instructed and use your walker/crutches until cleared.",w:6},
      {t:"No driving until cleared (often ~4–6 weeks, especially the right leg).",w:6}],
    ret:"Precautions commonly relax around 6–12 weeks — the exact rules depend on your surgical approach (posterior vs anterior). Confirm with your surgeon." },
  { id:"tka", name:"Total / partial knee replacement", match:/knee replacement|knee arthroplasty|unicompartmental/, autoFlags:["knee_replacement"],
    precautions:[
      {t:"Work on full knee straightening (extension) AND bend (flexion) early — regaining motion is the priority.",w:8},
      {t:"Ice and elevate frequently to control swelling.",w:6},
      {t:"Keep ankle pumps going and watch for DVT (calf pain/swelling/warmth).",w:6},
      {t:"Weight-bear as tolerated with your walker/crutches until steady.",w:6},
      {t:"No driving until cleared (often ~4–6 weeks).",w:6},
      {t:"Avoid high-impact activity (running, jumping) to protect the implant.",w:0}],
    ret:"Range-of-motion and strength progress over ~12 weeks; impact restrictions are usually long-term." },
  { id:"acl", name:"ACL reconstruction", match:/acl recon|acl reconstruction|acl revision/, autoFlags:[],
    precautions:[
      {t:"Wear your brace and follow your exact weight-bearing instructions.",w:6},
      {t:"Regain full extension (straightening) early and work on quad activation.",w:6},
      {t:"Avoid deep squatting and open-chain knee extension early (per protocol).",w:12},
      {t:"NO pivoting, cutting, or twisting sports.",w:36},
      {t:"Return to running only when cleared (often ~3 months).",w:12}],
    ret:"Full sport return is typically ~9–12 months and should follow strength/hop testing and surgeon clearance." },
  { id:"meniscus_repair", name:"Meniscus repair", match:/meniscus repair|meniscus root repair/, autoFlags:[],
    precautions:[
      {t:"Follow your restricted range-of-motion and brace instructions.",w:6},
      {t:"Weight-bear only as instructed (often limited early).",w:6},
      {t:"Avoid deep squatting, pivoting and twisting.",w:12}],
    ret:"Meniscus repairs are protected longer than a meniscectomy — progress on your surgeon's timeline (often ~3 months to sport)." },
  { id:"meniscectomy", name:"Partial meniscectomy", match:/meniscectomy/, autoFlags:[],
    precautions:[
      {t:"Weight-bear as tolerated; control swelling with ice and elevation.",w:2},
      {t:"Restore motion and quad control early.",w:4},
      {t:"Ease back into impact once swelling and strength allow.",w:6}],
    ret:"Recovery is usually quicker than a repair — often back to activity within ~4–6 weeks." },
  { id:"rcr", name:"Rotator cuff repair", match:/rotator cuff repair|cuff repair/, autoFlags:[],
    precautions:[
      {t:"Wear your sling as instructed.",w:6},
      {t:"Passive range of motion only early — NO active lifting of the arm.",w:6},
      {t:"No reaching overhead or behind your back early.",w:8},
      {t:"No lifting, pushing or pulling with the arm.",w:12},
      {t:"No weight-bearing through the arm (e.g., pushing up from a chair).",w:12}],
    ret:"Active motion usually starts ~6 weeks and strengthening ~12 weeks — the tendon needs time to heal to bone." },
  { id:"shoulder_stab", name:"Shoulder stabilisation / labral (Bankart, SLAP, Latarjet) repair", match:/bankart|slap repair|labral repair|shoulder stabil|latarjet|instability repair/, autoFlags:[],
    precautions:[
      {t:"Wear your sling as instructed.",w:4},
      {t:"Avoid external rotation past neutral and the 'apprehension' position early.",w:6},
      {t:"No overhead or behind-the-back reaching early.",w:8},
      {t:"No lifting/pushing/pulling with the arm.",w:8}],
    ret:"Return to contact sport or overhead athletics is typically ~4–6 months with clearance." },
  { id:"tsa", name:"Total / reverse shoulder replacement", match:/total shoulder replacement|reverse total shoulder|shoulder arthroplasty/, autoFlags:[],
    precautions:[
      {t:"Wear your sling as instructed.",w:4},
      {t:"Follow your passive/active motion limits (reverse and anatomic differ).",w:6},
      {t:"No pushing up from a chair with the operated arm; no reaching behind the back early.",w:8},
      {t:"No lifting heavier than a coffee cup early.",w:6}],
    ret:"Strengthening progresses after ~6–12 weeks; avoid heavy overhead lifting long-term." },
  { id:"achilles", name:"Achilles tendon repair", match:/achilles.*repair|achilles rupture|achilles tendon rupture/, autoFlags:[],
    precautions:[
      {t:"Wear your boot with heel wedges as prescribed.",w:8},
      {t:"Follow your weight-bearing progression exactly (often protected early).",w:6},
      {t:"NO active push-off or aggressive calf stretching early.",w:10}],
    ret:"Heel wedges are removed gradually; return to running is typically ~4–6 months." },
  { id:"ankle_orif", name:"Ankle fracture fixation (ORIF)", match:/ankle fracture|malleolus|pilon|orif/, autoFlags:[],
    precautions:[
      {t:"Stay non-weight-bearing or protected in your boot/cast as instructed.",w:6},
      {t:"Elevate to control swelling; keep the incision clean and dry.",w:4},
      {t:"Progress weight-bearing and motion only when your surgeon clears it.",w:8}],
    ret:"Weight-bearing usually starts around 6 weeks once bone healing is confirmed." },
  { id:"lumbar_fusion", name:"Lumbar spinal fusion", match:/lumbar fusion|spinal fusion|post-lumbar fusion/, autoFlags:[],
    precautions:[
      {t:"BLT precautions: NO bending, lifting (>~5–10 lb) or twisting.",w:12},
      {t:"Log-roll to get in/out of bed; wear your brace if prescribed.",w:8},
      {t:"Change positions often; avoid prolonged sitting early.",w:6},
      {t:"No driving until cleared.",w:6}],
    ret:"BLT restrictions commonly ease around 6–12 weeks as the fusion consolidates." },
  { id:"discectomy", name:"Lumbar discectomy / microdiscectomy / laminectomy", match:/discectomy|microdiscectomy|laminectomy|decompression|post-laminectomy/, autoFlags:[],
    precautions:[
      {t:"Limit bending, heavy lifting (>~5–10 lb) and twisting early.",w:6},
      {t:"Avoid prolonged sitting; walk frequently.",w:4},
      {t:"Progress activity gradually as pain allows.",w:6}],
    ret:"Restrictions typically ease over ~4–6 weeks; a graded return follows." },
  { id:"acdf", name:"Cervical fusion (ACDF)", match:/acdf|cervical fusion|anterior cervical/, autoFlags:[],
    precautions:[
      {t:"Wear your collar as prescribed and limit end-range neck motion early.",w:6},
      {t:"No heavy lifting or overhead work early.",w:6},
      {t:"Avoid prolonged looking-down (phone/tablet) positions.",w:6}],
    ret:"Neck motion and loading progress after the fusion consolidates (~6–12 weeks)." },
  { id:"hip_scope", name:"Hip arthroscopy / labral repair", match:/hip arthroscopy|hip labral repair|labral repair — hip|femoroacetabular|fai/, autoFlags:[],
    precautions:[
      {t:"Use crutches and follow your weight-bearing limits.",w:4},
      {t:"Respect your motion limits; avoid provocative deep flexion/rotation.",w:6},
      {t:"No aggressive hip-flexor stretching or loading early.",w:8}],
    ret:"Return to sport is typically ~3–4 months on a staged protocol." },
  { id:"wrist_orif", name:"Wrist / distal radius fixation (ORIF)", match:/distal radius|colles.*orif|wrist orif|scaphoid fixation/, autoFlags:[],
    precautions:[
      {t:"Wear your splint/cast as instructed; keep the hand elevated early.",w:6},
      {t:"Keep fingers, elbow and shoulder moving to prevent stiffness.",w:4},
      {t:"No gripping, lifting or weight-bearing through the wrist early.",w:6}],
    ret:"Wrist motion and grip strengthening progress once healing is confirmed (~6 weeks)." },
  { id:"ctr", name:"Carpal tunnel release", match:/carpal tunnel release/, autoFlags:[],
    precautions:[
      {t:"Keep the incision clean and dry; keep fingers moving.",w:2},
      {t:"Avoid heavy gripping, pinching or leaning on the palm early.",w:4},
      {t:"Expect some tenderness at the scar for several weeks.",w:6}],
    ret:"Light use returns within days–weeks; full grip strength can take 2–3 months." },
  { id:"sternotomy", name:"Open-heart surgery / sternotomy (CABG, valve)", match:/cabg|bypass|open heart|sternotomy|valve replacement|valve repair|aortic valve|mitral valve|post-tavr|coronary/, autoFlags:["cardiac"],
    precautions:[
      {t:"Sternal precautions: don't lift, push or pull more than ~5–10 lb (about a milk jug).",w:8},
      {t:"Don't reach both arms overhead or far behind you.",w:8},
      {t:"Hug a firm pillow against your chest when coughing or sneezing.",w:8},
      {t:"No driving until cleared (often ~4–6 weeks).",w:6},
      {t:"Don't push up through your arms to stand — use your legs.",w:8}],
    ret:"Sternal precautions usually last ~6–8 weeks until the breastbone heals. Attend supervised cardiac rehab." },
  { id:"thoracic", name:"Chest / lung surgery (lobectomy, thoracotomy)", match:/lobectomy|thoracotomy|pneumonectomy|thoracic surgery|lung.*surgery|decortication/, autoFlags:["pulmonary"],
    precautions:[
      {t:"Do your breathing exercises / incentive spirometry regularly.",w:6},
      {t:"Support the incision when coughing; keep the arm/shoulder moving gently.",w:6},
      {t:"Avoid heavy lifting and strenuous pushing/pulling early.",w:6}],
    ret:"Reconditioning is gradual; breathing capacity improves over weeks–months." },
  { id:"abdominal", name:"Abdominal surgery (hernia, C-section, laparoscopy)", match:/hernia repair|c-section|caesarean|cesarean|laparoscop|abdominal.*surgery|appendect|hysterect|prostatectomy/, autoFlags:[],
    precautions:[
      {t:"No heavy lifting (>~10 lb) — protect the incision and deep core.",w:6},
      {t:"Support your abdomen when coughing, laughing or getting up.",w:4},
      {t:"Avoid straining and vigorous core exercise early.",w:6},
      {t:"Reintroduce core work gradually and gently.",w:8}],
    ret:"Most lifting restrictions last ~4–6 weeks; core rehab is progressive." },
  { id:"mastectomy", name:"Breast surgery (mastectomy / lumpectomy)", match:/mastectomy|lumpectomy|breast/, autoFlags:[],
    precautions:[
      {t:"Progress shoulder/arm range of motion gently as advised; care for any drains.",w:4},
      {t:"Avoid heavy lifting on the operated side early; watch for lymphedema (swelling).",w:6},
      {t:"Follow guidance if lymph nodes were removed (extra arm care).",w:0}],
    ret:"Shoulder motion is restored gradually; lymphedema precautions may be ongoing." },
  { id:"amputation", name:"Amputation", match:/amputation|disarticulation|hemipelvectomy|forequarter/, autoFlags:[],
    precautions:[
      {t:"Position the residual limb to prevent contracture (avoid prolonged bending).",w:8},
      {t:"Care for the wound and desensitise the limb as taught.",w:6},
      {t:"Follow your prosthetic and weight-bearing timeline from the team.",w:0}],
    ret:"Prosthetic fitting and gait training follow wound healing and shaping (weeks–months)." },
  { id:"knee_scope", name:"Knee arthroscopy", match:/knee arthroscopy|arthroscopy recovery — knee|microfracture/, autoFlags:[],
    precautions:[
      {t:"Weight-bear as tolerated unless told otherwise; control swelling.",w:2},
      {t:"Restore motion and quad control early.",w:4}],
    ret:"Simple scopes recover in a few weeks; cartilage procedures are protected much longer." },
  { id:"shoulder_scope", name:"Shoulder arthroscopy / decompression", match:/subacromial decompression|shoulder arthroscopy/, autoFlags:[],
    precautions:[
      {t:"Use the sling short-term for comfort; begin gentle motion early.",w:2},
      {t:"No heavy lifting or forceful overhead work early.",w:6}],
    ret:"Motion returns quickly; strengthening progresses over ~6–12 weeks." }
];
const OTHER_SURGERY = { id:"other", name:"Recent surgery (general precautions)", autoFlags:[],
  precautions:[
    {t:"Keep the incision clean and dry; watch for infection (spreading redness, warmth, discharge, fever).",w:3},
    {t:"Follow the exact weight-bearing and activity restrictions your surgeon gave you.",w:6},
    {t:"Avoid heavy lifting and strenuous activity until cleared.",w:6},
    {t:"Take DVT-prevention/blood thinners as prescribed; watch for calf pain/swelling or chest pain/breathlessness.",w:4},
    {t:"Attend follow-up visits and get clearance before progressing.",w:0}],
  ret:"These are general post-op principles — your surgeon's specific protocol always takes precedence." };

/* Curated surgeries (hand-authored, high quality) + the generated 3000-procedure
   database (window.SURGERY_DB). Curated entries come first so their match wins auto-detect. */
const SURGERIES = CURATED_SURGERIES.concat(
  (window.SURGERY_DB||[]).filter(s=>!CURATED_SURGERIES.some(c=>c.id===s.id))
);

function detectSurgery(){
  if(state.surgeryType && state.surgeryType!=="auto"){
    if(state.surgeryType==="other") return OTHER_SURGERY;
    const s = SURGERIES.find(x=>x.id===state.surgeryType); if(s) return s;
  }
  for(const c of selectedConditions()){
    const nm = c.name.toLowerCase();
    const hit = SURGERIES.find(s=>s.match.test(nm));
    if(hit) return hit;
  }
  return state.surgery==="yes" ? OTHER_SURGERY : null;
}
function weeksPostOp(){
  if(state.surgeryDate){
    const d = new Date(state.surgeryDate+"T00:00:00");
    if(!isNaN(d.getTime())){ const w = Math.round((Date.now()-d.getTime())/(7*864e5)); return w>=0?w:0; }
  }
  return (state.weeks!=null && !isNaN(state.weeks)) ? state.weeks : null;
}

/* ---------- state ---------- */
const state = {
  step:0, age:"", sex:"", flags:[], parq:{pain:false,faint:false,doc:false},
  meds:"", notes:"", condIds:[], weeks:null, painRest:3, painMove:4, surgery:"no",
  surgeryType:"auto", surgeryDate:"", fitness:"mod", goal:"", returnActivities:[], returnSports:[], program:null,
  vitals:{restHR:"",sbp:"",dbp:"",spo2:"",rr:"",height:"",weight:""},
  vitalsLog:[], labs:{}, labHist:{},
  screen:{}, falls:"", aid:"", smoking:"", alcohol:"", sleep:"", stress:"", waterConfidence:"",
  medIds:[], medFilter:false, homeMode:false, customPrecautions:[], clinicianProtocols:[], clinPrecautionProtocol:"", clinicianGuided:false,
  medDoses:{}, weightBearing:{status:"",pct:"",lbs:"",side:"",limb:"le"}, devices:[],
  cardiacDevice:{type:"",icdRate:""}, specialPrecautions:[],
  log:[], apiKey:"", apiModel:"claude-opus-4-8"
};
const MED_FILTERABLE = ["fluoroquinolone","anticoagulant","antiplatelet","opioid","sedative","muscle_relaxant","gabapentinoid","antipsychotic"];
const MEDMAP = new Map();
function selectedMeds(){ return (state.medIds||[]).map(id=>MEDMAP.get(id)).filter(Boolean); }

/* medication class → exercise consideration (education, not prescribing advice) */
const MED_EFFECT = {
  beta_blocker:"Beta-blockers blunt your heart-rate response — don't judge effort by heart rate; use the talk-test or RPE (perceived exertion). Warm up and cool down slowly to avoid dizziness.",
  antihypertensive:"Blood-pressure medicines can cause dizziness on standing — rise slowly, stay hydrated, and cool down gradually.",
  diuretic:"Diuretics increase fluid and salt loss — hydrate well and watch for dizziness or cramps, especially in the heat.",
  nitrate:"Nitrates are for angina — keep your spray/tablets with you, stop and rest for chest pain, and never exercise through angina. Do NOT combine nitrates with ED medicines.",
  antiarrhythmic:"Follow any heart-rate limits from your cardiologist; stop for palpitations, dizziness, or chest pain.",
  statin:"Statins occasionally cause muscle aches — report new, unusual, or severe muscle pain or weakness (especially with dark urine).",
  anticoagulant:"Blood thinners raise bruising and bleeding risk — favor lower-fall-risk exercises, avoid contact/collision, and report unusual bruising or bleeding.",
  antiplatelet:"Antiplatelet medicines (aspirin, clopidogrel, etc.) increase bruising/bleeding — take care with fall-risk and contact activities.",
  insulin:"Insulin can cause low blood sugar with exercise — check glucose before and after, carry fast-acting carbs, and don't exercise if glucose is very low or very high.",
  hypoglycemic:"Some diabetes pills (sulfonylureas/glinides) can cause low blood sugar with exercise — carry fast-acting carbs and check your glucose.",
  sglt2:"SGLT2 diabetes medicines increase fluid loss — hydrate well; if you feel very unwell, stop and seek care (rare risk of ketoacidosis).",
  nsaid:"Anti-inflammatories relieve pain but can mask it — don't use them to push through sharp pain; heavy use may blunt tissue adaptation.",
  opioid:"Opioid pain medicines cause drowsiness and can mask pain — don't push through 'painless' limits, and avoid balance-demanding exercise when drowsy.",
  muscle_relaxant:"Muscle relaxants cause drowsiness and reduce alertness — do balance work near support and avoid it when drowsy.",
  gabapentinoid:"Nerve-pain medicines (gabapentin/pregabalin) can cause dizziness and drowsiness — take care with balance and rise slowly.",
  corticosteroid:"Longer-term steroids can weaken tendon and bone — progress loading gradually, prioritize good technique, and avoid sudden maximal efforts and high impact.",
  bronchodilator:"Use your reliever inhaler as prescribed (before exercise if advised) and warm up thoroughly.",
  inhaled_steroid:"Keep using your inhaled controller as prescribed for stable breathing during exercise.",
  sedative:"Sedatives / sleep or anxiety medicines impair balance and alertness — do balance work near support and avoid exercise when drowsy.",
  antipsychotic:"Antipsychotics can cause drowsiness and dizziness on standing — rise slowly and take care with balance.",
  antidepressant:"Some antidepressants can cause dizziness — rise slowly, especially in the first weeks.",
  levodopa:"Parkinson's medicines work best during 'on' periods — time exercise for when the medication is working, and take care with balance and blood pressure on standing.",
  fluoroquinolone:"⚠ Fluoroquinolone antibiotics (ciprofloxacin, levofloxacin, etc.) raise the risk of TENDON pain and rupture — especially the Achilles. Avoid heavy tendon loading and high impact while taking it and for a few weeks after, and stop/rest if you feel any tendon pain.",
  bisphosphonate:"Bone medicines support your skeleton — keep loading progressive; take the tablet exactly as directed (upright, on an empty stomach).",
  triptan:"Triptans treat migraine attacks — if you have heart disease, follow your doctor's advice about exertion.",
  pde5:"Do NOT combine ED medicines with nitrates — the blood-pressure drop can be dangerous; stand up slowly to avoid dizziness.",
  diabetes:"Regular exercise improves blood-sugar control — stay hydrated and check glucose around workouts if you're prone to lows.",
  thyroid:"Once your thyroid level is stable, normal exercise is fine — see your doctor if you feel unusually fatigued or your heart races.",
  dmard:"Immune-modulating medicines can raise infection risk — avoid training when acutely unwell and keep good hygiene at shared gyms.",
  stimulant:"Stimulant medicines raise heart rate and blood pressure — build intensity gradually, stay cool and hydrated, and stop for chest pain, palpitations, or feeling faint.",
  alpha_blocker:"Alpha-blockers can cause dizziness on standing (especially the first doses) — rise slowly and hold support when changing position.",
  immunosuppressant:"Immune-suppressing medicines raise infection risk — skip training when acutely unwell and keep good hygiene at shared gyms.",
  lithium:"Lithium levels can rise with heavy sweating and dehydration — hydrate well (especially in heat) and don't drastically change fluid/salt intake around long sessions.",
  oncology_endocrine:"Some hormone-based cancer therapies (e.g., aromatase inhibitors) can cause joint and muscle aches — exercise genuinely helps; progress gradually and report severe or persistent pain."
};
let chatHistory = [];
const CONMAP = new Map();
let domainFilter = "all";
/* Paediatric (0–18 yr) is a cross-cutting view, not a domain — detect it from
   the paediatric regions and genuinely-paediatric diagnosis names. */
const PED_RE = /paediatric|pediatric|juvenile|adolescent|congenital|developmental|cerebral palsy|clubfoot|talipes|perthes|\bscfe\b|slipped capital|sever'?s|osgood|sinding-larsen|iselin|apophysitis|torticollis|spina bifida|myelomeningocele|muscular dystrophy|duchenne|becker muscular|spinal muscular atrophy|erb'?s|klumpke|brachial plexus birth|hip dysplasia|\bddh\b|blount|metatarsus adductus|dyspraxia|hypotonia|growth plate|physeal|little leaguer|gymnast'?s wrist|down syndrome/i;
function isPediatric(c){ return /^paediatric/i.test(c.region||"") || PED_RE.test((c.name||"")+" "+(c.region||"")); }

/* ---------- persistence ---------- */
function save(){ try{ localStorage.setItem("physiopath", JSON.stringify(state)); }catch(e){} }
function load(){ try{ const s=JSON.parse(localStorage.getItem("physiopath")); if(s) Object.assign(state,s); }catch(e){} }

/* ---------- helpers ---------- */
const classify = w => (w===null||isNaN(w)) ? null : (w<=6 ? "acute" : "chronic");
function selectedConditions(){ return state.condIds.map(id=>CONMAP.get(id)).filter(Boolean); }

/* Gather every active contraindication flag from history + PAR-Q + conditions + age. */
function gatherFlags(){
  const f = new Set(state.flags);
  if(state.parq.pain || state.parq.faint) f.add("cardiac");
  if(Number(state.age) >= 75) f.add("balance_risk");
  if(state.surgery === "yes") f.add("recent_surgery");
  selectedConditions().forEach(c => (c.autoFlags||[]).forEach(x=>f.add(x)));
  const surg = detectSurgery(); if(surg && surg.autoFlags) surg.autoFlags.forEach(x=>f.add(x));
  vitalFlags().forEach(x=>f.add(x));
  wbFlags().forEach(x=>f.add(x));
  deviceFlags().forEach(x=>f.add(x));
  specialPrecautionFlags().forEach(x=>f.add(x));
  const sc = state.screen||{};
  if(Object.values(sc).some(Boolean)) f.add("red_flags");
  if(sc.cauda) f.add("red_flags_urgent");
  if(state.falls==="2" || (state.aid && state.aid!=="none")) f.add("balance_risk");
  if(state.smoking==="current") f.add("smoker");
  // Pool/aquatic: nervous-in-water or older/less-steady users skip deep-water (out-of-depth) drills.
  if(["none","low"].includes(state.waterConfidence) || Number(state.age) >= 70 || f.has("balance_risk")) f.add("low_water_confidence");
  return Array.from(f);
}
/* Medication-derived engine flags — applied at RENDER time only (so toggling is
   reversible and never discards manual edits). Empty unless the toggle is on. */
function medExerciseFlags(){
  if(!state.medFilter) return [];
  const mf = new Set(selectedMeds().flatMap(m=>m.flags||[]));
  const out = [];
  if(mf.has("fluoroquinolone")) out.push("fluoroquinolone");
  if(mf.has("anticoagulant") || mf.has("antiplatelet")) out.push("med_bleeding");
  if(["opioid","sedative","muscle_relaxant","gabapentinoid","antipsychotic"].some(x=>mf.has(x))) out.push("med_sedating");
  return out;
}
/* Base program flags plus any active medication flags — used by the edit controls
   so rotated/swapped/rerolled picks stay safe while the filter is on. */
function activeFlags(){
  const base = state.program ? state.program.flags : gatherFlags();
  return [...new Set([...base, ...medExerciseFlags()])];
}
function clearanceNeeded(flags){
  return window.needsClearance(flags) || state.parq.pain || state.parq.faint || state.parq.doc ||
    selectedConditions().some(c=>c.clearance);
}

/* =====================================================================
   VITAL SIGNS · MAX HEART RATE (Tanaka) · TARGET ZONES · BORG RPE
   Objective inputs that personalize intensity and tailor safety flags.
===================================================================== */
const vnum = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
// Tanaka 2001: HRmax = 208 − 0.7 × age (more accurate than 220 − age).
function tanakaMax(age){ const a = vnum(age); return (a && a>=5 && a<=110) ? Math.round(208 - 0.7*a) : null; }
function bmiCalc(h,w){ const H=vnum(h), W=vnum(w); if(!H||!W) return null; const m=H/100; const b=W/(m*m); return (isFinite(b)&&b>8&&b<100) ? Math.round(b*10)/10 : null; }
function bmiCategory(b){ if(b==null) return ""; if(b<18.5) return "underweight"; if(b<25) return "healthy"; if(b<30) return "overweight"; return "obese"; }
function fmtRange(r){ return r ? `${r[0]}–${r[1]}` : "—"; }

// Target HR zones — Karvonen (heart-rate reserve) when resting HR is known, else % of max HR.
function hrZones(){
  const hrmax = tanakaMax(state.age); if(!hrmax) return null;
  const v = state.vitals||{}; const rest = vnum(v.restHR);
  const useHRR = rest!=null && rest>=30 && rest<hrmax-10;
  const band = (lo,hi)=> useHRR
    ? [Math.round(rest+lo*(hrmax-rest)), Math.round(rest+hi*(hrmax-rest))]
    : [Math.round(lo*hrmax), Math.round(hi*hrmax)];
  const zones = useHRR
    ? { warmup:band(.30,.40), moderate:band(.40,.60), vigorous:band(.60,.85) }
    : { warmup:band(.57,.64), moderate:band(.64,.76), vigorous:band(.76,.93) };
  const cap = deviceHRCeiling();               // ICD: cap zones below the shock threshold
  if(cap){ const clamp=z=>[Math.min(z[0],cap), Math.min(z[1],cap)];
    zones.warmup=clamp(zones.warmup); zones.moderate=clamp(zones.moderate); zones.vigorous=clamp(zones.vigorous); }
  return { hrmax, rest: useHRR?rest:null, zones, deviceCap: cap };
}

// Objective-data-derived engine flags (baked into the program through gatherFlags).
function vitalFlags(){
  const v = state.vitals||{}; const out=[];
  const sbp=vnum(v.sbp), dbp=vnum(v.dbp), hr=vnum(v.restHR), spo2=vnum(v.spo2);
  if((sbp!=null&&sbp>=180)||(dbp!=null&&dbp>=110)) out.push("vital_bp_crisis");
  else if((sbp!=null&&sbp>=160)||(dbp!=null&&dbp>=100)) out.push("vital_bp_high");
  if(hr!=null&&hr>=100) out.push("vital_tachy");
  else if(hr!=null&&hr>0&&hr<50) out.push("vital_brady");
  if(spo2!=null&&spo2>0&&spo2<92) out.push("vital_hypoxia");
  return out;
}
/* ---------- weight-bearing status & orthoses/prostheses ---------- */
/* Weight-bearing orders (most → least restrictive). `flag` feeds the
   contraindication engine via gatherFlags so the plan is reshaped. */
const WB_STATUS = {
  fwb:  { abbr:"FWB",        label:"Full weight-bearing", flag:null,
          desc:"No restriction — put your full weight through the limb." },
  wbat: { abbr:"WBAT",       label:"Weight-bearing as tolerated", flag:"wb_wbat",
          desc:"Put as much weight through the limb as stays comfortable; use aids as needed and ease off if pain or swelling rises." },
  pwb:  { abbr:"PWB",        label:"Partial weight-bearing", flag:"wb_pwb", pct:true,
          desc:"Put only the allowed share of your body weight through the limb (commonly 25–50%). Practise the amount on a bathroom scale." },
  ttwb: { abbr:"TTWB / TDWB", label:"Toe-touch / touch-down weight-bearing", flag:"wb_ttwb",
          desc:"The foot may rest on the floor for balance only — 'like standing on eggshells' (about the weight of the leg, under ~20 lb / 10–15% body weight), not for support." },
  ffwb: { abbr:"FFWB",       label:"Feather / featherweight bearing", flag:"wb_ttwb",
          desc:"Barely any load — just a whisper of contact for balance (a few pounds)." },
  nwb:  { abbr:"NWB",        label:"Non-weight-bearing", flag:"wb_nwb",
          desc:"No weight at all on the limb — keep it off the floor and use your crutches/walker as instructed." }
};
const WB_ORDER = ["fwb","wbat","pwb","ttwb","ffwb","nwb"];
const WB_SIDE = { left:"left", right:"right", bilateral:"both" };
const WB_LIMB = { le:"lower limb (leg)", ue:"upper limb (arm)" };
function bodyWeightLbs(){ const kg = vnum((state.vitals||{}).weight); return kg ? kg*2.2046226 : null; }
/* Tag-based flags apply to LOWER-limb weight-bearing (standing/legs). Upper-limb
   restrictions are handled by the name-based restriction layer instead. */
function wbFlags(){
  const wb = state.weightBearing||{}; const r = WB_STATUS[wb.status];
  if(!r || !r.flag) return [];
  if(wb.limb==="ue") return [];
  return [r.flag];
}
function wbWhere(){
  const wb = state.weightBearing||{};
  const side = WB_SIDE[wb.side] || "";
  const limb = WB_LIMB[wb.limb] || WB_LIMB.le;
  return [side, limb].filter(Boolean).join(" ");
}
/* Human-readable weight-bearing order line (used in the precautions card & coach). */
function wbSummary(){
  const wb = state.weightBearing||{}; const r = WB_STATUS[wb.status]; if(!r) return "";
  let amt = "";
  if(wb.status==="pwb"){
    const parts = [];
    if(String(wb.pct).trim()!=="") parts.push(`${wb.pct}%`);
    if(String(wb.lbs).trim()!=="") parts.push(`~${wb.lbs} lbs`);
    if(parts.length) amt = ` — ${parts.join(" · ")}`;
  }
  const where = wbWhere();
  return `${r.label} (${r.abbr})${amt}${where?` · ${where}`:""}`;
}

/* Orthotics / prosthetics / immobilizers / splints, grouped by region.
   Reminders (with a default note); the user can also add a custom one. */
const DEVICE_CATALOG = {
  le:{ label:"Lower extremity", items:[
    ["CAM walker boot","Wear it for all standing/walking; remove only for prescribed exercises or hygiene."],
    ["Post-op shoe","Wear whenever you're on your feet to protect the forefoot/toes."],
    ["Hinged / ROM knee brace","Keep it set to the range your surgeon prescribed; don't exceed the locked limits."],
    ["Knee immobilizer","Keep the knee locked straight as instructed — usually for standing, walking and sleeping."],
    ["Unloader knee brace","Wear during weight-bearing activity to offload the affected side."],
    ["Ankle brace / stirrup","Wear for weight-bearing and higher-risk activity to protect the ligaments."],
    ["Ankle-foot orthosis (AFO)","Wear as prescribed for foot clearance and ankle support when walking."],
    ["Short/long leg cast","Keep it clean and dry; follow your weight-bearing order exactly."],
    ["Foot orthotic / insole","Wear inside supportive shoes as prescribed."],
    ["Patellar / IT-band strap","Wear during aggravating activity to reduce load on the tendon."],
    ["Compression stocking","Wear as advised to manage swelling and clot risk."],
    ["Lower-limb prosthesis","Follow your prosthetist's wear schedule; check the residual limb for redness/skin breakdown."]
  ]},
  ue:{ label:"Upper extremity", items:[
    ["Shoulder sling / immobilizer","Keep the arm supported; remove only for prescribed pendulum/ROM work."],
    ["Abduction pillow sling","Keep the shoulder in the prescribed abduction; don't let the arm hang across the body."],
    ["Hinged elbow brace","Keep it set to the prescribed range; don't force beyond the stops."],
    ["Elbow immobilizer","Keep the elbow at the set angle as instructed."],
    ["Wrist splint (cock-up)","Keep the wrist supported; remove only for prescribed motion."],
    ["Thumb spica splint","Keep the thumb immobilized; avoid pinching/gripping with it."],
    ["Finger / buddy splint","Keep the finger protected; move only as prescribed."],
    ["Wrist / forearm cast","Keep it clean and dry; keep the fingers moving to reduce stiffness/swelling."],
    ["Resting hand splint","Wear on the prescribed schedule (often at night) to maintain position."],
    ["Clavicle brace / figure-8","Wear to hold the shoulders back as prescribed."],
    ["Upper-limb prosthesis","Follow your prosthetist's wear schedule; check the residual limb daily."]
  ]},
  spine:{ label:"Spine / neck", items:[
    ["Cervical collar","Wear as prescribed; avoid end-range neck movements while it's on."],
    ["Lumbar / TLSO brace","Wear for upright/loaded activity as prescribed; follow your bend/lift limits."]
  ]}
};
function deviceNoteFor(name){
  for(const g of Object.values(DEVICE_CATALOG)){ const hit=g.items.find(([n])=>n===name); if(hit) return hit[1]; }
  return "Wear/use as prescribed by your clinician.";
}
/* ---------- name-based exercise restrictions from devices & UE weight-bearing ----------
   The tag engine can't target a limb/joint precisely (protocol & signature
   exercises carry no region), so we match on the exercise NAME. `avoid` removes
   the exercise (and libraryOptions won't offer it); `caution` keeps it but flags
   "check with your brace". Upper-limb weight-bearing is handled here too. */
const UE_LOAD_RE = /push-?up|\bplank\b|\bdip\b|handstand|bear crawl|mountain climber|burpee|overhead|shoulder press|chest press|bench press|incline press|military press|lateral raise|front raise|rear-delt|\bfly\b|biceps curl|hammer curl|preacher|concentration curl|reverse curl|wrist curl|\btriceps\b|lat pull|pull-?up|chin-?up|inverted row|bent-over row|seated row|upright row|\brow\b|face pull|scaption|full-can|y-t-w|external rotation|internal rotation|pendulum|wall walk|\bwrist\b|forearm|\bgrip\b|farmer|suitcase|waiter|\bcarr(y|ies)\b|carries|dead-?hang|pinch|deviation|pronation|supination|squeeze|quadruped|weight-bearing rock|ball squeeze|soft-ball|snatch|clean|jerk|\bthrow\b|serve/i;
const DEVICE_RESTRICT = {
  "Shoulder sling / immobilizer":{ avoid:/overhead|shoulder press|chest press|bench press|push-?up|\bdip\b|lateral raise|front raise|\bfly\b|snatch|clean|jerk|pull-?up|chin-?up|lat pull|inverted row|bent-over row|upright row|\bthrow\b|serve|\bplank\b/i,
    caution:/\brow\b|band|scapular|external rotation|internal rotation|y-t-w|face pull|reach|pendulum|biceps|triceps|\bcurl\b/i,
    note:"Shoulder sling/immobilizer: the arm is immobilized — overhead, pressing, rowing, pull-ups and weight-through-the-arm exercises were removed. Do prescribed pendulum/scapular and other-limb work only." },
  "Abduction pillow sling":{ avoid:/overhead|shoulder press|chest press|bench press|push-?up|\bdip\b|lateral raise|front raise|\bfly\b|pull-?up|chin-?up|lat pull|\brow\b|\bthrow\b|\bplank\b/i,
    caution:/external rotation|internal rotation|scapular|band|reach/i,
    note:"Abduction pillow sling: keep the shoulder in the prescribed position — loaded shoulder and arm-weight-bearing exercises were removed." },
  "Hinged elbow brace":{ avoid:/pull-?up|chin-?up|push-?up|\bdip\b/i,
    caution:/biceps curl|hammer curl|triceps|\bcurl\b|press|\brow\b/i,
    note:"Hinged elbow brace: work only within the prescribed range; heavy end-range elbow loading is limited." },
  "Elbow immobilizer":{ avoid:/biceps curl|hammer curl|triceps|preacher|concentration curl|\bcurl\b|pull-?up|chin-?up|push-?up|\bdip\b|overhead press|shoulder press|chest press|bench press/i,
    caution:/\brow\b|grip|wrist|band/i,
    note:"Elbow immobilizer: elbow-bending/straightening loaded exercises (curls, triceps, push-ups, pull-ups) were removed until motion is allowed." },
  "Wrist splint (cock-up)":{ avoid:/wrist|forearm|\bgrip\b|farmer|dead-?hang|pinch|deviation|pronation|supination/i,
    caution:/push-?up|\bplank\b|carry|\brow\b|pull-?up/i,
    note:"Wrist splint: wrist and grip-loading exercises were removed — keep the wrist neutral and supported." },
  "Thumb spica splint":{ avoid:/\bgrip\b|pinch|thumb|farmer|dead-?hang|wrist curl/i,
    caution:/carry|push-?up|\brow\b/i,
    note:"Thumb spica: avoid pinching/gripping with the thumb — grip-loading exercises were removed." },
  "Finger / buddy splint":{ avoid:/\bgrip\b|pinch|farmer|dead-?hang/i, caution:/carry|push-?up/i,
    note:"Finger/buddy splint: protect the finger — gripping/pinching-loaded exercises were removed." },
  "Wrist / forearm cast":{ avoid:/wrist|forearm|\bgrip\b|farmer|dead-?hang|pinch|deviation|pronation|supination|push-?up|\bplank\b|pull-?up|\bdip\b|carry/i,
    caution:/\brow\b|press|reach/i,
    note:"Wrist/forearm cast: the wrist is immobilized — wrist, grip and arm-weight-bearing exercises were removed. Keep the fingers moving." },
  "Resting hand splint":{ avoid:/\bgrip\b|pinch|wrist curl/i, caution:/carry|push-?up|\brow\b/i,
    note:"Resting hand splint: avoid gripping/pinching loads while it's on." },
  "Upper-limb prosthesis":{ caution:/\bgrip\b|carry|farmer|push-?up|\bplank\b/i,
    note:"Upper-limb prosthesis: build tolerance to gripping/loading gradually; check the residual limb for skin issues." },
  "Knee immobilizer":{ avoid:/squat|lunge|step-up|step-down|leg press|hamstring curl|wall sit|split squat|bulgarian|box jump|\bhop\b|nordic|pistol|sit-to-stand|deep knee|knee bend/i,
    caution:/bridge|calf raise|balance|gait|cycl/i,
    note:"Knee immobilizer (locked straight): knee-bending exercises (squats, lunges, step-ups, hamstring curls) were removed. Focus on quad sets, straight-leg raises and ankle/hip work." },
  "Hinged / ROM knee brace":{ avoid:/box jump|\bhop\b|nordic|pistol|deep squat/i,
    caution:/squat|lunge|step-up|step-down|leg press|hamstring curl|wall sit|split squat/i,
    note:"Hinged/ROM knee brace: keep within the prescribed range — deep and high-impact knee work is limited; stay inside your locked limits." },
  "Short/long leg cast":{ avoid:/calf raise|heel raise|\bankle\b|squat|lunge|step-up|step-down|\bhop\b|jump|balance|gait|single-leg|leg press|hamstring curl|wall sit/i,
    caution:/bridge|cycl/i,
    note:"Leg cast: the leg is immobilized — standing, ankle, calf and knee-loading exercises were removed. Follow your weight-bearing order and do other-limb/core work." },
  "CAM walker boot":{ avoid:/\bhop\b|jump|plyo|depth|\bcut\b|cutting/i,
    caution:/calf raise|heel raise|\bankle\b|single-leg|balance|gait/i,
    note:"CAM boot: the ankle is protected — high-impact work was removed and ankle/calf/balance work is limited; wear it for all standing." },
  "Post-op shoe":{ caution:/calf raise|heel raise|toe|\bhop\b|jump/i,
    note:"Post-op shoe: protect the forefoot/toes — go easy on calf-raise and toe-loading work." },
  "Ankle-foot orthosis (AFO)":{ avoid:/\bhop\b|jump|plyo/i, caution:/calf raise|\bankle\b|balance|single-leg/i,
    note:"AFO: supports the foot/ankle for walking — go easy on ankle-mobility and impact work." },
  "Ankle brace / stirrup":{ avoid:/depth jump/i, caution:/\bhop\b|jump|\bcut\b|cutting|balance|single-leg/i,
    note:"Ankle brace: protects the ligaments — reintroduce hopping, cutting and single-leg balance gradually." },
  "Cervical collar":{ avoid:/neck rotation|neck extension|neck side-?bend|neck flexion|cervical rotation|cervical mobility|end-?range neck|overhead/i,
    caution:/chin tuck|scapular|\bneck\b|deep neck/i,
    note:"Cervical collar: keep the neck still — end-range neck movements (and overhead work) were removed; gentle chin-tucks only if allowed." },
  "Lumbar / TLSO brace":{ avoid:/deadlift|good-?morning|sit-up|\bv-up\b|hyperextension/i,
    caution:/squat|hinge|crunch|rotation|extension|carry|bridge|bird-dog|\bplank\b/i,
    note:"Lumbar/TLSO brace: follow your bend/lift limits — heavy spinal flexion/extension was removed and loaded trunk work is limited while braced." }
};
/* ---------- special surgical precautions (sternal / abdominal) ----------
   Toggle-able precaution SETS a clinician can switch on. Each carries a plain-
   language explanation ("what"), the concrete do/don't rules (shown as rows),
   a typical weeks-to-follow window, an engine `flag` (→ CONTRA_RULES so the tag
   engine reshapes the plan) and a name-based avoid/caution layer (so pushing,
   pulling, pressing, core-loading etc. are removed by exercise NAME too). */
const SPECIAL_PRECAUTIONS = {
  sternal: {
    key:"sternal", icon:"🫀", label:"Sternal precautions",
    sub:"after open-heart surgery / breastbone (sternotomy)",
    weeks:8, flag:"sternal_precautions",
    what:"After most open-heart surgery the surgeon reaches the heart by cutting straight down through the breastbone (the sternum) — a “median sternotomy” — then wires the two halves back together. That bone takes about 6–8 weeks to knit. Sternal precautions are the rules that protect the healing breastbone by limiting how hard you push, pull, lift and reach with your arms, so the halves don't shift apart while they fuse.",
    rules:[
      "Don't lift, push or pull anything heavier than ~5–10 lb (about a milk jug) with your arms.",
      "Don't push yourself up out of a bed or chair with your arms — scoot to the edge and stand with your legs.",
      "Keep both elbows close to your sides — avoid reaching both arms overhead, out to the sides, or behind your back at the same time.",
      "Hug a firm pillow against your chest when you cough, sneeze or laugh (“splinting”).",
      "No driving until your surgeon clears you (often around 4 weeks).",
      "Stop and tell your care team if you feel or hear clicking, popping or grinding in your breastbone."
    ],
    avoid:/push-?up|\bplank\b|\bdip\b|bench press|chest press|shoulder press|overhead press|military press|incline press|lat pull|pull-?up|chin-?up|inverted row|bent-over row|upright row|seated row|\brow\b|deadlift|farmer|suitcase|waiter|\bcarr(y|ies)\b|dead-?hang|bear crawl|burpee|mountain climber|snatch|clean|jerk|wall walk|handstand/i,
    caution:/band|biceps|triceps|\bcurl\b|lateral raise|front raise|reach|scapular|resistance|pull-?down|pec|reverse fly|\bfly\b/i,
    note:"Sternal precautions: your breastbone is healing — pushing, pulling, pressing, overhead work and lifting/carrying more than ~5–10 lb with the arms were removed. Focus on gentle legs, walking and breathing work; hug a pillow to your chest when you cough."
  },
  abdominal: {
    key:"abdominal", icon:"🩹", label:"Abdominal precautions",
    sub:"after abdominal / hernia / C-section surgery",
    weeks:6, flag:"abdominal_precautions",
    what:"After surgery inside the belly — for example a bowel operation, hernia repair, appendix removal, hysterectomy or a C-section — the surgeon cuts through the layers of the abdominal wall (skin, muscle and the lining underneath), which are then stitched back together. Those layers and the incision need about 4–6 weeks to heal and regain their strength. Abdominal precautions protect that healing by limiting lifting, bearing-down/straining and direct “ab” exercises — each of those sharply raises the pressure inside your belly and tugs on the incision, which can tear the repair, pull the wound open, or push tissue out through a weak spot to form a hernia.",
    rules:[
      "Don't lift, push or pull more than ~5–10 lb (or the limit your surgeon set) until you're cleared.",
      "Never hold your breath and bear down — breathe out during any effort (and don't strain on the toilet).",
      "Skip sit-ups, crunches, planks, leg-lowers and other direct abdominal exercises for now.",
      "Support your incision with a hand or a pillow when you cough, sneeze or stand up.",
      "Roll onto your side and push up with your arms (“log-roll”) to get out of bed instead of sitting straight up.",
      "Report a new bulge, increasing pain, redness, swelling or drainage at the incision."
    ],
    avoid:/sit-?up|crunch|\bplank\b|\bv-?up\b|hollow|russian twist|flutter|jackknife|jack-?knife|bicycle|hanging (?:knee|leg)|double-?leg (?:raise|lower)|leg lower|toe touch|roll-?up|dragon flag|ab wheel|dead-?hang|deadlift|good-?morning|hyperextension|farmer|suitcase|\bcarr(y|ies)\b/i,
    caution:/twist|rotation|oblique|pallof|bird-?dog|dead ?bug|bridge|\bhinge\b|mountain climber|band|woodchop|\bcarry\b|superman/i,
    note:"Abdominal precautions: your abdominal wall/incision is healing — sit-ups, crunches, planks, leg-lowers and other direct core-loading were removed, along with heavy lifting and breath-holding/straining. Support the incision when you cough and log-roll out of bed."
  },
  spinal: {
    key:"spinal", icon:"🦴", label:"Spinal precautions",
    sub:"after spine surgery (fusion / laminectomy / discectomy)",
    weeks:12, flag:"spinal_precautions",
    what:"After spine surgery — a fusion, laminectomy, discectomy or similar — the healing bone, any hardware and the soft tissue around it need time to consolidate (often up to about 12 weeks for a fusion). Spinal precautions protect that healing with the classic “BLT” rule — no Bending, Lifting or Twisting of the spine — plus a lifting limit, so you don't stress the surgical site or shift hardware before it's solid.",
    rules:[
      "No BENDING forward through your back — hinge at the hips and knees with a straight back, and squat to reach low things.",
      "No LIFTING more than ~5–10 lb (about a milk jug), or the limit your surgeon set.",
      "No TWISTING your spine — turn your whole body as one unit (“nose over toes”) instead of rotating your trunk.",
      "Log-roll to get in and out of bed — roll your shoulders and hips together, without twisting.",
      "Change position often and walk regularly, but avoid prolonged sitting or slumping.",
      "No driving until your surgeon clears you; wear your back brace (TLSO/LSO) if one was prescribed.",
      "Seek urgent care for new or worsening leg weakness or numbness, or any loss of bladder or bowel control."
    ],
    avoid:/deadlift|good-?morning|sit-?up|crunch|\bv-?up\b|russian twist|woodchop|hyperextension|back extension|superman|toe touch|windmill|jackknife|hanging|\brotation\b|\btwist\b|roll-?up|dragon flag|\bplank\b|mountain climber|burpee|clean|snatch|jerk|farmer|suitcase|\bcarr(y|ies)\b|kettlebell swing|sit-to-stand/i,
    caution:/squat|lunge|\bhinge\b|bridge|bird-?dog|dead ?bug|pallof|band|\brow\b|pull-?down|overhead|step-up|hip thrust|bend/i,
    note:"Spinal precautions (after spine surgery): protect the healing spine with the “BLT” rule — no Bending, Lifting (>~5–10 lb) or Twisting. Loaded trunk bending/arching/rotation and heavy lifting/carrying were removed; hinge at the hips with a straight back, log-roll, and turn as one unit. Keep walking, and wear your brace if prescribed. Follow your surgeon's timeline."
  }
};
function activeSpecialPrecautions(){ return (state.specialPrecautions||[]).map(k=>SPECIAL_PRECAUTIONS[k]).filter(Boolean); }
/* Engine flags so the exercise SELECTION also adjusts for the precaution set. */
function specialPrecautionFlags(){ return activeSpecialPrecautions().map(p=>p.flag); }

function activeRestrictions(){
  const avoid=[], caution=[], notes=[];
  const wb = state.weightBearing||{};
  if(wb.status && WB_STATUS[wb.status] && WB_STATUS[wb.status].flag && wb.limb==="ue"){
    const strict = /nwb|ttwb|ffwb/.test(wb.status);
    (strict?avoid:caution).push(UE_LOAD_RE);
    const sideTxt = WB_SIDE[wb.side] ? WB_SIDE[wb.side]+" " : "";
    notes.push(`Weight-bearing restriction (${WB_STATUS[wb.status].abbr}) on the ${sideTxt}arm: ${strict?"pushing, planks, pull-ups, pressing, carrying and other arm-loading exercises were removed":"arm-loading exercises are limited"} — do lower-body and core work.`);
  }
  (state.devices||[]).forEach(d=>{ const r=DEVICE_RESTRICT[d.name]; if(!r) return;
    if(r.avoid) avoid.push(r.avoid);
    if(r.caution) caution.push(r.caution);
    if(r.note) notes.push(r.note);
  });
  activeSpecialPrecautions().forEach(p=>{
    if(p.avoid) avoid.push(p.avoid);
    if(p.caution) caution.push(p.caution);
    if(p.note) notes.push(p.note);
  });
  return { avoid, caution, notes };
}
function nameAllowed(name){ return !activeRestrictions().avoid.some(re=>re.test(name)); }
function cautionForName(name){ return activeRestrictions().caution.some(re=>re.test(name)); }
function onBetaBlocker(){ return selectedMeds().some(m=>(m.flags||[]).includes("beta_blocker")); }
/* ---------- cardiac device (ICD / pacemaker / CRT / LVAD) → intensity limits ---------- */
function cardiacDeviceType(){ return (state.cardiacDevice||{}).type || ""; }
function hasICD(){ return /^(icd|crtd)$/.test(cardiacDeviceType()); }         // shockable device
function hasLVAD(){ return cardiacDeviceType()==="lvad"; }
function hasCardiacDevice(){ return !!cardiacDeviceType() || (state.flags||[]).includes("pacemaker_icd"); }
/* Safe HR ceiling: keep ~20 bpm below the ICD's therapy (shock) threshold. */
function deviceHRCeiling(){
  const rate = vnum((state.cardiacDevice||{}).icdRate);
  return (hasICD() && rate!=null && rate>=100) ? Math.max(90, Math.round(rate-20)) : null;
}
function cardiacDeviceLabel(){
  const t=cardiacDeviceType();
  return t==="icd"?"ICD (defibrillator)":t==="crtd"?"CRT-D (defibrillator)":t==="crtp"?"CRT pacemaker":t==="pacemaker"?"pacemaker":t==="lvad"?"LVAD (heart pump)":"cardiac device";
}
/* Engine flags so the exercise SELECTION also adjusts for the device. */
function deviceFlags(){
  const out=[];
  if(hasICD()) out.push("cardiac_icd");
  if(hasLVAD()) out.push("cardiac_lvad");
  return out;
}
function someCardioPulm(){
  const f = state.program ? state.program.flags : gatherFlags();
  return f.some(x=>["cardiac","pulmonary","hypertension","pad","dvt","vital_hypoxia","vital_bp_high","vital_bp_crisis","vital_tachy"].includes(x));
}

// Borg 6–20 RPE scale; perceived-exertion number × 10 ≈ heart rate.
const BORG_SCALE = [
  [6,"No exertion","At rest"], [7,"Extremely light",""], [9,"Very light","Easy, could sustain for hours"],
  [11,"Light","Can talk comfortably"], [13,"Somewhat hard","Breathing harder, still able to talk"],
  [15,"Hard","Sweating, talking takes effort"], [17,"Very hard","Very strenuous, near your limit"],
  [19,"Extremely hard","Almost maximal"], [20,"Maximal","All-out effort"]
];
// Recommended RPE band for the current track / risk profile.
function borgTarget(){
  const flags = state.program ? state.program.flags : gatherFlags();
  const cardioCap = flags.some(f=>["cardiac","pulmonary","hypertension","pad","dvt","vital_bp_high","vital_bp_crisis","vital_tachy","vital_hypoxia"].includes(f));
  const track = state.program ? state.program.track : (classify(state.weeks)||"acute");
  // cardiac devices take precedence — go by RPE and cap the intensity
  if(hasLVAD()) return {lo:9,hi:12,label:"very light–light · RPE 9–12 (an LVAD makes HR unreliable — go by RPE)"};
  if(hasICD()) return {lo:11,hi:13,label:"light–moderate · RPE 11–13 (stay well below your ICD's shock threshold)"};
  if(hasCardiacDevice()) return {lo:11,hi:13,label:"light–moderate · RPE 11–13 (respect your device's rate limit)"};
  if(cardioCap) return {lo:11,hi:13,label:"light–moderate · RPE 11–13 (stay able to talk)"};
  if(track==="acute") return {lo:9,hi:12,label:"very light–light · RPE 9–12"};
  return {lo:12,hi:15,label:"moderate–hard · RPE 12–15"};
}
function topSupervision(){
  const rank={self:0,supervised:1,clinical:2}; let best="self";
  selectedConditions().forEach(c=>{ if(rank[c.supervision]>rank[best]) best=c.supervision; });
  return best;
}
/* Displayed supervision level considers conditions AND active precautions,
   so it can never read "self-guided" when clearance is required. */
function displaySupervision(flags, clearance){
  const rank={self:0,supervised:1,clinical:2}, names=["self","supervised","clinical"];
  let lvl=rank[topSupervision()];
  if(clearance || flags.includes("pulmonary")) lvl=Math.max(lvl,1);
  if(flags.includes("cardiac") || flags.includes("dvt")) lvl=Math.max(lvl,2);
  return names[lvl];
}

/* phase week distribution (adapts to acuteness / pain / surgery / fitness) */
function buildPhaseWeeks(track){
  const total = TEMPLATE[track].total; let split;
  if(track==="acute"){
    split=[3,4,5,4];
    if(state.surgery==="yes") split=[4,4,5,3];
    if(state.painMove>=7) split=[4,5,4,3];
    if(state.painMove<=2 && state.fitness==="high") split=[2,4,5,5];
  } else {
    split=[2,5,4,3];
    if(state.painMove>=7) split=[3,5,3,3];
    if(state.fitness==="high" && state.painMove<=3) split=[2,4,4,4];
  }
  let sum=split.reduce((a,b)=>a+b,0);
  while(sum<total){ split[1]++; sum++; }
  while(sum>total){ split[3]=Math.max(2,split[3]-1); sum=split.reduce((a,b)=>a+b,0); }
  return split;
}
function sessionsText(track){
  if(track==="acute" && state.painMove>=6) return "5–7 short sessions/week (little & often)";
  if(state.fitness==="high") return "4–5 sessions/week";
  return "4–6 sessions/week";
}
function loadGuidance(){
  if(state.painMove>=7) return "Keep effort very light. Pain during exercise should stay at/below 3/10 and settle within an hour.";
  if(state.painMove>=4) return "Mild discomfort (up to ~4/10) during loading is acceptable if it settles by the next morning. Sharp pain means back off.";
  return "You can load with confidence. Progress ~10% per week while pain stays low and settles overnight.";
}

/* ---------- exercise library integration ---------- */
const LIB_REGION = {
  shoulder:["Shoulder","Scapula/Upper back"], shoulder_instability:["Shoulder","Scapula/Upper back"],
  elbow:["Elbow","Forearm"], wrist_hand:["Wrist / Hand","Forearm"],
  hip:["Hip","Glute","Core"], hip_replacement:["Hip","Glute","Core"],
  knee_ligament:["Knee","Hip","Ankle"], knee_pf:["Knee","Hip"], knee_meniscus:["Knee","Hip"], knee_replacement:["Knee","Hip"],
  ankle:["Ankle","Calf","Balance"], achilles:["Ankle","Calf"], foot:["Foot","Ankle","Calf"],
  cervical:["Neck","Scapula/Upper back"], radiculopathy_cervical:["Neck","Scapula/Upper back"],
  thoracic:["Thoracic/Upper back","Scapula/Upper back","Core"],
  lumbar:["Core","Hip","Spine"], radiculopathy_lumbar:["Core","Hip","Spine"], sacroiliac:["Core","Hip","Spine"],
  fracture_ue:["Shoulder","Elbow","Wrist / Hand","Forearm"], amputation_ue:["Shoulder","Elbow","Wrist / Hand","Forearm"],
  fracture_le:["Hip","Knee","Ankle","Foot","Calf"], amputation_le:["Hip","Knee","Ankle","Balance"],
  tmj:["Neck"], general_msk:["Full body","Core","Hip"],
  stroke:["Balance","Gait","Core"], tbi:["Balance","Gait","Core"], sci:["Core","Balance","Full body"],
  ms:["Balance","Core","Cardio"], parkinsons:["Balance","Gait","Full body"], balance_neuro:["Balance","Gait","Core"], guillain_barre:["Balance","Core","Full body"],
  neuropathy:["Balance","Foot","Ankle"], vestibular:["Vestibular","Balance"], bells_palsy:["Neck"],
  cardiac_rehab:["Cardio","Full body"], heart_failure:["Cardio","Full body"], hypertension:["Cardio","Full body"],
  pad:["Cardio","Knee","Hip"], valve:["Cardio","Breathing"], arrhythmia:["Cardio","Full body"],
  pulmonary_rehab:["Cardio","Breathing","Core"], asthma:["Cardio","Breathing"], post_covid:["Cardio","Breathing","Balance"],
  ild:["Cardio","Breathing"], thoracic_surgery:["Breathing","Scapula/Upper back","Cardio"], pulm_hypertension:["Cardio","Breathing"]
};
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return h; }
/* Contraindication-filtered library options for a condition's region & phase.
   seed changes the ordering (used by "reroll"); count sets how many to return. */
function libraryOptions(protocol, phaseIdx, flags, exclude, count, seed){
  if(!window.EXERCISES) return [];
  count = count || 6; seed = seed || 0;
  const regions = LIB_REGION[protocol] || LIB_REGION[(window.PROTOCOL_ALIAS||{})[protocol]] || ["Full body","Core"];
  const rset = new Set(regions);
  const bucket = phaseIdx+1;                      // 1..4
  const allowed = new Set([bucket]); if(bucket>1) allowed.add(bucket-1);
  const exSet = new Set((exclude||[]).map(n=>n.toLowerCase()));
  const pool = window.EXERCISES.filter(e =>
    e.region.some(r=>rset.has(r)) && allowed.has(e.difficulty) && !exSet.has(e.name.toLowerCase()));
  let { kept } = window.applyContra(pool, flags);
  kept = kept.filter(e=>nameAllowed(e.name));      // respect device / weight-bearing restrictions
  kept.sort((a,b)=> hashStr(a.name+"|"+seed) - hashStr(b.name+"|"+seed));
  return kept.slice(0,count).map(e=>({ n:e.name, d:e.dose, c:e.cue, warn:e.warn, pattern:e.pattern, region:e.region, tags:e.tags }));
}

/* ---------- injury-specific layer ----------
   Detects the actual diagnosis from the condition name and injects signature,
   phase-targeted "priority" exercises + a focus note, so two conditions in the
   same region (e.g. rotator cuff tear vs frozen shoulder) get different plans.
   `p` = phase 1–4. Signature exercises carry engine tags so they're still filtered. */
const INJURY_FOCUS = [
  {re:/rotator cuff|cuff repair|cuff tear|supraspinatus tendinop|infraspinatus tendinop|subscapularis tendinop|calcific tendin/,
   focus:"Rebuild rotator-cuff and shoulder-blade control — prioritise external-rotation strength and delay painful overhead loading.",
   add:[{p:1,n:"Isometric external rotation (elbow at side)",d:"5×20–30s",c:"Press outward into a wall/towel, no movement"},
        {p:2,n:"Band external rotation (arm at side)",d:"3×12–15",c:"Elbow tucked, slow return"},
        {p:3,n:"Prone Y and T raises",d:"3×10 each",c:"Thumb up, squeeze the mid-back",tags:["prone","overhead"]},
        {p:4,n:"Progressive overhead press (pain-free)",d:"3×8–10",c:"Add load only once the cuff is strong",tags:["overhead","valsalva"]}]},
  {re:/adhesive capsulitis|frozen shoulder/,
   focus:"Restore range gradually — gentle, frequent mobility beats aggressive stretching; don't force painful end-range early.",
   add:[{p:1,n:"Pendulum swings",d:"3×30s each direction",c:"Let the arm hang and sway"},
        {p:1,n:"Table slides / forward reach",d:"3×10",c:"Slide the hand forward to a gentle stretch"},
        {p:2,n:"Wall walks (flexion & abduction)",d:"3×10",c:"Walk the fingers up only to a comfortable height",tags:["overhead"]},
        {p:3,n:"Cane-assisted external rotation",d:"3×10",c:"Guide gently with the other arm"}]},
  {re:/impingement/,
   focus:"Create space in the shoulder — scapular control and posture, and avoid the painful overhead arc until it settles.",
   add:[{p:1,n:"Scapular setting (retraction/depression)",d:"3×10 (5s hold)",c:"Draw the shoulder blade back and down"},
        {p:2,n:"Band external rotation",d:"3×15",c:"Elbow tucked"},
        {p:3,n:"Full-can raise (below shoulder first)",d:"3×12",c:"Thumb up, stay pain-free",tags:["overhead"]}]},
  {re:/shoulder (instability|dislocation|subluxation)|bankart|glenohumeral instab|multidirectional shoulder/,
   focus:"Rebuild dynamic stability — cuff and scapular strength and proprioception; avoid the apprehension position (external rotation with the arm out) early.",
   add:[{p:1,n:"Rhythmic stabilisation (gentle)",d:"3×20s",c:"Small perturbations with the arm supported"},
        {p:2,n:"Closed-chain scapular work (wall)",d:"3×10",c:"Weight through the arm, control the blade",tags:["weight_bearing"]},
        {p:3,n:"Band internal/external rotation",d:"3×15",c:"Stay out of the apprehension position"}]},
  {re:/lateral epicondyl|tennis elbow|common extensor tendinop/,
   focus:"Load the wrist extensors progressively — isometrics for pain relief, then heavy-slow and eccentric work; reduce provocative gripping early.",
   add:[{p:1,n:"Wrist-extensor isometric hold",d:"5×30–45s",c:"Hold a light weight, wrist up, no movement",tags:["grip_isometric"]},
        {p:2,n:"Eccentric wrist extension",d:"3×15",c:"Lower slowly (3s), assist back up"},
        {p:3,n:"Heavy-slow wrist extension / grip",d:"3×8–12",c:"Add load weekly",tags:["grip_isometric"]}]},
  {re:/medial epicondyl|golfer'?s elbow|common flexor tendinop/,
   focus:"Load the wrist flexors/pronators progressively — isometrics then eccentric and heavy-slow work.",
   add:[{p:1,n:"Wrist-flexor isometric hold",d:"5×30–45s",c:"Palm up, hold a light weight",tags:["grip_isometric"]},
        {p:2,n:"Eccentric wrist flexion",d:"3×15",c:"Lower slowly"},
        {p:3,n:"Pronation/supination with a hammer",d:"3×15",c:"Slow and controlled"}]},
  {re:/carpal tunnel/,
   focus:"Settle the median nerve — nerve and tendon gliding, keep the wrist neutral, and avoid sustained heavy gripping.",
   add:[{p:1,n:"Median nerve glides",d:"3×10",c:"Gentle — stop before tingling increases"},
        {p:1,n:"Tendon-gliding sequence",d:"3×10",c:"Move through the finger positions"},
        {p:2,n:"Wrist-neutral grip strengthening",d:"3×12",c:"Keep the wrist straight",tags:["grip_isometric"]}]},
  {re:/de quervain/,
   focus:"Offload the thumb tendons — isometrics and gradual loading; avoid repetitive thumb/wrist deviation early.",
   add:[{p:1,n:"Thumb isometric holds",d:"5×20s",c:"Gentle resistance, no pain"},
        {p:2,n:"Eccentric radial deviation",d:"3×12",c:"Slow lower with a light weight"}]},
  {re:/gluteal tendinop|trochanteric|greater trochanter|gluteus medius tendinop/,
   focus:"Load the gluteal tendons WITHOUT compressing them — isometric then progressive abduction; avoid crossing your legs, hanging on one hip, and side-lying on the sore side.",
   add:[{p:1,n:"Isometric hip abduction (against a wall)",d:"5×30s",c:"Press the leg out, no movement"},
        {p:2,n:"Standing hip abduction (neutral)",d:"3×12",c:"Don't let the hip drop or cross the midline",tags:["hip_add_ir"]},
        {p:3,n:"Single-leg wall press / step progression",d:"3×10",c:"Keep the pelvis level",tags:["weight_bearing","balance"]}]},
  {re:/femoroacetabular|\bfai\b|hip labral|labral (tear|repair).*hip|labral repair — hip/,
   focus:"Build hip stability and control — strengthen glutes and core, and avoid deep flexion / end-range positions that pinch the hip.",
   add:[{p:1,n:"Glute isometric sets",d:"3×10 (5s)",c:"Squeeze without deep bending"},
        {p:2,n:"Clamshell & side-lying abduction",d:"3×15",c:"Neutral spine, controlled"},
        {p:3,n:"Hip hinge / bridge progression",d:"3×10",c:"Avoid pinching at the front of the hip"}]},
  {re:/adductor|groin strain|athletic pubalgia|sports hernia|osteitis pubis/,
   focus:"Rebuild adductor strength — isometric squeezes early, then Copenhagen-style loading.",
   add:[{p:1,n:"Adductor isometric squeeze (ball)",d:"5×30s",c:"Squeeze a ball between the knees"},
        {p:2,n:"Short-lever Copenhagen plank",d:"3×8 each",c:"From the knee first"},
        {p:3,n:"Copenhagen plank (full lever)",d:"3×8 each",c:"Progress the lever"}]},
  {re:/proximal hamstring tendinop|hamstring origin/,
   focus:"Load the hamstring tendon without compressing it — isometrics in less hip-flexion, then progressive long-lever work; limit deep hip-flexion stretching.",
   add:[{p:1,n:"Long-lever bridge isometric",d:"5×30s",c:"Heels far out, hold"},
        {p:2,n:"Prone/standing hamstring curl",d:"3×12",c:"Slow eccentric"},
        {p:3,n:"Single-leg RDL (limited depth)",d:"3×10",c:"Hinge without reaching deep flexion",tags:["deep_hip_flexion","balance"]}]},
  {re:/\bacl\b/,
   focus:"Restore full extension and quad control first; build closed-chain strength and delay open-chain knee extension and pivoting.",
   add:[{p:1,n:"Quad sets / straight-leg raise",d:"3×10",c:"Lock the knee straight"},
        {p:1,n:"Heel-prop for full extension",d:"3×3 min",c:"Let the knee straighten fully"},
        {p:3,n:"Closed-chain leg press / squat (progressive)",d:"3×10",c:"Add load pain-free",tags:["weight_bearing"]},
        {p:4,n:"Return-to-sport hop-test battery (single, triple, crossover, 6-m timed)",d:"when cleared",c:"Aim for ≥90% of the other leg before cutting sport",tags:["impact","balance"]}]},
  {re:/\bpcl\b/,
   focus:"Emphasise the quads and support the shin — avoid deep knee flexion and hamstring-heavy loading early.",
   add:[{p:1,n:"Quad sets in extension",d:"3×12",c:"Strong quad squeeze"},
        {p:2,n:"Short-arc quads",d:"3×12",c:"Small range near full extension"},
        {p:3,n:"Leg press (limited depth)",d:"3×10",c:"Avoid deep flexion early",tags:["weight_bearing","deep_hip_flexion"]}]},
  {re:/\bmcl\b|\blcl\b|collateral ligament/,
   focus:"Protect the healing ligament from sideways stress — progress straight-plane strength before any cutting.",
   add:[{p:1,n:"Quad sets & straight-leg raise",d:"3×10",c:"Keep the knee stable"},
        {p:3,n:"Step-ups / squats (straight plane)",d:"3×10",c:"No sideways force",tags:["weight_bearing"]}]},
  {re:/meniscus|meniscal/,
   focus:"Build quad and hip strength while protecting the meniscus — avoid deep squatting and twisting under load early.",
   add:[{p:1,n:"Quad sets & heel slides (comfortable range)",d:"3×12",c:"Gentle, avoid a deep bend"},
        {p:3,n:"Partial-range squat / leg press",d:"3×10",c:"Avoid deep flexion and twisting",tags:["weight_bearing","deep_hip_flexion"]}]},
  {re:/patellofemoral|runner'?s knee|chondromalacia|patellar maltrack|patellofemoral instab/,
   focus:"Strengthen the hips and quads and manage load — hip abductor/external-rotator work is key; avoid painful deep knee bends under load.",
   add:[{p:1,n:"Quad sets / straight-leg raise",d:"3×12",c:"Pain-free"},
        {p:2,n:"Side-lying hip abduction & clamshell",d:"3×15",c:"Lead with the heel"},
        {p:3,n:"Step-downs (controlled)",d:"3×10",c:"Slow; the knee tracks over the foot",tags:["weight_bearing","balance"]}]},
  {re:/patellar tendinop|jumper'?s knee|quadriceps tendinop/,
   focus:"Load the tendon progressively — isometric quad holds for pain relief, then heavy-slow resistance (e.g. decline squats), then energy-storage work last.",
   add:[{p:1,n:"Isometric wall sit / Spanish squat",d:"5×30–45s",c:"Hold at a pain-free angle",tags:["weight_bearing"]},
        {p:2,n:"Heavy-slow leg press / decline squat",d:"3×8 (3s down)",c:"Slow tempo, tolerable load",tags:["weight_bearing"]},
        {p:4,n:"Energy-storage hops (progressive)",d:"3×8",c:"Only late; soft landings",tags:["impact"]}]},
  {re:/iliotibial|\bitb\b/,
   focus:"Strengthen the glutes/hip abductors and manage running load — avoid repeated downhill and high-volume flexion early.",
   add:[{p:1,n:"Side-lying hip abduction",d:"3×15",c:"Neutral, lead with the heel"},
        {p:3,n:"Single-leg squat / step control",d:"3×10",c:"Don't let the knee collapse inward",tags:["weight_bearing","balance"]}]},
  {re:/lateral ankle sprain|ankle sprain \(|\batfl\b|calcaneofibular|chronic ankle instab/,
   focus:"Prioritise balance/proprioception and peroneal strength — this prevents re-sprain more than anything else.",
   add:[{p:1,n:"Ankle alphabet & pain-free ROM",d:"2× each",c:"Trace letters with the toes"},
        {p:2,n:"Single-leg balance (progress eyes closed)",d:"3×30s",c:"Near support",tags:["balance"]},
        {p:2,n:"Band eversion (peroneal) strengthening",d:"3×15",c:"Turn the sole outward"},
        {p:4,n:"Hop and cut drills",d:"3×8",c:"Control the landing",tags:["impact","balance"]}]},
  {re:/high ankle|syndesmosis/,
   focus:"Protect the syndesmosis — avoid rotation and end-range dorsiflexion stress early; progress straight-plane loading before cutting.",
   add:[{p:1,n:"Pain-free plantar/dorsiflexion (no rotation)",d:"3×15",c:"Straight plane only"},
        {p:3,n:"Calf raises & straight-line loading",d:"3×12",c:"Avoid twisting",tags:["weight_bearing"]}]},
  {re:/insertional achilles/,
   focus:"Load the Achilles progressively but AVOID stretching into deep dorsiflexion (no heel drops below the step) early — it compresses the insertion.",
   add:[{p:1,n:"Isometric calf hold (foot flat)",d:"5×30–45s",c:"Don't drop below level"},
        {p:2,n:"Heavy-slow calf raise (floor, limited range)",d:"3×12",c:"Don't drop the heel below the step",tags:["weight_bearing"]},
        {p:4,n:"Return-to-run / spring progression",d:"walk-run",c:"When single-leg raises are strong",tags:["impact"]}]},
  {re:/achilles tendinop|achilles.*midportion|achilles paratenon/,
   focus:"Load the Achilles progressively — isometrics, then heavy-slow calf raises (double then single), then energy-storage/plyometric work.",
   add:[{p:1,n:"Isometric calf hold",d:"5×30–45s",c:"Mid-range, two feet"},
        {p:2,n:"Heavy-slow double-leg calf raise",d:"3×12 (3s down)",c:"Full range, slow",tags:["weight_bearing"]},
        {p:3,n:"Single-leg heavy calf raise / heel drop",d:"3×12",c:"Slow lower below level",tags:["weight_bearing","balance"]},
        {p:4,n:"Pogo hops / skipping",d:"3×20s",c:"Light, rhythmic",tags:["impact"]}]},
  {re:/plantar fascii|plantar fascia|plantar heel|heel fat pad/,
   focus:"Load the plantar fascia and calf — high-load resistance with the toes extended, plus calf and foot-intrinsic strengthening; a morning stretch helps.",
   add:[{p:1,n:"Plantar fascia & calf stretch",d:"3×30s",c:"Gentle, especially in the morning"},
        {p:2,n:"High-load calf raise (towel under the toes)",d:"3×12 (3s)",c:"Toes propped up on a rolled towel",tags:["weight_bearing"]},
        {p:2,n:"Foot-intrinsic (short-foot) work",d:"3×10",c:"Dome the arch"}]},
  {re:/posterior tibial|tibialis posterior tendinop|flatfoot|pes planus/,
   focus:"Strengthen tibialis posterior and support the arch — resisted inversion and calf raises; consider arch support.",
   add:[{p:1,n:"Resisted inversion (band)",d:"3×15",c:"Turn the sole inward"},
        {p:2,n:"Heel raises with arch control",d:"3×12",c:"Keep the arch lifted",tags:["weight_bearing"]}]},
  {re:/flexion-intolerant|disc (herniation|bulge|protrusion|extrusion)|lumbar disc|radiculopathy at l|\bsciatica\b/,
   focus:"Favour extension-biased movement and avoid loaded/repeated bending early; find your directional preference and keep walking.",
   add:[{p:1,n:"Prone press-ups (extension in lying)",d:"3×10",c:"Only if it centralises symptoms",tags:["spine_extension","prone"]},
        {p:1,n:"Frequent short walks",d:"5–10 min ×2/day",c:"Easy pace",tags:["aerobic"]},
        {p:2,n:"Sciatic nerve glides",d:"3×10",c:"Gentle — don't provoke leg symptoms"},
        {p:3,n:"Hip hinge / dead-bug core",d:"3×10",c:"Keep the spine neutral"}]},
  {re:/extension-intolerant|stenosis|spondylolisth|spondylolysis|\bpars\b/,
   focus:"Favour flexion-biased movement and core control; avoid repeated/loaded extension early.",
   add:[{p:1,n:"Knee-to-chest / flexion in lying",d:"3×20s",c:"Gentle — eases symptoms",tags:["deep_hip_flexion"]},
        {p:2,n:"Dead-bug & bird-dog core control",d:"3×10",c:"Keep the low back still"},
        {p:3,n:"Hip hinge with a neutral spine",d:"3×10",c:"Avoid arching the back"}]},
  {re:/non-specific low back|lumbar strain|low back pain|lumbar multifidus|erector spinae strain|degenerative disc|lumbar spondylosis|\bspondylosis\b|mechanical (low )?back/,
   focus:"Stay active and rebuild core and hip control — the 'big-3' plus hip hinge; movement is the medicine.",
   add:[{p:1,n:"Pelvic tilts & cat–camel",d:"3×10",c:"Gentle motion, breathe"},
        {p:2,n:"McGill big-3 (curl-up, side plank, bird-dog)",d:"3×8 each",c:"Brace; keep the spine neutral"},
        {p:3,n:"Hip hinge / loaded carry",d:"3×10",c:"Neutral spine; progress load",tags:["grip_isometric"]}]},
  {re:/sacroiliac|si joint|pelvic girdle|pubic symphysis/,
   focus:"Improve pelvic control and glute strength; avoid heavy asymmetric/single-leg loading early.",
   add:[{p:1,n:"Glute bridges & isometric adduction",d:"3×12",c:"Squeeze evenly"},
        {p:3,n:"Split squat / step control (progressive)",d:"3×10",c:"Keep the pelvis level",tags:["weight_bearing","balance"]}]},
  {re:/whiplash|neck strain|cervical radiculopathy|\bwad\b|text neck/,
   focus:"Restore gentle motion early and build deep-neck-flexor and scapular endurance; don't hold one posture too long.",
   add:[{p:1,n:"Chin tucks (deep neck flexor)",d:"3×10 (5s)",c:"Gentle nod; lengthen the neck"},
        {p:1,n:"Gentle pain-free neck ROM",d:"3×8",c:"All directions, within comfort",tags:["end_range_neck"]},
        {p:2,n:"Scapular rows & band pull-aparts",d:"3×15",c:"Squeeze the mid-back"}]},
  {re:/cervicogenic headache|tension-type headache|occipital neuralgia/,
   focus:"Target the upper neck and posture — deep-neck-flexor control, upper-trap release, and thoracic mobility.",
   add:[{p:1,n:"Deep neck flexor holds",d:"3×10s",c:"Chin tuck + gentle hold"},
        {p:2,n:"Thoracic extension mobility",d:"3×10",c:"Open the upper back",tags:["spine_extension"]}]},
  {re:/hamstring (strain|tear)|sprinter'?s hamstring/,
   focus:"Rebuild hamstring length and eccentric strength — the eccentric (lengthening) work is what protects against re-injury.",
   add:[{p:1,n:"Isometric hamstring holds",d:"5×20s",c:"Gentle press, no pain"},
        {p:3,n:"Nordic hamstring (assisted → full)",d:"3×6",c:"Resist the lowering"},
        {p:4,n:"Accelerations / strides",d:"6×40m",c:"Build to 80–90%",tags:["impact"]}]},
  {re:/calf (strain|tear)|gastrocnemius (strain|tear)|tennis leg/,
   focus:"Rebuild calf strength and load tolerance — isometrics then progressive calf raises and return to running.",
   add:[{p:1,n:"Isometric calf hold",d:"5×30s",c:"Two feet, mid-range"},
        {p:3,n:"Single-leg calf raises",d:"3×12",c:"Full range, slow lower",tags:["weight_bearing"]}]},
  // ---- osteoarthritis (very common; loading is the treatment, not rest) ----
  {re:/knee osteoarthritis|\bknee\b[^.]*\boa\b|gonarthrosis|tricompartmental|tibiofemoral (oa|arthritis)/,
   focus:"Knee OA responds to LOADING, not rest — build quadriceps and hip strength, keep the joint moving every day, and manage body weight. Some ache with exercise (up to ~3–4/10) is normal and safe.",
   add:[{p:1,n:"Quad sets & straight-leg raises",d:"3×10",c:"Strengthen the quad without loading the joint"},
        {p:1,n:"Stationary cycling (light)",d:"10–15 min",c:"Nourishes and mobilises the joint",tags:["aerobic"]},
        {p:2,n:"Mini squats & sit-to-stands",d:"3×10",c:"Mild ache is OK and settles",tags:["weight_bearing"]},
        {p:3,n:"Step-ups & progressive leg strengthening",d:"3×10",c:"Load builds tolerance over weeks",tags:["weight_bearing","balance"]}]},
  {re:/hip osteoarthritis|\bhip\b[^.]*\boa\b|coxarthrosis/,
   focus:"Hip OA improves with strength and movement — strengthen the glutes, keep the hip mobile, and stay active; prolonged rest stiffens it.",
   add:[{p:1,n:"Glute bridges & clamshells",d:"3×12",c:"Wake up the hip stabilisers"},
        {p:1,n:"Gentle hip mobility (comfortable range)",d:"3×10",c:"Move to a comfortable end range"},
        {p:2,n:"Sit-to-stands & mini squats",d:"3×10",c:"Functional strength; mild ache is fine",tags:["weight_bearing"]},
        {p:3,n:"Standing hip abduction & step-ups",d:"3×12",c:"Build load tolerance",tags:["weight_bearing","balance"]}]},
  {re:/(shoulder|glenohumeral) (osteoarthritis|oa|arthritis)|ac joint (oa|arthritis)/,
   focus:"Shoulder OA: keep the joint moving through a comfortable range and gently strengthen the cuff and shoulder-blade muscles — avoid painful end-range loading.",
   add:[{p:1,n:"Pendulum & assisted range of motion",d:"3×10",c:"Gentle, pain-free"},
        {p:2,n:"Isometric cuff & scapular setting",d:"3×10s",c:"Build support without provoking pain"},
        {p:3,n:"Light band rotator-cuff strengthening",d:"3×15",c:"Stay in a comfortable range"}]},
  {re:/(hand|thumb|finger) (osteoarthritis|oa|arthritis)|thumb (cmc|carpometacarpal)|basal thumb|heberden|bouchard/,
   focus:"Hand/thumb OA: gentle range plus grip and pinch strengthening, with joint protection — use larger grips and avoid sustained hard pinching to offload the joints.",
   add:[{p:1,n:"Gentle finger & thumb range of motion",d:"3×10",c:"Move through a comfortable range"},
        {p:2,n:"Light putty grip & pinch",d:"3×10",c:"Build strength; keep it pain-free",tags:["grip_isometric"]},
        {p:2,n:"Thumb opposition & tendon glides",d:"3×10",c:"Maintain dexterity"}]},
  // ---- shoulder (beyond cuff/frozen/impingement/instability) ----
  {re:/ac joint (sprain|separation|injury)|acromioclavicular|shoulder separation/,
   focus:"AC joint injury: protect it early, then rebuild shoulder-blade and cuff control — avoid heavy overhead and cross-body loading until it settles.",
   add:[{p:1,n:"Scapular setting & pendulums",d:"3×10",c:"Gentle, pain-free"},
        {p:2,n:"Low rows & scapular strengthening",d:"3×12",c:"Squeeze the mid-back"},
        {p:3,n:"Progressive pressing (limit deep cross-body)",d:"3×10",c:"Rebuild load tolerance",tags:["overhead"]}]},
  {re:/biceps tendinop|bicipital|long head.*biceps|biceps tendinitis/,
   focus:"Biceps (long-head) tendinopathy: settle the irritable tendon, then load it progressively — isometrics first; limit provocative overhead and heavy curling early.",
   add:[{p:1,n:"Biceps isometric holds (elbow at side)",d:"5×30s",c:"Sub-maximal, pain-easing",tags:["grip_isometric"]},
        {p:2,n:"Cuff & scapular control",d:"3×15",c:"Support the shoulder"},
        {p:3,n:"Progressive curls & controlled loading",d:"3×12",c:"Add load weekly"}]},
  {re:/\bslap\b|superior labr|glenoid labr|shoulder labral/,
   focus:"Shoulder labral/SLAP: rebuild cuff and shoulder-blade stability and control — avoid end-range overhead and behind-the-body loading early (the provocative positions).",
   add:[{p:1,n:"Rhythmic stabilisation & scapular setting",d:"3×20s",c:"Gentle co-contraction"},
        {p:2,n:"Cuff strengthening (mid-range)",d:"3×15",c:"Stay out of provocative positions"},
        {p:3,n:"Controlled overhead progression",d:"3×10",c:"Only when stable and pain-free",tags:["overhead"]}]},
  {re:/scapular dyskinesis|scapular winging|serratus anterior (dysfunction|weakness)|levator scapulae|\bgird\b|internal rotation deficit|overhead athlete/,
   focus:"Scapular control (dyskinesis/winging/overhead athlete): restore shoulder-blade positioning and timing, strengthen serratus and lower trap, and mobilise the thoracic spine.",
   add:[{p:1,n:"Scapular setting & wall slides",d:"3×10",c:"Blade back and down, then up the wall",tags:["overhead"]},
        {p:2,n:"Serratus punches & lower-trap (Y) raises",d:"3×12",c:"Protract then set the blade",tags:["prone","overhead"]},
        {p:3,n:"Thoracic mobility & overhead control",d:"3×10",c:"Open the mid-back; control elevation",tags:["overhead"]}]},
  {re:/(total|reverse total) shoulder (replacement|arthroplasty)|shoulder arthroplasty|\blatarjet\b/,
   focus:"Shoulder replacement/stabilisation surgery: follow your surgeon's ROM and precaution timeline — early protected motion, then progressive cuff/deltoid strengthening. Avoid the restricted positions your surgeon named.",
   add:[{p:1,n:"Passive/assisted range within precautions",d:"3×10",c:"Only to your allowed limits"},
        {p:2,n:"Isometric deltoid & scapular setting",d:"3×10s",c:"Gentle activation"},
        {p:3,n:"Progressive band strengthening",d:"3×15",c:"Once cleared; stay pain-free",tags:["overhead"]}]},
  {re:/subacromial burs|shoulder burs|bursitis.*shoulder/,
   focus:"Shoulder bursitis: calm the irritation and restore shoulder-blade control — avoid the painful overhead arc and repetitive elevation until it settles.",
   add:[{p:1,n:"Scapular setting & pain-free range",d:"3×10",c:"Avoid the painful arc"},
        {p:2,n:"Band external rotation & rows",d:"3×15",c:"Create space, control the blade"},
        {p:3,n:"Full-can raise below shoulder",d:"3×12",c:"Progress elevation gradually",tags:["overhead"]}]},
  // ---- elbow / forearm ----
  {re:/cubital tunnel|ulnar (nerve|neuropathy|entrapment)/,
   focus:"Cubital tunnel (ulnar nerve at the elbow): reduce sustained elbow bending and pressure and use nerve glides — avoid leaning on the elbow and prolonged full flexion.",
   add:[{p:1,n:"Ulnar nerve glides (gentle)",d:"3×10",c:"Stop before tingling increases"},
        {p:2,n:"Grip & forearm strengthening (elbow neutral)",d:"3×12",c:"Avoid full elbow bend",tags:["grip_isometric"]}]},
  {re:/radial tunnel|posterior interosseous|pronator( teres)? syndrome|anterior interosseous|\bpin\b syndrome/,
   focus:"Forearm nerve entrapment (radial tunnel / PIN / pronator / AIN): reduce repetitive forceful gripping and forearm rotation, use nerve glides, and strengthen in a neutral position — avoid provocative sustained postures.",
   add:[{p:1,n:"Radial/median nerve glides (gentle)",d:"3×10",c:"Stop before symptoms increase"},
        {p:2,n:"Grip & forearm strengthening (neutral)",d:"3×12",c:"Avoid provocative positions",tags:["grip_isometric"]}]},
  {re:/distal biceps|triceps tendinop|triceps tendinitis/,
   focus:"Elbow biceps/triceps tendinopathy: progressive isometric then eccentric loading of the affected tendon; cut provocative repetitive loading early.",
   add:[{p:1,n:"Isometric elbow flexion/extension hold",d:"5×30s",c:"Sub-maximal, pain-easing"},
        {p:2,n:"Eccentric elbow loading",d:"3×12",c:"Slow lowering"},
        {p:3,n:"Progressive resistance",d:"3×10",c:"Add load weekly"}]},
  {re:/olecranon burs|elbow burs/,
   focus:"Elbow bursitis: avoid pressure and leaning on the elbow, keep gentle range, and progress strength as swelling settles.",
   add:[{p:1,n:"Gentle elbow range of motion",d:"3×10",c:"Comfortable range, no pressure"},
        {p:2,n:"Light grip & forearm work",d:"3×12",c:"Avoid direct pressure",tags:["grip_isometric"]}]},
  {re:/elbow (sprain|dislocation|instability)|elbow ligament/,
   focus:"Elbow sprain/dislocation: restore motion gradually (especially straightening) and rebuild strength — avoid side-to-side (valgus/varus) stress and forced end-range extension early.",
   add:[{p:1,n:"Active-assisted elbow flexion/extension",d:"3×10",c:"Regain motion gently"},
        {p:2,n:"Grip & isometric elbow strengthening",d:"3×12",c:"Build stability",tags:["grip_isometric"]},
        {p:3,n:"Progressive loading (avoid end-range stress)",d:"3×10",c:"Controlled"}]},
  // ---- wrist / hand ----
  {re:/wrist (sprain|instability)|\btfcc\b|triangular fibrocartilage|scapholunate/,
   focus:"Wrist sprain/TFCC: protect early, then restore motion and grip — avoid forceful rotation and weight-bearing through the hand on the little-finger side until it settles.",
   add:[{p:1,n:"Pain-free wrist range of motion",d:"3×15",c:"Gentle, all directions"},
        {p:2,n:"Isometric wrist holds",d:"5×20s",c:"Build support",tags:["grip_isometric"]},
        {p:3,n:"Progressive grip & loading",d:"3×12",c:"Avoid forced rotation",tags:["grip_isometric"]}]},
  {re:/trigger finger|stenosing tenosynovitis|trigger thumb/,
   focus:"Trigger finger: gentle tendon gliding and easing off repetitive forceful gripping — keep the finger moving through smooth range.",
   add:[{p:1,n:"Tendon-gliding sequence",d:"3×10",c:"Smooth, full range"},
        {p:2,n:"Gentle grip strengthening (avoid triggering)",d:"3×10",c:"Light, pain-free",tags:["grip_isometric"]}]},
  // ---- hip / thigh ----
  {re:/piriformis|deep gluteal syndrome/,
   focus:"Piriformis/deep gluteal syndrome: strengthen the hip and glutes, mobilise gently, and calm the nerve — avoid prolonged sitting and aggressive deep stretching.",
   add:[{p:1,n:"Gentle piriformis & glute stretch",d:"3×30s",c:"Mild, non-provocative"},
        {p:2,n:"Glute & hip strengthening (bridges, abduction)",d:"3×12",c:"Build support"},
        {p:3,n:"Sciatic nerve glides",d:"3×10",c:"Gentle — don't provoke leg symptoms"}]},
  {re:/hip flexor (strain|tendinop)|iliopsoas|psoas strain/,
   focus:"Hip flexor strain: settle it, then progressively load the hip flexors and core — avoid explosive hip flexion and over-stretching early.",
   add:[{p:1,n:"Isometric hip-flexor holds",d:"5×20s",c:"Gentle, pain-free"},
        {p:2,n:"Controlled hip-flexor & core strengthening",d:"3×12",c:"Build tolerance"},
        {p:3,n:"Progressive marching / leg-raise loading",d:"3×12",c:"Add speed/load gradually"}]},
  {re:/snapping hip|coxa saltans|dancer'?s hip/,
   focus:"Snapping hip: usually harmless — reduce provocative repetitive hip movement, strengthen the hip and core, and stretch the tight structures (IT band/hip flexors).",
   add:[{p:1,n:"Hip flexor & IT-band stretch",d:"3×30s",c:"Gentle"},
        {p:2,n:"Glute & core strengthening",d:"3×12",c:"Improve control"}]},
  // ---- knee (beyond ligament/PF/meniscus/tendon) ----
  {re:/(prepatellar|pes anserine|infrapatellar) burs|housemaid'?s knee|knee bursitis/,
   focus:"Knee bursitis: reduce direct pressure and irritation, keep gentle range, and strengthen the quads/hips as swelling settles.",
   add:[{p:1,n:"Quad sets & gentle range",d:"3×10",c:"Avoid kneeling/pressure"},
        {p:2,n:"Straight-leg raises & hip strengthening",d:"3×12",c:"Offload the joint"}]},
  {re:/osgood|schlatter|sinding-larsen|tibial tubercle apophys/,
   focus:"Osgood-Schlatter (growth-plate traction at the knee): manage load and stretch/strengthen the quads and hips — cut jumping/running volume during flares; it settles with maturity.",
   add:[{p:1,n:"Quad & hamstring stretch",d:"3×30s",c:"Gentle, daily"},
        {p:2,n:"Isometric quad & hip strengthening",d:"3×12",c:"Manage load",tags:["weight_bearing"]},
        {p:3,n:"Gradual return to running/jumping",d:"progressive",c:"As pain allows",tags:["impact"]}]},
  {re:/plica syndrome|medial plica/,
   focus:"Knee plica: reduce irritating repetitive bending, strengthen the quads (especially the inner quad) and hips, and improve kneecap tracking.",
   add:[{p:1,n:"Quad sets & straight-leg raises",d:"3×12",c:"Pain-free"},
        {p:2,n:"Hip & quad strengthening",d:"3×12",c:"Improve tracking",tags:["weight_bearing"]}]},
  {re:/quadriceps (strain|tear)|rectus femoris (strain|tear)|thigh contusion|thigh strain/,
   focus:"Quadriceps strain: after the protective phase, progressive loading with eccentric emphasis rebuilds strength; return to sprinting/kicking gradually.",
   add:[{p:1,n:"Isometric quad holds",d:"5×20s",c:"Pain-free"},
        {p:3,n:"Eccentric quad & controlled loading",d:"3×10",c:"Slow lowering",tags:["weight_bearing"]}]},
  // ---- foot (beyond plantar fascia / posterior tibial / Achilles) ----
  {re:/metatarsalgia|morton'?s neuroma|interdigital neuroma|forefoot pain/,
   focus:"Metatarsalgia/Morton's neuroma: offload the forefoot (footwear, metatarsal pads), strengthen the foot intrinsics and calf, and cut high-impact forefoot loading.",
   add:[{p:1,n:"Foot-intrinsic (short-foot) & toe work",d:"3×10",c:"Build arch/forefoot control"},
        {p:2,n:"Calf & foot strengthening",d:"3×12",c:"Support the forefoot",tags:["weight_bearing"]}]},
  {re:/hallux (valgus|rigidus|limitus)|bunion|first mtp (oa|arthritis)/,
   focus:"Big-toe conditions (bunion/stiff big toe): strengthen the foot and big-toe muscles, mobilise the joint gently, and use supportive footwear/spacers; avoid painful forced push-off.",
   add:[{p:1,n:"Big-toe mobility & short-foot exercise",d:"3×10",c:"Gentle range and arch control"},
        {p:2,n:"Toe & calf strengthening",d:"3×12",c:"Support push-off",tags:["weight_bearing"]}]},
  {re:/tarsal tunnel|posterior tibial nerve/,
   focus:"Tarsal tunnel (nerve at the inner ankle): nerve glides, arch support and calf/foot strengthening — avoid prolonged standing and overpronation.",
   add:[{p:1,n:"Tibial nerve glides (gentle)",d:"3×10",c:"Stop before symptoms increase"},
        {p:2,n:"Arch & calf strengthening",d:"3×12",c:"Support the arch",tags:["weight_bearing"]}]},
  {re:/turf toe|sesamoid|first mtp sprain/,
   focus:"Turf toe/sesamoiditis: protect and offload the big-toe joint, then restore strength and push-off gradually — a stiff-soled shoe helps.",
   add:[{p:1,n:"Gentle big-toe range (pain-free)",d:"3×10",c:"Avoid forced extension"},
        {p:2,n:"Foot-intrinsic & calf strengthening",d:"3×12",c:"Rebuild push-off",tags:["weight_bearing"]}]},
  {re:/stress fracture|stress reaction|bone stress injury/,
   focus:"Stress fracture: this is a BONE overload injury — respect the offloading/rest period, rebuild impact VERY gradually, and address training errors and bone health/nutrition.",
   add:[{p:1,n:"Pain-free non-impact conditioning",d:"as able",c:"Protect the bone; keep fitness up",tags:["aerobic"]},
        {p:3,n:"Graded return-to-impact loading",d:"progressive",c:"Only once pain-free; slow build",tags:["impact","weight_bearing"]}]},
  // ---- spine (beyond disc / stenosis / non-specific / SI) ----
  {re:/facet (joint|syndrome|arthropathy)|zygapophyseal/,
   focus:"Facet joint pain: often eased by gentle flexion and core control — reduce repeated loaded extension and rotation early, and strengthen the trunk and hips.",
   add:[{p:1,n:"Gentle flexion-biased mobility",d:"3×10",c:"Often eases facet symptoms",tags:["deep_hip_flexion"]},
        {p:2,n:"Core & hip strengthening",d:"3×10",c:"Support the spine"},
        {p:3,n:"Neutral-spine loading",d:"3×10",c:"Avoid loaded extension"}]},
  {re:/coccydynia|coccyx|tailbone/,
   focus:"Coccyx pain: offload sitting (use a cushion), gentle pelvic and hip mobility, and avoid prolonged direct pressure.",
   add:[{p:1,n:"Pelvic tilts & gentle mobility",d:"3×10",c:"Ease pressure"},
        {p:2,n:"Hip & core strengthening",d:"3×10",c:"Support the pelvis"}]},
  {re:/thoracic (pain|strain|dysfunction)|rib (dysfunction|sprain)|costovertebral|costochondritis/,
   focus:"Thoracic/rib pain: restore mid-back mobility and posture, strengthen the shoulder-blade muscles, and breathe fully — avoid sustained slumped postures.",
   add:[{p:1,n:"Thoracic mobility (cat-camel, open-book)",d:"3×10",c:"Restore mid-back motion"},
        {p:2,n:"Scapular & postural strengthening",d:"3×12",c:"Support upright posture"}]},
  // ---- wrist / hand (specific) ----
  {re:/kienb|preiser|carpal (avn|osteonecrosis|avascular)|lunate (avn|osteonecrosis)|scaphoid (avn|osteonecrosis)/,
   focus:"Carpal avascular necrosis (Kienböck's/Preiser): protect the wrist and load VERY gradually — gentle pain-free motion and grip within comfort, avoid heavy axial loading and impact on the hand.",
   add:[{p:1,n:"Pain-free wrist range of motion",d:"3×10",c:"Gentle, all directions"},
        {p:2,n:"Light grip & forearm isometrics",d:"3×12",c:"Avoid heavy axial loading",tags:["grip_isometric"]}]},
  {re:/mallet finger|extensor tendon (repair|injury|avulsion)|drop finger/,
   focus:"Mallet finger (extensor tendon at the fingertip): the DIP joint must stay splinted straight continuously for the healing period — then regain motion gradually; don't let the tip drop during healing.",
   add:[{p:1,n:"Keep DIP splinted; move the other finger joints",d:"3×10",c:"Never let the fingertip bend while healing"},
        {p:3,n:"Gradual DIP flexion & tendon glides (after splinting)",d:"3×10",c:"Once cleared; regain motion slowly"}]},
  {re:/(skier'?s|gamekeeper'?s) thumb|thumb ucl|ulnar collateral.*thumb|thumb collateral ligament/,
   focus:"Skier's/gamekeeper's thumb (thumb UCL): protect the thumb from sideways stress early, then rebuild pinch and grip — avoid forceful pinching and side-stress until stable.",
   add:[{p:1,n:"Protected thumb & wrist range of motion",d:"3×10",c:"Avoid side-to-side thumb stress"},
        {p:2,n:"Progressive pinch & grip strengthening",d:"3×12",c:"Build once stable and pain-free",tags:["grip_isometric"]}]},
  {re:/boutonni|swan-?neck|central slip|sagittal band|pip (contracture|deformity)|finger (deformity|contracture)/,
   focus:"Finger tendon-balance injuries (boutonnière/swan-neck/central slip): targeted splinting and controlled tendon-gliding restore the finger's balance — follow the specific splint/exercise pattern for your injury.",
   add:[{p:1,n:"Prescribed splinting + isolated joint blocking",d:"3×10",c:"Follow your hand-therapy pattern"},
        {p:2,n:"Graded tendon-gliding sequence",d:"3×10",c:"Smooth, controlled range"}]},
  {re:/jersey finger|flexor tendon (repair|injury|avulsion)|fdp avulsion/,
   focus:"Flexor tendon injury/repair (jersey finger): the repaired flexor tendon is protected in a splint with a carefully graded early-motion protocol — do not grip forcefully until cleared.",
   add:[{p:1,n:"Protected place-and-hold / passive flexion",d:"3×10",c:"Only your therapist's early-motion protocol"},
        {p:3,n:"Graded active flexion & grip (once cleared)",d:"3×10",c:"Build very gradually",tags:["grip_isometric"]}]},
  {re:/dupuytren/,
   focus:"Dupuytren's (after release/needling): regain finger extension and manage the scar — stretch into extension, glide the tendons, and splint as prescribed to prevent recurrence.",
   add:[{p:1,n:"Finger extension stretch & scar massage",d:"3×30s",c:"Ease into full extension"},
        {p:2,n:"Tendon glides & grip",d:"3×10",c:"Restore function",tags:["grip_isometric"]}]},
  {re:/ganglion/,
   focus:"Ganglion cyst: usually harmless — maintain wrist/hand motion and grip and reduce provocative repetitive loading; most settle without limiting exercise.",
   add:[{p:1,n:"Wrist & hand range of motion",d:"3×12",c:"Keep it moving"},
        {p:2,n:"Grip strengthening (comfortable)",d:"3×12",c:"Pain-free",tags:["grip_isometric"]}]},
  {re:/guyon'?s canal|ulnar (nerve|neuropathy).*(wrist|hand)|wartenberg|handlebar palsy|superficial radial nerve/,
   focus:"Wrist-level nerve entrapment (Guyon's canal/handlebar palsy/radial sensory): offload the pressure point, use nerve glides, and strengthen grip in neutral — avoid prolonged pressure and extreme wrist positions.",
   add:[{p:1,n:"Nerve glides (gentle)",d:"3×10",c:"Stop before symptoms increase"},
        {p:2,n:"Grip strengthening (wrist neutral)",d:"3×12",c:"Avoid pressure on the nerve",tags:["grip_isometric"]}]},
  {re:/intersection syndrome|\becu\b|extensor carpi ulnaris|hamate|wrist tendinop|wrist stiffness|druj|ulnar impaction/,
   focus:"Wrist tendinopathy/stiffness (intersection/ECU/post-cast/DRUJ): restore motion and progressively load the wrist tendons — isometrics first, then controlled strengthening; limit provocative repetitive gripping/rotation early.",
   add:[{p:1,n:"Pain-free wrist range & isometric holds",d:"3×15",c:"Gentle, then hold",tags:["grip_isometric"]},
        {p:2,n:"Progressive wrist & grip loading",d:"3×12",c:"Add load weekly",tags:["grip_isometric"]}]},
  // ---- foot / ankle (specific) ----
  {re:/(hammer|claw|mallet) toe|lesser toe deformity|toe (contracture|deformity)/,
   focus:"Toe deformities (hammer/claw/mallet toe): strengthen the foot intrinsics and toe muscles, mobilise the toes, and use roomy footwear/toe props — keep the toes moving to limit stiffening.",
   add:[{p:1,n:"Toe mobility & short-foot exercise",d:"3×10",c:"Move and straighten the toes"},
        {p:2,n:"Foot-intrinsic & toe strengthening",d:"3×12",c:"Support the toes",tags:["weight_bearing"]}]},
  {re:/plantar plate|turf toe.*plate|2nd mtp instability/,
   focus:"Plantar plate injury: offload and protect the forefoot (taping, stiff sole), then restore toe control and calf/foot strength — avoid forced toe extension and high forefoot impact early.",
   add:[{p:1,n:"Protected toe range (avoid forced extension)",d:"3×10",c:"Gentle, taped/stiff sole"},
        {p:2,n:"Foot-intrinsic & calf strengthening",d:"3×12",c:"Rebuild forefoot control",tags:["weight_bearing"]}]},
  {re:/lisfranc|tarsometatarsal (injury|sprain)|midfoot (sprain|injury)/,
   focus:"Lisfranc/midfoot injury: protect the midfoot and follow your weight-bearing timeline strictly, then progressively restore strength and loading — this joint needs patient, graded return.",
   add:[{p:1,n:"Pain-free ankle/toe motion (offloaded)",d:"3×10",c:"Within your weight-bearing order"},
        {p:3,n:"Graded midfoot loading & calf strengthening",d:"3×12",c:"Slow, progressive",tags:["weight_bearing"]}]},
  {re:/peroneal (tendinop|tendon|tear|subluxation)|fibularis (tendinop|tendon)/,
   focus:"Peroneal (fibularis) tendinopathy: progressive eversion strengthening and balance work, and address ankle stability — limit provocative side-loading and unstable surfaces early.",
   add:[{p:1,n:"Resisted eversion (band)",d:"3×15",c:"Turn the sole outward, controlled"},
        {p:2,n:"Calf & single-leg balance",d:"3×30s",c:"Build ankle stability",tags:["weight_bearing","balance"]}]},
  {re:/tarsal coalition|freiberg|accessory navicular|cuboid syndrome|pes cavus|cavus foot|plantar fibromatosis|haglund|sinus tarsi|subtalar (instability|impingement)|spring ligament|(anterolateral|posterior) ankle impingement/,
   focus:"Structural / impingement foot & ankle conditions (coalition, Freiberg, accessory navicular, cuboid, cavus, Haglund, sinus tarsi, ankle impingement): work within a comfortable range, strengthen the foot, calf and ankle stabilisers, and use footwear/orthoses to offload the sore area.",
   add:[{p:1,n:"Pain-free foot & ankle range of motion",d:"3×10",c:"Comfortable range"},
        {p:2,n:"Foot-intrinsic & calf strengthening",d:"3×12",c:"Support and offload the area",tags:["weight_bearing"]}]},
  {re:/flexor hallucis longus|\bfhl\b|dancer'?s (tendinopathy|ankle)|os trigonum/,
   focus:"Posterior ankle / FHL (dancer's) conditions: settle the irritable posterior ankle, then progressively load the calf and big-toe flexor — avoid forced pointing (plantarflexion) end-range early.",
   add:[{p:1,n:"Pain-free ankle & big-toe motion",d:"3×10",c:"Avoid forced pointing"},
        {p:2,n:"Calf & big-toe flexor strengthening",d:"3×12",c:"Progressive",tags:["weight_bearing"]}]},
  // ---- systemic / whole-body (specific) ----
  {re:/fibromyalgia|chronic widespread pain|central sensiti|chronic fatigue|\bme\/cfs\b|myalgic encephal/,
   focus:"Fibromyalgia / chronic widespread pain: gentle, graded aerobic and strengthening exercise with careful PACING is the best-evidenced treatment — start low, go slow, and avoid boom-and-bust. Flares are normal and safe.",
   add:[{p:1,n:"Gentle paced walking or pool work",d:"5–10 min",c:"Little and often; stay below a flare",tags:["aerobic"]},
        {p:2,n:"Light whole-body strengthening",d:"2–3×10",c:"Very gradual progression"},
        {p:3,n:"Graded aerobic conditioning",d:"15–20 min",c:"Build minutes slowly over weeks",tags:["aerobic"]}]},
  {re:/complex regional pain|\bcrps\b|reflex sympathetic dystrophy/,
   focus:"Complex regional pain syndrome (CRPS): gentle graded movement, desensitisation and (where used) graded motor imagery/mirror therapy — keep the limb moving gently; avoid aggressive painful loading.",
   add:[{p:1,n:"Desensitisation & gentle active movement",d:"several × day",c:"Little and often, stay calm"},
        {p:2,n:"Graded functional loading",d:"3×10",c:"Progress within tolerance"}]},
  {re:/hypermobility|\behlers|joint hypermobility|marfan/,
   focus:"Joint hypermobility (incl. hEDS): strength, control and proprioception protect the joints — favour controlled mid-range strengthening and stability over stretching, and progress load steadily.",
   add:[{p:1,n:"Mid-range isometric & control drills",d:"3×10",c:"Control, not end-range stretch"},
        {p:2,n:"Progressive strengthening & proprioception",d:"3×12",c:"Build stability",tags:["balance"]}]},
  // ---- paediatric (0–18 yr): keep the injury→exercise correlation for children ----
  {re:/cerebral palsy|spastic diplegia|spastic hemipleg|spastic quadripleg|\bgmfcs\b/,
   focus:"Cerebral palsy: stretch tight muscles, strengthen, and practise the actual functional skills (sitting, standing, walking, transfers) — little and often with the therapy team, and manage spasticity so movement is easier. Keep it play-based and fun.",
   add:[{p:1,n:"Gentle stretching of tight muscles (calf, hamstring, hip)",d:"2–3×30s",c:"Slow, gentle holds; a parent/therapist assists"},
        {p:2,n:"Functional strengthening & motor practice (sit-to-stand, reaching)",d:"play-based",c:"Practise the movements the child needs, often",tags:["weight_bearing"]},
        {p:3,n:"Balance, standing & gait practice near support",d:"play-based",c:"Progress with support as tolerated",tags:["balance","weight_bearing"]}]},
  {re:/clubfoot|\btalipes\b|congenital talipes equinovarus|\bctev\b/,
   focus:"Clubfoot (talipes): after Ponseti casting, wearing the foot-abduction brace (boots-and-bar) for the prescribed hours PREVENTS relapse — that's the priority, plus gentle stretches and later foot/ankle strengthening and walking practice.",
   add:[{p:1,n:"Wear the foot-abduction brace (boots-and-bar) exactly as prescribed",d:"prescribed hours",c:"This prevents relapse — the key to success"},
        {p:2,n:"Gentle foot & ankle stretches",d:"3×30s",c:"As taught by the physio"},
        {p:3,n:"Foot & calf strengthening / walking practice",d:"play-based",c:"Once walking; build foot control",tags:["weight_bearing"]}]},
  {re:/hip dysplasia|developmental dysplasia|\bddh\b|acetabular dysplasia/,
   focus:"Developmental hip dysplasia (DDH): the harness/brace or cast holds the hip in position while it develops — keep it on exactly as prescribed; later, gentle hip motion and strengthening with crawling/walking practice as the team allows.",
   add:[{p:1,n:"Wear the hip harness/brace (or cast) exactly as prescribed",d:"prescribed",c:"Keeps the hip seated while it develops"},
        {p:2,n:"Gentle hip range of motion (within the team's limits)",d:"3×10",c:"Only as allowed"},
        {p:3,n:"Hip & leg strengthening / crawling & walking practice",d:"play-based",c:"Rebuild strength and function",tags:["weight_bearing","balance"]}]},
  {re:/juvenile idiopathic arthritis|juvenile arthritis|\bjia\b|juvenile rheumatoid|still'?s disease/,
   focus:"Juvenile arthritis (JIA): gentle daily range-of-motion and low-impact play keep joints mobile and strong — do less during a flare and build back gradually; swimming and cycling are ideal. Coordinate with the rheumatology team.",
   add:[{p:1,n:"Gentle range of motion for affected joints",d:"play-based",c:"Ease off during a flare"},
        {p:2,n:"Low-impact strengthening & swimming/cycling play",d:"play-based",c:"Little and often; protect the joints",tags:["aerobic"]},
        {p:3,n:"Progressive activity & school-PE reintegration",d:"graded",c:"Build up as symptoms allow"}]},
  {re:/sever'?s|calcaneal apophysitis|iselin|traction apophysitis|\bapophysitis\b/,
   focus:"Growth-plate traction injury (apophysitis — e.g. Sever's heel, Iselin): manage load, stretch and gently strengthen the pulling muscle, and cut running/jumping volume during flares — it settles as the growth plate matures.",
   add:[{p:1,n:"Stretch the attached muscle (e.g. calf for Sever's)",d:"3×30s",c:"Gentle, daily"},
        {p:2,n:"Isometric & gentle strengthening",d:"3×12",c:"Manage load",tags:["weight_bearing"]},
        {p:3,n:"Graded return to running/jumping",d:"progressive",c:"As pain allows; cushioned footwear helps",tags:["impact"]}]},
  {re:/spina bifida|myelomeningocele|neural tube defect|tethered cord (child|paediatric)/,
   focus:"Spina bifida: with the child's team, work on strength, mobility (walking or wheelchair skills), joint protection and skin care — maximise independence; the level of involvement guides the goals.",
   add:[{p:1,n:"Range of motion & positioning (prevent contractures)",d:"daily",c:"Guided by the therapy team"},
        {p:2,n:"Strengthening of the working muscles & trunk/core",d:"play-based",c:"Build what's available"},
        {p:3,n:"Mobility practice (standing/walking or wheelchair skills)",d:"play-based",c:"Toward independence",tags:["balance","weight_bearing"]}]},
  {re:/perthes|legg-calv/,
   focus:"Perthes disease: keep the hip mobile (especially abduction and rotation) and protect it from heavy impact while the femoral head heals — maintain range and gentle strength on the team's timeline; swimming/cycling are great.",
   add:[{p:1,n:"Gentle hip range of motion (abduction, rotation)",d:"3×10",c:"Maintain motion; don't force it"},
        {p:2,n:"Hip & core strengthening (low-impact)",d:"play-based",c:"Build support",tags:["weight_bearing"]},
        {p:3,n:"Swimming & cycling (low-impact conditioning)",d:"play-based",c:"Great while impact is limited",tags:["aerobic"]}]},
  {re:/slipped capital femoral|\bscfe\b|slipped upper femoral|\bsufe\b/,
   focus:"SCFE (slipped growth plate at the hip): after pinning, follow the weight-bearing timeline, then restore hip motion and strength gradually — avoid heavy impact until cleared.",
   add:[{p:1,n:"Protected weight-bearing & gentle hip motion",d:"per surgeon",c:"Within your allowed range",tags:["weight_bearing"]},
        {p:3,n:"Progressive hip & leg strengthening",d:"3×10",c:"Once cleared; rebuild gradually",tags:["weight_bearing"]}]},
  {re:/muscular dystrophy|duchenne|becker muscular|congenital myopathy|spinal muscular atrophy/,
   focus:"Muscular dystrophy / myopathy: gentle, sub-maximal exercise and stretching maintain function and prevent contractures — AVOID heavy, eccentric or exhausting exercise, which can harm the muscle. Work closely with the specialist team.",
   add:[{p:1,n:"Gentle stretching & range of motion (prevent contractures)",d:"daily",c:"Especially calves, hips and hamstrings"},
        {p:2,n:"Sub-maximal low-intensity activity (swimming/cycling)",d:"play-based",c:"Never exercise to exhaustion",tags:["aerobic"]}]},
  {re:/brachial plexus (birth|palsy|injury)|erb'?s palsy|klumpke/,
   focus:"Brachial plexus birth injury (Erb's palsy): gentle daily range-of-motion keeps the shoulder and arm supple while the nerve recovers, then encourage active use through play — guided by the therapy team.",
   add:[{p:1,n:"Gentle passive range of motion of the arm & shoulder",d:"several × day",c:"Very gentle; keep the joints supple"},
        {p:2,n:"Encourage active reaching & use in play",d:"play-based",c:"Place toys toward the affected side"}]},
  {re:/torticollis|wry neck|sternocleidomastoid tightness/,
   focus:"Congenital muscular torticollis: gentle neck stretches plus positioning and tummy-time to encourage turning to the tight side — early, consistent stretching resolves most cases.",
   add:[{p:1,n:"Gentle neck stretches to the restricted side",d:"3×10",c:"Slow and gentle, as taught"},
        {p:2,n:"Positioning & tummy-time to encourage active turning",d:"daily play",c:"Toys to the non-preferred side"}]},
  {re:/toe walking|idiopathic toe-walk|equinus gait/,
   focus:"Toe walking: calf/Achilles stretching and heel-contact practice, plus foot and ankle strengthening — encourage flat-foot walking with games and cues.",
   add:[{p:1,n:"Calf & Achilles stretch",d:"3×30s",c:"Gentle, daily"},
        {p:2,n:"Heel-contact & flat-foot walking games",d:"play-based",c:"Cue 'heels down'",tags:["weight_bearing"]}]},
  {re:/developmental coordination|dyspraxia|hypotonia|(gross |global )?(motor|developmental) delay/,
   focus:"Developmental coordination difficulty / low tone: playful, repetitive practice of the target skills (core control, balance, ball skills, climbing) builds coordination and strength — make it fun and frequent.",
   add:[{p:1,n:"Core & postural strengthening play (animal walks, planks)",d:"play-based",c:"Fun, short bouts",tags:["weight_bearing"]},
        {p:2,n:"Balance & coordination games (beam walks, hopping)",d:"play-based",c:"Progress difficulty gradually",tags:["balance"]},
        {p:3,n:"Ball & motor-skill practice (throw/catch/kick, obstacle courses)",d:"play-based",c:"Build everyday coordination"}]},
  // ---- generic catch-alls (only used when nothing more specific matched) ----
  {re:/tendinop|tendinosis|tendinitis/, generic:true,
   focus:"Load the tendon progressively — start with isometrics for pain relief, build to heavy-slow resistance, then add speed/energy-storage last.",
   add:[{p:1,n:"Isometric hold for the affected tendon",d:"5×30–45s",c:"Sub-maximal; eases pain"},
        {p:3,n:"Heavy-slow resistance loading",d:"3×8 (3s tempo)",c:"Tolerable load; progress weekly"}]},
  {re:/fracture/, generic:true,
   focus:"Protect the healing bone and follow your weight-bearing status — restore motion and gentle strength around it, then progress loading once healed.",
   add:[{p:1,n:"Pain-free ROM around the injury",d:"3×10",c:"Within your allowed range"},
        {p:1,n:"Isometrics for the nearby muscles",d:"3×10s",c:"Maintain strength without moving the bone"}]},
  {re:/osteoarthritis|osteoarthrosis|\bdjd\b|degenerative (joint|arthritis)|arthrosis/, generic:true,
   focus:"Osteoarthritis: the joint gets better with graded exercise, not rest — strengthen the muscles around it, keep it moving daily, and manage load and weight. Some discomfort with exercise is normal and safe.",
   add:[{p:1,n:"Pain-free range of motion for the joint",d:"3×10",c:"Daily movement keeps it healthy"},
        {p:2,n:"Isometric & light strengthening around the joint",d:"3×10",c:"Build support gradually",tags:["grip_isometric"]},
        {p:3,n:"Progressive resistance for the surrounding muscles",d:"3×10",c:"Stronger muscles offload the joint"}]},
  {re:/rheumatoid|psoriatic arthritis|ankylosing spondylitis|\bgout\b|polymyalgia|lupus|reactive arthritis|inflammatory arthritis|\bra\b affecting|spondyloarthr/, generic:true,
   focus:"Inflammatory arthritis: gentle range-of-motion and low-impact strengthening protect and support the joints — do less during a flare and build back gradually as it settles. Coordinate exercise with your rheumatology treatment.",
   add:[{p:1,n:"Gentle range of motion for affected joints",d:"3×10",c:"Ease off during a flare"},
        {p:2,n:"Low-impact strengthening & aquatic options",d:"3×12",c:"Little and often; protect the joints",tags:["grip_isometric"]},
        {p:3,n:"Aerobic conditioning (walking/cycling/pool)",d:"15–20 min",c:"Builds capacity without joint stress",tags:["aerobic"]}]},
  {re:/osteoporosis|osteopenia|low bone (density|mass)|fragility fracture|bone (density|health)/, generic:true,
   focus:"Bone health (osteoporosis/osteopenia): weight-bearing, resistance and balance training build bone and prevent falls — AVOID high-impact moves and loaded/repeated spinal flexion (deep bending/crunches).",
   add:[{p:1,n:"Upright weight-bearing walking",d:"20–30 min",c:"Loads bone safely",tags:["weight_bearing","aerobic"]},
        {p:2,n:"Progressive resistance training (good posture)",d:"3×10",c:"Builds bone and muscle",tags:["weight_bearing"]},
        {p:3,n:"Balance & posture training",d:"3×30s",c:"Prevents falls and fractures",tags:["balance"]}]},
  {re:/(repair|reconstruction|tenodesis|tendon transfer) recovery|post-repair|post-reconstruction|\bavulsion\b/, generic:true,
   focus:"After a surgical repair/reconstruction: PROTECT the repair and follow your surgeon's range-of-motion and loading timeline — gentle motion first, then graded strengthening once the tissue has healed enough.",
   add:[{p:1,n:"Protected range of motion (within surgeon's limits)",d:"3×10",c:"Only to your allowed range"},
        {p:1,n:"Isometrics for the nearby muscles",d:"3×10s",c:"Maintain strength without stressing the repair"},
        {p:3,n:"Progressive strengthening (once cleared)",d:"3×10",c:"Build load gradually on your timeline"}]},
  {re:/muscle (strain|tear|pull)|myofascial|\bstrain\b/, generic:true,
   focus:"Muscle strain: after the early protective phase, progressive loading (especially eccentric) rebuilds strength and prevents re-injury — respect pain but keep loading.",
   add:[{p:1,n:"Pain-free isometric holds",d:"5×20s",c:"Gentle activation"},
        {p:3,n:"Progressive & eccentric strengthening",d:"3×10",c:"Rebuild capacity"}]},
  {re:/bursitis|bursopathy/, generic:true,
   focus:"Bursitis: reduce the repetitive irritation and direct pressure, keep gentle range, and progressively strengthen the surrounding muscles as it settles.",
   add:[{p:1,n:"Pain-free range of motion",d:"3×10",c:"Avoid pressure/irritation"},
        {p:2,n:"Progressive strengthening around the joint",d:"3×12",c:"Build support"}]},
  {re:/dislocation|subluxation/, generic:true,
   focus:"After a dislocation: rebuild the muscles that stabilise the joint and your control/proprioception; avoid the position that caused it until you're strong and confident.",
   add:[{p:1,n:"Isometric stabilisation",d:"3×20s",c:"Gentle co-contraction"},
        {p:2,n:"Progressive stability & strengthening",d:"3×12",c:"Rebuild control",tags:["balance"]}]},
  {re:/ligament (sprain|injury|tear)|\bsprain\b/, generic:true,
   focus:"Ligament sprain: protect early, then progressively restore range, strength and balance/proprioception — the balance work is what most prevents re-injury.",
   add:[{p:1,n:"Pain-free range of motion",d:"3×15",c:"Gentle, controlled"},
        {p:2,n:"Progressive strengthening & balance",d:"3×12",c:"Rebuild support",tags:["balance"]}]},
  {re:/contusion|\bbruise\b|haematoma|hematoma/, generic:true,
   focus:"Contusion (deep bruise): early gentle pain-free movement and gradual loading restore function — avoid aggressive massage or stretching of a fresh deep bruise.",
   add:[{p:1,n:"Gentle pain-free movement",d:"3×10",c:"Keep it moving"},
        {p:2,n:"Progressive strengthening",d:"3×12",c:"Rebuild as pain settles"}]}
];
/* Prefer the most specific match. A non-generic diagnosis always beats a
   generic catch-all (tendinopathy, fracture, OA, sprain, strain, bursitis…);
   within each tier, the entry matching the LONGEST substring wins (so
   "distal biceps tendinopathy" beats "biceps", "chronic ankle instability"
   beats "instability"), which also makes the result order-independent. */
function detectFocus(name){
  const l=String(name).toLowerCase();
  let bestSpec=null, bestSpecLen=-1, bestGen=null, bestGenLen=-1;
  for(const f of INJURY_FOCUS){
    const m=f.re.exec(l); if(!m) continue;
    const len=m[0].length;
    if(f.generic){ if(len>bestGenLen){ bestGenLen=len; bestGen=f; } }
    else if(len>bestSpecLen){ bestSpecLen=len; bestSpec=f; }
  }
  return bestSpec || bestGen;
}
function signatureFor(focus, phase){
  if(!focus) return [];
  return focus.add.filter(a=>a.p===phase).map(a=>({ n:a.n, d:a.d, c:a.c, tags:a.tags||[], sig:true }));
}

/* ---------- return-to-sport balance & agility ladder ----------
   Specific, staged balance/proprioception and agility/change-of-direction
   drills injected for lower-limb conditions so those exercises are concrete
   and injury/phase-appropriate rather than a generic "balance training" line.
   Balance is added for all lower-limb work (incl. OA/replacement); agility is
   added only for sport/ligament/tendon/sprain-type injuries. All carry engine
   tags, so applyContra() still gates them for impact/balance precautions. */
const BALANCE_LADDER = {
  1:[{n:"Double-leg balance: firm ground → cushion",d:"3×30s",c:"Steady near support; progress to a soft surface",tags:["balance"]}],
  2:[{n:"Single-leg stance progression (eyes open → eyes closed)",d:"3×30s each",c:"Near support; keep the ankle and hip quiet",tags:["balance"]},
     {n:"Tandem (heel-to-toe) stance & weight shifts",d:"3×30s",c:"Narrow base; control the sway",tags:["balance"]}],
  3:[{n:"Single-leg balance on a cushion + ball toss / head turns",d:"3×30s each",c:"Add a task without losing control",tags:["balance"]},
     {n:"Y-balance / star-excursion reach",d:"3×6 each direction",c:"Reach far; keep the standing knee stable over the foot",tags:["balance"]}],
  4:[{n:"Single-leg hop-and-stick (stabilise & hold 2s)",d:"3×6 each",c:"Land softly, freeze the landing",tags:["impact","balance"]}]
};
const AGILITY_LADDER = {
  3:[{n:"Ladder & line-hop footwork (two-feet in/out, side-to-side)",d:"3×20–30s",c:"Fast, light, controlled feet",tags:["weight_bearing","high_intensity","balance"]},
     {n:"Lateral shuffle & carioca (grapevine)",d:"3×10 m each",c:"Stay low; smooth crossover, no crossing-up",tags:["weight_bearing","high_intensity"]}],
  4:[{n:"Deceleration & cutting progression (45° → 90°)",d:"3×6 each side",c:"Brake under control; knee tracks over the foot",tags:["impact","high_intensity","balance"]},
     {n:"Pro-agility 5-10-5 shuttle & T-drill",d:"4–6 reps",c:"Sharp changes of direction; full rest between",tags:["impact","high_intensity"]}]
};
const RTS_LOWER = /knee|ankle|hip|foot|calf|thigh|lower limb|leg|acl|pcl|mcl|lcl|meniscus|hamstring|achilles|patell|groin|adductor|iliotibial|\bitb\b|quadric/i;
const RTS_DEGEN = /osteoarthritis|arthritis|replacement|arthroplasty|\btkr\b|\bthr\b|fracture|osteoporos|amputation|avascular|gout/i;
const RTS_SPORT = /acl|pcl|mcl|lcl|ligament|sprain|instab|meniscus|hamstring|calf (strain|tear)|gastroc|achilles tendinop|patell.*tendin|jumper|groin|adductor|iliotibial|\bitb\b|sport|athlet|return to (run|sport)/i;
/* protocols that already carry specific, staged agility drills — skip the
   ladder's agility for these so we don't double up (balance is still added). */
const AGILITY_RICH = new Set(["knee_ligament","ankle"]);
function rtsFor(cond, phaseIdx){
  const p = phaseIdx+1;
  const hay = `${cond.name||""} ${cond.region||""}`;
  if(!RTS_LOWER.test(hay)) return [];
  const degen = RTS_DEGEN.test(cond.name||"");
  const sporty = !degen && RTS_SPORT.test(cond.name||"");
  const out = [];
  if(BALANCE_LADDER[p]) out.push(...BALANCE_LADDER[p]);
  if(sporty && !AGILITY_RICH.has(cond.protocol) && AGILITY_LADDER[p]) out.push(...AGILITY_LADDER[p]);
  return out.map(a=>({ n:a.n, d:a.d, c:a.c, tags:a.tags||[], sig:true }));
}

/* ---------- return-to-sport tailoring ----------
   The sport(s) the user wants to get back to (state.returnSports, free text
   from the 10,000-item picker) adjust the LATE phases: each demand archetype
   matched by keyword injects sport-specific "🏅" signature exercises + a focus
   note. Keyword-based so it works for any typed/picked sport variation. All
   carry engine tags, so applyContra() still gates them. */
const SPORT_DEMANDS = [
  {re:/basketball|volleyball|netball|high jump|spike|dunk|jump/i, label:"jump / court",
   note:"Court/jump sport: build jump power and safe single-leg landing & rebound control.",
   add:[{p:3,n:"Jump-prep: pogo hops & squat jumps",d:"3×10",c:"Springy, quiet landings",tags:["impact","high_intensity"]},
        {p:4,n:"Max vertical jump & rebound-landing control",d:"3×6",c:"Explode up; land soft, balanced and even",tags:["impact","high_intensity","balance"]}]},
  {re:/soccer|football|rugby|hockey|lacrosse|handball|ultimate|gaelic|aussie rules|hurling|camogie|korfball|floorball/i, label:"cutting / field",
   note:"Multidirectional field sport: agility, deceleration and sound cutting mechanics.",
   add:[{p:3,n:"Agility ladder & lateral shuffle footwork",d:"3×20–30s",c:"Fast, low and controlled",tags:["weight_bearing","high_intensity","balance"]},
        {p:4,n:"Cutting, deceleration & reactive change-of-direction",d:"3×6 each side",c:"Plant and cut, knee over foot",tags:["impact","high_intensity","balance"]}]},
  {re:/tennis|badminton|squash|racquet|pickleball|padel|table tennis|pelota|platform tennis/i, label:"racquet / overhead",
   note:"Racquet/overhead sport: rotator-cuff resilience plus trunk-driven rotational power.",
   add:[{p:2,n:"Rotator-cuff & scapular control (band ER + rows)",d:"3×15",c:"Elbow tucked; squeeze the shoulder blade"},
        {p:4,n:"Overhead & rotational power (medicine-ball throws)",d:"3×8 each",c:"Drive from the legs and trunk",tags:["overhead","high_intensity"]}]},
  {re:/baseball|softball|cricket|javelin|water polo|throw|pitch|bowling \(/i, label:"throwing",
   note:"Throwing sport: rotator-cuff strength and a graded throwing progression.",
   add:[{p:2,n:"Rotator-cuff external rotation & scapular strength",d:"3×15",c:"Controlled, pain-free"},
        {p:4,n:"Graded throwing progression & rotational med-ball power",d:"3×8",c:"Build distance/effort weekly",tags:["overhead","high_intensity"]}]},
  {re:/running|marathon|sprint|triathlon|cross-country|track and field|steeplechase|hurdles|jog|duathlon|parkour|obstacle course|orienteering|race walk/i, label:"running / endurance",
   note:"Running/endurance: a graded return-to-run plus calf and impact tolerance are key.",
   add:[{p:3,n:"Return-to-run walk/run intervals",d:"per return-to-run plan",c:"Pain-free; build run minutes gradually",tags:["impact","aerobic"]},
        {p:4,n:"Tempo runs, strides & hill repeats",d:"per plan",c:"Add speed and volume ~10%/week",tags:["impact","aerobic","high_intensity"]}]},
  {re:/boxing|kickbox|muay|mma|mixed martial|wrestl|judo|jiu-jitsu|karate|taekwondo|kung fu|krav|sambo|capoeira|kendo|sumo|hapkido|wing chun|fencing/i, label:"combat",
   note:"Combat sport: rotational power, core control and a graded return to contact.",
   add:[{p:3,n:"Rotational & anti-rotation core power",d:"3×10 each",c:"Braced, controlled, then faster",tags:["high_intensity"]},
        {p:4,n:"Explosive strike/takedown drills & impact conditioning",d:"per plan",c:"Progress contact gradually",tags:["impact","high_intensity"]}]},
  {re:/swimming|water polo|diving|synchronised swimming|open water/i, label:"swimming",
   note:"Swimming: shoulder mobility, rotator-cuff endurance and a gradual yardage build.",
   add:[{p:2,n:"Shoulder mobility & rotator-cuff endurance",d:"3×15",c:"Full, pain-free range"},
        {p:4,n:"Stroke-specific & core-endurance work",d:"per plan",c:"Rebuild yardage gradually",tags:["overhead"]}]},
  {re:/cycling|\bbmx\b|\bbike\b|spinning|cyclocross|gravel|mountain bik|unicycl/i, label:"cycling",
   note:"Cycling: leg strength-endurance and gradual saddle-position and intensity tolerance.",
   add:[{p:3,n:"Quad/glute strength-endurance & position tolerance",d:"3×15",c:"Build time in the riding position"},
        {p:4,n:"Interval & hill efforts on the bike",d:"per plan",c:"Add intensity gradually",tags:["aerobic","high_intensity"]}]},
  {re:/golf|discus|shot put|hammer throw|curling/i, label:"rotational",
   note:"Rotational sport: thoracic and hip rotation with a graded swing progression.",
   add:[{p:3,n:"Thoracic & hip rotation mobility + anti-rotation core",d:"3×10 each",c:"Smooth, controlled turn"},
        {p:4,n:"Rotational power & graded swing progression",d:"3×8 each",c:"Half-swings first; build speed",tags:["high_intensity"]}]},
  {re:/weightlifting|powerlifting|bodybuilding|crossfit|strongman|calisthenic|kettlebell|functional fitness|hyrox|olympic lift|clean and jerk|snatch/i, label:"strength",
   note:"Strength sport: rebuild technique, then progressively load toward heavy/power work.",
   add:[{p:3,n:"Progressive compound lifting (technique focus)",d:"3×5–8",c:"Perfect form; add load weekly",tags:["valsalva","weight_bearing"]},
        {p:4,n:"Heavy & power lifting progression",d:"per plan",c:"Periodise; respect recovery",tags:["valsalva","high_intensity","weight_bearing"]}]},
  {re:/climbing|bouldering|mountaineer|via ferrata|scrambling/i, label:"climbing",
   note:"Climbing: pulling and grip strength with cautious, graded finger loading.",
   add:[{p:3,n:"Grip, pulling & scapular strength",d:"3×8–12",c:"Controlled; protect the fingers",tags:["grip_isometric"]},
        {p:4,n:"Lock-off & graded finger/hangboard loading",d:"per plan",c:"Very gradual finger loading",tags:["grip_isometric","high_intensity"]}]},
  {re:/gymnastics|dance|ballet|cheerlead|acrobat|trampolin|tumbl|figure skating|aerial|pole fitness|pole dancing|baton|salsa|breakdanc/i, label:"gymnastics / dance",
   note:"Gymnastics/dance: flexibility, single-leg control and safe landing mechanics.",
   add:[{p:3,n:"Single-leg control, hip & spine flexibility",d:"3×10 each",c:"Control through full range",tags:["balance"]},
        {p:4,n:"Landing control & explosive skill progression",d:"3×6",c:"Soft landings; rebuild skills gradually",tags:["impact","balance","high_intensity"]}]},
  {re:/skiing|snowboard|skateboard|surf|wakeboard|longboard|inline|roller|scooter|bmx freestyle/i, label:"snow / board",
   note:"Snow/board sport: eccentric quad strength, balance and landing/edge control.",
   add:[{p:3,n:"Eccentric quad strength & balance on an unstable surface",d:"3×10",c:"Slow lowering; stay steady",tags:["balance"]},
        {p:4,n:"Landing, edge control & reactive balance",d:"3×6",c:"Absorb and stick the landings",tags:["impact","balance"]}]},
  {re:/rowing|kayak|canoe|paddle|dragon boat|sailing|scull/i, label:"rowing / paddle",
   note:"Rowing/paddle: hinge and pulling endurance, then power and trunk endurance.",
   add:[{p:3,n:"Hip-hinge & pulling strength-endurance",d:"3×12",c:"Neutral spine; strong, smooth pull"},
        {p:4,n:"Power & trunk-endurance intervals",d:"per plan",c:"Build stroke power gradually",tags:["high_intensity"]}]},
  {re:/horse riding|dressage|show jumping|eventing|rodeo|\bpolo\b|equestrian|barrel racing/i, label:"equestrian",
   note:"Equestrian: core and adductor endurance, balance and grip for the saddle.",
   add:[{p:3,n:"Core, adductor & postural endurance",d:"3×12",c:"Tall posture, braced trunk"},
        {p:4,n:"Balance, grip & impact-absorption for the saddle",d:"3×8",c:"Progress time in the saddle",tags:["balance"]}]},
  {re:/yoga|pilates|tai chi|qigong|barre|nordic walking|walking football|walking netball|walking basketball|aqua/i, label:"low-impact / mind-body",
   note:"Low-impact practice: mobility, core control and balance.",
   add:[{p:2,n:"Controlled mobility through the target area",d:"2–3×30s",c:"Gentle and pain-free"},
        {p:3,n:"Core control & single-leg balance",d:"3×10",c:"Slow and controlled",tags:["balance"]}]}
];
function matchedSportDemands(){
  const sports = state.returnSports || [];
  const hits = []; const seen = new Set();
  for(const sp of sports) for(const d of SPORT_DEMANDS)
    if(d.re.test(sp) && !seen.has(d.label)){ seen.add(d.label); hits.push(d); }
  return hits;
}
function sportFor(phaseIdx){
  const p = phaseIdx+1;
  const picked = []; const seen = new Set();
  for(const d of matchedSportDemands())
    (d.add||[]).filter(a=>a.p===p).forEach(a=>{
      const k=a.n.toLowerCase();
      if(!seen.has(k)){ seen.add(k); picked.push({ n:a.n, d:a.d, c:a.c, tags:a.tags||[], sig:true, sport:true }); }
    });
  return picked.slice(0,3);   // cap sport additions per phase
}

/* ---------- build the program ---------- */
/* Realistic exercises per phase (protocol + signature + library-matched top-up). */
const PHASE_TARGET = [6,6,7,7];
/* Criteria to progress to the next phase — more detail than dates alone. */
const PHASE_CRITERIA = {
  acute: [
    "pain is settling, swelling is under control, and you can move the area comfortably through most of its range",
    "you have full or near-full pain-free range and can activate the muscles without a flare-up",
    "you can load the area with good control and any soreness stays low and settles within 24 hours",
    "strength is close to the other side and you can handle sport/work-like demands without symptoms"
  ],
  chronic: [
    "the irritable symptoms have calmed and gentle loading no longer causes a lasting flare",
    "you tolerate progressive loading with only mild, short-lived soreness afterwards",
    "you can handle heavier and faster loading with good control and stable symptoms",
    "you've restored strength, power and the full capacity your activities demand"
  ]
};
function enrichPhase(kept, protocol, p, flags){
  const target = PHASE_TARGET[p] || 6;
  if(kept.length < target){
    const supp = libraryOptions(protocol, p, flags, kept.map(e=>e.n), target - kept.length, 100 + p);
    kept.push(...supp);
  }
  return kept;
}
function generateProgram(){
  const conds = selectedConditions();
  const track = classify(state.weeks) || "acute";
  const flags = gatherFlags();
  const phaseWeeks = buildPhaseWeeks(track);
  const tmpl = TEMPLATE[track];
  const removedAll = new Map();

  const R = activeRestrictions();   // device / upper-limb weight-bearing name-based restrictions
  const items = conds.map((c,ci)=>{
    const proto = window.getProtocol(c.protocol);
    const focus = detectFocus(c.name);
    let cursor=1;
    const phases = proto.map((pool,p)=>{
      const len = phaseWeeks[p], wkStart=cursor, wkEnd=cursor+len-1; cursor=wkEnd+1;
      // prepend injury-specific signature + return-to-sport balance/agility + chosen-sport
      // exercises (sport on the primary condition only; dedupe against pool)
      const sigRaw = [...signatureFor(focus, p+1), ...rtsFor(c, p), ...(ci===0 ? sportFor(p) : [])];
      const sig = []; const sigSeen = new Set();
      sigRaw.forEach(s=>{ const k=s.n.toLowerCase(); if(!sigSeen.has(k)){ sigSeen.add(k); sig.push(s); } });
      const seen = new Set(sig.map(s=>s.n.toLowerCase()));
      let merged = [...sig, ...pool.filter(e=>!seen.has(e.n.toLowerCase()))];
      if(R.avoid.length) merged = merged.filter(e=>!R.avoid.some(re=>re.test(e.n)));   // drop device/limb-restricted moves
      const { kept, removed } = window.applyContra(merged, flags);
      window.ensureMinimum(kept, flags, 3);
      enrichPhase(kept, c.protocol, p, flags);
      let ex = R.avoid.length ? kept.filter(e=>!R.avoid.some(re=>re.test(e.n))) : kept;  // final gate (ensureMinimum/enrich)
      if(R.caution.length) ex.forEach(e=>{ if(!e.warn && !e.cautionMsg && R.caution.some(re=>re.test(e.n))) e.cautionMsg = true; });
      removed.forEach(r=>removedAll.set(r.n, r.tag));
      return { title:tmpl.phases[p].title, goal:tmpl.phases[p].goal, weekStart:wkStart, weekEnd:wkEnd,
        criteria:(PHASE_CRITERIA[track]||PHASE_CRITERIA.acute)[p], ex };
    });
    return { name:c.name, domain:c.domain, region:c.region, supervision:c.supervision, phases,
      protocol:c.protocol, clearance:c.clearance, chronicByNature:c.chronicByNature,
      focus: focus ? focus.focus : "",
      about:aboutText(c, track), redflags:DOMAIN_REDFLAGS[c.domain] };
  });

  return {
    track, totalWeeks:tmpl.total, sessions:sessionsText(track), load:loadGuidance(),
    flags, notes:window.notesForFlags(flags).concat(R.notes), clearance:clearanceNeeded(flags),
    supervision:displaySupervision(flags, clearanceNeeded(flags)), items,
    removed:Array.from(removedAll, ([n,tag])=>({n,tag}))
  };
}
function aboutText(c, track){
  return `${DOMAIN_NAME[c.domain].replace(/^./,ch=>ch.toUpperCase())} rehabilitation (${c.region}). ` +
    `This plan follows a general ${DOMAIN_NAME[c.domain]} approach centered on ${TEMPLATE[track].focus}.`;
}
const TAG_LABEL = {
  impact:"high-impact", valsalva:"heavy straining / breath-holding", overhead:"overhead loading",
  spine_flexion_load:"loaded spinal flexion", spine_extension:"spinal extension", deep_hip_flexion:"deep hip bending (>90°)",
  hip_add_ir:"crossing the midline / inward rotation", balance:"high balance demand", high_intensity:"high intensity",
  supine_flat:"lying flat on the back", prone:"lying face-down", inversion:"head-down positions",
  end_range_neck:"end-range neck movement", weight_bearing:"full weight-bearing", grip_isometric:"sustained grip/isometric holds",
  breath_hold:"breath-holding", aerobic:"sustained aerobic effort", deep_water:"deep-water (out-of-depth) work"
};

/* =====================================================================
   EXPLANATIONS — generated at render time from knowledge maps
===================================================================== */
const P_ALIAS = window.PROTOCOL_ALIAS || {};
function resolveProto(p){ return (window.PROTOCOLS && window.PROTOCOLS[p]) ? p : (P_ALIAS[p] || "general_msk"); }

const PROTOCOL_APPROACH = {
  shoulder:"restoring pain-free shoulder range, then progressively strengthening the rotator cuff and shoulder-blade muscles",
  elbow:"settling the irritated tendon and progressively loading the forearm and elbow (isometrics early for pain relief)",
  wrist_hand:"restoring wrist and hand motion, then building grip and forearm strength",
  hip:"strengthening the glutes and hip muscles while improving mobility and control",
  hip_replacement:"rebuilding hip strength and walking while respecting your hip-replacement precautions",
  knee_ligament:"restoring quad control and knee motion, then progressive loading and return-to-sport drills",
  knee_pf:"strengthening the hips and quads and managing load to settle kneecap pain",
  knee_replacement:"regaining full knee motion and strength while progressing walking and function",
  ankle:"restoring ankle motion, then balance and strength to prevent recurrence",
  achilles:"progressive calf and Achilles loading — especially slow, heavy and eccentric work",
  foot:"restoring foot and arch control and progressively loading the tissue",
  cervical:"gentle neck movement plus deep-neck and postural strengthening",
  thoracic:"mid-back mobility, posture and shoulder-blade strengthening",
  lumbar:"graded movement, core and hip strengthening, and confident loading of the spine",
  fracture:"restoring motion and strength around the healing bone, following your weight-bearing timeline",
  fracture_ue:"restoring motion and strength around the healing arm bone, then rebuilding grip and functional loading",
  fracture_le:"restoring motion and strength around the healing leg bone while progressing weight-bearing on your surgeon's timeline",
  amputation:"building residual-limb strength, balance and (where relevant) prosthetic function toward independence",
  amputation_ue:"building residual-limb and shoulder-girdle strength and prosthetic control toward two-handed independence",
  amputation_le:"building residual-limb strength, balance and prosthetic gait toward independent mobility",
  shoulder_instability:"restoring shoulder-blade and rotator-cuff control, then rebuilding stability and confidence in loaded/overhead positions",
  knee_meniscus:"protecting the meniscus early (limiting deep bending and twisting), then progressively loading the knee back to full function",
  radiculopathy_lumbar:"calming the irritated nerve root with movement/direction preference and nerve mobility, then rebuilding core and lower-limb strength",
  radiculopathy_cervical:"settling the irritated neck nerve with posture, deep-neck control and nerve mobility, then strengthening the neck and shoulder blade",
  sacroiliac:"restoring pelvic control through glute and core 'force-closure' strengthening and symmetric loading",
  tmj:"gentle jaw control, posture and relaxation to settle the joint",
  general_msk:"restoring movement, then progressively strengthening and reconditioning the area",
  stroke:"repetitive, task-specific practice to rebuild movement, balance and function",
  sci:"maximizing available strength, transfers, mobility and independence",
  ms:"paced strengthening, balance and endurance with attention to fatigue and heat",
  parkinsons:"large-amplitude movement, balance and high-effort exercise to manage symptoms",
  neuropathy:"rebuilding strength and balance while protecting areas of reduced sensation",
  vestibular:"gaze-stabilization and balance retraining to reduce dizziness",
  bells_palsy:"gentle, targeted activation and control of the affected muscles",
  balance_neuro:"balance, mobility and strengthening tailored to your condition, near support",
  tbi:"symptom-guided, graded return of aerobic fitness, balance and coordination",
  guillain_barre:"carefully paced strengthening that avoids overwork as nerves recover",
  cardiac_rehab:"supervised, graded aerobic exercise plus light resistance to rebuild fitness safely",
  heart_failure:"gentle, symptom-guided aerobic and light resistance work with close monitoring",
  hypertension:"regular moderate aerobic exercise (the cornerstone) plus controlled resistance work",
  pad:"structured walking to improve circulation and pain-free walking distance",
  valve:"graded aerobic and light strength work while respecting sternal/surgical precautions",
  arrhythmia:"aerobic and resistance exercise kept within safe heart-rate limits",
  pulmonary_rehab:"paced aerobic and strength work combined with breathing techniques",
  post_covid:"energy-paced, gradually progressed reconditioning to avoid setbacks",
  ild:"paced, oxygen-monitored aerobic work and breathing techniques",
  thoracic_surgery:"breathing and airway work plus graded reconditioning, respecting incision precautions",
  pulm_hypertension:"very conservative, low-to-moderate exercise strictly within prescribed limits",
  asthma:"well-warmed-up aerobic and strength work, using your action plan to prevent symptoms"
};

const PATHOLOGY_INFO = [
  [/sprain/, "A sprain is an overstretch or tear of a ligament (the tissue joining bone to bone). Healing follows a protect-then-load path as the ligament regains strength."],
  [/strain|muscle.*tear|tear \(post-repair\)|avulsion/, "A strain is an overstretch or tear of muscle or its tendon. Recovery rebuilds the muscle's length and load tolerance, with special attention to lengthening (eccentric) strength that guards against re-injury."],
  [/tendinopathy|tendinitis|tendinosis|tenosynovitis|epicondyl/, "Tendinopathy is an overload injury of a tendon. Tendons respond best to progressive loading — gradually heavier, controlled exercise — rather than rest."],
  [/bursitis/, "Bursitis is irritation of a bursa, the small fluid sac that cushions a joint. Calming the irritation and correcting the load or movement that caused it are the priorities."],
  [/osteoarthritis|kellgren|chondromalacia|cartilage|chondral/, "This involves the joint cartilage. Exercise doesn't 'wear the joint out' — appropriate strengthening and movement reduce pain and improve function."],
  [/rheumatoid|psoriatic|ankylosing|lupus|reactive arthritis|juvenile idiopathic|enteropathic|inflammatory/, "This is an inflammatory (autoimmune) joint condition. Exercise is tailored to disease activity — gentler during flares, progressive when settled — to preserve strength and mobility."],
  [/stress fracture/, "A stress fracture is a small bone crack from repetitive overload. Recovery respects a period of reduced loading, then a graded return once the bone has healed."],
  [/fracture/, "A fracture is a broken bone. Rehabilitation follows your surgeon's healing and weight-bearing timeline, restoring motion and strength as the bone unites."],
  [/dislocation|instability|subluxation|bankart|labral|labrum/, "This involves a joint slipping partly or fully out of place. Rehab rebuilds the muscles and control that keep the joint stable."],
  [/replacement|arthroplasty|resurfacing/, "This is recovery after a joint replacement. The plan restores motion and strength while respecting the precautions for your new joint."],
  [/reconstruction|repair|graft|latarjet|mpfl/, "This is recovery after a surgical repair or reconstruction. Progression follows the tissue-healing timeline and your surgeon's protocol."],
  [/impingement/, "Impingement is pinching of soft tissue during movement. Rehab restores pain-free range and the muscle control that creates space in the joint."],
  [/radiculopathy|sciatica/, "Radiculopathy is irritation of a spinal nerve root, often causing pain, numbness or weakness along the nerve. Rehab calms the nerve and restores movement and strength."],
  [/herniation|disc bulge|protrusion|extrusion|degenerative disc|\bdisc\b/, "This involves an intervertebral disc. Most disc-related pain settles with graded movement and progressive strengthening rather than rest."],
  [/stenosis|foraminal/, "Stenosis is narrowing of the spinal canal or a nerve passage. Exercise focuses on positions and strengthening that open space and improve activity tolerance."],
  [/spondylo|facet|pars|baastrup|schmorl|modic/, "This is a mechanical or age-related change of the spinal joints. Movement, mobility and core strengthening typically reduce symptoms."],
  [/frozen shoulder|adhesive capsulitis/, "Adhesive capsulitis ('frozen shoulder') is painful stiffening of the shoulder capsule that passes through phases. Rehab restores range gradually and avoids aggressive stretching too early."],
  [/plantar fasciitis|fasciitis|fibromatosis|heel/, "This affects the connective tissue of the foot. Loading the tissue progressively, plus calf and foot strengthening, drives recovery."],
  [/stroke|hemiparesis|wallenberg|infarct/, "A stroke injures part of the brain, affecting movement, balance or coordination. Recovery uses repetitive, task-specific practice — the brain can re-learn."],
  [/spinal cord|tetraplegia|paraplegia|cord syndrome|myelitis|myelopathy|brown-s|cauda equina/, "This involves the spinal cord, affecting movement and sensation below the level of injury. Rehab maximizes strength, function and independence within your ability."],
  [/parkinson|supranuclear|multiple system atrophy|corticobasal/, "This affects movement control. Large-amplitude, high-effort exercise and balance training help manage symptoms and maintain function."],
  [/multiple sclerosis|(^|[^a-z])ms /, "MS affects nerve signalling and can fluctuate. Exercise is paced to avoid overheating and fatigue while maintaining strength, balance and endurance."],
  [/neuropathy|nerve (injury|palsy|entrapment|damage)|plexopathy|radial|ulnar|median|peroneal|sciatic nerve|tunnel/, "This involves a peripheral nerve, which can affect strength, sensation and balance. Rehab rebuilds strength and control while protecting areas of reduced sensation."],
  [/vestibular|vertigo|bppv|labyrinth|dizziness|meniere|neuritis/, "This is an inner-ear / balance-system problem causing dizziness. Specific gaze and balance exercises retrain the system to reduce symptoms."],
  [/palsy|bell's|facial nerve/, "This is weakness from a nerve not working properly. Targeted, gentle activation and control exercises support recovery."],
  [/dystrophy|myopathy|myositis|muscular atrophy|myasthenia|lambert-eaton|sma/, "This is a muscle or neuromuscular condition. Exercise is carefully dosed — enough to maintain strength and function without overworking vulnerable muscle."],
  [/ataxia|cerebellar|friedreich/, "Ataxia affects coordination and balance. Rehab uses balance and coordination training, usually near support, to improve steadiness."],
  [/myocardial|heart attack|stemi|coronary|angina|cabg|bypass|stent|\bpci\b|cardiac rehab|deconditioning \(gen/, "This is recovery for the heart's blood supply. Supervised, graded aerobic exercise safely rebuilds fitness and is proven to improve outcomes."],
  [/heart failure|cardiomyopathy|lvad|hfref|hfpef|ejection fraction|transplant/, "The heart's pumping capacity is affected. Carefully paced, monitored exercise improves symptoms and endurance — intensity stays moderate and symptom-guided."],
  [/valve|tavr|valvular|mitral|aortic|tricuspid|pulmonary valve/, "This involves a heart valve. Graded aerobic and light strength work rebuild fitness while respecting any surgical (e.g. sternal) precautions."],
  [/arrhythmia|fibrillation|flutter|tachycardia|pacemaker|icd|heart block|bradycardia|\bqt\b|ablation/, "This involves the heart's rhythm. Exercise is kept within safe heart-rate limits, avoiding maximal exertion and breath-holding."],
  [/hypertension|blood pressure|prehypertension/, "High blood pressure responds well to regular moderate aerobic exercise. Heavy straining and breath-holding are avoided as they spike blood pressure."],
  [/artery disease|claudication|\bpad\b|aneurysm|dissection|venous|\bdvt\b|thrombo|vascular|raynaud|buerger|arteritis|carotid/, "This is a blood-vessel / circulation condition. Structured walking and conditioning improve circulation and, for leg-artery disease, pain-free walking distance."],
  [/copd|emphysema|bronchitis|bronchiectasis|gold stage/, "COPD narrows the airways and makes breathing harder. Pulmonary rehab — paced exercise plus breathing techniques — improves capacity and reduces breathlessness."],
  [/asthma/, "Asthma is reversible airway narrowing. With a good warm-up and your action plan, exercise is safe and improves fitness; intervals are usually well tolerated."],
  [/fibrosis|interstitial|\bild\b|pneumonia|sarcoid|asbestosis|silicosis|pneumoconiosis|hypersensitivity pneumonitis|nsip|uip/, "This is a lung-tissue condition that can lower oxygen levels. Exercise is paced and monitored (often with oxygen) to build tolerance safely."],
  [/embolism|cteph|ards/, "This follows a serious lung or clot event. Reconditioning is gradual and symptom-guided; new breathlessness or chest pain needs prompt review."],
  [/covid/, "This is recovery after COVID-19. Energy pacing is key — progress only when you recover well, to avoid post-exertional setbacks."],
  [/amputation|disarticulation|hemipelvectomy|forequarter/, "This is rehabilitation after limb loss. The plan builds residual-limb strength, balance and (where relevant) prosthetic function toward independence."],
  [/burn|contracture|skin graft|flap|replantation/, "This is recovery of soft tissue and movement after injury or surgery. Regaining range and preventing contracture are early priorities."],
  [/lymphedema/, "Lymphedema is swelling from impaired lymph drainage. Exercise, often with compression, helps move fluid and maintain function."],
  [/cancer|oncolog|sarcoma|metasta|chemotherapy|radiation|mastectomy|prostatectomy|lumpectomy/, "This is cancer-related rehabilitation. Exercise safely counters treatment-related fatigue and deconditioning and is tailored to your treatment stage."],
  [/pregnan|postpartum|caesarean|pelvic girdle|diastasis|pelvic floor|symphysis|levator/, "This is a pregnancy-related or pelvic-health condition. Rehab restores core, pelvic and hip control with attention to this life stage."],
  [/sarcopenia|frailty|deconditioning|falls|immobility|multimorbidity/, "This is age- or illness-related loss of strength and fitness. Progressive resistance and balance training rebuild capacity and reduce fall risk."],
  [/tmj|temporomandibular|bruxism|jaw/, "This affects the jaw joint and muscles. Gentle jaw control, posture and relaxation exercises reduce pain and improve function."],
  [/whiplash|neck strain|cervicogenic|torticollis|text neck|headache|occipital neuralgia/, "This is a neck or cervicogenic condition. Early gentle movement plus deep-neck and postural strengthening speeds recovery."],
  [/pots|orthostatic|dysautonomia|autonomic/, "This involves the autonomic control of heart rate and blood pressure. Reconditioning often begins with recumbent exercise and progresses gradually."],
  [/osteoporos|osteopenia|osteonecrosis|avascular necrosis|paget|blount|perthes|apophysitis|osteochondr|kienb|köhler|freiberg|scheuermann|sever|larsen/, "This is a bone or growth-plate condition. Rehab loads the area appropriately to support bone and tissue health while avoiding high-risk stress."]
];
function pathologyText(name){
  const l = name.toLowerCase();
  for(const [re, txt] of PATHOLOGY_INFO) if(re.test(l)) return txt;
  return "";
}
/* Full plain-language explanation for a condition. */
function conditionExplain(c, track){
  track = track || classify(state.weeks) || (c.chronicByNature ? "chronic" : "acute");
  const path = pathologyText(c.name);
  const approach = PROTOCOL_APPROACH[resolveProto(c.protocol)] || PROTOCOL_APPROACH.general_msk;
  const phase = track==="acute"
    ? "Because this is within the acute window (first ~6 weeks), the plan protects the healing tissue first, then progressively loads it."
    : "Because this is in the chronic phase (beyond ~6 weeks), the plan emphasizes progressive loading to rebuild capacity.";
  const parts = [
    path || `${c.name} affects the ${String(c.region).toLowerCase()}.`,
    `Your ${DOMAIN_NAME[c.domain]} program centers on ${approach}.`,
    phase
  ];
  if(c.clearance) parts.push("Given the nature of this condition, get medical clearance before starting and consider supervised rehab.");
  return parts.join(" ");
}

/* ---- exercise explanations ---- */
const PATTERN_INFO = {
  squat:{what:"A squat is a foundational lower-body movement that bends the hips and knees together.",how:"Feet about hip-to-shoulder width; sit the hips back and down with the knees tracking over the toes, then drive up.",why:"Builds strength in the quads, glutes and whole leg for standing, stairs and lifting."},
  hinge:{what:"A hip hinge (deadlift-family) movement bends mainly at the hips while the spine stays long.",how:"Push the hips back with soft knees and a neutral spine, feel a hamstring stretch, then drive the hips forward.",why:"Strengthens the hamstrings, glutes and back for bending, lifting and posture."},
  lunge:{what:"A lunge is a split-stance movement that loads one leg at a time.",how:"Step into a split stance, lower with a vertical front shin until the back knee nears the floor, then push back up.",why:"Builds single-leg strength, balance and control for walking and stairs."},
  calf:{what:"A calf raise loads the calf muscles and Achilles tendon.",how:"Rise onto the balls of the feet through full range, then lower slowly under control.",why:"Strengthens the calf and Achilles for push-off, walking and running."},
  pull:{what:"A pulling / curling exercise contracts a muscle to draw resistance in or bend a joint.",how:"Contract the target muscle to move the weight smoothly, then control the return.",why:"Builds pulling and curling strength and helps balance the joints it crosses."},
  push:{what:"A pushing / pressing exercise contracts a muscle to press resistance away or straighten a joint.",how:"Press smoothly through range and control the return, exhaling on effort.",why:"Builds pressing and extending strength for everyday tasks."},
  isometric:{what:"An isometric is a static hold with no joint movement.",how:"Get into position and hold steady with the target muscle engaged, breathing normally.",why:"Builds strength and tendon tolerance and often eases pain — useful when movement hurts."},
  mobility:{what:"A mobility or stretching drill moves a joint through its available range.",how:"Move slowly and smoothly to a gentle, pain-free end range.",why:"Restores range of motion and reduces stiffness."},
  balance:{what:"A balance exercise challenges your stability and body awareness.",how:"Hold or move in a challenging position near sturdy support, progressing difficulty gradually.",why:"Improves stability and coordination and lowers fall and re-injury risk."},
  plyo:{what:"A plyometric is an explosive jump or hop that trains power and landing control.",how:"Jump or hop with intent, focusing on soft, quiet, controlled landings.",why:"Rebuilds power and shock absorption for sport and impact activities."},
  carry:{what:"A loaded carry means walking while holding weight.",how:"Stand tall and braced, hold the load, and walk with even, controlled steps.",why:"Builds grip, core and whole-body strength and endurance."},
  cardio:{what:"An aerobic activity raises your heart and breathing rate steadily.",how:"Work at a conversational pace (or your prescribed intervals); warm up and cool down.",why:"Builds cardiovascular fitness, endurance and recovery capacity."},
  vestibular:{what:"A vestibular exercise retrains the inner-ear balance system.",how:"Perform the gaze or head movements as prescribed, provoking mild symptoms that then settle.",why:"Reduces dizziness and improves gaze and balance stability."},
  breathing:{what:"A breathing exercise trains the diaphragm and breathing pattern.",how:"Breathe slowly and relaxed (e.g. in through the nose, out through pursed lips); never hold your breath.",why:"Improves breathing efficiency and helps control breathlessness."},
  "anti-ext":{what:"An anti-extension core exercise resists the low back arching.",how:"Brace the core and move the limbs while keeping the low back flat and still.",why:"Builds deep core control that protects the spine."},
  "anti-rot":{what:"An anti-rotation core exercise resists twisting.",how:"Keep the hips and shoulders square while resisting a rotational load.",why:"Builds trunk stability for lifting, sport and spine protection."},
  extension:{what:"A back-extension exercise strengthens the muscles that straighten the spine.",how:"Lift into a small, controlled range without pinching, then lower slowly.",why:"Strengthens the back extensors for posture and lifting."},
  flexion:{what:"A trunk-flexion exercise works the abdominals by curling the spine.",how:"Curl through the upper spine with control; avoid straining the neck.",why:"Builds abdominal strength — introduced when appropriate for your condition."},
  gait:{what:"A gait drill practices the components of walking.",how:"Perform the stepping pattern with even, deliberate steps, looking ahead and near support if needed.",why:"Improves walking quality, coordination and confidence."},
  agility:{what:"An agility / change-of-direction drill trains fast, controlled starts, stops and turns.",how:"Accelerate, decelerate under control, then plant and cut with the knee tracking over the foot.",why:"Rebuilds the ability to move quickly and safely — key for returning to sport and reacting in daily life."},
  rotate:{what:"A rotational exercise trains controlled trunk turning and power.",how:"Rotate through the trunk with control and return smoothly.",why:"Builds rotational strength for sport and daily twisting tasks."},
  supine:{what:"A supine (lying on your back) therapeutic exercise — a gentle, low-load movement done on a mat, floor or bed.",how:"Lie on your back and move the target leg or muscle slowly through a comfortable range, or build a steady hold, keeping your core gently braced.",why:"Rebuilds early strength, control and range with almost no joint loading — ideal after surgery, when weight-bearing is limited, or when standing is painful."},
  seated:{what:"A seated therapeutic exercise — a gentle, controlled movement done sitting in a sturdy chair.",how:"Sit tall with your feet supported (or the working leg free to move) and take the joint slowly through range, or hold, staying pain-free.",why:"Builds strength and range safely, with support and no standing-balance demand — good early in recovery or when standing is limited."},
  standing:{what:"A standing therapeutic exercise — a supported, weight-bearing movement done holding a counter or rail.",how:"Stand tall beside a sturdy support and move the working leg (or your whole body) slowly and controlled through a pain-free range, or hold — keeping your hips level.",why:"Rebuilds standing strength, hip control and balance in a functional upright position — the bridge from table-based exercises to walking and daily life."},
  pool:{what:"A pool / aquatic therapeutic exercise — done standing or moving in chest-deep water, where buoyancy carries much of your body weight.",how:"In chest-deep water, move slowly against the water's resistance, holding the pool wall or edge for support when you need it; deeper-water drills use a flotation belt.",why:"Buoyancy offloads sore or healing joints while the water gives gentle all-around resistance and warmth — so you can move, strengthen and build fitness with far less impact than on land."},
  general:{what:"A general conditioning exercise for the area.",how:"Perform with control through a pain-free range, exhaling on effort.",why:"Helps restore strength, movement and function."}
};
/* Step-by-step technique detail per movement pattern — feeds the "How to do it" block. */
const PATTERN_HOWTO = {
  squat:{setup:"Stand with feet hip-to-shoulder-width apart, toes turned slightly out, weight balanced over your mid-foot. Brace your stomach as if about to be poked.",
    steps:["Break at the hips and knees at the same time, sitting your hips back and down.","Keep your chest up; let your knees travel forward over your toes — they may pass the toes as long as your heels stay flat.","Descend as far as you can while your heels stay down and your low back stays neutral (no rounding or tucking).","Drive up through your whole foot and squeeze your glutes at the top."],
    tempo:"Lower for 2–3 seconds, then stand at a controlled pace. Breathe in on the way down, out as you drive up.",
    avoid:"Don't let the knees cave inward or the heels lift — widen your stance or reduce depth if they do."},
  hinge:{setup:"Stand tall, feet hip-width, a slight soft bend in the knees. Set your shoulders back and brace your core.",
    steps:["Push your hips straight back toward the wall behind you, letting your torso tip forward as one unit.","Keep your spine long and flat — imagine a broomstick touching your head, upper back and tailbone.","Lower until you feel a stretch in the hamstrings (often about shin height), keeping the weight close to your legs.","Drive your hips forward to stand tall and squeeze your glutes — don't lean back at the top."],
    tempo:"Lower under control for ~3 seconds; return smoothly. Exhale as you stand up.",
    avoid:"Don't round your back or turn it into a squat — the movement comes from the hips, not the knees."},
  lunge:{setup:"Stand tall, then take a controlled step into a long split stance (or set up already staggered).",
    steps:["Lower straight down by bending both knees, dropping the back knee toward the floor.","Keep your front shin roughly vertical and your weight through the front heel and mid-foot.","Stop just before the back knee touches, keeping your torso upright.","Push through the front foot to return to the start."],
    tempo:"Lower for ~2 seconds, pause briefly, then rise. Breathe out on the way up.",
    avoid:"Don't let the front knee collapse inward or shoot far past the toes, and don't lean your trunk forward."},
  calf:{setup:"Stand tall, feet hip-width, near a wall or rail for light balance. Place the balls of the feet on a step for extra range if prescribed.",
    steps:["Push through the balls of your feet to rise as high as you can onto your toes.","Pause a moment at the top with the ankles fully pointed.","Lower slowly all the way down — let the heels drop below the step if you're using one."],
    tempo:"Rise for 1–2 seconds, lower for 3–4 seconds — the slow lower is where much of the benefit is.",
    avoid:"Don't bounce or rush; keep it smooth and let the calves, not gripping toes, do the work."},
  pull:{setup:"Set the resistance and get into a stable, tall posture; take up the slack before you start.",
    steps:["Set your shoulder blades — gently draw them back and down before the arm moves.","Pull the resistance smoothly toward you (or curl the joint), leading with the elbow.","Squeeze the working muscle for a moment at the end of the range.","Return slowly to full length, keeping tension the whole way."],
    tempo:"Pull for 1–2 seconds, control the return for ~3 seconds. Exhale as you pull.",
    avoid:"Don't shrug, swing or heave with momentum — if you have to jerk the weight, lighten it."},
  push:{setup:"Set a stable base and tall posture; start the joint at a comfortable, pain-free angle.",
    steps:["Brace your core and set your shoulder blades.","Press the resistance smoothly away (or straighten the joint) through a full, controlled range.","Stop just short of a harsh lock-out, keeping tension on the muscle.","Lower back to the start slowly and with control."],
    tempo:"Press for 1–2 seconds, lower for ~3 seconds. Exhale as you press.",
    avoid:"Don't hold your breath or flare the joint into a painful range — keep it smooth and pain-free."},
  isometric:{setup:"Move into the prescribed position and set your posture; find the exact angle where the target muscle works but nothing sharp is felt.",
    steps:["Gently build tension in the target muscle to a firm but comfortable effort (about 5–7 out of 10).","Hold perfectly still — no bouncing or shifting.","Keep breathing steadily throughout the hold.","Ease off slowly at the end rather than dropping suddenly."],
    tempo:"Hold for the prescribed time (often 20–45 seconds), then rest. Never hold your breath.",
    avoid:"Don't strain to maximum or push into pain — steady, sub-maximal tension is the goal."},
  mobility:{setup:"Get into the starting position and relax the surrounding muscles; the aim is gentle range, not force.",
    steps:["Move slowly and smoothly toward the end of the comfortable range.","Ease to the first point of gentle stretch or resistance — not pain.","Hold briefly, or move rhythmically in and out if it's a dynamic drill.","Return slowly to the start and repeat."],
    tempo:"Move deliberately; for static stretches hold ~20–30 seconds. Breathe out as you ease into range.",
    avoid:"Don't bounce or force through pain — range should improve gradually, not be wrenched."},
  balance:{setup:"Set up beside a sturdy support (counter, rail or wall) you can touch if needed; footwear as prescribed.",
    steps:["Get into position (e.g. stand on one leg) with your gaze fixed on a point ahead.","Brace your core gently and keep a soft bend in the knee.","Hold steady, correcting with small foot and ankle adjustments rather than flailing your arms.","Progress — add movement, close your eyes or use a softer surface — only when the level feels secure."],
    tempo:"Hold or work for the prescribed time; rest and repeat. Breathe normally.",
    avoid:"Don't hold your breath or lock the knee; keep support within reach so you can push yourself safely."},
  plyo:{setup:"Warm up first. Pick a surface with some give and clear space; start with a low height or short distance.",
    steps:["Load by dipping into a quarter-squat with the hips back and chest up.","Jump or hop with full effort, extending the hips, knees and ankles together.","Focus on the landing — land softly on the mid-foot and absorb through the hips and knees.","Land 'quietly' with the knees tracking over the toes, then reset before the next rep."],
    tempo:"Explode up, then land soft and controlled. Quality over quantity — stop if landings get sloppy.",
    avoid:"Don't land stiff-legged or with the knees caving in; cut the height or reps if form breaks down."},
  carry:{setup:"Pick up the load with a good hip hinge; stand tall with it at your side(s) or front as prescribed.",
    steps:["Stand as tall as you can — ribs down, shoulders back, core braced.","Take short, deliberate, even steps.","Keep the weight from swinging and your torso from leaning or tipping.","Set the load down with control using your legs, not your back."],
    tempo:"Walk at a steady pace for the prescribed distance or time; breathe normally throughout.",
    avoid:"Don't hold your breath, lean toward the weight, or let your posture collapse — stop when you can't stay tall."},
  cardio:{setup:"Choose your mode (walk, bike, row, etc.) and start with a few minutes of easy warm-up.",
    steps:["Build to your target effort — a conversational 'moderate' pace, or your prescribed intervals.","Keep a smooth, rhythmic pattern and steady breathing.","Use your heart-rate zone and/or RPE (see the cardio target above) to stay in range.","Finish with a few minutes of easy cool-down."],
    tempo:"Sustain the prescribed duration or intervals; at a moderate pace you should be able to talk but not sing.",
    avoid:"Don't red-line to breathlessness, and stop for chest pain, dizziness or unusual symptoms."},
  vestibular:{setup:"Sit or stand safely near support, ready to provoke mild dizziness that then settles.",
    steps:["Perform the prescribed gaze or head movement (e.g. keep your eyes on a target while turning your head).","Move at a pace that brings on mild symptoms without overwhelming you.","Continue for the set time, then pause and let symptoms settle before the next set.","Progress the speed or difficulty gradually as symptoms ease."],
    tempo:"Work for the prescribed time; rest between sets until dizziness settles.",
    avoid:"Don't push to severe nausea — a little provocation is therapeutic, a lot is counterproductive."},
  breathing:{setup:"Get comfortable — sitting upright or lying with knees bent. Rest one hand on your belly.",
    steps:["Breathe in slowly through your nose, letting your belly (not your chest) rise into your hand.","Keep your shoulders and neck relaxed.","Breathe out slowly and fully — through pursed lips if prescribed — for longer than you breathed in.","Pause briefly, then repeat at an unhurried pace."],
    tempo:"Aim for a slow rhythm — roughly in for 4, out for 6. Never hold your breath or force it.",
    avoid:"Don't let the upper chest and shoulders do the work, and don't strain — it should feel calm."},
  "anti-ext":{setup:"Set your low back flat to the floor (or into a neutral brace) and engage your core before moving.",
    steps:["Brace your abdominals as if bracing for a light punch.","Move your arms and/or legs slowly as prescribed while keeping the low back completely still.","Only move as far as you can before the back starts to arch.","Return under control and reset the brace each rep."],
    tempo:"Move slowly; breathe steadily and don't hold your breath.",
    avoid:"Don't let the back arch or the belly 'dome' up — shorten the range if you lose the flat-back position."},
  "anti-rot":{setup:"Set a stable stance and brace your core; take up tension so the resistance is trying to rotate you.",
    steps:["Square your hips and shoulders to the front.","Press or move as prescribed while resisting the pull that wants to twist you.","Keep the trunk dead still — the challenge is to not rotate.","Return slowly, staying square the whole time."],
    tempo:"Move deliberately and hold the end position briefly; breathe steadily.",
    avoid:"Don't let your torso twist toward the resistance — reduce the load if you can't stay square."},
  extension:{setup:"Position yourself as prescribed (e.g. lying face-down) with the spine neutral and the neck long.",
    steps:["Gently engage the muscles that straighten the spine.","Lift into a small, controlled range — think 'long and tall', not 'crank it high'.","Pause briefly at the top without pinching the low back.","Lower slowly back to the start."],
    tempo:"Lift for 1–2 seconds, lower for ~3 seconds. Exhale as you lift.",
    avoid:"Don't hyper-arch or jerk upward — if you feel pinching, reduce the range."},
  flexion:{setup:"Lie on your back with knees bent (or as prescribed); rest your hands lightly by your head without pulling the neck.",
    steps:["Draw your ribs gently toward your hips to curl the upper spine.","Peel the shoulder blades off the floor — you don't need to sit all the way up.","Keep the neck relaxed with a soft chin tuck (don't yank the head forward).","Lower slowly and with control."],
    tempo:"Curl up for ~2 seconds, lower for ~2–3 seconds. Exhale as you curl.",
    avoid:"Don't pull on your neck or use momentum — the abs, not the arms or hip flexors, should do the work."},
  gait:{setup:"Choose a clear, flat path with support (rail or wall) nearby; look ahead, not down at your feet.",
    steps:["Perform the prescribed stepping pattern with even, deliberate steps.","Keep your posture tall and let your arms swing naturally if the drill allows.","Place each foot with control — heel-to-toe unless told otherwise.","Keep support within reach; add pace or difficulty only as you feel steady."],
    tempo:"Move at a controlled pace; the quality of each step matters more than speed.",
    avoid:"Don't look down or rush — if you feel unsteady, slow down and stay near support."},
  agility:{setup:"Warm up thoroughly first. Mark out a small course with everyday objects (cans, bottles, tape) and clear the space; wear supportive shoes.",
    steps:["Start in an athletic stance — knees soft, weight on the balls of the feet.","Accelerate, then decelerate under control before each turn — 'sink' into your hips to brake.","Plant the outside foot and push off to change direction, keeping the knee tracking over the foot (never letting it cave inward).","Build up speed and sharper angles only as your control and confidence improve."],
    tempo:"Short, sharp efforts with full rest between — treat it like sprinting, not conditioning. Stop when form gets sloppy.",
    avoid:"Don't let the knee collapse inward on cuts or land stiff-legged; slow down or shorten the course if control slips."},
  rotate:{setup:"Set an athletic stance with soft knees and a braced core; take up tension on the resistance.",
    steps:["Start the turn from your hips and trunk, letting them lead the arms.","Rotate smoothly through a controlled range and pivot the back foot to protect the knee.","Keep the arms and core connected as one unit, not just swinging the arms.","Return under control to the start."],
    tempo:"Turn with intent, then control the return; exhale through the effort.",
    avoid:"Don't twist only from the low back or wrench the movement — the power comes from the hips."},
  general:{setup:"Set up in a stable, comfortable position with good posture.",
    steps:["Move through a pain-free range with control.","Keep the target area working and the surrounding joints relaxed.","Pause briefly at the hardest point if it feels controlled.","Return slowly to the start."],
    tempo:"Move smoothly at a controlled pace with a slower return. Exhale on the effort.",
    avoid:"Don't rush, hold your breath, or push into pain — smooth and controlled wins."},
  supine:{setup:"Lie on your back on a firm, comfortable surface (mat, bed or floor). Unless told otherwise, keep the non-working leg bent with the foot flat to support your low back.",
    steps:["Gently draw in / brace your core so your low back stays comfortable.","Move the working leg or muscle slowly and deliberately through the prescribed range — or build a steady, held contraction.","Only go as far as stays pain-free and controlled; quality matters more than range early on.","Lower or release slowly under control, then reset for the next rep."],
    tempo:"Move for about 2–3 seconds each way, or hold for the prescribed time; breathe normally — never hold your breath.",
    avoid:"Don't let your low back arch off the floor or hold your breath — shorten the range or add a brief hold if you lose control."},
  seated:{setup:"Sit tall toward the front of a sturdy, stable chair with your feet flat and hip-width (or the working leg free to move). Sit up straight rather than slumping back.",
    steps:["Set your posture — tall spine, relaxed shoulders, core gently braced.","Move the working joint slowly through the prescribed range (for example straighten or lift the leg) — or build a steady hold.","Pause briefly at the working end of the range if it feels controlled.","Lower slowly under control and reset for the next rep."],
    tempo:"Move for about 2–3 seconds each way, or hold for the prescribed time; exhale on the effort and keep breathing.",
    avoid:"Don't swing with momentum, slump, or push into sharp pain — keep it slow and controlled."},
  standing:{setup:"Stand tall facing or beside a sturdy, stable surface (a kitchen counter, heavy table or rail) you can rest a hand on for balance. Feet hip-width, weight even, knees soft.",
    steps:["Set your posture — stand tall, core gently braced, shoulders relaxed; rest one or both hands lightly on the support.","Move the working leg (or lower and raise your body) slowly and deliberately through the prescribed range — or hold the position steady.","Keep your standing leg strong and your hips level — don't let the pelvis drop or your trunk lean to cheat the movement.","Return under control to the start, staying tall throughout."],
    tempo:"Move for about 2–3 seconds each way, or hold for the prescribed time; breathe normally throughout.",
    avoid:"Don't grip the support for dear life or twist/lean to compensate — use just enough support to stay steady, and reduce the range if your form breaks down."},
  pool:{setup:"Use a warm pool. Stand where the water is about chest-deep so buoyancy takes weight off your legs, within easy reach of the wall or a rail. Enter and exit using the steps or ramp, and never swim or exercise in a pool alone.",
    steps:["Find your balance in the water with a hand on the wall if you need it; stand tall with your core gently braced.","Move slowly and deliberately — the water gives resistance in every direction, so smooth, controlled effort is what builds strength.","Keep the movement pain-free and use the wall for support whenever your balance is challenged.","For deeper-water drills, wear a flotation belt and stay within your comfort and confidence in the water."],
    tempo:"Work for the prescribed reps or time; move steadily against the water and breathe normally — don't hold your breath.",
    avoid:"Don't go deeper than you're confident in, don't exercise alone, and get out if you feel cold, dizzy or unwell. Take care on wet, slippery pool edges."}
};
function inferPattern(name){
  const l = name.toLowerCase();
  if(/agility|ladder|carioca|shuffle|shuttle|\bcutting\b|zig-zag|t-drill|5-10-5|pro-agility|mirror drill|backpedal|figure-8|dot drill|line hops|deceleration/.test(l)) return "agility";
  if(/gaze|vor|habituation/.test(l)) return "vestibular";
  if(/breath|diaphragm|pursed|spirometr/.test(l)) return "breathing";
  if(/dead bug/.test(l)) return "anti-ext";
  if(/bird-dog|pallof|anti-rotation|wood-?chop|\bchop\b|\blift\b \(/.test(l)) return "anti-rot";
  if(/jump|hop|bound|pogo|plyo|depth/.test(l)) return "plyo";
  if(/plank|wall sit|isometric|\bhold\b|dead-hang|chin tuck|quad set|glute set/.test(l)) return "isometric";
  if(/carry|farmer|suitcase|waiter/.test(l)) return "carry";
  if(/calf raise|heel raise|calf/.test(l)) return "calf";
  if(/lunge|step-up|split squat|step-down/.test(l)) return "lunge";
  if(/squat/.test(l)) return "squat";
  if(/deadlift|hinge|bridge|hip thrust|good-morning|kickback|romanian|hip extension/.test(l)) return "hinge";
  if(/crunch|sit-up|curl-up|v-up|trunk flexion|reverse crunch/.test(l)) return "flexion";
  if(/superman|cobra|back extension|hyperextension|prone extension/.test(l)) return "extension";
  if(/tandem walk|braiding|grapevine|gait|marching|obstacle stepping|backward walk/.test(l)) return "gait";
  if(/balance|single-leg stance|star-excursion|weight-shift|reach|foam|bosu|perturbation/.test(l)) return "balance";
  if(/walk|jog|run|cycl|bike|row|elliptical|stair|swim|aqua|conditioning|interval|sled/.test(l)) return "cardio";
  if(/stretch|\brom\b|mobility|pendulum|cat-camel|open-book|circle|alphabet|thread|slide|wall walk/.test(l)) return "mobility";
  if(/row|pull|curl|face pull|rear-delt|external rotation|scapular|y-t-w|deviation|glide/.test(l)) return "pull";
  if(/press|push-up|raise|fly|scaption|full-can|internal rotation|extension|leg extension/.test(l)) return "push";
  return "general";
}
function movementNotes(name){
  const l = name.toLowerCase(); const n = [];
  if(/isometric|hold|wall sit|plank|set\b/.test(l)) n.push("Held statically — builds tendon tolerance and control without moving the joint, which is handy when motion is painful.");
  if(/eccentric|nordic|off-step|slow-tempo|3s|slow eccentric/.test(l)) n.push("Emphasizes the slow lowering (lengthening) phase, which is especially effective for tendon and muscle strengthening.");
  if(/single-leg|pistol|unilateral|1-leg|one-leg/.test(l)) n.push("A single-leg version — more balance and stability demand; progress to it once the two-leg version is easy.");
  if(/\bband\b|cable|banded|accommodating/.test(l)) n.push("Uses variable resistance that's easy to scale up or down.");
  if(/paused|1\.5-rep|2s pause/.test(l)) n.push("The pause removes momentum and increases control at the hardest position.");
  if(/deficit|deep|full-range/.test(l)) n.push("Trains a larger range of motion — introduce it gradually.");
  if(/foam|bosu|unstable|wobble|perturbation/.test(l)) n.push("An unstable surface increases the balance challenge — keep sturdy support nearby.");
  return n.slice(0,2).join(" ");
}
function movementExplain(name, pattern, regionArr){
  const p = pattern || inferPattern(name);
  const info = PATTERN_INFO[p] || PATTERN_INFO.general;
  const ht = PATTERN_HOWTO[p] || PATTERN_HOWTO.general;
  const skip = new Set(["Full body","Cardio","Balance","Gait","Vestibular","Breathing","Core","Grip"]);
  const regs = (regionArr||[]).filter(r=>!skip.has(r));
  const target = regs.length ? ` It mainly works the ${regs.join(", ").toLowerCase()}.` : "";
  const notes = movementNotes(name);
  const steps = [`<b>Set up —</b> ${ht.setup}`].concat(ht.steps || []);
  const stepHTML = `<ol class="howsteps">${steps.map(s=>`<li>${s}</li>`).join("")}</ol>`;
  const meta = [
    ht.tempo ? `<div class="howmeta"><b>⏱ Tempo &amp; breathing:</b> ${ht.tempo}</div>` : "",
    ht.avoid ? `<div class="howmeta howavoid"><b>⚠ Avoid:</b> ${ht.avoid}</div>` : "",
    notes ? `<div class="howmeta"><b>Note:</b> ${notes}</div>` : ""
  ].join("");
  return `<b>What it is:</b> ${info.what}${target}`
    + `<div class="howhead"><b>How to do it</b></div>${stepHTML}${meta}`
    + `<div class="howwhy"><b>Why it helps:</b> ${info.why}</div>`;
}

/* Shared exercise <li> renderer with Explain + optional Swap (when ctx {ci,pi,ei} given). */
/* Objective cardio target for aerobic exercises — HR zone (if age known) + Borg RPE. */
function exertionLine(e){
  if(!e || !e.tags || !e.tags.includes("aerobic")) return "";
  const b = borgTarget(), z = hrZones(), beta = onBetaBlocker();
  let hr = "";
  if(hasLVAD()) hr = "HR is unreliable with your LVAD — go strictly by RPE";
  else if(z && z.deviceCap) hr = `keep HR under ${z.deviceCap} bpm (below your ICD threshold) · ~${fmtRange(z.zones.moderate)}`;
  else if(beta) hr = "HR unreliable on your beta-blocker — go by RPE";
  else if(hasCardiacDevice() && z) hr = `stay in ~${fmtRange(z.zones.moderate)} bpm, below your device's limit`;
  else if(z) hr = `target HR ~${fmtRange(z.zones.moderate)} bpm`;
  return `<div class="hrtarget">🎯 <b>Cardio target:</b> ${hr?esc(hr)+" · ":""}RPE ${b.lo}–${b.hi}${someCardioPulm()?" · watch SpO₂ if you monitor it":""}</div>`;
}
function exItemHTML(e, regionArr, ctx, medHidden){
  const dc = ctx ? `data-ci="${ctx.ci}" data-pi="${ctx.pi}" data-ei="${ctx.ei}"` : "";
  const rotate = ctx ? `<button class="rotatebtn" ${dc} title="Rotate to the next option">⟳ Rotate</button>` : "";
  const swap = ctx ? `<button class="swapbtn" ${dc}>⇄ Swap…</button>` : "";
  const remove = ctx ? `<button class="removeexbtn" ${dc} title="Remove this exercise from the phase">🗑 Remove</button>` : "";
  const swapbox = ctx ? `<div class="swapbox hide"></div>` : "";
  return `<li class="exitem${medHidden?" medhidden":""}">
    <div class="top"><span class="en">${e.custom?`<span class="custompill">✎ yours</span> `:""}${e.home?`<span class="homepill">🏠 home</span> `:""}${e.sport?`<span class="sportpill">🏅 sport</span> `:""}${e.sig?`<span class="sigpill">🎯 key</span> `:""}${esc(e.n)}</span><span class="ed">${esc(e.d)}</span></div>
    <div class="ec">${esc(e.c)}</div>
    ${exertionLine(e)}
    ${e.home?`<div class="homenote">🏠 <b>Home swap:</b> ${esc(e.homeNote)}</div>`:""}
    ${e.warn?`<span class="warnpill">⚠ Modify — involves ${esc(TAG_LABEL[e.warn]||e.warn)}; keep it symptom-free.</span>`:""}
    ${e.cautionMsg?`<span class="warnpill">⚠ Check this is allowed with your brace / immobilizer & precautions.</span>`:""}
    ${e.sub?`<span class="subpill">safer substitute for your precautions</span>`:""}
    <div class="exrowtools no-print">
      <button class="expbtn" onclick="this.closest('.exitem').querySelector('.exp').classList.toggle('hide')">ⓘ Explain</button>
      ${rotate}${swap}${remove}
    </div>
    <div class="exp hide">${movementExplain(e.n, e.pattern, e.region||regionArr)}</div>
    ${swapbox}
  </li>`;
}

/* ---- program editing: swap an exercise, reroll or reset a phase ---- */
const openPhases = new Set();                       // remembers which phases are expanded across re-renders
function togglePhase(head, key){
  const ph = head.parentElement; ph.classList.toggle("open");
  if(ph.classList.contains("open")) openPhases.add(key); else openPhases.delete(key);
}
/* Collapsible card (auto-collapsed by default). `openCards` remembers, within
   the session, which ones the user expanded so re-renders don't re-close them. */
const openCards = new Set();
function collapsibleCard(id, cls, titleHTML, bodyHTML, badgeHTML){
  const open = openCards.has(id) ? " open" : "";
  return `<details class="card ${cls} collapsecard" data-card="${esc(id)}"${open}>
    <summary class="collapsesum"><h2>${titleHTML}</h2>${badgeHTML||""}<span class="collapsehint">tap to expand</span><span class="collapsechev" aria-hidden="true">▾</span></summary>
    <div class="collapsebody">${bodyHTML}</div>
  </details>`;
}
function wireProgram(){
  // auto-collapsed cards (Safety notes, Vitals) — remember expand state across re-renders
  $$("#programOut details.collapsecard").forEach(d=>d.addEventListener("toggle",()=>{
    if(d.open) openCards.add(d.dataset.card); else openCards.delete(d.dataset.card);
  }));
  $$("#programOut .rotatebtn").forEach(b=>b.onclick=()=>rotateExercise(+b.dataset.ci, +b.dataset.pi, +b.dataset.ei));
  $$("#programOut .swapbtn").forEach(b=>b.onclick=()=>openSwap(b));
  $$("#programOut .rerollbtn").forEach(b=>b.onclick=()=>rerollPhase(+b.dataset.ci, +b.dataset.pi));
  $$("#programOut .resetbtn").forEach(b=>b.onclick=()=>resetPhase(+b.dataset.ci, +b.dataset.pi));
  // add / remove exercises per phase
  $$("#programOut .addexbtn").forEach(b=>b.onclick=()=>toggleAddExercise(+b.dataset.ci, +b.dataset.pi));
  $$("#programOut .removeexbtn").forEach(b=>b.onclick=()=>removeExercise(+b.dataset.ci, +b.dataset.pi, +b.dataset.ei));
  $$("#programOut .addexbox").forEach(box=>{               // re-open + refill any pickers the user left open
    if(openAddBoxes.has(box.dataset.ci+"-"+box.dataset.pi)){ fillAddExercise(box, +box.dataset.ci, +box.dataset.pi); box.classList.remove("hide"); }
  });
  const mf = $("#programOut #medFilterToggle");
  if(mf) mf.onchange = ()=>{
    state.medFilter = mf.checked; save();
    renderProgram(state.program);   // render-time only — no regeneration, edits kept
    toast(mf.checked ? "Medication safety filtering ON — high-risk exercises hidden (your edits are kept)."
                     : "Medication safety filtering OFF — all exercises shown.");
  };
  const hm = $("#programOut #homeModeToggle");
  if(hm) hm.onchange = ()=>{
    state.homeMode = hm.checked; save();
    renderProgram(state.program);   // render-time only — no regeneration, edits kept
    toast(hm.checked ? "Home mode ON — exercises adapted to household objects (your edits are kept)."
                     : "Home mode OFF — standard equipment shown.");
  };
  // clinician protocols are ADDED in the Clinician step; here we only wire the delete on the rendered cards
  $$("#programOut .clindel").forEach(b=>b.onclick=()=>removeClinProtocol(+b.dataset.idx));
}
function openSwap(btn){
  const ci=+btn.dataset.ci, pi=+btn.dataset.pi, ei=+btn.dataset.ei;
  const box = btn.closest(".exitem").querySelector(".swapbox");
  const item = state.program.items[ci], ph = item.phases[pi];
  if(box.dataset.filled!=="1"){
    const opts = libraryOptions(item.protocol, pi, activeFlags(), ph.ex.map(x=>x.n), 8, 0);
    if(!opts.length){
      box.innerHTML = `<div class="swaphint">No safe alternatives found for this phase.</div>`;
    } else {
      const disp = o => state.homeMode ? homeSwap(o) : o;   // show options in home terms when Home mode is on
      box.innerHTML = `<div class="swaphint">Tap an exercise to replace <b>${esc(disp(ph.ex[ei]).n)}</b>:</div>` +
        opts.map((o,oi)=>{ const d=disp(o); return `<div class="swapopt" data-oi="${oi}"><span class="en">${d.home?"🏠 ":""}${esc(d.n)}</span><span class="ed">${esc(d.d)}</span>${o.warn?`<span class="exwarn">⚠ modify</span>`:""}</div>`; }).join("");
      box.querySelectorAll(".swapopt").forEach(op=>op.onclick=()=>{
        openPhases.add(ci+"-"+pi);
        state.program.items[ci].phases[pi].ex[ei] = opts[+op.dataset.oi];
        save(); renderProgram(state.program); toast("Exercise swapped.");
      });
    }
    box.dataset.filled="1";
  }
  box.classList.toggle("hide");
}
function rotateExercise(ci, pi, ei){
  const item = state.program.items[ci], ph = item.phases[pi];
  const cur = ph.ex[ei].n;
  const others = ph.ex.filter((_,i)=>i!==ei).map(x=>x.n);
  const pool = libraryOptions(item.protocol, pi, activeFlags(), others, 24, 0);
  if(!pool.length){ toast("No alternative library exercises for this one."); return; }
  const idx = pool.findIndex(o=>o.n.toLowerCase()===cur.toLowerCase());
  const next = pool[(idx+1) % pool.length];
  openPhases.add(ci+"-"+pi);
  ph.ex[ei] = next; save(); renderProgram(state.program); toast("Rotated to the next option.");
}
function rerollPhase(ci, pi){
  const item = state.program.items[ci], ph = item.phases[pi];
  ph._seed = (ph._seed||0)+1;
  const n = Math.max(3, ph.ex.length);
  const fresh = libraryOptions(item.protocol, pi, activeFlags(), ph.ex.map(x=>x.n), n, ph._seed);
  if(!fresh.length){ toast("No alternative library exercises for this phase."); return; }
  ph.ex = fresh; openPhases.add(ci+"-"+pi);
  save(); renderProgram(state.program); toast("Phase rerolled from the library.");
}
function resetPhase(ci, pi){
  const item = state.program.items[ci], ph = item.phases[pi];
  const pool = window.getProtocol(item.protocol)[pi];
  const flags = activeFlags();
  const R = activeRestrictions();
  const { kept } = window.applyContra(R.avoid.length ? pool.filter(e=>!R.avoid.some(re=>re.test(e.n))) : pool, flags);
  window.ensureMinimum(kept, flags, 3);
  enrichPhase(kept, item.protocol, pi, flags);
  let ex = R.avoid.length ? kept.filter(e=>!R.avoid.some(re=>re.test(e.n))) : kept;
  if(R.caution.length) ex.forEach(e=>{ if(!e.warn && !e.cautionMsg && R.caution.some(re=>re.test(e.n))) e.cautionMsg = true; });
  ph.ex = ex; delete ph._seed; openPhases.add(ci+"-"+pi);
  save(); renderProgram(state.program); toast("Phase reset to the recommended exercises.");
}
/* ---- delete an exercise from a phase ---- */
function removeExercise(ci, pi, ei){
  const ph = state.program.items[ci].phases[pi];
  if(!ph || !ph.ex[ei]) return;
  if(ph.ex.length<=1){ toast("A phase needs at least one exercise — use ↩ Reset to restore the recommended set."); return; }
  const name = ph.ex[ei].n;
  ph.ex.splice(ei,1); openPhases.add(ci+"-"+pi);
  save(); renderProgram(state.program); toast(`Removed “${name}” from this phase.`);
}

/* ---- add an exercise to a phase (library search / suggestions / custom) ---- */
const openAddBoxes = new Set();                     // which phases' add-exercise pickers are open
function toggleAddExercise(ci, pi){
  const key = ci+"-"+pi;
  const box = $(`#programOut .addexbox[data-ci="${ci}"][data-pi="${pi}"]`); if(!box) return;
  if(openAddBoxes.has(key)){ openAddBoxes.delete(key); box.classList.add("hide"); box.innerHTML=""; box.dataset.filled=""; }
  else { openAddBoxes.add(key); openPhases.add(key); fillAddExercise(box, ci, pi); box.classList.remove("hide"); }
}
function fillAddExercise(box, ci, pi){
  box.innerHTML = addExercisePickerHTML();
  wireAddExercise(box, ci, pi);
  box.dataset.filled = "1";
}
function addExercisePickerHTML(){
  return `<div class="addexhint">Search the ${((window.EXERCISES||[]).length||0).toLocaleString()}-exercise library, or add your own — tap to add it to this phase.</div>
    <input type="text" class="addexsearch" placeholder="Search e.g. ‘ankle pumps’, ‘glute bridge’, ‘band row’…" autocomplete="off" />
    <div class="addexresults"></div>
    <div class="addexcustom">
      <div class="addexcustomlbl">Or add your own custom exercise:</div>
      <input type="text" class="addex-n" placeholder="Exercise name (required)" />
      <div class="addexcustrow">
        <input type="text" class="addex-d" placeholder="Sets × reps / time (e.g. 3×10)" />
        <input type="text" class="addex-c" placeholder="Cue / how-to (optional)" />
        <button class="btn primary addex-save" type="button">＋ Add</button>
      </div>
    </div>`;
}
function addExOptsHTML(opts){
  if(!opts.length) return `<div class="addexnone">No safe matches — try another search, or add a custom exercise below.</div>`;
  return opts.map((o,oi)=>`<div class="addexopt" data-oi="${oi}"><span class="en">${esc(o.n)}</span><span class="ed">${esc(o.d||"")}</span>${o.warn?`<span class="exwarn">⚠ modify</span>`:""}</div>`).join("");
}
/* Full-library search for the add picker — respects precautions (device/WB name
   restrictions + contraindication flags) so suggestions stay safe. */
function searchLibraryForAdd(q, exclude){
  if(!window.EXERCISES) return [];
  const toks = q.toLowerCase().split(/\s+/).filter(Boolean); if(!toks.length) return [];
  const exSet = new Set((exclude||[]).map(n=>n.toLowerCase()));
  const matched = [];
  for(let i=0;i<window.EXERCISES.length && matched.length<80;i++){
    const e = window.EXERCISES[i];
    if(exSet.has(e.name.toLowerCase())) continue;
    const hay = (e.name+" "+e.region.join(" ")+" "+e.pattern).toLowerCase();   // match name, region (e.g. "supine")/pattern too
    if(toks.every(t=>hay.includes(t)) && nameAllowed(e.name)) matched.push(e);
  }
  let { kept } = window.applyContra(matched, activeFlags());     // drop contraindicated, mark cautioned
  return kept.slice(0,30).map(e=>({ n:e.name, d:e.dose, c:e.cue, warn:e.warn, pattern:e.pattern, region:e.region, tags:e.tags }));
}
function wireAddExercise(box, ci, pi){
  const item = state.program.items[ci], ph = item.phases[pi];
  const resultsEl = box.querySelector(".addexresults");
  const suggest = () => libraryOptions(item.protocol, pi, activeFlags(), ph.ex.map(x=>x.n), 12, ph._addseed||0);
  let curOpts = [];
  const draw = (opts) => {
    curOpts = opts;
    resultsEl.innerHTML = addExOptsHTML(opts);
    resultsEl.querySelectorAll(".addexopt").forEach(op=>op.onclick=()=>addExerciseToPhase(ci, pi, curOpts[+op.dataset.oi]));
  };
  draw(suggest());
  const search = box.querySelector(".addexsearch");
  let t;
  search.oninput = () => { clearTimeout(t); t=setTimeout(()=>{
    const q = search.value.trim();
    draw(q ? searchLibraryForAdd(q, ph.ex.map(x=>x.n)) : suggest());
  }, 140); };
  const saveBtn = box.querySelector(".addex-save");
  saveBtn.onclick = () => {
    const n = box.querySelector(".addex-n").value.trim();
    if(!n){ toast("Type an exercise name first."); return; }
    const d = box.querySelector(".addex-d").value.trim() || "as prescribed";
    const c = box.querySelector(".addex-c").value.trim() || "Added by you — perform with control and keep it pain-free.";
    addExerciseToPhase(ci, pi, { n, d, c, custom:true });
  };
}
function addExerciseToPhase(ci, pi, ex){
  if(!ex || !ex.n) return;
  const ph = state.program.items[ci].phases[pi];
  if(ph.ex.some(e=>e.n.toLowerCase()===ex.n.toLowerCase())){ toast("That exercise is already in this phase."); return; }
  ph.ex.push({ n:ex.n, d:ex.d, c:ex.c, warn:ex.warn, pattern:ex.pattern, region:ex.region, tags:ex.tags, custom:ex.custom });
  openPhases.add(ci+"-"+pi); openAddBoxes.add(ci+"-"+pi);        // keep phase + picker open to add more
  save(); renderProgram(state.program); toast(`Added “${ex.n}” to this phase.`);
}

/* status of a precaution given its weeks-to-follow (w) and the user's weeks post-op */
function precStatus(w){
  const wpo = weeksPostOp();
  if(w==null) return ["personal","personal reminder"];
  if(w===0) return ["active","ongoing / until cleared"];
  if(wpo==null) return ["neutral",`follow ~${w} wks`];
  if(wpo < w) return ["active",`ACTIVE · until ~wk ${w}`];
  return ["lifted","likely lifted — confirm"];
}
function precRowHTML(t, w, idx){
  const [cls,label] = precStatus(w);
  const del = (idx!=null) ? `<span class="precdel no-print" data-idx="${idx}" title="Remove">✕</span>` : "";
  const mine = (idx!=null) ? `<span class="precmine">yours</span> ` : "";
  return `<li class="precrow ${cls}"><span class="prec-t">${mine}${esc(t)}</span><span class="prec-w">${label}</span>${del}</li>`;
}

/* Precautions & reminders card: surgical precautions (if any) + user's own reminders. */
function surgicalReminderCard(){
  const surg = detectSurgery();
  const customs = state.customPrecautions || [];
  const wpo = weeksPostOp();

  let head = "", timeline = "", disclaimer = "", surgRows = "";
  if(surg){
    let sub;
    if(state.surgeryDate) sub = (wpo>0 ? `You're about <b>${wpo} week${wpo===1?"":"s"} post-op</b>` : `You're <b>less than a week post-op</b>`) + ` (surgery date: ${esc(fmtDate(state.surgeryDate))}).`;
    else if(wpo!=null)    sub = `About <b>${wpo} week${wpo===1?"":"s"}</b> in — add your <b>surgery date</b> in Details for an exact post-op timeline.`;
    else                  sub = `Add your <b>surgery date</b> in Details to track your post-op timeline.`;
    head = `<p class="hint"><b>${esc(surg.name)}.</b> ${sub}</p>`;
    surgRows = surg.precautions.map(p=>precRowHTML(p.t, p.w, null)).join("");
    timeline = `<div class="banner load" style="margin:4px 0 0"><b>Timeline:</b> ${esc(surg.ret)}</div>`;
    disclaimer = `<p class="hint" style="margin-top:10px">These are <b>generalized</b> timeframes for education — your surgeon's own protocol always takes precedence.
      Seek care for spreading redness, discharge, fever, new calf pain/swelling, or chest pain/breathlessness.</p>`;
  }
  const devices = state.devices || [];

  // --- weight-bearing status control ---
  const wb = state.weightBearing || {};
  const wbInfo = WB_STATUS[wb.status];
  const bw = bodyWeightLbs();
  const wbOptions = `<option value="">— not specified —</option>` + WB_ORDER.map(k=>{
      const r=WB_STATUS[k]; return `<option value="${k}"${wb.status===k?" selected":""}>${esc(r.label)} (${esc(r.abbr)})</option>`; }).join("");
  const pctBlock = (wb.status==="pwb") ? `<div class="wbamt">
      <label>% of body weight<input type="number" id="wbPct" min="0" max="100" step="5" value="${esc(wb.pct||"")}" placeholder="e.g. 50" /></label>
      <label>or weight (lbs)<input type="number" id="wbLbs" min="0" max="600" value="${esc(wb.lbs||"")}" placeholder="e.g. 90" /></label>
      <div class="wbhint">${bw?`Your body weight ≈ ${Math.round(bw)} lbs — so 25% ≈ ${Math.round(bw*.25)} lbs, 50% ≈ ${Math.round(bw*.5)} lbs.`:`Add your weight in History for automatic %↔lbs conversion.`}</div>
    </div>` : "";
  const sideOpt = (v,l)=>`<option value="${v}"${(wb.side||"")===v?" selected":""}>${l}</option>`;
  const limbOpt = (v,l)=>`<option value="${v}"${(wb.limb||"le")===v?" selected":""}>${l}</option>`;
  const wbControl = `<div class="wbctrl no-print">
      <label class="preclab" for="wbSelect">🦵 Weight-bearing status <span class="sub">(this adjusts your exercises)</span></label>
      <select id="wbSelect">${wbOptions}</select>
      <div class="wbrow2">
        <label>Side<select id="wbSide">${sideOpt("","—")}${sideOpt("left","Left")}${sideOpt("right","Right")}${sideOpt("bilateral","Both")}</select></label>
        <label>Extremity<select id="wbLimb">${limbOpt("le","Lower extremity (leg)")}${limbOpt("ue","Upper extremity (arm)")}</select></label>
      </div>
      ${wbInfo?`<div class="wbdesc">${esc(wbInfo.desc)}</div>`:""}
      ${pctBlock}
    </div>`;

  // --- braces / orthotics / prosthetics / splints control ---
  const devOptions = Object.values(DEVICE_CATALOG).map(g=>
      `<optgroup label="${esc(g.label)}">${g.items.map(([n])=>`<option value="${esc(n)}">${esc(n)}</option>`).join("")}</optgroup>`
    ).join("") + `<optgroup label="Other"><option value="__custom">Other / custom…</option></optgroup>`;
  const devControl = `<div class="devctrl no-print">
      <label class="preclab" for="devSelect">🦿 Braces, orthotics, prosthetics &amp; splints</label>
      <div class="devrow">
        <select id="devSelect"><option value="">— choose a device to add —</option>${devOptions}</select>
        <button class="btn primary devadd" type="button">＋ Add</button>
      </div>
      <input type="text" id="devCustom" class="hide" placeholder="Name your device / splint (e.g. custom night splint)" />
    </div>`;

  // --- special surgical-site precautions (sternal / abdominal) control ---
  const spActive = new Set(state.specialPrecautions||[]);
  const spToggles = Object.values(SPECIAL_PRECAUTIONS).map(p=>{
      const on = spActive.has(p.key);
      return `<label class="sptoggle${on?" on":""}"><input type="checkbox" class="spcheck" data-sp="${esc(p.key)}"${on?" checked":""} />
        <span class="sptop">${p.icon} ${esc(p.label)}</span><small>${esc(p.sub)}</small></label>`;
    }).join("");
  const spControl = `<div class="spctrl no-print">
      <label class="preclab">🫀 Surgical-site precautions <span class="sub">(this adjusts your exercises)</span></label>
      <div class="sptoggles">${spToggles}</div>
    </div>`;

  // --- rows (each ACTIVE precaution shows a clear plain-language explanation) ---
  // clinician's own precaution protocol (verbatim), shown first & prominent
  const clinPrec = (state.clinPrecautionProtocol||"").trim();
  const clinPrecRow = clinPrec ? `<li class="precrow spwhat clinprecrow"><span class="prec-t">🛡️ <b>Clinician precaution protocol</b> (entered in the Clinician step): ${esc(clinPrec)}</span></li>` : "";
  // weight-bearing order + what it means
  const wbRow = wbInfo ? `<li class="precrow active wbrow"><span class="prec-t">🦵 <b>Weight-bearing:</b> ${esc(wbSummary())}</span><span class="prec-w">order</span></li>`
      + `<li class="precrow spwhat"><span class="prec-t">ⓘ <b>What this means:</b> ${esc(wbInfo.desc)}${wb.status && wb.status!=="fwb" ? " Your plan removes or limits standing / weight-through-the-limb exercises to match." : ""}</span></li>` : "";
  // devices: wear note + what it changes in the plan
  const devRows = devices.map((d,i)=>{
      const r = DEVICE_RESTRICT[d.name];
      const explain = r && r.note ? `<li class="precrow spwhat"><span class="prec-t">ⓘ <b>What this is:</b> ${esc(r.note)}</span></li>` : "";
      return `<li class="precrow devrow"><span class="prec-t">🦿 <b>${esc(d.name)}</b> — ${esc(d.note||"")}</span><span class="precdel devdel no-print" data-devidx="${i}" title="Remove">✕</span></li>${explain}`;
    }).join("");
  const spRows = activeSpecialPrecautions().map(p=>{
      const what = `<li class="precrow spwhat"><span class="prec-t">${p.icon} <b>${esc(p.label)} — what they are:</b> ${esc(p.what)}</span></li>`;
      const rules = p.rules.map(r=>precRowHTML(r, p.weeks, null)).join("");
      return what + rules;
    }).join("");
  const customRows = customs.map((p,i)=>precRowHTML(p.t, p.w, i)).join("");
  const list = (clinPrecRow || wbRow || surgRows || devRows || spRows || customRows)
    ? `<ul class="preclist">${clinPrecRow}${wbRow}${surgRows}${devRows}${spRows}${customRows}</ul>`
    : `<p class="hint">Set your weight-bearing status, add a brace/splint, or switch on a surgical-site precaution above — or add your own reminder below. Each one you select is explained here.</p>`;

  const addCtrl = `<div class="addprec no-print">
      <button class="addprecbtn">＋ Add your own precaution / reminder</button>
      <div class="addprecform hide">
        <input type="text" class="addprec-t" placeholder="e.g. Keep the brace locked in extension when sleeping" />
        <input type="number" class="addprec-w" min="0" max="104" placeholder="weeks (optional)" />
        <button class="btn primary addprec-save">Add</button>
      </div>
    </div>`;
  const title = surg ? "🩹 Surgical precautions &amp; reminders" : "📌 Precautions &amp; reminders";
  return `<div class="card surgcard${surg?"":" plain"}">
    <h2>${title}</h2>
    ${head}
    <div class="preccontrols no-print">${wbControl}${devControl}${spControl}</div>
    ${list}${timeline}${addCtrl}${disclaimer}
  </div>`;
}
/* The Precautions & reminders card now lives in the Details step (#precautionsOut).
   Render + wire it there; changes regenerate the (hidden) plan so step 3 is ready. */
function renderPrecautions(){
  const host = $("#precautionsOut"); if(!host) return;
  host.innerHTML = surgicalReminderCard();
  wirePrecautions();
}
function wirePrecautions(){
  const addBtn = $("#precautionsOut .addprecbtn");
  if(addBtn) addBtn.onclick = ()=>{ const f=$("#precautionsOut .addprecform"); f.classList.toggle("hide"); if(!f.classList.contains("hide")) f.querySelector(".addprec-t").focus(); };
  const saveBtn = $("#precautionsOut .addprec-save"); if(saveBtn) saveBtn.onclick = addCustomPrecaution;
  $$("#precautionsOut .precdel").forEach(b=>b.onclick=()=> b.dataset.devidx!=null ? removeDevice(+b.dataset.devidx) : removeCustomPrecaution(+b.dataset.idx));
  const wbSel=$("#precautionsOut #wbSelect"); if(wbSel) wbSel.onchange=setWeightBearingStatus;
  const wbPct=$("#precautionsOut #wbPct"); if(wbPct) wbPct.oninput=()=>setWbAmount("pct");
  const wbLbs=$("#precautionsOut #wbLbs"); if(wbLbs) wbLbs.oninput=()=>setWbAmount("lbs");
  const wbSide=$("#precautionsOut #wbSide"); if(wbSide) wbSide.onchange=setWbMeta;
  const wbLimb=$("#precautionsOut #wbLimb"); if(wbLimb) wbLimb.onchange=setWbMeta;
  const devSel=$("#precautionsOut #devSelect"); if(devSel) devSel.onchange=()=>{ const c=$("#precautionsOut #devCustom"); if(c){ c.classList.toggle("hide", devSel.value!=="__custom"); if(devSel.value==="__custom") c.focus(); } };
  const devAdd=$("#precautionsOut .devadd"); if(devAdd) devAdd.onclick=addDevice;
  $$("#precautionsOut .spcheck").forEach(c=>c.onchange=()=>toggleSpecialPrecaution(c.dataset.sp, c.checked));
}
/* Regenerate the (hidden) plan after a plan-affecting precaution change, then
   re-render the card. Step 3 re-renders from state.program when navigated to. */
function afterPrecautionChange(regen){
  if(regen && state.program){ state.program = generateProgram(); save(); if(state.step===4) renderProgram(state.program); }
  renderPrecautions();
}
function setWeightBearingStatus(){
  const sel = $("#precautionsOut #wbSelect"); if(!sel) return;
  const status = sel.value;
  const wb = state.weightBearing = state.weightBearing || {};
  wb.status = status;
  if(status!=="pwb"){ wb.pct=""; wb.lbs=""; }
  save();
  afterPrecautionChange(true);   // WB order reshapes the plan
  toast(status ? `Weight-bearing set to ${WB_STATUS[status].abbr} — your plan was updated to match.` : "Weight-bearing status cleared.");
}
function setWbAmount(which){
  const wb = state.weightBearing = state.weightBearing || {};
  const pctEl=$("#precautionsOut #wbPct"), lbsEl=$("#precautionsOut #wbLbs"), bw=bodyWeightLbs();
  if(which==="pct"){ wb.pct = pctEl.value; if(bw && pctEl.value!=="") { wb.lbs = Math.round(bw*(+pctEl.value)/100); if(lbsEl) lbsEl.value = wb.lbs; } }
  else { wb.lbs = lbsEl.value; if(bw && lbsEl.value!=="") { wb.pct = Math.round((+lbsEl.value)/bw*100); if(pctEl) pctEl.value = wb.pct; } }
  save();   // amount doesn't change which exercises are removed — update the row text in place (keeps input focus)
  const row = $("#precautionsOut .wbrow .prec-t"); if(row) row.innerHTML = `🦵 <b>Weight-bearing:</b> ${esc(wbSummary())}`;
}
/* Side / extremity change: for the upper limb, exercise restrictions differ, so regenerate. */
function setWbMeta(){
  const wb = state.weightBearing = state.weightBearing || {};
  const s=$("#precautionsOut #wbSide"), l=$("#precautionsOut #wbLimb");
  if(s) wb.side = s.value; if(l) wb.limb = l.value;
  save();
  afterPrecautionChange(true);
}
function toggleSpecialPrecaution(key, on){
  const p = SPECIAL_PRECAUTIONS[key]; if(!p) return;
  const set = new Set(state.specialPrecautions||[]);
  on ? set.add(key) : set.delete(key);
  state.specialPrecautions = Array.from(set); save();
  afterPrecautionChange(true);   // precaution reshapes the plan
  toast(on ? `${p.label} on — your plan was updated to match.` : `${p.label} cleared.`);
}
function addDevice(){
  const sel=$("#precautionsOut #devSelect"); if(!sel) return;
  let name = sel.value, custom = (name==="__custom");
  if(custom){ const c=$("#precautionsOut #devCustom"); name=(c?c.value:"").trim(); if(!name){ toast("Type a device name first."); return; } }
  if(!name){ toast("Choose a device to add."); return; }
  (state.devices = state.devices||[]).push({ name, note: custom ? "Wear/use as prescribed by your clinician." : deviceNoteFor(name) });
  save();
  afterPrecautionChange(true);   // devices reshape the plan
  toast(DEVICE_RESTRICT[name] ? "Added — your plan was updated to match." : "Added to your precautions.");
}
function removeDevice(idx){
  if(!state.devices) return;
  state.devices.splice(idx,1); save();
  afterPrecautionChange(true); toast("Removed — plan updated.");
}
function addCustomPrecaution(){
  const t = $("#precautionsOut .addprec-t").value.trim();
  if(!t){ toast("Type a reminder first."); return; }
  const wv = $("#precautionsOut .addprec-w").value;
  const w = wv==="" ? null : Math.max(0, parseInt(wv));
  (state.customPrecautions = state.customPrecautions || []).push({ t, w: isNaN(w)?null:w });
  save(); afterPrecautionChange(false); toast("Reminder added.");   // custom reminders don't reshape the plan
}
function removeCustomPrecaution(idx){
  if(!state.customPrecautions) return;
  state.customPrecautions.splice(idx,1); save(); afterPrecautionChange(false); toast("Reminder removed.");
}

/* =====================================================================
   CLINICIAN / PHYSICIAN PROTOCOL — let a clinician add their own protocol
   as its own program section (phases + exercises), shown verbatim.
===================================================================== */
/* Forgiving parser: "Phase …" lines start a phase (optional "(weeks 0-2)" and
   "goal: …"); other non-blank lines are exercises "Name — sets×reps — cue". */
function parseClinProtocol(text){
  const lines = String(text||"").split(/\r?\n/);
  const phases = [];
  let cur = null;
  const newPhase = (title, weeks, goal)=>{ cur = { title: title || ("Phase "+(phases.length+1)), weeks: weeks||"", goal: goal||"", ex: [] }; phases.push(cur); };
  for(const raw of lines){
    const line = raw.trim();
    if(!line) continue;
    if(/^phase\b/i.test(line) || /^(stage|block|week\s*\d)\b/i.test(line)){
      let rest = line.replace(/^(phase|stage|block)\s*\d*\s*[:\-–]?\s*/i,"").trim();
      let weeks = "", goal = "";
      const wk = rest.match(/\(?\s*weeks?\s*([\d]+\s*(?:[–\-]|to)\s*[\d]+|[\d]+\+?)\s*\)?/i);
      if(wk){ weeks = "weeks "+wk[1].replace(/\s+/g,"").replace("to","–").replace("-","–"); rest = rest.replace(wk[0],"").trim(); }
      const gm = rest.match(/goal\s*[:\-]\s*(.*)$/i);
      if(gm){ goal = gm[1].trim(); rest = rest.replace(gm[0],"").trim(); }
      rest = rest.replace(/[—\-–|,;:]\s*$/,"").trim();
      newPhase(rest, weeks, goal);
      continue;
    }
    if(!cur) newPhase("Clinician-prescribed exercises","","");
    let l = line.replace(/^[\-\*•·▪]\s*/,"").replace(/^\d+[\.\)]\s*/,"").trim();
    if(!l) continue;
    const parts = l.split(/\s*\|\s*|\s+[—–]\s+|\t+/).map(s=>s.trim()).filter(Boolean);
    let n = parts[0] || l, d = parts[1] || "", c = parts.slice(2).join(" — ") || "";
    if(!parts[1]){
      const m = l.match(/^(.*?)[\s,]+(\d+\s*[x×]\s*\d+.*|\d+\s*(?:s|sec|secs|min|reps?)\b.*)$/i);
      if(m){ n = m[1].trim().replace(/[—\-–,]$/,"").trim(); d = m[2].trim(); }
    }
    if(!d) d = "as prescribed";
    cur.ex.push({ n, d, c });
  }
  return { phases: phases.filter(p=>p.ex.length) };
}
const CLIN_EXAMPLE = `Phase 1: Protection (weeks 0-2) — goal: control swelling, restore full extension
- Quad sets — 3×10 — lock the knee straight
- Heel slides — 3×15 — regain bend gently
- Straight-leg raises — 3×10
Phase 2: Early strength (weeks 3-6) — goal: normalise gait, build quad strength
- Mini squats (0–45°) — 3×12 — knees over toes
- Leg press (light) — 3×10
- Stationary bike — 10 min
Phase 3: Return to function (weeks 7-12)
- Step-downs — 3×10 each — control, no knee collapse
- Single-leg balance + reach — 3×8 each`;
/* Editable starter auto-loaded into the clinician form for a clinician-guided session. */
const CLIN_STARTER = `Phase 1: Protection (weeks 0-2) — goal: protect, control swelling, restore motion
- Quad sets — 3×10 — hold 5s
- Ankle pumps — 3×20
- Heel slides — 3×15
Phase 2: Early strength (weeks 3-6) — goal: normalise gait, build strength
- Mini squats — 3×12 — pain-free range
- Standing hip abduction — 3×12 each
- Stationary bike — 10 min
Phase 3: Return to function (weeks 7-12) — goal: full strength & control
- Step-ups — 3×10 each
- Single-leg balance — 3×30s each`;
function clinicianProtocolCards(){
  const list = state.clinicianProtocols || [];
  return list.map((pr,i)=>{
    const phases = pr.phases.map((ph,pi)=>{
      const key = "clin-"+i+"-"+pi;
      const open = (pi===0 || openPhases.has(key)) ? "open" : "";
      const rows = ph.ex.map(e=>exItemHTML({ n:e.n, d:e.d, c:e.c })).join("");
      return `<div class="phase ${open}">
        <div class="head" onclick="togglePhase(this,'${key}')">
          <div class="pnum">${pi+1}</div>
          <div><div class="ptitle">${esc(ph.title)}${ph.weeks?` <span class="pweeks">· ${esc(ph.weeks)}</span>`:""}</div>
          ${ph.goal?`<div class="goal">${esc(ph.goal)}</div>`:""}</div>
          <div class="caret">▾</div>
        </div>
        <div class="body"><ul class="exlist">${rows}</ul></div></div>`;
    }).join("");
    return `<div class="card clincard">
      <h2>🩺 ${esc(pr.name)} <span class="clinbadge">Clinician-provided</span>
        <button class="clindel no-print" data-idx="${i}" title="Remove this protocol">✕</button></h2>
      ${pr.source?`<p class="hint">Source: ${esc(pr.source)}.</p>`:""}
      <div class="banner info" style="margin-top:4px"><b>Shown exactly as you entered it.</b> This is your clinician's protocol — the app's automatic exercise-safety filtering is <b>not</b> applied to it. Follow your clinician's own guidance and dosing.</div>
      ${phases}
    </div>`;
  }).join("");
}
/* ---- Clinician section (step 4): exercise protocol + precaution protocol inputs ---- */
function initClinician(){
  const host = $("#clinicianOut"); if(!host) return;
  host.innerHTML = clinicianIntroCard() + clinicianFormCard() + clinPrecautionCard() + clinicianAddedSummary();
  wireClinician();
  // clinician-guided session → auto-populate an editable starter protocol whenever the form is empty
  // and nothing's been added yet (so it survives navigating away and back before adding).
  if(state.clinicianGuided && !(state.clinicianProtocols||[]).length){
    const t=$("#clinicianOut #clinText"), n=$("#clinicianOut #clinName");
    if(t && !t.value.trim()){ t.value = CLIN_STARTER; if(n && !n.value.trim()) n.value = "Clinician protocol (adjust as needed)"; updateClinPreview(); }
  }
}
/* Reflect the History "Clinician-guided" checkbox in the card styling + Next button.
   Next always continues to the Clinician step (→ Injury → Details); the checkbox only
   decides whether that step arrives pre-filled with a starter protocol to adjust. */
function syncClinGuide(){
  const on = !!state.clinicianGuided;
  const card = $("#clinGuideCard"); if(card) card.classList.toggle("on", on);
  const btn = $("#historyNext"); if(btn) btn.textContent = on ? "Next: clinician setup →" : "Next: continue →";
  const sub = $("#clinGuideSub"); if(sub) sub.innerHTML = on
    ? `<b>On.</b> <b>Next</b> opens the <b>Clinician step</b> pre-filled with a protocol to adjust, then Injury and Details.`
    : `Tick this if a <b>clinician</b> is setting up this program — the Clinician step will arrive pre-filled with a protocol to adjust. Either way, <b>Next</b> continues through <b>Clinician → Injury → Details</b> (the Clinician step is optional — patients can just click through it).`;
}
function clinicianIntroCard(){
  return `<div class="card clinintro">
    <h2>🩺 Clinician / physician inputs <span class="clinbadge">optional</span></h2>
    <p class="hint">For a clinician, surgeon or physiotherapist (or a patient entering what they were given). Anything you add here <b>updates the Program</b>: an exercise protocol becomes its own program section (shown exactly as entered), and a precaution protocol appears in the Precautions area. Everything is saved on this device. Not a clinician? You can skip this step.</p>
  </div>`;
}
function clinPrecautionCard(){
  const v = state.clinPrecautionProtocol || "";
  return `<div class="card clinformcard no-print">
    <h2>🛡️ Clinician precaution protocol</h2>
    <p class="hint">Add precaution or activity-restriction orders in your own words (e.g. weight-bearing details, ROM limits, brace wear, sternal/spinal precautions, "no resisted knee extension 0–45° for 6 weeks"). This is shown verbatim in the <b>Precautions area</b> alongside the app's precautions.</p>
    <textarea id="clinPrecText" rows="5" placeholder="e.g. PWB 50% left leg × 6 weeks · ROM 0–90° knee flexion · hinged brace locked 0–30° · no open-chain knee extension 0–40°">${esc(v)}</textarea>
    <div class="clinbtns"><button class="btn primary" id="clinPrecSave" type="button">Save precaution protocol</button>
      ${v?`<button class="btn ghost" id="clinPrecClear" type="button">Clear</button>`:""}</div>
  </div>`;
}
function clinicianAddedSummary(){
  const list = state.clinicianProtocols || [];
  const prec = (state.clinPrecautionProtocol||"").trim();
  if(!list.length && !prec) return "";
  const items = list.map((pr,i)=>`<li class="clinsumrow"><span>🩺 <b>${esc(pr.name)}</b> — ${pr.phases.length} phase${pr.phases.length>1?"s":""}, shown in your Program</span><button class="clindel2 no-print" data-idx="${i}" title="Remove">✕</button></li>`).join("");
  const precRow = prec ? `<li class="clinsumrow"><span>🛡️ <b>Precaution protocol</b> — shown in your Precautions area</span></li>` : "";
  return `<div class="card clinsumcard"><h2>✅ Added — reflected in your program</h2>
    <ul class="clinsumlist">${items}${precRow}</ul></div>`;
}
function wireClinician(){
  const clinAdd = $("#clinicianOut #clinAdd"); if(clinAdd) clinAdd.onclick = addClinProtocol;
  const clinEx = $("#clinicianOut #clinExample"); if(clinEx) clinEx.onclick = fillClinExample;
  const clinText = $("#clinicianOut #clinText"); if(clinText){ clinText.oninput = updateClinPreview; updateClinPreview(); }
  const precSave = $("#clinicianOut #clinPrecSave"); if(precSave) precSave.onclick = saveClinPrecaution;
  const precClear = $("#clinicianOut #clinPrecClear"); if(precClear) precClear.onclick = ()=>{ state.clinPrecautionProtocol=""; save(); initClinician(); renderPrecautions(); toast("Precaution protocol cleared."); };
  $$("#clinicianOut .clindel2").forEach(b=>b.onclick=()=>removeClinProtocol(+b.dataset.idx));
}
function saveClinPrecaution(){
  const t = $("#clinicianOut #clinPrecText"); if(!t) return;
  state.clinPrecautionProtocol = t.value.trim(); save();
  renderPrecautions();                                  // show it in the Precautions area
  initClinician();                                      // refresh the summary
  toast(state.clinPrecautionProtocol ? "Precaution protocol saved — see the Precautions area." : "Precaution protocol cleared.");
}
function clinicianFormCard(){
  return `<div class="card clinformcard no-print">
    <h2>🩺 Add a clinician / physician exercise protocol</h2>
    <p class="hint">Have a protocol from your surgeon, physiotherapist or physician? Add it here and it becomes its own section in your program — with expandable phases and exercises you can tap to Explain. It's saved on this device.</p>
    <div class="clinform">
      <input type="text" id="clinName" placeholder="Protocol name — e.g. Dr. Lee · ACL reconstruction" />
      <input type="text" id="clinSource" placeholder="Clinician / clinic / source (optional)" />
      <textarea id="clinText" rows="8" placeholder="Paste or type the protocol, one exercise per line. Example:&#10;Phase 1: Protection (weeks 0-2) — goal: control swelling&#10;- Quad sets — 3×10 — lock the knee straight&#10;- Heel slides — 3×15&#10;Phase 2: Strength (weeks 3-6)&#10;- Mini squats — 3×12&#10;- Leg press — 3×10"></textarea>
      <div class="clinpreview" id="clinPreview"></div>
      <div class="clinbtns">
        <button class="btn ghost" id="clinExample" type="button">Fill example</button>
        <button class="btn primary" id="clinAdd" type="button">Add to my program</button>
      </div>
      <p class="hint" style="margin-top:8px">Tips: start a line with <b>Phase …</b> to begin a phase (optionally add <b>(weeks 0–2)</b> and <b>goal: …</b>). Put each exercise on its own line as <b>Name — sets×reps — optional cue</b> (a dash, or a | between parts). No phases? Everything becomes one list.</p>
    </div>
  </div>`;
}
function updateClinPreview(){
  const t = $("#clinicianOut #clinText"), box = $("#clinicianOut #clinPreview");
  if(!t || !box) return;
  const p = parseClinProtocol(t.value);
  if(!p.phases.length){ box.innerHTML = ""; return; }
  const total = p.phases.reduce((s,ph)=>s+ph.ex.length,0);
  box.innerHTML = `<div class="clinprevhead">Preview — ${p.phases.length} phase${p.phases.length>1?"s":""}, ${total} exercise${total>1?"s":""}:</div>` +
    p.phases.map(ph=>`<div class="clinprevph">• <b>${esc(ph.title)}</b>${ph.weeks?` <span class="clinprevn">· ${esc(ph.weeks)}</span>`:""} <span class="clinprevn">(${ph.ex.length})</span></div>`).join("");
}
function fillClinExample(){
  const t = $("#clinicianOut #clinText"), n = $("#clinicianOut #clinName");
  if(t){ t.value = CLIN_EXAMPLE; }
  if(n && !n.value.trim()){ n.value = "Example · ACL reconstruction protocol"; }
  updateClinPreview();
}
function addClinProtocol(){
  const name = ($("#clinicianOut #clinName").value||"").trim();
  const source = ($("#clinicianOut #clinSource").value||"").trim();
  const parsed = parseClinProtocol($("#clinicianOut #clinText").value);
  if(!parsed.phases.length){ toast("Add at least one exercise line first."); return; }
  (state.clinicianProtocols = state.clinicianProtocols || []).push({ name: name || "Clinician protocol", source, phases: parsed.phases });
  save();
  if(state.program) renderProgram(state.program);   // added protocol shows in the (hidden) program
  initClinician();                                   // refresh the section (clears the form, updates summary)
  toast("Clinician protocol added — it now appears in your Program.");
}
function removeClinProtocol(idx){
  if(!state.clinicianProtocols) return;
  state.clinicianProtocols.splice(idx,1); save();
  if(state.program) renderProgram(state.program);
  if(state.step===1) initClinician();                // refresh the Clinician summary if we're on that step
  toast("Clinician protocol removed.");
}

/* Consolidated safety notes card (universal guidance; prints with the program). */
function safetyNotesCard(prog){
  const body = `<p class="hint">Read this before you start. PhysioPath is educational and does not replace your doctor or physiotherapist — any specific instructions from your care team always take precedence.</p>
    <div class="banner clear" style="margin:0 0 12px"><b>⛔ Stop and rest right away if you feel:</b> sharp, spreading, or rapidly worsening pain · chest pain or pressure · severe or unusual breathlessness · dizziness, light-headedness, or faintness · palpitations · or sudden weakness, numbness, or trouble speaking.</div>
    <b class="safeh">How much pain is okay — the traffic-light rule</b>
    <ul class="safelist">
      <li><span class="dotg"></span><b>Green — keep going:</b> discomfort up to about 3/10 that settles within 24 hours.</li>
      <li><span class="dota"></span><b>Amber — ease off:</b> pain around 4–5/10, or soreness that's worse the next morning. Reduce range/load and progress more slowly.</li>
      <li><span class="dotr"></span><b>Red — stop &amp; get assessed:</b> sharp, severe, or steadily worsening pain, or new swelling, giving-way, or loss of movement.</li>
    </ul>
    <b class="safeh">Train safely</b>
    <ul class="safelist plain">
      <li>Warm up for a few minutes first, and cool down afterward.</li>
      <li>Prioritise good technique over heavy load; increase by about 10% per week at most.</li>
      <li>Breathe normally — never hold your breath during effort.</li>
      <li>Do balance work beside a sturdy support if you feel at all unsteady.</li>
      <li>Stay hydrated, and stop if you feel unwell, faint, or overheated.</li>
    </ul>
    <div class="redflags" style="margin-top:12px"><b>⚠ Seek urgent care</b> for: chest pain, severe breathlessness, fainting, sudden weakness/numbness or trouble speaking, loss of bladder or bowel control, a hot swollen joint with fever, or calf pain/swelling with breathlessness.</div>
    ${prog && prog.clearance ? `<p class="hint" style="margin-top:10px"><b>Because of your history, get medical clearance before starting</b> — ideally with supervised rehab. See your personalised precautions in the Details step.</p>` : ""}`;
  const badge = prog && prog.clearance ? `<span class="collapsebadge">⚠ clearance</span>` : "";
  return collapsibleCard("safety", "safetycard", "🛟 Safety notes", body, badge);
}

/* =====================================================================
   HOME MODE — adapt the plan to ordinary household objects.
   Render-time transform (like medication filtering): never mutates
   state.program, so it's fully reversible and keeps the user's edits.
===================================================================== */
/* Gym equipment (the exercise's `equipment` field) -> household stand-in
   used as the name prefix + a "how to improvise it" note. */
const HOME_PREFIX = {
  "Dumbbell":  {sub:"Soup-can",   note:"Hold a soup/bean can, a filled water bottle, or a small bag of rice in each hand. Start light (~0.5–1 kg) and add water, coins or rice to progress."},
  "Kettlebell":{sub:"Water-jug",  note:"Use a filled water jug, a laundry-detergent bottle, or a loaded shopping bag held by the handle."},
  "Barbell":   {sub:"Backpack",   note:"Swap the barbell for a backpack loaded with books, or a broomstick across the shoulders with a filled bag hung at each end. Keep it light and controlled."},
  "Med-ball":  {sub:"Ball",       note:"Use a basketball, a filled pillowcase, or a small backpack in place of a medicine ball."},
  "Sandbag":   {sub:"Duffel-bag", note:"Fill a duffel bag or backpack with books, rice or laundry to build a home 'sandbag'."},
  "Suspension":{sub:"Door-towel", note:"Loop a strong bath towel or bedsheet over the top of a closed, latched door (or around a sturdy post) and hold both ends."},
  "Cable":     {sub:"Door-band",  note:"Anchor a resistance band — or a bungee cord / bike inner-tube — in a door hinge or around a heavy sofa leg to replace the cable."},
  "Machine":   {sub:"Band",       note:"No machine needed — do the band or bodyweight version at home."},
  "Band":      {sub:"",           note:"No band? A pair of tights, a long belt or a bungee cord works; for many drills a towel you pull against yourself gives similar resistance."}
};
/* In-name equipment tokens -> [regex, replacement text, note]. Applied after
   the prefix swap so props like a plyo box or foam pad also get improvised. */
const HOME_TOKEN = [
  [/cane-assisted/i, "broomstick-assisted", "Use a broomstick, mop handle or umbrella as the assisting 'cane'."],
  [/\bBOSU\b|on foam|on unstable surface|unstable surface/i, "on a cushion", "Stand on a firm sofa cushion, a folded towel or a pillow for the unstable-surface challenge — keep sturdy support nearby."],
  [/\bbox\b/i, "step", "Use the bottom stair, a low sturdy stool, or a solid chair seat as the 'box' — make sure it can't slip or tip."],
  [/\bslider\b/i, "towel-slide", "Put a hand towel (on a hard floor) or a sock (on carpet) under the moving foot or hand to slide."],
  [/sled push \/ drag|\bsled\b/i, "loaded-box push", "Push a laundry basket or box loaded with books across a carpet or smooth floor."],
  [/45° bench|\bbench\b/i, "sofa/step", "Use the edge of a sofa, a bed, a staircase, or a sturdy chair instead of a bench."],
  [/\bplate\b/i, "book", "Hold a heavy book, a baking tray, or a filled water bottle instead of a weight plate."],
  [/\(poles\)|\bpoles\b/i, "with broomsticks", "Use two broomsticks, mop handles, or ski/trekking poles."]
];
/* Cardio 'machine' work -> a no-equipment home substitute (keyword on name). */
const HOME_CARDIO = [
  [/cycl|bike/i,        "Ride a real bike if you have one, or march / step in place and pump the arms; a seated 'march' in a chair works if standing is limited."],
  [/row/i,              "Replace with band or towel seated rows plus a hip hinge; or brisk incline walking for the aerobic effect."],
  [/elliptical|cross-trainer/i, "Brisk walking, marching on the spot, or repeated sit-to-stands give a similar low-impact aerobic workout."],
  [/stair/i,            "Use a real staircase — step up and down a safe number of stairs at a steady pace, holding the rail."],
  [/treadmill/i,        "Walk outdoors or around the house, or march on the spot; add a hallway 'shuttle' to keep it continuous."],
  [/swim|aqua/i,        "Aquatic work needs a pool — on land, substitute a gentle full-body circuit (marching, arm circles, sit-to-stands)."],
  [/walk|jog|run/i,     "Walk or jog outdoors or around the house; a hallway shuttle or marching on the spot works in bad weather."]
];
/* Household object reference for the "what can I use?" list. */
const HOME_GEAR = [
  ["Dumbbells","Soup/bean cans, filled water bottles, a bag of rice/flour/sugar, filled socks, or tins of paint"],
  ["Kettlebell","A filled water jug, a detergent bottle, a paint can, or a loaded shopping/tote bag by the handle"],
  ["Barbell","A broomstick or mop handle with a loaded bag hung at each end, or a heavy backpack across the shoulders"],
  ["Weight plates","Heavy books, a baking tray, a bag of sugar/flour, a large tin, or paving slabs"],
  ["Heavier weights","A loaded backpack or suitcase, a bucket of water/sand, a bag of cat litter, a car tyre, or a cinder block"],
  ["Resistance band / cable","Tights or pantyhose, a bungee cord, a bike inner-tube, an old belt/tie, or a towel; anchor a band in a door or around a sofa leg"],
  ["Medicine ball","A basketball, a filled pillowcase, a small backpack, or a bag of flour"],
  ["Slam ball / sandbag","A duffel bag or backpack filled with books, rice, sand or laundry"],
  ["Suspension trainer (TRX)","A strong bath towel or bedsheet looped over the top of a closed, latched door"],
  ["Pull-up bar","A door-frame pull-up bar, a sturdy scaffold/park bar, a strong low tree branch, or do inverted rows gripping the edge of a solid table"],
  ["Dip bars","The edges of two sturdy chairs, kitchen worktops, or parallel counters"],
  ["Plyo box / step / bench","The bottom stair, a low sturdy stool, a solid chair, a coffee table, or the edge of a bed/sofa"],
  ["Aerobic step","The bottom stair or a thick sturdy book/board that won't slip"],
  ["Balance pad / BOSU / wobble board","A firm sofa cushion, a folded towel/blanket, a pillow, or a rolled-up yoga mat"],
  ["Gym sliders","A hand towel or paper plate on a hard floor, or socks on carpet"],
  ["Weight sled","A laundry basket, a box, or a towel loaded with books, pushed/dragged across the floor"],
  ["Foam roller","A rolling pin, a filled water/wine bottle, or a rolled-up towel; a tennis/lacrosse ball for trigger points"],
  ["Ab wheel","A hand towel or paper plates on a smooth floor, or a filled round bottle to roll"],
  ["Ankle / wrist weights","A long sock filled with rice or coins and tied on, or a resistance band"],
  ["Weight vest","A backpack loaded evenly (or one on the front and one on the back)"],
  ["Grip / forearm trainer","Squeeze a tennis ball, a rolled sock, or a bulldog clip; a towel wrung out"],
  ["Jump rope","An actual rope or length of washing line, or just mime the skip if space/ceiling is tight"],
  ["Agility ladder","Lay a rope in rungs, chalk/tape lines on the floor, or space out socks/cups"],
  ["Cones / markers","Cups, tin cans, shoes, water bottles, or rolled-up socks"],
  ["Exercise cane / bar","A broomstick, mop handle, umbrella, or length of dowel"],
  ["Yoga block / strap","A thick book or stack of books; a belt, tie, dressing-gown cord or towel as the strap"],
  ["Cardio machine","Brisk walking, marching on the spot, stair-climbing at home, sit-to-stands, or a skipping rope"]
];
/* Note-only home swaps: add a "how to improvise" note without renaming the exercise. */
const HOME_NOTE = [
  [/pull-?up|chin-?up|lat pull-?down|pull-?down|dead-?hang/i, "No bar? Grip the edge of a sturdy table for inverted rows, use a door-frame pull-up bar or a strong tree branch, or anchor a band over a door for pull-downs."],
  [/\bdip\b|triceps dip|bench dip/i, "Use the edges of two sturdy chairs or a kitchen worktop for dips — make sure they're stable."],
  [/foam[- ]?roll/i, "No foam roller? A rolling pin, a filled water/wine bottle, or a rolled towel works; a tennis ball for trigger points."],
  [/skipping|jump rope|jump-?rope/i, "Use an actual rope or washing line, or just mime the skip if the ceiling/space is tight."],
  [/\bladder\b|agility ladder/i, "No ladder? Lay a rope in rungs, or chalk/tape lines (or space out socks) on the floor."],
  [/\bhangboard|finger[- ]?board/i, "Use a sturdy door frame or a solid ledge for finger holds — go very gently and stop if the fingers hurt."],
  [/med-?ball throw|wall ball|slam/i, "Use a basketball or a small loaded backpack against a solid outside wall (not a window)."]
];
const HOME_LIGHT = new Set(["Dumbbell","Kettlebell","Barbell","Med-ball","Sandbag"]); // improvised loads run light -> cue higher reps
/* Program exercises don't carry an `equipment` field, so infer it from the
   leading word of the name (the generator prefixes it: "Dumbbell …", "Cable …").
   reEsc() (regex-escape helper) is defined later in this file — fine, both are
   only referenced at render time, after the whole script has evaluated. */
function detectEquip(e){
  if(e.equipment && HOME_PREFIX[e.equipment]) return e.equipment;
  for(const k of Object.keys(HOME_PREFIX)){
    if(new RegExp("^"+reEsc(k)+"\\b","i").test(e.n)) return k;
  }
  return "";
}
/* Return a display copy of an exercise adapted for household objects.
   Non-destructive: keeps tags/pattern/region/sig/warn/sub so the engine,
   Explain and cardio-target logic still work on the copy. */
function homeSwap(e){
  if(!e) return e;
  const o = Object.assign({}, e);
  const notes = [];
  let name = e.n;
  const equip = detectEquip(e);
  // 1) primary equipment -> household stand-in (skip cardio machines: handled below)
  const isCardio = (e.tags||[]).includes("aerobic") || e.pattern==="cardio";
  const pfx = HOME_PREFIX[equip];
  if(pfx && !(equip==="Machine" && isCardio)){
    if(pfx.sub){
      const re = new RegExp("^"+reEsc(equip)+"\\b","i");
      name = re.test(name) ? name.replace(re, pfx.sub) : pfx.sub+" "+name;
    }
    if(pfx.note) notes.push(pfx.note);
  }
  // 2) in-name equipment tokens (box, foam, slider, sled, bench, plate, cane, poles)
  for(const [re, rep, note] of HOME_TOKEN){
    if(re.test(name)){ name = name.replace(re, rep); if(note) notes.push(note); }
  }
  // 3) cardio substitution note
  if(isCardio){
    for(const [re, note] of HOME_CARDIO){ if(re.test(e.n)){ notes.push(note); break; } }
  }
  // 3b) note-only improvisations (pull-up bar, dip bars, foam roller, rope, ladder…)
  for(const [re, note] of HOME_NOTE){ if(re.test(e.n)){ notes.push(note); break; } }
  // 4) lighter improvised loads -> nudge toward higher reps / slower tempo
  if(HOME_LIGHT.has(equip) && /^\s*\d+\s*[×x]/.test(e.d||"")){
    notes.push("Household weights are light — do more reps (aim 12–20) or slow the tempo so the last few feel hard.");
  }
  o.n = name.replace(/\s{2,}/g," ").trim();
  if(notes.length){ o.home = true; o.homeNote = notes.join(" "); }
  return o;
}
/* The Home-mode button + reference card shown in the Program. */
function homeCard(adaptedCount){
  const on = !!state.homeMode;
  const gear = HOME_GEAR.map(([g,h])=>`<tr><td>${esc(g)}</td><td>${esc(h)}</td></tr>`).join("");
  const banner = on ? `<div class="banner load" style="margin:12px 0 0"><b>🏠 Home mode is ON.</b> ${
      adaptedCount>0 ? `${adaptedCount} exercise${adaptedCount===1?"":"s"} adapted to use everyday objects.` : "Your exercises already use bodyweight or household items."
    } Tap ⓘ on any exercise for the household swap.</div>` : "";
  return `<div class="card homecard">
    <h2>🏠 Home-friendly equipment</h2>
    <p class="hint">No gym? Turn on Home mode to adapt every exercise in your plan to <b>ordinary objects you already have</b> — soup cans, water jugs, a broomstick, a backpack, a sturdy chair. It only changes how the plan is displayed, keeps any exercises you've edited, and is fully reversible.</p>
    <label class="medfilter no-print">
      <input type="checkbox" id="homeModeToggle" ${on?"checked":""} />
      <span><b>Adapt my plan for home (use household objects)</b> — rewrites gym equipment into everyday-object equivalents and adds a "how to improvise it" note to each exercise.</span>
    </label>${banner}
    <details class="homegear"${on?" open":""}>
      <summary>What household objects can I use?</summary>
      <table class="hometbl"><thead><tr><th>Instead of…</th><th>Use at home</th></tr></thead><tbody>${gear}</tbody></table>
      <p class="hint" style="margin-top:8px">⚠ Safety: make sure chairs/steps can't slip or tip, load bags/backpacks only as heavy as you can control, and check your grip on cans and bottles. Get clearance first if your plan advises it.</p>
    </details>
  </div>`;
}

/* Return-to-activity & sport goals card + the sport-specific focus notes. */
function returnGoalsCard(){
  const acts = state.returnActivities || [], sports = state.returnSports || [];
  if(!acts.length && !sports.length) return "";
  const foci = matchedSportDemands().map(d=>d.note);
  const actHtml = acts.length ? `<div class="rgblock"><b>🎯 Everyday activities you're working toward:</b> ${acts.map(esc).join(" · ")}</div>` : "";
  const sportHtml = sports.length ? `<div class="rgblock"><b>🏅 Sport goals:</b> ${sports.map(esc).join(" · ")}</div>` : "";
  const focusHtml = foci.length ? `<ul class="notelist">${foci.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>
    <p class="hint">Sport-specific drills have been woven into your later phases (look for the <b>🏅 sport</b> tag). Return-to-sport work is late-stage — get clearance from your clinician and pass return-to-sport criteria (near-full strength, control and confidence, ~90%+ of the other side) before full return.</p>` : "";
  return `<div class="card rgcard">
    <h2>🎯 Your return-to-activity &amp; sport goals</h2>
    ${actHtml}${sportHtml}${focusHtml}
    ${(!foci.length && sports.length) ? `<p class="hint">Your plan already targets the strength, control and confidence you'll need — progress the later phases toward these goals.</p>` : ""}
  </div>`;
}

/* Medication considerations card. */
function medicationCard(medHiddenTotal){
  const meds = selectedMeds();
  if(!meds.length) return "";
  const flags = [...new Set(meds.flatMap(m=>m.flags||[]))].filter(f=>MED_EFFECT[f]);
  const list = meds.map(m=>{ const d=(state.medDoses||{})[m.id]; return esc(m.name)+(d?` <span class="medcard-dose">(${esc(d)})</span>`:""); }).join(", ");
  const body = flags.length
    ? `<ul class="notelist">${flags.map(f=>`<li>${MED_EFFECT[f]}</li>`).join("")}</ul>`
    : `<p class="hint">No specific exercise considerations flagged for these — but always tell your clinician what you take.</p>`;
  const canFilter = meds.some(m=>(m.flags||[]).some(f=>MED_FILTERABLE.includes(f)));
  const toggle = canFilter ? `<label class="medfilter no-print">
      <input type="checkbox" id="medFilterToggle" ${state.medFilter?"checked":""} />
      <span><b>Apply medication safety filtering to my plan</b> — hide high-impact, tendon-loading, contact, and balance exercises for high-risk medicines (fluoroquinolone antibiotics, blood thinners, sedating medicines). Off by default, fully reversible, and it keeps any exercises you've changed. A clinician's judgement still applies.</span>
    </label>` : "";
  const active = (state.medFilter && canFilter) ? `<div class="banner load" style="margin:12px 0 0"><b>🔒 Medication safety filtering is ON.</b> ${
      medHiddenTotal>0 ? `${medHiddenTotal} higher-risk exercise${medHiddenTotal===1?"":"s"} hidden from your plan.` : "No exercises needed hiding."
    } ${esc(window.notesForFlags(medExerciseFlags()).join(" "))}</div>` : "";
  return `<div class="card medcard">
    <h2>💊 Medication considerations for exercise</h2>
    <p class="hint">Based on your medications (${list}). These are <b>general considerations</b>, not prescribing advice — your prescriber and pharmacist are the authority on your medicines.</p>
    ${body}
    ${toggle}${active}
  </div>`;
}

/* Heart-rate, vital-signs & Borg-RPE exertion card. */
function vChip(k,val,warn){ return `<div class="vitalchip${warn?" warn":""}"><span class="vk">${esc(k)}</span><span class="vv">${esc(val)}</span></div>`; }
function borgScaleHTML(target){
  const rows = BORG_SCALE.map(([n,lab,desc])=>{
    const on = target && n>=target.lo && n<=target.hi;
    return `<div class="borgrow${on?" on":""}"><span class="bn">${n}</span><span class="bl">${esc(lab)}</span><span class="bd">${esc(desc||"")}</span></div>`;
  }).join("");
  return `<div class="borgwrap"><div class="borghead">Borg RPE 6–20 · perceived exertion <span class="sub">(the number × 10 ≈ heart rate)</span></div>${rows}</div>`;
}
function vitalsCard(prog){
  const v = state.vitals||{}, hz = hrZones(), beta = onBetaBlocker(), b = borgTarget();
  const bmi = bmiCalc(v.height,v.weight), fset = new Set(vitalFlags());
  const chips=[];
  if(vnum(v.restHR)!=null) chips.push(vChip("Resting HR", `${vnum(v.restHR)} bpm`, fset.has("vital_tachy")||fset.has("vital_brady")));
  if(vnum(v.sbp)!=null && vnum(v.dbp)!=null) chips.push(vChip("Blood pressure", `${vnum(v.sbp)}/${vnum(v.dbp)}`, fset.has("vital_bp_high")||fset.has("vital_bp_crisis")));
  if(vnum(v.spo2)!=null) chips.push(vChip("SpO₂", `${vnum(v.spo2)}%`, fset.has("vital_hypoxia")));
  if(vnum(v.rr)!=null) chips.push(vChip("Resp. rate", `${vnum(v.rr)}/min`, vnum(v.rr)>20||vnum(v.rr)<10));
  if(bmi!=null) chips.push(vChip("BMI", `${bmi} · ${bmiCategory(bmi)}`, bmi<18.5||bmi>=30));

  let hrBlock;
  if(hz){
    hrBlock = `<p class="hint" style="margin:2px 0 8px"><b>Estimated maximum heart rate ≈ ${hz.hrmax} bpm</b> — Tanaka formula (208 − 0.7 × ${esc(String(state.age))}). Target zones ${hz.rest?`use the <b>Karvonen</b> method with your resting HR ${hz.rest} bpm`:"are a <b>percent of your max HR</b>"}.</p>
      <div class="zonetable">
        <div class="zonerow zw"><span>Warm-up / very light</span><b>${fmtRange(hz.zones.warmup)} bpm</b></div>
        <div class="zonerow zm"><span>Moderate — build fitness</span><b>${fmtRange(hz.zones.moderate)} bpm</b></div>
        <div class="zonerow zv"><span>Vigorous — only as cleared</span><b>${fmtRange(hz.zones.vigorous)} bpm</b></div>
      </div>`;
    if(beta) hrBlock += `<div class="banner clear" style="margin:8px 0 0"><b>You take a beta-blocker.</b> Your heart rate won't rise the way these numbers assume — judge effort by the <b>Borg RPE / talk-test</b> below, not bpm.</div>`;
  } else {
    hrBlock = `<div class="banner info" style="margin:2px 0 8px">Add your <b>age</b> in the History step and we'll calculate your <b>maximum heart rate</b> (Tanaka formula) and personal target zones here.</div>`;
  }

  const aer=[]; (prog.items||[]).forEach(it=>it.phases.forEach(ph=>ph.ex.forEach(e=>{ if(e.tags&&e.tags.includes("aerobic")&&!aer.includes(e.n)) aer.push(e.n); })));
  const monitor = aer.length ? `<b class="safeh">Exercises to track with objective data</b>
    <p class="hint" style="margin:2px 0 6px">These aerobic/endurance items benefit most from a <b>heart-rate monitor</b>${someCardioPulm()?" and a <b>pulse oximeter</b> (SpO₂)":""}. Aim for the target zone and RPE — ease off if you exceed them or feel unwell.</p>
    <ul class="safelist plain">${aer.slice(0,10).map(n=>`<li>${esc(n)}</li>`).join("")}</ul>` : "";

  const vf = vitalFlags();
  const warn = vf.length ? `<div class="banner clear" style="margin:0 0 12px"><b>⚠ Some readings need attention</b><ul class="notelist">${window.notesForFlags(vf).map(n=>`<li>${esc(n)}</li>`).join("")}</ul></div>` : "";

  let deviceBanner = "";
  if(hasCardiacDevice()){
    const cap = deviceHRCeiling(), rate = vnum((state.cardiacDevice||{}).icdRate);
    let msg;
    if(hasLVAD()) msg = "Heart rate and blood pressure aren't reliable with a continuous-flow LVAD — judge effort by the <b>RPE / talk-test</b> below only. Avoid breath-holding, straining and contact, protect the driveline, and follow your VAD team's plan.";
    else if(hasICD()) msg = `Keep your heart rate <b>well below the device's therapy threshold${rate?` (${rate} bpm)`:""}</b> — going above it can trigger a shock.${cap?` We've capped your target zones at <b>${cap} bpm</b>.`:" Add the threshold in the History step and we'll cap your zones; ask your cardiologist for the number."} Judge effort by RPE and stay light–moderate.`;
    else msg = "Respect your device's <b>upper rate limit</b> — build intensity gradually and judge effort by the RPE / talk-test. Ask your cardiologist for your safe ceiling.";
    deviceBanner = `<div class="banner clear" style="margin:0 0 12px"><b>💠 You have a ${esc(cardiacDeviceLabel())}.</b> ${msg}</div>`;
  }

  const body = `<p class="hint">Objective targets for how hard to work — personalized from your age and any vitals you entered. Educational only; your care team's limits always take precedence.</p>
    ${warn}${deviceBanner}
    ${chips.length?`<div class="vitalchips">${chips.join("")}</div>`:""}
    ${hrBlock}
    <b class="safeh">Your recommended effort: ${esc(b.label)}</b>
    ${borgScaleHTML(b)}
    ${monitor}`;
  const badge = (vf.length || hasCardiacDevice()) ? `<span class="collapsebadge">⚠ alerts</span>` : "";
  return collapsibleCard("vitals", "vitalcard", "❤️ Heart rate, vitals &amp; exertion targets", body, badge);
}

/* Condition- & history-specific "other risks to be aware of" (complements the generic safety notes). */
const RISK_KEYWORDS = [
  [/tendinop|tendinit|tendinos/, "Tendons flare when load rises too fast — build up gradually. Pain that's worse the next morning means you overdid it, and a sudden sharp pain or 'pop' could be a tear: stop and get assessed."],
  [/stress fracture/, "A stress fracture can worsen with continued impact — respect the reduced-loading period; increasing, localised pain that's worse with activity means back off and get re-checked."],
  [/\bfracture\b|orif|malleolus|colles/, "Watch for increasing pain, deformity, or being unable to use the limb — the bone may not have healed or may have shifted. After a lower-limb injury, watch for a hot, swollen, painful calf (possible clot)."],
  [/\bacl\b|\bpcl\b|\bmcl\b|\blcl\b|ligament|reconstruction|graft|instability|dislocation|subluxation/, "Giving-way, locking, or new swelling means ease off and get it checked — protect the healing ligament/graft, and don't rush return-to-sport ahead of strength and control."],
  [/meniscus/, "Locking or catching, the knee 'giving way', or new swelling after activity means you've done too much — reduce load and get assessed."],
  [/disc|radiculopath|sciatica|stenosis|herniation|nerve root/, "Spreading numbness or weakness, a foot that drops, or worsening leg/arm symptoms mean stop and get reviewed. Any loss of bladder or bowel control, or numbness around the groin, is an emergency — seek urgent care."],
  [/replacement|arthroplasty/, "Sudden severe pain, inability to bear weight, a limb that looks shorter or rotated, or a clunk could be a dislocation or loosening — seek care. Also watch for infection (spreading redness, warmth, fever) and calf-clot signs."],
  [/rotator cuff|cuff repair/, "Sharp catching, sudden weakness lifting the arm, or worsening night pain can mean the repair is being overloaded — respect your sling and loading limits."],
  [/achilles|calf|gastrocnem/, "A sudden 'kick' in the back of the leg, a gap you can feel, or being unable to push off could be a rupture — stop and seek care."],
  [/plantar fasci|heel|\bfoot\b/, "Sharp heel pain that's worst on the first steps of the day means the tissue is irritated — reduce impact; a sudden pop could be a tear."],
  [/frozen shoulder|adhesive capsulitis/, "Forcing painful end-range too hard prolongs a frozen shoulder — gentle and frequent wins. New sudden weakness needs review."],
  [/osteoporos|osteopenia|compression|fragility/, "Your bones are more fragile — avoid heavy spinal bending/twisting and high-impact moves; sudden new back pain could be a compression fracture."],
  [/whiplash|neck strain|cervical/, "Dizziness, visual changes, arm numbness or weakness, or trouble with balance or speech after a neck problem need prompt review."],
  [/vestibular|vertigo|bppv|dizzi|labyrinth/, "Falls are the main risk with dizziness — work near support. A sudden severe headache, double vision, or new weakness/numbness needs urgent care, not exercise."],
  [/hamstring/, "A sharp pull or 'pop' at the back of the thigh with sudden weakness may be a tear — stop; rushing sprinting/eccentric work is the usual cause of re-injury."]
];
function riskAwarenessCard(prog){
  const risks = [], seen = new Set();
  const push = m => { if(!seen.has(m)){ seen.add(m); risks.push(m); } };
  const names = selectedConditions().map(c=>c.name.toLowerCase()).join(" | ");
  const flags = new Set(prog.flags);
  const domains = new Set(prog.items.map(i=>i.domain));

  RISK_KEYWORDS.forEach(([re,msg])=>{ if(re.test(names)) push(msg); });

  if(domains.has("cardiac")) push("Stop and rest for chest pain or pressure, unusual breathlessness, palpitations, a cold sweat, or feeling faint — never push through these.");
  if(domains.has("pulmonary")) push("Watch your breathing and oxygen — stop if you're very breathless at rest, dizzy, or your lips/fingertips look blue, and use your reliever/oxygen as prescribed.");
  if(domains.has("neuro")) push("Falls are the biggest risk — always stay within reach of a sturdy support, and seek urgent care for sudden weakness, numbness, trouble speaking, or a severe headache.");

  if(flags.has("recent_surgery") || /post-|recovery|repair|reconstruction|replacement|arthroplasty/.test(names))
    push("After surgery, watch the wound for spreading redness, warmth, discharge or fever (infection), and watch for a hot, swollen, painful calf or sudden breathlessness/chest pain (blood clot) — seek care.");
  if(flags.has("balance_risk")) push("You're at higher fall risk — clear trip hazards, wear supportive footwear, and keep support within arm's reach for standing and balance work.");
  if(flags.has("neuropathy")) push("With reduced sensation, check your feet and hands before and after exercise for blisters, redness or cuts you might not feel, and wear protective footwear.");
  if(flags.has("diabetes")) push("Check your blood sugar around exercise, carry fast-acting carbs, and inspect your feet — small injuries are easy to miss and slow to heal.");
  if(flags.has("hypertension")||flags.has("vital_bp_high")||flags.has("vital_bp_crisis")) push("With raised blood pressure, avoid breath-holding and heavy straining, and stop for headache, chest pain, or vision changes.");
  if(flags.has("osteoporosis")) push("Prioritise good technique over heavy load, and avoid loaded forward bending, twisting and high impact to protect your spine and hips.");
  const medFlags = new Set(selectedMeds().flatMap(m=>m.flags||[]));
  if(medFlags.has("anticoagulant")||medFlags.has("antiplatelet")) push("On blood thinners, bruising and bleeding happen more easily — favour lower-fall-risk exercises, avoid contact/collision, and report unusual bruising or bleeding.");
  if(medFlags.has("beta_blocker")) push("Your beta-blocker blunts heart rate — judge effort by how it feels (RPE / talk-test), not your pulse, and rise slowly to avoid dizziness.");

  if(!risks.length) return "";
  return `<div class="card riskaware">
    <h2>⚠ Other risks to be aware of</h2>
    <p class="hint">Specific to your condition(s), history and medicines — know these warning signs, and stop or seek care if they appear. This adds to (it doesn't replace) the general red flags in your Safety notes.</p>
    <ul class="notelist">${risks.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
  </div>`;
}

/* ---------- render program ---------- */
function renderProgram(prog){
  const out = $("#programOut");
  if(!prog || !prog.items.length){
    out.innerHTML = `<div class="card empty"><div class="big">🗓️</div><div>No program yet — complete the earlier steps and generate.</div></div>`;
    return;
  }
  const trackBadge = prog.track==="acute"
    ? `<span class="badge acute">Acute track · 0–6 wks</span>`
    : `<span class="badge chronic">Chronic track · 6+ wks</span>`;
  const supMap = {self:["Self-guided OK","self"],supervised:["Clinician-supervised advised","supervised"],clinical:["Medical clearance required","clinical"]};
  const [supTxt,supCls] = supMap[prog.supervision];

  let html = `<div class="card">
    <h2>Your ${prog.totalWeeks}-week program ${trackBadge}</h2>
    <p class="hint">Built for ${esc(String(state.weeks))} week(s) in, pain ${state.painRest}/10 at rest and ${state.painMove}/10 on movement${state.surgery==="yes"?", post-surgical":""}.
      ${state.goal?`Goal: <b>${esc(state.goal)}</b>.`:""}</p>
    <div class="summary">
      <div class="stat"><div class="k">Length</div><div class="v">${prog.totalWeeks} wks</div></div>
      <div class="stat"><div class="k">Frequency</div><div class="v" style="font-size:14px">${prog.sessions}</div></div>
      <div class="stat"><div class="k">Conditions</div><div class="v">${prog.items.length}</div></div>
      <div class="stat"><div class="k">Supervision</div><div class="v" style="font-size:13px"><span class="sup ${supCls}">${supTxt}</span></div></div>
    </div>`;

  if(prog.clearance){
    html += `<div class="banner clear"><b>⚠ Get medical clearance before starting.</b> Based on your history and/or condition,
      you should be cleared by a doctor — and ideally supervised (e.g. a cardiac/pulmonary rehab or physiotherapy program) —
      before beginning. Treat everything below as general education to discuss with your care team.</div>`;
  }
  if(prog.notes.length){
    html += `<div class="banner info"><b>Your personalized precautions</b><ul class="notelist">` +
      prog.notes.map(n=>`<li>${esc(n)}</li>`).join("") + `</ul></div>`;
  }
  html += `<div class="banner load"><b>Load guidance:</b> ${esc(prog.load)}</div>`;
  if(prog.removed.length){
    html += `<div class="removed"><b>Adjusted for your safety —</b> we removed exercises involving ` +
      esc([...new Set(prog.removed.map(r=>TAG_LABEL[r.tag]||r.tag))].join(", ")) +
      ` and substituted safer options where needed.</div>`;
  }
  html += `<div class="banner info no-print"><b>✎ Make it yours.</b> On any exercise: tap <b>⟳ Rotate</b> to swap it for the next option, or <b>⇄ Swap…</b> to choose from a list.
    For a whole phase: <b>🔄 Rotate all exercises</b> or <b>↩ Reset to recommended</b>. Everything stays within your precautions and is saved automatically.</div>`;
  html += `</div>`;

  // render-time medication filtering (hide high-risk exercises; fully reversible)
  const mflags = medExerciseFlags();
  let medHiddenTotal = 0;
  if(mflags.length) prog.items.forEach(it=>it.phases.forEach(ph=>{
    medHiddenTotal += window.applyContra(ph.ex, mflags).removed.length;
  }));
  // render-time home adaptation (household-object equivalents; fully reversible)
  let homeAdapted = 0;
  if(state.homeMode) prog.items.forEach(it=>it.phases.forEach(ph=>ph.ex.forEach(e=>{
    if(homeSwap(e).home) homeAdapted++;
  })));

  html += returnGoalsCard();
  html += homeCard(homeAdapted);
  html += safetyNotesCard(prog);
  html += riskAwarenessCard(prog);
  html += vitalsCard(prog);
  html += medicationCard(medHiddenTotal);

  prog.items.forEach((item, ci)=>{
    html += `<div class="card"><h2>${esc(item.name)}</h2>
      <p class="hint">${esc(conditionExplain(item, prog.track))}</p>
      ${item.focus?`<div class="focusline"><b>🎯 Injury-specific focus:</b> ${esc(item.focus)}</div>`:""}`;
    item.phases.forEach((ph,i)=>{
      const key = ci+"-"+i;
      const open = (i===0 || openPhases.has(key)) ? "open" : "";
      const hiddenNames = mflags.length ? new Set(window.applyContra(ph.ex, mflags).removed.map(r=>r.n)) : null;
      const rows = ph.ex.map((e,ei)=>{
        const disp = state.homeMode ? homeSwap(e) : e;      // display copy only — real exercise unchanged
        return exItemHTML(disp, [item.region], {ci, pi:i, ei}, hiddenNames && hiddenNames.has(e.n));
      }).join("");
      html += `<div class="phase ${open}">
        <div class="head" onclick="togglePhase(this,'${key}')">
          <div class="pnum">${i+1}</div>
          <div><div class="ptitle">${esc(ph.title)} <span class="pweeks">· Weeks ${ph.weekStart}–${ph.weekEnd}</span></div>
          <div class="goal">${esc(ph.goal)}</div></div>
          <div class="caret">▾</div>
        </div>
        <div class="body"><ul class="exlist">${rows}</ul>
          <div class="phasetools no-print">
            <span class="phasetoolslbl">Whole phase:</span>
            <button class="addexbtn" data-ci="${ci}" data-pi="${i}">＋ Add exercise</button>
            <button class="rerollbtn" data-ci="${ci}" data-pi="${i}">🔄 Rotate all exercises</button>
            <button class="resetbtn" data-ci="${ci}" data-pi="${i}">↩ Reset to recommended</button>
          </div>
          <div class="addexbox hide no-print" data-ci="${ci}" data-pi="${i}"></div>
          <div class="freq"><b>Advance to the next phase when:</b> ${esc(ph.criteria || "this phase feels controlled and symptoms are low & stable")}. The weeks are a guide, not a rule.</div>
        </div></div>`;
    });
    html += `<div class="redflags"><b>⚠ When to get it checked:</b> ${esc(item.redflags)}</div></div>`;
  });

  html += clinicianProtocolCards();     // any saved physician protocols, shown verbatim (added in the Clinician step)
  html += suggestionsCard(prog);
  out.innerHTML = html;
  wireProgram();
}

function suggestionsCard(prog){
  const acute = prog.track==="acute";
  const base = acute ? [
    "<b>Protect, don't fully rest.</b> Gentle pain-free movement in the early weeks keeps tissue healthy and prevents stiffness.",
    "<b>Swelling:</b> compression, elevation and gentle movement do the most; ice can ease pain in the first few days.",
    "<b>Pain as a guide:</b> mild discomfort is okay; sharp or lingering pain that's worse the next morning means ease off.",
    "<b>Sleep & protein:</b> aim for 7–9 hours and ~1.6 g protein per kg per day to rebuild tissue.",
    "<b>Consistency beats intensity</b>, especially early — short frequent sessions win."
  ] : [
    "<b>Load is the medicine.</b> Chronic tissue improves with steady progressive loading; some discomfort (≤3–4/10) that settles overnight is fine.",
    "<b>Be patient</b> — tissue adapts over weeks to months in a trend, not a straight line. Small flare-ups are normal.",
    "<b>Manage total load:</b> increase by ~10% per week at most.",
    "<b>Address the cause</b> — training errors, footwear, ergonomics, and strength gaps.",
    "<b>Sleep, protein, and stress</b> all change how much your tissues tolerate."
  ];
  const domains = new Set(prog.items.map(i=>i.domain));
  if(domains.has("cardiac")) base.push("<b>Cardiac:</b> use the talk-test — you should be able to hold a conversation. Warm up and cool down fully, and never hold your breath during effort.");
  if(domains.has("pulmonary")) base.push("<b>Breathing:</b> pace exercise with pursed-lip breathing, rest when breathless, and use prescribed oxygen. Breathlessness is expected — dizziness or chest pain is not.");
  if(domains.has("neuro")) base.push("<b>Neurological recovery:</b> repetition and specificity drive change. Practice the actual movements you want back, safely and often, near support.");
  if(state.smoking==="current") base.push("<b>Smoking &amp; healing:</b> tobacco slows tendon, bone and wound healing and lowers exercise capacity — cutting down or quitting meaningfully speeds recovery. Ask your clinician about support.");
  if(state.sleep==="lt6") base.push("<b>Sleep:</b> under 6 hours raises pain sensitivity and slows repair — protecting sleep is one of the highest-value things you can do for recovery.");
  if(state.stress==="high") base.push("<b>Stress:</b> high stress amplifies pain and slows healing — a few minutes of daily breathing or relaxation helps your tissues tolerate load.");
  if(state.alcohol==="heavy") base.push("<b>Alcohol:</b> heavy use impairs muscle repair, sleep and balance — cutting back supports your recovery and lowers fall risk.");
  if(state.falls==="2" || (state.aid && state.aid!=="none")) base.push("<b>Fall safety:</b> do balance and standing work beside a sturdy rail or counter, keep floors clear, and progress difficulty slowly.");
  return `<div class="card"><h2>Suggestions for your recovery</h2><ul class="tips">${base.map(t=>`<li>${t}</li>`).join("")}</ul>
    <p class="hint" style="margin-top:8px">Questions about any of this? Ask <b>Jeffery</b> in the <b>AI</b> tab.</p></div>`;
}

/* =====================================================================
   AI COACH
===================================================================== */
const KB = [
  { kw:["ice","heat","cold","warm","heating pad"], a:()=>"General rule: **ice** calms pain and swelling in the first few days after an acute injury or a flare-up (15–20 min, with a cloth barrier). **Heat** suits chronic stiffness and warming up before exercise. Neither speeds healing much — gentle movement does more. Acute & swollen → ice; stiff & achy → heat." },
  { kw:["pain during","hurts when i exercise","should it hurt","how much pain","pain while","normal to feel pain"], a:()=>`Some discomfort is expected. Rule of thumb: pain **up to ~3–4/10 during and after** exercise is okay **if it settles within 24 hours**. ${state.program&&state.program.track==="chronic"?"For your chronic-stage tissue, that mild loading discomfort is part of recovery. ":""}**Sharp, spreading, or worsening** pain — or being more sore the next morning — means the dose was too much. Reduce and progress slower.` },
  { kw:["how often","how many times","frequency","days per week","every day","daily"], a:()=>`${state.program?`Your plan suggests **${state.program.sessions}**. `:""}Early on, "little and often" beats occasional hard sessions. As you strengthen, 3–5 focused sessions/week with rest between heavier days is ideal.` },
  { kw:["acute","chronic","difference between acute","how long is acute"], a:()=>"**Acute** = recent, roughly the first 0–6 weeks, when tissue is inflamed and healing — care protects it while keeping gentle motion. **Chronic** = beyond ~6 weeks (or recurring) — recovery shifts to **progressive loading and strengthening**. PhysioPath picks the track from how many weeks ago your injury began." },
  { kw:["precaution","contraindication","avoid","not do","safe to do","careful","restrictions","what should i avoid"], a:()=>{
      const n = state.program ? state.program.notes : window.notesForFlags(gatherFlags());
      if(!n.length) return "Based on what you entered, no specific medical precautions were flagged — but always stop for sharp or spreading pain, chest pain, severe breathlessness, or dizziness, and progress gradually.";
      return "Based on your history, keep these in mind:\n\n• " + n.join("\n\n• ");
    } },
  { kw:["clearance","see a doctor","should i see","doctor","emergency","serious","physical therapist","professional","get it checked"], a:()=>{
      const need = state.program ? state.program.clearance : clearanceNeeded(gatherFlags());
      const rf = "**Red flags** needing prompt care: chest pain, severe breathlessness, fainting, sudden weakness/numbness, trouble speaking, loss of bladder/bowel control, a hot swollen joint with fever, or inability to bear weight. ";
      return (need?"Because of your history and/or condition, **you should be cleared by a doctor — ideally supervised — before starting.** ":"") + rf + "This app can't examine you; an in-person assessment is always the safe choice when unsure." } },
  { kw:["swelling","swollen","swell","inflammation"], a:()=>"For swelling: **compression, elevation, and gentle movement** (muscle contractions pump fluid away). Elevate above heart level at rest; a compression sleeve helps. A calf that's suddenly hot, swollen and painful should be checked urgently to rule out a clot." },
  { kw:["eat","food","nutrition","diet","protein","supplement","vitamin"], a:()=>"Healing needs building blocks: **enough protein** (~1.6–2.0 g/kg/day) across meals, plenty of fruit/veg, and enough total calories. Stay hydrated. Supplements don't replace protein, sleep, and progressive loading." },
  { kw:["sleep","rest","tired","recover faster"], a:()=>"Sleep is when most repair happens — aim for **7–9 hours**. Poor sleep raises pain sensitivity and slows healing. Rest days between harder sessions are part of getting stronger." },
  { kw:["stretch","strengthen","strength","which is better"], a:()=>"Both help, but for most conditions **progressive strengthening drives recovery** — it rebuilds capacity. Mobility/stretching restores range and eases stiffness, especially early. Your program blends both." },
  { kw:["flare","worse","setback","re-injure","reinjure","aggravated","overdid"], a:()=>"Flare-ups happen and rarely undo progress. **Drop back a level** for a few days, keep moving gently, and let symptoms settle before progressing. Usually it's too much too soon. Recovery is a trend, not a straight line." },
  { kw:["return to sport","back to running","play again","when can i run","return to running","get back to"], a:()=>`Return when you've rebuilt **strength and control**, not just when pain is gone: full pain-free range, near-equal side-to-side strength, and sport-like movements without flaring. ${state.program?"That's what the final phase builds toward. ":""}Ramp volume ~10%/week.` },
  { kw:["ibuprofen","medication","painkiller","nsaid","advil","tylenol","anti-inflammatory","medicine"], a:()=>"OTC pain relief can help you stay active — check with a pharmacist/doctor about what's right for you. Note: heavy NSAID use may blunt tissue/tendon adaptation, so use the least needed and don't mask pain to push harder. This app can't advise on your specific medications." },
  { kw:["motivation","give up","discouraged","frustrated","slow","not working","boring"], a:()=>"Slow and non-linear is normal — it doesn't mean it isn't working. Track small wins (reps, range, less pain), keep sessions short, and tie them to an existing habit. Stuck for several weeks with no trend? See a physio for a fresh look." },
  { kw:["warm up","warmup","before exercise","cool down","cooldown"], a:()=>"A few minutes of easy movement first raises tissue temperature and cuts injury risk; a gentle cool-down eases stiffness. 5 minutes each end is plenty." },
  { kw:["brace","support","tape","wrap","sleeve","crutches"], a:()=>"Braces/taping give short-term support and confidence, especially early or returning to activity — but long-term reliance keeps the area weak. Use support to move and load safely, not to avoid movement. Follow your clinician's bracing instructions after surgery." },
  { kw:["blood pressure","hypertension","bp"], a:()=>"With high blood pressure: **never hold your breath** — exhale on effort. Avoid heavy grip/isometric holds and head-down positions. Regular **moderate aerobic exercise lowers blood pressure**, so it's a cornerstone. Know your numbers." },
  { kw:["breath","breathe","short of breath","breathless","copd","oxygen"], a:()=>"Pace exercise with your breathing: **pursed-lip breathing** (in through the nose, out slowly through pursed lips), rest when breathless, and use prescribed oxygen. Breathlessness is expected; chest pain, dizziness, or blue lips are not — stop and seek care." },
  { kw:["max heart rate","maximum heart rate","target heart rate","heart rate zone","hr zone","target zone","tanaka","borg","rpe","perceived exertion","how hard should i","how hard do i","talk test","target hr","karvonen","how hard to work"], a:()=>{
      const hz=hrZones(), b=borgTarget();
      if(hz) return `Your estimated **maximum heart rate is about ${hz.hrmax} bpm** (Tanaka: 208 − 0.7 × age). A good **moderate** zone is **${fmtRange(hz.zones.moderate)} bpm**${hz.rest?" (Karvonen, from your resting HR)":""}; **vigorous** (only as cleared) is **${fmtRange(hz.zones.vigorous)} bpm**. ${onBetaBlocker()?"Because you take a **beta-blocker**, your heart rate won't rise normally — use **Borg RPE** instead. ":""}Prefer effort-based? Aim for **${b.label}**. Simplest of all is the **talk-test**: you should be able to talk but not sing.`;
      return `Add your **age** (and ideally resting heart rate) in the History step and I'll calculate your **maximum heart rate** (Tanaka formula) and target zones. Meanwhile, gauge effort with **Borg RPE**: aim for **${b.label}** — you should be able to talk but not sing.`;
    } }
];

function coachAnswer(qRaw){
  const q = qRaw.toLowerCase();
  const conds = selectedConditions();
  for(const c of conds){
    const first = c.name.toLowerCase().split(/[ (]/)[0];
    if(q.includes(first) && /(about|what is|tell me|info|explain)/.test(q))
      return `**${c.name}** — ${aboutText(c, state.program?state.program.track:classify(state.weeks)||"acute")}\n\n${DOMAIN_REDFLAGS[c.domain]}`;
  }
  let best=null, score=0;
  for(const item of KB){ let s=0; for(const kw of item.kw) if(q.includes(kw)) s+=kw.split(" ").length; if(s>score){score=s;best=item;} }
  if(best && score>0) return best.a();
  if(/program|phase|week|routine|plan/.test(q)){
    if(state.program) return `Your plan is a **${state.program.totalWeeks}-week, 4-phase program** (${state.program.track} track): ${TEMPLATE[state.program.track].phases.map(p=>p.title).join(" → ")}. Advance a phase when the current one feels controlled and symptoms are low. See the **Program** tab for exercises.`;
    return "Build a program first (History → Injury → Details), then I can walk you through your phases and exercises.";
  }
  return `I'm not sure I caught that. I can help most with: **ice vs heat · how much pain is okay · how often to train · your precautions · when to see a doctor · returning to sport · swelling · nutrition · sleep · flare-ups · motivation**.\n\nTry *"What should I avoid with my condition?"* or *"How much pain is normal?"* — and for anything serious or not improving, see a clinician in person.`;
}

/* ---------- chat UI ---------- */
function addMsg(text, who){
  const div=document.createElement("div"); div.className="msg "+who;
  div.innerHTML=mdLite(text);
  if(who==="bot") div.innerHTML+=`<span class="src">Educational guidance · not a substitute for a clinician</span>`;
  $("#chatlog").appendChild(div); $("#chatlog").scrollTop=$("#chatlog").scrollHeight;
}
const mdLite = t => esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\*(.+?)\*/g,"<i>$1</i>").replace(/\n/g,"<br>");
const SUGGESTED = ["Should I use ice or heat?","How much pain is normal?","What's my target heart rate?","What should I avoid with my condition?","When should I see a doctor?","How often should I train?","How do I return to sport safely?"];
function initCoach(){
  $("#chatlog").innerHTML=""; chatHistory=[]; updateCoachMode();
  const conds=selectedConditions();
  const intro = conds.length ? `I can see you're working on: **${conds.map(c=>c.name).join(", ")}**. ` : "";
  const mode = coachOnline() ? " (Claude API connected)" : "";
  addMsg(`Hi, I'm Jeffery, your AI rehabilitation specialist${mode}. ${intro}Ask me anything about your recovery, program, or medical precautions.`, "bot");
  const sug=$("#suggests"); sug.innerHTML="";
  SUGGESTED.forEach(s=>{ const c=document.createElement("div"); c.className="s"; c.textContent=s;
    c.onclick=()=>{ $("#chatInput").value=s; $("#chatform").requestSubmit(); }; sug.appendChild(c); });
}

/* =====================================================================
   WIZARD / NAV
===================================================================== */
function goStep(n){
  state.step=n; save();
  $$(".panel").forEach((p,i)=>p.classList.toggle("hide", i!==n));
  $$(".step").forEach((s,i)=>{ s.classList.toggle("active", i===n); s.classList.toggle("done", i<n); });
  const act=document.querySelector(".step.active");        // keep the active step visible in the scrollable nav
  if(act&&act.scrollIntoView) try{ act.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"}); }catch(e){}
  window.scrollTo({top:0,behavior:"smooth"});
  if(n===1) initClinician();                                  // Clinician section (now right after History)
  if(n===3) renderPrecautions();                              // Precautions card lives in Details — keep it current
  if(n===4 && state.program) renderProgram(state.program);    // Program reflects precaution/detail/clinician changes
  if(n===5){ renderProgress(); renderHealth(); }
  if(n===6) initCoach();
  if(n===7) initLibrary();
}

/* ---------- cardiac device detail (shown when Pacemaker/ICD is ticked) ---------- */
function cdHintText(){
  const cd=state.cardiacDevice||{};
  if(cd.type==="lvad") return "LVAD: heart rate is unreliable — your plan goes by RPE / talk-test and caps intensity, and removes high-impact and breath-holding work.";
  if(/^(icd|crtd)$/.test(cd.type)){ const cap=deviceHRCeiling();
    return cap ? `We'll keep your target heart rate under ~${cap} bpm — safely below your ICD's ${esc(String(cd.icdRate))} bpm threshold — and cap effort at RPE ≤13.`
               : "Enter your ICD's therapy heart-rate threshold and we'll cap your target zones ~20 bpm below it. Ask your cardiologist for the number."; }
  if(cd.type==="pacemaker"||cd.type==="crtp") return "We'll keep effort light–moderate (RPE ≤13) and respect your device's upper rate limit.";
  return "Choose your device so we can set safe heart-rate and effort limits.";
}
function syncCardiacDevWrap(){
  const wrap=$("#cardiacDevWrap"); if(!wrap) return;
  wrap.classList.toggle("hide", !(state.flags||[]).includes("pacemaker_icd"));
  const t=(state.cardiacDevice||{}).type;
  const rw=$("#cd_rateWrap"); if(rw) rw.classList.toggle("hide", !/^(icd|crtd)$/.test(t));
  const h=$("#cdHint"); if(h) h.textContent=cdHintText();
}
function initCardiacDevice(){
  state.cardiacDevice = state.cardiacDevice || {type:"",icdRate:""};
  const ts=$("#cd_type"), rt=$("#cd_rate");
  if(ts){ ts.value=state.cardiacDevice.type||""; ts.onchange=()=>{ state.cardiacDevice.type=ts.value; save(); syncCardiacDevWrap(); }; }
  if(rt){ rt.value=state.cardiacDevice.icdRate||""; rt.oninput=()=>{ state.cardiacDevice.icdRate=rt.value; save(); const h=$("#cdHint"); if(h) h.textContent=cdHintText(); }; }
  syncCardiacDevWrap();
}

/* ---------- history UI ---------- */
function initHistory(){
  const wrap=$("#historyChecks");
  wrap.classList.remove("checks");                       // grouped sub-grids replace the flat grid
  wrap.innerHTML = HIST_GROUPS.map(g=>{
    const items = HISTORY_ITEMS.filter(it=>it.group===g.key);
    if(!items.length) return "";
    return `<div class="histgroup"><div class="histgrouplab">${g.icon} ${esc(g.label)}</div>
      <div class="checks">${items.map(it=>{ const on=state.flags.includes(it.flag);
        return `<div class="check${on?" on":""}" data-flag="${it.flag}"><span class="box">${on?"✓":""}</span><span>${esc(it.label)}</span></div>`;
      }).join("")}</div></div>`;
  }).join("");
  wrap.querySelectorAll(".check").forEach(d=>d.onclick=()=>{
    d.classList.toggle("on"); const active=d.classList.contains("on");
    d.querySelector(".box").textContent=active?"✓":"";
    const flag=d.dataset.flag;
    if(active) state.flags.push(flag); else state.flags=state.flags.filter(f=>f!==flag); save();
    if(flag==="pacemaker_icd") syncCardiacDevWrap();
  });
  initCardiacDevice();
  $("#q_age").value=state.age; $("#q_sex").value=state.sex; $("#q_meds").value=state.meds; $("#q_notes").value=state.notes;
  $("#parq_pain").checked=state.parq.pain; $("#parq_faint").checked=state.parq.faint; $("#parq_doc").checked=state.parq.doc;
  $("#q_age").oninput=e=>{state.age=e.target.value;save();updateVitalsReadout();};
  $("#q_sex").oninput=e=>{state.sex=e.target.value;save();};
  $("#q_meds").oninput=e=>{state.meds=e.target.value;save();};
  $("#q_notes").oninput=e=>{state.notes=e.target.value;save();};
  $("#parq_pain").onchange=e=>{state.parq.pain=e.target.checked;save();};
  $("#parq_faint").onchange=e=>{state.parq.faint=e.target.checked;save();};
  $("#parq_doc").onchange=e=>{state.parq.doc=e.target.checked;save();};
  // vital signs & measurements
  state.vitals = state.vitals || {restHR:"",sbp:"",dbp:"",spo2:"",rr:"",height:"",weight:""};
  const VITAL_IDS = {v_restHR:"restHR",v_sbp:"sbp",v_dbp:"dbp",v_spo2:"spo2",v_rr:"rr",v_height:"height",v_weight:"weight"};
  Object.entries(VITAL_IDS).forEach(([id,key])=>{ const inp=$("#"+id); if(!inp) return;
    inp.value = state.vitals[key]||"";
    inp.oninput=e=>{ state.vitals[key]=e.target.value; save(); updateVitalsReadout(); }; });
  updateVitalsReadout();
  // symptom / red-flag screen
  state.screen = state.screen || {};
  $$('[data-screen]').forEach(cb=>{ const k=cb.dataset.screen;
    cb.checked = !!state.screen[k];
    cb.onchange=()=>{ state.screen[k]=cb.checked; save(); updateScreenWarn(); }; });
  updateScreenWarn();
  // lifestyle & daily function
  const LIFE_IDS = {q_smoking:"smoking",q_alcohol:"alcohol",q_sleep:"sleep",q_stress:"stress",q_falls:"falls",q_aid:"aid",q_waterConf:"waterConfidence"};
  Object.entries(LIFE_IDS).forEach(([id,key])=>{ const el=$("#"+id); if(!el) return;
    el.value = state[key]||"";
    el.onchange=e=>{ state[key]=e.target.value; save(); }; });
}
/* Urgent / clearance note shown live under the red-flag screen. */
function updateScreenWarn(){
  const el=$("#screenWarn"); if(!el) return;
  const sc=state.screen||{};
  if(sc.cauda){ el.className="screenwarn urgent";
    el.innerHTML=`⛔ <b>Seek urgent medical care now.</b> Loss of bladder/bowel control or numbness around the groin/saddle can be a medical emergency (cauda equina) — do not exercise until you've been assessed.`; return; }
  if(Object.values(sc).some(Boolean)){ el.className="screenwarn";
    el.innerHTML=`⚠ Because you flagged a warning symptom, your program will advise <b>getting assessed by a clinician before starting</b>.`; return; }
  el.className="screenwarn"; el.innerHTML="";
}
/* Live readout under the vitals inputs: max HR, target zone, BMI, out-of-range warnings + Borg scale. */
function updateVitalsReadout(){
  const el=$("#vitalsReadout"); if(!el) return;
  const hz=hrZones(), v=state.vitals||{}, bmi=bmiCalc(v.height,v.weight), bits=[];
  if(hz) bits.push(`Max HR ≈ <b>${hz.hrmax} bpm</b> · moderate zone <b>${fmtRange(hz.zones.moderate)} bpm</b>`);
  else bits.push(`<span class="muted">Enter your <b>age</b> above to calculate max heart rate &amp; target zones.</span>`);
  if(bmi!=null) bits.push(`BMI <b>${bmi}</b> (${bmiCategory(bmi)})`);
  const vf=vitalFlags();
  const warn = vf.length ? `<div class="vwarn">⚠ ${esc(window.notesForFlags(vf)[0]||"Some readings are outside typical ranges — your plan will adjust.")}</div>` : "";
  el.innerHTML = `<div class="vreadline">${bits.join(" · ")}</div>${warn}
    <details class="borgdetails"><summary>Show the Borg RPE (perceived-exertion) scale</summary>${borgScaleHTML(borgTarget())}</details>`;
}

/* ---------- condition search UI ---------- */
function renderSelected(){
  const wrap=$("#selectedConds"); const conds=selectedConditions();
  wrap.innerHTML = conds.map(c=>`<span class="selchip"><span class="sup ${c.supervision}">${c.supervision}</span>${esc(c.name)}
    <span class="x" data-id="${c.id}">✕</span></span>`).join("");
  $$("#selectedConds .x").forEach(x=>x.onclick=()=>{ state.condIds=state.condIds.filter(i=>i!==x.dataset.id); save(); renderSelected(); runSearch(); });
  $("#toDetails").disabled = conds.length===0;
}
function runSearch(){
  const q=$("#condSearch").value.trim().toLowerCase();
  const toks=q.split(/\s+/).filter(Boolean);
  let list=window.CONDITIONS;
  if(domainFilter==="pediatric") list=list.filter(isPediatric);
  else if(domainFilter!=="all") list=list.filter(c=>c.domain===domainFilter);
  if(toks.length) list=list.filter(c=>{ const hay=(c.name+" "+c.region+" "+(c.synonyms||[]).join(" ")).toLowerCase();
    return toks.every(t=>hay.includes(t)); });
  const total=list.length; list=list.slice(0,60);
  const dotColor={msk:"var(--msk)",neuro:"var(--neuro)",cardiac:"var(--cardiac)",pulmonary:"var(--pulm)"};
  const res=$("#condResults");
  if(!list.length){ res.innerHTML=`<div class="moreinfo">No matches. Try a simpler term, or a different spelling.</div>`; return; }
  res.innerHTML = list.map(c=>{ const picked=state.condIds.includes(c.id);
    return `<div class="resitem">
      <div class="result ${picked?"picked":""}" data-id="${c.id}">
        <span class="dot" style="background:${dotColor[c.domain]}"></span>
        <span class="rn">${esc(c.name)}<div class="rr">${esc(c.region)} · ${DOMAIN_NAME[c.domain]}</div></span>
        <span class="info" data-info="${c.id}" title="What is this?">ⓘ</span>
        <span class="add">${picked?"✓":"+"}</span>
      </div>
      <div class="resexp hide" id="exp-${c.id}"></div>
    </div>`; }).join("") +
    (total>60?`<div class="moreinfo">Showing 60 of ${total} matches — refine your search to narrow it down.</div>`:"");
  $$("#condResults .result").forEach(r=>r.onclick=e=>{ if(e.target.closest(".info")) return;
    const id=r.dataset.id;
    if(state.condIds.includes(id)) state.condIds=state.condIds.filter(i=>i!==id);
    else state.condIds.push(id);
    save(); renderSelected(); runSearch(); });
  $$("#condResults .info").forEach(ic=>ic.onclick=e=>{ e.stopPropagation();
    const id=ic.dataset.info, exp=document.getElementById("exp-"+id);
    if(!exp.dataset.filled){ exp.textContent=conditionExplain(CONMAP.get(id)); exp.dataset.filled="1"; }
    exp.classList.toggle("hide"); });
}
function initSearch(){
  window.CONDITIONS.forEach(c=>CONMAP.set(c.id,c));
  $("#catCount").textContent=window.CONDITIONS.length;
  let t; $("#condSearch").oninput=()=>{ clearTimeout(t); t=setTimeout(runSearch,120); };
  $$("#domainFilters .fchip").forEach(f=>f.onclick=()=>{ domainFilter=f.dataset.d;
    $$("#domainFilters .fchip").forEach(x=>x.classList.toggle("on",x===f)); runSearch(); });
  renderSelected(); runSearch();
}

/* ---------- medication search UI ---------- */
function renderSelectedMeds(){
  const wrap=$("#selectedMeds"); if(!wrap) return;
  const meds=selectedMeds();
  state.medDoses = state.medDoses || {};
  wrap.innerHTML = meds.map(m=>`<div class="medselrow" data-id="${m.id}">
      <div class="medselname">${esc(m.name)}${m.cls?` <span class="medselcls">${esc(m.cls)}</span>`:""}</div>
      <input type="text" class="medseldose" data-id="${m.id}" value="${esc(state.medDoses[m.id]||"")}" placeholder="dose &amp; frequency — e.g. 20 mg twice daily" />
      <button class="medselx" data-id="${m.id}" title="Remove" aria-label="Remove">✕</button>
    </div>`).join("");
  $$("#selectedMeds .medselx").forEach(x=>x.onclick=()=>{ const id=x.dataset.id; state.medIds=state.medIds.filter(i=>i!==id); if(state.medDoses) delete state.medDoses[id]; save(); renderSelectedMeds(); runMedSearch(); });
  $$("#selectedMeds .medseldose").forEach(inp=>inp.oninput=()=>{ (state.medDoses=state.medDoses||{})[inp.dataset.id]=inp.value; save(); });
}
function runMedSearch(){
  const res=$("#medResults"); if(!res || !window.MEDICATIONS) return;
  const q=$("#medSearch").value.trim().toLowerCase(); const toks=q.split(/\s+/).filter(Boolean);
  if(!toks.length){ res.innerHTML=""; res.classList.add("hide"); return; }
  res.classList.remove("hide");
  let list=window.MEDICATIONS.filter(m=>{ const hay=(m.name+" "+m.generic+" "+m.cls).toLowerCase(); return toks.every(t=>hay.includes(t)); });
  const total=list.length; list=list.slice(0,40);
  if(!list.length){ res.innerHTML=`<div class="moreinfo">No matches — try the generic or brand name.</div>`; return; }
  res.innerHTML = list.map(m=>{ const picked=state.medIds.includes(m.id);
    return `<div class="result ${picked?"picked":""}" data-id="${m.id}">
      <span class="rn">${esc(m.name)}<div class="rr">${esc(m.cls)}${m.brand?` · generic: ${esc(m.generic)}`:""}</div></span>
      <span class="add">${picked?"✓":"+"}</span></div>`; }).join("") +
    (total>40?`<div class="moreinfo">Showing 40 of ${total} — keep typing to narrow.</div>`:"");
  $$("#medResults .result").forEach(r=>r.onclick=()=>{ const id=r.dataset.id;
    if(state.medIds.includes(id)) state.medIds=state.medIds.filter(i=>i!==id); else state.medIds.push(id);
    save(); renderSelectedMeds(); runMedSearch(); });
}
function initMeds(){
  if(window.MEDICATIONS) window.MEDICATIONS.forEach(m=>MEDMAP.set(m.id,m));
  const inp=$("#medSearch"); if(!inp) return;
  let t; inp.oninput=()=>{ clearTimeout(t); t=setTimeout(runMedSearch,120); };
  renderSelectedMeds();
}

/* ---------- details UI ---------- */
function updateAcuteLabel(){
  const w=parseInt($("#weeksSince").value); const el=$("#acuteLabel");
  if(isNaN(w)){ el.innerHTML=""; return; }
  el.innerHTML = classify(w)==="acute"
    ? `<span class="badge acute">Acute · 0–6 wks</span> Still in the early healing window.`
    : `<span class="badge chronic">Chronic · 6+ wks</span> Past acute — focus shifts to progressive loading.`;
}
function initDetails(){
  const w=$("#weeksSince"); w.value=state.weeks??""; updateAcuteLabel();
  $("#painLevel").value=state.painRest; $("#painVal").textContent=state.painRest;
  $("#painMove").value=state.painMove; $("#painMoveVal").textContent=state.painMove;
  $("#surgery").value=state.surgery; $("#fitness").value=state.fitness; $("#goal").value=state.goal;
  // surgery picker — searchable (3000+ procedures)
  $("#surgeryDate").value=state.surgeryDate||"";
  if($("#surgCount")) $("#surgCount").textContent = SURGERIES.length.toLocaleString();
  renderSurgeryPick();
  let sgt; const ss=$("#surgerySearch"); if(ss) ss.oninput=()=>{ clearTimeout(sgt); sgt=setTimeout(runSurgerySearch,120); };
  toggleSurgeryExtra(); updatePostopLabel();
  w.oninput=()=>{ state.weeks=w.value===""?null:parseInt(w.value); updateAcuteLabel(); save(); };
  $("#painLevel").oninput=e=>{ state.painRest=+e.target.value; $("#painVal").textContent=e.target.value; save(); };
  $("#painMove").oninput=e=>{ state.painMove=+e.target.value; $("#painMoveVal").textContent=e.target.value; save(); };
  $("#surgery").oninput=e=>{ state.surgery=e.target.value; toggleSurgeryExtra(); save(); };
  $("#surgeryDate").oninput=e=>{ state.surgeryDate=e.target.value; updatePostopLabel(); save(); };
  $("#fitness").oninput=e=>{ state.fitness=e.target.value; save(); };
  $("#goal").oninput=e=>{ state.goal=e.target.value; save(); };
  // auto-populate return-to activity & sport pickers
  setupAutocomplete("activitySearch","activityResults","activityChips", window.ACTIVITIES, "returnActivities",
    { onChange:()=>{ if(state.program && state.step===4) renderProgram(state.program); } });
  setupAutocomplete("sportSearch","sportResults","sportChips", window.SPORTS, "returnSports",
    { onChange:()=>{ if(state.program){ state.program=generateProgram(); save(); if(state.step===4) renderProgram(state.program); } } });
  renderPrecautions();   // Precautions & reminders card (weight-bearing, braces, sternal/abdominal, custom)
}
/* ---- reusable auto-populate (typeahead + multi-add chips) ---- */
function acFilter(data, q, limit){
  if(!data || !data.length) return [];
  const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
  if(!toks.length) return [];
  const res = [];
  for(let i=0;i<data.length && res.length<limit;i++){
    const l = data[i].toLowerCase();
    if(toks.every(t=>l.includes(t))) res.push(data[i]);
  }
  return res;
}
function setupAutocomplete(inputId, resultsId, chipsId, data, stateKey, opts){
  opts = opts || {};
  const input=$("#"+inputId), results=$("#"+resultsId), chips=$("#"+chipsId);
  if(!input || !results || !chips) return;
  const list = () => (state[stateKey] = state[stateKey] || []);
  const draw = () => {
    chips.innerHTML = list().map((v,i)=>`<span class="selchip">${esc(v)} <span class="x" data-i="${i}" title="Remove">✕</span></span>`).join("");
    chips.querySelectorAll(".x").forEach(x=>x.onclick=()=>{ list().splice(+x.dataset.i,1); save(); if(opts.onChange) opts.onChange(); draw(); });
  };
  const add = (val) => {
    val=(val||"").replace(/\s+/g," ").trim(); if(!val) return;
    const arr=list();
    if(!arr.some(v=>v.toLowerCase()===val.toLowerCase())){ arr.push(val); save(); if(opts.onChange) opts.onChange(); }
    input.value=""; results.innerHTML=""; results.classList.add("hide"); draw();
  };
  let t;
  input.oninput = () => { clearTimeout(t); t=setTimeout(()=>{
    const q=input.value.trim();
    if(!q){ results.innerHTML=""; results.classList.add("hide"); return; }
    const matches = acFilter(data, q, 30);
    const rows = matches.map(m=>`<div class="result acrow" data-v="${esc(m)}"><span class="rn">${esc(m)}</span><span class="add">+</span></div>`).join("");
    const custom = `<div class="result acrow acadd" data-v="${esc(q)}"><span class="rn">＋ Add “${esc(q)}”</span><span class="add">+</span></div>`;
    results.innerHTML = rows + custom;
    results.classList.remove("hide");
    results.querySelectorAll(".acrow").forEach(r=>r.onclick=()=>add(r.dataset.v));
  }, 110); };
  input.onkeydown = (e)=>{ if(e.key==="Enter"){ e.preventDefault(); add(input.value); } };
  input.onblur = ()=> setTimeout(()=>results.classList.add("hide"), 180);
  draw();
}
function toggleSurgeryExtra(){
  const show = state.surgery==="yes" || !!detectSurgery();
  $("#surgeryExtra").classList.toggle("hide", !show);
}
function updatePostopLabel(){
  const el=$("#postopLabel"); if(!el) return;
  if(!state.surgeryDate){ el.innerHTML=""; return; }
  const w=weeksPostOp();
  el.innerHTML = w==null ? "" : (w>0 ? `→ about <b>${w} week${w===1?"":"s"}</b> post-op` : `→ <b>under a week</b> post-op`);
}
/* Searchable surgery picker (auto-detect / 3000+ procedures / other). */
function setSurgery(id){
  state.surgeryType=id;
  const ss=$("#surgerySearch"); if(ss) ss.value="";
  const res=$("#surgeryResults"); if(res){ res.innerHTML=""; res.classList.add("hide"); }
  save(); renderSurgeryPick(); toggleSurgeryExtra(); updatePostopLabel();
}
function renderSurgeryPick(){
  const el=$("#surgeryPick"); if(!el) return;
  const st=state.surgeryType||"auto";
  let label;
  if(st==="other") label=`Selected: <b>Other / not listed</b> — general post-op precautions`;
  else if(st!=="auto"){ const s=SURGERIES.find(x=>x.id===st); label = s?`Selected: <b>${esc(s.name)}</b>`:`<b>Auto-detect</b> from your condition`; }
  else { const d=detectSurgery(); label = d?`Auto-detected: <b>${esc(d.name)}</b>`:`<b>Auto-detect</b> from your condition (none matched yet)`; }
  const reset = st!=="auto" ? `<button type="button" class="surgreset" id="surgReset">↺ auto-detect</button>` : "";
  const otherBtn = st!=="other" ? `<button type="button" class="surgreset" id="surgOther">＋ Other / not listed</button>` : "";
  el.innerHTML=`<span>${label}</span>${reset}${otherBtn}`;
  const rb=$("#surgReset"); if(rb) rb.onclick=()=>setSurgery("auto");
  const ob=$("#surgOther"); if(ob) ob.onclick=()=>setSurgery("other");
}
function runSurgerySearch(){
  const res=$("#surgeryResults"); if(!res) return;
  const q=$("#surgerySearch").value.trim().toLowerCase(); const toks=q.split(/\s+/).filter(Boolean);
  if(!toks.length){ res.innerHTML=""; res.classList.add("hide"); return; }
  res.classList.remove("hide");
  let list=SURGERIES.filter(s=>{ const hay=(s.name+" "+(s.region||"")+" "+(s.cat||"")).toLowerCase(); return toks.every(t=>hay.includes(t)); });
  const total=list.length; list=list.slice(0,40);
  const otherRow=`<div class="result" data-id="other"><span class="rn">Other / not listed<div class="rr">general post-op precautions</div></span><span class="add">+</span></div>`;
  if(!list.length){ res.innerHTML=`<div class="moreinfo">No matches — try a simpler term.</div>`+otherRow; }
  else res.innerHTML = list.map(s=>{ const picked=state.surgeryType===s.id;
    return `<div class="result ${picked?"picked":""}" data-id="${s.id}"><span class="rn">${esc(s.name)}<div class="rr">${esc(s.region||s.cat||"surgery")}</div></span><span class="add">${picked?"✓":"+"}</span></div>`; }).join("")
    + (total>40?`<div class="moreinfo">Showing 40 of ${total} — keep typing to narrow.</div>`:"") + otherRow;
  $$("#surgeryResults .result").forEach(r=>r.onclick=()=>setSurgery(r.dataset.id));
}

function doGenerate(){
  if(!state.condIds.length){ toast("Pick at least one injury or condition first."); goStep(2); return; }
  if(state.weeks===null){ toast("Enter how many weeks ago it started."); return; }
  state.program=generateProgram(); save();
  renderProgram(state.program); goStep(4);
}
function doReset(){
  if(!confirm("Clear everything and start over?")) return;
  localStorage.removeItem("physiopath");
  location.reload();
}
function toast(msg){
  const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(),2600);
}

/* ---- service worker + update-available flow ---- */
function showUpdateToast(reg){
  if(document.querySelector(".toast-update")) return;
  const t=document.createElement("div"); t.className="toast toast-update";
  t.innerHTML="✨ A new version is available. <button class='btn primary updbtn'>Refresh</button>";
  document.body.appendChild(t);
  t.querySelector(".updbtn").onclick=()=>{ if(reg.waiting) reg.waiting.postMessage({type:"SKIP_WAITING"}); t.remove(); };
  setTimeout(()=>{ if(t.isConnected) t.remove(); }, 15000);
}
if("serviceWorker" in navigator){
  window.addEventListener("load", async ()=>{
    try{
      const reg=await navigator.serviceWorker.register("sw.js");
      if(reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg);
      reg.addEventListener("updatefound", ()=>{
        const nw=reg.installing; if(!nw) return;
        nw.addEventListener("statechange", ()=>{
          if(nw.state==="installed" && navigator.serviceWorker.controller) showUpdateToast(reg);
        });
      });
    }catch(e){}
  });
  let reloaded=false;
  navigator.serviceWorker.addEventListener("controllerchange", ()=>{ if(reloaded) return; reloaded=true; location.reload(); });
}

/* =====================================================================
   PROGRESS TRACKING
===================================================================== */
function todayISO(){ return new Date().toISOString().slice(0,10); }
function fmtDate(iso){
  const d=new Date(iso+"T00:00:00");
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}
function initProgress(){
  $("#logToday").textContent = "Entry for " + fmtDate(todayISO());
  $("#logPain").oninput = e=>$("#logPainVal").textContent=e.target.value;
  $("#logBtn").onclick = saveLogEntry;
  initHealth();
}
function saveLogEntry(){
  const entry = {
    date: todayISO(),
    pain: parseInt($("#logPain").value),
    sessions: Math.max(0, parseInt($("#logSessions").value)||0),
    note: $("#logNote").value.trim()
  };
  const i = state.log.findIndex(e=>e.date===entry.date);
  if(i>=0) state.log[i]=entry; else state.log.push(entry);
  state.log.sort((a,b)=>a.date<b.date?-1:1);
  save(); $("#logNote").value="";
  renderProgress();
  toast(i>=0 ? "Updated today's entry." : "Saved. Keep it up! 💪");
}
function deleteLog(date){ state.log=state.log.filter(e=>e.date!==date); save(); renderProgress(); }

function renderProgress(){
  const body=$("#progressBody"); const log=state.log;
  if(!log.length){
    body.innerHTML=`<div class="empty"><div class="big">📈</div><div>No entries yet — log your first session above.</div></div>`;
    return;
  }
  const pains=log.map(e=>e.pain);
  const first=pains[0], last=pains[pains.length-1];
  const totalSessions=log.reduce((a,e)=>a+e.sessions,0);
  const delta=last-first;
  let trendCls="trend-flat", trendTxt="holding steady";
  if(log.length>1 && delta<=-1){ trendCls="trend-down"; trendTxt=`pain down ${Math.abs(delta)} pts ↓ improving`; }
  else if(log.length>1 && delta>=1){ trendCls="trend-up"; trendTxt=`pain up ${delta} pts ↑ — ease off & review`; }
  const streak=computeStreak(log);

  body.innerHTML = `
    <div class="progstats">
      <div class="stat"><div class="k">Entries</div><div class="v">${log.length}</div></div>
      <div class="stat"><div class="k">Sessions logged</div><div class="v">${totalSessions}</div></div>
      <div class="stat"><div class="k">Current pain</div><div class="v">${last}/10</div></div>
      <div class="stat"><div class="k">Day streak</div><div class="v">${streak}🔥</div></div>
    </div>
    <div style="margin:2px 0 6px"><span class="trendtag ${trendCls}">${trendTxt}</span></div>
    <div class="chartwrap">${painChartSVG(log)}</div>
    <ul class="loglist">${
      log.slice().reverse().map(e=>`<li class="logrow">
        <span class="ld">${fmtDate(e.date)}</span>
        <span class="lp">${e.pain}/10</span>
        <span class="ln">${e.sessions} session${e.sessions===1?"":"s"}${e.note?" · "+esc(e.note):""}</span>
        <span class="lx" data-date="${e.date}" title="Delete">✕</span>
      </li>`).join("")
    }</ul>`;
  $$("#progressBody .lx").forEach(x=>x.onclick=()=>{ if(confirm("Delete this entry?")) deleteLog(x.dataset.date); });
}
function computeStreak(log){
  // consecutive calendar days ending today (or last entry) with an entry
  const set=new Set(log.map(e=>e.date));
  let streak=0, d=new Date(todayISO()+"T00:00:00");
  if(!set.has(todayISO())) d.setDate(d.getDate()-1); // allow streak to count up to yesterday
  for(;;){ const key=d.toISOString().slice(0,10); if(set.has(key)){ streak++; d.setDate(d.getDate()-1);} else break; }
  return streak;
}
function painChartSVG(log){
  const W=700,H=180,padL=28,padR=12,padT=14,padB=24;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const n=log.length;
  const x=i=> n<=1 ? padL+plotW/2 : padL + (i/(n-1))*plotW;
  const y=p=> padT + ((10-p)/10)*plotH;                 // pain 10 top, 0 bottom
  const pts=log.map((e,i)=>[x(i),y(e.pain)]);
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area=`M${pts[0][0].toFixed(1)} ${(padT+plotH).toFixed(1)} `+
    pts.map(p=>"L"+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ")+
    ` L${pts[pts.length-1][0].toFixed(1)} ${(padT+plotH).toFixed(1)} Z`;
  const grid=[0,5,10].map(v=>{ const gy=y(v);
    return `<line class="grid" x1="${padL}" y1="${gy}" x2="${W-padR}" y2="${gy}"/>`+
      `<text class="axislbl" x="4" y="${gy+3}">${v}</text>`; }).join("");
  const dots=pts.map(p=>`<circle class="dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"/>`).join("");
  const xlabels = n>1
    ? `<text class="axislbl" x="${padL}" y="${H-6}">${fmtDate(log[0].date).replace(/,.*/,"")}</text>`+
      `<text class="axislbl" x="${W-padR}" y="${H-6}" text-anchor="end">${fmtDate(log[n-1].date).replace(/,.*/,"")}</text>`
    : "";
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Pain over time">
    ${grid}${n>1?`<path class="area" d="${area}"/>`:""}${n>1?`<path class="line" d="${line}"/>`:""}${dots}${xlabels}
    <text class="axislbl" x="4" y="10">pain</text></svg>`;
}

/* =====================================================================
   HEALTH TRACKING — vitals log & trend · lab values · risk assessment
   Educational only, not a diagnosis. Everything stays on the device.
===================================================================== */
const VITAL_METRICS = [
  { k:"sbp",     label:"Systolic BP",  unit:"mmHg", good:"down" },
  { k:"dbp",     label:"Diastolic BP", unit:"mmHg", good:"down" },
  { k:"restHR",  label:"Resting HR",   unit:"bpm",  good:"down" },
  { k:"spo2",    label:"SpO₂",         unit:"%",    good:"up" },
  { k:"glucose", label:"Glucose",      unit:"mg/dL",good:"down" },
  { k:"weight",  label:"Weight",       unit:"kg",   good:"neutral" },
  { k:"temp",    label:"Temp",         unit:"°C",   good:"neutral" }
];
let healthChartMetric = "sbp";

/* Latest known vitals — most recent log entry, falling back to History baseline. */
function latestVitals(){
  const base = state.vitals||{};
  const log = state.vitalsLog||[];
  const last = log.length ? log[log.length-1] : {};
  const pick = k => (last[k]!==undefined && last[k]!=="" && last[k]!=null) ? last[k] : base[k];
  return { restHR:pick("restHR"), sbp:pick("sbp"), dbp:pick("dbp"), spo2:pick("spo2"), rr:pick("rr"),
           weight:pick("weight"), height:base.height, glucose:pick("glucose"), temp:pick("temp") };
}

function saveVitalsEntry(){
  const g = id => { const el=$(id); return el?el.value.trim():""; };
  const entry = { date: $("#vlDate").value || todayISO(), restHR:g("#vlHR"), sbp:g("#vlSBP"), dbp:g("#vlDBP"),
    spo2:g("#vlSpo2"), weight:g("#vlWeight"), glucose:g("#vlGlucose"), temp:g("#vlTemp") };
  if(!["restHR","sbp","dbp","spo2","weight","glucose","temp"].some(k=>entry[k]!=="")){ toast("Enter at least one vital first."); return; }
  state.vitalsLog = state.vitalsLog||[];
  const i = state.vitalsLog.findIndex(e=>e.date===entry.date);
  if(i>=0) state.vitalsLog[i]=entry; else state.vitalsLog.push(entry);
  state.vitalsLog.sort((a,b)=>a.date<b.date?-1:1);
  save(); ["#vlHR","#vlSBP","#vlDBP","#vlSpo2","#vlWeight","#vlGlucose","#vlTemp"].forEach(id=>{ const el=$(id); if(el) el.value=""; });
  renderVitalsLog(); renderRisks();
  toast(i>=0 ? "Updated vitals for that date." : "Vitals saved — keep logging to see the trend.");
}
function deleteVitals(date){ state.vitalsLog=(state.vitalsLog||[]).filter(e=>e.date!==date); save(); renderVitalsLog(); renderRisks(); }

/* =====================================================================
   SMARTWATCH / HEART-RATE MONITOR (Web Bluetooth)
   Reads LIVE data straight from a standard BLE Heart Rate device
   (service 0x180D) — chest straps, bands and compatible watches — with
   no account, cable or server. Feeds resting HR + the vitals log, shows
   the live training zone, and estimates HRV (RMSSD) from RR intervals.
   Nothing leaves the device. Web Bluetooth = Chrome/Edge (desktop/Android).
===================================================================== */
let hrDevice=null, hrChar=null, hrLatestBpm=null, hrRRBuffer=[], hrBattery=null;
function bleSupported(){ return typeof navigator!=="undefined" && !!navigator.bluetooth; }
/* Parse a Heart Rate Measurement (0x2A37) DataView → { bpm, rr[ms] }. */
function parseHeartRate(value){
  const flags = value.getUint8(0); let i = 1, bpm;
  if(flags & 0x01){ bpm = value.getUint16(i, true); i += 2; }   // 16-bit HR
  else { bpm = value.getUint8(i); i += 1; }                     // 8-bit HR
  if(flags & 0x08) i += 2;                                      // energy expended present → skip
  const rr = [];
  if(flags & 0x10){                                            // RR intervals present (1/1024 s each)
    for(; i + 1 < value.byteLength; i += 2) rr.push(Math.round(value.getUint16(i, true) / 1024 * 1000));
  }
  return { bpm, rr };
}
/* HRV (RMSSD, ms) over the recent RR-interval buffer. */
function hrvFromBuffer(){
  const rr = hrRRBuffer; if(rr.length < 5) return null;
  let sum = 0, n = 0;
  for(let k=1;k<rr.length;k++){ const d = rr[k]-rr[k-1]; sum += d*d; n++; }
  return n ? Math.round(Math.sqrt(sum/n)) : null;
}
/* Live training-zone label for a bpm, using the user's HR zones. */
function liveZoneLabel(bpm, z){
  if(bpm==null) return `<span class="hrzone">Waiting for a reading…</span>`;
  if(!z) return `<span class="hrzone">${bpm} bpm — add your <b>age</b> in History for training zones.</span>`;
  const cap = z.deviceCap;
  const inR = r => bpm>=r[0] && bpm<=r[1];
  let zone="", cls="";
  if(bpm < z.zones.warmup[0]){ zone="Below warm-up · very light"; cls="zw"; }
  else if(inR(z.zones.warmup)){ zone="Warm-up · very light"; cls="zw"; }
  else if(inR(z.zones.moderate)){ zone="Moderate · building fitness"; cls="zm"; }
  else if(bpm > z.zones.vigorous[1]){ zone="Above vigorous · ease off"; cls="zv"; }
  else { zone="Vigorous · only as cleared"; cls="zv"; }
  const capWarn = (cap && bpm >= cap) ? ` <span class="hrzcap">⚠ at/over your device limit (${cap} bpm)</span>` : "";
  return `<span class="hrzone ${cls}">${zone}</span>${capWarn}`;
}
function hrMonitorCardHTML(){
  if(!bleSupported()){
    return `<p class="hint">Live syncing uses <b>Web Bluetooth</b> — available in <b>Chrome or Edge</b> on a computer or Android phone (not on iPhone/Safari). It reads your <b>live heart rate</b> straight from a standard Bluetooth heart-rate monitor, chest strap or compatible watch/band.</p>
      <div class="banner info">Web Bluetooth isn't available on this browser. You can still type your resting HR and other vitals into the log below, or open PhysioPath in Chrome/Edge to connect a monitor.</div>`;
  }
  if(!hrDevice){
    return `<p class="hint">Connect a Bluetooth <b>heart-rate monitor, chest strap or compatible watch/band</b> to pull your <b>live heart rate</b> straight into PhysioPath — set it as your resting HR, log a reading, and watch your training zone in real time. Nothing leaves your device.</p>
      <button class="btn primary" id="hrConnectBtn">⌚ Connect a heart-rate monitor / smartwatch</button>
      <p class="hint" style="margin-top:8px">Works with standard BLE heart-rate devices (Polar, Wahoo, many watches &amp; chest straps). Apple Watch, Fitbit &amp; Garmin keep heart rate inside their own apps — for those, read the number off the watch and enter it below.</p>`;
  }
  const z = hrZones();
  const hrv = hrvFromBuffer();
  return `<div class="hrlive">
      <div class="hrlivetop"><span class="hrlivedev">🟢 ${esc(hrDevice.name||"Heart-rate monitor")}${hrBattery!=null?` · 🔋 ${hrBattery}%`:""}</span>
        <button class="btn ghost hrdiscbtn" id="hrDisconnectBtn">Disconnect</button></div>
      <div class="hrbignum"><span id="hrLiveBpm">${hrLatestBpm!=null?hrLatestBpm:"—"}</span> <small>bpm</small></div>
      <div class="hrlivezone" id="hrLiveZone">${liveZoneLabel(hrLatestBpm, z)}</div>
      <div class="hrlivehrv"><span id="hrLiveHrv">${hrv!=null?`HRV (RMSSD): <b>${hrv}</b> ms`:"Collecting beat-to-beat data for HRV…"}</span></div>
      <div class="hrlivebtns">
        <button class="btn primary" id="hrUseRestBtn">Set as resting HR</button>
        <button class="btn ghost" id="hrLogBtn">Log this reading</button>
      </div>
      <p class="hint" style="margin-top:6px">The reading refreshes as your monitor streams it. <b>Set as resting HR</b> fills your History vitals (feeds your training zones); <b>Log this reading</b> adds today's HR to your vitals log &amp; trend.</p>`;
}
function renderHRMonitor(){
  const host = $("#hrMonitorOut"); if(!host) return;
  host.innerHTML = hrMonitorCardHTML();
  const c=$("#hrConnectBtn"); if(c) c.onclick = connectHRMonitor;
  const d=$("#hrDisconnectBtn"); if(d) d.onclick = disconnectHRMonitor;
  const r=$("#hrUseRestBtn"); if(r) r.onclick = ()=>{
    if(hrLatestBpm==null){ toast("No reading yet — give your monitor a moment."); return; }
    (state.vitals = state.vitals||{}).restHR = String(hrLatestBpm); save();
    toast(`Resting HR set to ${hrLatestBpm} bpm from your monitor.`);
  };
  const l=$("#hrLogBtn"); if(l) l.onclick = logHRReading;
}
async function connectHRMonitor(){
  if(!bleSupported()){ toast("Web Bluetooth isn't available on this browser."); return; }
  try{
    const dev = await navigator.bluetooth.requestDevice({ filters:[{ services:["heart_rate"] }], optionalServices:["battery_service"] });
    hrDevice = dev; hrLatestBpm = null; hrRRBuffer = []; hrBattery = null;
    dev.addEventListener("gattserverdisconnected", onHRDisconnected);
    const server = await dev.gatt.connect();
    const svc = await server.getPrimaryService("heart_rate");
    hrChar = await svc.getCharacteristic("heart_rate_measurement");
    hrChar.addEventListener("characteristicvaluechanged", onHRNotify);
    await hrChar.startNotifications();
    try{ const b = await server.getPrimaryService("battery_service"); const bc = await b.getCharacteristic("battery_level"); hrBattery = (await bc.readValue()).getUint8(0); }catch(e){}
    renderHRMonitor();
    toast(`Connected to ${dev.name||"your heart-rate monitor"} — live heart rate incoming.`);
  }catch(err){
    if(err && (err.name==="NotFoundError" || err.name==="AbortError")) return;   // user closed the chooser
    toast("Couldn't connect: "+((err&&err.message)||"unknown error"));
  }
}
function onHRNotify(e){
  const { bpm, rr } = parseHeartRate(e.target.value);
  hrLatestBpm = bpm;
  if(rr && rr.length){ hrRRBuffer.push(...rr); if(hrRRBuffer.length>60) hrRRBuffer = hrRRBuffer.slice(-60); }
  const bpmEl=$("#hrLiveBpm"); if(bpmEl) bpmEl.textContent = bpm!=null?bpm:"—";
  const zEl=$("#hrLiveZone"); if(zEl) zEl.innerHTML = liveZoneLabel(bpm, hrZones());
  const hrv=hrvFromBuffer(); const hEl=$("#hrLiveHrv"); if(hEl) hEl.innerHTML = hrv!=null?`HRV (RMSSD): <b>${hrv}</b> ms`:"Collecting beat-to-beat data for HRV…";
}
function logHRReading(){
  if(hrLatestBpm==null){ toast("No reading yet — give your monitor a moment."); return; }
  const date = todayISO();
  state.vitalsLog = state.vitalsLog||[];
  const i = state.vitalsLog.findIndex(en=>en.date===date);
  if(i>=0) state.vitalsLog[i] = { ...state.vitalsLog[i], restHR:String(hrLatestBpm) };
  else state.vitalsLog.push({ date, restHR:String(hrLatestBpm), sbp:"", dbp:"", spo2:"", weight:"", glucose:"", temp:"" });
  state.vitalsLog.sort((a,b)=>a.date<b.date?-1:1);
  save(); renderVitalsLog(); renderRisks();
  toast(`Logged ${hrLatestBpm} bpm to today's vitals.`);
}
function disconnectHRMonitor(){
  try{ if(hrChar) hrChar.removeEventListener("characteristicvaluechanged", onHRNotify); }catch(e){}
  try{ if(hrDevice && hrDevice.gatt && hrDevice.gatt.connected) hrDevice.gatt.disconnect(); }catch(e){}
  onHRDisconnected();
  toast("Monitor disconnected.");
}
function onHRDisconnected(){
  hrDevice=null; hrChar=null; hrLatestBpm=null; hrRRBuffer=[]; hrBattery=null;
  renderHRMonitor();
}

function renderVitalsLog(){
  const el=$("#vitalsLogBody"); if(!el) return;
  const log=(state.vitalsLog||[]).slice();
  if(!log.length){ el.innerHTML=`<div class="empty" style="padding:22px 10px"><div class="big">🩺</div><div>No vitals logged yet — add a set above and log again over the coming days to see your trend.</div></div>`; return; }
  const cells = VITAL_METRICS.map(m=>{
    const vals=log.map(e=>vnum(e[m.k])).filter(x=>x!=null);
    if(!vals.length) return "";
    const last=vals[vals.length-1], delta=Math.round((last-vals[0])*10)/10;
    let arrow="—", cls="tflat", txt="first reading";
    if(vals.length>1){
      arrow = delta>0?"▲":delta<0?"▼":"—";
      const dir = delta>0?"up":delta<0?"down":"flat";
      cls = (m.good==="neutral"||dir==="flat") ? "tflat" : (m.good===dir ? "tgood":"tbad");
      txt = (delta>0?"+":"")+delta+" from first";
    }
    return `<div class="vcell"><div class="vck">${m.label}</div><div class="vcv">${last}<span class="vcu"> ${m.unit}</span></div><div class="vct ${cls}">${arrow} ${esc(txt)}</div></div>`;
  }).join("");
  const m = VITAL_METRICS.find(x=>x.k===healthChartMetric) || VITAL_METRICS[0];
  const opts = VITAL_METRICS.map(x=>`<option value="${x.k}" ${x.k===healthChartMetric?"selected":""}>${x.label}</option>`).join("");
  const list = log.slice().reverse().map(e=>{
    const parts=[];
    if(e.sbp!==""||e.dbp!=="") parts.push(`BP ${e.sbp||"?"}/${e.dbp||"?"}`);
    VITAL_METRICS.filter(x=>!["sbp","dbp"].includes(x.k) && e[x.k]!=="").forEach(x=>parts.push(`${x.label} ${e[x.k]}`));
    return `<li class="logrow"><span class="ld">${fmtDate(e.date)}</span><span class="ln">${esc(parts.join(" · "))}</span><span class="lx" data-vdate="${e.date}" title="Delete">✕</span></li>`;
  }).join("");
  el.innerHTML=`<div class="vtrendgrid">${cells}</div>
    <div class="vchartsel"><label>Trend chart: <select id="vlChartMetric">${opts}</select></label></div>
    <div class="chartwrap">${metricChartSVG(log, m)}</div>
    <ul class="loglist">${list}</ul>`;
  const cm=$("#vlChartMetric"); if(cm) cm.onchange=()=>{ healthChartMetric=cm.value; renderVitalsLog(); };
  $$("#vitalsLogBody .lx").forEach(x=>x.onclick=()=>{ if(confirm("Delete this entry?")) deleteVitals(x.dataset.vdate); });
}
function metricChartSVG(log, m){
  const pts=log.map(e=>({d:e.date, v:vnum(e[m.k])})).filter(p=>p.v!=null);
  if(!pts.length) return `<div class="hint" style="padding:10px">No ${esc(m.label)} values logged yet — pick another metric or add readings.</div>`;
  const W=700,H=180,padL=34,padR=12,padT=14,padB=24, plotW=W-padL-padR, plotH=H-padT-padB;
  const vals=pts.map(p=>p.v); let mn=Math.min(...vals), mx=Math.max(...vals);
  if(mn===mx){ mn-=1; mx+=1; } const gap=(mx-mn)*0.15; mn-=gap; mx+=gap;
  const n=pts.length, x=i=> n<=1?padL+plotW/2:padL+(i/(n-1))*plotW, y=v=> padT+(1-(v-mn)/(mx-mn))*plotH;
  const Pp=pts.map((p,i)=>[x(i),y(p.v)]);
  const line=Pp.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area=`M${Pp[0][0].toFixed(1)} ${(padT+plotH).toFixed(1)} `+Pp.map(p=>"L"+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ")+` L${Pp[n-1][0].toFixed(1)} ${(padT+plotH).toFixed(1)} Z`;
  const grid=[mx,(mn+mx)/2,mn].map(v=>{const gy=y(v);return `<line class="grid" x1="${padL}" y1="${gy.toFixed(1)}" x2="${W-padR}" y2="${gy.toFixed(1)}"/><text class="axislbl" x="4" y="${(gy+3).toFixed(1)}">${Math.round(v)}</text>`;}).join("");
  const dots=Pp.map(p=>`<circle class="dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"/>`).join("");
  const xl = n>1?`<text class="axislbl" x="${padL}" y="${H-6}">${fmtDate(pts[0].d).replace(/,.*/,"")}</text><text class="axislbl" x="${W-padR}" y="${H-6}" text-anchor="end">${fmtDate(pts[n-1].d).replace(/,.*/,"")}</text>`:"";
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(m.label)} over time">${grid}${n>1?`<path class="area" d="${area}"/><path class="line" d="${line}"/>`:""}${dots}${xl}<text class="axislbl" x="4" y="10">${esc(m.unit)}</text></svg>`;
}

/* ---- lab values with editable targets, colour coding & improvement tips ---- */
const LABS = [
  { id:"tchol", name:"Total cholesterol", unit:"mg/dL", lo:0, hi:200, domain:"cardiac",
    improveHigh:"Cut saturated & trans fats, eat more soluble fiber (oats, beans, fruit & veg), exercise regularly, lose excess weight, and discuss cholesterol-lowering options with your doctor.", improveLow:"" },
  { id:"ldl", name:"LDL ('bad') cholesterol", unit:"mg/dL", lo:0, hi:100, domain:"cardiac",
    improveHigh:"Reduce saturated/trans fats, add soluble fiber and plant sterols, exercise, lose excess weight, and ask your doctor whether a statin is right for you.", improveLow:"" },
  { id:"hdl", name:"HDL ('good') cholesterol", unit:"mg/dL", lo:40, hi:200, domain:"cardiac",
    improveHigh:"", improveLow:"Regular aerobic exercise, stopping smoking, and healthy fats (olive oil, nuts, oily fish) help raise HDL." },
  { id:"trig", name:"Triglycerides", unit:"mg/dL", lo:0, hi:150, domain:"cardiac",
    improveHigh:"Cut sugar, refined carbs and alcohol, lose excess weight, exercise, and eat omega-3-rich fish.", improveLow:"" },
  { id:"glucoseF", name:"Fasting glucose", unit:"mg/dL", lo:70, hi:99, domain:"cardiac",
    improveHigh:"Reduce sugary drinks and refined carbs, lose excess weight, exercise regularly, and review blood-sugar screening/care with your clinician.", improveLow:"Frequent lows need review — carry fast-acting carbs and discuss your medications with your clinician." },
  { id:"a1c", name:"HbA1c", unit:"%", lo:0, hi:5.7, domain:"cardiac",
    improveHigh:"Lower refined carbs and sugar, lose excess weight, build regular activity, and review blood-sugar management with your clinician.", improveLow:"" },
  { id:"crp", name:"hs-CRP (inflammation)", unit:"mg/L", lo:0, hi:3, domain:"inflammation",
    improveHigh:"Address the cause with your doctor; regular exercise, not smoking, a healthy weight and treating infection/inflammation all help lower it.", improveLow:"" },
  { id:"creat", name:"Creatinine", unit:"mg/dL", lo:0.6, hi:1.3, domain:"renal",
    improveHigh:"Stay well hydrated, control blood pressure and glucose, avoid NSAIDs and very high protein/salt, and see your doctor about kidney function.", improveLow:"" },
  { id:"egfr", name:"eGFR (kidney filtration)", unit:"mL/min", lo:60, hi:200, domain:"renal",
    improveHigh:"", improveLow:"Protect kidney function: control BP and glucose, stay hydrated, avoid NSAIDs, moderate salt and protein, and see your doctor — a low eGFR needs review." },
  { id:"bun", name:"Blood urea nitrogen (BUN)", unit:"mg/dL", lo:7, hi:20, domain:"renal",
    improveHigh:"Often reflects hydration, protein intake or kidney function — hydrate well and review with your clinician.", improveLow:"" },
  { id:"potassium", name:"Potassium", unit:"mmol/L", lo:3.5, hi:5.1, domain:"electrolyte",
    improveHigh:"High potassium can be dangerous — review potassium-rich foods and your medications with your clinician promptly (urgent if very high).", improveLow:"Discuss with your clinician; don't self-supplement potassium." },
  { id:"sodium", name:"Sodium", unit:"mmol/L", lo:135, hi:145, domain:"electrolyte",
    improveHigh:"Usually reflects fluid balance — review fluid intake and medications with your clinician.", improveLow:"Low sodium needs medical review — don't drastically change fluid/salt intake without advice." },
  { id:"acr", name:"Urine albumin/creatinine (ACR)", unit:"mg/g", lo:0, hi:30, domain:"renal",
    improveHigh:"Tightly control blood pressure and glucose, don't smoke, and see your doctor — protein in the urine is an early kidney-stress signal.", improveLow:"" },
  { id:"alt", name:"ALT", unit:"U/L", lo:0, hi:56, domain:"hepatic",
    improveHigh:"Reduce alcohol, lose weight if overweight (fatty liver), avoid unnecessary hepatotoxic medicines/supplements, and see your doctor.", improveLow:"" },
  { id:"ast", name:"AST", unit:"U/L", lo:0, hi:40, domain:"hepatic",
    improveHigh:"Cut back alcohol, address fatty liver with weight loss and exercise, and review medications/supplements with your doctor.", improveLow:"" },
  { id:"alp", name:"Alkaline phosphatase (ALP)", unit:"U/L", lo:44, hi:147, domain:"hepatic",
    improveHigh:"Can reflect the liver or bone — see your doctor to find the cause.", improveLow:"" },
  { id:"bili", name:"Total bilirubin", unit:"mg/dL", lo:0.1, hi:1.2, domain:"hepatic",
    improveHigh:"See your doctor to find the cause; reduce alcohol and stay hydrated.", improveLow:"" },
  { id:"ggt", name:"GGT", unit:"U/L", lo:9, hi:48, domain:"hepatic",
    improveHigh:"Strongly linked to alcohol — cutting back usually lowers it; also review medications with your doctor.", improveLow:"" },
  { id:"albumin", name:"Albumin", unit:"g/dL", lo:3.5, hi:5, domain:"hepatic",
    improveHigh:"", improveLow:"Often reflects nutrition or inflammation — prioritise adequate protein and see your clinician about the cause." },
  { id:"hgb", name:"Hemoglobin", unit:"g/dL", lo:12, hi:17, domain:"cbc",
    improveHigh:"See your doctor to find the cause; stay well hydrated.", improveLow:"Eat iron-rich foods (lean red meat, beans, leafy greens) with vitamin C, and see your doctor — anemia can signal GI blood loss or a deficiency." },
  { id:"ferritin", name:"Ferritin (iron stores)", unit:"ng/mL", lo:30, hi:300, domain:"iron",
    improveHigh:"See your doctor to find the cause of high iron stores.", improveLow:"Iron-rich diet and supplements as advised — and find the cause of iron loss with your doctor." },
  { id:"b12", name:"Vitamin B12", unit:"pg/mL", lo:200, hi:900, domain:"vitamins",
    improveHigh:"", improveLow:"B12-rich foods (meat, dairy, eggs) or supplements/injections as advised — common with vegan diets or some medicines." },
  { id:"lipase", name:"Lipase", unit:"U/L", lo:10, hi:140, domain:"gastro",
    improveHigh:"Can indicate pancreas irritation — avoid alcohol and seek medical review (urgently if you have severe abdominal pain).", improveLow:"" },
  { id:"insulin", name:"Fasting insulin", unit:"µIU/mL", lo:2, hi:20, domain:"cardiac",
    improveHigh:"High fasting insulin suggests insulin resistance — cut refined carbs and sugar, lose excess weight, and exercise (resistance training especially helps).", improveLow:"" },
  { id:"uricacid", name:"Uric acid", unit:"mg/dL", lo:3.5, hi:7.2, domain:"cardiac",
    improveHigh:"Reduce alcohol (especially beer), sugary drinks and high-purine foods (red/organ meat, shellfish), stay hydrated, and lose excess weight; discuss gout risk with your doctor.", improveLow:"" },
  { id:"homocysteine", name:"Homocysteine", unit:"µmol/L", lo:0, hi:15, domain:"cardiac",
    improveHigh:"Often improves with folate, B12 and B6 (leafy greens, legumes, fortified foods) — discuss testing and supplements with your doctor.", improveLow:"" },
  { id:"nonhdl", name:"Non-HDL cholesterol", unit:"mg/dL", lo:0, hi:130, domain:"cardiac",
    improveHigh:"This is every harmful cholesterol particle combined — lower it by cutting saturated/trans fats, adding fiber, exercising, losing excess weight, and discussing lipid therapy with your doctor.", improveLow:"" },
  { id:"cholratio", name:"Total cholesterol : HDL ratio", unit:"ratio", lo:0, hi:5, domain:"cardiac",
    improveHigh:"Improve the ratio by raising HDL (exercise, healthy fats, not smoking) and lowering LDL and triglycerides.", improveLow:"" },
  { id:"apob", name:"Apolipoprotein B (ApoB)", unit:"mg/dL", lo:0, hi:90, domain:"cardiac",
    improveHigh:"ApoB counts artery-clogging particles — lower it with the same steps as LDL (diet, exercise, weight loss, and lipid therapy if your doctor advises).", improveLow:"" },
  { id:"lpa", name:"Lipoprotein(a)", unit:"mg/dL", lo:0, hi:30, domain:"cardiac",
    improveHigh:"Lp(a) is largely genetic and not very diet-responsive — focus on tightly controlling every other risk factor (blood pressure, LDL, not smoking) and discuss it with your doctor.", improveLow:"" },
  { id:"troponin", name:"Troponin", unit:"ng/mL", lo:0, hi:0.04, domain:"cardiac",
    improveHigh:"A raised troponin can mean heart-muscle strain or damage — if this is a new result with chest pain or breathlessness, seek urgent care; otherwise review promptly with your doctor.", improveLow:"" },
  { id:"bnp", name:"BNP / NT-proBNP", unit:"pg/mL", lo:0, hi:100, domain:"cardiac",
    improveHigh:"A raised level can reflect heart strain — review with your doctor; controlling blood pressure, fluid/salt and any heart condition helps.", improveLow:"" },
  { id:"ck", name:"Creatine kinase (CK)", unit:"U/L", lo:30, hi:200, domain:"cardiac",
    improveHigh:"CK rises with muscle breakdown, including after intense exercise — space out very heavy workouts; if you have muscle pain/weakness or dark urine, seek review.", improveLow:"" },

  { id:"cystatinc", name:"Cystatin C", unit:"mg/L", lo:0.5, hi:1, domain:"renal",
    improveHigh:"Like creatinine, a higher cystatin C suggests reduced kidney filtration — protect your kidneys (blood pressure, glucose, hydration, avoid NSAIDs) and see your doctor.", improveLow:"" },

  { id:"chloride", name:"Chloride", unit:"mmol/L", lo:98, hi:107, domain:"electrolyte",
    improveHigh:"Usually reflects hydration and acid-base balance — review with your clinician.", improveLow:"Usually reflects fluid or acid-base balance — review with your clinician." },
  { id:"co2", name:"CO₂ (bicarbonate)", unit:"mmol/L", lo:22, hi:29, domain:"electrolyte",
    improveHigh:"Reflects acid-base and breathing balance — review with your clinician.", improveLow:"Can reflect acid-base balance, breathing or kidney function — review with your clinician." },
  { id:"calcium", name:"Calcium", unit:"mg/dL", lo:8.6, hi:10.3, domain:"electrolyte",
    improveHigh:"High calcium needs review (parathyroid, vitamin D or other causes) — stay hydrated and see your doctor.", improveLow:"Ensure enough dietary calcium and vitamin D, and see your doctor about the cause." },
  { id:"magnesium", name:"Magnesium", unit:"mg/dL", lo:1.7, hi:2.2, domain:"electrolyte",
    improveHigh:"Usually medication- or kidney-related — review with your clinician.", improveLow:"Magnesium-rich foods (nuts, seeds, leafy greens, whole grains) or a supplement as advised." },
  { id:"phosphorus", name:"Phosphorus", unit:"mg/dL", lo:2.5, hi:4.5, domain:"electrolyte",
    improveHigh:"Often kidney-related — review diet and kidney function with your doctor.", improveLow:"Balanced nutrition usually restores it — review with your clinician." },

  { id:"bilid", name:"Direct (conjugated) bilirubin", unit:"mg/dL", lo:0, hi:0.3, domain:"hepatic",
    improveHigh:"See your doctor to find the cause (liver- or bile-duct-related).", improveLow:"" },
  { id:"totprotein", name:"Total protein", unit:"g/dL", lo:6, hi:8.3, domain:"hepatic",
    improveHigh:"Can reflect dehydration or other causes — review with your clinician.", improveLow:"Often reflects nutrition or inflammation — ensure adequate protein and see your doctor." },
  { id:"globulin", name:"Globulin", unit:"g/dL", lo:2, hi:3.5, domain:"hepatic",
    improveHigh:"Can reflect inflammation or immune activity — review with your clinician.", improveLow:"Review with your clinician." },
  { id:"ldh", name:"Lactate dehydrogenase (LDH)", unit:"U/L", lo:122, hi:222, domain:"hepatic",
    improveHigh:"A non-specific marker of tissue turnover — your doctor interprets it in context.", improveLow:"" },

  { id:"hct", name:"Hematocrit", unit:"%", lo:36, hi:50, domain:"cbc",
    improveHigh:"Often dehydration or smoking — stay hydrated; a persistently high level needs review.", improveLow:"Reflects anemia — see your doctor; iron, B12 or folate may help depending on the cause." },
  { id:"rbc", name:"Red blood cell count (RBC)", unit:"×10¹²/L", lo:4.2, hi:5.9, domain:"cbc",
    improveHigh:"Stay well hydrated; a persistently high count needs review (including smoking and oxygen levels).", improveLow:"A low count (anemia) — iron/B12/folate-rich diet and see your doctor for the cause." },
  { id:"wbc", name:"White blood cell count (WBC)", unit:"×10⁹/L", lo:4, hi:11, domain:"cbc",
    improveHigh:"A high white count often means infection or inflammation — see your doctor if you're unwell.", improveLow:"A low count can raise infection risk — avoid sick contacts and see your doctor." },
  { id:"platelets", name:"Platelets", unit:"×10⁹/L", lo:150, hi:400, domain:"cbc",
    improveHigh:"Can reflect inflammation, iron deficiency or other causes — review with your doctor.", improveLow:"A low platelet count raises bleeding risk — avoid contact injury and see your doctor." },
  { id:"mcv", name:"MCV (red-cell size)", unit:"fL", lo:80, hi:100, domain:"cbc",
    improveHigh:"Large red cells can reflect low B12/folate or alcohol — check those with your doctor.", improveLow:"Small red cells often mean iron deficiency — check iron studies with your doctor." },
  { id:"mch", name:"MCH", unit:"pg", lo:27, hi:33, domain:"cbc",
    improveHigh:"Review with your doctor alongside B12 and folate.", improveLow:"Often iron deficiency — check iron studies with your doctor." },
  { id:"mchc", name:"MCHC", unit:"g/dL", lo:32, hi:36, domain:"cbc",
    improveHigh:"Review with your doctor.", improveLow:"Often iron deficiency — check iron studies." },
  { id:"rdw", name:"RDW", unit:"%", lo:11.5, hi:14.5, domain:"cbc",
    improveHigh:"A high RDW (mixed red-cell sizes) can point to iron, B12 or folate deficiency — check with your doctor.", improveLow:"" },

  { id:"iron", name:"Serum iron", unit:"µg/dL", lo:60, hi:170, domain:"iron",
    improveHigh:"See your doctor to find the cause of iron overload; limit iron supplements.", improveLow:"Iron-rich foods with vitamin C, and supplements as advised — and find the cause of the loss." },
  { id:"tibc", name:"Total iron-binding capacity (TIBC)", unit:"µg/dL", lo:250, hi:450, domain:"iron",
    improveHigh:"A high TIBC often reflects iron deficiency — check iron studies and diet with your doctor.", improveLow:"Review with your doctor (can reflect iron overload or other causes)." },
  { id:"transferrinsat", name:"Transferrin saturation", unit:"%", lo:20, hi:50, domain:"iron",
    improveHigh:"A high saturation can indicate iron overload — see your doctor.", improveLow:"A low saturation suggests iron deficiency — iron-rich diet and review the cause with your doctor." },

  { id:"ft4", name:"Free T4", unit:"ng/dL", lo:0.8, hi:1.8, domain:"thyroid",
    improveHigh:"A high free T4 suggests an overactive thyroid — discuss with your doctor.", improveLow:"A low free T4 suggests an underactive thyroid — discuss with your doctor." },
  { id:"ft3", name:"Free T3", unit:"pg/mL", lo:2.3, hi:4.2, domain:"thyroid",
    improveHigh:"Discuss thyroid function with your doctor.", improveLow:"Discuss thyroid function with your doctor." },
  { id:"tpo", name:"TPO antibodies", unit:"IU/mL", lo:0, hi:34, domain:"thyroid",
    improveHigh:"Raised thyroid antibodies suggest autoimmune thyroid disease — monitor thyroid function with your doctor.", improveLow:"" },
  { id:"cortisol", name:"Cortisol (morning)", unit:"µg/dL", lo:6, hi:23, domain:"thyroid",
    improveHigh:"Persistently high cortisol needs review (stress, medication or gland causes) — see your doctor.", improveLow:"Low cortisol needs prompt review — see your doctor." },
  { id:"testosterone", name:"Testosterone (total)", unit:"ng/dL", lo:300, hi:1000, domain:"thyroid",
    improveHigh:"Review with your doctor.", improveLow:"Sleep, regular exercise, a healthy weight and treating other conditions help — discuss with your doctor." },
  { id:"psa", name:"PSA (prostate)", unit:"ng/mL", lo:0, hi:4, domain:"thyroid",
    improveHigh:"A raised PSA needs review with your doctor — it often has benign causes, not only prostate cancer.", improveLow:"" },

  { id:"folate", name:"Folate", unit:"ng/mL", lo:3, hi:20, domain:"vitamins",
    improveHigh:"", improveLow:"Folate-rich foods (leafy greens, legumes, fortified grains) or a supplement as advised." },
  { id:"b6", name:"Vitamin B6", unit:"µg/L", lo:5, hi:50, domain:"vitamins",
    improveHigh:"Very high B6 is usually from over-supplementing — review your dose with your clinician.", improveLow:"B6-rich foods (poultry, fish, potatoes, bananas) or a supplement as advised." },

  { id:"esr", name:"ESR (sedimentation rate)", unit:"mm/hr", lo:0, hi:20, domain:"inflammation",
    improveHigh:"A non-specific marker of inflammation — see your doctor to find the cause.", improveLow:"" },

  { id:"inr", name:"INR", unit:"ratio", lo:0.8, hi:1.2, domain:"coagulation",
    improveHigh:"If you take warfarin, a high INR raises bleeding risk — follow your anticoagulation clinic; otherwise review with your doctor.", improveLow:"If you take warfarin, a low INR means less protection than intended — follow your clinic's advice." },
  { id:"pt", name:"Prothrombin time (PT)", unit:"sec", lo:11, hi:13.5, domain:"coagulation",
    improveHigh:"A long PT can reflect clotting-factor or liver issues, or blood thinners — review with your doctor.", improveLow:"" },
  { id:"ptt", name:"aPTT", unit:"sec", lo:25, hi:35, domain:"coagulation",
    improveHigh:"A long aPTT can reflect clotting issues or heparin — review with your doctor.", improveLow:"" },
  { id:"ddimer", name:"D-dimer", unit:"µg/mL", lo:0, hi:0.5, domain:"coagulation",
    improveHigh:"Non-specific but can indicate a clot — with leg swelling/pain or breathlessness, seek urgent care; otherwise review with your doctor.", improveLow:"" },
  { id:"fibrinogen", name:"Fibrinogen", unit:"mg/dL", lo:200, hi:400, domain:"coagulation",
    improveHigh:"Often reflects inflammation — review with your doctor.", improveLow:"A low fibrinogen can affect clotting — review with your doctor." },

  { id:"amylase", name:"Amylase", unit:"U/L", lo:30, hi:110, domain:"gastro",
    improveHigh:"Like lipase, can indicate pancreas irritation — avoid alcohol and seek review (urgently with severe abdominal pain).", improveLow:"" },

  { id:"vitd", name:"Vitamin D (25-OH)", unit:"ng/mL", lo:30, hi:100, domain:"vitamins",
    improveHigh:"Very high levels usually mean over-supplementing — review your dose with your clinician.", improveLow:"Safe sun exposure, vitamin-D foods (oily fish, fortified foods) and a supplement as advised." },
  { id:"tsh", name:"TSH (thyroid)", unit:"mIU/L", lo:0.4, hi:4, domain:"thyroid",
    improveHigh:"A high TSH suggests an underactive thyroid — discuss thyroid testing and any medication with your doctor.", improveLow:"A low TSH suggests an overactive thyroid — discuss with your doctor." },

  // ---- CBC differential ----
  { id:"neutpct", name:"Neutrophils %", unit:"%", lo:40, hi:70, domain:"cbc",
    improveHigh:"Often reflects infection, inflammation or stress — see your doctor if you're unwell.", improveLow:"A low neutrophil count can raise infection risk — avoid sick contacts and see your doctor." },
  { id:"neutabs", name:"Neutrophils (absolute)", unit:"×10⁹/L", lo:1.5, hi:8, domain:"cbc",
    improveHigh:"Usually infection or inflammation — review with your doctor.", improveLow:"Neutropenia raises infection risk — see your doctor promptly if you develop a fever." },
  { id:"lymphpct", name:"Lymphocytes %", unit:"%", lo:20, hi:45, domain:"cbc",
    improveHigh:"Often a viral infection — review with your doctor if it persists.", improveLow:"Can follow stress, steroids or infection — review with your doctor." },
  { id:"lymphabs", name:"Lymphocytes (absolute)", unit:"×10⁹/L", lo:1, hi:4, domain:"cbc",
    improveHigh:"Review with your doctor.", improveLow:"Review with your doctor if persistently low." },
  { id:"monopct", name:"Monocytes %", unit:"%", lo:2, hi:10, domain:"cbc",
    improveHigh:"Can accompany chronic infection or inflammation — review with your doctor.", improveLow:"" },
  { id:"eospct", name:"Eosinophils %", unit:"%", lo:0, hi:6, domain:"cbc",
    improveHigh:"Often allergy or asthma (occasionally parasites) — review with your doctor.", improveLow:"" },
  { id:"basopct", name:"Basophils %", unit:"%", lo:0, hi:2, domain:"cbc",
    improveHigh:"A persistent rise needs review with your doctor.", improveLow:"" },
  { id:"mpv", name:"MPV (platelet size)", unit:"fL", lo:7.5, hi:11.5, domain:"cbc",
    improveHigh:"Interpreted alongside your platelet count — review with your doctor.", improveLow:"Interpreted alongside your platelet count — review with your doctor." },
  { id:"retic", name:"Reticulocytes", unit:"%", lo:0.5, hi:2.5, domain:"cbc",
    improveHigh:"A high count shows the marrow making red cells quickly (e.g. after blood loss) — review the cause.", improveLow:"A low count can mean reduced marrow production — see your doctor." },

  // ---- Cardiac & metabolic (extended) ----
  { id:"ckmb", name:"CK-MB", unit:"ng/mL", lo:0, hi:5, domain:"cardiac",
    improveHigh:"A heart-muscle marker — a raised level with chest pain needs urgent care; otherwise review with your doctor.", improveLow:"" },
  { id:"myoglobin", name:"Myoglobin", unit:"ng/mL", lo:0, hi:85, domain:"cardiac",
    improveHigh:"Rises with muscle or heart-muscle injury — review in context with your doctor.", improveLow:"" },
  { id:"cpeptide", name:"C-peptide", unit:"ng/mL", lo:0.8, hi:3.1, domain:"cardiac",
    improveHigh:"High C-peptide reflects insulin resistance — fewer refined carbs, weight loss and exercise help.", improveLow:"Low C-peptide means little insulin production — discuss diabetes care with your doctor." },
  { id:"fructosamine", name:"Fructosamine", unit:"µmol/L", lo:200, hi:285, domain:"cardiac",
    improveHigh:"Reflects blood sugar over the past 2–3 weeks — reduce refined carbs/sugar, lose excess weight and exercise.", improveLow:"" },
  { id:"glucoseR", name:"Random glucose", unit:"mg/dL", lo:70, hi:140, domain:"cardiac",
    improveHigh:"Reduce sugary drinks and refined carbs, lose excess weight, and review blood-sugar care with your clinician.", improveLow:"Frequent lows need review — carry fast-acting carbs and discuss your medications." },
  { id:"lactate", name:"Lactate (lactic acid)", unit:"mmol/L", lo:0.5, hi:2.2, domain:"cardiac",
    improveHigh:"Rises with hard exercise, but a high resting level needs prompt medical review.", improveLow:"" },

  // ---- Electrolytes & minerals (extended) ----
  { id:"ionca", name:"Ionized calcium", unit:"mmol/L", lo:1.12, hi:1.32, domain:"electrolyte",
    improveHigh:"High calcium needs review (parathyroid, vitamin D or other causes) — see your doctor.", improveLow:"Ensure enough calcium and vitamin D, and see your doctor about the cause." },
  { id:"aniongap", name:"Anion gap", unit:"mmol/L", lo:8, hi:16, domain:"electrolyte",
    improveHigh:"A high anion gap can signal a metabolic problem — needs medical review.", improveLow:"Usually not important on its own — review with your doctor." },
  { id:"osmolality", name:"Serum osmolality", unit:"mOsm/kg", lo:275, hi:295, domain:"electrolyte",
    improveHigh:"Often dehydration or high glucose/sodium — hydrate and review with your clinician.", improveLow:"Often fluid overload or low sodium — review with your clinician." },
  { id:"zinc", name:"Zinc", unit:"µg/dL", lo:60, hi:120, domain:"electrolyte",
    improveHigh:"Usually over-supplementing — review your dose.", improveLow:"Zinc-rich foods (meat, shellfish, legumes, seeds) or a supplement as advised." },
  { id:"copper", name:"Copper", unit:"µg/dL", lo:70, hi:140, domain:"electrolyte",
    improveHigh:"A high copper needs review with your doctor.", improveLow:"Copper-rich foods (shellfish, nuts, seeds, whole grains) or a supplement as advised." },

  // ---- Hepatic (extended) ----
  { id:"ammonia", name:"Ammonia", unit:"µmol/L", lo:15, hi:45, domain:"hepatic",
    improveHigh:"A high ammonia (often liver-related) needs prompt review, especially with confusion.", improveLow:"" },
  { id:"haptoglobin", name:"Haptoglobin", unit:"mg/dL", lo:30, hi:200, domain:"hepatic",
    improveHigh:"Often reflects inflammation — review with your doctor.", improveLow:"A low haptoglobin can indicate red-cell breakdown (hemolysis) — review with your doctor." },

  // ---- Thyroid & endocrine (extended) ----
  { id:"tt4", name:"Total T4", unit:"µg/dL", lo:4.5, hi:11.7, domain:"thyroid",
    improveHigh:"Discuss thyroid function with your doctor.", improveLow:"Discuss thyroid function with your doctor." },
  { id:"tt3", name:"Total T3", unit:"ng/dL", lo:80, hi:200, domain:"thyroid",
    improveHigh:"Discuss thyroid function with your doctor.", improveLow:"Discuss thyroid function with your doctor." },
  { id:"rt3", name:"Reverse T3", unit:"ng/dL", lo:8, hi:25, domain:"thyroid",
    improveHigh:"Interpreted with the rest of your thyroid panel — discuss with your doctor.", improveLow:"" },
  { id:"thyroglobulin", name:"Thyroglobulin", unit:"ng/mL", lo:1.4, hi:29.2, domain:"thyroid",
    improveHigh:"Used mainly to monitor thyroid conditions — discuss with your doctor.", improveLow:"" },
  { id:"pth", name:"Parathyroid hormone (PTH)", unit:"pg/mL", lo:15, hi:65, domain:"thyroid",
    improveHigh:"High PTH needs review (calcium, vitamin D, kidney or parathyroid causes) — see your doctor.", improveLow:"Low PTH is interpreted alongside your calcium — see your doctor." },
  { id:"dheas", name:"DHEA-sulfate", unit:"µg/dL", lo:35, hi:430, domain:"thyroid",
    improveHigh:"A high level needs review (adrenal or hormonal causes) — see your doctor.", improveLow:"Often falls with age; review with your doctor if you have symptoms." },
  { id:"igf1", name:"IGF-1", unit:"ng/mL", lo:50, hi:300, domain:"thyroid",
    improveHigh:"A high IGF-1 needs review (growth-hormone causes) — see your doctor.", improveLow:"Can reflect nutrition or pituitary function — review with your doctor." },
  { id:"acth", name:"ACTH", unit:"pg/mL", lo:7.2, hi:63, domain:"thyroid",
    improveHigh:"Interpreted alongside cortisol — discuss with your doctor.", improveLow:"Interpreted alongside cortisol — discuss with your doctor." },
  { id:"aldosterone", name:"Aldosterone", unit:"ng/dL", lo:3, hi:16, domain:"thyroid",
    improveHigh:"A high level (often with high BP or low potassium) needs review — see your doctor.", improveLow:"Review with your doctor." },

  // ---- Reproductive & sex hormones ----
  { id:"estradiol", name:"Estradiol (E2)", unit:"pg/mL", lo:15, hi:350, domain:"reproductive",
    improveHigh:"Levels vary widely by sex and menstrual-cycle phase — interpret with your doctor.", improveLow:"Levels vary by sex, cycle and menopause — discuss with your doctor." },
  { id:"progesterone", name:"Progesterone", unit:"ng/mL", lo:0, hi:25, domain:"reproductive",
    improveHigh:"Varies through the menstrual cycle — interpret with your doctor.", improveLow:"Varies through the cycle — discuss with your doctor." },
  { id:"fsh", name:"FSH", unit:"mIU/mL", lo:1.5, hi:12.4, domain:"reproductive",
    improveHigh:"A high FSH can reflect reduced ovarian/testicular function or menopause — discuss with your doctor.", improveLow:"Review with your doctor (pituitary or hormonal causes)." },
  { id:"lh", name:"LH", unit:"mIU/mL", lo:1.7, hi:8.6, domain:"reproductive",
    improveHigh:"Interpreted with FSH and sex hormones — discuss with your doctor.", improveLow:"Interpreted with FSH — discuss with your doctor." },
  { id:"prolactin", name:"Prolactin", unit:"ng/mL", lo:2, hi:18, domain:"reproductive",
    improveHigh:"A high prolactin needs review (medications or a pituitary cause) — see your doctor.", improveLow:"" },
  { id:"shbg", name:"Sex hormone-binding globulin (SHBG)", unit:"nmol/L", lo:18, hi:54, domain:"reproductive",
    improveHigh:"Interpreted alongside testosterone/estrogen — discuss with your doctor.", improveLow:"Often linked to insulin resistance — weight loss and exercise can help; discuss with your doctor." },
  { id:"freetesto", name:"Free testosterone", unit:"pg/mL", lo:47, hi:244, domain:"reproductive",
    improveHigh:"Interpret with total testosterone — discuss with your doctor.", improveLow:"Sleep, exercise, a healthy weight and treating other conditions help; discuss with your doctor." },
  { id:"amh", name:"Anti-Müllerian hormone (AMH)", unit:"ng/mL", lo:1, hi:4, domain:"reproductive",
    improveHigh:"A high AMH can accompany PCOS — discuss with your doctor.", improveLow:"A low AMH reflects lower ovarian reserve — discuss with your doctor." },
  { id:"hcg", name:"hCG (pregnancy)", unit:"mIU/mL", lo:0, hi:5, domain:"reproductive",
    improveHigh:"A positive hCG usually indicates pregnancy — confirm with your doctor.", improveLow:"" },

  // ---- Vitamins & nutrition (extended) ----
  { id:"vita", name:"Vitamin A (retinol)", unit:"µg/dL", lo:20, hi:60, domain:"vitamins",
    improveHigh:"Usually over-supplementing — review your dose (too much vitamin A can be harmful).", improveLow:"Vitamin-A-rich foods (dairy, eggs, orange/green vegetables) or a supplement as advised." },
  { id:"vite", name:"Vitamin E", unit:"mg/L", lo:5.5, hi:17, domain:"vitamins",
    improveHigh:"Usually over-supplementing — review your dose.", improveLow:"Vitamin-E-rich foods (nuts, seeds, vegetable oils) or a supplement as advised." },
  { id:"vitc", name:"Vitamin C", unit:"mg/dL", lo:0.4, hi:2, domain:"vitamins",
    improveHigh:"", improveLow:"Vitamin-C-rich foods (citrus, berries, peppers, broccoli) or a supplement as advised." },
  { id:"vitk", name:"Vitamin K", unit:"ng/mL", lo:0.1, hi:2.2, domain:"vitamins",
    improveHigh:"", improveLow:"Vitamin-K-rich foods (leafy greens) — but keep intake steady if you take warfarin, and discuss with your doctor." },
  { id:"b1", name:"Vitamin B1 (thiamine)", unit:"nmol/L", lo:70, hi:180, domain:"vitamins",
    improveHigh:"", improveLow:"Thiamine-rich foods (whole grains, legumes, pork) or a supplement — low levels are common with heavy alcohol use." },
  { id:"b2", name:"Vitamin B2 (riboflavin)", unit:"µg/L", lo:4, hi:24, domain:"vitamins",
    improveHigh:"", improveLow:"Riboflavin-rich foods (dairy, eggs, lean meat, greens) or a supplement as advised." },
  { id:"mma", name:"Methylmalonic acid (MMA)", unit:"µmol/L", lo:0, hi:0.4, domain:"vitamins",
    improveHigh:"A high MMA can confirm B12 deficiency — B12-rich foods or supplements/injections as advised.", improveLow:"" },
  { id:"selenium", name:"Selenium", unit:"µg/L", lo:70, hi:150, domain:"vitamins",
    improveHigh:"Usually over-supplementing — review your dose.", improveLow:"Selenium-rich foods (Brazil nuts, seafood, eggs) or a supplement as advised." },
  { id:"prealbumin", name:"Prealbumin (nutrition)", unit:"mg/dL", lo:18, hi:45, domain:"vitamins",
    improveHigh:"", improveLow:"A short-term nutrition marker — prioritise adequate protein and calories, and review with your clinician." },
  { id:"omega3", name:"Omega-3 index", unit:"%", lo:8, hi:12, domain:"vitamins",
    improveHigh:"", improveLow:"Eat more oily fish (salmon, sardines, mackerel) or take an omega-3 supplement as advised." },

  // ---- Inflammatory & immune markers (extended) ----
  { id:"procalcitonin", name:"Procalcitonin", unit:"ng/mL", lo:0, hi:0.5, domain:"inflammation",
    improveHigh:"A raised procalcitonin can indicate a bacterial infection — see your doctor.", improveLow:"" },
  { id:"rf", name:"Rheumatoid factor (RF)", unit:"IU/mL", lo:0, hi:14, domain:"inflammation",
    improveHigh:"A positive RF can accompany rheumatoid arthritis and other conditions — review with your doctor.", improveLow:"" },
  { id:"anticcp", name:"Anti-CCP antibody", unit:"U/mL", lo:0, hi:20, domain:"inflammation",
    improveHigh:"A positive anti-CCP is fairly specific for rheumatoid arthritis — see your doctor.", improveLow:"" },
  { id:"c3", name:"Complement C3", unit:"mg/dL", lo:90, hi:180, domain:"inflammation",
    improveHigh:"Rises with inflammation — review with your doctor.", improveLow:"A low C3 can accompany autoimmune conditions — review with your doctor." },
  { id:"c4", name:"Complement C4", unit:"mg/dL", lo:10, hi:40, domain:"inflammation",
    improveHigh:"Review with your doctor.", improveLow:"A low C4 can accompany autoimmune conditions — review with your doctor." },
  { id:"igg", name:"Immunoglobulin IgG", unit:"mg/dL", lo:700, hi:1600, domain:"inflammation",
    improveHigh:"Review with your doctor (chronic infection/inflammation or other causes).", improveLow:"A low IgG can raise infection risk — review with your doctor." },
  { id:"iga", name:"Immunoglobulin IgA", unit:"mg/dL", lo:70, hi:400, domain:"inflammation",
    improveHigh:"Review with your doctor.", improveLow:"Review with your doctor." },
  { id:"igm", name:"Immunoglobulin IgM", unit:"mg/dL", lo:40, hi:230, domain:"inflammation",
    improveHigh:"Often reflects a recent infection — review with your doctor.", improveLow:"Review with your doctor." },
  { id:"ige", name:"Immunoglobulin IgE", unit:"IU/mL", lo:0, hi:100, domain:"inflammation",
    improveHigh:"Often reflects allergy or asthma — discuss with your doctor.", improveLow:"" },

  // ---- Coagulation (extended) ----
  { id:"thrombintime", name:"Thrombin time", unit:"sec", lo:14, hi:19, domain:"coagulation",
    improveHigh:"A long thrombin time can reflect heparin or clotting-factor issues — review with your doctor.", improveLow:"" },
  { id:"antithrombin", name:"Antithrombin III", unit:"%", lo:80, hi:120, domain:"coagulation",
    improveHigh:"", improveLow:"A low antithrombin raises clot risk — review with your doctor." },
  { id:"proteinc", name:"Protein C", unit:"%", lo:70, hi:140, domain:"coagulation",
    improveHigh:"", improveLow:"A low protein C raises clot risk — review with your doctor." },
  { id:"proteins", name:"Protein S", unit:"%", lo:65, hi:140, domain:"coagulation",
    improveHigh:"", improveLow:"A low protein S raises clot risk — review with your doctor." },
  { id:"antixa", name:"Anti-Xa (heparin level)", unit:"IU/mL", lo:0.3, hi:0.7, domain:"coagulation",
    improveHigh:"Used to dose heparin — your care team adjusts based on this.", improveLow:"Used to dose heparin — your care team adjusts based on this." },

  // ---- Renal (extended) ----
  { id:"b2micro", name:"Beta-2 microglobulin", unit:"mg/L", lo:0.8, hi:2.4, domain:"renal",
    improveHigh:"Can reflect kidney function or other conditions — review with your doctor.", improveLow:"" },
  { id:"buncreat", name:"BUN/creatinine ratio", unit:"ratio", lo:10, hi:20, domain:"renal",
    improveHigh:"Often reflects dehydration or GI bleeding — hydrate and review with your doctor.", improveLow:"Review with your doctor in context." },

  // ---- Tumor markers ----
  { id:"cea", name:"CEA", unit:"ng/mL", lo:0, hi:3, domain:"tumor",
    improveHigh:"A screening/monitoring marker (also higher in smokers) — a raised level needs review with your doctor.", improveLow:"" },
  { id:"ca199", name:"CA 19-9", unit:"U/mL", lo:0, hi:37, domain:"tumor",
    improveHigh:"Used to monitor certain conditions — a raised level needs review with your doctor.", improveLow:"" },
  { id:"ca125", name:"CA 125", unit:"U/mL", lo:0, hi:35, domain:"tumor",
    improveHigh:"Can rise with several conditions, not only cancer — review with your doctor.", improveLow:"" },
  { id:"ca153", name:"CA 15-3", unit:"U/mL", lo:0, hi:30, domain:"tumor",
    improveHigh:"Used to monitor certain conditions — review a raised level with your doctor.", improveLow:"" },
  { id:"afp", name:"Alpha-fetoprotein (AFP)", unit:"ng/mL", lo:0, hi:8, domain:"tumor",
    improveHigh:"Can rise with liver conditions and some tumours — review with your doctor.", improveLow:"" },

  // ---- Arterial blood gas ----
  { id:"ph", name:"Blood pH", unit:"", lo:7.35, hi:7.45, domain:"bloodgas",
    improveHigh:"An abnormal pH reflects an acid-base problem and needs prompt medical review.", improveLow:"An abnormal pH reflects an acid-base problem and needs prompt medical review." },
  { id:"pco2", name:"pCO₂", unit:"mmHg", lo:35, hi:45, domain:"bloodgas",
    improveHigh:"A high pCO₂ can mean under-breathing (CO₂ retention) — review with your doctor.", improveLow:"A low pCO₂ can mean over-breathing — review with your doctor." },
  { id:"po2", name:"pO₂", unit:"mmHg", lo:80, hi:100, domain:"bloodgas",
    improveHigh:"Usually from supplemental oxygen — review with your care team.", improveLow:"A low pO₂ means low blood oxygen — use prescribed oxygen and seek review; seek urgent care if very breathless." },
  { id:"baseexcess", name:"Base excess", unit:"mmol/L", lo:-2, hi:2, domain:"bloodgas",
    improveHigh:"Part of the acid-base picture — interpreted with pH and bicarbonate by your doctor.", improveLow:"Part of the acid-base picture — interpreted with pH and bicarbonate by your doctor." },
  { id:"o2sat", name:"O₂ saturation (blood gas)", unit:"%", lo:95, hi:100, domain:"bloodgas",
    improveHigh:"", improveLow:"A low oxygen saturation needs review — use prescribed oxygen; seek urgent care if very breathless." }
];
const LAB_DOMAINS = [
  { key:"cardiac",      label:"🫀 Cardiac & metabolic" },
  { key:"renal",        label:"🫘 Renal (kidney) function" },
  { key:"electrolyte",  label:"🧂 Electrolytes & minerals" },
  { key:"hepatic",      label:"🩺 Hepatic (liver) panel" },
  { key:"cbc",          label:"🩸 Complete blood count (CBC)" },
  { key:"iron",         label:"🧲 Iron studies" },
  { key:"thyroid",      label:"🦋 Thyroid & endocrine" },
  { key:"reproductive", label:"🧬 Reproductive & sex hormones" },
  { key:"vitamins",     label:"💊 Vitamins & nutrition" },
  { key:"inflammation", label:"🔥 Inflammatory & immune markers" },
  { key:"coagulation",  label:"🩹 Coagulation (clotting)" },
  { key:"tumor",        label:"🎗️ Tumor markers" },
  { key:"gastro",       label:"🍽️ Gastrointestinal & pancreatic" },
  { key:"bloodgas",     label:"🫧 Arterial blood gas" }
];
function labStatusVal(lab, value){
  const v=vnum(value); if(v==null) return "none";
  const e=state.labs[lab.id]||{};
  const lo=vnum(e.lo)??lab.lo, hi=vnum(e.hi)??lab.hi;
  if(v<lo) return "low"; if(v>hi) return "high"; return "ok";
}
function labStatusOf(lab){ const e=state.labs[lab.id]; if(!e || e.v==="" || e.v==null) return "none"; return labStatusVal(lab, e.v); }
const fmtShort = iso2 => { try{ const d=new Date(iso2+"T00:00:00"); return isNaN(d.getTime())?iso2:d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"2-digit"}); }catch(e){ return iso2; } };
// Prior dated readings (from uploads) shown as a comparison strip under each lab.
function labHistInner(lab){
  const h=(state.labHist&&state.labHist[lab.id])||[];
  if(!h.length) return "";
  const chips=h.slice().sort((a,b)=>a.d<b.d?1:-1).map(r=>{
    const st=labStatusVal(lab, r.v), cls=st==="ok"?"labok":st==="none"?"labnone":"labbad";
    return `<span class="labhistchip ${cls}"><span class="lhd">${esc(fmtShort(r.d))}</span>${esc(String(r.v))}</span>`;
  }).join("");
  return `<span class="labhistlbl">📅 By collection date</span>${chips}`;
}
function labPill(st){
  if(st==="ok")   return { cls:"labok",   pill:"✓ in range" };
  if(st==="high") return { cls:"labbad",  pill:"↑ high" };
  if(st==="low")  return { cls:"labbad",  pill:"↓ low" };
  return { cls:"labnone", pill:"—" };
}
function labTip(lab, st){
  return st==="high" ? (lab.improveHigh||"") : st==="low" ? (lab.improveLow||"") : "";
}
function labRowHTML(lab){
  const e=state.labs[lab.id]||{};
  const v=(e.v??""), lo=(e.lo??lab.lo), hi=(e.hi??lab.hi);
  const st=labStatusOf(lab), { cls, pill }=labPill(st), tip=labTip(lab, st);
  return `<div class="labrow ${cls}" data-id="${lab.id}">
    <div class="labname">${esc(lab.name)} <span class="labunit">${esc(lab.unit)}</span></div>
    <div class="labinputs">
      <input class="labval" data-lab="${lab.id}" value="${esc(String(v))}" placeholder="your value" inputmode="decimal" />
      <span class="labtarget">Reference Range <input class="labt" data-lab="${lab.id}" data-b="lo" value="${esc(String(lo))}" inputmode="decimal" aria-label="reference range low" />–<input class="labt" data-lab="${lab.id}" data-b="hi" value="${esc(String(hi))}" inputmode="decimal" aria-label="reference range high" /></span>
      <span class="labpill ${cls}">${pill}</span>
    </div>
    <div class="labtip"${tip?"":' style="display:none"'}>💡 ${tip}</div>
    <div class="labhist">${labHistInner(lab)}</div>
  </div>`;
}
function refreshLabRow(id){
  const lab=LABS.find(l=>l.id===id), row=$(`#labsBody .labrow[data-id="${id}"]`); if(!lab||!row) return;
  const st=labStatusOf(lab), { cls, pill }=labPill(st), tip=labTip(lab, st);
  row.className="labrow "+cls;
  const p=row.querySelector(".labpill"); if(p){ p.className="labpill "+cls; p.textContent=pill; }
  const t=row.querySelector(".labtip"); if(t){ if(tip){ t.style.display=""; t.innerHTML="💡 "+tip; } else t.style.display="none"; }
  const h=row.querySelector(".labhist"); if(h) h.innerHTML=labHistInner(lab);
}
function renderLabs(){
  const el=$("#labsBody"); if(!el) return;
  el.innerHTML = LAB_DOMAINS.map(d=>{
    const rows=LABS.filter(l=>l.domain===d.key).map(labRowHTML).join("");
    return `<div class="labdomain"><h3 class="labdh">${esc(d.label)}</h3>${rows}</div>`;
  }).join("");
  $$("#labsBody .labval").forEach(inp=>inp.oninput=()=>{ const id=inp.dataset.lab; (state.labs[id]=state.labs[id]||{}).v=inp.value.trim(); save(); refreshLabRow(id); renderRisks(); });
  $$("#labsBody .labt").forEach(inp=>inp.oninput=()=>{ const id=inp.dataset.lab; (state.labs[id]=state.labs[id]||{})[inp.dataset.b]=inp.value.trim(); save(); refreshLabRow(id); renderRisks(); });
}

/* ---- import lab values from an uploaded file (CSV/TSV/TXT/JSON on-device; PDF/photos via Claude API) ---- */
const LAB_ALIASES = {
  tchol:["total cholesterol","cholesterol total","cholesterol, total","chol total"],
  ldl:["ldl cholesterol","ldl-c","ldl chol","ldl","low density"],
  hdl:["hdl cholesterol","hdl-c","hdl chol","hdl","high density"],
  nonhdl:["non-hdl cholesterol","non hdl cholesterol","non-hdl","non hdl","nonhdl"],
  cholratio:["cholesterol/hdl ratio","cholesterol hdl ratio","total cholesterol : hdl","chol/hdl","cholesterol ratio"],
  apob:["apolipoprotein b","apo b","apob"],
  lpa:["lipoprotein(a)","lipoprotein a","lp(a)","lpa"],
  trig:["triglycerides","triglyceride","trig"],
  glucoseF:["fasting glucose","glucose fasting","glucose, fasting","fasting blood glucose","fbg","fbs","glucose"],
  a1c:["hemoglobin a1c","haemoglobin a1c","glycated hemoglobin","glycohemoglobin","hba1c","a1c"],
  insulin:["fasting insulin","insulin"],
  uricacid:["uric acid","urate"],
  homocysteine:["homocysteine"],
  troponin:["troponin","hs-trop","trop"],
  bnp:["nt-probnp","ntprobnp","pro-bnp","natriuretic peptide","bnp"],
  ck:["creatine kinase","cpk","ck"],
  crp:["hs-crp","hscrp","c-reactive protein","c reactive protein","crp"],
  creat:["creatinine","creat"],
  egfr:["estimated gfr","glomerular filtration","egfr","gfr"],
  bun:["urea nitrogen","blood urea","bun"],
  cystatinc:["cystatin c","cystatin"],
  potassium:["potassium","serum potassium"],
  sodium:["sodium","serum sodium"],
  chloride:["chloride"],
  co2:["bicarbonate","carbon dioxide","hco3","co2"],
  calcium:["calcium"],
  magnesium:["magnesium"],
  phosphorus:["phosphorus","phosphate"],
  acr:["albumin/creatinine ratio","albumin creatinine ratio","albumin/creatinine","microalbumin","uacr","acr"],
  alt:["alanine aminotransferase","alanine transaminase","sgpt","alt"],
  ast:["aspartate aminotransferase","aspartate transaminase","sgot","ast"],
  alp:["alkaline phosphatase","alk phos","alp"],
  ggt:["gamma-glutamyl transferase","gamma glutamyl","ggtp","ggt"],
  bili:["total bilirubin","bilirubin total","bilirubin, total","tbili","t bili","bilirubin"],
  bilid:["direct bilirubin","conjugated bilirubin","bilirubin direct"],
  albumin:["albumin"],
  totprotein:["total protein","protein, total","protein total"],
  globulin:["globulin"],
  ldh:["lactate dehydrogenase","ldh"],
  hgb:["hemoglobin","haemoglobin","hgb","hb"],
  hct:["hematocrit","haematocrit","hct","pcv"],
  rbc:["red blood cell","red cell count","erythrocyte","rbc"],
  wbc:["white blood cell","white cell count","leukocyte","wbc"],
  platelets:["platelet count","platelets","platelet","plt"],
  mcv:["mean corpuscular volume","mcv"],
  mch:["mean corpuscular hemoglobin","mch"],
  mchc:["mean corpuscular hemoglobin concentration","mchc"],
  rdw:["red cell distribution width","rdw"],
  ferritin:["ferritin"],
  iron:["serum iron","iron"],
  tibc:["total iron binding capacity","total iron-binding","tibc"],
  transferrinsat:["transferrin saturation","transferrin sat","iron saturation","tsat"],
  tsh:["thyroid stimulating hormone","thyrotropin","tsh"],
  ft4:["free t4","free thyroxine","ft4"],
  ft3:["free t3","free triiodothyronine","ft3"],
  tpo:["thyroid peroxidase","anti-tpo","tpo antibod","tpo"],
  cortisol:["cortisol"],
  testosterone:["testosterone"],
  psa:["prostate specific antigen","prostate-specific","psa"],
  vitd:["vitamin d","25-hydroxy","25 hydroxy","25-oh","calcidiol"],
  b12:["vitamin b12","cobalamin","b12"],
  folate:["folate","folic acid"],
  b6:["vitamin b6","pyridoxine","b6"],
  esr:["erythrocyte sedimentation","sedimentation rate","sed rate","esr"],
  inr:["inr"],
  pt:["prothrombin time","prothrombin"],
  ptt:["partial thromboplastin","aptt","ptt"],
  ddimer:["d-dimer","d dimer","ddimer"],
  fibrinogen:["fibrinogen"],
  lipase:["lipase"],
  amylase:["amylase"],
  neutpct:["neutrophils %","neutrophil %","neutrophils percent","neut %","neutrophils"],
  neutabs:["neutrophils absolute","absolute neutrophil","neutrophil count","anc"],
  lymphpct:["lymphocytes %","lymphocyte %","lymphs %","lymphocytes"],
  lymphabs:["lymphocytes absolute","absolute lymphocyte","lymphocyte count"],
  monopct:["monocytes","monocyte %"],
  eospct:["eosinophils","eosinophil %"],
  basopct:["basophils","basophil %"],
  mpv:["mean platelet volume","mpv"],
  retic:["reticulocyte","reticulocytes","retic"],
  ckmb:["ck-mb","ckmb","ck mb"],
  myoglobin:["myoglobin"],
  cpeptide:["c-peptide","c peptide","cpeptide"],
  fructosamine:["fructosamine"],
  glucoseR:["random glucose","glucose random","non-fasting glucose","glucose, random"],
  lactate:["lactic acid","lactate"],
  ionca:["ionized calcium","ionised calcium","free calcium","calcium ionized"],
  aniongap:["anion gap"],
  osmolality:["osmolality","osmolarity"],
  zinc:["zinc"],
  copper:["copper"],
  ammonia:["ammonia"],
  haptoglobin:["haptoglobin"],
  tt4:["total t4","t4 total","total thyroxine","thyroxine, total"],
  tt3:["total t3","t3 total","total triiodothyronine"],
  rt3:["reverse t3","rt3"],
  thyroglobulin:["thyroglobulin"],
  pth:["parathyroid hormone","parathormone","intact pth","pth"],
  dheas:["dhea-sulfate","dhea sulfate","dhea-s","dheas"],
  igf1:["insulin-like growth factor","somatomedin","igf-1","igf 1"],
  acth:["adrenocorticotropic","acth"],
  aldosterone:["aldosterone"],
  estradiol:["estradiol","oestradiol","e2"],
  progesterone:["progesterone"],
  fsh:["follicle stimulating hormone","follicle-stimulating","fsh"],
  lh:["luteinizing hormone","luteinising hormone","lh"],
  prolactin:["prolactin"],
  shbg:["sex hormone binding globulin","sex hormone-binding","shbg"],
  freetesto:["free testosterone"],
  amh:["anti-mullerian","anti-müllerian","anti mullerian","amh"],
  hcg:["chorionic gonadotropin","beta-hcg","beta hcg","hcg"],
  vita:["vitamin a","retinol"],
  vite:["vitamin e","tocopherol"],
  vitc:["vitamin c","ascorbic acid","ascorbate"],
  vitk:["vitamin k","phylloquinone"],
  b1:["vitamin b1","thiamine","thiamin"],
  b2:["vitamin b2","riboflavin"],
  mma:["methylmalonic acid","mma"],
  selenium:["selenium"],
  prealbumin:["prealbumin","transthyretin"],
  omega3:["omega-3 index","omega 3 index","omega-3 fatty acid"],
  procalcitonin:["procalcitonin"],
  rf:["rheumatoid factor"],
  anticcp:["anti-ccp","anti ccp","ccp antibody","cyclic citrullinated"],
  c3:["complement c3","c3"],
  c4:["complement c4","c4"],
  igg:["immunoglobulin g","igg"],
  iga:["immunoglobulin a","iga"],
  igm:["immunoglobulin m","igm"],
  ige:["immunoglobulin e","ige"],
  thrombintime:["thrombin time"],
  antithrombin:["antithrombin"],
  proteinc:["protein c"],
  proteins:["protein s"],
  antixa:["anti-xa","anti xa","anti-factor xa","heparin level"],
  b2micro:["beta-2 microglobulin","beta 2 microglobulin","b2 microglobulin"],
  buncreat:["bun/creatinine","bun creatinine ratio","urea/creatinine ratio"],
  cea:["carcinoembryonic","cea"],
  ca199:["ca 19-9","ca19-9","ca 199"],
  ca125:["ca 125","ca-125"],
  ca153:["ca 15-3","ca15-3"],
  afp:["alpha-fetoprotein","alpha fetoprotein","afp"],
  ph:["blood ph","ph"],
  pco2:["partial pressure of carbon dioxide","paco2","pco2"],
  po2:["partial pressure of oxygen","pao2","po2"],
  baseexcess:["base excess","base deficit"],
  o2sat:["oxygen saturation","o2 saturation","o2 sat","sao2"]
};
const reEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function labName(id){ const l=LABS.find(x=>x.id===id); return l?l.name:id; }
function labUnit(id){ const l=LABS.find(x=>x.id===id); return l?l.unit:""; }
function aliasHit(low, a){ return new RegExp("(^|[^a-z0-9])"+reEsc(a)+"([^a-z0-9]|$)","i").test(low); }
function longestAlias(low){
  let best=null, bestLen=0;
  for(const id in LAB_ALIASES) for(const a of LAB_ALIASES[id]) if(a.length>bestLen && aliasHit(low, a)){ best=id; bestLen=a.length; }
  return best;
}
function parseLineForLab(line){
  const low=" "+line.toLowerCase()+" ";
  const id=longestAlias(low); if(!id) return null;
  // strip the test's own name (some aliases contain digits, e.g. 'a1c','b12','25-oh') so we don't read those as the value,
  // then drop parenthetical notes, reference ranges (a-b) and comparators (<a / >a); the first remaining number is the result
  let cleaned=line;
  (LAB_ALIASES[id]||[]).forEach(a=>{ cleaned=cleaned.replace(new RegExp(reEsc(a),"ig")," "); });
  cleaned=cleaned.replace(/\([^)]*\)/g," ").replace(/\d+(\.\d+)?\s*[-–—]\s*\d+(\.\d+)?/g," ").replace(/[<>]=?\s*\d+(\.\d+)?/g," ");
  const m=cleaned.match(/-?\d+(\.\d+)?/);
  if(m) return { id, value:parseFloat(m[0]), name:labName(id), unit:labUnit(id) };
  const m2=line.match(/[<>]=?\s*(\d+(\.\d+)?)/);           // e.g. eGFR ">60"
  if(m2) return { id, value:parseFloat(m2[1]), name:labName(id), unit:labUnit(id) };
  return null;
}
function jsonParseLabs(j){
  const out=[], seen=new Set();
  const push=(name,val)=>{ if(val==null||val==="") return; const id=matchAlias(String(name)); if(!id||seen.has(id)) return;
    const v=parseFloat(val); if(isNaN(v)) return; seen.add(id); out.push({id, value:v, name:labName(id), unit:labUnit(id)}); };
  if(Array.isArray(j)) j.forEach(o=>{ if(o&&typeof o==="object"){ const name=o.name||o.test||o.label||o.analyte||o.code||o.parameter; const val=o.value??o.result??o.val??o.reading; if(name!=null) push(name,val); } });
  else if(j&&typeof j==="object") Object.entries(j).forEach(([k,v])=>{ (v&&typeof v==="object") ? push(k, v.value??v.result??v.val) : push(k,v); });
  return out;
}
function matchAlias(name){ const low=name.toLowerCase().trim(); if(LABS.some(l=>l.id===low)) return low; return longestAlias(" "+low+" "); }
function localParseLabs(text){
  const t=(text||"").trim();
  if(t.startsWith("{")||t.startsWith("[")){ try{ const c=jsonParseLabs(JSON.parse(t)); if(c.length) return c; }catch(e){} }
  const out=[], seen=new Set();
  t.split(/\r?\n/).forEach(line=>{ const c=parseLineForLab(line); if(c && !seen.has(c.id)){ seen.add(c.id); out.push(c); } });
  return out;
}
// Best-effort collection-date extraction from an uploaded report (defaults to today if none found).
function isoDate(y,mo,d){ const p=n=>String(n).padStart(2,"0"); const M=+mo, D=+d; if(!(+y)||M<1||M>12||D<1||D>31) return null; return `${+y}-${p(M)}-${p(D)}`; }
function parseDateLoose(s){
  if(!s) return null;
  let m=s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); if(m) return isoDate(m[1],m[2],m[3]);              // 2026-07-11
  const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  m=s.match(/([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/i); if(m&&MON[m[1].slice(0,3).toLowerCase()]) return isoDate(m[3],MON[m[1].slice(0,3).toLowerCase()],m[2]); // Jul 11, 2026
  m=s.match(/(\d{1,2})\s+([a-z]{3,9})\.?\s+(\d{4})/i);  if(m&&MON[m[2].slice(0,3).toLowerCase()]) return isoDate(m[3],MON[m[2].slice(0,3).toLowerCase()],m[1]); // 11 Jul 2026
  m=s.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);     if(m){ let y=m[3]; if(y.length===2) y="20"+y; return isoDate(y,m[1],m[2]); }               // 07/11/2026 (assume M/D/Y)
  return null;
}
function detectCollectionDate(text){
  if(!text) return null;
  for(const ln of text.split(/\r?\n/)){
    if(/collect|specimen|drawn|report date|reported|date of service|accession|observation date/i.test(ln)){ const d=parseDateLoose(ln); if(d) return d; }
  }
  return parseDateLoose(text);
}
function fileToBase64(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(",")[1]); r.onerror=()=>rej(new Error("Could not read the file")); r.readAsDataURL(file); }); }
function extractJSON(t){
  if(!t) return null;
  let s=t.trim().replace(/^```(json)?/i,"").replace(/```$/,"").trim();
  try{ return JSON.parse(s); }catch(e){}
  const m=s.match(/\{[\s\S]*\}/); if(m){ try{ return JSON.parse(m[0]); }catch(e){} }
  return null;
}
async function apiParseLabs(payload){
  const known = LABS.map(l=>`${l.id} — ${l.name} (${l.unit}); aliases: ${(LAB_ALIASES[l.id]||[]).join(", ")}`).join("\n");
  const sys = `You extract laboratory test results from the user's document and map each to one of the KNOWN TESTS below.
KNOWN TESTS (id — name (target unit); aliases):
${known}

Return ONLY a JSON object — no prose, no code fences:
{"collectionDate":"YYYY-MM-DD or null","labs":[{"id":"<known id>","value":<number>,"unit":"<unit found>"}]}
Rules: "collectionDate" is the specimen collection/report date if shown (else null). Include a test only if it has a clear numeric result. Use the matching id from the list. If the reported unit differs from the target unit and the conversion is standard and unambiguous, convert to the target unit; otherwise return the original number and its unit. Ignore anything not in the list. If none are found, return {"labs":[]}.`;
  let content;
  if(payload.kind==="text") content=[{type:"text",text:`Extract the lab results from this document:\n\n${payload.text.slice(0,60000)}`}];
  else if(payload.kind==="image") content=[{type:"image",source:{type:"base64",media_type:payload.media_type,data:payload.data}},{type:"text",text:"Extract every lab test result visible in this image."}];
  else content=[{type:"document",source:{type:"base64",media_type:"application/pdf",data:payload.data}},{type:"text",text:"Extract every lab test result from this PDF."}];
  const res=await fetch("https://api.anthropic.com/v1/messages",{ method:"POST",
    headers:{"content-type":"application/json","x-api-key":state.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({ model:state.apiModel||"claude-opus-4-8", max_tokens:1500, system:sys, messages:[{role:"user",content}] }) });
  if(!res.ok){ const t=await res.text().catch(()=>""); throw new Error(`API ${res.status}${t?" — "+t.slice(0,140):""}`); }
  const data=await res.json();
  const txt=(data.content||[]).map(b=>b.text||"").join("");
  const parsed=extractJSON(txt), labs=(parsed&&parsed.labs)||[];
  const collectionDate = parsed && parsed.collectionDate ? parseDateLoose(String(parsed.collectionDate)) : null;
  return { collectionDate, cands: labs.filter(x=>x&&x.id!=null&&x.value!=null).map(x=>({id:x.id, value:x.value, unit:x.unit, name:labName(x.id)})) };
}
async function handleLabFile(file){
  const ext=(file.name.split(".").pop()||"").toLowerCase();
  const isImage=file.type.startsWith("image/")||/^(png|jpg|jpeg|webp|gif|heic)$/.test(ext);
  const isPdf=file.type==="application/pdf"||ext==="pdf";
  labImportMsg("load", `Reading ${esc(file.name)}…`);
  try{
    let cands=[], collectionDate=null;
    if(isImage||isPdf){
      if(!coachOnline()){ labImportMsg("warn","PDFs and photos are parsed with the Claude API. Add your key in the <b>AI</b> tab, or upload a CSV, TSV, TXT or JSON export instead."); return; }
      labImportMsg("load", `Parsing ${isPdf?"PDF":"image"} with Claude…`);
      const r = await apiParseLabs({ kind:isPdf?"pdf":"image", media_type:file.type||"image/jpeg", data:await fileToBase64(file) });
      cands=r.cands; collectionDate=r.collectionDate;
    } else {
      const text=await file.text();
      if(coachOnline()){ labImportMsg("load","Parsing with Claude…"); try{ const r=await apiParseLabs({kind:"text",text}); cands=r.cands; collectionDate=r.collectionDate; }catch(e){ cands=localParseLabs(text); collectionDate=detectCollectionDate(text); } }
      else { cands=localParseLabs(text); collectionDate=detectCollectionDate(text); }
    }
    cands=(cands||[]).filter(c=>LABS.some(l=>l.id===c.id) && c.value!=null && c.value!=="" && !isNaN(parseFloat(c.value)));
    if(!cands.length){ labImportMsg("warn","Couldn't find recognizable lab values in that file. Try a clearer export (CSV/JSON) or enter values manually below."); return; }
    // de-dupe by id, keep first
    const seen=new Set(); cands=cands.filter(c=>seen.has(c.id)?false:(seen.add(c.id),true));
    showLabReview(cands, collectionDate);
  }catch(e){ labImportMsg("err","Import failed: "+esc(e.message||String(e))); }
}
function labImportMsg(kind, html){ const el=$("#labImport"); if(el) el.innerHTML=`<div class="labimsg ${kind}">${html}</div>`; }
function showLabReview(cands, collectionDate){
  const el=$("#labImport"); if(!el) return;
  const dval = collectionDate || todayISO();
  el.innerHTML=`<div class="labreview">
    <div class="labrevhd"><b>Found ${cands.length} value${cands.length>1?"s":""}</b> — check each against your report, confirm the collection date, then apply.</div>
    <label class="labrevdate">🗓 Collection date <input type="date" id="labImportDate" value="${esc(dval)}" /></label>
    ${cands.map((c,i)=>`<label class="labrevrow"><input type="checkbox" class="labrevchk" data-i="${i}" checked />
      <span class="labrevname">${esc(labName(c.id))}</span>
      <input class="labrevval" data-i="${i}" value="${esc(String(c.value))}" inputmode="decimal" />
      <span class="labrevunit">${esc(c.unit||labUnit(c.id))}</span></label>`).join("")}
    <div class="labrevbtns"><button class="btn ghost" id="labRevCancel">Cancel</button><button class="btn primary" id="labRevApply">Apply to my labs</button></div>
    <p class="hint" style="margin:8px 0 0">Automated parsing can make mistakes — verify each value first. Applying keeps a dated record, so uploading another report adds a column you can compare.${coachOnline()?" This file was parsed by the Claude API (its contents were sent to Anthropic).":""}</p>
  </div>`;
  $("#labRevApply").onclick=()=>applyLabImport(cands);
  $("#labRevCancel").onclick=()=>{ el.innerHTML=""; };
}
function applyLabImport(cands){
  const el=$("#labImport"); let n=0;
  const dInp=el.querySelector("#labImportDate");
  const date=(dInp && dInp.value) ? dInp.value : todayISO();
  state.labHist = state.labHist || {};
  cands.forEach((c,i)=>{ const chk=el.querySelector(`.labrevchk[data-i="${i}"]`); if(!chk||!chk.checked) return;
    const vi=el.querySelector(`.labrevval[data-i="${i}"]`); const v=(vi?vi.value:String(c.value)).trim();
    if(v==="") return;
    // record a dated reading for comparison (replace same-date entry), keep sorted
    const arr = state.labHist[c.id] = state.labHist[c.id] || [];
    const ex = arr.findIndex(r=>r.d===date); if(ex>=0) arr[ex]={d:date,v}; else arr.push({d:date,v});
    arr.sort((a,b)=>a.d<b.d?-1:1);
    // the working value shown/scored is the most recent dated reading
    (state.labs[c.id]=state.labs[c.id]||{}).v = arr[arr.length-1].v;
    n++; });
  save(); renderLabs(); renderRisks();
  labImportMsg("ok", `Applied ${n} value${n===1?"":"s"} for ${esc(fmtShort(date))}. ✓ Upload another report to compare over time.`);
  toast(`Imported ${n} lab value${n===1?"":"s"}.`);
}

/* ---- educational risk assessment across 5 specialties ---- */
function computeRisks(){
  const v=latestVitals(), sbp=vnum(v.sbp), dbp=vnum(v.dbp), hr=vnum(v.restHR), glu=vnum(v.glucose);
  const bmi=bmiCalc(v.height, v.weight), age=vnum(state.age);
  const L=id=>vnum((state.labs[id]||{}).v);
  const gt=(x,n)=>x!=null&&x>=n, lt=(x,n)=>x!=null&&x<n;
  const flags=new Set(gatherFlags());
  const conds=selectedConditions().map(c=>c.name.toLowerCase()).join(" | ");
  const smoker=state.smoking==="current", alcHeavy=state.alcohol==="heavy", alcReg=state.alcohol==="regular"||alcHeavy;
  const nsaid=selectedMeds().some(m=>(m.flags||[]).includes("nsaid"));
  const diab = flags.has("diabetes") || gt(L("a1c"),6.5) || gt(glu,126) || gt(L("glucoseF"),126);
  const mk=(domain,title,icon,factors,score,modAt,highAt,note)=>({domain,title,icon,factors,note,
    level: score>=highAt?"high":score>=modAt?"moderate":"low"});
  const R=[];

  { let f=[],s=0;
    if(gt(sbp,160)||gt(dbp,100)){f.push("Blood pressure is high");s+=3;} else if(gt(sbp,140)||gt(dbp,90)){f.push("Blood pressure is elevated");s+=2;} else if(gt(sbp,130)){f.push("Blood pressure is borderline");s+=1;}
    if(gt(L("ldl"),160)||gt(L("tchol"),240)){f.push("LDL / total cholesterol is high");s+=2;} else if(gt(L("ldl"),130)||gt(L("tchol"),200)){f.push("Cholesterol is borderline");s+=1;}
    if(lt(L("hdl"),40)){f.push("HDL ('good') cholesterol is low");s+=1;}
    if(gt(L("trig"),200)){f.push("Triglycerides are high");s+=1;}
    if(diab){f.push("Diabetes / high blood sugar");s+=2;}
    if(smoker){f.push("Current smoker");s+=2;}
    if(bmi!=null&&bmi>=30){f.push("BMI in the obese range");s+=1;}
    if(gt(L("crp"),3)){f.push("hs-CRP (inflammation) is high");s+=1;}
    if(gt(hr,90)){f.push("Resting heart rate is high");s+=1;}
    if(gt(age,70)){f.push("Age 70+");s+=2;} else if(gt(age,55)){f.push("Age 55+");s+=1;}
    R.push(mk("cardiac","Cardiovascular Risk","🫀",f,s,3,6,"Blood pressure, cholesterol, blood sugar, not smoking, a healthy weight and regular aerobic exercise are the biggest levers here.")); }

  { let f=[],s=0;
    if(gt(sbp,160)||gt(dbp,100)){f.push("Blood pressure is high (the #1 stroke risk factor)");s+=3;} else if(gt(sbp,140)||gt(dbp,90)){f.push("Blood pressure is elevated");s+=2;}
    if(/fibrillation|atrial|flutter|arrhythmia/.test(conds)||flags.has("pacemaker_icd")){f.push("Irregular heart-rhythm history");s+=2;}
    if(/stroke|tia|transient ischemic/.test(conds)){f.push("Prior stroke / TIA");s+=2;}
    if(diab){f.push("Diabetes");s+=1;}
    if(smoker){f.push("Current smoker");s+=2;}
    if(gt(L("ldl"),160)){f.push("High LDL cholesterol");s+=1;}
    if(bmi!=null&&bmi>=30){f.push("BMI in the obese range");s+=1;}
    if(gt(age,75)){f.push("Age 75+");s+=2;} else if(gt(age,65)){f.push("Age 65+");s+=1;}
    R.push(mk("stroke","Cerebrovascular Risk","🧠",f,s,3,6,"Controlling blood pressure is the single biggest way to lower cerebrovascular (stroke) risk; treating an irregular heart rhythm and not smoking matter a lot too.")); }

  { let f=[],s=0;
    if(gt(L("alt"),56)||gt(L("ast"),40)){f.push("Liver enzymes (ALT/AST) are raised");s+=2;}
    if(gt(L("ggt"),48)){f.push("GGT is raised (often alcohol-related)");s+=1;}
    if(gt(L("bili"),1.2)){f.push("Bilirubin is high");s+=1;}
    if(lt(L("albumin"),3.5)){f.push("Albumin is low");s+=1;}
    if(alcHeavy){f.push("Heavy alcohol use");s+=2;} else if(alcReg){f.push("Regular alcohol use");s+=1;}
    if(bmi!=null&&bmi>=30){f.push("BMI in obese range (fatty-liver risk)");s+=1;}
    if(diab){f.push("Diabetes (fatty-liver risk)");s+=1;}
    R.push(mk("hepatic","Hepatic Risk","🩺",f,s,2,5,"Cutting alcohol, reaching a healthy weight, and controlling blood sugar are the main ways to protect your liver.")); }

  { let f=[],s=0;
    if(lt(L("egfr"),45)||gt(L("creat"),1.5)){f.push("Kidney filtration (eGFR/creatinine) is reduced");s+=3;} else if(lt(L("egfr"),60)||gt(L("creat"),1.3)){f.push("Kidney filtration is mildly reduced");s+=2;}
    if(gt(L("acr"),30)){f.push("Protein in the urine (raised ACR)");s+=2;}
    if(gt(sbp,140)||gt(dbp,90)){f.push("High blood pressure");s+=1;}
    if(diab){f.push("Diabetes");s+=1;}
    if(gt(L("potassium"),5.1)){f.push("Potassium is high");s+=1;}
    if(gt(age,70)){f.push("Age 70+");s+=1;}
    R.push(mk("renal","Renal Risk","🫘",f,s,3,6,"Kidneys are protected mainly by controlling blood pressure and blood sugar, staying hydrated, and avoiding NSAIDs and excess salt.")); }

  { let f=[],s=0;
    if(state.screen&&state.screen.weightloss){f.push("Unexplained weight loss (flagged)");s+=2;}
    if(lt(L("hgb"),12)){f.push("Low hemoglobin (anemia — can signal GI blood loss)");s+=2;}
    if(lt(L("ferritin"),30)){f.push("Low iron stores (ferritin)");s+=1;}
    if(gt(L("lipase"),140)){f.push("High lipase (pancreas irritation)");s+=2;}
    if(alcHeavy){f.push("Heavy alcohol use");s+=2;} else if(alcReg){f.push("Regular alcohol use");s+=1;}
    if(nsaid){f.push("Regular NSAID use (stomach-bleed risk)");s+=1;}
    if(bmi!=null&&bmi>=30){f.push("BMI in obese range (reflux risk)");s+=1;}
    if(smoker){f.push("Current smoker");s+=1;}
    if(state.screen&&state.screen.fever){f.push("Fever with symptoms (flagged)");s+=1;}
    R.push(mk("gastro","Gastrointestinal Risk","🍽️",f,s,2,5,"Limiting alcohol and NSAIDs, not smoking, a fiber-rich diet and a healthy weight protect your gut. Unexplained weight loss, blood, or persistent symptoms need prompt review.")); }

  { let f=[],s=0; const spo2v=vnum(v.spo2);
    if(spo2v!=null&&spo2v<92){f.push("Oxygen saturation (SpO₂) is low");s+=3;} else if(spo2v!=null&&spo2v<95){f.push("Oxygen saturation is borderline");s+=1;}
    if(smoker){f.push("Current smoker");s+=3;} else if(state.smoking==="former"){f.push("Former smoker");s+=1;}
    if(flags.has("pulmonary")){f.push("Existing lung / breathing condition");s+=2;}
    if(state.parq&&state.parq.pain){f.push("Breathlessness or chest tightness with exertion");s+=1;}
    if(bmi!=null&&bmi>=35){f.push("Very high BMI (can restrict breathing)");s+=1;}
    if(gt(age,65)){f.push("Age 65+");s+=1;}
    R.push(mk("pulmonary","Pulmonary Risk","🫁",f,s,2,5,"Not smoking is by far the biggest protector of your lungs; regular aerobic exercise, breathing techniques, staying up to date on vaccinations and avoiding air pollutants help too. Get a lasting cough, wheeze, or new breathlessness checked.")); }

  return R;
}
function renderRisks(){
  const el=$("#riskBody"); if(!el) return;
  const risks=computeRisks();
  const lvlTxt={low:"Lower",moderate:"Moderate",high:"Higher"}, lvlCls={low:"risk-low",moderate:"risk-mod",high:"risk-high"};
  el.innerHTML = risks.map(r=>{
    const cls=lvlCls[r.level];
    const facts = r.factors.length
      ? `<ul class="riskfactors">${r.factors.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>`
      : `<p class="hint" style="margin:6px 0 0">No major risk factors flagged from what you've entered so far.</p>`;
    return `<div class="riskcard ${cls}">
      <div class="riskhead"><span class="ricon">${r.icon}</span><span class="rtitle">${esc(r.title)}</span><span class="rlevel ${cls}">${lvlTxt[r.level]} risk</span></div>
      ${facts}
      <p class="risknote">${esc(r.note)}</p>
    </div>`;
  }).join("") + `<div class="redflags" style="margin-top:12px"><b>Educational only — not a diagnosis or a validated risk score.</b> These estimates use general thresholds and only the values you entered. Discuss any concerns, and any abnormal labs, with your doctor.</div>`;
  renderOtherRisks();   // keep the cross-cutting "other risks" card in sync on every risk refresh
}

/* Health Risk Areas — clinically-grouped lab interpretation (metabolic, hematology, nutrition,
   thyroid, bone, thrombosis, inflammation/infection, reproductive, oncology awareness).
   Each area only appears once it has relevant data; educational, not diagnostic. */
function computeRiskAreas(){
  const v=latestVitals(), sbp=vnum(v.sbp), dbp=vnum(v.dbp), rr=vnum(v.rr), gluV=vnum(v.glucose);
  const bmi=bmiCalc(v.height,v.weight), sex=state.sex;
  const L=id=>vnum((state.labs[id]||{}).v);
  const has=(...ids)=>ids.some(id=>L(id)!=null);
  const rank={normal:0,info:1,moderate:2,high:3};
  const areas=[];
  function push(icon,title,dataPresent,f,note){
    if(!dataPresent) return;
    let level="normal"; f.forEach(x=>{ if(rank[x.lv]>rank[level]) level=x.lv; });
    const findings = f.length ? f : [{t:"No abnormal values in this area from what you entered.",lv:"normal"}];
    areas.push({icon,title,level,findings,note});
  }

  // ---- Metabolic ----
  { const f=[]; const a1c=L("a1c"),gf=L("glucoseF"),ins=L("insulin"),fru=L("fructosamine"),tg=L("trig"),hdl=L("hdl");
    if(a1c!=null){ if(a1c>=6.5) f.push({t:`HbA1c ${a1c}% — diabetes range`,lv:"high"}); else if(a1c>=5.7) f.push({t:`HbA1c ${a1c}% — prediabetes range`,lv:"moderate"}); }
    if(gf!=null){ if(gf>=126) f.push({t:`Fasting glucose ${gf} — diabetes range`,lv:"high"}); else if(gf>=100) f.push({t:`Fasting glucose ${gf} — prediabetes range`,lv:"moderate"}); }
    if(fru!=null&&fru>285) f.push({t:`Fructosamine ${fru} — average glucose high over the past 2–3 weeks`,lv:"moderate"});
    if(ins!=null&&gf!=null){ const homa=Math.round((gf*ins/405)*10)/10; if(homa>=2.9) f.push({t:`HOMA-IR ${homa} — suggests insulin resistance`,lv:"moderate"}); else f.push({t:`HOMA-IR ${homa} — insulin sensitivity looks normal`,lv:"normal"}); }
    else if(ins!=null&&ins>20) f.push({t:`Fasting insulin ${ins} — high (possible insulin resistance)`,lv:"moderate"});
    const ms=[]; if(bmi!=null&&bmi>=30) ms.push("BMI"); if(tg!=null&&tg>=150) ms.push("triglycerides"); if(hdl!=null&&hdl<(sex==="Female"?50:40)) ms.push("HDL"); if((sbp!=null&&sbp>=130)||(dbp!=null&&dbp>=85)) ms.push("BP"); if((gf!=null&&gf>=100)||(a1c!=null&&a1c>=5.7)) ms.push("glucose");
    if(ms.length>=3) f.push({t:`Metabolic-syndrome criteria met (${ms.length}/5: ${ms.join(", ")})`,lv:ms.length>=4?"high":"moderate"});
    push("🫀","Metabolic", has("a1c","glucoseF","insulin","cpeptide","fructosamine","trig","hdl")||gluV!=null, f,
      "Reversible with weight loss, a lower-sugar whole-food diet and regular exercise. Discuss abnormal sugars or insulin resistance with your clinician."); }

  // ---- Hematology ----
  { const f=[]; const hgb=L("hgb"),hct=L("hct"),mcv=L("mcv"),rdw=L("rdw"),wbc=L("wbc"),plt=L("platelets"),neut=L("neutabs");
    const fer=L("ferritin"),tsat=L("transferrinsat"),b12=L("b12"),fol=L("folate"),hapto=L("haptoglobin"),ldh=L("ldh"),retic=L("retic");
    const lowHgb = hgb!=null && hgb<(sex==="Female"?12:13);
    if(lowHgb){ let type="normocytic"; if(mcv!=null){ if(mcv<80) type="microcytic"; else if(mcv>100) type="macrocytic"; }
      const cause = type==="microcytic" ? ((fer!=null&&fer<30)||(tsat!=null&&tsat<20)?" — iron-deficiency pattern":" — usually iron deficiency")
        : type==="macrocytic" ? (b12!=null&&b12<200?" — low B12":fol!=null&&fol<3?" — low folate":" — check B12/folate & alcohol")
        : " — normocytic (chronic disease, blood loss or early deficiency)";
      f.push({t:`Anemia — Hb ${hgb}, ${type}${cause}`,lv:"high"}); }
    if((hapto!=null&&hapto<30)||((ldh!=null&&ldh>222)&&(retic!=null&&retic>2.5))) f.push({t:"Hemolysis signals — low haptoglobin / high LDH & reticulocytes",lv:"high"});
    if((hgb!=null&&hgb>(sex==="Female"?16:17))||(hct!=null&&hct>52)) f.push({t:"Polycythemia — high hemoglobin/hematocrit (hydrate; raises clot risk)",lv:"moderate"});
    if(wbc!=null&&wbc<4) f.push({t:`Leukopenia — low white cells ${wbc}`,lv:wbc<2?"high":"moderate"});
    if(neut!=null&&neut<1.5) f.push({t:`Neutropenia — low neutrophils ${neut}`,lv:neut<0.5?"high":"moderate"});
    if(plt!=null&&plt<150) f.push({t:`Thrombocytopenia — low platelets ${plt}`,lv:plt<50?"high":"moderate"});
    if(rdw!=null&&rdw>14.5&&!lowHgb) f.push({t:"High RDW (mixed red-cell sizes) — early/combined deficiency possible",lv:"info"});
    push("🔴","Hematology", has("hgb","hct","rbc","mcv","wbc","platelets","ferritin","iron","b12","folate","haptoglobin","ldh","retic","neutabs"), f,
      "Anemia and low counts need a cause found — see your doctor, especially to rule out slow blood loss."); }

  // ---- Nutrition ----
  { const f=[];
    [["vitd",30,"Vitamin D"],["b12",200,"Vitamin B12"],["folate",3,"Folate"],["b6",5,"Vitamin B6"],["b1",70,"Vitamin B1"],["vita",20,"Vitamin A"],["vite",5.5,"Vitamin E"],["vitc",0.4,"Vitamin C"],["vitk",0.1,"Vitamin K"],["zinc",60,"Zinc"],["copper",70,"Copper"],["selenium",70,"Selenium"],["magnesium",1.7,"Magnesium"],["iron",60,"Serum iron"]]
      .forEach(([id,lo,name])=>{ const x=L(id); if(x!=null&&x<lo) f.push({t:`${name} low (${x})`,lv:"moderate"}); });
    const alb=L("albumin"),pre=L("prealbumin"),tp=L("totprotein");
    if(alb!=null&&alb<3.5) f.push({t:`Albumin low (${alb}) — protein/nutrition or inflammation`,lv:"moderate"});
    if(pre!=null&&pre<18) f.push({t:`Prealbumin low (${pre}) — recent protein-calorie intake`,lv:"moderate"});
    if(tp!=null&&tp<6) f.push({t:`Total protein low (${tp})`,lv:"moderate"});
    push("🧁","Nutrition", has("vitd","b12","folate","b6","b1","vita","vite","vitc","vitk","zinc","copper","selenium","magnesium","iron","albumin","prealbumin","totprotein"), f,
      "Targeted diet changes or supplements (as advised) correct these. Low vitamin D and protein also affect bone and muscle recovery."); }

  // ---- Thyroid ----
  { const f=[]; const tsh=L("tsh"),ft4=L("ft4"),ft3=L("ft3"),tpo=L("tpo");
    const lowFT4=ft4!=null&&ft4<0.8, highFT4=ft4!=null&&ft4>1.8;
    if(tsh!=null&&tsh>4){ if(lowFT4) f.push({t:`Overt hypothyroidism — high TSH ${tsh} with low free T4`,lv:"high"}); else if(ft4!=null) f.push({t:`Subclinical hypothyroidism — high TSH ${tsh}, normal free T4`,lv:"moderate"}); else f.push({t:`High TSH ${tsh} — possible underactive thyroid`,lv:"moderate"}); }
    if(tsh!=null&&tsh<0.4){ if(highFT4||(ft3!=null&&ft3>4.2)) f.push({t:`Overt hyperthyroidism — low TSH ${tsh} with high free T4/T3`,lv:"high"}); else if(ft4!=null) f.push({t:`Subclinical hyperthyroidism — low TSH ${tsh}, normal free T4`,lv:"moderate"}); else f.push({t:`Low TSH ${tsh} — possible overactive thyroid`,lv:"moderate"}); }
    if(tpo!=null&&tpo>34) f.push({t:`Raised thyroid antibodies (TPO ${tpo}) — autoimmune thyroid disease`,lv:"moderate"});
    push("🦋","Thyroid", has("tsh","ft4","ft3","tt4","tt3","rt3","tpo","thyroglobulin"), f,
      "Thyroid problems affect energy, weight, heart rate and mood — confirm and manage with your doctor."); }

  // ---- Bone Health ----
  { const f=[]; const ca=L("calcium"),alb=L("albumin"),phos=L("phosphorus"),vitd=L("vitd"),pth=L("pth"),alp=L("alp"),mg=L("magnesium");
    let cca=ca; if(ca!=null&&alb!=null) cca=Math.round((ca+0.8*(4-alb))*10)/10;
    if(cca!=null){ if(cca>10.3) f.push({t:`Calcium high (${cca}${alb!=null?", albumin-corrected":""}) — needs review`,lv:"high"}); else if(cca<8.6) f.push({t:`Calcium low (${cca}${alb!=null?", albumin-corrected":""})`,lv:"moderate"}); }
    if(vitd!=null&&vitd<30) f.push({t:`Vitamin D low (${vitd}) — affects bone & muscle`,lv:"moderate"});
    if(pth!=null){ if(pth>65) f.push({t:`PTH high (${pth}) — parathyroid / vitamin-D / kidney review`,lv:"moderate"}); else if(pth<15) f.push({t:`PTH low (${pth})`,lv:"info"}); }
    if(phos!=null&&(phos>4.5||phos<2.5)) f.push({t:`Phosphate out of range (${phos})`,lv:"info"});
    if(alp!=null&&alp>147) f.push({t:`ALP high (${alp}) — bone or liver source`,lv:"info"});
    if(mg!=null&&mg<1.7) f.push({t:`Magnesium low (${mg}) — affects calcium & PTH`,lv:"info"});
    if(cca!=null&&cca<8.6&&pth!=null&&pth>65&&vitd!=null&&vitd<30) f.push({t:"Pattern: vitamin-D deficiency with secondary hyperparathyroidism",lv:"moderate"});
    push("🦴","Bone Health", has("calcium","phosphorus","vitd","pth","alp","magnesium"), f,
      "Bone is protected by weight-bearing exercise, enough calcium & vitamin D, and not smoking. Abnormal calcium or PTH needs a doctor."); }

  // ---- Thrombosis & bleeding ----
  { const f=[]; const dd=L("ddimer"),fib=L("fibrinogen"),plt=L("platelets"),hct=L("hct"),inr=L("inr"),pt=L("pt"),ptt=L("ptt");
    if(dd!=null&&dd>0.5) f.push({t:`D-dimer raised (${dd}) — non-specific but can indicate a clot`,lv:"high"});
    if(hct!=null&&hct>52) f.push({t:`High hematocrit (${hct}) — hyperviscosity / clot risk`,lv:"moderate"});
    if(fib!=null&&fib>400) f.push({t:`Fibrinogen high (${fib}) — inflammation / clot tendency`,lv:"info"});
    if(plt!=null&&plt>450) f.push({t:`Platelets high (${plt}) — clot tendency`,lv:"info"});
    if(plt!=null&&plt<150) f.push({t:`Platelets low (${plt}) — bleeding risk`,lv:plt<50?"high":"moderate"});
    if(inr!=null&&inr>1.4) f.push({t:`INR raised (${inr}) — anticoagulated / bleeding tendency`,lv:inr>4?"high":"moderate"});
    if(pt!=null&&pt>13.5) f.push({t:`PT prolonged (${pt})`,lv:"moderate"});
    if(ptt!=null&&ptt>35) f.push({t:`aPTT prolonged (${ptt})`,lv:"moderate"});
    if(fib!=null&&fib<200) f.push({t:`Fibrinogen low (${fib}) — bleeding tendency`,lv:"moderate"});
    push("🩹","Thrombosis & bleeding", has("ddimer","fibrinogen","platelets","hct","inr","pt","ptt"), f,
      "Clot warning signs — a hot, swollen, painful calf or sudden breathlessness/chest pain — need urgent care. On blood thinners, watch for unusual bruising or bleeding."); }

  // ---- Inflammation & Infection ----
  { const f=[]; const crp=L("crp"),esr=L("esr"),fer=L("ferritin"),pct=L("procalcitonin"),lac=L("lactate"),wbc=L("wbc"),anc=L("neutabs");
    if(crp!=null&&crp>3) f.push({t:`hs-CRP raised (${crp})`,lv:crp>10?"high":"moderate"});
    if(esr!=null&&esr>20) f.push({t:`ESR raised (${esr})`,lv:"moderate"});
    if(fer!=null&&fer>500) f.push({t:`Ferritin very high (${fer}) — marked inflammation`,lv:"moderate"});
    if(pct!=null&&pct>0.5) f.push({t:`Procalcitonin raised (${pct}) — suggests bacterial infection`,lv:pct>2?"high":"moderate"});
    if(wbc!=null&&wbc>11) f.push({t:`WBC high (${wbc}) — infection / inflammation`,lv:"moderate"});
    if(anc!=null&&anc>8) f.push({t:`Neutrophils high (${anc})`,lv:"info"});
    if(lac!=null&&lac>2) f.push({t:`Lactate raised (${lac})`,lv:lac>4?"high":"moderate"});
    const q=[]; if(rr!=null&&rr>=22) q.push("fast breathing"); if(sbp!=null&&sbp<=100) q.push("low blood pressure");
    if(q.length>=2||(q.length>=1&&((pct!=null&&pct>0.5)||(lac!=null&&lac>2)))) f.push({t:`Sepsis warning signs (${q.join(" + ")}) — if you feel unwell or feverish, seek urgent care`,lv:"high"});
    push("🔥","Inflammation & Infection", has("crp","esr","ferritin","procalcitonin","lactate","wbc","neutabs")||rr!=null, f,
      "A single raised marker is non-specific; combined with feeling unwell or a fever it needs care. Sepsis is a medical emergency."); }

  // ---- Reproductive & Hormonal ----
  { const f=[]; const testo=L("testosterone"),e2=L("estradiol"),fsh=L("fsh"),lh=L("lh"),prl=L("prolactin"),dheas=L("dheas"),amh=L("amh");
    if(sex==="Male"){ if(testo!=null&&testo<300) f.push({t:`Total testosterone low (${testo}) — possible hypogonadism (low-T)`,lv:"moderate"}); }
    else if(sex==="Female"){
      if(fsh!=null&&fsh>25&&e2!=null&&e2<30) f.push({t:"Menopausal pattern — high FSH with low estradiol",lv:"info"});
      if(lh!=null&&fsh!=null&&fsh>0&&(lh/fsh)>=2&&((testo!=null&&testo>70)||(dheas!=null&&dheas>430)||(amh!=null&&amh>4))) f.push({t:"PCOS-suggestive pattern — high LH:FSH with raised androgens/AMH",lv:"moderate"});
    }
    if(prl!=null&&prl>25) f.push({t:`Prolactin high (${prl}) — review (medication or pituitary)`,lv:"moderate"});
    push("🌸","Reproductive & Hormonal", has("testosterone","freetesto","estradiol","progesterone","fsh","lh","prolactin","shbg","dheas","amh"), f,
      sex ? "Hormones are best interpreted with cycle timing, symptoms and sex in mind — review with your doctor." : "Set your sex in the History step so these are interpreted correctly."); }

  // ---- Oncology Marker Awareness ----
  { const f=[];
    [["psa",4,"PSA"],["cea",3,"CEA"],["ca125",35,"CA 125"],["ca199",37,"CA 19-9"],["ca153",30,"CA 15-3"],["afp",8,"AFP"]]
      .forEach(([id,hi,name])=>{ const x=L(id); if(x!=null) f.push(x>hi?{t:`${name} above range (${x}) — many benign causes; discuss with your doctor`,lv:"info"}:{t:`${name} within range (${x})`,lv:"normal"}); });
    push("🎗️","Oncology Marker Awareness", has("psa","cea","ca125","ca199","ca153","afp"), f,
      "IMPORTANT: tumour markers are for MONITORING a known condition, not screening or diagnosis. Raised levels often have benign causes and normal levels don't rule cancer out — use them only as your specialist directs."); }

  return areas;
}
function renderOtherRisks(){
  const el=$("#otherRiskBody"); if(!el) return;
  const areas=computeRiskAreas();
  if(!areas.length){ el.innerHTML=`<div class="empty" style="padding:20px 10px"><div class="big">🧪</div><div>Enter vitals and labs above and these risk areas — Metabolic, Hematology, Nutrition, Thyroid, Bone, Thrombosis, Inflammation & Infection, Reproductive & Hormonal, and Oncology-marker awareness — populate automatically.</div></div>`; return; }
  const lvlTxt={normal:"No flags",info:"Note",moderate:"Review",high:"Abnormal"}, lvlCls={normal:"risk-low",info:"risk-info",moderate:"risk-mod",high:"risk-high"};
  el.innerHTML = areas.map(a=>{
    const cls=lvlCls[a.level]||"risk-info";
    return `<div class="riskcard ${cls}">
      <div class="riskhead"><span class="ricon">${a.icon}</span><span class="rtitle">${esc(a.title)}</span><span class="rlevel ${cls}">${lvlTxt[a.level]||"Note"}</span></div>
      <ul class="riskfindings">${a.findings.map(x=>`<li class="rf-${x.lv||'info'}">${esc(x.t)}</li>`).join("")}</ul>
      <p class="risknote">${esc(a.note)}</p>
    </div>`;
  }).join("") + `<div class="redflags" style="margin-top:12px"><b>Educational only — not a diagnosis.</b> These interpretations use general adult thresholds and only the values you entered; some vary by sex, age and lab. Discuss anything relevant with your clinician.</div>`;
}

function renderHealth(){ renderHRMonitor(); renderVitalsLog(); renderLabs(); renderRisks(); }
function initHealth(){
  const d=$("#vlDate"); if(d && !d.value) d.value=todayISO();
  const sv=$("#vlSave"); if(sv) sv.onclick=saveVitalsEntry;
  const lf=$("#labFile"); if(lf) lf.onchange=e=>{ const f=e.target.files&&e.target.files[0]; if(f) handleLabFile(f); e.target.value=""; };
}

/* =====================================================================
   CLAUDE API COACH (optional) + settings
===================================================================== */
function coachOnline(){ return !!(state.apiKey && state.apiKey.trim()); }
function updateCoachMode(){
  const pill=$("#coachMode"); if(!pill) return;
  const on=coachOnline();
  pill.textContent = on ? "Claude API" : "offline";
  pill.className = "modepill "+(on?"online":"offline");
}
function initCoachSettings(){
  $("#apiKey").value = state.apiKey || "";
  $("#apiModel").value = state.apiModel || "claude-opus-4-8";
  $("#coachSettingsBtn").onclick = ()=>$("#coachSettings").classList.toggle("hide");
  $("#saveKeyBtn").onclick = ()=>{
    state.apiKey = $("#apiKey").value.trim();
    state.apiModel = $("#apiModel").value;
    save(); updateCoachMode(); $("#coachSettings").classList.add("hide");
    toast(coachOnline() ? "Claude API connected." : "Key cleared — using Jeffery's offline mode.");
  };
  $("#clearKeyBtn").onclick = ()=>{
    state.apiKey=""; $("#apiKey").value=""; save(); updateCoachMode();
    toast("Key cleared.");
  };
  updateCoachMode();
}
function buildCoachSystem(){
  const conds = selectedConditions().map(c=>c.name).join(", ") || "none selected";
  const p = state.program;
  const precautions = (p ? p.notes : window.notesForFlags(gatherFlags())).join(" | ") || "none flagged";
  const prog = p ? `${p.totalWeeks}-week ${p.track} program; supervision ${p.supervision}; clearance needed: ${p.clearance}` : "not generated yet";
  const v = state.vitals||{};
  const enteredVitals = [v.restHR&&`resting HR ${v.restHR} bpm`, (v.sbp&&v.dbp)&&`BP ${v.sbp}/${v.dbp}`, v.spo2&&`SpO₂ ${v.spo2}%`, v.rr&&`RR ${v.rr}/min`, bmiCalc(v.height,v.weight)!=null&&`BMI ${bmiCalc(v.height,v.weight)}`].filter(Boolean).join(", ") || "none entered";
  const hz = hrZones();
  const hrLine = hz ? `max HR ≈ ${hz.hrmax} bpm (Tanaka), moderate zone ${fmtRange(hz.zones.moderate)} bpm; recommended effort ${borgTarget().label}${onBetaBlocker()?"; on a beta-blocker, so HR targets are unreliable — advise RPE/talk-test":""}` : `age not set — advise Borg RPE ${borgTarget().label}`;
  const deviceLineHR = hasCardiacDevice() ? `${cardiacDeviceLabel()}${deviceHRCeiling()?` — keep HR under ~${deviceHRCeiling()} bpm (below ICD threshold ${vnum((state.cardiacDevice||{}).icdRate)} bpm)`:""}${hasLVAD()?" — HR unreliable, RPE only":""}; cap intensity, avoid maximal effort` : "none";
  const lifestyle = [state.smoking&&`smoking ${state.smoking}`, state.alcohol&&`alcohol ${state.alcohol}`, state.sleep&&`sleep ${state.sleep}`, state.stress&&`stress ${state.stress}`, state.falls&&`falls/yr ${state.falls}`, (state.aid&&state.aid!=="none")&&`walking aid ${state.aid}`].filter(Boolean).join(", ") || "not specified";
  const redflags = Object.entries(state.screen||{}).filter(([,val])=>val).map(([k])=>k).join(", ") || "none";
  const goals = [ (state.returnActivities||[]).length && `activities: ${state.returnActivities.join(", ")}`, (state.returnSports||[]).length && `sport: ${state.returnSports.join(", ")}` ].filter(Boolean).join("; ") || "none specified";
  const wbLine = wbSummary() || "not specified";
  const deviceLine = (state.devices||[]).map(d=>d.name).join(", ") || "none";
  const spLine = activeSpecialPrecautions().map(p=>p.label).join(", ") || "none";
  const abnormalLabs = LABS.filter(l=>{ const s=labStatusOf(l); return s==="high"||s==="low"; }).map(l=>`${l.name} ${labStatusOf(l)}`).join(", ") || "none entered/all in range";
  const riskAreas = computeRisks().filter(r=>r.level!=="low").map(r=>`${r.title.replace(/ risk$/i,"")} = ${r.level}`).join("; ") || "none flagged";
  return `You are Jeffery, PhysioPath's AI rehabilitation specialist — an educational assistant giving general, evidence-informed physical-rehabilitation guidance. You are an AI, not a licensed clinician, and must not diagnose or replace in-person care.

USER CONTEXT
- Conditions: ${conds}
- Weeks since injury: ${state.weeks ?? "unknown"}; rest pain ${state.painRest}/10, movement pain ${state.painMove}/10; surgery: ${state.surgery}
- Program: ${prog}
- Vitals entered: ${enteredVitals}
- Heart-rate & exertion: ${hrLine}
- Cardiac device: ${deviceLineHR}
- Lifestyle & function: ${lifestyle}
- Red-flag screen positives: ${redflags}
- Return-to goals: ${goals}
- Weight-bearing order: ${wbLine}; braces/orthoses/prostheses: ${deviceLine}
- Surgical-site precautions active: ${spLine}
- Out-of-range labs entered: ${abnormalLabs}
- Educational risk areas (not diagnostic): ${riskAreas}
- Personalized precautions (MUST respect): ${precautions}

RULES
- You are an educational aid, NOT a clinician. Never diagnose or give specific medication doses.
- Always honor the precautions above. If a request is unsafe for these conditions, say so and offer a safer alternative.
- Recommend in-person assessment for anything serious, worsening, or uncertain.
- Treat these as urgent-care red flags: chest pain/pressure, severe breathlessness, fainting, sudden weakness/numbness, trouble speaking, loss of bladder/bowel control, or a hot swollen joint with fever.
- Be concise, warm, and practical (short paragraphs or bullets). Respond with your final answer only — no meta-commentary about your reasoning.`;
}
function addTyping(){
  const div=document.createElement("div"); div.className="msg bot typing"; div.textContent="thinking…";
  $("#chatlog").appendChild(div); $("#chatlog").scrollTop=$("#chatlog").scrollHeight; return div;
}
async function askClaude(q){
  chatHistory.push({ role:"user", content:q });
  const typing=addTyping();
  try{
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-api-key":state.apiKey.trim(),
        "anthropic-version":"2023-06-01",
        "anthropic-dangerous-direct-browser-access":"true"
      },
      body:JSON.stringify({
        model: state.apiModel || "claude-opus-4-8",
        max_tokens: 800,
        system: buildCoachSystem(),
        messages: chatHistory.slice(-10)
      })
    });
    typing.remove();
    if(!res.ok){
      let msg="HTTP "+res.status;
      try{ const j=await res.json(); if(j.error&&j.error.message) msg=j.error.message; }catch(e){}
      throw new Error(msg);
    }
    const data=await res.json();
    const text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n").trim() || "(no reply)";
    chatHistory.push({ role:"assistant", content:text });
    addMsg(text,"bot");
  }catch(err){
    typing.remove();
    chatHistory.pop();  // drop the unanswered user turn to keep history valid
    addMsg("⚠ Couldn't reach the Claude API ("+err.message+"). Here's Jeffery's offline answer instead:\n\n"+coachAnswer(q),"bot");
  }
}

/* =====================================================================
   EXERCISE LIBRARY BROWSER
===================================================================== */
const DIFF_LABEL = { 1:"L1", 2:"L2", 3:"L3", 4:"L4" };
const EXMAP = new Map();
let libReady = false;
function initLibrary(){
  if(!window.EXERCISES) return;
  $("#exCount").textContent = window.EXERCISES.length;
  if(!libReady){
    libReady = true;
    window.EXERCISES.forEach(e=>EXMAP.set(e.id,e));
    const regions = [...new Set(window.EXERCISES.flatMap(e=>e.region))].sort();
    const sel = $("#exRegion");
    regions.forEach(r=>{ const o=document.createElement("option"); o.value=r; o.textContent=r; sel.appendChild(o); });
    let t; $("#exSearch").oninput=()=>{ clearTimeout(t); t=setTimeout(renderExResults,120); };
    $("#exRegion").onchange=renderExResults;
    $("#exDiff").onchange=renderExResults;
    $("#exSafe").onchange=renderExResults;
    // default: respect precautions if any are active
    if(gatherFlags().length){ $("#exSafe").checked=true; }
  }
  const flags = gatherFlags();
  $("#exSafeNote").innerHTML = flags.length
    ? `Tick <b>“Respect my precautions”</b> to hide exercises unsafe for your history.`
    : `No precautions flagged from your history.`;
  renderExResults();
}
function renderExResults(){
  const q = $("#exSearch").value.trim().toLowerCase();
  const toks = q.split(/\s+/).filter(Boolean);
  const region = $("#exRegion").value, diff = $("#exDiff").value;
  const safe = $("#exSafe").checked;
  let list = window.EXERCISES;
  if(region!=="all") list = list.filter(e=>e.region.includes(region));
  if(diff!=="all") list = list.filter(e=>e.difficulty === +diff);
  if(toks.length) list = list.filter(e=>{ const hay=(e.name+" "+e.region.join(" ")+" "+e.equipment+" "+e.pattern).toLowerCase();
    return toks.every(t=>hay.includes(t)); });
  let annotate = new Map();
  if(safe){
    const flags = gatherFlags();
    const { kept } = window.applyContra(list, flags);
    kept.forEach(e=>{ if(e.warn) annotate.set(e.id, e.warn); });
    list = kept;
  }
  const total = list.length; list = list.slice(0,80);
  const res = $("#exResults");
  if(!list.length){ res.innerHTML=`<div class="moreinfo">No matches. Try a simpler term or clear the filters.</div>`; return; }
  res.innerHTML = list.map(e=>{ const w=annotate.get(e.id);
    return `<div class="exitemw" data-i="${e.id}">
      <div class="exrow">
        <span class="diffpill d${e.difficulty}">${DIFF_LABEL[e.difficulty]}</span>
        <span class="en">${esc(e.name)}<span class="er">${esc(e.region.join(" · "))} · ${esc(e.equipment)}</span>
          ${w?`<span class="exwarn">⚠ Modify — ${esc(TAG_LABEL[w]||w)}</span>`:""}</span>
        <span class="ed">${esc(e.dose)}</span>
        <span class="chev">▾</span>
      </div>
      <div class="exexp hide"></div>
    </div>`; }).join("") +
    (total>80?`<div class="moreinfo">Showing 80 of ${total} matches — refine to narrow it down.</div>`:"");
  $$("#exResults .exitemw").forEach(w=>{ w.querySelector(".exrow").onclick=()=>{
    const exp=w.querySelector(".exexp");
    if(!exp.dataset.filled){ const e=EXMAP.get(w.dataset.i); exp.innerHTML=movementExplain(e.name,e.pattern,e.region); exp.dataset.filled="1"; }
    exp.classList.toggle("hide"); w.classList.toggle("open"); }; });
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded",()=>{
  load();
  initHistory(); initMeds(); initSearch(); initDetails(); initProgress(); initCoachSettings();
  // Details(3)/Program(4)/Health(5) need a condition; Injury(2) is where you pick it; Clinician(1) is a setup form (no condition needed).
  $$("[data-goto]").forEach(b=>b.onclick=()=>{
    const n=+b.dataset.goto;
    if([3,4,5].includes(n) && !state.condIds.length){ toast("Pick at least one condition first."); goStep(2); return; }
    goStep(n);
  });
  $$(".step").forEach(s=>s.onclick=()=>{ const n=+s.dataset.step;
    if([3,4,5].includes(n) && !state.condIds.length){ toast("Pick a condition first."); goStep(2); return; }
    goStep(n); });
  // History → next: always continue to the Clinician step (1) → Injury → Details. The checkbox only
  // controls whether the Clinician step auto-populates a starter protocol; it never bypasses it.
  const histNext = $("#historyNext"); if(histNext) histNext.onclick=()=>goStep(1);
  const cg = $("#q_clinicianGuided"); if(cg){ cg.checked = !!state.clinicianGuided; cg.onchange=()=>{ state.clinicianGuided=cg.checked; save(); syncClinGuide(); }; syncClinGuide(); }
  const clinNext = $("#clinToProgram"); if(clinNext) clinNext.onclick=()=>goStep(2);   // Clinician → Injury (consecutive)
  $("#generateBtn").onclick=doGenerate;
  $("#printBtn").onclick=()=>window.print();
  $("#resetBtn").onclick=doReset;
  $("#chatform").addEventListener("submit",e=>{ e.preventDefault();
    const v=$("#chatInput").value.trim(); if(!v) return;
    addMsg(v,"user"); $("#chatInput").value="";
    if(coachOnline()) askClaude(v);
    else setTimeout(()=>addMsg(coachAnswer(v),"bot"),220);
  });
  if(state.program) renderProgram(state.program);
  // PWA app-shortcut routing (?go=coach|library|build|progress)
  const goMap={ build:2, details:3, clinician:1, program:4, progress:5, coach:6, library:7 };
  const go=new URLSearchParams(location.search).get("go");
  goStep(go && goMap[go]!=null ? goMap[go] : (state.step||0));
});
