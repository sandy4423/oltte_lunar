/**
 * 전화번호 인증 훅
 * 
 * 전화번호 입력, 인증번호 발송/확인 로직을 관리합니다.
 */

import { useState } from 'react';

export function usePhoneVerification() {
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false); // 발송 중 상태 추가
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 인증번호 발송
  const handleSendVerification = async () => {
    // 중복 클릭 방지
    if (isSending) {
      console.log('[SMS] 이미 발송 중입니다.');
      return;
    }

    if (!/^01[0-9]{8,9}$/.test(phone.replace(/-/g, ''))) {
      setError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    
    setError(null);
    setIsSending(true); // 발송 시작
    
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
      console.log('[SMS] 인증번호 발송 성공');
    } catch (err) {
      console.error('[SMS] 발송 오류:', err);
      setError('인증번호 발송 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false); // 발송 완료
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 3) {
      setError('인증번호 3자리를 입력해주세요.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: verificationCode }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '인증에 실패했습니다.');
        setIsVerifying(false);
        return;
      }

      setIsPhoneVerified(true);
      setError(null);
      console.log('[SMS] 인증 성공');
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
    isVerifying,
    isSending, // 발송 중 상태 추가
    verificationSent,
    error,
    setError,
    handleSendVerification,
    handleVerifyCode,
  };
}
