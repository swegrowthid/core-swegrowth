import type { ReactNode } from 'react';
import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useMatches } from 'react-router';
import type { Route } from './+types/root';
import { Footer } from './components/Footer';
import { Nav } from './components/Nav';
import { AuthProvider } from './lib/auth';
import { DEFAULT_DESCRIPTION } from './lib/site';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import './styles/global.css';
import './styles/pages.css';
import './styles/app.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/**
 * Tab yang dibuka sebelum deploy baru masih merujuk file JS/CSS lama yang sudah tidak ada.
 * Muat ulang sekali supaya dapat versi baru; penanda mencegah muat ulang berulang.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    const key = 'swe-reload-after-deploy';
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
  });
}

export const links: Route.LinksFunction = () => [
  { rel: 'icon', type: 'image/png', href: '/assets/swe-growth-logo.png' },
  // Handshake ke Supabase jalan bersamaan dengan unduhan JS, bukan sesudahnya.
  ...(supabaseUrl ? [{ rel: 'preconnect', href: new URL(supabaseUrl).origin, crossOrigin: 'anonymous' as const }] : []),
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={DEFAULT_DESCRIPTION} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function Shell({ children }: { children: ReactNode }) {
  // Halaman ruang member (handle.portal di portal-layout) punya menu sendiri dan tanpa footer situs.
  const portal = useMatches().some((m) => (m.handle as { portal?: boolean } | undefined)?.portal === true);
  return (
    <AuthProvider>
      <a className="skip-link" href="#konten">
        Lewati ke konten
      </a>
      <Nav portal={portal} />
      <main id="konten" tabIndex={-1}>
        {children}
      </main>
      {!portal && <Footer />}
    </AuthProvider>
  );
}

export default function App() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

/** Ditampilkan di __spa-fallback.html sampai route SPA selesai dimuat. */
export function HydrateFallback() {
  return (
    <Shell>
      <div className="loading-block">Memuat…</div>
    </Shell>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const details = import.meta.env.DEV && error instanceof Error ? error.stack : null;

  return (
    <Shell>
      <title>{notFound ? 'Halaman tidak ditemukan — SWE Growth' : 'Terjadi kesalahan — SWE Growth'}</title>
      <section className="block nf">
        <div className="wrap">
          <p className="mono">{notFound ? 'Error 404' : 'Error'}</p>
          <h1>{notFound ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan'}</h1>
          <p className="sub">
            {notFound
              ? 'Link-nya mungkin sudah berubah atau halamannya sudah dihapus.'
              : 'Coba muat ulang halaman. Kalau masih error, kabari admin.'}
          </p>
          <div className="center-actions">
            <Link className="btn btn-primary" to="/">
              Kembali ke beranda
            </Link>
            <Link className="btn btn-ghost" to="/agenda">
              Lihat agenda
            </Link>
          </div>
          {details && (
            <pre className="error-stack">
              <code>{details}</code>
            </pre>
          )}
        </div>
      </section>
    </Shell>
  );
}
