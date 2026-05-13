'use client';

import { useState, useRef } from 'react';
import { Footer } from '@/components/Footer';

const PART_OPTIONS = [
  { value: 'weekday_morning', label: '평일 오전 (월·수·목·금 10:00~13:30)' },
  { value: 'weekday_evening', label: '평일 오후 (월·수·목·금 16:00~22:00)' },
  { value: 'weekend_morning', label: '주말 오전 (토·일 09:00~16:00)' },
  { value: 'weekend_evening', label: '주말 오후 (토·일 16:00~22:00)' },
  { value: 'any', label: '상관없음' },
];

const POSITIONS = [
  {
    label: '평일 오전파트',
    schedule: '월·수·목·금 10:00 ~ 13:30',
    hours: '주 14시간',
    wage: '시급 13,200원',
  },
  {
    label: '평일 오후파트',
    schedule: '월·수·목·금 16:00 ~ 22:00',
    hours: '주 24시간',
    wage: '시급 13,200원',
  },
  {
    label: '주말 오전파트',
    schedule: '토·일 09:00 ~ 16:00',
    hours: '주 14시간',
    wage: '시급 13,500원',
    note: '주휴수당 미해당',
  },
  {
    label: '주말 오후파트',
    schedule: '토·일 16:00 ~ 22:00',
    hours: '주 12시간',
    wage: '시급 13,500원',
    note: '주휴수당 미해당',
  },
];

const DUTY_CATEGORIES = [
  {
    title: '조리',
    items: ['만두 찌기', '쫄면 조리', '야채 채썰기', '계란 까기 및 자르기'],
  },
  {
    title: '서비스',
    items: ['포장 및 손님 응대', '배달 주문 포장 및 전달 처리'],
  },
  {
    title: '매장 관리',
    items: ['포스기 품절 관리', '찜기 설거지', '주방 정리', '마감 청소'],
  },
  {
    title: '기타',
    items: ['기타 영업에 필요한 업무'],
  },
];

const QUALITIES = [
  '손 빠르고 꼼꼼하신 분',
  '친절한 응대가 가능하신 분',
  '정리정돈을 잘하시는 분',
  '오래 함께 일하실 분',
  '매장 운영을 배우고 싶은 분',
];

const BENEFITS = [
  '건강하고 깔끔한 근무 환경',
  '근무 시간 확장 가능 (원하시면 파트 추가)',
  '장기 근무 시 정규직 전환 가능',
  '성실한 분에게는 매장 운영도 함께 배울 기회',
];

const FAQS = [
  { q: '경험이 없어도 지원할 수 있나요?', a: '네, 경험 무관입니다. 친절하게 알려드립니다.' },
  { q: '화요일은 왜 쉬나요?', a: '매주 화요일은 정기 휴무일입니다.' },
  { q: '만두를 직접 빚나요?', a: '아닙니다. 만두는 본사에서 납품되며, 매장에서는 찌기만 합니다.' },
  { q: '주차가 가능한가요?', a: '건물 내 주차장 이용 가능합니다.' },
  { q: '두 파트 동시 지원도 가능한가요?', a: '네, 지원 시 "상관없음"을 선택하시거나 자기소개에 희망 파트를 적어주세요.' },
];

const STEPS = [
  { step: '1', title: '지원서 제출', desc: '아래 폼에서 간단히 제출' },
  { step: '2', title: '전화 연락', desc: '1~2일 내 연락드립니다' },
  { step: '3', title: '매장 방문 면접', desc: '편하게 오셔서 대화해요' },
  { step: '4', title: '근무 시작', desc: '보건증 지참 (없으면 안내해드려요)' },
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
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900">지원 완료!</h2>
          <p className="text-gray-600">
            소중한 지원 감사합니다.<br />
            1~2일 내에 전화로 연락드리겠습니다.
          </p>
          <p className="text-sm text-gray-400">올때만두 드림</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* 헤더 */}
      <header className="bg-brand text-white py-8 px-4 text-center">
        <div className="max-w-lg mx-auto">
          <p className="text-sm font-medium opacity-90 mb-1">인천 송도 만두 전문점</p>
          <h1 className="text-3xl font-bold tracking-tight">올때만두 직원 모집</h1>
          <p className="mt-2 text-orange-100">함께 성장할 팀원을 찾습니다!</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">

        {/* 우리는 이런 가게입니다 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">우리는 이런 가게입니다</h2>
          <div className="text-sm text-gray-700 space-y-2 leading-relaxed">
            <p>
              올때만두는 인천 송도 e편한세상 후문상가에 위치한 만두 전문점입니다.
              교자만두, 왕만두, 만두전골 등 직접 개발한 메뉴를 배달과 포장으로 판매하고 있습니다.
            </p>
            <p>
              작은 가게지만 체계적으로 운영하고 있으며,
              함께 일하는 분들이 편하게 오래 다닐 수 있는 환경을 만들기 위해 노력합니다.
            </p>
          </div>
        </section>

        {/* 이 자리는 이런 자리예요 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">이 자리는 이런 자리예요</h2>
          <ul className="text-sm text-gray-700 space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>만두를 직접 빚지 않습니다 (본사 납품)</li>
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>찌고, 포장하고, 응대하는 일이 중심입니다</li>
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>매주 화요일은 정기 휴무입니다</li>
            <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>배달 위주 매장이라 홀 서빙 부담이 적습니다</li>
          </ul>
        </section>

        {/* 모집 파트 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">모집 파트</h2>
          <p className="text-xs text-gray-500 mb-4">※ 주말 파트는 평일보다 시급이 높습니다. 주말 근무 가능하신 분 우대!</p>
          <div className="space-y-3">
            {POSITIONS.map((pos) => (
              <div
                key={pos.label}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <p className="font-bold text-gray-900 mb-1">{pos.label}</p>
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p>{pos.schedule} · {pos.hours}</p>
                  <p className="font-semibold text-brand-dark">{pos.wage}</p>
                  {pos.note && <p className="text-xs text-gray-400">※ {pos.note}</p>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">※ 매주 화요일은 정기 휴무입니다.</p>
        </section>

        {/* 담당업무 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">담당업무</h2>
          <div className="space-y-3">
            {DUTY_CATEGORIES.map((cat) => (
              <div key={cat.title}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{cat.title}</p>
                <ul className="text-sm text-gray-700 space-y-0.5">
                  {cat.items.map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <span className="text-brand mt-0.5">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            ※ 만두는 본사에서 완제품으로 납품됩니다. 매장에서 직접 빚는 작업은 없습니다.
          </p>
          <p className="text-xs text-gray-400">
            ※ 오후파트는 21:00 영업종료 후 22:00까지 마감정리를 함께 합니다.
          </p>
        </section>

        {/* 이런 분을 찾습니다 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">이런 분을 찾습니다</h2>
          <ul className="space-y-2">
            {QUALITIES.map((q) => (
              <li key={q} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-brand">✓</span>{q}
              </li>
            ))}
          </ul>
        </section>

        {/* 함께하면 좋은 점 */}
        <section className="bg-orange-50 rounded-xl border border-orange-100 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">함께하면 좋은 점</h2>
          <ul className="space-y-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-brand">★</span>{b}
              </li>
            ))}
          </ul>
        </section>

        {/* 지원 절차 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">지원 절차</h2>
          <div className="flex items-start gap-0">
            {STEPS.map((s, i) => (
              <div key={s.step} className="flex-1 text-center">
                <div className="w-8 h-8 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center mx-auto mb-2">
                  {s.step}
                </div>
                <p className="text-xs font-semibold text-gray-900">{s.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            ※ 보건증이 없으시면 면접 시 발급 방법 안내해드립니다.
          </p>
        </section>

        {/* 자주 묻는 질문 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">자주 묻는 질문</h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <p className="text-sm font-semibold text-gray-800">Q. {faq.q}</p>
                <p className="text-sm text-gray-600 mt-0.5">A. {faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 지원서 폼 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-brand text-white text-sm flex items-center justify-center font-bold">!</span>
            지원하기
          </h2>

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
                placeholder="홍길동"
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
                placeholder={`간단한 본인 소개와 지원 동기를 적어주세요.\n(예: 송도 거주 30대, 카페에서 2년 근무했습니다.)`}
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
        <section className="text-center py-4 space-y-2">
          <p className="text-sm text-gray-600 leading-relaxed">
            작은 가게지만 함께 일하는 분들을 소중하게 생각합니다.<br />
            편하게 지원해 주세요. 감사합니다.
          </p>
          <p className="text-xs text-gray-400">올때만두 대표 성하경 드림</p>
        </section>

        {/* 매장 정보 */}
        <section className="text-center text-sm text-gray-400 space-y-1 pt-4">
          <p className="font-medium text-gray-500">올때만두</p>
          <p>인천 송도 e편한세상 후문상가 (랜드마크로 113)</p>
          <p>문의: 032-831-9995</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
