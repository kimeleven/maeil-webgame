import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  return neon(url);
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
