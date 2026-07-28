"use server";

import { revalidatePath } from "next/cache";
import { upsertProfile } from "@/lib/db/profiles";
import { profileFormSchema, splitList } from "@/lib/validation/profile";

export interface SubmittedProfileValues {
  calorieTarget: string;
  dietaryPreferences: string;
  allergies: string;
  avoidFoods: string;
}

export interface ProfileActionState {
  status: "idle" | "error" | "success";
  errors?: Record<string, string[] | undefined>;
  message?: string;
  // Echoes back exactly what the user submitted on error. The form's
  // inputs are uncontrolled (defaultValue), and a Server Action's
  // revalidatePath triggers a fresh render of the parent Server Component
  // — without this, a validation error would silently replace the user's
  // just-typed value with the last-saved DB value instead of showing them
  // what they actually entered.
  values?: SubmittedProfileValues;
}

export async function saveProfile(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const submitted: SubmittedProfileValues = {
    calorieTarget: String(formData.get("calorieTarget") ?? ""),
    dietaryPreferences: String(formData.get("dietaryPreferences") ?? ""),
    allergies: String(formData.get("allergies") ?? ""),
    avoidFoods: String(formData.get("avoidFoods") ?? ""),
  };

  const parsed = profileFormSchema.safeParse(submitted);

  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Please fix the errors below.",
      values: submitted,
    };
  }

  try {
    await upsertProfile({
      calorieTarget: parsed.data.calorieTarget,
      dietaryPreferences: splitList(parsed.data.dietaryPreferences),
      allergies: splitList(parsed.data.allergies),
      avoidFoods: splitList(parsed.data.avoidFoods),
    });
  } catch {
    return {
      status: "error",
      message: "Something went wrong saving your profile. Please try again.",
      values: submitted,
    };
  }

  revalidatePath("/profile");
  revalidatePath("/");
  return { status: "success", message: "Profile saved." };
}
