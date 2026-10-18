import { registrationCode, slugify } from '~/lib/activities';
import type { ActivityRegistrationRow, RegistrationField } from '~/lib/database.types';

export const csvCell = (v: string | null | undefined) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function Registrants({
  activityTitle,
  fields,
  rows,
}: {
  activityTitle: string;
  fields: RegistrationField[];
  rows: ActivityRegistrationRow[];
}) {
  const download = () => {
    const header = ['Kode', 'Nama', 'Email', 'WhatsApp', 'Status', 'Daftar', ...fields.map((f) => f.label)];
    const lines = rows.map((r) =>
      [registrationCode(r.id), r.name, r.email, r.whatsapp, r.status, r.created_at, ...fields.map((f) => r.answers?.[f.id])]
        .map(csvCell)
        .join(','),
    );
    const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pendaftar-${slugify(activityTitle)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="panel" style={{ marginTop: 28 }}>
      <div className="panel-head">
        <h2>Pendaftar ({rows.length})</h2>
        {rows.length > 0 && (
          <button className="btn btn-ghost sm" type="button" onClick={download}>
            Unduh CSV
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="muted">Belum ada pendaftar.</p>
      ) : (
        <div className="registrants">
          <table>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={r.status === 'cancelled' ? { opacity: 0.5 } : undefined}>
                  <td className="mono-code">{registrationCode(r.id)}</td>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.whatsapp ?? '—'}</td>
                  <td>{r.status}</td>
                  <td>
                    {fields
                      .filter((f) => r.answers?.[f.id])
                      .map((f) => (
                        <div key={f.id}>
                          <b>{f.label}:</b> {r.answers[f.id]}
                        </div>
                      ))}
                    {!fields.some((f) => r.answers?.[f.id]) && r.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
