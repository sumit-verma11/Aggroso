import type { ApprovedPlan } from "@/lib/db/meal-plans";
import { cardClass } from "@/app/components/ui";

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
      <div className="flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand-strong)]">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-strong)] text-xs text-white dark:bg-[var(--brand)] dark:text-zinc-900">
          ✓
        </span>
        Approved{plan.approvedAt ? ` ${new Date(plan.approvedAt).toLocaleString()}` : ""}
      </div>
      {MEAL_SLOTS.map((slot) => {
        const items = plan.items.filter((i) => i.mealSlot === slot);
        if (items.length === 0) return null;
        return (
          <div key={slot} className={cardClass}>
            <h2 className="mb-2 flex items-center gap-2 font-medium capitalize">
              <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />
              {slot}
            </h2>
            <ul className="flex flex-col gap-1 text-sm">
              {items.map((item) => (
                <li key={item.id} className="text-zinc-600 dark:text-zinc-400">
                  {item.rawExtractedName} — {item.quantity}
                  {item.unit} · {item.calories} kcal
                  {item.userEdited && (
                    <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      edited
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div className="rounded-xl bg-[var(--brand-soft)]/40 p-4 text-sm font-semibold">
        {totals.calories.toFixed(0)} kcal · {totals.proteinG.toFixed(1)}g protein ·{" "}
        {totals.carbsG.toFixed(1)}g carbs · {totals.fatG.toFixed(1)}g fat
      </div>
    </div>
  );
}
