# 관리화면(/admin) 3대 결함 수정 — 검색 흰화면 · 과일주문 혼입 · 떡국만두 상품명

## 목표
만두 매장 관리화면(`/admin`)에서 ① 검색해도 화면이 죽지 않고 ② 빙수(과일) 캠페인
주문이 섞이지 않고 ③ 떡국만두 주문의 상품명이 보이게 한다.

## 제약
- 운영 중인 주문앱. push = Vercel 배포. **한 번에 하나씩, 독립 커밋 3개**
- 「전달완료」 버튼 동작 변경 금지 (이번 범위 밖 — 제안만)
- `git add/commit/push`, `npm install` 금지 (부모 세션이 판단)
- 주문 데이터 변경 동작 실행 금지 (DB 는 읽기 전용 조회만)
- `next.config.mjs`, `src/lib/constants.ts` 기존 값 변경 금지
- 관리자 인증 로직 변경 금지
- slug 하드코딩 금지
- `AdminOrdersTab.tsx` 는 직전 커밋(1bd45c4, 상단 요약 접기) 을 지우지 않게 조심

## 현재 상태 (DB 실측 2026-09-22)
- `orders` 324행 = 만두매장 132 + 빙수매장 192
- **`orders.store_id` 는 NOT NULL 이고 DEFAULT = `75ff8c52-…`(올때만두)**
  → 이 앱이 `store_id` 를 안 넣어도 새 만두주문은 자동으로 만두매장이 된다.
  (PostgREST OpenAPI 로 확인. 이 앱 `src` 에 `store_id`·`campaign` 문자열 0건)
- 만두매장 132 = 만두앱 자체 123 + 떡국만두 캠페인 9 → **원하는 집합과 정확히 일치**
- 빙수매장 192 = fresh · chuseok26 · church
- `order_items.sku` 는 **NULL 허용** (타입 파일이 NOT NULL 로 잘못 적혀 있음).
  `campaign_product_id`, `campaign_product_option_id` 컬럼 존재
- 만두 주문 중 `dong`/`ho`/`apt_name`/`apt_code` 가 null 인 것 = 떡국 9건
  → **store_id 필터를 걸어도 검색 크래시는 그대로 남는다.** 1번은 반드시 필요
- `customer_id`, `delivery_date` 는 DB NOT NULL. `pickup_date`·`is_pickup` 은 nullable

## 결정 사항
- **가르는 기준 = `orders.store_id`** (장부앱 `sale_campaigns.store_id` 와 같은 기준,
  값도 일치). campaign_id 로 가르면 떡국만두까지 빠져서 안 됨. slug 하드코딩 안 함.
  매장 UUID 는 `src/lib/constants.ts` 가 아니라 새 파일에 두어 기존 값 변경 금지 준수
- 상품명 계산은 **공통 함수 1개** (`src/lib/orderItemName.ts`) 로 모으고 12곳이 호출

## 단계
- [x] 0. 조사 — DB 실측, 호출부 전수
- [x] 1. 검색 크래시 null 가드 (`useOrderFilters.ts`)
- [x] 2. 만두 매장 주문만 조회 (`api/admin/orders/route.ts`)
- [x] 3. 캠페인 상품명 공통 함수 + 12곳 반영 + 타입 수정
- [x] 4. 요약 카드가 목록과 같은 모수를 세도록 (사장님 추가 지시 2026-09-22)
- [x] 5. 빌드·헤드리스 검증, 숫자 대조
- [ ] 6. 커밋·푸시 (부모 세션 판단 — 이 세션은 금지)
- [ ] 7. 「전달완료」 캠페인 주문 처리 (다음 단계, 제안만 함)

## 진행 로그
- 2026-09-22 조사: store_id DEFAULT 확인이 핵심. 새 주문도 안전.
- 2026-09-22 1단계 완료: null 가드(검색·정렬·수령날짜). 검색 대상 필드는 그대로 둠
- 2026-09-22 2단계 완료: store_id eq 필터, 매장 상수 파일 신설
- 2026-09-22 3단계 완료: orderItemName.ts 신설, 9개 파일 반영, 타입 수정
- 2026-09-22 4단계: 요약 카드 모수를 filteredOrders 로. 「날짜별 예약 현황」과
  접힘 줄의 「오늘 N건」만 날짜 필터 예외(전체 기간) — 이유는 코드 주석에 적음
- 2026-09-22 **추가 발견**: `OrderDesktopTable:110` `order.apt_name.replace(...)`,
  `OrderMobileCards:60` 도 캠페인 주문(apt_name NULL)에서 터진다. 검색과 무관하게
  **목록에 뜨기만 해도** 화면이 하얗게 됨(헤드리스에서 "Application error" 재현).
  `formatAptName`·`formatDongHo`(utils.ts) 로 공통 처리
- 2026-09-22 **추가 발견**: `next.config.mjs` 에 `ignoreBuildErrors: true` 라
  `npm run build` 는 타입 오류를 못 잡는다. `tsc --noEmit` 를 따로 돌려
  HEAD 사본(339건)과 대조 → 새 오류 0건 확인
- 2026-09-22 5단계 완료: 빌드 통과, 헤드리스 3화면 캡처(/tmp/lunar_shots/),
  DB 대조 일치 (만두·오늘·결제완료 = 2건 26,700원)

## 열린 질문
- 「전달완료」: 캠페인(떡국) 주문에서 눌렀을 때 어떻게 할지 — 보고 후 사장님 판단
  - 확인된 사실: `orders.picked_up_at` 컬럼이 있고 떡국 9건 전부 NULL.
    이 앱의 전달완료는 `status='DELIVERED'` 만 쓰고 `picked_up_at` 은 안 건드린다.
    → 장부앱 카운터와 어긋나고, 문자가 두 통 나갈 수 있다
  - 제안: 캠페인 주문은 버튼을 막고 "이 주문은 카운터에서 처리하세요" 안내
  - 걸림돌: `OrderRow` 타입에 `campaign_id`·`store_id`·`picked_up_at` 선언이 없다
    (API 는 `select('*')` 라 값은 내려온다). 막으려면 타입 선언부터 추가해야 함
