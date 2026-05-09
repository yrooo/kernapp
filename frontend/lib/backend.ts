export function getBackendUrl() {
  return process.env.BACKEND_URL;
}

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendUrl()}${normalizedPath}`;
}

export function authHeaders(accessToken?: string | null, walletAddress?: string | null): Record<string, string> {
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (walletAddress) {
    headers["x-wallet-address"] = walletAddress;
  }

  return headers;
}

export function walletHeaders(walletAddress?: string): Record<string, string> {
  return walletAddress ? { "x-wallet-address": walletAddress } : {};
}