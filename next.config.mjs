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
};

export default nextConfig;
