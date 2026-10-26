/**
 * Input sanitization & validation utilities.
 *
 * The app uses Supabase's PostgREST builder (parameterized), so classic
 * SQL injection via values is not possible. These helpers guard against:
 *  - Oversized / malicious text blobs
 *  - Invalid numeric / ID types
 *  - Uncontrolled table-name injection in fetchAllRows
 *  - Regex / ReDoS in search filters
 *  - Malformed JSON stored in blob columns
 */

// ─── Allowed DB Tables ─────────────────────────────────────────────────────────
// Explicit allowlist – only these table names are permitted in dynamic queries.
export const ALLOWED_TABLES = new Set([
  'customers',
  'customer_cars',
  'suppliers',
  'supplier_transactions',
  'parts',
  'employees',
  'expenses',
  'weekly_expenses',
  'ohda_records',
  'repairs',
  'repair_items',
  'pending_bills',
  'car_expenses',
  'profiles',
  'branches',
]);

/**
 * Validates that a table name is in the explicit allowlist.
 * Throws if the name is not recognised.
 */
export function assertAllowedTable(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`[Security] Table "${table}" is not in the allowed list.`);
  }
}

// ─── String Sanitization ───────────────────────────────────────────────────────

const MAX_TEXT_LENGTH = 2000;
const MAX_SEARCH_LENGTH = 200;
const MAX_NOTE_LENGTH = 5000;

/**
 * Strips leading/trailing whitespace and enforces a max character length.
 * Returns the cleaned string, or null if the input was falsy.
 */
export function sanitizeText(
  value: string | null | undefined,
  maxLength: number = MAX_TEXT_LENGTH
): string | null {
  if (value == null) return null;
  return String(value).trim().slice(0, maxLength);
}

/**
 * Sanitizes a free-text search query.
 * - Trims whitespace
 * - Limits length to prevent ReDoS / oversized ilike patterns
 * - Removes PostgREST filter-injection characters (%, *, backslash)
 *   that could distort the .or() filter string
 */
export function sanitizeSearchTerm(term: string): string {
  if (!term) return '';
  return term
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    // Remove characters that have special meaning inside PostgREST filter strings
    .replace(/[%*\\]/g, '');
}

/** Sanitizes a note / description field (longer allowed limit). */
export function sanitizeNote(value: string | null | undefined): string | null {
  return sanitizeText(value, MAX_NOTE_LENGTH);
}

// ─── Numeric Validation ────────────────────────────────────────────────────────

/**
 * Validates that a value is a safe positive integer (for IDs, quantities, etc.).
 * Throws a descriptive error if it is not.
 */
export function assertPositiveInt(value: unknown, fieldName = 'id'): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 2_147_483_647) {
    throw new Error(`[Security] "${fieldName}" must be a positive integer (got ${value}).`);
  }
  return n;
}

/**
 * Validates that a value is a non-negative finite number (for amounts, prices, etc.).
 * Throws if invalid.
 */
export function assertNonNegativeNumber(value: unknown, fieldName = 'amount'): number {
  const n = Number(value);
  if (!isFinite(n) || n < 0) {
    throw new Error(`[Security] "${fieldName}" must be a non-negative number (got ${value}).`);
  }
  return n;
}

// ─── Date Validation ──────────────────────────────────────────────────────────

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates that a date string is in YYYY-MM-DD format and represents a real date.
 * Returns the string unchanged if valid, or null if falsy.
 * Throws on invalid format.
 */
export function assertDateString(value: string | null | undefined, fieldName = 'date'): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!DATE_REGEX.test(trimmed)) {
    throw new Error(`[Security] "${fieldName}" must be in YYYY-MM-DD format (got "${value}").`);
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) {
    throw new Error(`[Security] "${fieldName}" is not a valid calendar date (got "${value}").`);
  }
  return trimmed;
}

// ─── JSON Blob Validation ─────────────────────────────────────────────────────

/**
 * Safely parses a JSON string. Returns the parsed value, or the fallback
 * (default: empty array) on any parse error.
 */
export function safeParseJson<T = unknown>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    console.warn('[Security] Failed to parse JSON blob — returning fallback.');
    return fallback;
  }
}

/**
 * Safely serialises a value to JSON.
 * Throws if the value cannot be serialised (e.g. circular refs).
 */
export function safeStringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (err) {
    throw new Error(`[Security] Could not serialise value to JSON: ${err}`);
  }
}

// ─── Branch ID Validation ──────────────────────────────────────────────────────

const ALLOWED_BRANCH_IDS = new Set(['main-shop', 'body-shop']);

/**
 * Validates that a branch ID is one of the two known branches.
 * Returns the value unchanged if valid, or undefined if the value is falsy.
 * Throws on unrecognised branch IDs.
 */
export function assertBranchId(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (!ALLOWED_BRANCH_IDS.has(value)) {
    throw new Error(`[Security] Unknown branch_id "${value}".`);
  }
  return value;
}

// ─── Payload Sanitizer ─────────────────────────────────────────────────────────

/**
 * Strips undefined keys from an object and enforces that all string
 * values don't exceed maxLength. Useful as a last-pass before insert/update.
 */
export function sanitizePayload<T extends Record<string, unknown>>(
  payload: T,
  maxLength: number = MAX_TEXT_LENGTH
): T {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload)) {
    if (val === undefined) continue;
    if (typeof val === 'string') {
      result[key] = val.trim().slice(0, maxLength);
    } else {
      result[key] = val;
    }
  }
  return result as T;
}
