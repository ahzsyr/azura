import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";

type Props = {
  config: ResolvedProductBuyNow;
  href: string;
  className?: string;
};

export function ProductBuyNowCardButton({ config, href, className = "" }: Props) {
  const classes = [
    "pl-card__buy-now",
    config.variant === "outline" ? "pl-card__buy-now--outline" : "",
    config.size === "lg" ? "pl-card__buy-now--lg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      href={href}
      className={classes}
      data-buy-now-card
      target={config.openInNewTab ? "_blank" : undefined}
      rel={config.openInNewTab ? "noopener noreferrer" : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {config.label}
    </a>
  );
}
