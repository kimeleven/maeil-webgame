import pg from "pg";

// Standard pg Pool (OCI PostgreSQL via PgBouncer, or any Postgres URL). Keeps the neon()
// call shape the API code uses: sql`...${v}` and sql.query(text, params) both resolve to rows.
// PG_CA_CERT (PEM) → verify the server cert against the private CA. (t_6ba1c9f1)
const g = globalThis;

function poolConfig(url) {
  const ca = process.env.PG_CA_CERT?.replace(/\\n/g, "\n");
  if (!ca) return { connectionString: url, max: 3 };
  const u = new URL(url);
  ["sslmode", "sslrootcert", "channel_binding"].forEach((k) => u.searchParams.delete(k));
  return { connectionString: u.toString(), ssl: { ca, rejectUnauthorized: true }, max: 3 };
}

export function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!g.__maeilSql || g.__maeilSqlUrl !== url) {
    const pool = new pg.Pool(poolConfig(url));
    const sql = async (strings, ...vals) => {
      let text = strings[0];
      vals.forEach((v, i) => (text += `$${i + 1}` + strings[i + 1]));
      return (await pool.query(text, vals)).rows;
    };
    sql.query = async (text, params = []) => (await pool.query(text, params)).rows;
    sql.pool = pool;
    g.__maeilSql = sql;
    g.__maeilSqlUrl = url;
  }
  return g.__maeilSql;
}

export function toIsoDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function isAnonId(value) {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{8,128}$/.test(value);
}

export function isGameId(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{1,63}$/.test(value);
}

export function parseScore(value) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 0 || score > 1_000_000) return null;
  return score;
}

export function cleanNickname(value) {
  if (typeof value !== "string") return null;
  const nickname = value.trim().slice(0, 24);
  return nickname || null;
}

export async function ensureGuest(sql, anonId, nickname) {
  await sql`
    INSERT INTO guests (anon_id, nickname)
    VALUES (${anonId}, ${nickname})
    ON CONFLICT (anon_id) DO UPDATE
      SET nickname = COALESCE(EXCLUDED.nickname, guests.nickname),
          updated_at = now()
  `;
}
