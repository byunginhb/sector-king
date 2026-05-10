import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      // Phase 2 IA 재구성 — 루트 폐기 라우트 4건은 메인이 흡수
      {
        source: '/money-flow',
        destination: '/',
        permanent: true,
      },
      {
        source: '/price-changes',
        destination: '/',
        permanent: true,
      },
      {
        source: '/statistics',
        destination: '/',
        permanent: true,
      },
      {
        source: '/industry-money-flow',
        destination: '/',
        permanent: true,
      },
      // Legacy 경로
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
