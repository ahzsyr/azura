import type { ContactTheme } from "@/features/builder/blocks/contact/schemas/common";
import type { ContactMapProps } from "@/features/builder/blocks/contact/schemas/map";
import type { ContactLocationProps } from "@/features/builder/blocks/contact/schemas/location";
import type { ContactPhoneProps } from "@/features/builder/blocks/contact/schemas/phone";
import type { ContactSocialProps } from "@/features/builder/blocks/contact/schemas/social";
import { ContactMapView } from "./contact-map-view";
import { ContactLocationView } from "./contact-location-view";
import { ContactPhoneView } from "./contact-phone-view";
import { ContactSocialView } from "./contact-social-view";

type ThemeOpt = { theme?: ContactTheme | null };

export function ContactMapBlockRenderer({
  props,
  theme,
}: { props: Record<string, unknown> } & ThemeOpt) {
  return <ContactMapView props={props as unknown as ContactMapProps} theme={theme} />;
}

export function ContactLocationBlockRenderer({
  props,
  theme,
}: { props: Record<string, unknown> } & ThemeOpt) {
  return <ContactLocationView props={props as unknown as ContactLocationProps} theme={theme} />;
}

export function ContactPhoneBlockRenderer({
  props,
  theme,
}: { props: Record<string, unknown> } & ThemeOpt) {
  return <ContactPhoneView props={props as unknown as ContactPhoneProps} theme={theme} />;
}

export function ContactSocialBlockRenderer({
  props,
  theme,
}: { props: Record<string, unknown> } & ThemeOpt) {
  return <ContactSocialView props={props as unknown as ContactSocialProps} theme={theme} />;
}
