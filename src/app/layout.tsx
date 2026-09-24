import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/layout/PwaRegister";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | ClubOS — Tinkers Hub",
    default: "ClubOS — Tinkers Hub Management Platform",
  },
  description: "Institutional management and operations platform for Tinkers Hub.",
  applicationName: "ClubOS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClubOS",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#153328",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetBrainsMono.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-background text-on-background">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
