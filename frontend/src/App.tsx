import { useEffect, useMemo, useState } from "react";
import {
  BrowserProvider,
  Contract,
  type TypedDataDomain,
  type TypedDataField,
  formatEther,
  formatUnits,
  getAddress,
  parseUnits,
} from "ethers";

const SEPOLIA_CHAIN_ID = 11155111;
const TEST_TOKEN_ADDRESS = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
const TEST_TOKEN_NAME = "Aave Test USDC";
const REDEMPTION_TOKEN_SYMBOL = "USDC";
const REDEMPTION_TOKEN_DECIMALS = 6;
const NAV_USD = 1.0023;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const domain: TypedDataDomain = {
  name: "TokenizedAssetDashboard",
  version: "1",
  chainId: SEPOLIA_CHAIN_ID,
};

const types: Record<string, TypedDataField[]> = {
  RedemptionRequest: [
    { name: "walletAddress", type: "address" },
    { name: "tokenAddress", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

type WalletState = {
  address: string | null;
  chainId: number | null;
  networkName: string | null;
  nativeBalance: string;
  nativeSymbol: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenBalanceRaw: bigint;
  tokenBalanceFormatted: string;
  tokenAvailable: boolean;
};

type RedemptionRecord = {
  id: string;
  walletAddress: string;
  tokenAddress: string;
  amount: string;
  nonce: string;
  status: string;
  createdAt: string;
};

type EthereumProvider = {
  on?: (eventName: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (eventName: string, listener: (...args: unknown[]) => void) => void;
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const CHAIN_LABELS: Record<number, { name: string; nativeSymbol: string }> = {
  1: { name: "Ethereum", nativeSymbol: "ETH" },
  137: { name: "Polygon", nativeSymbol: "POL" },
  8453: { name: "Base", nativeSymbol: "ETH" },
  11155111: { name: "Sepolia", nativeSymbol: "ETH" },
};

const initialWalletState: WalletState = {
  address: null,
  chainId: null,
  networkName: null,
  nativeBalance: "0.0",
  nativeSymbol: "ETH",
  tokenSymbol: REDEMPTION_TOKEN_SYMBOL,
  tokenDecimals: REDEMPTION_TOKEN_DECIMALS,
  tokenBalanceRaw: 0n,
  tokenBalanceFormatted: "0.0",
  tokenAvailable: false,
};

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount);
}

async function switchToSepolia() {
  if (!window.ethereum?.request) {
    return;
  }

  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0xaa36a7" }],
  });
}

export default function App() {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);

  const hasConnectedWallet = Boolean(wallet.address);
  const isSepoliaContext = wallet.chainId === SEPOLIA_CHAIN_ID;
  const canRedeem = hasConnectedWallet && isSepoliaContext && wallet.tokenAvailable;

  const portfolioValueUsd = useMemo(() => {
    const balance = Number(wallet.tokenBalanceFormatted || "0");
    return formatUsd(balance * NAV_USD);
  }, [wallet.tokenBalanceFormatted]);

  const networkDisplay = hasConnectedWallet ? (wallet.networkName ?? `Chain ${wallet.chainId}`) : "-";
  const trackedTokenDisplay = hasConnectedWallet ? `${TEST_TOKEN_NAME} (${truncateAddress(TEST_TOKEN_ADDRESS)})` : "-";

  const nativeBalanceDisplay = hasConnectedWallet
    ? loadingBalances
      ? "Loading..."
      : `${Number(wallet.nativeBalance).toFixed(4)} ${wallet.nativeSymbol}`
    : "-";

  const tokenBalanceDisplay = hasConnectedWallet
    ? loadingBalances
      ? "Loading..."
      : wallet.tokenAvailable
        ? Number(wallet.tokenBalanceFormatted).toLocaleString()
        : "-"
    : "-";

  const navDisplay = hasConnectedWallet && isSepoliaContext ? formatUsd(NAV_USD) : "-";
  const portfolioValueDisplay =
    hasConnectedWallet && isSepoliaContext && wallet.tokenAvailable ? portfolioValueUsd : "-";

  const chainNotice = useMemo(() => {
    if (!hasConnectedWallet) {
      return null;
    }

    if (canRedeem) {
      return null;
    }

    if (wallet.chainId === SEPOLIA_CHAIN_ID && !wallet.tokenAvailable) {
      return "Sepolia is connected, but the tracked USDC token could not be read from the wallet's current RPC connection.";
    }

    return `Viewing balances on ${wallet.networkName}. The dashboard only tracks the Sepolia test USDC token, so redemption stays disabled until you switch back to Sepolia.`;
  }, [canRedeem, hasConnectedWallet, wallet.chainId, wallet.networkName, wallet.tokenAvailable]);

  async function refreshBalances(address: string, provider?: BrowserProvider) {
    setLoadingBalances(true);

    try {
      const browserProvider = provider ?? new BrowserProvider(window.ethereum!);
      const network = await browserProvider.getNetwork();
      const chainId = Number(network.chainId);
      const chainLabel = CHAIN_LABELS[chainId];
      const nativeBalanceRaw = await browserProvider.getBalance(address);

      const nextWallet: WalletState = {
        address,
        chainId,
        networkName: chainLabel?.name ?? `Chain ${chainId}`,
        nativeBalance: formatEther(nativeBalanceRaw),
        nativeSymbol: chainLabel?.nativeSymbol ?? "Native",
        tokenSymbol: REDEMPTION_TOKEN_SYMBOL,
        tokenDecimals: REDEMPTION_TOKEN_DECIMALS,
        tokenBalanceRaw: 0n,
        tokenBalanceFormatted: "0.0",
        tokenAvailable: false,
      };

      if (chainId === SEPOLIA_CHAIN_ID) {
        try {
          const tokenContract = new Contract(TEST_TOKEN_ADDRESS, ERC20_ABI, browserProvider);
          const [tokenSymbol, tokenDecimals, tokenBalanceRaw] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.decimals(),
            tokenContract.balanceOf(address),
          ]);

          nextWallet.tokenSymbol = tokenSymbol;
          nextWallet.tokenDecimals = Number(tokenDecimals);
          nextWallet.tokenBalanceRaw = BigInt(tokenBalanceRaw);
          nextWallet.tokenBalanceFormatted = formatUnits(tokenBalanceRaw, tokenDecimals);
          nextWallet.tokenAvailable = true;
        } catch {
          nextWallet.tokenSymbol = REDEMPTION_TOKEN_SYMBOL;
          nextWallet.tokenDecimals = REDEMPTION_TOKEN_DECIMALS;
          nextWallet.tokenBalanceRaw = 0n;
          nextWallet.tokenBalanceFormatted = "0.0";
          nextWallet.tokenAvailable = false;
        }
      }

      setWallet(nextWallet);
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to load wallet balances",
      });
    } finally {
      setLoadingBalances(false);
    }
  }

  async function loadRedemptions(address: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/redemptions/${address}`);

      if (!response.ok) {
        throw new Error("Unable to load redemption history");
      }

      const data = (await response.json()) as RedemptionRecord[];
      setRedemptions(data);
    } catch {
      setRedemptions([]);
    }
  }

  async function connectWallet() {
    if (!window.ethereum?.request) {
      setFeedback({
        kind: "error",
        message: "MetaMask is required to connect a wallet",
      });
      return;
    }

    setConnecting(true);
    setFeedback(null);

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const browserProvider = new BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const address = await signer.getAddress();

      await refreshBalances(address, browserProvider);
      await loadRedemptions(address);
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Wallet connection failed",
      });
    } finally {
      setConnecting(false);
    }
  }

  function disconnectWallet() {
    setWallet(initialWalletState);
    setRedemptions([]);
    setRedeemAmount("");
    setFeedback(null);
  }

  async function handleSwitchToSepolia() {
    try {
      await switchToSepolia();
      setFeedback(null);
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to switch MetaMask to Sepolia",
      });
    }
  }

  async function submitRedemption(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!wallet.address) {
      setFeedback({
        kind: "error",
        message: "Connect a wallet before submitting a redemption",
      });
      return;
    }

    if (!canRedeem) {
      setFeedback({
        kind: "error",
        message: "Redemption signing is only enabled for the Sepolia USDC test token.",
      });
      return;
    }

    try {
      const amount = parseUnits(redeemAmount || "0", wallet.tokenDecimals);

      if (amount <= 0n) {
        throw new Error("Amount must be greater than 0");
      }

      if (amount > wallet.tokenBalanceRaw) {
        throw new Error("Insufficient tokens");
      }

      setSubmitting(true);
      setFeedback(null);

      const browserProvider = new BrowserProvider(window.ethereum!);
      const signer = await browserProvider.getSigner();
      const walletAddress = getAddress(wallet.address);
      const nonce = BigInt(Date.now());

      const value = {
        walletAddress,
        tokenAddress: TEST_TOKEN_ADDRESS,
        amount,
        nonce,
      };

      const signature = await signer.signTypedData(domain, types, value);

      const response = await fetch(`${BACKEND_URL}/redemptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          tokenAddress: TEST_TOKEN_ADDRESS,
          amount: amount.toString(),
          nonce: nonce.toString(),
          signature,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Redemption request failed");
      }

      setFeedback({
        kind: "success",
        message: `Redemption submitted with status: ${data.status}`,
      });
      setRedeemAmount("");
      await loadRedemptions(walletAddress);
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "info" in error
          ? ((error as { info?: { error?: { message?: string } } }).info?.error?.message ?? null)
          : null;

      setFeedback({
        kind: "error",
        message: message ?? (error instanceof Error ? error.message : "Unable to submit redemption"),
      });
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const ethereum = window.ethereum;

    if (!ethereum?.request) {
      return;
    }

    const reconnectIfAuthorized = async () => {
      setConnecting(true);

      try {
        const accounts = (await ethereum.request({
          method: "eth_accounts",
        })) as string[];

        if (!accounts.length) {
          return;
        }

        const address = getAddress(accounts[0]);
        await refreshBalances(address);
        await loadRedemptions(address);
      } catch {
        // Ignore silent reconnect failures and wait for explicit user action.
      } finally {
        setConnecting(false);
      }
    };

    void reconnectIfAuthorized();
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;

    if (!ethereum?.on || !ethereum?.removeListener) {
      return;
    }

    const handleAccountsChanged = async (accounts: unknown) => {
      const nextAccounts = accounts as string[];
      setRedeemAmount("");
      setFeedback(null);

      if (!nextAccounts.length) {
        disconnectWallet();
        return;
      }

      try {
        const address = getAddress(nextAccounts[0]);
        await refreshBalances(address);
        await loadRedemptions(address);
      } catch {
        disconnectWallet();
      }
    };

    const handleChainChanged = async () => {
      setRedeemAmount("");
      setFeedback(null);

      if (!wallet.address) {
        return;
      }

      await refreshBalances(wallet.address);
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [wallet.address]);

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] px-5 pb-16 pt-10 max-[760px]:px-4 max-[760px]:pb-10 max-[760px]:pt-6">
      <section className="hero-shell max-[760px]:flex-col max-[760px]:items-stretch">
        <div>
          <p className="eyebrow-label">Libeara Take-Home</p>
          <h1 className="hero-title">Tokenized Asset Dashboard</h1>
          <p className="hero-subtitle">
            Connect a wallet to view native balances and the Sepolia test USDC holding used for redemption requests.
          </p>
        </div>

        <div className="flex items-center gap-3 max-[760px]:flex-col max-[760px]:items-stretch">
          {wallet.address ? (
            <>
              <div className="wallet-pill">{truncateAddress(wallet.address)}</div>
              <button className="secondary-button" onClick={disconnectWallet} type="button">
                Disconnect
              </button>
            </>
          ) : (
            <button className="primary-button" onClick={connectWallet} type="button" disabled={connecting}>
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </section>

      {feedback ? (
        <section className={`feedback-banner ${feedback.kind === "success" ? "feedback-success" : "feedback-error"}`}>
          {feedback.message}
        </section>
      ) : null}

      {chainNotice ? (
        <section className="feedback-banner feedback-info">
          <div>{chainNotice}</div>
          {wallet.chainId !== SEPOLIA_CHAIN_ID ? (
            <div className="feedback-actions">
              <button className="secondary-button" onClick={handleSwitchToSepolia} type="button">
                Switch to Sepolia
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-5 grid grid-cols-2 gap-5 max-[760px]:grid-cols-1">
        <article className="card-shell">
          <h2>Wallet Overview</h2>
          <div className="panel-stack">
            <div className="stat-row">
              <span className="stat-label">Network</span>
              <strong>{networkDisplay}</strong>
            </div>
            <div className="stat-row">
              <span className="stat-label">{hasConnectedWallet ? `${wallet.nativeSymbol} Balance` : "Native Balance"}</span>
              <strong>{nativeBalanceDisplay}</strong>
            </div>
            <div className="stat-row">
              <span className="stat-label">Tracked Asset</span>
              <strong>{trackedTokenDisplay}</strong>
            </div>
            <div className="stat-row">
              <span className="stat-label">{hasConnectedWallet ? `${wallet.tokenSymbol} Balance` : "Tracked Token Balance"}</span>
              <strong>{tokenBalanceDisplay}</strong>
            </div>
            <div className="stat-row">
              <span className="stat-label">NAV</span>
              <strong>{navDisplay}</strong>
            </div>
            <div className="stat-row stat-row-total">
              <span>Portfolio Value</span>
              <strong>{portfolioValueDisplay}</strong>
            </div>
          </div>
        </article>

        <article className="card-shell">
          <h2>Redeem Tokens</h2>
          <form className="form-stack" onSubmit={submitRedemption}>
            <label htmlFor="amount">Amount ({wallet.tokenSymbol})</label>
            <input
              className="text-input"
              id="amount"
              inputMode="decimal"
              min="0"
              placeholder="100.00"
              step="1"
              type="number"
              value={redeemAmount}
              onChange={(event) => setRedeemAmount(event.target.value)}
            />

            <button className="primary-button" disabled={!canRedeem || submitting || loadingBalances} type="submit">
              {submitting ? "Submitting..." : "Submit Redemption"}
            </button>
          </form>
          <p className="muted-copy">Off chain redemption of Sepolia USDC test token (EIP-712)</p>
        </article>
      </section>

      <section className="card-shell mt-5">
        <div className="panel-header-row max-[760px]:flex-col max-[760px]:items-stretch">
          <h2>Redemption Requests</h2>
          {wallet.address ? (
            <button className="secondary-button" onClick={() => loadRedemptions(wallet.address!)} type="button">
              Refresh
            </button>
          ) : null}
        </div>

        {redemptions.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="table-heading">Status</th>
                  <th className="table-heading">Amount</th>
                  <th className="table-heading">Created</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((record) => (
                  <tr key={record.id}>
                    <td className="table-cell">{record.status}</td>
                    <td className="table-cell">
                      {formatUnits(record.amount, REDEMPTION_TOKEN_DECIMALS)} {REDEMPTION_TOKEN_SYMBOL}
                    </td>
                    <td className="table-cell">{new Date(record.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted-copy">No redemption requests yet.</p>
        )}
      </section>
    </main>
  );
}
