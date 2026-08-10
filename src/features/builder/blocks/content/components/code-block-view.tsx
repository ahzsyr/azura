import { cn } from "@/lib/utils";
import { highlightCode } from "@/features/builder/blocks/content/lib/highlight-code";
import { CodeCopyButton } from "@/features/builder/blocks/content/components/code-copy-button";

type Props = {
  code: string;
  language: string;
  title?: string;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  highlightLines?: number[];
};

export async function CodeBlockView({
  code,
  language,
  title,
  showLineNumbers = true,
  showCopyButton = true,
  highlightLines = [],
}: Props) {
  if (!code.trim()) return null;

  const html = await highlightCode({ code, language, showLineNumbers, highlightLines });

  return (
    <figure className="cb-code-block">
      {title && <figcaption className="cb-code-block__title text-sm font-medium mb-2">{title}</figcaption>}
      <div className="relative rounded-lg border overflow-hidden">
        {showCopyButton && <CodeCopyButton code={code} />}
        <div
          className={cn("cb-code-block__body overflow-x-auto text-sm [&_.shiki]:m-0 [&_.shiki]:p-4")}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </figure>
  );
}
