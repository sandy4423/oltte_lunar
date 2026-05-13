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
          <div className="text-5xl">🥟</div>
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
          <h1 className="text-3xl font-bold tracking-tight">지원하기</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* 안내 */}
        <p className="text-center text-sm text-gray-600 leading-relaxed">
          아래 지원폼을 작성해주시면<br />
          2~3일 이내에 연락드리겠습니다.
        </p>

        {/* 지원서 폼 */}
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

        {/* 마무리 인사 */}
        <div className="text-center text-sm text-gray-500 leading-relaxed pt-4 space-y-1">
          <p>작은 가게에 관심 가져주셔서 감사합니다.</p>
          <p>좋은 인연으로 만나뵙길 기다리고 있겠습니다.</p>
          <p className="pt-2 text-gray-400">— 올때만두 드림 🥟</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
