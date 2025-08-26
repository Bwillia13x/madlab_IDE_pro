/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  swcMinify: true,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Keep only supported flags
    optimizeCss: false,
    scrollRestoration: true,
    optimizeServerReact: true,
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  webpack: (config, { isServer, dev }) => {
    // Handle OpenTelemetry dynamic imports to prevent critical dependency warnings
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        '@opentelemetry/auto-instrumentations-node': '@opentelemetry/auto-instrumentations-node',
        '@opentelemetry/instrumentation-http': '@opentelemetry/instrumentation-http',
        '@opentelemetry/instrumentation-pg': '@opentelemetry/instrumentation-pg',
        '@opentelemetry/instrumentation-redis': '@opentelemetry/instrumentation-redis',
      });
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
      encoding: false,
    };

    // Add ignore warnings for OpenTelemetry dynamic imports
    config.module.exprContextCritical = false;

    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
            d3: {
              test: /[\\/]node_modules[\\/]d3[\\/]/,
              name: 'd3',
              chunks: 'all',
              priority: 15,
            },
            charts: {
              test: /[\\/]node_modules[\\/](recharts|react-grid-layout)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 12,
            },
            widgets: {
              test: /[\\/]components[\\/]widgets[\\/]/,
              name: 'widgets',
              chunks: 'all',
              priority: 7,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20,
            },
          },
        },
        concatenateModules: true,
        minimizer: [
          ...config.optimization.minimizer,
        ],
      };
      config.output.chunkFilename = 'static/chunks/[name].[contenthash].js';
      config.devtool = 'source-map';
    }

    // Handle OpenTelemetry dynamic imports more gracefully
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/auto-instrumentations-node': false,
      '@opentelemetry/instrumentation-http': false,
      '@opentelemetry/instrumentation-pg': false,
      '@opentelemetry/instrumentation-redis': false,
    };

    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[name].[hash][ext]',
      },
    });
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/images/[name].[hash][ext]',
      },
    });
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
