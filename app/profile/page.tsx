import { getProfile } from "@/lib/db/profiles";
import { ProfileForm } from "./ProfileForm";
import { PageHeader } from "@/app/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <PageHeader
        title="Your profile"
        description={
          profile
            ? "Update your calorie target and dietary restrictions."
            : "Set up your profile to start logging meals."
        }
      />
      <ProfileForm initialProfile={profile} />
    </div>
  );
}
