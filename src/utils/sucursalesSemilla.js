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

function ordenarPorNombre(items) {
  return items.slice().sort((a, b) =>
    String(a.nombre).localeCompare(String(b.nombre), "es", { sensitivity: "base" })
  );
}

export function ubicarSucursales(sucursales) {
  const matrices = ordenarPorNombre(sucursales.filter((item) => item.tipo === "matriz"));
  const agencias = ordenarPorNombre(sucursales.filter((item) => item.tipo !== "matriz"));
  const ubicadas = [];

  matrices.forEach((item, index) => {
    const total = Math.max(matrices.length, 1);
    const xInicial = total === 1 ? 82 : 66;
    const xPaso = total === 1 ? 0 : 18;

    ubicadas.push({
      ...item,
      x: xInicial + index * xPaso,
      y: 12,
    });
  });

  const columnas = agencias.length > 12 ? 3 : 2;
  const filas = Math.max(1, Math.ceil(agencias.length / columnas));
  const xInicial = 11;
  const xPaso = columnas === 3 ? 15.5 : 18;

  agencias.forEach((item, index) => {
    const columna = index % columnas;
    const fila = Math.floor(index / columnas);

    ubicadas.push({
      ...item,
      x: xInicial + columna * xPaso,
      y: filas <= 1 ? 50 : 9 + (fila * 82) / (filas - 1),
    });
  });

  return ubicadas;
}
