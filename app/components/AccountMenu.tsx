import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { displayName, useAuth, useSignOut } from '~/lib/auth';
import { Avatar } from './Avatar';

/** Menu akun di navbar: pintasan portal & profil, lalu Keluar. */
export function AccountMenu() {
  const { user, profile, isAdmin } = useAuth();
  const { signOut, busy } = useSignOut();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname, hash } = useLocation();
  const name = displayName(profile, user);

  // Tutup menu setiap pindah halaman (tanpa effect: state disesuaikan saat render).
  const route = `${pathname}${hash}`;
  const [lastRoute, setLastRoute] = useState(route);
  if (route !== lastRoute) {
    setLastRoute(route);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="account-menu" ref={ref}>
      <button
        type="button"
        className="nav-account"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu akun ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Avatar name={name} src={profile?.avatar_url} size={34} />
        <span>{name.split(' ')[0]}</span>
        <svg
          className="account-caret"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="account-pop" role="menu">
          <div className="account-who">
            <strong>{name}</strong>
            {user?.email && <span>{user.email}</span>}
          </div>
          <Link role="menuitem" to="/portal">
            Portal
          </Link>
          <Link role="menuitem" to="/portal/profil">
            Profil saya
          </Link>
          <Link role="menuitem" to="/portal/profil/edit">
            Edit profil
          </Link>
          <Link role="menuitem" to="/portal#rekomendasiku">
            Rekomendasiku
          </Link>
          {isAdmin && (
            <Link role="menuitem" to="/admin">
              Admin
            </Link>
          )}
          <button role="menuitem" type="button" className="account-out" disabled={busy} onClick={signOut}>
            {busy ? 'Keluar…' : 'Keluar'}
          </button>
        </div>
      )}
    </div>
  );
}
