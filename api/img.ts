// Proxy gambar same-origin untuk kebutuhan export kartu (PDF/JPG).
// Mengambil byte gambar remote sisi server agar canvas/jsPDF tidak kena CORS/taint.
const MAX_BYTES = 8 * 1024 * 1024;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Gunakan GET' });

  const rawUrl = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ success: false, message: 'Parameter url wajib.' });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return res.status(400).json({ success: false, message: 'URL tidak valid.' });
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return res.status(400).json({ success: false, message: 'Hanya http(s) yang didukung.' });
  }

  try {
    const upstream = await fetch(target.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (DIGITALMEERA card export)' },
    });
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ success: false, message: `Gagal mengambil gambar (${upstream.status}).` });
    }
    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(502).json({ success: false, message: 'URL bukan gambar.' });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return res.status(502).json({ success: false, message: 'Gambar terlalu besar.' });
    }
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(buf);
  } catch (err: any) {
    return res.status(502).json({ success: false, message: `Proxy gambar gagal: ${err?.message || err}` });
  }
}
