'use client';

import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APARTMENTS, getApartmentFullName } from '@/lib/constants';

interface PageVisitStatsProps {
  pageStats: any;
  showPageStats: boolean;
  onToggle: () => void;
}

export function PageVisitStats({ pageStats, showPageStats, onToggle }: PageVisitStatsProps) {
  if (!pageStats) return null;

  return (
    <div className="mb-8">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 mb-4 w-full hover:opacity-70 transition-opacity"
      >
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-bold">페이지 방문 통계 (최근 30일)</h2>
        {showPageStats ? (
          <ChevronUp className="h-5 w-5 text-gray-400 ml-auto" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 ml-auto" />
        )}
      </button>

      {showPageStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">총 방문</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{pageStats.totalViews}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">홈페이지</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {pageStats.pageBreakdown['/'] || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">주문 페이지</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {pageStats.pageBreakdown['/order'] || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>페이지별 방문</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(pageStats.pageBreakdown).map(([page, count]) => (
                    <div key={page} className="flex justify-between items-center">
                      <span className="text-sm font-mono text-gray-700">{page}</span>
                      <span className="text-sm font-bold">{count as number}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {Object.keys(pageStats.aptBreakdown).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>단지별 주문 페이지 방문</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(pageStats.aptBreakdown).map(([aptCode, count]) => {
                      const apartment = APARTMENTS[aptCode];
                      const displayName = apartment ? getApartmentFullName(apartment) : aptCode;
                      return (
                        <div key={aptCode} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">{displayName}</span>
                          <span className="text-sm font-bold">{count as number}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
