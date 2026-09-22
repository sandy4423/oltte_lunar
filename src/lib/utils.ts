import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 전화번호 정규화 (하이픈, 공백 등 제거하여 숫자만 남김)
 * @example normalizePhone('010-1234-5678') → '01012345678'
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * 가상계좌 번호 포맷팅 (은행별 하이픈 형식)
 * @param accountNumber 계좌번호
 * @returns 포맷팅된 계좌번호 (예: 110-12-345678)
 */
export function formatAccountNumber(accountNumber: string): string {
  if (!accountNumber) return '';
  
  // 숫자만 추출
  const numbers = accountNumber.replace(/\D/g, '');
  const length = numbers.length;
  
  // 은행별 하이픈 형식 적용
  if (length === 11) {
    // 신한은행, 농협은행: 3-2-6
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
  } else if (length === 13) {
    // 우리은행: 4-3-6
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 7)}-${numbers.slice(7)}`;
  } else if (length === 14) {
    // 국민은행, 기업은행, 하나은행: 6-2-6
    return `${numbers.slice(0, 6)}-${numbers.slice(6, 8)}-${numbers.slice(8)}`;
  }
  
  // 기타: 4-4-나머지 (기존 로직 유지)
  const part1 = numbers.slice(0, 4);
  const part2 = numbers.slice(4, 8);
  const part3 = numbers.slice(8);
  
  if (!part2) return part1;
  if (!part3) return `${part1}-${part2}`;
  return `${part1}-${part2}-${part3}`;
}

/**
 * 한국 시간(KST)으로 날짜를 포맷팅
 * @param date 포맷팅할 날짜
 * @param formatStr 포맷 문자열 (date-fns 형식)
 * @returns 한국 시간으로 포맷팅된 문자열
 */
export function formatKST(date: Date | string, formatStr: string): string {
  return formatInTimeZone(date, 'Asia/Seoul', formatStr, { locale: ko });
}

/**
 * 단지 이름 표시 — 캠페인 주문(떡국만두 등)은 단지가 없다.
 *
 * 예전에는 `order.apt_name.replace(...)` 를 그냥 불러서, 단지가 없는 주문이
 * 목록에 한 건이라도 있으면 관리화면 전체가 하얗게 됐다.
 */
export function formatAptName(aptName: string | null | undefined): string {
  if (!aptName) return '—';
  return aptName.replace(/^[68]공구 /, '');
}

/** 동·호수 표시 — 둘 다 없으면 '—' (캠페인 주문은 동호수가 없다) */
export function formatDongHo(
  dong: string | null | undefined,
  ho: string | null | undefined
): string {
  const parts = [dong ? `${dong}동` : '', ho ? `${ho}호` : ''].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}
