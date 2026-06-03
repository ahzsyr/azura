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
      <div className="prd-services__grid">
        {cards.map((card) => (
          <article key={card.title} className="prd-services__card">
            <span className="prd-services__icon" aria-hidden="true">
              {card.icon}
            </span>
            <h3 className="prd-services__title">{card.title}</h3>
            <p className="prd-services__desc">{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
