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
