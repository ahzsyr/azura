import { escapeXml } from "@/lib/xml/escape-xml";
import { getPublicBrandName } from "@/config/site";
import { GOOGLE_SHOPPING_FEED_PATH } from "./google-shopping-feed.types";
import type { GoogleShoppingFeedItem } from "./google-shopping-feed.types";

export { GOOGLE_SHOPPING_FEED_PATH };

/**
 * Dumb XML serialization of already-resolved Google Shopping feed items.
 * Does not decide eligibility, currency, identifiers, or shipping.
 */
export function formatGoogleShoppingFeedXml(
  items: GoogleShoppingFeedItem[],
  options: { siteOrigin: string; title?: string; description?: string },
): string {
  const siteOrigin = options.siteOrigin.replace(/\/$/, "");
  const title = options.title ?? `${getPublicBrandName()} Google Shopping Feed`;
  const description =
    options.description ?? "Product feed for Google Merchant Center";
  const feedLink = `${siteOrigin}${GOOGLE_SHOPPING_FEED_PATH}`;

  const itemXml = items
    .map((item) => {
      const lines = [
        "    <item>",
        `      <g:id>${escapeXml(item.id)}</g:id>`,
        `      <g:title>${escapeXml(item.title)}</g:title>`,
        `      <g:description>${escapeXml(item.description)}</g:description>`,
        `      <g:link>${escapeXml(item.link)}</g:link>`,
        `      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>`,
      ];

      for (const extra of item.additionalImageLinks ?? []) {
        lines.push(`      <g:additional_image_link>${escapeXml(extra)}</g:additional_image_link>`);
      }

      lines.push(`      <g:availability>${escapeXml(item.availability)}</g:availability>`);
      if (item.availabilityDate) {
        lines.push(
          `      <g:availability_date>${escapeXml(item.availabilityDate)}</g:availability_date>`,
        );
      }
      lines.push(`      <g:price>${escapeXml(item.price)}</g:price>`);

      if (item.salePrice) {
        lines.push(`      <g:sale_price>${escapeXml(item.salePrice)}</g:sale_price>`);
      }

      lines.push(
        `      <g:condition>${escapeXml(item.condition)}</g:condition>`,
        `      <g:brand>${escapeXml(item.brand)}</g:brand>`,
        `      <g:identifier_exists>${escapeXml(item.identifierExists)}</g:identifier_exists>`,
      );

      if (item.gtin) {
        lines.push(`      <g:gtin>${escapeXml(item.gtin)}</g:gtin>`);
      }
      if (item.mpn) {
        lines.push(`      <g:mpn>${escapeXml(item.mpn)}</g:mpn>`);
      }
      if (item.googleProductCategory) {
        lines.push(
          `      <g:google_product_category>${escapeXml(item.googleProductCategory)}</g:google_product_category>`,
        );
      }
      if (item.productType) {
        lines.push(`      <g:product_type>${escapeXml(item.productType)}</g:product_type>`);
      }
      if (item.itemGroupId) {
        lines.push(`      <g:item_group_id>${escapeXml(item.itemGroupId)}</g:item_group_id>`);
      }
      if (item.color) {
        lines.push(`      <g:color>${escapeXml(item.color)}</g:color>`);
      }
      if (item.size) {
        lines.push(`      <g:size>${escapeXml(item.size)}</g:size>`);
      }
      if (item.customLabel0) {
        lines.push(`      <g:custom_label_0>${escapeXml(item.customLabel0)}</g:custom_label_0>`);
      }
      if (item.shipping) {
        lines.push(
          "      <g:shipping>",
          `        <g:country>${escapeXml(item.shipping.country)}</g:country>`,
          `        <g:service>${escapeXml(item.shipping.service)}</g:service>`,
          `        <g:price>${escapeXml(item.shipping.price)}</g:price>`,
          "      </g:shipping>",
        );
      }

      lines.push("    </item>");
      return lines.join("\n");
    })
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `  <channel>`,
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(feedLink)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    itemXml,
    `  </channel>`,
    `</rss>`,
    ``,
  ].join("\n");
}
