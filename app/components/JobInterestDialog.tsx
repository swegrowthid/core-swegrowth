import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check } from './Icons';
import { useAuth } from '~/lib/auth';
import {
  companyLabel,
  contactHref,
  expressJobInterest,
  fetchMyInterestNote,
  firstName,
  INTEREST_NOTE_MAX,
  INTEREST_NOTE_MIN,
  interestMessage,
  toggleJobInterest,
  type Job,
} from '~/lib/jobs';
import { waNumber } from '~/lib/profile';
import { SITE_URL } from '~/lib/site';

/** Ke mana pesan dikirim setelah tertarik; `to` = nama untuk sapaan (boleh kosong). */
type Channel =
  | { kind: 'wa'; to: string; href: string }
  | { kind: 'email'; to: string; address: string }
  | { kind: 'profile'; to: string; handle: string }
  | { kind: 'none'; to: string };

const CHANNEL_NOTE: Record<Channel['kind'], (to: string) => string> = {
  wa: () =>
    'Pesan WhatsApp sudah disiapkan dengan catatan Anda. Periksa kembali sebelum dikirim; jika belum dibalas, beri waktu beberapa hari.',
  email: () => 'Aplikasi email Anda akan terbuka dengan pesan ini. Periksa kembali sebelum dikirim.',
  profile: (to) => `${firstName(to)} tidak mencantumkan WhatsApp. Salin pesan ini, lalu kirim lewat LinkedIn di profilnya.`,
  none: () => 'Lowongan ini tidak mencantumkan kontak. Salin pesan ini, lalu kirim ke pengirimnya di grup loker.',
};

/** Panduan lengkap tampil sekali; setelah itu diringkas (hanya kenyamanan di browser ini). */
const GUIDE_SEEN_KEY = 'swg-loker-panduan';

const guideSeen = () => {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Tertarik pada satu lowongan, di bottom sheet (HP) / dialog (desktop) supaya fokus:
 * 1. panduan + relevansi pengalaman (catatan lama terisi kalau sudah pernah),
 * 2. tercatat + Buka WhatsApp dengan kerangka pesan yang intinya ditulis member.
 */
export function JobInterestDialog({
  j,
  interested,
  onClose,
  onSaved,
  onWithdrawn,
}: {
  j: Job;
  interested: boolean;
  onClose: () => void;
  onSaved: () => void;
  onWithdrawn: () => void;
}) {
  const { user, profile } = useAuth();
  const ref = useRef<HTMLDialogElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [note, setNote] = useState('');
  const [loadingNote, setLoadingNote] = useState(interested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [fullGuide] = useState(() => !guideSeen());
  const titleId = useId();
  const noteId = useId();
  const hintId = useId();
  const errorId = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Sudah pernah tertarik: isi catatan lama supaya tinggal diubah atau dipakai lagi.
  useEffect(() => {
    if (!interested || !user) return;
    let live = true;
    fetchMyInterestNote(j.id, user.id)
      .then((n) => live && setNote(n))
      .finally(() => live && setLoadingNote(false));
    return () => {
      live = false;
    };
  }, [interested, j.id, user]);

  useEffect(() => {
    if (step === 'done') (primaryRef.current ?? ref.current?.querySelector<HTMLElement>('[data-autofocus]'))?.focus();
    if (step === 'form' && !loadingNote) noteRef.current?.focus();
  }, [step, loadingNote]);

  const cpHref = j.contact ? contactHref(j.contact) : null;
  const cpWa = cpHref?.startsWith('https://wa.me/') ? cpHref : null;
  const email = cpHref?.startsWith('mailto:') ? cpHref.slice(7) : j.apply_url?.startsWith('mailto:') ? j.apply_url.slice(7) : null;
  // Yang dihubungi, urut: yang membagikan (kalau bersedia ditanya), CP ber-WA, email, lalu profil yang membagikan.
  const askName =
    (j.open_to_questions && j.owner_name) ||
    (cpWa && (j.contact_name || 'CP')) ||
    (email && (j.contact_name || 'perekrut')) ||
    j.owner_name ||
    null;
  const viewer = j.owner_name ?? 'tim loker SWE Growth';
  const noteLength = note.trim().length;
  const close = () => ref.current?.close();

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (noteLength < INTEREST_NOTE_MIN) {
      setError(`Tulis minimal ${INTEREST_NOTE_MIN} karakter tentang relevansi pengalaman Anda.`);
      noteRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const { data: ownerWa, error: rpcError } = await expressJobInterest(j.id, note);
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    try {
      localStorage.setItem(GUIDE_SEEN_KEY, '1');
    } catch {
      // Hanya kenyamanan; tanpa storage panduan tetap tampil penuh.
    }
    if (!interested) onSaved();

    const next: Channel = ownerWa
      ? { kind: 'wa', to: j.owner_name ?? '', href: `https://wa.me/${waNumber(ownerWa)}` }
      : cpWa
        ? { kind: 'wa', to: j.contact_name, href: cpWa }
        : email
          ? { kind: 'email', to: j.contact_name, address: email }
          : j.owner_name && j.owner_handle
            ? { kind: 'profile', to: j.owner_name, handle: j.owner_handle }
            : { kind: 'none', to: '' };
    const text = interestMessage({
      to: next.to,
      from: profile?.full_name ?? '',
      job: j,
      note,
      profileUrl: profile ? `${SITE_URL}/member/${profile.username ?? profile.id}` : SITE_URL,
    });
    setChannel(next);
    setMessage(text);
    setCopied(false);
    setStep('done');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      // Clipboard ditolak (izin/iframe): pilih teksnya supaya bisa disalin manual.
      const sel = window.getSelection();
      const node = ref.current?.querySelector('.job-sheet-message');
      if (sel && node) sel.selectAllChildren(node);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await toggleJobInterest(j.id);
    setBusy(false);
    if (rpcError || data !== false) {
      setError(rpcError?.message ?? 'Belum tersimpan. Silakan coba lagi.');
      return;
    }
    onWithdrawn();
    close();
  };

  // Portal ke body: di dalam kartu, dialog ikut mewarisi gaya kartu (ukuran huruf, judul terpotong).
  return createPortal(
    <dialog
      ref={ref}
      className="job-sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      // Klik di luar panel (backdrop) menutup, seperti Esc.
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="job-sheet-panel">
        <header className="job-sheet-head">
          <div>
            <p className="job-sheet-context">
              {companyLabel(j.company)}
              {j.owner_name && ` · dibagikan ${j.owner_name}`}
            </p>
            <h2 id={titleId}>{j.title}</h2>
          </div>
          <button className="link-btn" type="button" onClick={close}>
            Tutup
          </button>
        </header>

        {step === 'form' ? (
          <form className="job-sheet-body" onSubmit={save} noValidate>
            {askName ? (
              fullGuide ? (
                <div className="job-sheet-guide">
                  <h3>Sebelum menghubungi {askName}</h3>
                  <p>
                    {j.owner_name
                      ? `${j.owner_name} membagikan lowongan ini secara sukarela.`
                      : 'Lowongan ini dibagikan di grup loker SWE Growth.'}
                  </p>
                  <ul>
                    <li>Perkenalkan diri dan sebutkan lowongan yang dimaksud.</li>
                    <li>Jelaskan singkat relevansi pengalaman Anda.</li>
                    <li>Tanyakan dulu prosesnya; jangan langsung mengirim CV kecuali diminta.</li>
                    <li>Jika belum dibalas, tunggu beberapa hari sebelum menindaklanjuti.</li>
                  </ul>
                </div>
              ) : (
                <details className="job-sheet-guide">
                  <summary>Panduan menghubungi {askName}</summary>
                  <ul>
                    <li>Perkenalkan diri dan sebutkan lowongan yang dimaksud.</li>
                    <li>Jelaskan singkat relevansi pengalaman Anda.</li>
                    <li>Tanyakan dulu prosesnya; jangan langsung mengirim CV kecuali diminta.</li>
                    <li>Jika belum dibalas, tunggu beberapa hari sebelum menindaklanjuti.</li>
                  </ul>
                </details>
              )
            ) : (
              <p className="job-sheet-note">
                Profil, WhatsApp, LinkedIn, dan catatan Anda akan terlihat oleh {viewer}. Lowongan ini tidak mencantumkan kontak; setelah
                ini Anda mendapat pesan siap salin untuk dikirim ke pengirimnya di grup.
              </p>
            )}

            <div className="job-sheet-field">
              <label htmlFor={noteId}>Relevansi pengalaman Anda</label>
              <textarea
                ref={noteRef}
                id={noteId}
                rows={4}
                maxLength={INTEREST_NOTE_MAX}
                value={note}
                disabled={loadingNote}
                aria-invalid={error && noteLength < INTEREST_NOTE_MIN ? true : undefined}
                aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (error && e.target.value.trim().length >= INTEREST_NOTE_MIN) setError(null);
                }}
                placeholder={
                  loadingNote
                    ? 'Memuat catatan Anda…'
                    : 'Mis. 3 tahun sebagai backend engineer dengan Go, saat ini menangani sistem pembayaran.'
                }
              />
              {error && (
                <p className="job-sheet-error" id={errorId} role="alert">
                  {error}
                </p>
              )}
              <p className="field-hint" id={hintId}>
                <span className="job-sheet-count" data-short={noteLength < INTEREST_NOTE_MIN || undefined}>
                  {noteLength}/{INTEREST_NOTE_MIN}+ karakter
                </span>
                {askName ? ' · Menjadi inti pesan WhatsApp dan tampil di daftar peminat.' : ' · Tampil di daftar peminat.'}
              </p>
            </div>

            <div className="job-sheet-actions">
              <button className="btn btn-primary" type="submit" disabled={busy || loadingNote}>
                {busy ? 'Menyimpan…' : interested ? 'Simpan & siapkan pesan' : 'Tandai tertarik & siapkan pesan'}
              </button>
              {interested && (
                <button className="link-btn danger" type="button" disabled={busy} onClick={withdraw}>
                  Batalkan tertarik
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="job-sheet-body">
            <div role="status">
              <h3>Tercatat sebagai peminat</h3>
              <p>{j.owner_name ?? 'Tim loker SWE Growth'} dapat melihat profil dan catatan Anda di daftar peminat.</p>
            </div>

            {channel && (
              <div className="job-sheet-next">
                <h3>{channel.to ? `Langkah berikutnya: hubungi ${firstName(channel.to)}` : 'Langkah berikutnya: kirim pesan'}</h3>
                <p className="job-sheet-note">{CHANNEL_NOTE[channel.kind](channel.to)}</p>
                <pre className="job-sheet-message" aria-label="Pesan yang disiapkan">
                  {message}
                </pre>
                <div className="job-sheet-actions">
                  {channel.kind === 'wa' ? (
                    <a
                      ref={primaryRef}
                      className="btn btn-primary"
                      href={`${channel.href}?text=${encodeURIComponent(message)}`}
                      target="_blank"
                      rel="noopener"
                    >
                      Buka WhatsApp
                    </a>
                  ) : channel.kind === 'email' ? (
                    <a
                      ref={primaryRef}
                      className="btn btn-primary"
                      href={`mailto:${channel.address}?subject=${encodeURIComponent(`Pertanyaan lowongan ${j.title} (via SWE Growth)`)}&body=${encodeURIComponent(message)}`}
                    >
                      Kirim email
                    </a>
                  ) : channel.kind === 'profile' ? (
                    <a ref={primaryRef} className="btn btn-primary" href={`/member/${channel.handle}`} target="_blank" rel="noopener">
                      Buka profil {firstName(channel.to)}
                    </a>
                  ) : null}
                  <button
                    className={`btn ${channel.kind === 'none' ? 'btn-primary' : 'btn-ghost'}`}
                    type="button"
                    data-autofocus
                    onClick={copy}
                  >
                    {copied && <Check />}
                    {copied ? 'Pesan tersalin' : 'Salin pesan'}
                  </button>
                  <button className="link-btn" type="button" onClick={() => setStep('form')}>
                    Ubah catatan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
