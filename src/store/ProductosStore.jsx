import { create } from "zustand";
import Swal from "sweetalert2";
import {
  EditarProductos,
  EliminarProductos,
  InsertarProductos,
  MostrarProductos,
} from "../supabase/crudProductos";

export const useProductosStore = create((set, get) => ({
  buscador: "",
  dataproductos: [],
  productoItemSelect: null,

  setBuscador: (value) => set({ buscador: value }),

  mostrarProductos: async () => {
    const response = await MostrarProductos();
    set({
      dataproductos: response,
      productoItemSelect: response[0] ?? null,
    });
    return response;
  },

  selectProducto: (item) => set({ productoItemSelect: item }),

  insertarProducto: async (payload) => {
    await InsertarProductos(payload);
    return get().mostrarProductos();
  },

  editarProducto: async (payload) => {
    await EditarProductos(payload);
    return get().mostrarProductos();
  },

  eliminarProducto: async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar producto?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return false;

    await EliminarProductos(id);
    return get().mostrarProductos();
  },
}));
