import { redirect } from "next/navigation";
import { getProfile } from "@/lib/db/profiles";
import { getMealsForDate } from "@/lib/db/meals";
import { DashboardView } from "./DashboardView";

export const dynamic = "force-dynamic";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) {
    redirect("/profile");
  }

  const { date: dateParam } = await searchParams;
  const date =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayIso();

  const meals = await getMealsForDate(profile.id, date);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Daily intake</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Totals are the values stored when each meal was confirmed — nothing
        here is recalculated by the AI.
      </p>
      <DashboardView date={date} calorieTarget={profile.calorieTarget} meals={meals} />
    </div>
  );
}
