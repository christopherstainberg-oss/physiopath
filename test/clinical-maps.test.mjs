/* =====================================================================
   PhysioPath — clinical correlation maps (evidence-based pathway integrity)

   Locks the diagnosis → protocol / flag / exercise-tag fixes so OA never
   again becomes TKA, THA never strips its own heel slides, cardiac patients
   keep moderate aerobic work, and venous disease never gets PAD claudication
   scripts.
===================================================================== */
import { planFor, resetState, allExercises } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E } from "./shared.mjs";

suite("clinical correlation maps");

const condByName = re => (E.window.CONDITIONS || []).find(c => re.test(c.name));
const names = prog => allExercises(prog).map(e => e.n || e.name || "").join(" | ");
const namesEarly = prog => {
  const out = [];
  for (const it of prog.items || []) {
    for (const ph of (it.phases || []).slice(0, 2)) {
      for (const e of ph.ex || []) out.push(e.n || e.name || "");
    }
  }
  return out.join(" | ");
};

test("Knee OA maps to knee_oa — not knee_replacement", () => {
  const c = condByName(/^Knee osteoarthritis$/i) || condByName(/Knee osteoarthritis \(Left\)/i);
  assert(c, "expected Knee osteoarthritis in catalogue");
  assert(c.protocol === "knee_oa", `Knee OA protocol must be knee_oa, got ${c.protocol}`);
  assert(!c.autoFlags?.includes("knee_replacement"), "OA must not auto-flag knee_replacement");
  const prog = planFor(E, { condIds: [c.id], weeks: 8, age: 62, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/operated leg/.test(text), "OA plan must not use TKA 'operated leg' language");
  assert(!/protect the implant|the implant/.test(text), "OA plan must not use implant-protection language");
});

test("Hip fracture post-fixation is fracture_le — not THA precautions", () => {
  const c = condByName(/Hip fracture \(post-fixation\)/i);
  assert(c, "expected Hip fracture (post-fixation) recovery");
  assert(c.protocol === "fracture_le", `expected fracture_le, got ${c.protocol}`);
  resetState(E, { condIds: [c.id], weeks: 4, surgery: "yes" });
  const f = E.gatherFlags();
  assert(!f.includes("hip_replacement"),
    `hip fracture fixation must NOT auto-apply hip_replacement flag — got [${f.join(", ")}]`);
});

test("Revision TKR maps to knee_replacement, not hip_replacement", () => {
  const c = condByName(/Revision total knee replacement/i);
  assert(c, "expected Revision total knee replacement");
  assert(c.protocol === "knee_replacement", `expected knee_replacement, got ${c.protocol}`);
});

test("Post-DVT uses venous_rehab — not PAD claudication script", () => {
  const c = condByName(/Post-DVT reconditioning/i);
  assert(c, "expected Post-DVT reconditioning");
  assert(c.protocol === "venous_rehab", `expected venous_rehab, got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 55 });
  const text = names(prog).toLowerCase() + " " + (prog.notes || []).join(" ").toLowerCase();
  assert(!/walk.?to.?claudication|moderate calf \(claudication\)|walk until moderate leg pain/.test(text),
    "DVT plan must not prescribe walk-to-claudication (PAD therapy)");
});

test("Lymphedema maps to lymphedema protocol, not pad", () => {
  const c = condByName(/^Lymphedema \(exercise management\)$/i) || condByName(/Lower-limb lymphedema/i);
  assert(c, "expected a lymphedema condition");
  assert(c.protocol === "lymphedema", `expected lymphedema protocol, got ${c.protocol}`);
});

test("Charcot neuroarthropathy uses charcot protocol + critical_offload", () => {
  const c = condByName(/^Charcot neuroarthropathy$/i);
  assert(c, "expected Charcot neuroarthropathy");
  assert(c.protocol === "charcot", `expected charcot protocol, got ${c.protocol}`);
  resetState(E, { condIds: [c.id], weeks: 4 });
  assert(E.gatherFlags().includes("critical_offload"), "Charcot must carry critical_offload");
});

test("HCM carries hcm flag and is not heart_failure protocol", () => {
  const c = condByName(/hypertrophic cardiomyopathy/i);
  assert(c, "expected HCM condition");
  assert(c.protocol !== "heart_failure", `HCM must not use heart_failure protocol, got ${c.protocol}`);
  assert((c.autoFlags || []).includes("hcm") || /hypertrophic/i.test(c.name),
    "HCM should auto-flag hcm via name/protocol");
  resetState(E, { condIds: [c.id], weeks: 8 });
  assert(E.gatherFlags().includes("hcm"), "gatherFlags must include hcm for HCM diagnoses");
});

test("THA keeps heel slides after hip_replacement flag (no self-filter)", () => {
  const c = condByName(/Total hip replacement recovery/i);
  assert(c, "expected THA recovery condition");
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 68, surgery: "yes" });
  const text = names(prog).toLowerCase();
  assert(/heel slide|ankle pump|glute|quad set|weight shift|sit-to-stand|walk/.test(text),
    `THA early plan should keep precaution-safe core items, got: ${text.slice(0, 200)}`);
  /* True end-range deep flexion items may be filtered; mid-range ROM must remain */
  assert(allExercises(prog).length >= 3, "THA phase content must not empty to nothing");
});

test("Cardiac condition keeps moderate aerobic despite cardiac flag", () => {
  const c = condByName(/Post-CABG|cardiac rehab|Heart failure \(reduced/i);
  assert(c, "expected a cardiac condition");
  const prog = planFor(E, { condIds: [c.id], weeks: 6, age: 60, flags: ["cardiac"] });
  const text = names(prog).toLowerCase();
  assert(/walk|aerobic|bike|marching|interval/.test(text),
    `cardiac plan must retain moderate aerobic content after flags — got: ${text.slice(0, 240)}`);
});

test("PAD still has walk-to-claudication (evidence-based, must not regress)", () => {
  const c = condByName(/Peripheral artery disease \(claudication\)/i);
  assert(c, "expected PAD claudication condition");
  assert(c.protocol === "pad", `PAD must stay on pad protocol, got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 70 });
  const text = names(prog).toLowerCase();
  assert(/claudication|walk/.test(text), "PAD plan should still feature structured walking");
});

test("Osteoarthritis of the knee (JOINTS catalogue) is knee_oa — not TKA", () => {
  const c = condByName(/^Osteoarthritis of the knee$/i) || condByName(/Osteoarthritis of the knee \(Left\)/i);
  assert(c, "expected Osteoarthritis of the knee");
  assert(c.protocol === "knee_oa", `got ${c.protocol}`);
});

test("Hip OA maps to hip_oa — not generic hip sport loading", () => {
  const c = condByName(/^Hip osteoarthritis$/i) || condByName(/Osteoarthritis of the hip/i) || condByName(/Hip osteoarthritis \(Left\)/i);
  assert(c, "expected Hip osteoarthritis");
  assert(c.protocol === "hip_oa", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 8, age: 64, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/cutting drills|lateral bounds/.test(text), "hip OA must not use sport-cutting drills");
  assert(/walk|bike|glute|sit-to-stand/.test(text), "hip OA should keep joint-friendly loading");
});

test("Rotator cuff repair uses cuff_repair pool — not generic shoulder plyos", () => {
  const c = condByName(/Rotator cuff repair recovery/i);
  assert(c, "expected Rotator cuff repair recovery");
  assert(c.protocol === "cuff_repair", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 55, surgery: "yes" });
  const text = names(prog).toLowerCase();
  assert(!/plyometric|throwing|racket/.test(text), "early cuff repair must not throw/plyo");
  assert(/pendulum|passive|protect|isometric|scapular/.test(text), "early cuff repair should stay protective");
});

test("Shoulder replacement uses shoulder_replacement — not overhead plyos", () => {
  const c = condByName(/Total shoulder replacement recovery/i) || condByName(/Reverse total shoulder replacement recovery/i);
  assert(c, "expected shoulder replacement recovery");
  assert(c.protocol === "shoulder_replacement", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 70, surgery: "yes" });
  const text = names(prog).toLowerCase();
  assert(!/plyometric|throwing/.test(text), "TSA early plan must not plyo/throw");
  assert(/pendulum|isometric|scapular|sling|coffee cup|passive/.test(text), "TSA should keep protected early motion");
});

test("Post-lumbar fusion uses lumbar_fusion — not generic lumbar loaded lifting", () => {
  const c = condByName(/Post-lumbar fusion recovery/i);
  assert(c, "expected Post-lumbar fusion recovery");
  assert(c.protocol === "lumbar_fusion", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 58, surgery: "yes" });
  const text = names(prog).toLowerCase();
  assert(!/loaded lifting mechanics|impact reintroduction/.test(text), "early fusion must not load-lift/impact");
  assert(/log.?roll|walk|glute|blt|neutral/.test(text), "fusion should keep walking and BLT-safe work");
});

test("Achilles rupture uses achilles_repair — not tendinopathy heavy-slow loading", () => {
  const c = condByName(/Achilles tendon rupture recovery/i);
  assert(c, "expected Achilles tendon rupture recovery");
  assert(c.protocol === "achilles_repair", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 42, surgery: "yes" });
  const text = names(prog).toLowerCase();
  assert(!/heavy-slow|eccentric calf|heel drop/.test(text), "early rupture must not eccentric-load the repair");
  assert(/boot|pump|quad|circulation|protected/.test(text), "early rupture should stay protected");
});

test("new program protocols exist as 4-phase pools", () => {
  const P = E.PROTOCOLS || {};
  for (const id of [
    "hip_oa", "cuff_repair", "shoulder_replacement", "lumbar_fusion", "achilles_repair",
    "cervical_fusion", "hip_labral",
    "adhesive_capsulitis", "gh_oa", "lumbar_stenosis", "cervical_stenosis", "osteoporosis",
    "achilles_insertional", "meniscus_repair", "extensor_mechanism_repair",
    "ucl_reconstruction", "hand_tendon_repair",
    "constipation_cic", "constipation_slow_transit", "gastroparesis",
    "ibs", "functional_dyspepsia"
  ]) {
    assert(Array.isArray(P[id]) && P[id].length === 4, `${id} must be a 4-phase protocol`);
    assert(P[id].every(ph => Array.isArray(ph) && ph.length >= 3), `${id} phases need exercise pools`);
  }
});

test("Alpine-skier's ACL injury is knee_ligament — not kneecap-pain", () => {
  const c = condByName(/Alpine-skier's ACL injury/i);
  assert(c, "expected Alpine-skier's ACL injury");
  assert(c.protocol === "knee_ligament", `got ${c.protocol}`);
});

test("Footballer's MCL sprain is knee_ligament — not kneecap-pain", () => {
  const c = condByName(/Footballer's MCL sprain/i);
  assert(c, "expected Footballer's MCL sprain");
  assert(c.protocol === "knee_ligament", `got ${c.protocol}`);
});

test("Native hip dislocation is not knee_pf", () => {
  const c = condByName(/Native hip dislocation/i);
  assert(c, "expected Native hip dislocation (post-reduction)");
  assert(c.protocol !== "knee_pf", `hip dislocation must not use knee_pf, got ${c.protocol}`);
  assert(c.protocol === "hip_labral" || c.protocol === "hip_replacement", `got ${c.protocol}`);
});

test("Hip labral tear uses hip_labral — not generic hip cutting drills", () => {
  const c = condByName(/^Hip labral tear$/i) || condByName(/Hip labral tear \(Left\)/i);
  assert(c, "expected Hip labral tear");
  assert(c.protocol === "hip_labral", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 32, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/cutting drills|lateral bounds/.test(text), "labral tear must not use sport-cutting drills");
});

test("ACDF / cervical fusion uses cervical_fusion — not generic cervical end-range", () => {
  const c = condByName(/Post-cervical fusion recovery/i) || condByName(/^ACDF recovery$/i) || condByName(/Cervical fusion \(ACDF\)/i);
  assert(c, "expected a cervical fusion / ACDF recovery condition");
  assert(c.protocol === "cervical_fusion", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 58, surgery: "yes" });
  const text = names(prog).toLowerCase();
  assert(!/end-range rotation|loaded chin tuck|extension overpressure/.test(text), "early ACDF must not force end-range neck work");
  assert(/walk|scapular|collar|log.?roll|neutral/.test(text), "ACDF should keep walking and protected neck work");
});

test("Total ankle replacement uses ankle — not general_msk", () => {
  const c = condByName(/Total ankle replacement recovery/i);
  assert(c, "expected Total ankle replacement recovery");
  assert(c.protocol === "ankle", `got ${c.protocol}`);
});

test("Total wrist replacement uses wrist_hand — not general_msk", () => {
  const c = condByName(/Total wrist replacement recovery/i);
  assert(c, "expected Total wrist replacement recovery");
  assert(c.protocol === "wrist_hand", `got ${c.protocol}`);
});

test("AVN of the femoral head is not general_msk and carries critical_offload", () => {
  const c = condByName(/Avascular necrosis of the femoral head/i);
  assert(c, "expected AVN of the femoral head");
  assert(c.protocol !== "general_msk", `AVN must not use general_msk, got ${c.protocol}`);
  resetState(E, { condIds: [c.id], weeks: 4, age: 48 });
  assert(E.gatherFlags().includes("critical_offload"), "femoral-head AVN must offload");
});

test("Hip arthroscopy recovery uses hip_labral — not generic hip", () => {
  const c = condByName(/Hip arthroscopy recovery/i);
  assert(c, "expected Hip arthroscopy recovery");
  assert(c.protocol === "hip_labral", `got ${c.protocol}`);
});

test("Frozen shoulder uses adhesive_capsulitis — not generic shoulder plyos", () => {
  const c = condByName(/Adhesive capsulitis \(frozen shoulder\)/i);
  assert(c, "expected Adhesive capsulitis (frozen shoulder)");
  assert(c.protocol === "adhesive_capsulitis", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 54, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/plyometric|throwing|racket/.test(text), "frozen shoulder must not throw/plyo");
  assert(/pendulum|table slide|gentle|thaw/.test(text), "frozen shoulder should stay gentle mobility");
});

test("Glenohumeral OA uses gh_oa — not overhead plyos", () => {
  const c = condByName(/Glenohumeral osteoarthritis/i);
  assert(c, "expected Glenohumeral osteoarthritis");
  assert(c.protocol === "gh_oa", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 8, age: 68, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/plyometric|throwing/.test(text), "GH OA must not plyo/throw");
  assert(/pendulum|scapular|walk|bike/.test(text), "GH OA should keep joint-friendly loading");
});

test("Lumbar spinal stenosis uses lumbar_stenosis — not generic lumbar load-lift", () => {
  const c = condByName(/^Lumbar spinal stenosis$/i);
  assert(c, "expected Lumbar spinal stenosis");
  assert(c.protocol === "lumbar_stenosis", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 6, age: 72, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/loaded lifting mechanics|impact reintroduction|deadlift/.test(text), "stenosis must not load-lift/impact");
  assert(/walk|flexion|sit|bike/.test(text), "stenosis should keep walking and flexion-biased work");
});

test("Cervical stenosis uses cervical_stenosis — not generic cervical end-range", () => {
  const c = condByName(/^Cervical stenosis$/i);
  assert(c, "expected Cervical stenosis");
  assert(c.protocol === "cervical_stenosis", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 70, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/end-range rotation|extension overpressure/.test(text), "cervical stenosis must not force end-range");
  assert(/chin tuck|scapular|walk|neutral/.test(text), "cervical stenosis should keep mid-range and walking");
});

test("Osteoporosis uses osteoporosis pool — not general_msk impact", () => {
  const c = condByName(/^Osteoporosis$/i);
  assert(c, "expected Osteoporosis");
  assert(c.protocol === "osteoporosis", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 8, age: 74, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/crunch|sit-up|impact reintroduction/.test(text), "osteoporosis must not crunch or impact");
  assert(/walk|posture|balance|upright/.test(text), "osteoporosis should keep upright loading and balance");
});

test("Insertional Achilles uses achilles_insertional — not heel-drops below the step", () => {
  const c = condByName(/Insertional Achilles tendinopathy/i);
  assert(c, "expected Insertional Achilles tendinopathy");
  assert(c.protocol === "achilles_insertional", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 6, age: 48, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/heel drop|below the step|below level/.test(text), "insertional Achilles must not drop the heel below the step");
  assert(/isometric|floor|flat/.test(text), "insertional Achilles should load on a flat surface");
});

test("Meniscus repair uses meniscus_repair — not generic meniscus pivoting", () => {
  const c = condByName(/^Meniscus repair recovery$/i) || condByName(/Meniscus repair recovery \(Left\)/i);
  assert(c, "expected Meniscus repair recovery");
  assert(c.protocol === "meniscus_repair", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 28, surgery: "yes" });
  const text = namesEarly(prog).toLowerCase();
  assert(!/agility|pivoting|jogging/.test(text), "early meniscus repair must not pivot/jog");
  assert(/quad|heel slide|protect/.test(text), "early meniscus repair should stay protected");
});

test("Patellar tendon repair uses extensor_mechanism_repair — not general_msk", () => {
  const c = condByName(/Patellar tendon repair recovery/i);
  assert(c, "expected Patellar tendon repair recovery");
  assert(c.protocol === "extensor_mechanism_repair", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 34, surgery: "yes" });
  const text = namesEarly(prog).toLowerCase();
  assert(!/hop|plyometric|energy-storage/.test(text), "early tendon repair must not hop");
  assert(/brace|protect|quad set|circulation/.test(text), "early tendon repair should stay protected");
});

test("Tommy John uses ucl_reconstruction — not elbow plyometric snaps", () => {
  const c = condByName(/UCL reconstruction \(Tommy John\) recovery/i);
  assert(c, "expected UCL reconstruction (Tommy John) recovery");
  assert(c.protocol === "ucl_reconstruction", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 22, surgery: "yes" });
  const text = namesEarly(prog).toLowerCase();
  assert(!/plyometric wrist|throwing/.test(text), "early UCL reconstruction must not throw/plyo");
  assert(/brace|protect|isometric|scapular/.test(text), "early UCL reconstruction should stay protected");
});

test("Flexor tendon repair uses hand_tendon_repair — not wrist weight-bearing rocks", () => {
  const c = condByName(/Flexor tendon repair recovery/i);
  assert(c, "expected Flexor tendon repair recovery");
  assert(c.protocol === "hand_tendon_repair", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 40, surgery: "yes" });
  const text = namesEarly(prog).toLowerCase();
  assert(!/weight-bearing rocks|loaded carries|push-up/.test(text), "early flexor repair must not load the palm");
  assert(/splint|tendon glide|protect/.test(text), "early flexor repair should stay splinted/gliding");
});

test("Proximal humerus fracture uses fracture_ue — not generic shoulder", () => {
  const c = condByName(/Proximal humerus fracture recovery/i);
  assert(c, "expected Proximal humerus fracture recovery");
  assert(c.protocol === "fracture_ue", `got ${c.protocol}`);
});

test("Chronic idiopathic constipation uses constipation_cic — walking, not sit-ups", () => {
  const c = condByName(/^Chronic idiopathic constipation$/i);
  assert(c, "expected Chronic idiopathic constipation");
  assert(c.protocol === "constipation_cic", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 8, age: 46, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/crunch|sit-up|valsalva|plyometric/.test(text), "CIC must not strain or crunch");
  assert(/walk|abdominal massage|breath/.test(text), "CIC should keep walking and abdominal massage");
});

test("Slow transit constipation uses constipation_slow_transit — not generic core", () => {
  const c = condByName(/^Slow transit constipation$/i);
  assert(c, "expected Slow transit constipation");
  assert(c.protocol === "constipation_slow_transit", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 8, age: 52, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/crunch|sit-up|deadlift/.test(text), "slow transit must not crunch/deadlift");
  assert(/walk|massage|colon/.test(text), "slow transit should keep walking and colon-directed massage");
});

test("Gastroparesis uses gastroparesis — post-meal walking, not lying-flat core", () => {
  const c = condByName(/^Gastroparesis$/i);
  assert(c, "expected Gastroparesis");
  assert(c.protocol === "gastroparesis", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 6, age: 48, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/crunch|sit-up|lying flat|supine hold/.test(text), "gastroparesis must not lie-flat crunch");
  assert(/walk|upright|after (a )?meal|post-?meal/.test(text), "gastroparesis should keep upright post-meal walking");
});

test("IBS uses ibs — walking and breathing, not CIC colon-massage or sit-ups", () => {
  const c = condByName(/^Irritable bowel syndrome \(IBS\)$/i);
  assert(c, "expected Irritable bowel syndrome (IBS)");
  assert(c.protocol === "ibs", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 8, age: 38, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/crunch|sit-up|colon-directed abdominal massage/.test(text), "IBS must not copy CIC massage or crunches");
  assert(/walk|breath/.test(text), "IBS should keep moderate walking and breathing");
});

test("IBS-C is ibs — not constipation_cic", () => {
  const c = condByName(/IBS with constipation/i);
  assert(c, "expected IBS with constipation");
  assert(c.protocol === "ibs", `got ${c.protocol}`);
});

test("Functional dyspepsia uses functional_dyspepsia — not gastroparesis pool", () => {
  const c = condByName(/^Functional dyspepsia$/i);
  assert(c, "expected Functional dyspepsia");
  assert(c.protocol === "functional_dyspepsia", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 6, age: 42, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/crunch|sit-up|lying flat/.test(text), "functional dyspepsia must not lie-flat crunch");
  assert(/walk|upright|after (a )?meal|post-?meal/.test(text), "functional dyspepsia should keep upright post-meal walking");
});

test("Sciatica uses radiculopathy_lumbar keep-active walking — not generic lumbar load-lift", () => {
  const c = condByName(/^Sciatica$/i);
  assert(c, "expected Sciatica");
  assert(c.protocol === "radiculopathy_lumbar", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 6, age: 48, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/loaded lifting mechanics|impact reintroduction|deadlift/.test(text), "sciatica must not load-lift/impact");
  assert(/walk/.test(text), "sciatica should keep walking (NICE keep-active)");
});

test("Non-specific low back pain keeps walking — not fusion BLT", () => {
  const c = condByName(/^Non-specific low back pain$/i);
  assert(c, "expected Non-specific low back pain");
  assert(c.protocol === "lumbar", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 44, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(/walk/.test(text), "ordinary LBP should keep walking");
  assert(!/log.?roll|blt/.test(text), "ordinary LBP is keep-active, not fusion BLT");
});

test("Full-thickness rotator cuff tear is protect-first — not shoulder plyos", () => {
  const c = condByName(/Rotator cuff tear \(full-thickness\)/i);
  assert(c, "expected Rotator cuff tear (full-thickness)");
  assert(c.protocol === "cuff_repair", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 58, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/plyometric|throwing|racket/.test(text), "full-thickness cuff tear must not plyo/throw");
  assert(/pendulum|isometric|scapular/.test(text), "full-thickness cuff tear should stay protected");
});

test("SLAP tear is protect-first — not overhead plyos", () => {
  const c = condByName(/^SLAP \(labral\) tear$/i) || condByName(/SLAP \(labral\) tear \(Left\)/i);
  assert(c, "expected SLAP (labral) tear");
  assert(c.protocol === "shoulder_instability", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 28, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/plyometric|throwing|racket/.test(text), "SLAP tear must not throw/plyo");
});

test("Shoulder impingement post-repair uses cuff_repair — not generic shoulder plyos", () => {
  const c = condByName(/Shoulder impingement post-repair/i);
  assert(c, "expected Shoulder impingement post-repair");
  assert(c.protocol === "cuff_repair", `got ${c.protocol}`);
});

test("Gluteal tendinopathy is not hip cutting drills", () => {
  const c = condByName(/^Gluteal tendinopathy$/i) || condByName(/Gluteal tendinopathy \(Left\)/i);
  assert(c, "expected Gluteal tendinopathy");
  assert(c.protocol !== "hip", `gluteal tendinopathy must not use generic hip, got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 8, age: 54, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/cutting drills|lateral bounds/.test(text), "gluteal tendinopathy must not cut/bound");
});

test("Post-laminectomy recovery uses lumbar_fusion — not generic lumbar load-lift", () => {
  const c = condByName(/^Post-laminectomy recovery$/i);
  assert(c, "expected Post-laminectomy recovery");
  assert(c.protocol === "lumbar_fusion", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 2, age: 62, surgery: "yes" });
  const text = names(prog).toLowerCase();
  assert(!/loaded lifting mechanics|impact reintroduction|deadlift/.test(text), "early laminectomy must not load-lift/impact");
});

test("Cauda equina post-decompression uses lumbar_fusion — not radiculopathy load-lift", () => {
  const c = condByName(/Cauda equina \(post-decompression recovery\)/i);
  assert(c, "expected Cauda equina (post-decompression recovery)");
  assert(c.protocol === "lumbar_fusion", `got ${c.protocol}`);
});

test("Foraminal stenosis at L4-L5 uses lumbar_stenosis — not generic lumbar", () => {
  const c = condByName(/^Foraminal stenosis at L4-L5$/i);
  assert(c, "expected Foraminal stenosis at L4-L5");
  assert(c.protocol === "lumbar_stenosis", `got ${c.protocol}`);
});

test("Osteoporotic vertebral compression uses osteoporosis — not generic lumbar impact", () => {
  const c = condByName(/Osteoporotic vertebral compression/i);
  assert(c, "expected Osteoporotic vertebral compression");
  assert(c.protocol === "osteoporosis", `got ${c.protocol}`);
  const prog = planFor(E, { condIds: [c.id], weeks: 8, age: 74, surgery: "no" });
  const text = names(prog).toLowerCase();
  assert(!/loaded lifting mechanics|impact reintroduction|deadlift|crunch/.test(text), "vertebral compression must not load-lift/impact/crunch");
});

test("Total knee replacement recovery follows 2026 APTA TKA CPG themes", () => {
  const c = condByName(/^Total knee replacement recovery$/i) || condByName(/Total knee replacement recovery \(Left\)/i);
  assert(c, "expected Total knee replacement recovery");
  assert(c.protocol === "knee_replacement", `got ${c.protocol}`);
  const early = planFor(E, { condIds: [c.id], weeks: 2, age: 68, surgery: "yes" });
  const earlyText = namesEarly(early).toLowerCase();
  assert(/quad|heel slide|ankle pump|extension|straight/.test(earlyText), "early TKA should keep quad/ROM/circulation work");
  assert(!/\bcpm\b|continuous passive|plyometric|hop|jog|run/.test(earlyText), "early TKA must not use CPM or impact");
  const later = planFor(E, { condIds: [c.id], weeks: 10, age: 68, surgery: "yes" });
  const laterText = names(later).toLowerCase();
  assert(/sit-to-stand|step-up|walk|bike|balance/.test(laterText), "later TKA should keep function, walking, bike, balance");
  assert(!/\bcpm\b|continuous passive|plyometric|hop|\bjog\b|\brun\b/.test(laterText), "TKA must not hop/run/CPM");
  const blob = `${(early.notes || []).join(" ")} ${(early.items || []).map(i => `${i.about || ""} ${i.redflags || ""}`).join(" ")}`.toLowerCase();
  assert(/ice|cryo/.test(blob) && /elevat/.test(blob), "TKA education should mention ice and elevation");
  assert(/straighten|extension/.test(blob), "TKA education should keep working extension");
  assert(/physical therapist|supervised/.test(blob), "TKA education should not replace supervised PT");
});

test("MSK red-flag copy off-ramps cancer/infection/trauma/inflammatory — does not diagnose", () => {
  const c = condByName(/^Non-specific low back pain$/i);
  assert(c, "expected Non-specific low back pain");
  const prog = planFor(E, { condIds: [c.id], weeks: 4, age: 50, surgery: "no" });
  const rf = `${prog.items[0].redflags || ""} ${(prog.notes || []).join(" ")}`.toLowerCase();
  assert(/cancer|infection|trauma|inflammatory/.test(rf), "MSK off-ramp must name cancer/infection/trauma/inflammatory");
  assert(/clinician|assess|urgent|checked/.test(rf), "MSK off-ramp must send the person to a clinician");
  assert(!/your labs mean|you have cancer|diagnosis is/.test(rf), "must not diagnose from labs");
});

test("general_msk and cardiac_rehab carry WHO/FITT dose education — not a prescription", () => {
  const g = condByName(/^Sarcopenia \(progressive resistance\)$/i);
  assert(g, "expected Sarcopenia (progressive resistance)");
  assert(g.protocol === "general_msk", `got ${g.protocol}`);
  const gProg = planFor(E, { condIds: [g.id], weeks: 8, age: 70, surgery: "no" });
  const gNotes = (gProg.notes || []).join(" ").toLowerCase();
  assert(/150/.test(gNotes) && /muscle-strengthen|strengthening/.test(gNotes), "general_msk should show WHO weekly minutes + strength days");
  assert(/not a prescription|education|as able|clinician/.test(gNotes), "dose card must stay educational");

  const cr = condByName(/^COPD with pulmonary rehabilitation$/i) || condByName(/^COPD \(GOLD stage 1\)$/i);
  assert(cr, "expected a pulmonary_rehab condition");
  const cProg = planFor(E, { condIds: [cr.id], weeks: 8, age: 68, surgery: "no" });
  const cNotes = (cProg.notes || []).join(" ").toLowerCase();
  assert(/150/.test(cNotes), "cardio-pulm pools should show the same dose education");
});

test("GETP-12 special-pops are not dumped on general_msk", () => {
  for (const [re, label] of [
    [/Postural orthostatic tachycardia syndrome \(POTS\)/i, "POTS"],
    [/Chronic fatigue syndrome \/ ME/i, "ME/CFS"],
  ]) {
    const c = condByName(re);
    assert(c, `expected ${label} in catalogue`);
    assert(c.protocol !== "general_msk", `${label} must not use general_msk, got ${c.protocol}`);
  }
  for (const re of [/MASLD/i, /NAFLD/i, /non-alcoholic fatty liver/i, /spontaneous coronary/i, /SCAD/i]) {
    const c = condByName(re);
    if (c) assert(c.protocol !== "general_msk", `${c.name} must not use general_msk, got ${c.protocol}`);
  }
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
