import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { Route } from './+types/login';
import { GoogleSignIn } from '~/components/GoogleSignIn';
import { safeNext, useAuth } from '~/lib/auth';
import { pageMeta } from '~/lib/site';
import { hasSupabase } from '~/lib/supabase';

export const meta: Route.MetaFunction = () => [
  ...pageMeta('Masuk — SWE Growth', 'Masuk ke akun SWE Growth.'),
  { name: 'robots', content: 'noindex' },
];

export default function Login() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const { loading, user } = useAuth();
  const [error, setError] = useState<string | null>(params.get('error') === 'callback' ? 'Login Google belum selesai. Coba lagi.' : null);

  // Sudah login? Langsung lanjut.
  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [loading, user, next, navigate]);

  return (
    <section className="block auth-block">
      <div className="wrap" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="form-card auth-card">
          <h1>Daftar / masuk SWE Growth</h1>
          <p className="form-sub">
            Cukup pakai akun Google, tanpa password. Akun baru langsung dibuat. Setelah itu isi profil singkat, lalu link grup WhatsApp
            komunitas langsung muncul.
          </p>

          {!hasSupabase && <p className="form-message error">Login belum dikonfigurasi di environment ini.</p>}
          {error && <p className="form-message error">{error}</p>}

          <GoogleSignIn next={next} onError={setError} />

          <p className="auth-foot">
            Dengan masuk, kamu setuju dengan <Link to="/term-of-service">Syarat Layanan</Link>, <Link to="/privasi">Kebijakan Privasi</Link>
            , dan <Link to="/code-of-conduct">Code of Conduct</Link> komunitas.
          </p>
        </div>
      </div>
    </section>
  );
}
