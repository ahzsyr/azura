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
} from "@/features/builder/blocks/conversion/schemas/conversion-blocks";
import { StickyCtaView } from "@/features/builder/blocks/conversion/components/sticky-cta-view";
import { DynamicFormView } from "@/features/builder/blocks/conversion/components/dynamic-form-view";
import { NewsletterSignupView } from "@/features/builder/blocks/conversion/components/newsletter-signup-view";
import { DownloadGateView } from "@/features/builder/blocks/conversion/components/download-gate-view";
import { Section, SectionHeader } from "@/components/marketing/section";
import {
  resolveItemField,
  resolveTopLevelField,
} from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
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

function buildTrustItems(
  props: Record<string, unknown>,
  locale: string,
): { id: string; label: string }[] | undefined {
  const fromArray = props.trustItems;
  if (Array.isArray(fromArray)) {
    // Explicit trustItems array means author-controlled list (may be empty).
    return fromArray
      .map((raw, index) => {
        const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
        const label = resolveItemField(row, "label", locale).trim();
        if (!label) return null;
        return {
          id: typeof row.id === "string" && row.id ? row.id : `trust-${index + 1}`,
          label,
        };
      })
      .filter((item): item is { id: string; label: string } => Boolean(item));
  }

  // Legacy trustItem1/2/3 fallback for existing block props
  const legacy = ["trustItem1", "trustItem2", "trustItem3"]
    .map((field) => resolveTopLevelField(props, field, locale))
    .filter((label): label is string => Boolean(label))
    .map((label, index) => ({ id: `trust-${index + 1}`, label }));
  return legacy.length ? legacy : undefined;
}

/**
 * Build FXS experience from Contact/Lead/Multi-step block settings.
 * Localized copy must use `loc` (EntityTranslation-aware), same as SectionHeader title —
 * not props-only resolvers that miss published translation rows.
 */
function buildExperienceFromProps(
  raw: Record<string, unknown>,
  parsed: {
    layout?: string;
    columnRatio?: "50/50" | "40/60" | "60/40" | "30/70" | "70/30";
    sectionStyle?: "card" | "flat" | "bordered" | "filled" | "collapsible" | "accordion";
    heroEstimatedMinutes?: number;
  },
  locale: string,
  loc: (key: string) => string,
) {
  const trustItems = buildTrustItems(raw, locale);
  // Prefer EntityTranslation-aware `loc`. Empty strings stay empty — never fall back
  // to defaults or stale copy when the editor cleared the field.
  const heroTitle = loc("heroTitle").trim();
  const heroDescription = loc("heroDescription").trim();
  const formSectionTitle = loc("formSectionTitle").trim();

  return {
    layoutMode: parsed.layout as
      | "stacked"
      | "inline"
      | "twoColumn"
      | "responsiveGrid"
      | "sectionCard"
      | "split"
      | "wizard"
      | "conversational"
      | "sidebar"
      | "review"
      | undefined,
    columnRatio: parsed.columnRatio,
    sectionStyle: parsed.sectionStyle,
    title: heroTitle || undefined,
    description: heroDescription || undefined,
    estimatedMinutes: parsed.heroEstimatedMinutes,
    trustItems,
    // Keep "" when cleared so DynamicFormView can distinguish "unset" vs "cleared".
    formSectionTitle,
  };
}

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
      <div className="w-full max-w-5xl xl:max-w-6xl">
        <DynamicFormView
          templateId={p.templateId}
          definition={template.definition}
          definitionRaw={template.definitionRaw}
          locale={locale}
          blockType="leadForm"
          blockId={blockId}
          successMessage={resolveTopLevelField(p as Record<string, unknown>, "successMessage", locale)}
          experience={buildExperienceFromProps(props, p, locale, loc)}
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
      <div className="w-full max-w-5xl xl:max-w-6xl">
        <DynamicFormView
          templateId={p.templateId}
          definition={template.definition}
          definitionRaw={template.definitionRaw}
          locale={locale}
          blockType="contactFormBuilder"
          blockId={blockId}
          successMessage={resolveTopLevelField(p as Record<string, unknown>, "successMessage", locale)}
          appearance={p}
          experience={buildExperienceFromProps(props, p, locale, loc)}
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
      <div className="w-full max-w-4xl xl:max-w-5xl">
        <DynamicFormView
          templateId={p.templateId}
          definition={template.definition}
          definitionRaw={template.definitionRaw}
          locale={locale}
          blockType="multiStepForm"
          blockId={blockId}
          multiStep
          saveAndResume={p.saveAndResume}
          draftToken={draftToken}
          allowBack={p.allowBack}
          progressStyle={p.progressStyle}
          successMessage={resolveTopLevelField(p as Record<string, unknown>, "successMessage", locale)}
          experience={buildExperienceFromProps(props, p, locale, loc)}
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
