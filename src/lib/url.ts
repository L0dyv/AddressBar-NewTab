const URL_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

export function hasUrlScheme(input: string): boolean {
  return URL_SCHEME_RE.test(input);
}

function getHostnameFromUrlLike(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const urlToParse = hasUrlScheme(trimmed)
      ? trimmed
      : trimmed.startsWith("//")
        ? `http:${trimmed}`
        : `http://${trimmed}`;

    return new URL(urlToParse).hostname;
  } catch {
    return null;
  }
}

export function isLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost") return true;
  if (lower === "::1") return true;

  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;

  const [a, b, c, d] = m.slice(1).map((v) => Number(v));
  if ([a, b, c, d].some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }

  // Loopback (includes 127.0.0.1)
  if (a === 127) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  return false;
}

function getPreferredProtocolForUrlLike(input: string): "http" | "https" {
  const hostname = getHostnameFromUrlLike(input);
  if (hostname && isLocalHostname(hostname)) return "http";
  return "https";
}

export function ensureUrlHasProtocol(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (hasUrlScheme(trimmed)) return trimmed;
  if (/\s/.test(trimmed)) return trimmed;

  const protocol = getPreferredProtocolForUrlLike(trimmed);
  return trimmed.startsWith("//") ? `${protocol}:${trimmed}` : `${protocol}://${trimmed}`;
}

// For config fields: keep existing behavior (only auto-prefix when it looks like a URL),
// but prefer http:// for localhost / private IPs.
export function normalizeUrlForQuickLinkInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (hasUrlScheme(trimmed)) return trimmed;
  if (/\s/.test(trimmed)) return trimmed;

  const hostname = getHostnameFromUrlLike(trimmed);
  if (hostname && isLocalHostname(hostname)) {
    return trimmed.startsWith("//") ? `http:${trimmed}` : `http://${trimmed}`;
  }

  // Looks like a domain/IP (contains ".") => keep previous default https://
  if (trimmed.includes(".")) {
    return trimmed.startsWith("//") ? `https:${trimmed}` : `https://${trimmed}`;
  }

  return trimmed;
}

