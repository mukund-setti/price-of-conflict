import type { Metadata } from "next";
import { Libre_Franklin, Playfair_Display } from "next/font/google";
import "./globals.css";

const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-libre-franklin",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-playfair-display",
});

const title = "The Price of Conflict";
const description =
  "An interactive visual guide to how geopolitical events, supply chains, and policy shape American gas prices.";
const ogDescription =
  "35 years of gas price data, visualized. How geopolitical events shape what you pay at the pump.";
const ogTitle = "The Price of Conflict - How Gas Prices Respond to Global Events";

const siteUrl = "https://price-of-conflict.vercel.app";

const faviconSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".85em" font-size="80" dominant-baseline="middle">⛽</text></svg>`
);

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: ogTitle,
  description,
  url: siteUrl,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title: ogTitle,
    description: ogDescription,
    type: "article",
    url: siteUrl,
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "The Price of Conflict preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Price of Conflict",
    description: ogDescription,
    images: [`${siteUrl}/og.svg`],
  },
  icons: {
    icon: `data:image/svg+xml,${faviconSvg}`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${libreFranklin.variable} ${playfairDisplay.variable}`}
    >
      <body
        style={{
          background: "#0a0a0a",
          color: "#e8e6e3",
          margin: 0,
          padding: 0,
        }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
