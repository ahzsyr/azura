import type { HeaderDesktopMode } from "@/features/navigation/types";

export const HEADER_DESKTOP_OPTIONS: {
  value: HeaderDesktopMode;
  label: string;
  desc: string;
}[] = [
  {
    value: "static",
    label: "Static (default)",
    desc: "Scrolls up and out of view with the page like normal content.",
  },
  {
    value: "sticky",
    label: "Sticky (on scroll)",
    desc: "Stays in flow until the header reaches the top, then sticks there.",
  },
  {
    value: "fixed-top",
    label: "Fixed on top (always visible)",
    desc: "Pinned to the top of the viewport at all times while scrolling. Same as a classic “fixed” header.",
  },
  {
    value: "hide-reveal",
    label: "Hide on scroll down / reveal on scroll up",
    desc: "Moves out of the way when scrolling down; comes back when you scroll up.",
  },
  {
    value: "shrink-scroll",
    label: "Shrink on scroll",
    desc: "Starts full size, then reduces height and padding after you scroll down a bit.",
  },
  {
    value: "absolute",
    label: "Absolute",
    desc: "Positioned relative to the header area (not the viewport); scrolls away with the layout.",
  },
];
