import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALL-CRM — Plataforma Inteligente de Fidelización & Retención",
  description: "Plataforma multi-tenant de fidelización, mensajería y retención para gimnasios y centros de fitness.",
  icons: {
    icon: [
      { url: "/branding/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/branding/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/branding/app_icon_64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [
      { url: "/branding/app_icon_128.png", sizes: "128x128", type: "image/png" },
    ],
    shortcut: "/branding/favicon-32x32.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/branding/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/branding/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/branding/app_icon_128.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--bg-app,#03080F)] text-white`}
      >
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
