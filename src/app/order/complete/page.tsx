'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle, Copy, Check, AlertCircle, Clock, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { supabase } from '@/lib/supabase';
import { Footer } from '@/components/Footer';
import type { OrderRow, CustomerRow } from '@/types/database';

// ============================================
// Types
// ============================================

interface OrderWithCustomer extends OrderRow {
  customer: CustomerRow;
}

// ============================================
// Page Component
// ============================================

export default function OrderCompletePage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<OrderWithCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 주문 정보 조회
  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) {
        setError('주문 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*, customer:customers(*)')
          .eq('id', orderId)
          .single();

        if (fetchError || !data) {
          throw new Error('주문 정보 조회 실패');
        }

        setOrder(data as OrderWithCustomer);
      } catch (err) {
        console.error('Fetch order error:', err);
        setError('주문 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();

    // 5초마다 가상계좌 정보 폴링 (발급 완료 확인)
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  // 계좌번호 복사
  const handleCopyAccount = async () => {
    if (!order?.vbank_num) return;

    try {
      await navigator.clipboard.writeText(order.vbank_num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // 로딩
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4" />
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

  const hasVirtualAccount = order.vbank_num && order.vbank_bank;

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 pb-8">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-500 text-white p-6 text-center">
        <CheckCircle className="mx-auto h-16 w-16 mb-4" />
        <h1 className="text-2xl font-bold mb-2">주문이 접수되었습니다!</h1>
        <p className="text-green-100">
          입금 확인 후 확정 문자를 보내드립니다
        </p>
      </header>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
        {/* 가상계좌 정보 (강조) */}
        {hasVirtualAccount ? (
          <Card className="bg-white shadow-xl border-2 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <Building2 className="mx-auto h-8 w-8 text-green-600 mb-2" />
                <h2 className="text-lg font-bold text-gray-900">입금 계좌 안내</h2>
              </div>

              <div className="bg-green-50 rounded-2xl p-6 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">은행</p>
                  <p className="text-2xl font-bold text-gray-900">{order.vbank_bank}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">계좌번호</p>
                  <p className="text-3xl font-bold text-green-700 tracking-wider">
                    {order.vbank_num}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">예금주</p>
                  <p className="text-xl font-bold text-gray-900">
                    {order.vbank_holder || '올때만두'}
                  </p>
                </div>

                <div className="text-center pt-2">
                  <p className="text-sm text-gray-500 mb-1">입금 금액</p>
                  <p className="text-4xl font-bold text-red-600">
                    {order.total_amount.toLocaleString()}원
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCopyAccount}
                variant="outline"
                className="w-full mt-4 h-12 text-base"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-5 w-5 text-green-500" />
                    복사 완료!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-5 w-5" />
                    계좌번호 복사하기
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white shadow-xl">
            <CardContent className="pt-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent mx-auto mb-4" />
              <p className="text-gray-600">가상계좌 발급 중...</p>
              <p className="text-sm text-gray-400 mt-2">
                잠시만 기다려주세요
              </p>
            </CardContent>
          </Card>
        )}

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
              <div className="flex justify-between">
                <span className="text-gray-500">배송지</span>
                <span className="font-medium">
                  {order.apt_name} {order.dong}동 {order.ho}호
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">배송 예정일</span>
                <span className="font-medium">
                  {format(new Date(order.delivery_date), 'M월 d일 (EEE)', { locale: ko })}
                </span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span className="text-gray-500">총 수량</span>
                <span className="font-medium">{order.total_qty}개</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="font-medium">결제 금액</span>
                <span className="font-bold text-red-600">
                  {order.total_amount.toLocaleString()}원
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 안내 */}
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>입금 확인 시 자동으로 확정 문자가 발송됩니다.</p>
          <p>문의: 032-832-5012</p>
        </div>
      </div>

      {/* Footer - PG 심사용 사업자 정보 */}
      <Footer />
    </main>
  );
}
