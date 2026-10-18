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
    const esSuperior = item.nombre === "CATAMAYO" || (item.nombre !== "BODEGA CENTRAL" && index === 0);
    ubicadas.push({
      ...item,
      x: 80,
      y: matrices.length === 1 ? 50 : esSuperior ? 18 : 82,
    });
  });

  const columnas = 2;
  const filas = Math.max(1, Math.ceil(agencias.length / columnas));

  agencias.forEach((item, index) => {
    const columna = index < filas ? 0 : 1;
    const fila = columna === 0 ? index : index - filas;
    const filasColumna = columna === 0 ? filas : agencias.length - filas;

    ubicadas.push({
      ...item,
      x: columna === 0 ? 13 : 32,
      y: filasColumna <= 1 ? 50 : 8 + (fila * 84) / (filasColumna - 1),
    });
  });

  return ubicadas;
}
