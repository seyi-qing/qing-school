import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions";
import { resolveSchoolId } from "@/lib/tenant-scope";

export async function requireApiSession(): Promise<
  { session: SessionPayload } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function requirePermission(
  permission: Permission
): Promise<
  { session: SessionPayload; schoolId: string | null } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!can(session.role, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const schoolId = await resolveSchoolId(session);
  return { session, schoolId };
}

export async function requireSchoolScope(): Promise<
  { session: SessionPayload; schoolId: string } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const schoolId = await resolveSchoolId(session);
  if (!schoolId) {
    return {
      error: NextResponse.json(
        { error: "Select a school context (Platform → Work as this school)." },
        { status: 400 }
      ),
    };
  }
  return { session, schoolId };
}
