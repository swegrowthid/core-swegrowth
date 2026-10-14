import { supabase } from './supabase';

/**
 * Bantu tulis teks event dengan Gemini (edge function event-writer, khusus admin).
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
  const { data, error } = await supabase().functions.invoke<Result<T>>('event-writer', { body });
  if (error) {
    // FunctionsHttpError membawa body JSON dari fungsi (mis. admin_only, detail Gemini).
    const res = (error as { context?: Response }).context;
    const parsed = res && typeof res.json === 'function' ? await res.json().catch(() => null) : null;
    return { error: parsed?.error ?? error.message, detail: parsed?.detail } as Result<T>;
  }
  return data ?? {};
}

export const writeDetails = (event: WriterEvent, notes: string, language: WriterLanguage) =>
  call<{ summary: string; highlights: string[]; description: string }>({ kind: 'details', event, notes, language });

export const writeCaption = (event: WriterEvent, notes: string, language: WriterLanguage, platform: CaptionPlatform) =>
  call<{ captions: string[] }>({ kind: 'caption', event, notes, language, platform });

export const writerErrorText = (r: Result<unknown>) =>
  r.status === 'not_configured' ? 'Gemini belum disambungkan: isi secret GEMINI_API_KEY di Supabase lalu deploy fungsi event-writer.'
  : r.error === 'admin_only' ? 'Khusus admin.'
  : r.error === 'title_or_notes_required' ? 'Isi judul atau catatan dulu.'
  : r.error || r.status === 'error' ? `Gagal: ${r.detail ?? r.error}`
  : null;
