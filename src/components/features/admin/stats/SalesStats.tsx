/**
 * 매출 통계 컴포넌트
 * 
 * 단지별/상품별/결제상태별/배달방식별 매출을 카드 형태로 표시합니다.
 */

'use client';

import { TrendingUp, MapPin, ShoppingBag, CreditCard, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PRODUCTS } from '@/lib/constants';
import type { SalesStats as SalesStatsType } from '@/hooks/useAdminStats';

interface SalesStatsProps {
  sales: SalesStatsType;
}

export function SalesStats({ sales }: SalesStatsProps) {
  // 상품 정보 매핑
  const productInfoMap: Record<string, { name: string; emoji: string }> = {};
  for (const p of PRODUCTS) {
    productInfoMap[p.sku] = { name: p.name, emoji: p.emoji };
  }

  // 단지별 정렬 (매출순 내림차순)
  const sortedApts = Object.entries(sales.byApt)
    .sort(([, a], [, b]) => b.revenue - a.revenue);

  // 상품별 정렬 (매출순 내림차순)
  const sortedProducts = Object.entries(sales.byProduct)
    .sort(([, a], [, b]) => b.revenue - a.revenue);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-bold text-gray-800">매출 통계</h3>
      </div>

      {/* 총 매출 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">총 매출 (할인 전)</p>
            <p className="text-2xl font-bold text-green-600">
              {sales.totalRevenue.toLocaleString()}원
            </p>
            <p className="text-xs text-gray-400 mt-1">{sales.totalOrders}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">픽업 할인</p>
            <p className="text-2xl font-bold text-red-600">
              -{sales.totalDiscount.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">실제 매출</p>
            <p className="text-2xl font-bold text-blue-600">
              {sales.netRevenue.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">입금대기</p>
            <p className="text-2xl font-bold text-yellow-600">
              {sales.byStatus.waitingDeposit.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 상세 매출 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 단지별 매출 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-blue-500" />
              단지별 매출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedApts.map(([aptCode, data]) => {
                const percentage = sales.totalRevenue > 0
                  ? ((data.revenue / sales.totalRevenue) * 100).toFixed(1)
                  : '0.0';

                return (
                  <div key={aptCode}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700 truncate max-w-[150px]" title={data.name}>
                        {data.name}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {data.revenue.toLocaleString()}원
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          ({data.orders}건)
                        </span>
                      </div>
                    </div>
                    {/* 진행 바 */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {sortedApts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">데이터가 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 상품별 매출 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4 text-orange-500" />
              상품별 매출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedProducts.map(([sku, data]) => {
                const info = productInfoMap[sku] || { name: sku, emoji: '📦' };
                const percentage = sales.totalRevenue > 0
                  ? ((data.revenue / sales.totalRevenue) * 100).toFixed(1)
                  : '0.0';

                return (
                  <div key={sku}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700">
                        {info.emoji} {info.name}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {data.revenue.toLocaleString()}원
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          ({data.qty}개)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {sortedProducts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">데이터가 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 결제 상태별 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-green-500" />
              결제 상태별
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  결제완료
                </span>
                <span className="text-sm font-bold text-green-600">
                  {sales.byStatus.paid.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
                  입금대기
                </span>
                <span className="text-sm font-bold text-yellow-600">
                  {sales.byStatus.waitingDeposit.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                  배송완료
                </span>
                <span className="text-sm font-bold text-purple-600">
                  {sales.byStatus.delivered.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  환불
                </span>
                <span className="text-sm font-bold text-red-600">
                  {sales.byStatus.refunded.toLocaleString()}원
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 배달/픽업 비교 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-purple-500" />
              배달 / 픽업 비교
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-700">🚚 배달</span>
                  <span className="text-sm font-bold">
                    {sales.byDeliveryMethod.delivery.revenue.toLocaleString()}원
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {sales.byDeliveryMethod.delivery.orders}건
                </p>
              </div>
              <hr />
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-purple-700">🏪 픽업</span>
                  <span className="text-sm font-bold">
                    {sales.byDeliveryMethod.pickup.revenue.toLocaleString()}원
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {sales.byDeliveryMethod.pickup.orders}건
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
