/**
 * 상품 상세 이미지 컴포넌트
 * 25% 지점에서 페이드아웃, 클릭 시 전체 보기
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function ProductDetailImage() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative w-full">
      {/* 이미지 컨테이너 */}
      <div 
        className={`relative overflow-hidden transition-all duration-500 ${
          isExpanded ? 'max-h-none' : 'max-h-[400px]'
        }`}
      >
        <Image
          src="/product-detail.png"
          alt="올때만두 상품 상세"
          width={1200}
          height={3246}
          className="w-full h-auto"
          priority
        />
        
        {/* 페이드아웃 그라데이션 (축소 상태일 때만) */}
        {!isExpanded && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"
          />
        )}
      </div>

      {/* 펼치기/접기 버튼 */}
      <div className="flex justify-center py-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-full hover:bg-brand-dark transition-colors shadow-md"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-5 w-5" />
              접기
            </>
          ) : (
            <>
              <ChevronDown className="h-5 w-5" />
              상품 상세 보기
            </>
          )}
        </button>
      </div>
    </div>
  );
}
