/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export for production server
  // output: 'export',
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Force deterministic dev chunk filenames to avoid stale cache mismatches
  experimental: {
    clientTraceBufferSize: 0,
  },
  // Add webpack configuration to resolve module issues
  webpack: (config, { isServer }) => {
    // Ensure proper module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Ensure hot updates don't leave stale chunks in client cache by disabling cache headers
    if (!isServer) {
      config.output.chunkFilename = 'static/chunks/[name].js';
    }
    return config;
  },
};

module.exports = nextConfig;
