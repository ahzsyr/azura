"use client";

import { ProductPdpOverflowLayout } from "./product-pdp-overflow-layout";

type LinkGroup = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

type Props = {
  groups: LinkGroup[];
};

export function ProductCrossLinks({ groups }: Props) {
  const visible = groups.filter((g) => g.links.length > 0);
  if (visible.length === 0) return null;

  return (
    <section className="prd-cross" aria-label="Related navigation">
      <ProductPdpOverflowLayout
        block="crossLinks"
        items={visible}
        getItemKey={(group) => group.title}
        gridClassName="prd-cross__grid"
        columns={3}
        sliderItemClassName="prd-cross__col prd-overflow__cross-slide"
        accordionRender={(group) => ({
          title: group.title,
          body: (
            <ul className="prd-cross__list">
              {group.links.map((link) => (
                <li key={`${group.title}-${link.href}-${link.label}`}>
                  <a href={link.href} className="prd-cross__link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ),
        })}
        renderItem={(group) => (
          <div className="prd-cross__col">
            <h3 className="prd-cross__title">{group.title}</h3>
            <ul className="prd-cross__list">
              {group.links.map((link) => (
                <li key={`${group.title}-${link.href}-${link.label}`}>
                  <a href={link.href} className="prd-cross__link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      />
    </section>
  );
}
