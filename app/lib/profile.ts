import type { Experience, MemberMotivationRow, ProfileRow, Seniority } from './database.types';
import { supabase } from './supabase';

export const SENIORITIES: Seniority[] = ['student', 'junior', 'mid', 'senior', 'staff', 'manager'];

export const seniorityLabel: Record<Seniority, string> = {
  student: 'Mahasiswa / belum bekerja',
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  staff: 'Staff / Principal',
  manager: 'Manager / Lead',
};

export const WHATSAPP_RE = /^\+?[0-9 -]{8,20}$/;
export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
/** Link profil LinkedIn pribadi (wajib, untuk memastikan member orang asli). Sama dengan has_complete_profile(). */
export const LINKEDIN_RE = /^https:\/\/([a-z]+\.)?linkedin\.com\/(in|pub)\/[^/?#\s]+/i;
export const isLinkedinUrl = (url: string | null) => Boolean(url && LINKEDIN_RE.test(url));

/** Path profil publik: pakai username kalau sudah ada, kalau belum pakai id. */
export const publicProfilePath = (p: Pick<ProfileRow, 'id' | 'username'>) => `/member/${p.username ?? p.id}`;

const joinedFmt = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
/** "Member sejak Oktober 2026". */
export const memberSince = (createdAt: string) => `Member sejak ${joinedFmt.format(new Date(createdAt))}`;

/** "go, React ,  postgres" → ["go", "React", "postgres"], tanpa duplikat (case-insensitive). */
export function parseTags(raw: string, max = 30) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const tag = part.trim().slice(0, 40);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out.slice(0, max);
}

/** Terima "linkedin.com/in/x" atau "http://…"; simpan sebagai https://. Kosong → null. */
export function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return null;
  return `https://${v.replace(/^https?:\/\//i, '')}`;
}

/** "0812-3456 789" → "628123456789" untuk link wa.me. */
export function waNumber(whatsapp: string) {
  const digits = whatsapp.replace(/\D/g, '');
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

const monthFmt = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "2023-04" → "Apr 2023". */
export const formatMonth = (ym: string) => monthFmt.format(new Date(`${ym}-01T00:00:00Z`));

export const experiencePeriod = (e: Experience) => `${e.start ? formatMonth(e.start) : '?'} – ${e.end ? formatMonth(e.end) : 'sekarang'}`;

/** Terbaru di atas: yang masih berjalan dulu, lalu berdasarkan bulan mulai. */
export const sortExperiences = (list: Experience[]) =>
  [...list].sort((a, b) => Number(b.end === null) - Number(a.end === null) || b.start.localeCompare(a.start));

/** Field profil yang wajib diisi saat onboarding. */
export const isProfileComplete = (p: ProfileRow | null) =>
  Boolean(p && p.full_name && p.whatsapp && isLinkedinUrl(p.linkedin_url) && p.headline && p.seniority && p.tech_stack.length > 0);

/**
 * Onboarding selesai = sudah kenalan + profil lengkap → boleh masuk portal dan
 * dapat link grup WhatsApp. Harus sama dengan has_complete_profile() di
 * supabase/migrations/20261009000000_member_motivation.sql.
 */
export const isOnboarded = (p: ProfileRow | null, m: MemberMotivationRow | null) => Boolean(m) && isProfileComplete(p);

/** Yang masih kurang supaya onboarding selesai (ditampilkan di halaman profil). */
export function missingOnboardingParts(p: ProfileRow | null, m: MemberMotivationRow | null) {
  return [
    !m && 'jawaban kenalan',
    !p?.full_name && 'nama',
    !p?.whatsapp && 'nomor WhatsApp',
    !isLinkedinUrl(p?.linkedin_url ?? null) && 'link LinkedIn',
    !p?.headline && 'peran / headline',
    !p?.seniority && 'level',
    !p?.tech_stack.length && 'teknologi yang dikuasai',
  ].filter((x): x is string => Boolean(x));
}

export async function fetchMotivation(userId: string) {
  const { data } = await supabase().from('member_motivations').select('*').eq('user_id', userId).maybeSingle();
  return data;
}

/** Pertanyaan kenalan, sama dengan form pendaftaran lama di goakal. */
export const MOTIVATION_QUESTIONS = [
  {
    name: 'career_problem',
    label: 'Masalah apa yang kamu rasakan dalam perjalanan karier software engineer-mu?',
    required: true,
  },
  {
    name: 'help_wanted',
    label: 'Apa yang mungkin bisa membantumu mengatasi hal tersebut? Siapa tahu bisa jadi saran untuk program SWE Growth.',
    required: true,
  },
  {
    name: 'join_reason',
    label: 'Kenapa tertarik bergabung di SWE Growth, dan apa yang ingin kamu lakukan setelah bergabung?',
    required: true,
  },
  { name: 'expectations', label: 'Harapanmu setelah bergabung dengan SWE Growth?', required: false },
] as const satisfies readonly { name: keyof MemberMotivationRow; label: string; required: boolean }[];

/** Bagian opsional yang belum diisi — dipakai untuk mengingatkan member melengkapi data. */
export function missingProfileParts(p: ProfileRow) {
  return [!p.username && 'username link profil', p.skills.length === 0 && 'keahlian', p.experiences.length === 0 && 'pengalaman'].filter(
    (x): x is string => Boolean(x),
  );
}

type MotivationAnswers = Pick<MemberMotivationRow, 'career_problem' | 'help_wanted' | 'join_reason'> & Partial<MemberMotivationRow>;

/**
 * Simpan jawaban kenalan. Insert dulu; kalau sudah pernah mengisi (`existingUserId`),
 * perbarui. Upsert tidak dipakai karena butuh hak update atas user_id.
 */
export function saveMotivation(existingUserId: string | null, answers: MotivationAnswers) {
  const table = supabase().from('member_motivations');
  return existingUserId ? table.update(answers).eq('user_id', existingUserId).select().single() : table.insert(answers).select().single();
}

export const updateProfile = (id: string, patch: Partial<ProfileRow>) =>
  supabase().from('profiles').update(patch).eq('id', id).select().single();

/** Profil publik lewat public_profile(): tanpa WhatsApp, email, dan jawaban kenalan. */
export async function fetchPublicProfile(handle: string) {
  const { data } = await supabase().rpc('public_profile', { p_handle: handle }).maybeSingle();
  return data;
}
