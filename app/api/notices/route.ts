import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { sendSms } from "@/lib/integrations/messaging";
import { extractPhone } from "@/lib/phone";
import { SCHOOL } from "@/lib/school-config";
import { resolveSchoolId, schoolWhere } from "@/lib/tenant-scope";

const NoticeSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(["ALL", "STAFF", "STUDENTS", "PARENTS"]),
  publishToWeb: z.coerce.boolean().default(false),
  alsoSendSms: z.coerce.boolean().default(false),
});

export async function GET() {
  const session = await getSession();
  const schoolId = session ? await resolveSchoolId(session) : null;
  const notices = await prisma.notice.findMany({
    where: schoolWhere(schoolId),
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ notices });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.role, "MANAGE_NOTICES")) {
    return NextResponse.json({ error: "You don't have permission to post notices." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = NoticeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid notice." }, { status: 400 });
  }
  const { alsoSendSms, ...data } = parsed.data;

  const schoolId = await resolveSchoolId(session);
  const notice = await prisma.notice.create({
    data: { ...data, createdBy: session.userId, schoolId: schoolId ?? undefined },
  });

  let smsSent = 0;
  let smsSkipped = 0;

  if (alsoSendSms) {
    const smsBody = `${SCHOOL.shortName}: ${data.title}. ${data.body}`.slice(0, 320);

    if (data.audience === "STAFF" || data.audience === "ALL") {
      const staffWithPhones = await prisma.staff.findMany({
        where: { phone: { not: null }, ...schoolWhere(schoolId) },
      });
      for (const s of staffWithPhones) {
        if (!s.phone) continue;
        const r = await sendSms({ to: s.phone, body: smsBody });
        if (r.ok) smsSent++;
        else smsSkipped++;
      }
    }

    if (data.audience === "PARENTS" || data.audience === "ALL") {
      const students = await prisma.student.findMany({
        where: { status: "ACTIVE", ...schoolWhere(schoolId) },
        select: { guardianPhone: true, medicalNotes: true },
      });
      const seen = new Set<string>();
      for (const s of students) {
        const phone = extractPhone(s.guardianPhone, s.medicalNotes);
        if (!phone || seen.has(phone)) continue;
        seen.add(phone);
        const r = await sendSms({ to: phone, body: smsBody });
        if (r.ok) smsSent++;
        else smsSkipped++;
      }
    }
  }

  await logAudit({
    userId: session.userId,
    action: "POST_NOTICE",
    entity: "Notice",
    entityId: notice.id,
    details: { alsoSendSms, smsSent, smsSkipped, audience: data.audience },
  });

  return NextResponse.json({ notice, smsSent, smsSkipped }, { status: 201 });
}
