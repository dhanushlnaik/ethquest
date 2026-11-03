import "server-only";
import { pool } from "./db";

// Read-only access to EIPsInsight's own tables (public schema). ETHQuest never writes here.

export type EipInfo = {
  number: number;
  repo: "eip" | "erc";
  title: string;
  status: string;
  type: string | null;
  category: string | null;
  authors: string[];
  created: string | null;
  requires: number[];
  upcoming: { upgrade: string; slug: string; bucket: string } | null;
  source: "eipsinsight-db" | "eipsinsight-api";
};

function splitAuthors(author: string | null) {
  if (!author) return [];
  return author
    .split(/,(?![^(<]*[)>])/)
    .map((a) => a.trim())
    .filter(Boolean);
}

export async function getEip(number: number): Promise<EipInfo | null> {
  try {
    const { rows } = await pool.query(
      `SELECT e.eip_number, e.title, e.author, e.created_at::text AS created_at, s.status, s.type, s.category, s.requires, r.name AS repo,
              u.name AS up_name, u.slug AS up_slug, c.bucket AS up_bucket
         FROM public.eips e
         JOIN public.eip_snapshots s ON s.eip_id = e.id
         JOIN public.repositories r ON r.id = s.repository_id
         LEFT JOIN public.upgrade_composition_current c ON c.eip_number = e.eip_number
         LEFT JOIN public.upgrades u ON u.id = c.upgrade_id
        WHERE e.eip_number = $1
        LIMIT 1`,
      [number],
    );
    const row = rows[0];
    if (row) {
      return {
        number: row.eip_number,
        repo: row.repo === "ethereum/ERCs" ? "erc" : "eip",
        title: row.title,
        status: row.status,
        type: row.type,
        category: row.category,
        authors: splitAuthors(row.author),
        created: row.created_at ?? null, // DATE read as text: no timezone shift
        requires: row.requires ?? [],
        upcoming: row.up_slug ? { upgrade: row.up_name, slug: row.up_slug, bucket: row.up_bucket } : null,
        source: "eipsinsight-db",
      };
    }
  } catch (err) {
    console.error("eipsinsight db lookup failed, falling back to API", err);
  }
  return getEipFromApi(number);
}

/** Fallback: EIPsInsight's public RPC (same data, over HTTPS). */
async function getEipFromApi(number: number): Promise<EipInfo | null> {
  for (const repo of ["eip", "erc"] as const) {
    try {
      const res = await fetch("https://eipsinsight.com/rpc/proposals/getProposal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { repo, number } }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const { json } = await res.json();
      if (!json?.title) continue;
      return {
        number,
        repo: json.category === "ERC" ? "erc" : repo,
        title: json.title,
        status: json.status,
        type: json.type ?? null,
        category: json.category ?? null,
        authors: json.authors ?? [],
        created: json.created ?? null,
        requires: json.requires ?? [],
        upcoming: null,
        source: "eipsinsight-api",
      };
    } catch {
      // try next repo
    }
  }
  return null;
}

export type Decision = {
  series: string;
  callNumber: string;
  occurredOn: string;
  meeting: string;
  text: string;
  context: string | null;
  eips: number[];
  stageTo: string | null;
  timestamp: string | null;
};

const SERIES_NAMES: Record<string, string> = {
  acde: "All Core Devs – Execution",
  acdc: "All Core Devs – Consensus",
  acdt: "All Core Devs – Testing",
  focil: "FOCIL Breakout",
  eipip: "EIP Editing Office Hour",
};
export const seriesName = (s: string) => SERIES_NAMES[s] ?? s.toUpperCase();

/** Structured key decisions from recent core-dev calls, newest first. */
export async function recentDecisions(limit = 60, series = ["acde", "acdc", "acdt"]): Promise<Decision[]> {
  const { rows } = await pool.query(
    `SELECT series, call_number, occurred_on::text AS occurred_on, key_decisions
       FROM public.protocol_calls
      WHERE series = ANY($1) AND key_decisions IS NOT NULL
      ORDER BY occurred_on DESC
      LIMIT 20`,
    [series],
  );
  const out: Decision[] = [];
  for (const row of rows) {
    const kd = row.key_decisions as { meeting?: string; key_decisions?: Record<string, unknown>[] } | null;
    for (const d of kd?.key_decisions ?? []) {
      const text = typeof d.original_text === "string" ? d.original_text : null;
      if (!text) continue;
      out.push({
        series: row.series,
        callNumber: String(row.call_number),
        occurredOn: row.occurred_on,
        meeting: kd?.meeting ?? `${row.series.toUpperCase()} #${row.call_number}`,
        text,
        context: typeof d.context === "string" ? d.context : null,
        eips: Array.isArray(d.eips) ? (d.eips as number[]) : [],
        stageTo: (d.stage_change as { to?: string } | undefined)?.to ?? null,
        timestamp: typeof d.timestamp === "string" ? d.timestamp : null,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export async function eipTitles(numbers: number[]) {
  if (!numbers.length) return new Map<number, string>();
  const { rows } = await pool.query(`SELECT eip_number, title FROM public.eips WHERE eip_number = ANY($1)`, [numbers]);
  return new Map<number, string>(rows.map((r) => [r.eip_number, r.title]));
}

export async function upgradeComposition(slug: string) {
  const { rows } = await pool.query(
    `SELECT c.eip_number, c.bucket, e.title
       FROM public.upgrade_composition_current c
       JOIN public.upgrades u ON u.id = c.upgrade_id
       LEFT JOIN public.eips e ON e.eip_number = c.eip_number
      WHERE u.slug = $1
      ORDER BY c.bucket, c.eip_number`,
    [slug],
  );
  return rows as { eip_number: number; bucket: string; title: string | null }[];
}
