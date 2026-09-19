import { cleanNickname, ensureGuest, getSql, isAnonId, isGameId } from "../lib/db.js";
import { queryOf, readBody, send } from "../lib/http.js";

export default async function handler(req, res) {
  const sql = getSql();
  if (!sql) {
    send(res, 503, { error: "DATABASE_URL이 없습니다.", fallback: true });
    return;
  }

  try {
    if (req.method === "GET") {
      await listFavorites(sql, req, res);
      return;
    }
    if (req.method === "POST") {
      await writeFavorite(sql, req, res);
      return;
    }
    send(res, 405, { error: "GET 또는 POST만 지원합니다." });
  } catch (error) {
    console.error("/api/favorites", error);
    send(res, 500, { error: "즐겨찾기를 처리하지 못했습니다.", fallback: true });
  }
}

async function listFor(sql, anonId) {
  const rows = await sql`
    SELECT game_id FROM favorites
    WHERE anon_id = ${anonId}
    ORDER BY created_at DESC
  `;
  return rows.map((row) => row.game_id);
}

async function listFavorites(sql, req, res) {
  const anonId = queryOf(req).anon_id;
  if (!isAnonId(anonId)) {
    send(res, 400, { error: "anon_id가 필요합니다." });
    return;
  }
  send(res, 200, { source: "neon", favorites: await listFor(sql, anonId) });
}

async function writeFavorite(sql, req, res) {
  const body = await readBody(req);
  const anonId = body.anon_id;
  const gameId = body.game_id;
  if (!isAnonId(anonId) || !isGameId(gameId)) {
    send(res, 400, { error: "anon_id와 game_id가 필요합니다." });
    return;
  }

  await ensureGuest(sql, anonId, cleanNickname(body.nickname));

  const existing = await sql`
    SELECT 1 FROM favorites
    WHERE anon_id = ${anonId} AND game_id = ${gameId}
  `;
  const currently = existing.length > 0;
  const next = typeof body.favored === "boolean" ? body.favored : !currently;

  if (next && !currently) {
    await sql`
      INSERT INTO favorites (anon_id, game_id)
      VALUES (${anonId}, ${gameId})
      ON CONFLICT DO NOTHING
    `;
  } else if (!next && currently) {
    await sql`
      DELETE FROM favorites
      WHERE anon_id = ${anonId} AND game_id = ${gameId}
    `;
  }

  send(res, 200, {
    source: "neon",
    gameId,
    favored: next,
    favorites: await listFor(sql, anonId),
  });
}
