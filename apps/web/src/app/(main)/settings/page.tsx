"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value && String(value).length > 0 ? String(value) : "—";
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 break-all text-left sm:text-right">{display}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; organizationId?: string | null } | undefined;

  const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") : "";

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ayarlar</h1>
        <p className="text-slate-600 mt-1">Hesap özeti ve panel kısayolları.</p>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Oturum</h2>
          <p className="text-sm text-slate-500 mt-0.5">Giriş yaptığınız kullanıcı bilgileri</p>
        </div>
        <div className="px-5 py-2">
          <Row label="E-posta" value={user?.email} />
          <Row label="Ad" value={user?.name} />
          <Row label="Kullanıcı ID" value={user?.id} />
          <Row label="Organizasyon ID" value={user?.organizationId ?? undefined} />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Panel</h2>
          <p className="text-sm text-slate-500 mt-0.5">Bu tarayıcıda kullanılan API adresi</p>
        </div>
        <div className="px-5 py-4">
          <code className="text-sm bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 block break-all text-slate-800">
            {apiBase}
          </code>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-700 mb-3">Hızlı bağlantılar</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/accounts"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Sosyal hesaplar
          </Link>
          <Link
            href="/posts/create"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Yeni post
          </Link>
          <Link
            href="/scheduled"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Zamanlanmış
          </Link>
        </div>
      </section>
    </div>
  );
}
