import { isPreview, isTestMode } from './config.server';

/** 자체앱 시험 모드 전용 번호 — 문자 발송·DB 기록 없이 000000 으로 인증된다. 운영(시험 모드 꺼짐)에선 일반 번호와 같다 */
export const JACHE_TEST_PHONE = '01000000000';
export const JACHE_TEST_CODE = '000000';

export const isJacheTestPhone = (phone: string) => isPreview() && isTestMode() && phone === JACHE_TEST_PHONE;
