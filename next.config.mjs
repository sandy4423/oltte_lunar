/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TODO: 프로덕션 안정화 후 false로 변경하여 타입 에러를 빌드 시 잡아야 합니다.
    ignoreBuildErrors: true,
  },
  eslint: {
    // TODO: 프로덕션 안정화 후 false로 변경하여 린트 에러를 빌드 시 잡아야 합니다.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Next.js 14 App Router에서 useSearchParams()의 Suspense 경고를 무시합니다.
    missingSuspenseWithCSRBailout: false,
  },
  /*
    명절 떡국만두 기획판매 (2026-09-22) — olttefood.com/tteokguk26 으로 들어온 손님을
    판매 페이지(장부앱 fresh.olttefood.com)로 보낸다.

    ⛔ **rewrite(경로로 얹기) 가 아니라 redirect 다.** rewrite 로 해보니 HTML 은 오지만
       장부앱이 내보내는 자산 경로가 `/_next/static/...` 상대경로여서 olttefood.com
       (만두앱)에서 찾게 되고 **CSS·JS 가 전부 404** 였다 (실측: 만두앱 경유 404 /
       fresh 직접 200). 글자만 나오고 디자인이 통째로 깨진다.
       고치려면 장부앱 전체에 assetPrefix 를 걸어야 하는데, 그건 지금 운영 중인
       bookkeeping·staff·gift 호스트까지 건드리는 일이라 판매 당일에 할 일이 아니다.
    → 손님은 짧은 주소만 알면 되고, 주소창만 fresh.olttefood.com 으로 바뀐다.
    ⛔ permanent:false(302) 다. 301 은 브라우저가 캐시해 되돌리기 어렵다.
  */
  async redirects() {
    return [
      {
        source: '/tteokguk26',
        destination: 'https://fresh.olttefood.com/tteokguk26',
        permanent: false,
      },
      {
        source: '/tteokguk26/:path*',
        destination: 'https://fresh.olttefood.com/tteokguk26/:path*',
        permanent: false,
      },
      // 사장님이 알리기 쉬운 짧은 주소도 같은 곳으로 (26 없이)
      {
        source: '/tteokguk',
        destination: 'https://fresh.olttefood.com/tteokguk26',
        permanent: false,
      },
      /*
        사장님용 화면 두 개 (2026-09-22). 사장님이 처음 말한 주소가
        olttefood.com/operation 이었다.

        ⛔ `/admin` 은 **절대 여기 넣지 않는다.** 이 앱에 이미 전골 주문 관리화면이
           `src/app/admin/` 로 있어서, 넣으면 그 화면이 통째로 막힌다.
           그래서 카운터는 `/counter` 라는 다른 이름으로 연다.
        ※ 이동만 시키는 것이고 로그인은 그대로다 — 저쪽은 직원 PIN 세션을 받는다.
      */
      {
        source: '/operation',
        destination: 'https://fresh.olttefood.com/operation',
        permanent: false,
      },
      {
        source: '/counter',
        destination: 'https://fresh.olttefood.com/admin',
        permanent: false,
      },
    ]
  },

  async rewrites() {
    return [
      {
        source: '/bookkeeping',
        destination: 'https://oltte-bookkeeping.vercel.app',
      },
      {
        source: '/bookkeeping/:path*',
        destination: 'https://oltte-bookkeeping.vercel.app/:path*',
      },
    ]
  },
};

export default nextConfig;
