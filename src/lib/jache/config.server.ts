/**
 * 자체앱 주문 창 스위치 (서버 전용). 운영 환경변수에는 아무것도 넣지 않는다 → 전부 꺼짐.
 *  JACHE_PREVIEW=1     /menu 화면·API 열림 (미리보기)
 *  JACHE_TEST_MODE=1   시험 모드: 토스페이먼츠 시험 키(돈 안 움직임), 포스 주문은 「[테스트]」 임의 상품, 주문은 로컬 파일에 저장
 *  JACHE_LIVE=1        (나중에, 사장님 승인 뒤) 실결제. 지금은 쓰지 않는다
 *  JACHE_POS_DRY_RUN=1 포스로 보내지 않고 보낼 내용만 로그
 *  JACHE_TOSS_TEST_CLIENT_KEY / JACHE_TOSS_TEST_SECRET_KEY  시험 키 (비밀 키가 없으면 결제창을 건너뛰고 승인을 흉내 낸다)
 */
export const isPreview = () => process.env.JACHE_PREVIEW === '1';
export const isTestMode = () => process.env.JACHE_TEST_MODE === '1';
export const isLive = () => process.env.JACHE_LIVE === '1' && !isTestMode();
export const paymentsEnabled = () => isPreview() && (isTestMode() || isLive());
export const posDryRun = () => process.env.JACHE_POS_DRY_RUN === '1';

/** 토스페이먼츠 공개 문서의 V1 결제창 시험 클라이언트 키 (tosspayments-sample-v1 예제와 같은 값) */
const DOC_TEST_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

export interface TossKeys {
  clientKey: string;
  secretKey: string | null;
  /** 시험 모드인데 시험 비밀 키가 없으면: 결제창 없이 승인을 흉내 낸다 (돈 0원, 외부 호출 0) */
  simulate: boolean;
}

export function tossKeys(): TossKeys | null {
  if (isTestMode()) {
    const secretKey = process.env.JACHE_TOSS_TEST_SECRET_KEY || null;
    if (secretKey && !secretKey.startsWith('test_')) throw new Error('시험 모드에 live 키를 쓸 수 없습니다');
    return { clientKey: process.env.JACHE_TOSS_TEST_CLIENT_KEY || DOC_TEST_CLIENT_KEY, secretKey, simulate: !secretKey };
  }
  if (isLive()) {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!clientKey || !secretKey) return null;
    return { clientKey, secretKey, simulate: false };
  }
  return null;
}
