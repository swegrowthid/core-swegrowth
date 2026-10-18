import { Link } from 'react-router';
import type { Route } from './+types/terms';
import { LegalPage, type LegalSection } from '~/components/LegalPage';
import { adminWaLink, pageMeta } from '~/lib/site';

export const meta: Route.MetaFunction = () =>
  pageMeta(
    'Syarat Layanan — SWE Growth',
    'Ketentuan memakai swegrowth.id: akun, profil member, pendaftaran kegiatan, dan aturan komunitas.',
  );

const sections: LegalSection[] = [
  {
    id: 'penerimaan',
    title: 'Penerimaan syarat',
    body: (
      <p>
        Dengan membuat akun atau memakai swegrowth.id (situs, portal member, dan pendaftaran kegiatan), kamu setuju dengan syarat layanan
        ini, <Link to="/privasi">Kebijakan Privasi</Link>, dan <Link to="/code-of-conduct">Code of Conduct</Link> SWE Growth. Kalau tidak
        setuju, mohon tidak memakai layanan ini.
      </p>
    ),
  },
  {
    id: 'akun',
    title: 'Akun',
    body: (
      <ul>
        <li>Akun dibuat lewat login Google atau link email. Satu orang satu akun.</li>
        <li>Kamu bertanggung jawab menjaga akses ke akun email yang dipakai untuk masuk.</li>
        <li>Isi data dengan benar. Data diri dan kontak dipakai admin untuk mendata member dan menghubungi peserta kegiatan.</li>
      </ul>
    ),
  },
  {
    id: 'profil',
    title: 'Profil member',
    body: (
      <ul>
        <li>
          Sebagian profilmu tampil publik di swegrowth.id/member/… (lihat <Link to="/privasi#visibilitas">Kebijakan Privasi</Link>). Nomor
          WhatsApp dan email tidak ikut tampil.
        </li>
        <li>Isi profil adalah tanggung jawabmu. Jangan mencantumkan data pribadi orang lain atau informasi yang menyesatkan.</li>
        <li>Admin boleh menyunting atau menyembunyikan isi profil yang melanggar Code of Conduct.</li>
      </ul>
    ),
  },
  {
    id: 'kegiatan',
    title: 'Pendaftaran kegiatan',
    body: (
      <ul>
        <li>
          Kegiatan bertanda "Gratis" tidak dipungut biaya. Kegiatan berbayar akan menampilkan harga dan ketentuannya sebelum mendaftar.
        </li>
        <li>Kalau kuota penuh, pendaftar masuk waitlist dan otomatis naik saat ada peserta yang batal.</li>
        <li>Peserta terkonfirmasi diundang lewat Google Calendar ke email akunnya. Link meeting juga tersedia di halaman pendaftaran.</li>
        <li>Batalkan pendaftaran kalau berhalangan, supaya kursinya bisa dipakai orang lain.</li>
        <li>
          Jadwal, pembicara, atau format kegiatan bisa berubah atau dibatalkan. Perubahan diumumkan di halaman kegiatan dan lewat undangan
          kalender.
        </li>
        <li>Kegiatan bisa direkam. Rekaman dapat dibagikan kembali ke member SWE Growth.</li>
      </ul>
    ),
  },
  {
    id: 'perilaku',
    title: 'Aturan perilaku',
    body: (
      <>
        <p>Selama memakai layanan dan mengikuti kegiatan, kamu setuju untuk tidak:</p>
        <ul>
          <li>
            Melanggar <Link to="/code-of-conduct">Code of Conduct</Link>, termasuk harassment, spam, atau provokasi.
          </li>
          <li>Membagikan link meeting kepada orang yang tidak terdaftar.</li>
          <li>Mengumpulkan atau menyalahgunakan data member lain dari halaman profil publik.</li>
          <li>Mencoba mengakses data atau bagian situs yang bukan hakmu, atau mengganggu jalannya layanan.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'membership',
    title: 'Membership',
    body: (
      <p>
        Membership berbayar dan verified member sedang disiapkan. Ketentuan, harga, dan manfaatnya akan diumumkan sebelum dibuka. Sampai
        saat itu, semua fitur portal bisa dipakai gratis.
      </p>
    ),
  },
  {
    id: 'konten',
    title: 'Materi & hak cipta',
    body: (
      <p>
        Materi kegiatan (slide, rekaman, tulisan) tetap milik pembicara atau SWE Growth. Materi boleh dipakai untuk belajar pribadi, tetapi
        tidak boleh dijual atau disebarkan ulang tanpa izin.
      </p>
    ),
  },
  {
    id: 'penghentian',
    title: 'Penangguhan akun',
    body: (
      <p>
        Admin dapat membatasi atau menutup akses akun yang melanggar syarat ini atau Code of Conduct. Kamu juga bisa meminta penghapusan
        akun kapan saja dengan menghubungi admin.
      </p>
    ),
  },
  {
    id: 'batasan',
    title: 'Batasan tanggung jawab',
    body: (
      <p>
        Layanan disediakan apa adanya oleh komunitas. Kami berusaha menjaga situs tetap berjalan dan data tetap aman, tetapi tidak menjamin
        layanan selalu tersedia tanpa gangguan. Isi yang disampaikan pembicara atau member adalah pendapat mereka masing-masing.
      </p>
    ),
  },
  {
    id: 'perubahan',
    title: 'Perubahan & kontak',
    body: (
      <>
        <p>
          Syarat ini bisa diperbarui sewaktu-waktu. Tanggal "Terakhir diperbarui" di atas ikut berubah, dan perubahan penting diumumkan di
          grup komunitas. Syarat ini tunduk pada hukum Republik Indonesia.
        </p>
        <p>
          Pertanyaan: hubungi admin lewat{' '}
          <a href={adminWaLink('Halo admin SWE Growth, saya ingin bertanya soal syarat layanan.')} target="_blank" rel="noopener">
            WhatsApp
          </a>
          .
        </p>
      </>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Syarat Layanan"
      intro="Ketentuan memakai swegrowth.id: akun, profil member, pendaftaran kegiatan, dan aturan komunitas."
      updated="8 Oktober 2026"
      sections={sections}
    />
  );
}
