import { client } from './activities';
import type {
  Database,
  JobEmploymentType,
  JobLevel,
  JobRejectReason,
  JobRow,
  JobStatus,
  JobSubmitterRelation,
  JobWorkMode,
  PublishedJob,
} from './database.types';
import { supabase } from './supabase';

export type Job = PublishedJob;

export const EMPLOYMENT_LABEL: Record<JobEmploymentType, string> = {
  full_time: 'Full-time',
  contract: 'Kontrak',
  internship: 'Magang',
  freelance: 'Freelance',
  part_time: 'Part-time',
};

export const WORK_MODE_LABEL: Record<JobWorkMode, string> = { onsite: 'WFO', hybrid: 'Hybrid', remote: 'Remote' };

export const LEVEL_LABEL: Record<JobLevel, string> = {
  entry: 'Fresh graduate',
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead / Manager',
};

/** Label di form (sudut pandang pengirim) dan di kartu (sudut pandang pembaca). */
export const RELATION_LABEL: Record<JobSubmitterRelation, { form: string; card: string }> = {
  hiring: { form: 'Aku yang hiring / HR di sana', card: 'Yang hiring' },
  insider: { form: 'Aku kerja di sana (bisa bantu referral)', card: 'Orang dalam' },
  share: { form: 'Cuma meneruskan info', card: 'Info dari grup' },
};

export const STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Menunggu review',
  approved: 'Tayang',
  rejected: 'Belum bisa ditayangkan',
  hidden: 'Disembunyikan',
};

export const REJECT_REASONS: { id: JobRejectReason; label: string }[] = [
  { id: 'duplikat', label: 'Sudah ada di direktori' },
  { id: 'kedaluwarsa', label: 'Lowongan sudah tutup' },
  { id: 'kurang_relevan', label: 'Bukan loker tech / software' },
  { id: 'kurang_lengkap', label: 'Info atau link lamaran kurang jelas' },
  { id: 'mencurigakan', label: 'Mencurigakan (minta bayar, penipuan)' },
];

export const rejectReasonLabel = (id: JobRejectReason | null) => REJECT_REASONS.find((r) => r.id === id)?.label ?? null;

export const isEmploymentType = (v: string | null): v is JobEmploymentType => v !== null && v in EMPLOYMENT_LABEL;

/** Info singkat di kartu: tipe, mode kerja + kota, level, gaji. */
export function jobMeta(j: Pick<JobRow, 'employment_type' | 'work_mode' | 'location' | 'level' | 'salary'>) {
  return [
    EMPLOYMENT_LABEL[j.employment_type],
    [WORK_MODE_LABEL[j.work_mode], j.location].filter(Boolean).join(' · '),
    j.level && LEVEL_LABEL[j.level],
    j.salary,
  ].filter(Boolean) as string[];
}

export const formatDeadline = (date: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));

/** Direktori publik (prerender saat build, diperbarui di browser). */
export async function getPublishedJobs(): Promise<Job[]> {
  const db = client();
  if (!db) return [];

  const { data, error } = await db.rpc('published_jobs');
  if (error) {
    console.error('Tidak dapat mengambil loker dari Supabase:', error.message);
    return [];
  }
  return data;
}

/** Tim loker (admin selalu termasuk): kirimannya langsung tayang & bisa mereview. */
export async function fetchIsJobPoster() {
  const { data } = await supabase().rpc('is_job_poster');
  return data === true;
}

/** Kiriman milik akun yang login (semua status). */
export async function fetchMyJobs(userId: string) {
  const { data } = await supabase().from('jobs').select('*').eq('submitted_by', userId).order('created_at', { ascending: false });
  return data ?? [];
}

/** Kiriman sendiri (untuk ?edit=); null kalau bukan miliknya. */
export async function fetchOwnJob(id: string, userId: string) {
  const { data } = await supabase().from('jobs').select('*').eq('id', id).eq('submitted_by', userId).maybeSingle();
  return data;
}

export const JOBS_PATH = '/loker';
export const JOB_SUBMIT_PATH = '/loker/kirim';
export const JOB_MANAGE_PATH = '/loker/kelola';

export const submitJob = (args: Database['public']['Functions']['submit_job']['Args']) => supabase().rpc('submit_job', args);

/**
 * Tarik kiriman sendiri; RLS hanya mengizinkan selama masih pending. Delete yang ditolak RLS
 * tidak memberi error, jadi baris yang terhapus dihitung: 0 berarti kiriman sudah tidak bisa ditarik.
 */
export async function withdrawJob(id: string): Promise<'ok' | 'locked' | 'failed'> {
  const { data, error } = await supabase().from('jobs').delete().eq('id', id).select('id');
  if (error) return 'failed';
  return data && data.length > 0 ? 'ok' : 'locked';
}

// ---------------------------------------------------------------------------
// Kelola (tim loker & admin); hak akses dijaga RLS is_job_poster().
// ---------------------------------------------------------------------------

export async function loadJobManager() {
  const db = supabase();
  const [jobs, profiles] = await Promise.all([
    db.from('jobs').select('*').order('created_at', { ascending: false }),
    db.rpc('job_submitters'),
  ]);
  return { jobs: jobs.data ?? [], submitters: profiles.data ?? [] };
}

export const updateJob = (id: string, patch: Database['public']['Tables']['jobs']['Update']) =>
  supabase().from('jobs').update(patch).eq('id', id);

export const deleteJob = (id: string) => supabase().from('jobs').delete().eq('id', id);

/** Link yang sama (abaikan huruf besar & garis miring di akhir). */
export const normalizeApplyUrl = (url: string) => url.trim().replace(/\/+$/, '').toLowerCase();

/** Tampilan link lamaran: email tanpa "mailto:", URL tanpa "https://". */
export const applyLabel = (url: string) => (url.startsWith('mailto:') ? url.slice(7) : url.replace(/^https:\/\//, ''));

/** Nama perusahaan di kartu; pesan grup kadang tidak menyebutnya. */
export const companyLabel = (company: string) => company || 'Perusahaan tidak disebut';

/**
 * Link untuk kontak CP: nomor HP jadi wa.me, email jadi mailto:, URL apa adanya.
 * null kalau bentuknya tidak dikenali (mis. "@budi di grup"), cukup ditampilkan sebagai teks.
 */
export function contactHref(contact: string) {
  const v = contact.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  if (/^https:\/\/\S+$/.test(v)) return v;
  const digits = v.replace(/[\s().-]/g, '');
  if (/^(\+?62|0)8\d{7,12}$/.test(digits)) return `https://wa.me/62${digits.replace(/^(\+?62|0)/, '')}`;
  return null;
}
