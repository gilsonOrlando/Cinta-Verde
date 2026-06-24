export function normalizarSupabaseUrl(url) {
  if (!url) return "";

  let valor = String(url).trim();

  if (
    (valor.startsWith('"') && valor.endsWith('"')) ||
    (valor.startsWith("'") && valor.endsWith("'"))
  ) {
    valor = valor.slice(1, -1).trim();
  }

  valor = valor.replace(/\/+$/, "");
  valor = valor.replace(/\/rest\/v1$/i, "");

  return valor;
}

export function normalizarSupabaseKey(key) {
  if (!key) return "";

  let valor = String(key).trim();

  if (
    (valor.startsWith('"') && valor.endsWith('"')) ||
    (valor.startsWith("'") && valor.endsWith("'"))
  ) {
    valor = valor.slice(1, -1).trim();
  }

  return valor;
}

export function esSupabaseUrlValida(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}
