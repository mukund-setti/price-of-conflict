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

const faviconSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".85em" font-size="80" dominant-baseline="middle">⛽</text></svg>`
);

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
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
        {children}
      </body>
    </html>
  );
}
