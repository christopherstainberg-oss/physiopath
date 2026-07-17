/* =====================================================================
   PhysioPath — headless engine harness (zero-dependency)

   Loads the REAL production code — data/protocols.js, the generated data
   files, and app.js — into a single Node `vm` context behind a minimal DOM
   shim, then hands tests the pure planning engine (generateProgram,
   gatherFlags, the age gates …) driven directly off `state`.

   Why a shim and not jsdom: the repo is deliberately dependency-free, and
   the engine that matters (generateProgram / gatherFlags / applyContra /
   the age gates) is pure over `state` — it never touches the DOM. app.js's
   entire UI wiring lives inside a single DOMContentLoaded handler, so a
   `document.addEventListener` that simply never fires means loading app.js
   defines every function without running a line of UI code.

   The engine is exposed via a small SEAM appended to app.js's source *here*
   (not in the shipped file): a trailing `window.__engine = { … }` that can
   see app.js's top-level bindings because it runs in the same scope. If you
   rename an engine symbol, update the seam list below.
===================================================================== */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = f => readFileSync(join(ROOT, f), "utf8");

/* Data + code, in load order. Data files just assign window.X; protocols.js
   wires the contra-engine onto window; app.js defines the planner. */
const DATA_FILES = [
  "data/protocols.js",
  "data/conditions.js",
  "data/exercises.js",
  "data/plans.js",
  "data/surgery-plans.js",
  "data/surgeries.js",
  "data/adl-exercises.js",
  "data/adls.js",
  "data/medications.js",
];

/* Engine symbols to surface to tests. All are top-level bindings in app.js. */
const SEAM = `
;window.__engine = {
  state, generateProgram, gatherFlags, clearanceNeeded,
  save, load, migrateState, DEFAULT_STATE, STATE_VERSION, parseAnthropicSSE,
  exAgeMin, exAgeMax, exAgeOk, adaptForAge, protoAgeMin, PROTO_AGE_RULES, isPediatric, phaseTarget,
  detectPlan, detectFocus, getProtocol: window.getProtocol,
  gateStatus, measuresFor, measureRegionKey, measurePct, latestMeasure, MEASURE_SETS,
  planFloored, currentPlanPhase, weekPhaseOf,
  tissueClass, thisWeekFocus, LOADING_LADDER, progressionSignal, recentEffort,
  SPECIAL_PRECAUTIONS, CONTRA_RULES: window.CONTRA_RULES,
  PROTOCOLS: window.PROTOCOLS, PROTOCOL_ALIAS: window.PROTOCOL_ALIAS,
  selectedConditions, CONMAP, EXMAP,
  // populate the id→object maps the way ensureConditions()/ensureProgramData() would,
  // minus the <script> element dance that the shim can't run.
  hydrate(){
    if(window.CONDITIONS) window.CONDITIONS.forEach(c=>CONMAP.set(c.id,c));
    if(window.EXERCISES)  window.EXERCISES.forEach(e=>EXMAP.set(e.id,e));
    if(window.MEDICATIONS && typeof MEDMAP!=="undefined") window.MEDICATIONS.forEach(m=>MEDMAP.set(m.id,m));
  }
};
`;

/* ---------- minimal DOM / browser shim ---------- */
function makeStubEl() {
  return {
    style: {}, dataset: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    children: [], attributes: {},
    appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; },
    addEventListener(){}, removeEventListener(){}, querySelector(){ return null; },
    querySelectorAll(){ return []; }, focus(){}, click(){}, insertAdjacentHTML(){},
    textContent: "", innerHTML: "", value: "", checked: false,
  };
}

function makeSandbox() {
  const noop = () => {};
  const documentStub = {
    readyState: "complete",
    addEventListener: noop,          // <-- the key: DOMContentLoaded never fires
    removeEventListener: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => makeStubEl(),
    createDocumentFragment: () => makeStubEl(),
    head: makeStubEl(),
    body: makeStubEl(),
    documentElement: makeStubEl(),
  };
  const store = new Map();
  const localStorageStub = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  };
  const sandbox = {
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    Math, Date, JSON, URL, URLSearchParams, TextEncoder, TextDecoder,
    document: documentStub,
    localStorage: localStorageStub,
    // NB: no `serviceWorker`/`bluetooth` keys — app.js gates on `"serviceWorker" in navigator`,
    // so their mere presence (even undefined) would run browser-only boot code.
    navigator: { onLine: true, userAgent: "node" },
    location: { search: "", href: "http://localhost/", reload: noop },
    matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
    requestAnimationFrame: cb => setTimeout(cb, 0),
    cancelAnimationFrame: noop,
    alert: noop, print: noop, scrollTo: noop, fetch: undefined,
    addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

/* Build one loaded engine. Call this once per test file (it's ~cheap after the
   first parse but each call is a fully isolated context, so tests can't leak
   state into each other). */
export function loadEngine() {
  const sandbox = makeSandbox();
  const ctx = vm.createContext(sandbox);
  for (const f of DATA_FILES) {
    vm.runInContext(read(f), ctx, { filename: f });
  }
  vm.runInContext(read("app.js") + SEAM, ctx, { filename: "app.js" });
  const engine = sandbox.__engine;
  engine.hydrate();
  engine.window = sandbox;
  return engine;
}

/* A blank state matching app.js's initial `state`, so each profile starts from
   a known baseline. We snapshot the engine's own default and reset onto it. */
export function resetState(engine, overrides = {}) {
  const s = engine.state;
  // reset the fields tests touch back to app.js defaults
  Object.assign(s, {
    step: 0, age: "", sex: "", flags: [], parq: { pain: false, faint: false, doc: false },
    meds: "", notes: "", condIds: [], weeks: null, painRest: 3, painMove: 4,
    surgery: "no", surgeryType: "auto", surgeryDate: "", fitness: "mod", goal: "",
    returnActivities: [], returnSports: [],
    vitals: { restHR: "", sbp: "", dbp: "", spo2: "", rr: "", height: "", weight: "" },
    vitalsLog: [], labs: {}, labHist: {},
    screen: {}, falls: "", aid: "", smoking: "", alcohol: "", sleep: "", stress: "",
    waterConfidence: "", adls: [], medIds: [], medFilter: false, homeMode: false,
    customPrecautions: [], clinicianProtocols: [], clinPrecautionProtocol: "",
    clinicianGuided: false, selfGuided: false, medDoses: {},
    weightBearing: { status: "", pct: "", lbs: "", side: "", limb: "le" }, devices: [],
    cardiacDevice: { type: "", icdRate: "" }, specialPrecautions: [], planVariant: {},
    program: null, pregStage: "", footSensation: "",
  });
  Object.assign(s, overrides);
  return s;
}

/* Convenience: set a profile, generate, return the program. */
export function planFor(engine, profile) {
  resetState(engine, profile);
  return engine.generateProgram();
}

/* Flatten every exercise across every condition/phase of a program.
   Program shape: { items:[ { name, phases:[ { ex:[ {n, ...tags} ] } ] } ] };
   an exercise's display name is `.n`. */
export function allExercises(program) {
  const out = [];
  for (const c of program.items || []) {
    (c.phases || []).forEach((ph, pi) => {
      (ph.ex || []).forEach(e => out.push({ ...e, name: e.n, _phase: pi, _condition: c.name }));
    });
  }
  return out;
}

/* Per-condition phase exercise-count matrix: [[p0,p1,p2,p3], ...] */
export function phaseSizes(program) {
  return (program.items || []).map(c => (c.phases || []).map(ph => (ph.ex || []).length));
}
