import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { KeyboardProvider } from '@/components/providers/KeyboardProvider';
import { DataProvider } from '@/components/providers/DataProvider';
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';
import { Toaster } from '@/components/ui/sonner';
import { WidgetProvider } from '@/components/providers/WidgetProvider';
import { initializePerformanceMonitoring } from '@/lib/performance/monitor';
// Initialize data providers
import '@/lib/data/init';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MAD LAB - Agent-Programmable Workbench',
  description: 'VS Code-inspired financial analysis workbench with agent integration',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (typeof window !== 'undefined') {
    try { initializePerformanceMonitoring(); } catch {}
  }
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <body className={inter.className} data-testid="workspace-root">
        <ThemeProvider
          defaultTheme="dark"
          storageKey="madlab-theme"
        >
          <AnalyticsProvider>
            <DataProvider>
              <KeyboardProvider>
                <WidgetProvider>
                  {children}
                </WidgetProvider>
              </KeyboardProvider>
            </DataProvider>
          </AnalyticsProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}