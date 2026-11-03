// ---------------------------------------------------------------------------
// String normalization
// ---------------------------------------------------------------------------

/**
 * Trims whitespace and returns undefined for empty/null/undefined inputs.
 */
export function normalizeString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Same as normalizeString but returns a fallback instead of undefined.
 */
export function normalizeStringOr(value: unknown, fallback: string): string {
  return normalizeString(value) ?? fallback;
}

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

/**
 * Brings a Serbian phone number to one international format without spaces.
 * Examples: "0691822652" → "+381691822652", "00381 60 551 1106" → "+381605511106",
 * "381605511106" → "+381605511106", "+381605511106" stays.
 * Anything it doesn't recognize is returned trimmed, as written.
 */
export function normalizePhone(value: unknown): string | undefined {
  const trimmed = normalizeString(value);
  if (!trimmed) return undefined;

  const compact = trimmed.replace(/[\s\-/.()]/g, "");
  if (!/^\+?\d{6,}$/.test(compact)) return trimmed;

  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return "+" + compact.slice(2);
  if (compact.startsWith("381")) return "+" + compact;
  if (compact.startsWith("0")) return "+381" + compact.slice(1);
  return trimmed;
}

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

const SERBIAN_CHAR_MAP: Record<string, string> = {
  č: "c",
  ć: "c",
  š: "s",
  ž: "z",
  đ: "dj",
  Č: "c",
  Ć: "c",
  Š: "s",
  Ž: "z",
  Đ: "dj",
};

/**
 * Generates a URL-safe slug from a string.
 * Handles Serbian diacritics (č, ć, š, ž, đ).
 * Example: "Stan na Vračaru" → "stan-na-vracaru"
 */
export function slugify(value: string): string {
  return value
    .split("")
    .map((char) => SERBIAN_CHAR_MAP[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Numeric parsing
// ---------------------------------------------------------------------------

/**
 * Parses a value to a positive number.
 * Returns undefined if the value is missing, non-numeric, or not positive.
 */
export function parsePositiveNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  if (!isFinite(num) || num <= 0) return undefined;
  return num;
}

/**
 * Parses a value to a non-negative integer.
 * Returns undefined if the value is missing, non-numeric, or negative.
 */
export function parseNonNegativeInt(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = parseInt(String(value), 10);
  if (isNaN(num) || num < 0) return undefined;
  return num;
}

// ---------------------------------------------------------------------------
// Null / empty normalization
// ---------------------------------------------------------------------------

/**
 * Returns true if the value is null, undefined, or an empty/whitespace string.
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

/**
 * Normalizes an array field from XML — always returns an array.
 * If the value is already an array, returns it. If it's a single item, wraps it.
 * If it's empty/null, returns an empty array.
 */
export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// ---------------------------------------------------------------------------
// Date / time
// ---------------------------------------------------------------------------

/**
 * Returns the current time as an ISO 8601 string.
 */
export function nowIso(): string {
  return new Date().toISOString();
}
