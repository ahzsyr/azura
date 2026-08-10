export { deepEqual } from "./deep-equal";
export { applyPatch } from "./apply-patch";
export {
  computePatch,
  isEmptyPatch,
  type ComputePatchOptions,
} from "./compute-patch";
export {
  flattenPatchPaths,
  getChangedSections,
  countPatchFields,
  type SectionMapEntry,
} from "./patch-paths";
export {
  productPatchAffectsSearch,
  productPatchAffectsListing,
  productPatchAffectsCollections,
  cmsPatchAffectsSearch,
  cmsPatchAffectsPublicPage,
  cmsPatchAffectsTranslations,
  cmsPatchAffectsRevision,
  postPatchAffectsSearch,
  postPatchAffectsPublicPage,
  postPatchAffectsTranslations,
  postPatchAffectsRevision,
  contentPatchAffectsSearch,
  contentPatchAffectsPublicPage,
  contentPatchAffectsTranslations,
  contentPatchAffectsRevision,
} from "./revalidation-map";
