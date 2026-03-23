"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchPosts, fetchSocialAccounts, publishPost, type Post } from "@/lib/api";
import { useApiToken } from "@/hooks/useApiToken";

export default function DashboardPage() {
  const token = useApiToken();
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; platform: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    if (!token) return;
    Promise.all([fetchPosts(token), fetchSocialAccounts(token)])
      .then(([p, a]) => {
        setPosts(p);
        setAccounts(a);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const published = posts.filter((p) => p.status === "published");
  const scheduled = posts.filter((p) => p.status === "scheduled" && p.scheduledAt);
  const drafts = posts.filter((p) => p.status === "draft");
  const recent = posts.slice(0, 5);

  const platformCounts = accounts.reduce(
    (acc, a) => {
      acc[a.platform] = (acc[a.platform] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handlePublish = async (postId: string) => {
    if (!token) return;
    setPublishingId(postId);
    try {
      await publishPost(postId, token);
      loadData();
    } finally {
      setPublishingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Sosyal medya paylaşımlarınızın özeti</p>
        </div>
        <Link
          href="/posts/create"
          className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shrink-0"
        >
          Yeni Post Oluştur
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Yayınlanan</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{published.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Zamanlanmış</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{scheduled.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Taslak</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{drafts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Bağlı Hesaplar</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{accounts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Platform Bazlı</h2>
          <div className="flex flex-wrap gap-3">
            {["youtube", "instagram", "tiktok", "facebook"].map((p) => (
              <span
                key={p}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium capitalize"
              >
                {p}: {platformCounts[p] ?? 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Son Gönderiler</h2>
          <Link href="/posts" className="text-sm text-slate-600 hover:text-slate-900">
            Tümünü Gör →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-slate-500 text-sm">Henüz post yok.</p>
        ) : (
          <ul className="space-y-3">
            {recent.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-slate-900">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.status} · {new Date(p.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                {p.status === "draft" && (
                  <button
                    type="button"
                    onClick={() => handlePublish(p.id)}
                    disabled={publishingId === p.id}
                    className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                  >
                    {publishingId === p.id ? "…" : "Yayınla"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
