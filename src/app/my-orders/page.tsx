'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Phone, ShieldCheck, RefreshCw } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Footer } from '@/components/Footer';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { ORDER_STATUS_LABEL, getProductBySku, getAvailablePickupDates, getAvailableTimeSlots } from '@/lib/constants';
import { trackPageView } from '@/lib/trackPageView';
import { PickupDateTimeSelector } from '@/components/features/PickupDateTimeSelector';
import { CashReceiptForm } from '@/components/features/CashReceiptForm';

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

  // 픽업시간 변경 상태
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [newPickupDate, setNewPickupDate] = useState('');
  const [newPickupTime, setNewPickupTime] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  // 토큰 인증 상태
  const [tokenVerified, setTokenVerified] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // URL에서 token 파라미터 추출 및 검증
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token: string, retryCount = 0) => {
    try {
      const response = await fetch(`/api/auth/verify-token?token=${token}`);
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        setTokenError(result.error || '유효하지 않은 링크입니다.');
        return;
      }
      
      // 전화번호로 자동 인증
      verification.setPhone(result.phone);
      verification.setIsPhoneVerified(true);
      setTokenVerified(true);
      
      // URL에서 token 제거 (보안)
      window.history.replaceState({}, '', '/my-orders');
    } catch (error) {
      console.error('[VerifyToken] Client error:', error);
      // 1회 자동 재시도
      if (retryCount < 1) {
        console.log('[VerifyToken] Retrying...');
        setTimeout(() => verifyToken(token, retryCount + 1), 1000);
        return;
      }
      setTokenError('링크 확인 중 오류가 발생했습니다.');
    }
  };

  // 인증 완료 시 주문 조회
  useEffect(() => {
    if (verification.isPhoneVerified) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verification.isPhoneVerified]);

  // 토큰 인증 후 주문 로드 완료 시 -> 픽업시간 미선택 주문 자동 다이얼로그
  useEffect(() => {
    if (tokenVerified && orders.length > 0 && !showChangeDialog) {
      const orderNeedingTime = orders.find((o: any) => needsPickupTime(o));
      if (orderNeedingTime) {
        openChangeDialog(orderNeedingTime);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenVerified, orders]);

  // 페이지 포커스 감지 - 탭으로 돌아왔을 때 즉시 조회
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && verification.isPhoneVerified) {
        fetchOrders();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verification.isPhoneVerified]);

  // 스마트 자동 폴링 (페이지 포커스 시에만 + 1분마다)
  useEffect(() => {
    if (!verification.isPhoneVerified || orders.length === 0) return;
    
    const hasWaitingOrders = orders.some((o: any) => o.status === 'WAITING_FOR_DEPOSIT');
    
    if (hasWaitingOrders && document.visibilityState === 'visible') {
      const interval = setInterval(() => {
        // 페이지가 보이는 상태일 때만 조회
        if (document.visibilityState === 'visible') {
          fetchOrders();
        }
      }, 60000); // 1분 = 60,000ms
      
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verification.isPhoneVerified, orders]);

  const fetchOrders = async (retryCount = 0) => {
    setLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(
        `/api/orders/my?phone=${encodeURIComponent(verification.phone)}`
      );
      const result = await response.json();

      // 401 에러이고 첫 시도인 경우 재시도
      if (response.status === 401 && retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return fetchOrders(1);
      }

      if (!response.ok || !result.success) {
        setFetchError(result.error || '주문 조회에 실패했습니다.');
        return;
      }

      setOrders(result.data || []);
    } catch (error) {
      console.error('[MyOrders] fetchOrders error:', error);
      setFetchError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 픽업시간 선택/변경 가능 여부 판단
  const canChangePickupTime = (order: any): boolean => {
    // 픽업 주문이 아니면 false
    if (!order.is_pickup) return false;
    
    // 상태 확인 (PAID 또는 WAITING_FOR_DEPOSIT만)
    if (order.status !== 'PAID' && order.status !== 'WAITING_FOR_DEPOSIT') {
      return false;
    }
    
    // 픽업 시간이 아직 선택되지 않은 경우 -> 선택 가능
    if (!order.pickup_date || !order.pickup_time) return true;
    
    // 픽업 3시간 전까지만 변경 가능
    try {
      const pickupDateTime = new Date(`${order.pickup_date}T${order.pickup_time}:00+09:00`);
      const now = new Date();
      const threeHoursInMs = 3 * 60 * 60 * 1000;
      
      return (pickupDateTime.getTime() - now.getTime()) > threeHoursInMs;
    } catch {
      return false;
    }
  };

  // 픽업시간 미선택 주문이 있는지 확인
  const needsPickupTime = (order: any): boolean => {
    return order.is_pickup && (!order.pickup_date || !order.pickup_time) && 
      (order.status === 'PAID' || order.status === 'WAITING_FOR_DEPOSIT');
  };

  // 픽업시간 변경 Dialog 열기
  const openChangeDialog = (order: any) => {
    setSelectedOrder(order);
    setNewPickupDate(order.pickup_date || '');
    setNewPickupTime(order.pickup_time || '');
    setChangeError(null);
    setShowChangeDialog(true);
  };

  // 픽업시간 변경 처리
  const handleChangePickupTime = async () => {
    if (!selectedOrder || !newPickupDate || !newPickupTime) {
      setChangeError('픽업 날짜와 시간을 모두 선택해주세요.');
      return;
    }

    setIsChanging(true);
    setChangeError(null);

    try {
      const response = await fetch('/api/orders/pickup-time', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          phone: verification.phone,
          pickupDate: newPickupDate,
          pickupTime: newPickupTime,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setChangeError(result.error || '픽업시간 변경에 실패했습니다.');
        return;
      }

      // 성공 - Dialog 닫고 주문 목록 새로고침
      setShowChangeDialog(false);
      setSelectedOrder(null);
      await fetchOrders();
    } catch (error) {
      console.error('[MyOrders] Change pickup time error:', error);
      setChangeError('서버 오류가 발생했습니다.');
    } finally {
      setIsChanging(false);
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
        {/* 토큰 검증 결과 메시지 */}
        {tokenVerified && (
          <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
            <p className="font-medium">✓ 링크를 통해 자동으로 인증되었습니다.</p>
            <p className="text-sm mt-1">주문내역을 확인하고 픽업시간을 선택해주세요.</p>
          </div>
        )}

        {tokenError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            <p className="font-medium">✗ {tokenError}</p>
            <p className="text-sm mt-1">아래에서 직접 전화번호를 인증해주세요.</p>
          </div>
        )}

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
            {/* 인증 완료 안내 + 새로고침 버튼 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 flex-1">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>
                  {verification.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')} 인증 완료
                </span>
              </div>
              <Button
                onClick={() => fetchOrders()}
                disabled={loading}
                variant="outline"
                size="sm"
                className="h-[46px] px-3 whitespace-nowrap"
                title="주문 상태 새로고침"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* 자동 업데이트 안내 (입금 대기 주문이 있을 때) */}
            {!loading && orders.some((o: any) => o.status === 'WAITING_FOR_DEPOSIT') && (
              <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-2 flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 flex-shrink-0" />
                <span>입금 대기 중인 주문이 있습니다. 페이지를 보고 있으면 1분마다 자동으로 업데이트됩니다.</span>
              </div>
            )}

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
                const isPickup = order.is_pickup;

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
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">픽업일시</span>
                            <div className="flex items-center gap-2">
                              {needsPickupTime(order) ? (
                                <Button
                                  size="sm"
                                  onClick={() => openChangeDialog(order)}
                                  className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  픽업 시간 선택하기
                                </Button>
                              ) : (
                                <>
                                  <span className="font-medium text-purple-600">
                                    {order.pickup_date
                                      ? format(new Date(order.pickup_date), 'M월 d일 (EEE)', {
                                          locale: ko,
                                        })
                                      : '-'}
                                    {order.pickup_time ? ` ${order.pickup_time}` : ''}
                                  </span>
                                  {canChangePickupTime(order) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openChangeDialog(order)}
                                      className="h-6 px-2 text-xs"
                                    >
                                      변경
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
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
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-yellow-800">
                                입금 계좌 정보
                              </p>
                              <div className="flex items-center gap-1 text-xs text-yellow-700">
                                <RefreshCw className="h-3 w-3" />
                                <span>입금 확인 중</span>
                              </div>
                            </div>
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

                      {/* 현금영수증 (모든 주문에 표시) */}
                      <div className="border-t pt-3 mt-3">
                        <CashReceiptForm
                          orderId={order.id}
                          totalAmount={order.total_amount}
                          status={order.status}
                          initialType={order.cash_receipt_type as '소득공제' | '지출증빙' | null}
                          initialNumber={order.cash_receipt_number}
                          issued={order.cash_receipt_issued}
                          receiptUrl={order.cash_receipt_url}
                        />
                      </div>
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

      {/* 픽업시간 변경 Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder && needsPickupTime(selectedOrder) ? '픽업 시간 선택' : '픽업시간 변경'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {selectedOrder && selectedOrder.pickup_date && selectedOrder.pickup_time && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">현재 픽업 시간</p>
                <p className="text-purple-600">
                  {format(new Date(selectedOrder.pickup_date), 'M월 d일 (EEE)', {
                    locale: ko,
                  })}
                  {` ${selectedOrder.pickup_time}`}
                </p>
              </div>
            )}

            {/* 날짜/시간 선택 */}
            <PickupDateTimeSelector
              pickupDate={newPickupDate}
              setPickupDate={setNewPickupDate}
              pickupTime={newPickupTime}
              setPickupTime={setNewPickupTime}
            />

            {/* 안내 메시지 */}
            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
              {selectedOrder && needsPickupTime(selectedOrder) ? (
                <>
                  • 원하시는 날짜와 시간을 선택해주세요<br />
                  • 선택 완료 시 SMS로 확인 문자를 보내드립니다
                </>
              ) : (
                <>
                  • 픽업 예정 시간 3시간 전까지만 변경 가능합니다<br />
                  • 변경 시 SMS로 안내 문자를 보내드립니다
                </>
              )}
            </div>

            {/* 에러 메시지 */}
            {changeError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {changeError}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowChangeDialog(false)}
                disabled={isChanging}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleChangePickupTime}
                disabled={isChanging || !newPickupDate || !newPickupTime}
                className="flex-1"
              >
                {isChanging 
                  ? (selectedOrder && needsPickupTime(selectedOrder) ? '선택 중...' : '변경 중...') 
                  : (selectedOrder && needsPickupTime(selectedOrder) ? '선택 완료' : '변경하기')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
