import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  name: z.string().min(1).max(120),
  contact: z.string().min(5).max(120),
  subject: z.string().min(3).max(150),
  message: z.string().min(10).max(2000),
});

/** Public complaint / feedback box — stored as Notice with audience COMPLAINT */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill all fields properly" }, { status: 400 });
  }

  const { name, contact, subject, message } = parsed.data;
  const notice = await prisma.notice.create({
    data: {
      title: `[Complaint] ${subject}`,
      body: `From: ${name}\nContact: ${contact}\n\n${message}`,
      audience: "COMPLAINT",
      publishToWeb: false,
    },
  });

  await logAudit({
    action: "PUBLIC_COMPLAINT",
    entity: "Notice",
    entityId: notice.id,
  });

  return NextResponse.json({
    ok: true,
    message: "Thank you. The school office has received your message.",
  });
}
