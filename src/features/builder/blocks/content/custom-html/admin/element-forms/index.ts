import type { ComponentType } from "react";
import type { HtmlElement, HtmlElementTag } from "../../types";
import { TextElementForm } from "./text-element-form";
import { VoidElementForm } from "./void-element-form";
import { RawHtmlForm } from "./raw-html-form";
import { GenericContainerForm } from "./generic-container-form";
import { ImageElementForm } from "./image-element-form";
import { FigureElementForm } from "./figure-element-form";
import { PictureElementForm } from "./picture-element-form";
import { LinkElementForm } from "./link-element-form";
import { ListElementForm } from "./list-element-form";
import { TableElementForm } from "./table-element-form";

export type ElementFormProps = {
  element: HtmlElement;
  onChange: (patch: Partial<HtmlElement>) => void;
};

const TEXT_TAGS = new Set<HtmlElementTag>([
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "code",
  "span", "strong", "em", "b", "i", "u", "mark", "small", "sup", "sub", "abbr", "kbd",
  "caption",
]);

const VOID_TAGS = new Set<HtmlElementTag>(["hr", "br"]);

const CONTAINER_TAGS = new Set<HtmlElementTag>([
  "div", "section", "article", "aside", "header", "footer", "main", "nav",
]);

export function getElementForm(element: HtmlElement): ComponentType<ElementFormProps> {
  if (element.rawHtml !== undefined) return RawHtmlForm;

  const tag = element.tag as HtmlElementTag;

  if (tag === "img") return ImageElementForm;
  if (tag === "figure") return FigureElementForm;
  if (tag === "picture") return PictureElementForm;
  if (tag === "a") return LinkElementForm;
  if (tag === "ul" || tag === "ol") return ListElementForm;
  if (tag === "table") return TableElementForm;
  if (TEXT_TAGS.has(tag)) return TextElementForm;
  if (VOID_TAGS.has(tag)) return VoidElementForm;
  if (CONTAINER_TAGS.has(tag)) return GenericContainerForm;

  return GenericContainerForm;
}

export {
  TextElementForm,
  VoidElementForm,
  RawHtmlForm,
  GenericContainerForm,
  ImageElementForm,
  FigureElementForm,
  PictureElementForm,
  LinkElementForm,
  ListElementForm,
  TableElementForm,
};
