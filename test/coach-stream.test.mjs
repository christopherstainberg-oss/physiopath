/* =====================================================================
   Coach streaming — the pure SSE parser (parseOpenAISSE).

   The live fetch/stream loop can't run under the node shim (no fetch/streams), but its
   correctness hinges on this pure function, which the loop feeds the growing buffer. These
   pin: delta.content accumulation, finish_reason, partial-event tolerance, and error surfacing.
===================================================================== */
import { E } from "./shared.mjs";
import { test, suite } from "./runner.mjs";
import { strict as A } from "node:assert";

suite("coach SSE streaming");
const parse = E.parseOpenAISSE;

const chunk = (delta, finish = null) =>
  `data: ${JSON.stringify({
    id: "chatcmpl-test",
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta, finish_reason: finish }]
  })}`;

const FULL = [
  chunk({ role: "assistant", content: "" }),
  chunk({ content: "Ice" }),
  chunk({ content: " for 15 min." }),
  chunk({}, "stop"),
  "data: [DONE]"
].join("\n\n");

test("assembles delta.content chunks and reads finish_reason", () => {
  const r = parse(FULL);
  A.equal(r.text, "Ice for 15 min.");
  A.equal(r.stop, "stop");
});

test("ignores [DONE] and empty deltas (no spurious text)", () => {
  const r = parse([chunk({ role: "assistant" }), "data: [DONE]"].join("\n\n"));
  A.equal(r.text, "");
  A.equal(r.stop, null);
});

test("an incomplete trailing event (chunk split mid-event) is skipped until complete", () => {
  // cut the buffer partway through the SECOND delta's JSON
  const cut = FULL.slice(0, FULL.indexOf(" for 15 min."));
  const r = parse(cut);
  A.equal(r.text, "Ice", "only the complete first delta is included");
});

test("length finish_reason surfaces (so the 'cut off' note fires)", () => {
  const s = [
    chunk({ content: "hi" }),
    chunk({}, "length"),
  ].join("\n\n");
  const r = parse(s);
  A.equal(r.text, "hi");
  A.equal(r.stop, "length");
});

test("an error payload throws (routes to the offline fallback)", () => {
  A.throws(
    () => parse(`data: ${JSON.stringify({ error: { message: "overloaded_error" } })}`),
    /overloaded_error/
  );
});
