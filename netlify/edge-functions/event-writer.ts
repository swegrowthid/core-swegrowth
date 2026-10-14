/**
 * Bantu admin menulis teks event dengan Gemini (POST /api/event-writer).
 *
 * Dipanggil editor event (/admin/event/:id) dengan data event yang sedang
 * diisi (belum tentu tersimpan). Dua jenis:
 *   kind "details" → ringkasan, poin "yang akan dibahas", dan deskripsi untuk halaman event
 *   kind "caption" → caption media sosial (Instagram / LinkedIn / WhatsApp)
 * Hasilnya hanya dikembalikan ke admin untuk ditinjau; tidak ada yang disimpan di sini.
 *
 * Env Netlify: GEMINI_API_KEY (dari https://aistudio.google.com/apikey),
 * GEMINI_MODEL opsional (default gemini-2.5-flash). Key tidak pernah sampai ke browser.
 * Hanya admin (is_admin() di Supabase, dicek dengan sesi login pemanggil) yang boleh memakai.
 */
import type { Config } from '@netlify/edge-functions';

const env = (name: string) => Netlify.env.get(name) ?? '';

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Tanya Supabase apakah pemilik JWT ini admin (RLS/is_admin() memakai email di token). */
async function isAdmin(jwt: string) {
  const url = env('VITE_SUPABASE_URL');
  const key = env('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) return false;
  const res = await fetch(`${url}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(5000),
  });
  return res.ok && (await res.json()) === true;
}

type EventInput = {
  title?: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  speaker?: string;
  speaker_title?: string;
  organizer?: string;
  schedule?: string;
  mode?: string;
  location?: string;
  price?: string;
  url?: string;
};

const PLATFORMS: Record<string, string> = {
  instagram: 'Instagram (feed). Hook kuat di baris pertama, paragraf pendek, emoji secukupnya, ajakan daftar lewat "link di bio" plus link event, 5–8 hashtag relevan di akhir. Maksimal ±1.500 karakter.',
  linkedin: 'LinkedIn. Nada profesional tapi hangat, buka dengan insight/pertanyaan yang relevan untuk software engineer, poin-poin singkat, emoji minimal, cantumkan link event, 3–5 hashtag. Maksimal ±1.800 karakter.',
  whatsapp: 'broadcast WhatsApp/Telegram. Ringkas dan mudah dipindai: judul tebal pakai *bintang*, jadwal, tempat, pembicara, 2–4 poin yang dibahas, link daftar. Tanpa hashtag. Maksimal ±900 karakter.',
};

const SYSTEM = `Kamu copywriter untuk SWE Growth, komunitas software engineer Indonesia yang suportif dan tidak menggurui.
Tulis teks acara yang jelas, jujur, dan bikin orang ingin ikut. Aturan:
- Hanya pakai fakta dari data acara dan catatan admin. Jangan mengarang jadwal, harga, nama, angka, kuota, atau benefit.
- Kalau sebuah data kosong, lewati saja; jangan tulis placeholder seperti [tanggal].
- Hindari klise berlebihan ("jangan sampai ketinggalan!!!", "kesempatan emas") dan klaim bombastis.
- Teks polos tanpa markdown kecuali diminta (format WhatsApp boleh *tebal*).`;

function describe(e: EventInput, notes: string) {
  const rows: [string, string | undefined][] = [
    ['Judul', e.title],
    ['Penyelenggara', e.organizer],
    ['Jadwal', e.schedule],
    ['Format', e.mode],
    ['Lokasi', e.location],
    ['Biaya', e.price],
    ['Pembicara', e.speaker && [e.speaker, e.speaker_title].filter(Boolean).join(' — ')],
    ['Ringkasan', e.summary],
    ['Yang akan dibahas', e.highlights?.length ? e.highlights.map((h) => `- ${h}`).join('\n') : undefined],
    ['Deskripsi', e.description],
    ['Link event', e.url],
  ];
  const data = rows.filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}: ${v!.trim()}`).join('\n');
  return `DATA ACARA\n${data || '(kosong)'}${notes ? `\n\nCATATAN ADMIN (ikuti)\n${notes}` : ''}`;
}

async function gemini(prompt: string, schema: Record<string, unknown>) {
  const model = env('GEMINI_MODEL') || 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, responseMimeType: 'application/json', responseSchema: schema },
    }),
  });
  if (!res.ok) throw new Error(`gemini_${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  const text = body.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error(`gemini_empty: ${body.candidates?.[0]?.finishReason ?? body.promptFeedback?.blockReason ?? 'no_text'}`);
  return JSON.parse(text);
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);

export default async (req: Request) => {
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  if (!env('GEMINI_API_KEY')) return reply(200, { status: 'not_configured' });

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!jwt) return reply(401, { error: 'login_required' });
  if (!(await isAdmin(jwt).catch(() => false))) return reply(403, { error: 'admin_only' });

  const input = await req.json().catch(() => ({}));
  const raw = (input.event ?? {}) as Record<string, unknown>;
  const event: EventInput = {
    title: str(raw.title, 200),
    summary: str(raw.summary, 600),
    description: str(raw.description, 6000),
    highlights: Array.isArray(raw.highlights) ? raw.highlights.map((h) => str(h, 200) ?? '').filter(Boolean).slice(0, 8) : [],
    speaker: str(raw.speaker, 120),
    speaker_title: str(raw.speaker_title, 120),
    organizer: str(raw.organizer, 120),
    schedule: str(raw.schedule, 200),
    mode: str(raw.mode, 40),
    location: str(raw.location, 200),
    price: str(raw.price, 60),
    url: str(raw.url, 300),
  };
  const notes = str(input.notes, 2000)?.trim() ?? '';
  const language = input.language === 'en' ? 'Bahasa Inggris' : 'Bahasa Indonesia santai-profesional (sapaan "kamu")';
  if (!event.title && !notes) return reply(400, { error: 'title_or_notes_required' });

  try {
    if (input.kind === 'details') {
      const result = await gemini(
        `${describe(event, notes)}\n\nTulis dalam ${language} isi halaman acara:\n` +
          '- summary: 1–2 kalimat (maks 300 karakter) yang menjelaskan acara ini untuk siapa dan apa yang didapat.\n' +
          '- highlights: 3–6 poin "yang akan dibahas", masing-masing satu kalimat pendek yang bikin penasaran (boleh berupa pertanyaan).\n' +
          '- description: 2–4 paragraf dipisah baris kosong: konteks/kenapa topik ini penting, siapa yang cocok ikut, dan (kalau ada) tentang pembicara. Jangan ulangi jadwal/lokasi/harga.\n' +
          'Kalau data acara sudah punya isi, perbaiki dan lengkapi, jangan buang fakta yang ada.',
        {
          type: 'OBJECT',
          properties: {
            summary: { type: 'STRING' },
            highlights: { type: 'ARRAY', items: { type: 'STRING' } },
            description: { type: 'STRING' },
          },
          required: ['summary', 'highlights', 'description'],
        },
      );
      return reply(200, {
        status: 'ok',
        summary: str(result.summary, 500) ?? '',
        highlights: Array.isArray(result.highlights) ? result.highlights.map((h: unknown) => str(h, 200) ?? '').filter(Boolean).slice(0, 8) : [],
        description: str(result.description, 6000) ?? '',
      });
    }

    if (input.kind === 'caption') {
      const platform = PLATFORMS[input.platform as string] ? (input.platform as string) : 'instagram';
      const result = await gemini(
        `${describe(event, notes)}\n\nTulis dalam ${language} caption untuk ${PLATFORMS[platform]}\n` +
          'Sertakan judul, waktu, format/lokasi, dan pembicara kalau ada di data. Buat 2 variasi dengan pembuka berbeda.',
        {
          type: 'OBJECT',
          properties: { captions: { type: 'ARRAY', items: { type: 'STRING' } } },
          required: ['captions'],
        },
      );
      const captions = Array.isArray(result.captions) ? result.captions.map((c: unknown) => str(c, 3000) ?? '').filter(Boolean).slice(0, 3) : [];
      return reply(200, { status: 'ok', captions });
    }

    return reply(400, { error: 'unknown_kind' });
  } catch (e) {
    return reply(502, { status: 'error', detail: String(e).slice(0, 300) });
  }
};

export const config: Config = { path: '/api/event-writer' };
