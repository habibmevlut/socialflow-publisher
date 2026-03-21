const API_BASE = "https://open.tiktokapis.com";
const CHUNK_MIN_MB = 5;
const CHUNK_MAX_MB = 64;

export type TikTokUploadParams = {
  accessToken: string;
  openId: string;
  videoUrl: string;
  caption?: string | null;
  privacyLevel?: string;
};

export async function uploadVideoToTikTok(params: TikTokUploadParams): Promise<string> {
  const { accessToken, openId, videoUrl, caption, privacyLevel = "SELF_ONLY" } = params;

  // 0. Videoyu indir (FILE_UPLOAD icin - domain verification gerekmez)
  const videoRes = await fetch(videoUrl, { method: "GET" });
  if (!videoRes.ok) {
    throw new Error(`Video indirilemedi: ${videoRes.status} ${videoRes.statusText}`);
  }
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
  const videoSize = videoBuffer.length;
  const contentType = videoRes.headers.get("content-type") ?? "video/mp4";
  const mimeType = contentType.startsWith("video/") ? contentType : "video/mp4";

  // Chunk hesapla: < 5MB tek parca, >= 5MB bolumle (5-64 MB, son parcadan hariç)
  const chunkMinBytes = CHUNK_MIN_MB * 1024 * 1024;
  const chunkMaxBytes = CHUNK_MAX_MB * 1024 * 1024;
  const chunkSize = videoSize < chunkMinBytes ? videoSize : Math.min(chunkMaxBytes, 10 * 1024 * 1024);
  const totalChunkCount = Math.ceil(videoSize / chunkSize);

  // 1. Creator info - privacy options
  const creatorRes = await fetch(`${API_BASE}/v2/post/publish/creator_info/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({})
  });

  const creatorData = (await creatorRes.json()) as {
    data?: { privacy_level_options?: string[] };
    error?: { code?: string; message?: string };
  };

  const allowedPrivacy = creatorData.data?.privacy_level_options ?? [privacyLevel];
  const usePrivacy = allowedPrivacy.includes(privacyLevel) ? privacyLevel : allowedPrivacy[0] ?? "SELF_ONLY";

  // 2. Initialize post - FILE_UPLOAD (domain verification gerekmez)
  const initRes = await fetch(`${API_BASE}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({
      post_info: {
        title: (caption ?? "").slice(0, 2200),
        privacy_level: usePrivacy,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        brand_content_toggle: false,
        brand_organic_toggle: false
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount
      }
    })
  });

  const initData = (await initRes.json()) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };

  if (initData.error?.code && initData.error.code !== "ok") {
    const msg = initData.error.message ?? initData.error.code;
    throw new Error(`TikTok init hatasi: ${msg}`);
  }

  const publishId = initData.data?.publish_id;
  const uploadUrl = initData.data?.upload_url;

  if (!publishId || !uploadUrl) {
    throw new Error("TikTok publish_id veya upload_url alinamadi");
  }

  // 3. Videoyu chunk chunk TikTok'a yukle
  for (let i = 0; i < totalChunkCount; i++) {
    const firstByte = i * chunkSize;
    const lastByte = Math.min(firstByte + chunkSize - 1, videoSize - 1);
    const chunk = videoBuffer.subarray(firstByte, lastByte + 1);

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${firstByte}-${lastByte}/${videoSize}`
      },
      body: chunk
    });

    if (!uploadRes.ok && uploadRes.status !== 206) {
      const errText = await uploadRes.text();
      throw new Error(`TikTok video yukleme hatasi (chunk ${i + 1}/${totalChunkCount}): ${uploadRes.status} ${errText}`);
    }
  }

  // 4. Status poll - yayinlama tamamlanana kadar bekle
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusRes = await fetch(`${API_BASE}/v2/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({ publish_id: publishId })
    });

    const statusData = (await statusRes.json()) as {
      data?: { status?: string; fail_reason?: string };
      error?: { code?: string; message?: string };
    };

    const status = statusData.data?.status;
    if (status === "PUBLISH_COMPLETE") {
      return `https://www.tiktok.com/@${openId}`;
    }
    if (status === "FAILED" || statusData.data?.fail_reason) {
      throw new Error(`TikTok yayinlama hatasi: ${statusData.data?.fail_reason ?? status}`);
    }
  }

  throw new Error("TikTok video isleme zaman asimi. Biraz sonra TikTok uygulamasinda kontrol edin.");
}
