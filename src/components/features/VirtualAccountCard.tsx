/**
 * 가상계좌 정보 카드 컴포넌트
 */

import { useState } from 'react';
import { Copy, Check, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface VirtualAccountCardProps {
  hasVirtualAccount: boolean;
  vbankBank: string | null;
  vbankNum: string | null;
  vbankHolder: string | null;
  totalAmount: number;
}

export function VirtualAccountCard({
  hasVirtualAccount,
  vbankBank,
  vbankNum,
  vbankHolder,
  totalAmount,
}: VirtualAccountCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAccount = async () => {
    if (!vbankNum) return;

    try {
      await navigator.clipboard.writeText(vbankNum);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!hasVirtualAccount) {
    return (
      <Card className="bg-white shadow-xl">
        <CardContent className="pt-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">가상계좌 발급 중...</p>
          <p className="text-sm text-gray-400 mt-2">
            잠시만 기다려주세요
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-xl border-2 border-orange-200">
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <Building2 className="mx-auto h-8 w-8 text-brand mb-2" />
          <h2 className="text-lg font-bold text-gray-900">입금 계좌 안내</h2>
        </div>

        <div className="bg-orange-50 rounded-2xl p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">은행</p>
            <p className="text-2xl font-bold text-gray-900">{vbankBank}</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">계좌번호</p>
            <p className="text-3xl font-bold text-brand-dark tracking-wider">
              {vbankNum}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">예금주</p>
            <p className="text-xl font-bold text-gray-900">
              {vbankHolder || '올때만두'}
            </p>
          </div>

          <div className="text-center pt-2">
            <p className="text-sm text-gray-500 mb-1">입금 금액</p>
            <p className="text-4xl font-bold text-brand">
              {totalAmount.toLocaleString()}원
            </p>
          </div>
        </div>

        <Button
          onClick={handleCopyAccount}
          variant="outline"
          className="w-full mt-4 h-12 text-base"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-5 w-5 text-brand" />
              복사 완료!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-5 w-5" />
              계좌번호 복사하기
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
