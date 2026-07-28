import { normalizeFoodName } from "./lookup";

/**
 * Returns which of the profile's allergy/avoid-food entries a food name (or
 * its matched knowledge-base name) appears to conflict with. Shared between
 * meal review (lib/meal/draft.ts) and meal-plan generation
 * (lib/meal-plan/build.ts) so both flag conflicts the same way.
 */
export function findConflicts(
  itemName: string,
  matchedName: string | null,
  restrictions: string[]
): string[] {
  if (restrictions.length === 0) return [];
  const targets = [itemName, matchedName]
    .filter(Boolean)
    .map((n) => normalizeFoodName(n as string));
  return restrictions.filter((restriction) => {
    const normalizedRestriction = normalizeFoodName(restriction);
    return targets.some(
      (t) => t.includes(normalizedRestriction) || normalizedRestriction.includes(t)
    );
  });
}
