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
    ubicadas.push({
      ...item,
      x: total === 1 ? 50 : 38 + index * 24,
      y: 48,
    });
  });

  agencias.forEach((item, index) => {
    const angulo = (index / Math.max(agencias.length, 1)) * Math.PI * 2 - Math.PI / 2;
    ubicadas.push({
      ...item,
      x: 50 + Math.cos(angulo) * 38,
      y: 50 + Math.sin(angulo) * 35,
    });
  });

  return ubicadas;
}
