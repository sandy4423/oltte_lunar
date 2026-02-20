import { Footer } from '@/components/Footer';
import { STORE_INFO } from '@/lib/constants';

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b py-4">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900">환불정책</h1>
        </div>
      </header>

      {/* 내용 */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-8 text-sm text-gray-700 leading-relaxed">
          
          <section>
            <p className="text-gray-600 mb-4">
              올때만두는 고객님의 만족을 최우선으로 생각합니다. 
              아래 환불정책을 확인하시고, 궁금한 점은 고객센터로 문의해 주세요.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. 주문 취소 및 환불</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-bold text-green-800 mb-2">✅ 배송 전 취소</h3>
                <ul className="list-disc list-inside space-y-1 text-green-700">
                  <li>입금 마감 시간 전까지 <strong>100% 전액 환불</strong> 가능</li>
                  <li>고객센터 연락 또는 문자로 취소 요청</li>
                  <li>환불은 영업일 기준 3일 이내 처리</li>
                </ul>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="font-bold text-orange-800 mb-2">⚠️ 입금 마감 후 취소</h3>
                <ul className="list-disc list-inside space-y-1 text-orange-700">
                  <li>입금 마감 이후에는 이미 제조가 시작되어 <strong>취소 불가</strong></li>
                  <li>부득이한 사정 시 고객센터로 개별 문의</li>
                </ul>
              </div>

              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-bold text-red-800 mb-2">❌ 배송 후 취소</h3>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  <li>식품 특성상 배송 완료 후 <strong>단순 변심에 의한 환불 불가</strong></li>
                  <li>상품 하자 시에만 교환/환불 가능</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. 상품 하자 시 교환/환불</h2>
            <p>다음의 경우 교환 또는 환불이 가능합니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>상품이 파손된 상태로 배송된 경우</li>
              <li>주문한 상품과 다른 상품이 배송된 경우</li>
              <li>상품의 품질에 명백한 이상이 있는 경우</li>
            </ul>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-bold text-blue-800 mb-2">📸 하자 신고 방법</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>상품 수령 후 <strong>24시간 이내</strong> 고객센터 연락</li>
                <li>하자 부분 사진 촬영</li>
                <li>고객센터로 사진 전송 (카카오톡 또는 이메일)</li>
                <li>확인 후 교환 또는 환불 처리</li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. 환불 처리 기간</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-200 px-4 py-2 text-left">결제 방법</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">환불 처리 기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">가상계좌</td>
                    <td className="border border-gray-200 px-4 py-2">환불 계좌 확인 후 영업일 기준 3일 이내</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">신용카드</td>
                    <td className="border border-gray-200 px-4 py-2">카드사 취소 처리 후 3~7일 이내</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. 환불 불가 사유</h2>
            <p>아래의 경우 환불이 불가능합니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>고객의 귀책사유로 상품이 멸실 또는 훼손된 경우</li>
              <li>포장 개봉 후 상품 가치가 현저히 감소한 경우</li>
              <li>고객의 사용 또는 일부 소비로 상품 가치가 감소한 경우</li>
              <li>시간 경과로 재판매가 불가능한 경우</li>
              <li>단순 변심에 의한 배송 후 환불 요청</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. 미입금 주문 자동 취소</h2>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <ul className="list-disc list-inside space-y-1 text-yellow-800">
                <li>가상계좌 발급 후 <strong>입금 마감 시간까지</strong> 입금이 확인되지 않으면 자동 취소</li>
                <li>자동 취소 시 별도의 환불 절차 없음</li>
                <li>입금 마감 시간은 주문 완료 페이지에서 확인 가능</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. 취소/환불 신청 방법</h2>
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-bold text-purple-800 mb-2">🖥 온라인 취소 (권장)</h3>
                <ol className="list-decimal list-inside space-y-1 text-purple-700">
                  <li><a href="/my-orders" className="underline font-semibold">주문내역 조회</a> 페이지에서 직접 취소</li>
                  <li>주문 시 사용한 전화번호로 인증</li>
                  <li>취소하려는 주문의 &quot;주문 취소하기&quot; 버튼 클릭</li>
                  <li>취소 사유 입력 후 확인</li>
                </ol>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">📞 고객센터 취소</h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>전화: {STORE_INFO.phone} ({STORE_INFO.businessHours})</li>
                  <li>이메일: {STORE_INFO.email}</li>
                </ol>
                <p className="text-xs text-gray-500 mt-2">신청 시 주문번호, 주문자명, 전화번호, 취소 사유를 알려주세요.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-800 mb-2">💳 환불 계좌 안내</h3>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li><strong>가상계좌 결제:</strong> 환불받으실 계좌 정보 제공 필요</li>
                  <li><strong>신용카드 결제:</strong> 결제 취소 후 자동 환불 (3~7일 소요)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. 고객센터 안내</h2>
            <div className="p-4 bg-gray-100 rounded-lg text-sm">
              <p className="font-bold mb-2">📞 주문 및 환불 문의</p>
              <p>전화: {STORE_INFO.phone}</p>
              <p>이메일: {STORE_INFO.email}</p>
              <p>운영시간: {STORE_INFO.businessHours}</p>
            </div>
          </section>

          <section className="pt-4 border-t">
            <p className="text-gray-500">
              <strong>시행일자:</strong> 2026년 1월 1일
            </p>
          </section>

        </div>
      </div>

      <Footer />
    </main>
  );
}
