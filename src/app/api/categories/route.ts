/**
 * Canonical Categories API — delegates to collections API service during dual-write.
 * Legacy: /api/collections remains as a compatibility alias.
 */
export {
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
} from "@/app/api/collections/route";
