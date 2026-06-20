import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import type { FaqItem } from "@/components/marketing/faq-accordion";
import { getLocalizedField } from "@/lib/utils";
import { productsDataService } from "@/features/products/products-data.service";
import type { Product } from "@/features/products/types";
import { parseProductFaqProps } from "@/features/product-blocks/lib/parse-block-props";
import { ProductFaqSearchable } from "@/features/product-blocks/components/product-faq-searchable";
import { FaqItemsOverflow } from "@/features/builder/components/faq-items-overflow";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

function faqFromProductSections(product: Product, locale: string): FaqItem[] {
  const sections = product.detailed_description ?? [];
  return sections
    .filter((s) => (s.heading || s.text)?.trim())
    .map((s, i) => ({
      id: `section-${i}`,
      questionEn: s.heading,
      questionAr: s.heading,
      answerEn: s.text,
      answerAr: s.text,
    }));
}

function faqFromManualItems(
  items: ReturnType<typeof parseProductFaqProps>["items"],
): FaqItem[] {
  return items.map((item) => ({
    id: item.id,
    questionEn: item.question,
    questionAr: item.question,
    answerEn: item.answer,
    answerAr: item.answer,
  }));
}

export async function ProductFaqBlockRenderer({
  locale,
  props: raw,
  previewMode,
  block,
  overflow,
}: Props) {
  const p = parseProductFaqProps(raw);
  let faqs: FaqItem[] = faqFromManualItems(p.items);

  if (p.source === "product" || p.source === "productSections") {
    const slug = p.productSlug.trim();
    if (slug) {
      const loaded = await productsDataService.getProduct(locale, slug);
      const product = loaded?.product;
      if (product) {
        const productFaq = product.faq;
        if (p.source === "product" && Array.isArray(productFaq) && productFaq.length > 0) {
          faqs = productFaq.map((item, i) => ({
            id: item.id ?? `faq-${i}`,
            questionEn: item.questionEn ?? item.question ?? "",
            questionAr: item.questionAr ?? item.question ?? "",
            answerEn: item.answerEn ?? item.answer ?? "",
            answerAr: item.answerAr ?? item.answer ?? "",
          }));
        } else if (p.source === "productSections") {
          faqs = faqFromProductSections(product, locale);
        }
      }
    }
  }

  if (faqs.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8">
          Add FAQ items or bind to a product.
        </p>
      );
    }
    return null;
  }

  const title = getLocalizedField(p, "title", locale);

  return (
    <div>
      {title ? <SectionHeader title={title} /> : null}
      <div className={title ? "mt-8" : undefined}>
        {block && overflow ? (
          <FaqItemsOverflow faqs={faqs} locale={locale} block={block} overflow={overflow} />
        ) : (
          <ProductFaqSearchable
            faqs={faqs}
            locale={locale}
            searchable={p.searchable}
            layoutMode={p.layoutMode}
          />
        )}
      </div>
    </div>
  );
}
