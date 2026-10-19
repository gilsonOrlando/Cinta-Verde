export function slugSucursal(nombre) {
  return String(nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function claveUsuarioTransferencia(nombre, anio = new Date().getFullYear()) {
  return `${slugSucursal(nombre)}${anio}`;
}

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

function apilarAgencias(items, xs, yInicio, yPaso) {
  const columnas = xs.length;

  return items.map((item, index) => {
    const columna = index % columnas;
    const fila = Math.floor(index / columnas);

    return {
      ...item,
      x: xs[columna],
      y: yInicio + fila * yPaso,
    };
  });
}

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

  const filas = Math.max(1, Math.ceil(agencias.length / 2));
  const paso = filas <= 1 ? 0 : Math.min(10.2, 84 / Math.max(filas - 1, 1));
  ubicadas.push(...apilarAgencias(agencias, [11, 25], 7, paso));

  return ubicadas;
}
