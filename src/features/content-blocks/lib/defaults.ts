import { newId } from "@/features/content-blocks/schemas/content-blocks";

export const CONTENT_BLOCK_DEFAULTS = {
  advancedRichText: {
    contentEn: "",
    contentAr: "",
    htmlEn: "<p>Enter your content here...</p>",
    htmlAr: "",
    maxWidth: "reading" as const,
    prose: true,
  },
  markdown: {
    markdownEn: "# Hello\n\nWrite **markdown** here.",
    markdownAr: "",
    prose: true,
    allowGfm: true,
  },
  code: {
    code: 'console.log("Hello, world!");',
    language: "typescript",
    titleEn: "",
    titleAr: "",
    showLineNumbers: true,
    showCopyButton: true,
    highlightLines: [],
  },
  table: {
    titleEn: "Data Table",
    titleAr: "",
    columns: [
      { id: newId("col"), labelEn: "Name", labelAr: "الاسم", sortable: true },
      { id: newId("col"), labelEn: "Value", labelAr: "القيمة", sortable: true },
    ],
    rows: [
      {
        id: newId("row"),
        cells: {},
      },
    ],
    features: {
      sortable: true,
      filterable: false,
      searchable: true,
      paginated: false,
      pageSize: 10,
    },
    striped: true,
    compact: false,
  },
  timeline: {
    titleEn: "Timeline",
    titleAr: "الجدول الزمني",
    layout: "vertical" as const,
    items: [
      {
        id: newId("tl"),
        date: "2024-01-01",
        titleEn: "Project started",
        titleAr: "",
        descriptionEn: "Initial kickoff and planning.",
        descriptionAr: "",
        icon: "🚀",
        imageUrl: "",
        categoryEn: "",
        categoryAr: "",
      },
    ],
  },
  changelog: {
    titleEn: "Changelog",
    titleAr: "سجل التغييرات",
    releases: [
      {
        id: newId("rel"),
        version: "1.0.0",
        date: new Date().toISOString().slice(0, 10),
        status: "released" as const,
        tags: [],
        sections: {
          features: [{ id: newId("e"), textEn: "Initial release", textAr: "" }],
          improvements: [],
          fixes: [],
          breaking: [],
        },
      },
    ],
  },
  comparison: {
    titleEn: "Compare plans",
    titleAr: "قارن الخطط",
    source: "manual" as const,
    layout: "table" as const,
    highlightDifferences: true,
    columns: [
      { id: newId("col"), labelEn: "Basic", labelAr: "أساسي", highlighted: false },
      { id: newId("col"), labelEn: "Pro", labelAr: "احترافي", highlighted: true },
    ],
    rows: [
      {
        id: newId("row"),
        labelEn: "Storage",
        labelAr: "التخزين",
        values: {},
      },
    ],
    contentTypeSlug: "",
    itemIds: [],
    catalogSource: "packages" as const,
    attributeKeys: [],
  },
};
