import { supabase } from './supabase';

/**
 * Bantu tulis teks event dengan Gemini (Netlify edge function /api/event-writer, khusus admin).
 * Data dikirim dari form yang sedang diisi, jadi bisa dipakai sebelum disimpan.
 */

export type WriterEvent = {
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  speaker: string;
  speaker_title: string;
  organizer: string;
  schedule: string;
  mode: string;
  location: string;
  price: string;
  url: string;
};

export type WriterLanguage = 'id' | 'en';
export type CaptionPlatform = 'instagram' | 'linkedin' | 'whatsapp';

export const CAPTION_PLATFORMS: Record<CaptionPlatform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp / Telegram',
};

type Result<T> = { status?: 'ok' | 'not_configured' | 'error'; error?: string; detail?: string } & Partial<T>;
export type DetailsResult = Result<{ summary: string; highlights: string[]; description: string }>;
export type CaptionResult = Result<{ captions: string[] }>;

async function call<T>(body: Record<string, unknown>): Promise<Result<T>> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: 'login_required' } as Result<T>;
  try {
    const res = await fetch('/api/event-writer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const parsed = await res.json().catch(() => null);
    if (!parsed) return { error: `HTTP ${res.status}` } as Result<T>;
    return parsed as Result<T>;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) } as Result<T>;
  }
}

export const writeDetails = (event: WriterEvent, notes: string, language: WriterLanguage) =>
  call<{ summary: string; highlights: string[]; description: string }>({ kind: 'details', event, notes, language });

export const writeCaption = (event: WriterEvent, notes: string, language: WriterLanguage, platform: CaptionPlatform) =>
  call<{ captions: string[] }>({ kind: 'caption', event, notes, language, platform });

export const writerErrorText = (r: Result<unknown>) =>
  r.status === 'not_configured' ? 'Gemini belum disambungkan: isi GEMINI_API_KEY di Environment variables Netlify lalu deploy ulang.'
  : r.error === 'admin_only' ? 'Khusus admin.'
  : r.error === 'login_required' ? 'Sesi login habis, masuk lagi dulu.'
  : r.error === 'title_or_notes_required' ? 'Isi judul atau catatan dulu.'
  : r.error || r.status === 'error' ? `Gagal: ${r.detail ?? r.error}`
  : null;
