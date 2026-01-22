'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  RefreshCw, Truck, CheckCircle, Printer, Download,
  Filter, Search
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { supabase } from '@/lib/supabase';
import { APARTMENT_LIST, ORDER_STATUS_LABEL, getProductBySku } from '@/lib/constants';
import type { OrderRow, CustomerRow, OrderItemRow, OrderStatus } from '@/types/database';

// ============================================
// Types
// ============================================

interface OrderFull extends OrderRow {
  customer: CustomerRow;
  order_items: OrderItemRow[];
}

// ============================================
// Page Component
// ============================================

export default function AdminPage() {
  // 데이터
  const [orders, setOrders] = useState<OrderFull[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터
  const [filterApt, setFilterApt] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDeliveryDate, setFilterDeliveryDate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 선택
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // 라벨 인쇄 모드
  const [printMode, setPrintMode] = useState(false);

  // 액션 로딩
  const [actionLoading, setActionLoading] = useState(false);

  // 주문 목록 조회
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(*), order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as OrderFull[]) || []);
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 필터링된 주문
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterApt !== 'all' && order.apt_code !== filterApt) return false;
      if (filterStatus !== 'all' && order.status !== filterStatus) return false;
      if (filterDeliveryDate !== 'all' && order.delivery_date !== filterDeliveryDate) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = order.customer.name.toLowerCase().includes(query);
        const matchPhone = order.customer.phone.includes(query);
        const matchDong = order.dong.includes(query);
        const matchHo = order.ho.includes(query);
        if (!matchName && !matchPhone && !matchDong && !matchHo) return false;
      }
      return true;
    });
  }, [orders, filterApt, filterStatus, filterDeliveryDate, searchQuery]);

  // 고유 배송일 목록
  const uniqueDeliveryDates = useMemo(() => {
    const dates = new Set(orders.map((o) => o.delivery_date));
    return Array.from(dates).sort();
  }, [orders]);

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  // 개별 선택
  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  // 상태 변경 + SMS 발송
  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (selectedOrders.size === 0) return;

    setActionLoading(true);
    try {
      const orderIds = Array.from(selectedOrders);

      // DB 업데이트
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        } as any)
        .in('id', orderIds);

      if (error) throw error;

      // SMS 발송 API 호출 (TODO: 실제 구현)
      console.log(`[Admin] Status changed to ${newStatus} for ${orderIds.length} orders`);
      console.log('[Admin] SMS would be sent to:', orderIds);

      // 새로고침
      await fetchOrders();
      setSelectedOrders(new Set());

      alert(`${orderIds.length}건의 주문이 ${ORDER_STATUS_LABEL[newStatus]?.label || newStatus}(으)로 변경되었습니다.`);
    } catch (err) {
      console.error('Status change error:', err);
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 라벨 인쇄 모드 토글
  const handlePrintMode = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  };

  // 선택된 주문들
  const selectedOrdersData = orders.filter((o) => selectedOrders.has(o.id));

  // 라벨 인쇄 모드 UI
  if (printMode) {
    return (
      <main className="print-labels">
        <style jsx global>{`
          @media print {
            @page {
              size: 40mm 30mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .print-labels {
              width: 100%;
            }
            .label-item {
              width: 40mm;
              height: 30mm;
              padding: 2mm;
              page-break-after: always;
              box-sizing: border-box;
              font-family: sans-serif;
            }
            .label-item:last-child {
              page-break-after: auto;
            }
          }
          @media screen {
            .print-labels {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              padding: 16px;
              background: #f0f0f0;
            }
            .label-item {
              width: 151px; /* 40mm at 96dpi */
              height: 113px; /* 30mm at 96dpi */
              padding: 4px;
              background: white;
              border: 1px solid #ccc;
              font-size: 9px;
            }
          }
        `}</style>
        
        {selectedOrdersData.map((order) => (
          <div key={order.id} className="label-item">
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '2px' }}>
              {order.dong}동 {order.ho}호
            </div>
            <div style={{ fontSize: '10px', marginBottom: '4px' }}>
              {order.customer.name} ({order.customer.phone.slice(-4)})
            </div>
            <div style={{ fontSize: '8px', borderTop: '1px solid #ccc', paddingTop: '2px' }}>
              {order.order_items.map((item) => {
                const product = getProductBySku(item.sku);
                return (
                  <div key={item.id}>
                    {product?.name || item.sku} x {item.qty}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '7px', color: '#666', marginTop: '2px' }}>
              {format(new Date(order.delivery_date), 'M/d')} 배송
            </div>
          </div>
        ))}

        <button
          onClick={() => setPrintMode(false)}
          className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded print:hidden"
        >
          닫기
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">🥟 올때만두 관리자</h1>
            <p className="text-gray-500">주문 관리 및 배송 처리</p>
          </div>
          <Button onClick={fetchOrders} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>

        {/* 통계 카드 */}
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
              <p className="text-2xl font-bold text-yellow-600">
                {orders.filter((o) => o.status === 'WAITING_FOR_DEPOSIT').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">결제완료</p>
              <p className="text-2xl font-bold text-green-600">
                {orders.filter((o) => o.status === 'PAID').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">배송완료</p>
              <p className="text-2xl font-bold text-purple-600">
                {orders.filter((o) => o.status === 'DELIVERED').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 필터 & 액션 */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              필터 & 액션
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              {/* 단지 필터 */}
              <Select value={filterApt} onValueChange={setFilterApt}>
                <SelectTrigger>
                  <SelectValue placeholder="단지 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 단지</SelectItem>
                  {APARTMENT_LIST.map((apt) => (
                    <SelectItem key={apt.code} value={apt.code}>
                      {apt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 배송일 필터 */}
              <Select value={filterDeliveryDate} onValueChange={setFilterDeliveryDate}>
                <SelectTrigger>
                  <SelectValue placeholder="배송일 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 배송일</SelectItem>
                  {uniqueDeliveryDates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {format(new Date(date), 'M월 d일 (EEE)', { locale: ko })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 상태 필터 */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  {Object.entries(ORDER_STATUS_LABEL).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 검색 */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="이름, 전화번호, 동호수 검색"
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleStatusChange('OUT_FOR_DELIVERY')}
                disabled={selectedOrders.size === 0 || actionLoading}
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Truck className="mr-2 h-4 w-4" />
                배송출발 ({selectedOrders.size})
              </Button>
              <Button
                onClick={() => handleStatusChange('DELIVERED')}
                disabled={selectedOrders.size === 0 || actionLoading}
                variant="outline"
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                배송완료 ({selectedOrders.size})
              </Button>
              <Button
                onClick={handlePrintMode}
                disabled={selectedOrders.size === 0}
                variant="outline"
              >
                <Printer className="mr-2 h-4 w-4" />
                라벨 인쇄 ({selectedOrders.size})
              </Button>
              <Button
                variant="outline"
                disabled={filteredOrders.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                엑셀 다운로드
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 주문 테이블 */}
        <Card>
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectAll(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>단지</TableHead>
                    <TableHead>동/호</TableHead>
                    <TableHead>주문자</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>상품</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>배송일</TableHead>
                    <TableHead>주문일시</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
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
                        <TableRow key={order.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedOrders.has(order.id)}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleSelectOrder(order.id, e.target.checked)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={order.apt_name}>
                            {order.apt_name.replace(/^[68]공구 /, '')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.dong}동 {order.ho}호
                          </TableCell>
                          <TableCell>{order.customer.name}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {order.customer.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {order.order_items.map((item) => {
                                const product = getProductBySku(item.sku);
                                return (
                                  <span key={item.id} className="block">
                                    {product?.emoji} {product?.name || item.sku} x{item.qty}
                                  </span>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {order.total_amount.toLocaleString()}원
                          </TableCell>
                          <TableCell>
                            {format(new Date(order.delivery_date), 'M/d (EEE)', { locale: ko })}
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

        {/* 푸터 */}
        <div className="mt-6 text-center text-sm text-gray-400">
          총 {filteredOrders.length}건 / 선택 {selectedOrders.size}건
        </div>
      </div>
    </main>
  );
}
