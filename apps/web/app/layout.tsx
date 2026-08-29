import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "REV Bumi OS — REV BUMI NUSANTARA",
  description:
    "Sistem Operasional dan Management (Agregat Batu Split, Base Course, Pasir Cor, Abu Batu, Makadam) — REV BUMI NUSANTARA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}