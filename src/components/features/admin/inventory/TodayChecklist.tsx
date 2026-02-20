'use client';

import { useState, useRef, useCallback } from 'react';
import { CheckCircle2, ArrowRight, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { InventoryItemRow } from '@/types/database';

interface TodayChecklistProps {
  items: InventoryItemRow[];
  onSave: (id: string, mainQty: number | null, detailQty: number | null, memo: string | null) => Promise<boolean>;
}

interface RowProps {
  item: InventoryItemRow;
  isDone: boolean;
  isFocused: boolean;
  mainInputRef: (el: HTMLInputElement | null) => void;
  onSave: (mainQty: number | null, detailQty: number | null, memo: string | null) => Promise<boolean>;
  onFocused: () => void;
  onEnter: () => void;
}

/**
 * 고정 높이 행 컴포넌트 — 상태에 따라 색상만 변경, 레이아웃 이동 없음
 *
 * 설계 근거:
 * - Shneiderman(1983) Direct Manipulation: 입력창을 항상 표시하여 즉시 조작 가능
 * - Google CLS: 높이 변화 없이 색상만 바꿔 Layout Shift Score 0 유지
 * - Norman(2013) Affordance: 무엇을 할 수 있는지 즉시 보임
 */
function ChecklistRow({
  item,
  isDone,
  isFocused,
  mainInputRef,
  onSave,
  onFocused,
  onEnter,
}: RowProps) {
  const detailRef = useRef<HTMLInputElement>(null);
  const memoRef = useRef<HTMLInputElement>(null);

  const [mainInput, setMainInput] = useState(
    item.main_qty !== null && item.main_qty !== undefined ? String(item.main_qty) : ''
  );
  const [detailInput, setDetailInput] = useState(
    item.detail_qty !== null && item.detail_qty !== undefined ? String(item.detail_qty) : ''
  );
  const [memoInput, setMemoInput] = useState('');
  const [saving, setSaving] = useState(false);

  const lastCheckLabel = item.last_checked_at
    ? formatDistanceToNow(new Date(item.last_checked_at), { addSuffix: true, locale: ko })
    : '미점검';

  const lastQtyLabel =
    item.main_qty !== null
      ? `${item.main_qty}${item.unit}${item.detail_qty !== null && item.detail_unit ? ` · ${item.detail_qty}${item.detail_unit}` : ''}`
      : '';

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
      setMemoInput('');
      onEnter();
    }
  }, [saving, mainInput, detailInput, memoInput, onSave, onEnter]);

  const handleMainKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (item.detail_unit && detailRef.current) {
      detailRef.current.focus();
      detailRef.current.select();
    } else if (memoRef.current) {
      memoRef.current.focus();
    } else {
      handleSave();
    }
  };

  const handleDetailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (memoRef.current) memoRef.current.focus();
    else handleSave();
  };

  const handleMemoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  // 상태별 색상 토큰 — 높이/구조 변화 없음
  const rowBg = isDone ? 'bg-gray-50' : isFocused ? 'bg-orange-50' : 'bg-white';
  const dotColor = isDone ? 'bg-green-400' : isFocused ? 'bg-orange-400' : 'bg-gray-300';
  const nameColor = isDone ? 'text-gray-400' : 'text-gray-800';
  const inputCls = [
    'w-20 text-center text-sm rounded-lg px-2 py-1.5 border',
    'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400',
    'transition-colors disabled:opacity-40',
    isDone ? 'border-gray-200 bg-white text-gray-500' : 'border-gray-300 bg-white text-gray-800',
  ].join(' ');

  return (
    <div className={`${rowBg} border-b border-gray-100 px-4 py-3 transition-colors`}>
      {/* 줄 1: 상태 점 · 이름 · 마지막 점검 컨텍스트 */}
      <div className="flex items-center gap-2 mb-2 min-h-[20px]">
        <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${dotColor}`} />
        <span className={`text-sm flex-1 font-medium ${nameColor}`}>
          {item.name}
          {item.notes && (
            <span className="ml-1.5 text-xs font-normal text-gray-400">({item.notes})</span>
          )}
        </span>
        {item.last_memo && (
          <span className="text-xs text-orange-600 flex items-center gap-0.5 max-w-[120px] truncate" title={item.last_memo}>
            <MessageSquare className="h-3 w-3 shrink-0" />
            {item.last_memo}
          </span>
        )}
        <span className="text-xs text-gray-400 shrink-0 text-right">
          {lastCheckLabel}
          {lastQtyLabel && (
            <span className="ml-1 text-gray-500 font-medium">· {lastQtyLabel}</span>
          )}
        </span>
      </div>

      {/* 줄 2: 수량 입력 */}
      <div className="flex items-center gap-2 ml-4 min-h-[32px]">
        <input
          ref={mainInputRef}
          type="number"
          inputMode="decimal"
          placeholder="—"
          value={mainInput}
          onChange={(e) => setMainInput(e.target.value)}
          onFocus={onFocused}
          onKeyDown={handleMainKeyDown}
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
              onFocus={onFocused}
              onKeyDown={handleDetailKeyDown}
              disabled={saving}
              className={inputCls}
            />
            <span className="text-xs text-gray-500 shrink-0">{item.detail_unit}</span>
          </>
        )}

        {!item.detail_unit && (
          <input
            ref={memoRef}
            type="text"
            placeholder="메모"
            value={memoInput}
            onChange={(e) => setMemoInput(e.target.value)}
            onFocus={onFocused}
            onKeyDown={handleMemoKeyDown}
            disabled={saving}
            className="flex-1 min-w-0 text-sm rounded-lg px-2 py-1.5 border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors placeholder:text-gray-300 disabled:opacity-40"
          />
        )}

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving}
          title={isDone ? '완료됨 (재저장 가능)' : 'Enter 또는 탭하여 저장'}
          className={[
            'shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
            'transition-colors',
            isDone
              ? 'bg-green-100 text-green-500 hover:bg-green-200'
              : saving
                ? 'bg-orange-200 text-orange-400 cursor-wait'
                : 'bg-orange-100 text-orange-500 hover:bg-orange-500 hover:text-white',
          ].join(' ')}
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* 줄 3: 메모 입력 (detail_unit 있는 항목만 별도 줄) */}
      {item.detail_unit && (
        <div className="flex items-center gap-2 ml-4 mt-1 min-h-[32px]">
          <input
            ref={memoRef}
            type="text"
            placeholder="메모"
            value={memoInput}
            onChange={(e) => setMemoInput(e.target.value)}
            onFocus={onFocused}
            onKeyDown={handleMemoKeyDown}
            disabled={saving}
            className="flex-1 min-w-0 text-sm rounded-lg px-2 py-1.5 border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors placeholder:text-gray-300 disabled:opacity-40"
          />
        </div>
      )}
    </div>
  );
}

export function TodayChecklist({ items, onSave }: TodayChecklistProps) {
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const today = new Date();
  const todayLabel = format(today, 'M월 d일 (EEE)', { locale: ko });

  const handleSave = useCallback(
    async (item: InventoryItemRow, mainQty: number | null, detailQty: number | null, memo: string | null) => {
      const ok = await onSave(item.id, mainQty, detailQty, memo);
      if (ok) setDoneIds((prev) => new Set([...prev, item.id]));
      return ok;
    },
    [onSave]
  );

  // Enter 후 다음 미완료 항목의 입력창으로 포커스 이동 — 레이아웃 이동 없음
  const focusNext = useCallback(
    (currentIndex: number) => {
      for (let i = currentIndex + 1; i < inputRefs.current.length; i++) {
        const ref = inputRefs.current[i];
        if (ref) {
          ref.focus();
          ref.select();
          return;
        }
      }
    },
    []
  );

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
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-gray-800">
            오늘 점검 목록
            <span className="ml-2 text-sm font-normal text-gray-500">{todayLabel}</span>
          </h2>
          <span className="text-sm font-semibold text-orange-600">
            {doneIds.size} / {items.length}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${(doneIds.size / items.length) * 100}%` }}
          />
        </div>
      </div>

      {allDone && (
        <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-700">오늘 점검 완료! 수고하셨습니다.</span>
        </div>
      )}

      <div>
        {items.map((item, idx) => (
          <ChecklistRow
            key={item.id}
            item={item}
            isDone={doneIds.has(item.id)}
            isFocused={focusedId === item.id && !doneIds.has(item.id)}
            mainInputRef={(el) => { inputRefs.current[idx] = el; }}
            onFocused={() => setFocusedId(item.id)}
            onSave={(main, detail, memo) => handleSave(item, main, detail, memo)}
            onEnter={() => focusNext(idx)}
          />
        ))}
      </div>
    </div>
  );
}
