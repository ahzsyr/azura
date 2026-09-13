import type { ResolvedSeoDocument } from "@/features/seo/core/seo-document";
import type { YoastHeadJson } from "./yoast.types";

export function serializeYoastJson(doc: ResolvedSeoDocument): YoastHeadJson {
  const json: YoastHeadJson = {};

  if (doc.title) json.title = doc.title;
  if (doc.description) json.description = doc.description;
  if (doc.canonical) json.canonical = doc.canonical;

  if (doc.robots) {
    json.robots = {
      index: doc.robots.index,
      follow: doc.robots.follow,
    };
    if (doc.robots.maxSnippet) json.robots["max-snippet"] = doc.robots.maxSnippet;
    if (doc.robots.maxImagePreview) json.robots["max-image-preview"] = doc.robots.maxImagePreview;
    if (doc.robots.maxVideoPreview) json.robots["max-video-preview"] = doc.robots.maxVideoPreview;
  }

  const og = doc.openGraph;
  if (og) {
    if (og.locale) json.og_locale = og.locale;
    if (og.type) json.og_type = og.type;
    if (og.title) json.og_title = og.title;
    if (og.description) json.og_description = og.description;
    if (og.url) json.og_url = og.url;
    if (og.siteName) json.og_site_name = og.siteName;
    if (og.images?.length) {
      json.og_image = og.images.map((img) => ({
        url: img.url,
        width: img.width,
        height: img.height,
      }));
    }
    if (og.article?.publisher) json.article_publisher = og.article.publisher;
    if (og.article?.authors?.[0]) json.article_author = og.article.authors[0];
    if (og.article?.publishedTime) json.article_published_time = og.article.publishedTime;
    if (og.article?.modifiedTime) json.article_modified_time = og.article.modifiedTime;
  }

  const tw = doc.twitter;
  if (tw) {
    if (tw.card) json.twitter_card = tw.card;
    if (tw.site) json.twitter_site = tw.site;
    if (tw.creator) json.twitter_creator = tw.creator;
    if (tw.title) json.twitter_title = tw.title;
    if (tw.description) json.twitter_description = tw.description;
    if (tw.image) json.twitter_image = tw.image;
  }

  if (doc.schema) {
    json.schema = doc.schema;
  }

  return json;
}
