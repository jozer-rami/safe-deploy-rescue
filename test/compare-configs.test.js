import { test } from "node:test";
import assert from "node:assert/strict";
import { compareConfigs } from "../src/verify-deployment.js";

test("compareConfigs matches identical live configs", () => {
  const config = {
    exists: true,
    version: "1.3.0",
    threshold: 1,
    owners: ["0xaaa", "0xbbb"],
  };
  assert.equal(compareConfigs(config, { ...config, owners: ["0xbbb", "0xaaa"] }).match, true);
});

test("compareConfigs reports owner drift after creation", () => {
  const source = {
    exists: true,
    version: "1.3.0",
    threshold: 1,
    owners: ["0xaaa"],
  };
  const target = {
    exists: true,
    version: "1.3.0",
    threshold: 1,
    owners: ["0xaaa", "0xccc"],
  };
  const result = compareConfigs(source, target);
  assert.equal(result.match, false);
  assert.ok(result.issues.some((issue) => /Owner count/.test(issue)));
});
