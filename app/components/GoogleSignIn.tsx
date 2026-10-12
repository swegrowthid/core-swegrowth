import { useEffect, useRef, useState } from 'react';
import { makeNonce, signInWithGoogle, signInWithGoogleIdToken, startGoogleRedirect } from '~/lib/auth';
import { hasSupabase } from '~/lib/supabase';

/**
 * Tombol "Sign in with Google" resmi (Google Identity Services). Token dari Google
 * langsung diteruskan ke Supabase, jadi di layar Google yang tercatat adalah
 * domain kita, bukan <project>.supabase.co. Kalau client ID belum diisi atau
 * script Google gagal dimuat (ad-blocker, jaringan), jatuh ke redirect OAuth lama.
 *
 * Di HP tombol ini tidak memakai GIS: popup/FedCM-nya membuka tab baru yang sering
 * tidak kembali ke halaman kita di Chrome mobile. Sebagai gantinya halaman langsung
 * redirect ke Google lalu kembali ke /auth/google (lihat startGoogleRedirect).
 */
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const hasGoogleClientId = Boolean(clientId);
const GIS_SRC = 'https://accounts.google.com/gsi/client';

/** Untuk `links` di route: mulai unduh script Google sejak HTML dibaca, bukan setelah React jalan. */
export const googleSignInLinks = () =>
  clientId
    ? [
        { rel: 'preconnect', href: 'https://accounts.google.com' },
        { rel: 'preload', href: GIS_SRC, as: 'script' },
      ]
    : [];

type GisButtonText = 'signin_with' | 'signup_with' | 'continue_with';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (res: { credential: string }) => void;
            nonce?: string;
            ux_mode?: 'popup' | 'redirect';
            use_fedcm_for_button?: boolean;
          }): void;
          renderButton(
            el: HTMLElement,
            options: { theme?: string; size?: string; text?: GisButtonText; shape?: string; width?: number; logo_alignment?: string; locale?: string },
          ): void;
        };
      };
    };
  }
}

let gisScript: Promise<void> | null = null;

function loadGis() {
  gisScript ??= new Promise<void>((resolve, reject) => {
    if (window.google?.accounts) return resolve();
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisScript = null;
      reject(new Error('gis_load_failed'));
    };
    document.head.appendChild(s);
  });
  return gisScript;
}

/** HP/tablet: layar sentuh tanpa mouse, atau user agent mobile. */
const isMobile = () =>
  window.matchMedia('(pointer: coarse) and (hover: none)').matches || /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

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
  /** Teks tombol resmi Google; dipakai juga untuk tombol cadangan. */
  text?: GisButtonText;
  /** Dipanggil setelah sesi Supabase terbentuk (alur token). */
  onSignedIn: () => void;
  onError: (message: string) => void;
};

const fallbackLabel: Record<GisButtonText, string> = {
  signin_with: 'Masuk dengan Google',
  signup_with: 'Daftar dengan Google',
  continue_with: 'Lanjutkan dengan Google',
};

export function GoogleSignIn({ next, text = 'continue_with', onSignedIn, onError }: Props) {
  const slot = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'loading' | 'gis' | 'fallback'>(clientId && hasSupabase ? 'loading' : 'fallback');
  const [busy, setBusy] = useState(false);

  // Simpan callback terbaru tanpa memicu render ulang tombol Google.
  const handlers = useRef({ onSignedIn, onError });
  handlers.current = { onSignedIn, onError };

  useEffect(() => {
    if (!clientId || !hasSupabase) return;
    if (isMobile()) {
      setMode('fallback');
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const [nonce] = await Promise.all([makeNonce(), loadGis()]);
        if (cancelled || !slot.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce: nonce.hashed,
          ux_mode: 'popup',
          use_fedcm_for_button: true,
          callback: async ({ credential }) => {
            setBusy(true);
            const { error } = await signInWithGoogleIdToken(credential, nonce.raw);
            setBusy(false);
            if (error) handlers.current.onError('Login Google gagal. Coba lagi.');
            else handlers.current.onSignedIn();
          },
        });
        const width = Math.min(400, Math.max(200, Math.round(slot.current.offsetWidth)));
        window.google.accounts.id.renderButton(slot.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          width,
          logo_alignment: 'center',
          locale: 'id',
        });
        setMode('gis');
      } catch {
        if (!cancelled) setMode('fallback');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text]);

  // Kembali dari Google lewat tombol Back (bfcache): tombol jangan tetap terkunci.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => e.persisted && setBusy(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  const redirectLogin = async () => {
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
    <div className="google-signin" aria-busy={busy || mode === 'loading'}>
      {mode !== 'fallback' && !busy && (
        // Tiruan tombol Google di bawah slot: langsung tampil, lalu tertutup iframe Google begitu siap.
        <div className="google-signin-placeholder" aria-hidden="true">
          <GoogleIcon />
          {fallbackLabel[text]}
        </div>
      )}
      {mode !== 'fallback' && <div ref={slot} className="google-signin-slot" hidden={busy} />}
      {mode === 'fallback' && (
        <button className="btn btn-provider" type="button" onClick={redirectLogin} disabled={busy || !hasSupabase}>
          <GoogleIcon />
          {fallbackLabel[text]}
        </button>
      )}
      {busy && mode === 'gis' && <p className="muted google-signin-busy">Menyiapkan akunmu…</p>}
    </div>
  );
}
