import { supabase } from "./supabase.config";

export async function MostrarProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("codigo", { ascending: true });

  if (error) {
    console.error("Error al mostrar productos:", error);
    return [];
  }

  return data ?? [];
}

export async function InsertarProductos(payload) {
  const { data, error } = await supabase
    .from("productos")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function EditarProductos(payload) {
  const { data, error } = await supabase
    .from("productos")
    .update(payload)
    .eq("id", payload.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function EliminarProductos(id) {
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) throw error;
  return true;
}
