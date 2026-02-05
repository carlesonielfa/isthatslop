import { Text, Button } from "@react-email/components";
import Layout from "./components/layout";

interface ResetPasswordEmailProps {
  userName: string;
  resetUrl: string;
}

export default function ResetPasswordEmail({
  userName,
  resetUrl,
}: ResetPasswordEmailProps) {
  return (
    <Layout title="Password Reset">
      <Text
        style={{
          fontSize: "16px",
          color: "#000000",
          marginTop: 0,
          marginBottom: "16px",
        }}
      >
        Hello {userName},
      </Text>

      <Text
        style={{
          fontSize: "14px",
          color: "#000000",
          marginBottom: "24px",
        }}
      >
        We received a request to reset your password. Click the button below to
        choose a new password.
      </Text>

      <Button
        href={resetUrl}
        style={{
          backgroundColor: "#c0c0c0",
          border: "3px solid",
          borderColor: "#ffffff #000000 #000000 #ffffff",
          padding: "10px 24px",
          fontSize: "14px",
          fontWeight: "bold",
          color: "#000000",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        Reset Password
      </Button>

      <Text
        style={{
          fontSize: "12px",
          color: "#000000",
          marginTop: "24px",
          marginBottom: "8px",
        }}
      >
        This link will expire in 24 hours.
      </Text>

      <Text
        style={{
          fontSize: "12px",
          color: "#000000",
          marginTop: "8px",
        }}
      >
        If you didn't request this, you can safely ignore this email.
      </Text>
    </Layout>
  );
}
