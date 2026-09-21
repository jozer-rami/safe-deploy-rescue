/**
 * Compare a Safe's live config on two chains.
 *
 *   SAFE_ADDRESS=0x... SOURCE_RPC_URL=... TARGET_RPC_URL=... npm run verify
 *
 * Live owners can differ from creation if the Safe was mutated on one chain.
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { CHAINS, SAFE_ABI } from "./constants.js";

dotenv.config();

async function getSafeConfig(provider, address) {
  const code = await provider.getCode(address);
  if (code === "0x") return null;

  const safe = new ethers.Contract(address, SAFE_ABI, provider);
  try {
    const [owners, threshold, version] = await Promise.all([
      safe.getOwners(),
      safe.getThreshold(),
      safe.VERSION(),
    ]);
    return {
      exists: true,
      owners: owners.map((o) => o.toLowerCase()),
      threshold: Number(threshold),
      version,
    };
  } catch (error) {
    return { exists: true, error: error.message };
  }
}

function compareConfigs(source, target) {
  if (!source || !target) {
    return { match: false, reason: "One or both Safes are not deployed" };
  }
  if (source.error || target.error) {
    return { match: false, reason: "Error reading Safe config" };
  }

  const issues = [];
  if (source.version !== target.version) {
    issues.push(`Version mismatch: ${source.version} vs ${target.version}`);
  }
  if (source.threshold !== target.threshold) {
    issues.push(
      `Threshold mismatch: ${source.threshold} vs ${target.threshold}`
    );
  }
  if (source.owners.length !== target.owners.length) {
    issues.push(
      `Owner count mismatch: ${source.owners.length} vs ${target.owners.length}`
    );
  } else {
    const a = [...source.owners].sort();
    const b = [...target.owners].sort();
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      issues.push("Owners do not match");
    }
  }

  return { match: issues.length === 0, issues };
}

function printConfig(label, config) {
  console.log(label);
  if (!config) {
    console.log("  not deployed");
    return;
  }
  if (config.error) {
    console.log(`  error: ${config.error}`);
    return;
  }
  console.log(`  version:   ${config.version}`);
  console.log(`  threshold: ${config.threshold}`);
  console.log(`  owners:    ${config.owners.join(", ")}`);
}

async function verifyDeployment() {
  const safeAddress = process.env.SAFE_ADDRESS;
  if (!safeAddress) {
    console.error("Set SAFE_ADDRESS");
    process.exit(1);
  }

  const sourceRpc =
    process.env.SOURCE_RPC_URL ||
    process.env.GNOSIS_RPC_URL ||
    CHAINS.GNOSIS.rpc;
  const targetRpc =
    process.env.TARGET_RPC_URL ||
    process.env.POLYGON_RPC_URL ||
    CHAINS.POLYGON.rpc;

  const source = new ethers.JsonRpcProvider(sourceRpc);
  const target = new ethers.JsonRpcProvider(targetRpc);

  console.log(`Safe ${safeAddress}`);
  const [sourceConfig, targetConfig] = await Promise.all([
    getSafeConfig(source, safeAddress),
    getSafeConfig(target, safeAddress),
  ]);

  printConfig("Source", sourceConfig);
  printConfig("Target", targetConfig);

  const comparison = compareConfigs(sourceConfig, targetConfig);
  if (comparison.match) {
    console.log("Live configs match.");
  } else {
    console.log("Live configs differ (expected if owners changed after creation).");
    if (comparison.reason) console.log(`  ${comparison.reason}`);
    for (const issue of comparison.issues || []) console.log(`  ${issue}`);
  }

  return {
    source: sourceConfig,
    target: targetConfig,
    match: comparison.match,
    issues: comparison.issues || [],
  };
}

const isCli = process.argv[1]?.endsWith("verify-deployment.js");
if (isCli) {
  verifyDeployment().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { verifyDeployment, getSafeConfig, compareConfigs };
