import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";
import { SUCURSALES_SEMILLA } from "../src/utils/sucursalesSemilla.js";

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

const sqlPath = resolve(process.cwd(), "scripts/setup-sucursal.sql");
const sql = readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Tabla sucursal creada correctamente.");

  for (const sucursal of SUCURSALES_SEMILLA) {
    await client.query(
      `insert into public.sucursal (nombre, tipo)
       values ($1, $2)
       on conflict (nombre) do update set tipo = excluded.tipo`,
      [sucursal.nombre, sucursal.tipo]
    );
    console.log(`Registrada: ${sucursal.nombre} (${sucursal.tipo})`);
  }

  console.log(`Listo: ${SUCURSALES_SEMILLA.length} sucursales.`);
} catch (error) {
  console.error("Error al crear sucursal:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
