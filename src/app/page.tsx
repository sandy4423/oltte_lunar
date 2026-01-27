'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MapPin, Calendar, Clock } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { APARTMENT_LIST, getApartmentFullName } from '@/lib/constants';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-8">
      {/* 헤더 */}
      <header className="bg-brand text-white p-8 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-2">🥟 올때만두</h1>
          <p className="text-orange-100 text-lg">설 만두는 제가 빚을게요</p>
        </div>
      </header>

      {/* 단지 선택 */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            단지를 선택해주세요
          </h2>
          <p className="text-gray-600">
            각 단지별로 배송일과 주문 마감 시간이 다릅니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {APARTMENT_LIST.map((apt) => {
            const isExpired = new Date() > new Date(apt.cutoffAt);
            
            return (
              <Link key={apt.code} href={`/order?apt=${apt.code}`}>
                <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${
                  isExpired ? 'opacity-50' : 'hover:border-brand'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {getApartmentFullName(apt)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {apt.households.toLocaleString()}세대 · {apt.dongCount}개 동
                        </p>
                      </div>
                      {isExpired && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                          마감
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-gray-600">주문마감:</span>
                        <span className="font-semibold text-brand-dark">
                          {format(new Date(apt.cutoffAt), 'M월 d일 (EEE) HH:mm', { locale: ko })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span className="text-gray-600">배송일:</span>
                        <span className="font-semibold text-brand">
                          {format(new Date(apt.deliveryDate), 'M월 d일 (EEE)', { locale: ko })}
                        </span>
                      </div>
                    </div>

                    {!isExpired && (
                      <Button className="w-full mt-4" variant="outline">
                        <MapPin className="h-4 w-4 mr-2" />
                        주문하기
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <Footer />
    </main>
  );
}
