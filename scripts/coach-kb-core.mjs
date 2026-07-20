/* =====================================================================
   PhysioPath — AI coach knowledge-base: SEED + BUILDER (single source of truth)

   This module holds the condition archetypes, question templates and topic
   families, and expands them into window.COACH_KB at RUNTIME. It is
   deliberately isomorphic — no Node or DOM APIs — so the exact same code runs
   in three places:
     • the browser   (data/coach-kb.js is this file, IIFE-wrapped, calling
                       buildCoachKB() → window.COACH_KB on the Coach step)
     • the generator (scripts/generate-coach-kb.mjs re-emits data/coach-kb.js)
     • the tests     (import { buildCoachKB } to assert the KB is well-formed)

   Shipping the ~82KB seed and expanding in-browser replaces a ~11.5MB
   pre-expanded data file: the archetype prose and each template live ONCE
   here instead of once per (condition × template). coachAnswer() is unchanged
   and still keyword-scores the identical {kw, a} entries in the identical
   order (order is load-bearing — ties go to the first entry scanned).
   Educational, evidence-informed content only. Not medical advice.
===================================================================== */

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const lower = s => (s || "").toLowerCase();

/* ---------- condition archetypes: field builders take an item {n,region,tissue} ---------- */
const A = {
  tendinopathy: {
    label:"tendinopathy", acute:false,
    what: it => `an overuse irritation and gradual breakdown of the ${it.tissue||it.region+" tendon"} — load has outpaced the tendon's capacity. It causes pain and stiffness that are often worst when warming up and the day after activity.`,
    sym:  it => `Pain and stiffness over the ${it.tissue||it.region+" tendon"}, worst on the first movements of the day and after activity, sometimes with local tenderness or a thickened feel. It usually 'warms up' then aches later.`,
    cause:it => `Almost always a **spike in load** — too much, too soon: a sudden jump in training, returning too fast, or unaccustomed activity. Age, stiffness and some health factors add risk; it's rarely a single injury.`,
    treat:it => `Tendons respond to **gradual, progressive load**, not rest: begin with pain-relieving isometric holds (about 5 × 30–45s), build to slow-heavy strength (a 3-second lower), then faster spring-like work as pain allows. Ease off the aggravating spike but keep loading. Expect a slow trend over weeks–months.`,
    ex:   it => `Isometrics early, then heavy-slow resistance emphasising the lowering phase, progressing to loaded and eventually springy movements. Keep pain ≤3–4/10 during and settled by next morning; increase load ~10% a week.`,
    heal: it => `Tendinopathy is **slow** — meaningful change usually takes **6–12 weeks and often several months**, improving as a trend rather than a straight line. Rushing the load is the usual cause of setbacks.`,
    avoid:it => `Avoid load spikes, painful end-range compression of the tendon, aggressive passive stretching, cortisone as a first resort, and complete rest — all tend to make tendons worse or weaker.`,
    rtn:  it => `Return once you have near-full, near-equal strength and can do sport-like loading without a next-day flare. Build volume ~10% a week and keep the strength work going.`,
    red:  it => `A sudden 'pop' with weakness (possible rupture), a hot swollen joint, spreading pain, or numbness/pins-and-needles needs assessment.`,
    prevent:it => `Progress training gradually (~10%/week), keep the tendon strong year-round, warm up, and don't ramp up suddenly after time off.` },
  sprain: {
    label:"ligament sprain", acute:true,
    what: it => `a stretch or tear of a ${it.region} ligament, usually from a twist, roll or awkward force. Grades run from mild (I) to a full tear (III), with pain, swelling and sometimes a feeling of instability.`,
    sym:  it => `Pain, swelling and bruising around the ${it.region}, tenderness over the ligament, and — in bigger sprains — a sense of the joint 'giving way' or being loose.`,
    cause:it => `A sudden twist, roll, or force that pushes the ${it.region} past its normal range — a mis-step, awkward landing, tackle or fall.`,
    treat:it => `Early on, protect and settle it (relative rest, ice for comfort, compression, elevation), then **start gentle movement early** — ligaments heal better with graded loading than with prolonged rest. Rebuild range, then strength, then balance/control. Most low-grade sprains recover well without surgery.`,
    ex:   it => `Early pain-free range of motion, then progressive strengthening of the muscles around the ${it.region}, and balance/proprioception work (single-leg or controlled control drills) to protect the joint.`,
    heal: it => `A mild sprain often settles in **1–3 weeks**; a moderate one **3–6 weeks**; a severe/complete tear can take **8–12+ weeks** and sometimes needs specialist input. Get back gradually.`,
    avoid:it => `Avoid re-twisting or high-risk cutting/pivoting until strength, balance and confidence return, and don't rely on a brace forever — rebuild the muscle instead.`,
    rtn:  it => `Return to sport when range is full, strength is near-equal side-to-side, and you can hop/cut/change direction without pain or instability. A period of taping or bracing can help early.`,
    red:  it => `Inability to bear weight or use the limb, a deformity, rapid large swelling, or numbness/coldness suggests a fracture or worse — get it checked.`,
    prevent:it => `Strength and balance training, a supportive/taping strategy for high-risk activity, good footwear, and easing back into cutting sports gradually all lower re-sprain risk.` },
  strain: {
    label:"muscle strain", acute:true,
    what: it => `a pull or tear of the ${it.tissue||it.region+" muscle"} (a 'muscle strain'), from overstretch or a hard, fast contraction. Grades run from mild (I) to a complete tear (III).`,
    sym:  it => `Sudden pain in the ${it.tissue||it.region+" muscle"} (sometimes a 'grab' or 'pull'), tenderness, tightness, weakness, and later bruising. Stretching or contracting it hurts.`,
    cause:it => `An overstretch or a powerful, fast contraction — sprinting, kicking, a slip, or lifting — especially when fatigued, cold or under-prepared.`,
    treat:it => `Protect it for a few days (avoid painful stretch and sprinting), then **load it progressively** — gentle isometrics, then strengthening through range, then speed/power. Muscle heals well with graded loading; too-long rest leaves it weak and prone to re-tear.`,
    ex:   it => `Early pain-free isometrics, progressing to full-range strengthening with an eccentric emphasis, then sport-specific speed and power once strength is near-normal.`,
    heal: it => `Grade I strains often settle in **1–3 weeks**, grade II in **4–8 weeks**, and severe tears longer — hamstrings and calf can be stubborn. Re-injury is common if you rush the return.`,
    avoid:it => `Avoid aggressive stretching of a fresh strain, returning to sprinting/high speed before strength is rebuilt, and pushing through sharp pain.`,
    rtn:  it => `Return to sprinting/sport when strength is near-equal side-to-side and you can accelerate and change pace pain-free. Full eccentric strength is the key checkpoint.`,
    red:  it => `A complete tear (a gap you can feel, marked weakness, a 'pop' with immediate loss of function) or a huge rapidly-spreading bruise warrants assessment.`,
    prevent:it => `Warm up properly, build strength (especially eccentric) and sprinting exposure gradually, and don't ramp up speed work when fatigued.` },
  oa: {
    label:"osteoarthritis", acute:false,
    what: it => `wear-and-repair change in the ${it.region} joint (osteoarthritis) — the cartilage thins and the joint gets stiff and achy, especially with activity and at the end of the day.`,
    sym:  it => `${cap(it.region)} pain and stiffness that's worse with activity and eases with rest, morning stiffness that loosens within ~30 minutes, occasional swelling, creaking or reduced range.`,
    cause:it => `A mix of age, genetics, past injury, load and body-weight — not simply 'wearing out'. A scan showing 'bone-on-bone' doesn't dictate how much pain or function you'll have.`,
    treat:it => `**Movement is the main medicine** — regular strengthening and low-impact aerobic exercise reduce pain and stiffness better than rest. Build the muscles around the ${it.region}, keep active within comfort, manage weight, and use heat, pacing and pain relief as needed. Surgery is a later option if quality of life is badly affected.`,
    ex:   it => `Progressive strengthening of the muscles supporting the ${it.region}, plus low-impact aerobic work (walking, cycling, swimming, pool). Some ache during and after is fine if it settles; stay consistent.`,
    heal: it => `OA is long-term and doesn't 'heal', but symptoms **often improve substantially over 6–12 weeks** of consistent strengthening and activity, and can be well-managed for years.`,
    avoid:it => `Avoid long periods of rest (stiffness worsens), boom-and-bust overdoing it, and the belief that activity is 'damaging' the joint — appropriate loading helps it.`,
    rtn:  it => `You can stay active with OA — favour low-impact options, build up gradually, and keep strong. Flares settle; drop back a level and rebuild.`,
    red:  it => `A hot, red, very swollen joint with fever (possible infection or gout), a locked joint, or rapidly worsening night pain needs prompt review.`,
    prevent:it => `Keep the surrounding muscles strong, stay active, manage weight, and protect the joint from repeated heavy impact — this slows symptoms and protects function.` },
  bursitis: {
    label:"bursitis", acute:true,
    what: it => `inflammation of a bursa (a small fluid cushion) around the ${it.region}, causing localised pain that's worse with pressure and certain movements.`,
    sym:  it => `Tender, sometimes swollen pain over a specific spot on the ${it.region}, worse with direct pressure, kneeling/leaning, or repetitive movement.`,
    cause:it => `Repetitive pressure, friction or overload — kneeling, leaning, a sudden increase in activity, or nearby tendon/muscle issues — occasionally a knock or, rarely, infection.`,
    treat:it => `Settle the irritation: relative rest from the aggravating pressure/movement, ice for comfort, and address the cause (technique, load, nearby weakness). Then rebuild strength gradually. Most bursitis calms within a few weeks.`,
    ex:   it => `Once pain settles, strengthen the muscles around the ${it.region} and correct the overload pattern that irritated the bursa, progressing gradually.`,
    heal: it => `Bursitis usually settles in **2–6 weeks** with load management; recurrent cases need the underlying cause (technique, weakness, pressure) addressed.`,
    avoid:it => `Avoid the specific pressure/position that flares it (e.g. prolonged kneeling/leaning) and sudden increases in the aggravating activity.`,
    rtn:  it => `Return to full activity once pain with pressure and movement has settled and you've rebuilt strength — ease back in.`,
    red:  it => `A hot, red, rapidly swelling bursa with fever could be infected (septic bursitis) — seek prompt care.`,
    prevent:it => `Cushion pressure points, correct technique/load, keep surrounding muscles strong, and increase activity gradually.` },
  nerve: {
    label:"nerve-related pain", acute:false,
    what: it => `irritation or compression of a nerve affecting the ${it.region}, which can cause pain, numbness, pins-and-needles or weakness along the nerve's path.`,
    sym:  it => `Burning, shooting or electric pain, numbness or pins-and-needles, and sometimes weakness in the area the nerve supplies — often changing with position.`,
    cause:it => `Pressure or irritation of the nerve — from a disc, tight tissue, swelling, repetitive positions or a nearby joint problem.`,
    treat:it => `Most nerve irritation settles with time and the right movement: gentle **nerve-gliding** exercises, posture/position changes that ease symptoms, staying active within comfort, and treating the source. Avoid sustained positions that provoke it. Persistent or worsening cases need review.`,
    ex:   it => `Gentle nerve-gliding/flossing drills, movements and positions that centralise (reduce/pull-in) the symptoms, and strengthening once symptoms calm — all kept below a symptom-provoking level.`,
    heal: it => `Many nerve irritations ease over **6–12 weeks**; some take longer. Symptoms that steadily worsen, or new weakness, warrant assessment sooner.`,
    avoid:it => `Avoid the sustained positions/movements that reproduce the shooting/numbness, and don't push through worsening nerve symptoms.`,
    rtn:  it => `Return to full activity as symptoms settle and strength returns; reintroduce provocative movements gradually.`,
    red:  it => `**Spreading or worsening numbness/weakness, a foot that drops, symptoms in both limbs, or any loss of bladder/bowel control or groin numbness are urgent** — seek care now.`,
    prevent:it => `Vary positions, keep mobile and strong, manage load, and address posture/ergonomics that provoke it.` },
  fracture: {
    label:"fracture (broken bone)", acute:true,
    what: it => `a break in a ${it.region} bone. It needs a period of protection while the bone knits, then graded loading to rebuild strength and movement.`,
    sym:  it => `Immediate pain, swelling and often bruising, difficulty using or bearing weight, and sometimes deformity. It usually follows a fall, blow or twist.`,
    cause:it => `A fall, direct blow, twist or (for stress fractures) repeated overload. Lower bone density raises the risk.`,
    treat:it => `A fracture is managed by your medical team — immobilisation (cast/boot/brace) or surgery, then rehab. Follow your **weight-bearing order exactly**, keep the rest of you moving, and progress range then strength once the bone is healing. This app supports the rehab, not the fracture care itself.`,
    ex:   it => `While protected: keep nearby joints and the other limb moving, and do circulation drills. As cleared: restore range, then progressive strengthening, then balance and function.`,
    heal: it => `Most fractures unite in about **6–12 weeks**, but full strength and function take longer — follow your surgeon's timeline and imaging, not just the calendar.`,
    avoid:it => `Never exceed your prescribed weight-bearing status, don't load the bone before it's cleared, and watch for signs the cast is too tight.`,
    rtn:  it => `Return to sport/heavy activity only once the bone is healed and strength/control are rebuilt — usually well after the cast comes off.`,
    red:  it => `Increasing pain, deformity, numbness, coldness or a pale/blue limb, or being unable to move the fingers/toes, needs urgent care. After a lower-limb injury, a hot swollen painful calf could be a clot.`,
    prevent:it => `Protect bone health (calcium, vitamin D, resistance training, not smoking), prevent falls with balance work, and manage training load to avoid stress fractures.` },
  instability: {
    label:"instability / dislocation", acute:true,
    what: it => `the ${it.region} slipping partly (subluxation) or fully (dislocation) out of place, or a feeling that it might. It reflects reduced passive and muscular control of the joint.`,
    sym:  it => `A sense of the ${it.region} 'giving way', slipping or catching, apprehension in certain positions, sometimes swelling or a past dislocation.`,
    cause:it => `A previous dislocation, ligament laxity, or an injury that stretched the stabilising structures — often made worse by weak surrounding muscles.`,
    treat:it => `Rehab focuses on **rebuilding dynamic control** — strengthening the stabilising muscles and training proprioception — while temporarily avoiding the at-risk positions. Many do well with rehab; recurrent instability sometimes needs surgical stabilisation.`,
    ex:   it => `Rotator-cuff/scapular or hip/knee stabiliser strengthening, closed-chain control work, and progressive proprioception — staying out of the apprehension/at-risk position early.`,
    heal: it => `First-time cases often settle over **6–12 weeks** of rehab; recurrent instability may need longer or surgical input. Control, not just pain relief, is the goal.`,
    avoid:it => `Avoid the specific position that threatens the joint early on, and don't return to contact/overhead/pivot loads before control is rebuilt.`,
    rtn:  it => `Return when strength, control and confidence in sport-like positions are restored; a stabilising brace can help the transition.`,
    red:  it => `A joint that stays dislocated, is deformed, numb, cold or pale needs emergency reduction/care.`,
    prevent:it => `Keep the stabilising muscles strong, train control in at-risk positions gradually, and use bracing/taping for high-risk activity if advised.` },
  impingement: {
    label:"impingement / pinching", acute:false,
    what: it => `a pinching of soft tissue in the ${it.region} in certain positions (impingement), causing pain at particular angles — often overhead or deep-bend ranges.`,
    sym:  it => `A painful arc or catch at specific angles of the ${it.region}, worse with the provoking movement (e.g. reaching overhead or deep bending), sometimes with weakness from pain.`,
    cause:it => `Repeated loading in the pinch position, control/strength deficits, posture, or reduced space in the joint — rarely a single event.`,
    treat:it => `Calm the irritated tissue, then **retrain control and strength** so the joint moves with more room: scapular/rotator or hip control work, and temporarily reducing the provoking end-range. Most improve well without surgery.`,
    ex:   it => `Control and strengthening of the stabilising muscles, working below the painful arc first, then gradually reclaiming the provoking range as it settles.`,
    heal: it => `Impingement typically eases over **6–12 weeks** with the right strengthening; consistency matters more than any single treatment.`,
    avoid:it => `Avoid repeatedly loading into the painful pinch position early, and pushing through a sharp catch.`,
    rtn:  it => `Reclaim the overhead/deep range gradually as control and comfort return; then progress load.`,
    red:  it => `Sudden marked weakness, a traumatic 'pop', night pain that's severe and unremitting, or numbness needs assessment.`,
    prevent:it => `Keep the stabilisers strong, vary repetitive positions, and progress overhead/deep loading gradually.` },
  capsulitis: {
    label:"frozen (adhesive capsulitis)", acute:false,
    what: it => `a 'frozen' ${it.region} (adhesive capsulitis) — the joint capsule tightens and inflames, causing pain then marked stiffness that limits movement in all directions.`,
    sym:  it => `Deep aching pain (often worse at night) followed by progressive stiffness that limits movement in every direction, then a slow thaw.`,
    cause:it => `Often no clear trigger; more common with diabetes, thyroid conditions, and after a period of immobility. It runs in phases: freezing, frozen, thawing.`,
    treat:it => `**Gentle, frequent mobility beats aggressive stretching** — forcing painful end-range prolongs it. Work within comfort, keep it moving little and often, use heat and pain relief, and be patient through the phases. Most resolve without surgery.`,
    ex:   it => `Frequent gentle range-of-motion (pendulums, assisted reach, wall/cane work) within comfort, progressing as the joint thaws; avoid hard end-range stretching.`,
    heal: it => `Frozen shoulder is **slow — often 1–3 years** through its phases, though good management eases symptoms and speeds function. Injections/hydrodilatation help some.`,
    avoid:it => `Avoid forcing painful end-range stretches and long immobilisation — both make it worse or slower.`,
    rtn:  it => `Function returns gradually through the thawing phase; keep gently loading and moving as range improves.`,
    red:  it => `Sudden severe pain after trauma, a hot swollen joint, or new weakness/numbness warrants assessment to rule out other causes.`,
    prevent:it => `Keep the joint moving after any injury/surgery, and manage underlying conditions (e.g. diabetes) that raise the risk.` },
  overuse: {
    label:"overuse / repetitive-strain", acute:false,
    what: it => `an overuse (repetitive-strain) problem in the ${it.region} — tissue irritated by doing more than it's currently conditioned for, causing activity-related pain.`,
    sym:  it => `Aching pain in the ${it.region} that builds with the aggravating activity and eases with rest, often with local tenderness and morning or post-activity stiffness.`,
    cause:it => `A **training or activity spike** — too much, too soon, poor technique, unsuitable footwear/equipment, or insufficient recovery. Rarely a single event.`,
    treat:it => `Dial the aggravating load back to a comfortable level (don't stop entirely), fix the cause (technique, footwear, progression), and **build capacity with progressive strengthening**. Symptoms settle as the tissue is loaded sensibly.`,
    ex:   it => `Progressive strengthening of the ${it.region} and the chain around it, plus a graded return to the activity (~10% increases), keeping pain ≤3–4/10 that settles by next morning.`,
    heal: it => `Most overuse issues improve over **4–8 weeks** with load management and strengthening; stubborn ones take longer and need the cause fixed.`,
    avoid:it => `Avoid pushing through rising pain, sudden jumps in volume/intensity, and complete rest followed by a big return.`,
    rtn:  it => `Return to full activity by rebuilding volume gradually once symptoms are controlled and strength has improved.`,
    red:  it => `A sudden sharp pop, night pain, spreading numbness/weakness, or symptoms that steadily worsen despite rest need review.`,
    prevent:it => `Progress load gradually (~10%/week), strengthen year-round, use suitable footwear/equipment, and build in recovery.` },
  postop: {
    label:"post-surgical recovery", acute:true,
    what: it => `recovery after ${it.region} surgery. It follows phases — protect and settle, restore range, then rebuild strength and function — guided by your surgeon's protocol.`,
    sym:  it => `Expected early swelling, stiffness, bruising and soreness around the incision that steadily improve. Report spreading redness, discharge, fever or calf pain/swelling.`,
    cause:it => `This is planned recovery, not an injury — the tissues and any repair/implant need time to heal and then be progressively loaded.`,
    treat:it => `Follow your **surgeon's protocol and any precautions exactly** — it always takes precedence. Generally: protect early, restore motion, then build strength and function in stages. Attend supervised rehab where offered, and progress with clearance.`,
    ex:   it => `Early gentle range and activation within precautions, then progressive strengthening, balance and function as cleared — staged to the protocol and how you're healing.`,
    heal: it => `Timelines vary by procedure but most soft-tissue/joint surgeries need **months** to full strength; early protection weeks are followed by progressive loading. Follow the surgeon's stages.`,
    avoid:it => `Never breach your surgical precautions or weight-bearing order, don't rush loading before clearance, and protect the incision. Watch for infection and clot signs.`,
    rtn:  it => `Return to sport/heavy work only once strength, control and clearance align — usually well into recovery, not just when pain is gone.`,
    red:  it => `Spreading redness, pus/discharge, fever, wound opening, calf pain/swelling, or chest pain/breathlessness need prompt care.`,
    prevent:it => `Prevent complications by following the protocol, moving as advised (early mobility lowers clot risk), and keeping the wound clean and dry.` },
  general: {
    label:"condition", acute:false,
    what: it => `a ${it.region} condition. General rehab principles apply: settle irritable symptoms, restore movement, and progressively rebuild strength and function.`,
    sym:  it => `${cap(it.region)} pain or dysfunction that varies with activity — note what makes it better or worse to guide your plan.`,
    cause:it => `Causes vary — overload, injury, posture, or age-related change are common. Identifying what provokes it helps target treatment.`,
    treat:it => `Calm irritable symptoms, keep moving within comfort, and **progressively strengthen** the area and the chain around it. Manage load, and get an in-person assessment if it's not improving.`,
    ex:   it => `Restore pain-free range, then progressive strengthening of the ${it.region} and supporting muscles, and balance/control where relevant.`,
    heal: it => `Many musculoskeletal issues improve over **6–12 weeks** with consistent, graded loading; some take longer. Progress is a trend, not a straight line.`,
    avoid:it => `Avoid movements that sharply worsen it, big spikes in load, and prolonged complete rest.`,
    rtn:  it => `Return to activity as range, strength and confidence rebuild — progress gradually.`,
    red:  it => `Severe or worsening pain, night pain, fever, unexplained weight loss, or new numbness/weakness needs a clinician's review.`,
    prevent:it => `Stay generally strong and active, progress load gradually, and address technique and recovery.` },
  /* ---- diagnosis-class archetypes that must not collapse into sprain/tendon/nerve templates ---- */
  meniscus: {
    label:"meniscus injury", acute:true,
    what: it => `a tear or degenerative change in the meniscus — the C-shaped cartilage shock-absorber in the ${it.region||"knee"}. It is not a ligament sprain: healing clocks and load rules differ for repair vs trim vs non-operative care.`,
    sym:  it => `Joint-line pain, swelling after activity, catching or locking, and pain with twisting or deep squat. Some degenerative tears ache like osteoarthritis more than a dramatic injury.`,
    cause:it => `A twist on a planted foot, deep squat under load, or gradual degenerative fraying with age and prior load.`,
    treat:it => `Many tears settle with **quad/hip strength, swelling control and avoiding early twisting** — not prolonged rest. **Repair** surgery needs protected weight-bearing and limited deep flexion early; **meniscectomy** usually allows faster progression. Follow your surgeon if operated.`,
    ex:   it => `Quad sets, straight-leg raises, controlled range, then progressive closed-chain strength. Delay deep loaded flexion and pivoting until swelling and control allow (longer after a repair).`,
    heal: it => `Non-operative and meniscectomy paths often improve over **4–12 weeks**; meniscus **repairs** are protected longer (often ~3 months before pivoting sport). Degenerative tears behave more like OA long-term.`,
    avoid:it => `Avoid deep squatting, twisting and cutting while the joint is swollen or if you had a repair and have not been cleared. Don't treat it like a 3-week ankle sprain timeline.`,
    rtn:  it => `Return when swelling is controlled, strength is near the other side, and you can squat/step without catch — sport pivots only when your pathway (especially repair) allows.`,
    red:  it => `A truly locked knee that won't straighten, fever with a hot joint, or inability to bear weight needs prompt assessment.`,
    prevent:it => `Strong quads and hips, gradual return to cutting sports, and load management after any knee injury.` },
  cuff_tear: {
    label:"rotator cuff tear", acute:false,
    what: it => `a partial- or full-thickness tear of the ${it.tissue||"rotator cuff"} — different from pure tendinopathy. Some tears are degenerative and respond to rehab; large full-thickness tears and post-repair cases follow different rules.`,
    sym:  it => `Shoulder pain (often night pain), weakness with lifting the arm, and difficulty with overhead or behind-the-back reach. A sudden tear may follow a fall or heavy lift.`,
    cause:it => `Age-related tendon change, overload, or a traumatic event. Scans commonly show partial tears that are not the whole story for pain.`,
    treat:it => `Many **partial** tears and degenerative tears improve with **scapular + cuff strengthening and load management** — not complete rest. A **full-thickness** tear with clear weakness may need surgical opinion. **After repair**, the tendon needs time to heal to bone (often passive motion early, active lifting delayed ~6–12 weeks) — follow your surgeon, not a tendinopathy-only plan.`,
    ex:   it => `Scapular setting, isometric cuff holds, then progressive external rotation and rows below painful arc. Overhead and heavy press only when strength and range allow (or when cleared post-repair).`,
    heal: it => `Non-operative improvement often takes **8–16 weeks** of consistent strength work. Tendon-to-bone healing after repair is measured in months — calendar floors matter.`,
    avoid:it => `Avoid aggressive early active lifting after repair, heavy overhead work into sharp pain, and the myth that every tear needs surgery — and the opposite myth that every tear is 'just tendonitis'.`,
    rtn:  it => `Return to overhead/sport when strength and control approach the other side and night pain has settled — or when your post-op protocol and surgeon clear you.`,
    red:  it => `Sudden complete inability to lift the arm after trauma, a hot swollen joint, or progressive neurological symptoms need assessment.`,
    prevent:it => `Keep scapular and cuff capacity year-round, progress overhead load gradually, and manage load spikes.` },
  stenosis: {
    label:"spinal stenosis", acute:false,
    what: it => `narrowing around nerves in the ${it.region||"spine"} (spinal stenosis). Unlike many disc problems that prefer extension, stenosis symptoms often **ease with flexion** (the 'shopping-cart' lean-forward pattern) and worsen with prolonged standing or walking upright.`,
    sym:  it => `Leg heaviness, aching or pins-and-needles with walking/standing that eases when you sit or bend forward. Back pain may or may not dominate.`,
    cause:it => `Age-related disc and facet change, thickened ligaments, or bony narrowing that crowds the nerves — often worse with extension.`,
    treat:it => `Stay active with **flexion-biased and paced walking**, hip/glute strength, and short rests when legs feel heavy. Forced end-range extension for 'centralisation' that works for some disc pain can irritate stenosis — follow what eases *your* symptoms. Escalate care if walking distance collapses or weakness progresses.`,
    ex:   it => `Pelvic tilts, gentle flexion mobility as comfort allows, hip hinge patterning, glute bridges, and progressive walking with rests. Stationary bike is often well tolerated.`,
    heal: it => `Symptoms often fluctuate; many people improve capacity over **6–12 weeks** of paced exercise even if the MRI does not 'change'.`,
    avoid:it => `Avoid long forced standing, heavy loaded extension if it brings on leg symptoms, and boom-and-bust walking without rest breaks.`,
    rtn:  it => `Build continuous walking time gradually; use a slight forward lean or trolley if it helps. Return to valued activity as leg symptoms allow.`,
    red:  it => `**Loss of bladder/bowel control, saddle numbness, progressive leg weakness, or symptoms in both legs worsening quickly are urgent** — seek care now.`,
    prevent:it => `Keep hips and trunk strong, walk regularly with pacing, and manage weight and smoking (both affect spine and vascular walking tolerance).` },
  stroke_acute: {
    label:"stroke (acute care)", acute:true,
    what: it => `a stroke — brain tissue injured by blocked or bleeding vessels. In hospital the priorities are medical stabilisation, then early, high-repetition rehab for the ${it.region||"body"} systems affected.`,
    sym:  it => `Sudden one-sided weakness or numbness, speech or vision change, facial droop, severe headache, or loss of balance. After the event: weakness, neglect, spasticity, shoulder pain, or walking difficulty.`,
    cause:it => `Clot (ischemic) or bleed (hemorrhagic), often with vascular risk factors. Some need clot retrieval, thrombolysis, or neurosurgery first.`,
    treat:it => `**Task-specific, high-repetition practice** drives recovery. Protect a weak shoulder, train the affected side, and prevent falls, contracture and aspiration. After a bleed, BP and neurosurgical limits still shape early load.`,
    ex:   it => `Sitting/standing balance, sit-to-stand, gait practice, and arm reach-grasp drills — many quality reps. Never pull on a subluxed arm.`,
    heal: it => `Fastest gains often come in the **first 3 months**, but improvement can continue for years with practice.`,
    avoid:it => `Avoid pulling on the weak arm, unsupervised walking when unsafe, and ignoring new neurological symptoms.`,
    rtn:  it => `Return to roles is graded with the team; community mobility and risk-factor control (BP, AF, lipids, smoking) are part of rehab.`,
    red:  it => `New or worsening weakness, speech difficulty, severe headache, vomiting, unequal pupils, or dropping alertness need urgent care.`,
    prevent:it => `Blood pressure, atrial fibrillation, diabetes, lipids, smoking cessation, and activity reduce recurrent stroke risk.` },
  gbs_acute: {
    label:"Guillain-Barré / acute neuromuscular", acute:true,
    what: it => `an acute immune attack on peripheral nerves (e.g. Guillain-Barré) causing rising weakness, often after infection. Hospital care may include immunotherapy and respiratory monitoring.`,
    sym:  it => `Ascending weakness, tingling, reduced reflexes, and sometimes breathing or swallow difficulty. Peak disability is often within 2–4 weeks.`,
    cause:it => `Post-infectious immune response damaging nerve myelin or axons.`,
    treat:it => `Medical treatment first; rehab is **sub-fatigue** activation, contracture prevention, upright tolerance, then graded strength and gait. Overwork can set recovery back.`,
    ex:   it => `ROM, gentle activation, sitting/standing practice, then progressive strength only as next-day function holds.`,
    heal: it => `Recovery is often **months**, proximal before distal; some residual deficit can remain.`,
    avoid:it => `Avoid exercising to failure, and never ignore increasing breathlessness or weak cough.`,
    rtn:  it => `Community walking and roles return gradually; full recovery can take a year or more.`,
    red:  it => `Worsening breathing, inability to clear secretions, or rapid new weakness is urgent.`,
    prevent:it => `Not generally preventable; early recognition of relapse or related variants needs prompt care.` },
  sci_acute: {
    label:"spinal cord injury", acute:true,
    what: it => `damage to the spinal cord causing weakness, sensory loss, and changes in bladder, bowel and autonomic control below the level of injury.`,
    sym:  it => `Paralysis or weakness, sensory change, spasticity, and level-dependent breathing, hand, or trunk involvement.`,
    cause:it => `Trauma, disc, vascular, inflammatory or surgical events compressing or injuring the cord.`,
    treat:it => `Acute medical/surgical care, then rehab: ROM, skin, respiratory care, transfers, equipment, and — if ~T6 and above — **autonomic dysreflexia** education.`,
    ex:   it => `Daily ROM, pressure relief, available-muscle strength, transfer and wheelchair or gait skills as level allows.`,
    heal: it => `Neurological recovery varies by completeness; skill and fitness gains continue long after the acute stay.`,
    avoid:it => `Avoid skin breakdown, contracture, and ignoring AD warning signs (pounding headache, high BP, flushing).`,
    rtn:  it => `Community reintegration is highly individual; equipment and caregiver training are part of the plan.`,
    red:  it => `AD emergency signs, new level of weakness, chest infection signs, or pressure injuries need prompt care.`,
    prevent:it => `Secondary prevention: skin checks, bone health, shoulder protection, and cardiovascular fitness.` },
  myasthenia_acute: {
    label:"myasthenia gravis", acute:true,
    what: it => `a fatigable neuromuscular junction disorder (myasthenia gravis) where muscles weaken with use and improve with rest — crises can affect breathing and swallowing.`,
    sym:  it => `Drooping eyelids, double vision, limb weakness that worsens with activity, weak voice, or chewing/swallowing difficulty.`,
    cause:it => `Autoimmune attack on the neuromuscular junction; infections, surgery, and some medicines can trigger exacerbations.`,
    treat:it => `Medical therapy first. Exercise is **short and sub-fatigue** — stop at first true tiredness. Coordinate with medication timing; seek urgent care for breathing or swallow crisis signs.`,
    ex:   it => `Brief strength bouts with rests, paced walking, and energy planning — never train to failure.`,
    heal: it => `Function often stabilises with treatment; fitness builds slowly without overwork.`,
    avoid:it => `Avoid heat extremes, untreated infection, and pushing through progressive weakness.`,
    rtn:  it => `Graded return to roles on good days; keep a crisis action plan.`,
    red:  it => `Rapid weakness, choking, weak voice, or breathlessness is an emergency.`,
    prevent:it => `Medication adherence, infection prevention, and pacing reduce flares.` },
  encephalopathy_acute: {
    label:"delirium / encephalopathy", acute:true,
    what: it => `an acute change in attention and awareness (delirium) or broader brain dysfunction (encephalopathy), common in hospital after illness, surgery, or metabolic stress.`,
    sym:  it => `Confusion, fluctuating alertness, agitation or quiet withdrawal, poor sleep-wake cycle, and unsafe mobility.`,
    cause:it => `Infection, medicines, organ failure, hypoxia, alcohol withdrawal, sensory deprivation, and many other reversible drivers.`,
    treat:it => `Treat causes, reorient, restore day-night routine, and **always supervise mobility** until safe. Early sitting and walking help when staffed safely.`,
    ex:   it => `Short supervised transfers and walks, simple reorientation tasks, then progressive strength as cognition clears.`,
    heal: it => `Often improves over days–weeks as causes clear; some cognitive fog can linger.`,
    avoid:it => `Avoid leaving the person to walk alone while delirious, and avoid overstimulation or exhausting sessions.`,
    rtn:  it => `Independence returns as cognition and strength return; carers need the same safety rules at home.`,
    red:  it => `New focal weakness, seizure, severe headache, or rapidly dropping alertness needs urgent review.`,
    prevent:it => `Glasses/hearing aids, hydration, sleep, early mobility, and careful medicines reduce hospital delirium risk.` },
  sepsis_acute: {
    label:"post-sepsis / acute medical illness", acute:true,
    what: it => `recovery after a serious whole-body illness such as sepsis, severe infection, or major metabolic crisis — not a single joint injury.`,
    sym:  it => `Profound fatigue, muscle weakness, dizziness on standing, foggy thinking, and reduced walking tolerance that can last months.`,
    cause:it => `Infection, inflammation, bed rest, and organ stress during hospitalisation.`,
    treat:it => `Short frequent mobility, rebuild sitting and walking first, then strength. Pace for months; fever or new confusion needs medical review.`,
    ex:   it => `Edge-of-bed sitting, hallway walks, sit-to-stand, then light resistance — always sub-fatigue.`,
    heal: it => `Many improve over **6–12 weeks**, but post-sepsis fatigue can last much longer.`,
    avoid:it => `Avoid boom-and-bust and pushing through high fever or resting breathlessness.`,
    rtn:  it => `Graded return to roles; keep a long-term walking habit to cut readmission risk.`,
    red:  it => `Chest pain, new confusion, high fever, or breathlessness at rest needs urgent care.`,
    prevent:it => `Vaccination, chronic disease control, and staying mobile in hospital when safe all help.` },
  trauma_acute: {
    label:"major trauma / polytrauma", acute:true,
    what: it => `several injuries at once — bones, organs, wounds — each with its own healing rules.`,
    sym:  it => `Pain, protected weight-bearing, drains/lines early on, and very different limits for different body parts.`,
    cause:it => `High-energy injury, falls from height, road trauma, or violence.`,
    treat:it => `**Obey every order** (weight-bearing, spinal, lifting). Move unrestricted joints a lot; protect the rest. Multi-team clearance before sport or work.`,
    ex:   it => `ROM of free joints, respiratory care if chest injured, transfers and gait only as ordered.`,
    heal: it => `Timelines are set by the slowest serious injury — often **months**.`,
    avoid:it => `Never guess weight-bearing or remove braces/collars early.`,
    rtn:  it => `Community return only when all relevant teams agree.`,
    red:  it => `New limb coldness/numbness, wound infection, chest pain, or neurological change needs urgent review.`,
    prevent:it => `Secondary prevention: DVT awareness, bone health, and graded strength once cleared.` },
  burn_acute: {
    label:"major burn", acute:true,
    what: it => `deep or extensive skin injury where scarring pulls joints into contracture if range is lost.`,
    sym:  it => `Pain, swelling, tight healing skin, and progressive loss of motion if not stretched.`,
    cause:it => `Thermal, electrical, chemical or friction injury; sometimes with inhalation injury.`,
    treat:it => `**Little-and-often ROM** and anti-contracture positioning are the core of rehab. Coordinate with dressings and pain control; pressure garments when prescribed.`,
    ex:   it => `Frequent ROM, functional hand use if involved, then sustained stretch and strength through new range.`,
    heal: it => `Wounds may close in weeks; scar maturation and contracture risk last **many months**.`,
    avoid:it => `Avoid aggressive massage on open wounds and missing daily ROM.`,
    rtn:  it => `Work and sport return is highly individual; skin care is lifelong.`,
    red:  it => `Spreading redness, fever, graft loss, or rapidly worsening tightness needs review.`,
    prevent:it => `Early ROM, positioning, and scar management prevent much late disability.` },
  pe_acute: {
    label:"pulmonary embolism", acute:true,
    what: it => `a blood clot in the lung arteries — a medical emergency in the acute phase, then a graded recovery on anticoagulation.`,
    sym:  it => `Sudden breathlessness, chest pain, sometimes cough or fainting; later residual breathlessness on exertion.`,
    cause:it => `Clots often from the legs/pelvis; risk rises with immobility, surgery, cancer, hormones, and clotting disorders.`,
    treat:it => `Anticoagulation and medical stabilisation first. Walking is usually encouraged once stable; rebuild endurance gradually.`,
    ex:   it => `Short walks progressing to continuous walking; light strength; avoid high fall-risk sport while anticoagulated.`,
    heal: it => `Many feel substantially better over **weeks to a few months**; some have longer breathlessness.`,
    avoid:it => `Avoid contact collision and dehydration; never stop blood thinners without medical advice.`,
    rtn:  it => `Return to activity is graded with the team; long-haul travel needs specific advice.`,
    red:  it => `New chest pain, coughing blood, sudden breathlessness, or syncope is urgent.`,
    prevent:it => `Move early after surgery/illness, know your clot risks, and complete prescribed anticoagulation.` },
  pneumonia_acute: {
    label:"hospitalised pneumonia / respiratory flare", acute:true,
    what: it => `serious lung infection or airway flare needing hospital care, leaving deconditioning and breathlessness.`,
    sym:  it => `Cough, breathlessness, fatigue, and reduced walking distance that lingers after discharge.`,
    cause:it => `Bacteria, viruses, aspiration, or COPD/asthma exacerbation.`,
    treat:it => `Breathing strategies, airway clearance if taught, and progressive walking. Pulmonary rehab principles apply.`,
    ex:   it => `Pursed-lip breathing, walk/rest intervals, then continuous walking and light strength.`,
    heal: it => `Energy and lung capacity often improve over **4–12 weeks** if you keep moving.`,
    avoid:it => `Avoid complete bed rest once stable, and smoking.`,
    rtn:  it => `Build daily walking; seek pulmonary rehab if breathlessness stays limiting.`,
    red:  it => `Fever with coloured sputum, resting breathlessness, or chest pain needs review.`,
    prevent:it => `Vaccination, smoking cessation, and early mobility when ill all help.` },
  icu_aw_acute: {
    label:"ICU-acquired weakness", acute:true,
    what: it => `profound weakness after critical illness (critical illness polyneuropathy/myopathy) from immobility, inflammation and organ support.`,
    sym:  it => `Difficulty lifting limbs, sitting, standing or weaning from support; often with fatigue and orthostatic dizziness.`,
    cause:it => `Prolonged ICU stay, sepsis, steroids, immobility and multi-organ illness.`,
    treat:it => `Early progressive mobility as cleared: ROM, sitting, standing, then strength and walking. Recovery is often measured in **months**.`,
    ex:   it => `Short frequent sessions — edge-of-bed, sit-to-stand, assisted gait — then progressive resistance.`,
    heal: it => `Many improve substantially over 6–12 months; some residual weakness can persist.`,
    avoid:it => `Avoid boom-and-bust and unsupervised walking while orthostatic or confused.`,
    rtn:  it => `Graded return to home and roles with fatigue management.`,
    red:  it => `New focal neurological signs, chest pain, or severe breathlessness need urgent review.`,
    prevent:it => `In hospital, early mobility protocols reduce severity; after discharge, consistent rehab helps.` },
  bone_stress: {
    label:"bone stress injury", acute:true,
    what: it => `a stress reaction or stress fracture — bone that has been loaded faster than it can remodel. This is a **load-management** problem, not the same as a traumatic broken bone from a fall.`,
    sym:  it => `Focal bone pain that builds with impact activity, may ache at rest or night as it worsens, and is tender to press on one spot.`,
    cause:it => `A spike in running/jumping volume or intensity, inadequate recovery, low energy availability, low bone density, or biomechanics — often a mix.`,
    treat:it => `**Reduce impact** enough for symptoms to settle (sometimes a boot or crutches for higher-risk sites), keep non-impact fitness, fix the training error and nutrition, then **grade return-to-run**. High-risk sites (e.g. femoral neck, navicular) need medical imaging and specialist rules — do not push through.`,
    ex:   it => `Pain-free cross-training (bike/swim/upper body), maintain strength without painful impact, then a walk–run ladder only when daily pain is low and hopping is comfortable (site-dependent).`,
    heal: it => `Many low-risk stress injuries settle in **6–8+ weeks** of modified load; return to full training often takes longer. High-risk sites can take months and must be cleared.`,
    avoid:it => `Avoid running through focal bone pain, abrupt mileage spikes, and under-fuelling. Don't treat it as 'just shin splints' if pain is pinpoint and progressive.`,
    rtn:  it => `Return with a graded impact plan (~10% load steps), strength maintained, and training errors corrected — not a jump back to prior volume.`,
    red:  it => `Groin pain with weight-bearing (possible femoral neck), night pain escalating, or inability to hop on one leg needs prompt imaging/review.`,
    prevent:it => `Progress impact ~10%/week, keep strength work, fuel training adequately, and address bone health (vitamin D, energy availability).` }
};

/* ---------- condition items: [name, archetype, region, tissue, aka(pipe-separated)] ---------- */
const ITEMS = [
  // Knee
  ["Knee osteoarthritis","oa","knee","","knee arthritis|knee oa|worn knee"],
  ["Patellofemoral pain","overuse","knee","","runner's knee|kneecap pain|pfps|anterior knee pain|patellofemoral"],
  ["ACL tear","sprain","knee","","acl|anterior cruciate|acl sprain|acl rupture"],
  ["PCL sprain","sprain","knee","","pcl|posterior cruciate"],
  ["MCL sprain","sprain","knee","","mcl|medial collateral"],
  ["LCL sprain","sprain","knee","","lcl|lateral collateral"],
  ["Meniscus tear","meniscus","knee","","meniscus|cartilage tear|torn meniscus|meniscal"],
  ["Patellar tendinopathy","tendinopathy","knee","patellar tendon","jumper's knee|patellar tendon|patellar tendinitis"],
  ["Quadriceps tendinopathy","tendinopathy","knee","quadriceps tendon","quad tendon"],
  ["Iliotibial band syndrome","overuse","knee","","it band|itb|iliotibial|runner's knee lateral"],
  ["Pes anserine bursitis","bursitis","knee","","pes anserine"],
  ["Prepatellar bursitis","bursitis","knee","","housemaid's knee|kneecap bursitis"],
  ["Osgood-Schlatter","overuse","knee","","osgood schlatter|tibial tubercle|growth plate knee"],
  ["Patellar dislocation","instability","knee","","kneecap dislocation|patellar instability"],
  ["Total knee replacement","postop","knee","","tkr|knee replacement|knee arthroplasty"],
  ["ACL reconstruction","postop","knee","","acl repair|acl surgery|acl recon"],
  ["Meniscus surgery","postop","knee","","meniscectomy|meniscus repair"],
  ["Chondromalacia patella","overuse","knee","","chondromalacia|soft cartilage kneecap"],
  ["Baker's cyst","general","knee","","popliteal cyst|baker cyst"],
  // Shoulder
  ["Rotator cuff tendinopathy","tendinopathy","shoulder","rotator cuff","rotator cuff|cuff tendinitis|supraspinatus"],
  ["Rotator cuff tear","cuff_tear","shoulder","rotator cuff","torn rotator cuff|cuff tear|full-thickness cuff|partial-thickness cuff"],
  ["Shoulder impingement","impingement","shoulder","","subacromial|impingement shoulder|painful arc"],
  ["Frozen shoulder","capsulitis","shoulder","","adhesive capsulitis|frozen shoulder|stiff shoulder"],
  ["Shoulder instability","instability","shoulder","","shoulder dislocation|unstable shoulder|subluxation shoulder"],
  ["AC joint sprain","sprain","shoulder","","acromioclavicular|ac joint|separated shoulder"],
  ["Biceps tendinopathy","tendinopathy","shoulder","biceps tendon","biceps tendon|bicipital"],
  ["Shoulder bursitis","bursitis","shoulder","","subacromial bursitis"],
  ["Shoulder osteoarthritis","oa","shoulder","","shoulder arthritis|glenohumeral oa"],
  ["Labral tear","sprain","shoulder","","slap tear|labrum|glenoid labrum"],
  ["Rotator cuff repair","postop","shoulder","","cuff repair surgery"],
  ["Shoulder replacement","postop","shoulder","","shoulder arthroplasty"],
  // Hip
  ["Hip osteoarthritis","oa","hip","","hip arthritis|hip oa|worn hip"],
  ["Gluteal tendinopathy","tendinopathy","hip","gluteal tendon","glute tendon|greater trochanteric|hip lateral pain"],
  ["Trochanteric bursitis","bursitis","hip","","hip bursitis|trochanteric"],
  ["Hip flexor strain","strain","hip","hip flexor","hip flexor|psoas strain"],
  ["Hip labral tear","sprain","hip","","hip labrum|labral hip"],
  ["Hip impingement","impingement","hip","","fai|femoroacetabular|hip pinch"],
  ["Groin strain","strain","hip","adductor","groin pull|adductor strain|groin"],
  ["Hamstring strain","strain","hip","hamstring","hamstring pull|hamstring tear|pulled hamstring"],
  ["Total hip replacement","postop","hip","","thr|hip replacement|hip arthroplasty"],
  ["Hip arthroscopy","postop","hip","","hip scope|hip arthroscopy"],
  // Ankle / foot
  ["Ankle sprain","sprain","ankle","","rolled ankle|sprained ankle|lateral ankle"],
  ["High ankle sprain","sprain","ankle","","syndesmosis|high ankle"],
  ["Achilles tendinopathy","tendinopathy","ankle","Achilles tendon","achilles|achilles tendinitis|achilles pain"],
  ["Achilles rupture","postop","ankle","Achilles tendon","torn achilles|achilles tear"],
  ["Plantar fasciitis","overuse","foot","plantar fascia","heel pain|plantar fascia|plantar fasciopathy"],
  ["Tibialis posterior tendinopathy","tendinopathy","ankle","tibialis posterior tendon","tib post|posterior tibial|flat foot pain"],
  ["Peroneal tendinopathy","tendinopathy","ankle","peroneal tendon","peroneal|fibularis"],
  ["Shin splints","overuse","shin","","medial tibial stress|shin pain|mtss"],
  ["Stress fracture","bone_stress","shin","","stress fracture|stress reaction|bone stress"],
  ["Metatarsalgia","overuse","foot","","ball of foot pain|metatarsal pain"],
  ["Morton's neuroma","nerve","foot","","mortons neuroma|forefoot nerve"],
  ["Bunion","general","foot","","hallux valgus|bunion"],
  ["Ankle osteoarthritis","oa","ankle","","ankle arthritis"],
  // Spine
  ["Low back pain","overuse","low back","","lower back pain|lumbar pain|back ache|non-specific back pain"],
  ["Lumbar disc herniation","nerve","low back","","slipped disc|herniated disc|bulging disc|disc"],
  ["Sciatica","nerve","low back","","sciatic|leg pain from back|sciatica"],
  ["Lumbar spinal stenosis","stenosis","low back","","spinal stenosis|stenosis|neurogenic claudication"],
  ["Facet joint pain","overuse","low back","","facet joint|facet"],
  ["Sacroiliac joint pain","overuse","low back","","si joint|sacroiliac|sij"],
  ["Neck pain","overuse","neck","","cervical pain|stiff neck|neck ache"],
  ["Cervical radiculopathy","nerve","neck","","pinched nerve neck|neck arm pain|cervical nerve"],
  ["Whiplash","strain","neck","","whiplash|neck sprain"],
  ["Thoracic back pain","overuse","mid back","","upper back pain|thoracic pain"],
  ["Lumbar fusion","postop","low back","","spinal fusion|back fusion"],
  ["Discectomy","postop","low back","","laminectomy|disc surgery|microdiscectomy"],
  ["Spondylolisthesis","general","low back","","spondylolisthesis|slipped vertebra"],
  ["Scoliosis","general","spine","","scoliosis|curved spine"],
  // Elbow / wrist / hand
  ["Tennis elbow","tendinopathy","elbow","wrist extensor tendon","lateral epicondylitis|lateral epicondyle|tennis elbow"],
  ["Golfer's elbow","tendinopathy","elbow","wrist flexor tendon","medial epicondylitis|golfers elbow"],
  ["Carpal tunnel syndrome","nerve","wrist","","carpal tunnel|median nerve|hand numbness"],
  ["Cubital tunnel syndrome","nerve","elbow","","cubital tunnel|ulnar nerve|funny bone"],
  ["De Quervain's","tendinopathy","wrist","thumb tendon","de quervain|dequervain|thumb tendon"],
  ["Wrist sprain","sprain","wrist","","sprained wrist"],
  ["Thumb sprain","sprain","thumb","","skier's thumb|gamekeeper|thumb ligament"],
  ["Trigger finger","general","hand","","trigger finger|locking finger"],
  ["Thumb osteoarthritis","oa","thumb","","thumb arthritis|cmc arthritis|base of thumb"],
  ["Hand osteoarthritis","oa","hand","","hand arthritis|finger arthritis"],
  ["Distal radius fracture","fracture","wrist","","colles|broken wrist|wrist fracture"],
  ["Elbow bursitis","bursitis","elbow","","olecranon bursitis"],
  // Neuro / systemic / general
  ["Stroke recovery","stroke_acute","body","","stroke|cva|hemiplegia|hemiparesis|post-thrombectomy|ICH|SAH|subarachnoid"],
  ["Guillain-Barré","gbs_acute","body","","guillain|AIDP|AMAN|miller fisher"],
  ["Spinal cord injury","sci_acute","body","","spinal cord|SCI|tetrapleg|parapleg|autonomic dysreflex"],
  ["ICU-acquired weakness","icu_aw_acute","body","","ICU-acquired|critical illness poly|CIPNM|post-ICU"],
  ["Myasthenia gravis","myasthenia_acute","body","","myasthen|Lambert-Eaton|myasthenic crisis"],
  ["Delirium / encephalopathy","encephalopathy_acute","body","","delirium|encephalopath|hypoxic-ischemic|anoxic brain|Wernicke|status epileptic"],
  ["Sepsis recovery","sepsis_acute","body","","sepsis|septic shock|AKI recovery|DKA recovery|hospital-associated deconditioning"],
  ["Polytrauma","trauma_acute","body","","polytrauma|major trauma|pelvic fracture|fragility hip fracture|flail chest"],
  ["Major burn","burn_acute","body","","major burn|TBSA|full-thickness burn|post-burn|electrical burn"],
  ["Pulmonary embolism","pe_acute","body","","pulmonary embolism|post-pulmonary-embolism|\\bPE\\b recovery|right-heart strain"],
  ["Hospitalised pneumonia","pneumonia_acute","body","","community-acquired pneumonia|hospital-acquired pneumonia|COPD acute exacerbation|ARDS recovery|aspiration pneumonia"],
  ["Parkinson's","general","body","","parkinsons|parkinson"],
  ["Multiple sclerosis","general","body","","ms|multiple sclerosis"],
  ["Peripheral neuropathy","nerve","feet","","neuropathy|nerve damage feet|diabetic neuropathy"],
  ["Vestibular / dizziness","general","balance","","vertigo|bppv|dizziness|vestibular"],
  ["Fibromyalgia","general","body","","fibromyalgia|widespread pain"],
  ["Chronic fatigue","general","body","","chronic fatigue|me/cfs|long covid|post-viral"],
  ["Osteoporosis","general","bone","","osteoporosis|osteopenia|brittle bones"],
  ["Rheumatoid arthritis","general","body","","rheumatoid|ra|inflammatory arthritis"],
  ["Ankylosing spondylitis","general","spine","","ankylosing|axial spa"],
  ["Cardiac rehab","general","heart","","heart attack|cardiac rehab|heart failure|angina"],
  ["Pulmonary rehab","general","lungs","","copd|pulmonary rehab|emphysema|lung"],
  ["Lymphoedema","general","limb","","lymphedema|lymphoedema|swollen limb nodes"],
  ["Amputation rehab","postop","limb","","amputation|prosthesis|amputee"],
  ["Total shoulder replacement","postop","shoulder","","shoulder replacement"],
  ["Calf strain","strain","calf","calf muscle","calf tear|pulled calf|gastrocnemius"],
  ["Quadriceps strain","strain","thigh","quadriceps muscle","quad strain|thigh strain"],
  ["Concussion","general","head","","concussion|head injury|mild tbi"],
  // more knee
  ["Patellar tendon rupture","postop","knee","patellar tendon","ruptured patellar tendon"],
  ["Osteochondritis dissecans","general","knee","","ocd knee|osteochondritis"],
  ["Plica syndrome","overuse","knee","","plica|synovial plica"],
  ["Sinding-Larsen-Johansson","overuse","knee","","sinding larsen|slj"],
  ["Hamstring tendinopathy","tendinopathy","knee","hamstring tendon","hamstring tendon|proximal hamstring"],
  ["Knee ligament reconstruction","postop","knee","","mcl repair|ligament surgery knee"],
  // more shoulder
  ["Calcific tendinitis","tendinopathy","shoulder","rotator cuff","calcific tendinitis|calcium shoulder"],
  ["SLAP tear","sprain","shoulder","","slap lesion|superior labrum"],
  ["Scapular dyskinesis","overuse","shoulder","","scapular dyskinesis|winging|shoulder blade"],
  ["Pectoralis strain","strain","chest","pectoralis muscle","pec strain|chest muscle"],
  ["Thoracic outlet syndrome","nerve","shoulder","","thoracic outlet|tos"],
  // more hip
  ["Piriformis syndrome","nerve","hip","","piriformis|deep gluteal"],
  ["Snapping hip","overuse","hip","","snapping hip|clicking hip|coxa saltans"],
  ["Hip stress fracture","fracture","hip","","femoral neck stress"],
  ["Avascular necrosis","general","hip","","avn|osteonecrosis|avascular necrosis"],
  ["Meralgia paresthetica","nerve","hip","","meralgia|lateral thigh numbness"],
  ["Osteitis pubis","overuse","hip","","osteitis pubis|pubic pain"],
  ["Proximal hamstring tendinopathy","tendinopathy","hip","hamstring tendon","high hamstring|sit bone pain"],
  ["Pelvic girdle pain","overuse","hip","","pelvic girdle|pregnancy pelvic pain|spd"],
  // more ankle/foot
  ["Turf toe","sprain","foot","","turf toe|big toe sprain"],
  ["Sesamoiditis","overuse","foot","","sesamoiditis|sesamoid"],
  ["Tarsal tunnel syndrome","nerve","foot","","tarsal tunnel|foot nerve"],
  ["Hallux rigidus","oa","foot","","big toe arthritis|hallux rigidus|stiff big toe"],
  ["Sever's disease","overuse","foot","","severs|calcaneal apophysitis|child heel pain"],
  ["Cuboid syndrome","general","foot","","cuboid syndrome"],
  ["Lisfranc injury","sprain","foot","","lisfranc|midfoot sprain"],
  ["Posterior ankle impingement","impingement","ankle","","posterior impingement|os trigonum"],
  ["Flat feet","general","foot","","flat feet|fallen arches|pes planus|overpronation"],
  // more spine
  ["Degenerative disc disease","overuse","low back","","degenerative disc|ddd|disc degeneration"],
  ["Coccyx pain","overuse","low back","","tailbone pain|coccydynia|coccyx"],
  ["Cervical spondylosis","oa","neck","","neck arthritis|cervical spondylosis"],
  ["Costochondritis","overuse","chest","","costochondritis|rib joint pain|chest wall pain"],
  ["Rib injury","strain","chest","","bruised rib|rib sprain|intercostal"],
  ["Torticollis","strain","neck","","wry neck|torticollis|neck spasm"],
  // more elbow/wrist/hand
  ["Distal biceps rupture","postop","elbow","biceps tendon","biceps tear elbow"],
  ["Triceps tendinopathy","tendinopathy","elbow","triceps tendon","triceps tendon"],
  ["TFCC tear","sprain","wrist","","tfcc|wrist cartilage|ulnar wrist pain"],
  ["Ganglion cyst","general","wrist","","ganglion|wrist cyst"],
  ["Mallet finger","general","hand","","mallet finger|dropped fingertip"],
  ["Scaphoid fracture","fracture","wrist","","scaphoid|broken scaphoid"],
  ["Boxer's fracture","fracture","hand","","boxers fracture|knuckle fracture|metacarpal"],
  ["Dupuytren's contracture","general","hand","","dupuytren|hand contracture"],
  ["Wrist tendinopathy","tendinopathy","wrist","wrist tendon","wrist tendon|wrist overuse"],
  // more systemic / neuro / general
  ["Gout","general","joint","","gout|gouty|uric acid joint"],
  ["Sarcopenia","general","body","","muscle loss|sarcopenia|age muscle wasting"],
  ["Deconditioning","general","body","","deconditioned|out of shape|weak from rest|bed rest"],
  ["Peripheral artery disease","general","legs","","pad|claudication|leg circulation|artery legs"],
  ["Deep vein thrombosis","general","leg","","dvt|blood clot leg|calf clot"],
  ["Bell's palsy","general","face","","bells palsy|facial palsy|face droop"],
  ["Guillain-Barré","general","body","","guillain barre|gbs"],
  ["Spinal cord injury","general","body","","spinal cord injury|sci|paraplegia"],
  ["Cerebral palsy","general","body","","cerebral palsy|cp"],
  ["Muscular dystrophy","general","body","","muscular dystrophy|md"],
  ["Diastasis recti","overuse","core","","diastasis|ab separation|tummy gap"],
  ["Tension headache","general","neck","","tension headache|cervicogenic headache"],
  ["TMJ pain","overuse","jaw","","tmj|jaw pain|temporomandibular"],
  ["Plantar plate injury","sprain","foot","","plantar plate|toe joint pain"],
  ["Bunionette","general","foot","","bunionette|tailor's bunion"],
  ["Achilles bursitis","bursitis","ankle","","retrocalcaneal bursitis|heel bursa"],
  ["Kienböck's disease","general","wrist","","kienbock|lunate"],
  ["Compartment syndrome","general","shin","","compartment syndrome|exertional compartment"],
  ["Bone stress injury","fracture","body","","bone stress|stress reaction|overuse bone"],
  ["Post-op knee arthroscopy","postop","knee","","knee scope|knee arthroscopy"],
  ["Ankle fracture","fracture","ankle","","broken ankle|malleolus fracture"],
  ["Wrist fusion","postop","wrist","","wrist fusion|wrist arthrodesis"],
  ["Total ankle replacement","postop","ankle","","ankle replacement|ankle arthroplasty"],
  ["Rotator cuff calcific removal","postop","shoulder","","calcific removal"],
  ["Hamstring avulsion repair","postop","hip","hamstring tendon","hamstring avulsion|hamstring surgery"],
  ["Labral repair hip","postop","hip","","hip labral repair"],
  ["Bankart repair","postop","shoulder","","bankart|shoulder stabilisation surgery"],
  ["Carpal tunnel release","postop","wrist","","carpal tunnel surgery|ctr"],
  ["Bunion surgery","postop","foot","","bunionectomy|bunion surgery"],
  ["Plantar fascia release","postop","foot","plantar fascia","plantar release"],
  ["Neck strain","strain","neck","neck muscle","neck strain|pulled neck"],
  ["Levator scapulae strain","strain","neck","levator muscle","levator|neck shoulder knot"],
  ["Oblique strain","strain","core","oblique muscle","oblique strain|side strain"],
  ["Abdominal strain","strain","core","abdominal muscle","ab strain|stomach muscle pull"],
  ["Adductor tendinopathy","tendinopathy","hip","adductor tendon","adductor tendon|groin tendon"],
  ["Peroneal subluxation","instability","ankle","","peroneal subluxation|snapping peroneal"],
  ["Shoulder AC joint OA","oa","shoulder","","ac joint arthritis"],
  ["Wrist osteoarthritis","oa","wrist","","wrist arthritis"],
  ["Elbow osteoarthritis","oa","elbow","","elbow arthritis"],
  ["Facet joint arthritis neck","oa","neck","","cervical facet arthritis"],
  ["Trochlear / patellar OA","oa","knee","","patellofemoral arthritis|kneecap arthritis"],
  ["Big toe gout","general","foot","","podagra|toe gout"],
  ["Runner's knee","overuse","knee","","runners knee|patellofemoral runner"],
  ["Swimmer's shoulder","overuse","shoulder","","swimmers shoulder|swimming shoulder"],
  ["Thrower's elbow","overuse","elbow","","throwers elbow|ucl elbow|little league elbow"],
  ["Dead butt syndrome","general","hip","","dead butt|gluteal amnesia|glute inhibition"],
  ["Text neck","overuse","neck","","text neck|tech neck|phone neck"]
];

/* ---------- question templates (per condition) ---------- */
const acuteIce = "For a fresh, swollen flare, **ice** eases pain and swelling in the first few days (15–20 min with a cloth barrier). Once past the acute stage, **heat** helps stiffness and warming up. Neither speeds healing much — graded movement does more.";
const chronicIce = "For this, **heat** usually helps most — it eases stiffness and warms tissue before exercise. Use **ice** only for a fresh flare-up or swelling. Neither is a cure; progressive loading does the real work.";
const T = [
  { tag:"what",   ph:["what is","what's","about","tell me about","explain","meaning of","define"], a:(it,ar)=>`**${it.n}** — ${ar.what(it)}` },
  { tag:"sym",    ph:["symptoms","signs","how do i know","feel like","what does it feel","symptom of"], a:(it,ar)=>`**${it.n} — symptoms:** ${ar.sym(it)}` },
  { tag:"cause",  ph:["cause","what causes","why did i get","reason for","how did i get","what caused"], a:(it,ar)=>`**What causes ${it.n}:** ${ar.cause(it)}` },
  { tag:"treat",  ph:["treat","treatment for","how to treat","how do i treat","cure","get rid of","recover from","fix","how to heal","manage"], a:(it,ar)=>`**Treating ${it.n}:** ${ar.treat(it)}` },
  { tag:"ex",     ph:["exercises","exercise for","best exercises","what exercises","rehab exercises","physio exercises"], a:(it,ar)=>`**Exercises for ${it.n}:** ${ar.ex(it)}` },
  { tag:"stretch",ph:["stretch","stretches","stretching for","best stretch"], a:(it,ar)=>`**Stretching for ${it.n}:** gentle range within comfort helps, but **strengthening drives recovery more than stretching** here. ${ar.ex(it)} Stretch only into a pain-free range.` },
  { tag:"strong", ph:["strengthen","strengthening","strength exercises","build strength"], a:(it,ar)=>`**Strengthening for ${it.n}:** progressive strength work is the core of recovery. ${ar.ex(it)}` },
  { tag:"heal",   ph:["how long","heal","recovery time","take to heal","how long to recover","healing time","how long does"], a:(it,ar)=>`**How long ${it.n} takes:** ${ar.heal(it)} Everyone differs — follow symptoms and clinician advice, not just the calendar.` },
  { tag:"avoid",  ph:["avoid","should i avoid","what not to do","careful with","don't do","things to avoid"], a:(it,ar)=>`**With ${it.n}, avoid:** ${ar.avoid(it)}` },
  { tag:"ice",    ph:["ice or heat","should i ice","hot or cold","heat or ice","ice for","heat for"], a:(it,ar)=>`**Ice or heat for ${it.n}?** ${ar.acute?acuteIce:chronicIce}` },
  { tag:"rtnsport",ph:["return to sport","back to sport","play again","when can i play","return to activity"], a:(it,ar)=>`**Returning to sport after ${it.n}:** ${ar.rtn(it)}` },
  { tag:"rtnwork",ph:["return to work","back to work","go to work","work with"], a:(it,ar)=>`**Work with ${it.n}:** it depends on your job — desk work is usually possible early with movement breaks and modifications; heavy/manual work needs enough strength and control to do it safely without flaring. Ease back and adapt duties.` },
  { tag:"brace",  ph:["brace","support","taping","tape","should i wear","splint","sleeve"], a:(it,ar)=>`**Bracing/support for ${it.n}:** a brace, splint or taping can give short-term support and confidence — useful early or when returning to activity — but long-term reliance keeps the area weak. Use it to move and load safely, then wean off, and follow any clinician instructions.` },
  { tag:"surgery",ph:["surgery","operation","do i need surgery","surgical","operate","need an op"], a:(it,ar)=>`**Surgery for ${it.n}?** Most cases settle with good rehab and don't need it. Surgery is considered when conservative care fails over months, for significant structural damage, instability, or specific red flags — a specialist decides from your scans and function. Rehab is worthwhile either way.` },
  { tag:"serious",ph:["serious","see a doctor","should i see","red flag","dangerous","when to worry","is it bad"], a:(it,ar)=>`**Is ${it.n} serious?** Usually manageable, but seek assessment for: ${ar.red(it)} General red flags needing urgent care: chest pain, severe breathlessness, fainting, sudden weakness/numbness, trouble speaking, loss of bladder/bowel control, or a hot swollen joint with fever.` },
  { tag:"prevent",ph:["prevent","stop it coming back","avoid it again","prevention","stop it happening"], a:(it,ar)=>`**Preventing ${it.n} recurring:** ${ar.prevent(it)}` },
  { tag:"self",   ph:["home","self care","manage at home","cope with","living with","day to day","self-care"], a:(it,ar)=>`**Managing ${it.n} day-to-day:** keep gently moving within comfort, respect pain (≤3–4/10 that settles), manage your load, and use ice/heat for symptom relief. Sleep, protein and consistency speed recovery. ${ar.avoid(it)}` },
  { tag:"diet",   ph:["diet for","nutrition for","what to eat with","food for","best diet for","eating with"], a:(it,ar)=>`**Diet for ${it.n}:** no food heals it directly, but eating well supports recovery — enough **protein (~1.6–2.0 g/kg/day)**, plenty of fruit and veg, enough total calories and good hydration. An anti-inflammatory-style pattern (oily fish, colourful plants, less ultra-processed food) and a healthy weight reduce load and help.` },
  { tag:"physio", ph:["physiotherapy for","physio for","physical therapy for","see a physio for","should i see a physio","seeing a physio"], a:(it,ar)=>`**Physiotherapy for ${it.n}:** a physio assesses the cause, gives you a progressive exercise plan, adds hands-on or other treatments for symptom relief, and guides your return to activity — it's the mainstay for most ${ar.label} problems. This app builds a similar plan; an in-person physio adds assessment and hands-on progression.` },
  { tag:"willheal",ph:["will it heal","heal on its own","go away on its own","get better on its own","does it go away","will it get better"], a:(it,ar)=>`**Will ${it.n} heal on its own?** ${ar.acute?"Many acute injuries settle with time and sensible loading, but the right rehab makes recovery faster and lowers re-injury risk.":"It improves with the right loading and management more than with pure rest — doing the strengthening work speeds and secures the result."} ${ar.heal(it)}` },
  { tag:"homerx", ph:["at home treatment","home treatment for","treat at home","self treat","home remedy for"], a:(it,ar)=>`**Treating ${it.n} at home:** relative rest from the aggravating activity (not total rest), ice or heat for symptom relief, gentle range then progressive strengthening, and managing your daily load. ${ar.avoid(it)} Seek help if it's severe, follows a big injury, or isn't improving over a few weeks.` },
  { tag:"inject", ph:["cortisone for","injection for","steroid injection","should i get an injection","cortisone shot","injections for"], a:(it,ar)=>`**Injections for ${it.n}:** a corticosteroid injection can give short-term pain relief for some conditions, but it doesn't fix the cause and (tendons especially) repeated shots may weaken tissue. It's usually considered when exercise-based care hasn't settled things — a doctor weighs it up for your case, and rehab is still needed afterwards.` },
  { tag:"keepactive",ph:["can i still","can i keep","should i stop","carry on with","keep doing","can i exercise with"], a:(it,ar)=>`**Staying active with ${it.n}:** usually yes — **gentle activity within comfort beats resting completely**. Modify or reduce the specific movements that sharply flare it (keep pain ≤3–4/10 that settles) and keep the rest going. ${ar.avoid(it)}` },
  { tag:"permanent",ph:["permanent","will it come back","is it chronic","will it recur","is it forever","lifelong","get it again"], a:(it,ar)=>`**Is ${it.n} permanent?** ${ar.acute?"No — most acute injuries recover, though a few leave some lasting change; good rehab gives the best outcome and lowers recurrence.":"It can be persistent or recurring, but symptoms are very often well-controlled with ongoing strengthening and load management — many people become and stay pain-free."} Keeping strong and progressing load sensibly is your best insurance against recurrence.` },
  { tag:"weather",ph:["cold weather","weather affect","worse in the cold","worse in winter","damp weather"], a:(it,ar)=>`**Weather and ${it.n}:** many people feel stiffer or achier in cold, damp weather — it's real but doesn't mean harm. Keep warm, warm up a little longer, keep moving, and use heat for comfort; symptoms usually settle once you get going.` },
  { tag:"progress",ph:["signs of progress","how do i know it's healing","is it getting better","getting better","am i improving","improving"], a:(it,ar)=>`**Signs ${it.n} is improving:** less pain (and pain that settles faster after activity), more range and strength, easier daily tasks, and needing less pain relief. It's a **trend over weeks**, not day to day. Steadily worsening despite sensible loading? Get it reviewed.` },
  { tag:"modify", ph:["modifications for","how to modify","modify exercises","adapt exercises","make it easier","scale back"], a:(it,ar)=>`**Modifying activity for ${it.n}:** reduce the range, load, speed or reps of the aggravating movement rather than stopping — keep pain ≤3–4/10 that settles. Swap high-irritation moves for gentler versions and build back up ~10%/week. The Program tab can Swap exercises within your precautions.` },
  { tag:"orthotics",reg:"lower",ph:["orthotics for","insoles for","shoe inserts","arch support"], a:(it,ar)=>`**Orthotics/insoles for ${it.n}:** supportive shoes or off-the-shelf insoles can offload and ease symptoms short-term, especially early — but they don't replace strengthening and load management. Use them if they help comfort; custom orthotics are for specific persistent cases a clinician assesses.` },
  { tag:"footwear",reg:"lower",ph:["footwear for","shoes for","best shoes","what shoes"], a:(it,ar)=>`**Footwear for ${it.n}:** supportive, cushioned, well-fitting shoes for your activity help; avoid worn-out or unsupportive footwear while symptomatic. There's no single 'best' shoe — comfort and changing gradually matter most.` },
  { tag:"sleep",  ph:["sleep position","how to sleep with","best position to sleep","sleeping with","sleep with"], a:(it,ar)=>`**Sleeping with ${it.n}:** find the position that keeps the area comfortable and supported — a pillow between or under the limb often offloads it. Shift position if it aches, keep gently mobile in the day, and expect disturbed sleep early on to ease as symptoms settle.` },
  { tag:"flare",  ph:["flare up","flare-up","it flared","got worse suddenly","aggravated it","setback"], a:(it,ar)=>`**A flare-up of ${it.n}:** flares are normal and rarely undo progress. **Drop back a level** for a few days, keep moving gently, use ice/heat for comfort, and let it settle before progressing again. It usually just means a bit too much, too soon.` },
  { tag:"compress",ph:["compression for","should i use compression","compression sleeve","strapping for swelling"], a:(it,ar)=>`**Compression for ${it.n}:** a sleeve or wrap can ease swelling and give comforting support early — pair it with elevation and gentle movement. It's for symptom relief, not a fix; not so tight it restricts circulation.` },
  { tag:"stiffprev",ph:["prevent stiffness","stop it stiffening","keep it moving","reduce stiffness"], a:(it,ar)=>`**Preventing stiffness with ${it.n}:** move the area gently and often through its comfortable range — little and often beats long stillness — and use heat before activity. After injury/surgery, early appropriate movement is the best anti-stiffness measure, within your precautions.` },
  { tag:"nsaid", ph:["nsaids for","ibuprofen for","anti-inflammatory for","painkillers for","pain relief for"], a:(it,ar)=>`**Pain relief for ${it.n}:** short-term OTC options can help you stay active — ask a pharmacist/doctor what suits you. Heavy or prolonged NSAID use may blunt healing (tendon and bone especially), so use the least needed and don't mask pain to push harder. This app can't advise on your specific meds.` },
  { tag:"pool",  ph:["swimming with","pool for","aqua for","water exercise for","hydrotherapy for"], a:(it,ar)=>`**Pool/water for ${it.n}:** water offloads the area (buoyancy) while giving gentle resistance — great early rehab when land-based movement is sore. There's a Pool/aquatic set in the Library. Stay where you can stand if you're not a confident swimmer, and never swim alone.` },
  { tag:"cycle", reg:"lower",ph:["cycling with","bike with","is cycling ok","bike ok"], a:(it,ar)=>`**Cycling with ${it.n}:** low-impact and joint-friendly, so it's often good early cardio and leg work. Set the saddle for a slight knee bend, keep resistance comfortable, and stop if a specific pain rises.` },
  { tag:"travel",ph:["travel with","flying with","long flight","long journey"], a:(it,ar)=>`**Travelling with ${it.n}:** on long trips move and stretch every ~hour, stay hydrated, and after a lower-limb injury/surgery do ankle pumps and consider compression to lower clot risk. Pack any brace and pain relief and keep gently mobile.` },
  { tag:"firstaid",skip:["postop"],ph:["first aid for","just injured","what to do right away","immediately after","acute care","just did it"], a:(it,ar)=>`**Just injured — ${it.region}:** early on protect it, avoid harmful movement, use ice and compression for comfort, elevate, and get gentle pain-free movement going soon (long rest slows recovery). Seek care if you can't bear weight/use it, there's a deformity, rapid big swelling, or numbness. Then load gradually.` },
  { tag:"gymavoid",ph:["gym exercises to avoid","what gym exercises","avoid at the gym","weights to avoid","lifting with"], a:(it,ar)=>`**At the gym with ${it.n}:** avoid the specific loaded moves that sharply provoke it and scale load right down on the rest — keep pain ≤3–4/10 that settles. Substitute gentler variations and build back ~10%/week. The Program/Library let you Swap within your precautions.` },
  { tag:"acutechronic",ph:["acute or chronic","is it acute","is it chronic","how long has","early or long term"], a:(it,ar)=>`**Acute vs chronic ${it.n}:** 'acute' means recent (roughly the first 0–6 weeks) when tissue is settling — care protects it while keeping gentle motion; 'chronic' means beyond ~6 weeks or recurring — recovery shifts to progressive loading and strengthening. Your plan adapts to which stage you're in.` },
  { tag:"severity",ph:["how bad is","grades of","severity of","how serious is it","is it a bad"], a:(it,ar)=>`**How bad is ${it.n}?** Severity ranges from mild irritation to significant injury. Better signs: you can move and bear load with manageable pain that settles. Worse signs: can't use/bear weight on it, marked weakness, big rapid swelling, deformity, or numbness — those warrant assessment. ${ar.red(it)}` },
  { tag:"untreated",ph:["if untreated","if i ignore","don't treat","leave it alone","what if i do nothing"], a:(it,ar)=>`**If ${it.n} is left untreated:** mild cases can settle on their own, but ignoring it often means slower recovery, more stiffness/weakness, and a higher chance it lingers or recurs. Sensible loading and management give the best, most reliable outcome — you don't need to rest and wait.` },
  { tag:"worsen", ph:["can it get worse","will it get worse","getting worse","is it worsening"], a:(it,ar)=>`**Can ${it.n} get worse?** It can if you keep overloading it or push through sharp/rising pain — so respect pain (≤3–4/10 that settles) and progress gradually. Steadily worsening pain, spreading numbness/weakness, or new red-flag symptoms despite sensible care mean get it reviewed.` },
  { tag:"risk",   ph:["who gets","risk factors","am i at risk","more likely to get","predisposed"], a:(it,ar)=>`**Risk factors for ${it.n}:** ${ar.cause(it)} Poor conditioning, previous injury, sudden training changes, and general health/lifestyle factors all raise risk — most are modifiable with gradual loading and staying strong.` },
  { tag:"kids",   ph:["child with","kids with","my son","my daughter","in children","teenager with"], a:(it,ar)=>`**${it.n} in a child/teen:** young bodies (especially around growth plates) often need a bit more caution — gentle, playful, supervised loading and adequate rest, avoiding pushing through pain during growth spurts. Growth-plate and persistent or one-sided pain in children should be assessed. Get a paediatric-aware clinician's input for anything significant.` },
  { tag:"older",  ph:["older adult with","elderly with","in older","senior with","in my 70s","in my 80s"], a:(it,ar)=>`**${it.n} in an older adult:** it's never too late to rehab — older adults gain strength, balance and function just like younger ones. Start gentle, progress steadily, work near support if unsteady, and prioritise protein and sleep. Add balance work — it's the best fall-prevention there is.` },
  { tag:"weight", ph:["weight and","does weight matter","lose weight for","overweight with","obesity and"], a:(it,ar)=>`**Weight and ${it.n}:** carrying excess weight adds load and inflammation, so losing some can meaningfully **reduce pain and improve function** — especially for weight-bearing joints (several times your body-weight change goes through the knee each step). Combine diet + activity + strength to keep muscle.` },
  { tag:"posture",ph:["posture and","ergonomics for","desk setup for","sitting with","posture for"], a:(it,ar)=>`**Posture/ergonomics with ${it.n}:** there's no single 'perfect' posture — the best position is your **next** one, so vary it and take movement breaks. Set your desk/chair so you're supported and relaxed, and break up long static positions. Movement and strength matter more than rigid posture.` },
  { tag:"restmove",ph:["rest or move","should i rest","rest or exercise","move it or rest","stay still"], a:(it,ar)=>`**Rest or move ${it.n}?** Mostly **move** — gentle, graded activity within comfort recovers better than prolonged rest, which leaves the area weak and stiff. Rest the specific aggravating spike for a few days if it's very irritable, but keep the rest of you (and the area, gently) moving.` },
  { tag:"mobility",ph:["mobility for","mobility exercises","range of motion for","loosen up","rom for"], a:(it,ar)=>`**Mobility for ${it.n}:** gentle, frequent range-of-motion within comfort restores movement and eases stiffness — do it little and often, warm up first, and don't force painful end-range. Pair mobility with strengthening, which drives the lasting recovery.` },
  { tag:"stairs", reg:"lower",ph:["stairs with","hills with","going up stairs","climbing stairs","down stairs hurt"], a:(it,ar)=>`**Stairs/hills with ${it.n}:** lead with the stronger leg going **up** and the weaker leg going **down** if it's painful, use the rail, and take them one at a time early on. Stairs are great graded strengthening — build tolerance gradually as it settles.` },
  { tag:"balance",reg:"lower",ph:["balance with","balance exercises for","steadiness with","falls with"], a:(it,ar)=>`**Balance with ${it.n}:** rebuild it with standing balance work near a sturdy support (single-leg stands, weight shifts, tandem stance), progressing to eyes-closed or softer surfaces only when steady. Good balance protects the ${it.region} and prevents re-injury and falls.` },
  { tag:"common", ph:["how common is","is it common","is it rare","common injury","who else gets"], a:(it,ar)=>`**Is ${it.n} common?** It's a well-recognised ${ar.label} problem that clinicians see regularly, so you're not alone and it's well understood. Being common is reassuring — the management pathway is well-established: settle symptoms, then load progressively.` },
  { tag:"safeload",ph:["safe to exercise","will exercising make it worse","damage by exercising","is it safe to move","hurt to load"], a:(it,ar)=>`**Is it safe to exercise with ${it.n}?** Generally yes — appropriate, graded loading **helps** rather than harms. Keep pain ≤3–4/10 that settles within 24 hours, avoid the sharply provoking movements, and progress ~10% a week. Pain doesn't automatically mean damage, but sharp or rising pain means ease off.` },
  { tag:"stages", ph:["recovery stages","phases of recovery","stages of","what to expect","recovery journey"], a:(it,ar)=>`**Recovery stages for ${it.n}:** roughly — (1) settle irritable symptoms and protect; (2) restore full pain-free range; (3) rebuild strength; (4) return to sport/full function with power, speed and control. You progress a stage when the current one feels controlled — not on a fixed clock. ${ar.heal(it)}` },
  { tag:"taping", ph:["how to tape","strapping for","kinesio tape","k tape","taping technique for"], a:(it,ar)=>`**Taping for ${it.n}:** taping (rigid or kinesiology) can offload tissue, give feedback and add confidence for a session or return to activity — a short-term aid, not a cure. Have it applied correctly (a physio can show you), don't rely on it long-term, and keep building strength underneath.` },
  { tag:"movavoid",ph:["movements to avoid","exercises to avoid","what movements","which exercises to avoid","positions to avoid"], a:(it,ar)=>`**Movements to limit with ${it.n}:** cut back the specific loaded movements that sharply flare it (keep pain ≤3–4/10 that settles), and any of your listed precautions. ${ar.avoid(it)} Swap to gentler variations and rebuild — you rarely need to avoid a movement forever, just scale it for now.` }
];
// run-return template only for lower-limb regions
const LOWER = new Set(["knee","hip","ankle","foot","shin","calf","thigh","feet","low back"]);

/* ---------- assemble ----------
   buildCoachKB() expands the seed above into the flat [{kw,a}] array that
   coachAnswer() scans. Everything mutated below is function-local, so calling
   it more than once (browser + tests in one process) yields identical output. */
export function buildCoachKB(){
const out = [];
const seen = new Set();
const add = (kw, a) => {
  kw = [...new Set(kw.map(lower).filter(Boolean))];
  const sig = a.slice(0, 60);
  if(seen.has(sig)) return;
  seen.add(sig);
  out.push({ kw, a });
};

/* auto-generate condition families (archetype × anatomical site) — deduped by name against curated ITEMS.
   Work on a LOCAL copy of ITEMS so the module-level seed is never mutated. */
const items = ITEMS.slice();
const have = new Set(items.map(i=>lower(i[0])));
const addCond = (n, arch, region, tissue, aka) => { if(!have.has(lower(n))){ have.add(lower(n)); items.push([n, arch, region, tissue, aka]); } };
const FRAC = [["Clavicle","shoulder"],["Humerus","shoulder"],["Shoulder blade","shoulder"],["Elbow","elbow"],["Forearm","wrist"],["Radius","wrist"],["Ulna","wrist"],["Wrist","wrist"],["Scaphoid","wrist"],["Metacarpal","hand"],["Hand","hand"],["Finger","hand"],["Thumb","thumb"],["Rib","chest"],["Sternum","chest"],["Pelvis","hip"],["Hip","hip"],["Femur","thigh"],["Kneecap","knee"],["Tibia","shin"],["Fibula","shin"],["Shin","shin"],["Ankle","ankle"],["Heel","foot"],["Talus","ankle"],["Navicular","foot"],["Cuboid","foot"],["Metatarsal","foot"],["Toe","foot"],["Foot","foot"],["Vertebral compression","low back"],["Sacrum","low back"],["Jaw","jaw"],["Nose","face"],["Cheekbone","face"],["Growth plate","body"]];
FRAC.forEach(([b,r])=>addCond(`${b} fracture`,"fracture",r,"",`broken ${b.toLowerCase()}|${b.toLowerCase()} break|fractured ${b.toLowerCase()}`));
const OAJ = [["Big toe","foot"],["Midfoot","foot"],["Subtalar","ankle"],["Facet","low back"],["SI joint","hip"],["Sternoclavicular","chest"],["Patellofemoral","knee"],["First CMC","thumb"],["PIP finger","hand"],["DIP finger","hand"],["Radiocarpal","wrist"],["Glenohumeral","shoulder"],["Tibiofemoral","knee"],["Metatarsophalangeal","foot"]];
OAJ.forEach(([j,r])=>addCond(`${j} osteoarthritis`,"oa",r,"",`${j.toLowerCase()} arthritis|${j.toLowerCase()} oa`));
const SPR = [["Finger","hand"],["Toe","foot"],["Midfoot","foot"],["Elbow","elbow"],["Wrist ligament","wrist"],["Knee ligament","knee"],["Neck","neck"],["Lower back","low back"],["Shoulder","shoulder"],["Foot","foot"]];
SPR.forEach(([s,r])=>addCond(`${s} sprain`,"sprain",r,"",`${s.toLowerCase()} ligament|sprained ${s.toLowerCase()}`));
const BUR = [["Shoulder","shoulder"],["Hip","hip"],["Knee","knee"],["Elbow","elbow"],["Heel","foot"],["Ankle","ankle"],["Ischial","hip"],["Iliopsoas","hip"],["Achilles","ankle"],["Kneecap","knee"]];
BUR.forEach(([s,r])=>addCond(`${s} bursitis`,"bursitis",r,"",`${s.toLowerCase()} bursa`));
const STR = [["Calf","calf"],["Hamstring","hip"],["Quadriceps","thigh"],["Groin","hip"],["Hip flexor","hip"],["Adductor","hip"],["Bicep","elbow"],["Tricep","elbow"],["Pectoral","chest"],["Rotator cuff","shoulder"],["Oblique","core"],["Lower back","low back"],["Neck","neck"],["Trapezius","neck"],["Rhomboid","mid back"],["Forearm","wrist"]];
STR.forEach(([m,r])=>addCond(`${m} strain`,"strain",r,`${m.toLowerCase()} muscle`,`pulled ${m.toLowerCase()}|${m.toLowerCase()} tear`));
const TEN = [["Gluteal","hip"],["Adductor","hip"],["Hip flexor","hip"],["Tibialis anterior","ankle"],["Tibialis posterior","ankle"],["Peroneal","ankle"],["Wrist extensor","wrist"],["Wrist flexor","wrist"],["Supraspinatus","shoulder"],["Infraspinatus","shoulder"],["Distal biceps","elbow"],["Triceps","elbow"],["Semitendinosus","knee"]];
TEN.forEach(([t,r])=>addCond(`${t} tendinopathy`,"tendinopathy",r,`${t.toLowerCase()} tendon`,`${t.toLowerCase()} tendinitis|${t.toLowerCase()} tendon pain`));
const NRV = [["Median nerve","wrist"],["Ulnar nerve","elbow"],["Radial nerve","elbow"],["Sciatic nerve","low back"],["Femoral nerve","hip"],["Peroneal nerve","knee"],["Tibial nerve","foot"],["Suprascapular nerve","shoulder"],["Lateral femoral cutaneous nerve","hip"]];
NRV.forEach(([nv,r])=>addCond(`${nv} entrapment`,"nerve",r,"",`${nv.toLowerCase()}|pinched ${nv.toLowerCase()}`));
const DIS = [["Shoulder","shoulder"],["Kneecap","knee"],["Finger","hand"],["Elbow","elbow"],["Hip","hip"],["Ankle","ankle"],["Thumb","thumb"],["Jaw","jaw"]];
DIS.forEach(([d,r])=>addCond(`${d} dislocation`,"instability",r,"",`dislocated ${d.toLowerCase()}|${d.toLowerCase()} subluxation`));
const POP = [["Meniscus repair","knee"],["Cartilage repair","joint"],["Tendon repair","tendon"],["Ligament repair","ligament"],["Fracture fixation","bone"],["Joint fusion","joint"],["Nerve decompression","nerve"],["Tenotomy","tendon"],["Osteotomy","bone"],["Joint arthroscopy","joint"],["Muscle repair","muscle"],["Rotator cuff debridement","shoulder"],["Elbow replacement","elbow"],["Wrist replacement","wrist"],["Ankle fusion","ankle"],["Spinal decompression","low back"],["Disc replacement","low back"],["Toe surgery","foot"]];
POP.forEach(([p,r])=>addCond(`${p}`,"postop",r,"",`after ${p.toLowerCase()}|${p.toLowerCase()} recovery|${p.toLowerCase()} rehab`));
const STRESSF = [["Metatarsal stress","foot"],["Tibial stress","shin"],["Femoral neck stress","hip"],["Navicular stress","foot"],["Sesamoid stress","foot"],["Sacral stress","low back"],["Calcaneal stress","foot"],["Fibular stress","shin"],["Pars interarticularis stress","low back"]];
STRESSF.forEach(([b,r])=>addCond(`${b} fracture`,"fracture",r,"",`${b.toLowerCase()}|${b.toLowerCase()} reaction`));
const STR2 = [["Gastrocnemius","calf"],["Soleus","calf"],["Rectus femoris","thigh"],["Biceps femoris","hip"],["Latissimus dorsi","mid back"],["Serratus anterior","chest"],["Sternocleidomastoid","neck"],["Intercostal","chest"],["Erector spinae","low back"],["Wrist flexor","wrist"],["Wrist extensor","wrist"],["Deltoid","shoulder"]];
STR2.forEach(([m,r])=>addCond(`${m} strain`,"strain",r,`${m.toLowerCase()} muscle`,`pulled ${m.toLowerCase()}|${m.toLowerCase()} tear`));
const TEN2 = [["Gluteus minimus","hip"],["Iliopsoas","hip"],["Popliteus","knee"],["Plantar","foot"],["Common extensor","elbow"],["Common flexor","elbow"],["Quadriceps","knee"],["Subscapularis","shoulder"],["Flexor hallucis","ankle"],["Extensor carpi","wrist"]];
TEN2.forEach(([t,r])=>addCond(`${t} tendinopathy`,"tendinopathy",r,`${t.toLowerCase()} tendon`,`${t.toLowerCase()} tendinitis`));
const NRV2 = [["Cervical nerve root","neck"],["Lumbar nerve root","low back"],["Posterior tibial nerve","foot"],["Digital nerve","hand"],["Axillary nerve","shoulder"],["Long thoracic nerve","shoulder"],["Obturator nerve","hip"],["Superficial peroneal nerve","ankle"]];
NRV2.forEach(([nv,r])=>addCond(`${nv} entrapment`,"nerve",r,"",`${nv.toLowerCase()}|pinched ${nv.toLowerCase()}`));
const OAJ2 = [["Acromioclavicular","shoulder"],["Elbow","elbow"],["Wrist","wrist"],["Hand","hand"],["Cervical facet","neck"],["Midfoot","foot"]];
OAJ2.forEach(([j,r])=>addCond(`${j} osteoarthritis`,"oa",r,"",`${j.toLowerCase()} arthritis`));
const BUR2 = [["Subacromial","shoulder"],["Infrapatellar","knee"],["Calcaneal","foot"],["Greater trochanteric","hip"]];
BUR2.forEach(([s,r])=>addCond(`${s} bursitis`,"bursitis",r,"",`${s.toLowerCase()} bursa`));
const INST = [["Ankle instability","ankle","chronic ankle instability|recurrent ankle sprain"],["Shoulder multidirectional instability","shoulder","mdi shoulder"],["Patellar instability","knee","unstable kneecap"],["Wrist instability","wrist","unstable wrist"]];
INST.forEach(([n,r,a])=>addCond(n,"instability",r,"",a));
const OVER = [["Runner's hip","hip","hip overuse running"],["Golfer's wrist","wrist","wrist overuse golf"],["Climber's finger","hand","finger pulley|climber finger"],["Rower's back","low back","rowing back pain"],["Cyclist's knee","knee","cycling knee pain"],["Dancer's hip","hip","snapping dancer hip"],["Thrower's shoulder","shoulder","throwing shoulder"],["Server's shoulder","shoulder","serving shoulder"]];
OVER.forEach(([n,r,a])=>addCond(n,"overuse",r,"",a));
const POP2 = [["ACL revision surgery","knee"],["Achilles repair","ankle"],["Bunion correction","foot"],["Hardware removal","bone"],["Manipulation under anaesthetic","shoulder"],["Cheilectomy","foot"],["Fasciotomy","shin"],["Trigger finger release","hand"],["Dupuytren's release","hand"],["Ganglion excision","wrist"]];
POP2.forEach(([p,r])=>addCond(p,"postop",r,"",`after ${p.toLowerCase()}|${p.toLowerCase()} recovery`));

for(const [n, archKey, region, tissue, akaStr] of items){
  const ar = A[archKey] || A.general;
  const it = { n, region, tissue, aka:(akaStr?akaStr.split("|"):[]) };
  const nameKw = [lower(n), ...it.aka];
  for(const t of T){
    if(t.reg==="lower" && !LOWER.has(region)) continue;   // orthotics/footwear/cycling/stairs/balance → lower limb only
    if(t.skip && t.skip.includes(archKey)) continue;
    add([...nameKw, ...t.ph.map(p=>p+" "+lower(n).split(" ").slice(-1)[0]), ...t.ph], t.a(it, ar));
  }
  if(LOWER.has(region)){
    add([...nameKw, "return to running","back to running","can i run","when can i run","run with"],
      `**Running after ${n}:** return once you can walk briskly pain-free, have near-equal side-to-side strength, and can hop/load the ${region} without a next-day flare. Use a **walk-run progression**, increasing volume ~10% a week and backing off if symptoms rise.`);
  }
}

/* ---------- region topic family ---------- */
const REGIONS = ["shoulder","knee","hip","ankle","foot","low back","neck","elbow","wrist","hand","calf","hamstring","thigh"];
const REGION_TOPICS = [
  { ph:["pain","hurts","aching","sore"], a:r=>`**${cap(r)} pain** has many causes (overload, injury, joint change, referred pain). The general approach: settle irritable symptoms, keep moving within comfort, and progressively strengthen the ${r} and the muscles around it. See a clinician if it's severe, follows a big injury, comes with numbness/weakness or fever, or isn't improving over a few weeks.` },
  { ph:["stiff","stiffness","tight","won't move","limited range"], a:r=>`**${cap(r)} stiffness** usually eases with **gentle, frequent movement** through the comfortable range, warmth before activity, and progressive loading. Morning stiffness that loosens within ~30 minutes is common; stiffness that's severe, locking, or with a hot swollen joint needs review.` },
  { ph:["weak","weakness","gives way","can't lift","buckling"], a:r=>`**${cap(r)} weakness** responds to **progressive strengthening** — start where you can control the movement and build load gradually. Sudden, marked or spreading weakness (especially with numbness or after trauma) is different and needs prompt assessment.` },
  { ph:["swelling","swollen","puffy"], a:r=>`**${cap(r)} swelling:** compression, elevation and gentle muscle-pumping movement help most; ice eases pain in the first few days. A joint that's suddenly hot, red and very swollen with fever — or a hot, swollen, painful calf — needs urgent review.` },
  { ph:["exercises for","best exercises","strengthen","strengthening"], a:r=>`**Strengthening the ${r}:** work the muscles that move and support it through a pain-free range, 2–3 sets of 8–15 reps at a controlled, challenging effort, progressing ~10% a week. Add balance/control work for lower-limb regions. Your Program tab builds this for your specific condition.` },
  { ph:["clicking","popping","clunking","cracking","noise"], a:r=>`**${cap(r)} clicking or popping** without pain, swelling or giving-way is usually harmless (gas bubbles, tendons moving over bone) and doesn't need treatment. Noise **with** pain, swelling, catching/locking or instability is worth getting assessed.` },
  { ph:["clicking with pain","locking","catching","gives way"], a:r=>`Catching, locking or the ${r} 'giving way' — especially with pain or swelling — can suggest a mechanical issue (e.g. cartilage or instability) and is worth an in-person assessment. Meanwhile, avoid the movements that trigger it and keep the surrounding muscles strong.` }
];
for(const r of REGIONS){
  for(const tp of REGION_TOPICS){
    add([r, ...tp.ph.map(p=>r+" "+p), ...tp.ph.map(p=>p+" "+r)], tp.a(r));
  }
}

/* ---------- movement / exercise safety family ---------- */
const MOVES = [
  ["squats","a foundational strengthener for the whole leg. Keep knees tracking over the toes, control the descent, and start with a comfortable depth — it's knee-friendly when built up gradually, not harmful."],
  ["lunges","great single-leg strength and control. Keep a vertical front shin and control the depth; reduce range or hold support if the knee complains, and build up gradually."],
  ["planks","a good anti-extension core builder. Keep a straight line and brace gently; drop to the knees to regress. Avoid if you have precautions against sustained trunk loading."],
  ["deadlifts","a strong hip-hinge for the posterior chain and back. Hinge from the hips with a long spine, keep the load close, and progress load slowly — technique first."],
  ["running","excellent aerobic and bone-loading exercise. Build volume ~10% a week, use supportive shoes, and back off if a specific pain rises during or the next day."],
  ["walking","one of the best all-round recoveries — low-impact, pumps swelling away, and builds aerobic base. Almost always safe; build up your daily total gradually."],
  ["cycling","low-impact aerobic and quad work that's gentle on joints. Set the saddle so the knee has a slight bend at the bottom; great early cardio when weight-bearing hurts."],
  ["swimming","a low-impact whole-body option that offloads joints. Vary strokes to avoid overloading the shoulders/neck; excellent for arthritis and general fitness."],
  ["yoga","builds mobility, control and relaxation. Work within a pain-free range, avoid forcing end-range, and skip positions your precautions restrict."],
  ["pilates","good for core control and controlled strengthening. Keep movements within comfort and honour any spinal or surgical precautions."],
  ["stairs","a functional strengthener. Lead with the stronger leg going up and the weaker going down if painful, use the rail, and build tolerance gradually."],
  ["stretching","restores range and eases stiffness, but for most conditions **strengthening drives recovery more**. Stretch gently into a comfortable range, hold ~20–30s, and don't force painful end-range."],
  ["weights","progressive resistance is the core of rehab and safe when built up. Start light with good form, leave 1–2 reps in reserve, and add load gradually (~10%/week)."],
  ["hiit","high-intensity intervals build fitness fast but are demanding — only once you have a base and clearance, and not if you have cardiac/uncontrolled BP precautions. Judge effort by RPE."],
  ["core exercises","support the spine and pelvis. Favour control (bracing, bird-dog, dead-bug, planks) over sit-ups if you have back issues, and keep the low back stable."]
];
for(const [m, txt] of MOVES){
  add([m, "is "+m+" safe", m+" good for me", "how to "+m, "can i do "+m, m+" bad for", m+" ok"],
    `**${cap(m)}:** ${txt} If you have specific precautions or a painful condition, check it fits your plan — your Program tab keeps exercises within your precautions.`);
}

/* ---------- symptom family ---------- */
const SYMPTOMS = [
  ["night pain","Pain that's worse at night is common with many conditions (inflammation, positions). But **constant, severe night pain that isn't eased by position**, especially with unexplained weight loss, fever or a cancer history, should be assessed — occasionally it points to something needing investigation."],
  ["morning stiffness","Stiffness that loosens within ~30 minutes of moving is typical of everyday joint issues. Stiffness lasting **over an hour**, in many joints, with swelling, may suggest inflammatory arthritis and is worth a review."],
  ["numbness","Occasional positional tingling often eases with movement and nerve-glides. **Spreading or persistent numbness/weakness, a dropping foot, both-sided symptoms, or any loss of bladder/bowel control or groin numbness are urgent** — seek care now."],
  ["pins and needles","Brief pins-and-needles from a position or irritable nerve usually settles with movement. Persistent or spreading tingling with weakness needs assessment."],
  ["giving way","A joint 'giving way' suggests weakness, pain-inhibition or instability. Strengthen the surrounding muscles, avoid the trigger movements, and get it assessed if it's recurrent or follows a dislocation."],
  ["locking","A joint that truly locks (won't move past a point) can indicate a mechanical block (e.g. cartilage) and is worth an in-person assessment."],
  ["burning pain","Burning or electric pain often points to a nerve source — try positions that ease it and gentle nerve-glides, and review it if it spreads or brings weakness."],
  ["throbbing","Throbbing usually reflects inflammation or increased blood flow to an irritated area — relative rest, elevation and ice for comfort help. Throbbing with heat, redness and fever could be infection."],
  ["bruising","Bruising after an injury reflects bleeding in the tissue and usually clears over 1–2 weeks. Large, rapidly-spreading bruising, or bruising with marked weakness, warrants a check for a significant tear or fracture."]
];
for(const [s, txt] of SYMPTOMS){
  add([s, s+" cause", "why do i have "+s, "what does "+s+" mean", s+" during exercise"], `**${cap(s)}:** ${txt}`);
}

/* ---------- return-to / general-health family ---------- */
const GEN = [
  [["return to work","back to work after injury","when can i work"], "Returning to work depends on your job's demands and your condition. Desk-based work is usually possible early with regular movement breaks and a good set-up; physical/manual work needs enough strength, range and control to do the tasks safely without flaring. Phase back in, modify duties, and use pacing."],
  [["return to driving","when can i drive","drive after"], "Driving needs enough range, strength and reaction to control the car and perform an emergency stop safely — and you must be off any sedating medication. After surgery or a significant injury, follow your surgeon's guidance and check your insurer's rules before driving."],
  [["return to gym","back to the gym","gym after injury"], "Return to the gym by scaling load right down and rebuilding: keep exercises pain-free (≤3–4/10 that settles), leave reps in reserve, and progress ~10% a week. Swap around anything that flares your condition — the Program and Library let you sub exercises within your precautions."],
  [["how to warm up","warm up","warmup before"], "A good warm-up is 5–10 minutes of easy movement that raises tissue temperature, plus a few lighter sets of what you're about to do. It lowers injury risk and improves performance. A gentle cool-down eases post-exercise stiffness."],
  [["overtraining","doing too much","training too hard"], "Signs of doing too much: pain that's worse the next morning, rising fatigue, poor sleep, stalled progress or frequent niggles. The fix is to **deload** for a few days, then progress more gradually (~10%/week) with recovery built in. A dip in HRV can be an early warning."],
  [["motivation","stay consistent","give up","discouraged"], "Recovery is slow and non-linear — that doesn't mean it isn't working. Keep sessions short, anchor them to an existing daily habit, track small wins (reps, range, less pain), and be kind to yourself on off days. Stuck for weeks with no trend? A physio can refresh the plan."],
  [["how much protein","protein for healing","protein intake"], "Healing and muscle need protein — aim for roughly **1.6–2.0 g per kg of body-weight per day**, spread across meals, alongside enough total calories and plenty of fruit and veg. Supplements don't replace real food, sleep and progressive loading."],
  [["supplements","vitamins for recovery","collagen","creatine"], "Most people recover well without supplements — protein, sleep, and progressive loading matter far more. Vitamin D and calcium support bone; creatine can aid strength training; collagen evidence is mixed. Check with a pharmacist/doctor, especially with other medications."],
  [["can i exercise when sick","exercise with a cold","train when ill"], "A rough guide: mild symptoms **above the neck** (runny nose, mild sore throat) — gentle exercise is usually fine. Symptoms **below the neck** (chesty cough, body aches, fever) — rest until they pass. Never push hard with a fever."],
  [["how many rest days","rest days","recovery days"], "Rest days are part of getting stronger — tissue adapts between sessions, not during them. For most rehab, alternating harder and easier days, or 1–2 full rest days a week, works well; listen to soreness and sleep."]
];
for(const [ph, a] of GEN) add(ph, a);

  return out;
}
