function normalizeMediaPath(path: string) {
  return path.trim().replaceAll("\\", "/");
}

function toUploadsProxyPath(pathname: string) {
  return pathname.startsWith("/api/uploads/")
    ? pathname
    : `/api${pathname}`;
}

/** Our own upload links go through the proxy; any other address is kept as it is. */
function fromAbsoluteUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.startsWith("/uploads/")) {
      return `${toUploadsProxyPath(parsedUrl.pathname)}${parsedUrl.search}${parsedUrl.hash}`;
    }
  } catch {
    return url;
  }
  return url;
}

export function absMediaUrl(path: string | null | undefined) {
  if (!path) return "";

  const normalizedPath = normalizeMediaPath(path);
  if (!normalizedPath) return "";

  const uploadsIndex = normalizedPath.toLowerCase().indexOf("/uploads/");
  if (uploadsIndex >= 0) {
    return toUploadsProxyPath(normalizedPath.slice(uploadsIndex));
  }

  if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
    return fromAbsoluteUrl(normalizedPath);
  }

  if (normalizedPath.startsWith("uploads/")) {
    return toUploadsProxyPath(`/${normalizedPath}`);
  }

  if (normalizedPath.startsWith("/uploads/")) {
    return toUploadsProxyPath(normalizedPath);
  }

  if (normalizedPath.startsWith("/")) {
    return normalizedPath;
  }

  return `/${normalizedPath}`;
}
