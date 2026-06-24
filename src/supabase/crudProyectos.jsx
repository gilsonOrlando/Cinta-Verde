import { supabase } from "./supabase.config";
import { normalizarCodigoAcceso } from "../utils/codigoAcceso";
import {
  calcularDiferenciaCantidades,
  formatearCantidadTexto,
  parseCantidadTexto,
} from "../utils/cantidadTexto";

function esCodigoDuplicado(error) {
  return error?.code === "23505" && String(error?.message ?? "").includes("codigo_acceso");
}

export async function CrearProyectoConProductos({
  nombre,
  codigoAcceso,
  nombreArchivo,
  productos,
}) {
  const codigoNormalizado = normalizarCodigoAcceso(codigoAcceso);

  const { data: proyecto, error: errorProyecto } = await supabase
    .from("proyectos")
    .insert({
      nombre: nombre.trim(),
      codigo_acceso: codigoNormalizado,
      nombre_archivo: nombreArchivo ?? null,
    })
    .select()
    .single();

  if (errorProyecto) {
    if (esCodigoDuplicado(errorProyecto)) {
      const duplicado = new Error("CODIGO_ACCESO_DUPLICADO");
      duplicado.cause = errorProyecto;
      throw duplicado;
    }
    throw errorProyecto;
  }

  const payload = productos.map((item) => ({
    proyecto_id: proyecto.id,
    codigo: item.codigo,
    producto: item.producto,
    cantidad_sistema: item.cantidad_sistema,
    cantidad_toma_fisica: item.cantidad_toma_fisica,
  }));

  const { data: productosGuardados, error: errorProductos } = await supabase
    .from("productos")
    .insert(payload)
    .select();

  if (errorProductos) {
    await supabase.from("proyectos").delete().eq("id", proyecto.id);
    throw errorProductos;
  }

  return { proyecto, productos: productosGuardados };
}

export async function ObtenerTomaFisicaPorCodigo(codigoAcceso) {
  const proyecto = await ObtenerProyectoPorCodigoAcceso(codigoAcceso);

  if (!proyecto) return null;

  const productos = await ObtenerProductosDeProyecto(proyecto.id);
  return { proyecto, productos };
}

export async function ObtenerProyectoPorCodigoAcceso(codigoAcceso) {
  const codigo = normalizarCodigoAcceso(codigoAcceso);

  const { data, error } = await supabase
    .from("proyectos")
    .select("id, nombre, codigo_acceso, nombre_archivo, created_at")
    .eq("codigo_acceso", codigo)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ObtenerProductosDeProyecto(proyectoId) {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("codigo", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function BuscarProductoEnProyecto(proyectoId, codigoProducto) {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .eq("codigo", String(codigoProducto ?? "").trim())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ActualizarCantidadTomaFisica(productoId, cantidadTomaFisica) {
  const { data, error } = await supabase
    .from("productos")
    .update({ cantidad_toma_fisica: formatearCantidadTexto(cantidadTomaFisica) })
    .eq("id", productoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function RegistrarEscaneo(proyectoId, codigoProducto) {
  const producto = await BuscarProductoEnProyecto(proyectoId, codigoProducto);

  if (!producto) {
    return { encontrado: false, producto: null };
  }

  const cantidadActual = parseCantidadTexto(producto.cantidad_toma_fisica);
  const cantidadNueva = formatearCantidadTexto(cantidadActual + 1);
  const actualizado = await ActualizarCantidadTomaFisica(producto.id, cantidadNueva);

  return {
    encontrado: true,
    producto: actualizado,
    diferencia: calcularDiferenciaCantidades(
      actualizado.cantidad_sistema,
      actualizado.cantidad_toma_fisica
    ),
  };
}
