/**
 * 정정 SMS 발송 API 호출 스크립트
 * 
 * 실행: npx tsx scripts/call-correction-sms-api.ts
 */

const API_URL = 'https://www.olttefood.com/api/admin/send-correction-sms';
const ADMIN_PASSWORD = '4423';

async function main() {
  console.log('정정 SMS 발송 API 호출 중...\n');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': ADMIN_PASSWORD,
      },
    });

    console.log(`HTTP Status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    console.log('Response:', responseText.substring(0, 200), '...\n');

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        throw new Error(`API 호출 실패 (${response.status}): ${responseText}`);
      }
      throw new Error(errorData.error || 'API 호출 실패');
    }

    const data = JSON.parse(responseText);

    console.log('✅ API 호출 성공\n');
    console.log('📊 발송 결과:');
    console.log(`   총 ${data.summary.total}건 중`);
    console.log(`   ✅ 성공: ${data.summary.success}건`);
    console.log(`   ❌ 실패: ${data.summary.fail}건\n`);

    console.log('상세 결과:');
    data.results.forEach((result: any) => {
      if (result.success) {
        console.log(`  ✅ ${result.name} (${result.phone}) - ID: ${result.messageId}`);
      } else {
        console.log(`  ❌ ${result.name} (${result.phone}) - 오류: ${result.error}`);
      }
    });

  } catch (error: any) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
