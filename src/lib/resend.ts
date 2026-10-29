import "server-only";
import { Resend } from "resend";

// Serverseitig: niemals in Client-Code importieren (API-Key).
export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`Resend: E-Mail-Versand fehlgeschlagen: ${error.message}`);
  }

  return data;
}
