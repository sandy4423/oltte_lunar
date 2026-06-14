# 올뜨만두 전골 예약 주문 시스템

> 매장 운영 총괄 비서: /Users/dotory/projects/jarvis/ (자비스 본부). 여기는 프로젝트 고유 컨텍스트만 기술.

**트리거:** 상품/가격/할인/페이지/주문/결제/배포 관련 작업 요청 시 `oltte-dev` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

## 에이전트 팀 (oltte-dev 오케스트레이터)

| 에이전트 | 역할 | 순서 |
|---------|------|------|
| backend-builder | 상수/DB/API/훅 수정 | 1단계 |
| frontend-builder | 페이지/컴포넌트 UI 수정 | 2단계 |
| qa-inspector | 빌드/통합/정합성 검증 | 3단계 |

상세 워크플로우: @.claude/skills/oltte-dev/SKILL.md

## 기술 스택

- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL), 프로젝트명 `oltte-main`
- 결제: 토스페이먼츠 V1
- 배포: Vercel

## 핵심 파일

- `src/lib/constants.ts` — 상품/가격/할인/일정 중앙 관리
- `src/hooks/useOrderSubmit.ts`, `useCart.ts` — 주문 훅
- `src/app/api/` — API 라우트
- `migrations/` — DB 마이그레이션 SQL

## 변경 이력

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-04-10 | 초기 구성 | 전체 | 주말 프로모션 개발을 위한 하네스 구축 |
