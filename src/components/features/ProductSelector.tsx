/**
 * 상품 선택 컴포넌트
 */

import { AlertCircle, Minus, Plus, ShoppingCart } from 'lucide-react';
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
