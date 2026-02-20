'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ORDER_STATUS_LABEL, getProductBySku } from '@/lib/constants';
import type { OrderFull } from '@/types/database';

interface OrderMobileCardsProps {
  filteredOrders: OrderFull[];
  loading: boolean;
  selectedOrders: Set<string>;
  onSelectOrder: (id: string, checked: boolean) => void;
  onOpenDetail: (order: OrderFull) => void;
}

export function OrderMobileCards({
  filteredOrders, loading, selectedOrders, onSelectOrder, onOpenDetail,
}: OrderMobileCardsProps) {
  return (
    <div className="block md:hidden space-y-3">
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            {loading ? '로딩 중...' : '주문이 없습니다.'}
          </CardContent>
        </Card>
      ) : (
        filteredOrders.map((order) => {
          const statusInfo = ORDER_STATUS_LABEL[order.status] || {
            label: order.status,
            color: 'bg-gray-500 text-white',
          };

          return (
            <Card key={order.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Checkbox
                  checked={selectedOrders.has(order.id)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onSelectOrder(order.id, e.target.checked)
                  }
                />
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="font-semibold text-base">
                  {order.is_pickup ? (
                    <>
                      🏪 픽업주문 / {order.pickup_date ? format(new Date(order.pickup_date), 'M/d (EEE)', { locale: ko }) : ''} {order.pickup_time || ''}
                    </>
                  ) : (
                    <>
                      {order.apt_name.replace(/^[68]공구 /, '')} / {order.dong}동 {order.ho}호
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{order.customer.name}</span>
                  <span className="text-gray-500">
                    {order.customer.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                  </span>
                </div>
                <div>
                  {order.is_pickup ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-500 text-white border border-purple-600">
                      🏪 픽업
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-500 text-white border border-blue-600">
                      🚚 배달
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {order.order_items.map((item) => {
                    const product = getProductBySku(item.sku);
                    return (
                      <div key={item.id}>
                        {product?.emoji} {product?.name || item.sku} x{item.qty}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-bold text-lg">
                    {order.total_amount.toLocaleString()}원
                  </span>
                  <span className="text-right">
                    {order.is_pickup ? (
                      <div className="text-purple-600 font-medium">
                        {order.pickup_date ? format(new Date(order.pickup_date), 'M/d (EEE)', { locale: ko }) : '-'}
                        {order.pickup_time ? ` ${order.pickup_time}` : ''}
                      </div>
                    ) : (
                      <div className="text-gray-600">{format(new Date(order.delivery_date), 'M/d (EEE)', { locale: ko })}</div>
                    )}
                  </span>
                </div>
                <div className="text-xs text-gray-400 text-right pt-1">
                  주문: {format(new Date(order.created_at), 'M/d HH:mm')}
                </div>
              </div>

              <Button
                onClick={() => onOpenDetail(order)}
                className="w-full mt-3"
                variant="outline"
              >
                상세보기
              </Button>
            </Card>
          );
        })
      )}
    </div>
  );
}
