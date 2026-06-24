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

for (const key of required) {
  if (process.env[key]) {
    process.env[key] = process.env[key].trim().replace(/^["']|["']$/g, "");
  }
}

if (process.env.VITE_APP_SUPABASE_URL) {
  process.env.VITE_APP_SUPABASE_URL = process.env.VITE_APP_SUPABASE_URL
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");
}

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  const esRender = Boolean(process.env.RENDER);

  if (esRender) {
    console.error(
      `[check-env] ERROR: faltan variables en Render: ${missing.join(", ")}. ` +
        "Configúralas en Environment antes del build."
    );
    process.exit(1);
  }

  console.warn(
    `[check-env] Variables faltantes: ${missing.join(", ")}. ` +
      "Configura .env.local para desarrollo."
  );
}
