import { useState, useCallback, useRef, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { CHAIN_ID, CELO_SEPOLIA, RPC_URL, WC_PROJECT_ID } from "../lib/config";
import { findMetaMask } from "../lib/walletDiscovery";

const empty = {
  status: "disconnected",
  kind: null,
  address: null,
  chainId: null,
  signer: null,
  error: null,
};

const friendlyError = (e) => {
  const code = e?.code;
  if (code === 4001 || code === "ACTION_REJECTED")
    return "Connection request rejected.";
  if (code === -32002)
    return "A wallet request is already open. Click the MetaMask icon to finish it.";
  return e?.shortMessage || e?.message || "Something went wrong.";
};

export function useWallet() {
  const [wallet, setWallet] = useState(empty);
  const raw = useRef(null);
  const removeListeners = useRef(() => {});
  const busy = useRef(false);

  const attach = useCallback(async (provider, kind) => {
    raw.current = provider;
    const bp = new BrowserProvider(provider);
    const signer = await bp.getSigner();
    const net = await bp.getNetwork();
    setWallet({
      status: "connected",
      kind,
      address: await signer.getAddress(),
      chainId: Number(net.chainId),
      signer,
      error: null,
    });
  }, []);

  const bindEvents = useCallback(
    (provider, kind) => {
      removeListeners.current(); // clear any previous listeners first

      const refresh = () =>
        attach(provider, kind).catch(() => setWallet(empty));
      const onAccounts = (a) => (a.length ? refresh() : setWallet(empty));
      const onDisconnect = () => setWallet(empty);

      provider.on?.("accountsChanged", onAccounts);
      provider.on?.("chainChanged", refresh);
      provider.on?.("disconnect", onDisconnect);

      removeListeners.current = () => {
        provider.removeListener?.("accountsChanged", onAccounts);
        provider.removeListener?.("chainChanged", refresh);
        provider.removeListener?.("disconnect", onDisconnect);
      };
    },
    [attach],
  );

  const connect = useCallback(
    async (kind) => {
      if (busy.current) return; // ignore double clicks
      busy.current = true;
      setWallet((w) => ({ ...w, status: "connecting", error: null }));
      try {
        let provider;
        if (kind === "injected") {
          const injected = (await findMetaMask()) || window.ethereum;
          if (!injected)
            throw new Error(
              "No browser wallet found. Use WalletConnect or install MetaMask.",
            );
          await injected.request({ method: "eth_requestAccounts" });
          provider = injected;
        } else {
          if (!WC_PROJECT_ID)
            throw new Error(
              "WalletConnect needs VITE_WALLETCONNECT_PROJECT_ID in your .env file.",
            );
          provider = await EthereumProvider.init({
            projectId: WC_PROJECT_ID,
            optionalChains: [CHAIN_ID],
            rpcMap: { [CHAIN_ID]: RPC_URL },
            showQrModal: true,
          });
          await provider.connect();
        }
        await attach(provider, kind);
        bindEvents(provider, kind);
        localStorage.setItem("walletKind", kind);
      } catch (e) {
        setWallet({ ...empty, error: friendlyError(e) });
      } finally {
        busy.current = false;
      }
    },
    [attach, bindEvents],
  );

  // Silently restore an injected-wallet session after a page refresh
  useEffect(() => {
    if (!window.ethereum) return;
    if (localStorage.getItem("walletKind") !== "injected") return;
    window.ethereum
      .request({ method: "eth_accounts" }) // no popup
      .then(async (accounts) => {
        if (!accounts.length) return;
        await attach(window.ethereum, "injected");
        bindEvents(window.ethereum, "injected");
      })
      .catch(() => {});
  }, [attach, bindEvents]);

  const switchNetwork = useCallback(async () => {
    const p = raw.current;
    if (!p) return;
    try {
      await p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CELO_SEPOLIA.chainId }],
      });
    } catch (e) {
      try {
        if (
          e?.code === 4902 ||
          /unrecognized|not added/i.test(e?.message || "")
        ) {
          await p.request({
            method: "wallet_addEthereumChain",
            params: [CELO_SEPOLIA],
          });
        } else {
          throw e;
        }
      } catch (err) {
        setWallet((w) => ({ ...w, error: friendlyError(err) }));
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    removeListeners.current();
    removeListeners.current = () => {};
    try {
      await raw.current?.disconnect?.();
    } catch {
      /* injected wallets cannot disconnect programmatically */
    }
    raw.current = null;
    localStorage.removeItem("walletKind");
    setWallet(empty);
  }, []);

  return {
    ...wallet,
    wrongNetwork: wallet.status === "connected" && wallet.chainId !== CHAIN_ID,
    connect,
    switchNetwork,
    disconnect,
  };
}
