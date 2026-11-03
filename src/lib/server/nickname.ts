import "server-only";
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";
import { randomInt } from "node:crypto";

const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

const ADJ = ["Blobby", "Rollup", "Gasless", "Merged", "Staked", "Finalized", "Atomic", "Pectral", "Sharded", "Optimistic", "Verkle", "Shapella", "Turbo", "Cosmic", "Pixel", "Neon", "Quantum", "Sudo", "Lucky", "Hyper"];
const NOUN = ["Validator", "Builder", "Proposer", "Explorer", "Wizard", "Node", "Oracle", "Attester", "Sequencer", "Prover", "Bundler", "Editor", "Gnome", "Dragon", "Llama", "Panda", "Fox", "Owl", "Comet", "Golem"];

export function randomNickname() {
  return `${ADJ[randomInt(ADJ.length)]}${NOUN[randomInt(NOUN.length)]}${randomInt(10, 100)}`;
}

// Embedded matches flag real names (Dhanush → "anus", Harshit → "shit"), so a match only counts when it is
// a whole word of the name, except for a short list of terms that are never innocent inside a word.
const ALWAYS_BLOCK = ["fuck", "cunt", "nigg", "whore", "slut", "bitch", "faggot"];

export function isOffensive(name: string) {
  const lower = name.toLowerCase();
  if (ALWAYS_BLOCK.some((w) => lower.replace(/[^a-z]/g, "").includes(w))) return true;
  // Words: split on spaces/punctuation/digits and camelCase ("FuckYou" → fuck, you).
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[^A-Za-z]+/).filter(Boolean);
  return words.some((w) => matcher.getAllMatches(w).some((m) => m.startIndex === 0 && m.endIndex === w.length - 1));
}

/** Returns a cleaned nickname or null if it's not acceptable. */
export function cleanNickname(input: string) {
  const name = input.normalize("NFKC").replace(/[^\p{L}\p{N}_\-. ]/gu, "").replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 20) return null;
  if (isOffensive(name)) return null;
  if (/admin|eipsinsight|staff|official|moderator/i.test(name)) return null;
  return name;
}
