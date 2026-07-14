/* Generate data/adls.js — a large, searchable catalogue of occupational-therapy
   Activities of Daily Living (ADLs) for the History "Daily activities you find
   hard" search. Each entry: { n: name, c: category, a: [functional areas] }.
   The areas link an ADL to the matching functional-practice exercises
   (data/adl-exercises.js) and to the improvement tips in app.js.
   Dependency-free; deterministic (no Date/Math.random) so the build is stable. */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "adls.js");

/* canonical functional-area codes (shared with generate-adl-exercises.mjs + app.js) */
const A = {
  transfers:"transfers", stairs:"stairs", reachHigh:"reach_high", reachLow:"reach_low",
  handFine:"hand_fine", grip:"grip", dressU:"dress_upper", dressL:"dress_lower",
  walking:"walking", carrying:"carrying", balance:"balance", bathing:"bathing",
  toileting:"toileting", grooming:"grooming", eating:"eating", cooking:"cooking",
  housework:"housework", laundry:"laundry", shopping:"shopping", driving:"driving",
  cognition:"cognition", sitting:"sitting", standing:"standing", writing:"writing"
};

const out = [];
const have = new Set();
const add = (n, c, areas) => {
  n = n.replace(/\s+/g, " ").trim();
  const key = n.toLowerCase();
  if (!n || have.has(key)) return;
  have.add(key);
  out.push({ n, c, a: [...new Set(areas)].filter(Boolean) });
};
const list = (arr, c, areas) => arr.forEach(n => add(n, c, areas));

/* ---------------- 1) genuine base tasks by category ---------------- */

// Dressing
list(["Putting on a t-shirt / top","Putting on a jumper or sweatshirt","Putting on a shirt","Doing up shirt buttons","Doing up small buttons","Putting on a jacket or coat","Zipping up a coat","Putting on a bra","Doing up a back-fastening bra","Putting on a vest / undershirt","Tucking in a shirt","Putting on a scarf","Putting on gloves","Putting on a hat","Putting on a tie","Doing up cufflinks","Putting on a dressing gown"],
  "Dressing (upper body)", [A.dressU, A.reachHigh, A.handFine]);
list(["Putting on underwear","Putting on trousers","Putting on a skirt","Putting on shorts","Doing up trouser buttons and zip","Fastening a belt","Putting on socks","Putting on tights or stockings","Putting on compression stockings","Putting on shoes","Tying shoelaces","Putting on slip-on shoes","Putting on boots","Putting on sandals","Putting on slippers"],
  "Dressing (lower body)", [A.dressL, A.reachLow, A.handFine]);

// Bathing & hygiene
list(["Getting in and out of the shower","Getting in and out of the bath","Standing to shower","Sitting to shower","Washing your back","Washing your feet","Washing your hair","Rinsing shampoo out","Drying yourself with a towel","Drying between your toes","Reaching to wash your lower legs"],
  "Bathing & washing", [A.bathing, A.balance, A.reachLow]);
list(["Brushing your teeth","Flossing your teeth","Using mouthwash","Cleaning dentures","Shaving your face","Shaving your legs","Applying deodorant","Applying moisturiser or lotion","Applying sunscreen","Combing or brushing your hair","Blow-drying your hair","Styling your hair","Applying make-up","Clipping your fingernails","Clipping your toenails","Filing your nails","Inserting contact lenses","Putting in a hearing aid","Trimming a beard"],
  "Grooming & hygiene", [A.grooming, A.handFine, A.reachHigh]);

// Toileting
list(["Getting on and off the toilet","Managing your clothing at the toilet","Wiping / cleaning yourself","Using a bidet","Managing continence pads","Emptying a catheter bag","Managing a stoma / colostomy bag","Getting up from a low toilet"],
  "Toileting", [A.toileting, A.transfers, A.reachLow]);

// Eating & drinking
list(["Using a knife and fork","Cutting up tough food","Using a spoon","Using chopsticks","Buttering bread","Peeling fruit","Opening a yoghurt pot","Drinking from a cup","Drinking from a glass","Drinking from a straw","Pouring a drink","Carrying a plate to the table","Carrying a hot drink","Opening a milk carton","Peeling a boiled egg","Cutting meat"],
  "Eating & drinking", [A.eating, A.handFine, A.grip]);

// Functional mobility & transfers
list(["Rolling over in bed","Sitting up from lying down","Getting out of bed","Getting into bed","Getting up from a chair","Getting up from a low sofa","Getting up from the floor","Getting down to the floor","Transferring bed to chair","Transferring chair to wheelchair","Getting on and off a bus","Getting in and out of a car (driver's side)","Getting in and out of a car (passenger side)","Kneeling down and getting back up","Standing up from a bath"],
  "Moving & transfers", [A.transfers, A.balance]);
list(["Walking indoors","Walking outdoors","Walking on uneven ground","Walking up a slope","Walking down a slope","Walking while carrying something","Turning around while walking","Stopping and starting when walking","Walking through a doorway","Walking in a crowd","Walking a longer distance"],
  "Walking & mobility", [A.walking, A.balance, A.standing]);
list(["Going up stairs","Going down stairs","Going up a single step","Going down a single step","Climbing stairs while carrying something","Using stairs without a handrail","Getting up a kerb","Stepping over the bath edge"],
  "Stairs & steps", [A.stairs, A.balance]);

// Reaching & bending
list(["Reaching up into a high cupboard","Reaching the top shelf","Reaching behind your back","Reaching across a table","Reaching to a low cupboard","Bending down to pick something up","Bending to load the washing machine","Reaching your feet to put on socks","Reaching around to fasten a seatbelt","Getting things out of the oven","Reaching into the back of a wardrobe"],
  "Reaching & bending", [A.reachHigh, A.reachLow]);

// Meal preparation (IADL)
list(["Boiling a kettle","Making a hot drink","Making toast","Preparing a sandwich","Preparing a simple meal","Cooking a full meal","Chopping vegetables","Peeling potatoes","Opening a tin can","Opening a jar","Using the oven","Using the hob / stove","Draining a pan of pasta","Using the microwave","Carrying a hot pan","Loading the dishwasher","Unloading the dishwasher","Washing dishes by hand","Drying the dishes","Wiping down surfaces","Putting shopping away in cupboards","Getting things out of the fridge","Stirring a pot on the stove"],
  "Cooking & kitchen", [A.cooking, A.standing, A.grip]);

// Housework
list(["Sweeping the floor","Mopping the floor","Vacuuming","Dusting","Making the bed","Changing the duvet cover","Changing bed sheets","Cleaning the bathroom","Cleaning the toilet","Emptying the bins","Taking the rubbish out","Wiping windows","Tidying up","Watering the plants","Feeding a pet","Cleaning up after a pet"],
  "Housework & cleaning", [A.housework, A.reachLow, A.standing]);
list(["Loading the washing machine","Unloading the washing machine","Hanging out the washing","Taking washing off the line","Folding laundry","Ironing","Carrying a laundry basket","Sorting the laundry"],
  "Laundry", [A.laundry, A.reachLow, A.carrying]);
list(["Gardening","Weeding the garden","Mowing the lawn","Raking leaves","Digging","Planting","Carrying a watering can","Trimming hedges","Sweeping the patio"],
  "Garden & outdoors", [A.housework, A.reachLow, A.standing]);
list(["Changing a lightbulb","Hanging curtains","Basic DIY / home repairs","Using a screwdriver","Using a hammer","Painting a wall","Assembling flat-pack furniture","Carrying a toolbox"],
  "Home maintenance", [A.reachHigh, A.grip, A.handFine]);

// Shopping & community
list(["Grocery shopping","Pushing a shopping trolley","Carrying shopping bags","Packing shopping bags","Using a self-checkout","Reaching items on a shop shelf","Carrying shopping from the car","Walking around the shops","Queuing / standing in a line"],
  "Shopping", [A.shopping, A.walking, A.carrying]);
list(["Counting change","Using a cash machine","Paying at a till","Writing a cheque","Budgeting your money","Paying bills online","Reading a bank statement","Managing your finances"],
  "Managing money", [A.cognition, A.handFine, A.writing]);
list(["Taking your medication on time","Sorting medication into a dosette box","Opening medication packaging","Ordering repeat prescriptions","Remembering appointments","Following a medication schedule"],
  "Managing medication", [A.cognition, A.handFine, A.grip]);

// Communication & technology
list(["Making a phone call","Answering the phone","Sending a text message","Using email","Making a video call","Using a smartphone touchscreen","Using a computer","Using a tablet","Using a TV remote","Charging a device","Reading a screen","Browsing the internet"],
  "Communication & technology", [A.cognition, A.handFine, A.writing]);
list(["Handwriting","Signing your name","Writing a shopping list","Filling in a form","Typing on a keyboard","Using a computer mouse","Taking notes"],
  "Writing & typing", [A.writing, A.handFine, A.sitting]);

// Fine motor & hand tasks
list(["Opening jars and bottles","Opening a screw-top bottle","Opening ring-pull cans","Opening blister packaging","Opening food packaging","Opening a bag of crisps","Gripping and holding objects","Picking up small items (coins, pins)","Turning a key in a lock","Unlocking a door","Turning a doorknob","Turning a tap on and off","Using scissors","Threading a needle","Sewing on a button","Doing up a zip","Fastening jewellery","Tying a knot or bow","Plugging in a charger","Changing a plug","Using a can opener","Wringing out a cloth","Doing up a watch strap","Using a stylus or touchscreen"],
  "Hands & fine motor", [A.handFine, A.grip]);

// Work & productivity
list(["Sitting at a desk for long periods","Standing at a workstation for long periods","Using a computer for an hour","Lifting a box at work","Carrying files or paperwork","Reaching a filing cabinet","Answering a work phone","Attending a meeting","Commuting to work","Using stairs at work","Concentrating on a work task","Managing your workload"],
  "Work tasks", [A.sitting, A.standing, A.cognition]);

// Driving & transport
list(["Driving a car","Getting in and out of the driver's seat","Checking your blind spot","Reversing the car","Parking the car","Refuelling the car","Loading shopping into the boot","Using public transport","Catching a bus","Catching a train","Standing on a moving bus or train","Hailing a taxi","Crossing a busy road"],
  "Driving & transport", [A.driving, A.transfers, A.walking]);

// Childcare & caring
list(["Lifting a baby","Changing a nappy","Bathing a baby","Feeding a baby","Pushing a pram or pushchair","Carrying a car seat","Dressing a child","Preparing a child's meal","Lifting a child into a high chair","Playing on the floor with a child","Caring for another person"],
  "Childcare & caring", [A.carrying, A.reachLow, A.transfers]);

// Leisure & social
list(["Knitting or crochet","Playing a musical instrument","Painting or drawing","Doing a jigsaw puzzle","Playing cards or board games","Using a games console","Gardening for pleasure","Taking a photograph","Dancing","Swimming","Cycling","Walking the dog","Going to a restaurant","Going to the cinema","Attending a place of worship","Hosting visitors","Playing with grandchildren","Doing crafts or hobbies","Reading a book"],
  "Leisure & social", [A.handFine, A.walking, A.cognition]);

// Sleep & rest
list(["Getting comfortable in bed","Repositioning yourself at night","Getting up in the night for the toilet","Getting back to sleep","Turning over in bed"],
  "Sleep & rest", [A.transfers]);

/* ---------------- 2) templated tasks (genuine object/context variety) ---------------- */

const openObjects = [["a jam jar",A.grip],["a pickle jar",A.grip],["a screw-top bottle",A.grip],["a water bottle",A.grip],["a medication bottle",A.grip],["a child-proof cap",A.grip],["a milk bottle",A.grip],["a ring-pull can",A.handFine],["a tin with a can opener",A.grip],["a vacuum-sealed packet",A.handFine],["a bag of frozen food",A.handFine],["a carton of juice",A.handFine],["a tube of toothpaste",A.handFine],["a bottle of shampoo",A.grip]];
openObjects.forEach(([o,ar]) => add(`Opening ${o}`, "Opening & containers", [ar, A.grip]));

const carryObjects = [["a shopping bag",A.shopping],["two shopping bags",A.shopping],["a laundry basket",A.laundry],["a full kettle",A.grip],["a tray of food",A.eating],["a hot pan",A.cooking],["a bag of rubbish",A.housework],["a watering can",A.housework],["a box of books",A.standing],["a suitcase",A.walking],["a rucksack",A.walking],["a bag of shopping upstairs",A.stairs],["a basket of washing",A.laundry],["a vacuum cleaner upstairs",A.stairs]];
carryObjects.forEach(([o,ar]) => add(`Carrying ${o}`, "Carrying loads", [A.carrying, ar]));

const getUpFrom = [["a standard dining chair",A.transfers],["a low armchair",A.transfers],["a soft sofa",A.transfers],["a bar stool",A.transfers],["the toilet",A.toileting],["the bed",A.transfers],["the floor",A.transfers],["a bus seat",A.transfers],["a car seat",A.driving],["a beanbag",A.transfers],["a garden bench",A.transfers],["a low stool",A.transfers]];
getUpFrom.forEach(([o,ar]) => add(`Getting up from ${o}`, "Getting up & sitting down", [A.transfers, ar]));
getUpFrom.forEach(([o,ar]) => add(`Lowering yourself onto ${o}`, "Getting up & sitting down", [A.transfers, ar]));

const reachTo = [["a high kitchen cupboard",A.reachHigh],["the top of a wardrobe",A.reachHigh],["a high bookshelf",A.reachHigh],["the back of a low cupboard",A.reachLow],["something on the floor",A.reachLow],["behind your back",A.reachHigh],["across the dinner table",A.reachHigh],["under the sink",A.reachLow],["the loft hatch",A.reachHigh],["the bottom of the fridge",A.reachLow]];
reachTo.forEach(([o,ar]) => add(`Reaching ${o}`, "Reaching", [ar]));

const cleanThe = [["bath",A.reachLow],["shower",A.standing],["toilet",A.reachLow],["kitchen floor",A.reachLow],["windows",A.reachHigh],["oven",A.reachLow],["fridge",A.reachLow],["skirting boards",A.reachLow],["car",A.standing],["mirror",A.reachHigh]];
cleanThe.forEach(([o,ar]) => add(`Cleaning the ${o}`, "Housework & cleaning", [A.housework, ar]));

const putOn = [["a jumper over your head",A.dressU],["a coat with a bad shoulder",A.dressU],["a back-fastening dress",A.dressU],["support stockings",A.dressL],["skinny jeans",A.dressL],["walking boots",A.dressL],["a wetsuit",A.dressU],["a life jacket",A.dressU],["safety boots",A.dressL],["a wristwatch",A.handFine]];
putOn.forEach(([o,ar]) => add(`Putting on ${o}`, "Dressing (varied)", [ar, A.handFine]));

const useAppliance = [["a washing machine",A.reachLow],["a tumble dryer",A.reachLow],["a dishwasher",A.reachLow],["an iron",A.grip],["a vacuum cleaner",A.housework],["a lawnmower",A.grip],["a food processor",A.handFine],["a microwave",A.reachHigh],["a coffee machine",A.handFine],["a toaster",A.handFine],["a hairdryer",A.reachHigh],["an electric toothbrush",A.handFine],["a TV remote",A.handFine],["a self-checkout machine",A.handFine]];
useAppliance.forEach(([o,ar]) => add(`Using ${o}`, "Using appliances & tools", [ar, A.handFine]));

const prepFood = [["vegetables",A.handFine],["an onion",A.handFine],["a loaf of bread",A.handFine],["meat",A.grip],["cheese",A.handFine],["fruit",A.handFine],["a salad",A.handFine],["a roast dinner",A.cooking],["a packed lunch",A.cooking]];
prepFood.forEach(([o,ar]) => add(`Preparing / chopping ${o}`, "Cooking & kitchen", [A.cooking, ar]));

const walkTo = [["the end of the street",A.walking],["the local shop",A.shopping],["the bus stop",A.walking],["the mailbox",A.walking],["the garden",A.walking],["around the supermarket",A.shopping],["up the driveway",A.walking],["around the block",A.walking],["to a neighbour's house",A.walking]];
walkTo.forEach(([o,ar]) => add(`Walking to ${o}`, "Walking & mobility", [A.walking, ar]));

/* handedness / one-handed variants for key fine-motor & dressing tasks */
const oneHanded = ["Doing up buttons","Tying shoelaces","Opening a jar","Cutting up food","Writing","Using a knife and fork","Fastening a bra","Opening packaging","Peeling vegetables","Doing up a zip","Turning a key","Threading a needle","Buttering bread","Wringing out a cloth"];
oneHanded.forEach(n => add(`${n} one-handed`, "One-handed tasks", [A.handFine, A.grip]));

/* seated / standing tolerance variants */
list(["Sitting upright for 30 minutes","Sitting through a meal","Sitting through a film","Sitting in a car for a journey","Sitting on a hard chair","Sitting cross-legged on the floor"], "Sitting tolerance", [A.sitting]);
list(["Standing to cook a meal","Standing to do the washing-up","Standing to iron","Standing while queuing","Standing at a party","Standing to brush your teeth","Standing on public transport"], "Standing tolerance", [A.standing, A.balance]);

/* balance-specific */
list(["Standing on one leg to dress","Standing without holding on","Turning around on the spot","Standing in the shower with eyes closed to wash hair","Reaching while standing","Bending forward without losing balance","Standing on a bus that's moving","Walking and turning your head","Standing up quickly without dizziness"], "Balance & steadiness", [A.balance]);

/* ---------------- 3) more genuine tasks + templates to broaden coverage ---------------- */

// more kitchen granularity
list(["Grating cheese","Whisking eggs","Kneading dough","Rolling out pastry","Opening the oven door","Lifting a casserole dish out of the oven","Filling the kettle at the tap","Scrubbing a pan","Wiping the hob","Reaching a pan from a low cupboard","Reaching a plate from a high shelf","Straining vegetables","Mashing potatoes","Slicing bread","Grinding pepper","Squeezing a lemon","Spreading butter on toast","Opening the fridge door","Carrying plates to the sink","Setting the table"],
  "Cooking & kitchen", [A.cooking, A.handFine, A.grip]);

// more fine-motor / hand admin
list(["Picking up a card from a flat surface","Separating coins in your palm","Doing up a seatbelt","Pressing small buttons on a device","Using the zip on a bag","Opening a wallet or purse","Counting banknotes","Using a card machine / PIN pad","Unwrapping a sweet","Opening an envelope","Using a stapler","Sharpening a pencil","Winding a watch","Loading a staple or paperclip","Opening a padlock","Using a tin opener","Peeling a sticker or label","Pinching and zipping a food bag","Attaching a lead to a dog collar","Buttoning a duvet cover"],
  "Hands & fine motor", [A.handFine, A.grip]);

// more reaching / bending granularity
list(["Picking the post up off the doormat","Loading the bottom shelf of the oven","Reaching the handbrake in the car","Getting a saucepan from a low cupboard","Reaching the pedals comfortably","Picking up a dropped item","Reaching your back to scratch or wash","Getting something from under the bed","Reaching the light switch","Reaching a seatbelt across your body"],
  "Reaching & bending", [A.reachHigh, A.reachLow]);

// community / access
list(["Using a lift","Using an escalator","Using a revolving door","Opening a heavy door","Carrying a tray in a café","Finding a seat on a train","Standing in a queue at the bank","Walking on a wet or icy path","Walking in the dark","Getting through a turnstile","Using a public toilet","Carrying a coffee while walking"],
  "Out & about", [A.walking, A.balance, A.carrying]);

// personal admin / cognition
list(["Following a recipe","Planning your week","Remembering a shopping list","Concentrating on reading","Keeping track of a conversation","Learning to use a new device","Filling in an online form","Managing your calendar","Sorting the post","Making a to-do list","Keeping your attention on a task","Remembering names"],
  "Thinking & organising", [A.cognition]);

// getting in/out (transfers) — object templated
const inOut = [["the bath",A.bathing],["the shower",A.bathing],["a car",A.driving],["a taxi",A.driving],["bed",A.transfers],["a booth seat at a café",A.transfers],["a low chair",A.transfers],["a hot tub",A.transfers],["a kayak or boat",A.transfers],["a swimming pool",A.balance],["a deep armchair",A.transfers],["a camping chair",A.transfers]];
inOut.forEach(([o,ar]) => add(`Getting in and out of ${o}`, "Getting in & out", [A.transfers, ar]));

// open a ___ door
["a heavy fire door","a car door","the fridge door","the oven door","a garden gate","a stiff window","a sliding patio door","a front door with a key"].forEach(o => add(`Opening ${o}`, "Doors & openings", [A.grip, A.handFine]));

// turn a ___
[["a tap",A.grip],["a key in a lock",A.handFine],["a doorknob",A.grip],["a dial or knob",A.handFine],["a steering wheel",A.grip],["a stiff jar lid",A.grip],["a stiff door handle",A.grip],["a shower control",A.grip]].forEach(([o,ar]) => add(`Turning ${o}`, "Turning & twisting", [ar]));

// push / pull
[["a heavy door",A.standing],["a shopping trolley",A.shopping],["a wheelchair",A.carrying],["a lawnmower",A.standing],["a vacuum cleaner",A.housework],["a pram",A.carrying],["a stuck drawer",A.grip],["a piece of furniture",A.standing],["a wheelie bin",A.carrying],["a heavy gate",A.standing]].forEach(([o,ar]) => add(`Pushing or pulling ${o}`, "Pushing & pulling", [ar, A.grip]));

// kneeling to ___
["garden","clean the floor","play with a child","reach a low cupboard","light a fire","look under the bed","weed a flower bed"].forEach(o => add(`Kneeling to ${o}`, "Kneeling & floor tasks", [A.reachLow, A.transfers]));

// bending to ___
["tie your shoes","pick up the post","load the dishwasher","feed the cat","plug something in at the skirting board","reach the bottom drawer","empty the tumble dryer","pick up a toddler"].forEach(o => add(`Bending to ${o}`, "Kneeling & floor tasks", [A.reachLow]));

// leisure / exercise access
list(["Kneeling to garden","Getting onto an exercise bike","Getting down to do floor exercises","Getting up off an exercise mat","Carrying a golf bag","Swinging a golf club","Casting a fishing rod","Getting on and off a bicycle","Getting onto a treadmill","Lifting weights at the gym","Doing a yoga pose on the floor","Getting into a swimming pool"],
  "Exercise & leisure access", [A.transfers, A.balance, A.reachLow]);

// bed mobility & night
list(["Shuffling up the bed","Moving from side to side in bed","Sitting on the edge of the bed","Swinging your legs into bed","Reaching the bedside lamp","Adjusting your pillows","Pulling the covers up"],
  "Bed mobility", [A.transfers]);

// childcare granularity
list(["Lifting a toddler off the floor","Carrying a child on your hip","Strapping a child into a car seat","Pushing a child on a swing","Getting a child in and out of a cot","Kneeling to play on the floor with a child","Running after a child"],
  "Childcare & caring", [A.carrying, A.transfers, A.reachLow]);

// pet care
list(["Bending to fill a pet bowl","Walking the dog on a lead","Bathing a dog","Lifting a pet","Cleaning a litter tray","Scooping up after a dog"],
  "Pet care", [A.reachLow, A.walking, A.carrying]);

/* left / right hand variants for the most hand-dependent tasks (genuine for one-sided problems) */
["Doing up buttons","Opening a jar","Cutting food with a knife","Writing","Brushing your teeth","Using a fork","Turning a key","Using scissors","Doing up a zip","Fastening a watch"].forEach(n => {
  add(`${n} with your left hand`, "Hand-specific tasks", [A.handFine, A.grip]);
  add(`${n} with your right hand`, "Hand-specific tasks", [A.handFine, A.grip]);
});

/* ---------------- 4) further genuine coverage to broaden the catalogue ---------------- */

// carrying — more objects
[["a cup of tea",A.eating],["a plate of food",A.eating],["a full laundry basket downstairs",A.stairs],["a bucket of water",A.grip],["an armful of firewood",A.reachLow],["a child's car seat",A.reachLow],["a musical instrument case",A.walking],["a bag of compost",A.reachLow],["a box of groceries",A.standing],["a mop and bucket",A.housework],["a heavy book",A.grip],["a briefcase or laptop bag",A.walking],["a handbag on your shoulder",A.walking],["a hot casserole dish",A.cooking],["a pile of plates",A.eating]].forEach(([o,ar]) => add(`Carrying ${o}`, "Carrying loads", [A.carrying, ar]));

// opening — more objects
["a childproof medicine cap","a bottle of wine with a corkscrew","a beer bottle","a fizzy-drink can","a tub of butter","a jar of coffee","a bag of pasta","a cereal box","a vacuum-packed bag","a blister strip of tablets","a tube of glue","a ketchup bottle","a bag of frozen peas","a crisp packet","a box of eggs"].forEach(o => add(`Opening ${o}`, "Opening & containers", [A.handFine, A.grip]));

// getting up from — more seats
[["an office chair",A.transfers],["a church pew",A.transfers],["a picnic blanket on the grass",A.transfers],["a low wall",A.transfers],["a folding chair",A.transfers],["a step or kerb",A.stairs],["a exercise mat",A.transfers],["a deckchair",A.transfers]].forEach(([o,ar]) => add(`Getting up from ${o}`, "Getting up & sitting down", [A.transfers, ar]));

// reaching — more targets
[["the washing line",A.reachHigh],["the top button of a coat",A.reachHigh],["the back of your head",A.reachHigh],["your shoulder blades",A.reachHigh],["the far side of the bed",A.reachLow],["a high coat hook",A.reachHigh],["the parcel shelf in the car",A.reachHigh],["the glovebox",A.reachLow],["the seatbelt buckle",A.reachLow],["a jar on the top shelf",A.reachHigh]].forEach(([o,ar]) => add(`Reaching ${o}`, "Reaching", [ar]));

// cleaning — more surfaces
["the worktops","the stairs","under the furniture","the bath taps","the shower screen","the light fittings","the inside of the car","the windowsills","the kitchen cupboards","the garden path"].forEach(o => add(`Cleaning ${o}`, "Housework & cleaning", [A.housework, A.reachLow]));

// using more tools & appliances
[["a corkscrew",A.grip],["a garlic press",A.grip],["a cheese grater",A.handFine],["a pizza cutter",A.grip],["nail clippers",A.handFine],["tweezers",A.handFine],["a nail file",A.handFine],["a razor",A.handFine],["a hairbrush",A.reachHigh],["an umbrella",A.grip],["a walking stick",A.walking],["secateurs",A.grip],["a paint roller",A.reachHigh],["a power drill",A.grip],["a spanner",A.grip],["a mobility scooter",A.driving],["a tin opener",A.grip],["a bottle opener",A.grip],["a pepper grinder",A.grip],["a whisk",A.handFine]].forEach(([o,ar]) => add(`Using ${o}`, "Using appliances & tools", [ar, A.handFine]));

// personal-care granularity
list(["Washing your hands","Drying your hands","Applying eye drops","Putting on a plaster","Checking your blood sugar","Injecting insulin","Using an inhaler","Applying cream to your back","Cutting a toenail on your affected side","Putting on a splint or brace","Putting on a compression sleeve","Taking a jumper off over your head","Fastening a necklace behind your neck","Putting your hair in a ponytail","Reaching to wash your opposite armpit","Wiping after using the toilet"],
  "Personal care (detailed)", [A.handFine, A.reachHigh, A.grooming]);

// technology granularity
list(["Setting an alarm","Entering a PIN","Scanning a QR code","Taking a screenshot","Attaching a photo to a message","Using online banking","Topping up a travel card","Printing a document","Typing a long message","Zooming in on a screen","Answering a video call","Turning the Wi-Fi on"],
  "Communication & technology", [A.handFine, A.cognition, A.writing]);

// driving / transport granularity
list(["Adjusting the car mirror","Fastening the seatbelt","Releasing the handbrake","Changing gear","Doing an emergency stop","Loading a wheelchair into the car","Folding a mobility scooter","Stepping onto a train across the gap","Boarding a plane","Lifting a suitcase onto a rack","Getting through airport security","Standing at a bus stop"],
  "Driving & transport", [A.driving, A.transfers, A.grip]);

// work granularity
list(["Carrying a laptop bag to work","Setting up your workstation","Lifting a printer or box of paper","Filing documents on a high shelf","Standing to give a presentation","Sitting through back-to-back meetings","Typing for a long stretch","Reaching across your desk","Getting up and down from a low office sofa","Commuting on a packed train"],
  "Work tasks", [A.sitting, A.standing, A.carrying]);

// meal & drink granularity
list(["Filling a glass from the tap","Making a cup of tea and carrying it","Buttering and cutting toast","Opening a carton of milk","Peeling and slicing an apple","Spreading jam","Stirring sugar into a drink","Lifting a full teapot","Serving food onto plates","Cutting up food for someone else"],
  "Eating & drinking", [A.eating, A.handFine, A.grip]);

/* ---------------- 5) crafts, garden, bathroom, admin, seasonal, leisure ---------------- */

list(["Threading a sewing machine","Pinning fabric together","Cutting with fabric scissors","Knitting a row","Casting on stitches","Holding an embroidery hoop","Crocheting a stitch","Winding wool","Sewing a hem","Beading a necklace"],
  "Crafts & needlework", [A.handFine, A.grip]);

list(["Pressing piano keys","Holding a guitar chord","Strumming a guitar","Holding drumsticks","Turning sheet-music pages","Holding a violin bow","Fingering a flute"],
  "Playing music", [A.handFine, A.grip]);

list(["Deadheading flowers","Filling a plant pot","Pushing a wheelbarrow","Using a garden trowel","Pruning with secateurs","Turning the compost","Coiling up a hose","Digging a hole","Planting seedlings","Lifting a bag of soil","Sweeping the drive","Bending to weed a border"],
  "Gardening (detailed)", [A.reachLow, A.grip, A.standing]);

list(["Hanging a picture on the wall","Reaching the smoke alarm to test it","Getting into the loft","Getting a box down from the attic","Putting a suitcase on top of the wardrobe","Changing a curtain","Reaching a high window latch","Dusting a high shelf","Reaching a book on the top shelf"],
  "High reaching", [A.reachHigh, A.balance]);

list(["Stepping over the bath edge to shower","Sitting down onto a shower stool","Reaching the shower gel","Turning to wash your other side","Rinsing your hair over the sink","Drying your feet after a bath","Stepping onto a bath mat safely","Reaching the towel from the shower"],
  "Bathing (detailed)", [A.bathing, A.balance, A.reachLow]);

list(["Putting a fitted sheet on the mattress","Plumping the pillows","Making a hospital corner","Turning the mattress","Putting a duvet into its cover","Tucking in bed sheets","Straightening the bedspread"],
  "Bed-making", [A.reachLow, A.reachHigh, A.grip]);

list(["Playing darts","Playing pool or snooker","Ten-pin bowling","Playing bingo","Doing a crossword","Playing chess","Shuffling a deck of cards","Dealing cards","Rolling dice","Building with blocks","Playing dominoes","Doing a word-search"],
  "Games & hobbies", [A.handFine, A.cognition]);

list(["Reading small print","Signing for a delivery","Filling in a prescription form","Writing a birthday card","Wrapping a present","Tying a ribbon or bow","Sticking a stamp on an envelope","Posting a letter in the box","Addressing an envelope","Peeling and sticking a label"],
  "Paperwork & post", [A.writing, A.handFine]);

list(["Kneeling to pray","Standing for hymns","Lighting a candle","Standing through a service","Kneeling and rising in worship"],
  "Faith & community", [A.transfers, A.standing, A.balance]);

list(["Walking while carrying a tray","Walking while talking","Walking while holding a phone","Side-stepping in a tight space","Backing up without looking","Stepping over a threshold","Stepping over a pet or obstacle","Walking and looking around","Walking on a busy pavement","Weaving through furniture"],
  "Walking & dual-tasking", [A.walking, A.balance]);

list(["Scraping ice off the car","Shovelling snow","Putting up a Christmas tree","Hanging decorations","Carrying in the shopping in one trip","Wrapping presents at a table","Bringing bins in from the kerb","Clearing leaves from a gutter"],
  "Seasonal & occasional", [A.standing, A.reachHigh, A.carrying]);

list(["Opening a sachet or sauce packet","Peeling a banana","Shelling peas","Deboning a fish","Cracking an egg","Podding beans","Segmenting an orange","Unwrapping cling film","Opening a foil pouch"],
  "Food prep (fine)", [A.handFine, A.eating]);

// walking distances / endurance (genuine functional targets)
[["across a room",A.walking],["from the car park to the shop",A.walking],["around a supermarket",A.shopping],["up a flight of stairs without stopping",A.stairs],["for 5 minutes without a rest",A.walking],["for 15 minutes",A.walking],["to the end of the road and back",A.walking],["around the block",A.walking],["along the beach",A.walking],["around a museum",A.walking]].forEach(([o,ar]) => add(`Walking ${o}`, "Walking endurance", [A.walking, ar]));

// standing endurance targets
["Standing to prepare a meal for 20 minutes","Standing to wash up a full sink","Standing to do your hair and make-up","Standing while chatting at a gathering","Standing to fold a load of laundry","Standing to iron a few items","Standing at the kitchen counter","Standing to give a toast"].forEach(n => add(n, "Standing endurance", [A.standing, A.balance]));

// sitting endurance targets
["Sitting through a long car journey","Sitting to eat a full meal","Sitting at a computer for two hours","Sitting through a concert","Sitting on the floor to play a game","Sitting upright without back support","Sitting to read for an hour"].forEach(n => add(n, "Sitting endurance", [A.sitting]));

/* ---------------- 6) final coverage top-up ---------------- */

list(["Putting on earrings","Taking out earrings","Putting in a nose stud","Applying lip balm","Applying nail varnish","Removing nail varnish","Brushing long hair","Plaiting or braiding hair","Putting your hair up in a clip","Shaving under your arms","Cleaning your glasses","Putting on your glasses","Putting in a retainer","Applying face cream","Tweezing eyebrows"],
  "Grooming (detailed)", [A.handFine, A.reachHigh, A.grooming]);

list(["Reaching the spice rack","Getting a mug from a high shelf","Lifting a bag of flour","Pouring from a heavy jug","Popping a dishwasher tablet out","Loading a bottom kitchen drawer","Refilling the salt grinder","Emptying a full kettle","Scraping a plate into the bin","Draining a sink of water","Reaching the extractor fan","Wiping the inside of the microwave"],
  "Cooking & kitchen (detailed)", [A.cooking, A.reachHigh, A.reachLow]);

list(["Plumping the sofa cushions","Moving a dining chair","Rearranging the furniture","Vacuuming the stairs","Cleaning behind the toilet","Reaching the top of the shower to clean it","Wiping down the ceiling corners","Beating a rug","Shaking out a doormat"],
  "Housework (detailed)", [A.housework, A.reachHigh, A.reachLow]);

list(["Reading a utility bill","Splitting a restaurant bill","Working out the right change","Using a spreadsheet","Sorting through emails","Muting a phone call","Setting up a direct debit","Checking a bank balance","Reading a medicine label","Comparing prices while shopping"],
  "Money & admin (detailed)", [A.cognition, A.writing, A.handFine]);

list(["Getting onto a bus with a high step","Getting off an escalator smoothly","Stepping onto a moving walkway","Getting into a restaurant booth","Sliding across a car seat","Transferring onto a treatment couch","Getting onto an examination table","Stepping down off a train","Getting onto a stationary bike","Climbing a stepladder"],
  "Transfers & access (detailed)", [A.transfers, A.balance, A.stairs]);

list(["Doing up a dungaree clasp","Fastening a bike helmet","Attaching a key to a keyring","Attaching a name badge","Doing up a life-jacket buckle","Fastening ski or skate boots","Doing up a rucksack clip","Buckling a belt bag","Fastening a dog harness","Clipping on a lanyard","Doing up press-studs","Fastening a bra at the front then turning it"],
  "Fastenings & buckles", [A.handFine, A.grip]);

list(["Standing on tiptoe to reach","Squatting down to a low shelf","Twisting to look behind you","Leaning over to reach the far side","Crouching to plug in a device","Lunging to pick something up","Half-kneeling to reach low","Reaching overhead with both arms"],
  "Reaching & positioning", [A.reachHigh, A.reachLow, A.balance]);

/* ---------------- 7) miscellaneous everyday tasks ---------------- */
list(["Blowing your nose","Opening a window","Closing heavy curtains","Drawing the blinds","Locking up the house at night","Setting the thermostat","Feeding coins into a meter","Refilling a bird feeder","Filling the car with fuel","Checking the tyre pressure","Reading a map","Folding a road map or paper","Opening an ironing board","Hanging a coat on a hook","Loading a stapler","Replacing a toilet roll","Changing a bin bag","Screwing in a lightbulb","Opening a stiff drawer","Winding a clock","Setting a mousetrap","Threading a belt through loops","Doing up a poppers on a baby-grow","Peeling off a plaster","Opening a folding chair","Pumping up a tyre or ball","Carrying a hot water bottle","Wringing a mop","Shaking crumbs off a tablecloth","Rolling up a yoga mat"],
  "Everyday odd jobs", [A.handFine, A.grip, A.reachHigh]);

/* ---------------- emit ---------------- */
const banner = "/* AUTO-GENERATED by scripts/generate-adls.mjs — do not edit by hand.\n" +
  "   Occupational-therapy Activities of Daily Living for the History ADL search.\n" +
  "   { n: name, c: category, a: [functional-area codes] }. */\n";
writeFileSync(OUT, banner + "window.ADLS = " + JSON.stringify(out) + ";\n");

const byCat = {};
out.forEach(o => { byCat[o.c] = (byCat[o.c] || 0) + 1; });
console.log(`Wrote ${out.length} ADL tasks across ${Object.keys(byCat).length} categories to ${OUT}`);
