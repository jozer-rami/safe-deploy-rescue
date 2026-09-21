/**
 * Replay createProxyWithNonce on a target chain.
 * Used by full-rescue. Dry-run unless BROADCAST=1.
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { CHAINS } from "./constants.js";
import {
  replayCreateProxyWithNonce,
  walletFromEnv,
} from "./replay.js";

dotenv.config();

export async function isContract(provider, address) {
  const code = await provider.getCode(address);
  return code !== "0x";
}

export async function deploySafe(deploymentParams, targetChain = "POLYGON") {
  const chain = CHAINS[targetChain];
  if (!chain) {
    console.error(`Unknown target chain ${targetChain}`);
    return null;
  }

  const rpc =
    process.env.TARGET_RPC_URL ||
    process.env[`${targetChain}_RPC_URL`] ||
    chain.rpc;
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = await walletFromEnv(provider);

  console.log(`Target: ${chain.name} (${chain.chainId})`);
  console.log(`Safe:   ${deploymentParams.safeAddress}`);
  if (wallet) {
    const balance = await provider.getBalance(wallet.address);
    console.log(`Deployer: ${wallet.address}`);
    console.log(`Balance:  ${ethers.formatEther(balance)}`);
  }

  const result = await replayCreateProxyWithNonce({
    provider,
    wallet,
    factory: deploymentParams.factory,
    singleton: deploymentParams.singleton,
    initializer: deploymentParams.initializer,
    saltNonce: deploymentParams.saltNonce,
    expectedAddress: deploymentParams.safeAddress,
    explorer: chain.explorer,
  });

  if (!result.success) {
    console.error(result.error);
    return null;
  }
  if (result.alreadyExists) {
    console.log(`Already deployed at ${result.safeAddress}`);
    return result;
  }
  if (result.dryRun) {
    console.log(
      `Dry-run OK. CREATE2 ${result.calculated}. Set BROADCAST=1 to send.`
    );
    return result;
  }

  console.log(`Deployed ${result.safeAddress}`);
  console.log(`Tx ${result.transactionHash}`);
  return result;
}
