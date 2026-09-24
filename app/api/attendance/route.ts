import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const MarkSchema = z.object({
  armId: z.string(),
  date: z.string(),
  marks: z.array(z.object({ studentId: z.string(), status: z.enum(["PRESENT", "ABSENT", "LATE"]) })),
});

async function getCurrentTerm() {
  const term = await prisma.term.findFirst({ where: { isCurrent: true } });
  if (!term) throw new Error("No current term is set. An admin must set one in Admin Settings.");
  return term;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "TAKE_ATTENDANCE")) {
    return NextResponse.json({ error: "You don't have permission to take attendance." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = MarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attendance payload." }, { status: 400 });
  }

  const { date, marks } = parsed.data;
  const term = await getCurrentTerm();
  const day = new Date(date);

  await Promise.all(
    marks.map((m) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: m.studentId, date: day } },
        update: { status: m.status, termId: term.id },
        create: { studentId: m.studentId, date: day, status: m.status, termId: term.id },
      })
    )
  );

  await logAudit({
    userId: session.userId,
    action: "TAKE_ATTENDANCE",
    entity: "Attendance",
    details: { date, count: marks.length },
  });

  return NextResponse.json({ ok: true });
}
