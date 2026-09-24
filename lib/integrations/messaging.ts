import { prisma } from "@/lib/db";

export async function sendSms(params: { to: string; body: string }): Promise<{ ok: boolean }> {
  const mock = !process.env.TERMII_API_KEY;

  if (!mock) {
    try {
      const res = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: params.to.replace(/^\+/, ""),
          from: process.env.TERMII_SENDER_ID || "ForceSch",
          sms: params.body,
          type: "plain",
          channel: "generic",
          api_key: process.env.TERMII_API_KEY,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok;
      await prisma.messageLog.create({
        data: {
          channel: "SMS",
          recipient: params.to,
          body: params.body,
          status: ok ? "SENT" : "FAILED",
        },
      });
      return { ok };
    } catch {
      await prisma.messageLog.create({
        data: {
          channel: "SMS",
          recipient: params.to,
          body: params.body,
          status: "FAILED",
        },
      });
      return { ok: false };
    }
  }

  await prisma.messageLog.create({
    data: {
      channel: "SMS",
      recipient: params.to,
      body: params.body,
      status: "SENT",
    },
  });
  return { ok: true };
}

export async function sendBulkSms(recipients: string[], body: string) {
  await Promise.all(recipients.map((to) => sendSms({ to, body })));
}
