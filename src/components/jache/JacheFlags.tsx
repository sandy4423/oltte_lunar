'use client';

import { createContext, useContext } from 'react';

export interface JacheFlags {
  /** 결제 버튼을 열어도 되는가 (서버 스위치) */
  pay: boolean;
  /** 시험 모드 (돈 안 움직임, 포스에 [테스트]) */
  test: boolean;
}

const Ctx = createContext<JacheFlags>({ pay: false, test: false });

export function JacheFlagsProvider({ value, children }: { value: JacheFlags; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useJacheFlags = () => useContext(Ctx);
