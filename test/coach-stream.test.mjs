/* =====================================================================
   Coach streaming — the pure SSE parser (parseAnthropicSSE).

   The live fetch/stream loop can't run under the node shim (no fetch/streams), but its
   correctness hinges on this pure function, which the loop feeds the growing buffer. These
   pin: text_delta accumulation, stop_reason, partial-event tolerance, and error surfacing.
===================================================================== */
import { E } from "./shared.mjs";
import { test, suite } from "./runner.mjs";
import { strict as A } from "node:assert";

suite("coach SSE streaming");
const parse = E.parseAnthropicSSE;

const ev = (type, obj) => `event: ${type}\ndata: ${JSON.stringify({ type, ...obj })}`;
const FULL = [
  ev("message_start", { message: {} }),
  ev("content_block_start", { index: 0 }),
  ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: "Ice" } }),
  ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: " for 15 min." } }),
  ev("message_delta", { delta: { stop_reason: "end_turn" } }),
  ev("message_stop", {}),
].join("\n\n");

test("assembles text_delta chunks and reads stop_reason", () => {
  const r = parse(FULL);
  A.equal(r.text, "Ice for 15 min.");
  A.equal(r.stop, "end_turn");
});

test("ignores ping / start / stop events (no spurious text)", () => {
  const r = parse([ev("ping", {}), ev("message_start", {}), ev("content_block_stop", { index: 0 })].join("\n\n"));
  A.equal(r.text, "");
  A.equal(r.stop, null);
});

test("an incomplete trailing event (chunk split mid-event) is skipped until complete", () => {
  // cut the buffer partway through the SECOND delta's JSON
  const cut = FULL.slice(0, FULL.indexOf(" for 15 min."));
  const r = parse(cut);
  A.equal(r.text, "Ice", "only the complete first delta is included");
});

test("max_tokens stop_reason surfaces (so the 'cut off' note fires)", () => {
  const s = [
    ev("content_block_delta", { delta: { type: "text_delta", text: "hi" } }),
    ev("message_delta", { delta: { stop_reason: "max_tokens" } }),
  ].join("\n\n");
  const r = parse(s);
  A.equal(r.text, "hi");
  A.equal(r.stop, "max_tokens");
});

test("an error event throws (routes to the offline fallback)", () => {
  A.throws(() => parse(ev("error", { error: { message: "overloaded_error" } })), /overloaded_error/);
});
