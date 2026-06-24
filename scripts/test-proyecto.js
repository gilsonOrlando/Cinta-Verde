import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function cargarEnvLocal() {
  const ruta = resolve(process.cwd(), ".env.local");
  if (!existsSync(ruta)) return;

  for (const linea of readFileSync(ruta, "utf8").split("\n")) {
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
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const proyectoResp = await fetch(`${url}/rest/v1/proyectos`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    nombre: "Test proyecto toma fisica",
    nombre_archivo: "test.xlsx",
    codigo_acceso: "TESTMOB01",
  }),
});

if (!proyectoResp.ok) {
  console.error("Error creando proyecto:", proyectoResp.status, await proyectoResp.text());
  process.exit(1);
}

const [proyecto] = await proyectoResp.json();

const productosResp = await fetch(`${url}/rest/v1/productos`, {
  method: "POST",
  headers,
  body: JSON.stringify([
    {
      proyecto_id: proyecto.id,
      codigo: "12345",
      producto: "Producto test",
      cantidad_sistema: "10,00",
      cantidad_toma_fisica: "9,50",
    },
  ]),
});

if (!productosResp.ok) {
  console.error("Error creando productos:", productosResp.status, await productosResp.text());
  await fetch(`${url}/rest/v1/proyectos?id=eq.${proyecto.id}`, {
    method: "DELETE",
    headers,
  });
  process.exit(1);
}

const productos = await productosResp.json();

console.log("Proyecto creado:", proyecto.nombre, proyecto.codigo_acceso);

const buscarResp = await fetch(
  `${url}/rest/v1/proyectos?select=id,nombre,codigo_acceso&codigo_acceso=eq.TESTMOB01`,
  { headers }
);

if (!buscarResp.ok) {
  console.error("Error buscando proyecto por código:", await buscarResp.text());
  process.exit(1);
}

const [proyectoEncontrado] = await buscarResp.json();
console.log("Proyecto encontrado por código móvil:", proyectoEncontrado?.nombre);

const updateResp = await fetch(`${url}/rest/v1/productos?id=eq.${productos[0].id}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ cantidad_toma_fisica: "10,50" }),
});

if (!updateResp.ok) {
  console.error("Error actualizando cantidad física:", await updateResp.text());
  process.exit(1);
}

console.log("Actualización de cantidad física OK.");

await fetch(`${url}/rest/v1/proyectos?id=eq.${proyecto.id}`, {
  method: "DELETE",
  headers,
});

console.log("Test OK (datos de prueba eliminados).");
