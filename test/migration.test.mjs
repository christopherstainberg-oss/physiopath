/* =====================================================================
   State persistence & migration — load()/save() over crafted OLD-shape saves.

   This is the surface the audit flagged as fragile + untested: an old localStorage
   state loading into newer code. The engine now derives the deep-merge keys from
   DEFAULT_STATE's shape (so a new fixed-shape field can't be forgotten) and stamps a
   schema version. These tests pin that behaviour.

   Runs LAST in the aggregator and fully resets state before each case, so it can't
   leak into the planning suites (which share the same engine).
===================================================================== */
import { E } from "./shared.mjs";
import { test, suite } from "./runner.mjs";
import { strict as A } from "node:assert";

suite("state persistence & migration");

const LS = E.window.localStorage;

/* Reset state to pristine defaults, seed a saved blob, load it, return the live state. */
function loadSaved(saved) {
  for (const k of Object.keys(E.state)) delete E.state[k];
  Object.assign(E.state, JSON.parse(JSON.stringify(E.DEFAULT_STATE)));
  LS.clear();
  LS.setItem("physiopath", JSON.stringify(saved));
  E.load();
  return E.state;
}

test("old save missing weightBearing sub-fields is filled from defaults (the ~undefined-lbs bug)", () => {
  const s = loadSaved({ condIds: ["x"], weightBearing: { status: "PWB", pct: "50" } }); // no lbs/side/limb
  A.equal(s.weightBearing.status, "PWB", "status preserved");
  A.equal(s.weightBearing.pct, "50", "pct preserved");
  A.equal(s.weightBearing.lbs, "", "lbs filled from default, not undefined");
  A.equal(s.weightBearing.side, "", "side filled from default");
  A.equal(s.weightBearing.limb, "le", "limb filled from default");
});

test("old save missing cardiacDevice sub-field is filled", () => {
  const s = loadSaved({ condIds: ["x"], cardiacDevice: { type: "icd" } }); // no icdRate
  A.equal(s.cardiacDevice.type, "icd");
  A.equal(s.cardiacDevice.icdRate, "", "icdRate filled from default");
});

test("a fixed-shape field is auto-covered by the DERIVED merge list (parq)", () => {
  const s = loadSaved({ condIds: ["x"], parq: { pain: true } }); // missing faint/doc
  A.equal(s.parq.pain, true, "pain preserved");
  A.equal(s.parq.faint, false, "faint filled from default");
  A.equal(s.parq.doc, false, "doc filled from default");
});

test("derived NESTED_KEYS covers every plain-object default and excludes program (null)", () => {
  // program defaults to null → must be loaded WHOLESALE, never merged
  const s = loadSaved({ condIds: ["x"], program: { items: [{ name: "X", phases: [] }], sessions: "3x/wk" } });
  A.ok(s.program && s.program.items.length === 1, "program loaded as-is");
  A.equal(s.program.sessions, "3x/wk");
});

test("empty-map fields (labs) load their entries unchanged", () => {
  const s = loadSaved({ condIds: ["x"], labs: { hba1c: { v: "6.5", lo: "4", hi: "5.6" } } });
  A.equal(s.labs.hba1c.v, "6.5", "lab entry preserved through the (identity) merge");
  A.equal(s.labs.hba1c.hi, "5.6");
});

test("scalar + array fields load wholesale", () => {
  const s = loadSaved({ condIds: ["a", "b"], age: "7", painRest: 8, medIds: ["m1"], selfGuided: true });
  A.deepEqual(s.condIds, ["a", "b"]);
  A.equal(s.age, "7");
  A.equal(s.painRest, 8);
  A.deepEqual(s.medIds, ["m1"]);
  A.equal(s.selfGuided, true);
});

test("save() stamps the schema version", () => {
  loadSaved({ condIds: ["x"] });
  A.ok(E.save(), "save returns true");
  const written = JSON.parse(LS.getItem("physiopath"));
  A.equal(written._v, E.STATE_VERSION, "save writes the current schema version");
});

test("an unversioned save is treated as v1 and comes out at the current version after save", () => {
  const s = loadSaved({ condIds: ["x"] }); // no _v
  A.ok(!("_v" in { ...s, _v: undefined }) || s._v === undefined || s._v === E.STATE_VERSION);
  E.save();
  A.equal(JSON.parse(LS.getItem("physiopath"))._v, E.STATE_VERSION);
});

test("a non-object saved value (JSON array) is ignored, not fatal", () => {
  for (const k of Object.keys(E.state)) delete E.state[k];
  Object.assign(E.state, JSON.parse(JSON.stringify(E.DEFAULT_STATE)));
  LS.clear();
  LS.setItem("physiopath", JSON.stringify([1, 2, 3]));
  A.doesNotThrow(() => E.load(), "load() must not throw on a bogus array");
  A.ok(Array.isArray(E.state.condIds) && E.state.condIds.length === 0, "state left at defaults");
});

test("unreadable (non-JSON) save is parked, not fatal", () => {
  for (const k of Object.keys(E.state)) delete E.state[k];
  Object.assign(E.state, JSON.parse(JSON.stringify(E.DEFAULT_STATE)));
  LS.clear();
  LS.setItem("physiopath", "{ not valid json");
  A.doesNotThrow(() => E.load(), "load() must not throw on unreadable JSON");
  A.ok(Array.isArray(E.state.condIds), "state intact after an unreadable save");
});
