import React, {createContext, type ReactNode, useContext} from 'react'

export const THEME_MODES = ['auto', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export const BRAND_COLOR = '#C15F3C'

export type Theme = {
  mode: ThemeMode
  /** Undefined means “use the terminal's own foreground/background”. */
  primary?: string
  gray?: string
  dark?: string
  background?: string
  dimSecondary: boolean
  inverseButton: boolean
}

const themes: Record<ThemeMode, Theme> = {
  auto: {
    mode: 'auto',
    // Leaving colors unset is more reliable than trying to detect whether a
    // terminal is light or dark. ANSI defaults already follow its theme.
    primary: undefined,
    gray: undefined,
    dark: undefined,
    background: undefined,
    dimSecondary: true,
    inverseButton: true,
  },
  light: {
    mode: 'light',
    primary: '#18181b',
    gray: '#52525b',
    dark: '#ffffff',
    background: '#ffffff',
    dimSecondary: false,
    inverseButton: false,
  },
  dark: {
    mode: 'dark',
    primary: '#ffffff',
    gray: '#a1a1aa',
    dark: '#18181b',
    background: '#18181b',
    dimSecondary: false,
    inverseButton: false,
  },
}

const ThemeContext = createContext<Theme>(themes.auto)

export function themeFor(mode: ThemeMode): Theme {
  return themes[mode]
}

export function ThemeProvider({mode, children}: {mode: ThemeMode; children: ReactNode}) {
  return React.createElement(ThemeContext.Provider, {value: themeFor(mode)}, children)
}

export function useTheme(): Theme {
  return useContext(ThemeContext)
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value)
}

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  return THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length]!
}
