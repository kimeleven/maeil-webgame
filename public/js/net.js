export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const r = await fetch(path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) { const e = new Error((data && data.error) || 'http ' + r.status); e.status = r.status; throw e; }
  return data;
}
