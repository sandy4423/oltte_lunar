import { NextRequest, NextResponse } from 'next/server';
import { ORDERING_OPEN, CLOSED_MESSAGE } from '@/lib/ordering';

/**
 * 만두 온라인 주문 닫기 (2026-10-28). 스위치는 src/lib/ordering.ts.
 * matcher 에 없는 경로(/doc, /privacy, /terms, /refund, /eft-terms, /hire,
 * /auth/callback, /admin, /api/webhooks 등)는 이 파일이 아예 손대지 않는다.
 */
const JACHE_PATHS = ['/menu', '/api/menu', '/api/verification', '/api/customer/info'];

export function middleware(req: NextRequest) {
  if (ORDERING_OPEN) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // 자체앱 주문 창 미리보기 (JACHE_PREVIEW=1 인 환경에서만). 운영 환경변수엔 넣지 않는다.
  if (process.env.JACHE_PREVIEW === '1' && JACHE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: CLOSED_MESSAGE, closed: true },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = '/closed';
  url.search = '';
  return NextResponse.rewrite(url, { headers: { 'Cache-Control': 'no-store' } });
}

export const config = {
  matcher: [
    // 손님 주문 화면
    '/',
    '/order/:path*',
    '/pickup/:path*',
    '/dangol/:path*',
    '/my-orders/:path*',
    // 주문을 만들거나 결제를 시작하거나 손님·주문 정보를 돌려주는 API
    '/menu/:path*',
    '/api/menu',
    '/api/menu/:path*',
    '/api/payments/:path*',
    '/api/orders/:path*',
    '/api/customer/:path*',
    '/api/verification/:path*',
    '/api/cash-receipt/:path*',
    '/api/auth/verify-token',
    '/api/admin/orders/manual',
  ],
};
