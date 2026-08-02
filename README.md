# Chama Contract

A rotating savings group (chama) smart contract built with Foundry.
Members join, contribute a fixed stablecoin amount each round, and the pool
pays out to the next eligible member in signup order. Missed contributions
skip that round without removing the member from rotation.

## Deployed Contracts (Sepolia)

| Contract | Address |
|---|---|
| Chama | [`0xb170540A1b11F5257C6D2723F6E56D1920bDd4b5`](https://sepolia.etherscan.io/address/0xb170540A1b11F5257C6D2723F6E56D1920bDd4b5) |
| MockToken (mUSD) | [`0x20e79ac973f049E5915a64306D702AB89Be05A8f`](https://sepolia.etherscan.io/address/0x20e79ac973f049E5915a64306D702AB89Be05A8f) |

## Project Structure

```
├── src/              Solidity contracts (Chama.sol, Counter.sol)
├── test/             Foundry test suite + mocks
├── script/           Deployment scripts
├── frontend/         React + ethers.js frontend for interacting with the contract
└── broadcast/        Records of past deployments (addresses, tx hashes, gas used)
```

## Frontend

A minimal React + ethers.js frontend lives in [`frontend/`](./frontend) — wallet connect, live group status, and the three core actions (join, contribute, trigger payout). See [`frontend/README.md`](./frontend/README.md) for setup instructions.


## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

Runs the full suite, including the 5 `Chama`-specific tests covering joining, contributing, duplicate-contribution prevention, skipped members, and double-payout prevention:

```shell
$ forge test
```

Add `-vv` for detailed traces on any failing test.

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

Deploys to Sepolia — see the top-level `.env.example` for the required environment variables (`PRIVATE_KEY`, `SEPOLIA_RPC_URL`, etc.):

```shell
$ forge script script/DeployChama.s.sol:DeployChamaScript --rpc-url sepolia --broadcast
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## License

MIT — see [LICENSE](./LICENSE).
