import Link from "next/link";
import { cn } from "@/lib/utils";

type AdminListProps = {
  children: React.ReactNode;
  className?: string;
};

export function AdminList({ children, className }: AdminListProps) {
  return (
    <div
      className={cn(
        "admin-card overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

type AdminListRowProps = {
  children: React.ReactNode;
  className?: string;
};

export function AdminListRow({ children, className }: AdminListRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50",
        className
      )}
    >
      {children}
    </div>
  );
}

type AdminListTitleProps = {
  children: React.ReactNode;
  href?: string;
  className?: string;
};

export function AdminListTitle({ children, href, className }: AdminListTitleProps) {
  const classes = cn("font-semibold text-foreground hover:text-primary", className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <p className={classes}>{children}</p>;
}

type AdminListMetaProps = {
  children: React.ReactNode;
  className?: string;
};

export function AdminListMeta({ children, className }: AdminListMetaProps) {
  return (
    <p className={cn("truncate text-sm text-[var(--admin-label)]", className)}>{children}</p>
  );
}

export function AdminListMetaSmall({ children, className }: AdminListMetaProps) {
  return (
    <p className={cn("mt-0.5 text-xs text-muted-foreground", className)}>{children}</p>
  );
}
