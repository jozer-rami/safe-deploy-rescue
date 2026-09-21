# Contributing

Node 18+.

```bash
npm install
npm test
```

Deploys stay dry-run unless `BROADCAST=1`. Do not commit `.env` or private keys.

The supported recovery path is decode `createProxyWithNonce` from the original factory transaction, prove the CREATE2 address, then replay on the target chain. `npm run find-nonce` only searches small nonces and will not find a 256-bit salt.
