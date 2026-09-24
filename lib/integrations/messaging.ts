/**
 * SMS / Messaging Integration (Termii)
 * ------------------------------------------------------------------
 * MOCK when TERMII_API_KEY is unset: still writes MessageLog for testing.
 * LIVE when key is set: posts to Termii Messaging API.
 * Docs: https://developers.termii.com/messaging
 */
import { prisma } from "@/lib/db";

export async function sendSms(params: { to: string; body: string }) {
  const mock = !process.env.TERMII_API_KEY;
  let status: string = "SENT";
  let providerResponse: string | undefined;

  if (!mock) {
    try {
      const res = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: params.to.replace(/^\+/, "").replace(/^0/, "234"),
          from: process.env.TERMII_SENDER_ID || "FORCESCH",
          sms: params.body,
          type: "plain",
          channel: "generic",
          api_key: process.env.TERMII_API_KEY,
        }),
      });
      const json = await res.json().catch(() => ({}));
      providerResponse = JSON.stringify(json).slice(0, 500);
      status = res.ok ? "SENT" : "FAILED";
    } catch (err) {
      status = "FAILED";
      providerResponse = err instanceof Error ? err.message : String(err);
    }
  }

  await prisma.messageLog.create({
    data: {
      channel: "SMS",
      recipient: params.to,
      body: params.body + (providerResponse ? ` | ${providerResponse}` : ""),
      status,
    },
  });

  return { status };
}

export async function sendBulkSms(recipients: string[], body: string) {
  await Promise.all(recipients.map((to) => sendSms({ to, body })));
}
