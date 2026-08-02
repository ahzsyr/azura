import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import "./advanced-rich-text.css";

type Props = {
  source: string;
  allowGfm?: boolean;
  prose?: boolean;
  className?: string;
};

export function MarkdownContent({ source, allowGfm = true, prose = true, className }: Props) {
  if (!source.trim()) return null;

  return (
    <div className={cn(prose && "prose max-w-none cb-advanced-richtext", !prose && "cb-advanced-richtext", className)}>
      <Markdown remarkPlugins={allowGfm ? [remarkGfm] : []}>{source}</Markdown>
    </div>
  );
}
