/** Whether the media flip back face is visible and interactive. */
export function resolveMediaFlipBackExposed(isFlipped: boolean, isHovered: boolean): boolean {
  return isFlipped || isHovered;
}
