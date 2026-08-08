// `server-only` 패키지의 테스트용 no-op 대체.
// 실제 패키지는 클라이언트 번들에 섞이면 빌드를 실패시키는 가드일 뿐이라,
// 테스트 런타임에서는 아무것도 하지 않아도 된다. vitest.config.ts 의 alias 로 연결된다.
export {}
