const API_VERSION = "v25.0";

export type InstagramUploadParams = {
  accessToken: string;
  igUserId: string;
  videoUrl: string;
  caption?: string | null;
  mediaType?: "REELS" | "VIDEO";
};

export async function uploadVideoToInstagram(params: InstagramUploadParams): Promise<string> {
  const { accessToken, igUserId, videoUrl, caption, mediaType = "REELS" } = params;

  const createRes = await fetch(
    `https://graph.instagram.com/${API_VERSION}/${igUserId}/media?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: mediaType,
        video_url: videoUrl,
        caption: (caption ?? "").slice(0, 2200)
      })
    }
  );

  const createData = (await createRes.json()) as { id?: string; error?: { message: string } };
  if (createData.error || !createData.id) {
    throw new Error(createData.error?.message ?? "Instagram container olusturulamadi");
  }

  const containerId = createData.id;

  let statusCode: string | undefined;
  const maxAttempts = 36; // 36 * 5 sec = 3 dakika
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `https://graph.instagram.com/${API_VERSION}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = (await statusRes.json()) as { status_code?: string };
    statusCode = statusData.status_code;
    if (statusCode === "FINISHED" || statusCode === "PUBLISHED") {
      break;
    }
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      const extra = (statusData as { error_message?: string }).error_message ?? "";
      const hint =
        statusCode === "ERROR"
          ? " Video URL Instagram sunucularindan erisilemiyor olabilir - MinIO icin ngrok http 9000 + MINIO_PUBLIC_BASE_URL kullanin."
          : "";
      throw new Error(`Instagram isleme hatasi: ${statusCode}.${extra ? ` ${extra}` : ""}${hint}`);
    }
  }

  if (statusCode !== "FINISHED" && statusCode !== "PUBLISHED") {
    throw new Error(
      `Instagram video isleme zaman asimi. ${maxAttempts * 5} saniye sonra hala hazir degil. Tekrar deneyin.`
    );
  }

  // FINISHED sonrasi kisa bekleme - Instagram bazen hemen publish kabul etmiyor
  await new Promise((r) => setTimeout(r, 3000));

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
    error?: { message: string; code?: number };
  };
  if (publishData.error || !publishData.id) {
    const errMsg = publishData.error?.message ?? "Instagram yayinlama hatasi";
    const hint =
      errMsg.includes("Media ID") || errMsg.includes("not available")
        ? " Video isleme tamamlanmadan publish denendi. Biraz bekleyip tekrar deneyin."
        : "";
    throw new Error(`${errMsg}${hint}`);
  }

  return `https://www.instagram.com/reel/${publishData.id}`;
}
