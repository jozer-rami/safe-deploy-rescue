/**
 * Fallback: brute-force a small saltNonce.
 *
 * This cannot find a 256-bit salt. Prefer:
 *   CREATION_TX_HASH=0x... npm run extract
 *
 *   SAFE_ADDRESS=0x... INITIALIZER=0x... npm run find-nonce
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { SAFE_CONTRACTS, SAFE_ABI, PROXY_CREATION_CODE } from "./constants.js";
import { calculateProxyAddress, searchSaltNonce } from "./create2.js";
import { decodeCreateProxyWithNonce } from "./decode-creation.js";

dotenv.config();

export { calculateProxyAddress, searchSaltNonce };

export function buildInitializer(owners, threshold, fallbackHandler) {
  const safeInterface = new ethers.Interface(SAFE_ABI);
  return safeInterface.encodeFunctionData("setup", [
    owners,
    threshold,
    ethers.ZeroAddress,
    "0x",
    fallbackHandler,
    ethers.ZeroAddress,
    0,
    ethers.ZeroAddress,
  ]);
}

async function main() {
  if (process.env.CREATION_TX_HASH && process.env.SOURCE_RPC_URL) {
    console.log(
      "CREATION_TX_HASH is set. Decoding the factory call instead of brute-forcing."
    );
    const provider = new ethers.JsonRpcProvider(process.env.SOURCE_RPC_URL);
    const tx = await provider.getTransaction(process.env.CREATION_TX_HASH);
    if (!tx) {
      console.error("Creation transaction not found");
      process.exit(1);
    }
    const decoded = decodeCreateProxyWithNonce(tx.data);
    console.log(JSON.stringify({ factory: tx.to, ...decoded }, null, 2));
    console.log("Use these values with npm run deploy / npm run full-rescue.");
    return;
  }

  const target = process.env.SAFE_ADDRESS;
  const initializer = process.env.INITIALIZER;
  if (!target || !initializer) {
    console.error(
      "Brute-force fallback needs SAFE_ADDRESS and INITIALIZER.\n" +
        "A 256-bit saltNonce will not be found. Decode the creation tx instead:\n" +
        "  CREATION_TX_HASH=0x... SOURCE_RPC_URL=... npm run extract"
    );
    process.exit(1);
  }

  const factory = process.env.FACTORY || SAFE_CONTRACTS.PROXY_FACTORY;
  const singleton = process.env.SINGLETON || SAFE_CONTRACTS.SAFE_SINGLETON;
  const maxNonce = BigInt(process.env.MAX_NONCE || "1000000");

  console.log(
    `Searching saltNonce in 0..${maxNonce} (small nonces only; will not find a 256-bit salt)`
  );

  const found = searchSaltNonce({
    factory,
    singleton,
    initializer,
    targetAddress: target,
    proxyCreationCode: PROXY_CREATION_CODE,
    maxNonce,
  });

  if (found === null) {
    console.error("No match in range. Decode createProxyWithNonce from the creation tx.");
    process.exit(1);
  }

  console.log(`saltNonce: ${found.toString()}`);
  console.log(
    `CREATE2: ${calculateProxyAddress({
      factory,
      singleton,
      initializer,
      saltNonce: found,
      proxyCreationCode: PROXY_CREATION_CODE,
    })}`
  );
}

const isCli = process.argv[1]?.endsWith("find-salt-nonce.js");
if (isCli) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
