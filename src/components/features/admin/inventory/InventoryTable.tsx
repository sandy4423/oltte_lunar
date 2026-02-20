'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertTriangle, Clock } from 'lucide-react';
import type { InventoryItemRow } from '@/types/database';

interface InventoryTableProps {
  items: InventoryItemRow[];
}

const CATEGORY_ORDER = ['전골', '쫄면', '기타', '포장'];

const CATEGORY_COLORS: Record<string, string> = {
  전골: 'bg-orange-100 text-orange-800',
  쫄면: 'bg-yellow-100 text-yellow-800',
  기타: 'bg-blue-100 text-blue-800',
  포장: 'bg-gray-100 text-gray-700',
};

function getCheckStatus(item: InventoryItemRow): 'ok' | 'warn' | 'overdue' | 'never' {
  if (!item.last_checked_at) return 'never';
  const lastChecked = new Date(item.last_checked_at);
  const now = new Date();
  const elapsedDays = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60 * 24);
  if (elapsedDays <= item.check_interval_days) return 'ok';
  if (elapsedDays <= item.check_interval_days * 1.5) return 'warn';
  return 'overdue';
}

function StatusDot({ status }: { status: ReturnType<typeof getCheckStatus> }) {
  const styles = {
    ok: 'bg-green-400',
    warn: 'bg-yellow-400',
    overdue: 'bg-red-500',
    never: 'bg-gray-300',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${styles[status]}`}
      title={
        status === 'ok'
          ? '최근 점검 완료'
          : status === 'warn'
            ? '점검 기한 임박'
            : status === 'overdue'
              ? '점검 기한 초과'
              : '미점검'
      }
    />
  );
}

function LastCheckedLabel({ item }: { item: InventoryItemRow }) {
  if (!item.last_checked_at) {
    return <span className="text-gray-400 text-xs">미점검</span>;
  }
  const relative = formatDistanceToNow(new Date(item.last_checked_at), {
    addSuffix: true,
    locale: ko,
  });
  const status = getCheckStatus(item);
  return (
    <span
      className={`text-xs flex items-center gap-1 ${
        status === 'overdue'
          ? 'text-red-600 font-medium'
          : status === 'warn'
            ? 'text-yellow-600'
            : 'text-gray-500'
      }`}
    >
      {status === 'overdue' && <AlertTriangle className="h-3 w-3 shrink-0" />}
      {status === 'warn' && <Clock className="h-3 w-3 shrink-0" />}
      {relative}
    </span>
  );
}

export function InventoryTable({ items }: InventoryTableProps) {
  const grouped = CATEGORY_ORDER.reduce<Record<string, InventoryItemRow[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {});

  const overdueCount = items.filter(
    (i) => getCheckStatus(i) === 'overdue' || getCheckStatus(i) === 'never'
  ).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">전체 재고 현황</h2>
        {overdueCount > 0 && (
          <span className="text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            점검 필요 {overdueCount}건
          </span>
        )}
      </div>

      {CATEGORY_ORDER.map((category) => {
        const catItems = grouped[category];
        if (!catItems || catItems.length === 0) return null;

        return (
          <div key={category}>
            {/* 카테고리 헤더 */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-700'}`}
              >
                {category}
              </span>
              <span className="text-xs text-gray-400">{catItems.length}개 항목</span>
            </div>

            {/* 항목 목록 */}
            <div className="divide-y divide-gray-50">
              {catItems.map((item) => {
                const status = getCheckStatus(item);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${
                      status === 'overdue' || status === 'never' ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <StatusDot status={status} />

                    {/* 이름 + 메모 */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-800">{item.name}</span>
                      {item.notes && (
                        <span className="ml-1.5 text-xs text-gray-400">({item.notes})</span>
                      )}
                    </div>

                    {/* 현재고 */}
                    <div className="flex items-center gap-1 text-sm text-gray-700 shrink-0">
                      {item.main_qty !== null ? (
                        <span className="font-medium">
                          {item.main_qty}
                          <span className="text-xs font-normal text-gray-500 ml-0.5">
                            {item.unit}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                      {item.detail_unit && item.detail_qty !== null && (
                        <span className="text-gray-500 text-xs ml-1">
                          {item.detail_qty} {item.detail_unit}
                        </span>
                      )}
                    </div>

                    {/* 마지막 점검 */}
                    <div className="w-24 text-right shrink-0">
                      <LastCheckedLabel item={item} />
                    </div>

                    {/* 점검빈도 */}
                    <div className="w-12 text-right shrink-0">
                      <span className="text-xs text-gray-400">{item.check_interval_days}일</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
