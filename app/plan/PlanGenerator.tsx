"use client";

import { useState } from "react";
import { resolveFood } from "@/lib/nutrition/lookup";
import { computeItem } from "@/lib/nutrition/calculate";
import { findConflicts } from "@/lib/nutrition/restrictions";
import type { NutritionItemRow } from "@/lib/db/nutrition-items";
import {
  generatePlanAction,
  approvePlanAction,
  type PlanGenerationState,
} from "./actions";
import type { PlanDraftItem } from "@/lib/meal-plan/build";

const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealSlot = (typeof MEAL_SLOTS)[number];

interface EditableItem extends PlanDraftItem {
  userEdited: boolean;
}

function toEditable(item: PlanDraftItem): EditableItem {
  return { ...item, userEdited: false };
}

export function PlanGenerator({
  targetDate,
  nutritionItems,
  restrictions,
}: {
  targetDate: string;
  nutritionItems: NutritionItemRow[];
  restrictions: { allergies: string[]; avoidFoods: string[] };
}) {
  const [state, setState] = useState<PlanGenerationState>({ status: "idle" });
  const [items, setItems] = useState<EditableItem[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [approveState, setApproveState] = useState<{
    status: "idle" | "pending" | "error" | "success";
    message?: string;
  }>({ status: "idle" });

  async function handleGenerate() {
    setIsGenerating(true);
    setApproveState({ status: "idle" });
    const result = await generatePlanAction();
    setState(result);
    setItems(result.draft ? result.draft.items.map(toEditable) : null);
    setIsGenerating(false);
  }

  function recomputeConflicts(name: string, matchedName: string | null): string[] {
    return [
      ...findConflicts(name, matchedName, restrictions.allergies),
      ...findConflicts(name, matchedName, restrictions.avoidFoods),
    ];
  }

  function updateName(index: number, name: string) {
    setItems((prev) =>
      prev
        ? prev.map((item) => {
            if (item.index !== index) return item;
            const matched = resolveFood(name, nutritionItems);
            const referenceNutrition = matched
              ? {
                  servingGrams: matched.servingGrams,
                  calories: matched.calories,
                  proteinG: matched.proteinG,
                  carbsG: matched.carbsG,
                  fatG: matched.fatG,
                }
              : null;
            const computed = computeItem(item.quantity, item.unit, referenceNutrition);
            return {
              ...item,
              name,
              nutritionItemId: matched?.id ?? null,
              matchedName: matched?.canonicalName ?? null,
              referenceNutrition,
              ...computed,
              userEdited: true,
              conflicts: recomputeConflicts(name, matched?.canonicalName ?? null),
            };
          })
        : prev
    );
  }

  function updateQuantity(index: number, rawValue: string) {
    setItems((prev) =>
      prev
        ? prev.map((item) => {
            if (item.index !== index) return item;
            const quantity = Number(rawValue) || 0;
            if (!item.referenceNutrition) {
              return { ...item, quantity, userEdited: true };
            }
            const computed = computeItem(quantity, item.unit, item.referenceNutrition);
            return { ...item, quantity, ...computed, userEdited: true };
          })
        : prev
    );
  }

  function updateUnit(index: number, unit: string) {
    setItems((prev) =>
      prev
        ? prev.map((item) => {
            if (item.index !== index) return item;
            if (!item.referenceNutrition) {
              return { ...item, unit, userEdited: true };
            }
            const computed = computeItem(item.quantity, unit, item.referenceNutrition);
            return { ...item, unit, ...computed, userEdited: true };
          })
        : prev
    );
  }

  function removeItem(index: number) {
    setItems((prev) => (prev ? prev.filter((i) => i.index !== index) : prev));
  }

  function addItem(mealSlot: MealSlot) {
    setItems((prev) => {
      const nextIndex = prev && prev.length > 0 ? Math.max(...prev.map((i) => i.index)) + 1 : 0;
      const blank: EditableItem = {
        index: nextIndex,
        mealSlot,
        name: "",
        quantity: 0,
        unit: "g",
        nutritionItemId: null,
        matchedName: null,
        referenceNutrition: null,
        status: "unresolved_item",
        grams: null,
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        conflicts: [],
        userEdited: true,
      };
      return prev ? [...prev, blank] : [blank];
    });
  }

  const totals = (items ?? []).reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      proteinG: acc.proteinG + i.proteinG,
      carbsG: acc.carbsG + i.carbsG,
      fatG: acc.fatG + i.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
  const calorieTarget = state.draft?.calorieTarget ?? 0;
  const gap = totals.calories - calorieTarget;
  const hasConflicts = (items ?? []).some((i) => i.conflicts.length > 0);

  async function handleApprove() {
    if (!items) return;
    setApproveState({ status: "pending" });
    const result = await approvePlanAction({
      targetDate,
      items: items.map((item) => ({
        mealSlot: item.mealSlot as MealSlot,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        nutritionItemId: item.nutritionItemId,
        calories: item.calories,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        userEdited: item.userEdited,
      })),
    });
    setApproveState({
      status: result.ok ? "success" : "error",
      message: result.message,
    });
  }

  function handleReject() {
    setItems(null);
    setState({ status: "idle" });
    setApproveState({ status: "idle" });
  }

  if (approveState.status === "success") {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
        {approveState.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!items && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {isGenerating ? "Generating..." : "Generate meal plan"}
        </button>
      )}

      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}

      {items && (
        <>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            Draft — not yet approved
          </div>

          {MEAL_SLOTS.map((slot) => {
            const slotItems = items.filter((i) => i.mealSlot === slot);
            return (
              <div
                key={slot}
                className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-medium capitalize">{slot}</h2>
                  <button
                    type="button"
                    onClick={() => addItem(slot)}
                    className="text-xs text-zinc-500 underline dark:text-zinc-400"
                  >
                    + add item
                  </button>
                </div>
                <ul className="flex flex-col gap-2">
                  {slotItems.map((item) => (
                    <li
                      key={item.index}
                      className="rounded border border-zinc-200 p-2 dark:border-zinc-800"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateName(item.index, e.target.value)}
                          placeholder="food name"
                          className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(item.index)}
                          className="text-xs text-red-600 dark:text-red-400"
                        >
                          remove
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.index, e.target.value)}
                          className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateUnit(item.index, e.target.value)}
                          className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        {item.status === "computed" ? (
                          <span className="text-zinc-500 dark:text-zinc-400">
                            matched: {item.matchedName} · {item.calories} kcal
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">
                            not resolved — 0 kcal counted
                          </span>
                        )}
                        {item.conflicts.length > 0 && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-800 dark:bg-red-950 dark:text-red-300">
                            conflicts: {item.conflicts.join(", ")}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                  {slotItems.length === 0 && (
                    <li className="text-xs text-zinc-400">No items yet.</li>
                  )}
                </ul>
              </div>
            );
          })}

          {state.draft && state.draft.notes.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Notes
              </h2>
              <ul className="flex flex-col gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                {state.draft.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
            <p className="font-medium">
              {totals.calories.toFixed(0)} kcal · {totals.proteinG.toFixed(1)}g
              protein · {totals.carbsG.toFixed(1)}g carbs · {totals.fatG.toFixed(1)}g
              fat
            </p>
            <p
              className={
                gap > 0
                  ? "mt-1 text-amber-700 dark:text-amber-400"
                  : "mt-1 text-zinc-500 dark:text-zinc-400"
              }
            >
              Target: {calorieTarget} kcal ({gap >= 0 ? "+" : ""}
              {gap.toFixed(0)} kcal vs. target)
            </p>
          </div>

          {hasConflicts && (
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              This plan conflicts with an allergy or avoided food and can&apos;t
              be approved until fixed.
            </p>
          )}
          {approveState.status === "error" && approveState.message && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {approveState.message}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={hasConflicts || approveState.status === "pending"}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {approveState.status === "pending" ? "Saving..." : "Approve plan"}
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
            >
              Reject and start over
            </button>
          </div>
        </>
      )}
    </div>
  );
}
