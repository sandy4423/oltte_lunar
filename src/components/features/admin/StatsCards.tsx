/**
 * 관리자 통계 카드 컴포넌트
 */

import { Card, CardContent } from '@/components/ui/card';
import type { OrderFull } from '@/types/database';

interface StatsCardsProps {
  orders: OrderFull[];
}

export function StatsCards({ orders }: StatsCardsProps) {
  const waitingCount = orders.filter((o) => o.status === 'WAITING_FOR_DEPOSIT').length;
  const paidCount = orders.filter((o) => o.status === 'PAID').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500">전체 주문</p>
          <p className="text-2xl font-bold">{orders.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500">입금대기</p>
          <p className="text-2xl font-bold text-yellow-600">{waitingCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500">결제완료</p>
          <p className="text-2xl font-bold text-green-600">{paidCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500">배송완료</p>
          <p className="text-2xl font-bold text-purple-600">{deliveredCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
