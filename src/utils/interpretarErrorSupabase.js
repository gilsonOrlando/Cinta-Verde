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

  const status = error.status ?? error.statusCode ?? "";
  const codigo = error.code ?? "";
  const mensaje = String(error.message ?? error.details ?? "");
  const texto = `${codigo} ${mensaje} ${status}`.toLowerCase();

  if (codigo === "PGRST125" || texto.includes("invalid path specified in request url")) {
    return (
      "URL de Supabase incorrecta en Render. Debe ser solo " +
      "https://tu-proyecto.supabase.co (sin /rest/v1 al final)."
    );
  }

  if (
    codigo === "PGRST205" ||
    status === 404 ||
    texto.includes("could not find the table") ||
    texto.includes("catalogo_productos")
  ) {
    return (
      "La tabla 'catalogo_productos' no existe en Supabase. " +
      "Abre SQL Editor en tu proyecto y ejecuta scripts/setup-catalogo-productos.sql " +
      "(o en tu PC: npm run setup:catalogo)."
    );
  }

  if (texto.includes("proyectos") && texto.includes("schema cache")) {
    return "Faltan tablas en Supabase. En tu PC ejecuta: npm run setup:supabase";
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
