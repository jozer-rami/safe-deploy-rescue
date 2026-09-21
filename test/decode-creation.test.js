import { test } from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { PROXY_FACTORY_ABI } from "../src/constants.js";
import { decodeCreateProxyWithNonce } from "../src/decode-creation.js";
import { VERIFIED_PARAMS } from "../src/verified-params.js";

test("decodes createProxyWithNonce singleton, initializer, and saltNonce", () => {
  const iface = new ethers.Interface(PROXY_FACTORY_ABI);
  const data = iface.encodeFunctionData("createProxyWithNonce", [
    VERIFIED_PARAMS.singleton,
    VERIFIED_PARAMS.initializer,
    VERIFIED_PARAMS.saltNonce,
  ]);

  const decoded = decodeCreateProxyWithNonce(data);

  assert.equal(ethers.getAddress(decoded.singleton), VERIFIED_PARAMS.singleton);
  assert.equal(decoded.initializer.toLowerCase(), VERIFIED_PARAMS.initializer.toLowerCase());
  assert.equal(decoded.saltNonce, VERIFIED_PARAMS.saltNonce);
});

test("rejects calldata that is not createProxyWithNonce", () => {
  const iface = new ethers.Interface(PROXY_FACTORY_ABI);
  const data = iface.encodeFunctionData("proxyCreationCode", []);

  assert.throws(() => decodeCreateProxyWithNonce(data), /createProxyWithNonce/);
});
