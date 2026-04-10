# 주말 단톡방 전용 전골 예약할인 페이지

> 기간: 2026-04-11 (토) ~ 04-12 (일)
> 상태: 구현 완료, 배포 대기

## 확정 요구사항

| 항목 | 설정 |
|------|------|
| 칼국수 | 추가 옵션 (사이드), 전골 주문 시에만 추가 가능 |
| 픽업 시간 | 09:00~21:00 1시간 단위 |
| 최소 주문 | 전골 1개부터 |
| 기존 옵션 | 육수 추가(5,000원) + 만두 추가(7,000원) 유지 |
| 결제 | 토스페이먼츠 카드 + 가상계좌 |

## 할인 가격표

| 상품 | SKU | 정가 | 할인가 | 할인액 | 유형 |
|------|-----|------|--------|--------|------|
| 시원만두전골 | hotpot_cool | 15,900 | 13,900 | -2,000 | 메인 |
| 얼큰만두전골 | hotpot_spicy | 17,900 | 15,900 | -2,000 | 메인 |
| 칼국수 | noodle (신규) | 2,000 | 1,500 | -500 | 옵션 |
| 육수 추가 | broth_add | 5,000 | 5,000 | 0 | 옵션 |
| 만두 추가 | dumpling_add | 7,000 | 7,000 | 0 | 옵션 |

## 작업 목록

### 백엔드 (backend-builder)
- [x] 1. 칼국수 SKU 추가 — constants.ts PRODUCTS 배열
- [x] 2. Supabase product_sku enum에 'noodle' + hotpot_cool/spicy/broth_add/dumpling_add 추가
- [x] 3. DANGOL_DISCOUNT_PER_ITEM → 2,000원으로 변경
- [x] 4. 칼국수 할인 500원 별도 처리 (NOODLE_DISCOUNT_PER_ITEM)
- [x] 5. PICKUP_EVENT_DATES → ['2026-04-11', '2026-04-12']
- [x] 6. 최소 주문 조건: 전골 1개 이상 (hotpotQty > 0)
- [x] 7. database.ts 타입 업데이트

### 프론트엔드 (frontend-builder)
- [x] 8. 메인 페이지 — 단골 할인 배너에 칼국수 할인 추가, 옵션 할인가 표시
- [x] 9. ProductSelector에 칼국수 옵션 + 할인가 UI 리뉴얼
- [x] 10. 주문 페이지 — 정가 취소선 + 할인가 + 할인 뱃지 표시
- [x] 11. 전골 없이 옵션만 주문 시 폼 제출 차단

### 직원용 기능
- [x] 12. 직원 주문 조회 페이지 (`/admin/lookup`) — 핸드폰 뒤 4자리 → 손님 이름 + 주문 메뉴
- [x] 13. 신규 주문 소리 알림 — Supabase Realtime + TTS "전골 예약 주문!"

### QA (qa-inspector)
- [x] 14. npm run build 성공
- [ ] 15. 가격/할인 계산 정확성 검증 (배포 후 실제 테스트)
- [ ] 16. 주문 플로우 E2E 검증 (배포 후 실제 테스트)

## 하네스 구조

```
.claude/
├── agents/
│   ├── backend-builder.md
│   ├── frontend-builder.md
│   └── qa-inspector.md
└── skills/
    ├── harness/          (메타 스킬)
    └── oltte-dev/        (오케스트레이터)
```
