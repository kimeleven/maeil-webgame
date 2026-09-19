import {
  cleanNickname,
  ensureGuest,
  getSql,
  isAnonId,
  isGameId,
  parseScore,
} from "../lib/db.js";
import { queryOf, readBody, send } from "../lib/http.js";

export default async function handler(req, res) {
  const sql = getSql();
  if (!sql) {
    send(res, 503, { error: "DATABASE_URL이 없습니다.", fallback: true });
    return;
  }

  try {
    if (req.method === "GET") {
      await getScores(sql, req, res);
      return;
    }
    if (req.method === "POST") {
      await postScore(sql, req, res);
      return;
    }
    send(res, 405, { error: "GET 또는 POST만 지원합니다." });
  } catch (error) {
    console.error("/api/scores", error);
    send(res, 500, { error: "점수를 처리하지 못했습니다.", fallback: true });
  }
}

async function getScores(sql, req, res) {
  const query = queryOf(req);
  const gameId = query.game_id;
  const anonId = query.anon_id;
  const limit = Math.min(20, Math.max(1, Number(query.limit) || 10));

  if (gameId && !isGameId(gameId)) {
    send(res, 400, { error: "game_id가 올바르지 않습니다." });
    return;
  }
  if (anonId && !isAnonId(anonId)) {
    send(res, 400, { error: "anon_id가 올바르지 않습니다." });
    return;
  }

  if (!gameId && anonId) {
    const rows = await sql`
      SELECT game_id, score
      FROM high_scores
      WHERE anon_id = ${anonId}
    `;
    send(res, 200, {
      source: "neon",
      scores: rows.map((row) => ({ gameId: row.game_id, highScore: row.score })),
    });
    return;
  }

  if (!gameId) {
    send(res, 400, { error: "game_id 또는 anon_id가 필요합니다." });
    return;
  }

  const top = await sql`
    SELECT anon_id, nickname, score
    FROM high_scores
    WHERE game_id = ${gameId}
    ORDER BY score DESC, created_at ASC
    LIMIT ${limit}
  `;

  let mine = null;
  if (anonId) {
    const own = await sql`
      SELECT score FROM high_scores
      WHERE game_id = ${gameId} AND anon_id = ${anonId}
    `;
    mine = own[0]?.score ?? null;
  }

  send(res, 200, {
    source: "neon",
    gameId,
    mine,
    top: top.map((row, index) => ({
      rank: index + 1,
      score: row.score,
      nickname: row.nickname || "게스트",
      mine: Boolean(anonId && row.anon_id === anonId),
    })),
  });
}

async function postScore(sql, req, res) {
  const body = await readBody(req);
  const anonId = body.anon_id;
  const gameId = body.game_id;
  const score = parseScore(body.score);
  const nickname = cleanNickname(body.nickname);

  if (!isAnonId(anonId) || !isGameId(gameId) || score === null) {
    send(res, 400, { error: "anon_id, game_id, score가 필요합니다." });
    return;
  }

  await ensureGuest(sql, anonId, nickname);

  const prev = await sql`
    SELECT score FROM high_scores
    WHERE game_id = ${gameId} AND anon_id = ${anonId}
  `;
  const prevScore = prev[0]?.score ?? 0;

  const saved = await sql`
    INSERT INTO high_scores (game_id, anon_id, nickname, score)
    VALUES (${gameId}, ${anonId}, ${nickname}, ${score})
    ON CONFLICT (game_id, anon_id) DO UPDATE
      SET score = GREATEST(high_scores.score, EXCLUDED.score),
          nickname = COALESCE(EXCLUDED.nickname, high_scores.nickname)
    RETURNING score
  `;

  send(res, 200, {
    source: "neon",
    gameId,
    lastScore: score,
    highScore: saved[0].score,
    isNewHigh: score > prevScore,
  });
}
