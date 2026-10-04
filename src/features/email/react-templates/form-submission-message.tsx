import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import { renderEmail, type RenderedEmail } from "@/features/email/react-templates/render-email";

type FormSubmissionMessageProps = {
  preview: string;
  intro: ReactNode;
  body: string;
};

function FormSubmissionMessageEmail({
  preview,
  intro,
  body: messageBody,
}: FormSubmissionMessageProps) {
  const lines = messageBody.split(/\n/);
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={text}>{intro}</Text>
          {lines.map((line, index) => (
            <Text key={index} style={text}>
              {line || "\u00A0"}
            </Text>
          ))}
        </Container>
      </Body>
    </Html>
  );
}

export async function renderFormSubmissionAdminReply(input: {
  templateName: string;
  body: string;
}): Promise<RenderedEmail> {
  const { html } = await renderEmail(
    <FormSubmissionMessageEmail
      preview={`Re: your message via ${input.templateName}`}
      intro={
        <>
          Re: your message via <strong>{input.templateName}</strong>
        </>
      }
      body={input.body}
    />,
  );
  return { html, text: input.body };
}

export async function renderFormSubmissionForward(input: {
  templateName: string;
  body: string;
}): Promise<RenderedEmail> {
  const { html } = await renderEmail(
    <FormSubmissionMessageEmail
      preview={`Forwarded form submission from ${input.templateName}`}
      intro={
        <>
          Forwarded form submission from <strong>{input.templateName}</strong>
        </>
      }
      body={input.body}
    />,
  );
  return { html, text: input.body };
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

const text = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#111827",
  margin: "0 0 8px",
} as const;
