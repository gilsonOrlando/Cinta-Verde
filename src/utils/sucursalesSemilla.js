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

  const columnas = 2;
  const filas = Math.max(1, Math.ceil(agencias.length / columnas));
  const yInicio = 7;
  const yPaso = filas <= 1 ? 0 : 10.2;

  agencias.forEach((item, index) => {
    const columna = index % columnas;
    const fila = Math.floor(index / columnas);

    ubicadas.push({
      ...item,
      x: 11 + columna * 14,
      y: yInicio + fila * yPaso,
    });
  });

  return ubicadas;
}
