/**
 * 전화번호 인증 컴포넌트
 * SKIP_PHONE_VERIFICATION이 true이면 인증 없이 전화번호 확인만으로 통과
 */

import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { SKIP_PHONE_VERIFICATION } from '@/lib/constants';

interface PhoneVerificationProps {
  phone: string;
  setPhone: (phone: string) => void;
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  isPhoneVerified: boolean;
  isVerifying: boolean;
  isSending: boolean;
  verificationSent: boolean;
  error: string | null;
  handleSendVerification: () => void;
  handleVerifyCode: () => void;
  handleSkipVerification?: () => void;
  allConsent: boolean;
  setAllConsent: (consent: boolean) => void;
  personalInfoConsent: boolean;
  setPersonalInfoConsent: (consent: boolean) => void;
  termsConsent: boolean;
  setTermsConsent: (consent: boolean) => void;
  eftTermsConsent: boolean;
  setEftTermsConsent: (consent: boolean) => void;
  marketingOptIn: boolean;
  setMarketingOptIn: (consent: boolean) => void;
  onShowPersonalInfoDialog: () => void;
  onShowTermsDialog: () => void;
  onShowEftTermsDialog: () => void;
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
  handleSkipVerification,
  allConsent,
  setAllConsent,
  personalInfoConsent,
  setPersonalInfoConsent,
  termsConsent,
  setTermsConsent,
  eftTermsConsent,
  setEftTermsConsent,
  marketingOptIn,
  setMarketingOptIn,
  onShowPersonalInfoDialog,
  onShowTermsDialog,
  onShowEftTermsDialog,
  onShowMarketingDialog,
  highlightConsent = false,
}: PhoneVerificationProps) {
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    const rest = numbers.slice(3);
    
    if (rest.length === 0) {
      return '010-';
    } else if (rest.length <= 4) {
      return `010-${rest}`;
    } else {
      return `010-${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/[^0-9]/g, '');
    
    if (numbers.length <= 11 && numbers.startsWith('010')) {
      setPhone(numbers);
    } else if (numbers.length <= 8) {
      setPhone('010' + numbers);
    }
  };

  const displayPhone = phone ? formatPhoneNumber(phone) : '010-';

  const allRequiredConsents = personalInfoConsent && termsConsent && eftTermsConsent;

  const handleAllConsentChange = (checked: boolean) => {
    setAllConsent(checked);
    setPersonalInfoConsent(checked);
    setTermsConsent(checked);
    setEftTermsConsent(checked);
    setMarketingOptIn(checked);
  };

  const checkAllConsent = (pi: boolean, tc: boolean, eft: boolean, mk: boolean) => {
    if (pi && tc && eft && mk) setAllConsent(true);
    else setAllConsent(false);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="h-5 w-5" />
          {SKIP_PHONE_VERIFICATION ? '휴대폰 번호' : '휴대폰 인증'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {SKIP_PHONE_VERIFICATION ? (
          <div className="flex gap-2">
            <Input
              type="tel"
              placeholder="010-0000-0000"
              value={displayPhone}
              onChange={handlePhoneChange}
              disabled={isPhoneVerified}
              className="flex-1 text-lg"
            />
            <Button
              onClick={handleSkipVerification}
              disabled={isPhoneVerified || phone.length < 10}
            >
              {isPhoneVerified ? '확인됨' : '확인'}
            </Button>
          </div>
        ) : (
          <>
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
                <Button onClick={() => handleVerifyCode()} disabled={isVerifying}>
                  {isVerifying ? '확인중...' : '확인'}
                </Button>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-red-600 font-medium">⚠ {error}</p>
        )}

        {isPhoneVerified && (
          <p className="text-sm text-green-600 font-medium">✓ {SKIP_PHONE_VERIFICATION ? '확인 완료' : '인증 완료'}</p>
        )}

        {isPhoneVerified && (
          <div className="space-y-3 pt-4 border-t">
            <div className={cn(
              "flex items-center space-x-2 p-2 rounded transition-all",
              highlightConsent && "border-2 border-red-500 bg-red-50"
            )}>
              <Checkbox 
                id="allConsent" 
                checked={allConsent}
                onCheckedChange={(checked) => handleAllConsentChange(checked as boolean)}
              />
              <label htmlFor="allConsent" className="text-sm font-semibold cursor-pointer">
                전체 동의
              </label>
            </div>
            
            <div className="flex items-center space-x-2 pl-6">
              <Checkbox 
                id="termsConsent" 
                checked={termsConsent}
                onCheckedChange={(checked) => {
                  setTermsConsent(checked as boolean);
                  checkAllConsent(personalInfoConsent, checked as boolean, eftTermsConsent, marketingOptIn);
                }}
              />
              <label htmlFor="termsConsent" className="text-xs cursor-pointer flex-1">
                이용약관 동의 (필수)
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); onShowTermsDialog(); }}
                  className="ml-1 text-blue-600 underline hover:text-blue-800"
                >
                  보기
                </button>
              </label>
            </div>

            <div className="flex items-center space-x-2 pl-6">
              <Checkbox 
                id="eftTermsConsent" 
                checked={eftTermsConsent}
                onCheckedChange={(checked) => {
                  setEftTermsConsent(checked as boolean);
                  checkAllConsent(personalInfoConsent, termsConsent, checked as boolean, marketingOptIn);
                }}
              />
              <label htmlFor="eftTermsConsent" className="text-xs cursor-pointer flex-1">
                전자금융거래 이용약관 동의 (필수)
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); onShowEftTermsDialog(); }}
                  className="ml-1 text-blue-600 underline hover:text-blue-800"
                >
                  보기
                </button>
              </label>
            </div>

            <div className="flex items-center space-x-2 pl-6">
              <Checkbox 
                id="personalInfo" 
                checked={personalInfoConsent}
                onCheckedChange={(checked) => {
                  setPersonalInfoConsent(checked as boolean);
                  checkAllConsent(checked as boolean, termsConsent, eftTermsConsent, marketingOptIn);
                }}
              />
              <label htmlFor="personalInfo" className="text-xs cursor-pointer flex-1">
                개인정보 수집 및 이용 동의 (필수)
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); onShowPersonalInfoDialog(); }}
                  className="ml-1 text-blue-600 underline hover:text-blue-800"
                >
                  보기
                </button>
              </label>
            </div>
            
            <div className="flex items-center space-x-2 pl-6">
              <Checkbox 
                id="marketing" 
                checked={marketingOptIn}
                onCheckedChange={(checked) => {
                  setMarketingOptIn(checked as boolean);
                  checkAllConsent(personalInfoConsent, termsConsent, eftTermsConsent, checked as boolean);
                }}
              />
              <label htmlFor="marketing" className="text-xs cursor-pointer flex-1">
                마케팅 정보 수신 동의 (선택)
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); onShowMarketingDialog(); }}
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
