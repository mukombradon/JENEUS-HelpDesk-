import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names, resolving conflicts with the last
 * occurrence of a utility class winning.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// camelCase → snake_case normalizer
// ---------------------------------------------------------------------------

/**
 * Convert a single camelCase string to snake_case.
 *
 * "ticketNumber" → "ticket_number"
 * "firstName"   → "first_name"
 * "createdAt"   → "created_at"
 * "id"          → "id"
 */
function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`);
}

/**
 * Recursively transform all camelCase keys in an object tree to snake_case.
 *
 * The backend (Prisma) returns camelCase properties (e.g. `clientId`,
 * `assignedAgentId`, `firstName`) but the frontend types are defined in
 * snake_case.  This normalizer bridges the gap at the API boundary.
 *
 * - Arrays are mapped element-by-element.
 * - Plain objects have every key converted and the result recursed.
 * - Primitives, null, and undefined pass through unchanged.
 */
export function deepCamelToSnake<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map(deepCamelToSnake) as unknown as T;
  }

  if (typeof data === "object" && data !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = deepCamelToSnake(value);
    }
    return result as T;
  }

  return data;
}
