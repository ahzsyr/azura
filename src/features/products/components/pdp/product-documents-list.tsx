import type { ProductDocument } from "../../types";

const TYPE_LABELS: Record<string, string> = {
  datasheet: "Datasheets",
  manual: "User Manuals",
  certificate: "Certificates",
  drawing: "Technical Drawings",
  other: "Other Documents",
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

type Props = { documents: ProductDocument[] };

export function ProductDocumentsList({ documents }: Props) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No documents available.</p>;
  }

  const grouped = documents.reduce<Record<string, ProductDocument[]>>((acc, doc) => {
    const type = doc.type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, docs]) => (
        <section key={type}>
          <h4 className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-3">
            {TYPE_LABELS[type] || type}
          </h4>
          <ul className="space-y-2">
            {docs.map((doc, idx) => (
              <li key={idx}>
                <a
                  href={doc.url || "#"}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  download={doc.download !== false}
                  target={doc.open_in_new ? "_blank" : undefined}
                  rel={doc.open_in_new ? "noopener noreferrer" : undefined}
                >
                  <span className="text-xl" aria-hidden>
                    {doc.icon || "📄"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <strong className="text-sm block truncate">{doc.title || "Document"}</strong>
                    {doc.description ? (
                      <span className="text-xs text-muted-foreground">{doc.description}</span>
                    ) : null}
                  </div>
                  {doc.file_size ? (
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {formatFileSize(doc.file_size)}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}