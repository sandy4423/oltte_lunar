'use client';

import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TRAFFIC_SOURCE_LABELS } from '@/types/source';

interface SourceAnalysisProps {
  pageStats: any;
  orderStats: any;
  showSourceAnalysis: boolean;
  onToggle: () => void;
}

export function SourceAnalysis({ pageStats, orderStats, showSourceAnalysis, onToggle }: SourceAnalysisProps) {
  return (
    <div className="mb-8">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 mb-4 w-full hover:opacity-70 transition-opacity"
      >
        <TrendingUp className="h-5 w-5 text-purple-600" />
        <h2 className="text-xl font-bold">유입 경로 분석 (최근 30일)</h2>
        {showSourceAnalysis ? (
          <ChevronUp className="h-5 w-5 text-gray-400 ml-auto" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 ml-auto" />
        )}
      </button>

      {showSourceAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>유입 경로별 방문 및 주문</CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              ?source= 파라미터가 포함된 URL로 접속해야 추적됩니다
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(TRAFFIC_SOURCE_LABELS).map(([key, label]) => {
                const visits = pageStats?.sourceBreakdown?.[key] || 0;
                const orderCount = orderStats?.sourceBreakdown?.[key]?.total || 0;
                const paidOrders = orderStats?.sourceBreakdown?.[key]?.paid || 0;
                const conversion = visits > 0 ? ((orderCount / visits) * 100).toFixed(1) : '0.0';

                return (
                  <div key={key} className="border-b pb-3 last:border-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{label}</span>
                      <span className="text-sm text-gray-500">전환율: {conversion}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">방문</div>
                        <div className="text-lg font-bold text-blue-600">{visits}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">주문</div>
                        <div className="text-lg font-bold text-green-600">{orderCount}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">결제완료</div>
                        <div className="text-lg font-bold text-purple-600">{paidOrders}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
