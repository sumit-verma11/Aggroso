"use client";

import { useActionState } from "react";
import { extractMealAction, type MealEntryState } from "./actions";
import { MealReview } from "./MealReview";

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
        <MealReview key={state.draft.rawText} draft={state.draft} />
      )}
    </div>
  );
}
