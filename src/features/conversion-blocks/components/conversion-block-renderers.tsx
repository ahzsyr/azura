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
import { resolveTopLevelField } from "@/features/marketing-blocks/lib/resolve-item-locale";
import { safeParseProps } from "@/lib/zod/safe-parse-props";

const DEFAULT_STICKY_CTA = stickyCtaPropsSchema.parse({});
const DEFAULT_LEAD_FORM = leadFormPropsSchema.parse({});
const DEFAULT_CONTACT_FORM = contactFormBuilderPropsSchema.parse({});
const DEFAULT_MULTI_STEP_FORM = multiStepFormPropsSchema.parse({});
const DEFAULT_NEWSLETTER = newsletterSignupPropsSchema.parse({});
const DEFAULT_DOWNLOAD_GATE = downloadGatePropsSchema.parse({});

type RenderCtx = {
  locale: string;
  props: Record<string, unknown>;
  blockId?: string;
  loc: (key: string) => string;
  draftToken?: string;
};

export async function StickyCtaBlockRenderer({ locale, props, loc }: RenderCtx) {
  const p = safeParseProps(stickyCtaPropsSchema, props, DEFAULT_STICKY_CTA, "StickyCtaBlockRenderer");
  return (
    <StickyCtaView
      {...p}
      locale={locale}
    />
  );
}

export async function LeadFormBlockRenderer({ locale, props, blockId, loc }: RenderCtx) {
  const p = safeParseProps(leadFormPropsSchema, props, DEFAULT_LEAD_FORM, "LeadFormBlockRenderer");
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
      {resolveTopLevelField(p as Record<string, unknown>, "incentive", locale) && (
        <p className="text-sm text-primary mb-4">
          {resolveTopLevelField(p as Record<string, unknown>, "incentive", locale)}
        </p>
      )}
      <div className="max-w-lg">
        <DynamicFormView
          templateId={p.templateId}
          definition={template.definition}
          locale={locale}
          blockType="leadForm"
          blockId={blockId}
          successMessage={resolveTopLevelField(p as Record<string, unknown>, "successMessage", locale)}
        />
      </div>
    </Section>
  );
}

export async function ContactFormBuilderBlockRenderer({ locale, props, blockId, loc }: RenderCtx) {
  const p = safeParseProps(
    contactFormBuilderPropsSchema,
    props,
    DEFAULT_CONTACT_FORM,
    "ContactFormBuilderBlockRenderer",
  );
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
          successMessage={resolveTopLevelField(p as Record<string, unknown>, "successMessage", locale)}
        />
      </div>
    </Section>
  );
}

export async function MultiStepFormBlockRenderer({ locale, props, blockId, loc, draftToken }: RenderCtx) {
  const p = safeParseProps(
    multiStepFormPropsSchema,
    props,
    DEFAULT_MULTI_STEP_FORM,
    "MultiStepFormBlockRenderer",
  );
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
          successMessage={resolveTopLevelField(p as Record<string, unknown>, "successMessage", locale)}
        />
      </div>
    </Section>
  );
}

export async function NewsletterSignupBlockRenderer({ locale, props, blockId }: RenderCtx) {
  const p = safeParseProps(
    newsletterSignupPropsSchema,
    props,
    DEFAULT_NEWSLETTER,
    "NewsletterSignupBlockRenderer",
  );
  return (
    <Section>
      <NewsletterSignupView {...p} locale={locale} blockId={blockId} />
    </Section>
  );
}

export async function DownloadGateBlockRenderer({ locale, props, blockId, loc }: RenderCtx) {
  const p = safeParseProps(
    downloadGatePropsSchema,
    props,
    DEFAULT_DOWNLOAD_GATE,
    "DownloadGateBlockRenderer",
  );
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
