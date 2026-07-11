/* =====================================================================
   PhysioPath — return-to-activity list generator
   Produces data/activities.js -> window.ACTIVITIES = [ "…", … ] (~10,000)
   Powers the "activity you want to return to" auto-populate field in Details.
   Everyday life, work, family, recreation & hobby activities (non-sport).
   Educational content only.
===================================================================== */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = `${__dirname}/../data/activities.js`;
const TARGET = 10000;

/* Base activities grouped by theme (kept as natural phrases). */
const BASE = [
  // ---- getting around / mobility ----
  "walking the dog","walking to the shops","walking up hills","walking on uneven ground","walking longer distances",
  "climbing stairs","climbing ladders","hiking","going for long walks","power walking","walking without a stick",
  "standing for long periods","standing while cooking","standing at a bar","getting up from the floor",
  "getting up from a low chair","getting in and out of the car","getting in and out of the bath","getting out of bed easily",
  "kneeling","squatting down","crouching to reach low shelves","bending to tie my shoes","stepping over obstacles",
  "running for the bus","jogging lightly","cycling to work","riding a bike","using public transport","driving comfortably",
  // ---- lifting / carrying ----
  "carrying groceries","carrying shopping bags","lifting boxes","lifting heavy objects","carrying a laundry basket",
  "carrying luggage","lifting suitcases into the overhead locker","moving furniture","carrying firewood",
  "lifting bags of compost","carrying buckets of water","loading the dishwasher","unloading the shopping",
  "lifting weights at the gym","pushing a heavy trolley","pulling a wheeled suitcase",
  // ---- home & garden ----
  "gardening","weeding the garden","mowing the lawn","raking leaves","digging","planting flowers","pruning hedges",
  "shovelling snow","washing the car","vacuuming","mopping floors","sweeping","dusting high shelves","cleaning windows",
  "hanging out the washing","ironing","making the bed","changing bed sheets","reaching overhead cupboards",
  "painting a room","hanging pictures","DIY around the house","assembling flat-pack furniture","hammering and drilling",
  "cleaning the bathroom","scrubbing the floor","taking out the bins","tidying the house",
  // ---- family / caring ----
  "picking up my children","picking up my grandchildren","lifting a toddler","carrying a baby","pushing a pram",
  "pushing a stroller","playing with my kids on the floor","playing with the grandchildren","bathing the children",
  "getting a child into a car seat","carrying a child on my shoulders","caring for an elderly relative",
  "helping someone in and out of bed","dressing myself independently","showering independently","looking after my pets",
  // ---- work ----
  "sitting at a desk all day","working at a computer","typing for long periods","standing all day at work",
  "lifting at work","manual handling at work","working on a production line","operating machinery","driving for work",
  "climbing scaffolding","working overhead","kneeling to lay flooring","stocking shelves","serving customers",
  "nursing and patient handling","hairdressing","working as a chef on my feet","teaching on my feet all day",
  "cleaning as a job","warehouse picking and packing","construction work","landscaping work","farm work",
  // ---- hobbies / recreation / social ----
  "dancing","dancing at a wedding","going out dancing","playing a musical instrument","playing the guitar",
  "playing the piano","playing the drums","singing in a choir","knitting","sewing","crafting","woodworking",
  "pottery","painting and drawing","photography","fishing","camping","travelling","sightseeing on holiday",
  "going to concerts","going to festivals","attending church","kneeling to pray","meditating cross-legged",
  "gardening as a hobby","birdwatching","foraging","cooking for the family","baking","hosting dinner parties",
  "going grocery shopping","shopping for clothes","sitting through a movie","sitting at a restaurant",
  "playing with the dog in the park","throwing a ball for the dog","flying a kite with the kids","building sandcastles",
  "swimming at the beach","paddling in the sea","riding a rollercoaster","bowling with friends","playing darts at the pub",
  "playing board games on the floor","doing yoga at home","stretching in the morning","exercising at the gym",
  "using the cross-trainer","using the treadmill","doing an exercise class","doing Pilates","doing tai chi",
  // ---- sleep / comfort / basics ----
  "sleeping through the night","sleeping on my side","turning over in bed","sitting comfortably for long periods",
  "sitting cross-legged on the floor","standing up straight","looking over my shoulder to reverse the car",
  "reaching behind my back","reaching up to a high shelf","carrying a hot drink without spilling",
  "opening jars","gripping tools","writing by hand","doing up buttons","brushing my hair"
];

/* Context modifiers -> natural variations. Keep grammatically simple. */
const CTX = [
  "without pain","pain-free","without a flare-up","with confidence","without fear of re-injury",
  "for 30 minutes","for an hour","all day","first thing in the morning","after a long day",
  "with heavier loads","repeatedly","on uneven ground","for longer than before","several times a day",
  "again like I used to","without needing a break","without help","at full strength","without stiffness afterwards",
  "at work","with the kids","with the grandchildren","on holiday","at the weekend"
];

/* ---- generation ---- */
const out = [];
const seen = new Set();
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
const push = (str)=>{ const s=cap(str.replace(/\s+/g," ").trim()); const k=s.toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push(s); } };

function combine(fn){ for(const c of CTX){ for(const b of BASE){ if(out.length>=TARGET) return; fn(b,c); } } }

// tier 1 — bases as "Return to …"
for(const b of BASE) push(`Return to ${b}`);
// tier 2 — plain bases (capitalised) so search matches either phrasing
for(const b of BASE) push(b);
// tier 3 — "Return to … <context>"
combine((b,c)=> push(`Return to ${b} ${c}`));
// tier 4 — "Getting back to … <context>" (works with the -ing base phrasing)
combine((b,c)=> push(`Getting back to ${b} ${c}`));
// tier 5 — "… <context>" (plain, top-up any remainder)
combine((b,c)=> push(`${b} ${c}`));

const list = out.slice(0, TARGET);
mkdirSync(dirname(OUT), { recursive:true });
const banner = `/* AUTO-GENERATED by scripts/generate-activities.mjs — do not edit by hand.
   ${list.length} everyday / work / recreation activities for the return-to-activity field.
   Educational content only. */\n`;
writeFileSync(OUT, `${banner}window.ACTIVITIES = ${JSON.stringify(list)};\n`);
console.log(`Wrote ${list.length} activities to ${OUT} (${(Buffer.byteLength(JSON.stringify(list))/1024).toFixed(0)} KB) from ${BASE.length} base activities`);
