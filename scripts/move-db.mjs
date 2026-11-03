// Moves ETHQuest to another Postgres:
//   1. mirror the EIPsInsight tables ETHQuest reads into <target>.eipsinsight (snapshot, read-only use)
//   2. copy every ethquest.* row (target schema must already exist via `prisma migrate deploy`)
// Every value travels as text with an explicit cast, so dates, JSON, arrays and enums round-trip exactly.
// Only the target's `eipsinsight` and `ethquest` schemas are written; nothing else there is touched.
//   SOURCE_DATABASE_URL=… TARGET_DATABASE_URL=… node scripts/move-db.mjs [mirror|data|all]
import pg from "pg";

const step = process.argv[2] ?? "all";
const strip = (u) => u.replace(/\?.*$/, "");
const src = new pg.Pool({ connectionString: strip(process.env.SOURCE_DATABASE_URL), max: 2 });
const dst = new pg.Pool({ connectionString: strip(process.env.TARGET_DATABASE_URL), max: 2 });
const MIRROR = ["eips", "eip_snapshots", "repositories", "upgrade_composition_current", "upgrades", "protocol_calls", "pull_request_eips"];
const q = (s) => `"${s.replace(/"/g, '""')}"`;

/** Column list with exact types; enum (and enum-array) columns become text, since the enum types don't exist on the target. */
async function columns(pool, schema, table, enumsAsText) {
  const { rows } = await pool.query(
    `SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull AS notnull,
            (t.typtype = 'e' OR et.typtype = 'e') AS is_enum, t.typcategory = 'A' AS is_array
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_type t ON t.oid = a.atttypid LEFT JOIN pg_type et ON et.oid = t.typelem AND t.typelem <> 0
      WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum`,
    [schema, table],
  );
  return rows.map((r) => ({ ...r, type: enumsAsText && r.is_enum ? (r.is_array ? "text[]" : "text") : r.type }));
}

async function copyRows(fromSchema, toSchema, table, cols) {
  const { rows } = await src.query(`SELECT ${cols.map((c) => `${q(c.name)}::text AS ${q(c.name)}`).join(", ")} FROM ${q(fromSchema)}.${q(table)}`);
  const per = Math.max(1, Math.floor(30000 / cols.length));
  for (let i = 0; i < rows.length; i += per) {
    const chunk = rows.slice(i, i + per);
    const params = [];
    const values = chunk.map((row) => `(${cols.map((c) => { params.push(row[c.name]); return `$${params.length}::${c.type}`; }).join(", ")})`);
    await dst.query(`INSERT INTO ${q(toSchema)}.${q(table)} (${cols.map((c) => q(c.name)).join(", ")}) VALUES ${values.join(", ")}`, params);
  }
  return rows.length;
}

async function mirror() {
  await dst.query(`CREATE SCHEMA IF NOT EXISTS eipsinsight`);
  for (const table of MIRROR) {
    const cols = await columns(src, "public", table, true);
    if (!cols.length) { console.log("  (missing on source)", table); continue; }
    await dst.query(`DROP TABLE IF EXISTS eipsinsight.${q(table)}`);
    await dst.query(`CREATE TABLE eipsinsight.${q(table)} (${cols.map((c) => `${q(c.name)} ${c.type}${c.notnull ? " NOT NULL" : ""}`).join(", ")})`);
    const n = await copyRows("public", "eipsinsight", table, cols);
    console.log(`  eipsinsight.${table}: ${n} rows`);
  }
  // Indexes for the lookups ETHQuest actually does.
  for (const sql of [
    `CREATE INDEX IF NOT EXISTS eips_number_idx ON eipsinsight.eips (eip_number)`,
    `CREATE INDEX IF NOT EXISTS eip_snapshots_eip_idx ON eipsinsight.eip_snapshots (eip_id)`,
    `CREATE INDEX IF NOT EXISTS ucc_eip_idx ON eipsinsight.upgrade_composition_current (eip_number)`,
    `CREATE INDEX IF NOT EXISTS pre_eip_idx ON eipsinsight.pull_request_eips (eip_number)`,
  ]) await dst.query(sql).catch((e) => console.log("  index skipped:", e.message));
}

/** Tables in foreign-key order (parents first). */
async function ethquestOrder() {
  const { rows: tables } = await src.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'ethquest' AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'`);
  const { rows: fks } = await src.query(
    `SELECT cl.relname AS child, pc.relname AS parent FROM pg_constraint co
       JOIN pg_class cl ON cl.oid = co.conrelid JOIN pg_class pc ON pc.oid = co.confrelid JOIN pg_namespace n ON n.oid = cl.relnamespace
      WHERE co.contype = 'f' AND n.nspname = 'ethquest'`,
  );
  const names = tables.map((t) => t.relname);
  const deps = new Map(names.map((n) => [n, new Set(fks.filter((f) => f.child === n && f.parent !== n).map((f) => f.parent))]));
  const out = [];
  while (out.length < names.length) {
    const ready = names.filter((n) => !out.includes(n) && [...deps.get(n)].every((p) => out.includes(p)));
    if (!ready.length) throw new Error("FK cycle");
    out.push(...ready.sort());
  }
  return out;
}

async function data() {
  const { rows: existing } = await dst.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'ethquest'`);
  if (!existing[0].n) throw new Error("Target has no ethquest tables yet: run `prisma migrate deploy` against it first.");
  const order = await ethquestOrder();
  // Empty target tables (children first) so a re-run starts clean.
  for (const t of [...order].reverse()) await dst.query(`DELETE FROM ethquest.${q(t)}`);
  await dst.query("SET search_path = ethquest");
  for (const t of order) {
    const cols = await columns(src, "ethquest", t, false);
    const n = await copyRows("ethquest", "ethquest", t, cols);
    console.log(`  ethquest.${t}: ${n} rows`);
  }
  // Row-count check
  let ok = true;
  for (const t of order) {
    const [a, b] = await Promise.all([src.query(`SELECT count(*)::int n FROM ethquest.${q(t)}`), dst.query(`SELECT count(*)::int n FROM ethquest.${q(t)}`)]);
    if (a.rows[0].n !== b.rows[0].n) { ok = false; console.log(`  MISMATCH ${t}: ${a.rows[0].n} vs ${b.rows[0].n}`); }
  }
  console.log(ok ? "  row counts match" : "  ROW COUNTS DIFFER");
}

try {
  if (step === "mirror" || step === "all") { console.log("mirror EIPsInsight tables"); await mirror(); }
  if (step === "data" || step === "all") { console.log("copy ethquest data"); await data(); }
} finally {
  await src.end();
  await dst.end();
}
