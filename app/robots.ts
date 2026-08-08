import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

// 비공개·내부 경로 (모든 크롤러 공통 차단).
// ⚠️ `/_next/` 는 넣지 말 것 — 렌더링에 필요한 JS/CSS 를 막으면 크롤러가 페이지를
//    렌더할 수 없어 색인이 통째로 망가진다(Google JavaScript SEO basics).
const DISALLOW = [
  '/api/',
  '/admin/',
  '/me/',
  '/auth/',
  '/login',
]

// 검색·인용 목적 크롤러 — 답변 엔진이 우리 페이지를 출처로 읽어가는 경로.
// 학습용 봇 정책을 바꾸더라도 이 그룹은 계속 열어두어야 인용 후보에 남는다.
const SEARCH_CRAWLERS = [
  'OAI-SearchBot', // ChatGPT Search 색인
  'ChatGPT-User', // ChatGPT 사용자 요청 fetch
  'Claude-SearchBot', // Claude 검색 색인
  'Claude-User', // Claude 사용자 요청 fetch
  'PerplexityBot', // Perplexity 색인
  'Perplexity-User', // Perplexity 사용자 요청 fetch
]

// 모델 학습 목적 크롤러 — 현재 정책은 허용(공개 데이터, 인용 확산 우선).
// 정책을 바꿔야 하면 이 배열만 차단 규칙으로 옮기면 되고 검색 봇은 영향받지 않는다.
const TRAINING_CRAWLERS = [
  'GPTBot', // OpenAI 학습
  'ClaudeBot', // Anthropic 학습
  'anthropic-ai',
  'Claude-Web',
  'Google-Extended', // Gemini 학습
  'Applebot-Extended', // Apple Intelligence 학습
  'CCBot', // Common Crawl
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
      {
        userAgent: SEARCH_CRAWLERS,
        allow: '/',
        disallow: DISALLOW,
      },
      {
        userAgent: TRAINING_CRAWLERS,
        allow: '/',
        disallow: DISALLOW,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
