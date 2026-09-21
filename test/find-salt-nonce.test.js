import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateProxyAddress, searchSaltNonce } from "../src/create2.js";
import { PROXY_CREATION_CODE } from "../src/constants.js";
import { VERIFIED_PARAMS } from "../src/verified-params.js";

test("searchSaltNonce finds a small nonce", () => {
  const saltNonce = 7n;
  const target = calculateProxyAddress({
    factory: VERIFIED_PARAMS.factory,
    singleton: VERIFIED_PARAMS.singleton,
    initializer: VERIFIED_PARAMS.initializer,
    saltNonce,
    proxyCreationCode: PROXY_CREATION_CODE,
  });

  const found = searchSaltNonce({
    factory: VERIFIED_PARAMS.factory,
    singleton: VERIFIED_PARAMS.singleton,
    initializer: VERIFIED_PARAMS.initializer,
    targetAddress: target,
    proxyCreationCode: PROXY_CREATION_CODE,
    maxNonce: 20n,
  });

  assert.equal(found, saltNonce);
});

test("searchSaltNonce returns null for a 256-bit salt outside the range", () => {
  const found = searchSaltNonce({
    factory: VERIFIED_PARAMS.factory,
    singleton: VERIFIED_PARAMS.singleton,
    initializer: VERIFIED_PARAMS.initializer,
    targetAddress: VERIFIED_PARAMS.safeAddress,
    proxyCreationCode: PROXY_CREATION_CODE,
    maxNonce: 1000n,
  });

  assert.equal(found, null);
});
