import { useState } from 'react';
import type { ActivityRow, ActivityRegistrationRow } from '~/lib/database.types';

export function Stats({ activity: a, registrations }: { activity: ActivityRow; registrations: ActivityRegistrationRow[] }) {
  const count = (s: string) => registrations.filter((r) => r.status === s).length;
  const confirmed = count('confirmed');
  const [now] = useState(Date.now);
  const weekAgo = now - 7 * 86_400_000;
  const lastWeek = registrations.filter((r) => r.status !== 'cancelled' && Date.parse(r.created_at) >= weekAgo).length;
  const withQuestion = registrations.filter((r) => r.status !== 'cancelled' && Object.keys(r.answers ?? {}).length > 0).length;

  const tiles = [
    {
      label: 'Terdaftar',
      value: String(confirmed),
      sub: a.capacity ? `dari ${a.capacity} kursi (${Math.round((confirmed / a.capacity) * 100)}%)` : 'tanpa batas kuota',
    },
    { label: 'Waitlist', value: String(count('waitlisted')) },
    { label: 'Batal', value: String(count('cancelled')) },
    { label: '7 hari terakhir', value: String(lastWeek), sub: 'pendaftar baru' },
    { label: 'Mengisi pertanyaan', value: String(withQuestion) },
  ];

  return (
    <div className="stat-row">
      {tiles.map((t) => (
        <div className="stat" key={t.label}>
          <span className="stat-label">{t.label}</span>
          <b className="stat-value">{t.value}</b>
          {t.sub && <span className="stat-sub">{t.sub}</span>}
        </div>
      ))}
    </div>
  );
}
