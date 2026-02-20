'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertTriangle, MessageSquare, X } from 'lucide-react';
import type { InventoryItemRow } from '@/types/database';

interface InventoryGridViewProps {
  items: InventoryItemRow[];
  onClose: () => void;
  onItemClick: (item: InventoryItemRow) => void;
}

const CATEGORY_ORDER = ['전골', '쫄면', '기타', '포장'];

const CATEGORY_COLORS: Record<string, string> = {
  전골: 'bg-orange-50 text-orange-700',
  쫄면: 'bg-yellow-50 text-yellow-700',
  기타: 'bg-blue-50 text-blue-700',
  포장: 'bg-gray-50 text-gray-600',
};

function isLowStock(item: InventoryItemRow): boolean {
  if (item.min_qty == null || item.main_qty == null) return false;
  return item.main_qty <= item.min_qty;
}

function isNoData(item: InventoryItemRow): boolean {
  return item.main_qty == null;
}

export function InventoryGridView({ items, onClose, onItemClick }: InventoryGridViewProps) {
  const grouped = CATEGORY_ORDER.reduce<Record<string, InventoryItemRow[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {});

  const lowCount = items.filter(isLowStock).length;
  const noDataCount = items.filter(isNoData).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">전체 재고 현황 (표)</h2>
          <div className="flex gap-3 mt-1">
            {lowCount > 0 && (
              <span className="text-xs text-red-600 font-medium flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" />
                발주 필요 {lowCount}건
              </span>
            )}
            {noDataCount > 0 && (
              <span className="text-xs text-gray-400">미입력 {noDataCount}건</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          title="닫기"
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-3 py-2 font-medium text-gray-600 whitespace-nowrap">품목</th>
              <th className="px-3 py-2 font-medium text-gray-600 whitespace-nowrap text-right">수량</th>
              <th className="px-3 py-2 font-medium text-gray-600 whitespace-nowrap text-right">기준</th>
              <th className="px-3 py-2 font-medium text-gray-600 whitespace-nowrap">최근점검</th>
              <th className="px-3 py-2 font-medium text-gray-600 whitespace-nowrap">메모</th>
            </tr>
          </thead>
          {CATEGORY_ORDER.map((category) => {
            const catItems = grouped[category];
            if (!catItems || catItems.length === 0) return null;

            return (
              <tbody key={category}>
                <tr>
                  <td
                    colSpan={5}
                    className={`px-3 py-1.5 text-xs font-semibold border-b border-gray-100 ${CATEGORY_COLORS[category] ?? 'bg-gray-50 text-gray-600'}`}
                  >
                    {category} ({catItems.length})
                  </td>
                </tr>
                {catItems.map((item) => {
                  const low = isLowStock(item);
                  const noData = isNoData(item);
                  const rowCls = low
                    ? 'bg-red-50/60'
                    : noData
                      ? 'bg-yellow-50/40'
                      : '';

                  const qtyLabel = item.main_qty != null
                    ? `${item.main_qty} ${item.unit}${item.detail_qty != null && item.detail_unit ? ` / ${item.detail_qty} ${item.detail_unit}` : ''}`
                    : '—';

                  const minLabel = item.min_qty != null ? `${item.min_qty}` : '';

                  const lastCheck = item.last_checked_at
                    ? formatDistanceToNow(new Date(item.last_checked_at), { addSuffix: true, locale: ko })
                    : '';

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${rowCls}`}
                      onClick={() => onItemClick(item)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-medium text-gray-800">{item.name}</span>
                        {item.notes && (
                          <span className="ml-1 text-xs text-gray-400">({item.notes})</span>
                        )}
                        {low && (
                          <AlertTriangle className="h-3 w-3 text-red-500 inline ml-1" />
                        )}
                      </td>
                      <td className={`px-3 py-2 text-right whitespace-nowrap ${low ? 'text-red-600 font-bold' : noData ? 'text-gray-300' : 'text-gray-700'}`}>
                        {qtyLabel}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap text-gray-400 text-xs">
                        {minLabel}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400">
                        {lastCheck}
                      </td>
                      <td className="px-3 py-2 max-w-[120px] truncate text-xs text-orange-600">
                        {item.last_memo && (
                          <span className="flex items-center gap-0.5" title={item.last_memo}>
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            {item.last_memo}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
