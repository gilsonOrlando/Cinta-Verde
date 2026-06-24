import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_APP_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigurado) {
  console.error(
    "[Supabase] Faltan VITE_APP_SUPABASE_URL o VITE_APP_SUPABASE_ANON_KEY. " +
      "Configura .env.local para desarrollo."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

export async function verificarConexionSupabase() {
  if (!supabaseConfigurado) {
    return { ok: false, error: "Faltan variables de entorno de Supabase." };
  }

  const { error } = await supabase.auth.getSession();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
