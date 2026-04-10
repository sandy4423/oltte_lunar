/**
 * 상품 선택 컴포넌트
 */

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PRODUCTS,
  DANGOL_DISCOUNT_PER_ITEM,
  DANGOL_DISCOUNT_ELIGIBLE_SKUS,
  NOODLE_DISCOUNT_PER_ITEM,
  NOODLE_DISCOUNT_SKU,
  type Product,
} from '@/lib/constants';
import type { CartItem } from '@/types/order';

interface ProductSelectorProps {
  cart: CartItem[];
  updateQuantity: (sku: Product['sku'], delta: number) => void;
  totalQty: number;
  isMinOrderMet: boolean;
  isDangol?: boolean;
  hotpotQty?: number;
  minOrderMessage?: string;
  minOrderSubMessage?: string;
}

export function ProductSelector({
  cart,
  updateQuantity,
  totalQty,
  isMinOrderMet,
  isDangol = false,
  hotpotQty = 0,
  minOrderMessage = '전골을 1개 이상 선택해주세요',
  minOrderSubMessage = '(칼국수, 육수, 만두 추가는 전골 주문 시 추가 가능합니다)',
}: ProductSelectorProps) {
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  const mainProducts = PRODUCTS.filter((p) => !p.isOption);
  const optionProducts = PRODUCTS.filter((p) => p.isOption);

  const getDiscountedPrice = (product: Product): number | null => {
    if (!isDangol) return null;
    if ((DANGOL_DISCOUNT_ELIGIBLE_SKUS as readonly string[]).includes(product.sku)) {
      return product.price - DANGOL_DISCOUNT_PER_ITEM;
    }
    if (product.sku === NOODLE_DISCOUNT_SKU) {
      return product.price - NOODLE_DISCOUNT_PER_ITEM;
    }
    return null;
  };

  const renderProduct = (product: Product) => {
    const cartItem = cart.find((c) => c.sku === product.sku);
    const qty = cartItem?.qty || 0;
    const discountedPrice = getDiscountedPrice(product);

    return (
      <div key={product.sku} className="p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{product.emoji}</span>
              <div>
                <p className="font-bold text-base">{product.name}</p>
                <p className="text-sm text-gray-500">{product.description}</p>
              </div>
            </div>
            {discountedPrice !== null ? (
              <div className="mt-1 flex items-center gap-2">
                <p className="font-bold text-brand">{discountedPrice.toLocaleString()}원</p>
                <p className="text-xs text-gray-400 line-through">{product.price.toLocaleString()}원</p>
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                  -{(product.price - discountedPrice).toLocaleString()}
                </span>
              </div>
            ) : (
              <p className="mt-1 font-bold text-brand">{product.price.toLocaleString()}원</p>
            )}
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
      </div>
    );
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
        {/* 메인 상품 (전골) */}
        <p className="text-sm font-semibold text-gray-600">🍲 전골</p>
        {mainProducts.map(renderProduct)}

        {/* 추가 옵션 */}
        <p className="text-sm font-semibold text-gray-600 pt-2">➕ 추가 옵션</p>
        {optionProducts.map(renderProduct)}

        {/* 전골 없이 옵션만 선택한 경우 */}
        {totalQty > 0 && hotpotQty === 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="font-semibold">{minOrderMessage}</p>
            </div>
            {minOrderSubMessage && (
              <p className="text-xs text-orange-600 mt-1 ml-6">{minOrderSubMessage}</p>
            )}
          </div>
        )}

        {/* 최소 주문 미충족 (기존 호환) */}
        {!isMinOrderMet && hotpotQty > 0 && totalQty > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="font-semibold">{minOrderMessage}</p>
            </div>
          </div>
        )}

        {/* 배송·환불 안내 (토글) */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand transition-colors"
          >
            {isInfoExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                환불 안내 접기
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                환불 안내 보기
              </>
            )}
          </button>

          {isInfoExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-xs text-gray-600">
              <div>
                <p className="font-semibold text-gray-800 mb-1">🔄 환불·교환 안내</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>픽업 전: 100% 전액 환불 가능</li>
                  <li>조리 시작 후: 취소 불가</li>
                  <li>상품 하자 시: 수령 후 24시간 이내 교환·환불</li>
                </ul>
              </div>
              <p className="text-[10px] text-gray-400 pt-1">
                자세한 내용은 하단 <a href="/refund" className="underline hover:text-brand">환불정책</a>을 참고해주세요.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
