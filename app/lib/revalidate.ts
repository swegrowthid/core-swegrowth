import type { ShouldRevalidateFunctionArgs } from 'react-router';

/**
 * Filter yang disimpan di URL (?q=, ?tipe=, …) disaring di browser, jadi
 * mengubahnya tidak perlu memuat ulang data. Tanpa ini setiap huruf di kolom
 * cari menjalankan ulang semua loader, dan filter baru tampil setelah respons datang.
 * revalidate() manual (URL sama) dan submit form tetap memuat ulang.
 */
export function skipSearchOnlyRevalidation({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (!formMethod && currentUrl.pathname === nextUrl.pathname && currentUrl.search !== nextUrl.search) return false;
  return defaultShouldRevalidate;
}
