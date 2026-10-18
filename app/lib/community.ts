import { supabase } from './supabase';

/** Grup WhatsApp per bidang. RLS hanya membuka isinya untuk member yang sudah onboarding. */
export async function fetchWhatsappGroups() {
  const { data } = await supabase().from('whatsapp_groups').select('*').order('sort_order').order('created_at');
  return data ?? [];
}
