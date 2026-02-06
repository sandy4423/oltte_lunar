'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/Footer';
import { STORE_INFO } from '@/lib/constants';

interface OrderInfo {
  id: string;
  customerName: string;
  aptName: string;
  dong: string;
  ho: string;
  totalAmount: number;
  refundAmount: number;
  refundReason: string;
}

// 은행 코드 목록
const BANKS = [
  { code: '88', name: '신한은행' },
  { code: '04', name: '국민은행' },
  { code: '81', name: '하나은행' },
  { code: '20', name: '우리은행' },
  { code: '03', name: '기업은행' },
  { code: '11', name: '농협은행' },
  { code: '90', name: '카카오뱅크' },
  { code: '89', name: '케이뱅크' },
  { code: '92', name: '토스뱅크' },
  { code: '31', name: '대구은행' },
  { code: '32', name: '부산은행' },
  { code: '34', name: '광주은행' },
  { code: '37', name: '전북은행' },
  { code: '39', name: '경남은행' },
  { code: '35', name: '제주은행' },
  { code: '07', name: '수협은행' },
  { code: '23', name: 'SC제일은행' },
  { code: '27', name: '한국씨티은행' },
  { code: '45', name: '새마을금고' },
  { code: '48', name: '신협' },
  { code: '71', name: '우체국' },
];

export default function RefundAccountPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);

  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const [success, setSuccess] = useState(false);

  // 주문 정보 조회
  useEffect(() => {
    const fetchOrderInfo = async () => {
      try {
        const response = await fetch(`/api/refund/account?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || '주문 정보를 불러올 수 없습니다.');
          setLoading(false);
          return;
        }

        setOrderInfo(data.order);
        setLoading(false);
      } catch (err: any) {
        setError('주문 정보를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    if (token) {
      fetchOrderInfo();
    }
  }, [token]);

  // 계좌정보 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!bankCode || !accountNumber || !accountHolder) {
      setError('모든 정보를 입력해주세요.');
      return;
    }

    // 계좌번호 숫자만 입력 검증
    if (!/^[0-9]+$/.test(accountNumber)) {
      setError('계좌번호는 숫자만 입력 가능합니다.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/refund/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          bank_code: bankCode,
          account_number: accountNumber,
          account_holder: accountHolder,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '환불 처리에 실패했습니다.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError('환불 처리 중 오류가 발생했습니다.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">주문 정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (error && !orderInfo) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-12">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">오류</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">{error}</p>
              <p className="text-sm text-gray-600">
                문제가 지속되면 고객센터({STORE_INFO.phone})로 문의해주세요.
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-12">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">✅ 환불 처리 완료</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700 mb-4">
                환불이 정상적으로 처리되었습니다.
              </p>
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">환불 금액</p>
                <p className="text-2xl font-bold text-gray-900 mb-4">
                  {orderInfo?.refundAmount.toLocaleString()}원
                </p>
                <p className="text-xs text-gray-500">
                  영업일 기준 3일 이내 입금됩니다.
                </p>
              </div>
              <p className="text-sm text-gray-600">
                감사합니다.
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b py-4">
        <div className="max-w-md mx-auto px-4">
          <h1 className="text-xl font-bold text-gray-900">환불 계좌 입력</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8">
        {/* 주문 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">주문 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">주문번호</span>
              <span className="font-mono text-xs">{orderInfo?.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">주문자</span>
              <span>{orderInfo?.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">배송지</span>
              <span>{orderInfo?.aptName} {orderInfo?.dong}동 {orderInfo?.ho}호</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">주문금액</span>
              <span>{orderInfo?.totalAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-900 font-semibold">환불금액</span>
              <span className="text-blue-600 font-bold text-lg">
                {orderInfo?.refundAmount.toLocaleString()}원
              </span>
            </div>
            <div className="pt-2 border-t">
              <p className="text-gray-600 mb-1">취소 사유</p>
              <p className="text-gray-900">{orderInfo?.refundReason}</p>
            </div>
          </CardContent>
        </Card>

        {/* 계좌 입력 폼 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">환불 계좌 정보</CardTitle>
            <CardDescription>
              아래 정보를 입력하시면 자동으로 환불이 처리됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 은행 선택 */}
              <div className="space-y-2">
                <Label htmlFor="bank">은행</Label>
                <Select value={bankCode} onValueChange={setBankCode}>
                  <SelectTrigger id="bank">
                    <SelectValue placeholder="은행을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 계좌번호 */}
              <div className="space-y-2">
                <Label htmlFor="accountNumber">계좌번호</Label>
                <Input
                  id="accountNumber"
                  type="text"
                  inputMode="numeric"
                  placeholder="하이픈(-) 없이 숫자만 입력"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
              </div>

              {/* 예금주 */}
              <div className="space-y-2">
                <Label htmlFor="accountHolder">예금주명</Label>
                <Input
                  id="accountHolder"
                  type="text"
                  placeholder="예금주명을 입력하세요"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  주문자({orderInfo?.customerName})와 예금주가 다른 경우에도 입력 가능합니다.
                </p>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* 제출 버튼 */}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? '처리 중...' : '환불 계좌 등록 및 환불 요청'}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                계좌 정보를 입력하시면 자동으로 환불이 처리됩니다.<br />
                영업일 기준 3일 이내 입금됩니다.
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            문의: {STORE_INFO.phone}
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}
