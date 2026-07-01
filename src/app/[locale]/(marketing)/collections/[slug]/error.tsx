"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CollectionDetailError({ error, reset }: Props) {
  useEffect(() => {
  }, [error]);

  return (
    <div className="col-detail-wrap p-6">
      <h1 className="text-lg font-semibold">Collection page error</h1>
      <p className="text-sm text-muted-foreground mt-2">{error.message || "Unknown error"}</p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground mt-1">Digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        className="mt-4 rounded-md border px-3 py-1.5 text-sm"
        onClick={() => reset()}
      >
        Retry
      </button>
    </div>
  );
}
