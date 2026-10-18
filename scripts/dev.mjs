// Local dev/test server: static public/ + vercel.json rewrites + api/*.js.
// DB: DATABASE_URL (Neon) if set, otherwise in-memory PGlite (real Postgres, wasm) so the
// invite/share flows run for real locally. Usage: node scripts/dev.mjs [port]
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PUB = join(ROOT, 'public');
const cfg = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4' };

export async function pgliteSql() {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  const sql = async (strings, ...vals) => { let text = strings[0]; vals.forEach((v, i) => (text += `$${i + 1}` + strings[i + 1])); return (await db.query(text, vals)).rows; };
  sql.query = async (text, params = []) => (await db.query(text, params)).rows;
  sql.db = db;
  return sql;
}

// path-to-regexp-lite for the patterns used in vercel.json
function compile(src) {
  const names = [];
  const re = src.replace(/:(\w+)(\(([^)]+)\))?(\*)?/g, (_, n, __, alt, star) => { names.push(n); return star ? '(.*)' : alt ? `(${alt})` : '([^/]+)'; });
  return { re: new RegExp('^' + re + '$'), names };
}
const rewrites = cfg.rewrites.map((r) => ({ ...compile(r.source), dest: r.destination }));
function rewrite(path) {
  for (const r of rewrites) {
    const m = path.match(r.re); if (!m) continue;
    const p = Object.fromEntries(r.names.map((n, i) => [n, m[i + 1]]));
    return r.dest.replace(/:(\w+)/g, (_, n) => encodeURIComponent(p[n] ?? ''));
  }
  return null;
}

export async function startServer(port = 5173, { sql } = {}) {
  sql = sql || (process.env.DATABASE_URL ? null : await pgliteSql());
  const apis = {};
  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      let path = decodeURIComponent(u.pathname);
      const rw = rewrite(path);
      let search = u.search;
      if (rw) { const ru = new URL(rw, 'http://x'); path = ru.pathname; for (const [k, v] of ru.searchParams) u.searchParams.set(k, v); search = '?' + u.searchParams; }
      if (path.startsWith('/api/')) {
        const name = path.slice(5).replace(/\/$/, '');
        if (!/^[a-z-]+$/.test(name)) { res.statusCode = 404; return res.end(); }
        apis[name] ||= (await import(join(ROOT, 'api', name + '.js'))).default;
        req.url = path + search;
        return apis[name](req, res, sql ? { sql } : {});
      }
      if (/^\/(ko|en|ja|zh-hans|es|pt-br)\/(r|i|c)\//.test(u.pathname)) res.setHeader('Referrer-Policy', 'no-referrer');
      let f = normalize(join(PUB, path));
      if (!f.startsWith(PUB)) { res.statusCode = 403; return res.end(); }
      let s = await stat(f).catch(() => null);
      if (s?.isDirectory()) {
        if (!path.endsWith('/')) { res.statusCode = 308; res.setHeader('Location', path + '/' + u.search); return res.end(); }
        f = join(f, 'index.html'); s = await stat(f).catch(() => null);
      }
      if (!s) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain'); return res.end('not found'); }
      res.setHeader('Content-Type', TYPES[extname(f)] || 'application/octet-stream');
      res.end(await readFile(f));
    } catch (e) { console.error(e); res.statusCode = 500; res.end('error'); }
  });
  await new Promise((ok) => server.listen(port, ok));
  return { server, sql, url: `http://localhost:${server.address().port}` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = await startServer(Number(process.argv[2]) || 5173);
  console.log('dev server', url, process.env.DATABASE_URL ? '(Neon)' : '(PGlite in-memory)');
}
