import { getProfile } from "@/lib/db/profiles";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Your profile</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {profile
          ? "Update your calorie target and dietary restrictions."
          : "Set up your profile to start logging meals."}
      </p>
      <ProfileForm initialProfile={profile} />
    </div>
  );
}
