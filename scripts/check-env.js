import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function cargarEnvLocal() {
  const ruta = resolve(process.cwd(), ".env.local");
  if (!existsSync(ruta)) return;

  const contenido = readFileSync(ruta, "utf8");
  for (const linea of contenido.split("\n")) {
    const texto = linea.trim();
    if (!texto || texto.startsWith("#")) continue;

    const [clave, ...resto] = texto.split("=");
    if (!clave || resto.length === 0) continue;

    if (!process.env[clave.trim()]) {
      process.env[clave.trim()] = resto.join("=").trim();
    }
  }
}

cargarEnvLocal();

const required = ["VITE_APP_SUPABASE_URL", "VITE_APP_SUPABASE_ANON_KEY"];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.warn(
    `[check-env] Variables faltantes: ${missing.join(", ")}. ` +
      "Configura .env.local para desarrollo."
  );
}
