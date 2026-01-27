'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APARTMENT_LIST, getApartmentFullName } from '@/lib/constants';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-8">
      {/* 헤더 */}
      <header className="bg-brand text-white p-8 shadow-lg">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-2">🥟 올때만두</h1>
          <p className="text-orange-100 text-lg">설 만두는 제가 빚을게요</p>
        </div>
      </header>

      {/* 단지 선택 */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            단지를 선택해주세요
          </h2>
        </div>

        <div className="space-y-3">
          {APARTMENT_LIST.map((apt) => {
            const isExpired = new Date() > new Date(apt.cutoffAt);
            
            return (
              <Link key={apt.code} href={`/order?apt=${apt.code}`}>
                <Button
                  className="w-full h-14 text-lg"
                  variant="outline"
                  disabled={isExpired}
                >
                  {getApartmentFullName(apt)}
                  {isExpired && ' (마감)'}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      <Footer />
    </main>
  );
}
