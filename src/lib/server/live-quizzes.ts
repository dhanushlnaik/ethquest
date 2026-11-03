import "server-only";
import type { LiveKind } from "@/lib/live/types";

export type LiveQuestion = { kind: LiveKind; level: string; prompt: string; options: string[]; correct?: number; explanation: string; seconds?: number };
export type LiveQuiz = { slug: string; title: string; subtitle: string; questions: LiveQuestion[] };

// "EIP Signal Quiz Game: Understanding EIPs". Ramps from warm-up to ACD-insider, with two Mentimeter-style
// polls as bookends. Facts follow EIP-1 and the shipped network upgrades (as tracked on EIPsInsight).
export const EIP_SIGNAL: LiveQuiz = {
  slug: "eip-signal",
  title: "EIP Signal Quiz",
  subtitle: "Understanding EIPs: standards, statuses and network upgrades",
  questions: [
    {
      kind: "poll", level: "Warm-up", seconds: 20,
      prompt: "How well do you know EIPs right now?",
      options: ["What's an EIP?", "I've heard of a few", "I read them sometimes", "I've written or reviewed one"],
      explanation: "No wrong answers. Let's see how far the room gets by the end!",
    },
    {
      kind: "quiz", level: "Easy", prompt: "What does EIP stand for?",
      options: ["Ethereum Improvement Proposal", "Ethereum Internal Protocol", "Ethereum Integration Plan", "Execution Improvement Process"], correct: 0,
      explanation: "An Ethereum Improvement Proposal is a design document describing a new feature, process or standard for Ethereum.",
    },
    {
      kind: "quiz", level: "Easy", prompt: "Which EIP explains how the EIP process itself works?",
      options: ["EIP-1", "EIP-20", "EIP-1559", "EIP-100"], correct: 0,
      explanation: "EIP-1, \"EIP Purpose and Guidelines\", defines EIP types, statuses and how editors work. It's a Living document.",
    },
    {
      kind: "quiz", level: "Easy", prompt: "ERC-20 is a standard for…",
      options: ["Fungible tokens", "NFTs", "Gas pricing", "Validator withdrawals"], correct: 0,
      explanation: "ERC-20 defines the fungible token interface (transfer, approve, balanceOf…). NFTs are ERC-721.",
    },
    {
      kind: "quiz", level: "Medium", prompt: "Which status means an EIP is an accepted standard that shouldn't change?",
      options: ["Final", "Last Call", "Review", "Living"], correct: 0,
      explanation: "Final = accepted standard; only errata fixes after that. Living (like EIP-1) is the one status meant to keep being updated.",
    },
    {
      kind: "quiz", level: "Medium", prompt: "Which EIP category covers changes that need a hard fork?",
      options: ["Core", "ERC", "Interface", "Meta"], correct: 0,
      explanation: "Standards Track: Core covers consensus changes that require a network upgrade. ERCs are application-level standards.",
    },
    {
      kind: "quiz", level: "Medium", prompt: "EIP-1559 (London, 2021) changed fees by…",
      options: ["Burning a base fee that adjusts per block", "Making transactions free", "Paying fees in stablecoins", "Removing priority tips"], correct: 0,
      explanation: "EIP-1559 added a protocol base fee that is burned and moves with block demand; users still add a priority tip.",
    },
    {
      kind: "quiz", level: "Medium", prompt: "EIP-4844 introduced blobs. Which upgrade shipped it?",
      options: ["Dencun", "Shapella", "Pectra", "The Merge"], correct: 0,
      explanation: "Dencun (March 2024) shipped proto-danksharding: blob-carrying transactions that made rollup data much cheaper.",
    },
    {
      kind: "quiz", level: "Hard", prompt: "EIP-7702 lets regular accounts (EOAs) temporarily set code. Which upgrade shipped it?",
      options: ["Pectra", "Dencun", "Fusaka", "Glamsterdam"], correct: 0,
      explanation: "Pectra (May 2025) shipped EIP-7702, bringing smart-account features like batching and sponsored gas to EOAs.",
    },
    {
      kind: "quiz", level: "Hard", prompt: "PeerDAS (EIP-7594) shipped in which upgrade?",
      options: ["Fusaka", "Pectra", "Dencun", "Glamsterdam"], correct: 0,
      explanation: "Fusaka (December 2025) shipped PeerDAS: nodes sample blob data instead of downloading all of it.",
    },
    {
      kind: "quiz", level: "Expert", prompt: "On All Core Devs calls, what does \"SFI\" mean for an EIP?",
      options: ["Scheduled for Inclusion", "Submitted for Inspection", "Standard, Final, Immutable", "Signed by Fork Implementers"], correct: 0,
      explanation: "SFI = Scheduled for Inclusion in the next upgrade. CFI = Considered, DFI = Declined. Track every decision on EIPsInsight.",
    },
    {
      kind: "quiz", level: "Expert", prompt: "Where do ERCs live on GitHub today?",
      options: ["Their own ethereum/ERCs repo", "Inside ethereum/EIPs", "ethereum/pm", "Each client's repo"], correct: 0,
      explanation: "ERCs were split into the separate ethereum/ERCs repository in 2023, so core and application standards are edited apart.",
    },
    {
      kind: "poll", level: "Finale", seconds: 25,
      prompt: "Which direction excites you most for Ethereum's next upgrades?",
      options: ["Scaling blobs further", "Smarter accounts & UX", "Censorship resistance (ePBS, FOCIL)", "Leaner nodes & statelessness"],
      explanation: "Follow every proposal's progress, ACD decisions and upgrade timelines on eipsinsight.com",
    },
  ],
};

export const LIVE_QUIZZES: Record<string, LiveQuiz> = { [EIP_SIGNAL.slug]: EIP_SIGNAL };
export const DEFAULT_SECONDS = 20;

/** Kahoot-style: a correct answer earns 500 plus up to 500 more for speed. Polls score nothing. */
export function livePoints(correct: boolean, elapsedMs: number, seconds: number) {
  if (!correct) return 0;
  const left = Math.max(0, 1 - elapsedMs / (seconds * 1000));
  return 500 + Math.round(500 * left);
}
