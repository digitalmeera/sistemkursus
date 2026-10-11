/**
 * Mengubah sumber gambar (data: URL atau http(s) Drive/lainnya) menjadi
 * dataURL yang aman di-embed ke canvas/jsPDF.
 * URL remote diambil lewat proxy same-origin /api/img agar bebas CORS/taint.
 * Mengembalikan '' jika gagal — pemanggil wajib fallback ke placeholder.
 */
export async function resolveCardImage(src?: string): Promise<string> {
  if (!src) return '';
  if (src.startsWith('data:image')) return src;
  if (!src.startsWith('http')) return '';

  const candidates: string[] = [];
  if (typeof window !== 'undefined') {
    candidates.push(`/api/img?url=${encodeURIComponent(src)}`);
  }
  candidates.push(src);

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith('image/') || blob.size === 0 || blob.size > 8 * 1024 * 1024) continue;
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl.startsWith('data:image')) return dataUrl;
    } catch {
      // coba kandidat berikutnya
    }
  }
  return '';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    } catch {
      resolve('');
    }
  });
}

/** Tebak format jsPDF (JPEG/PNG) dari prefix dataURL. */
export function sniffImageFormat(dataUrl: string): 'JPEG' | 'PNG' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  return 'JPEG';
}
