import { Link } from 'react-router';
import type { Route } from './+types/privacy';
import { LegalPage, type LegalSection } from '~/components/LegalPage';
import { adminWaLink, pageMeta } from '~/lib/site';

export const meta: Route.MetaFunction = () =>
  pageMeta('Kebijakan Privasi — SWE Growth', 'Data apa yang dikumpulkan SWE Growth, untuk apa, siapa yang bisa melihatnya, dan hak kamu atas data tersebut.');

const contact = adminWaLink('Halo admin SWE Growth, saya ingin bertanya soal data pribadi saya.');

/**
 * Isi harus mengikuti yang benar-benar dilakukan aplikasi (dicek Google saat
 * review OAuth). Ubah halaman ini setiap ada data atau layanan pihak ketiga baru.
 */
const sections: LegalSection[] = [
  {
    id: 'pengelola',
    title: 'Siapa kami',
    body: (
      <p>
        swegrowth.id dikelola oleh SWE Growth (Software Engineer Growth), komunitas software engineer Indonesia yang
        merupakan bagian dari Ahsan Project. Kebijakan ini menjelaskan bagaimana kami mengelola data saat kamu memakai
        situs, portal member, dan pendaftaran kegiatan.
      </p>
    ),
  },
  {
    id: 'data',
    title: 'Data yang kami kumpulkan',
    body: (
      <>
        <ul>
          <li><strong>Data akun</strong> saat masuk dengan Google atau link email: nama, alamat email, dan foto profil Google.</li>
          <li><strong>Profil member</strong> yang kamu isi: nomor WhatsApp, domisili, peran, perusahaan/kampus, level, lama pengalaman, LinkedIn, GitHub, portfolio, keahlian, teknologi, riwayat pengalaman, bio, dan username.</li>
          <li><strong>Jawaban kenalan</strong> saat onboarding: masalah karier, hal yang bisa membantu, alasan bergabung, dan harapan.</li>
          <li><strong>Pendaftaran kegiatan</strong>: nama, email, WhatsApp, status pendaftaran, dan jawaban pertanyaan tambahan di form pendaftaran.</li>
          <li><strong>Foto dokumentasi kegiatan</strong> yang diunggah admin dan tampil publik di halaman kegiatan. Kamu bisa terlihat di foto kegiatan yang kamu ikuti; minta admin menghapus fotonya kalau keberatan.</li>
        </ul>
        <p>Kami tidak mengumpulkan data pembayaran. Kami tidak memakai cookie iklan atau pelacak pihak ketiga.</p>
      </>
    ),
  },
  {
    id: 'penggunaan',
    title: 'Untuk apa data dipakai',
    body: (
      <ul>
        <li>Mendata member komunitas dan memberi akses ke portal serta grup WhatsApp komunitas.</li>
        <li>Memproses pendaftaran kegiatan: konfirmasi, kuota, waitlist, dan link meeting.</li>
        <li>Mengirim undangan Google Calendar untuk kegiatan yang kamu ikuti (lihat bagian Google di bawah).</li>
        <li>Menyusun program komunitas (kelas, sharing session) berdasarkan jawaban kenalan dan masukan member.</li>
        <li>Menghubungi kamu terkait kegiatan atau keanggotaan, misalnya lewat WhatsApp oleh admin.</li>
      </ul>
    ),
  },
  {
    id: 'visibilitas',
    title: 'Siapa yang bisa melihat data',
    body: (
      <>
        <ul>
          <li>
            <strong>Publik</strong> (siapa pun, lewat halaman profil swegrowth.id/member/…): nama, foto, peran,
            perusahaan, level, lama pengalaman, domisili, tautan (LinkedIn/GitHub/portfolio), keahlian, teknologi,
            riwayat pengalaman, bio, dan tanggal bergabung.
          </li>
          <li>
            <strong>Hanya kamu dan admin SWE Growth</strong>: email, nomor WhatsApp, jawaban kenalan, serta data dan
            jawaban pendaftaran kegiatan.
          </li>
          <li>
            Halaman kegiatan hanya menampilkan <strong>jumlah</strong> peserta, bukan siapa saja yang mendaftar. Di
            undangan Google Calendar, tamu tidak bisa melihat daftar tamu lain.
          </li>
        </ul>
        <p>Kami tidak menjual atau menyewakan data kamu kepada siapa pun.</p>
      </>
    ),
  },
  {
    id: 'google',
    title: 'Google Sign-In & Google Calendar',
    body: (
      <>
        <p>
          <strong>Masuk dengan Google</strong> hanya dipakai untuk mengenali akunmu (nama, email, foto profil). Kami
          tidak meminta akses ke Gmail, Drive, atau kalender pribadimu.
        </p>
        <p>
          <strong>Google Calendar</strong>: SWE Growth memakai akses Google Calendar pada <em>akun SWE Growth sendiri</em>{' '}
          untuk membuat jadwal kegiatan dan menambahkan email peserta terkonfirmasi sebagai tamu. Google lalu mengirim
          undangan, perubahan jadwal, atau pembatalan ke email tersebut. Kalau kamu membatalkan pendaftaran, emailmu
          dihapus dari daftar tamu. Akses ini tidak dipakai untuk membaca kalender orang lain.
        </p>
        <p>
          Penggunaan informasi yang diterima dari Google API mengikuti{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">
            Google API Services User Data Policy
          </a>
          , termasuk ketentuan Limited Use.
        </p>
      </>
    ),
  },
  {
    id: 'pihak-ketiga',
    title: 'Layanan pihak ketiga',
    body: (
      <>
        <p>Untuk menjalankan situs, data diproses oleh penyedia layanan berikut:</p>
        <ul>
          <li><strong>Supabase</strong>: database, login akun, dan penyimpanan foto dokumentasi kegiatan.</li>
          <li><strong>Google</strong>: login dengan Google dan undangan Google Calendar.</li>
          <li><strong>Netlify</strong>: hosting situs.</li>
          <li><strong>unavatar.io</strong>: menampilkan foto profil LinkedIn <em>pembicara</em> kegiatan (bukan foto member).</li>
          <li><strong>WhatsApp</strong>: grup komunitas dan komunikasi dengan admin.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'penyimpanan',
    title: 'Penyimpanan & keamanan',
    body: (
      <p>
        Data disimpan di database Supabase dengan aturan akses per baris (row level security): setiap akun hanya bisa
        membaca datanya sendiri, data publik hanya berisi kolom profil yang disebut di atas, dan data lain hanya bisa
        dibaca admin. Kami menyimpan data selama akunmu aktif atau selama diperlukan untuk kegiatan komunitas.
      </p>
    ),
  },
  {
    id: 'hak',
    title: 'Hak kamu',
    body: (
      <>
        <p>Sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, kamu berhak untuk:</p>
        <ul>
          <li>Melihat dan memperbarui profilmu kapan saja di <Link to="/portal/profil">halaman profil</Link>.</li>
          <li>Membatalkan pendaftaran kegiatan dari halaman pendaftaranmu.</li>
          <li>Meminta salinan data, koreksi, atau penghapusan akun beserta datanya dengan menghubungi admin.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'kontak',
    title: 'Kontak & perubahan',
    body: (
      <>
        <p>
          Pertanyaan atau permintaan terkait data pribadi: hubungi admin lewat{' '}
          <a href={contact} target="_blank" rel="noopener">WhatsApp</a>.
        </p>
        <p>
          Kalau kebijakan ini berubah, tanggal "Terakhir diperbarui" di atas ikut berubah. Perubahan penting akan kami
          umumkan di grup komunitas.
        </p>
      </>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Kebijakan Privasi"
      intro="Data apa yang kami kumpulkan, untuk apa, siapa yang bisa melihatnya, dan hak kamu atas data tersebut."
      updated="12 Oktober 2026"
      sections={sections}
    />
  );
}
