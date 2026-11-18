import type { ReactNode } from 'react';
import { Link, NavLink, useRevalidator } from 'react-router';
import type { Activity } from '~/lib/activities';
import { formatWibTime, relativeFromNow, wibDayParts } from '~/lib/format';

const stroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export const PORTAL_ICONS = {
  home: (
    <svg {...stroke}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />
    </svg>
  ),
  events: (
    <svg {...stroke}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  ),
  community: (
    <svg {...stroke}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19.5c.9-3.1 3.2-4.8 6-4.8s5.1 1.7 6 4.8" />
      <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.9c1.7.6 2.9 2.2 3.5 4.6" />
    </svg>
  ),
  profile: (
    <svg {...stroke}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </svg>
  ),
  arrow: (
    <svg {...stroke}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
};

/**
 * Tujuan utama ruang member. Satu daftar untuk menu samping (desktop) dan bar
 * bawah (HP). Mentor & Diskusi masuk ke sini saat fiturnya ada; bar bawah muat lima.
 */
const DESTINATIONS = [
  { to: '/portal', label: 'Beranda', icon: PORTAL_ICONS.home, end: true },
  { to: '/portal/kegiatan', label: 'Kegiatan', icon: PORTAL_ICONS.events, end: false },
  { to: '/portal/komunitas', label: 'Komunitas', icon: PORTAL_ICONS.community, end: false },
  { to: '/portal/profil', label: 'Profil', icon: PORTAL_ICONS.profile, end: false },
];

export function PortalNav() {
  return (
    <nav className="portal-nav" aria-label="Menu portal">
      <ul>
        {DESTINATIONS.map((d) => (
          <li key={d.to}>
            <NavLink to={d.to} end={d.end} className="pnav-link">
              <span className="pnav-ic">{d.icon}</span>
              <span className="pnav-label">{d.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <p className="pnav-foot">
        <Link to="/code-of-conduct">Code of Conduct</Link>
        <Link to="/privasi">Privasi</Link>
        <Link to="/term-of-service">Syarat Layanan</Link>
      </p>
    </nav>
  );
}

/** Judul halaman portal: h1, satu kalimat konteks, dan aksi utama (opsional) di kanan. */
export function PortalPage({
  title,
  intro,
  actions,
  children,
}: {
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="portal-page">
      <header className="portal-head">
        <div>
          <h1 className="portal-title">{title}</h1>
          {intro && <p className="portal-intro">{intro}</p>}
        </div>
        {actions && <div className="portal-head-actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

/** Bagian di halaman portal: judul di atas krem, isi di bawahnya. */
export function PortalSection({
  id,
  title,
  link,
  children,
}: {
  id?: string;
  title: string;
  link?: { to: string; label: string };
  children: ReactNode;
}) {
  const headingId = id ? `${id}-judul` : undefined;
  return (
    <section className="psec" id={id} aria-labelledby={headingId}>
      <div className="psec-head">
        <h2 id={headingId}>{title}</h2>
        {link && (
          <Link className="psec-link" to={link.to}>
            {link.label}
            {PORTAL_ICONS.arrow}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export type EventRow = { activity: Activity; tag: string; href: string; mine?: boolean };

/** Baris kegiatan: seluruh baris bisa diklik (satu link, satu tab stop). */
export function EventRows({ items }: { items: EventRow[] }) {
  return (
    <ul className="rows event-rows prows">
      {items.map(({ activity: a, tag, href, mine }) => {
        const parts = a.starts_at ? wibDayParts(a.starts_at) : null;
        return (
          <li key={a.id}>
            <span className="date-tile" aria-hidden="true">
              {parts ? (
                <>
                  <b>{parts.day}</b>
                  <span>{parts.month}</span>
                </>
              ) : (
                <span>TBA</span>
              )}
            </span>
            <div className="row-main">
              <Link className="title" to={href}>
                {a.title}
                <span className="visually-hidden">, {tag}</span>
              </Link>
              <span>
                {[a.starts_at && `${relativeFromNow(a.starts_at)} · ${formatWibTime(a.starts_at)}`, a.mode].filter(Boolean).join(' · ') ||
                  'Jadwal menyusul'}
              </span>
            </div>
            <span className={`chip${mine ? ' green' : ''}`} aria-hidden="true">
              {tag}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Pesan gagal muat per bagian, dengan tombol muat ulang data halaman. */
export function LoadError({ what }: { what: string }) {
  const revalidator = useRevalidator();
  const loading = revalidator.state === 'loading';
  return (
    <p className="form-message error load-error" role="alert">
      {what} belum bisa dimuat. Cek koneksi, lalu{' '}
      <button className="link-btn" type="button" disabled={loading} onClick={() => revalidator.revalidate()}>
        {loading ? 'memuat ulang…' : 'muat ulang'}
      </button>
      .
    </p>
  );
}
