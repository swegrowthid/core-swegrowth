import type { ReactNode } from 'react';

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Halaman kebijakan (privasi, syarat layanan): daftar isi + isi, gaya sama dengan Code of Conduct. */
export function LegalPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: ReactNode;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <section className="block">
      <div className="wrap">
        <h1 className="page-title">{title}</h1>
        <p className="muted measure-68 mb-8">{intro}</p>
        <p className="mono mb-32">Terakhir diperbarui: {updated}</p>
      </div>
      <div className="wrap coc-grid">
        <nav className="toc" aria-label="Daftar isi">
          <p className="mono toc-lbl">Daftar Isi</p>
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="prose">
          {sections.map((s) => (
            <section key={s.id}>
              <h2 id={s.id}>{s.title}</h2>
              {s.body}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
