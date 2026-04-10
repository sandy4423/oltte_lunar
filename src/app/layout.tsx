import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "올때만두 | 주말 만두전골 예약주문",
  description: "단톡방 전용 할인! 시원/얼큰 만두전골 예약하고 픽업하세요.",
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "올때만두 | 주말 만두전골 예약주문",
    description: "단톡방 전용 할인! 시원/얼큰 만두전골 예약하고 픽업하세요.",
    url: "https://www.olttefood.com",
    siteName: "올때만두",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "올때만두 만두전골",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "올때만두 | 주말 만두전골 예약주문",
    description: "단톡방 전용 할인! 시원/얼큰 만두전골 예약하고 픽업하세요.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
