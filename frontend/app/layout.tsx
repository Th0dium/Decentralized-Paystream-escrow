import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paystream - Salary Streaming & Escrow",
  description:
    "Decentralized salary streaming and milestone-based escrow system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
