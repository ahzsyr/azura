/** Present only while the schema renderer is in designer mode. */
export function designerCanvasMarker(designerMode?: boolean): "" | undefined {
  return designerMode ? "" : undefined;
}
