'use client';

import { Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProductBySku } from '@/lib/constants';

interface PendingDeliveryCardProps {
  pendingDeliveryItems: Record<string, number>;
  pendingDeliveryOrderCount: number;
}

export function PendingDeliveryCard({ pendingDeliveryItems, pendingDeliveryOrderCount }: PendingDeliveryCardProps) {
  if (pendingDeliveryOrderCount === 0) return null;

  return (
    <Card className="mb-6 border-orange-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-orange-600" />
          전달 필요 수량
        </CardTitle>
        <p className="text-sm text-gray-500">
          결제 완료되었지만 고객에게 전달되지 않은 상품 ({pendingDeliveryOrderCount}건)
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(pendingDeliveryItems).map(([sku, qty]) => {
            const product = getProductBySku(sku);
            return (
              <div key={sku} className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">{product?.emoji || '📦'}</div>
                <p className="text-xs text-gray-600 mb-1">{product?.name || sku}</p>
                <p className="text-2xl font-bold text-orange-600">{qty}개</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
