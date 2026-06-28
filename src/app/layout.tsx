import type { Metadata, Viewport } from "next";
import "./globals.css";
import SWRegister from "@/components/swRegister";

export const metadata: Metadata = {
  title: "madsphere-qr-generator",
  description: "MadSphere Secure Ticket Pass Engine and Offline validation gateway.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MadSphere Pass"
  }
};

export const viewport: Viewport = {
  themeColor: "#060608",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
