import { Link } from 'react-router';
import type { Route } from './+types/portal-community';
import { CommunityChannels } from '~/components/CommunityChannels';
import { LoadError, PortalPage, PortalSection } from '~/components/Portal';
import { requireUser } from '~/lib/auth';
import { fetchWhatsappGroups } from '~/lib/community';

export const meta: Route.MetaFunction = () => [{ title: 'Komunitas — SWE Growth' }, { name: 'robots', content: 'noindex' }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request);
  // null = gagal dimuat, beda dengan "belum ada grup".
  return { groups: await fetchWhatsappGroups().catch(() => null) };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat komunitas…</div>;
}

export default function PortalCommunity({ loaderData: { groups } }: Route.ComponentProps) {
  return (
    <PortalPage title="Komunitas" intro="Obrolan sehari-hari ada di grup. Gabung yang umum dulu, lalu grup sesuai bidangmu.">
      <PortalSection title="Kanal utama">
        <CommunityChannels />
      </PortalSection>

      {groups === null ? (
        <PortalSection title="Grup per bidang">
          <LoadError what="Daftar grup" />
        </PortalSection>
      ) : (
        groups.length > 0 && (
          <PortalSection title="Grup per bidang">
            <div className="panel">
              <ul className="rows">
                {groups.map((g) => (
                  <li key={g.id}>
                    <div className="row-main">
                      <strong>{g.name}</strong>
                      {g.description && <span>{g.description}</span>}
                    </div>
                    <a className="btn btn-ghost sm" href={g.invite_url} target="_blank" rel="noopener">
                      Gabung<span className="visually-hidden"> grup {g.name} (WhatsApp, tab baru)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </PortalSection>
        )
      )}

      <p className="portal-footnote">
        Ruang diskusi di portal sedang kami siapkan; sampai saat itu, obrolan ada di grup di atas. Di semua kanal berlaku{' '}
        <Link className="text-link" to="/code-of-conduct">
          Code of Conduct
        </Link>
        .
      </p>
    </PortalPage>
  );
}
