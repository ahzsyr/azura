import { ALL_PRESETS } from "./presets-catalog";

export type PresetDefinition = {
  id: string;
  name: string;
  description?: string;
  colors: {
    primary: string;
    accent?: string;
    secondary?: string;
    background: string;
    surface?: string;
    text?: string;
    textMuted?: string;
  };
  fonts?: { display: string; body: string; mono: string };
  cursor?: string;
  backgroundEffect?: string;
  textEffect?: string;
  cardStyle?: string;
  borderStyle?: string;
};

export function listPresetIds(): string[] {
  return ALL_PRESETS.map((p) => p.id);
}
