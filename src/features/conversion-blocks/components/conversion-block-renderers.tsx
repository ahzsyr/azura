import "server-only";

import { getFormTemplateById } from "@/features/forms/form-template.service";
import { prisma } from "@/lib/prisma";
import {
  contactFormBuilderPropsSchema,
  downloadGatePropsSchema,
  leadFormPropsSchema,
  multiStepFormPropsSchema,
  newsletterSignupPropsSchema,
  stickyCtaPropsSchema,
} from "@/features/conversion-blocks/schemas/conversion-blocks";
import { StickyCtaView } from "@/features/conversion-blocks/components/sticky-cta-view";
import { DynamicFormView } from "@/features/conversion-blocks/components/dynamic-form-view";
import { NewsletterSignupView } from "@/features/conversion-blocks/components/newsletter-signup-view";
import { DownloadGateView } from "@/features/conversion-blocks/components/download-gate-view";
import { Section, SectionHeader } from "@/components/marketing/section";

type RenderCtx = {
  locale: string;
  props: Record<string, unknown>;
  blockId?: string;
  loc: (key: string) => string;
  draftToken?: string;
};

export async function StickyCtaBlockRenderer({ locale, props, loc }: RenderCtx) {
  const p = stickyCtaPropsSchema.parse(props);
  return (
    <StickyCtaView
      {...p}
      titleEn={loc("title") || p.titleEn}
      titleAr={loc("title") || p.titleAr}
      messageEn={loc("message") || p.messageEn}
      messageAr={loc("message") || p.messageAr}
      primaryButtonEn={loc("primaryButton") || p.primaryButtonEn}
      primaryButtonAr={loc("primaryButton") || p.primaryButtonAr}
      locale={locale}
    />
  );
}

export async function LeadFormBlockRenderer({ locale, props, blockId, loc }: RenderCtx) {
  const p = leadFormPropsSchema.parse(props);
  if (!p.templateId) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a form template in the block settings.</p>
      </Section>
    );
  }
  const template = await getFormTemplateById(p.templateId);
  if (!template) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Form template not found.</p>
      </Section>
    );
  }
  return (
    <Section>
      {loc("title") ? <SectionHeader title={loc("title")} subtitle={loc("subtitle")} align="start" /> : null}
      {p.incentiveEn && (
        <p className="text-sm text-primary mb-4">{locale.startsWith("ar") ? p.incentiveAr || p.incentiveEn : p.incentiveEn}</p>
      )}
      <div className="max-w-lg">
        <DynamicFormView
          templateId={p.templateId}
          definition={template.definition}
          locale={locale}
          blockType="leadForm"
          blockId={blockId}
          successMessage={locale.startsWith("ar") ? p.successMessageAr : p.successMessageEn}
        />
      </div>
    </Section>
  );
}

export async function ContactFormBuilderBlockRenderer({ locale, props, blockId, loc }: RenderCtx) {
  const p = contactFormBuilderPropsSchema.parse(props);
  if (!p.templateId) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a form template in the block settings.</p>
      </Section>
    );
  }
  const template = await getFormTemplateById(p.templateId);
  if (!template) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Form template not found.</p>
      </Section>
    );
  }
  return (
    <Section>
      {loc("title") ? <SectionHeader title={loc("title")} align="start" /> : null}
      <div className={p.layout === "twoColumn" ? "max-w-3xl" : "max-w-lg"}>
        <DynamicFormView
          templateId={p.templateId}
          definition={template.definition}
          locale={locale}
          blockType="contactFormBuilder"
          blockId={blockId}
          successMessage={locale.startsWith("ar") ? p.successMessageAr : p.successMessageEn}
        />
      </div>
    </Section>
  );
}

export async function MultiStepFormBlockRenderer({ locale, props, blockId, loc, draftToken }: RenderCtx) {
  const p = multiStepFormPropsSchema.parse(props);
  if (!p.templateId) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a multi-step form template.</p>
      </Section>
    );
  }
  const template = await getFormTemplateById(p.templateId);
  if (!template) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Form template not found.</p>
      </Section>
    );
  }
  return (
    <Section>
      {loc("title") ? <SectionHeader title={loc("title")} align="start" /> : null}
      <div className="max-w-xl">
        <DynamicFormView
          templateId={p.templateId}
          definition={template.definition}
          locale={locale}
          blockType="multiStepForm"
          blockId={blockId}
          multiStep
          saveAndResume={p.saveAndResume}
          draftToken={draftToken}
          allowBack={p.allowBack}
          progressStyle={p.progressStyle}
          successMessage={locale.startsWith("ar") ? p.successMessageAr : p.successMessageEn}
        />
      </div>
    </Section>
  );
}

export async function NewsletterSignupBlockRenderer({ locale, props, blockId }: RenderCtx) {
  const p = newsletterSignupPropsSchema.parse(props);
  return (
    <Section>
      <NewsletterSignupView {...p} locale={locale} blockId={blockId} />
    </Section>
  );
}

export async function DownloadGateBlockRenderer({ locale, props, blockId, loc }: RenderCtx) {
  const p = downloadGatePropsSchema.parse(props);
  if (!p.mediaAssetId) {
    return (
      <Section>
        <p className="text-muted-foreground text-sm">Select a file in the block settings.</p>
      </Section>
    );
  }
  const asset = await prisma.mediaAsset.findUnique({ where: { id: p.mediaAssetId } });
  let formDefinition = null;
  if (p.unlockMethod === "formTemplate" && p.templateId) {
    const template = await getFormTemplateById(p.templateId);
    formDefinition = template?.definition ?? null;
  }
  return (
    <Section>
      {loc("title") ? <SectionHeader title={loc("title")} align="start" /> : null}
      <DownloadGateView
        {...p}
        locale={locale}
        blockId={blockId}
        fileName={asset?.filename}
        fileUrl={asset?.url}
        formDefinition={formDefinition}
      />
    </Section>
  );
}
