import { ethers } from "ethers";
import { PROXY_FACTORY_ABI } from "./constants.js";

const factoryInterface = new ethers.Interface(PROXY_FACTORY_ABI);

/**
 * Decode a SafeProxyFactory.createProxyWithNonce call from transaction input.
 * The creation tx must be the factory call itself (not an outer relayer tx).
 */
export function decodeCreateProxyWithNonce(data) {
  let parsed;
  try {
    parsed = factoryInterface.parseTransaction({ data });
  } catch (error) {
    throw new Error(
      `Transaction input is not a ProxyFactory call: ${error.message}`
    );
  }

  if (!parsed || parsed.name !== "createProxyWithNonce") {
    throw new Error(
      `Expected createProxyWithNonce, got ${parsed?.name ?? "unknown method"}. ` +
        "Pass the factory creation transaction, not an outer relayer tx."
    );
  }

  return {
    singleton: ethers.getAddress(parsed.args._singleton),
    initializer: parsed.args.initializer,
    saltNonce: parsed.args.saltNonce.toString(),
  };
}
