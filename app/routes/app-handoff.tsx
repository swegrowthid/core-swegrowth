import { Link } from 'react-router';
import type { Route } from './+types/app-handoff';
import { requireUser, requestAppHandoff } from '~/lib/auth';

export const meta: Route.MetaFunction = () => [{ title: 'Membuka aplikasi — SWE Growth' }, { name: 'robots', content: 'noindex' }];

/**
 * Login lintas app: minta token sekali pakai ke edge function app-handoff,
 * lalu pindah ke app tujuan. App tujuan menukarnya jadi sesinya sendiri.
 */
export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  await requireUser(request);
  const returnTo = new URL(request.url).searchParams.get('return');
  const url = await requestAppHandoff(params.app, returnTo);
  if (!url) return { failed: true };

  // replace: URL berisi token jangan tersimpan di riwayat browser.
  window.location.replace(url);
  return { failed: false };
}

export function HydrateFallback() {
  return <div className="loading-block">Membuka aplikasi…</div>;
}

export default function AppHandoff({ loaderData }: Route.ComponentProps) {
  if (!loaderData.failed) return <div className="loading-block">Membuka aplikasi…</div>;
  return (
    <section className="block">
      <div className="wrap narrow-wrap">
        <h1 className="page-title">Aplikasi belum bisa dibuka</h1>
        <p className="muted mb-20">Coba lagi sebentar lagi. Kalau masih gagal, kabari admin.</p>
        <div className="inline-actions">
          <button className="btn btn-primary sm" type="button" onClick={() => window.location.reload()}>
            Coba lagi
          </button>
          <Link className="btn btn-ghost sm" to="/portal">
            Ke portal
          </Link>
        </div>
      </div>
    </section>
  );
}
