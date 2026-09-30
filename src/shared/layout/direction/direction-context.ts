"use client";

import { createContext, useContext } from "react";
import type { LayoutDirection } from "./direction-types";

const DirectionContext = createContext<LayoutDirection>("ltr");

export const DirectionProvider = DirectionContext.Provider;

export function useLayoutDirection(): LayoutDirection {
  return useContext(DirectionContext);
}

