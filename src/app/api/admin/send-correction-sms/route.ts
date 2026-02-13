/**
 * 정정 SMS 발송 API
 * 
 * POST /api/admin/send-correction-sms
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { sendSMS } from '@/lib/sms';

const RECIPIENTS = [
  {
    name: '마리나주민',
    phone: '01000000000',
  },
  {
    name: '김진아',
    phone: '01048165809',
  },
  {
    name: '전글라라',
    phone: '01041391702',
  },
];

const CORRECTION_MESSAGE = `[올때만두]
안녕하세요. 이전 배송완료 문자는 시스템 오류로 잘못 발송되었습니다.

실제 픽업 예정 일시는 별도 안내드린 시간이며, 당일 픽업 준비 완료 시 다시 안내드리겠습니다.

불편을 드려 죄송합니다.
문의: 032-832-5012`;

export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const authError = verifyAdminAuth(request);
    if (authError) return authError;

    const results = [];

    for (const recipient of RECIPIENTS) {
      try {
        console.log(`[정정 SMS] 발송 시작: ${recipient.name} (${recipient.phone})`);
        
        const result = await sendSMS(recipient.phone, CORRECTION_MESSAGE);
        
        if (result.success) {
          console.log(`[정정 SMS] ✅ 발송 성공: ${recipient.name} (ID: ${result.messageId})`);
          results.push({
            name: recipient.name,
            phone: recipient.phone,
            success: true,
            messageId: result.messageId,
          });
        } else {
          console.error(`[정정 SMS] ❌ 발송 실패: ${recipient.name} - ${result.error}`);
          results.push({
            name: recipient.name,
            phone: recipient.phone,
            success: false,
            error: result.error,
          });
        }
        
        // API 속도 제한 방지
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`[정정 SMS] 예외 발생: ${recipient.name}`, error);
        results.push({
          name: recipient.name,
          phone: recipient.phone,
          success: false,
          error: error.message || '알 수 없는 오류',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[정정 SMS] 발송 완료 - 성공: ${successCount}, 실패: ${failCount}`);

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        success: successCount,
        fail: failCount,
      },
      results,
    });
  } catch (error: any) {
    console.error('[정정 SMS API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
