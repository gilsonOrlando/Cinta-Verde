import { readFileSync, existsSync } from "fs";
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

    process.env[clave.trim()] = resto.join("=").trim();
  }
}

cargarEnvLocal();

const url = process.env.VITE_APP_SUPABASE_URL;
const key = process.env.VITE_APP_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Faltan VITE_APP_SUPABASE_URL o VITE_APP_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

const respuesta = await fetch(`${url}/rest/v1/productos?select=id&limit=1`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
});

const texto = await respuesta.text();

if (respuesta.ok) {
  const data = JSON.parse(texto);
  console.log("Conexión OK con Supabase.");
  console.log("URL:", url);
  console.log("Tabla productos:", Array.isArray(data) ? `${data.length} registro(s) de prueba` : data);
  process.exit(0);
}

if (respuesta.status === 404 && texto.includes("productos")) {
  console.log("Conexión OK con Supabase.");
  console.log("URL:", url);
  console.warn("La tabla 'productos' aún no existe. Créala en el panel si la necesitas.");
  process.exit(0);
}

console.error("Error HTTP", respuesta.status, texto);
process.exit(1);
