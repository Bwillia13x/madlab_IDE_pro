/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
  ...(isProd ? { output: 'export' } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  ...(isProd
    ? {}
    : {
        async headers() {
          const csp = [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "img-src 'self' https: data:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "font-src 'self' data:",
            "connect-src 'self' https: ws: wss:",
            "form-action 'self'",
            "worker-src 'self' blob:",
            "child-src 'self' blob:",
            'upgrade-insecure-requests',
          ].join('; ');

          return [
            {
              source: '/(.*)',
              headers: [
                { key: 'Content-Security-Policy', value: csp },
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                {
                  key: 'Permissions-Policy',
                  value: 'geolocation=(), camera=(), microphone=(), payment=()',
                },
                { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
              ],
            },
          ];
        },
      }),

  // Performance optimizations
  experimental: {
    // Disable optimizeCss in dev to avoid Critters-related dev server errors
    optimizeCss: process.env.NODE_ENV === 'production',
  },

  // Keep Webpack config minimal to avoid interfering with Next.js app router chunking
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

module.exports = nextConfig;
