---
name: oltte-dev
description: "올뜨만두 주문 시스템 개발 오케스트레이터. 상품 추가/수정, 가격 변경, 할인 설정, 프로모션 페이지, 주문 플로우 변경, 결제 연동, DB 마이그레이션 등 모든 개발 작업을 조율. '프로모션 만들어줘', '상품 추가해줘', '가격 변경해줘', '할인 설정', '페이지 수정', '주문 시스템 수정', '배포해줘' 요청 시 사용. 후속 작업: 수정, 업데이트, 보완, 다시 실행, 결과 개선, 버그 수정 시에도 사용."
---

# Oltte Dev Orchestrator

올뜨만두 전골 예약 주문 시스템의 개발 작업을 조율하는 오케스트레이터.

## 실행 모드: 서브 에이전트 (파이프라인)

## 에이전트 구성

| 에이전트 | 역할 | 순서 |
|---------|------|------|
| backend-builder | 상수/DB/API/훅 수정 | 1단계 |
| frontend-builder | 페이지/컴포넌트 UI 수정 | 2단계 |
| qa-inspector | 빌드/통합/정합성 검증 | 3단계 |

## 워크플로우

### Phase 0: 컨텍스트 확인

1. `_workspace/` 디렉토리 존재 여부 확인
2. 실행 모드 결정:
   - `_workspace/` 미존재 → 초기 실행. Phase 1 진행
   - `_workspace/` 존재 + 부분 수정 → 해당 에이전트만 재호출
   - `_workspace/` 존재 + 새 요청 → `_workspace_prev/`로 이동 후 Phase 1

### Phase 1: 요구사항 분석

1. 사용자 요청 파악 (상품/가격/할인/UI/결제 등)
2. 영향받는 파일 식별
3. `_workspace/` 생성, 요구사항을 `_workspace/00_requirements.md`에 저장

### Phase 2: 백엔드 구현

Agent(backend-builder) 호출:
- constants.ts 상품/가격/할인 수정
- DB 마이그레이션 SQL 작성 및 실행
- API 라우트 수정 (필요 시)
- 훅 로직 수정 (필요 시)
- 타입 정의 업데이트

산출물: `_workspace/01_backend_changes.md`

### Phase 3: 프론트엔드 구현

Agent(frontend-builder) 호출:
- Phase 2의 백엔드 변경 내용을 입력으로 전달
- 페이지/컴포넌트 UI 수정
- 프로모션 랜딩 페이지 구현
- 모바일 최적화

산출물: `_workspace/02_frontend_changes.md`

### Phase 4: QA 검증

Agent(qa-inspector) 호출:
- npm run build 성공 확인
- 가격/할인 계산 정확성
- API ↔ 프론트 통합 정합성
- 주문 플로우 검증

산출물: `_workspace/03_qa_report.md`

### Phase 5: 정리 및 보고

1. QA 결과에 문제가 있으면 해당 에이전트 재호출
2. 모든 변경 파일 목록 정리
3. 사용자에게 결과 요약 보고
4. 배포 필요 시 안내

## 데이터 흐름

```
[요구사항] → [backend-builder] → 변경된 constants/DB/API
                                      ↓
                               [frontend-builder] → 수정된 UI/페이지
                                      ↓
                               [qa-inspector] → 검증 보고서
                                      ↓
                               [사용자 보고]
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 빌드 실패 | qa-inspector가 에러 보고 → 해당 에이전트 재호출 |
| DB 마이그레이션 실패 | backend-builder 재호출 + 롤백 SQL |
| 타입 불일치 | backend-builder에서 타입 수정 |
| UI 깨짐 | frontend-builder 재호출 |

## 테스트 시나리오

### 정상 흐름
1. 사용자가 "칼국수 추가하고 할인 설정해줘" 요청
2. backend-builder가 constants.ts + DB 수정
3. frontend-builder가 ProductSelector + 랜딩 페이지 수정
4. qa-inspector가 빌드 + 가격 검증 통과
5. 사용자에게 변경 요약 보고

### 에러 흐름
1. Phase 4에서 빌드 실패 발견
2. 에러 내용 분석 → 타입 불일치
3. backend-builder 재호출하여 타입 수정
4. qa-inspector 재검증
5. 통과 후 보고
