import type { CSSProperties, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean;
        "interaction-prompt"?: string;
        exposure?: string;
        "camera-orbit"?: string;
        poster?: string;
        "variant-name"?: string;
        style?: CSSProperties;
      };
    }
  }
}
