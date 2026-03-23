"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { fetchPosts, createPost, publishPost, fetchSocialAccounts, removeSocialAccount, getYouTubeConnectUrl, getInstagramConnectUrl, getTikTokConnectUrl, getFacebookConnectUrl, uploadMedia, type Post } from "../lib/api";
import { useApiToken } from "../hooks/useApiToken";
import pageStyles from "./page.module.css";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = useApiToken();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<{ id: string; platform: string; displayName: string | null; status: string }[]>([]);
  const [mediaType, setMediaType] = useState<"video" | "image">("video");
  const [form, setForm] = useState({
    title: "",
    mediaUrls: [] as string[],
    videoUrlInput: "", // manuel URL (sadece video)
    publishNow: false,
    scheduledAt: ""
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Record<string, { enabled: boolean; caption: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [minScheduleDate, setMinScheduleDate] = useState("");

  useEffect(() => {
    setMinScheduleDate(new Date().toISOString().slice(0, 16));
  }, []);

  const loadPosts = useCallback(() => {
    if (!token) return;
    fetchPosts(token)
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);
  const loadAccounts = useCallback(() => {
    if (!token) return Promise.resolve();
    return fetchSocialAccounts(token).then(setAccounts).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (token) {
      loadPosts();
      loadAccounts();
    }
  }, [token, loadPosts, loadAccounts]);

  useEffect(() => {
    if (!token) return;
    const hasPending = posts.some((p) => p.targets?.some((t) => t.status === "pending"));
    if (!hasPending) return;
    const interval = setInterval(() => fetchPosts(token).then(setPosts).catch(() => {}), 5000);
    return () => clearInterval(interval);
  }, [posts, token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      const messages: Record<string, string> = {
        facebook_no_pages: "Facebook sayfasi bulunamadi. Bir Facebook Sayfasi olusturup yonetici olarak ekleyin.",
        facebook_token_failed: "Facebook token alinamadi. Tekrar deneyin.",
        tiktok_token_failed: "TikTok token alinamadi. Tekrar baglanmayi deneyin.",
        oauth_denied: "Yetkilendirme iptal edildi.",
        missing_params: "Eksik parametre. Tekrar baglanmayi deneyin.",
        org_not_found: "Organizasyon bulunamadi."
      };
      setError(messages[err] ?? err);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (params.get("youtube_connected") || params.get("instagram_connected") || params.get("tiktok_connected") || params.get("facebook_connected")) {
      loadAccounts().finally(() => window.history.replaceState({}, "", window.location.pathname));
    }
  }, [loadAccounts]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className={pageStyles.loadingContainer} role="status" aria-live="polite" aria-label="Yükleniyor">
        <div className={pageStyles.spinner} aria-hidden />
        <span className={pageStyles.text}>Yükleniyor...</span>
      </div>
    );
  }
  if (status === "unauthenticated") {
    return null;
  }

  const organizationId = (session?.user as { organizationId?: string })?.organizationId ?? null;
  const refreshPosts = () => token && fetchPosts(token).then(setPosts).catch(() => {});

  const handlePublish = async (postId: string) => {
    if (!token) return;
    setPublishingId(postId);
    try {
      await publishPost(postId, token);
      await refreshPosts();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Yayin hatasi");
    } finally {
      setPublishingId(null);
    }
  };

  const doUpload = async (file: File, index?: number) => {
    if (!token) return;
    setUploadError(null);
    if (mediaType === "video") {
      setUploading(true);
    } else {
      setUploadingIndex(index ?? 0);
    }
    try {
      const { url } = await uploadMedia(file, token);
      if (mediaType === "video") {
        setUploadedUrls([url]);
        setForm((f) => ({ ...f, mediaUrls: [url] }));
      } else {
        setUploadedUrls((prev) => {
          const next =
            index !== undefined
              ? [...prev.slice(0, index), url, ...prev.slice(index + 1)]
              : [...prev, url];
          setForm((f) => ({ ...f, mediaUrls: next }));
          return next;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Yukleme hatasi";
      setUploadError(msg);
    } finally {
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadError(null);
    if (mediaType === "video") {
      const file = files[0];
      if (!file) return;
      setUploadedFiles([file]);
      setUploadedUrls([]);
      setForm((f) => ({ ...f, mediaUrls: [] }));
      await doUpload(file);
    } else {
      const toUpload = files.slice(0, 10);
      setUploadedFiles(toUpload);
      setUploadedUrls([]);
      setForm((f) => ({ ...f, mediaUrls: [] }));
      for (let i = 0; i < toUpload.length; i++) {
        const f = toUpload[i];
        if (f) await doUpload(f, i);
      }
    }
    e.target.value = "";
  };

  const removeImageAtIndex = (index: number) => {
    setUploadedUrls((prev) => prev.filter((_, i) => i !== index));
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setForm((f) => ({ ...f, mediaUrls: f.mediaUrls.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setUploadError(null);
    const mediaUrls =
      mediaType === "video" && form.mediaUrls.length === 0 && form.videoUrlInput?.startsWith("http")
        ? [form.videoUrlInput]
        : form.mediaUrls;
    const imagePlatforms = ["instagram", "facebook"];
    const targets = accounts
      .filter((a) => selectedTargets[a.id]?.enabled)
      .filter((a) => (mediaType === "image" ? imagePlatforms.includes(a.platform) : true))
      .map((a) => ({
        platform: a.platform as "instagram" | "youtube" | "tiktok" | "facebook",
        accountId: a.id,
        caption: selectedTargets[a.id]?.caption || undefined,
        enabled: true
      }));
    if (targets.length === 0) {
      setSubmitError(
        mediaType === "image"
          ? "Resim icin Instagram veya Facebook secin (YouTube/TikTok resim desteklemiyor)"
          : "En az bir platform secin"
      );
      return;
    }
    if (uploading) {
      setSubmitError("Dosya yukleniyor, lutfen bekleyin");
      return;
    }
    if (mediaType === "video" && (mediaUrls.length !== 1 || !mediaUrls[0])) {
      setSubmitError("Video dosyasi yukleyin veya URL girin");
      return;
    }
    if (mediaType === "image" && (mediaUrls.length < 1 || mediaUrls.length > 10)) {
      setSubmitError("Resim icin 1-10 dosya yukleyin");
      return;
    }
    setSubmitting(true);
    const publishNow = form.publishNow && !form.scheduledAt;
    const scheduledAt = form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined;
    const payload = {
      title: form.title,
      mediaType,
      mediaUrls,
      publishNow,
      scheduledAt,
      targets
    };
    if (!token) {
      setSubmitError("Oturum gerekli");
      setSubmitting(false);
      return;
    }
    try {
      const created = await createPost(payload, token);
      setPosts((prev) => [created, ...prev]);
      setForm((f) => ({ ...f, title: "", mediaUrls: [], scheduledAt: "" }));
      setUploadedFiles([]);
      setUploadedUrls([]);
      setUploadError(null);
      setSelectedTargets({});
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Hata olustu");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 880, margin: "0 auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Socialflow Publisher</h1>
          <p style={{ margin: "4px 0 0", color: "#666", fontSize: 14 }}>Tek panelden YouTube, Instagram, TikTok ve Facebook paylasim yonetimi.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: "#666" }}>{session?.user?.email}</span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{ padding: "6px 12px", fontSize: 14, cursor: "pointer", border: "1px solid #ccc", borderRadius: 6, background: "#f5f5f5" }}
          >
            Cikis
          </button>
        </div>
      </div>

      <section style={{ marginTop: 32 }}>
        <h2>Bagli Hesaplar</h2>
        <p style={{ fontSize: 13, color: "#666", marginTop: -8, marginBottom: 12 }}>
          Token suresi doldugunda (YouTube ~90 gun, Instagram ~60 gun, TikTok ~24 saat) tekrar baglamaniz gerekir. Duplicate hesaplari × ile kaldirabilirsiniz.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => loadAccounts()}
            style={{
              padding: "6px 12px",
              background: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            Hesalari yenile
          </button>
          {accounts.filter((a) => a.platform === "youtube").map((a) => (
            <span
              key={a.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "#e8f5e9",
                borderRadius: 8,
                fontSize: 14
              }}
            >
              YouTube: {a.displayName ?? a.id}
              <button
                type="button"
                onClick={() => {
                  if (!token) return;
                  if (confirm("Bu hesabi kaldirmak istediginize emin misiniz?")) {
                    removeSocialAccount(a.id, token).then(loadAccounts).catch((e) => alert(e.message));
                  }
                }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.7 }}
                title="Hesabi kaldir"
              >
                ×
              </button>
            </span>
          ))}
          {accounts.filter((a) => a.platform === "instagram").map((a) => (
            <span
              key={a.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "#fce4ec",
                borderRadius: 8,
                fontSize: 14
              }}
            >
              Instagram: {a.displayName ?? a.id}
              <button
                type="button"
                onClick={() => {
                  if (!token) return;
                  if (confirm("Bu hesabi kaldirmak istediginize emin misiniz?")) {
                    removeSocialAccount(a.id, token).then(loadAccounts).catch((e) => alert(e.message));
                  }
                }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.7 }}
                title="Hesabi kaldir"
              >
                ×
              </button>
            </span>
          ))}
          {accounts.filter((a) => a.platform === "tiktok").map((a) => (
            <span
              key={a.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "#e3f2fd",
                borderRadius: 8,
                fontSize: 14
              }}
            >
              TikTok: {a.displayName ?? a.id}
              <button
                type="button"
                onClick={() => {
                  if (!token) return;
                  if (confirm("Bu hesabi kaldirmak istediginize emin misiniz?")) {
                    removeSocialAccount(a.id, token).then(loadAccounts).catch((e) => alert(e.message));
                  }
                }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.7 }}
                title="Hesabi kaldir"
              >
                ×
              </button>
            </span>
          ))}
          {accounts.filter((a) => a.platform === "facebook").map((a) => (
            <span
              key={a.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "#e8eaf6",
                borderRadius: 8,
                fontSize: 14
              }}
            >
              Facebook: {a.displayName ?? a.id}
              <button
                type="button"
                onClick={() => {
                  if (!token) return;
                  if (confirm("Bu hesabi kaldirmak istediginize emin misiniz?")) {
                    removeSocialAccount(a.id, token).then(loadAccounts).catch((e) => alert(e.message));
                  }
                }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.7 }}
                title="Hesabi kaldir"
              >
                ×
              </button>
            </span>
          ))}
          {accounts.length === 0 && (
            <span style={{ color: "#666", fontSize: 14 }}>Henuz bagli hesap yok.</span>
          )}
          <a
            href={organizationId ? getYouTubeConnectUrl(organizationId) : "#"}
            style={{
              padding: "8px 16px",
              background: "#c62828",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            + YouTube Bagla
          </a>
          <a
            href={organizationId ? getInstagramConnectUrl(organizationId) : "#"}
            style={{
              padding: "8px 16px",
              background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            + Instagram Bagla
          </a>
          <a
            href={organizationId ? getTikTokConnectUrl(organizationId) : "#"}
            style={{
              padding: "8px 16px",
              background: "#000",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            + TikTok Bagla
          </a>
          <a
            href={organizationId ? getFacebookConnectUrl(organizationId) : "#"}
            style={{
              padding: "8px 16px",
              background: "#1877f2",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            + Facebook Bagla
          </a>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Yeni Post Olustur</h2>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 480,
            padding: 16,
            border: "1px solid #ccc",
            borderRadius: 8
          }}
        >
          <input
            placeholder="Baslik"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            minLength={2}
            maxLength={120}
            style={{ padding: 8 }}
          />
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>Medya tipi</label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="mediaType"
                  checked={mediaType === "video"}
                  onChange={() => {
                    setMediaType("video");
                    setForm((f) => ({ ...f, mediaUrls: [], videoUrlInput: f.videoUrlInput }));
                    setUploadedFiles([]);
                    setUploadedUrls([]);
                  }}
                />
                Video
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="mediaType"
                  checked={mediaType === "image"}
                  onChange={() => {
                    setMediaType("image");
                    setForm((f) => ({ ...f, mediaUrls: [], videoUrlInput: "" }));
                    setUploadedFiles([]);
                    setUploadedUrls([]);
                  }}
                />
                Resim (tek veya carousel 2-10)
              </label>
            </div>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
              {mediaType === "video" ? "Video: " : "Resim(ler): "}dosya yukle
              {mediaType === "video" && " veya URL gir"}
            </label>
            <input
              type="file"
              accept={mediaType === "video" ? "video/mp4,video/quicktime,video/webm,video/x-msvideo" : "image/jpeg,image/png,image/webp"}
              multiple={mediaType === "image"}
              onChange={handleFileChange}
              disabled={uploading}
              style={{ padding: 8, marginBottom: 8 }}
            />
            {uploading && <span style={{ fontSize: 13, color: "#666" }}>Yukleniyor...</span>}
            {mediaType === "image" && uploadedUrls.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {uploadedUrls.map((url, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid #ddd"
                    }}
                  >
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => removeImageAtIndex(i)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 14
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {mediaType === "video" && uploadedUrls[0] && (
              <span style={{ fontSize: 13, color: "green", display: "block", marginTop: 4 }}>Yuklendi</span>
            )}
            {uploadError && (
              <span style={{ fontSize: 13, color: "#c62828", display: "block", marginTop: 4 }}>
                {uploadError}{" "}
                {uploadedFiles[0] && mediaType === "video" && (
                  <button
                    type="button"
                    onClick={() => {
                      const f = uploadedFiles[0];
                      if (f) doUpload(f);
                    }}
                    style={{ marginLeft: 8, cursor: "pointer" }}
                  >
                    Tekrar yukle
                  </button>
                )}
              </span>
            )}
            {mediaType === "video" && (
              <input
                type="url"
                placeholder="veya Video URL (ornek: https://example.com/video.mp4)"
                value={form.videoUrlInput}
                onChange={(e) => {
                  setForm((f) => ({ ...f, videoUrlInput: e.target.value }));
                  if (e.target.value) {
                    setUploadedFiles([]);
                    setUploadedUrls([]);
                    setForm((f) => ({ ...f, mediaUrls: [] }));
                  }
                }}
                style={{ padding: 8, marginTop: 8, width: "100%", boxSizing: "border-box" }}
              />
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Nerede paylasilsin?</strong>
            {mediaType === "image" && (
              <p style={{ fontSize: 13, color: "#1976d2", marginTop: 4 }}>
                Resim/carousel sadece Instagram ve Facebook destekler.
              </p>
            )}
            {accounts.length === 0 ? (
              <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>
                Bagli hesap yok. Yukaridan YouTube, Instagram, TikTok veya Facebook baglayin.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                {accounts
                  .filter((acc) => (mediaType === "image" ? ["instagram", "facebook"].includes(acc.platform) : true))
                  .map((acc) => (
                  <div
                    key={acc.id}
                    style={{
                      padding: 12,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      background: selectedTargets[acc.id]?.enabled ? "#f0f9ff" : "#fafafa"
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedTargets[acc.id]?.enabled ?? false}
                        onChange={(e) =>
                          setSelectedTargets((s) => ({
                            ...s,
                            [acc.id]: {
                              enabled: e.target.checked,
                              caption: s[acc.id]?.caption ?? ""
                            }
                          }))
                        }
                      />
                      <span style={{ fontWeight: 500 }}>
                        {acc.platform}: {acc.displayName ?? acc.id}
                      </span>
                    </label>
                    {selectedTargets[acc.id]?.enabled && (
                      <input
                        placeholder={`${acc.platform} icin caption (opsiyonel)`}
                        value={selectedTargets[acc.id]?.caption ?? ""}
                        onChange={(e) =>
                          setSelectedTargets((s) => ({
                            ...s,
                            [acc.id]: { ...s[acc.id], enabled: true, caption: e.target.value }
                          }))
                        }
                        style={{ marginTop: 8, padding: 8, width: "100%", boxSizing: "border-box" }}
                        maxLength={2200}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={form.publishNow && !form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, publishNow: e.target.checked, scheduledAt: e.target.checked ? "" : f.scheduledAt }))}
              />
              Simdi yayinla
            </label>
            <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>veya Tarih/saatte yayinla</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value, publishNow: e.target.value ? false : f.publishNow }))}
              min={minScheduleDate}
              style={{ padding: 8, width: "100%", boxSizing: "border-box" }}
            />
          </div>
          {submitError && <span style={{ color: "red", fontSize: 14 }}>{submitError}</span>}
          <button type="submit" disabled={submitting} style={{ padding: 10, cursor: "pointer" }}>
            {submitting ? "Gonderiliyor..." : "Post Olustur"}
          </button>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Postlar</h2>
        {loading && <p>Yukleniyor...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p style={{ color: "#666" }}>Henuz post yok. Yukaridan bir tane olustur.</p>
        )}
        {!loading && !error && posts.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {posts.map((p) => (
              <li
                key={p.id}
                style={{
                  padding: 16,
                  marginBottom: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  background: "#f9f9f9"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span>
                    <strong>{p.title}</strong> — {p.status}
                    {p.scheduledAt && (
                      <span style={{ marginLeft: 8, color: "#1976d2", fontSize: 13 }}>
                        ({new Date(p.scheduledAt).toLocaleString("tr-TR")})
                      </span>
                    )}
                  </span>
                  {p.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => handlePublish(p.id)}
                      disabled={publishingId === p.id}
                      style={{ padding: "4px 12px", cursor: "pointer", fontSize: 13 }}
                    >
                      {publishingId === p.id ? "Yayinlaniyor..." : "Yayinla"}
                    </button>
                  )}
                </div>
                <br />
                <small style={{ display: "block", marginBottom: 8 }}>
                  {p.mediaType === "image" && p.mediaUrls?.length > 1
                    ? `Carousel (${p.mediaUrls.length} resim)`
                    : p.mediaUrls?.[0] ?? p.videoUrl ?? "-"}
                </small>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                  {p.targets.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        padding: "4px 8px",
                        background: t.status === "published" ? "#e8f5e9" : t.status === "failed" ? "#ffebee" : "#f5f5f5",
                        borderRadius: 4
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>
                        {t.platform}: {t.status === "published" ? "✓ Yayinlandi" : t.status === "failed" ? "✗ Hata" : "⏳ Bekliyor"}
                      </span>
                      {t.status === "failed" && t.errorMessage && (
                        <span style={{ color: "#c62828", fontSize: 12 }} title={t.errorMessage}>
                          {t.errorMessage.length > 60 ? t.errorMessage.slice(0, 60) + "..." : t.errorMessage}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <small style={{ color: "#666" }}>{new Date(p.createdAt).toLocaleString("tr-TR")}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid #eee", fontSize: 13, color: "#666" }}>
        <a href="/terms" style={{ marginRight: 16, color: "#0066cc" }}>
          Kullanim Sartlari
        </a>
        <a href="/privacy" style={{ color: "#0066cc" }}>
          Gizlilik Politikasi
        </a>
      </footer>
    </main>
  );
}
