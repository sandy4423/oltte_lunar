'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { APARTMENT_LIST, getApartmentFullName, DANGOL_DISCOUNT, PICKUP_DISCOUNT, type ApartmentConfig } from '@/lib/constants';
import { Footer } from '@/components/Footer';
import { trackPageView } from '@/lib/trackPageView';

const DANGOL_SOURCE = 'dangol';

export default function DangolPage() {
  const router = useRouter();
  
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [selectedApt, setSelectedApt] = useState<ApartmentConfig | null>(null);
  
  // 단골톡방 유입 경로 강제 저장 (페이지 로드 시 1회)
  useEffect(() => {
    sessionStorage.setItem('traffic_source', DANGOL_SOURCE);
  }, []);
  
  useEffect(() => {
    trackPageView('/dangol');
  }, []);

  // 단지 선택 핸들러
  const handleAptSelect = (apt: ApartmentConfig) => {
    const now = new Date();
    const cutoffDate = new Date(apt.cutoffAt);
    
    if (now > cutoffDate) {
      setSelectedApt(apt);
      setShowExpiredDialog(true);
    } else {
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
          <div className="flex justify-center mb-2">
            <Image
              src="/images/logo.png"
              alt="올때만두"
              width={220}
              height={60}
              priority
            />
          </div>
          <p className="text-orange-100 text-lg">설 만두는 제가 빚을게요</p>
        </div>
      </header>

      {/* 단골톡방 전용 할인 배너 */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-5 sm:p-6 shadow-lg text-white text-center">
          <p className="text-sm font-medium mb-1 opacity-90">단골톡방 고객님 전용</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            {DANGOL_DISCOUNT.toLocaleString()}원 특별 할인!
          </h2>
          <p className="text-orange-100 text-sm sm:text-base">
            이 페이지에서 주문하시면 자동으로 할인이 적용됩니다
          </p>
          <div className="mt-3 inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs sm:text-sm">
            픽업 주문 시 {PICKUP_DISCOUNT.toLocaleString()}원 추가 할인 (최대 {(DANGOL_DISCOUNT + PICKUP_DISCOUNT).toLocaleString()}원!)
          </div>
        </div>
      </div>

      {/* 사장님 손글씨 인사말 */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 sm:p-6 shadow-sm border border-orange-100">
          <Image
            src="/images/handwriting-greeting.png"
            alt="사장님 손글씨 인사말"
            width={800}
            height={400}
            className="w-full h-auto"
          />
        </div>
      </div>

      {/* 설날 예약주문 안내 */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 sm:p-6 shadow-sm">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2 flex-wrap">
            <span>🎊</span>
            <span>설 명절 특별 주문</span>
            <span className="text-sm sm:text-base font-semibold text-orange-600">- 단지별 마감 임박</span>
          </h3>
          <p className="text-sm sm:text-base text-gray-700 mb-4 leading-relaxed">
            설날 음식 준비 걱정 끝! 떡국떡, 양지육수, 수제만두를 한 번에
          </p>
          <ul className="space-y-2 text-sm sm:text-base text-gray-800">
            <li className="flex items-start gap-2">
              <span className="text-brand font-semibold">•</span>
              <span><span className="font-semibold">단지별 배송:</span> 우리 아파트 선택하기</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand font-semibold">•</span>
              <span><span className="font-semibold">픽업 할인:</span> 매장에서 직접 수령하고 3,000원 아끼기</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-semibold">•</span>
              <span><span className="font-semibold text-red-600">단골 할인:</span> 이 페이지에서 주문 시 {DANGOL_DISCOUNT.toLocaleString()}원 자동 할인</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 픽업 주문 안내 섹션 */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <Link href="/pickup">
          <div className="bg-gradient-to-r from-orange-400 to-amber-400 rounded-lg p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] cursor-pointer">
            <div className="text-center text-white">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl sm:text-3xl">🏪</span>
                <h3 className="text-xl sm:text-2xl font-bold">매장 픽업 주문</h3>
              </div>
              <div className="inline-block bg-white/90 text-orange-600 font-bold text-lg sm:text-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3">
                최대 {(DANGOL_DISCOUNT + PICKUP_DISCOUNT).toLocaleString()}원 할인!
              </div>
              <p className="text-orange-50 text-xs sm:text-sm">
                단골 할인 + 픽업 할인 동시 적용!
              </p>
            </div>
          </div>
        </Link>
      </div>

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

          {/* 픽업 주문 재진입 옵션 */}
          <div className="pt-6 border-t-2 border-dashed border-gray-300">
            <p className="text-center text-sm text-gray-600 mb-3">
              혹시 픽업도 고려중이신가요?
            </p>
            <Link href="/pickup">
              <Button
                className="w-full h-16 text-base sm:text-lg font-semibold transition-all bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white hover:scale-[1.02] shadow-lg hover:shadow-xl border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">🏪</span>
                  <span className="whitespace-nowrap">매장 픽업 주문 (최대 {(DANGOL_DISCOUNT + PICKUP_DISCOUNT).toLocaleString()}원 할인)</span>
                </div>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 이미 주문하신 고객 환불 안내 */}
      <div className="max-w-2xl mx-auto px-4 mt-12">
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 sm:p-6 shadow-sm">
          <h3 className="text-base sm:text-lg font-bold text-sky-900 mb-2 flex items-center gap-2">
            <span>💬</span>
            <span>이미 주문하셨나요?</span>
          </h3>
          <p className="text-sm sm:text-base text-sky-800 leading-relaxed mb-4">
            단골톡방에 계시면서 이미 주문하신 고객님은<br />
            아래 링크를 통해 연락주시면 <span className="font-bold text-red-600">{DANGOL_DISCOUNT.toLocaleString()}원을 돌려드립니다!</span>
          </p>
          <a
            href="http://pf.kakao.com/_xmKULn/chat"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              className="w-full h-12 text-base font-semibold bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] border-0 shadow-md hover:shadow-lg transition-all"
            >
              <span className="mr-2">💬</span>
              카카오톡으로 연락하기
            </Button>
          </a>
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
                  픽업 주문 시 <span className="font-bold">3,000원 할인</span> + 단골 할인 <span className="font-bold">{DANGOL_DISCOUNT.toLocaleString()}원</span> 혜택을 받으실 수 있습니다!
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
