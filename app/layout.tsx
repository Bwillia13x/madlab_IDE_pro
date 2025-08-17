import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { ThemeSync } from '@/components/ThemeSync';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MAD LAB - Agent-Programmable Workbench',
  description: 'VS Code-inspired financial analysis workbench with agent integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="madlab-theme"
        >
          <ThemeSync />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}