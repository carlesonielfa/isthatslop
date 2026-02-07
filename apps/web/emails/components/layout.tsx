import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({
  children,
  title = "IsThatSlop.com",
}: LayoutProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#008080",
          fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#c0c0c0",
            border: "3px solid",
            borderColor: "#ffffff #000000 #000000 #ffffff",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          {/* Title Bar */}
          <Section
            style={{
              backgroundColor: "#000080",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                margin: 0,
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {title}
            </Text>
          </Section>

          {/* Content Area */}
          <Section
            style={{
              padding: "24px",
              backgroundColor: "#c0c0c0",
            }}
          >
            {children}
          </Section>

          <Hr
            style={{
              border: "none",
              borderTop: "1px solid #808080",
              margin: "0 24px",
            }}
          />

          {/* Footer */}
          <Section
            style={{
              padding: "16px 24px",
              backgroundColor: "#c0c0c0",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#000000",
                textAlign: "center",
              }}
            >
              IsThatSlop Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
