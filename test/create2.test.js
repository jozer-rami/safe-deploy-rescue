import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateProxyAddress } from "../src/create2.js";
import { PROXY_CREATION_CODE } from "../src/constants.js";
import { VERIFIED_PARAMS } from "../src/verified-params.js";

test("CREATE2 address matches the Gnosis→Polygon v1.3.0 rescue", () => {
  const address = calculateProxyAddress({
    factory: VERIFIED_PARAMS.factory,
    singleton: VERIFIED_PARAMS.singleton,
    initializer: VERIFIED_PARAMS.initializer,
    saltNonce: VERIFIED_PARAMS.saltNonce,
    proxyCreationCode: PROXY_CREATION_CODE,
  });

  assert.equal(address, VERIFIED_PARAMS.safeAddress);
});

test("CREATE2 address changes when saltNonce changes", () => {
  const address = calculateProxyAddress({
    factory: VERIFIED_PARAMS.factory,
    singleton: VERIFIED_PARAMS.singleton,
    initializer: VERIFIED_PARAMS.initializer,
    saltNonce: 0,
    proxyCreationCode: PROXY_CREATION_CODE,
  });

  assert.notEqual(address, VERIFIED_PARAMS.safeAddress);
});
