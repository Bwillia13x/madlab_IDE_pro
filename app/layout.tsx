import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { DataProvider } from '@/components/providers/DataProvider';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import dynamic from 'next/dynamic';

const PerformanceMonitor = dynamic(() => import('@/components/PerformanceMonitor'), { ssr: false });

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MAD LAB - Agent-Programmable Workbench',
  description: 'Advanced financial analysis and trading platform with AI-powered insights',
  keywords: 'trading, finance, AI, analysis, workbench',
  authors: [{ name: 'MAD LAB Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#000000',
  manifest: '/manifest.json',
  metadataBase: new URL('http://localhost:3000'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MAD LAB Workbench',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://madlab.workbench',
    title: 'MAD LAB Workbench',
    description: 'Advanced financial analysis and trading platform with AI-powered insights',
    siteName: 'MAD LAB Workbench',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAD LAB Workbench',
    description: 'Advanced financial analysis and trading platform with AI-powered insights',
  },
  icons: {
    icon: [
      { url: '/images/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/images/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/images/icon-167x167.png', sizes: '167x167', type: 'image/png' },
      { url: '/images/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/images/safari-pinned-tab.svg', rel: 'mask-icon' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical resources for better performance */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/api/health" as="fetch" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="MAD LAB Workbench" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#000000" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DataProvider>
            {children}
          </DataProvider>
        </ThemeProvider>
        <ServiceWorkerRegistration />
        <PerformanceMonitor />
      </body>
    </html>
  );
}