export function esProductoMoto(nombre) {
  const primeraPalabra = String(nombre ?? "")
    .trim()
    .split(/\s+/)[0]
    ?.toUpperCase();

  return primeraPalabra === "MOTO";
}

export function filtrarProductosMotos(productos) {
  return productos.filter((item) => esProductoMoto(item.producto));
}
