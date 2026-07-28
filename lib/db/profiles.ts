import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { profiles } from "./schema";

export type Profile = typeof profiles.$inferSelect;

export interface ProfileInput {
  calorieTarget: number;
  dietaryPreferences: string[];
  allergies: string[];
  avoidFoods: string[];
}

// Single-user app: the earliest-created profile row is treated as "the"
// profile rather than modeling accounts/sessions.
export async function getProfile(): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(profiles)
    .orderBy(asc(profiles.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertProfile(input: ProfileInput): Promise<Profile> {
  const existing = await getProfile();

  if (existing) {
    const [updated] = await db
      .update(profiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(profiles.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(profiles).values(input).returning();
  return created;
}
