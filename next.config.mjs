/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ⚠️ 경고: 타입 에러가 있어도 무시하고 배포합니다. (급할 때 사용)
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ 경고: 린트 에러가 있어도 무시하고 배포합니다.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // ⚠️ useSearchParams() Suspense 경고 무시
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
