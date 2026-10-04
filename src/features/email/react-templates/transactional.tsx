import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import { renderEmail, type RenderedEmail } from "@/features/email/react-templates/render-email";

export type TransactionalEmailProps = {
  preview: string;
  heading: string;
  paragraphs: string[];
  /** Large monospace code (OTP). */
  code?: string;
  linkUrl?: string;
  linkLabel?: string;
};

function TransactionalEmail({
  preview,
  heading,
  paragraphs,
  code,
  linkUrl,
  linkLabel,
}: TransactionalEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h2" style={headingStyle}>
            {heading}
          </Heading>
          {code ? <Text style={codeStyle}>{code}</Text> : null}
          {paragraphs.map((p, i) => (
            <Text key={i} style={text}>
              {p}
            </Text>
          ))}
          {linkUrl ? (
            <Text style={text}>
              <Link href={linkUrl} style={link}>
                {linkLabel ?? linkUrl}
              </Link>
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}

export async function renderTransactionalEmail(
  props: TransactionalEmailProps,
): Promise<RenderedEmail> {
  return renderEmail(<TransactionalEmail {...props} />);
}

const body = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
} as const;

const container = {
  margin: "0 auto",
  padding: "20px 0",
  maxWidth: "560px",
} as const;

const headingStyle = {
  fontSize: "20px",
  fontWeight: "600",
  margin: "0 0 16px",
} as const;

const text = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#222",
  margin: "0 0 12px",
  whiteSpace: "pre-wrap" as const,
};

const codeStyle = {
  fontSize: "24px",
  letterSpacing: "4px",
  fontWeight: "700",
  margin: "0 0 16px",
} as const;

const link = {
  color: "#0b57d0",
  textDecoration: "underline",
} as const;
