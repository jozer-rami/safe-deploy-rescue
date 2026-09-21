/**
 * Safe v1.3.0 Contract Addresses
 * These are deployed at the same addresses across all EVM chains
 * via CREATE2 deterministic deployment
 */
export const SAFE_CONTRACTS = {
  // GnosisSafeProxyFactory v1.3.0
  PROXY_FACTORY: "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
  
  // GnosisSafe singleton (implementation) v1.3.0
  SAFE_SINGLETON: "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552",
  
  // GnosisSafeL2 singleton v1.3.0 (for L2 chains - alternative)
  SAFE_SINGLETON_L2: "0x3E5c63644E683549055b9Be8653de26E0B4CD36E",
  
  // CompatibilityFallbackHandler v1.3.0
  FALLBACK_HANDLER: "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4",
  
  // MultiSend v1.3.0
  MULTI_SEND: "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761",
  
  // MultiSendCallOnly v1.3.0
  MULTI_SEND_CALL_ONLY: "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
};

/**
 * Chain configurations
 */
export const CHAINS = {
  GNOSIS: {
    chainId: 100,
    name: "Gnosis Chain",
    rpc: "https://rpc.gnosischain.com",
    explorer: "https://gnosisscan.io",
    blockscoutApi: "https://gnosis.blockscout.com/api/v2",
  },
  POLYGON: {
    chainId: 137,
    name: "Polygon PoS",
    rpc: "https://polygon-rpc.com",
    explorer: "https://polygonscan.com",
    blockscoutApi: "https://polygon.blockscout.com/api/v2",
  },
  ETHEREUM: {
    chainId: 1,
    name: "Ethereum",
    rpc: "https://ethereum.publicnode.com",
    explorer: "https://etherscan.io",
  },
  FLARE: {
    chainId: 14,
    name: "Flare",
    rpc: "https://flare-api.flare.network/ext/C/rpc",
    explorer: "https://flare-explorer.flare.network",
  },
};

/**
 * Safe v1.3.0 ABI fragments for the functions we need
 */
export const SAFE_ABI = [
  // GnosisSafe setup function
  "function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external",
  
  // Getters
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function VERSION() view returns (string)",
  "function nonce() view returns (uint256)",
  
  // Events
  "event SafeSetup(address indexed initiator, address[] owners, uint256 threshold, address initializer, address fallbackHandler)",
];

export const PROXY_FACTORY_ABI = [
  // Create functions
  "function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) returns (address proxy)",
  "function createProxyWithCallback(address _singleton, bytes memory initializer, uint256 saltNonce, address callback) returns (address proxy)",
  "function calculateCreateProxyWithNonceAddress(address _singleton, bytes memory initializer, uint256 saltNonce) returns (address proxy)",
  
  // Getters
  "function proxyCreationCode() pure returns (bytes)",
  
  // Events
  "event ProxyCreation(address proxy, address singleton)",
];

/**
 * GnosisSafeProxy creation code returned by ProxyFactory v1.3.0
 * (0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2). Deploy scripts should
 * still call factory.proxyCreationCode() on the target chain.
 */
export const PROXY_CREATION_CODE =
  "0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea2646970667358221220d1429297349653a4918076d650332de1a1068c5f3e07c5c82360c277770b955264736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564";

