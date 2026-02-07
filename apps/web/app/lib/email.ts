import { Resend } from "resend";
import { env } from "./env";
import VerificationEmail from "../../emails/verification";
import ResetPasswordEmail from "../../emails/reset-password";

const resend = new Resend(env.RESEND_API_KEY);

// TODO: Change to noreply@isthatslop.com when domain is verified in Resend
// For development, use Resend's test address: onboarding@resend.dev
const FROM_ADDRESS = "IsThatSlop Team <onboarding@resend.dev>";

export async function sendVerificationEmail(
  user: { email: string; name: string },
  url: string,
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: user.email,
      subject: "Verify your email - IsThatSlop.com",
      react: VerificationEmail({
        userName: user.name,
        verificationUrl: url,
      }),
    });
  } catch (error) {
    console.error("[Email] Failed to send verification email:", error);
    throw error;
  }
}

export async function sendResetPasswordEmail(
  user: { email: string; name: string },
  url: string,
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: user.email,
      subject: "Reset your password - IsThatSlop.com",
      react: ResetPasswordEmail({
        userName: user.name,
        resetUrl: url,
      }),
    });
  } catch (error) {
    console.error("[Email] Failed to send password reset email:", error);
    throw error;
  }
}
