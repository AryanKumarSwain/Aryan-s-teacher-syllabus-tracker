import type { NextConfig } from 'next';
// @ts-expect-error next-pwa types
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@school-syllabus/types'],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

export default pwaConfig(nextConfig);
