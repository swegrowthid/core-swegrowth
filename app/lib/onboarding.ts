import { useRouteLoaderData } from 'react-router';
import type { clientLoader } from '~/routes/member-layout';

/** Sudah onboarding? Dibaca dari loader member-layout; untuk banner portal dan bagian khusus profil lengkap. */
export function useOnboarded() {
  return useRouteLoaderData<typeof clientLoader>('routes/member-layout')?.onboarded ?? true;
}
