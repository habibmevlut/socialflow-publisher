const API_VERSION = "v25.0";

export type FacebookCarouselUploadParams = {
  accessToken: string;
  pageId: string;
  imageUrls: string[]; // 2-10
  caption?: string | null;
};

export async function uploadCarouselToFacebook(
  params: FacebookCarouselUploadParams
): Promise<string> {
  const { accessToken, pageId, imageUrls, caption } = params;
  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error("Carousel 2-10 resim icermeli");
  }

  const childAttachments = imageUrls.map((url) => ({
    link: url,
    picture: url
  }));

  const searchParams = new URLSearchParams();
  searchParams.set("access_token", accessToken);
  searchParams.set("child_attachments", JSON.stringify(childAttachments));
  if (caption) searchParams.set("message", caption.slice(0, 5000));

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${pageId}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: searchParams.toString()
    }
  );
  const data = (await res.json()) as {
    id?: string;
    post_id?: string;
    error?: { message: string; code?: number };
  };

  if (data.error) {
    throw new Error(data.error.message ?? "Facebook carousel yukleme hatasi");
  }
  const postId = data.id ?? data.post_id;
  if (!postId) {
    throw new Error("Facebook post ID alinamadi");
  }
  return `https://www.facebook.com/${postId.replace("_", "/posts/")}`;
}
