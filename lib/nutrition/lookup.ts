export interface LookupItem {
  id: string;
  canonicalName: string;
  aliases: string[];
}

/**
 * Lowercase, trim, collapse whitespace, and strip a single trailing "s" or
 * "es" so "tomatoes" / "Tomato " / "tomato" all normalize the same way.
 * Deliberately no fuzzy/edit-distance matching yet — a genuine miss should
 * stay visible rather than get silently guessed at.
 */
export function normalizeFoodName(name: string): string {
  const trimmed = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (trimmed.endsWith("es") && trimmed.length > 3) {
    return trimmed.slice(0, -2);
  }
  if (trimmed.endsWith("s") && trimmed.length > 2) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

/**
 * Resolves a raw extracted food name to a knowledge-base item.
 * Tries, in order: exact match, alias match, normalized match.
 * Returns null (unresolved) rather than a best guess on a genuine miss.
 */
export function resolveFood<T extends LookupItem>(
  rawName: string,
  items: T[]
): T | null {
  const target = rawName.trim().toLowerCase();
  if (target === "") return null;

  for (const item of items) {
    if (item.canonicalName.trim().toLowerCase() === target) return item;
  }

  for (const item of items) {
    if (item.aliases.some((alias) => alias.trim().toLowerCase() === target)) {
      return item;
    }
  }

  const normalizedTarget = normalizeFoodName(rawName);
  for (const item of items) {
    const candidates = [item.canonicalName, ...item.aliases];
    if (candidates.some((c) => normalizeFoodName(c) === normalizedTarget)) {
      return item;
    }
  }

  return null;
}
