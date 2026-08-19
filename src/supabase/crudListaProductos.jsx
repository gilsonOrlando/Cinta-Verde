import { supabase } from "./supabase.config";

const TAMANO_LOTE_GUARDADO = 100;

function normalizarProducto(item) {
  return {
    codigo: String(item?.codigo ?? "").trim(),
    producto: String(item?.producto ?? "").trim(),
  };
}

function normalizarCantidadProducto(cantidad) {
  const texto = String(cantidad ?? "").trim();
  return texto || "1";
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
    return { guardados: 0, insertados: 0, omitidos: 0 };
  }

  let guardados = 0;

  for (const lote of agruparEnLotes(normalizados)) {
    const payload = lote.map((item) => ({
      codigo: item.codigo,
      producto: item.producto,
      cantidad: normalizarCantidadProducto(item.cantidad),
    }));

    const { error } = await supabase
      .from("listaproductos")
      .upsert(payload, { onConflict: "codigo" });

    if (error) throw error;

    guardados += lote.length;
  }

  return {
    guardados,
    insertados: guardados,
    omitidos: 0,
  };
}

function escaparPatronIlike(texto) {
  return String(texto).replace(/[%_\\]/g, (caracter) => `\\${caracter}`);
}

export async function buscarListaProductos(termino, limite = 25) {
  const texto = String(termino ?? "").trim();
  if (!texto) return [];

  const { data: exactos, error: errorExacto } = await supabase
    .from("listaproductos")
    .select("id, codigo, producto, cantidad")
    .eq("codigo", texto)
    .limit(limite);

  if (errorExacto) throw errorExacto;
  if (exactos?.length) return exactos;

  const patron = `%${escaparPatronIlike(texto)}%`;
  const consultaParcial = (columna) =>
    supabase
      .from("listaproductos")
      .select("id, codigo, producto, cantidad")
      .ilike(columna, patron)
      .order("codigo", { ascending: true })
      .limit(limite);

  const [porCodigo, porProducto] = await Promise.all([
    consultaParcial("codigo"),
    consultaParcial("producto"),
  ]);

  if (porCodigo.error) throw porCodigo.error;
  if (porProducto.error) throw porProducto.error;

  const vistos = new Set();
  const resultado = [];

  for (const item of [...(porCodigo.data ?? []), ...(porProducto.data ?? [])]) {
    if (vistos.has(item.id)) continue;
    vistos.add(item.id);
    resultado.push(item);
    if (resultado.length >= limite) break;
  }

  return resultado.sort((a, b) =>
    String(a.codigo).localeCompare(String(b.codigo), undefined, { numeric: true })
  );
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
