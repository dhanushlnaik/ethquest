import "server-only";
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";
import { randomInt } from "node:crypto";

const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

const ADJ = ["Blobby", "Rollup", "Gasless", "Merged", "Staked", "Finalized", "Atomic", "Pectral", "Sharded", "Optimistic", "Verkle", "Shapella", "Turbo", "Cosmic", "Pixel", "Neon", "Quantum", "Sudo", "Lucky", "Hyper"];
const NOUN = ["Validator", "Builder", "Proposer", "Explorer", "Wizard", "Node", "Oracle", "Attester", "Sequencer", "Prover", "Bundler", "Editor", "Gnome", "Dragon", "Llama", "Panda", "Fox", "Owl", "Comet", "Golem"];

export function randomNickname() {
  return `${ADJ[randomInt(ADJ.length)]}${NOUN[randomInt(NOUN.length)]}${randomInt(10, 100)}`;
}

/** Returns a cleaned nickname or null if it's not acceptable. */
export function cleanNickname(input: string) {
  const name = input.normalize("NFKC").replace(/[^\p{L}\p{N}_\-. ]/gu, "").replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 20) return null;
  if (matcher.hasMatch(name)) return null;
  if (/admin|eipsinsight|staff|official|moderator/i.test(name)) return null;
  return name;
}
