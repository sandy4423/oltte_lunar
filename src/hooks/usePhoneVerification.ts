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
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 인증번호 발송 (Mock)
  const handleSendVerification = async () => {
    if (!/^01[0-9]{8,9}$/.test(phone.replace(/-/g, ''))) {
      setError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setError(null);
    setVerificationSent(true);
    // TODO: 실제 SMS 인증 API 연동
    console.log('[Mock] 인증번호 발송:', phone);
  };

  // 인증번호 확인 (Mock)
  const handleVerifyCode = async () => {
    setIsVerifying(true);
    // Mock: 아무 코드나 입력하면 성공
    await new Promise((r) => setTimeout(r, 500));
    if (verificationCode.length >= 4) {
      setIsPhoneVerified(true);
      setError(null);
    } else {
      setError('인증번호를 확인해주세요.');
    }
    setIsVerifying(false);
  };

  return {
    phone,
    setPhone,
    verificationCode,
    setVerificationCode,
    isPhoneVerified,
    isVerifying,
    verificationSent,
    error,
    setError,
    handleSendVerification,
    handleVerifyCode,
  };
}
