import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Lightweight session probe for header menu when pages omit email prop. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    email: session.email,
    role: session.role,
    userId: session.userId,
  });
}
