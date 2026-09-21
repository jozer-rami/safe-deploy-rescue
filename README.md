# Safe Deploy Rescue

Replay a Gnosis Safe `createProxyWithNonce` call so the Safe is created at the **same CREATE2 address** on another EVM chain.

This is a small toolkit, not a general Safe product. Official tools for the same job include [safe-cli](https://github.com/safe-global/safe-cli), the Protocol Kit, and Safe Wallet.

## How it works

Safe proxies are deployed with CREATE2:

```
address = keccak256(0xff ++ factory ++ salt ++ keccak256(initCode))[12:]
salt    = keccak256(keccak256(initializer) ++ saltNonce)
initCode = proxyCreationCode ++ abi.encode(singleton)
```

The initializer is the original `setup()` call. **Original owners win.** Anyone can pay gas to replay the same tuple; the deployer does not become an owner.

Do not rebuild the initializer from live `getOwners()`. If owners changed after creation, that produces a different address.

## Requirements

- Node 18+
- A creation transaction whose **input data** is `createProxyWithNonce` (the factory call, not an outer relayer tx)
- Safe factory and singleton already deployed on the target chain
- For a real send: a funded EOA and `BROADCAST=1`

```bash
git clone https://github.com/jozer-rami/safe-deploy-rescue.git
cd safe-deploy-rescue
npm install
cp .env.example .env
```

Fill `.env`: `SOURCE_RPC_URL`, `TARGET_RPC_URL`, `CREATION_TX_HASH`, `SAFE_ADDRESS`, and (for a live send) `DEPLOYER_PRIVATE_KEY`. Explorer keys in `.env.example` are optional; the scripts use RPCs.

Agents working in this repo: see [AGENTS.md](AGENTS.md).

## Usage

Deploys are **dry-run** unless you set `BROADCAST=1`.

### 1. Extract original CREATE2 inputs

```bash
npm run extract
```

Or without `.env`:

```bash
SOURCE_RPC_URL=https://rpc.gnosischain.com \
CREATION_TX_HASH=0x... \
SAFE_ADDRESS=0x... \
npm run extract
```

This decodes `singleton`, `initializer`, and `saltNonce` from the factory transaction and proves the CREATE2 address.

On an explorer, open the Safe’s **internal transactions** and use the tx that calls `ProxyFactory.createProxyWithNonce`.

### 2. Replay on the target chain

```bash
npm run full-rescue
```

Send the transaction:

```bash
BROADCAST=1 npm run full-rescue
```

The deployer only pays gas. It does not become an owner.

### 3. Verify live config

```bash
SAFE_ADDRESS=0x... \
SOURCE_RPC_URL=https://rpc.gnosischain.com \
TARGET_RPC_URL=https://polygon-rpc.com \
npm run verify
```

Live owners can differ across chains if the Safe was mutated after creation. Replay always uses the **creation** setup.

### Small-nonce fallback

`npm run find-nonce` brute-forces `saltNonce` in `0..1_000_000`. It cannot find a 256-bit salt. Prefer the creation transaction.

## Worked examples

These scripts replay documented rescues. They still dry-run unless `BROADCAST=1`.

| Script | What it replays |
|---|---|
| `npm run deploy:polygon` | Gnosis → Polygon v1.3.0 `0xe57174…f415` |
| `npm run deploy:flare` | Ethereum → Flare v1.4.1 Safes (SafeToL2Setup rewrites the singleton on Flare) |
| `npm run deploy:flare-batch` | Additional Ethereum Safes onto Flare using original setup |

`deploy:polygon` only accepts that example address. For any other Safe, use `extract` / `full-rescue`.

## Security

- Never commit `.env` or a private key.
- Use a fresh deployer wallet. It only pays gas.
- On Safe v1.4.1, `SafeToL2Setup` rewrites L1 singleton → SafeL2 when `chainId != 1`.
- See [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
