import { loadEngine, planFor, allExercises, phaseSizes } from "./harness.mjs";

const engine = loadEngine();
console.log("conditions loaded:", engine.window.CONDITIONS?.length);
console.log("exercises loaded:", engine.window.EXERCISES?.length);
console.log("CONMAP size:", engine.CONMAP.size, "EXMAP size:", engine.EXMAP.size);

const acl = engine.window.CONDITIONS.find(c => /acl reconstruction/i.test(c.name)) || engine.window.CONDITIONS[0];
console.log("\nplanning for:", acl.name, "(id", acl.id + ")");

const prog = planFor(engine, { condIds: [acl.id], age: 30, weeks: 4, surgery: "yes" });
console.log("track:", prog.track, "totalWeeks:", prog.totalWeeks);
console.log("conditions in program (items):", prog.items.length);
console.log("phase sizes:", JSON.stringify(phaseSizes(prog)));
console.log("flags:", prog.flags.join(", ") || "(none)");
console.log("clearance:", prog.clearance);
const ex = allExercises(prog);
console.log("total exercises:", ex.length);
console.log("sample:", ex.slice(0, 4).map(e => e.n).join(" | "));
console.log("sample exercise object keys:", Object.keys(ex[0]).join(", "));
console.log("\nOK");
