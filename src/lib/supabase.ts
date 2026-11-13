import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
// Felkészítve mindkét névre (PUBLISHABLE_KEY és ANON_KEY)
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Ha nincs beállítva a környezeti változó (pl. lokális demo), ne omoljon össze importáláskor az alkalmazás
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
