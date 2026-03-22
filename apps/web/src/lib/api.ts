const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

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

export async function fetchPosts(token: string): Promise<Post[]> {
  const res = await fetch(`${API_URL}/v1/posts`, { headers: authHeaders(token) });
  if (!res.ok) {
    const authError = res.headers.get("X-Auth-Error");
    if (res.status === 401 && authError) console.warn("[API 401] Sebep:", authError);
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Postlar yuklenemedi");
  }
  return res.json();
}

export type CreatePostPayloadWithPublish = {
  title: string;
  videoUrl: string;
  publishNow?: boolean;
  scheduledAt?: string;
  targets: { platform: "instagram" | "youtube" | "tiktok" | "facebook"; accountId: string; caption?: string; enabled?: boolean }[];
};

export async function createPost(payload: CreatePostPayloadWithPublish, token: string): Promise<Post> {
  const res = await fetch(`${API_URL}/v1/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
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

export async function fetchSocialAccounts(token: string): Promise<SocialAccount[]> {
  const res = await fetch(`${API_URL}/v1/social-accounts`, { headers: authHeaders(token) });
  if (!res.ok) {
    const authError = res.headers.get("X-Auth-Error");
    if (res.status === 401 && authError) console.warn("[API 401] Sebep:", authError);
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Hesaplar yuklenemedi");
  }
  return res.json();
}

export async function removeSocialAccount(accountId: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/social-accounts/${accountId}`, {
    method: "DELETE",
    headers: authHeaders(token)
  });
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

export async function uploadMedia(file: File, token: string): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/v1/media/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Dosya yuklenemedi");
  }
  return res.json();
}

export async function publishPost(postId: string, token: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/v1/posts/${postId}/publish`, {
    method: "POST",
    headers: authHeaders(token)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Yayin basarisiz");
  }
  return res.json();
}
