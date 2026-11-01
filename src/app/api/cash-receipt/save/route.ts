import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { issueCashReceipt } from '@/lib/tosspayments';
import { sendSlackAlert } from '@/lib/slack';
import { verifyOrderToken, isManduOrder, getSessionPhone } from '@/lib/orderAccess.server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 현금영수증 정보 저장 API
 * 
 * POST /api/cash-receipt/save
 * 
 * Body:
 * - orderId: 주문 ID
 * - type: '소득공제' | '지출증빙'
 * - number: 등록번호 (휴대폰번호 또는 사업자번호)
 * - t: 주문 열쇠 (또는 번호 인증 쿠키의 전화번호가 이 주문 고객과 같을 때 — 내 주문 화면)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, type, number, t } = body;

    // 입력 검증
    if (!orderId || !type || !number) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const digits = String(number).replace(/[^0-9]/g, '');
    if (digits.length < 10 || digits.length > 11) {
      return NextResponse.json(
        { error: '등록번호 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    if (type !== '소득공제' && type !== '지출증빙') {
      return NextResponse.json(
        { error: '유형은 "소득공제" 또는 "지출증빙"이어야 합니다.' },
        { status: 400 }
      );
    }

    // 주문 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[CashReceipt] Order not found:', orderError);
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 만두 주문만, 그리고 주인만 (주문 열쇠 또는 번호 인증 쿠키)
    const tokenOk = verifyOrderToken(orderId, typeof t === 'string' ? t : null);
    const sessionPhone = getSessionPhone(request);
    const sessionOk = !!sessionPhone && (order.customer as any)?.phone === sessionPhone;
    if (!isManduOrder(order as any) || !(tokenOk || sessionOk)) {
      // 존재 여부를 알려주지 않도록 같은 응답
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: tokenOk || sessionOk ? 404 : 403 }
      );
    }

    // 현금영수증 정보 저장
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        cash_receipt_type: type,
        cash_receipt_number: digits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[CashReceipt] Update failed:', updateError);
      return NextResponse.json(
        { error: '저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 입금 완료 상태인 경우 즉시 발급 시도
    if (order.status === 'PAID' && order.toss_payment_key) {
      try {
        console.log('[CashReceipt] Order is paid, issuing cash receipt immediately');
        
        const cashReceiptData = await issueCashReceipt({
          orderId: order.id,
          amount: order.total_amount,
          orderName: `올때만두 - ${order.apt_name}`,
          customerName: order.customer.name,
          type,
          customerIdentityNumber: digits,
        });

        // 발급 성공 시 정보 저장
        await supabase
          .from('orders')
          .update({
            cash_receipt_issued: true,
            cash_receipt_url: cashReceiptData.receiptUrl,
            cash_receipt_key: cashReceiptData.receiptKey,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        console.log('[CashReceipt] Issued successfully for order', orderId);

        return NextResponse.json({
          success: true,
          issued: true,
          receiptUrl: cashReceiptData.receiptUrl,
        });
      } catch (issueError: any) {
        console.error('[CashReceipt] Issue failed:', issueError);
        
        // Slack 알림
        await sendSlackAlert({
          title: '⚠️ 현금영수증 즉시 발급 실패',
          fields: [
            { title: '주문 ID', value: orderId },
            { title: '고객명', value: order.customer.name },
            { title: '금액', value: `${order.total_amount.toLocaleString()}원` },
            { title: '유형', value: type },
            { title: '오류', value: issueError.message },
          ],
        });

        // 발급 실패해도 정보는 저장되었으므로 성공으로 반환 (웹훅에서 재시도)
        return NextResponse.json({
          success: true,
          issued: false,
          message: '신청은 완료되었으나 발급 중 오류가 발생했습니다. 나중에 자동으로 재시도됩니다.',
        });
      }
    }

    // 아직 입금되지 않은 경우
    return NextResponse.json({
      success: true,
      issued: false,
      message: '입금 확인 시 자동으로 발급됩니다.',
    });

  } catch (error: any) {
    console.error('[CashReceipt] Save error:', error);
    return NextResponse.json(
      { error: error.message || '저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
