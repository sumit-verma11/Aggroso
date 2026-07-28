"use client";

import { useState } from "react";
import { computeItem, type NutritionValues } from "@/lib/nutrition/calculate";
import type { MealDraft, DraftItem } from "@/lib/meal/draft";
import { confirmMealAction, type ConfirmMealResult } from "./actions";
import { cardClass, inputClass, primaryButtonClass } from "@/app/components/ui";

const BADGE_BASE = "rounded-full px-2.5 py-0.5 text-xs font-medium";
const badgeStyles = {
  manual: `${BADGE_BASE} bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300`,
  matched: `${BADGE_BASE} bg-[var(--brand-soft)] text-[var(--brand-strong)]`,
  warning: `${BADGE_BASE} bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300`,
  conflict: `${BADGE_BASE} bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300`,
};

const itemAccent = {
  computed: "border-l-4 border-l-[var(--brand)]",
  unresolved_item: "border-l-4 border-l-amber-400",
  unresolved_quantity: "border-l-4 border-l-amber-400",
};

interface EditableItem {
  index: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  preparationMethod: string | null;
  nutritionItemId: string | null;
  matchedName: string | null;
  referenceNutrition: NutritionValues | null;
  status: DraftItem["status"];
  grams: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  aiCalories: number;
  aiProteinG: number;
  aiCarbsG: number;
  aiFatG: number;
  /** True once the user has directly typed a macro value for this item —
   * distinct from `status`, which only tracks whether the AI/lookup could
   * resolve it. A manually-entered unresolved item counts toward totals;
   * an untouched one doesn't. */
  manuallyEntered: boolean;
  conflicts: string[];
}

function toEditable(item: DraftItem): EditableItem {
  return {
    index: item.index,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    preparationMethod: item.preparationMethod,
    nutritionItemId: item.nutritionItemId,
    matchedName: item.matchedName,
    referenceNutrition: item.referenceNutrition,
    status: item.status,
    grams: item.grams,
    calories: item.calories,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    aiCalories: item.calories,
    aiProteinG: item.proteinG,
    aiCarbsG: item.carbsG,
    aiFatG: item.fatG,
    manuallyEntered: false,
    conflicts: item.conflicts,
  };
}

function included(item: EditableItem): boolean {
  return item.status === "computed" || item.manuallyEntered;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export function MealReview({ draft }: { draft: MealDraft }) {
  const [items, setItems] = useState<EditableItem[]>(() =>
    draft.items.map(toEditable)
  );
  const [clarificationAnswers, setClarificationAnswers] = useState<
    Record<string, string>
  >({});
  const [mealType, setMealType] =
    useState<(typeof MEAL_TYPES)[number]>("snack");
  const [confirmState, setConfirmState] = useState<{
    status: "idle" | "pending" | "error" | "success";
    message?: string;
  }>({ status: "idle" });

  function updateQuantity(index: number, rawValue: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.index !== index) return item;
        const quantity = rawValue === "" ? null : Number(rawValue);
        if (quantity === null || Number.isNaN(quantity)) {
          return { ...item, quantity: null };
        }
        // No KB match means there's nothing to recompute from — quantity is
        // just a record-keeping value here, so leave any manually-entered
        // macros alone instead of zeroing them back out.
        if (!item.referenceNutrition) {
          return { ...item, quantity };
        }
        const computed = computeItem(quantity, item.unit ?? "", item.referenceNutrition);
        return { ...item, quantity, ...computed, manuallyEntered: false };
      })
    );
  }

  function updateUnit(index: number, unit: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.index !== index) return item;
        if (!item.referenceNutrition) {
          return { ...item, unit };
        }
        const computed = computeItem(item.quantity ?? 0, unit, item.referenceNutrition);
        return { ...item, unit, ...computed, manuallyEntered: false };
      })
    );
  }

  function updatePreparation(index: number, value: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.index === index ? { ...item, preparationMethod: value } : item
      )
    );
  }

  function updateMacro(
    index: number,
    field: "calories" | "proteinG" | "carbsG" | "fatG",
    rawValue: string
  ) {
    const value = rawValue === "" ? 0 : Number(rawValue);
    if (Number.isNaN(value)) return;
    setItems((prev) =>
      prev.map((item) =>
        item.index === index
          ? { ...item, [field]: value, manuallyEntered: true }
          : item
      )
    );
  }

  function answerQuantityClarification(index: number, gramsValue: string) {
    const key = `${index}-quantity`;
    setClarificationAnswers((prev) => ({ ...prev, [key]: gramsValue }));
    updateQuantity(index, gramsValue);
    updateUnit(index, "g");
  }

  function answerPreparationClarification(index: number, value: string) {
    const key = `${index}-preparation_method`;
    setClarificationAnswers((prev) => ({ ...prev, [key]: value }));
    updatePreparation(index, value);
  }

  const totals = items.reduce(
    (acc, item) => {
      if (!included(item)) return acc;
      return {
        calories: acc.calories + item.calories,
        proteinG: acc.proteinG + item.proteinG,
        carbsG: acc.carbsG + item.carbsG,
        fatG: acc.fatG + item.fatG,
      };
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
  const allIncluded = items.every(included);

  const unansweredClarifications = draft.clarifications.filter((c) => {
    const key = `${c.item_index}-${c.field}`;
    return !clarificationAnswers[key] || clarificationAnswers[key].trim() === "";
  });
  const canConfirm =
    unansweredClarifications.length === 0 && confirmState.status !== "pending";

  async function handleConfirm() {
    setConfirmState({ status: "pending" });
    const result: ConfirmMealResult = await confirmMealAction({
      rawText: draft.rawText,
      mealType,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity ?? 0,
        unit: item.unit ?? "",
        preparationMethod: item.preparationMethod,
        nutritionItemId: item.nutritionItemId,
        aiCalories: item.aiCalories,
        calories: item.calories,
        aiProteinG: item.aiProteinG,
        proteinG: item.proteinG,
        aiCarbsG: item.aiCarbsG,
        carbsG: item.carbsG,
        aiFatG: item.aiFatG,
        fatG: item.fatG,
      })),
    });
    setConfirmState({
      status: result.ok ? "success" : "error",
      message: result.message,
    });
  }

  if (confirmState.status === "success") {
    return (
      <div className={`${cardClass} flex items-center gap-3 border-l-4 border-l-[var(--brand)] text-sm`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          ✓
        </span>
        <span className="text-[var(--brand-strong)]">
          {confirmState.message} Refresh or log another meal to continue.
        </span>
      </div>
    );
  }

  return (
    <div className={`${cardClass} flex flex-col gap-6`}>
      <div>
        <label htmlFor="mealType" className="mb-1 block text-sm font-medium">
          Meal type
        </label>
        <select
          id="mealType"
          value={mealType}
          onChange={(e) => setMealType(e.target.value as (typeof MEAL_TYPES)[number])}
          className={`${inputClass} w-fit`}
        >
          {MEAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Review items
        </h2>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.index}
              className={`rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-3 text-sm ${itemAccent[item.status]}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium capitalize">{item.name}</span>
                {item.manuallyEntered ? (
                  <span className={badgeStyles.manual}>manually entered</span>
                ) : item.status === "computed" ? (
                  <span className={badgeStyles.matched}>
                    matched{item.matchedName ? `: ${item.matchedName}` : ""}
                  </span>
                ) : item.status === "unresolved_item" ? (
                  <span className={badgeStyles.warning}>not in knowledge base</span>
                ) : (
                  <span className={badgeStyles.warning}>needs a gram quantity</span>
                )}
                {item.conflicts.length > 0 && (
                  <span className={badgeStyles.conflict}>
                    conflicts with: {item.conflicts.join(", ")}
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="text-xs text-zinc-500">
                  Quantity
                  <input
                    type="number"
                    value={item.quantity ?? ""}
                    onChange={(e) => updateQuantity(item.index, e.target.value)}
                    className={`${inputClass} mt-0.5 py-1`}
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  Unit
                  <input
                    type="text"
                    value={item.unit ?? ""}
                    onChange={(e) => updateUnit(item.index, e.target.value)}
                    className={`${inputClass} mt-0.5 py-1`}
                  />
                </label>
                <label className="col-span-2 text-xs text-zinc-500">
                  Preparation
                  <input
                    type="text"
                    value={item.preparationMethod ?? ""}
                    onChange={(e) => updatePreparation(item.index, e.target.value)}
                    className={`${inputClass} mt-0.5 py-1`}
                  />
                </label>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="text-xs text-zinc-500">
                  Calories
                  <input
                    type="number"
                    value={item.calories}
                    onChange={(e) => updateMacro(item.index, "calories", e.target.value)}
                    className={`${inputClass} mt-0.5 py-1`}
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  Protein (g)
                  <input
                    type="number"
                    value={item.proteinG}
                    onChange={(e) => updateMacro(item.index, "proteinG", e.target.value)}
                    className={`${inputClass} mt-0.5 py-1`}
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  Carbs (g)
                  <input
                    type="number"
                    value={item.carbsG}
                    onChange={(e) => updateMacro(item.index, "carbsG", e.target.value)}
                    className={`${inputClass} mt-0.5 py-1`}
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  Fat (g)
                  <input
                    type="number"
                    value={item.fatG}
                    onChange={(e) => updateMacro(item.index, "fatG", e.target.value)}
                    className={`${inputClass} mt-0.5 py-1`}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {draft.clarifications.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Clarifications needed{" "}
            <span className="font-normal normal-case">(must answer before confirming)</span>
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {draft.clarifications.map((c, i) => (
              <li key={i}>
                <label className="block text-amber-800 dark:text-amber-300">
                  {c.question}
                </label>
                {c.field === "quantity" ? (
                  <input
                    type="number"
                    placeholder="grams"
                    onChange={(e) =>
                      answerQuantityClarification(c.item_index, e.target.value)
                    }
                    className={`${inputClass} mt-1 w-40 py-1`}
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. grilled"
                    onChange={(e) =>
                      answerPreparationClarification(c.item_index, e.target.value)
                    }
                    className={`${inputClass} mt-1 w-56 py-1`}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {draft.assumptions.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Assumptions
          </h2>
          <ul className="flex flex-col gap-1 text-sm text-zinc-500 dark:text-zinc-400">
            {draft.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl bg-[var(--brand-soft)]/40 p-4 text-sm">
        <p className="font-semibold">
          {totals.calories.toFixed(2)} kcal · {totals.proteinG.toFixed(2)}g
          protein · {totals.carbsG.toFixed(2)}g carbs · {totals.fatG.toFixed(2)}g
          fat
        </p>
        {!allIncluded && (
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            This total doesn&apos;t include every item yet — resolve the
            flagged items above (or enter their values manually) for a
            complete count.
          </p>
        )}
      </div>

      {confirmState.status === "error" && confirmState.message && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {confirmState.message}
        </p>
      )}
      {unansweredClarifications.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Answer all clarification questions above to confirm.
        </p>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!canConfirm}
        className={`${primaryButtonClass} self-start`}
      >
        {confirmState.status === "pending" ? "Saving..." : "Confirm and save"}
      </button>
    </div>
  );
}
