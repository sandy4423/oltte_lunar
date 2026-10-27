/**
 * 만두 온라인 주문 스위치 (2026-10-28 사장님 「만두 주문 페이지 일단 닫아」).
 *
 * false 인 동안:
 *  - src/middleware.ts 가 손님 주문 화면(/, /order, /pickup, /dangol, /my-orders)을
 *    /closed 안내 화면으로 바꿔 보여 준다 (주소창은 그대로)
 *  - 주문·결제·손님 조회 API 는 503 + CLOSED_MESSAGE 를 돌려준다
 *  - 토스 웹훅은 200 만 응답하고 주문을 「결제 완료」로 바꾸지 않는다 (슬랙 알림만)
 *
 * ⛔ 다시 열기 전에 plans/2026-10-28-만두주문-보안-근본수정.md 의 「근본 수정」을
 *    먼저 끝내야 한다. 지금 코드(브라우저가 공개 키로 orders/customers 에 직접 쓰고 읽음)는
 *    DB 잠금(2026-10-28) 이후로는 열어도 주문이 실패한다.
 * 다시 열기: 아래 값을 true 로 바꾸고 커밋·푸시.
 */
export const ORDERING_OPEN = false;

export const CLOSED_MESSAGE = '지금은 온라인 주문을 쉬고 있어요. 매장으로 와 주세요.';
