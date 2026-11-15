import { isRouteErrorResponse, Link, Outlet, useNavigation } from 'react-router';
import type { Route } from './+types/portal-layout';
import { PortalNav, PortalPage } from '~/components/Portal';

/** Dibaca root (Nav, Footer): halaman di bawah layout ini memakai kerangka ruang member. */
export const handle = { portal: true };

/**
 * Kerangka ruang member: menu samping (desktop) atau bar bawah (HP) + kolom isi.
 * Semua halaman member ada di dalamnya, jadi menu tidak hilang di tengah tugas.
 */
export default function PortalLayout() {
  const navigation = useNavigation();
  const pending = navigation.state === 'loading';
  return (
    <div className="portal-app">
      <PortalNav />
      <div className="portal-main" aria-busy={pending || undefined}>
        {pending && (
          <div className="portal-progress" role="status">
            <span className="visually-hidden">Memuat halaman…</span>
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}

/** Gagal muat halaman portal tetap di dalam kerangka, dengan jalan keluar yang jelas. */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="portal-app">
      <PortalNav />
      <div className="portal-main">
        <PortalPage
          title={notFound ? 'Halaman tidak ditemukan' : 'Halaman ini belum bisa dimuat'}
          intro={
            notFound
              ? 'Link-nya mungkin sudah berubah. Pilih tujuan dari menu.'
              : 'Biasanya karena koneksi. Coba muat ulang; kalau masih gagal, kabari admin di grup komunitas.'
          }
        >
          <div className="inline-actions">
            {!notFound && (
              <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
                Muat ulang
              </button>
            )}
            <Link className="btn btn-ghost" to="/portal">
              Ke beranda portal
            </Link>
          </div>
        </PortalPage>
      </div>
    </div>
  );
}
