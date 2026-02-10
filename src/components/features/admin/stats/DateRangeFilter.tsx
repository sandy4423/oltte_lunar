/**
 * 기간 선택 필터 컴포넌트
 * 
 * 통계 조회 기간을 선택할 수 있는 필터입니다.
 * 빠른 선택 버튼과 날짜 직접 입력을 지원합니다.
 */

'use client';

import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DateRange } from '@/hooks/useAdminStats';

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  loading?: boolean;
}

// 빠른 선택 프리셋
const PRESETS = [
  {
    label: '설 시즌',
    startDate: '2026-02-01',
    endDate: '2026-02-15',
  },
  {
    label: '최근 7일',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  {
    label: '최근 30일',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  {
    label: '전체',
    startDate: '',
    endDate: '',
  },
];

export function DateRangeFilter({ dateRange, onDateRangeChange, loading }: DateRangeFilterProps) {
  const handlePresetClick = (preset: typeof PRESETS[number]) => {
    if ('getRange' in preset && preset.getRange) {
      onDateRangeChange(preset.getRange());
    } else {
      onDateRangeChange({
        startDate: preset.startDate || '',
        endDate: preset.endDate || '',
      });
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-gray-500" />
        <h3 className="font-semibold text-gray-700">조회 기간</h3>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* 날짜 입력 */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onDateRangeChange({ ...dateRange, startDate: e.target.value })
            }
            className="w-[160px]"
            disabled={loading}
          />
          <span className="text-gray-400">~</span>
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onDateRangeChange({ ...dateRange, endDate: e.target.value })
            }
            className="w-[160px]"
            disabled={loading}
          />
        </div>

        {/* 빠른 선택 버튼 */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const presetRange = 'getRange' in preset && preset.getRange
              ? preset.getRange()
              : { startDate: preset.startDate || '', endDate: preset.endDate || '' };
            const isActive =
              dateRange.startDate === presetRange.startDate &&
              dateRange.endDate === presetRange.endDate;

            return (
              <Button
                key={preset.label}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetClick(preset)}
                disabled={loading}
                className={isActive ? 'bg-brand hover:bg-brand-dark' : ''}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
