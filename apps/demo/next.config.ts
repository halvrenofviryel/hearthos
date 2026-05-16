import type { NextConfig } from 'next';

// Set STATIC_EXPORT=1 to bake a static-export build for hosting under
// phionyx.ai/hearthos/demo. Without it, `next dev` and `next build` keep
// working at the root (localhost:3300/diagnostic etc.) for local use.
const isStaticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hearthos/core'],
  ...(isStaticExport
    ? {
        output: 'export',
        basePath: '/hearthos/demo',
        assetPrefix: '/hearthos/demo',
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
