'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import { useOrderFilters } from '@/hooks/useOrderFilters';
import { useOrderSelection } from '@/hooks/useOrderSelection';
import { useOrderStatusChange } from '@/hooks/useOrderStatusChange';
import { useAdminStats } from '@/hooks/useAdminStats';
import { getAdminPassword } from '@/lib/adminAuth';

interface AdminUser {
  id: string;
  name: string;
  role: 'staff' | 'admin';
}

export function useAdminPage() {
  // ============================================
  // 인증 (멀티계정)
  // ============================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('adminUser');
      if (stored) {
        const user = JSON.parse(stored) as AdminUser;
        setAdminUser(user);
        setIsAuthenticated(true);
      }
    } catch {
      // 
    }
  }, []);

  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput, password: passwordInput }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || '로그인 실패');
        setPasswordInput('');
        return;
      }

      const user = data.user as AdminUser;
      setAdminUser(user);
      setIsAuthenticated(true);
      sessionStorage.setItem('adminUser', JSON.stringify(user));
      // 하위호환: 기존 session keys 유지
      sessionStorage.setItem('admin_auth', 'true');
      sessionStorage.setItem('admin_password', passwordInput);
    } catch {
      setLoginError('서버 연결에 실패했습니다.');
    } finally {
      setLoginLoading(false);
    }
  }, [nameInput, passwordInput]);

  // ============================================
  // 주문 데이터
  // ============================================
  const { orders, loading, fetchOrders, lastFetchTime } = useAdminOrders();

  const {
    filterApt, setFilterApt,
    filterStatus, setFilterStatus,
    filterDeliveryDate, setFilterDeliveryDate,
    filterDeliveryMethod, setFilterDeliveryMethod,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    searchQuery, setSearchQuery,
    showHidden, setShowHidden,
    filteredOrders,
    uniqueDeliveryDates,
  } = useOrderFilters(orders);

  const { selectedOrders, handleSelectAll, handleSelectOrder, clearSelection } = useOrderSelection();

  const { actionLoading, handleStatusChange } = useOrderStatusChange({
    selectedOrders,
    onSuccess: fetchOrders,
    onClearSelection: clearSelection,
  });

  // ============================================
  // 통계
  // ============================================
  const [pageStats, setPageStats] = useState<any>(null);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showPageStats, setShowPageStats] = useState(false);
  const [showSourceAnalysis, setShowSourceAnalysis] = useState(true);

  const {
    stats, loading: statsLoading2, error: statsError,
    dateRange, setDateRange, fetchStats, updateShipmentQuantity,
  } = useAdminStats();

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

  const fetchOrderStats = async () => {
    try {
      const res = await fetch('/api/analytics/order-stats?days=30');
      const data = await res.json();
      setOrderStats(data);
    } catch (error) {
      console.error('Failed to fetch order stats:', error);
    }
  };

  // ============================================
  // 다이얼로그
  // ============================================
  const [printMode, setPrintMode] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<any | null>(null);
  const [manualOrderDialogOpen, setManualOrderDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<any | null>(null);
  const [detailActionLoading, setDetailActionLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // ============================================
  // 인증 후 데이터 로드
  // ============================================
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchStats();
      fetchPageStats();
      fetchOrderStats();
    }
  }, [isAuthenticated]);

  // ============================================
  // 핸들러: 상세보기 전달완료
  // ============================================
  const handleDetailDelivered = async (orderId: string) => {
    setDetailActionLoading(true);
    try {
      const response = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPassword(),
        },
        body: JSON.stringify({ orderIds: [orderId], status: 'DELIVERED' }),
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

  // ============================================
  // 핸들러: 라벨 인쇄
  // ============================================
  const handlePrintMode = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  };

  // ============================================
  // 핸들러: 숨기기/보이기
  // ============================================
  const handleHideOrders = async (hidden: boolean) => {
    if (selectedOrders.size === 0) return;
    const orderIds = Array.from(selectedOrders);
    const action = hidden ? '숨기기' : '보이기';
    if (!confirm(`선택한 ${selectedOrders.size}개 주문을 ${action} 처리하시겠습니까?`)) return;

    try {
      const response = await fetch('/api/admin/orders/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPassword(),
        },
        body: JSON.stringify({ orderIds, hidden }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `${action} 처리에 실패했습니다.`);
      }
      await fetchOrders();
      clearSelection();
      alert(`${selectedOrders.size}개 주문이 ${action} 처리되었습니다.`);
    } catch (error: any) {
      console.error(`[HideOrders] Error:`, error);
      alert(error.message || `${action} 처리 중 오류가 발생했습니다.`);
    }
  };

  // ============================================
  // 핸들러: 개별 배송완료
  // ============================================
  const handleSingleDelivered = async (orderId: string) => {
    if (!confirm('배송완료 처리하시겠습니까?')) return;
    try {
      const response = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPassword(),
        },
        body: JSON.stringify({ orderIds: [orderId], status: 'DELIVERED' }),
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

  // ============================================
  // 핸들러: 입금 독려
  // ============================================
  const [remindLoading, setRemindLoading] = useState(false);

  const handleRemindDeposit = async () => {
    if (selectedOrders.size === 0) return;
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
    if (!confirm(`입금 독려 메시지를 발송합니다.\n\n[발송 대상: ${waitingOrders.length}명]\n${customerList}\n\n발송하시겠습니까?`)) return;

    setRemindLoading(true);
    try {
      const response = await fetch('/api/admin/orders/remind-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPassword(),
        },
        body: JSON.stringify({ orderIds: waitingOrders.map((o) => o.id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '입금 독려 메시지 발송에 실패했습니다.');
      const { summary } = data;
      alert(`입금 독려 메시지 발송 완료\n\n성공: ${summary.success}명\n실패: ${summary.failed}명`);
      clearSelection();
    } catch (error: any) {
      console.error('[RemindDeposit] Error:', error);
      alert(error.message || '입금 독려 메시지 발송 중 오류가 발생했습니다.');
    } finally {
      setRemindLoading(false);
    }
  };

  // ============================================
  // 핸들러: 픽업시간 링크 발송
  // ============================================
  const [sendLinkLoading, setSendLinkLoading] = useState(false);

  const pickupLinkTargets = useMemo(() => {
    if (selectedOrders.size === 0) return [];
    return Array.from(selectedOrders)
      .map(id => orders.find((o: any) => o.id === id))
      .filter((o: any) => o?.is_pickup && (!o.pickup_date || !o.pickup_time));
  }, [selectedOrders, orders]);

  const canSendPickupLink = pickupLinkTargets.length > 0;

  const handleSendPickupTimeLink = async () => {
    if (pickupLinkTargets.length === 0) return;
    const names = pickupLinkTargets.map((o: any) => o.customer.name).join(', ');
    if (!confirm(`${names}님에게 픽업시간 선택 링크를 전송하시겠습니까? (${pickupLinkTargets.length}건)`)) return;

    setSendLinkLoading(true);
    try {
      let successCount = 0;
      let failCount = 0;
      for (const order of pickupLinkTargets) {
        try {
          const response = await fetch('/api/auth/send-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: (order as any).id }),
          });
          const result = await response.json();
          if (response.ok && result.success) successCount++;
          else failCount++;
        } catch { failCount++; }
      }
      if (failCount === 0) alert(`SMS 전송 완료 (${successCount}건)`);
      else alert(`전송 완료: ${successCount}건 성공, ${failCount}건 실패`);
      clearSelection();
    } catch (error: any) {
      alert(error.message || '오류가 발생했습니다.');
    } finally {
      setSendLinkLoading(false);
    }
  };

  // ============================================
  // 계산된 값
  // ============================================
  const selectedOrdersData = orders.filter((o) => selectedOrders.has(o.id));

  const pendingDeliveryItems = useMemo(() => {
    const items: Record<string, number> = {};
    orders
      .filter(o => !o.is_hidden && ['PAID', 'OUT_FOR_DELIVERY', 'LATE_DEPOSIT'].includes(o.status))
      .forEach(order => {
        order.order_items.forEach(item => {
          items[item.sku] = (items[item.sku] || 0) + item.qty;
        });
      });
    return items;
  }, [orders]);

  const pendingDeliveryOrderCount = useMemo(() => {
    return orders.filter(o =>
      !o.is_hidden && ['PAID', 'OUT_FOR_DELIVERY', 'LATE_DEPOSIT'].includes(o.status)
    ).length;
  }, [orders]);

  // ============================================
  // 취소 요청 핸들러
  // ============================================
  const handleOpenCancelDialog = () => {
    if (selectedOrders.size === 1) {
      const orderId = Array.from(selectedOrders)[0];
      const order = orders.find(o => o.id === orderId);
      if (order && ['PAID', 'OUT_FOR_DELIVERY', 'LATE_DEPOSIT', 'DELIVERED'].includes(order.status)) {
        setSelectedOrderForCancel(order);
        setCancelDialogOpen(true);
      } else {
        alert('결제 완료 또는 배송 중인 주문만 취소 요청할 수 있습니다.');
      }
    }
  };

  const handleOpenDetail = (order: any) => {
    setSelectedOrderForDetail(order);
    setDetailDialogOpen(true);
  };

  return {
    // 인증 (멀티계정)
    isAuthenticated, adminUser,
    nameInput, setNameInput,
    passwordInput, setPasswordInput,
    loginError, loginLoading,
    handlePasswordSubmit,

    // 주문 데이터
    orders, loading, fetchOrders, lastFetchTime,
    filteredOrders, uniqueDeliveryDates,

    // 필터
    filterApt, setFilterApt,
    filterStatus, setFilterStatus,
    filterDeliveryDate, setFilterDeliveryDate,
    filterDeliveryMethod, setFilterDeliveryMethod,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    searchQuery, setSearchQuery,
    showHidden, setShowHidden,

    // 선택
    selectedOrders, handleSelectAll, handleSelectOrder, clearSelection,
    selectedOrdersData,

    // 상태 변경
    actionLoading, handleStatusChange,

    // 통계
    pageStats, orderStats, statsLoading,
    showPageStats, setShowPageStats,
    showSourceAnalysis, setShowSourceAnalysis,
    stats, statsLoading2, statsError,
    dateRange, setDateRange, fetchStats, updateShipmentQuantity,

    // 다이얼로그
    printMode, handlePrintMode,
    cancelDialogOpen, setCancelDialogOpen,
    selectedOrderForCancel, handleOpenCancelDialog,
    manualOrderDialogOpen, setManualOrderDialogOpen,
    detailDialogOpen, setDetailDialogOpen,
    selectedOrderForDetail, handleOpenDetail,
    detailActionLoading, handleDetailDelivered,
    selectedRowId, setSelectedRowId,

    // 액션 핸들러
    handleHideOrders,
    handleSingleDelivered,
    remindLoading, handleRemindDeposit,
    sendLinkLoading, canSendPickupLink, handleSendPickupTimeLink,

    // 계산값
    pendingDeliveryItems, pendingDeliveryOrderCount,
  };
}
