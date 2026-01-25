# Sector King Vercel 배포 가이드

## 개요

Vercel + GitHub Actions를 사용한 자동 배포 및 데이터 수집 설정 가이드입니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    자동화 흐름                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GitHub Actions (매일 KST 00:00)                            │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────┐                                        │
│  │ update_data.py  │  yfinance로 주식 데이터 수집            │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ data/hegemony.db│  SQLite DB 업데이트                    │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │  git commit     │                                        │
│  │  git push       │  변경사항 커밋                          │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │    Vercel       │  자동 재배포 트리거                     │
│  │  (자동 감지)     │                                        │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: GitHub 저장소 생성

### 1.1 새 저장소 생성

```bash
# GitHub에서 새 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/sector-king.git
git branch -M main
git push -u origin main
```

### 1.2 현재 변경사항 커밋

```bash
git add .
git commit -m "feat: add statistics page and docker setup"
git push
```

---

## Step 2: Vercel 배포

### 2.1 Vercel 계정 연결

1. [vercel.com](https://vercel.com) 접속
2. **Sign Up** → **Continue with GitHub** 클릭
3. GitHub 계정으로 로그인

### 2.2 프로젝트 Import

1. Vercel 대시보드에서 **Add New...** → **Project** 클릭
2. **Import Git Repository** 에서 `sector-king` 저장소 선택
3. **Import** 클릭

### 2.3 빌드 설정

| 설정 | 값 |
|------|-----|
| Framework Preset | Next.js |
| Root Directory | `./` |
| Build Command | `pnpm build` (자동 감지됨) |
| Output Directory | `.next` (자동 감지됨) |

4. **Deploy** 클릭
5. 배포 완료 후 URL 확인 (예: `https://sector-king.vercel.app`)

---

## Step 3: GitHub Actions 권한 설정

데이터 수집 후 자동 커밋을 위해 권한 설정이 필요합니다.

### 3.1 저장소 설정 변경

1. GitHub 저장소 → **Settings** 탭
2. 왼쪽 메뉴에서 **Actions** → **General** 클릭
3. 스크롤하여 **Workflow permissions** 섹션 찾기
4. **Read and write permissions** 선택
5. **Save** 클릭

```
Settings → Actions → General → Workflow permissions
                                    ↓
                    ✅ Read and write permissions
```

---

## Step 4: 데이터 수집 테스트

### 4.1 수동 실행으로 테스트

1. GitHub 저장소 → **Actions** 탭
2. 왼쪽에서 **Daily Data Update** 클릭
3. **Run workflow** 버튼 클릭
4. **Run workflow** 확인

### 4.2 실행 결과 확인

- 성공하면 초록색 체크 ✅
- `data/hegemony.db` 파일이 업데이트된 커밋 생성
- Vercel이 자동으로 재배포 시작

### 4.3 로그 확인

Actions 탭에서 실행된 워크플로우 클릭 → 각 단계별 로그 확인 가능

---

## Step 5: 자동 수집 스케줄

이미 설정되어 있습니다. 매일 **KST 00:00 (자정)** 에 자동 실행됩니다.

### 스케줄 확인

[.github/workflows/update-data.yml](.github/workflows/update-data.yml):

```yaml
on:
  schedule:
    - cron: '0 15 * * *'  # UTC 15:00 = KST 00:00
```

### 스케줄 변경 (선택사항)

```yaml
# KST 09:00으로 변경 (미국 장 마감 후)
- cron: '0 0 * * *'   # UTC 00:00 = KST 09:00

# 하루 2번 (KST 00:00, 12:00)
- cron: '0 3,15 * * *'
```

---

## 배포 완료 체크리스트

- [ ] GitHub 저장소에 코드 push 완료
- [ ] Vercel에서 프로젝트 import 완료
- [ ] 첫 배포 성공 확인
- [ ] GitHub Actions 권한 설정 완료
- [ ] 수동 워크플로우 실행 테스트 완료
- [ ] Vercel 자동 재배포 확인

---

## 도메인 설정 (선택사항)

### 커스텀 도메인 연결

1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Domains**
3. 도메인 입력 (예: `sector-king.com`)
4. DNS 설정 안내에 따라 설정

### DNS 설정 예시

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

---

## 문제 해결

### 빌드 실패 시

```bash
# 로컬에서 빌드 테스트
pnpm build
```

### GitHub Actions 실패 시

1. Actions 탭에서 실패한 워크플로우 클릭
2. 빨간색 ❌ 단계 클릭하여 로그 확인
3. 주로 발생하는 문제:
   - yfinance API 일시적 오류 → 재실행
   - 권한 문제 → Step 3 확인

### Vercel 배포 실패 시

1. Vercel 대시보드 → Deployments
2. 실패한 배포 클릭 → 로그 확인

---

## 유용한 링크

| 링크 | 설명 |
|------|------|
| Vercel 대시보드 | https://vercel.com/dashboard |
| GitHub Actions | https://github.com/YOUR_USERNAME/sector-king/actions |
| 배포된 사이트 | https://sector-king.vercel.app (배포 후 확인) |

---

## 요약

```bash
# 1. GitHub에 push
git push origin main

# 2. Vercel에서 Import (웹 UI)

# 3. GitHub Settings에서 Actions 권한 설정

# 4. 끝! 매일 자정에 자동 데이터 수집 + 재배포
```
