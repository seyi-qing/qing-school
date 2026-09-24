import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { sendBulkSms } from "@/lib/integrations/messaging";

const NoticeSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(["ALL", "STAFF", "STUDENTS", "PARENTS"]),
  publishToWeb: z.coerce.boolean().default(false),
  alsoSendSms: z.coerce.boolean().default(false),
});

export async function GET() {
  const notices = await prisma.notice.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
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

  const notice = await prisma.notice.create({ data: { ...data, createdBy: session.userId } });

  if (alsoSendSms) {
    const staffWithPhones = await prisma.staff.findMany({ where: { phone: { not: null } } });
    await sendBulkSms(
      staffWithPhones.map((s) => s.phone!).filter(Boolean),
      `${data.title}: ${data.body}`
    );
  }

  await logAudit({ userId: session.userId, action: "POST_NOTICE", entity: "Notice", entityId: notice.id });

  return NextResponse.json({ notice }, { status: 201 });
}
