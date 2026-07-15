/* Generate data/surgery-plans.js — realistic post-operative TIMELINES for the
   whole surgical catalogue (data/surgeries.js, ~20,000 procedures). When a user
   picks a surgery in the Details step, the plan should follow what was actually
   DONE — a bone cut, a tendon reattached to bone, a joint replaced and a keyhole
   washout have very different healing clocks and restrictions.

   Surgeries are generated from ~51 families × bases × approaches × sides, so a
   regex per surgical family covers the whole catalogue, and a generic post-op
   fallback catches anything else.

   Same emitted shape as data/plans.js (regexes as SOURCE strings, compiled in
   app.js): { r, label, total, freq, note, generic?, variants, ph:[[t,ws,we,g,c,rst]×4] }
   Education only — the operating surgeon's protocol always overrides.
   Dependency-free & deterministic. */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "surgery-plans.js");

const out = [];
const seen = new Set();
const add = (p) => { const k = p.r.toLowerCase(); if (seen.has(k)) return; seen.add(k); out.push(p); };

/* variations that apply to almost any operation */
const SURG_VARIANTS = (extra = []) => ([
  { k:"standard", label:"Standard", sub:"Uncomplicated, progressing as expected", scale:1 },
  { k:"keyhole", label:"Keyhole / minimally invasive", sub:"Arthroscopic or laparoscopic", pick:"arthroscop|keyhole|laparoscop|minimally invasive|percutaneous|robotic", scale:0.8,
    note:"Keyhole approaches damage less soft tissue, so early recovery is quicker — but what was done INSIDE still heals at its own speed. A small scar doesn't mean a short protocol." },
  { k:"open", label:"Open procedure", sub:"Formal open approach", pick:"\\bopen\\b|mini-?open", scale:1.15,
    note:"An open approach means more soft-tissue healing and a slower early recovery, even when the internal repair is identical." },
  { k:"revision", label:"Revision / complex", sub:"Repeat surgery or a complex case", pick:"revision|complex|redo", scale:1.4,
    note:"Revision surgery is slower and less predictable — tissue quality is poorer, and your surgeon's restrictions are usually stricter and longer." },
  { k:"athlete", label:"Return-to-sport focus", sub:"Competitive sport is the goal", pick:"athlet|return-to-sport", scale:1.15,
    note:"Returning to sport needs more than a healed wound: strength within ~10% of the other side and passing sport-specific testing. The extra weeks are the return-to-sport phase, not extra healing." },
  { k:"older", label:"Older adult", sub:"Slower healing; bone & falls matter too", pick:"older adult|elderly", scale:1.25,
    note:"Healing is slower with age and strength is lost faster during the protected phase — balance and bone-loading work get ADDED here, not dropped." },
  { k:"decond", label:"Deconditioned / low fitness", sub:"Low baseline fitness", pick:"deconditioned|low fitness", scale:1.3,
    note:"From a low base, build general capacity alongside the operated area — being fitter before and after surgery measurably improves outcomes." },
  ...extra
]);
const SLOWHEAL = { k:"slowheal", label:"Slower healing expected", sub:"Diabetes, smoking, steroids or poor tissue", pick:"diabet|smoker", scale:1.3,
  note:"Diabetes, smoking, steroids and poor nutrition all measurably slow wound and bone healing — expect a longer protocol and stop smoking if you possibly can; it roughly doubles non-union risk." };

/* ---------------- surgical archetypes ---------------- */
const A = {};

/* keyhole joint surgery — quick, swelling-guided */
A.scope = (s) => ({
  total: 12, freq:"Short sessions several times daily early, then 4–5/week",
  note:`${s.label}: keyhole surgery, so the skin heals fast — but recovery is paced by what was done inside the joint and by swelling. Swelling after activity is your best guide to whether you did too much.`,
  variants: SURG_VARIANTS(),
  ph:[
    ["Settle swelling & restore motion",0,1,`Control swelling and get the ${s.part} moving.`,"swelling and pain settling, wound dry, range returning, walking/using it more normally",`Elevate and use ice for swelling. Follow your weight-bearing status.${s.extra ? " " + s.extra : ""}`],
    ["Full range & activation",1,3,"Restore full range and switch the muscles back on.","full or near-full range, good muscle activation, minimal swelling","Swelling that lasts overnight means you overdid it — step back a level."],
    ["Progressive strengthening",3,8,"Rebuild strength and function.","strength ≥80% of the other side, no swelling after loading","Build load steadily; add impact only when swelling-free."],
    ["Return to full activity",8,12,"Restore full capacity and return to sport/work.","strength near-symmetrical, confident with your activities","Most people return to sport around 6–12 weeks, but what was repaired inside decides — check with your surgeon."]]
});

/* joint replacement */
A.arthroplasty = (s) => ({
  total: 26, freq:"Short sessions several times daily early, then 4–5/week",
  note:`${s.label}: an implant replaces the worn joint surfaces. Early motion and walking matter most; the implant is solid from day one, but the soft tissues around it need weeks to settle. Most improvement is in the first 3 months, with gains continuing for a year.`,
  variants: SURG_VARIANTS([SLOWHEAL]),
  ph:[
    ["Early motion, swelling & walking",0,2,`Get the ${s.part} moving and walk safely.`,"walking with your aid, wound healing, early range targets met, transfers independent",`Follow your weight-bearing status and any joint precautions your surgeon gave you.${s.extra ? " " + s.extra : ""}`],
    ["Range, gait & early strength",2,6,"Push range, walk without aids, rebuild strength.","walking without aids or a limp, range targets met, stairs with a rail","Range gained in these first weeks is much easier than range chased later — this is the window."],
    ["Strength & function",6,12,"Build strength and normal daily function.","sit-to-stand without hands, reciprocal stairs, comfortable daily activity","Discomfort and swelling for several months is normal and does not mean harm."],
    ["Endurance & return to activity",12,26,"Restore endurance and low-impact activity.","near-normal function, good strength, comfortable with your usual activities","Low-impact activity is encouraged for implant longevity; running and impact sport generally are not, unless your surgeon clears it."]]
});

/* ligament reconstruction (graft must revascularise) */
A.ligrecon = (s) => ({
  total: 39, freq:"Daily home work + supervised sessions early on",
  note:`${s.label}: the graft is strongest the day it's fixed, then WEAKENS as it re-vascularises around 6–12 weeks before remodelling and strengthening over months. That biology — not how good you feel — is why the timeline is long and criteria-driven.`,
  variants: SURG_VARIANTS([SLOWHEAL]),
  ph:[
    ["Protect the graft & activate",0,2,"Protect the reconstruction, settle swelling, activate the muscles.","full passive extension/range as allowed, good muscle activation with no lag, swelling settling",`Brace and weight-bearing exactly as your surgeon directs. Avoid the direction of stress the graft was put in to resist.${s.extra ? " " + s.extra : ""}`],
    ["Range, gait & early strength",2,6,"Restore full range and normal walking; build base strength.","full range, walking without aids or a limp, minimal swelling","No twisting, pivoting or cutting. Closed-chain strengthening only."],
    ["Progressive strengthening",6,12,"Build strength and single-limb control — through the graft's weakest window.","strength ≥70–80% of the other side, good single-limb control, no swelling with loading","This is when the graft is biologically weakest — feeling good is not permission to load it hard."],
    ["Return to running, agility & sport",12,39,"Restore power, then running, cutting and sport.","strength ≥90%, hop battery ≥90%, confident cutting, plus surgeon clearance","Return to pivoting sport is typically 9–12 months; going early markedly raises re-rupture risk."]]
});

/* tendon reattached to bone (cuff, distal biceps, patellar/quads tendon…) */
A.tendonbone = (s) => ({
  total: 26, freq:"Little and often — several short sessions daily early",
  note:`${s.label}: a tendon has been reattached to bone, and tendon-to-bone healing is slow. That's why active movement and loading are delayed — pushing early risks the repair pulling off, which is the main complication and the hardest thing to fix.`,
  variants: SURG_VARIANTS([SLOWHEAL,
    { k:"early", label:"Early-motion protocol", sub:"Only if your surgeon specifies it", pick:"early motion|accelerated", scale:0.8,
      note:"Some surgeons use early-motion protocols for small, secure repairs. Only follow this if it is YOUR surgeon's instruction." }]),
  ph:[
    ["Protected / passive phase",0,6,"Protect the repair; prevent stiffness with passive movement only.","passive range progressing per protocol, pain settling, using your sling/splint as directed",`Sling or splint as directed. PASSIVE movement only — no active lifting, no resisted work and no weight through the limb.${s.extra ? " " + s.extra : ""}`],
    ["Active movement returns",6,12,"Regain active movement as the repair consolidates.","near-full passive range, active movement without compensating, pain settling","Active movement WITHOUT resistance. No lifting or loaded reaching — the repair is healing but not yet strong."],
    ["Progressive strengthening",12,16,"Start and build strength.","full active range, good control, strength returning without pain","Light resisted work only, built up gradually — the tendon-bone junction is still maturing."],
    ["Strength, endurance & return",16,26,"Restore strength and return to full activity.","strength approaching the other side, comfortable with your demands, surgeon clearance","Return to heavy lifting or overhead/loaded sport is usually 4–6 months or more."]]
});

/* fracture fixation */
A.orif = (s) => ({
  total: 24, freq:"Short frequent sessions while protected, then 4–5/week",
  note:`${s.label}: the bone is held by metalwork while it unites — the metal does NOT make it strong immediately, it just holds the position. Union takes roughly 6–12 weeks, and strength and function take considerably longer.`,
  variants: SURG_VARIANTS([SLOWHEAL,
    { k:"nonunion", label:"Slow / non-union", sub:"Not healing on schedule", pick:"non-?union|delayed", scale:1.6,
      note:"Delayed or non-union needs medical review — smoking, diabetes, poor nutrition, NSAIDs and inadequate fixation all slow bone healing." }]),
  ph:[
    ["Protected healing",0,6,"Protect the fixation and keep everything else moving.","wound healed, X-ray showing healing on review, neighbouring joints staying mobile",`Follow your weight-bearing status EXACTLY — metalwork can bend, loosen or break if you load it before the bone unites. Move the joints above and below to prevent stiffness.${s.extra ? " " + s.extra : ""}`],
    ["Union & restoring range",6,9,"Regain motion as union is confirmed.","union confirmed by your surgeon, range improving, swelling settling","Progress loading only once union is confirmed — on X-ray, not on the calendar."],
    ["Progressive strengthening",9,14,"Rebuild strength and load tolerance.","strength improving, normal daily function returning","Load progressively — bone gets stronger with graded loading once united."],
    ["Return to full activity",14,24,"Restore full strength and return to your activities.","strength approaching the other side, confident with your activities","Impact and sport only once cleared; bone keeps remodelling for months after union. Metalwork is often left in unless it irritates."]]
});

/* bone cut & realigned */
A.osteotomy = (s) => ({
  total: 39, freq:"Short frequent sessions while protected, then progressive strengthening",
  note:`${s.label}: the bone has been deliberately cut and realigned, then fixed. It is a bone-healing timeline — the cut must unite before it can take load, and loading it early risks losing the correction or fracturing through the site.`,
  variants: SURG_VARIANTS([SLOWHEAL]),
  ph:[
    ["Protect the osteotomy",0,6,"Protect the bone cut, control swelling, keep the muscles active.","wound healed, swelling settling, protected range achieved, muscles activating without lag",`Weight-bearing and brace EXACTLY as your surgeon directs — the correction is held by metalwork until the bone unites, and loading early can lose it.${s.extra ? " " + s.extra : ""}`],
    ["Union & motion",6,12,"Restore motion and progress loading as union is confirmed.","surgeon confirms union on X-ray, full weight-bearing without aids, range restored","Progress weight-bearing only on your surgeon's confirmation of union — not by the calendar."],
    ["Progressive strengthening",12,24,"Rebuild strength through full range.","strength ≥70–80% of the other side, good control, no pain at the osteotomy site","Add impact only once union is solid. Pain at the cut site with loading means back off and be reviewed."],
    ["Return to sport & full loading",24,39,"Restore power and return to your activities.","strength ≥90%, no pain at the site with impact, surgeon clearance","Return to sport is typically 6–12 months. Prominent metalwork sometimes needs removal later, usually after a year."]]
});

/* fusion / arthrodesis (incl. spinal) */
A.fusion = (s) => ({
  total: 39, freq:"Walking daily; strengthening once your surgeon allows",
  note:`${s.label}: two bones are being fused into one. Success depends on the fusion consolidating, which takes months — the early restrictions exist to let bone bridge across, and the fused segment will not move again.`,
  variants: SURG_VARIANTS([SLOWHEAL]),
  ph:[
    ["Protect the fusion",0,6,"Protect the fusion and get moving safely.","wound healed, walking increasing steadily, pain settling",`No bending, lifting or twisting ('BLT') and follow any brace/weight-bearing rules for as long as your surgeon specifies. Walking is your main exercise. Smoking dramatically increases the risk the fusion fails.${s.extra ? " " + s.extra : ""}`],
    ["Early consolidation",6,12,"Build walking tolerance and gentle activity.","walking comfortably for 20–30 minutes, pain steadily improving","Still no heavy lifting or twisting. Progress only as your surgeon lifts each restriction."],
    ["Strengthening as fusion consolidates",12,24,"Rebuild strength around the fused segment.","surgeon confirms the fusion is consolidating, tolerating progressive strengthening","Reintroduce loading gradually; the joints next to a fusion take extra strain, so keep them strong and mobile."],
    ["Return to full activity",24,39,"Restore full capacity within the fusion's limits.","confident with your activities, fusion solid on review","Impact and heavy loading only once the fusion is confirmed solid. Expect a permanent loss of movement at the fused segment."]]
});

/* nerve decompression */
A.decompress = (s) => ({
  total: 12, freq:"Daily gentle movement + nerve glides",
  note:`${s.label}: the pressure has been taken off the nerve. Symptoms often ease quickly, but a nerve that was compressed for a long time recovers slowly (about 1 mm/day), so numbness and weakness can take months to improve — and may not fully.`,
  variants: SURG_VARIANTS([
    { k:"severe", label:"Long-standing compression", sub:"Wasting or constant numbness before surgery", pick:"severe|wasting|chronic", scale:1.4,
      note:"If the nerve was compressed for a long time (muscle wasting, constant numbness), recovery is slower and may be incomplete — the operation stops further damage, but the nerve still has to regrow." }]),
  ph:[
    ["Wound healing & gentle movement",0,2,"Protect the wound and keep things gently moving.","wound healing, night symptoms improving, gentle movement comfortable",`Keep the wound dry and clean. Move gently — early motion prevents the nerve scarring down again.${s.extra ? " " + s.extra : ""}`],
    ["Nerve gliding & scar management",2,6,"Restore nerve mobility and settle the scar.","scar softening, symptoms reducing, full gentle range","Nerve glides should not increase symptoms. Scar massage once healed; pillar/scar tenderness is normal for months."],
    ["Strength & function",6,9,"Rebuild strength and function.","grip/strength improving, using it normally for daily tasks","Build grip and loading gradually — the scar and pillar area stay tender for a while."],
    ["Return to full use",9,12,"Restore full strength and activity.","strength near-normal, symptoms settled or clearly improving","Residual numbness can keep improving for 12+ months. Fix the ergonomics or habit that caused it."]]
});

/* spinal decompression / discectomy */
A.discectomy = (s) => ({
  total: 20, freq:"Walking daily, little and often; strengthening from ~6 weeks",
  note:`${s.label}: the pressure has been taken off the nerve. Leg/arm pain usually settles quickly — often immediately — but back pain and the disc itself take longer. Early graded activity gives better outcomes than prolonged rest.`,
  variants: SURG_VARIANTS([
    { k:"reherniation", label:"Repeat / re-herniation", sub:"Second operation at the same level", pick:"revision|re-?herniat|recurrent", scale:1.4,
      note:"Re-herniation is most likely in the first 3 months — that's exactly why the early bending and lifting limits matter." }]),
  ph:[
    ["Wound healing & walking",0,2,"Protect the healing disc and start walking.","wound healed, limb pain much improved, walking short distances comfortably",`No bending, lifting (over ~2–5 kg) or twisting for the period your surgeon specifies — usually ~6 weeks. Walk little and often; do not sit for long stretches.${s.extra ? " " + s.extra : ""}`],
    ["Restore movement",2,6,"Restore comfortable movement and build walking tolerance.","walking 20–30 minutes comfortably, limb pain settled, sitting tolerance improving","Keep respecting the lifting/bending limits — re-herniation risk is highest right now."],
    ["Progressive strengthening",6,12,"Build trunk, hip and leg strength.","tolerating progressive strengthening and lifting practice, minimal limb symptoms","Reintroduce loaded bending and lifting gradually once your surgeon lifts the restrictions."],
    ["Return to full activity",12,20,"Restore full capacity for work, lifting and sport.","confident with lifting and your activities, symptoms settled","Ongoing exercise is the best protection. Returning limb pain or new weakness needs prompt review."]]
});

/* soft-tissue release / minor soft-tissue procedures */
A.release = (s) => ({
  total: 12, freq:"Little and often — frequent short sessions",
  note:`${s.label}: the tight or trapped tissue has been released. The range gained in theatre is only kept if you use it — the window to hold onto it is short, so frequent movement in the first weeks is the whole point.`,
  variants: SURG_VARIANTS(),
  ph:[
    ["Wound healing & early motion",0,2,"Protect the wound while moving frequently through the new range.","wound healing, holding the range gained at surgery","Move little and often through the range you gained — this is the window, and it closes. Splint as directed."+(s.extra ? " " + s.extra : "")],
    ["Range & scar management",2,6,"Keep the range and settle the scar.","range maintained or improving, scar softening","Scar massage once healed; sustained gentle stretch beats occasional forcing."],
    ["Strength through the new range",6,9,"Strengthen into the range you gained.","good strength through the new range","Range you can't control, you lose — strengthen into all of it."],
    ["Return to full function",9,12,"Restore full function.","functional range and strength for your daily tasks","Keep a maintenance stretch/movement routine — recurrence of tightness is the main risk."]]
});

/* cardiac surgery via sternotomy */
A.cardiacsurg = (s) => ({
  total: 26, freq:"Short walks several times daily early, building to 150 min/week",
  note:`${s.label}: the breastbone was divided and wired, and it takes about 8 weeks to heal. Cardiac rehab after heart surgery measurably reduces death and re-admission — it is one of the most effective things you can do.`,
  variants: SURG_VARIANTS([SLOWHEAL,
    { k:"valve", label:"Valve surgery", sub:"Valve repair or replacement", pick:"valve|mitral|aortic|tricuspid", scale:1.05,
      note:"After valve surgery, if you're on warfarin take extra care with falls and contact; mechanical valves need lifelong anticoagulation." },
    { k:"minimal", label:"Minimally invasive / TAVI", sub:"No sternotomy", pick:"tavi|tavr|percutaneous|mini-?thoracotom|transcatheter", scale:0.6,
      note:"Without a sternotomy there are NO sternal precautions — recovery is much quicker and you can use your arms normally. Follow any groin/access-site restrictions instead." }]),
  ph:[
    ["Sternal protection & early walking",0,2,"Protect the breastbone and re-establish gentle walking.","walking short distances several times a day, wound healing, understanding your warning symptoms",`STERNAL PRECAUTIONS ~8 weeks: no pushing, pulling or lifting over ~2–4 kg, no loaded arms overhead, no pushing up out of a chair with your arms — hug a pillow to brace your chest when you cough. STOP for chest pain, unusual breathlessness or dizziness.${s.extra ? " " + s.extra : ""}`],
    ["Building activity within sternal limits",2,8,"Build walking and everyday activity while the sternum heals.","walking 20–30 minutes comfortably, no wound or sternal instability (clicking/movement)","Sternal precautions still apply. Report any clicking, grinding or movement in the breastbone. Keep effort at RPE 11–13; no driving until cleared (usually ~4–6 weeks)."],
    ["Structured cardiac rehab",8,14,"Now the sternum has healed, build aerobic capacity and strength.","30+ minutes of continuous moderate aerobic exercise, tolerating resistance training","Sternal precautions lift around 8 weeks — reintroduce upper-body loading gradually, not all at once. Avoid breath-holding/straining when lifting."],
    ["Long-term maintenance",14,26,"Make it lifelong and manage your risk factors.","≥150 min/week of moderate activity sustained, risk factors managed","The benefit only lasts while the exercise does. Blood pressure, lipids, glucose, smoking and weight all need managing alongside."]]
});

/* thoracic / lung surgery */
A.thoracic = (s) => ({
  total: 16, freq:"Breathing exercises several times daily + daily walking",
  note:`${s.label}: after chest surgery the main early risk is a chest infection, and the single most effective prevention is breathing exercises and getting up and walking. Shoulder stiffness on the operated side is the other common, avoidable problem.`,
  variants: SURG_VARIANTS([SLOWHEAL]),
  ph:[
    ["Breathing, walking & shoulder motion",0,2,"Keep the lungs clear, start walking, keep the shoulder moving.","doing breathing exercises hourly, walking several times a day, shoulder moving through full range",`Deep breathing and supported coughing EVERY hour while awake — this prevents pneumonia. Move the shoulder on the operated side daily or it stiffens fast.${s.extra ? " " + s.extra : ""}`],
    ["Building activity",2,6,"Build walking endurance and restore posture.","walking 20–30 minutes, full shoulder range, breathlessness improving","Avoid heavy lifting while the chest wall heals. Breathlessness on exertion is expected and improves."],
    ["Aerobic & strength building",6,12,"Rebuild aerobic capacity and strength.","clear gains in walking distance, tolerating resistance work","Build gradually; expect exercise capacity to be reduced if lung tissue was removed."],
    ["Return to activity",12,16,"Restore your usual activity.","back to your usual activities, sustainable exercise routine","Ongoing aerobic exercise keeps improving breathlessness — and stopping smoking matters more than anything else you can do."]]
});

/* abdominal / pelvic surgery */
A.abdominal = (s) => ({
  total: 16, freq:"Walking daily; core work reintroduced gradually",
  note:`${s.label}: the abdominal wall needs about 6–8 weeks to regain strength. The early rules exist to prevent a hernia through the healing wound — walking and breathing are the treatment in the meantime.`,
  variants: SURG_VARIANTS([SLOWHEAL,
    { k:"csection", label:"Caesarean section", sub:"Post-natal recovery", pick:"caesarean|cesarean|c-?section", scale:1,
      note:"After a caesarean you're also lifting and feeding a baby — brace your abdomen when you cough or get up, and rebuild deep core and pelvic floor before any abdominal loading. Get any leaking, heaviness or doming checked by a pelvic-health physio." },
    { k:"hernia", label:"Hernia repair", sub:"With or without mesh", pick:"hernia|mesh", scale:0.9,
      note:"After a hernia repair, avoid anything that spikes abdominal pressure (heavy lifting, straining, constipation) while the repair integrates — and manage a cough or constipation actively, since both push the repair." }]),
  ph:[
    ["Wound protection, walking & breathing",0,2,"Protect the wound, keep the lungs clear, start walking.","wound healing, walking short distances several times a day, bowels moving comfortably",`NO lifting over ~2–5 kg, no sit-ups, crunches, planks or straining — all push against the healing wound. Brace/support your abdomen when you cough, sneeze or get up. Avoid constipation.${s.extra ? " " + s.extra : ""}`],
    ["Deep core & pelvic-floor reactivation",2,6,"Wake the deep core and pelvic floor gently.","walking 20–30 minutes, gentle deep-core activation without doming or pain","Still no sit-ups, crunches, planks or heavy lifting. Watch for doming/bulging along the wound — that means too much."],
    ["Graded core & strength",6,12,"Rebuild core and general strength progressively.","tolerating graded core work with no doming, back to most daily activity","Reintroduce loading gradually — the abdominal wall regains most strength by ~8 weeks but keeps remodelling."],
    ["Return to full activity",12,16,"Restore full strength and return to sport/work.","confident with lifting and your activities, no bulge or discomfort at the wound","Any new bulge, pain or heaviness at the scar needs reviewing — that can be an incisional hernia."]]
});

/* brain / neurosurgical */
A.neuro = (s) => ({
  total: 26, freq:"Little and often, daily — paced around fatigue",
  note:`${s.label}: recovery is paced by the nervous system, not the wound. Fatigue is usually the dominant symptom and is often underestimated — pacing across the day beats pushing through.`,
  variants: SURG_VARIANTS([
    { k:"deficit", label:"With neurological deficit", sub:"Weakness, speech or balance affected", pick:"deficit|weakness|hemipar|tumour|tumor", scale:1.4,
      note:"With a neurological deficit, high-repetition task-specific practice is what drives recovery — and falls risk needs managing from day one." }]),
  ph:[
    ["Early recovery & safety",0,2,"Re-establish safe movement and manage fatigue.","safe transfers and walking with any aid you need, wound healing, fatigue being paced",`Avoid straining, heavy lifting and bending head-down while things heal. Report any new headache, vomiting, drowsiness, fever or wound leak urgently.${s.extra ? " " + s.extra : ""}`],
    ["Building activity & task practice",2,6,"Build activity tolerance and practise real tasks.","walking further, doing daily tasks with less help","Pace across the day — short frequent bouts. Pushing into exhaustion sets recovery back."],
    ["Strength, balance & endurance",6,12,"Rebuild strength, balance and stamina.","improving balance and endurance, more independent daily activity","Progress as fatigue allows; driving and return to work need specific clearance."],
    ["Return to roles & maintenance",12,26,"Restore community activity and your daily roles.","meaningful daily activity restored, sustainable routine","Recovery continues for many months — keep practising the tasks that matter to you."]]
});

/* general soft-tissue / plastic / minor procedures */
A.softtissue = (s) => ({
  total: 12, freq:"Daily — short frequent sessions",
  note:`${s.label}: soft tissue heals in stages — wound first (~2 weeks), then strength over 6–12 weeks. Scar remodels for up to a year, and early gentle movement prevents it binding down.`,
  variants: SURG_VARIANTS([SLOWHEAL]),
  ph:[
    ["Wound healing & protection",0,2,"Protect the wound and keep the area gently moving.","wound healed, swelling settling, gentle range comfortable",`Keep the wound clean and dry; follow any splint/dressing instructions. Gentle movement only.${s.extra ? " " + s.extra : ""}`],
    ["Range & scar management",2,6,"Restore range and settle the scar.","full or near-full range, scar softening and flattening","Scar massage once healed. Protect a fresh scar from sun for a year — it pigments permanently."],
    ["Progressive strengthening",6,9,"Rebuild strength.","strength improving toward the other side","Load progressively; some pulling at the scar is normal."],
    ["Return to full activity",9,12,"Restore full strength and activity.","strength near-symmetrical, confident with your activities","Scar keeps remodelling and softening for up to a year."]]
});

/* hand surgery — splint & protocol driven */
A.hand = (s) => ({
  total: 16, freq:"Little and often — hourly short sessions early",
  note:`${s.label}: the hand is unforgiving in both directions — too little movement and it stiffens permanently, too much and the repair fails. That's why hand surgery follows an exact, therapist-supervised protocol rather than "as it feels".`,
  variants: SURG_VARIANTS(),
  ph:[
    ["Protected motion in a splint",0,2,"Protect the repair while following your controlled-motion protocol.","wound healing, following the splint/motion protocol exactly, no swelling out of control",`Wear the splint EXACTLY as directed and follow your hand therapist's controlled-motion protocol precisely. Elevate to control swelling — a swollen hand becomes a stiff hand.${s.extra ? " " + s.extra : ""}`],
    ["Progressive motion",2,6,"Restore movement as the repair consolidates.","improving active range, tendons/joints gliding, oedema controlled","No gripping against resistance until your surgeon/therapist clears it."],
    ["Strength & dexterity",6,10,"Rebuild grip, pinch and dexterity.","grip and pinch improving, using the hand for daily tasks","Build grip gradually; scar and joints stay tender for a while."],
    ["Return to full function",10,16,"Restore full hand function.","grip/pinch approaching the other side, comfortable with your work and hobbies","Full recovery and scar softening can take 6–12 months; cold intolerance is common after hand injuries."]]
});

/* ---------------- family regexes → archetype ----------------
   Surgery names come from generate-surgeries.mjs bases, so matching on the name
   covers every approach/side variant of that family. */
const FAM = [
  // joint replacement
  ["arthroplasty","(total|partial|revision|reverse).*(replacement|arthroplasty)|replacement|arthroplasty|hemiarthroplasty|resurfacing","Joint replacement","joint","Follow any joint-specific precautions your surgeon gave you (hip precautions, or the lifting limit after a reverse shoulder)."],
  // ligament reconstruction
  ["ligrecon","(acl|pcl|mcl|lcl|mpfl|posterolateral corner|multi-?ligament|cruciate|collateral).*(reconstruction|repair)|ligament reconstruction|lateral ligament reconstruction|latarjet|bankart|stabilisation|stabilization","Ligament reconstruction","joint",""],
  // tendon-to-bone
  ["tendonbone","(rotator cuff|cuff|supraspinatus|subscapularis|distal biceps|achilles|patellar tendon|quadriceps tendon|hamstring).*(repair|reattach|reconstruction)|tendon repair|tendon reattachment|tenodesis|tendon transfer","Tendon repair","tendon",""],
  // fracture fixation
  ["orif","fracture (fixation|repair)|\\borif\\b|open reduction|internal fixation|nailing|plating|pinning|k-?wire","Fracture fixation","bone",""],
  // osteotomy (incl. tibial tubercle transfer)
  ["osteotomy","osteotomy|tibial tubercle transfer|tubercle transfer|realignment|bunion correction|hallux valgus","Osteotomy (bone realignment)","bone",""],
  // fusion
  ["fusion","fusion|arthrodesis|\\balif\\b|\\btlif\\b|\\bplif\\b|\\bacdf\\b|spinal fusion|scoliosis correction|instrumentation","Fusion (arthrodesis)","joint",""],
  // spinal decompression
  ["discectomy","discectomy|laminectomy|laminotomy|foraminotomy|decompression.*(spine|lumbar|cervical)|microdiscectomy","Spinal decompression","spine",""],
  // nerve decompression
  ["decompress","carpal tunnel release|cubital tunnel|ulnar nerve (release|transposition)|nerve (release|decompression)|tarsal tunnel release|guyon","Nerve decompression","nerve",""],
  // meniscus / cartilage / scope
  ["scope","arthroscopy|arthroscopic|meniscectomy|meniscus (repair|trim|debridement)|debridement|washout|synovectomy|chondroplasty|microfracture|loose body|subacromial decompression|labral (repair|debridement)","Keyhole (arthroscopic) surgery","joint",""],
  // soft-tissue release
  ["release","release|fasciotomy|fasciectomy|lengthening|decompression fasciotomy|trigger finger release|dupuytren|plantar fascia release|capsular release|manipulation under an","Soft-tissue release","tissue",""],
  // amputation
  ["orif","amputation|disarticulation|replantation","Amputation / limb surgery","residual limb","Residual-limb shaping and preventing contracture in the first weeks decide how well a prosthesis will fit later."],
  // cardiac
  ["cardiacsurg","\\bcabg\\b|coronary artery bypass|bypass graft|valve (repair|replacement)|sternotomy|open heart|aortic (root|aneurysm) repair|myectomy|\\btavi\\b|\\btavr\\b|transcatheter|mitral|aortic valve","Cardiac surgery","heart",""],
  ["decompress","pacemaker|defibrillator|\\bicd\\b|\\bcrt\\b|loop recorder|device implant","Cardiac device implant","chest","Avoid raising the arm on the device side above shoulder height, and no heavy lifting with it, for ~6 weeks while the leads settle."],
  ["scope","angioplasty|\\bpci\\b|stent|cardiac catheter|coronary angiogram|ablation","Cardiac catheter procedure","heart","Follow the access-site (groin or wrist) restrictions: no heavy lifting or straining for a few days, and report any bleeding or swelling there."],
  // thoracic / vascular
  ["thoracic","lobectomy|pneumonectomy|wedge resection|thoracotomy|thoracoscop|\\bvats\\b|lung (resection|surgery)|pleurodesis|decortication|lung transplant","Thoracic (lung) surgery","chest",""],
  ["softtissue","endarterectomy|bypass.*(femoral|popliteal|limb)|aneurysm repair|\\bevar\\b|varicose vein|vascular access|fistula|angio","Vascular surgery","limb","Protect the graft or access site, walk regularly to build circulation, and report any new coldness, colour change or loss of pulse urgently."],
  // abdominal / pelvic / general
  ["abdominal","laparotomy|laparoscop|hernia|appendicectomy|appendectomy|cholecystectomy|colectomy|bowel resection|stoma|colostomy|ileostomy|hysterectomy|prolapse repair|caesarean|cesarean|c-?section|prostatectomy|nephrectomy|cystectomy|bariatric|gastric (band|bypass|sleeve)|fundoplication|abdominal","Abdominal / pelvic surgery","abdomen",""],
  ["softtissue","mastectomy|lumpectomy|breast (reconstruction|surgery)|axillary (clearance|node)","Breast surgery","chest & shoulder","Shoulder stiffness and lymphoedema are the things to prevent: move the shoulder daily through full range, and report any arm swelling, heaviness or infection promptly."],
  // neuro
  ["neuro","craniotomy|craniectomy|\\bvp\\b shunt|shunt insertion|tumour resection|tumor resection|aneurysm clipping|coiling|deep brain stimulation|\\bdbs\\b|epilepsy surgery","Neurosurgery","brain",""],
  // hand & foot
  ["hand","hand surgery|flexor tendon|extensor tendon|finger|thumb|wrist (surgery|reconstruction)|scaphoid|carpal|tendon graft.*hand|nail bed","Hand surgery","hand",""],
  ["softtissue","foot surgery|ankle (surgery|reconstruction)|toe (surgery|correction)|hammer toe|neuroma excision|midfoot|forefoot","Foot & ankle surgery","foot",""],
  // ENT / eye / endocrine / other
  ["softtissue","thyroidectomy|parathyroid|tonsillectomy|adenoid|grommet|septoplasty|sinus surgery|cochlear|mastoid|laryng|tracheostomy|cataract|retinal|glaucoma|vitrectomy|dental|maxillofacial|cleft","ENT / head & neck procedure","area","Follow your surgeon's activity limits; avoid straining, heavy lifting and (for eye or ear surgery) bending head-down while it heals."],
  ["softtissue","skin graft|flap|scar revision|burn|excision|biopsy|lipoma|cyst|abscess|wound","Skin & soft-tissue procedure","area",""],
  ["neuro","transplant|kidney transplant|liver transplant|heart transplant","Transplant","body","You'll be on immunosuppression — infection risk is higher, so avoid crowded gyms early, keep wounds clean, and build activity gradually. Steroids weaken bone and muscle, which makes resistance training more important, not less."]
];
FAM.forEach(([arch, r, label, part, extra]) =>
  add({ r, label, ...A[arch]({ label, part, extra }) }));

/* Paediatric surgical families — play-based, family-centred */
const PED = [
  ["ped_hip","(ddh|hip dysplasia|pemberton|salter|femoral osteotomy).*(child|paediatric|pediatric)|spica|open reduction.*hip.*child","Paediatric hip surgery","hip","After a spica cast, skin care and positioning matter as much as movement — check for pressure areas daily."],
  ["ped_foot","(clubfoot|talipes|ponseti|tendo-?achilles lengthening).*|clubfoot surgery","Paediatric foot surgery","foot","The foot-abduction brace after correction is what prevents relapse — compliance with it matters more than any exercise."],
  ["ped_spine","scoliosis (correction|fusion)|growing rod|vertical expandable","Paediatric spine surgery","spine","No bending, lifting or twisting for the period specified; log-roll to get in and out of bed."],
  ["ped_cp","(sdr|selective dorsal rhizotomy|semls|single event multilevel)|botulinum.*child|tendon lengthening.*child","Paediatric CP surgery","legs","Intensive therapy afterwards is what converts the surgery into function — the operation alone doesn't do it."]
];
PED.forEach(([, r, label, part, extra]) => {
  const b = A.softtissue({ label, part, extra });
  b.total = 26; b.freq = "Daily, play-based and little-and-often";
  b.note = `${label}: paediatric surgical rehab is play-based and family-centred; progress is measured in function and milestones. Your surgical team's protocol leads. ${extra}`;
  b.ph = b.ph.map((f, i) => [f[0], [0, 6, 12, 18][i], [6, 12, 18, 26][i], f[3], f[4], f[5]]);
  add({ r, label, ...b });
});

/* ---------------- generic post-op fallback ----------------
   generic:true, so ANY family above outranks it. Guarantees every one of the
   ~20,000 catalogued procedures resolves to a real post-op timeline. */
add({ r:"surgery|operation|procedure|repair|reconstruction|resection|excision|implant|recovery|post-?op", label:"Post-operative recovery", generic:true,
  ...A.softtissue({ label:"Post-operative recovery", part:"operated area",
    extra:"Your surgeon's own protocol always overrides this — especially any weight-bearing, range-of-motion or lifting limits." }) });

const banner = "/* AUTO-GENERATED by scripts/generate-surgery-plans.mjs — do not edit by hand.\n" +
  "   Post-operative timelines (phase windows + milestones + restrictions) for the\n" +
  "   surgical catalogue. `r`/`pick` are regex SOURCE strings, compiled in app.js.\n" +
  "   Matched against the SELECTED/DETECTED surgery's name. */\n";
writeFileSync(OUT, banner + "window.SURGERY_PLAN_DEFS = " + JSON.stringify(out) + ";\n");
console.log(`Wrote ${out.length} surgical timelines to ${OUT}`);
