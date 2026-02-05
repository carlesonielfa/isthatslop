import { Text, Button } from "@react-email/components";
import Layout from "./components/layout";

interface VerificationEmailProps {
  userName: string;
  verificationUrl: string;
}

export default function VerificationEmail({
  userName,
  verificationUrl,
}: VerificationEmailProps) {
  return (
    <Layout title="Email Verification">
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
        Click the button below to verify your email address.
      </Text>

      <Button
        href={verificationUrl}
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
        Verify Email Address
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
        If you didn't create an account, you can safely ignore this email.
      </Text>
    </Layout>
  );
}
