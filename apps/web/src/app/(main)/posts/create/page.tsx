"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createPost,
  uploadMedia,
  fetchSocialAccounts,
  getYouTubeConnectUrl,
  getInstagramConnectUrl,
  getTikTokConnectUrl,
  getFacebookConnectUrl,
  type Post,
  type SocialAccount,
} from "@/lib/api";
import { useApiToken } from "@/hooks/useApiToken";

const IMAGE_PLATFORMS = ["instagram", "facebook"];

export default function CreatePostPage() {
  const router = useRouter();
  const token = useApiToken();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [mediaType, setMediaType] = useState<"video" | "image">("video");
  const [form, setForm] = useState({
    title: "",
    mediaUrls: [] as string[],
    videoUrlInput: "",
    publishNow: false,
    scheduledAt: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Record<string, { enabled: boolean; caption: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [minScheduleDate, setMinScheduleDate] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setMinScheduleDate(new Date().toISOString().slice(0, 16));
  }, []);

  const loadAccounts = useCallback(() => {
    if (!token) return Promise.resolve();
    return fetchSocialAccounts(token).then(setAccounts).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (token) loadAccounts();
  }, [token, loadAccounts]);

  const doUpload = async (file: File, index?: number) => {
    if (!token) return;
    setUploadError(null);
    mediaType === "video" ? setUploading(true) : setUploadingIndex(index ?? 0);
    try {
      const { url } = await uploadMedia(file, token);
      if (mediaType === "video") {
        setUploadedUrls([url]);
        setForm((f) => ({ ...f, mediaUrls: [url] }));
      } else {
        setUploadedUrls((prev) => {
          const next = index !== undefined ? [...prev.slice(0, index), url, ...prev.slice(index + 1)] : [...prev, url];
          setForm((f) => ({ ...f, mediaUrls: next }));
          return next;
        });
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    const file = files[0];
    if (mediaType === "video") {
      if (!file || !file.type.startsWith("video/")) return;
      setUploadedFiles([file]);
      setUploadedUrls([]);
      setForm((f) => ({ ...f, mediaUrls: [] }));
      await doUpload(file);
    } else {
      const images = files.filter((f) => f.type.startsWith("image/")).slice(0, 10);
      if (!images.length) return;
      setUploadedFiles(images);
      setUploadedUrls([]);
      setForm((f) => ({ ...f, mediaUrls: [] }));
      for (let i = 0; i < images.length; i++) {
        const f = images[i];
        if (f) await doUpload(f, i);
      }
    }
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
      mediaType === "video" && form.mediaUrls.length === 0 && form.videoUrlInput?.startsWith("http") ? [form.videoUrlInput] : form.mediaUrls;
    const targets = accounts
      .filter((a) => selectedTargets[a.id]?.enabled)
      .filter((a) => (mediaType === "image" ? IMAGE_PLATFORMS.includes(a.platform) : true))
      .map((a) => ({
        platform: a.platform as "instagram" | "youtube" | "tiktok" | "facebook",
        accountId: a.id,
        caption: selectedTargets[a.id]?.caption || undefined,
        enabled: true,
      }));

    if (!targets.length) {
      setSubmitError(mediaType === "image" ? "Resim için Instagram veya Facebook seçin." : "En az bir platform seçin.");
      return;
    }
    if (uploading) {
      setSubmitError("Dosya yükleniyor.");
      return;
    }
    if (mediaType === "video" && (mediaUrls.length !== 1 || !mediaUrls[0])) {
      setSubmitError("Video dosyası yükleyin veya URL girin.");
      return;
    }
    if (mediaType === "image" && (mediaUrls.length < 1 || mediaUrls.length > 10)) {
      setSubmitError("Resim için 1–10 dosya yükleyin.");
      return;
    }

    setSubmitting(true);
    const publishNow = form.publishNow && !form.scheduledAt;
    const scheduledAt = form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined;
    try {
      await createPost({ title: form.title, mediaType, mediaUrls, publishNow, scheduledAt, targets }, token!);
      router.push("/posts");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Hata");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter((a) => (mediaType === "image" ? IMAGE_PLATFORMS.includes(a.platform) : true));

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/posts" className="text-slate-500 hover:text-slate-900">
          ← Geri
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Yeni Post Oluştur</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Başlık</label>
          <input
            placeholder="Post başlığı"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            minLength={2}
            maxLength={120}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Medya Tipi</label>
          <div className="flex gap-3 p-1 bg-slate-100 rounded-xl">
            {[
              { value: "video" as const, label: "Video" },
              { value: "image" as const, label: "Resim / Carousel" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setMediaType(opt.value);
                  setForm((f) => ({ ...f, mediaUrls: [], videoUrlInput: opt.value === "video" ? f.videoUrlInput : "" }));
                  setUploadedFiles([]);
                  setUploadedUrls([]);
                }}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mediaType === opt.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {mediaType === "video" ? "Video" : "Resim(ler)"}
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 sm:p-8 text-center transition-colors ${
              isDragging ? "border-slate-400 bg-slate-50" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              type="file"
              accept={mediaType === "video" ? "video/mp4,video/quicktime,video/webm,video/x-msvideo" : "image/jpeg,image/png,image/webp"}
              multiple={mediaType === "image"}
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <span className="text-4xl block mb-2">📁</span>
              <span className="text-slate-600">
                Dosya sürükleyip bırakın veya tıklayın
              </span>
            </label>
            {mediaType === "video" && (
              <input
                type="url"
                placeholder="veya Video URL"
                value={form.videoUrlInput}
                onChange={(e) => {
                  setForm((f) => ({ ...f, videoUrlInput: e.target.value }));
                  if (e.target.value) {
                    setUploadedFiles([]);
                    setUploadedUrls([]);
                    setForm((f) => ({ ...f, mediaUrls: [] }));
                  }
                }}
                className="mt-4 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            )}
          </div>
          {uploading && <p className="text-sm text-slate-500 mt-2">Yükleniyor…</p>}
          {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
          {mediaType === "image" && uploadedUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {uploadedUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImageAtIndex(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-sm flex items-center justify-center hover:bg-black/80"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Nerede paylaşılsın?</label>
          {mediaType === "image" && (
            <p className="text-xs text-slate-500 mb-2">Resim/carousel sadece Instagram ve Facebook destekler.</p>
          )}
          {filteredAccounts.length === 0 ? (
            <p className="text-sm text-slate-500">
              Bağlı hesap yok.{" "}
              <Link href="/accounts" className="text-slate-900 underline">
                Hesaplar
              </Link>
              sayfasından bağlayın.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredAccounts.map((acc) => {
                const checked = selectedTargets[acc.id]?.enabled ?? false;
                return (
                <div
                  key={acc.id}
                  className={`p-4 rounded-xl border transition-all ${
                    checked ? "border-slate-300 bg-slate-50/80" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="relative shrink-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedTargets((s) => ({
                            ...s,
                            [acc.id]: { enabled: e.target.checked, caption: s[acc.id]?.caption ?? "" },
                          }))
                        }
                        className="sr-only"
                      />
                      <span className={`block w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        checked ? "bg-slate-900 border-slate-900" : "border-slate-300 bg-white"
                      }`}>
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </span>
                    <span className="font-medium text-slate-900 capitalize">{acc.platform}: {acc.displayName ?? acc.id}</span>
                  </label>
                  {checked && (
                    <input
                      placeholder={`${acc.platform} için caption`}
                      value={selectedTargets[acc.id]?.caption ?? ""}
                      onChange={(e) =>
                        setSelectedTargets((s) => ({
                          ...s,
                          [acc.id]: { ...s[acc.id], enabled: true, caption: e.target.value },
                        }))
                      }
                      className="mt-3 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
                      maxLength={2200}
                    />
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center justify-between gap-4 cursor-pointer mb-4">
            <span className="text-sm font-medium text-slate-700">Şimdi yayınla</span>
            <span className="relative">
              <input
                type="checkbox"
                checked={form.publishNow && !form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, publishNow: e.target.checked, scheduledAt: e.target.checked ? "" : f.scheduledAt }))}
                className="sr-only"
              />
              <span className={`block w-11 h-6 rounded-full transition-colors ${
                form.publishNow && !form.scheduledAt ? "bg-slate-900" : "bg-slate-200"
              }`}>
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.publishNow && !form.scheduledAt ? "translate-x-5" : "translate-x-0"
                }`} />
              </span>
            </span>
          </label>
          <div>
            <label className="block text-sm text-slate-600 mb-2">veya Tarih / saat</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value, publishNow: e.target.value ? false : f.publishNow }))}
                min={minScheduleDate}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 bg-white appearance-none"
              />
            </div>
          </div>
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Gönderiliyor…" : "Post Oluştur"}
        </button>
      </form>
    </div>
  );
}
