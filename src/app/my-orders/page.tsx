'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Phone, ShieldCheck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Footer } from '@/components/Footer';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { ORDER_STATUS_LABEL, getProductBySku, PICKUP_APT_CODE } from '@/lib/constants';
import { trackPageView } from '@/lib/trackPageView';

// ============================================
// 주문내역 조회 페이지
// ============================================

export default function MyOrdersPage() {
  // 페이지 방문 추적
  useEffect(() => {
    trackPageView('/my-orders');
  }, []);

  // 전화번호 인증 훅
  const verification = usePhoneVerification();

  // 주문 데이터 상태
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 인증 완료 시 주문 조회
  useEffect(() => {
    console.log('[MyOrders] useEffect triggered - isPhoneVerified:', verification.isPhoneVerified);
    if (verification.isPhoneVerified) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verification.isPhoneVerified]);

  const fetchOrders = async (retryCount = 0) => {
    console.log('[MyOrders] fetchOrders 호출 시작', {
      phone: verification.phone,
      attempt: retryCount,
    });

    setLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(
        `/api/orders/my?phone=${encodeURIComponent(verification.phone)}`
      );
      const result = await response.json();

      console.log('[MyOrders] API 응답', {
        status: response.status,
        success: result.success,
        ordersCount: result.data?.length || 0,
        error: result.error,
      });

      // 서버 디버그 정보 출력
      if (result._debug) {
        console.log('[MyOrders] 🔍 Server Debug Info:', result._debug);
      }

      // 401 에러이고 첫 시도인 경우 재시도
      if (response.status === 401 && retryCount === 0) {
        console.log('[MyOrders] 401 error, retrying after 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return fetchOrders(1);
      }

      if (!response.ok || !result.success) {
        console.error('[MyOrders] 주문 조회 실패', result.error);
        setFetchError(result.error || '주문 조회에 실패했습니다.');
        return;
      }

      console.log('[MyOrders] 주문 목록 설정 완료:', result.data?.length || 0, '건');
      setOrders(result.data || []);
    } catch (error) {
      console.error('[MyOrders] fetchOrders 예외 발생:', error);
      setFetchError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-12">
      {/* 헤더 */}
      <header className="bg-brand text-white p-6 shadow-lg">
        <div className="max-w-lg mx-auto text-center">
          <div className="flex justify-center mb-1">
            <Image
              src="/images/logo.png"
              alt="올때만두"
              width={200}
              height={53}
              priority
            />
          </div>
          <p className="text-orange-100 text-sm">주문내역 확인</p>
        </div>
      </header>

      {/* 홈으로 돌아가기 */}
      <div className="max-w-lg mx-auto px-4 py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          홈으로 돌아가기
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {!verification.isPhoneVerified ? (
          /* ===== Step 1: 전화번호 인증 ===== */
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center mb-4">
                <ShieldCheck className="h-10 w-10 text-brand mx-auto mb-2" />
                <h2 className="text-lg font-bold">주문내역 조회</h2>
                <p className="text-sm text-gray-500 mt-1">
                  주문 시 사용한 전화번호를 인증해주세요
                </p>
              </div>

              {/* 전화번호 입력 */}
              <div>
                <Label htmlFor="phone" className="text-sm font-semibold">
                  전화번호
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="01012345678"
                    value={verification.phone}
                    onChange={(e) => verification.setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    disabled={verification.verificationSent}
                    className="h-11 flex-1"
                    maxLength={11}
                  />
                  <Button
                    onClick={verification.handleSendVerification}
                    disabled={verification.isSending || verification.isPhoneVerified}
                    className="h-11 px-4 whitespace-nowrap"
                  >
                    {verification.isSending
                      ? '발송 중...'
                      : verification.verificationSent
                      ? '재발송'
                      : '인증번호 발송'}
                  </Button>
                </div>
              </div>

              {/* 인증번호 입력 */}
              {verification.verificationSent && (
                <div>
                  <Label htmlFor="code" className="text-sm font-semibold">
                    인증번호
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      placeholder="4자리 입력"
                      value={verification.verificationCode}
                      onChange={(e) =>
                        verification.setVerificationCode(
                          e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                        )
                      }
                      className="h-11 flex-1"
                      maxLength={4}
                    />
                    <Button
                      onClick={() => verification.handleVerifyCode()}
                      disabled={
                        verification.isVerifying ||
                        verification.verificationCode.length !== 4
                      }
                      className="h-11 px-4 whitespace-nowrap"
                    >
                      {verification.isVerifying ? '확인 중...' : '인증 확인'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    SMS로 발송된 4자리 인증번호를 입력해주세요
                  </p>
                </div>
              )}

              {/* 에러 메시지 */}
              {verification.error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{verification.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* ===== Step 2: 주문 목록 ===== */
          <>
            {/* 인증 완료 안내 */}
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>
                {verification.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')} 인증 완료
              </span>
            </div>

            {/* 로딩 */}
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent mx-auto mb-3" />
                <p className="text-gray-500 text-sm">주문 내역을 불러오는 중...</p>
              </div>
            )}

            {/* 에러 */}
            {fetchError && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{fetchError}</p>
              </div>
            )}

            {/* 주문 없음 */}
            {!loading && !fetchError && orders.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500 mb-2">주문 내역이 없습니다</p>
                  <Link
                    href="/"
                    className="text-sm text-brand underline hover:text-brand-dark"
                  >
                    주문하러 가기
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* 주문 목록 */}
            {!loading &&
              orders.map((order) => {
                const statusInfo = ORDER_STATUS_LABEL[order.status] || {
                  label: order.status,
                  color: 'bg-gray-500 text-white',
                };
                const isPickup = order.apt_code === PICKUP_APT_CODE;

                return (
                  <Card key={order.id} className="overflow-hidden">
                    {/* 상태 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                        {isPickup ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-purple-500 text-white border border-purple-600">
                            픽업
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-500 text-white border border-blue-600">
                            배달
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(order.created_at), 'M/d HH:mm')}
                      </span>
                    </div>

                    <CardContent className="pt-4 space-y-3">
                      {/* 배송/픽업 정보 */}
                      <div className="text-sm space-y-1">
                        {isPickup ? (
                          <div className="flex justify-between">
                            <span className="text-gray-500">픽업일시</span>
                            <span className="font-medium text-purple-600">
                              {order.pickup_date
                                ? format(new Date(order.pickup_date), 'M월 d일 (EEE)', {
                                    locale: ko,
                                  })
                                : '-'}
                              {order.pickup_time ? ` ${order.pickup_time}` : ''}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-500">단지</span>
                              <span className="font-medium">{order.apt_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">동/호</span>
                              <span className="font-medium">
                                {order.dong}동 {order.ho}호
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">배송일</span>
                              <span className="font-medium">
                                {format(new Date(order.delivery_date), 'M월 d일 (EEE)', {
                                  locale: ko,
                                })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 상품 목록 */}
                      <div className="border-t pt-3 space-y-1.5">
                        {order.order_items?.map((item: any) => {
                          const product = getProductBySku(item.sku);
                          return (
                            <div
                              key={item.id}
                              className="flex justify-between text-sm"
                            >
                              <span>
                                {product?.emoji} {product?.name || item.sku} x
                                {item.qty}
                              </span>
                              <span className="font-medium">
                                {(
                                  item.line_amount ??
                                  (item.unit_price ?? 0) * item.qty
                                ).toLocaleString()}
                                원
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between items-center pt-2 border-t font-bold">
                          <span>합계</span>
                          <span className="text-lg">
                            {order.total_amount.toLocaleString()}원
                          </span>
                        </div>
                      </div>

                      {/* 가상계좌 정보 (입금대기 상태일 때) */}
                      {order.status === 'WAITING_FOR_DEPOSIT' &&
                        order.vbank_num && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-1.5">
                            <p className="text-sm font-semibold text-yellow-800">
                              입금 계좌 정보
                            </p>
                            <div className="text-sm space-y-0.5">
                              <p>
                                <span className="text-gray-500">은행:</span>{' '}
                                {order.vbank_bank}
                              </p>
                              <p>
                                <span className="text-gray-500">계좌:</span>{' '}
                                <span className="font-mono font-medium">
                                  {order.vbank_num}
                                </span>
                              </p>
                              <p>
                                <span className="text-gray-500">예금주:</span>{' '}
                                {order.vbank_holder}
                              </p>
                              {order.vbank_expires_at && (
                                <p className="text-xs text-yellow-700">
                                  입금기한:{' '}
                                  {format(
                                    new Date(order.vbank_expires_at),
                                    'M월 d일 HH:mm',
                                    { locale: ko }
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8">
        <Footer />
      </div>
    </main>
  );
}
