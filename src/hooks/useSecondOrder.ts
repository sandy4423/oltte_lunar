'use client';

import { useEffect, useState } from 'react';

/** 이 폰(인증·기억된 번호)이 2번째 주문 할인 대상인가. 번호를 모르거나 못 불러오면 false (아무것도 안 그림). 인증이 끝나면 refreshKey 로 다시 묻는다 */
export function useSecondOrder(refreshKey: unknown = null): boolean {
  const [eligible, setEligible] = useState(false);
  useEffect(() => {
    let off = false;
    fetch('/api/menu/second', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !off && setEligible(d?.eligible === true))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [refreshKey]);
  return eligible;
}
