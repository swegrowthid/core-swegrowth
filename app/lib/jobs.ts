import { client } from './activities';
import { formatShortDate, relativeFromNow } from './format';
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
  hiring: { form: 'Saya yang merekrut / HR di sana', card: 'Perekrut' },
  insider: { form: 'Saya bekerja di sana (dapat membantu referral)', card: 'Orang dalam' },
  share: { form: 'Hanya meneruskan informasi', card: 'Info dari grup' },
};

export const STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Menunggu review',
  approved: 'Tayang',
  rejected: 'Belum bisa ditayangkan',
  hidden: 'Disembunyikan',
};

export const REJECT_REASONS: { id: JobRejectReason; label: string }[] = [
  { id: 'duplikat', label: 'Sudah ada di daftar loker' },
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

/** Kapan loker dibagikan, gaya obrolan grup: "hari ini", "kemarin", "3 hari lalu", lalu tanggal. */
export function postedAgo(ts: string, now = new Date()) {
  const rel = relativeFromNow(ts, now);
  if (rel === '1 hari lalu') return 'kemarin';
  const days = Number.parseInt(rel, 10);
  return days > 14 ? formatShortDate(ts) : rel;
}

export const formatDeadline = (date: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));

/** Melempar kalau gagal, supaya halaman menampilkan "belum bisa dimuat", bukan "belum ada lowongan". */
export async function getPublishedJobs(): Promise<Job[]> {
  const db = client();
  if (!db) return [];

  const { data, error } = await db.rpc('published_jobs');
  if (error) {
    console.error('Tidak dapat mengambil loker dari Supabase:', error.message);
    throw error;
  }
  return data;
}

/** Tim loker (admin selalu termasuk): kirimannya langsung tayang & bisa mereview. */
export async function fetchIsJobPoster() {
  const { data } = await supabase().rpc('is_job_poster');
  return data === true;
}

/** Loker yang dikirim atau dimiliki akun yang login (semua status). */
export async function fetchMyJobs(userId: string) {
  const { data, error } = await supabase()
    .from('jobs')
    .select('*')
    .or(`submitted_by.eq.${userId},owner_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Profil lengkap = boleh menandai tertarik (sama dengan has_complete_profile() di database). */
export async function fetchHasCompleteProfile() {
  const { data } = await supabase().rpc('has_complete_profile');
  return data === true;
}

/** Tandai/batalkan tertarik; mengembalikan status baru. */
export const toggleJobInterest = (jobId: string) => supabase().rpc('toggle_job_interest', { p_job_id: jobId });

/** Tertarik + catatan relevansi. Data = nomor WA yang membagikan kalau ia bersedia ditanya. */
export const expressJobInterest = (jobId: string, note: string) =>
  supabase().rpc('express_job_interest', { p_job_id: jobId, p_note: note });

/** Catatan relevansi milik sendiri pada satu loker (RLS: hanya baris sendiri); kosong kalau belum ada. */
export async function fetchMyInterestNote(jobId: string, userId: string) {
  const { data } = await supabase().from('job_interests').select('note').eq('job_id', jobId).eq('user_id', userId).maybeSingle();
  return data?.note ?? '';
}

/** Yang membagikan atau tim loker menurunkan lowongan yang sudah terisi/tutup. */
export async function closeJob(jobId: string) {
  const { data, error } = await supabase().rpc('close_job', { p_job_id: jobId });
  return !error && data === true;
}

export const INTEREST_NOTE_MIN = 40;
export const INTEREST_NOTE_MAX = 600;

/** Nama depan untuk sapaan ("Halo Budi,"); kosong kalau tidak ada nama. */
export const firstName = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] ?? '';

/**
 * Kerangka pesan WhatsApp ke yang membagikan / CP. Inti pesannya (relevansi
 * pengalaman) ditulis member sendiri; profil hanya pelengkap di akhir.
 */
export function interestMessage({
  to,
  from,
  job,
  note,
  profileUrl,
}: {
  to: string;
  from: string;
  job: Pick<Job, 'title' | 'company'>;
  note: string;
  profileUrl: string;
}) {
  const greet = firstName(to);
  const position = job.company ? `${job.title} di ${job.company}` : job.title;
  return [
    `${greet ? `Halo ${greet},` : 'Halo,'} saya ${from} dari komunitas SWE Growth.`,
    `Saya melihat lowongan ${position} yang dibagikan di grup loker SWE Growth.`,
    '',
    note.trim(),
    '',
    'Apakah saya boleh bertanya lebih lanjut mengenai posisi dan proses rekrutmennya?',
    '',
    `Profil saya: ${profileUrl}`,
  ].join('\n');
}

/** Yang tertarik pada satu loker (hanya untuk pemilik, pengirim, dan tim loker). */
export async function fetchJobInterested(jobId: string) {
  const { data, error } = await supabase().rpc('job_interested', { p_job_id: jobId });
  if (error) throw error;
  return data;
}

/** Jumlah peminat per loker yang boleh dilihat pemanggil. */
export async function fetchInterestCounts() {
  const { data } = await supabase().rpc('job_interest_counts');
  return new Map((data ?? []).map((r) => [r.job_id, r.total]));
}

/** Pilihan pemilik loker untuk tim loker. */
export async function fetchOwnerCandidates() {
  const { data } = await supabase().rpc('job_owner_candidates');
  return data ?? [];
}

const nameWords = (v: string) =>
  v
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Member yang namanya cocok dengan nama pengirim di grup WA. Nama di WA sering
 * disingkat ("Budi S", "Rina"), jadi cukup kalau semua kata nama pengirim jadi
 * awal kata di nama member. Null kalau tidak ada atau lebih dari satu yang cocok.
 */
export function matchMember<T extends { full_name: string }>(sender: string, members: T[]): T | null {
  const words = nameWords(sender);
  if (words.length === 0) return null;
  const key = words.join(' ');
  const exact = members.filter((m) => nameWords(m.full_name).join(' ') === key);
  if (exact.length > 0) return exact.length === 1 ? exact[0] : null;
  const partial = members.filter((m) => {
    const full = nameWords(m.full_name);
    return words.every((w) => full.some((f) => f.startsWith(w)));
  });
  return partial.length === 1 ? partial[0] : null;
}

/** Kiriman sendiri (untuk ?edit=); null kalau bukan miliknya. */
export async function fetchOwnJob(id: string, userId: string) {
  const { data } = await supabase().from('jobs').select('*').eq('id', id).eq('submitted_by', userId).maybeSingle();
  return data;
}

/** Portal internal: hanya untuk member yang login. */
export const JOBS_PATH = '/portal/loker';
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
  const [jobs, profiles, counts] = await Promise.all([
    db.from('jobs').select('*').order('created_at', { ascending: false }),
    db.rpc('job_submitters'),
    fetchInterestCounts(),
  ]);
  return { jobs: jobs.data ?? [], submitters: profiles.data ?? [], counts };
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
