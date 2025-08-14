/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
  ...(isProd ? { output: 'export' } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  ...(isProd ? {} : { async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' https: data:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=()' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  } }),
  
  // Performance optimizations
  experimental: {
    // Disable optimizeCss in dev to avoid Critters-related dev server errors
    optimizeCss: process.env.NODE_ENV === 'production',
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
  
  // Bundle analysis and splitting
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Optimize imports from large libraries
    config.resolve.alias = {
      ...config.resolve.alias,
      // Removed fragile alias for react-grid-layout; use package entry to avoid resolution errors
    };

    // Split chunks for better caching
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            // Separate chunk for charting library
            recharts: {
              test: /[\\/]node_modules[\\/](recharts)[\\/]/,
              name: 'recharts',
              chunks: 'all',
              priority: 10,
            },
            // Separate chunk for UI components
            radixui: {
              test: /[\\/]node_modules[\\/](@radix-ui)[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 10,
            },
            // Separate chunk for grid layout
            gridlayout: {
              test: /[\\/]node_modules[\\/](react-grid-layout)[\\/]/,
              name: 'grid-layout',
              chunks: 'all',
              priority: 10,
            },
            // Icons in separate chunk
            icons: {
              test: /[\\/]node_modules[\\/](lucide-react)[\\/]/,
              name: 'icons',
              chunks: 'all',
              priority: 8,
            },
          },
        },
      };
    }

    return config;
  },
};

module.exports = nextConfig;
