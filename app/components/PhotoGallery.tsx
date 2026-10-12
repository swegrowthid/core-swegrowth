import { useEffect, useRef, useState } from 'react';
import type { EventPhoto } from '~/lib/database.types';

/** Grid foto dokumentasi; klik untuk melihat besar (panah kiri/kanan untuk geser). */
export function PhotoGallery({ photos, title }: { photos: EventPhoto[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const step = (delta: number) => setOpen((i) => (i === null ? i : (i + delta + photos.length) % photos.length));
  const current = open === null ? null : photos[open];

  return (
    <>
      <ul className="photo-grid">
        {photos.map((p, i) => (
          <li key={`${i}-${p.url}`}>
            <button type="button" onClick={() => setOpen(i)} aria-label={`Lihat foto ${i + 1}${p.caption ? `: ${p.caption}` : ''}`}>
              <img src={p.url} alt={p.caption || `Dokumentasi ${title} ${i + 1}`} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className="photo-viewer"
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
      >
        {current && (
          <figure>
            <img src={current.url} alt={current.caption || `Dokumentasi ${title} ${open! + 1}`} />
            <figcaption>
              <span>{current.caption}</span>
              <span className="muted">{open! + 1} / {photos.length}</span>
            </figcaption>
          </figure>
        )}
        <div className="photo-viewer-actions">
          {photos.length > 1 && <button type="button" className="btn btn-ghost sm" onClick={() => step(-1)}>← Sebelumnya</button>}
          {photos.length > 1 && <button type="button" className="btn btn-ghost sm" onClick={() => step(1)}>Berikutnya →</button>}
          <button type="button" className="btn btn-primary sm" onClick={() => setOpen(null)}>Tutup</button>
        </div>
      </dialog>
    </>
  );
}
