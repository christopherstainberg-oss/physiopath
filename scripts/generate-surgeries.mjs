/* =====================================================================
   PhysioPath — surgical-procedure database generator (dependency-free)
   Emits data/surgeries.js -> window.SURGERY_DB (TARGET entries).

   Each surgery mirrors the curated shape in app.js:
     { id, name, cat, region, autoFlags:[], match:/regex/i,
       precautions:[{t, w}], ret }
   Built from clinically-grouped families × procedure bases × surgical
   approaches × side. Precautions/return-to-activity come from the family
   template; keyhole/robotic approaches soften the timeline a little.
   General education only — a surgeon's own protocol always takes precedence.
===================================================================== */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET = 10000;

const P = (t, w) => ({ t, w });
// soften weeks for minimally invasive / keyhole approaches
const soften = prec => prec.map(p => ({ t: p.t, w: p.w === 0 ? 0 : Math.max(1, Math.round(p.w * 0.7)) }));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---- shared approach sets ---- */
const A_JOINT = [{ m: "", soft: false }, { m: "arthroscopic", soft: true }, { m: "robotic-assisted", soft: false }, { m: "computer-navigated", soft: false }, { m: "minimally invasive", soft: true }, { m: "image-guided", soft: false }, { m: "revision", soft: false }];
const A_ARTH  = [{ m: "", soft: false }, { m: "cemented", soft: false }, { m: "cementless", soft: false }, { m: "hybrid fixation", soft: false }, { m: "robotic-assisted", soft: false }, { m: "computer-navigated", soft: false }, { m: "patient-specific instrumentation", soft: false }, { m: "minimally invasive", soft: true }, { m: "outpatient / day-case", soft: true }, { m: "revision", soft: false }];
const A_SCOPE = [{ m: "arthroscopic", soft: true }, { m: "arthroscopic with debridement", soft: true }, { m: "arthroscopic repair", soft: true }, { m: "mini-open", soft: false }, { m: "open", soft: false }, { m: "revision", soft: false }];
const A_OPEN  = [{ m: "", soft: false }, { m: "minimally invasive", soft: true }, { m: "percutaneous", soft: true }, { m: "with internal fixation", soft: false }, { m: "with bone graft", soft: false }];
const A_LAP   = [{ m: "laparoscopic", soft: true }, { m: "single-incision laparoscopic", soft: true }, { m: "hand-assisted laparoscopic", soft: false }, { m: "robotic-assisted", soft: true }, { m: "open", soft: false }];
const A_CARD  = [{ m: "", soft: false }, { m: "on-pump", soft: false }, { m: "off-pump", soft: false }, { m: "minimally invasive", soft: true }, { m: "robotic-assisted", soft: true }];
const A_THOR  = [{ m: "VATS (keyhole)", soft: true }, { m: "uniportal VATS", soft: true }, { m: "robotic-assisted", soft: true }, { m: "open thoracotomy", soft: false }];
const A_SPINE = [{ m: "", soft: false }, { m: "minimally invasive", soft: true }, { m: "endoscopic", soft: true }, { m: "with instrumentation", soft: false }, { m: "navigation-guided", soft: false }, { m: "with fusion", soft: false }];
const A_ENDO  = [{ m: "endovascular", soft: true }, { m: "open", soft: false }, { m: "hybrid", soft: false }];
const A_PLAIN = [{ m: "", soft: false }, { m: "minimally invasive", soft: true }, { m: "revision", soft: false }, { m: "day-case", soft: true }];
const A_HAND  = [{ m: "", soft: false }, { m: "endoscopic", soft: true }, { m: "open", soft: false }, { m: "revision", soft: false }];

const S_LIMB = ["", "Left", "Right", "Bilateral"];
const S_SIDE = ["", "Left", "Right"];
const S_NONE = [""];

/* ---- precaution templates + families ----
   Each family: { cat, region, autoFlags, ret, prec, bases:[{n,kw:[]}], mods, sides } */
const FAM = [
  { cat: "hip_arthroplasty", region: "hip", autoFlags: ["hip_replacement"],
    ret: "Hip precautions commonly ease around 6–12 weeks depending on the approach (posterior vs anterior); high-impact limits may be longer.",
    prec: [P("Don't bend the operated hip past 90° (avoid low chairs and deep bending).", 12), P("Don't cross your legs or bring the leg across your body's midline.", 12), P("Don't rotate the operated leg or foot inward.", 12), P("Use a raised toilet seat and a firm, higher chair.", 12), P("Weight-bear as instructed; use your walker/crutches until cleared.", 6), P("No driving until cleared (often ~4–6 weeks).", 6)],
    bases: [{ n: "Total hip replacement", kw: ["total hip replacement", "total hip arthroplasty", "tha"] }, { n: "Hip hemiarthroplasty", kw: ["hip hemiarthroplasty", "hemiarthroplasty"] }, { n: "Hip resurfacing", kw: ["hip resurfacing"] }, { n: "Revision hip replacement", kw: ["revision hip replacement"] }],
    mods: A_ARTH, sides: S_LIMB },

  { cat: "knee_arthroplasty", region: "knee", autoFlags: ["knee_replacement"],
    ret: "Motion and strength progress over ~12 weeks; high-impact restrictions are usually long-term.",
    prec: [P("Work on full knee straightening (extension) AND bend (flexion) early — motion is the priority.", 8), P("Ice and elevate frequently to control swelling.", 6), P("Keep ankle pumps going; watch for DVT (calf pain/swelling/warmth).", 6), P("Weight-bear as tolerated with your walker/crutches until steady.", 6), P("No driving until cleared (often ~4–6 weeks).", 6), P("Avoid high-impact activity (running, jumping) to protect the implant.", 0)],
    bases: [{ n: "Total knee replacement", kw: ["total knee replacement", "total knee arthroplasty", "tka"] }, { n: "Partial (unicompartmental) knee replacement", kw: ["unicompartmental knee", "partial knee replacement"] }, { n: "Patellofemoral knee replacement", kw: ["patellofemoral replacement"] }, { n: "Revision knee replacement", kw: ["revision knee replacement"] }],
    mods: A_ARTH, sides: S_LIMB },

  { cat: "shoulder_arthroplasty", region: "shoulder", autoFlags: [],
    ret: "Strengthening progresses after ~6–12 weeks; avoid heavy overhead lifting long-term.",
    prec: [P("Wear your sling as instructed.", 4), P("Follow your passive/active motion limits (reverse and anatomic differ).", 6), P("No pushing up from a chair with the operated arm; no reaching behind the back early.", 8), P("No lifting heavier than a coffee cup early.", 6)],
    bases: [{ n: "Total shoulder replacement", kw: ["total shoulder replacement", "shoulder arthroplasty"] }, { n: "Reverse total shoulder replacement", kw: ["reverse total shoulder", "reverse shoulder arthroplasty"] }, { n: "Shoulder hemiarthroplasty", kw: ["shoulder hemiarthroplasty"] }, { n: "Revision shoulder replacement", kw: ["revision shoulder replacement"] }],
    mods: A_PLAIN, sides: S_LIMB },

  { cat: "other_arthroplasty", region: "joint", autoFlags: [],
    ret: "Motion and light strengthening progress once healing is confirmed (~6–12 weeks); avoid heavy loading long-term.",
    prec: [P("Follow your splint/sling and motion limits.", 6), P("Keep the incision clean and dry; control swelling.", 4), P("No heavy lifting or loading through the joint early.", 8), P("Progress motion and strengthening only as cleared.", 8)],
    bases: [{ n: "Total ankle replacement", kw: ["total ankle replacement", "ankle arthroplasty"] }, { n: "Total elbow replacement", kw: ["total elbow replacement", "elbow arthroplasty"] }, { n: "Wrist replacement", kw: ["wrist replacement", "wrist arthroplasty"] }, { n: "Finger joint replacement (MCP/PIP)", kw: ["finger joint replacement", "mcp arthroplasty", "pip arthroplasty"] }, { n: "Great-toe (1st MTP) joint replacement", kw: ["toe joint replacement", "mtp arthroplasty"] }],
    mods: A_PLAIN, sides: S_LIMB },

  { cat: "knee_ligament", region: "knee", autoFlags: [],
    ret: "Full sport return is typically ~9–12 months, guided by strength/hop testing and surgeon clearance.",
    prec: [P("Wear your brace and follow your exact weight-bearing instructions.", 6), P("Regain full extension (straightening) early and work on quad activation.", 6), P("Avoid deep squatting and open-chain knee extension early (per protocol).", 12), P("NO pivoting, cutting, or twisting sports.", 36), P("Return to running only when cleared (often ~3 months).", 12)],
    bases: [{ n: "ACL reconstruction", kw: ["acl reconstruction", "acl repair", "anterior cruciate"] }, { n: "PCL reconstruction", kw: ["pcl reconstruction", "posterior cruciate"] }, { n: "MCL reconstruction", kw: ["mcl reconstruction", "medial collateral"] }, { n: "LCL / posterolateral corner reconstruction", kw: ["lcl reconstruction", "posterolateral corner", "lateral collateral"] }, { n: "MPFL reconstruction (patellar stabilisation)", kw: ["mpfl reconstruction", "patellofemoral stabil"] }, { n: "Multi-ligament knee reconstruction", kw: ["multi-ligament knee", "multiligament knee"] }],
    mods: [{ m: "hamstring autograft", soft: false }, { m: "patellar-tendon (BTB) autograft", soft: false }, { m: "quadriceps-tendon autograft", soft: false }, { m: "allograft", soft: false }, { m: "revision", soft: false }],
    sides: S_LIMB },

  { cat: "meniscus", region: "knee", autoFlags: [],
    ret: "Repairs are protected longer than a meniscectomy — progress on your surgeon's timeline.",
    prec: [P("Follow your restricted range-of-motion and brace instructions.", 6), P("Weight-bear only as instructed (often limited early).", 6), P("Avoid deep squatting, pivoting and twisting.", 12)],
    bases: [{ n: "Meniscus repair", kw: ["meniscus repair", "meniscal repair"] }, { n: "Meniscus root repair", kw: ["meniscus root repair", "meniscal root"] }, { n: "Partial meniscectomy", kw: ["meniscectomy"] }, { n: "Meniscus transplant", kw: ["meniscus transplant", "meniscal allograft transplant"] }],
    mods: A_SCOPE, sides: S_LIMB },

  { cat: "cartilage", region: "knee", autoFlags: [],
    ret: "Cartilage procedures are protected for months — weight-bearing and impact progress slowly under your protocol.",
    prec: [P("Follow strict weight-bearing limits (often protected 6+ weeks).", 8), P("Use continuous-passive-motion / early motion as prescribed.", 6), P("No impact or deep loading until cleared.", 12)],
    bases: [{ n: "Cartilage microfracture", kw: ["microfracture"] }, { n: "Osteochondral autograft (OATS)", kw: ["oats", "osteochondral autograft", "mosaicplasty"] }, { n: "Autologous chondrocyte implantation (ACI/MACI)", kw: ["chondrocyte implantation", "aci", "maci"] }, { n: "Osteochondral allograft", kw: ["osteochondral allograft"] }],
    mods: A_SCOPE, sides: S_LIMB },

  { cat: "rotator_cuff", region: "shoulder", autoFlags: [],
    ret: "Active motion usually starts ~6 weeks and strengthening ~12 weeks — the tendon needs time to heal to bone.",
    prec: [P("Wear your sling as instructed.", 6), P("Passive range of motion only early — NO active lifting of the arm.", 6), P("No reaching overhead or behind your back early.", 8), P("No lifting, pushing or pulling with the arm.", 12), P("No weight-bearing through the arm (e.g. pushing up from a chair).", 12)],
    bases: [{ n: "Rotator cuff repair", kw: ["rotator cuff repair", "cuff repair"] }, { n: "Massive rotator cuff repair", kw: ["massive cuff repair", "massive rotator cuff"] }, { n: "Superior capsular reconstruction", kw: ["superior capsular reconstruction"] }, { n: "Biceps tenodesis", kw: ["biceps tenodesis"] }, { n: "SLAP repair", kw: ["slap repair"] }],
    mods: A_SCOPE, sides: S_LIMB },

  { cat: "shoulder_stab", region: "shoulder", autoFlags: [],
    ret: "Return to contact sport or overhead athletics is typically ~4–6 months with clearance.",
    prec: [P("Wear your sling as instructed.", 4), P("Avoid external rotation past neutral and the 'apprehension' position early.", 6), P("No overhead or behind-the-back reaching early.", 8), P("No lifting/pushing/pulling with the arm.", 8)],
    bases: [{ n: "Bankart repair (shoulder stabilisation)", kw: ["bankart"] }, { n: "Latarjet procedure", kw: ["latarjet"] }, { n: "Shoulder capsular shift", kw: ["capsular shift", "shoulder stabil"] }, { n: "Remplissage", kw: ["remplissage"] }, { n: "AC joint reconstruction", kw: ["ac joint reconstruction", "acromioclavicular reconstruction"] }],
    mods: A_SCOPE, sides: S_LIMB },

  { cat: "tendon_repair", region: "limb", autoFlags: [],
    ret: "Loading and push-off progress gradually; return to running/sport is typically ~4–6 months.",
    prec: [P("Wear your boot/brace as prescribed and follow weight-bearing limits.", 8), P("NO active push-off or aggressive stretching of the repaired tendon early.", 10), P("Progress loading slowly under your protocol.", 12)],
    bases: [{ n: "Achilles tendon repair", kw: ["achilles repair", "achilles rupture", "achilles tendon repair"] }, { n: "Pectoralis major repair", kw: ["pectoralis major repair", "pec major repair", "pectoralis major rupture"] }, { n: "Proximal hamstring repair", kw: ["proximal hamstring repair", "hamstring avulsion repair", "hamstring reattachment"] }, { n: "UCL reconstruction (Tommy John)", kw: ["tommy john", "ulnar collateral ligament reconstruction", "ucl reconstruction", "elbow ucl reconstruction"] }, { n: "Patellar tendon repair", kw: ["patellar tendon repair"] }, { n: "Quadriceps tendon repair", kw: ["quadriceps tendon repair", "quad tendon repair"] }, { n: "Distal biceps tendon repair", kw: ["distal biceps repair", "distal biceps tendon"] }, { n: "Triceps tendon repair", kw: ["triceps tendon repair"] }, { n: "Peroneal tendon repair", kw: ["peroneal tendon repair"] }, { n: "Tibialis posterior tendon repair", kw: ["tibialis posterior repair", "posterior tibial tendon"] }, { n: "Hamstring tendon repair", kw: ["hamstring tendon repair", "proximal hamstring repair"] }],
    mods: A_OPEN, sides: S_LIMB },

  { cat: "fracture_orif", region: "bone", autoFlags: ["recent_fracture"],
    ret: "Weight-bearing usually advances around 6 weeks once bone healing is confirmed; impact returns later.",
    prec: [P("Follow your weight-bearing status exactly (often protected early).", 6), P("Elevate to control swelling; keep the incision clean and dry.", 4), P("Keep neighbouring joints moving to prevent stiffness.", 4), P("Progress loading only when your surgeon confirms healing.", 8)],
    bases: [{ n: "Hip fracture fixation", kw: ["hip fracture", "femoral neck fracture", "intertrochanteric"] }, { n: "Femur fracture fixation", kw: ["femur fracture", "femoral shaft fracture"] }, { n: "Tibial fracture fixation", kw: ["tibial fracture", "tibia fracture"] }, { n: "Ankle fracture fixation", kw: ["ankle fracture", "malleolus", "pilon"] }, { n: "Distal radius (wrist) fracture fixation", kw: ["distal radius", "wrist fracture", "colles"] }, { n: "Humerus fracture fixation", kw: ["humerus fracture", "humeral fracture"] }, { n: "Clavicle fracture fixation", kw: ["clavicle fracture", "collarbone fracture"] }, { n: "Elbow (olecranon) fracture fixation", kw: ["olecranon fracture", "elbow fracture"] }, { n: "Forearm fracture fixation", kw: ["forearm fracture", "radius and ulna fracture"] }, { n: "Patella fracture fixation", kw: ["patella fracture", "kneecap fracture"] }, { n: "Calcaneus (heel) fracture fixation", kw: ["calcaneus fracture", "calcaneal fracture", "heel fracture"] }, { n: "Metatarsal / foot fracture fixation", kw: ["metatarsal fracture", "foot fracture"] }, { n: "Scaphoid fracture fixation", kw: ["scaphoid fracture"] }, { n: "Pelvic / acetabular fracture fixation", kw: ["pelvic fracture", "acetabular fracture"] }, { n: "Tibial plateau fracture fixation", kw: ["tibial plateau"] }],
    mods: [{ m: "ORIF (plate & screws)", soft: false }, { m: "intramedullary nail", soft: false }, { m: "percutaneous pinning", soft: true }, { m: "external fixation", soft: false }],
    sides: S_LIMB },

  { cat: "arthroscopy", region: "joint", autoFlags: [],
    ret: "Simple scopes recover in a few weeks; procedures that repair tissue are protected longer.",
    prec: [P("Weight-bear/ use the limb as tolerated unless told otherwise; control swelling.", 2), P("Restore motion and muscle activation early.", 4), P("Ease back into impact once swelling and strength allow.", 6)],
    bases: [{ n: "Knee arthroscopy", kw: ["knee arthroscopy"] }, { n: "Shoulder arthroscopy / subacromial decompression", kw: ["shoulder arthroscopy", "subacromial decompression"] }, { n: "Hip arthroscopy (FAI / labral)", kw: ["hip arthroscopy", "femoroacetabular", "hip labral"] }, { n: "Ankle arthroscopy", kw: ["ankle arthroscopy"] }, { n: "Elbow arthroscopy", kw: ["elbow arthroscopy"] }, { n: "Wrist arthroscopy", kw: ["wrist arthroscopy"] }],
    mods: [{ m: "", soft: true }, { m: "with debridement", soft: true }, { m: "with loose-body removal", soft: true }], sides: S_LIMB },

  { cat: "arthrodesis", region: "joint", autoFlags: [],
    ret: "A fusion needs the bones to knit — protected weight-bearing for weeks, then a graded return.",
    prec: [P("Stay non-weight-bearing/protected as instructed while the fusion heals.", 8), P("Keep the cast/boot/splint on as prescribed.", 8), P("No twisting or loading through the fused joint early.", 10)],
    bases: [{ n: "Ankle fusion", kw: ["ankle fusion", "ankle arthrodesis"] }, { n: "Subtalar fusion", kw: ["subtalar fusion"] }, { n: "Midfoot fusion", kw: ["midfoot fusion", "midfoot arthrodesis"] }, { n: "Wrist fusion", kw: ["wrist fusion", "wrist arthrodesis"] }, { n: "Thumb (CMC) fusion", kw: ["thumb fusion", "cmc fusion"] }, { n: "Great-toe (1st MTP) fusion", kw: ["mtp fusion", "toe fusion"] }],
    mods: A_PLAIN, sides: S_LIMB },

  { cat: "osteotomy", region: "bone", autoFlags: ["recent_fracture"],
    ret: "The cut bone heals over weeks — protected loading first, then a staged return, similar to a fracture.",
    prec: [P("Follow your weight-bearing limits while the bone cut heals.", 8), P("Control swelling; keep neighbouring joints moving.", 4), P("Avoid impact and heavy loading until healing is confirmed.", 10)],
    bases: [{ n: "High tibial osteotomy (knee)", kw: ["high tibial osteotomy", "hto"] }, { n: "Distal femoral osteotomy", kw: ["distal femoral osteotomy"] }, { n: "Periacetabular osteotomy (hip)", kw: ["periacetabular osteotomy", "pao"] }, { n: "Bunion correction (hallux valgus osteotomy)", kw: ["bunion", "hallux valgus", "bunionectomy"] }, { n: "Calcaneal osteotomy", kw: ["calcaneal osteotomy"] }, { n: "Femoral derotation osteotomy", kw: ["femoral osteotomy"] }, { n: "Tibial tubercle transfer (osteotomy)", kw: ["tibial tubercle transfer", "tibial tubercle osteotomy", "tibial tuberosity transfer", "fulkerson", "elmslie-trillat", "anteromedialisation", "anteromedialization", "\\btto\\b", "\\bttt\\b"] }, { n: "Trochleoplasty (trochlear groove deepening)", kw: ["trochleoplasty", "sulcus deepening", "sulcus-deepening", "trochlear deepening", "dejour trochlea", "bereiter"] }, { n: "Limb lengthening / external fixation", kw: ["limb lengthening", "external fixation", "ilizarov", "bone transport", "frame"] }],
    mods: A_OPEN, sides: S_LIMB },

  { cat: "amputation", region: "limb", autoFlags: [],
    ret: "Prosthetic fitting and gait/functional training follow wound healing and limb shaping (weeks–months).",
    prec: [P("Position the residual limb to prevent contracture (avoid prolonged bending).", 8), P("Care for the wound and desensitise the limb as taught.", 6), P("Follow your prosthetic and weight-bearing timeline from the team.", 0)],
    bases: [{ n: "Below-knee (transtibial) amputation", kw: ["below-knee amputation", "transtibial amputation", "bka"] }, { n: "Above-knee (transfemoral) amputation", kw: ["above-knee amputation", "transfemoral amputation", "aka"] }, { n: "Toe amputation", kw: ["toe amputation"] }, { n: "Partial-foot / Syme amputation", kw: ["partial foot amputation", "syme amputation"] }, { n: "Finger / partial-hand amputation", kw: ["finger amputation", "partial hand amputation"] }, { n: "Below-elbow (transradial) amputation", kw: ["below-elbow amputation", "transradial amputation"] }, { n: "Above-elbow (transhumeral) amputation", kw: ["above-elbow amputation", "transhumeral amputation"] }],
    /* Never day-case soften — residual-limb rehab is not a minor keyhole timeline */
    mods: [{ m: "", soft: false }, { m: "revision", soft: false }], sides: S_SIDE },

  { cat: "hand_nerve", region: "hand", autoFlags: [],
    ret: "Light use returns within days–weeks; full grip/strength can take 2–3 months.",
    prec: [P("Keep the incision clean and dry; keep fingers moving.", 2), P("Avoid heavy gripping, pinching or leaning on the palm early.", 4), P("Expect some scar tenderness for several weeks.", 6)],
    bases: [{ n: "Carpal tunnel release", kw: ["carpal tunnel release"] }, { n: "Cubital tunnel release (ulnar nerve)", kw: ["cubital tunnel", "ulnar nerve release", "ulnar nerve transposition"] }, { n: "Nerve graft / nerve transfer", kw: ["nerve graft", "nerve transfer", "nerve repair", "neurorrhaphy"] }, { n: "Trigger finger release", kw: ["trigger finger release"] }, { n: "Dupuytren's release / fasciectomy", kw: ["dupuytren", "fasciectomy"] }, { n: "De Quervain's release", kw: ["de quervain release"] }, { n: "Ganglion cyst excision", kw: ["ganglion excision", "ganglion cyst"] }, { n: "Hand tendon repair (flexor/extensor)", kw: ["flexor tendon repair", "extensor tendon repair", "hand tendon repair"] }, { n: "Tendon transfer (hand)", kw: ["tendon transfer"] }],
    mods: [{ m: "", soft: false }, { m: "endoscopic", soft: true }, { m: "open", soft: false }], sides: S_LIMB },

  { cat: "spine_fusion", region: "spine", autoFlags: [],
    ret: "BLT (bend/lift/twist) restrictions commonly ease around 6–12 weeks as the fusion consolidates.",
    prec: [P("BLT precautions: NO bending, lifting (>~5–10 lb) or twisting.", 12), P("Log-roll to get in/out of bed; wear your brace if prescribed.", 8), P("Change positions often; avoid prolonged sitting early.", 6), P("No driving until cleared.", 6)],
    bases: [{ n: "Lumbar fusion (PLIF)", kw: ["lumbar fusion", "plif"] }, { n: "Lumbar fusion (TLIF)", kw: ["tlif"] }, { n: "Lumbar fusion (ALIF)", kw: ["alif", "anterior lumbar"] }, { n: "Lateral lumbar fusion (XLIF)", kw: ["xlif", "lateral lumbar interbody"] }, { n: "Cervical fusion (ACDF)", kw: ["acdf", "anterior cervical", "cervical fusion"] }, { n: "Posterior cervical fusion", kw: ["posterior cervical fusion"] }, { n: "Thoracic spinal fusion", kw: ["thoracic fusion"] }, { n: "Scoliosis correction & fusion", kw: ["scoliosis correction", "spinal deformity"] }, { n: "Sacroiliac joint fusion", kw: ["sacroiliac fusion", "si joint fusion"] }],
    mods: A_SPINE, sides: S_NONE },

  { cat: "spine_decomp", region: "spine", autoFlags: [],
    ret: "Restrictions typically ease over ~4–6 weeks; a graded return to activity follows.",
    prec: [P("Limit bending, heavy lifting (>~5–10 lb) and twisting early.", 6), P("Avoid prolonged sitting; walk frequently.", 4), P("Progress activity gradually as pain allows.", 6)],
    bases: [{ n: "Lumbar microdiscectomy", kw: ["microdiscectomy", "lumbar discectomy"] }, { n: "Cervical discectomy", kw: ["cervical discectomy"] }, { n: "Lumbar laminectomy / decompression", kw: ["laminectomy", "lumbar decompression", "decompression"] }, { n: "Laminoplasty", kw: ["laminoplasty"] }, { n: "Foraminotomy", kw: ["foraminotomy"] }, { n: "Cervical disc replacement", kw: ["cervical disc replacement", "artificial disc"] }, { n: "Lumbar disc replacement", kw: ["lumbar disc replacement"] }, { n: "Kyphoplasty / vertebroplasty", kw: ["kyphoplasty", "vertebroplasty"] }],
    mods: A_SPINE, sides: S_NONE },

  { cat: "cardiac", region: "heart", autoFlags: ["cardiac"],
    ret: "Sternal precautions usually last ~6–8 weeks until the breastbone heals; attend supervised cardiac rehab.",
    prec: [P("Sternal precautions: don't lift, push or pull more than ~5–10 lb (about a milk jug).", 8), P("Don't reach both arms overhead or far behind you.", 8), P("Hug a firm pillow against your chest when coughing or sneezing.", 8), P("Don't push up through your arms to stand — use your legs.", 8), P("No driving until cleared (often ~4–6 weeks).", 6)],
    bases: [{ n: "Coronary artery bypass graft (CABG)", kw: ["cabg", "coronary artery bypass", "bypass surgery"] }, { n: "Aortic valve replacement", kw: ["aortic valve replacement", "avr"] }, { n: "Mitral valve replacement", kw: ["mitral valve replacement"] }, { n: "Mitral valve repair", kw: ["mitral valve repair"] }, { n: "Tricuspid valve surgery", kw: ["tricuspid valve"] }, { n: "Aortic root / ascending aorta repair", kw: ["aortic root", "ascending aorta", "bentall"] }, { n: "Atrial/ventricular septal defect repair", kw: ["septal defect repair", "asd closure", "vsd closure"] }, { n: "Myectomy (HCM)", kw: ["septal myectomy", "myectomy"] }],
    mods: A_CARD, sides: S_NONE },

  { cat: "cardiac_device", region: "heart", autoFlags: ["cardiac"],
    ret: "Keep the arm below shoulder height on the device side for ~4–6 weeks so the leads settle.",
    prec: [P("Don't raise the arm on the device side above shoulder height early.", 6), P("No heavy lifting or pushing/pulling with that arm.", 6), P("Keep the wound clean and dry; avoid vigorous arm swinging.", 4)],
    bases: [{ n: "Pacemaker implantation", kw: ["pacemaker"] }, { n: "ICD implantation", kw: ["icd implant", "defibrillator implant"] }, { n: "CRT (biventricular) device", kw: ["cardiac resynchronization", "crt device", "biventricular pacemaker"] }, { n: "Loop recorder insertion", kw: ["loop recorder"] }],
    mods: [{ m: "", soft: false }], sides: S_SIDE },

  { cat: "cardiac_cath", region: "heart", autoFlags: ["cardiac"],
    ret: "Keyhole/catheter heart procedures avoid the breastbone — activity returns within days–weeks, guided by your team.",
    prec: [P("Follow access-site care (groin/wrist); avoid heavy lifting and straining briefly.", 2), P("Ease back into activity as advised; attend cardiac rehab.", 4), P("Stop and seek care for chest pain, breathlessness, or palpitations.", 0)],
    bases: [{ n: "Coronary angioplasty & stent (PCI)", kw: ["angioplasty", "coronary stent", "pci", "percutaneous coronary"] }, { n: "TAVR (transcatheter aortic valve)", kw: ["tavr", "tavi", "transcatheter aortic valve"] }, { n: "MitraClip (transcatheter mitral repair)", kw: ["mitraclip", "transcatheter mitral"] }, { n: "Cardiac ablation", kw: ["cardiac ablation", "catheter ablation", "af ablation"] }, { n: "Left atrial appendage closure", kw: ["atrial appendage closure", "watchman"] }],
    mods: [{ m: "", soft: true }], sides: S_NONE },

  { cat: "vascular", region: "vascular", autoFlags: [],
    ret: "Reconditioning is graded and symptom-guided; report new leg pain/swelling, wound issues, or chest symptoms.",
    prec: [P("Care for the access/incision site; avoid heavy lifting and straining early.", 4), P("Walk regularly as advised to build circulation.", 2), P("Watch for wound problems, new swelling, or coldness/numbness in the limb.", 4)],
    bases: [{ n: "Carotid endarterectomy", kw: ["carotid endarterectomy"] }, { n: "Abdominal aortic aneurysm repair", kw: ["aortic aneurysm repair", "aaa repair", "evar"] }, { n: "Femoral-popliteal bypass", kw: ["fem-pop bypass", "femoral popliteal bypass", "leg bypass"] }, { n: "Peripheral angioplasty & stent", kw: ["peripheral angioplasty", "leg stent", "peripheral stent"] }, { n: "AV fistula creation (dialysis access)", kw: ["av fistula", "dialysis access"] }, { n: "Varicose vein surgery", kw: ["varicose vein", "vein ablation", "vein stripping"] }],
    mods: A_ENDO, sides: S_SIDE },

  { cat: "thoracic", region: "lung", autoFlags: ["pulmonary"],
    ret: "Breathing capacity improves over weeks–months; do your breathing exercises and progress conditioning gradually.",
    prec: [P("Do your breathing exercises / incentive spirometry regularly.", 6), P("Support the incision when coughing; keep the arm/shoulder moving gently.", 6), P("Avoid heavy lifting and strenuous pushing/pulling early.", 6)],
    bases: [{ n: "Lung lobectomy", kw: ["lobectomy"] }, { n: "Lung wedge resection", kw: ["wedge resection"] }, { n: "Lung segmentectomy", kw: ["segmentectomy"] }, { n: "Pneumonectomy", kw: ["pneumonectomy"] }, { n: "Pleurodesis", kw: ["pleurodesis"] }, { n: "Decortication", kw: ["decortication"] }, { n: "Bullectomy / lung volume reduction", kw: ["bullectomy", "lung volume reduction"] }, { n: "Mediastinal mass resection", kw: ["mediastinal mass", "thymectomy"] }],
    mods: A_THOR, sides: S_SIDE },

  { cat: "abdominal", region: "abdomen", autoFlags: [],
    ret: "Most lifting restrictions last ~4–6 weeks; core work is reintroduced gradually.",
    prec: [P("No heavy lifting (>~10 lb) — protect the incision and deep core.", 6), P("Support your abdomen when coughing, laughing or getting up.", 4), P("Avoid straining and vigorous core exercise early.", 6), P("Reintroduce core work gradually and gently.", 8)],
    bases: [{ n: "Inguinal hernia repair", kw: ["inguinal hernia"] }, { n: "Umbilical hernia repair", kw: ["umbilical hernia"] }, { n: "Incisional / ventral hernia repair", kw: ["incisional hernia", "ventral hernia"] }, { n: "Hiatal hernia repair (fundoplication)", kw: ["hiatal hernia", "fundoplication", "nissen"] }, { n: "Appendectomy", kw: ["appendectomy", "appendicectomy"] }, { n: "Cholecystectomy (gallbladder)", kw: ["cholecystectomy", "gallbladder removal"] }, { n: "Colectomy / bowel resection", kw: ["colectomy", "bowel resection", "colon resection"] }, { n: "Bariatric surgery (sleeve/bypass)", kw: ["bariatric", "gastric sleeve", "gastric bypass"] }, { n: "Gastrectomy", kw: ["gastrectomy"] }, { n: "Splenectomy", kw: ["splenectomy"] }, { n: "Liver resection", kw: ["liver resection", "hepatectomy"] }, { n: "Whipple (pancreaticoduodenectomy)", kw: ["whipple", "pancreaticoduodenectomy"] }, { n: "Exploratory laparotomy", kw: ["laparotomy"] }, { n: "Stoma / colostomy formation", kw: ["colostomy", "ileostomy", "stoma"] }],
    mods: A_LAP, sides: S_NONE },

  { cat: "pelvic", region: "pelvis", autoFlags: [],
    ret: "Pelvic-floor and core rehab is progressive; avoid heavy lifting and high-impact work for ~6 weeks.",
    prec: [P("No heavy lifting (>~10 lb) and avoid straining early.", 6), P("Reintroduce pelvic-floor and core work gently as advised.", 8), P("Watch for increased bleeding, pain, or wound problems.", 4)],
    bases: [{ n: "Hysterectomy", kw: ["hysterectomy"] }, { n: "Caesarean section (C-section)", kw: ["c-section", "caesarean", "cesarean"] }, { n: "Myomectomy (fibroid removal)", kw: ["myomectomy", "fibroid removal"] }, { n: "Prostatectomy", kw: ["prostatectomy"] }, { n: "TURP (prostate)", kw: ["turp", "transurethral prostate"] }, { n: "Pelvic organ prolapse repair", kw: ["prolapse repair", "pelvic floor repair"] }, { n: "Incontinence sling", kw: ["incontinence sling", "urethral sling"] }, { n: "Oophorectomy / ovarian cystectomy", kw: ["oophorectomy", "ovarian cystectomy"] }, { n: "Nephrectomy (kidney)", kw: ["nephrectomy", "kidney removal"] }, { n: "Cystectomy (bladder)", kw: ["cystectomy", "bladder removal"] }],
    mods: A_LAP, sides: S_NONE },

  { cat: "breast", region: "breast", autoFlags: [],
    ret: "Shoulder motion is restored gradually; if lymph nodes were removed, lymphedema precautions may be ongoing.",
    prec: [P("Progress shoulder/arm range of motion gently as advised; care for any drains.", 4), P("Avoid heavy lifting on the operated side early; watch for lymphedema (swelling).", 6), P("Follow extra arm-care guidance if lymph nodes were removed.", 0)],
    bases: [{ n: "Mastectomy", kw: ["mastectomy"] }, { n: "Lumpectomy (breast-conserving)", kw: ["lumpectomy", "breast conserving"] }, { n: "Axillary lymph-node dissection", kw: ["axillary dissection", "lymph node dissection", "sentinel node"] }, { n: "Breast reconstruction (flap)", kw: ["breast reconstruction", "diep flap", "tram flap"] }, { n: "Breast reconstruction (implant)", kw: ["implant reconstruction", "breast implant reconstruction"] }],
    mods: A_PLAIN, sides: S_SIDE },

  { cat: "neuro", region: "brain", autoFlags: [],
    ret: "Return of activity is symptom-guided and gradual; follow your neurosurgical team's timeline closely.",
    prec: [P("Avoid heavy lifting, straining and bending (raises head pressure) early.", 6), P("Rise slowly; pace activity and rest with any headache or dizziness.", 4), P("No driving until your team clears you.", 6)],
    bases: [{ n: "Craniotomy (brain surgery)", kw: ["craniotomy"] }, { n: "Brain tumour resection", kw: ["brain tumour resection", "brain tumor resection"] }, { n: "Cerebral aneurysm clipping/coiling", kw: ["aneurysm clipping", "aneurysm coiling"] }, { n: "VP shunt insertion", kw: ["vp shunt", "ventriculoperitoneal shunt"] }, { n: "Deep brain stimulation (DBS)", kw: ["deep brain stimulation", "dbs"] }, { n: "Chiari decompression", kw: ["chiari decompression"] }],
    mods: [{ m: "", soft: false }], sides: S_NONE },

  { cat: "ent_endocrine", region: "head-neck", autoFlags: [],
    ret: "Neck/throat comfort and voice settle over weeks; avoid heavy straining early and follow wound-care advice.",
    prec: [P("Avoid heavy lifting and straining early; support the neck when moving.", 4), P("Keep the wound clean; watch for swelling, breathing or swallowing difficulty (seek care).", 3), P("Reintroduce gentle neck motion as advised.", 4)],
    bases: [{ n: "Thyroidectomy", kw: ["thyroidectomy"] }, { n: "Parathyroidectomy", kw: ["parathyroidectomy"] }, { n: "Neck dissection", kw: ["neck dissection"] }, { n: "Tonsillectomy", kw: ["tonsillectomy"] }, { n: "Parotidectomy", kw: ["parotidectomy"] }],
    mods: [{ m: "", soft: false }, { m: "minimally invasive", soft: true }], sides: S_NONE },

  { cat: "plastic_softtissue", region: "soft tissue", autoFlags: [],
    ret: "Grafts/flaps need protection while they take; motion and loading progress on your surgeon's timeline.",
    prec: [P("Protect the graft/flap and follow positioning and dressing instructions.", 6), P("Avoid stretching or loading the area until it has healed.", 8), P("Watch for colour change, breakdown, or infection at the site.", 4)],
    bases: [{ n: "Skin graft", kw: ["skin graft"] }, { n: "Free flap reconstruction", kw: ["free flap", "flap reconstruction"] }, { n: "Burn contracture release", kw: ["contracture release", "burn release"] }, { n: "Replantation (digit/limb)", kw: ["replantation"] }, { n: "Complex wound closure", kw: ["wound closure", "wound reconstruction"] }],
    mods: A_PLAIN, sides: S_SIDE },

  { cat: "hand_surgery", region: "hand / wrist", autoFlags: [],
    ret: "Hand recovery is early-motion led; light use returns within days–weeks and full grip/strength over 2–3 months.",
    prec: [P("Keep the incision clean and dry; keep fingers moving to prevent stiffness.", 2), P("Avoid heavy gripping, pinching or weight-bearing through the hand early.", 4), P("Wear any splint as instructed; elevate to control swelling.", 3)],
    bases: [{ n: "Carpal tunnel release", kw: ["carpal tunnel release"] }, { n: "Cubital tunnel release", kw: ["cubital tunnel", "ulnar nerve release"] }, { n: "Trapeziectomy (thumb CMC arthroplasty)", kw: ["trapeziectomy", "thumb cmc arthroplasty", "basal thumb surgery", "thumb base arthroplasty"] }, { n: "Trigger finger release", kw: ["trigger finger release"] }, { n: "Trigger thumb release", kw: ["trigger thumb"] }, { n: "Dupuytren's fasciectomy", kw: ["dupuytren", "fasciectomy"] }, { n: "De Quervain's release", kw: ["de quervain"] }, { n: "Ganglion cyst excision", kw: ["ganglion excision"] }, { n: "Flexor tendon repair", kw: ["flexor tendon repair"] }, { n: "Extensor tendon repair", kw: ["extensor tendon repair"] }, { n: "Thumb CMC (basal joint) arthroplasty", kw: ["cmc arthroplasty", "basal joint"] }, { n: "Wrist arthrodesis (fusion)", kw: ["wrist fusion", "wrist arthrodesis"] }, { n: "Tendon transfer (hand)", kw: ["hand tendon transfer"] }],
    mods: A_HAND, sides: S_LIMB },

  { cat: "foot_ankle_surgery", region: "foot / ankle", autoFlags: [],
    ret: "Foot/ankle surgery is weight-bearing led — follow your boot/cast and weight-bearing status closely; loading progresses over weeks–months.",
    prec: [P("Follow your weight-bearing status and keep the boot/cast on as prescribed.", 6), P("Elevate frequently to control swelling; keep the incision clean and dry.", 4), P("No impact or forced motion until your surgeon confirms healing.", 8)],
    bases: [{ n: "Bunion correction (hallux valgus)", kw: ["bunion", "hallux valgus", "bunionectomy"] }, { n: "Lateral ankle ligament reconstruction (Broström)", kw: ["brostrom", "broström", "lateral ankle ligament reconstruction", "ankle ligament repair", "atfl repair"] }, { n: "Hammertoe correction", kw: ["hammertoe"] }, { n: "Morton's neuroma excision", kw: ["morton's neuroma", "neuroma excision"] }, { n: "Plantar fascia release", kw: ["plantar fascia release"] }, { n: "Ankle arthrodesis (fusion)", kw: ["ankle fusion", "ankle arthrodesis"] }, { n: "Subtalar fusion", kw: ["subtalar fusion"] }, { n: "Midfoot fusion", kw: ["midfoot fusion"] }, { n: "Lapidus procedure", kw: ["lapidus"] }, { n: "Calcaneal osteotomy", kw: ["calcaneal osteotomy"] }, { n: "Gastrocnemius recession", kw: ["gastrocnemius recession"] }, { n: "Flatfoot reconstruction", kw: ["flatfoot reconstruction"] }],
    mods: A_OPEN, sides: S_LIMB },

  { cat: "spine_other", region: "spine", autoFlags: [],
    ret: "Spinal recovery follows a graded, brace/precaution-guided timeline; restrictions ease over 6–12 weeks as the spine heals.",
    prec: [P("Limit bending, lifting (>~5–10 lb) and twisting early; log-roll in and out of bed.", 8), P("Wear your brace if prescribed and change positions often.", 6), P("No driving until cleared; report new leg/arm weakness or numbness.", 6)],
    bases: [{ n: "Scoliosis correction & fusion", kw: ["scoliosis correction", "spinal deformity"] }, { n: "Kyphoplasty", kw: ["kyphoplasty"] }, { n: "Vertebroplasty", kw: ["vertebroplasty"] }, { n: "Cervical disc replacement", kw: ["cervical disc replacement"] }, { n: "Lumbar disc replacement", kw: ["lumbar disc replacement"] }, { n: "Laminoplasty", kw: ["laminoplasty"] }, { n: "Foraminotomy", kw: ["foraminotomy"] }, { n: "Corpectomy", kw: ["corpectomy"] }, { n: "Spinal cord stimulator implant", kw: ["spinal cord stimulator"] }, { n: "Sacroiliac joint fusion", kw: ["sacroiliac fusion", "si joint fusion"] }],
    mods: A_SPINE, sides: S_NONE },

  { cat: "urology", region: "urinary", autoFlags: [],
    ret: "Keyhole/endoscopic urology recovers within days–weeks; avoid heavy lifting and straining early and follow catheter/stent advice.",
    prec: [P("Avoid heavy lifting and straining early to protect the repair.", 4), P("Follow catheter/stent care and drink plenty of fluids.", 2), P("Watch for fever, heavy bleeding, or being unable to pass urine (seek care).", 2)],
    bases: [{ n: "Transurethral prostate resection (TURP)", kw: ["turp", "transurethral prostate"] }, { n: "Ureteroscopy & stone removal", kw: ["ureteroscopy"] }, { n: "Percutaneous nephrolithotomy (PCNL)", kw: ["nephrolithotomy", "pcnl"] }, { n: "Shockwave lithotripsy (stones)", kw: ["lithotripsy"] }, { n: "Radical prostatectomy", kw: ["prostatectomy"] }, { n: "Cystectomy (bladder)", kw: ["cystectomy", "bladder removal"] }, { n: "Ureteric reimplantation", kw: ["ureteric reimplant"] }, { n: "Hydrocele repair", kw: ["hydrocele"] }, { n: "Orchidopexy", kw: ["orchidopexy"] }, { n: "Penile prosthesis / artificial sphincter", kw: ["penile prosthesis", "artificial urinary sphincter"] }],
    mods: A_PLAIN, sides: S_NONE },

  { cat: "gynecology", region: "pelvis", autoFlags: [],
    ret: "Pelvic recovery is progressive; avoid heavy lifting and high-impact work for ~6 weeks and reintroduce core/pelvic-floor work gently.",
    prec: [P("No heavy lifting (>~10 lb) and avoid straining early.", 6), P("Reintroduce pelvic-floor and core work gently as advised.", 8), P("Watch for increased bleeding, fever, or wound problems.", 4)],
    bases: [{ n: "Hysteroscopy", kw: ["hysteroscopy"] }, { n: "Endometrial ablation", kw: ["endometrial ablation"] }, { n: "Tubal ligation", kw: ["tubal ligation"] }, { n: "Ovarian cystectomy", kw: ["ovarian cystectomy"] }, { n: "Myomectomy (fibroids)", kw: ["myomectomy", "fibroid"] }, { n: "Laparoscopic ovarian drilling", kw: ["ovarian drilling"] }, { n: "Cervical cerclage", kw: ["cervical cerclage"] }, { n: "LEEP / cone biopsy", kw: ["leep", "cone biopsy"] }, { n: "Pelvic-organ prolapse repair", kw: ["prolapse repair"] }, { n: "Mid-urethral sling", kw: ["urethral sling", "incontinence sling"] }],
    mods: A_LAP, sides: S_NONE },

  { cat: "colorectal", region: "abdomen", autoFlags: [],
    ret: "Bowel-surgery recovery is graded; lifting restrictions usually last ~4–6 weeks and core work is reintroduced gradually.",
    prec: [P("No heavy lifting (>~10 lb) — protect the incision and deep core.", 6), P("Support your abdomen when coughing or getting up; walk frequently.", 4), P("Follow stoma care if relevant; watch for fever or wound problems.", 4)],
    bases: [{ n: "Right hemicolectomy", kw: ["right hemicolectomy"] }, { n: "Left hemicolectomy", kw: ["left hemicolectomy"] }, { n: "Sigmoid colectomy", kw: ["sigmoid colectomy"] }, { n: "Low anterior resection", kw: ["low anterior resection"] }, { n: "Abdominoperineal resection", kw: ["abdominoperineal resection"] }, { n: "Total colectomy", kw: ["total colectomy"] }, { n: "Haemorrhoidectomy", kw: ["haemorrhoidectomy", "hemorrhoidectomy"] }, { n: "Anal fistula surgery", kw: ["anal fistula"] }, { n: "Stoma reversal", kw: ["stoma reversal", "ileostomy reversal"] }, { n: "Rectopexy", kw: ["rectopexy"] }],
    mods: A_LAP, sides: S_NONE },

  { cat: "bariatric", region: "abdomen", autoFlags: [],
    ret: "Bariatric recovery is diet-staged; avoid heavy lifting for ~4–6 weeks and follow your dietitian's progression closely.",
    prec: [P("Follow your staged diet (fluids → puree → solids) exactly.", 6), P("No heavy lifting or vigorous core work early.", 6), P("Stay hydrated and take prescribed vitamins; watch for persistent vomiting or pain.", 4)],
    bases: [{ n: "Sleeve gastrectomy", kw: ["sleeve gastrectomy", "gastric sleeve"] }, { n: "Roux-en-Y gastric bypass", kw: ["gastric bypass", "roux-en-y"] }, { n: "Adjustable gastric band", kw: ["gastric band"] }, { n: "Duodenal switch", kw: ["duodenal switch"] }, { n: "Mini gastric bypass", kw: ["mini gastric bypass"] }, { n: "Revision bariatric surgery", kw: ["revision bariatric"] }, { n: "Intragastric balloon", kw: ["intragastric balloon"] }],
    mods: A_LAP, sides: S_NONE },

  { cat: "eye", region: "eye", autoFlags: [],
    ret: "Eye surgery recovers over days–weeks; avoid rubbing the eye, heavy straining and bending early, and use drops as prescribed.",
    prec: [P("Don't rub or press the eye; use the shield when sleeping if given.", 2), P("Avoid heavy lifting, straining and bending your head below the waist early.", 2), P("Use your eye drops exactly as prescribed; watch for pain or vision loss (seek care).", 2)],
    bases: [{ n: "Cataract surgery", kw: ["cataract"] }, { n: "Vitrectomy", kw: ["vitrectomy"] }, { n: "Retinal detachment repair", kw: ["retinal detachment"] }, { n: "Glaucoma surgery (trabeculectomy)", kw: ["trabeculectomy", "glaucoma surgery"] }, { n: "Corneal transplant", kw: ["corneal transplant", "keratoplasty"] }, { n: "Pterygium excision", kw: ["pterygium"] }, { n: "Strabismus (squint) surgery", kw: ["strabismus", "squint"] }, { n: "Oculoplastic (eyelid) surgery", kw: ["eyelid surgery", "blepharoplasty"] }],
    mods: A_PLAIN, sides: S_SIDE },

  { cat: "ent", region: "head-neck", autoFlags: [],
    ret: "ENT recovery settles over weeks; avoid heavy straining and nose-blowing (nasal cases) early and follow wound/packing advice.",
    prec: [P("Avoid heavy lifting, straining and (for nasal cases) forceful nose-blowing early.", 3), P("Sleep with the head raised; keep wounds/packing as advised.", 2), P("Watch for heavy bleeding, breathing or swallowing difficulty (seek care).", 2)],
    bases: [{ n: "Septoplasty", kw: ["septoplasty"] }, { n: "Rhinoplasty", kw: ["rhinoplasty"] }, { n: "Endoscopic sinus surgery (FESS)", kw: ["sinus surgery", "fess"] }, { n: "Tympanoplasty", kw: ["tympanoplasty"] }, { n: "Mastoidectomy", kw: ["mastoidectomy"] }, { n: "Cochlear implant", kw: ["cochlear implant"] }, { n: "Adenoidectomy", kw: ["adenoidectomy"] }, { n: "Laryngectomy", kw: ["laryngectomy"] }, { n: "Thyroplasty (voice)", kw: ["thyroplasty"] }, { n: "UPPP (sleep apnea)", kw: ["uvulopalatopharyngoplasty", "uppp"] }],
    mods: A_PLAIN, sides: S_NONE },

  { cat: "transplant", region: "organ", autoFlags: [],
    ret: "Transplant recovery is closely supervised; reconditioning is gradual around immunosuppression — follow your transplant team's plan exactly.",
    prec: [P("Follow your transplant team's activity limits and immunosuppression schedule exactly.", 8), P("Avoid crowds and infection risk; keep meticulous wound and hand hygiene.", 6), P("Report fever, wound problems or graft-area pain promptly.", 4)],
    bases: [{ n: "Kidney transplant", kw: ["kidney transplant", "renal transplant"] }, { n: "Liver transplant", kw: ["liver transplant"] }, { n: "Heart transplant", kw: ["heart transplant"] }, { n: "Lung transplant", kw: ["lung transplant"] }, { n: "Pancreas transplant", kw: ["pancreas transplant"] }, { n: "Combined kidney-pancreas transplant", kw: ["kidney-pancreas transplant"] }, { n: "Corneal transplant", kw: ["corneal graft"] }, { n: "Bone-marrow / stem-cell transplant", kw: ["bone marrow transplant", "stem cell transplant"] }],
    /* Solid-organ / stem-cell transplant is never a day-case keyhole pathway */
    mods: [{ m: "", soft: false }], sides: S_NONE },

  { cat: "vascular_access", region: "vascular", autoFlags: [],
    ret: "Access/endovascular procedures recover within days–weeks; care for the site and avoid heavy lifting with that limb early.",
    prec: [P("Care for the access/incision site; avoid heavy lifting or BP cuffs on a fistula arm.", 4), P("Keep the limb moving gently; watch for swelling, coldness or numbness.", 4), P("Report site bleeding, infection or a lost pulse/thrill promptly.", 2)],
    bases: [{ n: "AV fistula creation (dialysis)", kw: ["av fistula", "dialysis fistula"] }, { n: "AV graft (dialysis)", kw: ["av graft", "dialysis graft"] }, { n: "Central venous port (chemo)", kw: ["venous port", "port-a-cath"] }, { n: "Tunnelled dialysis catheter", kw: ["dialysis catheter"] }, { n: "Venous thrombectomy", kw: ["venous thrombectomy"] }, { n: "Carotid artery stenting", kw: ["carotid stent"] }, { n: "Lower-limb angioplasty & stent", kw: ["angioplasty", "leg stent"] }, { n: "Varicose vein ablation", kw: ["varicose vein", "vein ablation"] }],
    mods: A_ENDO, sides: S_SIDE },
];

/* ===================================================================
   PEDIATRIC families (0–18 yrs). Same shape as FAM, but the third
   dimension is an AGE BAND (not laterality), and each entry gets an
   age-appropriate note. Precautions are kept concise. Education only. */
const PED_AGE = [
  { label: "neonatal (0–1 mo)",     note: "Newborn: all care is parent-led — gentle handling, positioning and feeding support exactly as the team taught." },
  { label: "infant (1–12 mo)",      note: "Infant: keep up gentle developmental play (tummy time, reaching) as allowed; a parent/therapist guides all activity." },
  { label: "toddler (1–3 yr)",      note: "Toddler: expect a gradual return to crawling/walking as healing allows; supervise closely and childproof the space." },
  { label: "preschool (3–5 yr)",    note: "Preschooler: reintroduce play in short, supervised bouts; use games to encourage the prescribed movement." },
  { label: "school-age (6–11 yr)",  note: "School-age: phase back into PE and play on the surgeon's timeline; avoid contact/impact until cleared." },
  { label: "adolescent (12–18 yr)", note: "Adolescent: follow a graded return-to-sport plan with strength/function milestones and clearance." }
];
const PED_CONTEXTS = [
  "day-surgery", "inpatient with parent rooming-in", "enhanced-recovery pathway", "with child-life support",
  "staged reconstruction", "cast/brace in place", "fast-track discharge", "with home-therapy program", "tertiary-centre care", "with school-reintegration plan"
];
const PED_FAM = [
  { cat: "ped_hip", region: "hip", autoFlags: [],
    ret: "Bracing/casting protects the growing hip for weeks; walking and play return gradually on the surgeon's timeline.",
    prec: [P("Keep the hip brace/harness or spica cast on exactly as prescribed.", 8), P("Follow the weight-bearing/positioning rules the surgeon gave (often protected early).", 8), P("Keep the other joints and gentle overall play active as allowed.", 4)],
    bases: [{ n: "DDH closed reduction & spica cast", kw: ["developmental dysplasia", "ddh", "hip dysplasia", "closed reduction hip"] }, { n: "DDH open reduction", kw: ["open reduction hip", "ddh open"] }, { n: "Pemberton osteotomy", kw: ["pemberton osteotomy"] }, { n: "Salter innominate osteotomy", kw: ["salter osteotomy"] }, { n: "Dega osteotomy", kw: ["dega osteotomy"] }, { n: "Femoral varus derotation osteotomy (hip)", kw: ["femoral varus derotation", "vdro"] }, { n: "Perthes containment surgery", kw: ["perthes", "legg-calve-perthes"] }, { n: "SCFE in-situ pinning", kw: ["scfe", "slipped capital femoral epiphysis"] }, { n: "SCFE corrective osteotomy", kw: ["scfe osteotomy"] }, { n: "Pavlik harness treatment (DDH)", kw: ["pavlik harness"] }],
    mods: A_OPEN },
  { cat: "ped_foot", region: "foot / ankle", autoFlags: [],
    ret: "Clubfoot care is bracing-led for months to years; the foot-abduction brace prevents relapse.",
    prec: [P("Keep the casts, or the boots-and-bar (foot-abduction brace), on for the FULL prescribed hours — this prevents relapse.", 0), P("Do the stretches the physio taught between casts.", 6), P("Check the toes for colour, warmth and skin problems under the cast.", 4)],
    bases: [{ n: "Ponseti clubfoot casting", kw: ["clubfoot", "talipes", "ponseti"] }, { n: "Percutaneous Achilles tenotomy (clubfoot)", kw: ["achilles tenotomy", "clubfoot tenotomy"] }, { n: "Posteromedial release (clubfoot)", kw: ["posteromedial release"] }, { n: "Tibialis anterior tendon transfer", kw: ["tibialis anterior tendon transfer", "tatt"] }, { n: "Tarsal coalition resection", kw: ["tarsal coalition"] }, { n: "Congenital vertical talus correction", kw: ["vertical talus"] }, { n: "Clubfoot revision surgery", kw: ["clubfoot revision"] }, { n: "Accessory navicular excision", kw: ["accessory navicular"] }],
    mods: A_PLAIN },
  { cat: "ped_limb", region: "bone", autoFlags: [],
    ret: "Bone healing and (for lengthening) the frame/nail schedule set the pace; motion is kept up throughout.",
    prec: [P("Do the frame/pin care and lengthening turns exactly as taught.", 8), P("Follow weight-bearing limits; keep the knee and ankle moving to prevent stiffness.", 6), P("Keep up the daily stretches to maintain motion during lengthening.", 0)],
    bases: [{ n: "Guided growth (hemiepiphysiodesis / 8-plate)", kw: ["guided growth", "hemiepiphysiodesis", "8-plate"] }, { n: "Limb lengthening (external fixator)", kw: ["limb lengthening", "external fixator", "ilizarov"] }, { n: "Limb lengthening (magnetic nail)", kw: ["magnetic lengthening nail", "precice nail"] }, { n: "Corrective femoral osteotomy (deformity)", kw: ["femoral osteotomy"] }, { n: "Corrective tibial osteotomy (deformity)", kw: ["tibial osteotomy"] }, { n: "Epiphysiodesis (leg-length correction)", kw: ["epiphysiodesis"] }, { n: "Rotational osteotomy (torsion)", kw: ["rotational osteotomy", "derotation osteotomy"] }],
    mods: A_OPEN },
  { cat: "ped_spine", region: "spine", autoFlags: [],
    ret: "Spinal fusion consolidates over months; restrictions ease gradually and contact sport waits for clearance.",
    prec: [P("Follow log-roll and no-bend/lift/twist advice; wear the brace if prescribed.", 12), P("Do your breathing exercises and walk regularly as advised.", 6), P("No contact sport or heavy PE until the surgeon clears you.", 24)],
    bases: [{ n: "Posterior spinal fusion (idiopathic scoliosis)", kw: ["scoliosis", "spinal fusion", "idiopathic scoliosis"] }, { n: "Posterior spinal fusion (neuromuscular scoliosis)", kw: ["neuromuscular scoliosis"] }, { n: "Anterior scoliosis correction", kw: ["anterior scoliosis"] }, { n: "Growing-rods insertion", kw: ["growing rods"] }, { n: "Growing-rods lengthening", kw: ["growing rods lengthening"] }, { n: "VEPTR insertion", kw: ["veptr"] }, { n: "Vertebral body tethering", kw: ["vertebral body tethering", "vbt"] }, { n: "Kyphosis correction (Scheuermann)", kw: ["scheuermann", "kyphosis correction"] }, { n: "Hemivertebra excision", kw: ["hemivertebra"] }, { n: "Tethered cord release", kw: ["tethered cord"] }],
    mods: A_SPINE },
  { cat: "ped_cp", region: "limb", autoFlags: [],
    ret: "Neuromuscular surgery is followed by intensive graded physiotherapy over months.",
    prec: [P("Follow the post-op positioning, casting and bracing plan closely.", 8), P("Begin the physio stretching/strengthening program on schedule — early motion matters.", 6), P("Manage pain and spasticity as advised so therapy can progress.", 4)],
    bases: [{ n: "Selective dorsal rhizotomy (SDR)", kw: ["selective dorsal rhizotomy", "sdr"] }, { n: "Single-event multilevel surgery (SEMLS)", kw: ["single-event multilevel", "semls"] }, { n: "Hamstring lengthening", kw: ["hamstring lengthening"] }, { n: "Gastrocnemius / Achilles lengthening", kw: ["gastrocnemius lengthening", "tendo-achilles lengthening"] }, { n: "Adductor release (hip)", kw: ["adductor release"] }, { n: "Hip reconstruction (cerebral palsy)", kw: ["hip reconstruction", "cerebral palsy hip"] }, { n: "Femoral derotation osteotomy (CP)", kw: ["femoral derotation"] }, { n: "Tendon transfer (cerebral palsy)", kw: ["tendon transfer cp"] }, { n: "Intrathecal baclofen pump", kw: ["baclofen pump"] }],
    mods: A_OPEN },
  { cat: "ped_upper", region: "hand / wrist", autoFlags: [],
    ret: "Hand/arm recovery is early-motion led; splinting protects the repair while gentle movement returns.",
    prec: [P("Keep the splint or cast on as prescribed; keep the fingers moving to prevent stiffness.", 3), P("Avoid rough play, gripping or weight-bearing through the arm early.", 4), P("Do the gentle motion exercises the hand therapist taught.", 4)],
    bases: [{ n: "Syndactyly release", kw: ["syndactyly"] }, { n: "Polydactyly excision", kw: ["polydactyly"] }, { n: "Paediatric trigger thumb release", kw: ["trigger thumb"] }, { n: "Radial club-hand correction", kw: ["radial club hand", "radial dysplasia"] }, { n: "Supracondylar humerus fracture fixation", kw: ["supracondylar", "supracondylar humerus"] }, { n: "Both-bone forearm fracture fixation", kw: ["both-bone forearm", "forearm fracture"] }, { n: "Brachial plexus (Erb's palsy) reconstruction", kw: ["brachial plexus", "erb's palsy"] }, { n: "Pollicization", kw: ["pollicization"] }, { n: "Upper-limb tendon transfer", kw: ["upper limb tendon transfer"] }],
    mods: A_HAND },
  { cat: "ped_sports", region: "knee", autoFlags: [],
    ret: "Adolescent sports surgery follows a milestone-based return over ~6–12 months with clearance.",
    prec: [P("Wear your brace and follow the weight-bearing and motion limits.", 6), P("Regain full motion and quad / rotator-cuff activation early.", 6), P("No pivoting or contact sport until strength and function milestones are met.", 24)],
    bases: [{ n: "Physeal-sparing ACL reconstruction", kw: ["physeal-sparing acl", "acl reconstruction"] }, { n: "Transphyseal ACL reconstruction", kw: ["transphyseal acl"] }, { n: "MPFL reconstruction (patellar stabilisation)", kw: ["mpfl reconstruction", "patellar stabilisation"] }, { n: "Tibial spine fracture fixation", kw: ["tibial spine"] }, { n: "OCD fixation / drilling (knee)", kw: ["osteochondritis dissecans", "ocd knee"] }, { n: "Meniscus repair (adolescent)", kw: ["meniscus repair"] }, { n: "Adolescent shoulder stabilisation", kw: ["shoulder stabilisation"] }, { n: "Discoid meniscus saucerization", kw: ["discoid meniscus"] }],
    mods: A_SCOPE },
  { cat: "ped_cardiac", region: "heart", autoFlags: ["cardiac"],
    ret: "Chest/sternal precautions last about 6 weeks; the cardiology team guides the return to activity and sport.",
    prec: [P("Chest precautions: no lifting the child under the arms, and limit pulling-up and overhead reaching for ~6 weeks.", 6), P("Support the chest with a small pillow when coughing; keep the wound clean and dry.", 6), P("Attend cardiology follow-up; progress activity gently as the team advises.", 6)],
    bases: [{ n: "Ventricular septal defect (VSD) repair", kw: ["vsd repair", "ventricular septal defect"] }, { n: "Atrial septal defect (ASD) repair", kw: ["asd repair", "atrial septal defect"] }, { n: "Tetralogy of Fallot repair", kw: ["tetralogy of fallot", "tof repair"] }, { n: "Coarctation of the aorta repair", kw: ["coarctation"] }, { n: "PDA ligation", kw: ["patent ductus", "pda ligation"] }, { n: "Arterial switch operation (TGA)", kw: ["arterial switch", "transposition great arteries"] }, { n: "Norwood procedure", kw: ["norwood"] }, { n: "Glenn (bidirectional) procedure", kw: ["glenn procedure"] }, { n: "Fontan procedure", kw: ["fontan"] }, { n: "Atrioventricular canal repair", kw: ["av canal", "atrioventricular septal defect"] }, { n: "Ross procedure", kw: ["ross procedure"] }, { n: "Congenital valve repair", kw: ["congenital valve"] }],
    mods: A_CARD },
  { cat: "ped_neuro", region: "brain", autoFlags: [],
    ret: "Neurosurgical recovery is closely supervised and symptom-guided; follow the team's timeline exactly.",
    prec: [P("Follow the neurosurgery team's positioning and activity limits closely.", 6), P("Avoid straining, rough play and head-down positions early.", 6), P("Watch for shunt/wound problems — vomiting, drowsiness, headache or wound swelling (seek care).", 0)],
    bases: [{ n: "VP shunt insertion", kw: ["vp shunt", "ventriculoperitoneal shunt"] }, { n: "VP shunt revision", kw: ["shunt revision"] }, { n: "Endoscopic third ventriculostomy (ETV)", kw: ["endoscopic third ventriculostomy", "etv"] }, { n: "Myelomeningocele (spina bifida) closure", kw: ["myelomeningocele", "spina bifida"] }, { n: "Chiari decompression", kw: ["chiari"] }, { n: "Craniosynostosis repair (strip craniectomy)", kw: ["craniosynostosis", "strip craniectomy"] }, { n: "Craniosynostosis repair (cranial vault remodelling)", kw: ["cranial vault remodelling", "cranial vault remodeling"] }, { n: "Encephalocele repair", kw: ["encephalocele"] }, { n: "Spinal lipoma resection", kw: ["spinal lipoma"] }],
    mods: [{ m: "", soft: false }, { m: "endoscopic", soft: true }, { m: "revision", soft: false }] },
  { cat: "ped_general", region: "abdomen", autoFlags: [],
    ret: "Most children return to gentle activity within 1–2 weeks; rough or impact play waits a little longer.",
    prec: [P("No heavy lifting or vigorous/rough play for the advised period; keep the wound clean.", 3), P("Keep young children off ride-on toys and climbing early; supervise closely.", 3), P("Watch for fever, wound redness or discharge, or feeding problems (seek care).", 2)],
    bases: [{ n: "Inguinal hernia repair (paediatric)", kw: ["inguinal hernia"] }, { n: "Umbilical hernia repair (paediatric)", kw: ["umbilical hernia"] }, { n: "Pyloromyotomy (pyloric stenosis)", kw: ["pyloromyotomy", "pyloric stenosis"] }, { n: "Appendectomy (paediatric)", kw: ["appendectomy"] }, { n: "Orchidopexy (undescended testis)", kw: ["orchidopexy", "undescended testis"] }, { n: "Hypospadias repair", kw: ["hypospadias"] }, { n: "Nissen fundoplication (paediatric)", kw: ["fundoplication", "nissen"] }, { n: "Gastrostomy (feeding tube)", kw: ["gastrostomy", "g-tube"] }, { n: "Hirschsprung pull-through", kw: ["hirschsprung", "pull-through"] }, { n: "Imperforate anus repair", kw: ["imperforate anus", "anorectal malformation"] }, { n: "Intussusception reduction", kw: ["intussusception"] }, { n: "Ladd procedure (malrotation)", kw: ["ladd procedure", "malrotation"] }, { n: "Hydrocele repair (paediatric)", kw: ["hydrocele"] }, { n: "Circumcision", kw: ["circumcision"] }],
    mods: A_LAP },
  { cat: "ped_ent_cranio", region: "head-neck", autoFlags: [],
    ret: "ENT/craniofacial recovery settles over 1–3 weeks; follow the feeding and activity advice closely.",
    prec: [P("Follow feeding, wound and (for cleft) arm-restraint/splint advice exactly.", 3), P("Avoid straining, hard or sharp foods, and rough play as advised.", 3), P("Watch for bleeding, breathing or swallowing trouble, or wound problems (seek care).", 2)],
    bases: [{ n: "Tonsillectomy (paediatric)", kw: ["tonsillectomy"] }, { n: "Adenoidectomy", kw: ["adenoidectomy"] }, { n: "Myringotomy & ear tubes (grommets)", kw: ["grommets", "ear tubes", "myringotomy"] }, { n: "Cochlear implant (paediatric)", kw: ["cochlear implant"] }, { n: "Cleft lip repair", kw: ["cleft lip"] }, { n: "Cleft palate repair", kw: ["cleft palate"] }, { n: "Tongue-tie (frenotomy)", kw: ["tongue-tie", "frenotomy"] }, { n: "Microtia (ear) reconstruction", kw: ["microtia"] }, { n: "Choanal atresia repair", kw: ["choanal atresia"] }, { n: "Mandibular distraction", kw: ["mandibular distraction"] }],
    mods: A_PLAIN }
];

/* ---- enumerate ---- */
function buildFamily(f) {
  const out = [];
  for (const base of f.bases) {
    for (const mod of f.mods) {
      for (const side of f.sides) {
        let name = base.n + (mod.m ? ` — ${mod.m}` : "") + (side ? ` (${side})` : "");
        let prec = mod.soft ? soften(f.prec) : f.prec.map(p => ({ t: p.t, w: p.w }));
        if (side === "Bilateral") prec = prec.concat([P("Both sides were operated — transfers and mobility are harder; arrange extra help and progress slowly.", 6)]);
        let ret = f.ret + (mod.soft ? " Keyhole/robotic approaches often recover a little faster — still follow your surgeon's timeline." : "");
        const kw = [...new Set(base.kw)];
        out.push({ name, cat: f.cat, region: f.region, autoFlags: f.autoFlags.slice(), match: kw, precautions: prec, ret });
      }
    }
  }
  return out;
}

// pediatric enumeration: third dimension is an AGE BAND, plus an age note
function buildPedFamily(f) {
  const out = [];
  for (const base of f.bases) {
    for (const mod of f.mods) {
      for (const age of PED_AGE) {
        const name = base.n + (mod.m ? ` — ${mod.m}` : "") + ` · age ${age.label}`;
        const prec = (mod.soft ? soften(f.prec) : f.prec.map(p => ({ t: p.t, w: p.w }))).concat([P(age.note, 0)]);
        const ret = f.ret + (mod.soft ? " Keyhole/minimally invasive approaches often recover a little faster — still follow the surgeon's timeline." : "");
        out.push({ name, cat: f.cat, region: f.region, autoFlags: f.autoFlags.slice(), match: [...new Set(base.kw)], precautions: prec, ret });
      }
    }
  }
  return out;
}

// round-robin interleave families, cap at `target`, then top up with context variants
function assemble(perFamLists, target, contexts) {
  const interleaved = [];
  let idx = 0, remaining = true;
  while (remaining) {
    remaining = false;
    for (const list of perFamLists) { if (idx < list.length) { interleaved.push(list[idx]); remaining = true; } }
    idx++;
  }
  const seen = new Set(), out = [];
  for (const s of interleaved) {
    if (seen.has(s.name) || out.length >= target) continue;
    seen.add(s.name);
    out.push({ ...s, matchSrc: s.match.map(t => "\\b" + esc(t) + "\\b").join("|") });
  }
  outer:
  for (const ctx of contexts) {
    for (const s of interleaved) {
      if (out.length >= target) break outer;
      const name = s.name + " — " + ctx;
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ ...s, name, matchSrc: s.match.map(t => "\\b" + esc(t) + "\\b").join("|") });
    }
  }
  return out.slice(0, target);
}

const ADULT_CONTEXTS = [
  "day-case / outpatient", "inpatient recovery", "enhanced-recovery (ERAS) pathway",
  "with regional anaesthesia", "with general anaesthesia", "image-guided",
  "with a nerve block", "staged procedure", "revision setting", "high-dependency recovery"
];

const adult = assemble(FAM.map(buildFamily), TARGET, ADULT_CONTEXTS);
const ped   = assemble(PED_FAM.map(buildPedFamily), TARGET, PED_CONTEXTS);
const surgeries = adult.concat(ped);   // 10,000 adult + 10,000 paediatric (0–18 yr)

/* ---- emit data/surgeries.js ----
   The long `ret`, `precautions` and `match` values repeat across the many
   context-variants of each base, so dedupe them into shared arrays (_R/_P/_M)
   and reference by index. Transparent to the app: each entry still exposes a
   real string / array / RegExp — this just shrinks the file ~5x. */
const retList = [], retMap = new Map();
const precList = [], precMap = new Map();
const matchList = [], matchMap = new Map();
const retIdx = r => { if (!retMap.has(r)) { retMap.set(r, retList.length); retList.push(r); } return retMap.get(r); };
const precIdx = p => { const k = JSON.stringify(p); if (!precMap.has(k)) { precMap.set(k, precList.length); precList.push(p); } return precMap.get(k); };
const matchIdx = m => { if (!matchMap.has(m)) { matchMap.set(m, matchList.length); matchList.push(m); } return matchMap.get(m); };

const rows = surgeries.map((s, i) =>
  `{id:"sg${i + 1}",name:${JSON.stringify(s.name)},cat:${JSON.stringify(s.cat)},region:${JSON.stringify(s.region)},autoFlags:${JSON.stringify(s.autoFlags)},match:_M[${matchIdx(s.matchSrc)}],precautions:_P[${precIdx(s.precautions)}],ret:_R[${retIdx(s.ret)}]}`);

const preludeR = `var _R=${JSON.stringify(retList)};`;
const preludeP = `var _P=[${precList.map(p => "[" + p.map(x => `{t:${JSON.stringify(x.t)},w:${x.w}}`).join(",") + "]").join(",")}];`;
const preludeM = `var _M=[${matchList.map(src => `/${src}/i`).join(",")}];`;

const banner = `/* PhysioPath surgical-procedure database — GENERATED by scripts/generate-surgeries.mjs.
   ${rows.length} procedures (${adult.length} adult + ${ped.length} paediatric, 0–18 yr) across
   orthopedic, spine, cardiac, vascular, thoracic, abdominal, pelvic, neuro, ENT/craniofacial,
   congenital and soft-tissue surgery. General education only — a surgeon's own protocol always
   takes precedence. Do not edit by hand. */`;

const body = `${banner}\n${preludeR}\n${preludeP}\n${preludeM}\nwindow.SURGERY_DB=[\n${rows.join(",\n")}\n];\n`;
const outPath = join(__dirname, "..", "data", "surgeries.js");
writeFileSync(outPath, body);
console.log(`Wrote ${rows.length} surgeries (${adult.length} adult + ${ped.length} paediatric) to ${outPath} (${(body.length / 1024 / 1024).toFixed(2)} MB; ${retList.length} rets, ${precList.length} prec-sets, ${matchList.length} matchers deduped)`);
