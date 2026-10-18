import { useState, type FormEvent, type ReactNode } from 'react';
import type { Experience, ProfileRow, Seniority } from '~/lib/database.types';
import {
  isLinkedinUrl,
  normalizeUrl,
  parseTags,
  SENIORITIES,
  seniorityLabel,
  sortExperiences,
  USERNAME_RE,
  WHATSAPP_RE,
  updateProfile,
} from '~/lib/profile';

type Props = {
  profile: ProfileRow;
  submitLabel: string;
  onSaved: (profile: ProfileRow) => void;
};

type ExperienceDraft = Experience & { key: number; current: boolean };

let nextKey = 0;
const toDraft = (e: Experience): ExperienceDraft => ({ ...e, key: nextKey++, current: e.end === null });
const emptyDraft = (): ExperienceDraft => toDraft({ role: '', company: '', start: '', end: null, description: '' });

/** Data member: kontak, karier, keahlian, teknologi, dan riwayat pengalaman. */
export function ProfileForm({ profile, submitLabel, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [experiences, setExperiences] = useState(() => sortExperiences(profile.experiences).map(toDraft));

  const updateExperience = (key: number, patch: Partial<ExperienceDraft>) =>
    setExperiences((list) => list.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const val = (name: string) => String(form.get(name) ?? '').trim();

    const whatsapp = val('whatsapp');
    if (!WHATSAPP_RE.test(whatsapp)) {
      setError('Nomor WhatsApp 8–20 digit, boleh diawali +.');
      return;
    }

    const linkedin = normalizeUrl(val('linkedin_url'));
    if (!isLinkedinUrl(linkedin)) {
      setError('Isi link profil LinkedIn kamu, contohnya linkedin.com/in/nama-kamu.');
      return;
    }

    const username = val('username').toLowerCase();
    if (username && !USERNAME_RE.test(username)) {
      setError('Username 3–30 karakter: huruf kecil, angka, atau garis bawah (_).');
      return;
    }

    const filled = experiences.filter((x) => x.role.trim() || x.company.trim());
    const invalid = filled.find((x) => !x.role.trim() || !x.company.trim() || !x.start || (!x.current && !x.end));
    if (invalid) {
      setError('Setiap pengalaman butuh peran, perusahaan, bulan mulai, dan bulan selesai (atau centang "masih di sini").');
      return;
    }
    if (filled.some((x) => !x.current && x.end! < x.start)) {
      setError('Bulan selesai pengalaman tidak boleh sebelum bulan mulai.');
      return;
    }

    const techStack = parseTags(val('tech_stack'));
    if (techStack.length === 0) {
      setError('Isi minimal satu teknologi yang kamu kuasai.');
      return;
    }

    const years = val('years_experience');

    setBusy(true);
    setError(null);
    const { data, error: saveError } = await updateProfile(profile.id, {
      full_name: val('full_name'),
      username: username || null,
      whatsapp,
      location: val('location') || null,
      headline: val('headline'),
      company: val('company') || null,
      seniority: (val('seniority') || null) as Seniority | null,
      years_experience: years ? Number.parseInt(years, 10) : null,
      linkedin_url: linkedin,
      github_url: normalizeUrl(val('github_url')),
      portfolio_url: normalizeUrl(val('portfolio_url')),
      skills: parseTags(val('skills')),
      tech_stack: techStack,
      experiences: sortExperiences(
        filled.map((x) => ({
          role: x.role.trim(),
          company: x.company.trim(),
          start: x.start,
          end: x.current ? null : x.end,
          description: x.description.trim(),
        })),
      ),
      bio: val('bio'),
      onboarded_at: profile.onboarded_at ?? new Date().toISOString(),
    });
    setBusy(false);

    if (saveError) {
      setError(
        saveError.code === '23505'
          ? 'Username itu sudah dipakai member lain. Coba yang lain.'
          : 'Profil belum tersimpan. Periksa isian lalu coba lagi.',
      );
      return;
    }
    onSaved(data);
  };

  return (
    <form className="form-card wide profile-form" onSubmit={onSubmit}>
      {error && <p className="form-message error">{error}</p>}

      <Section title="Data diri">
        <div className="form-grid">
          <Field id="full_name" label="Nama lengkap">
            <input id="full_name" name="full_name" required maxLength={80} defaultValue={profile.full_name} autoComplete="name" />
          </Field>
          <Field id="whatsapp" label="Nomor WhatsApp">
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              required
              defaultValue={profile.whatsapp ?? ''}
              autoComplete="tel"
              placeholder="08…"
            />
          </Field>
          <Field id="location" label="Domisili" optional>
            <input
              id="location"
              name="location"
              maxLength={80}
              defaultValue={profile.location ?? ''}
              placeholder="Kota"
              autoComplete="address-level2"
            />
          </Field>
        </div>
      </Section>

      <Section title="Karier">
        <div className="form-grid">
          <Field id="headline" label="Peran saat ini">
            <input
              id="headline"
              name="headline"
              required
              maxLength={120}
              defaultValue={profile.headline}
              placeholder="Backend engineer / mahasiswa TI"
            />
          </Field>
          <Field id="company" label="Perusahaan / kampus" optional>
            <input id="company" name="company" maxLength={80} defaultValue={profile.company ?? ''} autoComplete="organization" />
          </Field>
          <Field id="seniority" label="Level">
            <select id="seniority" name="seniority" required defaultValue={profile.seniority ?? ''}>
              <option value="" disabled>
                Pilih level
              </option>
              {SENIORITIES.map((s) => (
                <option key={s} value={s}>
                  {seniorityLabel[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="years_experience" label="Lama pengalaman (tahun)" optional>
            <input
              id="years_experience"
              name="years_experience"
              type="number"
              min={0}
              max={60}
              inputMode="numeric"
              defaultValue={profile.years_experience ?? ''}
            />
          </Field>
        </div>
      </Section>

      <Section title="Tautan">
        <Field id="username" label="Link profil publik" optional>
          <div className="input-prefix">
            <span>swegrowth.id/member/</span>
            <input
              id="username"
              name="username"
              maxLength={30}
              defaultValue={profile.username ?? ''}
              placeholder="namakamu"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        </Field>
        <div className="form-grid">
          <Field id="linkedin_url" label="LinkedIn" hint="Wajib, supaya kami tahu kamu orang asli. Tampil di profil publikmu.">
            <input
              id="linkedin_url"
              name="linkedin_url"
              required
              maxLength={200}
              defaultValue={profile.linkedin_url ?? ''}
              placeholder="linkedin.com/in/nama-kamu"
            />
          </Field>
          <Field id="github_url" label="GitHub" optional>
            <input id="github_url" name="github_url" maxLength={200} defaultValue={profile.github_url ?? ''} placeholder="github.com/…" />
          </Field>
          <Field id="portfolio_url" label="Portfolio / website" optional>
            <input
              id="portfolio_url"
              name="portfolio_url"
              maxLength={200}
              defaultValue={profile.portfolio_url ?? ''}
              placeholder="namamu.dev"
            />
          </Field>
        </div>
      </Section>

      <Section title="Keahlian & teknologi" sub="Pisahkan dengan koma.">
        <Field id="skills" label="Keahlian" optional>
          <input id="skills" name="skills" defaultValue={profile.skills.join(', ')} placeholder="Backend, system design, mentoring" />
        </Field>
        <Field id="tech_stack" label="Teknologi yang dikuasai">
          <input
            id="tech_stack"
            name="tech_stack"
            required
            defaultValue={profile.tech_stack.join(', ')}
            placeholder="Go, PostgreSQL, React, AWS"
          />
        </Field>
      </Section>

      <Section title="Pengalaman kerja">
        {experiences.length > 0 && (
          <ol className="experience-drafts">
            {experiences.map((x) => (
              <li key={x.key}>
                <div className="form-grid">
                  <Field id={`role-${x.key}`} label="Peran">
                    <input
                      id={`role-${x.key}`}
                      maxLength={120}
                      value={x.role}
                      onChange={(e) => updateExperience(x.key, { role: e.target.value })}
                    />
                  </Field>
                  <Field id={`company-${x.key}`} label="Perusahaan">
                    <input
                      id={`company-${x.key}`}
                      maxLength={80}
                      value={x.company}
                      onChange={(e) => updateExperience(x.key, { company: e.target.value })}
                    />
                  </Field>
                  <Field id={`start-${x.key}`} label="Mulai">
                    <input
                      id={`start-${x.key}`}
                      type="month"
                      value={x.start}
                      onChange={(e) => updateExperience(x.key, { start: e.target.value })}
                    />
                  </Field>
                  <Field id={`end-${x.key}`} label="Selesai">
                    <input
                      id={`end-${x.key}`}
                      type="month"
                      disabled={x.current}
                      value={x.current ? '' : (x.end ?? '')}
                      onChange={(e) => updateExperience(x.key, { end: e.target.value || null })}
                    />
                  </Field>
                </div>
                <label className="check-field">
                  <input type="checkbox" checked={x.current} onChange={(e) => updateExperience(x.key, { current: e.target.checked })} />{' '}
                  Masih di sini
                </label>
                <Field id={`desc-${x.key}`} label="Yang dikerjakan" optional>
                  <textarea
                    id={`desc-${x.key}`}
                    rows={2}
                    maxLength={500}
                    value={x.description}
                    onChange={(e) => updateExperience(x.key, { description: e.target.value })}
                  />
                </Field>
                <button className="link-btn" type="button" onClick={() => setExperiences((list) => list.filter((e) => e.key !== x.key))}>
                  Hapus pengalaman ini
                </button>
              </li>
            ))}
          </ol>
        )}
        {experiences.length < 20 && (
          <button className="btn btn-ghost sm" type="button" onClick={() => setExperiences((list) => [...list, emptyDraft()])}>
            + Tambah pengalaman
          </button>
        )}
      </Section>

      <Section title="Tentang kamu">
        <Field id="bio" label="Bio singkat" optional>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={1000}
            defaultValue={profile.bio}
            placeholder="Fokus kerja, minat, atau hal yang sedang dipelajari"
          />
        </Field>
      </Section>

      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Menyimpan…' : submitLabel}
      </button>
    </form>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <fieldset className="profile-section">
      <legend>{title}</legend>
      {sub && <p className="form-sub">{sub}</p>}
      {children}
    </fieldset>
  );
}

function Field({
  id,
  label,
  optional,
  hint,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional && <small> (opsional)</small>}
      </label>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}
