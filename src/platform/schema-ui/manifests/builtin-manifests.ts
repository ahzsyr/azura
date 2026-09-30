import { DEFAULT_BINDING_CAPABILITIES, DEFAULT_CONTENT_CAPABILITIES, DEFAULT_LAYOUT_CAPABILITIES } from "../schema/capabilities";
import { createManifest } from "../sdk/create-manifest";
import {
  renderAccordionLayout,
  renderCardLayout,
  renderCheckboxBinding,
  renderContainerLayout,
  renderDateBinding,
  renderDividerContent,
  renderEmailBinding,
  renderFileBinding,
  renderGridLayout,
  renderHeadingContent,
  renderHeroLayout,
  renderHiddenBinding,
  renderHtmlContent,
  renderNumberBinding,
  renderParagraphContent,
  renderRadioBinding,
  renderSectionLayout,
  renderSelectBinding,
  renderSpacerContent,
  renderTabsLayout,
  renderTextareaBinding,
  renderTextBinding,
} from "../renderers/binding-renderers";
import type { UIComponentManifest } from "./types";

function binding(
  id: string,
  name: string,
  renderBinding: UIComponentManifest["renderer"]["renderBinding"],
  extra: Partial<UIComponentManifest> = {},
): UIComponentManifest {
  return createManifest({
    id,
    name,
    icon: "input",
    category: "binding",
    capabilities: DEFAULT_BINDING_CAPABILITIES,
    node: { defaultProps: {} },
    renderer: { renderBinding },
    properties: {
      groups: [
        {
          id: "general",
          label: "General",
          fields: [
            { key: "label", label: "Label", type: "text", namespace: "presentation" },
            { key: "placeholder", label: "Placeholder", type: "text", namespace: "presentation" },
            { key: "helpText", label: "Help text", type: "text", namespace: "presentation" },
            { key: "icon", label: "Field icon", type: "icon", namespace: "presentation" },
          ],
        },
        {
          id: "behavior",
          label: "Behavior",
          fields: [
            { key: "required", label: "Required", type: "boolean", namespace: "behavior" },
            { key: "hidden", label: "Hidden", type: "boolean", namespace: "behavior" },
            { key: "readOnly", label: "Read only", type: "boolean", namespace: "behavior" },
            { key: "disabled", label: "Disabled", type: "boolean", namespace: "behavior" },
          ],
        },
        {
          id: "validation",
          label: "Validation",
          fields: [
            { key: "min", label: "Min", type: "number", namespace: "data" },
            { key: "max", label: "Max", type: "number", namespace: "data" },
            { key: "pattern", label: "Pattern", type: "text", namespace: "data" },
          ],
        },
      ],
    },
    validators: id === "emailField" ? ["required", "email"] : ["required"],
    defaultValue: id === "checkboxField" ? false : "",
    ...extra,
  });
}

const OPTIONS_GROUP = {
  id: "data",
  label: "Options",
  fields: [{ key: "options", label: "Options", type: "options" as const, namespace: "data" as const }],
};

const FILE_VALIDATION_GROUP = {
  id: "validation",
  label: "Validation",
  fields: [
    { key: "accept", label: "Accept", type: "text" as const, namespace: "data" as const },
    { key: "maxFileSizeMb", label: "Max size (MB)", type: "number" as const, namespace: "data" as const },
  ],
};

export const textFieldManifest = binding("textField", "Text", renderTextBinding);
export const emailFieldManifest = binding("emailField", "Email", renderEmailBinding);
export const phoneFieldManifest = binding("phoneField", "Phone", renderTextBinding);
export const textareaFieldManifest = binding("textareaField", "Textarea", renderTextareaBinding);
export const selectFieldManifest = binding("selectField", "Select", renderSelectBinding, {
  capabilities: { ...DEFAULT_BINDING_CAPABILITIES, supportsDataSource: true },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [
          { key: "label", label: "Label", type: "text", namespace: "presentation" },
          { key: "placeholder", label: "Placeholder", type: "text", namespace: "presentation" },
          { key: "helpText", label: "Help text", type: "text", namespace: "presentation" },
          { key: "icon", label: "Field icon", type: "icon", namespace: "presentation" },
        ],
      },
      {
        id: "behavior",
        label: "Behavior",
        fields: [
          { key: "required", label: "Required", type: "boolean", namespace: "behavior" },
          { key: "hidden", label: "Hidden", type: "boolean", namespace: "behavior" },
        ],
      },
      OPTIONS_GROUP,
    ],
  },
});
export const checkboxFieldManifest = binding("checkboxField", "Checkbox", renderCheckboxBinding, {
  defaultValue: false,
});
export const radioFieldManifest = binding("radioField", "Radio", renderRadioBinding, {
  capabilities: { ...DEFAULT_BINDING_CAPABILITIES, supportsDataSource: true },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [
          { key: "label", label: "Label", type: "text", namespace: "presentation" },
          { key: "helpText", label: "Help text", type: "text", namespace: "presentation" },
          { key: "icon", label: "Field icon", type: "icon", namespace: "presentation" },
        ],
      },
      {
        id: "behavior",
        label: "Behavior",
        fields: [{ key: "required", label: "Required", type: "boolean", namespace: "behavior" }],
      },
      OPTIONS_GROUP,
    ],
  },
});
export const numberFieldManifest = binding("numberField", "Number", renderNumberBinding);
export const dateFieldManifest = binding("dateField", "Date", renderDateBinding);
export const fileFieldManifest = binding("fileField", "File", renderFileBinding, {
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [
          { key: "label", label: "Label", type: "text", namespace: "presentation" },
          { key: "helpText", label: "Help text", type: "text", namespace: "presentation" },
          { key: "icon", label: "Field icon", type: "icon", namespace: "presentation" },
        ],
      },
      {
        id: "behavior",
        label: "Behavior",
        fields: [{ key: "required", label: "Required", type: "boolean", namespace: "behavior" }],
      },
      FILE_VALIDATION_GROUP,
    ],
  },
});
export const hiddenFieldManifest = binding("hiddenField", "Hidden", renderHiddenBinding);

export const headingManifest = createManifest({
  id: "heading",
  name: "Heading",
  icon: "heading",
  category: "content",
  capabilities: DEFAULT_CONTENT_CAPABILITIES,
  node: { defaultProps: { text: "Heading", level: 2 } },
  renderer: { renderContent: (ctx) => renderHeadingContent(ctx) },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [
          { key: "text", label: "Text", type: "text", namespace: "presentation" },
          { key: "level", label: "Level", type: "number", namespace: "presentation" },
        ],
      },
    ],
  },
});

export const paragraphManifest = createManifest({
  id: "paragraph",
  name: "Paragraph",
  icon: "text",
  category: "content",
  capabilities: DEFAULT_CONTENT_CAPABILITIES,
  node: { defaultProps: { text: "" } },
  renderer: { renderContent: (ctx) => renderParagraphContent(ctx) },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [{ key: "text", label: "Text", type: "textarea", namespace: "presentation" }],
      },
    ],
  },
});

export const dividerManifest = createManifest({
  id: "divider",
  name: "Divider",
  icon: "minus",
  category: "content",
  capabilities: DEFAULT_CONTENT_CAPABILITIES,
  node: { defaultProps: {} },
  renderer: { renderContent: () => renderDividerContent() },
  properties: { groups: [] },
});

export const spacerManifest = createManifest({
  id: "spacer",
  name: "Spacer",
  icon: "spacer",
  category: "content",
  capabilities: DEFAULT_CONTENT_CAPABILITIES,
  node: { defaultProps: { height: 24 } },
  renderer: { renderContent: (ctx) => renderSpacerContent(ctx) },
  properties: {
    groups: [
      {
        id: "layout",
        label: "Layout",
        fields: [{ key: "height", label: "Height (px)", type: "number", namespace: "presentation" }],
      },
    ],
  },
});

export const cardManifest = createManifest({
  id: "card",
  name: "Card",
  icon: "card",
  category: "layout",
  capabilities: DEFAULT_LAYOUT_CAPABILITIES,
  node: { defaultProps: { title: "" } },
  renderer: {
    renderLayout: (ctx) => renderCardLayout({ props: ctx.props, children: ctx.children }),
  },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [{ key: "title", label: "Title", type: "text", namespace: "presentation" }],
      },
    ],
  },
});

export const htmlManifest = createManifest({
  id: "html",
  name: "HTML",
  icon: "code",
  category: "content",
  capabilities: DEFAULT_CONTENT_CAPABILITIES,
  node: { defaultProps: { html: "" } },
  renderer: { renderContent: (ctx) => renderHtmlContent(ctx) },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [{ key: "html", label: "HTML", type: "textarea", namespace: "presentation" }],
      },
    ],
  },
});

export const sectionManifest = createManifest({
  id: "section",
  name: "Section",
  icon: "layout",
  category: "layout",
  capabilities: DEFAULT_LAYOUT_CAPABILITIES,
  node: { defaultProps: { title: "Section" } },
  renderer: {
    renderLayout: (ctx) => renderSectionLayout({ props: ctx.props, children: ctx.children }),
  },
  properties: {
    groups: [
      {
        id: "general",
        label: "General",
        fields: [{ key: "title", label: "Title", type: "text", namespace: "presentation" }],
      },
    ],
  },
});

export const gridManifest = createManifest({
  id: "grid",
  name: "Grid",
  icon: "columns",
  category: "layout",
  capabilities: DEFAULT_LAYOUT_CAPABILITIES,
  node: { defaultProps: { columns: 2 } },
  renderer: {
    renderLayout: (ctx) => renderGridLayout({ props: ctx.props, children: ctx.children }),
  },
  properties: {
    groups: [
      {
        id: "layout",
        label: "Layout",
        fields: [{ key: "columns", label: "Columns", type: "number", namespace: "presentation" }],
      },
    ],
  },
});

export const containerManifest = createManifest({
  id: "container",
  name: "Container",
  icon: "box",
  category: "layout",
  capabilities: DEFAULT_LAYOUT_CAPABILITIES,
  node: { defaultProps: { maxWidth: "" } },
  renderer: {
    renderLayout: (ctx) => renderContainerLayout({ props: ctx.props, children: ctx.children }),
  },
  properties: {
    groups: [
      {
        id: "layout",
        label: "Layout",
        fields: [{ key: "maxWidth", label: "Max width", type: "text", namespace: "presentation" }],
      },
    ],
  },
});

export const heroManifest = createManifest({
  id: "hero",
  name: "Hero",
  icon: "sparkles",
  category: "layout",
  capabilities: DEFAULT_LAYOUT_CAPABILITIES,
  node: { defaultProps: { title: "Welcome", subtitle: "" } },
  renderer: {
    renderLayout: (ctx) => renderHeroLayout({ props: ctx.props, children: ctx.children }),
  },
  properties: {
    groups: [
      {
        id: "content",
        label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", namespace: "presentation" },
          { key: "subtitle", label: "Subtitle", type: "text", namespace: "presentation" },
        ],
      },
    ],
  },
});

export const tabsManifest = createManifest({
  id: "tabs",
  name: "Tabs",
  icon: "tabs",
  category: "layout",
  capabilities: DEFAULT_LAYOUT_CAPABILITIES,
  node: { defaultProps: { tabLabels: ["Tab 1", "Tab 2"] } },
  renderer: {
    renderLayout: (ctx) => renderTabsLayout({ props: ctx.props, children: ctx.children }),
  },
  properties: {
    groups: [
      {
        id: "content",
        label: "Content",
        fields: [{ key: "tabLabels", label: "Tab labels (comma-separated)", type: "text", namespace: "presentation" }],
      },
    ],
  },
});

export const accordionManifest = createManifest({
  id: "accordion",
  name: "Accordion",
  icon: "accordion",
  category: "layout",
  capabilities: DEFAULT_LAYOUT_CAPABILITIES,
  node: { defaultProps: { title: "Details" } },
  renderer: {
    renderLayout: (ctx) => renderAccordionLayout({ props: ctx.props, children: ctx.children }),
  },
  properties: {
    groups: [
      {
        id: "content",
        label: "Content",
        fields: [{ key: "title", label: "Title", type: "text", namespace: "presentation" }],
      },
    ],
  },
});

export const BUILTIN_MANIFESTS: UIComponentManifest[] = [
  textFieldManifest,
  emailFieldManifest,
  phoneFieldManifest,
  textareaFieldManifest,
  selectFieldManifest,
  checkboxFieldManifest,
  radioFieldManifest,
  numberFieldManifest,
  dateFieldManifest,
  fileFieldManifest,
  hiddenFieldManifest,
  headingManifest,
  paragraphManifest,
  dividerManifest,
  spacerManifest,
  htmlManifest,
  sectionManifest,
  gridManifest,
  cardManifest,
  containerManifest,
  heroManifest,
  tabsManifest,
  accordionManifest,
];
