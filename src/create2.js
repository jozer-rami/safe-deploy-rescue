import { ethers } from "ethers";

/**
 * Safe proxy CREATE2 address:
 * keccak256(0xff ++ factory ++ salt ++ keccak256(initCode))[12:]
 * salt = keccak256(keccak256(initializer) ++ saltNonce)
 * initCode = proxyCreationCode ++ abi.encode(singleton)
 */
export function calculateProxyAddress({
  factory,
  singleton,
  initializer,
  saltNonce,
  proxyCreationCode,
}) {
  const singletonEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address"],
    [singleton]
  );
  const deploymentCode = ethers.concat([proxyCreationCode, singletonEncoded]);
  const initializerHash = ethers.keccak256(initializer);
  const salt = ethers.keccak256(
    ethers.concat([
      initializerHash,
      ethers.zeroPadValue(ethers.toBeHex(saltNonce), 32),
    ])
  );
  const initCodeHash = ethers.keccak256(deploymentCode);
  const create2Input = ethers.concat(["0xff", factory, salt, initCodeHash]);
  return ethers.getAddress("0x" + ethers.keccak256(create2Input).slice(-40));
}

/**
 * Brute-force saltNonce in [0, maxNonce]. Cannot find a 256-bit salt.
 * Prefer decodeCreateProxyWithNonce on the original creation transaction.
 */
export function searchSaltNonce({
  factory,
  singleton,
  initializer,
  targetAddress,
  proxyCreationCode,
  maxNonce = 1_000_000n,
}) {
  const target = targetAddress.toLowerCase();
  for (let nonce = 0n; nonce <= maxNonce; nonce++) {
    const calculated = calculateProxyAddress({
      factory,
      singleton,
      initializer,
      saltNonce: nonce,
      proxyCreationCode,
    });
    if (calculated.toLowerCase() === target) {
      return nonce;
    }
  }
  return null;
}
