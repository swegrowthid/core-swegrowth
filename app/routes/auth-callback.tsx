import { redirect } from 'react-router';
import type { Route } from './+types/auth-callback';
import { safeNext, sessionFromCallback } from '~/lib/auth';
import { hasSupabase } from '~/lib/supabase';

/**
 * Tujuan redirect OAuth Google (alur cadangan, lihat GoogleSignIn). Client Supabase menukar ?code= jadi sesi
 * secara otomatis (detectSessionInUrl), di sini kita tinggal menunggu hasilnya.
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  if (!hasSupabase || url.searchParams.has('error')) throw redirect('/masuk?error=callback');

  const session = await sessionFromCallback(url.searchParams.get('code'));
  if (!session) throw redirect(`/masuk?error=callback&next=${encodeURIComponent(next)}`);

  // Kembali ke halaman asal (mis. detail event untuk lanjut daftar). Halaman
  // portal sendiri yang mengarahkan ke /onboarding kalau perlu (member-layout).
  throw redirect(next);
}

export function HydrateFallback() {
  return <div className="loading-block">Menyiapkan akunmu…</div>;
}

export default function AuthCallback() {
  return null;
}
