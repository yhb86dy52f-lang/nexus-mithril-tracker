const BASE = process.env.OSIRIS_URL || 'http://127.0.0.1:3001';
const cache = new Map();
async function getOsiris(path, ttlMs = 300000) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && (now - hit.at) < ttlMs) return hit.data;
  const res = await fetch(BASE + path, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('OSIRIS ' + res.status + ' en ' + path);
  const data = await res.json();
  cache.set(path, { at: now, data });
  return data;
}
module.exports = { getOsiris };
