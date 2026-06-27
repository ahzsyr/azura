"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TestimonialAdmin } from "@/features/testimonials/types";
import { addTestimonialToCollection } from "@/features/testimonials/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  collectionId: string;
  memberIds: string[];
  availableTestimonials: TestimonialAdmin[];
};

export function TestimonialAddToCollectionForm({
  collectionId,
  memberIds,
  availableTestimonials,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const pool = availableTestimonials.filter((t) => !memberIds.includes(t.id));

  const handleAdd = (testimonialId: string) => {
    startTransition(async () => {
      await addTestimonialToCollection(collectionId, testimonialId);
      router.refresh();
    });
  };

  if (pool.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All testimonials are already in this collection, or none exist yet. Add testimonials from the hub&apos;s
        &quot;Add testimonial&quot; tab first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Add existing testimonial</Label>
        <select
          className="flex h-9 w-full rounded-md border px-2 text-sm"
          defaultValue=""
          disabled={pending}
          onChange={(e) => {
            const id = e.target.value;
            if (id) handleAdd(id);
            e.target.value = "";
          }}
        >
          <option value="">Select a testimonial…</option>
          {pool.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.location}
              {!t.isPublished ? " [Hidden]" : ""}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">Choosing an item adds it immediately to this collection.</p>
      {pending && <Button disabled>Adding…</Button>}
    </div>
  );
}
