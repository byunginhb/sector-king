import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { existsSync, statSync, openSync, readSync, closeSync } from "fs";
import path from "path";

/**
 * 빌드 가드 — 프로덕션 빌드 시 data/hegemony.db 가 없거나 손상이면 빌드를 실패시킨다.
 * DB 는 db-snapshot 브랜치에서 `pnpm build`(= fetch-db.mjs) 로 받아오므로, fetch 가
 * 누락되면(예: Vercel 빌드 커맨드 override) 여기서 loud 하게 막아 빈 데이터 배포를 방지한다.
 */
function assertDbPresentForBuild() {
  const db = path.join(process.cwd(), "data", "hegemony.db");
  const invalid = (() => {
    try {
      if (!existsSync(db) || statSync(db).size < 3_000_000) return true;
      const fd = openSync(db, "r");
      try {
        const buf = Buffer.alloc(16);
        readSync(fd, buf, 0, 16, 0);
        return !buf.toString("latin1").startsWith("SQLite format 3\0");
      } finally {
        closeSync(fd);
      }
    } catch {
      return true;
    }
  })();
  if (invalid) {
    throw new Error(
      "[build] data/hegemony.db 없음/손상 — db-snapshot fetch 실패. " +
        "빌드 커맨드가 `pnpm build`(fetch-db.mjs 포함)인지, db-snapshot 브랜치가 있는지 확인하세요."
    );
  }
}

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

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) assertDbPresentForBuild();
  return nextConfig;
}
