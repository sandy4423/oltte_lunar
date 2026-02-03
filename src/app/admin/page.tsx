'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  RefreshCw, Truck, CheckCircle, Printer, Download,
  Filter, Search, BarChart3, Lock, TrendingUp
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

import { APARTMENT_LIST, APARTMENTS, ORDER_STATUS_LABEL, getProductBySku, getApartmentFullName } from '@/lib/constants';
import { TRAFFIC_SOURCE_LABELS } from '@/types/source';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { useOrderFilters } from '@/hooks/useOrderFilters';
import { useOrderSelection } from '@/hooks/useOrderSelection';
import { useOrderStatusChange } from '@/hooks/useOrderStatusChange';

// ============================================
// 비밀번호 인증 상수
// ============================================
const ADMIN_PASSWORD = '4423';

// ============================================
// Page Component
// ============================================

export default function AdminPage() {
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  // 주문 조회 훅
  const { orders, loading, fetchOrders } = useAdminOrders();

  // 페이지 통계 상태
  const [pageStats, setPageStats] = useState<any>(null);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 필터링 훅
  const {
    filterApt,
    setFilterApt,
    filterStatus,
    setFilterStatus,
    filterDeliveryDate,
    setFilterDeliveryDate,
    searchQuery,
    setSearchQuery,
    filteredOrders,
    uniqueDeliveryDates,
  } = useOrderFilters(orders);

  // 선택 훅
  const { selectedOrders, handleSelectAll, handleSelectOrder, clearSelection } = useOrderSelection();

  // 상태 변경 훅
  const { actionLoading, handleStatusChange } = useOrderStatusChange({
    selectedOrders,
    onSuccess: fetchOrders,
    onClearSelection: clearSelection,
  });

  // 라벨 인쇄 모드
  const [printMode, setPrintMode] = useState(false);

  // 통계 조회
  const fetchPageStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/analytics/page-stats?days=30');
      const data = await res.json();
      setPageStats(data);
    } catch (error) {
      console.error('Failed to fetch page stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // 주문 통계 조회
  const fetchOrderStats = async () => {
    try {
      const res = await fetch('/api/analytics/order-stats?days=30');
      const data = await res.json();
      setOrderStats(data);
    } catch (error) {
      console.error('Failed to fetch order stats:', error);
    }
  };

  // 초기 인증 상태 확인
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // 초기 로드 시 통계 조회
  useEffect(() => {
    if (isAuthenticated) {
      fetchPageStats();
      fetchOrderStats();
    }
  }, [isAuthenticated]);

  // 비밀번호 확인
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput('');
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

  // 비밀번호 인증 화면
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Lock className="h-12 w-12 text-brand" />
            </div>
            <CardTitle className="text-center text-2xl">관리자 로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={passwordError ? 'border-red-500' : ''}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-2">비밀번호가 올바르지 않습니다.</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                로그인
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

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

        {/* 페이지 방문 통계 섹션 */}
        {pageStats && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold">페이지 방문 통계 (최근 30일)</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* 총 방문 수 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">총 방문</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{pageStats.totalViews}</div>
                </CardContent>
              </Card>
              
              {/* 홈페이지 방문 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">홈페이지</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {pageStats.pageBreakdown['/'] || 0}
                  </div>
                </CardContent>
              </Card>
              
              {/* 주문 페이지 방문 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">주문 페이지</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {pageStats.pageBreakdown['/order'] || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 페이지별 상세 */}
              <Card>
                <CardHeader>
                  <CardTitle>페이지별 방문</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(pageStats.pageBreakdown).map(([page, count]) => (
                      <div key={page} className="flex justify-between items-center">
                        <span className="text-sm font-mono text-gray-700">{page}</span>
                        <span className="text-sm font-bold">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* 단지별 통계 (있는 경우) */}
              {Object.keys(pageStats.aptBreakdown).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>단지별 주문 페이지 방문</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(pageStats.aptBreakdown).map(([aptCode, count]) => {
                        const apartment = APARTMENTS[aptCode];
                        const displayName = apartment ? getApartmentFullName(apartment) : aptCode;
                        
                        return (
                          <div key={aptCode} className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">{displayName}</span>
                            <span className="text-sm font-bold">{count as number}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* 유입 경로별 통계 */}
        {(pageStats?.sourceBreakdown || orderStats?.sourceBreakdown) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-bold">유입 경로 분석 (최근 30일)</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>유입 경로별 방문 및 주문</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(TRAFFIC_SOURCE_LABELS).map(([key, label]) => {
                    const visits = pageStats?.sourceBreakdown?.[key] || 0;
                    const orders = orderStats?.sourceBreakdown?.[key]?.total || 0;
                    const paidOrders = orderStats?.sourceBreakdown?.[key]?.paid || 0;
                    const conversion = visits > 0 ? ((orders / visits) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <div key={key} className="border-b pb-3 last:border-0">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">{label}</span>
                          <span className="text-sm text-gray-500">전환율: {conversion}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">방문</div>
                            <div className="text-lg font-bold text-blue-600">{visits}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">주문</div>
                            <div className="text-lg font-bold text-green-600">{orders}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">결제완료</div>
                            <div className="text-lg font-bold text-purple-600">{paidOrders}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 주문 통계 카드 */}
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
                      {getApartmentFullName(apt)}
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectAll(e.target.checked, filteredOrders)}
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
                            {order.is_pickup ? (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                                🏪 픽업
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                🚚 배달
                              </Badge>
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
