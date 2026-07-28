"use client";

import { useActionState } from "react";
import { extractMealAction, type MealEntryState } from "./actions";
import { MealReview } from "./MealReview";
import { cardClass, inputClass, primaryButtonClass } from "@/app/components/ui";

const initialState: MealEntryState = { status: "idle" };

export function MealEntryForm() {
  const [state, formAction, isPending] = useActionState(
    extractMealAction,
    initialState
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className={`${cardClass} flex flex-col gap-3`}>
        <label htmlFor="mealText" className="text-sm font-medium">
          What did you eat?
        </label>
        <textarea
          id="mealText"
          name="mealText"
          rows={4}
          placeholder="e.g. 2 scrambled eggs, a slice of toast with butter, and a glass of orange juice"
          className={inputClass}
        />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
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
