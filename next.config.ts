import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '20mb' },
  },
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist', 'tesseract.js'],
  webpack: (config) => {
    // Prevent Windows / OneDrive reparse point resolution errors with readlink
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
