/**
 * Reusable validation helpers for HTTP routes.
 */

export function isValidClientId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[a-zA-Z0-9_-]+$/.test(value) && value.length > 0 && value.length <= 128;
}

export function isValidDebugId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[a-zA-Z0-9_-]+$/.test(value) && value.length > 0 && value.length <= 128;
}

export function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export function validateClientId(clientId: unknown): { ok: true } | { ok: false; error: string } {
  if (!isValidClientId(clientId)) {
    return { ok: false, error: "Invalid clientId format." };
  }
  return { ok: true };
}

export function validateDebugId(debugId: unknown): { ok: true } | { ok: false; error: string } {
  if (!isValidDebugId(debugId)) {
    return { ok: false, error: "Invalid debugId format." };
  }
  return { ok: true };
}