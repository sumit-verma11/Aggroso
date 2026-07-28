import { redirect } from "next/navigation";
import { getProfile } from "@/lib/db/profiles";
import { MealEntryForm } from "./MealEntryForm";
import { PageHeader } from "@/app/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function LogMealPage() {
  const profile = await getProfile();
  if (!profile) {
    redirect("/profile");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <PageHeader
        title="Log a meal"
        description="Describe what you ate in plain text — we'll pull out the food items and look up their nutrition values."
      />
      <MealEntryForm />
    </div>
  );
}
