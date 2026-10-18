import { useState } from 'react';
import type { EventPhoto } from '~/lib/database.types';
import { uploadEventPhoto } from '~/lib/admin-data';

export const MAX_PHOTOS = 40;
export const MAX_SIDE = 1920;

/** Perkecil foto (sisi terpanjang 1920px, JPEG) supaya cepat dimuat dan di bawah batas 5 MB bucket. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return blob ?? file;
}

/**
 * Foto diunggah ke Supabase Storage (bucket event-photos) begitu dipilih, lalu
 * daftarnya (urutan + keterangan) ikut tersimpan saat tombol Simpan ditekan.
 * Bisa juga menempel link gambar yang sudah ada di tempat lain.
 */
export function PhotosEditor({ initial, folder }: { initial: EventPhoto[]; folder: string }) {
  const [photos, setPhotos] = useState(initial);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const room = MAX_PHOTOS - photos.length;

  const update = (i: number, patch: Partial<EventPhoto>) => setPhotos((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i: number, delta: number) =>
    setPhotos((list) => {
      const next = [...list];
      const [item] = next.splice(i, 1);
      next.splice(Math.max(0, Math.min(next.length, i + delta)), 0, item);
      return next;
    });

  const upload = async (files: FileList | null) => {
    const picked = Array.from(files ?? []).slice(0, room);
    if (picked.length === 0) return;
    setError(null);
    setUploading(picked.length);
    for (const file of picked) {
      const body = await shrinkPhoto(file);
      const ext = body.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() ?? 'jpg').toLowerCase();
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError, url } = await uploadEventPhoto(path, body, body.type || file.type);
      if (uploadError) setError(`Gagal mengunggah ${file.name}: ${uploadError.message}`);
      else setPhotos((list) => [...list, { url, caption: '' }]);
      setUploading((n) => n - 1);
    }
  };

  const addLink = () => {
    if (!link.startsWith('https://')) return setError('Link foto harus diawali https://');
    setError(null);
    setPhotos((list) => [...list, { url: link, caption: '' }]);
    setLink('');
  };

  return (
    <div className="photos-editor">
      <input type="hidden" name="photos" value={JSON.stringify(photos.map((p) => ({ url: p.url, caption: p.caption.trim() })))} />
      {error && <p className="form-message error">{error}</p>}
      {photos.length > 0 && (
        <ul className="photos-editor-list">
          {photos.map((p, i) => (
            <li key={`${i}-${p.url}`}>
              <img src={p.url} alt="" />
              <div>
                <input
                  aria-label={`Keterangan foto ${i + 1}`}
                  value={p.caption}
                  maxLength={200}
                  placeholder={i === 0 ? 'Keterangan (opsional) · foto sampul' : 'Keterangan (opsional)'}
                  onChange={(e) => update(i, { caption: e.target.value })}
                />
                <div className="inline-actions">
                  {i > 0 && (
                    <button className="link-btn" type="button" onClick={() => move(i, -1)}>
                      ↑ Naik
                    </button>
                  )}
                  {i < photos.length - 1 && (
                    <button className="link-btn" type="button" onClick={() => move(i, 1)}>
                      ↓ Turun
                    </button>
                  )}
                  <button className="link-btn" type="button" onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}>
                    Hapus
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {room > 0 ? (
        <div className="photos-editor-add">
          <label className="btn btn-ghost sm">
            {uploading > 0 ? `Mengunggah ${uploading} foto…` : '+ Unggah foto'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              disabled={uploading > 0}
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <input
            aria-label="Link foto"
            type="url"
            value={link}
            placeholder="atau tempel link gambar https://…"
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLink();
              }
            }}
          />
          <button className="btn btn-ghost sm" type="button" disabled={!link} onClick={addLink}>
            Tambah link
          </button>
        </div>
      ) : (
        <p className="form-sub">Maksimal {MAX_PHOTOS} foto.</p>
      )}
      {photos.length !== initial.length || photos.some((p, i) => p.url !== initial[i]?.url || p.caption !== initial[i]?.caption) ? (
        <p className="field-hint">Tekan Simpan supaya perubahan foto tampil di halaman publik.</p>
      ) : null}
    </div>
  );
}
