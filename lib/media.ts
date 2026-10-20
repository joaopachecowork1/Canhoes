// Uniformiza o caminho: sem espaços nas pontas e com barras normais.
function normalizeMediaPath(path: string) {
  return path.trim().replaceAll("\\", "/");
}

// Garante que o caminho passa pelo proxy `/api/uploads`.
function toUploadsProxyPath(pathname: string) {
  return pathname.startsWith("/api/uploads/") ? pathname : `/api${pathname}`;
}

/** Os nossos uploads passam sempre pelo proxy, seja qual for a forma como foram guardados (URL absoluto, `uploads/…`, `/uploads/…`); outros endereços ficam como estão. */
export function absMediaUrl(path: string | null | undefined) {
  if (!path) return "";

  const normalizedPath = normalizeMediaPath(path);
  if (!normalizedPath) return "";

  // Uploads nossos: reescreve para o proxy.
  const uploadsIndex = normalizedPath.toLowerCase().indexOf("/uploads/");
  if (uploadsIndex >= 0) return toUploadsProxyPath(normalizedPath.slice(uploadsIndex));
  if (normalizedPath.startsWith("uploads/")) return toUploadsProxyPath(`/${normalizedPath}`);
  if (/^https?:\/\//.test(normalizedPath) || normalizedPath.startsWith("/")) return normalizedPath;

  return `/${normalizedPath}`;
}
