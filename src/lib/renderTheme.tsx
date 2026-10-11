import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ColorMode } from './theme';

export interface RenderTheme {
  mode: ColorMode;
  canvasBg: string;
  edge: string;
  edgeMuted: string;
  accent: string;
  grid: string;
  font: string;
}

export const LIGHT_THEME: RenderTheme = {
  mode: 'light',
  canvasBg: '#f8fafc',
  edge: '#475569',
  edgeMuted: '#94a3b8',
  accent: '#4f46e5',
  grid: '#cbd5e1',
  font: 'Inter, "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
};

export const DARK_THEME: RenderTheme = {
  mode: 'dark',
  canvasBg: '#0b1120',
  edge: '#a5b4c8',
  edgeMuted: '#64748b',
  accent: '#818cf8',
  grid: '#1e293b',
  font: 'Inter, "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
};

const RenderThemeContext = createContext<RenderTheme>(LIGHT_THEME);

export function RenderThemeProvider({ value, children }: { value: RenderTheme; children: ReactNode }) {
  const memo = useMemo(() => value, [value.mode, value.canvasBg]);
  return <RenderThemeContext.Provider value={memo}>{children}</RenderThemeContext.Provider>;
}

export function useRenderTheme(): RenderTheme {
  return useContext(RenderThemeContext);
}
