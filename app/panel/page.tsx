import { redirect } from "next/navigation";
import { getUser } from "@/lib/server/auth/session";
export default async function Page() {
  const u = await getUser();
  redirect(u ? (u.role === "admin" ? "/panel/admin" : `/panel/${u.role}/dashboard`) : "/login");
}
