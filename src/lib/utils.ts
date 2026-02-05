import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 가상계좌 번호 포맷팅 (4자리-4자리-나머지)
 * @param accountNumber 계좌번호
 * @returns 포맷팅된 계좌번호 (예: 1234-5678-90123)
 */
export function formatAccountNumber(accountNumber: string): string {
  if (!accountNumber) return '';
  
  // 숫자만 추출
  const numbers = accountNumber.replace(/\D/g, '');
  
  // 4-4-나머지 패턴으로 포맷팅
  const part1 = numbers.slice(0, 4);
  const part2 = numbers.slice(4, 8);
  const part3 = numbers.slice(8);
  
  if (!part2) return part1;
  if (!part3) return `${part1}-${part2}`;
  return `${part1}-${part2}-${part3}`;
}
