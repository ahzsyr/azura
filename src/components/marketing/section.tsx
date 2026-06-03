import { cn } from "@/lib/utils";
import { SectionAtmosphere } from "@/components/marketing/hero-atmosphere";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";

type SectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  variant?: "default" | "muted" | "dark";
};

export function Section({ children, className, id, variant = "default" }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "section-padding relative overflow-hidden",
        variant === "muted" && "bg-muted/40",
        variant === "dark" && "bg-foreground text-background",
        className
      )}
    >
      {variant !== "dark" ? <SectionAtmosphere /> : null}
      <div className="container-premium relative z-[1]">{children}</div>
    </section>
  );
}

export function SectionHeader({
  badge,
  title,
  subtitle,
  align = "center",
  dark = false,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "start";
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-12 md:mb-16",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"
      )}
    >
      {badge && (
        <span
          className={cn(
            "az-hero-badge mb-4 text-xs font-medium uppercase tracking-wider",
            dark ? "text-accent" : "text-primary"
          )}
        >
          {badge}
        </span>
      )}
      <h2
        className={cn(
          "font-heading text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl",
          dark ? "text-background" : "text-foreground"
        )}
      >
        {title}
      </h2>
      <div className={cn("gold-divider my-4", align === "center" && "mx-auto")} />
      {subtitle && (
        <p
          className={cn(
            "text-base leading-relaxed md:text-lg",
            dark ? "text-background/80" : "text-muted-foreground"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function PageHero({
  title,
  subtitle,
  image = DEFAULT_MEDIA_PLACEHOLDER,
}: {
  title: string;
  subtitle?: string;
  image?: string;
}) {
  return (
    <div className="relative flex min-h-[40vh] items-center justify-center overflow-hidden md:min-h-[50vh]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="hero-overlay absolute inset-0" />
      <div className="container-premium relative z-10 py-20 text-center text-white">
        <h1 className="font-heading text-4xl font-semibold md:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
