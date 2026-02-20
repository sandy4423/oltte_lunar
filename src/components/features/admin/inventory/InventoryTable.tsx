'use client';

import { useState, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertTriangle, Clock, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';
import type { InventoryItemRow } from '@/types/database';

interface InventoryTableProps {
  items: InventoryItemRow[];
  staffName: string;
  onSave: (id: string, mainQty: number | null, detailQty: number | null, memo: string | null) => Promise<boolean>;
  onItemClick: (item: InventoryItemRow) => void;
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

interface EditableRowProps {
  item: InventoryItemRow;
  onSave: (mainQty: number | null, detailQty: number | null, memo: string | null) => Promise<boolean>;
  onItemClick: () => void;
}

function EditableRow({ item, onSave, onItemClick }: EditableRowProps) {
  const [mainInput, setMainInput] = useState(
    item.main_qty !== null ? String(item.main_qty) : ''
  );
  const [detailInput, setDetailInput] = useState(
    item.detail_qty !== null ? String(item.detail_qty) : ''
  );
  const [memoInput, setMemoInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const detailRef = useRef<HTMLInputElement>(null);
  const memoRef = useRef<HTMLInputElement>(null);

  const status = getCheckStatus(item);
  const lastCheckLabel = item.last_checked_at
    ? formatDistanceToNow(new Date(item.last_checked_at), { addSuffix: true, locale: ko })
    : '미점검';

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const main = mainInput.trim() === '' ? null : parseFloat(mainInput);
    const detail = detailInput.trim() === '' ? null : parseFloat(detailInput);
    const memo = memoInput.trim() || null;
    const ok = await onSave(
      main !== null && !isNaN(main) ? main : null,
      detail !== null && !isNaN(detail) ? detail : null,
      memo
    );
    setSaving(false);
    if (ok) {
      setSaved(true);
      setMemoInput('');
      setTimeout(() => setSaved(false), 2000);
    }
  }, [saving, mainInput, detailInput, memoInput, onSave]);

  const handleMainKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (item.detail_unit && detailRef.current) {
      detailRef.current.focus();
    } else if (memoRef.current) {
      memoRef.current.focus();
    } else {
      handleSave();
    }
  };

  const handleDetailKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (memoRef.current) memoRef.current.focus();
    else handleSave();
  };

  const handleMemoKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const rowBg = saved
    ? 'bg-green-50'
    : status === 'overdue' || status === 'never'
      ? 'bg-red-50/40'
      : 'bg-white';

  const dotColor = {
    ok: 'bg-green-400',
    warn: 'bg-yellow-400',
    overdue: 'bg-red-500',
    never: 'bg-gray-300',
  }[status];

  const inputCls = [
    'w-20 text-center text-sm rounded-lg px-2 py-1.5 border',
    'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400',
    'transition-colors',
    'border-gray-300 bg-white text-gray-800',
  ].join(' ');

  return (
    <div className={`${rowBg} border-b border-gray-100 px-4 py-2.5 transition-colors`}>
      {/* 줄 1: 이름 · 직전메모 · 마지막점검 */}
      <div className="flex items-center gap-2 mb-1.5 min-h-[20px]">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <button
          onClick={onItemClick}
          className="text-sm font-medium text-gray-800 hover:text-orange-600 hover:underline text-left"
        >
          {item.name}
        </button>
        {item.notes && (
          <span className="text-xs text-gray-400">({item.notes})</span>
        )}
        {item.last_memo && (
          <span className="text-xs text-orange-600 flex items-center gap-0.5 ml-auto mr-2 max-w-[200px] truncate" title={item.last_memo}>
            <MessageSquare className="h-3 w-3 shrink-0" />
            {item.last_memo}
          </span>
        )}
        <span className={`text-xs shrink-0 ml-auto ${
          status === 'overdue' ? 'text-red-600 font-medium' : status === 'warn' ? 'text-yellow-600' : 'text-gray-400'
        }`}>
          {status === 'overdue' && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
          {status === 'warn' && <Clock className="h-3 w-3 inline mr-0.5" />}
          {lastCheckLabel}
        </span>
      </div>

      {/* 줄 2: 입력창 */}
      <div className="flex items-center gap-2 ml-4 min-h-[32px]">
        <input
          type="number"
          inputMode="decimal"
          placeholder="—"
          value={mainInput}
          onChange={(e) => setMainInput(e.target.value)}
          onKeyDown={handleMainKey}
          disabled={saving}
          className={inputCls}
        />
        <span className="text-xs text-gray-500 shrink-0">{item.unit}</span>

        {item.detail_unit && (
          <>
            <input
              ref={detailRef}
              type="number"
              inputMode="decimal"
              placeholder="—"
              value={detailInput}
              onChange={(e) => setDetailInput(e.target.value)}
              onKeyDown={handleDetailKey}
              disabled={saving}
              className={inputCls}
            />
            <span className="text-xs text-gray-500 shrink-0">{item.detail_unit}</span>
          </>
        )}

        <input
          ref={memoRef}
          type="text"
          placeholder="메모"
          value={memoInput}
          onChange={(e) => setMemoInput(e.target.value)}
          onKeyDown={handleMemoKey}
          disabled={saving}
          className="flex-1 min-w-0 text-sm rounded-lg px-2 py-1.5 border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors placeholder:text-gray-300"
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className={[
            'shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors',
            saved
              ? 'bg-green-100 text-green-500'
              : saving
                ? 'bg-orange-200 text-orange-400 cursor-wait'
                : 'bg-orange-100 text-orange-500 hover:bg-orange-500 hover:text-white',
          ].join(' ')}
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function InventoryTable({ items, staffName, onSave, onItemClick }: InventoryTableProps) {
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
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-700'}`}
              >
                {category}
              </span>
              <span className="text-xs text-gray-400">{catItems.length}개</span>
            </div>

            {catItems.map((item) => (
              <EditableRow
                key={item.id}
                item={item}
                onSave={(main, detail, memo) => onSave(item.id, main, detail, memo)}
                onItemClick={() => onItemClick(item)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
