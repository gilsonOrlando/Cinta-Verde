import { create } from "zustand";
import { supabase } from "../supabase/supabase.config";

export const useAuthStore = create((set) => ({
  loginGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/gestion`,
      },
    });
    if (error) throw error;
  },

  cerrarSesion: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({});
  },
}));
