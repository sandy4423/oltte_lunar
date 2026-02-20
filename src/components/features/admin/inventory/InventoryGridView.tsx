'use client';

import { AlertTriangle, MessageSquare, X } from 'lucide-react';
import type { InventoryItemRow } from '@/types/database';

interface InventoryGridViewProps {
  items: InventoryItemRow[];
  onClose: () => void;
  onItemClick: (item: InventoryItemRow) => void;
}

const CATEGORY_ORDER = ['전골', '쫄면', '기타', '포장'];

const CATEGORY_LABEL_COLORS: Record<string, string> = {
  전골: 'bg-orange-100 text-orange-700',
  쫄면: 'bg-yellow-100 text-yellow-700',
  기타: 'bg-blue-100 text-blue-700',
  포장: 'bg-gray-200 text-gray-600',
};

function isLowStock(item: InventoryItemRow): boolean {
  if (item.min_qty == null || item.main_qty == null) return false;
  return item.main_qty <= item.min_qty;
}

function isNoData(item: InventoryItemRow): boolean {
  return item.main_qty == null;
}

function CellCard({ item, onClick }: { item: InventoryItemRow; onClick: () => void }) {
  const low = isLowStock(item);
  const noData = isNoData(item);

  const bg = low
    ? 'bg-red-50 border-red-300 ring-1 ring-red-200'
    : noData
      ? 'bg-gray-50 border-gray-200'
      : 'bg-white border-gray-200';

  const qtyColor = low
    ? 'text-red-600 font-bold'
    : noData
      ? 'text-gray-300'
      : 'text-gray-800 font-semibold';

  const qtyText = item.main_qty != null
    ? `${item.main_qty}`
    : '—';

  return (
    <button
      onClick={onClick}
      className={`${bg} border rounded-lg px-2 py-1.5 text-left hover:shadow-sm transition-shadow active:bg-gray-100 w-full`}
    >
      <div className="flex items-center gap-1 min-h-[18px]">
        <span className="text-xs text-gray-700 truncate leading-tight">{item.name}</span>
        {low && <AlertTriangle className="h-2.5 w-2.5 text-red-500 shrink-0" />}
        {item.last_memo && <MessageSquare className="h-2.5 w-2.5 text-orange-400 shrink-0" />}
      </div>
      <div className={`text-sm ${qtyColor} leading-tight`}>
        {qtyText}
        <span className="text-[10px] text-gray-400 font-normal ml-0.5">{item.unit}</span>
        {item.detail_qty != null && item.detail_unit && (
          <span className="text-[10px] text-gray-400 font-normal ml-1">
            +{item.detail_qty}{item.detail_unit}
          </span>
        )}
      </div>
    </button>
  );
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
      {/* 헤더 */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">전체 재고</h2>
          {lowCount > 0 && (
            <span className="text-[10px] text-red-600 font-medium flex items-center gap-0.5 bg-red-50 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="h-2.5 w-2.5" />
              발주 {lowCount}
            </span>
          )}
          {noDataCount > 0 && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              미입력 {noDataCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          title="닫기"
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* 카테고리별 그리드 */}
      <div className="p-2 space-y-2">
        {CATEGORY_ORDER.map((category) => {
          const catItems = grouped[category];
          if (!catItems || catItems.length === 0) return null;

          return (
            <div key={category}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CATEGORY_LABEL_COLORS[category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {category}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {catItems.map((item) => (
                  <CellCard
                    key={item.id}
                    item={item}
                    onClick={() => onItemClick(item)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
