import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from './Avatar';
import type { JobInterested as Interested } from '~/lib/database.types';
import { formatDate } from '~/lib/format';
import { fetchJobInterested } from '~/lib/jobs';
import { seniorityLabel, waNumber } from '~/lib/profile';

/**
 * Daftar member yang tertarik pada satu loker, dimuat saat dibuka. Hanya pemilik,
 * pengirim, dan tim loker yang mendapat isinya (dijaga job_interested() di database).
 */
export function JobInterested({ jobId, count, defaultOpen = false }: { jobId: string; count: number; defaultOpen?: boolean }) {
  const [items, setItems] = useState<Interested[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    if (items) return;
    setFailed(false);
    try {
      setItems(await fetchJobInterested(jobId));
    } catch {
      setFailed(true);
    }
  };

  if (count === 0) return <span className="slug">Belum ada peminat.</span>;

  return (
    <details
      className="job-interested"
      open={defaultOpen}
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
      }}
    >
      <summary>{count} tertarik</summary>
      {failed ? (
        <p className="row-error" role="alert">
          Gagal memuat. Tutup lalu buka kembali untuk mencoba lagi.
        </p>
      ) : !items ? (
        <p className="slug">Memuat…</p>
      ) : (
        <ul>
          {items.map((p) => (
            <li key={p.user_id}>
              <Avatar name={p.full_name} src={p.avatar_url} size={32} />
              <div>
                <Link to={`/member/${p.handle}`}>
                  <strong>{p.full_name}</strong>
                </Link>
                <span>{[p.headline, p.seniority && seniorityLabel[p.seniority], p.company].filter(Boolean).join(' · ')}</span>
                {p.tech_stack.length > 0 && <span className="slug">{p.tech_stack.join(', ')}</span>}
                {p.note && <q className="job-interested-note">{p.note}</q>}
                <span className="job-interested-links">
                  {p.whatsapp && (
                    <a href={`https://wa.me/${waNumber(p.whatsapp)}`} target="_blank" rel="noopener">
                      WhatsApp
                    </a>
                  )}
                  {p.linkedin_url && (
                    <a href={p.linkedin_url} target="_blank" rel="noopener">
                      LinkedIn
                    </a>
                  )}
                  <span className="slug">Tertarik {formatDate(p.created_at)}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
