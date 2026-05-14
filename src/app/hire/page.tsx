'use client';

import { useState, useRef } from 'react';
import { Footer } from '@/components/Footer';

const PART_OPTIONS = [
  { value: 'weekday_morning', label: '평일 오전' },
  { value: 'weekday_evening', label: '평일 오후' },
  { value: 'weekend_morning', label: '주말 오전' },
  { value: 'weekend_evening', label: '주말 오후' },
  { value: 'any', label: '상관없음' },
];

export default function HirePage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [part, setPart] = useState('');
  const [startDate, setStartDate] = useState('');
  const [intro, setIntro] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('사진은 5MB 이하만 가능합니다.');
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('이름을 입력해주세요.');
    if (!phone.trim()) return setError('전화번호를 입력해주세요.');
    if (!part) return setError('지원 파트를 선택해주세요.');
    if (!startDate.trim()) return setError('근무 시작 가능일을 입력해주세요.');

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('phone', phone.trim());
      formData.append('part', part);
      formData.append('startDate', startDate.trim());
      formData.append('intro', intro.trim());
      if (photo) formData.append('photo', photo);

      const res = await fetch('/api/hire', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('제출 실패');

      setSubmitted(true);
    } catch {
      setError('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">지원 완료!</h2>
          <p className="text-gray-600">
            소중한 지원 감사합니다.<br />
            2~3일 이내에 연락드리겠습니다.
          </p>
          <p className="text-sm text-gray-400">— 올때만두 드림 🥟</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* 헤더 */}
      <header className="bg-brand text-white py-10 px-4 text-center">
        <div className="max-w-lg mx-auto">
          <p className="text-sm font-medium opacity-90 mb-1">인천 송도 만두 전문점</p>
          <h1 className="text-3xl font-bold tracking-tight">올때만두 직원 모집</h1>
          <p className="mt-2 text-orange-100">함께 성장할 팀원을 찾습니다</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-10">

        {/* 우리는 이런 가게입니다 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 border-t-2 border-brand pt-6 mb-4">우리는 이런 가게입니다</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              올때만두는 송도 e편한세상 후문상가에 자리 잡은<br />
              6평 규모의 포장 전문 만두가게입니다.
            </p>
            <p>
              대표메뉴는 특새우만두와 쫄면입니다.<br />
              작지만 매일 정성껏 만두를 빚고 있어요.<br />
              한 분 한 분 단골이 되어주신 동네 손님들 덕분에<br />
              조금씩 성장하고 있는 가게입니다.
            </p>
            <p>
              저희는 멈춰있지 않습니다.<br />
              2·3호점, 만두전골·자가제면 칼국수 전문점,<br />
              그리고 그 너머의 브랜드까지.<br />
              &ldquo;올때만두&rdquo;라는 이름을 더 멀리 가져가려 합니다.
            </p>
            <p>
              지금 함께해주실 분은<br />
              단순히 일손이 아니라,<br />
              이 여정을 함께 할 동료로 모시고 싶습니다.
            </p>
          </div>
        </section>

        {/* 이 자리는 이런 자리예요 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 border-t-2 border-brand pt-6 mb-4">이 자리는 이런 자리예요</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <p className="font-semibold">✔ 단순 아르바이트가 아닙니다</p>
              <p className="text-gray-600 ml-5">조리·판매·포장·매장 운영을 함께 배우실 수 있어요.</p>
            </div>
            <div>
              <p className="font-semibold">✔ 성장하는 가게에서 함께 자라는 자리입니다</p>
              <p className="text-gray-600 ml-5">매뉴얼이 매일 다듬어지고, 좋은 의견은 반영됩니다.</p>
            </div>
            <div>
              <p className="font-semibold">✔ 작은 가게라 한 분의 역할이 큽니다</p>
              <p className="text-gray-600 ml-5">대신, 한 분의 영향력도 그만큼 큽니다.</p>
            </div>
            <div>
              <p className="font-semibold">✔ 오래 함께해주실 분을 가장 우선합니다</p>
              <p className="text-gray-600 ml-5">짧게 일하실 분보다, 함께 길을 만들 분을 찾고 있습니다.</p>
            </div>
          </div>
        </section>

        {/* 모집 파트 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 border-t-2 border-brand pt-6 mb-4">모집 파트</h2>
          <p className="text-sm text-gray-600 mb-4">
            ※ 주말은 시급이 가장 높습니다.<br />
            <span className="ml-3">주말 위주 근무를 선호하시는 분께 특히 추천드립니다.</span>
          </p>

          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">🌅 평일 오전파트</span>
                <span className="text-brand font-bold text-lg">11,000원</span>
              </div>
              <div className="text-sm text-gray-600 space-y-0.5">
                <p>월·수·목·금 / 10:00 ~ 13:30 · 주 14시간</p>
                <p>월급 예상 약 669,000원</p>
              </div>
              <p className="text-xs text-gray-400 mt-2">※ 주휴수당 미해당</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">🌆 평일 오후파트</span>
                <span className="text-brand font-bold text-lg">13,200원</span>
              </div>
              <div className="text-sm text-gray-600 space-y-0.5">
                <p>월·수·목·금 / 16:00 ~ 22:00 · 주 24시간</p>
                <p>월급 예상 약 1,376,500원</p>
              </div>
              <p className="text-xs text-gray-400 mt-2">※ 시급은 주휴 포함 환산 / 4대보험 적용</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">🌞 주말 오전파트</span>
                <span className="text-brand font-bold text-lg">13,500원</span>
              </div>
              <div className="text-sm text-gray-600 space-y-0.5">
                <p>토·일 / 09:00 ~ 16:00 · 주 12시간</p>
                <p>월급 예상 약 703,900원</p>
              </div>
              <p className="text-xs text-gray-400 mt-2">※ 주휴수당 미해당</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900">🌙 주말 오후파트</span>
                <span className="text-brand font-bold text-lg">13,500원</span>
              </div>
              <div className="text-sm text-gray-600 space-y-0.5">
                <p>토·일 / 16:00 ~ 22:00 · 주 12시간</p>
                <p>월급 예상 약 703,900원</p>
              </div>
              <p className="text-xs text-gray-400 mt-2">※ 주휴수당 미해당</p>
            </div>
          </div>

          <div className="text-sm text-gray-500 mt-4 space-y-0.5">
            <p>※ 매주 화요일은 정기휴무입니다.</p>
            <p>※ 오후파트는 21:00 영업종료 후 22:00까지 마감정리를 함께 합니다.</p>
            <p>※ 급여는 매월 정해진 날짜에 지급되며, 입사 시 상세 안내드립니다.</p>
          </div>
        </section>

        {/* 담당업무 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 border-t-2 border-brand pt-6 mb-4">담당업무</h2>
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-2">▸ 만두·메뉴 조리</h3>
              <p className="text-sm text-gray-600 ml-4">만두 찌기, 쫄면 조리, 야채 손질, 계란 손질</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-2">▸ 포장 및 응대</h3>
              <p className="text-sm text-gray-600 ml-4">포장 작업, 손님 응대, 배달 주문 포장 및 전달</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-2">▸ 매장 운영</h3>
              <p className="text-sm text-gray-600 ml-4">포스기 품절 관리, 재고 확인</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-2">▸ 위생·정리</h3>
              <p className="text-sm text-gray-600 ml-4">찜기 설거지, 주방 정리, 마감 청소</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-600">▸ 그 외 영업에 필요한 업무</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            작은 매장이라 모든 업무를 칼같이 나누진 않습니다.<br />
            서로 손이 비는 사람이 먼저 돕는 분위기로 일하고 있습니다.
          </p>

          <div className="text-sm text-gray-500 mt-4 leading-relaxed bg-gray-50 rounded-xl p-4">
            <p>
              ※ &lsquo;만두 빚기&rsquo;는 본 채용 업무에 포함되지 않습니다.<br />
              <span className="ml-3">매장 업무를 충분히 숙지하신 후,</span><br />
              <span className="ml-3">의지와 역량이 확인되면 만두 빚는 기회가 주어질 수 있습니다.</span><br />
              <span className="ml-3">만두 빚기는 저희 가게에서 가장 정성을 들이는 핵심 공정으로,</span><br />
              <span className="ml-3">시간을 두고 함께 호흡이 맞춰진 분께 기회를 드립니다.</span>
            </p>
          </div>
        </section>

        {/* 이런 분을 찾습니다 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 border-t-2 border-brand pt-6 mb-4">이런 분을 찾습니다</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✓ 손이 빠르고 꼼꼼하신 분</li>
              <li>✓ 친절한 응대가 자연스러우신 분</li>
              <li>✓ 정리정돈을 잘하시는 분</li>
              <li>✓ 오래 함께 일하실 분</li>
              <li>✓ 매장 운영을 배우고 싶은 분</li>
            </ul>
          </div>
        </section>

        {/* 함께하면 좋은 점 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 border-t-2 border-brand pt-6 mb-4">함께하면 좋은 점</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <p className="font-semibold">🤝 존중과 배려가 있는 건강한 일터</p>
              <p className="text-gray-600 ml-6">서로 예의를 지키고, 의견이 반영되는 매장입니다.</p>
            </div>
            <div>
              <p className="font-semibold">📈 일한 만큼 기회가 열립니다</p>
              <p className="text-gray-600 ml-6">일을 잘하시고 의지도 있으시다면<br /><span className="ml-6">근무시간 확장도 협의 가능합니다.</span></p>
            </div>
            <div>
              <p className="font-semibold">🔒 장기근속 시 정규직 전환 가능</p>
              <p className="text-gray-600 ml-6">오래 함께해주실 분께는 언제든 정규직 전환을 협의해드립니다.</p>
            </div>
            <div>
              <p className="font-semibold">🏪 함께 자랄 수 있는 가게</p>
              <p className="text-gray-600 ml-6">
                같은 상가 내 매장 확장을 준비 중입니다.<br />
                <span className="ml-6">확장 시 근무지가 변경될 가능성이 있으며,</span><br />
                <span className="ml-6">이는 사전에 제안드리고 상호 협의로 결정합니다.</span>
              </p>
            </div>
          </div>
        </section>

        {/* 지원 절차 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 border-t-2 border-brand pt-6 mb-4">지원 절차</h2>
          <div className="text-sm text-gray-700 space-y-3">
            <div className="flex items-start gap-3">
              <span className="bg-brand text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <p>아래 지원폼 작성 (약 2분)</p>
            </div>
            <div className="text-center text-gray-300">↓</div>
            <div className="flex items-start gap-3">
              <span className="bg-brand text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <p>서류 검토 후 2~3일 이내 연락</p>
            </div>
            <div className="text-center text-gray-300">↓</div>
            <div className="flex items-start gap-3">
              <span className="bg-brand text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <p>면접 (매장 방문 또는 근처 카페, 약 20~30분)</p>
            </div>
            <div className="text-center text-gray-300">↓</div>
            <div className="flex items-start gap-3">
              <span className="bg-brand text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <p>근무 시작 (협의된 일정)</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4 leading-relaxed">
            ※ 채용 확정 시 보건증 소지 여부를 확인합니다.<br />
            <span className="ml-3">미소지자는 입사 전 보건소·지정 의료기관에서 발급받으시면 됩니다.</span>
          </p>
        </section>

        {/* 자주 묻는 질문 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 border-t-2 border-brand pt-6 mb-4">자주 묻는 질문</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-gray-800">Q. 만두 빚는 일도 하나요?</p>
              <p className="text-gray-600 mt-1 leading-relaxed">
                A. 채용 시점에는 만두 빚기 업무를 맡지 않습니다.<br />
                <span className="ml-3">매장 업무를 충분히 숙지하신 후,</span><br />
                <span className="ml-3">의지와 역량이 확인되면 만두 빚는 기회가 주어질 수 있습니다.</span>
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Q. 경험이 없어도 지원 가능한가요?</p>
              <p className="text-gray-600 mt-1 leading-relaxed">
                A. 네, 경험보다 성실함과 꼼꼼함을 더 중요하게 봅니다.<br />
                <span className="ml-3">업무는 입사 후 차근차근 알려드립니다.</span>
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Q. 처음 며칠은 교육 기간인가요?</p>
              <p className="text-gray-600 mt-1 leading-relaxed">
                A. 첫 1~2일은 매장 흐름을 익히는 적응 기간이며,<br />
                <span className="ml-3">해당 기간도 정상 시급으로 지급됩니다.</span>
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Q. 복장은 어떻게 되나요?</p>
              <p className="text-gray-600 mt-1 leading-relaxed">
                A. 앞치마는 매장에서 제공합니다.<br />
                <span className="ml-3">활동복과 모자는 본인이 지참해주세요.</span>
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Q. 정규직 전환이 가능한가요?</p>
              <p className="text-gray-600 mt-1 leading-relaxed">
                A. 장기근속하실 분께는 정규직 전환을 협의해드립니다.<br />
                <span className="ml-3">또한 일을 잘하시고 의지가 있으시다면</span><br />
                <span className="ml-3">근무시간 확장도 협의 가능합니다.</span>
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Q. 매장 확장 시 근무지가 바뀔 수 있나요?</p>
              <p className="text-gray-600 mt-1 leading-relaxed">
                A. 같은 상가 내 매장 확장을 준비 중입니다.<br />
                <span className="ml-3">확장 시 근무지가 변경될 가능성이 있으며,</span><br />
                <span className="ml-3">이는 사전에 제안드리고 상호 협의 후 결정합니다.</span>
              </p>
            </div>
          </div>
        </section>

        {/* 지원하기 */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 border-t-2 border-brand pt-6 mb-4">지원하기</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            아래 지원폼을 작성해주시면<br />
            2~3일 이내에 연락드리겠습니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
            </div>

            {/* 지원 파트 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                지원 파트 <span className="text-red-500">*</span>
              </label>
              <select
                value={part}
                onChange={(e) => setPart(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none bg-white"
              >
                <option value="" disabled>지원하실 파트를 선택해주세요</option>
                {PART_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 근무 시작 가능일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                근무 시작 가능일 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="예: 2026-06-01 또는 협의 가능"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
            </div>

            {/* 본인 사진 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                본인 사진 <span className="text-gray-400 font-normal">(선택, 자유 형식)</span>
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="relative w-full rounded-lg border-2 border-dashed border-gray-300 hover:border-brand cursor-pointer transition-colors p-4 text-center"
              >
                {photoPreview ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="미리보기"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="text-left">
                      <p className="text-sm text-gray-700">{photo?.name}</p>
                      <p className="text-xs text-gray-400">클릭하여 변경</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <svg className="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">사진 업로드 (5MB 이하)</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="hidden"
              />
            </div>

            {/* 자기소개 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                자기소개 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder={`간단한 본인 소개와 지원 동기, 가능 시작일을 함께 적어주세요.\n(예: 송도 거주 30대, 카페에서 2년 근무했습니다. 12월 1일부터 가능합니다.)`}
                rows={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand hover:bg-brand-dark text-white font-bold py-4 text-base transition-colors disabled:opacity-50"
            >
              {submitting ? '제출 중...' : '지원서 제출하기'}
            </button>
          </form>
        </section>

        {/* 마무리 인사 */}
        <div className="border-t border-gray-200 pt-6">
          <div className="text-center text-sm text-gray-500 leading-relaxed space-y-1">
            <p>작은 가게에 관심 가져주셔서 감사합니다.</p>
            <p>좋은 인연으로 만나뵙길 기다리고 있겠습니다.</p>
            <p className="pt-3 text-gray-400">— 올때만두 드림 🥟</p>
          </div>
        </div>

        {/* 매장 정보 */}
        <div className="text-center text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-6">
          <p className="font-medium text-gray-500">올때만두</p>
          <p>인천 송도 e편한세상 후문상가 (랜드마크로 113)</p>
          <p>문의: 010-5877-4424</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
