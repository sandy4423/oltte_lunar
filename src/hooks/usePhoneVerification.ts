/**
 * 전화번호 인증 훅
 * 
 * 전화번호 입력, 인증번호 발송/확인 로직을 관리합니다.
 * SKIP_PHONE_VERIFICATION이 true이면 인증 없이 전화번호 입력만으로 통과합니다.
 */

import { useState } from 'react';
import { SKIP_PHONE_VERIFICATION } from '@/lib/constants';

export function usePhoneVerification() {
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    dong: string;
    ho: string;
  } | null>(null);

  // 인증 스킵 모드: 전화번호 유효성만 검사하고 바로 통과
  const handleSkipVerification = async () => {
    const cleanPhone = phone.replace(/-/g, '');
    if (!/^01[0-9]{8,9}$/.test(cleanPhone)) {
      setError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    setIsPhoneVerified(true);
    setError(null);

    try {
      const infoResponse = await fetch(`/api/customer/info?phone=${encodeURIComponent(cleanPhone)}`);
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        if (info.name || info.dong || info.ho) {
          setCustomerInfo(info);
        }
      }
    } catch {
      // 고객 정보 조회 실패는 무시
    }
  };

  // 인증번호 발송
  const handleSendVerification = async () => {
    if (isSending) return;

    if (!/^01[0-9]{8,9}$/.test(phone.replace(/-/g, ''))) {
      setError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    
    setError(null);
    setIsSending(true);
    
    try {
      const response = await fetch('/api/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '인증번호 발송에 실패했습니다.');
        return;
      }

      setVerificationSent(true);

      if (result.isTestPhone) {
        setVerificationCode('0000');
        setTimeout(async () => {
          await handleVerifyCode('0000');
        }, 500);
      }
    } catch (err) {
      console.error('[SMS] 발송 오류:', err);
      setError('인증번호 발송 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async (autoCode?: string) => {
    const codeToVerify = autoCode || verificationCode;
    
    if (codeToVerify.length !== 4) {
      setError('인증번호 4자리를 입력해주세요.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: codeToVerify }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '인증에 실패했습니다.');
        setIsVerifying(false);
        return;
      }

      setIsPhoneVerified(true);
      setError(null);

      try {
        const infoResponse = await fetch(`/api/customer/info?phone=${encodeURIComponent(phone)}`);
        if (infoResponse.ok) {
          const info = await infoResponse.json();
          if (info.name || info.dong || info.ho) {
            setCustomerInfo(info);
          }
        }
      } catch {
        // 고객 정보 조회 실패는 무시
      }
    } catch (err) {
      console.error('[SMS] 인증 오류:', err);
      setError('인증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    phone,
    setPhone,
    verificationCode,
    setVerificationCode,
    isPhoneVerified,
    setIsPhoneVerified,
    isVerifying,
    isSending,
    verificationSent,
    error,
    setError,
    customerInfo,
    handleSendVerification,
    handleVerifyCode,
    skipVerification: SKIP_PHONE_VERIFICATION,
    handleSkipVerification,
  };
}
