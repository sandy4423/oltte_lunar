import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "올때만두 | 설날 떡국용 만두 사전주문",
  description: "설 만두는 제가 빚을게요. 문앞까지 직접 배달합니다.",
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "올때만두 | 설날 떡국용 만두 사전주문",
    description: "설 만두는 제가 빚을게요. 문앞까지 직접 배달합니다.",
    url: "https://www.olttefood.com",
    siteName: "올때만두",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "올때만두 매장",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "올때만두 | 설날 떡국용 만두 사전주문",
    description: "설 만두는 제가 빚을게요. 문앞까지 직접 배달합니다.",
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
