import {
  activityPath,
  activityStatusLabel,
  nextSession,
  priceLabel,
  recurrenceLabel,
  timeRange,
  withNextSession,
  type Activity,
} from '~/lib/activities';
import { formatWibDay } from '~/lib/format';
import { SITE_URL } from '~/lib/site';

/**
 * Poster PNG sebuah event untuk dibagikan (IG feed / WhatsApp), digambar di
 * canvas di browser admin. Isinya mengikuti hero halaman /agenda/:slug: logo,
 * chip status & harga, penyelenggara, judul, ringkasan, jadwal, tempat,
 * pembicara, lalu link pendaftaran. Tanpa hitung mundur ("2 hari lagi") karena
 * poster dibagikan berhari-hari dan angkanya cepat basi.
 */

const W = 1080;
const H = 1350; // 4:5, rasio feed Instagram; tetap rapi di WhatsApp.
const PAD = 84;
const FONT = '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif';

// Sama dengan token di styles/global.css.
const C = {
  teal: '#0b3d40',
  panel: '#2d5759',
  cream: '#efe3d0',
  onTeal: '#d7e2dd',
  yellow: '#f0d65c',
  green: '#7dd957',
};

const modeLabel = { online: 'Online', offline: 'Offline', hybrid: 'Hybrid' } as const;

type Ctx = CanvasRenderingContext2D;
type Run = { text: string; weight: number; color?: string };

const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`;

function setFont(ctx: Ctx, weight: number, size: number, tracking = 0) {
  ctx.font = font(weight, size);
  // letterSpacing belum ada di semua browser; tanpa itu teks hanya sedikit lebih renggang.
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${tracking * size}px`;
}

/** Potong teks ke maxWidth dengan "…". */
function ellipsize(ctx: Ctx, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Bungkus teks per kata; baris terakhir diberi "…" kalau melebihi maxLines. */
function wrap(ctx: Ctx, text: string, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines.map((l) => ellipsize(ctx, l, maxWidth));
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = ellipsize(ctx, `${kept[maxLines - 1]} ${lines[maxLines]}`, maxWidth);
  if (!kept[maxLines - 1].endsWith('…')) kept[maxLines - 1] += '…';
  return kept;
}

// Ikon sama dengan components/Icons.tsx (viewBox 24, stroke currentColor).
type Icon = (ctx: Ctx) => void;
const path =
  (d: string): Icon =>
  (ctx) =>
    ctx.stroke(new Path2D(d));
const ICONS: Record<'calendar' | 'clock' | 'repeat' | 'pin', Icon[]> = {
  calendar: [
    (ctx) => {
      ctx.beginPath();
      ctx.roundRect(3.5, 5, 17, 15.5, 2.5);
      ctx.stroke();
    },
    path('M3.5 10h17M8 3v4M16 3v4'),
  ],
  clock: [
    (ctx) => {
      ctx.beginPath();
      ctx.arc(12, 12, 8.5, 0, Math.PI * 2);
      ctx.stroke();
    },
    path('M12 7.5V12l3 2'),
  ],
  repeat: [path('M17 2l3 3-3 3'), path('M4 11V9a4 4 0 0 1 4-4h12'), path('M7 22l-3-3 3-3'), path('M20 13v2a4 4 0 0 1-4 4H4')],
  pin: [
    path('M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z'),
    (ctx) => {
      ctx.beginPath();
      ctx.arc(12, 10, 2.4, 0, Math.PI * 2);
      ctx.stroke();
    },
  ],
};

function drawIcon(ctx: Ctx, name: keyof typeof ICONS, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const draw of ICONS[name]) draw(ctx);
  ctx.restore();
}

/** Chip pil seperti .chip di situs; mengembalikan lebarnya. */
function chip(ctx: Ctx, text: string, x: number, y: number, filled: boolean) {
  const h = 62;
  setFont(ctx, 700, 28);
  const w = ctx.measureText(text).width + 52;
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, h / 2);
  if (filled) {
    ctx.fillStyle = C.yellow;
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(239, 227, 208, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.fillStyle = filled ? C.teal : C.cream;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 26, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  return w;
}

/** Satu baris teks dengan beberapa ketebalan (mis. "Sesi berikutnya **Rabu, …**"). */
function runs(ctx: Ctx, parts: Run[], x: number, baseline: number, size: number, maxWidth: number) {
  let cx = x;
  for (const p of parts) {
    setFont(ctx, p.weight, size);
    const text = ellipsize(ctx, p.text, x + maxWidth - cx);
    ctx.fillStyle = p.color ?? C.onTeal;
    ctx.fillText(text, cx, baseline);
    cx += ctx.measureText(text).width;
    if (cx >= x + maxWidth) break;
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat ${src}`));
    img.src = src;
  });
}

type Poster = {
  logo: HTMLImageElement;
  chips: { text: string; filled: boolean }[];
  organizer: string;
  title: string;
  summary: string;
  meta: { icon: keyof typeof ICONS; parts: Run[] }[];
  speaker: { name: string; role: string | null } | null;
  link: string;
};

/**
 * Gambar semua bagian mulai dari atas; kembalikan y terbawah konten (sebelum
 * footer). Dipanggil sekali tanpa menggambar untuk mencari ukuran judul yang muat.
 */
type Fit = { titleSize: number; summaryLines: number };

function layout(ctx: Ctx, p: Poster, { titleSize, summaryLines }: Fit, paint: boolean, offset = 0) {
  const inner = W - PAD * 2;
  let y = PAD;

  // Logo + nama komunitas.
  if (paint) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(PAD, y, 92, 92, 20);
    ctx.clip();
    ctx.drawImage(p.logo, PAD, y, 92, 92);
    ctx.restore();
    setFont(ctx, 800, 42, -0.01);
    ctx.fillStyle = C.cream;
    ctx.fillText('SWE Growth', PAD + 92 + 26, y + 46 + 15);
  }
  y += 92 + 72 + offset;

  // Chip status & harga.
  if (paint) {
    let x = PAD;
    for (const c of p.chips) x += chip(ctx, c.text, x, y, c.filled) + 14;
  }
  y += 62 + 56;

  // Penyelenggara.
  setFont(ctx, 600, 30);
  if (paint) {
    ctx.fillStyle = C.onTeal;
    ctx.fillText(ellipsize(ctx, p.organizer, inner), PAD, y);
  }
  y += 28;

  // Judul.
  setFont(ctx, 800, titleSize, -0.025);
  const titleLines = wrap(ctx, p.title, inner, 4);
  const titleLh = titleSize * 1.08;
  for (const line of titleLines) {
    y += titleLh;
    if (paint) {
      ctx.fillStyle = C.cream;
      ctx.fillText(line, PAD, y - titleSize * 0.2);
    }
  }

  // Ringkasan.
  if (p.summary && summaryLines > 0) {
    setFont(ctx, 400, 34);
    y += 22;
    for (const line of wrap(ctx, p.summary, inner, summaryLines)) {
      y += 34 * 1.42;
      if (paint) {
        ctx.fillStyle = C.onTeal;
        ctx.fillText(line, PAD, y - 10);
      }
    }
  }

  // Panel jadwal & tempat, seperti bar tanggal di halaman event.
  if (p.meta.length) {
    y += 48;
    const rowH = 66;
    const panelH = p.meta.length * rowH + 52;
    if (paint) {
      ctx.fillStyle = C.panel;
      ctx.beginPath();
      ctx.roundRect(PAD, y, inner, panelH, 20);
      ctx.fill();
      p.meta.forEach((m, i) => {
        const top = y + 26 + i * rowH;
        drawIcon(ctx, m.icon, PAD + 40, top + 14, 38, C.yellow);
        runs(ctx, m.parts, PAD + 40 + 38 + 24, top + 45, 34, inner - 40 - 38 - 24 - 40);
      });
    }
    y += panelH;
  }

  // Pembicara.
  if (p.speaker) {
    y += 44;
    if (paint) {
      setFont(ctx, 600, 26);
      ctx.fillStyle = C.onTeal;
      ctx.fillText('Bersama', PAD, y + 26);
      setFont(ctx, 800, 40, -0.01);
      ctx.fillStyle = C.yellow;
      ctx.fillText(ellipsize(ctx, p.speaker.name, inner), PAD, y + 78);
      if (p.speaker.role) {
        setFont(ctx, 500, 28);
        ctx.fillStyle = C.onTeal;
        ctx.fillText(ellipsize(ctx, p.speaker.role, inner), PAD, y + 120);
      }
    }
    y += p.speaker.role ? 130 : 88;
  }

  return y;
}

// Garis pemisah s.d. baseline link (92px) + margin bawah sama dengan sisi.
const FOOTER_H = 92 + PAD;

function footer(ctx: Ctx, link: string) {
  const top = H - FOOTER_H;
  ctx.fillStyle = C.panel;
  ctx.fillRect(PAD, top, W - PAD * 2, 2);
  setFont(ctx, 600, 26);
  ctx.fillStyle = C.onTeal;
  ctx.fillText('Info & pendaftaran', PAD, top + 48);
  // Link dikecilkan sampai muat utuh (slug panjang); baru dipotong kalau tetap kepanjangan.
  let size = 34;
  do setFont(ctx, 750, size);
  while (size-- > 24 && ctx.measureText(link).width > W - PAD * 2);
  ctx.fillStyle = C.yellow;
  ctx.fillText(ellipsize(ctx, link, W - PAD * 2), PAD, top + 92);
}

/** Data poster dari baris activity; event berulang memakai sesi berikutnya. */
function posterData(a: Activity, organizerName: string | null, logo: HTMLImageElement): Poster {
  const s = withNextSession(a);
  const place = [s.mode && modeLabel[s.mode], s.location].filter(Boolean).join(' · ');
  const meta: Poster['meta'] = [];
  meta.push({
    icon: 'calendar',
    parts: [
      ...(s.recurrence && nextSession(a) ? [{ text: 'Sesi berikutnya ', weight: 400 }] : []),
      { text: s.starts_at ? formatWibDay(s.starts_at) : 'Tanggal menyusul', weight: 750, color: C.cream },
    ],
  });
  const time = timeRange(s);
  if (time) meta.push({ icon: 'clock', parts: [{ text: time, weight: 400 }] });
  const rec = recurrenceLabel(a);
  if (rec) meta.push({ icon: 'repeat', parts: [{ text: rec, weight: 400 }] });
  if (place) meta.push({ icon: 'pin', parts: [{ text: place, weight: 400 }] });

  return {
    logo,
    chips: [
      { text: activityStatusLabel[a.status], filled: true },
      { text: priceLabel(a), filled: false },
    ],
    organizer: `Kegiatan komunitas SWE Growth${organizerName ? ` · diadakan ${organizerName}` : ''}`,
    title: a.title,
    summary: a.summary?.trim() ?? '',
    meta,
    speaker: a.speaker ? { name: a.speaker, role: a.speaker_title } : null,
    link: `${new URL(SITE_URL).host}${activityPath(a)}`,
  };
}

/** Gambar poster ke canvas baru (1080×1350). */
export async function renderEventPoster(a: Activity, organizerName: string | null) {
  await Promise.all([400, 500, 600, 700, 750, 800].map((w) => document.fonts.load(font(w, 40), a.title)));
  const logo = await loadImage('/assets/swe-growth-logo.png');
  const p = posterData(a, organizerName, logo);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak didukung browser ini.');

  // Judul sebesar mungkin selama semua isi muat di atas footer; kalau judul
  // terkecil pun belum muat, ringkasan dipendekkan. Sisa ruang dibagi rata di
  // atas dan bawah isi supaya event pendek tidak menumpuk di atas.
  const limit = H - FOOTER_H - 64;
  let fit: Fit = { titleSize: 52, summaryLines: 0 };
  search: for (const summaryLines of [3, 2, 1, 0]) {
    for (let titleSize = 100; titleSize >= 52; titleSize -= 4) {
      if (layout(ctx, p, { titleSize, summaryLines }, false) <= limit) {
        fit = { titleSize, summaryLines };
        break search;
      }
    }
  }
  const offset = Math.max(0, (limit - layout(ctx, p, fit, false)) / 2);

  ctx.fillStyle = C.teal;
  ctx.fillRect(0, 0, W, H);
  // Chevron lime samar di pojok, gema logo.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = C.green;
  for (let i = 0; i < 3; i++) {
    const cy = 150 + i * 120;
    ctx.beginPath();
    ctx.moveTo(W - 300, cy + 90);
    ctx.lineTo(W - 150, cy);
    ctx.lineTo(W, cy + 90);
    ctx.lineTo(W, cy + 160);
    ctx.lineTo(W - 150, cy + 70);
    ctx.lineTo(W - 300, cy + 160);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  layout(ctx, p, fit, true, offset);
  footer(ctx, p.link);
  return canvas;
}

/** Render lalu unduh sebagai poster-<slug>.png. */
export async function downloadEventPoster(a: Activity, organizerName: string | null) {
  const canvas = await renderEventPoster(a, organizerName);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Gagal membuat gambar.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `poster-${a.slug}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
