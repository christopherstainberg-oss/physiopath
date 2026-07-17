/* =====================================================================
   EXPLANATIONS — generated at render time from knowledge maps
===================================================================== */
const P_ALIAS = window.PROTOCOL_ALIAS || {};
function resolveProto(p){ return (window.PROTOCOLS && window.PROTOCOLS[p]) ? p : (P_ALIAS[p] || "general_msk"); }

const PROTOCOL_APPROACH = {
  charcot:"completely offloading the foot until your specialist confirms it has cooled — training everything except that foot — then rebuilding protected walking in bespoke footwear",
  rhabdo:"recovering medically first — no training until you're cleared — then rebuilding aerobic capacity and strength far more gradually than usual, with hydration and heat managed",
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
  cardiac_surgery:"protecting the healing breastbone (sternal precautions) with legs-and-walking-led reconditioning early, then adding upper-body strength once the sternum has knit and you're cleared",
  arrhythmia:"aerobic and resistance exercise kept within safe heart-rate limits",
  pulmonary_rehab:"paced aerobic and strength work combined with breathing techniques",
  post_covid:"energy-paced, gradually progressed reconditioning to avoid setbacks",
  ild:"paced, oxygen-monitored aerobic work and breathing techniques",
  thoracic_surgery:"breathing and airway work plus graded reconditioning, respecting incision precautions",
  pulm_hypertension:"very conservative, low-to-moderate exercise strictly within prescribed limits",
  asthma:"well-warmed-up aerobic and strength work, using your action plan to prevent symptoms",
  abdominal_surgery:"protecting the healing abdominal wall (abdominal precautions) with walking, breathing and gentle deep-core/pelvic-floor reactivation early, then graded core and loading once cleared"
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
  pump:{what:"An ankle pump — the simplest exercise there is: pointing and flexing your foot to squeeze the calf and push blood back up the leg.",how:"Point your toes away, then pull them back towards your nose, slowly and fully, little and often through the day.",why:"Your calf is a pump. Every squeeze pushes blood back towards your heart, which reduces swelling and lowers the risk of a clot while you're less mobile than usual. It costs nothing and needs no equipment."},
  ped_handling:{what:"Parent-led handling — gentle positioning and movement done FOR your baby, not by them.",how:"On a firm, safe surface, support the limb with your whole hand and move it slowly only as far as it goes easily, a few times a day.",why:"Keeps joints and muscles supple while a newborn can't move much themselves, and stops stiffness setting in during the weeks that matter most."},
  ped_milestone:{what:"Milestone play — helping the next stage of your baby's movement arrive, through play rather than exercise.",how:"Get on the floor with them, put a toy just out of reach, and give the smallest help that lets them do the rest themselves.",why:"Babies build strength and control by practising the next thing they're nearly ready for. Rolling, sitting and crawling aren't taught — they're rehearsed, and this is the rehearsal."},
  ped_play:{what:"A movement game — the toddler version of an exercise, because toddlers repeat what's fun and ignore what's prescribed.",how:"Show them first, give it a name, count out loud together, and cheer every go.",why:"At this age the repetitions only happen if it's a game. The strength, balance and coordination come as a by-product of playing it enough times."},
  ped_skill:{what:"A fundamental movement skill — hopping, catching, balancing — practised as a game.",how:"Demonstrate once, give one instruction at a time, make it a challenge they can win, and praise the effort.",why:"These skills are the building blocks everything later stands on. Children who master them stay active; children who feel clumsy quietly stop moving, and that's harder to fix than any injury."},
  ped_train:{what:"Technique-first training for a school-age child — the movement learned properly before any weight is added.",how:"Practise slowly with no weight until it looks identical every rep, then add a band or a light load.",why:"Children do get stronger from training, but at this age the gains come from the nervous system learning the movement rather than from bigger muscles. That means good practice IS the training — and it's why technique comes before load, not after it."},
  ped_strength:{what:"Supervised resistance training for a teenager — close to adult training, with the growing skeleton taken into account.",how:"Learn it light, keep every rep looking the same, and add weight only when the last rep looks like the first.",why:"Properly supervised resistance training is safe and effective for teenagers — the old 'no weights until you're grown' advice doesn't hold up. What still applies is the growth plate: it's the weak link until it closes, so build reps and quality first and leave maximum-effort lifts alone until you're done growing."},
  general:{what:"A general conditioning exercise for the area.",how:"Perform with control through a pain-free range, exhaling on effort.",why:"Helps restore strength, movement and function."}
};
/* Step-by-step technique detail per movement pattern — feeds the "How to do it" block.
   ---------------------------------------------------------------------
   ⚠ WRITE THESE IN PLAIN WORDS. Measured before the v158 rewrite, 84% of explanations
   (152 of 182 distinct shapes) leaned on words only a clinician reads without stopping:
   "brace", "neutral", "core", "engage", "mid-foot", "lock-out", "torso", "hip hinge".
   Flesch-Kincaid rated that text grade 5 and missed all of it, because the problem isn't
   sentence length — those words are SHORT. They're just borrowed from another trade.
   The rule: say the thing physically. "Brace your core" is "tighten your tummy like
   someone's about to poke it". "Neutral spine" is "back in its normal shape — not rounded,
   not arched". Every clinical constraint that matters (heels down, knees don't cave, don't
   hold your breath) SURVIVES the translation — plain is not vague, and it isn't shorter.
   --------------------------------------------------------------------- */
const PATTERN_HOWTO = {
  squat:{setup:"Stand with your feet about as wide as your hips, toes turned out a little. Your weight should feel even, through the middle of each foot. Tighten your tummy like someone's about to poke it.",
    steps:["Bend your knees and push your bottom backwards, like you're reaching for a chair behind you.","Keep your chest up. Your knees will travel forwards over your toes — that's fine, as long as your heels stay stuck to the floor.","Go down as far as you can while your heels stay down and your back keeps its normal shape. Don't let it round or tuck under.","Push the floor away through your whole foot to stand back up, and squeeze your bottom at the top."],
    tempo:"Take 2–3 seconds to go down, then stand up at a steady pace. Breathe in on the way down, out as you push up.",
    avoid:"Don't let your knees fall inwards or your heels lift. If they do, stand a bit wider or don't go down as far."},
  hinge:{setup:"Stand tall, feet about hip-width apart, knees slightly soft rather than locked straight. Pull your shoulders back and tighten your tummy.",
    steps:["Push your bottom straight back towards the wall behind you, letting your chest tip forwards as one piece.","Keep your back long and flat — imagine a broomstick resting along it, touching your head, your upper back and your tailbone.","Go down until you feel a stretch down the back of your thighs, usually around shin height. Keep the weight close to your legs the whole way.","Push your hips forwards to stand up tall and squeeze your bottom. Don't lean back at the top."],
    tempo:"Take about 3 seconds to go down, then come up smoothly. Breathe out as you stand.",
    avoid:"Don't let your back round, and don't turn it into a squat. The bend comes from your hips, not your knees."},
  lunge:{setup:"Stand tall, then step forwards into a long stride — one foot well in front of the other, like you're standing on two railway tracks rather than a tightrope.",
    steps:["Drop straight down by bending both knees, sending your back knee towards the floor.","Keep your front shin roughly upright, and your weight through your front heel and the middle of your foot.","Stop just before your back knee touches the floor. Stay tall — don't tip forwards.","Push through your front foot to stand back up."],
    tempo:"Take about 2 seconds to go down, pause for a moment, then come up. Breathe out on the way up.",
    avoid:"Don't let your front knee fall inwards or shoot far past your toes, and don't lean your chest forwards."},
  calf:{setup:"Stand tall, feet about hip-width, near a wall or rail you can touch for balance. If you've been told to use a step, put the balls of your feet on the edge with your heels hanging off.",
    steps:["Push through the balls of your feet and rise up as high as you can onto your toes.","Pause for a moment at the top, with your ankles fully pointed.","Lower all the way down, slowly. If you're on a step, let your heels drop below it until you feel a stretch."],
    tempo:"Take 1–2 seconds to rise, and 3–4 seconds to lower. The slow lowering is where most of the benefit is — don't rush it.",
    avoid:"Don't bounce or hurry. Let your calves do the work rather than gripping with your toes."},
  /* ⚠ push/pull are used for LEG movements too — the generator files hamstring curls under
     "pull" and hip abduction under "push", which is fair as a category and useless as an
     instruction: 928 leg exercises were being told to set their shoulder blades and lead
     with the elbow. `legSteps`/`legAvoid` are swapped in by movementExplain() when the
     regions are lower-limb only. Same movement category, right body part. */
  pull:{setup:"Set the resistance and stand or sit tall and steady. Take the slack out of the band or cable before you start, so there's tension from the first inch.",
    steps:["Start by gently pulling your shoulder blades down and back, before your arm moves at all.","Pull the resistance smoothly towards you, leading with your elbow rather than your hand.","Squeeze the working muscle for a moment at the end.","Let it back slowly to full stretch, keeping tension the whole way — don't just let go."],
    legSteps:["Take the slack out first, so the muscle is working from the very first inch instead of snatching at it.","Bend or draw the joint smoothly through its range, keeping the rest of you still.","Squeeze the working muscle for a moment at the end.","Let it back slowly to full stretch, keeping tension the whole way — don't just let go."],
    tempo:"Pull for 1–2 seconds, and take about 3 seconds to let it back. Breathe out as you pull.",
    avoid:"Don't shrug your shoulders up, swing, or heave. If you have to jerk it to move it, it's too heavy.",
    legAvoid:"Don't swing or heave it. If you have to jerk it to move it, it's too heavy."},
  push:{setup:"Set your feet or your back somewhere solid so you're stable, and start with the joint at an angle that feels comfortable.",
    steps:["Tighten your tummy and gently set your shoulder blades down and back.","Press the resistance smoothly away from you through the fullest range you can manage comfortably.","Stop just before your elbows or knees snap completely straight, so the muscle keeps the tension.","Bring it back to the start slowly and under control."],
    legSteps:["Tighten your tummy and keep the rest of your body still — only the working leg should move.","Push or straighten the leg smoothly through the fullest range you can manage comfortably.","Stop just before the knee snaps completely straight, so the muscle keeps the tension.","Bring it back to the start slowly and under control."],
    tempo:"Press for 1–2 seconds, and take about 3 seconds to come back. Breathe out as you press.",
    avoid:"Don't hold your breath, and don't push into a range that pinches or hurts. Smooth and pain-free."},
  isometric:{setup:"Get into the position you've been given, then hunt for the exact angle where you feel the right muscle working but nothing sharp anywhere.",
    steps:["Slowly build up the tension in that muscle until it's firm but comfortable — about 5 or 6 out of 10 effort.","Hold completely still. No bouncing, no shifting around.","Keep breathing normally the whole time. Count out loud if it helps you not to hold your breath.","Let the tension go slowly at the end rather than dropping it suddenly."],
    tempo:"Hold for the time you've been given — often 20–45 seconds — then rest. Never hold your breath.",
    avoid:"Don't strain as hard as you possibly can, and don't push into pain. Steady and moderate is the whole point."},
  mobility:{setup:"Get into the starting position and let the muscles around the joint go soft. You're asking for range here, not forcing it.",
    steps:["Move slowly and smoothly towards the end of the range that feels comfortable.","Ease to the first point where you feel a gentle stretch or some resistance. Not pain — the first gentle pull.","Hold it there, or move gently in and out if you've been told to keep it moving.","Come back slowly to the start and go again."],
    tempo:"Move deliberately. For a held stretch, stay there about 20–30 seconds. Breathe out as you ease in.",
    avoid:"Don't bounce and don't force it. Range comes back gradually — it can't be yanked out of a joint."},
  balance:{setup:"Set up next to something solid you can grab — a kitchen counter, a rail, a wall. Wear whatever shoes you've been told to.",
    steps:["Get into position (for example, standing on one leg) and fix your eyes on a spot in front of you.","Tighten your tummy gently and keep a soft bend in your knee — don't lock it straight.","Hold steady. Make small corrections with your foot and ankle rather than waving your arms about.","Only make it harder — adding movement, closing your eyes, standing on something soft — once this level feels safe."],
    tempo:"Hold or work for the time you've been given, then rest and repeat. Breathe normally.",
    avoid:"Don't hold your breath or lock your knee. Keep something to grab within reach so you can push yourself without risking a fall."},
  plyo:{setup:"Warm up first. Find a surface with a bit of give and clear space around you, and start with a low height or a short distance.",
    steps:["Dip down into a quarter-squat with your hips back and chest up — that's your spring loading.","Jump or hop with full effort, straightening your hips, knees and ankles together.","The landing is the point of the exercise. Land softly on the middle of your foot and let your hips and knees soak it up.","Land quietly, with your knees pointing over your toes, then reset before the next one."],
    tempo:"Explode up, land soft. Quality over quantity — stop the set the moment your landings get sloppy.",
    avoid:"Don't land with stiff, straight legs or with your knees falling inwards. Drop the height or the reps if your form goes."},
  carry:{setup:"Pick the weight up by pushing your hips back and keeping your back flat — not by rounding over it. Stand up tall with it at your side, or in front, as you've been told.",
    steps:["Stand as tall as you can — ribs down, shoulders back, tummy tight.","Take short, deliberate, even steps.","Don't let the weight swing, and don't let yourself lean or tip towards it.","Put it down with control by bending your legs, not your back."],
    tempo:"Walk at a steady pace for the distance or time you've been given. Keep breathing normally throughout.",
    avoid:"Don't hold your breath, don't lean towards the weight, and stop as soon as you can't stay tall."},
  cardio:{setup:"Pick your activity — walking, bike, rower, whatever you've got — and start with a few easy minutes to warm up.",
    steps:["Build up to your target effort: a pace where you could talk but not sing, or the intervals you've been given.","Keep a smooth, steady rhythm and steady breathing.","Use your heart-rate zone or the effort scale (see the cardio target above) to check you're in the right range.","Finish with a few easy minutes to cool down."],
    tempo:"Keep going for the time or intervals you've been given. At a moderate pace you should be able to hold a conversation.",
    avoid:"Don't push until you can't breathe. Stop for chest pain, dizziness, or anything that feels wrong."},
  vestibular:{setup:"Sit or stand somewhere safe with support nearby. Expect a bit of dizziness — that's the exercise working, not something going wrong.",
    steps:["Do the eye or head movement you've been given — for example, keep your eyes locked on a target while you turn your head.","Move at a speed that brings on mild dizziness without overwhelming you.","Keep going for the set time, then stop and let the dizziness settle before the next set.","Speed it up or make it harder only as the symptoms settle faster."],
    tempo:"Work for the time you've been given, and rest between sets until the dizziness has settled.",
    avoid:"Don't push on to feeling really sick. A little dizziness helps your brain adapt; a lot just sets you back."},
  breathing:{setup:"Get comfortable — sitting upright, or lying down with your knees bent. Rest one hand on your belly.",
    steps:["Breathe in slowly through your nose and let your belly rise into your hand. Your chest should barely move.","Keep your shoulders and neck loose.","Breathe out slowly and completely — through pursed lips, like blowing out a candle, if you've been told to — taking longer than you took to breathe in.","Pause for a moment, then go again. Don't rush it."],
    tempo:"Aim for a slow rhythm — roughly in for 4, out for 6. Never hold your breath or force it.",
    avoid:"Don't let your upper chest and shoulders do the lifting, and don't strain. This should feel calming."},
  "anti-ext":{setup:"Lie down and press your lower back flat against the floor, so there's no gap under it. Tighten your tummy and keep it tight.",
    steps:["Tighten your stomach as if you're about to take a light punch to the belly.","Slowly move your arms and legs as you've been told, while your lower back stays completely still and flat.","Only go as far as you can before your back starts to lift or arch away from the floor. That point is your range — even if it's small.","Come back under control, and re-tighten your tummy before every rep."],
    tempo:"Move slowly. Keep breathing steadily — don't hold your breath.",
    avoid:"Don't let your back arch off the floor or your belly push up into a dome. If you lose the flat back, make the movement smaller."},
  "anti-rot":{setup:"Stand or kneel steady, tummy tight, with the band or cable pulling from one side. Take the slack out so it's actively trying to twist you.",
    steps:["Square your hips and shoulders to the front, like headlights pointing straight ahead.","Press or move as you've been told, while refusing to let the pull twist you.","Keep your body completely still. Not twisting IS the exercise — the arms are just along for the ride.","Come back slowly, staying square the whole time."],
    tempo:"Move deliberately and hold the far position for a moment. Keep breathing.",
    avoid:"Don't let your body turn towards the pull. If you can't stay square, use a lighter band or stand closer to the anchor."},
  extension:{setup:"Get into position — usually lying face-down — with your back in its normal shape and your neck long, eyes down at the floor.",
    steps:["Gently switch on the muscles that run either side of your spine.","Lift a small amount, thinking 'long and tall' rather than 'as high as I can'.","Pause for a moment at the top. You shouldn't feel any pinching in your lower back.","Lower slowly back down."],
    tempo:"Lift for 1–2 seconds, lower for about 3. Breathe out as you lift.",
    avoid:"Don't arch hard or jerk upwards. If you feel a pinch in your lower back, lift less far."},
  flexion:{setup:"Lie on your back with your knees bent, or as you've been told. Rest your hands lightly beside your head — don't lace them behind your neck and pull.",
    steps:["Draw your ribs gently down towards your hips so your upper back curls off the floor.","Lift your shoulder blades clear of the floor. You don't need to come all the way up to sitting.","Keep your neck relaxed with your chin slightly tucked, like you're holding a peach under it. Don't yank your head forwards.","Lower slowly and with control."],
    tempo:"Curl up for about 2 seconds, lower for 2–3. Breathe out as you curl.",
    avoid:"Don't pull on your neck and don't use a swing to get up. Your stomach muscles should be doing this, not your arms."},
  gait:{setup:"Find a clear, flat path with a rail or wall nearby. Look ahead at where you're going, not down at your feet.",
    steps:["Walk the stepping pattern you've been given, with even, deliberate steps.","Stand tall and let your arms swing naturally, if the drill allows it.","Place each foot down with control — heel first, then toe, unless you've been told otherwise.","Keep support within arm's reach. Add speed or difficulty only once you feel steady."],
    tempo:"Move at a controlled pace. How well each step lands matters far more than how fast you get there.",
    avoid:"Don't look at your feet and don't rush. If you feel wobbly, slow down and get closer to the rail."},
  agility:{setup:"Warm up properly first. Mark out a small course with whatever's handy — cans, bottles, tape — clear the space, and wear supportive shoes.",
    steps:["Start ready to move: knees soft, weight on the balls of your feet.","Speed up, then slow down under control before each turn. Sink your hips to brake, like squatting slightly.","Plant your outside foot and push off to change direction, keeping that knee pointing over your foot — never letting it fall inwards.","Add speed and sharper turns only as your control improves."],
    tempo:"Short, sharp efforts with full rest between. Treat it like sprinting, not like a workout. Stop when your form gets messy.",
    avoid:"Don't let your knee collapse inwards when you cut, and don't land stiff-legged. Slow down or shorten the course if control slips."},
  rotate:{setup:"Stand ready to move — knees soft, tummy tight. Take the slack out of the resistance.",
    steps:["Start the turn from your hips and belly, and let your arms follow them.","Turn smoothly, and let your back foot pivot as you go. That protects your knee — don't leave it planted while your body turns.","Move your arms and body as one piece. Don't just swing your arms while your hips stay put.","Come back to the start under control."],
    tempo:"Turn with intent, then control the way back. Breathe out through the effort.",
    avoid:"Don't twist from your lower back alone, and don't wrench it round. The power comes from your hips."},
  general:{setup:"Get set up somewhere stable and comfortable, sitting or standing tall.",
    steps:["Move through a range that stays pain-free, under control.","Keep the working area doing the job and let everything else stay relaxed.","Pause for a moment at the hardest point, if it feels controlled.","Come back slowly to the start."],
    tempo:"Move smoothly at a controlled pace, and take longer coming back than going out. Breathe out on the effort.",
    avoid:"Don't rush, don't hold your breath, and don't push into pain. Smooth and controlled wins."},
  supine:{setup:"Lie on your back on something firm — a mat, a bed or the floor. Unless you've been told otherwise, bend the leg you're not using and put that foot flat, which takes the strain off your lower back.",
    steps:["Gently tighten your tummy so your lower back stays comfortable against the floor.","Move the working leg or muscle slowly and deliberately through the range you've been given — or build up a steady squeeze and hold it.","Only go as far as stays pain-free and controlled. Early on, doing it well matters far more than how far you get.","Lower or let go slowly, then reset before the next rep."],
    tempo:"About 2–3 seconds each way, or hold for the time you've been given. Breathe normally — never hold your breath.",
    avoid:"Don't let your lower back arch up off the floor, and don't hold your breath. If you lose control, make the movement smaller."},
  seated:{setup:"Sit tall towards the front of a sturdy chair that won't slide, feet flat and about hip-width — or with the working leg free to move. Sit up, don't slump back into it.",
    steps:["Set yourself up: sit tall, shoulders relaxed, tummy gently tight.","Move the working joint slowly through the range you've been given — for example straightening or lifting your leg — or build up a steady hold.","Pause for a moment at the working end, if it feels controlled.","Lower slowly and reset for the next one."],
    tempo:"About 2–3 seconds each way, or hold for the time you've been given. Breathe out on the effort and keep breathing.",
    avoid:"Don't swing it up with momentum, don't slump, and don't push into sharp pain. Slow and controlled."},
  standing:{setup:"Stand tall facing or beside something solid you can rest a hand on — a kitchen counter, a heavy table, a rail. Feet about hip-width, weight even, knees soft.",
    steps:["Set yourself up: stand tall, tummy gently tight, shoulders relaxed, one or both hands resting lightly on the support.","Move the working leg — or lower and raise your whole body — slowly and deliberately through the range you've been given, or hold the position still.","Keep your standing leg strong and your hips level. Don't let one hip drop or lean your body to cheat the movement.","Come back to the start under control, staying tall the whole way."],
    tempo:"About 2–3 seconds each way, or hold for the time you've been given. Keep breathing normally.",
    avoid:"Don't cling to the support for dear life, and don't twist or lean to get the rep. Use just enough support to stay steady, and do less range if your form breaks down."},
  pool:{setup:"Use a warm pool. Stand where the water comes up to about your chest, so it carries some of your weight, and stay within easy reach of the wall or a rail. Get in and out by the steps or ramp. Never exercise in a pool on your own.",
    steps:["Find your balance, with a hand on the wall if you need it. Stand tall with your tummy gently tight.","Move slowly and deliberately. Water pushes back in every direction, so slow and steady is what builds the strength — fast just makes splashes.","Keep it pain-free, and grab the wall whenever your balance is challenged.","For anything in deeper water, wear a flotation belt and stay within the depth you're genuinely comfortable in."],
    tempo:"Work for the reps or time you've been given. Move steadily against the water and breathe normally — don't hold your breath.",
    avoid:"Don't go deeper than you're confident in, don't exercise alone, and get out if you feel cold, dizzy or unwell. Take care on wet, slippery pool edges."},

  /* ---- Circulation ---- */
  pump:{setup:"Sit or lie down with your legs out in front of you. If you can, prop the leg up on a pillow so your foot is higher than your hip — that helps the swelling drain downhill.",
    steps:["Point your toes away from you, like a ballerina, as far as they'll comfortably go.","Then pull your toes back up towards your nose, as far as they'll go. You should feel your calf working.","Keep going slowly, one way then the other.","Do them little and often through the day. Every hour beats one big session."],
    tempo:"Slow and full — about 2 seconds each way. Breathe normally.",
    avoid:"Don't rush them and don't force through pain. If your calf becomes sore, swollen, hot or tight — especially on one side — stop and get it checked the same day."},

  /* ---- Paediatric. The reader is a PARENT for the young bands and the young person
     themselves from about 12, so the voice changes with the band. Before v158 all 657 of
     these fell through to `general` and answered "how do I do tummy time?" with "set up in
     a stable, comfortable position with good posture". ---- */
  ped_handling:{setup:"Pick a calm moment when your baby is awake and settled, and not straight after a feed. Take off your watch and rings, and warm your hands first.",
    steps:["Lay your baby on something firm, flat and safe. Never a sofa, a bed, or anywhere they could roll off.","Move slowly. Support the limb with your whole hand, above and below the joint — not with your fingertips.","Take it only as far as it goes easily, and stop the moment you feel it resist. You are not stretching it further; you're keeping what's there.","Talk or sing to them while you do it. If they cry or stiffen up, stop and try again later."],
    tempo:"A few slow, gentle repeats. Little and often beats one long go — nappy changes make a natural reminder.",
    avoid:"Never force a stretch, never do this on a soft surface, and never step away while they're up on a changing table. If it's hurting them, stop and ask your team."},
  ped_milestone:{setup:"Pick a time when your baby is awake, fed and happy. Clear a firm, safe space on the floor — a play mat is ideal. A cot or a sofa is not.",
    steps:["Get down on the floor with them. Your face is the most interesting toy they own — use it.","Put a toy just out of reach, in the direction you want them to move.","Let them try. Give the smallest bit of help that gets them there, then take it away again so they do the next bit themselves.","Stop while they're still enjoying it, not once they've had enough."],
    tempo:"Short and often — a few minutes at a time, several times a day. Follow their lead, not the clock.",
    avoid:"Never leave them alone on anything raised. Don't push on through crying — a fed-up baby learns nothing, and you'll both dread it tomorrow."},
  ped_play:{setup:"Clear a safe space and move anything they could fall onto. Expect to join in — toddlers copy what you do, they don't follow instructions.",
    steps:["Show them first. Do it yourself, and make it look like the best game in the world.","Give the game a name — 'giant steps', 'stepping stones', 'beat the timer'. A named game gets played again.","Count out loud together. The counting is what gets the repetitions in without anyone noticing.","Cheer every attempt, and stop while it's still fun."],
    tempo:"Two or three minutes at a time, lots of times a day. Little and often always wins at this age.",
    avoid:"Don't turn it into a battle. If they're not interested, try again in an hour — and stay close enough to catch them."},
  ped_skill:{setup:"Find a clear, flat space. Show them what you want first — at this age watching beats being told.",
    steps:["Do one slow demonstration, then let them try straight away. Don't explain it twice.","Give one instruction at a time. 'Watch me' works better than a list of corrections.","Make it a challenge they can win — 'can you do five?', 'can you beat the timer?'","Praise how hard they tried, not how well it went."],
    tempo:"Five to ten focused minutes is a full session at this age. Mix up several different games rather than drilling one.",
    avoid:"Don't correct every go. Children who feel clumsy stop moving, and that costs more than sloppy technique ever will. Fix one thing at a time."},
  ped_train:{setup:"Warm up for five minutes first — a jog, a bike ride, some star jumps. Clear a space and get the band or low step out if the exercise needs one.",
    steps:["Watch it done once, or read the steps through together, before the first go.","Practise it slowly with no weight at all until it looks the same every single time.","Do the number you've been given, resting properly between sets.","Add a band or a light weight only once the movement still looks neat when you're tired."],
    tempo:"Slow and controlled — about 2 seconds each way. Breathe out on the hard part, and never hold your breath.",
    avoid:"Don't add weight to paper over messy technique, and don't push through pain. A grown-up should be watching."},
  ped_strength:{setup:"Warm up properly — five to ten minutes of easy movement, then a couple of light practice sets. Have someone experienced watching, especially with free weights.",
    steps:["Learn the movement with just your body weight, or something very light, until it feels automatic.","Do your working sets at the reps you've been given, keeping every rep looking like the first.","End the set when your technique starts to slip — not when you physically can't do another one.","Add a small amount of weight only when the last rep looks as good as the first."],
    tempo:"About 2 seconds down, 1 second up, unless you've been told otherwise. Breathe out on the effort — never hold your breath under a weight.",
    avoid:"No maximum-effort single lifts and no bouncing the weight while you're still growing. If a bony point hurts — just below your kneecap, or the back of your heel — that's a growth plate, not a muscle. Ease off and get it looked at."}
};
/* True when a movement touches a lower-limb region and NO upper-limb one. Spine/Core/Balance
   are neither, so they don't veto — "Copenhagen hip adduction" (Hip+Core) is still a leg
   movement for this purpose, and the shoulder-blade cue is still wrong for it.
   ⚠ This says nothing about whether a movement is a leg exercise in general — a deadlift
   (Hip+Spine+Core) returns true here too. It only decides which STEPS to show, and only
   push/pull define legSteps, so hinge/squat/lunge are untouched by it either way. */
const UPPER_REG = new Set(["Shoulder","Scapula/Upper back","Elbow","Forearm","Wrist / Hand","Neck","Thoracic/Upper back"]);
const LOWER_REG = new Set(["Hip","Glute","Knee","Ankle","Calf","Foot"]);
const isLowerLimbOnly = regs => Array.isArray(regs)
  && regs.some(r => LOWER_REG.has(r)) && !regs.some(r => UPPER_REG.has(r));

/* ⚠ A CASCADE — the first match wins, so ORDER is the logic. This runs for every item that
   has no explicit `pattern` field, which means the whole hand-authored protocol layer, not
   just the library. A name that matches nothing lands on "general", and its Explain says
   "move through a range that stays pain-free" and nothing else. */
function inferPattern(name){
  const l = name.toLowerCase();
  if(/agility|ladder|carioca|shuffle|shuttle|\bcutting\b|zig-zag|t-drill|5-10-5|pro-agility|mirror drill|backpedal|figure-8|dot drill|line hops|deceleration|change of direction/.test(l)) return "agility";
  if(/gaze|vor|habituation/.test(l)) return "vestibular";
  if(/breath|diaphragm|pursed|spirometr/.test(l)) return "breathing";
  /* ⚠ was /dead bug/ — a SPACE. Every one of these is written "dead-bug", here and in the
     protocols ("Hip hinge / dead-bug core"), so this never once fired. */
  if(/dead-?\s?bug/.test(l)) return "anti-ext";
  if(/bird-dog|pallof|anti-rotation|wood-?chop|\bchop\b|\blift\b \(/.test(l)) return "anti-rot";
  /* Circulation. Nothing else in the cascade catches "Ankle pumps", so it read as general —
     on the one exercise most likely to be someone's entire day-one program. */
  if(/ankle pump|point-and-flex|foot pump/.test(l)) return "pump";
  if(/jump|hop|bound|pogo|plyo|depth|drop-and-stick|skipping/.test(l)) return "plyo";
  /* Before isometric on purpose: /\bhold\b/ below would otherwise claim "Sit-to-stand — with
     a 3s hold" and explain a chair stand as a static hold. It's a squat with a pause in it. */
  if(/sit-to-stand/.test(l)) return "squat";
  if(/plank|wall sit|isometric|\bhold\b|dead-hang|chin tuck|quad set|glute set|short-foot/.test(l)) return "isometric";
  if(/carry|farmer|suitcase|waiter/.test(l)) return "carry";
  if(/calf raise|heel raise|calf|heel drop/.test(l)) return "calf";
  if(/lunge|step-up|split squat|step-down/.test(l)) return "lunge";
  if(/squat/.test(l)) return "squat";
  if(/deadlift|hinge|bridge|hip thrust|good-morning|kickback|romanian|hip extension/.test(l)) return "hinge";
  if(/crunch|sit-up|curl-up|v-up|trunk flexion|reverse crunch/.test(l)) return "flexion";
  if(/superman|cobra|back extension|hyperextension|prone extension/.test(l)) return "extension";
  if(/tandem walk|braiding|grapevine|gait|marching|obstacle stepping|backward walk/.test(l)) return "gait";
  if(/balance|single-leg stance|tandem stance|star-excursion|weight-shift|reach|foam|bosu|perturbation/.test(l)) return "balance";
  if(/walk|jog|run|cycl|bike|row|elliptical|stair|swim|aqua|conditioning|interval|sled/.test(l)) return "cardio";
  if(/stretch|\brom\b|mobility|pendulum|cat-camel|open-book|circle|alphabet|thread|slide|wall walk|wall angel/.test(l)) return "mobility";
  if(/row|pull|curl|face pull|rear-delt|external rotation|scapular|y-t-w|deviation|glide/.test(l)) return "pull";
  if(/press|push-up|raise|fly|scaption|full-can|internal rotation|extension|leg extension|chest pass|med-?ball (pass|throw)/.test(l)) return "push";
  return "general";
}
/* Kept for the handful of cues the equipment/variant/modifier layers don't reach.
   Everything that IS covered there was removed: with both in play, a
   "Barbell box squat — with 2s pause" explained the pause three separate times. */
function movementNotes(name){
  const l = name.toLowerCase(); const n = [];
  if(/perturbation/.test(l)) n.push("Someone gives you small, unpredictable nudges — the point is reacting to what you didn't expect, so don't let them warn you.");
  if(/eyes-closed|eyes closed/.test(l)) n.push("Closing your eyes removes vision and forces your ankles and inner ear to do the balancing. Stand within arm's reach of support.");
  if(/dual-task|counting|while talking/.test(l)) n.push("Doing a second task at once is the test — real life never gives you your full attention for balance.");
  if(/blood ?flow restriction|\bbfr\b/.test(l)) n.push("Blood-flow restriction lets very light loads build strength, but it needs proper cuffs and supervision — not a belt or a band.");
  return n.slice(0,2).join(" ");
}
/* =====================================================================
   "WATCH HOW" — a CONSTRUCTED YouTube search, never a stored video id.
   Specific video ids are deliberately NOT used: this file cannot verify what
   is actually at a given id, ids rot as channels delete and privatise, and a
   rehab app vouching for the wrong demonstration is a safety problem, not a
   broken link. A search URL is built from the name, so it cannot be wrong
   about a video it never names.
   The link is click-only and opens a new tab — never an <iframe>, which would
   contact Google on render and quietly falsify "Nothing is uploaded".
   ===================================================================== */

/* The generated names are ours, not search terms: nobody searches "Soup-can
   split squat — unilateral". Strip the implement and our modifier suffixes
   down to the movement a human would actually type, but KEEP named variants —
   a goblet squat is a different search from a box squat. */
const VID_STRIP_EQUIP = /^(dumbbell|kettlebell|barbell|band|loop-band|cable|machine|suspension|towel|broomstick|chair|med-ball|sandbag|backpack|heavy-book|soup-can|water-bottle|water-jug|resisted|weighted)\s+/i;
const VID_STRIP_TAIL  = /\s+—\s+.*$/;                       // our " — modifier" suffixes
const VID_STRIP_PARENS = /\s*\((?!left|right|bilateral)[^)]*\)/gi;   // "(SAQ)", "(holding a counter)"
/* Program exercises come from the hand-authored PROTOCOLS, not the generated library, so
   their names are PRESCRIPTIONS rather than movement names: "Gentle ROM around the injury",
   "Progressive grip work". Strip the prescription language, expand the jargon nobody types,
   and if what remains names no actual movement return null so nothing is offered at all. */
const VID_LEAD  = /^(gentle|progressive|assisted|light|graded|early|controlled|supported|pain-free|active|passive|isometric|advanced)\s+|^with\s+[\w-]+\s+(?=[a-z])/i;
const VID_JARGON = [[/\brom\b/gi, "range of motion"], [/\bAAROM\b/gi, "assisted range of motion"],
                    [/\bckc\b/gi, "closed chain"], [/\bokc\b/gi, "open chain"], [/\bslr\b/gi, "straight leg raise"],
                    [/\bsaq\b/gi, "short arc quad"], [/\bter\b/gi, "terminal extension"], [/\bnwb\b/gi, ""]];
/* After cleaning, a name made only of these words identifies no movement. */
const VID_FILLER = /\b(range of motion|exercise|exercises|work|working|activity|injury|injured|area|movement|the|a|an|around|all|direction|directions|and|with|as|tolerated|progression|training|drill|drills|side|both|affected|limb)\b/gi;

function videoMovement(name, pattern){
  let q = String(name||"")
    .replace(VID_STRIP_TAIL, "")
    .replace(VID_STRIP_PARENS, "")
    .replace(/\s*\((left|right|bilateral)\)\s*$/i, "")
    .trim()
    .replace(VID_STRIP_EQUIP, "")
    /* Compound names list alternatives ("A / B"), progressions ("A: x → y") and add-ons
       ("A + B"). Keep the FIRST clause -- it is the movement; the rest is dosing detail that
       turns the search into noise.
       The slash only means "or" when it is SPACE-DELIMITED: "Radial/ulnar deviation" is ONE
       movement and splitting it searched for "radial", while "Wrist flexion / wrist curl /
       extension" really is a list. Same for &/+. Colons and arrows always separate. */
    .split(/\s+(?:\/|\+|&)\s+|\s*(?::|→)\s*/)[0]
    .replace(/,/g, " ")                  // "Ankle pumps, seated" is a name, not a query
    .replace(/\s+/g, " ")
    .trim();
  if(!q) q = String(name||"").trim();
  q = q.toLowerCase();
  while(VID_LEAD.test(q)) q = q.replace(VID_LEAD, "");        // "gentle progressive hip rom" -> "hip rom"
  for(const [re, to] of VID_JARGON) q = q.replace(re, to);
  q = q.replace(/\s+/g, " ").trim();
  /* the movement only — this is what curatedVideoFor() matches on */
  /* Nothing but prescription language left ("gentle ROM around the injury") -> no movement
     to search for, so offer no link rather than a useless one. */
  if(q.replace(VID_FILLER, "").replace(/[^a-z0-9]/g, "").length < 3) return null;
  return q;
}
/* videoQuery()/videoSearchURL() lived here and built a YouTube search. Removed with the
   search fallback -- keeping an unreachable path that emits links to unvetted content is
   how it quietly comes back. videoMovement() stays: curatedVideoFor() matches on it. */
/* ---------------------------------------------------------------------
   CURATED, VERIFIED DEMONSTRATIONS — institutional publishers only.
   Every id below was found via search and then confirmed by fetching
   https://www.youtube.com/oembed?url=...&format=json , which returns the real
   title and author_name (and errors for deleted/private videos). Nothing here
   was recalled or guessed.
   THE BAR IS THE PUBLISHER, NOT MY OPINION OF THE VIDEO. Only hospitals,
   health systems, universities, NHS bodies, national medical bodies and
   established clinic groups are accepted, because that is a property this file
   can actually check. It must be HUMAN healthcare: a weight-shifting rehab
   video cleared every other test and was published by "Somers Animal
   Hospital". "Is it a hospital?" is not the whole question. It is NOT a claim
   that the demonstration has been reviewed — nothing here has watched it, and
   the UI says so.
   Why the bar is the publisher: search snippets asserted institutional
   provenance THREE times that oEmbed contradicted — one claimed "produced by
   Hampshire Hospitals NHS Foundation Trust", another advertised an
   institutional-looking pendulum video actually published by a personal brand,
   a third credited "Christie Clinic" for an individual's upload. And the top
   hit for "single leg squat physiotherapy" is published by "Vivid Photo
   Visual", a video production company. Titles and snippets lie; author_name
   does not.
   Links rot silently. VIDEO_VERIFIED stamps when this set was last confirmed —
   re-run the oEmbed check periodically and drop anything that errors.
   --------------------------------------------------------------------- */
const VIDEO_VERIFIED = "July 2026";
const CURATED_VIDEOS = {
  /* knee & hip */
  "quad sets":                 { id:"t8OcF4ADaDY", ch:"Piedmont Healthcare" },
  "short arc quad":            { id:"RGqKrP7lG0w", ch:"Piedmont Healthcare" },
  "straight leg raise":        { id:"J6JgHgVNrZ8", ch:"MGHOrthopaedics" },
  "heel slides":               { id:"Bz0wSFRjH2c", ch:"Michigan Medicine" },
  "glute bridge":              { id:"PusbZuBgeug", ch:"University Orthopedics" },
  "single-leg bridge":         { id:"p-XVfkvtUPY", ch:"UCSF Orthopaedic Surgery" },
  "clamshell":                 { id:"jF6iE0shJKk", ch:"TSAOG Orthopaedics & Spine" },
  "sit-to-stand":              { id:"5yxfzyzEzBY", ch:"Royal Free London NHS Foundation Trust" },
  "step-ups":                  { id:"1hiWQ7pehjQ", ch:"Mayo Clinic" },
  "standing hip extension":    { id:"OaUMKUEoFQ4", ch:"NHS inform" },
  "mini squat":                { id:"X8XutSsocx4", ch:"Visiting Nurse Association Health Group" },
  "hip abduction":             { id:"g9FtnmsIYgI", ch:"Baptist Health" },
  "terminal knee extension":   { id:"UmM40QNd6bA", ch:"Visiting Nurse Association Health Group" },
  "hamstring curl":            { id:"Fadu_1dGVbE", ch:"Penn State Health" },
  /* ankle, foot & balance */
  "ankle pumps":               { id:"n6HI30C00Bk", ch:"Visiting Nurse Association Health Group" },
  "double-leg calf raises":    { id:"k8ipHzKeAkQ", ch:"Children's Hospital Colorado" },
  "ankle alphabet":            { id:"dpfkCmhtg6I", ch:"Baptist Health" },
  "single-leg balance":        { id:"Z9_ThjKQyOg", ch:"Children's Hospital Colorado" },
  "heel raises":               { id:"jbh9Wzt2Lfk", ch:"Visiting Nurse Association Health Group" },
  "toe raises":                { id:"jbh9Wzt2Lfk", ch:"Visiting Nurse Association Health Group" },
  "ankle dorsiflexion stretch":{ id:"I37yHrxjQyk", ch:"MyMichiganHealth" },
  "calf stretch":              { id:"DcnlrEs986s", ch:"NHS inform" },
  "balance training":          { id:"cr_QY-fehdc", ch:"Ohio State Wexner Medical Center" },
  "hop-and-stick":             { id:"I9FuUUPT0vE", ch:"Children's Hospital Colorado" },
  /* shoulder, elbow & wrist */
  "pendulum swings":           { id:"zY5nq68IxwA", ch:"University Orthopedics" },
  "scapular squeezes":         { id:"9tJTdqUXW14", ch:"Adventist Health Columbia Gorge" },
  "scapular rows":             { id:"KqAKQ9LR1l0", ch:"MultiCare Health System" },
  "external rotation":         { id:"BcwPmwyyPww", ch:"Ohio State Wexner Medical Center" },
  "internal rotation":         { id:"0IOLRTdvzSM", ch:"Children's Hospital Colorado" },
  "scaption":                  { id:"JU8FTE-iHmU", ch:"UPMC" },
  "wrist extension":           { id:"qNCbvUGYk3g", ch:"Midlands Orthopaedics & Neurosurgery" },
  "wrist flexion":             { id:"qNCbvUGYk3g", ch:"Midlands Orthopaedics & Neurosurgery" },
  "wrist range of motion":     { id:"qm87Fr21gI4", ch:"EmergeOrtho | Triad Region" },
  "forearm stretches":         { id:"mV-GxLMR95w", ch:"East Cheshire NHS Trust" },
  "shoulder flexion":          { id:"JwRlLR6i9q4", ch:"MGHOrthopaedics" },
  "pronation":                 { id:"VV7zsl6LafM", ch:"Baptist Health" },
  /* Second pass, bar widened to include established specialty clinic groups. Five of these
     turned out to be top-tier anyway -- the first pass simply had not found them. */
  "wall sit":                  { id:"SofbDgyuOgo", ch:"MedStar Health" },
  "wall squat":                { id:"SofbDgyuOgo", ch:"MedStar Health" },        // our name for the same movement
  "single-leg squat":          { id:"hfEb7dJYZ0E", ch:"MGHOrthopaedics" },
  "single-leg calf raises":    { id:"qPd73snQfUs", ch:"Hospital for Special Surgery" },
  "elbow range of motion":     { id:"sOY3MvXh1Rg", ch:"Tan Tock Seng Hospital" },
  /* Specialty clinic groups -- the widened tier. Each treats patients; none is a personal
     brand, an education business or a device company. */
  "tandem stance":             { id:"pAF0iMKMqZI", ch:"Activ Therapy Health Clinics" },
  "front raise":               { id:"EqKVG30q-L4", ch:"Pursuit Physical Therapy" },
  "prone y-t-w":               { id:"CFt3WjCBbpc", ch:"Peak Form Health Center" },
  "prone y-t-w raises":        { id:"CFt3WjCBbpc", ch:"Peak Form Health Center" },
  /* Third pass — the most-prescribed movements that still had nothing. */
  "single-leg stance progression": { id:"Z9_ThjKQyOg", ch:"Children's Hospital Colorado" },  // same demo as single-leg balance
  "lateral band walks":        { id:"MZ1HbVflLUI", ch:"Atrius Health" },
  "y-balance":                 { id:"wMBWuVH3s-s", ch:"Northamptonshire Healthcare NHS Foundation Trust" },
  "star excursion":            { id:"wMBWuVH3s-s", ch:"Northamptonshire Healthcare NHS Foundation Trust" },
  "bulgarian split squat":     { id:"GPhpkIWJeec", ch:"Orillia Sports Medicine and Rehabilitation" },
  "bulgarian split squats":    { id:"GPhpkIWJeec", ch:"Orillia Sports Medicine and Rehabilitation" },
  "deadlift":                  { id:"Vwvrp1-mCHw", ch:"Ohio State Wexner Medical Center" },
  /* author_name is the bare handle "buckshospitals"; it is Buckinghamshire Healthcare NHS
     Trust (Stoke Mandeville / Wycombe / Amersham). Display the institution, not the handle. */
  "ankle range of motion":     { id:"LQDMDTJqUR0", ch:"Buckinghamshire Healthcare NHS Trust" },
  "loaded carries":            { id:"xSrPDlft9sE", ch:"Champion Physical Therapy and Performance" },
  "farmer's carry":            { id:"xSrPDlft9sE", ch:"Champion Physical Therapy and Performance" },
  "tendon glides":             { id:"18NLhrMjvmQ", ch:"Baptist Health" },
  "radial/ulnar deviation":    { id:"2Qcw24IVXDw", ch:"OrthoIndy" },
  "radial deviation":          { id:"2Qcw24IVXDw", ch:"OrthoIndy" },
  "ulnar deviation":           { id:"2Qcw24IVXDw", ch:"OrthoIndy" },
  "wrist holds":               { id:"6J5MUqxUKkw", ch:"OrthoCarolina" },
  "wrist isometrics":          { id:"6J5MUqxUKkw", ch:"OrthoCarolina" },
  /* author_name is bare "Blue Ridge"; the author_url in the SAME verified payload is
     @BlueRidgeHealthCare = UNC Health Blue Ridge (Morganton, NC). Payload-derived evidence,
     not a search snippet — which is why this is accepted where the bare name was not. */
  "grip strengthening":        { id:"iM-p8D1ErHg", ch:"UNC Health Blue Ridge" },
  "soft-ball squeezes":        { id:"iM-p8D1ErHg", ch:"UNC Health Blue Ridge" },
  "ball squeezes":             { id:"iM-p8D1ErHg", ch:"UNC Health Blue Ridge" },
  "scapular protraction":      { id:"wAddpEKrH8w", ch:"Children's Hospital Colorado" },
  "scapular retraction":       { id:"wAddpEKrH8w", ch:"Children's Hospital Colorado" },
  "reverse curls":             { id:"6TtkRqPjmsg", ch:"OrthoIndy" },
  /* "Husky Orthopaedics" is probably UW's orthopaedics department but could not be confirmed
     first-party, and an inference is not a verification. Using MGH's unambiguous alternative:
     its title, "Serratus Push Up on Knees", names the movement. */
  "knee chest press":          { id:"Uo-GNl3Xpo8", ch:"MGHOrthopaedics" },
  "knee push-up":              { id:"Uo-GNl3Xpo8", ch:"MGHOrthopaedics" },
  "push-up progression":       { id:"G_c3QztMZNQ", ch:"BESS — British Elbow & Shoulder Society" },
  /* Fourth pass. */
  "glute sets":                { id:"TPUcaCNKwnY", ch:"Visiting Nurse Association Health Group" },
  "short-foot exercise":       { id:"m1lkcg8p-48", ch:"Singapore General Hospital" },
  "short foot":                { id:"m1lkcg8p-48", ch:"Singapore General Hospital" },
  "step-downs":                { id:"RgTKgtV1ltk", ch:"Emory Healthcare" },
  "wall slides":               { id:"Eaj_NG5_hIo", ch:"BESS — British Elbow & Shoulder Society" },
  "single-leg rdl":            { id:"WLTjewtzyyc", ch:"Pursuit Physical Therapy" },
  "single-leg romanian deadlift": { id:"WLTjewtzyyc", ch:"Pursuit Physical Therapy" },
  "toe yoga":                  { id:"SbQ2RYxbppE", ch:"Sharp HealthCare" },
  "push-up plus":              { id:"7ISH0zz9XcM", ch:"Musculoskeletal Physiotherapy Australia" },
  "serratus push-up":          { id:"7ISH0zz9XcM", ch:"Musculoskeletal Physiotherapy Australia" },
  "toe scrunches":             { id:"3ekcuIDbQHQ", ch:"Southwest Foot and Ankle Centre" },
  "towel scrunches":           { id:"3ekcuIDbQHQ", ch:"Southwest Foot and Ankle Centre" },
  "scrunches":                 { id:"3ekcuIDbQHQ", ch:"Southwest Foot and Ankle Centre" },
  "heel walks":                { id:"2t0-W_pQOu8", ch:"Physiotattva" },
  "rotator holds":             { id:"8ugjLvoSC1A", ch:"INSYNC PHYSIO Vancouver" },
  "isometric rotator holds":   { id:"8ugjLvoSC1A", ch:"INSYNC PHYSIO Vancouver" },
  /* SYNONYMS onto videos already verified above. These are the SAME movement under the name
     our protocols happen to use -- not new claims, so they need no new verification. This was
     the single biggest win of the pass: ~615 prescriptions were falling through purely because
     the key did not match the wording. */
  "side-lying abduction":      { id:"g9FtnmsIYgI", ch:"Baptist Health" },              // its title IS "Side Lying Hip Abduction"
  "wrist curl":                { id:"qNCbvUGYk3g", ch:"Midlands Orthopaedics & Neurosurgery" },  // a wrist curl IS resisted wrist flexion
  "full-can raise":            { id:"JU8FTE-iHmU", ch:"UPMC" },                        // full-can raise = scaption
  "range of motion with cane": { id:"JwRlLR6i9q4", ch:"MGHOrthopaedics" },             // its title IS "Shoulder Flexion with Cane"
  "double-leg bridge":         { id:"PusbZuBgeug", ch:"University Orthopedics" }       // same movement as glute bridge
  /* Deliberately empty. Each was searched hard across multiple passes; NOT to be filled by
     lowering the bar. An exercise with no verified video simply shows none.
     - double-leg balance / weight shifts: institutions only publish these inside STROKE-framed
       or falls-prevention compilations (AHA STBFBCCMXIA, National Stroke Association
       mglfVFrK2ZI). This movement goes mostly to ankle/knee patients, who would click through
       to a stroke video and reasonably think the app mis-linked.
     - dynamic balance reach: closest was UCLA Recreation (hWotWdcKGpo) — a campus GYM
       department, not a clinical body.
     - agility & return-to-sport (box drill, 5-10-5 shuttle, deceleration, return-to-run,
       tempo jogging): structurally absent. Published almost only by strength coaches, combine
       -prep channels and equipment brands (SKLZ, IMG Academy).
     - gait training: only robotics vendors and trial literature.
     - wrist curl / wrist roller / rear-delt fly / overhead triceps extension: bodybuilding
       -saturated. Institutions say "wrist flexion" (qNCbvUGYk3g already covers it); a
       duplicate adds nothing.
     - ball catches: institutions describe it in protocols but never title a single-movement
       video for it.
     - bent-over row: Nuffield Health (ZathOyxYZ3M) passes on publisher -- the UK's largest
       healthcare charity -- but it also runs ~110 GYMS, and a barbell row almost certainly comes
       from that arm. The publisher bar is a proxy for clinical accountability; when the payload
       cannot tell you which arm produced it, the proxy has failed. Rejected, same rule that
       rejected UCLA Recreation.
     - hip range of motion: six query shapes, nothing institutional that names the movement. The
       near-misses (Barnes-Jewish, UCLA Health) are post-arthroplasty compilations, not ROM demos.
     - hammer curl / lateral bounds / hopping progression: bodybuilding and strength-coach
       channels only, same structural absence as the other plyometrics.
     Category labels the protocols emit ("sport-specific loading", "maintenance program",
     "aerobic conditioning", "functional patterns") are not movements and never get a video. */
};
/* Our protocols and the generated library spell the same movement several ways, and an exact
   key match threw that coverage away: "straight-leg raises" never matched "straight leg raise",
   "double-leg bridges" never matched "double-leg bridge". Normalise BOTH sides -- hyphens to
   spaces, trailing plural off words of 4+ chars -- so the wording stops mattering. Keys and
   movements go through the same function, so "quad sets" -> "quad set" on both sides. */
const vidNorm = t => String(t||"").toLowerCase()
  .replace(/[-–—]/g, " ")
  .replace(/\b(\w{3,})s\b/g, "$1")
  .replace(/\s+/g, " ").trim();
const CURATED_NORM = {};
for(const [k, v] of Object.entries(CURATED_VIDEOS)) CURATED_NORM[vidNorm(k)] = v;
/* Longest key first: "single-leg bridge" must not lose to "bridge"-style prefixes. */
const CURATED_KEYS = Object.keys(CURATED_NORM).sort((a,b)=>b.length-a.length);
function curatedVideoFor(name, pattern){
  const m0 = videoMovement(name, pattern);
  if(!m0) return null;
  const m = vidNorm(m0);
  if(CURATED_NORM[m]) return CURATED_NORM[m];
  for(const k of CURATED_KEYS) if(m.includes(k)) return CURATED_NORM[k];
  return null;
}
/* A generic video knows nothing about this user's precautions. If the engine has
   reshaped or removed a whole class of movement for them, say so ON the link —
   the one place they're about to go and watch someone do it differently. */
function videoCaveat(){
  const f = new Set(gatherFlags());
  const wb = (state.weightBearing||{}).status;
  if(wb && wb !== "fwb" && wb !== "wbat")
    return `Your weight-bearing order is ${(WB_STATUS[wb]||{}).abbr||wb} — videos will show the full standing version. Follow your plan's version, not theirs.`;
  if(f.has("sternal_precautions")) return "You're under sternal precautions — ignore any pushing, pulling or overhead loading a video shows.";
  if(f.has("spinal_precautions"))  return "You're under spinal precautions (no bending, lifting or twisting) — a general video won't respect them.";
  if(f.has("abdominal_precautions")) return "You're under abdominal precautions — ignore any sit-ups, crunches or planks a video adds.";
  if(f.has("pregnancy")) return "Videos won't account for pregnancy — skip lying flat on your back and any breath-holding they show.";
  return "Videos are generic: they don't know your precautions, your phase, or your dose. Your plan's sets and reps win.";
}
/* Only ever link a video whose PUBLISHER was verified. There is no search fallback: an
   unvetted YouTube search dressed as a feature is the app pointing at content it knows
   nothing about, and "nothing here is vetted" does not make that safe -- it just makes it
   deniable. If a movement has no verified demonstration, the Explain text stands on its
   own and we say nothing. The "other videos" link is gone for the same reason: it was the
   same unvetted search wearing a quieter label. */
function videoLinkHTML(name, pattern){
  const cur = curatedVideoFor(name, pattern);
  if(!cur) return "";
  return `<div class="vidrow no-print">
    <a class="vidlink vidcur" href="https://www.youtube.com/watch?v=${esc(cur.id)}" target="_blank" rel="noopener noreferrer nofollow">▶ Watch how <span class="vidext">↗</span></a>
    <span class="vidsrc">from <b>${esc(cur.ch)}</b> <span class="vidver">· link checked ${esc(VIDEO_VERIFIED)}</span></span>
    <span class="vidnote">${esc(videoCaveat())}</span>
    <span class="vidoff">You're offline — this needs a connection.</span>
  </div>`;
}
/* =====================================================================
   "WHAT IT IS" / "WHY IT HELPS" — specificity + variance
   PATTERN_INFO carries one `what` and one `why` per movement pattern, so every
   squat variant opened and closed with the identical two sentences no matter
   what the name said. Same disease the How-to had.

   Two things happen here:
   1. VARIANCE — three true phrasings per pattern, chosen by a hash of the
      exercise NAME. Deterministic on purpose: the same exercise must always
      read the same way (a re-render must not reshuffle the words), while
      different exercises sharing a pattern don't open identically.
   2. SPECIFICITY — the implement, named variant and modifier each add a clause
      saying what THEY are / what THEY buy, layered onto the pattern sentence.
   ===================================================================== */
const pickAlt = (name, arr) => arr[Math.abs(hashStr(String(name||""))) % arr.length];

const WHAT_ALT = {
  squat:["A squat is a foundational lower-body movement that bends the hips and knees together.",
         "The squat is the sit-down-and-stand-up pattern, loaded deliberately.",
         "A squat bends the hips and knees together to load the whole leg at once."],
  hinge:["A hip hinge (deadlift-family) movement bends mainly at the hips while the spine stays long.",
         "A hinge is the pick-something-up pattern: hips travel back, spine stays long.",
         "A hip hinge loads the back of the body by folding at the hips rather than the knees."],
  lunge:["A lunge is a split-stance movement that loads one leg at a time.",
         "A lunge splits your stance so one leg does most of the work.",
         "A lunge is the stepping pattern — one leg forward, one behind, loaded through the front."],
  calf:["A calf raise loads the calf muscles and Achilles tendon.",
        "A calf raise is the push-off pattern: rise onto the toes against your body weight.",
        "A calf raise works the calf and the Achilles tendon it feeds into."],
  pull:["A pulling / curling exercise contracts a muscle to draw resistance in or bend a joint.",
        "A pull draws resistance toward you, or bends a joint against it.",
        "A pulling movement shortens the muscle to bring the load in."],
  push:["A pushing / pressing exercise contracts a muscle to press resistance away or straighten a joint.",
        "A press drives resistance away from you, or straightens a joint against it.",
        "A pushing movement extends the joint to move the load away."],
  isometric:["An isometric is a static hold with no joint movement.",
             "An isometric means the muscle works hard while nothing moves.",
             "An isometric is a held position — tension without motion."],
  mobility:["A mobility or stretching drill moves a joint through its available range.",
            "A mobility drill asks a joint for the range it currently has, gently.",
            "A mobility exercise works on range of motion rather than strength."],
  balance:["A balance exercise challenges your stability and body awareness.",
           "A balance drill deliberately makes staying upright harder than usual.",
           "A balance exercise trains the reactions that keep you from falling."],
  plyo:["A plyometric is an explosive jump or hop that trains power and landing control.",
        "A plyometric trains the spring — jumping, hopping and landing under control.",
        "A plyometric is fast, springy loading: leave the ground and absorb the landing."],
  carry:["A loaded carry means walking while holding weight.",
         "A carry is exactly what it sounds like: pick the load up and walk with it.",
         "A loaded carry trains the whole body by making you hold something while you move."],
  cardio:["An aerobic activity raises your heart and breathing rate steadily.",
          "Aerobic work keeps your heart and breathing up for a sustained stretch.",
          "This is cardiovascular work — steady effort your heart and lungs have to keep up with."],
  vestibular:["A vestibular exercise retrains the inner-ear balance system.",
              "A vestibular drill asks the inner ear and eyes to recalibrate together.",
              "This retrains the balance system in your inner ear."],
  breathing:["A breathing exercise trains the diaphragm and breathing pattern.",
             "A breathing drill retrains how, not just how much, you breathe.",
             "This trains the diaphragm and the pattern of your breathing."],
  "anti-ext":["An anti-extension core exercise resists the low back arching.",
              "This core exercise is about NOT letting the low back arch.",
              "An anti-extension drill trains the core to stop the spine extending."],
  "anti-rot":["An anti-rotation core exercise resists twisting.",
              "This core exercise is about NOT letting the trunk twist.",
              "An anti-rotation drill trains the core to resist a turning force."],
  extension:["A back-extension exercise strengthens the muscles that straighten the spine.",
             "This works the muscles running up the back of your spine.",
             "A back-extension movement trains the muscles that hold you upright."],
  flexion:["A trunk-flexion exercise works the abdominals by curling the spine.",
           "This curls the spine forward to work the abdominals.",
           "A trunk-flexion drill trains the abdominals through spinal curling."],
  gait:["A gait drill practices the components of walking.",
        "A gait drill breaks walking into parts and rehearses them.",
        "This practices a specific piece of the walking pattern."],
  agility:["An agility / change-of-direction drill trains fast, controlled starts, stops and turns.",
           "An agility drill trains stopping, starting and turning at speed.",
           "This trains quick changes of direction under control."],
  rotate:["A rotational exercise trains controlled trunk turning and power.",
          "A rotational drill trains the trunk to turn with control and force.",
          "This trains twisting — deliberately, and under control."],
  supine:["A supine (lying on your back) therapeutic exercise — a gentle, low-load movement done on a mat, floor or bed.",
          "A lying-down therapeutic exercise: low load, done on a mat, bed or floor.",
          "A supine exercise — you're on your back, so the joint carries almost nothing."],
  seated:["A seated therapeutic exercise — a gentle, controlled movement done sitting in a sturdy chair.",
          "A chair-based therapeutic exercise: controlled, supported, no standing needed.",
          "A seated exercise — the chair takes your weight so the joint doesn't have to."],
  standing:["A standing therapeutic exercise — a supported, weight-bearing movement done holding a counter or rail.",
            "An upright, supported exercise done holding a counter or rail.",
            "A standing exercise — weight-bearing, but with something solid to hold."],
  pool:["A pool / aquatic therapeutic exercise — done standing or moving in chest-deep water, where buoyancy carries much of your body weight.",
        "A water-based exercise: buoyancy holds you up so the joint doesn't take the load.",
        "An aquatic exercise done in chest-deep water, where the water carries most of your weight."],
  general:["A general conditioning exercise for the area.",
           "General conditioning work for the region.",
           "A general strengthening and movement exercise for the area."],
  pump:["An ankle pump — the simplest exercise there is: pointing and flexing your foot to squeeze the calf and push blood back up the leg.",
        "Pointing and flexing the ankle, over and over. It looks like nothing and does a great deal.",
        "The point-and-flex drill that keeps blood moving while the rest of you is stuck still."],
  ped_handling:["Parent-led handling — gentle positioning and movement done FOR your baby, not by them.",
        "Something you do for your baby with your hands, slowly, while they lie somewhere safe.",
        "Hands-on care rather than exercise: positioning, gentle movement, and a lot of patience."],
  ped_milestone:["Milestone play — helping the next stage of your baby's movement arrive, through play rather than exercise.",
        "Play with a purpose: the next thing your baby is nearly ready to do, rehearsed until it arrives.",
        "Floor play aimed squarely at the milestone your baby is working on right now."],
  ped_play:["A movement game — the toddler version of an exercise, because toddlers repeat what's fun and ignore what's prescribed.",
        "An exercise wearing a fancy-dress costume. To your toddler it's a game; to their legs it's practice.",
        "A game you play together that happens to be exactly the movement they need."],
  ped_skill:["A fundamental movement skill — hopping, catching, balancing — practised as a game.",
        "One of the building-block skills of childhood, drilled the only way it works at this age: by playing it.",
        "A basic movement skill — the sort of thing children look clumsy at until suddenly they don't."],
  ped_train:["Technique-first training for a school-age child — the movement learned properly before any weight is added.",
        "Real training for a child: light or no load, and all the attention on doing it well.",
        "A strengthening exercise scaled for a school-age body — practice first, load much later."],
  ped_strength:["Supervised resistance training for a teenager — close to adult training, with the growing skeleton taken into account.",
        "Grown-up strength training with two teenage caveats: technique before load, and no maximal lifts yet.",
        "Proper resistance work for a teenager, coached and progressed with open growth plates in mind."]
};
const WHY_ALT = {
  squat:["Builds strength in the quads, glutes and whole leg for standing, stairs and lifting.",
         "This is the pattern behind every chair, stair and kerb you meet — strengthening it shows up everywhere.",
         "Loads the quads and glutes together, which is what standing up and climbing actually demand."],
  hinge:["Strengthens the hamstrings, glutes and back for bending, lifting and posture.",
         "Teaches your hips, not your low back, to do the lifting — which is what protects the back long-term.",
         "Builds the back of the body: hamstrings, glutes and spinal muscles working as one."],
  lunge:["Builds single-leg strength, balance and control for walking and stairs.",
         "Walking is single-leg. Training one leg at a time closes gaps a two-legged exercise hides.",
         "Develops the single-leg control that stairs, kerbs and uneven ground demand."],
  calf:["Strengthens the calf and Achilles for push-off, walking and running.",
        "The calf is the engine of push-off — weak calves show up as a limp long before they show up as pain.",
        "Builds the calf-Achilles unit that propels every step you take."],
  pull:["Builds pulling and curling strength and helps balance the joints it crosses.",
        "Pulling strength balances all the pushing daily life already gives you.",
        "Strengthens the muscles that draw things toward you and support the joint they cross."],
  push:["Builds pressing and extending strength for everyday tasks.",
        "Pressing strength is what pushing doors, standing up from the floor and carrying overhead need.",
        "Strengthens the muscles that move loads away from you."],
  isometric:["Builds strength and tendon tolerance and often eases pain — useful when movement hurts.",
             "Holds often reduce pain while you do them, which makes them the way in when moving hurts.",
             "Loads the tendon without moving the joint — strength you can build even on a sore day."],
  mobility:["Restores range of motion and reduces stiffness.",
            "Range you lose after injury doesn't return on its own — it has to be asked for, regularly.",
            "Reduces stiffness and gives the joint back the room it needs to work."],
  balance:["Improves stability and coordination and lowers fall and re-injury risk.",
           "Balance is trainable at any age, and it is the single most modifiable fall risk you have.",
           "Sharpens the reactions that catch you before a stumble becomes a fall."],
  plyo:["Rebuilds power and shock absorption for sport and impact activities.",
        "Landing is where injuries happen — training it deliberately is what makes running and sport safe again.",
        "Restores the spring and the shock absorption that impact activities demand."],
  carry:["Builds grip, core and whole-body strength and endurance.",
         "Carrying shopping, a toolbox or a child is a real-world test — training it transfers directly.",
         "Loads grip, trunk and legs together in the way daily life actually asks."],
  cardio:["Builds cardiovascular fitness, endurance and recovery capacity.",
          "Aerobic fitness underpins how fast you recover between sessions — and how well tissue heals.",
          "Improves heart, lung and circulatory capacity, which speeds recovery everywhere else."],
  vestibular:["Reduces dizziness and improves gaze and balance stability.",
              "The inner ear recalibrates through controlled exposure — avoiding the symptom keeps it.",
              "Settles dizziness and steadies your vision when your head moves."],
  breathing:["Improves breathing efficiency and helps control breathlessness.",
             "Breathlessness is frightening, and a technique you've practised is what makes it manageable.",
             "Makes each breath do more work, so you get less breathless doing the same thing."],
  "anti-ext":["Builds deep core control that protects the spine.",
              "A core that stops unwanted movement protects the back better than one that only creates it.",
              "Trains the trunk to stay stable while the limbs work — which is its actual job."],
  "anti-rot":["Builds trunk stability for lifting, sport and spine protection.",
              "Resisting a twist is harder, and more useful, than making one.",
              "Builds the stability that keeps the spine safe when a load pulls you off-centre."],
  extension:["Strengthens the back extensors for posture and lifting.",
             "Back muscles that tire early are why sitting and standing start to ache by afternoon.",
             "Builds endurance in the muscles that hold you upright all day."],
  flexion:["Builds abdominal strength — introduced when appropriate for your condition.",
           "Abdominal strength contributes to trunk control, but the timing matters for your condition.",
           "Strengthens the abdominals as part of overall trunk control."],
  gait:["Improves walking quality, coordination and confidence.",
        "Walking well is a skill — after injury it has to be re-learned, not just resumed.",
        "Rebuilds a smooth, even, confident walking pattern."],
  agility:["Rebuilds the ability to move quickly and safely — key for returning to sport and reacting in daily life.",
           "Most re-injuries happen changing direction, not running straight — so that's what gets trained.",
           "Restores fast, controlled turning and stopping."],
  rotate:["Builds rotational strength for sport and daily twisting tasks.",
          "Almost every sporting action and half of daily life involves a twist — untrained, it's a weak link.",
          "Develops controlled power through the trunk's turning range."],
  supine:["Rebuilds early strength, control and range with almost no joint loading — ideal after surgery, when weight-bearing is limited, or when standing is painful.",
          "Lying down removes the joint load entirely, so you can start rebuilding long before standing work is safe.",
          "Restores muscle activation and range at a stage when the joint can't yet take weight."],
  seated:["Builds strength and range safely, with support and no standing-balance demand — good early in recovery or when standing is limited.",
          "Sitting takes balance out of the equation, so all the effort goes to the muscle you're training.",
          "Lets you build real strength without needing to stand or balance."],
  standing:["Rebuilds standing strength, hip control and balance in a functional upright position — the bridge from table-based exercises to walking and daily life.",
            "Upright is where you actually live — this is the bridge from mat work back to walking.",
            "Trains strength and hip control in the position daily life demands."],
  pool:["Buoyancy offloads sore or healing joints while the water gives gentle all-around resistance and warmth — so you can move, strengthen and build fitness with far less impact than on land.",
        "Water lets you move and load a joint weeks before land-based work would be comfortable.",
        "Buoyancy takes the load off while the water still resists you in every direction."],
  general:["Helps restore strength, movement and function.",
           "Contributes to overall strength, movement and function in the area.",
           "Supports the return of strength and normal movement."],
  pump:["Your calf is a pump. Every squeeze pushes blood back towards your heart, which brings swelling down and lowers the risk of a clot while you're less mobile than usual.",
        "Blood doesn't climb out of your leg on its own — the calf squeezes it upward. When you stop walking, that pump stops, so you do it by hand.",
        "Keeps the circulation moving in a leg that isn't walking much yet. Cheap, safe, and it does more than it looks like it does."],
  ped_handling:["Keeps joints and muscles supple while a newborn can't move much themselves, and stops stiffness setting in during the weeks that matter most.",
        "A newborn can't stretch themselves. Doing it gently for them keeps the range they were born with.",
        "Small, regular movements now prevent the tightness that is much harder to undo later."],
  ped_milestone:["Babies build strength and control by practising the next thing they're nearly ready for. Rolling, sitting and crawling aren't taught — they're rehearsed, and this is the rehearsal.",
        "Every milestone is built on the one before it. Time on the floor is what pays for the next one.",
        "This is how babies get strong: reaching, rolling and pushing up, over and over, because something interesting is just out of reach."],
  ped_play:["At this age the repetitions only happen if it's a game. The strength, balance and coordination arrive as a by-product of playing it enough times.",
        "A toddler will do fifty of something fun and none of something asked. The game is the delivery mechanism.",
        "Turning it into play is not a compromise — it's the only version a toddler will actually repeat."],
  ped_skill:["These skills are the building blocks everything later stands on. Children who master them stay active; children who feel clumsy quietly stop moving, and that's harder to fix than any injury.",
        "Hopping, catching and balancing now become confidence later. Confident children keep moving.",
        "Get these right and every sport, game and playground afterwards is easier. Miss them and everything feels hard."],
  ped_train:["Children do get stronger from training, but at this age the gains come from the nervous system learning the movement rather than from bigger muscles. That means good practice IS the training.",
        "Strength at this age is a skill more than it is muscle — which is exactly why technique comes before load, not after it.",
        "Learning the pattern well now is what makes it safe to load it later. It's also, on its own, what makes them stronger."],
  ped_strength:["Properly supervised resistance training is safe and effective for teenagers — the old 'no weights until you're grown' advice doesn't hold up. What still applies is the growth plate: it's the weak link until it closes.",
        "This works, and the evidence is clear it's safe when it's coached. The caution isn't about weights — it's about the growing skeleton underneath them.",
        "Builds real strength for sport and daily life. Progress it on technique rather than on how much you can shift, and the growth plates stay out of trouble."]
};

/* What the implement IS, for the "what it is" line. */
const WHAT_EQUIP = {
  "Dumbbell":"loaded with a dumbbell", "Kettlebell":"loaded with a kettlebell", "Barbell":"loaded with a barbell",
  "Band":"against band resistance", "Loop-band":"against a loop band", "Cable":"against a cable",
  "Machine":"on a machine", "Suspension":"on suspension straps", "Med-ball":"with a medicine ball",
  "Sandbag":"with a sandbag", "Chair":"using a chair", "Towel":"using a towel",
  "Broomstick":"guided by a broomstick", "Backpack":"loaded with a weighted backpack",
  "Heavy-book":"loaded with a heavy book", "Soup-can":"loaded with a soup can",
  "Water-bottle":"loaded with water bottles", "Water-jug":"loaded with a water jug"
};
/* What the variant/modifier IS (what-line) and what it BUYS (why-line). */
const SPEC_CLAUSES = [
  [/\bunilateral\b|single-leg|\b1-leg\b|one-leg/i, "done one side at a time",
   "Working one side at a time exposes and fixes the side-to-side difference a two-legged version quietly hides."],
  [/slow-tempo \(3s eccentric\)|slow eccentric|\beccentric\b/i, "with the lowering phase deliberately slowed",
   "The slow lowering phase is the strongest known stimulus for tendon and muscle remodelling — it is why this version exists."],
  [/with 2s pause|\bpaused\b|1\.5-rep/i, "with a pause at the hardest point",
   "Pausing kills the bounce, so the muscle — not momentum — does the work through the hardest part of the range."],
  [/on unstable surface|\bfoam\b|\bbosu\b|wobble/i, "on a deliberately unstable surface",
   "An unstable surface trains the fast, reflexive ankle and hip reactions that keep you upright on uneven ground."],
  [/\bpool\b|aquatic|\bwater\b(?!.?bottle|.?jug)/i, "done in water",
   "Water supports you and resists you at the same time, so you can load a joint that could not yet take your weight on land.",
   ["pool"]],
  [/banded \(accommodating\)/i, "with accommodating band resistance",
   "Band resistance rises as you extend, so the load matches your strength curve instead of fighting it."],
  [/\bpartial-range\b/i, "through a limited, comfortable range",
   "A limited range lets you keep loading and keep progressing on days the full range would flare things up."],
  [/\bfull-range\b/i, "through the fullest range you can control",
   "Strength is built mostly in the range you train, so training the full range is what makes it usable everywhere."],
  [/with isometric hold|\bisometric\b/i, "with a static hold added",
   "Adding a hold builds tendon tolerance and often calms pain, which keeps you progressing when movement alone hurts.",
   ["isometric"]],   // redundant when the pattern already IS a hold
  [/\bwall\b.*(squat|sit)/i, "held against a wall",
   "The wall takes balance out of it entirely, so every bit of effort goes into the thigh."],
  [/heel-elevated/i, "with the heels raised",
   "Raising the heels works around stiff ankles, so limited ankle range stops capping how much your thighs get worked."],
  [/\bgoblet\b/i, "holding the weight at your chest",
   "A front-held weight counterbalances you, which is why most people can sit deeper and straighter with it than without."],
  [/\bbox\b.*(squat|sit)/i, "sitting to a box",
   "The box fixes your depth, so every rep is the same and progress is something you can actually measure."],
  [/\bnordic\b/i, "lowering under control against gravity",
   "This is among the most effective hamstring-injury preventers there is — it loads the muscle hard at long length."],
  [/eyes-closed/i, "with vision removed",
   "Closing your eyes forces the ankle and inner ear to balance without vision covering for them."],
  [/dual-task|counting|while talking/i, "while doing a second task",
   "Real life never gives balance your full attention — training divided attention is what makes it transfer."]
];
function specClauses(name, pattern){
  const what = [], why = [];
  for(const [re, w, y, redundantFor] of SPEC_CLAUSES){
    if(!re.test(name||"")) continue;
    if(redundantFor && redundantFor.includes(pattern)) continue;   // the pattern sentence already says it
    if(w) what.push(w);
    if(y) why.push(y);
    if(what.length >= 2) break;      // two clauses is plenty for one sentence
  }
  return { what, why };
}
/* =====================================================================
   EXPLAIN SPECIFICITY LAYERS
   PATTERN_HOWTO has ONE entry per movement pattern, so every one of the 2,086
   squat variants got byte-identical instructions: the same words for "Squat",
   "Goblet squat", "Barbell box squat — with 2s pause" and "Soup-can split
   squat — unilateral". The implement, the named variant and the modifier are
   all already in the name; these layers read them and say what each one
   actually CHANGES about the execution.
   Measured over the 20,000-exercise library: 16,485 carry an implement and
   17,516 carry a modifier, so only ~479 bodyweight-with-no-modifier moves fall
   back to the bare pattern text.
   ===================================================================== */

/* The implement decides how you hold and set the thing up — which the pattern
   text cannot know. Keys match the name's leading word (and e.equipment). */
const EQUIP_HOWTO = {
  "Dumbbell":     { set:"Hold a dumbbell in each hand (or one, if the movement is single-arm) with a firm grip, wrists straight — not bent back.",
                    avoid:"If your wrists ache, the grip is usually too loose or the weight too heavy." },
  "Kettlebell":   { set:"Hold the kettlebell by the handle and let the bell rest against the back of your forearm rather than banging it — grip just tight enough to control it.",
                    avoid:"Don't let the bell flop onto your wrist at the top." },
  "Barbell":      { set:"Set the bar at a height you can reach without tiptoeing. Grip evenly, thumbs wrapped around, and take the weight fully before your first rep.",
                    avoid:"Never grip a loaded bar with thumbs behind it, and don't unrack far from the stands." },
  "Band":         { set:"Anchor the band at the height the movement asks for and take the slack out before rep one — stand further away for more resistance.",
                    avoid:"Never let a stretched band snap back — control the return, and check for nicks before you use it." },
  "Loop-band":    { set:"Set the loop where the movement asks (usually just above the knees or around the ankles) and keep light tension on it the whole set.",
                    avoid:"Don't let the loop roll or slide — if it does, move it lower or use a wider band." },
  "Cable":        { set:"Set the pulley height, then step away far enough to pre-load the cable before your first rep so tension never drops.",
                    avoid:"Don't let the stack touch down between reps — that's where the tension is lost." },
  "Machine":      { set:"Adjust the seat and pads so the machine's pivot lines up with the joint you're moving. This matters far more than the weight on the stack.",
                    avoid:"If you have to shift or arch to reach the handles, the machine is set wrong, not you." },
  "Suspension":   { set:"Check the anchor is solid and take the slack out. Your foot position is the dial: walk your feet in to make it harder, out to make it easier.",
                    avoid:"Don't let the straps saw against your arms, and keep the anchor point above head height." },
  "Med-ball":     { set:"Hold the ball close to your chest unless the movement says otherwise; pick a weight you can control at speed, not the heaviest you can lift.",
                    avoid:"" },
  "Sandbag":      { set:"Hug the bag or grip its handles and keep it tight to your body — the load shifts, and that's the point.",
                    avoid:"Don't let it drift away from you; that's where backs get hurt." },
  "Chair":        { set:"Use a stable, non-rolling chair with its back against a wall.",
                    avoid:"Never use a chair with wheels or castors for this." },
  "Towel":        { set:"Roll or fold the towel as the movement asks and keep a light, even pull on it — the towel supplies the resistance, so tension is on you.",
                    avoid:"" },
  "Broomstick":   { set:"Hold the stick wide enough that your shoulders are comfortable — it's a guide for position, not a load.",
                    avoid:"" },
  "Backpack":     { set:"Load a backpack with books or bottles until it feels like the right effort, and wear or hold it as the movement asks.",
                    avoid:"Pack it so the load can't shift mid-set." },
  "Heavy-book":   { set:"Hold the book at its spine with both hands so it can't slip.",
                    avoid:"" },
  "Soup-can":     { set:"A can or a small bottle is your weight here — light on purpose. Hold it firmly with a straight wrist.",
                    avoid:"If it feels too easy, slow the movement down or add reps rather than reaching for something heavier." },
  "Water-bottle": { set:"Hold a filled bottle in each hand. Part-fill them if it's too heavy — that's the adjustment.",
                    avoid:"" },
  "Water-jug":    { set:"Hold the jug by its handle, or hug it to your chest. The water sloshes, so grip a little firmer and move a little slower.",
                    avoid:"" }
};
function explainEquip(name){
  const n = String(name||"");
  for(const k of Object.keys(EQUIP_HOWTO))
    if(new RegExp("^" + reEsc(k) + "\\b", "i").test(n)) return EQUIP_HOWTO[k];
  return null;
}

/* Named variants — the base name says the movement has been deliberately
   changed, and each change has its own point and its own failure mode. */
const VARIANT_HOWTO = [
  [/\bgoblet\b/i,           { set:"Hold the weight vertically against your chest, elbows tucked in under it.", step:"The front load acts as a counterweight — it lets most people sit down straighter and deeper than they can unloaded." }],
  [/\bfront squat\b/i,      { set:"The bar sits on the front of your shoulders, elbows pointed high and forward.", step:"Keep those elbows up. The moment they drop, the bar rolls forward and your back rounds to chase it.", avoid:"If your elbows won't stay up, your wrists or upper back are the limit — not your legs." }],
  [/\boverhead squat\b/i,   { step:"Keep the weight stacked directly over the middle of your foot throughout — it should never drift in front of you.", avoid:"This exposes every shoulder and ankle restriction you have. Go light." }],
  [/\bbox squat\b/i,        { set:"Set a box or chair at the depth you're aiming for.", step:"Sit back until you genuinely touch the box, pause for a moment without relaxing, then stand.", avoid:"Don't flop onto the box or rock forward off it." }],
  [/heel-elevated/i,        { set:"Put a small wedge, plate or book under your heels.", step:"Raising the heels lets your knees travel further forward, so you stay more upright and the thighs work harder — useful if stiff ankles limit your depth." }],
  [/\bsplit squat\b|\blunge\b.*\brear\b|bulgarian/i, { step:"Almost all the weight goes through the FRONT leg — the back leg is a kickstand for balance, not a second engine." }],
  [/\bsumo\b|wide[- ]stance/i, { step:"A wider stance with toes turned further out shifts the work toward the inner thigh and glutes and shortens the range." }],
  [/\bdeficit\b/i,          { step:"Standing on a step or plate adds range below your normal end point — start with a small deficit and add height slowly." }],
  [/\bwall\b.*\bsit\b|\bwall sit\b/i, { set:"Slide down a wall until your thighs are where you want them.", step:"Hold still and breathe normally — the challenge is time under tension, not depth.", avoid:"Don't hold your breath. If your knees complain, sit less deep." }],
  [/\bpistol\b|single-leg squat/i, { step:"The free leg stays out in front as a counterweight — hold a rail or door frame until you own the balance.", avoid:"Progress to this only once you can control a two-leg squat to the same depth." }],
  [/\bnordic\b/i,           { step:"Lower as slowly as you possibly can and catch yourself with your hands — the aim is to resist gravity, not to reach the floor gracefully.", avoid:"Expect real soreness for a few days after the first session. Start with very few reps." }],
  [/copenhagen/i,           { step:"Support the top leg on a bench and lift your body from your inner thigh — start with the knee supported, not the ankle." }],
  [/\bromanian\b|\brdl\b/i, { step:"The knees stay softly bent and roughly fixed — the movement is hips travelling backwards, not knees bending." }],
  [/\bstep-?up\b/i,         { set:"Use a step you can stand on with the whole foot.", step:"Push through the TOP foot to rise — don't push off the bottom foot or bounce up.", avoid:"Lower under control; stepping down is where most people lose the benefit." }],
  [/\bsit-to-stand\b/i,     { step:"Nose over toes, then drive up through your heels. Reach forward with your arms if it helps you start.", avoid:"Don't drop back into the chair — control the way down; that's half the exercise." }],
  [/\bplank\b/i,            { step:"Squeeze your glutes and gently tuck your ribs down — a plank is a whole-body brace, not a hover.", avoid:"Don't let your hips sag or pike up, and don't hold your breath." }],
  [/\bbridge\b/i,           { step:"Push through your heels and squeeze your glutes to lift — stop when your hips, knees and shoulders line up.", avoid:"Don't arch your low back to get higher; the extra height comes from the back, not the glutes." }],
  [/\bclamshell\b/i,        { step:"Keep your hips stacked and still — if your whole pelvis rolls back, the glute stops working and the movement becomes free." }],
  [/\bdead ?bug\b|\bbird ?dog\b/i, { step:"Move the limbs slowly while the low back stays exactly where it started — if it lifts or presses, you've gone too far.", avoid:"Speed makes this look easy and do nothing." }],
  [/quad set|\bvmo\b|straight-leg raise|\bslr\b/i, { step:"Tighten the thigh first and hold that tension throughout — the muscle switching on is the whole point, not the movement." }],
  [/\bpursed\b|diaphragm|belly breath/i, { step:"Breathe in through the nose for about 2 seconds, then out through pursed lips for about 4 — longer out than in." }],
  [/^tempo |\btempo (squat|deadlift|press|row|lunge)/i, { step:"Deliberately slow and controlled throughout — usually about 3 seconds down, 1 second up. Slowing it down is the load here, so you need less weight.", avoid:"Rushing the lower defeats the entire purpose of the variation." }],
  [/\bdeep (squat|lunge|split|knee bend|hinge|dip|sit)\b/i,     { step:"Go lower than the standard version — but only as low as you can control, with your heels staying down and your back keeping its normal shape.", avoid:"Depth you can't control isn't depth. Build it over weeks, not in one session." }],
  [/wall.*(squat|sit)|\bwall\b.*isometric/i, { set:"Stand with your back flat against a wall and walk your feet out.", step:"Slide down until your thighs are where prescribed, and hold — the challenge is time, not depth.", avoid:"Don't hold your breath, and come out of it if your knees start complaining." }],
  [/1\.5-rep/i,            { step:"Go all the way down, come up HALFWAY, go back down, then come all the way up — that's one rep. It doubles the time spent in the hardest part of the range.", avoid:"Expect to need much less weight than a normal set." }],
  [/\bpulse\b/i,          { step:"Stay in the bottom position and make small, controlled pulses rather than full reps." }],
  [/eyes-closed|eyes closed/i, { set:"Stand within arm's reach of a wall or counter before you close your eyes.", step:"Close your eyes and hold. Open them the moment you feel yourself going — don't fight it out." }],
  [/\bfoam\b|\bbosu\b|\bcushion\b|wobble/i, { set:"Put a cushion, folded towel or foam pad underfoot.", step:"The soft surface makes your ankle work constantly to keep you level — expect small wobbles; that IS the exercise." }],
  [/tandem|heel-to-toe/i,  { step:"Place one foot directly in front of the other, heel touching toe, as if on a tightrope." }],
  [/\bY-balance\b|star excursion/i, { step:"Stand on one leg and reach the other foot as far as you can in each direction, tapping lightly without putting weight on it, then return under control." }],
  [/water walking/i,       { set:"Stand in water around waist to chest depth — deeper takes more weight off, shallower loads more.", step:"Walk with a normal heel-to-toe pattern rather than tiptoeing, and let the water's resistance do the work.", avoid:"Walking backward? Check behind you first, and keep a hand near the rail." }],
  [/aqua jog|deep-water/i, { set:"Use a buoyancy belt in water deep enough that your feet don't touch.", step:"Run in place with a tall posture — no bicycling motion, and don't let your body tip forward." }],
  [/\bbolster\b|over a bolster|towel roll/i, { set:"Put a rolled towel or bolster under the knee so it rests bent a little.", step:"Straighten only to where the leg is level with the roll — this trains the last few degrees, which is where most people lose their knee." }],
  [/\b3s hold\b|\bhold at the top\b|holding a counter/i, { step:"Hold at the end position for the full count, keeping the muscle switched on rather than resting on the joint." }],
  [/\bhourly\b|every hour/i, { step:"Little and often beats one long session — set an hourly reminder, do the set, move on." }],
  [/\bankle pump\b|point-and-flex/i, { step:"Point your toes away, then pull them firmly back toward your shin. This drives the calf muscle pump that keeps blood moving.", avoid:"Nothing here should hurt — this one is about circulation, not effort." }],

  /* ---- Paediatric movements. ----------------------------------------------
     The paediatric PATTERNS are broad classes ("milestone play", "a movement game"), so on
     their own they gave a parent asking "how do I do tummy time?" four sentences about
     putting a toy just out of reach and never once said "lay your baby on their front".
     A pattern can't fix that — the class really does cover thirty different movements. So
     the specifics live here, the same way "Barbell squat" gets its bar setup.
     ⚠ Regexes must not reach into the adult library: /rolling/ alone would match "Foam
     rolling", /crawl/ alone matches "Bear crawl". Anchor on the full paediatric phrase. */
  [/tummy time/i,                    { set:"Lay your baby on their front, with their arms forward and their elbows under or just ahead of their shoulders.", step:"Get down flat in front of them so they have to lift their head to find your face. That lift IS the exercise.", avoid:"Only ever while they're awake and you're watching them. Babies still sleep on their backs — every sleep, every time." }],
  [/rolling (tummy-to-back|back-to-tummy)/i, { set:"Lay your baby down with plenty of clear space either side.", step:"Start the roll for them by gently guiding one hip or shoulder across, then pause and let them finish it themselves.", avoid:"Don't roll them all the way through. The bit they do unaided is the bit that teaches them." }],
  [/supported sitting|independent sitting/i, { set:"Sit them on the floor with cushions around them and something soft behind.", step:"Put toys just off to one side so they have to shift their weight and prop on a hand to reach — that propping is what builds the balance.", avoid:"Floor only, never a raised surface, and stay within arm's reach the whole time." }],
  [/\bcrawling\b|four-point rocking|pivoting in prone/i, { set:"Clear a run of floor and get down at the far end of it.", step:"Put the toy a body-length away, not right under their nose — far enough that they have to travel for it.", avoid:"Don't worry if they shuffle, commando-crawl or bum-shuffle instead. Lots of babies never crawl on hands and knees, and it doesn't hold them back." }],
  [/pull-to-stand|controlled lowering from standing/i, { set:"Kneel by a low, solid surface — a sofa or a coffee table that won't tip.", step:"Put a toy on top so they pull themselves up to get it. Then teach the way down too: guide them to bend their knees and sit, rather than letting them topple backwards.", avoid:"Check what they're pulling on. Anything that can tip over — a side table, a bookcase — is the wrong thing to practise on." }],
  [/cruising along the furniture/i,  { set:"Line up sofa, table and chairs so there's a continuous edge to travel along, with a soft floor underneath.", step:"Put a toy a little further along than they've gone before, so they have to sidestep to reach it.", avoid:"Make sure everything they're holding is heavy enough not to slide away." }],
  [/assisted stepping|first steps practice/i, { set:"Stand or kneel behind them and hold at their hips or trunk, not by their hands above their head.", step:"Support their body, not their arms — holding hands up high does the balancing for them, so they never learn it.", avoid:"Don't march them along faster than they're steering. Let them set the pace and the direction." }],
  [/passive .*range of motion|passive foot & ankle stretches/i, { step:"Move it slowly to where it first begins to resist, hold it there while you count to ten, then let it go slowly.", avoid:"You should never be pushing hard. If you're using effort, you've gone too far." }],
  [/neck (side-bend|rotation) stretch/i, { set:"Lay your baby on their back and steady their chest and shoulder with one hand so they can't twist away from the stretch.", step:"With your other hand, guide their head slowly to the end of the easy range — ear towards the shoulder, or chin towards the shoulder — and hold it there while you count to ten.", avoid:"Never force it, and never do it if they're fighting you. Sing to them, and do it at nappy changes so it becomes routine rather than a battle." }],
  [/walking practice|marching game|backward-walking game/i, { set:"Pick a clear, flat run with something soft to land on.", step:"Walk it with them rather than calling them to you — copying beats instructing at this age.", avoid:"Don't hold both hands above their head. Stay beside them and let them wobble; wobbling is how balance gets built." }],
  [/stair climbing with a rail|stair descent|stairs with alternating feet/i, { set:"Use a real staircase with a rail, and stay BELOW them — on the way up and on the way down.", step:"Start with both feet landing on each step. Alternating feet comes later, usually around three or four.", avoid:"Never let them practise stairs unsupervised, and put the gate back afterwards." }],
  [/kicking a (large|moving) ball/i, { set:"Use a big, light, slow ball. A football is too fast and too hard at this stage.", step:"Have them stand near a wall or hold your hand at first — kicking is a one-legged balance task before it's a kicking task.", avoid:"Don't line up a row of kicks with the same leg. Swap sides." }],
  [/catching a (large|smaller) ball|throwing (a ball overhand|at a target)/i, { set:"Start with a large, soft ball and stand close — a metre or two.", step:"Throw it gently to their chest, arms out ready. Step back a little only once they're catching most of them.", avoid:"Don't throw it hard or fast to 'challenge' them. Missing repeatedly just teaches them they can't catch." }],
  [/two-foot jumping|jumping (over a line|down from a low step|off a low step)/i, { set:"Find a soft, flat surface — grass, a mat, carpet. Not a hard floor.", step:"Ask for a quiet landing. 'Land like a cat, not like an elephant' does more for their knees than any instruction about technique.", avoid:"Small numbers, often. Jumping is high-impact, so stop before they get tired and sloppy." }],
  [/hopping on one foot/i,           { set:"Stand beside them within reach, near a wall they can touch.", step:"Let them hold your hand or the wall for the first few. Take the support away one finger at a time.", avoid:"Both legs get a turn. Children will happily do fifty on their good side and none on the other." }],
  [/skipping practice|galloping/i,   { set:"Give them a long clear run — a hallway, a garden, a hall.", step:"Break it up: gallop first (same foot always leading), then swap the lead foot, then put the two together. Skipping is two gallops stitched together.", avoid:"Don't expect it before about five. It's one of the last basic skills to arrive, and pushing it early just frustrates everyone." }],
  [/heel-to-toe walk|balance-beam walk|walking along a line|stepping-stones/i, { set:"Use a line of tape on the floor, a plank on the grass, or the cracks in the pavement.", step:"Give them a spot on the wall ahead to look at. Looking at their feet is what makes them fall off.", avoid:"Stay alongside with a hand ready. Height adds nothing to the exercise but adds a lot to the fall." }],
  [/bear-?(crawl|walk)|crab-?walk|frog jump|bunny hop|wheelbarrow walk|animal walk/i, { set:"Clear a stretch of floor and do it alongside them — badly, ideally. Being funnier than them keeps them going.", step:"Name the animal and make the noise. The sillier it is, the more repetitions you'll get out of them.", avoid:"Short bursts. These are harder than they look, and small arms tire fast." }],
  [/tricycle|balance bike|push-along balance bike/i, { set:"Set the seat low enough that both feet sit flat on the ground.", step:"Let them walk it along first, then coast with their feet up for longer and longer. Pedals come after balance, not before it.", avoid:"Helmet on. And skip the stabilisers — they teach leaning the wrong way and have to be unlearned." }],
  [/obstacle course|crawling through a tunnel|freeze-dance/i, { set:"Build it out of sofa cushions, chairs, boxes and washing baskets. It does not need to be equipment.", step:"Let them lead it, and change one thing each time so it stays interesting.", avoid:"Check the run for hard edges and corners before they start, not after." }],
  [/beanbag balance/i,               { set:"Use a beanbag, a soft toy, or a folded flannel — anything that won't roll off.", step:"Standing still first, then a few steps, then along a line. Adding the walk is what makes it hard.", avoid:"If they're tipping their head back to balance it, it's too heavy. Use something lighter." }],
  [/hopscotch/i,                     { set:"Chalk it on the path, or tape it on the floor.", step:"Two feet in the double squares, one foot in the singles. Slow and correct beats fast and hopping everywhere.", avoid:"On a hard surface, keep the numbers down — it's a lot of small impacts." }],
  [/sit-to-stand (from a small chair|races)/i, { set:"Use a chair or step low enough that their feet reach the floor flat.", step:"Ask them to fold forward — 'nose over toes' — before they stand. That's what gets them up without pulling on the furniture.", avoid:"Don't let them push up off the arms if the point is their legs." }],
  [/wall push-ups as a game|superhero prone hold|bridge 'tunnel' hold/i, { set:"Give it a story — pushing the wall over, flying like a superhero, making a tunnel for a toy car to go under.", step:"Count out loud together, and stop the count while they're still holding it well.", avoid:"Five good seconds beats twenty sagging ones. Stop when the shape goes." }],
  [/tiptoe walking game|heel walking game/i, { set:"Pick a short run, and go alongside them doing it too.", step:"Give it a reason — being as tall as a giraffe, walking on hot sand. A reason gets you the length of the hallway; an instruction gets you three steps.", avoid:"If your child ALWAYS walks on their toes and can't put their heels down, mention it to your team — that's different from playing at it." }],
  [/side-lying positioning/i,        { set:"Lay them on their side with a rolled towel behind their back to stop them rolling flat.", step:"Bring both hands together in front of their face where they can see them. Swap sides each time so one side doesn't get all the practice.", avoid:"For play only, while you're watching. Sleep is always flat on the back." }],
  [/hands-to-midline play|banging and transferring toys|grasp-and-release play/i, { set:"Hold a toy right in the middle, level with their chest, about a forearm away.", step:"Wait. Give them time to bring both hands to it — getting the hands together in the middle is the skill you're after, not grabbing it fastest.", avoid:"Don't put the toy in their hand for them. The reach is the exercise." }],
  [/visual tracking in midline/i,    { set:"Hold a high-contrast toy — black and white, or a face — about 25cm from their eyes.", step:"Move it slowly side to side and let their eyes and head follow. Slower than feels natural to you is about right.", avoid:"Stop if they look away or get glassy. Turning away is how a newborn says they've had enough." }],
  [/supported upright holding|head control/i, { set:"Hold them upright against your chest with one hand spread across their upper back and the other ready at their head.", step:"Let their head take its own weight for a few seconds at a time, catching it when it drops.", avoid:"A newborn's head is heavy and their neck is weak. Never leave it unsupported for more than a moment." }],
  [/positioning to encourage turning to the tight side/i, { set:"Work out which way is hard for them, then set the room up so everything interesting is on that side.", step:"Put the cot so the door is on their tight side, feed on the side that makes them turn that way, and talk to them from there.", avoid:"This one isn't a session — it's how you arrange the whole day. That's what makes it work." }],
  [/carrying and handling in midline/i, { set:"Carry them with their head in line with their body rather than tipped to one side.", step:"Swap the arm you carry them on. Most of us have a favourite, and a baby carried the same way all day gets a favourite too.", avoid:"Long stretches in a car seat or bouncer hold them in one shape. Break it up with floor time." }],
  [/prop-on-(forearms|hands)/i,      { set:"On their front, draw their elbows forward so they sit under or just ahead of their shoulders.", step:"Put a rolled towel under their chest, with their arms over the top, if their face keeps dropping to the floor. Take it away as they get stronger.", avoid:"If they're grinding their face into the mat, it's too hard — go back to your chest or a towel roll." }],
  [/kicking play in lying|bringing feet to hands/i, { set:"Lay them on their back with a nappy off if you can, and something to kick at — a cushion, your hands, a play-gym bar.", step:"Give them something to push against. Kicking at nothing is boring; kicking something that moves or rattles gets fifty more kicks.", avoid:"Nothing here should be forced. You're inviting the kick, not doing it for them." }],
  [/supported standing at a low table|independent standing balance/i, { set:"Stand them at a solid, low surface with toys spread across it, and stay behind them.", step:"Let them use the surface less and less — two hands, then one, then a fingertip, then a moment with none.", avoid:"Check the surface can't tip or slide. Bare feet grip better than socks on a wooden floor." }],
  [/transitions from sitting to crawling|weight-shift in sitting|sitting rotation reach|reaching across the midline in sitting/i, { set:"Sit them on the floor with toys placed off to each side and slightly behind.", step:"Place the toy so they must turn and prop on one hand to get it. That twist-and-prop is exactly the move that becomes crawling.", avoid:"Alternate the side you put it on, or you'll build one very good half." }],
  [/squat-to-stand from the floor|squatting to play|pick up a toy/i, { set:"Scatter toys on the floor and put the box to post them in up on a low table.", step:"Let them squat down to collect and stand up to post. They'll do thirty squats and call it tidying up.", avoid:"Nothing to correct here. However they get up and down is fine at this age." }],
  [/bear-walk on hands and feet/i,   { set:"Clear a short stretch of floor.", step:"Hands and feet down, bottom in the air, and walk. Do it next to them — badly.", avoid:"A metre or two at a time. It's much harder than it looks." }],
  [/pushing a stable walker toy|toy trolley/i, { set:"Use something weighted enough that it won't shoot away — a sturdy walker, or a box with books in it.", step:"Load it heavier if it runs away from them, lighter if they can't shift it. That weight is the setting you're adjusting.", avoid:"Not on a slope, and not on a rug that can rumple up in front of it." }],
  /* ⚠ NOT a bare /climbing/ — that matched 24 adult "Machine stair climbing" entries and
     told a grown-up on a stair machine to stay within catching distance. */
  [/climbing on low playground equipment/i, { set:"Choose low equipment with a soft surface underneath, and stay within catching distance.", step:"Let them work out the route themselves. Climbing is a problem to solve, and solving it is most of the benefit.",  avoid:"Don't lift them onto anything they couldn't climb up by themselves — if they can't get up, they can't get down." }],
  [/running practice|dancing and music/i, { set:"Somewhere open with a soft surface and nothing to run into.", step:"Chase them, or put music on and be sillier than they are. Neither of these needs instructions.", avoid:"Watch for tiredness — a tired toddler trips." }],
  [/standing on one foot/i,          { set:"Beside a wall or your hand, on a firm floor.", step:"Give them something to do while they're up there — 'be a flamingo', 'can you count to five?'. Counting keeps them still much longer than balancing does.", avoid:"Both sides, every time." }],
  [/star jumps|jump-and-freeze/i,    { set:"A soft, flat surface with space to swing their arms.", step:"Arms and legs out together, then back in together. Getting the arms and legs to agree is the actual skill — it takes a while.", avoid:"Small sets. Land soft." }],
  [/rolling a ball (back and forth|under the foot)/i, { set:"Sit facing each other with legs apart, or sit them down with the ball under one foot.", step:"Roll it slowly and name what's happening — 'ready… go!'. The waiting and the turn-taking matter as much as the rolling.", avoid:"Use a ball big enough that it can't be swallowed and slow enough to be caught." }],
  [/stacking and reaching up high|bubble-popping/i, { set:"Put the interesting thing just above their comfortable reach, so they have to stretch or come up on their toes.", step:"Height is the dial you're turning. Higher makes them reach, stretch and balance; lower just makes it easy.", avoid:"Nothing they can pull down onto themselves." }],
  [/pulling socks on and off|carrying a light object while walking/i, { set:"Build it into the day — getting dressed, carrying their cup to the table.", step:"Give them the last step first: pull the sock off from the heel, carry the cup the last metre. Then hand them more of it as they get better.", avoid:"Allow far more time than it takes you to do it. Rushing is what makes everyone give up on this one." }],
  [/stepping over small obstacles/i, { set:"Lay out a line of soft, low things — cushions, rolled towels, pool noodles.", step:"High enough that they have to lift a knee, low enough that landing on one doesn't hurt.", avoid:"Nothing hard or rolling. Books and toy cars are how this goes wrong." }],

  /* ---- Movements no PATTERN describes honestly. ----------------------------
     Forcing these into the nearest pattern is worse than leaving them generic: a clamshell
     told to "push your bottom back towards the wall" (hinge) or an A-skip told to "slow down
     under control before each turn" (agility) is confidently wrong, and confidently wrong is
     the one thing an instruction must never be. They get named steps instead. */
  [/clamshell/i,                     { set:"Lie on your side with your knees bent to about 45 degrees, one hip stacked directly over the other, and your head resting on your arm.", step:"Keep your feet touching and lift your top knee towards the ceiling, like a clam opening. Your hips must NOT roll backwards — that's the whole exercise.", avoid:"If your top hip rolls back, you've gone too far. Rest your back against a wall to feel it, and lift less." }],
  [/short-foot/i,                    { set:"Sit with your foot flat on the floor, knee over your ankle.", step:"Without curling your toes, pull the ball of your foot gently back towards your heel so the arch lifts a little. It's a small movement — a few millimetres.", avoid:"Toes stay flat and relaxed. If they're clawing, you're using the wrong muscles — ease off until they settle." }],
  [/wall angel/i,                    { set:"Stand with your back against a wall, feet a little way out from it, with your lower back, upper back and head touching.", step:"Put your arms up against the wall in a goalpost shape, then slide them up and back down while keeping your wrists, elbows and back in contact.", avoid:"Only go as high as you can without your back arching away from the wall. Most people manage far less than they expect, and that's the point." }],
  [/\ba-skip\b|\bb-skip\b/i,         { set:"Find 20 metres of clear, flat ground.", step:"Skip forward driving one knee up to hip height, with the opposite arm forward, then land under your hips on the ball of your foot.", avoid:"This is a rhythm drill, not a race. If you're reaching your foot out in front of you, slow right down." }],
  [/sprint mechanics/i,              { set:"Warm up thoroughly first — this is fast work, even at 70–80%.", step:"Run tall with your hips high, driving your knees forward and your foot down underneath you rather than out in front.", avoid:"Submaximal means submaximal. If you're straining, you've stopped practising technique and started racing." }],
  [/neuromuscular warm-up|11\+ style/i, { set:"Do it before sport, not after — it replaces your warm-up rather than adding to it.", step:"Work through the blocks in order: easy running, then balance and single-leg control, then landing and cutting, then a few faster runs to finish.", avoid:"Skipping it on match days is how it stops working. The programmes that cut injuries are the ones done twice a week, every week." }]
];
function explainVariants(name){
  const out = { set:[], steps:[], avoid:[] };
  for(const [re, v] of VARIANT_HOWTO){
    if(!re.test(name||"")) continue;
    if(v.set) out.set.push(v.set);
    if(v.step) out.steps.push(v.step);
    if(v.avoid) out.avoid.push(v.avoid);
    if(out.steps.length >= 3) break;          // keep it readable
  }
  return out;
}

/* Modifiers — the generator appends these after " — ", and each one exists to
   change HOW you execute. They override the pattern's tempo where they conflict. */
const MOD_HOWTO = [
  [/slow-tempo \(3s eccentric\)|slow eccentric|3s eccentric/i,
   { step:"Take a full 3 seconds on the lowering (lengthening) half of every rep — count it out loud; almost everyone rushes this.",
     tempo:"Lower for a counted 3 seconds, then return at a normal pace. The slow lower is the entire reason this version exists.",
     avoid:"Don't shorten the lower to squeeze out more reps — fewer, slower reps beat more, faster ones here." }],
  [/with 2s pause|2s pause|\bpaused\b/i,
   { step:"Stop dead for 2 full seconds at the hardest point of the rep, staying tight — don't relax into the position.",
     tempo:"Lower under control, hold 2 seconds, then drive back. Breathe normally through the pause rather than holding your breath.",
     avoid:"The pause removes the bounce, so expect to need noticeably less weight." }],
  [/\bpartial-range\b/i,
   { step:"Work only the part of the range that's comfortable today, and stop short of the painful end.",
     avoid:"This is a stepping stone, not the destination — add range back as symptoms allow." }],
  [/\bfull-range\b/i,
   { step:"Use the largest range you can control with good form — all the way to the end and all the way back.",
     avoid:"Range you can't control isn't range. Reduce the load before you reduce the range." }],
  [/on unstable surface/i,
   { step:"Perform it on a cushion, folded mat or wobble pad. Expect it to feel harder and wobblier for the same load.",
     avoid:"Have something sturdy within arm's reach, and skip this version entirely if your balance is already a concern." }],
  [/banded \(accommodating\)/i,
   { step:"Add a band so resistance rises as you move — easiest where you're weakest, hardest where you're strongest.",
     tempo:"Control the return especially — the band wants to snap you back." }],
  [/\bunilateral\b/i,
   { step:"One side at a time. Do your weaker or injured side FIRST, and let it set the number of reps the other side gets.",
     avoid:"Don't let your trunk twist or dip toward the working side to help." }],
  [/with isometric hold/i,
   { step:"Add a hold at the hardest position — squeeze and keep breathing rather than bracing against a held breath.",
     tempo:"Hold for the prescribed count, keeping the effort constant rather than letting it fade." }]
];
function explainMods(name){
  const out = { steps:[], avoid:[], tempo:null };
  for(const [re, m] of MOD_HOWTO){
    if(!re.test(name||"")) continue;
    if(m.step) out.steps.push(m.step);
    if(m.avoid) out.avoid.push(m.avoid);
    if(m.tempo && !out.tempo) out.tempo = m.tempo;   // first modifier wins the tempo line
  }
  return out;
}
function movementExplain(name, pattern, regionArr){
  const p = pattern || inferPattern(name);
  const info = PATTERN_INFO[p] || PATTERN_INFO.general;
  const ht = PATTERN_HOWTO[p] || PATTERN_HOWTO.general;
  /* One phrasing per pattern meant every squat opened and closed with the same two
     sentences. Vary by a hash of the NAME (stable across re-renders), then add the
     clauses that describe THIS variant. */
  const sc = specClauses(name, p);
  const eqWhat = (() => {
    for(const k of Object.keys(WHAT_EQUIP))
      if(new RegExp("^" + reEsc(k) + "\\b", "i").test(name||"")) return WHAT_EQUIP[k];
    return ""; })();
  const whatBits = [eqWhat, ...sc.what].filter(Boolean);
  const whatBase = pickAlt(name, WHAT_ALT[p] || [info.what]);
  /* Several base phrasings already contain an em-dash, so appending " — clause" gave
     "a held position — tension without motion — with a static hold added". Use a
     separate sentence instead of a second dash. */
  const whatLine = whatBits.length
    ? whatBase + " This version is " + whatBits.join(", ") + "."
    : whatBase;
  const whyBase = pickAlt(name, WHY_ALT[p] || [info.why]);
  const whyLine = [whyBase, ...sc.why.slice(0, 2)].join(" ");
  const skip = new Set(["Full body","Cardio","Balance","Gait","Vestibular","Breathing","Core","Grip"]);
  const regs = (regionArr||[]).filter(r=>!skip.has(r));
  /* "the knee, hip" reads like a stub. This line appears on every explanation. */
  const listOf = a => a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const target = regs.length ? ` It mainly works the ${listOf(regs).toLowerCase()}.` : "";
  const notes = movementNotes(name);
  /* Layer the name's own detail over the pattern text: the implement, the named
     variant, then the modifier — so a "Barbell box squat — with 2s pause" no
     longer reads exactly like a bare "Squat". */
  const eq = explainEquip(name), vr = explainVariants(name), md = explainMods(name);
  /* A paediatric pattern names the AGE BAND, not the movement — "ped_train" is thirty
     different exercises. So its steps say how to COACH a child through a set, and on their
     own they left "Bodyweight squat (technique)" without a word about how to squat. The
     name still knows: infer the movement pattern from it and put those mechanics first,
     with the band's coaching after. Only when the name resolves to a real movement —
     "Tummy time" infers nothing, and rightly keeps the milestone steps alone. */
  /* ⚠ ONLY the two older bands. A school-age child doing "Bodyweight squat (technique)" needs
     the squat's actual mechanics, and the band's steps only say how to coach a set. But a
     baby's "Neck side-bend stretch" is NOT an adult mobility drill with a smaller person
     attached: merging both gave ten steps, half of them near-duplicates, in two different
     voices — telling a parent to "ease to the first point of gentle stretch" AND to "support
     the limb with your whole hand". For handling/milestone/play/skill the band's steps are
     already the right instructions, in the right voice, to the right reader. */
  let mech = [];
  if(/^ped_(train|strength)$/.test(p)){
    const mp = inferPattern(name);
    if(mp && mp !== "general" && !/^ped_/.test(mp) && PATTERN_HOWTO[mp]) mech = PATTERN_HOWTO[mp].steps || [];
  }
  /* push/pull are the right CATEGORY for a hamstring curl or a hip abduction and the wrong
     INSTRUCTIONS — see the note on those entries. The region already tells us which body
     part is working, so use it. */
  const legOnly = isLowerLimbOnly(regionArr);
  const htSteps = (legOnly && ht.legSteps) ? ht.legSteps : (ht.steps || []);
  const htAvoid = (legOnly && ht.legAvoid) ? ht.legAvoid : ht.avoid;
  const setup = [ht.setup, eq && eq.set, ...vr.set].filter(Boolean).join(" ");
  /* When the mechanics lead, the band contributes coaching rather than a second set of
     instructions — two is enough, and it keeps the list at a length someone will read. */
  const bandSteps = mech.length ? htSteps.slice(0, 2) : htSteps;
  const steps = [`<b>Set up —</b> ${setup}`]
    .concat(mech, bandSteps, vr.steps, md.steps).slice(0, 9);
  const stepHTML = `<ol class="howsteps">${steps.map(s=>`<li>${s}</li>`).join("")}</ol>`;
  const tempo = md.tempo || ht.tempo;                       // a modifier's tempo overrides the pattern's
  const avoid = [htAvoid, eq && eq.avoid, ...vr.avoid, ...md.avoid].filter(Boolean).join(" ");
  const meta = [
    tempo ? `<div class="howmeta"><b>⏱ Tempo &amp; breathing:</b> ${tempo}</div>` : "",
    avoid ? `<div class="howmeta howavoid"><b>⚠ Avoid:</b> ${avoid}</div>` : "",
    notes ? `<div class="howmeta"><b>Note:</b> ${notes}</div>` : ""
  ].join("");
  /* ⚠ SECURITY INVARIANT: every fragment interpolated below (steps/tempo/avoid/notes/whatLine/
     whyLine) is a FIXED internal string selected by matching the exercise `name`; the raw name is
     never echoed into the HTML. If a helper is ever changed to echo a matched substring of the
     name, esc() it there — the name can be a custom/clinician-supplied value. */
  return `<b>What it is:</b> ${whatLine}${target}`
    + `<div class="howhead"><b>How to do it</b></div>${stepHTML}${meta}`
    + `<div class="howwhy"><b>Why it helps:</b> ${whyLine}</div>`
    + videoLinkHTML(name, p);
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
    <div class="top"><span class="en">${e.custom?`<span class="custompill">✎ yours</span> `:""}${e.home?`<span class="homepill">🏠 home</span> `:""}${e.adl?`<span class="adlpill">🧩 daily-living</span> `:""}${e.sport?`<span class="sportpill">🏅 sport</span> `:""}${e.sig?`<span class="sigpill">🎯 key</span> `:""}${esc(e.n)}</span><span class="ed">${esc(e.d)}</span></div>
    <div class="ec">${esc(e.c)}</div>
    ${e.adl&&e.adlFor?`<div class="adlbuild">🧩 <b>Builds toward:</b> ${esc(e.adlFor)}</div>`:""}
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
  const open = ph.classList.contains("open");
  if(open) openPhases.add(key); else openPhases.delete(key);
  head.setAttribute("aria-expanded", open ? "true" : "false");
}
/* Keyboard parity for the role=button phase headers: Enter/Space toggle, like a click. */
function phaseHeadKey(ev, head, key){
  if(ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar"){ ev.preventDefault(); togglePhase(head, key); }
}
/* Collapsible card (auto-collapsed by default). `openCards` remembers, within
   the session, which ones the user expanded so re-renders don't re-close them. */
const openCards = new Set();
/* Which Lab-Values domains are expanded — they collapse so the Health step isn't one
   giant scroll. Seeded to the first domain on first render, then user-controlled. */
const openLabDomains = new Set();
let labsSeeded = false;
function collapsibleCard(id, cls, titleHTML, bodyHTML, badgeHTML){
  const open = openCards.has(id) ? " open" : "";
  return `<details class="card ${cls} collapsecard" data-card="${esc(id)}"${open}>
    <summary class="collapsesum"><h2>${titleHTML}</h2>${badgeHTML||""}<span class="collapsehint">Expand</span><span class="collapsechev" aria-hidden="true">▾</span></summary>
    <div class="collapsebody">${bodyHTML}</div>
  </details>`;
}
function wireProgram(){
  // auto-collapsed cards (Safety notes, Vitals) — remember expand state across re-renders
  $$("#programOut details.collapsecard").forEach(d=>d.addEventListener("toggle",()=>{
    if(d.open) openCards.add(d.dataset.card); else openCards.delete(d.dataset.card);
  }));
  $$("#programOut .planvar").forEach(b=>b.onclick=()=>setPlanVariant(b.dataset.plan, b.dataset.v));
  $$("#programOut .progchk").forEach(b=>b.onchange=()=>setCriteriaMet(b.dataset.plan, +b.dataset.i, b.checked));
  // OBJ-1 objective gates: measurable pairs (affected/other), tick gates, and the advance button
  $$("#programOut .gateinputs input[data-side]").forEach(inp=>inp.onchange=()=>{
    const box = inp.closest(".gateinputs");
    logMeasure(inp.dataset.measure, box.querySelector('input[data-side="aff"]').value, box.querySelector('input[data-side="oth"]').value);
  });
  $$("#programOut .gatetick input[data-measure]").forEach(inp=>inp.onchange=()=>logMeasure(inp.dataset.measure, inp.checked?1:0, 1));
  $$("#programOut .advancebtn").forEach(b=>b.onclick=()=>advancePhaseIfReady(b.dataset.advance, +b.dataset.phase));
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
  // (the medication-filter toggle was removed — high-risk med precautions now apply automatically
  //  at build time via gatherFlags(), like every other contraindication.)
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
        opts.map((o,oi)=>{ const d=disp(o); return `<div class="swapopt" role="option" tabindex="0" data-oi="${oi}"><span class="en">${d.home?"🏠 ":""}${esc(d.n)}</span><span class="ed">${esc(d.d)}</span>${o.warn?`<span class="exwarn">⚠ modify</span>`:""}</div>`; }).join("");
      box.querySelectorAll(".swapopt").forEach(op=>{
        op.onclick=()=>{
          openPhases.add(ci+"-"+pi);
          state.program.items[ci].phases[pi].ex[ei] = opts[+op.dataset.oi];
          save(); renderProgram(state.program); toast("Exercise swapped.");
        };
        op.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); op.click(); } };
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
/* ---------------------------------------------------------------------
   ONE user gate for every exercise surface.
   The library had drifted from the add-picker: it skipped nameAllowed(), the
   aquatic gate and the paediatric gate, and scored with gatherFlags() instead
   of activeFlags() (which is base flags UNION medication flags). So a
   non-weight-bearing user who ticked "Respect my precautions" was still shown
   the standing and loaded work the generator had removed by name, aquatic work
   appeared before the water-confidence question was answered, and opting into
   medication filtering changed the program but not the library.
   Both callers now share this, so they cannot drift apart again.
   --------------------------------------------------------------------- */
function userGateCtx(){ return { allowAqua: aquaticAllowed(), age: userAgeYears() }; }
function exPassesUserGates(e, ctx){
  if(!ctx.allowAqua && isAquaticEx(e)) return false;     // withhold aquatic until water confidence is set
  if(!exAgeOk(e, ctx.age)) return false;                 // both ways: no play moves for adults, no barbells for children
  return nameAllowed(e.name);                            // device / weight-bearing name restrictions
}
/* File order is 2,086 squat variants first, so an unfiltered library opened on 80 squats and
   looked broken. Round-robin across movement patterns instead — same set, visible variety. */
function diversify(list){
  const by = new Map();
  for(const e of list){ const k = e.pattern || "other"; if(!by.has(k)) by.set(k, []); by.get(k).push(e); }
  const keys = [...by.keys()], out = [];
  for(let i = 0; ; i++){
    let added = false;
    for(const k of keys){ const arr = by.get(k); if(i < arr.length){ out.push(arr[i]); added = true; } }
    if(!added) break;
  }
  return out;
}
function searchLibraryForAdd(q, exclude){
  if(!window.EXERCISES) return [];
  const toks = q.toLowerCase().split(/\s+/).filter(Boolean); if(!toks.length) return [];
  const exSet = new Set((exclude||[]).map(n=>n.toLowerCase()));
  const matched = [];
  const _gate = userGateCtx();
  for(let i=0;i<window.EXERCISES.length && matched.length<80;i++){
    const e = window.EXERCISES[i];
    if(exSet.has(e.name.toLowerCase())) continue;
    if(!exPassesUserGates(e, _gate)) continue;    // shared with the library — see exPassesUserGates
    const hay = exHay(e);
    if(toks.every(t=>hay.includes(t))) matched.push(e);
  }
  let { kept } = window.applyContra(matched, activeFlags());     // drop contraindicated, mark cautioned
  return kept.slice(0,30).map(e=>({ n:e.name, d:e.dose, c:e.cue, warn:e.warn, pattern:e.pattern, region:e.region, tags:e.tags }));
}
function wireAddExercise(box, ci, pi){
  const item = state.program.items[ci], ph = item.phases[pi];
  const resultsEl = box.querySelector(".addexresults");
  const suggest = () => libraryOptions(item.protocol, pi, activeFlags(), ph.ex.map(x=>x.n), 12, ph._addseed||0);
  let curOpts = [];
  const draw = (opts, prefix) => {
    curOpts = opts;
    resultsEl.innerHTML = (prefix||"") + addExOptsHTML(opts);
    resultsEl.querySelectorAll(".addexopt").forEach(op=>op.onclick=()=>addExerciseToPhase(ci, pi, curOpts[+op.dataset.oi]));
  };
  draw(suggest());
  const search = box.querySelector(".addexsearch");
  let t;
  search.oninput = () => { clearTimeout(t); t=setTimeout(()=>{
    const q = search.value.trim();
    // hint if someone looks for pool work before telling us their water confidence
    const aquaHint = (q && !aquaticAllowed() && /pool|aqua|water|hydro|swim/i.test(q))
      ? `<div class="addexhint">💧 Pool / aquatic exercises stay hidden until you set <b>Confidence in water</b> in the History step — add it there and they'll appear here and in your program.</div>` : "";
    draw(q ? searchLibraryForAdd(q, ph.ex.map(x=>x.n)) : suggest(), aquaHint);
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
  const del = (idx!=null) ? `<button type="button" class="precdel no-print" data-idx="${idx}" aria-label="Remove">✕</button>` : "";
  const mine = (idx!=null) ? `<span class="precmine">yours</span> ` : "";
  return `<li class="precrow ${cls}"><span class="prec-t">${mine}${esc(t)}</span><span class="prec-w">${label}</span>${del}</li>`;
}

/* Precautions & reminders card: surgical precautions (if any) + user's own reminders. */
/* ---------- weight-bearing suggested by the real protocol ----------
   The weight-bearing order was a free choice, disconnected from what the plan
   already knows about the procedure. These are the standard orders for known
   procedures, gated by weeks post-op so the suggestion changes as you heal.
   Suggestion only — the operating surgeon's order always wins. */
const WB_PROTOCOL = [
  { re:/charcot (foot|joint|arthropath|neuroarthropath)/, from:0, to:99, status:"nwb",
    why:"An active Charcot foot must be completely offloaded — neuropathy means pain never warns you, and every step destroys more of the joint." },
  { re:/femoral neck stress|navicular stress|talus fracture|scaphoid fracture/, from:0, to:8, status:"nwb",
    why:"This is a high-risk site with a real non-union or displacement risk — these are protected until a specialist confirms healing." },
  { re:/achilles (tendon )?(rupture|tear|repair)/, from:0, to:2, status:"nwb",
    why:"The healing tendon is protected in a boot before graded loading starts." },
  { re:/(ankle|tibial plateau|calcaneus|calcaneal|pilon|lisfranc|midfoot) fracture|fracture fixation|\borif\b/, from:0, to:6, status:"nwb",
    why:"Metalwork holds the position but does NOT make the bone strong — loading before union can bend or break the fixation." },
  { re:/meniscus repair|meniscal repair|meniscus root/, from:0, to:4, status:"pwb",
    why:"A repaired meniscus has a poor blood supply and is protected early — most surgeons restrict weight-bearing and flexion for about 4 weeks." },
  { re:/tibial tub(ercle|erosity) (transfer|osteotomy)|fulkerson|elmslie|trochleoplast/, from:0, to:6, status:"pwb",
    why:"The bone fragment is held by screws until it unites — loading early risks fracturing straight through the osteotomy." },
  { re:/osteotomy|high tibial osteotomy|\bhto\b/, from:0, to:6, status:"pwb",
    why:"The bone cut has to unite before it takes full load, or the correction is lost." },
  { re:/limb lengthening|external fixation|ilizarov|bone transport/, from:0, to:99, status:"pwb",
    why:"Loading follows the new bone forming in the gap, not comfort — your surgeon sets the exact amount." },
  { re:/fasciotomy|acute compartment/, from:0, to:4, status:"pwb",
    why:"Weight-bearing follows your surgeon while the fasciotomy wounds close." },
  { re:/knee replacement|hip replacement|\btkr\b|\btka\b|\bthr\b|\btha\b|hemiarthroplasty/, from:0, to:12, status:"wbat",
    why:"Modern replacements are designed to be walked on straight away — weight-bearing as tolerated, using your aid until you're steady." },
  { re:/\bacl\b|mpfl reconstruction|\bmcl\b|patellar (dislocat|instab)/, from:0, to:6, status:"wbat",
    why:"Weight-bearing as tolerated in the brace is standard here — getting full extension and quad control back matters more than offloading." },
  { re:/ankle sprain|brostr|lateral ligament/, from:0, to:2, status:"wbat",
    why:"Early protected weight-bearing beats rest for ankle ligaments — walk within comfort in your brace or boot." }
];
function suggestedWeightBearing(){
  const conds = selectedConditions();
  const hay = (conds.map(c=>c.name).join(" ") + " " + ((detectSurgery()||{}).name||"")).toLowerCase();
  if(!hay.trim()) return null;
  const w = weeksPostOp();
  const wk = Number(w != null ? w : state.weeks);
  for(const r of WB_PROTOCOL){
    if(!r.re.test(hay)) continue;
    if(isFinite(wk) && (wk < r.from || wk >= r.to)) continue;
    if((state.weightBearing||{}).status === r.status) return null;   // already matches
    return { status:r.status, why:r.why, window:`weeks ${r.from}–${r.to===99?"until cleared":r.to}` };
  }
  return null;
}
function suggestedWbHTML(){
  const s = suggestedWeightBearing(); if(!s) return "";
  const label = (WB_STATUS[s.status]||{}).label || s.status;   // WB_STATUS is a map, not an array
  return `<div class="wbsugg no-print">
    <div class="wbsugg-h">💡 <b>Typical for your procedure:</b> ${esc(label)} <span class="wbsugg-win">(${esc(s.window)})</span></div>
    <div class="wbsugg-why">${esc(s.why)}</div>
    <button type="button" class="wbsuggset" data-wb="${esc(s.status)}">Set this order</button>
    <span class="wbsugg-note">Your surgeon's actual order always overrides this.</span>
  </div>`;
}
/* ---------- suggested assistive devices ----------
   Reasons from the diagnosis/procedure AND the medical history the user already
   gave us (weight-bearing order, falls, walking aid, age, bone health, foot
   sensation), and gives the PARAMETER that matters for each device — a device
   set up wrong is worse than none. Suggestions only; one tap adds them to the
   real device list (state.devices), and anything already added is skipped. */
function suggestDevices(){
  const conds = selectedConditions();
  const hay = (conds.map(c=>`${c.name} ${c.region}`).join(" ") + " " + ((detectSurgery()||{}).name||"")).toLowerCase();
  const flags = new Set(gatherFlags());
  const wb = (state.weightBearing||{}).status || "";
  const age = Number(state.age)||0;
  const falls = state.falls, aid = state.aid;
  const out = [];
  const has = (n) => (state.devices||[]).some(d=>d.name.toLowerCase()===n.toLowerCase());
  // dedupe against BOTH the already-added devices and this suggestion list —
  // several rules legitimately suggest the same aid (e.g. non-weight-bearing AND
  // a falls history both want a rollator).
  const add = (name, why, param) => {
    if(has(name) || out.some(o=>o.name.toLowerCase()===name.toLowerCase())) return;
    out.push({ name, why, param });
  };

  // --- weight-bearing order drives the mobility aid ---
  if(wb==="nwb"){
    add("Crutches (axillary or forearm)","You're non-weight-bearing, so you need to keep all load off that leg.",
        "Set the height so there's ~2–3 finger-widths between the armpit and the pad and the elbow bends ~15–30° — take the weight through your HANDS, not your armpits (leaning on them can bruise the nerves).");
    if(age>=70 || falls==="2" || flags.has("balance_risk"))
      add("Wheeled walker / rollator with a seat","Non-weight-bearing on crutches is very demanding — with your falls/balance history, a frame is usually safer.",
          "Set the handles at wrist-crease height with the elbows slightly bent. Choose one with a seat so you can rest before you tire.");
    add("Wheelchair (short-term)","Useful for longer distances while you're non-weight-bearing.","Only for distance — keep using your prescribed aid short-range so you don't decondition.");
  } else if(wb==="ttwb" || wb==="pwb" || wb==="ffwb"){
    add("Crutches (forearm preferred)","You have a partial weight-bearing order to respect.",
        "Elbows bent ~15–30°. Practise the amount of weight on bathroom scales — most people badly overestimate how little they're putting through the leg.");
  } else if(wb==="wbat" && (age>=70 || falls==="2")){
    add("Walking stick / cane","Weight-bearing as tolerated, but your history suggests you'd be steadier with support.",
        "Hold it in the OPPOSITE hand to the sore leg, top of the handle level with your wrist crease when standing.");
  }
  // --- falls & balance history (independent of any surgery) ---
  if(falls==="2" || (aid && aid!=="none") || flags.has("balance_risk")){
    add("Wheeled walker / rollator with a seat","You've reported two or more falls in the past year — that's the single strongest predictor of another one.",
        "Handles at wrist-crease height. A seat lets you rest before fatigue, which is when falls happen.");
    add("Grab rails (bathroom & stairs)","Most falls happen at home, in the bathroom and on the stairs.","Fitted beside the toilet, in the shower and on both sides of the stairs where possible.");
    add("Non-slip footwear","Slippers and stocking feet are a common, fixable cause of falls.","Supportive, fastened, thin firm sole — not backless slippers.");
  }
  if(falls==="1") add("Walking stick / cane","One fall in the past year is worth taking seriously before there's a second.","Opposite hand to the weaker leg; handle at wrist-crease height.");
  if(age>=70 && (flags.has("osteoporosis") || /osteoporo|osteopeni|fragility|vertebral (compression )?fracture/.test(hay)))
    add("Hip protectors","Your bone health plus falls risk makes a hip fracture the thing worth preventing.","Worn in the pants; only work if worn — including at night if you get up to the toilet.");
  // --- region / diagnosis specific ---
  if(/rotator cuff repair|cuff repair|labral repair|bankart|latarjet|shoulder (stabilis|stabiliz)|pectoralis major (repair|tear|rupture)|proximal biceps|slap repair/.test(hay))
    add("Shoulder sling (± abduction pillow)","Your repair needs the arm supported while the tendon heals to bone.",
        "Worn ~4–6 weeks per your surgeon, including in bed. Take it off several times a day for your prescribed elbow/wrist/hand movement — but do NOT lift the arm actively.");
  if(/\bacl\b|\bpcl\b|\bmcl\b|\blcl\b|mpfl|trochleoplast|tibial tub(ercle|erosity)|patell(a|ar) (dislocat|instab)|knee ligament/.test(hay))
    add("Hinged / ROM knee brace","Your knee needs its range controlled while the repair or graft heals.",
        "Set to exactly the range your surgeon prescribed — locked in extension for walking early. Check it hasn't slipped down the leg; a brace in the wrong place does nothing.");
  if(/ankle sprain|lateral ligament|brostr|syndesmosis|\batfl\b|ankle instab/.test(hay))
    add("Ankle brace / stirrup","Protects the healing ligaments and cuts the risk of rolling it again.",
        "Wear for weight-bearing and any higher-risk activity. Worth using for sport for 6–12 months — it's the cheapest re-injury prevention there is.");
  if(/achilles (rupture|tear|repair)|calcaneal|ankle fracture|lisfranc|midfoot|metatarsal fracture|charcot/.test(hay))
    add("CAM walker boot","Protects the healing tendon/bone while you're on your feet.",
        "Wear for ALL standing and walking; heel wedges exactly as prescribed and weaned only on your surgeon's schedule. Use a shoe balancer/levelling sole on the other foot or you'll get back and hip pain.");
  if(/foot drop|peroneal nerve|common fibular|drop foot|stroke|hemipar|hemipleg/.test(hay))
    add("Ankle-foot orthosis (AFO)","Foot drop makes the toes catch — it's a trip and fall waiting to happen.",
        "Worn in a supportive lace-up shoe. Check the skin daily where it presses, especially if sensation is reduced.");
  if(/trapeziectomy|thumb (cmc|base)|de quervain|skier'?s thumb|gamekeeper|thumb (ucl|sprain)|scaphoid/.test(hay))
    add("Thumb spica splint","Rests the thumb base/scaphoid, which is what actually settles it.",
        "Immobilises the thumb but leaves the fingers free — keep every other joint moving. For scaphoid, wear it exactly as long as directed; this bone has a real non-union risk.");
  if(/mallet finger/.test(hay))
    add("Mallet finger splint","This splint IS the treatment for a mallet finger.",
        "Worn CONTINUOUSLY for 6–8 weeks — if the fingertip is allowed to droop even once while changing it, the clock restarts. Support the tip on a flat surface when you swap it.");
  if(/carpal tunnel|cubital tunnel|ulnar nerve/.test(hay))
    add("Night resting splint","Night symptoms come from the wrist/elbow bending while you sleep.",
        "Wrist splint in NEUTRAL (not extended) for carpal tunnel; for cubital tunnel, a towel or splint stopping the elbow bending past ~45°.");
  if(/lumbar fusion|spinal fusion|\bacdf\b|\btlif\b|\balif\b|vertebral (compression )?fracture|kyphoplast/.test(hay))
    add("Spinal brace (TLSO / lumbar corset)","Only if your surgeon prescribed one — braces are not routine after all spinal surgery.",
        "Wear it exactly when told (often for upright activity only). Follow the no bending/lifting/twisting rule with or without it.");
  if(/cabg|sternotom|open heart|coronary artery bypass|valve (repair|replacement)/.test(hay))
    add("Sternal support (heart pillow / brace)","Bracing the chest when you cough genuinely reduces pain and protects the breastbone.",
        "Hug it firmly against the chest whenever you cough, sneeze or get up. Sternal precautions still apply for ~8 weeks.");
  if(/amputation|disarticulation|residual limb/.test(hay))
    add("Residual-limb shrinker sock","Shaping the limb early is what decides how well a prosthesis fits later.",
        "Worn as directed, wrinkle-free. Check the skin every time it comes off; a mark lasting more than ~20 minutes means it isn't fitting.");
  if(/hip replacement|hip arthroplasty|\bthr\b|\btha\b/.test(hay))
    add("Long-handled reacher & sock aid","Hip precautions stop you bending past 90° — these let you dress without breaking them.",
        "Use with a long shoehorn. Also worth raising the seat/toilet so your hip stays above 90°.");
  if(/knee replacement|\btkr\b|\btka\b/.test(hay))
    add("Raised toilet seat / chair raisers","Getting up from low seats is the hardest thing early after a knee replacement.",
        "Aim for hips slightly above knees when seated. Do NOT put a pillow under the knee — that causes a flexion contracture.");
  if(/limb lengthening|external fixation|ilizarov|frame/.test(hay))
    add("Shoe balancer / levelling sole","A frame or a lengthening limb changes your leg length and throws off your gait.",
        "Levels the other side so you don't develop back and hip pain while the frame is on.");
  return out;
}
function suggestedDevicesCard(){
  const s = suggestDevices();
  if(!s.length) return "";
  return `<div class="devsugg no-print">
    <div class="devsugg-h">🦯 <b>Suggested for you</b> <span class="devsugg-sub">based on your diagnosis and your history — tap to add</span></div>
    ${s.map((d,i)=>`<div class="devsugg-row">
      <div class="devsugg-main"><b>${esc(d.name)}</b> <span class="devsugg-why">${esc(d.why)}</span>
        <div class="devsugg-param"><b>Set-up that matters:</b> ${esc(d.param)}</div></div>
      <button type="button" class="devsuggadd" data-i="${i}">＋ Add</button>
    </div>`).join("")}
  </div>`;
}
function addSuggestedDevice(i){
  const s = suggestDevices(); const d = s[i]; if(!d) return;
  (state.devices = state.devices||[]).push({ name:d.name, note:d.param });
  save(); afterPrecautionChange(true); toast(`Added: ${d.name}`);
}
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
  const spImplied = impliedSpecialPrecautionKeys();
  const spToggles = Object.values(SPECIAL_PRECAUTIONS).map(p=>{
      const implied = spImplied.has(p.key);
      const on = implied || spActive.has(p.key);
      const auto = implied ? ` <em class="spauto">· auto from your diagnosis / surgery</em>` : "";
      return `<label class="sptoggle${on?" on":""}"><input type="checkbox" class="spcheck" data-sp="${esc(p.key)}"${on?" checked":""}${implied?" disabled":""} />
        <span class="sptop">${p.icon} ${esc(p.label)}${auto}</span><small>${esc(p.sub)}</small></label>`;
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
      return `<li class="precrow devrow"><span class="prec-t">🦿 <b>${esc(d.name)}</b> — ${esc(d.note||"")}</span><button type="button" class="precdel devdel no-print" data-devidx="${i}" aria-label="Remove">✕</button></li>${explain}`;
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
    <details class="preccontrols-wrap no-print"${(surg||wbInfo||devices.length||spActive.size||spImplied.size)?" open":""}><summary class="preccontrols-sum">⚙️ Set weight-bearing, braces &amp; surgical-site orders <span class="sub">— most non-surgical users can skip this</span></summary><div class="preccontrols">${wbControl}${devControl}${spControl}</div></details>
    ${suggestedWbHTML()}
    ${suggestedDevicesCard()}
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
  $$("#precautionsOut .devsuggadd").forEach(b=>b.onclick=()=>addSuggestedDevice(+b.dataset.i));
  $$("#precautionsOut .wbsuggset").forEach(b=>b.onclick=()=>setWeightBearingStatus(b.dataset.wb));
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
function setWeightBearingStatus(forced){
  /* `forced` lets the protocol-suggested order set this directly; otherwise we
     read the picker. Keeps the select in sync either way. */
  const sel = $("#precautionsOut #wbSelect");
  const status = forced || (sel ? sel.value : "");
  if(!status) return;
  if(sel && forced) sel.value = forced;
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

