// Email port (engineering brief §1): everything sends through sendEmail();
// Resend is the first implementation, a console log is the dev fallback.
// Swapping providers means changing this file only.

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const FROM = process.env.EMAIL_FROM ?? "Fullthrottle <orders@fullthrottle.com>";

export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`
    );
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!res.ok) {
    // Never fail the customer action because an email bounced — log and move on.
    console.error(`sendEmail failed (${res.status}): ${await res.text()}`);
  }
}
