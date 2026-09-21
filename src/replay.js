import { ethers } from "ethers";
import { calculateProxyAddress } from "./create2.js";
import { isBroadcastEnabled } from "./broadcast.js";
import { PROXY_FACTORY_ABI } from "./constants.js";

export async function proveCreate2({
  provider,
  factory,
  singleton,
  initializer,
  saltNonce,
  expectedAddress,
}) {
  const factoryContract = new ethers.Contract(factory, PROXY_FACTORY_ABI, provider);
  const proxyCreationCode = await factoryContract.proxyCreationCode();
  const calculated = calculateProxyAddress({
    factory,
    singleton,
    initializer,
    saltNonce,
    proxyCreationCode,
  });

  if (
    expectedAddress &&
    calculated.toLowerCase() !== expectedAddress.toLowerCase()
  ) {
    return {
      ok: false,
      calculated,
      expectedAddress,
      proxyCreationCode,
      error: `CREATE2 mismatch: expected ${expectedAddress}, got ${calculated}`,
    };
  }

  return { ok: true, calculated, proxyCreationCode };
}

export async function replayCreateProxyWithNonce({
  provider,
  wallet,
  factory,
  singleton,
  initializer,
  saltNonce,
  expectedAddress,
  explorer,
  nativeSymbol = "ETH",
  broadcast = isBroadcastEnabled(),
}) {
  if (expectedAddress) {
    const existing = await provider.getCode(expectedAddress);
    if (existing !== "0x") {
      return {
        success: true,
        alreadyExists: true,
        safeAddress: expectedAddress,
      };
    }
  }

  const proof = await proveCreate2({
    provider,
    factory,
    singleton,
    initializer,
    saltNonce,
    expectedAddress,
  });
  if (!proof.ok) {
    return { success: false, error: proof.error, got: proof.calculated };
  }

  const target = expectedAddress || proof.calculated;
  const factoryContract = new ethers.Contract(
    factory,
    PROXY_FACTORY_ABI,
    wallet ?? provider
  );

  let gasEstimate;
  try {
    gasEstimate = await factoryContract.createProxyWithNonce.estimateGas(
      singleton,
      initializer,
      saltNonce
    );
  } catch (error) {
    return {
      success: false,
      error: `gas estimation failed: ${error.message}`,
      calculated: proof.calculated,
    };
  }

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 0n;
  const estimatedCost = gasEstimate * gasPrice;

  if (!broadcast) {
    return {
      success: true,
      dryRun: true,
      safeAddress: target,
      calculated: proof.calculated,
      gasEstimate: gasEstimate.toString(),
      estimatedCostWei: estimatedCost.toString(),
      nativeSymbol,
    };
  }

  if (!wallet) {
    return {
      success: false,
      error: "BROADCAST=1 requires DEPLOYER_PRIVATE_KEY",
    };
  }

  const tx = await factoryContract.createProxyWithNonce(
    singleton,
    initializer,
    saltNonce,
    { gasLimit: (gasEstimate * 130n) / 100n }
  );
  const receipt = await tx.wait();

  let proxyAddress = null;
  for (const log of receipt.logs) {
    try {
      const parsed = factoryContract.interface.parseLog({
        topics: log.topics,
        data: log.data,
      });
      if (parsed?.name === "ProxyCreation") {
        proxyAddress = parsed.args.proxy;
      }
    } catch {
      // ignore unrelated logs
    }
  }

  const deployed = proxyAddress || target;
  return {
    success: true,
    safeAddress: deployed,
    calculated: proof.calculated,
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    explorerTx: explorer ? `${explorer}/tx/${tx.hash}` : undefined,
  };
}

export async function walletFromEnv(provider) {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey || privateKey === "your_private_key_here") {
    return null;
  }
  return new ethers.Wallet(privateKey, provider);
}
