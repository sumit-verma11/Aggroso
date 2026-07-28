"use client";

import { useActionState } from "react";
import { extractMealAction, type MealEntryState } from "./actions";
import type { MealDraft, DraftItem } from "@/lib/meal/draft";

const initialState: MealEntryState = { status: "idle" };

export function MealEntryForm() {
  const [state, formAction, isPending] = useActionState(
    extractMealAction,
    initialState
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="mealText" className="text-sm font-medium">
          What did you eat?
        </label>
        <textarea
          id="mealText"
          name="mealText"
          rows={4}
          placeholder="e.g. 2 scrambled eggs, a slice of toast with butter, and a glass of orange juice"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {isPending ? "Extracting..." : "Extract meal"}
        </button>
      </form>

      {isPending && (
        <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
          Reading your meal description…
        </p>
      )}

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}

      {state.status === "success" && state.draft && (
        <DraftPreview draft={state.draft} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DraftItem["status"] }) {
  if (status === "computed") {
    return (
      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
        matched
      </span>
    );
  }
  if (status === "unresolved_item") {
    return (
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        not in knowledge base
      </span>
    );
  }
  return (
    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      needs a gram quantity
    </span>
  );
}

function DraftPreview({ draft }: { draft: MealDraft }) {
  return (
    <div className="flex flex-col gap-5 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Extracted items
        </h2>
        <ul className="flex flex-col gap-3">
          {draft.items.map((item) => (
            <li
              key={item.index}
              className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium capitalize">{item.name}</span>
                <StatusBadge status={item.status} />
                {item.conflicts.length > 0 && (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                    conflicts with: {item.conflicts.join(", ")}
                  </span>
                )}
              </div>
              <div className="mt-1 text-zinc-500 dark:text-zinc-400">
                {item.quantity ?? "?"} {item.unit ?? "(unit unknown)"}
                {item.preparationMethod ? ` · ${item.preparationMethod}` : ""}
                {item.matchedName ? ` · matched: ${item.matchedName}` : ""}
              </div>
              {item.status === "computed" && (
                <div className="mt-1 text-zinc-700 dark:text-zinc-300">
                  {item.calories} kcal · {item.proteinG}g protein ·{" "}
                  {item.carbsG}g carbs · {item.fatG}g fat
                  {item.grams !== null ? ` (${item.grams}g)` : ""}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {draft.clarifications.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Clarifications needed
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {draft.clarifications.map((c, i) => (
              <li key={i} className="text-amber-800 dark:text-amber-300">
                {c.question}
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

      <div className="border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
        <p className="font-medium">
          {draft.totals.calories} kcal · {draft.totals.proteinG}g protein ·{" "}
          {draft.totals.carbsG}g carbs · {draft.totals.fatG}g fat
        </p>
        {!draft.totals.isComplete && (
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            This total only reflects the matched items above — resolve the
            flagged items to get a complete count.
          </p>
        )}
      </div>
    </div>
  );
}
