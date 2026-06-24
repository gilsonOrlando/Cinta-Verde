export function resolvePublicAsset(ruta) {
  const base = import.meta.env.BASE_URL || "/";
  const baseNormalizado = base.endsWith("/") ? base : `${base}/`;
  const rutaNormalizada = String(ruta ?? "").replace(/^\//, "");
  return `${baseNormalizado}${rutaNormalizada}`;
}
