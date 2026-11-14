import { SITE_URL } from '~/lib/site';

/** Path gambar preview, relatif ke root situs. */
export const ogPaths = {
  home: '/og/home.png',
  agenda: '/og/agenda.png',
  event: (slug: string) => `/og/agenda/${slug}.png`,
  qna: (slug: string) => `/og/tanya/${slug}.png`,
};

/** URL absolut untuk meta og:image; `version` memaksa WhatsApp/FB mengambil ulang setelah event diubah. */
export const ogImage = (path: string, version?: string | null) =>
  `${SITE_URL}${path}${version ? `?v=${Date.parse(version).toString(36)}` : ''}`;

type QnaCopyInput = { title: string; speaker: string | null; qna_status: string };

/** Kalimat utama gambar & meta tanya jawab. Netlify edge function event-preview menyalin ini. */
export const qnaHeadline = (a: Pick<QnaCopyInput, 'speaker'>) => `Punya pertanyaan untuk ${a.speaker || 'pembicara'}?`;

/** Judul & deskripsi preview link halaman tanya jawab, dimulai dengan "Tanya jawab" supaya tidak tertukar dengan halaman kegiatan. */
export const qnaShareCopy = (a: QnaCopyInput) => ({
  title: `Tanya jawab: ${a.title}`,
  description:
    a.qna_status === 'closed'
      ? `Sesi tanya jawab untuk ${a.speaker || 'pembicara'} sudah ditutup. Lihat pertanyaan yang masuk.`
      : `${qnaHeadline(a)} Kirim pertanyaanmu dan vote pertanyaan yang paling ingin kamu dengar jawabannya.`,
});
