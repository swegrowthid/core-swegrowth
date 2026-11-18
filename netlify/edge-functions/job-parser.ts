/**
 * Isi form loker dari pesan yang di-copy dari grup WhatsApp, pakai Gemini (POST /api/job-parser).
 *
 * Dipanggil form /loker/kirim dengan teks mentah pesan. Hasilnya hanya dikembalikan
 * untuk ditinjau pengirim sebelum disimpan; tidak ada yang disimpan di sini.
 *
 * Env Netlify sama dengan event-writer: GEMINI_API_KEY, GEMINI_MODEL opsional
 * (default gemini-2.5-flash). Key tidak pernah sampai ke browser.
 * Hanya tim loker atau member dengan profil lengkap (dicek dengan sesi login pemanggil).
 */
import type { Config } from '@netlify/edge-functions';

const env = (name: string) => Netlify.env.get(name) ?? '';

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Panggil fungsi boolean Supabase atas nama pemilik JWT. */
async function rpcTrue(fn: string, jwt: string) {
  const url = env('VITE_SUPABASE_URL');
  const key = env('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) return false;
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(5000),
  });
  return res.ok && (await res.json()) === true;
}

const EMPLOYMENT = ['full_time', 'contract', 'internship', 'freelance', 'part_time'];
const WORK_MODE = ['onsite', 'hybrid', 'remote'];
const LEVEL = ['entry', 'junior', 'mid', 'senior', 'lead'];

const SYSTEM = `Kamu membantu tim loker SWE Growth (komunitas software engineer Indonesia) memindahkan info lowongan
dari pesan grup WhatsApp ke form direktori loker. Aturan:
- Hanya pakai fakta yang tertulis di pesan. Jangan mengarang nama perusahaan, gaji, kota, deadline, atau kontak.
- Field yang tidak disebut di pesan diisi string kosong, dan sebutkan di "missing" apa yang perlu dilengkapi manusia.
- Yang menginput sering admin, bukan pemilik loker. "Kirim CV ke saya" berarti CP-nya pengirim pesan di grup,
  bukan admin; jangan isi kontak itu dengan tebakan.
- Abaikan basa-basi pembuka/penutup ("izin share", "terima kasih", "kalo kenalannya kenalan").`;

const PROMPT = (message: string, today: string) => `Hari ini ${today} (WIB).

PESAN DARI GRUP
"""
${message}
"""

Ekstrak lowongannya (kalau ada beberapa, ambil yang pertama):
- title: nama posisi yang rapi, mis. "Senior Fullstack Engineer (Web)". Tulis "Senior", bukan "Sr.".
- company: nama perusahaan; kosong kalau tidak disebut (itu wajar, tidak perlu masuk "missing").
- apply_url: link lamaran resmi (situs karier, LinkedIn job, form) dengan https://, atau email HR/rekruter
  yang memang untuk kirim CV (tulis alamat emailnya saja). Kosong kalau tidak ada.
- contact_name: nama contact person kalau disebut di pesan (mis. "hubungi Mbak Rina"); kosong kalau tidak.
- contact: kontak CP untuk ditanya-tanya: nomor WhatsApp/HP apa adanya, @username, atau link LinkedIn.
  Kosong kalau tidak tertulis. Kalau satu-satunya kontak adalah email lamaran, cukup isi apply_url.
- description: ringkasan 1–3 kalimat Bahasa Indonesia (30–600 karakter): peran, stack/skill utama, syarat penting
  (mis. bahasa Inggris). Jangan ulangi kontak, gaji, atau lokasi.
- employment_type: salah satu ${EMPLOYMENT.join(', ')} (default full_time kalau tidak disebut).
- work_mode: salah satu ${WORK_MODE.join(', ')}; "WFO"/kantor → onsite; kosong kalau tidak disebut.
- location: kota, mis. "Jakarta"; kosong kalau tidak disebut.
- level: salah satu ${LEVEL.join(', ')} atau kosong. "Sr."/senior → senior; "mid - senior" → mid; fresh graduate → entry;
  lead/head/manager → lead.
- salary: teks gaji singkat kalau disebut, mis. "15–25 jt/bulan"; kosong kalau tidak.
- deadline: batas lamaran yyyy-mm-dd kalau disebut; kosong kalau tidak.
- missing: daftar pendek (Bahasa Indonesia) yang perlu dilengkapi atau dicek, terutama kalau apply_url DAN contact
  kosong, mis. "Pesan bilang kirim CV ke pengirim: isi nama & nomor WA pengirim pesan di grup sebagai CP".`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    company: { type: 'STRING' },
    apply_url: { type: 'STRING' },
    contact_name: { type: 'STRING' },
    contact: { type: 'STRING' },
    description: { type: 'STRING' },
    employment_type: { type: 'STRING', enum: EMPLOYMENT },
    work_mode: { type: 'STRING' },
    location: { type: 'STRING' },
    level: { type: 'STRING' },
    salary: { type: 'STRING' },
    deadline: { type: 'STRING' },
    missing: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['title', 'company', 'apply_url', 'contact_name', 'contact', 'description', 'employment_type', 'missing'],
};

async function gemini(prompt: string) {
  const model = env('GEMINI_MODEL') || 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  });
  if (!res.ok) throw new Error(`gemini_${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  const text = body.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error(`gemini_empty: ${body.candidates?.[0]?.finishReason ?? body.promptFeedback?.blockReason ?? 'no_text'}`);
  return JSON.parse(text);
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oneOf = (v: unknown, list: string[]) => (typeof v === 'string' && list.includes(v) ? v : '');

/** Nilai kontak yang lolos aturan form: email, https://, atau kosong. */
function applyUrl(v: string) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return v;
  if (/^https:\/\/\S+$/.test(v)) return v;
  return '';
}

export default async (req: Request) => {
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  if (!env('GEMINI_API_KEY')) return reply(200, { status: 'not_configured' });

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!jwt) return reply(401, { error: 'login_required' });
  const allowed =
    (await rpcTrue('is_job_poster', jwt).catch(() => false)) || (await rpcTrue('has_complete_profile', jwt).catch(() => false));
  if (!allowed) return reply(403, { error: 'profile_required' });

  const input = await req.json().catch(() => ({}));
  const message = str(input.message, 4000);
  if (message.length < 20) return reply(400, { error: 'message_too_short' });

  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  try {
    const r = await gemini(PROMPT(message, today));
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(r.deadline ?? '') && r.deadline >= today ? r.deadline : '';
    return reply(200, {
      status: 'ok',
      job: {
        title: str(r.title, 120),
        company: str(r.company, 120),
        apply_url: applyUrl(str(r.apply_url, 300)),
        contact_name: str(r.contact_name, 80),
        contact: str(r.contact, 200),
        description: str(r.description, 1000),
        employment_type: oneOf(r.employment_type, EMPLOYMENT) || 'full_time',
        work_mode: oneOf(r.work_mode, WORK_MODE),
        location: str(r.location, 80),
        level: oneOf(r.level, LEVEL),
        salary: str(r.salary, 80),
        deadline,
      },
      missing: Array.isArray(r.missing)
        ? r.missing
            .map((m: unknown) => str(m, 200))
            .filter(Boolean)
            .slice(0, 5)
        : [],
    });
  } catch (e) {
    return reply(502, { status: 'error', detail: String(e).slice(0, 300) });
  }
};

export const config: Config = { path: '/api/job-parser' };
