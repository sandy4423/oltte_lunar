import type { Metadata, Viewport } from 'next';
import { JacheFlagsProvider } from '@/components/jache/JacheFlags';
import { isTestMode, paymentsEnabled } from '@/lib/jache/config.server';

export const metadata: Metadata = { title: '올때만두 포장 주문', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
// 스위치(환경변수)를 요청 때마다 읽는다
export const dynamic = 'force-dynamic';

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <JacheFlagsProvider value={{ pay: paymentsEnabled(), test: isTestMode() }}>{children}</JacheFlagsProvider>;
}
