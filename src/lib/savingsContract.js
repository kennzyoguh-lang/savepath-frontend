import { Contract } from "ethers";
import { CONTRACT_ADDRESS, EXPLORER_URL } from "./config.js";

export const ABI = [
  "function createGoal(uint256 targetAmount, uint256 targetDate)",
  "function getGoal() view returns (uint256 targetAmount, uint256 targetDate, uint256 totalContributed, bool active)",
  "function recordContribution(uint256 amount)",
  "event GoalCreated(address indexed user, uint256 targetAmount, uint256 targetDate)",
  "event ContributionRecorded(address indexed user, uint256 amount, uint256 totalContributed)",
];

// getGoal() depends on msg.sender, so always use a signer-backed contract (not a read-only provider).
const contractFor = (signer) => new Contract(CONTRACT_ADDRESS, ABI, signer);

export const txLink = (hash) => `${EXPLORER_URL}/tx/${hash}`;
export const addressLink = (a) => `${EXPLORER_URL}/address/${a}`;

export async function readGoal(signer) {
  const g = await contractFor(signer).getGoal();
  return {
    targetAmount: g[0],
    targetDate: Number(g[1]),
    totalContributed: g[2],
    active: g[3],
  };
}

async function send(txPromise, onSubmitted) {
  const tx = await txPromise;
  onSubmitted?.(tx.hash);
  await tx.wait(); // wait for confirmation before the UI updates
  return tx.hash;
}

export const createGoal = (signer, amount, dateUnix, onSubmitted) =>
  send(
    contractFor(signer).createGoal(BigInt(amount), BigInt(dateUnix)),
    onSubmitted,
  );

export const recordContribution = (signer, amount, onSubmitted) =>
  send(contractFor(signer).recordContribution(BigInt(amount)), onSubmitted);

export function friendlyError(e) {
  const msg = e?.shortMessage || e?.message || "Something went wrong.";
  if (e?.code === "ACTION_REJECTED" || e?.code === 4001)
    return "You rejected the request in your wallet. Nothing was sent.";
  if (/insufficient funds/i.test(msg))
    return "Not enough testnet CELO for gas. Get some from a Celo Sepolia faucet.";
  if (/future/i.test(msg)) return "The target date must be in the future.";
  if (/network/i.test(msg))
    return "Wrong network. Switch your wallet to Celo Sepolia and try again.";
  return msg;
}
