import { test } from "node:test";
import assert from "node:assert/strict";
import {
  esProductoMoto,
  extraerProductosMotoDeTexto,
  obtenerProductosMotosDesdeTexto,
} from "../src/utils/filtrarProductosMotos.js";

test("incluye productos cuya primera palabra del nombre es MOTO", () => {
  assert.equal(esProductoMoto("MOTO ZONSEN ZS150-46"), true);
  assert.equal(esProductoMoto("moto yamaha fz"), true);
  assert.equal(esProductoMoto("CAMISETAS BENETY"), false);
});

test("extrae motos del formato codigo + producto + detalle UN", () => {
  const texto = `
56463 MOTO ZONSEN ZS150-46 BATLLO 3 AÑO
2027 UN 1,00
51775 CAMISETAS BENETY UN 2,00
56464 MOTO HONDA CB190 UN 1,00
`;

  const productos = extraerProductosMotoDeTexto(texto);

  assert.equal(productos.length, 2);
  assert.equal(productos[0].codigo, "56463");
  assert.equal(productos[0].producto, "MOTO ZONSEN ZS150-46 BATLLO 3 AÑO");
  assert.equal(productos[0].cantidad, "1,00");
  assert.equal(productos[1].codigo, "56464");
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
