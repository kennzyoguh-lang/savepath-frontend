// Finds MetaMask among all installed wallets using EIP-6963.
export function findMetaMask(waitMs = 300) {
  return new Promise((resolve) => {
    const found = [];
    const onAnnounce = (e) => found.push(e.detail);
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve(
        found.find((p) => p.info.rdns === "io.metamask")?.provider || null,
      );
    }, waitMs);
  });
}
