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
          fontSize: "13px",
          color: "#000000",
          marginTop: 0,
          marginBottom: "16px",
        }}
      >
        Hello {userName},
      </Text>

      <Text
        style={{
          fontSize: "12px",
          color: "#000000",
          marginBottom: "24px",
        }}
      >
        Click the button below to verify your email address.
      </Text>

      <Button
        href={verificationUrl}
        style={{
          backgroundColor: "rgb(127 177 179)",
          border: "1px solid",
          borderColor: "#f7f7f7 #606060 #606060 #f7f7f7",
          padding: "10px 24px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#f7f7f7",
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
        If you didn&apos;t create an account, you can safely ignore this email.
      </Text>
    </Layout>
  );
}
