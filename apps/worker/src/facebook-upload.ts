const API_VERSION = "v21.0";

export type FacebookUploadParams = {
  accessToken: string;
  pageId: string;
  videoUrl: string;
  caption?: string | null;
};

export async function uploadVideoToFacebook(params: FacebookUploadParams): Promise<string> {
  const { accessToken, pageId, videoUrl, caption } = params;

  const url = new URL(`https://graph.facebook.com/${API_VERSION}/${pageId}/videos`);
  url.searchParams.set("access_token", accessToken);

  const formData = new URLSearchParams();
  formData.set("file_url", videoUrl);
  if (caption) {
    formData.set("description", caption.slice(0, 5000));
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString()
  });

  const data = (await res.json()) as {
    id?: string;
    post_id?: string;
    error?: { message: string; code?: number };
  };

  if (data.error || !data.id) {
    throw new Error(data.error?.message ?? "Facebook video yukleme hatasi");
  }

  return `https://www.facebook.com/watch/?v=${data.id}`;
}
