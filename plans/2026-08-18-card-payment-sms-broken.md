# 카드 결제 완료 문자가 6개월간 안 나가고 있다

> **상태: 코드 수정 완료(2026-11-02, 보안 근본수정 R3 커밋 3f2efa2), 실제 문자 확인은 주문 다시 열 때.** 처음 기록: 사장님 결정(2026-08-18) — 웨이팅 시스템을 먼저 하고 이건 나중에.
> 잊지 않으려고 남기는 기록이다.

## 무슨 일인가

`src/app/api/payments/confirm/route.ts:112` 가 `sendOrderNotification(...)` 을 호출한다.
그런데 **그 함수는 어디에도 정의되어 있지 않다.**

```
src/app/api/payments/confirm/route.ts:11   import { sendOrderNotification } from '@/lib/sms';
src/app/api/payments/confirm/route.ts:112  await sendOrderNotification({ ... });
```

`src/lib/sms.ts` 가 export 하는 것 (2026-08-18 실측, 15개):
`sendSMS` · `sendBulkSMS` · `createVerificationSMS` · `createVirtualAccountSMS` ·
`createPaymentConfirmSMS` · `createShippingSMS` · `createDeliveredSMS` ·
`createRefundAccountRequestSMS` · `createRefundCompleteSMS` · `createDepositReminderSMS` ·
`createPickupTimeChangeSMS` · `createPickupTimeRequestSMS` · `createCancellationSMS` ·
`SMSResult` · `OrderItemForSMS`

→ `sendOrderNotification` **없음.** `src/` 전체 grep 결과 import 1곳 + 호출 1곳이 전부고 정의는 0건.

## 왜 아무도 몰랐나

두 가지가 겹쳤다.

1. **`next.config.mjs:5` `typescript.ignoreBuildErrors: true`**
   (그리고 `:9` `eslint.ignoreDuringBuilds: true`)
   → 없는 함수를 import 해도 **빌드가 통과한다.** 타입 검사가 이걸 잡았어야 했다.

2. **`route.ts:124-127` 의 catch 가 에러를 삼킨다**
   ```ts
   } catch (smsError) {
     // SMS 실패는 로그만 남기고 계속 진행
     console.error('[API] SMS error:', smsError);
   }
   ```
   → 결제는 정상 완료되고 **문자만 조용히 실패**한다. 화면에도 Slack 에도 티가 안 난다.
   (Slack 알림은 바로 아래 별도 try 블록이라 정상 발송된다 — 그래서 "주문은 들어오는데"
    사장님 눈에는 아무 문제가 없어 보였다.)

## 피해 범위 (2026-08-18 실측)

`orders` 최근 123건 (2026-02-01 ~ 2026-07-09):

| 결제수단 | 건수 | 문자 |
|---|---|---|
| `card` | **60** | ❌ 안 나감 (이 버그) |
| `vbank` | 62 | ✅ 정상 (`webhooks/tosspayments` 가 `createPaymentConfirmSMS` 사용) |
| `pos_card` | 1 | — |

카드 결제 기간: **2026-02-20 ~ 2026-07-09**.
→ 그 사이 카드로 결제한 손님 **약 60팀이 결제완료 문자를 못 받았다.**

**추측**: 마지막 카드 결제가 7/9 이고 그 뒤로 주문이 없다. 지금 이 사이트가 활발히
쓰이지 않는 것으로 보인다. 그래서 당장의 급함은 낮다고 판단했다(사장님 결정).

## 고칠 때 할 일

- [x] `sendOrderNotification` 을 만들거나, 기존 `createPaymentConfirmSMS` 로 호출부를 고친다 — 2026-11-02 3f2efa2 (가상계좌와 같은 문구)
      (가상계좌 경로가 이미 쓰는 함수다 — 문구 일관성 면에서 이쪽이 낫다)
- [ ] (주문 다시 열 때 체크리스트에 넣음) 고친 뒤 **실제로 문자가 오는지 사장님 번호로 테스트 결제 1건**
- [x] `catch` 가 삼키는 문제 — 2026-11-02 3f2efa2 src/lib/smsAlert.server.ts: 문자 실패(예외·success:false) 시 슬랙 알림. 결제 승인·가상계좌·웹훅 세 곳 — 최소한 Slack 으로 실패를 알리게 (지금은 Vercel 로그에만 남는다)
- [x] **`ignoreBuildErrors: true` 를 끄는 것** — 2026-11-02 타입 오류 276 → 120 → 0 (3798fe1·cd30989), 끔(9b64dd3). 이제 없는 함수를 부르면 배포 빌드가 실패한다. 정리 중 진짜 버그 2건 더 나옴(5bb92b3): 주문 취소 슬랙 알림이 조용히 실패, /pickup 오류 표시 때 화면 깨짐. 이게 근본 원인이다.
      끄면 기존 타입 오류가 무더기로 나올 수 있으니 별도 작업으로 크기를 재야 한다
- [ ] 과거 60건에 사후 안내를 보낼지 → **사장님 판단 사항** (아직 안 정함)

## 관련

- 웨이팅 시스템에서 `sms.ts` 를 재사용한다. 계획서: `oltte-waiting-dev/plans/001-*.md`
  거기서는 이 사고를 근거로 **발송 이력 테이블 + 실패를 화면에 드러내기**를 처음부터 넣는다
- 같은 성격의 과거 사고: `plans/noodle-discount-correction-sms.md` (할인 누락 → 사과 문자),
  `plans/admin-detail-delivered-sms-cleanup.md` (철 지난 시즌 문구가 계속 발송됨)
