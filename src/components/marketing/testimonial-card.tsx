"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalizedField } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TestimonialCardVariant } from "@/features/testimonials/types";

export type TestimonialCardData = {
  id: string;
  name: string;
  location: string;
  rating: number;
  contentEn: string;
  contentAr: string;
  imageUrl: string | null;
  videoUrl?: string | null;
};

export function TestimonialCard({
  testimonial,
  locale,
  variant = "default",
}: {
  testimonial: TestimonialCardData;
  locale: string;
  variant?: TestimonialCardVariant;
}) {
  const content = getLocalizedField(testimonial, "content", locale);

  const stars = (
    <div className={cn("flex gap-1", variant === "minimal" && "justify-center")}>
      {Array.from({ length: testimonial.rating }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
      ))}
    </div>
  );

  const avatar = testimonial.imageUrl ? (
    <Image
      src={testimonial.imageUrl}
      alt={testimonial.name}
      width={variant === "featured" ? 56 : 48}
      height={variant === "featured" ? 56 : 48}
      className={cn(
        "rounded-full object-cover",
        variant === "featured" ? "h-14 w-14" : "h-12 w-12",
        variant === "compact" && "h-10 w-10"
      )}
    />
  ) : (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        variant === "featured" ? "h-14 w-14 text-base" : "h-12 w-12 text-sm",
        variant === "compact" && "h-10 w-10 text-xs"
      )}
    >
      {testimonial.name.charAt(0)}
    </div>
  );

  const author = (
    <div className={cn("flex items-center gap-3", variant === "minimal" && "flex-col text-center")}>
      {avatar}
      <div className={variant === "minimal" ? "text-center" : undefined}>
        <p className={cn("font-medium", variant === "featured" && "text-lg")}>{testimonial.name}</p>
        <p className="text-xs text-muted-foreground">{testimonial.location}</p>
      </div>
    </div>
  );

  if (variant === "minimal") {
    return (
      <div className="flex flex-col items-center px-4 py-6 text-center">
        {stars}
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">&ldquo;{content}&rdquo;</p>
        <div className="mt-6">{author}</div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col p-4">
          {stars}
          <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-4">&ldquo;{content}&rdquo;</p>
          <div className="mt-4">{author}</div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "featured") {
    return (
      <Card className="h-full border-primary/20 bg-primary/5">
        <CardContent className="p-8">
          {stars}
          <p className="mt-4 text-base leading-relaxed">&ldquo;{content}&rdquo;</p>
          <div className="mt-6">{author}</div>
          {testimonial.videoUrl && (
            <div className="mt-6 aspect-video overflow-hidden rounded-lg">
              <iframe
                src={testimonial.videoUrl}
                title={`${testimonial.name} testimonial`}
                className="h-full w-full"
                allowFullScreen
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        {stars}
        <p className="mb-6 mt-4 text-sm leading-relaxed text-muted-foreground">&ldquo;{content}&rdquo;</p>
        {author}
        {testimonial.videoUrl && (
          <div className="mt-4 aspect-video overflow-hidden rounded-lg">
            <iframe
              src={testimonial.videoUrl}
              title={`${testimonial.name} testimonial`}
              className="h-full w-full"
              allowFullScreen
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
