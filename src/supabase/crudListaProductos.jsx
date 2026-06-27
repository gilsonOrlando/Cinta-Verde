import { supabase } from "./supabase.config";

function normalizarProducto(item) {
  return {
    codigo: String(item?.codigo ?? "").trim(),
    producto: String(item?.producto ?? "").trim(),
  };
}

function deduplicarPorCodigo(productos) {
  const vistos = new Set();
  const resultado = [];

  for (const item of productos) {
    const normalizado = normalizarProducto(item);
    if (!normalizado.codigo || !normalizado.producto) continue;
    if (vistos.has(normalizado.codigo)) continue;

    vistos.add(normalizado.codigo);
    resultado.push(normalizado);
  }

  return resultado;
}

export async function registrarListaProductosNuevos(productos) {
  const normalizados = deduplicarPorCodigo(productos ?? []);

  if (normalizados.length === 0) {
    return { insertados: 0, omitidos: 0 };
  }

  const codigos = normalizados.map((item) => item.codigo);

  const { data: existentes, error: errorConsulta } = await supabase
    .from("listaproductos")
    .select("codigo")
    .in("codigo", codigos);

  if (errorConsulta) throw errorConsulta;

  const codigosExistentes = new Set((existentes ?? []).map((item) => item.codigo));
  const nuevos = normalizados.filter((item) => !codigosExistentes.has(item.codigo));

  if (nuevos.length === 0) {
    return { insertados: 0, omitidos: normalizados.length };
  }

  const payload = nuevos.map((item) => ({
    codigo: item.codigo,
    producto: item.producto,
    cantidad: "1",
  }));

  const { error: errorInsert } = await supabase.from("listaproductos").insert(payload);

  if (errorInsert) throw errorInsert;

  return {
    insertados: payload.length,
    omitidos: normalizados.length - payload.length,
  };
}

export async function buscarListaProductos(termino, limite = 25) {
  const texto = String(termino ?? "").trim().toLowerCase();
  if (!texto) return [];

  const { data, error } = await supabase
    .from("listaproductos")
    .select("id, codigo, producto, cantidad")
    .order("codigo", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter(
      (item) =>
        item.codigo?.toLowerCase().includes(texto) ||
        item.producto?.toLowerCase().includes(texto)
    )
    .slice(0, limite);
}

export async function obtenerListaProductoPorCodigo(codigo) {
  const codigoNormalizado = String(codigo ?? "").trim();
  if (!codigoNormalizado) return null;

  const { data, error } = await supabase
    .from("listaproductos")
    .select("id, codigo, producto, cantidad")
    .eq("codigo", codigoNormalizado)
    .maybeSingle();

  if (error) throw error;
  return data;
}
