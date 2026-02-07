import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
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
          backgroundColor: "rgb(127 177 179)",
          fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#c0c0c0",
            border: "1px solid",
            borderColor: "#f7f7f7 #606060 #606060 #f7f7f7",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          {/* Title Bar */}
          <Section
            style={{
              backgroundColor: "rgb(127 177 179)",
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

          {/* Footer */}
          <Section
            style={{
              padding: "4px 8px",
              backgroundColor: "rgb(127 177 179)",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#f7f7f7",
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
