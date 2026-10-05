import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { sendSms } from "@/lib/integrations/messaging";
import { extractPhone } from "@/lib/phone";
import { SCHOOL } from "@/lib/school-config";
import { resolveSchoolId } from "@/lib/tenant-scope";

const MarkSchema = z.object({
  armId: z.string(),
  date: z.string(),
  marks: z.array(
    z.object({ studentId: z.string(), status: z.enum(["PRESENT", "ABSENT", "LATE"]) })
  ),
  notifyParents: z.boolean().optional().default(true),
});

async function getCurrentTerm() {
  const term = await prisma.term.findFirst({ where: { isCurrent: true } });
  if (!term) throw new Error("No current term is set. An admin must set one in Admin Settings.");
  return term;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "TAKE_ATTENDANCE")) {
    return NextResponse.json(
      { error: "You don't have permission to take attendance." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = MarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attendance payload." }, { status: 400 });
  }

  const { date, marks, notifyParents } = parsed.data;
  const schoolId = await resolveSchoolId(session);
  if (schoolId && marks.length) {
    const ids = marks.map((m) => m.studentId);
    const allowed = await prisma.student.count({
      where: { id: { in: ids }, schoolId },
    });
    if (allowed !== ids.length) {
      return NextResponse.json(
        { error: "One or more students are outside your school." },
        { status: 403 }
      );
    }
  }
  const term = await getCurrentTerm();
  const day = new Date(date);

  await Promise.all(
    marks.map((m) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: m.studentId, date: day } },
        update: { status: m.status, termId: term.id },
        create: {
          studentId: m.studentId,
          date: day,
          status: m.status,
          termId: term.id,
        },
      })
    )
  );

  let smsSent = 0;
  let smsSkipped = 0;

  if (notifyParents) {
    const absentIds = marks.filter((m) => m.status === "ABSENT").map((m) => m.studentId);
    if (absentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: { id: { in: absentIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          guardianPhone: true,
          medicalNotes: true,
        },
      });

      const dateLabel = day.toLocaleDateString("en-NG", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      for (const st of students) {
        const phone = extractPhone(st.guardianPhone, st.medicalNotes);
        if (!phone) {
          smsSkipped++;
          continue;
        }
        const msg = `${SCHOOL.shortName}: ${st.firstName} ${st.lastName} was marked ABSENT on ${dateLabel}. Contact the school if this is unexpected.`;
        const result = await sendSms({ to: phone, body: msg });
        if (result.ok) smsSent++;
        else smsSkipped++;
      }
    }
  }

  await logAudit({
    userId: session.userId,
    action: "MARK_ATTENDANCE",
    entity: "Attendance",
    details: { date, count: marks.length, smsSent, smsSkipped },
  });

  return NextResponse.json({ ok: true, marked: marks.length, smsSent, smsSkipped });
}
