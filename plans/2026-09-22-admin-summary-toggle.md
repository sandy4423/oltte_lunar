# /admin 상단 요약 접기 토글

## 목표
`/admin` 「주문관리」 탭 맨 위 요약 덩어리(통계카드 4개 + 상품별 준비 수량 + 날짜별 예약 현황)를
접기/펴기 토글로 감싸고, 기본은 접힘·상태는 localStorage 기억.

## 제약
- git add/commit/push/npm install 금지 (push = 운영 배포). 사장님이 직접 올린다
- 주문 데이터 변경 동작 실행 금지
- next.config.mjs, src/lib/constants.ts 기존 값 변경 금지
- 관리자 인증 로직 변경 금지
- 「통계분석」·「재고관리」 탭, 필터·주문목록 건드리지 않기
- 조사 2건(null 226개, 상품칸 x1 x1)은 **원인만 보고**, 수정 금지

## 현재 상태 (조사 완료)
- 요약 덩어리는 전부 `src/components/features/admin/AdminOrdersTab.tsx` 안에 있다
  - 통계카드 4개: 89~114줄
  - 상품별 준비 수량 + 날짜별 예약 현황: 117~151줄 (`stats.paid > 0` 일 때만)
  - 집계 로직 `stats` useMemo: 63~84줄
- 인증: sessionStorage `adminUser` 가 있으면 통과(클라이언트), API 는 `x-admin-password` 헤더

## 결정 사항
- 접힘 시 한 줄 요약: 결제완료 · 결제대기 · 오늘 픽업/배달 건수 + 「펼치기」 버튼
- localStorage 키: `admin_orders_summary_open`, 읽기/쓰기 try/catch
- SSR 하이드레이션 불일치 방지: 초기값 false(접힘) → useEffect 에서 저장값 복원

## 단계
- [x] 1. AdminOrdersTab.tsx 에 토글 상태 + localStorage 추가
- [x] 2. 요약 덩어리를 접기/펴기로 감싸기 + 접힘 한 줄 요약
- [x] 3. 빌드 검증 (.env.local 임시 복사 후 삭제 완료, git status 깨끗)
- [x] 4. 헤드리스 브라우저 화면 확인 (접힘/펼침/새로고침 유지/390px) — 모두 통과
- [x] 5. 조사 2건 원인 정리 (아래)
- [ ] 6. 커밋·푸시 — **사장님 확인 후** (push = 운영 배포)

## 진행 로그
- 2026-09-22 조사: 요약 덩어리 위치·집계 로직·인증 방식 확인 완료
- 2026-09-22 구현: AdminOrdersTab.tsx 한 파일만 수정. 빌드 성공.
  헤드리스(Playwright, API 를 가짜 데이터로 가로채기) 확인 —
  접힘 기본 / 펼치기 / 새로고침 후 유지(펼침·접힘 양방향) / 390px 정상.
  스크린샷: /Users/dotory/.claude/jobs/c8c50698/tmp/shots/
- 2026-09-22 확인: 390px 가로 스크롤(410px)은 **탭바(TabsList) 때문이며 기존 문제**.
  내 블록을 DOM 에서 지워도 그대로 410px → 이번 변경과 무관. 손대지 않음.

## 조사 결과 (고치지 않음 — 원인만)

### 1) 「상품별 준비 수량」의 `null 226개`
- 집계: `src/components/features/admin/AdminOrdersTab.tsx:106`
  `productQty[item.sku] = (productQty[item.sku] || 0) + item.qty`
  → `item.sku` 가 null 인 행의 키가 문자열 `"null"` 로 뭉쳐진다.
- 표시: 같은 파일 184~187줄. `getProductBySku(null)` → undefined → 키 `"null"` 을 그대로 출력.
- DB 실측(2026-09-22): `order_items` 중 `sku is null` 231행. 그중
  결제완료(PAID/LATE_DEPOSIT) + 숨김 아닌 주문의 qty 합계가 **정확히 226** → 화면 숫자와 일치.
- 정체: 떡국만두가 아니라 **복숭아 4kg 캠페인**
  (`campaign_products.id=1df4ae48-…`, name='복숭아', campaign_id=6202ab52-…).
- 캠페인 주문을 만드는 코드는 이 레포에 없다(`grep campaign` 결과 0건).
  다른 앱이 같은 Supabase 의 orders/order_items 에 직접 넣는다.
- 고치려면: 집계 때 `item.sku ?? campaign_products.name` 으로 키를 잡아야 하고,
  그러려면 아래 2)의 API 조인이 먼저 필요하다.

### 2) 주문 목록 「상품」 칸이 `x1 x1`
- 표시: `OrderDesktopTable.tsx:139`, `OrderMobileCards.tsx:85`
  `{product?.emoji} {product?.name || item.sku} x{item.qty}`
  → sku 가 null 이면 `product` 도 undefined, `item.sku` 도 null → 이름 자리가 통째로 비고 `x1` 만 남는다.
- 근본 원인: `src/app/api/admin/orders/route.ts:24`
  `.select('*, customer:customers(*), order_items(*)')` — campaign_products 를 조인하지 않아
  화면이 캠페인 상품명을 받지 못한다. (`order_items.campaign_product_id` 값은 내려온다)
- 고치려면 (3단계):
  1. API select 를 `order_items(*, campaign_product:campaign_products(name))` 로 확장
  2. `src/types/database.ts:100-107` 의 `OrderItemRow` 를 실제 DB 에 맞게 확장
     (`sku: ProductSku | null`, `campaign_product_id`, `campaign_product_option_id` 추가)
  3. 이름 계산을 한 곳으로 모아 공통 함수화 — 같은 패턴이 12곳에 있다:
     OrderDesktopTable:136 / OrderMobileCards:82 / OrderDetailDialog:139 /
     LabelPrintView:69 / AdminOrdersTab:184 / PendingDeliveryCard:29 /
     admin/lookup/page:102 / my-orders/page:646 /
     api/auth/send-link:119 / api/admin/orders/remind-deposit:107 / lib/slack:28,169
     → 라벨 인쇄·입금안내 문자·슬랙 알림에도 같은 빈칸이 나갈 수 있다 (추측: 미확인)

## 열린 질문
- 조사 2건을 언제 고칠지 (별도 작업으로 계획서를 새로 만들 것)
- 라벨 인쇄·입금안내 문자·슬랙에도 캠페인 상품명이 빈칸으로 나가는지 실물 확인 필요
