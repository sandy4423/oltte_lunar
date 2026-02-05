'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, CheckCircle } from 'lucide-react';

interface CashReceiptFormProps {
  orderId: string;
  totalAmount: number;
  status: string;
  initialType?: '소득공제' | '지출증빙' | null;
  initialNumber?: string | null;
  issued?: boolean;
  receiptUrl?: string | null;
}

export function CashReceiptForm({
  orderId,
  totalAmount,
  status,
  initialType = null,
  initialNumber = null,
  issued = false,
  receiptUrl = null,
}: CashReceiptFormProps) {
  const [type, setType] = useState<'소득공제' | '지출증빙'>(initialType || '소득공제');
  const [number, setNumber] = useState(initialNumber || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(!!initialType);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 입력 검증
    if (!number.trim()) {
      setError('등록번호를 입력해주세요.');
      return;
    }

    // 번호 형식 검증
    const cleanNumber = number.replace(/[^0-9]/g, '');
    if (type === '소득공제' && cleanNumber.length !== 10 && cleanNumber.length !== 11) {
      setError('휴대폰번호는 10자리 또는 11자리 숫자를 입력해주세요.');
      return;
    }
    if (type === '지출증빙' && cleanNumber.length !== 10) {
      setError('사업자번호는 10자리 숫자를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/cash-receipt/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          type,
          number: cleanNumber,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      setSaved(true);
    } catch (err: any) {
      console.error('현금영수증 저장 오류:', err);
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 발급 완료된 경우
  if (issued && receiptUrl) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-green-900 mb-2">현금영수증 발급 완료</h3>
              <p className="text-sm text-green-700 mb-3">
                {type} · {number.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
              </p>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 underline hover:text-green-800"
              >
                현금영수증 확인하기 →
              </a>
              <p className="text-xs text-green-600 mt-2">
                💡 국세청 발급은 다음날 완료됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 저장 완료되었지만 아직 발급되지 않은 경우
  if (saved && initialType) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Receipt className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-2">현금영수증 신청 완료</h3>
              <p className="text-sm text-blue-700 mb-1">
                {initialType} · {initialNumber}
              </p>
              <p className="text-xs text-blue-600">
                입금 확인 시 자동으로 발급됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 입력 폼
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-gray-600" />
          <h3 className="font-bold">현금영수증 신청</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 라디오 버튼 */}
          <div>
            <Label className="text-sm text-gray-700 mb-2 block">현금영수증 유형</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="소득공제"
                  checked={type === '소득공제'}
                  onChange={(e) => setType(e.target.value as '소득공제')}
                  className="w-4 h-4 text-brand focus:ring-brand"
                />
                <span className="text-sm">소득공제</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="지출증빙"
                  checked={type === '지출증빙'}
                  onChange={(e) => setType(e.target.value as '지출증빙')}
                  className="w-4 h-4 text-brand focus:ring-brand"
                />
                <span className="text-sm">지출증빙</span>
              </label>
            </div>
          </div>

          {/* 번호 입력 */}
          <div>
            <Label htmlFor="number" className="text-sm text-gray-700 mb-1 block">
              {type === '소득공제' ? '휴대폰번호' : '사업자번호'}
            </Label>
            <Input
              id="number"
              type="tel"
              placeholder={type === '소득공제' ? '01012345678' : '1234567890'}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="text-base"
              maxLength={type === '소득공제' ? 11 : 10}
            />
            <p className="text-xs text-gray-500 mt-1">
              {type === '소득공제' 
                ? '하이픈(-) 없이 숫자만 입력해주세요.' 
                : '사업자등록번호 10자리를 입력해주세요.'}
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          {/* 안내 */}
          <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 space-y-1">
            <p>• 입금 확인 시 자동으로 발급됩니다.</p>
            <p>• 국세청 발급은 다음날 완료됩니다.</p>
            <p>• 입금 전후 언제든지 신청 가능합니다.</p>
          </div>

          {/* 저장 버튼 */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? '저장 중...' : saved ? '수정하기' : '신청하기'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
