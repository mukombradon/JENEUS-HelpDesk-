import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names, resolving conflicts with the last
 * occurrence of a utility class winning.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
