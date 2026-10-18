export const SUCURSALES_SEMILLA = [
  { nombre: "LOJA", tipo: "agencia" },
  { nombre: "ZAMORA", tipo: "agencia" },
  { nombre: "CATAMAYO", tipo: "matriz" },
  { nombre: "CARIAMANGA", tipo: "agencia" },
  { nombre: "GONZANAMA", tipo: "agencia" },
  { nombre: "CATACOCHA", tipo: "agencia" },
  { nombre: "BALSAS", tipo: "agencia" },
  { nombre: "HUAQUILLAS", tipo: "agencia" },
  { nombre: "ARENILLAS", tipo: "agencia" },
  { nombre: "PIÑAS", tipo: "agencia" },
  { nombre: "SANTA ISABEL", tipo: "agencia" },
  { nombre: "ALAMOR", tipo: "agencia" },
  { nombre: "MACHALA", tipo: "agencia" },
  { nombre: "LAS LAJAS", tipo: "agencia" },
  { nombre: "COLON", tipo: "agencia" },
  { nombre: "BOLIVAR", tipo: "agencia" },
  { nombre: "BODEGA CENTRAL", tipo: "matriz" },
  { nombre: "MARCABELI", tipo: "agencia" },
  { nombre: "EL GUABO", tipo: "agencia" },
  { nombre: "PASAJE", tipo: "agencia" },
];

export function ubicarSucursales(sucursales) {
  const matrices = sucursales.filter((item) => item.tipo === "matriz");
  const agencias = sucursales.filter((item) => item.tipo !== "matriz");
  const ubicadas = [];

  matrices.forEach((item, index) => {
    const total = Math.max(matrices.length, 1);
    const xInicial = total === 1 ? 80 : 64;
    const xPaso = total === 1 ? 0 : 20;

    ubicadas.push({
      ...item,
      x: xInicial + index * xPaso,
      y: 14,
    });
  });

  const columnas = 3;
  const filas = Math.max(1, Math.ceil(agencias.length / columnas));
  const yInicio = 28;
  const yPaso = filas <= 1 ? 0 : 8.4;

  agencias.forEach((item, index) => {
    const fila = Math.floor(index / columnas);
    const columna = index % columnas;

    ubicadas.push({
      ...item,
      x: 10 + columna * 13,
      y: yInicio + fila * yPaso,
    });
  });

  return ubicadas;
}
