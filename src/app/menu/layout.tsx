import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = { title: '올때만두 포장 주문', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
