import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carpe Terra — Discover Hidden Roads",
  description:
    "A minimalist exploration platform that helps you discover hidden, low-footfall travel routes and scenic roads less traveled.",
  keywords: ["hidden routes", "travel", "exploration", "scenic roads", "off-road"],
  openGraph: {
    title: "Carpe Terra",
    description: "Discover the road less traveled.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.className} data-scroll-behavior="smooth">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
