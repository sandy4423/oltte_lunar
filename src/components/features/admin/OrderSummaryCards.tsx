'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { OrderFull } from '@/types/database';

interface OrderSummaryCardsProps {
  orders: OrderFull[];
}

export function OrderSummaryCards({ orders }: OrderSummaryCardsProps) {
  const visibleOrders = orders.filter((o) => !o.is_hidden);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500">전체 주문</p>
          <p className="text-2xl font-bold">{visibleOrders.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500">입금대기</p>
          <p className="text-2xl font-bold text-yellow-600">
            {visibleOrders.filter((o) => o.status === 'WAITING_FOR_DEPOSIT').length}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500">결제완료</p>
          <p className="text-2xl font-bold text-green-600">
            {visibleOrders.filter((o) => o.status === 'PAID').length}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500">배송완료</p>
          <p className="text-2xl font-bold text-purple-600">
            {visibleOrders.filter((o) => o.status === 'DELIVERED').length}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
