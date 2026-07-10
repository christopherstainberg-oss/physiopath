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
const HISTORY_ITEMS = [
  { flag:"cardiac",         label:"Heart condition (heart disease, prior heart attack, heart failure, angina)" },
  { flag:"hypertension",    label:"High blood pressure" },
  { flag:"pacemaker_icd",   label:"Pacemaker or ICD" },
  { flag:"pulmonary",       label:"Lung / breathing condition (COPD, asthma, etc.)" },
  { flag:"osteoporosis",    label:"Osteoporosis or low bone density" },
  { flag:"recent_fracture", label:"A fracture in the last 3 months" },
  { flag:"hip_replacement", label:"Recent hip replacement" },
  { flag:"knee_replacement",label:"Recent knee replacement" },
  { flag:"balance_risk",    label:"Dizziness, vertigo, or balance / falls problems" },
  { flag:"neuropathy",      label:"Numbness, tingling, or nerve damage" },
  { flag:"dvt",             label:"Blood-clot history (DVT/PE) or taking blood thinners" },
  { flag:"pregnancy",       label:"Pregnant or recently postpartum" },
  { flag:"seizure",         label:"Seizures or epilepsy" },
  { flag:"recent_surgery",  label:"Any surgery in the last 6 weeks" },
  { flag:"diabetes",        label:"Diabetes" }
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

/* ---------- state ---------- */
const state = {
  step:0, age:"", sex:"", flags:[], parq:{pain:false,faint:false,doc:false},
  meds:"", notes:"", condIds:[], weeks:null, painRest:3, painMove:4, surgery:"no",
  fitness:"mod", goal:"", program:null
};
const CONMAP = new Map();
let domainFilter = "all";

/* ---------- persistence ---------- */
function save(){ try{ localStorage.setItem("physiopath", JSON.stringify(state)); }catch(e){} }
function load(){ try{ const s=JSON.parse(localStorage.getItem("physiopath")); if(s) Object.assign(state,s); }catch(e){} }

/* ---------- helpers ---------- */
const classify = w => (w===null||isNaN(w)) ? null : (w<=6 ? "acute" : "chronic");
function selectedConditions(){ return state.condIds.map(id=>CONMAP.get(id)).filter(Boolean); }

/* Gather every active contraindication flag from history + PAR-Q + conditions + age. */
function gatherFlags(){
  const f = new Set(state.flags);
  if(state.parq.pain || state.parq.faint) f.add("cardiac");
  if(Number(state.age) >= 75) f.add("balance_risk");
  if(state.surgery === "yes") f.add("recent_surgery");
  selectedConditions().forEach(c => (c.autoFlags||[]).forEach(x=>f.add(x)));
  return Array.from(f);
}
function clearanceNeeded(flags){
  return window.needsClearance(flags) || state.parq.pain || state.parq.faint || state.parq.doc ||
    selectedConditions().some(c=>c.clearance);
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
function loadGuidance(){
  if(state.painMove>=7) return "Keep effort very light. Pain during exercise should stay at/below 3/10 and settle within an hour.";
  if(state.painMove>=4) return "Mild discomfort (up to ~4/10) during loading is acceptable if it settles by the next morning. Sharp pain means back off.";
  return "You can load with confidence. Progress ~10% per week while pain stays low and settles overnight.";
}

/* ---------- build the program ---------- */
function generateProgram(){
  const conds = selectedConditions();
  const track = classify(state.weeks) || "acute";
  const flags = gatherFlags();
  const phaseWeeks = buildPhaseWeeks(track);
  const tmpl = TEMPLATE[track];
  const removedAll = new Map();

  const items = conds.map(c=>{
    const proto = window.getProtocol(c.protocol);
    let cursor=1;
    const phases = proto.map((pool,p)=>{
      const len = phaseWeeks[p], wkStart=cursor, wkEnd=cursor+len-1; cursor=wkEnd+1;
      const { kept, removed } = window.applyContra(pool, flags);
      window.ensureMinimum(kept, flags, 3);
      removed.forEach(r=>removedAll.set(r.n, r.tag));
      return { title:tmpl.phases[p].title, goal:tmpl.phases[p].goal, weekStart:wkStart, weekEnd:wkEnd, ex:kept };
    });
    return { name:c.name, domain:c.domain, region:c.region, supervision:c.supervision, phases,
      about:aboutText(c, track), redflags:DOMAIN_REDFLAGS[c.domain] };
  });

  return {
    track, totalWeeks:tmpl.total, sessions:sessionsText(track), load:loadGuidance(),
    flags, notes:window.notesForFlags(flags), clearance:clearanceNeeded(flags),
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
  breath_hold:"breath-holding", aerobic:"sustained aerobic effort"
};

/* ---------- render program ---------- */
function renderProgram(prog){
  const out = $("#programOut");
  if(!prog || !prog.items.length){
    out.innerHTML = `<div class="card empty"><div class="big">🗓️</div><div>No program yet — complete the earlier steps and generate.</div></div>`;
    return;
  }
  const trackBadge = prog.track==="acute"
    ? `<span class="badge acute">Acute track · 0–6 wks</span>`
    : `<span class="badge chronic">Chronic track · 6+ wks</span>`;
  const supMap = {self:["Self-guided OK","self"],supervised:["Clinician-supervised advised","supervised"],clinical:["Medical clearance required","clinical"]};
  const [supTxt,supCls] = supMap[prog.supervision];

  let html = `<div class="card">
    <h2>Your ${prog.totalWeeks}-week program ${trackBadge}</h2>
    <p class="hint">Built for ${esc(String(state.weeks))} week(s) in, pain ${state.painRest}/10 at rest and ${state.painMove}/10 on movement${state.surgery==="yes"?", post-surgical":""}.
      ${state.goal?`Goal: <b>${esc(state.goal)}</b>.`:""}</p>
    <div class="summary">
      <div class="stat"><div class="k">Length</div><div class="v">${prog.totalWeeks} wks</div></div>
      <div class="stat"><div class="k">Frequency</div><div class="v" style="font-size:14px">${prog.sessions}</div></div>
      <div class="stat"><div class="k">Conditions</div><div class="v">${prog.items.length}</div></div>
      <div class="stat"><div class="k">Supervision</div><div class="v" style="font-size:13px"><span class="sup ${supCls}">${supTxt}</span></div></div>
    </div>`;

  if(prog.clearance){
    html += `<div class="banner clear"><b>⚠ Get medical clearance before starting.</b> Based on your history and/or condition,
      you should be cleared by a doctor — and ideally supervised (e.g. a cardiac/pulmonary rehab or physiotherapy program) —
      before beginning. Treat everything below as general education to discuss with your care team.</div>`;
  }
  if(prog.notes.length){
    html += `<div class="banner info"><b>Your personalized precautions</b><ul class="notelist">` +
      prog.notes.map(n=>`<li>${esc(n)}</li>`).join("") + `</ul></div>`;
  }
  html += `<div class="banner load"><b>Load guidance:</b> ${esc(prog.load)}</div>`;
  if(prog.removed.length){
    html += `<div class="removed"><b>Adjusted for your safety —</b> we removed exercises involving ` +
      esc([...new Set(prog.removed.map(r=>TAG_LABEL[r.tag]||r.tag))].join(", ")) +
      ` and substituted safer options where needed.</div>`;
  }
  html += `</div>`;

  prog.items.forEach(item=>{
    html += `<div class="card"><h2>${esc(item.name)}</h2><p class="hint">${esc(item.about)}</p>`;
    item.phases.forEach((ph,i)=>{
      const rows = ph.ex.map(e=>`
        <li class="exitem">
          <div class="top"><span class="en">${esc(e.n)}</span><span class="ed">${esc(e.d)}</span></div>
          <div class="ec">${esc(e.c)}</div>
          ${e.warn?`<span class="warnpill">⚠ Modify — involves ${esc(TAG_LABEL[e.warn]||e.warn)}; reduce range/load and keep it symptom-free.</span>`:""}
          ${e.sub?`<span class="subpill">safer substitute for your precautions</span>`:""}
        </li>`).join("");
      html += `<div class="phase ${i===0?"open":""}">
        <div class="head" onclick="this.parentElement.classList.toggle('open')">
          <div class="pnum">${i+1}</div>
          <div><div class="ptitle">${esc(ph.title)} <span class="pweeks">· Weeks ${ph.weekStart}–${ph.weekEnd}</span></div>
          <div class="goal">${esc(ph.goal)}</div></div>
          <div class="caret">▾</div>
        </div>
        <div class="body"><ul class="exlist">${rows}</ul>
          <div class="freq">Advance when this phase feels controlled and symptoms are low & stable — the weeks are a guide, not a rule.</div>
        </div></div>`;
    });
    html += `<div class="redflags"><b>⚠ When to get it checked:</b> ${esc(item.redflags)}</div></div>`;
  });

  html += suggestionsCard(prog);
  out.innerHTML = html;
}

function suggestionsCard(prog){
  const acute = prog.track==="acute";
  const base = acute ? [
    "<b>Protect, don't fully rest.</b> Gentle pain-free movement in the early weeks keeps tissue healthy and prevents stiffness.",
    "<b>Swelling:</b> compression, elevation and gentle movement do the most; ice can ease pain in the first few days.",
    "<b>Pain as a guide:</b> mild discomfort is okay; sharp or lingering pain that's worse the next morning means ease off.",
    "<b>Sleep & protein:</b> aim for 7–9 hours and ~1.6 g protein per kg per day to rebuild tissue.",
    "<b>Consistency beats intensity</b>, especially early — short frequent sessions win."
  ] : [
    "<b>Load is the medicine.</b> Chronic tissue improves with steady progressive loading; some discomfort (≤3–4/10) that settles overnight is fine.",
    "<b>Be patient</b> — tissue adapts over weeks to months in a trend, not a straight line. Small flare-ups are normal.",
    "<b>Manage total load:</b> increase by ~10% per week at most.",
    "<b>Address the cause</b> — training errors, footwear, ergonomics, and strength gaps.",
    "<b>Sleep, protein, and stress</b> all change how much your tissues tolerate."
  ];
  const domains = new Set(prog.items.map(i=>i.domain));
  if(domains.has("cardiac")) base.push("<b>Cardiac:</b> use the talk-test — you should be able to hold a conversation. Warm up and cool down fully, and never hold your breath during effort.");
  if(domains.has("pulmonary")) base.push("<b>Breathing:</b> pace exercise with pursed-lip breathing, rest when breathless, and use prescribed oxygen. Breathlessness is expected — dizziness or chest pain is not.");
  if(domains.has("neuro")) base.push("<b>Neurological recovery:</b> repetition and specificity drive change. Practice the actual movements you want back, safely and often, near support.");
  return `<div class="card"><h2>Suggestions for your recovery</h2><ul class="tips">${base.map(t=>`<li>${t}</li>`).join("")}</ul>
    <p class="hint" style="margin-top:8px">Questions about any of this? Open the <b>AI Coach</b> tab.</p></div>`;
}

/* =====================================================================
   AI COACH
===================================================================== */
const KB = [
  { kw:["ice","heat","cold","warm","heating pad"], a:()=>"General rule: **ice** calms pain and swelling in the first few days after an acute injury or a flare-up (15–20 min, with a cloth barrier). **Heat** suits chronic stiffness and warming up before exercise. Neither speeds healing much — gentle movement does more. Acute & swollen → ice; stiff & achy → heat." },
  { kw:["pain during","hurts when i exercise","should it hurt","how much pain","pain while","normal to feel pain"], a:()=>`Some discomfort is expected. Rule of thumb: pain **up to ~3–4/10 during and after** exercise is okay **if it settles within 24 hours**. ${state.program&&state.program.track==="chronic"?"For your chronic-stage tissue, that mild loading discomfort is part of recovery. ":""}**Sharp, spreading, or worsening** pain — or being more sore the next morning — means the dose was too much. Reduce and progress slower.` },
  { kw:["how often","how many times","frequency","days per week","every day","daily"], a:()=>`${state.program?`Your plan suggests **${state.program.sessions}**. `:""}Early on, "little and often" beats occasional hard sessions. As you strengthen, 3–5 focused sessions/week with rest between heavier days is ideal.` },
  { kw:["acute","chronic","difference between acute","how long is acute"], a:()=>"**Acute** = recent, roughly the first 0–6 weeks, when tissue is inflamed and healing — care protects it while keeping gentle motion. **Chronic** = beyond ~6 weeks (or recurring) — recovery shifts to **progressive loading and strengthening**. PhysioPath picks the track from how many weeks ago your injury began." },
  { kw:["precaution","contraindication","avoid","not do","safe to do","careful","restrictions","what should i avoid"], a:()=>{
      const n = state.program ? state.program.notes : window.notesForFlags(gatherFlags());
      if(!n.length) return "Based on what you entered, no specific medical precautions were flagged — but always stop for sharp or spreading pain, chest pain, severe breathlessness, or dizziness, and progress gradually.";
      return "Based on your history, keep these in mind:\n\n• " + n.join("\n\n• ");
    } },
  { kw:["clearance","see a doctor","should i see","doctor","emergency","serious","physical therapist","professional","get it checked"], a:()=>{
      const need = state.program ? state.program.clearance : clearanceNeeded(gatherFlags());
      const rf = "**Red flags** needing prompt care: chest pain, severe breathlessness, fainting, sudden weakness/numbness, trouble speaking, loss of bladder/bowel control, a hot swollen joint with fever, or inability to bear weight. ";
      return (need?"Because of your history and/or condition, **you should be cleared by a doctor — ideally supervised — before starting.** ":"") + rf + "This app can't examine you; an in-person assessment is always the safe choice when unsure." } },
  { kw:["swelling","swollen","swell","inflammation"], a:()=>"For swelling: **compression, elevation, and gentle movement** (muscle contractions pump fluid away). Elevate above heart level at rest; a compression sleeve helps. A calf that's suddenly hot, swollen and painful should be checked urgently to rule out a clot." },
  { kw:["eat","food","nutrition","diet","protein","supplement","vitamin"], a:()=>"Healing needs building blocks: **enough protein** (~1.6–2.0 g/kg/day) across meals, plenty of fruit/veg, and enough total calories. Stay hydrated. Supplements don't replace protein, sleep, and progressive loading." },
  { kw:["sleep","rest","tired","recover faster"], a:()=>"Sleep is when most repair happens — aim for **7–9 hours**. Poor sleep raises pain sensitivity and slows healing. Rest days between harder sessions are part of getting stronger." },
  { kw:["stretch","strengthen","strength","which is better"], a:()=>"Both help, but for most conditions **progressive strengthening drives recovery** — it rebuilds capacity. Mobility/stretching restores range and eases stiffness, especially early. Your program blends both." },
  { kw:["flare","worse","setback","re-injure","reinjure","aggravated","overdid"], a:()=>"Flare-ups happen and rarely undo progress. **Drop back a level** for a few days, keep moving gently, and let symptoms settle before progressing. Usually it's too much too soon. Recovery is a trend, not a straight line." },
  { kw:["return to sport","back to running","play again","when can i run","return to running","get back to"], a:()=>`Return when you've rebuilt **strength and control**, not just when pain is gone: full pain-free range, near-equal side-to-side strength, and sport-like movements without flaring. ${state.program?"That's what the final phase builds toward. ":""}Ramp volume ~10%/week.` },
  { kw:["ibuprofen","medication","painkiller","nsaid","advil","tylenol","anti-inflammatory","medicine"], a:()=>"OTC pain relief can help you stay active — check with a pharmacist/doctor about what's right for you. Note: heavy NSAID use may blunt tissue/tendon adaptation, so use the least needed and don't mask pain to push harder. This app can't advise on your specific medications." },
  { kw:["motivation","give up","discouraged","frustrated","slow","not working","boring"], a:()=>"Slow and non-linear is normal — it doesn't mean it isn't working. Track small wins (reps, range, less pain), keep sessions short, and tie them to an existing habit. Stuck for several weeks with no trend? See a physio for a fresh look." },
  { kw:["warm up","warmup","before exercise","cool down","cooldown"], a:()=>"A few minutes of easy movement first raises tissue temperature and cuts injury risk; a gentle cool-down eases stiffness. 5 minutes each end is plenty." },
  { kw:["brace","support","tape","wrap","sleeve","crutches"], a:()=>"Braces/taping give short-term support and confidence, especially early or returning to activity — but long-term reliance keeps the area weak. Use support to move and load safely, not to avoid movement. Follow your clinician's bracing instructions after surgery." },
  { kw:["blood pressure","hypertension","bp"], a:()=>"With high blood pressure: **never hold your breath** — exhale on effort. Avoid heavy grip/isometric holds and head-down positions. Regular **moderate aerobic exercise lowers blood pressure**, so it's a cornerstone. Know your numbers." },
  { kw:["breath","breathe","short of breath","breathless","copd","oxygen"], a:()=>"Pace exercise with your breathing: **pursed-lip breathing** (in through the nose, out slowly through pursed lips), rest when breathless, and use prescribed oxygen. Breathlessness is expected; chest pain, dizziness, or blue lips are not — stop and seek care." }
];

function coachAnswer(qRaw){
  const q = qRaw.toLowerCase();
  const conds = selectedConditions();
  for(const c of conds){
    const first = c.name.toLowerCase().split(/[ (]/)[0];
    if(q.includes(first) && /(about|what is|tell me|info|explain)/.test(q))
      return `**${c.name}** — ${aboutText(c, state.program?state.program.track:classify(state.weeks)||"acute")}\n\n${DOMAIN_REDFLAGS[c.domain]}`;
  }
  let best=null, score=0;
  for(const item of KB){ let s=0; for(const kw of item.kw) if(q.includes(kw)) s+=kw.split(" ").length; if(s>score){score=s;best=item;} }
  if(best && score>0) return best.a();
  if(/program|phase|week|routine|plan/.test(q)){
    if(state.program) return `Your plan is a **${state.program.totalWeeks}-week, 4-phase program** (${state.program.track} track): ${TEMPLATE[state.program.track].phases.map(p=>p.title).join(" → ")}. Advance a phase when the current one feels controlled and symptoms are low. See the **Program** tab for exercises.`;
    return "Build a program first (History → Injury → Details), then I can walk you through your phases and exercises.";
  }
  return `I'm not sure I caught that. I can help most with: **ice vs heat · how much pain is okay · how often to train · your precautions · when to see a doctor · returning to sport · swelling · nutrition · sleep · flare-ups · motivation**.\n\nTry *"What should I avoid with my condition?"* or *"How much pain is normal?"* — and for anything serious or not improving, see a clinician in person.`;
}

/* ---------- chat UI ---------- */
function addMsg(text, who){
  const div=document.createElement("div"); div.className="msg "+who;
  div.innerHTML=mdLite(text);
  if(who==="bot") div.innerHTML+=`<span class="src">Educational guidance · not a substitute for a clinician</span>`;
  $("#chatlog").appendChild(div); $("#chatlog").scrollTop=$("#chatlog").scrollHeight;
}
const mdLite = t => esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\*(.+?)\*/g,"<i>$1</i>").replace(/\n/g,"<br>");
const SUGGESTED = ["Should I use ice or heat?","How much pain is normal?","What should I avoid with my condition?","When should I see a doctor?","How often should I train?","How do I return to sport safely?"];
function initCoach(){
  $("#chatlog").innerHTML="";
  const conds=selectedConditions();
  const intro = conds.length ? `I can see you're working on: **${conds.map(c=>c.name).join(", ")}**. ` : "";
  addMsg(`Hi! I'm your recovery coach. ${intro}Ask me anything about your recovery, program, or medical precautions.`, "bot");
  const sug=$("#suggests"); sug.innerHTML="";
  SUGGESTED.forEach(s=>{ const c=document.createElement("div"); c.className="s"; c.textContent=s;
    c.onclick=()=>{ $("#chatInput").value=s; $("#chatform").requestSubmit(); }; sug.appendChild(c); });
}

/* =====================================================================
   WIZARD / NAV
===================================================================== */
function goStep(n){
  state.step=n; save();
  $$(".panel").forEach((p,i)=>p.classList.toggle("hide", i!==n));
  $$(".step").forEach((s,i)=>{ s.classList.toggle("active", i===n); s.classList.toggle("done", i<n); });
  window.scrollTo({top:0,behavior:"smooth"});
  if(n===4) initCoach();
}

/* ---------- history UI ---------- */
function initHistory(){
  const wrap=$("#historyChecks");
  HISTORY_ITEMS.forEach(it=>{
    const on=state.flags.includes(it.flag);
    const d=document.createElement("div"); d.className="check"+(on?" on":""); d.dataset.flag=it.flag;
    d.innerHTML=`<span class="box">${on?"✓":""}</span><span>${esc(it.label)}</span>`;
    d.onclick=()=>{ d.classList.toggle("on"); const active=d.classList.contains("on");
      d.querySelector(".box").textContent=active?"✓":"";
      if(active) state.flags.push(it.flag); else state.flags=state.flags.filter(f=>f!==it.flag); save(); };
    wrap.appendChild(d);
  });
  $("#q_age").value=state.age; $("#q_sex").value=state.sex; $("#q_meds").value=state.meds; $("#q_notes").value=state.notes;
  $("#parq_pain").checked=state.parq.pain; $("#parq_faint").checked=state.parq.faint; $("#parq_doc").checked=state.parq.doc;
  $("#q_age").oninput=e=>{state.age=e.target.value;save();};
  $("#q_sex").oninput=e=>{state.sex=e.target.value;save();};
  $("#q_meds").oninput=e=>{state.meds=e.target.value;save();};
  $("#q_notes").oninput=e=>{state.notes=e.target.value;save();};
  $("#parq_pain").onchange=e=>{state.parq.pain=e.target.checked;save();};
  $("#parq_faint").onchange=e=>{state.parq.faint=e.target.checked;save();};
  $("#parq_doc").onchange=e=>{state.parq.doc=e.target.checked;save();};
}

/* ---------- condition search UI ---------- */
function renderSelected(){
  const wrap=$("#selectedConds"); const conds=selectedConditions();
  wrap.innerHTML = conds.map(c=>`<span class="selchip"><span class="sup ${c.supervision}">${c.supervision}</span>${esc(c.name)}
    <span class="x" data-id="${c.id}">✕</span></span>`).join("");
  $$("#selectedConds .x").forEach(x=>x.onclick=()=>{ state.condIds=state.condIds.filter(i=>i!==x.dataset.id); save(); renderSelected(); runSearch(); });
  $("#toDetails").disabled = conds.length===0;
}
function runSearch(){
  const q=$("#condSearch").value.trim().toLowerCase();
  const toks=q.split(/\s+/).filter(Boolean);
  let list=window.CONDITIONS;
  if(domainFilter!=="all") list=list.filter(c=>c.domain===domainFilter);
  if(toks.length) list=list.filter(c=>{ const hay=(c.name+" "+c.region+" "+(c.synonyms||[]).join(" ")).toLowerCase();
    return toks.every(t=>hay.includes(t)); });
  const total=list.length; list=list.slice(0,60);
  const dotColor={msk:"var(--msk)",neuro:"var(--neuro)",cardiac:"var(--cardiac)",pulmonary:"var(--pulm)"};
  const res=$("#condResults");
  if(!list.length){ res.innerHTML=`<div class="moreinfo">No matches. Try a simpler term, or a different spelling.</div>`; return; }
  res.innerHTML = list.map(c=>{ const picked=state.condIds.includes(c.id);
    return `<div class="result ${picked?"picked":""}" data-id="${c.id}">
      <span class="dot" style="background:${dotColor[c.domain]}"></span>
      <span class="rn">${esc(c.name)}<div class="rr">${esc(c.region)} · ${DOMAIN_NAME[c.domain]}</div></span>
      <span class="add">${picked?"✓":"+"}</span></div>`; }).join("") +
    (total>60?`<div class="moreinfo">Showing 60 of ${total} matches — refine your search to narrow it down.</div>`:"");
  $$("#condResults .result").forEach(r=>r.onclick=()=>{ const id=r.dataset.id;
    if(state.condIds.includes(id)) state.condIds=state.condIds.filter(i=>i!==id);
    else state.condIds.push(id);
    save(); renderSelected(); runSearch(); });
}
function initSearch(){
  window.CONDITIONS.forEach(c=>CONMAP.set(c.id,c));
  $("#catCount").textContent=window.CONDITIONS.length;
  let t; $("#condSearch").oninput=()=>{ clearTimeout(t); t=setTimeout(runSearch,120); };
  $$("#domainFilters .fchip").forEach(f=>f.onclick=()=>{ domainFilter=f.dataset.d;
    $$("#domainFilters .fchip").forEach(x=>x.classList.toggle("on",x===f)); runSearch(); });
  renderSelected(); runSearch();
}

/* ---------- details UI ---------- */
function updateAcuteLabel(){
  const w=parseInt($("#weeksSince").value); const el=$("#acuteLabel");
  if(isNaN(w)){ el.innerHTML=""; return; }
  el.innerHTML = classify(w)==="acute"
    ? `<span class="badge acute">Acute · 0–6 wks</span> Still in the early healing window.`
    : `<span class="badge chronic">Chronic · 6+ wks</span> Past acute — focus shifts to progressive loading.`;
}
function initDetails(){
  const w=$("#weeksSince"); w.value=state.weeks??""; updateAcuteLabel();
  $("#painLevel").value=state.painRest; $("#painVal").textContent=state.painRest;
  $("#painMove").value=state.painMove; $("#painMoveVal").textContent=state.painMove;
  $("#surgery").value=state.surgery; $("#fitness").value=state.fitness; $("#goal").value=state.goal;
  w.oninput=()=>{ state.weeks=w.value===""?null:parseInt(w.value); updateAcuteLabel(); save(); };
  $("#painLevel").oninput=e=>{ state.painRest=+e.target.value; $("#painVal").textContent=e.target.value; save(); };
  $("#painMove").oninput=e=>{ state.painMove=+e.target.value; $("#painMoveVal").textContent=e.target.value; save(); };
  $("#surgery").oninput=e=>{ state.surgery=e.target.value; save(); };
  $("#fitness").oninput=e=>{ state.fitness=e.target.value; save(); };
  $("#goal").oninput=e=>{ state.goal=e.target.value; save(); };
}

function doGenerate(){
  if(!state.condIds.length){ toast("Pick at least one injury or condition first."); goStep(1); return; }
  if(state.weeks===null){ toast("Enter how many weeks ago it started."); return; }
  state.program=generateProgram(); save();
  renderProgram(state.program); goStep(3);
}
function doReset(){
  if(!confirm("Clear everything and start over?")) return;
  localStorage.removeItem("physiopath");
  location.reload();
}
function toast(msg){
  const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(),2600);
}

/* ---------- PWA install + service worker ---------- */
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferredPrompt=e; $("#installBtn").hidden=false; });
function initInstall(){
  $("#installBtn").onclick=async()=>{ if(!deferredPrompt) return; deferredPrompt.prompt();
    await deferredPrompt.userChoice; deferredPrompt=null; $("#installBtn").hidden=true; };
}
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded",()=>{
  load();
  initHistory(); initSearch(); initDetails(); initInstall();
  $$("[data-goto]").forEach(b=>b.onclick=()=>{
    const n=+b.dataset.goto;
    if(n>=2 && !state.condIds.length){ toast("Pick at least one condition first."); goStep(1); return; }
    goStep(n);
  });
  $$(".step").forEach(s=>s.onclick=()=>{ const n=+s.dataset.step;
    if(n>=2 && !state.condIds.length){ toast("Pick a condition first."); goStep(1); return; }
    goStep(n); });
  $("#generateBtn").onclick=doGenerate;
  $("#printBtn").onclick=()=>window.print();
  $("#resetBtn").onclick=doReset;
  $("#chatform").addEventListener("submit",e=>{ e.preventDefault();
    const v=$("#chatInput").value.trim(); if(!v) return;
    addMsg(v,"user"); $("#chatInput").value=""; setTimeout(()=>addMsg(coachAnswer(v),"bot"),220); });
  if(state.program) renderProgram(state.program);
  goStep(state.step||0);
});
