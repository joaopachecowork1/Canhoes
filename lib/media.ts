function normalizeMediaPath(path: string) {
  return path.trim().replaceAll("\\", "/");
}

function toUploadsProxyPath(pathname: string) {
  return pathname.startsWith("/api/uploads/") ? pathname : `/api${pathname}`;
}

/** Our own uploads go through the proxy however they were stored (absolute URL, `uploads/…`, `/uploads/…`); other addresses are kept. */
export function absMediaUrl(path: string | null | undefined) {
  if (!path) return "";

  const normalizedPath = normalizeMediaPath(path);
  if (!normalizedPath) return "";

  const uploadsIndex = normalizedPath.toLowerCase().indexOf("/uploads/");
  if (uploadsIndex >= 0) return toUploadsProxyPath(normalizedPath.slice(uploadsIndex));
  if (normalizedPath.startsWith("uploads/")) return toUploadsProxyPath(`/${normalizedPath}`);
  if (/^https?:\/\//.test(normalizedPath) || normalizedPath.startsWith("/")) return normalizedPath;

  return `/${normalizedPath}`;
}
