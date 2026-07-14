/* Generate data/adl-exercises.js — functional / occupational-therapy practice
   exercises that rebuild the capability behind everyday tasks (ADLs). Each is
   tagged with a functional AREA and a TIER (1=foundational → 4=advanced) so the
   program can inject the right task-practice into the right phase based on how
   hard the user rated that activity. Contra tags (same vocabulary as the main
   library) let applyContra() keep them within the user's precautions.
   Each entry: { n, area, tier, d, c, tags }.
   Dependency-free & deterministic (no Date/Math.random). */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "adl-exercises.js");

/* base functional-practice exercises per area: [name, tier, dose, cue].
   tags come from AREA_TAGS below. */
const AREA_TAGS = {
  transfers:["weight_bearing"], stairs:["weight_bearing","balance"], reach_high:["overhead"],
  reach_low:["deep_hip_flexion","spine_flexion_load"], hand_fine:[], grip:["grip_isometric"],
  dress_upper:[], dress_lower:["deep_hip_flexion"], walking:["weight_bearing","aerobic"],
  carrying:["weight_bearing","grip_isometric"], balance:["balance"], bathing:["weight_bearing","balance"],
  toileting:["weight_bearing"], grooming:[], eating:[], cooking:["weight_bearing"],
  housework:["weight_bearing"], laundry:["deep_hip_flexion","spine_flexion_load"], shopping:["weight_bearing","aerobic"],
  driving:[], cognition:[], sitting:[], standing:["weight_bearing"], writing:[]
};
const AREA_LABEL = {
  transfers:"Getting up & transfers", stairs:"Stairs & steps", reach_high:"Reaching up",
  reach_low:"Bending & reaching low", hand_fine:"Fine motor & dexterity", grip:"Grip & opening things",
  dress_upper:"Upper-body dressing", dress_lower:"Lower-body dressing", walking:"Walking & endurance",
  carrying:"Carrying & lifting", balance:"Balance & steadiness", bathing:"Bathing & showering",
  toileting:"Toileting", grooming:"Grooming & hygiene", eating:"Eating & drinking",
  cooking:"Cooking & kitchen", housework:"Housework", laundry:"Laundry",
  shopping:"Shopping & community", driving:"Driving & getting in the car", cognition:"Thinking & organising",
  sitting:"Sitting tolerance", standing:"Standing tolerance", writing:"Handwriting & typing"
};

const BASES = {
  transfers:[
    ["Sit-to-stand from a chair",2,"3×8","Nose over toes; push evenly through both heels"],
    ["Sit-to-stand to a raised seat",1,"3×8","Start high (add a cushion), lower it as you improve"],
    ["Sit-to-stand, hands-free",3,"3×8","Fold your arms; control the way down"],
    ["Repeated sit-to-stands for endurance",3,"1 min","Count how many you manage with good form"],
    ["Squat down to tap a chair and stand",2,"3×10","Tap the seat lightly, don't flop into it"],
    ["Slow lower into the chair (eccentric)",3,"3×6","Take 3–4 seconds to sit down"],
    ["Forward weight-shift in sitting",1,"3×10","Bring your nose over your knees to load your feet"],
    ["Scoot to the edge of the seat before standing",1,"3×8","Shuffle your hips forward first"],
    ["Bed-to-sit practice (roll and push up)",1,"3×5","Roll to your side, drop your legs, push up with your arm"],
    ["Getting up from the floor practice",2,"3×3","Half-kneel to a sturdy chair, then stand"],
    ["Perch-sitting at a counter",2,"3×30s","Half-sit and take some weight through your legs"],
    ["Car-transfer practice (sit then swing legs in)",1,"3×5","Sit back first, then swing both legs together"],
    ["Sit-to-stand to alternating seat heights",3,"3×8","Vary how low the seat is each set"]
  ],
  stairs:[
    ["Step-ups onto a step (lead each leg)",2,"3×8 each","Whole foot on the step; stand up tall"],
    ["Step-downs with control",2,"3×8 each","Lower slowly, don't drop onto the leg"],
    ["Single step up-and-down at a rail",1,"3×10","Hold the rail; one step, repeat"],
    ["Lateral (sideways) step-ups",3,"3×8 each","Step up sideways, knee over your toes"],
    ["Marching on the spot at a rail",1,"3×20","Lift the knees; keep a steady rhythm"],
    ["Calf raises at the stair edge",2,"3×12","Heels up, slow controlled lower"],
    ["Half-flight practice at a rail",2,"3 trips","Up with the stronger leg, down with the weaker"],
    ["Toe taps up to a step",1,"3×15","Tap the step, alternate feet"],
    ["Slow step-downs (eccentric)",3,"3×6 each","Take 3 seconds to lower"],
    ["Stepping over a low object",2,"3×8","Lift the foot right over; steady"],
    ["Box step-ups for endurance",3,"2 min","Steady pace; hold a rail if you need to"],
    ["Stair-climb intervals",3,"5–10 flights","Rest between; build the count over weeks"],
    ["Heel-raise holds on the bottom step",2,"3×20s","Balls of the feet on the edge, hold tall"]
  ],
  reach_high:[
    ["Wall slides (arms up the wall)",1,"3×10","Slide the forearms up as high as is comfy"],
    ["Assisted overhead reach with a stick",1,"3×10","Use the good arm to help the other up"],
    ["Reach to a shoulder-height shelf",2,"3×10","Place and take an object at shoulder height"],
    ["Reach to an overhead shelf",3,"3×8","Reach up and place a light object"],
    ["Band pull-aparts",2,"3×12","Squeeze the shoulder blades; keep it slow"],
    ["Overhead band press",3,"3×10","Press a light band overhead, control down"],
    ["Shoulder flexion raises (light)",2,"3×10","Lift the arm forward and up to comfort"],
    ["Scapular setting ('shoulders back & down')",1,"3×10","Gently set the shoulder blades first"],
    ["Reach across to the opposite high corner",2,"3×8","Diagonal reach up and across"],
    ["Place cans onto a high shelf (practice)",3,"3×8","Use a real light object; controlled"],
    ["Doorway pec stretch",1,"3×20s","Open the chest to make overhead easier"],
    ["Reach behind your head (hair-brushing pattern)",2,"3×10","Hand to the back of your head"],
    ["Standing overhead reach-and-hold",3,"3×10s","Reach up, hold, lower with control"]
  ],
  reach_low:[
    ["Hip hinge to a low surface",1,"3×10","Push the hips back, flat back, hands to a chair"],
    ["Sit-to-floor reach (toward your feet)",1,"3×10","Reach toward your laces without forcing"],
    ["Squat to pick up a light object",2,"3×10","Squat down, keep the object close"],
    ["Half-kneel to reach the floor",2,"3×6 each","Down to one knee, pick up, stand"],
    ["Golfer's pick-up (single-leg reach)",3,"3×6 each","Hinge on one leg, back leg lifts"],
    ["Deadlift pattern with a light load",3,"3×10","Hinge, keep it close, stand tall"],
    ["Reach to your shin / ankle (dressing pattern)",1,"3×10","Cross the ankle up to reach it more easily"],
    ["Low cupboard reach practice",2,"3×8","Squat or half-kneel to a low shelf"],
    ["Toe-touch progression (soft knees)",2,"3×10","Only as far as comfortable"],
    ["Sock-aid / long-reach practice",1,"3×5","Rehearse the reaching pattern slowly"],
    ["Squat-and-reach for a dropped object",2,"3×8","Lower under control, reach, stand"],
    ["Kneel-to-stand from the floor",2,"3×5","Half-kneel, drive up through the front leg"],
    ["Pick up from the floor at a support",1,"3×8","Hold a counter, reach down and up"]
  ],
  hand_fine:[
    ["Pick up and release small objects",1,"3×15","Coins, beads or buttons into a pot"],
    ["Therapy-putty pinch and roll",2,"3×10","Pinch, roll and shape the putty"],
    ["Button-board practice",2,"3×5","Do and undo a row of buttons"],
    ["Zip up and down practice",1,"3×10","Practise starting and running a zip"],
    ["In-hand manipulation (move a coin across your palm)",3,"3×10","Walk the coin finger to finger"],
    ["Finger-to-thumb touches",1,"3×10","Touch each fingertip to the thumb, speed up"],
    ["Peg-board / placing practice",2,"3×15","Place small pegs or objects into holes"],
    ["Threading beads or a lace",2,"3×10","Thread beads onto a string"],
    ["Turn playing cards one at a time",1,"3×10","Flip cards from a pile"],
    ["Pick up a card off a flat table",3,"3×8","Slide it to the edge, then pinch it up"],
    ["Screw a nut onto a bolt",2,"3×8","Practise the twisting/pinch grip"],
    ["Fasten and unfasten a press-stud",2,"3×8","Practise poppers and clasps"],
    ["Handwriting warm-up patterns",1,"3×1 min","Loops and lines to loosen the hand"]
  ],
  grip:[
    ["Grip squeezes (ball or putty)",2,"3×10","Squeeze, hold a second, release"],
    ["Towel wring",2,"3×8","Wring a rolled towel each direction"],
    ["Open-jar practice (loosen a lid)",2,"3×8","Brace the jar against your body; steady twist"],
    ["Turn a doorknob / key drill",1,"3×10","Practise the turning grip both ways"],
    ["Sustained grip hold (carry a weight in place)",3,"3×20s","Hold a light weight; keep breathing"],
    ["Wrist curls (light)",2,"3×12","Slow up and down"],
    ["Finger extensions with a band",2,"3×12","Open the fingers against a light band"],
    ["Pinch-grip holds",2,"3×15s","Pinch a light plate/card and hold"],
    ["Tap-turn practice (taps and dials)",1,"3×10","Rehearse turning a tap on and off"],
    ["Squeeze a sponge dry",1,"3×10","Full squeeze and release"],
    ["Bottle-cap open and close",2,"3×8","Practise the twist-off then re-cap"],
    ["Hand-gripper repetitions",3,"3×12","Full close, controlled open"],
    ["Carry-and-hold a bag for time",3,"3×20s","Build how long you can hold on"]
  ],
  dress_upper:[
    ["Overhead T-shirt practice (arms then head)",2,"3×5","Both arms in first, then over your head"],
    ["Reach the opposite shoulder",1,"3×10","Hand across to the far shoulder"],
    ["Hand-behind-back reach",2,"3×8","Slide the hand up your back (bra/tuck pattern)"],
    ["Buttoning a shirt (button board or real shirt)",2,"3×5","Work top to bottom, unhurried"],
    ["Zip a jacket from the bottom",2,"3×8","Line up and start the zip, then run it"],
    ["Shoulder shrugs and rolls",1,"3×10","Loosen the shoulders before dressing"],
    ["Reach up into a sleeve",1,"3×8","Thread the affected arm first"],
    ["Do up a back-fastening clasp (front then turn)",3,"3×5","Fasten at the front, slide it round"],
    ["Put on / take off a cardigan",2,"3×5","Affected arm in first, out last"],
    ["Reach both hands overhead to dress",3,"3×8","Practise the over-the-head motion"],
    ["Cross-body reach with a light object",2,"3×10","Reach across as if putting an arm through"],
    ["Collar and cuff button practice",2,"3×6","The trickiest buttons, slowly"],
    ["Tie / scarf knotting practice",2,"3×5","Rehearse the knot with both hands"]
  ],
  dress_lower:[
    ["Seated foot-to-opposite-knee (sock pattern)",1,"3×8 each","Cross the ankle up to reach your foot"],
    ["Seated reach to the foot",2,"3×8 each","Hinge forward with a flat back"],
    ["Sock-aid rehearsal",1,"3×5","Practise the reaching-and-pulling pattern"],
    ["Long-handled shoehorn practice",1,"3×5","Guide the heel in without bending fully"],
    ["Seated trouser-pull practice (leg to leg)",1,"3×5","Thread one leg then the other, seated"],
    ["Stand-and-pull-up practice at a support",2,"3×5","Hold a rail, pull trousers up standing"],
    ["Single-leg balance to dress (near support)",3,"3×20s each","Practise standing on one leg to dress"],
    ["Heel-to-buttock stretch (seated)",1,"3×20s","Loosen the knee for reaching the foot"],
    ["Foot-up-on-a-step dressing reach",2,"3×8","Rest the foot on a low step to reach it"],
    ["Lace-tying practice",2,"3×5","Practise the bow with the shoe on your lap"],
    ["Seated hip-out (figure-4) hold",2,"3×20s each","Open the hip to reach the foot"],
    ["Pull-on shoe practice",1,"3×5","Slip-ons with a long shoehorn first"],
    ["Compression-stocking rehearsal",3,"3×3","Practise the roll-and-pull technique"]
  ],
  walking:[
    ["Timed indoor walk",2,"5–10 min","A steady, comfortable pace"],
    ["Interval walking (walk / rest)",2,"6×2 min","Walk, short rest, repeat"],
    ["Marching on the spot",1,"3×30s","Lift the knees; hold support if needed"],
    ["Sit-to-stand-to-walk combo",2,"3×5","Stand up and take a few steps, sit, repeat"],
    ["Walking with turns",2,"3×5 turns","Walk, turn around slowly, continue"],
    ["Figure-of-eight walking",2,"3×3","Walk a smooth figure-eight around markers"],
    ["Outdoor walk (build the distance)",3,"10–20 min","Add ~10% distance each week"],
    ["Walking over a soft/uneven surface",3,"3×20 m","Grass or a mat, near support"],
    ["Backward and sideways stepping",3,"3×10","Small controlled steps, near support"],
    ["Walk-and-carry practice",3,"3×20 m","Carry a light object as you walk"],
    ["Braided (grapevine) side-stepping",3,"3×10 m","Cross one foot over the other"],
    ["Obstacle-course walking",3,"3 laps","Step over and around low objects"],
    ["Long-corridor endurance walk",3,"up to 15 min","Pace yourself; rest as needed"]
  ],
  carrying:[
    ["Farmer-carry hold (light, in place)",2,"3×20s","Stand tall holding a light load"],
    ["Short carry and set-down",2,"3×10 m","Carry a light object, place it gently"],
    ["Suitcase (one-side) carry",3,"3×10 m each","Carry on one side; stay upright"],
    ["Tray-carry practice (two hands)",2,"3×10 m","Keep the load close and level"],
    ["Pick up, carry and place on a shelf",3,"3×6","Lift close, carry, place at waist height"],
    ["Basket carry up and down a step",3,"3×5","Carry a light basket, use the rail"],
    ["Bag-to-bag transfer (unpack shopping)",2,"3×8","Practise lifting items from a bag"],
    ["Front-loaded carry (hug a light box)",2,"3×15s","Hold a light box against your chest"],
    ["Kettle-lift practice (part-full)",2,"3×8","Pour from a part-full jug/kettle"],
    ["Carry while walking a set distance",3,"3×20 m","Steady, controlled steps"],
    ["Overhead-to-floor carry pattern",3,"3×6","Move a light load between shelf and floor"],
    ["Grip-and-carry endurance",3,"3×30s","Hold and carry as long as is comfortable"],
    ["Two-hand deadlift-to-carry",3,"3×6","Hinge to lift, then carry it close"]
  ],
  balance:[
    ["Feet-together stand",1,"3×30s","Near a counter; steady the sway"],
    ["Tandem (heel-to-toe) stand",2,"3×30s","One foot in front, hold support"],
    ["Single-leg stand near support",2,"3×20s each","Hold a rail, lift one foot"],
    ["Weight shifts side to side",1,"3×10","Rock gently onto each foot"],
    ["Heel-to-toe walking",2,"3×10 steps","Walk a line, arms out"],
    ["Reach-out balance (safe reaching)",2,"3×8","Reach forward and back without stepping"],
    ["Head-turns while standing",2,"3×10","Turn the head slowly, keep steady"],
    ["Standing on a cushion",3,"3×20s","Soft surface near support"],
    ["Single-leg + ball toss / task",3,"3×20s each","Add a task without losing balance"],
    ["Step-and-hold (freeze the landing)",3,"3×8","Step out, land softly, hold 2s"],
    ["Turn 180° under control",2,"3×6","Turn slowly, small steps, near support"],
    ["Sit-to-stand eyes closed (near support)",3,"3×5","Only with a hand ready on support"],
    ["Marching with eyes on a target",2,"3×20","Steady rhythm, keep looking ahead"]
  ],
  bathing:[
    ["Step-in / step-out practice at a rail",1,"3×5","Rehearse stepping over the bath edge"],
    ["Sit-to-stand from a shower stool",2,"3×8","Practise the transfer you use to wash"],
    ["Standing weight-shift to wash",2,"3×30s","Take weight on each leg near support"],
    ["Reach-to-wash pattern (back & feet)",2,"3×8","Practise the reaches washing needs"],
    ["One-leg balance to wash a foot (support)",3,"3×20s each","Hold a rail; lift and hold"],
    ["Turn safely in a small space",2,"3×6","Small steps, hold support, turn"],
    ["Sit-down onto a bath board",1,"3×5","Control the lower onto the board"],
    ["Reach the taps / shower control",1,"3×10","Practise the reach from seated/standing"],
    ["Dry-off reaching pattern",2,"3×8","Reach around to towel your back and legs"],
    ["Step over a low threshold at support",2,"3×8","Lift the foot clear, near a rail"],
    ["Grab-rail pull-to-stand",2,"3×8","Use the rail to help you rise"],
    ["Standing tolerance at the sink",2,"3×1 min","Build time standing to wash"]
  ],
  toileting:[
    ["Sit-to-stand from a low seat",2,"3×8","Practise rising from toilet height"],
    ["Sit-to-stand to a raised seat",1,"3×8","Use a raised height, lower over time"],
    ["Grab-rail assisted stand",1,"3×8","Pull on the rail to help you up"],
    ["Clothing-management practice (seated)",1,"3×5","Rehearse managing clothing seated"],
    ["Reach-behind (wiping) mobility",2,"3×8 each","Gentle reach around, both sides"],
    ["Turn and sit control",2,"3×6","Back up, feel the seat, lower with control"],
    ["Half-squat holds",2,"3×20s","Hold a half-sit near support"],
    ["Slow lower to the seat (eccentric)",3,"3×6","Take 3 seconds to sit"],
    ["Standing balance while adjusting clothing",2,"3×20s","Near support; steady"],
    ["Night-time transfer rehearsal",1,"3×5","Practise the get-up you'd use at night"],
    ["Leg-strength for rising (mini-squats)",2,"3×10","Build the strength to stand easily"],
    ["Foot-placement before standing",1,"3×8","Feet back and flat, then rise"]
  ],
  grooming:[
    ["Arms-up endurance at the sink",2,"3×30s","Hold the hands up as if doing your hair"],
    ["Hand-to-head reaching",1,"3×10","Reach the top and back of your head"],
    ["Fine grip for a razor / brush",2,"3×10","Practise the precise grip and strokes"],
    ["Standing tolerance at the mirror",2,"3×1 min","Build time standing to groom"],
    ["Reach to the far side of your face/neck",2,"3×8","Cross-reach with each hand"],
    ["Toothbrush / small-tool grip drill",1,"3×10","Practise a steady grip and small movements"],
    ["Two-handed grooming coordination",2,"3×8","Use both hands together (e.g. tying hair)"],
    ["Reach-overhead comb pattern",3,"3×10","Full reach to comb from front to back"],
    ["Precision pinch (tweezers/clippers)",3,"3×10","Practise a fine, controlled pinch"],
    ["Seated grooming set-up",1,"3×1 min","Rehearse doing it seated to save energy"],
    ["Neck & shoulder loosener",1,"3×10","Loosen up before sink tasks"],
    ["Apply-to-back reaching (cream)",2,"3×8","Reach around to your mid-back"]
  ],
  eating:[
    ["Cutlery-grip practice",1,"3×10","Hold a knife and fork with a relaxed grip"],
    ["Cutting practice (putty or firm food)",2,"3×8","Practise the sawing motion"],
    ["Scoop-and-lift with a spoon",1,"3×10","Scoop, lift level, to the mouth"],
    ["Cup-to-mouth control",1,"3×10","Lift a light cup smoothly, no spills"],
    ["Two-hand steadying (bowl and spoon)",2,"3×8","Steady the bowl with the other hand"],
    ["Pouring practice (light jug)",2,"3×8","Pour a controlled stream, stop cleanly"],
    ["Buttering / spreading motion",2,"3×8","Steady the item, spread evenly"],
    ["Pick up small food items (peas, beans)",3,"3×10","Fork or fingers; precise pick-up"],
    ["Forearm-supported feeding pattern",1,"3×10","Rest the elbow to steady the hand"],
    ["Open-packaging practice",2,"3×8","Sachets, tubs and wrappers"],
    ["Carry a plate/cup a short way",2,"3×10","Keep it level; steady steps"],
    ["Straw / lip control drill",1,"3×10","Sip and control the flow"]
  ],
  cooking:[
    ["Standing tolerance at the counter",2,"3×1 min","Build up time standing to prep"],
    ["Seated food-prep practice",1,"3×5 min","Prep sitting down to save energy"],
    ["Chop / slice practice (putty or veg)",2,"3×8","Steady the board; controlled cuts"],
    ["Stir-and-hold a pot",2,"3×30s","Hold and stir without spilling"],
    ["Reach into a low cupboard (squat/kneel)",2,"3×8","Get pans out safely"],
    ["Reach to an eye-level shelf",2,"3×8","Place and take light items"],
    ["Slide (don't lift) a pot along the counter",1,"3×8","Slide heavy items rather than carry"],
    ["Part-full jug/kettle pour",2,"3×8","Pour a controlled amount"],
    ["Open jars and packaging",2,"3×8","Brace and twist; use both hands"],
    ["Carry a light dish a short way",2,"3×8","Keep it close and level"],
    ["Load / unload a low oven or dishwasher",3,"3×6","Half-kneel or squat, back straight"],
    ["Two-hand carry to the table",2,"3×10 m","Steady, level, close to you"],
    ["Bend-and-lift a light pan safely",2,"3×8","Hinge at the hips, keep it close"]
  ],
  housework:[
    ["Sweeping / mopping motion",2,"3×30s","Move from the legs, not just the back"],
    ["Push-pull vacuum pattern",2,"3×30s","Short strokes; keep it close"],
    ["Reach-and-wipe (high and low)",2,"3×8","Practise the reaching a wipe-down needs"],
    ["Bend-and-lift laundry basket pattern",2,"3×8","Hinge at the hips to lift"],
    ["Kneel-to-clean and back up",2,"3×6","Half-kneel to clean low, then rise"],
    ["Bed-making reaching drill",2,"3×8","Reach across and tuck without over-bending"],
    ["Carry-and-empty a bin",2,"3×8","Lift close, carry steady"],
    ["Standing endurance for chores",2,"3×1 min","Build time on your feet"],
    ["Overhead dusting reach",3,"3×8","Reach up to a high surface, controlled"],
    ["Squat to a low shelf and back",2,"3×8","Load/unload a low cupboard"],
    ["Wringing and squeezing (cloth/mop)",2,"3×8","Practise the grip and twist"],
    ["Push furniture a short way",3,"3×6","Set your feet; push from the legs"],
    ["Wheelie-bin manoeuvre practice",3,"3×5","Tilt and steer with control"]
  ],
  laundry:[
    ["Bend-and-load a low machine",2,"3×8","Half-kneel or hinge; keep it close"],
    ["Reach-in and unload practice",2,"3×8","Reach the back of the drum safely"],
    ["Hang-out overhead reach",3,"3×8","Reach up to peg items on a line"],
    ["Basket lift-and-carry",2,"3×8","Lift close, carry level"],
    ["Fold-and-place (repeated reach)",1,"3×10","Fold and set down; light and steady"],
    ["Peg-grip practice",1,"3×15","Open and close pegs with each hand"],
    ["Carry a basket up a step",3,"3×5","Use the rail; keep it close"],
    ["Sort laundry from the floor",2,"3×8","Squat or half-kneel to sort"],
    ["Ironing-motion endurance",2,"3×30s","Steady standing and pushing"],
    ["Loading a top-loader reach",2,"3×8","Reach down and in with control"],
    ["Wring and shake out items",2,"3×8","Grip and shake without straining the back"],
    ["Reach the line at waist height first",1,"3×8","Lower the line/basket to reduce reaching"]
  ],
  shopping:[
    ["Trolley-push walking",2,"5 min","Push a trolley/frame at a steady pace"],
    ["Walk-and-reach for a shelf item",2,"3×8","Reach out and place items in a basket"],
    ["Carry two light bags a short way",3,"3×20 m","Split the load; stay upright"],
    ["Basket-carry endurance",3,"3×30s","Hold a light basket while walking"],
    ["Loop of the aisles (endurance)",3,"up to 15 min","Build the time on your feet"],
    ["Bag-packing practice (seated/standing)",2,"3×8","Lift items in and out of bags"],
    ["Lift shopping into the boot pattern",3,"3×6","Hinge, keep it close, place gently"],
    ["Reach a low and high shelf",2,"3×8","Squat low, reach high — controlled"],
    ["Queue-standing tolerance",2,"3×1 min","Build time standing still"],
    ["Walk-carry from car to kitchen",3,"3×20 m","Steady steps with a light load"],
    ["Self-checkout reach-and-scan",1,"3×10","Practise the reaching and handling"],
    ["Interval shop-and-rest",2,"6×2 min","Shop a little, rest, continue"]
  ],
  driving:[
    ["Neck-rotation (blind-spot) mobility",1,"3×10 each","Turn to look over each shoulder"],
    ["Trunk-rotation, seated",1,"3×10 each","Turn to reach the seatbelt/back seat"],
    ["Sit-and-swing car-transfer practice",1,"3×5","Sit first, then swing both legs together"],
    ["Seatbelt reach-and-fasten drill",1,"3×8","Reach across, pull down, click in"],
    ["Foot-pedal control (ankle taps)",2,"3×15","Practise quick, controlled ankle movements"],
    ["Reaction step / quick-stop rehearsal",3,"3×8","Practise a quick, controlled foot move"],
    ["Hand-over-hand steering pattern",2,"3×10","Rehearse smooth steering movements"],
    ["Get-in / get-out endurance",2,"3×5","Repeat the transfer smoothly"],
    ["Reach the handbrake / gearstick",1,"3×10","Practise the reach and grip"],
    ["Shoulder-check with trunk turn",2,"3×10 each","Combine head and trunk rotation"],
    ["Load a bag into the boot pattern",3,"3×6","Hinge and place, keep it close"],
    ["Sitting tolerance for a journey",3,"up to 20 min","Build seated time with micro-moves"]
  ],
  cognition:[
    ["Sequencing practice (steps of a task)",1,"3×5","Say/write the steps in order"],
    ["Make and follow a checklist",1,"daily","Tick off steps as you go"],
    ["Timed simple-task planning",2,"3×5 min","Plan a short task start to finish"],
    ["Money / change practice",2,"3×5","Work out change with real coins"],
    ["Medication-sorting rehearsal",1,"3×5","Sort a dosette box slowly and check"],
    ["Memory recall drill (list of items)",2,"3×5","Learn a short list, recall it later"],
    ["Dual-task practice (talk while doing)",3,"3×2 min","Do a task while holding a conversation"],
    ["Following a written recipe/instructions",2,"3×5","One step at a time, tick them off"],
    ["Diary / reminder set-up",1,"daily","Put appointments and alarms in place"],
    ["Attention practice in a quiet space",2,"3×5 min","Stay on one task; notice and refocus"],
    ["Problem-solving a daily scenario",3,"3×5","Think through options for a real situation"],
    ["Number / word puzzle practice",2,"3×5 min","Little and often keeps it sharp"]
  ],
  sitting:[
    ["Graded sitting tolerance",2,"add 2–3 min","Sit a little longer each time, then stand"],
    ["Seated posture resets",1,"3×10","Tall spine, shoulders back, chin gentle"],
    ["Seated core bracing",2,"3×10s","Gently firm the tummy, keep breathing"],
    ["Sit-stand micro-breaks",1,"every 20 min","Stand and move for a minute"],
    ["Seated marching",1,"3×20","Lift the knees at the desk"],
    ["Seated pelvic tilts",1,"3×10","Rock the pelvis gently to unload"],
    ["Foot-support set-up",1,"3×1 min","Feet flat/on a rest to ease the back"],
    ["Seated thoracic rotations",1,"3×8 each","Turn gently to keep the mid-back mobile"],
    ["Desk-ergonomics rehearsal",1,"once","Set screen, chair and support well"],
    ["Seated glute / hip stretch",1,"3×20s each","Ease the hips during long sitting"],
    ["Progressive sit-through practice",3,"up to 60 min","Build toward a full sitting session"],
    ["Seated shoulder rolls",1,"3×10","Loosen up during long sitting"]
  ],
  standing:[
    ["Graded standing tolerance",2,"add 1–2 min","Stand a little longer, rest before symptoms"],
    ["Standing weight shifts",1,"3×10","Rock gently onto each foot"],
    ["Perch-stool practice",1,"3×1 min","Half-sit to take some load off"],
    ["Standing with foot on a low step",1,"3×30s each","Alternate the resting foot"],
    ["Standing marching in place",1,"3×20","Keep moving to ease standing"],
    ["Mini-squats while standing",2,"3×10","Small bends to keep the legs working"],
    ["Calf raises during standing tasks",2,"3×12","Rise onto the toes and lower"],
    ["Standing endurance at a task",2,"3×1 min","Build time doing a real standing task"],
    ["Anti-fatigue stance resets",1,"every few min","Shift your feet and posture regularly"],
    ["Standing hip hitches",2,"3×10","Lift one hip then the other"],
    ["Progressive standing-task practice",3,"up to 10 min","Build toward a full standing task"],
    ["Heel-toe rocking while standing",1,"3×15","Rock forward and back gently"]
  ],
  writing:[
    ["Handwriting warm-up loops",1,"3×1 min","Loose loops and lines to warm the hand"],
    ["Short handwriting bursts",2,"3×2 min","Write a few lines, rest, repeat"],
    ["Built-up-grip pen practice",1,"3×2 min","Use a chunky/weighted pen"],
    ["Copy-a-sentence drill",2,"3×3","Neat, unhurried copying"],
    ["Signature practice",1,"3×5","Practise a consistent signature"],
    ["Typing-accuracy practice",2,"3×2 min","Slow, accurate, then build speed"],
    ["Keyboard endurance builder",3,"up to 10 min","Type in graded blocks with breaks"],
    ["Finger-isolation for keys",2,"3×10","Tap each finger in turn"],
    ["Wrist-support set-up for writing",1,"once","Support the forearm to reduce strain"],
    ["Slant-board writing practice",2,"3×2 min","Write on a slope to ease the wrist"],
    ["Voice-to-text rehearsal",1,"3×2 min","Practise dictating as an alternative"],
    ["Grip-relax cycles while writing",1,"3×10","Loosen the grip between lines"]
  ]
};

/* progression modifiers — read naturally for functional practice; adjust tier. */
const MODS = [
  ["",0], [" — with light support",-1], [" — reduce the support",1], [" — slow, controlled tempo",0],
  [" — with a 2-second hold",1], [" — add a brief pause",0], [" — × 5",0,"×5"], [" — × 8",0,"×8"],
  [" — × 10",0,"×10"], [" — × 12",1,"×12"], [" — 2 sets",0], [" — 3 sets",1], [" — a little further each time",1],
  [" — both sides / both hands",0], [" — practise daily",0], [" — timed, beat your last effort",1],
  [" — with a real object",0], [" — as part of the whole task",1]
];

const clamp = (n) => Math.max(1, Math.min(4, n));
const out = [];
const have = new Set();
for (const [area, bases] of Object.entries(BASES)) {
  const tags = AREA_TAGS[area] || [];
  for (const [bn, bt, bd, bc] of bases) {
    for (const [suffix, dt, dOverride] of MODS) {
      const n = bn + suffix;
      const key = area + "|" + n.toLowerCase();
      if (have.has(key)) continue;
      have.add(key);
      out.push({ n, area, tier: clamp(bt + dt), d: dOverride || bd, c: bc, tags });
    }
  }
}

const banner = "/* AUTO-GENERATED by scripts/generate-adl-exercises.mjs — do not edit by hand.\n" +
  "   Functional / OT practice exercises tied to an ADL functional area + tier.\n" +
  "   { n, area, tier(1-4), d, c, tags }. Injected into the program by difficulty. */\n";
writeFileSync(OUT, banner + "window.ADL_EXERCISES = " + JSON.stringify(out) + ";\n");

const byArea = {};
out.forEach(o => { byArea[o.area] = (byArea[o.area] || 0) + 1; });
console.log(`Wrote ${out.length} ADL-focused exercises across ${Object.keys(byArea).length} functional areas.`);
console.log("per-area:", byArea);
