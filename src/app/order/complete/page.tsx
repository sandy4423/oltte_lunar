'use client';

import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

import { Footer } from '@/components/Footer';
import { useOrderPolling } from '@/hooks/useOrderPolling';
import { VirtualAccountCard } from '@/components/features/VirtualAccountCard';
import { CardPaymentButton } from '@/components/features/CardPaymentButton';
import { STORE_INFO } from '@/lib/constants';

// ============================================
// Page Component
// ============================================

export default function OrderCompletePage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  // 주문 폴링 훅
  const { order, loading, error } = useOrderPolling(orderId);

  // 로딩
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-amber-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">주문 정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  // 에러
  if (error || !order) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-red-50 to-orange-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-xl font-bold mb-2">오류가 발생했습니다</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const hasVirtualAccount = Boolean(order.vbank_num && order.vbank_bank);

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-8">
      {/* 헤더 */}
      <header className="bg-brand text-white p-6 text-center">
        <CheckCircle className="mx-auto h-16 w-16 mb-4" />
        <h1 className="text-2xl font-bold mb-2">주문이 접수되었습니다!</h1>
        <p className="text-orange-100">
          입금 확인 후 확정 문자를 보내드립니다
        </p>
      </header>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
        {/* 가상계좌 정보 (강조) */}
        <VirtualAccountCard
          hasVirtualAccount={hasVirtualAccount}
          vbankBank={order.vbank_bank || null}
          vbankNum={order.vbank_num || null}
          vbankHolder={order.vbank_holder || null}
          totalAmount={order.total_amount}
        />

        {/* 카드 결제 버튼 - 가상계좌 대신 카드로 결제 */}
        {/* 임시 숨김: PG 승인 대기 중 */}
        {/* {order.status === 'WAITING_FOR_DEPOSIT' && (
          <CardPaymentButton
            orderId={order.id}
            amount={order.total_amount}
            orderName={`올때만두 - ${order.apt_name}`}
            customerName={order.customer.name}
          />
        )} */}

        {/* 입금 마감 시간 (강조) */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-orange-600 font-medium">입금 마감</p>
                <p className="text-xl font-bold text-orange-700">
                  {format(new Date(order.cutoff_at), 'M월 d일 (EEE) HH:mm', { locale: ko })}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-orange-600">
              ⚠️ 마감 시간까지 입금하지 않으시면 자동 취소됩니다.
            </p>
          </CardContent>
        </Card>

        {/* 주문 상세 */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-bold text-lg mb-4">주문 정보</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">주문자</span>
                <span className="font-medium">{order.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">연락처</span>
                <span className="font-medium">{order.customer.phone}</span>
              </div>
              {order.is_pickup ? (
                <div className="flex justify-between">
                  <span className="text-gray-500">픽업 장소</span>
                  <span className="font-medium text-right">
                    {STORE_INFO.address}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-500">배송지</span>
                  <span className="font-medium">
                    {order.apt_name} {order.dong}동 {order.ho}호
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{order.is_pickup ? '픽업 예정일' : '배송 예정일'}</span>
                <span className="font-medium">
                  {format(new Date(order.delivery_date), 'M월 d일 (EEE)', { locale: ko })}
                </span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span className="text-gray-500">총 수량</span>
                <span className="font-medium">{order.total_qty}개</span>
              </div>
              {order.is_pickup && order.pickup_discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>픽업 할인</span>
                  <span className="font-medium">-{order.pickup_discount.toLocaleString()}원</span>
                </div>
              )}
              <div className="flex justify-between text-base">
                <span className="font-medium">결제 금액</span>
                <span className="font-bold text-brand">
                  {order.total_amount.toLocaleString()}원
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 안내 */}
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>입금 확인 시 자동으로 확정 문자가 발송됩니다.</p>
          <p className="text-xs text-gray-400">문의: 010-2592-4423</p>
        </div>
      </div>

      {/* Footer - PG 심사용 사업자 정보 */}
      <Footer />
    </main>
  );
}
