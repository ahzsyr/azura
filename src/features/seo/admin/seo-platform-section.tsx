import Link from "next/link";

type SeoPlatformSectionProps = {
  title: string;
  layer: string;
  description: string;
  relatedLinks?: Array<{ href: string; label: string }>;
};

export function SeoPlatformSection({
  title,
  layer,
  description,
  relatedLinks = [],
}: SeoPlatformSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{layer}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      </div>
      {relatedLinks.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {relatedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
