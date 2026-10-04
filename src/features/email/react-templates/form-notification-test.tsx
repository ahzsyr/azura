import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import { renderEmail, type RenderedEmail } from "@/features/email/react-templates/render-email";

export type FormNotificationTestProps = {
  templateName: string;
};

function FormNotificationTestEmail({ templateName }: FormNotificationTestProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`Test notification: ${templateName}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h2" style={heading}>
            Test form notification
          </Heading>
          <Text style={text}>
            This is a test email for <strong>{templateName}</strong>.
          </Text>
          <Text style={text}>
            If you received this, your email provider and receiver address are working.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderFormNotificationTest(
  props: FormNotificationTestProps,
): Promise<RenderedEmail> {
  return renderEmail(<FormNotificationTestEmail {...props} />);
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

const heading = {
  fontSize: "20px",
  lineHeight: "28px",
  color: "#111827",
} as const;

const text = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#111827",
} as const;
