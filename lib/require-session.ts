/**
 * Page-level session guard.
 * ------------------------------------------------------------------
 * Middleware already blocks unauthenticated requests, but individual pages
 * still need the session's data (role, email, userId) to render correctly
 * and to do a final permission check for actions within a shared route.
 * Call this at the top of any server component page that needs the user.
 */
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/auth";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
