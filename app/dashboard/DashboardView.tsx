"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MealWithItems } from "@/lib/db/meals";

export function DashboardView({
  date,
  calorieTarget,
  meals,
}: {
  date: string;
  calorieTarget: number;
  meals: MealWithItems[];
}) {
  const router = useRouter();

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.totalCalories,
      proteinG: acc.proteinG + meal.totalProteinG,
      carbsG: acc.carbsG + meal.totalCarbsG,
      fatG: acc.fatG + meal.totalFatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const pct =
    calorieTarget > 0
      ? Math.min(100, Math.round((totals.calories / calorieTarget) * 100))
      : 0;
  const overTarget = totals.calories > calorieTarget;

  return (
    <div className="flex flex-col gap-6">
      <input
        type="date"
        value={date}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(e) => router.push(`/dashboard?date=${e.target.value}`)}
        className="w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />

      <div>
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span className="font-medium">
            {totals.calories.toFixed(0)} / {calorieTarget} kcal
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full ${overTarget ? "bg-red-500" : "bg-zinc-900 dark:bg-zinc-50"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {overTarget && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Over calorie target by {(totals.calories - calorieTarget).toFixed(0)} kcal.
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-zinc-500 dark:text-zinc-400">Protein</div>
          <div className="font-medium">{totals.proteinG.toFixed(1)}g</div>
        </div>
        <div className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-zinc-500 dark:text-zinc-400">Carbs</div>
          <div className="font-medium">{totals.carbsG.toFixed(1)}g</div>
        </div>
        <div className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-zinc-500 dark:text-zinc-400">Fat</div>
          <div className="font-medium">{totals.fatG.toFixed(1)}g</div>
        </div>
      </div>

      {meals.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No meals logged for this day.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MealCard({ meal }: { meal: MealWithItems }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="font-medium capitalize">{meal.mealType}</span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {meal.totalCalories.toFixed(0)} kcal {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
          {meal.items.map((item) => (
            <li key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="capitalize">{item.rawExtractedName}</span>
                {item.wasCorrected && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    corrected
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.quantity}
                {item.unit} · {item.calories} kcal · {item.proteinG}g protein ·{" "}
                {item.carbsG}g carbs · {item.fatG}g fat
                {item.matchedName
                  ? ` · source: ${item.source} (${item.matchedName})`
                  : " · manually entered"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
