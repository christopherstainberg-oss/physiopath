/* =====================================================================
   PhysioPath — rehab protocol library + contraindication engine
   All content is general, evidence-informed education. Not medical advice.

   A protocol has 4 phase pools (index 0..3). Phase titles/goals come from
   the acute/chronic TEMPLATE in app.js. Each exercise:
     E(name, dose, cue, ...tags)
   Tags drive the contraindication engine.
===================================================================== */
(function () {
  // --- tag vocabulary (kept as plain strings) ---
  const T = {
    impact:"impact", valsalva:"valsalva", overhead:"overhead", flexLoad:"spine_flexion_load",
    ext:"spine_extension", deepHipFlex:"deep_hip_flexion", hipAddIR:"hip_add_ir", balance:"balance",
    highInt:"high_intensity", supine:"supine_flat", prone:"prone", inversion:"inversion",
    endNeck:"end_range_neck", wb:"weight_bearing", grip:"grip_isometric", breath:"breath_hold", aerobic:"aerobic"
  };
  const E = (n, d, c, ...tags) => ({ n, d, c, tags });

  /* ================= MSK PROTOCOLS ================= */
  const P = {};

  P.shoulder = [
    [E("Pendulum swings","3×30s","Let arm hang & sway gently"),
     E("Scapular squeezes","3×12","Pinch shoulder blades"),
     E("Assisted ROM with cane","3×10","Guide with the good arm"),
     E("Isometric rotator holds","3×10s","Press into a wall/towel",T.grip)],
    [E("Wall slides / walks","3×10","Only to a comfortable height",T.overhead),
     E("Band external rotation","3×15","Elbow tucked at side"),
     E("Band internal rotation","3×15","Controlled"),
     E("Scapular rows (band)","3×15","Squeeze blades back")],
    [E("Full-can raises (light)","3×12","Thumbs up, below shoulder first",T.overhead),
     E("Prone Y-T-W raises","3×10 each","Light, squeeze mid-back",T.prone),
     E("Band diagonals (PNF)","3×12","Smooth control"),
     E("Push-up plus (wall→floor)","3×10","Protract at top")],
    [E("Overhead press progression","3×10","Add load only if pain-free",T.overhead,T.valsalva),
     E("Plyometric ball toss","3×12","Light med ball",T.highInt),
     E("Throwing / racket progression","as tolerated","Build volume gradually"),
     E("Sport-specific loading","as tolerated","Progress slowly")]
  ];

  P.elbow = [
    [E("Isometric wrist holds","5×30–45s","Great for tendon pain relief",T.grip),
     E("Gentle wrist ROM","3×15","Flex/extend easy"),
     E("Soft-ball squeezes","3×15","Light, pain-free"),
     E("Forearm stretches","3×30s","Arm straight, gentle")],
    [E("Wrist extension (light db)","3×15","Slow 3s lower"),
     E("Wrist flexion (light)","3×15","Controlled"),
     E("Pronation/supination (hammer)","3×15","Rotate slowly"),
     E("Radial/ulnar deviation","3×15","Small range")],
    [E("Eccentric wrist loading","3×15","Emphasize the lowering"),
     E("Progressive grip work","3×12","Add resistance weekly",T.grip),
     E("Reverse curls","3×12","Controlled"),
     E("Scapular rows","3×12","Support the chain")],
    [E("Heavy-slow wrist loading","3×8","Build strength",T.grip),
     E("Sport-specific grip drills","as tolerated","Racket/club gradually"),
     E("Plyometric wrist snaps","3×12","Light ball",T.highInt),
     E("Return to activity","as tolerated","Volume up slowly")]
  ];

  P.wrist_hand = [
    [E("Wrist ROM (all directions)","3×12","Slow, pain-free"),
     E("Tendon glides","3×10","Move through finger positions"),
     E("Isometric wrist holds","3×10s","Press gently",T.grip),
     E("Soft-ball squeezes","3×15","Light grip")],
    [E("Wrist curls (light)","3×15","Both directions"),
     E("Pronation/supination","3×15","Hammer rotations"),
     E("Radial/ulnar deviation","3×15","Small controlled"),
     E("Forearm stretches","3×30s","Gentle")],
    [E("Progressive grip strengthening","3×12","Add resistance",T.grip),
     E("Wrist roller","3×3 up/down","Light weight"),
     E("Weight-bearing rocks (quadruped)","3×10","Load through the palm",T.wb),
     E("Reverse curls","3×12","Controlled")],
    [E("Loaded carries","3×30m","Grip endurance",T.grip),
     E("Push-up progression","3×10","Wall→floor",T.wb),
     E("Sport/work-specific loading","as tolerated","Gradual"),
     E("Ball catches","3×12","Light")]
  ];

  P.hip = [
    [E("Glute sets","3×12","Squeeze & hold 5s"),
     E("Clamshells","3×15 each","Hips stacked"),
     E("Gentle hip ROM","3×10","Circles, pain-free"),
     E("Double-leg bridges","3×12","Drive through heels")],
    [E("Side-lying abduction","3×12 each","Lead with the heel"),
     E("Single-leg bridge","3×10 each","Level hips"),
     E("Standing hip extension (band)","3×15","Squeeze glute"),
     E("Hip flexor stretch","3×30s","Tall posture")],
    [E("Bulgarian split squats","3×8 each","Controlled depth"),
     E("Lateral band walks","3×12 steps","Stay low"),
     E("Step-ups","3×10 each","Drive through heel",T.wb),
     E("Single-leg RDL","3×10 each","Hinge + balance",T.balance)],
    [E("Loaded squats / hinges","3×8","Progress load",T.valsalva),
     E("Lateral bounds","3×8 each","Control landing",T.impact),
     E("Running / sport progression","as tolerated","Gradual",T.impact),
     E("Cutting drills (45° → 90° angles)","3×6 each side","Brake, plant, push off — knee over foot",T.impact,T.highInt)]
  ];

  P.hip_replacement = [
    [E("Ankle pumps","3×20","Circulation & clot prevention"),
     E("Glute & quad sets","3×12","Gentle isometrics"),
     E("Heel slides (within precautions)","3×10","Do NOT bend hip past 90°",T.deepHipFlex),
     E("Standing hip abduction (supported)","3×10","Hold a rail",T.balance)],
    [E("Seated knee extensions","3×12","Rebuild quad"),
     E("Standing hip extension","3×12","Squeeze glute",T.ext),
     E("Mini squats (shallow)","3×10","Stay above 90° hip flexion",T.deepHipFlex),
     E("Weight shifts / gait practice","3×1 min","Even steps",T.wb,T.balance)],
    [E("Sit-to-stand","3×10","Controlled, use hands less over time",T.wb),
     E("Step-ups (low)","3×10 each","Lead with operated leg up",T.wb,T.balance),
     E("Standing abduction (band)","3×15","Do not cross midline",T.hipAddIR),
     E("Bridges","3×12","Comfortable range")],
    [E("Progressive squats / lunges","3×10","Within pain-free, precaution-safe range",T.deepHipFlex,T.wb),
     E("Balance & single-leg stance","3×30s","Near support",T.balance),
     E("Walking endurance","20–30 min","Build distance",T.wb,T.aerobic),
     E("Return to low-impact activity","as tolerated","Avoid high impact",T.impact)]
  ];

  P.knee_ligament = [
    [E("Quad sets","3×10 (5s hold)","Tighten thigh, push knee down"),
     E("Heel slides","3×12","Regain bend gently"),
     E("Straight-leg raises","3×10","Keep knee locked straight"),
     E("Ankle pumps & patellar mobs","3×15","Keep circulation up")],
    [E("Mini squats (0–45°)","3×12","Knees track over toes",T.wb),
     E("Stationary bike (light)","10–15 min","Low resistance",T.aerobic),
     E("Hamstring curls","3×12","Slow, controlled"),
     E("Standing calf raises","3×15","Full range")],
    [E("Leg press / squats (progressive)","3×10","Add load weekly if pain-free",T.wb,T.valsalva),
     E("Step-downs","3×10 each","Control, no knee collapse",T.wb,T.balance),
     E("Single-leg balance + reach","3×8 each","Build knee stability",T.balance),
     E("Bridges (single-leg)","3×12","Squeeze glutes")],
    [E("Jogging progression","per return-to-run plan","Only when cleared",T.impact),
     E("Double→single-leg hop-and-stick landings","3×8","Soft, controlled — freeze the landing",T.impact),
     E("Deceleration & 45° cutting drills","3×6 each side","Brake under control; knee over foot",T.impact,T.highInt),
     E("Pro-agility 5-10-5 shuttle & T-drill","4–6 reps","Sharp cuts; full rest between reps",T.impact,T.highInt)]
  ];

  P.knee_pf = [
    [E("Quad sets","3×12","Gentle, pain-free"),
     E("Straight-leg raises","3×10","Knee locked"),
     E("Clamshells","3×15 each","Hips stacked"),
     E("Glute bridges","3×12","Drive through heels")],
    [E("Wall sits","3×20–40s","Pain-free depth",T.wb),
     E("Side-lying hip abduction","3×12 each","Lead with the heel"),
     E("Step-ups (low)","3×10 each","Slow tempo",T.wb),
     E("Hip flexor & quad stretch","3×30s","Ease into it")],
    [E("Bulgarian split squats","3×8 each","Vertical shin, controlled",T.wb),
     E("Step-downs (eccentric)","3×10 each","Lower slowly, 3s",T.wb,T.balance),
     E("Single-leg press / squat","3×10","Progress load",T.wb),
     E("Lateral band walks","3×12 steps","Stay low")],
    [E("Return-to-run intervals","walk/run progression","Increase ≤10%/wk",T.impact),
     E("Low box jumps & landings","3×8","Soft landings",T.impact),
     E("Hill / stair conditioning","as tolerated","Build gradually",T.wb),
     E("Sport drills","as tolerated","Pain-free only",T.impact)]
  ];

  P.knee_replacement = [
    [E("Ankle pumps","3×20","Circulation"),
     E("Quad sets","3×12","Rebuild thigh control"),
     E("Heel slides / knee bends","3×12","Regain flexion daily"),
     E("Straight-leg raises","3×10","Keep knee straight")],
    [E("Seated knee extension","3×12","Work toward full straightening"),
     E("Standing knee bends","3×12","Improve flexion",T.balance),
     E("Mini squats","3×10","Shallow, controlled",T.wb),
     E("Stationary bike","10 min","Light resistance",T.aerobic)],
    [E("Sit-to-stand","3×10","Controlled",T.wb),
     E("Step-ups (low)","3×10 each","Lead operated leg",T.wb,T.balance),
     E("Standing hip abduction","3×15","Stabilize the knee"),
     E("Calf raises","3×15","Support as needed")],
    [E("Progressive squats/lunges","3×10","Pain-free range",T.wb),
     E("Balance training","3×30s","Near support",T.balance),
     E("Walking endurance","20–30 min","Build distance",T.wb,T.aerobic),
     E("Low-impact activity return","as tolerated","Avoid high impact",T.impact)]
  ];

  P.ankle = [
    [E("Ankle pumps","3×20","Point & flex slowly"),
     E("Ankle alphabet","2× each","Trace A–Z with toes"),
     E("Isometric eversion/inversion","3×10s","Press against a wall"),
     E("Seated weight shifts","3×15","Gentle, within comfort")],
    [E("Band 4-way ankle","3×15 each","Slow eccentric"),
     E("Double-leg calf raises","3×12","Hold a rail",T.balance),
     E("Single-leg balance","3×30s","Progress eyes-closed",T.balance),
     E("Calf & soleus stretch","3×30s","Towel around forefoot")],
    [E("Single-leg calf raises","3×12","Full range, slow lower"),
     E("Lateral band walks","3×12 steps","Stay low"),
     E("Step-ups","3×10 each","Control the descent",T.wb),
     E("Cushion / Bosu balance","3×45s","Unstable surface",T.balance)],
    [E("Single-leg hop-and-stick landings","3×8 each","Land softly, freeze for 2s",T.impact),
     E("Lateral bounds (skater)","3×8 each","Push off sideways, stick the landing",T.impact),
     E("Ladder footwork & figure-8 runs","3×20–30s","Fast, light, controlled feet",T.impact,T.highInt),
     E("Cutting & reactive agility (45° → 90°)","3×6 each side","Change direction under control; pain-free",T.impact,T.highInt)]
  ];

  P.achilles = [
    [E("Isometric calf holds","5×30–45s","Two feet, mid-range"),
     E("Seated calf raises","3×15","Knee bent (soleus)"),
     E("Ankle ROM","3×15","Gentle pumps"),
     E("Gentle soleus stretch","3×30s","No sharp pain")],
    [E("Double-leg calf raises","3×15","Full range, slow"),
     E("Small-range heel raises off step","3×12","Controlled lower",T.balance),
     E("Seated heavy calf raise","3×12","Add load"),
     E("Single-leg balance","3×30s","Steady",T.balance)],
    [E("Single-leg calf raises","3×12","Slow 3s lower"),
     E("Eccentric heel drops off step","3×15","Lower below level slowly",T.balance),
     E("Heavy-slow calf press","3×8","Progressive load"),
     E("Step-ups","3×10 each","Push through calf",T.wb)],
    [E("Explosive calf raises / hops","3×12","Build spring",T.impact),
     E("Skipping & pogo hops","3×20s","Light, rhythmic",T.impact),
     E("Return-to-run progression","walk/run plan","When single-leg raises are strong",T.impact),
     E("Sport-specific loading","as tolerated","Gradual",T.impact)]
  ];

  P.foot = [
    [E("Towel scrunches / toe curls","3×15","Wake up the arch"),
     E("Calf & plantar fascia stretch","3×30s","Gentle, morning helps"),
     E("Ankle ROM","3×15","Pain-free"),
     E("Seated heel raises","3×15","Light")],
    [E("Short-foot exercise","3×10","Build arch control"),
     E("Toe yoga (big-toe control)","3×10","Isolate toes"),
     E("Double-leg calf raises","3×12","Full range",T.balance),
     E("Band toe flexion/extension","3×15","Controlled")],
    [E("Single-leg calf raises","3×12","Slow lower"),
     E("Single-leg balance","3×30s","Build foot control",T.balance),
     E("Step-ups","3×10 each","Push through the foot",T.wb),
     E("Heel walks / toe walks","3×20m","Alternate")],
    [E("Hopping progression","3×10","Soft landings",T.impact),
     E("Return-to-run intervals","walk/run plan","≤10%/wk",T.impact),
     E("Agility drills","as tolerated","Build up",T.impact),
     E("Sport-specific loading","as tolerated","Gradual",T.impact)]
  ];

  P.cervical = [
    [E("Chin tucks","3×10","Gentle nod, lengthen neck"),
     E("Gentle ROM (all directions)","3×8","Pain-free range",T.endNeck),
     E("Scapular squeezes","3×12","Pinch blades"),
     E("Upper-trap & levator stretch","3×30s","Easy, no forcing")],
    [E("Deep neck flexor holds","3×10s","Chin tuck + hold"),
     E("Isometric neck (all directions)","3×10s","Press hand, no motion"),
     E("Band rows","3×15","Squeeze mid-back"),
     E("Thoracic extensions","3×10","Open the upper back",T.ext)],
    [E("Prone Y-T-W raises","3×10 each","Light, controlled",T.prone),
     E("Band pull-aparts","3×15","Squeeze blades"),
     E("Wall angels","3×10","Keep contact"),
     E("Face pulls","3×15","Elbows high")],
    [E("Progressive rows & carries","3×10","Build capacity",T.grip),
     E("Posture endurance drills","3×45s","Hold tall posture"),
     E("Work/sport-specific loading","as tolerated","Gradual"),
     E("Return to full activity","as tolerated","Symptom-guided")]
  ];

  P.thoracic = [
    [E("Cat–camel","3×10","Smooth spinal motion"),
     E("Seated thoracic rotations","3×10 each","Gentle turns"),
     E("Scapular squeezes","3×12","Pinch blades"),
     E("Diaphragmatic breathing","3×1 min","Expand the ribs")],
    [E("Foam-roller thoracic extension","3×8","Open the upper back",T.ext),
     E("Band rows","3×15","Squeeze mid-back"),
     E("Wall angels","3×10","Keep contact"),
     E("Open-book stretch","3×8 each","Rotate through the chest")],
    [E("Prone Y-T-W raises","3×10 each","Squeeze mid-back",T.prone),
     E("Band pull-aparts","3×15","Control"),
     E("Bird-dog","3×10 each","Trunk stability"),
     E("Face pulls","3×15","Elbows high")],
    [E("Loaded rows / carries","3×10","Build posture endurance",T.grip),
     E("Rotational med-ball throws","3×10 each","Controlled power",T.highInt),
     E("Work-specific loading","as tolerated","Gradual"),
     E("Return to activity","as tolerated","Symptom-guided")]
  ];

  P.lumbar = [
    [E("Pelvic tilts","3×12","Gentle rock, breathe"),
     E("Knee-to-chest","3×20s each","Ease tension",T.deepHipFlex),
     E("Cat–camel","3×10","Smooth spinal motion"),
     E("Walking","5–10 min ×2/day","Frequent, easy pace",T.aerobic)],
    [E("Bird-dog","3×10 each","Keep hips level"),
     E("Glute bridges","3×12","Squeeze at top"),
     E("Dead bug","3×10 each","Low back stays flat",T.supine),
     E("Hip flexor stretch","3×30s","Tall posture")],
    [E("Side plank (knees→feet)","3×20–40s","Straight line"),
     E("Hip hinges (light)","3×12","Hinge from the hips"),
     E("Split squats","3×10 each","Brace the core",T.wb),
     E("Pallof press (anti-rotation)","3×12 each","Resist the twist")],
    [E("Deadlift progression (light→mod)","3×8","Neutral spine, add load slowly",T.valsalva,T.flexLoad),
     E("Farmer carries","3×30m","Tall, braced",T.grip),
     E("Loaded lifting mechanics","3×10","Practice real-life lifts",T.flexLoad),
     E("Return to activity/sport","as tolerated","Progress gradually",T.impact)]
  ];

  P.fracture = [
    [E("Gentle ROM around the injury","3×10","Within pain-free / cast-free range"),
     E("Isometric holds (muscles nearby)","3×10s","Maintain muscle without moving the bone"),
     E("Circulation drills (pumps)","3×20","Reduce swelling & clot risk"),
     E("Uninvolved-limb conditioning","as able","Keep the rest of you strong")],
    [E("Active ROM progression","3×12","Restore full motion"),
     E("Light resistance (band)","3×15","Rebuild muscle gently"),
     E("Protected weight-bearing (if lower limb)","per surgeon","Follow your weight-bearing status",T.wb),
     E("Gentle stretching","3×30s","Ease stiffness")],
    [E("Progressive resistance","3×12","Add load weekly",T.wb),
     E("Balance / proprioception","3×30s","Near support",T.balance),
     E("Functional movements","3×10","Squats, steps, reaching as relevant",T.wb),
     E("Endurance work","10–20 min","Rebuild capacity",T.aerobic)],
    [E("Strength to near-normal","3×10","Match the other side",T.valsalva),
     E("Impact reintroduction (if cleared)","gradual","Only when the bone is healed",T.impact),
     E("Activity/sport-specific drills","as tolerated","Progress slowly"),
     E("Return to full activity","as tolerated","Symptom- & clearance-guided")]
  ];

  P.amputation = [
    [E("Residual-limb positioning & desensitization","several × day","Prevent contracture, reduce sensitivity"),
     E("Gentle ROM (proximal joints)","3×10","Maintain full motion"),
     E("Core & uninvolved-limb strengthening","as able","Prepare for prosthesis"),
     E("Cardio (arm/seated)","10–15 min","Maintain fitness",T.aerobic)],
    [E("Progressive residual-limb strengthening","3×12","Build for socket load"),
     E("Balance in sitting/standing","3×30s","Near support",T.balance),
     E("Prosthetic tolerance (per team)","graded","Follow prosthetist guidance",T.wb),
     E("Stretching (hip/knee flexors)","3×30s","Prevent contracture")],
    [E("Gait / mobility training","per team","With prosthesis, near support",T.wb,T.balance),
     E("Progressive strength","3×12","Whole-body"),
     E("Endurance building","15–25 min","Rebuild stamina",T.aerobic),
     E("Functional tasks","3×10","Real-life transfers & steps",T.wb)],
    [E("Advanced balance & agility","as tolerated","Confidence on the prosthesis",T.balance),
     E("Community mobility","progressive","Uneven ground, stairs",T.wb),
     E("Recreation/sport adaptation","as tolerated","Adaptive options"),
     E("Return to activity","as tolerated","Team-guided")]
  ];

  P.tmj = [
    [E("Relaxed jaw posture ('N' position)","frequent","Tongue on palate, teeth apart"),
     E("Controlled jaw opening (in mirror)","3×10","Straight, no clicking"),
     E("Gentle isometric jaw holds","3×5s each","Light resistance with fingers"),
     E("Neck posture (chin tucks)","3×10","The neck drives the jaw")],
    [E("Resisted opening/closing","3×10","Light finger resistance"),
     E("Lateral & protrusion control","3×10","Small, symmetric"),
     E("Upper-neck mobility","3×10","Reduce referred tension",T.endNeck),
     E("Masseter/temporalis release","3×30s","Gentle self-massage")],
    [E("Endurance jaw control","3×30s","Steady posture"),
     E("Postural strengthening (scapular)","3×12","Support the chain"),
     E("Stress/awareness habit work","daily","Unclench, notice grinding"),
     E("Progressive normal chewing","as tolerated","Softer→normal foods")],
    [E("Full pain-free function","daily","Normal eating & speaking"),
     E("Maintenance posture routine","daily","Prevent recurrence"),
     E("Return to full diet","as tolerated","Symptom-guided"),
     E("Relapse-prevention habits","ongoing","Manage clenching/stress")]
  ];

  P.general_msk = [
    [E("Gentle pain-free ROM","3×10","Keep the area moving"),
     E("Isometric holds","3×10s","Activate muscle without strain",T.grip),
     E("Light aerobic (walk/bike)","10 min","Maintain fitness",T.aerobic),
     E("Breathing & relaxation","3×1 min","Down-regulate pain")],
    [E("Active ROM & mobility","3×12","Restore full range"),
     E("Light resistance bands","3×15","Rebuild base strength"),
     E("Core stability basics","3×10","Support the whole body"),
     E("Gentle stretching","3×30s","Ease stiffness")],
    [E("Progressive resistance","3×12","Add load weekly",T.wb),
     E("Balance & control","3×30s","Near support",T.balance),
     E("Functional patterns","3×10","Squat, hinge, push, pull",T.wb),
     E("Aerobic conditioning","15–20 min","Build capacity",T.aerobic)],
    [E("Strength & power","3×10","Near-normal loading",T.valsalva),
     E("Return-to-activity drills","as tolerated","Task-specific"),
     E("Impact / sport reintroduction","gradual","If relevant & cleared",T.impact),
     E("Maintenance program","ongoing","Keep the gains")]
  ];

  /* ================= NEURO PROTOCOLS ================= */
  P.stroke = [
    [E("Positioning & gentle ROM","several × day","Prevent stiffness & contracture"),
     E("Assisted active movements","3×10","Use the stronger side to help"),
     E("Seated weight shifts","3×10","Rebuild trunk control",T.balance),
     E("Breathing & relaxation","3×1 min","Reduce tone")],
    [E("Sit-to-stand practice","3×8","With support as needed",T.wb,T.balance),
     E("Supported standing balance","3×30s","Hold a rail",T.balance),
     E("Task-specific arm reaching","3×10","Functional targets"),
     E("Gentle strengthening (bands)","3×12","Both sides")],
    [E("Gait training (assisted)","per team","Even, safe stepping",T.wb,T.balance),
     E("Step-ups / stairs practice","3×8","Near a rail",T.wb,T.balance),
     E("Dual-task balance","3×30s","Add a cognitive task",T.balance),
     E("Functional strengthening","3×12","Real-life movements")],
    [E("Community mobility","progressive","Uneven ground, distance",T.wb,T.balance),
     E("Endurance conditioning","15–25 min","Rebuild stamina",T.aerobic),
     E("Advanced balance & coordination","as tolerated","Near support",T.balance),
     E("Return to meaningful activity","as tolerated","Team-guided")]
  ];

  P.sci = [
    [E("Respiratory & breathing exercises","several × day","Protect lung function"),
     E("Passive/assisted ROM (all joints)","daily","Prevent contractures"),
     E("Available-muscle activation","3×10","Work what you can, isometrically"),
     E("Pressure-relief & positioning","every 15–30 min","Protect the skin")],
    [E("Seated balance training","3×30s","Near support",T.balance),
     E("Upper-body strengthening","3×12","Prepare for transfers/wheelchair",T.grip),
     E("Transfer practice","per team","Safe technique",T.wb),
     E("Core & trunk control","3×10","Available musculature")],
    [E("Progressive resistance (available muscles)","3×12","Build functional strength",T.grip),
     E("Functional mobility / transfers","per team","Bed, chair, car",T.wb),
     E("Wheelchair skills / gait (if applicable)","per team","With equipment",T.wb,T.balance),
     E("Endurance (arm ergometer)","10–20 min","Cardiovascular fitness",T.aerobic)],
    [E("Advanced functional training","as tolerated","Independence goals",T.balance),
     E("Community reintegration skills","progressive","Ramps, terrain, distance",T.wb),
     E("Adaptive recreation/sport","as tolerated","Options for your level"),
     E("Maintenance & health program","ongoing","Lifelong fitness")]
  ];

  P.ms = [
    [E("Gentle ROM & stretching","daily","Manage spasticity, avoid overheating"),
     E("Short bouts of activity","3×5 min","Pace to avoid fatigue"),
     E("Seated balance","3×30s","Near support",T.balance),
     E("Cooling & breathing","as needed","Heat worsens MS symptoms")],
    [E("Light resistance (bands)","3×12","Sub-fatigue effort"),
     E("Standing balance","3×30s","Hold support",T.balance),
     E("Core stability","3×10","Trunk control"),
     E("Aerobic intervals (cool environment)","10–15 min","Rest between bouts",T.aerobic)],
    [E("Progressive strengthening","3×10","Stop before fatigue"),
     E("Dynamic balance / gait","per tolerance","Near support",T.wb,T.balance),
     E("Functional tasks","3×10","Real-life movements"),
     E("Endurance (paced)","15–20 min","Energy management",T.aerobic)],
    [E("Maintenance strength & balance","ongoing","Consistency over intensity",T.balance),
     E("Fatigue-managed conditioning","as tolerated","Bank energy",T.aerobic),
     E("Fall-prevention skills","ongoing","Home safety",T.balance),
     E("Activity participation","as tolerated","Meaningful goals")]
  ];

  P.parkinsons = [
    [E("Large-amplitude movements (LSVT-BIG style)","3×10","Exaggerate range"),
     E("Posture & extension work","3×10","Counter stooping",T.ext),
     E("Rhythmic marching (seated/standing)","3×1 min","Use a beat/metronome",T.balance),
     E("Stretching (chest, hip flexors)","3×30s","Open the front")],
    [E("Sit-to-stand with cues","3×10","Big, deliberate",T.wb),
     E("Balance training","3×30s","Near support",T.balance),
     E("Stepping / weight shifts","3×10 each","Big steps",T.balance),
     E("Boxing-style / reciprocal drills","3×1 min","Coordination & power")],
    [E("Gait training with cueing","per tolerance","Long strides, visual/auditory cues",T.wb,T.balance),
     E("Turning & freezing strategies","3×5","Practice safe turns",T.balance),
     E("Progressive strengthening","3×12","Whole body"),
     E("Dual-task practice","3×30s","Move + think",T.balance)],
    [E("Endurance (brisk walk/bike)","20–30 min","Cardio helps symptoms",T.aerobic,T.wb),
     E("Advanced balance & agility","as tolerated","Near support",T.balance),
     E("Community mobility","progressive","Real environments",T.wb),
     E("Ongoing high-effort exercise","ongoing","Consistency is key")]
  ];

  P.neuropathy = [
    [E("Foot inspection & care","daily","Check insensate skin before/after"),
     E("Seated ankle/foot ROM","3×15","Keep joints mobile"),
     E("Gentle strengthening (bands)","3×12","Rebuild without strain"),
     E("Supported balance","3×30s","Hold a rail",T.balance)],
    [E("Standing balance (near support)","3×30s","Eyes open→closed carefully",T.balance),
     E("Calf & foot strengthening","3×12","Improve push-off"),
     E("Seated cycling","10–15 min","Low-impact cardio",T.aerobic),
     E("Toe/heel control drills","3×10","Sensorimotor work")],
    [E("Dynamic balance","3×30s","Near support",T.balance),
     E("Progressive strengthening","3×12","Legs & core",T.wb),
     E("Gait drills","3×20m","Even, safe steps",T.wb,T.balance),
     E("Low-impact endurance","15–20 min","Protect the feet",T.aerobic)],
    [E("Advanced balance training","as tolerated","Fall prevention",T.balance),
     E("Functional strength","3×10","Real-life tasks",T.wb),
     E("Community walking","progressive","Good footwear",T.wb),
     E("Maintenance & foot-care routine","ongoing","Protect sensation")]
  ];

  P.vestibular = [
    [E("Gaze stabilization (VOR×1)","3×1 min","Focus on a target, turn head"),
     E("Gentle head movements","3×10","Provoke mildly, then settle",T.endNeck),
     E("Seated balance","3×30s","Near support",T.balance),
     E("Habituation positions (per PT)","2–3 × day","Brief symptom provocation")],
    [E("Standing gaze stabilization","3×1 min","Add standing challenge",T.balance),
     E("Balance on firm→foam","3×30s","Near support",T.balance),
     E("Walking with head turns","3×20m","Coordinate eyes/head/feet",T.balance),
     E("Habituation drills","2–3 × day","Reduce sensitivity over time")],
    [E("Dynamic gaze + balance","3×1 min","Combine tasks",T.balance),
     E("Uneven-surface balance","3×30s","Near support",T.balance),
     E("Turning & pivoting drills","3×5","Control dizziness",T.balance),
     E("Aerobic reconditioning","10–15 min","Rebuild tolerance",T.aerobic)],
    [E("Complex environments","as tolerated","Busy visual scenes",T.balance),
     E("Return-to-activity drills","as tolerated","Sport/work specific",T.impact),
     E("Advanced dual-task balance","as tolerated","Move + think",T.balance),
     E("Maintenance program","ongoing","Keep the system calibrated")]
  ];

  P.bells_palsy = [
    [E("Facial muscle awareness (mirror)","2–3 × day","Gentle, symmetric attempts"),
     E("Gentle facial massage","3×1 min","Maintain suppleness"),
     E("Eye protection routine","as needed","Lubricate/close if blink weak"),
     E("Gentle ROM (brow, cheek, lips)","3×5 each","Small, controlled")],
    [E("Targeted facial movements","3×5 each","Brow raise, eye close, smile, pucker"),
     E("Symmetry practice (mirror)","3×5","Avoid over-forcing"),
     E("Slow controlled expressions","3×5","Quality over effort"),
     E("Relaxation of overactive areas","3×1 min","Prevent synkinesis")],
    [E("Coordination / fine control","3×5","Isolate movements"),
     E("Functional expressions","3×5","Speech, eating, blinking"),
     E("Synkinesis-management cues","daily","Small, precise movements"),
     E("Endurance of facial control","3×10s","Hold gentle positions")],
    [E("Full functional expression","daily","Natural movement"),
     E("Refined symmetry work","as needed","Fine-tune"),
     E("Maintenance routine","ongoing","Preserve control"),
     E("Return to normal function","as tolerated","Symptom-guided")]
  ];

  P.balance_neuro = [
    [E("Seated balance & posture","3×30s","Near support",T.balance),
     E("Gentle ROM & stretching","daily","Maintain mobility"),
     E("Available-muscle strengthening","3×12","Sub-fatigue"),
     E("Breathing & pacing","3×1 min","Manage fatigue")],
    [E("Standing balance (supported)","3×30s","Hold a rail",T.balance),
     E("Weight shifts & stepping","3×10 each","Controlled",T.balance),
     E("Light resistance training","3×12","Whole body"),
     E("Seated/standing cardio","10–15 min","Paced",T.aerobic)],
    [E("Dynamic balance training","3×30s","Near support",T.balance),
     E("Gait & mobility drills","3×20m","Safe, even steps",T.wb,T.balance),
     E("Progressive strengthening","3×12","Functional",T.wb),
     E("Endurance (paced)","15–20 min","Energy management",T.aerobic)],
    [E("Advanced balance & agility","as tolerated","Fall prevention, near support",T.balance),
     E("Functional/community tasks","progressive","Real environments",T.wb),
     E("Maintenance program","ongoing","Consistency"),
     E("Meaningful activity participation","as tolerated","Goal-directed")]
  ];

  /* ================= CARDIAC PROTOCOLS ================= */
  P.cardiac_rehab = [
    [E("Warm-up: easy walking / marching","5–10 min","RPE 9–11 (very light)",T.aerobic),
     E("Light rhythmic movement","10 min","Talk-test: able to chat",T.aerobic),
     E("Diaphragmatic breathing","3×1 min","No breath-holding"),
     E("Gentle mobility","3×10","Loosen up — avoid straining",T.grip)],
    [E("Continuous aerobic (walk/bike)","15–20 min","RPE 11–13 (light–moderate)",T.aerobic,T.highInt),
     E("Light resistance (bands/light db)","1–2×12–15","Exhale on effort, no straining",T.grip,T.valsalva),
     E("Cool-down walk","5 min","Gradually lower HR",T.aerobic),
     E("Symptom monitoring","every session","Stop for chest pain/dizziness")],
    [E("Interval aerobic (as prescribed)","20–30 min","Within your target HR/RPE",T.aerobic,T.highInt),
     E("Whole-body resistance circuit","2×12–15","Moderate, controlled breathing",T.grip,T.valsalva),
     E("Functional endurance","10 min","Stairs, hills as cleared",T.wb,T.aerobic),
     E("Flexibility & cool-down","10 min","Relax, breathe")],
    [E("Progressive aerobic conditioning","30–40 min","Build duration first, then intensity",T.aerobic,T.highInt),
     E("Maintenance resistance training","2–3×12–15","Avoid maximal/heavy holds",T.valsalva,T.grip),
     E("Return to activity/hobbies","as cleared","Gradual, monitored",T.aerobic),
     E("Long-term heart-healthy routine","ongoing","150 min/week goal",T.aerobic)]
  ];

  P.heart_failure = [
    [E("Very light walking (intervals)","3–5 × 2–3 min","RPE 9–11, rest between",T.aerobic),
     E("Breathing exercises","3×1 min","No breath-holding"),
     E("Seated mobility / gentle ROM","3×10","Avoid straining",T.grip),
     E("Daily weight & symptom check","daily","Report rapid weight gain/swelling")],
    [E("Short aerobic bouts (walk/bike)","10–15 min total","RPE 11–12, stay conversational",T.aerobic),
     E("Light resistance (very light)","1×12–15","Small muscle groups, exhale on effort",T.grip,T.valsalva),
     E("Balance & standing tolerance","3×30s","Near support",T.balance),
     E("Cool-down & breathing","5 min","Ease down slowly")],
    [E("Aerobic build (as tolerated)","15–25 min","RPE ≤13, monitor symptoms",T.aerobic,T.highInt),
     E("Progressive light resistance","1–2×12–15","No heavy loads or holds",T.valsalva,T.grip),
     E("Functional endurance","10 min","Daily-task tolerance",T.aerobic),
     E("Symptom-guided pacing","every session","Fatigue/breathlessness is the guide")],
    [E("Maintenance aerobic","20–30 min","Consistent, moderate",T.aerobic,T.highInt),
     E("Maintenance resistance","2×12–15","Light–moderate only",T.valsalva),
     E("Energy conservation skills","ongoing","Balance activity & rest"),
     E("Long-term supervised routine","ongoing","Keep in touch with your team",T.aerobic)]
  ];

  P.hypertension = [
    [E("Warm-up walking","5–10 min","Ease in",T.aerobic),
     E("Moderate aerobic (walk/bike/swim)","15–20 min","Talk-test pace",T.aerobic),
     E("Breathing practice","3×1 min","Never hold your breath",T.breath),
     E("Cool-down","5 min","Gradual")],
    [E("Aerobic conditioning","20–30 min","Most days of the week",T.aerobic),
     E("Light–moderate resistance","2×10–15","Exhale on effort, avoid heavy grip holds",T.grip,T.valsalva),
     E("Mobility & stretching","3×30s","Relax"),
     E("Home BP awareness","as advised","Know your numbers")],
    [E("Progressive aerobic","30–40 min","Build steadily",T.aerobic),
     E("Full-body resistance circuit","2×12–15","Controlled breathing throughout",T.valsalva,T.grip),
     E("Functional conditioning","10 min","Real-life tasks",T.wb),
     E("Stress-reduction (breathing/yoga)","10 min","Lowers BP too")],
    [E("Aerobic maintenance","150+ min/week","The cornerstone for BP",T.aerobic),
     E("Resistance 2–3×/week","2×12–15","Moderate, never straining",T.valsalva),
     E("Active lifestyle habits","ongoing","Movement snacks, steps"),
     E("Long-term routine","ongoing","Consistency lowers BP")]
  ];

  P.pad = [
    [E("Walk-to-claudication intervals","walk until moderate leg pain, rest, repeat","30 min total incl. rest",T.aerobic,T.wb),
     E("Ankle pumps & calf work","3×15","Circulation"),
     E("Gentle mobility","3×10","Warm up"),
     E("Foot inspection","daily","Protect skin/circulation")],
    [E("Structured walking program","30–40 min (with rests)","The key treatment for claudication",T.aerobic,T.wb),
     E("Calf raises","3×12","Build lower-leg endurance"),
     E("Light resistance","2×12","Legs & core",T.grip),
     E("Cardio cross-training (bike)","10–15 min","If walking limited",T.aerobic)],
    [E("Progressive walking","40–50 min (with rests)","Increase pain-free distance",T.aerobic,T.wb),
     E("Lower-limb strengthening","3×12","Functional",T.wb),
     E("Interval conditioning","20 min","As tolerated",T.aerobic,T.highInt),
     E("Endurance building","progressive","Extend distance",T.aerobic)],
    [E("Maintenance walking","30+ min most days","Preserve the gains",T.aerobic,T.wb),
     E("Whole-body conditioning","2–3×/week","Strength & cardio",T.aerobic),
     E("Risk-factor lifestyle","ongoing","Circulation health"),
     E("Long-term routine","ongoing","Keep walking",T.aerobic)]
  ];

  /* ================= PULMONARY PROTOCOLS ================= */
  P.pulmonary_rehab = [
    [E("Pursed-lip & diaphragmatic breathing","several × day","Control breathlessness"),
     E("Short walking bouts","3–5 × 2–3 min","Rest between, RPE ≤11 breathlessness",T.aerobic),
     E("Seated arm & leg movements","3×10","Build base, avoid breath-holding",T.breath),
     E("Airway clearance (if prescribed)","as advised","Huff/cough technique")],
    [E("Walking endurance","10–15 min","Pace with breathing, use O₂ if prescribed",T.aerobic),
     E("Light resistance (bands)","1–2×10–15","Exhale on effort",T.grip,T.valsalva),
     E("Breathing-coordinated exercise","3×10","Sync movement with breath"),
     E("Balance & standing tolerance","3×30s","Near support",T.balance)],
    [E("Aerobic build (walk/bike)","15–25 min","Interval or continuous, RPE moderate",T.aerobic,T.highInt),
     E("Progressive resistance","2×10–15","Whole body, controlled breathing",T.valsalva),
     E("Functional endurance","10 min","Stairs, carrying — paced",T.wb,T.aerobic),
     E("Breathlessness recovery positions","as needed","Lean forward, relax")],
    [E("Aerobic maintenance","20–30 min","Most days, paced",T.aerobic,T.highInt),
     E("Maintenance resistance","2×12–15","Light–moderate",T.valsalva),
     E("Energy conservation & pacing","ongoing","Plan activity/rest"),
     E("Long-term active routine","ongoing","Keep lungs & body conditioned",T.aerobic)]
  ];

  P.post_covid = [
    [E("Energy pacing & rest (very gentle)","daily","Avoid post-exertional crashes — stop before fatigue"),
     E("Breathing exercises","3×1 min","Diaphragmatic, calming"),
     E("Short easy walks","5–10 min","Only if no symptom flare next day",T.aerobic),
     E("Gentle mobility","3×10","Keep moving lightly")],
    [E("Graded walking (symptom-titrated)","10–15 min","Increase only if you recover well",T.aerobic),
     E("Light strengthening","2×10–12","Small increments"),
     E("Breathing-pattern retraining","3×1 min","Nose breathing, slow rhythm"),
     E("Symptom/recovery diary","daily","Watch for post-exertional malaise")],
    [E("Aerobic reconditioning","15–20 min","Only after stable tolerance",T.aerobic,T.highInt),
     E("Progressive resistance","2×12","Whole body"),
     E("Functional endurance","10 min","Daily tasks",T.aerobic),
     E("Balance if needed","3×30s","Near support",T.balance)],
    [E("Return-to-activity build","progressive","Cautious, non-linear is normal",T.aerobic),
     E("Full-body conditioning","2–3×/week","Strength & cardio",T.aerobic),
     E("Return to work/sport","as tolerated","Graded, watch recovery",T.impact),
     E("Maintenance routine","ongoing","Sustain the gains")]
  ];

  /* ================= NEURO — additional distinct protocols ================= */
  P.tbi = [
    [E("Rest & symptom-limited activity","daily","Stay below symptom-provoking threshold"),
     E("Gentle neck & eye ROM","3×10","Reduce cervical/vestibular contribution",T.endNeck),
     E("Diaphragmatic breathing","3×1 min","Calm the nervous system"),
     E("Short easy walks","5–10 min","Only if symptoms don't spike",T.aerobic)],
    [E("Sub-symptom aerobic (Buffalo-style)","10–15 min","Keep below the symptom-onset heart rate",T.aerobic),
     E("Seated & standing balance","3×30s","Near support",T.balance),
     E("Gaze stabilization (if cleared)","3×1 min","For dizziness/visual symptoms"),
     E("Light strengthening","3×12","Whole body, sub-fatigue")],
    [E("Graded aerobic progression","15–20 min","Raise intensity as tolerance improves",T.aerobic,T.highInt),
     E("Dynamic balance & coordination","3×30s","Near support",T.balance),
     E("Dual-task drills","3×30s","Move + think",T.balance),
     E("Progressive strengthening","3×12","Functional")],
    [E("Return-to-activity progression","staged","Symptom-free at each stage before advancing",T.aerobic),
     E("Sport-specific / non-contact drills","as tolerated","Only when cleared",T.impact),
     E("Advanced balance & agility","as tolerated","Near support",T.balance),
     E("Full return (medical clearance)","as cleared","Especially before contact/collision",T.impact)]
  ];

  P.guillain_barre = [
    [E("Gentle passive/active-assisted ROM","daily","Prevent contractures — do NOT overwork"),
     E("Positioning & skin care","regular","Protect weak/insensate areas"),
     E("Breathing exercises","3×1 min","Support respiratory muscles"),
     E("Very light activation of available muscles","3×8","Stop well before fatigue")],
    [E("Short low-effort strengthening","2×10","Sub-fatigue — overwork can set recovery back"),
     E("Supported sitting/standing balance","3×20s","Near support",T.balance),
     E("Frequent rest breaks","as needed","Pacing is essential"),
     E("Gentle stretching","3×20s","Maintain length")],
    [E("Progressive strengthening (careful)","2–3×10","Small increments, monitor next-day fatigue"),
     E("Standing balance & transfers","3×30s","Near support",T.balance,T.wb),
     E("Endurance (paced intervals)","10–15 min","Rest between bouts",T.aerobic),
     E("Functional task practice","3×8","Real-life movements",T.wb)],
    [E("Strength & endurance build","3×10","Still avoid overfatigue",T.wb),
     E("Gait & mobility training","per tolerance","Safe, even steps",T.wb,T.balance),
     E("Advanced balance","as tolerated","Fall prevention",T.balance),
     E("Graded return to activity","progressive","Recovery can take months — be patient")]
  ];

  /* ================= CARDIAC — additional distinct protocols ================= */
  P.valve = [
    [E("Gentle walking","5–10 min","RPE 9–11; respect sternal/incision precautions",T.aerobic),
     E("Ankle pumps & seated leg movements","3×15","Circulation, no straining"),
     E("Diaphragmatic & deep breathing","3×1 min","Protect lungs, no breath-holding"),
     E("Posture & gentle ROM (within precautions)","3×10","No pushing/pulling/lifting >~5 lb early",T.overhead)],
    [E("Walking intervals","10–15 min","RPE 11–12, conversational",T.aerobic),
     E("Seated light band work (respect sternum)","1×12–15","No heavy pulling until cleared (~6–8 wks)",T.grip,T.valsalva),
     E("Standing balance","3×30s","Near support",T.balance),
     E("Cool-down & breathing","5 min","Ease down")],
    [E("Continuous aerobic","15–25 min","Within target RPE/HR",T.aerobic,T.highInt),
     E("Light resistance (post-precaution)","1–2×12–15","Once sternum has healed & cleared",T.valsalva),
     E("Functional endurance","10 min","Stairs/hills as cleared",T.wb,T.aerobic),
     E("Flexibility","10 min","Relax, breathe")],
    [E("Progressive aerobic conditioning","30–40 min","Build duration then intensity",T.aerobic,T.highInt),
     E("Maintenance resistance","2–3×12–15","Avoid maximal/heavy holds",T.valsalva),
     E("Return to activity/hobbies","as cleared","Gradual, monitored"),
     E("Long-term heart-healthy routine","ongoing","150 min/week goal",T.aerobic)]
  ];

  P.arrhythmia = [
    [E("Warm-up walking","5–10 min","Ease in; note your pulse/rhythm",T.aerobic),
     E("Moderate aerobic","10–15 min","Stay conversational; know your HR limits",T.aerobic),
     E("Breathing practice","3×1 min","No breath-holding"),
     E("Gentle mobility","3×10","Loosen up")],
    [E("Aerobic conditioning","15–20 min","Keep HR below any prescribed cap",T.aerobic,T.highInt),
     E("Light resistance","2×12–15","Exhale on effort, avoid maximal holds",T.grip,T.valsalva),
     E("Balance & mobility","3×30s","Near support if needed",T.balance),
     E("Symptom monitoring","every session","Stop for palpitations, dizziness, faintness")],
    [E("Progressive aerobic","20–30 min","Within HR/RPE limits",T.aerobic,T.highInt),
     E("Whole-body resistance","2×12–15","Controlled breathing",T.valsalva),
     E("Functional endurance","10 min","Daily-task capacity",T.wb),
     E("Know your device limits","ongoing","Stay below any ICD/pacemaker threshold",T.highInt)],
    [E("Aerobic maintenance","30+ min most days","Consistent, moderate",T.aerobic,T.highInt),
     E("Maintenance resistance","2–3×12–15","No maximal exertion",T.valsalva),
     E("Active lifestyle","ongoing","Movement throughout the day"),
     E("Long-term monitored routine","ongoing","Keep your care team informed",T.aerobic)]
  ];

  /* ================= PULMONARY — additional distinct protocols ================= */
  P.ild = [
    [E("Pursed-lip breathing","several × day","Manage breathlessness & desaturation"),
     E("Very short walking bouts","3–5 × 1–2 min","Use O₂ as prescribed; watch SpO₂",T.aerobic),
     E("Seated limb movements","3×10","Gentle, no breath-holding",T.breath),
     E("Recovery positions","as needed","Lean forward, relax shoulders")],
    [E("Interval walking (SpO₂-guided)","10 min total","Rest to keep saturation up",T.aerobic),
     E("Light resistance (small muscles)","1×10–12","Exhale on effort",T.grip,T.valsalva),
     E("Breathing-coordinated movement","3×10","Sync with breath"),
     E("Balance & standing tolerance","3×30s","Near support",T.balance)],
    [E("Graded aerobic (monitored)","12–20 min","Keep SpO₂ above your prescribed level",T.aerobic,T.highInt),
     E("Progressive light resistance","2×10–12","Whole body, paced",T.valsalva),
     E("Functional endurance","8–10 min","Daily tasks, with rests",T.wb,T.aerobic),
     E("Energy conservation","ongoing","Plan activity around rest")],
    [E("Aerobic maintenance (paced)","20–25 min","Consistency over intensity",T.aerobic,T.highInt),
     E("Maintenance resistance","2×12","Light–moderate",T.valsalva),
     E("Breathlessness self-management","ongoing","Positions, pacing, oxygen"),
     E("Long-term supervised routine","ongoing","Stay linked to pulmonary rehab",T.aerobic)]
  ];

  P.thoracic_surgery = [
    [E("Deep breathing & incentive spirometry","several × day","Re-expand the lungs, prevent complications"),
     E("Airway clearance (huff/supported cough)","as prescribed","Splint the incision with a pillow"),
     E("Shoulder & arm ROM (operated side)","3×10","Prevent stiffness, within comfort",T.overhead),
     E("Short walks","5–10 min","Frequent, easy pace",T.aerobic)],
    [E("Walking endurance","10–15 min","Pace with breathing, use O₂ if prescribed",T.aerobic),
     E("Posture & scapular work","3×12","Counter guarding around the incision"),
     E("Light resistance (respect precautions)","1×12–15","Avoid heavy pushing/pulling early",T.grip,T.valsalva),
     E("Breathing-coordinated movement","3×10","Sync breath with effort")],
    [E("Aerobic build","15–25 min","Interval or continuous, moderate",T.aerobic,T.highInt),
     E("Progressive resistance","2×10–15","Whole body, controlled breathing",T.valsalva),
     E("Full shoulder/thoracic mobility","3×10","Restore range",T.overhead),
     E("Functional endurance","10 min","Stairs, carrying — paced",T.wb,T.aerobic)],
    [E("Aerobic maintenance","20–30 min","Most days, paced",T.aerobic,T.highInt),
     E("Maintenance resistance","2×12–15","Light–moderate",T.valsalva),
     E("Return to activity/work","as cleared","Gradual, breathing-led"),
     E("Long-term active routine","ongoing","Keep lungs & body conditioned",T.aerobic)]
  ];

  P.pulm_hypertension = [
    [E("Very gentle walking","3–5 × 1–2 min","Low intensity ONLY; stop for dizziness/chest pressure",T.aerobic),
     E("Pursed-lip breathing","several × day","Never hold your breath",T.breath),
     E("Seated gentle mobility","3×10","No straining or heavy effort",T.valsalva),
     E("Symptom awareness","every session","Stop for lightheadedness, chest pain, fainting")],
    [E("Low-intensity walking","8–12 min","Keep it conversational and easy",T.aerobic),
     E("Very light resistance","1×10–12","Small muscles, exhale on effort — no heavy loads",T.grip,T.valsalva),
     E("Breathing-coordinated movement","3×10","Calm, controlled"),
     E("Balance near support","3×20s","Fall safety",T.balance)],
    [E("Low–moderate aerobic (supervised)","12–20 min","Only within your prescribed limits",T.aerobic,T.highInt),
     E("Light resistance","1–2×12","No breath-holding, no maximal effort",T.valsalva,T.breath),
     E("Functional endurance","8 min","Gentle daily tasks",T.wb),
     E("Pacing & rest","ongoing","Avoid exertional symptoms")],
    [E("Maintenance low–moderate aerobic","15–25 min","Consistency, never maximal",T.aerobic,T.highInt),
     E("Maintenance light resistance","2×12","Light only",T.valsalva),
     E("Energy conservation","ongoing","Balance activity and rest"),
     E("Long-term specialist-guided routine","ongoing","Exercise only as your PH team advises",T.aerobic)]
  ];

  P.asthma = [
    [E("Thorough warm-up","10–15 min","Gradual — reduces exercise-induced symptoms",T.aerobic),
     E("Pre-exercise inhaler (per action plan)","as prescribed","Use reliever beforehand if advised"),
     E("Breathing (nasal, relaxed)","3×1 min","Warm, humidified air helps"),
     E("Easy aerobic","10–15 min","Build gradually; carry your reliever",T.aerobic)],
    [E("Interval aerobic","15–20 min","Intervals suit exercise-induced asthma well",T.aerobic,T.highInt),
     E("Resistance training","2×10–15","Normal breathing, exhale on effort",T.valsalva),
     E("Core & mobility","3×10","Whole-body conditioning"),
     E("Cool-down","5–10 min","Gradual — avoids post-exercise symptoms",T.aerobic)],
    [E("Progressive aerobic","20–30 min","Swimming/cycling are well tolerated",T.aerobic,T.highInt),
     E("Full-body resistance","2–3×10–15","Controlled breathing",T.valsalva),
     E("Higher-intensity intervals","as tolerated","With good warm-up",T.highInt),
     E("Trigger management","ongoing","Avoid cold/pollen triggers where possible")],
    [E("Aerobic maintenance","150+ min/week","Fitness reduces symptom burden",T.aerobic),
     E("Resistance 2–3×/week","2×12–15","Progressive",T.valsalva),
     E("Sport participation","as tolerated","Well-controlled asthma → full activity",T.impact),
     E("Action-plan review","ongoing","Keep your asthma plan up to date")]
  ];

  /* ================= DEDICATED PROTOCOLS (were generic aliases) ================= */
  P.shoulder_instability = [
    [E("Scapular setting & 'clock' control","3×10","Control the shoulder blade first"),
     E("Isometric rotator cuff (safe range)","3×10s","Press into a towel, elbow at your side",T.grip),
     E("Pendulum swings","3×30s","Relaxed small circles"),
     E("Gentle rhythmic stabilization","3×20s","Light hand-on-wall perturbations",T.balance)],
    [E("Band external rotation (neutral)","3×15","Elbow tucked; avoid end-range early"),
     E("Band internal rotation","3×15","Controlled"),
     E("Scapular rows & retraction","3×15","Squeeze the blades back"),
     E("Closed-chain wall stabilization","3×30s","Hand on wall, small circles",T.balance)],
    [E("Progressive cuff strengthening","3×12","Add resistance weekly",T.grip),
     E("Prone Y-T-W raises","3×10 each","Build scapular control",T.prone),
     E("Controlled-range external rotation","3×12","Increase range gradually",T.overhead),
     E("Loaded rhythmic stabilization","3×30s","Multi-direction control",T.balance)],
    [E("Plyometric ball drills","3×12","Light, controlled catches",T.highInt),
     E("Overhead pressing (progressive)","3×10","Only when stable & pain-free",T.overhead,T.valsalva),
     E("Perturbation & reactive control","3×30s","Prepare for real demands",T.balance),
     E("Sport / contact-specific loading","as tolerated","Avoid the apprehension position",T.overhead)]
  ];

  P.knee_meniscus = [
    [E("Quad sets","3×10 (5s hold)","Tighten thigh, keep knee straight"),
     E("Straight-leg raises","3×10","Knee locked"),
     E("Heel slides (comfortable range)","3×12","Avoid deep bend early",T.deepHipFlex),
     E("Ankle pumps & patellar mobilizations","3×15","Control swelling")],
    [E("Mini squats (0–60°)","3×12","Avoid deep flexion & twisting early",T.wb),
     E("Stationary bike (light)","10–15 min","Low resistance",T.aerobic),
     E("Hamstring curls","3×12","Slow, controlled"),
     E("Glute bridges","3×12","Drive through the heels")],
    [E("Progressive leg press (controlled range)","3×10","No deep loaded flexion for repairs",T.wb),
     E("Step-ups & step-downs","3×10 each","Control, no knee collapse",T.wb,T.balance),
     E("Single-leg balance","3×30s","Rebuild knee stability",T.balance),
     E("Calf raises","3×15","Full range")],
    [E("Return to deeper squats (if cleared)","3×10","Progress range gradually",T.wb),
     E("Agility & pivoting (staged)","3×6","Avoid forced twisting until cleared",T.impact),
     E("Jogging progression","walk/run plan","When strength & control return",T.impact),
     E("Sport-specific drills","as tolerated","Pain- & swelling-guided",T.impact)]
  ];

  P.radiculopathy_lumbar = [
    [E("Directional-preference movements (often extension)","hourly ×5","Find the direction that centralizes symptoms",T.ext),
     E("Sciatic / femoral nerve glides","3×10","Gentle floss — do NOT stretch into pain"),
     E("Pelvic tilts & gentle core","3×12","Pain-free control"),
     E("Frequent walking","5–10 min ×2/day","Movement calms the nerve",T.aerobic)],
    [E("Repeated directional loading","3×10","Continue what centralizes symptoms",T.ext),
     E("Bird-dog","3×10 each","Segmental control, hips level"),
     E("Glute bridges","3×12","Support the spine"),
     E("Progressive nerve mobilization","3×10","Slider → tensioner as tolerated")],
    [E("Core endurance (planks, side planks)","3×20–40s","Build spinal support"),
     E("Hip hinge patterning","3×12","Protect the disc & nerve",T.flexLoad),
     E("Progressive leg strengthening","3×12","Squats/steps as tolerated",T.wb),
     E("Walking endurance","15–25 min","Build tolerance",T.aerobic)],
    [E("Loaded lifting mechanics","3×8","Neutral spine, add load slowly",T.flexLoad,T.valsalva),
     E("Return-to-activity conditioning","3×10","Task-specific",T.wb),
     E("Impact reintroduction (if relevant)","gradual","When symptoms have settled",T.impact),
     E("Relapse-prevention routine","ongoing","Keep moving, manage load")]
  ];

  P.radiculopathy_cervical = [
    [E("Cervical retraction (chin tuck)","hourly ×5","Often centralizes arm symptoms"),
     E("Median / ulnar / radial nerve glides","3×10","Gentle floss, don't reproduce pain"),
     E("Scapular setting","3×12","Support neck posture"),
     E("Gentle pain-free ROM","3×8","Within comfort",T.endNeck)],
    [E("Deep neck flexor holds","3×10s","Chin tuck + hold"),
     E("Postural retraining","3×1 min","Reduce forward-head load"),
     E("Band rows","3×15","Squeeze the mid-back"),
     E("Progressive nerve mobilization","3×10","Slider → tensioner")],
    [E("Scapular strengthening (Y-T-W)","3×10 each","Light, controlled",T.prone),
     E("Deep neck flexor endurance","3×15s","Build support"),
     E("Thoracic mobility / extension","3×10","Offload the neck",T.ext),
     E("Rows & band pull-aparts","3×15","Build capacity")],
    [E("Progressive loaded rows & carries","3×10","Build neck/shoulder capacity",T.grip),
     E("Postural endurance drills","3×45s","Hold tall posture"),
     E("Work/sport-specific loading","as tolerated","Gradual"),
     E("Return to full activity","as tolerated","Symptom-guided")]
  ];

  P.sacroiliac = [
    [E("Pelvic tilts & gentle core","3×12","Find pain-free control"),
     E("Glute sets & bridges","3×12","Activate pelvic 'force closure'"),
     E("Adductor & abductor isometrics","3×10s","Compress and stabilize the pelvis"),
     E("Walking (short, frequent)","5–10 min ×2/day","Even, symmetric stride",T.aerobic)],
    [E("Single-leg bridge","3×10 each","Keep the pelvis level"),
     E("Bird-dog","3×10 each","Anti-rotation control"),
     E("Clamshells & side-lying abduction","3×15 each","Glute-med control"),
     E("Hip hinge (light)","3×12","Symmetric loading")],
    [E("Split squats (symmetric loading)","3×10 each","Brace the core",T.wb),
     E("Side plank","3×20–40s","Lateral stability"),
     E("Pallof press (anti-rotation)","3×12 each","Resist the twist"),
     E("Step-ups","3×10 each","Keep the pelvis level",T.wb,T.balance)],
    [E("Progressive loaded hinge / squat","3×8","Neutral, symmetric",T.valsalva,T.flexLoad),
     E("Loaded carries","3×30m","Braced trunk",T.grip),
     E("Return to activity / sport","as tolerated","Progress gradually",T.impact),
     E("Relapse-prevention routine","ongoing","Glute & core maintenance")]
  ];

  P.fracture_ue = [
    [E("Gentle ROM of cast-free joints","3×10","Within pain-free range"),
     E("Isometric holds (nearby muscles)","3×10s","Keep strength without moving the bone"),
     E("Finger/hand pumps & circulation","3×20","Reduce swelling, keep fingers mobile"),
     E("Keep neighbouring joints moving","3×10","Shoulder/elbow/wrist as allowed")],
    [E("Active ROM progression","3×12","Restore full motion"),
     E("Light band resistance","3×15","Rebuild muscle gently"),
     E("Grip & forearm activation","3×15","Soft-ball squeezes",T.grip),
     E("Gentle stretching","3×30s","Ease stiffness")],
    [E("Progressive resistance","3×12","Add load weekly once healing is confirmed"),
     E("Grip work & loaded carries","3×30m","Rebuild function",T.grip),
     E("Functional reaching & lifting","3×10","Daily tasks"),
     E("Whole-body conditioning","10–20 min","Rebuild capacity",T.aerobic)],
    [E("Strength to near-normal","3×10","Match the other side",T.valsalva),
     E("Weight-bearing through the arm (if cleared)","3×10","Wall → floor push-ups",T.wb),
     E("Activity/sport-specific drills","as tolerated","Progress slowly"),
     E("Return to full activity","as tolerated","Symptom- & clearance-guided")]
  ];

  P.fracture_le = [
    [E("Ankle pumps & circulation","3×20","Reduce swelling & clot risk"),
     E("Isometric quad/glute/calf sets","3×10s","Maintain strength without loading the bone"),
     E("Gentle ROM of cast-free joints","3×10","Within pain-free range"),
     E("Follow your weight-bearing status","per surgeon","Non- or partial-weight-bearing as instructed",T.wb)],
    [E("Progressive weight-bearing (per surgeon)","per status","Partial → full as cleared",T.wb),
     E("Active ROM progression","3×12","Restore full motion"),
     E("Light resistance (band)","3×15","Rebuild muscle gently"),
     E("Seated/standing balance","3×30s","Near support",T.balance)],
    [E("Progressive resistance","3×12","Add load weekly once healing is confirmed",T.wb),
     E("Gait retraining","3×20m","Even, symmetric steps",T.wb,T.balance),
     E("Functional movements","3×10","Sit-to-stand, step-ups",T.wb),
     E("Endurance work","10–20 min","Rebuild capacity",T.aerobic)],
    [E("Strength to near-normal","3×10","Match the other side",T.valsalva),
     E("Impact reintroduction (if cleared)","gradual","Only once the bone is healed",T.impact),
     E("Balance & agility","as tolerated","Fall prevention",T.balance),
     E("Return to full activity","as tolerated","Symptom- & clearance-guided",T.impact)]
  ];

  P.amputation_le = [
    [E("Residual-limb positioning (prevent flexion contracture)","several × day","Avoid prolonged hip/knee bending"),
     E("Residual-limb desensitization","several × day","Tapping, textures, gentle massage"),
     E("Core & sound-limb strengthening","as able","Prepare for the prosthesis"),
     E("Seated / arm cardio","10–15 min","Maintain fitness",T.aerobic)],
    [E("Residual-limb strengthening (hip/knee)","3×12","Build for socket load"),
     E("Sitting & standing balance","3×30s","Near support",T.balance),
     E("Hip & knee flexor stretches","3×30s","Prevent contracture"),
     E("Prosthetic tolerance (per prosthetist)","graded","Wear schedule & socket fit",T.wb)],
    [E("Gait training with prosthesis","per team","Even steps, near support",T.wb,T.balance),
     E("Progressive lower-limb strength","3×12","Glutes, quads, core",T.wb),
     E("Endurance building","15–25 min","Rebuild stamina",T.aerobic),
     E("Functional transfers & steps","3×10","Real-life mobility",T.wb)],
    [E("Advanced balance & agility","as tolerated","Confidence on the prosthesis",T.balance),
     E("Community mobility (terrain, stairs, ramps)","progressive","Uneven ground",T.wb),
     E("Recreation / sport adaptation","as tolerated","Adaptive options"),
     E("Return to activity","as tolerated","Team-guided")]
  ];

  P.amputation_ue = [
    [E("Residual-limb positioning & desensitization","several × day","Reduce sensitivity, prevent contracture"),
     E("Gentle ROM (shoulder/elbow as relevant)","3×10","Maintain full motion"),
     E("Core & sound-limb strengthening","as able","Prepare for the prosthesis"),
     E("Seated cardio","10–15 min","Maintain fitness",T.aerobic)],
    [E("Residual-limb & shoulder-girdle strengthening","3×12","Build for prosthesis control"),
     E("Muscle-site activation (per team)","3×10","Isolate control signals for myoelectric use"),
     E("Scapular & posture work","3×12","Support the prosthesis"),
     E("Chest & shoulder stretches","3×30s","Prevent tightness",T.overhead)],
    [E("Prosthetic control training (per team)","graded","Open/close, grip, positioning"),
     E("Progressive whole-body strengthening","3×12","Rebuild capacity"),
     E("Bimanual functional tasks","3×10","Real-life two-handed activities"),
     E("Endurance / conditioning","15–20 min","Rebuild stamina",T.aerobic)],
    [E("Advanced prosthetic skills","as tolerated","Fine control & speed"),
     E("Functional independence tasks","progressive","Work & home activities"),
     E("Recreation / sport adaptation","as tolerated","Adaptive options"),
     E("Return to activity","as tolerated","Team-guided")]
  ];

  /* ================= ALIASES ================= */
  const ALIAS = {
    shoulder_instability:"shoulder", knee_meniscus:"knee_ligament",
    radiculopathy_cervical:"cervical", radiculopathy_lumbar:"lumbar", sacroiliac:"lumbar",
    fracture_ue:"fracture", fracture_le:"fracture", amputation_ue:"amputation", amputation_le:"amputation"
  };
  function getProtocol(key) { return P[key] || P[ALIAS[key]] || P.general_msk; }

  /* ================= CONTRAINDICATION ENGINE ================= */
  // flag -> { avoid:[tags removed], caution:[tags flagged], note, clearance:bool }
  const RULES = {
    cardiac: { avoid:[T.valsalva,T.breath,T.grip,T.highInt], caution:[T.aerobic],
      clearance:true,
      note:"Heart condition: get medical clearance and ideally join a supervised cardiac-rehab program. Keep effort light–moderate (RPE 11–13, able to talk), avoid heavy lifting, breath-holding, and straining. Stop immediately for chest pain, unusual breathlessness, palpitations, or dizziness." },
    hypertension: { avoid:[T.valsalva,T.breath,T.grip], caution:[T.highInt,T.inversion],
      note:"High blood pressure: never hold your breath — exhale on effort. Avoid heavy isometric/grip holds and head-down positions. Favor moderate aerobic exercise, which lowers BP." },
    pulmonary: { avoid:[T.breath], caution:[T.highInt,T.aerobic],
      clearance:true,
      note:"Lung condition: pace with your breathing, use pursed-lip breathing, and use prescribed oxygen. Keep intensity moderate and rest as needed; monitor SpO₂ if you have a pulse oximeter." },
    osteoporosis: { avoid:[T.impact,T.flexLoad], caution:[T.endNeck,T.highInt],
      note:"Low bone density: avoid high-impact moves and loaded/repeated spinal flexion (deep bending/crunches). Favor upright, weight-bearing and resistance work with good posture — these build bone safely." },
    recent_fracture: { avoid:[], caution:[T.wb,T.impact,T.highInt],
      clearance:true,
      note:"Healing fracture: follow the weight-bearing status your surgeon gave you. Reintroduce impact only once the bone is confirmed healed." },
    hip_replacement: { avoid:[T.deepHipFlex,T.hipAddIR], caution:[T.impact],
      clearance:true,
      note:"Hip-replacement precautions (typically first 6–12 weeks): don't bend the hip past ~90°, don't cross your legs/midline, and don't turn the foot inward. Follow your surgeon's specific precautions." },
    knee_replacement: { avoid:[], caution:[T.impact,T.highInt],
      clearance:true,
      note:"Knee replacement: prioritize regaining full straightening and bend early; progress load gradually and avoid high-impact activities." },
    balance_risk: { avoid:[T.impact], caution:[T.balance],
      note:"Balance/falls risk: do all balance and standing work beside a sturdy rail, counter, or in a corner, ideally with someone nearby. Progress difficulty slowly." },
    neuropathy: { avoid:[], caution:[T.balance,T.impact,T.wb],
      note:"Reduced sensation: inspect your feet/hands before and after exercise, wear protective footwear, and use support for balance since you may not feel your position well." },
    dvt: { avoid:[T.highInt], caution:[T.aerobic],
      clearance:true,
      note:"Clot history / blood thinners: get clearance before vigorous exercise. Seek urgent care for new calf pain/swelling/warmth or sudden breathlessness or chest pain." },
    pregnancy: { avoid:[T.supine,T.valsalva,T.prone,T.inversion,T.breath], caution:[T.impact,T.balance,T.highInt],
      note:"Pregnancy: after the first trimester avoid lying flat on your back and face-down positions; avoid breath-holding, stay cool and hydrated. Stop for bleeding, dizziness, contractions, or fluid leakage and contact your provider." },
    seizure: { avoid:[], caution:[T.inversion,T.impact],
      note:"Seizure history: avoid exercising alone, at height, or in water unsupervised; avoid inverted positions if these are triggers." },
    recent_surgery: { avoid:[], caution:[T.highInt,T.impact,T.wb,T.valsalva],
      clearance:true,
      note:"Recent surgery: follow your surgeon's protocol and get clearance before progressing. Treat this plan as general guidance to discuss with your care team." },
    diabetes: { avoid:[], caution:[T.impact],
      note:"Diabetes: check glucose around exercise, carry fast-acting carbs, stay hydrated, and take care of your feet (good shoes, daily checks)." },
    pacemaker_icd: { avoid:[], caution:[T.highInt],
      note:"Pacemaker/ICD: keep your heart rate below any limit your cardiologist set and avoid maximal exertion; know your device's settings." },
    cardiac_icd: { avoid:[T.highInt], caution:[T.valsalva,T.impact,T.breath], clearance:true,
      note:"Implanted defibrillator (ICD / CRT-D): keep your heart rate WELL BELOW the device's therapy threshold — going above it can trigger a shock. Stay light–moderate (RPE ≤13), skip maximal / high-intensity efforts, and avoid breath-holding and heavy straining. Confirm your safe heart-rate ceiling with your cardiologist and, ideally, join supervised cardiac rehab." },
    cardiac_lvad: { avoid:[T.highInt,T.impact,T.valsalva,T.breath], caution:[T.aerobic], clearance:true,
      note:"Left ventricular assist device (LVAD): heart rate and blood pressure are unreliable with continuous flow — judge effort by RPE / the talk-test only. Avoid contact, high-impact activity and breath-holding / straining, protect the driveline site, and follow your VAD team's exercise plan exactly." },
    // ---- additional medical-history conditions (from the intake form) ----
    pad: { avoid:[], caution:[T.highInt],
      note:"Peripheral artery disease / poor leg circulation: a structured walking program is the best-evidenced treatment — walk to moderate calf (claudication) pain, rest until it eases, then repeat. Stop for chest pain; report new coldness, numbness, or a non-healing wound." },
    bleeding_disorder: { avoid:[T.impact], caution:[T.highInt],
      note:"Bleeding disorder / on blood thinners: avoid contact and high-impact activity (bruising/bleeding risk) and take extra care to prevent falls. Seek care for a newly swollen or painful joint or muscle, or any unusual bleeding." },
    fatigue: { avoid:[], caution:[T.highInt,T.aerobic],
      note:"Chronic fatigue / post-viral / long COVID: PACE carefully to avoid post-exertional 'crashes' — keep bouts short, rest between, and progress only when you recover well. Scale back if symptoms flare rather than pushing through." },
    inflammatory_arthritis: { avoid:[], caution:[T.impact,T.highInt],
      note:"Inflammatory arthritis (rheumatoid, psoriatic, ankylosing spondylitis, gout, lupus): favour gentle range-of-motion and low-impact strengthening, protect the joints, and do LESS during a flare — build back gradually. Swimming and cycling are ideal. Coordinate with your rheumatology team." },
    hypermobility: { avoid:[], caution:[],
      note:"Very flexible / hypermobile joints (hEDS): favour controlled MID-RANGE strengthening and stability over stretching, don't push into end-range, and progress load steadily — good control protects loose joints." },
    neuro_condition: { avoid:[], caution:[T.balance,T.impact,T.highInt],
      note:"Neurological condition (MS, Parkinson's, prior stroke): do balance and standing work near sturdy support, watch for fatigue and (for MS) heat sensitivity — keep cool and pace effort. Practise the specific movements you want to keep, safely and often." },
    ckd: { avoid:[], caution:[T.highInt],
      note:"Chronic kidney disease: moderate exercise is safe and helpful — build up gradually around fatigue, watch your blood pressure, and follow any fluid limits. If you have a dialysis fistula, avoid heavy loading and blood-pressure cuffs on that arm." },
    cancer_treatment: { avoid:[], caution:[T.highInt,T.impact], clearance:true,
      note:"Cancer / active treatment (chemo, radiation, recent surgery): exercise helps, but pace around fatigue and keep intensity moderate — and get your oncology team's clearance. If there is any bone involvement, avoid high-impact and heavy loading of that area." },
    lymphedema: { avoid:[], caution:[T.grip],
      note:"Lymphedema (or lymph nodes removed): resistance exercise is safe and helpful when introduced GRADUALLY — build load slowly, wear compression if prescribed, and watch the limb for increased swelling. Protect the skin to avoid infection." },
    chronic_pain: { avoid:[], caution:[],
      note:"Chronic / widespread pain (e.g. fibromyalgia): gentle, PACED, graded exercise is the best-evidenced treatment — start low, go slow, and avoid boom-and-bust. Some flare is normal and safe; consistency matters more than intensity." },
    reflux: { avoid:[], caution:[T.inversion,T.flexLoad],
      note:"Acid reflux (GORD) / hiatal hernia: avoid head-down and inverted positions and lying flat right after eating, and ease off hard abdominal-flexion (crunch-type) work — upright, moderate exercise is best." },
    hernia: { avoid:[T.valsalva,T.breath], caution:[T.highInt,T.impact],
      note:"Abdominal / groin hernia (not yet repaired): don't hold your breath or strain (breathe out on effort) and avoid heavy lifting and hard core work that makes the abdomen bulge. Seek urgent care for a painful, firm bulge you can't push back in." },
    // ---- special surgical-site precautions (set from the Precautions card) ----
    sternal_precautions: { avoid:[T.overhead], caution:[T.valsalva,T.breath,T.grip,T.highInt,T.impact], clearance:true,
      note:"Sternal precautions (open-heart surgery through the breastbone): the sternum takes ~6–8 weeks to heal, so protect it — don't lift, push or pull more than ~5–10 lb with your arms, keep both elbows near your sides (no reaching overhead/behind with both arms), don't push up from a chair with your arms, and hug a pillow to your chest when you cough. Pushing, pulling, pressing, overhead and carrying exercises were removed; focus on walking, gentle legs and breathing work. Follow your surgeon's timeline and, ideally, attend supervised cardiac rehab." },
    abdominal_precautions: { avoid:[T.valsalva,T.breath,T.flexLoad], caution:[T.highInt,T.impact,T.wb], clearance:true,
      note:"Abdominal precautions (after abdominal / hernia / C-section surgery): the abdominal wall and incision take ~4–6 weeks to heal — don't lift more than ~5–10 lb (or your surgeon's limit), never hold your breath and bear down (breathe out on effort), and skip sit-ups, crunches, planks and leg-lowers for now. Support the incision when you cough and log-roll out of bed. Report a new bulge, increasing pain, or wound drainage, and follow your surgeon's timeline." },
    // ---- symptom / red-flag screen (from the medical-intake questions) ----
    red_flags: { avoid:[], caution:[], clearance:true,
      note:"You flagged a possible warning sign (e.g. unexplained weight loss, constant or night pain, fever with your symptoms, a cancer history, spreading numbness/weakness, or a major injury). These can occasionally point to something beyond a routine musculoskeletal problem — please get assessed by a clinician before starting so anything serious is ruled out first." },
    red_flags_urgent: { avoid:[], caution:[], clearance:true,
      note:"⛔ Loss of bladder or bowel control, or numbness around the groin/inner thighs, can signal a medical emergency (cauda equina syndrome). Do not exercise — seek urgent medical care now." },
    smoker: { avoid:[], caution:[],
      note:"Smoking slows tendon, bone, and wound healing and lowers exercise capacity — even cutting down helps your recovery. Ask your clinician about support to quit; keep well hydrated and warm up thoroughly." },
    // ---- objective vital-sign-derived rules (from the resting HR, blood pressure & SpO₂ you entered) ----
    vital_bp_high: { avoid:[T.valsalva,T.breath,T.grip], caution:[T.highInt,T.inversion,T.impact],
      note:"The blood pressure you entered is high: never hold your breath (exhale on effort), skip heavy isometric/grip holds and head-down positions, and keep to moderate aerobic effort (RPE 11–13). Recheck at rest — if it stays high, get it reviewed before harder exercise." },
    vital_bp_crisis: { avoid:[T.valsalva,T.breath,T.grip,T.highInt,T.impact], caution:[T.aerobic],
      clearance:true,
      note:"The blood pressure you entered is very high: do NOT do vigorous exercise until it is rechecked and controlled. Seek urgent care for chest pain, a severe headache, vision changes, or breathlessness." },
    vital_tachy: { avoid:[], caution:[T.highInt,T.aerobic],
      note:"The resting heart rate you entered is high: build intensity gradually, judge effort by RPE / the talk-test rather than pace, and get it checked if it stays elevated at rest." },
    vital_brady: { avoid:[], caution:[T.highInt],
      note:"The resting heart rate you entered is low: if you also feel dizzy, faint, or unusually breathless, get it checked before harder exercise; otherwise warm up well and progress intensity gradually." },
    vital_hypoxia: { avoid:[T.highInt], caution:[T.aerobic],
      clearance:true,
      note:"The oxygen saturation you entered is low: keep effort light, monitor SpO₂ during exercise, use prescribed oxygen, and get this reviewed before progressing. Stop if SpO₂ falls below your clinician's threshold or you feel very breathless." },
    // ---- weight-bearing orders (from the Precautions card) ----
    wb_nwb: { avoid:[T.wb,T.impact,T.balance], caution:[T.highInt],
      note:"Non-weight-bearing (NWB): keep ALL weight off the affected limb — no standing or stepping on it; use your crutches/walker as instructed. Standing, weight-bearing, balance and impact exercises for that limb have been removed — do the seated, lying, core and other-limb work instead until your order changes." },
    wb_ttwb: { avoid:[T.impact], caution:[T.wb,T.balance,T.highInt],
      note:"Toe-touch / touch-down weight-bearing (TTWB): the foot may rest on the floor only for balance — 'like standing on eggshells' (about the weight of the leg, under ~20 lb), not for support. Load any standing work very lightly and keep using your crutches." },
    wb_pwb: { avoid:[], caution:[T.wb,T.impact,T.highInt],
      note:"Partial weight-bearing (PWB): put only the allowed share of your body weight through the limb. Practise the amount on a bathroom scale so you know how it feels, and progress only as your surgeon allows." },
    wb_wbat: { avoid:[], caution:[T.impact],
      note:"Weight-bearing as tolerated (WBAT): put as much weight through the limb as stays comfortable, using aids as needed and easing off if pain or swelling rises. Progress gradually." },
    // ---- optional medication-derived rules (only applied when the user turns on medication safety filtering) ----
    fluoroquinolone: { avoid:[T.impact], caution:[],
      note:"On a fluoroquinolone antibiotic: high-impact and heavy tendon-loading exercises are removed to protect your tendons (raised Achilles-rupture risk) while taking it and for a few weeks after." },
    med_bleeding: { avoid:[T.impact], caution:[T.balance],
      note:"On blood thinners / antiplatelets: high-impact and high-fall-risk exercises are removed or flagged to reduce bruising and bleeding risk — avoid contact/collision activities." },
    med_sedating: { avoid:[], caution:[T.impact,T.balance],
      note:"On sedating medicines (opioids, sedatives, muscle relaxants, gabapentinoids): balance and high-impact exercises are flagged — do them near sturdy support and only when fully alert." }
  };

  // Apply flags to a phase's exercise list.
  function applyContra(exercises, flags) {
    const avoid = new Set(), caution = new Set();
    for (const f of flags) {
      const r = RULES[f]; if (!r) continue;
      (r.avoid || []).forEach(t => avoid.add(t));
      (r.caution || []).forEach(t => caution.add(t));
    }
    const kept = [], removed = [];
    for (const ex of exercises) {
      const bad = ex.tags.find(t => avoid.has(t));
      if (bad) { removed.push({ n: ex.n, tag: bad }); continue; }
      const warnTag = ex.tags.find(t => caution.has(t));
      kept.push(warnTag ? { ...ex, warn: warnTag } : ex);
    }
    return { kept, removed };
  }

  // Low-risk substitutes used to backfill a phase that filtered down too far.
  const SAFE_SUBS = [
    E("Gentle pain-free range-of-motion","3×10","Keep the area moving comfortably"),
    E("Diaphragmatic breathing","3×1 min","Slow, relaxed — never hold your breath"),
    E("Supported standing or seated balance","3×30s","Beside a rail or counter",T.balance),
    E("Easy walking (as tolerated)","10–15 min","Conversational pace",T.aerobic),
    E("Gentle isometric holds","3×10s","Light muscle activation, breathe normally"),
    E("Postural & mobility drills","3×10","Move within comfort")
  ];
  // Ensure a filtered phase keeps at least `min` safe exercises.
  function ensureMinimum(kept, flags, min = 3) {
    if (kept.length >= min) return kept;
    const have = new Set(kept.map(e => e.n));
    const { kept: safe } = applyContra(SAFE_SUBS.filter(e => !have.has(e.n)), flags);
    for (const e of safe) { if (kept.length >= min) break; kept.push({ ...e, sub: true }); }
    return kept;
  }

  function notesForFlags(flags) {
    const notes = [];
    for (const f of flags) { const r = RULES[f]; if (r && r.note) notes.push(r.note); }
    return notes;
  }
  function needsClearance(flags) {
    return flags.some(f => RULES[f] && RULES[f].clearance);
  }

  // export
  window.PROTOCOLS = P;
  window.PROTOCOL_ALIAS = ALIAS;
  window.CONTRA_RULES = RULES;
  window.getProtocol = getProtocol;
  window.applyContra = applyContra;
  window.ensureMinimum = ensureMinimum;
  window.notesForFlags = notesForFlags;
  window.needsClearance = needsClearance;
})();
