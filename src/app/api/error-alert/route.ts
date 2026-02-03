/**
 * 에러 알림 API
 * 
 * 클라이언트에서 발생한 에러를 Slack으로 전송합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendSlackMessage, createErrorAlert } from '@/lib/slack';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errorType, errorMessage, orderId, customerName, customerPhone, aptName } = body;

    await sendSlackMessage(createErrorAlert({
      errorType,
      errorMessage,
      orderId,
      customerName,
      customerPhone,
      aptName,
      timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Error Alert API]', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
