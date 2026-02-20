'use client';

import {
  Filter, Search, Truck, CheckCircle, Printer, Download,
  EyeOff, Eye, Bell, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APARTMENT_LIST, ORDER_STATUS_LABEL, getApartmentFullName, PICKUP_APT_CODE } from '@/lib/constants';

interface OrderFiltersAndActionsProps {
  filterApt: string;
  setFilterApt: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterDeliveryDate: string;
  setFilterDeliveryDate: (v: string) => void;
  filterDeliveryMethod: string;
  setFilterDeliveryMethod: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  sortOrder: string;
  setSortOrder: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showHidden: boolean;
  uniqueDeliveryDates: string[];
  selectedOrdersCount: number;
  filteredOrdersCount: number;
  actionLoading: boolean;
  remindLoading: boolean;
  sendLinkLoading: boolean;
  canSendPickupLink: boolean;
  onRemindDeposit: () => void;
  onSendPickupTimeLink: () => void;
  onStatusChange: (status: string) => void;
  onOpenCancelDialog: () => void;
  onHideOrders: (hidden: boolean) => void;
  onPrintMode: () => void;
}

export function OrderFiltersAndActions({
  filterApt, setFilterApt,
  filterStatus, setFilterStatus,
  filterDeliveryDate, setFilterDeliveryDate,
  filterDeliveryMethod, setFilterDeliveryMethod,
  sortBy, setSortBy,
  sortOrder, setSortOrder,
  searchQuery, setSearchQuery,
  showHidden,
  uniqueDeliveryDates,
  selectedOrdersCount,
  filteredOrdersCount,
  actionLoading,
  remindLoading,
  sendLinkLoading,
  canSendPickupLink,
  onRemindDeposit,
  onSendPickupTimeLink,
  onStatusChange,
  onOpenCancelDialog,
  onHideOrders,
  onPrintMode,
}: OrderFiltersAndActionsProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          필터 & 액션
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
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

        <div className="flex items-center gap-2 pb-4 mb-4 border-b">
          <span className="text-sm text-gray-600 font-medium">정렬:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delivery_date">배송일</SelectItem>
              <SelectItem value="created_at">주문일시</SelectItem>
              <SelectItem value="total_amount">금액</SelectItem>
              <SelectItem value="status">상태</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
            {sortBy === 'created_at' || sortBy === 'delivery_date'
              ? (sortOrder === 'asc' ? ' 빠른 순' : ' 늦은 순')
              : (sortOrder === 'asc' ? ' 낮은 순' : ' 높은 순')}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onRemindDeposit}
            disabled={selectedOrdersCount === 0 || remindLoading}
            variant="outline"
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            <Bell className={`mr-2 h-4 w-4 ${remindLoading ? 'animate-pulse' : ''}`} />
            입금 안내 ({selectedOrdersCount})
          </Button>
          <Button
            onClick={onSendPickupTimeLink}
            disabled={!canSendPickupLink || sendLinkLoading}
            variant="outline"
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Clock className={`mr-2 h-4 w-4 ${sendLinkLoading ? 'animate-pulse' : ''}`} />
            픽업시간 요청하기 ({selectedOrdersCount})
          </Button>
          <Button
            onClick={() => onStatusChange('OUT_FOR_DELIVERY')}
            disabled={selectedOrdersCount === 0 || actionLoading}
            variant="outline"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Truck className="mr-2 h-4 w-4" />
            배송출발 ({selectedOrdersCount})
          </Button>
          <Button
            onClick={() => onStatusChange('DELIVERED')}
            disabled={selectedOrdersCount === 0 || actionLoading}
            variant="outline"
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            배송완료 ({selectedOrdersCount})
          </Button>
          <Button
            onClick={onOpenCancelDialog}
            disabled={selectedOrdersCount !== 1 || actionLoading}
            variant="outline"
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            취소 요청 {selectedOrdersCount === 1 ? '(1)' : ''}
          </Button>
          {!showHidden ? (
            <Button
              onClick={() => onHideOrders(true)}
              disabled={selectedOrdersCount === 0}
              variant="outline"
              className="text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              숨기기 ({selectedOrdersCount})
            </Button>
          ) : (
            <Button
              onClick={() => onHideOrders(false)}
              disabled={selectedOrdersCount === 0}
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Eye className="mr-2 h-4 w-4" />
              보이기 ({selectedOrdersCount})
            </Button>
          )}
          <Button
            onClick={onPrintMode}
            disabled={selectedOrdersCount === 0}
            variant="outline"
          >
            <Printer className="mr-2 h-4 w-4" />
            라벨 인쇄 ({selectedOrdersCount})
          </Button>
          <Button
            variant="outline"
            disabled={filteredOrdersCount === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            엑셀 다운로드
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
