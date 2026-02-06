'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { APARTMENT_LIST, getApartmentFullName, type ApartmentConfig } from '@/lib/constants';
import { Footer } from '@/components/Footer';
import { trackPageView } from '@/lib/trackPageView';
import { captureSource } from '@/lib/sourceTracking';

export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [selectedApt, setSelectedApt] = useState<ApartmentConfig | null>(null);
  
  // 유입 경로 캡처 (페이지 로드 시 1회)
  useEffect(() => {
    captureSource(searchParams);
  }, []); // 빈 배열로 한 번만 실행
  
  useEffect(() => {
    trackPageView('/');
  }, []);

  // 단지 선택 핸들러
  const handleAptSelect = (apt: ApartmentConfig) => {
    const now = new Date();
    const cutoffDate = new Date(apt.cutoffAt);
    
    // 마감일이 지났는지 확인
    if (now > cutoffDate) {
      setSelectedApt(apt);
      setShowExpiredDialog(true);
    } else {
      // 마감 전이면 바로 주문 페이지로
      router.push(`/order?apt=${apt.code}`);
    }
  };

  // 마감 팝업 확인 후 픽업 페이지로 이동
  const handleExpiredDialogConfirm = () => {
    setShowExpiredDialog(false);
    router.push('/pickup');
  };
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
      <div className="max-w-2xl mx-auto px-4 mt-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            단지를 선택해주세요
          </h2>
        </div>

        <div className="space-y-4">
          {APARTMENT_LIST.map((apt) => {
            return (
              <Button
                key={apt.code}
                onClick={() => handleAptSelect(apt)}
                className="w-full h-16 text-xl font-semibold transition-all bg-white hover:bg-brand hover:text-white hover:scale-[1.02] shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-brand"
                variant="outline"
              >
                {getApartmentFullName(apt)}
              </Button>
            );
          })}

          {/* 픽업 주문 옵션 */}
          <div className="pt-6 border-t-2 border-dashed border-gray-300">
            <Link href="/pickup">
              <Button
                className="w-full h-20 text-xl font-bold transition-all bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white hover:scale-[1.02] shadow-lg hover:shadow-2xl border-0"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏪</span>
                    <span>매장 픽업 주문</span>
                  </div>
                  <span className="text-base font-semibold bg-white/20 px-3 py-0.5 rounded-full">
                    3,000원 할인!
                  </span>
                </div>
              </Button>
            </Link>
            <p className="text-center text-sm text-gray-600 mt-3">
              단지 공구 외 일반 고객도 픽업으로 주문 가능합니다
            </p>
          </div>
        </div>
      </div>

      <Footer />

      {/* 마감일 지난 단지 선택 시 안내 팝업 */}
      <Dialog open={showExpiredDialog} onOpenChange={setShowExpiredDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              🥟 {selectedApt ? getApartmentFullName(selectedApt) : ''} 주문 마감
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-3 text-base">
              <p className="text-gray-700">
                해당 단지의 배송 주문이 마감되었습니다.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="font-semibold text-orange-900 mb-2">
                  🏪 매장 픽업 주문 가능
                </p>
                <p className="text-sm text-orange-700">
                  픽업 주문 시 <span className="font-bold">3,000원 할인</span> 혜택을 받으실 수 있습니다!
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowExpiredDialog(false)}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleExpiredDialogConfirm}
              className="flex-1 bg-brand hover:bg-orange-600"
            >
              픽업 주문하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
