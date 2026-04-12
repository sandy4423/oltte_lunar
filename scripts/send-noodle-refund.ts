/**
 * 칼국수 할인 누락 정정 안내 SMS 발송 스크립트 (일회성)
 *
 * 배경:
 * 2026-04-10 ~ 04-11 단골톡방(source='dangol') 주문 중, 서버측 할인 계산에
 * 칼국수 500원 할인 로직이 누락되어 6건의 주문에서 500원씩 과결제됨.
 * 그 중 1건(사장님 아내분 성하경)은 제외 → 5명에게 현금 환급 안내 발송.
 *
 * 실행:
 *   테스트: npx tsx scripts/send-noodle-refund.ts --test
 *   실제:  npx tsx scripts/send-noodle-refund.ts
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
      let value = valueParts.join('=').trim();
      // 양쪽 따옴표 제거 (vercel env pull 결과는 "..." 형식)
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
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

const TEST_MODE = process.argv.includes('--test');
const TEST_PHONE = '01035804423';

// 대상 명단 (plans/noodle-discount-correction-sms.md 기준)
// choi hyokyung → 최효경으로 치환
const RECIPIENTS: { name: string; phone: string }[] = [
  { name: '최홍경', phone: '01064331523' },
  { name: '김강문', phone: '01043305051' },
  { name: '구태희', phone: '01027401601' },
  { name: '변영만', phone: '01023310412' },
  { name: '최효경', phone: '01091187290' },
];

function buildMessage(name: string): string {
  return `[올때만두]
안녕하세요 ${name}님 올때만두입니다.

단골톡방 할인 계산에 시스템 오류가 있어
칼국수 500원 할인이 누락되어 결제되었습니다.
세심하지 못해 정말 죄송합니다.

다음 매장 방문 시 현금 500원으로
돌려드리겠습니다. 영수증 없이 이 문자만
보여주시면 됩니다.

불편 드려 죄송합니다.
올때만두 사장 드림
문의: 010-5877-4424`;
}

async function main() {
  console.log('='.repeat(50));
  console.log(TEST_MODE ? '[ 테스트 모드 ] 관리자 번호로 1건만 발송' : '[ 실제 발송 모드 ]');
  console.log('='.repeat(50));
  console.log();

  // 대상 고객 목록 출력
  console.log('--- 대상 고객 목록 ---');
  for (const r of RECIPIENTS) {
    console.log(`  ${r.name} | ${r.phone}`);
  }
  console.log('---\n');

  // 샘플 메시지 길이 확인
  const sample = buildMessage('홍길동');
  console.log(`샘플 메시지 (${sample.length}자, ${sample.length > 90 ? 'LMS' : 'SMS'}):`);
  console.log('---');
  console.log(sample);
  console.log('---\n');

  // 환경변수 로드 후 동적 import
  const { sendSMS } = await import('../src/lib/sms');

  if (TEST_MODE) {
    // 테스트: 관리자 번호로 첫 번째 수신자 이름을 사용한 메시지 1건만 발송
    const testName = RECIPIENTS[0].name;
    const testMessage = buildMessage(testName);
    console.log(`테스트 발송 → ${TEST_PHONE} (이름: ${testName})\n`);
    const result = await sendSMS(TEST_PHONE, testMessage);
    if (result.success) {
      console.log(`성공 (ID: ${result.messageId})`);
    } else {
      console.error(`실패: ${result.error}`);
    }
    console.log(`\n실제 발송: npx tsx scripts/send-noodle-refund.ts`);
    return;
  }

  // 실제 발송
  let successCount = 0;
  let failCount = 0;

  for (const recipient of RECIPIENTS) {
    process.stdout.write(`${recipient.name} (${recipient.phone}) ... `);

    try {
      const message = buildMessage(recipient.name);
      const result = await sendSMS(recipient.phone, message);

      if (result.success) {
        successCount++;
        console.log(`성공 (ID: ${result.messageId})`);
      } else {
        failCount++;
        console.log(`실패: ${result.error}`);
      }

      // Solapi rate limit 방지: 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      failCount++;
      console.log(`예외: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`발송 완료 - 성공: ${successCount}, 실패: ${failCount}, 총: ${RECIPIENTS.length}`);
  console.log('='.repeat(50));
}

main().catch(console.error);
