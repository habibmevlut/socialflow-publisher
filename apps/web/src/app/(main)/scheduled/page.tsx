"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchPosts, publishPost, type Post } from "@/lib/api";
import { useApiToken } from "@/hooks/useApiToken";

export default function ScheduledPage() {
  const token = useApiToken();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "timeline">("list");
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadPosts = useCallback(() => {
    if (!token) return;
    fetchPosts(token)
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (token) loadPosts();
  }, [token, loadPosts]);

  const scheduled = posts
    .filter((p) => p.status === "scheduled" && p.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());

  const handlePublish = async (postId: string) => {
    if (!token) return;
    setPublishingId(postId);
    try {
      await publishPost(postId, token);
      loadPosts();
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Zamanlanmış Gönderiler</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view === "list" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => setView("timeline")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view === "timeline" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            Zaman çizelgesi
          </button>
        </div>
      </div>

      {scheduled.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Zamanlanmış post yok.</p>
          <Link href="/posts/create" className="inline-block mt-4 text-slate-900 font-medium hover:underline">
            Yeni post oluştur →
          </Link>
        </div>
      ) : view === "timeline" ? (
        <div className="relative pl-6 border-l-2 border-slate-200">
          {scheduled.map((p, i) => (
            <div key={p.id} className="relative pb-8 last:pb-0">
              <div className="absolute -left-6 top-2 w-3 h-3 rounded-full bg-slate-400" />
              <div className="ml-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="font-medium text-slate-900">{p.title}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(p.scheduledAt!).toLocaleString("tr-TR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <div className="flex gap-2 mt-2 text-xs text-slate-600">
                  {p.targets.map((t) => (
                    <span key={t.id}>{t.platform}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {scheduled.map((p) => (
            <li key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="font-medium text-slate-900">{p.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {new Date(p.scheduledAt!).toLocaleString("tr-TR")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePublish(p.id)}
                disabled={publishingId === p.id}
                className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {publishingId === p.id ? "…" : "Şimdi Yayınla"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
