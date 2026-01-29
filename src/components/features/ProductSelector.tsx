/**
 * 상품 선택 컴포넌트
 */

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PRODUCTS, type Product } from '@/lib/constants';
import type { CartItem } from '@/types/order';

interface ProductSelectorProps {
  cart: CartItem[];
  updateQuantity: (sku: Product['sku'], delta: number) => void;
  totalQty: number;
  isMinOrderMet: boolean;
}

export function ProductSelector({
  cart,
  updateQuantity,
  totalQty,
  isMinOrderMet,
}: ProductSelectorProps) {
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const toggleExpand = (sku: string) => {
    setExpandedSku(expandedSku === sku ? null : sku);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5" />
          상품 선택
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {PRODUCTS.map((product) => {
          const cartItem = cart.find((c) => c.sku === product.sku);
          const qty = cartItem?.qty || 0;
          const isExpanded = expandedSku === product.sku;

          return (
            <div
              key={product.sku}
              className="p-4 bg-gray-50 rounded-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{product.emoji}</span>
                    <div>
                      <p className="font-bold text-base">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.description}</p>
                    </div>
                  </div>
                  <p className="mt-1 font-bold text-brand">
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

              {/* 배송/환불 안내 토글 버튼 */}
              <button
                onClick={() => toggleExpand(product.sku)}
                className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-brand transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    배송·환불 안내 접기
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    배송·환불 안내 보기
                  </>
                )}
              </button>

              {/* 상품 상세 정보 */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-xs text-gray-600">
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">📦 배송 안내</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li>주문 시 선택한 날짜에 아파트 단지 내 배송</li>
                      <li>입금 마감 시간까지 결제 완료 필요</li>
                      <li>냉동 상태로 배송되며, 수령 즉시 냉동보관 권장</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">🔄 환불·교환 안내</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li>입금 마감 전: 100% 전액 환불 가능</li>
                      <li>입금 마감 후: 제조 시작으로 취소 불가</li>
                      <li>배송 후: 식품 특성상 단순 변심 환불 불가</li>
                      <li>상품 하자 시: 수령 후 24시간 이내 교환·환불</li>
                    </ul>
                  </div>
                  <p className="text-[10px] text-gray-400 pt-1">
                    자세한 내용은 하단 <a href="/refund" className="underline hover:text-brand">환불정책</a>을 참고해주세요.
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* 최소 주문 안내 */}
        {!isMinOrderMet && totalQty > 0 && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 text-orange-700 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>
              최소 3개 이상 주문 가능합니다. 
              (현재 {totalQty}개)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
