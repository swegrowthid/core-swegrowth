/** Topik yang sering dibahas di landing. Topik rekomendasi diatur admin di tabel recommendation_topics. */

/** Pola: apa yang dibahas + kenapa penting sekarang. Maksimal dua kalimat. */
export const TOPICS = [
  { name: 'AI terkini', body: 'Tools dan model AI terbaru, plus cara makenya di kerjaan. Cara kerja engineer lagi berubah cepet.' },
  { name: 'CS fundamental', body: 'Struktur data, algoritma, OS, jaringan. Pas AI bisa nulis kode, pemahaman dasar jadi pembeda.' },
  { name: 'English speaking', body: 'Latihan ngomong Inggris bareng. Peluang remote dan tim global makin kebuka.' },
  { name: 'Backend', body: 'API, database, arsitektur. Salah desain di awal makin mahal benerinnya.' },
  { name: 'Frontend', body: 'Framework, performa, aksesibilitas. Ekosistemnya gerak cepet banget.' },
  { name: 'Mobile dev', body: 'Android, iOS, Flutter, React Native. Kebanyakan pengguna di Indonesia aksesnya lewat HP.' },
  { name: 'Infra & DevOps', body: 'Cloud, CI/CD, observability. Biaya infra makin disorot.' },
  { name: 'Managerial', body: 'Jadi tech lead atau EM. Naik level butuh skill ngurus orang, bukan cuma kode.' },
  { name: 'Karier & loker', body: 'Loker, referral, persiapan interview. Pasar kerja lagi ketat.' },
  { name: 'System design', body: 'Bedah cara sistem besar dibangun. Ini tolok ukur buat naik ke senior.' },
  {
    name: 'Personal project',
    body: 'Side project dari iseng sampai jadi produk. Cara paling cepet buat belajar hal baru sekaligus nambah portofolio.',
  },
  {
    name: 'Buku',
    body: 'Rekomendasi dan obrolan buku, dari engineering sampai pengembangan diri. Biar belajarnya nggak cuma dari thread.',
  },
  { name: 'Hidup sehat', body: 'Olahraga, tidur, dan jaga mental biar nggak burnout. Seharian kerja di depan layar ada harganya.' },
];

export const TOPIC_NAMES = TOPICS.map((t) => t.name);
