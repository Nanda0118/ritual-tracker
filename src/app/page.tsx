import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrackerApp from "@/components/TrackerApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <TrackerApp userEmail={user.email ?? ""} userId={user.id} />;
}
