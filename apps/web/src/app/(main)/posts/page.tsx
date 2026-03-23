"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchPosts, publishPost, type Post } from "@/lib/api";
import { useApiToken } from "@/hooks/useApiToken";

function DefaultPlaceholder({ type }: { type: "video" | "image" }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200/80 text-slate-400">
      {type === "video" ? (
        <svg className="w-10 h-10 mb-1.5 opacity-60" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 4l-8 4-8-4v12l8 4 8-4V4zm-8 12V8l6 3-6 5z" />
        </svg>
      ) : (
        <svg className="w-10 h-10 mb-1.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )}
      <span className="text-[11px] font-medium tracking-wide uppercase">{type === "video" ? "Video" : "Resim"}</span>
    </div>
  );
}

function MediaThumbnail({ post }: { post: Post }) {
  const url = post.mediaUrls?.[0] ?? post.videoUrl;
  const [error, setError] = useState(false);

  if (!url) return <DefaultPlaceholder type={post.mediaType} />;
  if (error) return <DefaultPlaceholder type={post.mediaType} />;

  if (post.mediaType === "video") {
    return (
      <video src={url} className="w-full h-full object-cover" muted onError={() => setError(true)} />
    );
  }
  return (
    <img src={url} alt="" className="w-full h-full object-cover" onError={() => setError(true)} />
  );
}

export default function PostsPage() {
  const token = useApiToken();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "draft" | "scheduled" | "published">("all");
  const [search, setSearch] = useState("");
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

  useEffect(() => {
    const hasPending = posts.some((p) => p.targets?.some((t) => t.status === "pending"));
    if (!hasPending || !token) return;
    const interval = setInterval(() => fetchPosts(token).then(setPosts).catch(() => {}), 5000);
    return () => clearInterval(interval);
  }, [posts, token]);

  const filtered = posts.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Posts</h1>
          <p className="text-slate-500 text-sm mt-1">Paylaşımlarınızı yönetin</p>
        </div>
        <Link
          href="/posts/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow"
        >
          <span>+</span> Yeni Post
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Post ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-shadow"
          />
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {(["all", "draft", "scheduled", "published"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f === "all" ? "Tümü" : f === "published" ? "Yayında" : f === "scheduled" ? "Zamanlanmış" : "Taslak"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">Post bulunamadı</p>
          <p className="text-slate-400 text-sm mt-1">İlk paylaşımınızı oluşturarak başlayın</p>
          <Link
            href="/posts/create"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 text-slate-900 font-medium hover:bg-slate-50 rounded-xl transition-colors"
          >
            Yeni post oluştur
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-200"
            >
              <div className="aspect-square bg-slate-50 overflow-hidden rounded-t-2xl">
                <MediaThumbnail post={p} />
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-900 truncate text-sm">{p.title}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-lg ${
                      p.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : p.status === "scheduled"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {p.status === "published" ? "Yayında" : p.status === "scheduled" ? "Zamanlanmış" : "Taslak"}
                  </span>
                  {p.mediaType === "image" && p.mediaUrls?.length > 1 && (
                    <span className="text-[11px] text-slate-400 font-medium">· Carousel</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-3">
                  {p.targets.map((t) => (
                    <span
                      key={t.id}
                      className={`text-[11px] font-medium capitalize ${
                        t.status === "failed" ? "text-rose-600" : "text-slate-400"
                      }`}
                    >
                      {t.platform}
                    </span>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 truncate min-w-0">
                    {p.scheduledAt
                      ? new Date(p.scheduledAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
                      : new Date(p.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  {p.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => handlePublish(p.id)}
                      disabled={publishingId === p.id}
                      className="text-[11px] font-semibold px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 shrink-0 transition-colors"
                    >
                      {publishingId === p.id ? "…" : "Yayınla"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
