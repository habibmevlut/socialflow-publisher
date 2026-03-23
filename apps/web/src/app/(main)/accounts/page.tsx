"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  fetchSocialAccounts,
  removeSocialAccount,
  getYouTubeConnectUrl,
  getInstagramConnectUrl,
  getTikTokConnectUrl,
  getFacebookConnectUrl,
} from "@/lib/api";
import { useApiToken } from "@/hooks/useApiToken";
import { useConfirm } from "@/contexts/ConfirmContext";

const PLATFORMS = [
  { id: "youtube", name: "YouTube", color: "bg-red-600", icon: "▶", connectUrl: getYouTubeConnectUrl },
  { id: "instagram", name: "Instagram", color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400", icon: "📷", connectUrl: getInstagramConnectUrl },
  { id: "tiktok", name: "TikTok", color: "bg-black", icon: "♪", connectUrl: getTikTokConnectUrl },
  { id: "facebook", name: "Facebook", color: "bg-blue-600", icon: "f", connectUrl: getFacebookConnectUrl },
];

export default function AccountsPage() {
  const { data: session } = useSession();
  const token = useApiToken();
  const [accounts, setAccounts] = useState<{ id: string; platform: string; displayName: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const organizationId = (session?.user as { organizationId?: string })?.organizationId ?? null;
  const { confirmWithAction } = useConfirm();

  const loadAccounts = useCallback(() => {
    if (!token) return Promise.resolve();
    return fetchSocialAccounts(token)
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (token) loadAccounts();
  }, [token, loadAccounts]);

  const handleDisconnect = (accountId: string) => {
    if (!token) return;
    confirmWithAction({
      title: "Hesabı Kaldır",
      message: "Bu hesabı kaldırmak istediğinize emin misiniz?",
      confirmLabel: "Kaldır",
      cancelLabel: "İptal",
      variant: "danger",
      onConfirm: async () => {
        try {
          await removeSocialAccount(accountId, token!);
          loadAccounts();
        } catch (e) {
          alert((e as Error).message);
          throw e;
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sosyal Hesaplar</h1>
        <p className="text-slate-600 mt-1">
          Token süresi dolduğunda (YouTube ~90 gün, Instagram ~60 gün, TikTok ~24 saat) tekrar bağlamanız gerekir.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {accounts.map((acc) => {
          const platform = PLATFORMS.find((p) => p.id === acc.platform);
          return (
            <div
              key={acc.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 ${platform?.color ?? "bg-slate-400"}`}
              >
                {platform?.icon ?? acc.platform[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate capitalize">{acc.platform}</p>
                <p className="text-sm text-slate-500 truncate">{acc.displayName ?? acc.id}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDisconnect(acc.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Bağlantıyı kaldır"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 mb-3">Hesap Bağla</h2>
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((p) => (
            <a
              key={p.id}
              href={organizationId ? p.connectUrl(organizationId) : "#"}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity ${p.color}`}
            >
              <span>{p.icon}</span>
              + {p.name} Bağla
            </a>
          ))}
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-600">Henüz bağlı hesap yok.</p>
          <p className="text-sm text-slate-500 mt-1">Yukarıdaki butonlardan bir platform bağlayın.</p>
        </div>
      )}
    </div>
  );
}
