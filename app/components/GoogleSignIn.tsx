import { useEffect, useState } from 'react';
import { signInWithGoogle, startGoogleRedirect } from '~/lib/auth';
import { hasSupabase } from '~/lib/supabase';

/**
 * Tombol masuk dengan Google. Halaman redirect langsung ke Google lalu kembali ke
 * /auth/google dengan ID token yang diteruskan ke Supabase (lihat startGoogleRedirect),
 * jadi layar Google menyebut domain kita, bukan <project>.supabase.co. Tanpa popup:
 * popup Google Identity Services sering tidak kembali ke halaman di Chrome mobile.
 * Kalau client ID belum diisi, jatuh ke redirect OAuth Supabase.
 */
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type ButtonText = 'signin_with' | 'signup_with' | 'continue_with';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
  </svg>
);

type Props = {
  /** Path internal tujuan setelah login. */
  next: string;
  text?: ButtonText;
  onError: (message: string) => void;
};

const label: Record<ButtonText, string> = {
  signin_with: 'Masuk dengan Google',
  signup_with: 'Daftar dengan Google',
  continue_with: 'Lanjutkan dengan Google',
};

export function GoogleSignIn({ next, text = 'continue_with', onError }: Props) {
  const [busy, setBusy] = useState(false);

  // Kembali dari Google lewat tombol Back (bfcache): tombol jangan tetap terkunci.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => e.persisted && setBusy(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  const login = async () => {
    setBusy(true);
    if (clientId) {
      try {
        await startGoogleRedirect(clientId, next);
        return;
      } catch {
        // sessionStorage/crypto tidak tersedia: pakai redirect OAuth Supabase.
      }
    }
    const { error } = await signInWithGoogle(next);
    if (error) {
      onError('Login Google belum bisa dipakai. Coba lagi sebentar lagi.');
      setBusy(false);
    }
  };

  return (
    <button className="btn btn-provider" type="button" onClick={login} disabled={busy || !hasSupabase} aria-busy={busy}>
      <GoogleIcon />
      {label[text]}
    </button>
  );
}
