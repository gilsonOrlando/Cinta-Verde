import { supabase } from "./supabase.config";

const TAMANO_LOTE_GUARDADO = 100;

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

function agruparEnLotes(items, tamano = TAMANO_LOTE_GUARDADO) {
  const lotes = [];

  for (let i = 0; i < items.length; i += tamano) {
    lotes.push(items.slice(i, i + tamano));
  }

  return lotes;
}

export async function registrarListaProductosNuevos(productos) {
  const normalizados = deduplicarPorCodigo(productos ?? []);

  if (normalizados.length === 0) {
    return { insertados: 0, omitidos: 0 };
  }

  let insertados = 0;

  for (const lote of agruparEnLotes(normalizados)) {
    const payload = lote.map((item) => ({
      codigo: item.codigo,
      producto: item.producto,
      cantidad: "1",
    }));

    const { data, error } = await supabase
      .from("listaproductos")
      .upsert(payload, { onConflict: "codigo", ignoreDuplicates: true })
      .select("codigo");

    if (error) throw error;

    insertados += (data ?? []).length;
  }

  return {
    insertados,
    omitidos: normalizados.length - insertados,
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
