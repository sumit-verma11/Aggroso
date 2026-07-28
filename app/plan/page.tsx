import { redirect } from "next/navigation";
import { getProfile } from "@/lib/db/profiles";
import { getApprovedPlan } from "@/lib/db/meal-plans";
import { getAllNutritionItems } from "@/lib/db/nutrition-items";
import { PlanGenerator } from "./PlanGenerator";
import { ApprovedPlanView } from "./ApprovedPlanView";
import { PageHeader } from "@/app/components/PageHeader";

export const dynamic = "force-dynamic";

function tomorrowIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function PlanPage() {
  const profile = await getProfile();
  if (!profile) {
    redirect("/profile");
  }

  const targetDate = tomorrowIso();
  const existingPlan = await getApprovedPlan(profile.id, targetDate);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <PageHeader title="Meal plan for tomorrow" description={targetDate} />
      {existingPlan ? (
        <ApprovedPlanView plan={existingPlan} />
      ) : (
        <PlanGenerator
          targetDate={targetDate}
          nutritionItems={await getAllNutritionItems()}
          restrictions={{ allergies: profile.allergies, avoidFoods: profile.avoidFoods }}
        />
      )}
    </div>
  );
}
