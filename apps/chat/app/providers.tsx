'use client';

import { ThemeProvider, VividChatTheme } from '@hearthos/theme-sdk';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={VividChatTheme}>{children}</ThemeProvider>;
}
