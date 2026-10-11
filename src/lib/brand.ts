export const DEFAULT_BRAND_LOGO = '/logo-digitalmeera.svg';

/**
 * Favicon mengikuti logo pengaturan. Preload dulu: kalau URL rusak,
 * favicon tetap default. Aman dipanggil berulang (idempotent).
 */
export function applyFavicon(logoUrl?: string): void {
  if (typeof document === 'undefined') return;
  const setHref = (href: string) => {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    const apple = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    // Jangan timpa apple-touch-icon PNG (iOS butuh PNG); hanya SVG/icon utama.
  };

  if (!logoUrl) {
    setHref(DEFAULT_BRAND_LOGO);
    return;
  }
  const probe = new Image();
  probe.onload = () => setHref(logoUrl);
  probe.onerror = () => setHref(DEFAULT_BRAND_LOGO);
  probe.src = logoUrl;
}
