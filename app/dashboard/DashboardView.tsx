"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MealWithItems } from "@/lib/db/meals";
import { cardClass, inputClass } from "@/app/components/ui";

function CalorieRing({
  pct,
  overTarget,
  calories,
  calorieTarget,
}: {
  pct: number;
  overTarget: boolean;
  calories: number;
  calorieTarget: number;
}) {
  const size = 132;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const ringColor = overTarget ? "#ef4444" : "var(--brand)";

  return (
    <div className="relative flex h-[132px] w-[132px] shrink-0 items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--brand-soft)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-semibold">{calories.toFixed(0)}</span>
        <span className="text-[0.65rem] text-zinc-500 dark:text-zinc-400">
          of {calorieTarget} kcal
        </span>
      </div>
    </div>
  );
}

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
        className={`${inputClass} w-fit`}
      />

      <div className={`${cardClass} flex flex-wrap items-center gap-6`}>
        <CalorieRing
          pct={pct}
          overTarget={overTarget}
          calories={totals.calories}
          calorieTarget={calorieTarget}
        />
        <div className="flex flex-1 flex-col gap-3">
          {overTarget && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              Over calorie target by {(totals.calories - calorieTarget).toFixed(0)} kcal
            </p>
          )}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-[var(--surface-border)] p-3">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Protein</div>
              <div className="font-semibold">{totals.proteinG.toFixed(1)}g</div>
            </div>
            <div className="rounded-xl border border-[var(--surface-border)] p-3">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Carbs</div>
              <div className="font-semibold">{totals.carbsG.toFixed(1)}g</div>
            </div>
            <div className="rounded-xl border border-[var(--surface-border)] p-3">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Fat</div>
              <div className="font-semibold">{totals.fatG.toFixed(1)}g</div>
            </div>
          </div>
        </div>
      </div>

      {meals.length === 0 ? (
        <div className={`${cardClass} text-center text-sm text-zinc-500 dark:text-zinc-400`}>
          No meals logged for this day.
        </div>
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
    <li className={cardClass}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-medium capitalize">
          <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />
          {meal.mealType}
        </span>
        <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          {meal.totalCalories.toFixed(0)} kcal
          <span className={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
        </span>
      </button>
      {open && (
        <ul className="mt-3 flex flex-col gap-2 border-t border-[var(--surface-border)] pt-3 text-sm">
          {meal.items.map((item) => (
            <li key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="capitalize">{item.rawExtractedName}</span>
                {item.wasCorrected && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-300">
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
