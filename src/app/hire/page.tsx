'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Footer } from '@/components/Footer';

const POSITIONS = [
  {
    id: 'weekday-morning',
    label: '평일 오전파트',
    schedule: '월~금 09:00 ~ 16:00',
    hours: '주 35시간',
    wage: '시급 13,200원',
    salary: '월급 예상 약 2,443,000원',
    note: null,
  },
  {
    id: 'weekday-afternoon',
    label: '평일 오후파트',
    schedule: '월~금 16:00 ~ 22:00',
    hours: '주 24시간',
    wage: '시급 13,200원',
    salary: '월급 예상 약 1,376,500원',
    note: null,
  },
  {
    id: 'weekend-morning',
    label: '주말 오전파트',
    schedule: '토·일 09:00 ~ 16:00',
    hours: '주 12시간',
    wage: '시급 13,000원',
    salary: '월급 예상 약 677,800원',
    note: '주휴수당 미해당',
  },
  {
    id: 'weekend-afternoon',
    label: '주말 오후파트',
    schedule: '토·일 16:00 ~ 22:00',
    hours: '주 12시간',
    wage: '시급 13,000원',
    salary: '월급 예상 약 677,800원',
    note: '주휴수당 미해당',
  },
];

const DUTIES = [
  '만두 찌기',
  '포장 및 손님 응대',
  '배달 주문 포장 및 전달 처리',
  '포스기 품절 관리',
  '쫄면 조리',
  '야채 채썰기',
  '계란 까기 및 자르기',
  '찜기 설거지',
  '주방 정리',
  '마감 청소',
  '기타 영업에 필요한 업무',
];

const QUALITIES = [
  '손 빠르고 꼼꼼하신 분',
  '친절한 응대가 가능하신 분',
  '정리정돈을 잘하시는 분',
  '오래 함께 일하실 분',
  '매장 운영을 배우고 싶은 분',
];

export default function HirePage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [intro, setIntro] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const togglePosition = (id: string) => {
    setSelectedPositions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

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
    if (selectedPositions.length === 0) return setError('지원 파트를 선택해주세요.');

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('phone', phone.trim());
      formData.append('positions', JSON.stringify(selectedPositions));
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
            빠른 시일 내에 연락드리겠습니다.
          </p>
          <p className="text-sm text-gray-400">올때만두 드림 🥟</p>
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
        {/* 모집 파트 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-brand text-white text-sm flex items-center justify-center font-bold">1</span>
            모집 파트
          </h2>
          <div className="space-y-3">
            {POSITIONS.map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => togglePosition(pos.id)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  selectedPositions.includes(pos.id)
                    ? 'border-brand bg-orange-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gray-900">{pos.label}</span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedPositions.includes(pos.id)
                        ? 'bg-brand border-brand text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedPositions.includes(pos.id) && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p>{pos.schedule} · {pos.hours}</p>
                  <p className="font-semibold text-brand-dark">{pos.wage} · {pos.salary}</p>
                  {pos.note && <p className="text-xs text-gray-400">※ {pos.note}</p>}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 담당업무 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">담당업무</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-gray-700">
            {DUTIES.map((duty) => (
              <li key={duty} className="flex items-start gap-1.5">
                <span className="text-brand mt-0.5">•</span>
                {duty}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-3">
            ※ 오후파트는 21:00 영업종료 후 22:00까지 마감정리를 함께 합니다.
          </p>
        </section>

        {/* 우대사항 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">이런 분을 찾습니다</h2>
          <ul className="space-y-2">
            {QUALITIES.map((q) => (
              <li key={q} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-brand">✓</span>
                {q}
              </li>
            ))}
          </ul>
        </section>

        {/* 지원서 폼 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-brand text-white text-sm flex items-center justify-center font-bold">2</span>
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

            {/* 사진 업로드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사진 <span className="text-gray-400 font-normal">(선택)</span>
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
                placeholder="간단한 자기소개나 하고 싶은 말을 적어주세요."
                rows={4}
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
