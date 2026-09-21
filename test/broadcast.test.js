import { test } from "node:test";
import assert from "node:assert/strict";
import { isBroadcastEnabled } from "../src/broadcast.js";

test("defaults to dry-run when env is empty", () => {
  assert.equal(isBroadcastEnabled({}), false);
});

test("broadcasts when BROADCAST=1", () => {
  assert.equal(isBroadcastEnabled({ BROADCAST: "1" }), true);
});

test("broadcasts when DRY_RUN=0", () => {
  assert.equal(isBroadcastEnabled({ DRY_RUN: "0" }), true);
});

test("BROADCAST wins over DRY_RUN=1", () => {
  assert.equal(isBroadcastEnabled({ BROADCAST: "1", DRY_RUN: "1" }), true);
});

test("DRY_RUN=1 stays dry-run", () => {
  assert.equal(isBroadcastEnabled({ DRY_RUN: "1" }), false);
});
