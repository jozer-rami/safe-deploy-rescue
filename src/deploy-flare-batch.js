/**
 * Recreate additional Ethereum Safes on Flare from original CREATE2 params.
 * Dry-run by default. Send with BROADCAST=1.
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { CHAINS, SAFE_ABI } from "./constants.js";
import { isBroadcastEnabled } from "./broadcast.js";
import {
  replayCreateProxyWithNonce,
  walletFromEnv,
} from "./replay.js";

dotenv.config();

const SAFES = [
  {
    name: "v1.3.0 (original setup was 2 owners)",
    safeAddress: "0x4C9EbBfc396cD27b3396C9247eFEa3b10e31331C",
    factory: "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
    singleton: "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552",
    expectedSingletonAfterSetup: "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552",
    saltNonce: "0",
    ownersAtCreation: [
      "0x6283FcC112242B125CD219af4d8cbfA7Dc2DC0dA",
      "0x6f83fa59Ee7f9d604D0F3905e0D4490b21CfE239",
    ],
    initializer:
      "0xb63e800d0000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000f48f2b2d2a534e402487b3ee7c18c33aec0fe5e400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000006283fcc112242b125cd219af4d8cbfa7dc2dc0da0000000000000000000000006f83fa59ee7f9d604d0f3905e0d4490b21cfe2390000000000000000000000000000000000000000000000000000000000000000",
    creationTxHash:
      "0x2558182f82357b8bdce52d8be27e459722036febcac85c0f839a0817380347ec",
  },
  {
    name: "v1.4.1 1-of-1",
    safeAddress: "0x5B4e748982216906CD6cfaCE4Ebb816EA4a632D9",
    factory: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
    singleton: "0x41675C099F32341bf84BFc5382aF534df5C7461a",
    expectedSingletonAfterSetup: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
    saltNonce: "0",
    ownersAtCreation: ["0xDdBea9f7a3344dD3f3FafBf3C5C892B4Ece1A45D"],
    initializer:
      "0xb63e800d00000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000bd89a1ce4dde368ffab0ec35506eece0b1ffdc540000000000000000000000000000000000000000000000000000000000000140000000000000000000000000fd0732dc9e303f09fcef3a7388ad10a83459ec99000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005afe7a11e70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000ddbea9f7a3344dd3f3fafbf3c5c892b4ece1a45d0000000000000000000000000000000000000000000000000000000000000024fe51f64300000000000000000000000029fcb43b46531bca003ddc8fcb67ffe91900c76200000000000000000000000000000000000000000000000000000000",
    creationTxHash:
      "0xa2099ae301a98bea75f0f7dcbbfa42ccdf5caab8f6a43f33c0b3ce84908d175a",
  },
];

async function printSafeConfig(provider, params) {
  const safe = new ethers.Contract(params.safeAddress, SAFE_ABI, provider);
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
}

async function main() {
  const rpc = process.env.FLARE_RPC_URL || CHAINS.FLARE.rpc;
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = await walletFromEnv(provider);
  const broadcast = isBroadcastEnabled();

  console.log("Flare batch (original creation params)");
  console.log(`Broadcast: ${broadcast}`);

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

  const results = [];
  for (const params of SAFES) {
    console.log(`\n${params.name}`);
    console.log(params.safeAddress);
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
    results.push({ ...params, ...result });
    if (!result.success) {
      console.error(result.error);
      continue;
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

  if (results.some((r) => !r.success)) process.exit(1);
  if (!broadcast) {
    console.log("\nSet BROADCAST=1 DEPLOYER_PRIVATE_KEY=0x... to send.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
