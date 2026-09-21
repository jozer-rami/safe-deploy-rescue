/**
 * Replay Ethereum v1.4.1 Safes onto Flare at the same CREATE2 addresses.
 * On Flare, SafeToL2Setup.setupToL2() rewrites the singleton to SafeL2.
 *
 * Dry-run by default:
 *   npm run deploy:flare
 * Send:
 *   BROADCAST=1 DEPLOYER_PRIVATE_KEY=0x... npm run deploy:flare
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { CHAINS, SAFE_ABI } from "./constants.js";
import { SAFES, SHARED, paramsFor } from "./verified-params-flare.js";
import { isBroadcastEnabled } from "./broadcast.js";
import {
  replayCreateProxyWithNonce,
  walletFromEnv,
} from "./replay.js";

dotenv.config();

async function printSafeConfig(provider, params) {
  const safe = new ethers.Contract(params.safeAddress, SAFE_ABI, provider);
  try {
    const [owners, threshold, version, singletonSlot] = await Promise.all([
      safe.getOwners(),
      safe.getThreshold(),
      safe.VERSION(),
      provider.getStorage(params.safeAddress, 0),
    ]);
    const singleton = ethers.getAddress("0x" + singletonSlot.slice(-40));
    console.log(`  version:   ${version}`);
    console.log(`  singleton: ${singleton}`);
    console.log(`  threshold: ${threshold}`);
    console.log(`  owners:    ${owners.join(", ")}`);
    const ownerMatch =
      owners.length === params.owners.length &&
      owners.every(
        (o, i) => o.toLowerCase() === params.owners[i].toLowerCase()
      ) &&
      Number(threshold) === params.threshold;
    const l2Match =
      singleton.toLowerCase() === params.singletonL2.toLowerCase();
    console.log(`  owners match: ${ownerMatch}`);
    console.log(`  SafeL2:       ${l2Match}`);
  } catch (error) {
    console.warn(`Could not read Safe config: ${error.message}`);
  }
}

async function deployToFlare() {
  const rpc = process.env.FLARE_RPC_URL || CHAINS.FLARE.rpc;
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = await walletFromEnv(provider);
  const broadcast = isBroadcastEnabled();

  console.log("Ethereum → Flare v1.4.1 examples");
  console.log(`Broadcast: ${broadcast}`);
  for (const s of SAFES) {
    console.log(`  ${s.safeAddress}  saltNonce=${s.saltNonce}`);
  }

  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(CHAINS.FLARE.chainId)) {
    console.error(`Wrong chain. Expected 14, got ${network.chainId}`);
    process.exit(1);
  }

  if (wallet) {
    const balance = await provider.getBalance(wallet.address);
    console.log(`Deployer: ${wallet.address}`);
    console.log(`Balance:  ${ethers.formatEther(balance)} FLR`);
  } else if (broadcast) {
    console.error("BROADCAST=1 requires DEPLOYER_PRIVATE_KEY");
    process.exit(1);
  }

  for (const [label, address] of [
    ["ProxyFactory", SHARED.factory],
    ["Safe singleton", SHARED.singleton],
    ["SafeL2", SHARED.singletonL2],
    ["FallbackHandler", SHARED.fallbackHandler],
    ["SafeToL2Setup", SHARED.safeToL2Setup],
  ]) {
    const code = await provider.getCode(address);
    if (code === "0x") {
      console.error(`${label} not found at ${address}`);
      process.exit(1);
    }
  }

  const results = [];
  for (const safe of SAFES) {
    const params = paramsFor(safe);
    console.log(`\n${params.safeAddress}`);
    const result = await replayCreateProxyWithNonce({
      provider,
      wallet,
      factory: params.factory,
      singleton: params.singleton,
      initializer: params.initializer,
      saltNonce: params.saltNonce,
      expectedAddress: params.safeAddress,
      explorer: CHAINS.FLARE.explorer,
      nativeSymbol: "FLR",
      broadcast,
    });
    results.push({ ...safe, ...result });
    if (!result.success) {
      console.error(result.error);
      break;
    }
    if (result.alreadyExists) {
      console.log("Already deployed.");
      await printSafeConfig(provider, params);
    } else if (result.dryRun) {
      console.log(`Dry-run OK. CREATE2 ${result.calculated}.`);
    } else {
      console.log(`Deployed tx ${result.transactionHash}`);
      await printSafeConfig(provider, params);
    }
  }

  const failed = results.filter((r) => !r.success);
  if (failed.length) process.exit(1);
  if (!broadcast) {
    console.log("\nSet BROADCAST=1 DEPLOYER_PRIVATE_KEY=0x... to send.");
  }
}

deployToFlare().catch((error) => {
  console.error(error);
  process.exit(1);
});
