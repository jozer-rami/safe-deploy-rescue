/**
 * Decode original Safe CREATE2 inputs from the factory creation transaction.
 *
 *   SOURCE_RPC_URL=... CREATION_TX_HASH=0x... npm run extract
 *
 * Optional SAFE_ADDRESS is checked against the ProxyCreation event and CREATE2.
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { CHAINS, SAFE_ABI } from "./constants.js";
import { decodeCreateProxyWithNonce } from "./decode-creation.js";
import { proveCreate2 } from "./replay.js";

dotenv.config();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

async function extractSafeParams() {
  const creationTxHash = requiredEnv("CREATION_TX_HASH");
  const rpc =
    process.env.SOURCE_RPC_URL ||
    process.env.GNOSIS_RPC_URL ||
    CHAINS.GNOSIS.rpc;
  const expectedSafe = process.env.SAFE_ADDRESS;

  const provider = new ethers.JsonRpcProvider(rpc);
  const tx = await provider.getTransaction(creationTxHash);
  if (!tx) {
    console.error(`Transaction not found: ${creationTxHash}`);
    process.exit(1);
  }

  const receipt = await provider.getTransactionReceipt(creationTxHash);
  const decoded = decodeCreateProxyWithNonce(tx.data);
  const factory = ethers.getAddress(tx.to);

  console.log("Creation transaction");
  console.log(`  hash:      ${creationTxHash}`);
  console.log(`  factory:   ${factory}`);
  console.log(`  singleton: ${decoded.singleton}`);
  console.log(`  saltNonce: ${decoded.saltNonce}`);
  console.log(`  initializer: ${decoded.initializer.slice(0, 66)}...`);

  const proof = await proveCreate2({
    provider,
    factory,
    singleton: decoded.singleton,
    initializer: decoded.initializer,
    saltNonce: decoded.saltNonce,
    expectedAddress: expectedSafe,
  });

  if (!proof.ok) {
    console.error(proof.error);
    process.exit(1);
  }

  console.log(`  CREATE2:   ${proof.calculated}`);

  if (receipt) {
    const safeInterface = new ethers.Interface(SAFE_ABI);
    for (const log of receipt.logs) {
      try {
        const parsed = safeInterface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (parsed?.name === "SafeSetup") {
          console.log("SafeSetup at creation (original owners)");
          console.log(`  owners:    ${parsed.args.owners.join(", ")}`);
          console.log(`  threshold: ${parsed.args.threshold}`);
        }
      } catch {
        // ignore
      }
    }
  }

  if (expectedSafe) {
    const safe = new ethers.Contract(expectedSafe, SAFE_ABI, provider);
    try {
      const [owners, threshold, version] = await Promise.all([
        safe.getOwners(),
        safe.getThreshold(),
        safe.VERSION(),
      ]);
      console.log("Current on-chain config (may differ from creation)");
      console.log(`  version:   ${version}`);
      console.log(`  threshold: ${threshold}`);
      console.log(`  owners:    ${owners.join(", ")}`);
    } catch (error) {
      console.warn(`Could not read live Safe config: ${error.message}`);
    }
  }

  const params = {
    safeAddress: proof.calculated,
    factory,
    singleton: decoded.singleton,
    initializer: decoded.initializer,
    saltNonce: decoded.saltNonce,
    creationTxHash,
  };
  console.log(JSON.stringify(params, null, 2));
  return params;
}

extractSafeParams().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

export { extractSafeParams };
