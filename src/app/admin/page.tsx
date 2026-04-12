'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RefreshCw, Plus, EyeOff, Eye, Search } from 'lucide-react';
import { useNewOrderAlert } from '@/hooks/useNewOrderAlert';
import { useUpcomingOrderAlert } from '@/hooks/useUpcomingOrderAlert';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { useAdminPage } from '@/hooks/useAdminPage';
import { AdminLoginForm } from '@/components/features/admin/AdminLoginForm';
import { LabelPrintView } from '@/components/features/admin/LabelPrintView';
import { AdminOrdersTab } from '@/components/features/admin/AdminOrdersTab';
import { AdminStatsTab } from '@/components/features/admin/AdminStatsTab';
import { AccountManagement } from '@/components/features/admin/AccountManagement';
import { CancelRequestDialog } from '@/components/features/admin/CancelRequestDialog';
import { ManualOrderDialog } from '@/components/features/admin/ManualOrderDialog';
import { OrderDetailDialog } from '@/components/features/admin/OrderDetailDialog';

export default function AdminPage() {
  const router = useRouter();
  const admin = useAdminPage();

  // 신규 주문 소리 알림 (로그인 상태에서만 활성화)
  useNewOrderAlert(admin.isAuthenticated);

  // 예약 픽업 20분 전 음성 알림
  useUpcomingOrderAlert(admin.orders, admin.isAuthenticated);

  if (!admin.isAuthenticated) {
    return (
      <AdminLoginForm
        nameInput={admin.nameInput}
        passwordInput={admin.passwordInput}
        loginError={admin.loginError}
        loading={admin.loginLoading}
        onNameChange={admin.setNameInput}
        onPasswordChange={admin.setPasswordInput}
        onSubmit={admin.handlePasswordSubmit}
      />
    );
  }

  if (admin.printMode) {
    return (
      <LabelPrintView
        orders={admin.selectedOrdersData}
        onClose={() => {/* printMode is managed by handlePrintMode */}}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Image src="/images/logo-admin.png" alt="올때만두" width={150} height={40} />
              <span className="text-xl font-bold">관리자</span>
            </div>
            <p className="text-gray-500">
              주문 관리 및 배송 처리
              {admin.adminUser && (
                <span className="ml-2 text-xs text-orange-600 font-medium">
                  ({admin.adminUser.name})
                </span>
              )}
            </p>
            {admin.lastFetchTime && (
              <p className="text-xs text-gray-400 mt-1">
                마지막 업데이트: {format(new Date(admin.lastFetchTime), 'M월 d일 HH:mm:ss', { locale: ko })}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => router.push('/admin/lookup')} variant="outline" className="text-sm md:text-base px-2 md:px-4 border-orange-300 text-orange-600 hover:bg-orange-50">
              <Search className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">주문 조회</span>
              <span className="sm:hidden">조회</span>
            </Button>
            <Button
              onClick={() => admin.setShowHidden(!admin.showHidden)}
              variant={admin.showHidden ? 'default' : 'outline'}
              className={`${admin.showHidden ? 'bg-gray-700 hover:bg-gray-800' : ''} text-sm md:text-base px-2 md:px-4`}
            >
              {admin.showHidden ? <Eye className="mr-1 md:mr-2 h-4 w-4" /> : <EyeOff className="mr-1 md:mr-2 h-4 w-4" />}
              <span className="hidden sm:inline">{admin.showHidden ? '일반 주문 보기' : '숨긴 주문 보기'}</span>
              <span className="sm:hidden">{admin.showHidden ? '일반' : '숨김'}</span>
            </Button>
            <Button onClick={() => admin.setManualOrderDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-sm md:text-base px-2 md:px-4">
              <Plus className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">수기 주문 입력</span>
              <span className="sm:hidden">수기</span>
            </Button>
            <Button onClick={admin.fetchOrders} variant="outline" disabled={admin.loading} className="text-sm md:text-base px-2 md:px-4">
              <RefreshCw className={`mr-1 md:mr-2 h-4 w-4 ${admin.loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <Tabs defaultValue="orders" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="orders" className="px-6">주문관리</TabsTrigger>
            <TabsTrigger value="stats" className="px-6">통계분석</TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="px-6"
              onClick={() => router.push('/admin/inventory')}
            >
              재고관리
            </TabsTrigger>
            {admin.adminUser?.role === 'admin' && (
              <TabsTrigger value="accounts" className="px-6">계정관리</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="orders">
            <AdminOrdersTab
              orders={admin.orders}
              filteredOrders={admin.filteredOrders}
              loading={admin.loading}
              pageStats={admin.pageStats}
              orderStats={admin.orderStats}
              showPageStats={admin.showPageStats}
              setShowPageStats={admin.setShowPageStats}
              showSourceAnalysis={admin.showSourceAnalysis}
              setShowSourceAnalysis={admin.setShowSourceAnalysis}
              pendingDeliveryItems={admin.pendingDeliveryItems}
              pendingDeliveryOrderCount={admin.pendingDeliveryOrderCount}
              filterApt={admin.filterApt}
              setFilterApt={admin.setFilterApt}
              filterStatus={admin.filterStatus}
              setFilterStatus={admin.setFilterStatus}
              filterDeliveryDate={admin.filterDeliveryDate}
              setFilterDeliveryDate={admin.setFilterDeliveryDate}
              filterDeliveryMethod={admin.filterDeliveryMethod}
              setFilterDeliveryMethod={admin.setFilterDeliveryMethod}
              sortBy={admin.sortBy}
              setSortBy={admin.setSortBy}
              sortOrder={admin.sortOrder}
              setSortOrder={admin.setSortOrder}
              searchQuery={admin.searchQuery}
              setSearchQuery={admin.setSearchQuery}
              showHidden={admin.showHidden}
              uniqueDeliveryDates={admin.uniqueDeliveryDates}
              selectedOrders={admin.selectedOrders}
              handleSelectAll={admin.handleSelectAll}
              handleSelectOrder={admin.handleSelectOrder}
              selectedRowId={admin.selectedRowId}
              setSelectedRowId={admin.setSelectedRowId}
              actionLoading={admin.actionLoading}
              remindLoading={admin.remindLoading}
              sendLinkLoading={admin.sendLinkLoading}
              canSendPickupLink={admin.canSendPickupLink}
              handleStatusChange={admin.handleStatusChange}
              handleRemindDeposit={admin.handleRemindDeposit}
              handleSendPickupTimeLink={admin.handleSendPickupTimeLink}
              handleOpenCancelDialog={admin.handleOpenCancelDialog}
              handleHideOrders={admin.handleHideOrders}
              handlePrintMode={admin.handlePrintMode}
              handleOpenDetail={admin.handleOpenDetail}
            />
          </TabsContent>

          <TabsContent value="stats">
            <AdminStatsTab
              stats={admin.stats}
              loading={admin.statsLoading2}
              error={admin.statsError}
              dateRange={admin.dateRange}
              setDateRange={admin.setDateRange}
              fetchStats={admin.fetchStats}
              updateShipmentQuantity={admin.updateShipmentQuantity}
            />
          </TabsContent>

          {admin.adminUser?.role === 'admin' && (
            <TabsContent value="accounts">
              <AccountManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <CancelRequestDialog
        open={admin.cancelDialogOpen}
        onOpenChange={admin.setCancelDialogOpen}
        order={admin.selectedOrderForCancel}
        onSuccess={() => {
          admin.fetchOrders();
          admin.clearSelection();
        }}
      />

      <ManualOrderDialog
        open={admin.manualOrderDialogOpen}
        onOpenChange={admin.setManualOrderDialogOpen}
        onSuccess={() => {
          admin.fetchOrders();
          admin.setManualOrderDialogOpen(false);
        }}
      />

      <OrderDetailDialog
        open={admin.detailDialogOpen}
        onOpenChange={admin.setDetailDialogOpen}
        order={admin.selectedOrderForDetail}
        onDelivered={admin.handleDetailDelivered}
        actionLoading={admin.detailActionLoading}
      />
    </main>
  );
}
