'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { registerPageTracker } from '@/lib/behavior/behavior';
import { startBehaviorListeners } from '@/lib/behavior/listeners';
import { maskPathname } from '@/lib/behavior/page';

/**
 * 만두 셀프주문(/menu*) 헛클릭 수집기 — 화면에 아무것도 그리지 않는다.
 * oltte-bookkeeping 의 BehaviorTracker 를 옮김. 입력칸 값(이름·전화)은 담지 않는다(fields 는 칸 이름만).
 * 주문번호가 든 주소는 /menu/done/:id 로 가린다. 일부러 반응 없는 요소는 data-track 을 붙이면 헛클릭으로 세지 않는다.
 */
export default function BehaviorTracker() {
  const pathname = usePathname() || '/menu';
  const page = maskPathname(pathname).replace(/^(\/menu\/(?:done|pay))\/[^/]+/, '$1/:id');

  useEffect(() => {
    const unregister = registerPageTracker();
    const stop = startBehaviorListeners({ page, text: true, fields: true, alerts: true, leave: true, deep: true });
    return () => {
      stop();
      unregister();
    };
  }, [page]);

  return null;
}
