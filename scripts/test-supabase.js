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

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

async function probarTabla(nombre) {
  const respuesta = await fetch(`${url}/rest/v1/${nombre}?select=id&limit=1`, { headers });
  const texto = await respuesta.text();
  return { nombre, status: respuesta.status, texto };
}

const tablas = ["proyectos", "productos"];
const resultados = await Promise.all(tablas.map(probarTabla));

console.log("Conexión OK con Supabase.");
console.log("URL:", url);

let hayError = false;

for (const { nombre, status, texto } of resultados) {
  if (status === 200) {
    const data = JSON.parse(texto);
    console.log(`Tabla ${nombre}: OK (${Array.isArray(data) ? data.length : 0} registro(s) de prueba)`);
    continue;
  }

  if (status === 404 && texto.includes(nombre)) {
    console.warn(`Tabla ${nombre}: NO EXISTE. Ejecuta npm run setup:supabase`);
    hayError = true;
    continue;
  }

  console.error(`Tabla ${nombre}: error HTTP ${status}`, texto);
  hayError = true;
}

process.exit(hayError ? 1 : 0);
