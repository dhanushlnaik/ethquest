"use client";

import { motion } from "motion/react";
import type { EipInfo } from "@/lib/server/eipsinsight";
import { ExternalLink, Panel, PixelIcon, Tag } from "../pixel";
import { eipUrl } from "@/lib/config/game";

const STATUS_TONE: Record<string, "green" | "blue" | "gold" | "purple" | "red" | "default"> = {
  Final: "green", Living: "green", "Last Call": "gold", Review: "blue", Draft: "purple", Stagnant: "default", Withdrawn: "red",
};

export function EipCard({ eip, plain, upgrade }: { eip: EipInfo; plain?: string | null; upgrade?: { name: string; url: string } | null }) {
  const label = `${eip.repo === "erc" ? "ERC" : "EIP"}-${eip.number}`;
  return (
    <motion.div initial={{ opacity: 0, y: 16, rotateX: 20 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}>
      <Panel tone="purple" className="overflow-hidden">
        <div className="flex items-center gap-3 bg-purple-lo/30 px-4 py-3">
          <PixelIcon name="scroll" size={32} />
          <div className="min-w-0 flex-1">
            <p className="font-arcade text-sm text-gold">{label}</p>
            <h2 className="font-pixel text-2xl leading-tight">{eip.title}</h2>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Tag tone={STATUS_TONE[eip.status] ?? "default"}>{eip.status}</Tag>
            {eip.type && <Tag>{eip.type}</Tag>}
            {eip.category && <Tag tone="blue">{eip.category}</Tag>}
            {eip.created && <Tag>Created {eip.created}</Tag>}
          </div>
          {plain && (
            <div className="px-panel px-panel--sunken p-3">
              <p className="font-arcade text-xs text-green">IN PLAIN ENGLISH</p>
              <p className="mt-1">{plain}</p>
            </div>
          )}
          {upgrade && (
            <p className="flex items-center gap-2 text-sm">
              <PixelIcon name="hourglass" size={16} />
              {eip.upcoming ? <>Part of <strong>{upgrade.name}</strong> ({eip.upcoming.bucket})</> : <>Shipped in <strong>{upgrade.name}</strong></>}
            </p>
          )}
          {eip.authors.length > 0 && (
            <div>
              <p className="font-arcade text-xs text-muted">AUTHORS</p>
              <p className="mt-1 text-sm text-muted">
                {eip.authors.slice(0, 6).join(", ")}
                {eip.authors.length > 6 && ` +${eip.authors.length - 6} more`}
              </p>
            </div>
          )}
          {eip.requires.length > 0 && (
            <p className="text-sm text-muted">
              Builds on: {eip.requires.slice(0, 8).map((n) => `EIP-${n}`).join(", ")}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-sm">
            <ExternalLink href={eipUrl(eip.number, eip.repo)}>Full story on EIPsInsight ↗</ExternalLink>
            {upgrade && <ExternalLink href={upgrade.url}>{upgrade.name} upgrade ↗</ExternalLink>}
          </div>
          <p className="font-arcade text-[11px] text-faint">SOURCE: EIPSINSIGHT {eip.source === "eipsinsight-db" ? "DATABASE" : "API"}</p>
        </div>
      </Panel>
    </motion.div>
  );
}
