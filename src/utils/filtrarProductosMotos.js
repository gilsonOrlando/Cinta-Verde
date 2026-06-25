export function esProductoMoto(nombre) {
  const primeraPalabra = String(nombre ?? "")
    .trim()
    .split(/\s+/)[0]
    ?.toUpperCase();

  return Boolean(primeraPalabra?.startsWith("MOTO"));
}

export function filtrarProductosMotos(productos) {
  return productos.filter((item) => esProductoMoto(item.producto));
}
