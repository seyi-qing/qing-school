/**
 * SMS / Messaging Integration (Termii)
 * ------------------------------------------------------------------
 * Same "mock mode by default" approach as lib/integrations/payments.ts.
 * Without TERMII_API_KEY, messages are logged as SENT (mock).
 */
import { prisma } from "@/lib/db";

export async function sendSms(params: { to: string; body: string }) {
  const mock = !process.env.TERMII_API_KEY;

  if (!mock) {
    // TODO (go-live): call Termii API
  }

  await prisma.messageLog.create({
    data: {
      channel: "SMS",
      recipient: params.to,
      body: params.body,
      status: "SENT",
    },
  });
}

export async function sendBulkSms(recipients: string[], body: string) {
  await Promise.all(recipients.map((to) => sendSms({ to, body })));
}
