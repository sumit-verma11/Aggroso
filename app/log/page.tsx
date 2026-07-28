import { redirect } from "next/navigation";
import { getProfile } from "@/lib/db/profiles";
import { MealEntryForm } from "./MealEntryForm";

export const dynamic = "force-dynamic";

export default async function LogMealPage() {
  const profile = await getProfile();
  if (!profile) {
    redirect("/profile");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Log a meal</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Describe what you ate in plain text — we&apos;ll pull out the food
        items and look up their nutrition values.
      </p>
      <MealEntryForm />
    </div>
  );
}
