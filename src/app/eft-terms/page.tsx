import { Footer } from '@/components/Footer';
import { STORE_INFO } from '@/lib/constants';

export default function EftTermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b py-4">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900">전자금융거래 이용약관</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제1조 (목적)</h2>
            <p>
              이 약관은 {STORE_INFO.name}(이하 &quot;회사&quot;)가 제공하는 전자금융거래 서비스를
              이용자가 이용함에 있어 회사와 이용자 간의 전자금융거래에 관한 기본적인 사항을
              정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제2조 (정의)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>&quot;전자금융거래&quot;란 회사가 전자적 장치를 통하여 전자금융업무를 제공하고, 이용자가 회사의 종사자와 직접 대면하거나 의사소통을 하지 아니하고 자동화된 방식으로 이를 이용하는 거래를 말합니다.</li>
              <li>&quot;전자지급수단&quot;이란 전자자금이체, 직불전자지급수단, 선불전자지급수단, 전자화폐, 신용카드, 전자채권 그 밖에 전자적 방법에 따른 지급수단을 말합니다.</li>
              <li>&quot;접근매체&quot;란 전자금융거래에 있어서 거래지시를 하거나 이용자 및 거래내용의 진실성과 정확성을 확보하기 위하여 사용되는 수단 또는 정보를 말합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제3조 (약관의 명시 및 변경)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회사는 이용자가 전자금융거래를 하기 전에 이 약관을 게시하고 이용자가 이 약관의 중요한 내용을 확인할 수 있도록 합니다.</li>
              <li>회사는 이용자의 요청이 있는 경우 전자문서의 전송 방식에 의하여 본 약관의 사본을 이용자에게 교부합니다.</li>
              <li>회사가 약관을 변경하는 때에는 그 시행일 1개월 전에 변경되는 약관을 금융거래정보 입력화면 또는 서비스 화면에 게시합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제4조 (전자지급거래 계약의 효력)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회사는 이용자의 거래지시가 전자지급거래에 관한 경우 그 지급절차를 대행하며, 전자지급거래에 관한 거래지시의 내용을 전송하여 지급이 이루어지도록 합니다.</li>
              <li>전자지급거래는 거래지시된 금액의 정보에 대하여 수취인의 계좌가 개설되어 있는 금융기관의 계좌의 원장에 입금기록이 끝난 때 또는 수취인의 전자적 장치에 정보가 도달한 때에 효력이 발생합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제5조 (전자지급수단의 종류)</h2>
            <p>회사가 제공하는 전자지급수단은 다음과 같습니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>신용카드 결제</li>
              <li>가상계좌 입금</li>
              <li>기타 회사가 정하는 전자지급수단</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제6조 (거래지시의 철회)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>이용자는 전자금융거래에 관한 거래지시의 전자적 전송이 금융기관 또는 전자금융업자에 도달하기 전까지 거래지시를 철회할 수 있습니다.</li>
              <li>이용자는 전자지급수단 이용과 관련하여 전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령에 따른 취소 또는 철회를 요청할 수 있습니다.</li>
              <li>이미 입금이 완료된 가상계좌의 경우, 환불 절차에 따라 처리됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제7조 (오류의 정정)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>이용자는 전자금융거래에 오류가 있음을 안 때에는 회사에 그 정정을 요구할 수 있습니다.</li>
              <li>회사는 전항의 규정에 의한 오류의 정정요구를 받은 때에는 이를 즉시 조사하여 처리한 후 정정요구를 받은 날부터 2주 이내에 그 결과를 이용자에게 알려줍니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제8조 (전자금융거래 기록의 보존)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회사는 전자금융거래에 관한 기록을 전자금융거래법에서 정하는 기간 동안 보존합니다.</li>
              <li>보존기간: 전자금융거래에 관한 기록은 5년간 보존합니다.</li>
              <li>이용자가 전자금융거래에 관한 서류의 열람 또는 제공을 요구하는 경우 회사는 이에 응합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제9조 (전자금융거래 정보의 제공)</h2>
            <p>
              회사는 이용자가 전자금융거래를 한 경우 전자금융거래의 종류 및 금액, 
              전자금융거래의 상대방에 관한 정보, 전자금융거래의 일시, 전자적 장치의 종류 및 
              전자적 장치를 식별할 수 있는 정보, 회사가 전자금융거래의 대가로 받은 수수료, 
              이용자의 출금 동의에 관한 사항 등의 정보를 이용자에게 제공합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제10조 (분쟁처리 및 분쟁조정)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>이용자는 회사의 서비스 이용과 관련하여 회사에 이의를 제기할 수 있습니다.</li>
              <li>회사는 이의제기를 받은 날로부터 15일 이내에 이에 대한 조사 또는 처리 결과를 이용자에게 알려줍니다.</li>
              <li>이용자는 금융감독원 또는 한국소비자원 등에 분쟁조정을 신청할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제11조 (회사의 안전성 확보 의무)</h2>
            <p>
              회사는 전자금융거래의 안전성과 신뢰성을 확보할 수 있도록 전자금융거래의 
              종류별로 전자적 전송이나 처리를 위한 인력, 시설, 전자적 장치 등의 
              정보기술부문 및 전자금융업무에 관하여 금융위원회가 정하는 기준을 준수합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제12조 (이용자의 의무)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>이용자는 접근매체를 제3자에게 양도 또는 대여하거나 질권의 설정, 기타 목적에 사용하여서는 안 됩니다.</li>
              <li>이용자는 접근매체의 분실, 도난 또는 위조나 변조를 알게 된 때에는 즉시 회사에 통지하여야 합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제13조 (손해배상책임)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>접근매체의 위조나 변조로 발생한 사고, 계약체결 또는 거래지시의 전자적 전송이나 처리 과정에서 발생한 사고로 인하여 이용자에게 손해가 발생한 경우에는 회사가 그 손해를 배상합니다.</li>
              <li>다만, 접근매체의 분실, 도난 등으로 인한 사고가 이용자의 고의 또는 중대한 과실에 의한 경우에는 회사는 그 책임의 전부 또는 일부를 이용자에게 부담하게 할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제14조 (전자금융거래 관련 민원 처리)</h2>
            <p>전자금융거래와 관련된 민원은 아래 연락처로 문의하실 수 있습니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>전화: {STORE_INFO.phone}</li>
              <li>이메일: {STORE_INFO.email}</li>
              <li>운영시간: {STORE_INFO.businessHours}</li>
            </ul>
          </section>

          <section className="pt-4 border-t">
            <p className="text-gray-500">
              <strong>부칙</strong><br />
              이 약관은 2026년 1월 1일부터 시행합니다.
            </p>
          </section>

        </div>
      </div>

      <Footer />
    </main>
  );
}
