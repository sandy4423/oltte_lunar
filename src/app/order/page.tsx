'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Minus, Plus, AlertCircle, Phone, MapPin, ShoppingCart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { APARTMENTS, PRODUCTS, MIN_ORDER_QUANTITY, type Product } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { Footer } from '@/components/Footer';

// ============================================
// Types
// ============================================

interface CartItem {
  sku: Product['sku'];
  qty: number;
}

// ============================================
// Page Component
// ============================================

export default function OrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const aptCode = searchParams.get('apt');

  // 단지 정보
  const apartment = aptCode ? APARTMENTS[aptCode] : null;

  // 폼 상태
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  
  const [name, setName] = useState('');
  const [dong, setDong] = useState('');
  const [ho, setHo] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // 장바구니
  const [cart, setCart] = useState<CartItem[]>(
    PRODUCTS.map((p) => ({ sku: p.sku, qty: 0 }))
  );

  // 로딩/에러
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 마감 체크
  const isExpired = useMemo(() => {
    if (!apartment) return true;
    return new Date() > new Date(apartment.cutoffAt);
  }, [apartment]);

  // 총 수량 & 금액 계산
  const { totalQty, totalAmount } = useMemo(() => {
    let qty = 0;
    let amount = 0;
    cart.forEach((item: CartItem) => {
      const product = PRODUCTS.find((p) => p.sku === item.sku);
      if (product) {
        qty += item.qty;
        amount += product.price * item.qty;
      }
    });
    return { totalQty: qty, totalAmount: amount };
  }, [cart]);

  // 최소 주문 충족 여부
  const isMinOrderMet = totalQty >= MIN_ORDER_QUANTITY;

  // 폼 유효성
  const isFormValid = 
    isPhoneVerified && 
    name.trim() !== '' && 
    dong !== '' && 
    ho.trim() !== '' && 
    isMinOrderMet;

  // 수량 변경
  const updateQuantity = (sku: Product['sku'], delta: number) => {
    setCart((prev: CartItem[]) =>
      prev.map((item: CartItem) =>
        item.sku === sku
          ? { ...item, qty: Math.max(0, item.qty + delta) }
          : item
      )
    );
  };

  // 인증번호 발송 (Mock)
  const handleSendVerification = async () => {
    if (!/^01[0-9]{8,9}$/.test(phone.replace(/-/g, ''))) {
      setError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setError(null);
    setVerificationSent(true);
    // TODO: 실제 SMS 인증 API 연동
    console.log('[Mock] 인증번호 발송:', phone);
  };

  // 인증번호 확인 (Mock)
  const handleVerifyCode = async () => {
    setIsVerifying(true);
    // Mock: 아무 코드나 입력하면 성공
    await new Promise((r) => setTimeout(r, 500));
    if (verificationCode.length >= 4) {
      setIsPhoneVerified(true);
      setError(null);
    } else {
      setError('인증번호를 확인해주세요.');
    }
    setIsVerifying(false);
  };

  // 주문 제출
  const handleSubmit = async () => {
    if (!apartment || !isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedPhone = phone.replace(/-/g, '');

      // 1. 고객 생성 또는 조회
      let customerId: string;
      
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            phone: normalizedPhone,
            name: name,
            marketing_opt_in: marketingOptIn,
          })
          .select('id')
          .single();

        if (customerError || !newCustomer) {
          throw new Error('고객 정보 저장 실패');
        }
        customerId = newCustomer.id;
      }

      // 2. 주문 생성
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          apt_code: apartment.code,
          apt_name: apartment.name,
          dong: dong,
          ho: ho,
          delivery_date: apartment.deliveryDate,
          cutoff_at: apartment.cutoffAt,
          status: 'CREATED',
          total_qty: totalQty,
          total_amount: totalAmount,
          payment_method: 'vbank',
        })
        .select('id')
        .single();

      if (orderError || !order) {
        throw new Error('주문 생성 실패');
      }

      // 3. 주문 상품 생성
      const orderItems = cart
        .filter((item: CartItem) => item.qty > 0)
        .map((item: CartItem) => {
          const product = PRODUCTS.find((p) => p.sku === item.sku)!;
          return {
            order_id: order.id,
            sku: item.sku,
            qty: item.qty,
            unit_price: product.price,
            line_amount: product.price * item.qty,
          };
        });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        throw new Error('주문 상품 저장 실패');
      }

      // 4. PortOne 결제 요청
      const { default: PortOne } = await import('@portone/browser-sdk/v2');

      const paymentResponse = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId: `payment_${order.id}_${Date.now()}`,
        orderName: `올때만두 - ${apartment.name}`,
        totalAmount: totalAmount,
        currency: 'CURRENCY_KRW',
        payMethod: 'VIRTUAL_ACCOUNT',
        virtualAccount: {
          accountExpiry: {
            validHours: Math.max(1, Math.floor((new Date(apartment.cutoffAt).getTime() - Date.now()) / (1000 * 60 * 60))),
          },
        },
        customer: {
          phoneNumber: normalizedPhone,
          fullName: name,
        },
        customData: {
          orderId: order.id,
          aptCode: apartment.code,
        },
      });

      if (paymentResponse?.code) {
        // 결제 실패
        throw new Error(paymentResponse.message || '결제 요청 실패');
      }

      // 5. 결제 정보 업데이트
      if (paymentResponse?.paymentId) {
        await supabase
          .from('orders')
          .update({
            portone_payment_id: paymentResponse.paymentId,
            status: 'WAITING_FOR_DEPOSIT',
            vbank_bank: '가상계좌 정보 확인 중',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      }

      // 6. 완료 페이지로 이동
      router.push(`/order/complete?orderId=${order.id}`);
    } catch (err) {
      console.error('Order error:', err);
      setError(err instanceof Error ? err.message : '주문 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 단지 없음
  if (!apartment) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h1 className="text-xl font-bold mb-2">접근할 수 없는 페이지입니다</h1>
            <p className="text-muted-foreground">
              QR코드를 다시 스캔해주세요.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 마감됨
  if (isExpired) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-orange-500 mb-4" />
            <h1 className="text-xl font-bold mb-2">주문이 마감되었습니다</h1>
            <p className="text-muted-foreground">
              {apartment.name}의 주문 마감 시간이 지났습니다.<br />
              다음 기회에 이용해주세요!
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-orange-50 pb-32">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-red-600 to-red-500 text-white p-6 shadow-lg">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-1">🥟 올때만두</h1>
          <p className="text-red-100 text-sm">설 만두는 제가 빚을게요</p>
        </div>
      </header>

      {/* 단지 정보 */}
      <div className="max-w-lg mx-auto px-4 -mt-4">
        <Card className="bg-white shadow-xl border-0">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                {apartment.name}
              </h2>
              <div className="flex justify-center gap-6 text-sm">
                <div>
                  <p className="text-gray-500">배송일</p>
                  <p className="font-bold text-lg text-red-600">
                    {format(new Date(apartment.deliveryDate), 'M월 d일 (EEE)', { locale: ko })}
                  </p>
                </div>
                <div className="border-l border-gray-200" />
                <div>
                  <p className="text-gray-500">주문마감</p>
                  <p className="font-bold text-lg text-orange-600">
                    {format(new Date(apartment.cutoffAt), 'M월 d일 HH:mm', { locale: ko })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
        {/* 전화번호 인증 */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5" />
              휴대폰 인증
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="01012345678"
                value={phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                disabled={isPhoneVerified}
                className="flex-1 text-lg"
              />
              <Button
                onClick={handleSendVerification}
                disabled={isPhoneVerified || verificationSent}
                variant={verificationSent ? 'secondary' : 'default'}
              >
                {verificationSent ? '전송됨' : '인증요청'}
              </Button>
            </div>
            
            {verificationSent && !isPhoneVerified && (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="인증번호 4자리"
                  value={verificationCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="flex-1 text-lg tracking-widest"
                />
                <Button onClick={handleVerifyCode} disabled={isVerifying}>
                  {isVerifying ? '확인중...' : '확인'}
                </Button>
              </div>
            )}

            {isPhoneVerified && (
              <p className="text-sm text-green-600 font-medium">✓ 인증 완료</p>
            )}
          </CardContent>
        </Card>

        {/* 배송 정보 */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              배송 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-base">받으시는 분</Label>
              <Input
                id="name"
                placeholder="홍길동"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="mt-1 text-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dong" className="text-base">동</Label>
                <Select value={dong} onValueChange={setDong}>
                  <SelectTrigger className="mt-1 text-lg">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => i + 101).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}동
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ho" className="text-base">호</Label>
                <Input
                  id="ho"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234"
                  value={ho}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHo(e.target.value)}
                  className="mt-1 text-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 상품 선택 */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5" />
              상품 선택
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {PRODUCTS.map((product) => {
              const cartItem = cart.find((c: CartItem) => c.sku === product.sku);
              const qty = cartItem?.qty || 0;

              return (
                <div
                  key={product.sku}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{product.emoji}</span>
                      <div>
                        <p className="font-bold text-base">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.description}</p>
                      </div>
                    </div>
                    <p className="mt-1 font-bold text-red-600">
                      {product.price.toLocaleString()}원
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(product.sku, -1)}
                      disabled={qty === 0}
                      className="h-10 w-10"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-bold text-xl">{qty}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(product.sku, 1)}
                      className="h-10 w-10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* 최소 주문 안내 */}
            {!isMinOrderMet && totalQty > 0 && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 text-orange-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>
                  최소 {MIN_ORDER_QUANTITY}개 이상 주문 가능합니다. 
                  (현재 {totalQty}개)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Footer - PG 심사용 사업자 정보 */}
      <Footer />

      {/* 하단 고정 결제 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">총 {totalQty}개</span>
            <span className="text-2xl font-bold text-red-600">
              {totalAmount.toLocaleString()}원
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full h-14 text-lg font-bold"
            size="xl"
          >
            {isSubmitting ? '처리중...' : '가상계좌로 주문하기'}
          </Button>
          <p className="text-center text-xs text-gray-400 mt-2">
            문자로 계좌번호가 발송됩니다
          </p>
        </div>
      </div>
    </main>
  );
}
