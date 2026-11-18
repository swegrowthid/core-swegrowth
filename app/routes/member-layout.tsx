import { Outlet, redirect } from 'react-router';
import type { Route } from './+types/member-layout';
import { fetchProfile, requireUser } from '~/lib/auth';
import { fetchMotivation, isOnboarded } from '~/lib/profile';
import { skipSearchOnlyRevalidation } from '~/lib/revalidate';

/** Halaman profil tetap bisa dibuka walau onboarding belum selesai; di sana member diajak melengkapi. */
const OPEN_BEFORE_ONBOARDING = ['/onboarding', '/portal/profil'];

/**
 * Semua halaman di bawah layout ini wajib login. Akun yang belum selesai
 * onboarding (kenalan + profil, lihat isOnboarded) diarahkan ke /onboarding dulu,
 * kecuali halaman di OPEN_BEFORE_ONBOARDING. Portal terbuka untuk semua akun; isi khusus verified member dijaga di
 * database (is_member()).
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  if (OPEN_BEFORE_ONBOARDING.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return null;

  const [profile, motivation] = await Promise.all([fetchProfile(user.id), fetchMotivation(user.id)]);
  if (!isOnboarded(profile, motivation)) {
    throw redirect(`/onboarding?next=${encodeURIComponent(url.pathname + url.search)}`);
  }
  return null;
}

export const shouldRevalidate = skipSearchOnlyRevalidation;

export function HydrateFallback() {
  return <div className="loading-block">Memuat…</div>;
}

export default function MemberLayout() {
  return <Outlet />;
}
