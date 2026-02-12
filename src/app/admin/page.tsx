'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';
import { 
  RefreshCw, Truck, CheckCircle, Printer, Download,
  Filter, Search, BarChart3, Lock, TrendingUp, ChevronDown, ChevronUp, Plus,
  EyeOff, Eye, Bell, Package, Clock
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { APARTMENT_LIST, APARTMENTS, ORDER_STATUS_LABEL, getProductBySku, getApartmentFullName, PICKUP_APT_CODE } from '@/lib/constants';
import { TRAFFIC_SOURCE_LABELS } from '@/types/source';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { useOrderFilters } from '@/hooks/useOrderFilters';
import { useOrderSelection } from '@/hooks/useOrderSelection';
import { useOrderStatusChange } from '@/hooks/useOrderStatusChange';
import { useAdminStats } from '@/hooks/useAdminStats';
import { CancelRequestDialog } from '@/components/features/admin/CancelRequestDialog';
import { ManualOrderDialog } from '@/components/features/admin/ManualOrderDialog';
import { OrderDetailDialog } from '@/components/features/admin/OrderDetailDialog';
import { DateRangeFilter } from '@/components/features/admin/stats/DateRangeFilter';
import { ProductStats } from '@/components/features/admin/stats/ProductStats';
import { SalesStats } from '@/components/features/admin/stats/SalesStats';
import { DeliveryCalendar } from '@/components/features/admin/stats/DeliveryCalendar';

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
  const { orders, loading, fetchOrders, lastFetchTime } = useAdminOrders();

  // 페이지 통계 상태
  const [pageStats, setPageStats] = useState<any>(null);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showPageStats, setShowPageStats] = useState(false);
  const [showSourceAnalysis, setShowSourceAnalysis] = useState(true);

  // 필터링 훅
  const {
    filterApt,
    setFilterApt,
    filterStatus,
    setFilterStatus,
    filterDeliveryDate,
    setFilterDeliveryDate,
    filterDeliveryMethod,
    setFilterDeliveryMethod,
    searchQuery,
    setSearchQuery,
    showHidden,
    setShowHidden,
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

  // 취소 요청 다이얼로그
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<any | null>(null);

  // 수기 주문 입력 다이얼로그
  const [manualOrderDialogOpen, setManualOrderDialogOpen] = useState(false);

  // 상세보기 다이얼로그
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<any | null>(null);
  const [detailActionLoading, setDetailActionLoading] = useState(false);
  
  // 테이블 행 클릭 시 상세보기 버튼 표시
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // 통계 훅
  const {
    stats,
    loading: statsLoading2,
    error: statsError,
    dateRange,
    setDateRange,
    fetchStats,
    updateShipmentQuantity,
  } = useAdminStats();

  // 상세보기에서 전달완료 처리
  const handleDetailDelivered = async (orderId: string) => {
    setDetailActionLoading(true);
    try {
      const response = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': sessionStorage.getItem('admin_password') || '',
        },
        body: JSON.stringify({
          orderIds: [orderId],
          status: 'DELIVERED',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '전달완료 처리에 실패했습니다.');
      }

      await fetchOrders();
      setDetailDialogOpen(false);
      setSelectedOrderForDetail(null);
      alert('전달완료 처리되었습니다. 고객에게 SMS가 발송되었습니다.');
    } catch (error: any) {
      console.error('[DetailDelivered] Error:', error);
      alert(error.message || '전달완료 처리 중 오류가 발생했습니다.');
    } finally {
      setDetailActionLoading(false);
    }
  };

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

  // 인증 후 모든 데이터 로드
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();        // 주문 데이터
      fetchStats();         // 통계분석 데이터
      fetchPageStats();     // 페이지 방문 통계
      fetchOrderStats();    // 주문 통계
    }
  }, [isAuthenticated]);

  // 비밀번호 확인
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      sessionStorage.setItem('admin_password', passwordInput);
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

  // 주문 숨기기/보이기
  const handleHideOrders = async (hidden: boolean) => {
    if (selectedOrders.size === 0) return;

    const orderIds = Array.from(selectedOrders);
    const action = hidden ? '숨기기' : '보이기';

    if (!confirm(`선택한 ${selectedOrders.size}개 주문을 ${action} 처리하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/orders/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': sessionStorage.getItem('admin_password') || '',
        },
        body: JSON.stringify({
          orderIds,
          hidden,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `${action} 처리에 실패했습니다.`);
      }

      // 성공 시 목록 새로고침 및 선택 해제
      await fetchOrders();
      clearSelection();
      alert(`${selectedOrders.size}개 주문이 ${action} 처리되었습니다.`);
    } catch (error: any) {
      console.error(`[HideOrders] Error:`, error);
      alert(error.message || `${action} 처리 중 오류가 발생했습니다.`);
    }
  };

  // 개별 주문 배송완료 처리 (모바일 카드용)
  const handleSingleDelivered = async (orderId: string) => {
    if (!confirm('배송완료 처리하시겠습니까?')) return;

    try {
      const response = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': sessionStorage.getItem('admin_password') || '',
        },
        body: JSON.stringify({
          orderIds: [orderId],
          status: 'DELIVERED',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '배송완료 처리에 실패했습니다.');
      }

      await fetchOrders();
      alert('배송완료 처리되었습니다.');
    } catch (error: any) {
      console.error('[SingleDelivered] Error:', error);
      alert(error.message || '배송완료 처리 중 오류가 발생했습니다.');
    }
  };

  // 입금 독려 메시지 발송
  const [remindLoading, setRemindLoading] = useState(false);

  // 픽업시간 회신 링크 발송
  const [sendLinkLoading, setSendLinkLoading] = useState(false);

  const handleSendPickupTimeLink = async () => {
    if (selectedOrders.size !== 1) return;
    
    const orderId = Array.from(selectedOrders)[0];
    const order = orders.find(o => o.id === orderId);
    
    if (!order || !order.is_pickup) {
      alert('픽업 주문만 선택할 수 있습니다.');
      return;
    }
    
    if (order.pickup_date && order.pickup_time) {
      alert('이미 픽업시간이 선택된 주문입니다.');
      return;
    }
    
    if (!confirm(`${order.customer.name}님에게 픽업시간 선택 링크를 전송하시겠습니까?`)) {
      return;
    }
    
    setSendLinkLoading(true);
    
    try {
      const response = await fetch('/api/auth/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || '링크 전송에 실패했습니다.');
      }
      
      alert('SMS 전송 완료');
      clearSelection();
    } catch (error: any) {
      alert(error.message || '오류가 발생했습니다.');
    } finally {
      setSendLinkLoading(false);
    }
  };

  const handleRemindDeposit = async () => {
    if (selectedOrders.size === 0) return;

    // 선택된 주문 중 입금대기 상태만 필터링
    const waitingOrders = orders.filter(
      (o) => selectedOrders.has(o.id) && o.status === 'WAITING_FOR_DEPOSIT'
    );

    if (waitingOrders.length === 0) {
      alert('선택한 주문 중 입금대기 상태의 주문이 없습니다.');
      return;
    }

    const customerList = waitingOrders
      .map((o) => `• ${o.customer.name} (${o.total_amount.toLocaleString()}원)`)
      .join('\n');

    const confirmed = confirm(
      `입금 독려 메시지를 발송합니다.\n\n` +
      `[발송 대상: ${waitingOrders.length}명]\n${customerList}\n\n` +
      `발송하시겠습니까?`
    );

    if (!confirmed) return;

    setRemindLoading(true);
    try {
      const response = await fetch('/api/admin/orders/remind-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': sessionStorage.getItem('admin_password') || '',
        },
        body: JSON.stringify({
          orderIds: waitingOrders.map((o) => o.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '입금 독려 메시지 발송에 실패했습니다.');
      }

      const { summary } = data;
      alert(
        `입금 독려 메시지 발송 완료\n\n` +
        `성공: ${summary.success}명\n` +
        `실패: ${summary.failed}명`
      );

      clearSelection();
    } catch (error: any) {
      console.error('[RemindDeposit] Error:', error);
      alert(error.message || '입금 독려 메시지 발송 중 오류가 발생했습니다.');
    } finally {
      setRemindLoading(false);
    }
  };

  // 선택된 주문들
  const selectedOrdersData = orders.filter((o) => selectedOrders.has(o.id));

  // 전달 필요 상품 집계 (결제완료이지만 DELIVERED가 아닌 주문)
  const pendingDeliveryItems = useMemo(() => {
    const items: Record<string, number> = {};
    
    orders
      .filter(o => 
        !o.is_hidden && 
        ['PAID', 'OUT_FOR_DELIVERY', 'LATE_DEPOSIT'].includes(o.status)
      )
      .forEach(order => {
        order.order_items.forEach(item => {
          items[item.sku] = (items[item.sku] || 0) + item.qty;
        });
      });
    
    return items;
  }, [orders]);

  const pendingDeliveryOrderCount = useMemo(() => {
    return orders.filter(o => 
      !o.is_hidden && 
      ['PAID', 'OUT_FOR_DELIVERY', 'LATE_DEPOSIT'].includes(o.status)
    ).length;
  }, [orders]);

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
            <div className="flex items-center gap-2 mb-1">
              <Image
                src="/images/logo.png"
                alt="올때만두"
                width={150}
                height={40}
              />
              <span className="text-xl font-bold">관리자</span>
            </div>
            <p className="text-gray-500">주문 관리 및 배송 처리</p>
            {lastFetchTime && (
              <p className="text-xs text-gray-400 mt-1">
                마지막 업데이트: {format(new Date(lastFetchTime), 'M월 d일 HH:mm:ss', { locale: ko })}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => setShowHidden(!showHidden)} 
              variant={showHidden ? "default" : "outline"}
              className={`${showHidden ? "bg-gray-700 hover:bg-gray-800" : ""} text-sm md:text-base px-2 md:px-4`}
            >
              {showHidden ? <Eye className="mr-1 md:mr-2 h-4 w-4" /> : <EyeOff className="mr-1 md:mr-2 h-4 w-4" />}
              <span className="hidden sm:inline">{showHidden ? '일반 주문 보기' : '숨긴 주문 보기'}</span>
              <span className="sm:hidden">{showHidden ? '일반' : '숨김'}</span>
            </Button>
            <Button onClick={() => setManualOrderDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-sm md:text-base px-2 md:px-4">
              <Plus className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">수기 주문 입력</span>
              <span className="sm:hidden">수기</span>
            </Button>
            <Button onClick={fetchOrders} variant="outline" disabled={loading} className="text-sm md:text-base px-2 md:px-4">
              <RefreshCw className={`mr-1 md:mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <Tabs defaultValue="orders" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="orders" className="px-6">주문관리</TabsTrigger>
            <TabsTrigger value="stats" className="px-6">통계분석</TabsTrigger>
          </TabsList>

          {/* ============================================ */}
          {/* 주문관리 탭 */}
          {/* ============================================ */}
          <TabsContent value="orders">

        {/* 페이지 방문 통계 섹션 */}
        {pageStats && (
          <div className="mb-8">
            <button 
              onClick={() => setShowPageStats(!showPageStats)}
              className="flex items-center gap-2 mb-4 w-full hover:opacity-70 transition-opacity"
            >
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold">페이지 방문 통계 (최근 30일)</h2>
              {showPageStats ? (
                <ChevronUp className="h-5 w-5 text-gray-400 ml-auto" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400 ml-auto" />
              )}
            </button>
            
            {showPageStats && (
            <>
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
            </>
            )}
          </div>
        )}

        {/* 유입 경로별 통계 */}
        <div className="mb-8">
          <button 
            onClick={() => setShowSourceAnalysis(!showSourceAnalysis)}
            className="flex items-center gap-2 mb-4 w-full hover:opacity-70 transition-opacity"
          >
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-bold">유입 경로 분석 (최근 30일)</h2>
            {showSourceAnalysis ? (
              <ChevronUp className="h-5 w-5 text-gray-400 ml-auto" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400 ml-auto" />
            )}
          </button>
          
          {showSourceAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>유입 경로별 방문 및 주문</CardTitle>
                <p className="text-xs text-gray-400 mt-1">
                  ?source= 파라미터가 포함된 URL로 접속해야 추적됩니다
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(TRAFFIC_SOURCE_LABELS).map(([key, label]) => {
                    const visits = pageStats?.sourceBreakdown?.[key] || 0;
                    const orderCount = orderStats?.sourceBreakdown?.[key]?.total || 0;
                    const paidOrders = orderStats?.sourceBreakdown?.[key]?.paid || 0;
                    const conversion = visits > 0 ? ((orderCount / visits) * 100).toFixed(1) : '0.0';
                    
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
                            <div className="text-lg font-bold text-green-600">{orderCount}</div>
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
          )}
        </div>

        {/* 주문 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">전체 주문</p>
              <p className="text-2xl font-bold">{orders.filter((o) => !o.is_hidden).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">입금대기</p>
              <p className="text-2xl font-bold text-yellow-600">
                {orders.filter((o) => !o.is_hidden && o.status === 'WAITING_FOR_DEPOSIT').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">결제완료</p>
              <p className="text-2xl font-bold text-green-600">
                {orders.filter((o) => !o.is_hidden && o.status === 'PAID').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">배송완료</p>
              <p className="text-2xl font-bold text-purple-600">
                {orders.filter((o) => !o.is_hidden && o.status === 'DELIVERED').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 전달 필요 수량 (결제완료, 미전달) */}
        {pendingDeliveryOrderCount > 0 && (
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
        )}

        {/* 필터 & 액션 */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              필터 & 액션
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
              {/* 단지 필터 */}
              <Select value={filterApt} onValueChange={setFilterApt}>
                <SelectTrigger>
                  <SelectValue placeholder="단지 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 단지</SelectItem>
                  <SelectItem value={PICKUP_APT_CODE}>🏪 픽업주문</SelectItem>
                  {APARTMENT_LIST.map((apt) => (
                    <SelectItem key={apt.code} value={apt.code}>
                      {getApartmentFullName(apt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 배달방법 필터 */}
              <Select value={filterDeliveryMethod} onValueChange={setFilterDeliveryMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="배달방법" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="delivery">🚚 배달</SelectItem>
                  <SelectItem value="pickup">🏪 픽업</SelectItem>
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
                onClick={handleRemindDeposit}
                disabled={selectedOrders.size === 0 || remindLoading}
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <Bell className={`mr-2 h-4 w-4 ${remindLoading ? 'animate-pulse' : ''}`} />
                입금 안내 ({selectedOrders.size})
              </Button>
              <Button
                onClick={handleSendPickupTimeLink}
                disabled={selectedOrders.size !== 1 || sendLinkLoading}
                variant="outline"
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Clock className={`mr-2 h-4 w-4 ${sendLinkLoading ? 'animate-pulse' : ''}`} />
                픽업시간 요청하기 ({selectedOrders.size})
              </Button>
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
                onClick={() => {
                  // 선택된 주문이 1개일 때만 취소 요청 가능
                  if (selectedOrders.size === 1) {
                    const orderId = Array.from(selectedOrders)[0];
                    const order = orders.find(o => o.id === orderId);
                    if (order && ['PAID', 'OUT_FOR_DELIVERY', 'LATE_DEPOSIT'].includes(order.status)) {
                      setSelectedOrderForCancel(order);
                      setCancelDialogOpen(true);
                    } else {
                      alert('결제 완료 또는 배송 중인 주문만 취소 요청할 수 있습니다.');
                    }
                  }
                }}
                disabled={selectedOrders.size !== 1 || actionLoading}
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                취소 요청 {selectedOrders.size === 1 ? '(1)' : ''}
              </Button>
              {!showHidden ? (
                <Button
                  onClick={() => handleHideOrders(true)}
                  disabled={selectedOrders.size === 0}
                  variant="outline"
                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  숨기기 ({selectedOrders.size})
                </Button>
              ) : (
                <Button
                  onClick={() => handleHideOrders(false)}
                  disabled={selectedOrders.size === 0}
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  보이기 ({selectedOrders.size})
                </Button>
              )}
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

        {/* 모바일 카드 뷰 */}
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
                  {/* 체크박스 + 상태 */}
                  <div className="flex items-center justify-between mb-3">
                    <Checkbox
                      checked={selectedOrders.has(order.id)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleSelectOrder(order.id, e.target.checked)
                      }
                    />
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* 주문 정보 */}
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold text-base">
                      {order.apt_code === PICKUP_APT_CODE ? (
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
                        {order.apt_code === PICKUP_APT_CODE ? (
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

                  {/* 상세보기 버튼 */}
                  <Button
                    onClick={() => {
                      setSelectedOrderForDetail(order);
                      setDetailDialogOpen(true);
                    }}
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

        {/* 주문 테이블 (데스크톱) */}
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
                        <TableRow 
                          key={order.id} 
                          className="relative group cursor-pointer"
                          onClick={(e) => {
                            // 체크박스나 다른 인터랙티브 요소 클릭 시 무시
                            const target = e.target as HTMLElement;
                            if (target.closest('input, button, a')) return;
                            
                            setSelectedRowId(selectedRowId === order.id ? null : order.id);
                          }}
                        >
                          {/* 상세보기 오버레이 */}
                          <td
                            className={`absolute inset-0 z-10 items-center justify-center bg-gray-900/40 rounded ${
                              selectedRowId === order.id ? 'flex' : 'hidden'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation(); // 행 클릭 이벤트 전파 방지
                              setSelectedOrderForDetail(order);
                              setDetailDialogOpen(true);
                              setSelectedRowId(null); // 다이얼로그 열면 선택 해제
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
                                handleSelectOrder(order.id, e.target.checked)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={order.apt_name}>
                            {order.apt_code === PICKUP_APT_CODE ? '🏪 픽업주문' : order.apt_name.replace(/^[68]공구 /, '')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.apt_code === PICKUP_APT_CODE ? (
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
                            {order.apt_code === PICKUP_APT_CODE ? (
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

        {/* 푸터 */}
        <div className="mt-6 text-center text-sm text-gray-400">
          총 {filteredOrders.length}건 / 선택 {selectedOrders.size}건
        </div>

          </TabsContent>

          {/* ============================================ */}
          {/* 통계분석 탭 */}
          {/* ============================================ */}
          <TabsContent value="stats">
            {/* 기간 선택 필터 */}
            <DateRangeFilter
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              loading={statsLoading2}
            />

            {/* 로딩 상태 */}
            {statsLoading2 && (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">통계 데이터를 불러오는 중...</p>
              </div>
            )}

            {/* 에러 상태 */}
            {statsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-700">{statsError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStats}
                  className="mt-2"
                >
                  다시 시도
                </Button>
              </div>
            )}

            {/* 통계 데이터 */}
            {stats && !statsLoading2 && (
              <>
                {/* 상품별 통계 */}
                <ProductStats
                  products={stats.products}
                  shipmentDates={stats.shipmentDates}
                  onUpdateShipment={updateShipmentQuantity}
                />

                {/* 매출 통계 */}
                <SalesStats sales={stats.sales} />

                {/* 배송 캘린더 */}
                <DeliveryCalendar calendar={stats.calendar} />
              </>
            )}

            {/* 데이터 없음 */}
            {!stats && !statsLoading2 && !statsError && (
              <div className="text-center py-12 text-gray-400">
                통계 데이터가 없습니다.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 취소 요청 다이얼로그 */}
      <CancelRequestDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        order={selectedOrderForCancel}
        onSuccess={() => {
          fetchOrders();
          clearSelection();
        }}
      />

      {/* 수기 주문 입력 다이얼로그 */}
      <ManualOrderDialog
        open={manualOrderDialogOpen}
        onOpenChange={setManualOrderDialogOpen}
        onSuccess={() => {
          fetchOrders();
          setManualOrderDialogOpen(false);
        }}
      />

      {/* 주문 상세보기 다이얼로그 */}
      <OrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        order={selectedOrderForDetail}
        onDelivered={handleDetailDelivered}
        actionLoading={detailActionLoading}
      />
    </main>
  );
}
