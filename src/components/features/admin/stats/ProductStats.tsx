/**
 * 상품별 통계 컴포넌트
 * 
 * 상품별 주문 수량, 매출액, 단지별 수량, 출하 날짜별 수량을 표시합니다.
 * 출하 수량은 인라인 편집이 가능합니다.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APARTMENT_LIST, getApartmentFullName } from '@/lib/constants';
import type { ProductStat } from '@/hooks/useAdminStats';

interface ProductStatsProps {
  products: Record<string, ProductStat>;
  shipmentDates: string[];
  onUpdateShipment: (sku: string, date: string, quantity: number) => Promise<boolean>;
}

// ============================================
// 인라인 편집 가능한 셀 컴포넌트
// ============================================

interface EditableCellProps {
  value: number;
  onSave: (value: number) => Promise<boolean>;
}

function EditableCell({ value, onSave }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // value prop 변경 시 동기화
  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(value));
    }
  }, [value, isEditing]);

  // 편집 시작 시 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(async (val: string) => {
    const numValue = parseInt(val, 10);
    if (isNaN(numValue) || numValue < 0) {
      setInputValue(String(value));
      setIsEditing(false);
      return;
    }

    if (numValue === value) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    const success = await onSave(numValue);
    setSaving(false);

    if (!success) {
      setInputValue(String(value));
    }
    setIsEditing(false);
  }, [value, onSave]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // 디바운스 자동 저장
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      handleSave(val);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      handleSave(inputValue);
    } else if (e.key === 'Escape') {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setInputValue(String(value));
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    handleSave(inputValue);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={saving}
        title="출하 수량 입력"
        aria-label="출하 수량 입력"
        className="w-16 text-center text-sm border border-blue-400 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="w-16 text-center text-sm py-0.5 px-1 rounded cursor-pointer hover:bg-red-100 transition-colors"
      title="클릭하여 수정"
    >
      {value || '-'}
    </button>
  );
}

// ============================================
// 메인 상품별 통계 컴포넌트
// ============================================

export function ProductStats({ products, shipmentDates, onUpdateShipment }: ProductStatsProps) {
  const skuOrder = ['meat', 'kimchi', 'half', 'ricecake_1kg', 'broth_1200ml'];
  const sortedSkus = skuOrder.filter(sku => products[sku]);

  // 단지별 합계 계산
  const aptTotals: Record<string, number> = {};
  for (const sku of sortedSkus) {
    for (const [aptCode, qty] of Object.entries(products[sku].byApt)) {
      aptTotals[aptCode] = (aptTotals[aptCode] || 0) + qty;
    }
  }

  // 날짜별 합계 계산
  const dateTotals: Record<string, number> = {};
  for (const sku of sortedSkus) {
    for (const [date, qty] of Object.entries(products[sku].shipmentByDate)) {
      dateTotals[date] = (dateTotals[date] || 0) + qty;
    }
  }

  // 전체 합계
  const totalQty = sortedSkus.reduce((sum, sku) => sum + products[sku].totalQty, 0);
  const totalRevenue = sortedSkus.reduce((sum, sku) => sum + products[sku].totalRevenue, 0);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-orange-600" />
          상품별 통계
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                {/* 고정 컬럼 */}
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 min-w-[120px]">
                  상품
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 min-w-[80px]">
                  총 수량
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 min-w-[120px]">
                  매출액
                </th>

                {/* 단지별 컬럼 */}
                {APARTMENT_LIST.map((apt) => (
                  <th
                    key={apt.code}
                    className="px-2 py-3 text-center font-semibold text-gray-600 min-w-[70px] bg-orange-50 text-xs"
                    title={getApartmentFullName(apt)}
                  >
                    {apt.name}
                    {apt.dongRange && (
                      <div className="text-[10px] font-normal text-gray-400 truncate max-w-[70px]">
                        {apt.dongRange}
                      </div>
                    )}
                  </th>
                ))}

                {/* 출하 날짜 컬럼 */}
                {shipmentDates.map((date) => (
                  <th
                    key={date}
                    className="px-2 py-3 text-center font-semibold text-gray-600 min-w-[80px] bg-red-50"
                  >
                    <div className="text-xs">📦 {format(new Date(date + 'T00:00:00'), 'M.d')}</div>
                    <div className="text-[10px] font-normal text-gray-400">
                      ({format(new Date(date + 'T00:00:00'), 'EEE', { locale: ko })})
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSkus.map((sku) => {
                const product = products[sku];

                return (
                  <tr key={sku} className="border-b hover:bg-gray-50 transition-colors">
                    {/* 상품명 */}
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium">
                      {product.emoji} {product.name}
                    </td>

                    {/* 총 수량 */}
                    <td className="px-3 py-3 text-right font-medium">
                      {product.totalQty.toLocaleString()}개
                    </td>

                    {/* 매출액 */}
                    <td className="px-3 py-3 text-right font-medium">
                      {product.totalRevenue.toLocaleString()}원
                    </td>

                    {/* 단지별 수량 */}
                    {APARTMENT_LIST.map((apt) => (
                      <td
                        key={apt.code}
                        className="px-2 py-3 text-center bg-orange-50/50"
                      >
                        {product.byApt[apt.code] || '-'}
                      </td>
                    ))}

                    {/* 출하 날짜별 수량 (편집 가능) */}
                    {shipmentDates.map((date) => (
                      <td
                        key={date}
                        className="px-2 py-3 text-center bg-red-50/50"
                      >
                        <EditableCell
                          value={product.shipmentByDate[date] || 0}
                          onSave={(quantity) => onUpdateShipment(sku, date, quantity)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* 합계 행 */}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3">📊 합계</td>
                <td className="px-3 py-3 text-right">{totalQty.toLocaleString()}개</td>
                <td className="px-3 py-3 text-right">{totalRevenue.toLocaleString()}원</td>

                {APARTMENT_LIST.map((apt) => (
                  <td key={apt.code} className="px-2 py-3 text-center bg-orange-50">
                    {aptTotals[apt.code] || '-'}
                  </td>
                ))}

                {shipmentDates.map((date) => (
                  <td key={date} className="px-2 py-3 text-center bg-red-50 font-bold">
                    {dateTotals[date] || 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
