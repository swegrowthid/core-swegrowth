import type { ReactNode } from 'react';
import type { ProfileRow, PublicProfile } from '~/lib/database.types';
import { experiencePeriod, memberSince, seniorityLabel, sortExperiences, waNumber } from '~/lib/profile';
import { Avatar } from './Avatar';

type Props = {
  /** Kontak (email & WA) hanya ada untuk pemilik dan admin; versi publik tidak membawanya. */
  profile: PublicProfile & Partial<Pick<ProfileRow, 'email' | 'whatsapp'>>;
  actions?: ReactNode;
};

/** Tampilan profil member, dipakai di halaman publik, profil sendiri, dan admin. Bagian kosong tidak ditampilkan. */
export function ProfileView({ profile: p, actions }: Props) {
  const name = p.full_name || p.email?.split('@')[0] || 'Member';
  const hasContact = Boolean(p.email || p.whatsapp);
  const role = [p.headline, p.company].filter(Boolean).join(' · ');
  const career = [
    p.seniority && seniorityLabel[p.seniority],
    p.years_experience !== null && `${p.years_experience} tahun pengalaman`,
    p.location,
  ].filter(Boolean);
  const links = [
    p.linkedin_url && { label: 'LinkedIn', href: p.linkedin_url },
    p.github_url && { label: 'GitHub', href: p.github_url },
    p.portfolio_url && { label: 'Portfolio', href: p.portfolio_url },
  ].filter((l): l is { label: string; href: string } => Boolean(l));
  const experiences = sortExperiences(p.experiences);

  return (
    <div className="portal-stack">
      <div className="panel profile-card">
        <Avatar name={name} src={p.avatar_url} size={72} />
        <div className="profile-card-main">
          <h2>{name}</h2>
          {role && <p className="profile-role">{role}</p>}
          {career.length > 0 && <p className="muted">{career.join(' · ')}</p>}
          <span className="chip yellow member-since">{memberSince(p.created_at)}</span>
          {links.length > 0 && (
            <div className="inline-actions mt-12">
              {links.map((l) => (
                <a key={l.label} className="btn btn-ghost sm" href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
        {actions && <div className="profile-card-actions">{actions}</div>}
      </div>

      {hasContact && (
        <div className="panel">
          <div className="panel-head">
            <h2>Kontak</h2>
            <span className="muted">privat · hanya kamu & admin</span>
          </div>
          <dl className="facts">
            {p.email && (
              <div>
                <dt>Email</dt>
                <dd>{p.email}</dd>
              </div>
            )}
            {p.whatsapp && (
              <div>
                <dt>WhatsApp</dt>
                <dd>
                  <a className="text-link" href={`https://wa.me/${waNumber(p.whatsapp)}`} target="_blank" rel="noopener">
                    {p.whatsapp}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {p.bio && (
        <div className="panel">
          <div className="panel-head">
            <h2>Tentang</h2>
          </div>
          <div className="prose">
            {p.bio.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      )}

      {(p.skills.length > 0 || p.tech_stack.length > 0) && (
        <div className="panel">
          {p.skills.length > 0 && <TagGroup title="Keahlian" tags={p.skills} />}
          {p.tech_stack.length > 0 && <TagGroup title="Teknologi" tags={p.tech_stack} />}
        </div>
      )}

      {experiences.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h2>Pengalaman</h2>
          </div>
          <ul className="rows experience-list">
            {experiences.map((e, i) => (
              <li key={i}>
                <div className="row-main">
                  <strong>{e.role}</strong>
                  <span>
                    {e.company} · {experiencePeriod(e)}
                  </span>
                  {e.description && <p>{e.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TagGroup({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div className="tag-group">
      <h3>{title}</h3>
      <div className="tags">
        {tags.map((t) => (
          <span key={t} className="chip">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
