/**
 * 떡국떡 건조 이슈 안내 SMS 발송 스크립트
 * 
 * 대상: 떡국떡(ricecake_1kg)을 주문하고 배송/픽업 완료(DELIVERED)된 고객
 * 
 * 실행:
 *   테스트: npx tsx scripts/send-ricecake-issue-sms.ts --test
 *   실제:  npx tsx scripts/send-ricecake-issue-sms.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 파일 직접 읽기
try {
  const envPath = resolve(__dirname, '../.env.local');
  const envContent = readFileSync(envPath, 'utf-8');

  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;

    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });

  // 발신번호를 등록된 번호로 설정
  process.env.SOLAPI_SENDER_NUMBER = '01025924423';

  console.log('환경변수 로드 완료\n');
} catch (error) {
  console.error('.env.local 파일을 읽을 수 없습니다:', error);
  process.exit(1);
}

import { createClient } from '@supabase/supabase-js';

const TEST_MODE = process.argv.includes('--test');
const TEST_PHONE = '01035804423';

const MESSAGE = `[올때만두] 안내드립니다. 이번 설 예약 판매 떡국떡 관련 건조 상태 이슈 확인 중입니다.

안녕하세요, 올때만두입니다.
이번 설 기획으로 판매한 떡국떡 중 일부에서 "너무 건조되어 조리해도 말랑해지지 않는" 사례가 1건 접수되어, 같은 문제가 있을 수 있는 제품이 있는지 즉시 확인 안내드립니다.

현재 확인된 증상(예시)
- 1시간 이상 물에 불린 뒤 30분 이상 끓여도 떡이 단단한 상태로 남아 말랑해지지 않음

해당 문제가 있을 수 있는 기간
- 2/14(토) 저녁 6시 전후 구매/수령하신 분 중 일부 가능성 확인 중입니다.
(정확한 범위는 추가 확인되는 대로 바로 업데이트하겠습니다.)

집에서 바로 확인하는 방법(간단 체크)
1) 미지근한 물에 30분 정도 불렸는데도 계속 돌처럼 단단함. 접히지도 않음.
2) 끓여도 표면만 불고 속이 굳은 느낌이 강함

위와 비슷한 증상이 있으면, 드시기 전에 꼭 연락 주세요.
문제가 확인되는 경우 해당 제품은 전액 환불로 처리해드리겠습니다.
(문제가 없는 제품까지 일괄 환불이 아니라, "문제가 있는 떡을 수령하신 분"만 빠르게 책임 처리하는 방식으로 진행하겠습니다.)

연락 주실 때 이렇게 보내주시면 가장 빠릅니다
- 구매(수령)일시: 2/14(토) 6시 전후 등
- 수령 방식: 매장/배송
- 증상: "불려도 안 말랑해짐" 등 한 줄
- 가능하면 사진 1장(떡 상태/조리 후 상태 중 아무거나)

설 전날이라 모임에서 떡국을 준비하실 수 있어 걱정되어, 급하게 안내드립니다.
불편 없도록 빠르게 확인하고, 문제가 있는 경우는 책임 있게 처리하겠습니다.

죄송하고, 감사합니다.
올때만두 드림`;

async function fetchRecipients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1) 떡국떡이 포함된 DELIVERED 주문 조회
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, customer_id, delivery_date, is_pickup, pickup_date')
    .eq('status', 'DELIVERED');

  if (ordersError) {
    console.error('주문 조회 실패:', ordersError);
    process.exit(1);
  }

  if (!orders || orders.length === 0) {
    console.log('DELIVERED 상태 주문이 없습니다.');
    return [];
  }

  // 2) 해당 주문 중 떡국떡 포함 주문 ID 필터
  const orderIds = orders.map(o => o.id);
  const { data: ricecakeItems, error: itemsError } = await supabase
    .from('order_items')
    .select('order_id')
    .in('order_id', orderIds)
    .eq('sku', 'ricecake_1kg');

  if (itemsError) {
    console.error('주문 상품 조회 실패:', itemsError);
    process.exit(1);
  }

  const ricecakeOrderIds = new Set((ricecakeItems || []).map(i => i.order_id));
  const targetOrders = orders.filter(o => ricecakeOrderIds.has(o.id));

  if (targetOrders.length === 0) {
    console.log('떡국떡 포함 DELIVERED 주문이 없습니다.');
    return [];
  }

  // 3) 고객 정보 조회
  const customerIds = [...new Set(targetOrders.map(o => o.customer_id))];
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, name, phone')
    .in('id', customerIds);

  if (customersError) {
    console.error('고객 조회 실패:', customersError);
    process.exit(1);
  }

  const customerMap = new Map((customers || []).map(c => [c.id, c]));

  // 4) 중복 전화번호 제거 (같은 고객이 여러 주문 가능)
  const phoneSet = new Set<string>();
  const recipients: { name: string; phone: string; deliveryDate: string; isPickup: boolean }[] = [];

  for (const order of targetOrders) {
    const customer = customerMap.get(order.customer_id);
    if (!customer) continue;

    const phone = customer.phone.replace(/[^0-9]/g, '');
    if (phoneSet.has(phone)) continue;
    phoneSet.add(phone);

    recipients.push({
      name: customer.name.trim(),
      phone,
      deliveryDate: order.pickup_date || order.delivery_date,
      isPickup: order.is_pickup,
    });
  }

  return recipients;
}

async function main() {
  console.log('='.repeat(50));
  console.log(TEST_MODE ? '[ 테스트 모드 ] 관리자 번호로만 발송합니다' : '[ 실제 발송 모드 ]');
  console.log('='.repeat(50));
  console.log();

  const recipients = await fetchRecipients();
  console.log(`대상 고객 수: ${recipients.length}명\n`);

  if (recipients.length === 0) {
    console.log('발송 대상이 없습니다.');
    return;
  }

  // 대상 고객 목록 출력
  console.log('--- 대상 고객 목록 ---');
  for (const r of recipients) {
    const type = r.isPickup ? '픽업' : '배송';
    console.log(`  ${r.name} | ${r.phone} | ${type} | ${r.deliveryDate}`);
  }
  console.log('---\n');

  // 메시지 길이 확인
  console.log(`메시지 길이: ${MESSAGE.length}자 (${MESSAGE.length > 90 ? 'LMS' : 'SMS'})\n`);

  // 환경변수 로드 후 동적 import (모듈 초기화 시 env 참조하므로)
  const { sendSMS } = await import('../src/lib/sms');

  if (TEST_MODE) {
    console.log(`테스트 발송: ${TEST_PHONE}\n`);
    const result = await sendSMS(TEST_PHONE, MESSAGE);
    if (result.success) {
      console.log(`발송 성공 (ID: ${result.messageId})`);
    } else {
      console.error(`발송 실패: ${result.error}`);
    }
    console.log(`\n실제 발송 시: npx tsx scripts/send-ricecake-issue-sms.ts`);
    return;
  }

  // 실제 발송 (01035804423도 포함)
  const EXTRA_PHONE = '01035804423';
  const extraIncluded = recipients.some(r => r.phone === EXTRA_PHONE);
  if (!extraIncluded) {
    recipients.push({ name: '추가발송', phone: EXTRA_PHONE, deliveryDate: '', isPickup: false });
    console.log(`추가 수신자 포함: ${EXTRA_PHONE}\n`);
  }

  let successCount = 0;
  let failCount = 0;

  for (const recipient of recipients) {
    const type = recipient.isPickup ? '픽업' : '배송';
    process.stdout.write(`${recipient.name} (${recipient.phone}, ${type}) ... `);

    try {
      const result = await sendSMS(recipient.phone, MESSAGE);

      if (result.success) {
        successCount++;
        console.log(`성공 (ID: ${result.messageId})`);
      } else {
        failCount++;
        console.log(`실패: ${result.error}`);
      }

      // API 속도 제한 방지를 위해 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      failCount++;
      console.log(`예외: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`발송 완료 - 성공: ${successCount}, 실패: ${failCount}, 총: ${recipients.length}`);
  console.log('='.repeat(50));
}

main().catch(console.error);
