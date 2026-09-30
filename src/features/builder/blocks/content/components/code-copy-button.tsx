"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  code: string;
};

export function CodeCopyButton({ code }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <Button type="button" variant="outline" size="sm" className="absolute top-2 end-2 h-7 text-xs" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
