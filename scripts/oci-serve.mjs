// OCI production API server (t_a6a9cd42). nginx serves public/ and proxies /api/* here.
// Reuses scripts/dev.mjs (vercel.json rewrites + api/*.js handlers) with DATABASE_URL (OCI PgBouncer).
// Binds to 127.0.0.1 only. Usage: node scripts/oci-serve.mjs [port]
import http from 'node:http';

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (port, cb) { return listen.call(this, port, '127.0.0.1', cb); };
const { startServer } = await import('./dev.mjs');
const { url } = await startServer(Number(process.argv[2]) || 3102);
console.log('maeil api', url);
