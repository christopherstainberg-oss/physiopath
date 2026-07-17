/* =====================================================================
   PhysioPath — objective progression gates (audit OBJ-1)

   Phase-advance criteria become MEASURED, not self-ticked: enter the affected
   and the other side, the app computes a symmetry %, and a phase is ready only
   when every measurable gate is met AND the logged pain supports it. Gates are
   region-derived (knee vs shoulder vs ankle …).
===================================================================== */
import { planFor } from "./harness.mjs";
import { suite, test, assert } from "./runner.mjs";
import { E, COND } from "./shared.mjs";

suite("objective progression gates (OBJ-1)");

const kneeItem = () => planFor(E, { condIds:[COND.acl.id], surgery:"yes", weeks:8 }).items[0];
const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

test("gates are region-derived", () => {
  assert(E.measureRegionKey({ region:"Knee", name:"ACL reconstruction" }) === "knee", "knee");
  assert(E.measureRegionKey({ region:"Shoulder", name:"Rotator cuff" }) === "shoulder", "shoulder");
  assert(E.measureRegionKey({ region:"Foot / ankle", name:"Achilles" }) === "ankle", "ankle");
  assert(E.measureRegionKey({ region:"Spine", name:"Low back pain" }) === "general", "fallback");
  assert(E.measuresFor({ region:"Knee" }).some(g => g.key === "knee_flex"), "knee set carries knee_flex");
});

test("measurePct is symmetry-as-%, capped at 100", () => {
  assert(E.measurePct({ aff:90, oth:100 }) === 90, "90/100 = 90%");
  assert(E.measurePct({ aff:130, oth:100 }) === 100, "past parity caps at 100%");
  assert(E.measurePct({ aff:50, oth:0 }) === null, "no other-side value -> null");
  assert(E.measurePct(null) === null, "no measure -> null");
});

test("a phase is not ready until EVERY measurable gate is met", () => {
  const item = kneeItem();
  E.state.log = []; E.state.measures = {};
  assert(!E.gateStatus(item).ready, "no measurements -> not ready");
  E.state.measures = { knee_flex:[{ d:"x", aff:95, oth:100 }], knee_ext:[{ d:"x", aff:1, oth:1 }] };
  assert(!E.gateStatus(item).ready, "two of three gates -> still not ready");
  E.state.measures.knee_sls = [{ d:"x", aff:12, oth:13 }];
  assert(E.gateStatus(item).ready, "all gates >=90% + pain ok -> ready");
  E.state.measures = {};
});

test("the pain guard HOLDS progression even when the numbers are met", () => {
  const item = kneeItem();
  E.state.measures = { knee_flex:[{ d:"x", aff:98, oth:100 }], knee_ext:[{ d:"x", aff:1, oth:1 }], knee_sls:[{ d:"x", aff:13, oth:13 }] };
  E.state.log = Array.from({ length:6 }, (_, i) => ({ date: iso(6 - i), pain:8, sessions:1 }));
  const gs = E.gateStatus(item);
  assert(gs.measurableMet, "the measurable gates are met");
  assert(!gs.pain.ok && !gs.ready, "but a run of 8/10 in the log holds it");
  E.state.measures = {}; E.state.log = [];
});

test("a tick gate needs an explicit confirmation", () => {
  const item = kneeItem();
  E.state.log = []; E.state.measures = { knee_flex:[{ d:"x", aff:99, oth:100 }], knee_sls:[{ d:"x", aff:13, oth:13 }] };
  const extGate = E.gateStatus(item).items.find(x => x.g.key === "knee_ext");
  assert(extGate && !extGate.met, "extension tick defaults to not-met");
  E.state.measures.knee_ext = [{ d:"x", aff:1, oth:1 }];
  assert(E.gateStatus(item).items.find(x => x.g.key === "knee_ext").met, "confirming it meets the gate");
  E.state.measures = {};
});

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) (await import("./runner.mjs")).report();
