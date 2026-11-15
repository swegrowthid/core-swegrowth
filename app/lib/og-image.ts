import { activityPath, organizerOf, type Activity, type CommunityGroup } from '~/lib/activities';
import {
  C,
  chevrons,
  chip,
  drawIcon,
  ellipsize,
  eventChips,
  organizerLine,
  scheduleRows,
  setFont,
  wrap,
  type Ctx,
} from '~/lib/event-poster';
import { formatWibTime, wibDayParts } from '~/lib/format';
import { QNA_HEADLINE } from '~/lib/og';
import { qnaPath } from '~/lib/qna';
import { SITE_URL } from '~/lib/site';

/**
 * Gambar preview link (og:image) 1200×630 bergaya poster event: latar teal,
 * logo, chip, judul besar, link kuning di bawah. Digambar saat build oleh
 * scripts/og-images.mjs (canvas Node) ke build/client/og/; meta tiap halaman
 * menunjuk ke sana lewat ogImage() di lib/og.ts.
 */

export const OG_W = 1200;
export const OG_H = 630;
const PAD = 64;
const INNER = OG_W - PAD * 2;
const HEADER_BOTTOM = 52 + 64;
const FOOTER_TOP = OG_H - 112;
/** Area isi di antara header dan footer. */
const BODY = { top: HEADER_BOTTOM + 32, bottom: FOOTER_TOP - 28 };

const HOST = new URL(SITE_URL).host;

function background(ctx: Ctx) {
  ctx.fillStyle = C.teal;
  ctx.fillRect(0, 0, OG_W, OG_H);
  chevrons(ctx, OG_W, 40);
}

/** Logo + nama komunitas di kiri atas, chip rata kanan di baris yang sama. */
function header(ctx: Ctx, logo: CanvasImageSource, chips: { text: string; filled: boolean }[] = []) {
  const y = 52;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(PAD, y, 64, 64, 14);
  ctx.clip();
  ctx.drawImage(logo, PAD, y, 64, 64);
  ctx.restore();
  setFont(ctx, 800, 32, -0.01);
  ctx.fillStyle = C.cream;
  ctx.fillText('SWE Growth', PAD + 64 + 20, y + 32 + 11);

  const gap = 12;
  const widths = chips.map((c) => chip(ctx, c.text, 0, 0, c.filled, false));
  let x = OG_W - PAD - widths.reduce((sum, w) => sum + w + gap, -gap);
  chips.forEach((c, i) => {
    chip(ctx, c.text, x, y + 1, c.filled);
    x += widths[i] + gap;
  });
}

/** Garis pemisah, keterangan di kiri, link kuning rata kanan (dikecilkan dulu sebelum dipotong). */
function footer(ctx: Ctx, label: string, link: string) {
  ctx.fillStyle = C.panel;
  ctx.fillRect(PAD, FOOTER_TOP, INNER, 2);
  const baseline = OG_H - 50;

  // Link diutamakan; keterangan memakai sisa ruang (minimal 40% lebar).
  setFont(ctx, 600, 24);
  const labelW = Math.min(ctx.measureText(label).width, INNER * 0.4);
  const linkMax = INNER - labelW - 40;
  let size = 32;
  do setFont(ctx, 750, size);
  while (size-- > 22 && ctx.measureText(link).width > linkMax);
  const shown = ellipsize(ctx, link, linkMax);
  const linkW = ctx.measureText(shown).width;
  ctx.fillStyle = C.yellow;
  ctx.textAlign = 'right';
  ctx.fillText(shown, OG_W - PAD, baseline);
  ctx.textAlign = 'left';

  setFont(ctx, 600, 24);
  ctx.fillStyle = C.onTeal;
  ctx.fillText(ellipsize(ctx, label, INNER - linkW - 40), PAD, baseline);
}

/** Judul sebesar mungkin (maks. maxLines baris) yang masih muat di tinggi yang tersedia. */
function fitTitle(ctx: Ctx, text: string, width: number, maxLines: number, maxHeight: number, sizes: [number, number]) {
  for (let size = sizes[0]; size >= sizes[1]; size -= 4) {
    setFont(ctx, 800, size, -0.025);
    const lines = wrap(ctx, text, width, maxLines);
    const height = lines.length * size * 1.08;
    const last = lines[lines.length - 1];
    if (height <= maxHeight && !last.endsWith('…')) return { size, lines, height };
  }
  setFont(ctx, 800, sizes[1], -0.025);
  const lines = wrap(ctx, text, width, maxLines);
  return { size: sizes[1], lines, height: lines.length * sizes[1] * 1.08 };
}

function drawTitle(ctx: Ctx, t: ReturnType<typeof fitTitle>, x: number, top: number, color: string = C.cream) {
  setFont(ctx, 800, t.size, -0.025);
  ctx.fillStyle = color;
  t.lines.forEach((line, i) => ctx.fillText(line, x, top + (i + 1) * t.size * 1.08 - t.size * 0.2));
}

/** Paragraf kecil; kembalikan tingginya. paint=false hanya mengukur. */
function paragraph(
  ctx: Ctx,
  text: string,
  x: number,
  top: number,
  width: number,
  opts: { size: number; weight: number; color: string; lines: number },
  paint = true,
) {
  setFont(ctx, opts.weight, opts.size);
  const lines = wrap(ctx, text, width, opts.lines);
  const lh = opts.size * 1.4;
  if (paint) {
    ctx.fillStyle = opts.color;
    lines.forEach((line, i) => ctx.fillText(line, x, top + (i + 1) * lh - opts.size * 0.32));
  }
  return lines.length * lh;
}

// ── Event ────────────────────────────────────────────────────────────────

/** Panel jadwal & tempat di kolom kanan, seperti bar tanggal di halaman event. */
function schedulePanel(ctx: Ctx, a: Activity, x: number, width: number, paint: boolean, top = 0) {
  const pad = 28;
  const icon = 30;
  const textX = x + pad + icon + 16;
  const textW = width - pad * 2 - icon - 16;
  let y = top + pad;
  const rows = scheduleRows(a);
  rows.forEach((row, i) => {
    // Bagian pertama tipis (mis. "Sesi berikutnya") jadi label kecil di atas.
    const [first, ...rest] = row.parts;
    const label = rest.length ? first.text.trim() : null;
    const main = rest.length ? rest : [first];
    const text = main.map((p) => p.text).join('');
    const strong = main.some((p) => p.weight >= 700);
    if (label) {
      if (paint) {
        setFont(ctx, 600, 18);
        ctx.fillStyle = C.onTeal;
        ctx.fillText(label, textX, y + 16);
      }
      y += 26;
    }
    if (paint) drawIcon(ctx, row.icon, x + pad, y + 2, icon, C.yellow);
    y += paragraph(
      ctx,
      text,
      textX,
      y,
      textW,
      { size: 24, weight: strong ? 750 : 450, color: strong ? C.cream : C.onTeal, lines: 2 },
      paint,
    );
    if (i < rows.length - 1) y += 14;
  });
  return y + pad - 6 - top;
}

export function drawEventOg(ctx: Ctx, logo: CanvasImageSource, a: Activity, groups: CommunityGroup[]) {
  background(ctx);
  header(ctx, logo, eventChips(a));

  const hasPanel = scheduleRows(a).length > 0;
  const panelW = 392;
  const leftW = hasPanel ? INNER - panelW - 44 : INNER;
  const bodyH = BODY.bottom - BODY.top;

  // Kolom kiri: penyelenggara, judul, ringkasan (kalau muat), pembicara.
  const organizer = organizerOf(a, groups)?.name ?? null;
  const speakerH = a.speaker ? 52 : 0;
  const orgH = 36;
  const title = fitTitle(ctx, a.title, leftW, 3, bodyH - orgH - speakerH, [76, 44]);
  const summary = a.summary?.trim() ?? '';
  const summaryOpts = { size: 24, weight: 400, color: C.onTeal, lines: 2 };
  let summaryH = summary ? 18 + paragraph(ctx, summary, 0, 0, leftW, summaryOpts, false) : 0;
  if (orgH + title.height + summaryH + speakerH > bodyH) summaryH = 0;
  const leftH = orgH + title.height + summaryH + speakerH;
  let y = BODY.top + Math.max(0, (bodyH - leftH) / 2);

  setFont(ctx, 600, 22);
  ctx.fillStyle = C.onTeal;
  ctx.fillText(ellipsize(ctx, organizerLine(organizer), leftW), PAD, y + 18);
  y += orgH;
  drawTitle(ctx, title, PAD, y);
  y += title.height;
  if (summaryH) {
    y += 18;
    y += paragraph(ctx, summary, PAD, y, leftW, summaryOpts);
  }
  if (a.speaker) {
    y += 22;
    setFont(ctx, 600, 24);
    ctx.fillStyle = C.onTeal;
    const lead = 'Bersama ';
    ctx.fillText(lead, PAD, y + 26);
    let x = PAD + ctx.measureText(lead).width;
    setFont(ctx, 800, 28, -0.01);
    ctx.fillStyle = C.yellow;
    const name = ellipsize(ctx, a.speaker, PAD + leftW - x);
    ctx.fillText(name, x, y + 26);
    x += ctx.measureText(name).width;
    if (a.speaker_title && x < PAD + leftW - 80) {
      setFont(ctx, 500, 24);
      ctx.fillStyle = C.onTeal;
      ctx.fillText(ellipsize(ctx, ` · ${a.speaker_title}`, PAD + leftW - x), x, y + 26);
    }
  }

  // Kolom kanan: panel jadwal, di tengah area isi.
  if (hasPanel) {
    const x = OG_W - PAD - panelW;
    const h = schedulePanel(ctx, a, x, panelW, false);
    const top = BODY.top + Math.max(0, (bodyH - h) / 2);
    ctx.fillStyle = C.panel;
    ctx.beginPath();
    ctx.roundRect(x, top, panelW, h, 20);
    ctx.fill();
    schedulePanel(ctx, a, x, panelW, true, top);
  }

  footer(ctx, 'Info & pendaftaran', `${HOST}${activityPath(a)}`);
}

// ── Tanya jawab ──────────────────────────────────────────────────────────

/** Gelembung chat kuning bertanda tanya, dengan gelembung "…" kecil di belakangnya. */
function questionBubble(ctx: Ctx, cx: number, cy: number) {
  ctx.save();
  // Gelembung balasan: garis krem tipis, tiga titik.
  const bx = cx - 10;
  const by = cy - 150;
  ctx.strokeStyle = 'rgba(239, 227, 208, 0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(bx, by, 170, 110, 32);
  ctx.moveTo(bx + 112, by + 108);
  ctx.lineTo(bx + 140, by + 140);
  ctx.lineTo(bx + 136, by + 108);
  ctx.stroke();
  ctx.fillStyle = 'rgba(239, 227, 208, 0.5)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(bx + 50 + i * 35, by + 55, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  const w = 250;
  const h = 190;
  const x = cx - w / 2 - 40;
  const y = cy - 70;
  ctx.fillStyle = C.yellow;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 44);
  ctx.fill();
  // Ekor gelembung.
  ctx.beginPath();
  ctx.moveTo(x + 48, y + h - 4);
  ctx.lineTo(x + 30, y + h + 44);
  ctx.lineTo(x + 104, y + h - 4);
  ctx.closePath();
  ctx.fill();

  setFont(ctx, 800, 150);
  ctx.fillStyle = C.teal;
  ctx.textAlign = 'center';
  ctx.fillText('?', x + w / 2, y + h / 2 + 52);
  ctx.textAlign = 'left';
  ctx.restore();
}

const qnaStatusChip = { open: 'dibuka', closed: 'ditutup', off: null } as const;

export function drawQnaOg(ctx: Ctx, logo: CanvasImageSource, a: Activity) {
  background(ctx);
  const status = qnaStatusChip[a.qna_status];
  header(ctx, logo, [{ text: 'Tanya jawab', filled: true }, ...(status ? [{ text: status, filled: false }] : [])]);

  // "Tanya di sini" paling besar, bukan judul kegiatan: preview harus langsung terbaca sebagai link untuk bertanya.
  const leftW = INNER - 340;
  const bodyH = BODY.bottom - BODY.top;
  const headSize = 104;
  const headH = headSize * 1.08;
  const forWho = `Kirim pertanyaan untuk ${a.speaker || 'pembicara'}`;
  const event = `di ${a.title}`;
  const eventOpts = { size: 26, weight: 500, color: C.onTeal, lines: 2 };
  const whoH = 18 + 44;
  const eventH = 4 + paragraph(ctx, event, 0, 0, leftW, eventOpts, false);
  let y = BODY.top + Math.max(0, (bodyH - headH - whoH - eventH) / 2);

  setFont(ctx, 800, headSize, -0.03);
  ctx.fillStyle = C.cream;
  ctx.fillText(QNA_HEADLINE, PAD, y + headH - headSize * 0.2);
  y += headH + 18;
  setFont(ctx, 700, 32, -0.01);
  ctx.fillStyle = C.yellow;
  ctx.fillText(ellipsize(ctx, forWho, leftW), PAD, y + 34);
  y += 44 + 4;
  paragraph(ctx, event, PAD, y, leftW, eventOpts);

  questionBubble(ctx, OG_W - PAD - 150, BODY.top + bodyH / 2 - 10);
  const cta = a.qna_status === 'closed' ? 'Lihat pertanyaan yang masuk' : 'Kirim & vote pertanyaanmu';
  footer(ctx, cta, `${HOST}${qnaPath(a)}`);
}

// ── Komunitas (beranda & halaman umum) ───────────────────────────────────

export type CommunityOg = {
  /** Angka seperti hero beranda; kosong = baris angka tidak ditampilkan. */
  stats: { label: string; value: string }[];
  topics: string[];
  next: Activity | null;
};

export function drawCommunityOg(ctx: Ctx, logo: CanvasImageSource, data: CommunityOg) {
  background(ctx);
  header(ctx, logo, [{ text: 'komunitas', filled: true }]);

  const title = 'Komunitas software engineer Indonesia';
  const t = fitTitle(ctx, title, INNER - 120, 2, 140, [64, 52]);
  const statsH = data.stats.length ? 92 : 0;
  const chipsH = data.topics.length ? 62 : 0;
  const gap = 24;
  const bodyH = BODY.bottom - BODY.top;
  const contentH = t.height + (statsH ? gap + statsH : 0) + (chipsH ? gap + chipsH : 0);
  let y = BODY.top + Math.max(0, (bodyH - contentH) / 2);

  drawTitle(ctx, t, PAD, y);
  y += t.height;

  if (statsH) {
    y += gap;
    let x = PAD;
    for (const s of data.stats) {
      setFont(ctx, 800, 48, -0.02);
      ctx.fillStyle = C.yellow;
      ctx.fillText(s.value, x, y + 44);
      const valueW = ctx.measureText(s.value).width;
      setFont(ctx, 600, 22);
      ctx.fillStyle = C.onTeal;
      ctx.fillText(s.label, x, y + 82);
      x += Math.max(valueW, ctx.measureText(s.label).width) + 64;
    }
    y += statsH;
  }

  if (chipsH) {
    y += gap;
    let x = PAD;
    for (const topic of data.topics) {
      const w = chip(ctx, topic, 0, 0, false, false);
      if (x + w > OG_W - PAD) break;
      chip(ctx, topic, x, y, false);
      x += w + 12;
    }
  }

  const next = data.next;
  const label = next?.starts_at
    ? `Agenda terdekat: ${next.title} · ${wibDayParts(next.starts_at).day} ${wibDayParts(next.starts_at).month}`
    : 'Agenda, rekaman, dan grup diskusi komunitas';
  footer(ctx, label, HOST);
}

// ── Agenda ───────────────────────────────────────────────────────────────

export function drawAgendaOg(ctx: Ctx, logo: CanvasImageSource, upcoming: Activity[], groups: CommunityGroup[]) {
  background(ctx);
  header(ctx, logo, [{ text: 'agenda', filled: true }]);

  const rows = upcoming.slice(0, 3);
  const rowH = 84;
  const titleH = 64;
  const bodyH = BODY.bottom - BODY.top;
  const listH = rows.length ? rows.length * rowH : 40;
  let y = BODY.top + Math.max(0, (bodyH - titleH - 20 - listH) / 2);

  setFont(ctx, 800, 56, -0.025);
  ctx.fillStyle = C.cream;
  ctx.fillText('Agenda kegiatan komunitas', PAD, y + 50);
  y += titleH + 20;

  if (!rows.length) {
    paragraph(ctx, 'Kegiatan berikutnya segera diumumkan.', PAD, y, INNER, { size: 28, weight: 500, color: C.onTeal, lines: 1 });
  }
  for (const a of rows) {
    // Kotak tanggal seperti di daftar agenda.
    const box = 68;
    ctx.fillStyle = C.panel;
    ctx.beginPath();
    ctx.roundRect(PAD, y + 4, box, box, 16);
    ctx.fill();
    ctx.textAlign = 'center';
    if (a.starts_at) {
      const { day, month } = wibDayParts(a.starts_at);
      setFont(ctx, 800, 30);
      ctx.fillStyle = C.yellow;
      ctx.fillText(day, PAD + box / 2, y + 40);
      setFont(ctx, 700, 16);
      ctx.fillStyle = C.onTeal;
      ctx.fillText(month.toUpperCase(), PAD + box / 2, y + 62);
    } else {
      setFont(ctx, 800, 30);
      ctx.fillStyle = C.yellow;
      ctx.fillText('?', PAD + box / 2, y + 50);
    }
    ctx.textAlign = 'left';

    const x = PAD + box + 24;
    setFont(ctx, 750, 30, -0.01);
    ctx.fillStyle = C.cream;
    ctx.fillText(ellipsize(ctx, a.title, OG_W - PAD - x), x, y + 34);
    const organizer = organizerOf(a, groups)?.name;
    const meta = [a.starts_at ? formatWibTime(a.starts_at) : 'Jadwal menyusul', organizer].filter(Boolean).join(' · ');
    setFont(ctx, 500, 22);
    ctx.fillStyle = C.onTeal;
    ctx.fillText(ellipsize(ctx, meta, OG_W - PAD - x), x, y + 66);
    y += rowH;
  }

  footer(ctx, 'Lihat semua & daftar', `${HOST}/agenda`);
}
