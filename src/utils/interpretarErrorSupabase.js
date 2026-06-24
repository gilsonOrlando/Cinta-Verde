import { supabaseConfigurado } from "../supabase/supabase.config";

export function interpretarErrorSupabase(error) {
  if (!supabaseConfigurado) {
    return (
      "Supabase no está configurado en Render. Agrega VITE_APP_SUPABASE_URL y " +
      "VITE_APP_SUPABASE_ANON_KEY en Environment y redespliega con Clear build cache."
    );
  }

  if (!error) {
    return "No se pudo conectar con Supabase.";
  }

  const codigo = error.code ?? "";
  const mensaje = String(error.message ?? error.details ?? "");
  const texto = `${codigo} ${mensaje}`.toLowerCase();

  if (codigo === "PGRST125" || texto.includes("invalid path specified in request url")) {
    return (
      "URL de Supabase incorrecta en Render. Debe ser solo " +
      "https://tu-proyecto.supabase.co (sin /rest/v1 al final)."
    );
  }

  if (
    codigo === "PGRST205" ||
    texto.includes("could not find the table") ||
    texto.includes("proyectos") && texto.includes("schema cache")
  ) {
    return (
      "La tabla 'proyectos' no existe en Supabase. En tu PC ejecuta: npm run setup:supabase"
    );
  }

  if (codigo === "PGRST301" || texto.includes("jwt")) {
    return "La clave VITE_APP_SUPABASE_ANON_KEY en Render es incorrecta.";
  }

  if (texto.includes("invalid api key") || texto.includes("apikey")) {
    return "Revisa VITE_APP_SUPABASE_ANON_KEY en las variables de entorno de Render.";
  }

  if (mensaje) return mensaje;

  return "No se pudo conectar con Supabase. Verifica URL y anon key en Render.";
}
