import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import { renderEmail, type RenderedEmail } from "@/features/email/react-templates/render-email";

export type FormSubmitterReplyProps = {
  templateName: string;
  reference?: string | null;
};

function FormSubmitterReplyEmail({ templateName, reference }: FormSubmitterReplyProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {reference ? `We received your message (${reference})` : "We received your message"}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={text}>
            Thank you for contacting us via <strong>{templateName}</strong>. We will get back to you
            soon.
          </Text>
          {reference ? (
            <Text style={text}>
              Your reference number is <strong>{reference}</strong>. Please keep it for your records.
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}

export async function renderFormSubmitterReply(
  props: FormSubmitterReplyProps,
): Promise<RenderedEmail> {
  return renderEmail(<FormSubmitterReplyEmail {...props} />);
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
} as const;
