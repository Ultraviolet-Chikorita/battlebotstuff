import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const metadataBase = host ? new URL(`${protocol}://${host}`) : undefined;
  return {
    metadataBase,
    title: {
      default: "Arena Odds — BattleBots Prediction Market",
      template: "%s · Arena Odds",
    },
    description:
      "Trade virtual credits on BattleBots Pro League fight outcomes. Unofficial, play-money only.",
    openGraph: {
      title: "Arena Odds",
      description: "Call the fight before the sparks fly.",
      type: "website",
      images: metadataBase ? [{ url: "/og.png", width: 1536, height: 1024 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: "Arena Odds",
      description: "Call the fight before the sparks fly.",
      images: metadataBase ? ["/og.png"] : [],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
