import type { Metadata, Viewport } from 'next';
import BehaviorTracker from '@/components/behavior/BehaviorTracker';
import { JacheFlagsProvider } from '@/components/jache/JacheFlags';
import { isTestMode, paymentsEnabled } from '@/lib/jache/config.server';

// 단톡방에 링크를 붙였을 때 뜨는 미리보기 (사장님 11-19 「우리 자체 픽업 주문 앱이라고 인지 부하 없이」). 할인 문구는 넣지 않는다(기간이 지나면 틀림)
const OG_TITLE = '올때만두 픽업 주문';
const OG_DESC = '미리 주문하고 가게에서 바로 받아 가세요';
export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESC,
  robots: { index: false, follow: false },
  openGraph: { title: OG_TITLE, description: OG_DESC, url: 'https://www.olttefood.com/menu', siteName: '올때만두', locale: 'ko_KR', type: 'website', images: [{ url: 'https://www.olttefood.com/og-menu.jpg', width: 800, height: 800, alt: '올때만두 교자' }] },
  twitter: { card: 'summary_large_image', title: OG_TITLE, description: OG_DESC, images: ['https://www.olttefood.com/og-menu.jpg'] },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
// 스위치(환경변수)를 요청 때마다 읽는다
export const dynamic = 'force-dynamic';

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <JacheFlagsProvider value={{ pay: paymentsEnabled(), test: isTestMode() }}><BehaviorTracker />{children}</JacheFlagsProvider>;
}
