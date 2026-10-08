import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(30).nullable().optional(),
  designation: z.string().max(80).nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
  }

  const staff = await prisma.staff.findUnique({ where: { userId: session.userId } });
  if (!staff) {
    return NextResponse.json(
      { error: "No staff profile linked to this account." },
      { status: 400 }
    );
  }

  const updated = await prisma.staff.update({
    where: { id: staff.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || null,
      designation: parsed.data.designation || null,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "UPDATE_OWN_PROFILE",
    entity: "Staff",
    entityId: updated.id,
  });

  return NextResponse.json({ staff: updated });
}
