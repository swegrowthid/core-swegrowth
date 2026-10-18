/** Nomor WhatsApp admin (format internasional, tanpa "+"). Dipakai di link wa.me. */
export const ADMIN_WA = '6282338588078';

export const SITE_NAME = 'SWE Growth';

/** Domain produksi; dipakai untuk URL absolut (preview link butuh og:image absolut). */
export const SITE_URL = 'https://swegrowth.id';

/**
 * Membership berbayar & badge verified belum dibuka ("segera hadir"). Saat
 * dirilis: set true, lalu kembalikan alur bayar di routes/membership.tsx.
 */
export const MEMBERSHIP_LIVE = false;

export type CommunityChannel = {
  id: 'whatsapp' | 'telegram' | 'discord';
  name: string;
  /** null = link belum ada (tombol tampil "Menyusul"). */
  url: string | null;
  /** active = jalan sejak awal; new = baru dibuka, ajak orang jadi yang pertama; soon = belum dibuka. */
  status: 'active' | 'new' | 'soon';
  note: string;
  /** Label tombol. */
  cta: string;
  /** Kisi-kisi topik diskusi di kanal ini. */
  topics?: string[];
};

/**
 * Kanal komunitas yang ditawarkan setelah member selesai daftar (onboarding)
 * dan di portal. Saat Discord dibuka: isi url-nya dan ganti status.
 */
export const COMMUNITY_CHANNELS: CommunityChannel[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    url: 'https://chat.whatsapp.com/JPTgGREOsUwCVJYOSwLkYn?mode=gi_t',
    status: 'active',
    note: 'Tempat ngobrol utama, rame dari awal. Diskusinya dipisah per topik:',
    cta: 'Gabung WhatsApp',
    topics: ['AI terkini', 'Backend', 'Frontend', 'Infra & DevOps', 'Managerial', 'Karier & loker', 'English speaking'],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    url: 'https://t.me/+-qwYuyEIHgswN2Fl',
    status: 'new',
    note: 'Baru dibuka! Yuk jadi yang pertama ngeramein dan ikut nentuin obrolannya mau ke mana.',
    cta: 'Jadi yang pertama',
  },
  {
    id: 'discord',
    name: 'Discord',
    url: null,
    status: 'soon',
    note: 'Lagi disiapin. Link-nya menyusul, nanti kami kabari di WhatsApp.',
    cta: 'Menyusul',
  },
];

/** Yang disiapkan untuk verified member (tampil di halaman membership "segera hadir"). */
export const MEMBER_BENEFITS = ['Badge verified member di profil', 'Rekaman kegiatan yang sudah lewat'];

export const adminWaLink = (text?: string) => `https://wa.me/${ADMIN_WA}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const DEFAULT_DESCRIPTION =
  'SWE Growth — komunitas software engineer Indonesia. Portal berisi agenda kegiatan, pendaftaran, dan grup WhatsApp komunitas.';

/** Meta standar untuk export `meta` tiap route. */
export const pageMeta = (title: string, description = DEFAULT_DESCRIPTION) => [
  { title },
  { name: 'description', content: description },
  { property: 'og:title', content: title },
  { property: 'og:description', content: description },
  { property: 'og:image', content: `${SITE_URL}/assets/swe-growth-logo.png` },
];
