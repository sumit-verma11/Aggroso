import { redirect } from "next/navigation";
import { getProfile } from "@/lib/db/profiles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getProfile();
  redirect(profile ? "/log" : "/profile");
}
