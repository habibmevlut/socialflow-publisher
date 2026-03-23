"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/");
    }
  }, [status, router]);

  useEffect(() => {
    const connected = ["youtube_connected", "instagram_connected", "tiktok_connected", "facebook_connected"].some(
      (k) => searchParams.get(k)
    );
    if (connected) {
      router.replace("/accounts");
    }
  }, [searchParams, router]);

  const errorParam = searchParams.get("error");
  const errorMessages: Record<string, string> = {
    facebook_no_pages: "Facebook sayfası bulunamadı.",
    facebook_token_failed: "Facebook token alınamadı.",
    tiktok_token_failed: "TikTok token alınamadı.",
    oauth_denied: "Yetkilendirme iptal edildi.",
    missing_params: "Eksik parametre.",
    org_not_found: "Organizasyon bulunamadı.",
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" role="status" aria-live="polite">
        <div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sticky top-0 z-20 h-14 px-4 sm:px-6 flex items-center justify-between bg-white/80 backdrop-blur border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -m-2 text-slate-600 hover:text-slate-900"
            aria-label="Menüyü aç"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <span className="text-xs sm:text-sm text-slate-600 truncate max-w-[120px] sm:max-w-none">
              {session?.user?.email}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shrink-0"
            >
              Çıkış
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
        {errorParam && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center justify-between">
            <span>{errorMessages[errorParam] ?? errorParam}</span>
            <button
              type="button"
              onClick={() => router.replace(window.location.pathname)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </main>
      </div>
    </div>
  );
}
