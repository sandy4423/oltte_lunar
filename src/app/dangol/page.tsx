'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  APARTMENT_LIST,
  getApartmentFullName,
  DANGOL_DISCOUNT,
  PICKUP_DISCOUNT,
  PRODUCTS,
  DANGOL_DISCOUNT_PER_ITEM,
  NOODLE_DISCOUNT_PER_ITEM,
  getAvailableEventDates,
  type ApartmentConfig,
} from '@/lib/constants';
import { Footer } from '@/components/Footer';
import { trackPageView } from '@/lib/trackPageView';

const DANGOL_SOURCE = 'dangol';

// 다음 이벤트에서 단지별 배송 주문을 재개하려면 true 로 변경
const SHOW_APT_BUTTONS = false;

export default function DangolPage() {
  const router = useRouter();

  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [selectedApt, setSelectedApt] = useState<ApartmentConfig | null>(null);

  // 이벤트 종료 여부 (6/14 12:00 KST 이후 자동 true)
  const [isEventClosed, setIsEventClosed] = useState(false);

  // 단골톡방 유입 경로 강제 저장 (페이지 로드 시 1회)
  useEffect(() => {
    sessionStorage.setItem('traffic_source', DANGOL_SOURCE);
  }, []);

  useEffect(() => {
    trackPageView('/dangol');
  }, []);

  // 이벤트 자동 만료 가드: getAvailableEventDates() 결과가 빈 배열이면 종료 처리
  useEffect(() => {
    const update = () => {
      const dates = getAvailableEventDates();
      setIsEventClosed(dates.length === 0);
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  // 단지 선택 핸들러 (현재 이벤트에서는 비활성, 향후 재활용)
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

  // 단톡방 할인 적용 가격
  const hotpotCool = PRODUCTS.find((p) => p.sku === 'hotpot_cool');
  const hotpotSpicy = PRODUCTS.find((p) => p.sku === 'hotpot_spicy');
  const noodle = PRODUCTS.find((p) => p.sku === 'noodle');

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
          <p className="text-orange-100 text-lg">단톡방 전용 만두전골 픽업 이벤트</p>
        </div>
      </header>

      {/* 단톡방 전용 할인 배너 */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-5 sm:p-6 shadow-lg text-white text-center">
          <p className="text-sm font-medium mb-1 opacity-90">단톡방 고객님 전용</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            만두전골 {DANGOL_DISCOUNT_PER_ITEM.toLocaleString()}원 특별 할인!
          </h2>
          <p className="text-orange-100 text-sm sm:text-base">
            이 페이지에서 주문하시면 자동으로 할인이 적용됩니다
          </p>
          <div className="mt-3 inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold">
            📅 2026년 6월 13일(토) · 14일(일) 한정
          </div>
        </div>
      </div>

      {/* 이벤트 상세 안내 */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        <div className="bg-white border border-orange-200 rounded-lg p-5 sm:p-6 shadow-sm">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>🍲</span>
            <span>이번 주말 만두전골 이벤트</span>
          </h3>

          <div className="space-y-3 mb-4">
            {hotpotCool && (
              <div className="flex items-center justify-between bg-orange-50 rounded-lg p-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {hotpotCool.emoji} {hotpotCool.name}
                  </p>
                  <p className="text-xs text-gray-500">{hotpotCool.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 line-through">
                    {hotpotCool.price.toLocaleString()}원
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    {(hotpotCool.price - DANGOL_DISCOUNT_PER_ITEM).toLocaleString()}원
                  </p>
                </div>
              </div>
            )}
            {hotpotSpicy && (
              <div className="flex items-center justify-between bg-orange-50 rounded-lg p-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {hotpotSpicy.emoji} {hotpotSpicy.name}
                  </p>
                  <p className="text-xs text-gray-500">{hotpotSpicy.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 line-through">
                    {hotpotSpicy.price.toLocaleString()}원
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    {(hotpotSpicy.price - DANGOL_DISCOUNT_PER_ITEM).toLocaleString()}원
                  </p>
                </div>
              </div>
            )}
            {noodle && (
              <div className="flex items-center justify-between bg-amber-50 rounded-lg p-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {noodle.emoji} {noodle.name}
                  </p>
                  <p className="text-xs text-gray-500">{noodle.description} (옵션)</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 line-through">
                    {noodle.price.toLocaleString()}원
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    {(noodle.price - NOODLE_DISCOUNT_PER_ITEM).toLocaleString()}원
                  </p>
                </div>
              </div>
            )}
          </div>

          <ul className="space-y-2 text-sm sm:text-base text-gray-800">
            <li className="flex items-start gap-2">
              <span className="text-brand font-semibold">•</span>
              <span><span className="font-semibold">픽업 날짜:</span> 6월 13일(토) · 14일(일)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand font-semibold">•</span>
              <span><span className="font-semibold">픽업 시간:</span> 09:00 ~ 21:00 (1시간 단위)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand font-semibold">•</span>
              <span><span className="font-semibold">수령 방법:</span> 매장 픽업만 (배송 없음)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-semibold">•</span>
              <span><span className="font-semibold text-red-600">주문 마감:</span> 6월 14일(일) 낮 12시</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 단일 CTA: 6월 13-14일 주문하기 */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        {isEventClosed ? (
          <div className="bg-gray-100 border border-gray-300 rounded-xl p-6 text-center">
            <p className="text-4xl mb-3">🍲</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              이벤트가 종료되었습니다
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              다음 단톡방 이벤트로 다시 찾아뵐게요!
            </p>
            <Link href="/pickup">
              <Button className="w-full h-12 bg-brand hover:bg-orange-600 text-white">
                상시 픽업 주문 보기
              </Button>
            </Link>
          </div>
        ) : (
          <Link href="/order">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] cursor-pointer">
              <div className="text-center text-white">
                <div className="text-xs sm:text-sm font-medium opacity-90 mb-1">
                  단톡방 고객님 전용
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold mb-2">
                  6월 13-14일 주문하기
                </h3>
                <p className="text-orange-50 text-sm sm:text-base mb-3">
                  만두전골 {DANGOL_DISCOUNT_PER_ITEM.toLocaleString()}원 할인 자동 적용
                </p>
                <div className="inline-block bg-white text-red-600 font-bold text-base sm:text-lg px-5 py-2 rounded-full">
                  주문하러 가기 →
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* 단지별 배송 주문 (현재 이벤트에서는 숨김 — SHOW_APT_BUTTONS 토글로 재활용) */}
      {SHOW_APT_BUTTONS && (
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
      )}

      <Footer />

      {/* 마감일 지난 단지 선택 시 안내 팝업 (SHOW_APT_BUTTONS 활성화 시에만 사용) */}
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
