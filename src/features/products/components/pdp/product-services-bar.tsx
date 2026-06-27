"use client";

import { ProductPdpOverflowLayout } from "./product-pdp-overflow-layout";

type ServiceCard = {
  title: string;
  description: string;
  icon: string;
};

type Props = {
  cards: ServiceCard[];
};

export function ProductServicesBar({ cards }: Props) {
  if (cards.length === 0) return null;

  return (
    <section className="prd-services" aria-label="Store policies">
      <ProductPdpOverflowLayout
        block="servicesBar"
        items={cards}
        getItemKey={(card) => card.title}
        gridClassName="prd-services__grid"
        columns={3}
        sliderItemClassName="prd-services__card prd-overflow__service-slide"
        sliderSnapMinWidth="min(18rem, 82vw)"
        renderItem={(card) => (
          <article className="prd-services__card">
            <span className="prd-services__icon" aria-hidden="true">
              {card.icon}
            </span>
            <h3 className="prd-services__title">{card.title}</h3>
            <p className="prd-services__desc">{card.description}</p>
          </article>
        )}
      />
    </section>
  );
}
