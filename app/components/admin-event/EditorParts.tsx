import type { ActivityRow } from '~/lib/database.types';
import { useState, type ReactNode } from 'react';
import { downloadEventPoster } from '~/lib/event-poster';

export function EditorSection({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="editor-section">
      <legend>
        <span className="editor-n">{n}</span>
        {title}
      </legend>
      {hint && <p className="form-sub">{hint}</p>}
      {children}
    </fieldset>
  );
}

/** Unduh poster PNG (1080×1350) dari data event yang tersimpan, siap dibagikan. */
export function PosterButton({ activity, organizer }: { activity: ActivityRow; organizer: string | null }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-ghost sm"
      type="button"
      disabled={busy}
      title="Dari data yang sudah disimpan"
      onClick={async () => {
        setBusy(true);
        try {
          await downloadEventPoster(activity, organizer);
        } catch (e) {
          alert(`Poster gagal dibuat: ${e instanceof Error ? e.message : e}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Membuat poster…' : 'Download poster'}
    </button>
  );
}

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-ghost sm"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? 'Tersalin ✓' : 'Salin link publik'}
    </button>
  );
}
