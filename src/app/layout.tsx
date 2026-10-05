import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hit-Roulette",
  description: "Hitster-stílusú zenei kitalálós játék",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body className="antialiased bg-black text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}