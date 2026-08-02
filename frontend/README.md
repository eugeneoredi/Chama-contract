# Chama Frontend

Minimal React + ethers.js frontend for the Chama rotating savings group contract, deployed on Sepolia:

- **Chama contract:** `0xb170540A1b11F5257C6D2723F6E56D1920bDd4b5`
- **MockToken (mUSD):** `0x20e79ac973f049E5915a64306D702AB89Be05A8f`

## Run locally

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). You'll need MetaMask installed and switched to the **Sepolia** network — the app will prompt you to switch if you're on the wrong one.

## What it does

- **Connect Wallet** — standard MetaMask connect
- **Group status** — current round, pool balance, contribution amount, and the full list of members (read from `MemberJoined` events, since the contract doesn't expose a member count directly)
- **Your status** — whether you're a member, whether you've contributed this round, whether you've received a payout, and your mUSD token balance
- **Join Chama** — only enabled during the signup phase (before round 0 ends)
- **Contribute** — automatically handles the ERC20 `approve` step first if your allowance isn't high enough, then calls `contribute()`
- **Trigger Payout** — anyone can call this once the pool has funds; it pays out the next eligible member in line

## Getting test tokens

The deployed `MockToken` has an open `mint(address, amount)` function (it's a test token, not real money) — anyone can mint themselves mUSD to test with. There's no UI for this yet since it's not part of the real contract's flow; you can call it directly via Etherscan's "Write Contract" tab on the token's address, or ask Claude to add a "Get test tokens" button if you want it in the UI.

## Config

Contract addresses and ABIs live in `src/contracts.js` — if you redeploy the contract, update `CHAMA_ADDRESS` and `TOKEN_ADDRESS` there.
