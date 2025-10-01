import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: 'class' | 'data-theme' | 'data-color-scheme';
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
  children,
  attribute = 'class',
  ...props
}: ThemeProviderProps) {
  return <NextThemesProvider attribute={attribute} {...props}>{children}</NextThemesProvider>;
}
