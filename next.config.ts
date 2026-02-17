import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/money-flow',
        destination: '/tech/money-flow',
        permanent: true,
      },
      {
        source: '/price-changes',
        destination: '/tech/price-changes',
        permanent: true,
      },
      {
        source: '/statistics',
        destination: '/tech/statistics',
        permanent: true,
      },
      {
        source: '/sector-trend',
        destination: '/tech/money-flow',
        permanent: true,
      },
    ]
  },
  // Vercel serverless function에 data 폴더 포함
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/**/*'],
  },
  // better-sqlite3 native 모듈을 위한 설정
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
