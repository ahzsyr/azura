import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import { renderEmail, type RenderedEmail } from "@/features/email/react-templates/render-email";

export type NewsletterConfirmationProps = {
  greeting: string;
  confirmUrl: string;
  useArabicCopy: boolean;
};

function NewsletterConfirmationEmail({
  greeting,
  confirmUrl,
  useArabicCopy,
}: NewsletterConfirmationProps) {
  const preview = useArabicCopy
    ? "تأكيد الاشتراك في النشرة البريدية"
    : "Confirm your newsletter subscription";

  return (
    <Html lang={useArabicCopy ? "ar" : "en"} dir={useArabicCopy ? "rtl" : "ltr"}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={text}>
            {greeting}
            {useArabicCopy ? "،" : ","}
          </Text>
          <Text style={text}>
            {useArabicCopy
              ? "يرجى تأكيد اشتراكك بالنقر على الرابط:"
              : "Please confirm your subscription by clicking the link below:"}
          </Text>
          <Text style={text}>
            <Link href={confirmUrl} style={link}>
              {useArabicCopy ? "تأكيد الاشتراك" : "Confirm subscription"}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderNewsletterConfirmation(
  props: NewsletterConfirmationProps,
): Promise<RenderedEmail> {
  return renderEmail(<NewsletterConfirmationEmail {...props} />);
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

const link = {
  color: "#2563eb",
  textDecoration: "underline",
} as const;
