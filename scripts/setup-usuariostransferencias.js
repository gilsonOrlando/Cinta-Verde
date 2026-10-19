import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";
import { claveUsuarioTransferencia, slugSucursal } from "../src/utils/sucursalesSemilla.js";

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

const sqlPath = resolve(process.cwd(), "scripts/setup-usuariostransferencias.sql");
const sql = readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Tabla usuariostransferencias creada correctamente.");

  const { rows: sucursales } = await client.query(
    `select id, nombre, tipo from public.sucursal order by tipo desc, nombre`
  );

  if (sucursales.length === 0) {
    throw new Error("No hay sucursales. Ejecuta primero: npm run setup:sucursal");
  }

  console.log("Credenciales (usuario / clave):");
  for (const sucursal of sucursales) {
    const usuario = slugSucursal(sucursal.nombre);
    const clave = claveUsuarioTransferencia(sucursal.nombre);
    await client.query(
      `insert into public.usuariostransferencias (sucursal_id, usuario, clave_hash, tipo)
       values ($1, $2, crypt($3, gen_salt('bf')), $4)
       on conflict (sucursal_id) do update
         set usuario = excluded.usuario,
             clave_hash = excluded.clave_hash,
             tipo = excluded.tipo`,
      [sucursal.id, usuario, clave, sucursal.tipo]
    );
    console.log(`  ${sucursal.tipo.padEnd(8)} ${sucursal.nombre.padEnd(16)}  ${usuario}  /  ${clave}`);
  }

  console.log(`Listo: ${sucursales.length} usuarios de transferencia.`);
} catch (error) {
  console.error("Error al crear usuariostransferencias:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
