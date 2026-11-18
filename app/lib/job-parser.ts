import type { JobEmploymentType, JobLevel, JobWorkMode } from './database.types';
import { supabase } from './supabase';

/**
 * Isi form loker dari pesan grup WhatsApp dengan Gemini (Netlify edge function
 * /api/job-parser). Field yang tidak disebut di pesan dikembalikan kosong.
 */

export type ParsedJob = {
  title: string;
  company: string;
  /** Email, https://, atau kosong. */
  apply_url: string;
  contact_name: string;
  /** Nomor WA, @username, atau LinkedIn CP; kosong kalau tidak tertulis. */
  contact: string;
  description: string;
  employment_type: JobEmploymentType;
  work_mode: JobWorkMode | '';
  location: string;
  level: JobLevel | '';
  salary: string;
  deadline: string;
};

export type ParseResult = {
  status?: 'ok' | 'not_configured' | 'error';
  error?: string;
  detail?: string;
  job?: ParsedJob;
  /** Nama pengirim di header WhatsApp, tanpa kode angkatan. */
  sender_name?: string;
  /** Yang perlu dilengkapi manusia, mis. nama perusahaan tidak disebut. */
  missing?: string[];
};

export async function parseJobMessage(message: string): Promise<ParseResult> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: 'login_required' };
  try {
    const res = await fetch('/api/job-parser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
    return ((await res.json().catch(() => null)) as ParseResult | null) ?? { error: `HTTP ${res.status}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export const parserErrorText = (r: ParseResult) =>
  r.status === 'not_configured'
    ? 'Isi otomatis belum aktif: GEMINI_API_KEY belum diisi di Netlify. Silakan isi formulir secara manual.'
    : r.error === 'profile_required'
      ? 'Lengkapi profil terlebih dahulu untuk memakai isi otomatis.'
      : r.error === 'login_required'
        ? 'Sesi login telah berakhir. Silakan masuk kembali.'
        : r.error === 'message_too_short'
          ? 'Pesan terlalu pendek. Tempel pesan lowongan secara lengkap.'
          : r.error || r.status === 'error'
            ? `Isi otomatis gagal (${r.detail ?? r.error}). Silakan isi formulir secara manual.`
            : null;
