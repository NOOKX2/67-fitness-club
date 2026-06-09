import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { BRAND_NAME, LOGO_FULL } from "@/lib/brand";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: {
    default: BRAND_NAME,
    template: `%s — ${BRAND_NAME}`,
  },
  description: "Elite performance training — strength, flexibility, and clarity.",
  icons: {
    icon: LOGO_FULL,
    apple: LOGO_FULL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
