import "server-only";

import type { ReactNode } from "react";
import { render } from "@react-email/render";

export type RenderedEmail = {
  html: string;
  text?: string;
};

export async function renderEmail(element: ReactNode): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return { html, text };
}
