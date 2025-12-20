import { Resend } from "resend";
import { env } from "../env";

interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

const resendClient = new Resend(env.RESEND_API_KEY);

export const sendMail = async ({ to, subject, text, html }: SendMailOptions): Promise<void> => {
  try {
    const payload = {
      from: env.RESEND_FROM,
      to,
      subject,
      text,
      html,
    };

    // Resend's current type definition requires a React template; cast to bypass when sending raw text/html.
    await resendClient.emails.send(payload as any);
  } catch (err) {
    console.error("[MAIL:RESEND_ERROR]", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
};
