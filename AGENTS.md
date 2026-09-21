# Agent notes

Toolkit to replay Safe `createProxyWithNonce` so a proxy is created at the same CREATE2 address on another chain.

## Do not

- Commit `.env` or print `DEPLOYER_PRIVATE_KEY`.
- Rebuild the initializer from live `getOwners()`. Owners can change after creation; the address is fixed by the original `setup()`.
- Broadcast by default. Scripts dry-run unless `BROADCAST=1`.
- Treat `npm run find-nonce` as the recovery path. It only searches `0..1e6` and uses v1.3.0 proxy bytecode unless you override it.

## Run a rescue

1. `cp .env.example .env` and fill `SOURCE_RPC_URL`, `TARGET_RPC_URL`, `CREATION_TX_HASH`, `SAFE_ADDRESS`.
2. `CREATION_TX_HASH` must be the **factory** transaction (`createProxyWithNonce` in `tx.data`), not an outer relayer/Safe-UI tx.
3. Prove params: `npm run extract`
4. Dry-run replay: `npm run full-rescue`
5. Live send (funded deployer EOA, not an owner): `BROADCAST=1 npm run full-rescue`

Worked examples (still dry-run unless `BROADCAST=1`): `npm run deploy:polygon`, `npm run deploy:flare`, `npm run deploy:flare-batch`. `deploy:polygon` only accepts the documented Gnosis→Polygon example address.

## Tests

```bash
npm test
```

`npm test` is offline. Deploy scripts need RPC access.

## Humans

Step-by-step for people: [README.md](README.md). Security model: [SECURITY.md](SECURITY.md).
