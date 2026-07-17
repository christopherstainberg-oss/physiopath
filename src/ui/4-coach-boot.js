/* =====================================================================
   SMARTWATCH / WEARABLE DATA HARVEST
   1) Web Bluetooth LIVE sync from standard BLE devices — Heart Rate
      (0x180D) for HR/HRV/zone and Pulse Oximeter (0x1822) for SpO₂/PR.
   2) FILE IMPORT (works everywhere, incl. iPhone) from an Apple Health
      export.xml, a .tcx/.gpx workout, or a CSV — pulls HR, SpO₂ & steps.
   Feeds resting HR + SpO₂ into vitals & the vitals log. All on-device.
===================================================================== */
let hrDevice=null, hrChar=null, spo2Char=null, hrLatestBpm=null, hrRRBuffer=[], hrBattery=null,
    spo2Latest=null, prLatest=null, hrHasHR=false, hrHasSpo2=false, hrImport=null;
const BT_HR_SVC=0x180D, BT_HR_MEAS=0x2A37, BT_BATT_SVC=0x180F, BT_BATT=0x2A19,
      BT_PLX_SVC=0x1822, BT_PLX_CONT=0x2A5F, BT_PLX_SPOT=0x2A5E;
function bleSupported(){ return typeof navigator!=="undefined" && !!navigator.bluetooth; }
/* Parse a Heart Rate Measurement (0x2A37) DataView → { bpm, rr[ms] }. */
function parseHeartRate(value){
  const flags = value.getUint8(0); let i = 1, bpm;
  if(flags & 0x01){ bpm = value.getUint16(i, true); i += 2; }   // 16-bit HR
  else { bpm = value.getUint8(i); i += 1; }                     // 8-bit HR
  if(flags & 0x08) i += 2;                                      // energy expended present → skip
  const rr = [];
  if(flags & 0x10){                                            // RR intervals present (1/1024 s each)
    for(; i + 1 < value.byteLength; i += 2) rr.push(Math.round(value.getUint16(i, true) / 1024 * 1000));
  }
  return { bpm, rr };
}
/* HRV (RMSSD, ms) over the recent RR-interval buffer. */
function hrvFromBuffer(){
  const rr = hrRRBuffer; if(rr.length < 5) return null;
  let sum = 0, n = 0;
  for(let k=1;k<rr.length;k++){ const d = rr[k]-rr[k-1]; sum += d*d; n++; }
  return n ? Math.round(Math.sqrt(sum/n)) : null;
}
/* IEEE-11073 16-bit SFLOAT (used by the Pulse Oximeter characteristics). */
function parseSFLOAT(dv, off){
  const raw = dv.getUint16(off, true);
  let mant = raw & 0x0FFF, exp = (raw>>12)&0x0F;
  if(exp>=0x8) exp -= 0x10;                 // signed 4-bit exponent
  if(mant>=0x0800) mant -= 0x1000;          // signed 12-bit mantissa
  return mant * Math.pow(10, exp);
}
/* Parse a PLX Continuous (0x2A5F) or Spot-check (0x2A5E) measurement → {spo2, pr}.
   Both start: flags(1) · SpO₂ SFLOAT · PulseRate SFLOAT. */
function parsePLX(value){
  try{
    const spo2 = parseSFLOAT(value, 1), pr = parseSFLOAT(value, 3);
    const s = (isFinite(spo2)&&spo2>=40&&spo2<=100) ? Math.round(spo2) : null;
    const p = (isFinite(pr)&&pr>=25&&pr<=300) ? Math.round(pr) : null;
    return { spo2:s, pr:p };
  }catch(e){ return { spo2:null, pr:null }; }
}
/* Live training-zone label for a bpm, using the user's HR zones. */
function liveZoneLabel(bpm, z){
  if(bpm==null) return `<span class="hrzone">Waiting for a reading…</span>`;
  if(!z) return `<span class="hrzone">${bpm} bpm — add your <b>age</b> in History for training zones.</span>`;
  const cap = z.deviceCap;
  const inR = r => bpm>=r[0] && bpm<=r[1];
  let zone="", cls="";
  if(bpm < z.zones.warmup[0]){ zone="Below warm-up · very light"; cls="zw"; }
  else if(inR(z.zones.warmup)){ zone="Warm-up · very light"; cls="zw"; }
  else if(inR(z.zones.moderate)){ zone="Moderate · building fitness"; cls="zm"; }
  else if(bpm > z.zones.vigorous[1]){ zone="Above vigorous · ease off"; cls="zv"; }
  else { zone="Vigorous · only as cleared"; cls="zv"; }
  const capWarn = (cap && bpm >= cap) ? ` <span class="hrzcap">⚠ at/over your device limit (${cap} bpm)</span>` : "";
  return `<span class="hrzone ${cls}">${zone}</span>${capWarn}`;
}
function hrLiveHTML(){
  const z=hrZones(), hrv=hrvFromBuffer();
  const bpmBlock = hrHasHR ? `<div class="hrbignum"><span id="hrLiveBpm">${hrLatestBpm!=null?hrLatestBpm:"—"}</span> <small>bpm</small></div>
      <div class="hrlivezone" id="hrLiveZone">${liveZoneLabel(hrLatestBpm, z)}</div>
      <div class="hrlivehrv"><span id="hrLiveHrv">${hrv!=null?`HRV (RMSSD): <b>${hrv}</b> ms`:"Collecting beat-to-beat data for HRV…"}</span></div>` : "";
  const spo2Block = hrHasSpo2 ? `<div class="hrspo2" id="hrLiveSpo2">${spo2Latest!=null?`🫁 SpO₂ <b>${spo2Latest}%</b>${prLatest!=null?` · PR ${prLatest} bpm`:""}`:"🫁 SpO₂ — waiting for a reading…"}</div>` : "";
  return `<div class="hrlive">
      <div class="hrlivetop"><span class="hrlivedev">🟢 ${esc(hrDevice.name||"Monitor")}${hrBattery!=null?` · 🔋 ${hrBattery}%`:""}</span>
        <button class="btn ghost hrdiscbtn" id="hrDisconnectBtn">Disconnect</button></div>
      ${bpmBlock}${spo2Block}
      <div class="hrlivebtns">${hrHasHR?`<button class="btn primary" id="hrUseRestBtn">Set as resting HR</button>`:""}
        <button class="btn ghost" id="hrLogBtn">Log this reading</button></div>
      <p class="hint" style="margin-top:6px">Refreshes as your monitor streams it. <b>Log this reading</b> saves the current ${hrHasHR?"heart rate":""}${hrHasHR&&hrHasSpo2?" &amp; ":""}${hrHasSpo2?"SpO₂":""} to today's vitals log.</p>`;
}
function hrMonitorCardHTML(){
  let live;
  if(!bleSupported()){
    live = `<div class="banner info">Live Bluetooth sync isn't available on this browser (it needs <b>Chrome or Edge</b> on a computer or Android — not iPhone/Safari). Use <b>Import</b> below, which works everywhere.</div>`;
  } else if(!hrDevice){
    live = `<p class="hint">Connect a Bluetooth <b>heart-rate monitor or pulse oximeter</b> (chest strap, band or compatible watch) to stream your <b>live heart rate, training zone, HRV and SpO₂</b> straight in. Nothing leaves your device.</p>
      <button class="btn primary" id="hrConnectBtn">⌚ Connect a monitor / smartwatch</button>
      <p class="hint" style="margin-top:8px">Works with standard BLE devices (Polar, Wahoo, pulse oximeters, many watches). Apple&nbsp;Watch, Fitbit &amp; Garmin keep data in their own apps — use <b>Import</b> for those.</p>`;
  } else {
    live = hrLiveHTML();
  }
  const imp = `<b class="hrsech">⬆ Import from a watch / health-app export</b>
    <p class="hint">Bulk-import from a <b>file</b> — works on any device, including iPhone. Accepts an Apple&nbsp;Health <b>export.xml</b> (unzip the export first), a workout <b>.tcx</b>/<b>.gpx</b>, or a <b>.csv</b> with HR / SpO₂ / steps columns. Read on your device only.</p>
    <label class="hrimportbtn" for="hrFile">⬆ Choose an export file</label>
    <input type="file" id="hrFile" accept=".xml,.tcx,.gpx,.csv,.tsv,.txt,application/xml,text/xml,text/csv,text/plain" hidden />
    <div id="hrImportReview"></div>`;
  return `<div class="hrsec"><b class="hrsech">📡 Live sync (Bluetooth)</b>${live}</div>
    <div class="hrdiv"></div>
    <div class="hrsec">${imp}</div>`;
}
function renderHRMonitor(){
  const host = $("#hrMonitorOut"); if(!host) return;
  host.innerHTML = hrMonitorCardHTML();
  const c=$("#hrConnectBtn"); if(c) c.onclick = connectHRMonitor;
  const d=$("#hrDisconnectBtn"); if(d) d.onclick = disconnectHRMonitor;
  const r=$("#hrUseRestBtn"); if(r) r.onclick = ()=>{
    if(hrLatestBpm==null){ toast("No reading yet — give your monitor a moment."); return; }
    (state.vitals = state.vitals||{}).restHR = String(hrLatestBpm); save();
    toast(`Resting HR set to ${hrLatestBpm} bpm from your monitor.`);
  };
  const l=$("#hrLogBtn"); if(l) l.onclick = logHRReading;
  const f=$("#hrFile"); if(f) f.onchange = onHRFile;
  if(hrImport) renderImportReview();
}
async function connectHRMonitor(){
  if(!bleSupported()){ toast("Web Bluetooth isn't available on this browser."); return; }
  try{
    const dev = await navigator.bluetooth.requestDevice({
      filters:[{ services:[BT_HR_SVC] }, { services:[BT_PLX_SVC] }],
      optionalServices:[BT_BATT_SVC, BT_HR_SVC, BT_PLX_SVC]
    });
    hrDevice=dev; hrLatestBpm=null; hrRRBuffer=[]; hrBattery=null; spo2Latest=null; prLatest=null; hrHasHR=false; hrHasSpo2=false;
    dev.addEventListener("gattserverdisconnected", onHRDisconnected);
    const server = await dev.gatt.connect();
    // Heart Rate (0x180D)
    try{ const s=await server.getPrimaryService(BT_HR_SVC); hrChar=await s.getCharacteristic(BT_HR_MEAS);
      hrChar.addEventListener("characteristicvaluechanged", onHRNotify); await hrChar.startNotifications(); hrHasHR=true; }catch(e){}
    // Pulse Oximeter / SpO₂ (0x1822)
    try{ const s=await server.getPrimaryService(BT_PLX_SVC);
      let ch; try{ ch=await s.getCharacteristic(BT_PLX_CONT); }catch(e){ ch=await s.getCharacteristic(BT_PLX_SPOT); }
      spo2Char=ch; ch.addEventListener("characteristicvaluechanged", onSpo2Notify); await ch.startNotifications(); hrHasSpo2=true; }catch(e){}
    try{ const b=await server.getPrimaryService(BT_BATT_SVC); const bc=await b.getCharacteristic(BT_BATT); hrBattery=(await bc.readValue()).getUint8(0); }catch(e){}
    renderHRMonitor();
    if(!hrHasHR && !hrHasSpo2) toast("Connected, but this device doesn't expose a standard heart-rate or SpO₂ service.");
    else toast(`Connected to ${dev.name||"your monitor"} — live ${[hrHasHR&&"heart rate", hrHasSpo2&&"SpO₂"].filter(Boolean).join(" & ")} incoming.`);
  }catch(err){
    if(err && (err.name==="NotFoundError" || err.name==="AbortError")) return;   // user closed the chooser
    toast("Couldn't connect: "+((err&&err.message)||"unknown error"));
  }
}
function onHRNotify(e){
  const { bpm, rr } = parseHeartRate(e.target.value);
  hrLatestBpm = bpm;
  if(rr && rr.length){ hrRRBuffer.push(...rr); if(hrRRBuffer.length>60) hrRRBuffer = hrRRBuffer.slice(-60); }
  const bpmEl=$("#hrLiveBpm"); if(bpmEl) bpmEl.textContent = bpm!=null?bpm:"—";
  const zEl=$("#hrLiveZone"); if(zEl) zEl.innerHTML = liveZoneLabel(bpm, hrZones());
  const hrv=hrvFromBuffer(); const hEl=$("#hrLiveHrv"); if(hEl) hEl.innerHTML = hrv!=null?`HRV (RMSSD): <b>${hrv}</b> ms`:"Collecting beat-to-beat data for HRV…";
}
function onSpo2Notify(e){
  const { spo2, pr } = parsePLX(e.target.value);
  if(spo2!=null) spo2Latest = spo2;
  if(pr!=null) prLatest = pr;
  const el=$("#hrLiveSpo2"); if(el) el.innerHTML = spo2Latest!=null?`🫁 SpO₂ <b>${spo2Latest}%</b>${prLatest!=null?` · PR ${prLatest} bpm`:""}`:"🫁 SpO₂ — waiting for a reading…";
}
function logHRReading(){
  if(hrLatestBpm==null && spo2Latest==null){ toast("No reading yet — give your monitor a moment."); return; }
  const patch={}; if(hrLatestBpm!=null) patch.restHR=String(hrLatestBpm); if(spo2Latest!=null) patch.spo2=String(spo2Latest);
  mergeVitalsToday(patch);
  toast("Logged "+[hrLatestBpm!=null?hrLatestBpm+" bpm":"", spo2Latest!=null?spo2Latest+"% SpO₂":""].filter(Boolean).join(" · ")+" to today's vitals.");
}
/* Merge a partial reading into today's vitals-log entry. */
function mergeVitalsToday(patch){
  if(!patch || !Object.keys(patch).length) return;
  const date=todayISO(); state.vitalsLog=state.vitalsLog||[];
  const i=state.vitalsLog.findIndex(en=>en.date===date);
  if(i>=0) state.vitalsLog[i]={ ...state.vitalsLog[i], ...patch };
  else state.vitalsLog.push({ date, restHR:"", sbp:"", dbp:"", spo2:"", weight:"", glucose:"", temp:"", steps:"", ...patch });
  state.vitalsLog.sort((a,b)=>a.date<b.date?-1:1);
  save(); renderVitalsLog(); renderRisks();
}
function disconnectHRMonitor(){
  try{ if(hrChar) hrChar.removeEventListener("characteristicvaluechanged", onHRNotify); }catch(e){}
  try{ if(spo2Char) spo2Char.removeEventListener("characteristicvaluechanged", onSpo2Notify); }catch(e){}
  try{ if(hrDevice && hrDevice.gatt && hrDevice.gatt.connected) hrDevice.gatt.disconnect(); }catch(e){}
  onHRDisconnected();
  toast("Monitor disconnected.");
}
function onHRDisconnected(){
  hrDevice=null; hrChar=null; spo2Char=null; hrLatestBpm=null; hrRRBuffer=[]; hrBattery=null; spo2Latest=null; prLatest=null; hrHasHR=false; hrHasSpo2=false;
  renderHRMonitor();
}
/* ---- File import: Apple Health export.xml · TCX · GPX · CSV ---- */
function onHRFile(e){
  const f = e.target.files && e.target.files[0]; if(!f) return;
  const rev=$("#hrImportReview"); if(rev) rev.innerHTML=`<div class="banner info">Reading ${esc(f.name)}…</div>`;
  const reader=new FileReader();
  reader.onload=()=>{ try{ hrImport=parseHealthFile(f.name, String(reader.result||"")); renderImportReview(); }
    catch(err){ if(rev) rev.innerHTML=`<div class="banner clear">Couldn't read that file: ${esc((err&&err.message)||"unknown")}.</div>`; } };
  reader.onerror=()=>{ if(rev) rev.innerHTML=`<div class="banner clear">Couldn't read the file.</div>`; };
  reader.readAsText(f);
  e.target.value="";
}
function parseHealthFile(name, text){
  const out={ source:"", hr:[], restingHR:null, spo2:[], steps:0 };
  const pushHR=v=>{ v=+v; if(v>20&&v<250) out.hr.push(v); };
  const pushSpo2=v=>{ v=+v; if(v<=1) v*=100; if(v>=50&&v<=100) out.spo2.push(Math.round(v)); };
  if(/HKQuantityTypeIdentifier|<HealthData/.test(text)){                       // Apple Health export.xml
    out.source="Apple Health export";
    const re=/<Record\b[^>]*?\/?>/g; let m;
    while((m=re.exec(text))){ const tag=m[0];
      const type=(tag.match(/type="([^"]+)"/)||[])[1]; const val=(tag.match(/value="([\d.]+)"/)||[])[1];
      if(!type || val==null) continue;
      if(type==="HKQuantityTypeIdentifierHeartRate") pushHR(val);
      else if(type==="HKQuantityTypeIdentifierRestingHeartRate") out.restingHR=Math.round(+val);
      else if(type==="HKQuantityTypeIdentifierOxygenSaturation") pushSpo2(val);
      else if(type==="HKQuantityTypeIdentifierStepCount") out.steps+=+val;
    }
  } else if(/TrainingCenterDatabase|HeartRateBpm/.test(text)){                 // TCX workout
    out.source="TCX workout"; let m; const re=/<HeartRateBpm[^>]*>\s*<Value>\s*([\d.]+)\s*<\/Value>/g;
    while((m=re.exec(text))) pushHR(m[1]);
  } else if(/<gpx|TrackPointExtension|<trkpt/i.test(text)){                     // GPX workout
    out.source="GPX workout"; let m; const re=/<(?:[a-z0-9]+:)?hr>\s*([\d.]+)\s*<\/(?:[a-z0-9]+:)?hr>/gi;
    while((m=re.exec(text))) pushHR(m[1]);
  } else {                                                                     // CSV / TSV / table
    out.source="CSV / table";
    const lines=text.split(/\r?\n/).filter(l=>l.trim());
    if(lines.length){
      const delim = lines[0].includes("\t")?"\t":(lines[0].includes(";")&&!lines[0].includes(",")?";":",");
      const hdr=lines[0].split(delim).map(h=>h.trim().toLowerCase().replace(/^"|"$/g,""));
      const find=re=>hdr.findIndex(h=>re.test(h));
      const iHR=find(/heart|(^|\W)hr($|\W)|bpm/), iSpo=find(/spo2|oxygen|sao2|sp02/), iStep=find(/step/), iRest=find(/resting/);
      for(let r=1;r<lines.length;r++){ const c=lines[r].split(delim).map(x=>x.replace(/^"|"$/g,""));
        if(iHR>=0 && c[iHR]) pushHR(c[iHR]);
        if(iSpo>=0 && c[iSpo]) pushSpo2(c[iSpo]);
        if(iStep>=0 && +c[iStep]>0) out.steps+=+c[iStep];
        if(iRest>=0 && +c[iRest]>20) out.restingHR=Math.round(+c[iRest]);
      }
    }
  }
  if(out.restingHR==null && out.hr.length) out.restingHR=Math.min(...out.hr);   // fall back to lowest HR
  return out;
}
function importAvg(arr){ return arr && arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null; }
function renderImportReview(){
  const rev=$("#hrImportReview"); if(!rev) return;
  const d=hrImport; if(!d){ rev.innerHTML=""; return; }
  const avgHR=importAvg(d.hr), maxHR=d.hr.length?Math.max(...d.hr):null, avgSpo2=importAvg(d.spo2);
  const rows=[];
  if(d.restingHR!=null) rows.push(`Resting HR: <b>${d.restingHR}</b> bpm`);
  if(avgHR!=null) rows.push(`Average HR: <b>${avgHR}</b> bpm · Max <b>${maxHR}</b> <span class="sub">(${d.hr.length} readings)</span>`);
  if(avgSpo2!=null) rows.push(`SpO₂: <b>${avgSpo2}%</b> <span class="sub">(${d.spo2.length} readings)</span>`);
  if(d.steps) rows.push(`Steps: <b>${d.steps.toLocaleString()}</b>`);
  if(!rows.length){ rev.innerHTML=`<div class="banner info">No heart-rate, SpO₂ or step data recognised in <b>${esc(d.source||"that file")}</b>. Supported: Apple Health export.xml, a .tcx/.gpx workout, or a CSV with HR / SpO₂ / steps columns.</div>`; return; }
  rev.innerHTML=`<div class="hrreview"><div class="hrreviewhead">Found in ${esc(d.source||"your file")}:</div>
      <ul class="hrreviewlist">${rows.map(r=>`<li>${r}</li>`).join("")}</ul>
      <button class="btn primary" id="hrApplyBtn">Apply to my vitals</button>
      <span class="hint" style="margin-left:8px">Sets your resting HR${avgSpo2!=null?" &amp; SpO₂":""} and logs today.</span></div>`;
  const b=$("#hrApplyBtn"); if(b) b.onclick=applyImport;
}
function applyImport(){
  const d=hrImport; if(!d) return;
  const avgSpo2=importAvg(d.spo2); const v=state.vitals=state.vitals||{}; const applied=[], patch={};
  if(d.restingHR!=null){ v.restHR=String(d.restingHR); patch.restHR=String(d.restingHR); applied.push("resting HR"); }
  if(avgSpo2!=null){ v.spo2=String(avgSpo2); patch.spo2=String(avgSpo2); applied.push("SpO₂"); }
  if(d.steps){ patch.steps=String(d.steps); applied.push("steps"); }
  save(); mergeVitalsToday(patch);
  toast(applied.length?`Applied ${applied.join(" & ")} from your export → logged to today.`:"Nothing numeric to apply from that file.");
}

function renderVitalsLog(){
  const el=$("#vitalsLogBody"); if(!el) return;
  const log=(state.vitalsLog||[]).slice();
  if(!log.length){ el.innerHTML=`<div class="empty" style="padding:22px 10px"><div class="big">🩺</div><div>No vitals logged yet — add a set above and log again over the coming days to see your trend.</div></div>`; return; }
  const cells = VITAL_METRICS.map(m=>{
    const vals=log.map(e=>vnum(e[m.k])).filter(x=>x!=null);
    if(!vals.length) return "";
    const last=vals[vals.length-1], delta=Math.round((last-vals[0])*10)/10;
    let arrow="—", cls="tflat", txt="first reading";
    if(vals.length>1){
      arrow = delta>0?"▲":delta<0?"▼":"—";
      const dir = delta>0?"up":delta<0?"down":"flat";
      cls = (m.good==="neutral"||dir==="flat") ? "tflat" : (m.good===dir ? "tgood":"tbad");
      txt = (delta>0?"+":"")+delta+" from first";
    }
    return `<div class="vcell"><div class="vck">${m.label}</div><div class="vcv">${last}<span class="vcu"> ${m.unit}</span></div><div class="vct ${cls}">${arrow} ${esc(txt)}</div></div>`;
  }).join("");
  const m = VITAL_METRICS.find(x=>x.k===healthChartMetric) || VITAL_METRICS[0];
  const opts = VITAL_METRICS.map(x=>`<option value="${x.k}" ${x.k===healthChartMetric?"selected":""}>${x.label}</option>`).join("");
  const list = log.slice().reverse().map(e=>{
    const parts=[];
    if(e.sbp!==""||e.dbp!=="") parts.push(`BP ${e.sbp||"?"}/${e.dbp||"?"}`);
    VITAL_METRICS.filter(x=>!["sbp","dbp"].includes(x.k) && e[x.k]!=="" && e[x.k]!=null).forEach(x=>parts.push(`${x.label} ${e[x.k]}`));
    return `<li class="logrow"><span class="ld">${fmtDate(e.date)}</span><span class="ln">${esc(parts.join(" · "))}</span><span class="lx" data-vdate="${e.date}" title="Delete">✕</span></li>`;
  }).join("");
  el.innerHTML=`<div class="vtrendgrid">${cells}</div>
    <div class="vchartsel"><label>Trend chart: <select id="vlChartMetric">${opts}</select></label></div>
    <div class="chartwrap">${metricChartSVG(log, m)}</div>
    <ul class="loglist">${list}</ul>`;
  const cm=$("#vlChartMetric"); if(cm) cm.onchange=()=>{ healthChartMetric=cm.value; renderVitalsLog(); };
  $$("#vitalsLogBody .lx").forEach(x=>x.onclick=()=>{ if(confirm("Delete this entry?")) deleteVitals(x.dataset.vdate); });
}
function metricChartSVG(log, m){
  const pts=log.map(e=>({d:e.date, v:vnum(e[m.k])})).filter(p=>p.v!=null);
  if(!pts.length) return `<div class="hint" style="padding:10px">No ${esc(m.label)} values logged yet — pick another metric or add readings.</div>`;
  const W=700,H=180,padL=34,padR=12,padT=14,padB=24, plotW=W-padL-padR, plotH=H-padT-padB;
  const vals=pts.map(p=>p.v); let mn=Math.min(...vals), mx=Math.max(...vals);
  if(mn===mx){ mn-=1; mx+=1; } const gap=(mx-mn)*0.15; mn-=gap; mx+=gap;
  const n=pts.length, x=i=> n<=1?padL+plotW/2:padL+(i/(n-1))*plotW, y=v=> padT+(1-(v-mn)/(mx-mn))*plotH;
  const Pp=pts.map((p,i)=>[x(i),y(p.v)]);
  const line=Pp.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area=`M${Pp[0][0].toFixed(1)} ${(padT+plotH).toFixed(1)} `+Pp.map(p=>"L"+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ")+` L${Pp[n-1][0].toFixed(1)} ${(padT+plotH).toFixed(1)} Z`;
  const grid=[mx,(mn+mx)/2,mn].map(v=>{const gy=y(v);return `<line class="grid" x1="${padL}" y1="${gy.toFixed(1)}" x2="${W-padR}" y2="${gy.toFixed(1)}"/><text class="axislbl" x="4" y="${(gy+3).toFixed(1)}">${Math.round(v)}</text>`;}).join("");
  const dots=Pp.map(p=>`<circle class="dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"/>`).join("");
  const xl = n>1?`<text class="axislbl" x="${padL}" y="${H-6}">${fmtDate(pts[0].d).replace(/,.*/,"")}</text><text class="axislbl" x="${W-padR}" y="${H-6}" text-anchor="end">${fmtDate(pts[n-1].d).replace(/,.*/,"")}</text>`:"";
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(m.label)} over time">${grid}${n>1?`<path class="area" d="${area}"/><path class="line" d="${line}"/>`:""}${dots}${xl}<text class="axislbl" x="4" y="10">${esc(m.unit)}</text></svg>`;
}

/* ---- lab values with editable targets, colour coding & improvement tips ---- */
const LABS = [
  { id:"tchol", name:"Total cholesterol", unit:"mg/dL", lo:0, hi:200, domain:"cardiac",
    improveHigh:"Cut saturated & trans fats, eat more soluble fiber (oats, beans, fruit & veg), exercise regularly, lose excess weight, and discuss cholesterol-lowering options with your doctor.", improveLow:"" },
  { id:"ldl", name:"LDL ('bad') cholesterol", unit:"mg/dL", lo:0, hi:100, domain:"cardiac",
    improveHigh:"Reduce saturated/trans fats, add soluble fiber and plant sterols, exercise, lose excess weight, and ask your doctor whether a statin is right for you.", improveLow:"" },
  { id:"hdl", name:"HDL ('good') cholesterol", unit:"mg/dL", lo:40, hi:200, domain:"cardiac",
    improveHigh:"", improveLow:"Regular aerobic exercise, stopping smoking, and healthy fats (olive oil, nuts, oily fish) help raise HDL." },
  { id:"trig", name:"Triglycerides", unit:"mg/dL", lo:0, hi:150, domain:"cardiac",
    improveHigh:"Cut sugar, refined carbs and alcohol, lose excess weight, exercise, and eat omega-3-rich fish.", improveLow:"" },
  { id:"glucoseF", name:"Fasting glucose", unit:"mg/dL", lo:70, hi:99, domain:"cardiac",
    improveHigh:"Reduce sugary drinks and refined carbs, lose excess weight, exercise regularly, and review blood-sugar screening/care with your clinician.", improveLow:"Frequent lows need review — carry fast-acting carbs and discuss your medications with your clinician." },
  { id:"a1c", name:"HbA1c", unit:"%", lo:0, hi:5.7, domain:"cardiac",
    improveHigh:"Lower refined carbs and sugar, lose excess weight, build regular activity, and review blood-sugar management with your clinician.", improveLow:"" },
  { id:"crp", name:"hs-CRP (inflammation)", unit:"mg/L", lo:0, hi:3, domain:"inflammation",
    improveHigh:"Address the cause with your doctor; regular exercise, not smoking, a healthy weight and treating infection/inflammation all help lower it.", improveLow:"" },
  { id:"creat", name:"Creatinine", unit:"mg/dL", lo:0.6, hi:1.3, domain:"renal",
    improveHigh:"Stay well hydrated, control blood pressure and glucose, avoid NSAIDs and very high protein/salt, and see your doctor about kidney function.", improveLow:"" },
  { id:"egfr", name:"eGFR (kidney filtration)", unit:"mL/min", lo:60, hi:200, domain:"renal",
    improveHigh:"", improveLow:"Protect kidney function: control BP and glucose, stay hydrated, avoid NSAIDs, moderate salt and protein, and see your doctor — a low eGFR needs review." },
  { id:"bun", name:"Blood urea nitrogen (BUN)", unit:"mg/dL", lo:7, hi:20, domain:"renal",
    improveHigh:"Often reflects hydration, protein intake or kidney function — hydrate well and review with your clinician.", improveLow:"" },
  { id:"potassium", name:"Potassium", unit:"mmol/L", lo:3.5, hi:5.1, domain:"electrolyte",
    improveHigh:"High potassium can be dangerous — review potassium-rich foods and your medications with your clinician promptly (urgent if very high).", improveLow:"Discuss with your clinician; don't self-supplement potassium." },
  { id:"sodium", name:"Sodium", unit:"mmol/L", lo:135, hi:145, domain:"electrolyte",
    improveHigh:"Usually reflects fluid balance — review fluid intake and medications with your clinician.", improveLow:"Low sodium needs medical review — don't drastically change fluid/salt intake without advice." },
  { id:"acr", name:"Urine albumin/creatinine (ACR)", unit:"mg/g", lo:0, hi:30, domain:"renal",
    improveHigh:"Tightly control blood pressure and glucose, don't smoke, and see your doctor — protein in the urine is an early kidney-stress signal.", improveLow:"" },
  { id:"alt", name:"ALT", unit:"U/L", lo:0, hi:56, domain:"hepatic",
    improveHigh:"Reduce alcohol, lose weight if overweight (fatty liver), avoid unnecessary hepatotoxic medicines/supplements, and see your doctor.", improveLow:"" },
  { id:"ast", name:"AST", unit:"U/L", lo:0, hi:40, domain:"hepatic",
    improveHigh:"Cut back alcohol, address fatty liver with weight loss and exercise, and review medications/supplements with your doctor.", improveLow:"" },
  { id:"alp", name:"Alkaline phosphatase (ALP)", unit:"U/L", lo:44, hi:147, domain:"hepatic",
    improveHigh:"Can reflect the liver or bone — see your doctor to find the cause.", improveLow:"" },
  { id:"bili", name:"Total bilirubin", unit:"mg/dL", lo:0.1, hi:1.2, domain:"hepatic",
    improveHigh:"See your doctor to find the cause; reduce alcohol and stay hydrated.", improveLow:"" },
  { id:"ggt", name:"GGT", unit:"U/L", lo:9, hi:48, domain:"hepatic",
    improveHigh:"Strongly linked to alcohol — cutting back usually lowers it; also review medications with your doctor.", improveLow:"" },
  { id:"albumin", name:"Albumin", unit:"g/dL", lo:3.5, hi:5, domain:"hepatic",
    improveHigh:"", improveLow:"Often reflects nutrition or inflammation — prioritise adequate protein and see your clinician about the cause." },
  { id:"hgb", name:"Hemoglobin", unit:"g/dL", lo:12, hi:17, domain:"cbc",
    improveHigh:"See your doctor to find the cause; stay well hydrated.", improveLow:"Eat iron-rich foods (lean red meat, beans, leafy greens) with vitamin C, and see your doctor — anemia can signal GI blood loss or a deficiency." },
  { id:"ferritin", name:"Ferritin (iron stores)", unit:"ng/mL", lo:30, hi:300, domain:"iron",
    improveHigh:"See your doctor to find the cause of high iron stores.", improveLow:"Iron-rich diet and supplements as advised — and find the cause of iron loss with your doctor." },
  { id:"b12", name:"Vitamin B12", unit:"pg/mL", lo:200, hi:900, domain:"vitamins",
    improveHigh:"", improveLow:"B12-rich foods (meat, dairy, eggs) or supplements/injections as advised — common with vegan diets or some medicines." },
  { id:"lipase", name:"Lipase", unit:"U/L", lo:10, hi:140, domain:"gastro",
    improveHigh:"Can indicate pancreas irritation — avoid alcohol and seek medical review (urgently if you have severe abdominal pain).", improveLow:"" },
  { id:"insulin", name:"Fasting insulin", unit:"µIU/mL", lo:2, hi:20, domain:"cardiac",
    improveHigh:"High fasting insulin suggests insulin resistance — cut refined carbs and sugar, lose excess weight, and exercise (resistance training especially helps).", improveLow:"" },
  { id:"uricacid", name:"Uric acid", unit:"mg/dL", lo:3.5, hi:7.2, domain:"cardiac",
    improveHigh:"Reduce alcohol (especially beer), sugary drinks and high-purine foods (red/organ meat, shellfish), stay hydrated, and lose excess weight; discuss gout risk with your doctor.", improveLow:"" },
  { id:"homocysteine", name:"Homocysteine", unit:"µmol/L", lo:0, hi:15, domain:"cardiac",
    improveHigh:"Often improves with folate, B12 and B6 (leafy greens, legumes, fortified foods) — discuss testing and supplements with your doctor.", improveLow:"" },
  { id:"nonhdl", name:"Non-HDL cholesterol", unit:"mg/dL", lo:0, hi:130, domain:"cardiac",
    improveHigh:"This is every harmful cholesterol particle combined — lower it by cutting saturated/trans fats, adding fiber, exercising, losing excess weight, and discussing lipid therapy with your doctor.", improveLow:"" },
  { id:"cholratio", name:"Total cholesterol : HDL ratio", unit:"ratio", lo:0, hi:5, domain:"cardiac",
    improveHigh:"Improve the ratio by raising HDL (exercise, healthy fats, not smoking) and lowering LDL and triglycerides.", improveLow:"" },
  { id:"apob", name:"Apolipoprotein B (ApoB)", unit:"mg/dL", lo:0, hi:90, domain:"cardiac",
    improveHigh:"ApoB counts artery-clogging particles — lower it with the same steps as LDL (diet, exercise, weight loss, and lipid therapy if your doctor advises).", improveLow:"" },
  { id:"lpa", name:"Lipoprotein(a)", unit:"mg/dL", lo:0, hi:30, domain:"cardiac",
    improveHigh:"Lp(a) is largely genetic and not very diet-responsive — focus on tightly controlling every other risk factor (blood pressure, LDL, not smoking) and discuss it with your doctor.", improveLow:"" },
  { id:"troponin", name:"Troponin", unit:"ng/mL", lo:0, hi:0.04, domain:"cardiac",
    improveHigh:"A raised troponin can mean heart-muscle strain or damage — if this is a new result with chest pain or breathlessness, seek urgent care; otherwise review promptly with your doctor.", improveLow:"" },
  { id:"bnp", name:"BNP / NT-proBNP", unit:"pg/mL", lo:0, hi:100, domain:"cardiac",
    improveHigh:"A raised level can reflect heart strain — review with your doctor; controlling blood pressure, fluid/salt and any heart condition helps.", improveLow:"" },
  { id:"ck", name:"Creatine kinase (CK)", unit:"U/L", lo:30, hi:200, domain:"cardiac",
    improveHigh:"CK rises with muscle breakdown, including after intense exercise — space out very heavy workouts; if you have muscle pain/weakness or dark urine, seek review.", improveLow:"" },

  { id:"cystatinc", name:"Cystatin C", unit:"mg/L", lo:0.5, hi:1, domain:"renal",
    improveHigh:"Like creatinine, a higher cystatin C suggests reduced kidney filtration — protect your kidneys (blood pressure, glucose, hydration, avoid NSAIDs) and see your doctor.", improveLow:"" },

  { id:"chloride", name:"Chloride", unit:"mmol/L", lo:98, hi:107, domain:"electrolyte",
    improveHigh:"Usually reflects hydration and acid-base balance — review with your clinician.", improveLow:"Usually reflects fluid or acid-base balance — review with your clinician." },
  { id:"co2", name:"CO₂ (bicarbonate)", unit:"mmol/L", lo:22, hi:29, domain:"electrolyte",
    improveHigh:"Reflects acid-base and breathing balance — review with your clinician.", improveLow:"Can reflect acid-base balance, breathing or kidney function — review with your clinician." },
  { id:"calcium", name:"Calcium", unit:"mg/dL", lo:8.6, hi:10.3, domain:"electrolyte",
    improveHigh:"High calcium needs review (parathyroid, vitamin D or other causes) — stay hydrated and see your doctor.", improveLow:"Ensure enough dietary calcium and vitamin D, and see your doctor about the cause." },
  { id:"magnesium", name:"Magnesium", unit:"mg/dL", lo:1.7, hi:2.2, domain:"electrolyte",
    improveHigh:"Usually medication- or kidney-related — review with your clinician.", improveLow:"Magnesium-rich foods (nuts, seeds, leafy greens, whole grains) or a supplement as advised." },
  { id:"phosphorus", name:"Phosphorus", unit:"mg/dL", lo:2.5, hi:4.5, domain:"electrolyte",
    improveHigh:"Often kidney-related — review diet and kidney function with your doctor.", improveLow:"Balanced nutrition usually restores it — review with your clinician." },

  { id:"bilid", name:"Direct (conjugated) bilirubin", unit:"mg/dL", lo:0, hi:0.3, domain:"hepatic",
    improveHigh:"See your doctor to find the cause (liver- or bile-duct-related).", improveLow:"" },
  { id:"totprotein", name:"Total protein", unit:"g/dL", lo:6, hi:8.3, domain:"hepatic",
    improveHigh:"Can reflect dehydration or other causes — review with your clinician.", improveLow:"Often reflects nutrition or inflammation — ensure adequate protein and see your doctor." },
  { id:"globulin", name:"Globulin", unit:"g/dL", lo:2, hi:3.5, domain:"hepatic",
    improveHigh:"Can reflect inflammation or immune activity — review with your clinician.", improveLow:"Review with your clinician." },
  { id:"ldh", name:"Lactate dehydrogenase (LDH)", unit:"U/L", lo:122, hi:222, domain:"hepatic",
    improveHigh:"A non-specific marker of tissue turnover — your doctor interprets it in context.", improveLow:"" },

  { id:"hct", name:"Hematocrit", unit:"%", lo:36, hi:50, domain:"cbc",
    improveHigh:"Often dehydration or smoking — stay hydrated; a persistently high level needs review.", improveLow:"Reflects anemia — see your doctor; iron, B12 or folate may help depending on the cause." },
  { id:"rbc", name:"Red blood cell count (RBC)", unit:"×10¹²/L", lo:4.2, hi:5.9, domain:"cbc",
    improveHigh:"Stay well hydrated; a persistently high count needs review (including smoking and oxygen levels).", improveLow:"A low count (anemia) — iron/B12/folate-rich diet and see your doctor for the cause." },
  { id:"wbc", name:"White blood cell count (WBC)", unit:"×10⁹/L", lo:4, hi:11, domain:"cbc",
    improveHigh:"A high white count often means infection or inflammation — see your doctor if you're unwell.", improveLow:"A low count can raise infection risk — avoid sick contacts and see your doctor." },
  { id:"platelets", name:"Platelets", unit:"×10⁹/L", lo:150, hi:400, domain:"cbc",
    improveHigh:"Can reflect inflammation, iron deficiency or other causes — review with your doctor.", improveLow:"A low platelet count raises bleeding risk — avoid contact injury and see your doctor." },
  { id:"mcv", name:"MCV (red-cell size)", unit:"fL", lo:80, hi:100, domain:"cbc",
    improveHigh:"Large red cells can reflect low B12/folate or alcohol — check those with your doctor.", improveLow:"Small red cells often mean iron deficiency — check iron studies with your doctor." },
  { id:"mch", name:"MCH", unit:"pg", lo:27, hi:33, domain:"cbc",
    improveHigh:"Review with your doctor alongside B12 and folate.", improveLow:"Often iron deficiency — check iron studies with your doctor." },
  { id:"mchc", name:"MCHC", unit:"g/dL", lo:32, hi:36, domain:"cbc",
    improveHigh:"Review with your doctor.", improveLow:"Often iron deficiency — check iron studies." },
  { id:"rdw", name:"RDW", unit:"%", lo:11.5, hi:14.5, domain:"cbc",
    improveHigh:"A high RDW (mixed red-cell sizes) can point to iron, B12 or folate deficiency — check with your doctor.", improveLow:"" },

  { id:"iron", name:"Serum iron", unit:"µg/dL", lo:60, hi:170, domain:"iron",
    improveHigh:"See your doctor to find the cause of iron overload; limit iron supplements.", improveLow:"Iron-rich foods with vitamin C, and supplements as advised — and find the cause of the loss." },
  { id:"tibc", name:"Total iron-binding capacity (TIBC)", unit:"µg/dL", lo:250, hi:450, domain:"iron",
    improveHigh:"A high TIBC often reflects iron deficiency — check iron studies and diet with your doctor.", improveLow:"Review with your doctor (can reflect iron overload or other causes)." },
  { id:"transferrinsat", name:"Transferrin saturation", unit:"%", lo:20, hi:50, domain:"iron",
    improveHigh:"A high saturation can indicate iron overload — see your doctor.", improveLow:"A low saturation suggests iron deficiency — iron-rich diet and review the cause with your doctor." },

  { id:"ft4", name:"Free T4", unit:"ng/dL", lo:0.8, hi:1.8, domain:"thyroid",
    improveHigh:"A high free T4 suggests an overactive thyroid — discuss with your doctor.", improveLow:"A low free T4 suggests an underactive thyroid — discuss with your doctor." },
  { id:"ft3", name:"Free T3", unit:"pg/mL", lo:2.3, hi:4.2, domain:"thyroid",
    improveHigh:"Discuss thyroid function with your doctor.", improveLow:"Discuss thyroid function with your doctor." },
  { id:"tpo", name:"TPO antibodies", unit:"IU/mL", lo:0, hi:34, domain:"thyroid",
    improveHigh:"Raised thyroid antibodies suggest autoimmune thyroid disease — monitor thyroid function with your doctor.", improveLow:"" },
  { id:"cortisol", name:"Cortisol (morning)", unit:"µg/dL", lo:6, hi:23, domain:"thyroid",
    improveHigh:"Persistently high cortisol needs review (stress, medication or gland causes) — see your doctor.", improveLow:"Low cortisol needs prompt review — see your doctor." },
  { id:"testosterone", name:"Testosterone (total)", unit:"ng/dL", lo:300, hi:1000, domain:"thyroid",
    improveHigh:"Review with your doctor.", improveLow:"Sleep, regular exercise, a healthy weight and treating other conditions help — discuss with your doctor." },
  { id:"psa", name:"PSA (prostate)", unit:"ng/mL", lo:0, hi:4, domain:"thyroid",
    improveHigh:"A raised PSA needs review with your doctor — it often has benign causes, not only prostate cancer.", improveLow:"" },

  { id:"folate", name:"Folate", unit:"ng/mL", lo:3, hi:20, domain:"vitamins",
    improveHigh:"", improveLow:"Folate-rich foods (leafy greens, legumes, fortified grains) or a supplement as advised." },
  { id:"b6", name:"Vitamin B6", unit:"µg/L", lo:5, hi:50, domain:"vitamins",
    improveHigh:"Very high B6 is usually from over-supplementing — review your dose with your clinician.", improveLow:"B6-rich foods (poultry, fish, potatoes, bananas) or a supplement as advised." },

  { id:"esr", name:"ESR (sedimentation rate)", unit:"mm/hr", lo:0, hi:20, domain:"inflammation",
    improveHigh:"A non-specific marker of inflammation — see your doctor to find the cause.", improveLow:"" },

  { id:"inr", name:"INR", unit:"ratio", lo:0.8, hi:1.2, domain:"coagulation",
    improveHigh:"If you take warfarin, a high INR raises bleeding risk — follow your anticoagulation clinic; otherwise review with your doctor.", improveLow:"If you take warfarin, a low INR means less protection than intended — follow your clinic's advice." },
  { id:"pt", name:"Prothrombin time (PT)", unit:"sec", lo:11, hi:13.5, domain:"coagulation",
    improveHigh:"A long PT can reflect clotting-factor or liver issues, or blood thinners — review with your doctor.", improveLow:"" },
  { id:"ptt", name:"aPTT", unit:"sec", lo:25, hi:35, domain:"coagulation",
    improveHigh:"A long aPTT can reflect clotting issues or heparin — review with your doctor.", improveLow:"" },
  { id:"ddimer", name:"D-dimer", unit:"µg/mL", lo:0, hi:0.5, domain:"coagulation",
    improveHigh:"Non-specific but can indicate a clot — with leg swelling/pain or breathlessness, seek urgent care; otherwise review with your doctor.", improveLow:"" },
  { id:"fibrinogen", name:"Fibrinogen", unit:"mg/dL", lo:200, hi:400, domain:"coagulation",
    improveHigh:"Often reflects inflammation — review with your doctor.", improveLow:"A low fibrinogen can affect clotting — review with your doctor." },

  { id:"amylase", name:"Amylase", unit:"U/L", lo:30, hi:110, domain:"gastro",
    improveHigh:"Like lipase, can indicate pancreas irritation — avoid alcohol and seek review (urgently with severe abdominal pain).", improveLow:"" },

  { id:"vitd", name:"Vitamin D (25-OH)", unit:"ng/mL", lo:30, hi:100, domain:"vitamins",
    improveHigh:"Very high levels usually mean over-supplementing — review your dose with your clinician.", improveLow:"Safe sun exposure, vitamin-D foods (oily fish, fortified foods) and a supplement as advised." },
  { id:"tsh", name:"TSH (thyroid)", unit:"mIU/L", lo:0.4, hi:4, domain:"thyroid",
    improveHigh:"A high TSH suggests an underactive thyroid — discuss thyroid testing and any medication with your doctor.", improveLow:"A low TSH suggests an overactive thyroid — discuss with your doctor." },

  // ---- CBC differential ----
  { id:"neutpct", name:"Neutrophils %", unit:"%", lo:40, hi:70, domain:"cbc",
    improveHigh:"Often reflects infection, inflammation or stress — see your doctor if you're unwell.", improveLow:"A low neutrophil count can raise infection risk — avoid sick contacts and see your doctor." },
  { id:"neutabs", name:"Neutrophils (absolute)", unit:"×10⁹/L", lo:1.5, hi:8, domain:"cbc",
    improveHigh:"Usually infection or inflammation — review with your doctor.", improveLow:"Neutropenia raises infection risk — see your doctor promptly if you develop a fever." },
  { id:"lymphpct", name:"Lymphocytes %", unit:"%", lo:20, hi:45, domain:"cbc",
    improveHigh:"Often a viral infection — review with your doctor if it persists.", improveLow:"Can follow stress, steroids or infection — review with your doctor." },
  { id:"lymphabs", name:"Lymphocytes (absolute)", unit:"×10⁹/L", lo:1, hi:4, domain:"cbc",
    improveHigh:"Review with your doctor.", improveLow:"Review with your doctor if persistently low." },
  { id:"monopct", name:"Monocytes %", unit:"%", lo:2, hi:10, domain:"cbc",
    improveHigh:"Can accompany chronic infection or inflammation — review with your doctor.", improveLow:"" },
  { id:"eospct", name:"Eosinophils %", unit:"%", lo:0, hi:6, domain:"cbc",
    improveHigh:"Often allergy or asthma (occasionally parasites) — review with your doctor.", improveLow:"" },
  { id:"basopct", name:"Basophils %", unit:"%", lo:0, hi:2, domain:"cbc",
    improveHigh:"A persistent rise needs review with your doctor.", improveLow:"" },
  { id:"mpv", name:"MPV (platelet size)", unit:"fL", lo:7.5, hi:11.5, domain:"cbc",
    improveHigh:"Interpreted alongside your platelet count — review with your doctor.", improveLow:"Interpreted alongside your platelet count — review with your doctor." },
  { id:"retic", name:"Reticulocytes", unit:"%", lo:0.5, hi:2.5, domain:"cbc",
    improveHigh:"A high count shows the marrow making red cells quickly (e.g. after blood loss) — review the cause.", improveLow:"A low count can mean reduced marrow production — see your doctor." },

  // ---- Cardiac & metabolic (extended) ----
  { id:"ckmb", name:"CK-MB", unit:"ng/mL", lo:0, hi:5, domain:"cardiac",
    improveHigh:"A heart-muscle marker — a raised level with chest pain needs urgent care; otherwise review with your doctor.", improveLow:"" },
  { id:"myoglobin", name:"Myoglobin", unit:"ng/mL", lo:0, hi:85, domain:"cardiac",
    improveHigh:"Rises with muscle or heart-muscle injury — review in context with your doctor.", improveLow:"" },
  { id:"cpeptide", name:"C-peptide", unit:"ng/mL", lo:0.8, hi:3.1, domain:"cardiac",
    improveHigh:"High C-peptide reflects insulin resistance — fewer refined carbs, weight loss and exercise help.", improveLow:"Low C-peptide means little insulin production — discuss diabetes care with your doctor." },
  { id:"fructosamine", name:"Fructosamine", unit:"µmol/L", lo:200, hi:285, domain:"cardiac",
    improveHigh:"Reflects blood sugar over the past 2–3 weeks — reduce refined carbs/sugar, lose excess weight and exercise.", improveLow:"" },
  { id:"glucoseR", name:"Random glucose", unit:"mg/dL", lo:70, hi:140, domain:"cardiac",
    improveHigh:"Reduce sugary drinks and refined carbs, lose excess weight, and review blood-sugar care with your clinician.", improveLow:"Frequent lows need review — carry fast-acting carbs and discuss your medications." },
  { id:"lactate", name:"Lactate (lactic acid)", unit:"mmol/L", lo:0.5, hi:2.2, domain:"cardiac",
    improveHigh:"Rises with hard exercise, but a high resting level needs prompt medical review.", improveLow:"" },

  // ---- Electrolytes & minerals (extended) ----
  { id:"ionca", name:"Ionized calcium", unit:"mmol/L", lo:1.12, hi:1.32, domain:"electrolyte",
    improveHigh:"High calcium needs review (parathyroid, vitamin D or other causes) — see your doctor.", improveLow:"Ensure enough calcium and vitamin D, and see your doctor about the cause." },
  { id:"aniongap", name:"Anion gap", unit:"mmol/L", lo:8, hi:16, domain:"electrolyte",
    improveHigh:"A high anion gap can signal a metabolic problem — needs medical review.", improveLow:"Usually not important on its own — review with your doctor." },
  { id:"osmolality", name:"Serum osmolality", unit:"mOsm/kg", lo:275, hi:295, domain:"electrolyte",
    improveHigh:"Often dehydration or high glucose/sodium — hydrate and review with your clinician.", improveLow:"Often fluid overload or low sodium — review with your clinician." },
  { id:"zinc", name:"Zinc", unit:"µg/dL", lo:60, hi:120, domain:"electrolyte",
    improveHigh:"Usually over-supplementing — review your dose.", improveLow:"Zinc-rich foods (meat, shellfish, legumes, seeds) or a supplement as advised." },
  { id:"copper", name:"Copper", unit:"µg/dL", lo:70, hi:140, domain:"electrolyte",
    improveHigh:"A high copper needs review with your doctor.", improveLow:"Copper-rich foods (shellfish, nuts, seeds, whole grains) or a supplement as advised." },

  // ---- Hepatic (extended) ----
  { id:"ammonia", name:"Ammonia", unit:"µmol/L", lo:15, hi:45, domain:"hepatic",
    improveHigh:"A high ammonia (often liver-related) needs prompt review, especially with confusion.", improveLow:"" },
  { id:"haptoglobin", name:"Haptoglobin", unit:"mg/dL", lo:30, hi:200, domain:"hepatic",
    improveHigh:"Often reflects inflammation — review with your doctor.", improveLow:"A low haptoglobin can indicate red-cell breakdown (hemolysis) — review with your doctor." },

  // ---- Thyroid & endocrine (extended) ----
  { id:"tt4", name:"Total T4", unit:"µg/dL", lo:4.5, hi:11.7, domain:"thyroid",
    improveHigh:"Discuss thyroid function with your doctor.", improveLow:"Discuss thyroid function with your doctor." },
  { id:"tt3", name:"Total T3", unit:"ng/dL", lo:80, hi:200, domain:"thyroid",
    improveHigh:"Discuss thyroid function with your doctor.", improveLow:"Discuss thyroid function with your doctor." },
  { id:"rt3", name:"Reverse T3", unit:"ng/dL", lo:8, hi:25, domain:"thyroid",
    improveHigh:"Interpreted with the rest of your thyroid panel — discuss with your doctor.", improveLow:"" },
  { id:"thyroglobulin", name:"Thyroglobulin", unit:"ng/mL", lo:1.4, hi:29.2, domain:"thyroid",
    improveHigh:"Used mainly to monitor thyroid conditions — discuss with your doctor.", improveLow:"" },
  { id:"pth", name:"Parathyroid hormone (PTH)", unit:"pg/mL", lo:15, hi:65, domain:"thyroid",
    improveHigh:"High PTH needs review (calcium, vitamin D, kidney or parathyroid causes) — see your doctor.", improveLow:"Low PTH is interpreted alongside your calcium — see your doctor." },
  { id:"dheas", name:"DHEA-sulfate", unit:"µg/dL", lo:35, hi:430, domain:"thyroid",
    improveHigh:"A high level needs review (adrenal or hormonal causes) — see your doctor.", improveLow:"Often falls with age; review with your doctor if you have symptoms." },
  { id:"igf1", name:"IGF-1", unit:"ng/mL", lo:50, hi:300, domain:"thyroid",
    improveHigh:"A high IGF-1 needs review (growth-hormone causes) — see your doctor.", improveLow:"Can reflect nutrition or pituitary function — review with your doctor." },
  { id:"acth", name:"ACTH", unit:"pg/mL", lo:7.2, hi:63, domain:"thyroid",
    improveHigh:"Interpreted alongside cortisol — discuss with your doctor.", improveLow:"Interpreted alongside cortisol — discuss with your doctor." },
  { id:"aldosterone", name:"Aldosterone", unit:"ng/dL", lo:3, hi:16, domain:"thyroid",
    improveHigh:"A high level (often with high BP or low potassium) needs review — see your doctor.", improveLow:"Review with your doctor." },

  // ---- Reproductive & sex hormones ----
  { id:"estradiol", name:"Estradiol (E2)", unit:"pg/mL", lo:15, hi:350, domain:"reproductive",
    improveHigh:"Levels vary widely by sex and menstrual-cycle phase — interpret with your doctor.", improveLow:"Levels vary by sex, cycle and menopause — discuss with your doctor." },
  { id:"progesterone", name:"Progesterone", unit:"ng/mL", lo:0, hi:25, domain:"reproductive",
    improveHigh:"Varies through the menstrual cycle — interpret with your doctor.", improveLow:"Varies through the cycle — discuss with your doctor." },
  { id:"fsh", name:"FSH", unit:"mIU/mL", lo:1.5, hi:12.4, domain:"reproductive",
    improveHigh:"A high FSH can reflect reduced ovarian/testicular function or menopause — discuss with your doctor.", improveLow:"Review with your doctor (pituitary or hormonal causes)." },
  { id:"lh", name:"LH", unit:"mIU/mL", lo:1.7, hi:8.6, domain:"reproductive",
    improveHigh:"Interpreted with FSH and sex hormones — discuss with your doctor.", improveLow:"Interpreted with FSH — discuss with your doctor." },
  { id:"prolactin", name:"Prolactin", unit:"ng/mL", lo:2, hi:18, domain:"reproductive",
    improveHigh:"A high prolactin needs review (medications or a pituitary cause) — see your doctor.", improveLow:"" },
  { id:"shbg", name:"Sex hormone-binding globulin (SHBG)", unit:"nmol/L", lo:18, hi:54, domain:"reproductive",
    improveHigh:"Interpreted alongside testosterone/estrogen — discuss with your doctor.", improveLow:"Often linked to insulin resistance — weight loss and exercise can help; discuss with your doctor." },
  { id:"freetesto", name:"Free testosterone", unit:"pg/mL", lo:47, hi:244, domain:"reproductive",
    improveHigh:"Interpret with total testosterone — discuss with your doctor.", improveLow:"Sleep, exercise, a healthy weight and treating other conditions help; discuss with your doctor." },
  { id:"amh", name:"Anti-Müllerian hormone (AMH)", unit:"ng/mL", lo:1, hi:4, domain:"reproductive",
    improveHigh:"A high AMH can accompany PCOS — discuss with your doctor.", improveLow:"A low AMH reflects lower ovarian reserve — discuss with your doctor." },
  { id:"hcg", name:"hCG (pregnancy)", unit:"mIU/mL", lo:0, hi:5, domain:"reproductive",
    improveHigh:"A positive hCG usually indicates pregnancy — confirm with your doctor.", improveLow:"" },

  // ---- Vitamins & nutrition (extended) ----
  { id:"vita", name:"Vitamin A (retinol)", unit:"µg/dL", lo:20, hi:60, domain:"vitamins",
    improveHigh:"Usually over-supplementing — review your dose (too much vitamin A can be harmful).", improveLow:"Vitamin-A-rich foods (dairy, eggs, orange/green vegetables) or a supplement as advised." },
  { id:"vite", name:"Vitamin E", unit:"mg/L", lo:5.5, hi:17, domain:"vitamins",
    improveHigh:"Usually over-supplementing — review your dose.", improveLow:"Vitamin-E-rich foods (nuts, seeds, vegetable oils) or a supplement as advised." },
  { id:"vitc", name:"Vitamin C", unit:"mg/dL", lo:0.4, hi:2, domain:"vitamins",
    improveHigh:"", improveLow:"Vitamin-C-rich foods (citrus, berries, peppers, broccoli) or a supplement as advised." },
  { id:"vitk", name:"Vitamin K", unit:"ng/mL", lo:0.1, hi:2.2, domain:"vitamins",
    improveHigh:"", improveLow:"Vitamin-K-rich foods (leafy greens) — but keep intake steady if you take warfarin, and discuss with your doctor." },
  { id:"b1", name:"Vitamin B1 (thiamine)", unit:"nmol/L", lo:70, hi:180, domain:"vitamins",
    improveHigh:"", improveLow:"Thiamine-rich foods (whole grains, legumes, pork) or a supplement — low levels are common with heavy alcohol use." },
  { id:"b2", name:"Vitamin B2 (riboflavin)", unit:"µg/L", lo:4, hi:24, domain:"vitamins",
    improveHigh:"", improveLow:"Riboflavin-rich foods (dairy, eggs, lean meat, greens) or a supplement as advised." },
  { id:"mma", name:"Methylmalonic acid (MMA)", unit:"µmol/L", lo:0, hi:0.4, domain:"vitamins",
    improveHigh:"A high MMA can confirm B12 deficiency — B12-rich foods or supplements/injections as advised.", improveLow:"" },
  { id:"selenium", name:"Selenium", unit:"µg/L", lo:70, hi:150, domain:"vitamins",
    improveHigh:"Usually over-supplementing — review your dose.", improveLow:"Selenium-rich foods (Brazil nuts, seafood, eggs) or a supplement as advised." },
  { id:"prealbumin", name:"Prealbumin (nutrition)", unit:"mg/dL", lo:18, hi:45, domain:"vitamins",
    improveHigh:"", improveLow:"A short-term nutrition marker — prioritise adequate protein and calories, and review with your clinician." },
  { id:"omega3", name:"Omega-3 index", unit:"%", lo:8, hi:12, domain:"vitamins",
    improveHigh:"", improveLow:"Eat more oily fish (salmon, sardines, mackerel) or take an omega-3 supplement as advised." },

  // ---- Inflammatory & immune markers (extended) ----
  { id:"procalcitonin", name:"Procalcitonin", unit:"ng/mL", lo:0, hi:0.5, domain:"inflammation",
    improveHigh:"A raised procalcitonin can indicate a bacterial infection — see your doctor.", improveLow:"" },
  { id:"rf", name:"Rheumatoid factor (RF)", unit:"IU/mL", lo:0, hi:14, domain:"inflammation",
    improveHigh:"A positive RF can accompany rheumatoid arthritis and other conditions — review with your doctor.", improveLow:"" },
  { id:"anticcp", name:"Anti-CCP antibody", unit:"U/mL", lo:0, hi:20, domain:"inflammation",
    improveHigh:"A positive anti-CCP is fairly specific for rheumatoid arthritis — see your doctor.", improveLow:"" },
  { id:"c3", name:"Complement C3", unit:"mg/dL", lo:90, hi:180, domain:"inflammation",
    improveHigh:"Rises with inflammation — review with your doctor.", improveLow:"A low C3 can accompany autoimmune conditions — review with your doctor." },
  { id:"c4", name:"Complement C4", unit:"mg/dL", lo:10, hi:40, domain:"inflammation",
    improveHigh:"Review with your doctor.", improveLow:"A low C4 can accompany autoimmune conditions — review with your doctor." },
  { id:"igg", name:"Immunoglobulin IgG", unit:"mg/dL", lo:700, hi:1600, domain:"inflammation",
    improveHigh:"Review with your doctor (chronic infection/inflammation or other causes).", improveLow:"A low IgG can raise infection risk — review with your doctor." },
  { id:"iga", name:"Immunoglobulin IgA", unit:"mg/dL", lo:70, hi:400, domain:"inflammation",
    improveHigh:"Review with your doctor.", improveLow:"Review with your doctor." },
  { id:"igm", name:"Immunoglobulin IgM", unit:"mg/dL", lo:40, hi:230, domain:"inflammation",
    improveHigh:"Often reflects a recent infection — review with your doctor.", improveLow:"Review with your doctor." },
  { id:"ige", name:"Immunoglobulin IgE", unit:"IU/mL", lo:0, hi:100, domain:"inflammation",
    improveHigh:"Often reflects allergy or asthma — discuss with your doctor.", improveLow:"" },

  // ---- Coagulation (extended) ----
  { id:"thrombintime", name:"Thrombin time", unit:"sec", lo:14, hi:19, domain:"coagulation",
    improveHigh:"A long thrombin time can reflect heparin or clotting-factor issues — review with your doctor.", improveLow:"" },
  { id:"antithrombin", name:"Antithrombin III", unit:"%", lo:80, hi:120, domain:"coagulation",
    improveHigh:"", improveLow:"A low antithrombin raises clot risk — review with your doctor." },
  { id:"proteinc", name:"Protein C", unit:"%", lo:70, hi:140, domain:"coagulation",
    improveHigh:"", improveLow:"A low protein C raises clot risk — review with your doctor." },
  { id:"proteins", name:"Protein S", unit:"%", lo:65, hi:140, domain:"coagulation",
    improveHigh:"", improveLow:"A low protein S raises clot risk — review with your doctor." },
  { id:"antixa", name:"Anti-Xa (heparin level)", unit:"IU/mL", lo:0.3, hi:0.7, domain:"coagulation",
    improveHigh:"Used to dose heparin — your care team adjusts based on this.", improveLow:"Used to dose heparin — your care team adjusts based on this." },

  // ---- Renal (extended) ----
  { id:"b2micro", name:"Beta-2 microglobulin", unit:"mg/L", lo:0.8, hi:2.4, domain:"renal",
    improveHigh:"Can reflect kidney function or other conditions — review with your doctor.", improveLow:"" },
  { id:"buncreat", name:"BUN/creatinine ratio", unit:"ratio", lo:10, hi:20, domain:"renal",
    improveHigh:"Often reflects dehydration or GI bleeding — hydrate and review with your doctor.", improveLow:"Review with your doctor in context." },

  // ---- Tumor markers ----
  { id:"cea", name:"CEA", unit:"ng/mL", lo:0, hi:3, domain:"tumor",
    improveHigh:"A screening/monitoring marker (also higher in smokers) — a raised level needs review with your doctor.", improveLow:"" },
  { id:"ca199", name:"CA 19-9", unit:"U/mL", lo:0, hi:37, domain:"tumor",
    improveHigh:"Used to monitor certain conditions — a raised level needs review with your doctor.", improveLow:"" },
  { id:"ca125", name:"CA 125", unit:"U/mL", lo:0, hi:35, domain:"tumor",
    improveHigh:"Can rise with several conditions, not only cancer — review with your doctor.", improveLow:"" },
  { id:"ca153", name:"CA 15-3", unit:"U/mL", lo:0, hi:30, domain:"tumor",
    improveHigh:"Used to monitor certain conditions — review a raised level with your doctor.", improveLow:"" },
  { id:"afp", name:"Alpha-fetoprotein (AFP)", unit:"ng/mL", lo:0, hi:8, domain:"tumor",
    improveHigh:"Can rise with liver conditions and some tumours — review with your doctor.", improveLow:"" },

  // ---- Arterial blood gas ----
  { id:"ph", name:"Blood pH", unit:"", lo:7.35, hi:7.45, domain:"bloodgas",
    improveHigh:"An abnormal pH reflects an acid-base problem and needs prompt medical review.", improveLow:"An abnormal pH reflects an acid-base problem and needs prompt medical review." },
  { id:"pco2", name:"pCO₂", unit:"mmHg", lo:35, hi:45, domain:"bloodgas",
    improveHigh:"A high pCO₂ can mean under-breathing (CO₂ retention) — review with your doctor.", improveLow:"A low pCO₂ can mean over-breathing — review with your doctor." },
  { id:"po2", name:"pO₂", unit:"mmHg", lo:80, hi:100, domain:"bloodgas",
    improveHigh:"Usually from supplemental oxygen — review with your care team.", improveLow:"A low pO₂ means low blood oxygen — use prescribed oxygen and seek review; seek urgent care if very breathless." },
  { id:"baseexcess", name:"Base excess", unit:"mmol/L", lo:-2, hi:2, domain:"bloodgas",
    improveHigh:"Part of the acid-base picture — interpreted with pH and bicarbonate by your doctor.", improveLow:"Part of the acid-base picture — interpreted with pH and bicarbonate by your doctor." },
  { id:"o2sat", name:"O₂ saturation (blood gas)", unit:"%", lo:95, hi:100, domain:"bloodgas",
    improveHigh:"", improveLow:"A low oxygen saturation needs review — use prescribed oxygen; seek urgent care if very breathless." }
];
const LAB_DOMAINS = [
  { key:"cardiac",      label:"🫀 Cardiac & metabolic" },
  { key:"renal",        label:"🫘 Renal (kidney) function" },
  { key:"electrolyte",  label:"🧂 Electrolytes & minerals" },
  { key:"hepatic",      label:"🩺 Hepatic (liver) panel" },
  { key:"cbc",          label:"🩸 Complete blood count (CBC)" },
  { key:"iron",         label:"🧲 Iron studies" },
  { key:"vitamins",     label:"💊 Vitamins & nutrition" },
  { key:"inflammation", label:"🔥 Inflammatory & immune markers" },
  // --- advanced / specialist panels: behind one disclosure. A rehab tool shouldn't confront
  //     everyone with thyroid, sex hormones, tumour markers, blood gas and clotting fields. ---
  { key:"thyroid",      label:"🦋 Thyroid & endocrine", adv:true },
  { key:"reproductive", label:"🧬 Reproductive & sex hormones", adv:true },
  { key:"coagulation",  label:"🩹 Coagulation (clotting)", adv:true },
  { key:"tumor",        label:"🎗️ Tumor markers", adv:true },
  { key:"gastro",       label:"🍽️ Gastrointestinal & pancreatic", adv:true },
  { key:"bloodgas",     label:"🫧 Arterial blood gas", adv:true }
];
function labStatusVal(lab, value){
  const v=vnum(value); if(v==null) return "none";
  const e=state.labs[lab.id]||{};
  const lo=vnum(e.lo)??lab.lo, hi=vnum(e.hi)??lab.hi;
  if(v<lo) return "low"; if(v>hi) return "high"; return "ok";
}
function labStatusOf(lab){ const e=state.labs[lab.id]; if(!e || e.v==="" || e.v==null) return "none"; return labStatusVal(lab, e.v); }
const fmtShort = iso2 => { try{ const d=new Date(iso2+"T00:00:00"); return isNaN(d.getTime())?iso2:d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"2-digit"}); }catch(e){ return iso2; } };
// Prior dated readings (from uploads) shown as a comparison strip under each lab.
function labHistInner(lab){
  const h=(state.labHist&&state.labHist[lab.id])||[];
  if(!h.length) return "";
  const chips=h.slice().sort((a,b)=>a.d<b.d?1:-1).map(r=>{
    const st=labStatusVal(lab, r.v), cls=st==="ok"?"labok":st==="none"?"labnone":"labbad";
    return `<span class="labhistchip ${cls}"><span class="lhd">${esc(fmtShort(r.d))}</span>${esc(String(r.v))}</span>`;
  }).join("");
  return `<span class="labhistlbl">📅 By collection date</span>${chips}`;
}
function labPill(st){
  if(st==="ok")   return { cls:"labok",   pill:"✓ in range" };
  if(st==="high") return { cls:"labbad",  pill:"↑ high" };
  if(st==="low")  return { cls:"labbad",  pill:"↓ low" };
  return { cls:"labnone", pill:"—" };
}
function labTip(lab, st){
  return st==="high" ? (lab.improveHigh||"") : st==="low" ? (lab.improveLow||"") : "";
}
function labRowHTML(lab){
  const e=state.labs[lab.id]||{};
  const v=(e.v??""), lo=(e.lo??lab.lo), hi=(e.hi??lab.hi);
  const st=labStatusOf(lab), { cls, pill }=labPill(st), tip=labTip(lab, st);
  return `<div class="labrow ${cls}" data-id="${lab.id}">
    <div class="labname">${esc(lab.name)} <span class="labunit">${esc(lab.unit)}</span></div>
    <div class="labinputs">
      <input class="labval" data-lab="${lab.id}" value="${esc(String(v))}" placeholder="your value" inputmode="decimal" />
      <span class="labtarget">Reference Range <input class="labt" data-lab="${lab.id}" data-b="lo" value="${esc(String(lo))}" inputmode="decimal" aria-label="reference range low" />–<input class="labt" data-lab="${lab.id}" data-b="hi" value="${esc(String(hi))}" inputmode="decimal" aria-label="reference range high" /></span>
      <span class="labpill ${cls}">${pill}</span>
    </div>
    <div class="labtip"${tip?"":' style="display:none"'}>💡 ${tip}</div>
    <div class="labhist">${labHistInner(lab)}</div>
  </div>`;
}
function refreshLabRow(id){
  const lab=LABS.find(l=>l.id===id), row=$(`#labsBody .labrow[data-id="${id}"]`); if(!lab||!row) return;
  const st=labStatusOf(lab), { cls, pill }=labPill(st), tip=labTip(lab, st);
  row.className="labrow "+cls;
  const p=row.querySelector(".labpill"); if(p){ p.className="labpill "+cls; p.textContent=pill; }
  const t=row.querySelector(".labtip"); if(t){ if(tip){ t.style.display=""; t.innerHTML="💡 "+tip; } else t.style.display="none"; }
  const h=row.querySelector(".labhist"); if(h) h.innerHTML=labHistInner(lab);
}
function renderLabs(){
  const el=$("#labsBody"); if(!el) return;
  if(!labsSeeded){ if(LAB_DOMAINS[0]) openLabDomains.add(LAB_DOMAINS[0].key); labsSeeded=true; }
  const domHTML = d => {
    const domLabs=LABS.filter(l=>l.domain===d.key);
    const rows=domLabs.map(labRowHTML).join("");
    const open=openLabDomains.has(d.key)?" open":"";
    return `<details class="labdomain"${open} data-domain="${d.key}"><summary class="labdh">${esc(d.label)}<span class="labdcount">${domLabs.length}</span></summary>${rows}</details>`;
  };
  const core = LAB_DOMAINS.filter(d=>!d.adv), adv = LAB_DOMAINS.filter(d=>d.adv);
  const advCount = adv.reduce((n,d)=>n + LABS.filter(l=>l.domain===d.key).length, 0);
  el.innerHTML = core.map(domHTML).join("")
    + (adv.length ? `<details class="labadv"><summary class="labadvh"><span>🔬 Advanced / specialist labs</span><span class="labdcount">${advCount}</span></summary>
        <p class="hint" style="margin:8px 2px 4px">Thyroid, reproductive hormones, coagulation, tumour markers, blood gas and GI/pancreatic panels — for anyone with specialist bloodwork. Most people won't need these.</p>
        ${adv.map(domHTML).join("")}</details>` : "");
  $$("#labsBody .labdomain").forEach(dt=>dt.addEventListener("toggle",()=>{
    dt.open ? openLabDomains.add(dt.dataset.domain) : openLabDomains.delete(dt.dataset.domain);
  }));
  $$("#labsBody .labval").forEach(inp=>inp.oninput=()=>{ const id=inp.dataset.lab; (state.labs[id]=state.labs[id]||{}).v=inp.value.trim(); save(); refreshLabRow(id); renderRisks(); });
  $$("#labsBody .labt").forEach(inp=>inp.oninput=()=>{ const id=inp.dataset.lab; (state.labs[id]=state.labs[id]||{})[inp.dataset.b]=inp.value.trim(); save(); refreshLabRow(id); renderRisks(); });
}

/* ---- import lab values from an uploaded file (CSV/TSV/TXT/JSON on-device; PDF/photos via Claude API) ---- */
const LAB_ALIASES = {
  tchol:["total cholesterol","cholesterol total","cholesterol, total","chol total"],
  ldl:["ldl cholesterol","ldl-c","ldl chol","ldl","low density"],
  hdl:["hdl cholesterol","hdl-c","hdl chol","hdl","high density"],
  nonhdl:["non-hdl cholesterol","non hdl cholesterol","non-hdl","non hdl","nonhdl"],
  cholratio:["cholesterol/hdl ratio","cholesterol hdl ratio","total cholesterol : hdl","chol/hdl","cholesterol ratio"],
  apob:["apolipoprotein b","apo b","apob"],
  lpa:["lipoprotein(a)","lipoprotein a","lp(a)","lpa"],
  trig:["triglycerides","triglyceride","trig"],
  glucoseF:["fasting glucose","glucose fasting","glucose, fasting","fasting blood glucose","fbg","fbs","glucose"],
  a1c:["hemoglobin a1c","haemoglobin a1c","glycated hemoglobin","glycohemoglobin","hba1c","a1c"],
  insulin:["fasting insulin","insulin"],
  uricacid:["uric acid","urate"],
  homocysteine:["homocysteine"],
  troponin:["troponin","hs-trop","trop"],
  bnp:["nt-probnp","ntprobnp","pro-bnp","natriuretic peptide","bnp"],
  ck:["creatine kinase","cpk","ck"],
  crp:["hs-crp","hscrp","c-reactive protein","c reactive protein","crp"],
  creat:["creatinine","creat"],
  egfr:["estimated gfr","glomerular filtration","egfr","gfr"],
  bun:["urea nitrogen","blood urea","bun"],
  cystatinc:["cystatin c","cystatin"],
  potassium:["potassium","serum potassium"],
  sodium:["sodium","serum sodium"],
  chloride:["chloride"],
  co2:["bicarbonate","carbon dioxide","hco3","co2"],
  calcium:["calcium"],
  magnesium:["magnesium"],
  phosphorus:["phosphorus","phosphate"],
  acr:["albumin/creatinine ratio","albumin creatinine ratio","albumin/creatinine","microalbumin","uacr","acr"],
  alt:["alanine aminotransferase","alanine transaminase","sgpt","alt"],
  ast:["aspartate aminotransferase","aspartate transaminase","sgot","ast"],
  alp:["alkaline phosphatase","alk phos","alp"],
  ggt:["gamma-glutamyl transferase","gamma glutamyl","ggtp","ggt"],
  bili:["total bilirubin","bilirubin total","bilirubin, total","tbili","t bili","bilirubin"],
  bilid:["direct bilirubin","conjugated bilirubin","bilirubin direct"],
  albumin:["albumin"],
  totprotein:["total protein","protein, total","protein total"],
  globulin:["globulin"],
  ldh:["lactate dehydrogenase","ldh"],
  hgb:["hemoglobin","haemoglobin","hgb","hb"],
  hct:["hematocrit","haematocrit","hct","pcv"],
  rbc:["red blood cell","red cell count","erythrocyte","rbc"],
  wbc:["white blood cell","white cell count","leukocyte","wbc"],
  platelets:["platelet count","platelets","platelet","plt"],
  mcv:["mean corpuscular volume","mcv"],
  mch:["mean corpuscular hemoglobin","mch"],
  mchc:["mean corpuscular hemoglobin concentration","mchc"],
  rdw:["red cell distribution width","rdw"],
  ferritin:["ferritin"],
  iron:["serum iron","iron"],
  tibc:["total iron binding capacity","total iron-binding","tibc"],
  transferrinsat:["transferrin saturation","transferrin sat","iron saturation","tsat"],
  tsh:["thyroid stimulating hormone","thyrotropin","tsh"],
  ft4:["free t4","free thyroxine","ft4"],
  ft3:["free t3","free triiodothyronine","ft3"],
  tpo:["thyroid peroxidase","anti-tpo","tpo antibod","tpo"],
  cortisol:["cortisol"],
  testosterone:["testosterone"],
  psa:["prostate specific antigen","prostate-specific","psa"],
  vitd:["vitamin d","25-hydroxy","25 hydroxy","25-oh","calcidiol"],
  b12:["vitamin b12","cobalamin","b12"],
  folate:["folate","folic acid"],
  b6:["vitamin b6","pyridoxine","b6"],
  esr:["erythrocyte sedimentation","sedimentation rate","sed rate","esr"],
  inr:["inr"],
  pt:["prothrombin time","prothrombin"],
  ptt:["partial thromboplastin","aptt","ptt"],
  ddimer:["d-dimer","d dimer","ddimer"],
  fibrinogen:["fibrinogen"],
  lipase:["lipase"],
  amylase:["amylase"],
  neutpct:["neutrophils %","neutrophil %","neutrophils percent","neut %","neutrophils"],
  neutabs:["neutrophils absolute","absolute neutrophil","neutrophil count","anc"],
  lymphpct:["lymphocytes %","lymphocyte %","lymphs %","lymphocytes"],
  lymphabs:["lymphocytes absolute","absolute lymphocyte","lymphocyte count"],
  monopct:["monocytes","monocyte %"],
  eospct:["eosinophils","eosinophil %"],
  basopct:["basophils","basophil %"],
  mpv:["mean platelet volume","mpv"],
  retic:["reticulocyte","reticulocytes","retic"],
  ckmb:["ck-mb","ckmb","ck mb"],
  myoglobin:["myoglobin"],
  cpeptide:["c-peptide","c peptide","cpeptide"],
  fructosamine:["fructosamine"],
  glucoseR:["random glucose","glucose random","non-fasting glucose","glucose, random"],
  lactate:["lactic acid","lactate"],
  ionca:["ionized calcium","ionised calcium","free calcium","calcium ionized"],
  aniongap:["anion gap"],
  osmolality:["osmolality","osmolarity"],
  zinc:["zinc"],
  copper:["copper"],
  ammonia:["ammonia"],
  haptoglobin:["haptoglobin"],
  tt4:["total t4","t4 total","total thyroxine","thyroxine, total"],
  tt3:["total t3","t3 total","total triiodothyronine"],
  rt3:["reverse t3","rt3"],
  thyroglobulin:["thyroglobulin"],
  pth:["parathyroid hormone","parathormone","intact pth","pth"],
  dheas:["dhea-sulfate","dhea sulfate","dhea-s","dheas"],
  igf1:["insulin-like growth factor","somatomedin","igf-1","igf 1"],
  acth:["adrenocorticotropic","acth"],
  aldosterone:["aldosterone"],
  estradiol:["estradiol","oestradiol","e2"],
  progesterone:["progesterone"],
  fsh:["follicle stimulating hormone","follicle-stimulating","fsh"],
  lh:["luteinizing hormone","luteinising hormone","lh"],
  prolactin:["prolactin"],
  shbg:["sex hormone binding globulin","sex hormone-binding","shbg"],
  freetesto:["free testosterone"],
  amh:["anti-mullerian","anti-müllerian","anti mullerian","amh"],
  hcg:["chorionic gonadotropin","beta-hcg","beta hcg","hcg"],
  vita:["vitamin a","retinol"],
  vite:["vitamin e","tocopherol"],
  vitc:["vitamin c","ascorbic acid","ascorbate"],
  vitk:["vitamin k","phylloquinone"],
  b1:["vitamin b1","thiamine","thiamin"],
  b2:["vitamin b2","riboflavin"],
  mma:["methylmalonic acid","mma"],
  selenium:["selenium"],
  prealbumin:["prealbumin","transthyretin"],
  omega3:["omega-3 index","omega 3 index","omega-3 fatty acid"],
  procalcitonin:["procalcitonin"],
  rf:["rheumatoid factor"],
  anticcp:["anti-ccp","anti ccp","ccp antibody","cyclic citrullinated"],
  c3:["complement c3","c3"],
  c4:["complement c4","c4"],
  igg:["immunoglobulin g","igg"],
  iga:["immunoglobulin a","iga"],
  igm:["immunoglobulin m","igm"],
  ige:["immunoglobulin e","ige"],
  thrombintime:["thrombin time"],
  antithrombin:["antithrombin"],
  proteinc:["protein c"],
  proteins:["protein s"],
  antixa:["anti-xa","anti xa","anti-factor xa","heparin level"],
  b2micro:["beta-2 microglobulin","beta 2 microglobulin","b2 microglobulin"],
  buncreat:["bun/creatinine","bun creatinine ratio","urea/creatinine ratio"],
  cea:["carcinoembryonic","cea"],
  ca199:["ca 19-9","ca19-9","ca 199"],
  ca125:["ca 125","ca-125"],
  ca153:["ca 15-3","ca15-3"],
  afp:["alpha-fetoprotein","alpha fetoprotein","afp"],
  ph:["blood ph","ph"],
  pco2:["partial pressure of carbon dioxide","paco2","pco2"],
  po2:["partial pressure of oxygen","pao2","po2"],
  baseexcess:["base excess","base deficit"],
  o2sat:["oxygen saturation","o2 saturation","o2 sat","sao2"]
};
const reEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function labName(id){ const l=LABS.find(x=>x.id===id); return l?l.name:id; }
function labUnit(id){ const l=LABS.find(x=>x.id===id); return l?l.unit:""; }
function aliasHit(low, a){ return new RegExp("(^|[^a-z0-9])"+reEsc(a)+"([^a-z0-9]|$)","i").test(low); }
function longestAlias(low){
  let best=null, bestLen=0;
  for(const id in LAB_ALIASES) for(const a of LAB_ALIASES[id]) if(a.length>bestLen && aliasHit(low, a)){ best=id; bestLen=a.length; }
  return best;
}
function parseLineForLab(line){
  const low=" "+line.toLowerCase()+" ";
  const id=longestAlias(low); if(!id) return null;
  // strip the test's own name (some aliases contain digits, e.g. 'a1c','b12','25-oh') so we don't read those as the value,
  // then drop parenthetical notes, reference ranges (a-b) and comparators (<a / >a); the first remaining number is the result
  let cleaned=line;
  (LAB_ALIASES[id]||[]).forEach(a=>{ cleaned=cleaned.replace(new RegExp(reEsc(a),"ig")," "); });
  cleaned=cleaned.replace(/\([^)]*\)/g," ").replace(/\d+(\.\d+)?\s*[-–—]\s*\d+(\.\d+)?/g," ").replace(/[<>]=?\s*\d+(\.\d+)?/g," ");
  const m=cleaned.match(/-?\d+(\.\d+)?/);
  if(m) return { id, value:parseFloat(m[0]), name:labName(id), unit:labUnit(id) };
  const m2=line.match(/[<>]=?\s*(\d+(\.\d+)?)/);           // e.g. eGFR ">60"
  if(m2) return { id, value:parseFloat(m2[1]), name:labName(id), unit:labUnit(id) };
  return null;
}
function jsonParseLabs(j){
  const out=[], seen=new Set();
  const push=(name,val)=>{ if(val==null||val==="") return; const id=matchAlias(String(name)); if(!id||seen.has(id)) return;
    const v=parseFloat(val); if(isNaN(v)) return; seen.add(id); out.push({id, value:v, name:labName(id), unit:labUnit(id)}); };
  if(Array.isArray(j)) j.forEach(o=>{ if(o&&typeof o==="object"){ const name=o.name||o.test||o.label||o.analyte||o.code||o.parameter; const val=o.value??o.result??o.val??o.reading; if(name!=null) push(name,val); } });
  else if(j&&typeof j==="object") Object.entries(j).forEach(([k,v])=>{ (v&&typeof v==="object") ? push(k, v.value??v.result??v.val) : push(k,v); });
  return out;
}
function matchAlias(name){ const low=name.toLowerCase().trim(); if(LABS.some(l=>l.id===low)) return low; return longestAlias(" "+low+" "); }
function localParseLabs(text){
  const t=(text||"").trim();
  if(t.startsWith("{")||t.startsWith("[")){ try{ const c=jsonParseLabs(JSON.parse(t)); if(c.length) return c; }catch(e){} }
  const out=[], seen=new Set();
  t.split(/\r?\n/).forEach(line=>{ const c=parseLineForLab(line); if(c && !seen.has(c.id)){ seen.add(c.id); out.push(c); } });
  return out;
}
// Best-effort collection-date extraction from an uploaded report (defaults to today if none found).
function isoDate(y,mo,d){ const p=n=>String(n).padStart(2,"0"); const M=+mo, D=+d; if(!(+y)||M<1||M>12||D<1||D>31) return null; return `${+y}-${p(M)}-${p(D)}`; }
function parseDateLoose(s){
  if(!s) return null;
  let m=s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); if(m) return isoDate(m[1],m[2],m[3]);              // 2026-07-11
  const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  m=s.match(/([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/i); if(m&&MON[m[1].slice(0,3).toLowerCase()]) return isoDate(m[3],MON[m[1].slice(0,3).toLowerCase()],m[2]); // Jul 11, 2026
  m=s.match(/(\d{1,2})\s+([a-z]{3,9})\.?\s+(\d{4})/i);  if(m&&MON[m[2].slice(0,3).toLowerCase()]) return isoDate(m[3],MON[m[2].slice(0,3).toLowerCase()],m[1]); // 11 Jul 2026
  m=s.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);     if(m){ let y=m[3]; if(y.length===2) y="20"+y; return isoDate(y,m[1],m[2]); }               // 07/11/2026 (assume M/D/Y)
  return null;
}
function detectCollectionDate(text){
  if(!text) return null;
  for(const ln of text.split(/\r?\n/)){
    if(/collect|specimen|drawn|report date|reported|date of service|accession|observation date/i.test(ln)){ const d=parseDateLoose(ln); if(d) return d; }
  }
  return parseDateLoose(text);
}
function fileToBase64(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(",")[1]); r.onerror=()=>rej(new Error("Could not read the file")); r.readAsDataURL(file); }); }
function extractJSON(t){
  if(!t) return null;
  let s=t.trim().replace(/^```(json)?/i,"").replace(/```$/,"").trim();
  try{ return JSON.parse(s); }catch(e){}
  const m=s.match(/\{[\s\S]*\}/); if(m){ try{ return JSON.parse(m[0]); }catch(e){} }
  return null;
}
async function apiParseLabs(payload){
  const known = LABS.map(l=>`${l.id} — ${l.name} (${l.unit}); aliases: ${(LAB_ALIASES[l.id]||[]).join(", ")}`).join("\n");
  const sys = `You extract laboratory test results from the user's document and map each to one of the KNOWN TESTS below.
KNOWN TESTS (id — name (target unit); aliases):
${known}

Return ONLY a JSON object — no prose, no code fences:
{"collectionDate":"YYYY-MM-DD or null","labs":[{"id":"<known id>","value":<number>,"unit":"<unit found>"}]}
Rules: "collectionDate" is the specimen collection/report date if shown (else null). Include a test only if it has a clear numeric result. Use the matching id from the list. If the reported unit differs from the target unit and the conversion is standard and unambiguous, convert to the target unit; otherwise return the original number and its unit. Ignore anything not in the list. If none are found, return {"labs":[]}.`;
  let content;
  if(payload.kind==="text") content=[{type:"text",text:`Extract the lab results from this document:\n\n${payload.text.slice(0,60000)}`}];
  else if(payload.kind==="image") content=[{type:"image",source:{type:"base64",media_type:payload.media_type,data:payload.data}},{type:"text",text:"Extract every lab test result visible in this image."}];
  else content=[{type:"document",source:{type:"base64",media_type:"application/pdf",data:payload.data}},{type:"text",text:"Extract every lab test result from this PDF."}];
  const res=await fetch("https://api.anthropic.com/v1/messages",{ method:"POST",
    headers:{"content-type":"application/json","x-api-key":state.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({ model:state.apiModel||"claude-opus-4-8", max_tokens:1500, system:sys, messages:[{role:"user",content}] }) });
  if(!res.ok){ const t=await res.text().catch(()=>""); throw new Error(`API ${res.status}${t?" — "+t.slice(0,140):""}`); }
  const data=await res.json();
  const txt=(data.content||[]).map(b=>b.text||"").join("");
  const parsed=extractJSON(txt), labs=(parsed&&parsed.labs)||[];
  const collectionDate = parsed && parsed.collectionDate ? parseDateLoose(String(parsed.collectionDate)) : null;
  return { collectionDate, cands: labs.filter(x=>x&&x.id!=null&&x.value!=null).map(x=>({id:x.id, value:x.value, unit:x.unit, name:labName(x.id)})) };
}
async function handleLabFile(file){
  const ext=(file.name.split(".").pop()||"").toLowerCase();
  const isImage=file.type.startsWith("image/")||/^(png|jpg|jpeg|webp|gif|heic)$/.test(ext);
  const isPdf=file.type==="application/pdf"||ext==="pdf";
  labImportMsg("load", `Reading ${esc(file.name)}…`);
  try{
    let cands=[], collectionDate=null;
    if(isImage||isPdf){
      if(!coachOnline()){ labImportMsg("warn","PDFs and photos are parsed with the Claude API. Add your key in the <b>AI</b> tab, or upload a CSV, TSV, TXT or JSON export instead."); return; }
      labImportMsg("load", `Parsing ${isPdf?"PDF":"image"} with Claude…`);
      const r = await apiParseLabs({ kind:isPdf?"pdf":"image", media_type:file.type||"image/jpeg", data:await fileToBase64(file) });
      cands=r.cands; collectionDate=r.collectionDate;
    } else {
      const text=await file.text();
      if(coachOnline()){ labImportMsg("load","Parsing with Claude…"); try{ const r=await apiParseLabs({kind:"text",text}); cands=r.cands; collectionDate=r.collectionDate; }catch(e){ cands=localParseLabs(text); collectionDate=detectCollectionDate(text); } }
      else { cands=localParseLabs(text); collectionDate=detectCollectionDate(text); }
    }
    cands=(cands||[]).filter(c=>LABS.some(l=>l.id===c.id) && c.value!=null && c.value!=="" && !isNaN(parseFloat(c.value)));
    if(!cands.length){ labImportMsg("warn","Couldn't find recognizable lab values in that file. Try a clearer export (CSV/JSON) or enter values manually below."); return; }
    // de-dupe by id, keep first
    const seen=new Set(); cands=cands.filter(c=>seen.has(c.id)?false:(seen.add(c.id),true));
    showLabReview(cands, collectionDate);
  }catch(e){ labImportMsg("err","Import failed: "+esc(e.message||String(e))); }
}
function labImportMsg(kind, html){ const el=$("#labImport"); if(el) el.innerHTML=`<div class="labimsg ${kind}">${html}</div>`; }
function showLabReview(cands, collectionDate){
  const el=$("#labImport"); if(!el) return;
  const dval = collectionDate || todayISO();
  el.innerHTML=`<div class="labreview">
    <div class="labrevhd"><b>Found ${cands.length} value${cands.length>1?"s":""}</b> — check each against your report, confirm the collection date, then apply.</div>
    <label class="labrevdate">🗓 Collection date <input type="date" id="labImportDate" value="${esc(dval)}" /></label>
    ${cands.map((c,i)=>`<label class="labrevrow"><input type="checkbox" class="labrevchk" data-i="${i}" checked />
      <span class="labrevname">${esc(labName(c.id))}</span>
      <input class="labrevval" data-i="${i}" value="${esc(String(c.value))}" inputmode="decimal" />
      <span class="labrevunit">${esc(c.unit||labUnit(c.id))}</span></label>`).join("")}
    <div class="labrevbtns"><button class="btn ghost" id="labRevCancel">Cancel</button><button class="btn primary" id="labRevApply">Apply to my labs</button></div>
    <p class="hint" style="margin:8px 0 0">Automated parsing can make mistakes — verify each value first. Applying keeps a dated record, so uploading another report adds a column you can compare.${coachOnline()?" This file was parsed by the Claude API (its contents were sent to Anthropic).":""}</p>
  </div>`;
  $("#labRevApply").onclick=()=>applyLabImport(cands);
  $("#labRevCancel").onclick=()=>{ el.innerHTML=""; };
}
function applyLabImport(cands){
  const el=$("#labImport"); let n=0;
  const dInp=el.querySelector("#labImportDate");
  const date=(dInp && dInp.value) ? dInp.value : todayISO();
  state.labHist = state.labHist || {};
  cands.forEach((c,i)=>{ const chk=el.querySelector(`.labrevchk[data-i="${i}"]`); if(!chk||!chk.checked) return;
    const vi=el.querySelector(`.labrevval[data-i="${i}"]`); const v=(vi?vi.value:String(c.value)).trim();
    if(v==="") return;
    // record a dated reading for comparison (replace same-date entry), keep sorted
    const arr = state.labHist[c.id] = state.labHist[c.id] || [];
    const ex = arr.findIndex(r=>r.d===date); if(ex>=0) arr[ex]={d:date,v}; else arr.push({d:date,v});
    arr.sort((a,b)=>a.d<b.d?-1:1);
    // the working value shown/scored is the most recent dated reading
    (state.labs[c.id]=state.labs[c.id]||{}).v = arr[arr.length-1].v;
    n++; });
  save(); renderLabs(); renderRisks();
  labImportMsg("ok", `Applied ${n} value${n===1?"":"s"} for ${esc(fmtShort(date))}. ✓ Upload another report to compare over time.`);
  toast(`Imported ${n} lab value${n===1?"":"s"}.`);
}

/* ---- educational risk assessment across 5 specialties ---- */
function computeRisks(){
  const v=latestVitals(), sbp=vnum(v.sbp), dbp=vnum(v.dbp), hr=vnum(v.restHR), glu=vnum(v.glucose);
  const bmi=bmiCalc(v.height, v.weight), age=vnum(state.age);
  const L=id=>vnum((state.labs[id]||{}).v);
  const gt=(x,n)=>x!=null&&x>=n, lt=(x,n)=>x!=null&&x<n;
  const flags=new Set(gatherFlags());
  const conds=selectedConditions().map(c=>c.name.toLowerCase()).join(" | ");
  const smoker=state.smoking==="current", alcHeavy=state.alcohol==="heavy", alcReg=state.alcohol==="regular"||alcHeavy;
  const nsaid=selectedMeds().some(m=>(m.flags||[]).includes("nsaid"));
  const diab = flags.has("diabetes") || gt(L("a1c"),6.5) || gt(glu,126) || gt(L("glucoseF"),126);
  const mk=(domain,title,icon,factors,score,modAt,highAt,note)=>({domain,title,icon,factors,note,
    level: score>=highAt?"high":score>=modAt?"moderate":"low"});
  const R=[];

  { let f=[],s=0;
    if(gt(sbp,160)||gt(dbp,100)){f.push("Blood pressure is high");s+=3;} else if(gt(sbp,140)||gt(dbp,90)){f.push("Blood pressure is elevated");s+=2;} else if(gt(sbp,130)){f.push("Blood pressure is borderline");s+=1;}
    if(gt(L("ldl"),160)||gt(L("tchol"),240)){f.push("LDL / total cholesterol is high");s+=2;} else if(gt(L("ldl"),130)||gt(L("tchol"),200)){f.push("Cholesterol is borderline");s+=1;}
    if(lt(L("hdl"),40)){f.push("HDL ('good') cholesterol is low");s+=1;}
    if(gt(L("trig"),200)){f.push("Triglycerides are high");s+=1;}
    if(diab){f.push("Diabetes / high blood sugar");s+=2;}
    if(smoker){f.push("Current smoker");s+=2;}
    if(bmi!=null&&bmi>=30){f.push("BMI in the obese range");s+=1;}
    if(gt(L("crp"),3)){f.push("hs-CRP (inflammation) is high");s+=1;}
    if(gt(hr,90)){f.push("Resting heart rate is high");s+=1;}
    if(gt(age,70)){f.push("Age 70+");s+=2;} else if(gt(age,55)){f.push("Age 55+");s+=1;}
    R.push(mk("cardiac","Cardiovascular Risk","🫀",f,s,3,6,"Blood pressure, cholesterol, blood sugar, not smoking, a healthy weight and regular aerobic exercise are the biggest levers here.")); }

  { let f=[],s=0;
    if(gt(sbp,160)||gt(dbp,100)){f.push("Blood pressure is high (the #1 stroke risk factor)");s+=3;} else if(gt(sbp,140)||gt(dbp,90)){f.push("Blood pressure is elevated");s+=2;}
    if(/fibrillation|atrial|flutter|arrhythmia/.test(conds)||flags.has("pacemaker_icd")){f.push("Irregular heart-rhythm history");s+=2;}
    if(/stroke|tia|transient ischemic/.test(conds)){f.push("Prior stroke / TIA");s+=2;}
    if(diab){f.push("Diabetes");s+=1;}
    if(smoker){f.push("Current smoker");s+=2;}
    if(gt(L("ldl"),160)){f.push("High LDL cholesterol");s+=1;}
    if(bmi!=null&&bmi>=30){f.push("BMI in the obese range");s+=1;}
    if(gt(age,75)){f.push("Age 75+");s+=2;} else if(gt(age,65)){f.push("Age 65+");s+=1;}
    R.push(mk("stroke","Cerebrovascular Risk","🧠",f,s,3,6,"Controlling blood pressure is the single biggest way to lower cerebrovascular (stroke) risk; treating an irregular heart rhythm and not smoking matter a lot too.")); }

  { let f=[],s=0;
    if(gt(L("alt"),56)||gt(L("ast"),40)){f.push("Liver enzymes (ALT/AST) are raised");s+=2;}
    if(gt(L("ggt"),48)){f.push("GGT is raised (often alcohol-related)");s+=1;}
    if(gt(L("bili"),1.2)){f.push("Bilirubin is high");s+=1;}
    if(lt(L("albumin"),3.5)){f.push("Albumin is low");s+=1;}
    if(alcHeavy){f.push("Heavy alcohol use");s+=2;} else if(alcReg){f.push("Regular alcohol use");s+=1;}
    if(bmi!=null&&bmi>=30){f.push("BMI in obese range (fatty-liver risk)");s+=1;}
    if(diab){f.push("Diabetes (fatty-liver risk)");s+=1;}
    R.push(mk("hepatic","Hepatic Risk","🩺",f,s,2,5,"Cutting alcohol, reaching a healthy weight, and controlling blood sugar are the main ways to protect your liver.")); }

  { let f=[],s=0;
    if(lt(L("egfr"),45)||gt(L("creat"),1.5)){f.push("Kidney filtration (eGFR/creatinine) is reduced");s+=3;} else if(lt(L("egfr"),60)||gt(L("creat"),1.3)){f.push("Kidney filtration is mildly reduced");s+=2;}
    if(gt(L("acr"),30)){f.push("Protein in the urine (raised ACR)");s+=2;}
    if(gt(sbp,140)||gt(dbp,90)){f.push("High blood pressure");s+=1;}
    if(diab){f.push("Diabetes");s+=1;}
    if(gt(L("potassium"),5.1)){f.push("Potassium is high");s+=1;}
    if(gt(age,70)){f.push("Age 70+");s+=1;}
    R.push(mk("renal","Renal Risk","🫘",f,s,3,6,"Kidneys are protected mainly by controlling blood pressure and blood sugar, staying hydrated, and avoiding NSAIDs and excess salt.")); }

  { let f=[],s=0;
    if(state.screen&&state.screen.weightloss){f.push("Unexplained weight loss (flagged)");s+=2;}
    if(lt(L("hgb"),12)){f.push("Low hemoglobin (anemia — can signal GI blood loss)");s+=2;}
    if(lt(L("ferritin"),30)){f.push("Low iron stores (ferritin)");s+=1;}
    if(gt(L("lipase"),140)){f.push("High lipase (pancreas irritation)");s+=2;}
    if(alcHeavy){f.push("Heavy alcohol use");s+=2;} else if(alcReg){f.push("Regular alcohol use");s+=1;}
    if(nsaid){f.push("Regular NSAID use (stomach-bleed risk)");s+=1;}
    if(bmi!=null&&bmi>=30){f.push("BMI in obese range (reflux risk)");s+=1;}
    if(smoker){f.push("Current smoker");s+=1;}
    if(state.screen&&state.screen.fever){f.push("Fever with symptoms (flagged)");s+=1;}
    R.push(mk("gastro","Gastrointestinal Risk","🍽️",f,s,2,5,"Limiting alcohol and NSAIDs, not smoking, a fiber-rich diet and a healthy weight protect your gut. Unexplained weight loss, blood, or persistent symptoms need prompt review.")); }

  { let f=[],s=0; const spo2v=vnum(v.spo2);
    if(spo2v!=null&&spo2v<92){f.push("Oxygen saturation (SpO₂) is low");s+=3;} else if(spo2v!=null&&spo2v<95){f.push("Oxygen saturation is borderline");s+=1;}
    if(smoker){f.push("Current smoker");s+=3;} else if(state.smoking==="former"){f.push("Former smoker");s+=1;}
    if(flags.has("pulmonary")){f.push("Existing lung / breathing condition");s+=2;}
    if(state.parq&&state.parq.pain){f.push("Breathlessness or chest tightness with exertion");s+=1;}
    if(bmi!=null&&bmi>=35){f.push("Very high BMI (can restrict breathing)");s+=1;}
    if(gt(age,65)){f.push("Age 65+");s+=1;}
    R.push(mk("pulmonary","Pulmonary Risk","🫁",f,s,2,5,"Not smoking is by far the biggest protector of your lungs; regular aerobic exercise, breathing techniques, staying up to date on vaccinations and avoiding air pollutants help too. Get a lasting cough, wheeze, or new breathlessness checked.")); }

  return R;
}
function renderRisks(){
  const el=$("#riskBody"); if(!el) return;
  const risks=computeRisks(), areas=computeRiskAreas();
  const dual = areas.length>0;   // labs/vitals entered → show BOTH groups under the one card, each labelled
  const lvlTxt={low:"Lower",moderate:"Moderate",high:"Higher"}, lvlCls={low:"risk-low",moderate:"risk-mod",high:"risk-high"};
  const scored = risks.map(r=>{
    const cls=lvlCls[r.level];
    const facts = r.factors.length
      ? `<ul class="riskfactors">${r.factors.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>`
      : `<p class="hint" style="margin:6px 0 0">No major risk factors flagged from what you've entered so far.</p>`;
    return `<div class="riskcard ${cls}">
      <div class="riskhead"><span class="ricon">${r.icon}</span><span class="rtitle">${esc(r.title)}</span><span class="rlevel ${cls}">${lvlTxt[r.level]} risk</span></div>
      ${facts}
      <p class="risknote">${esc(r.note)}</p>
    </div>`;
  }).join("");
  const aTxt={normal:"No flags",info:"Note",moderate:"Review",high:"Abnormal"}, aCls={normal:"risk-low",info:"risk-info",moderate:"risk-mod",high:"risk-high"};
  const areaCards = areas.map(a=>{
    const cls=aCls[a.level]||"risk-info";
    return `<div class="riskcard ${cls}">
      <div class="riskhead"><span class="ricon">${a.icon}</span><span class="rtitle">${esc(a.title)}</span><span class="rlevel ${cls}">${aTxt[a.level]||"Note"}</span></div>
      <ul class="riskfindings">${a.findings.map(x=>`<li class="rf-${x.lv||'info'}">${esc(x.t)}</li>`).join("")}</ul>
      <p class="risknote">${esc(a.note)}</p>
    </div>`;
  }).join("");
  el.innerHTML =
    (dual ? `<div class="risksub">Cardiovascular &amp; organ risk</div>` : "") + scored +
    (dual ? `<div class="risksub">Lab &amp; vital risk areas</div>` + areaCards : "") +
    `<div class="redflags" style="margin-top:12px"><b>Educational only — not a diagnosis or a validated risk score.</b> These estimates use general adult thresholds and only the values you entered; some vary by sex, age and lab. Discuss any concerns, and any abnormal labs, with your doctor.</div>`;
}

/* Health Risk Areas — clinically-grouped lab interpretation (metabolic, hematology, nutrition,
   thyroid, bone, thrombosis, inflammation/infection, reproductive, oncology awareness).
   Each area only appears once it has relevant data; educational, not diagnostic. */
function computeRiskAreas(){
  const v=latestVitals(), sbp=vnum(v.sbp), dbp=vnum(v.dbp), rr=vnum(v.rr), gluV=vnum(v.glucose);
  const bmi=bmiCalc(v.height,v.weight), sex=state.sex;
  const L=id=>vnum((state.labs[id]||{}).v);
  const has=(...ids)=>ids.some(id=>L(id)!=null);
  const rank={normal:0,info:1,moderate:2,high:3};
  const areas=[];
  function push(icon,title,dataPresent,f,note){
    if(!dataPresent) return;
    let level="normal"; f.forEach(x=>{ if(rank[x.lv]>rank[level]) level=x.lv; });
    const findings = f.length ? f : [{t:"No abnormal values in this area from what you entered.",lv:"normal"}];
    areas.push({icon,title,level,findings,note});
  }

  // ---- Metabolic ----
  { const f=[]; const a1c=L("a1c"),gf=L("glucoseF"),ins=L("insulin"),fru=L("fructosamine"),tg=L("trig"),hdl=L("hdl");
    if(a1c!=null){ if(a1c>=6.5) f.push({t:`HbA1c ${a1c}% — diabetes range`,lv:"high"}); else if(a1c>=5.7) f.push({t:`HbA1c ${a1c}% — prediabetes range`,lv:"moderate"}); }
    if(gf!=null){ if(gf>=126) f.push({t:`Fasting glucose ${gf} — diabetes range`,lv:"high"}); else if(gf>=100) f.push({t:`Fasting glucose ${gf} — prediabetes range`,lv:"moderate"}); }
    if(fru!=null&&fru>285) f.push({t:`Fructosamine ${fru} — average glucose high over the past 2–3 weeks`,lv:"moderate"});
    if(ins!=null&&gf!=null){ const homa=Math.round((gf*ins/405)*10)/10; if(homa>=2.9) f.push({t:`HOMA-IR ${homa} — suggests insulin resistance`,lv:"moderate"}); else f.push({t:`HOMA-IR ${homa} — insulin sensitivity looks normal`,lv:"normal"}); }
    else if(ins!=null&&ins>20) f.push({t:`Fasting insulin ${ins} — high (possible insulin resistance)`,lv:"moderate"});
    const ms=[]; if(bmi!=null&&bmi>=30) ms.push("BMI"); if(tg!=null&&tg>=150) ms.push("triglycerides"); if(hdl!=null&&hdl<(sex==="Female"?50:40)) ms.push("HDL"); if((sbp!=null&&sbp>=130)||(dbp!=null&&dbp>=85)) ms.push("BP"); if((gf!=null&&gf>=100)||(a1c!=null&&a1c>=5.7)) ms.push("glucose");
    if(ms.length>=3) f.push({t:`Metabolic-syndrome criteria met (${ms.length}/5: ${ms.join(", ")})`,lv:ms.length>=4?"high":"moderate"});
    push("🫀","Metabolic", has("a1c","glucoseF","insulin","cpeptide","fructosamine","trig","hdl")||gluV!=null, f,
      "Reversible with weight loss, a lower-sugar whole-food diet and regular exercise. Discuss abnormal sugars or insulin resistance with your clinician."); }

  // ---- Hematology ----
  { const f=[]; const hgb=L("hgb"),hct=L("hct"),mcv=L("mcv"),rdw=L("rdw"),wbc=L("wbc"),plt=L("platelets"),neut=L("neutabs");
    const fer=L("ferritin"),tsat=L("transferrinsat"),b12=L("b12"),fol=L("folate"),hapto=L("haptoglobin"),ldh=L("ldh"),retic=L("retic");
    const lowHgb = hgb!=null && hgb<(sex==="Female"?12:13);
    if(lowHgb){ let type="normocytic"; if(mcv!=null){ if(mcv<80) type="microcytic"; else if(mcv>100) type="macrocytic"; }
      const cause = type==="microcytic" ? ((fer!=null&&fer<30)||(tsat!=null&&tsat<20)?" — iron-deficiency pattern":" — usually iron deficiency")
        : type==="macrocytic" ? (b12!=null&&b12<200?" — low B12":fol!=null&&fol<3?" — low folate":" — check B12/folate & alcohol")
        : " — normocytic (chronic disease, blood loss or early deficiency)";
      f.push({t:`Anemia — Hb ${hgb}, ${type}${cause}`,lv:"high"}); }
    if((hapto!=null&&hapto<30)||((ldh!=null&&ldh>222)&&(retic!=null&&retic>2.5))) f.push({t:"Hemolysis signals — low haptoglobin / high LDH & reticulocytes",lv:"high"});
    if((hgb!=null&&hgb>(sex==="Female"?16:17))||(hct!=null&&hct>52)) f.push({t:"Polycythemia — high hemoglobin/hematocrit (hydrate; raises clot risk)",lv:"moderate"});
    if(wbc!=null&&wbc<4) f.push({t:`Leukopenia — low white cells ${wbc}`,lv:wbc<2?"high":"moderate"});
    if(neut!=null&&neut<1.5) f.push({t:`Neutropenia — low neutrophils ${neut}`,lv:neut<0.5?"high":"moderate"});
    if(plt!=null&&plt<150) f.push({t:`Thrombocytopenia — low platelets ${plt}`,lv:plt<50?"high":"moderate"});
    if(rdw!=null&&rdw>14.5&&!lowHgb) f.push({t:"High RDW (mixed red-cell sizes) — early/combined deficiency possible",lv:"info"});
    push("🔴","Hematology", has("hgb","hct","rbc","mcv","wbc","platelets","ferritin","iron","b12","folate","haptoglobin","ldh","retic","neutabs"), f,
      "Anemia and low counts need a cause found — see your doctor, especially to rule out slow blood loss."); }

  // ---- Nutrition ----
  { const f=[];
    [["vitd",30,"Vitamin D"],["b12",200,"Vitamin B12"],["folate",3,"Folate"],["b6",5,"Vitamin B6"],["b1",70,"Vitamin B1"],["vita",20,"Vitamin A"],["vite",5.5,"Vitamin E"],["vitc",0.4,"Vitamin C"],["vitk",0.1,"Vitamin K"],["zinc",60,"Zinc"],["copper",70,"Copper"],["selenium",70,"Selenium"],["magnesium",1.7,"Magnesium"],["iron",60,"Serum iron"]]
      .forEach(([id,lo,name])=>{ const x=L(id); if(x!=null&&x<lo) f.push({t:`${name} low (${x})`,lv:"moderate"}); });
    const alb=L("albumin"),pre=L("prealbumin"),tp=L("totprotein");
    if(alb!=null&&alb<3.5) f.push({t:`Albumin low (${alb}) — protein/nutrition or inflammation`,lv:"moderate"});
    if(pre!=null&&pre<18) f.push({t:`Prealbumin low (${pre}) — recent protein-calorie intake`,lv:"moderate"});
    if(tp!=null&&tp<6) f.push({t:`Total protein low (${tp})`,lv:"moderate"});
    push("🧁","Nutrition", has("vitd","b12","folate","b6","b1","vita","vite","vitc","vitk","zinc","copper","selenium","magnesium","iron","albumin","prealbumin","totprotein"), f,
      "Targeted diet changes or supplements (as advised) correct these. Low vitamin D and protein also affect bone and muscle recovery."); }

  // ---- Thyroid ----
  { const f=[]; const tsh=L("tsh"),ft4=L("ft4"),ft3=L("ft3"),tpo=L("tpo");
    const lowFT4=ft4!=null&&ft4<0.8, highFT4=ft4!=null&&ft4>1.8;
    if(tsh!=null&&tsh>4){ if(lowFT4) f.push({t:`Overt hypothyroidism — high TSH ${tsh} with low free T4`,lv:"high"}); else if(ft4!=null) f.push({t:`Subclinical hypothyroidism — high TSH ${tsh}, normal free T4`,lv:"moderate"}); else f.push({t:`High TSH ${tsh} — possible underactive thyroid`,lv:"moderate"}); }
    if(tsh!=null&&tsh<0.4){ if(highFT4||(ft3!=null&&ft3>4.2)) f.push({t:`Overt hyperthyroidism — low TSH ${tsh} with high free T4/T3`,lv:"high"}); else if(ft4!=null) f.push({t:`Subclinical hyperthyroidism — low TSH ${tsh}, normal free T4`,lv:"moderate"}); else f.push({t:`Low TSH ${tsh} — possible overactive thyroid`,lv:"moderate"}); }
    if(tpo!=null&&tpo>34) f.push({t:`Raised thyroid antibodies (TPO ${tpo}) — autoimmune thyroid disease`,lv:"moderate"});
    push("🦋","Thyroid", has("tsh","ft4","ft3","tt4","tt3","rt3","tpo","thyroglobulin"), f,
      "Thyroid problems affect energy, weight, heart rate and mood — confirm and manage with your doctor."); }

  // ---- Bone Health ----
  { const f=[]; const ca=L("calcium"),alb=L("albumin"),phos=L("phosphorus"),vitd=L("vitd"),pth=L("pth"),alp=L("alp"),mg=L("magnesium");
    let cca=ca; if(ca!=null&&alb!=null) cca=Math.round((ca+0.8*(4-alb))*10)/10;
    if(cca!=null){ if(cca>10.3) f.push({t:`Calcium high (${cca}${alb!=null?", albumin-corrected":""}) — needs review`,lv:"high"}); else if(cca<8.6) f.push({t:`Calcium low (${cca}${alb!=null?", albumin-corrected":""})`,lv:"moderate"}); }
    if(vitd!=null&&vitd<30) f.push({t:`Vitamin D low (${vitd}) — affects bone & muscle`,lv:"moderate"});
    if(pth!=null){ if(pth>65) f.push({t:`PTH high (${pth}) — parathyroid / vitamin-D / kidney review`,lv:"moderate"}); else if(pth<15) f.push({t:`PTH low (${pth})`,lv:"info"}); }
    if(phos!=null&&(phos>4.5||phos<2.5)) f.push({t:`Phosphate out of range (${phos})`,lv:"info"});
    if(alp!=null&&alp>147) f.push({t:`ALP high (${alp}) — bone or liver source`,lv:"info"});
    if(mg!=null&&mg<1.7) f.push({t:`Magnesium low (${mg}) — affects calcium & PTH`,lv:"info"});
    if(cca!=null&&cca<8.6&&pth!=null&&pth>65&&vitd!=null&&vitd<30) f.push({t:"Pattern: vitamin-D deficiency with secondary hyperparathyroidism",lv:"moderate"});
    push("🦴","Bone Health", has("calcium","phosphorus","vitd","pth","alp","magnesium"), f,
      "Bone is protected by weight-bearing exercise, enough calcium & vitamin D, and not smoking. Abnormal calcium or PTH needs a doctor."); }

  // ---- Thrombosis & bleeding ----
  { const f=[]; const dd=L("ddimer"),fib=L("fibrinogen"),plt=L("platelets"),hct=L("hct"),inr=L("inr"),pt=L("pt"),ptt=L("ptt");
    if(dd!=null&&dd>0.5) f.push({t:`D-dimer raised (${dd}) — non-specific but can indicate a clot`,lv:"high"});
    if(hct!=null&&hct>52) f.push({t:`High hematocrit (${hct}) — hyperviscosity / clot risk`,lv:"moderate"});
    if(fib!=null&&fib>400) f.push({t:`Fibrinogen high (${fib}) — inflammation / clot tendency`,lv:"info"});
    if(plt!=null&&plt>450) f.push({t:`Platelets high (${plt}) — clot tendency`,lv:"info"});
    if(plt!=null&&plt<150) f.push({t:`Platelets low (${plt}) — bleeding risk`,lv:plt<50?"high":"moderate"});
    if(inr!=null&&inr>1.4) f.push({t:`INR raised (${inr}) — anticoagulated / bleeding tendency`,lv:inr>4?"high":"moderate"});
    if(pt!=null&&pt>13.5) f.push({t:`PT prolonged (${pt})`,lv:"moderate"});
    if(ptt!=null&&ptt>35) f.push({t:`aPTT prolonged (${ptt})`,lv:"moderate"});
    if(fib!=null&&fib<200) f.push({t:`Fibrinogen low (${fib}) — bleeding tendency`,lv:"moderate"});
    push("🩹","Thrombosis & bleeding", has("ddimer","fibrinogen","platelets","hct","inr","pt","ptt"), f,
      "Clot warning signs — a hot, swollen, painful calf or sudden breathlessness/chest pain — need urgent care. On blood thinners, watch for unusual bruising or bleeding."); }

  // ---- Inflammation & Infection ----
  { const f=[]; const crp=L("crp"),esr=L("esr"),fer=L("ferritin"),pct=L("procalcitonin"),lac=L("lactate"),wbc=L("wbc"),anc=L("neutabs");
    if(crp!=null&&crp>3) f.push({t:`hs-CRP raised (${crp})`,lv:crp>10?"high":"moderate"});
    if(esr!=null&&esr>20) f.push({t:`ESR raised (${esr})`,lv:"moderate"});
    if(fer!=null&&fer>500) f.push({t:`Ferritin very high (${fer}) — marked inflammation`,lv:"moderate"});
    if(pct!=null&&pct>0.5) f.push({t:`Procalcitonin raised (${pct}) — suggests bacterial infection`,lv:pct>2?"high":"moderate"});
    if(wbc!=null&&wbc>11) f.push({t:`WBC high (${wbc}) — infection / inflammation`,lv:"moderate"});
    if(anc!=null&&anc>8) f.push({t:`Neutrophils high (${anc})`,lv:"info"});
    if(lac!=null&&lac>2) f.push({t:`Lactate raised (${lac})`,lv:lac>4?"high":"moderate"});
    const q=[]; if(rr!=null&&rr>=22) q.push("fast breathing"); if(sbp!=null&&sbp<=100) q.push("low blood pressure");
    if(q.length>=2||(q.length>=1&&((pct!=null&&pct>0.5)||(lac!=null&&lac>2)))) f.push({t:`Sepsis warning signs (${q.join(" + ")}) — if you feel unwell or feverish, seek urgent care`,lv:"high"});
    push("🔥","Inflammation & Infection", has("crp","esr","ferritin","procalcitonin","lactate","wbc","neutabs")||rr!=null, f,
      "A single raised marker is non-specific; combined with feeling unwell or a fever it needs care. Sepsis is a medical emergency."); }

  // ---- Reproductive & Hormonal ----
  { const f=[]; const testo=L("testosterone"),e2=L("estradiol"),fsh=L("fsh"),lh=L("lh"),prl=L("prolactin"),dheas=L("dheas"),amh=L("amh");
    if(sex==="Male"){ if(testo!=null&&testo<300) f.push({t:`Total testosterone low (${testo}) — possible hypogonadism (low-T)`,lv:"moderate"}); }
    else if(sex==="Female"){
      if(fsh!=null&&fsh>25&&e2!=null&&e2<30) f.push({t:"Menopausal pattern — high FSH with low estradiol",lv:"info"});
      if(lh!=null&&fsh!=null&&fsh>0&&(lh/fsh)>=2&&((testo!=null&&testo>70)||(dheas!=null&&dheas>430)||(amh!=null&&amh>4))) f.push({t:"PCOS-suggestive pattern — high LH:FSH with raised androgens/AMH",lv:"moderate"});
    }
    if(prl!=null&&prl>25) f.push({t:`Prolactin high (${prl}) — review (medication or pituitary)`,lv:"moderate"});
    push("🌸","Reproductive & Hormonal", has("testosterone","freetesto","estradiol","progesterone","fsh","lh","prolactin","shbg","dheas","amh"), f,
      sex ? "Hormones are best interpreted with cycle timing, symptoms and sex in mind — review with your doctor." : "Set your sex in the History step so these are interpreted correctly."); }

  // ---- Oncology Marker Awareness ----
  { const f=[];
    [["psa",4,"PSA"],["cea",3,"CEA"],["ca125",35,"CA 125"],["ca199",37,"CA 19-9"],["ca153",30,"CA 15-3"],["afp",8,"AFP"]]
      .forEach(([id,hi,name])=>{ const x=L(id); if(x!=null) f.push(x>hi?{t:`${name} above range (${x}) — many benign causes; discuss with your doctor`,lv:"info"}:{t:`${name} within range (${x})`,lv:"normal"}); });
    push("🎗️","Oncology Marker Awareness", has("psa","cea","ca125","ca199","ca153","afp"), f,
      "IMPORTANT: tumour markers are for MONITORING a known condition, not screening or diagnosis. Raised levels often have benign causes and normal levels don't rule cancer out — use them only as your specialist directs."); }

  return areas;
}
/* renderOtherRisks was merged into renderRisks — computeRiskAreas now renders inside the single
   "What Your Numbers Suggest" card (#riskBody), so there is no separate #otherRiskBody host. */

/* Auto-open the data-ENTRY Health cards (Vitals log, Labs) when they already hold data, and
   show a count in the summary — so a returning user discovers their logged data instead of a
   wall of collapsed "report" headers. Fresh/empty cards stay collapsed (the all-collapsed
   default is preserved); once opened this session the user's manual collapse is respected.
   The read-only interpretation cards (Risk / Other / Data backup) stay collapsed. */
function healthCardCount(id){
  if(id==="vitalsLogCard") return (state.vitalsLog||[]).length;
  if(id==="labsCard") return Object.values(state.labs||{}).filter(l=>l && l.v!=="" && l.v!=null).length;
  return 0;
}
function syncHealthCards(){
  [["vitalsLogCard","reading"],["labsCard","value"]].forEach(([id,noun])=>{
    const card=document.getElementById(id); if(!card) return;
    const sum=card.querySelector("summary.collapsesum"); if(!sum) return;
    const n=healthCardCount(id);
    let badge=sum.querySelector(".hcardcount");
    if(n>0){
      if(!badge){ badge=document.createElement("span"); badge.className="hcardcount"; const h=sum.querySelector("h2"); if(h) h.after(badge); else sum.appendChild(badge); }
      badge.textContent = n+" "+noun+(n===1?"":"s");
      if(!card._autoSynced) card.open = true;   // open populated cards the first time this session
    } else if(badge){ badge.remove(); }
    card._autoSynced = true;
  });
}
function renderHealth(){ renderHRMonitor(); renderVitalsLog(); renderLabs(); renderMeasures(); renderRisks(); syncHealthCards(); }
/* OBJ-1: the recovery-measurements trend (the values captured in the Program's "Ready to progress?"). */
function measureDef(key){
  for(const set of Object.values(MEASURE_SETS)){ const g = set.find(x=>x.key===key); if(g) return g; }
  return { key, label:key, kind:"ratio" };
}
function renderMeasures(){
  const host = $("#measuresBody"); if(!host) return;
  const m = state.measures || {};
  const keys = Object.keys(m).filter(k=>(m[k]||[]).length);
  if(!keys.length){ host.innerHTML = `<p class="hint muted">Nothing recorded yet — when you're in a program, record range and strength in <b>Ready to progress?</b> and each measure will trend here.</p>`; return; }
  host.innerHTML = keys.map(k=>{
    const g = measureDef(k), hist = m[k];
    const latest = hist[hist.length-1];
    const now = g.kind==="tick" ? (Number(latest.aff)>=1?"confirmed ✓":"not yet")
              : (measurePct(latest)!=null ? measurePct(latest)+"% of the other side" : "—");
    const rows = hist.slice(-8).map(e=>{
      const detail = g.kind==="tick" ? (Number(e.aff)>=1?"confirmed":"—")
                   : `${esc(String(e.aff))} / ${esc(String(e.oth))}${g.unit?" "+esc(g.unit):""}`;
      const pct = g.kind==="tick" ? "" : (measurePct(e)!=null ? measurePct(e)+"%" : "");
      return `<div class="mtrendrow"><span class="mtd">${esc(e.d)}</span><span class="mtv">${detail}</span><span class="mtp">${esc(pct)}</span></div>`;
    }).join("");
    return `<div class="mcard"><div class="mchead"><b>${esc(g.label)}</b><span class="mcnow">${esc(now)}</span></div><div class="mtrend">${rows}</div></div>`;
  }).join("");
}
function initHealth(){
  const d=$("#vlDate"); if(d && !d.value) d.value=todayISO();
  const sv=$("#vlSave"); if(sv) sv.onclick=saveVitalsEntry;
  const lf=$("#labFile"); if(lf) lf.onchange=e=>{ const f=e.target.files&&e.target.files[0]; if(f) handleLabFile(f); e.target.value=""; };
}

/* =====================================================================
   CLAUDE API COACH (optional) + settings
===================================================================== */
function coachOnline(){ return !!(state.apiKey && state.apiKey.trim()); }
function updateCoachMode(){
  const pill=$("#coachMode"); if(!pill) return;
  const on=coachOnline();
  pill.textContent = on ? "Claude API" : "offline";
  pill.className = "modepill "+(on?"online":"offline");
}
function initCoachSettings(){
  $("#apiKey").value = state.apiKey || "";
  $("#apiModel").value = state.apiModel || "claude-opus-4-8";
  $("#coachSettingsBtn").onclick = ()=>$("#coachSettings").classList.toggle("hide");
  $("#saveKeyBtn").onclick = ()=>{
    state.apiKey = $("#apiKey").value.trim();
    state.apiModel = $("#apiModel").value;
    save(); updateCoachMode(); $("#coachSettings").classList.add("hide");
    toast(coachOnline() ? "Claude API connected." : "Key cleared — using Jeffery's offline mode.");
  };
  $("#clearKeyBtn").onclick = ()=>{
    state.apiKey=""; $("#apiKey").value=""; save(); updateCoachMode();
    toast("Key cleared.");
  };
  updateCoachMode();
}
function buildCoachSystem(){
  const conds = selectedConditions().map(c=>c.name).join(", ") || "none selected";
  const p = state.program;
  const precautions = (p ? p.notes : window.notesForFlags(gatherFlags())).join(" | ") || "none flagged";
  const prog = p ? `${p.totalWeeks}-week ${p.track} program; supervision ${p.supervision}; clearance needed: ${p.clearance}` : "not generated yet";
  const v = state.vitals||{};
  const enteredVitals = [v.restHR&&`resting HR ${v.restHR} bpm`, (v.sbp&&v.dbp)&&`BP ${v.sbp}/${v.dbp}`, v.spo2&&`SpO₂ ${v.spo2}%`, v.rr&&`RR ${v.rr}/min`, bmiCalc(v.height,v.weight)!=null&&`BMI ${bmiCalc(v.height,v.weight)}`].filter(Boolean).join(", ") || "none entered";
  const hz = hrZones();
  const hrLine = hz ? `max HR ≈ ${hz.hrmax} bpm (Tanaka), moderate zone ${fmtRange(hz.zones.moderate)} bpm; recommended effort ${borgTarget().label}${onBetaBlocker()?"; on a beta-blocker, so HR targets are unreliable — advise RPE/talk-test":""}` : `age not set — advise Borg RPE ${borgTarget().label}`;
  const deviceLineHR = hasCardiacDevice() ? `${cardiacDeviceLabel()}${deviceHRCeiling()?` — keep HR under ~${deviceHRCeiling()} bpm (below ICD threshold ${vnum((state.cardiacDevice||{}).icdRate)} bpm)`:""}${hasLVAD()?" — HR unreliable, RPE only":""}; cap intensity, avoid maximal effort` : "none";
  const lifestyle = [state.smoking&&`smoking ${state.smoking}`, state.alcohol&&`alcohol ${state.alcohol}`, state.sleep&&`sleep ${state.sleep}`, state.stress&&`stress ${state.stress}`, state.falls&&`falls/yr ${state.falls}`, (state.aid&&state.aid!=="none")&&`walking aid ${state.aid}`].filter(Boolean).join(", ") || "not specified";
  const adlLine = (state.adls||[]).filter(a=>a.level>=1).map(a=>`${a.name} (${adlLevelInfo(a.level).short})`).join(", ") || "none reported";
  const redflags = Object.entries(state.screen||{}).filter(([,val])=>val).map(([k])=>k).join(", ") || "none";
  const goals = [ (state.returnActivities||[]).length && `activities: ${state.returnActivities.join(", ")}`, (state.returnSports||[]).length && `sport: ${state.returnSports.join(", ")}` ].filter(Boolean).join("; ") || "none specified";
  const wbLine = wbSummary() || "not specified";
  const deviceLine = (state.devices||[]).map(d=>d.name).join(", ") || "none";
  const spLine = activeSpecialPrecautions().map(p=>p.label).join(", ") || "none";
  const abnormalLabs = LABS.filter(l=>{ const s=labStatusOf(l); return s==="high"||s==="low"; }).map(l=>`${l.name} ${labStatusOf(l)}`).join(", ") || "none entered/all in range";
  const riskAreas = computeRisks().filter(r=>r.level!=="low").map(r=>`${r.title.replace(/ risk$/i,"")} = ${r.level}`).join("; ") || "none flagged";

  /* The app builds a specific, named timeline and then never told Jeffery about it —
     so he could not discuss the very plan on the user's screen. */
  const it0 = p && p.items && p.items[0];
  const pl  = it0 && it0.plan;
  const planLine = pl
    ? `${pl.label} — ${pl.total} weeks${pl.freq?`, ${pl.freq}`:""}${pl.variant?`; variation in effect: ${pl.variant.label}${pl.variant.sub?` (${pl.variant.sub})`:""}`:""}${pl.note?`. Note: ${pl.note}`:""}`
    : (p ? "no condition-specific timeline matched — using a generic template" : "not generated yet");
  const phList = (it0 && it0.phases) || [];
  const curPh  = phList.find(x=>x.current);
  const phaseLine = curPh
    ? `phase ${phList.indexOf(curPh)+1} of ${phList.length} — "${curPh.title}", weeks ${curPh.weekStart}–${curPh.weekEnd}. Goal: ${curPh.goal||"n/a"}. Advance only when: ${curPh.criteria||"n/a"}.${curPh.restrict?` RESTRICTION AT THIS STAGE (must respect): ${curPh.restrict}`:""}`
    : (phList.length ? "no current phase marked (generic template — phases are relative, not dated)" : "not generated yet");
  /* Their actual prescribed exercises, so "explain my third exercise" is answerable. */
  const exLine = curPh && (curPh.ex||[]).length
    ? curPh.ex.map((e,i)=>`${i+1}. ${e.n}${e.d?` — ${e.d}`:""}`).join(" | ")
    : "none yet";
  /* Which of those actually get DONE. The session count says "3 this week" while one
     movement is silently dropped every time — this is the only place that shows up. */
  const doneLine = exSkipLine();
  /* Jeffery answered a 4-year-old exactly as he answered a 40-year-old, because age never
     reached him. It reshapes the whole plan now, so he has to know it — and know which
     answer produced it, so he can say so rather than sound certain about a guess. */
  const _ai = userAgeInfo(), _ab = _ai.age < 18 ? pedBandOf(_ai.age) : null;
  const pedLine = !_ab ? "adult" :
    `PAEDIATRIC — ${_ab.label}. Age ${_ai.age} (${_ai.source === "stated" ? "entered by the user"
      : _ai.source === "surgery" ? "inferred from the age band of the procedure they chose — flag the assumption if it matters"
      : `inferred from the usual age range for their diagnosis (${_ai.lo}–${_ai.hi} yr) — flag the assumption if it matters`}). `
    + "Address the PARENT/CARER for under-12s and the young person directly from about 12. Their program is filtered to this age group. "
    + "Evidence to hold to: supervised, technique-led resistance training IS safe and effective for children — do NOT repeat the \"no weights until 16\" myth — but no maximal (1RM) or ballistic lifting until skeletal maturity. "
    + "A growing skeleton's weak link is the growth plate, so pain at a tender bony point (knee, heel) means manage the load rather than push through. "
    + "Around peak height velocity (~11.5 girls, ~13.5 boys) injury risk peaks and tolerance for jumps in load falls.";
  /* weeksPostOp() and state.weeks DIVERGE once a surgery date is set — the prompt used
     the raw intake number, so Jeffery could be weeks off on a post-op timeline. */
  const wpo = weeksPostOp();
  const timeLine = state.surgeryDate
    ? `${wpo} weeks post-op (surgery dated ${state.surgeryDate}) — use this, not the intake number`
    : `${state.weeks ?? "unknown"} weeks since injury`;
  /* 20,000-drug database, and none of it reached the coach. */
  const meds = selectedMeds();
  const medLine = meds.map(m=>`${m.name}${(state.medDoses||{})[m.id]?` (${state.medDoses[m.id]})`:""}`).join(", ")
    || ((state.meds||"").trim() ? `free-text: ${state.meds.trim()}` : "none recorded");
  const medNoteLine = [...new Set(meds.flatMap(m=>(m.flags||[]).map(f=>MED_EFFECT[f]).filter(Boolean)))].join(" | ") || "none";
  /* Spell the enums out - "time/day: 10to20" is our storage format, not English. */
  const SETUP_LABEL = { none:"none / bodyweight only", bands:"bands + a chair", dumbbells:"some dumbbells", gym:"full gym",
    lt10:"under 10 min/day", "10to20":"10-20 min/day", "20to40":"20-40 min/day", gt40:"40+ min/day",
    desk:"desk / seated", standing:"standing / walking", manual:"manual / lifting", heavy:"heavy or shift work",
    confident:"confident moving", cautious:"a bit cautious", fearful:"quite fearful of hurting it",
    first:"first episode", few:"once or twice before", recurrent:"keeps coming back" };
  const lbl = k => SETUP_LABEL[k] || k;
  /* The log was invisible to Jeffery, so he answered from an intake number that could be
     months stale while the user logged something quite different every day. */
  const _rp = recentPain(), _adh = adherence(), _tr = (state.log||[]).length ? painTrend(state.log) : null;
  const logLine = (state.log||[]).length
    ? [ `${state.log.length} entries`,
        _rp ? `pain averaging ${_rp.mean}/10 over the last ${_rp.n} logged days` : `latest pain ${state.log[state.log.length-1].pain}/10`,
        _tr && `trend: ${_tr.txt.replace(/[↓↑]/g,"").trim()}`,
        _adh && `${_adh.done} sessions in the last 7 days vs a target of ${_adh.min}${_adh.max!==_adh.min?`-${_adh.max}`:""} (${_adh.status})`,
        computeStreak(state.log) > 1 && `${computeStreak(state.log)}-day streak`
      ].filter(Boolean).join("; ")
    : "nothing logged yet";
  /* The single most useful sentence in this app is the one they typed ("my knee clicked
     going downstairs"), and Jeffery could not see it — he got the averages and none of the
     words. Newest first, capped so a long history can't crowd out the rest of the prompt. */
  const _notes = (state.log||[]).filter(e=>e.note).slice(-6).reverse()
    .map(e=>{ const m = moodOf(e.mood); return `${fmtDate(e.date)}${m?` (${m.label.toLowerCase()} day)`:""}: "${String(e.note).slice(0,160)}"`; });
  const journalLine = _notes.length ? _notes.join(" | ") : "none written";
  /* A deeper slice for RECALL. The 6 above are recent context; these are the back
     catalogue, oldest first, so he can quote a specific Tuesday in March at someone
     convinced they have made no progress. Trimmed hard so it can't crowd out the prompt. */
  const _all = (state.log||[]).filter(e=>e.note);
  const _older = _all.slice(0, Math.max(0, _all.length - 6)).slice(-18)
    .map(e=>{ const m = moodOf(e.mood); return `${e.date}${m?` [${m.k}]`:""} pain ${e.pain}/10: "${String(e.note).slice(0,110)}"`; });
  const archiveLine = _older.length ? _older.join(" | ") : "nothing older yet";
  const setupLine = [ state.equipment && `equipment: ${lbl(state.equipment)}`, state.timePerDay && lbl(state.timePerDay),
    state.workDemand && `work: ${lbl(state.workDemand)}`, state.moveConfidence && lbl(state.moveConfidence),
    state.priorEpisodes && lbl(state.priorEpisodes), state.homeMode && "Home mode is ON (household objects)" ]
    .filter(Boolean).join(", ") || "not specified";

  return `You are Jeffery, PhysioPath's AI rehabilitation specialist — an educational assistant giving general, evidence-informed physical-rehabilitation guidance. You are an AI, not a licensed clinician, and must not diagnose or replace in-person care.

USER CONTEXT
- Conditions: ${conds}
- Timeline: ${timeLine}; rest pain ${state.painRest}/10, movement pain ${state.painMove}/10; surgery: ${state.surgery}
- Program: ${prog}
- Rehab plan in effect: ${planLine}
- Where they are RIGHT NOW: ${phaseLine}
- Their current phase's prescribed exercises (refer to these by number if asked): ${exLine}
- Which of those they ACTUALLY tick off: ${doneLine}
- Age group: ${pedLine}
- Medications: ${medLine}
- Medication considerations for exercise: ${medNoteLine}
- Setup & capacity: ${setupLine}
- What they are LOGGING (trust this over the intake pain figure): ${logLine}
- THEIR OWN WORDS from the journal, newest first (quote these back when relevant — this is what they actually told you): ${journalLine}
- EARLIER JOURNAL ENTRIES, oldest first — their back catalogue: ${archiveLine}
- Vitals entered: ${enteredVitals}
- Heart-rate & exertion: ${hrLine}
- Cardiac device: ${deviceLineHR}
- Lifestyle & function: ${lifestyle}
- Daily-living (ADL) difficulties reported: ${adlLine}
- Red-flag screen positives: ${redflags}
- Return-to goals: ${goals}
- Weight-bearing order: ${wbLine}; braces/orthoses/prostheses: ${deviceLine}
- Surgical-site precautions active: ${spLine}
- Out-of-range labs entered: ${abnormalLabs}
- Educational risk areas (not diagnostic): ${riskAreas}
- Personalized precautions (MUST respect): ${precautions}

WHAT PHYSIOPATH CAN DO (point the user to these when relevant)
- A phased Program of exercises the user can Rotate / Swap / Remove / Add per phase, with step-by-step "Explain", and a Home mode that swaps to household objects.
- A 20,000-exercise library incl. Supine / Seated / Standing / Pool-aquatic therapeutic sets and ankle pumps.
- Precautions controls: weight-bearing orders, braces/orthoses, sternal/abdominal/spinal precautions, plus a clinician protocol.
- Health tab: vitals log & trend (incl. steps), labs, risk read-outs, and live smartwatch sync (heart rate, HRV, SpO₂ via Bluetooth, or import an Apple Health / TCX / GPX / CSV file).
- Heart-rate zones, Borg RPE and cardiac-device-aware intensity caps.

ANSWER STYLE
- Lead with a direct, useful answer in the first sentence — then the brief why/how.
- Personalise: weave in THIS user's data above (their phase, zones, precautions, vitals, goals) instead of generic advice; give concrete numbers, sets/reps, or steps they can act on today.
- Prefer short paragraphs or tight bullets; bold the key takeaway. Offer one relevant next step or follow-up question when natural.
- Match depth to the question — a quick question gets a quick answer; "explain/why/how" gets more detail.

RULES
- You are an educational aid, NOT a clinician. Never diagnose or give specific medication doses.
- Always honor the precautions above. If a request is unsafe for these conditions, say so plainly and offer a safer alternative — don't just refuse.
- Recommend in-person assessment for anything serious, worsening, or uncertain; don't over-warn on routine questions.
- Treat these as urgent-care red flags: chest pain/pressure, severe breathlessness, fainting, sudden weakness/numbness, trouble speaking, loss of bladder/bowel control, or a hot swollen joint with fever.
- Warm, practical, and confident. Respond with your final answer only — no meta-commentary about your reasoning.`;
}
function addTyping(){
  const div=document.createElement("div"); div.className="msg bot typing"; div.textContent="thinking…";
  $("#chatlog").appendChild(div); $("#chatlog").scrollTop=$("#chatlog").scrollHeight; return div;
}
/* Parse an Anthropic streaming SSE payload → the assembled assistant text + stop_reason.
   PURE and unit-tested (test/coach-stream.test.mjs). The live loop feeds it the GROWING buffer,
   so an incomplete trailing event (a network chunk that split mid-event) simply doesn't parse
   yet and turns up on the next read. Accumulates text_delta and reads the message_delta stop. */
function parseAnthropicSSE(sse){
  let text="", stop=null;
  for(const block of String(sse).split("\n\n")){
    const line = block.split("\n").find(l=>l.startsWith("data:"));
    if(!line) continue;
    let ev; try{ ev = JSON.parse(line.slice(5).trim()); }catch(_){ continue; }
    if(ev.type==="content_block_delta" && ev.delta && ev.delta.type==="text_delta") text += ev.delta.text;
    else if(ev.type==="message_delta" && ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
    else if(ev.type==="error" && ev.error && ev.error.message) throw new Error(ev.error.message);
  }
  return { text, stop };
}
async function askClaude(q){
  /* The user turn is pushed by the submit handler — pushing again here would duplicate it. */
  const typing=addTyping();
  const callAPI = () => fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-api-key":state.apiKey.trim(),
        "anthropic-version":"2023-06-01",
        "anthropic-dangerous-direct-browser-access":"true"
      },
      body:JSON.stringify({
        model: state.apiModel || "claude-opus-4-8",
        max_tokens: 4000,          // 1100 truncated mid-answer on anything with sets/reps detail
        stream: true,              // stream the answer so it renders as it is written, not after a long wait
        system: buildCoachSystem(),
        messages: chatWindow(10)          // must begin on a user turn or the API 400s
      })
    });
  let streamDiv=null;
  try{
    let res = await callAPI();
    /* A 429 (rate limit) is not a failure — one polite backoff+retry (honouring Retry-After)
       before downgrading, so a paying user isn't silently dropped to the offline KB. */
    if(res.status===429){
      const ra = parseInt(res.headers.get("retry-after")||"",10);
      const waitMs = Math.min((Number.isFinite(ra)&&ra>0 ? ra : 4) * 1000, 8000);
      typing.textContent = "rate limited — retrying…";
      await new Promise(r=>setTimeout(r, waitMs));
      res = await callAPI();
    }
    if(!res.ok){
      let msg="HTTP "+res.status;
      try{ const j=await res.json(); if(j.error&&j.error.message) msg=j.error.message; }catch(e){}
      throw new Error(msg);
    }
    typing.remove();
    /* The bubble is created empty and grows as deltas arrive; on completion it gets the same
       footer + copy button as a non-streamed answer (attachBotExtras), so they end up identical. */
    streamDiv=document.createElement("div"); streamDiv.className="msg bot";
    $("#chatlog").appendChild(streamDiv);
    let full="", stop=null;
    const reader = res.body && res.body.getReader ? res.body.getReader() : null;
    if(reader){
      const dec=new TextDecoder(); let buf="", last="";
      for(;;){
        const {done, value} = await reader.read();
        if(done) break;
        buf += dec.decode(value, {stream:true});
        const p = parseAnthropicSSE(buf);
        if(p.text!==last){ last=p.text; streamDiv.innerHTML=mdLite(p.text); $("#chatlog").scrollTop=$("#chatlog").scrollHeight; }
      }
      const p = parseAnthropicSSE(buf); full=p.text; stop=p.stop;
    } else {
      /* No streamable body (e.g. an old browser) — fall back to a single JSON read. */
      const data=await res.json();
      full=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n"); stop=data.stop_reason;
    }
    full=(full||"").trim();
    /* Read stop_reason so a capped reply isn't dressed up as a finished one. */
    if(full && (stop==="max_tokens" || stop==="max_length"))
      full += "\n\n*(cut off — that hit the length limit. Ask me to continue, or for a shorter answer.)*";
    if(!full) full = stop==="refusal"
      ? "I wasn't able to answer that one. Try rephrasing it — or if it's about your specific case, ask your clinician."
      : "(no reply)";
    streamDiv.innerHTML=mdLite(full); attachBotExtras(streamDiv, full);
    $("#chatlog").scrollTop=$("#chatlog").scrollHeight;
    pushTurn("assistant", full);
  }catch(err){
    typing.remove();
    if(streamDiv){ streamDiv.remove(); streamDiv=null; }   // drop any partial stream before the fallback
    /* Keep the user's turn: it is rendered, so dropping it would desync the transcript from
       the history and lose it on reload. Record the fallback as the assistant turn so the
       pairing stays valid for the next request. */
    const fb = "⚠ Couldn't reach the Claude API ("+err.message+"). Here's Jeffery's offline answer instead:\n\n"+coachAnswer(q);
    pushTurn("assistant", fb);
    addMsg(fb,"bot");
  }
}

/* =====================================================================
   EXERCISE LIBRARY BROWSER
===================================================================== */
const DIFF_LABEL = { 1:"L1", 2:"L2", 3:"L3", 4:"L4" };
const EXMAP = new Map();
let libReady = false;
function initLibrary(){
  if(!window.EXERCISES) return;
  $("#exCount").textContent = window.EXERCISES.length;
  if(!libReady){
    libReady = true;
    window.EXERCISES.forEach(e=>EXMAP.set(e.id,e));
    const regions = [...new Set(window.EXERCISES.flatMap(e=>e.region))].sort();
    const sel = $("#exRegion");
    regions.forEach(r=>{ const o=document.createElement("option"); o.value=r; o.textContent=r; sel.appendChild(o); });
    /* Any filter change is a new result set — go back to the first page. */
    const reRender = () => { exShown = 80; renderExResults(); };
    let t; $("#exSearch").oninput=()=>{ clearTimeout(t); t=setTimeout(reRender,120); };
    $("#exRegion").onchange=reRender;
    $("#exDiff").onchange=reRender;
    $("#exSafe").onchange=reRender;
    // default: respect precautions if any are active
    if(gatherFlags().length){ $("#exSafe").checked=true; }
  }
  const flags = gatherFlags();
  $("#exSafeNote").innerHTML = flags.length
    ? `Tick <b>“Respect my precautions”</b> to hide exercises unsafe for your history.`
    : `No precautions flagged from your history.`;
  renderExResults();
}
/* The haystack was rebuilt for all 20,000 exercises on every keystroke; it never changes,
   so cache it on the record the first time it is needed. */
function exHay(e){
  return e._hay || (e._hay = (e.name+" "+e.region.join(" ")+" "+e.equipment+" "+e.pattern).toLowerCase());
}
let exShown = 80;                       // "Show more" page size; reset whenever the filters change
function renderExResults(){
  const q = $("#exSearch").value.trim().toLowerCase();
  const toks = q.split(/\s+/).filter(Boolean);
  const region = $("#exRegion").value, diff = $("#exDiff").value;
  const safe = $("#exSafe").checked;
  let list = window.EXERCISES;
  if(region!=="all") list = list.filter(e=>e.region.includes(region));
  if(diff!=="all") list = list.filter(e=>e.difficulty === +diff);
  if(toks.length) list = list.filter(e=>toks.every(t=>exHay(e).includes(t)));
  let annotate = new Map();
  if(safe){
    const ctx = userGateCtx();
    list = list.filter(e=>exPassesUserGates(e, ctx));            // was missing entirely here
    const { kept } = window.applyContra(list, activeFlags());    // activeFlags, not gatherFlags: includes med filtering
    kept.forEach(e=>{ if(e.warn) annotate.set(e.id, e.warn); });
    list = kept;
  }
  if(!toks.length) list = diversify(list);        // no query -> show variety, not 80 squats
  const total = list.length; list = list.slice(0, exShown);
  const res = $("#exResults");
  if(!list.length){ res.innerHTML=`<div class="moreinfo">No matches. Try a simpler term or clear the filters.</div>`; return; }
  res.innerHTML = list.map(e=>{ const w=annotate.get(e.id);
    return `<div class="exitemw" data-i="${e.id}">
      <div class="exrow">
        <span class="diffpill d${e.difficulty}">${DIFF_LABEL[e.difficulty]}</span>
        <span class="en">${esc(e.name)}<span class="er">${esc(e.region.join(" · "))} · ${esc(e.equipment)}</span>
          ${w?`<span class="exwarn">⚠ Modify — ${esc(TAG_LABEL[w]||w)}</span>`:""}</span>
        <span class="ed">${esc(e.dose)}</span>
        <span class="chev">▾</span>
      </div>
      <div class="exexp hide"></div>
    </div>`; }).join("") +
    (total>list.length
      ? `<div class="moreinfo">Showing ${list.length} of ${total} matches.
           <button type="button" class="btn ghost small" id="exMore">Show ${Math.min(80, total-list.length)} more</button></div>`
      : (total>80?`<div class="moreinfo">Showing all ${total} matches.</div>`:""));
  const more = $("#exMore");
  if(more) more.onclick = () => { exShown += 80; renderExResults(); };
  $$("#exResults .exitemw").forEach(w=>{ w.querySelector(".exrow").onclick=()=>{
    const exp=w.querySelector(".exexp");
    if(!exp.dataset.filled){ const e=EXMAP.get(w.dataset.i); exp.innerHTML=movementExplain(e.name,e.pattern,e.region); exp.dataset.filled="1"; }
    exp.classList.toggle("hide"); w.classList.toggle("open"); }; });
}

/* ---------- boot ---------- */
/* A parseable-but-stale saved state must never white-screen the app with no way out.
   The boot body runs inside try/catch → a recovery UI (data stays saved); the persisted
   program renders in its own guard so a bad shape can't abort the rest of boot. */
function bootFail(err){
  try{ console.error("PhysioPath boot error:", err); }catch(_){}
  try{
    document.body.innerHTML =
      '<div style="max-width:34rem;margin:14vh auto;padding:0 20px;font:16px/1.5 sans-serif;text-align:center">'
      + '<div style="font-size:40px">🩹</div>'
      + '<h1 style="font-size:20px;margin:.4em 0">PhysioPath hit a snag starting up</h1>'
      + '<p>Your saved data is still on this device. Try reloading; if it keeps failing, reset the app.</p>'
      + '<p><button id="_ppReload" style="padding:10px 16px;margin:4px;border-radius:10px;border:1px solid #888;background:transparent;color:inherit;cursor:pointer;font:inherit">Reload</button>'
      + '<button id="_ppReset" style="padding:10px 16px;margin:4px;border-radius:10px;border:1px solid #888;background:transparent;color:inherit;cursor:pointer;font:inherit">Reset the app</button></p></div>';
    var r=document.getElementById("_ppReload"); if(r) r.onclick=function(){ location.reload(); };
    var x=document.getElementById("_ppReset"); if(x) x.onclick=function(){ if(confirm("Reset erases everything saved on this device. Continue?")){ try{ localStorage.removeItem("physiopath"); }catch(_){}; location.reload(); } };
  }catch(_){}
}
window.addEventListener("unhandledrejection", e=>{ try{ console.error("Unhandled promise rejection:", e && e.reason); }catch(_){} });
document.addEventListener("DOMContentLoaded",()=>{
 try{
  load();
  initHistory(); initOptSecs(); initMeds(); initDetails(); initProgress(); initDataCard(); initCoachSettings();
  /* initSearch() moved into ensureConditions() — it reads window.CONDITIONS, which is no
     longer here at boot. A RETURNING user's saved condIds can't resolve without the
     catalogue, and a saved program needs the rest, so fetch what their state implies. */
  if((state.condIds||[]).length) ensureConditions();
  if(state.program || (state.condIds||[]).length) ensureProgramData();
  /* The app works offline; these links don't. Flag it rather than let the tap do nothing. */
  const syncOffline = () => document.body.classList.toggle("isoffline", !navigator.onLine);
  window.addEventListener("online", syncOffline); window.addEventListener("offline", syncOffline); syncOffline();
  // Details(3)/Program(4)/Health(5) need a condition; Injury(2) is where you pick it; Clinician(1) is a setup form (no condition needed).
  $$("[data-goto]").forEach(b=>b.onclick=()=>{
    const n=+b.dataset.goto;
    if([3,4,5,6].includes(n) && !state.condIds.length){ toast("Pick at least one condition first."); goStep(2); return; }
    goStep(n);
  });
  $$(".step").forEach(s=>s.onclick=()=>{ const n=+s.dataset.step;
    if([3,4,5,6].includes(n) && !state.condIds.length){ toast("Pick a condition first."); goStep(2); return; }
    goStep(n); });
  // History → next: clinician-guided visits the Clinician step (1); everyone else (the patient
  // default, incl. self-guided) skips straight to Injury (2). The Clinician step is hidden from
  // the rail for patients, so ticking "Clinician-guided" above is how they bring it back.
  const histNext = $("#historyNext"); if(histNext) histNext.onclick=()=>goStep(state.clinicianGuided ? 1 : 2);
  // Injury → back MIRRORS the forward skip: a patient reached Injury straight from History (the
  // Clinician step was skipped and is hidden from the rail), so their "← Back" must return to
  // History (0), not a Clinician step they never saw. Clinician-guided users came via Clinician (1).
  const injBack = $("#injuryBack"); if(injBack) injBack.onclick=()=>goStep(state.clinicianGuided ? 1 : 0);
  // Clinician-guided and self-guided are opposites — ticking one clears the other so the state
  // can never claim both "a clinician is setting this up" and "I'm doing it myself".
  const cg = $("#q_clinicianGuided"); if(cg) cg.onchange=()=>{ state.clinicianGuided=cg.checked; if(cg.checked) state.selfGuided=false; save(); syncSessionMode(); };
  const sg = $("#q_selfGuided");      if(sg) sg.onchange=()=>{ state.selfGuided=sg.checked; if(sg.checked) state.clinicianGuided=false; save(); syncSessionMode(); };
  syncSessionMode();
  const clinNext = $("#clinToProgram"); if(clinNext) clinNext.onclick=()=>goStep(2);   // Clinician → Injury (consecutive)
  $("#generateBtn").onclick=doGenerate;
  $("#printBtn").onclick=()=>{ preparePrint(); window.print(); };
  /* Native share (mobile) — a lightweight summary; the full plan still goes via Print/PDF.
     Shown only where the Web Share API exists (absent in the test shim, so tests are unaffected). */
  const shareBtn=$("#shareBtn");
  if(shareBtn && navigator.share){
    shareBtn.classList.remove("hide");
    shareBtn.onclick=()=>{
      const conds=(typeof selectedConditions==="function"?selectedConditions():[]).map(c=>c.name);
      const wk=state.program&&state.program.totalWeeks;
      const text = conds.length
        ? `My PhysioPath recovery plan: ${conds.join(", ")}${wk?` — a ${wk}-week program`:""}. Educational injury-recovery guidance.`
        : "PhysioPath — personalized, contraindication-aware injury-recovery programs.";
      navigator.share({ title:"PhysioPath", text }).catch(()=>{});
    };
  }
  window.addEventListener("beforeprint", preparePrint);      // Ctrl+P / browser menu
  $("#resetBtn").onclick=doReset;
  $("#chatform").addEventListener("submit",e=>{ e.preventDefault();
    const v=$("#chatInput").value.trim(); if(!v) return;
    addMsg(v,"user"); pushTurn("user", v); $("#chatInput").value="";
    const nb = $("#newChatBtn"); if(nb) nb.classList.remove("hide");   // there's a thread to clear now
    const rf = redFlagFor(v);          // a possible emergency never reaches the API or the KB
    if(rf){ setTimeout(()=>{ addMsg(rf,"bot"); pushTurn("assistant", rf); },220); return; }
    if(coachOnline()) askClaude(v);
    else setTimeout(()=>{ const a=coachAnswer(v); addMsg(a,"bot"); pushTurn("assistant", a); },220);
  });
  if(state.program){ try{ renderProgram(state.program); }catch(err){ console.error("Discarding an unreadable saved program:", err); state.program=null; save(); } }
  // PWA app-shortcut routing (?go=coach|library|build|progress)
  /* ?go= shortcuts. "progress" kept as an alias so any installed PWA shortcut or saved link
     still lands somewhere sensible after the Journal took index 5. */
  const goMap={ build:2, details:3, clinician:1, program:4, journal:5, progress:6, health:6, coach:7, library:8 };
  const go=new URLSearchParams(location.search).get("go");
  goStep(go && goMap[go]!=null ? goMap[go] : (state.step||0));
 }catch(err){ bootFail(err); }
});
