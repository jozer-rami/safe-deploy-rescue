# Security

## Reporting

Email **jose@palmeradao.xyz**. Do not open a public issue for a live private key, API key, or funded deployer.

## CREATE2 replay

Anyone who replays the same `createProxyWithNonce(singleton, initializer, saltNonce)` call on a chain where the Safe factory already exists will deploy **that Safe at the same address**, with the **original setup()** owners and threshold.

- The deployer only pays gas. It does not become an owner.
- Use the initializer from the **creation transaction**, not live `getOwners()`. Owners can change after creation.
- On non-Ethereum chains, Safe v1.4.1 `SafeToL2Setup.setupToL2()` rewrites the singleton from Safe L1 to SafeL2. That is expected.
- The address can be used once per chain. A wrong initializer deploys a different address, or fails if the address is already taken.

## Deployer keys

Keep `DEPLOYER_PRIVATE_KEY` in `.env` (gitignored). Scripts dry-run unless `BROADCAST=1`. Use a fresh funded EOA, not an owner key.
