import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, formatUnits } from "ethers";
import {
  CHAMA_ADDRESS,
  TOKEN_ADDRESS,
  CHAMA_ABI,
  ERC20_ABI,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_CHAIN_ID_HEX,
} from "./contracts";
import "./App.css";

function shortAddr(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function App() {
  const [account, setAccount] = useState(null);
  const [chainOk, setChainOk] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null); // which action is in flight: "join" | "contribute" | "payout"
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [chamaState, setChamaState] = useState({
    currentRound: 0n,
    pool: 0n,
    contributionAmount: 0n,
    members: [],
    tokenSymbol: "TOKEN",
    tokenDecimals: 18,
  });

  const [userState, setUserState] = useState({
    isMember: false,
    hasContributedThisRound: false,
    hasReceivedPayout: false,
    tokenBalance: 0n,
    allowance: 0n,
  });

  const getProvider = useCallback(() => {
    if (!window.ethereum) return null;
    return new BrowserProvider(window.ethereum);
  }, []);

  const loadChamaState = useCallback(async () => {
    const provider = getProvider() ?? null;
    if (!provider) return;

    const chama = new Contract(CHAMA_ADDRESS, CHAMA_ABI, provider);
    const token = new Contract(TOKEN_ADDRESS, ERC20_ABI, provider);

    const [currentRound, pool, contributionAmount, tokenSymbol, tokenDecimals] =
      await Promise.all([
        chama.currentRound(),
        chama.pool(),
        chama.contributionAmount(),
        token.symbol(),
        token.decimals(),
      ]);

    const joinEvents = await chama.queryFilter(chama.filters.MemberJoined());
    const members = joinEvents.map((e) => e.args.member);

    setChamaState({
      currentRound,
      pool,
      contributionAmount,
      members,
      tokenSymbol,
      tokenDecimals: Number(tokenDecimals),
    });

    return { chama, token, currentRound };
  }, [getProvider]);

  const loadUserState = useCallback(
    async (addr, ctx) => {
      if (!addr) {
        setUserState({
          isMember: false,
          hasContributedThisRound: false,
          hasReceivedPayout: false,
          tokenBalance: 0n,
          allowance: 0n,
        });
        return;
      }
      const provider = getProvider();
      const chama = ctx?.chama ?? new Contract(CHAMA_ADDRESS, CHAMA_ABI, provider);
      const token = ctx?.token ?? new Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
      const currentRound = ctx?.currentRound ?? (await chama.currentRound());

      const [isMember, hasContributedThisRound, hasReceivedPayout, tokenBalance, allowance] =
        await Promise.all([
          chama.isMember(addr),
          chama.hasContributed(currentRound, addr),
          chama.hasReceivedPayout(addr),
          token.balanceOf(addr),
          token.allowance(addr, CHAMA_ADDRESS),
        ]);

      setUserState({
        isMember,
        hasContributedThisRound,
        hasReceivedPayout,
        tokenBalance,
        allowance,
      });
    },
    [getProvider]
  );

  const refreshAll = useCallback(
    async (addr) => {
      setLoading(true);
      setError("");
      try {
        const ctx = await loadChamaState();
        await loadUserState(addr ?? account, ctx);
      } catch (err) {
        console.error(err);
        setError(err.shortMessage || err.message || "Failed to load contract state.");
      } finally {
        setLoading(false);
      }
    },
    [loadChamaState, loadUserState, account]
  );

  const checkChain = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;
    const network = await provider.getNetwork();
    setChainOk(network.chainId === SEPOLIA_CHAIN_ID);
  }, [getProvider]);

  useEffect(() => {
    refreshAll(null);
    checkChain();

    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        const addr = accounts[0] ?? null;
        setAccount(addr);
        refreshAll(addr);
      };
      const handleChainChanged = () => {
        checkChain();
        refreshAll(account);
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectWallet() {
    setError("");
    if (!window.ethereum) {
      setError("No wallet found. Install MetaMask to continue.");
      return;
    }
    try {
      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      await checkChain();
      await refreshAll(accounts[0]);
    } catch (err) {
      setError(err.shortMessage || err.message || "Failed to connect wallet.");
    }
  }

  async function switchToSepolia() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
      await checkChain();
    } catch (err) {
      setError(err.shortMessage || err.message || "Failed to switch network.");
    }
  }

  async function withTx(action, label, fn) {
    setBusy(action);
    setError("");
    setStatus(`${label}...`);
    try {
      const tx = await fn();
      setStatus(`${label} — waiting for confirmation...`);
      await tx.wait();
      setStatus(`${label} confirmed.`);
      await refreshAll(account);
    } catch (err) {
      console.error(err);
      setError(err.shortMessage || err.reason || err.message || `${label} failed.`);
      setStatus("");
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin() {
    const provider = getProvider();
    const signer = await provider.getSigner();
    const chama = new Contract(CHAMA_ADDRESS, CHAMA_ABI, signer);
    await withTx("join", "Joining Chama", () => chama.joinChama());
  }

  async function handleContribute() {
    const provider = getProvider();
    const signer = await provider.getSigner();
    const chama = new Contract(CHAMA_ADDRESS, CHAMA_ABI, signer);
    const token = new Contract(TOKEN_ADDRESS, ERC20_ABI, signer);

    if (userState.allowance < chamaState.contributionAmount) {
      await withTx("contribute", "Approving token spend", () =>
        token.approve(CHAMA_ADDRESS, chamaState.contributionAmount)
      );
    }
    await withTx("contribute", "Contributing", () => chama.contribute());
  }

  async function handlePayout() {
    const provider = getProvider();
    const signer = await provider.getSigner();
    const chama = new Contract(CHAMA_ADDRESS, CHAMA_ABI, signer);
    await withTx("payout", "Triggering payout", () => chama.payout());
  }

  const fmt = (amount) => formatUnits(amount, chamaState.tokenDecimals);
  const needsApproval = userState.allowance < chamaState.contributionAmount;

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Chama</h1>
          <p className="subtitle">A rotating savings group, on-chain.</p>
        </div>
        {account ? (
          <div className="account-pill">{shortAddr(account)}</div>
        ) : (
          <button className="btn btn-primary" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </header>

      {!window.ethereum && (
        <div className="banner banner-warn">
          No wallet detected — install{" "}
          <a href="https://metamask.io" target="_blank" rel="noreferrer">
            MetaMask
          </a>{" "}
          to view live status and interact with this Chama.
        </div>
      )}

      {!chainOk && account && (
        <div className="banner banner-warn">
          Wrong network — this app runs on Sepolia testnet.{" "}
          <button className="link-btn" onClick={switchToSepolia}>
            Switch network
          </button>
        </div>
      )}

      {error && <div className="banner banner-error">{error}</div>}
      {status && !error && <div className="banner banner-info">{status}</div>}

      <section className="card">
        <h2>Group status</h2>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : (
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-label">Current round</span>
              <span className="stat-value">{chamaState.currentRound.toString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Pool balance</span>
              <span className="stat-value">
                {fmt(chamaState.pool)} {chamaState.tokenSymbol}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Contribution / round</span>
              <span className="stat-value">
                {fmt(chamaState.contributionAmount)} {chamaState.tokenSymbol}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Members</span>
              <span className="stat-value">{chamaState.members.length}</span>
            </div>
          </div>
        )}

        {chamaState.members.length > 0 && (
          <div className="member-list">
            <span className="stat-label">Joined so far</span>
            <ul>
              {chamaState.members.map((m) => (
                <li key={m}>
                  {shortAddr(m)}
                  {m.toLowerCase() === account?.toLowerCase() && (
                    <span className="you-tag">you</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {account && (
        <section className="card">
          <h2>Your status</h2>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-label">Member?</span>
              <span className="stat-value">{userState.isMember ? "Yes" : "No"}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Contributed this round?</span>
              <span className="stat-value">
                {userState.hasContributedThisRound ? "Yes" : "No"}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Received a payout?</span>
              <span className="stat-value">{userState.hasReceivedPayout ? "Yes" : "No"}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Your token balance</span>
              <span className="stat-value">
                {fmt(userState.tokenBalance)} {chamaState.tokenSymbol}
              </span>
            </div>
          </div>

          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={
                busy !== null ||
                userState.isMember ||
                chamaState.currentRound !== 0n
              }
              onClick={handleJoin}
            >
              {busy === "join" ? "Joining..." : "Join Chama"}
            </button>

            <button
              className="btn btn-primary"
              disabled={
                busy !== null || !userState.isMember || userState.hasContributedThisRound
              }
              onClick={handleContribute}
            >
              {busy === "contribute"
                ? "Contributing..."
                : needsApproval
                ? "Approve + Contribute"
                : "Contribute"}
            </button>

            <button
              className="btn btn-secondary"
              disabled={busy !== null || chamaState.pool === 0n}
              onClick={handlePayout}
            >
              {busy === "payout" ? "Sending payout..." : "Trigger Payout"}
            </button>
          </div>

          {chamaState.currentRound !== 0n && !userState.isMember && (
            <p className="hint">Signup is closed — the first round has already started.</p>
          )}
        </section>
      )}

      {!account && (
        <section className="card card-center">
          <p className="muted">Connect your wallet to join or interact with this Chama.</p>
        </section>
      )}

      <footer className="footer">
        <span>Sepolia testnet</span>
        <span>Chama: {shortAddr(CHAMA_ADDRESS)}</span>
      </footer>
    </div>
  );
}
