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
      <div className="prd-cross__grid">
        {visible.map((group) => (
          <div key={group.title} className="prd-cross__col">
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
        ))}
      </div>
    </section>
  );
}
