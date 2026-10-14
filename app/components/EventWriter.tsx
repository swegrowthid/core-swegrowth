import { useState, type RefObject } from 'react';
import { RECURRENCE_LABEL } from '~/lib/activities';
import { val, wibToIso } from '~/lib/admin-form';
import type { Recurrence } from '~/lib/database.types';
import {
  CAPTION_PLATFORMS,
  writeCaption,
  writeDetails,
  writerErrorText,
  type CaptionPlatform,
  type WriterEvent,
  type WriterLanguage,
} from '~/lib/event-writer';
import { formatWibDay, formatWibTime } from '~/lib/format';

const MODE_LABEL: Record<string, string> = { online: 'Online', offline: 'Offline', hybrid: 'Hybrid' };

/** Baca isi form editor event saat ini (belum tentu tersimpan) untuk dikirim ke Gemini. */
function readEvent(form: HTMLFormElement, organizers: Record<string, string>, publicUrl: string | null): WriterEvent {
  const f = new FormData(form);
  const starts = wibToIso(val(f, 'starts_at'));
  const ends = wibToIso(val(f, 'ends_at'));
  const recurrence = val(f, 'recurrence') as Recurrence | '';
  const price = Number.parseInt(val(f, 'price_idr') || '0', 10);
  return {
    title: val(f, 'title'),
    summary: val(f, 'summary'),
    description: val(f, 'description'),
    highlights: val(f, 'highlights').split('\n').map((h) => h.trim()).filter(Boolean),
    speaker: val(f, 'speaker'),
    speaker_title: val(f, 'speaker_title'),
    organizer: organizers[val(f, 'organizer_group_id')] ?? 'SWE Growth',
    schedule: starts
      ? `${formatWibDay(starts)}, ${formatWibTime(starts).replace(' WIB', '')}${ends ? `–${formatWibTime(ends)}` : ' WIB'}${recurrence ? ` (${RECURRENCE_LABEL[recurrence]})` : ''}`
      : '',
    mode: MODE_LABEL[val(f, 'mode')] ?? '',
    location: val(f, 'location'),
    price: price > 0 ? `Rp${price.toLocaleString('id-ID')}` : 'Gratis',
    url: publicUrl ?? '',
  };
}

/** Isi field uncontrolled di form editor, lalu kabari React/browser bahwa nilainya berubah. */
function setField(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * Asisten tulis Gemini di editor event: (1) isi ringkasan, poin bahasan, dan
 * deskripsi; (2) buat caption media sosial. Admin selalu meninjau hasilnya;
 * isi form baru tersimpan saat tombol Simpan ditekan.
 */
export function EventWriter({
  formRef,
  organizers,
  publicUrl,
}: {
  formRef: RefObject<HTMLFormElement | null>;
  organizers: Record<string, string>;
  publicUrl: string | null;
}) {
  const [notes, setNotes] = useState('');
  const [language, setLanguage] = useState<WriterLanguage>('id');
  const [platform, setPlatform] = useState<CaptionPlatform>('instagram');
  const [busy, setBusy] = useState<'details' | 'caption' | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const current = () => (formRef.current ? readEvent(formRef.current, organizers, publicUrl) : null);

  const fillDetails = async () => {
    const event = current();
    if (!event || !formRef.current) return;
    if (!event.title && !notes.trim()) return setMessage({ kind: 'error', text: 'Isi judul atau catatan dulu.' });
    if ((event.summary || event.description || event.highlights.length) && !confirm('Ringkasan, poin bahasan, dan deskripsi yang sekarang akan diganti hasil Gemini. Lanjut?')) return;
    setBusy('details');
    setMessage(null);
    const r = await writeDetails(event, notes.trim(), language);
    setBusy(null);
    const error = writerErrorText(r);
    if (error) return setMessage({ kind: 'error', text: error });
    const form = formRef.current;
    setField(form, 'summary', r.summary ?? '');
    setField(form, 'highlights', (r.highlights ?? []).join('\n'));
    setField(form, 'description', r.description ?? '');
    setMessage({ kind: 'success', text: 'Ringkasan, poin bahasan, dan deskripsi sudah terisi. Cek dan sunting dulu, lalu tekan Simpan.' });
  };

  const makeCaption = async () => {
    const event = current();
    if (!event) return;
    if (!event.title && !notes.trim()) return setMessage({ kind: 'error', text: 'Isi judul atau catatan dulu.' });
    setBusy('caption');
    setMessage(null);
    const r = await writeCaption(event, notes.trim(), language, platform);
    setBusy(null);
    const error = writerErrorText(r);
    if (error) return setMessage({ kind: 'error', text: error });
    setCaptions(r.captions ?? []);
  };

  const copy = async (i: number) => {
    await navigator.clipboard.writeText(captions[i]);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="writer">
      <div className="writer-controls">
        <textarea
          aria-label="Catatan untuk Gemini"
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={'Catatan (opsional): poin penting, target peserta, gaya bahasa…\nmis. "untuk fresh graduate, tekankan sesi tanya jawab dan networking"'}
        />
        <div className="inline-actions">
          <select aria-label="Bahasa" value={language} onChange={(e) => setLanguage(e.target.value as WriterLanguage)}>
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </select>
          <button className="btn btn-ghost sm" type="button" disabled={busy !== null} onClick={fillDetails}>
            {busy === 'details' ? 'Menulis…' : '✨ Isi detail acara'}
          </button>
          <span className="writer-sep" aria-hidden="true" />
          <select aria-label="Platform caption" value={platform} onChange={(e) => setPlatform(e.target.value as CaptionPlatform)}>
            {(Object.keys(CAPTION_PLATFORMS) as CaptionPlatform[]).map((p) => <option key={p} value={p}>{CAPTION_PLATFORMS[p]}</option>)}
          </select>
          <button className="btn btn-ghost sm" type="button" disabled={busy !== null} onClick={makeCaption}>
            {busy === 'caption' ? 'Menulis…' : '✨ Buat caption'}
          </button>
        </div>
        <small className="field-hint">Memakai isi form saat ini (judul, jadwal, pembicara, dst.), termasuk yang belum disimpan. Selalu cek fakta sebelum dipakai.</small>
      </div>
      {message && <p className={`form-message ${message.kind}`}>{message.text}</p>}
      {captions.length > 0 && (
        <ol className="writer-captions">
          {captions.map((c, i) => (
            <li key={i}>
              <textarea aria-label={`Caption ${i + 1}`} rows={8} value={c} onChange={(e) => setCaptions((list) => list.map((x, j) => (j === i ? e.target.value : x)))} />
              <button className="btn btn-ghost sm" type="button" onClick={() => copy(i)}>{copied === i ? 'Tersalin ✓' : 'Salin caption'}</button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
