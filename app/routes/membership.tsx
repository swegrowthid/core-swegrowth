import type { Route } from './+types/membership';
import { PortalPage } from '~/components/Portal';
import { MEMBER_BENEFITS } from '~/lib/site';

export const meta: Route.MetaFunction = () => [{ title: 'Membership — SWE Growth' }, { name: 'robots', content: 'noindex' }];

/**
 * Membership berbayar & badge verified belum dibuka (MEMBERSHIP_LIVE di site.ts).
 * Tabel memberships dan is_member() tetap ada untuk saat fitur ini dirilis.
 */
export default function Membership() {
  return (
    <PortalPage title="Membership" intro="Segera hadir. Untuk sekarang, semua yang ada di portal bisa kamu pakai gratis.">
      <div className="panel on-teal coming-soon">
        <h2>Membership & verified member</h2>
        <p>Kami sedang menyiapkan membership untuk mendukung komunitas.</p>
        {MEMBER_BENEFITS.length > 0 && (
          <>
            <p className="mt-14">Yang sedang disiapkan:</p>
            <ul className="plain-list">
              {MEMBER_BENEFITS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </PortalPage>
  );
}
