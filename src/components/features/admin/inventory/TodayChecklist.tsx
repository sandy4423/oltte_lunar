'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { InventoryItemRow } from '@/types/database';

interface TodayChecklistProps {
  items: InventoryItemRow[];
  onSave: (id: string, mainQty: number | null, detailQty: number | null) => Promise<boolean>;
}

interface ChecklistRowProps {
  item: InventoryItemRow;
  index: number;
  isCurrent: boolean;
  isDone: boolean;
  onActivate: () => void;
  onSave: (mainQty: number | null, detailQty: number | null) => Promise<boolean>;
  onNext: () => void;
}

function ChecklistRow({
  item,
  index,
  isCurrent,
  isDone,
  onActivate,
  onSave,
  onNext,
}: ChecklistRowProps) {
  const [mainInput, setMainInput] = useState(
    item.main_qty !== null && item.main_qty !== undefined ? String(item.main_qty) : ''
  );
  const [detailInput, setDetailInput] = useState(
    item.detail_qty !== null && item.detail_qty !== undefined ? String(item.detail_qty) : ''
  );
  const [saving, setSaving] = useState(false);
  const mainRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCurrent && mainRef.current) {
      mainRef.current.focus();
      mainRef.current.select();
    }
  }, [isCurrent]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    const main = mainInput.trim() === '' ? null : parseFloat(mainInput);
    const detail = detailInput.trim() === '' ? null : parseFloat(detailInput);
    const ok = await onSave(
      main !== null && !isNaN(main) ? main : null,
      detail !== null && !isNaN(detail) ? detail : null
    );
    setSaving(false);
    if (ok) onNext();
  }, [mainInput, detailInput, onSave, onNext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isLast: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isLast && item.detail_unit) {
        // 상세단위 있으면 다음 input으로
        const inputs = (e.currentTarget.closest('div')?.querySelectorAll('input') ?? []);
        const currentIdx = Array.from(inputs).indexOf(e.currentTarget);
        const nextInput = inputs[currentIdx + 1] as HTMLInputElement | undefined;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
          return;
        }
      }
      handleSubmit();
    }
  };

  if (isDone) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 opacity-60">
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
        <span className="text-sm text-gray-500 flex-1 line-through">{item.name}</span>
        <span className="text-xs text-gray-400">{item.unit}</span>
        {item.main_qty !== null && (
          <span className="text-sm text-gray-400 font-medium w-14 text-right">
            {item.main_qty}
          </span>
        )}
      </div>
    );
  }

  if (isCurrent) {
    return (
      <div className="flex items-start gap-3 px-4 py-4 bg-orange-50 border-b border-orange-200 border-l-4 border-l-orange-500">
        <ChevronRight className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-800">{item.name}</span>
            {item.notes && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {item.notes}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <input
                ref={mainRef}
                type="number"
                inputMode="decimal"
                placeholder="수량"
                value={mainInput}
                onChange={(e) => setMainInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, !item.detail_unit)}
                disabled={saving}
                className="w-24 text-center text-base border-2 border-orange-400 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
              />
              <span className="text-sm text-gray-600">{item.unit}</span>
            </div>
            {item.detail_unit && (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="상세"
                  value={detailInput}
                  onChange={(e) => setDetailInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, true)}
                  disabled={saving}
                  className="w-24 text-center text-base border-2 border-orange-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                />
                <span className="text-sm text-gray-600">{item.detail_unit}</span>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="ml-1 px-4 py-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? '저장중…' : '완료'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onActivate}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
    >
      <Circle className="h-5 w-5 text-gray-300 shrink-0" />
      <span className="text-sm text-gray-700 flex-1">
        {index + 1}. {item.name}
      </span>
      <span className="text-xs text-gray-400">{item.unit}</span>
    </button>
  );
}

export function TodayChecklist({ items, onSave }: TodayChecklistProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  const today = new Date();
  const todayLabel = format(today, 'M월 d일 (EEE)', { locale: ko });

  const handleSave = useCallback(
    async (item: InventoryItemRow, mainQty: number | null, detailQty: number | null) => {
      const ok = await onSave(item.id, mainQty, detailQty);
      if (ok) {
        setDoneIds((prev) => new Set([...prev, item.id]));
      }
      return ok;
    },
    [onSave]
  );

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      return next < items.length ? next : prev;
    });
  }, [items.length]);

  const allDone = doneIds.size === items.length;

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">오늘 점검할 항목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-bold text-gray-800">
              오늘 점검 목록
              <span className="ml-2 text-sm font-normal text-gray-500">{todayLabel}</span>
            </h2>
          </div>
          <span className="text-sm font-semibold text-orange-600">
            {doneIds.size} / {items.length}
          </span>
        </div>
        {/* 진행률 바 */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${(doneIds.size / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 완료 메시지 */}
      {allDone && (
        <div className="px-4 py-4 bg-green-50 border-b border-green-100 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-700">
            오늘 점검 완료! 수고하셨습니다.
          </span>
        </div>
      )}

      {/* 체크리스트 목록 */}
      <div>
        {items.map((item, idx) => (
          <ChecklistRow
            key={item.id}
            item={item}
            index={idx}
            isCurrent={!allDone && idx === currentIndex}
            isDone={doneIds.has(item.id)}
            onActivate={() => setCurrentIndex(idx)}
            onSave={(main, detail) => handleSave(item, main, detail)}
            onNext={goNext}
          />
        ))}
      </div>
    </div>
  );
}
