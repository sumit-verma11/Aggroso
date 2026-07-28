"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileActionState } from "./actions";
import type { Profile } from "@/lib/db/profiles";
import { cardClass, inputClass, primaryButtonClass } from "@/app/components/ui";

const initialState: ProfileActionState = { status: "idle" };

function fieldError(state: ProfileActionState, field: string): string | undefined {
  return state.errors?.[field]?.[0];
}

export function ProfileForm({ initialProfile }: { initialProfile: Profile | null }) {
  const [state, formAction, isPending] = useActionState(saveProfile, initialState);

  // On a validation/save error, re-show exactly what the user typed
  // (state.values) rather than falling back to the last-saved DB value —
  // see the comment on ProfileActionState.values for why this matters.
  const calorieTargetValue =
    state.values?.calorieTarget ?? initialProfile?.calorieTarget ?? "";
  const dietaryPreferencesValue =
    state.values?.dietaryPreferences ??
    initialProfile?.dietaryPreferences.join(", ") ??
    "";
  const allergiesValue =
    state.values?.allergies ?? initialProfile?.allergies.join(", ") ?? "";
  const avoidFoodsValue =
    state.values?.avoidFoods ?? initialProfile?.avoidFoods.join(", ") ?? "";

  return (
    <form action={formAction} className={`${cardClass} flex flex-col gap-5`}>
      <div>
        <label htmlFor="calorieTarget" className="mb-1 block text-sm font-medium">
          Daily calorie target
        </label>
        <input
          id="calorieTarget"
          name="calorieTarget"
          type="number"
          inputMode="numeric"
          defaultValue={calorieTargetValue}
          className={inputClass}
          aria-invalid={Boolean(fieldError(state, "calorieTarget"))}
        />
        {fieldError(state, "calorieTarget") && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {fieldError(state, "calorieTarget")}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="dietaryPreferences" className="mb-1 block text-sm font-medium">
          Dietary preferences{" "}
          <span className="font-normal text-zinc-500">(comma-separated, optional)</span>
        </label>
        <input
          id="dietaryPreferences"
          name="dietaryPreferences"
          type="text"
          placeholder="e.g. vegetarian, high-protein"
          defaultValue={dietaryPreferencesValue}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="allergies" className="mb-1 block text-sm font-medium">
          Allergies <span className="font-normal text-zinc-500">(comma-separated, optional)</span>
        </label>
        <input
          id="allergies"
          name="allergies"
          type="text"
          placeholder="e.g. peanuts, shellfish"
          defaultValue={allergiesValue}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="avoidFoods" className="mb-1 block text-sm font-medium">
          Foods to avoid{" "}
          <span className="font-normal text-zinc-500">(comma-separated, optional)</span>
        </label>
        <input
          id="avoidFoods"
          name="avoidFoods"
          type="text"
          placeholder="e.g. pork, cilantro"
          defaultValue={avoidFoodsValue}
          className={inputClass}
        />
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p role="status" className="text-sm text-[var(--brand-strong)]">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
        {isPending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
