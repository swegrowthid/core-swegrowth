import { Outlet, redirect } from 'react-router';
import type { Route } from './+types/member-layout';
import { fetchProfile, requireUser } from '~/lib/auth';
import { fetchMotivation, isOnboarded } from '~/lib/profile';
import { skipSearchOnlyRevalidation } from '~/lib/revalidate';

/**
 * Halaman yang butuh profil lengkap (dijaga juga di database lewat has_complete_profile):
 * mengirim rekomendasi/loker dan masuk ke aplikasi lain. Sisanya terbuka untuk semua akun.
 */
const REQUIRES_ONBOARDING = ['/rekomendasi/kirim', '/loker/kirim', '/ke'];

/**
 * Semua halaman di bawah layout ini wajib login. Portal terbuka untuk semua akun,
 * termasuk yang baru mendaftar acara: rekap & feedback kegiatan, loker, profil.
 * Yang belum onboarding (kenalan + profil, lihat isOnboarded) diajak melengkapi
 * lewat banner di portal; link grup WhatsApp baru muncul setelah lengkap.
 * Isi khusus verified member dijaga di database (is_member()).
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  if (url.pathname === '/onboarding') return { onboarded: false };

  const [profile, motivation] = await Promise.all([fetchProfile(user.id), fetchMotivation(user.id)]);
  const onboarded = isOnboarded(profile, motivation);
  if (!onboarded && REQUIRES_ONBOARDING.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) {
    throw redirect(`/onboarding?next=${encodeURIComponent(url.pathname + url.search)}`);
  }
  return { onboarded };
}

export const shouldRevalidate = skipSearchOnlyRevalidation;

export function HydrateFallback() {
  return <div className="loading-block">Memuat…</div>;
}

export default function MemberLayout() {
  return <Outlet />;
}
