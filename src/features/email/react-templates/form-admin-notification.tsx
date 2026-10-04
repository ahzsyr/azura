import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { renderEmail, type RenderedEmail } from "@/features/email/react-templates/render-email";

export type FormAdminNotificationProps = {
  templateName: string;
  reference: string;
  submissionId: string;
  score: number;
  rows: Array<{ key: string; value: ReactNode }>;
};

function FormAdminNotificationEmail({
  templateName,
  reference,
  submissionId,
  score,
  rows,
}: FormAdminNotificationProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New submission ${reference}: ${templateName}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h2" style={heading}>
            New form submission: {templateName}
          </Heading>
          <Text style={text}>
            <strong>Reference:</strong> {reference}
          </Text>
          <Text style={text}>
            Submission ID: {submissionId} | Score: {score}
          </Text>
          <Section style={table}>
            {rows.map((row) => (
              <Section key={row.key} style={tableRow}>
                <Text style={cellKey}>
                  <strong>{row.key}</strong>
                </Text>
                <Text style={cellValue}>{row.value}</Text>
              </Section>
            ))}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function formatCell(value: unknown): ReactNode {
  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const toAbsolute = (url: string) => {
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/") && siteOrigin) return `${siteOrigin}${url}`;
    return url;
  };

  if (value == null || value === "") return "";
  if (typeof value === "string") {
    if (
      value.startsWith("/uploads/") ||
      /^https?:\/\//i.test(value) ||
      /\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|zip)(\?|#|$)/i.test(value)
    ) {
      const href = toAbsolute(value);
      const name = value.split("/").pop()?.split("?")[0] || "Attachment";
      return (
        <Link href={href} style={link}>
          {name}
        </Link>
      );
    }
    return value;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const url =
      (typeof record.url === "string" && record.url) ||
      (typeof record.href === "string" && record.href) ||
      null;
    if (url) {
      const href = toAbsolute(url);
      const name =
        (typeof record.name === "string" && record.name) ||
        (typeof record.filename === "string" && record.filename) ||
        url.split("/").pop() ||
        "Attachment";
      return (
        <Link href={href} style={link}>
          {name}
        </Link>
      );
    }
  }
  if (Array.isArray(value)) {
    return (
      <>
        {value.map((entry, index) => (
          <span key={index}>
            {index > 0 ? <br /> : null}
            {formatCell(entry)}
          </span>
        ))}
      </>
    );
  }
  return String(value);
}

export async function renderFormAdminNotification(input: {
  templateName: string;
  reference: string;
  submissionId: string;
  score: number;
  payload: Record<string, unknown>;
}): Promise<RenderedEmail> {
  const rows = Object.entries(input.payload).map(([key, value]) => ({
    key,
    value: formatCell(value),
  }));
  return renderEmail(
    <FormAdminNotificationEmail
      templateName={input.templateName}
      reference={input.reference}
      submissionId={input.submissionId}
      score={input.score}
      rows={rows}
    />,
  );
}

const body = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
} as const;

const container = {
  margin: "0 auto",
  padding: "20px 0",
  maxWidth: "640px",
} as const;

const heading = {
  fontSize: "20px",
  lineHeight: "28px",
  color: "#111827",
} as const;

const text = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#111827",
} as const;

const table = {
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  overflow: "hidden",
} as const;

const tableRow = {
  borderBottom: "1px solid #e5e7eb",
  padding: "8px 12px",
} as const;

const cellKey = {
  ...text,
  margin: "0 0 4px",
} as const;

const cellValue = {
  ...text,
  margin: 0,
} as const;

const link = {
  color: "#2563eb",
  textDecoration: "underline",
} as const;
