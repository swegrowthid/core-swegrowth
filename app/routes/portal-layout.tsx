import { isRouteErrorResponse, Link, Outlet, useLocation, useNavigation } from 'react-router';
import type { Route } from './+types/portal-layout';
import { PortalNav, PortalPage } from '~/components/Portal';
import { useOnboarded } from '~/lib/onboarding';

/** Dibaca root (Nav, Footer): halaman di bawah layout ini memakai kerangka ruang member. */
export const handle = { portal: true };

/**
 * Kerangka ruang member: menu samping (desktop) atau bar bawah (HP) + kolom isi.
 * Semua halaman member ada di dalamnya, jadi menu tidak hilang di tengah tugas.
 */
export default function PortalLayout() {
  const navigation = useNavigation();
  const pending = navigation.state === 'loading';
  const onboarded = useOnboarded();
  const { pathname, search } = useLocation();
  return (
    <div className="portal-app">
      <PortalNav />
      <div className="portal-main" aria-busy={pending || undefined}>
        {pending && (
          <div className="portal-progress" role="status">
            <span className="visually-hidden">Memuat halaman…</span>
          </div>
        )}
        {/* Portal terbuka untuk semua akun; yang belum lengkap diajak tanpa dihalangi. Profil & Komunitas punya ajakannya sendiri. */}
        {!onboarded && !pathname.startsWith('/portal/profil') && pathname !== '/portal/komunitas' && (
          <p className="portal-onboard-note">
            <span>
              <strong>Profilmu belum lengkap.</strong> Lengkapi supaya bisa masuk grup WhatsApp komunitas, menandai Tertarik di loker, dan
              berbagi rekomendasi.
            </span>
            <Link className="btn btn-primary sm" to={`/onboarding?next=${encodeURIComponent(pathname + search)}`}>
              Lengkapi profil
            </Link>
          </p>
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
