import { USER_PRESETS_STORAGE_KEY } from "./constants";
import type { UserCreatedPreset } from "./types";

function readAll(): UserCreatedPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserCreatedPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(presets: UserCreatedPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore
  }
}

export function listUserPresets(): UserCreatedPreset[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function getUserPreset(id: string): UserCreatedPreset | null {
  return readAll().find((p) => p.id === id) ?? null;
}

export function saveUserPreset(
  input: Omit<UserCreatedPreset, "id" | "createdAt"> & { id?: string },
): UserCreatedPreset {
  const presets = readAll();
  const now = Date.now();
  const id = input.id?.trim() || `user-${now}`;
  const next: UserCreatedPreset = {
    id,
    name: input.name.trim() || "My preset",
    createdAt: now,
    colors: input.colors,
    cursor: input.cursor,
    backgroundEffect: input.backgroundEffect,
    textEffect: input.textEffect,
    cardStyle: input.cardStyle,
    borderStyle: input.borderStyle,
  };
  const idx = presets.findIndex((p) => p.id === id);
  if (idx >= 0) {
    presets[idx] = { ...next, createdAt: presets[idx].createdAt };
  } else {
    presets.push(next);
  }
  writeAll(presets);
  return idx >= 0 ? presets[idx] : next;
}

export function deleteUserPreset(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}
