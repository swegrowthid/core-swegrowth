import type { Route } from './+types/code-of-conduct';
import { pageMeta } from '~/lib/site';

export const meta: Route.MetaFunction = () =>
  pageMeta(
    'Code of Conduct — SWE Growth',
    'Nilai, aturan interaksi, dan batas aman yang kita jaga bersama di komunitas Software Engineer Growth.',
  );

const toc = [
  { id: 'context', label: 'Community Context' },
  { id: 'tujuan', label: 'Tujuan Komunitas' },
  { id: 'interaksi', label: 'Interaksi' },
  { id: 'sharia', label: 'Prinsip Sharia Compliance' },
  { id: 'promosi', label: 'Promosi, Sharing & Lowongan' },
  { id: 'privasi', label: 'Privasi & Keamanan' },
  { id: 'pelanggaran', label: 'Jika Ditemukan Pelanggaran' },
  { id: 'pelaporan', label: 'Pelaporan' },
  { id: 'penutup', label: 'Penutup' },
];

/** Isi CoC berupa HTML statis (tidak ada input pengguna), dirender apa adanya. */
const body = `
<h2 id="context">🌱 Community Context</h2>
<p>Software Engineer Growth adalah komunitas terbuka untuk belajar dan bertumbuh sebagai software engineer.</p>

<h2 id="tujuan">🎯 Tujuan Komunitas</h2>
<ul>
  <li>Menjadi ruang belajar software engineering yang fokus dan produktif</li>
  <li>Mendorong pertumbuhan skill, karier, dan kualitas berpikir engineer</li>
  <li>Menjaga lingkungan diskusi yang aman, nyaman, dan saling menghargai</li>
</ul>

<h2 id="interaksi">🤝 Interaksi</h2>
<ul>
  <li>Saling <strong>respect</strong> dalam berdiskusi</li>
  <li>Fokus pada ide, pengalaman, dan solusi, bukan perdebatan personal</li>
  <li>Tidak ada harassment, bullying, spam, atau provokasi</li>
  <li>Gunakan bahasa yang pantas</li>
</ul>

<h2 id="sharia">Prinsip Sharia Compliance dalam Komunitas</h2>
<p>
  Komunitas ini menjunjung tinggi <strong>sharia compliance</strong> sebagai
  <strong>prinsip etika dan batas aman</strong> dalam membangun ruang belajar yang sehat, nyaman, dan
  berkelanjutan. Pendekatan ini kami pilih karena kami percaya bahwa nilai syariah memberikan
  <strong>kerangka kehati-hatian (safety boundary)</strong> yang membantu menjaga adab, fokus, dan
  keberkahan komunitas.
</p>
<p>
  Sharia compliance di sini <strong>bukan dimaksudkan sebagai ruang kajian agama</strong>, dan
  <strong>tidak diarahkan untuk melakukan judgement personal terhadap keyakinan personal anggota</strong>,
  melainkan sebagai <strong>prinsip kehati-hatian komunitas</strong>.
</p>

<h3>1. Promosi &amp; Informasi Lowongan Kerja</h3>
<p>Untuk menjaga <strong>kehati-hatian, kenyamanan, dan keberkahan</strong> dalam komunitas, berlaku ketentuan berikut:</p>
<ul>
  <li>
    <strong>Tidak diperkenankan</strong> membagikan atau mempromosikan informasi lowongan kerja dari
    <strong>lembaga, produk, atau layanan</strong> yang secara umum tidak memenuhi prinsip sharia compliance,
    termasuk namun tidak terbatas pada:
    <ul>
      <li>Lembaga ribawi yang telah dikenal luas (mis. bank konvensional, asuransi konvensional, pinjaman online berbunga)</li>
      <li>Perusahaan dengan aktivitas yang secara jelas termasuk kategori terlarang (mis. minuman keras, rokok, perjudian, pornografi, dll)</li>
    </ul>
  </li>
  <li>Informasi lowongan kerja dari perusahaan yang <strong>berpotensi abu-abu</strong> dapat ditanyakan terlebih dahulu kepada admin/moderator sebelum dibagikan.</li>
</ul>
<p>Ketentuan ini ditetapkan untuk menjaga arah dan nilai komunitas, bukan untuk membatasi atau menilai pilihan personal anggota.</p>

<h3>2. Diskusi Halal–Haram &amp; Fiqh</h3>
<p>
  Hal ini beberapa kali terjadi di awal terbentuknya SWE Growth yang memang sebagian besar anggotanya di
  awal-awal terbentuk berasal dari komunitas <strong>muslim profesional</strong>. Namun dari internal SWE Growth
  tidak menjadikan wadah ini menjadi tempat khusus bagi kalangan tertentu saja, harapannya bisa bermanfaat
  untuk semua.
</p>
<p>Berikut ketentuan yang ditetapkan terkait hal ini:</p>
<ul>
  <li>Komunitas ini <strong>bukan ruang tanya jawab agama</strong></li>
  <li>
    Pertanyaan halal–haram hanya diperbolehkan jika:
    <ul>
      <li>Relevan langsung dengan konteks kerja atau praktik profesional</li>
      <li>Disampaikan secara singkat dan tidak berkembang menjadi diskusi fiqh mendalam</li>
    </ul>
  </li>
  <li>
    Tidak diperkenankan:
    <ul>
      <li>Perdebatan mazhab</li>
      <li>Saling menghakimi</li>
      <li>Menetapkan kesimpulan agama atas nama komunitas</li>
    </ul>
  </li>
</ul>
<p>Diskusi agama yang lebih luas dianjurkan dilakukan di ruang khusus yang memang ditujukan untuk itu.</p>

<h3>3. Konten Visual</h3>
<p>Demi menjaga <strong>kenyamanan, adab, dan kehati-hatian</strong> dalam komunitas:</p>
<ul>
  <li>
    <strong>Tidak diperkenankan</strong> membagikan konten visual yang
    <strong>menampakkan aurat atau mengandung unsur seksual</strong>, baik laki-laki maupun perempuan,
    dalam bentuk apa pun.
  </li>
  <li>
    Ketentuan ini <strong>tidak bergantung pada kerapihan, estetika, atau konteks profesional</strong>,
    melainkan pada <strong>tertutup atau tidaknya aurat</strong> demi kenyamanan bersama.
  </li>
  <li>Konten visual mencakup, namun tidak terbatas pada: foto, ilustrasi, meme, sticker, GIF, dan video.</li>
</ul>
<p>
  Untuk meminimalkan potensi pelanggaran serta menjaga konsistensi visual komunitas, pendekatan berikut
  <strong> sangat dianjurkan dan telah diterapkan pada media swe growth sendiri</strong>:
</p>
<ul>
  <li>Penggunaan <strong>faceless character</strong>, <strong>no human character</strong>, ikon, objek, atau ilustrasi abstrak.</li>
  <li>Jika menggunakan representasi manusia, <strong>diutamakan karakter laki-laki</strong> sebagai pendekatan kehati-hatian untuk meminimalkan potensi penyalahgunaan dan pelecehan visual.</li>
  <li>Representasi manusia harus menggunakan visual yang <strong>aman</strong>, tidak menampilkan detail tubuh, dan <strong>tidak mengarah pada visualisasi aurat</strong>.</li>
  <li>Apabila terdapat kebutuhan khusus untuk membagikan materi yang berpotensi sensitif, wajib menggunakan <strong>blur, crop, atau aset alternatif</strong> yang aman.</li>
</ul>
<blockquote>
  <strong>Referensi aurat secara umum (untuk konteks kehati-hatian)</strong><br />
  Laki-laki: antara pusar hingga lutut.<br />
  Perempuan: seluruh tubuh kecuali wajah dan telapak tangan.
</blockquote>

<h2 id="promosi">📢 Promosi, Sharing, dan Lowongan</h2>
<ul>
  <li>Tidak spam atau promosi berulang</li>
  <li>Lowongan kerja diperbolehkan jika jelas, jujur, dan relevan</li>
  <li>Seluruh aktivitas promosi harus selaras dengan prinsip sharia compliance dan batas komunitas</li>
</ul>

<h2 id="privasi">🔐 Privasi &amp; Keamanan</h2>
<ul>
  <li>Jangan membagikan data pribadi orang lain</li>
  <li>Jangan share data, kode, atau dokumen internal perusahaan</li>
  <li>Dilarang konten ilegal, phishing, crack, atau bajakan</li>
</ul>

<h2 id="pelanggaran">⚖️ Jika Ditemukan Pelanggaran</h2>
<p>Admin dan moderator berhak melakukan:</p>
<ul>
  <li>Menyampaikan kembali ketentuan yang berlaku di Code of Conduct ini</li>
  <li>Penghapusan konten</li>
  <li>Mute sementara</li>
  <li>Pengeluaran dari komunitas (untuk pelanggaran berat atau berulang)</li>
</ul>
<p>Tindakan diambil demi menjaga <strong>kenyamanan, fokus, dan keberkahan komunitas</strong>.</p>

<h2 id="pelaporan">📩 Pelaporan</h2>
<p>Jika menemukan pelanggaran:</p>
<ul>
  <li>Hubungi admin/mod via DM</li>
  <li>Sertakan konteks singkat</li>
  <li>Hindari memperpanjang diskusi di ruang publik</li>
</ul>

<h2 id="penutup">Penutup</h2>
<p>
  Kami percaya komunitas engineering yang sehat membutuhkan <strong>nilai yang dijaga secara konsisten</strong>.
  Sharia compliance kami posisikan sebagai <strong>jalan aman</strong> untuk membangun ruang belajar yang
  nyaman, fokus, dan membawa kebaikan bagi seluruh anggota.
</p>
<p>
  Terima kasih telah menjadi bagian dari Software Engineer Growth.<br />
  Yuk jaga ruang belajar ini tetap nyaman buat semua orang.
</p>
`;

export default function CodeOfConduct() {
  return (
    <>
      <section className="block">
        <div className="wrap">
          <h1 className="page-title">Code of Conduct</h1>
          <p className="muted measure-68 mb-32">
            Nilai, aturan interaksi, dan batas aman yang kita jaga bersama di semua ruang SWE Growth: grup WhatsApp, kegiatan, dan portal
            member.
          </p>
        </div>
        <div className="wrap coc-grid">
          <nav className="toc" aria-label="Daftar isi">
            <p className="mono toc-lbl">Daftar Isi</p>
            <ul>
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`}>{t.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="prose" dangerouslySetInnerHTML={{ __html: body }} />
        </div>
      </section>
    </>
  );
}
