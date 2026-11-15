import { client } from './activities';
import type { PublishedContribution } from './database.types';

export type Contribution = PublishedContribution;

/** Kontribusi yang tampil di landing, lewat published_contributions() (profiles tertutup untuk publik). */
export async function getPublishedContributions({ strict = false } = {}): Promise<Contribution[]> {
  const db = client();
  if (!db) return [];

  const { data, error } = await db.rpc('published_contributions');
  if (error) {
    console.error('Tidak dapat mengambil kontribusi member dari Supabase:', error.message);
    if (strict) throw error;
    return [];
  }
  return data;
}
