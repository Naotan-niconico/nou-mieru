import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "農みえる",
  description: "農家向け収支・経費管理Webアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
