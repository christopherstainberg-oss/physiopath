/* =====================================================================
   CLINICIAN / PHYSICIAN PROTOCOL — let a clinician add their own protocol
   as its own program section (phases + exercises), shown verbatim.
===================================================================== */
/* Forgiving parser: "Phase …" lines start a phase (optional "(weeks 0-2)" and
   "goal: …"); other non-blank lines are exercises "Name — sets×reps — cue". */
function parseClinProtocol(text){
  const lines = String(text||"").split(/\r?\n/);
  const phases = [];
  let cur = null;
  const newPhase = (title, weeks, goal)=>{ cur = { title: title || ("Phase "+(phases.length+1)), weeks: weeks||"", goal: goal||"", ex: [] }; phases.push(cur); };
  for(const raw of lines){
    const line = raw.trim();
    if(!line) continue;
    if(/^phase\b/i.test(line) || /^(stage|block|week\s*\d)\b/i.test(line)){
      let rest = line.replace(/^(phase|stage|block)\s*\d*\s*[:\-–]?\s*/i,"").trim();
      let weeks = "", goal = "";
      const wk = rest.match(/\(?\s*weeks?\s*([\d]+\s*(?:[–\-]|to)\s*[\d]+|[\d]+\+?)\s*\)?/i);
      if(wk){ weeks = "weeks "+wk[1].replace(/\s+/g,"").replace("to","–").replace("-","–"); rest = rest.replace(wk[0],"").trim(); }
      const gm = rest.match(/goal\s*[:\-]\s*(.*)$/i);
      if(gm){ goal = gm[1].trim(); rest = rest.replace(gm[0],"").trim(); }
      rest = rest.replace(/[—\-–|,;:]\s*$/,"").trim();
      newPhase(rest, weeks, goal);
      continue;
    }
    if(!cur) newPhase("Clinician-prescribed exercises","","");
    let l = line.replace(/^[\-\*•·▪]\s*/,"").replace(/^\d+[\.\)]\s*/,"").trim();
    if(!l) continue;
    const parts = l.split(/\s*\|\s*|\s+[—–]\s+|\t+/).map(s=>s.trim()).filter(Boolean);
    let n = parts[0] || l, d = parts[1] || "", c = parts.slice(2).join(" — ") || "";
    if(!parts[1]){
      const m = l.match(/^(.*?)[\s,]+(\d+\s*[x×]\s*\d+.*|\d+\s*(?:s|sec|secs|min|reps?)\b.*)$/i);
      if(m){ n = m[1].trim().replace(/[—\-–,]$/,"").trim(); d = m[2].trim(); }
    }
    if(!d) d = "as prescribed";
    cur.ex.push({ n, d, c });
  }
  return { phases: phases.filter(p=>p.ex.length) };
}
const CLIN_EXAMPLE = `Phase 1: Protection (weeks 0-2) — goal: control swelling, restore full extension
- Quad sets — 3×10 — lock the knee straight
- Heel slides — 3×15 — regain bend gently
- Straight-leg raises — 3×10
Phase 2: Early strength (weeks 3-6) — goal: normalise gait, build quad strength
- Mini squats (0–45°) — 3×12 — knees over toes
- Leg press (light) — 3×10
- Stationary bike — 10 min
Phase 3: Return to function (weeks 7-12)
- Step-downs — 3×10 each — control, no knee collapse
- Single-leg balance + reach — 3×8 each`;
/* Editable starter auto-loaded into the clinician form for a clinician-guided session. */
const CLIN_STARTER = `Phase 1: Protection (weeks 0-2) — goal: protect, control swelling, restore motion
- Quad sets — 3×10 — hold 5s
- Ankle pumps — 3×20
- Heel slides — 3×15
Phase 2: Early strength (weeks 3-6) — goal: normalise gait, build strength
- Mini squats — 3×12 — pain-free range
- Standing hip abduction — 3×12 each
- Stationary bike — 10 min
Phase 3: Return to function (weeks 7-12) — goal: full strength & control
- Step-ups — 3×10 each
- Single-leg balance — 3×30s each`;
function clinicianProtocolCards(){
  const list = state.clinicianProtocols || [];
  return list.map((pr,i)=>{
    const phases = pr.phases.map((ph,pi)=>{
      const key = "clin-"+i+"-"+pi;
      const open = (pi===0 || openPhases.has(key)) ? "open" : "";
      const rows = ph.ex.map(e=>exItemHTML({ n:e.n, d:e.d, c:e.c })).join("");
      return `<div class="phase ${open}">
        <div class="head" role="button" tabindex="0" aria-expanded="${open?"true":"false"}" onclick="togglePhase(this,'${key}')" onkeydown="phaseHeadKey(event,this,'${key}')">
          <div class="pnum">${pi+1}</div>
          <div><div class="ptitle">${esc(ph.title)}${ph.weeks?` <span class="pweeks">· ${esc(ph.weeks)}</span>`:""}</div>
          ${ph.goal?`<div class="goal">${esc(ph.goal)}</div>`:""}</div>
          <div class="caret" aria-hidden="true">▾</div>
        </div>
        <div class="body"><ul class="exlist">${rows}</ul></div></div>`;
    }).join("");
    return `<div class="card clincard">
      <h2>🩺 ${esc(pr.name)} <span class="clinbadge">Clinician-provided</span>
        <button class="clindel no-print" data-idx="${i}" title="Remove this protocol">✕</button></h2>
      ${pr.source?`<p class="hint">Source: ${esc(pr.source)}.</p>`:""}
      <div class="banner info" style="margin-top:4px"><b>Shown exactly as you entered it.</b> This is your clinician's protocol — the app's automatic exercise-safety filtering is <b>not</b> applied to it. Follow your clinician's own guidance and dosing.</div>
      ${phases}
    </div>`;
  }).join("");
}
/* ---- Clinician section (step 4): exercise protocol + precaution protocol inputs ---- */
function initClinician(){
  const host = $("#clinicianOut"); if(!host) return;
  host.innerHTML = clinicianIntroCard() + clinicianFormCard() + clinPrecautionCard() + clinicianAddedSummary();
  wireClinician();
  // clinician-guided session → auto-populate an editable starter protocol whenever the form is empty
  // and nothing's been added yet (so it survives navigating away and back before adding).
  if(state.clinicianGuided && !(state.clinicianProtocols||[]).length){
    const t=$("#clinicianOut #clinText"), n=$("#clinicianOut #clinName");
    if(t && !t.value.trim()){ t.value = CLIN_STARTER; if(n && !n.value.trim()) n.value = "Clinician protocol (adjust as needed)"; updateClinPreview(); }
  }
}
/* Reflect the two History session-mode checkboxes in card styling, the checkboxes
   themselves (mutual exclusivity means one can flip the other) and the Next button.
   - Clinician-guided → Next opens the Clinician step pre-filled with a starter to adjust.
   - Self-guided → Next SKIPS the Clinician step and goes straight to Injury.
   - Neither (the default) → Next stops at the optional, empty Clinician step.
   The routing itself lives in the #historyNext handler; this only keeps the UI honest. */
function syncSessionMode(){
  const cg = !!state.clinicianGuided, sg = !!state.selfGuided;
  const cgEl = $("#q_clinicianGuided"); if(cgEl) cgEl.checked = cg;
  const sgEl = $("#q_selfGuided");      if(sgEl) sgEl.checked = sg;
  const cgCard = $("#clinGuideCard"); if(cgCard) cgCard.classList.toggle("on", cg);
  const sgCard = $("#selfGuideCard"); if(sgCard) sgCard.classList.toggle("on", sg);
  const btn = $("#historyNext");
  if(btn) btn.textContent = sg ? "Next: choose your injury →"
                          : cg ? "Next: clinician setup →"
                               : "Next: continue →";
  const cgSub = $("#clinGuideSub"); if(cgSub) cgSub.innerHTML = cg
    ? `<b>On.</b> <b>Next</b> opens the <b>Clinician step</b> pre-filled with a protocol to adjust, then Injury and Details.`
    : `Tick this if a <b>clinician</b> is setting up this program — the Clinician step will arrive pre-filled with a protocol to adjust. Either way, <b>Next</b> continues through <b>Clinician → Injury → Details</b> (the Clinician step is optional — patients can just click through it).`;
  const sgSub = $("#selfGuideSub"); if(sgSub) sgSub.innerHTML = sg
    ? `<b>On.</b> <b>Next</b> skips the Clinician step and goes straight to <b>choosing your injury</b>. You can still open the <b>Clinician step</b> any time from the steps bar above.`
    : `Doing this on your own? Tick this to <b>skip the Clinician step</b> — <b>Next</b> takes you straight to <b>choosing your injury</b>. You can still open the Clinician step any time from the steps bar above if you'd like a clinician's help.`;
}
function clinicianIntroCard(){
  return `<div class="card clinintro">
    <h2>🩺 Clinician / physician inputs <span class="clinbadge">optional</span></h2>
    <p class="hint">For a clinician, surgeon or physiotherapist (or a patient entering what they were given). Anything you add here <b>updates the Program</b>: an exercise protocol becomes its own program section (shown exactly as entered), and a precaution protocol appears in the Precautions area. Everything is saved on this device. Not a clinician? You can skip this step.</p>
  </div>`;
}
function clinPrecautionCard(){
  const v = state.clinPrecautionProtocol || "";
  return `<div class="card clinformcard no-print">
    <h2>🛡️ Clinician precaution protocol</h2>
    <p class="hint">Add precaution or activity-restriction orders in your own words (e.g. weight-bearing details, ROM limits, brace wear, sternal/spinal precautions, "no resisted knee extension 0–45° for 6 weeks"). This is shown verbatim in the <b>Precautions area</b> alongside the app's precautions.</p>
    <textarea id="clinPrecText" rows="5" placeholder="e.g. PWB 50% left leg × 6 weeks · ROM 0–90° knee flexion · hinged brace locked 0–30° · no open-chain knee extension 0–40°">${esc(v)}</textarea>
    <div class="clinbtns"><button class="btn primary" id="clinPrecSave" type="button">Save precaution protocol</button>
      ${v?`<button class="btn ghost" id="clinPrecClear" type="button">Clear</button>`:""}</div>
  </div>`;
}
function clinicianAddedSummary(){
  const list = state.clinicianProtocols || [];
  const prec = (state.clinPrecautionProtocol||"").trim();
  if(!list.length && !prec) return "";
  const items = list.map((pr,i)=>`<li class="clinsumrow"><span>🩺 <b>${esc(pr.name)}</b> — ${pr.phases.length} phase${pr.phases.length>1?"s":""}, shown in your Program</span><button class="clindel2 no-print" data-idx="${i}" title="Remove">✕</button></li>`).join("");
  const precRow = prec ? `<li class="clinsumrow"><span>🛡️ <b>Precaution protocol</b> — shown in your Precautions area</span></li>` : "";
  return `<div class="card clinsumcard"><h2>✅ Added — reflected in your program</h2>
    <ul class="clinsumlist">${items}${precRow}</ul></div>`;
}
function wireClinician(){
  const clinAdd = $("#clinicianOut #clinAdd"); if(clinAdd) clinAdd.onclick = addClinProtocol;
  const clinEx = $("#clinicianOut #clinExample"); if(clinEx) clinEx.onclick = fillClinExample;
  const clinText = $("#clinicianOut #clinText"); if(clinText){ clinText.oninput = updateClinPreview; updateClinPreview(); }
  const precSave = $("#clinicianOut #clinPrecSave"); if(precSave) precSave.onclick = saveClinPrecaution;
  const precClear = $("#clinicianOut #clinPrecClear"); if(precClear) precClear.onclick = ()=>{ state.clinPrecautionProtocol=""; save(); initClinician(); renderPrecautions(); toast("Precaution protocol cleared."); };
  $$("#clinicianOut .clindel2").forEach(b=>b.onclick=()=>removeClinProtocol(+b.dataset.idx));
}
function saveClinPrecaution(){
  const t = $("#clinicianOut #clinPrecText"); if(!t) return;
  state.clinPrecautionProtocol = t.value.trim(); save();
  renderPrecautions();                                  // show it in the Precautions area
  initClinician();                                      // refresh the summary
  toast(state.clinPrecautionProtocol ? "Precaution protocol saved — see the Precautions area." : "Precaution protocol cleared.");
}
function clinicianFormCard(){
  return `<div class="card clinformcard no-print">
    <h2>🩺 Add a clinician / physician exercise protocol</h2>
    <p class="hint">Have a protocol from your surgeon, physiotherapist or physician? Add it here and it becomes its own section in your program — with expandable phases and exercises you can tap to Explain. It's saved on this device.</p>
    <div class="clinform">
      <input type="text" id="clinName" placeholder="Protocol name — e.g. Dr. Lee · ACL reconstruction" />
      <input type="text" id="clinSource" placeholder="Clinician / clinic / source (optional)" />
      <textarea id="clinText" rows="8" placeholder="Paste or type the protocol, one exercise per line. Example:&#10;Phase 1: Protection (weeks 0-2) — goal: control swelling&#10;- Quad sets — 3×10 — lock the knee straight&#10;- Heel slides — 3×15&#10;Phase 2: Strength (weeks 3-6)&#10;- Mini squats — 3×12&#10;- Leg press — 3×10"></textarea>
      <div class="clinpreview" id="clinPreview"></div>
      <div class="clinbtns">
        <button class="btn ghost" id="clinExample" type="button">Fill example</button>
        <button class="btn primary" id="clinAdd" type="button">Add to my program</button>
      </div>
      <p class="hint" style="margin-top:8px">Tips: start a line with <b>Phase …</b> to begin a phase (optionally add <b>(weeks 0–2)</b> and <b>goal: …</b>). Put each exercise on its own line as <b>Name — sets×reps — optional cue</b> (a dash, or a | between parts). No phases? Everything becomes one list.</p>
    </div>
  </div>`;
}
function updateClinPreview(){
  const t = $("#clinicianOut #clinText"), box = $("#clinicianOut #clinPreview");
  if(!t || !box) return;
  const p = parseClinProtocol(t.value);
  if(!p.phases.length){ box.innerHTML = ""; return; }
  const total = p.phases.reduce((s,ph)=>s+ph.ex.length,0);
  box.innerHTML = `<div class="clinprevhead">Preview — ${p.phases.length} phase${p.phases.length>1?"s":""}, ${total} exercise${total>1?"s":""}:</div>` +
    p.phases.map(ph=>`<div class="clinprevph">• <b>${esc(ph.title)}</b>${ph.weeks?` <span class="clinprevn">· ${esc(ph.weeks)}</span>`:""} <span class="clinprevn">(${ph.ex.length})</span></div>`).join("");
}
function fillClinExample(){
  const t = $("#clinicianOut #clinText"), n = $("#clinicianOut #clinName");
  if(t){ t.value = CLIN_EXAMPLE; }
  if(n && !n.value.trim()){ n.value = "Example · ACL reconstruction protocol"; }
  updateClinPreview();
}
function addClinProtocol(){
  const name = ($("#clinicianOut #clinName").value||"").trim();
  const source = ($("#clinicianOut #clinSource").value||"").trim();
  const parsed = parseClinProtocol($("#clinicianOut #clinText").value);
  if(!parsed.phases.length){ toast("Add at least one exercise line first."); return; }
  (state.clinicianProtocols = state.clinicianProtocols || []).push({ name: name || "Clinician protocol", source, phases: parsed.phases });
  save();
  if(state.program) renderProgram(state.program);   // added protocol shows in the (hidden) program
  initClinician();                                   // refresh the section (clears the form, updates summary)
  toast("Clinician protocol added — it now appears in your Program.");
}
function removeClinProtocol(idx){
  if(!state.clinicianProtocols) return;
  state.clinicianProtocols.splice(idx,1); save();
  if(state.program) renderProgram(state.program);
  if(state.step===1) initClinician();                // refresh the Clinician summary if we're on that step
  toast("Clinician protocol removed.");
}

/* Consolidated safety notes card (universal guidance; prints with the program). */
function safetyNotesCard(prog){
  const body = `<p class="hint">Read this before you start. PhysioPath is educational and does not replace your doctor or physiotherapist — any specific instructions from your care team always take precedence.</p>
    <div class="banner clear" style="margin:0 0 12px"><b>⛔ Stop and rest right away if you feel:</b> sharp, spreading, or rapidly worsening pain · chest pain or pressure · severe or unusual breathlessness · dizziness, light-headedness, or faintness · palpitations · or sudden weakness, numbness, or trouble speaking.</div>
    <b class="safeh">How much pain is okay — the traffic-light rule</b>
    <ul class="safelist">
      <li><span class="dotg"></span><b>Green — keep going:</b> discomfort up to about 3/10 that settles within 24 hours.</li>
      <li><span class="dota"></span><b>Amber — ease off:</b> pain around 4–5/10, or soreness that's worse the next morning. Reduce range/load and progress more slowly.</li>
      <li><span class="dotr"></span><b>Red — stop &amp; get assessed:</b> sharp, severe, or steadily worsening pain, or new swelling, giving-way, or loss of movement.</li>
    </ul>
    <b class="safeh">Train safely</b>
    <ul class="safelist plain">
      <li>Warm up for a few minutes first, and cool down afterward.</li>
      <li>Prioritise good technique over heavy load; increase by about 10% per week at most.</li>
      <li>Breathe normally — never hold your breath during effort.</li>
      <li>Do balance work beside a sturdy support if you feel at all unsteady.</li>
      <li>Stay hydrated, and stop if you feel unwell, faint, or overheated.</li>
    </ul>
    <div class="redflags" style="margin-top:12px"><b>⚠ Seek urgent care</b> for: chest pain, severe breathlessness, fainting, sudden weakness/numbness or trouble speaking, loss of bladder or bowel control, a hot swollen joint with fever, or calf pain/swelling with breathlessness.</div>
    ${prog && prog.clearance ? `<p class="hint" style="margin-top:10px"><b>Because of your history, get medical clearance before starting</b> — ideally with supervised rehab. See your personalised precautions in the Details step.</p>` : ""}`;
  const badge = prog && prog.clearance ? `<span class="collapsebadge">⚠ clearance</span>` : "";
  return collapsibleCard("safety", "safetycard", "🛟 Safety notes", body, badge);
}

/* =====================================================================
   HOME MODE — adapt the plan to ordinary household objects.
   Render-time transform (like medication filtering): never mutates
   state.program, so it's fully reversible and keeps the user's edits.
===================================================================== */
/* Gym equipment (the exercise's `equipment` field) -> household stand-in
   used as the name prefix + a "how to improvise it" note. */
const HOME_PREFIX = {
  "Dumbbell":  {sub:"Soup-can",   note:"Hold a soup/bean can, a filled water bottle, or a small bag of rice in each hand. Start light (~0.5–1 kg) and add water, coins or rice to progress."},
  "Kettlebell":{sub:"Water-jug",  note:"Use a filled water jug, a laundry-detergent bottle, or a loaded shopping bag held by the handle."},
  "Barbell":   {sub:"Backpack",   note:"Swap the barbell for a backpack loaded with books, or a broomstick across the shoulders with a filled bag hung at each end. Keep it light and controlled."},
  "Med-ball":  {sub:"Ball",       note:"Use a basketball, a filled pillowcase, or a small backpack in place of a medicine ball."},
  "Sandbag":   {sub:"Duffel-bag", note:"Fill a duffel bag or backpack with books, rice or laundry to build a home 'sandbag'."},
  "Suspension":{sub:"Door-towel", note:"Loop a strong bath towel or bedsheet over the top of a closed, latched door (or around a sturdy post) and hold both ends."},
  "Cable":     {sub:"Door-band",  note:"Anchor a resistance band — or a bungee cord / bike inner-tube — in a door hinge or around a heavy sofa leg to replace the cable."},
  "Machine":   {sub:"Band",       note:"No machine needed — do the band or bodyweight version at home."},
  "Band":      {sub:"",           note:"No band? A pair of tights, a long belt or a bungee cord works; for many drills a towel you pull against yourself gives similar resistance."}
};
/* In-name equipment tokens -> [regex, replacement text, note]. Applied after
   the prefix swap so props like a plyo box or foam pad also get improvised. */
const HOME_TOKEN = [
  [/cane-assisted/i, "broomstick-assisted", "Use a broomstick, mop handle or umbrella as the assisting 'cane'."],
  [/\bBOSU\b|on foam|on unstable surface|unstable surface/i, "on a cushion", "Stand on a firm sofa cushion, a folded towel or a pillow for the unstable-surface challenge — keep sturdy support nearby."],
  [/\bbox\b/i, "step", "Use the bottom stair, a low sturdy stool, or a solid chair seat as the 'box' — make sure it can't slip or tip."],
  [/\bslider\b/i, "towel-slide", "Put a hand towel (on a hard floor) or a sock (on carpet) under the moving foot or hand to slide."],
  [/sled push \/ drag|\bsled\b/i, "loaded-box push", "Push a laundry basket or box loaded with books across a carpet or smooth floor."],
  [/45° bench|\bbench\b/i, "sofa/step", "Use the edge of a sofa, a bed, a staircase, or a sturdy chair instead of a bench."],
  [/\bplate\b/i, "book", "Hold a heavy book, a baking tray, or a filled water bottle instead of a weight plate."],
  [/\(poles\)|\bpoles\b/i, "with broomsticks", "Use two broomsticks, mop handles, or ski/trekking poles."]
];
/* Cardio 'machine' work -> a no-equipment home substitute (keyword on name). */
const HOME_CARDIO = [
  [/cycl|bike/i,        "Ride a real bike if you have one, or march / step in place and pump the arms; a seated 'march' in a chair works if standing is limited."],
  [/row/i,              "Replace with band or towel seated rows plus a hip hinge; or brisk incline walking for the aerobic effect."],
  [/elliptical|cross-trainer/i, "Brisk walking, marching on the spot, or repeated sit-to-stands give a similar low-impact aerobic workout."],
  [/stair/i,            "Use a real staircase — step up and down a safe number of stairs at a steady pace, holding the rail."],
  [/treadmill/i,        "Walk outdoors or around the house, or march on the spot; add a hallway 'shuttle' to keep it continuous."],
  [/swim|aqua/i,        "Aquatic work needs a pool — on land, substitute a gentle full-body circuit (marching, arm circles, sit-to-stands)."],
  [/walk|jog|run/i,     "Walk or jog outdoors or around the house; a hallway shuttle or marching on the spot works in bad weather."]
];
/* Household object reference for the "what can I use?" list. */
const HOME_GEAR = [
  ["Dumbbells","Soup/bean cans, filled water bottles, a bag of rice/flour/sugar, filled socks, or tins of paint"],
  ["Kettlebell","A filled water jug, a detergent bottle, a paint can, or a loaded shopping/tote bag by the handle"],
  ["Barbell","A broomstick or mop handle with a loaded bag hung at each end, or a heavy backpack across the shoulders"],
  ["Weight plates","Heavy books, a baking tray, a bag of sugar/flour, a large tin, or paving slabs"],
  ["Heavier weights","A loaded backpack or suitcase, a bucket of water/sand, a bag of cat litter, a car tyre, or a cinder block"],
  ["Resistance band / cable","Tights or pantyhose, a bungee cord, a bike inner-tube, an old belt/tie, or a towel; anchor a band in a door or around a sofa leg"],
  ["Medicine ball","A basketball, a filled pillowcase, a small backpack, or a bag of flour"],
  ["Slam ball / sandbag","A duffel bag or backpack filled with books, rice, sand or laundry"],
  ["Suspension trainer (TRX)","A strong bath towel or bedsheet looped over the top of a closed, latched door"],
  ["Pull-up bar","A door-frame pull-up bar, a sturdy scaffold/park bar, a strong low tree branch, or do inverted rows gripping the edge of a solid table"],
  ["Dip bars","The edges of two sturdy chairs, kitchen worktops, or parallel counters"],
  ["Plyo box / step / bench","The bottom stair, a low sturdy stool, a solid chair, a coffee table, or the edge of a bed/sofa"],
  ["Aerobic step","The bottom stair or a thick sturdy book/board that won't slip"],
  ["Balance pad / BOSU / wobble board","A firm sofa cushion, a folded towel/blanket, a pillow, or a rolled-up yoga mat"],
  ["Gym sliders","A hand towel or paper plate on a hard floor, or socks on carpet"],
  ["Weight sled","A laundry basket, a box, or a towel loaded with books, pushed/dragged across the floor"],
  ["Foam roller","A rolling pin, a filled water/wine bottle, or a rolled-up towel; a tennis/lacrosse ball for trigger points"],
  ["Ab wheel","A hand towel or paper plates on a smooth floor, or a filled round bottle to roll"],
  ["Ankle / wrist weights","A long sock filled with rice or coins and tied on, or a resistance band"],
  ["Weight vest","A backpack loaded evenly (or one on the front and one on the back)"],
  ["Grip / forearm trainer","Squeeze a tennis ball, a rolled sock, or a bulldog clip; a towel wrung out"],
  ["Jump rope","An actual rope or length of washing line, or just mime the skip if space/ceiling is tight"],
  ["Agility ladder","Lay a rope in rungs, chalk/tape lines on the floor, or space out socks/cups"],
  ["Cones / markers","Cups, tin cans, shoes, water bottles, or rolled-up socks"],
  ["Exercise cane / bar","A broomstick, mop handle, umbrella, or length of dowel"],
  ["Yoga block / strap","A thick book or stack of books; a belt, tie, dressing-gown cord or towel as the strap"],
  ["Cardio machine","Brisk walking, marching on the spot, stair-climbing at home, sit-to-stands, or a skipping rope"]
];
/* Note-only home swaps: add a "how to improvise" note without renaming the exercise. */
const HOME_NOTE = [
  [/pull-?up|chin-?up|lat pull-?down|pull-?down|dead-?hang/i, "No bar? Grip the edge of a sturdy table for inverted rows, use a door-frame pull-up bar or a strong tree branch, or anchor a band over a door for pull-downs."],
  [/\bdip\b|triceps dip|bench dip/i, "Use the edges of two sturdy chairs or a kitchen worktop for dips — make sure they're stable."],
  [/foam[- ]?roll/i, "No foam roller? A rolling pin, a filled water/wine bottle, or a rolled towel works; a tennis ball for trigger points."],
  [/skipping|jump rope|jump-?rope/i, "Use an actual rope or washing line, or just mime the skip if the ceiling/space is tight."],
  [/\bladder\b|agility ladder/i, "No ladder? Lay a rope in rungs, or chalk/tape lines (or space out socks) on the floor."],
  [/\bhangboard|finger[- ]?board/i, "Use a sturdy door frame or a solid ledge for finger holds — go very gently and stop if the fingers hurt."],
  [/med-?ball throw|wall ball|slam/i, "Use a basketball or a small loaded backpack against a solid outside wall (not a window)."]
];
const HOME_LIGHT = new Set(["Dumbbell","Kettlebell","Barbell","Med-ball","Sandbag"]); // improvised loads run light -> cue higher reps
/* Program exercises don't carry an `equipment` field, so infer it from the
   leading word of the name (the generator prefixes it: "Dumbbell …", "Cable …").
   reEsc() (regex-escape helper) is defined later in this file — fine, both are
   only referenced at render time, after the whole script has evaluated. */
function detectEquip(e){
  if(e.equipment && HOME_PREFIX[e.equipment]) return e.equipment;
  for(const k of Object.keys(HOME_PREFIX)){
    if(new RegExp("^"+reEsc(k)+"\\b","i").test(e.n)) return k;
  }
  return "";
}
/* Return a display copy of an exercise adapted for household objects.
   Non-destructive: keeps tags/pattern/region/sig/warn/sub so the engine,
   Explain and cardio-target logic still work on the copy. */
function homeSwap(e){
  if(!e) return e;
  const o = Object.assign({}, e);
  const notes = [];
  let name = e.n;
  const equip = detectEquip(e);
  // 1) primary equipment -> household stand-in (skip cardio machines: handled below)
  const isCardio = (e.tags||[]).includes("aerobic") || e.pattern==="cardio";
  const pfx = HOME_PREFIX[equip];
  if(pfx && !(equip==="Machine" && isCardio)){
    if(pfx.sub){
      const re = new RegExp("^"+reEsc(equip)+"\\b","i");
      name = re.test(name) ? name.replace(re, pfx.sub) : pfx.sub+" "+name;
    }
    if(pfx.note) notes.push(pfx.note);
  }
  // 2) in-name equipment tokens (box, foam, slider, sled, bench, plate, cane, poles)
  for(const [re, rep, note] of HOME_TOKEN){
    if(re.test(name)){ name = name.replace(re, rep); if(note) notes.push(note); }
  }
  // 3) cardio substitution note
  if(isCardio){
    for(const [re, note] of HOME_CARDIO){ if(re.test(e.n)){ notes.push(note); break; } }
  }
  // 3b) note-only improvisations (pull-up bar, dip bars, foam roller, rope, ladder…)
  for(const [re, note] of HOME_NOTE){ if(re.test(e.n)){ notes.push(note); break; } }
  // 4) lighter improvised loads -> nudge toward higher reps / slower tempo
  if(HOME_LIGHT.has(equip) && /^\s*\d+\s*[×x]/.test(e.d||"")){
    notes.push("Household weights are light — do more reps (aim 12–20) or slow the tempo so the last few feel hard.");
  }
  o.n = name.replace(/\s{2,}/g," ").trim();
  if(notes.length){ o.home = true; o.homeNote = notes.join(" "); }
  return o;
}
/* The Home-mode button + reference card shown in the Program. */
function homeCard(adaptedCount){
  const on = !!state.homeMode;
  const gear = HOME_GEAR.map(([g,h])=>`<tr><td>${esc(g)}</td><td>${esc(h)}</td></tr>`).join("");
  const banner = on ? `<div class="banner load" style="margin:12px 0 0"><b>🏠 Home mode is ON.</b> ${
      adaptedCount>0 ? `${adaptedCount} exercise${adaptedCount===1?"":"s"} adapted to use everyday objects.` : "Your exercises already use bodyweight or household items."
    } Tap ⓘ on any exercise for the household swap.</div>` : "";
  return `<div class="card homecard">
    <h2>🏠 Home-friendly equipment</h2>
    <p class="hint">No gym? Turn on Home mode to adapt every exercise in your plan to <b>ordinary objects you already have</b> — soup cans, water jugs, a broomstick, a backpack, a sturdy chair. It only changes how the plan is displayed, keeps any exercises you've edited, and is fully reversible.</p>
    <label class="medfilter no-print">
      <input type="checkbox" id="homeModeToggle" ${on?"checked":""} />
      <span><b>Adapt my plan for home (use household objects)</b> — rewrites gym equipment into everyday-object equivalents and adds a "how to improvise it" note to each exercise.</span>
    </label>${banner}
    <details class="homegear"${on?" open":""}>
      <summary>What household objects can I use?</summary>
      <table class="hometbl"><thead><tr><th>Instead of…</th><th>Use at home</th></tr></thead><tbody>${gear}</tbody></table>
      <p class="hint" style="margin-top:8px">⚠ Safety: make sure chairs/steps can't slip or tip, load bags/backpacks only as heavy as you can control, and check your grip on cans and bottles. Get clearance first if your plan advises it.</p>
    </details>
  </div>`;
}

/* Return-to-activity & sport goals card + the sport-specific focus notes. */
function returnGoalsCard(){
  const acts = state.returnActivities || [], sports = state.returnSports || [];
  if(!acts.length && !sports.length) return "";
  const foci = matchedSportDemands().map(d=>d.note);
  const actHtml = acts.length ? `<div class="rgblock"><b>🎯 Everyday activities you're working toward:</b> ${acts.map(esc).join(" · ")}</div>` : "";
  const sportHtml = sports.length ? `<div class="rgblock"><b>🏅 Sport goals:</b> ${sports.map(esc).join(" · ")}</div>` : "";
  const focusHtml = foci.length ? `<ul class="notelist">${foci.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>
    <p class="hint">Sport-specific drills have been woven into your later phases (look for the <b>🏅 sport</b> tag). Return-to-sport work is late-stage — get clearance from your clinician and pass return-to-sport criteria (near-full strength, control and confidence, ~90%+ of the other side) before full return.</p>` : "";
  return `<div class="card rgcard">
    <h2>🎯 Your return-to-activity &amp; sport goals</h2>
    ${actHtml}${sportHtml}${focusHtml}
    ${(!foci.length && sports.length) ? `<p class="hint">Your plan already targets the strength, control and confidence you'll need — progress the later phases toward these goals.</p>` : ""}
  </div>`;
}

/* Medication considerations card. */
function medicationCard(medHiddenTotal){
  const meds = selectedMeds();
  if(!meds.length) return "";
  const flags = [...new Set(meds.flatMap(m=>m.flags||[]))].filter(f=>MED_EFFECT[f]);
  const list = meds.map(m=>{ const d=(state.medDoses||{})[m.id]; return esc(m.name)+(d?` <span class="medcard-dose">(${esc(d)})</span>`:""); }).join(", ");
  const body = flags.length
    ? `<ul class="notelist">${flags.map(f=>`<li>${MED_EFFECT[f]}</li>`).join("")}</ul>`
    : `<p class="hint">No specific exercise considerations flagged for these — but always tell your clinician what you take.</p>`;
  const canFilter = meds.some(m=>(m.flags||[]).some(f=>MED_FILTERABLE.includes(f)));
  const toggle = canFilter ? `<label class="medfilter no-print">
      <input type="checkbox" id="medFilterToggle" ${state.medFilter?"checked":""} />
      <span><b>Apply medication safety filtering to my plan</b> — hide high-impact, tendon-loading, contact, and balance exercises for high-risk medicines (fluoroquinolone antibiotics, blood thinners, sedating medicines). Off by default, fully reversible, and it keeps any exercises you've changed. A clinician's judgement still applies.</span>
    </label>` : "";
  const active = (state.medFilter && canFilter) ? `<div class="banner load" style="margin:12px 0 0"><b>🔒 Medication safety filtering is ON.</b> ${
      medHiddenTotal>0 ? `${medHiddenTotal} higher-risk exercise${medHiddenTotal===1?"":"s"} hidden from your plan.` : "No exercises needed hiding."
    } ${esc(window.notesForFlags(medExerciseFlags()).join(" "))}</div>` : "";
  return `<div class="card medcard">
    <h2>💊 Medication considerations for exercise</h2>
    <p class="hint">Based on your medications (${list}). These are <b>general considerations</b>, not prescribing advice — your prescriber and pharmacist are the authority on your medicines.</p>
    ${body}
    ${toggle}${active}
  </div>`;
}

/* Heart-rate, vital-signs & Borg-RPE exertion card. */
function vChip(k,val,warn){ return `<div class="vitalchip${warn?" warn":""}"><span class="vk">${esc(k)}</span><span class="vv">${esc(val)}</span></div>`; }
function borgScaleHTML(target){
  const rows = BORG_SCALE.map(([n,lab,desc])=>{
    const on = target && n>=target.lo && n<=target.hi;
    return `<div class="borgrow${on?" on":""}"><span class="bn">${n}</span><span class="bl">${esc(lab)}</span><span class="bd">${esc(desc||"")}</span></div>`;
  }).join("");
  return `<div class="borgwrap"><div class="borghead">Borg RPE 6–20 · perceived exertion <span class="sub">(the number × 10 ≈ heart rate)</span></div>${rows}</div>`;
}
function vitalsCard(prog){
  const v = state.vitals||{}, hz = hrZones(), beta = onBetaBlocker(), b = borgTarget();
  const bmi = bmiCalc(v.height,v.weight), fset = new Set(vitalFlags());
  const chips=[];
  if(vnum(v.restHR)!=null) chips.push(vChip("Resting HR", `${vnum(v.restHR)} bpm`, fset.has("vital_tachy")||fset.has("vital_brady")));
  if(vnum(v.sbp)!=null && vnum(v.dbp)!=null) chips.push(vChip("Blood pressure", `${vnum(v.sbp)}/${vnum(v.dbp)}`, fset.has("vital_bp_high")||fset.has("vital_bp_crisis")));
  if(vnum(v.spo2)!=null) chips.push(vChip("SpO₂", `${vnum(v.spo2)}%`, fset.has("vital_hypoxia")));
  if(vnum(v.rr)!=null) chips.push(vChip("Resp. rate", `${vnum(v.rr)}/min`, vnum(v.rr)>20||vnum(v.rr)<10));
  if(bmi!=null) chips.push(vChip("BMI", `${bmi} · ${bmiCategory(bmi)}`, bmi<18.5||bmi>=30));

  let hrBlock;
  if(hz){
    hrBlock = `<p class="hint" style="margin:2px 0 8px"><b>Estimated maximum heart rate ≈ ${hz.hrmax} bpm</b> — Tanaka formula (208 − 0.7 × ${esc(String(state.age))}). Target zones ${hz.rest?`use the <b>Karvonen</b> method with your resting HR ${hz.rest} bpm`:"are a <b>percent of your max HR</b>"}.</p>
      <div class="zonetable">
        <div class="zonerow zw"><span>Warm-up / very light</span><b>${fmtRange(hz.zones.warmup)} bpm</b></div>
        <div class="zonerow zm"><span>Moderate — build fitness</span><b>${fmtRange(hz.zones.moderate)} bpm</b></div>
        <div class="zonerow zv"><span>Vigorous — only as cleared</span><b>${fmtRange(hz.zones.vigorous)} bpm</b></div>
      </div>`;
    if(beta) hrBlock += `<div class="banner clear" style="margin:8px 0 0"><b>You take a beta-blocker.</b> Your heart rate won't rise the way these numbers assume — judge effort by the <b>Borg RPE / talk-test</b> below, not bpm.</div>`;
  } else {
    hrBlock = `<div class="banner info" style="margin:2px 0 8px">Add your <b>age</b> in the History step and we'll calculate your <b>maximum heart rate</b> (Tanaka formula) and personal target zones here.</div>`;
  }

  const aer=[]; (prog.items||[]).forEach(it=>it.phases.forEach(ph=>ph.ex.forEach(e=>{ if(e.tags&&e.tags.includes("aerobic")&&!aer.includes(e.n)) aer.push(e.n); })));
  const monitor = aer.length ? `<b class="safeh">Exercises to track with objective data</b>
    <p class="hint" style="margin:2px 0 6px">These aerobic/endurance items benefit most from a <b>heart-rate monitor</b>${someCardioPulm()?" and a <b>pulse oximeter</b> (SpO₂)":""}. Aim for the target zone and RPE — ease off if you exceed them or feel unwell.</p>
    <ul class="safelist plain">${aer.slice(0,10).map(n=>`<li>${esc(n)}</li>`).join("")}</ul>` : "";

  const vf = vitalFlags();
  const warn = vf.length ? `<div class="banner clear" style="margin:0 0 12px"><b>⚠ Some readings need attention</b><ul class="notelist">${window.notesForFlags(vf).map(n=>`<li>${esc(n)}</li>`).join("")}</ul></div>` : "";

  let deviceBanner = "";
  if(hasCardiacDevice()){
    const cap = deviceHRCeiling(), rate = vnum((state.cardiacDevice||{}).icdRate);
    let msg;
    if(hasLVAD()) msg = "Heart rate and blood pressure aren't reliable with a continuous-flow LVAD — judge effort by the <b>RPE / talk-test</b> below only. Avoid breath-holding, straining and contact, protect the driveline, and follow your VAD team's plan.";
    else if(hasICD()) msg = `Keep your heart rate <b>well below the device's therapy threshold${rate?` (${rate} bpm)`:""}</b> — going above it can trigger a shock.${cap?` We've capped your target zones at <b>${cap} bpm</b>.`:" Add the threshold in the History step and we'll cap your zones; ask your cardiologist for the number."} Judge effort by RPE and stay light–moderate.`;
    else msg = "Respect your device's <b>upper rate limit</b> — build intensity gradually and judge effort by the RPE / talk-test. Ask your cardiologist for your safe ceiling.";
    deviceBanner = `<div class="banner clear" style="margin:0 0 12px"><b>💠 You have a ${esc(cardiacDeviceLabel())}.</b> ${msg}</div>`;
  }

  const body = `<p class="hint">Objective targets for how hard to work — personalized from your age and any vitals you entered. Educational only; your care team's limits always take precedence.</p>
    ${warn}${deviceBanner}
    ${chips.length?`<div class="vitalchips">${chips.join("")}</div>`:""}
    ${hrBlock}
    <b class="safeh">Your recommended effort: ${esc(b.label)}</b>
    ${borgScaleHTML(b)}
    ${monitor}`;
  const badge = (vf.length || hasCardiacDevice()) ? `<span class="collapsebadge">⚠ alerts</span>` : "";
  return collapsibleCard("vitals", "vitalcard", "❤️ Heart rate, vitals &amp; exertion targets", body, badge);
}

/* Condition- & history-specific "other risks to be aware of" (complements the generic safety notes). */
const RISK_KEYWORDS = [
  [/tendinop|tendinit|tendinos/, "Tendons flare when load rises too fast — build up gradually. Pain that's worse the next morning means you overdid it, and a sudden sharp pain or 'pop' could be a tear: stop and get assessed."],
  [/stress fracture/, "A stress fracture can worsen with continued impact — respect the reduced-loading period; increasing, localised pain that's worse with activity means back off and get re-checked."],
  [/\bfracture\b|orif|malleolus|colles/, "Watch for increasing pain, deformity, or being unable to use the limb — the bone may not have healed or may have shifted. After a lower-limb injury, watch for a hot, swollen, painful calf (possible clot)."],
  [/\bacl\b|\bpcl\b|\bmcl\b|\blcl\b|ligament|reconstruction|graft|instability|dislocation|subluxation/, "Giving-way, locking, or new swelling means ease off and get it checked — protect the healing ligament/graft, and don't rush return-to-sport ahead of strength and control."],
  [/meniscus/, "Locking or catching, the knee 'giving way', or new swelling after activity means you've done too much — reduce load and get assessed."],
  [/disc|radiculopath|sciatica|stenosis|herniation|nerve root/, "Spreading numbness or weakness, a foot that drops, or worsening leg/arm symptoms mean stop and get reviewed. Any loss of bladder or bowel control, or numbness around the groin, is an emergency — seek urgent care."],
  [/replacement|arthroplasty/, "Sudden severe pain, inability to bear weight, a limb that looks shorter or rotated, or a clunk could be a dislocation or loosening — seek care. Also watch for infection (spreading redness, warmth, fever) and calf-clot signs."],
  [/rotator cuff|cuff repair/, "Sharp catching, sudden weakness lifting the arm, or worsening night pain can mean the repair is being overloaded — respect your sling and loading limits."],
  [/achilles|calf|gastrocnem/, "A sudden 'kick' in the back of the leg, a gap you can feel, or being unable to push off could be a rupture — stop and seek care."],
  [/plantar fasci|heel|\bfoot\b/, "Sharp heel pain that's worst on the first steps of the day means the tissue is irritated — reduce impact; a sudden pop could be a tear."],
  [/frozen shoulder|adhesive capsulitis/, "Forcing painful end-range too hard prolongs a frozen shoulder — gentle and frequent wins. New sudden weakness needs review."],
  [/osteoporos|osteopenia|compression|fragility/, "Your bones are more fragile — avoid heavy spinal bending/twisting and high-impact moves; sudden new back pain could be a compression fracture."],
  [/whiplash|neck strain|cervical/, "Dizziness, visual changes, arm numbness or weakness, or trouble with balance or speech after a neck problem need prompt review."],
  [/vestibular|vertigo|bppv|dizzi|labyrinth/, "Falls are the main risk with dizziness — work near support. A sudden severe headache, double vision, or new weakness/numbness needs urgent care, not exercise."],
  [/hamstring/, "A sharp pull or 'pop' at the back of the thigh with sudden weakness may be a tear — stop; rushing sprinting/eccentric work is the usual cause of re-injury."]
];
function riskAwarenessCard(prog){
  const risks = [], seen = new Set();
  const push = m => { if(!seen.has(m)){ seen.add(m); risks.push(m); } };
  const names = selectedConditions().map(c=>c.name.toLowerCase()).join(" | ");
  const flags = new Set(prog.flags);
  const domains = new Set(prog.items.map(i=>i.domain));

  RISK_KEYWORDS.forEach(([re,msg])=>{ if(re.test(names)) push(msg); });

  if(domains.has("cardiac")) push("Stop and rest for chest pain or pressure, unusual breathlessness, palpitations, a cold sweat, or feeling faint — never push through these.");
  if(domains.has("pulmonary")) push("Watch your breathing and oxygen — stop if you're very breathless at rest, dizzy, or your lips/fingertips look blue, and use your reliever/oxygen as prescribed.");
  if(domains.has("neuro")) push("Falls are the biggest risk — always stay within reach of a sturdy support, and seek urgent care for sudden weakness, numbness, trouble speaking, or a severe headache.");

  if(flags.has("recent_surgery") || /post-|recovery|repair|reconstruction|replacement|arthroplasty/.test(names))
    push("After surgery, watch the wound for spreading redness, warmth, discharge or fever (infection), and watch for a hot, swollen, painful calf or sudden breathlessness/chest pain (blood clot) — seek care.");
  if(flags.has("balance_risk")) push("You're at higher fall risk — clear trip hazards, wear supportive footwear, and keep support within arm's reach for standing and balance work.");
  if(flags.has("neuropathy")) push("With reduced sensation, check your feet and hands before and after exercise for blisters, redness or cuts you might not feel, and wear protective footwear.");
  if(flags.has("diabetes")) push("Check your blood sugar around exercise, carry fast-acting carbs, and inspect your feet — small injuries are easy to miss and slow to heal.");
  if(flags.has("hypertension")||flags.has("vital_bp_high")||flags.has("vital_bp_crisis")) push("With raised blood pressure, avoid breath-holding and heavy straining, and stop for headache, chest pain, or vision changes.");
  if(flags.has("osteoporosis")) push("Prioritise good technique over heavy load, and avoid loaded forward bending, twisting and high impact to protect your spine and hips.");
  const medFlags = new Set(selectedMeds().flatMap(m=>m.flags||[]));
  if(medFlags.has("anticoagulant")||medFlags.has("antiplatelet")) push("On blood thinners, bruising and bleeding happen more easily — favour lower-fall-risk exercises, avoid contact/collision, and report unusual bruising or bleeding.");
  if(medFlags.has("beta_blocker")) push("Your beta-blocker blunts heart rate — judge effort by how it feels (RPE / talk-test), not your pulse, and rise slowly to avoid dizziness.");

  if(!risks.length) return "";
  return `<div class="card riskaware">
    <h2>⚠ Other risks to be aware of</h2>
    <p class="hint">Specific to your condition(s), history and medicines — know these warning signs, and stop or seek care if they appear. This adds to (it doesn't replace) the general red flags in your Safety notes.</p>
    <ul class="notelist">${risks.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
  </div>`;
}

/* ---------- render program ---------- */
function renderProgram(prog){
  const out = $("#programOut");
  if(!prog || !prog.items.length){
    out.innerHTML = `<div class="card empty"><div class="big">🗓️</div><div>No program yet — complete the earlier steps and generate.</div></div>`;
    return;
  }
  /* When a real condition plan matched, the acute/chronic track is vestigial and
     actively misleading - a 55-week ACL plan was badged "Acute track 0-6 wks".
     Show the user's actual position on their own plan instead. */
  const _pl = prog.items[0] && prog.items[0].plan;
  const _ph = prog.items[0] && prog.items[0].phases;
  const _pi = prog.items[0] && prog.items[0].planPhase;
  const trackBadge = (_pl && _ph && _pi >= 0)
    ? `<span class="badge chronic">Phase ${_pi+1} of ${_ph.length} · weeks ${esc(_ph[_pi].weekStart)}–${esc(_ph[_pi].weekEnd)}</span>`
    : (prog.track==="acute"
        ? `<span class="badge acute">Acute track · 0–6 wks</span>`
        : `<span class="badge chronic">Chronic track · 6+ wks</span>`);
  const supMap = {self:["Self-guided OK","self"],supervised:["Clinician-supervised advised","supervised"],clinical:["Medical clearance required","clinical"]};
  const [supTxt,supCls] = supMap[prog.supervision] || supMap.self;   // tolerate a stale/invalid supervision on a persisted program

  let html = `<div class="card">
    <h2>Your ${esc(prog.totalWeeks)}-week program ${trackBadge}</h2>
    <p class="hint">Built for ${esc(String(state.weeks))} week(s) in, pain ${state.painRest}/10 at rest and ${state.painMove}/10 on movement${state.surgery==="yes"?", post-surgical":""}.
      ${state.goal?`Goal: <b>${esc(state.goal)}</b>.`:""}</p>
    <div class="summary">
      <div class="stat"><div class="k">Length</div><div class="v">${esc(prog.totalWeeks)} wks</div></div>
      <div class="stat"><div class="k">Frequency</div><div class="v" style="font-size:14px">${esc(prog.sessions)}</div></div>
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
  html += `<div class="banner info no-print"><b>✎ Make it yours.</b> On any exercise: tap <b>⟳ Rotate</b> to swap it for the next option, or <b>⇄ Swap…</b> to choose from a list.
    For a whole phase: <b>🔄 Rotate all exercises</b> or <b>↩ Reset to recommended</b>. Everything stays within your precautions and is saved automatically.</div>`;
  html += `</div>`;

  // render-time medication filtering (hide high-risk exercises; fully reversible)
  const mflags = medExerciseFlags();
  let medHiddenTotal = 0;
  if(mflags.length) prog.items.forEach(it=>it.phases.forEach(ph=>{
    medHiddenTotal += window.applyContra(ph.ex, mflags).removed.length;
  }));
  // render-time home adaptation (household-object equivalents; fully reversible)
  let homeAdapted = 0;
  if(state.homeMode) prog.items.forEach(it=>it.phases.forEach(ph=>ph.ex.forEach(e=>{
    if(homeSwap(e).home) homeAdapted++;
  })));

  html += whyThisPlanCard(prog);
  html += returnGoalsCard();
  html += adlSuggestionsCard();
  html += homeCard(homeAdapted);
  html += pedGuidanceCard();      // age reshapes everything below it, so it says so first
  html += safetyNotesCard(prog);
  html += riskAwarenessCard(prog);
  html += vitalsCard(prog);
  html += medicationCard(medHiddenTotal);

  prog.items.forEach((item, ci)=>{
    html += `<div class="card"><h2>${esc(item.name)}</h2>
      <p class="hint">${esc(conditionExplain(item, prog.track))}</p>
      ${item.focus?`<div class="focusline"><b>🎯 Injury-specific focus:</b> ${esc(item.focus)}</div>`:""}
      ${planLineHTML(item)}`;
    const hasCurrent = item.phases.some(x=>x.current);
    item.phases.forEach((ph,i)=>{
      const key = ci+"-"+i;
      const open = (ph.current || (i===0 && !hasCurrent) || openPhases.has(key)) ? "open" : "";
      const hiddenNames = mflags.length ? new Set(window.applyContra(ph.ex, mflags).removed.map(r=>r.n)) : null;
      const tw = ph.current ? thisWeekFocus(item) : null;
      const rows = ph.ex.map((e,ei)=>{
        const disp = state.homeMode ? homeSwap(e) : e;      // display copy only — real exercise unchanged
        return exItemHTML(disp, [item.region], {ci, pi:i, ei}, hiddenNames && hiddenNames.has(e.n));
      }).join("");
      html += `<div class="phase ${open}${ph.current?" nowphase":""}">
        <div class="head" role="button" tabindex="0" aria-expanded="${open?"true":"false"}" onclick="togglePhase(this,'${key}')" onkeydown="phaseHeadKey(event,this,'${key}')">
          <div class="pnum">${i+1}</div>
          <div><div class="ptitle">${ph.current?`<span class="nowpill">📍 you are here</span> `:""}${esc(ph.title)} <span class="pweeks">· Weeks ${esc(ph.weekStart)}–${esc(ph.weekEnd)}</span></div>
          <div class="goal">${esc(ph.goal)}</div></div>
          <div class="caret" aria-hidden="true">▾</div>
        </div>
        <div class="body">
          ${ph.restrict?`<div class="planrestrict"><b>⚠ At this stage:</b> ${esc(ph.restrict)}</div>`:""}
          ${tw?`<div class="thisweek"><div class="twk"><b>📅 This week</b> · week ${tw.wip} of ${tw.len} in this phase</div>
            <div class="twrung">${esc(tw.rung)}</div>
            <div class="twnudge tw-${tw.signal||"time"}">${tw.signal==="hold"?"⏸ ":tw.signal==="advance"?"✅ ":""}${esc(tw.nudge)}</div></div>`:""}
          <ul class="exlist">${rows}</ul>
          <div class="phasetools no-print">
            <span class="phasetoolslbl">Whole phase:</span>
            <button class="addexbtn" data-ci="${ci}" data-pi="${i}">＋ Add exercise</button>
            <button class="rerollbtn" data-ci="${ci}" data-pi="${i}">🔄 Rotate all exercises</button>
            <button class="resetbtn" data-ci="${ci}" data-pi="${i}">↩ Reset to recommended</button>
          </div>
          <div class="addexbox hide no-print" data-ci="${ci}" data-pi="${i}"></div>
          <div class="freq"><b>Advance to the next phase when:</b> ${esc(ph.criteria || "this phase feels controlled and symptoms are low & stable")}. The weeks are a guide, not a rule.</div>
        </div></div>`;
    });
    html += `<div class="redflags"><b>⚠ When to get it checked:</b> ${esc(item.redflags)}</div></div>`;
  });

  html += clinicianProtocolCards();     // any saved physician protocols, shown verbatim (added in the Clinician step)
  html += suggestionsCard(prog);
  out.innerHTML = html;
  wireProgram();
}

/* ---------------------------------------------------------------------
   PAEDIATRIC GUIDANCE
   What "age-appropriate" actually means for THIS band, plus the two things
   most likely to be got wrong: that children shouldn't do resistance training
   (they should — supervised and technique-led), and that a growing skeleton
   fails at the growth plate rather than the muscle.
   The age SOURCE is stated out loud. Age silently reshapes the whole program
   now, so an inferred one has to be visible and correctable, not a secret.
   --------------------------------------------------------------------- */
const PED_BAND_GUIDE = {
  neonatal: { icon:"👶", head:"Newborn — all care is parent-led",
    body:"At this age 'exercise' is handling, positioning and gentle range of motion, done by you, exactly as the team showed you. Short and settled beats long and upset.",
    key:["Tummy time from day one, awake and supervised — it builds the neck and shoulder strength everything else stands on.",
         "Passive range of motion is slow and small. It should never make your baby cry out.",
         "Position changes through the day matter more than any single exercise."] },
  infant: { icon:"👶", head:"Infant — the work is the milestones",
    body:"Rehab here means helping the next motor milestone arrive: rolling around 4–6 months, sitting around 6, crawling 8–10, cruising 9–12, walking around 12 (anywhere from 9 to 15 is normal). Play IS the therapy.",
    key:["Follow your baby's lead. Several happy 5-minute bouts beat one long session.",
         "Aim for around an hour of tummy time across the day, in short goes.",
         "Milestone ranges are wide. Steady progress matters more than hitting a date."] },
  toddler: { icon:"🧸", head:"Toddler — repetition disguised as a game",
    body:"Toddlers repeat what's fun, not what's prescribed. Every item below is a game on purpose — that's what gets the reps in.",
    key:["Count out loud, race them, make it silly. Compliance at this age is entertainment.",
         "Expect falls. Supervise, childproof, and let them practise anyway.",
         "Little and often through the day beats a scheduled session."] },
  preschool: { icon:"🧒", head:"Preschool — fundamental movement skills",
    body:"This is when hopping (~3½–4), catching, and skipping (~5) arrive. These skills are the foundation for everything later, and they're built by playing them.",
    key:["Vary it. Lots of different movements beats drilling one.",
         "Short bouts — 5–10 focused minutes is a full session at this age.",
         "Praise effort, not performance. Kids who feel clumsy stop moving."] },
  school: { icon:"🧑", head:"School-age — technique first, load later",
    body:"Children can and should do resistance training — supervised, technique-led, with light or bodyweight load. Strength gains at this age come from the nervous system learning the movement, not from muscle bulk, so quality of practice IS the training stimulus.",
    key:["1–2 sets of 8–15 reps, 2–3 non-consecutive days a week. Technique before any load.",
         "Balance and landing practice isn't filler — it measurably lowers injury risk in youth sport.",
         "No maximal (one-rep-max) lifting. Not a strength issue — a growing skeleton's weak link is the growth plate."] },
  adolescent: { icon:"🧑‍🦱", head:"Adolescent — close to adult, with two differences",
    body:"From here rehab looks much like an adult's, and progressive resistance training is both safe and effective with coaching. Two things still set it apart: the growth plates are open, and growth itself is a risk factor.",
    key:["Build reps and quality before weight. Add load only once technique holds up under fatigue.",
         "Still no max-effort singles or ballistic lifting until skeletal maturity and solid technique.",
         "Around the growth spurt (~11½ in girls, ~13½ in boys) injury risk peaks and tolerance for jumps in load drops. Progress slower during it, not faster.",
         "Pain at a bony point that's tender to press — knee, heel — is usually a growth-plate traction issue. Manage the load; don't push through it."] }
};
function pedGuidanceCard(){
  const info = userAgeInfo();
  if(info.age >= 18) return "";
  const band = pedBandOf(info.age); if(!band) return "";
  const g = PED_BAND_GUIDE[band.k]; if(!g) return "";
  /* Say where the age came from. An inferred age that silently rewrites the plan is the
     same failure as no age at all — only harder to notice. */
  const src = info.source === "stated"
    ? `Based on the age you entered — <b>${esc(String(state.age))}</b>.`
    : info.source === "surgery"
      ? `No age entered, so this uses the age band of the procedure you chose — <b>${esc(info.band)}</b>. Add an exact age in Medical history for a closer match.`
      : `No age entered, so this uses the usual age range for <b>${esc(String(info.from||"your diagnosis"))}</b> (${info.lo}–${info.hi} yr). Add an exact age in Medical history for a closer match.`;
  return `<div class="card pedcard">
    <h2>${g.icon} ${esc(g.head)}</h2>
    <p class="hint pedsrc">${src}</p>
    <div class="pedband">Age group used: <b>${esc(band.label)}</b></div>
    <p class="pedbody">${esc(g.body)}</p>
    <ul class="pedkeys">${g.key.map(k=>`<li>${esc(k)}</li>`).join("")}</ul>
    <p class="pedfoot">Every exercise below is filtered to this age group — movements written for adults, and play written for younger children, are both held back. Educational guidance only: a paediatric physiotherapist should set and supervise a child's program.</p>
  </div>`;
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
  if(state.smoking==="current") base.push("<b>Smoking &amp; healing:</b> tobacco slows tendon, bone and wound healing and lowers exercise capacity — cutting down or quitting meaningfully speeds recovery. Ask your clinician about support.");
  if(state.sleep==="lt6") base.push("<b>Sleep:</b> under 6 hours raises pain sensitivity and slows repair — protecting sleep is one of the highest-value things you can do for recovery.");
  if(state.stress==="high") base.push("<b>Stress:</b> high stress amplifies pain and slows healing — a few minutes of daily breathing or relaxation helps your tissues tolerate load.");
  if(state.alcohol==="heavy") base.push("<b>Alcohol:</b> heavy use impairs muscle repair, sleep and balance — cutting back supports your recovery and lowers fall risk.");
  if(state.falls==="2" || (state.aid && state.aid!=="none")) base.push("<b>Fall safety:</b> do balance and standing work beside a sturdy rail or counter, keep floors clear, and progress difficulty slowly.");
  return `<div class="card"><h2>Suggestions for your recovery</h2><ul class="tips">${base.map(t=>`<li>${t}</li>`).join("")}</ul>
    <p class="hint" style="margin-top:8px">Questions about any of this? Ask <b>Jeffery</b> in the <b>AI</b> tab.</p></div>`;
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
  { kw:["breath","breathe","short of breath","breathless","copd","oxygen"], a:()=>"Pace exercise with your breathing: **pursed-lip breathing** (in through the nose, out slowly through pursed lips), rest when breathless, and use prescribed oxygen. Breathlessness is expected; chest pain, dizziness, or blue lips are not — stop and seek care." },
  { kw:["max heart rate","maximum heart rate","target heart rate","heart rate zone","hr zone","target zone","tanaka","borg","rpe","perceived exertion","how hard should i","how hard do i","talk test","target hr","karvonen","how hard to work"], a:()=>{
      const hz=hrZones(), b=borgTarget();
      if(hz) return `Your estimated **maximum heart rate is about ${hz.hrmax} bpm** (Tanaka: 208 − 0.7 × age). A good **moderate** zone is **${fmtRange(hz.zones.moderate)} bpm**${hz.rest?" (Karvonen, from your resting HR)":""}; **vigorous** (only as cleared) is **${fmtRange(hz.zones.vigorous)} bpm**. ${onBetaBlocker()?"Because you take a **beta-blocker**, your heart rate won't rise normally — use **Borg RPE** instead. ":""}Prefer effort-based? Aim for **${b.label}**. Simplest of all is the **talk-test**: you should be able to talk but not sing.`;
      return `Add your **age** (and ideally resting heart rate) in the History step and I'll calculate your **maximum heart rate** (Tanaka formula) and target zones. Meanwhile, gauge effort with **Borg RPE**: aim for **${b.label}** — you should be able to talk but not sing.`;
    } },
  { kw:["doms","sore muscles","muscle soreness","sore after","day after","aching muscles","muscle ache","stiff after exercise"], a:()=>"Delayed-onset muscle soreness (**DOMS**) — achy, tender muscles 1–3 days after new or harder exercise — is normal and **not damage**. It settles on its own; **gentle movement, light activity, hydration and sleep** help more than total rest. It should be dull and roughly symmetrical, easing by ~72h. Sharp, one-sided, or joint (rather than muscle) pain is different — ease off. Soreness fades as you adapt." },
  { kw:["foam roll","foam rolling","massage","trigger point","roller","self massage","rolling"], a:()=>"Foam rolling and massage **temporarily ease tightness and improve comfort and range** — handy as a warm-up. They don't 'break up' scar tissue or fix the underlying cause, so pair them with strengthening. Roll slowly, breathe, and avoid rolling directly over bone, joints, or a fresh injury." },
  { kw:["isometric","static hold","isometrics for pain","hold the muscle","quad set","wall sit pain"], a:()=>"**Isometrics** — holding a muscle tight without moving the joint (quad sets, wall pushes, planks) — build strength and often **reduce pain**, so they're ideal when movement hurts or very early after injury. Try ~5 holds of 30–45s at a firm but comfortable effort, breathing normally. Your early phases lean on these." },
  { kw:["tendon","tendinopathy","tendinitis","tendinosis","achilles","patellar tendon","tennis elbow","golfer","rotator cuff load"], a:()=>"Tendons respond to **gradual, progressive load** — not rest or aggressive stretching. Start with isometrics for pain relief, build to slow heavy strength, then spring/energy-storage work. Expect a **slow trend over weeks–months**; pain that stays stable during and settles by the next morning is acceptable. Load spikes are the usual trigger — increase gently (~10%/week)." },
  { kw:["arthritis","osteoarthritis","joint wear","bone on bone","degenerative","joint pain older","oa"], a:()=>`For osteoarthritis, **movement is medicine** — regular strengthening and low-impact aerobic exercise reduce pain and stiffness better than rest, and a 'bone-on-bone' scan doesn't dictate what you can do. Build the muscles around the joint, keep active within comfort, and manage weight (every pound off is several off the knee). ${state.painMove>=6?"Start gentle and let some ache be okay. ":""}Some discomfort with activity is normal.` },
  { kw:["osteoporosis","osteopenia","bone density","bone health","brittle bones","dexa","fragile bones"], a:()=>"Bones strengthen to **load**: progressive resistance training and, if safe, some impact/weight-bearing work — plus **balance training to prevent falls**. With osteoporosis, avoid heavy end-range spinal bending/twisting and high-impact until cleared. Adequate calcium, vitamin D and protein, and not smoking, all support bone." },
  { kw:["diabetes","blood sugar","glucose","diabetic","insulin","hypo","hyperglyc"], a:()=>"Exercise **lowers blood glucose and improves insulin sensitivity** — both aerobic and resistance training help. Check glucose around sessions, carry fast-acting carbs for a low, stay hydrated, and look after your feet (good shoes, daily checks). Skip vigorous exercise if glucose is very high with ketones. I can't manage your medication — coordinate with your team." },
  { kw:["lose weight","weight loss","overweight","body fat","losing weight","slim down"], a:()=>`Losing excess weight meaningfully **reduces joint load and pain** — several times your body-weight change goes through the knee with each step. The best mix is **diet + activity + strength** to keep muscle while losing fat. ${bmiCalc((state.vitals||{}).height,(state.vitals||{}).weight)!=null?`Your BMI is about ${bmiCalc(state.vitals.height,state.vitals.weight)}. `:""}Small, steady changes beat crash diets; a dietitian can tailor it.` },
  { kw:["balance","falling","fall","unsteady","prevent falls","wobbly","steadiness"], a:()=>"To improve balance and cut fall risk: practise **standing balance near a sturdy support** (single-leg stands, tandem stance, weight shifts), strengthen your legs, and only progress to eyes-closed or softer surfaces once steady. Keep floors clear, good lighting, and supportive footwear. Sudden or severe dizziness — especially with headache, or visual/speech changes — needs review, not exercise." },
  { kw:["pacing","chronic pain","fibromyalgia","fatigue","long covid","boom and bust","crash","post-exertional","cfs","me/cfs"], a:()=>"With persistent pain or fatigue, **pace** rather than push to your limit: short bouts within a comfortable ceiling, rest **before** you're wiped out, and increase gradually. Consistency beats big days followed by crashes. Some flare is safe and expected — gentle graded activity is the best-evidenced approach. A slow, kind trend wins." },
  { kw:["afraid to move","scared to move","fear of movement","cause damage","kinesiophobia","nervous to exercise","worried i'll hurt"], a:()=>"It's normal to fear that hurting means harming — but with most conditions, and especially persistent pain, **pain doesn't equal damage**. Gentle, graded exposure to the movements you're avoiding — starting easy and building confidence — is exactly how you get them back. Your program starts well within your capacity for this reason. Unsure a move is safe? Ask, or check with a clinician." },
  { kw:["hrv","heart rate variability","recovery score","readiness","how recovered","rmssd"], a:()=>"Heart-rate variability (**HRV**) reflects nervous-system recovery — generally **your-normal-or-above = well recovered**; a notable dip can mean fatigue, stress, poor sleep or coming illness. Track **your own trend**, not others'. Low today? Favour lighter/mobility work. You can read live HRV from a Bluetooth monitor in the **Health** tab." },
  { kw:["spo2","oxygen saturation","oxygen level","desaturate","low oxygen","pulse ox","sats"], a:()=>`Resting **SpO₂ is normally ~95–100%**. A small dip during hard effort can be normal, but dropping **below ~90%**, or feeling very breathless, dizzy or blue-lipped, means stop and rest — and get reviewed if it persists (especially with a heart/lung condition). ${(state.vitals||{}).spo2?`You logged SpO₂ ${state.vitals.spo2}%. `:""}You can track SpO₂ from a Bluetooth pulse oximeter in the **Health** tab.` },
  { kw:["steps","how many steps","walking goal","10000 steps","daily steps","walk more","step count"], a:()=>"Walking is superb all-round recovery — it pumps swelling away, keeps joints moving and builds aerobic base. There's nothing magic about 10,000: **beating your current average is the win**, with benefits climbing from ~4–8k. Build up ~10%/week, split into short walks if needed, and log steps in the **Health** tab to watch the trend." },
  { kw:["pool","water exercise","aquatic","swimming rehab","hydrotherapy","water therapy","aqua"], a:()=>`Water is excellent early rehab: **buoyancy offloads sore or healing joints** (chest-deep water takes ~50–70% of your leg weight off) while giving gentle all-round resistance and warmth. There's a **Pool / aquatic** set in the exercise library.${aquaticAllowed()?"" : " To have pool exercises suggested in your program, set **Confidence in water** in the History step first — that lets the plan tailor water work (and shallow-only if you're less confident)."} Stay where you can stand if you're not a confident swimmer, and never swim alone.` },
  { kw:["no equipment","at home","home workout","no gym","without weights","household","home exercise"], a:()=>"You don't need a gym — **bodyweight, household objects and bands** cover most rehab: soup cans/water bottles for light weight, a loaded backpack for more, a towel for resistance, a sturdy chair for support. Flip on **Home mode** in the Program tab and PhysioPath swaps your exercises to everyday-object versions with how-to notes." },
  { kw:["how many reps","sets and reps","how many sets","rep range","how many exercises","reps"], a:()=>"General guide: **strength** ~2–4 sets of 6–12 reps at a challenging-but-controlled effort (last 1–2 reps hard); **endurance/early rehab** 2–3 sets of 12–20; **isometric holds** ~5 × 30–45s. Leave 1–2 reps 'in the tank' early. Your program lists sets×reps per exercise — full range and quality beat chasing numbers." },
  { kw:["progressive overload","how to progress","progress an exercise","how do i progress","progress my","make it harder","progression","increase weight","level up exercise"], a:()=>"You get stronger by **gradually asking a bit more** — add reps, then sets, then load/difficulty, about **~10% a week**. When an exercise feels easy (you could do several more good reps), progress it. Your later phases do this automatically; use **⟳ Rotate / ⇄ Swap** on any exercise to step it up or down, or **＋ Add exercise** to a phase." },
  { kw:["eccentric","slow lowering","negatives","lengthening","nordic","3 second lower"], a:()=>"**Eccentric** work — emphasising the slow lowering/lengthening phase (e.g. a 3-second lower) — is especially good for **tendon and muscle strength** and is a staple of tendinopathy rehab. Control the lowering, don't rush, and expect some manageable soreness early on." },
  { kw:["weight bearing","weightbearing","wbat","nwb","pwb","toe touch","weight on leg","put weight on my"], a:()=>{ const w=wbSummary(); return (w?`Your set order is **${w}**. `:"")+"Weight-bearing orders say how much load to put through a healing leg: **NWB** none · **TTWB** a light touch for balance only · **PWB** a set share (often 25–50%) · **WBAT** as much as stays comfortable · **FWB** full. Follow your surgeon's order exactly and practise the amount on a bathroom scale. Setting it in the Program tab reshapes your exercises to match."; } },
  { kw:["blood thinner","anticoagulant","warfarin","eliquis","apixaban","rivaroxaban","bruise easily","on thinners"], a:()=>"On blood thinners, exercise is encouraged but **avoid contact and high-impact activities** (bruising/bleeding risk) and take extra care to prevent falls. Report a newly swollen or painful joint/muscle, or any unusual bleeding. I can't advise on your medication — check with your prescriber before contact sport." },
  { kw:["cancer","chemo","radiation","oncology","tumor","during treatment","chemotherapy"], a:()=>"Exercise is **safe and beneficial during and after cancer treatment** — it reduces fatigue and helps strength, mood and function — but **pace around fatigue** and keep intensity moderate. Get your oncology team's clearance; if there's any bone involvement, avoid high-impact and heavy loading of that area. Watch for anaemia-related breathlessness." },
  { kw:["pregnant","pregnancy","postpartum","expecting","after birth","pelvic floor","post-natal"], a:()=>"In an uncomplicated pregnancy, staying active is recommended: **after the first trimester avoid lying flat on your back** and face-down positions, skip breath-holding and contact/fall-risk activities, and stay cool and hydrated. Include pelvic-floor work. Stop and contact your provider for bleeding, dizziness, contractions or fluid leakage. Any complications → get individual advice." },
  { kw:["elderly","older adult","senior","too old","age to exercise","my age","70s","80s"], a:()=>"It's never too late — older adults gain strength, balance and independence from training just like younger ones, and **strength + balance work is the best fall-prevention there is**. Start gentle, progress steadily, work near support if unsteady, and prioritise protein and sleep for muscle. Consistency matters more than intensity." },
  { kw:["cramp","charley horse","spasm","cramping","muscle cramp"], a:()=>"Cramps often come from **fatigue, dehydration or electrolyte loss** (or simply new exercise). During one, gently stretch and massage the muscle; to prevent them, warm up, build load gradually, stay hydrated and don't over-fatigue. Frequent night cramps, or cramps with numbness/weakness, are worth mentioning to your doctor." },
  { kw:["hydration","water intake","dehydrated","drink water","how much water","fluids"], a:()=>"Drink to thirst and keep urine pale — roughly **1.5–2 L a day**, more when hot or exercising hard. Good hydration supports performance, cuts cramp risk and aids recovery. Plain water is fine for typical rehab; you rarely need sports drinks." },
  { kw:["alcohol","drinking","beer","wine","booze"], a:()=>"Alcohol **impairs recovery** — it worsens sleep, blunts muscle repair, raises inflammation and injury risk, and dehydrates you. Cutting back, especially around harder training and after injury or surgery, meaningfully helps healing." },
  { kw:["stress","anxiety","mental health","mood","depression","overwhelmed","burnout"], a:()=>"Stress genuinely **amplifies pain and slows healing** by ramping up your nervous system. Regular movement, sleep, breathing/relaxation and social connection all turn the dial down — exercise itself is one of the best mood and pain regulators. If low mood or anxiety is persistent, please reach out to a GP or mental-health professional." },
  { kw:["plateau","stuck","not improving","no progress","consistency","habit","stalled","stopped improving"], a:()=>"Plateaus are normal — the fix is usually to **progress the challenge** (more reps/load/difficulty) or **check the basics** (sleep, protein, consistency, total load). Anchor sessions to an existing daily habit and keep them short so they actually happen. No trend for several weeks despite that? A physio can spot what to change." },
  { kw:["scar","scar tissue","stiff after surgery","mobilize scar","adhesion","tight scar","incision"], a:()=>"Once the wound is fully healed and your surgeon clears it, **gentle scar massage plus regular movement** keep the area supple and reduce stiffness. Don't rub a fresh or unhealed incision. Most post-surgical stiffness responds to consistent range-of-motion work — respect your surgeon's timeline and precautions." },
  { kw:["numb","numbness","tingling","pins and needles","nerve","radiating","shooting pain","sciatica"], a:()=>"Brief, positional tingling from an irritable nerve often eases with movement and nerve-gliding drills. But **spreading or worsening numbness/weakness, a dropping foot, or symptoms in both legs** — and especially any loss of bladder/bowel control or numbness around the groin — need **prompt medical review**. Don't push through worsening nerve symptoms." },
  { kw:["heart attack","cardiac rehab","heart failure","angina","after heart","cardiac exercise","bypass","stent"], a:()=>`After a heart event, **supervised cardiac rehab** is one of the highest-value things you can do — it safely rebuilds fitness and cuts future risk. Use the **talk-test / Borg RPE**, warm up and cool down fully, never hold your breath, and stop for chest pain, undue breathlessness or dizziness. ${hasCardiacDevice()?`With your ${cardiacDeviceLabel()}, keep effort light–moderate and respect the device limit. `:""}Get your cardiologist's clearance first.` },
  { kw:["icd","pacemaker","defibrillator","crt","lvad","heart device","implant"], a:()=>{ if(!hasCardiacDevice()) return "If you have an implanted cardiac device (pacemaker, ICD/CRT-D or LVAD), tick **Pacemaker or ICD** in the History step and add any ICD therapy heart-rate threshold — I'll then cap your training zones safely below it and adjust your plan."; const cap=deviceHRCeiling(); return `With your **${cardiacDeviceLabel()}**, `+(hasLVAD()?"your heart rate isn't reliable — judge effort by **RPE / talk-test**, avoid breath-holding, impact and straining, and follow your VAD team's plan.":`keep your heart rate **well below the device's therapy threshold**${cap?` (your zones are capped at ~${cap} bpm)`:""}, stay light–moderate (RPE ≤13) and skip maximal efforts.`)+" Confirm your safe ceiling with your cardiologist."; } },
  { kw:["how do i use","how does this app","what can this app","features","how to use physiopath","edit my program","add exercise","swap exercise"], a:()=>"Quick tour: **Clinician** step lets a clinician add a protocol; **Injury → Details** build and personalise your plan; the **Program** tab lets you **⟳ Rotate**, **⇄ Swap**, **🗑 Remove** or **＋ Add** exercises per phase, set weight-bearing/braces/precautions, and toggle **Home mode**; **Health** tracks vitals, labs, risks and **syncs a smartwatch/heart-rate monitor**; and I'm here in the **AI** tab. Ask me about any of it." }
];

/* =====================================================================
   RED-FLAG INTERCEPTION
   The coach must never answer a possible emergency with a rehab explainer.
   This runs at the CHAT ENTRY POINT — deliberately OUTSIDE coachAnswer(),
   because askClaude()'s error path falls back to coachAnswer(), so a check
   living inside it would be skipped by a rate limit or a dropped connection.
   Patterns are narrow on purpose: crying wolf teaches people to click past
   the one that matters. They are tested against the app's own exercise
   vocabulary ("chest press", "dead bug", "my knee is killing me").
   ===================================================================== */
const RED_FLAG_RULES = [
  { k:"cardiac",
    re:/\bchest (?:pain|pressure|tightness|tight|discomfort|heaviness|heavy)\b|\b(?:pain|pressure|tight\w*|discomfort|heaviness|heavy|ache|aching|pounding) (?:in|across|through|on) (?:my |the )?chest\b|\bcrushing\b[^.]{0,14}\bchest\b|\bchest\b[^.]{0,18}\b(?:radiat\w*|spread\w*)\b[^.]{0,22}\b(?:arm|jaw|neck|shoulder)\b|\bheart attack\b/i,
    t:"Chest pain needs checking now — not by me",
    b:"Chest pain, pressure or tightness — especially with breathlessness, sweating, nausea, or pain spreading to your arm, jaw or neck — can be a heart attack. It is not something to stretch, work through, or wait out.",
    a:"Stop what you're doing and call your local emergency number (911 / 999 / 112) now. If you've been prescribed a GTN spray, use it as directed. Don't drive yourself." },
  { k:"cauda",
    re:/\b(?:lost|losing|loss of|can't control|cannot control|no control over)\b[^.]{0,26}\b(?:bladder|bowel|urine|continence)\b|\b(?:bladder|bowel)\b[^.]{0,18}\b(?:control|incontinen\w*|accident)\b|\bnumb\w*\b[^.]{0,26}\b(?:groin|saddle|genital\w*|perineum|inner thigh|between my legs|buttock)\b|\b(?:saddle|groin)\b[^.]{0,14}\bnumb\w*\b|\bcan't (?:pee|urinate|wee)\b|\bunable to (?:pee|urinate)\b/i,
    t:"This combination is a surgical emergency",
    b:"Losing bladder or bowel control, or numbness around the groin or saddle area, alongside back or leg symptoms can mean cauda equina syndrome — compression of the nerve bundle at the base of the spine. The window to prevent permanent damage is measured in hours.",
    a:"Go to an emergency department now — today, not at your next appointment. Say the words \"I think this might be cauda equina\". Do not wait to see whether it settles." },
  { k:"stroke",
    re:/\b(?:face|mouth|smile)\b[^.]{0,18}\b(?:droop\w*|lopsided|uneven|fell)\b|\bsudden\w*\b[^.]{0,22}\b(?:weak\w*|numb\w*)\b[^.]{0,18}\bone side\b|\b(?:slurr\w*|garbl\w*)\b[^.]{0,14}\bspeech\b|\bcan't (?:speak|talk|find my words)\b|\bworst headache\b|\bsudden\w*\b[^.]{0,14}\b(?:severe|worst|thunderclap)\b[^.]{0,14}\bheadache\b/i,
    t:"These are stroke signs — act immediately",
    b:"Face drooping, sudden one-sided weakness, slurred speech, or a sudden worst-ever headache are stroke signs. Treatment runs on a clock, and every minute of delay costs brain tissue.",
    a:"Call your local emergency number (911 / 999 / 112) right now, and note the time the symptoms started — the treating team will need it." },
  { k:"dvt",
    re:/\b(?:calf|leg|thigh)\b[^.]{0,26}\b(?:hot|warm|red|swollen|swelling)\b[^.]{0,26}\b(?:pain\w*|sore|tender|ach\w*|swollen|swelling|hot|warm|red)\b|\b(?:hot|warm|red)\b[^.]{0,14}\band\b[^.]{0,14}\bswollen\b[^.]{0,18}\b(?:calf|leg|thigh)\b|\bblood clot\b|\bdvt\b|\bcough\w*\b[^.]{0,14}\bblood\b|\bsudden\w*\b[^.]{0,18}\b(?:breathless\w*|short of breath|can't breathe)\b/i,
    t:"A hot, swollen, painful calf needs same-day assessment",
    b:"A calf or leg that is swollen, warm, red and tender — particularly after surgery, a cast, illness or a long journey — can be a deep vein thrombosis. If a clot travels to the lungs it becomes life-threatening, so sudden breathlessness or coughing blood alongside it is an emergency.",
    a:"Do not massage it, stretch it, or exercise on it — that is exactly the wrong thing. Get seen today (urgent care, your GP, or ED). With breathlessness or coughing blood, call emergency services now." },
  { k:"infection",
    re:/\b(?:hot|red|swollen|swelling)\b[^.]{0,30}\b(?:joint|knee|hip|shoulder|elbow|wrist|ankle|foot|hand|finger|toe|back)\b[^.]{0,34}\b(?:fever|temperature|chills|shiver\w*|unwell|sweats)\b|\b(?:joint|knee|hip|shoulder|elbow|wrist|ankle|foot|hand|finger|toe|back)\b[^.]{0,30}\b(?:hot|red|swollen|swelling)\b[^.]{0,34}\b(?:fever|temperature|chills|shiver\w*|unwell|sweats)\b|\b(?:fever|temperature|chills)\b[^.]{0,34}\b(?:hot|red|swollen)\b[^.]{0,18}\b(?:joint|knee|hip|shoulder|elbow|wrist|ankle|foot|hand|finger|toe|back)\b|\b(?:wound|incision|scar)\b[^.]{0,26}\b(?:pus|oozing|discharge|smell\w*|red streak\w*|opening up|splitting)\b|\bseptic\b/i,
    t:"A hot joint with a fever is an emergency until proven otherwise",
    b:"A single hot, red, swollen, exquisitely painful joint together with a fever or feeling generally unwell can be septic arthritis, which can destroy a joint within days. After surgery, a wound that is hot, oozing, smelling or opening up can signal a deep infection.",
    a:"Get assessed today — an emergency department, or your surgical team directly if you're post-op. Don't exercise the joint in the meantime." }
];
/* Returns escalation text for a possible emergency, or null. */
function redFlagFor(qRaw){
  const q = String(qRaw||"");
  for(const r of RED_FLAG_RULES){
    if(r.re.test(q))
      return `\u{1F6A8} **${r.t}**\n\n${r.b}\n\n**What to do:** ${r.a}\n\nI'm an educational tool and I can't assess this — please don't wait on an app for it. I'll still be here for your rehab questions afterwards.`;
  }
  return null;
}

/* Generic keywords sit on 371-742 generated KB entries each ("what is", "about",
   "symptoms"...). Alone they carry no signal, and because ties go to the first
   entry scanned they made COACH_KB[0] (knee OA) the universal answer to any
   "tell me about..." phrasing. An entry must now match one SPECIFIC keyword to win. */
const GENERIC_KW = new Set(["what is","what","whats","about","tell me about","tell me","explain","define","definition",
  "info","information","symptom","symptoms","sign","signs","help","overview","describe","mean","meaning","is it chronic","chronic"]);
/* Word-boundary + light plural stemming. `q.includes(kw)` was substring matching, so
   the 2-letter keywords in the generated KB ("ra", "ms", "cp", "md") matched INSIDE
   ordinary words: "radiates" -> rheumatoid arthritis, "symptoms" -> multiple sclerosis.
   Normalising both sides to " word word " and testing for " kw " kills the whole class
   without touching the generated KB. Stemming keeps "knees" matching "knee". */
const _stem = w => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) ? w.slice(0, -1) : w;
/* Document frequency over COACH_KB, computed once. The generated file gives every one
   of its 371 conditions the same 57 question templates, so a keyword's spread tells you
   exactly what it is: condition IDENTIFIERS land at DF 57-114 (once per template),
   while shared topic tags ("ice or heat", "what is") land at 371+. Measured, not guessed.
   An entry may rank on a topic tag but may never WIN on one — otherwise every "should I
   ice?" resolves to COACH_KB[0] (knee OA) purely because it is first in the file. */
const DF_TOPIC = 200;                       // >= this => a shared topic tag, not an identifier
let _kbDF = null;
function kbDF(){
  if(_kbDF) return _kbDF;
  _kbDF = new Map();
  for(const e of (window.COACH_KB||[])) for(const k of e.kw) _kbDF.set(k, (_kbDF.get(k)||0)+1);
  return _kbDF;
}
const kbNorm = s => " " + String(s||"").toLowerCase().replace(/[^a-z0-9']+/g," ").trim().split(" ").map(_stem).join(" ") + " ";

function coachAnswer(qRaw){
  const q = String(qRaw||"").toLowerCase();
  /* Offline had no memory at all: coachAnswer only ever saw the current string, so "what about
     the other leg?" was meaningless — follow-ups worked online and silently stopped working
     without a key, or whenever the API fell back to here. A short or conjunction-led question
     carries no topic of its own, so fold the previous one in FOR SCORING ONLY (qFold).
     Deliberately not `q` itself: the branches below test for the words "about"/"what is", and
     a folded-in question drags those in and fires the wrong branch. */
  const _prev = prevUserQuestion();
  const _bare = _prev && (q.split(/\s+/).filter(Boolean).length <= 6
    || /^(and|but|so|ok|okay|what about|how about|why|really|then|that)\b/i.test(q));
  const qFold = _bare ? (_prev.toLowerCase() + " " + q) : q;
  const conds = selectedConditions();
  for(const c of conds){
    const first = c.name.toLowerCase().split(/[ (]/)[0];
    if(q.includes(first) && /(about|what is|tell me|info|explain)/.test(q))
      return `**${c.name}** — ${aboutText(c, state.program?state.program.track:classify(state.weeks)||"acute")}\n\n${DOMAIN_REDFLAGS[c.domain]}`;
  }
  let best=null, score=0;
  const qn = kbNorm(qFold);        // folded follow-up context lands here and nowhere else
  /* The user's own diagnosis makes a condition-specific entry ELIGIBLE without adding to
     its score — so "should I ice?" resolves to THEIR condition's answer, while an unrelated
     question ("how do I read my HRV?") can't be hijacked by their condition. */
  const ctx = kbNorm(conds.map(c=>c.name).join(" "));
  const scan = (arr, useDF) => {
    const df = useDF ? kbDF() : null;
    for(const item of arr){
      if(!item._nkw) item._nkw = item.kw.map(k=>({ pad:kbNorm(k), n:k.split(" ").length,
        topic: GENERIC_KW.has(k) || (df ? (df.get(k)||0) >= DF_TOPIC : false) }));   // cached per entry
      let s=0, spec=0;
      for(const k of item._nkw){
        const inQ = qn.includes(k.pad);
        if(inQ) s += k.n;                                          // topic tags still drive ranking
        if(!k.topic && (inQ || ctx.includes(k.pad))) spec += k.n;  // ...but only an identifier makes it eligible
      }
      if(spec>0 && s>score){ score=s; best=item; }
    }
  };
  scan(KB, false);                     // 53 hand-authored, personalized — all discriminating; win ties
  scan(window.COACH_KB || [], true);   // 20,199 generated — win only on a real identifier
  if(best && score>0) return typeof best.a==="function" ? best.a() : best.a;
  if(/program|phase|week|routine|plan/.test(q)){
    if(state.program) return `Your plan is a **${state.program.totalWeeks}-week, 4-phase program** (${state.program.track} track): ${TEMPLATE[state.program.track].phases.map(p=>p.title).join(" → ")}. Advance a phase when the current one feels controlled and symptoms are low. See the **Program** tab for exercises.`;
    return "Build a program first (History → Injury → Details), then I can walk you through your phases and exercises.";
  }
  return `I'm not sure I caught that${coachOnline()?"":" (I'm answering offline — add a Claude API key below and I can tackle anything in your own words)"}. I can help most with: **ice vs heat · how much pain is okay · sets & reps · progressing exercises · target heart rate & HRV · SpO₂ · steps · pool/aquatic work · tendons · arthritis & bone health · your precautions & weight-bearing · flare-ups & pacing · nutrition · sleep · returning to sport · when to see a doctor**.\n\nTry *"How do I progress an exercise?"*, *"What should I avoid with my condition?"*, or *"How do I read my HRV?"* — and for anything serious or not improving, see a clinician in person.`;
}

/* ---------------------------------------------------------------------
   Backup & restore. The entire rehab history lives in one localStorage key,
   which a browser "clear data" wipes and which Safari evicts after 7 days of
   non-use for a non-installed PWA. There was no copy of it anywhere and no
   warning. The API key is excluded on purpose - a backup file is something
   people email to themselves or hand to a physio.
   --------------------------------------------------------------------- */
/* ⚠ This file is called "backup", so it has to BE one. Photos live in IndexedDB rather than
   in state, so serialising state alone would hand someone a file named backup that silently
   omits the only irreplaceable thing in the app. */
async function exportData(){
  const { apiKey, ...safe } = state;
  const btn = $("#exportBtn"), label = btn && btn.textContent;
  if(btn){ btn.disabled = true; btn.textContent = "Packing…"; }
  try{
    const photos = await photoPack();
    const payload = { _app:"physiopath", _version:2, _exported:new Date().toISOString(), state:safe, photos };
    const json = JSON.stringify(payload, null, 2);
    const url = URL.createObjectURL(new Blob([json], {type:"application/json"}));
    const a = document.createElement("a");
    a.href = url; a.download = `physiopath-backup-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    toast(`Backup downloaded — ${photos.length ? photos.length + " photo" + (photos.length===1?"":"s") + " included · " : ""}`
      + fmtBytes(json.length) + (apiKey ? " · your API key was left out on purpose" : ""));
  }catch(e){
    console.warn("backup failed:", e);
    toast("⚠ Couldn't build the backup file.");
  }finally{ if(btn){ btn.disabled = false; btn.textContent = label; } }
}
function importData(file){
  const rd = new FileReader();
  rd.onload = async () => {
    let p;
    try{ p = JSON.parse(rd.result); }
    catch(e){ toast("⚠ That file isn't valid JSON."); return; }
    const incoming = (p && p._app === "physiopath" && p.state) ? p.state : p;
    if(!incoming || typeof incoming !== "object" || (!("condIds" in incoming) && !("log" in incoming))){
      toast("⚠ That doesn't look like a PhysioPath backup."); return;
    }
    const when = (p && p._exported) ? new Date(p._exported).toLocaleDateString() : "an unknown date";
    const n = (incoming.log||[]).length;
    const pics = (p && Array.isArray(p.photos) ? p.photos : []).filter(photoValid);
    /* This restore REPLACES, and photos sit outside state — so without clearing them a v1
       backup would leave today's photos stranded against a restored older journal, on days
       they were never taken. Counted out loud, because they are not recoverable. */
    let have = 0;
    try{ have = (await photoAll()).length; }catch(_){}
    if(!confirm(`Restore this backup from ${when}?\n\nIt contains ${n} logged session${n===1?"":"s"}`
      + `${pics.length?` and ${pics.length} photo${pics.length===1?"":"s"}`:""}.\n\n`
      + `This REPLACES everything currently in the app`
      + (have ? `, including the ${have} photo${have===1?"":"s"} on this device` : "")
      + `. Export first if you are not sure.`)) return;
    const key = state.apiKey;                        // never clobber the live key from a file
    Object.keys(state).forEach(k=>{ delete state[k]; });
    Object.assign(state, JSON.parse(JSON.stringify(DEFAULT_STATE)), incoming);
    if(key) state.apiKey = key;
    if(!save()){ toast("⚠ Restored, but couldn't save - storage is full or blocked."); return; }
    try{ await photoClear(); await photoUnpack(pics); }catch(_){}
    location.reload();
  };
  rd.onerror = () => toast("⚠ Couldn't read that file.");
  rd.readAsText(file);
}

/* ---------------------------------------------------------------------
   JOURNAL IMPORT / EXPORT — separate from the whole-app backup on purpose.
   The journal is the part someone might want to keep, print, or hand to a
   physio without also handing over their lab values and medication list.
   --------------------------------------------------------------------- */
const blobToDataURL = b => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
const dataURLToBlob = u => fetch(u).then(r => r.blob());

/* ⚠ Photos live in IndexedDB, NOT in state — so they are invisible to anything that only
   serialises state, and an export that skipped them would be a backup that silently isn't
   one. That is the v105 bug with pictures attached. BOTH exports walk the store through
   these two helpers, so neither can drift away from the other. */
async function photoPack(){
  try{
    return await Promise.all((await photoAll()).map(async p =>
      ({ id:p.id, date:p.date, w:p.w, h:p.h, t:p.t, size:p.size, data: await blobToDataURL(p.blob) })));
  }catch(_){ return []; }    // IndexedDB unavailable => no photos to lose
}
const photoValid = x => x && typeof x.data === "string" && /^data:image\//.test(x.data)
  && typeof x.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date);
/* Keyed on the original id, so re-importing the same backup restores rather than duplicates.
   A photo that fails to land is COUNTED, not swallowed — a backup that half-restores in
   silence is the whole thing worth avoiding here. */
async function photoUnpack(pics){
  let ok = 0, fail = 0;
  for(const x of (pics||[]).filter(photoValid)){
    try{
      const blob = await dataURLToBlob(x.data);
      await photoPut({ id: x.id || (x.date + "-" + Math.random().toString(16).slice(2)), date: x.date,
                       blob, w: x.w||0, h: x.h||0, size: blob.size, t: x.t || Date.now() });
      ok++;
    }catch(_){ fail++; }
  }
  return { ok, fail };
}
const photoTally    = r => r.ok   ? `, ${r.ok} photo${r.ok===1?"":"s"} restored` : "";
const photoFailNote = r => r.fail ? ` ⚠ ${r.fail} photo${r.fail===1?"":"s"} couldn't be restored.` : "";

async function journalPayload(){
  return { _app:"physiopath", _kind:"journal", _version:2, _exported:new Date().toISOString(),
           entries: (state.log||[]).slice(), photos: await photoPack() };
}
async function exportJournalJSON(){
  const btn = $("#jExportJson"), label = btn && btn.textContent;
  if(btn){ btn.disabled = true; btn.textContent = "Packing…"; }   // base64 of 50 photos is not instant
  try{
    const payload = await journalPayload();
    const json = JSON.stringify(payload, null, 2);
    const url = URL.createObjectURL(new Blob([json], {type:"application/json"}));
    const a = document.createElement("a");
    a.href = url; a.download = `physiopath-journal-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    const np = payload.photos.length;
    toast(`Journal exported — ${payload.entries.length} entries${np?` and ${np} photo${np===1?"":"s"}`:""} · ${fmtBytes(json.length)}.`);
  }catch(e){
    console.warn("journal export failed:", e);
    toast("⚠ Couldn't build the export file — your photos may be too large for one file.");
  }finally{ if(btn){ btn.disabled = false; btn.textContent = label; } }
}
/* A diary you can actually read. JSON is for re-importing; this is for keeping. */
async function exportJournalText(){
  const log = (state.log||[]).slice();
  if(!log.length){ toast("Nothing written yet."); return; }
  const conds = selectedConditions().map(c=>c.name).join(", ");
  /* Markdown cannot carry the photos, and a file called "my rehab journal" that quietly
     isn't all of it is how someone wipes a device believing they have a copy. Say it in
     the file, and name the button that does back them up. */
  let np = 0;
  try{ np = (await photoAll()).length; }catch(_){}
  const lines = [
    "# My rehab journal",
    conds ? "\n" + conds : "",
    `\n${log.length} entries · ${fmtDate(log[0].date)} to ${fmtDate(log[log.length-1].date)}`,
    np ? `\n> ⚠ Your ${np} progress photo${np===1?" is":"s are"} NOT in this file — text can't hold images.\n> Use "Export journal (JSON)" to back ${np===1?"it":"them"} up.` : "",
    "\n---\n"
  ];
  for(const e of log){
    const m = moodOf(e.mood);
    lines.push("## " + fmtDate(e.date));
    const meta = [ m ? m.icon + " " + m.label : null,
                   `pain ${e.pain}/10`,
                   `${e.sessions} session${e.sessions===1?"":"s"}`,
                   e.t ? "written " + new Date(e.t).toLocaleString() : null ].filter(Boolean);
    lines.push("_" + meta.join(" · ") + "_\n");
    if(e.note) lines.push(String(e.note).trim() + "\n");
    /* What was prescribed that day and what got done. This is the part a physio reads
       first, and it's the reason the offered list is stored per entry rather than
       reconstructed from whatever the plan happens to say by the time it's exported. */
    if((e.done||[]).length && (e.plan||[]).length){
      lines.push("Exercises: " + e.plan.map(n=>(e.done.includes(n)?"[x] ":"[ ] ") + n).join(", ") + "\n");
    }
    lines.push("---\n");
  }
  const url = URL.createObjectURL(new Blob([lines.join("\n")], {type:"text/markdown"}));
  const a = document.createElement("a");
  a.href = url; a.download = `my-rehab-journal-${todayISO()}.md`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  toast("Diary downloaded — " + log.length + " entries.");
}
function importJournal(file){
  const rd = new FileReader();
  rd.onload = async () => {
    let p;
    try{ p = JSON.parse(rd.result); }catch(e){ toast("⚠ That file isn't valid JSON."); return; }
    const incoming = Array.isArray(p) ? p : (p && (p.entries || (p.state && p.state.log)));
    if(!Array.isArray(incoming)){ toast("⚠ That doesn't look like a PhysioPath journal."); return; }
    const clean = incoming.filter(e => e && typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date));
    const pics = (p && Array.isArray(p.photos) ? p.photos : []).filter(photoValid);
    if(!clean.length && !pics.length){ toast("⚠ No entries found in that file."); return; }
    /* MERGE rather than replace — importing a backup should never be how someone loses the
       entries they've written since. Same-day collisions are the only thing that overwrites,
       and they're counted out loud first. */
    const have = new Map((state.log||[]).map(e=>[e.date, e]));
    let added = 0, updated = 0;
    for(const e of clean){ if(have.has(e.date)) updated++; else added++; }
    if(!confirm(`Import ${clean.length} entries${pics.length?` and ${pics.length} photo${pics.length===1?"":"s"}`:""}?\n\n`
      + `${added} new, ${updated} would replace an entry you already have for that day.\n\nEverything else you've written is kept.`)) return;
    for(const e of clean) have.set(e.date, e);
    state.log = [...have.values()].sort((a,b)=>a.date<b.date?-1:1);
    if(!save()){ toast("⚠ Imported, but couldn't save — storage is full or blocked."); return; }
    const r = await photoUnpack(pics);
    renderProgress(); loadLogDay(($("#logDate")&&$("#logDate").value) || todayISO());
    toast(`Imported — ${added} added, ${updated} updated${photoTally(r)}.${photoFailNote(r)}`);
  };
  rd.onerror = () => toast("⚠ Couldn't read that file.");
  rd.readAsText(file);
}

/* ---------- chat UI ---------- */
/* The bot-message footer + copy button, shared by addMsg and the streaming path so a streamed
   answer ends up identical to a non-streamed one. `text` is the RAW answer (copied verbatim). */
function attachBotExtras(div, text){
  div.innerHTML += `<span class="src">Educational guidance · not a substitute for a clinician</span>`;
  const btn=document.createElement("button"); btn.type="button"; btn.className="msgcopy no-print";
  btn.textContent="⧉ Copy"; btn.setAttribute("aria-label","Copy this answer");
  btn.onclick=()=>{ const p=(navigator.clipboard&&navigator.clipboard.writeText)?navigator.clipboard.writeText(text):Promise.reject();
    p.then(()=>{ btn.textContent="✓ Copied"; setTimeout(()=>{ btn.textContent="⧉ Copy"; },1500); }).catch(()=>toast("Couldn't copy to the clipboard.")); };
  div.appendChild(btn);
}
function addMsg(text, who){
  const div=document.createElement("div"); div.className="msg "+who;
  div.innerHTML=mdLite(text);
  if(who==="bot") attachBotExtras(div, text);
  $("#chatlog").appendChild(div); $("#chatlog").scrollTop=$("#chatlog").scrollHeight;
}
/* Lightweight markdown -> HTML for coach replies. esc() FIRST (so any real HTML in the text
   is inert), then apply markup to the escaped string. Handles the shapes Claude actually emits
   — bold/italic/inline-code, bullet & numbered lists, and #/##/### headings — which the old
   bold/italic-only version rendered as literal `-` / `#` characters (the system prompt asks
   for exactly those). */
function mdInline(s){
  return s.replace(/`([^`]+)`/g,'<code>$1</code>')
          .replace(/\*\*(.+?)\*\*/g,"<b>$1</b>")
          .replace(/\*(.+?)\*/g,"<i>$1</i>");
}
function mdLite(t){
  const lines = esc(t).split("\n");
  let html = "", list = null, buf = [];
  const flush = () => { if(buf.length){ html += `<${list}>`+buf.map(li=>`<li>${mdInline(li)}</li>`).join("")+`</${list}>`; buf=[]; list=null; } };
  for(const line of lines){
    let m;
    if((m = line.match(/^\s*[-*]\s+(.+)$/))){ if(list!=="ul"){ flush(); list="ul"; } buf.push(m[1]); continue; }
    if((m = line.match(/^\s*\d+[.)]\s+(.+)$/))){ if(list!=="ol"){ flush(); list="ol"; } buf.push(m[1]); continue; }
    flush();
    if((m = line.match(/^\s*(#{1,3})\s+(.+)$/))){ html += `<div class="mdh mdh${m[1].length}">${mdInline(m[2])}</div>`; continue; }
    if(line.trim()===""){ html += "<br>"; continue; }
    html += mdInline(line) + "<br>";
  }
  flush();
  return html.replace(/(<br>)+$/,"");
}
const SUGGESTED_BASE = ["Should I use ice or heat?","How much pain is normal?","What's my target heart rate?","What should I avoid with my condition?","When should I see a doctor?","How often should I train?","How many sets and reps?","How do I progress an exercise?","What is DOMS / muscle soreness?","Is pool or water exercise good for me?","How do I return to sport safely?","What should I eat to heal faster?","How do I read my HRV?","How do I prevent flare-ups?","Can I exercise at home with no equipment?"];
/* Suggested chips — condition/feature-aware, so the most relevant ones come first. */
function suggestedQuestions(){
  const s = SUGGESTED_BASE.slice();
  const front = [];
  const conds = selectedConditions();
  const c0 = conds[0];
  if(c0) front.push(`Tell me about ${c0.name.split(/[ (]/)[0].toLowerCase()}`);
  if(activeSpecialPrecautions().length) front.push(`What are my ${activeSpecialPrecautions()[0].label.toLowerCase()}?`);
  if(wbSummary()) front.push("What does my weight-bearing order mean?");
  if(hasCardiacDevice()) front.push("How hard can I exercise with my heart device?");
  if((state.devices||[]).length) front.push("How should I train with my brace / device?");
  if(/tendinop|tendinit|achilles|epicondyl|cuff/i.test((c0&&c0.name)||"")) front.push("How do I load a tendon safely?");
  if((state.returnSports||[]).length) front.push(`How do I get back to ${state.returnSports[0]}?`);
  return [...front, ...s];
}
function initCoach(){
  if((state.medIds||[]).length) ensureMedData();   // MEDMAP drives the prompt's medication lines
  loadData("coach-kb.js");   // ~82KB seed, expands in-browser — only the Coach step needs it
  updateCoachMode();
  renderChatlog();            // rehydrate the thread — this used to wipe it on every visit
  renderSuggests();
  const nb = $("#newChatBtn");
  if(nb) nb.onclick = () => startNewChat(true);
}
/* Greeting is rendered, never recorded: an assistant turn at index 0 would make the very
   first API request invalid. */
function coachIntro(){
  const conds=selectedConditions();
  const intro = conds.length ? `I can see you're working on: **${conds.map(c=>c.name).join(", ")}**. ` : "";
  const mode = coachOnline() ? " (Claude API connected)" : " (offline — add a Claude API key below for richer, tailored answers)";
  return `Hi, I'm Jeffery, your AI rehabilitation specialist${mode}. ${intro}Ask me anything about your recovery, program, exercises, vitals, or medical precautions — or tap a suggestion below.`;
}
function renderChatlog(){
  const box = $("#chatlog"); if(!box) return;
  box.innerHTML = "";
  addMsg(coachIntro(), "bot");
  (state.chatHistory||[]).forEach(t => addMsg(t.content, t.role==="user" ? "user" : "bot"));
  box.scrollTop = box.scrollHeight;
  const nb = $("#newChatBtn");
  if(nb) nb.classList.toggle("hide", !(state.chatHistory||[]).length);
}
function renderSuggests(){
  const sug=$("#suggests"); if(!sug) return;
  sug.innerHTML="";
  suggestedQuestions().forEach(s=>{ const c=document.createElement("div"); c.className="s"; c.textContent=s;
    c.onclick=()=>{ $("#chatInput").value=s; $("#chatform").requestSubmit(); }; sug.appendChild(c); });
}
function startNewChat(ask){
  if(ask && (state.chatHistory||[]).length &&
     !confirm("Start a new chat?\n\nThis clears the conversation on this device. Jeffery keeps your conditions, program and log either way.")) return;
  state.chatHistory = []; save();
  renderChatlog(); renderSuggests();
}

/* =====================================================================
   WIZARD / NAV
===================================================================== */
/* Show the current condition in the header (desktop) so the user always sees which plan
   they're in. Falls back to the generated program if the catalogue isn't loaded yet. */
function updateHeaderContext(){
  const el=$("#hdrContext"); if(!el) return;
  const names=(typeof selectedConditions==="function"?selectedConditions():[]).map(c=>c.name);
  const primary = names[0] || (state.program&&state.program.items&&state.program.items[0]&&state.program.items[0].name) || "";
  el.innerHTML = primary
    ? `<b>${esc(primary)}</b>${names.length>1?` <span class="sep">·</span> +${names.length-1} more`:""}`
    : "";
}
function goStep(n){
  state.step=n; save();
  // Honour reduced-motion for the JS scrolls (the CSS killswitch can't reach a JS `behavior`).
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = reduce ? "auto" : "smooth";
  const panels=$$(".panel");
  panels.forEach((p,i)=>p.classList.toggle("hide", i!==n));
  $$(".step").forEach((s,i)=>{ const on=i===n; s.classList.toggle("active", on); s.classList.toggle("done", i<n);
    if(on) s.setAttribute("aria-current","step"); else s.removeAttribute("aria-current"); });
  const act=document.querySelector(".step.active");        // keep the active step visible in the scrollable nav
  if(act&&act.scrollIntoView) try{ act.scrollIntoView({inline:"center",block:"nearest",behavior}); }catch(e){}
  window.scrollTo({top:0,behavior});
  // Move focus into the newly shown panel: the Next/Back button that triggered this is now
  // display:none, so focus would otherwise fall to <body> — losing keyboard users' place and
  // giving screen-reader users no signal the view changed. Focus the panel heading instead.
  const panel=panels[n];
  if(panel){ const h=panel.querySelector("h2,h3,[data-panel-focus]")||panel;
    try{ h.setAttribute("tabindex","-1"); h.focus({preventScroll:true}); }catch(e){} }
  if(n===0) syncOptSecs();                                   // reflect anything already answered
  if(n===1) initClinician();                                  // Clinician section (now right after History)
  if(n===2) ensureConditions();       // the catalogue is only needed once they go looking
  if(n===3) ensureDetailsData();      // sports/activities only matter from Details on
  if(n===3) ensureProgramData().then(renderPrecautions);      // re-render once the catalogue lands, or the picker is stuck at the 23 curated
  if(n===3) renderPrecautions();                              // Precautions card lives in Details — keep it current
  if(n===4 && state.program){ renderProgram(state.program); renderDriftNote(); }   // Program reflects precaution/detail/clinician + log changes
  if(n===5){                                                 // Journal — the daily return visit
    /* initProgress() ran at BOOT, before they had a condition or ADLs, so the journal prompt
       was computed against an empty state and stuck on the generic line. Refresh on entry —
       this also rolls the date over if the app was left open past midnight. */
    const _d = $("#logDate");
    if(_d){ _d.max = todayISO(); if(!_d.value || _d.value > todayISO()) _d.value = todayISO(); loadLogDay(_d.value); }
    renderProgress(); renderJournalJeffery();
  }
  if(n===6){ renderHealth(); renderDataWarn(); }              // Health & vitals
  if(n===7) initCoach();
  if(n===8) ensureProgramData().then(initLibrary);   // the library IS exercises.js
  updateHeaderContext();
}

/* ---------- cardiac device detail (shown when Pacemaker/ICD is ticked) ---------- */
function cdHintText(){
  const cd=state.cardiacDevice||{};
  if(cd.type==="lvad") return "LVAD: heart rate is unreliable — your plan goes by RPE / talk-test and caps intensity, and removes high-impact and breath-holding work.";
  if(/^(icd|crtd)$/.test(cd.type)){ const cap=deviceHRCeiling();
    return cap ? `We'll keep your target heart rate under ~${cap} bpm — safely below your ICD's ${esc(String(cd.icdRate))} bpm threshold — and cap effort at RPE ≤13.`
               : "Enter your ICD's therapy heart-rate threshold and we'll cap your target zones ~20 bpm below it. Ask your cardiologist for the number."; }
  if(cd.type==="pacemaker"||cd.type==="crtp") return "We'll keep effort light–moderate (RPE ≤13) and respect your device's upper rate limit.";
  return "Choose your device so we can set safe heart-rate and effort limits.";
}
function syncCardiacDevWrap(){
  const wrap=$("#cardiacDevWrap"); if(!wrap) return;
  wrap.classList.toggle("hide", !(state.flags||[]).includes("pacemaker_icd"));
  const t=(state.cardiacDevice||{}).type;
  const rw=$("#cd_rateWrap"); if(rw) rw.classList.toggle("hide", !/^(icd|crtd)$/.test(t));
  const h=$("#cdHint"); if(h) h.textContent=cdHintText();
}
function initCardiacDevice(){
  state.cardiacDevice = state.cardiacDevice || {type:"",icdRate:""};
  const ts=$("#cd_type"), rt=$("#cd_rate");
  if(ts){ ts.value=state.cardiacDevice.type||""; ts.onchange=()=>{ state.cardiacDevice.type=ts.value; save(); syncCardiacDevWrap(); }; }
  if(rt){ rt.value=state.cardiacDevice.icdRate||""; rt.oninput=()=>{ state.cardiacDevice.icdRate=rt.value; save(); const h=$("#cdHint"); if(h) h.textContent=cdHintText(); }; }
  syncCardiacDevWrap();
}

/* ---------- history UI ---------- */
/* ---------- Occupational-therapy Activities of Daily Living (ADLs) ----------
   A searchable check of everyday tasks, each rated by how hard it is to do right
   now. Captured in the History step; feeds the coach context (functional goals). */
const ADL_GROUPS = {
  "Self-care": ["Bathing / showering","Washing your hair","Drying off after a wash","Getting dressed (upper body)","Getting dressed (lower body)","Putting on socks & shoes","Doing up buttons, zips & fasteners","Grooming (hair, shaving, make-up)","Brushing teeth / mouth care","Using the toilet","Managing bladder / bowel control","Feeding yourself / eating","Cutting up food","Nail care","Applying lotion / deodorant"],
  "Moving around": ["Getting in & out of bed","Rolling over in bed","Getting up from a chair","Getting on & off the toilet","Getting in & out of the bath / shower","Getting in & out of a car","Walking indoors","Walking outdoors","Going up stairs","Going down stairs","Getting up from the floor","Bending down to pick something up","Reaching up into a cupboard","Carrying things while walking","Using a wheelchair"],
  "Home & meals": ["Preparing a simple meal / snack","Cooking a full meal","Washing up / dishes","General cleaning & tidying","Vacuuming","Making the bed","Changing the bed sheets","Doing the laundry","Hanging out / folding washing","Ironing","Taking out the rubbish","Gardening / yard work","Home maintenance / DIY"],
  "Out & about": ["Grocery shopping","Carrying shopping bags","Driving","Using public transport","Managing money & bills","Managing your medications","Using the telephone","Using a computer / tablet","Handwriting / signing your name","Attending appointments"],
  "Hands & fine motor": ["Opening jars & bottles","Gripping / holding objects","Picking up small items (coins, pins)","Turning keys & door handles","Opening packaging","Fastening jewellery","Using cutlery (knife & fork)","Typing / using a keyboard"],
  "Work, family & leisure": ["Return-to-work tasks","Lifting at work","Sitting at a desk for long periods","Standing for long periods","Caring for children","Caring for a pet","Caring for another person","Hobbies & crafts","Sport / exercise","Social activities / going out","Sexual activity","Getting a good night's sleep"]
};
// built-in fallback catalogue ({n,c,a}); the generated data/adls.js (window.ADLS,
// ~1,000 OT tasks) is preferred when loaded.
const ADL_CATALOG = Object.entries(ADL_GROUPS).flatMap(([cat,arr])=>arr.map(name=>({ n:name, c:cat, a:inferAdlAreas(name) })));
function adlCatalog(){ return (window.ADLS && window.ADLS.length) ? window.ADLS : ADL_CATALOG; }
let _adlIdx = null;
function adlIndex(){
  const src = adlCatalog();
  if(_adlIdx && _adlIdx.src === src) return _adlIdx;
  _adlIdx = { src, names:src.map(x=>x.n),
    cat:new Map(src.map(x=>[x.n.toLowerCase(), x.c])),
    area:new Map(src.map(x=>[x.n.toLowerCase(), x.a||[]])) };
  return _adlIdx;
}
/* Infer functional areas from an ADL name (for custom/free-text tasks, and the
   built-in fallback). Areas link the ADL to matched functional-practice
   exercises and to the improvement tips. */
function inferAdlAreas(name){
  const s = " " + (name||"").toLowerCase() + " ";
  const areas = [];
  const M = (re, a) => { if(re.test(s)) areas.push(a); };
  M(/stair|\bstep\b|steps|kerb|curb|flight/, "stairs");
  M(/sit-to-stand|chair|sofa|toilet|\bbed\b|transfer|get(ting)? up|stand up|stool|pew|couch|bench/, "transfers");
  M(/car\b|driv|steering|handbrake|gear|seatbelt|blind spot|reverse|park/, "driving");
  M(/overhead|cupboard|shelf|hang|reach up|reaching up|high\b|loft|attic|top of|ceiling|wardrobe/, "reach_high");
  M(/floor|sock|shoe|lace|bend|kneel|low(er)? cupboard|pick .*up|drop|feet|ankle|shin|under the/, "reach_low");
  M(/button|zip|fasten|jewel|coin|thread|sew|knit|crochet|bead|clasp|buckle|press-stud|dexter|small (item|button)|pinch|pick up|puzzle|card|stud|nail|tweez/, "hand_fine");
  M(/jar|bottle|lid|open|grip|hold|turn(ing)? (a|the)? ?(key|tap|knob|handle|dial)|wring|squeeze|carry a|cap|can\b/, "grip");
  M(/dress.*(upper|top)|t-shirt|shirt|jumper|sweat|coat|jacket|bra|blouse|cardigan|tie\b|scarf|collar|cuff|over your head|sleeve/, "dress_upper");
  M(/dress.*(lower)|trouser|sock|shoe|lace|boot|tights|stocking|skirt|underwear|belt/, "dress_lower");
  M(/walk|stroll|distance|community|pavement|corridor|around the|to the (shop|bus|end)/, "walking");
  M(/carry|carrying|bag|basket|load|lift(ing)?|tray|box|shopping bag|suitcase|pram|trolley|bucket/, "carrying");
  M(/balanc|steady|steadi|one leg|uneven|wobbl|dizz|fall|turn(ing)? (around|round)/, "balance");
  M(/bath|shower|wash your (back|feet|hair|leg)|rinse|dry (yourself|off|between)/, "bathing");
  M(/toilet|continence|catheter|stoma|commode|wiping/, "toileting");
  M(/groom|hair|teeth|shav|nail|make-up|makeup|comb|brush your|deodorant|moistur|glasses|earring|lip/, "grooming");
  M(/eat|feed|cutlery|knife|fork|spoon|chopstick|cup|drink|straw|butter|peel|chew|swallow|plate of/, "eating");
  M(/cook|meal|kitchen|kettle|stove|oven|hob|chop|slic|grate|whisk|knead|pan|microwav|recipe|prepar/, "cooking");
  M(/clean|vacuum|dust|tidy|mop|sweep|hoover|scrub|wipe|bin|rubbish|window|housework|garden|lawn|weed|rake|dig|dust/, "housework");
  M(/laundry|washing (machine|line|up)?|iron|fold(ing)?|hang(ing)? (out|the wash)|tumble dryer|peg/, "laundry");
  M(/shop|grocer|trolley|checkout|market|supermarket|queue/, "shopping");
  M(/money|bill|budget|bank|cash|change|medication|dosette|prescription|phone|call|text|email|computer|internet|appointment|remember|plan|concentrat|attention|recipe|manage|organis|schedul/, "cognition");
  M(/sit(ting)?|desk|seated|meeting/, "sitting");
  M(/stand(ing)?|queue|on your feet/, "standing");
  M(/writ|hand-?writ|sign|type|typing|keyboard|pen\b|form\b/, "writing");
  return [...new Set(areas)];
}
function adlAreasOf(name){
  const idx = adlIndex().area.get((name||"").toLowerCase());
  const a = (idx && idx.length) ? idx : inferAdlAreas(name);
  return a && a.length ? a : ["transfers"];   // sensible default so there's always some focus
}
// difficulty rating (0 = independent → 4 = unable). Colour goes green → red.
const ADL_SCALE = [
  { v:0, short:"None",     label:"No difficulty — fully independent",   cls:"a0" },
  { v:1, short:"A little", label:"A little difficulty",                 cls:"a1" },
  { v:2, short:"Moderate", label:"Moderate difficulty",                 cls:"a2" },
  { v:3, short:"A lot",    label:"A lot of difficulty",                 cls:"a3" },
  { v:4, short:"Unable",   label:"Unable / need help from someone",     cls:"a4" }
];
function adlList(){ return (state.adls = state.adls || []); }
function adlCatOf(name){ return adlIndex().cat.get((name||"").toLowerCase()) || "Other"; }
function adlLevelInfo(v){ return ADL_SCALE.find(s=>s.v===v) || ADL_SCALE[2]; }
function adlSegHTML(name, level){
  return ADL_SCALE.map(s=>`<button type="button" class="adlseg ${s.cls}${s.v===level?" on":""}" data-adl="${esc(name)}" data-lvl="${s.v}" aria-pressed="${s.v===level}" title="${esc(s.label)}">${esc(s.short)}</button>`).join("");
}
function renderADLList(){
  if(typeof syncOptSecs==="function") setTimeout(syncOptSecs,0);
  const el=$("#adlList"); if(!el) return;
  const arr=adlList();
  el.innerHTML = arr.map(a=>`<div class="adlrow">
      <div class="adltop"><span class="adlname">${esc(a.name)} <em class="adlcat">${esc(adlCatOf(a.name))}</em></span>
        <span class="adldel no-print" data-adl="${esc(a.name)}" title="Remove">✕</span></div>
      <div class="adlseg-row" role="group" aria-label="Difficulty rating for ${esc(a.name)}">${adlSegHTML(a.name, a.level)}</div>
    </div>`).join("");
  el.querySelectorAll(".adlseg").forEach(b=>b.onclick=()=>adlSetLevel(b.dataset.adl, +b.dataset.lvl));
  el.querySelectorAll(".adldel").forEach(x=>x.onclick=()=>adlRemove(x.dataset.adl));
}
function adlAdd(name){
  name=(name||"").replace(/\s+/g," ").trim(); if(!name) return;
  const arr=adlList();
  if(!arr.some(a=>a.name.toLowerCase()===name.toLowerCase())){ arr.push({ name, level:2 }); save(); }  // default: moderate
  const inp=$("#adlSearch"); if(inp) inp.value="";
  const res=$("#adlResults"); if(res){ res.innerHTML=""; res.classList.add("hide"); }
  renderADLList();
}
function adlRemove(name){ state.adls = adlList().filter(a=>a.name.toLowerCase()!==(name||"").toLowerCase()); save(); renderADLList(); }
function adlSetLevel(name, level){
  const a = adlList().find(a=>a.name.toLowerCase()===(name||"").toLowerCase()); if(!a) return;
  a.level = Math.max(0, Math.min(4, level|0)); save(); renderADLList();
}
function initADLs(){
  const input=$("#adlSearch"), results=$("#adlResults"); if(!input || !results) return;
  let t;
  input.oninput = () => { clearTimeout(t); t=setTimeout(()=>{
    const q=input.value.trim();
    if(!q){ results.innerHTML=""; results.classList.add("hide"); return; }
    const have = new Set(adlList().map(a=>a.name.toLowerCase()));
    const matches = acFilter(adlIndex().names, q, 24).filter(n=>!have.has(n.toLowerCase()));
    const rows = matches.map(n=>`<div class="result acrow" data-v="${esc(n)}"><span class="rn">${esc(n)} <em class="adlcat">${esc(adlCatOf(n))}</em></span><span class="add">+</span></div>`).join("");
    const custom = `<div class="result acrow acadd" data-v="${esc(q)}"><span class="rn">＋ Add “${esc(q)}”</span><span class="add">+</span></div>`;
    results.innerHTML = rows + custom;
    results.classList.remove("hide");
    results.querySelectorAll(".acrow").forEach(r=>r.onclick=()=>adlAdd(r.dataset.v));
    wireListKeys(input, results, ".acrow");
  }, 110); };
  input.onkeydown = (e)=>{ if(e.key==="Enter"){ e.preventDefault(); adlAdd(input.value); } };
  input.onblur = (e)=>{ if(e && e.relatedTarget && results.contains(e.relatedTarget)) return; setTimeout(()=>results.classList.add("hide"), 180); };
  renderADLList();
}
/* Per-area improvement tips: how to build CAPABILITY, ADAPT the task (equipment /
   technique), and build CONFIDENCE & pacing. Shown in the program's ADL card. */
const AREA_META = {
  transfers:{icon:"🪑",label:"Getting up & transfers",cap:"Practise sit-to-stands from progressively lower seats; strengthen your legs with squats and step-ups, and lead 'nose over toes'.",adapt:"Raise the seat (cushion, chair raisers, a raised toilet seat), use armrests or a grab-rail, and bring your feet back under you before you rise.",conf:"Start from a high, firm chair using your hands, then lower the seat and reduce hand use as you get stronger."},
  stairs:{icon:"🪜",label:"Stairs & steps",cap:"Build single-leg strength (step-ups, sit-to-stands, calf raises) and practise one step at a time.",adapt:"Use the handrail, go 'up with the good leg, down with the bad', and add a second rail or a stair-lift if needed.",conf:"Rehearse on a single step first, always near the rail, before tackling a full flight."},
  reach_high:{icon:"🙆",label:"Reaching up",cap:"Improve shoulder range and control (wall slides, band work) and practise steady overhead reaches.",adapt:"Use a reacher/grabber, keep everyday items between waist and shoulder height, and use a stable step-stool with a rail.",conf:"Reach to lower shelves first, then higher, keeping a hand on support."},
  reach_low:{icon:"🧎",label:"Bending & reaching low",cap:"Practise hip-hinging and squatting to the floor and strengthen your hips and legs.",adapt:"Use a long-handled reacher, sock aid and long shoehorn; sit to reach your feet, and raise objects off the floor.",conf:"Hold a chair or counter while bending, then progress to unsupported as balance improves."},
  hand_fine:{icon:"✋",label:"Fine motor & dexterity",cap:"Practise dexterity daily — picking up small objects, buttoning, and in-hand manipulation, with putty/band work.",adapt:"Use built-up handles, a button hook, Velcro fastenings, and a non-slip mat.",conf:"Warm the hands first; start with larger objects and slow reps, then smaller and faster."},
  grip:{icon:"🤛",label:"Grip & opening things",cap:"Build grip and forearm strength (putty, towel wrings, grippers) and practise opening and turning.",adapt:"Use a jar/bottle opener, rubber grips, key and tap turners, and brace the item against your body.",conf:"Start with looser lids and lighter loads, using two hands before one."},
  dress_upper:{icon:"👕",label:"Upper-body dressing",cap:"Improve shoulder reach and practise the over-the-head and hand-behind-back patterns.",adapt:"Dress the stiffer/weaker arm first, choose front-fastening or loose tops, and use a dressing stick.",conf:"Practise seated and unhurried; build up from loose garments to fitted ones."},
  dress_lower:{icon:"🧦",label:"Lower-body dressing",cap:"Work on reaching your feet (hip and knee flexibility) and single-leg balance for standing to dress.",adapt:"Use a sock aid, long shoehorn, elastic laces and a reacher; sit to dress and prop your foot on a step.",conf:"Sit to dress at first; add standing balance near support as you improve."},
  walking:{icon:"🚶",label:"Walking & endurance",cap:"Build walking endurance with intervals — a little further each week — and strengthen your legs.",adapt:"Use the right walking aid and supportive footwear, and plan routes with rests and seats.",conf:"Walk a known safe loop, increasing distance ~10% a week, and carry a phone."},
  carrying:{icon:"🛍️",label:"Carrying & lifting",cap:"Strengthen grip, core and legs; practise carrying gradually heavier loads over short distances.",adapt:"Use a trolley, backpack or wheeled bag, split loads, and keep them close to your body.",conf:"Carry light and short first, then heavier and further as it feels controlled."},
  balance:{icon:"⚖️",label:"Balance & steadiness",cap:"Do daily balance work — feet-together, then tandem, then single-leg near support.",adapt:"Keep a hand near a counter or rail, remove trip hazards, and use good lighting and footwear.",conf:"Always practise beside something solid to hold; reduce the support only when steady."},
  bathing:{icon:"🛁",label:"Bathing & showering",cap:"Practise the transfers and standing tolerance the task needs, and strengthen your legs.",adapt:"Use a shower chair/bath board, non-slip mat, grab-rails, a long-handled sponge and a hand-held shower head.",conf:"Sit to wash at first and have someone nearby until you feel safe."},
  toileting:{icon:"🚽",label:"Toileting",cap:"Build sit-to-stand strength and practise managing lower-body clothing.",adapt:"Use a raised toilet seat, grab-rails or a toilet frame, and keep aids within reach.",conf:"Use the rails every time and rehearse the transfer before you need it in a hurry."},
  grooming:{icon:"🪥",label:"Grooming & hygiene",cap:"Improve standing tolerance and arm endurance for tasks at the sink.",adapt:"Sit at the sink, use long-handled or electric brushes/razors, and lightweight tools.",conf:"Break it into short bouts and rest as needed."},
  eating:{icon:"🍽️",label:"Eating & drinking",cap:"Practise cutlery use, cutting and cup control, with hand and forearm strengthening.",adapt:"Use built-up cutlery, a plate guard, a non-slip mat, and a two-handled or lightweight cup.",conf:"Start with softer foods and larger utensils, and take your time."},
  cooking:{icon:"🍳",label:"Cooking & kitchen",cap:"Build standing tolerance and safe reaching/carrying; practise prep steps seated.",adapt:"Sit to prep, slide pans rather than lift, use a kettle tipper and a one-handed chopping board, and a trolley to move things.",conf:"Cook simple meals first and prepare ingredients in stages with rests."},
  housework:{icon:"🧹",label:"Housework",cap:"Strengthen and pace yourself; practise the bending, reaching and pushing chores need.",adapt:"Use long-handled tools and a lightweight vacuum, and split chores across the week.",conf:"Do one room or task at a time, and sit for the parts you can."},
  laundry:{icon:"🧺",label:"Laundry",cap:"Practise loading/unloading with a hip-hinge and build carrying tolerance.",adapt:"Use a raised basket or trolley, smaller loads, a reacher for the machine, and hang at waist height.",conf:"Carry half-loads with rests, and use a wheeled basket."},
  shopping:{icon:"🛒",label:"Shopping & community",cap:"Build walking endurance and carrying, and plan the route.",adapt:"Use a trolley or wheeled bag, order heavy items online, and shop at quieter times.",conf:"Start with short trips and a list, adding distance gradually."},
  driving:{icon:"🚗",label:"Driving & getting in the car",cap:"Work on neck rotation, trunk mobility and quick foot control — check with your clinician and licensing rules first.",adapt:"Use extra mirrors, a swivel cushion for getting in and out, and steering aids if advised.",conf:"Restart with short, familiar, quiet routes once you're cleared."},
  cognition:{icon:"🧠",label:"Thinking & organising",cap:"Use routines and practice — planning, sequencing and memory tasks, little and often.",adapt:"Use a pill organiser and alarms, a diary or phone reminders, checklists and automatic payments.",conf:"Do one step at a time in a quiet space, building up complexity gradually."},
  sitting:{icon:"💺",label:"Sitting tolerance",cap:"Build sitting tolerance in graded blocks; strengthen your core and improve posture.",adapt:"Use a supportive chair, a lumbar roll and a footrest, and take regular sit-stand micro-breaks.",conf:"Increase sitting time by a few minutes at a time, standing to reset."},
  standing:{icon:"🧍",label:"Standing tolerance",cap:"Build standing tolerance gradually, strengthen your legs and practise weight-shifting.",adapt:"Use a perch stool, an anti-fatigue mat, and something to hold; rest a foot on a low step.",conf:"Add a minute or two at a time, resting before symptoms build."},
  writing:{icon:"✍️",label:"Handwriting & typing",cap:"Practise handwriting and typing in short bouts, with hand and grip strengthening.",adapt:"Use a built-up or weighted pen, a slant board, voice-to-text and a larger keyboard.",conf:"Warm up the hand, write short passages, and rest to avoid cramping."},
  _default:{icon:"🧩",label:"Daily activities",cap:"Break the task into steps and practise the hardest part; strengthen the muscles it needs.",adapt:"Use assistive equipment and easier techniques, and set things up to reduce effort.",conf:"Start supported and reduce help as you improve; pace yourself and celebrate small wins."}
};
/* significant words from an ADL name, used to pick TASK-SPECIFIC practice. */
const ADL_STOP = new Set(["the","a","an","your","you","to","and","of","in","on","with","up","down","from","for","off","out","into","at","or","then","while","that","this","some","one","two","onto","over","under","across","around","yourself","its","get","getting","doing","do","using","use","put","putting","take","taking","make","making","keep"]);
function taskKeywords(name){
  const words = (name||"").toLowerCase().replace(/[^a-z0-9\s-]/g," ").split(/[\s-]+/).filter(Boolean);
  const set = new Set();
  for(const w of words){
    if(ADL_STOP.has(w) || w.length<3) continue;
    set.add(w);
    const stem = w.replace(/(ings?|ies|ed|es|s)$/,"");   // opening→open, bottles→bottle, stairs→stair
    if(stem.length>=3) set.add(stem);
  }
  return [...set];
}
/* How well an exercise NAME rehearses a specific task (keyword overlap). */
function adlTaskScore(exName, kws){
  const n = (exName||"").toLowerCase();
  let s = 0;
  for(const k of kws){ if(n.includes(k)) s += (k.length>=5 ? 2 : 1); }
  return s;
}
/* Pick the most TASK-SPECIFIC functional-practice exercise for an area at ~the
   target tier, filtered by the user's precautions. taskName drives the match so a
   hard "Opening a jar" gets jar-opening practice, not generic dexterity work.
   Deterministic (stable across re-renders). */
function pickAdlExercise(area, tier, flags, exclude, taskName){
  const lib = window.ADL_EXERCISES; if(!lib || !lib.length) return null;
  const exSet = new Set((exclude||[]).map(n=>n.toLowerCase()));
  let cands = lib.filter(e=>e.area===area && !exSet.has(e.n.toLowerCase()));
  if(!cands.length) return null;
  let { kept } = window.applyContra(cands, flags);
  kept = kept.filter(e=>nameAllowed(e.n));
  if(!kept.length) return null;
  const kws = taskKeywords(taskName);
  // task-specificity first, then closeness to the phase tier, then a stable order
  kept.sort((a,b)=>
    (adlTaskScore(b.n,kws) - adlTaskScore(a.n,kws)) ||
    (Math.abs(a.tier-tier) - Math.abs(b.tier-tier)) ||
    (hashStr(a.n+"|"+area) - hashStr(b.n+"|"+area)));
  const e = kept[0];
  return { n:e.n, d:e.d, c:e.c, tags:e.tags||[], pattern:"adl", region:["Daily living (functional)"], adl:true, taskScore:adlTaskScore(e.n,kws) };
}
/* Engine tags for a functional area (sampled from the library) so a synthesised
   task line is still filtered by precautions. */
let _adlAreaTagCache = null;
function adlAreaTags(area){
  if(!_adlAreaTagCache){
    _adlAreaTagCache = new Map();
    (window.ADL_EXERCISES||[]).forEach(e=>{ if(!_adlAreaTagCache.has(e.area)) _adlAreaTagCache.set(e.area, e.tags||[]); });
  }
  return _adlAreaTagCache.get(area) || [];
}
/* Synthesise a graded rehearsal of the ACTUAL task, for hard ADLs with no close
   library match — guarantees the practice is specific to that activity. */
function synthAdlPractice(taskName, tier, area){
  const t = (taskName||"").replace(/^./,c=>c.toLowerCase());
  const stage = tier<=1 ? "with support / the easier parts"
    : tier===2 ? "the harder parts, with less help"
    : tier===3 ? "most of the task, little help"
    : "the whole task, unaided";
  const cue = tier<=1 ? `Break ${t} into steps and rehearse the easiest part — use support or the equipment in the tips above; little and often.`
    : tier===2 ? `Practise the harder parts of ${t}, reducing help as it feels controlled.`
    : tier===3 ? `Do most of ${t} with only a little help; add a bit more each time.`
    : `Practise the whole of ${t} unaided — steady progress is the goal.`;
  const dose = tier<=1 ? "3×3–5" : tier===2 ? "3×5" : "daily practice";
  return { n:`Practise: ${taskName} — ${stage}`, d:dose, c:cue, tags:adlAreaTags(area),
    pattern:"adl", region:["Daily living (functional)"], adl:true, synth:true };
}
/* Whole-program plan of TASK-SPECIFIC practice for the user's HARD ADLs: each
   hard activity gets ONE exercise per phase it's active in — a library exercise
   that rehearses that task when one matches, otherwise a synthesised graded
   rehearsal of the task itself. The harder it's rated the earlier it starts
   (level 4→phase 1 … level 1→phase 4), the tier steps up phase by phase, and
   each practice line is used only once (so successive phases show a progression). */
function adlFocusPlan(flags){
  const plan = [[],[],[],[]];
  /* Return-to activities were collected (10k list) but only ever displayed -
     sports drove drills, activities drove nothing. They are everyday tasks, so run
     them through the ADL area machinery rather than build a parallel system. */
  const acts = (state.returnActivities||[]).map(n=>({ name:n, level:2, fromActivity:true }));
  const diffs = (state.adls||[]).filter(a=>a.level>=1).concat(acts);
  if(!diffs.length || !window.ADL_EXERCISES) return plan;
  const sorted = diffs.slice().sort((a,b)=>b.level-a.level);   // hardest first
  const usedGlobal = new Set();                                 // no repeated practice line across phases
  for(let p=0;p<4;p++){
    const usedArea = new Set();
    for(const adl of sorted){
      if(plan[p].length>=4) break;                              // keep each phase manageable
      const start = Math.max(0, Math.min(3, 4-adl.level));
      if(p < start) continue;
      const tier = Math.max(1, Math.min(4, p-start+1));
      const areas = adlAreasOf(adl.name);
      let placed=false, fallback=null, fallbackArea=null;
      for(const area of areas){
        if(usedArea.has(area)) continue;
        const pick = pickAdlExercise(area, tier, flags, [...usedGlobal], adl.name);
        if(pick && pick.taskScore>=1){                          // a real exercise that rehearses this task
          pick.adlFor=adl.name; plan[p].push(pick); usedGlobal.add(pick.n.toLowerCase()); usedArea.add(area); placed=true; break;
        }
        if(pick && !fallback){ fallback=pick; fallbackArea=area; }
      }
      if(placed) continue;
      // no keyword match → rehearse the actual task (contra-filtered by area tags)
      const area = areas.find(a=>!usedArea.has(a)) || areas[0];
      const synth = synthAdlPractice(adl.name, tier, area);
      const synthOk = window.applyContra([synth], flags).kept.length>0 && nameAllowed(synth.n) && !usedGlobal.has(synth.n.toLowerCase());
      if(synthOk){ synth.adlFor=adl.name; plan[p].push(synth); usedGlobal.add(synth.n.toLowerCase()); usedArea.add(area); }
      else if(fallback){ fallback.adlFor=adl.name; plan[p].push(fallback); usedGlobal.add(fallback.n.toLowerCase()); usedArea.add(fallbackArea); }
    }
  }
  return plan;
}
/* Condition card header: the real rehab timeline this plan follows, and where
   the user currently sits on it. */
function planLineHTML(item){
  const p = item && item.plan; if(!p) return "";
  const w = weeksPostOp();
  const cur = Number(w!=null ? w : state.weeks);
  const months = p.total>=39 ? ` (~${Math.round(p.total/4.35)} months)` : "";
  const at = isFinite(cur)
    ? ` You're around <b>week ${cur}</b>, which puts you in <b>Phase ${item.planPhase+1} of ${item.phases.length}</b>.`
    : "";
  const vs = p.variantList || [];
  const curK = p.variant && p.variant.k;
  /* 13+ chips was overwhelming and buried the one that matters. Show the active
     variation; the rest fold away behind a count. */
  const curV = vs.find(v=>v.k===curK) || vs[0];       // `cur` is already the week number here
  const rest = vs.filter(v=>v.k!==(curV&&curV.k));
  const chip = v => `<button type="button" class="planvar${v.k===curK?" on":""}" data-plan="${esc(p.label)}" data-v="${esc(v.k)}" title="${esc(v.sub||"")}">${esc(v.label)}</button>`;
  const chips = vs.length>1 ? `<div class="planvars no-print">
      <span class="planvarlbl">Which fits you?</span>
      ${curV?chip(curV):""}
      ${rest.length?`<details class="planvarmore"><summary>${rest.length} other option${rest.length===1?"":"s"}</summary>
        <div class="planvarlist">${rest.map(chip).join("")}</div></details>`:""}
    </div>
    ${p.variant&&p.variant.sub?`<div class="planvarsub"><b>${esc(p.variant.label)}</b> — ${esc(p.variant.sub)}</div>`:""}` : "";
  return `<div class="planline">
    <div class="planhead">📋 <b>Following the ${esc(p.label)} timeline — about ${p.total} weeks${months}</b></div>
    <div class="plannote">${esc(p.note)}${at}</div>
    ${chips}
    ${progressReportHTML(item)}
    <div class="planfoot">Phases below use the real week windows for this injury. Progress on the <b>criteria</b>, not the dates — and your surgeon's or therapist's own protocol always comes first.</div>
  </div>`;
}
/* The milestone self-report. The plans insist progression is criteria-driven, so
   let the user say which milestones they've actually met — and tell them plainly
   when they're behind the calendar, which is the common case and not a failure. */
function progressReportHTML(item){
  const p = item && item.plan; if(!p || !item.phases) return "";
  const met = (state.progress||{})[p.label] || [];
  const wp = weekPhaseOf({ ph:item.phases.map(x=>[x.title,x.weekStart,x.weekEnd]) });
  const cp = Math.min(criteriaPhase({ label:p.label }), item.phases.length-1);
  const behind = met.some(Boolean) && wp >= 0 && cp < wp;
  const rows = item.phases.map((ph,i)=>`<label class="progrow${met[i]?" on":""}">
      <input type="checkbox" class="progchk" data-plan="${esc(p.label)}" data-i="${i}"${met[i]?" checked":""} />
      <span><b>Phase ${i+1} done:</b> ${esc(ph.criteria||"")}</span></label>`).join("");
  return `<details class="progrep no-print"${met.some(Boolean)?" open":""}>
    <summary>📝 Where are you actually up to? <span class="progsub">tick what you can already do — this places you honestly</span></summary>
    ${rows}
    ${behind?`<div class="progbehind">You're around <b>week ${Number(weeksPostOp()!=null?weeksPostOp():state.weeks)}</b>, which by the calendar would be <b>phase ${wp+1}</b> — but you haven't met <b>phase ${cp+1}</b>'s criteria yet, so your plan is holding you there. That's the common case, not a failure: the criteria are what protect you.</div>`:""}
    <div class="progfoot">You advance when you meet the criteria <b>and</b> the tissue has had time — whichever is further behind is where you really are.</div>
  </details>`;
}
/* "Why your plan looks like this" — the app makes dozens of decisions from the
   history and never says so, which is exactly what makes a long intake form feel
   pointless. Every line below is read back from what was actually applied. */
function whyThisPlanCard(prog){
  const why = [];
  const it = prog.items[0];
  const add = (because, sowhat) => why.push({ because, sowhat });
  if(it && it.plan){
    add(`Your diagnosis is ${it.name.replace(/\s*\(.*$/,"")}`, `we're following the ${it.plan.label} timeline (about ${it.plan.total} weeks) rather than a generic template`);
    if(it.plan.variant) add(`The variation that fits you: ${it.plan.variant.label}`, it.plan.variant.sub||"this adjusts the length and the milestones");
  }
  const wb = (state.weightBearing||{}).status;
  if(wb) add(`Your weight-bearing order is ${(WB_STATUS[wb]||{}).abbr||wb}`, "exercises that load the limb beyond that have been removed");
  if(state.falls==="2"||(state.aid&&state.aid!=="none")||Number(state.age)>=75)
    add("You've had falls / use a walking aid", "dedicated fall-prevention work was added to every phase");
  if((state.adls||[]).filter(a=>a.level>=1).length)
    add(`${(state.adls||[]).filter(a=>a.level>=1).length} daily activities you find hard`, "task-specific practice for those was woven into the phases");
  if(state.equipment) add(`Equipment: ${({none:"none / bodyweight",bands:"bands + a chair",dumbbells:"some dumbbells",gym:"full gym"})[state.equipment]||state.equipment}`,
    ["none","bands"].includes(state.equipment) ? "exercises are shown as household-object versions" : "you can load and measure precisely");
  if(state.timePerDay) add(`You have ${({lt10:"under 10 min",["10to20"]:"10–20 min",["20to40"]:"20–40 min",gt40:"40+ min"})[state.timePerDay]} a day`, "each phase is sized to fit that, so it's a plan you'll actually finish");
  if(state.smoking==="current") add("You smoke", "the timeline is longer — smoking measurably slows tendon, bone and wound healing");
  if(state.sleep==="lt6") add("You sleep under 6 hours", "hard sessions are kept lighter — short sleep raises pain sensitivity and blunts gains");
  if(state.stress==="high") add("Your stress is high", "we pace rather than push; stress genuinely raises pain sensitivity");
  if(state.alcohol==="heavy") add("Heavy alcohol use", "balance and impact work is flagged to do sober and near support");
  const lf = labFlags();
  if(lf.length) add("Your blood results", "they changed what's safe to prescribe — see the precautions above");
  if((state.returnSports||[]).length) add(`You want to get back to ${state.returnSports[0]}`, "sport-specific drills were added to the later phases");
  if((state.devices||[]).length) add(`${state.devices.length} device(s) you're using`, "exercises those restrict have been removed or flagged");
  if(!why.length) return "";
  return `<div class="card whycard"><h2>🧭 Why your plan looks like this</h2>
    <p class="hint">Your answers weren't just filed away — here's what each one actually changed.</p>
    ${why.map(w=>`<div class="whyrow"><span class="whyb">${esc(w.because)}</span><span class="whyarrow">→</span><span class="whys">${esc(w.sowhat)}</span></div>`).join("")}
    <p class="hint whyfoot">Change any answer and the plan updates — nothing here is fixed.</p></div>`;
}
/* Program card: capability & confidence suggestions for each hard ADL area. */
function adlSuggestionsCard(){
  const diffs=(state.adls||[]).filter(a=>a.level>=1);
  if(!diffs.length) return "";
  const byArea=new Map();
  diffs.forEach(a=>adlAreasOf(a.name).forEach(area=>{
    if(!byArea.has(area)) byArea.set(area,{tasks:new Set(),max:0});
    const g=byArea.get(area); g.tasks.add(a.name); g.max=Math.max(g.max,a.level);
  }));
  const areas=[...byArea.entries()].sort((x,y)=>y[1].max-x[1].max).slice(0,8);
  const blocks=areas.map(([area,g])=>{
    const m=AREA_META[area]||AREA_META._default;
    const tasks=[...g.tasks].slice(0,6).map(esc).join(", ");
    return `<div class="adlsugg">
      <div class="adlsugg-h">${m.icon} <b>${esc(m.label)}</b>${tasks?` <span class="adlsugg-tasks">${tasks}</span>`:""}</div>
      <ul class="adlsugg-tips">
        <li><b>Build capability:</b> ${esc(m.cap)}</li>
        <li><b>Make it easier:</b> ${esc(m.adapt)}</li>
        <li><b>Confidence &amp; pacing:</b> ${esc(m.conf)}</li>
      </ul></div>`;
  }).join("");
  return `<div class="card adlcard"><h2>🧩 Improving your daily activities</h2>
    <p class="hint">From the activities you found hard, here's how to build capability and confidence. Matching <b>🧩 daily-living</b> practice is woven into the phases below — harder tasks start earlier.</p>
    ${blocks}
    <p class="hint adlfoot">Break a hard task into steps, rehearse the tricky part, and reduce help as you improve. An occupational therapist can tailor equipment and techniques to you.</p>
  </div>`;
}
/* The optional sections start closed, but a returning user must never think their
   answers were lost — open anything already filled and show what's in it. */
function syncOptSecs(){
  $$("#panel-0 .optsec").forEach(d => {          // History step only — panel-5 reuses .optsec for the journal
    const sum = d.querySelector("summary");
    const n = Array.from(d.querySelectorAll("input,select,textarea")).filter(el =>
      el.type === "checkbox" ? el.checked : String(el.value||"").trim() !== "").length
      + (d.dataset.opt === "adls"  ? (state.adls||[]).length   : 0)
      + (d.dataset.opt === "meds"  ? (state.medIds||[]).length : 0);
    let pill = sum.querySelector(".optcount");
    if(n){
      if(!pill){ pill = document.createElement("span"); pill.className = "optcount"; sum.appendChild(pill); }
      pill.textContent = n + " added";
      if(!d.dataset.touched) d.open = true;
    } else if(pill) pill.remove();
  });
}
function initOptSecs(){
  $$("#panel-0 .optsec").forEach(d => {          // History step only
    d.addEventListener("toggle", () => { d.dataset.touched = "1"; });
    d.addEventListener("change", syncOptSecs);
    d.addEventListener("input",  syncOptSecs);
  });
  syncOptSecs();
}
function initHistory(){
  const wrap=$("#historyChecks");
  wrap.classList.remove("checks");                       // grouped sub-grids replace the flat grid
  wrap.innerHTML = HIST_GROUPS.map(g=>{
    const items = HISTORY_ITEMS.filter(it=>it.group===g.key);
    if(!items.length) return "";
    return `<div class="histgroup"><div class="histgrouplab">${g.icon} ${esc(g.label)}</div>
      <div class="checks">${items.map(it=>{ const on=state.flags.includes(it.flag);
        /* role=checkbox + tabindex + aria-checked: this is the contraindication list,
           and a keyboard user who cannot tick "Pacemaker or ICD" gets prescribed as if
           they do not have one. Kept as a div so the existing .check styling holds. */
        return `<div class="check${on?" on":""}" data-flag="${it.flag}" role="checkbox" tabindex="0" aria-checked="${on}"><span class="box" aria-hidden="true">${on?"✓":""}</span><span>${esc(it.label)}</span></div>`;
      }).join("")}</div></div>`;
  }).join("");
  wrap.querySelectorAll(".check").forEach(d=>{
    const toggle=()=>{
      d.classList.toggle("on"); const active=d.classList.contains("on");
      d.querySelector(".box").textContent=active?"✓":"";
      d.setAttribute("aria-checked", String(active));
      const flag=d.dataset.flag;
      if(active) state.flags.push(flag); else state.flags=state.flags.filter(f=>f!==flag); save();
      if(flag==="pacemaker_icd") syncCardiacDevWrap();
    };
    d.onclick=toggle;
    d.onkeydown=e=>{ if(e.key===" "||e.key==="Enter"||e.key==="Spacebar"){ e.preventDefault(); toggle(); } };
  });
  initCardiacDevice();
  $("#q_age").value=state.age; $("#q_sex").value=state.sex; $("#q_meds").value=state.meds; $("#q_notes").value=state.notes;
  $("#parq_pain").checked=state.parq.pain; $("#parq_faint").checked=state.parq.faint; $("#parq_doc").checked=state.parq.doc;
  $("#q_age").oninput=e=>{state.age=e.target.value;save();updateVitalsReadout();};
  /* Age now selects the exercises, so it has to rebuild the plan like any other precaution.
     On CHANGE, not input: typing "15" passes through "1", and regenerating per keystroke
     would briefly hand a teenager an infant's program. */
  $("#q_age").onchange=()=>{ if(state.program){ state.program=generateProgram(); save();
    if(state.step===4) renderProgram(state.program); toast("Age updated — your exercises were rematched to it."); } };
  $("#q_sex").oninput=e=>{ state.sex=e.target.value; save(); syncPregWrap(); };   // set THEN gate, not two racing handlers
  $("#q_meds").oninput=e=>{state.meds=e.target.value;save();};
  $("#q_notes").oninput=e=>{state.notes=e.target.value;save();};
  $("#parq_pain").onchange=e=>{state.parq.pain=e.target.checked;save();};
  $("#parq_faint").onchange=e=>{state.parq.faint=e.target.checked;save();};
  $("#parq_doc").onchange=e=>{state.parq.doc=e.target.checked;save();};
  // vital signs & measurements
  state.vitals = state.vitals || {restHR:"",sbp:"",dbp:"",spo2:"",rr:"",height:"",weight:""};
  const VITAL_IDS = {v_restHR:"restHR",v_sbp:"sbp",v_dbp:"dbp",v_spo2:"spo2",v_rr:"rr",v_height:"height",v_weight:"weight"};
  Object.entries(VITAL_IDS).forEach(([id,key])=>{ const inp=$("#"+id); if(!inp) return;
    inp.value = state.vitals[key]||"";
    inp.oninput=e=>{ state.vitals[key]=e.target.value; save(); updateVitalsReadout(); }; });
  updateVitalsReadout();
  // symptom / red-flag screen
  state.screen = state.screen || {};
  $$('[data-screen]').forEach(cb=>{ const k=cb.dataset.screen;
    cb.checked = !!state.screen[k];
    cb.onchange=()=>{ state.screen[k]=cb.checked; save(); updateScreenWarn(); }; });
  updateScreenWarn();
  // lifestyle & daily function
  const LIFE_IDS = {q_smoking:"smoking",q_alcohol:"alcohol",q_sleep:"sleep",q_stress:"stress",q_falls:"falls",q_aid:"aid",q_waterConf:"waterConfidence",
    q_equipment:"equipment",q_timePerDay:"timePerDay",q_workDemand:"workDemand",q_priorEpisodes:"priorEpisodes",
    q_moveConfidence:"moveConfidence",q_pregStage:"pregStage",q_footSensation:"footSensation"};
  syncPregWrap();
  Object.entries(LIFE_IDS).forEach(([id,key])=>{ const el=$("#"+id); if(!el) return;
    el.value = state[key]||"";
    el.onchange=e=>{ state[key]=e.target.value;
      // no gym → adapt every exercise to household objects (render-time, reversible)
      if(key==="equipment"){ if(["none","bands"].includes(e.target.value)) state.homeMode = true;
                             else if(e.target.value==="gym") state.homeMode = false; }
      save(); }; });
  initADLs();   // occupational-therapy activities-of-daily-living check
  syncPregWrap();   // last: needs the condition checklist rendered above to find .check[data-flag=pregnancy]
}
/* `sex` is asked "for pregnancy-related guidance" - so it gates that guidance rather than
   being collected and ignored. Both surfaces are gated together: the "Pregnant or recently
   postpartum" tick in the condition checklist and the pregnancy-stage select. Showing only
   one of them would leave the flag reachable while the stage that drives the actual rules
   (supine/valsalva avoidance from t2 on) was hidden.
   Answers are CLEARED when the gate closes, so a stale pregnancy flag can't survive a change
   of answer and keep reshaping the program invisibly. */
function pregApplies(){ return state.sex === "Female"; }
/* Pregnancy drives real contraindication rules (supine/valsalva/prone/inversion avoidance from
   the 2nd trimester). The questions are gated on Female and the Sex field defaults to "Prefer
   not to say", so the gate has to announce itself — otherwise the questions are simply missing
   and the user has no way to know that answering Sex is what brings them back. */
function syncSexHint(){
  const el = $("#sexHint"); if(!el) return;
  el.textContent = pregApplies()
    ? "Pregnancy questions added below — your program will respect pregnancy precautions."
    : "Choosing Female adds the pregnancy questions, so your program can respect pregnancy precautions.";
  el.classList.toggle("on", pregApplies());
}
function syncPregWrap(){
  const show = pregApplies();
  let changed = false;
  syncSexHint();

  const el = $("#q_pregStage");
  if(el){
    const wrap = el.closest(".subfield") || el;
    wrap.classList.toggle("hide", !show);
    if(!show && state.pregStage){ state.pregStage = ""; el.value = ""; changed = true; }
  }

  const box = document.querySelector('.check[data-flag="pregnancy"]');
  if(box){
    box.classList.toggle("hide", !show);
    if(!show && (state.flags||[]).includes("pregnancy")){
      state.flags = state.flags.filter(f => f !== "pregnancy");
      box.classList.remove("on");
      box.setAttribute("aria-checked", "false");
      const mark = box.querySelector(".box"); if(mark) mark.textContent = "";
      changed = true;
    }
  }
  if(changed) save();
}
/* Urgent / clearance note shown live under the red-flag screen. */
function updateScreenWarn(){
  const el=$("#screenWarn"); if(!el) return;
  const sc=state.screen||{};
  if(sc.cauda){ el.className="screenwarn urgent";
    el.innerHTML=`⛔ <b>Seek urgent medical care now.</b> Loss of bladder/bowel control or numbness around the groin/saddle can be a medical emergency (cauda equina) — do not exercise until you've been assessed.`; return; }
  if(Object.values(sc).some(Boolean)){ el.className="screenwarn";
    el.innerHTML=`⚠ Because you flagged a warning symptom, your program will advise <b>getting assessed by a clinician before starting</b>.`; return; }
  el.className="screenwarn"; el.innerHTML="";
}
/* Live readout under the vitals inputs: max HR, target zone, BMI, out-of-range warnings + Borg scale. */
function updateVitalsReadout(){
  const el=$("#vitalsReadout"); if(!el) return;
  const hz=hrZones(), v=state.vitals||{}, bmi=bmiCalc(v.height,v.weight), bits=[];
  if(hz) bits.push(`Max HR ≈ <b>${hz.hrmax} bpm</b> · moderate zone <b>${fmtRange(hz.zones.moderate)} bpm</b>`);
  else bits.push(`<span class="muted">Enter your <b>age</b> above to calculate max heart rate &amp; target zones.</span>`);
  if(bmi!=null) bits.push(`BMI <b>${bmi}</b> (${bmiCategory(bmi)})`);
  const vf=vitalFlags();
  const warn = vf.length ? `<div class="vwarn">⚠ ${esc(window.notesForFlags(vf)[0]||"Some readings are outside typical ranges — your plan will adjust.")}</div>` : "";
  el.innerHTML = `<div class="vreadline">${bits.join(" · ")}</div>${warn}
    <details class="borgdetails"><summary>Show the Borg RPE (perceived-exertion) scale</summary>${borgScaleHTML(borgTarget())}</details>`;
}

/* ---------- condition search UI ---------- */
function renderSelected(){
  const wrap=$("#selectedConds"); const conds=selectedConditions();
  wrap.innerHTML = conds.map(c=>`<span class="selchip"><span class="sup ${c.supervision}">${c.supervision}</span>${esc(c.name)}
    <span class="x" data-id="${c.id}">✕</span></span>`).join("");
  $$("#selectedConds .x").forEach(x=>x.onclick=()=>{ state.condIds=state.condIds.filter(i=>i!==x.dataset.id); save(); renderSelected(); runSearch(); });
  $("#toDetails").disabled = conds.length===0;
  updateHeaderContext();
}
function runSearch(){
  if(!window.CONDITIONS){                       // catalogue still in flight
    const r = $("#condResults");
    if(r) r.innerHTML = `<div class="moreinfo">Loading the condition catalogue…</div>`;
    ensureConditions().then(runSearch);
    return;
  }
  const q=$("#condSearch").value.trim().toLowerCase();
  const toks=q.split(/\s+/).filter(Boolean);
  let list=window.CONDITIONS;
  if(domainFilter==="pediatric") list=list.filter(isPediatric);
  else if(domainFilter!=="all") list=list.filter(c=>c.domain===domainFilter);
  if(toks.length) list=list.filter(c=>{ const hay=c._hay||(c._hay=(c.name+" "+c.region+" "+(c.synonyms||[]).join(" ")).toLowerCase());
    return toks.every(t=>hay.includes(t)); });
  const total=list.length; list=list.slice(0,60);
  const dotColor={msk:"var(--msk)",neuro:"var(--neuro)",cardiac:"var(--cardiac)",pulmonary:"var(--pulm)"};
  const res=$("#condResults");
  if(!list.length){ res.innerHTML=`<div class="moreinfo">No matches. Try a simpler term, or a different spelling.</div>`; return; }
  res.innerHTML = list.map(c=>{ const picked=state.condIds.includes(c.id);
    return `<div class="resitem">
      <div class="result ${picked?"picked":""}" data-id="${c.id}" role="option" tabindex="0" aria-selected="${picked}">
        <span class="dot" style="background:${dotColor[c.domain]}" aria-hidden="true"></span>
        <span class="rn">${esc(c.name)}<div class="rr">${esc(c.region)} · ${DOMAIN_NAME[c.domain]}</div></span>
        <button type="button" class="info" data-info="${c.id}" title="What is this?" aria-label="What is ${esc(c.name)}?">ⓘ</button>
        <span class="add" aria-hidden="true">${picked?"✓":"+"}</span>
      </div>
      <div class="resexp hide" id="exp-${c.id}"></div>
    </div>`; }).join("") +
    (total>60?`<div class="moreinfo">Showing 60 of ${total} matches — refine your search to narrow it down.</div>`:"");
  const pickCond=id=>{
    if(state.condIds.includes(id)) state.condIds=state.condIds.filter(i=>i!==id);
    else state.condIds.push(id);
    save(); renderSelected();
    const q=$("#condSearch"); runSearch();
    if(q) q.focus();                                  // keep the keyboard user where they were
  };
  $$("#condResults .result").forEach(r=>{
    r.onclick=e=>{ if(e.target.closest(".info")) return; pickCond(r.dataset.id); };
    r.onkeydown=e=>{
      if(e.key==="Enter"||e.key===" "||e.key==="Spacebar"){ e.preventDefault(); pickCond(r.dataset.id); return; }
      /* Arrow through the list, and Up from the first row returns to the search box. */
      if(e.key==="ArrowDown"||e.key==="ArrowUp"){
        e.preventDefault();
        const rows=$$("#condResults .result"); const i=rows.indexOf(r);
        const nxt = e.key==="ArrowDown" ? rows[i+1] : (i===0 ? $("#condSearch") : rows[i-1]);
        if(nxt) nxt.focus();
      }
    };
  });
  $$("#condResults .info").forEach(ic=>ic.onclick=e=>{ e.stopPropagation();
    const id=ic.dataset.info, exp=document.getElementById("exp-"+id);
    if(!exp.dataset.filled){ exp.textContent=conditionExplain(CONMAP.get(id)); exp.dataset.filled="1"; }
    exp.classList.toggle("hide"); });
}
function initSearch(){
  window.CONDITIONS.forEach(c=>CONMAP.set(c.id,c));
  $("#catCount").textContent=window.CONDITIONS.length;
  let t; const cs=$("#condSearch");
  cs.oninput=()=>{ clearTimeout(t); t=setTimeout(runSearch,120); };
  /* Enter picked nothing and ArrowDown went nowhere: the input was a dead end for anyone
     not using a mouse, and selecting a condition is mandatory to generate a program. */
  cs.onkeydown=e=>{
    if(e.key==="Enter"){ e.preventDefault(); const f=$("#condResults .result"); if(f) f.click(); }
    if(e.key==="ArrowDown"){ e.preventDefault(); const f=$("#condResults .result"); if(f) f.focus(); }
  };
  $$("#domainFilters .fchip").forEach(f=>f.onclick=()=>{ domainFilter=f.dataset.d;
    $$("#domainFilters .fchip").forEach(x=>x.classList.toggle("on",x===f)); runSearch(); });
  renderSelected(); runSearch();
}

/* ---------- medication search UI ---------- */
function renderSelectedMeds(){
  if(typeof syncOptSecs==="function") setTimeout(syncOptSecs,0);
  const wrap=$("#selectedMeds"); if(!wrap) return;
  const meds=selectedMeds();
  state.medDoses = state.medDoses || {};
  wrap.innerHTML = meds.map(m=>`<div class="medselrow" data-id="${m.id}">
      <div class="medselname">${esc(m.name)}${m.cls?` <span class="medselcls">${esc(m.cls)}</span>`:""}</div>
      <input type="text" class="medseldose" data-id="${m.id}" value="${esc(state.medDoses[m.id]||"")}" placeholder="dose &amp; frequency — e.g. 20 mg twice daily" />
      <button class="medselx" data-id="${m.id}" title="Remove" aria-label="Remove">✕</button>
    </div>`).join("");
  $$("#selectedMeds .medselx").forEach(x=>x.onclick=()=>{ const id=x.dataset.id; state.medIds=state.medIds.filter(i=>i!==id); if(state.medDoses) delete state.medDoses[id]; save(); renderSelectedMeds(); runMedSearch(); });
  $$("#selectedMeds .medseldose").forEach(inp=>inp.oninput=()=>{ (state.medDoses=state.medDoses||{})[inp.dataset.id]=inp.value; save(); });
}
/* Make a rendered result list keyboard-navigable — the same listbox pattern the condition
   search uses, factored out so meds / surgery / activity / sport / ADL get it too (they were
   mouse-only; meds & surgery had NO keyboard path at all). Rows become focusable options:
   ArrowDown from the input enters the list, arrows move between options, Enter/Space activates
   via the row's EXISTING click handler (so no select logic changes), Escape returns to the
   input. Also stamps combobox semantics on the input. Idempotent — call after every render. */
function wireListKeys(input, results, rowSel){
  if(!input || !results) return;
  const rows = Array.from(results.querySelectorAll(rowSel));
  rows.forEach((r,i)=>{
    r.setAttribute("role","option");
    if(!r.hasAttribute("tabindex")) r.tabIndex = 0;
    r.onkeydown = e=>{
      if(e.key==="ArrowDown" || e.key==="ArrowUp"){
        e.preventDefault();
        const nxt = e.key==="ArrowDown" ? rows[i+1] : (i===0 ? input : rows[i-1]);
        if(nxt) nxt.focus();
      } else if(e.key==="Enter" || e.key===" "){
        e.preventDefault(); r.click();
      } else if(e.key==="Escape"){
        e.preventDefault(); input.focus();
      }
    };
  });
  input.setAttribute("role","combobox");
  input.setAttribute("aria-autocomplete","list");
  if(results.id) input.setAttribute("aria-controls", results.id);
  input.setAttribute("aria-expanded", rows.length ? "true" : "false");
  if(!input._listKeysWired){
    input._listKeysWired = true;
    input.addEventListener("keydown", e=>{
      if(e.key==="ArrowDown"){ const first=results.querySelector(rowSel); if(first){ e.preventDefault(); first.focus(); } }
    });
  }
}
function runMedSearch(){
  const res=$("#medResults"); if(!res || !window.MEDICATIONS) return;
  const q=$("#medSearch").value.trim().toLowerCase(); const toks=q.split(/\s+/).filter(Boolean);
  if(!toks.length){ res.innerHTML=""; res.classList.add("hide"); return; }
  res.classList.remove("hide");
  let list=window.MEDICATIONS.filter(m=>{ const hay=m._hay||(m._hay=(m.name+" "+m.generic+" "+m.cls).toLowerCase()); return toks.every(t=>hay.includes(t)); });
  const total=list.length; list=list.slice(0,40);
  if(!list.length){ res.innerHTML=`<div class="moreinfo">No matches — try the generic or brand name.</div>`; return; }
  res.innerHTML = list.map(m=>{ const picked=state.medIds.includes(m.id);
    return `<div class="result ${picked?"picked":""}" data-id="${m.id}">
      <span class="rn">${esc(m.name)}<div class="rr">${esc(m.cls)}${m.brand?` · generic: ${esc(m.generic)}`:""}</div></span>
      <span class="add">${picked?"✓":"+"}</span></div>`; }).join("") +
    (total>40?`<div class="moreinfo">Showing 40 of ${total} — keep typing to narrow.</div>`:"");
  $$("#medResults .result").forEach(r=>r.onclick=()=>{ const id=r.dataset.id;
    if(state.medIds.includes(id)) state.medIds=state.medIds.filter(i=>i!==id); else state.medIds.push(id);
    save(); renderSelectedMeds(); runMedSearch(); });
  wireListKeys($("#medSearch"), res, ".result");
}
function initMeds(){
  if(window.MEDICATIONS) window.MEDICATIONS.forEach(m=>MEDMAP.set(m.id,m));
  // 3.5MB — fetched on first contact with the medication search, or on load if the
  // user already has meds saved (their chips can't resolve without the map).
  const _ms = $("#medSearch");
  if(_ms) _ms.addEventListener("focus", ensureMedData, { once:true });
  if((state.medIds||[]).length) ensureMedData();
  const inp=$("#medSearch"); if(!inp) return;
  let t; inp.oninput=()=>{ clearTimeout(t); t=setTimeout(runMedSearch,120); };
  renderSelectedMeds();
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
  // surgery picker — searchable (3000+ procedures)
  $("#surgeryDate").value=state.surgeryDate||"";
  if($("#surgCount")) $("#surgCount").textContent = surgeries().length.toLocaleString();
  renderSurgeryPick();
  let sgt; const ss=$("#surgerySearch"); if(ss) ss.oninput=()=>{ clearTimeout(sgt); sgt=setTimeout(runSurgerySearch,120); };
  toggleSurgeryExtra(); updatePostopLabel();
  w.oninput=()=>{ state.weeks=w.value===""?null:parseInt(w.value); updateAcuteLabel(); save(); };
  $("#painLevel").oninput=e=>{ state.painRest=+e.target.value; $("#painVal").textContent=e.target.value; save(); };
  $("#painMove").oninput=e=>{ state.painMove=+e.target.value; $("#painMoveVal").textContent=e.target.value; save(); };
  $("#surgery").oninput=e=>{ state.surgery=e.target.value; toggleSurgeryExtra(); save(); };
  $("#surgeryDate").oninput=e=>{ state.surgeryDate=e.target.value; updatePostopLabel(); save(); };
  $("#fitness").oninput=e=>{ state.fitness=e.target.value; save(); };
  $("#goal").oninput=e=>{ state.goal=e.target.value; save(); };
  // The return-to activity & sport pickers are wired by ensureDetailsData() once their datasets
  // land (goStep(3)) — wiring them here would capture an undefined `data` and be overwritten anyway.
  renderPrecautions();   // Precautions & reminders card (weight-bearing, braces, sternal/abdominal, custom)
}
/* ---- reusable auto-populate (typeahead + multi-add chips) ---- */
function acFilter(data, q, limit){
  if(!data || !data.length) return [];
  const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
  if(!toks.length) return [];
  const res = [];
  for(let i=0;i<data.length && res.length<limit;i++){
    const l = data[i].toLowerCase();
    if(toks.every(t=>l.includes(t))) res.push(data[i]);
  }
  return res;
}
function setupAutocomplete(inputId, resultsId, chipsId, data, stateKey, opts){
  opts = opts || {};
  const input=$("#"+inputId), results=$("#"+resultsId), chips=$("#"+chipsId);
  if(!input || !results || !chips) return;
  const list = () => (state[stateKey] = state[stateKey] || []);
  const draw = () => {
    chips.innerHTML = list().map((v,i)=>`<span class="selchip">${esc(v)} <button type="button" class="x" data-i="${i}" aria-label="Remove ${esc(v)}">✕</button></span>`).join("");
    chips.querySelectorAll(".x").forEach(x=>x.onclick=()=>{ list().splice(+x.dataset.i,1); save(); if(opts.onChange) opts.onChange(); draw(); });
  };
  const add = (val) => {
    val=(val||"").replace(/\s+/g," ").trim(); if(!val) return;
    const arr=list();
    if(!arr.some(v=>v.toLowerCase()===val.toLowerCase())){ arr.push(val); save(); if(opts.onChange) opts.onChange(); }
    input.value=""; results.innerHTML=""; results.classList.add("hide"); draw();
  };
  let t;
  input.oninput = () => { clearTimeout(t); t=setTimeout(()=>{
    const q=input.value.trim();
    if(!q){ results.innerHTML=""; results.classList.add("hide"); return; }
    const matches = acFilter(data, q, 30);
    const rows = matches.map(m=>`<div class="result acrow" data-v="${esc(m)}"><span class="rn">${esc(m)}</span><span class="add">+</span></div>`).join("");
    const custom = `<div class="result acrow acadd" data-v="${esc(q)}"><span class="rn">＋ Add “${esc(q)}”</span><span class="add">+</span></div>`;
    results.innerHTML = rows + custom;
    results.classList.remove("hide");
    results.querySelectorAll(".acrow").forEach(r=>r.onclick=()=>add(r.dataset.v));
    wireListKeys(input, results, ".acrow");
  }, 110); };
  input.onkeydown = (e)=>{ if(e.key==="Enter"){ e.preventDefault(); add(input.value); } };
  input.onblur = (e)=>{ if(e && e.relatedTarget && results.contains(e.relatedTarget)) return; setTimeout(()=>results.classList.add("hide"), 180); };
  draw();
}
function toggleSurgeryExtra(){
  const show = state.surgery==="yes" || !!detectSurgery();
  $("#surgeryExtra").classList.toggle("hide", !show);
}
function updatePostopLabel(){
  const el=$("#postopLabel"); if(!el) return;
  if(!state.surgeryDate){ el.innerHTML=""; return; }
  const w=weeksPostOp();
  el.innerHTML = w==null ? "" : (w>0 ? `→ about <b>${w} week${w===1?"":"s"}</b> post-op` : `→ <b>under a week</b> post-op`);
}
/* Searchable surgery picker (auto-detect / 3000+ procedures / other). */
function setSurgery(id){
  state.surgeryType=id;
  const ss=$("#surgerySearch"); if(ss) ss.value="";
  const res=$("#surgeryResults"); if(res){ res.innerHTML=""; res.classList.add("hide"); }
  save(); renderSurgeryPick(); toggleSurgeryExtra(); updatePostopLabel();
}
function renderSurgeryPick(){
  const el=$("#surgeryPick"); if(!el) return;
  const st=state.surgeryType||"auto";
  let label;
  if(st==="other") label=`Selected: <b>Other / not listed</b> — general post-op precautions`;
  else if(st!=="auto"){ const s=surgeries().find(x=>x.id===st); label = s?`Selected: <b>${esc(s.name)}</b>`:`<b>Auto-detect</b> from your condition`; }
  else { const d=detectSurgery(); label = d?`Auto-detected: <b>${esc(d.name)}</b>`:`<b>Auto-detect</b> from your condition (none matched yet)`; }
  const reset = st!=="auto" ? `<button type="button" class="surgreset" id="surgReset">↺ auto-detect</button>` : "";
  const otherBtn = st!=="other" ? `<button type="button" class="surgreset" id="surgOther">＋ Other / not listed</button>` : "";
  el.innerHTML=`<span>${label}</span>${reset}${otherBtn}`;
  const rb=$("#surgReset"); if(rb) rb.onclick=()=>setSurgery("auto");
  const ob=$("#surgOther"); if(ob) ob.onclick=()=>setSurgery("other");
}
function runSurgerySearch(){
  const res=$("#surgeryResults"); if(!res) return;
  const q=$("#surgerySearch").value.trim().toLowerCase(); const toks=q.split(/\s+/).filter(Boolean);
  if(!toks.length){ res.innerHTML=""; res.classList.add("hide"); return; }
  res.classList.remove("hide");
  let list=surgeries().filter(s=>{ const hay=s._hay||(s._hay=(s.name+" "+(s.region||"")+" "+(s.cat||"")).toLowerCase()); return toks.every(t=>hay.includes(t)); });
  const total=list.length; list=list.slice(0,40);
  const otherRow=`<div class="result" data-id="other"><span class="rn">Other / not listed<div class="rr">general post-op precautions</div></span><span class="add">+</span></div>`;
  if(!list.length){ res.innerHTML=`<div class="moreinfo">No matches — try a simpler term.</div>`+otherRow; }
  else res.innerHTML = list.map(s=>{ const picked=state.surgeryType===s.id;
    return `<div class="result ${picked?"picked":""}" data-id="${s.id}"><span class="rn">${esc(s.name)}<div class="rr">${esc(s.region||s.cat||"surgery")}</div></span><span class="add">${picked?"✓":"+"}</span></div>`; }).join("")
    + (total>40?`<div class="moreinfo">Showing 40 of ${total} — keep typing to narrow.</div>`:"") + otherRow;
  $$("#surgeryResults .result").forEach(r=>r.onclick=()=>setSurgery(r.dataset.id));
  wireListKeys($("#surgerySearch"), $("#surgeryResults"), ".result");
}

async function doGenerate(){
  /* Belt and braces: goStep(3) pulls this in, but Generate is reachable from a restored
     session and a half-loaded program is worse than a slow one. On a first run / slow network
     ensureProgramData() pulls ~15MB, so the button gets a busy state instead of looking dead. */
  const btn=$("#generateBtn"); const label=btn?btn.textContent:"";
  if(btn){ btn.disabled=true; btn.setAttribute("aria-busy","true"); btn.textContent="Building your program…"; }
  try{
    await ensureProgramData();
    if(!state.condIds.length){ toast("Pick at least one injury or condition first."); goStep(2); return; }
    if(state.weeks===null){ toast("Enter how many weeks ago it started."); return; }
    state.program=generateProgram(); save();
    renderProgram(state.program); goStep(4);
  } finally {
    if(btn){ btn.disabled=false; btn.removeAttribute("aria-busy"); btn.textContent=label; }
  }
}
/* Panels only render when they are visited, so printing from the Program step emitted
   "No entries yet - log your first session above." over a month of real logs, plus an empty
   vitals log, empty labs and an empty library. Render the record before the dialog opens. */
function preparePrint(){
  try{
    if(state.program){ renderProgram(state.program); renderDriftNote(); }
    if(typeof renderProgress==="function") renderProgress();
    if(typeof renderHealth==="function") renderHealth();
  }catch(e){ console.warn("print prep failed:", e); }
}
function doReset(){
  /* This is the only copy of their history and there is no undo. Point at the backup. */
  const n = (state.log||[]).length;
  const has = n || (state.condIds||[]).length || (state.vitalsLog||[]).length;
  if(!confirm(has
    ? `Clear everything and start over?

This permanently deletes your history${n?` — including ${n} logged session${n===1?"":"s"}`:""}, and it CANNOT be undone.

If you might want any of it later, press Cancel and use "Download a backup" on the Progress step first.`
    : "Clear everything and start over?")) return;
  localStorage.removeItem("physiopath");
  location.reload();
}
function toast(msg, action){
  const t=document.createElement("div"); t.className="toast"; t.textContent=msg;
  if(action && action.label && typeof action.fn==="function"){
    const b=document.createElement("button"); b.type="button"; b.className="toastbtn"; b.textContent=action.label;
    b.onclick=()=>{ t.remove(); try{ action.fn(); }catch(_){} };
    t.appendChild(b); document.body.appendChild(t);
    setTimeout(()=>{ if(t.isConnected) t.remove(); }, 6000);   // a longer window when there's something to undo
  } else {
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 2600);
  }
}

/* ---- service worker + update-available flow ---- */
function showUpdateToast(reg){
  if(document.querySelector(".toast-update")) return;
  const t=document.createElement("div"); t.className="toast toast-update";
  t.innerHTML="✨ A new version is available. <button class='btn primary updbtn'>Refresh</button>";
  document.body.appendChild(t);
  t.querySelector(".updbtn").onclick=()=>{ if(reg.waiting) reg.waiting.postMessage({type:"SKIP_WAITING"}); t.remove(); };
  setTimeout(()=>{ if(t.isConnected) t.remove(); }, 15000);
}
if("serviceWorker" in navigator){
  window.addEventListener("load", async ()=>{
    try{
      const reg=await navigator.serviceWorker.register("sw.js");
      if(reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg);
      reg.addEventListener("updatefound", ()=>{
        const nw=reg.installing; if(!nw) return;
        nw.addEventListener("statechange", ()=>{
          if(nw.state==="installed" && navigator.serviceWorker.controller) showUpdateToast(reg);
        });
      });
    }catch(e){}
  });
  let reloaded=false;
  navigator.serviceWorker.addEventListener("controllerchange", ()=>{ if(reloaded) return; reloaded=true; location.reload(); });
}

