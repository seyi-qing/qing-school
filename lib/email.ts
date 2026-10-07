export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Password reset email is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your Qing School password",
      text: `Use this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour and can only be used once.`,
      html: `<p>We received a request to reset your Qing School password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour and can only be used once.</p>`,
    }),
  });

  if (!response.ok) throw new Error("Password reset email could not be sent.");
}
