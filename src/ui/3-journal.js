/* =====================================================================
   PROGRESS TRACKING
===================================================================== */
/* LOCAL calendar date, deliberately not toISOString(). The log is keyed by this and
   saveLogEntry overwrites by date, so a UTC date meant a 20:30 session in New York was
   stamped tomorrow and then silently destroyed by the next morning's entry, and every
   morning session in Sydney was filed under yesterday. */
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function todayISO(){ return isoOf(new Date()); }
function fmtDate(iso){
  const d=new Date(iso+"T00:00:00");
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}
/* Surfaces the two states that used to fail silently: unreadable saved data, and a
   save that didn't land (quota / private mode). Both previously left the user believing
   their history was fine. */
function renderDataWarn(){
  const el = $("#dataWarn"); if(!el) return;
  let h = "";
  if(_loadCorrupt) h += `<div class="dwrow bad">⚠ <b>Some saved data couldn't be read</b> and has been set aside rather than overwritten.
    If you have a backup file, restoring it above is the safest next step.</div>`;
  if(_saveFailed) h += `<div class="dwrow bad">⚠ <b>A recent change couldn't be saved</b> — your browser storage may be full or blocked
    (private browsing does this). Download a backup before closing this tab.</div>`;
  el.innerHTML = h;
}
function initDataCard(){
  const ex = $("#exportBtn"), im = $("#importBtn"), fi = $("#importFile");
  if(ex) ex.onclick = exportData;
  if(im && fi){
    im.onclick = () => fi.click();
    fi.onchange = () => { if(fi.files && fi.files[0]) importData(fi.files[0]); fi.value=""; };
  }
  renderDataWarn();
}
function initProgress(){
  $("#logPain").oninput = e=>$("#logPainVal").textContent=e.target.value;
  $("#logBtn").onclick = saveLogEntry;

  const mr = $("#logMood");
  if(mr){
    mr.innerHTML = MOODS.map(m=>`<button type="button" class="moodbtn" data-m="${m.k}" aria-pressed="false" title="${esc(m.sub)}">
      <span class="moodi" aria-hidden="true">${m.icon}</span><span class="moodl">${esc(m.label)}</span></button>`).join("");
    mr.querySelectorAll(".moodbtn").forEach(b=>{
      b.onclick = () => {
        state.logMood = (state.logMood === b.dataset.m) ? "" : b.dataset.m;   // tap again to clear
        syncMood(); save();
      };
    });
  }
  renderTplRow();
  /* Delegated — renderLogEx() rebuilds these rows whenever the day changes. Ticking must
     NOT re-render the list: it's a checkbox someone is clicking down a column, and
     rebuilding under the cursor loses focus and the next click. */
  const exl = $("#logExList");
  if(exl) exl.addEventListener("change", ev => {
    const cb = ev.target;
    if(!cb || cb.type !== "checkbox" || !cb.dataset.n) return;
    const set = new Set(state.logDone || []);
    if(cb.checked) set.add(cb.dataset.n); else set.delete(cb.dataset.n);
    state.logDone = _logExOffer.filter(n=>set.has(n));   // keep the phase's order, not click order
    const li = cb.closest(".extick");
    if(li) li.classList.toggle("on", cb.checked);
    syncLogExSum();
    autosaveSoon();
  });
  /* Autosave: writes when they PAUSE. Also commit on blur and on tab-away, because a phone
     backgrounding the app is exactly when an unsaved page disappears. */
  const note = $("#logNote");
  if(note){ note.addEventListener("input", autosaveSoon); note.addEventListener("blur", autosaveNow); }
  const sess = $("#logSessions");
  if(sess){ sess.addEventListener("input", autosaveSoon); sess.addEventListener("blur", autosaveNow); }
  const pain = $("#logPain");
  if(pain) pain.addEventListener("change", autosaveSoon);
  document.addEventListener("visibilitychange", () => { if(document.hidden) autosaveNow(); });
  window.addEventListener("pagehide", autosaveNow);
  const del = $("#logDelete");
  if(del) del.onclick = async () => {
    const d = ($("#logDate") && $("#logDate").value) || todayISO();
    const e = (state.log||[]).find(x=>x.date===d);
    if(!e) return;
    /* Photos live in their own store keyed by date, so they would quietly survive a
       "delete this entry" and reappear on that day. Deleting the day means the day —
       but the photos get counted out loud first, because that is not recoverable. */
    let pics = [];
    try{ pics = await photoForDay(d); }catch(_){}
    const words = e.note ? String(e.note).trim().split(/\s+/).length : 0;
    const bits = [ words ? words + " words you wrote" : null,
                   pics.length ? pics.length + (pics.length===1 ? " photo" : " photos") : null ].filter(Boolean);
    if(!confirm("Delete your entry for " + fmtDate(d) + "?\n\nThis can't be undone" +
      (bits.length ? " — and it's " + bits.join(" and ") + "." : "."))) return;
    try{ await photoDeleteDay(d); }catch(_){}
    deleteLog(d); loadLogDay(d);
    toast("Deleted the entry for " + fmtDate(d) + (pics.length ? " and its photos." : "."));
  };
  /* Photos. The picker is a plain file input so it gets the camera on a phone and the
     library everywhere else, without asking for a camera permission we don't need. */
  const pf = $("#logPhotoFile"), pb = $("#logPhotoBtn");
  if(pb && pf){
    pb.onclick = () => pf.click();
    pf.onchange = async () => {
      const d = ($("#logDate") && $("#logDate").value) || todayISO();
      pb.disabled = true; pb.textContent = "Adding…";
      try{ await addPhotos(pf.files, d); }
      finally{ pb.disabled = false; pb.textContent = "＋ Add a photo"; pf.value = ""; }
    };
  }
  const pl = $("#logPhotoList");
  if(pl) pl.addEventListener("click", async ev => {
    const b = ev.target.closest(".pdel"); if(!b) return;
    if(!confirm("Delete this photo?\n\nThis can't be undone.")) return;
    const d = ($("#logDate") && $("#logDate").value) || todayISO();
    try{ await photoDelete(b.dataset.id); await renderPhotos(d); toast("Photo deleted."); }
    catch(_){ toast("⚠ Couldn't delete that photo."); }
  });
  const js = $("#journalSearch");
  if(js){ let t; js.oninput = () => { clearTimeout(t); t = setTimeout(renderProgress, 140); }; }
  if($("#jExportTxt"))  $("#jExportTxt").onclick  = exportJournalText;
  if($("#jExportJson")) $("#jExportJson").onclick = exportJournalJSON;
  if($("#jImport") && $("#jImportFile")){
    $("#jImport").onclick = () => $("#jImportFile").click();
    $("#jImportFile").onchange = () => { if($("#jImportFile").files[0]) importJournal($("#jImportFile").files[0]); $("#jImportFile").value=""; };
  }
  const dt = $("#logDate");
  if(dt){
    dt.max = todayISO();
    dt.value = todayISO();
    dt.onchange = () => { autosaveNow(); loadLogDay(dt.value); };   // commit before moving on, or it's gone
  }
  loadLogDay(todayISO());
  initHealth();
}
function syncMood(){
  $$("#logMood .moodbtn").forEach(b=>{
    const on = b.dataset.m === state.logMood;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
}
/* Pull an existing entry back into the form so a re-visit edits rather than silently
   overwrites, and so a caught-up day shows what is already there. */
function loadLogDay(d){
  const e = (state.log||[]).find(x=>x.date === d);
  state.logMood = e ? (e.mood||"") : "";
  state.logDone = (e && Array.isArray(e.done)) ? e.done.slice() : [];   // before renderLogEx reads it
  if($("#logPain")){ $("#logPain").value = e ? e.pain : 3; $("#logPainVal").textContent = e ? e.pain : 3; }
  if($("#logSessions")) $("#logSessions").value = e ? e.sessions : 1;
  if($("#logNote")) $("#logNote").value = e ? (e.note||"") : "";
  /* Don't stack two questions. When Jeffery asks an OPEN question his card is the prompt,
     so the note stays quiet; when he asks a CLOSED one (a tap), the written prompt
     complements it instead of competing with it. */
  const _q = jefferyQuestion(d);
  const _p = $("#logPrompt");
  if(_p){
    if(_q.t === "closed"){ _p.innerHTML = journalPrompt(d); _p.classList.remove("hide"); }
    else { _p.innerHTML = ""; _p.classList.add("hide"); }
  }
  const hint = $("#logDateHint");
  if(hint) hint.textContent = d === todayISO() ? "today" : (e ? "editing a past entry" : "catching up a missed day");
  const head = $("#logHead");
  if(head) head.textContent = d === todayISO() ? "Today's journal" : "Journal — " + fmtDate(d);
  const lt = $("#logToday");
  if(lt) lt.textContent = e ? "You already have an entry for this day" : "";
  _autoDirty = false; clearTimeout(_autoT);
  syncMood(); renderLogEx(d); renderPhotos(d); renderJournalToday(); renderDiaryHead(d); renderSaveState();
  const _del = $("#logDelete");
  if(_del) _del.classList.toggle("hide", !(state.log||[]).find(x=>x.date===d));
  if(typeof renderJournalJeffery==="function") renderJournalJeffery();
}
/* =====================================================================
   JEFFERY IN THE JOURNAL
   The Coach tab answers questions. This is the other half: someone who opens
   the conversation, remembers, and asks. The voice is a friend of five years
   rather than a clinician — warm, specific, unhurried, never chirpy at someone
   having a bad week.

   ⚠ A warm journal that asks "how are you doing?" WILL surface low mood.
   Depression is common in long rehab, and "positive vibes" aimed at someone
   who has just written something bleak is worse than saying nothing. So
   distress is checked BEFORE any cheerful reflection is chosen, and it is
   answered with warmth and a real signpost — not a slogan, and not a
   diagnosis. This app is educational; it is not a therapist and must not
   perform one.
   ===================================================================== */
const DISTRESS_RE = /\b(kill myself|killing myself|end (?:it|my life)|want to die|better off dead|no point (?:going on|in living|anymore)|can'?t go on|give up on life|self[- ]harm|hurt myself|suicid\w*|hopeless|worthless|nothing matters anymore)\b/i;
const DISTRESS_REPLY =
  "Thank you for writing that down — that took something, and I'd rather you said it than sat with it alone.\n\n" +
  "I'm an app, and I'm genuinely not the right kind of help for how you're feeling right now. A person is. " +
  "Please talk to your GP, or reach a crisis line — in the UK, Samaritans on **116 123**, any time, free. " +
  "In the US, call or text **988**. Elsewhere, **findahelpline.com** lists one for your country.\n\n" +
  "If you're in danger right now, please call your emergency number.\n\n" +
  "Your journal is still here whenever you want it. So is the rest of this — but that part first, please.";

/* Time of day makes a greeting sound like a person rather than a template. */
function partOfDay(){
  const h = new Date().getHours();
  return h < 12 ? "morning" : (h < 18 ? "afternoon" : "evening");
}
/* Openers reference something REAL — how long they've been at this, what they wrote last,
   whether they've been away. A friend of five years would notice. */
/* ⚠ Returns MARKDOWN, not HTML — the caller renders it through mdLite(), which escapes
   first and then converts **bold**. Anything HTML in here reaches the user as literal
   angle brackets, and anything pre-esc()'d comes out double-escaped as "&amp;". */
function jefferyOpener(){
  const log = state.log || [];
  const conds = selectedConditions();
  const cond = conds.length ? conds[0].name.replace(/\s*\(.*$/, "").toLowerCase() : "";
  const last = log.length ? log[log.length-1] : null;
  const gap = last ? Math.round((Date.now() - new Date(last.date+"T12:00:00").getTime())/864e5) : null;
  const rec = loggedRecently(14);
  const it = state.program && state.program.items && state.program.items[0];
  const ph = it && (it.phases||[]).find(x=>x.current);

  if(!log.length)
    return `Good ${partOfDay()}. I'm Jeffery — I'll be here every day you fancy writing something.\n\nNo pressure to be profound: a line is plenty${cond?`, even if it's just how the ${cond} behaved today`:""}. Whatever you put here, I'll remember it.`;
  if(gap !== null && gap >= 7)
    return `Good ${partOfDay()} — it's been ${gap} days. No lecture; life does that.\n\nYou're not behind, and you haven't undone anything. Want to tell me where things are now?`;
  if(gap !== null && gap >= 3)
    return `Good ${partOfDay()}. Been a few days — glad you're back.\n\nPick up wherever you are; you don't have to fill in the gap.`;
  const rough = log.slice(-3).filter(e=>e.mood==="rough"||e.mood==="sore").length;
  if(rough >= 2)
    return `Good ${partOfDay()}. The last few days have been sore ones, from what you've written.\n\nThat's worth saying out loud: rough patches are part of this, not evidence you've done something wrong. How's today sitting?`;
  if(rec.hit >= 10)
    return `Good ${partOfDay()}. ${rec.hit} of the last ${rec.of} days written up — that's real consistency, and it's the unglamorous bit that actually works.\n\nHow's today?`;
  if(ph && ph.title)
    return `Good ${partOfDay()}. You're into **${ph.title}** now${cond?` with the ${cond}`:""} — a long way from where this started.\n\nHow's today been?`;
  return `Good ${partOfDay()}. Good to see you.\n\nHow's today been?`;
}
/* Deliberately not all about the injury. Rehab is months long and lives inside a life —
   sleep, work, mood and whether anyone's asked how you are all move the outcome, and a
   friend would ask about them.

   Two kinds of question, on purpose:
   - OPEN ones invite writing, and produce the sentences worth keeping.
   - CLOSED ones are a single tap. They matter most on exactly the days someone has no
     energy to write — a bad day should still be loggable in three seconds — and some of
     the most clinically useful things are yes/no by nature (night pain, new pain
     somewhere else, whether the brace is actually being worn).
   Every closed option carries Jeffery's reply, so a tap opens the conversation instead of
   ending it. `more:true` nudges toward the note; the answer is never a dead end. */
/* =====================================================================
   THE REFLECTIVE SET — a counsellor's questions, in Jeffery's voice.
   Adapted from a standard counselling question bank. Two deliberate departures
   from the source list:

   1. NO SESSION FRAME. The originals assume a contained 50-minute hour with a
      trained person ("what brings you in today", "by our next session", "as a
      result of therapy"). This is a journal opened at 11pm. Every one is
      rewritten for someone writing alone, in Jeffery's register: warm,
      specific, unhurried, never chirpy.

   2. SOME ARE DELIBERATELY NOT HERE. The trauma, family-of-origin and
      couples-work questions are excluded on purpose — "when was the first time
      you felt this way", "how did your family handle emotions growing up",
      "what patterns from your childhood show up in your relationships now",
      "what are you still carrying from that experience", "what are you afraid
      to say to them", "what role do you play in this conflict".
      A counsellor asks those inside an hour they can hold, with a person who
      can catch what surfaces and follow it up next week. An app asks at
      bedtime, receives a disclosure, and shows a diary card. It can open that
      door and cannot close it — and a knee-rehab tool has no business trying.
      The strengths, values, solution-focused and CBT-style questions ARE here:
      they are the ones that genuinely move rehab adherence and self-efficacy,
      and they are safe to ask without a clinician in the room.
   ===================================================================== */
const JOURNAL_REFLECT = {
  /* opening & rapport */
  rapport: [
    { t:"open", q:"What made you open this today?" },
    { t:"open", q:"What would make today worth writing down?" },
    { t:"open", q:"If you could sort one thing this week, what would it be?" },
    { t:"open", q:"What's been on your mind lately — injury or otherwise?" },
    { t:"open", q:"How are you doing right now, this minute? Not this month. Right now." },
    { t:"open", q:"What's changed since the last time you wrote?" },
    { t:"open", q:"What would you want me to understand about where you're at?" },
    { t:"closed", q:"What would help most right now?", opts:[
      { label:"Just to be heard", reply:"Then I'll shut up and read. Say whatever you like here — it doesn't have to be tidy, and nobody's marking it.", more:true },
      { label:"Help me think it through", reply:"Alright. Lay it out — what's the actual knot in it?", more:true },
      { label:"Distract me", reply:"Fair enough. Then don't write about the injury at all today. What else is going on?", more:true }
    ]}
  ],
  /* feelings — kept at the surface, and leaning on the somatic ones, which is where a
     rehab tool has something honest to offer: pain and mood live in the same body. */
  feelings: [
    { t:"open", q:"Where do you feel that, physically? People carry this stuff in odd places." },
    { t:"open", q:"If that feeling had a voice, what would it be saying?" },
    { t:"open", q:"What usually helps it pass?" },
    { t:"open", q:"Is there a part of you that sees this differently? Both can be true." },
    { t:"closed", q:"How heavy does it feel today?", opts:[
      { label:"Light", reply:"Good. Worth noticing those days properly — they're the ones you forget by next week." },
      { label:"Middling", reply:"The honest middle. That's where most of this lives.", more:true },
      { label:"Heavy", reply:"Then today's a heavy one, and saying so is the useful bit. It doesn't have to mean anything more than that.", more:true }
    ]}
  ],
  /* thinking & patterns — CBT-flavoured, and pointed at the catastrophising that
     genuinely shows up in rehab ("I'll never run again") rather than at anything deeper. */
  thinking: [
    { t:"open", q:"What's the story you're telling yourself about this recovery?" },
    { t:"open", q:"Is there another way to read this situation?" },
    { t:"open", q:"What actual evidence have you got that that thought is true?" },
    { t:"open", q:"If a mate said that to you about their injury, what would you tell them?" },
    { t:"open", q:"What's the worst that could realistically happen — and could you handle it?" },
    { t:"open", q:"What's a fairer way to put that?" },
    { t:"open", q:"Is that thought doing anything useful for you right now?" },
    { t:"open", q:"Anything you notice repeating — same thought, same week, same wall?" },
    { t:"open", q:"You've thought this before, I'd bet. What happened last time?" }
  ],
  /* values & meaning — minus the legacy question, which is a lot to put to someone
     halfway through a knee rehab on a Tuesday. */
  values: [
    { t:"open", q:"What matters most to you — the thing you'd protect first?" },
    { t:"open", q:"What would this year look like if it lined up with that?" },
    { t:"open", q:"What gives your days meaning at the moment?" },
    { t:"open", q:"If you knew you couldn't fail at this, what would you do differently?" },
    { t:"open", q:"What are you not willing to compromise on?" },
    { t:"open", q:"What would the version of you who's got this handled do today?" }
  ],
  /* strengths & resources — the highest-value set here. Rehab is largely a self-efficacy
     problem, and these are the questions that move it. */
  strengths: [
    { t:"open", q:"You've got through hard things before. What worked then?" },
    { t:"open", q:"What's got you this far? Name it — it'll be useful again." },
    { t:"open", q:"What are you proudest of in how you've handled this?" },
    { t:"open", q:"What's working well right now? Genuinely — don't skip past it." },
    { t:"open", q:"What have you got in your corner that you haven't used yet?" },
    { t:"open", q:"When have you come back from something like this before?" },
    { t:"open", q:"What does being resilient actually look like for you? Not the poster version." },
    { t:"closed", q:"Have you got someone in your corner at the moment?", opts:[
      { label:"Yes", reply:"Good. That's one of the better predictors of how this goes, and it's the one people never put on the chart." },
      { label:"Sort of", reply:"Sort of is common and it wears thin over months. Anyone you could ask for something specific?", more:true },
      { label:"Not really", reply:"That's a hard thing to type. Long rehab is isolating in a way people don't warn you about, and it's not a character flaw. I'm here daily — but I'm an app, and a real person is worth the effort.", more:true }
    ]}
  ],
  /* decision-making & change — the adherence engine, essentially. */
  change: [
    { t:"open", q:"What's actually stopping you? Be honest, no one's reading over your shoulder." },
    { t:"open", q:"What would need to be true for you to feel ready?" },
    { t:"open", q:"What's it costing you to leave things as they are?" },
    { t:"open", q:"What's one small thing you could do this week? Small. Genuinely small." },
    { t:"open", q:"Is there something you're getting out of staying stuck? There usually is, and it's not a criticism." },
    { t:"open", q:"If it were easy, what would you pick?" },
    { t:"open", q:"What's your gut saying? Not your physio, not me — you." },
    { t:"open", q:"What would you regret more: trying, or not trying?" },
    { t:"closed", q:"Ready to change something this week?", opts:[
      { label:"Yes", reply:"Then make it smaller than feels impressive. Small and done beats ambitious and abandoned — that's the whole trick.", more:true },
      { label:"Not yet", reply:"That's a real answer, and readiness isn't willpower — it arrives when it arrives. What would have to shift first?", more:true }
    ]}
  ],
  /* future-focused, including the miracle question, which is a solution-focused staple
     and works well here. */
  ahead: [
    { t:"open", q:"What does “sorted” look like to you? Be specific." },
    { t:"open", q:"Say you woke up tomorrow and this was all fixed — what's the first thing you'd notice?" },
    { t:"open", q:"Where do you want to be a year from now?" },
    { t:"open", q:"What's one thing you'd like to be different by this time next week?" },
    { t:"open", q:"What would it take for you to feel at peace with how this went?" },
    { t:"open", q:"What are you hoping comes out of all this effort?" }
  ],
  /* looking back — at THIS injury, deliberately. The originals reach into old memories
     and old wounds; these stop at the thing they came here for. */
  lookback: [
    { t:"open", q:"What have you learned about yourself through this injury?" },
    { t:"open", q:"How has this changed how you see things?" },
    { t:"open", q:"How did you cope in the early days of it? Give yourself some credit." },
    { t:"open", q:"What would you say to yourself the week this happened?" },
    { t:"open", q:"What would being properly over this look like?" }
  ],
  /* closing & reflection — reframed from "this session" to "today", because that is
     what it actually is. */
  closing: [
    { t:"open", q:"One thing worth taking from today?" },
    { t:"open", q:"Anything you haven't written down that feels important?" },
    { t:"closed", q:"Feeling any different than when you sat down?", opts:[
      { label:"Better", reply:"Writing does that more often than people expect. That's most of why this page exists." },
      { label:"Same", reply:"That's fine. Not every entry has to do something — some are just the record.", more:true },
      { label:"Worse", reply:"Sorry — that happens when you actually look at it properly. It usually settles. If it doesn't, that's worth telling someone who isn't an app.", more:true }
    ]}
  ]
};
const JOURNAL_QS = {
  rehab: [
    { t:"open", q:"What did your body let you do today that it wouldn't have a month ago?" },
    { t:"open", q:"Anything that felt easier than you expected?" },
    { t:"open", q:"Was there a moment today you thought “oh, that used to hurt”?" },
    { t:"open", q:"What are you still avoiding — and is that caution or habit at this point?" },
    { t:"open", q:"If your physio asked “how's it going?” right now, what would you actually say?" },
    { t:"open", q:"Which exercise are you quietly dreading? No judgement, I'm just curious." },
    { t:"open", q:"What would “a good week” look like from here?" },
    { t:"closed", q:"Did you get your exercises done today?", opts:[
      { label:"All of them", reply:"Good. That's the boring bit that actually does the work — most people skip it and wonder why nothing changes." },
      { label:"Some", reply:"Some is a real answer, and it beats none by more than people think. Short and often wins.", more:true },
      { label:"Not today", reply:"That's alright. One day off isn't a setback, and guilt has never healed anything. Anything get in the way?", more:true }
    ]},
    { t:"closed", q:"Any pain somewhere it didn't used to hurt?", opts:[
      { label:"No", reply:"Good — that's the answer I was hoping for. New pain elsewhere usually means something's compensating." },
      { label:"Yes", reply:"Worth keeping an eye on. New pain in a fresh spot often means something else is taking the load — mention it to your physio if it sticks around. Where is it, and what does it feel like?", more:true }
    ]},
    { t:"closed", q:"Did it wake you in the night?", opts:[
      { label:"Slept fine", reply:"That's a better sign than any number on a chart. Sleep is when the repairing actually happens." },
      { label:"Once or twice", reply:"Not unusual, especially after a bigger day. Worth watching the pattern rather than the one night.", more:true },
      { label:"Kept me awake", reply:"That's worth telling your physio — pain that regularly wakes you is one of the things they specifically want to know about. How many nights this week?", more:true }
    ]},
    { t:"closed", q:"Is the swelling up, down, or about the same?", opts:[
      { label:"Down", reply:"That's your best day-to-day gauge, and down is the direction you want." },
      { label:"Same", reply:"Steady is fine. Swelling is a slow mover.", more:true },
      { label:"Up", reply:"Swelling is the honest umpire of load — up usually means yesterday asked a bit much. Ease off a notch rather than pushing through. What did you do differently?", more:true }
    ]},
    { t:"closed", q:"How confident do you feel putting weight through it?", opts:[
      { label:"Confident", reply:"Confidence matters more than people credit — trusting it is half of using it normally again." },
      { label:"Getting there", reply:"That's the honest middle, and it's where most of rehab lives.", more:true },
      { label:"Not at all", reply:"Fair. Fear of it is real and it's part of the injury, not a character flaw — it usually settles as the strength does. What worries you most about it?", more:true }
    ]}
  ],
  life: [
    { t:"open", q:"Outside all this — how are you, actually?" },
    { t:"open", q:"How did you sleep? It matters more to healing than most people are told." },
    { t:"open", q:"What's the most annoying thing this injury is keeping you from? Say it, it helps." },
    { t:"open", q:"What did you enjoy today, even briefly?" },
    { t:"open", q:"Is there something you've stopped doing that you could start again, even a bit?" },
    { t:"open", q:"How's your patience with all this holding up? Honest answer." },
    { t:"open", q:"What are you looking forward to?" },
    { t:"closed", q:"Did you get out of the house today?", opts:[
      { label:"Yes", reply:"Good. Getting out does something for this that no exercise sheet does." },
      { label:"No", reply:"Some days that's just how it goes. Worth noticing if it becomes the pattern rather than the day.", more:true }
    ]},
    { t:"closed", q:"Have you got someone to talk to about all this?", opts:[
      { label:"Yes", reply:"That's genuinely one of the better predictors of how this goes. Don't underrate it." },
      { label:"Not really", reply:"That's a hard one to admit, and it's more common in long rehab than anyone says out loud. I'm here daily, but I'm an app — a real person is worth the effort if you can find one.", more:true }
    ]},
    { t:"closed", q:"Feeling like yourself lately?", opts:[
      { label:"Mostly", reply:"Good. Recovery is as much about that as it is about range of motion." },
      { label:"Not really", reply:"Thanks for saying so. Months of this wears people down, and feeling flat about it is a normal response to an abnormal amount of waiting — not a weakness. If it's been weeks rather than days, that's worth mentioning to your GP.", more:true }
    ]},
    { t:"closed", q:"Been eating and drinking properly?", opts:[
      { label:"Yes", reply:"Good — healing is expensive, metabolically. Protein and water do more than any supplement." },
      { label:"Not really", reply:"Easily done when everything's an effort. It genuinely affects how fast tissue repairs, so it's worth a small fix rather than a big plan.", more:true }
    ]}
  ]
};
/* The reflective set joins the rotation, flattened. Weighted so the injury still leads —
   this is a rehab journal, not a counselling app wearing one as a coat. Roughly: half the
   days about the injury, a third reflective, the rest general life. */
JOURNAL_QS.reflect = Object.values(JOURNAL_REFLECT).reduce((a,b)=>a.concat(b), []);
const JOURNAL_POOLS = ["rehab","rehab","rehab","reflect","reflect","life"];
/* Alternate the topic by day so it doesn't become an interrogation about one knee, and
   alternate open / closed so there is always a low-effort way in on a bad day. */
/* hashStr is a rolling polynomial hash (h = h*31 + c) and its LOW BITS barely move between
   similar strings, which matters because every key here is a date. Two consequences bit:
   - Deriving the topic from h%6 and the type from h%2 locks them together, so the "life"
     pool (index 5, odd) could only ever ask OPEN questions.
   - Salting with a suffix does NOT fix it: hashStr(d+"|type") == hashStr(d)*31^5 + C, and
     31^5 is ODD, so the parity is STILL determined by hashStr(d). 31 of 82 questions were
     unreachable across 4,000 simulated days.
   Avalanche the hash first, then take independent slices of the mixed value. */
const mix32 = x => {
  x = x | 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15; x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
};
function jefferyQuestion(dateISO){
  const d = dateISO || todayISO();
  const h = mix32(hashStr(d));
  const pool = JOURNAL_QS[JOURNAL_POOLS[h % JOURNAL_POOLS.length]];
  const want = ((h >>> 12) & 1) ? "open" : "closed";                 // an independent bit of the mixed hash
  let use = pool.filter(x => x.t === want);
  /* Personal questions built from THEIR data (hard ADL, phase criteria, sport goal, last
     entry) join the OPEN rotation — a question only they would be asked beats a good
     generic one, and Jeffery is the one asking now. */
  if(want === "open"){
    const personal = personalOpenQs();
    if(personal.length) use = personal.concat(use);
  }
  if(!use.length) use = pool;
  return use[mix32(h ^ 0x9e3779b9) % use.length];               // a third independent slice
}
function personalOpenQs(){
  const out = [];
  /* The most specific question the app can ask, and it costs nothing: it's their own data.
     Curious, not disappointed — "what's putting you off" invites the real answer ("it hurts"),
     where "why haven't you" invites a lie. */
  const sk = (exSkipStats()||{rows:[]}).rows.filter(r=>r.streak>=3).sort((a,b)=>b.streak-a.streak)[0];
  if(sk) out.push({ t:"open", q:`The ${sk.n.toLowerCase()} hasn't been ticked for ${sk.streak} sessions. No judgement — what's putting you off it?` });
  const hard = (state.adls||[]).filter(a=>a.level>=1);
  if(hard.length) out.push({ t:"open", q:`You said ${hard[0].name.toLowerCase()} was hard — how was that today?` });
  const it = state.program && state.program.items && state.program.items[0];
  const ph = it && (it.phases||[]).find(x=>x.current);
  if(ph && ph.criteria) out.push({ t:"open", q:`To reach the next phase you need: ${String(ph.criteria)}. Any closer?` });
  if((state.returnSports||[]).length) out.push({ t:"open", q:`${state.returnSports[0]} is the goal — did anything feel closer to it today?` });
  const prev = (state.log||[]).filter(e=>e.note).slice(-1)[0];
  if(prev) out.push({ t:"open", q:`Last time you wrote: “${String(prev.note).slice(0,70)}” — how's that now?` });
  return out;
}
/* ---------------------------------------------------------------------
   RECALL — the whole point of keeping a journal.
   Months of entries are worthless if nobody can find anything in them. Two
   readers need to: the user ("what did I say about stairs?") and Jeffery, who
   should be able to quote a Tuesday in March back at someone convinced they
   have made no progress. That is the single most useful thing this data can do
   — people in long rehab genuinely cannot remember how bad week two was.
   --------------------------------------------------------------------- */
const STOP_W = new Set(["the","a","an","and","or","but","my","me","i","it","is","was","to","of","in","on","at","for","with","that","this","had","have","has","been","did","do","so","if","not","its","im","ive"]);
const jWords = t => String(t||"").toLowerCase().split(/[^a-z0-9']+/)
  .filter(w => w.length > 2 && !STOP_W.has(w)).map(w => w.length > 4 && w.endsWith("s") ? w.slice(0,-1) : w);

/* Free-text search over everything they've written. */
function journalSearch(q, limit){
  const toks = jWords(q);
  const log = (state.log||[]).filter(e => e.note);
  if(!toks.length) return [];
  const hits = log.map(e => {
    const hay = " " + jWords(e.note).join(" ") + " ";
    const score = toks.reduce((a,t) => a + (hay.includes(" "+t+" ") ? 2 : (hay.includes(t) ? 1 : 0)), 0);
    return { e, score };
  }).filter(x => x.score > 0).sort((a,b) => b.score - a.score || (a.e.date < b.e.date ? 1 : -1));
  return hits.slice(0, limit || 20).map(x => x.e);
}
/* What Jeffery can dig up unprompted: an older entry that echoes today's. */
function journalEcho(note, beforeISO){
  const toks = jWords(note);
  if(toks.length < 2) return null;
  const older = (state.log||[]).filter(e => e.note && e.date < (beforeISO || todayISO()));
  let best = null, bestScore = 0;
  for(const e of older){
    const hay = " " + jWords(e.note).join(" ") + " ";
    const sc = toks.reduce((a,t) => a + (hay.includes(" "+t+" ") ? 1 : 0), 0);
    if(sc > bestScore){ bestScore = sc; best = e; }
  }
  return bestScore >= 2 ? best : null;
}
/* A good day, from a while back — for when today is bleak and nothing feels like progress. */
function journalBrightSpot(){
  const cut = new Date(); cut.setDate(cut.getDate() - 7);
  const old = (state.log||[]).filter(e => e.note && e.date < isoOf(cut) && (e.mood === "good" || e.pain <= 3));
  return old.length ? old[old.length - 1] : null;
}
const fmtAgo = d => {
  const n = Math.round((Date.now() - new Date(d + "T12:00:00").getTime()) / 864e5);
  return n <= 1 ? "yesterday" : (n < 14 ? n + " days ago" : (n < 60 ? Math.round(n/7) + " weeks ago" : Math.round(n/30) + " months ago"));
};

/* Offline conversation — no API, so it leans on the one thing it genuinely has: their own
   back catalogue. Being asked "what did I say about X" and answering with a real quote is
   worth more than a canned line. */
function jefferyChatOffline(msg){
  const found = journalSearch(msg, 2);
  if(found.length){
    const e = found[0];
    return `You wrote this ${fmtAgo(e.date)} — ${fmtDate(e.date)}:\n\n_“${String(e.note).slice(0,220)}”_\n\n` +
      (found[1] ? `And ${fmtAgo(found[1].date)}: _“${String(found[1].note).slice(0,140)}”_\n\n` : "") +
      `That's from your own journal, not me guessing. I'm offline right now — add a Claude API key on the Jeffery step and I can actually talk about it.`;
  }
  return jefferyReflectOffline(msg);
}
/* Offline reflection: warm, and grounded in what they actually wrote/logged rather than
   a fortune cookie. */
function jefferyReflectOffline(note){
  const t = String(note||"").toLowerCase();
  const rp = recentPain();
  const bits = [];
  if(/worse|flare|swollen|swelling|sore|hurt|pain/.test(t))
    bits.push("Sore days are data, not failure — the plan expects them, and one bad day doesn't undo a month of work.");
  else if(/better|easier|good|great|progress|closer|managed/.test(t))
    bits.push("That's worth noticing properly. Progress in rehab is mostly made of days like this one, and they're easy to forget by next week.");
  if(/tired|exhausted|knackered|fatigue|drained/.test(t))
    bits.push("Tiredness is doing more of the work than people realise — healing is metabolically expensive. Rest counts as part of the programme, not a break from it.");
  if(/frustrat|fed up|sick of|annoy|angry|slow/.test(t))
    bits.push("Frustration is fair. This is slow in a way nobody warns you about, and being fed up with it doesn't mean you're doing it wrong.");
  if(/stairs|walking|work|sleep|driving|shopping/.test(t))
    bits.push("The everyday stuff is the real measure — better than any number on a chart.");
  if(rp && rp.mean >= 6) bits.push(`You've been averaging ${rp.mean}/10 lately, and your plan has already eased off to match. You don't need to push through this.`);
  /* The payoff for keeping a journal: being shown that you HAVE said this before, and what
     happened next. Nobody in month four remembers week two. */
  const echo = journalEcho(note);
  if(echo) bits.push(`You wrote something similar ${fmtAgo(echo.date)} — ${fmtDate(echo.date)}:\n\n_“${String(echo.note).slice(0,180)}”_`);
  else if(/worse|flare|swollen|fed up|frustrat|hopeless|slow|never/.test(t)){
    const bright = journalBrightSpot();
    if(bright) bits.push(`Worth reading this back — it's yours, from ${fmtAgo(bright.date)}:\n\n_“${String(bright.note).slice(0,180)}”_\n\nToday isn't the whole picture.`);
  }
  if(!bits.length) bits.push("Noted — and kept. I'll have this in mind next time you're here.");
  bits.push("I'm offline right now, so this is the short version. Add a Claude API key on the Jeffery step and I can actually talk properly.");
  return bits.slice(0, 4).join("\n\n");
}
/* Online: same person, different register from the Coach tab. */
function jefferyJournalSystem(){
  return buildCoachSystem() +
`

YOU ARE WRITING BACK IN THE USER'S PRIVATE JOURNAL, NOT ANSWERING A SUPPORT TICKET.
Voice: a close friend of about five years who happens to know rehab. Warm, specific,
unhurried, dry humour welcome. You have read everything above — their plan, their phase,
their logged pain, their own words — so talk like someone who remembers, not someone
reading a chart for the first time.

- Reply to what they actually wrote. Quote a phrase of theirs back if it helps.
- 2-4 short paragraphs. No headings, no bullet lists, no sign-off.
- Ask ONE question at the end, and make it one only they would be asked.
- Never open with "I'm sorry to hear that" or "It sounds like". Never say "as an AI".
- Do not cheerlead. If they had a bad day, say so plainly and sit with it for a sentence
  before offering anything. Toxic positivity is worse than silence here.
- Do not turn every entry into rehab advice. If they wrote about their week, their sleep
  or their mood, answer THAT. The knee can wait a day.
- Praise effort and consistency, never the numbers.
- You are not a therapist. If they sound genuinely low, be kind, be human, and gently
  suggest a real person — do not counsel them.

THE EXERCISE TICKS. You can see which movements they tick off and which quietly get
dropped, and that is worth ONE curious question when the pattern above is real — "what's
putting you off the split squats?" — because the answer is nearly always useful: it hurts,
it's boring, or they can't actually do it, and each of those has a different fix.
- Ask because the answer matters. Never to chase compliance, never as a telling-off.
- Once. Not two days running, and never as the opener on a day they've written something bad.
- If the line above says there are no ticks yet, they simply aren't using the checklist.
  Say NOTHING about skipping — you have no idea what they did.

USE THE ARCHIVE. You have months of their own words above, with dates. A friend of five
years remembers, and this is the single most useful thing you can do for someone in long
rehab: nobody in month four remembers how bad week two actually was.
- When they say nothing is improving, find the entry that proves otherwise and quote it
  with its date: "You wrote on 3 March: '...'. Read that again."
- When something echoes an older entry, say so — same worry, same wall, six weeks apart.
- If they ask what they said about something, quote it. Do not paraphrase their own words.
- Quote ONLY what is in the archive above. Never invent an entry, never approximate a date,
  and if it isn't there, say you can't find it. Making up something they "wrote" would be
  worse than useless — they will know, and they will stop trusting the rest.`;
}

function renderJournalJeffery(){
  const host = $("#journalJeffery"); if(!host) return;
  const day = ($("#logDate")&&$("#logDate").value) || todayISO();
  const q = jefferyQuestion(day);
  /* A closed question is answered where it is asked — one tap, no typing. An open one
     invites the note. Both end up in the same journal entry. */
  const closed = q.t === "closed";
  host.innerHTML = `
    <div class="jjhead"><span class="jjav" aria-hidden="true">🧑‍⚕️</span>
      <div><div class="jjname">Jeffery</div><div class="jjrole">your rehab specialist${coachOnline()?"":" · offline mode"}</div></div></div>
    <div class="jjsay">${mdLite(jefferyOpener())}</div>
    <div class="jjq">${esc(q.q)}</div>
    ${closed ? `<div class="jjopts no-print" role="group" aria-label="${esc(q.q)}">${
      q.opts.map((o,i)=>`<button type="button" class="jjopt" data-i="${i}">${esc(o.label)}</button>`).join("")
    }</div>` : ""}
    <div class="jjthread" id="jjThread"></div>
    <form class="jjform no-print" id="jjForm" autocomplete="off">
      <input type="text" id="jjInput" placeholder="Say something to Jeffery…" aria-label="Say something to Jeffery" />
      <button class="btn primary small" type="submit">Send</button>
    </form>
    <div class="jjrow no-print">
      <button class="btn ghost small" id="jjUse">${closed ? "Write about it instead ↓" : "Answer this in my journal ↓"}</button>
      <button class="btn ghost small" id="jjTalk">Send today's entry</button>
      <button class="btn ghost small hide" id="jjClear">Clear chat</button>
    </div>`;
  $("#jjUse").onclick = () => appendToNote(q.q);
  $("#jjTalk").onclick = () => jefferyJournalReply();
  $("#jjForm").addEventListener("submit", e => {
    e.preventDefault();
    const el = $("#jjInput"); const v = el.value.trim();
    if(!v) return;
    el.value = ""; jjSend(v, false);
  });
  $("#jjClear").onclick = () => {
    if((state.jjThread||[]).length && !confirm("Clear this conversation? Your journal entries stay.")) return;
    state.jjThread = []; save(); renderJJThread();
  };
  if(closed) host.querySelectorAll(".jjopt").forEach(b=>{
    b.onclick = () => answerClosed(q, q.opts[+b.dataset.i]);
  });
  renderJJThread();
}
function appendToNote(text){
  const n = $("#logNote"); if(!n) return;
  n.value = (n.value ? n.value.replace(/\s*$/,"") + "\n\n" : "") + text + "\n";
  n.focus(); n.setSelectionRange(n.value.length, n.value.length);
}
/* A tap must never dead-end. It records the answer, Jeffery says something back, and where
   the answer is worth expanding he asks for the detail rather than filing it and moving on. */
function answerClosed(q, opt){
  appendToNote(q.q + " — " + opt.label);
  state.jjThread = [{ who:"you", text: opt.label },
                    { who:"jeffery", text: opt.reply }];
  save(); renderJJThread();
  if(opt.more){ const n = $("#logNote"); if(n) n.focus(); }
}
function renderJJThread(){
  const el = $("#jjThread"); if(!el) return;
  el.innerHTML = (state.jjThread||[]).map(t =>
    `<div class="jjmsg ${t.who==="you"?"jjyou":"jjbot"}">${mdLite(t.text)}</div>`).join("");
  el.scrollTop = el.scrollHeight;
  const c = $("#jjClear"); if(c) c.classList.toggle("hide", !(state.jjThread||[]).length);
}
/* The journal's note IS the message — they've already written it; don't make them type twice. */
/* This RESET the thread on every call — `state.jjThread = [{...}]` — so it could never be a
   conversation, only a one-shot reaction, and the API was sent a single message with no
   history. A friend you can only say one thing to isn't a friend. */
const JJ_MAX = 60;
function jjPush(who, text){
  state.jjThread = (state.jjThread || []).concat([{ who, text }]);
  if(state.jjThread.length > JJ_MAX) state.jjThread = state.jjThread.slice(-JJ_MAX);
  save();
}
/* Same rule as the Coach tab: the API needs messages[0] to be a user turn, so trim forward
   rather than slicing blindly. */
function jjWindow(n){
  let w = (state.jjThread||[]).slice(-(n||12))
    .map(t => ({ role: t.who === "you" ? "user" : "assistant", content: t.text }))
    .filter(m => m.content && m.content !== "_thinking…_");
  while(w.length && w[0].role !== "user") w = w.slice(1);
  /* Collapse any same-role neighbours the trim leaves behind — the API rejects them. */
  const out = [];
  for(const m of w){
    if(out.length && out[out.length-1].role === m.role) out[out.length-1].content += "\n\n" + m.content;
    else out.push(m);
  }
  return out;
}
/* Kick the conversation off from what they wrote on the page. */
function jefferyJournalReply(){
  const note = ($("#logNote") && $("#logNote").value.trim()) || "";
  if(!note){ toast("Write a line first — then I'll have something to reply to."); return; }
  return jjSend(note, true);
}
/* One path for every turn, so a follow-up gets the same care as the first message. */
async function jjSend(text, isEntry){
  const msg = String(text||"").trim();
  if(!msg) return;
  jjPush("you", msg);
  renderJJThread();
  /* Checked on EVERY turn, before anything cheerful is chosen and before any API call — a
     warm reflection aimed at someone who just wrote something bleak is worse than silence,
     and distress can surface on turn 5 as easily as turn 1. */
  if(DISTRESS_RE.test(msg)){ jjPush("jeffery", DISTRESS_REPLY); renderJJThread(); return; }
  if(!coachOnline()){
    jjPush("jeffery", isEntry ? jefferyReflectOffline(msg) : jefferyChatOffline(msg));
    renderJJThread(); return;
  }
  jjPush("jeffery", "_thinking…_");
  renderJJThread();
  const iThinking = state.jjThread.length - 1;
  try{
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "content-type":"application/json", "x-api-key":state.apiKey.trim(),
        "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
      body: JSON.stringify({ model: state.apiModel || "claude-opus-4-8", max_tokens: 700,
        system: jefferyJournalSystem(), messages: jjWindow(12) })
    });
    if(!res.ok){ let m = "HTTP "+res.status; try{ const j = await res.json(); if(j.error&&j.error.message) m = j.error.message; }catch(e){} throw new Error(m); }
    const data = await res.json();
    const out = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n").trim();
    state.jjThread[iThinking] = { who:"jeffery", text: out || jefferyReflectOffline(msg) };
  }catch(err){
    state.jjThread[iThinking] = { who:"jeffery", text: (isEntry ? jefferyReflectOffline(msg) : jefferyChatOffline(msg)) };
  }
  save(); renderJJThread();
}
/* ---------------------------------------------------------------------
   DIARY TEMPLATES
   A blank box is the thing people bounce off — "write something about your
   day" is a bigger ask than it looks at 11pm. A half-written page is much
   easier to talk back to, so these are openers, not forms: headings the user
   can ignore, delete or write straight over. Blank stays the default for
   anyone who just wants to write.
   The "Rough day" one exists because the days worth capturing most are the
   ones when a five-part template feels like homework.
   --------------------------------------------------------------------- */
const DIARY_TEMPLATES = [
  { k:"blank", label:"Blank", body:"" },
  { k:"quick", label:"One line", body:"Today — " },
  { k:"full",  label:"Full page", body:
    "How today went —\n\n\nWhat I managed —\n\n\nWhat was hard —\n\n\nOne good thing —\n\n\nNote to future me —\n\n" },
  { k:"rough", label:"Rough day", body:
    "Today was a hard one because —\n\n\nWhat I still did, even so —\n\n\nWhat might help tomorrow —\n\n\n(One line is plenty today. Nobody's marking this.)\n" },
  { k:"win",   label:"Milestone", body:
    "Today I finally —\n\n\nHow it felt —\n\n\nWhat got me here —\n\n\nRead this again on a bad day.\n" }
];
function applyTemplate(k){
  const t = DIARY_TEMPLATES.find(x=>x.k===k); if(!t) return;
  const n = $("#logNote"); if(!n) return;
  /* Never silently overwrite what they have already written. */
  if(n.value.trim() && t.body && !confirm("Replace what you've written with the " + t.label.toLowerCase() + " template?")) return;
  if(t.k === "blank"){
    if(n.value.trim() && !confirm("Clear this entry?")) return;
    n.value = "";
  } else n.value = t.body;
  state.logTpl = k; save();
  syncTplRow();
  n.focus();
  /* Land the cursor after the first heading, where they actually start writing. */
  const i = n.value.indexOf("—");
  n.setSelectionRange(i >= 0 ? i + 2 : n.value.length, i >= 0 ? i + 2 : n.value.length);
}
function syncTplRow(){
  $$("#logTpl .tplbtn").forEach(b=>{
    const on = b.dataset.k === (state.logTpl || "blank");
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
}
function renderTplRow(){
  const row = $("#logTpl"); if(!row) return;
  row.innerHTML = `<span class="tpllab">Start from —</span>` + DIARY_TEMPLATES.map(t=>
    `<button type="button" class="tplbtn" data-k="${t.k}" aria-pressed="false">${esc(t.label)}</button>`).join("");
  row.querySelectorAll(".tplbtn").forEach(b=> b.onclick = () => applyTemplate(b.dataset.k));
  syncTplRow();
}
/* The page shows its own date, the way a diary does. */
function renderDiaryHead(d){
  const day = $("#diaryDay"), meta = $("#diaryMeta");
  const dt = new Date((d || todayISO()) + "T12:00:00");
  if(day) day.textContent = isNaN(dt) ? "" : dt.toLocaleDateString(undefined, { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  if(meta){
    const e = (state.log||[]).find(x=>x.date === (d || todayISO()));
    const m = e && moodOf(e.mood);
    meta.textContent = e ? (m ? m.icon + " " + m.label : "written") : "";
  }
}

/* =====================================================================
   THE JOURNAL
   This was a clinical data form wearing a friendly heading: a 0-10 slider, a
   count, and a note that got WIPED on save. The note is the only place the user
   says anything in their own words, and nothing read it -- it rendered as a
   suffix ("2 sessions · my knee clicked on stairs") and stopped there. Not the
   trend, not the plan, not Jeffery. The words are the point of a journal, so
   here they lead, they persist, they get a prompt, and they reach the coach.
   ===================================================================== */
const MOODS = [
  { k:"good",  icon:"🙂", label:"Good",  sub:"Better than usual" },
  { k:"ok",    icon:"😐", label:"OK",    sub:"About normal" },
  { k:"sore",  icon:"😣", label:"Sore",  sub:"Achy but manageable" },
  { k:"rough", icon:"😞", label:"Rough", sub:"A bad day" }
];
const moodOf = k => MOODS.find(m => m.k === k) || null;

/* A blank box is intimidating and gets skipped. The app already knows what to ask:
   their hard ADLs, their phase criteria, their sport goal, what they wrote yesterday.
   Rotate by day so it reads like something is paying attention. */
function journalPrompt(dateISO){
  /* Personal prompts WIN. Pooling them with the generic ones and picking uniformly meant a
     user with a hard ADL, a sport goal and phase criteria still got "Anything you'd want to
     remember?" most days — which is the blank box the prompt exists to replace. */
  const personal = [];
  const _sk = (exSkipStats()||{rows:[]}).rows.filter(r=>r.streak>=3).sort((a,b)=>b.streak-a.streak)[0];
  if(_sk) personal.push(`The <b>${esc(_sk.n.toLowerCase())}</b> hasn't been ticked for ${_sk.streak} sessions — what's putting you off it?`);
  const hard = (state.adls||[]).filter(a=>a.level>=1);
  if(hard.length) personal.push(`You said <b>${esc(hard[0].name.toLowerCase())}</b> was hard — how was that today?`);
  const it = state.program && state.program.items && state.program.items[0];
  const ph = it && (it.phases||[]).find(x=>x.current);
  if(ph && ph.criteria) personal.push(`To reach the next phase you need: <b>${esc(String(ph.criteria))}</b>. Any closer?`);
  if((state.returnSports||[]).length) personal.push(`<b>${esc(state.returnSports[0])}</b> is the goal — did anything feel closer to it today?`);
  if(ph && ph.title) personal.push(`You're in <b>${esc(ph.title)}</b>. What felt easier, and what didn't?`);
  const prev = (state.log||[]).filter(e=>e.date < dateISO && e.note).slice(-1)[0];
  if(prev) personal.push(`Last time you wrote: <i>“${esc(String(prev.note).slice(0,80))}”</i> — how's that now?`);
  const generic = ["What felt easier today, and what did you avoid?",
                   "Anything you'd want to remember, or tell your physio?",
                   "How did today compare with yesterday?"];
  const pool = personal.length ? personal : generic;
  /* Deterministic per day: it must not reshuffle while they are typing. */
  return pool[Math.abs(hashStr(dateISO)) % pool.length];
}

/* Streaks punish exactly the person who most needs to keep going: flares are part of
   rehab, and a zeroed counter on a bad week reads as failure. Same information, kinder. */
function loggedRecently(days){
  const n = days || 14;
  const cut = new Date(); cut.setDate(cut.getDate() - (n - 1));
  const key = isoOf(cut);
  const hit = new Set((state.log||[]).filter(e=>e.date >= key).map(e=>e.date)).size;
  return { hit, of: n };
}

/* They just fed the engine — say what it did, or the daily ritual feels like homework. */
function logImpactHTML(){
  const bits = [];
  const rp = recentPain();
  if(rp) bits.push(`Your plan is now working from <b>${rp.mean}/10</b> — the average of your last ${rp.n} logged days, not the number you typed at intake.`);
  const a = adherence();
  if(a && a.status === "on-track") bits.push(`<b>${a.done}</b> sessions this week — that's your prescribed dose.`);
  else if(a) bits.push(`<b>${a.done}</b> sessions this week against a target of ${a.min}${a.max!==a.min?`–${a.max}`:""}.`);
  const d = planDrift();
  if(d && d.length) bits.push(`Your plan and your log have drifted apart — there's a card on the Program step.`);
  if(!bits.length) return "";
  return `<div class="jimpact"><b>What this changed:</b> ${bits.join(" ")}</div>`;
}

/* Reading back what you DIDN'T do is the half that changes anything — but it gets stated,
   not scolded. Four of six on a bad week is still four, and a checklist that tuts at people
   is a checklist they stop opening. */
function exMissedHTML(e){
  if(!(e.done||[]).length || !(e.plan||[]).length) return "";
  const missed = e.plan.filter(n=>!e.done.includes(n));
  if(!missed.length) return `<div class="jexdone">✓ The whole list. Every one.</div>`;
  return `<div class="jexmiss"><b>Not this time:</b> ${missed.map(n=>esc(exLabel(n))).join(", ")}.</div>`;
}

/* Today's entry, read back as writing rather than swallowed into a table row. */
function journalTodayHTML(){
  const d = ($("#logDate") && $("#logDate").value) || todayISO();
  const e = (state.log||[]).find(x=>x.date === d);
  if(!e) return "";
  const m = moodOf(e.mood);
  return `<div class="jcard jtoday">
    <div class="jtop"><span class="jdate2">${esc(fmtDate(e.date))}</span>
      ${m?`<span class="jmood">${m.icon} ${esc(m.label)}</span>`:""}
      <span class="jtag">${e.pain}/10</span>
      <span class="jsess">${e.sessions} session${e.sessions===1?"":"s"}</span>
      ${(e.done||[]).length?`<span class="jex">✓ ${e.done.length}/${(e.plan||e.done).length} exercises</span>`:""}</div>
    ${e.note?`<div class="jbody">${esc(e.note)}</div>`:`<div class="jbody jempty">No note for this day.</div>`}
    ${exMissedHTML(e)}
    <div class="jfoot">Saved. Edit above and save again to change it.</div>
  </div>`;
}
/* =====================================================================
   PROGRESS PHOTOS
   The most motivating thing in long rehab is seeing month one next to now,
   because nobody can remember how bad week two actually was. But a photo is
   a different kind of data from "pain 4/10", and the differences are the
   whole design:

   - localStorage cannot hold images (5MB, and base64 inflates by a third),
     so these live in IndexedDB. Which means EVERY promise the journal makes
     about export has to be re-earned: the JSON export walks this store too,
     or it is a backup that silently isn't one. That exact lie was fixed once
     already at v105 and is not being reintroduced with pictures.
   - Phone photos carry EXIF, and EXIF carries GPS. Re-encoding through a
     canvas drops every tag as a side effect — the pixels survive, the home
     address does not. That is worth doing even though nothing is uploaded.
   - "Stored on your device only" is the same promise as ever, but the stakes
     are not. Pain 4/10 on a shared laptop is nothing; a photo of someone's
     torso is not nothing. So it is said plainly, at the point of adding.
   - Safari evicts unused site data after ~7 days, IndexedDB included.
     storage.persist() is the actual defence, so we ask for it rather than
     just warning about it.
   ===================================================================== */
const PHOTO_DB = "physiopath-photos", PHOTO_STORE = "photos";
const PHOTO_EDGE = 1280, PHOTO_Q = 0.82;    // plenty for posture/swelling/ROM; ~150-350KB each
let _photoDB = null, _photoBroken = false;

function photoDB(){
  if(_photoDB) return Promise.resolve(_photoDB);
  return new Promise((res, rej) => {
    if(!window.indexedDB) return rej(new Error("no-idb"));
    const rq = indexedDB.open(PHOTO_DB, 1);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      if(!db.objectStoreNames.contains(PHOTO_STORE)){
        const st = db.createObjectStore(PHOTO_STORE, { keyPath:"id" });
        st.createIndex("date", "date", { unique:false });
      }
    };
    rq.onsuccess = () => { _photoDB = rq.result; res(_photoDB); };
    /* Private-mode Firefox and locked-down profiles reject IndexedDB outright. That must
       degrade to "no photos" rather than taking the journal down with it. */
    rq.onerror = () => { _photoBroken = true; rej(rq.error || new Error("idb-open")); };
  });
}
function photoTx(mode){
  return photoDB().then(db => db.transaction(PHOTO_STORE, mode).objectStore(PHOTO_STORE));
}
const _idb = rq => new Promise((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
const photoPut    = rec  => photoTx("readwrite").then(st => _idb(st.put(rec)));
const photoGet    = id   => photoTx("readonly").then(st => _idb(st.get(id)));
const photoDelete = id   => photoTx("readwrite").then(st => _idb(st.delete(id)));
const photoAll    = ()   => photoTx("readonly").then(st => _idb(st.getAll())).then(r => (r||[]).sort((a,b)=>a.date<b.date?-1:(a.date>b.date?1:a.t-b.t)));
const photoClear  = ()   => photoTx("readwrite").then(st => _idb(st.clear()));
const photoForDay = date => photoTx("readonly").then(st => _idb(st.index("date").getAll(date))).then(r => (r||[]).sort((a,b)=>a.t-b.t));
function photoDeleteDay(date){
  return photoForDay(date).then(ps => Promise.all(ps.map(p => photoDelete(p.id))).then(()=>ps.length));
}

/* EXIF orientation is the classic trap: drawImage paints raw pixels, so a portrait photo
   from a phone lands on its side unless the decode applies the tag. Ask for it explicitly,
   and fall back to <img>, where browsers have applied orientation by default for years. */
async function photoDecode(file){
  if(window.createImageBitmap){
    try{ return await createImageBitmap(file, { imageOrientation:"from-image" }); }
    catch(_){ try{ return await createImageBitmap(file); }catch(__){} }
  }
  return await new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload  = () => { URL.revokeObjectURL(u); res(img); };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("decode")); };
    img.src = u;
  });
}
async function photoShrink(file, edge, q){
  const src = await photoDecode(file);
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
  if(!w0 || !h0) throw new Error("decode");
  const s = Math.min(1, edge / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0*s)), h = Math.max(1, Math.round(h0*s));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d").drawImage(src, 0, 0, w, h);
  if(src.close) src.close();
  const blob = await new Promise(r => c.toBlob(r, "image/jpeg", q));
  if(!blob) throw new Error("encode");
  return { blob, w, h };
}
/* Safari drops unused site data after ~7 days and IndexedDB is not exempt, so the entries
   are only as durable as this. Asking is the mitigation; the answer gets reported honestly
   rather than assumed. */
async function photoPersist(){
  try{
    if(!navigator.storage || !navigator.storage.persist) return null;
    if(await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  }catch(_){ return null; }
}
async function photoAdd(file, date){
  if(!/^image\//.test(file.type || "")) { toast("⚠ That isn't an image file."); return null; }
  let sh;
  try{ sh = await photoShrink(file, PHOTO_EDGE, PHOTO_Q); }
  catch(_){ toast("⚠ Couldn't read that image."); return null; }
  const rec = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
                date, blob: sh.blob, w: sh.w, h: sh.h, size: sh.blob.size, t: Date.now() };
  try{ await photoPut(rec); }
  catch(e){
    /* A photo that didn't save must never look like one that did. */
    toast(/quota/i.test(String(e && e.name)) ? "⚠ Out of storage — the photo wasn't saved. Delete a few older ones."
                                             : "⚠ Couldn't save that photo on this device.");
    return null;
  }
  photoPersist();
  return rec;
}
const photoBytes = ps => ps.reduce((n,p)=>n + (p.size || (p.blob && p.blob.size) || 0), 0);
const fmtBytes = n => n < 1024 ? n + " B" : (n < 1048576 ? (n/1024).toFixed(0) + " KB" : (n/1048576).toFixed(1) + " MB");

/* =====================================================================
   EXERCISE TICKS
   "Sessions done: 2" is a number nobody can act on. Ticking the actual
   exercises costs the same effort and answers the question that matters —
   WHICH ones aren't happening. Three sessions a week with the Nordic curls
   quietly dropped every time is not the plan on paper, and the session
   count can never show that.

   Deliberately ADDITIVE: state.sessions still drives adherence() and
   weeklyTarget(). Deriving sessions from ticks would break every entry
   written before today and would also be wrong — one session can cover the
   whole list, so six ticks is not six sessions.
   ===================================================================== */

/* The current phase's exercises across every condition, deduped by name: the same movement
   prescribed for two conditions is one tick, not two. */
function currentPhaseEx(){
  const p = state.program;
  if(!p || !p.items) return [];
  const multi = p.items.length > 1;
  const out = [];
  p.items.forEach(it=>{
    const ph = (it.phases||[]).find(x=>x.current) || (it.phases||[])[0];
    if(!ph) return;
    (ph.ex||[]).forEach(e=>{
      if(!out.some(o=>o.n === e.n)) out.push({ n:e.n, dose:e.d||"", grp: multi ? it.name : "" });
    });
  });
  return out;
}
/* Ticks are keyed on the REAL exercise name so a toggle of Home mode can't orphan a day's
   history — but the label has to match what the Program step shows them, or they're
   hunting for "Dumbbell goblet squat" in a list that says "Backpack goblet squat". */
function exLabel(n){
  if(!state.homeMode || !state.program) return n;
  for(const it of (state.program.items||[]))
    for(const ph of (it.phases||[]))
      for(const e of (ph.ex||[]))
        if(e.n === n){ const s = homeSwap(e); return (s && s.n) || n; }
  return n;
}
/* A skip only counts on a day we have EVIDENCE for: the exercise was on the list AND they
   ticked something. `done:[]` is ambiguous — "I did none of them" and "I never scrolled
   down to the ticks" look identical from here — so a day with no ticks at all proves
   nothing. Undercounting skips is fine; telling someone "you've skipped this 8 sessions
   running" because they don't use the checklist is not. */
function exEvidence(before){
  return (state.log||[]).filter(e => (!before || e.date < before)
    && Array.isArray(e.plan) && e.plan.length
    && Array.isArray(e.done) && e.done.length);
}
/* Consecutive most-recent evidence days where it was prescribed and didn't get done. Stops
   at the first day it wasn't prescribed — a movement added at phase 2 was not "skipped"
   through all of phase 1, it didn't exist yet. That is why `plan` is stored per entry
   rather than compared against today's list. */
function exSkipStreak(name, before){
  const ev = exEvidence(before);
  let n = 0;
  for(let i = ev.length - 1; i >= 0; i--){
    if(!ev[i].plan.includes(name)) break;
    if(ev[i].done.includes(name)) break;
    n++;
  }
  return n;
}
function exSkipStats(){
  const ev = exEvidence();
  if(ev.length < 3) return null;                 // three ticked days is the floor for a pattern
  const rows = currentPhaseEx().map(x=>{
    const offered = ev.filter(e=>e.plan.includes(x.n));
    return { n:x.n, offered:offered.length, did:offered.filter(e=>e.done.includes(x.n)).length,
             streak:exSkipStreak(x.n) };
  }).filter(r=>r.offered >= 3);
  return rows.length ? { days:ev.length, rows } : null;
}
/* Feeds the prompt. Jeffery asking "what's putting you off the split squats?" is the whole
   point of the ticks — the data is useless if it only ever renders as a pill. */
function exSkipLine(){
  const s = exSkipStats();
  if(!s) return "no exercise-level ticks yet (they may not be using the checklist — do not infer skipping from this)";
  const rows = s.rows.slice().sort((a,b)=>(a.did/a.offered)-(b.did/b.offered));
  return `across ${s.days} ticked sessions — ` + rows.map(r=>
    `${r.n}: done ${r.did}/${r.offered}${r.streak>=2?`, skipped the last ${r.streak}`:""}`).join(" | ");
}
/* The list currently on screen, in order. collectEntry() stores THIS rather than
   re-deriving the phase, so what gets recorded is exactly what they ticked against. */
let _logExOffer = [];
function renderLogEx(d){
  const host = $("#logExList"); if(!host) return;
  const e = (state.log||[]).find(x=>x.date === d);
  /* A past day shows the list that was prescribed THEN. Phases advance and exercises get
     rotated, so re-labelling an old entry with today's list would quietly rewrite history. */
  const stored = e && Array.isArray(e.plan) && e.plan.length;
  const list = stored ? e.plan.map(n=>({ n, dose:"", grp:"" })) : currentPhaseEx();
  _logExOffer = list.map(x=>x.n);
  const wrap = $("#logEx");
  if(wrap) wrap.classList.toggle("hide", !list.length);
  if(!list.length){ host.innerHTML = ""; return; }

  const done = new Set(state.logDone||[]);
  const today = d === todayISO();
  let grp = "";
  host.innerHTML = list.map(x=>{
    let head = "";
    if(x.grp && x.grp !== grp){ grp = x.grp; head = `<li class="exgrp">${esc(grp)}</li>`; }
    const on = done.has(x.n);
    const st = today ? exSkipStreak(x.n, d) : 0;      // a streak pill on a day you're editing months later is noise
    return `${head}<li class="extick${on?" on":""}">
      <label><input type="checkbox" data-n="${esc(x.n)}"${on?" checked":""} />
        <span class="extbox" aria-hidden="true"></span>
        <span class="extmain"><span class="extn">${esc(exLabel(x.n))}</span>${x.dose?`<span class="extd">${esc(x.dose)}</span>`:""}</span>
        ${st>=3?`<span class="skippill" title="Not ticked on your last ${st} sessions. Worth a line about why — that's more useful than doing it badly.">skipped ${st}×</span>`:""}
      </label></li>`;
  }).join("");
  syncLogExSum();
}
function syncLogExSum(){
  const el = $("#logExSum"); if(!el) return;
  const n = (state.logDone||[]).filter(x=>_logExOffer.includes(x)).length;
  el.textContent = n ? `→ ${n} of ${_logExOffer.length} ticked`
                     : "→ shows which exercises keep getting skipped";
}

/* ---------------------------------------------------------------------
   PHOTO UI. Object URLs are revoked on every re-render — a diary left open
   for an hour of scrolling would otherwise leak a blob per thumbnail.
   --------------------------------------------------------------------- */
let _photoURLs = [];
function photoURL(blob){ const u = URL.createObjectURL(blob); _photoURLs.push(u); return u; }
function photoRevoke(){ _photoURLs.forEach(u=>{ try{ URL.revokeObjectURL(u) }catch(_){} }); _photoURLs = []; }

async function renderPhotos(d){
  const host = $("#logPhotoList"); if(!host) return;
  const wrap = $("#logPhotos");
  if(_photoBroken || !window.indexedDB){
    if(wrap) wrap.classList.add("hide");
    return;
  }
  let ps = [], all = [];
  try{ ps = await photoForDay(d); all = await photoAll(); }
  catch(_){ if(wrap) wrap.classList.add("hide"); return; }
  if(wrap) wrap.classList.remove("hide");
  photoRevoke();
  const sum = $("#logPhotoSum");
  if(sum) sum.textContent = all.length
    ? `→ ${all.length} photo${all.length===1?"":"s"} · ${fmtBytes(photoBytes(all))}`
    : "→ month one next to now is the thing you can't remember";
  host.innerHTML = ps.length ? ps.map(p=>`
    <figure class="pthumb">
      <img src="${photoURL(p.blob)}" alt="Progress photo from ${esc(fmtDate(p.date))}" loading="lazy" />
      <figcaption>${esc(fmtTime(p.t))}</figcaption>
      <button type="button" class="pdel" data-id="${esc(p.id)}" title="Delete this photo" aria-label="Delete this photo">✕</button>
    </figure>`).join("")
    : `<li class="pempty">No photos for this day.</li>`;
  renderPhotoCompare(all);
}
/* The payoff. Two photos far enough apart to show something, captioned with the gap —
   "you can't remember week two" is the entire reason this feature exists. */
function renderPhotoCompare(all){
  const host = $("#photoCompare"); if(!host) return;
  if(!all || all.length < 2 || all[0].date === all[all.length-1].date){ host.innerHTML = ""; return; }
  const a = all[0], b = all[all.length-1];
  const days = Math.round((new Date(b.date+"T12:00:00") - new Date(a.date+"T12:00:00")) / 864e5);
  const span = days >= 60 ? `${Math.round(days/30)} months` : (days >= 14 ? `${Math.round(days/7)} weeks` : `${days} days`);
  host.innerHTML = `<div class="pcompare">
    <div class="pcmphead"><b>${esc(span)} apart</b> — ${esc(fmtDate(a.date))} → ${esc(fmtDate(b.date))}</div>
    <div class="pcmprow">
      <figure><img src="${photoURL(a.blob)}" alt="Progress photo from ${esc(fmtDate(a.date))}" /><figcaption>Then</figcaption></figure>
      <figure><img src="${photoURL(b.blob)}" alt="Progress photo from ${esc(fmtDate(b.date))}" /><figcaption>Now</figcaption></figure>
    </div></div>`;
}
async function addPhotos(files, d){
  const list = [...files];
  if(!list.length) return;
  let added = 0;
  for(const f of list){ if(await photoAdd(f, d)) added++; }
  if(!added) return;
  await renderPhotos(d);
  const p = await photoPersist();
  /* Say it once, on the first photo, and say what it actually means. */
  if(!state.photoNoted){
    state.photoNoted = true; save();
    toast(p === false
      ? "Saved on this device. ⚠ Your browser may clear it if you don't open the app for a while — export to keep a copy."
      : "Saved on this device only. Export the journal to keep a copy.");
  } else toast(added === 1 ? "Photo added." : added + " photos added.");
}

/* `date` is the day the entry is ABOUT; `t`/`edited` are when it was actually written and
   last touched. Those are different things the moment someone catches up a missed day —
   an entry dated Saturday and written on Monday should say so rather than pretend. */
function collectEntry(d){
  const prev = (state.log||[]).find(e=>e.date === d);
  const now = Date.now();
  const done = (state.logDone||[]).filter(n=>_logExOffer.includes(n));   // keep done ⊆ plan
  const entry = {
    date: d,
    mood: state.logMood || "",
    pain: parseInt($("#logPain").value),
    sessions: Math.max(0, parseInt($("#logSessions").value)||0),
    note: $("#logNote").value.trim(),
    t: (prev && prev.t) || now,          // first written — never overwritten
    edited: now
  };
  /* Only record the offered list when they actually ticked against it. Stamping today's
     phase onto a three-week-old entry nobody ticked would invent a plan they never saw,
     and exEvidence() would then read every blank as a skip. done and plan rise and fall
     together, so an entry either carries real tick data or carries none. */
  if(done.length){ entry.done = done; entry.plan = _logExOffer.slice(); }
  return entry;
}
/* Anything worth keeping? Don't create an entry because someone tabbed past the page.
   AUTOSAVE is stricter than the Save button, and it has to be: #logSessions is PRE-FILLED
   with 1, so "sessions > 0" is true on a page nobody has touched — opening a day and
   typing nothing would silently create an entry. A pre-filled default is not user intent.
   Only the note and the mood are, so autosave requires one of those. Pressing Save is
   itself intent, so that will still record a day of "1 session" and no words. */
function entryHasContent(e, strict){
  if(e.note || e.mood) return true;
  if((e.done||[]).length) return true;    // ticking a box is intent; a pre-filled `1` is not
  if(!strict && e.sessions > 0) return true;
  return false;
}
function writeEntry(d, opts){
  const entry = collectEntry(d);
  const i = state.log.findIndex(e=>e.date===entry.date);
  if(i < 0 && !entryHasContent(entry, !!(opts && opts.auto))) return { skipped:true };
  if(i>=0) state.log[i]=entry; else state.log.push(entry);
  state.log.sort((a,b)=>a.date<b.date?-1:1);
  return { wrote: save(), isNew: i < 0, entry };
}
function saveLogEntry(){
  /* The date is chosen, not assumed — a journal you can't catch up in gets abandoned
     after the first missed day, and the old code hard-coded todayISO(). */
  const d = ($("#logDate") && $("#logDate").value) || todayISO();
  if(d > todayISO()){ toast("That date is in the future."); return; }
  const r = writeEntry(d);
  if(r.skipped){ toast("Nothing to save yet — write a line, or pick how the day went."); return; }
  /* Deliberately NOT clearing the note: it is the thing they wrote, and wiping it
     told them it was disposable. journalTodayHTML() reads it straight back. */
  renderProgress(); renderJournalToday(); renderSaveState("saved");
  syncPlanFromLog();
  if(!r.wrote) toast("⚠ Couldn't save - your browser storage is full or blocked.");
  else if(!r.isNew) toast("Updated your entry for " + fmtDate(d) + ".");
  else toast(d===todayISO() ? "Saved today's entry." : "Saved — caught up " + fmtDate(d) + ".");
}

/* ---------------------------------------------------------------------
   AUTOSAVE. Losing a page you just wrote is the fastest way to stop someone
   journalling for good, and "click Save or lose it" is a bad deal for a diary.
   Debounced so it writes when they PAUSE, not on every keystroke, and it does
   NOT re-render the entry list underneath the cursor while they type — the
   full render happens on explicit save or when they leave the day.
   --------------------------------------------------------------------- */
let _autoT = null, _autoDirty = false;
function renderSaveState(k){
  const el = $("#logSaveState"); if(!el) return;
  const d = ($("#logDate") && $("#logDate").value) || todayISO();
  const e = (state.log||[]).find(x=>x.date === d);
  if(k === "saving"){ el.textContent = "Saving…"; el.className = "savestate saving"; return; }
  if(k === "dirty"){ el.textContent = "Unsaved changes"; el.className = "savestate dirty"; return; }
  if(!e){ el.textContent = ""; el.className = "savestate"; return; }
  const when = e.edited || e.t;
  el.textContent = when ? "Saved " + fmtTime(when) : "Saved";
  el.className = "savestate saved";
}
function autosaveSoon(){
  _autoDirty = true;
  renderSaveState("dirty");
  clearTimeout(_autoT);
  _autoT = setTimeout(autosaveNow, 1200);
}
function autosaveNow(){
  clearTimeout(_autoT);
  if(!_autoDirty) return;
  const d = ($("#logDate") && $("#logDate").value) || todayISO();
  if(d > todayISO()) return;
  renderSaveState("saving");
  const r = writeEntry(d, { auto:true });
  _autoDirty = false;
  if(r.skipped){ renderSaveState(); return; }
  renderSaveState(r.wrote ? "saved" : "dirty");
  if(!r.wrote) toast("⚠ Couldn't autosave — storage is full or blocked. Copy your text somewhere safe.");
  renderJournalToday();
}
/* An entry dated Saturday but written on Monday should say so — that is what the timestamp
   is FOR. Silence would imply it was written on the day. */
function writtenLabel(e){
  if(!e.t) return "";
  const wrote = isoOf(new Date(e.t));
  if(wrote === e.date) return "written " + fmtTime(e.t);
  const n = Math.round((new Date(wrote+"T12:00:00") - new Date(e.date+"T12:00:00")) / 864e5);
  return n === 1 ? "written next day" : (n > 1 ? `written ${n} days later` : "written " + fmtTime(e.t));
}
const fmtTime = ms => { const d = new Date(ms);
  return isNaN(d) ? "" : d.toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" }); };
function renderJournalToday(){
  const host = $("#journalToday"); if(host) host.innerHTML = journalTodayHTML() + logImpactHTML();
  const d = ($("#logDate") && $("#logDate").value) || todayISO();
  if(typeof renderDiaryHead === "function") renderDiaryHead(d);   // keep the page's own date line honest
}
/* A new precaution (e.g. a logged hypertensive crisis) is a SAFETY change and applies at once.
   A pain shift only offers a rebuild, because rebuilding throws away the user's own edits. */
function syncPlanFromLog(){
  if(!state.program) return;
  const before = new Set((state.program.builtFrom||{}).flags ? state.program.builtFrom.flags.split(",") : []);
  const added = gatherFlags().filter(f=>!before.has(f));
  if(added.length){
    state.program = generateProgram(); save();
    if(state.step===4) renderProgram(state.program);
    toast("⚠ What you logged changed your precautions — your plan has been updated.");
  }
  renderDriftNote();
}
/* Shown on the Program step when the log and the plan have drifted apart. */
function driftNoteHTML(){
  const d = planDrift(); if(!d) return "";
  return `<div class="card driftcard no-print"><h2>📊 Your log says something different</h2>
    <ul class="driftlist">${d.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    <p class="hint">Rebuilding re-picks your exercises from the protocol — any you've rotated, swapped, added or removed will go back to the recommended set.</p>
    <button class="btn primary" id="driftRebuild">Update my plan to match</button></div>`;
}
function renderDriftNote(){
  const host = $("#driftNote"); if(!host) return;
  host.innerHTML = driftNoteHTML();
  const b = $("#driftRebuild");
  if(b) b.onclick = () => { state.program = generateProgram(); save(); renderProgram(state.program); renderDriftNote();
    toast("Plan updated from your log."); };
}
function deleteLog(date){
  const removed = (state.log||[]).find(e=>e.date===date);
  state.log=state.log.filter(e=>e.date!==date); save(); renderProgress(); renderJournalToday(); syncPlanFromLog();
  if(removed) toast("Entry deleted.", { label:"Undo", fn:()=>{
    state.log.push(removed); state.log.sort((a,b)=>a.date<b.date?-1:1);
    save(); renderProgress(); renderJournalToday(); syncPlanFromLog();
  }});
}

/* The plan asks for N sessions/week and nothing ever checked. sessionsText() returns prose,
   so there was no number to compare the log against — weeklyTarget() parses one out. */
function adherenceHTML(){
  const a = adherence(); if(!a) return "";
  const label = a.status==="on-track" ? "on track" : (a.status==="slightly-behind" ? "just under" : "behind");
  const msg = a.status==="on-track"
    ? "That's your prescribed dose — this is what makes the plan work."
    : (a.status==="slightly-behind"
        ? "Close. Short and frequent beats long and occasional."
        : "Rehab only works at the dose it's prescribed at. If the plan doesn't fit your week, shorten the sessions rather than skipping them — or tell Jeffery and he'll help you trim it.");
  return `<div class="adhrow ${a.status}">
    <div class="adhtop"><b>${a.done}</b> session${a.done===1?"":"s"} logged in the last 7 days · target <b>${a.min}${a.max!==a.min?`–${a.max}`:""}</b> — <span class="adhtag">${label}</span></div>
    <div class="adhmsg">${msg}</div></div>`;
}
function renderProgress(){
  const body=$("#progressBody"); const log=state.log;
  if(!log.length){
    body.innerHTML=`<div class="empty"><div class="big">📈</div><div>No entries yet — log your first session above.</div></div>`;
    return;
  }
  const totalSessions=log.reduce((a,e)=>a+e.sessions,0);
  const last = log[log.length-1].pain;              // still shown as the "Current pain" stat
  const _t = painTrend(log);
  const trendCls=_t.cls, trendTxt=_t.txt;
  const streak=computeStreak(log);

  /* "Day streak: 0" lands hardest on the person having the worst week, which is exactly
     backwards in rehab — flares are part of it. Same information, without the punishment. */
  const rec = loggedRecently(14);
  /* Months of entries are useless if you can't find anything in them. */
  const jq = ($("#journalSearch") && $("#journalSearch").value.trim()) || "";
  const shown = jq ? journalSearch(jq, 200) : log.slice().reverse();
  const cnt = $("#journalSearchCount");
  if(cnt) cnt.textContent = jq ? `${shown.length} of ${log.length} entries` : "";
  body.innerHTML = `
    ${adherenceHTML()}
    <div class="progstats">
      <div class="stat"><div class="k">Entries</div><div class="v">${log.length}</div></div>
      <div class="stat"><div class="k">Sessions logged</div><div class="v">${totalSessions}</div></div>
      <div class="stat"><div class="k">Recent pain</div><div class="v">${(recentPain()||{mean:last}).mean}/10</div></div>
      <div class="stat"><div class="k">Logged</div><div class="v">${rec.hit}<span class="statsub">/${rec.of} days</span></div></div>
    </div>
    <div class="progtrend"><span class="trendtag ${trendCls}">${trendTxt}</span>
      ${streak>1?`<span class="streaksoft">${streak} in a row 🔥</span>`:""}</div>
    ${jq ? `<div class="jsearchnote">${shown.length ? `Everything you've written mentioning “${esc(jq)}”, best match first.` : `Nothing you've written mentions “${esc(jq)}”.`}</div>` : `<div class="chartwrap">${painChartSVG(log)}</div>`}
    <div class="jlist">${
      shown.map(e=>{ const m=moodOf(e.mood); return `<div class="jcard">
        <div class="jtop"><span class="jdate2">${esc(fmtDate(e.date))}</span>
          ${m?`<span class="jmood">${m.icon} ${esc(m.label)}</span>`:""}
          <span class="jtag">${e.pain}/10</span>
          <span class="jsess">${e.sessions} session${e.sessions===1?"":"s"}</span>
          ${e.t?`<span class="jwhen">${esc(writtenLabel(e))}</span>`:""}
          <button type="button" class="lx" data-date="${e.date}" title="Delete this entry" aria-label="Delete entry for ${esc(fmtDate(e.date))}">✕</button></div>
        ${e.note?`<div class="jbody">${esc(e.note)}</div>`:""}
      </div>`; }).join("")
    }</div>`;
  $$("#progressBody .lx").forEach(x=>x.onclick=()=>{ if(confirm("Delete this entry?")) deleteLog(x.dataset.date); });
}
function computeStreak(log){
  // consecutive calendar days ending today (or last entry) with an entry
  const set=new Set(log.map(e=>e.date));
  let streak=0, d=new Date(todayISO()+"T00:00:00");
  if(!set.has(todayISO())) d.setDate(d.getDate()-1); // allow streak to count up to yesterday
  for(;;){ const key=isoOf(d); if(set.has(key)){ streak++; d.setDate(d.getDate()-1);} else break; }   // isoOf, not toISOString: d is local midnight
  return streak;
}
function painChartSVG(log){
  const W=700,H=180,padL=28,padR=12,padT=14,padB=24;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const n=log.length;
  const x=i=> n<=1 ? padL+plotW/2 : padL + (i/(n-1))*plotW;
  const y=p=> padT + ((10-p)/10)*plotH;                 // pain 10 top, 0 bottom
  const pts=log.map((e,i)=>[x(i),y(e.pain)]);
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area=`M${pts[0][0].toFixed(1)} ${(padT+plotH).toFixed(1)} `+
    pts.map(p=>"L"+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ")+
    ` L${pts[pts.length-1][0].toFixed(1)} ${(padT+plotH).toFixed(1)} Z`;
  const grid=[0,5,10].map(v=>{ const gy=y(v);
    return `<line class="grid" x1="${padL}" y1="${gy}" x2="${W-padR}" y2="${gy}"/>`+
      `<text class="axislbl" x="4" y="${gy+3}">${v}</text>`; }).join("");
  const dots=pts.map(p=>`<circle class="dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"/>`).join("");
  const xlabels = n>1
    ? `<text class="axislbl" x="${padL}" y="${H-6}">${fmtDate(log[0].date).replace(/,.*/,"")}</text>`+
      `<text class="axislbl" x="${W-padR}" y="${H-6}" text-anchor="end">${fmtDate(log[n-1].date).replace(/,.*/,"")}</text>`
    : "";
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Pain over time">
    ${grid}${n>1?`<path class="area" d="${area}"/>`:""}${n>1?`<path class="line" d="${line}"/>`:""}${dots}${xlabels}
    <text class="axislbl" x="4" y="10">pain</text></svg>`;
}

/* =====================================================================
   HEALTH TRACKING — vitals log & trend · lab values · risk assessment
   Educational only, not a diagnosis. Everything stays on the device.
===================================================================== */
const VITAL_METRICS = [
  { k:"sbp",     label:"Systolic BP",  unit:"mmHg", good:"down" },
  { k:"dbp",     label:"Diastolic BP", unit:"mmHg", good:"down" },
  { k:"restHR",  label:"Resting HR",   unit:"bpm",  good:"down" },
  { k:"spo2",    label:"SpO₂",         unit:"%",    good:"up" },
  { k:"glucose", label:"Glucose",      unit:"mg/dL",good:"down" },
  { k:"weight",  label:"Weight",       unit:"kg",   good:"neutral" },
  { k:"temp",    label:"Temp",         unit:"°C",   good:"neutral" },
  { k:"steps",   label:"Steps",        unit:"",     good:"up" }
];
let healthChartMetric = "sbp";

/* Latest known vitals — most recent log entry, falling back to History baseline. */
function latestVitals(){
  const base = state.vitals||{};
  const log = state.vitalsLog||[];
  const last = log.length ? log[log.length-1] : {};
  const pick = k => (last[k]!==undefined && last[k]!=="" && last[k]!=null) ? last[k] : base[k];
  return { restHR:pick("restHR"), sbp:pick("sbp"), dbp:pick("dbp"), spo2:pick("spo2"), rr:pick("rr"),
           weight:pick("weight"), height:base.height, glucose:pick("glucose"), temp:pick("temp") };
}

function saveVitalsEntry(){
  const g = id => { const el=$(id); return el?el.value.trim():""; };
  const entry = { date: $("#vlDate").value || todayISO(), restHR:g("#vlHR"), sbp:g("#vlSBP"), dbp:g("#vlDBP"),
    spo2:g("#vlSpo2"), weight:g("#vlWeight"), glucose:g("#vlGlucose"), temp:g("#vlTemp"), steps:g("#vlSteps") };
  if(!["restHR","sbp","dbp","spo2","weight","glucose","temp","steps"].some(k=>entry[k]!=="")){ toast("Enter at least one vital first."); return; }
  state.vitalsLog = state.vitalsLog||[];
  const i = state.vitalsLog.findIndex(e=>e.date===entry.date);
  if(i>=0) state.vitalsLog[i]=entry; else state.vitalsLog.push(entry);
  state.vitalsLog.sort((a,b)=>a.date<b.date?-1:1);
  save(); ["#vlHR","#vlSBP","#vlDBP","#vlSpo2","#vlWeight","#vlGlucose","#vlTemp","#vlSteps"].forEach(id=>{ const el=$(id); if(el) el.value=""; });
  renderVitalsLog(); renderRisks();
  syncPlanFromLog();          // a logged BP crisis must reach the program, not just the risk card
  toast(i>=0 ? "Updated vitals for that date." : "Vitals saved — keep logging to see the trend.");
}
function deleteVitals(date){ state.vitalsLog=(state.vitalsLog||[]).filter(e=>e.date!==date); save(); renderVitalsLog(); renderRisks(); }

