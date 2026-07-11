/* =====================================================================
   PhysioPath — sports & sport-variation list generator
   Produces data/sports.js -> window.SPORTS = [ "…", … ] (~10,000 strings)
   Used for the "sport you want to get back to" auto-populate field in Details.
   Demand/return-to-sport logic is keyword-based in app.js (SPORT_DEMANDS),
   so this file is just a rich, de-duplicated suggestion list.
   Educational content only.
===================================================================== */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = `${__dirname}/../data/sports.js`;
const TARGET = 10000;

/* Shared variation vocabularies */
const LEVELS = ["recreational","amateur","club-level","collegiate","semi-professional","professional","masters / veterans","youth / junior","Olympic","Paralympic"];
const RACQUET_FMT = ["singles","doubles","mixed doubles"];
const RUN_DIST = ["100 m","200 m","400 m","800 m","1500 m","the mile","3000 m","5 km","10 km","half marathon","marathon","50 km ultra","100 km ultra","100-mile ultra"];
const SWIM = ["freestyle","backstroke","breaststroke","butterfly","individual medley","50 m","100 m","200 m","open water","masters"];
const CYCLE = ["road racing","criterium","time trial","gran fondo","sportive","gravel","cyclocross","track","mountain (cross-country)","mountain (downhill)","enduro"];
const SETTINGS = ["indoor","outdoor","beach","wheelchair","adaptive"];

/* Base sports. Optional: pos (positions/roles), disc (disciplines/events),
   fmt (formats). Rich lists on major sports carry most of the variety. */
const S = [
  // ---- Football codes / field & court team sports ----
  {n:"Soccer", pos:["goalkeeper","centre-back","full-back","wing-back","defensive midfielder","central midfielder","attacking midfielder","winger","striker","centre-forward"], fmt:["5-a-side","7-a-side","11-a-side","futsal","indoor","beach"]},
  {n:"Futsal", pos:["goalkeeper","defender","winger","pivot"]},
  {n:"American football", pos:["quarterback","running back","wide receiver","tight end","offensive lineman","defensive lineman","linebacker","cornerback","safety","kicker","punter"], fmt:["tackle","flag","7-on-7","touch"]},
  {n:"Rugby union", pos:["prop","hooker","lock","flanker","number 8","scrum-half","fly-half","centre","wing","full-back"], fmt:["fifteens","sevens","tens","touch"]},
  {n:"Rugby league", pos:["prop","hooker","second-row","loose forward","half-back","five-eighth","centre","wing","full-back"], fmt:["thirteens","nines"]},
  {n:"Australian rules football", pos:["full-forward","half-forward","centre","wing","ruck","half-back","full-back"]},
  {n:"Gaelic football", pos:["goalkeeper","full-back","half-back","midfielder","half-forward","full-forward"]},
  {n:"Field hockey", pos:["goalkeeper","defender","midfielder","forward"], fmt:["outdoor","indoor"]},
  {n:"Ice hockey", pos:["goaltender","defenceman","centre","left wing","right wing"], fmt:["ice","roller","pond","sledge"]},
  {n:"Lacrosse", pos:["attackman","midfielder","defender","goalie"], fmt:["field","box","women's","sixes"]},
  {n:"Handball", pos:["goalkeeper","wing","back","pivot","centre"], fmt:["indoor","beach"]},
  {n:"Water polo", pos:["goalkeeper","centre-forward","centre-back","driver","wing"]},
  {n:"Netball", pos:["goal shooter","goal attack","wing attack","centre","wing defence","goal defence","goal keeper"]},
  {n:"Volleyball", pos:["setter","outside hitter","opposite","middle blocker","libero","defensive specialist"], fmt:["indoor","beach","sitting","4-a-side"]},
  {n:"Cricket", pos:["opening batsman","top-order batsman","middle-order batsman","wicket-keeper","fast bowler","spin bowler","all-rounder"], fmt:["Test","one-day","T20","the Hundred","indoor"]},
  {n:"Baseball", pos:["pitcher","catcher","first baseman","second baseman","shortstop","third baseman","outfielder","designated hitter"]},
  {n:"Softball", pos:["pitcher","catcher","infielder","outfielder"], fmt:["fast-pitch","slow-pitch"]},
  {n:"Basketball", pos:["point guard","shooting guard","small forward","power forward","centre"], fmt:["5-on-5","3x3","half-court","wheelchair","streetball"]},
  {n:"Ultimate frisbee", pos:["handler","cutter"]},
  {n:"Floorball", pos:["goalkeeper","defender","centre","forward"]},
  {n:"Korfball"}, {n:"Hurling"}, {n:"Camogie"}, {n:"Bandy"}, {n:"Dodgeball"}, {n:"Kickball"}, {n:"Polo"}, {n:"Sepak takraw"},

  // ---- Racquet / paddle ----
  {n:"Tennis", fmt:RACQUET_FMT, disc:["hard court","clay court","grass court"]},
  {n:"Badminton", fmt:RACQUET_FMT},
  {n:"Squash", fmt:["singles","doubles"]},
  {n:"Racquetball", fmt:["singles","doubles"]},
  {n:"Table tennis", fmt:RACQUET_FMT},
  {n:"Pickleball", fmt:RACQUET_FMT},
  {n:"Padel", fmt:["doubles"]},
  {n:"Platform tennis"}, {n:"Real tennis"}, {n:"Beach tennis"},

  // ---- Running / athletics ----
  {n:"Running", disc:RUN_DIST, fmt:["road","track","trail","cross-country","treadmill"]},
  {n:"Sprinting", disc:["60 m","100 m","200 m","400 m"]},
  {n:"Track and field", disc:["100 m","200 m","400 m","800 m","1500 m","5000 m","10000 m","110 m hurdles","400 m hurdles","3000 m steeplechase","4x100 m relay","4x400 m relay"]},
  {n:"Marathon", disc:["road","trail","ultra"]},
  {n:"Trail running", disc:["10 km","half marathon","marathon","50 km","100 km","skyrunning"]},
  {n:"Cross-country running"},
  {n:"Race walking", disc:["10 km","20 km","35 km","50 km"]},
  {n:"Hurdles"}, {n:"Steeplechase"}, {n:"Long jump"}, {n:"Triple jump"}, {n:"High jump"}, {n:"Pole vault"},
  {n:"Shot put"}, {n:"Discus throw"}, {n:"Hammer throw"}, {n:"Javelin throw"},
  {n:"Decathlon"}, {n:"Heptathlon"}, {n:"Pentathlon"},
  {n:"Parkour"}, {n:"Obstacle course racing", disc:["Spartan","Tough Mudder","ninja","short course","ultra-beast"]}, {n:"Orienteering"},

  // ---- Endurance / multisport / cycling ----
  {n:"Triathlon", disc:["sprint","Olympic-distance","half-Ironman (70.3)","Ironman (140.6)","super-sprint"]},
  {n:"Duathlon"}, {n:"Aquathlon"},
  {n:"Cycling", disc:CYCLE},
  {n:"Road cycling", disc:["racing","criterium","time trial","gran fondo","sportive"]},
  {n:"Mountain biking", disc:["cross-country","downhill","enduro","trail","dirt jump"]},
  {n:"BMX", disc:["racing","freestyle park","flatland","dirt"]},
  {n:"Track cycling", disc:["sprint","keirin","pursuit","points race","madison"]},
  {n:"Cyclocross"}, {n:"Gravel cycling"}, {n:"Spinning / indoor cycling"}, {n:"Unicycling"},

  // ---- Water sports ----
  {n:"Swimming", disc:SWIM},
  {n:"Open water swimming", disc:["1 km","5 km","10 km marathon","ice swimming"]},
  {n:"Diving", disc:["springboard","platform (10 m)","synchronised"]},
  {n:"Synchronised swimming"},
  {n:"Rowing", disc:["single scull","double scull","quad","coxless pair","coxed four","eight","indoor (erg)"]},
  {n:"Kayaking", disc:["sprint","slalom","sea","whitewater","surf ski","polo"]},
  {n:"Canoeing", disc:["sprint","slalom","marathon"]},
  {n:"Stand-up paddleboarding", disc:["racing","touring","surf","yoga"]},
  {n:"Surfing", disc:["shortboard","longboard","big-wave","tow-in"]},
  {n:"Windsurfing"}, {n:"Kitesurfing"}, {n:"Wakeboarding"}, {n:"Water skiing"}, {n:"Bodyboarding"},
  {n:"Sailing", disc:["dinghy","keelboat","catamaran","windsurf","offshore"]},
  {n:"Dragon boat racing"}, {n:"Scuba diving"}, {n:"Freediving"}, {n:"Snorkeling"},

  // ---- Combat / martial arts ----
  {n:"Boxing", fmt:["amateur","white-collar","professional"]},
  {n:"Kickboxing"}, {n:"Muay Thai"},
  {n:"Mixed martial arts"},
  {n:"Wrestling", disc:["freestyle","Greco-Roman","folkstyle","beach"]},
  {n:"Judo"}, {n:"Brazilian jiu-jitsu", disc:["gi","no-gi"]},
  {n:"Karate", disc:["kumite","kata"]}, {n:"Taekwondo", disc:["sparring","poomsae"]},
  {n:"Kung fu"}, {n:"Aikido"}, {n:"Krav maga"}, {n:"Fencing", disc:["foil","épée","sabre"]},
  {n:"Sumo"}, {n:"Sambo"}, {n:"Capoeira"}, {n:"Kendo"}, {n:"Hapkido"}, {n:"Wing chun"},

  // ---- Strength / fitness ----
  {n:"Weightlifting", disc:["snatch","clean and jerk"]},
  {n:"Olympic weightlifting"},
  {n:"Powerlifting", disc:["squat","bench press","deadlift","full meet"]},
  {n:"Bodybuilding", disc:["men's physique","classic physique","figure","bikini"]},
  {n:"CrossFit"}, {n:"Strongman"}, {n:"Calisthenics"}, {n:"Kettlebell sport"},
  {n:"Functional fitness"}, {n:"HIIT training"}, {n:"Circuit training"}, {n:"Hyrox"},

  // ---- Gymnastics / dance / acrobatic ----
  {n:"Gymnastics", disc:["floor","vault","balance beam","uneven bars","pommel horse","rings","parallel bars","high bar"]},
  {n:"Artistic gymnastics"}, {n:"Rhythmic gymnastics"}, {n:"Trampolining"}, {n:"Tumbling"}, {n:"Acrobatics"},
  {n:"Cheerleading", disc:["all-star","sideline","stunt","tumbling"]},
  {n:"Pole fitness"}, {n:"Aerial silks"}, {n:"Aerial hoop"},
  {n:"Ballet"}, {n:"Contemporary dance"}, {n:"Ballroom dance"}, {n:"Latin dance"}, {n:"Hip-hop dance"},
  {n:"Breakdancing"}, {n:"Tap dance"}, {n:"Irish dance"}, {n:"Salsa"}, {n:"Swing dance"}, {n:"Pole dancing"},
  {n:"Figure skating", disc:["singles","pairs","ice dance","synchronised"]},
  {n:"Ice dancing"}, {n:"Baton twirling"},

  // ---- Snow & ice ----
  {n:"Alpine skiing", disc:["downhill","slalom","giant slalom","super-G"]},
  {n:"Cross-country skiing", disc:["classic","skate","sprint"]},
  {n:"Freestyle skiing", disc:["moguls","aerials","slopestyle","halfpipe","ski cross"]},
  {n:"Ski jumping"}, {n:"Biathlon"},
  {n:"Snowboarding", disc:["freestyle","slopestyle","halfpipe","big air","boardercross","alpine"]},
  {n:"Snowshoeing"}, {n:"Bobsled"}, {n:"Luge"}, {n:"Skeleton"},
  {n:"Speed skating", disc:["long track","short track"]},
  {n:"Curling"}, {n:"Ice climbing"},

  // ---- Climbing / outdoor ----
  {n:"Rock climbing", disc:["sport","trad","top-rope","lead","deep-water solo"]},
  {n:"Bouldering"}, {n:"Sport climbing", disc:["lead","speed","boulder"]},
  {n:"Mountaineering"}, {n:"Hiking"}, {n:"Backpacking"}, {n:"Via ferrata"}, {n:"Canyoning"}, {n:"Caving"},
  {n:"Scrambling"}, {n:"Fell running"},

  // ---- Wheels / board ----
  {n:"Skateboarding", disc:["street","park","vert","downhill","freestyle"]},
  {n:"Longboarding"}, {n:"Roller skating"}, {n:"Inline skating"}, {n:"Roller derby"}, {n:"Scootering"},
  {n:"Aggressive inline"},

  // ---- Precision / target / lawn ----
  {n:"Golf", disc:["18-hole","9-hole","links","par-3","pitch and putt"]},
  {n:"Disc golf"}, {n:"Archery", disc:["recurve","compound","barebow","field"]},
  {n:"Shooting", disc:["rifle","pistol","shotgun / clay","air rifle"]},
  {n:"Darts"}, {n:"Billiards"}, {n:"Snooker"}, {n:"Pool"}, {n:"Bowling", disc:["ten-pin","candlepin","duckpin"]},
  {n:"Lawn bowls"}, {n:"Bocce"}, {n:"Pétanque"}, {n:"Croquet"}, {n:"Shuffleboard"}, {n:"Cornhole"}, {n:"Horseshoes"},

  // ---- Equestrian / animal / motor ----
  {n:"Horse riding", disc:["dressage","show jumping","eventing","western","endurance","trail"]},
  {n:"Show jumping"}, {n:"Dressage"}, {n:"Eventing"}, {n:"Rodeo"}, {n:"Barrel racing"}, {n:"Horse racing"},
  {n:"Motocross"}, {n:"Motorcycle racing"}, {n:"Karting"}, {n:"Auto racing"},

  // ---- Mind–body / low-impact ----
  {n:"Yoga", disc:["vinyasa","hatha","ashtanga","power","hot / Bikram","yin","aerial"]},
  {n:"Pilates", disc:["mat","reformer"]},
  {n:"Tai chi"}, {n:"Qigong"}, {n:"Barre"}, {n:"Aqua aerobics"}, {n:"Nordic walking"},
  {n:"Walking football"}, {n:"Walking netball"}, {n:"Walking basketball"}
];

/* ---- generation ---- */
const out = [];
const seen = new Set();
const push = (str) => {
  const s = str.replace(/\s+/g," ").trim();
  const k = s.toLowerCase();
  if(!seen.has(k)){ seen.add(k); out.push(s); }
};

// tier 1 — base names
for(const sp of S) push(sp.n);
// tier 2 — disciplines/events
for(const sp of S) (sp.disc||[]).forEach(d=> push(`${sp.n} — ${d}`));
// tier 3 — positions/roles
for(const sp of S) (sp.pos||[]).forEach(p=> push(`${sp.n} (${p})`));
// tier 4 — formats
for(const sp of S) (sp.fmt||[]).forEach(f=> push(`${sp.n} — ${f}`));
// tier 5 — position × format combos (team sports carry a lot of real variety)
for(const sp of S){ if(out.length>=TARGET) break;
  (sp.pos||[]).forEach(p=>(sp.fmt||[]).forEach(f=> push(`${sp.n} (${p}) — ${f}`))); }
// tier 6 — level applied to each base
for(const lv of LEVELS){ for(const sp of S){ if(out.length>=TARGET) break; push(`${sp.n} — ${lv}`); } if(out.length>=TARGET) break; }
// tier 7 — discipline × level
for(const lv of LEVELS){ for(const sp of S){ if(out.length>=TARGET) break;
  (sp.disc||[]).forEach(d=> push(`${sp.n} — ${d} (${lv})`)); } if(out.length>=TARGET) break; }
// tier 8 — position × level
for(const lv of LEVELS){ for(const sp of S){ if(out.length>=TARGET) break;
  (sp.pos||[]).forEach(p=> push(`${sp.n} (${p}) — ${lv}`)); } if(out.length>=TARGET) break; }
// tier 9 — setting × base to top up
for(const st of SETTINGS){ for(const sp of S){ if(out.length>=TARGET) break; push(`${st} ${sp.n.toLowerCase()}`); } if(out.length>=TARGET) break; }
// tier 10 — format × level
for(const lv of LEVELS){ for(const sp of S){ if(out.length>=TARGET) break;
  (sp.fmt||[]).forEach(f=> push(`${sp.n} — ${f} (${lv})`)); } if(out.length>=TARGET) break; }
// tier 11 — position × discipline (team sports with both carry lots of real variety)
for(const sp of S){ if(out.length>=TARGET) break;
  (sp.pos||[]).forEach(p=>(sp.disc||[]).forEach(d=> push(`${sp.n} (${p}) — ${d}`))); }
// tier 12 — discipline × setting
for(const st of SETTINGS){ for(const sp of S){ if(out.length>=TARGET) break;
  (sp.disc||[]).forEach(d=> push(`${st} ${sp.n.toLowerCase()} — ${d}`)); } if(out.length>=TARGET) break; }
// tier 13 — discipline × level (second pass, remaining sports)
for(const lv of LEVELS){ for(const sp of S){ if(out.length>=TARGET) break;
  (sp.fmt||[]).forEach(f=>(sp.disc||[]).forEach(d=> push(`${sp.n} — ${d}, ${f}`))); } if(out.length>=TARGET) break; }
// tier 14 — setting × base × level to fill any remainder
for(const lv of LEVELS){ for(const st of SETTINGS){ for(const sp of S){ if(out.length>=TARGET) break;
  push(`${st} ${sp.n.toLowerCase()} — ${lv}`); } if(out.length>=TARGET) break; } if(out.length>=TARGET) break; }

const list = out.slice(0, TARGET);
mkdirSync(dirname(OUT), { recursive:true });
const banner = `/* AUTO-GENERATED by scripts/generate-sports.mjs — do not edit by hand.
   ${list.length} sports & sport variations for the return-to-sport auto-populate field.
   Educational content only. */\n`;
writeFileSync(OUT, `${banner}window.SPORTS = ${JSON.stringify(list)};\n`);
console.log(`Wrote ${list.length} sports to ${OUT} (${(Buffer.byteLength(JSON.stringify(list))/1024).toFixed(0)} KB) from ${S.length} base sports`);
