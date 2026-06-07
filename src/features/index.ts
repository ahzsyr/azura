/**
 * Feature module registry. Prefer direct imports (`@/features/cms/...`) in app code.
 */
export * as gallery from "./gallery/actions";
export * as faq from "./faq/actions";
export * as testimonials from "./testimonials/actions";
export {
  updateCompanyInfo,
  updateInquiryStatus,
  updateInquiryNotes,
  deleteInquiry,
} from "./catalog/actions";
export { upsertTestimonial, deleteTestimonial } from "./testimonials/actions";
export * as auth from "./auth/guards";
export * as builder from "./builder";
export * as cms from "./cms";
export * as media from "./media";
export * as search from "./search";
export * as searchFramework from "./search-framework";
export * as seo from "./seo";
export * as storage from "./storage";
export * as theme from "./theme";
