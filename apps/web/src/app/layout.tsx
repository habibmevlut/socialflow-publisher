import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "../components/SessionProvider";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Socialflow Publisher",
  description: "Kurumsal sosyal medya dagitimi"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="antialiased overflow-x-hidden" suppressHydrationWarning>
        <SessionProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
