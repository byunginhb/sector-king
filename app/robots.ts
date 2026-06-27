import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sector-king.com'

// 비공개·내부 경로 (모든 크롤러 공통 차단)
const DISALLOW = [
  '/api/',
  '/admin/',
  '/me/',
  '/auth/',
  '/login',
  '/_next/static/',
  '/_next/data/',
]

// AI 검색/답변 엔진 크롤러 — 콘텐츠 인용을 허용한다(명시적 환영 신호).
const AI_CRAWLERS = [
  'GPTBot', // OpenAI 색인
  'OAI-SearchBot', // ChatGPT Search
  'ChatGPT-User', // ChatGPT 사용자 브라우징
  'ClaudeBot', // Anthropic
  'anthropic-ai',
  'Claude-Web',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended', // Gemini
  'Applebot-Extended',
  'CCBot', // Common Crawl (다수 LLM 학습)
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
        userAgent: AI_CRAWLERS,
        allow: '/',
        disallow: DISALLOW,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
