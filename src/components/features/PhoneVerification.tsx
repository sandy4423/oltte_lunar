/**
 * 전화번호 인증 컴포넌트
 */

import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface PhoneVerificationProps {
  phone: string;
  setPhone: (phone: string) => void;
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  isPhoneVerified: boolean;
  isVerifying: boolean;
  isSending: boolean; // 발송 중 상태 추가
  verificationSent: boolean;
  error: string | null;
  handleSendVerification: () => void;
  handleVerifyCode: () => void;
  // 동의 관련 props
  allConsent: boolean;
  setAllConsent: (consent: boolean) => void;
  personalInfoConsent: boolean;
  setPersonalInfoConsent: (consent: boolean) => void;
  marketingOptIn: boolean;
  setMarketingOptIn: (consent: boolean) => void;
  onShowPersonalInfoDialog: () => void;
  onShowMarketingDialog: () => void;
  highlightConsent?: boolean;
}

export function PhoneVerification({
  phone,
  setPhone,
  verificationCode,
  setVerificationCode,
  isPhoneVerified,
  isVerifying,
  isSending,
  verificationSent,
  error,
  handleSendVerification,
  handleVerifyCode,
  allConsent,
  setAllConsent,
  personalInfoConsent,
  setPersonalInfoConsent,
  marketingOptIn,
  setMarketingOptIn,
  onShowPersonalInfoDialog,
  onShowMarketingDialog,
  highlightConsent = false,
}: PhoneVerificationProps) {
  // 전화번호 포맷팅 (010-XXXX-XXXX)
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '');
    
    // 010을 제외한 나머지 숫자들
    const rest = numbers.slice(3);
    
    // 입력된 숫자만 표시 (마스킹 없음)
    if (rest.length === 0) {
      return '010-';
    } else if (rest.length <= 4) {
      return `010-${rest}`;
    } else {
      // 4자리 후 자동으로 "-" 추가
      return `010-${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
    }
  };

  // 전화번호 입력 핸들러
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '');
    
    // 010 고정, 최대 11자리까지만
    if (numbers.length <= 11 && numbers.startsWith('010')) {
      setPhone(numbers);
    } else if (numbers.length <= 8) {
      // 010 없이 입력한 경우 010 추가
      setPhone('010' + numbers);
    }
  };

  // 표시용 전화번호
  const displayPhone = phone ? formatPhoneNumber(phone) : '010-';
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
            placeholder="010-0000-0000"
            value={displayPhone}
            onChange={handlePhoneChange}
            disabled={isPhoneVerified || isSending}
            className="flex-1 text-lg"
          />
          <Button
            onClick={handleSendVerification}
            disabled={isPhoneVerified || verificationSent || isSending}
            variant={verificationSent ? 'secondary' : 'default'}
          >
            {isSending ? '발송중...' : verificationSent ? '전송됨' : '인증요청'}
          </Button>
        </div>
        
        {verificationSent && !isPhoneVerified && (
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="인증번호 4자리"
              value={verificationCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value)}
              maxLength={4}
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

        {isPhoneVerified && (
          <p className="text-sm text-green-600 font-medium">✓ 인증 완료</p>
        )}

        {/* 인증 완료 후 동의 체크박스 표시 */}
        {isPhoneVerified && (
          <div className="space-y-3 pt-4 border-t">
            {/* 전체 동의 */}
            <div className={cn(
              "flex items-center space-x-2 p-2 rounded transition-all",
              highlightConsent && "border-2 border-red-500 bg-red-50"
            )}>
              <Checkbox 
                id="allConsent" 
                checked={allConsent}
                onCheckedChange={(checked) => {
                  setAllConsent(checked as boolean);
                  setPersonalInfoConsent(checked as boolean);
                  setMarketingOptIn(checked as boolean);
                }}
              />
              <label htmlFor="allConsent" className="text-sm font-semibold cursor-pointer">
                전체 동의
              </label>
            </div>
            
            {/* 개인정보 수집 동의 (필수) */}
            <div className="flex items-center space-x-2 pl-6">
              <Checkbox 
                id="personalInfo" 
                checked={personalInfoConsent}
                onCheckedChange={(checked) => {
                  setPersonalInfoConsent(checked as boolean);
                  // 개인정보 동의 해제 시 전체 동의도 해제
                  if (!checked) setAllConsent(false);
                  // 모두 체크되면 전체 동의 활성화
                  if (checked && marketingOptIn) setAllConsent(true);
                }}
              />
              <label htmlFor="personalInfo" className="text-xs cursor-pointer flex-1">
                개인정보 수집 및 이용 동의 (필수)
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onShowPersonalInfoDialog();
                  }}
                  className="ml-1 text-blue-600 underline hover:text-blue-800"
                >
                  보기
                </button>
              </label>
            </div>
            
            {/* 마케팅 동의 (선택) */}
            <div className="flex items-center space-x-2 pl-6">
              <Checkbox 
                id="marketing" 
                checked={marketingOptIn}
                onCheckedChange={(checked) => {
                  setMarketingOptIn(checked as boolean);
                  // 마케팅 동의 해제 시 전체 동의도 해제
                  if (!checked) setAllConsent(false);
                  // 모두 체크되면 전체 동의 활성화
                  if (checked && personalInfoConsent) setAllConsent(true);
                }}
              />
              <label htmlFor="marketing" className="text-xs cursor-pointer flex-1">
                마케팅 정보 수신 동의 (선택)
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onShowMarketingDialog();
                  }}
                  className="ml-1 text-blue-600 underline hover:text-blue-800"
                >
                  보기
                </button>
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
