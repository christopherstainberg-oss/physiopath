/* =====================================================================
   PhysioPath — Explain must describe THIS exercise, not a pattern template.

   Screenshot (Desktop/Exlplain.png): "Wall slides / walks" on a shoulder plan
   opened as generic cardio ("pick walking, bike, rower" + "sustained stretch"
   + "mainly works the shoulder"). Cause: inferPattern's /walk|row/ fired
   before mobility/pull, and Explain never named the movement.

   Educational only — not a prescription.
===================================================================== */
import { suite, test, assert } from "./runner.mjs";
import { E } from "./shared.mjs";

suite("exercise Explain names the movement");

const strip = html => String(html || "").replace(/<[^>]+>/g, " ");
const explain = (name, region) => strip(E.movementExplain(name, null, region));

test("Wall slides / walks is mobility, not cardio — names the wall and the arms", () => {
  assert(E.inferPattern("Wall slides / walks") === "mobility",
    `Wall slides / walks should be mobility, got ${E.inferPattern("Wall slides / walks")}`);
  const t = explain("Wall slides / walks", ["Shoulder"]);
  assert(!/bike, rower|whatever you've got/i.test(t), `must not be generic cardio setup: ${t.slice(0, 280)}`);
  assert(!/sustained stretch/i.test(t), `aerobic 'stretch' wording must not appear: ${t.slice(0, 200)}`);
  assert(/wall/i.test(t) && /arm|hand/i.test(t), `must tell you to slide the arms on a wall: ${t.slice(0, 280)}`);
});

test("Scapular rows (band) is a pull, not a rower session", () => {
  assert(E.inferPattern("Scapular rows (band)") === "pull",
    `Scapular rows should be pull, got ${E.inferPattern("Scapular rows (band)")}`);
  const t = explain("Scapular rows (band)", ["Shoulder"]);
  assert(!/bike, rower|whatever you've got/i.test(t), `rows must not be cardio: ${t.slice(0, 280)}`);
  assert(/blade|shoulder|elbow|band/i.test(t), `must mention the row: ${t.slice(0, 280)}`);
});

test("Pendulum swings: hanging arm, not a generic stretch class", () => {
  const t = explain("Pendulum swings", ["Shoulder"]);
  assert(/hang|pendulum|sway|circle/i.test(t), `pendulum must say hang/sway: ${t.slice(0, 280)}`);
  assert(!/whatever you've got/i.test(t), `pendulum must not be cardio`);
});

test("Lateral band walks is a hip step, not aerobic walking", () => {
  const p = E.inferPattern("Lateral band walks");
  assert(p !== "cardio", `band walks must not be cardio, got ${p}`);
  const t = explain("Lateral band walks", ["Hip"]);
  assert(/band|side|step/i.test(t), `must describe the side-step: ${t.slice(0, 280)}`);
  assert(!/bike, rower|whatever you've got/i.test(t), `must not be generic cardio: ${t.slice(0, 280)}`);
});

test("Seated row is a pull — /row/ must not steal it for cardio", () => {
  assert(E.inferPattern("Seated row") === "pull",
    `Seated row should be pull, got ${E.inferPattern("Seated row")}`);
});

test("Arm ergometer is cardio of the ARMS, not 'mainly works the shoulder'", () => {
  const t = explain("Seated arm-ergometer / upper-body cardio", ["Shoulder"]);
  assert(/arm|hand|ergometer|cycle/i.test(t), `must name arm cycling: ${t.slice(0, 280)}`);
  assert(!/mainly works the shoulder/i.test(t), `cardio must not inherit the condition region: ${t.slice(0, 200)}`);
  assert(!/sustained stretch/i.test(t), "no aerobic-as-stretch wording");
});

test("Easy walk explains walking, not 'pick bike or rower'", () => {
  const t = explain("Easy walk", ["Knee"]);
  assert(/walk/i.test(t), `must mention walking: ${t.slice(0, 200)}`);
  assert(!/whatever you've got/i.test(t), `named walk should not say pick any machine: ${t.slice(0, 200)}`);
});

test("protocol cue is shown so Explain matches the listed exercise", () => {
  const html = E.movementExplain("Wall slides / walks", null, ["Shoulder"], "Only to a comfortable height");
  assert(/comfortable height/i.test(html), `cue must appear in Explain: ${String(html).slice(0, 300)}`);
});

test("vague 'Return to activity' is a progression note, not a fake movement", () => {
  const t = explain("Return to activity", ["Shoulder"]);
  assert(!/bike, rower|whatever you've got/i.test(t), `prescription names must not get cardio filler: ${t.slice(0, 280)}`);
  assert(/progress|earlier|same kind|not a single movement|not one named/i.test(t),
    `should admit this is a progression, not a drill: ${t.slice(0, 280)}`);
});

test("Gentle wrist ROM names the wrist — not 'general conditioning' on a shoulder plan", () => {
  const t = explain("Gentle wrist ROM", ["Shoulder"]);
  assert(/wrist/i.test(t), `must name the wrist: ${t.slice(0, 280)}`);
  assert(!/general conditioning exercise for the area/i.test(t), `must not be generic: ${t.slice(0, 200)}`);
  assert(!/mainly works the shoulder/i.test(t), `wrist ROM must not inherit the condition region: ${t.slice(0, 200)}`);
});

test("Pronation/supination (hammer) is forearm rotation, not a generic drill", () => {
  const t = explain("Pronation/supination (hammer)", ["Elbow"]);
  assert(/hammer|rotate|thumb|forearm/i.test(t), `must describe the rotation: ${t.slice(0, 280)}`);
});

test("Soft-ball squeezes is a grip, not general conditioning", () => {
  const t = explain("Soft-ball squeezes", ["Elbow"]);
  assert(/squeez|grip|ball|hand/i.test(t), `must describe a squeeze: ${t.slice(0, 280)}`);
  assert(!/general conditioning exercise for the area/i.test(t), `must not be generic: ${t.slice(0, 200)}`);
});

test("Band diagonals (PNF) names a diagonal reach", () => {
  const t = explain("Band diagonals (PNF)", ["Shoulder"]);
  assert(/diagonal|chop|lift|across/i.test(t), `must describe the diagonal: ${t.slice(0, 280)}`);
});

test("Clamshells is a side-lying hip drill", () => {
  const t = explain("Clamshells", ["Hip"]);
  assert(/side|clam|knee|hip/i.test(t), `must describe the clamshell: ${t.slice(0, 280)}`);
  assert(!/general conditioning exercise for the area/i.test(t), `must not be generic what-it-is: ${t.slice(0, 200)}`);
});

test("Sport-specific loading is a heading, not a fake movement", () => {
  const t = explain("Sport-specific loading", ["Shoulder"]);
  assert(/progress|earlier|not a single movement|not one named|heading/i.test(t),
    `should admit this is a progression: ${t.slice(0, 280)}`);
  assert(!/general conditioning/i.test(t), `must not be generic: ${t.slice(0, 200)}`);
});

test("Short easy walks is walking, not general conditioning", () => {
  const t = explain("Short easy walks", ["Knee"]);
  assert(/walk/i.test(t), `must mention walking: ${t.slice(0, 200)}`);
  assert(!/general conditioning exercise for the area/i.test(t), `walks plural must not fall through: ${t.slice(0, 200)}`);
});

test("Energy conservation is a habit, not a strengthening drill", () => {
  const t = explain("Energy conservation", ["Shoulder"]);
  assert(/pac|rest|habit|energy|not a strengthening/i.test(t), `must describe pacing: ${t.slice(0, 280)}`);
  assert(!/general conditioning/i.test(t), `must not be generic: ${t.slice(0, 200)}`);
});

test("Colon-directed abdominal massage is massage along the colon, not sit-ups", () => {
  const t = explain("Colon-directed abdominal massage", ["Abdomen"]);
  assert(/colon|massage|clockwise/i.test(t), `must name colon massage: ${t.slice(0, 280)}`);
  assert(!/sit-up|crunch/i.test(t), `must not be trunk flexion`);
});

test("Rest — no structured exercise until cleared is rest, not a drill", () => {
  const t = explain("Rest — no structured exercise until cleared", ["Shoulder"]);
  assert(/rest|cleared|not (a |an )?(drill|exercise)|no structured/i.test(t),
    `must say rest: ${t.slice(0, 280)}`);
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
