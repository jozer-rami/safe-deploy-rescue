/**
 * Decode the original factory creation tx, prove the CREATE2 address,
 * and replay createProxyWithNonce on the target chain.
 *
 * Dry-run by default. Example:
 *   CREATION_TX_HASH=0x... SOURCE_RPC_URL=... TARGET_RPC_URL=... npm run full-rescue
 *   BROADCAST=1 DEPLOYER_PRIVATE_KEY=0x... npm run full-rescue
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { CHAINS } from "./constants.js";
import { decodeCreateProxyWithNonce } from "./decode-creation.js";
import { isBroadcastEnabled } from "./broadcast.js";
import {
  proveCreate2,
  replayCreateProxyWithNonce,
  walletFromEnv,
} from "./replay.js";

dotenv.config();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

async function fullRescue() {
  const creationTxHash = requiredEnv("CREATION_TX_HASH");
  const sourceRpc =
    process.env.SOURCE_RPC_URL ||
    process.env.GNOSIS_RPC_URL ||
    CHAINS.GNOSIS.rpc;
  const targetRpc =
    process.env.TARGET_RPC_URL ||
    process.env.POLYGON_RPC_URL ||
    CHAINS.POLYGON.rpc;
  const explorer =
    process.env.TARGET_EXPLORER || CHAINS.POLYGON.explorer;
  const broadcast = isBroadcastEnabled();

  const source = new ethers.JsonRpcProvider(sourceRpc);
  const target = new ethers.JsonRpcProvider(targetRpc);

  const tx = await source.getTransaction(creationTxHash);
  if (!tx) {
    console.error(`Creation tx not found: ${creationTxHash}`);
    process.exit(1);
  }

  const decoded = decodeCreateProxyWithNonce(tx.data);
  const factory = ethers.getAddress(tx.to);
  const expected = process.env.SAFE_ADDRESS;

  const sourceProof = await proveCreate2({
    provider: source,
    factory,
    singleton: decoded.singleton,
    initializer: decoded.initializer,
    saltNonce: decoded.saltNonce,
    expectedAddress: expected,
  });
  if (!sourceProof.ok) {
    console.error(sourceProof.error);
    process.exit(1);
  }

  const safeAddress = expected || sourceProof.calculated;
  console.log("Original CREATE2 inputs");
  console.log(`  factory:    ${factory}`);
  console.log(`  singleton:  ${decoded.singleton}`);
  console.log(`  saltNonce:  ${decoded.saltNonce}`);
  console.log(`  CREATE2:    ${sourceProof.calculated}`);
  console.log(`  broadcast:  ${broadcast}`);

  const wallet = await walletFromEnv(target);
  if (broadcast && !wallet) {
    console.error("BROADCAST=1 requires DEPLOYER_PRIVATE_KEY");
    process.exit(1);
  }
  if (wallet) {
    const balance = await target.getBalance(wallet.address);
    console.log(`  deployer:   ${wallet.address}`);
    console.log(`  balance:    ${ethers.formatEther(balance)}`);
  }

  const result = await replayCreateProxyWithNonce({
    provider: target,
    wallet,
    factory,
    singleton: decoded.singleton,
    initializer: decoded.initializer,
    saltNonce: decoded.saltNonce,
    expectedAddress: safeAddress,
    explorer,
    broadcast,
  });

  if (!result.success) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.alreadyExists) {
    console.log(`Already deployed at ${result.safeAddress}`);
    return result;
  }
  if (result.dryRun) {
    console.log(`Dry-run OK. CREATE2 ${result.calculated}.`);
    console.log("Set BROADCAST=1 DEPLOYER_PRIVATE_KEY=0x... to send.");
    return result;
  }

  console.log(`Deployed ${result.safeAddress}`);
  console.log(`Tx ${result.transactionHash}`);
  return result;
}

fullRescue().catch((error) => {
  console.error(error);
  process.exit(1);
});

export { fullRescue };
