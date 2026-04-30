export const ALL_ORGANIZATION_SEND_TYPES = ['message', 'tax_receipt', 'payment_attestation', 'membership_certificate'] as const;

const KNOWN_KEYS = new Set<string>(ALL_ORGANIZATION_SEND_TYPES);

function setFromStringList(list: unknown[]): ReadonlySet<string> {
  const next = new Set<string>();
  for (const item of list) {
    const k = String(item ?? '').trim();
    if (KNOWN_KEYS.has(k)) {
      next.add(k);
    }
  }
  return next;
}

export function parseAllowedSendTypesFromOrganization(raw: unknown): ReadonlySet<string> {
  const fallback = new Set<string>(ALL_ORGANIZATION_SEND_TYPES);
  if (raw == null) {
    return fallback;
  }
  if (Array.isArray(raw)) {
    const next = setFromStringList(raw);
    return next.size > 0 ? next : fallback;
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) {
      return fallback;
    }
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        const next = setFromStringList(parsed);
        return next.size > 0 ? next : fallback;
      }
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { allowedSendTypes?: unknown }).allowedSendTypes)) {
        const next = setFromStringList((parsed as { allowedSendTypes: unknown[] }).allowedSendTypes);
        return next.size > 0 ? next : fallback;
      }
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function serializeAllowedSendTypes(selected: ReadonlySet<string>): string[] {
  const list = [...selected].filter((k) => KNOWN_KEYS.has(k)).sort();
  return list.length > 0 ? list : [...ALL_ORGANIZATION_SEND_TYPES];
}
