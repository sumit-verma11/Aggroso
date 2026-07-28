import type { ApprovedPlan } from "@/lib/db/meal-plans";

const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

export function ApprovedPlanView({ plan }: { plan: ApprovedPlan }) {
  const totals = plan.items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      proteinG: acc.proteinG + i.proteinG,
      carbsG: acc.carbsG + i.carbsG,
      fatG: acc.fatG + i.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
        Approved{plan.approvedAt ? ` ${new Date(plan.approvedAt).toLocaleString()}` : ""}
      </div>
      {MEAL_SLOTS.map((slot) => {
        const items = plan.items.filter((i) => i.mealSlot === slot);
        if (items.length === 0) return null;
        return (
          <div
            key={slot}
            className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
          >
            <h2 className="mb-2 font-medium capitalize">{slot}</h2>
            <ul className="flex flex-col gap-1">
              {items.map((item) => (
                <li key={item.id} className="text-zinc-600 dark:text-zinc-400">
                  {item.rawExtractedName} — {item.quantity}
                  {item.unit} · {item.calories} kcal
                  {item.userEdited && (
                    <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      edited
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="border-t border-zinc-200 pt-3 text-sm font-medium dark:border-zinc-800">
        {totals.calories.toFixed(0)} kcal · {totals.proteinG.toFixed(1)}g protein ·{" "}
        {totals.carbsG.toFixed(1)}g carbs · {totals.fatG.toFixed(1)}g fat
      </p>
    </div>
  );
}
