import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "../components/SessionProvider";

export const metadata: Metadata = {
  title: "Socialflow Publisher",
  description: "Kurumsal sosyal medya dagitimi"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body style={{ fontFamily: "Arial, sans-serif", margin: 0 }} suppressHydrationWarning>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
