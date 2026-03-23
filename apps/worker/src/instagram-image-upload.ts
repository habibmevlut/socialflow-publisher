const API_VERSION = "v25.0";

export type InstagramImageUploadParams = {
  accessToken: string;
  igUserId: string;
  imageUrl: string;
  caption?: string | null;
};

export async function uploadImageToInstagram(
  params: InstagramImageUploadParams
): Promise<string> {
  const { accessToken, igUserId, imageUrl, caption } = params;

  const createRes = await fetch(
    `https://graph.instagram.com/${API_VERSION}/${igUserId}/media?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "IMAGE",
        image_url: imageUrl,
        caption: (caption ?? "").slice(0, 2200)
      })
    }
  );

  const createData = (await createRes.json()) as { id?: string; error?: { message: string } };
  if (createData.error || !createData.id) {
    throw new Error(createData.error?.message ?? "Instagram resim container olusturulamadi");
  }

  const containerId = createData.id;
  const maxAttempts = 24; // 24 * 5 sec = 2 dakika
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `https://graph.instagram.com/${API_VERSION}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = (await statusRes.json()) as { status_code?: string };
    const statusCode = statusData.status_code;
    if (statusCode === "FINISHED" || statusCode === "PUBLISHED") break;
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      const extra = (statusData as { error_message?: string }).error_message ?? "";
      throw new Error(`Instagram isleme hatasi: ${statusCode}. ${extra}`);
    }
  }

  const publishRes = await fetch(
    `https://graph.instagram.com/${API_VERSION}/${igUserId}/media_publish?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId })
    }
  );

  const publishData = (await publishRes.json()) as {
    id?: string;
    error?: { message: string };
  };
  if (publishData.error || !publishData.id) {
    throw new Error(publishData.error?.message ?? "Instagram yayinlama hatasi");
  }

  return `https://www.instagram.com/p/${publishData.id}`;
}
