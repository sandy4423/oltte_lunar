/**
 * PG 심사용 Footer 컴포넌트 (컴팩트 버전)
 */

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 mt-8 py-4">
      <div className="max-w-lg mx-auto px-4 text-center text-[10px] text-gray-400 leading-tight space-y-1">
        <p>
          올때만두 | 사업자등록번호: 286-34-01627 | 대표: 성하경 | 개인정보책임자: 성하경
        </p>
        <p>
          인천광역시 연수구 랜드마크로 113 e편한세상송도 후문상가 제114호 일부호
        </p>
        <p>
          010-2592-4423 | info@olttefood.com | 평일 09:00-18:00
        </p>
        <p className="space-x-2">
          <a href="/terms" className="hover:text-brand hover:underline">이용약관</a>
          <span>|</span>
          <a href="/privacy" className="hover:text-brand hover:underline">개인정보처리방침</a>
          <span>|</span>
          <a href="/refund" className="hover:text-brand hover:underline">환불정책</a>
        </p>
        <p className="text-[9px] text-gray-300">© {new Date().getFullYear()} 올때만두 · 대표 성하경</p>
      </div>
    </footer>
  );
}
