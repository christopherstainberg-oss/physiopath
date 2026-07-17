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
/* Was `const SURGERIES = CURATED_SURGERIES.concat(window.SURGERY_DB...)` — a MODULE-EVAL
   read, which forced surgeries.js (3.8MB) to load before app.js could even parse. Now a
   lazy accessor: it returns the 23 curated procedures immediately and folds in the 20,000
   generated ones the moment the file lands, recomputing only when the count changes. */
let _surgCache = null;
function surgeries(){
  const db = window.SURGERY_DB || [];
  if(_surgCache && _surgCache.n === db.length) return _surgCache.list;
  const list = CURATED_SURGERIES.concat(db.filter(s=>!CURATED_SURGERIES.some(c=>c.id===s.id)));
  _surgCache = { n: db.length, list };
  return list;
}

let _dsCache = { key:null, val:null };
/* Memoised: on a MISS (a non-surgical diagnosis — the common case) the lookup below runs
   `SURGERIES.find(s => s.match.test(nm))` to exhaustion over 20,023 regexes ≈ 0.43ms, and
   gatherFlags/detectPlan/render call it repeatedly. A surgical diagnosis short-circuits on a
   curated entry near the front and was always cheap. Measured: 200 calls 85.8ms -> ~0ms. */
function detectSurgery(){
  // memoised: keyed on the only inputs that can change the answer — age included, because
  // auto-detect now picks the age band that fits the patient.
  const _k = (state.surgeryType||"") + "|" + (state.condIds||[]).join(",") + "|" + (state.age||"");
  if(_dsCache.key === _k) return _dsCache.val;
  const _v = _detectSurgeryUncached();
  _dsCache = { key:_k, val:_v };
  return _v;
}
function _detectSurgeryUncached(){
  if(state.surgeryType && state.surgeryType!=="auto"){
    if(state.surgeryType==="other") return OTHER_SURGERY;
    const s = surgeries().find(x=>x.id===state.surgeryType); if(s) return s;
  }
  for(const c of selectedConditions()){
    const nm = c.name.toLowerCase();
    const hits = surgeries().filter(s=>s.match.test(nm));
    if(!hits.length) continue;
    /* ⚠ Paediatric procedures exist once per age band and ALL of them share one match
       regex, so .find() silently returned band #1 — "neonatal" — for every child. A
       6-year-old with Perthes was auto-detected as having had newborn surgery, and got the
       newborn precaution note ("all care is parent-led"). Pick the band that fits the
       patient; with nothing to go on, fall back to the first hit exactly as before. */
    const a = ageForSurgeryPick();
    if(a != null && hits.length > 1){
      const want = PED_BANDS.find(b => a >= b.lo && a < b.hi);
      const fit = want && hits.find(s => {
        const m = (s.name||"").match(PED_SURG_BAND_RE);
        return m && m[1].toLowerCase() === want.surg;
      });
      if(fit) return fit;
    }
    return hits[0];
  }
  return state.surgery==="yes" ? OTHER_SURGERY : null;
}
/* The age we can know WITHOUT asking detectSurgery — otherwise userAgeInfo() and
   detectSurgery() would call each other in a loop. */
function ageForSurgeryPick(){
  const a = parseFloat(state.age);
  if(Number.isFinite(a) && a >= 0 && a < 120) return a;
  const cb = conditionAgeBand();
  return cb ? (cb.lo + cb.hi) / 2 : null;
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
  screen:{}, falls:"", aid:"", smoking:"", alcohol:"", sleep:"", stress:"", waterConfidence:"", adls:[],
  equipment:"", timePerDay:"", workDemand:"", priorEpisodes:"", moveConfidence:"", pregStage:"", footSensation:"",
  medIds:[], medFilter:false, homeMode:false, customPrecautions:[], clinicianProtocols:[], clinPrecautionProtocol:"", clinicianGuided:false, selfGuided:false,
  medDoses:{}, weightBearing:{status:"",pct:"",lbs:"",side:"",limb:"le"}, devices:[],
  cardiacDevice:{type:"",icdRate:""}, specialPrecautions:[], planVariant:{}, progress:{},
  log:[], logMood:"", logDone:[], logTpl:"blank", photoNoted:false,
  jjThread:[], chatHistory:[], apiKey:"", apiModel:"claude-opus-4-8"
};
const MED_FILTERABLE = ["fluoroquinolone","anticoagulant","antiplatelet","opioid","sedative","muscle_relaxant","gabapentinoid","antipsychotic"];
/* ---------- on-demand data loading ----------
   The app shipped 33.5MB of JS at boot while the first screen needs ~78KB of it.
   These four datasets (medications 3.5MB, sports, activities, coach-kb) aren't
   touched until much later steps, so they're fetched when the step that needs
   them opens. Everything that reads them was already guarded on `window.X` being
   absent, which is what makes this safe. (coach-kb.js is now an ~82KB seed that
   expands to the full 20k-entry KB in-browser — it used to be an 11.5MB file.) */
const _dataP = {};
function loadData(file){
  if(_dataP[file]) return _dataP[file];
  return _dataP[file] = new Promise(res=>{
    const el = document.createElement("script");
    el.src = "data/" + file; el.async = false;
    el.onload = () => res(true);
    el.onerror = () => { console.warn("data load failed:", file); res(false); };
    document.head.appendChild(el);
  });
}
const MEDMAP = new Map();
/* The catalogue is only needed once they go looking for their injury — and for a returning
   user whose saved condIds must resolve. A first-time visitor answering History questions
   does not need 9.3MB of conditions sitting in memory. */
let _condP = null;
function ensureConditions(){
  if(_condP) return _condP;
  return _condP = loadData("conditions.js").then(()=>{
    if(window.CONDITIONS){
      window.CONDITIONS.forEach(c=>CONMAP.set(c.id,c));
      if($("#catCount")) $("#catCount").textContent = window.CONDITIONS.length.toLocaleString();
      initSearch();
    }
    return true;
  });
}
/* Everything generateProgram() touches: the exercise library, the timelines, the surgical
   catalogue and the ADL practice set. Pulled in at Details — the step BEFORE Generate — so
   it is there by the time it is needed, without blocking the first paint. */
let _progP = null;
function ensureProgramData(){
  if(_progP) return _progP;
  return _progP = Promise.all([
    ensureConditions(),
    loadData("exercises.js"), loadData("plans.js"),
    loadData("surgery-plans.js"), loadData("adl-exercises.js"), loadData("surgeries.js")
  ]).then(()=>{
    _surgCache = null;                       // fold the generated catalogue in now it's here
    if(window.EXERCISES && !libReady) window.EXERCISES.forEach(e=>EXMAP.set(e.id,e));
    return true;
  });
}
/* Pull a lazy dataset in and re-wire whatever depends on it. Safe to call often. */
function ensureMedData(){
  return loadData("medications.js").then(()=>{
    if(window.MEDICATIONS) window.MEDICATIONS.forEach(m=>MEDMAP.set(m.id,m));
    if(typeof renderSelectedMeds==="function") renderSelectedMeds();
  });
}
function ensureDetailsData(){
  return Promise.all([loadData("activities.js"), loadData("sports.js")]).then(()=>{
    if(typeof setupAutocomplete!=="function") return;
    setupAutocomplete("activitySearch","activityResults","activityChips", window.ACTIVITIES, "returnActivities",
      { onChange:()=>{ if(state.program){ state.program = generateProgram(); save(); if(state.step===4) renderProgram(state.program); } } });
    setupAutocomplete("sportSearch","sportResults","sportChips", window.SPORTS, "returnSports",
      { onChange:()=>{ if(state.program){ state.program = generateProgram(); save(); if(state.step===4) renderProgram(state.program); } } });
  });
}
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
/* The conversation is the one place the user says, in their own words, what actually hurts —
   and it was the only thing the app didn't keep. It lived in a bare module var and initCoach()
   cleared it on EVERY entry to the Coach step, so tabbing to Program and back lost the thread
   mid-sentence. It now lives in state (and therefore in backups). Capped: it shares the single
   localStorage key with everything else. */
const CHAT_MAX = 100;
function pushTurn(role, content){
  state.chatHistory = state.chatHistory || [];
  state.chatHistory.push({ role, content });
  if(state.chatHistory.length > CHAT_MAX) state.chatHistory = state.chatHistory.slice(-CHAT_MAX);
  save();
}
/* The API requires messages[0] to be a user turn. slice(-N) alone lands on an ASSISTANT turn
   as soon as the history is long enough, because the current question is pushed before the
   call and makes the length odd -- from the 6th question on, every request 400'd and the catch
   silently served the offline answer instead. Trim forward to the first user turn. */
function chatWindow(n){
  let w = (state.chatHistory||[]).slice(-n);
  while(w.length && w[0].role !== "user") w = w.slice(1);
  return w;
}
/* The question before the current one, for resolving bare follow-ups offline. */
function prevUserQuestion(){
  const u = (state.chatHistory||[]).filter(t=>t.role==="user");
  return u.length >= 2 ? u[u.length-2].content : null;
}
const CONMAP = new Map();
let domainFilter = "all";
/* Paediatric (0–18 yr) is a cross-cutting view, not a domain — detect it from
   the paediatric regions and genuinely-paediatric diagnosis names. */
const PED_RE = /paediatric|pediatric|juvenile|adolescent|congenital|developmental|cerebral palsy|clubfoot|talipes|perthes|\bscfe\b|slipped capital|sever'?s|osgood|sinding-larsen|iselin|apophysitis|torticollis|spina bifida|myelomeningocele|muscular dystrophy|duchenne|becker muscular|spinal muscular atrophy|erb'?s|klumpke|brachial plexus birth|hip dysplasia|\bddh\b|blount|metatarsus adductus|dyspraxia|hypotonia|growth plate|physeal|little leaguer|gymnast'?s wrist|down syndrome/i;
function isPediatric(c){ return /^paediatric/i.test(c.region||"") || PED_RE.test((c.name||"")+" "+(c.region||"")); }

/* ---------- persistence ---------- */
const DEFAULT_STATE = JSON.parse(JSON.stringify(state));   // snapshot before load() mutates it
const STATE_VERSION = 1;   // bump + add a migrateState() case when a saved-state shape changes
const isPlainObj = v => v!=null && typeof v==="object" && !Array.isArray(v);
/* Fixed-shape nested objects are deep-merged with their defaults on load — a plain
   Object.assign replaces them WHOLESALE, so a save written before a sub-field existed came
   back missing it, and String(undefined)==="undefined" then rendered e.g. "~undefined lbs".
   The list is DERIVED from DEFAULT_STATE's shape (every plain-object top-level key) rather than
   hand-maintained, so a new fixed-shape field can't be forgotten. Keys whose default is an
   empty map (labs, screen, medDoses…) merge to a harmless identity; `program` is null by
   default, so it is (correctly) loaded wholesale. */
const NESTED_KEYS = Object.keys(DEFAULT_STATE).filter(k => isPlainObj(DEFAULT_STATE[k]));
let _saveFailed = false, _loadCorrupt = false;
function save(){
  try{ state._v = STATE_VERSION; localStorage.setItem("physiopath", JSON.stringify(state)); return true; }
  catch(e){ console.warn("save failed:", e); _saveFailed = true; return false; }   // quota, or Safari private mode
}
/* Fix up an old save's SHAPE before it merges into state. Runs oldest-first; add a case per
   STATE_VERSION bump (rename/move fields here). Missing sub-fields are already handled by the
   deep-merge below, so a version with no structural change needs no case. Keep it pure. */
function migrateState(s){
  // const from = typeof s._v === "number" ? s._v : 1;
  // if(from < 2){ /* … move / rename fields on `s` … */ }
  s._v = STATE_VERSION;
  return s;
}
function load(){
  const raw = localStorage.getItem("physiopath");
  if(!raw) return;
  let s;
  try{ s = JSON.parse(raw); }
  catch(e){
    /* Never let the next save() overwrite the only copy of their history. Park it. */
    _loadCorrupt = true;
    try{ localStorage.setItem("physiopath.corrupt." + Date.now(), raw); }catch(_){}
    console.warn("saved data was unreadable; parked a copy under physiopath.corrupt.*", e);
    return;
  }
  if(!isPlainObj(s)) return;   // a JSON array / string / number is not a valid saved state
  migrateState(s);
  for(const k of NESTED_KEYS)
    if(isPlainObj(s[k])) s[k] = Object.assign({}, DEFAULT_STATE[k], s[k]);
  Object.assign(state, s);
}

/* ---------- helpers ---------- */
const classify = w => (w===null||isNaN(w)) ? null : (w<=6 ? "acute" : "chronic");
function selectedConditions(){ return state.condIds.map(id=>CONMAP.get(id)).filter(Boolean); }

/* Gather every active contraindication flag from history + PAR-Q + conditions + age. */
/* Lab values reach the exercise engine, exactly like vitals do. 147 labs were
   collected and only ever drove the read-only risk cards. These are the ones that
   genuinely change what is safe to prescribe. */
function labFlags(){
  const out = [];
  const num = id => { const e = (state.labs||{})[id]; const v = e && e.v!=="" && e.v!=null ? Number(e.v) : NaN; return isFinite(v) ? v : null; };
  const hgb = num("hgb");
  if(hgb!=null && hgb < 8)  out.push("lab_anaemia_severe");
  else if(hgb!=null && hgb < 11) out.push("lab_anaemia");
  const plt = num("platelets"), inr = num("inr");
  if((plt!=null && plt < 50) || (inr!=null && inr > 4)) out.push("lab_bleeding");
  const k = num("potassium");
  if(k!=null && (k < 3.0 || k > 5.5)) out.push("lab_electrolyte");
  const egfr = num("egfr");
  if(egfr!=null && egfr < 45) out.push("lab_ckd");
  return out;
}
function gatherFlags(){
  const f = new Set(state.flags);
  if(state.parq.pain || state.parq.faint) f.add("cardiac");
  if(Number(state.age) >= 75) f.add("balance_risk");
  if(state.surgery === "yes") f.add("recent_surgery");
  selectedConditions().forEach(c => (c.autoFlags||[]).forEach(x=>f.add(x)));
  const surg = detectSurgery(); if(surg && surg.autoFlags) surg.autoFlags.forEach(x=>f.add(x));
  vitalFlags().forEach(x=>f.add(x));
  labFlags().forEach(x=>f.add(x));   // bloods now shape the plan, not just the risk cards
  wbFlags().forEach(x=>f.add(x));
  deviceFlags().forEach(x=>f.add(x));
  specialPrecautionFlags().forEach(x=>f.add(x));
  const sc = state.screen||{};
  if(Object.values(sc).some(Boolean)) f.add("red_flags");
  if(sc.cauda) f.add("red_flags_urgent");
  if(state.falls==="2" || (state.aid && state.aid!=="none")) f.add("balance_risk");
  if(state.smoking==="current") f.add("smoker");
  // Sleep, stress and alcohol change how much load you tolerate and how fast you
  // heal — they were collected but only ever produced a tip. Now they reach the
  // engine like every other history answer.
  if(state.sleep==="lt6") f.add("poor_sleep");
  if(state.stress==="high") f.add("high_stress");
  if(state.alcohol==="heavy"){ f.add("heavy_alcohol"); f.add("balance_risk"); }
  // Pool/aquatic: nervous-in-water or older/less-steady users skip deep-water (out-of-depth) drills.
  if(["none","low"].includes(state.waterConfidence) || Number(state.age) >= 70 || f.has("balance_risk")) f.add("low_water_confidence");
  // Pregnancy STAGE, not just the yes/no box: lying flat compresses the vena cava
  // from ~16 weeks, and relaxin loosens joints into the postpartum year.
  if(["t2","t3"].includes(state.pregStage)) f.add("pregnancy");
  if(state.pregStage) f.add("hypermobility");            // relaxin — don't chase end-range
  // A foot that can't feel damage behaves like a neuropathic foot whatever the label
  if(["reduced","absent"].includes(state.footSensation)){ f.add("neuropathy"); f.add("balance_risk"); }
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
  // use the newest LOGGED reading if there is one - a resting HR that improves over
  // months should re-tune the zones, not be ignored in favour of the intake baseline
  const v = (typeof latestVitals==="function" ? latestVitals() : null) || state.vitals || {};
  const rest = vnum(v.restHR);
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
  /* latestVitals(), NOT state.vitals. hrZones() was migrated to the logged reading and this,
     the actual SAFETY gate, was left behind — so logging 185/115 lit up the Health Risk card
     while the program carried on being built from the 120/80 typed at intake. */
  const v = latestVitals(); const out=[];
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
/* Special precautions IMPLIED by the chosen diagnosis or surgery (via their
   autoFlags) — e.g. a post-CABG condition implies sternal precautions, a
   post-abdominal-surgery condition implies abdominal precautions. These switch on
   automatically so the precaution's explanation + name-based exercise limits apply
   without the user having to tick the box. */
function impliedSpecialPrecautionKeys(){
  const flags = new Set();
  selectedConditions().forEach(c => (c.autoFlags||[]).forEach(x=>flags.add(x)));
  const surg = (typeof detectSurgery === "function") ? detectSurgery() : null;
  if(surg && surg.autoFlags) surg.autoFlags.forEach(x=>flags.add(x));
  const keys = new Set();
  for(const k in SPECIAL_PRECAUTIONS){ if(flags.has(SPECIAL_PRECAUTIONS[k].flag)) keys.add(k); }
  return keys;
}
function activeSpecialPrecautions(){
  const keys = new Set([...(state.specialPrecautions||[]), ...impliedSpecialPrecautionKeys()]);
  return [...keys].map(k=>SPECIAL_PRECAUTIONS[k]).filter(Boolean);
}
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
/* =====================================================================
   READING THE LOG BACK
   state.log was write-only: nothing in the app read it. Pain was asked twice
   and heard once — the intake number drove phase splits, load guidance and the
   "irritable" pathway, while three weeks of logged 8/10 changed a coloured tag.
   ===================================================================== */
function recentLog(days, n){
  const cut = new Date(); cut.setDate(cut.getDate() - (days||21));
  const key = isoOf(cut);
  return (state.log||[]).filter(e => e.date >= key).slice(-(n||7));
}
/* Mean of the last few logged days. null until there are two — one bad day is not a trend. */
function recentPain(){
  const vals = recentLog().map(e => Number(e.pain)).filter(v => isFinite(v));
  if(vals.length < 2) return null;
  return { mean: Math.round(vals.reduce((a,b)=>a+b,0)/vals.length * 10)/10, n: vals.length };
}
/* What the plan actually asks for per week, parsed out of the prose it is stored as. */
function weeklyTarget(){
  /* Frequency is stored as prose, and plenty of plans are qualitative ("Exercise most days",
     "Daily home work + 2-3 supervised sessions/week"). The log counts what the user did each
     DAY, so a daily/most-days instruction is the target to measure against -- checked BEFORE
     the numeric match, which would otherwise read the *supervised* count as the whole goal. */
  const parse = t => {
    if(!t) return null;
    if(/\bdaily\b|every day/i.test(t)) return { min:6, max:7 };
    if(/most days/i.test(t)) return { min:5, max:7 };
    const m = t.match(/(\d+)\s*[\u2013-]\s*(\d+)\s*(?:short\s*)?sessions?\s*\/?\s*week/i);
    if(m) return { min:+m[1], max:+m[2] };
    const one = t.match(/(\d+)\s*(?:short\s*)?sessions?\s*\/?\s*week/i);
    if(one) return { min:+one[1], max:+one[1] };
    return null;
  };
  /* The plan's prose is truthy even with no number in it, so it must fall THROUGH to the
     track default rather than short-circuit an `||`. */
  return parse(String((state.program && state.program.sessions) || ""))
      || parse(String(sessionsText(classify(state.weeks)||"acute")));
}
function weeklySessions(){
  const cut = new Date(); cut.setDate(cut.getDate()-6);
  const key = isoOf(cut);
  return (state.log||[]).filter(e => e.date >= key).reduce((a,e)=>a + (Number(e.sessions)||0), 0);
}
function adherence(){
  const t = weeklyTarget(); if(!t) return null;
  const done = weeklySessions();
  return { done, min:t.min, max:t.max,
    status: done >= t.min ? "on-track" : (done >= Math.max(1, t.min-2) ? "slightly-behind" : "behind") };
}
/* Pain the engine should actually believe: what they are logging now, else intake. */
function effectivePain(){
  const rp = recentPain();
  return rp ? { v: rp.mean, from: `your last ${rp.n} logged days` } : { v: Number(state.painMove)||0, from: "your intake answer" };
}
/* Fair trend: last week's mean vs the week before. The old code compared today to the FIRST
   entry EVER, forever — so 9/10 -> 2/10 -> a 7/10 flare today read "pain down 2 pts, improving". */
function painTrend(log){
  const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
  const recent = log.slice(-7).map(e=>Number(e.pain)).filter(isFinite);
  const prior  = log.slice(-14,-7).map(e=>Number(e.pain)).filter(isFinite);
  if(!recent.length) return { cls:"trend-flat", txt:"holding steady" };
  const rm = mean(recent);
  if(prior.length < 2) return { cls:"trend-flat", txt:`averaging ${rm.toFixed(1)}/10 — keep logging to see a trend` };
  const d = Math.round((rm - mean(prior)) * 10) / 10;
  if(d <= -1) return { cls:"trend-down", txt:`pain down ${Math.abs(d)} pts on last week ↓ improving` };
  if(d >=  1) return { cls:"trend-up",   txt:`pain up ${d} pts on last week ↑ — ease off & review` };
  return { cls:"trend-flat", txt:`holding steady around ${rm.toFixed(1)}/10` };
}
/* Has the picture changed since the program was built? Used to OFFER a rebuild rather than
   force one: generateProgram() discards the user's rotate/swap/remove edits, and silently
   wiping a customised plan because they logged one sore day would be its own bug. */
function planDrift(){
  const p = state.program; if(!p || !p.builtFrom) return null;
  const out = [];
  const ep = effectivePain();
  const dp = Math.round((ep.v - p.builtFrom.pain) * 10) / 10;
  if(dp >= 2) out.push(`you're logging ${ep.v}/10 now — up ${dp} on the ${p.builtFrom.pain}/10 this plan was built for`);
  else if(dp <= -2) out.push(`you're logging ${ep.v}/10 now — down ${Math.abs(dp)} on the ${p.builtFrom.pain}/10 this plan was built for`);
  const now = gatherFlags(), had = new Set((p.builtFrom.flags||"").split(",").filter(Boolean));
  const added = now.filter(f => !had.has(f));
  if(added.length) out.push(`new precautions apply from what you've logged (${added.slice(0,3).join(", ")})`);
  return out.length ? out : null;
}

function loadGuidance(){
  const ep = effectivePain();                  // what they're reporting NOW, not at intake
  const src = ` (based on ${ep.from})`;
  if(ep.v>=7) return "Keep effort very light. Pain during exercise should stay at/below 3/10 and settle within an hour." + src;
  if(ep.v>=4) return "Mild discomfort (up to ~4/10) during loading is acceptable if it settles by the next morning. Sharp pain means back off." + src;
  return "You can load with confidence. Progress ~10% per week while pain stays low and settles overnight." + src;
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
  tmj:["Neck"], general_msk:["Full body","Core","Hip"], rhabdo:["Cardio","Full body"], charcot:["Core","Full body"],
  stroke:["Balance","Gait","Core"], tbi:["Balance","Gait","Core"], sci:["Core","Balance","Full body"],
  ms:["Balance","Core","Cardio"], parkinsons:["Balance","Gait","Full body"], balance_neuro:["Balance","Gait","Core"], guillain_barre:["Balance","Core","Full body"],
  neuropathy:["Balance","Foot","Ankle"], vestibular:["Vestibular","Balance"], bells_palsy:["Neck"],
  cardiac_rehab:["Cardio","Full body"], heart_failure:["Cardio","Full body"], hypertension:["Cardio","Full body"],
  pad:["Cardio","Knee","Hip"], valve:["Cardio","Breathing"], arrhythmia:["Cardio","Full body"],
  cardiac_surgery:["Cardio","Breathing","Full body"],
  pulmonary_rehab:["Cardio","Breathing","Core"], asthma:["Cardio","Breathing"], post_covid:["Cardio","Breathing","Balance"],
  ild:["Cardio","Breathing"], thoracic_surgery:["Breathing","Scapula/Upper back","Cardio"], pulm_hypertension:["Cardio","Breathing"],
  abdominal_surgery:["Breathing","Core","Hip","Full body"]
};
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return h; }
/* Pool / aquatic exercises are only SUGGESTED once the user has told us their
   confidence in water (History → "Confidence in water"). Without that answer we
   don't know it's safe/appropriate to put someone in a pool, so they're withheld
   from the generated program and the add-exercise suggestions/search. */
function aquaticAllowed(){ return !!state.waterConfidence; }
// swimming / aqua-jogging / hydrotherapy / pool work — matches the therapeutic Pool
// set AND swimming-cardio moves. Uses aqua/aquatic/swim/hydro/pool only (never the
// word "water"), so household loads like "Water-bottle curl" / "Water-jug row" don't match.
const AQUATIC_NAME_RE = /\baqua|aquatic|\bswim|hydrotherap|\bpool\b/i;
function isAquaticEx(e){
  if(!e) return false;
  if(e.pattern === "pool") return true;
  if(Array.isArray(e.region) && e.region.includes("Pool / aquatic (therapeutic)")) return true;
  return AQUATIC_NAME_RE.test(e.name || e.n || "");
}
/* =====================================================================
   AGE-APPROPRIATE EXERCISE MATCHING
   ---------------------------------------------------------------------
   "Under 18" is not a clinical category, and the old gate treated it as one:
   it only kept child moves OUT of adult plans, and never kept ADULT moves out
   of a child's. Measured before this change: a 3-year-old was offered "Barbell
   squat" and "Machine single-leg squat", a 4-year-old with cerebral palsy was
   prescribed "Barbell tempo deadlift", and a 1-year-old's program was byte-for-
   byte identical to a 40-year-old's. Age changed nothing.

   The fix is a single idea: every exercise has an age WINDOW, and so does the
   user. A paediatric movement declares its own (aMin/aMax, from the generator —
   pull-to-stand is 8–13 months, not "childhood"); an adult-library movement
   declares only a floor, inferred from what it actually demands. One comparison
   then does both jobs — a 40-year-old fails a play movement's aMax exactly as a
   4-year-old fails a barbell's aMin — so the two directions can't drift apart.
   ===================================================================== */
/* `k` matches the generator's band key; `surg` matches the label baked into paediatric
   surgery names by generate-surgeries.mjs. They differ for one band only (school /
   school-age), which is exactly the kind of near-match worth naming rather than patching
   over at the call site. */
const PED_BANDS = [
  { k:"neonatal",   surg:"neonatal",   lo:0,     hi:0.084, label:"neonatal (0–1 mo)" },
  { k:"infant",     surg:"infant",     lo:0.084, hi:1,     label:"infant (1–12 mo)" },
  { k:"toddler",    surg:"toddler",    lo:1,     hi:3,     label:"toddler (1–3 yr)" },
  { k:"preschool",  surg:"preschool",  lo:3,     hi:6,     label:"preschool (3–5 yr)" },
  { k:"school",     surg:"school-age", lo:6,     hi:12,    label:"school-age (6–11 yr)" },
  { k:"adolescent", surg:"adolescent", lo:12,    hi:18,    label:"adolescent (12–18 yr)" }
];
const AGE_ADULT = 30;                    // stand-in when no age is given; only its "is an adult" quality is used
function pedBandOf(a){ return PED_BANDS.find(b => a >= b.lo && a < b.hi) || null; }

/* The paediatric surgery picker already asks which age band the child is in — it's part of
   the procedure they chose ("· age school-age (6–11 yr)"). Reading it back is not a guess
   about the child; it's the answer they already gave. An exact age still wins, and the
   program says out loud which one it used. */
const PED_SURG_BAND_RE = /·\s*age\s+(neonatal|infant|toddler|preschool|school-age|adolescent)/i;
const PED_SURG_BAND_MID = { neonatal:0.04, infant:0.5, toddler:2, preschool:4.5, "school-age":9, adolescent:15 };
/* ⚠ EXPLICIT selection only — never detectSurgery(). Every age band of a paediatric
   procedure shares one `match` regex (18 Perthes entries, one per band × approach, all
   matching "perthes"), so auto-detect returns whichever sits first in the file, which is
   always "neonatal". Reading a band off an auto-detected surgery would have told us a
   6-year-old with Perthes was a newborn — a guess dressed as an answer. When they pick the
   procedure from the list they are choosing the band themselves, and that we can trust. */
function surgeryAgeBand(){
  if(!state.surgeryType || state.surgeryType === "auto" || state.surgeryType === "other") return null;
  const s = surgeries().find(x => x.id === state.surgeryType);
  const m = s && s.name && s.name.match(PED_SURG_BAND_RE);
  return m ? m[1].toLowerCase() : null;
}
/* The diagnosis itself often states the age group, and the catalogue is full of it: 1,674
   conditions are named "— adolescent athlete", and the curated paediatric list names
   conditions that only occur in a known window. None of it was readable — conditions carry
   no age field — so "Sever's disease" and "Slipped capital femoral epiphysis" arrived at the
   exercise picker as anonymous as a rotator cuff.

   These are the real epidemiological windows, not guesses about this particular child:
   Sever's is a traction apophysitis of the calcaneal growth plate and resolves when it
   fuses (~8–14); Osgood-Schlatter is the tibial tubercle (~10–15); SCFE is peri-pubertal
   (~10–16); Perthes is ~4–9; DDH, clubfoot, torticollis and brachial plexus birth injury
   are infant diagnoses by definition.
   ⚠ /\badult\b/ MUST stay first — the catalogue deliberately carries adult sequelae of
   childhood conditions ("Cerebral palsy (adult reconditioning)", "Congenital clubfoot
   (adult reconditioning)"), and prescribing tummy time to a 45-year-old with residual DDH
   would be the same class of error as the one this whole layer exists to fix. */
const CONDITION_AGE_RULES = [
  [/\badult\b/i,                                            null],
  [/adolescent/i,                                           [12, 18]],
  [/\bSCFE\b|slipped capital/i,                             [10, 16]],
  [/osgood|sinding-larsen/i,                                [10, 15]],
  [/sever'?s|calcaneal apophysitis/i,                       [8, 14]],
  [/iselin/i,                                               [9, 14]],
  [/little leaguer/i,                                       [9, 15]],
  [/gymnast'?s wrist/i,                                     [10, 16]],
  [/perthes/i,                                              [4, 9]],
  [/\bDDH\b|developmental (hip )?dysplasia|hip dysplasia/i, [0, 1]],
  [/clubfoot|talipes|metatarsus adductus/i,                 [0, 1]],
  [/torticollis/i,                                          [0, 1]],
  [/erb'?s|klumpke|brachial plexus birth/i,                 [0, 1]],
  [/blount/i,                                               [1, 12]],
  [/toe-?walking/i,                                         [1, 8]],
  [/cerebral palsy/i,                                       [1, 18]],
  [/spina bifida|myelomeningocele/i,                        [0, 18]],
  [/duchenne|becker muscular|muscular dystrophy|spinal muscular atrophy/i, [2, 18]],
  [/juvenile idiopathic arthritis|juvenile arthritis|\bJIA\b/i, [2, 16]],
  [/apophysitis/i,                                          [8, 15]],
  [/paediatric|pediatric/i,                                 [3, 12]],
  [/juvenile/i,                                             [2, 16]],
  [/older adult/i,                                          [65, 90]]
];
function conditionAgeBand(){
  for(const c of selectedConditions()){
    for(const [re, band] of CONDITION_AGE_RULES){
      if(re.test(c.name || "")) return band ? { lo:band[0], hi:band[1], from:c.name } : null;
    }
  }
  return null;
}
/* Returns { age, source } — always a number, so callers never branch on null.
   `source`: "stated" | "surgery" | "condition" | "assumed-adult".
   Order is deliberate: what they typed beats what their procedure implies, which beats what
   their diagnosis implies. Every inference is something the USER selected, not a guess about
   them — and the Program says out loud which one it used. */
function userAgeInfo(){
  const a = parseFloat(state.age);
  if(Number.isFinite(a) && a >= 0 && a < 120) return { age:a, source:"stated" };
  const band = surgeryAgeBand();
  if(band) return { age:PED_SURG_BAND_MID[band], source:"surgery", band };
  const cb = conditionAgeBand();
  if(cb) return { age:+((cb.lo + cb.hi) / 2).toFixed(2), source:"condition", lo:cb.lo, hi:cb.hi, from:cb.from };
  return { age:AGE_ADULT, source:"assumed-adult" };
}
const userAgeYears = () => userAgeInfo().age;
const isChildUser  = () => userAgeYears() < 18;

/* Age-neutral therapeutic work — quad sets, ankle pumps, heel slides, breathing. A
   school-age child does these exactly as an adult does; a toddler cannot follow them. */
const PED_SAFE_PAT = new Set(["pump","supine","seated","standing","pool","breathing","mobility","isometric"]);
const PED_HEAVY_EQ = /^(Barbell|Kettlebell|Machine|Sandbag|Cable|Suspension|Med-ball|Dumbbell)/i;
/* Floors for the adult library — the paediatric one declares its own. See the ordering note
   inside: 14 is maximal/ballistic effort, 13 is coached free weights, 12 is difficulty-3
   bodyweight, 6 is age-neutral therapeutic work. */
function exAgeMin(e){
  if(e._am !== undefined) return e._am;
  let v;
  if(e.aMin != null) v = e.aMin;                                        // paediatric library: it declares its own
  else {
    const t = e.tags || [];
    /* ⚠ ORDER IS THE POINT. The ballistic/maximal test MUST come before the equipment test:
       575 heavy-equipment movements are ALSO difficulty-4 (161 barbell ones — "Barbell
       single-leg Romanian deadlift", "Machine Nordic (eccentric) hamstring curl"), so with
       equipment checked first they'd inherit the free-weight floor and land at 13. These are
       two different claims and only one of them is about the bar:
         14 — maximal and ballistic effort. This is the line the evidence actually draws, and
              it is about the skeleton, not the kit: the growth plate is the weak link until
              it fuses, so max-effort and ballistic work waits for maturity + competence.
         13 — coached free weights and machines. Supervised, technique-led resistance training
              is safe and effective well before this (NSCA 2009; Consensus BJSM 2014); age is
              not really the gate here, supervision and technique are, so this floor is a
              proxy for "old enough to be coached through a barbell lift" and nothing more. */
    if(t.includes("high_intensity") || e.difficulty >= 4) v = 14;
    else if(PED_HEAVY_EQ.test(e.equipment || "")) v = 13;
    else if(e.difficulty === 3) v = 12;
    else if(PED_SAFE_PAT.has(e.pattern) && e.difficulty <= 2 && !t.includes("impact")) v = 6;
    else v = 12;
  }
  try{ Object.defineProperty(e, "_am", { value:v, enumerable:false }); }catch(_){}
  return v;
}
const exAgeMax = e => (e.aMax != null ? e.aMax : 200);
const exAgeOk  = (e, age) => age >= exAgeMin(e) && age < exAgeMax(e);
/* Kept for the Library browser's badge — "is this a child's movement?" is still a fair
   question to ask of one exercise, it just isn't how the plan gets filtered any more. */
const isPediatricEx = e => !!e && (Array.isArray(e.tags) ? e.tags.includes("pediatric") : false);

/* The protocols and INJURY_FOCUS are hand-authored PROSE ("Closed-chain leg press / squat
   (progressive)") with no equipment or difficulty field, so exAgeMin()'s inference has
   nothing to read — and these items bypass the library entirely, which is exactly how a
   4-year-old with cerebral palsy ended up prescribed a barbell deadlift. A name table does
   the same job. Ordered heaviest-first; the first match wins.
   The 14 line is free-weight barbell/machine work, matching the adolescent library's own
   "Barbell back squat (supervised) — 14+" so the two layers can't contradict each other.
   It is NOT a claim that weights are unsafe before then: the consensus is technique-led
   resistance training from ~7-8, which is what the 7 and 12 lines allow. */
/* ⚠ These thresholds MUST agree with the paediatric library's own aMin values, or the two
   layers contradict each other: the 5-10-5 shuttle sat at 13 here and 14 there, so a
   13-year-old's protocol kept a drill the library would have refused them. Same movement,
   two answers, decided by which layer it happened to arrive through. */
const PROTO_AGE_RULES = [
  /* Maximal / ballistic FIRST, and above the equipment row — same reason as exAgeMin(): the
     two are different claims, and a barbell Nordic is caught by the effort, not the bar. */
  [/olympic|clean|snatch|\b1rm\b|max(imal)? (lift|effort)|nordic|bound|depth (jump|drop)|pro-agility|5-10-5|t-drill|shuttle/i, 14],
  [/barbell|kettlebell|machine|smith|sled|sandbag|cable|leg press|lat pull|bench press/i, 13],
  [/pistol|sprint|plyo|carioca|cutting|change of direction|a-skip|deceleration/i, 13],
  [/eccentric|deficit|weighted|loaded|goblet|bulgarian|copenhagen|single-leg romanian|hop-and-stick|drop-and-stick|box jump|agility/i, 12],
  [/quad set|glute set|ankle pump|heel slide|pendulum|passive|isometric|stretch|breathing|diaphragm|range of motion|\brom\b|mobility|positioning|elevation|compression|tummy time|play/i, 4],
  [/walk|balance|bridge|clam|band|sit-to-stand|step-up|step-down|heel raise|calf raise|plank|bird-dog|dead-bug|scapular|\brow\b|push-up|squat|marching|cycling|bike|swim|reach/i, 7]
];
const protoAgeMin = n => { for(const [re,a] of PROTO_AGE_RULES) if(re.test(n)) return a; return 10; };
/* One test for both kinds of item: the library declares its window, prose gets one inferred. */
function exItemAgeOk(e, age){
  const min = (e.aMin != null) ? e.aMin : protoAgeMin(e.n || e.name || "");
  const max = (e.aMax != null) ? e.aMax : 200;
  return age >= min && age < max;
}
/* ⚠ Adults are returned untouched, by identity — this whole layer must be a no-op at 18+
   and for anyone who never gave an age. */
function adaptForAge(list, age){
  return age >= 18 ? list : list.filter(e => exItemAgeOk(e, age));
}
/* Contraindication-filtered library options for a condition's region & phase.
   seed changes the ordering (used by "reroll"); count sets how many to return. */
function libraryOptions(protocol, phaseIdx, flags, exclude, count, seed){
  if(!window.EXERCISES) return [];
  count = count || 6; seed = seed || 0;
  const regions = LIB_REGION[protocol] || LIB_REGION[(window.PROTOCOL_ALIAS||{})[protocol]] || ["Full body","Core"];
  const rset = new Set(regions);
  const bucket = phaseIdx+1;                      // 1..4
  const allowed = new Set([bucket]); if(bucket>1) allowed.add(bucket-1);
  /* The difficulty bucket is an ADULT progression: phase 1 offers difficulty 1 only, which
     works because the adult library is full of isometrics and ROM. A play library isn't —
     measured, a 4-year-old's phase 1 matched ZERO exercises (nothing in Knee/Hip/Ankle is
     "difficulty 1" when the easiest thing a preschooler does is still a game), and the phase
     emptied. For a child the progression that matters is the age band, so widen the early
     buckets to "anything easy" and let the later ones tier normally. Never exceeds the
     adult bucket, so nothing gets harder than the phase intends. */
  const _childAge = userAgeYears();
  if(_childAge < 18){ allowed.clear(); for(let d=1; d<=Math.max(2,bucket); d++) allowed.add(d); }
  const exSet = new Set((exclude||[]).map(n=>n.toLowerCase()));
  const allowAqua = aquaticAllowed();
  const age = userAgeYears();                      // one window, both directions — see exAgeOk()
  const pool = window.EXERCISES.filter(e =>
    e.region.some(r=>rset.has(r)) && allowed.has(e.difficulty) && !exSet.has(e.name.toLowerCase()) &&
    (allowAqua || !isAquaticEx(e)) &&              // no aquatic suggestions until water-confidence is set
    exAgeOk(e, age));
  let { kept } = window.applyContra(pool, flags);
  kept = kept.filter(e=>nameAllowed(e.name));      // respect device / weight-bearing restrictions
  kept.sort((a,b)=> hashStr(a.name+"|"+seed) - hashStr(b.name+"|"+seed));
  /* aMin/aMax/band ride along: without them a paediatric pick loses its declared window the
     moment it enters the program, and the later re-filters would judge it on its NAME. */
  return kept.slice(0,count).map(e=>({ n:e.name, d:e.dose, c:e.cue, warn:e.warn, pattern:e.pattern,
    region:e.region, tags:e.tags, aMin:e.aMin, aMax:e.aMax, band:e.band }));
}

/* ---------- injury-specific layer ----------
   Detects the actual diagnosis from the condition name and injects signature,
   phase-targeted "priority" exercises + a focus note, so two conditions in the
   same region (e.g. rotator cuff tear vs frozen shoulder) get different plans.
   `p` = phase 1–4. Signature exercises carry engine tags so they're still filtered. */
const INJURY_FOCUS = [
  /* ---- procedures whose exercise content must match their timeline's restrictions ---- */
  {re:/tibial tub(ercle|erosity) (transfer|osteotomy|realign)|fulkerson|elmslie-?trillat|anteromedialisation|anteromedialization/,
   focus:"After a tibial tubercle transfer the quadriceps pulls straight on the moved bone fragment — so early work is quads WITHOUT resisted knee extension, and weight-bearing follows the bone's healing, not how the knee feels.",
   add:[{p:1,n:"Quad sets in the brace (no shin resistance)",d:"hourly ×10, 5s holds",c:"Tighten the thigh without moving the knee — never against resistance at the shin"},
        {p:1,n:"Straight-leg raise, brace on until no lag",d:"3×10",c:"Knee locked straight; stop if the knee dips (extensor lag)"},
        {p:1,n:"Ankle pumps (circulation while weight-bearing is limited)",d:"hourly ×20",c:"Keeps the calf pumping while you're partial weight-bearing"},
        {p:1,n:"Passive/assisted heel slides to your allowed range",d:"3×10",c:"Let your hands or a strap do the work — only to the flexion your surgeon allows"},
        {p:2,n:"Closed-chain mini-squat (0–30°)",d:"3×10",c:"Both feet planted — closed chain loads the tubercle far less than open-chain kicks",tags:["weight_bearing"]},
        {p:2,n:"Stationary bike, seat high, no resistance",d:"10–15 min",c:"A high seat limits knee bend and keeps the pull off the tubercle",tags:["aerobic"]},
        {p:3,n:"Leg press through a progressively deeper range",d:"3×10",c:"Add load before depth; no pain at the tubercle",tags:["weight_bearing"]},
        {p:3,n:"Short-arc resisted knee extension (only after ~12 weeks)",d:"3×10",c:"Only once your surgeon allows — this is the movement that pulls hardest on the fragment"},
        {p:4,n:"Single-leg step-downs with knee tracking over the foot",d:"3×8 each",c:"Control the descent; no inward knee collapse",tags:["weight_bearing","balance"]}]},
  {re:/\bmpfl\b|medial patellofemoral/,
   focus:"After an MPFL reconstruction the graft resists the kneecap sliding outwards — so nothing pushes the kneecap laterally, and the priority is winning the bend back early while rebuilding quads and hip control.",
   add:[{p:1,n:"Quad sets with inner-range (VMO) hold",d:"hourly ×10, 5s holds",c:"Tighten the thigh and hold; the kneecap should not drift outwards"},
        {p:1,n:"Straight-leg raise, brace on until no lag",d:"3×10",c:"Knee locked straight throughout"},
        {p:1,n:"Passive/assisted heel slides",d:"3×10",c:"Regain bend early — stiffness is the main complication after this operation"},
        {p:1,n:"Patellar glides — up and down ONLY",d:"3×10",c:"Never glide the kneecap outwards: that is exactly what the graft was put in to resist"},
        {p:2,n:"Wall slide / shallow closed-chain squat (0–45°)",d:"3×10",c:"Back against the wall, shallow and controlled",tags:["weight_bearing"]},
        {p:2,n:"Side-lying hip abduction & clamshells",d:"3×12",c:"Hip control stops the knee falling inwards — that's the position it dislocates in"},
        {p:3,n:"Single-leg squat to a box, knee over the foot",d:"3×8 each",c:"Slow descent; keep the kneecap tracking straight",tags:["weight_bearing","balance"]},
        {p:3,n:"Step-ups and step-downs",d:"3×10 each",c:"Build single-leg strength through range",tags:["weight_bearing"]},
        {p:4,n:"Lateral bounding & controlled cutting drills",d:"3×6 each",c:"Land softly with the knee over the foot; stop if the kneecap feels unstable",tags:["impact","balance"]}]},
  {re:/trochleoplast|sulcus.?deepening|dejour trochlea|bereiter/,
   focus:"After a trochleoplasty the cartilage flap in the reshaped groove heals while you fight for bend — frequent early flexion is the priority, and strengthening stays in a shallow arc where the kneecap doesn't grind on the new groove.",
   add:[{p:1,n:"Frequent assisted knee flexion (heel slides)",d:"5×10 daily",c:"Little and often — stiffness is the defining complication here"},
        {p:1,n:"Quad sets in extension",d:"hourly ×10, 5s holds",c:"The kneecap sits off the reshaped groove when the knee is straight"},
        {p:1,n:"Patellar glides — up and down only",d:"3×10",c:"Never push the kneecap outwards, especially if an MPFL was done too"},
        {p:1,n:"Ankle pumps",d:"hourly ×20",c:"Circulation while you're protected"},
        {p:2,n:"Wall slides 0–45° (shallow, low-compression)",d:"3×10",c:"Shallow range keeps pressure off the resurfaced groove",tags:["weight_bearing"]},
        {p:2,n:"Stationary bike, seat high, minimal resistance",d:"10–15 min",c:"Great for range; raise the seat to limit compression",tags:["aerobic"]},
        {p:3,n:"Leg press through gradually increasing range",d:"3×10",c:"Deepen slowly — grinding pain or swelling means back off",tags:["weight_bearing"]},
        {p:4,n:"Single-leg control & graded return-to-run drills",d:"3×8 each",c:"Only once your surgeon clears impact",tags:["weight_bearing","balance"]}]},
  {re:/tommy john|\bucl\b reconstruction|ulnar collateral ligament reconstruction|elbow \bucl\b (reconstruction|repair)/,
   focus:"After a UCL reconstruction the graft protects against valgus (inward) stress — early work is elbow extension and the shoulder/scapular base, and the interval throwing programme is what actually returns you to sport.",
   add:[{p:1,n:"Gentle elbow extension/flexion in the brace",d:"hourly ×10",c:"The elbow stiffens faster than almost any joint — get extension back early"},
        {p:1,n:"Grip squeezes & wrist curls",d:"3×15",c:"Keep the forearm working; no valgus stress on the elbow"},
        {p:1,n:"Scapular setting & shoulder isometrics",d:"3×10",c:"Keep the shoulder base active while the elbow is protected"},
        {p:2,n:"Rotator-cuff external rotation with a band",d:"3×15",c:"Most throwing problems start at the shoulder — build it now"},
        {p:2,n:"Prone Y-T-W scapular raises",d:"3×10 each",c:"Scapular control is the foundation of a safe throw",tags:["prone"]},
        {p:3,n:"Hip, trunk & kinetic-chain strengthening",d:"3×10",c:"A throw is powered from the ground up; weak hips overload the elbow"},
        {p:3,n:"Plyometric ball drills (two-hand, then one)",d:"3×10",c:"Pre-throwing loading — no actual throwing yet",tags:["high_intensity"]},
        {p:4,n:"Interval throwing programme (distance first, then intensity)",d:"per protocol",c:"Build distance before velocity — never both at once. Inner-elbow pain means stop"}]},
  {re:/brostr|lateral ankle ligament (reconstruction|repair)|ankle ligament (reconstruction|repair)/,
   focus:"After a Broström the repaired lateral ligaments must not be stretched into inversion — and it is peroneal strength and balance, not pain relief, that stops the ankle stretching out again.",
   add:[{p:1,n:"Ankle pumps in the boot (plantarflexion/dorsiflexion only)",d:"hourly ×20",c:"Straight up and down — no rolling the foot inwards"},
        {p:1,n:"Toe curls & intrinsic foot activation",d:"3×15",c:"Keeps the foot working while it's protected"},
        {p:1,n:"Straight-leg raises & hip strengthening",d:"3×10",c:"Keep the rest of the leg strong while the ankle is protected"},
        {p:2,n:"Resisted eversion with a band",d:"3×15",c:"The peroneals are the ankle's active brake — this is the key muscle"},
        {p:2,n:"Seated then standing calf raises",d:"3×12",c:"Rebuild push-off strength",tags:["weight_bearing"]},
        {p:3,n:"Single-leg balance: eyes open → eyes closed",d:"3×30s each",c:"This is the exercise that prevents the next sprain — don't skip it",tags:["balance"]},
        {p:3,n:"Balance on a cushion / unstable surface",d:"3×30s",c:"Progress the challenge as you steady",tags:["balance"]},
        {p:4,n:"Hop-and-stick then cutting drills",d:"3×6 each",c:"Land and freeze; progress to change of direction",tags:["impact","balance"]}]},
  {re:/trapeziectomy|thumb \bcmc\b arthroplasty|basal thumb (surgery|arthroplasty)|thumb base (surgery|arthroplasty)/,
   focus:"After thumb base surgery the priority is keeping the other joints moving and the web space open — pinch strength is the LAST thing to return and pushing it early causes pain rather than progress.",
   add:[{p:1,n:"Full finger, elbow & shoulder range (in the splint)",d:"hourly ×10",c:"Stiffness in the joints you CAN move is the avoidable complication"},
        {p:1,n:"Elevation & oedema control",d:"regularly",c:"A swollen hand becomes a stiff hand"},
        {p:2,n:"Gentle thumb opposition (thumb to each fingertip)",d:"3×10",c:"Out of the splint — motion only, no pinching yet"},
        {p:2,n:"Web-space stretch (thumb away from the palm)",d:"3×20s",c:"Keeps the first web space open so you can grasp objects"},
        {p:2,n:"Scar massage once healed",d:"2 min daily",c:"Thumb-base scar and pillar tenderness is normal for months"},
        {p:3,n:"Putty pinch & grip strengthening",d:"3×10",c:"Start light — pinch is the last thing to come back"},
        {p:3,n:"Functional grasp practice (jars, keys, pegs)",d:"3×10",c:"Rebuild the grips you actually use"},
        {p:4,n:"Progressive loaded grip & pinch",d:"3×12",c:"Grip and pinch commonly take 6–12 months to plateau"}]},
  {re:/proximal hamstring (repair|reattach|reconstruction)|hamstring avulsion repair|ischial (avulsion|tuberosity) repair/,
   focus:"After a proximal hamstring repair every early rule exists to stop the tendon pulling off the sitting bone — nothing that combines a bent hip with a straight knee, and no hamstring stretching at all.",
   add:[{p:1,n:"Glute sets (isometric, brace on)",d:"hourly ×10, 5s holds",c:"Squeeze without moving the hip"},
        {p:1,n:"Ankle pumps & calf activation",d:"hourly ×20",c:"Circulation while weight-bearing is restricted"},
        {p:1,n:"Gentle short-range hamstring isometrics (knee bent)",d:"3×10, 5s holds",c:"Only with the knee BENT — a straight knee stretches the repair off the bone"},
        {p:2,n:"Prone knee flexion (active, short range)",d:"3×10",c:"Lying face down keeps the hip out of flexion",tags:["prone"]},
        {p:2,n:"Supported bridge, feet close to the buttocks",d:"3×10",c:"Feet close = short hamstring length = safe",tags:["supine_flat"]},
        {p:3,n:"Progressive hamstring strengthening, short to long lengths",d:"3×10",c:"Load short-range first, then gradually lengthen"},
        {p:3,n:"Stationary bike, seat low, then walking build",d:"10–20 min",c:"A low seat limits hip flexion",tags:["aerobic"]},
        {p:4,n:"Eccentric hamstring work then graded sprinting",d:"3×8",c:"Eccentric and long-length work comes LAST — this is where re-injury happens"}]},
  {re:/nerve (graft|transfer|repair)|neurorrhaphy|brachial plexus (reconstruction|repair)/,
   focus:"After nerve surgery the nerve regrows about a millimetre a day, so the job is keeping the joints supple and the skin safe until it arrives — then retraining the movement, which after a nerve transfer means learning it through the donor nerve's old action.",
   add:[{p:1,n:"Passive range of every joint in the limb",d:"daily ×10 each",c:"A contracture will waste the recovery even if the nerve regrows perfectly"},
        {p:1,n:"Positioning & splinting in a functional position",d:"as directed",c:"Hold the limb where it will be useful when power returns"},
        {p:1,n:"Daily skin checks of the numb area",d:"daily",c:"You cannot feel burns, pressure or cuts — look instead"},
        {p:2,n:"Sustained gentle stretch to at-risk joints",d:"3×30s each",c:"Keep full passive range while you wait for re-innervation"},
        {p:2,n:"Mirror therapy / motor imagery",d:"5–10 min daily",c:"Keeps the brain's map of the limb alive while the nerve grows"},
        {p:3,n:"Motor re-education: trigger via the donor action",d:"5×10 daily",c:"After a transfer, start the new muscle by doing the donor nerve's old job, then wean off it"},
        {p:3,n:"Gravity-eliminated then anti-gravity movement",d:"3×10",c:"Work in the easiest position first as the flicker of contraction appears"},
        {p:4,n:"Progressive strengthening & functional task practice",d:"3×10",c:"Put the returning movement straight into real tasks"}]},
  {re:/limb lengthening|external fixation|ilizarov|bone transport|circular frame|hexapod/,
   focus:"During limb lengthening the muscles and nerves are being stretched a millimetre a day — so daily range work is not optional, it is the thing that decides whether the result is any good.",
   add:[{p:1,n:"Pin-site care as taught",d:"daily",c:"Infection is the commonest complication of a frame"},
        {p:1,n:"Full range of every joint above and below, several times daily",d:"4–5×10 daily",c:"The muscles are being stretched daily — contracture is the enemy of the whole operation"},
        {p:1,n:"Calf/ankle stretch into dorsiflexion",d:"5×30s daily",c:"Equinus (a tight calf) is the classic contracture in leg lengthening"},
        {p:2,n:"Isometric strengthening around the frame",d:"3×10, 5s holds",c:"Maintain muscle without disturbing the lengthening"},
        {p:2,n:"Weight-bearing exactly as prescribed, with aids",d:"as directed",c:"Loading follows the new bone, not comfort"},
        {p:3,n:"Progressive strengthening as consolidation proceeds",d:"3×10",c:"Only as your surgeon confirms the new bone is hardening"},
        {p:3,n:"Stationary bike / pool work for capacity",d:"10–20 min",c:"Keeps you fit while impact is off the table",tags:["aerobic"]},
        {p:4,n:"Gait retraining & graded loading after frame removal",d:"daily",c:"Refracture risk is real early — build impact slowly"}]},
  {re:/pectoralis major (tear|rupture|repair)|pec major (tear|rupture|repair)/,
   focus:"After a pectoralis major repair the tendon has to heal back to the arm bone — so no pressing, no bench, and no stretching the chest into extension until the repair is solid.",
   add:[{p:1,n:"Pendulum swings & passive shoulder range",d:"3×10",c:"Let the arm hang and swing — no active lifting"},
        {p:1,n:"Elbow, wrist & hand range in the sling",d:"hourly ×10",c:"Keep everything below the shoulder moving"},
        {p:1,n:"Scapular setting (squeeze the shoulder blades)",d:"3×10",c:"Gentle — no chest stretch"},
        {p:2,n:"Active-assisted shoulder elevation",d:"3×10",c:"Use the other arm to help; stay out of end-range external rotation"},
        {p:2,n:"Isometric internal rotation (arm at the side)",d:"3×10, 5s holds",c:"Wake the pec up without loading the repair"},
        {p:3,n:"Band internal rotation & light presses",d:"3×12",c:"Begin loading the pec gradually — light only"},
        {p:3,n:"Rows & scapular strengthening",d:"3×12",c:"Balance the shoulder while the pec catches up"},
        {p:4,n:"Progressive pressing, bench last",d:"3×8",c:"Heavy bench pressing is the movement that tore it — return to it last and build slowly"}]},
  {re:/acute compartment syndrome|fasciotomy/,
   focus:"After a fasciotomy the wounds and the surviving muscle set the pace — range work from day one prevents the contracture that otherwise defines the outcome, and numb skin needs checking because it cannot warn you.",
   add:[{p:1,n:"Passive & active-assisted range of every joint in the limb",d:"daily ×10 each",c:"Start even while the wounds are open — this is when contracture sets in"},
        {p:1,n:"Positioning/splinting in a functional position",d:"as directed",c:"Especially the ankle — an equinus contracture is the classic outcome"},
        {p:1,n:"Daily skin & wound checks",d:"daily",c:"Numb skin cannot warn you about pressure or burns"},
        {p:2,n:"Gentle active movement of the surviving muscle",d:"3×10",c:"Find out what still works and start using it"},
        {p:2,n:"Scar massage & sustained stretch once healed",d:"3×30s",c:"Fasciotomy scars are broad and adherent, and can limit the joint by themselves"},
        {p:3,n:"Progressive strengthening of what works",d:"3×10",c:"Build the muscle that survived; work around what didn't"},
        {p:3,n:"Gait retraining, with an orthosis if needed",d:"daily",c:"A brace can substitute very effectively for a muscle that didn't recover"},
        {p:4,n:"Functional & endurance training",d:"as tolerated",c:"Adapt to any permanent deficit — that's a normal part of this recovery"}]},
  {re:/charcot (foot|joint|arthropath|neuroarthropath)/,   // NOT bare /charcot/ — that also matches Charcot-Marie-Tooth
   focus:"An active Charcot foot must be completely offloaded — the bones are fracturing without pain to warn you, so every step causes more damage. Exercise everything EXCEPT that foot until your specialist confirms it has cooled.",
   add:[{p:1,n:"Strict offloading — no weight through that foot",d:"until cleared",c:"Total-contact cast/boot and non-weight-bearing exactly as directed. Because you can't feel it, pain will not warn you"},
        {p:1,n:"Daily skin & foot-temperature check",d:"daily",c:"Compare with the other foot — the temperature difference is what guides your specialist's progression"},
        {p:1,n:"Seated upper-body & core conditioning",d:"3×10",c:"Keep your fitness and strength while the foot is protected"},
        {p:1,n:"Other-leg strengthening",d:"3×12",c:"Protect the good leg — it's carrying you now, and it's at the same long-term risk"},
        {p:2,n:"Wheelchair/transfer technique practice",d:"daily",c:"Move about without loading the foot"},
        {p:2,n:"Seated arm-ergometer or upper-body cardio",d:"10–20 min",c:"Cardiovascular fitness without touching the foot",tags:["aerobic"]},
        {p:3,n:"Graded protected weight-bearing in the prescribed device",d:"as directed",c:"ONLY on your specialist's say-so, in the prescribed footwear — never by feel"},
        {p:3,n:"Balance & gait retraining in protective footwear",d:"3×30s",c:"Once cleared to load, rebuild steadiness in the device",tags:["balance"]},
        {p:4,n:"Walking tolerance in bespoke footwear",d:"build gradually",c:"Any new warmth, swelling or redness = stop and be seen the same day"}]},
  {re:/rhabdomyolys|exertional rhabdo/,
   focus:"Rhabdomyolysis recovery is about NOT training until you're cleared, then rebuilding far more slowly than feels necessary — a second episode usually comes from going back too hard, too soon.",
   add:[{p:1,n:"Rest & hydration — no training this phase",d:"until cleared",c:"This phase is medical recovery, not exercise. Dark urine or severe muscle pain: emergency department"},
        {p:1,n:"Gentle walking only, if your doctor allows",d:"5–10 min easy",c:"Nothing that raises your effort — and nothing at all until you're cleared"},
        {p:2,n:"Easy aerobic (walk/easy bike), well below your old level",d:"15–20 min",c:"Start much lighter than feels necessary; avoid heat and dehydration",tags:["aerobic"]},
        {p:2,n:"Hydration & recovery routine",d:"daily",c:"Track urine colour — dark means stop and be reviewed"},
        {p:3,n:"Graded resistance training, low volume",d:"2×10 light",c:"Avoid high-volume eccentric work — the classic trigger"},
        {p:3,n:"Build aerobic base steadily",d:"20–30 min",c:"Do not train when unwell, sleep-deprived or dehydrated",tags:["aerobic"]},
        {p:4,n:"Graded return to full training with heat acclimatisation",d:"progressive",c:"Rebuild heat tolerance deliberately; recurrence means stop and investigate"}]},
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
/* Lower-limb conditions that must be OFFLOADED, not balanced on. The balance
   ladder is weight-bearing by definition, so injecting it here contradicts the
   plan's own restriction (an active Charcot foot is told "DO NOT WALK ON IT",
   yet was still being prescribed double-leg balance). */
const RTS_NO_WB = /charcot (foot|joint|arthropath|neuroarthropath)|neuroarthropath|acute compartment|fasciotomy|avascular necrosis|osteonecrosis|\bavn\b|non-?weight-?bearing|limb lengthening|external fixation|ilizarov|bone transport|osteomyelitis|unstable fracture|stress fracture (of the )?(femoral neck|navicular)/i;
/* Falls history earns its own dedicated work, whatever the injury is: two or more
   falls in a year is the strongest predictor of the next one, and strength +
   balance training is the best-evidenced thing that prevents it. Graded so a
   frail, fallen user starts supported rather than on one leg. */
const FALLS_LADDER = {
  1:[{n:"Sit-to-stand from a chair (falls prevention)",d:"3×8",c:"The single most useful strength exercise for staying on your feet — use your hands at first",tags:["weight_bearing"]},
     {n:"Supported standing balance (hands on a counter)",d:"3×30s",c:"Hold a solid surface; build steadiness before you reduce support",tags:["balance"]}],
  2:[{n:"Feet-together & semi-tandem stand near support",d:"3×30s",c:"Narrow the base gradually, a hand always ready on the counter",tags:["balance"]},
     {n:"Heel raises & toe raises at the counter",d:"3×12",c:"Ankle strength is what catches you when you stumble",tags:["weight_bearing"]}],
  3:[{n:"Tandem stand & weight-shifts near support",d:"3×30s",c:"Heel-to-toe; control the sway rather than avoiding it",tags:["balance"]},
     {n:"Step-ups onto a low step (hold the rail)",d:"3×8 each",c:"Stairs are where falls do the most damage — practise them safely",tags:["weight_bearing","balance"]}],
  4:[{n:"Single-leg stance near support",d:"3×20s each",c:"Hand hovering over the counter, not gripping it",tags:["balance"]},
     {n:"Walking with head turns & direction changes",d:"3×10 m",c:"Real falls happen when you're turning or looking away — train that",tags:["weight_bearing","balance"]}]
};
function fallsFor(phaseIdx){
  const highRisk = state.falls==="2" || (state.aid && state.aid!=="none") || Number(state.age)>=75;
  if(!highRisk) return [];
  return (FALLS_LADDER[phaseIdx+1]||[]).map(a=>({ n:a.n, d:a.d, c:a.c, tags:a.tags||[], sig:true }));
}
function rtsFor(cond, phaseIdx){
  const p = phaseIdx+1;
  const hay = `${cond.name||""} ${cond.region||""}`;
  if(!RTS_LOWER.test(hay)) return [];
  if(RTS_NO_WB.test(hay)) return [];        // offloaded conditions: no weight-bearing balance/agility drills
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
/* How many exercises a phase should hold. A plan you won't finish isn't a plan —
   so the size follows the time the user says they actually have. */
function phaseTarget(p){
  const base = PHASE_TARGET[p] || 6;
  const t = state.timePerDay;
  if(t==="lt10")  return Math.max(3, Math.round(base*0.5));
  if(t==="10to20")return Math.max(4, Math.round(base*0.7));
  if(t==="gt40")  return base + 2;
  return base;
}
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
/* ---------- condition-specific rehab timelines ----------
   Real protocols aren't one-size-fits-all: an ACL reconstruction is a 9–12 month
   criteria-driven rehab, a meniscectomy is ~6 weeks, a frozen shoulder runs a
   year through freezing/frozen/thawing. Each plan supplies REAL phase names,
   ABSOLUTE week windows (from injury/surgery), goals, progression criteria and
   the stage's restrictions — so the plan reads like a clinician's protocol
   instead of a generic template. Exercise CONTENT still comes from the protocol +
   injury focus; this layer is the scaffolding around it.
   ph: [title, weekStart, weekEnd, goal, advance-criteria, restriction]
   `postop:true/false` limits a plan to (non-)surgical cases; `generic:true`
   entries lose to any specific match. Education only — a treating surgeon's or
   therapist's protocol always overrides. */
const REHAB_PLANS = [
  { re:/\bacl\b.*(reconstruct|repair|graft)|anterior cruciate.*(reconstruct|repair|graft)|\baclr\b/, label:"ACL reconstruction", total:39,
    freq:"Daily home work + 2–3 supervised sessions/week early on, tapering later",
    note:"ACL reconstruction is a 9–12 month rehab. The graft is at its weakest around 6–12 weeks while it re-vascularises, so progression is driven by criteria, not the calendar.",
    variants:[
      { k:"standard", label:"Standard", sub:"Criteria-based, return to pivoting sport ~9–12 months", scale:1 },
      { k:"athlete", label:"Accelerated (athlete)", sub:"Excellent early progress, closely supervised", scale:0.78,
        note:"Accelerated: suits an athlete with full extension, no swelling and strong quads early, under close supervision — but the graft still needs ~9 months before pivoting sport, so late milestones stay criteria-based." },
      { k:"meniscal", label:"+ Meniscal repair", sub:"ACL done alongside a meniscus repair", pick:/menisc/, scale:1.2,
        note:"With a concurrent meniscal repair the meniscus sets the early rules: restricted weight-bearing and flexion, and no deep loaded squatting for ~4 months." },
      { k:"revision", label:"Revision / complex", sub:"Repeat reconstruction or multi-ligament", pick:/revision|multi-?ligament/, scale:1.45,
        note:"Revision and multi-ligament reconstructions progress more slowly and return to sport is often 12+ months." }],
    ph:[
      ["Protection & quadriceps activation",0,2,"Settle swelling, get the knee fully straight, and switch the quads back on.","full passive extension equal to the other knee, a strong quad set and a straight-leg raise with no lag, swelling settling","Brace and crutches as your surgeon directs. No pivoting or twisting; avoid open-chain knee extension in the 0–45° range."],
      ["Range of motion, gait & early strength",2,6,"Restore full range, walk normally without aids, and rebuild base strength.","full extension, flexion ≥120°, walking without crutches or a limp, minimal swelling","No running, cutting or pivoting. Closed-chain strengthening only."],
      ["Progressive strengthening & neuromuscular control",6,12,"Build quadriceps and hamstring strength with good single-leg control.","quadriceps strength ≥70–80% of the other leg, controlled single-leg squat, no swelling after loading","Running only once quad strength is ≥80% and the knee stays pain- and swelling-free — usually 12+ weeks."],
      ["Return to running, agility & sport",12,39,"Restore full strength and power, then running, cutting and sport-specific work.","quadriceps and hamstring strength ≥90% of the other side, hop-test battery ≥90%, confident cutting, plus surgeon/clinician clearance","Return to pivoting sport is typically 9–12 months. Going back before 9 months markedly raises re-rupture risk."]] },
  { re:/\bacl\b|anterior cruciate/, label:"ACL injury (non-surgical)", postop:false, total:20,
    freq:"Daily home work + 2 supervised sessions/week",
    note:"Many ACL tears are managed without surgery, especially for non-pivoting activities. Strong quads/hamstrings and good neuromuscular control are what stabilise the knee.",
    ph:[
      ["Settle symptoms & restore extension",0,2,"Calm swelling and pain, regain full knee extension, activate the quads.","swelling settling, full extension, quad set with a straight-leg raise and no lag","Avoid pivoting, cutting and deep squatting. Use crutches while your walking is poor."],
      ["Full range & base strength",2,6,"Restore full motion and normal gait, build base leg strength.","full range, walking without a limp, no giving-way in daily activity","Still no pivoting or cutting sports."],
      ["Strength & neuromuscular control",6,12,"Build strength and single-leg control so the knee feels stable.","quadriceps and hamstring strength ≥80% of the other side, controlled single-leg work, no episodes of giving way","Introduce straight-line running only when strength and control allow."],
      ["Return to activity & stability testing",12,20,"Restore power and confident change-of-direction, or decide about surgery.","hop tests ≥90%, no giving-way with agility, confident on the leg","Repeated giving-way despite good rehab is a reason to discuss reconstruction."]] },
  /* NB: the combined alternative is listed FIRST so a "trochleoplasty with MPFL"
     matches longer here (38 chars) than in the MPFL plan ("mpfl reconstruction",
     19) — the trochleoplasty is the bigger procedure and must govern the plan. */
  { re:/trochleoplasty (with|and|\+) (an? )?mpfl( reconstruction)?|trochleoplast|sulcus.?deepening|trochlear (groove )?(deepening|reshap|osteotomy)|dejour trochlea|bereiter/, label:"Trochleoplasty", total:52,
    freq:"Frequent short range sessions daily early (motion is the priority), then strengthening 4–5×/week",
    note:"Trochleoplasty reshapes a flat or dome-shaped groove at the end of the thigh bone into a proper channel for the kneecap to run in, by lifting the cartilage, removing bone underneath and refixing the flap. It's reserved for severe trochlear dysplasia with recurrent dislocation, and it's usually combined with an MPFL reconstruction. STIFFNESS (arthrofibrosis) is the defining complication — early bend matters more here than in almost any other knee operation. It is generally avoided while the growth plates are still open.",
    variants:[
      { k:"dejour", label:"Sulcus-deepening (Dejour)", sub:"The groove is deepened — the classic technique", pick:/dejour|sulcus.?deepening/i, scale:1 },
      { k:"bereiter", label:"Thin-flap (Bereiter)", sub:"A thinner osteochondral flap is raised", pick:/bereiter|thin.?flap/i, scale:0.95,
        note:"The thin-flap technique raises a thinner osteochondral layer. Rehab is essentially the same — and the emphasis on getting flexion back early is identical." },
      { k:"mpfl", label:"With MPFL reconstruction", sub:"The usual combination", pick:/mpfl|medial patellofemoral/i, scale:1.05,
        note:"The usual combination. The MPFL's rule — nobody pushes the kneecap outwards — applies ON TOP of the trochleoplasty's loading limits; the more restrictive rule always wins." },
      { k:"ttt", label:"With tibial tubercle transfer", sub:"A bone realignment as well", pick:/tubercle|tuberosity|fulkerson|trillat|osteotomy/i, scale:1.25,
        note:"With a tibial tubercle osteotomy as well, that bone cut's weight-bearing and knee-extension limits are the stricter rule and override — bone union is the slower clock." },
      { k:"revision", label:"Revision / complex", sub:"After a failed stabilisation", pick:/revision|complex|failed|recurrent/i, scale:1.3,
        note:"Revision patellofemoral surgery is slower and less predictable, and stiffness risk is higher again." }],
    ph:[
      ["Protect the trochlear flap & drive early motion",0,2,"Protect the reshaped groove while getting the knee bending — early motion is the priority here.","full extension, a straight-leg raise with NO extensor lag, flexion ≥90° by around 2 weeks, swelling settling","Early bending is the priority: stiffness (arthrofibrosis) is the commonest complication of trochleoplasty and is far easier to prevent than to treat. Brace locked in extension for walking — the kneecap doesn't sit on the reshaped groove when the knee is straight. NO resisted knee extension and no loaded deep bending: both grind the kneecap into the healing cartilage flap."],
      ["Range & shallow-range strength",2,6,"Keep chasing full bend, and rebuild strength in a shallow, low-compression range.","flexion ≥120°, full extension, walking without the brace and without a limp, no extensor lag","If flexion is stalling, tell your surgeon EARLY — a manipulation is time-sensitive and works best before about 3 months. Strengthen in a shallow arc (roughly 0–30/45°), where the kneecap presses on the groove least. If an MPFL was done too, nobody pushes the kneecap outwards."],
      ["Progressive strengthening through range",6,16,"Deepen the loaded range gradually and rebuild quadriceps and hip strength.","full or near-full flexion, quadriceps strength ≥70–80% of the other leg, a controlled single-leg squat, no swelling or grinding pain over the groove","Add depth to loaded bending gradually — the resurfaced groove does tolerate load, but grinding pain, swelling or a warm knee means drop back a level. Impact only once your surgeon clears it."],
      ["Return to running, agility & sport",16,52,"Restore power, then running, cutting and sport-specific work.","quadriceps strength ≥90% of the other side, hop-test battery ≥90%, no apprehension with cutting, plus surgeon clearance","Return to pivoting sport is typically 9–12 months — longer than an isolated MPFL, because cartilage and bone had to heal. Some crepitus (a grinding noise) is common and not itself a problem, but the long-term risk of patellofemoral arthritis is raised: keep the quadriceps strong and manage load."]] },
  { re:/medial patellofemoral ligament (reconstruction|repair)|\bmpfl\b (reconstruction|repair)|medial patellofemoral ligament|\bmpfl\b/, label:"MPFL reconstruction", total:36,
    freq:"Short frequent sessions daily early, then 4–5 strengthening sessions/week",
    note:"The MPFL is the main checkrein stopping the kneecap sliding outwards in the first 20–30° of bend, and it's rebuilt with a graft anchored to the kneecap and the inner thigh bone. Unlike a bony realignment this is a soft-tissue reconstruction, so the graft — not the bone — sets the pace. STIFFNESS is the most common complication here, so regaining bend early matters as much as protecting the graft.",
    variants:[
      { k:"isolated", label:"Isolated MPFL reconstruction", sub:"Ligament rebuilt on its own", scale:1 },
      { k:"repair", label:"MPFL repair (not reconstruction)", sub:"The torn ligament stitched rather than grafted", pick:/repair/i, scale:0.8,
        note:"A direct repair is weaker than a graft and re-dislocation rates are higher — especially in young athletes with bony risk factors — so the return-to-sport criteria matter even more." },
      { k:"ttt", label:"With tibial tubercle transfer", sub:"Combined with a bone realignment", pick:/tubercle|tuberosity|osteotomy|realign|fulkerson|trillat/i, scale:1.3,
        note:"When it's combined with a bone cut, the OSTEOTOMY sets the rules — its weight-bearing and knee-extension limits override the ligament's, because bone healing is the slower clock." },
      { k:"trochleoplasty", label:"With trochleoplasty", sub:"The groove was deepened as well", pick:/trochleoplast|trochlear|groove/i, scale:1.35,
        note:"Deepening the groove is a much bigger operation — stiffness risk is higher again, so frequent range work is the priority and progression is slower." },
      { k:"paeds", label:"Skeletally immature (physeal-sparing)", sub:"A child or adolescent still growing", pick:/paediatric|pediatric|child|adolescent|skeletally immature|physeal|growth plate/i, scale:1.1,
        note:"In a growing child the femoral anchor must avoid the growth plate — follow the surgeon's technique-specific limits, and growth needs monitoring afterwards." },
      { k:"revision", label:"Revision", sub:"Repeat stabilisation after a failure", pick:/revision|recurrent|failed/i, scale:1.35,
        note:"A failed MPFL reconstruction usually means an untreated bony risk factor — trochlear dysplasia, a high-riding patella or a high TT–TG distance. Revision without addressing that tends to fail again." }],
    ph:[
      ["Protect the graft & restore extension",0,2,"Protect the reconstruction, settle swelling, get the knee fully straight and the quadriceps firing.","full passive extension, a straight-leg raise with NO extensor lag, flexion ≥90°, swelling settling","Brace locked in extension for walking, weight-bearing as your surgeon allows. Nobody — including you — should push the kneecap OUTWARDS (a lateral glide stretch or test): that is precisely the movement the graft was put in to resist. No twisting on a planted foot."],
      ["Full range & early strength",2,6,"Regain full bend — this is the window — wean the brace and rebuild base strength.","full extension, flexion ≥120–130°, walking without the brace and without a limp, no extensor lag, minimal swelling","Stiffness is the most common complication after this operation, and flexion regained now is far harder to win back later. Still no forced lateral patellar glide, no deep loaded squatting and no pivoting."],
      ["Progressive strengthening & control",6,12,"Build quadriceps and hip strength with good single-leg control.","quadriceps strength ≥70–80% of the other leg, a controlled single-leg squat with the knee tracking over the foot, no apprehension, no swelling","Add deeper loaded bending gradually. Avoid the position the kneecap actually dislocates in — knee bent with the body rotating inwards over a planted foot. Persistent pain on the inner kneecap can mean the graft was tensioned too tightly; mention it."],
      ["Return to running, agility & sport",12,36,"Restore power, then running, cutting and sport-specific work.","quadriceps strength ≥90% of the other side, hop-test battery ≥90%, no apprehension with cutting, plus surgeon clearance","Return to pivoting sport is typically 6–9 months. If the kneecap still feels like it will go, get reviewed — an untreated bony risk factor (a shallow/dysplastic groove, a high-riding patella, or a high TT–TG distance) makes an isolated MPFL reconstruction more likely to fail."]] },
  { re:/tibial tub(ercle|erosity) (transfer|osteotomy|realign)|fulkerson|elmslie-?trillat|anteromedialisation|anteromedialization|\btto\b|\bttt\b/, label:"Tibial tubercle transfer (osteotomy)", total:52,
    freq:"Short frequent sessions daily early, then 4–5 strengthening sessions/week",
    note:"The tibial tubercle — where the patellar tendon anchors — is cut off the tibia, moved, and held with screws. It is a BONE-HEALING timeline, and the quadriceps pulls directly on that fragment, so early weight-bearing and resisted knee extension are restricted. Fracture through the osteotomy site is the main early complication and it is almost always caused by loading it too soon.",
    variants:[
      { k:"amz", label:"Anteromedialisation (Fulkerson)", sub:"Moved medially AND forward — instability + cartilage", pick:/fulkerson|anteromedialis|anteromedializ/i, scale:1 },
      { k:"medial", label:"Medialisation (Elmslie-Trillat)", sub:"Moved medially only — instability", pick:/elmslie|trillat|medialisation|medialization/i, scale:0.9,
        note:"A medialisation-only transfer has a flatter cut and is generally a little quicker than an anteromedialisation, but the same bone-healing rules apply." },
      { k:"distal", label:"Distalisation", sub:"Moved downward for a high-riding patella (alta)", pick:/distalis|distaliz|patella alta/i, scale:1.2,
        note:"Distalisation puts the osteotomy under the most tension from the quadriceps and has the highest fracture risk — weight-bearing and extension restrictions are stricter and longer." },
      { k:"mpfl", label:"With MPFL reconstruction", sub:"Combined with a ligament reconstruction", pick:/mpfl|ligament|combined/i, scale:1.15,
        note:"When combined with an MPFL reconstruction, the ligament's range limits apply on top of the osteotomy's loading limits — the more restrictive rule always wins." },
      { k:"revision", label:"Revision / complex", sub:"Repeat or complex realignment", pick:/revision|complex/i, scale:1.35,
        note:"Revision realignment progresses more slowly, and hardware problems and stiffness are more common." }],
    ph:[
      ["Protect the osteotomy",0,6,"Protect the bone fragment, control swelling, and switch the quads on without loading the tubercle.","full passive extension, a straight-leg raise with NO extensor lag, flexion ≥90°, wound healed and swelling settling","Brace locked in extension for walking and partial/toe-touch weight-bearing EXACTLY as your surgeon directs — the tubercle is held only by screws and can fracture if you load it early. NO resisted knee extension, no squatting, no kneeling, and do not let the knee buckle."],
      ["Union & restoring motion",6,12,"Wean the brace and crutches as the bone unites, and restore full motion.","your surgeon confirms the osteotomy is uniting on X-ray, walking full weight-bearing without the brace or a limp, flexion ≥120°, no extensor lag","Progress weight-bearing ONLY once union is confirmed — not on the calendar. Still no resisted open-chain knee extension and no deep squatting: the quadriceps pulls directly on the healing fragment."],
      ["Progressive strengthening",12,24,"Rebuild quadriceps strength and single-leg control.","quadriceps strength ≥70–80% of the other leg, controlled single-leg squat, no pain at the tubercle with loading, no swelling","Introduce resisted knee extension gradually and only after ~12 weeks, in a pain-free mid-range arc. Impact only once union is solid. Kneeling directly on the tubercle stays uncomfortable for a long time."],
      ["Return to running & sport",24,52,"Restore full strength and power, then running, cutting and sport.","quadriceps strength ≥90% of the other side, hop-test battery ≥90%, no tubercle pain with impact, plus surgeon clearance","Return to sport is typically 6–12 months. The screws sit just under the skin and commonly irritate with kneeling — removal is sometimes done later, usually after a year once the bone has fully healed."]] },
  { re:/meniscus repair|meniscal repair|meniscus.*(suture|root repair)/, label:"Meniscus repair", total:26,
    freq:"Daily home work + 1–2 supervised sessions/week",
    note:"A repaired meniscus has a poor blood supply and needs real protection — this is much slower than a meniscectomy. Deep loaded flexion is the main thing to avoid early.",
    ph:[
      ["Protect the repair",0,4,"Protect the suture, control swelling, keep the quads active.","swelling settling, full extension, good quad set, weight-bearing as your surgeon allows","Weight-bearing and flexion limits per your surgeon (often partial WB and flexion capped ~90°). No deep squatting or twisting."],
      ["Restore motion & gait",4,8,"Regain full range and normal walking as the limits are lifted.","full extension, flexion ≥120°, walking without aids or a limp","Still no deep squats, kneeling or pivoting."],
      ["Progressive strengthening",8,16,"Build strength through increasing range with good control.","strength ≥80% of the other leg, no joint-line pain with loading, no swelling","Deep loaded flexion (full squats, lunges past 90°) usually not before ~4 months."],
      ["Return to sport",16,26,"Restore power, impact tolerance and sport-specific work.","strength and hop tests ≥90%, no joint-line pain, clinician clearance","Return to pivoting sport is typically 5–6 months after a repair."]] },
  { re:/meniscectom|partial meniscect|meniscus trim|meniscus debrid/, label:"Partial meniscectomy", total:12,
    freq:"Daily home work + 1–2 supervised sessions/week early",
    note:"Because the torn piece is removed rather than repaired, this rehab is fast — most people are back to normal activity in 4–8 weeks. Swelling is the main guide.",
    ph:[
      ["Settle & restore motion",0,1,"Control swelling, regain extension, walk normally.","swelling and pain settling, full extension, walking with little or no limp","Full weight-bearing as comfortable unless told otherwise. Avoid deep squats early."],
      ["Full range & base strength",1,3,"Full range and normal gait, rebuild quad strength.","full range, no limp, minimal swelling after activity","Ease into loading — swelling that lasts overnight means you've done too much."],
      ["Progressive loading",3,6,"Build strength and start impact.","strength ≥80% of the other leg, no swelling after loading, comfortable jogging","Introduce running once loading is comfortable and swelling-free."],
      ["Return to sport",6,12,"Restore power and sport-specific demands.","strength ≥90%, confident agility, no swelling","Most return to sport around 6–8 weeks; joint-line pain or swelling means back off."]] },
  { re:/meniscus|meniscal/, label:"Meniscus tear (non-surgical)", postop:false, total:14, generic:true,
    freq:"Daily home work + 1–2 supervised sessions/week",
    note:"Most degenerative meniscal tears do as well with exercise as with surgery — strength and load tolerance are the treatment.",
    ph:[
      ["Settle symptoms",0,2,"Calm pain and swelling, restore extension.","swelling settling, full extension, comfortable walking","Avoid deep squatting and twisting while it's irritable."],
      ["Restore range & activate",2,5,"Full range and normal gait, wake the quads up.","full range, no limp, only mild symptoms with daily activity","Ease off deep flexion under load."],
      ["Progressive strengthening",5,10,"Build strength and load tolerance around the knee.","strength ≥80% of the other side, joint-line pain settling","Some discomfort with loading is fine if it settles overnight."],
      ["Return to full activity",10,14,"Restore full capacity and impact tolerance.","strength near-symmetrical, confident with your activities","Locking or the knee giving way should be reviewed — that may need surgery."]] },
  { re:/\bmcl\b|medial collateral/, label:"MCL sprain", total:10,
    freq:"Daily home work + 1–2 supervised sessions/week",
    note:"The MCL has a good blood supply and heals well without surgery — even higher-grade tears.",
    variants:[
      { k:"g1", label:"Grade I (mild)", sub:"Tender, stable on testing", pick:/grade (i|1)\b/, scale:0.35,
        note:"Grade I: usually 2–3 weeks to return." },
      { k:"g2", label:"Grade II (moderate)", sub:"Partial tear, some laxity with a firm endpoint", pick:/grade (ii|2)\b/, scale:0.7,
        note:"Grade II: usually 4–6 weeks, often with a hinged brace." },
      { k:"g3", label:"Grade III (complete)", sub:"Complete tear, marked laxity", pick:/grade (iii|3)\b/, scale:1.3,
        note:"Grade III: 8–12 weeks in a hinged brace. Check for associated ACL/meniscal injury — isolated MCL tears still usually heal without surgery." }],
    ph:[
      ["Protect & settle",0,1,"Control pain and swelling, protect the healing ligament.","swelling settling, comfortable weight-bearing, extension restored","Brace as advised. Avoid any sideways (valgus) stress on the knee."],
      ["Restore range & gait",1,3,"Regain full motion and normal walking.","full range, walking without a limp, no pain on gentle valgus stress","Still avoid side-to-side stress and pivoting."],
      ["Strengthening",3,6,"Rebuild strength and control through full range.","strength ≥80% of the other leg, no MCL tenderness with loading","Introduce controlled change-of-direction only when pain-free."],
      ["Return to sport",6,10,"Restore power and cutting/pivoting demands.","strength ≥90%, stable on valgus testing, confident cutting","Higher-grade (III) sprains commonly need 8–12 weeks before contact sport."]] },
  { re:/knee replacement|knee arthroplasty|\btkr\b|\btka\b|unicompartmental knee/, label:"Total knee replacement", total:26,
    freq:"Short sessions several times daily early, then 4–5 sessions/week",
    note:"Range of motion in the first 6 weeks is the priority — it's much harder to regain later. Swelling and discomfort for several months is normal; most improvement is in the first 3 months, with gains continuing to a year.",
    variants:[
      { k:"standard", label:"Standard", sub:"Typical primary knee replacement", scale:1 },
      { k:"rapid", label:"Rapid-recovery", sub:"Enhanced-recovery pathway, progressing well", scale:0.8,
        note:"Rapid-recovery pathways get people up the same day and home fast — but only push this if your range and swelling are genuinely on track." },
      { k:"stiff", label:"Slow / stiff knee", sub:"Range lagging behind, or a complex case", pick:/stiff|arthrofibrosis/, scale:1.35,
        note:"If flexion is stalling below ~90° at 6 weeks, tell your surgeon promptly — manipulation under anaesthetic is time-sensitive and works best early." },
      { k:"uni", label:"Partial (uni) knee replacement", sub:"Only one compartment replaced", pick:/unicompartmental|partial knee/, scale:0.75,
        note:"Partial replacements usually recover faster than a total, with better range and a more natural-feeling knee." },
      { k:"revision", label:"Revision replacement", sub:"Repeat knee replacement", pick:/revision/, scale:1.45,
        note:"Revision knee replacements are bigger operations with slower recovery, often restricted weight-bearing and a lower final range — your surgeon's protocol overrides everything here." }],
    ph:[
      ["Early motion, swelling & walking",0,2,"Get the knee straight, bend it, and walk safely.","full extension (0°), flexion ≥90°, walking with a frame/crutches, wound healing","Follow your weight-bearing status. Do NOT put a pillow under the knee — that causes a flexion contracture."],
      ["Range, gait & early strength",2,6,"Push toward full flexion, walk without aids, rebuild quads.","extension 0°, flexion ≥110–120°, walking without aids, stairs one at a time","Range work is the priority in these weeks — flexion gained now is much harder to get later."],
      ["Strength & function",6,12,"Build strength and normal function — stairs, sit-to-stand, walking distance.","flexion ≥120°, reciprocal stair climbing, sit-to-stand without hands, walking 20+ min","Kneeling is often uncomfortable for a long time — it's not harmful."],
      ["Endurance & return to activity",12,26,"Restore endurance and return to low-impact activity.","near-normal walking and stairs, good strength, comfortable daily activity","Low-impact activity (walking, cycling, swimming, golf) is encouraged; running and jumping are generally not."]] },
  { re:/hip replacement|hip arthroplasty|\bthr\b|\btha\b|hip resurfacing|hemiarthroplasty/, label:"Total hip replacement", total:24,
    freq:"Short sessions several times daily early, then 4–5 sessions/week",
    note:"Recovery is usually quicker than a knee replacement. Follow your surgeon's precautions — they depend on the surgical approach.",
    variants:[
      { k:"posterior", label:"Posterior approach", sub:"The most common — full hip precautions", scale:1,
        note:"Posterior approach: the classic precautions apply — don't bend past 90°, don't cross the midline, don't rotate the leg inwards, usually for 6–12 weeks." },
      { k:"anterior", label:"Anterior approach", sub:"Often fewer restrictions, quicker early recovery", pick:/anterior approach/, scale:0.85,
        note:"Anterior approach: many surgeons apply few or no movement precautions and early recovery is often quicker — but some restrict extension and external rotation instead. Follow YOUR surgeon's list." },
      { k:"revision", label:"Revision / complex", sub:"Repeat replacement or a complex case", pick:/revision/, scale:1.4,
        note:"Revision hips progress more slowly, often with restricted weight-bearing — your surgeon's protocol overrides everything here." },
      { k:"fracture", label:"After a hip fracture", sub:"Hemiarthroplasty for a broken hip", pick:/fracture|hemiarthroplasty/, scale:1.25,
        note:"After a fractured hip, rehab also targets falls prevention, bone health and getting back to independence — outcomes depend heavily on early mobilisation." }],
    ph:[
      ["Early mobility & precautions",0,2,"Walk safely, control swelling, protect the new joint.","walking with aids, getting in/out of bed and a chair independently, wound healing","Hip precautions per your approach — typically no bending past 90°, no crossing the midline, no twisting inwards."],
      ["Gait & base strength",2,6,"Walk without aids, rebuild hip strength.","walking without aids or a limp, good glute activation, stairs with a rail","Keep observing your precautions until your surgeon lifts them (often ~6–12 weeks)."],
      ["Strength & function",6,12,"Build strength and normal function.","normal gait, sit-to-stand without hands, stairs reciprocally, good single-leg stance","Most precautions lift around now — check with your surgeon before deep bending."],
      ["Endurance & return to activity",12,24,"Restore endurance and return to low-impact activity.","near-normal strength and gait, comfortable with daily activity and walking distance","Low-impact activity encouraged; avoid running and impact sport unless your surgeon clears it."]] },
  { re:/rotator cuff (repair|reconstruct)|cuff repair|supraspinatus repair|subscapularis repair/, label:"Rotator cuff repair", total:26,
    freq:"Little and often — 3–5 short sessions daily early, then 4–5 sessions/week",
    note:"The repaired tendon needs to heal to bone before it can be loaded — that's why active movement is delayed. Pushing early risks re-tear, which is the main complication.",
    variants:[
      { k:"small", label:"Small / medium tear", sub:"Standard repair, good tissue quality", scale:1 },
      { k:"large", label:"Large / massive tear", sub:"Bigger repair or poorer tissue", pick:/massive|large/, scale:1.3,
        note:"Large and massive repairs are protected for longer and re-tear rates are higher — expect a slower, more cautious pathway." },
      { k:"revision", label:"Revision repair", sub:"Repeat surgery after a failed repair", pick:/revision/, scale:1.5,
        note:"Revision repairs need the most protection and have the least predictable outcome." },
      { k:"early", label:"Early-motion protocol", sub:"Only if your surgeon specifies it", scale:0.8,
        note:"Some surgeons use early-motion protocols for small repairs. Only follow this if it's YOUR surgeon's instruction — moving early against a standard protocol risks the repair." }],
    ph:[
      ["Sling & protected passive motion",0,6,"Protect the repair, prevent stiffness with passive movement only.","passive range progressing per protocol, pain settling, sling used as directed","Sling ~4–6 weeks. PASSIVE movement only — no active lifting of the arm, no reaching behind, no weight-bearing through the arm."],
      ["Active-assisted to active motion",6,12,"Regain active range as the repair consolidates.","near-full passive range, active elevation without a shrug, pain settling","Active movement without resistance. Still no lifting or loaded reaching."],
      ["Progressive strengthening",12,16,"Start and build rotator-cuff and scapular strength.","full active range, good scapular control, strength returning without pain","Begin light resisted work only — build gradually; the tendon is still maturing."],
      ["Strength, endurance & return",16,26,"Restore strength, overhead function and return to activity.","strength approaching the other side, comfortable overhead function, clinician clearance","Return to heavy lifting or overhead sport is usually 4–6 months+."]] },
  { re:/frozen shoulder|adhesive capsulitis/, label:"Frozen shoulder (adhesive capsulitis)", total:52,
    freq:"Short, frequent, gentle sessions daily — 3–5 times/day",
    note:"This is a long condition that runs through three stages — freezing (painful), frozen (stiff), thawing (recovering) — typically 1–3 years but often shorter with good management. Aggressive stretching during the painful stage makes it worse.",
    variants:[
      { k:"standard", label:"Standard (natural course)", sub:"Managed with exercise and pain relief", scale:1 },
      { k:"injection", label:"After a steroid injection", sub:"Injected during the painful/freezing stage", scale:0.72,
        note:"A corticosteroid injection given EARLY (in the painful freezing stage) is the single most effective intervention — it shortens the painful phase and lets range work start sooner." },
      { k:"procedure", label:"After hydrodilatation / MUA", sub:"Distension or manipulation under anaesthetic", scale:0.6,
        note:"After hydrodilatation or a manipulation, the window to gain range is short — start range work immediately and frequently, or the gains are lost." },
      { k:"diabetic", label:"Diabetes-associated", sub:"Frozen shoulder alongside diabetes", pick:/diabet/, scale:1.3,
        note:"Frozen shoulder with diabetes is more common, more stubborn, more often bilateral, and slower to resolve — expect a longer course and keep glucose well controlled." }],
    ph:[
      ["Freezing — pain-dominant",0,12,"Control pain and keep the range you have. Don't force it.","night pain settling, pain no longer the dominant problem","Do NOT stretch aggressively — pain is the guide. This stage is about pain relief and gentle movement; a steroid injection can help a lot here."],
      ["Frozen — stiffness-dominant",12,30,"Now work on range — this is the stage where stretching earns its keep.","measurable gains in range, especially external rotation, with less pain","Stretching should be firm but tolerable and settle within 30 minutes. Progress is slow — that's normal."],
      ["Thawing — regaining motion",30,44,"Keep regaining range and rebuild the strength lost to disuse.","range approaching the other side, strength rebuilding","Keep going — the shoulder is genuinely recovering now."],
      ["Restore full function",44,52,"Restore full range, strength and overhead function.","near-full range and strength, comfortable with overhead and behind-the-back tasks","Some people keep a small permanent loss of end-range rotation — usually not functionally limiting."]] },
  { re:/rotator cuff|supraspinatus|subacromial|shoulder impingement|infraspinatus|cuff tendin/, label:"Rotator cuff / subacromial pain", postop:false, total:16,
    freq:"Daily home exercises + 1 supervised session/week",
    note:"Exercise is as effective as surgery for most rotator-cuff pain — but it takes ~12 weeks to work. Loading the cuff progressively is the treatment, not rest.",
    ph:[
      ["Settle & activate",0,2,"Calm the irritable tendon and re-establish scapular control.","night pain settling, comfortable with light daily reaching","Avoid repeated overhead work and heavy loads while it's very irritable — but keep moving."],
      ["Range & isometric loading",2,6,"Restore full range and start loading the cuff.","full range, comfortable isometrics, pain ≤3/10 with daily tasks","Some discomfort with exercise is fine if it settles within 24 hours."],
      ["Progressive strengthening",6,12,"Build cuff and scapular strength through range.","strength improving, comfortable with light overhead work","Add overhead loading gradually once mid-range is comfortable."],
      ["Strength & return to full use",12,16,"Restore full strength and overhead/sport capacity.","strength near the other side, comfortable overhead and with your activities","If there's been no progress after 12 weeks of genuine loading, get re-reviewed."]] },
  { re:/shoulder (dislocat|instab|subluxat)|bankart|labral (tear|repair)|\bslap\b|glenohumeral instab/, label:"Shoulder instability / dislocation", total:24,
    freq:"Daily home work + 1–2 supervised sessions/week",
    note:"Re-dislocation risk is highest in young athletes — good cuff and scapular strength plus a staged return is what protects the joint. Recurrent dislocations may need stabilisation surgery.",
    ph:[
      ["Protect & settle",0,3,"Protect the joint and settle pain while tissue heals.","pain settling, comfortable in a sling/at rest, gentle range within safe limits","Avoid the position of instability — usually abduction with external rotation (the 'throwing' position)."],
      ["Restore range & cuff activation",3,6,"Regain range within safe limits and wake up the cuff.","near-full range, good cuff isometrics, no apprehension in mid-range","Still avoid end-range abduction/external rotation and any apprehension positions."],
      ["Strength & control",6,12,"Build cuff, scapular and proprioceptive control.","good strength and control, no apprehension through range","Introduce end-range work gradually as confidence and control build."],
      ["Return to sport",12,24,"Restore power and contact/overhead demands.","full strength, no apprehension, confident with sport-specific loading","Return to contact/overhead sport is usually 3–6 months; recurrent dislocation warrants a surgical opinion."]] },
  { re:/achilles (rupture|tear)|achilles (repair|reconstruct)|tendo.?achilles rupture/, label:"Achilles rupture", total:39,
    freq:"Daily home work + 1–2 supervised sessions/week",
    note:"Whether repaired or managed in a boot, the tendon needs graded protection then graded loading. Return to sport is typically 6–12 months, and calf strength often lags for a year or more.",
    variants:[
      { k:"operative", label:"Surgical repair", sub:"Tendon repaired, then boot and graded loading", scale:1,
        note:"Repair carries a slightly lower re-rupture rate but adds wound and infection risk; rehab afterwards is much the same." },
      { k:"nonop", label:"Non-operative (functional bracing)", sub:"Managed in a boot with heel wedges — no surgery", pick:/non-?operative|conservative|non-?surgical/, scale:1.05,
        note:"Modern non-operative management with EARLY functional bracing gives re-rupture rates close to surgery — but only if the boot/wedge protocol is followed exactly. Missing the early protection is what causes re-rupture." },
      { k:"delayed", label:"Delayed presentation / re-rupture", sub:"Diagnosed late, or a second rupture", scale:1.35,
        note:"Late-diagnosed and re-ruptured tendons heal slower and end with less calf strength — expect a longer pathway." }],
    ph:[
      ["Protected healing in a boot",0,4,"Protect the healing tendon; keep the rest of the leg working.","wound healed (if operated), comfortable in the boot, following your weight-bearing status","Boot with heel wedges per protocol. NO stretching of the tendon and no dorsiflexion past neutral."],
      ["Progressive weight-bearing & range",4,10,"Wean the boot and wedges, restore range and normal walking.","full weight-bearing out of the boot, ankle range to neutral and beyond, walking without a limp","Wean wedges gradually as directed. Still no forced stretching or explosive push-off."],
      ["Calf strengthening",10,20,"Rebuild calf strength — the key long-term outcome.","double-leg heel raise, progressing to single-leg heel raises","Build heel-raise capacity methodically; a single-leg heel raise is a key milestone."],
      ["Return to running & sport",20,39,"Restore power, hopping and sport-specific loading.","single-leg heel-raise height/endurance ≥90% of the other side, comfortable hopping and running","Return to sport is typically 6–12 months. Re-rupture risk is highest if you return before calf strength is restored."]] },
  { re:/achilles tendinop|achilles tendin|insertional achilles|mid.?portion achilles/, label:"Achilles tendinopathy", postop:false, total:24,
    freq:"Daily loading — this tendon responds to consistent, progressive load",
    note:"Tendons need load, not rest. Progressive calf loading (isometric → heavy-slow → energy-storage) works but takes 3–6 months. Pain up to ~5/10 during exercise that settles within 24 hours is acceptable and not harmful.",
    ph:[
      ["Settle & isometric loading",0,4,"Reduce pain and start loading with isometrics.","morning stiffness reducing, comfortable isometric holds","Reduce (don't stop) aggravating activity. For insertional pain, avoid stretching into dorsiflexion and hill/speed work."],
      ["Heavy-slow resistance loading",4,10,"Load the tendon progressively — the main driver of recovery.","comfortable with progressive heel-raise loading, pain settling within 24 hours","Load 3×/week with heavy, slow calf raises. Some pain during loading is fine if it settles."],
      ["Energy storage & power",10,16,"Add spring/plyometric loading to prepare for running.","good single-leg heel-raise capacity, tolerating hopping","Progress hopping and skipping gradually; watch for next-morning pain."],
      ["Return to running & sport",16,24,"Return to running and sport with a graded loading plan.","calf strength near-symmetrical, tolerating running without a next-day flare","Build running volume ~10%/week; tendons dislike sudden spikes in load."]] },
  { re:/ankle sprain|lateral ligament.*ankle|\batfl\b|inversion injury|sprained ankle|ankle instab/, label:"Lateral ankle sprain", total:12,
    freq:"Several short sessions daily early, then 4–5 sessions/week",
    note:"Ankle sprains are under-rehabbed — up to a third become chronically unstable. Balance/proprioception training is what prevents recurrence, so don't stop when the pain goes.",
    variants:[
      { k:"g1", label:"Grade I (mild)", sub:"Stretched ligament, minimal swelling, can walk", pick:/grade (i|1)\b/, scale:0.4,
        note:"Grade I: back to sport in ~1–3 weeks — but keep the balance work going for months." },
      { k:"g2", label:"Grade II (moderate)", sub:"Partial tear, swelling and bruising, painful walking", pick:/grade (ii|2)\b/, scale:0.8 },
      { k:"g3", label:"Grade III (severe)", sub:"Complete tear, marked swelling, can't weight-bear", pick:/grade (iii|3)\b/, scale:1.4,
        note:"Grade III: 8–12+ weeks, often braced early. If you couldn't weight-bear at all, an X-ray to exclude fracture (Ottawa rules) is warranted." },
      { k:"chronic", label:"Chronic instability", sub:"Repeated sprains / the ankle keeps giving way", pick:/chronic|instability|recurrent/, scale:1.8,
        note:"Chronic instability needs a longer, balance-heavy programme; persistent giving-way despite good rehab warrants a surgical opinion." }],
    ph:[
      ["Protect & settle",0,1,"Control swelling and pain, restore comfortable walking.","swelling settling, weight-bearing comfortably, able to walk with little limp","Compression and elevation, keep moving within comfort. Protective taping/brace as needed."],
      ["Range, gait & early balance",1,3,"Restore full range and normal walking; start balance work.","full range, walking without a limp, able to stand on the leg","Start balance work early — this is the part that prevents re-injury."],
      ["Strength & proprioception",3,6,"Build peroneal strength and single-leg balance.","good single-leg balance (incl. eyes closed), strong resisted eversion, comfortable calf raises","Progress balance onto unstable surfaces and add hopping when comfortable."],
      ["Return to sport & agility",6,12,"Restore hopping, cutting and sport-specific agility.","confident hopping and cutting, balance and strength symmetrical","Keep doing balance work for months — and consider a brace/tape for high-risk sport for ~6–12 months."]] },
  { re:/plantar fasci|plantar heel|heel pain|fasciopathy/, label:"Plantar fasciitis (plantar heel pain)", total:26,
    freq:"Daily — stretching/loading most days plus footwear changes",
    note:"Typically takes 6–12 months to fully settle, but most improve much sooner with loading, calf stretching and footwear/orthotic support. First-step morning pain is the classic marker to track.",
    ph:[
      ["Settle & offload",0,4,"Reduce first-step pain and offload the fascia.","morning first-step pain reducing, comfortable walking short distances","Cushioned supportive shoes, avoid barefoot on hard floors, reduce (don't stop) walking/running volume."],
      ["Loading & calf flexibility",4,10,"Load the fascia and lengthen a tight calf.","morning pain notably reduced, tolerating heel raises","High-load plantar-fascia strengthening (heel raises with toes extended) 3×/week; stretch the calf daily."],
      ["Progressive strengthening",10,18,"Build foot and calf capacity to tolerate more.","comfortable on your feet most of the day, minimal morning pain","Increase standing/walking volume gradually — spikes cause flares."],
      ["Return to running & full activity",18,26,"Return to running/impact with a graded plan.","little or no morning pain, tolerating impact without a next-day flare","Build impact volume slowly. Persistent pain after 6+ months warrants review (imaging, injection, or a night splint)."]] },
  { re:/hamstring (strain|tear|pull|injury)|biceps femoris|pulled hamstring/, label:"Hamstring strain", total:8,
    freq:"Daily — hamstring work most days",
    note:"Re-injury rates are high (up to a third) — usually from returning too early. Eccentric strengthening (Nordics) and running progression are what protect you.",
    variants:[
      { k:"g1", label:"Grade I (mild)", sub:"Minimal strength loss, walking normally", pick:/grade (i|1)\b/, scale:0.45,
        note:"Grade I: typically 2–3 weeks, but still finish the eccentric and sprint progression — this is where re-injuries come from." },
      { k:"g2", label:"Grade II (moderate)", sub:"Partial tear, clear strength loss and limp", pick:/grade (ii|2)\b/, scale:1 },
      { k:"g3", label:"Grade III (severe)", sub:"Complete tear or proximal avulsion", pick:/grade (iii|3)\b|avulsion/, scale:2.6,
        note:"Grade III: 3+ months. Proximal (ischial) avulsions and complete tears warrant a surgical opinion, especially in athletes." }],
    ph:[
      ["Protect & gentle activation",0,1,"Settle bleeding and pain; gentle pain-free activation.","walking normally, pain-free gentle isometrics","Avoid stretching into pain and any sprinting. Compression early."],
      ["Range & progressive isometrics",1,2,"Restore length and start loading without pain.","full pain-free range, comfortable isometrics at increasing length","No explosive or high-speed work yet."],
      ["Eccentric strengthening & running",2,4,"Build eccentric strength and reintroduce running.","strong eccentric work (e.g. Nordics), pain-free jogging building to strides","Progress running speed gradually — most re-injuries happen at high speed."],
      ["Return to sprinting & sport",4,8,"Restore sprint speed and sport-specific loading.","pain-free maximal sprinting, eccentric strength near-symmetrical, confident at speed","Do not return to sport until you can sprint at full speed pain-free. Keep doing Nordics — they roughly halve re-injury risk."]] },
  { re:/calf (strain|tear)|gastrocnemius (strain|tear)|soleus strain|torn calf/, label:"Calf strain", total:8,
    freq:"Daily calf loading",
    note:"Calf strains re-injure easily if you return before the calf has real strength endurance. Heel-raise capacity is the key milestone.",
    variants:[
      { k:"g1", label:"Grade I (mild)", sub:"Tight, sore, walking normally", pick:/grade (i|1)\b/, scale:0.45 },
      { k:"g2", label:"Grade II (moderate)", sub:"Partial tear, limping, painful heel raise", pick:/grade (ii|2)\b/, scale:1 },
      { k:"g3", label:"Grade III (severe)", sub:"Complete tear, can't push off", pick:/grade (iii|3)\b/, scale:2.2,
        note:"Grade III: 3+ months. Sudden severe calf pain with an audible pop should be assessed to exclude an Achilles rupture — and calf swelling/pain can also be a DVT." },
      { k:"soleus", label:"Soleus strain", sub:"Deeper, lower calf — slower than gastrocnemius", pick:/soleus/, scale:1.5,
        note:"Soleus strains are typically slower and more stubborn than gastrocnemius tears; build heel-raise capacity with the knee bent too." }],
    ph:[
      ["Protect & settle",0,1,"Settle pain and swelling; walk comfortably.","walking without a limp, pain-free gentle isometrics","Avoid stretching into pain and explosive push-off. Compression and gentle movement."],
      ["Range & progressive loading",1,3,"Restore range and start progressive heel raises.","full range, comfortable double-leg heel raises","Build calf raises gradually; avoid speed work."],
      ["Strength endurance & jogging",3,5,"Build heel-raise capacity and reintroduce jogging.","single-leg heel raises approaching the other side, pain-free jogging","Single-leg heel-raise capacity is the gate to running."],
      ["Return to running & sport",5,8,"Restore speed, hopping and sport demands.","heel-raise endurance ≥90%, pain-free sprinting and hopping","Build speed and volume progressively — the calf is a common re-injury site."]] },
  { re:/groin (strain|pain)|adductor (strain|tendinop|injury)|athletic pubalgia|sports hernia|osteitis pubis/, label:"Groin / adductor injury", total:12,
    freq:"Daily adductor loading (Copenhagen-style progression)",
    note:"Adductor strengthening (the Copenhagen protocol) both treats and prevents groin injury. Long-standing groin pain is often multi-factorial and slow — 3+ months is common.",
    ph:[
      ["Settle & isometric loading",0,2,"Calm the irritable tissue, start pain-free isometrics.","comfortable walking, pain-free adductor squeeze","Avoid kicking, sprinting and cutting while it's irritable."],
      ["Progressive adductor strengthening",2,5,"Build adductor and trunk strength progressively.","strong pain-free adductor squeeze, tolerating side-lying adduction work","Introduce Copenhagen adduction gradually — it's demanding; start with short lever."],
      ["Strength, running & control",5,8,"Add running and multi-directional control.","pain-free jogging and change of direction, good adductor strength","Progress cutting and kicking gradually."],
      ["Return to sport",8,12,"Restore sprinting, cutting and kicking.","pain-free maximal sprinting, cutting and kicking; symmetrical adductor strength","Keep Copenhagen adduction in your programme — it substantially reduces recurrence."]] },
  { re:/tennis elbow|lateral epicondyl|common extensor|extensor tendinop/, label:"Tennis elbow (lateral epicondylalgia)", total:26,
    freq:"Daily loading — little and often",
    note:"This settles with progressive loading but is slow: 6–12 months is typical, and most recover regardless of treatment. Injections give short-term relief but WORSE long-term outcomes, so loading is the mainstay.",
    ph:[
      ["Settle & isometric loading",0,4,"Reduce pain and start pain-free isometric grip/wrist work.","grip pain reducing, comfortable isometric holds","Reduce (don't stop) aggravating gripping. Check technique/equipment and use a counterforce brace if it helps."],
      ["Progressive eccentric/heavy-slow loading",4,10,"Load the tendon progressively — the main driver.","tolerating progressive wrist extensor loading, pain settling within 24 hours","Load 3×/week; pain up to ~4/10 during exercise that settles is acceptable."],
      ["Strength & grip capacity",10,18,"Build grip strength and forearm capacity.","grip strength improving toward the other side, comfortable with daily gripping","Address the kinetic chain — shoulder and scapular strength matter."],
      ["Return to full loading & sport",18,26,"Restore full grip/loading and racquet or work demands.","grip strength near-symmetrical, comfortable with your sport/work loads","Gradual return; fix the technique or workload that caused it or it will recur."]] },
  { re:/golfer'?s elbow|medial epicondyl|common flexor/, label:"Golfer's elbow (medial epicondylalgia)", total:26,
    freq:"Daily loading — little and often",
    note:"Same principles as tennis elbow — progressive loading over months. Slower than people expect, but reliable.",
    ph:[
      ["Settle & isometric loading",0,4,"Reduce pain, start pain-free isometrics.","pain with gripping reducing, comfortable isometrics","Reduce aggravating gripping/twisting; check technique and grip size."],
      ["Progressive loading",4,10,"Load the flexor tendon progressively.","tolerating progressive wrist flexor/pronator loading","Load 3×/week; mild pain that settles within 24 hours is fine."],
      ["Strength & capacity",10,18,"Build grip and forearm strength.","grip strength improving, comfortable with daily tasks","Include shoulder/scapular strengthening."],
      ["Return to sport & full loading",18,26,"Restore full loading and sport demands.","grip near-symmetrical, comfortable with your sport/work","Address technique and load spikes to prevent recurrence."]] },
  { re:/patellofemoral|runner'?s knee|anterior knee pain|chondromalacia|patellar malalign/, label:"Patellofemoral pain", total:16,
    freq:"Daily home exercises + 1 supervised session/week",
    note:"Hip and quadriceps strengthening is the best-evidenced treatment; expect 6–12 weeks for meaningful change. Load management (reducing the aggravating volume, not stopping) matters as much as the exercises.",
    ph:[
      ["Settle & load management",0,2,"Calm the pain by adjusting load; start pain-free strengthening.","pain with stairs/sitting reducing, comfortable with daily walking","Reduce (don't stop) squatting, stairs and running volume to a tolerable level."],
      ["Hip & quadriceps strengthening",2,6,"Build hip abductor/external-rotator and quadriceps strength.","good hip and quad strength gains, less pain with stairs","Keep exercises in a pain-free or low-pain range; deep knee flexion under load may need limiting."],
      ["Progressive loading & control",6,12,"Load through more range with good movement control.","comfortable squatting and stairs, good single-leg control","Progress range and load as symptoms allow."],
      ["Return to running & sport",12,16,"Return to running/impact with a graded plan.","pain-free running build-up, strength near-symmetrical","Build volume ~10%/week; recurrence usually means load spiked again."]] },
  { re:/patellar tendinop|jumper'?s knee|patellar tendin|quadriceps tendinop/, label:"Patellar tendinopathy (jumper's knee)", total:24,
    freq:"Loading 3–4×/week, consistently",
    note:"A load-driven tendon problem — 3–6 months of progressive loading is typical. Complete rest makes it worse; the classic pattern is pain that warms up with activity and hurts most the next day.",
    ph:[
      ["Isometric loading & pain control",0,4,"Reduce pain with isometrics; manage jumping load.","pain settling, comfortable isometric holds (e.g. Spanish squat)","Cut jumping/change-of-direction volume; isometrics can give real short-term pain relief."],
      ["Heavy-slow resistance",4,10,"Load the tendon heavily and slowly — the main driver.","tolerating heavy-slow squats/leg press, pain settling within 24 hours","Load 3×/week with slow tempo; pain ≤4/10 that settles is acceptable."],
      ["Energy storage & plyometrics",10,16,"Reintroduce spring loading to prepare for sport.","tolerating jumping and landing without a next-day flare","Progress plyometrics gradually — monitor next-morning pain."],
      ["Return to sport",16,24,"Restore full jumping/cutting demands.","full jumping and landing tolerance, symmetrical strength","Keep a maintenance loading programme — this recurs when loading stops."]] },
  { re:/gluteal tendinop|greater trochanteric|trochanteric bursitis|\bgtps\b|lateral hip pain/, label:"Gluteal tendinopathy (lateral hip pain)", total:24,
    freq:"Daily — most days of the week",
    note:"Education plus progressive abductor loading beats injection at 12 months. The biggest win is removing compression — avoid sitting cross-legged, standing hanging on one hip, and side-lying on the painful side.",
    ph:[
      ["Reduce compression & isometrics",0,4,"Take compression off the tendon; start isometric abduction.","night pain reducing, comfortable isometric abduction","Avoid crossing your legs, 'hanging' on one hip when standing, and lying on the sore side (use a pillow between the knees)."],
      ["Progressive abductor loading",4,10,"Build glute medius/minimus strength progressively.","tolerating progressive abduction loading, less pain lying and walking","Keep the hip out of adduction (don't cross the midline) while loading."],
      ["Functional strengthening",10,16,"Load in standing and functional positions.","comfortable single-leg stance and walking, good abductor strength","Progress single-leg loading gradually."],
      ["Return to full activity",16,24,"Restore walking/stair/running capacity.","pain-free walking and stairs, symmetrical abductor strength","Slow and steady — this tendon flares with sudden load increases."]] },
  { re:/lumbar (disc|radiculopathy|herniat|prolapse)|sciatica|slipped disc|disc (herniat|prolapse|bulge)|nerve root/, label:"Lumbar disc / sciatica", total:26,
    freq:"Little and often — several short sessions daily",
    note:"Most disc-related leg pain resolves without surgery: ~50% improve by 6 weeks and most by 3 months. Leg pain moving OUT of the leg and toward the back ('centralisation') is a good sign. Progressive weakness or bladder/bowel changes need urgent review.",
    variants:[
      { k:"standard", label:"Standard (non-surgical)", sub:"Leg pain, no significant weakness", scale:1 },
      { k:"weakness", label:"With nerve weakness", sub:"Foot drop or clear muscle weakness", scale:1.3,
        note:"With real motor weakness (e.g. foot drop) you need medical review — most still recover without surgery, but progressive weakness is a surgical indication and shouldn't be watched indefinitely." },
      { k:"postop", label:"After microdiscectomy", sub:"Disc surgery already done", pick:/discectomy|laminectomy/, scale:0.85,
        note:"After microdiscectomy leg pain usually settles quickly; avoid heavy lifting and repeated bending for ~6 weeks, then build back progressively — early graded activity gives better outcomes than prolonged rest." },
      { k:"stenosis", label:"Spinal stenosis pattern", sub:"Leg pain on walking, eased by sitting/bending", pick:/stenosis|claudication/, scale:1.5,
        note:"Stenosis behaves differently to a disc: symptoms come on with walking/standing and ease with sitting or leaning forward. Flexion-based exercise and cycling are usually better tolerated than extension." }],
    ph:[
      ["Settle & find your directional preference",0,2,"Reduce leg pain; find positions/movements that centralise it.","leg pain centralising (moving out of the leg toward the back), able to walk short distances","Avoid prolonged sitting and loaded bending early. Keep moving — bed rest makes it worse."],
      ["Restore movement & nerve mobility",2,6,"Restore comfortable movement and nerve glide.","leg pain mostly gone or centralised, walking comfortably, sitting tolerance improving","Progress gently; brief symptom increases that settle are OK, worsening leg pain is not."],
      ["Progressive strengthening",6,12,"Build trunk, hip and leg strength and load tolerance.","minimal leg symptoms, tolerating bending and lifting practice","Reintroduce loaded bending/lifting gradually — the back is robust and needs loading."],
      ["Return to full activity & prevention",12,26,"Restore full capacity for work, lifting and sport.","confident with lifting and your activities, symptoms settled","Ongoing exercise is the best prevention. Persistent or progressive weakness warrants a surgical opinion."]] },
  { re:/low back pain|lumbago|lumbar strain|mechanical back|back strain|facet/, label:"Low back pain", generic:true, total:12,
    freq:"Daily movement + strengthening 3×/week",
    note:"Most episodes settle substantially within 6 weeks. Staying active and returning to normal activity early gives the best outcome — imaging rarely changes management in the absence of red flags.",
    variants:[
      { k:"acute", label:"Acute episode", sub:"New or recent flare-up (under ~6 weeks)", scale:1 },
      { k:"recurrent", label:"Recurrent", sub:"Keeps coming back every few months", scale:1.4,
        note:"For recurrent back pain the goal shifts to building capacity and managing load between episodes — the strength and habit work is the prevention." },
      { k:"persistent", label:"Persistent (3+ months)", sub:"Long-standing pain", pick:/chronic|persistent/, scale:2,
        note:"Persistent back pain is driven as much by sensitisation, sleep, stress and fear of movement as by tissue — graded exposure to the movements you avoid, plus pacing, matter more than any single exercise." }],
    ph:[
      ["Settle & keep moving",0,2,"Reduce pain while staying as active as you can.","pain settling, able to do most daily activities, sleeping better","Avoid bed rest. Keep walking and moving little and often; brief pain with movement is not damage."],
      ["Restore movement & confidence",2,5,"Restore comfortable movement in all directions.","comfortable bending and moving, back to most normal activity","Gradually reintroduce the movements you've been avoiding."],
      ["Strengthening & load tolerance",5,9,"Build trunk, hip and general strength.","tolerating lifting and loading, minimal daily symptoms","Progressive loading builds a more robust back — some discomfort is fine."],
      ["Return to full activity & prevention",9,12,"Restore full work/sport capacity and keep it.","confident with your full activities","Recurrence is common — ongoing exercise and load management are the best protection."]] },
  { re:/cervical radiculopathy|neck pain|whiplash|cervical (strain|spondyl|disc)|wry neck/, label:"Neck pain / cervical radiculopathy", total:12,
    freq:"Little and often — several short sessions daily",
    note:"Most neck pain and cervical radiculopathy improve without surgery — arm pain from a nerve root usually settles over 6–12 weeks. Staying active and deep neck flexor training beat collars and rest.",
    ph:[
      ["Settle symptoms",0,2,"Reduce neck/arm pain and restore comfortable movement.","pain settling, arm symptoms reducing, sleeping better","Avoid collars and prolonged rest. Keep gentle movement going; avoid sustained end-range positions."],
      ["Restore range & deep neck flexors",2,5,"Regain range and activate the deep neck flexors.","near-full range, comfortable with daily activity, arm symptoms centralising","Progress gently — brief symptom increases that settle are OK."],
      ["Strengthening & posture endurance",5,9,"Build neck/scapular strength and endurance.","tolerating desk work and daily loads, minimal symptoms","Address workstation setup and take regular movement breaks."],
      ["Return to full activity",9,12,"Restore full capacity for work and sport.","confident with your activities, symptoms settled","Progressive weakness or worsening arm symptoms should be reviewed."]] },
  { re:/distal radius|colles|wrist fracture|smith'?s fracture/, label:"Distal radius (wrist) fracture", total:24,
    freq:"Short sessions several times daily",
    note:"Bone union takes ~6 weeks, but stiffness and grip strength take much longer — full recovery is often 6–12 months. Finger, elbow and shoulder movement during immobilisation prevents a lot of trouble.",
    ph:[
      ["Immobilisation — protect the fracture",0,6,"Protect the bone while keeping everything else moving.","fracture healing on review, full finger/elbow/shoulder movement maintained","Cast/splint as directed. Move your fingers, elbow and shoulder daily — stiffness here is a common avoidable problem. No weight-bearing through the wrist."],
      ["Restore wrist range",6,9,"Regain wrist and forearm motion once out of the cast.","improving wrist flexion/extension and rotation, swelling settling","Gentle active range first; the bone is united but not yet at full strength."],
      ["Strengthening",9,16,"Rebuild grip and wrist strength.","grip strength improving toward the other side, functional daily use","Progressive loading; expect stiffness to be slow to resolve."],
      ["Return to full function",16,24,"Restore full strength, loading and activity.","grip and range approaching the other side, comfortable with your activities","Full recovery commonly takes 6–12 months; some end-range stiffness may persist."]] },
  { re:/carpal tunnel/, label:"Carpal tunnel syndrome", total:12,
    freq:"Daily nerve-glides + night splinting",
    note:"Night splinting and nerve gliding help mild-to-moderate cases; persistent numbness, weakness or thenar wasting is a reason for a surgical opinion, since prolonged compression can cause lasting nerve damage.",
    ph:[
      ["Settle night symptoms",0,3,"Reduce night waking and numbness.","fewer night wakings, less numbness on waking","Night splint in neutral; avoid sustained gripping/vibration and wrist-flexed sleeping."],
      ["Nerve gliding & ergonomics",3,6,"Restore nerve mobility and reduce provocation.","numbness reducing during the day, comfortable with daily tasks","Nerve glides should not increase symptoms — gentle is the rule."],
      ["Strength & function",6,9,"Rebuild grip and pinch strength.","grip/pinch improving, minimal daytime symptoms","Progress loading as symptoms allow."],
      ["Return to full use",9,12,"Restore full hand function.","symptoms settled, strength near-normal","Constant numbness, weakness or muscle wasting warrants a surgical opinion — decompression is very effective."]] },
  { re:/stroke|\bcva\b|cerebrovascular accident|hemipleg|hemipar/, label:"Stroke rehabilitation", total:52,
    freq:"Little and often, every day — repetition drives recovery",
    note:"Recovery is fastest in the first 3 months but continues for years — the brain stays plastic. Intensity and repetition are what drive change: high-repetition, task-specific practice beats passive treatment.",
    variants:[
      { k:"mild", label:"Mild", sub:"Walking independently, mild weakness", scale:0.5,
        note:"Milder strokes progress faster — push intensity and dose, and target the specific tasks and fine control you want back." },
      { k:"moderate", label:"Moderate", sub:"Needs some help with mobility or the arm", scale:1 },
      { k:"severe", label:"Severe", sub:"Dependent for transfers/mobility", scale:1.5,
        note:"With severe stroke the early focus is safe transfers, positioning, preventing complications (shoulder pain, contracture, pressure areas) and carer training, alongside task practice." },
      { k:"posterior", label:"Cerebellar / balance-dominant", sub:"Ataxia and coordination rather than weakness", scale:1.2,
        note:"Cerebellar strokes present with ataxia and coordination loss rather than weakness — balance, coordination and gaze/vestibular work take priority over strengthening." }],
    ph:[
      ["Early rehabilitation",0,4,"Safe mobility and transfers; start task practice early.","safe transfers and sitting balance, beginning task-specific practice","Falls risk is high — work with your team. Protect a weak/subluxed shoulder; support it and avoid pulling on the arm."],
      ["Intensive task-specific practice",4,12,"High-repetition practice of the tasks you need.","improving sitting/standing balance, walking with the least support you safely can, using the affected arm in tasks","Repetition matters — aim for many quality repetitions. Avoid over-using the good side only ('learned non-use')."],
      ["Strength, walking & arm function",12,26,"Build strength, walking capacity and hand/arm function.","walking further and more independently, improving arm/hand use in daily tasks","Keep pushing task-specific practice; spasticity and fatigue need managing alongside."],
      ["Community reintegration & maintenance",26,52,"Restore community mobility, endurance and daily roles.","independent or assisted community mobility, meaningful daily activity","Recovery continues well past a year — keep training. Manage stroke risk factors (BP, lipids, AF, diabetes) as a priority."]] },
  { re:/myocardial infarction|heart attack|\bcabg\b|coronary artery bypass|\bpci\b|coronary stent|angioplasty|acute coronary|angina|cardiac rehab|heart failure|cardiomyopath|\bhfref\b|\bhfpef\b|valve (repair|replacement)/, label:"Cardiac rehabilitation", total:26,
    freq:"Aerobic exercise most days (aim ≥150 min/week) + resistance 2–3×/week",
    note:"Cardiac rehab reduces cardiovascular mortality and re-hospitalisation — it's one of the most effective things you can do. Programmes are supervised and progress by symptoms and perceived exertion, not just heart rate (especially on beta-blockers).",
    variants:[
      { k:"pci", label:"After a heart attack / stent", sub:"Post-MI or PCI, no chest surgery", scale:0.85,
        note:"After PCI/stenting there's no chest wound to protect, so activity can build sooner — most start structured rehab within 1–2 weeks." },
      { k:"cabg", label:"After bypass surgery (CABG)", sub:"Sternotomy — chest precautions apply", pick:/cabg|bypass/, scale:1,
        note:"After bypass the breastbone needs ~8 weeks to heal: sternal precautions apply (no pushing/pulling/lifting over ~2–4 kg, no arms overhead loaded, brace the chest when coughing)." },
      { k:"valve", label:"After valve surgery", sub:"Valve repair/replacement via sternotomy", pick:/valve/, scale:1.05,
        note:"Valve surgery follows the same sternal timeline; if you're on warfarin, take extra care with falls and contact." },
      { k:"hf", label:"Heart failure", sub:"Reduced ejection fraction — chronic management", pick:/heart failure|cardiomyopath/, scale:1.2,
        note:"In heart failure, exercise genuinely improves symptoms and admissions — but build slowly, track daily weight, and report a gain over ~2 kg in 2–3 days or new swelling/breathlessness." }],
    ph:[
      ["Early mobilisation (inpatient)",0,1,"Safe early activity and education.","walking short distances comfortably, understanding your warning symptoms","Very light activity only. STOP for chest pain, unusual breathlessness, dizziness or palpitations and seek help."],
      ["Early outpatient recovery",1,6,"Rebuild everyday activity safely; start structured aerobic work.","comfortable walking 10–20 min, no angina with light activity, wound healed if operated","Stay at RPE 11–13 ('light to somewhat hard'). Sternal precautions apply for ~8 weeks after bypass surgery."],
      ["Supervised aerobic & resistance training",6,14,"Build aerobic capacity and strength in a supervised programme.","30+ min of continuous moderate aerobic exercise, resistance training tolerated, no symptoms","Progress gradually under supervision; report any new chest symptoms immediately."],
      ["Long-term maintenance",14,26,"Make it a lifelong habit and manage risk factors.","≥150 min/week of moderate activity sustained, risk factors being managed","The benefit only lasts while the exercise does — maintenance is the whole point."]] },
  { re:/\bcopd\b|emphysema|chronic bronchitis|pulmonary rehab|pulmonary fibrosis|interstitial lung|bronchiectasis|\bild\b/, generic:true, label:"Pulmonary rehabilitation", total:12,
    freq:"Supervised sessions 2–3×/week + home walking on other days",
    note:"Pulmonary rehab is one of the most effective treatments in respiratory medicine — it improves breathlessness, exercise capacity and quality of life more than most drugs. Breathlessness during exercise is expected and not dangerous.",
    ph:[
      ["Assessment & gentle start",0,2,"Establish a safe baseline and learn breathing control.","comfortable with a baseline walking distance, using pursed-lip breathing","Being breathless is expected and safe — aim for a breathlessness score of 3–4/10. Use your reliever inhaler before exercise if prescribed."],
      ["Building aerobic capacity",2,6,"Increase walking/cycling endurance with interval work.","walking further before stopping, recovering more quickly","Interval training (walk/rest) is a good option if continuous work is too breathless."],
      ["Strength & endurance",6,10,"Add resistance work and build endurance.","improved walking distance, tolerating resistance training","Include arm work — it helps daily tasks but can be more breathless."],
      ["Maintenance & self-management",10,12,"Lock in gains and build a self-management plan.","sustained improvement in walking distance, confident with your action plan","Gains fade within 6–12 months if you stop — an ongoing programme is essential."]] },
  { re:/fracture|broken (bone|arm|leg|wrist|ankle)/, label:"Fracture recovery", generic:true, total:20,
    freq:"Short sessions several times daily while immobilised, then 4–5/week",
    note:"Bone union typically takes ~6–8 weeks (longer in the lower limb, in smokers, and with diabetes), but restoring strength and function takes considerably longer. Follow your weight-bearing status exactly.",
    variants:[
      { k:"ue", label:"Upper-limb fracture", sub:"Arm, wrist or hand", pick:/(wrist|radius|ulna|humer|clavic|scaphoid|hand|finger|elbow|shoulder|arm)/, scale:0.85,
        note:"Upper-limb fractures usually unite in ~6 weeks; the bigger battle is stiffness — keep every joint you're allowed to move, moving." },
      { k:"le", label:"Lower-limb fracture", sub:"Leg, ankle or foot", pick:/(ankle|tibia|fibula|femur|foot|toe|metatarsal|calcane|patella|leg|hip)/, scale:1.15,
        note:"Lower-limb fractures take longer and weight-bearing status is everything — follow it exactly, and expect strength and confidence to lag well past union." },
      { k:"stress", label:"Stress fracture", sub:"Overuse fracture, no trauma", pick:/stress fracture/, scale:0.9,
        note:"Stress fractures are a load problem: relative rest then a graded return, plus fixing the cause (training spikes, low energy availability, bone health, footwear). High-risk sites (femoral neck, anterior tibia, navicular) need specialist input." },
      { k:"delayed", label:"Delayed / slow union", sub:"Not healing on schedule", scale:1.6,
        note:"Delayed union needs medical review — smoking, poor nutrition, diabetes, NSAIDs and inadequate immobilisation all slow bone healing." }],
    ph:[
      ["Protected healing",0,6,"Protect the bone; keep neighbouring joints and the rest of you moving.","fracture healing on review/X-ray, neighbouring joints staying mobile","Follow your cast/brace and weight-bearing status exactly. Move the joints above and below to prevent stiffness."],
      ["Restore range",6,9,"Regain motion once the fracture is united.","union confirmed, range improving, swelling settling","Gentle progressive range work — the bone is united but still remodelling."],
      ["Progressive strengthening",9,14,"Rebuild strength and load tolerance.","strength improving, normal daily function returning","Load progressively; bone gets stronger with graded loading."],
      ["Return to full activity",14,20,"Restore full strength and return to your activities.","strength approaching the other side, confident with your activities","Impact and sport only once cleared — the bone remodels for months after union."]] }
];
/* ---------- plan variations ----------
   One protocol per condition is still a simplification: real pathways differ by
   grade/severity, surgical approach, tear size and how fast someone is safely
   progressing. Every plan therefore offers several variations. Plans without
   their own `variants` fall back to these pace options. `scale` stretches the
   phase week-boundaries (so the phases stay contiguous and the total follows). */
/* Cross-cutting options, appended to EVERY plan's variation list by
   planVariants() — including curated plans that already define their own — so a
   plan's clinical axis (grade, approach, graft) and the person's context both
   stay selectable. The `pick` patterns mirror the context stratifications the
   condition catalogue generates ("— older adult (bone & fall aware)",
   "— return-to-sport focus", "— hypermobility-aware", …), so those conditions
   auto-select the right variation instead of defaulting to Standard. */
const XCUT_VARIANTS = [
  { k:"athlete", label:"Return-to-sport focus", sub:"Competitive sport is the goal", pick:/return-to-sport|athlet/i, scale:1.15,
    note:"Returning to sport needs more than being pain-free: strength within ~10% of the other side and passing sport-specific testing. The extra weeks are the return-to-sport phase, not extra healing." },
  { k:"work", label:"Return-to-work focus", sub:"Getting back to job demands", pick:/return-to-work|ergonomic/i, scale:1.05,
    note:"Match the plan to your actual job demands — lifting, sustained postures or repetition — and fix the ergonomics, or it returns with the work." },
  { k:"older", label:"Older adult", sub:"Slower healing; bone & falls matter too", pick:/older adult|bone & fall|elderly/i, scale:1.25,
    note:"Tissue heals more slowly with age and strength is lost faster during rest — so this runs longer, and balance and bone-loading work get ADDED rather than dropped." },
  { k:"decond", label:"Deconditioned / low fitness", sub:"Starting from a low base", pick:/deconditioned|low fitness/i, scale:1.3,
    note:"From a low base, build general capacity alongside the injured area, and expect the first few weeks to feel disproportionately hard — that settles." },
  { k:"irritable", label:"Highly irritable / pain-dominant", sub:"Flares very easily", pick:/high-irritability|pain-dominant/i, scale:1.3,
    note:"When symptoms flare easily, start lower and progress in smaller steps — boom-and-bust sets you back further than a slow, steady start." },
  { k:"postimmob", label:"Post-immobilisation reconditioning", sub:"Just out of a cast, boot or sling", pick:/post-immobili/i, scale:1.2,
    note:"After immobilisation expect marked stiffness and muscle loss: range first, then load. The tissue is deconditioned, so progress in small increments." },
  { k:"hypermobile", label:"Hypermobility-aware", sub:"Very flexible joints", pick:/hypermobil/i, scale:1.25,
    note:"With hypermobile joints do NOT chase more range — you already have plenty. Strength, mid-range control and proprioception are the targets, and progress is usually slower." },
  { k:"home", label:"Home-based (minimal equipment)", sub:"No gym access", pick:/home-based|minimal equipment/i, scale:1.05,
    note:"Bodyweight, bands and household objects load tissue perfectly well — progress by adding reps, slowing the tempo or moving to single-limb versions instead of adding weight." },
  { k:"gym", label:"Gym-based progression", sub:"Full equipment available", pick:/gym-based/i, scale:0.95,
    note:"With machines and free weights you can load and measure precisely — progress by measurable increments rather than by feel." },
  { k:"slowheal", label:"Slower healing expected", sub:"Diabetes, smoking or steroids", pick:/diabet|smoker/i, scale:1.4,
    note:"Diabetes, smoking, corticosteroids and poor nutrition measurably slow healing. Stopping smoking is the single biggest thing you can change here." }
];
const PACE_VARIANTS = [
  { k:"standard", label:"Standard", sub:"The usual criteria-based pathway", scale:1 },
  { k:"accelerated", label:"Accelerated", sub:"Younger/fitter, progressing excellently, well supervised", scale:0.75,
    note:"Accelerated: only appropriate if you're progressing excellently with good control and no swelling — tissue biology doesn't speed up, so the criteria still decide, not the dates." },
  { k:"conservative", label:"Conservative", sub:"Slower healer, complications, or extra caution", scale:1.35,
    note:"Conservative: a slower pathway suits complications, other injuries alongside, older age, smoking or diabetes — all of which genuinely slow tissue healing." },
  ...XCUT_VARIANTS
];
/* A plan's own list (its clinical axis — grade, approach, graft type) PLUS the
   cross-cutting context options, so both stay selectable. Deduped by key, since
   the generated plans already carry the cross-cutting set in their data. */
function planVariants(plan){
  const own = plan && plan.variants;
  if(!own || !own.length) return PACE_VARIANTS;
  const have = new Set(own.map(v=>v.k));
  return own.concat(XCUT_VARIANTS.filter(v=>!have.has(v.k)));
}
/* The user's explicit choice wins; otherwise infer the variation from the
   diagnosis itself (e.g. "Hamstring strain (grade II)" → Grade II, "Revision
   knee replacement" → revision), falling back to the first option. */
function selectedVariant(plan, cond){
  if(!plan) return null;
  const list = planVariants(plan);
  const chosen = list.find(v=>v.k === (state.planVariant||{})[plan.label]);
  if(chosen) return chosen;
  // infer from the diagnosis — the LONGEST match wins, so "tibia stress fracture"
  // resolves to the stress-fracture variant rather than the generic lower-limb one
  const name = ((cond && cond.name) || "").toLowerCase();
  let best=null, bestLen=0;
  for(const v of list){
    if(!v.pick) continue;
    const m = name.match(v.pick);
    if(m && m[0].length > bestLen){ best=v; bestLen=m[0].length; }
  }
  if(best) return best;
  // the diagnosis said nothing — infer from the MEDICAL HISTORY they actually gave
  // us, in order of how strongly each factor changes the timeline.
  const want = historyVariantKeys(cond);
  for(const k of want){ const v = list.find(x=>x.k===k); if(v) return v; }
  return list[0];
}
/* Which variation the user's history implies, most-decisive first. Only used when
   the diagnosis itself doesn't name a variation. */
function historyVariantKeys(cond){
  const keys = [];
  const surg = detectSurgery();
  const sname = ((surg&&surg.name)||"").toLowerCase();
  const meds = new Set(selectedMeds().flatMap(m=>m.flags||[]));
  const flags = new Set(state.flags||[]);
  // surgical invasiveness — an open procedure genuinely heals slower than keyhole
  if(/arthroscop|keyhole|laparoscop|percutaneous|robotic|minimally invasive|endoscopic/.test(sname)) keys.push("keyhole");
  else if(/\bopen\b|mini-?open|sternotom|laparotom|thoracotom/.test(sname)) keys.push("open");
  if(/revision|complex|redo/.test(sname)) keys.unshift("revision");
  // Systemic healing-slowers (diabetes / smoking / steroids / alcohol / CKD / cancer / PAD / high
  // BMI) now feed healingScale() in applyVariant, which STACKS them multiplicatively — so they no
  // longer collapse into a single flat "slowheal" variant here (slowheal stays user-selectable).
  // falls / balance history and age → the older-adult pathway (adds balance & bone work)
  if(state.falls==="2" || (state.aid && state.aid!=="none") || Number(state.age)>=70) keys.push("older");
  // baseline fitness
  if(state.fitness==="low") keys.push("decond");
  if(state.fitness==="high" && Number(state.age)<40 && state.painMove<=3) keys.push("accelerated");
  // irritability — from what they're logging if they are, else intake
  const _ep = effectivePain();
  if(_ep.v>=7 || Number(state.painRest)>=6) keys.push("irritable");
  if(flags.has("hypermobility")) keys.push("hypermobile");
  if((state.returnSports||[]).length) keys.push("athlete");
  // newly asked answers, each driving a pathway that already existed
  if(state.priorEpisodes==="recurrent") keys.unshift("recurrent");
  if(state.sleep==="lt6" || state.stress==="high") keys.push("irritable");
  if(state.moveConfidence==="fearful") keys.push("irritable");
  if(["manual","heavy"].includes(state.workDemand)) keys.push("work");
  if(state.equipment==="gym") keys.push("gym");
  if(["none","bands"].includes(state.equipment)) keys.push("home");
  return keys;
}
/* Stretch/compress the phase boundaries by `scale`, keeping them contiguous and
   never zero-length. Boundaries are scaled (not each phase separately) so the
   windows stay joined up. */
function scalePlanPhases(ph, scale){
  const bounds = [ph[0][1], ...ph.map(f=>f[2])];
  const sc = bounds.map(b=>Math.round(b*scale));
  sc[0] = bounds[0];                                          // keep the start anchored
  for(let i=1;i<sc.length;i++) if(sc[i] <= sc[i-1]) sc[i] = sc[i-1]+1;
  return ph.map((f,i)=>[f[0], sc[i], sc[i+1], f[3], f[4], f[5]]);
}
/* Systemic factors that slow TISSUE HEALING (distinct from the pacing/context variants). Each
   multiplies the whole recovery timeline a little, so they COMPOUND — a diabetic smoker on
   steroids runs longer than any one of those alone — capped at 1.6x. Evidence-informed and
   deliberately conservative; the clinician can tune the magnitudes below. Age is handled by the
   `older` variant, not here, so the two don't double-count. */
function healingScale(){
  const meds = new Set(selectedMeds().flatMap(m=>m.flags||[]));
  const flags = new Set(state.flags||[]);
  const bmi = bmiCalc((state.vitals||{}).height, (state.vitals||{}).weight);
  const F = [
    [flags.has("diabetes"),           1.15, "diabetes"],
    [state.smoking==="current",       1.15, "current smoking"],
    [meds.has("corticosteroid"),      1.10, "long-term corticosteroids"],
    [flags.has("ckd"),                1.10, "chronic kidney disease"],
    [flags.has("cancer_treatment"),   1.15, "active cancer treatment"],
    [flags.has("pad"),                1.10, "poor circulation (PAD)"],
    [state.alcohol==="heavy",         1.05, "heavy alcohol use"],
    [Number.isFinite(bmi) && bmi>=35, 1.08, "a high BMI"],
  ];
  let s = 1; const factors = [];
  for(const [on, mult, label] of F) if(on){ s *= mult; factors.push(label); }
  return { scale: Math.min(s, 1.6), factors };
}
/* Resolve a base plan + chosen variation into the plan actually used. */
function applyVariant(plan, v){
  if(!plan) return null;
  let ph = (v && v.ph) ? v.ph
    : (v && v.scale && v.scale!==1) ? scalePlanPhases(plan.ph, v.scale)
    : plan.ph;
  /* Stack comorbidity healing time ON TOP of the clinical/context variant, so multiple
     healing-slowing factors compound the recovery length instead of only the strongest one. */
  const hs = healingScale();
  if(hs.scale > 1) ph = scalePlanPhases(ph, hs.scale);
  const healNote = hs.factors.length
    ? ` Your recovery timeline is extended (~${Math.round((hs.scale-1)*100)}% longer) because ${hs.factors.join(", ")} slow tissue healing — the phase weeks below already account for this.`
    : "";
  return { ...plan, ph, total: ph[ph.length-1][2],
    note: plan.note + (v && v.note ? " " + v.note : "") + healNote,
    freq: (v && v.freq) || plan.freq,
    variant: v ? { k:v.k, label:v.label, sub:v.sub } : null,
    variantList: planVariants(plan).map(x=>({ k:x.k, label:x.label, sub:x.sub })) };
}
function setPlanVariant(label, k){
  state.planVariant = state.planVariant || {};
  state.planVariant[label] = k;
  save();
  state.program = generateProgram(); save();
  renderProgram(state.program);
}
/* ---------- domain fallback timelines ----------
   The last resort, so EVERY condition gets a real phased timeline with
   milestones and restrictions rather than the flat template. Only used when no
   curated or generated plan matches; always `generic:true`. */
const DOMAIN_FALLBACK = {
  msk: { label:"Musculoskeletal injury", generic:true, total:16,
    freq:"Most days — little and often beats occasional long sessions",
    note:"Tissue heals in stages: protect it briefly, restore movement, then load it progressively. Load is what rebuilds strength — prolonged rest weakens tissue. Some discomfort during exercise that settles within 24 hours is acceptable; pain that's worse the next morning means you did too much.",
    variants:[
      { k:"acute", label:"Acute (recent)", sub:"Injured in the last few weeks", pick:/acute|recent|early/i, scale:1 },
      { k:"subacute", label:"Settling", sub:"Past the early stage, still limited", scale:1.1 },
      { k:"chronic", label:"Long-standing", sub:"Months of symptoms", pick:/chronic|persistent|long-?standing|recurrent/i, scale:1.6,
        note:"Long-standing problems need consistent progressive loading over months, plus attention to sleep, stress and total load — not more rest." },
      { k:"postop", label:"After surgery", sub:"Operated on recently", pick:/post-?op|repair|reconstruct|surgery|surgical/i, scale:1.5,
        note:"After surgery your surgeon's protocol overrides everything here — especially the early range and weight-bearing limits, which protect the repair." }],
    ph:[
      ["Protect & settle", 0, 2, "Calm pain and swelling while keeping gentle movement going.",
       "pain and swelling settling, moving the area comfortably through most of its range",
       "Relative rest — reduce the aggravating load, but don't stop moving. Complete rest stiffens joints and weakens tissue."],
      ["Restore movement", 2, 6, "Rebuild full pain-free range and re-activate the muscles.",
       "full or near-full pain-free range, able to activate the muscles without a flare",
       "Work up to the edge of discomfort, not through sharp pain."],
      ["Progressive loading", 6, 12, "Load the tissue progressively — the main driver of recovery.",
       "loading with good control, soreness staying low and settling within 24 hours",
       "Increase load by roughly 10% a week. Soreness that lingers into the next morning means back off a level."],
      ["Return to full activity", 12, 16, "Restore strength, capacity and your specific demands.",
       "strength close to the other side, handling your work/sport demands without symptoms",
       "Build back gradually and keep a maintenance routine — most recurrences follow a sudden spike in load."]] },
  neuro: { label:"Neurological rehabilitation", generic:true, total:39,
    freq:"Daily — repetition and intensity are what drive neurological recovery",
    note:"Neurological recovery is driven by high-repetition, task-specific practice — the nervous system adapts to what you practise. Progress is usually fastest early but continues for a long time. Fatigue and safety (falls) need managing alongside.",
    variants:[
      { k:"mild", label:"Mild", sub:"Independent, mild impairment", pick:/mild|early/i, scale:0.6 },
      { k:"moderate", label:"Moderate", sub:"Needs some help", scale:1 },
      { k:"severe", label:"Severe", sub:"Dependent for mobility/transfers", pick:/severe|advanced|complete/i, scale:1.4,
        note:"With severe impairment the early priorities are safe transfers, positioning, preventing complications (contracture, pressure areas, shoulder pain) and carer training, alongside task practice." },
      { k:"progressive", label:"Progressive condition", sub:"A condition expected to progress", pick:/progressive|multiple sclerosis|parkinson|motor neuron|\bals\b|dystroph/i, scale:1.6,
        note:"With a progressive condition the goal is maintaining function and independence and managing fatigue — pace carefully and avoid exhausting sessions, which can set you back for days." }],
    ph:[
      ["Early rehabilitation & safety", 0, 4, "Establish safe movement and transfers, and start task practice early.",
       "safe transfers and sitting balance, beginning task-specific practice",
       "Falls risk is high — work with your team. Protect a weak limb (support a heavy arm; don't pull on it) and watch skin where sensation is reduced."],
      ["Task-specific practice", 4, 12, "High-repetition practice of the tasks you actually need.",
       "improving balance and mobility, using the affected side in real tasks",
       "Repetition is the medicine — aim for many quality repetitions. Avoid relying only on your strong side ('learned non-use')."],
      ["Strength, mobility & endurance", 12, 26, "Build strength, walking capacity and limb function.",
       "walking further and more independently, better arm/hand use in daily tasks",
       "Manage fatigue and tone alongside the training; pace across the day rather than one long session."],
      ["Community reintegration & maintenance", 26, 39, "Restore community mobility, endurance and daily roles.",
       "independent or assisted community mobility, meaningful daily activity",
       "Recovery continues for a long time — keep training. Manage the underlying risk factors with your medical team."]] },
  cardiac: { label:"Cardiac rehabilitation", generic:true, total:26,
    freq:"Aerobic exercise most days (build toward 150 min/week) + resistance 2–3×/week",
    note:"Exercise-based cardiac rehab reduces cardiovascular deaths and re-hospitalisation — it's one of the most effective treatments available. Progress by symptoms and perceived exertion rather than heart rate alone, especially on a beta-blocker.",
    variants:[
      { k:"standard", label:"Standard", sub:"Usual supervised pathway", scale:1 },
      { k:"postop", label:"After chest surgery", sub:"Sternotomy — chest precautions apply", pick:/surgery|surgical|sternotom|bypass|\bcabg\b|valve/i, scale:1.1,
        note:"After a sternotomy the breastbone needs ~8 weeks: no pushing/pulling/lifting over ~2–4 kg, no loaded arms overhead, and brace your chest when coughing." },
      { k:"hf", label:"Heart failure", sub:"Reduced pumping function", pick:/heart failure|cardiomyopath|\bhfref\b/i, scale:1.2,
        note:"In heart failure exercise genuinely improves symptoms and admissions — build slowly, weigh yourself daily, and report a gain over ~2 kg in 2–3 days or new swelling/breathlessness." },
      { k:"device", label:"With a pacemaker/ICD", sub:"Implanted cardiac device", pick:/pacemaker|\bicd\b|defibrillator|\bcrt\b/i, scale:1.1,
        note:"With an ICD, keep your heart rate at least ~20 bpm below the therapy threshold and avoid maximal efforts; after implant avoid raising that arm above shoulder height for ~6 weeks." }],
    ph:[
      ["Early mobilisation", 0, 2, "Re-establish safe everyday activity and learn your warning symptoms.",
       "walking short distances comfortably, confident about which symptoms mean stop",
       "STOP and seek help for chest pain or pressure, unusual breathlessness, dizziness, fainting or palpitations. Very light activity only at this stage."],
      ["Early outpatient recovery", 2, 6, "Rebuild daily activity and start structured aerobic work.",
       "comfortable walking 10–20 minutes, no symptoms with light activity",
       "Keep effort at RPE 11–13 ('light' to 'somewhat hard') — you should be able to talk throughout."],
      ["Supervised aerobic & resistance training", 6, 14, "Build aerobic capacity and strength, ideally supervised.",
       "30+ minutes of continuous moderate aerobic exercise, tolerating resistance work",
       "Progress gradually and report any new chest symptoms straight away. Avoid breath-holding/straining when lifting."],
      ["Long-term maintenance", 14, 26, "Make it lifelong and manage your risk factors.",
       "sustaining ≥150 min/week of moderate activity, risk factors actively managed",
       "The benefit only lasts while the exercise does — plus blood pressure, lipids, glucose, smoking and weight all need managing."]] },
  pulmonary: { label:"Pulmonary rehabilitation", generic:true, total:12,
    freq:"Supervised sessions 2–3×/week + walking on the other days",
    note:"Pulmonary rehab improves breathlessness, exercise capacity and quality of life more than most drugs. Being breathless during exercise is expected and is NOT dangerous — avoiding activity is what drives the downward spiral of deconditioning.",
    variants:[
      { k:"standard", label:"Standard", sub:"Usual programme", scale:1 },
      { k:"severe", label:"Severe / on oxygen", sub:"Very breathless, or using oxygen", pick:/severe|\bgold (iii|iv|3|4)\b|oxygen|end-?stage/i, scale:1.4,
        note:"If you use oxygen, exercise WITH it as prescribed and keep saturations above your target. Interval training (short bursts with rests) is usually far better tolerated than continuous work." },
      { k:"postexac", label:"After a flare-up", sub:"Recovering from an exacerbation", pick:/exacerbation|flare|infection|post-?covid|pneumonia/i, scale:1.2,
        note:"Starting rehab soon after an exacerbation gives the biggest gains — begin gently and build back; strength drops fast during an admission." },
      { k:"postop", label:"After lung surgery", sub:"Resection or thoracic surgery", pick:/surgery|resection|lobectom|thoracotom|transplant/i, scale:1.3,
        note:"After thoracic surgery, breathing exercises and airway clearance several times a day prevent chest infection — the main early complication. Shoulder and posture work on the operated side matters too." }],
    ph:[
      ["Assessment & gentle start", 0, 2, "Set a safe baseline and learn breathing control.",
       "comfortable with a baseline walking distance, using pursed-lip breathing",
       "Breathlessness of 3–4/10 is the target and is safe. Use your reliever inhaler beforehand if prescribed, and pace with the breathing techniques."],
      ["Building aerobic capacity", 2, 6, "Increase walking/cycling endurance with intervals.",
       "walking further before needing to stop, recovering more quickly",
       "Interval training (walk, rest, repeat) is a legitimate option if continuous walking is too breathless."],
      ["Strength & endurance", 6, 10, "Add resistance training and build endurance.",
       "improved walking distance, tolerating resistance training",
       "Include arm work — it helps daily tasks, though it's often more breathless than leg work."],
      ["Maintenance & self-management", 10, 12, "Lock in the gains with a plan you'll keep.",
       "sustained improvement in walking distance, confident with your action plan",
       "Gains fade within 6–12 months if you stop — ongoing exercise is the whole point. Keep your action plan for flare-ups handy."]] }
};
/* The generated long-tail timelines (data/plans.js) — archetype × body site,
   same shape as REHAB_PLANS. `r`/`pick` arrive as regex SOURCE strings and are
   compiled once here. Curated plans are listed first so they win ties. */
let _genPlans = null;
function generatedPlans(){
  if(_genPlans) return _genPlans;
  _genPlans = (window.PLAN_DEFS||[]).map(d=>({
    ...d, re:new RegExp(d.r, "i"),
    variants: d.variants ? d.variants.map(v=>({ ...v, pick: v.pick ? new RegExp(v.pick, "i") : undefined })) : undefined
  }));
  return _genPlans;
}
function allPlans(){ return REHAB_PLANS.concat(generatedPlans()); }
/* Post-operative timelines for the surgical catalogue (data/surgery-plans.js),
   matched against the SELECTED/DETECTED surgery's name rather than the condition. */
let _surgPlans = null;
function surgeryPlans(){
  if(_surgPlans) return _surgPlans;
  _surgPlans = (window.SURGERY_PLAN_DEFS||[]).map(d=>({
    ...d, re:new RegExp(d.r, "i"),
    variants: d.variants ? d.variants.map(v=>({ ...v, pick: v.pick ? new RegExp(v.pick, "i") : undefined })) : undefined
  }));
  return _surgPlans;
}
/* Rank a list of plans against an arbitrary name — non-generic wins, then the
   longest match. Shared by the condition and surgery lookups. */
function rankPlans(name, plans){
  const n = (name||"").toLowerCase();
  let best=null, bestSpec=-1, bestLen=0;
  for(const p of plans){
    const m = n.match(p.re); if(!m) continue;
    const spec = p.generic ? 0 : 1;
    if(spec>bestSpec || (spec===bestSpec && m[0].length>bestLen)){ best=p; bestSpec=spec; bestLen=m[0].length; }
  }
  return best;
}
/* The timeline for a given surgery. A specific plan that matches the procedure by
   NAME (e.g. the curated tibial-tubercle-transfer protocol) beats the broad
   surgical-family archetype; if nothing matches at all we still return the
   generic post-op timeline, so every catalogued procedure resolves. */
function surgeryPlanFor(surg){
  if(!surg) return null;
  const named = rankPlans(surg.name, allPlans());
  if(named && !named.generic) return { ...named, surgeryName:surg.name };
  const fam = rankPlans(surg.name, surgeryPlans());
  if(fam && !fam.generic) return { ...fam, surgeryName:surg.name };
  const generic = surgeryPlans().find(p=>p.generic);
  return (fam || generic || named) ? { ...(fam || generic || named), surgeryName:surg.name } : null;
}
/* Pick the most specific realistic timeline for a condition (longest, most
   specific match wins; post-op-only plans need a surgical context). */
function detectPlan(cond){
  if(!cond) return null;
  const name = (cond.name||"").toLowerCase();
  const surg = detectSurgery();
  const isPostop = state.surgery==="yes" || !!surg;
  // A surgery the user EXPLICITLY picked in Details tells us what was actually
  // done, so its post-op timeline governs (a tibial tubercle transfer for
  // patellar instability follows the osteotomy's clock, not the instability's).
  const explicitSurgery = surg && state.surgeryType && state.surgeryType!=="auto" && state.surgeryType!=="other";
  if(explicitSurgery){ const sp = surgeryPlanFor(surg); if(sp) return sp; }
  let best=null, bestSpec=-1, bestLen=0;
  for(const p of allPlans()){
    if(p.postop===true && !isPostop) continue;
    if(p.postop===false && isPostop) continue;
    const m = name.match(p.re); if(!m) continue;
    const spec = p.generic ? 0 : 1;
    const len = m[0].length;
    if(spec>bestSpec || (spec===bestSpec && len>bestLen)){ best=p; bestSpec=spec; bestLen=len; }
  }
  // a specific condition plan wins; otherwise an auto-detected surgery's timeline
  // beats a merely generic condition plan, and the domain fallback catches the rest.
  if(best && !best.generic) return best;
  if(surg){ const sp = surgeryPlanFor(surg); if(sp && !sp.generic) return sp; }
  return best || (surg && surgeryPlanFor(surg)) || DOMAIN_FALLBACK[cond.domain] || DOMAIN_FALLBACK.msk;
}
/* ---------- functional progress self-report ----------
   Every plan tells the user "progress on the CRITERIA, not the dates" — so the
   app shouldn't place them by dates alone. They tick the milestones they've
   actually met; we then place them where they really are, which for most people
   is BEHIND the calendar, not ahead of it. */
function criteriaMet(plan){ return (plan && (state.progress||{})[plan.label]) || []; }
function criteriaPhase(plan){
  const m = criteriaMet(plan); let i = 0;
  while(i < 4 && m[i]) i++;
  return i;                              // the phase you're working IN
}
function setCriteriaMet(label, idx, on){
  state.progress = state.progress || {};
  const a = state.progress[label] = state.progress[label] || [];
  a[idx] = !!on;
  // meeting a later milestone implies the earlier ones; un-meeting one clears the rest
  if(on) for(let i=0;i<idx;i++) a[i] = true;
  else   for(let i=idx+1;i<4;i++) a[i] = false;
  save();
  state.program = generateProgram(); save();
  renderProgram(state.program);
}
function weekPhaseOf(plan){
  const w = weeksPostOp();
  const wk = Number(w != null ? w : state.weeks);
  if(!isFinite(wk)) return -1;
  for(let i=0;i<plan.ph.length;i++){ if(wk >= plan.ph[i][1] && wk < plan.ph[i][2]) return i; }
  return wk >= plan.ph[plan.ph.length-1][2] ? plan.ph.length-1 : 0;
}
/* Where the user actually is. You advance only when you've met the criteria AND
   the tissue has had time — so whichever is further behind wins. Without a
   self-report we fall back to the calendar. */
function currentPlanPhase(plan){
  if(!plan) return -1;
  const wp = weekPhaseOf(plan);
  const rep = criteriaMet(plan);
  if(!rep.some(Boolean)) return wp;
  const cp = Math.min(criteriaPhase(plan), plan.ph.length-1);
  return wp < 0 ? cp : Math.min(cp, wp);
}
/* Region-blind age-matched fill. Only runs when a child's phase would otherwise be nearly
   empty, and only ever ADDS — every other gate (contraindications, devices, weight-bearing)
   still applies, because "the phase looked thin" is not a reason to hand a child something
   their precautions forbid. */
function pedTopUp(kept, age, p, flags){
  if(!window.EXERCISES) return kept;
  const have = new Set(kept.map(e=>e.n.toLowerCase()));
  const bucket = Math.max(2, p+1);
  let pool = window.EXERCISES.filter(e => isPediatricEx(e) && exAgeOk(e, age)
    && e.difficulty <= bucket && !have.has(e.name.toLowerCase()));
  pool = window.applyContra(pool, flags).kept.filter(e=>nameAllowed(e.name));
  pool.sort((a,b)=> hashStr(a.name+"|ped") - hashStr(b.name+"|ped"));
  for(const e of pool){
    if(kept.length >= 3) break;
    kept.push({ n:e.name, d:e.dose, c:e.cue, pattern:e.pattern, region:e.region, tags:e.tags,
                aMin:e.aMin, aMax:e.aMax, band:e.band });
  }
  return kept;
}
function enrichPhase(kept, protocol, p, flags){
  const target = phaseTarget(p);
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
  const adlPlan = adlFocusPlan(flags);   // task-specific ADL practice per phase (primary condition only)
  const age = userAgeYears();       // AGE_ADULT when unstated, so adults take the untouched path
  const items = conds.map((c,ci)=>{
    const proto = window.getProtocol(c.protocol);
    const focus = detectFocus(c.name);
    const basePlan = detectPlan(c);             // realistic condition-specific timeline (may be null)
    const plan = applyVariant(basePlan, selectedVariant(basePlan, c));   // + chosen//inferred variation
    const curPhase = currentPlanPhase(plan);
    let cursor=1;
    const phases = proto.map((pool,p)=>{
      const len = phaseWeeks[p], wkStart=cursor, wkEnd=cursor+len-1; cursor=wkEnd+1;
      // prepend injury-specific signature + return-to-sport balance/agility + chosen-sport
      // exercises (sport on the primary condition only; dedupe against pool)
      const sigRaw = [...signatureFor(focus, p+1), ...rtsFor(c, p), ...(ci===0 ? sportFor(p) : []), ...(ci===0 ? (adlPlan[p]||[]) : []), ...((ci===0 && !RTS_NO_WB.test(`${c.name||""} ${c.region||""}`)) ? fallsFor(p) : [])];
      const sig = []; const sigSeen = new Set();
      sigRaw.forEach(s=>{ const k=s.n.toLowerCase(); if(!sigSeen.has(k)){ sigSeen.add(k); sig.push(s); } });
      const seen = new Set(sig.map(s=>s.n.toLowerCase()));
      let merged = [...sig, ...pool.filter(e=>!seen.has(e.n.toLowerCase()))];
      if(R.avoid.length) merged = merged.filter(e=>!R.avoid.some(re=>re.test(e.n)));   // drop device/limb-restricted moves
      merged = adaptForAge(merged, age);            // protocol + signature prose — the layer that bypasses the library
      const { kept, removed } = window.applyContra(merged, flags);
      window.ensureMinimum(kept, flags, 3);
      /* ensureMinimum pulls from SAFE_SUBS, which is adult-authored, so it can undo the
         line above. Re-filter, THEN enrich — enrichPhase tops up from libraryOptions,
         which is already age-gated, so the backfill lands age-appropriate. */
      if(age < 18){ const ok = kept.filter(e=>exItemAgeOk(e, age)); kept.length = 0; kept.push(...ok); }
      enrichPhase(kept, c.protocol, p, flags);
      /* Last resort. The age filter can strip a phase faster than the region-scoped library
         can refill it — a plan with an empty phase is worse than one with a general
         movement in it. Region is dropped here, age and precautions never are. */
      if(age < 18 && kept.length < 3) pedTopUp(kept, age, p, flags);
      let ex = R.avoid.length ? kept.filter(e=>!R.avoid.some(re=>re.test(e.n))) : kept;  // final gate (ensureMinimum/enrich)
      // enrichPhase can only grow a phase — trim to the user's real time budget so a
      // short session isn't an abandoned one. Signature/protocol items come first, so
      // the tail we drop is library filler.
      const cap = phaseTarget(p);
      if(ex.length > cap) ex = ex.slice(0, Math.max(3, cap));
      if(R.caution.length) ex.forEach(e=>{ if(!e.warn && !e.cautionMsg && R.caution.some(re=>re.test(e.n))) e.cautionMsg = true; });
      removed.forEach(r=>removedAll.set(r.n, r.tag));
      const pl = plan && plan.ph[p];            // condition-specific phase, when we have a real timeline
      return { title: pl ? pl[0] : tmpl.phases[p].title,
        goal: pl ? pl[3] : tmpl.phases[p].goal,
        weekStart: pl ? pl[1] : wkStart,        // plan weeks are absolute (from injury/surgery)
        weekEnd:   pl ? pl[2] : wkEnd,
        criteria:  pl ? pl[4] : (PHASE_CRITERIA[track]||PHASE_CRITERIA.acute)[p],
        restrict:  pl ? pl[5] : "",
        current:   !!pl && p===curPhase,
        ex };
    });
    return { name:c.name, domain:c.domain, region:c.region, supervision:c.supervision, phases,
      protocol:c.protocol, clearance:c.clearance, chronicByNature:c.chronicByNature,
      focus: focus ? focus.focus : "",
      plan: plan ? { label:plan.label, total:plan.total, note:plan.note, freq:plan.freq,
        variant:plan.variant, variantList:plan.variantList } : null,
      planPhase: curPhase,
      about:aboutText(c, track), redflags:DOMAIN_REDFLAGS[c.domain] };
  });

  // the primary condition's real timeline drives the headline length & frequency
  const primaryPlan = items.length ? items[0].plan : null;
  return {
    track, totalWeeks: primaryPlan ? primaryPlan.total : tmpl.total,
    sessions: (primaryPlan && primaryPlan.freq) ? primaryPlan.freq : sessionsText(track),
    load:loadGuidance(),
    builtFrom: { pain: effectivePain().v, flags: flags.slice().sort().join(",") },   // so planDrift() can tell when it goes stale
    flags, notes:[...new Set(window.notesForFlags(flags).concat(R.notes))], clearance:clearanceNeeded(flags),
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

