import { Footer } from '@/components/Footer';
import { STORE_INFO } from '@/lib/constants';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b py-4">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900">개인정보처리방침</h1>
        </div>
      </header>

      {/* 내용 */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-8 text-sm text-gray-700 leading-relaxed">
          
          <section>
            <p className="text-gray-600 mb-4">
              올때만두(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 
              준수하고 있습니다. 회사는 개인정보처리방침을 통하여 이용자가 제공하는 
              개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 개인정보보호를 위해 
              어떠한 조치가 취해지고 있는지 알려드립니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. 수집하는 개인정보 항목</h2>
            <p>회사는 주문 및 배송을 위해 아래와 같은 개인정보를 수집하고 있습니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>필수항목:</strong> 성명, 휴대폰번호, 배송주소(아파트명, 동, 호수)</li>
              <li><strong>자동수집항목:</strong> 서비스 이용기록, 접속 로그, 결제기록</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. 개인정보의 수집 및 이용목적</h2>
            <p>회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>서비스 제공:</strong> 상품 배송, 구매 및 요금 결제, 본인인증</li>
              <li><strong>고객관리:</strong> 서비스 이용에 따른 본인확인, 불만처리 등 민원처리, 고지사항 전달</li>
              <li><strong>마케팅 활용:</strong> 신규 서비스 안내 및 이벤트 정보 제공 (선택 동의 시)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. 개인정보의 보유 및 이용기간</h2>
            <p>
              회사는 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 
              단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 
              관계법령에서 정한 일정한 기간 동안 개인정보를 보관합니다.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
              <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
              <li>신용정보의 수집/처리 및 이용 등에 관한 기록: 3년 (신용정보법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. 개인정보의 파기절차 및 방법</h2>
            <p>
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 
              지체없이 파기합니다.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>파기절차:</strong> 목적 달성 후 별도의 DB로 옮겨져 내부 방침 및 관련 법령에 의한 보유기간 경과 후 파기</li>
              <li><strong>파기방법:</strong> 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. 개인정보의 제3자 제공</h2>
            <p>
              회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 
              다만, 아래의 경우에는 예외로 합니다.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. 개인정보의 처리 위탁</h2>
            <p>회사는 서비스 향상을 위해 아래와 같이 개인정보를 위탁하고 있습니다.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-200 px-4 py-2 text-left">수탁업체</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">위탁업무 내용</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">토스페이먼츠</td>
                    <td className="border border-gray-200 px-4 py-2">전자결제 대행</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">SMS 발송 대행사</td>
                    <td className="border border-gray-200 px-4 py-2">문자메시지 발송</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. 이용자의 권리와 그 행사방법</h2>
            <p>
              이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며, 
              개인정보의 수집 및 이용에 대한 동의 철회(회원탈퇴)를 요청할 수 있습니다.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>개인정보 조회/수정: 고객센터 연락</li>
              <li>동의 철회/회원탈퇴: 고객센터 연락 또는 이메일 요청</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. 개인정보 보호책임자</h2>
            <p>
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 
              이용자의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 
              지정하고 있습니다.
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm">
              <p><strong>개인정보 보호책임자</strong></p>
              <p>성명: {STORE_INFO.ceo}</p>
              <p>직책: 대표</p>
              <p className="text-xs text-gray-500">연락처: {STORE_INFO.phone}</p>
              <p>이메일: {STORE_INFO.email}</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. 개인정보의 안전성 확보 조치</h2>
            <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>개인정보의 암호화</li>
              <li>해킹 등에 대비한 기술적 대책</li>
              <li>개인정보에 대한 접근 제한</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. 개인정보처리방침 변경</h2>
            <p>
              이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 
              추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 
              통하여 고지할 것입니다.
            </p>
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
