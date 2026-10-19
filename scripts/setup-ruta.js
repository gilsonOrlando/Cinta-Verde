import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";

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

const url = process.env.VITE_APP_SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;

if (!url || !password) {
  console.error("Faltan VITE_APP_SUPABASE_URL o SUPABASE_DB_PASSWORD en .env.local");
  process.exit(1);
}

const projectRef = new URL(url).hostname.split(".")[0];
const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;

const sqlPath = resolve(process.cwd(), "scripts/setup-ruta.sql");
const sqlTransitorioPath = resolve(process.cwd(), "scripts/setup-ruta-transitorio.sql");
const sql = readFileSync(sqlPath, "utf8");
const sqlTransitorio = readFileSync(sqlTransitorioPath, "utf8");

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  await client.query(sqlTransitorio);
  const { rows } = await client.query(
    `select s.nombre
     from public.ruta r
     join public.sucursal s on s.id = r.origen_id
     where r.transitorio
     order by s.nombre`
  );
  console.log("Relación matriz 1:N ruta aplicada correctamente.");
  console.log(`Rutas transitorias: ${rows.map((item) => item.nombre).join(", ") || "ninguna"}`);
} catch (error) {
  console.error("Error al crear ruta:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
