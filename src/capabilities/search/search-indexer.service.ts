/**
 * Legacy facade — delegates to Search Framework indexer.
 * @see @/capabilities/search/engine
 */
import { frameworkSearchIndexer } from "@/capabilities/search/engine";

export const searchIndexer = frameworkSearchIndexer;
