'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ORDER_STATUS_LABEL, getProductBySku } from '@/lib/constants';
import type { OrderFull } from '@/types/database';

interface OrderDesktopTableProps {
  filteredOrders: OrderFull[];
  loading: boolean;
  selectedOrders: Set<string>;
  selectedRowId: string | null;
  onSelectAll: (checked: boolean, orders: OrderFull[]) => void;
  onSelectOrder: (id: string, checked: boolean) => void;
  onRowClick: (orderId: string) => void;
  onOpenDetail: (order: OrderFull) => void;
}

export function OrderDesktopTable({
  filteredOrders, loading, selectedOrders, selectedRowId,
  onSelectAll, onSelectOrder, onRowClick, onOpenDetail,
}: OrderDesktopTableProps) {
  return (
    <Card className="hidden md:block">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      filteredOrders.length > 0 &&
                      filteredOrders.every((o) => selectedOrders.has(o.id))
                    }
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onSelectAll(e.target.checked, filteredOrders)
                    }
                  />
                </TableHead>
                <TableHead>상태</TableHead>
                <TableHead>단지</TableHead>
                <TableHead>동/호</TableHead>
                <TableHead>주문자</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>배달방법</TableHead>
                <TableHead>상품</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>배송일</TableHead>
                <TableHead>주문일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                    {loading ? '로딩 중...' : '주문이 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const statusInfo = ORDER_STATUS_LABEL[order.status] || {
                    label: order.status,
                    color: 'bg-gray-100 text-gray-800',
                  };

                  return (
                    <TableRow
                      key={order.id}
                      className="relative group cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('input, button, a')) return;
                        onRowClick(order.id);
                      }}
                    >
                      <td
                        className={`absolute inset-0 z-10 items-center justify-center bg-gray-900/40 rounded ${
                          selectedRowId === order.id ? 'flex' : 'hidden'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail(order);
                        }}
                      >
                        <span className="bg-white text-gray-900 font-semibold px-5 py-2.5 rounded-lg shadow-lg text-sm">
                          상세보기
                        </span>
                      </td>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            onSelectOrder(order.id, e.target.checked)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={order.apt_name}>
                        {order.is_pickup ? '🏪 픽업주문' : order.apt_name.replace(/^[68]공구 /, '')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.is_pickup ? (
                          <span className="text-sm text-purple-600">- (픽업주문)</span>
                        ) : (
                          <>{order.dong}동 {order.ho}호</>
                        )}
                      </TableCell>
                      <TableCell>{order.customer.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {order.customer.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                      </TableCell>
                      <TableCell>
                        {order.is_pickup ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-500 text-white border border-purple-600">
                            🏪 픽업
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-500 text-white border border-blue-600">
                            🚚 배달
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {order.order_items.map((item) => {
                            const product = getProductBySku(item.sku);
                            return (
                              <div key={item.id} className="whitespace-nowrap">
                                {product?.emoji} {product?.name || item.sku} x{item.qty}
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {order.total_amount.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        {order.is_pickup ? (
                          <div className="text-purple-600 font-medium">
                            {order.pickup_date ? format(new Date(order.pickup_date), 'M/d (EEE)', { locale: ko }) : '-'}
                            {order.pickup_time ? ` ${order.pickup_time}` : ''}
                          </div>
                        ) : (
                          <div>{format(new Date(order.delivery_date), 'M/d (EEE)', { locale: ko })}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(order.created_at), 'M/d HH:mm')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
