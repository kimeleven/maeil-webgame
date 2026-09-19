import { getSql } from "../lib/db.js";
import { extrasById, loadFallbackCatalog, mapGameRow } from "../lib/games-fallback.js";
import { send } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    send(res, 405, { error: "GET만 지원합니다." });
    return;
  }

  const extras = extrasById();
  const sql = getSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT id, title, genre, published_on, path, description
        FROM games
        ORDER BY published_on DESC
      `;
      if (rows.length) {
        send(res, 200, {
          source: "neon",
          timezone: "Asia/Seoul",
          games: rows.map((row) => mapGameRow(row, extras.get(row.id) || {})),
        });
        return;
      }
    } catch (error) {
      console.error("GET /api/games", error);
    }
  }

  const fallback = loadFallbackCatalog();
  send(res, 200, { source: "json", ...fallback });
}
