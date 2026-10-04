import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SCHOOL } from "@/lib/school-config";
import { ToastProvider } from "@/components/ui/Toast";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SCHOOL.name} | ${SCHOOL.motto}`,
    template: `%s | ${SCHOOL.shortName}`,
  },
  description: `${SCHOOL.name} — ${SCHOOL.tagline}. Online admissions, results, parent & staff portals.`,
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
  openGraph: {
    title: SCHOOL.name,
    description: SCHOOL.tagline,
    siteName: SCHOOL.name,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-sans"><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
