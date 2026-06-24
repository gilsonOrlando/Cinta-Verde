import { createClient } from "@supabase/supabase-js";
import {
  esSupabaseUrlValida,
  normalizarSupabaseKey,
  normalizarSupabaseUrl,
} from "../utils/normalizarSupabaseEnv";

const supabaseUrl = normalizarSupabaseUrl(import.meta.env.VITE_APP_SUPABASE_URL);
const supabaseAnonKey = normalizarSupabaseKey(import.meta.env.VITE_APP_SUPABASE_ANON_KEY);

export const supabaseConfigurado = Boolean(
  supabaseUrl && supabaseAnonKey && esSupabaseUrlValida(supabaseUrl)
);

if (!supabaseConfigurado) {
  console.error(
    "[Supabase] Configuración inválida. Usa VITE_APP_SUPABASE_URL sin /rest/v1 " +
      "y VITE_APP_SUPABASE_ANON_KEY (anon public)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function verificarConexionSupabase() {
  if (!supabaseConfigurado) {
    return {
      ok: false,
      error:
        "URL o clave de Supabase inválidas. La URL debe ser https://xxx.supabase.co sin /rest/v1.",
    };
  }

  const { error } = await supabase.auth.getSession();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
