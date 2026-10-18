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

export function ubicarSucursales(sucursales, destinoIdsRuta = []) {
  const enRuta = new Set(destinoIdsRuta);
  const matrices = sucursales.filter((item) => item.tipo === "matriz");
  const agencias = sucursales.filter((item) => item.tipo !== "matriz");
  const izquierda = agencias.filter((item) => !enRuta.has(item.id));
  const derecha = agencias.filter((item) => enRuta.has(item.id));
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

  const filasIzq = Math.max(1, Math.ceil(izquierda.length / 2));
  const pasoIzq = filasIzq <= 1 ? 0 : Math.min(10.2, 84 / Math.max(filasIzq - 1, 1));
  ubicadas.push(...apilarAgencias(izquierda, [11, 25], 7, pasoIzq));

  if (derecha.length > 0) {
    const columnasDer = derecha.length > 8 ? 2 : 1;
    const xsDer = columnasDer === 1 ? [80] : [70, 88];
    const filasDer = Math.max(1, Math.ceil(derecha.length / columnasDer));
    const pasoDer = filasDer <= 1 ? 0 : Math.min(9.5, 58 / Math.max(filasDer - 1, 1));
    ubicadas.push(...apilarAgencias(derecha, xsDer, 34, pasoDer));
  }

  return ubicadas;
}
