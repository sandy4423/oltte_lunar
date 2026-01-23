import { Footer } from '@/components/Footer';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b py-4">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900">이용약관</h1>
        </div>
      </header>

      {/* 내용 */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-8 text-sm text-gray-700 leading-relaxed">
          
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제1조 (목적)</h2>
            <p>
              이 약관은 올때만두(이하 "회사")가 운영하는 온라인 쇼핑몰에서 제공하는 
              인터넷 관련 서비스(이하 "서비스")를 이용함에 있어 회사와 이용자의 권리, 
              의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제2조 (정의)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>"쇼핑몰"이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.</li>
              <li>"이용자"란 "쇼핑몰"에 접속하여 이 약관에 따라 "쇼핑몰"이 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
              <li>"회원"이란 "쇼핑몰"에 개인정보를 제공하여 회원등록을 한 자로서, "쇼핑몰"의 정보를 지속적으로 제공받으며, "쇼핑몰"이 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
              <li>"비회원"이란 회원에 가입하지 않고 "쇼핑몰"이 제공하는 서비스를 이용하는 자를 말합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 합리적인 사유가 발생할 경우에는 이 약관을 변경할 수 있으며, 약관을 변경할 경우에는 적용일자 및 변경사유를 명시하여 현행약관과 함께 서비스 화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제4조 (서비스의 제공 및 변경)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회사는 다음과 같은 업무를 수행합니다.
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>재화 또는 용역에 대한 정보 제공 및 구매계약의 체결</li>
                  <li>구매계약이 체결된 재화 또는 용역의 배송</li>
                  <li>기타 회사가 정하는 업무</li>
                </ul>
              </li>
              <li>회사는 재화의 품절 또는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 재화, 용역의 내용을 변경할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제5조 (서비스의 중단)</h2>
            <p>
              회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 
              사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제6조 (구매신청)</h2>
            <p>이용자는 "쇼핑몰"에서 다음 또는 이와 유사한 방법에 의하여 구매를 신청합니다.</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>성명, 연락처, 배송지 주소 등의 입력</li>
              <li>재화 또는 용역의 선택</li>
              <li>결제방법의 선택</li>
              <li>이 약관에 동의한다는 표시</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제7조 (계약의 성립)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회사는 이용자의 구매신청에 대하여 승낙함으로써 계약이 성립합니다.</li>
              <li>회사의 승낙의 의사표시에는 이용자의 구매 신청에 대한 확인 및 판매가능 여부, 구매신청의 정정 취소 등에 관한 정보 등을 포함합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제8조 (지급방법)</h2>
            <p>구매한 재화에 대한 대금지급방법은 다음과 같습니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>가상계좌 입금</li>
              <li>신용카드 결제</li>
              <li>기타 회사가 정하는 결제방법</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제9조 (배송)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회사는 이용자가 구매한 재화에 대해 지정된 배송일에 배송합니다.</li>
              <li>배송은 주문 시 선택한 아파트 단지 내 지정 장소에서 이루어집니다.</li>
              <li>천재지변, 기타 불가항력적 사유로 배송이 지연될 경우 이용자에게 사전 통지합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제10조 (환급, 반품 및 교환)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회사는 이용자가 구매 신청한 재화가 품절 등의 사유로 인도 또는 제공할 수 없을 때에는 지체 없이 그 사유를 이용자에게 통지하고 사전에 재화의 대금을 받은 경우에는 대금을 받은 날부터 3영업일 이내에 환급하거나 환급에 필요한 조치를 취합니다.</li>
              <li>배송 전 주문 취소 시 전액 환불됩니다.</li>
              <li>상품 하자의 경우 교환 또는 환불 처리됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제11조 (개인정보보호)</h2>
            <p>
              회사는 이용자의 개인정보를 수집하는 경우 서비스 제공을 위하여 필요한 
              범위에서 최소한의 개인정보를 수집하며, 개인정보의 수집 및 이용목적, 
              제3자 제공에 관한 사항은 별도의 개인정보처리방침에서 정합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제12조 (분쟁해결)</h2>
            <p>
              회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 
              보상처리하기 위하여 피해보상처리기구를 설치, 운영합니다. 
              회사와 이용자 간에 발생한 분쟁은 전자거래기본법에 의해 설치된 
              전자거래분쟁조정위원회의 조정에 따를 수 있습니다.
            </p>
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
