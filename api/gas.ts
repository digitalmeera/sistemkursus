// Vercel Serverless proxy -> Google Apps Script (pengganti server.ts Express saat demo di Vercel).
// Menerima GET ?action=... dan POST { action, ... } lalu diteruskan ke GAS_URL.
const GAS_URL =
  (process.env.VITE_API_URL || process.env.GAS_URL || '').trim() ||
  'https://script.google.com/macros/s/AKfycbzu-zcoOlitQEF6Rsq7i9Yr-wNdKZqsKJGqWvUsXOQDehqWpsNk-3aYXqX1pC88xr-0lg/exec';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const qs = req.url && req.url.includes('?') ? req.url.split('?')[1] : '';
      const target = qs ? `${GAS_URL}?${qs}` : GAS_URL;
      const r = await fetch(target, { method: 'GET', redirect: 'follow' });
      const text = await r.text();
      res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8');
      return res.status(r.status).send(text);
    }

    let bodyStr = '';
    if (typeof req.body === 'string') bodyStr = req.body;
    else if (req.body && typeof req.body === 'object') bodyStr = JSON.stringify(req.body);
    else bodyStr = '{}';

    const r = await fetch(GAS_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: bodyStr,
    });
    const text = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.status(r.status).send(text);
  } catch (err: any) {
    return res.status(502).json({ success: false, message: `Proxy Vercel gagal menghubungi GAS: ${err?.message || err}` });
  }
}
