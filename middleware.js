// Vercel Routing Middleware (framework-free). Until 2026-11-01 00:00 KST, /og/<name>.png is served
// from /og/hw/<name>.png (Halloween frame). After that it does nothing → normal OG, no redeploy needed.
export const config = { matcher: '/og/:path*' };
export const HALLOWEEN_END = 1793458800000; // keep in sync with public/js/theme.js

export function hwTarget(pathname, now = Date.now()) {
  if (now >= HALLOWEEN_END) return null;
  const m = pathname.match(/^\/og\/((?:site|challenge)-[a-z-]+|type-[A-Z]{3}-[a-z-]+|game)\.png$/);
  return m ? `/og/hw/${m[1]}.png` : null;
}

export default function middleware(request) {
  const url = new URL(request.url);
  const t = hwTarget(url.pathname);
  if (!t) return;
  return new Response(null, { headers: { 'x-middleware-rewrite': new URL(t, url).toString() } });
}
