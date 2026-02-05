'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Minus, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { APARTMENT_LIST, APARTMENTS, PRODUCTS, PICKUP_DISCOUNT, getApartmentFullName } from '@/lib/constants';

interface ManualOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// 픽업 마감 시각 (2026-02-14 토 13:00)
const PICKUP_DEADLINE = new Date('2026-02-14T13:00:00+09:00');

interface CartItem {
  sku: string;
  qty: number;
}

export function ManualOrderDialog({ open, onOpenChange, onSuccess }: ManualOrderDialogProps) {
  // 고객 정보
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // 배송 정보
  const [aptCode, setAptCode] = useState('');
  const [dong, setDong] = useState('');
  const [ho, setHo] = useState('');
  const [isPickup, setIsPickup] = useState(false);

  // 주문 상품
  const [cart, setCart] = useState<CartItem[]>([]);

  // 결제 정보
  const [paymentMethod, setPaymentMethod] = useState<'pos_card' | 'pos_cash' | 'pos_transfer'>('pos_card');

  // UI 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 배송 마감 상태
  const [deliveryStatus, setDeliveryStatus] = useState<'available' | 'pickup_only' | 'closed'>('available');
  const [deliveryMessage, setDeliveryMessage] = useState('');

  // 단지 선택 시 배송 마감 체크
  useEffect(() => {
    if (!aptCode) {
      setDeliveryStatus('available');
      setDeliveryMessage('');
      return;
    }

    const apartment = APARTMENTS[aptCode];
    if (!apartment) return;

    const now = new Date();
    const cutoffAt = new Date(apartment.cutoffAt);
    const deliveryDate = new Date(apartment.deliveryDate);

    // 픽업 마감 체크
    if (now >= PICKUP_DEADLINE) {
      setDeliveryStatus('closed');
      setDeliveryMessage('❌ 설날 운영이 종료되었습니다 (2/14 토 13시 마감)');
      return;
    }

    // 배송 마감 체크
    if (now >= cutoffAt) {
      setDeliveryStatus('pickup_only');
      setDeliveryMessage(`⚠️ 배송 마감되었습니다. 픽업만 가능합니다. (픽업 마감: 2/14 토 13시)`);
      setIsPickup(true); // 자동으로 픽업 선택
    } else {
      setDeliveryStatus('available');
      const formattedDate = format(deliveryDate, 'M월 d일 (EEE)', { locale: ko });
      setDeliveryMessage(`✅ 고객에게 배송일자 안내해주세요: ${formattedDate}`);
    }
  }, [aptCode]);

  // 상품 수량 변경
  const updateCartQty = (sku: string, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.sku === sku);
      if (existing) {
        const newQty = existing.qty + delta;
        if (newQty <= 0) {
          return prev.filter((item) => item.sku !== sku);
        }
        return prev.map((item) =>
          item.sku === sku ? { ...item, qty: newQty } : item
        );
      } else if (delta > 0) {
        return [...prev, { sku, qty: delta }];
      }
      return prev;
    });
  };

  // 총 금액 계산
  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => {
      const product = PRODUCTS.find((p) => p.sku === item.sku);
      return sum + (product?.price || 0) * item.qty;
    }, 0);

    // 픽업 할인 적용
    if (isPickup) {
      return Math.max(0, subtotal - PICKUP_DISCOUNT);
    }

    return subtotal;
  };

  // 총 수량
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

  // 주문 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!customerName.trim()) {
      setError('고객 이름을 입력해주세요.');
      return;
    }

    const phoneRegex = /^01[0-9]{8,9}$/;
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    if (!aptCode) {
      setError('단지를 선택해주세요.');
      return;
    }

    if (!dong.trim() || !ho.trim()) {
      setError('동과 호를 입력해주세요.');
      return;
    }

    if (cart.length === 0) {
      setError('상품을 선택해주세요.');
      return;
    }

    if (totalQty < 3) {
      setError('최소 주문 수량은 3개입니다.');
      return;
    }

    // 완전 마감 체크
    if (deliveryStatus === 'closed') {
      setError('설날 운영이 종료되어 주문을 받을 수 없습니다.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/orders/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          aptCode,
          dong: dong.trim(),
          ho: ho.trim(),
          isPickup,
          cart,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '주문 생성에 실패했습니다.');
      }

      // 성공 - 메시지 표시
      setSuccess(true);
      // 3초 후 자동으로 다이얼로그 닫고 새로고침
      setTimeout(() => {
        onSuccess();
        resetForm();
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('주문 생성 오류:', err);
      setError(err.message || '주문 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setAptCode('');
    setDong('');
    setHo('');
    setIsPickup(false);
    setCart([]);
    setPaymentMethod('pos_card');
    setError(null);
  };

  // 다이얼로그 닫을 때 초기화
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const selectedApartment = aptCode ? APARTMENTS[aptCode] : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>수기 주문 입력</DialogTitle>
        </DialogHeader>

        {/* 성공 메시지 */}
        {success ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h3 className="text-xl font-bold text-green-900">주문 접수 완료!</h3>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                사장님께 영수증 사진을 찍어서 올려주세요.<br />
                직원톡방에.
              </p>
            </div>
            <p className="text-sm text-gray-500">잠시 후 자동으로 닫힙니다...</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. 고객 정보 */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm">1. 고객 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">이름 *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">전화번호 *</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01012345678"
                  maxLength={11}
                />
              </div>
            </div>
          </div>

          {/* 2. 배송 정보 */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm">2. 배송 정보</h3>
            
            {/* 단지 선택 */}
            <div>
              <Label>단지 선택 *</Label>
              <Select value={aptCode} onValueChange={setAptCode}>
                <SelectTrigger>
                  <SelectValue placeholder="단지를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {APARTMENT_LIST.map((apt) => (
                    <SelectItem key={apt.code} value={apt.code}>
                      {getApartmentFullName(apt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 배송 마감 안내 */}
            {deliveryMessage && (
              <div
                className={`p-3 rounded-lg flex items-start gap-2 ${
                  deliveryStatus === 'available'
                    ? 'bg-green-50 border border-green-200'
                    : deliveryStatus === 'pickup_only'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {deliveryStatus === 'available' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />}
                {deliveryStatus === 'pickup_only' && <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                {deliveryStatus === 'closed' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
                <p className="text-sm font-medium">{deliveryMessage}</p>
              </div>
            )}

            {/* 동호수 입력 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dong">동 *</Label>
                <Input
                  id="dong"
                  value={dong}
                  onChange={(e) => setDong(e.target.value)}
                  placeholder="101"
                />
              </div>
              <div>
                <Label htmlFor="ho">호 *</Label>
                <Input
                  id="ho"
                  value={ho}
                  onChange={(e) => setHo(e.target.value)}
                  placeholder="1001"
                />
              </div>
              <div>
                <Label>배송일</Label>
                <Input
                  value={selectedApartment ? format(new Date(selectedApartment.deliveryDate), 'M/d (EEE)', { locale: ko }) : '-'}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* 픽업 여부 */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="isPickup"
                checked={isPickup}
                onCheckedChange={(checked) => setIsPickup(checked as boolean)}
                disabled={deliveryStatus === 'pickup_only' || deliveryStatus === 'closed'}
              />
              <Label
                htmlFor="isPickup"
                className={`cursor-pointer ${deliveryStatus === 'pickup_only' ? 'text-gray-500' : ''}`}
              >
                픽업 (3,000원 할인)
                {deliveryStatus === 'pickup_only' && ' - 필수'}
              </Label>
            </div>
          </div>

          {/* 3. 주문 상품 */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm">3. 주문 상품</h3>
            <div className="space-y-2">
              {PRODUCTS.map((product) => {
                const cartItem = cart.find((item) => item.sku === product.sku);
                const qty = cartItem?.qty || 0;

                return (
                  <div key={product.sku} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {product.emoji} {product.name}
                      </p>
                      <p className="text-xs text-gray-500">{product.price.toLocaleString()}원</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartQty(product.sku, -1)}
                        disabled={qty === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{qty}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartQty(product.sku, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 총액 */}
            <div className="bg-gray-50 p-4 rounded space-y-2">
              <div className="flex justify-between text-sm">
                <span>총 수량</span>
                <span className="font-medium">{totalQty}개</span>
              </div>
              {isPickup && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>픽업 할인</span>
                  <span>-{PICKUP_DISCOUNT.toLocaleString()}원</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>결제 금액</span>
                <span className="text-brand">{calculateTotal().toLocaleString()}원</span>
              </div>
            </div>
          </div>

          {/* 4. 결제 정보 */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm">4. 결제 정보</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="pos_card"
                  checked={paymentMethod === 'pos_card'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">포스기 (카드결제)</div>
                  <div className="text-xs text-gray-500">결제 완료 상태로 생성</div>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="pos_cash"
                  checked={paymentMethod === 'pos_cash'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">포스기 (현금)</div>
                  <div className="text-xs text-gray-500">결제 완료 상태로 생성</div>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="pos_transfer"
                  checked={paymentMethod === 'pos_transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">포스기 (계좌이체)</div>
                  <div className="text-xs text-gray-500">결제 완료 상태로 생성</div>
                </div>
              </label>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || deliveryStatus === 'closed'}
            >
              {loading ? '처리 중...' : '주문 접수'}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
