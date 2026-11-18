import { useState, type ClipboardEvent } from 'react';
import { SessionSummary } from '~/components/SessionSummary';
import { htmlToMarkdown } from '~/lib/html-to-markdown';

/**
 * Textarea ringkasan sesi (markdown). Menempel teks berformat (halaman ringkasan
 * Zoom, email, Google Docs) otomatis jadi markdown, jadi bold, link, judul, dan
 * daftar tidak hilang. Pratinjau memakai renderer yang sama dengan rekap di portal.
 */
export function SummaryEditor({
  id,
  name,
  defaultValue,
  maxLength,
}: {
  id: string;
  name: string;
  defaultValue: string;
  maxLength: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const [converted, setConverted] = useState(false);

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (!html) return;
    const md = htmlToMarkdown(html);
    if (!md) return;
    e.preventDefault();
    const t = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = t;
    const next = (value.slice(0, start) + md + value.slice(end)).slice(0, maxLength);
    setValue(next);
    setConverted(true);
    requestAnimationFrame(() => t.setSelectionRange(start + md.length, start + md.length));
  };

  return (
    <div className="summary-editor">
      <div className="summary-editor-tabs" role="group" aria-label="Mode ringkasan">
        <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>
          Tulis
        </button>
        <button type="button" aria-pressed={preview} onClick={() => setPreview(true)} disabled={!value.trim()}>
          Pratinjau
        </button>
      </div>
      {/* Tetap di form saat pratinjau (hidden), supaya ikut tersimpan. */}
      <textarea
        id={id}
        name={name}
        rows={10}
        maxLength={maxLength}
        value={value}
        hidden={preview}
        onChange={(e) => {
          setValue(e.target.value);
          setConverted(false);
        }}
        onPaste={onPaste}
        placeholder={'## Poin utama\n- …\n\n## Langkah selanjutnya\n- …'}
      />
      {preview && (
        <div className="summary-editor-preview">
          <SessionSummary markdown={value} />
        </div>
      )}
      {converted && !preview && (
        <p className="summary-editor-note" role="status">
          Format dari teks yang ditempel (bold, link, daftar) diubah ke markdown. Cek hasilnya di Pratinjau.
        </p>
      )}
    </div>
  );
}
