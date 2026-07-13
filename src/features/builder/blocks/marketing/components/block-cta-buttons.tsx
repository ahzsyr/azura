import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaButton = {
  label: string;
  href: string;
  variant?: "default" | "outline" | "ghost" | "gold" | "secondary";
};

type Props = {
  primary: CtaButton;
  secondary?: CtaButton;
  className?: string;
  dark?: boolean;
};

export function BlockCtaButtons({ primary, secondary, className, dark }: Props) {
  if (!primary.label && !secondary?.label) return null;

  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {primary.label && primary.href && (
        <Button asChild size="lg" variant={primary.variant ?? "gold"}>
          <Link href={primary.href}>{primary.label}</Link>
        </Button>
      )}
      {secondary?.label && secondary.href && (
        <Button
          asChild
          size="lg"
          variant={secondary.variant ?? "outline"}
          className={dark ? "border-white/30 bg-white/10 text-white hover:bg-white/20" : undefined}
        >
          <Link href={secondary.href}>{secondary.label}</Link>
        </Button>
      )}
    </div>
  );
}
