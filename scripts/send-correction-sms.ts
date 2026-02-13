/**
 * 잘못 발송된 배송완료 SMS 정정 발송 스크립트
 * 
 * 실행: npx tsx scripts/send-correction-sms.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 파일 직접 읽기
try {
  const envPath = resolve(__dirname, '../.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  
  // 각 줄을 파싱하여 환경변수 설정
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;
    
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
  
  console.log('환경변수 로드 완료\n');
} catch (error) {
  console.error('.env.local 파일을 읽을 수 없습니다:', error);
  process.exit(1);
}

import { sendSMS } from '../src/lib/sms';

const RECIPIENTS = [
  {
    name: '마리나주민',
    phone: '01000000000',
    pickupDate: '2/12',
    note: '어제 픽업 예정이었음',
  },
  {
    name: '김진아',
    phone: '01048165809',
    pickupDate: '2/13',
    note: '오늘 픽업 예정',
  },
  {
    name: '전글라라',
    phone: '01041391702',
    pickupDate: '2/13',
    note: '오늘 픽업 예정',
  },
];

const CORRECTION_MESSAGE = `[올때만두]
안녕하세요. 이전 배송완료 문자는 시스템 오류로 잘못 발송되었습니다.

실제 픽업 예정 일시는 별도 안내드린 시간이며, 당일 픽업 준비 완료 시 다시 안내드리겠습니다.

불편을 드려 죄송합니다.
문의: 032-832-5012`;

async function main() {
  console.log('정정 SMS 발송 시작...\n');

  for (const recipient of RECIPIENTS) {
    console.log(`📤 ${recipient.name} (${recipient.phone}) - ${recipient.note}`);
    
    try {
      const result = await sendSMS(recipient.phone, CORRECTION_MESSAGE);
      
      if (result.success) {
        console.log(`✅ 발송 성공 (ID: ${result.messageId})\n`);
      } else {
        console.error(`❌ 발송 실패: ${result.error}\n`);
      }
      
      // API 속도 제한 방지를 위해 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ 예외 발생:`, error);
    }
  }

  console.log('모든 SMS 발송 완료');
}

main().catch(console.error);
