import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Questions App",
  description: "Answer questions together",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
