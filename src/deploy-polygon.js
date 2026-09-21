/**
 * Replay the documented Gnosis → Polygon v1.3.0 example
 * (0xe57174Db978E2F7e504a54DCD8029577C928f415).
 *
 * Dry-run by default. Send with:
 *   BROADCAST=1 DEPLOYER_PRIVATE_KEY=0x... npm run deploy:polygon
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { CHAINS } from "./constants.js";
import { VERIFIED_PARAMS } from "./verified-params.js";
import { isBroadcastEnabled } from "./broadcast.js";
import {
  replayCreateProxyWithNonce,
  walletFromEnv,
} from "./replay.js";

dotenv.config();

async function deployToPolygon() {
  const expected = VERIFIED_PARAMS.safeAddress;
  if (
    process.env.SAFE_ADDRESS &&
    process.env.SAFE_ADDRESS.toLowerCase() !== expected.toLowerCase()
  ) {
    console.error(
      "deploy:polygon replays the documented Gnosis→Polygon example only " +
        `(${expected}). For another Safe, set CREATION_TX_HASH and run npm run full-rescue.`
    );
    process.exit(1);
  }

  const rpc = process.env.POLYGON_RPC_URL || CHAINS.POLYGON.rpc;
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = await walletFromEnv(provider);
  const broadcast = isBroadcastEnabled();

  console.log("Gnosis → Polygon v1.3.0 example");
  console.log(`Safe:      ${expected}`);
  console.log(`Broadcast: ${broadcast}`);

  if (wallet) {
    const [balance, network] = await Promise.all([
      provider.getBalance(wallet.address),
      provider.getNetwork(),
    ]);
    console.log(`Chain:     ${network.chainId}`);
    console.log(`Deployer:  ${wallet.address}`);
    console.log(`Balance:   ${ethers.formatEther(balance)} POL`);
  } else if (broadcast) {
    console.error("BROADCAST=1 requires DEPLOYER_PRIVATE_KEY");
    process.exit(1);
  }

  const result = await replayCreateProxyWithNonce({
    provider,
    wallet,
    factory: VERIFIED_PARAMS.factory,
    singleton: VERIFIED_PARAMS.singleton,
    initializer: VERIFIED_PARAMS.initializer,
    saltNonce: VERIFIED_PARAMS.saltNonce,
    expectedAddress: expected,
    explorer: CHAINS.POLYGON.explorer,
    nativeSymbol: "POL",
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
  if (result.explorerTx) console.log(result.explorerTx);
  return result;
}

deployToPolygon().catch((error) => {
  console.error(error);
  process.exit(1);
});

export { deployToPolygon };
