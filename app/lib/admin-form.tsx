import { useState, type ReactNode } from 'react';
import { useRevalidator } from 'react-router';
import { isoDate } from './format';

/** Helper form untuk halaman admin (/admin dan /admin/event/:id). */

export const val = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

/** <input type="datetime-local"> diisi dalam WIB. */
export const wibToIso = (local: string) => (local ? new Date(`${local}:00+07:00`).toISOString() : null);
/** Kebalikan wibToIso, untuk mengisi form edit. */
export const isoToWib = (iso: string | null) => (iso ? new Date(Date.parse(iso) + 7 * 60 * 60 * 1000).toISOString().slice(0, 16) : '');

/** Tanggal hari ini menurut WIB, yyyy-mm-dd. */
export const todayWib = () => isoDate(new Date(Date.now() + 7 * 60 * 60 * 1000));

/** Jalankan perubahan ke Supabase, tampilkan pesan, lalu muat ulang data halaman. */
export function useMutation() {
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const run = async (fn: () => PromiseLike<{ error: { message: string; code?: string } | null }>, success: string) => {
    setBusy(true);
    setMessage(null);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      setMessage({
        kind: 'error',
        text: error.code === '23505' ? 'Sudah ada data yang sama (slug atau link). Ganti dulu, ya.' : `Belum tersimpan: ${error.message}`,
      });
      return false;
    }
    setMessage({ kind: 'success', text: success });
    await revalidator.revalidate();
    return true;
  };

  const flash = message && <p className={`form-message ${message.kind}`}>{message.text}</p>;
  return { busy, run, flash };
}

export function Field({
  id,
  label,
  optional,
  hint,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional && <small> (opsional)</small>}
      </label>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}
