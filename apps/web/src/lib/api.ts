const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type PostTarget = {
  id: string;
  platform: string;
  accountId: string;
  caption?: string | null;
  enabled: boolean;
  status: string;
  errorMessage?: string | null;
};

export type Post = {
  id: string;
  organizationId: string;
  title: string;
  videoUrl: string;
  status: string;
  scheduledAt: string | null;
  targets: PostTarget[];
  createdAt: string;
};

export async function fetchPosts(organizationId?: string): Promise<Post[]> {
  const url = organizationId
    ? `${API_URL}/v1/posts?organizationId=${encodeURIComponent(organizationId)}`
    : `${API_URL}/v1/posts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Postlar yuklenemedi");
  return res.json();
}

export type CreatePostPayload = {
  organizationId: string;
  title: string;
  videoUrl: string;
  targets: { platform: "instagram" | "youtube" | "tiktok" | "facebook"; accountId: string; caption?: string; enabled?: boolean }[];
};

export type CreatePostPayloadWithPublish = CreatePostPayload & {
  publishNow?: boolean;
  scheduledAt?: string;
};

export async function createPost(payload: CreatePostPayload | CreatePostPayloadWithPublish): Promise<Post> {
  const res = await fetch(`${API_URL}/v1/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Post olusturulamadi");
  }
  return res.json();
}

export type SocialAccount = {
  id: string;
  platform: string;
  displayName: string | null;
  externalAccountId: string | null;
  status: string;
};

export async function fetchSocialAccounts(organizationId: string): Promise<SocialAccount[]> {
  const res = await fetch(`${API_URL}/v1/social-accounts?organizationId=${encodeURIComponent(organizationId)}`);
  if (!res.ok) throw new Error("Hesaplar yuklenemedi");
  return res.json();
}

export async function removeSocialAccount(accountId: string, organizationId: string): Promise<void> {
  const res = await fetch(
    `${API_URL}/v1/social-accounts/${accountId}?organizationId=${encodeURIComponent(organizationId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Hesap kaldirilamadi");
  }
}

export function getYouTubeConnectUrl(organizationId: string): string {
  return `${API_URL.replace(/\/$/, "")}/auth/youtube/connect?organizationId=${encodeURIComponent(organizationId)}`;
}

export function getInstagramConnectUrl(organizationId: string): string {
  return `${API_URL.replace(/\/$/, "")}/auth/instagram/connect?organizationId=${encodeURIComponent(organizationId)}`;
}

export function getTikTokConnectUrl(organizationId: string): string {
  return `${API_URL.replace(/\/$/, "")}/auth/tiktok/connect?organizationId=${encodeURIComponent(organizationId)}`;
}

export function getFacebookConnectUrl(organizationId: string): string {
  return `${API_URL.replace(/\/$/, "")}/auth/facebook/connect?organizationId=${encodeURIComponent(organizationId)}`;
}

export async function uploadMedia(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/v1/media/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Dosya yuklenemedi");
  }
  return res.json();
}

export async function publishPost(postId: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/v1/posts/${postId}/publish`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Yayin basarisiz");
  }
  return res.json();
}
