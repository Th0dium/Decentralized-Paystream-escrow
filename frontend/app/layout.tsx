"use client";

import "./globals.css";
import { AppWalletProvider } from "@/lib/wallet-provider";
import { DarkModeProvider } from "@/lib/dark-mode-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DarkModeProvider>
          <AppWalletProvider>
            {children}
          </AppWalletProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}
