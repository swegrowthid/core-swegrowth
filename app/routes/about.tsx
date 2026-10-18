import { Link } from 'react-router';
import type { Route } from './+types/about';
import { useAuth } from '~/lib/auth';
import { pageMeta } from '~/lib/site';

export const meta: Route.MetaFunction = () =>
  pageMeta(
    'Tentang SWE Growth',
    'Kenapa SWE Growth ada: komunitas software engineer Indonesia yang fokus ke career growth, bukan tech stack.',
  );

const TOPICS = ['Effective Engineer', '10x Engineer', 'Going Abroad', 'System Design Interview'];

const PROGRAMS = [
  'Kelas online berdasarkan masalah yang teman-teman hadapi',
  'Sharing session, berupa live session atau podcast tentang isu-isu ringan di software engineering',
  'Diskusi lewat grup komunitas',
  'Dan bentuk program lainnya',
];

/** Cerita di balik SWE Growth — dulu ada di halaman pendaftaran goakal. */
export default function About() {
  const { user } = useAuth();

  return (
    <>
      <section className="block intro on-teal">
        <div className="wrap narrow-wrap">
          <p className="eyebrow">Selayang pandang</p>
          <h1>
            Belajar <span className="hl">career growth</span> sebagai software engineer, bukan cuma tech stack.
          </h1>
        </div>
      </section>

      <section className="block">
        <div className="wrap narrow-wrap">
          <div className="prose">
            <p>Halo, salam kenal! Aku Zikrul Ihsan, saat ini Full Stack Engineer di Hukum Online.</p>
            <p>
              Di tahun 2022, sekitar satu tahun lebih aku pernah bertanggung jawab menyiapkan materi persiapan karier untuk role Software
              Engineer, Product Manager, hingga QA Engineer di salah satu edutech di Indonesia. Fokusnya waktu itu untuk entry level.
              Ternyata banyak edutech juga memberi dukungan seperti ini, supaya entry level mendapatkan kerja pertamanya, sebagai bagian
              dari paket bootcamp yang mereka tawarkan.
            </p>
            <p>
              Setelah bertemu berbagai alumni dan fasilitator, serta ngobrol dengan praktisi software engineer lokal lainnya, aku menemukan
              fakta bahwa teman-teman yang <strong>sudah</strong> masuk ke dunia software engineering pun bingung soal <em>what next</em> di
              perjalanan kariernya. Mereka butuh dukungan untuk career growth dan bisa bertahan di industri yang dinamis ini.
            </p>
            <p>
              Tapi aku belum melihat satu wadah di Indonesia yang mendukung hal ini secara masif. Di luar negeri, mungkin seperti
              Jointaro.com.
            </p>
            <p>
              Untuk mewadahi hal itu, sekaligus jadi tempatku terus belajar, aku menginisiasi komunitas software engineer yang aku sebut{' '}
              <strong>SWE Growth</strong>. Kalau komunitas dan tempat belajar software engineering selama ini banyak yang fokus ke tech
              stack (Flutter, React, dll.), SWE Growth fokus untuk bareng-bareng belajar tentang <strong>career growth</strong> sebagai
              software engineer secara umum.
            </p>
          </div>

          <div className="panel mt-28">
            <div className="panel-head">
              <h2>Contoh topik yang kita bahas</h2>
            </div>
            <div className="tags">
              {TOPICS.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="panel mt-22">
            <div className="panel-head">
              <h2>Program dari pendataan member</h2>
            </div>
            <p className="muted mb-12">
              Supaya bisa menemani perjalanan karier teman-teman dengan efektif, kami minta bantuan mengisi data saat mendaftar. Insyaa
              Allah, dari pendataan ini programnya adalah:
            </p>
            <ol className="plain-list">
              {PROGRAMS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </div>

          <div className="inline-actions mt-28">
            {user ? (
              <Link className="btn btn-primary" to="/portal">
                Buka portal
              </Link>
            ) : (
              <Link className="btn btn-primary" to="/masuk?next=/portal">
                Daftar gratis
              </Link>
            )}
            <Link className="btn btn-ghost" to="/code-of-conduct">
              Code of Conduct
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
