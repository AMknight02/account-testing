import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red Light District",
  description: "Answer questions together",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-bg text-white font-sans">{children}</body>
    </html>
  );
}
