const API_VERSION = "v25.0";

export type FacebookImageUploadParams = {
  accessToken: string;
  pageId: string;
  imageUrl: string;
  caption?: string | null;
};

export async function uploadImageToFacebook(
  params: FacebookImageUploadParams
): Promise<string> {
  const { accessToken, pageId, imageUrl, caption } = params;

  const url = new URL(`https://graph.facebook.com/${API_VERSION}/${pageId}/photos`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("url", imageUrl);
  if (caption) {
    url.searchParams.set("message", caption.slice(0, 5000));
  }

  const res = await fetch(url.toString(), { method: "POST" });
  const data = (await res.json()) as {
    id?: string;
    post_id?: string;
    error?: { message: string; code?: number };
  };

  if (data.error || !data.id) {
    throw new Error(data.error?.message ?? "Facebook resim yukleme hatasi");
  }

  return `https://www.facebook.com/photo/?fbid=${data.id}`;
}
