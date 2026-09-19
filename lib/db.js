import{neon}from"@neondatabase/serverless";export function getSql(){const n=process.env.DATABASE_URL?.trim();return n?neon(n):null}export function toIsoDate(n){return n?n instanceof Date?n.toISOString().slice(0,10):String(n).slice(0,10):""}export function isAnonId(n){return"string"==typeof n&&/^[A-Za-z0-9._:-]{8,128}$/.test(n)}export function isGameId(n){return"string"==typeof n&&/^[a-z0-9][a-z0-9-]{1,63}$/.test(n)}export function parseScore(n){const e=Number(n);return!Number.isInteger(e)||e<0||e>1e6?null:e}export function cleanNickname(n){if("string"!=typeof n)return null;return n.trim().slice(0,24)||null}export async function ensureGuest(n,e,t){await(n`
    INSERT INTO guests (anon_id, nickname)
    VALUES (${e}, ${t})
    ON CONFLICT (anon_id) DO UPDATE
      SET nickname = COALESCE(EXCLUDED.nickname, guests.nickname),
          updated_at = now()
  `)}
