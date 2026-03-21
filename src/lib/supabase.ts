import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

const { url, anonKey } = getSupabaseEnv();

export const supabase = createClient(url, anonKey);
