import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const w95fa = localFont({
  src: "./fonts/w95fa.woff",
  variable: "--font-w95",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://isthatslop.com"),
  title: {
    template: "%s | IsThatSlop.com",
    default: "IsThatSlop.com - AI Content Database",
  },
  description:
    "A community database for rating AI-generated vs human-created content. Rate sources on a 5-tier scale from Artisanal to Slop.",
  openGraph: {
    siteName: "IsThatSlop.com",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${w95fa.variable} antialiased`}
      >
        <div className="min-h-screen flex flex-col overflow-x-hidden">
          <Header />
          <main className="flex-1 min-w-0">{children}</main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
