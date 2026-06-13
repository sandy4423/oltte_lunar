# 2026-06-13~14 단톡방 전용 만두전골 이벤트

## 이벤트 정보

- **기간:** 2026년 6월 13일(토) ~ 14일(일)
- **대상:** 단톡방 고객 (페이지 진입 시 자동 적용)
- **공유 URL:** `https://olttefood.com/dangol`
- **할인:**
  - 만두전골 -2,000원/개 (`DANGOL_DISCOUNT_PER_ITEM`)
  - 칼국수 -500원/개 (`NOODLE_DISCOUNT_PER_ITEM`, 유지)
  - 픽업 추가 할인 -3,000원 (`PICKUP_DISCOUNT`, 3만원 이상)
- **할인 적용 메뉴:**
  - 시원 만두전골 (15,900 → 13,900)
  - 얼큰 만두전골 (17,900 → 15,900)
  - 칼국수 (2,000 → 1,500)
- **픽업 시간:** 09:00 ~ 21:00 (1시간 단위, 기존 슬롯 유지)
- **수령:** 매장 픽업만 (배송 없음)

## 변경 파일

### 1. `src/lib/constants.ts`
- `PICKUP_EVENT_DATES` 를 `['2026-04-11', '2026-04-12']` → `['2026-06-13', '2026-06-14']` 로 교체
- 주석 한 줄 추가: "2026-06-13/14 단톡방 만두전골 이벤트"
- 그 외 상수(`DANGOL_DISCOUNT_PER_ITEM`, `NOODLE_DISCOUNT_PER_ITEM`, `PICKUP_EVENT_TIME_SLOTS` 등)는 변경 없음

### 2. `src/app/dangol/page.tsx`
- 단지 9개 버튼 (`APARTMENT_LIST.map(...)`) **숨김** (조건부 렌더링, 삭제 X — 다음 이벤트 재활용 가능)
- "혹시 픽업도 고려중이신가요?" 재진입 섹션 **숨김**
- 상단 픽업 안내 카드("매장 픽업 주문" Link) **숨김** (단일 CTA에 통합)
- "주말 만두전골 예약 주문" 안내 섹션 **숨김** (단일 CTA에 통합)
- **단일 CTA 추가:** "**6월 13-14일 만두전골 주문하기**" 큰 버튼 → `/order`
  - sessionStorage `traffic_source='dangol'` 은 이미 페이지 로드 시 자동 저장됨 → 단톡방 할인 정상 적용
- **이벤트 안내 텍스트:**
  - "단톡방 전용 만두전골 픽업 이벤트"
  - "2026년 6월 13일(토) · 14일(일) 한정"
  - 정상 → 할인 가격 표시
  - "매장 픽업만 가능 · 09:00~21:00"
- **6/14 12:00 이후 자동 만료 가드:** `getAvailableEventDates()` 결과가 빈 배열이면 "이벤트가 종료되었습니다" 메시지 표시 + CTA 숨김 (또는 픽업 페이지 안내)

## 만료 처리 방식

- **자동 (1차 방어):** `getOrderCutoffForDate('2026-06-14')` = `2026-06-14T12:00:00+09:00`
  - 14일 12:00 KST 이후 `getAvailableEventDates()` 빈 배열 반환
  - `/dangol` CTA 자동 비활성화 + 안내 표시
  - `/order` 에서도 `isEventClosed` 분기로 "예약이 마감되었습니다" 카드 노출 (기존 코드)
- **수동 (필요 시):** 14일 종료 후 다음 이벤트 일정으로 `PICKUP_EVENT_DATES` 교체 또는 빈 배열로 비움

## 롤백 / 후속 이벤트

다음 이벤트 일정이 정해지면:
1. `src/lib/constants.ts` 의 `PICKUP_EVENT_DATES` 교체
2. `src/app/dangol/page.tsx` 의 단일 CTA 버튼 라벨 (`"6월 13-14일 ..."` 부분) 교체
3. 단지 9개 버튼을 다시 노출하려면 `SHOW_APT_BUTTONS = true` 토글 (코드 내 상수)

## 배포 흐름

- `master` 브랜치 푸시 → Vercel auto deploy
- 배포 URL: `https://olttefood.com/dangol`
- 사장님이 단톡방에 공유할 링크: `https://olttefood.com/dangol`

## 검증

- `npm run build` 통과
- 로컬: `/dangol` 진입 → 단지 버튼 숨김 + 단일 CTA → 클릭 → `/order` → 단톡방 할인 자동 적용 확인 (sessionStorage)
- 6/14 12:00 이후 동작: `getAvailableEventDates()` 빈 배열 → CTA 숨김 + 종료 안내
