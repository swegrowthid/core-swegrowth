import { redirect } from 'react-router';
import { GOOGLE_REDIRECT_KEY, safeNext, signInWithGoogleIdToken } from '~/lib/auth';
import { hasSupabase } from '~/lib/supabase';

/**
 * Tujuan redirect Google dari startGoogleRedirect (login di HP). Google mengirim
 * id_token di fragment URL; nonce mentah dan tujuan akhir disimpan di sessionStorage
 * sebelum berangkat, lalu token diteruskan ke Supabase lewat signInWithIdToken.
 */
export async function clientLoader() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  // Token jangan tertinggal di riwayat browser.
  history.replaceState(null, '', window.location.pathname);

  let saved: { state?: string; nonce?: string; next?: string } = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(GOOGLE_REDIRECT_KEY) ?? '{}');
  } catch {}
  sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);

  const next = safeNext(saved.next ?? null);
  const fail = `/masuk?error=callback&next=${encodeURIComponent(next)}`;
  const token = hash.get('id_token');
  if (!hasSupabase || !token || !saved.nonce || !saved.state || hash.get('state') !== saved.state) throw redirect(fail);

  const { error } = await signInWithGoogleIdToken(token, saved.nonce);
  if (error) throw redirect(fail);
  throw redirect(next);
}

export function HydrateFallback() {
  return <div className="loading-block">Menyiapkan akunmu…</div>;
}

export default function AuthGoogle() {
  return null;
}
