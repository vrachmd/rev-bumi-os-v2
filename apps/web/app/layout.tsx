import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REV Bumi OS",
  description:
    "Sistem Operasi Rantai Pasok Material Agregat PT REV Bumi Nusantara Perkasa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}