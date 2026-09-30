"use client";

import { Download, ExternalLink, FileText } from "lucide-react";
import type { Product, ProductDocument } from "@/features/products/types";
import type { PdpLabels } from "@/features/products/pdp/load-pdp-labels";
import { sectionVideos, sectionsForTab } from "@/features/products/lib/unifi-product-sections";
import { filterBySelectedVariations, type VariationSelection } from "@/features/products/lib/product-variation-media";

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

function fileKind(doc: ProductDocument): "external" | "download" | "file" {
  if (doc.open_in_new !== false) return "external";
  if (doc.download === false) return "file";
  return "download";
}

function FileKindIcon({ kind }: { kind: ReturnType<typeof fileKind> }) {
  const className = "unifi-file-row__action";
  if (kind === "external") return <ExternalLink className={className} aria-hidden />;
  if (kind === "download") return <Download className={className} aria-hidden />;
  return <FileText className={className} aria-hidden />;
}

type Props = {
  product: Product;
  labels: PdpLabels;
  showDocuments: boolean;
  tab?: string;
  selectedVariations?: VariationSelection;
};

export function UniFiInstallationPanel({
  product,
  labels,
  showDocuments,
  tab = "installation",
  selectedVariations,
}: Props) {
  const docs = showDocuments ? (product.documents ?? []).filter((doc) => doc.url || doc.title) : [];
  const videos = filterBySelectedVariations(
    sectionVideos(sectionsForTab(product, tab)),
    selectedVariations,
    product,
  );

  if (docs.length === 0 && videos.length === 0) {
    return <p className="unifi-empty">{labels.noDocuments || "No installation resources available."}</p>;
  }

  const grouped = docs.reduce<Record<string, ProductDocument[]>>((acc, doc) => {
    const type = doc.type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});
  const groups = Object.entries(grouped);
  const showGroupHeadings = groups.length > 1;

  return (
    <div className="unifi-installation">
      {videos.map((video, index) => (
        <div
          key={`${JSON.stringify(selectedVariations ?? {})}:${video.url ?? index}`}
          className="unifi-installation__stage"
        >
          <video
            className="unifi-installation__video"
            src={video.url}
            poster={video.poster}
            controls
            playsInline
            preload="metadata"
          />
        </div>
      ))}
      {docs.length > 0 ? (
        <div className="unifi-installation__docs">
          {groups.map(([type, typeDocs]) => (
            <section key={type} className="unifi-installation__group">
              {showGroupHeadings ? (
                <h4 className="unifi-installation__group-title">{TYPE_LABELS[type] || type}</h4>
              ) : null}
              <ul className="unifi-installation__list">
                {typeDocs.map((doc, idx) => {
                  const kind = fileKind(doc);
                  const size = formatFileSize(doc.file_size);
                  const openInNew = doc.open_in_new !== false;
                  return (
                    <li key={doc.url ?? `${doc.title}-${idx}`}>
                      <a
                        href={doc.url || "#"}
                        className="unifi-file-row"
                        download={doc.download !== false && !openInNew ? true : undefined}
                        target={openInNew ? "_blank" : undefined}
                        rel={openInNew ? "noopener noreferrer" : undefined}
                      >
                        <FileText className="unifi-file-row__icon" aria-hidden />
                        <span className="unifi-file-row__body">
                          <span className="unifi-file-row__title">{doc.title || "Installation guide"}</span>
                          {size ? <span className="unifi-file-row__size">{size}</span> : null}
                        </span>
                        <FileKindIcon kind={kind} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
