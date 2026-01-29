/**
 * 전화번호 인증 컴포넌트
 */

import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PhoneVerificationProps {
  phone: string;
  setPhone: (phone: string) => void;
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  isPhoneVerified: boolean;
  isVerifying: boolean;
  verificationSent: boolean;
  error: string | null;
  isGuestOrder: boolean;
  handleSendVerification: () => void;
  handleVerifyCode: () => void;
  handleGuestOrder: () => void;
}

export function PhoneVerification({
  phone,
  setPhone,
  verificationCode,
  setVerificationCode,
  isPhoneVerified,
  isVerifying,
  verificationSent,
  error,
  isGuestOrder,
  handleSendVerification,
  handleVerifyCode,
  handleGuestOrder,
}: PhoneVerificationProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="h-5 w-5" />
          휴대폰 인증
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="tel"
            placeholder="01012345678"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            disabled={isPhoneVerified}
            className="flex-1 text-lg"
          />
          <Button
            onClick={handleSendVerification}
            disabled={isPhoneVerified || verificationSent}
            variant={verificationSent ? 'secondary' : 'default'}
          >
            {verificationSent ? '전송됨' : '인증요청'}
          </Button>
        </div>
        
        {verificationSent && !isPhoneVerified && (
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="인증번호 3자리"
              value={verificationCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value)}
              maxLength={3}
              className="flex-1 text-lg tracking-widest"
            />
            <Button onClick={handleVerifyCode} disabled={isVerifying}>
              {isVerifying ? '확인중...' : '확인'}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 font-medium">⚠ {error}</p>
        )}

        {isPhoneVerified && !isGuestOrder && (
          <p className="text-sm text-green-600 font-medium">✓ 인증 완료</p>
        )}

        {isGuestOrder && (
          <p className="text-sm text-blue-600 font-medium">✓ 비회원 주문 모드</p>
        )}

        {!isPhoneVerified && !verificationSent && (
          <div className="pt-2 border-t">
            <Button
              onClick={handleGuestOrder}
              variant="outline"
              className="w-full text-gray-600 hover:text-gray-900"
            >
              전화번호 없이 비회원 주문하기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
