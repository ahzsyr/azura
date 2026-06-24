import { cn } from "@/lib/utils";
import { SectionAtmosphere } from "@/components/marketing/hero-atmosphere";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";

type SectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  variant?: "default" | "muted" | "dark" | "solid";
  /** Disable floating orbs (forms, readable content). */
  suppressAtmosphere?: boolean;
};

export function Section({
  children,
  className,
  id,
  variant = "default",
  suppressAtmosphere = false,
}: SectionProps) {
  const showAtmosphere = !suppressAtmosphere && variant !== "dark" && variant !== "solid";

  return (
    <section
      id={id}
      className={cn(
        "section-padding relative overflow-hidden",
        variant === "muted" && "bg-muted/40",
        variant === "solid" && "az-section--solid bg-card/95",
        variant === "dark" && "bg-foreground text-background",
        className
      )}
    >
      {showAtmosphere ? <SectionAtmosphere /> : null}
      <div className="container-premium relative z-[1]">{children}</div>
    </section>
  );
}

export { SectionHeader } from "@/components/marketing/section-header";
export type { SectionHeaderProps } from "@/components/marketing/section-header";

export function PageHero({
  title,
  subtitle,
  image = DEFAULT_MEDIA_PLACEHOLDER,
  titleProps,
}: {
  title: string;
  subtitle?: string;
  image?: string;
  titleProps?: React.HTMLAttributes<HTMLHeadingElement>;
}) {
  return (
    <div className="relative flex min-h-[40vh] items-center justify-center overflow-hidden md:min-h-[50vh]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="hero-overlay absolute inset-0" />
      <div className="container-premium relative z-10 py-20 text-center text-white">
        <h1
          className="font-heading text-4xl font-semibold md:text-5xl lg:text-6xl"
          data-hero-title
          data-text-effect-target="heading"
          {...titleProps}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
