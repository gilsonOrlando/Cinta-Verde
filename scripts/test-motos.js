import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTransferenciaPdf } from "../src/utils/parseTransferenciaPdf.js";
import {
  esProductoMoto,
  extraerProductosMotoDeTexto,
  obtenerProductosMotosDesdeTexto,
} from "../src/utils/filtrarProductosMotos.js";
import { parseMotosPdf } from "../src/utils/parseMotosPdf.js";

test("incluye productos cuya primera palabra menciona MOTO", () => {
  assert.equal(esProductoMoto("MOTO ZONSEN ZS150-46"), true);
  assert.equal(esProductoMoto("moto yamaha fz"), true);
  assert.equal(esProductoMoto("MOTOCICLETA HONDA"), true);
  assert.equal(esProductoMoto("CAMISETAS BENETY"), false);
});

test("extrae motos usando UN como separador en una linea", () => {
  const texto =
    "56463 MOTO ZONSEN ZS150-46 BATLLO 3 AÑO 2027 UN 1,00 1,00 51775 CAMISETAS BENETY UN 2,00 2,00";

  const productos = extraerProductosMotoDeTexto(texto);

  assert.equal(productos.length, 1);
  assert.equal(productos[0].codigo, "56463");
  assert.equal(productos[0].producto, "MOTO ZONSEN ZS150-46 BATLLO 3 AÑO 2027");
  assert.equal(productos[0].cantidad, "1,00");
});

test("extrae motos del formato tabla con producto en varias lineas", () => {
  const texto = `
Código Producto Unidad Lote Cantidad Recibido
56463 MOTO ZONSEN ZS150-46 BATLLO 3 AÑO
2027
UN
1,00
1,00
Total: 0,00 1,00 1,00
`;

  const productos = extraerProductosMotoDeTexto(texto);

  assert.equal(productos.length, 1);
  assert.equal(productos[0].codigo, "56463");
  assert.equal(productos[0].producto, "MOTO ZONSEN ZS150-46 BATLLO 3 AÑO 2027");
  assert.equal(productos[0].cantidad, "1,00");
});

test("extrae motos cuando MOTO y el nombre vienen en lineas separadas", () => {
  const texto = `
56463 MOTO
ZONSEN ZS150-46 BATLLO 3 AÑO
2027
UN
1,00
51775 CAMISETAS BENETY UN 2,00
`;

  const productos = extraerProductosMotoDeTexto(texto);

  assert.equal(productos.length, 1);
  assert.equal(productos[0].codigo, "56463");
  assert.match(productos[0].producto, /^MOTO /);
});

test("parseMotosPdf combina extractor UN y parser general", () => {
  const texto = `
56463 MOTO ZONSEN ZS150-46 BATLLO 3 AÑO
2027
UN
1,00
51775 CAMISETAS BENETY UN 2,00
`;

  const transferencia = parseTransferenciaPdf(texto);
  const motos = parseMotosPdf(texto);

  assert.ok(transferencia.productos.length >= 1);
  assert.equal(motos.productos.length, 1);
  assert.equal(motos.productos[0].codigo, "56463");
});

test("combina parser general y extractor de motos", () => {
  const texto =
    "56463 MOTO ZONSEN ZS150-46 BATLLO 3 AÑO 2027 UN 1,00 51775 CAMISETAS BENETY UN 2,00";

  const productos = obtenerProductosMotosDesdeTexto(texto, [
    { codigo: "51775", producto: "CAMISETAS BENETY", cantidad: "2,00" },
  ]);

  assert.equal(productos.length, 1);
  assert.equal(productos[0].codigo, "56463");
  assert.match(productos[0].producto, /^MOTO /);
});
