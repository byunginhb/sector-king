import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Vercel serverless function에 data 폴더 포함
  outputFileTracingIncludes: {
    '/api/**/*': ['./data/**/*'],
  },
  // better-sqlite3 native 모듈을 위한 설정
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
