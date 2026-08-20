import type { DemoBlockContext, DemoProfile } from "./types";
import type { SerializedDemoProfile } from "./serialized-profile.schema";

function buildMockContext(profile: DemoProfile): DemoBlockContext {
  const media: DemoBlockContext["media"] = {};
  for (const file of profile.mediaFiles) {
    media[file.key] = { id: `mock-media-${file.key}`, url: file.url };
  }

  const formTemplates: DemoBlockContext["formTemplates"] = {};
  for (const form of profile.sampleData.formTemplates) {
    formTemplates[form.slug] = { id: `mock-form-${form.slug}`, slug: form.slug };
  }

  const faqSets: DemoBlockContext["faqSets"] = {};
  for (const set of profile.sampleData.faqSets) {
    faqSets[set.slug] = `mock-faq-${set.slug}`;
  }

  const galleries: DemoBlockContext["galleries"] = {};
  for (const gallery of profile.sampleData.galleries) {
    galleries[gallery.slug] = `mock-gallery-${gallery.slug}`;
  }

  const testimonialCollections: DemoBlockContext["testimonialCollections"] = {};
  for (const col of profile.sampleData.testimonialCollections) {
    testimonialCollections[col.slug] = `mock-testimonial-${col.slug}`;
  }

  return { media, formTemplates, faqSets, galleries, testimonialCollections };
}

/** Convert a code-defined DemoProfile into JSON-serializable form. */
export function materializeDemoProfile(profile: DemoProfile): SerializedDemoProfile {
  const ctx = buildMockContext(profile);
  return {
    meta: { ...profile.meta },
    company: { ...profile.company },
    theme: { ...profile.theme },
    header: profile.header as unknown as Record<string, unknown>,
    footer: profile.footer as unknown as Record<string, unknown>,
    mediaFiles: profile.mediaFiles.map((f) => ({ ...f })),
    sampleData: JSON.parse(JSON.stringify(profile.sampleData)) as SerializedDemoProfile["sampleData"],
    pages: profile.pages.map((page) => ({
      slug: page.slug,
      templateKey: page.templateKey,
      title: page.title,
      excerpt: page.excerpt,
      blocks: page.buildBlocks(ctx),
    })),
  };
}
