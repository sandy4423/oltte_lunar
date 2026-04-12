# 관리자 상세보기 + 용어 통일 + SMS 잔재 제거

> 요청일: 2026-04-12
> 지시: "전체 페이지 살펴서 개선해. (1) 상세보기 할인내역 표시, (2) 배송완료 → 전달완료 버튼 수정, (*) SMS 안내도 기획에 맞게 수정됐는지 깊이 확인"

## 배경

- choi hyokyung 건을 통해 드러난 두 가지 UX 문제:
  1. `OrderDetailDialog`에 **할인 내역이 전혀 안 보여서** 사장님이 "칼국수가 공짜네?" 오해. 라인은 정가(unit_price)로 표시되고 합계만 `total_amount`로 떨어짐 → 차액이 어디서 왔는지 불명.
  2. **"배송완료" 용어가 전사적으로 흩어져 있음**. 현재는 배달이든 픽업이든 사장님이 직접 전달하는 구조 → "배송"보다 "전달"이 업무 실태에 부합.
- SMS는 과거 **2월 설 프로모션 시즌 문구가 그대로 잔재** ("맛있는 설 보내세요", "설 특수로 주문이 몰리고 있어", "2/15(일)까지 연장" 등). 현재 기획(주말 전골 예약주문)에 부합하지 않음.

## 범위

### 포함
- `OrderDetailDialog`에 할인 내역 섹션 추가 (소계·단골할인·픽업할인·합계)
- "배송완료" 표현을 **"전달완료"**로 통일 (UI 라벨/상수/alert/주석/통계 카드 전부)
- SMS 템플릿 설 잔재 제거 및 기획 맞춤 리라이트
- `/dangol`, `/pickup` 페이지 설 문구 제거, 주말 전골 예약 맥락으로 리라이트 (traffic_source 추적은 유지)
- `ManualOrderDialog`의 "설날 운영이 종료되었습니다 (2/14)" 하드코딩 로직 제거
- `createPickupTimeRequestSMS` 주말 예약용으로 재작성
- 배포: main push → Vercel 자동

### 제외 (이번 스코프 밖)
- `DateRangeFilter`의 "설 시즌" 필터 옵션 — 과거 통계 필터용으로 유지

## 작업 상세

### 1. 상세보기 할인 내역 표시 (`OrderDetailDialog.tsx`)

**현재 구조**
```
주문 상품
  ├ 시원 만두전골 x1    15,900원   ← order_items.line_amount (정가)
  ├ 칼국수 x1            2,000원
  └ 합계               15,900원   ← orders.total_amount
```
→ 15,900 + 2,000 = 17,900이어야 할 라인이 합계 15,900으로 떨어져서 2,000원이 증발한 것처럼 보임.

**변경 후 구조**
```
주문 상품
  ├ 시원 만두전골 x1    15,900원
  ├ 칼국수 x1            2,000원
  ├ ─────────────────────────
  ├ 소계               17,900원
  ├ 단골톡방 할인      -2,500원   ← 전골 -2,000, 칼국수 -500 (order_items 기준 재계산)
  ├ 픽업 할인          -3,000원   ← order.pickup_discount > 0일 때만
  └ 합계               15,400원   ← order.total_amount
```

- 단골 할인 상세 breakdown(전골 n개 -2000×n / 칼국수 m개 -500×m)을 툴팁 or 작은 회색 글씨로 표시
- `order.source === 'dangol'`일 때만 단골 할인 줄 표시
- `order.pickup_discount > 0`일 때만 픽업 할인 줄 표시
- DB 값(`dangol_discount`, `pickup_discount`)을 신뢰하되, dangol 건은 `pricing.ts`의 공유 함수로 재계산해서 **불일치 시 경고 아이콘** 표시 (choi hyokyung 같은 과거 버그 건 탐지용)

**구현 포인트**
- `src/lib/pricing.ts`에 순수 함수 `calculateDiscountBreakdown(items, source)` 추가
  - 반환: `{ subtotal, hotpotDiscount, noodleDiscount, dangolTotal }`
- `OrderDetailDialog`에서 `order.order_items`로 호출 → 표시

### 2. "배송완료" → "전달완료" 용어 통일

**UI / 라벨 / 상수 (모두 교체)**
| 파일 | 라인 | 변경 |
|---|---|---|
| `src/lib/constants.ts` | 193 | `DELIVERED: { label: '배송완료', ... }` → `'전달완료'` |
| `src/components/features/admin/OrderDetailDialog.tsx` | 39, 163 | confirm 메시지 및 배달 버튼 라벨 모두 "전달완료"로. (픽업은 이미 "고객 전달완료"라 `isPickup` 분기 자체 제거하거나 유지해도 무방) |
| `src/components/features/admin/OrderFiltersAndActions.tsx` | 206 | 일괄 버튼 "배송완료 (N)" → "전달완료 (N)" |
| `src/components/features/admin/OrderSummaryCards.tsx` | 39 | 카드 라벨 |
| `src/components/features/admin/StatsCards.tsx` | 39 | 카드 라벨 |
| `src/components/features/admin/stats/SalesStats.tsx` | 204 | 통계 라벨 |
| `src/hooks/useAdminPage.ts` | 234, 237, 249, 252, 255 | 주석 및 alert 문구 "배송완료" → "전달완료" |
| `src/app/api/admin/send-correction-sms/route.ts` | 27 | SMS 본문 "이전 배송완료 문자는 시스템 오류..." → "이전 전달완료 문자..." |
| `src/app/refund/page.tsx` | 49 | 약관 문구 "배송 완료 후 단순 변심" → "수령 후 단순 변심" (더 중립적) |

**주의**
- 내부 status 식별자 `DELIVERED`와 enum값은 **변경하지 않음** (DB 마이그레이션 회피). 표시 라벨만 바꿈.
- `types/database.ts:20`의 `// 배송완료` 주석 → `// 전달완료`

### 3. SMS 템플릿 전면 점검 및 리라이트

현재 `src/lib/sms.ts`에 있는 **모든** 템플릿을 리뷰하고 다음 기준으로 수정:

#### 3-1. 설 시즌 잔재 제거 (긴급)
| 함수 | 현재 문제 | 수정안 |
|---|---|---|
| `createDeliveredSMS` | "맛있는 설 보내세요!" × 2 (L295, L305) | "맛있게 드세요!" 또는 "따뜻한 한 끼 되세요!" |
| `createDepositReminderSMS` | "설 특수로 주문이 몰리고 있어 조기 품절이 예상" (L466) | "주말 예약이 조기 마감될 수 있어" |
| `createPickupTimeRequestSMS` | "픽업 기간이 2/15(일)까지 연장", "2/15 일요일도..." (L524-525) | 기획에 맞게 일반화하거나, 함수 자체가 설 프로모 전용이면 삭제 고려 (현재 `api/auth/send-link`에서 호출되므로 주의) |

#### 3-2. "배송/전달" 용어 통일
| 함수 | 변경 |
|---|---|
| `createDeliveredSMS` | 배달 케이스 본문 "배송 완료되었습니다!" → "주문하신 만두전골 전달 완료되었습니다!" 또는 "문 앞에 전달드렸습니다!" |
| 주석 `* 배송 완료 SMS 생성` | `* 전달 완료 SMS 생성` |

#### 3-3. 현재 기획 부합 검증
| 함수 | 사용 위치 | 점검 포인트 |
|---|---|---|
| `createVerificationSMS` | 인증 | OK, 일반 문구 |
| `createVirtualAccountSMS` | `api/payments/virtual-account` | "만두는 빚은 즉시 급속냉동..." 문구 — 전골 예약주문에도 적합. 픽업 장소(랜드마크로 113) 정확한지 재확인 필요 |
| `createPaymentConfirmSMS` | `api/payments/confirm` | 픽업 장소 동일. "다음엔 매장에서 포장 주문" 링크 유지 |
| `createShippingSMS` | (현재 호출처 미확인) | 호출처 확인 후 미사용이면 제거 또는 유지 판단 |
| `createDeliveredSMS` | `api/admin/orders/status` | 3-1, 3-2 반영 |
| `createDepositReminderSMS` | `api/admin/orders/remind-deposit` | 설 잔재 제거 |
| `createRefundAccountRequestSMS` | 환불 플로우 | OK |
| `createRefundCompleteSMS` | 환불 플로우 | OK |
| `createPickupTimeChangeSMS` | 픽업 시간 변경 | OK |
| `createPickupTimeRequestSMS` | `api/auth/send-link` | 설 잔재 제거 or 함수 재작성 |
| `createCancellationSMS` | 취소 | OK |

### 4. 빌드·배포
- 로컬: `npm run build` (더미 env로) 성공 확인
- `git commit` → `git push origin main` → Vercel 자동 배포
- 배포 후: 프로덕션에서 `/admin` 로그인 → 기존 주문 상세 열어 할인 내역이 올바르게 표시되는지 눈으로 확인

## 변경 파일 목록 (요약)

**신규**
- `plans/admin-detail-delivered-sms-cleanup.md` (이 문서)

**수정**
- `src/lib/pricing.ts` — `calculateDiscountBreakdown` 함수 추가
- `src/lib/constants.ts` — `DELIVERED.label` 변경
- `src/lib/sms.ts` — 설 잔재 제거 + 용어 통일
- `src/components/features/admin/OrderDetailDialog.tsx` — 할인 내역 섹션 + 버튼 라벨
- `src/components/features/admin/OrderFiltersAndActions.tsx` — 일괄 버튼
- `src/components/features/admin/OrderSummaryCards.tsx` — 카드 라벨
- `src/components/features/admin/StatsCards.tsx` — 카드 라벨
- `src/components/features/admin/stats/SalesStats.tsx` — 통계 라벨
- `src/hooks/useAdminPage.ts` — 주석 및 alert
- `src/app/api/admin/send-correction-sms/route.ts` — 본문
- `src/app/refund/page.tsx` — 약관 문구
- `src/types/database.ts` — 주석

## QA 체크리스트

- [ ] `OrderDetailDialog`에서 dangol 주문 → 단골 할인 내역 줄 표시됨
- [ ] `OrderDetailDialog`에서 non-dangol 주문 → 단골 할인 줄 숨김
- [ ] `OrderDetailDialog`에서 픽업할인 0원 주문 → 픽업 할인 줄 숨김
- [ ] 소계·할인·합계 숫자가 수학적으로 일관
- [ ] choi hyokyung 건(DB에 할인 누락 채 저장된 과거 버그 건) 열었을 때 경고 아이콘 표시
- [ ] 전달완료 버튼 라벨 "전달완료" 확인 (배달/픽업 모두)
- [ ] 전달완료 처리 → SMS 발송 → 본문에 "설" 문구 없음
- [ ] 일괄 전달완료 버튼 라벨 "전달완료 (N)"
- [ ] 통계 카드 라벨 "전달완료"
- [ ] `npm run build` 성공 (더미 env)
- [ ] Vercel 배포 Ready
- [ ] 프로덕션에서 기존 주문 상세 확인

## 사장님 확인 완료 (2026-04-12)

1. `/dangol`, `/pickup` 페이지 설 문구 → "옛날거" 확인, 이번 스코프에 포함하여 제거
2. `ManualOrderDialog`의 "설날 운영 종료 (2/14)" 메시지 → 제거
3. `createPickupTimeRequestSMS` → 주말 예약용으로 재작성
