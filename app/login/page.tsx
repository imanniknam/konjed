import { redirect } from "next/navigation";
import { AuthPage } from "@/components/konjed/pages/AuthChooser";
import { getUser } from "@/lib/server/auth/session";
export const metadata = { title: "ورود | کنجد", robots: { index: false } };
export default async function Page() {
  const u = await getUser();
  if (u) redirect(u.role === "admin" ? "/panel/admin" : `/panel/${u.role}/dashboard`);
  return <AuthPage mode="login" />;
}
