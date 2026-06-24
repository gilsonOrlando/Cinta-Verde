import { parseTransferenciaPdf } from "../src/utils/parseTransferenciaPdf.js";

const casos = [
  {
    nombre: "Un solo producto - formato normal",
    text: `Bodega Destino: Catamayo
Producto Cantidad Unidad Código
37443 BATERIA BOSCH S4-42 HIGH POWER +
44580 DISCO (2) UN 3,00 0,00
3,00
Descripción`,
  },
  {
    nombre: "Un solo producto - todo en una linea",
    text: `Número: TRB-082809 Bodega Origen: Bodega de compras Bodega Destino: Catamayo Producto Cantidad Unidad Código 37443 BATERIA BOSCH S4-42 HIGH POWER + 44580 DISCO (2) UN 3,00 0,00 3,00 Descripción CENTRAL // FACT 90426`,
  },
  {
    nombre: "Un solo producto - sin lote ni DISCO",
    text: `Bodega Destino: Catamayo Producto Cantidad 37443 BATERIA BOSCH S4-42 HIGH POWER + UN 3,00 0,00 Descripción`,
  },
  {
    nombre: "Un solo producto - codigo y nombre separados",
    text: `Bodega Destino: Catamayo
Producto Cantidad Unidad Código
37443
BATERIA BOSCH S4-42 HIGH POWER +
44580 DISCO (2) UN 3,00 0,00
Descripción`,
  },
  {
    nombre: "Un solo producto - sin seccion descripcion",
    text: `Bodega Destino: Catamayo
Producto Cantidad Unidad Código
37443 BATERIA BOSCH S4-42 HIGH POWER +
44580 DISCO (2) UN 3,00 0,00`,
  },
  {
    nombre: "Varios productos (4)",
    text: `Número: TRB-082809
Bodega Origen: Bodega de compras Bodega Destino: Catamayo
Producto Cantidad Unidad Código Lote Recibido Unidad
37443 BATERIA BOSCH S4-42 HIGH POWER +
44580 DISCO (2) UN 3,00 0,00
38226 BATERIA BOSCH S4 48 HIGH POWER +
44580 DISCO (2) UN 1,00 0,00
39021 BATERIA BOSCH S4 55 FULL EQUIPO +
44580 DISCO (2) UN 1,00 0,00
39360 BATERIA BOSCH S4-34 HIGH POWER +
44580 DISCO (2) UN 2,00 0,00
7,00
Descripción`,
  },
];

let fallos = 0;

for (const caso of casos) {
  const result = parseTransferenciaPdf(caso.text);
  const esperado = caso.nombre.includes("Varios") ? 4 : 1;
  const ok = result.productos.length === esperado;

  console.log(`\n=== ${caso.nombre} ===`);
  console.log(`Esperado: ${esperado} | Obtenido: ${result.productos.length} | ${ok ? "OK" : "FALLO"}`);
  console.log(JSON.stringify(result.productos, null, 2));

  if (!ok) fallos++;
}

console.log(`\n${fallos === 0 ? "Todos los casos pasaron" : `${fallos} caso(s) fallaron`}`);
