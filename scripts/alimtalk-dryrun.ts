/**
 * 알림톡 dry-run — 가짜 주문으로 솔라피에 보낼 본문을 출력만 한다(발송 없음, 번호 가림).
 * 실행: SOLAPI_KAKAO_PFID_MANDU=pf SOLAPI_SENDER_NUMBER=0200000000 ORDER_TOKEN_SECRET=x npx tsx scripts/alimtalk-dryrun.ts
 */
import { buildPayload, variablesFor, TEMPLATES, type AlimtalkKey } from '../src/lib/alimtalk';
import type { JacheOrder } from '../src/lib/jache/orderStore.server';

const fake = {
  id: 'JC261126ABCDEFGHJK', orderDate: '2026-11-26', dailyNo: 7, orderNumber: '앱-007', status: 'POS_OK', test: false,
  phone: '01012345678',
  lines: [{ title: '왕 고기만두', qty: 2 }, { title: '교자 김치', qty: 1 }],
  listPrice: 21000, discountAmount: 1000, totalAmount: 20000, pickup: 'm10', pickupLabel: '17:12쯤 (10분 뒤)', requests: [],
} as unknown as JacheOrder;

for (const key of Object.keys(TEMPLATES) as AlimtalkKey[]) {
  const b = buildPayload({ to: fake.phone, templateKey: key, variables: variablesFor(key, fake, { reason: '재료 소진', readyAt: new Date().toISOString() }) });
  if (!b.ok) { console.log(key, 'ERROR', b.error); continue; }
  const body: any = JSON.parse(JSON.stringify(b.body));
  body.messages[0].to = body.messages[0].to.slice(0, 3) + '****' + body.messages[0].to.slice(-4);
  console.log(`--- ${key}`);
  console.log(JSON.stringify(body, null, 1));
}
